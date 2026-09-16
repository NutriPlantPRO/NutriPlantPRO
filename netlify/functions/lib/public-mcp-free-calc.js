'use strict';

/**
 * Oleada 2 — cálculos free tools vía mismos cores de la web (sin inventar).
 */
const path = require('path');
const core = require('./public-mcp-core');

const root = path.join(__dirname, '..', '..', '..');
const NpIsh = require(path.join(root, 'assets', 'np-ish-core.js'));
const NpUniformity = require(path.join(root, 'assets', 'np-irrigation-uniformity-core.js'));
const NpFoliar = require(path.join(root, 'assets', 'np-foliar-window-core.js'));

function chapter(slug) {
  const found = core.findChapter(slug);
  return found.ok ? core.chapterCite(found.chapter) : null;
}

function freeTool(q) {
  return core.lookupFreeTool({ q: q });
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** % meq en triángulos NutriPlant: N-P-S y K-Ca-Mg = 100 % cada uno. */
function meqTriangleBalance(params) {
  const n = num(params && (params.n_no3_meq || params.N_NO3 || params.n));
  const p = num(params && (params.p_meq || params.P || params.p));
  const s = num(params && (params.s_meq || params.S || params.s));
  const k = num(params && (params.k_meq || params.K || params.k));
  const ca = num(params && (params.ca_meq || params.Ca || params.ca));
  const mg = num(params && (params.mg_meq || params.Mg || params.mg));
  const cl = num(params && (params.cl_meq || params.Cl || params.cl));
  const nh4 = num(params && (params.n_nh4_meq || params.N_NH4 || params.nh4));

  function pcts(parts) {
    const vals = parts.map((x) => (x.v == null ? 0 : x.v));
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      return { ok: false, error: 'Suma meq del triángulo debe ser > 0.', parts: parts };
    }
    return {
      ok: true,
      sum_meq: Math.round(sum * 1000) / 1000,
      percents: parts.map((x) => ({
        ion: x.id,
        meq_L: x.v,
        pct: Math.round(((x.v == null ? 0 : x.v) / sum) * 1000) / 10
      }))
    };
  }

  const anions = pcts([
    { id: 'N-NO3', v: n },
    { id: 'P', v: p },
    { id: 'S', v: s }
  ]);
  const cations = pcts([
    { id: 'K', v: k },
    { id: 'Ca', v: ca },
    { id: 'Mg', v: mg }
  ]);

  const tool = freeTool('hidro_solucion');
  return {
    ok: true,
    domain: 'nutriplant_public',
    note:
      'Triángulos NutriPlant: N-P-S y K-Ca-Mg suman 100 % cada uno. Cl⁻ y NH₄⁺ van aparte (no entran al catiónico K-Ca-Mg).',
    anions_N_P_S: anions,
    cations_K_Ca_Mg: cations,
    outside_triangles: {
      Cl_meq_L: cl,
      N_NH4_meq_L: nh4
    },
    chapter: chapter('porcentaje-meq-aniones-cationes'),
    free_tool: tool.ok ? tool.tool : null
  };
}

function calculateIrrigationUniformity(params) {
  const samples = params && (params.samples || params.values || params.caudales);
  let series = [];
  if (Array.isArray(samples)) {
    series = samples.map((s) => {
      if (s != null && typeof s === 'object') return num(s.value != null ? s.value : s.flow);
      return num(s);
    }).filter((n) => n != null);
  }
  if (series.length < 2) {
    return { ok: false, error: 'Indica samples: array de caudales (L/h) o valores numéricos (≥2).' };
  }
  const r = NpUniformity.analyzeLot(
    series.map((v, i) => ({ label: 'M' + (i + 1), value: v })),
    {
      kind: 'flow',
      unit: 'L/h',
      irrigHours: num(params && (params.time_h || params.irrigHours)),
      dose_l_ha: num(params && params.dose_l_ha)
    }
  );
  const tool = freeTool('uniformidad_riego');
  return {
    ok: !!(r && r.ok !== false && r.du != null),
    domain: 'nutriplant_public',
    result: r,
    chapter: chapter('uniformidad-riego'),
    free_tool: tool.ok ? tool.tool : null,
    error: r && r.error ? r.error : null
  };
}

