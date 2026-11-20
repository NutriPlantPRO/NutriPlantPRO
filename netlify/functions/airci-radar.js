/**
 * AirCI — Radar satelital sobre el polígono del predio (NDVI/NDMI/NDRE/RGB).
 * Misma tubería que Radar Pilot del dashboard; sin exigir project_id NutriPlant.
 *
 * POST /api/airci-radar
 * Body: { polygon: [[lat,lng],...], max_dim?: number }
 * Auth: Bearer Supabase (admin)
 */
'use strict';

const {
  normalizePolygon,
  buildLocationSnapshot,
  renderPilotCompositeWithTiers,
  PILOT_SINGLE_SCENE_CANDIDATES
} = require('./lib/radar-pilot-job');

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

async function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
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

  const authHeader =
    (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return json(401, {
      ok: false,
      error: 'Sin sesión. Entra de nuevo como admin.'
    });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return json(401, { ok: false, error: 'Token inválido o expirado' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (!profile || !profile.is_admin) {
    return json(403, { ok: false, error: 'Solo admin puede usar Radar en AirCI.' });
  }

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

  try {
    const pilotOut = await renderPilotCompositeWithTiers(polygon, maxScenes, maxDim);
    const bundle = pilotOut.bundle;
    const rendered = pilotOut.rendered;
    const snap = buildLocationSnapshot(null, polygon);
    const bounds = snap && snap.bounds ? snap.bounds : null;

    return json(200, {
      ok: true,
      source: 'airci_radar',
      provider: bundle.provider,
      layers: {
        ndvi: 'data:image/png;base64,' + rendered.ndviPng.toString('base64'),
        ndmi: 'data:image/png;base64,' + rendered.ndmiPng.toString('base64'),
        ndre: 'data:image/png;base64,' + rendered.ndrePng.toString('base64'),
        rgb: 'data:image/png;base64,' + rendered.rgbPng.toString('base64')
      },
      bbox: bounds
        ? {
            south: bounds.south,
            west: bounds.west,
            north: bounds.north,
            east: bounds.east
          }
        : null,
      meta: {
        date_start: bundle.dateStart,
        date_end: bundle.dateEnd,
        scene_count: bundle.sceneCount,
        lookback_days: bundle.lookbackDays,
        avg_cloud_cover: bundle.avgCloudCover != null ? bundle.avgCloudCover : null,
        coverage: rendered.coverage || null,
        ndvi_mean: rendered.ndviMean != null ? rendered.ndviMean : null,
        ndmi_mean: rendered.ndmiMean != null ? rendered.ndmiMean : null,
        ndre_mean: rendered.ndreMean != null ? rendered.ndreMean : null,
        area_ha: snap && snap.area_hectares != null ? snap.area_hectares : null,
        predio_vertices: polygon.length
      }
    });
  } catch (e) {
    console.error('airci-radar:', e);
    return json(502, {
      ok: false,
      error: 'radar_render_failed',
      message: (e && e.message) || 'No se pudo generar NDVI/NDMI/NDRE/RGB del satélite.'
    });
  }
};
