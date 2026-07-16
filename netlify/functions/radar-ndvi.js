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
 *   action: "status" | "generate" | "admin_status"
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

async function getRadarHistoryRows(supabase, userId, projectId, limit) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('getRadarHistoryRows:', error.message);
    return [];
  }
  return data || [];
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
  return {
    id: row.id,
    created_at: row.created_at,
    month_key: row.month_key,
    sentinel_period: {
      from: meta.date_start || null,
      to: meta.date_end || null
    },
    has_ndmi: !!ndmiPath,
    has_location_snapshot: !!(loc && Array.isArray(loc.polygon) && loc.polygon.length >= 3),
    location_center: loc && loc.center ? loc.center : null,
    area_hectares: loc && loc.area_hectares != null ? loc.area_hectares : null
  };
}

async function signRadarRow(supabase, row) {
  if (!row?.image_storage_path) return { ndvi: null, ndmi: null };
  const meta = row.meta || {};
  const ndmiPath = meta.ndmi_storage_path || meta.images?.ndmi?.storage_path || null;
  const [ndviSignedUrl, ndmiSignedUrl] = await Promise.all([
    signedUrlForPath(supabase, row.image_storage_path),
    signedUrlForPath(supabase, ndmiPath)
  ]);
  return { ndviSignedUrl, ndmiSignedUrl };
}

async function signedUrlForPath(supabase, path, ttlSec = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
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

function latestResponse(latest, ndviSignedUrl, ndmiSignedUrl) {
  if (!latest) return null;
  const meta = latest.meta || {};
  const ndmiPath = meta.ndmi_storage_path || meta.images?.ndmi?.storage_path || null;
  return {
    id: latest.id,
    created_at: latest.created_at,
    month_key: latest.month_key,
    image_storage_path: latest.image_storage_path,
    ndmi_storage_path: ndmiPath,
    meta,
    signed_url: ndviSignedUrl,
    ndmi_signed_url: ndmiSignedUrl,
    images: {
      ndvi: {
        storage_path: latest.image_storage_path,
        signed_url: ndviSignedUrl
      },
      ndmi: {
        storage_path: ndmiPath,
        signed_url: ndmiSignedUrl
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
    if (viewRowAdm?.image_storage_path) {
      const signed = await signRadarRow(supabase, viewRowAdm);
      sigNdvi = signed.ndviSignedUrl;
      sigNdmi = signed.ndmiSignedUrl;
    }

    return jsonResponse(200, {
      ok: true,
      admin: true,
      project_id: projectIdAdm,
      owner_user_id: ownerUserId,
      latest: latestResponse(viewRowAdm, sigNdvi, sigNdmi),
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
      if (row.image_storage_path) {
        const signed = await signRadarRow(supabase, row);
        signedUrl = signed.ndviSignedUrl;
        ndmiSignedUrl = signed.ndmiSignedUrl;
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
        ndvi_mean: meta.ndvi_mean != null ? meta.ndvi_mean : null,
        ndmi_mean: meta.ndmi_mean != null ? meta.ndmi_mean : null,
        valid_pct: meta.valid_pct != null ? meta.valid_pct : null,
        avg_cloud_cover: meta.avg_cloud_cover != null ? meta.avg_cloud_cover : null,
        lookback_expanded: !!meta.lookback_expanded,
        error_message: status === 'error' ? (meta.error_message || 'Error') : null,
        signed_url: signedUrl,
        ndmi_signed_url: ndmiSignedUrl
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
    if (latest?.image_storage_path) {
      const signed = await signRadarRow(supabase, latest);
      lastSignedUrl = signed.ndviSignedUrl;
      lastNdmiSignedUrl = signed.ndmiSignedUrl;
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
      latest: latestResponse(latest, lastSignedUrl, lastNdmiSignedUrl),
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
      snapshot: latestResponse(row, signed.ndviSignedUrl, signed.ndmiSignedUrl)
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
      if (row.image_storage_path) {
        const signed = await signRadarRow(supabase, row);
        signedUrl = signed.ndviSignedUrl;
        ndmiSignedUrl = signed.ndmiSignedUrl;
      }
      const lowCoverage = /radar_low_coverage|cobertura satelital útil|píxeles válidos|No hay escenas/i.test(
        String(meta.error_message || '')
      );
      items.push({
        id,
        status,
        created_at: row.created_at,
        period_index: meta.period_index != null ? meta.period_index : null,
        period_label: meta.period_label || null,
        frequency: meta.frequency || null,
        date_start: meta.period_date_start || meta.date_start || null,
        date_end: meta.period_date_end || meta.date_end || null,
        scene_dates: meta.scene_dates || null,
        ndvi_mean: meta.ndvi_mean != null ? meta.ndvi_mean : null,
        ndmi_mean: meta.ndmi_mean != null ? meta.ndmi_mean : null,
        valid_pct: meta.valid_pct != null ? meta.valid_pct : null,
        avg_cloud_cover: meta.avg_cloud_cover != null ? meta.avg_cloud_cover : null,
        scene_count: meta.scene_count != null ? meta.scene_count : null,
        lookback_expanded: !!meta.lookback_expanded,
        error_message: status === 'error' ? (meta.error_message || 'Error') : null,
        error_code: status === 'error' && lowCoverage ? 'radar_low_coverage' : null,
        signed_url: signedUrl,
        ndmi_signed_url: ndmiSignedUrl
      });
    }
    return jsonResponse(200, { ok: true, items });
  }

  if (action !== 'generate') {
    return jsonResponse(400, { error: 'action debe ser status, view, generate o lectura_status' });
  }

  let lastSignedUrl = null;
  let lastNdmiSignedUrl = null;
  if (latest?.image_storage_path) {
    const signedLatest = await signRadarRow(supabase, latest);
    lastSignedUrl = signedLatest.ndviSignedUrl;
    lastNdmiSignedUrl = signedLatest.ndmiSignedUrl;
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
      latest: latestResponse(latest, lastSignedUrl, lastNdmiSignedUrl) || { signed_url: lastSignedUrl, ndmi_signed_url: lastNdmiSignedUrl, month_key: mk }
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
