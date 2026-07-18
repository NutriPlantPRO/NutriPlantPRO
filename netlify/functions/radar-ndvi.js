/**
 * Radar del cultivo (NDVI/NDMI Sentinel-2 ~10 m) via Google Earth Engine.
 *
 * Variables Netlify:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_APPLICATION_CREDENTIALS_JSON  — JSON completo de la cuenta de servicio EE (una línea o objeto)
 *   EE_PROJECT_ID                         — ID del proyecto GCP con EE habilitado
 *   RADAR_MONTHLY_CREDITS                 — opcional, default 20
 *   RADAR_AREA_TIER2_HA                   — opcional, default 30 (> esto = 2 créditos)
 *   RADAR_AREA_TIER3_HA                   — opcional, default 100 (> esto = 3 créditos)
 *   RADAR_CREDITS_TIER2                   — opcional, default 2
 *   RADAR_CREDITS_TIER3                   — opcional, default 3
 *   RADAR_ADMIN_SECRET                    — opcional; cabecera X-Radar-Admin-Secret para action "admin_status"
 *   NUTRIPLANT_ADMIN_KEY                  — opcional; admin_key en body (misma clave ?k= del panel admin)
 *
 * Body JSON:
 *   action: "status" | "generate" | "admin_status" | "admin_lectura_status" | "admin_user_credits" | "admin_list" | "admin_delete"
 *   project_id: string
 *   access_token: string (JWT usuario; también se acepta Authorization: Bearer)
 */

const DEFAULT_MONTHLY = 20;
const BUCKET = 'radar-ndvi';
const LOOKBACK_DAYS_FIRST = 120;
const LOOKBACK_DAYS_FALLBACK = 365;
const radarCredits = require('./lib/radar-credits');
const { sumMonthlyRadarCreditsUsed, getPendingPilotJobForStatus, getLatestFailedPilotJob, getRadarRowsByIds } = require('./lib/radar-pilot-job');

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

/** Polígono del predio en el momento de generar Radar (para anclar NDVI/NDMI al lugar correcto). */
function buildLocationSnapshot(location) {
  if (!location || !Array.isArray(location.polygon) || location.polygon.length < 3) return null;
  const polygon = location.polygon
    .map((pt) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        const lat = Number(pt[0]);
        const lng = Number(pt[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
      }
      if (pt && typeof pt === 'object' && pt.lat != null && pt.lng != null) {
        const lat = Number(pt.lat);
        const lng = Number(pt.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
      }
      return null;
    })
    .filter(Boolean);
  if (polygon.length < 3) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  let sumLat = 0;
  let sumLng = 0;
  polygon.forEach(([lat, lng]) => {
    north = Math.max(north, lat);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    west = Math.min(west, lng);
    sumLat += lat;
    sumLng += lng;
  });

  const centerFromLoc =
    location.center &&
    typeof location.center === 'object' &&
    location.center.lat != null &&
    location.center.lng != null
      ? { lat: Number(location.center.lat), lng: Number(location.center.lng) }
      : { lat: sumLat / polygon.length, lng: sumLng / polygon.length };

  return {
    polygon,
    vertex_count: polygon.length,
    center: centerFromLoc,
    bounds: { north, south, east, west },
    area_hectares:
      location.areaHectares != null && Number.isFinite(Number(location.areaHectares))
        ? Number(location.areaHectares)
        : null,
    area_m2: location.area != null && Number.isFinite(Number(location.area)) ? Number(location.area) : null,
    perimeter_m:
      location.perimeter != null && Number.isFinite(Number(location.perimeter))
        ? Number(location.perimeter)
        : null,
    captured_at: new Date().toISOString()
  };
}

function radarThumbUrl(ee, geometry, lookbackDays, indexType) {
  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 86400000);
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);
  const type = String(indexType || 'ndvi').toLowerCase();

  const coll = ee
    .ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geometry)
    .filterDate(s, e)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80));

  const image = coll.median();
  const isNdmi = type === 'ndmi';
  const index = isNdmi
    ? image.normalizedDifference(['B8', 'B11']).rename('NDMI').clip(geometry)
    : image.normalizedDifference(['B8', 'B4']).rename('NDVI').clip(geometry);
  // Mantener píxeles nítidos: el suavizado bilinear hacía que el índice se perdiera sobre el satélite.
  const displayIndex = index.clip(geometry);
  const vis = displayIndex.visualize(isNdmi
    ? {
        min: -0.25,
        max: 0.55,
        palette: ['7c2d12', 'ea580c', 'f59e0b', 'fde68a', 'bbf7d0', '22c55e', '0f766e', '0369a1']
      }
    : {
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
        else resolve({ url, dateStart: s, dateEnd: e, type });
      }
    );
  });
}

function ndviThumbUrl(ee, geometry, lookbackDays) {
  return radarThumbUrl(ee, geometry, lookbackDays, 'ndvi');
}

function ndmiThumbUrl(ee, geometry, lookbackDays) {
  return radarThumbUrl(ee, geometry, lookbackDays, 'ndmi');
}

async function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

async function sumMonthlyCreditsUsed(supabase, userId, mk) {
  return sumMonthlyRadarCreditsUsed(supabase, userId, mk);
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

function isLecturaRadarRow(row) {
  return !!(row && row.meta && row.meta.lectura);
}

function isPilotRadarRow(row) {
  return !!row && !isLecturaRadarRow(row);
}

async function getLatestRadarRow(supabase, userId, projectId) {
  // Trae varias para saltar jobs de Lectura Satelital (histórico por periodos).
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) {
    console.warn('getLatestRadarRow:', error.message);
    return null;
  }
  return (data || []).find(isPilotRadarRow) || null;
}

