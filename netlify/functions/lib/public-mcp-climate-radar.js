'use strict';

/**
 * Clima guardado + Radar satelital (URLs firmadas) para el complemento público.
 * Solo lectura del propio suscriptor.
 */

const RADAR_BUCKET = 'radar-ndvi';
const CLIMATE_MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const CLIMATE_MONTH_LABELS = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic'
};
const CLIMATE_HISTORY_YEARS = 4;
const RADAR_SIGN_TTL_SEC = 3600;
const RADAR_DEFAULT_LIMIT = 8;
const RADAR_MAX_LIMIT = 16;

function asNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function getClimateYearEntriesFromBlock(block) {
  if (!block || typeof block !== 'object') return [];
  if (block.years && typeof block.years === 'object') {
    return Object.keys(block.years)
      .map((k) => {
        const y = parseInt(k, 10);
        const entry = block.years[k] || {};
        return {
          year: y,
          months: entry.months || {},
          partial: !!entry.partial,
          unavailable: !!entry.unavailable
        };
      })
      .filter((e) => Number.isFinite(e.year))
      .sort((a, b) => a.year - b.year);
  }
  const legacy = [];
  if (block.previousYear != null && block.monthsPrev) {
    legacy.push({ year: block.previousYear, months: block.monthsPrev, partial: false, unavailable: false });
  }
  if (block.currentYear != null && block.monthsCurr) {
    legacy.push({ year: block.currentYear, months: block.monthsCurr, partial: true, unavailable: false });
  }
  return legacy.sort((a, b) => a.year - b.year);
}

function sumClimateMonths(monthsObj, maxMonth) {
  if (!monthsObj || typeof monthsObj !== 'object') return null;
  let t = 0;
  let n = 0;
  CLIMATE_MONTH_KEYS.forEach((k, i) => {
    if (maxMonth != null && i >= maxMonth) return;
    const v = Number(monthsObj[k]);
    if (Number.isFinite(v)) {
      t += v;
      n += 1;
    }
  });
  return n ? round1(t) : null;
}

function climateMonthsToRows(monthsObj, year, maxMonth) {
  if (!monthsObj) return [];
  return CLIMATE_MONTH_KEYS.map((k, i) => {
    if (maxMonth != null && i >= maxMonth) return null;
    const v = monthsObj[k];
    return {
      month: k,
      label: CLIMATE_MONTH_LABELS[k],
      year,
      mm: v != null && Number.isFinite(Number(v)) ? round1(v) : null
    };
  }).filter(Boolean);
}

function summarizeRainfallOrEt0(block, kind) {
  if (!block || typeof block !== 'object' || !block.monthsPrev) {
    return {
      has_data: false,
      message:
        'Sin datos guardados. El usuario debe pulsar «Obtener lluvia y ET₀» en Clima → Lluvia/Riego (hasta ' +
        CLIMATE_HISTORY_YEARS +
        ' años mensuales).'
    };
  }
  const maxMonth = new Date().getMonth() + 1;
  const entries = getClimateYearEntriesFromBlock(block);
  const years = entries.map((entry) => ({
    year: entry.year,
    partial: !!entry.partial,
    unavailable: !!entry.unavailable,
    rows_mm_by_month: climateMonthsToRows(entry.months, entry.year, entry.partial ? maxMonth : 12),
    total_mm: sumClimateMonths(entry.months, entry.partial ? maxMonth : 12)
  }));
  return {
    has_data: true,
    kind,
    unit: block.unit || 'mm',
    fetched_at: block.fetchedAt || null,
    lat: block.lat != null ? block.lat : null,
    lng: block.lng != null ? block.lng : null,
    years_available: years.length,
    years,
    previous_year: block.previousYear,
    current_year: block.currentYear,
    rows_previous_year: climateMonthsToRows(block.monthsPrev, block.previousYear, 12),
    rows_current_year: climateMonthsToRows(block.monthsCurr, block.currentYear, maxMonth),
    monthly_diff_current_vs_previous_mm: block.diff || null,
    total_previous_year_mm: sumClimateMonths(block.monthsPrev, 12),
    total_current_year_partial_mm: sumClimateMonths(block.monthsCurr, maxMonth),
    note:
      'Histórico mensual Open-Meteo (mm/mes). La app guarda hasta ' +
      CLIMATE_HISTORY_YEARS +
      ' años (año en curso parcial).'
  };
}

