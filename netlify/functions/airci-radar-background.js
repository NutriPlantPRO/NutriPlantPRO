/**
 * AirCI Radar — worker background (Netlify Background Function, timeout largo).
 * Procesa request_id encolado por airci-radar.js.
 */
'use strict';

const {
  normalizePolygon,
  buildLocationSnapshot,
  renderPilotCompositeWithTiers,
  PILOT_SINGLE_SCENE_CANDIDATES
} = require('./lib/radar-pilot-job');

const BUCKET = 'radar-ndvi';

async function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

async function patchMeta(supabase, jobId, patch) {
  const { data: row } = await supabase
    .from('radar_requests')
    .select('meta')
    .eq('id', jobId)
    .maybeSingle();
  const meta = { ...(row && row.meta && typeof row.meta === 'object' ? row.meta : {}), ...patch };
  await supabase.from('radar_requests').update({ meta }).eq('id', jobId);
  return meta;
}

async function processAirciJob(supabase, requestId, userId) {
  const { data: job, error } = await supabase
    .from('radar_requests')
    .select('id, user_id, month_key, image_storage_path, meta')
    .eq('id', requestId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !job) throw new Error('Trabajo AirCI Radar no encontrado');
  const meta0 = job.meta && typeof job.meta === 'object' ? job.meta : {};
  if (!meta0.airci) throw new Error('No es un job AirCI');
  if (job.image_storage_path && meta0.status === 'done') {
    return { ok: true, already_done: true };
  }

  await patchMeta(supabase, requestId, {
    status: 'processing',
    status_message: 'Descargando/pasando Sentinel y generando NDVI/NDMI/NDRE/RGB…'
  });

  const polygon = normalizePolygon(meta0.polygon);
  if (!polygon) throw new Error('Polígono inválido en el job');
  const maxDim = Math.min(Math.max(Number(meta0.max_dim) || 768, 256), 1536);
  const maxScenes = Math.min(
    Math.max(Number(meta0.max_scenes) || PILOT_SINGLE_SCENE_CANDIDATES, 1),
    PILOT_SINGLE_SCENE_CANDIDATES
  );

  const pilotOut = await renderPilotCompositeWithTiers(polygon, maxScenes, maxDim);
  const bundle = pilotOut.bundle;
  const rendered = pilotOut.rendered;
  const snap = buildLocationSnapshot(null, polygon) || meta0.location_snapshot || null;
  const mk = job.month_key || new Date().toISOString().slice(0, 7);
  const base = `airci/${userId}/${requestId}`;
  const paths = {
    ndvi: `${base}_ndvi.png`,
    ndmi: `${base}_ndmi.png`,
    ndre: `${base}_ndre.png`,
    rgb: `${base}_rgb.png`
  };

  const uploads = await Promise.all([
    supabase.storage
      .from(BUCKET)
      .upload(paths.ndvi, rendered.ndviPng, { contentType: 'image/png', upsert: true }),
    supabase.storage
      .from(BUCKET)
      .upload(paths.ndmi, rendered.ndmiPng, { contentType: 'image/png', upsert: true }),
    supabase.storage
      .from(BUCKET)
      .upload(paths.ndre, rendered.ndrePng, { contentType: 'image/png', upsert: true }),
    supabase.storage
      .from(BUCKET)
      .upload(paths.rgb, rendered.rgbPng, { contentType: 'image/png', upsert: true })
  ]);
  const failed = uploads.find((u) => u.error);
  if (failed && failed.error) {
    throw new Error('storage_upload_failed: ' + failed.error.message);
  }

  const meta = {
    ...meta0,
    status: 'done',
    status_message: 'Radar AirCI listo',
    async: true,
    provider: bundle.provider,
    date_start: bundle.dateStart,
    date_end: bundle.dateEnd,
    scene_count: bundle.sceneCount,
    lookback_days: bundle.lookbackDays,
    avg_cloud_cover: bundle.avgCloudCover != null ? bundle.avgCloudCover : null,
    coverage: rendered.coverage || null,
    ndvi_mean: rendered.ndviMean != null ? rendered.ndviMean : null,
    ndmi_mean: rendered.ndmiMean != null ? rendered.ndmiMean : null,
    ndre_mean: rendered.ndreMean != null ? rendered.ndreMean : null,
    location_snapshot: snap,
    images: {
      ndvi: { storage_path: paths.ndvi, label: 'NDVI' },
      ndmi: { storage_path: paths.ndmi, label: 'NDMI' },
      ndre: { storage_path: paths.ndre, label: 'NDRE' },
      rgb: { storage_path: paths.rgb, label: 'RGB' }
    },
    finished_at: new Date().toISOString()
  };

  const { error: upErr } = await supabase
    .from('radar_requests')
    .update({ image_storage_path: paths.ndvi, meta })
    .eq('id', requestId)
    .eq('user_id', userId);
  if (upErr) throw new Error(upErr.message);
  return { ok: true, already_done: false };
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
    console.warn('airci-radar-background: desactivado');
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

  const authHeader =
    (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
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
    const result = await processAirciJob(supabase, requestId, userData.user.id);
    console.log(
      'airci-radar-background ok:',
      requestId,
      result.already_done ? 'already_done' : 'done'
    );
  } catch (e) {
    console.error('airci-radar-background:', requestId, e);
    try {
      await patchMeta(supabase, requestId, {
        status: 'error',
        error: 'radar_render_failed',
        error_message: (e && e.message) || 'No se pudo generar el satélite',
        status_message: (e && e.message) || 'Falló el Radar satélite'
      });
    } catch (e2) {
      console.error('airci-radar-background patch error:', e2);
    }
  }

  return { statusCode: 202, body: '' };
};
