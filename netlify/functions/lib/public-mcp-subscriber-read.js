'use strict';

/**
 * Lectura profunda solo-lectura del expediente del suscriptor (oleada 4).
 * Misma forma de datos que dashboard / admin; sin escritura ni roster.
 */

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function reportMeta(a) {
  return {
    id: a && a.id ? a.id : null,
    title: (a && (a.title || a.name)) || null,
    date: (a && a.date) || (a && a.meta && a.meta.date) || null
  };
}

function latestOf(list) {
  const arr = Array.isArray(list) ? list.filter((x) => x && typeof x === 'object') : [];
  if (!arr.length) return null;
  return arr.slice().sort((a, b) => {
    const da = Date.parse(a.date || (a.meta && a.meta.date) || '') || 0;
    const db = Date.parse(b.date || (b.meta && b.meta.date) || '') || 0;
    return db - da;
  })[0];
}

function soilKgHaFromReport(a) {
  const fert = (a && a.fertility) || {};
  const ideal = fert.ideal || {};
  const bulk = numOrNull(a.physical && a.physical.bulkDensity) || 1;
  const depth = numOrNull(fert.depthCm) || 20;
  const reach = numOrNull(fert.reachPct) || 100;
  const factor = 0.1 * depth * bulk * (reach / 100);
  const keys = ['mo', 'nNo3', 'p', 'k', 'ca', 'mg', 'na', 's', 'fe', 'mn', 'b', 'zn', 'cu', 'moly', 'al'];
  const nutrients = {};
  keys.forEach((key) => {
    const lab = numOrNull(fert[key]);
    const idealVal = numOrNull(ideal[key]);
    if (lab == null) return;
    nutrients[key] = {
      lab_ppm: lab,
      ideal_ppm: idealVal,
      diff_ppm: idealVal == null ? null : round2(lab - idealVal),
      kg_ha_adjustment: round2((idealVal == null ? lab : lab - idealVal) * factor)
    };
  });
  return {
    depth_cm: depth,
    bulk_density_g_cm3: bulk,
    root_reach_pct: reach,
    factor: round2(factor),
    nutrients,
    note: 'kg/ha = (lab−ideal)×0.1×prof×DA×(alcance/100). Criterio Análisis suelo (≠ enmiendas CIC).'
  };
}

function summarizeSoilReport(a) {
  if (!a) return null;
  const fert = a.fertility || {};
  const cat = a.cations || {};
  const ph = a.phSection || {};
  const phys = a.physical || {};
  return {
    ...reportMeta(a),
    ph: numOrNull(ph.ph),
    salinity_ds_m: numOrNull(ph.salinity),
    physical: {
      textural_class: phys.texturalClass || null,
      bulk_density_g_cm3: numOrNull(phys.bulkDensity)
    },
    fertility_lab_ppm: {
      mo: numOrNull(fert.mo),
      n_no3: numOrNull(fert.nNo3),
      p: numOrNull(fert.p),
      k: numOrNull(fert.k),
      ca: numOrNull(fert.ca),
      mg: numOrNull(fert.mg),
      s: numOrNull(fert.s),
      fe: numOrNull(fert.fe),
      zn: numOrNull(fert.zn),
      b: numOrNull(fert.b)
    },
    cations_meq_100g: {
      k: numOrNull(cat.k),
      ca: numOrNull(cat.ca),
      mg: numOrNull(cat.mg),
      na: numOrNull(cat.na),
      al: numOrNull(cat.al),
      h: numOrNull(cat.h),
      cic: numOrNull(cat.cic)
    },
    kg_ha: soilKgHaFromReport(a)
  };
}

