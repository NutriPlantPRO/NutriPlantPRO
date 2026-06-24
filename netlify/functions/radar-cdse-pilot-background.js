/**
 * Pilot Radar — worker en segundo plano (Netlify Background Function).
 * Procesa request_id encolado por radar-cdse-pilot.js; responde 202 al cliente de inmediato.
 */
const {
  processPilotJob
} = require('./lib/radar-pilot-job');

async function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  const enabled = String(process.env.RADAR_CDSE_PILOT_ENABLED || '').toLowerCase();
  if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') {
    console.warn('pilot background: desactivado');
    return { statusCode: 404, body: 'Pilot desactivado' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'JSON inválido' };
  }

  const requestId = body.request_id != null ? String(body.request_id).trim() : '';
  if (!requestId) {
    return { statusCode: 400, body: 'request_id requerido' };
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    return { statusCode: 500, body: 'Supabase no configurado' };
  }

  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return { statusCode: 401, body: 'Falta token' };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { statusCode: 401, body: 'Token inválido' };
  }

  try {
    const result = await processPilotJob(supabase, requestId, userData.user.id);
    console.log('pilot background ok:', requestId, result.already_done ? 'already_done' : 'done');
  } catch (e) {
    console.error('radar-cdse-pilot-background:', requestId, e);
  }

  return { statusCode: 202, body: '' };
};