function summarizeClimateLiveReading(r) {
  if (!r || typeof r !== 'object') {
    return { has_data: false, message: 'Sin lectura de tiempo actual guardada.' };
  }
  return {
    has_data: true,
    fetched_at: r.fetchedAt || null,
    temperature_c: asNum(r.temperature != null ? r.temperature : r.temperature_2m),
    humidity_pct: asNum(r.humidity != null ? r.humidity : r.relative_humidity_2m),
    shortwave_radiation_wm2: asNum(r.shortwaveRadiation),
    uv_index: asNum(r.uvIndex),
    dew_point_c: asNum(r.dewPoint),
    wind_speed_kmh: asNum(r.windSpeedKmh),
    wind_direction_deg: asNum(r.windDirection),
    cloud_cover_pct: asNum(r.cloudCover),
    rain_today_mm: asNum(r.rainTodayMm != null ? r.rainTodayMm : r.rain_1d),
    et0_today_mm: asNum(r.et0TodayMm != null ? r.et0TodayMm : r.et0_1d),
    note: 'Lectura guardada en Clima → Tiempo actual (Open-Meteo en el centro del polígono).'
  };
}

function summarizeClimateRolling(rolling) {
  if (!rolling || typeof rolling !== 'object') {
    return { has_data: false, message: 'Sin ventanas rodantes 1/7/30 d.' };
  }
  return {
    has_data: true,
    fetched_at: rolling.fetchedAt || null,
    et0_1d_mm: asNum(rolling.et0_1d != null ? rolling.et0_1d : rolling.et0Today),
    rain_1d_mm: asNum(rolling.rain_1d != null ? rolling.rain_1d : rolling.rainToday),
    et0_7d_mm: asNum(rolling.et0_7d),
    rain_7d_mm: asNum(rolling.rain_7d),
    et0_30d_mm: asNum(rolling.et0_30d),
    rain_30d_mm: asNum(rolling.rain_30d),
    note: 'Sumas acumuladas Open-Meteo (referencia satélite) para balance hídrico.'
  };
}

function summarizeIrrigationQuickCalc(iqc, rolling) {
  if (!iqc || typeof iqc !== 'object') {
    return { has_data: false, message: 'Sin calculadora de balance hídrico guardada.' };
  }
  const periodDays = iqc.periodDays === 1 || iqc.periodDays === 30 ? iqc.periodDays : 7;
  const kc = asNum(iqc.kc);
  let et0 = null;
  let rain = null;
  let et0Source = null;
  let rainSource = null;
  const roll = rolling && typeof rolling === 'object' ? rolling : null;
  if (iqc.useManualEt0 && iqc.manualEt0 != null) {
    et0 = round1(Number(iqc.manualEt0));
    et0Source = 'campo';
  } else if (roll) {
    if (periodDays === 1) et0 = asNum(roll.et0_1d != null ? roll.et0_1d : roll.et0Today);
    else if (periodDays === 30) et0 = asNum(roll.et0_30d);
    else et0 = asNum(roll.et0_7d);
    if (et0 != null) et0Source = 'satélite';
  }
  if (iqc.macroTunnelNoRain) {
    rain = 0;
    rainSource = 'macrotúnel';
  } else if (iqc.useManualRain && iqc.manualRain != null) {
    rain = round1(Number(iqc.manualRain));
    rainSource = 'campo';
  } else if (roll) {
    if (periodDays === 1) rain = asNum(roll.rain_1d != null ? roll.rain_1d : roll.rainToday);
    else if (periodDays === 30) rain = asNum(roll.rain_30d);
    else rain = asNum(roll.rain_7d);
    if (rain != null) rainSource = 'satélite';
  }
  const etc = et0 != null && kc != null ? round1(et0 * kc) : null;
  let irrigationMm = null;
  const irrVal = asNum(iqc.irrigationValue != null ? iqc.irrigationValue : iqc.irrigationM3);
  const irrUnit = iqc.irrigationUnit === 'm3' ? 'm3' : 'mm';
  const irrigatedHa = asNum(iqc.irrigatedAreaHa != null ? iqc.irrigatedAreaHa : iqc.irrigatedHa);
  const cropHa = asNum(iqc.cropAreaHa != null ? iqc.cropAreaHa : iqc.cropHa);
  if (irrVal != null && irrVal >= 0) {
    if (irrUnit === 'm3') {
      if (irrigatedHa != null && irrigatedHa > 0) irrigationMm = round1(irrVal / (irrigatedHa * 10));
    } else {
      irrigationMm = round1(irrVal);
    }
  }
  const deficitClimate = et0 != null && rain != null ? round1(et0 - rain) : null;
  const deficitCrop = etc != null && rain != null ? round1(etc - rain) : null;
  const cHa = cropHa != null && cropHa > 0 ? cropHa : 1;
  const iHa = irrigatedHa != null && irrigatedHa > 0 ? irrigatedHa : cHa;
  const irrMmBal = irrigationMm != null ? irrigationMm : 0;
  const balance =
    deficitCrop != null
      ? round1((deficitCrop * 10 * cHa - irrMmBal * 10 * iHa) / (cHa * 10))
      : null;
  return {
    has_data: true,
    crop_name: iqc.cropName || iqc.crop || null,
    period_days: periodDays,
    kc,
    etc_mm: etc,
    et0_mm: et0,
    et0_source: et0Source,
    rain_mm: rain,
    rain_source: rainSource,
    deficit_climate_mm: deficitClimate,
    deficit_crop_mm: deficitCrop,
    irrigation_mm: irrigationMm,
    irrigation_input: irrVal,
    irrigation_unit: irrUnit,
    balance_mm: balance,
    crop_area_ha: cropHa,
    irrigated_area_ha: irrigatedHa,
    note: 'Calculadora balance hídrico (Clima → Lluvia y ET₀). Estimación; decide el agrónomo.'
  };
}