function summarizeFoliarReport(a) {
  if (!a) return null;
  const mac = a.macros || a.values || a.nutrients || {};
  const mic = a.micros || {};
  const optMacro = a.optimalMacro || {};
  const optMicro = a.optimalMicro || {};
  const defMacro = { N: 3, P: 0.275, K: 2.5, Ca: 1.25, Mg: 0.4, S: 0.325 };
  const defMicro = { Fe: 150, Mn: 160, Zn: 60, Cu: 15, B: 62.5, Mo: 2.55 };
  function row(val, opt, def) {
    const v = numOrNull(val);
    const o = numOrNull(opt != null && opt !== '' ? opt : def);
    let dop = null;
    if (v != null && o != null && o !== 0) dop = Math.round(((v - o) / o) * 1000) / 10;
    return { value: v, optimal: o, dop_percent: dop };
  }
  const macros = {};
  ['N', 'P', 'K', 'Ca', 'Mg', 'S'].forEach((n) => {
    const v = mac[n] != null ? mac[n] : mac[n.toLowerCase()];
    macros[n] = row(v, optMacro[n], defMacro[n]);
  });
  const micros = {};
  ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'].forEach((n) => {
    const v = mic[n] != null ? mic[n] : mac[n.toLowerCase()];
    micros[n] = row(v, optMicro[n], defMicro[n]);
  });
  return { ...reportMeta(a), macros, micros, note: 'DOP % vs óptimo. ≠ VPD.' };
}

function summarizeAguaReport(a) {
  if (!a) return null;
  const cat = a.cations || {};
  const an = a.anions || {};
  const g = a.general || a.water || {};
  return {
    ...reportMeta(a),
    general: {
      ce: numOrNull(g.ce),
      ph: numOrNull(g.ph),
      ras: numOrNull(g.ras != null ? g.ras : g.sar)
    },
    cations_ppm: {
      ca: numOrNull(cat.ca_ppm != null ? cat.ca_ppm : g.ca),
      mg: numOrNull(cat.mg_ppm != null ? cat.mg_ppm : g.mg),
      k: numOrNull(cat.k_ppm != null ? cat.k_ppm : g.k),
      na: numOrNull(cat.na_ppm != null ? cat.na_ppm : g.na)
    },
    anions: {
      no3_ppm: numOrNull(an.no3_ppm),
      so4_ppm: numOrNull(an.so4_ppm),
      hco3_meq: numOrNull(an.hco3_meq != null ? an.hco3_meq : g.hco3),
      cl_ppm: numOrNull(an.cl_ppm != null ? an.cl_ppm : g.cl)
    },
    note: 'Análisis agua del proyecto. ≠ dureza free tool genérica.'
  };
}

function summarizeSolucionReport(a) {
  if (!a) return null;
  const cat = a.cations || {};
  const an = a.anions || {};
  const g = a.general || {};
  return {
    ...reportMeta(a),
    general: { ce: numOrNull(g.ce), ph: numOrNull(g.ph) },
    cations_ppm: {
      k: numOrNull(cat.k_ppm),
      ca: numOrNull(cat.ca_ppm),
      mg: numOrNull(cat.mg_ppm),
      na: numOrNull(cat.na_ppm)
    },
    anions_ppm: {
      no3: numOrNull(an.no3_ppm),
      so4: numOrNull(an.so4_ppm),
      po4: numOrNull(an.po4_ppm),
      cl: numOrNull(an.cl_ppm)
    },
    note: 'Lab solución nutritiva. ≠ diseño hidroponia / programa del ciclo.'
  };
}

function summarizePastaReport(a) {
  if (!a) return null;
  const vals = a.values || a.nutrients || a.elements || {};
  const pick = {};
  ['ce', 'ph', 'k', 'ca', 'mg', 'na', 'nNo3', 'n_no3', 'p', 'cl', 's'].forEach((k) => {
    if (vals[k] != null && vals[k] !== '') pick[k] = vals[k];
  });
  return { ...reportMeta(a), values: Object.keys(pick).length ? pick : null, note: 'Extracto de pasta.' };
}

