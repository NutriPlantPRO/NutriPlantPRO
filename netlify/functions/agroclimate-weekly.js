const { createClient } = require('@supabase/supabase-js');
const {
  createReportTokenForSubscriber,
  fetchOpenMeteo,
  rowsFromOpenMeteo,
  sha256,
  summarize
} = require('./lib/agroclimate-core');
const { sendAgroclimateEmail } = require('./lib/agroclimate-mail');

exports.config = { schedule: '0 * * * *' };

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    weekday: get('weekday'),
    hour: Number(get('hour')),
    date: `${get('year')}-${get('month')}-${get('day')}`
  };
}

async function processSubscriber(supabase, subscriber, plot, siteUrl) {
  const meteo = await fetchOpenMeteo(plot.latitude, plot.longitude);
  const climate = rowsFromOpenMeteo(meteo, plot.kc, 'weekly');
  const scheduleKey = `weekly:${climate.forecastStart}`;
  const existing = await supabase
    .from('climate_alert_snapshots')
    .select('*, climate_alert_deliveries(id,status)')
    .eq('plot_id', plot.id)
    .eq('schedule_key', scheduleKey)
    .maybeSingle();
  const alreadySent = (existing.data?.climate_alert_deliveries || []).some((delivery) => delivery.status === 'accepted');
  if (alreadySent) return { id: subscriber.id, skipped: 'already_sent' };

  let snapshot = existing.data;
  if (!snapshot) {
    const result = await supabase.from('climate_alert_snapshots').insert({
      subscriber_id: subscriber.id,
      plot_id: plot.id,
      alert_type: 'weekly',
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
      summary: summarize(climate.rows)
    }).select('*').single();
    if (result.error) throw result.error;
    snapshot = result.data;
  }

  const rawToken = createReportTokenForSubscriber(subscriber.id);
  const tokenResult = await supabase.from('climate_alert_access_tokens').upsert({
    subscriber_id: subscriber.id,
    token_hash: sha256(rawToken),
    token_kind: 'report',
    revoked_at: null
  }, { onConflict: 'token_hash' });
  if (tokenResult.error) throw tokenResult.error;

  const deliveryResult = await supabase.from('climate_alert_deliveries').insert({
    subscriber_id: subscriber.id,
    snapshot_id: snapshot.id,
    channel: 'email',
    destination: subscriber.email,
    status: 'pending',
    attempt_count: 1
  }).select('*').single();
  if (deliveryResult.error) throw deliveryResult.error;
  const reportUrl = `${siteUrl}/pronosticoclimatico/?token=${encodeURIComponent(rawToken)}`;
  try {
    const sent = await sendAgroclimateEmail({ subscriber, plot, snapshot, reportUrl });
    await supabase.from('climate_alert_deliveries').update({
      status: sent.rejected.length ? 'rejected' : 'accepted',
      provider_message_id: sent.messageId,
      subject: sent.subject,
      sent_at: new Date().toISOString()
    }).eq('id', deliveryResult.data.id);
    return { id: subscriber.id, sent: true };
  } catch (error) {
    await supabase.from('climate_alert_deliveries').update({
      status: 'temporary_error',
      last_error: String(error.message || error).slice(0, 1000)
    }).eq('id', deliveryResult.data.id);
    return { id: subscriber.id, sent: false, error: error.message };
  }
}

exports.handler = async function handler(event, context) {
  const scheduled = !!context?.next_run || event.headers?.['x-netlify-event'] === 'schedule';
  const manualSecret = String(event.queryStringParameters?.secret || '');
  const expectedSecret = String(process.env.AGROCLIMATE_CRON_SECRET || '');
  if (!scheduled && (!expectedSecret || manualSecret !== expectedSecret)) {
    return { statusCode: 403, body: JSON.stringify({ ok: false, message: 'Acceso no autorizado.' }) };
  }
  const url = String(process.env.SUPABASE_URL || '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!url || !key) return { statusCode: 503, body: JSON.stringify({ ok: false, message: 'Supabase no configurado.' }) };
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const result = await supabase
    .from('climate_alert_subscribers')
    .select('*, climate_alert_plots(*)')
    .eq('status', 'active')
    .eq('email_consent', true);
  if (result.error) return { statusCode: 502, body: JSON.stringify({ ok: false, message: result.error.message }) };

  const now = new Date();
  const due = (result.data || []).map((subscriber) => {
    const plot = Array.isArray(subscriber.climate_alert_plots) ? subscriber.climate_alert_plots[0] : subscriber.climate_alert_plots;
    if (!plot?.active || !plot.timezone) return null;
    try {
      const local = localParts(now, plot.timezone);
      return local.weekday === 'Sun' && local.hour === 17 ? { subscriber, plot } : null;
    } catch (_) {
      return null;
    }
  }).filter(Boolean);

  const siteUrl = String(process.env.URL || 'https://nutriplantpro.com').replace(/\/$/, '');
  const outcomes = [];
  for (let i = 0; i < due.length; i += 3) {
    const batch = due.slice(i, i + 3);
    const settled = await Promise.allSettled(batch.map((item) => processSubscriber(supabase, item.subscriber, item.plot, siteUrl)));
    settled.forEach((entry) => outcomes.push(entry.status === 'fulfilled' ? entry.value : { sent: false, error: entry.reason?.message || 'unknown' }));
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      checked: (result.data || []).length,
      due: due.length,
      sent: outcomes.filter((x) => x.sent).length,
      outcomes
    })
  };
};
