/**
 * Radar del cultivo (NDVI Sentinel-2 ~10 m) via Google Earth Engine.
 *
 * Variables Netlify:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_APPLICATION_CREDENTIALS_JSON  — JSON completo de la cuenta de servicio EE (una línea o objeto)
 *   EE_PROJECT_ID                         — ID del proyecto GCP con EE habilitado
 *   RADAR_MONTHLY_CREDITS                 — opcional, default 25
 *
 * Body JSON:
 *   action: "status" | "generate"
 *   project_id: string
 *   access_token: string (JWT usuario; también se acepta Authorization: Bearer)
 */

const DEFAULT_MONTHLY = 25;
const BUCKET = 'radar-ndvi';
const LOOKBACK_DAYS_FIRST = 120;
const LOOKBACK_DAYS_FALLBACK = 365;

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

let eeInitPromise = null;

function ensureEarthEngine(ee) {
  if (eeInitPromise) return eeInitPromise;
  const raw = (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '')
    .trim()
    .replace(/^\uFEFF/, '');
  if (!raw) {
    return Promise.reject(
      new Error(
        'Netlify no está pasando GOOGLE_APPLICATION_CREDENTIALS_JSON a la función. En Environment variables: edita esa variable y marca alcances Functions + Runtime (y Production). Guarda y Deploy sin caché.'
      )
    );
  }
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (err) {
    console.error('radar-ndvi credentials JSON.parse:', err.message);
    return Promise.reject(
      new Error(
        'JSON inválido en GOOGLE_APPLICATION_CREDENTIALS_JSON. Pega otra vez el archivo .json completo, sin texto de más.'
      )
    );
  }
  if (!creds.client_email || !creds.private_key) {
    return Promise.reject(
      new Error(
        'El JSON no trae client_email o private_key. Debe ser el archivo de cuenta de servicio de Google sin editar.'
      )
    );
  }
  const projectId = (process.env.EE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '').trim();
  if (!projectId) {
    return Promise.reject(
      new Error(
        'Falta EE_PROJECT_ID en Netlify. Añádela en Environment variables y redeploy.'
      )
    );
  }
  eeInitPromise = new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      creds,
      () => {
        ee.initialize(
          null,
          null,
          () => resolve(ee),
          (err) => reject(err || new Error('ee.initialize falló')),
          undefined,
          projectId
        );
      },
      (err) => reject(err || new Error('authenticateViaPrivateKey falló'))
    );
  });
  return eeInitPromise;
}

function latLngPolygonToEeRing(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return null;
  const ring = polygon.map((pt) => {
    if (!Array.isArray(pt) || pt.length < 2) return null;
    const lat = Number(pt[0]);
    const lng = Number(pt[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lng, lat];
  });
  if (ring.some((x) => x === null)) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }
  return ring;
}

function ndviThumbUrl(ee, geometry, lookbackDays) {
  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 86400000);
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);

  const coll = ee
    .ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geometry)
    .filterDate(s, e)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80));

  const image = coll.median();
  const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI').clip(geometry);
  // Mantener píxeles nítidos: el suavizado bilinear hacía que el NDVI se perdiera sobre el satélite.
  const displayNdvi = ndvi.clip(geometry);
  const vis = displayNdvi.visualize({
    min: 0.10,
    max: 0.92,
    palette: ['7f1d1d', 'b91c1c', 'ea580c', 'f59e0b', 'fde68a', 'bef264', '65a30d', '15803d', '064e3b']
  });

  return new Promise((resolve, reject) => {
    vis.getThumbURL(
      {
        dimensions: 2048,
        region: geometry,
        format: 'png'
      },
      (url, err) => {
        if (err) reject(new Error(String(err)));
        else if (!url) reject(new Error('Sin URL de miniatura'));
        else resolve({ url, dateStart: s, dateEnd: e });
      }
    );
  });
}

async function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

async function countMonthlyUsage(supabase, userId, mk) {
  const { count, error } = await supabase
    .from('radar_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('month_key', mk)
    .not('image_storage_path', 'is', null);
  if (error) {
    console.warn('countMonthlyUsage:', error.message);
    return 0;
  }
  return count || 0;
}

async function getBonusCredits(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('radar_credits_bonus')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('getBonusCredits:', error.message);
    return 0;
  }
  return Math.max(0, Math.floor(Number(data?.radar_credits_bonus) || 0));
}

async function getLatestRadarRow(supabase, userId, projectId) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('getLatestRadarRow:', error.message);
    return null;
  }
  return data;
}