function summarizeFrutaReport(a) {
  if (!a) return null;
  const mac = a.macros || {};
  const calidad = a.calidad || {};
  return {
    ...reportMeta(a),
    macros: {
      N: numOrNull(mac.N),
      P: numOrNull(mac.P),
      K: numOrNull(mac.K),
      Ca: numOrNull(mac.Ca),
      Mg: numOrNull(mac.Mg)
    },
    calidad: {
      brix: numOrNull(calidad.brix),
      materia_seca: numOrNull(calidad.materiaSeca),
      firmeza: numOrNull(calidad.firmeza)
    },
    note: 'Análisis de fruta.'
  };
}

function labsDeep(data, opts) {
  const latestOnly = !(opts && (opts.latest_only === false || opts.latest_only === 'false'));
  function pack(list, summarize) {
    const arr = Array.isArray(list) ? list.filter((x) => x && typeof x === 'object') : [];
    const chosen = latestOnly ? (latestOf(arr) ? [latestOf(arr)] : []) : arr.slice(0, 5);
    return {
      reports_count: arr.length,
      latest_only: latestOnly,
      reports: chosen.map(summarize).filter(Boolean)
    };
  }
  return {
    suelo: pack(data.soilAnalyses, summarizeSoilReport),
    agua: pack(data.aguaAnalyses, summarizeAguaReport),
    foliar: pack(data.foliarAnalyses, summarizeFoliarReport),
    fruta: pack(data.frutaAnalyses, summarizeFrutaReport),
    extracto_pasta: pack(data.extractoPastaAnalyses, summarizePastaReport),
    solucion_nutritiva: pack(data.solucionNutritivaAnalyses, summarizeSolucionReport),
    note:
      'Labs del proyecto (solo lectura). suelo kg/ha ≠ enmiendas CIC. foliar DOP ≠ VPD. solucion_nutritiva lab ≠ hidroponia.'
  };
}

function amendmentsDeep(data) {
  const sa = data && data.soilAnalysis;
  if (!sa || typeof sa !== 'object') {
    return { has_data: false, message: 'Sin pestaña Enmiendas (soilAnalysis) guardada.' };
  }
  const initial = sa.initial || {};
  const props = sa.properties || {};
  const adj = sa.adjustments || {};
  const cic =
    numOrNull(initial.cic) ||
    (numOrNull(initial.k) || 0) +
      (numOrNull(initial.ca) || 0) +
      (numOrNull(initial.mg) || 0) +
      (numOrNull(initial.h) || 0) +
      (numOrNull(initial.na) || 0) +
      (numOrNull(initial.al) || 0);
  return {
    has_data: true,
    initial_meq: {
      K: numOrNull(initial.k),
      Ca: numOrNull(initial.ca),
      Mg: numOrNull(initial.mg),
      H: numOrNull(initial.h),
      Na: numOrNull(initial.na),
      Al: numOrNull(initial.al),
      CIC: cic || null
    },
    properties: {
      ph: numOrNull(props.ph),
      density: numOrNull(props.density),
      depth_cm: numOrNull(props.depth)
    },
    adjustments_meq: {
      K: numOrNull(adj.k),
      Ca: numOrNull(adj.ca),
      Mg: numOrNull(adj.mg),
      H: numOrNull(adj.h),
      Na: numOrNull(adj.na),
      Al: numOrNull(adj.al)
    },
    note: 'Enmiendas / CIC (pestaña). ≠ reportes Análisis→Suelo ni % meq solución.'
  };
}

function getFertirriegoProgram(data) {
  const f = data && data.fertirriego;
  if (!f || typeof f !== 'object') return null;
  if (f.program && typeof f.program === 'object') return f.program;
  if (Array.isArray(f.weeks)) return f;
  return null;
}

