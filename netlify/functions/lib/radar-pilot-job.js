/**
 * Cola async Pilot: pending → processing → done | error
 * Créditos reservados mientras pending/processing (sin image_storage_path).
 */
const { findSentinel2ScenesForComposite, findSentinel2ScenesForRange } = require('./radar-pilot-stac');
const { renderNdviNdmiCompositePngs } = require('./radar-pilot-render');
const radarCredits = require('./radar-credits');

function addDaysIso(isoDate, days) {
  const d = new Date(String(isoDate) + 'T00:00:00Z');
  if (isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ventana del mes calendario que cubre el periodo (día 1 del mes de dateStart
 * → último día del mes de dateEnd), sin pasar de hoy.
 * Solo se usa para ampliar UNA quincena incompleta; el resto de periodos no cambian.
 */
function calendarMonthWindowForPeriod(dateStart, dateEnd) {
  const today = todayIsoUtc();
  const s = new Date(String(dateStart).slice(0, 10) + 'T12:00:00Z');
  const e = new Date(String(dateEnd).slice(0, 10) + 'T12:00:00Z');
  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return { startIso: String(dateStart).slice(0, 10), endIso: String(dateEnd).slice(0, 10) };
  }
  const start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
  const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0));
  let startIso = start.toISOString().slice(0, 10);
  let endIso = end.toISOString().slice(0, 10);
  if (endIso > today) endIso = today;
  if (startIso > endIso) startIso = endIso;
  return { startIso, endIso };
}

const PILOT_LOOKBACK_TIERS = [
  { days: 14, maxCloud: 35 },
  { days: 21, maxCloud: 40 },
  { days: 30, maxCloud: 50 }
];

/** Meta suave: si en 14 d el predio queda muy a medias, probar ventana más amplia (2–3 pasadas). */
const PILOT_TARGET_VALID_FRACTION = 0.65;

function isPilotCoverageFail(err) {
  return /radar_low_coverage|cobertura satelital útil|píxeles válidos|No hay escenas/i.test(
    String((err && err.message) || '')
  );
}

function pilotCoverageScore(rendered) {
  const frac = Number(rendered?.coverage?.valid_fraction);
  if (Number.isFinite(frac)) return frac;
  const pct = Number(rendered?.coverage?.valid_pct);
  if (Number.isFinite(pct)) return pct / 100;
  return 0;
}

/**
 * Busca 14 → 21 → 30 d. Si ya llega a ~65% útiles, se queda (no fuerza 30 d).
 * Si no, prueba el siguiente nivel y al final guarda la MEJOR imagen (nunca deja vacío
 * si alguna ventana alcanzó el mínimo ~15%).
 */
async function renderPilotCompositeWithTiers(polygon, maxScenes, maxDim, onTierMessage) {
  let lastErr = null;
  let best = null;
  let bestScore = -1;
  let bestTierIndex = -1;

  for (let i = 0; i < PILOT_LOOKBACK_TIERS.length; i++) {
    const tier = PILOT_LOOKBACK_TIERS[i];
    try {
      if (i > 0 && typeof onTierMessage === 'function') {
        await onTierMessage(tier.days);
      }
      const bundle = await findSentinel2ScenesForComposite(polygon, {
        maxScenes,
        lookbackDays: tier.days,
        maxCloud: tier.maxCloud,
        maxLookbackDays: tier.days
      });
      const rendered = await renderNdviNdmiCompositePngs(
        { scenes: bundle.scenes, bbox4326: bundle.bbox, polygon },
        { maxDim }
      );
      const score = pilotCoverageScore(rendered);
      if (score > bestScore) {
        best = { bundle, rendered, lookbackExpanded: i > 0 };
        bestScore = score;
        bestTierIndex = i;
      }
      // Cobertura buena en ventana corta → no alargar a 30 d.
      if (score >= PILOT_TARGET_VALID_FRACTION) {
        return { bundle, rendered, lookbackExpanded: i > 0 };
      }
    } catch (e) {
      lastErr = e;
      if (!isPilotCoverageFail(e)) throw e;
      // Cobertura insuficiente en este nivel: probar el siguiente (si hay).
    }
  }

  if (best) {
    return {
      ...best,
      lookbackExpanded: bestTierIndex > 0
    };
  }
  throw lastErr || new Error('Pilot composite failed');
}

