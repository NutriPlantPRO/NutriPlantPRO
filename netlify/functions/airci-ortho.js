/**
 * AirCI — ortomosaico GeoTIFF: prepare upload, finalize, signed view, upsert site.
 *
 * POST /api/airci-ortho
 * Authorization: Bearer <supabase access_token> (admin)
 * Body: { action, ... }
 *
 *   prepare      → { site_id, flight_id, path, upload_url }
 *   finalize     → upsert airci_flights
 *   upsert_site  → upsert airci_sites + meta
 *   signed_url   → URL firmada de lectura
 *   list_flights → vuelos del site
 *   delete_site  → borra análisis + TIFF Storage + copas
 *   delete_agricola → borra todos los análisis de un agrícola
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const BUCKET = 'airci-orthos';
const MAX_BYTES = 524288000; // 500 MB

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

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || '')
  );
}

function newUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return (
    h.slice(0, 8) +
    '-' +
    h.slice(8, 12) +
    '-' +
    h.slice(12, 16) +
    '-' +
    h.slice(16, 20) +
    '-' +
    h.slice(20)
  );
}

function safeFilename(name) {
  return String(name || 'ortho.tif')
    .replace(/[^\w.\-()+ ]+/g, '_')
    .slice(0, 180);
}

async function verifyAdmin(supabase, accessToken) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Sesión inválida. Entra de nuevo desde el login.' };
  }
  const userId = userData.user.id;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();
  if (profErr || !prof?.is_admin) {
    return { ok: false, status: 403, error: 'Solo administrador puede usar AirCI en la nube.' };
  }
  return { ok: true, userId, email: prof.email || userData.user.email || '' };
}

function getServiceSupabase() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método no permitido' });
  }

  const authHeader =
    (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json(401, { ok: false, error: 'Falta Authorization Bearer (sesión Supabase).' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return json(500, { ok: false, error: 'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'JSON inválido' });
  }

  const auth = await verifyAdmin(supabase, token);
  if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

  const action = String(body.action || '').toLowerCase();

  if (action === 'upsert_site') {
    const siteId = isUuid(body.site_id) ? body.site_id : newUuid();
    const row = {
      id: siteId,
      owner_id: auth.userId,
      title: String(body.title || '').slice(0, 300),
      agricola: String(body.agricola || '').slice(0, 200),
      predio: String(body.predio || '').slice(0, 200),
      cultivo: String(body.cultivo || '').slice(0, 120),
      variedad: String(body.variedad || '').slice(0, 120),
      edad: String(body.edad || '').slice(0, 80),
      nota: String(body.nota || '').slice(0, 4000),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('airci_sites')
      .upsert(row, { onConflict: 'id' })
      .select('id')
      .single();
    if (error) {
      return json(500, {
        ok: false,
        error: error.message,
        setup: /airci_sites|does not exist|schema cache/i.test(error.message || '')
          ? 'supabase-airci.sql'
          : null
      });
    }
    return json(200, { ok: true, site_id: data.id });
  }

  if (action === 'prepare') {
    const siteId = isUuid(body.site_id) ? body.site_id : newUuid();
    const flightId = isUuid(body.flight_id) ? body.flight_id : newUuid();
    const filename = safeFilename(body.filename || 'ortho.tif');
    const byteSize = body.byte_size != null ? Number(body.byte_size) : null;
    if (byteSize != null && (!Number.isFinite(byteSize) || byteSize <= 0)) {
      return json(400, { ok: false, error: 'byte_size inválido' });
    }
    if (byteSize != null && byteSize > MAX_BYTES) {
      return json(400, { ok: false, error: 'El TIFF supera el límite de 500 MB.' });
    }

    // Asegurar site
    const siteRow = {
      id: siteId,
      owner_id: auth.userId,
      title: String(body.title || '').slice(0, 300),
      agricola: String(body.agricola || '').slice(0, 200),
      predio: String(body.predio || '').slice(0, 200),
      cultivo: String(body.cultivo || '').slice(0, 120),
      variedad: String(body.variedad || '').slice(0, 120),
      edad: String(body.edad || '').slice(0, 80),
      nota: String(body.nota || '').slice(0, 4000),
      updated_at: new Date().toISOString()
    };
    const siteRes = await supabase.from('airci_sites').upsert(siteRow, { onConflict: 'id' });
    if (siteRes.error) {
      return json(500, {
        ok: false,
        error: siteRes.error.message,
        setup: /airci_sites|does not exist|schema cache/i.test(siteRes.error.message || '')
          ? 'supabase-airci.sql'
          : null
      });
    }

    const ext = /\.tiff?$/i.test(filename) ? filename.match(/\.tiff?$/i)[0] : '.tif';
    const path = auth.userId + '/' + siteId + '/' + flightId + ext;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path, {
      upsert: true
    });
    if (error || !data?.signedUrl) {
      return json(500, {
        ok: false,
        error: (error && error.message) || 'No se pudo crear URL de subida',
        setup: /bucket|not found|airci-orthos/i.test((error && error.message) || '')
          ? 'supabase-airci.sql'
          : null
      });
    }

    return json(200, {
      ok: true,
      site_id: siteId,
      flight_id: flightId,
      path: path,
      filename: filename,
      upload_url: data.signedUrl,
      token: data.token || null,
      bucket: BUCKET
    });
  }

  if (action === 'finalize') {
    const siteId = body.site_id;
    const flightId = body.flight_id;
    const path = String(body.path || '').trim();
    if (!isUuid(siteId) || !isUuid(flightId) || !path) {
      return json(400, { ok: false, error: 'site_id, flight_id y path son obligatorios' });
    }
    if (path.indexOf(auth.userId + '/') !== 0) {
      return json(403, { ok: false, error: 'path no pertenece a este admin' });
    }

    const row = {
      id: flightId,
      site_id: siteId,
      owner_id: auth.userId,
      flight_date: body.flight_date || null,
      filename: safeFilename(body.filename || 'ortho.tif'),
      storage_path: path,
      content_type: String(body.content_type || 'image/tiff').slice(0, 80),
      byte_size: body.byte_size != null ? Number(body.byte_size) : null,
      width_px: body.width_px != null ? Number(body.width_px) : null,
      height_px: body.height_px != null ? Number(body.height_px) : null,
      bands: body.bands != null ? Number(body.bands) : null,
      crs: body.crs != null ? String(body.crs).slice(0, 120) : null,
      bbox_json: body.bbox_json || null,
      gsd_m: body.gsd_m != null ? Number(body.gsd_m) : null,
      status: 'ready'
    };

    const { data, error } = await supabase
      .from('airci_flights')
      .upsert(row, { onConflict: 'id' })
      .select('id, storage_path, filename, byte_size, width_px, height_px, bands, crs')
      .single();
    if (error) {
      return json(500, {
        ok: false,
        error: error.message,
        setup: /airci_flights|does not exist|schema cache/i.test(error.message || '')
          ? 'supabase-airci.sql'
          : null
      });
    }
    return json(200, { ok: true, flight: data });
  }

  if (action === 'signed_url') {
    const path = String(body.path || '').trim();
    if (!path) return json(400, { ok: false, error: 'path obligatorio' });
    if (path.indexOf(auth.userId + '/') !== 0) {
      return json(403, { ok: false, error: 'path no pertenece a este admin' });
    }
    const ttl = Math.min(Math.max(Number(body.ttl_sec) || 3600, 60), 86400);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttl);
    if (error || !data?.signedUrl) {
      return json(500, { ok: false, error: (error && error.message) || 'No se pudo firmar URL' });
    }
    return json(200, { ok: true, url: data.signedUrl, expires_in: ttl });
  }

  if (action === 'list_sites') {
    const { data, error } = await supabase
      .from('airci_sites')
      .select(
        'id, title, agricola, predio, cultivo, variedad, edad, nota, created_at, updated_at'
      )
      .eq('owner_id', auth.userId)
      .order('updated_at', { ascending: false });
    if (error) {
      return json(500, {
        ok: false,
        error: error.message,
        setup: /airci_sites|does not exist/i.test(error.message || '') ? 'supabase-airci.sql' : null
      });
    }
    return json(200, { ok: true, sites: data || [] });
  }

  if (action === 'save_canopy') {
    const siteId = body.site_id;
    if (!isUuid(siteId)) return json(400, { ok: false, error: 'site_id inválido' });
    const flightId = isUuid(body.flight_id) ? body.flight_id : null;
    const stats = body.stats && typeof body.stats === 'object' ? body.stats : {};
    const trees = Array.isArray(body.trees) ? body.trees : [];
    // Limitar tamaño: máximo ~2000 árboles en JSON
    const treesTrim = trees.slice(0, 2000).map(function (t) {
      return {
        id: t.id,
        stableId: t.stableId != null ? t.stableId : String(t.id),
        areaPx: t.areaPx,
        areaM2: t.areaM2 != null ? t.areaM2 : null,
        z: t.z,
        pctVsMean: t.pctVsMean,
        confidence: t.confidence != null ? t.confidence : null,
        sem: t.sem,
        matchStatus: t.matchStatus || null,
        deltaAreaPx: t.deltaAreaPx != null ? t.deltaAreaPx : null,
        deltaAreaM2: t.deltaAreaM2 != null ? t.deltaAreaM2 : null,
        deltaAreaPct: t.deltaAreaPct != null ? t.deltaAreaPct : null,
        prevAreaM2: t.prevAreaM2 != null ? t.prevAreaM2 : null,
        florPct: t.florPct != null ? t.florPct : null,
        brotePct: t.brotePct != null ? t.brotePct : null,
        vegPct: t.vegPct != null ? t.vegPct : null,
        otherPct: t.otherPct != null ? t.otherPct : null,
        atypicalPct: t.atypicalPct != null ? t.atypicalPct : null,
        phenoDominant: t.phenoDominant || null,
        phenoConfidence: t.phenoConfidence != null ? t.phenoConfidence : null,
        semPheno: t.semPheno || null,
        gliMedian: t.gliMedian != null ? t.gliMedian : null,
        colorScore: t.colorScore != null ? t.colorScore : null,
        semColor: t.semColor || null,
        row: t.row,
        pos: t.pos,
        latlngs: t.latlngs,
        center: t.center
      };
    });

    const row = {
      site_id: siteId,
      flight_id: flightId,
      owner_id: auth.userId,
      tree_count: Number(stats.count != null ? stats.count : treesTrim.length) || 0,
      cover_pct: stats.coverPct != null ? Number(stats.coverPct) : null,
      mean_area_px: stats.meanArea != null ? Number(stats.meanArea) : null,
      std_area_px: stats.stdArea != null ? Number(stats.stdArea) : null,
      threshold: stats.threshold != null ? Number(stats.threshold) : null,
      stats_json: stats,
      trees_json: treesTrim,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('airci_canopy_results')
      .upsert(row, { onConflict: 'site_id' })
      .select('id, site_id, flight_id, tree_count, cover_pct, updated_at')
      .single();

    if (error) {
      return json(500, {
        ok: false,
        error: error.message,
        setup: /airci_canopy_results|does not exist|schema cache/i.test(error.message || '')
          ? 'supabase-airci-canopy-results.sql'
          : null
      });
    }
    return json(200, { ok: true, result: data });
  }

  if (action === 'load_canopy') {
    const siteId = body.site_id;
    if (!isUuid(siteId)) return json(400, { ok: false, error: 'site_id inválido' });
    const { data, error } = await supabase
      .from('airci_canopy_results')
      .select(
        'id, site_id, flight_id, tree_count, cover_pct, mean_area_px, std_area_px, threshold, stats_json, trees_json, updated_at'
      )
      .eq('site_id', siteId)
      .eq('owner_id', auth.userId)
      .maybeSingle();
    if (error) {
      return json(500, {
        ok: false,
        error: error.message,
        setup: /airci_canopy_results|does not exist/i.test(error.message || '')
          ? 'supabase-airci-canopy-results.sql'
          : null
      });
    }
    if (!data) return json(200, { ok: true, result: null });
    return json(200, {
      ok: true,
      result: {
        id: data.id,
        site_id: data.site_id,
        flight_id: data.flight_id,
        stats: Object.assign({}, data.stats_json || {}, {
          count: data.tree_count,
          coverPct: data.cover_pct,
          meanArea: data.mean_area_px,
          stdArea: data.std_area_px,
          threshold: data.threshold
        }),
        trees: data.trees_json || [],
        updated_at: data.updated_at
      }
    });
  }

  if (action === 'list_flights') {
    const siteId = body.site_id;
    if (!isUuid(siteId)) return json(400, { ok: false, error: 'site_id inválido' });
    const { data, error } = await supabase
      .from('airci_flights')
      .select(
        'id, site_id, filename, storage_path, byte_size, width_px, height_px, bands, crs, flight_date, created_at, status'
      )
      .eq('site_id', siteId)
      .eq('owner_id', auth.userId)
      .order('created_at', { ascending: false });
    if (error) {
      return json(500, {
        ok: false,
        error: error.message,
        setup: /airci_flights|does not exist/i.test(error.message || '') ? 'supabase-airci.sql' : null
      });
    }
    return json(200, { ok: true, flights: data || [] });
  }

  async function removeStorageForSite(ownerId, siteId, flightRows) {
    const paths = [];
    (flightRows || []).forEach(function (f) {
      if (f && f.storage_path) paths.push(f.storage_path);
    });
    const folder = ownerId + '/' + siteId;
    try {
      const { data: listed } = await supabase.storage.from(BUCKET).list(folder, { limit: 200 });
      (listed || []).forEach(function (obj) {
        if (obj && obj.name) {
          const p = folder + '/' + obj.name;
          if (paths.indexOf(p) < 0) paths.push(p);
        }
      });
    } catch (e) {}
    if (!paths.length) return { removed: 0 };
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) return { removed: 0, warning: error.message };
    return { removed: paths.length };
  }

  async function deleteOneSite(siteId) {
    if (!isUuid(siteId)) return { ok: false, error: 'site_id inválido' };

    const { data: site, error: siteErr } = await supabase
      .from('airci_sites')
      .select('id, title, agricola')
      .eq('id', siteId)
      .eq('owner_id', auth.userId)
      .maybeSingle();
    if (siteErr) {
      return {
        ok: false,
        error: siteErr.message,
        setup: /airci_sites|does not exist/i.test(siteErr.message || '') ? 'supabase-airci.sql' : null
      };
    }
    if (!site) return { ok: false, error: 'Análisis no encontrado en la nube', missing: true };

    const { data: flights } = await supabase
      .from('airci_flights')
      .select('id, storage_path')
      .eq('site_id', siteId)
      .eq('owner_id', auth.userId);

    const storage = await removeStorageForSite(auth.userId, siteId, flights || []);

    // canopy + flights caen por CASCADE al borrar site
    const { error: delErr } = await supabase
      .from('airci_sites')
      .delete()
      .eq('id', siteId)
      .eq('owner_id', auth.userId);
    if (delErr) {
      return { ok: false, error: delErr.message, storage: storage };
    }
    return {
      ok: true,
      site_id: siteId,
      title: site.title || '',
      agricola: site.agricola || '',
      flights_removed: (flights || []).length,
      files_removed: storage.removed || 0,
      warning: storage.warning || null
    };
  }

  if (action === 'delete_site') {
    const siteId = body.site_id;
    const result = await deleteOneSite(siteId);
    if (!result.ok) {
      return json(result.missing ? 404 : 500, result);
    }
    return json(200, result);
  }

  if (action === 'delete_agricola') {
    const label = String(body.agricola != null ? body.agricola : '').trim();
    const isEmptyLabel = !label || label === 'Sin agrícola';

    const { data: allSites, error: listErr } = await supabase
      .from('airci_sites')
      .select('id, title, agricola')
      .eq('owner_id', auth.userId);
    if (listErr) {
      return json(500, {
        ok: false,
        error: listErr.message,
        setup: /airci_sites|does not exist/i.test(listErr.message || '') ? 'supabase-airci.sql' : null
      });
    }

    const match = (allSites || []).filter(function (s) {
      const ag = String(s.agricola || '').trim();
      if (isEmptyLabel) return !ag;
      return ag === label;
    });

    if (!match.length) {
      return json(200, {
        ok: true,
        agricola: isEmptyLabel ? 'Sin agrícola' : label,
        deleted: [],
        count: 0,
        note: 'No había análisis de este agrícola en la nube'
      });
    }

    const deleted = [];
    const errors = [];
    for (let i = 0; i < match.length; i++) {
      const r = await deleteOneSite(match[i].id);
      if (r.ok) deleted.push(r.site_id);
      else errors.push({ site_id: match[i].id, error: r.error });
    }

    return json(200, {
      ok: errors.length === 0,
      agricola: isEmptyLabel ? 'Sin agrícola' : label,
      deleted: deleted,
      count: deleted.length,
      errors: errors.length ? errors : undefined
    });
  }

  function normCropKey(raw) {
    const s = String(raw || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return s || 'generico';
  }

  function isPlainObject(v) {
    return v != null && typeof v === 'object' && !Array.isArray(v);
  }

  /** Guarda criterio del predio + enriquece perfil del cultivo */
  if (action === 'save_detect_profile') {
    const siteId = body.site_id;
    if (!isUuid(siteId)) return json(400, { ok: false, error: 'site_id inválido' });

    const cultivoLabel = String(body.cultivo || body.crop_label || '').trim().slice(0, 120);
    const cropKey = normCropKey(body.crop_key || cultivoLabel || 'generico');
    const cropLabel = cultivoLabel || cropKey;
    const detectParams = isPlainObject(body.detect_params) ? body.detect_params : {};
    const criteria = isPlainObject(body.criteria) ? body.criteria : {};
    const source = String(body.source || 'ai_calib').slice(0, 40);
    const cropHint = String(body.crop_hint || detectParams.crop_hint || '').slice(0, 120);
    const notes = String(body.notes || '').slice(0, 2000);
    const flightId = isUuid(body.flight_id) ? body.flight_id : null;

    // 1) Upsert perfil de cultivo (memoria compartida)
    let cropProfileId = null;
    const { data: cropRow, error: cropErr } = await supabase
      .from('airci_crop_profiles')
      .upsert(
        {
          owner_id: auth.userId,
          crop_key: cropKey,
          crop_label: cropLabel,
          criteria_json: criteria,
          detect_params_json: detectParams,
          notes: notes,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'owner_id,crop_key' }
      )
      .select('id, times_used')
      .maybeSingle();

    if (cropErr) {
      return json(500, {
        ok: false,
        error: cropErr.message,
        setup: /airci_crop_profiles|does not exist|schema cache/i.test(cropErr.message || '')
          ? 'supabase-airci-detect-profiles.sql'
          : null
      });
    }
    if (cropRow && cropRow.id) {
      cropProfileId = cropRow.id;
      await supabase
        .from('airci_crop_profiles')
        .update({ times_used: (Number(cropRow.times_used) || 0) + 1 })
        .eq('id', cropProfileId);
    }

    // 2) Upsert criterio del predio (manda)
    const siteRow = {
      site_id: siteId,
      owner_id: auth.userId,
      crop_profile_id: cropProfileId,
      detect_params_json: detectParams,
      criteria_json: criteria,
      source: source,
      last_flight_id: flightId,
      crop_hint: cropHint,
      notes: notes,
      updated_at: new Date().toISOString()
    };

    const { data: siteProf, error: siteErr } = await supabase
      .from('airci_site_detect_profiles')
      .upsert(siteRow, { onConflict: 'site_id' })
      .select('id, site_id, crop_profile_id, source, crop_hint, updated_at')
      .single();

    if (siteErr) {
      return json(500, {
        ok: false,
        error: siteErr.message,
        setup: /airci_site_detect_profiles|does not exist|schema cache/i.test(siteErr.message || '')
          ? 'supabase-airci-detect-profiles.sql'
          : null
      });
    }

    return json(200, {
      ok: true,
      site_profile: siteProf,
      crop_key: cropKey,
      crop_profile_id: cropProfileId
    });
  }

  /** Carga criterio: predio > cultivo > null */
  if (action === 'load_detect_profile') {
    const siteId = body.site_id;
    if (!isUuid(siteId)) return json(400, { ok: false, error: 'site_id inválido' });

    const { data: siteProf, error: siteErr } = await supabase
      .from('airci_site_detect_profiles')
      .select(
        'id, site_id, crop_profile_id, detect_params_json, criteria_json, source, crop_hint, notes, updated_at'
      )
      .eq('site_id', siteId)
      .eq('owner_id', auth.userId)
      .maybeSingle();

    if (siteErr) {
      return json(500, {
        ok: false,
        error: siteErr.message,
        setup: /airci_site_detect_profiles|does not exist/i.test(siteErr.message || '')
          ? 'supabase-airci-detect-profiles.sql'
          : null
      });
    }

    if (siteProf && siteProf.detect_params_json && Object.keys(siteProf.detect_params_json).length) {
      return json(200, {
        ok: true,
        level: 'site',
        profile: {
          detect_params: siteProf.detect_params_json,
          criteria: siteProf.criteria_json || {},
          source: siteProf.source,
          crop_hint: siteProf.crop_hint || '',
          notes: siteProf.notes || '',
          updated_at: siteProf.updated_at,
          crop_profile_id: siteProf.crop_profile_id
        }
      });
    }

    // Fallback: perfil del cultivo declarado en el site
    const { data: siteMeta } = await supabase
      .from('airci_sites')
      .select('cultivo')
      .eq('id', siteId)
      .eq('owner_id', auth.userId)
      .maybeSingle();

    const cropKey = normCropKey((siteMeta && siteMeta.cultivo) || body.cultivo || '');
    if (cropKey && cropKey !== 'generico') {
      const { data: cropProf, error: cropErr } = await supabase
        .from('airci_crop_profiles')
        .select(
          'id, crop_key, crop_label, detect_params_json, criteria_json, notes, times_used, updated_at'
        )
        .eq('owner_id', auth.userId)
        .eq('crop_key', cropKey)
        .maybeSingle();

      if (cropErr) {
        return json(500, {
          ok: false,
          error: cropErr.message,
          setup: /airci_crop_profiles|does not exist/i.test(cropErr.message || '')
            ? 'supabase-airci-detect-profiles.sql'
            : null
        });
      }

      if (cropProf && cropProf.detect_params_json && Object.keys(cropProf.detect_params_json).length) {
        return json(200, {
          ok: true,
          level: 'crop',
          profile: {
            detect_params: cropProf.detect_params_json,
            criteria: cropProf.criteria_json || {},
            source: 'crop_default',
            crop_hint: cropProf.crop_label || cropProf.crop_key,
            notes: cropProf.notes || '',
            updated_at: cropProf.updated_at,
            crop_key: cropProf.crop_key,
            crop_profile_id: cropProf.id,
            times_used: cropProf.times_used
          }
        });
      }
    }

    return json(200, { ok: true, level: null, profile: null });
  }

  if (action === 'list_crop_profiles') {
    const { data, error } = await supabase
      .from('airci_crop_profiles')
      .select(
        'id, crop_key, crop_label, criteria_json, detect_params_json, notes, times_used, updated_at'
      )
      .eq('owner_id', auth.userId)
      .order('crop_label', { ascending: true });

    if (error) {
      return json(500, {
        ok: false,
        error: error.message,
        setup: /airci_crop_profiles|does not exist/i.test(error.message || '')
          ? 'supabase-airci-detect-profiles.sql'
          : null
      });
    }
    return json(200, { ok: true, crops: data || [] });
  }

  return json(400, {
    ok: false,
    error:
      'action inválida (prepare | finalize | upsert_site | signed_url | list_sites | list_flights | save_canopy | load_canopy | save_detect_profile | load_detect_profile | list_crop_profiles | delete_site | delete_agricola)'
  });
};