function fertigationDeep(data, stageIndexParam) {
  const program = getFertirriegoProgram(data);
  if (!program || !Array.isArray(program.weeks) || !program.weeks.length) {
    return { has_program: false, message: 'No hay programa de fertirriego guardado.' };
  }
  const weeks = program.weeks;
  const timeUnit = program.timeUnit || 'semana';
  const waterArr = Array.isArray(program.chartWaterByStageM3ha) ? program.chartWaterByStageM3ha : [];
  const stages = weeks.map((w, i) => {
    const t = (w && w.totals) || {};
    const n =
      (numOrNull(t.N_NO3) || 0) + (numOrNull(t.N_NH4) || 0) + (numOrNull(t.N) || 0);
    return {
      index: i,
      label: (String(timeUnit).toLowerCase().indexOf('mes') >= 0 ? 'Mes ' : 'Semana ') + (i + 1),
      stage_name: (w && (w.stage || w.label)) || '',
      totals_kg_ha: {
        N: round2(n),
        N_NO3: numOrNull(t.N_NO3),
        N_NH4: numOrNull(t.N_NH4),
        P2O5: numOrNull(t.P2O5) != null ? numOrNull(t.P2O5) : numOrNull(t.P),
        K2O: numOrNull(t.K2O) != null ? numOrNull(t.K2O) : numOrNull(t.K),
        CaO: numOrNull(t.CaO) != null ? numOrNull(t.CaO) : numOrNull(t.Ca),
        MgO: numOrNull(t.MgO) != null ? numOrNull(t.MgO) : numOrNull(t.Mg),
        SO4: numOrNull(t.SO4)
      },
      m3ha: numOrNull(waterArr[i]) || 0
    };
  });
  const contrib = { N_NO3: 0, N_NH4: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, SO4: 0 };
  weeks.forEach((w) => {
    const t = (w && w.totals) || {};
    contrib.N_NO3 += numOrNull(t.N_NO3) || 0;
    contrib.N_NH4 += numOrNull(t.N_NH4) || 0;
    contrib.P2O5 += numOrNull(t.P2O5) || numOrNull(t.P) || 0;
    contrib.K2O += numOrNull(t.K2O) || numOrNull(t.K) || 0;
    contrib.CaO += numOrNull(t.CaO) || numOrNull(t.Ca) || 0;
    contrib.MgO += numOrNull(t.MgO) || numOrNull(t.Mg) || 0;
    contrib.SO4 += (numOrNull(t.SO4) || 0) + (numOrNull(t.S) || 0) * 3;
  });
  Object.keys(contrib).forEach((k) => {
    contrib[k] = round2(contrib[k]);
  });
  const idx =
    stageIndexParam != null && stageIndexParam !== ''
      ? Math.max(0, Math.min(parseInt(stageIndexParam, 10) || 0, weeks.length - 1))
      : Math.max(0, Math.min(parseInt(program.chartSelectedStageIndex, 10) || 0, weeks.length - 1));
  const req = (data.fertirriego && data.fertirriego.requirements) || null;
  return {
    has_program: true,
    time_unit: timeUnit,
    stages_count: weeks.length,
    stages,
    selected_stage: stages[idx] || null,
    program_contribution_kg_ha_cycle: contrib,
    water_contribution: program.waterContribution || null,
    base_granular_contribution: program.baseContribution || null,
    granular_program_linked: program.granularProgramLinked === true,
    has_requirements: !!req,
    requirements_crop: req && (req.cropType || req.crop) ? req.cropType || req.crop : null,
    note: 'Programa fertirriego del proyecto. Etapa seleccionable con stage_index.'
  };
}

