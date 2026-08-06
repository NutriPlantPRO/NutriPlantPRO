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

  return json(400, {
    ok: false,
    error: 'action inválida (prepare | finalize | upsert_site | signed_url | list_flights)'
  });
};