async function getRadarHistoryRows(supabase, userId, projectId, limit) {
  const want = Math.min(Math.max(Number(limit) || 24, 1), 36);
  // Pide de más porque Lectura Satelital comparte la misma tabla y no debe salir en el selector Pilot.
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(Math.min(want * 4, 80));
  if (error) {
    console.warn('getRadarHistoryRows:', error.message);
    return [];
  }
  return (data || []).filter(isPilotRadarRow).slice(0, want);
}

async function getRadarRowById(supabase, userId, projectId, requestId) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('id', requestId)
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .maybeSingle();
  if (error) {
    console.warn('getRadarRowById:', error.message);
    return null;
  }
  return data;
}

function historyItemFromRow(row) {
  if (!row) return null;
  const meta = row.meta || {};
  const ndmiPath = meta.ndmi_storage_path || meta.images?.ndmi?.storage_path || null;
  const loc = meta.location_snapshot || null;
  const sceneDates = Array.isArray(meta.scene_dates)
    ? meta.scene_dates.map((d) => String(d).slice(0, 10)).filter(Boolean)
    : [];
  return {
    id: row.id,
    created_at: row.created_at,
    month_key: row.month_key,
    lectura: !!meta.lectura,
    sentinel_period: {
      from: meta.date_start || null,
      to: meta.date_end || null
    },
    scene_dates: sceneDates.length ? sceneDates : null,
    has_ndmi: !!ndmiPath,
    has_location_snapshot: !!(loc && Array.isArray(loc.polygon) && loc.polygon.length >= 3),
    location_center: loc && loc.center ? loc.center : null,
    area_hectares: loc && loc.area_hectares != null ? loc.area_hectares : null
  };
}

async function signRadarRow(supabase, row) {
  if (!row?.image_storage_path) {
    return { ndviSignedUrl: null, ndmiSignedUrl: null, ndreSignedUrl: null, rgbSignedUrl: null };
  }
  const meta = row.meta || {};
  const ndmiPath = meta.ndmi_storage_path || meta.images?.ndmi?.storage_path || null;
  const ndrePath = meta.ndre_storage_path || meta.images?.ndre?.storage_path || null;
  const rgbPath = meta.rgb_storage_path || meta.images?.rgb?.storage_path || null;
  const [ndviSignedUrl, ndmiSignedUrl, ndreSignedUrl, rgbSignedUrl] = await Promise.all([
    signedUrlForPath(supabase, row.image_storage_path),
    signedUrlForPath(supabase, ndmiPath),
    signedUrlForPath(supabase, ndrePath),
    signedUrlForPath(supabase, rgbPath)
  ]);
  return { ndviSignedUrl, ndmiSignedUrl, ndreSignedUrl, rgbSignedUrl };
}

async function signedUrlForPath(supabase, path, ttlSec = 3600) {
  if (!path || typeof path !== 'string' || !String(path).trim()) return null;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(String(path).trim(), ttlSec);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch (e) {
    console.warn('signedUrlForPath:', e && e.message ? e.message : e);
    return null;
  }
}

function isAdminRadarAuthorized(event, body) {
  const hdr = event.headers || {};
  const adminSecretCfg = (process.env.RADAR_ADMIN_SECRET || '').trim();
  const adminHdrRaw = (
    hdr['x-radar-admin-secret'] ||
    hdr['X-Radar-Admin-Secret'] ||
    ''
  ).trim();
  if (adminSecretCfg && adminHdrRaw === adminSecretCfg) {
    return true;
  }
  const expectedAdminKey = (process.env.NUTRIPLANT_ADMIN_KEY || 'np_admin_key_8f4a2b9c1e7d').trim();
  const bodyAdminKey = body && body.admin_key != null ? String(body.admin_key).trim() : '';
  return !!(expectedAdminKey && bodyAdminKey === expectedAdminKey);
}

function sanitizeSearchTerm(raw) {
  return String(raw || '')
    .trim()
    .replace(/[%_,]/g, ' ')
    .slice(0, 80);
}