function hydroDeep(data) {
  const h = data.hidroponia || data.hydroponics || {};
  if (!h || typeof h !== 'object') {
    return { has_program: false, message: 'Sin módulo Solución Nutritiva / hidroponía.' };
  }
  const stages = Array.isArray(h.stages) ? h.stages : [];
  const active = stages.find((s) => s && h.activeStageId && s.id === h.activeStageId) || stages[0] || null;
  const fertilizers = Array.isArray(h.fertilizers) ? h.fertilizers : [];
  const cp = h.cycleProgram && typeof h.cycleProgram === 'object' ? h.cycleProgram : null;
  const meqKeys = ['N_NH4', 'N_NO3', 'P', 'S', 'K', 'Ca', 'Mg'];
  function stageBrief(st, isActive) {
    if (!st) return null;
    const meq = st.meq || {};
    const ppm = st.ppm || {};
    const meqOut = {};
    meqKeys.forEach((k) => {
      const v = numOrNull(meq[k]);
      if (v != null && v !== 0) meqOut[k] = round2(v);
    });
    return {
      id: st.id || null,
      name: st.name || null,
      active: !!isActive,
      ce: numOrNull(st.ce),
      meq_L: meqOut,
      micros_ppm: {
        Fe: numOrNull(ppm.Fe),
        Mn: numOrNull(ppm.Mn),
        B: numOrNull(ppm.B),
        Zn: numOrNull(ppm.Zn),
        Cu: numOrNull(ppm.Cu),
        Mo: numOrNull(ppm.Mo),
        Cl: numOrNull(ppm.Cl)
      }
    };
  }
  let cycle = null;
  if (cp && Array.isArray(cp.stages) && cp.stages.length) {
    cycle = {
      program_name: cp.programName || null,
      stages_count: cp.stages.length,
      active_stage_id: cp.activeStageId || null,
      stages: cp.stages.slice(0, 12).map((st) => stageBrief(st, cp.activeStageId && st.id === cp.activeStageId))
    };
  }
  return {
    has_program: !!(stages.length || fertilizers.length || cycle),
    crop_type: h.cropType || h.cultivo || h.solutionName || null,
    design_stages_count: stages.length,
    active_design_stage: stageBrief(active, true),
    fertilizers_count: fertilizers.length,
    fertilizers_sample: fertilizers.slice(0, 8).map((f) => ({
      id: f.id || f.materialId || null,
      name: f.name || f.materialName || null,
      tank: f.tank || null,
      dose: f.dose != null ? f.dose : f.amount != null ? f.amount : null
    })),
    volume_water_m3: numOrNull(h.volumeWaterM3),
    tank_volume_L: numOrNull(h.tankVolumeL),
    injection_L_per_m3: numOrNull(h.injectionRateLperM3),
    cycle_program: cycle,
    note:
      'Diseño activo (stages/fertilizers) ≠ Programa del ciclo (cycleProgram) ≠ lab solucion_nutritiva.'
  };
}

function granularDeep(data) {
  const g = data.granular || data.nutricionGranular;
  if (!g || typeof g !== 'object') {
    return { has_program: false, message: 'Sin nutrición granular guardada.' };
  }
  const prog = g.program || {};
  const apps = Array.isArray(prog.applications) ? prog.applications : [];
  const req = g.requirements || null;
  return {
    has_program: apps.length > 0 || !!req || !!g.cropType,
    crop_type: g.cropType || null,
    applications_count: apps.length,
    applications: apps.slice(0, 12).map((ap, i) => ({
      index: i,
      name: ap.name || ap.label || ap.stage || 'Aplicación ' + (i + 1),
      dose_kg_ha: numOrNull(ap.doseKgHa != null ? ap.doseKgHa : ap.dose),
      materials: Array.isArray(ap.materials)
        ? ap.materials.slice(0, 8).map((m) => ({
            name: m.name || m.id || null,
            pct: numOrNull(m.pct != null ? m.pct : m.percent),
            kg_ha: numOrNull(m.kgHa != null ? m.kgHa : m.dose)
          }))
        : null,
      totals: ap.totals || ap.nutrients || null
    })),
    has_requirements: !!req,
    note: 'Programa granular del proyecto. ≠ fertirriego meq ≠ mezcla free tool suelta.'
  };
}

