const { createClient } = require('@supabase/supabase-js');
const {
  createRequestCode,
  normalizePhone,
  numberOrNull,
  sha256
} = require('./lib/agroclimate-core');

function headers() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: headers(), body: JSON.stringify(body) };
}

function getClient() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function text(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function requestLanguage(body) {
  return String(body?.language || '').trim().toLowerCase() === 'en' ? 'en' : 'es';
}

function sanitizeLanguage(value) {
  return String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'es';
}

function sanitizeUnitSystem(value) {
  return String(value || '').trim().toLowerCase() === 'us_customary' ? 'us_customary' : 'metric';
}

function sanitizeLocale(value) {
  const raw = text(value, 32);
  if (!raw) return null;
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(raw)) return null;
  return raw;
}

function msg(lang, es, en) {
  return lang === 'en' ? en : es;
}

function validateRegistration(body) {
  const lang = requestLanguage(body);
  const required = [
    ['full_name', 120],
    ['email', 180],
    ['phone_country_code', 6],
    ['phone_national', 24],
    ['occupation', 40],
    ['country', 80],
    ['region', 100],
    ['postal_code', 20],
    ['crop', 100],
    ['area_range', 40],
    ['crop_stage', 100],
    ['primary_use', 100],
    ['decision_goal', 400]
  ];
  const clean = {};
  for (const [key, max] of required) {
    clean[key] = text(body[key], max);
    if (!clean[key]) {
      return {
        error: msg(lang, `El campo ${key} es obligatorio.`, `The field ${key} is required.`)
      };
    }
  }
  clean.email = clean.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
    return { error: msg(lang, 'El correo no es válido.', 'The email address is not valid.') };
  }
  clean.phone_e164 = normalizePhone(clean.phone_country_code, clean.phone_national);
  if (!clean.phone_e164) {
    return { error: msg(lang, 'El número de WhatsApp no es válido.', 'The WhatsApp number is not valid.') };
  }
  const occupations = ['Agrónomo', 'Técnico agrícola', 'Estudiante', 'Agricultor', 'Asesor', 'Otro'];
  if (!occupations.includes(clean.occupation)) {
    return { error: msg(lang, 'La ocupación no es válida.', 'The occupation is not valid.') };
  }
  clean.latitude = numberOrNull(body.latitude);
  clean.longitude = numberOrNull(body.longitude);
  clean.kc = body.kc === '' || body.kc == null ? null : numberOrNull(body.kc);
  clean.plot_name = text(body.plot_name, 80) || (lang === 'en' ? 'My plot' : 'Mi predio');
  if (clean.latitude == null || clean.latitude < -90 || clean.latitude > 90) {
    return { error: msg(lang, 'La latitud no es válida.', 'Latitude is not valid.') };
  }
  if (clean.longitude == null || clean.longitude < -180 || clean.longitude > 180) {
    return { error: msg(lang, 'La longitud no es válida.', 'Longitude is not valid.') };
  }
  if (clean.kc != null && (clean.kc < 0 || clean.kc > 2.5)) {
    return { error: msg(lang, 'El Kc debe estar entre 0 y 2.5.', 'Kc must be between 0 and 2.5.') };
  }
  if (!body.accept_terms || !body.email_consent) {
    return {
      error: msg(
        lang,
        'Debes aceptar términos y solicitar el envío por correo.',
        'You must accept the terms and request email delivery.'
      )
    };
  }
  clean.email_consent = true;
  clean.whatsapp_consent = !!body.whatsapp_consent;
  clean.language = sanitizeLanguage(body.language);
  clean.unit_system = sanitizeUnitSystem(body.unit_system);
  clean.locale = sanitizeLocale(body.locale);
  return { clean, lang };
}

