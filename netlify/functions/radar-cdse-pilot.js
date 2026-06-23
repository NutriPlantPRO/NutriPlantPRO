/**
 * Radar pilot — NDVI/NDMI sin Google Earth Engine.
 *
 * Prueba oculta: no usa créditos ni radar_requests; devuelve PNG en base64 para overlay.
 *
 * Netlify env:
 *   RADAR_CDSE_PILOT_ENABLED=true   — obligatorio para activar
 *   RADAR_PILOT_PROVIDER=planetary|cdse  — default planetary (gratis, sin tarjeta)
 *   CDSE_CLIENT_ID / CDSE_CLIENT_SECRET — solo si provider=cdse
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auth usuario (mismo que Radar)
 *
 * POST JSON: { polygon: [[lat,lng],...], project_id?: string }
 */

const { findSentinel2ScenesForComposite } = require('./lib/radar-pilot-stac');
const { renderNdviNdmiCompositePngs } = require('./lib/radar-pilot-render');

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function normalizePolygon(raw) {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const out = [];
  raw.forEach((pt) => {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lat = Number(pt[0]);
      const lng = Number(pt[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
    } else if (pt && pt.lat != null && pt.lng != null) {
      const lat = Number(pt.lat);
      const lng = Number(pt.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
    }
  });
  return out.length >= 3 ? out : null;
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
    return jsonResponse(405, { error: 'Método no permitido' });
  }

  const enabled = String(process.env.RADAR_CDSE_PILOT_ENABLED || '').toLowerCase();
  if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') {
    return jsonResponse(404, {
      error: 'pilot_disabled',
      message: 'Pilot Radar CDSE desactivado. En Netlify: RADAR_CDSE_PILOT_ENABLED=true'
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'JSON inválido' });
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(500, { error: 'Supabase no configurado' });
  }

  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return jsonResponse(401, { error: 'Falta access_token o Authorization Bearer' });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return jsonResponse(401, { error: 'Token inválido o expirado' });
  }

  const polygon = normalizePolygon(body.polygon);
  if (!polygon) {
    return jsonResponse(400, {
      error: 'no_polygon',
      message: 'Envía polygon: [[lat,lng],...] con al menos 3 vértices.'
    });
  }

  const maxDim = Math.min(Math.max(Number(body.max_dim) || 2048, 256), 2048);

  try {
    const bundle = await findSentinel2ScenesForComposite(polygon, {});
    const rendered = await renderNdviNdmiCompositePngs(
      { scenes: bundle.scenes, bbox4326: bundle.bbox, polygon },
      { maxDim }
    );

    const ndviDataUrl = 'data:image/png;base64,' + rendered.ndviPng.toString('base64');
    const ndmiDataUrl = 'data:image/png;base64,' + rendered.ndmiPng.toString('base64');
    const latestScene = bundle.scenes[0] || {};

    return jsonResponse(200, {
      ok: true,
      pilot: true,
      provider: bundle.provider,
      source: bundle.provider === 'cdse' ? 'CDSE/sentinel-2-l2a' : 'PlanetaryComputer/sentinel-2-l2a',
      composite: {
        enabled: bundle.composite,
        scene_count: bundle.sceneCount,
        lookback_days: bundle.lookbackDays,
        max_cloud_pct: bundle.maxCloudPct,
        date_start: bundle.dateStart,
        date_end: bundle.dateEnd,
        scl_masked: true,
        fallback_tier: bundle.fallbackTier || null
      },
      scene: {
        id: latestScene.itemId,
        datetime: latestScene.datetime,
        cloud_cover: latestScene.cloudCover,
        lookback_days: bundle.lookbackDays,
        max_cloud_pct: bundle.maxCloudPct
      },
      scenes: bundle.scenes.map((s) => ({
        id: s.itemId,
        datetime: s.datetime,
        cloud_cover: s.cloudCover
      })),
      dimensions: { width: rendered.width, height: rendered.height },
      lookback_days: bundle.lookbackDays,
      credits_charged: 0,
      images: {
        ndvi: { data_url: ndviDataUrl, label: 'NDVI' },
        ndmi: { data_url: ndmiDataUrl, label: 'NDMI' }
      },
      ndvi_data_url: ndviDataUrl,
      ndmi_data_url: ndmiDataUrl,
      meta: {
        pilot: true,
        composite: bundle.composite,
        scene_count: bundle.sceneCount,
        scl_masked: true,
        note: 'Mediana 30 d + SCL; no guardado en Supabase ni créditos Radar.',
        vis: rendered.vis
      }
    });
  } catch (e) {
    console.error('radar-cdse-pilot:', e);
    return jsonResponse(502, {
      error: 'pilot_render_failed',
      message: e.message || 'No se pudo generar NDVI/NDMI pilot'
    });
  }
};