function vpdDeep(data) {
  const vpd = data.vpdAnalysis;
  if (!vpd || typeof vpd !== 'object') {
    return { has_data: false, message: 'Sin VPD guardado en el proyecto.' };
  }
  const out = {
    has_data: true,
    environmental: vpd.environmental || null,
    advanced: vpd.advanced || null,
    history_count: Array.isArray(vpd.history) ? vpd.history.length : 0,
    saved_range_tables_count: Array.isArray(vpd.rangeTables) ? vpd.rangeTables.length : 0
  };
  const table = vpd.currentRangeTable;
  if (table && Array.isArray(table.summaryRows)) {
    let maxVpd = null;
    table.summaryRows.forEach((row) => {
      const v = numOrNull(row.vpdMax != null ? row.vpdMax : row.maxVpd != null ? row.maxVpd : row.vpd);
      if (v != null && (!maxVpd || v > maxVpd.vpd)) {
        maxVpd = { vpd: v, at: row.at || row.date || row.datetime || null };
      }
    });
    if (maxVpd) out.max_vpd_from_current_range = maxVpd;
  }
  out.note = 'VPD del predio guardado. ≠ ventana foliar ≠ pronóstico agroclimático.';
  return out;
}

function climateDeep(data) {
  const ca = data.climateAnalysis;
  if (!ca || typeof ca !== 'object') {
    return { has_data: false, message: 'Sin Clima guardado (climateAnalysis).' };
  }
  const iqc = ca.irrigationQuickCalc || null;
  const roll = ca.rolling || null;
  const live = ca.lastReading || null;
  return {
    has_data: true,
    last_updated: ca.lastUpdated || null,
    last_tab: ca.lastTab || null,
    has_rainfall: !!(ca.rainfall && ca.rainfall.monthsPrev),
    has_et0: !!(ca.et0 && ca.et0.monthsPrev),
    irrigation_quick_calc: iqc
      ? {
          kc: numOrNull(iqc.kc),
          crop: iqc.cropName || iqc.crop || null,
          irrigation_m3: numOrNull(iqc.irrigationValue != null ? iqc.irrigationValue : iqc.irrigationM3),
          crop_ha: numOrNull(iqc.cropHa),
          irrigated_ha: numOrNull(iqc.irrigatedHa)
        }
      : null,
    rolling_saved: roll
      ? {
          has_data: true,
          keys: Object.keys(roll).slice(0, 8)
        }
      : { has_data: false },
    tiempo_actual_guardado: live
      ? {
          fetched_at: live.fetchedAt || null,
          temperature_C: numOrNull(live.temperature != null ? live.temperature : live.temperature_2m),
          rh_pct: numOrNull(live.humidity != null ? live.humidity : live.relative_humidity_2m)
        }
      : null,
    note: 'Clima del proyecto (guardado). Para satélite en vivo sin guardar: calculate_irrigation_balance / agroclimate_forecast_at_point.'
  };
}

function extractionDeep(data) {
  const raw = data.extraccionEtapa || data.extraccion || null;
  if (!raw || typeof raw !== 'object') {
    return { has_data: false, message: 'Sin extracción por etapa guardada.' };
  }
  const nutrients = Array.isArray(raw.nutrients) ? raw.nutrients : [];
  const stages = Array.isArray(raw.stages) ? raw.stages : [];
  const pct = raw.pct && typeof raw.pct === 'object' ? raw.pct : {};
  const by_stage = stages.slice(0, 12).map((st, i) => {
    const name = String(st || '').trim() || 'Etapa ' + (i + 1);
    const kg_ha = {};
    nutrients.forEach((n) => {
      if (!n || !n.id) return;
      const total = numOrNull(n.total) || 0;
      const arr = Array.isArray(pct[n.id]) ? pct[n.id] : [];
      const p = (numOrNull(arr[i]) || 0) / 100;
      kg_ha[n.id] = round2(total * p);
    });
    return { stage: name, kg_ha };
  });
  return {
    has_data: nutrients.length > 0 && stages.length > 0,
    nutrients: nutrients.map((n) => ({
      id: n.id,
      label: n.label || n.id,
      total_kg_ha: numOrNull(n.total)
    })),
    stages_count: stages.length,
    by_stage,
    note: 'Curva extracción del proyecto. No es dosis de fertilizante.'
  };
}