function classifyFoliarWindow(params) {
  // No pasar null en opcionales: Number(null)===0 en el core y tuerce VPD/lluvia.
  const input = {
    tempC: num(params && (params.temperature_C || params.tempC || params.t)),
    rhPct: num(params && (params.rh_pct || params.rhPct || params.hr))
  };
  const windKmh = num(params && (params.wind_kmh || params.windKmh || params.viento));
  const rainMm = num(params && (params.rain_mm || params.rainMm));
  const rainNextMm = num(params && (params.rain_next_mm || params.rainNextMm));
  const precipProbPct = num(params && (params.precip_prob_pct || params.precipProbPct));
  const vpdKpa = num(params && (params.vpd_kPa || params.vpdKpa));
  if (windKmh != null) input.windKmh = windKmh;
  if (rainMm != null) input.rainMm = rainMm;
  if (rainNextMm != null) input.rainNextMm = rainNextMm;
  if (precipProbPct != null) input.precipProbPct = precipProbPct;
  if (vpdKpa != null) input.vpdKpa = vpdKpa;
  if (input.tempC == null || input.rhPct == null) {
    return {
      ok: false,
      error: 'Indica temperature_C y rh_pct (viento/lluvia/VPD opcionales).'
    };
  }
  const row = NpFoliar.classifyHour(input);
  const tool = freeTool('ventanas_foliar');
  return {
    ok: true,
    domain: 'nutriplant_public',
    classification: row,
    note:
      'Sweet spot NutriPlant: T 15–25 °C, HR 50–80 %, viento 2–8 km/h. ≠ VPD de cultivo puntual ni pronóstico agroclimático.',
    chapter: chapter('ventanas-aplicacion-foliar'),
    free_tool: tool.ok ? tool.tool : null
  };
}

function calculateIsh(params) {
  const weeks = params && params.weeks;
  if (!Array.isArray(weeks) || !weeks.length) {
    return {
      ok: false,
      error:
        'Indica weeks: [{ et0_mm, rain_mm, irrigation_mm? }, ...] y kc. Misma fórmula que la herramienta ISH.'
    };
  }
  const r = NpIsh.computeIsh({
    kc: num(params.kc),
    fp: num(params.fp),
    irrigationEffectivePct: num(params.irrigation_effective_pct || params.irrigationEffectivePct),
    macroTunnelNoRain: !!(params.macro_tunnel || params.macroTunnelNoRain),
    weeks: weeks
  });
  const tool = freeTool('ish_rendimiento');
  return {
    ok: !!(r && r.ok !== false),
    domain: 'nutriplant_public',
    result: r,
    chapter: chapter('ish-rendimiento-hidrico'),
    free_tool: tool.ok ? tool.tool : null,
    error: r && r.ok === false ? r.error : null
  };
}

async function fetchOpenMeteoCurrent(lat, lng) {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lng) +
    '&current=temperature_2m,relative_humidity_2m,shortwave_radiation,uv_index';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
  const data = await res.json();
  if (!data || !data.current) throw new Error('Respuesta clima inválida');
  const cur = data.current;
  return {
    temperature_C: cur.temperature_2m,
    rh_pct: cur.relative_humidity_2m,
    shortwave_radiation: cur.shortwave_radiation != null ? Number(cur.shortwave_radiation) : null,
    uv_index: cur.uv_index != null ? Number(cur.uv_index) : null
  };
}

