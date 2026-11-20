/**
 * AirCI — Radar satelital sobre el predio (encola + poll).
 * El render pesado va en airci-radar-background (igual que el Radar del dashboard).
 *
 * POST /api/airci-radar
 *   { polygon } → encola job → { ok, async, job_id }
 *   { action: 'status', job_id } → { ok, status, layers?, bbox?, meta? }
 */
'use strict';

const {
  normalizePolygon,
  buildLocationSnapshot,
  PILOT_SINGLE_SCENE_CANDIDATES
} = require('./lib/radar-pilot-job');

const BUCKET = 'radar-ndvi';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function monthKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

async function requireAdmin(supabase, event, body) {
  const authHeader =
    (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return { error: json(401, { ok: false, error: 'Sin sesión. Entra de nuevo como admin.' }) };
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { error: json(401, { ok: false, error: 'Token inválido o expirado' }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (!profile || !profile.is_admin) {
    return { error: json(403, { ok: false, error: 'Solo admin puede usar Radar en AirCI.' }) };
  }
  return { userId: userData.user.id, accessToken };
}

async function triggerAirciBackground(requestId, accessToken) {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '');
  if (!base) {
    console.warn('airci-radar: falta URL/DEPLOY_PRIME_URL');
    return false;
  }
  try {
    const res = await fetch(`${base}/.netlify/functions/airci-radar-background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ request_id: requestId })
    });
    return res.status === 202 || res.ok;
  } catch (e) {
    console.error('airci-radar trigger background:', e);
    return false;
  }
}

async function signedLayerUrls(supabase, meta) {
  const paths = (meta && meta.images) || {};
  const keys = ['ndvi', 'ndmi', 'ndre', 'rgb'];
  const out = {};
  await Promise.all(
    keys.map(async (key) => {
      const path = paths[key] && paths[key].storage_path;
      if (!path) return;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (data && data.signedUrl) out[key] = data.signedUrl;
    })
  );
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método no permitido' });
  }

  const enabled = String(process.env.RADAR_CDSE_PILOT_ENABLED || '').toLowerCase();
  if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') {
    return json(503, {
      ok: false,
      error: 'pilot_disabled',
      message:
        'Radar satélite desactivado. En Netlify: RADAR_CDSE_PILOT_ENABLED=true (igual que el Radar del dashboard).'
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'JSON inválido' });
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    return json(500, { ok: false, error: 'Supabase no configurado' });
  }

  const auth = await requireAdmin(supabase, event, body);
  if (auth.error) return auth.error;
  const { userId, accessToken } = auth;

  const action = String(body.action || 'start').trim().toLowerCase();

  // ----- poll status -----
  if (action === 'status') {
    const jobId = body.job_id != null ? String(body.job_id).trim() : '';
    if (!jobId) {
      return json(400, { ok: false, error: 'job_id requerido' });
    }
    const { data: job, error: jobErr } = await supabase
      .from('radar_requests')
      .select('id, created_at, image_storage_path, meta')
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle();
    if (jobErr || !job) {
      return json(404, { ok: false, error: 'job_not_found', message: 'Trabajo Radar no encontrado.' });
    }
    const meta = job.meta && typeof job.meta === 'object' ? job.meta : {};
    if (!meta.airci) {
      return json(400, { ok: false, error: 'not_airci_job' });
    }
    const status = String(meta.status || 'pending');
    if (status === 'error') {
      return json(200, {
        ok: false,
        status: 'error',
        job_id: job.id,
        error: meta.error || 'radar_render_failed',
        message: meta.status_message || meta.error_message || 'Falló el Radar satélite.'
      });
    }
    if (status !== 'done' || !job.image_storage_path) {
      return json(200, {
        ok: true,
        status: status === 'processing' ? 'processing' : 'pending',
        job_id: job.id,
        message: meta.status_message || 'Generando capas satélite…'
      });
    }
    const layers = await signedLayerUrls(supabase, meta);
    const snap = meta.location_snapshot || null;
    const bounds = snap && snap.bounds ? snap.bounds : null;
    return json(200, {
      ok: true,
      status: 'done',
      job_id: job.id,
      source: 'airci_radar',
      provider: meta.provider || null,
      layers,
      bbox: bounds
        ? {
            south: bounds.south,
            west: bounds.west,
            north: bounds.north,
            east: bounds.east
          }
        : null,
      meta: {
        date_start: meta.date_start || null,
        date_end: meta.date_end || null,
        scene_count: meta.scene_count != null ? meta.scene_count : null,
        lookback_days: meta.lookback_days != null ? meta.lookback_days : null,
        avg_cloud_cover: meta.avg_cloud_cover != null ? meta.avg_cloud_cover : null,
        coverage: meta.coverage || null,
        ndvi_mean: meta.ndvi_mean != null ? meta.ndvi_mean : null,
        ndmi_mean: meta.ndmi_mean != null ? meta.ndmi_mean : null,
        ndre_mean: meta.ndre_mean != null ? meta.ndre_mean : null,
        area_ha: snap && snap.area_hectares != null ? snap.area_hectares : null,
        predio_vertices: Array.isArray(meta.polygon) ? meta.polygon.length : null
      }
    });
  }

  // ----- start job -----
  const polygon = normalizePolygon(body.polygon);
  if (!polygon) {
    return json(400, {
      ok: false,
      error: 'no_polygon',
      message: 'Marca y cierra el predio (≥ 3 vértices) antes de pedir el satélite.'
    });
  }

  const maxDim = Math.min(Math.max(Number(body.max_dim) || 768, 256), 1536);
  const maxScenes = Math.min(
    Math.max(Number(body.max_scenes) || PILOT_SINGLE_SCENE_CANDIDATES, 1),
    PILOT_SINGLE_SCENE_CANDIDATES
  );
  const snap = buildLocationSnapshot(null, polygon);
  const mk = monthKey();
  const meta = {
    airci: true,
    pilot: true,
    engine: 'cdse_pilot',
    async: true,
    status: 'pending',
    status_message: 'Solicitud AirCI recibida. Encolando Sentinel…',
    polygon,
    max_dim: maxDim,
    max_scenes: maxScenes,
    location_snapshot: snap,
    area_hectares: snap && snap.area_hectares != null ? snap.area_hectares : null,
    queued_at: new Date().toISOString()
  };

  // project_id null: job solo AirCI (sin proyecto NutriPlant).
  let insert = await supabase
    .from('radar_requests')
    .insert({
      user_id: userId,
      project_id: null,
      month_key: mk,
      image_storage_path: null,
      meta
    })
    .select('id, created_at')
    .single();

  // Si la columna exige UUID, reintenta con un proyecto cualquiera del admin (solo ancla de fila).
  if (insert.error) {
    console.warn('airci-radar insert null project:', insert.error.message);
    const { data: anyProj } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!anyProj || !anyProj.id) {
      return json(500, {
        ok: false,
        error: 'queue_failed',
        message:
          'No se pudo encolar Radar AirCI (project_id). Crea/sincroniza al menos un proyecto en el dashboard o permite project_id null en radar_requests.'
      });
    }
    meta.airci_host_project_id = anyProj.id;
    insert = await supabase
      .from('radar_requests')
      .insert({
        user_id: userId,
        project_id: anyProj.id,
        month_key: mk,
        image_storage_path: null,
        meta
      })
      .select('id, created_at')
      .single();
  }

  if (insert.error || !insert.data) {
    return json(500, {
      ok: false,
      error: 'queue_failed',
      message: (insert.error && insert.error.message) || 'No se pudo encolar Radar AirCI'
    });
  }

  const jobId = insert.data.id;
  const triggered = await triggerAirciBackground(jobId, accessToken);
  if (!triggered) {
    console.warn('airci-radar encolado pero background no disparó:', jobId);
  }

  return json(202, {
    ok: true,
    async: true,
    queued: true,
    job_id: jobId,
    message:
      'Radar en cola (mismo motor que el dashboard). Puede tardar 1–3 min; AirCI irá consultando el estado.'
  });
};