async function signedUrlForPath(supabase, path, ttlSec = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método no permitido' });
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(500, { error: 'Supabase no configurado en el servidor' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'JSON inválido' });
  }

  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return jsonResponse(401, { error: 'Falta access_token o cabecera Authorization' });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return jsonResponse(401, { error: 'Token inválido o expirado' });
  }
  const userId = userData.user.id;

  const projectId = body.project_id != null ? String(body.project_id).trim() : '';
  if (!projectId) {
    return jsonResponse(400, { error: 'project_id es obligatorio' });
  }

  const action = String(body.action || 'status').toLowerCase();
  const mk = monthKey();
  const baseLimit = Math.max(
    0,
    Math.floor(
      Number(process.env.RADAR_MONTHLY_CREDITS != null && process.env.RADAR_MONTHLY_CREDITS !== ''
        ? process.env.RADAR_MONTHLY_CREDITS
        : DEFAULT_MONTHLY)
    )
  );
  const bonus = await getBonusCredits(supabase, userId);
  const limit = baseLimit + bonus;
  const used = await countMonthlyUsage(supabase, userId, mk);

  const { data: proj, error: projErr } = await supabase
    .from('projects')
    .select('id, user_id, data')
    .eq('id', projectId)
    .maybeSingle();

  if (projErr || !proj) {
    return jsonResponse(404, {
      error: 'project_not_found',
      message: 'Proyecto no encontrado en la nube. Sincroniza proyectos o revisa el ID.'
    });
  }
  if (proj.user_id !== userId) {
    return jsonResponse(403, { error: 'Este proyecto no pertenece a tu cuenta.' });
  }

  const latest = await getLatestRadarRow(supabase, userId, projectId);
  let lastSignedUrl = null;
  if (latest?.image_storage_path) {
    lastSignedUrl = await signedUrlForPath(supabase, latest.image_storage_path);
  }

  if (action === 'status') {
    return jsonResponse(200, {
      ok: true,
      month_key: mk,
      credits: { used, limit, base: baseLimit, bonus },
      latest: latest
        ? {
            id: latest.id,
            created_at: latest.created_at,
            month_key: latest.month_key,
            image_storage_path: latest.image_storage_path,
            meta: latest.meta || {},
            signed_url: lastSignedUrl
          }
        : null
    });
  }

  if (action !== 'generate') {
    return jsonResponse(400, { error: 'action debe ser status o generate' });
  }

  const polygon = proj.data?.location?.polygon;
  const ring = latLngPolygonToEeRing(polygon);
  if (!ring) {
    return jsonResponse(400, {
      error: 'no_polygon',
      message: 'El proyecto no tiene polígono en la nube. Guarda la ubicación y sincroniza.'
    });
  }

  if (limit > 0 && used >= limit) {
    return jsonResponse(429, {
      error: 'radar_quota_exceeded',
      message: 'Has agotado tus créditos Radar este mes.',
      credits: { used, limit, base: baseLimit, bonus }
    });
  }

  const { count: snapshotMonthCount, error: snapErr } = await supabase
    .from('radar_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('month_key', mk)
    .not('image_storage_path', 'is', null);

  if (snapErr) {
    console.warn('snapshot month check:', snapErr.message);
  }
  const hasSnapshotThisMonth = (snapshotMonthCount || 0) > 0;
  if (hasSnapshotThisMonth && !body.force) {
    return jsonResponse(409, {
      error: 'already_generated_this_month',
      message: 'Este mes ya hay un Radar para este proyecto. Usa «Ver última» o reintenta con force si debes regenerar.',
      latest: { signed_url: lastSignedUrl, month_key: mk }
    });
  }

  let ee;
  try {
    ee = require('@google/earthengine');
    await ensureEarthEngine(ee);
  } catch (e) {
    console.error('EE init:', e);
    return jsonResponse(500, {
      error: 'earthengine_init_failed',
      message: e.message || 'No se pudo inicializar Earth Engine'
    });
  }

  const geometry = ee.Geometry.Polygon([ring]);
  let thumb;
  try {
    thumb = await ndviThumbUrl(ee, geometry, LOOKBACK_DAYS_FIRST);
  } catch (e1) {
    try {
      thumb = await ndviThumbUrl(ee, geometry, LOOKBACK_DAYS_FALLBACK);
    } catch (e2) {
      console.error('NDVI thumb:', e2);
      return jsonResponse(502, {
        error: 'ndvi_render_failed',
        message: (e2 && e2.message) || 'No se pudo generar la miniatura NDVI'
      });
    }
  }

  let buf;
  try {
    const res = await fetch(thumb.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error('fetch thumb:', e);
    return jsonResponse(502, { error: 'thumb_download_failed', message: e.message });
  }

  const ts = Date.now();
  const storagePath = `${userId}/${projectId}/${mk}_${ts}.png`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: 'image/png',
    upsert: true
  });
  if (upErr) {
    console.error('storage upload:', upErr);
    return jsonResponse(500, { error: 'storage_upload_failed', message: upErr.message });
  }

  const meta = {
    date_start: thumb.dateStart,
    date_end: thumb.dateEnd,
    source: 'COPERNICUS/S2_SR_HARMONIZED',
    ndvi_vis: { min: 0.10, max: 0.92, style: 'balanced_crisp' }
  };

  const { data: insRow, error: insErr } = await supabase
    .from('radar_requests')
    .insert({
      user_id: userId,
      project_id: projectId,
      month_key: mk,
      image_storage_path: storagePath,
      meta
    })
    .select('id, created_at')
    .single();

  if (insErr) {
    console.error('radar_requests insert:', insErr);
    return jsonResponse(500, { error: 'db_insert_failed', message: insErr.message });
  }

  const signed = await signedUrlForPath(supabase, storagePath);
  const newUsed = used + 1;

  return jsonResponse(200, {
    ok: true,
    request: insRow,
    credits: { used: newUsed, limit, base: baseLimit, bonus },
    storage_path: storagePath,
    signed_url: signed,
    meta
  });
};
