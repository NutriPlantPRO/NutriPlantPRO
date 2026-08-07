/**
 * AirCI Professional — puente Netlify Background → worker Cloud Run.
 *
 * Mantiene viva la invocación mientras Cloud Run procesa el GeoTIFF. El worker
 * actualiza progreso/resultados directamente en Supabase con service role.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

// URL pública de Cloud Run. El worker vuelve a validar el JWT del usuario y
// comprueba que el job le pertenece; no añade variables Lambda.
const WORKER_URL = 'https://airci-canopy-worker-272020949652.us-central1.run.app';

function getSupabase() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function failJob(supabase, jobId, message) {
  if (!supabase || !jobId) return;
  await supabase
    .from('airci_detect_jobs')
    .update({
      status: 'error',
      phase: 'Error',
      error_message: String(message || 'Error desconocido').slice(0, 4000),
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .in('status', ['queued', 'processing']);
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Método no permitido' };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return { statusCode: 400, body: 'JSON inválido' };
  }
  const jobId = String(body.job_id || '').trim();
  if (!jobId) return { statusCode: 400, body: 'job_id requerido' };

  const supabase = getSupabase();
  if (!supabase) return { statusCode: 500, body: 'Supabase no configurado' };

  const authorization =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return { statusCode: 401, body: 'Falta token' };
  }
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  const userId = userData && userData.user && userData.user.id;
  if (userError || !userId) {
    return { statusCode: 401, body: 'Token inválido' };
  }
  const { data: job, error: jobError } = await supabase
    .from('airci_detect_jobs')
    .select('id, owner_id, status')
    .eq('id', jobId)
    .eq('owner_id', userId)
    .maybeSingle();
  if (jobError || !job) return { statusCode: 404, body: 'Trabajo no encontrado' };
  if (job.status === 'done') return { statusCode: 202, body: '' };

  try {
    const response = await fetch(WORKER_URL + '/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ job_id: jobId })
    });
    const text = await response.text();
    if (!response.ok) {
      await failJob(
        supabase,
        jobId,
        'Worker HTTP ' + response.status + ': ' + String(text || '').slice(0, 1000)
      );
      console.error('AirCI worker:', jobId, response.status, text);
    } else {
      console.log('AirCI worker finalizó:', jobId, String(text || '').slice(0, 500));
    }
  } catch (error) {
    await failJob(supabase, jobId, error.message || String(error));
    console.error('AirCI background:', jobId, error);
  }

  return { statusCode: 202, body: '' };
};