function summarizeClimateAnalysis(ca) {
  if (!ca || typeof ca !== 'object') {
    return {
      has_data: false,
      message: 'Sin Clima guardado (climateAnalysis).'
    };
  }
  const hasRain = !!(ca.rainfall && ca.rainfall.monthsPrev);
  const hasEt0 = !!(ca.et0 && ca.et0.monthsPrev);
  const hasLive = !!(ca.lastReading && (ca.lastReading.fetchedAt || ca.lastReading.temperature != null));
  const hasIrr = !!(ca.irrigationQuickCalc && typeof ca.irrigationQuickCalc === 'object');
  const hasRolling = !!(ca.rolling && typeof ca.rolling === 'object');
  const rolling = summarizeClimateRolling(ca.rolling);
  const iqc = summarizeIrrigationQuickCalc(ca.irrigationQuickCalc, ca.rolling);
  const live = summarizeClimateLiveReading(ca.lastReading);
  const rain = summarizeRainfallOrEt0(ca.rainfall, 'precipitation');
  const et0 = summarizeRainfallOrEt0(ca.et0, 'et0_fao');

  const chart_elements = [];
  function pushMetric(id, label, lab, unit, group) {
    if (lab == null) return;
    chart_elements.push({
      id: id,
      label: label,
      lab: lab,
      ideal: null,
      unit: unit,
      dop_or_diff_pct: null,
      status: null,
      group: group
    });
  }
  if (rolling && rolling.has_data) {
    pushMetric('et0_7d', 'ET₀ 7 d', rolling.et0_7d_mm, 'mm', 'rolling');
    pushMetric('rain_7d', 'Lluvia 7 d', rolling.rain_7d_mm, 'mm', 'rolling');
    pushMetric('et0_30d', 'ET₀ 30 d', rolling.et0_30d_mm, 'mm', 'rolling');
    pushMetric('rain_30d', 'Lluvia 30 d', rolling.rain_30d_mm, 'mm', 'rolling');
  }
  if (iqc && iqc.has_data) {
    pushMetric('kc', 'Kc', iqc.kc, null, 'balance');
    pushMetric('etc', 'ETc', iqc.etc_mm, 'mm', 'balance');
    pushMetric('balance', 'Balance riego', iqc.balance_mm, 'mm', 'balance');
    pushMetric('irrigation', 'Riego', iqc.irrigation_mm, 'mm', 'balance');
  }
  if (live && live.has_data) {
    pushMetric('T', 'Temperatura', live.temperature_c, '°C', 'tiempo_actual');
    pushMetric('HR', 'Humedad relativa', live.humidity_pct, '%', 'tiempo_actual');
    pushMetric('rain_today', 'Lluvia hoy', live.rain_today_mm, 'mm', 'tiempo_actual');
    pushMetric('et0_today', 'ET₀ hoy', live.et0_today_mm, 'mm', 'tiempo_actual');
  }

  const chart_months = [];
  if (rain && rain.has_data && Array.isArray(rain.rows_current_year)) {
    rain.rows_current_year.forEach((row) => {
      if (!row || row.mm == null) return;
      chart_months.push({
        id: 'rain_' + row.month,
        label: 'Lluvia ' + (row.label || row.month),
        lab: row.mm,
        ideal: null,
        unit: 'mm',
        group: 'rainfall_month'
      });
    });
  }
  if (et0 && et0.has_data && Array.isArray(et0.rows_current_year)) {
    et0.rows_current_year.forEach((row) => {
      if (!row || row.mm == null) return;
      chart_months.push({
        id: 'et0_' + row.month,
        label: 'ET₀ ' + (row.label || row.month),
        lab: row.mm,
        ideal: null,
        unit: 'mm',
        group: 'et0_month'
      });
    });
  }

  return {
    has_data: hasRain || hasEt0 || hasLive || hasIrr || hasRolling,
    last_updated: ca.lastUpdated || null,
    last_tab: ca.lastTab || null,
    rainfall: rain,
    et0: et0,
    rolling_windows: rolling,
    irrigation_quick_calc: iqc,
    tiempo_actual_guardado: live,
    chart_elements,
    chart_months,
    presentation_hint:
      'Didáctico: 1) tablas lluvia/ET₀ por mes, 2) chart_months (selector mes), 3) chart_elements (rolling/balance/tiempo actual). Filtra un mes o una métrica si lo piden. Radar va en detail.radar con links.',
    note:
      'Clima del proyecto (guardado). Lluvia/ET₀ mensual, ventanas 1/7/30 d, balance riego y tiempo actual. Radar satelital va aparte (URLs firmadas). Para satélite en vivo sin guardar: calculate_irrigation_balance / agroclimate_forecast_at_point.'
  };
}