async function calculateVpdAtPoint(params) {
  const lat = num(params && (params.lat || params.latitude));
  const lng = num(params && (params.lng || params.lon || params.longitude));
  if (lat == null || lng == null) {
    return {
      ok: false,
      error: 'Indica lat y lng (o longitude). ChatGPT no lee GPS solo; el usuario debe dar el punto.'
    };
  }
  let weather;
  try {
    weather = await fetchOpenMeteoCurrent(lat, lng);
  } catch (e) {
    return {
      ok: false,
      error: 'No se pudo obtener clima: ' + (e && e.message ? e.message : String(e)),
      hint: 'Usa calculate_vpd con T y HR, o la calculadora vpd-free en la web.'
    };
  }
  const vpd = core.calculateVpd({
    temperature_C: weather.temperature_C,
    rh_pct: weather.rh_pct,
    crop: params && params.crop
  });
  const tool = freeTool('vpd');
  return {
    ok: !!(vpd && vpd.ok),
    domain: 'nutriplant_public',
    point: { lat, lng },
    weather: weather,
    vpd: vpd,
    source: 'Open-Meteo current (misma idea que vpd-free)',
    chapter: chapter('vpd-deficit-presion-vapor'),
    free_tool: tool.ok ? tool.tool : null,
    note: 'VPD ambiental de aire. Microclima del cultivo puede diferir; validar en campo.'
  };
}

/** Factores óxido ↔ elemental (misma convención hidro / composición). */
const OXIDE_FACTORS = {
  P2O5: { elemental: 'P', factor: 2.291 },
  K2O: { elemental: 'K', factor: 1.204 },
  CaO: { elemental: 'Ca', factor: 1.399 },
  MgO: { elemental: 'Mg', factor: 1.658 },
  SO3: { elemental: 'S', factor: 2.497 }
};