async function register(supabase, body) {
  if (body.website) return json(200, { ok: true, request_code: '----' });
  const validation = validateRegistration(body);
  if (validation.error) return json(400, { ok: false, message: validation.error });
  const c = validation.clean;
  const lang = validation.lang || c.language || 'es';

  const duplicateByEmail = await supabase
    .from('climate_alert_subscribers')
    .select('request_code, status')
    .eq('email', c.email)
    .maybeSingle();
  const duplicateByPhone = duplicateByEmail.data ? null : await supabase
    .from('climate_alert_subscribers')
    .select('request_code, status')
    .eq('phone_e164', c.phone_e164)
    .maybeSingle();
  const duplicate = duplicateByEmail.data || duplicateByPhone?.data;
  if (duplicate) {
    return json(409, {
      ok: false,
      error: 'already_registered',
      message: msg(
        lang,
        `Ya existe una solicitud con este correo o WhatsApp. Folio: ${duplicate.request_code}.`,
        `A request already exists with this email or WhatsApp. Reference: ${duplicate.request_code}.`
      )
    });
  }

  let subscriber = null;
  let insertError = null;
  for (let attempt = 0; attempt < 8 && !subscriber; attempt += 1) {
    const requestCode = createRequestCode();
    const result = await supabase
      .from('climate_alert_subscribers')
      .insert({
        request_code: requestCode,
        full_name: c.full_name,
        email: c.email,
        phone_country_code: c.phone_country_code,
        phone_national: c.phone_national,
        phone_e164: c.phone_e164,
        occupation: c.occupation,
        country: c.country,
        region: c.region,
        postal_code: c.postal_code,
        crop: c.crop,
        area_range: c.area_range,
        crop_stage: c.crop_stage,
        primary_use: c.primary_use,
        decision_goal: c.decision_goal,
        email_consent: c.email_consent,
        whatsapp_consent: c.whatsapp_consent,
        terms_accepted: true,
        language: c.language,
        unit_system: c.unit_system,
        locale: c.locale
      })
      .select('*')
      .single();
    if (!result.error) subscriber = result.data;
    else {
      insertError = result.error;
      if (result.error.code !== '23505') break;
    }
  }
  if (!subscriber) {
    console.error('agroclimate register subscriber:', insertError);
    return json(502, {
      ok: false,
      message: msg(lang, 'No fue posible guardar la solicitud.', 'Could not save the request.')
    });
  }

  const plotResult = await supabase.from('climate_alert_plots').insert({
    subscriber_id: subscriber.id,
    plot_name: c.plot_name,
    latitude: c.latitude,
    longitude: c.longitude,
    kc: c.kc,
    kc_source: c.kc == null ? null : 'manual'
  });
  if (plotResult.error) {
    await supabase.from('climate_alert_subscribers').delete().eq('id', subscriber.id);
    console.error('agroclimate register plot:', plotResult.error);
    return json(502, {
      ok: false,
      message: msg(lang, 'No fue posible guardar la ubicación.', 'Could not save the plot location.')
    });
  }

  await supabase.from('climate_alert_events').insert({
    subscriber_id: subscriber.id,
    event_type: 'registration_created',
    actor_type: 'visitor',
    metadata: { source: 'pronosticoclimatico', language: c.language, unit_system: c.unit_system }
  });
  return json(201, { ok: true, request_code: subscriber.request_code, status: subscriber.status });
}