async function signedRadarUrl(supabase, path, ttlSec) {
  if (!path || !supabase) return null;
  const { data, error } = await supabase.storage
    .from(RADAR_BUCKET)
    .createSignedUrl(path, ttlSec == null ? RADAR_SIGN_TTL_SEC : ttlSec);
  if (error || !data || !data.signedUrl) return null;
  return data.signedUrl;
}

function radarPathFromMeta(meta, key) {
  if (!meta || typeof meta !== 'object') return null;
  if (meta[key]) return meta[key];
  const short = key.replace('_storage_path', '');
  if (meta.images && meta.images[short] && meta.images[short].storage_path) {
    return meta.images[short].storage_path;
  }
  return null;
}

async function buildRadarImageSnapshot(supabase, row) {
  if (!row) return null;
  const meta = row.meta || {};
  const ndviPath = row.image_storage_path || radarPathFromMeta(meta, 'ndvi_storage_path');
  const ndmiPath = radarPathFromMeta(meta, 'ndmi_storage_path');
  const ndrePath = radarPathFromMeta(meta, 'ndre_storage_path');
  const rgbPath = radarPathFromMeta(meta, 'rgb_storage_path');
  const [ndviUrl, ndmiUrl, ndreUrl, rgbUrl] = await Promise.all([
    signedRadarUrl(supabase, ndviPath),
    signedRadarUrl(supabase, ndmiPath),
    signedRadarUrl(supabase, ndrePath),
    signedRadarUrl(supabase, rgbPath)
  ]);
  const loc = meta.location_snapshot || null;
  return {
    id: row.id,
    created_at: row.created_at,
    month_key: row.month_key,
    kind: meta.lectura ? 'lectura_satelital' : 'pilot',
    sentinel_period: {
      from: meta.date_start || null,
      to: meta.date_end || null
    },
    source: meta.source || 'COPERNICUS/S2_SR_HARMONIZED',
    area_hectares: loc && loc.area_hectares != null ? loc.area_hectares : null,
    location_center: loc && loc.center ? loc.center : null,
    images: {
      ndvi: {
        label: 'NDVI — vigor vegetativo relativo',
        signed_url: ndviUrl,
        legend: 'Relativo al predio/fecha: verde = mayor vigor; rojo/naranja = menor.'
      },
      ndmi: {
        label: 'NDMI — humedad del dosel',
        signed_url: ndmiUrl,
        legend: 'Relativo al predio/fecha: verde/azul = mayor humedad; marrón = menor.'
      },
      ndre: {
        label: 'NDRE — clorofila / dosel',
        signed_url: ndreUrl,
        legend: 'Relativo al predio/fecha: verde/teal = mayor; rojo/ámbar = menor.'
      },
      rgb: {
        label: 'RGB — natural',
        signed_url: rgbUrl,
        legend: 'Verde≈planta; rojo/café≈suelo (no escala Menor/Mayor).'
      }
    },
    urls_expire_in_seconds: RADAR_SIGN_TTL_SEC,
    note: 'URLs firmadas (~1 h). ChatGPT no analiza píxeles: pasa los enlaces y la fecha.'
  };
}