function locationDeep(data) {
  const loc = (data && data.location) || {};
  const center = loc.center;
  let point = null;
  if (center) {
    const lat = numOrNull(Array.isArray(center) ? center[0] : center.lat);
    const lng = numOrNull(Array.isArray(center) ? center[1] : center.lng);
    if (lat != null && lng != null) point = { lat, lng };
  }
  if (!point && loc.lat != null && loc.lng != null) {
    point = { lat: numOrNull(loc.lat), lng: numOrNull(loc.lng) };
  }
  return {
    has_polygon: !!(loc.polygon && loc.polygon.length >= 3),
    has_point: !!point,
    center: point,
    area_hectares: loc.areaHectares != null ? loc.areaHectares : null,
    elevation_m: numOrNull(loc.elevationM),
    vertices_count: Array.isArray(loc.polygon) ? loc.polygon.length : 0
  };
}

/**
 * Arma el bloque profundo según section / type.
 * section: all | labs | programs | enmiendas | vpd | clima | extraccion | location
 */
function buildDeepRead(data, params) {
  const section = String((params && (params.section || params.focus)) || 'all')
    .toLowerCase()
    .trim();
  const stageIndex = params && (params.stage_index != null ? params.stage_index : params.fertirriego_stage_index);
  const out = {
    location: locationDeep(data),
    labs: null,
    amendments: null,
    programs: null,
    vpd: null,
    climate: null,
    extraction: null
  };
  const wantAll = !section || section === 'all';
  if (wantAll || section === 'labs' || section === 'analisis') {
    out.labs = labsDeep(data, params);
  }
  if (wantAll || section === 'enmiendas' || section === 'amendments' || section === 'cic') {
    out.amendments = amendmentsDeep(data);
  }
  if (wantAll || section === 'programs' || section === 'programas' || section === 'fertirriego' || section === 'hidro' || section === 'granular') {
    out.programs = {
      fertirriego: fertigationDeep(data, stageIndex),
      hidroponia: hydroDeep(data),
      granular: granularDeep(data)
    };
    if (section === 'fertirriego') out.programs = { fertirriego: out.programs.fertirriego };
    if (section === 'hidro' || section === 'hidroponia') out.programs = { hidroponia: out.programs.hidroponia };
    if (section === 'granular') out.programs = { granular: out.programs.granular };
  }
  if (wantAll || section === 'vpd') out.vpd = vpdDeep(data);
  if (wantAll || section === 'clima' || section === 'climate') out.climate = climateDeep(data);
  if (wantAll || section === 'extraccion' || section === 'extraction') out.extraction = extractionDeep(data);

  // Compat type=suelo|foliar|agua → forzar labs + filtrar
  const type = String((params && (params.type || params.analysis_type)) || '').toLowerCase();
  if (type && type !== 'all' && out.labs) {
    const map = {
      suelo: 'suelo',
      soil: 'suelo',
      foliar: 'foliar',
      agua: 'agua',
      water: 'agua',
      fruta: 'fruta',
      fruit: 'fruta',
      pasta: 'extracto_pasta',
      extracto_pasta: 'extracto_pasta',
      solucion: 'solucion_nutritiva',
      solucion_nutritiva: 'solucion_nutritiva'
    };
    const key = map[type];
    if (key && out.labs[key]) {
      out.labs = { [key]: out.labs[key], note: out.labs.note };
    }
  }
  return out;
}

module.exports = {
  buildDeepRead,
  labsDeep,
  amendmentsDeep,
  fertigationDeep,
  hydroDeep,
  granularDeep,
  vpdDeep,
  climateDeep,
  extractionDeep,
  locationDeep,
  summarizeSoilReport,
  summarizeFoliarReport,
  summarizeAguaReport,
  numOrNull
};