const BUCKET = 'radar-ndvi';
const ACTIVE_STATUSES = new Set(['pending', 'processing']);
const JOB_STALE_MS = 45 * 60 * 1000;

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

function buildLocationSnapshot(location, fallbackPolygon) {
  const rawPolygon =
    location && Array.isArray(location.polygon) && location.polygon.length >= 3
      ? location.polygon
      : fallbackPolygon;
  const polygon = normalizePolygon(rawPolygon);
  if (!polygon) return null;

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

  const center =
    location &&
    location.center &&
    location.center.lat != null &&
    location.center.lng != null
      ? { lat: Number(location.center.lat), lng: Number(location.center.lng) }
      : { lat: sumLat / polygon.length, lng: sumLng / polygon.length };

  return {
    polygon,
    vertex_count: polygon.length,
    center,
    bounds: { north, south, east, west },
    area_hectares:
      location && location.areaHectares != null && Number.isFinite(Number(location.areaHectares))
        ? Number(location.areaHectares)
        : null,
    area_m2:
      location && location.area != null && Number.isFinite(Number(location.area))
        ? Number(location.area)
        : null,
    perimeter_m:
      location && location.perimeter != null && Number.isFinite(Number(location.perimeter))
        ? Number(location.perimeter)
        : null,
    captured_at: new Date().toISOString()
  };
}

function jobStatus(meta) {
  return String((meta && meta.status) || '').toLowerCase();
}

function isActiveJobRow(row) {
  if (!row || row.image_storage_path) return false;
  const st = jobStatus(row.meta);
  if (!ACTIVE_STATUSES.has(st)) return false;
  const created = row.created_at ? Date.parse(row.created_at) : 0;
  if (created && Date.now() - created > JOB_STALE_MS) return false;
  return true;
}

function creditsForRow(row) {
  const c = row?.meta?.credits_charged;
  if (c != null && Number.isFinite(Number(c))) return Math.max(0, Math.floor(Number(c)));
  return 1;
}

async function sumMonthlyRadarCreditsUsed(supabase, userId, mk) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('image_storage_path, meta')
    .eq('user_id', userId)
    .eq('month_key', mk);
  if (error) {
    console.warn('sumMonthlyRadarCreditsUsed:', error.message);
    return 0;
  }
  return (data || []).reduce((acc, row) => {
    if (row.image_storage_path) return acc + creditsForRow(row);
    const st = jobStatus(row.meta);
    if (ACTIVE_STATUSES.has(st)) return acc + creditsForRow(row);
    return acc;
  }, 0);
}

async function getActivePilotJob(supabase, userId, projectId) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .is('image_storage_path', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    console.warn('getActivePilotJob:', error.message);
    return null;
  }
  // No mezclar cola de Lectura Satelital con estado del Pilot (pestaña 1).
  return (data || []).find((row) => isActiveJobRow(row) && !(row.meta && row.meta.lectura)) || null;
}

async function getPendingPilotJobForStatus(supabase, userId, projectId) {
  const row = await getActivePilotJob(supabase, userId, projectId);
  if (!row) return null;
  return {
    id: row.id,
    created_at: row.created_at,
    status: jobStatus(row.meta) || 'pending'
  };
}

async function getLatestFailedPilotJob(supabase, userId, projectId) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .is('image_storage_path', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    console.warn('getLatestFailedPilotJob:', error.message);
    return null;
  }
  const failed = (data || []).find(
    (row) => jobStatus(row.meta) === 'error' && !(row.meta && row.meta.lectura)
  );
  if (!failed) return null;
  return {
    id: failed.id,
    created_at: failed.created_at,
    status: 'error',
    error_message: failed.meta?.error_message || 'No se pudo generar Pilot',
    error_code: /radar_low_coverage|cobertura satelital útil|píxeles válidos/i.test(
      String(failed.meta?.error_message || '')
    )
      ? 'radar_low_coverage'
      : 'pilot_error'
  };
}

