const { findSentinel2SceneSclById } = require('./lib/radar-pilot-stac');
const { renderRegionalSclCloudMaskPng } = require('./lib/radar-pilot-render');

const BUCKET = 'radar-ndvi';
const CACHE_FOLDER = '_admin-cloud-context';
const CACHE_TTL_MS = 5 * 24 * 60 * 60 * 1000;
const RADIUS_KM = 5;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Radar-Admin-Secret',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function isAdminAuthorized(event, body) {
  const headers = event.headers || {};
  const configuredSecret = String(process.env.RADAR_ADMIN_SECRET || '').trim();
  const suppliedSecret = String(
    headers['x-radar-admin-secret'] || headers['X-Radar-Admin-Secret'] || ''
  ).trim();
  if (configuredSecret && suppliedSecret === configuredSecret) return true;
  const expectedKey = String(
    process.env.NUTRIPLANT_ADMIN_KEY || 'np_admin_key_8f4a2b9c1e7d'
  ).trim();
  return !!(expectedKey && String(body?.admin_key || '').trim() === expectedKey);
}

async function getSupabaseAdmin() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

function regionalBounds(center, radiusKm) {
  const lat = Number(center?.lat);
  const lng = Number(center?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const latDelta = radiusKm / 111.32;
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.1);
  const lngDelta = radiusKm / (111.32 * cosLat);
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

function safeFilePart(value) {
  return String(value || 'scene')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .slice(0, 110);
}

async function cachedObject(supabase, fileName) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(CACHE_FOLDER, { limit: 20, search: fileName });
  if (error) throw new Error(error.message);
  const item = (data || []).find((entry) => entry.name === fileName);
  if (!item) return null;
  const createdAt = Date.parse(item.created_at || item.updated_at || '');
  return {
    path: CACHE_FOLDER + '/' + fileName,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0
  };
}

async function signedUrl(supabase, path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'No se pudo firmar la imagen regional');
  }
  return data.signedUrl;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, { ok: true });
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Método no permitido' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { ok: false, message: 'JSON inválido' });
  }
  if (!isAdminAuthorized(event, body)) {
    return jsonResponse(403, { ok: false, message: 'Acceso admin denegado' });
  }

  const projectId = String(body.project_id || '').trim();
  const requestId = String(body.request_id || '').trim();
  if (!projectId) {
    return jsonResponse(400, { ok: false, message: 'project_id es obligatorio' });
  }

  try {
    const supabase = await getSupabaseAdmin();
    if (!supabase) throw new Error('Falta configuración Supabase');

    let query = supabase
      .from('radar_requests')
      .select('id, created_at, meta')
      .eq('project_id', projectId)
      .not('image_storage_path', 'is', null);
    query = requestId
      ? query.eq('id', requestId).limit(1)
      : query.order('created_at', { ascending: false }).limit(1);
    const { data: rows, error: rowError } = await query;
    if (rowError) throw new Error(rowError.message);
    const row = rows?.[0];
    if (!row) {
      return jsonResponse(404, {
        ok: false,
        message: 'Este predio todavía no tiene una imagen Sentinel guardada.'
      });
    }

    const meta = row.meta || {};
    const location = meta.location_snapshot || {};
    const polygon = Array.isArray(location.polygon) ? location.polygon : [];
    const bounds = regionalBounds(location.center, RADIUS_KM);
    if (polygon.length < 3 || !bounds) {
      return jsonResponse(422, {
        ok: false,
        message: 'La generación no tiene ubicación suficiente para la vista regional.'
      });
    }

    const footprints = Array.isArray(meta.scene_footprints) ? meta.scene_footprints : [];
    const footprint = footprints[0] || {};
    const sceneDate = String(
      footprint.datetime ||
        (Array.isArray(meta.scene_dates) ? meta.scene_dates[0] : '') ||
        meta.date_end ||
        meta.date_start ||
        ''
    ).slice(0, 10);
    if (!sceneDate) {
      return jsonResponse(422, {
        ok: false,
        message: 'La generación histórica no conserva la fecha de escena Sentinel.'
      });
    }

    const sceneKey = footprint.id || sceneDate;
    const fileName =
      safeFilePart(projectId) + '__' + safeFilePart(sceneKey) + '__r' + RADIUS_KM + 'km.png';
    const existing = await cachedObject(supabase, fileName);
    if (existing && Date.now() - existing.createdAt < CACHE_TTL_MS) {
      return jsonResponse(200, {
        ok: true,
        reused: true,
        request_id: row.id,
        scene_id: footprint.id || null,
        scene_date: sceneDate,
        radius_km: RADIUS_KM,
        bounds: {
          west: bounds[0],
          south: bounds[1],
          east: bounds[2],
          north: bounds[3]
        },
        signed_url: await signedUrl(supabase, existing.path),
        expires_at: new Date(existing.createdAt + CACHE_TTL_MS).toISOString()
      });
    }
    if (existing) {
      await supabase.storage.from(BUCKET).remove([existing.path]);
    }

    const scene = await findSentinel2SceneSclById(polygon, {
      itemId: footprint.id || null,
      date: sceneDate,
      provider: meta.provider || undefined
    });
    const rendered = await renderRegionalSclCloudMaskPng(scene, bounds, { maxDim: 768 });
    const storagePath = CACHE_FOLDER + '/' + fileName;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, rendered.png, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });
    if (uploadError) throw new Error(uploadError.message);
    const createdAt = Date.now();

    return jsonResponse(200, {
      ok: true,
      reused: false,
      request_id: row.id,
      scene_id: scene.itemId,
      scene_date: sceneDate,
      radius_km: RADIUS_KM,
      bounds: {
        west: bounds[0],
        south: bounds[1],
        east: bounds[2],
        north: bounds[3]
      },
      stats: rendered.stats,
      signed_url: await signedUrl(supabase, storagePath),
      expires_at: new Date(createdAt + CACHE_TTL_MS).toISOString()
    });
  } catch (error) {
    console.error('radar-cloud-context:', error);
    return jsonResponse(500, {
      ok: false,
      message: error?.message || 'No se pudo generar la nubosidad regional'
    });
  }
};
