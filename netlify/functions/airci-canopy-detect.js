/**
 * AirCI Professional — encola análisis completo y consulta progreso/resultados.
 *
 * POST /api/airci-canopy-detect
 * Authorization: Bearer <Supabase access token>
 *
 * actions:
 *   enqueue { site_id, flight_id, options? }
 *   status  { job_id? | flight_id? }
 *   trees   { result_id, bbox?: [west,south,east,north], limit?, offset? }
 *   calibration_save/load { site_id, flight_id, calibration }
 *   tree_edit { result_id, operation, tree_index?, tree? }
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

const ACTIVE = ['queued', 'processing'];
const MAX_TREE_PAGE = 1000;
const JOB_STALE_MS = 20 * 60 * 1000;

function headers() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: headers(), body: JSON.stringify(body) };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function getSupabase() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function verifyAdmin(supabase, token) {
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData && userData.user;
  if (userError || !user || !user.id) {
    return { ok: false, status: 401, error: 'Sesión inválida. Entra de nuevo.' };
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile || !profile.is_admin) {
    return { ok: false, status: 403, error: 'Solo admin puede ejecutar AirCI Professional.' };
  }
  return { ok: true, userId: user.id };
}

function setupFor(error) {
  const msg = String((error && error.message) || error || '');
  return /airci_detect_jobs|airci_canopy_trees|airci_canopy_calibrations|schema cache|does not exist/i.test(msg)
    ? 'supabase-airci-professional.sql'
    : null;
}

function finite(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePolygon(value) {
  if (!Array.isArray(value) || value.length < 3 || value.length > 80) return null;
  const ring = value.map((point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const lat = finite(point[0]);
    const lng = finite(point[1]);
    return lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180 ? null : [lat, lng];
  });
  return ring.every(Boolean) ? ring : null;
}

function normalizeCalibration(value) {
  if (!value || typeof value !== 'object') return null;
  const rawSamples = Array.isArray(value.samples) ? value.samples : [];
  if (rawSamples.length !== 10) return null;
  const samples = rawSamples.map((sample, index) => {
    const polygon_json = normalizePolygon(sample && sample.polygon_json);
    const center_lat = finite(sample && sample.center_lat);
    const center_lng = finite(sample && sample.center_lng);
    if (!polygon_json || center_lat == null || center_lng == null) return null;
    const diameter = finite(sample && sample.diameter_m);
    const area = finite(sample && sample.area_m2);
    return {
      sample_index: index + 1,
      center_lat,
      center_lng,
      polygon_json,
      diameter_m: diameter != null && diameter > 0 ? diameter : null,
      area_m2: area != null && area > 0 ? area : null
    };
  });
  if (!samples.every(Boolean)) return null;
  return {
    version: 1,
    samples,
    profile: value.profile && typeof value.profile === 'object' ? value.profile : {}
  };
}

function publicJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    site_id: row.site_id,
    flight_id: row.flight_id,
    status: row.status,
    progress: Number(row.progress) || 0,
    phase: row.phase || '',
    detector_mode: row.detector_mode,
    detector_version: row.detector_version || null,
    estimated_usd: Number(row.estimated_usd) || 0,
    actual_usd: row.actual_usd != null ? Number(row.actual_usd) : null,
    result_id: row.result_id || null,
    stats: row.stats_json || {},
    error: row.error_message || null,
    created_at: row.created_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    updated_at: row.updated_at
  };
}

function isStaleJob(row) {
  if (!row || ACTIVE.indexOf(row.status) < 0) return false;
  const timestamp = Date.parse(row.updated_at || row.created_at || '');
  return Number.isFinite(timestamp) && Date.now() - timestamp > JOB_STALE_MS;
}

async function expireStaleJob(supabase, row) {
  if (!isStaleJob(row)) return row;
  const now = new Date().toISOString();
  await supabase
    .from('airci_detect_jobs')
    .update({
      status: 'error',
      phase: 'Tiempo agotado',
      error_message: 'El worker dejó de reportar progreso. Puedes iniciar un análisis nuevo.',
      finished_at: now,
      updated_at: now
    })
    .eq('id', row.id)
    .in('status', ACTIVE);
  await supabase
    .from('airci_canopy_results')
    .delete()
    .eq('job_id', row.id)
    .eq('is_current', false);
  return null;
}

function estimateUsd(flight) {
  const bytes = Math.max(0, Number(flight && flight.byte_size) || 0);
  // Presupuesto conservador CPU; el worker registra el valor real.
  return Math.min(1, Math.max(0.08, 0.08 + (bytes / (500 * 1024 * 1024)) * 0.22));
}

async function triggerBackground(jobId, accessToken) {
  const base = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '');
  if (!base) return { ok: false, error: 'Netlify no expuso URL/DEPLOY_PRIME_URL.' };
  try {
    const response = await fetch(
      base + '/.netlify/functions/airci-canopy-detect-background',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        body: JSON.stringify({ job_id: jobId })
      }
    );
    return response.status === 202 || response.ok
      ? { ok: true }
      : { ok: false, error: 'Background HTTP ' + response.status };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: headers(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método no permitido.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return json(500, { ok: false, error: 'Supabase no configurado en servidor.' });
  }
  const authorization =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { ok: false, error: 'Falta sesión Supabase.' });

  const auth = await verifyAdmin(supabase, token);
  if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, error: 'JSON inválido.' });
  }
  const action = String(body.action || '').toLowerCase();

  if (action === 'enqueue') {
    if (!isUuid(body.site_id) || !isUuid(body.flight_id)) {
      return json(400, { ok: false, error: 'site_id y flight_id son obligatorios.' });
    }
    const { data: flight, error: flightError } = await supabase
      .from('airci_flights')
      .select('id, site_id, owner_id, byte_size, width_px, height_px, gsd_m, status')
      .eq('id', body.flight_id)
      .eq('site_id', body.site_id)
      .eq('owner_id', auth.userId)
      .maybeSingle();
    if (flightError) return json(500, { ok: false, error: flightError.message });
    if (!flight) return json(404, { ok: false, error: 'Vuelo/GeoTIFF no encontrado.' });

    const { data: activeRow, error: activeError } = await supabase
      .from('airci_detect_jobs')
      .select('*')
      .eq('flight_id', flight.id)
      .eq('owner_id', auth.userId)
      .in('status', ACTIVE)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) {
      return json(500, {
        ok: false,
        error: activeError.message,
        setup: setupFor(activeError)
      });
    }
    const active = await expireStaleJob(supabase, activeRow);
    if (active) return json(200, { ok: true, reused: true, job: publicJob(active) });

    const options = body.options && typeof body.options === 'object' ? body.options : {};
    const calibration = normalizeCalibration(options.calibration);
    if (!calibration) {
      return json(400, {
        ok: false,
        error: 'Antes de analizar confirma los 10 árboles de calibración y sus perímetros.'
      });
    }
    const row = {
      site_id: flight.site_id,
      flight_id: flight.id,
      owner_id: auth.userId,
      status: 'queued',
      progress: 0,
      phase: 'En cola',
      detector_mode: String(options.detector_mode || 'classical_v1').slice(0, 60),
      options_json: {
        min_canopy_m: Math.max(0.3, Math.min(Number(options.min_canopy_m) || 1.0, 12)),
        max_canopy_m: Math.max(1, Math.min(Number(options.max_canopy_m) || 12, 40)),
        expected_spacing_m: Math.max(
          0,
          Math.min(Number(options.expected_spacing_m) || 0, 30)
        ),
        calibration,
        cost_cap_usd: Math.max(0.1, Math.min(Number(options.cost_cap_usd) || 1, 5))
      },
      estimated_usd: estimateUsd(flight)
    };
    const { data: job, error: insertError } = await supabase
      .from('airci_detect_jobs')
      .insert(row)
      .select('*')
      .single();
    if (insertError) {
      // Carrera: si otro enqueue ganó, devolver el activo.
      if (/duplicate|unique/i.test(insertError.message || '')) {
        const { data: raced } = await supabase
          .from('airci_detect_jobs')
          .select('*')
          .eq('flight_id', flight.id)
          .in('status', ACTIVE)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (raced) return json(200, { ok: true, reused: true, job: publicJob(raced) });
      }
      return json(500, {
        ok: false,
        error: insertError.message,
        setup: setupFor(insertError)
      });
    }

    const triggered = await triggerBackground(job.id, token);
    if (!triggered.ok) {
      await supabase
        .from('airci_detect_jobs')
        .update({
          status: 'error',
          phase: 'No se pudo iniciar',
          error_message: triggered.error,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      return json(502, {
        ok: false,
        error: 'Trabajo creado, pero no arrancó: ' + triggered.error,
        job: publicJob(job)
      });
    }
    return json(202, { ok: true, job: publicJob(job) });
  }

  if (action === 'status') {
    let query = supabase
      .from('airci_detect_jobs')
      .select('*')
      .eq('owner_id', auth.userId);
    if (isUuid(body.job_id)) query = query.eq('id', body.job_id);
    else if (isUuid(body.flight_id)) query = query.eq('flight_id', body.flight_id);
    else return json(400, { ok: false, error: 'job_id o flight_id obligatorio.' });
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return json(500, { ok: false, error: error.message, setup: setupFor(error) });
    }
    const current = await expireStaleJob(supabase, data);
    if (!current && data) {
      const expired = Object.assign({}, data, {
        status: 'error',
        phase: 'Tiempo agotado',
        error_message: 'El worker dejó de reportar progreso. Puedes iniciar un análisis nuevo.'
      });
      return json(200, { ok: true, job: publicJob(expired) });
    }
    return json(200, { ok: true, job: publicJob(current) });
  }

  if (action === 'calibration_save' || action === 'calibration_load') {
    if (!isUuid(body.site_id) || !isUuid(body.flight_id)) {
      return json(400, { ok: false, error: 'site_id y flight_id son obligatorios.' });
    }
    const { data: flight, error: flightError } = await supabase
      .from('airci_flights')
      .select('id, site_id, owner_id')
      .eq('id', body.flight_id)
      .eq('site_id', body.site_id)
      .eq('owner_id', auth.userId)
      .maybeSingle();
    if (flightError) return json(500, { ok: false, error: flightError.message, setup: setupFor(flightError) });
    if (!flight) return json(404, { ok: false, error: 'Vuelo/GeoTIFF no encontrado.' });

    if (action === 'calibration_load') {
      const { data, error } = await supabase
        .from('airci_canopy_calibrations')
        .select('calibration_json, updated_at')
        .eq('flight_id', flight.id)
        .eq('owner_id', auth.userId)
        .maybeSingle();
      if (error) return json(500, { ok: false, error: error.message, setup: setupFor(error) });
      return json(200, { ok: true, calibration: data ? data.calibration_json : null, updated_at: data && data.updated_at });
    }

    const calibration = normalizeCalibration(body.calibration);
    if (!calibration) {
      return json(400, { ok: false, error: 'La calibración debe contener exactamente 10 copas válidas.' });
    }
    const { data, error } = await supabase
      .from('airci_canopy_calibrations')
      .upsert(
        {
          site_id: flight.site_id,
          flight_id: flight.id,
          owner_id: auth.userId,
          calibration_json: calibration,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'flight_id' }
      )
      .select('calibration_json, updated_at')
      .single();
    if (error) return json(500, { ok: false, error: error.message, setup: setupFor(error) });
    return json(200, { ok: true, calibration: data.calibration_json, updated_at: data.updated_at });
  }

  if (action === 'tree_edit') {
    if (!isUuid(body.result_id)) return json(400, { ok: false, error: 'result_id obligatorio.' });
    const operation = String(body.operation || '').toLowerCase();
    const { data: result, error: resultError } = await supabase
      .from('airci_canopy_results')
      .select('id, site_id, flight_id')
      .eq('id', body.result_id)
      .eq('owner_id', auth.userId)
      .maybeSingle();
    if (resultError) return json(500, { ok: false, error: resultError.message });
    if (!result) return json(404, { ok: false, error: 'Resultado no encontrado.' });
    const tree = body.tree && typeof body.tree === 'object' ? body.tree : {};
    const polygon = normalizePolygon(tree.polygon_json);
    const centerLat = finite(tree.center_lat);
    const centerLng = finite(tree.center_lng);

    if (operation === 'delete') {
      const treeIndex = Math.max(1, Math.floor(Number(body.tree_index) || 0));
      const { error } = await supabase
        .from('airci_canopy_trees')
        .update({ is_deleted: true, metrics_json: { edit: 'deleted', edited_at: new Date().toISOString() } })
        .eq('result_id', result.id)
        .eq('tree_index', treeIndex)
        .eq('owner_id', auth.userId);
      if (error) return json(500, { ok: false, error: error.message, setup: setupFor(error) });
      return json(200, { ok: true });
    }
    if (!polygon || centerLat == null || centerLng == null) {
      return json(400, { ok: false, error: 'El perímetro y centro de la copa son obligatorios.' });
    }
    const patch = {
      polygon_json: polygon,
      center_lat: centerLat,
      center_lng: centerLng,
      area_px: finite(tree.area_px),
      area_m2: finite(tree.area_m2),
      diameter_m: finite(tree.diameter_m),
      is_deleted: false,
      metrics_json: { edit: operation, edited_at: new Date().toISOString() }
    };
    if (operation === 'update') {
      const treeIndex = Math.max(1, Math.floor(Number(body.tree_index) || 0));
      const { error } = await supabase
        .from('airci_canopy_trees')
        .update(patch)
        .eq('result_id', result.id)
        .eq('tree_index', treeIndex)
        .eq('owner_id', auth.userId);
      if (error) return json(500, { ok: false, error: error.message, setup: setupFor(error) });
      return json(200, { ok: true });
    }
    if (operation === 'add') {
      const { data: latest, error: latestError } = await supabase
        .from('airci_canopy_trees')
        .select('tree_index')
        .eq('result_id', result.id)
        .order('tree_index', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) return json(500, { ok: false, error: latestError.message });
      const { error } = await supabase.from('airci_canopy_trees').insert(
        Object.assign(patch, {
          result_id: result.id,
          site_id: result.site_id,
          flight_id: result.flight_id,
          owner_id: auth.userId,
          tree_index: (latest && Number(latest.tree_index) || 0) + 1,
          stable_id: 'manual-' + Date.now(),
          confidence: 100,
          sem_key: 'verde',
          is_manual: true
        })
      );
      if (error) return json(500, { ok: false, error: error.message, setup: setupFor(error) });
      return json(200, { ok: true });
    }
    return json(400, { ok: false, error: 'operation inválida: update | delete | add' });
  }

  if (action === 'trees') {
    if (!isUuid(body.result_id)) {
      return json(400, { ok: false, error: 'result_id obligatorio.' });
    }
    const { data: result, error: resultError } = await supabase
      .from('airci_canopy_results')
      .select('id, site_id, flight_id, tree_count, cover_pct, stats_json, detector_version')
      .eq('id', body.result_id)
      .eq('owner_id', auth.userId)
      .maybeSingle();
    if (resultError) return json(500, { ok: false, error: resultError.message });
    if (!result) return json(404, { ok: false, error: 'Resultado no encontrado.' });

    const limit = Math.min(Math.max(Number(body.limit) || 1000, 1), MAX_TREE_PAGE);
    const offset = Math.max(Number(body.offset) || 0, 0);
    const semKey = String(body.sem_key || '').trim().toLowerCase();
    const allowedSem = new Set(['rojo', 'amarillo', 'verde', 'azul']);
    const applyTreeFilters = (query) => {
      let next = query.eq('result_id', result.id).eq('owner_id', auth.userId).neq('is_deleted', true);
      if (allowedSem.has(semKey)) next = next.eq('sem_key', semKey);
      const bbox = Array.isArray(body.bbox) ? body.bbox.map(Number) : null;
      if (bbox && bbox.length === 4 && bbox.every(Number.isFinite)) {
        const west = Math.min(bbox[0], bbox[2]);
        const east = Math.max(bbox[0], bbox[2]);
        const south = Math.min(bbox[1], bbox[3]);
        const north = Math.max(bbox[1], bbox[3]);
        next = next
          .gte('center_lng', west)
          .lte('center_lng', east)
          .gte('center_lat', south)
          .lte('center_lat', north);
      }
      return next;
    };

    const { count: totalCount, error: countError } = await applyTreeFilters(
      supabase.from('airci_canopy_trees').select('id', { count: 'exact', head: true })
    );
    if (countError) {
      return json(500, { ok: false, error: countError.message, setup: setupFor(countError) });
    }

    const { data: trees, error } = await applyTreeFilters(
      supabase
        .from('airci_canopy_trees')
        .select(
          'id, tree_index, stable_id, row_no, position_no, center_lat, center_lng, area_px, area_m2, diameter_m, confidence, color_score, sem_key, polygon_json, metrics_json, is_manual'
        )
    )
      .order('tree_index', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) {
      return json(500, { ok: false, error: error.message, setup: setupFor(error) });
    }
    const total = Number(totalCount) || 0;
    return json(200, {
      ok: true,
      result: result,
      trees: trees || [],
      offset: offset,
      limit: limit,
      total: total,
      has_more: offset + (trees || []).length < total
    });
  }

  return json(400, { ok: false, error: 'action inválida: enqueue | status | trees | calibration_save | calibration_load | tree_edit' });
};