async function patchJobMeta(supabase, requestId, userId, patch) {
  const { data: row, error: loadErr } = await supabase
    .from('radar_requests')
    .select('meta')
    .eq('id', requestId)
    .eq('user_id', userId)
    .maybeSingle();
  if (loadErr || !row) return { ok: false, error: loadErr?.message || 'job_not_found' };
  const meta = { ...(row.meta || {}), ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('radar_requests').update({ meta }).eq('id', requestId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, meta };
}

async function createPendingPilotJob(supabase, opts) {
  const {
    userId,
    projectId,
    polygon,
    projectRow,
    creditCost,
    maxDim,
    maxScenes,
    mk
  } = opts;
  const locationSnapshot = buildLocationSnapshot(projectRow?.data?.location, polygon);
  const meta = {
    pilot: true,
    engine: 'cdse_pilot',
    async: true,
    status: 'pending',
    status_message: 'Solicitud recibida. Preparando datos satelitales…',
    polygon,
    max_dim: maxDim,
    max_scenes: maxScenes,
    location_snapshot: locationSnapshot,
    area_hectares: locationSnapshot?.area_hectares ?? null,
    credits_charged: creditCost,
    queued_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('radar_requests')
    .insert({
      user_id: userId,
      project_id: projectId,
      month_key: mk || monthKey(),
      image_storage_path: null,
      meta
    })
    .select('id, created_at, meta')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: data };
}

async function createPendingLecturaJob(supabase, opts) {
  const {
    userId,
    projectId,
    polygon,
    projectRow,
    creditCost,
    maxDim,
    maxScenes,
    mk,
    period
  } = opts;
  const locationSnapshot = buildLocationSnapshot(projectRow?.data?.location, polygon);
  const meta = {
    pilot: true,
    engine: 'cdse_pilot',
    async: true,
    lectura: true,
    status: 'pending',
    status_message: 'Solicitud de Lectura Satelital recibida. Preparando datos…',
    polygon,
    max_dim: maxDim,
    max_scenes: maxScenes,
    frequency: period.frequency,
    period_index: period.index,
    period_label: period.label,
    date_start: period.date_start,
    date_end: period.date_end,
    location_snapshot: locationSnapshot,
    area_hectares: locationSnapshot?.area_hectares ?? null,
    credits_charged: creditCost,
    queued_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('radar_requests')
    .insert({
      user_id: userId,
      project_id: projectId,
      month_key: mk || monthKey(),
      image_storage_path: null,
      meta
    })
    .select('id, created_at, meta')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: data };
}

async function getRadarRowsByIds(supabase, userId, projectId, ids) {
  const list = (Array.isArray(ids) ? ids : []).map((x) => String(x)).filter(Boolean);
  if (!list.length) return [];
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .in('id', list);
  if (error) {
    console.warn('getRadarRowsByIds:', error.message);
    return [];
  }
  return data || [];
}

async function triggerPilotBackground(requestId, accessToken) {
  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '');
  if (!base) {
    console.warn('triggerPilotBackground: falta URL/DEPLOY_PRIME_URL');
    return false;
  }
  try {
    const res = await fetch(`${base}/.netlify/functions/radar-cdse-pilot-background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ request_id: requestId })
    });
    return res.status === 202 || res.ok;
  } catch (e) {
    console.error('triggerPilotBackground:', e);
    return false;
  }
}

async function processPilotJob(supabase, requestId, userId) {
  const { data: job, error: jobErr } = await supabase
    .from('radar_requests')
    .select('id, user_id, project_id, month_key, image_storage_path, meta, created_at')
    .eq('id', requestId)
    .eq('user_id', userId)
    .maybeSingle();

  if (jobErr || !job) {
    throw new Error('Trabajo Pilot no encontrado');
  }
  if (job.image_storage_path) {
    return { ok: true, already_done: true, request_id: job.id };
  }

  const st = jobStatus(job.meta);
  if (st === 'done') return { ok: true, already_done: true, request_id: job.id };
  if (st === 'error') throw new Error(job.meta?.error_message || 'Trabajo Pilot falló antes');

  if (!isActiveJobRow(job) && st !== 'pending' && st !== 'processing') {
    throw new Error('Trabajo Pilot no está activo');
  }

  await patchJobMeta(supabase, requestId, userId, {
    status: 'processing',
    status_message: 'Descargando datos Sentinel-2 y calculando NDVI/NDMI…'
  });

  const polygon = normalizePolygon(job.meta?.polygon);
  if (!polygon) {
    await patchJobMeta(supabase, requestId, userId, {
      status: 'error',
      error_message: 'Polígono inválido en la solicitud Pilot'
    });
    throw new Error('Polígono inválido en la solicitud Pilot');
  }

  const maxDim = Math.min(Math.max(Number(job.meta?.max_dim) || 512, 256), 2048);
  // Hasta 3 pasadas (mediana por píxel) para rellenar huecos de nubes/sombra.
  const maxScenes = Math.min(Math.max(Number(job.meta?.max_scenes) || 3, 1), 4);
  const creditCost = creditsForRow(job);
  const mk = job.month_key || monthKey();

  let projectRow = null;
  if (job.project_id) {
    const { data: proj } = await supabase
      .from('projects')
      .select('id, user_id, data')
      .eq('id', job.project_id)
      .maybeSingle();
    projectRow = proj;
  }

  const isLectura = !!(job.meta && job.meta.lectura && job.meta.date_start && job.meta.date_end);
  const frequency = job.meta?.frequency || null;

  try {
    let bundle;
    let rendered;
    let lookbackExpanded = false;

    if (isLectura) {
      const dateStart = String(job.meta.date_start).slice(0, 10);
      const dateEnd = String(job.meta.date_end).slice(0, 10);
      const isCoverageFail = (err) =>
        /radar_low_coverage|cobertura satelital útil|píxeles válidos|No hay escenas/i.test(
          String((err && err.message) || '')
        );
      const renderRange = async (startIso, endIso, extraOpts) => {
        const b = await findSentinel2ScenesForRange(polygon, {
          dateStart: startIso,
          dateEnd: endIso,
          maxScenes,
          ...(extraOpts || {})
        });
        const r = await renderNdviNdmiCompositePngs(
          { scenes: b.scenes, bbox4326: b.bbox, polygon },
          { maxDim }
        );
        return { b, r };
      };

      // Igual espíritu que Pilot: meta ~65%, juntar hasta 3 pasadas, siempre guardar la mejor.
      // Quincenal incompleta → solo ESE periodo amplía al mes calendario (clima sigue en 15 d).
      let best = null;
      let bestScore = -1;
      let lastErr = null;
      let bestExpanded = false;
      let bestSearchStart = dateStart;
      let bestSearchEnd = dateEnd;

      const consider = (out, expanded, searchStart, searchEnd) => {
        const score = pilotCoverageScore(out.r);
        if (score > bestScore) {
          best = out;
          bestScore = score;
          bestExpanded = !!expanded;
          bestSearchStart = searchStart;
          bestSearchEnd = searchEnd;
        }
        return score;
      };

      const attempts = [
        {
          start: dateStart,
          end: dateEnd,
          extra: null,
          expanded: false,
          message: null
        },
        {
          start: dateStart,
          end: dateEnd,
          extra: { maxCloud: 60, candidateLimit: 30 },
          expanded: false,
          message:
            frequency === 'mensual'
              ? 'Mes con poca cobertura: reintentando con las escenas más claras del periodo…'
              : 'Quincena incompleta: reintentando con escenas más claras del periodo…'
        }
      ];

      const monthWin = calendarMonthWindowForPeriod(dateStart, dateEnd);
      const alreadyFullMonth =
        monthWin.startIso === dateStart && monthWin.endIso === dateEnd;
      const canExpandToMonth =
        !alreadyFullMonth &&
        (frequency === 'quincenal' ||
          Math.round(
            (new Date(dateEnd + 'T12:00:00Z').getTime() -
              new Date(dateStart + 'T12:00:00Z').getTime()) /
              86400000
          ) +
            1 <
            28);

      if (canExpandToMonth) {
        attempts.push({
          start: monthWin.startIso,
          end: monthWin.endIso,
          extra: { maxCloud: 60, candidateLimit: 30 },
          expanded: true,
          message:
            'Quincena incompleta: ampliando SOLO este periodo al mes calendario ' +
            monthWin.startIso +
            ' → ' +
            monthWin.endIso +
            ' (clima/riego siguen en ' +
            dateStart +
            ' – ' +
            dateEnd +
            ')…'
        });
      }

      for (let ai = 0; ai < attempts.length; ai++) {
        const att = attempts[ai];
        // Si ya tenemos buena cobertura en el periodo, no ampliar al mes.
        if (att.expanded && bestScore >= PILOT_TARGET_VALID_FRACTION) break;
        // El 2º intento (mismas fechas, más nubes) solo si el 1º no llegó a la meta.
        if (ai === 1 && bestScore >= PILOT_TARGET_VALID_FRACTION) continue;
        try {
          if (att.message) {
            await patchJobMeta(supabase, requestId, userId, {
              status: 'processing',
              status_message: att.message
            });
          }
          const out = await renderRange(att.start, att.end, att.extra);
          const score = consider(out, att.expanded, att.start, att.end);
          if (!att.expanded && score >= PILOT_TARGET_VALID_FRACTION) break;
        } catch (e) {
          lastErr = e;
          if (!isCoverageFail(e)) throw e;
        }
      }

      if (!best) throw lastErr || new Error('Lectura satelital: sin cobertura útil');
      bundle = best.b;
      rendered = best.r;
      lookbackExpanded = bestExpanded;
      // Fechas de búsqueda reales (periodo o mes ampliado) para meta clara.
      bundle = {
        ...bundle,
        searchDateStart: bestSearchStart,
        searchDateEnd: bestSearchEnd
      };
    } else {
      const pilotOut = await renderPilotCompositeWithTiers(polygon, maxScenes, maxDim, async (days) => {
        await patchJobMeta(supabase, requestId, userId, {
          status: 'processing',
          status_message:
            days >= 30
              ? 'Predio incompleto: ampliando a 30 días y juntando hasta 3 pasadas…'
              : 'Predio incompleto en ventana corta: ampliando a ' +
                days +
                ' días y juntando hasta 3 pasadas…'
        });
      });
      bundle = pilotOut.bundle;
      rendered = pilotOut.rendered;
      lookbackExpanded = pilotOut.lookbackExpanded;
    }

    const latestScene = bundle.scenes[0] || {};
    const locationSnapshot =
      job.meta?.location_snapshot || buildLocationSnapshot(projectRow?.data?.location, polygon);
    const ts = Date.now();
    const storagePath = `${userId}/${job.project_id}/${mk}_${ts}_pilot_ndvi.png`;
    const ndmiStoragePath = `${userId}/${job.project_id}/${mk}_${ts}_pilot_ndmi.png`;

    const periodStartMeta = isLectura ? String(job.meta.date_start).slice(0, 10) : null;
    const periodEndMeta = isLectura ? String(job.meta.date_end).slice(0, 10) : null;
    const searchStartMeta = isLectura
      ? bundle.searchDateStart || periodStartMeta
      : null;
    const searchEndMeta = isLectura ? bundle.searchDateEnd || periodEndMeta : null;
    const sceneDatesLabel = Array.isArray(bundle.sceneDates) && bundle.sceneDates.length
      ? bundle.sceneDates.join(', ')
      : null;

    const meta = {
      ...(job.meta || {}),
      pilot: true,
      engine: 'cdse_pilot',
      async: true,
      status: 'done',
      status_message: isLectura
        ? lookbackExpanded
          ? 'Imagen Lectura guardada. Periodo (clima/riego): ' +
            periodStartMeta +
            ' – ' +
            periodEndMeta +
            ' · Búsqueda imagen: mes ' +
            searchStartMeta +
            ' → ' +
            searchEndMeta +
            (sceneDatesLabel ? ' · Sentinel: ' + sceneDatesLabel : '')
          : 'Imagen Lectura guardada. Periodo: ' +
            periodStartMeta +
            ' – ' +
            periodEndMeta +
            (sceneDatesLabel ? ' · Sentinel: ' + sceneDatesLabel : '')
        : 'Imagen Pilot guardada en la nube.',
      provider: bundle.provider,
      source: bundle.provider === 'cdse' ? 'CDSE/sentinel-2-l2a' : 'PlanetaryComputer/sentinel-2-l2a',
      date_start: bundle.dateStart,
      date_end: bundle.dateEnd,
      composite: bundle.composite,
      scene_count: bundle.sceneCount,
      lookback_days: bundle.lookbackDays,
      max_cloud_pct: bundle.maxCloudPct,
      cloud_covers: bundle.cloudCovers || null,
      avg_cloud_cover: bundle.avgCloudCover != null ? bundle.avgCloudCover : null,
      scene_dates: bundle.sceneDates || null,
      coverage: rendered.coverage || null,
      valid_pct: rendered.coverage?.valid_pct != null ? rendered.coverage.valid_pct : null,
      ndvi_mean: rendered.ndviMean != null ? rendered.ndviMean : null,
      ndmi_mean: rendered.ndmiMean != null ? rendered.ndmiMean : null,
      lookback_expanded: lookbackExpanded,
      expanded_to: isLectura && lookbackExpanded ? 'mensual' : null,
      search_date_start: searchStartMeta,
      search_date_end: searchEndMeta,
      period_date_start: periodStartMeta,
      period_date_end: periodEndMeta,
      scl_masked: true,
      fallback_tier: bundle.fallbackTier || null,
      location_snapshot: locationSnapshot,
      area_hectares: locationSnapshot?.area_hectares ?? null,
      credits_charged: creditCost,
      ndvi_vis: { style: 'relative_p10_p90', scale: 'predio' },
      ndmi_vis: { style: 'relative_p10_p90', scale: 'predio' },
      vis: rendered.vis,
      ndmi_storage_path: ndmiStoragePath,
      completed_at: new Date().toISOString(),
      images: {
        ndvi: {
          storage_path: storagePath,
          label: 'NDVI',
          description: 'Pilot Copernicus · vigor relativo del predio'
        },
        ndmi: {
          storage_path: ndmiStoragePath,
          label: 'NDMI',
          description: 'Pilot Copernicus · humedad relativa del dosel'
        }
      }
    };

    const [upNdvi, upNdmi] = await Promise.all([
      supabase.storage.from(BUCKET).upload(storagePath, rendered.ndviPng, {
        contentType: 'image/png',
        upsert: true
      }),
      supabase.storage.from(BUCKET).upload(ndmiStoragePath, rendered.ndmiPng, {
        contentType: 'image/png',
        upsert: true
      })
    ]);
    if (upNdvi.error) throw new Error(upNdvi.error.message || 'storage_upload_failed');
    if (upNdmi.error) throw new Error(upNdmi.error.message || 'storage_upload_failed');

    const { error: updErr } = await supabase
      .from('radar_requests')
      .update({
        image_storage_path: storagePath,
        meta
      })
      .eq('id', requestId)
      .eq('user_id', userId);

    if (updErr) throw new Error(updErr.message || 'db_update_failed');

    const [signedNdvi, signedNdmi] = await Promise.all([
      supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600),
      supabase.storage.from(BUCKET).createSignedUrl(ndmiStoragePath, 3600)
    ]);

    return {
      ok: true,
      request_id: requestId,
      storage_path: storagePath,
      signed_url: signedNdvi.data?.signedUrl || null,
      ndmi_signed_url: signedNdmi.data?.signedUrl || null,
      provider: bundle.provider,
      scene: {
        id: latestScene.itemId,
        datetime: latestScene.datetime,
        cloud_cover: latestScene.cloudCover
      },
      meta
    };
  } catch (e) {
    await patchJobMeta(supabase, requestId, userId, {
      status: 'error',
      error_message: e.message || 'No se pudo generar Pilot',
      failed_at: new Date().toISOString()
    });
    throw e;
  }
}

module.exports = {
  BUCKET,
  ACTIVE_STATUSES,
  JOB_STALE_MS,
  monthKey,
  normalizePolygon,
  buildLocationSnapshot,
  sumMonthlyRadarCreditsUsed,
  getActivePilotJob,
  getPendingPilotJobForStatus,
  getLatestFailedPilotJob,
  createPendingPilotJob,
  createPendingLecturaJob,
  getRadarRowsByIds,
  addDaysIso,
  triggerPilotBackground,
  processPilotJob,
  isActiveJobRow,
  jobStatus
};