function radarHistoryMeta(row) {
  const meta = (row && row.meta) || {};
  const loc = meta.location_snapshot || null;
  return {
    id: row.id,
    created_at: row.created_at,
    month_key: row.month_key,
    kind: meta.lectura ? 'lectura_satelital' : 'pilot',
    sentinel_period: { from: meta.date_start || null, to: meta.date_end || null },
    has_ndvi: !!row.image_storage_path,
    has_ndmi: !!radarPathFromMeta(meta, 'ndmi_storage_path'),
    has_ndre: !!radarPathFromMeta(meta, 'ndre_storage_path'),
    has_rgb: !!radarPathFromMeta(meta, 'rgb_storage_path'),
    area_hectares: loc && loc.area_hectares != null ? loc.area_hectares : null,
    location_center: loc && loc.center ? loc.center : null
  };
}

/**
 * Lista imágenes Radar del proyecto del usuario y firma URLs.
 * Por defecto firma cada imagen reciente (cap); request_id firma solo esa.
 */
async function buildSubscriberRadar(supabase, userId, projectId, params) {
  if (!supabase || !userId || !projectId) {
    return { has_data: false, message: 'Sin contexto para Radar.' };
  }
  const limit = Math.min(
    Math.max(parseInt((params && (params.radar_limit || params.history_limit)) || RADAR_DEFAULT_LIMIT, 10) || RADAR_DEFAULT_LIMIT, 1),
    RADAR_MAX_LIMIT
  );
  const requestId = String((params && (params.request_id || params.radar_request_id)) || '').trim();

  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { has_data: false, error: 'radar_requests: ' + error.message };
  }
  const rows = data || [];
  if (!rows.length) {
    return {
      has_data: false,
      images_count: 0,
      message: 'Sin imágenes Radar guardadas en este proyecto.',
      note: 'El usuario genera NDVI/NDMI/NDRE/RGB en Radar Satelital (créditos). Deep link: sección ubicación/radar del dashboard.'
    };
  }

  let toSign = rows;
  if (requestId) {
    const one = rows.find((r) => String(r.id) === requestId);
    if (!one) {
      const { data: byId, error: e2 } = await supabase
        .from('radar_requests')
        .select('id, created_at, month_key, image_storage_path, meta')
        .eq('id', requestId)
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .not('image_storage_path', 'is', null)
        .maybeSingle();
      if (e2 || !byId) {
        return {
          has_data: true,
          images_count: rows.length,
          history: rows.map(radarHistoryMeta),
          error: 'radar_snapshot_not_found',
          message: 'No se encontró esa imagen. Usa history[].id o omite request_id.'
        };
      }
      toSign = [byId];
    } else {
      toSign = [one];
    }
  }

  const images = [];
  for (let i = 0; i < toSign.length; i++) {
    images.push(await buildRadarImageSnapshot(supabase, toSign[i]));
  }

  const chart_images = images.map((img) => ({
    id: img && img.id,
    label:
      (img && img.sentinel_period && (img.sentinel_period.from || img.sentinel_period.to)
        ? (img.sentinel_period.from || '') + ' → ' + (img.sentinel_period.to || '')
        : img && img.created_at) || img.id,
    kind: img && img.kind,
    area_hectares: img && img.area_hectares,
    layers: img && img.images
      ? ['ndvi', 'ndmi', 'ndre', 'rgb'].filter((k) => img.images[k] && img.images[k].signed_url)
      : [],
    links: img && img.images
      ? {
          ndvi: img.images.ndvi && img.images.ndvi.signed_url,
          ndmi: img.images.ndmi && img.images.ndmi.signed_url,
          ndre: img.images.ndre && img.images.ndre.signed_url,
          rgb: img.images.rgb && img.images.rgb.signed_url
        }
      : null
  }));

  return {
    has_data: true,
    images_count: rows.length,
    signed_count: images.length,
    latest: images[0] || null,
    images,
    history: rows.map(radarHistoryMeta),
    chart_images,
    presentation_hint:
      'Didáctico: 1) lista chart_images (fecha/periodo + capas con link), 2) ofrece abrir NDVI/NDMI/NDRE/RGB; si piden una fecha usa request_id. No analices píxeles. Clima completo va en detail.climate.',
    note:
      'Cada imagen del proyecto trae links firmados NDVI/NDMI/NDRE/RGB (~1 h). Por defecto las más recientes (hasta ' +
      limit +
      '). request_id = una sola. No inventes URLs; no analices píxeles: pasa enlaces + fecha/periodo. ≠ clima Open-Meteo ≠ VPD.'
  };
}

module.exports = {
  summarizeClimateAnalysis,
  summarizeRainfallOrEt0,
  summarizeClimateRolling,
  summarizeIrrigationQuickCalc,
  summarizeClimateLiveReading,
  buildSubscriberRadar,
  buildRadarImageSnapshot,
  RADAR_DEFAULT_LIMIT,
  RADAR_SIGN_TTL_SEC
};
