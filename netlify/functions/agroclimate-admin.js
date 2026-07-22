const { createClient } = require('@supabase/supabase-js');
const {
  createRequestCode,
  createReportTokenForSubscriber,
  fetchOpenMeteo,
  normalizePhone,
  numberOrNull,
  rowsFromOpenMeteo,
  sha256,
  summarize
} = require('./lib/agroclimate-core');
const { sendAgroclimateEmail } = require('./lib/agroclimate-mail');

const SUBSCRIBER_FIELDS = new Set([
  'full_name', 'email', 'phone_country_code', 'phone_national', 'phone_e164',
  'occupation', 'country', 'region', 'postal_code', 'crop', 'area_range',
  'crop_stage', 'primary_use', 'decision_goal', 'admin_notes',
  'email_consent', 'whatsapp_consent'
]);
const PLOT_FIELDS = new Set(['plot_name', 'latitude', 'longitude', 'timezone', 'kc', 'kc_source', 'active']);
const STATUS_VALUES = new Set(['pending_whatsapp', 'pending_review', 'active', 'paused', 'rejected', 'unsubscribed']);

function headers() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: headers(), body: JSON.stringify(body) };
}

function text(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function client() {
  const url = text(process.env.SUPABASE_URL);
  const key = text(process.env.SUPABASE_SERVICE_ROLE_KEY, 1000);
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function authorize(supabase, event, body) {
  const expected = text(process.env.NUTRIPLANT_ADMIN_KEY || 'np_admin_key_8f4a2b9c1e7d');
  if (text(body.admin_key) && text(body.admin_key) === expected) return { ok: true, adminId: null };
  const auth = text(event.headers?.authorization, 3000);
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false };
  const userResult = await supabase.auth.getUser(token);
  const userId = userResult.data?.user?.id;
  if (!userId) return { ok: false };
  const profile = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  return profile.data?.is_admin ? { ok: true, adminId: userId } : { ok: false };
}

function origin(event) {
  const configured = text(process.env.URL || process.env.DEPLOY_PRIME_URL, 500).replace(/\/$/, '');
  if (configured) return configured;
  const host = text(event.headers?.host, 300);
  return host ? `https://${host}` : 'https://nutriplantpro.com';
}

async function readSubscriber(supabase, id) {
  const result = await supabase
    .from('climate_alert_subscribers')
    .select('*, climate_alert_plots(*)')
    .eq('id', id)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('subscriber_not_found');
  const plot = Array.isArray(result.data.climate_alert_plots)
    ? result.data.climate_alert_plots[0]
    : result.data.climate_alert_plots;
  return { subscriber: result.data, plot };
}

async function list(supabase, body) {
  let query = supabase
    .from('climate_alert_subscribers')
    .select('*, climate_alert_plots(*)')
    .order('created_at', { ascending: false })
    .limit(Math.min(500, Math.max(1, Number(body.limit) || 250)));
  if (body.status && STATUS_VALUES.has(body.status)) query = query.eq('status', body.status);
  const result = await query;
  if (result.error) return json(502, { ok: false, message: result.error.message });
  const all = result.data || [];
  const metrics = {
    total: all.length,
    pending: all.filter((x) => ['pending_whatsapp', 'pending_review'].includes(x.status)).length,
    active: all.filter((x) => x.status === 'active').length,
    paused: all.filter((x) => x.status === 'paused').length,
    accessed: all.filter((x) => Number(x.report_access_count || 0) > 0).length,
    neverAccessed: all.filter((x) => x.status === 'active' && !x.last_report_access_at).length
  };
  return json(200, { ok: true, subscribers: all, metrics });
}

async function create(supabase, body, adminId) {
  const s = body.subscriber || {};
  const p = body.plot || {};
  const required = [
    'full_name', 'email', 'phone_country_code', 'phone_national', 'occupation',
    'country', 'region', 'postal_code', 'crop', 'area_range', 'crop_stage',
    'primary_use', 'decision_goal'
  ];
  for (const key of required) {
    if (!text(s[key], 400)) return json(400, { ok: false, message: `Falta ${key}.` });
  }
  const email = text(s.email, 180).toLowerCase();
  const phoneE164 = normalizePhone(s.phone_country_code, s.phone_national) || text(s.phone_e164, 30);
  if (!phoneE164) return json(400, { ok: false, message: 'WhatsApp inválido.' });
  const latitude = numberOrNull(p.latitude);
  const longitude = numberOrNull(p.longitude);
  if (latitude == null || latitude < -90 || latitude > 90) return json(400, { ok: false, message: 'Latitud inválida.' });
  if (longitude == null || longitude < -180 || longitude > 180) return json(400, { ok: false, message: 'Longitud inválida.' });
  const kc = p.kc === '' || p.kc == null ? null : numberOrNull(p.kc);
  if (kc != null && (kc < 0 || kc > 2.5)) return json(400, { ok: false, message: 'Kc inválido.' });

  const dupEmail = await supabase.from('climate_alert_subscribers').select('request_code').eq('email', email).maybeSingle();
  if (dupEmail.data) return json(409, { ok: false, message: `Ya existe ese correo. Folio ${dupEmail.data.request_code}.` });
  const dupPhone = await supabase.from('climate_alert_subscribers').select('request_code').eq('phone_e164', phoneE164).maybeSingle();
  if (dupPhone.data) return json(409, { ok: false, message: `Ya existe ese WhatsApp. Folio ${dupPhone.data.request_code}.` });

  let status = text(s.status || body.status || 'pending_review', 40);
  if (!STATUS_VALUES.has(status)) status = 'pending_review';
  const now = new Date().toISOString();

  let subscriber = null;
  let insertError = null;
  for (let attempt = 0; attempt < 8 && !subscriber; attempt += 1) {
    const requestCode = createRequestCode();
    const payload = {
      request_code: requestCode,
      full_name: text(s.full_name, 120),
      email,
      phone_country_code: text(s.phone_country_code, 6),
      phone_national: text(s.phone_national, 24).replace(/\D/g, ''),
      phone_e164: phoneE164,
      occupation: text(s.occupation, 40),
      country: text(s.country, 80),
      region: text(s.region, 100),
      postal_code: text(s.postal_code, 20),
      crop: text(s.crop, 100),
      area_range: text(s.area_range, 40),
      crop_stage: text(s.crop_stage, 100),
      primary_use: text(s.primary_use, 100),
      decision_goal: text(s.decision_goal, 400),
      admin_notes: text(s.admin_notes, 1000) || null,
      status,
      email_consent: s.email_consent !== false,
      whatsapp_consent: s.whatsapp_consent !== false,
      terms_accepted: true,
      consent_source: 'admin_manual',
      whatsapp_confirmed_at: ['pending_review', 'active', 'paused'].includes(status) ? now : null,
      approved_at: status === 'active' ? now : null,
      approved_by: status === 'active' ? adminId : null
    };
    const result = await supabase.from('climate_alert_subscribers').insert(payload).select('*').single();
    if (!result.error) subscriber = result.data;
    else {
      insertError = result.error;
      if (result.error.code !== '23505') break;
    }
  }
  if (!subscriber) {
    console.error('agroclimate admin create:', insertError);
    return json(502, { ok: false, message: insertError?.message || 'No se pudo crear el usuario.' });
  }

  const plotResult = await supabase.from('climate_alert_plots').insert({
    subscriber_id: subscriber.id,
    plot_name: text(p.plot_name, 80) || 'Mi predio',
    latitude,
    longitude,
    timezone: text(p.timezone, 80) || null,
    kc,
    kc_source: kc == null ? null : 'manual',
    active: true
  }).select('*').single();
  if (plotResult.error) {
    await supabase.from('climate_alert_subscribers').delete().eq('id', subscriber.id);
    return json(502, { ok: false, message: plotResult.error.message });
  }

  await Promise.all([
    supabase.from('climate_alert_events').insert({
      subscriber_id: subscriber.id,
      event_type: 'admin_manual_create',
      actor_type: 'admin',
      actor_id: adminId,
      metadata: { status }
    }),
    supabase.from('climate_alert_admin_audit').insert({
      subscriber_id: subscriber.id,
      admin_user_id: adminId,
      action: 'create_registration',
      before_data: null,
      after_data: { subscriber, plot: plotResult.data }
    })
  ]);

  return json(201, { ok: true, subscriber, plot: plotResult.data });
}

async function update(supabase, body, adminId) {
  const id = text(body.subscriber_id, 80);
  const before = await readSubscriber(supabase, id);
  const subscriberPatch = {};
  const plotPatch = {};
  Object.entries(body.subscriber || {}).forEach(([key, value]) => {
    if (SUBSCRIBER_FIELDS.has(key)) subscriberPatch[key] = value;
  });
  Object.entries(body.plot || {}).forEach(([key, value]) => {
    if (PLOT_FIELDS.has(key)) plotPatch[key] = value;
  });
  if ('latitude' in plotPatch && (numberOrNull(plotPatch.latitude) == null || Number(plotPatch.latitude) < -90 || Number(plotPatch.latitude) > 90)) {
    return json(400, { ok: false, message: 'Latitud inválida.' });
  }
  if ('longitude' in plotPatch && (numberOrNull(plotPatch.longitude) == null || Number(plotPatch.longitude) < -180 || Number(plotPatch.longitude) > 180)) {
    return json(400, { ok: false, message: 'Longitud inválida.' });
  }
  if ('kc' in plotPatch && plotPatch.kc !== null && (numberOrNull(plotPatch.kc) == null || Number(plotPatch.kc) < 0 || Number(plotPatch.kc) > 2.5)) {
    return json(400, { ok: false, message: 'Kc inválido.' });
  }
  if (Object.keys(subscriberPatch).length) {
    const result = await supabase.from('climate_alert_subscribers').update(subscriberPatch).eq('id', id);
    if (result.error) return json(502, { ok: false, message: result.error.message });
  }
  if (Object.keys(plotPatch).length) {
    const result = await supabase.from('climate_alert_plots').update(plotPatch).eq('subscriber_id', id);
    if (result.error) return json(502, { ok: false, message: result.error.message });
  }
  const after = await readSubscriber(supabase, id);
  await supabase.from('climate_alert_admin_audit').insert({
    subscriber_id: id,
    admin_user_id: adminId,
    action: 'update_registration',
    before_data: { subscriber: before.subscriber, plot: before.plot },
    after_data: { subscriber: after.subscriber, plot: after.plot }
  });
  return json(200, { ok: true, ...after });
}

async function setStatus(supabase, body, adminId) {
  const id = text(body.subscriber_id, 80);
  const next = text(body.status, 40);
  if (!STATUS_VALUES.has(next)) return json(400, { ok: false, message: 'Estado inválido.' });
  const before = await readSubscriber(supabase, id);
  const now = new Date().toISOString();
  const patch = { status: next };
  if (next === 'pending_review') patch.whatsapp_confirmed_at = now;
  if (next === 'paused') patch.paused_at = now;
  if (next === 'rejected') patch.rejected_at = now;
  if (next === 'unsubscribed') patch.unsubscribed_at = now;
  const result = await supabase.from('climate_alert_subscribers').update(patch).eq('id', id).select('*').single();
  if (result.error) return json(502, { ok: false, message: result.error.message });
  await Promise.all([
    supabase.from('climate_alert_events').insert({
      subscriber_id: id, event_type: `status_${next}`, actor_type: 'admin', actor_id: adminId
    }),
    supabase.from('climate_alert_admin_audit').insert({
      subscriber_id: id, admin_user_id: adminId, action: `status_${next}`,
      before_data: { status: before.subscriber.status }, after_data: { status: next }
    })
  ]);
  return json(200, { ok: true, subscriber: result.data });
}

async function createSnapshot(supabase, subscriber, plot, type) {
  const meteo = await fetchOpenMeteo(plot.latitude, plot.longitude);
  const probe = rowsFromOpenMeteo(meteo, plot.kc, 'activation_partial');
  const isSunday = new Date(`${probe.today}T12:00:00Z`).getUTCDay() === 0;
  const mode = type === 'weekly' || isSunday ? 'weekly' : 'activation_partial';
  const climate = rowsFromOpenMeteo(meteo, plot.kc, mode);
  const summary = summarize(climate.rows);
  const scheduleKey = `${mode}:${climate.forecastStart}`;
  const payload = {
    subscriber_id: subscriber.id,
    plot_id: plot.id,
    alert_type: mode,
    schedule_key: scheduleKey,
    historical_start: climate.historicalStart,
    historical_end: climate.historicalEnd,
    forecast_start: climate.forecastStart,
    forecast_end: climate.forecastEnd,
    latitude: plot.latitude,
    longitude: plot.longitude,
    timezone: climate.timezone,
    kc: plot.kc,
    rows: climate.rows,
    summary
  };
  const saved = await supabase
    .from('climate_alert_snapshots')
    .upsert(payload, { onConflict: 'plot_id,schedule_key' })
    .select('*')
    .single();
  if (saved.error) throw saved.error;
  if (climate.timezone && climate.timezone !== plot.timezone) {
    await supabase.from('climate_alert_plots').update({ timezone: climate.timezone }).eq('id', plot.id);
    plot.timezone = climate.timezone;
  }
  return saved.data;
}

async function ensureReportToken(supabase, subscriberId) {
  const raw = createReportTokenForSubscriber(subscriberId);
  const tokenHash = sha256(raw);
  const saved = await supabase.from('climate_alert_access_tokens').upsert(
    { subscriber_id: subscriberId, token_hash: tokenHash, token_kind: 'report', revoked_at: null },
    { onConflict: 'token_hash' }
  );
  if (saved.error) throw saved.error;
  return raw;
}

async function deliver(supabase, event, subscriber, plot, snapshot, rawToken) {
  const reportUrl = `${origin(event)}/pronosticoclimatico/?token=${encodeURIComponent(rawToken)}`;
  const delivery = await supabase.from('climate_alert_deliveries').insert({
    subscriber_id: subscriber.id,
    snapshot_id: snapshot.id,
    channel: 'email',
    destination: subscriber.email,
    status: 'pending',
    attempt_count: 1
  }).select('*').single();
  if (delivery.error) throw delivery.error;
  try {
    const sent = await sendAgroclimateEmail({ subscriber, plot, snapshot, reportUrl });
    await supabase.from('climate_alert_deliveries').update({
      status: sent.rejected.length ? 'rejected' : 'accepted',
      provider_message_id: sent.messageId,
      subject: sent.subject,
      sent_at: new Date().toISOString()
    }).eq('id', delivery.data.id);
    return { ok: true, reportUrl, messageId: sent.messageId };
  } catch (error) {
    await supabase.from('climate_alert_deliveries').update({
      status: 'temporary_error', last_error: text(error.message, 1000)
    }).eq('id', delivery.data.id);
    return { ok: false, reportUrl, error: error.message };
  }
}

async function approve(supabase, event, body, adminId) {
  const id = text(body.subscriber_id, 80);
  const { subscriber, plot } = await readSubscriber(supabase, id);
  if (!plot) return json(400, { ok: false, message: 'La solicitud no tiene predio.' });
  const now = new Date().toISOString();
  const activation = await supabase.from('climate_alert_subscribers').update({
    status: 'active', approved_at: now, approved_by: adminId
  }).eq('id', id).select('*').single();
  if (activation.error) return json(502, { ok: false, message: activation.error.message });
  try {
    const rawToken = await ensureReportToken(supabase, id);
    const snapshot = await createSnapshot(supabase, activation.data, plot, 'activation_partial');
    const delivery = await deliver(supabase, event, activation.data, plot, snapshot, rawToken);
    await supabase.from('climate_alert_events').insert({
      subscriber_id: id, event_type: 'approved_and_initial_alert_generated', actor_type: 'admin',
      actor_id: adminId, metadata: { email_ok: delivery.ok }
    });
    return json(200, { ok: true, subscriber: activation.data, snapshot, delivery });
  } catch (error) {
    console.error('agroclimate approve:', error);
    return json(502, { ok: false, activated: true, message: `Se activó, pero falló el primer reporte: ${error.message}` });
  }
}

async function sendNow(supabase, event, body) {
  const { subscriber, plot } = await readSubscriber(supabase, text(body.subscriber_id, 80));
  if (!plot) return json(400, { ok: false, message: 'No hay predio.' });
  const rawToken = await ensureReportToken(supabase, subscriber.id);
  const snapshot = await createSnapshot(supabase, subscriber, plot, body.weekly ? 'weekly' : 'activation_partial');
  const delivery = await deliver(supabase, event, subscriber, plot, snapshot, rawToken);
  return json(delivery.ok ? 200 : 502, { ok: delivery.ok, snapshot, delivery });
}

async function removeSubscriber(supabase, body, adminId) {
  const id = text(body.subscriber_id, 80);
  const before = await readSubscriber(supabase, id);
  await supabase.from('climate_alert_admin_audit').insert({
    subscriber_id: id,
    admin_user_id: adminId,
    action: 'delete_registration',
    before_data: { subscriber: before.subscriber, plot: before.plot },
    after_data: null
  });
  const result = await supabase.from('climate_alert_subscribers').delete().eq('id', id);
  if (result.error) return json(502, { ok: false, message: result.error.message });
  return json(200, { ok: true, deleted_id: id, request_code: before.subscriber.request_code });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(), body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Método no permitido.' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { ok: false, message: 'JSON inválido.' }); }
  const supabase = client();
  if (!supabase) return json(503, { ok: false, message: 'Supabase no está configurado.' });
  const auth = await authorize(supabase, event, body);
  if (!auth.ok) return json(403, { ok: false, message: 'Acceso no autorizado.' });
  try {
    const action = text(body.action, 40);
    if (action === 'list') return list(supabase, body);
    if (action === 'get') {
      const data = await readSubscriber(supabase, text(body.subscriber_id, 80));
      return json(200, { ok: true, ...data });
    }
    if (action === 'update') return update(supabase, body, auth.adminId);
    if (action === 'create') return create(supabase, body, auth.adminId);
    if (action === 'delete') return removeSubscriber(supabase, body, auth.adminId);
    if (action === 'status') return setStatus(supabase, body, auth.adminId);
    if (action === 'approve') return approve(supabase, event, body, auth.adminId);
    if (action === 'send_now') return sendNow(supabase, event, body);
    return json(404, { ok: false, message: 'Acción no encontrada.' });
  } catch (error) {
    console.error('agroclimate-admin:', error);
    return json(error.message === 'subscriber_not_found' ? 404 : 502, { ok: false, message: error.message });
  }
};