async function resolveProfileIdsByQuery(supabase, userQ) {
  const q = sanitizeSearchTerm(userQ);
  if (!q) return null;
  const term = '"%' + q.replace(/"/g, '') + '%"';
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or('email.ilike.' + term + ',name.ilike.' + term)
    .limit(120);
  if (error) {
    console.warn('resolveProfileIdsByQuery:', error.message);
    return [];
  }
  return (data || []).map((r) => r.id).filter(Boolean);
}

async function resolveProjectIdsByQuery(supabase, projectQ) {
  const q = sanitizeSearchTerm(projectQ);
  if (!q) return null;
  const ids = new Set();
  const { data: byId } = await supabase.from('projects').select('id').eq('id', q).limit(5);
  (byId || []).forEach((r) => {
    if (r && r.id) ids.add(String(r.id));
  });
  const term = '"%' + q.replace(/"/g, '') + '%"';
  const { data: byName, error } = await supabase
    .from('projects')
    .select('id')
    .or('name.ilike.' + term + ',title.ilike.' + term)
    .limit(120);
  if (error) console.warn('resolveProjectIdsByQuery:', error.message);
  (byName || []).forEach((r) => {
    if (r && r.id) ids.add(String(r.id));
  });
  return Array.from(ids);
}

/**
 * Quita request_id / URLs de Lectura y radarSelectedRequestId de Pilot
 * cuando el admin borra una imagen.
 */
function scrubRequestIdFromProjectData(projectData, requestId) {
  const id = String(requestId || '').trim();
  if (!id || !projectData || typeof projectData !== 'object') {
    return { changed: false, data: projectData };
  }
  const data = JSON.parse(JSON.stringify(projectData));
  const loc = data.location;
  if (!loc || typeof loc !== 'object') {
    return { changed: false, data: projectData };
  }
  let changed = false;

  if (String(loc.radarSelectedRequestId || '') === id) {
    delete loc.radarSelectedRequestId;
    changed = true;
  }

  function scrubRows(rows) {
    if (!Array.isArray(rows)) return rows;
    return rows.map((row) => {
      if (!row || String(row.request_id || '') !== id) return row;
      changed = true;
      const next = Object.assign({}, row);
      delete next.request_id;
      delete next.signed_url;
      delete next.ndmi_signed_url;
      delete next.ndre_signed_url;
      delete next.rgb_signed_url;
      next.status = 'deleted';
      next.error_code = 'admin_deleted';
      next.error_message = 'Imagen eliminada por administrador';
      return next;
    });
  }

  if (loc.lecturaSatelital && typeof loc.lecturaSatelital === 'object') {
    const ls = loc.lecturaSatelital;
    if (Array.isArray(ls.rows)) ls.rows = scrubRows(ls.rows);
    if (Array.isArray(ls.runs)) {
      ls.runs = ls.runs.map((run) => {
        if (!run || typeof run !== 'object') return run;
        const r = Object.assign({}, run);
        if (Array.isArray(r.rows)) r.rows = scrubRows(r.rows);
        return r;
      });
    }
  }

  return { changed, data };
}

async function deleteRadarStorageFiles(supabase, row) {
  const paths = [];
  if (row && row.image_storage_path) paths.push(String(row.image_storage_path));
  const meta = (row && row.meta) || {};
  const ndmiPath = meta.ndmi_storage_path || (meta.images && meta.images.ndmi && meta.images.ndmi.storage_path) || null;
  const ndrePath = meta.ndre_storage_path || (meta.images && meta.images.ndre && meta.images.ndre.storage_path) || null;
  const rgbPath = meta.rgb_storage_path || (meta.images && meta.images.rgb && meta.images.rgb.storage_path) || null;
  if (ndmiPath) paths.push(String(ndmiPath));
  if (ndrePath) paths.push(String(ndrePath));
  if (rgbPath) paths.push(String(rgbPath));
  if (!paths.length) return { ok: true, removed: [] };
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    console.warn('deleteRadarStorageFiles:', error.message);
    return { ok: false, error: error.message, removed: paths };
  }
  return { ok: true, removed: paths };
}

function latestResponse(latest, ndviSignedUrl, ndmiSignedUrl, ndreSignedUrl, rgbSignedUrl) {
  if (!latest) return null;
  const meta = latest.meta || {};
  const ndmiPath = meta.ndmi_storage_path || meta.images?.ndmi?.storage_path || null;
  const ndrePath = meta.ndre_storage_path || meta.images?.ndre?.storage_path || null;
  const rgbPath = meta.rgb_storage_path || meta.images?.rgb?.storage_path || null;
  return {
    id: latest.id,
    created_at: latest.created_at,
    month_key: latest.month_key,
    image_storage_path: latest.image_storage_path,
    ndmi_storage_path: ndmiPath,
    ndre_storage_path: ndrePath,
    rgb_storage_path: rgbPath,
    meta,
    signed_url: ndviSignedUrl,
    ndmi_signed_url: ndmiSignedUrl,
    ndre_signed_url: ndreSignedUrl || null,
    rgb_signed_url: rgbSignedUrl || null,
    images: {
      ndvi: {
        storage_path: latest.image_storage_path,
        signed_url: ndviSignedUrl
      },
      ndmi: {
        storage_path: ndmiPath,
        signed_url: ndmiSignedUrl
      },
      ndre: {
        storage_path: ndrePath,
        signed_url: ndreSignedUrl || null
      },
      rgb: {
        storage_path: rgbPath,
        signed_url: rgbSignedUrl || null
      }
    }
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Radar-Admin-Secret',
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

  const bodyActionEarly = String(body.action || 'status').toLowerCase();

  if (bodyActionEarly === 'admin_status') {
    if (!isAdminRadarAuthorized(event, body)) {
      return jsonResponse(403, {
        error: 'admin_unauthorized',
        message: 'Acceso admin denegado. Abre el panel con ?k= válido o usa X-Radar-Admin-Secret.'
      });
    }

    const projectIdAdm = body.project_id != null ? String(body.project_id).trim() : '';
    if (!projectIdAdm) {
      return jsonResponse(400, { error: 'project_id es obligatorio' });
    }
    const { data: projAdm, error: projAdmErr } = await supabase
      .from('projects')
      .select('id, user_id, data')
      .eq('id', projectIdAdm)
      .maybeSingle();

    if (projAdmErr || !projAdm) {
      return jsonResponse(404, {
        error: 'project_not_found',
        message: 'Proyecto no encontrado en la nube.'
      });
    }

    const ownerUserId = projAdm.user_id;
    const histLimitAdm = Math.min(Math.max(parseInt(body.history_limit, 10) || 36, 1), 48);
    const requestIdAdm = body.request_id != null ? String(body.request_id).trim() : '';
    const mkAdm = monthKey();
    const [latestAdm, historyRowsAdm, usedAdm, bonusAdm] = await Promise.all([
      getLatestRadarRow(supabase, ownerUserId, projectIdAdm),
      getRadarHistoryRows(supabase, ownerUserId, projectIdAdm, histLimitAdm),
      sumMonthlyCreditsUsed(supabase, ownerUserId, mkAdm),
      getBonusCredits(supabase, ownerUserId)
    ]);
    const baseLimitAdm = radarCredits.getMonthlyBaseLimit();
    const limitAdm = baseLimitAdm + bonusAdm;
    const historyAdm = historyRowsAdm.map(historyItemFromRow).filter(Boolean);

    let viewRowAdm = latestAdm;
    if (requestIdAdm) {
      viewRowAdm = await getRadarRowById(supabase, ownerUserId, projectIdAdm, requestIdAdm);
      if (!viewRowAdm) {
        return jsonResponse(404, {
          error: 'radar_snapshot_not_found',
          message: 'No se encontró esa imagen Radar en este proyecto.',
          history: historyAdm,
          history_count: historyAdm.length
        });
      }
    }

    let sigNdvi = null;
    let sigNdmi = null;
    let sigNdre = null;
    let sigRgb = null;
    if (viewRowAdm?.image_storage_path) {
      const signed = await signRadarRow(supabase, viewRowAdm);
      sigNdvi = signed.ndviSignedUrl;
      sigNdmi = signed.ndmiSignedUrl;
      sigNdre = signed.ndreSignedUrl;
      sigRgb = signed.rgbSignedUrl;
    }

    return jsonResponse(200, {
      ok: true,
      admin: true,
      project_id: projectIdAdm,
      owner_user_id: ownerUserId,
      latest: latestResponse(viewRowAdm, sigNdvi, sigNdmi, sigNdre, sigRgb),
      history: historyAdm,
      history_count: historyAdm.length,
      view_request_id: viewRowAdm ? viewRowAdm.id : null,
      is_latest:
        !latestAdm || !viewRowAdm || String(latestAdm.id) === String(viewRowAdm.id),
      credits: {
        month_key: mkAdm,
        used: usedAdm,
        limit: limitAdm,
        base: baseLimitAdm,
        bonus: bonusAdm,
        available: Math.max(0, limitAdm - usedAdm),
        selected_charged:
          viewRowAdm && viewRowAdm.meta && viewRowAdm.meta.credits_charged != null
            ? Number(viewRowAdm.meta.credits_charged)
            : null
      }
    });
  }

  if (bodyActionEarly === 'admin_lectura_status') {
    if (!isAdminRadarAuthorized(event, body)) {
      return jsonResponse(403, {
        error: 'admin_unauthorized',
        message: 'Acceso admin denegado. Abre el panel con ?k= válido o usa X-Radar-Admin-Secret.'
      });
    }
    const projectIdLect = body.project_id != null ? String(body.project_id).trim() : '';
    if (!projectIdLect) {
      return jsonResponse(400, { error: 'project_id es obligatorio' });
    }
    const { data: projLect, error: projLectErr } = await supabase
      .from('projects')
      .select('id, user_id, data')
      .eq('id', projectIdLect)
      .maybeSingle();
    if (projLectErr || !projLect) {
      return jsonResponse(404, {
        error: 'project_not_found',
        message: 'Proyecto no encontrado en la nube.'
      });
    }
    const ownerLect = projLect.user_id;
    const idsLect = Array.isArray(body.request_ids) ? body.request_ids : [];
    const rowsLect = await getRadarRowsByIds(supabase, ownerLect, projectIdLect, idsLect);
    const byIdLect = {};
    rowsLect.forEach((r) => { byIdLect[String(r.id)] = r; });
    const itemsLect = [];
    for (const rawId of idsLect) {
      const id = String(rawId);
      const row = byIdLect[id];
      if (!row) {
        itemsLect.push({ id, status: 'not_found' });
        continue;
      }
      const meta = row.meta || {};
      const status = row.image_storage_path
        ? 'done'
        : String(meta.status || 'pending').toLowerCase();
      let signedUrl = null;
      let ndmiSignedUrl = null;
      let ndreSignedUrl = null;
      let rgbSignedUrl = null;
      if (row.image_storage_path) {
        const signed = await signRadarRow(supabase, row);
        signedUrl = signed.ndviSignedUrl;
        ndmiSignedUrl = signed.ndmiSignedUrl;
        ndreSignedUrl = signed.ndreSignedUrl;
        rgbSignedUrl = signed.rgbSignedUrl;
      }
      itemsLect.push({
        id,
        status,
        created_at: row.created_at,
        period_index: meta.period_index != null ? meta.period_index : null,
        period_label: meta.period_label || null,
        frequency: meta.frequency || null,
        date_start: meta.period_date_start || meta.date_start || null,
        date_end: meta.period_date_end || meta.date_end || null,
        search_date_start: meta.search_date_start || null,
        search_date_end: meta.search_date_end || null,
        scene_dates: meta.scene_dates || null,
        ndvi_mean: meta.ndvi_mean != null ? meta.ndvi_mean : null,
        ndmi_mean: meta.ndmi_mean != null ? meta.ndmi_mean : null,
        ndre_mean: meta.ndre_mean != null ? meta.ndre_mean : null,
        valid_pct: meta.valid_pct != null ? meta.valid_pct : null,
        avg_cloud_cover: meta.avg_cloud_cover != null ? meta.avg_cloud_cover : null,
        lookback_expanded: !!meta.lookback_expanded,
        expanded_to: meta.expanded_to || null,
        error_message: status === 'error' ? (meta.error_message || 'Error') : null,
        signed_url: signedUrl,
        ndmi_signed_url: ndmiSignedUrl,
        ndre_signed_url: ndreSignedUrl,
        rgb_signed_url: rgbSignedUrl
      });
    }
    const locSnap =
      (projLect.data && projLect.data.location && projLect.data.location.lecturaSatelital) ||
      null;
    return jsonResponse(200, {
      ok: true,
      admin: true,
      lectura: true,
      project_id: projectIdLect,
      owner_user_id: ownerLect,
      items: itemsLect,
      lectura_saved: locSnap
    });
  }

  if (bodyActionEarly === 'admin_user_credits') {
    if (!isAdminRadarAuthorized(event, body)) {
      return jsonResponse(403, {
        error: 'admin_unauthorized',
        message: 'Acceso admin denegado. Abre el panel con ?k= válido o usa X-Radar-Admin-Secret.'
      });
    }
    const userIdCred = body.user_id != null ? String(body.user_id).trim() : '';
    if (!userIdCred) {
      return jsonResponse(400, { error: 'user_id es obligatorio' });
    }
    const mkCred = monthKey();
    const baseCred = radarCredits.getMonthlyBaseLimit();
    const [usedCred, bonusCred] = await Promise.all([
      sumMonthlyCreditsUsed(supabase, userIdCred, mkCred),
      getBonusCredits(supabase, userIdCred)
    ]);
    const limitCred = baseCred + bonusCred;
    return jsonResponse(200, {
      ok: true,
      admin: true,
      user_id: userIdCred,
      month_key: mkCred,
      credits: {
        used: usedCred,
        base: baseCred,
        bonus: bonusCred,
        limit: limitCred,
        available: Math.max(0, limitCred - usedCred)
      }
    });
  }

  if (bodyActionEarly === 'admin_list') {
    if (!isAdminRadarAuthorized(event, body)) {
      return jsonResponse(403, {
        error: 'admin_unauthorized',
        message: 'Acceso admin denegado. Abre el panel con ?k= válido o usa X-Radar-Admin-Secret.'
      });
    }

    const page = Math.max(1, parseInt(body.page, 10) || 1);
    const pageSize = Math.min(Math.max(parseInt(body.page_size, 10) || 24, 1), 48);
    const typeRaw = String(body.type || body.kind || 'all').toLowerCase();
    const type = typeRaw === 'pilot' || typeRaw === 'lectura' ? typeRaw : 'all';
    const dateFrom = body.date_from ? String(body.date_from).slice(0, 10) : '';
    const dateTo = body.date_to ? String(body.date_to).slice(0, 10) : '';

    const userIdsFilter = await resolveProfileIdsByQuery(supabase, body.user_q || body.user_query || '');
    const projectIdsFilter = await resolveProjectIdsByQuery(
      supabase,
      body.project_q || body.project_query || ''
    );

    if (userIdsFilter && !userIdsFilter.length) {
      return jsonResponse(200, {
        ok: true,
        admin: true,
        items: [],
        page,
        page_size: pageSize,
        total: 0,
        has_more: false,
        type
      });
    }
    if (projectIdsFilter && !projectIdsFilter.length) {
      return jsonResponse(200, {
        ok: true,
        admin: true,
        items: [],
        page,
        page_size: pageSize,
        total: 0,
        has_more: false,
        type
      });
    }

    // Pedimos de más y filtramos Pilot/Lectura en JS (meta.lectura no siempre está indexado).
    const fetchMul = type === 'all' ? 1 : 3;
    const fetchLimit = Math.min(page * pageSize * fetchMul + pageSize * fetchMul, 400);
    let q = supabase
      .from('radar_requests')
      .select('id, created_at, month_key, image_storage_path, meta, user_id, project_id')
      .not('image_storage_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (userIdsFilter) q = q.in('user_id', userIdsFilter);
    if (projectIdsFilter) q = q.in('project_id', projectIdsFilter);
    if (dateFrom) q = q.gte('created_at', dateFrom + 'T00:00:00.000Z');
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59.999Z');

    const { data: rawRows, error: listErr } = await q;
    if (listErr) {
      console.error('admin_list:', listErr.message);
      return jsonResponse(500, { error: 'admin_list_failed', message: listErr.message });
    }

    let filtered = (rawRows || []).filter((row) => {
      if (type === 'lectura') return isLecturaRadarRow(row);
      if (type === 'pilot') return isPilotRadarRow(row);
      return true;
    });

    const totalApprox = filtered.length;
    const start = (page - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);
    const hasMore = filtered.length > start + pageSize || (rawRows || []).length >= fetchLimit;

    const userIds = [...new Set(pageRows.map((r) => r.user_id).filter(Boolean))];
    const projectIds = [...new Set(pageRows.map((r) => r.project_id).filter(Boolean))];

    const [profilesRes, projectsRes] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, email, name').in('id', userIds)
        : Promise.resolve({ data: [] }),
      projectIds.length
        ? supabase.from('projects').select('id, user_id, name, title').in('id', projectIds)
        : Promise.resolve({ data: [] })
    ]);

    const profileById = {};
    (profilesRes.data || []).forEach((p) => {
      profileById[String(p.id)] = p;
    });
    const projectById = {};
    (projectsRes.data || []).forEach((p) => {
      projectById[String(p.id)] = p;
    });

    const items = [];
    for (const row of pageRows) {
      const meta = row.meta || {};
      const signed = await signRadarRow(supabase, row);
      const prof = profileById[String(row.user_id)] || null;
      const proj = projectById[String(row.project_id)] || null;
      const sceneDates = Array.isArray(meta.scene_dates)
        ? meta.scene_dates.map((d) => String(d).slice(0, 10)).filter(Boolean)
        : [];
      items.push({
        id: row.id,
        created_at: row.created_at,
        month_key: row.month_key,
        user_id: row.user_id,
        project_id: row.project_id,
        kind: isLecturaRadarRow(row) ? 'lectura' : 'pilot',
        user_email: prof && prof.email ? prof.email : null,
        user_name: prof && prof.name ? prof.name : null,
        project_name: (proj && (proj.name || proj.title)) || null,
        period_label: meta.period_label || null,
        period_index: meta.period_index != null ? meta.period_index : null,
        frequency: meta.frequency || null,
        date_start: meta.period_date_start || meta.date_start || null,
        date_end: meta.period_date_end || meta.date_end || null,
        scene_dates: sceneDates.length ? sceneDates : null,
        ndvi_mean: meta.ndvi_mean != null ? meta.ndvi_mean : null,
        ndmi_mean: meta.ndmi_mean != null ? meta.ndmi_mean : null,
        ndre_mean: meta.ndre_mean != null ? meta.ndre_mean : null,
        valid_pct: meta.valid_pct != null ? meta.valid_pct : null,
        avg_cloud_cover: meta.avg_cloud_cover != null ? meta.avg_cloud_cover : null,
        lookback_expanded: !!meta.lookback_expanded,
        scene_count: meta.scene_count != null ? meta.scene_count : (sceneDates.length || null),
        credits_charged: meta.credits_charged != null ? Number(meta.credits_charged) : null,
        signed_url: signed.ndviSignedUrl,
        ndmi_signed_url: signed.ndmiSignedUrl,
        ndre_signed_url: signed.ndreSignedUrl,
        rgb_signed_url: signed.rgbSignedUrl,
        has_ndmi: !!(meta.ndmi_storage_path || (meta.images && meta.images.ndmi && meta.images.ndmi.storage_path)),
        has_ndre: !!(meta.ndre_storage_path || (meta.images && meta.images.ndre && meta.images.ndre.storage_path)),
        has_rgb: !!(meta.rgb_storage_path || (meta.images && meta.images.rgb && meta.images.rgb.storage_path))
      });
    }

    return jsonResponse(200, {
      ok: true,
      admin: true,
      items,
      page,
      page_size: pageSize,
      total: totalApprox,
      has_more: hasMore,
      type
    });
  }

  if (bodyActionEarly === 'admin_delete') {
    if (!isAdminRadarAuthorized(event, body)) {
      return jsonResponse(403, {
        error: 'admin_unauthorized',
        message: 'Acceso admin denegado. Abre el panel con ?k= válido o usa X-Radar-Admin-Secret.'
      });
    }

    const requestIdDel = body.request_id != null ? String(body.request_id).trim() : '';
    if (!requestIdDel) {
      return jsonResponse(400, { error: 'request_id es obligatorio' });
    }

    const { data: rowDel, error: rowDelErr } = await supabase
      .from('radar_requests')
      .select('id, created_at, month_key, image_storage_path, meta, user_id, project_id')
      .eq('id', requestIdDel)
      .maybeSingle();

    if (rowDelErr) {
      console.error('admin_delete select:', rowDelErr.message);
      return jsonResponse(500, { error: 'admin_delete_failed', message: rowDelErr.message });
    }
    if (!rowDel) {
      return jsonResponse(404, {
        error: 'radar_not_found',
        message: 'No se encontró esa imagen Radar.'
      });
    }

    const kind = isLecturaRadarRow(rowDel) ? 'lectura' : 'pilot';
    const storageResult = await deleteRadarStorageFiles(supabase, rowDel);

    const { error: delErr } = await supabase.from('radar_requests').delete().eq('id', requestIdDel);
    if (delErr) {
      console.error('admin_delete row:', delErr.message);
      return jsonResponse(500, {
        error: 'admin_delete_row_failed',
        message: delErr.message,
        storage: storageResult
      });
    }

    let projectScrubbed = false;
    const projectIdDel = rowDel.project_id != null ? String(rowDel.project_id) : '';
    if (projectIdDel) {
      const { data: projDel, error: projDelErr } = await supabase
        .from('projects')
        .select('id, data')
        .eq('id', projectIdDel)
        .maybeSingle();
      if (!projDelErr && projDel) {
        const scrub = scrubRequestIdFromProjectData(projDel.data || {}, requestIdDel);
        if (scrub.changed) {
          const { error: updErr } = await supabase
            .from('projects')
            .update({ data: scrub.data, updated_at: new Date().toISOString() })
            .eq('id', projectIdDel);
          if (updErr) {
            console.warn('admin_delete scrub project:', updErr.message);
          } else {
            projectScrubbed = true;
          }
        }
      }
    }

    return jsonResponse(200, {
      ok: true,
      admin: true,
      deleted: true,
      request_id: requestIdDel,
      kind,
      project_id: projectIdDel || null,
      user_id: rowDel.user_id || null,
      storage: storageResult,
      project_scrubbed: projectScrubbed
    });
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
  const baseLimit = radarCredits.getMonthlyBaseLimit();
  const bonus = await getBonusCredits(supabase, userId);
  const limit = baseLimit + bonus;
  const used = await sumMonthlyCreditsUsed(supabase, userId, mk);

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

  const historyLimit = Math.min(Math.max(parseInt(body.history_limit, 10) || 24, 1), 36);
  const latest = await getLatestRadarRow(supabase, userId, projectId);
  const historyRows = await getRadarHistoryRows(supabase, userId, projectId, historyLimit);
  const history = historyRows.map(historyItemFromRow).filter(Boolean);

  if (action === 'status') {
    let lastSignedUrl = null;
    let lastNdmiSignedUrl = null;
    let lastNdreSignedUrl = null;
    let lastRgbSignedUrl = null;
    if (latest?.image_storage_path) {
      const signed = await signRadarRow(supabase, latest);
      lastSignedUrl = signed.ndviSignedUrl;
      lastNdmiSignedUrl = signed.ndmiSignedUrl;
      lastNdreSignedUrl = signed.ndreSignedUrl;
      lastRgbSignedUrl = signed.rgbSignedUrl;
    }
    const pendingJob = await getPendingPilotJobForStatus(supabase, userId, projectId);
    const lastFailedJob = pendingJob
      ? null
      : await getLatestFailedPilotJob(supabase, userId, projectId);
    const areaHa = radarCredits.getAreaHectaresFromLocation(proj.data?.location);
    const pricing = radarCredits.getRadarCreditPricingInfo(areaHa);
    return jsonResponse(200, {
      ok: true,
      month_key: mk,
      credits: { used, limit, base: baseLimit, bonus, available: Math.max(0, limit - used) },
      pricing,
      latest: latestResponse(latest, lastSignedUrl, lastNdmiSignedUrl, lastNdreSignedUrl, lastRgbSignedUrl),
      pending_job: pendingJob,
      last_failed_job: lastFailedJob,
      history
    });
  }

  if (action === 'view') {
    const requestId = body.request_id != null ? String(body.request_id).trim() : '';
    let row = latest;
    if (requestId) {
      row = await getRadarRowById(supabase, userId, projectId, requestId);
      if (!row) {
        return jsonResponse(404, {
          error: 'radar_snapshot_not_found',
          message: 'No se encontró esa imagen Radar en este proyecto.'
        });
      }
    }
    if (!row?.image_storage_path) {
      return jsonResponse(404, {
        error: 'no_radar_image',
        message: 'Aún no hay imágenes Radar guardadas para este proyecto.'
      });
    }
    const signed = await signRadarRow(supabase, row);
    return jsonResponse(200, {
      ok: true,
      snapshot: latestResponse(
        row,
        signed.ndviSignedUrl,
        signed.ndmiSignedUrl,
        signed.ndreSignedUrl,
        signed.rgbSignedUrl
      )
    });
  }

  if (action === 'lectura_status') {
    const ids = Array.isArray(body.request_ids) ? body.request_ids : [];
    const rows = await getRadarRowsByIds(supabase, userId, projectId, ids);
    const byId = {};
    rows.forEach((r) => { byId[String(r.id)] = r; });
    const items = [];
    for (const rawId of ids) {
      const id = String(rawId);
      const row = byId[id];
      if (!row) {
        items.push({ id, status: 'not_found' });
        continue;
      }
      const meta = row.meta || {};
      const status = row.image_storage_path
        ? 'done'
        : String(meta.status || 'pending').toLowerCase();
      let signedUrl = null;
      let ndmiSignedUrl = null;
      let ndreSignedUrl = null;
      let rgbSignedUrl = null;
      if (row.image_storage_path) {
        const signed = await signRadarRow(supabase, row);
        signedUrl = signed.ndviSignedUrl;
        ndmiSignedUrl = signed.ndmiSignedUrl;
        ndreSignedUrl = signed.ndreSignedUrl;
        rgbSignedUrl = signed.rgbSignedUrl;
      }
      const lowCoverage = /radar_low_coverage|cobertura satelital útil|píxeles válidos|No hay escenas/i.test(
        String(meta.error_message || '')
      );
      const incomplete = !!(
        meta.image_incomplete ||
        meta.error_code === 'radar_incomplete_coverage'
      );
      const omitted = !!(meta.image_omitted && !row.image_storage_path);
      items.push({
        id,
        status,
        created_at: row.created_at,
        period_index: meta.period_index != null ? meta.period_index : null,
        period_label: meta.period_label || null,
        frequency: meta.frequency || null,
        date_start: meta.period_date_start || meta.date_start || null,
        date_end: meta.period_date_end || meta.date_end || null,
        search_date_start: meta.search_date_start || null,
        search_date_end: meta.search_date_end || null,
        scene_dates: meta.scene_dates || null,
        ndvi_mean: meta.ndvi_mean != null ? meta.ndvi_mean : null,
        ndmi_mean: meta.ndmi_mean != null ? meta.ndmi_mean : null,
        ndre_mean: meta.ndre_mean != null ? meta.ndre_mean : null,
        valid_pct: meta.valid_pct != null ? meta.valid_pct : null,
        avg_cloud_cover: meta.avg_cloud_cover != null ? meta.avg_cloud_cover : null,
        scene_count: meta.scene_count != null ? meta.scene_count : null,
        lookback_expanded: !!meta.lookback_expanded,
        expanded_to: meta.expanded_to || null,
        image_omitted: omitted,
        image_incomplete: incomplete && !omitted,
        incomplete_reason:
          meta.incomplete_reason ||
          (incomplete ? meta.status_message : null) ||
          null,
        omit_reason: omitted ? meta.omit_reason || meta.status_message || null : null,
        error_message:
          status === 'error'
            ? meta.error_message || 'Error'
            : omitted
              ? meta.omit_reason || meta.status_message || null
              : incomplete
                ? meta.incomplete_reason || meta.status_message || null
                : null,
        error_code:
          status === 'error' && lowCoverage
            ? 'radar_low_coverage'
            : omitted
              ? 'radar_incomplete_coverage'
              : incomplete
                ? 'radar_incomplete_coverage'
                : null,
        signed_url: signedUrl,
        ndmi_signed_url: ndmiSignedUrl,
        ndre_signed_url: ndreSignedUrl,
        rgb_signed_url: rgbSignedUrl
      });
    }
    return jsonResponse(200, { ok: true, items });
  }

  if (action !== 'generate') {
    return jsonResponse(400, { error: 'action debe ser status, view, generate o lectura_status' });
  }

  let lastSignedUrl = null;
  let lastNdmiSignedUrl = null;
  let lastNdreSignedUrl = null;
  let lastRgbSignedUrl = null;
  if (latest?.image_storage_path) {
    const signedLatest = await signRadarRow(supabase, latest);
    lastSignedUrl = signedLatest.ndviSignedUrl;
    lastNdmiSignedUrl = signedLatest.ndmiSignedUrl;
    lastNdreSignedUrl = signedLatest.ndreSignedUrl;
    lastRgbSignedUrl = signedLatest.rgbSignedUrl;
  }

  const polygon = proj.data?.location?.polygon;
  const ring = latLngPolygonToEeRing(polygon);
  if (!ring) {
    return jsonResponse(400, {
      error: 'no_polygon',
      message: 'El proyecto no tiene polígono en la nube. Guarda la ubicación y sincroniza.'
    });
  }

  const areaHa = radarCredits.getAreaHectaresFromLocation(proj.data?.location);
  const creditCost = radarCredits.getRadarCreditCostForArea(areaHa);
  const pricing = radarCredits.getRadarCreditPricingInfo(areaHa);
  const areaLimitErr = radarCredits.getRadarAreaLimitError(areaHa);
  if (areaLimitErr) {
    return jsonResponse(400, {
      ...areaLimitErr,
      credits: { used, limit, base: baseLimit, bonus, available: Math.max(0, limit - used) },
      pricing
    });
  }

  if (limit > 0 && used + creditCost > limit) {
    return jsonResponse(429, {
      error: 'radar_quota_exceeded',
      message:
        'No tienes créditos Radar suficientes este mes. Este predio requiere ' +
        creditCost +
        ' crédito' +
        (creditCost === 1 ? '' : 's') +
        (areaHa != null ? ' (' + areaHa.toFixed(2) + ' ha).' : '.'),
      credits: { used, limit, base: baseLimit, bonus, required: creditCost, available: Math.max(0, limit - used) },
      pricing
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
      pricing,
      latest: latestResponse(latest, lastSignedUrl, lastNdmiSignedUrl, lastNdreSignedUrl, lastRgbSignedUrl) || {
        signed_url: lastSignedUrl,
        ndmi_signed_url: lastNdmiSignedUrl,
        ndre_signed_url: lastNdreSignedUrl,
        rgb_signed_url: lastRgbSignedUrl,
        month_key: mk
      }
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
  let ndmiThumb;
  try {
    [thumb, ndmiThumb] = await Promise.all([
      ndviThumbUrl(ee, geometry, LOOKBACK_DAYS_FIRST),
      ndmiThumbUrl(ee, geometry, LOOKBACK_DAYS_FIRST)
    ]);
  } catch (e1) {
    try {
      [thumb, ndmiThumb] = await Promise.all([
        ndviThumbUrl(ee, geometry, LOOKBACK_DAYS_FALLBACK),
        ndmiThumbUrl(ee, geometry, LOOKBACK_DAYS_FALLBACK)
      ]);
    } catch (e2) {
      console.error('Radar thumb:', e2);
      return jsonResponse(502, {
        error: 'radar_render_failed',
        message: (e2 && e2.message) || 'No se pudo generar la miniatura Radar'
      });
    }
  }

  let buf;
  let ndmiBuf;
  try {
    const [res, ndmiRes] = await Promise.all([fetch(thumb.url), fetch(ndmiThumb.url)]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!ndmiRes.ok) throw new Error(`NDMI HTTP ${ndmiRes.status}`);
    const [ndviAb, ndmiAb] = await Promise.all([res.arrayBuffer(), ndmiRes.arrayBuffer()]);
    buf = Buffer.from(ndviAb);
    ndmiBuf = Buffer.from(ndmiAb);
  } catch (e) {
    console.error('fetch thumb:', e);
    return jsonResponse(502, { error: 'thumb_download_failed', message: e.message });
  }

  const ts = Date.now();
  const storagePath = `${userId}/${projectId}/${mk}_${ts}_ndvi.png`;
  const ndmiStoragePath = `${userId}/${projectId}/${mk}_${ts}_ndmi.png`;

  const [upNdvi, upNdmi] = await Promise.all([
    supabase.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: 'image/png',
      upsert: true
    }),
    supabase.storage.from(BUCKET).upload(ndmiStoragePath, ndmiBuf, {
      contentType: 'image/png',
      upsert: true
    })
  ]);
  if (upNdvi.error) {
    console.error('storage upload:', upNdvi.error);
    return jsonResponse(500, { error: 'storage_upload_failed', message: upNdvi.error.message });
  }
  if (upNdmi.error) {
    console.error('storage upload ndmi:', upNdmi.error);
    return jsonResponse(500, { error: 'storage_upload_failed', message: upNdmi.error.message });
  }

  const meta = {
    date_start: thumb.dateStart,
    date_end: thumb.dateEnd,
    source: 'COPERNICUS/S2_SR_HARMONIZED',
    location_snapshot: buildLocationSnapshot(proj.data?.location),
    area_hectares: areaHa,
    credits_charged: creditCost,
    ndvi_vis: { min: 0.10, max: 0.92, style: 'balanced_crisp' },
    ndmi_storage_path: ndmiStoragePath,
    ndmi_vis: { min: -0.25, max: 0.55, style: 'canopy_water_crisp' },
    images: {
      ndvi: { storage_path: storagePath, label: 'NDVI', description: 'Vigor relativo / actividad vegetativa' },
      ndmi: { storage_path: ndmiStoragePath, label: 'NDMI', description: 'Condición hídrica relativa del dosel' }
    }
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

  const [signed, ndmiSigned] = await Promise.all([
    signedUrlForPath(supabase, storagePath),
    signedUrlForPath(supabase, ndmiStoragePath)
  ]);
  const newUsed = used + creditCost;

  return jsonResponse(200, {
    ok: true,
    request: insRow,
    credits: { used: newUsed, limit, base: baseLimit, bonus, charged: creditCost, available: Math.max(0, limit - newUsed) },
    pricing,
    storage_path: storagePath,
    signed_url: signed,
    ndmi_storage_path: ndmiStoragePath,
    ndmi_signed_url: ndmiSigned,
    images: {
      ndvi: { storage_path: storagePath, signed_url: signed },
      ndmi: { storage_path: ndmiStoragePath, signed_url: ndmiSigned }
    },
    meta
  });
};