function convertOxideElemental(params) {
  const value = num(params && params.value);
  const form = String((params && (params.form || params.oxide || params.pair)) || '')
    .trim()
    .toUpperCase()
    .replace('₂', '2')
    .replace('₅', '5')
    .replace('₃', '3');
  const direction = String((params && (params.direction || params.to)) || 'to_elemental')
    .toLowerCase()
    .replace(/\s+/g, '_');
  const meta = OXIDE_FACTORS[form] || OXIDE_FACTORS[form.replace(/[^A-Z0-9]/g, '')];
  if (value == null) return { ok: false, error: 'Indica value numérico.' };
  if (!meta) {
    return {
      ok: false,
      error: 'form debe ser P2O5, K2O, CaO, MgO o SO3 (factores NutriPlant).'
    };
  }
  const toElemental = direction === 'to_elemental' || direction === 'elemental' || direction === 'to_elem';
  const result = toElemental ? value / meta.factor : value * meta.factor;
  const tool = freeTool('conversor_oxido_elemental');
  return {
    ok: true,
    domain: 'nutriplant_public',
    input: { value, form, direction: toElemental ? 'to_elemental' : 'to_oxide' },
    factor: meta.factor,
    elemental_symbol: meta.elemental,
    result: Math.round(result * 10000) / 10000,
    note: 'Óxido = elemental × factor. N en fertilizante ya va elemental (no hay N-óxido de etiqueta).',
    chapter: chapter('unidades-ppm-meq-oxidos'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/** Ideal CIC NutriPlant (enmienda-free): K 5 %, Ca 75 %, Mg 15 %, H/Na/Al → 0. */
function soilCicBalance(params) {
  const k = num(params && (params.k_meq || params.K)) || 0;
  const ca = num(params && (params.ca_meq || params.Ca)) || 0;
  const mg = num(params && (params.mg_meq || params.Mg)) || 0;
  const h = num(params && (params.h_meq || params.H)) || 0;
  const na = num(params && (params.na_meq || params.Na)) || 0;
  const al = num(params && (params.al_meq || params.Al)) || 0;
  const cic = Math.round((k + ca + mg + h + na + al) * 100) / 100;
  if (cic <= 0) {
    return { ok: false, error: 'Indica cationes en meq/100 g (K, Ca, Mg, H, Na, Al). Suma CIC > 0.' };
  }
  function pct(v) {
    return Math.round((v / cic) * 1000) / 10;
  }
  const current = {
    K: { meq: k, pct: pct(k), band_pct: [3, 7] },
    Ca: { meq: ca, pct: pct(ca), band_pct: [65, 75] },
    Mg: { meq: mg, pct: pct(mg), band_pct: [10, 15] },
    H: { meq: h, pct: pct(h), band_pct: [0, 10] },
    Na: { meq: na, pct: pct(na), band_pct: [0, 1] },
    Al: { meq: al, pct: pct(al), band_pct: [0, 1] }
  };
  const ideal = {
    K: Math.round(cic * 0.05 * 100) / 100,
    Ca: Math.round(cic * 0.75 * 100) / 100,
    Mg: Math.round(cic * 0.15 * 100) / 100,
    H: 0,
    Na: 0,
    Al: 0
  };
  const delta_meq = {
    K: Math.round((ideal.K - k) * 100) / 100,
    Ca: Math.round((ideal.Ca - ca) * 100) / 100,
    Mg: Math.round((ideal.Mg - mg) * 100) / 100,
    H: Math.round((ideal.H - h) * 100) / 100,
    Na: Math.round((ideal.Na - na) * 100) / 100,
    Al: Math.round((ideal.Al - al) * 100) / 100
  };
  const tool = freeTool('enmienda');
  return {
    ok: true,
    domain: 'nutriplant_public',
    cic_meq_100g: cic,
    current,
    ideal_meq: ideal,
    delta_meq_to_ideal: delta_meq,
    note:
      'Ideal NutriPlant sobre CIC: K 5 %, Ca 75 %, Mg 15 %. Δ positivo = falta (aportar); negativo = exceso. ≠ kg/ha de Análisis suelo ni % meq de solución.',
    chapter: chapter('enmiendas-balance-cic'),
    free_tool: tool.ok ? tool.tool : null
  };
}

const EQ_CACO3 = 50.043;
const PPM_CACO3_PER_PPM_CA = 100.086 / 40.078;
const PPM_CACO3_PER_PPM_MG = 100.086 / 24.305;
const PPM_PER_DH = 17.848;
const PPM_PER_EH = 14.254;
const PPM_PER_FH = 10.0;

const ACIDS = [
  { id: 'acido_nitrico_55', name: 'Ácido Nítrico 55%', meqPerMl: 11.6, densityKgL: 1.37 },
  { id: 'acido_sulfurico_98', name: 'Ácido Sulfúrico 98%', meqPerMl: 36.7, densityKgL: 1.84 },
  { id: 'acido_fosforico_75', name: 'Ácido Fosfórico 75%', meqPerMl: 12.0, densityKgL: 1.57 },
  { id: 'acido_fosforico_85', name: 'Ácido Fosfórico 85%', meqPerMl: 14.6, densityKgL: 1.69 },
  { id: 'acido_citrico_anhidro', name: 'Ácido Cítrico Anhidro 99.5%', meqPerMl: 25.9, densityKgL: 1.665 }
];

function hardnessClassByPpm(ppm) {
  if (ppm < 60) return 'Blanda';
  if (ppm < 120) return 'Moderadamente dura';
  if (ppm < 180) return 'Dura';
  return 'Muy dura';
}

function waterHardness(params) {
  let ppm = num(params && (params.hardness_ppm || params.ppm_caco3 || params.ppm));
  if (ppm == null && params) {
    if (params.meq_L != null || params.meq != null) ppm = (num(params.meq_L || params.meq) || 0) * EQ_CACO3;
    else if (params.dh != null || params.dH != null) ppm = (num(params.dh || params.dH) || 0) * PPM_PER_DH;
    else if (params.eh != null) ppm = (num(params.eh) || 0) * PPM_PER_EH;
    else if (params.fh != null) ppm = (num(params.fh) || 0) * PPM_PER_FH;
  }
  let fromLab = null;
  const ca = num(params && (params.ca_ppm || params.Ca_ppm));
  const mg = num(params && (params.mg_ppm || params.Mg_ppm));
  const caMeq = num(params && (params.ca_meq || params.Ca_meq));
  const mgMeq = num(params && (params.mg_meq || params.Mg_meq));
  if (ca != null || mg != null || caMeq != null || mgMeq != null) {
    const partCa =
      caMeq != null ? caMeq * EQ_CACO3 : ca != null ? ca * PPM_CACO3_PER_PPM_CA : 0;
    const partMg =
      mgMeq != null ? mgMeq * EQ_CACO3 : mg != null ? mg * PPM_CACO3_PER_PPM_MG : 0;
    fromLab = {
      ca_as_caco3_ppm: Math.round(partCa * 100) / 100,
      mg_as_caco3_ppm: Math.round(partMg * 100) / 100,
      total_ppm: Math.round((partCa + partMg) * 100) / 100
    };
    if (ppm == null) ppm = fromLab.total_ppm;
  }
  if (ppm == null) {
    return {
      ok: false,
      error:
        'Indica hardness_ppm (CaCO₃) o meq_L/°dH/°e/°fH, o Ca/Mg de lab (ppm o meq).'
    };
  }
  const out = {
    ok: true,
    domain: 'nutriplant_public',
    hardness_ppm_caco3: Math.round(ppm * 100) / 100,
    class_es: hardnessClassByPpm(ppm),
    equivalents: {
      meq_L: Math.round((ppm / EQ_CACO3) * 100) / 100,
      dH: Math.round((ppm / PPM_PER_DH) * 100) / 100,
      eH: Math.round((ppm / PPM_PER_EH) * 100) / 100,
      fH: Math.round((ppm / PPM_PER_FH) * 100) / 100
    },
    from_lab_ca_mg: fromLab,
    chapter: chapter('agua-dureza-acidificacion-solubilidad'),
    free_tool: null,
    note: 'Clasificación tipo USGS alineada a la free tool. ≠ RAS/SAR completo ni programa ferti.'
  };
  const tool = freeTool('agua_dureza');
  out.free_tool = tool.ok ? tool.tool : null;

  const hco3 = num(params && (params.hco3_meq || params.HCO3));
  const co3 = num(params && (params.co3_meq || params.CO3)) || 0;
  const residual = num(params && (params.residual_meq || params.residual));
  const acidId = (params && (params.acid_id || params.acid)) || null;
  const volumeL = num(params && (params.volume_L || params.volumeL));
  const volumeM3 = num(params && (params.volume_m3 || params.volumeM3));
  if (hco3 != null && residual != null && acidId) {
    const acid = ACIDS.find((a) => a.id === acidId) || ACIDS.find((a) => a.id.indexOf(String(acidId)) >= 0);
    if (!acid) {
      out.acidification = { ok: false, error: 'acid_id desconocido', known: ACIDS.map((a) => a.id) };
    } else {
      const volM3 = volumeM3 != null ? volumeM3 : volumeL != null ? volumeL / 1000 : null;
      if (volM3 == null || volM3 <= 0) {
        out.acidification = { ok: false, error: 'Indica volume_L o volume_m3 para dosis de ácido.' };
      } else {
        const needMeq = Math.max(0, hco3 + co3 - residual);
        const meqPerM3 = needMeq * 1000;
        const mlPerM3 = acid.meqPerMl > 0 ? meqPerM3 / acid.meqPerMl : 0;
        const totalMl = mlPerM3 * volM3;
        out.acidification = {
          ok: true,
          acid: { id: acid.id, name: acid.name, meq_per_mL: acid.meqPerMl },
          need_meq_L: Math.round(needMeq * 100) / 100,
          mL_per_m3: Math.round(mlPerM3 * 100) / 100,
          total_mL: Math.round(totalMl * 100) / 100,
          kg_per_m3: Math.round(((mlPerM3 / 1000) * acid.densityKgL) * 1000) / 1000,
          note: 'No neutralizar al 100 % por defecto; valida pH final. Misma lógica que agua-dureza-free.'
        };
      }
    }
  }
  return out;
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function mmToVolTotal(mm, ha) {
  if (mm == null || !Number.isFinite(Number(mm)) || !Number.isFinite(ha) || ha <= 0) return null;
  return round1(Number(mm) * 10 * ha);
}

function volTotalToCropRefMm(volTotal, cropHa) {
  if (volTotal == null || !Number.isFinite(Number(volTotal)) || !Number.isFinite(cropHa) || cropHa <= 0) {
    return null;
  }
  return round1(Number(volTotal) / (cropHa * 10));
}

/** Misma fórmula que NpIrrBalance.computeBalanceMm. */
function computeBalanceMm(deficitCropMm, irrStripMm, cropHa, irrigatedHa) {
  if (deficitCropMm == null || !Number.isFinite(Number(deficitCropMm))) return null;
  const irr = irrStripMm != null && Number.isFinite(Number(irrStripMm)) ? Number(irrStripMm) : 0;
  const cHa = cropHa != null && Number.isFinite(cropHa) && cropHa > 0 ? cropHa : 1;
  const iHa =
    irrigatedHa != null && Number.isFinite(irrigatedHa) && irrigatedHa > 0 ? irrigatedHa : cHa;
  const deficitVol = mmToVolTotal(deficitCropMm, cHa);
  const irrVol = mmToVolTotal(irr, iHa);
  if (deficitVol == null || irrVol == null) return null;
  return volTotalToCropRefMm(deficitVol - irrVol, cHa);
}

async function fetchPeriodClimate(lat, lng, periodDays) {
  const days = periodDays === 1 || periodDays === 30 ? periodDays : 7;
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lng) +
    '&past_days=' +
    encodeURIComponent(days) +
    '&forecast_days=1&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
  const data = await res.json();
  const et0Arr = (data.daily && data.daily.et0_fao_evapotranspiration) || [];
  const rainArr = (data.daily && data.daily.precipitation_sum) || [];
  const sliceEt0 = et0Arr.slice(-(days));
  const sliceRain = rainArr.slice(-(days));
  const et0 = sliceEt0.reduce((a, b) => a + (Number(b) || 0), 0);
  const rain = sliceRain.reduce((a, b) => a + (Number(b) || 0), 0);
  return { period_days: days, et0_mm: round1(et0), rain_mm: round1(rain), source: 'Open-Meteo' };
}

async function calculateIrrigationBalance(params) {
  const periodDays = num(params && (params.period_days || params.periodDays)) || 7;
  const kc = num(params && params.kc);
  const cropHa = num(params && (params.crop_ha || params.area_ha)) || 1;
  const irrigatedHa = num(params && (params.irrigated_ha || params.irrigatedHa)) || cropHa;
  let et0 = num(params && (params.et0_mm || params.et0));
  let rain = num(params && (params.rain_mm || params.rain));
  let et0Source = et0 != null ? 'manual' : null;
  let rainSource = rain != null ? 'manual' : null;
  const lat = num(params && (params.lat || params.latitude));
  const lng = num(params && (params.lng || params.lon || params.longitude));
  if ((et0 == null || rain == null) && lat != null && lng != null) {
    try {
      const sat = await fetchPeriodClimate(lat, lng, periodDays);
      if (et0 == null) {
        et0 = sat.et0_mm;
        et0Source = 'satélite';
      }
      if (rain == null) {
        rain = params && params.macro_tunnel ? 0 : sat.rain_mm;
        rainSource = params && params.macro_tunnel ? 'macrotúnel' : 'satélite';
      }
    } catch (e) {
      return {
        ok: false,
        error: 'No se pudo obtener clima: ' + (e && e.message ? e.message : String(e)),
        hint: 'Pasa et0_mm y rain_mm a mano, o coords válidas.'
      };
    }
  }
  if (params && params.macro_tunnel) {
    rain = 0;
    rainSource = 'macrotúnel';
  }
  if (et0 == null || rain == null || kc == null) {
    return {
      ok: false,
      error: 'Indica kc + (et0_mm y rain_mm) o (lat/lng para satélite). Opcional: irrigation_mm, crop_ha, irrigated_ha.'
    };
  }
  let irrMm = num(params && (params.irrigation_mm || params.irrigationMm));
  const irrM3 = num(params && (params.irrigation_m3 || params.irrigationM3));
  if (irrMm == null && irrM3 != null && irrigatedHa > 0) {
    irrMm = round1(irrM3 / (irrigatedHa * 10));
  }
  if (irrMm == null) irrMm = 0;
  const etc = round1(et0 * kc);
  const deficitClimate = round1(et0 - rain);
  const deficitCrop = round1(etc - rain);
  const balance = computeBalanceMm(deficitCrop, irrMm, cropHa, irrigatedHa);
  const tool = freeTool('lamina_riego');
  return {
    ok: true,
    domain: 'nutriplant_public',
    period_days: periodDays === 1 || periodDays === 30 ? periodDays : 7,
    et0_mm: et0,
    rain_mm: rain,
    et0_source: et0Source,
    rain_source: rainSource,
    kc,
    etc_mm: etc,
    deficit_climate_mm: deficitClimate,
    deficit_crop_mm: deficitCrop,
    irrigation_mm: irrMm,
    balance_mm: balance,
    crop_ha: cropHa,
    irrigated_ha: irrigatedHa,
    volumes_m3: {
      deficit_crop_total: mmToVolTotal(deficitCrop, cropHa),
      irrigation_total: mmToVolTotal(irrMm, irrigatedHa),
      balance_total: balance != null ? mmToVolTotal(balance, cropHa) : null
    },
    point: lat != null && lng != null ? { lat, lng } : null,
    note:
      'Balance = (ETc − lluvia) − riego (franja). Positivo = falta agua. ≠ ISH ≠ VPD ≠ pulso hidro.',
    chapter: chapter('balance-hidrico-riego-clima'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/** Catálogo base granular-mix-free (óxidos %). */
const GRANULAR_MATERIALS = {
  Urea: { N: 46, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, SO4: 0 },
  'Fosfonitrato 33-03-00': { N: 33, P2O5: 3, K2O: 0, CaO: 0, MgO: 0, SO4: 0 },
  'Sulfato de Amonio Granular': { N: 21, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, SO4: 72 },
  DAP: { N: 18, P2O5: 46, K2O: 0, CaO: 0, MgO: 0, SO4: 0 },
  MAP: { N: 11, P2O5: 52, K2O: 0, CaO: 0, MgO: 0, SO4: 0 },
  'Superfosfato Simple': { N: 0, P2O5: 18, K2O: 0, CaO: 12, MgO: 0, SO4: 12 },
  'Superfosfato Triple': { N: 0, P2O5: 45, K2O: 0, CaO: 13, MgO: 0, SO4: 0 },
  'Sulfato de Potasio': { N: 0, P2O5: 0, K2O: 50, CaO: 0, MgO: 0, SO4: 52 },
  'Cloruro de Potasio': { N: 0, P2O5: 0, K2O: 60, CaO: 0, MgO: 0, SO4: 0 },
  'Nitrato de Potasio': { N: 13, P2O5: 0, K2O: 46, CaO: 0, MgO: 0, SO4: 0 },
  'Nitrato de Calcio': { N: 15.5, P2O5: 0, K2O: 0, CaO: 26, MgO: 0, SO4: 0 },
  'Sulfato de Magnesio': { N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 16, SO4: 40 },
  'Complejo Triple 16': { N: 16, P2O5: 16, K2O: 16, CaO: 0, MgO: 0, SO4: 0 }
};

const GRANULAR_KEYS = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'SO4'];

function granularMixBlend(params) {
  const materials = params && (params.materials || params.rows || params.mix);
  if (!Array.isArray(materials) || !materials.length) {
    return {
      ok: false,
      error:
        'Indica materials: [{ name|comp, pct }, ...]. name del catálogo free (Urea, MAP, DAP…) o comp: {N,P2O5,K2O,…}.',
      catalog_names: Object.keys(GRANULAR_MATERIALS)
    };
  }
  const doseKgHa = num(params && (params.dose_kg_ha || params.doseKgHa)) || 0;
  const totals = {};
  GRANULAR_KEYS.forEach((k) => {
    totals[k] = 0;
  });
  let sumPct = 0;
  const lines = [];
  for (let i = 0; i < materials.length; i++) {
    const row = materials[i] || {};
    const pct = num(row.pct != null ? row.pct : row.percent) || 0;
    sumPct += pct;
    let comp = row.comp || row.composition || null;
    const name = row.name || row.material || row.id;
    if (!comp && name && GRANULAR_MATERIALS[name]) comp = GRANULAR_MATERIALS[name];
    if (!comp && name) {
      const key = Object.keys(GRANULAR_MATERIALS).find(
        (k) => k.toLowerCase() === String(name).toLowerCase()
      );
      if (key) comp = GRANULAR_MATERIALS[key];
    }
    if (!comp) {
      return {
        ok: false,
        error: 'Material no resuelto: ' + (name || JSON.stringify(row)),
        catalog_names: Object.keys(GRANULAR_MATERIALS)
      };
    }
    const contrib = {};
    GRANULAR_KEYS.forEach((k) => {
      const v = (pct / 100) * (Number(comp[k]) || 0);
      contrib[k] = Math.round(v * 100) / 100;
      totals[k] += v;
    });
    lines.push({ name: name || 'custom', pct, contrib });
  }
  GRANULAR_KEYS.forEach((k) => {
    totals[k] = Math.round(totals[k] * 100) / 100;
  });
  const supply_kg_ha = {};
  GRANULAR_KEYS.forEach((k) => {
    supply_kg_ha[k] = Math.round(((doseKgHa * totals[k]) / 100) * 100) / 100;
  });
  let ratio = null;
  if (totals.N > 0 && totals.P2O5 > 0 && totals.K2O > 0) {
    const m = Math.min(totals.N, totals.P2O5, totals.K2O);
    ratio = {
      N: Math.round((totals.N / m) * 10) / 10,
      P2O5: Math.round((totals.P2O5 / m) * 10) / 10,
      K2O: Math.round((totals.K2O / m) * 10) / 10
    };
  }
  const tool = freeTool('granular_mix');
  return {
    ok: true,
    domain: 'nutriplant_public',
    sum_pct: Math.round(sumPct * 100) / 100,
    blend_pct: totals,
    npk_ratio: ratio,
    dose_kg_ha: doseKgHa,
    supply_kg_ha: doseKgHa > 0 ? supply_kg_ha : null,
    lines,
    note:
      sumPct < 99.5 || sumPct > 100.5
        ? 'Suma % de mezcla ≠ 100; revisa. Composición en óxidos de etiqueta.'
        : 'Mezcla en % m/m; aportes kg/ha = dosis × % / 100. ≠ fertirriego meq.',
    chapter: chapter('granular-mezclas'),
    free_tool: tool.ok ? tool.tool : null
  };
}

module.exports = {
  meqTriangleBalance,
  calculateIrrigationUniformity,
  classifyFoliarWindow,
  calculateIsh,
  calculateVpdAtPoint,
  convertOxideElemental,
  soilCicBalance,
  waterHardness,
  calculateIrrigationBalance,
  granularMixBlend
};