async function reportView(supabase, event) {
  const query = event.queryStringParameters || {};
  const rawToken = text(query.token, 180);
  if (rawToken.length < 32) return json(400, { ok: false, message: 'Enlace incompleto.' });
  const tokenHash = sha256(rawToken);
  const tokenResult = await supabase
    .from('climate_alert_access_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('token_kind', 'report')
    .is('revoked_at', null)
    .maybeSingle();
  if (tokenResult.error || !tokenResult.data) return json(404, { ok: false, message: 'El enlace no existe o fue desactivado.' });
  const access = tokenResult.data;
  if (access.expires_at && new Date(access.expires_at).getTime() < Date.now()) {
    return json(410, { ok: false, message: 'El enlace expiró.' });
  }

  const subscriberResult = await supabase
    .from('climate_alert_subscribers')
    .select('id, request_code, full_name, status, crop, crop_stage, language, unit_system, locale, first_report_access_at, last_report_access_at, report_access_count')
    .eq('id', access.subscriber_id)
    .maybeSingle();
  const subscriber = subscriberResult.data;
  if (!subscriber || ['rejected'].includes(subscriber.status)) return json(404, { ok: false, message: 'El reporte no está disponible.' });
  const plotResult = await supabase.from('climate_alert_plots').select('*').eq('subscriber_id', subscriber.id).maybeSingle();
  if (!plotResult.data) return json(404, { ok: false, message: 'No se encontró el predio.' });

  const requestedSnapshotId = text(query.snapshot, 80);
  const snapshotIdOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedSnapshotId);
  let snapshotResult;
  if (requestedSnapshotId && snapshotIdOk) {
    snapshotResult = await supabase
      .from('climate_alert_snapshots')
      .select('*')
      .eq('id', requestedSnapshotId)
      .eq('subscriber_id', subscriber.id)
      .maybeSingle();
    if (snapshotResult.error) throw snapshotResult.error;
    if (!snapshotResult.data) return json(404, { ok: false, message: 'Ese reporte semanal no existe.' });
    if (snapshotResult.data.expires_at && new Date(snapshotResult.data.expires_at).getTime() < Date.now()) {
      return json(410, { ok: false, message: 'Ese reporte ya caducó (~90 días).' });
    }
  } else {
    snapshotResult = await supabase
      .from('climate_alert_snapshots')
      .select('*')
      .eq('subscriber_id', subscriber.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  const snapshot = snapshotResult.data;
  const now = new Date().toISOString();
  const trackAsUserVisit = !requestedSnapshotId || !snapshotIdOk;
  const tasks = [
    supabase.from('climate_alert_access_tokens').update({ last_used_at: now }).eq('id', access.id),
    supabase.from('climate_alert_access_events').insert({
      subscriber_id: subscriber.id,
      snapshot_id: snapshot?.id || null,
      user_agent: text(event.headers?.['user-agent'], 500),
      referrer: text(event.headers?.referer || event.headers?.referrer, 500)
    })
  ];
  if (trackAsUserVisit) {
    tasks.push(
      supabase
        .from('climate_alert_subscribers')
        .update({
          first_report_access_at: subscriber.first_report_access_at || now,
          last_report_access_at: now,
          report_access_count: Number(subscriber.report_access_count || 0) + 1
        })
        .eq('id', subscriber.id)
    );
  }
  await Promise.all(tasks);

  const language = sanitizeLanguage(subscriber.language);
  const unitSystem = sanitizeUnitSystem(subscriber.unit_system);
  const locale = subscriber.locale || (language === 'en' ? 'en-US' : 'es-MX');

  return json(200, {
    ok: true,
    subscriber: {
      request_code: subscriber.request_code,
      full_name: subscriber.full_name,
      status: subscriber.status,
      crop: subscriber.crop,
      crop_stage: subscriber.crop_stage,
      language,
      unit_system: unitSystem,
      locale,
      plot_name: plotResult.data.plot_name,
      latitude: plotResult.data.latitude,
      longitude: plotResult.data.longitude,
      timezone: plotResult.data.timezone,
      kc: plotResult.data.kc
    },
    rows: snapshot?.rows || [],
    summary: snapshot?.summary || {},
    generated_at: snapshot?.generated_at || null,
    snapshot_id: snapshot?.id || null,
    alert_type: snapshot?.alert_type || null,
    historical_view: Boolean(requestedSnapshotId && snapshotIdOk)
  });
}

async function unsubscribe(supabase, body) {
  const rawToken = text(body.token, 180);
  if (rawToken.length < 32) return json(400, { ok: false, message: 'Enlace incompleto.' });
  const tokenResult = await supabase
    .from('climate_alert_access_tokens')
    .select('subscriber_id')
    .eq('token_hash', sha256(rawToken))
    .eq('token_kind', 'report')
    .is('revoked_at', null)
    .maybeSingle();
  if (!tokenResult.data) return json(404, { ok: false, message: 'El enlace no es válido.' });
  const now = new Date().toISOString();
  await supabase
    .from('climate_alert_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: now })
    .eq('id', tokenResult.data.subscriber_id);
  await supabase.from('climate_alert_events').insert({
    subscriber_id: tokenResult.data.subscriber_id,
    event_type: 'unsubscribed_by_user',
    actor_type: 'subscriber'
  });
  return json(200, { ok: true });
}

async function updatePlot(supabase, body) {
  const rawToken = text(body.token, 180);
  if (rawToken.length < 32) return json(400, { ok: false, message: 'Enlace incompleto.' });
  const tokenResult = await supabase
    .from('climate_alert_access_tokens')
    .select('subscriber_id')
    .eq('token_hash', sha256(rawToken))
    .eq('token_kind', 'report')
    .is('revoked_at', null)
    .maybeSingle();
  if (!tokenResult.data) return json(404, { ok: false, message: 'El enlace no es válido.' });
  const latitude = numberOrNull(body.latitude);
  const longitude = numberOrNull(body.longitude);
  const kc = body.kc === '' || body.kc == null ? null : numberOrNull(body.kc);
  if (latitude == null || latitude < -90 || latitude > 90) return json(400, { ok: false, message: 'Latitud inválida.' });
  if (longitude == null || longitude < -180 || longitude > 180) return json(400, { ok: false, message: 'Longitud inválida.' });
  if (kc != null && (kc < 0 || kc > 2.5)) return json(400, { ok: false, message: 'Kc inválido.' });
  const patch = {
    plot_name: text(body.plot_name, 80) || 'Mi predio',
    latitude,
    longitude,
    kc,
    kc_source: kc == null ? null : 'manual',
    timezone: null
  };
  const result = await supabase
    .from('climate_alert_plots')
    .update(patch)
    .eq('subscriber_id', tokenResult.data.subscriber_id)
    .select('*')
    .single();
  if (result.error) return json(502, { ok: false, message: result.error.message });
  await supabase.from('climate_alert_events').insert({
    subscriber_id: tokenResult.data.subscriber_id,
    event_type: 'plot_updated_by_subscriber',
    actor_type: 'subscriber',
    metadata: { latitude, longitude, kc }
  });
  return json(200, { ok: true, plot: result.data });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(), body: '' };
  const supabase = getClient();
  if (!supabase) return json(503, { ok: false, message: 'Servicio temporalmente no configurado.' });

  if (event.httpMethod === 'GET') {
    const action = text(event.queryStringParameters?.action, 40);
    if (action === 'report') return reportView(supabase, event);
    return json(404, { ok: false, message: 'Acción no encontrada.' });
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Método no permitido.' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json(400, { ok: false, message: 'JSON inválido.' });
  }
  const action = text(body.action, 40);
  if (action === 'register') return register(supabase, body);
  if (action === 'unsubscribe') return unsubscribe(supabase, body);
  if (action === 'update_plot') return updatePlot(supabase, body);
  return json(404, { ok: false, message: 'Acción no encontrada.' });
};
