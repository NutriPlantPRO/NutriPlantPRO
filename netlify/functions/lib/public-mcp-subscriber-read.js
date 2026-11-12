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

function diffPct(v, o) {
  if (v == null || o == null || o === 0) return null;
  return Math.round(((v - o) / o) * 1000) / 10;
}

function statusVsIdeal(lab, ideal, tolPct) {
  if (lab == null || ideal == null) return null;
  const tol = tolPct == null ? 10 : tolPct;
  const pct = Math.abs(diffPct(lab, ideal));
  if (pct == null) return null;
  if (pct <= tol) return 'ok';
  return lab < ideal ? 'bajo' : 'alto';
}

/** Filas didácticas tipo selector de elemento (lab vs ideal / DOP). */
function chartElementsFromPairs(pairs) {
  const rows = (pairs || [])
    .map((p) => {
      if (!p || p.lab == null) return null;
      const ideal = p.ideal != null ? p.ideal : null;
      const dop = p.dop_percent != null ? p.dop_percent : diffPct(p.lab, ideal);
      return {
        id: p.id,
        label: p.label || p.id,
        lab: p.lab,
        ideal,
        unit: p.unit || null,
        dop_or_diff_pct: dop,
        status: p.status || statusVsIdeal(p.lab, ideal, p.tol_pct),
        group: p.group || null
      };
    })
    .filter(Boolean);
  return rows.sort((a, b) => Math.abs(b.dop_or_diff_pct || 0) - Math.abs(a.dop_or_diff_pct || 0));
}

function fluidIonBag(bag, keys, idealObj) {
  const out = {};
  (keys || []).forEach((k) => {
    const ppm = numOrNull(bag[k + '_ppm'] != null ? bag[k + '_ppm'] : bag[k]);
    const meq = numOrNull(bag[k + '_meq']);
    const pct = numOrNull(bag[k + '_pct']);
    const ideal = idealObj ? numOrNull(idealObj[k]) : null;
    out[k] = {
      ppm,
      meq,
      pct_of_group: pct,
      ideal_ppm: ideal,
      diff_vs_ideal_ppm:
        ppm != null && ideal != null ? round2(ppm - ideal) : null,
      status: statusVsIdeal(ppm, ideal, 10)
    };
  });
  return out;
}

function summarizeSoilReport(a) {
  if (!a) return null;
  const fert = a.fertility || {};
  const ideal = fert.ideal || {};
  const cat = a.cations || {};
  const ph = a.phSection || {};
  const phys = a.physical || {};
  const ratios = a.ratios || {};
  const labPpm = {
    mo: numOrNull(fert.mo),
    n_no3: numOrNull(fert.nNo3),
    p: numOrNull(fert.p),
    k: numOrNull(fert.k),
    ca: numOrNull(fert.ca),
    mg: numOrNull(fert.mg),
    na: numOrNull(fert.na),
    s: numOrNull(fert.s),
    fe: numOrNull(fert.fe),
    mn: numOrNull(fert.mn),
    b: numOrNull(fert.b),
    zn: numOrNull(fert.zn),
    cu: numOrNull(fert.cu),
    al: numOrNull(fert.al),
    moly: numOrNull(fert.moly)
  };
  const idealPpm = {};
  Object.keys(labPpm).forEach((k) => {
    const src =
      ideal[k] != null
        ? ideal[k]
        : ideal[k === 'n_no3' ? 'nNo3' : k === 'moly' ? 'moly' : k];
    const v = numOrNull(src);
    if (v != null) idealPpm[k] = v;
  });
  if (ideal.nNo3 != null && idealPpm.n_no3 == null) idealPpm.n_no3 = numOrNull(ideal.nNo3);
  const kgHa = soilKgHaFromReport(a);
  const chartPairs = Object.keys(labPpm).map((k) => ({
    id: k,
    label: k === 'n_no3' ? 'N-NO₃' : k === 'moly' ? 'Mo' : k.toUpperCase(),
    lab: labPpm[k],
    ideal: idealPpm[k] != null ? idealPpm[k] : null,
    unit: 'ppm',
    group: ['fe', 'mn', 'b', 'zn', 'cu', 'al', 'moly'].indexOf(k) >= 0 ? 'micro' : 'macro'
  }));
  return {
    ...reportMeta(a),
    physical: {
      textural_class: phys.texturalClass || null,
      saturation_point_pct: numOrNull(phys.saturationPoint),
      field_capacity_pct: numOrNull(phys.fieldCapacity),
      wilting_point_pct: numOrNull(phys.wiltingPoint),
      hydraulic_conductivity: numOrNull(phys.hydraulicConductivity),
      bulk_density_g_cm3: numOrNull(phys.bulkDensity)
    },
    ph: numOrNull(ph.ph),
    ph_buffer: numOrNull(ph.phBuffer),
    salinity_ds_m: numOrNull(ph.salinity),
    total_carbonates_pct: numOrNull(ph.totalCarbonates),
    fertility: {
      p_method: fert.pMethod || null,
      micro_method: fert.microMethod || null,
      b_method: fert.bMethod || null,
      depth_cm: numOrNull(fert.depthCm),
      root_reach_pct: numOrNull(fert.reachPct),
      lab_ppm: labPpm,
      ideal_ppm: idealPpm,
      kg_ha: kgHa
    },
    fertility_lab_ppm: labPpm,
    cations_meq_100g: {
      ca: numOrNull(cat.ca),
      mg: numOrNull(cat.mg),
      k: numOrNull(cat.k),
      na: numOrNull(cat.na),
      al: numOrNull(cat.al),
      h: numOrNull(cat.h),
      cic: numOrNull(cat.cic)
    },
    cations_pct_cic: {
      ca: numOrNull(cat.pctCa),
      mg: numOrNull(cat.pctMg),
      k: numOrNull(cat.pctK),
      na: numOrNull(cat.pctNa),
      al: numOrNull(cat.pctAl),
      h: numOrNull(cat.pctH)
    },
    ratios: {
      ca_mg: numOrNull(ratios.caMg),
      mg_k: numOrNull(ratios.mgK),
      ca_mg_k: numOrNull(ratios.caMgK),
      ca_k: numOrNull(ratios.caK)
    },
    kg_ha: kgHa,
    chart_elements: chartElementsFromPairs(chartPairs),
    presentation_hint:
      'Tabla completa lab vs ideal (ppm) + kg/ha. Luego “selector” chart_elements (ordenado por |diff|). Cationes % CIC aparte. ≠ enmiendas CIC.',
    note: 'Análisis de suelo completo. kg/ha ≠ enmiendas CIC.'
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
  function row(val, opt, def, unit) {
    const v = numOrNull(val);
    const o = numOrNull(opt != null && opt !== '' ? opt : def);
    const dop = diffPct(v, o);
    return { value: v, optimal: o, unit, dop_percent: dop, status: statusVsIdeal(v, o, 10) };
  }
  const macros = {};
  const chartPairs = [];
  ['N', 'P', 'K', 'Ca', 'Mg', 'S'].forEach((n) => {
    const v = mac[n] != null ? mac[n] : mac[n.toLowerCase()];
    macros[n] = row(v, optMacro[n], defMacro[n], '%');
    chartPairs.push({
      id: n,
      label: n,
      lab: macros[n].value,
      ideal: macros[n].optimal,
      unit: '%',
      dop_percent: macros[n].dop_percent,
      group: 'macro'
    });
  });
  const micros = {};
  ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'].forEach((n) => {
    const v = mic[n] != null ? mic[n] : mac[n.toLowerCase()];
    micros[n] = row(v, optMicro[n], defMicro[n], 'ppm');
    chartPairs.push({
      id: n,
      label: n,
      lab: micros[n].value,
      ideal: micros[n].optimal,
      unit: 'ppm',
      dop_percent: micros[n].dop_percent,
      group: 'micro'
    });
  });
  return {
    ...reportMeta(a),
    macros,
    micros,
    chart_elements: chartElementsFromPairs(chartPairs),
    presentation_hint:
      'Tabla macros/micros con DOP %. Presenta chart_elements como “selector” (más desviado primero). ≠ VPD.',
    note: 'DOP % vs óptimo. ≠ VPD.'
  };
}

function summarizeAguaReport(a) {
  if (!a) return null;
  const cat = a.cations || {};
  const an = a.anions || {};
  const g = a.general || a.water || {};
  const micros = a.micros || {};
  const ideal = a.ideal || {};
  const cations = fluidIonBag(cat, ['ca', 'mg', 'k', 'na'], ideal);
  // fallbacks legacy
  ['ca', 'mg', 'k', 'na'].forEach((k) => {
    if (cations[k].ppm == null) cations[k].ppm = numOrNull(g[k]);
  });
  const anions = fluidIonBag(an, ['no3', 'so4', 'po4', 'cl', 'hco3', 'co3'], ideal);
  if (anions.hco3.meq == null) anions.hco3.meq = numOrNull(an.hco3_meq != null ? an.hco3_meq : g.hco3);
  if (anions.cl.ppm == null) anions.cl.ppm = numOrNull(an.cl_ppm != null ? an.cl_ppm : g.cl);
  const microOut = {};
  ['b', 'fe', 'mn', 'cu', 'zn', 'mo'].forEach((k) => {
    microOut[k] = numOrNull(micros[k]);
  });
  const chartPairs = [];
  Object.keys(cations).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k.toUpperCase(),
      lab: cations[k].ppm,
      ideal: cations[k].ideal_ppm,
      unit: 'ppm',
      group: 'cation'
    });
  });
  Object.keys(anions).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k.toUpperCase(),
      lab: anions[k].ppm != null ? anions[k].ppm : anions[k].meq,
      ideal: anions[k].ideal_ppm,
      unit: anions[k].ppm != null ? 'ppm' : 'meq/L',
      group: 'anion'
    });
  });
  return {
    ...reportMeta(a),
    m3_riego: numOrNull(a.m3Riego),
    general: {
      ce: numOrNull(g.ce),
      ph: numOrNull(g.ph),
      ras: numOrNull(g.ras != null ? g.ras : g.sar)
    },
    cations,
    anions,
    cations_ppm: {
      ca: cations.ca.ppm,
      mg: cations.mg.ppm,
      k: cations.k.ppm,
      na: cations.na.ppm
    },
    micros_ppm: microOut,
    acid_residual_meq_L: numOrNull(a.acidResidualMeq),
    acid_id: a.acidId || null,
    chart_elements: chartElementsFromPairs(chartPairs),
    presentation_hint:
      'Tabla iones (ppm/meq/% grupo) + micros + ácido residual. chart_elements como selector. ≠ dureza free tool.',
    note: 'Análisis agua del proyecto completo. ≠ dureza free tool genérica.'
  };
}

function summarizeSolucionReport(a) {
  if (!a) return null;
  const cat = a.cations || {};
  const an = a.anions || {};
  const g = a.general || {};
  const ideal = a.ideal || {};
  const micros = a.micros || {};
  const cations = fluidIonBag(cat, ['k', 'ca', 'mg', 'na'], ideal);
  const anions = fluidIonBag(an, ['no3', 'so4', 'po4', 'cl', 'hco3', 'co3'], ideal);
  const microOut = {};
  ['b', 'fe', 'mn', 'cu', 'zn', 'mo', 'n_nh4'].forEach((k) => {
    microOut[k] = {
      ppm: numOrNull(micros[k]),
      ideal_ppm: numOrNull(ideal[k]),
      status: statusVsIdeal(numOrNull(micros[k]), numOrNull(ideal[k]), 10)
    };
  });
  const chartPairs = [];
  Object.keys(cations).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k.toUpperCase(),
      lab: cations[k].ppm,
      ideal: cations[k].ideal_ppm,
      unit: 'ppm',
      group: 'cation'
    });
  });
  Object.keys(anions).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k.toUpperCase(),
      lab: anions[k].ppm,
      ideal: anions[k].ideal_ppm,
      unit: 'ppm',
      group: 'anion'
    });
  });
  Object.keys(microOut).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k === 'n_nh4' ? 'N-NH₄' : k.toUpperCase(),
      lab: microOut[k].ppm,
      ideal: microOut[k].ideal_ppm,
      unit: 'ppm',
      group: 'micro'
    });
  });
  return {
    ...reportMeta(a),
    general: {
      ce_ds_m: numOrNull(g.ce),
      ph: numOrNull(g.ph),
      ras: numOrNull(g.ras)
    },
    cations,
    anions,
    cations_ppm: {
      k: cations.k.ppm,
      ca: cations.ca.ppm,
      mg: cations.mg.ppm,
      na: cations.na.ppm
    },
    anions_ppm: {
      no3: anions.no3.ppm,
      so4: anions.so4.ppm,
      po4: anions.po4.ppm,
      cl: anions.cl.ppm,
      hco3: anions.hco3.ppm,
      co3: anions.co3.ppm
    },
    micros: microOut,
    chart_elements: chartElementsFromPairs(chartPairs),
    presentation_hint:
      'Tabla iones ppm/meq/% + micros vs ideal. chart_elements como selector. ≠ diseño hidroponia / programa del ciclo.',
    note: 'Lab solución nutritiva completo. ≠ diseño hidroponia / programa del ciclo.'
  };
}

function summarizePastaReport(a) {
  if (!a) return null;
  // Prefer estructura UI (general/cations/anions); fallback values legacy
  const g = a.general || {};
  const cat = a.cations || {};
  const an = a.anions || {};
  const ideal = a.ideal || {};
  const micros = a.micros || {};
  const vals = a.values || a.nutrients || a.elements || {};
  const hasFluid = !!(cat.ca_ppm != null || cat.k_ppm != null || an.no3_ppm != null || g.cee != null || g.phe != null);
  if (!hasFluid && vals && typeof vals === 'object') {
    const pick = {};
    Object.keys(vals).forEach((k) => {
      if (vals[k] != null && vals[k] !== '') pick[k] = vals[k];
    });
    const chartPairs = Object.keys(pick).map((k) => ({
      id: k,
      label: k,
      lab: numOrNull(pick[k]),
      ideal: numOrNull(ideal[k]),
      unit: null,
      group: 'value'
    }));
    return {
      ...reportMeta(a),
      values: Object.keys(pick).length ? pick : null,
      chart_elements: chartElementsFromPairs(chartPairs),
      note: 'Extracto de pasta (formato legado values).'
    };
  }
  const cations = fluidIonBag(cat, ['k', 'ca', 'mg', 'na'], ideal);
  const anions = fluidIonBag(an, ['no3', 'so4', 'po4', 'cl', 'hco3', 'co3'], ideal);
  const microOut = {};
  ['b', 'fe', 'mn', 'cu', 'zn', 'mo'].forEach((k) => {
    microOut[k] = {
      ppm: numOrNull(micros[k]),
      ideal_ppm: numOrNull(ideal[k]),
      status: statusVsIdeal(numOrNull(micros[k]), numOrNull(ideal[k]), 10)
    };
  });
  const chartPairs = [];
  Object.keys(cations).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k.toUpperCase(),
      lab: cations[k].ppm,
      ideal: cations[k].ideal_ppm,
      unit: 'ppm',
      group: 'cation'
    });
  });
  Object.keys(anions).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k.toUpperCase(),
      lab: anions[k].ppm,
      ideal: anions[k].ideal_ppm,
      unit: 'ppm',
      group: 'anion'
    });
  });
  Object.keys(microOut).forEach((k) => {
    chartPairs.push({
      id: k,
      label: k.toUpperCase(),
      lab: microOut[k].ppm,
      ideal: microOut[k].ideal_ppm,
      unit: 'ppm',
      group: 'micro'
    });
  });
  return {
    ...reportMeta(a),
    general: {
      ce: numOrNull(g.cee != null ? g.cee : g.ce),
      ph: numOrNull(g.phe != null ? g.phe : g.ph),
      ras: numOrNull(g.ras)
    },
    cations,
    anions,
    micros: microOut,
    chart_elements: chartElementsFromPairs(chartPairs),
    presentation_hint:
      'Tabla iones/micros vs ideal + chart_elements (selector). Semáforo ±10 % si hay Ideal.',
    note: 'Extracto de pasta completo.'
  };
}

function summarizeFrutaReport(a) {
  if (!a) return null;
  const mac = a.macros || {};
  const mic = a.micros || {};
  const calidad = a.calidad || {};
  const calcio = a.calcio || {};
  const optMacro = a.optimalMacro || {};
  const optMicro = a.optimalMicro || {};
  const optCalidad = a.optimalCalidad || {};
  const optCalcio = a.optimalCalcio || {};
  const defMacro = { N: 1.8, P: 0.25, K: 1.5, Ca: 0.25, Mg: 0.2, S: 0.18 };
  const defMicro = { Fe: 80, Mn: 40, Zn: 35, Cu: 10, B: 50, Mo: 0.5 };
  const defCalidad = { materiaSeca: 15, brix: 12, firmeza: 5, acidezTitulable: 0.5 };
  function iccRow(val, opt, def, unit) {
    const o = numOrNull(opt != null && opt !== '' ? opt : def);
    const v = numOrNull(val);
    const icc = diffPct(v, o);
    return { value: v, optimal: o, unit: unit || null, icc_percent: icc, status: statusVsIdeal(v, o, 10) };
  }
  const macros = {};
  const chartPairs = [];
  ['N', 'P', 'K', 'Ca', 'Mg', 'S'].forEach((n) => {
    macros[n] = iccRow(mac[n], optMacro[n], defMacro[n], '%');
    chartPairs.push({
      id: n,
      label: n,
      lab: macros[n].value,
      ideal: macros[n].optimal,
      unit: '%',
      dop_percent: macros[n].icc_percent,
      group: 'macro'
    });
  });
  const micros = {};
  ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'].forEach((n) => {
    micros[n] = iccRow(mic[n], optMicro[n], defMicro[n], 'ppm');
    chartPairs.push({
      id: n,
      label: n,
      lab: micros[n].value,
      ideal: micros[n].optimal,
      unit: 'ppm',
      dop_percent: micros[n].icc_percent,
      group: 'micro'
    });
  });
  const calidadOut = {};
  ['materiaSeca', 'brix', 'firmeza', 'acidezTitulable'].forEach((k) => {
    calidadOut[k] = iccRow(calidad[k], optCalidad[k], defCalidad[k], null);
    chartPairs.push({
      id: k,
      label: k,
      lab: calidadOut[k].value,
      ideal: calidadOut[k].optimal,
      unit: null,
      dop_percent: calidadOut[k].icc_percent,
      group: 'calidad'
    });
  });
  const calcioOut = {
    caTotal: iccRow(calcio.caTotal, optCalcio.caTotal, 20, null),
    caSolublePct: iccRow(calcio.caSolublePct, optCalcio.caSolublePct, 18, '%'),
    caLigadoPct: iccRow(calcio.caLigadoPct, optCalcio.caLigadoPct, 25, '%'),
    caInsolublePct: iccRow(calcio.caInsolublePct, optCalcio.caInsolublePct, 55, '%')
  };
  return {
    ...reportMeta(a),
    macros,
    micros,
    calidad: calidadOut,
    calcio: calcioOut,
    chart_elements: chartElementsFromPairs(chartPairs),
    presentation_hint:
      'Tabla macros/micros/calidad/Ca fraccionado con ICC %. chart_elements como selector (más desviado primero).',
    note: 'Análisis de fruta completo (ICC % vs óptimo).'
  };
}

function labsDeep(data, opts) {
  const latestOnly = !(opts && (opts.latest_only === false || opts.latest_only === 'false'));
  function pack(list, summarize) {
    const arr = Array.isArray(list) ? list.filter((x) => x && typeof x === 'object') : [];
    const chosen = latestOnly ? (latestOf(arr) ? [latestOf(arr)] : []) : arr;
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
    presentation_hint:
      'Didáctico y visual: 1) tabla completa del reporte, 2) chart_elements como “selector de elemento” (lab | ideal | % desvío | status), ordenado por |desvío|. ChatGPT no dibuja la gráfica web: usa tabla/markdown. Si piden un solo elemento, filtra chart_elements.',
    note:
      'Labs del proyecto (solo lectura) — payload completo. Por defecto el reporte más reciente; reports_count es el total. Historial: latest_only false. suelo kg/ha ≠ enmiendas CIC. foliar DOP ≠ VPD. solucion_nutritiva lab ≠ hidroponia.'
  };
}

function amendPct(v, cic) {
  if (!(cic > 0) || v == null) return null;
  return round2((v / cic) * 100);
}

function amendmentsDeep(data) {
  const sa = data && data.soilAnalysis;
  const am = data && data.amendments;
  const hasSa = sa && typeof sa === 'object';
  const hasAm = am && typeof am === 'object';
  if (!hasSa && !hasAm) {
    return { has_data: false, message: 'Sin pestaña Enmiendas / Balance de Bases guardada.' };
  }

  const initial = (hasSa && sa.initial) || {};
  const props = (hasSa && sa.properties) || {};
  const adj = (hasSa && sa.adjustments) || {};
  const k = numOrNull(initial.k) || 0;
  const ca = numOrNull(initial.ca) || 0;
  const mg = numOrNull(initial.mg) || 0;
  const h = numOrNull(initial.h) || 0;
  const na = numOrNull(initial.na) || 0;
  const al = numOrNull(initial.al) || 0;
  const cic =
    numOrNull(initial.cic) ||
    round2(k + ca + mg + h + na + al) ||
    null;

  const current_pct = {
    K: amendPct(k, cic),
    Ca: amendPct(ca, cic),
    Mg: amendPct(mg, cic),
    H: amendPct(h, cic),
    Na: amendPct(na, cic),
    Al: amendPct(al, cic)
  };

  // Ideal NutriPlant sobre CIC: K 5 %, Ca 75 %, Mg 15 %, H/Na/Al → 0
  const ideal_meq =
    cic > 0
      ? {
          K: round2(cic * 0.05),
          Ca: round2(cic * 0.75),
          Mg: round2(cic * 0.15),
          H: 0,
          Na: 0,
          Al: 0
        }
      : null;

  const target = {
    K: numOrNull(adj.k),
    Ca: numOrNull(adj.ca),
    Mg: numOrNull(adj.mg),
    H: numOrNull(adj.h),
    Na: numOrNull(adj.na),
    Al: numOrNull(adj.al)
  };
  const hasTarget = Object.keys(target).some((key) => target[key] != null);
  const compareTo = hasTarget
    ? target
    : ideal_meq
      ? {
          K: ideal_meq.K,
          Ca: ideal_meq.Ca,
          Mg: ideal_meq.Mg,
          H: ideal_meq.H,
          Na: ideal_meq.Na,
          Al: ideal_meq.Al
        }
      : null;

  const delta_meq = compareTo
    ? {
        K: round2((compareTo.K != null ? compareTo.K : 0) - k),
        Ca: round2((compareTo.Ca != null ? compareTo.Ca : 0) - ca),
        Mg: round2((compareTo.Mg != null ? compareTo.Mg : 0) - mg),
        H: round2((compareTo.H != null ? compareTo.H : 0) - h),
        Na: round2((compareTo.Na != null ? compareTo.Na : 0) - na),
        Al: round2((compareTo.Al != null ? compareTo.Al : 0) - al),
        vs: hasTarget ? 'adjustments_target' : 'ideal_cic'
      }
    : null;

  const reach = hasAm ? numOrNull(am.soilReachPercent) : null;
  const reachFactor = reach != null && reach > 0 ? reach / 100 : 1;
  const results = (hasAm && am.results && typeof am.results === 'object') ? am.results : {};
  const rawDetails = Array.isArray(results.rawDetails) ? results.rawDetails : [];
  const doses = rawDetails.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const base = numOrNull(item.amount) || 0;
    return {
      id: item.id || null,
      name: item.name || item.id || null,
      dose_kg_ha: round2(base * reachFactor),
      dose_kg_ha_before_reach: round2(base),
      contributions_kg_ha: {
        K: round2((numOrNull(item.k) || 0) * reachFactor),
        Ca: round2((numOrNull(item.ca) || 0) * reachFactor),
        Mg: round2((numOrNull(item.mg) || 0) * reachFactor),
        SO4: round2((numOrNull(item.so4) || 0) * reachFactor),
        Si: round2((numOrNull(item.si) || 0) * reachFactor)
      },
      limiting_element:
        item.elementoLimitante && typeof item.elementoLimitante === 'object'
          ? item.elementoLimitante.elemento || item.elementoLimitante.element || null
          : item.elementoLimitante || null,
      reason: item.razon || item.reason || null,
      warning: !!(item.advertencia || item.warning),
      warning_message: item.advertenciaMensaje || item.warning_message || null,
      is_custom:
        !!(item.isCustom || item.custom) ||
        (item.id != null && String(item.id).indexOf('custom') === 0)
    };
  }).filter(Boolean);

  const rawTotals = results.rawTotals && typeof results.rawTotals === 'object' ? results.rawTotals : null;
  const totals_kg_ha = rawTotals
    ? {
        Ca: round2((numOrNull(rawTotals.totalCa) || 0) * reachFactor),
        Mg: round2((numOrNull(rawTotals.totalMg) || 0) * reachFactor),
        K: round2((numOrNull(rawTotals.totalK) || 0) * reachFactor),
        Si: round2((numOrNull(rawTotals.totalSi) || 0) * reachFactor),
        Na_removal: round2((numOrNull(rawTotals.totalNaRemoval) || 0) * reachFactor)
      }
    : doses.length
      ? doses.reduce(
          (acc, d) => {
            acc.Ca = round2(acc.Ca + (d.contributions_kg_ha.Ca || 0));
            acc.Mg = round2(acc.Mg + (d.contributions_kg_ha.Mg || 0));
            acc.K = round2(acc.K + (d.contributions_kg_ha.K || 0));
            acc.Si = round2(acc.Si + (d.contributions_kg_ha.Si || 0));
            return acc;
          },
          { Ca: 0, Mg: 0, K: 0, Si: 0, Na_removal: 0 }
        )
      : null;

  const selected = hasAm
    ? Array.isArray(am.selected)
      ? am.selected
      : Array.isArray(am.selectedAmendments)
        ? am.selectedAmendments
        : []
    : [];

  const cationKeys = ['K', 'Ca', 'Mg', 'H', 'Na', 'Al'];
  const chart_elements = chartElementsFromPairs(
    cationKeys.map((key) => {
      const lab = key === 'K' ? k : key === 'Ca' ? ca : key === 'Mg' ? mg : key === 'H' ? h : key === 'Na' ? na : al;
      const ideal = compareTo ? compareTo[key] : null;
      return {
        id: key,
        label: key,
        lab,
        ideal,
        unit: 'meq/100g',
        group: 'cation_cic',
        dop_percent: delta_meq && cic > 0 ? round2(((lab - (ideal != null ? ideal : lab)) / (cic || 1)) * 100) : diffPct(lab, ideal)
      };
    })
  );
  const chart_doses = doses.map((d) => ({
    id: d.id,
    label: d.name,
    lab: d.dose_kg_ha,
    ideal: null,
    unit: 'kg/ha',
    group: 'amendment_dose',
    status: d.warning ? 'alto' : null,
    is_custom: d.is_custom
  }));

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
    current_saturation_pct: current_pct,
    properties: {
      ph: numOrNull(props.ph),
      density: numOrNull(props.density),
      depth_cm: numOrNull(props.depth)
    },
    adjustments_meq: target,
    ideal_meq_cic: ideal_meq,
    delta_meq,
    soil_reach_pct: reach,
    selected_amendments: selected,
    doses_kg_ha: doses,
    doses_count: doses.length,
    totals_kg_ha,
    results_summary: {
      type: results.type || null,
      amount: results.amount || null,
      ca_contribution: results.caContribution || null,
      na_removal: results.naRemoval || null,
      has_saved_calculation: doses.length > 0 || !!(results.isVisible || results.amount)
    },
    chart_elements,
    chart_doses,
    presentation_hint:
      'Didáctico: 1) tabla meq / % CIC / Δ, 2) chart_elements (cationes vs ideal), 3) chart_doses (enmiendas kg/ha). Filtra si piden un solo catión o una enmienda.',
    note:
      'Enmiendas / Balance de Bases completo: meq iniciales, % saturación CIC, ideal K5/Ca75/Mg15, Δ meq, % alcance, enmiendas seleccionadas y dosis kg/ha del último cálculo (incl. personalizadas). ≠ kg/ha Análisis suelo ≠ % meq solución.'
  };
}

const FERTI_ION_EQ = { N_NO3: 14, N_NH4: 14, P: 31, SO4: 16.03, Cl: 35.45, K: 39.1, Ca: 20.04, Mg: 12.15 };
const FERTI_SO4_TO_S = 96 / 32;
const FERTI_OXIDE_KEYS = ['N_NO3', 'N_NH4', 'P2O5', 'K2O', 'CaO', 'MgO', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2', 'Cl'];

function getFertirriegoProgram(data) {
  const f = data && data.fertirriego;
  if (!f || typeof f !== 'object') return null;
  if (f.program && typeof f.program === 'object') return f.program;
  if (Array.isArray(f.weeks)) return f;
  return null;
}

function fertiStageLabel(timeUnit, index) {
  const u = String(timeUnit || 'semana').toLowerCase();
  const isMes = u.indexOf('mes') >= 0 || u === 'month' || u === 'months';
  return (isMes ? 'Mes ' : 'Semana ') + (index + 1);
}

function fertiRound(n, d) {
  const p = Math.pow(10, d == null ? 2 : d);
  return Math.round(Number(n) * p) / p;
}

function fertiComputeStageIonic(week, m3ha, timeUnit, stageIndex) {
  if (!week) return null;
  const totals = week.totals || {};
  const m3 = numOrNull(m3ha) || 0;
  const kgS = (numOrNull(totals.SO4) || 0) / FERTI_SO4_TO_S + (numOrNull(totals.S) || 0);
  const kg = {
    N_NO3: numOrNull(totals.N_NO3) || 0,
    N_NH4: numOrNull(totals.N_NH4) || 0,
    P:
      numOrNull(totals.P) != null
        ? numOrNull(totals.P)
        : (numOrNull(totals.P2O5) || 0) * 0.436,
    SO4: kgS,
    Cl: numOrNull(totals.Cl) || 0,
    K:
      numOrNull(totals.K) != null
        ? numOrNull(totals.K)
        : (numOrNull(totals.K2O) || 0) * 0.83,
    Ca:
      numOrNull(totals.Ca) != null
        ? numOrNull(totals.Ca)
        : (numOrNull(totals.CaO) || 0) * 0.715,
    Mg:
      numOrNull(totals.Mg) != null
        ? numOrNull(totals.Mg)
        : (numOrNull(totals.MgO) || 0) * 0.603
  };
  const label = fertiStageLabel(timeUnit, stageIndex);
  const base = {
    stage_index: stageIndex,
    index: stageIndex,
    stage_label: label,
    label,
    stage_name: (week.stage || week.label) || '',
    m3ha_lamina: m3,
    m3ha: m3,
    kg_per_ha_elemental: {
      N_NO3: fertiRound(kg.N_NO3, 3),
      N_NH4: fertiRound(kg.N_NH4, 3),
      P: fertiRound(kg.P, 3),
      S: fertiRound(kg.SO4, 3),
      Cl: fertiRound(kg.Cl, 3),
      K: fertiRound(kg.K, 3),
      Ca: fertiRound(kg.Ca, 3),
      Mg: fertiRound(kg.Mg, 3)
    }
  };
  if (m3 <= 0) {
    return Object.assign({}, base, {
      note: 'Sin lámina m³/ha en esta etapa: solo kg/ha del programa (sin ppm/meq/%).'
    });
  }
  const ppm = {};
  Object.keys(kg).forEach((k) => {
    ppm[k] = fertiRound((kg[k] * 1000) / m3, 2);
  });
  const meq = {
    N_NO3: ppm.N_NO3 / FERTI_ION_EQ.N_NO3,
    N_NH4: ppm.N_NH4 / FERTI_ION_EQ.N_NH4,
    P: ppm.P / FERTI_ION_EQ.P,
    SO4: ppm.SO4 / FERTI_ION_EQ.SO4,
    Cl: ppm.Cl / FERTI_ION_EQ.Cl,
    K: ppm.K / FERTI_ION_EQ.K,
    Ca: ppm.Ca / FERTI_ION_EQ.Ca,
    Mg: ppm.Mg / FERTI_ION_EQ.Mg
  };
  Object.keys(meq).forEach((k) => {
    meq[k] = fertiRound(meq[k], 3);
  });
  const sumAnTriangle = meq.N_NO3 + meq.P + meq.SO4;
  const sumAnTotal = sumAnTriangle + meq.Cl;
  const sumCatKCaMg = meq.K + meq.Ca + meq.Mg;
  const sumCatTotal = sumCatKCaMg + meq.N_NH4;
  const percent = {
    anions_triangle_N_P_S: {
      N_NO3: sumAnTriangle > 0 ? fertiRound((meq.N_NO3 / sumAnTriangle) * 100, 1) : 0,
      P: sumAnTriangle > 0 ? fertiRound((meq.P / sumAnTriangle) * 100, 1) : 0,
      SO4: sumAnTriangle > 0 ? fertiRound((meq.SO4 / sumAnTriangle) * 100, 1) : 0
    },
    cations_K_Ca_Mg: {
      K: sumCatKCaMg > 0 ? fertiRound((meq.K / sumCatKCaMg) * 100, 1) : 0,
      Ca: sumCatKCaMg > 0 ? fertiRound((meq.Ca / sumCatKCaMg) * 100, 1) : 0,
      Mg: sumCatKCaMg > 0 ? fertiRound((meq.Mg / sumCatKCaMg) * 100, 1) : 0
    },
    Cl_on_total_anions_pct: sumAnTotal > 0 ? fertiRound((meq.Cl / sumAnTotal) * 100, 1) : 0,
    NH4_on_total_cations_pct: sumCatTotal > 0 ? fertiRound((meq.N_NH4 / sumCatTotal) * 100, 1) : 0
  };
  return Object.assign({}, base, {
    ppm,
    meq_per_L: meq,
    percent,
    sum_anions_meq_L: fertiRound(sumAnTotal, 3),
    sum_cations_meq_L: fertiRound(sumCatTotal, 3),
    note: 'ppm/meq/% desde kg/ha del programa ÷ lámina m³/ha de la etapa (fertilizante; agua aparte en water_contribution).'
  });
}

function fertiOxideTotals(week) {
  const t = (week && week.totals) || {};
  const out = {};
  FERTI_OXIDE_KEYS.forEach((k) => {
    if (k === 'SO4') {
      out.SO4 = fertiRound((numOrNull(t.SO4) || 0) + (numOrNull(t.S) || 0) * 3, 3);
      return;
    }
    const v = numOrNull(t[k]);
    if (v != null) out[k] = fertiRound(v, 3);
  });
  const nTot = (numOrNull(t.N_NO3) || 0) + (numOrNull(t.N_NH4) || 0) + (numOrNull(t.N) || 0);
  out.N = fertiRound(nTot, 3);
  return out;
}

function fertiIsCustomId(id) {
  return id != null && String(id).indexOf('custom_') === 0;
}

function fertiCustomMaterialsMap(data) {
  const f = (data && data.fertirriego) || {};
  const raw =
    (f.customMaterials && f.customMaterials.items) ||
    f.customMaterials ||
    f.fertiCustomMaterials ||
    (data && data.fertiCustomMaterials) ||
    [];
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
  const map = {};
  items.forEach((m) => {
    if (!m || typeof m !== 'object') return;
    const id = m.id || m.materialId || m.material_id;
    if (id) map[String(id)] = m;
  });
  return map;
}

function fertiCompositionPct(mat) {
  if (!mat || typeof mat !== 'object') return null;
  const keys = [
    'N_NO3',
    'N_NH4',
    'P2O5',
    'K2O',
    'CaO',
    'MgO',
    'SO4',
    'Cl',
    'Fe',
    'Mn',
    'B',
    'Zn',
    'Cu',
    'Mo',
    'SiO2'
  ];
  const out = {};
  let any = false;
  keys.forEach((k) => {
    const v = numOrNull(mat[k]);
    if (v != null) {
      out[k] = fertiRound(v, 4);
      any = true;
    }
  });
  return any ? out : null;
}

function fertiFertilizersFromProgram(program, week, customMap) {
  const cols = Array.isArray(program.columns) ? program.columns : [];
  const kgByCol = (week && week.kgByCol) || {};
  const customs = customMap || {};
  return cols
    .map((c) => {
      if (!c) return null;
      const mid = c.materialId || c.material_id || null;
      const custom = mid && customs[String(mid)] ? customs[String(mid)] : null;
      const kg = numOrNull(kgByCol[c.id]);
      const isCustom = fertiIsCustomId(mid) || !!(c.isCustom || c.custom || (custom && (custom.isCustom || custom.custom)));
      const composition =
        fertiCompositionPct(c) ||
        fertiCompositionPct(custom) ||
        (c.composition && typeof c.composition === 'object' ? fertiCompositionPct(c.composition) : null);
      return {
        column_id: c.id,
        material_id: mid,
        name: c.name || (custom && custom.name) || mid || c.id,
        kg_ha: kg != null ? fertiRound(kg, 3) : 0,
        unit: c.unit || (custom && custom.unit) || 'kg',
        is_custom: isCustom,
        composition_pct: composition
      };
    })
    .filter((x) => x && (x.kg_ha > 0 || x.material_id || x.name));
}

function fertiObjectiveDistribution(data, program) {
  const fromProgram = program && program.distribution && typeof program.distribution === 'object'
    ? program.distribution
    : null;
  const fromData =
    (data && data.extraccionEtapa) ||
    (data && data.extraccion) ||
    (data && data.calculators && data.calculators.extraccionEtapa) ||
    null;
  const raw = fromProgram || fromData;
  if (!raw || typeof raw !== 'object') return null;
  const nutrients = Array.isArray(raw.nutrients) ? raw.nutrients : [];
  const stages = Array.isArray(raw.stages) ? raw.stages : [];
  const pct = raw.pct && typeof raw.pct === 'object' ? raw.pct : {};
  if (!stages.length) return null;
  const water =
    Array.isArray(raw.waterDepthByStageM3ha)
      ? raw.waterDepthByStageM3ha.map((v) => numOrNull(v) || 0)
      : null;
  const pct_by_nutrient = {};
  nutrients.forEach((n) => {
    if (!n || !n.id) return;
    const arr = Array.isArray(pct[n.id]) ? pct[n.id] : [];
    pct_by_nutrient[n.id] = stages.map((_, i) => fertiRound(numOrNull(arr[i]) || 0, 1));
  });
  const by_stage = stages.map((st, i) => {
    const row = {
      stage: String(st || '').trim() || 'Etapa ' + (i + 1),
      pct: {},
      kg_ha: {}
    };
    if (water) row.m3ha_lamina = water[i] || 0;
    nutrients.forEach((n) => {
      if (!n || !n.id) return;
      const p = (numOrNull(pct_by_nutrient[n.id][i]) || 0) / 100;
      const total = numOrNull(n.total) || 0;
      row.pct[n.id] = pct_by_nutrient[n.id][i];
      row.kg_ha[n.id] = fertiRound(total * p, 3);
    });
    return row;
  });
  return {
    has_data: true,
    axis: raw.axis || null,
    title: raw.title || null,
    nutrients: nutrients.map((n) => ({
      id: n.id,
      label: n.label || n.id,
      total_kg_ha: numOrNull(n.total)
    })),
    stages_count: stages.length,
    pct_by_nutrient,
    lamina_m3ha_by_stage: water,
    by_stage,
    note: 'Distribución objetivo (% del requerimiento por etapa) + lámina. Es la curva de %; no sustituye el programa de fertilizantes.'
  };
}

function fertigationDeep(data, stageIndexParam) {
  const program = getFertirriegoProgram(data);
  if (!program || !Array.isArray(program.weeks) || !program.weeks.length) {
    return { has_program: false, message: 'No hay programa de fertirriego guardado.' };
  }
  const weeks = program.weeks;
  const timeUnit = program.timeUnit || 'semana';
  const waterArr = Array.isArray(program.chartWaterByStageM3ha) ? program.chartWaterByStageM3ha : [];
  const columns = Array.isArray(program.columns) ? program.columns : [];
  const customMap = fertiCustomMaterialsMap(data);
  const fertilizers_catalog = columns.map((c) => {
    const mid = c && (c.materialId || c.material_id);
    const custom = mid && customMap[String(mid)] ? customMap[String(mid)] : null;
    const isCustom =
      fertiIsCustomId(mid) || !!(c && (c.isCustom || c.custom)) || !!(custom && (custom.isCustom || custom.custom));
    return {
      column_id: c && c.id,
      material_id: mid || null,
      name: (c && c.name) || (custom && custom.name) || mid || (c && c.id),
      unit: (c && c.unit) || (custom && custom.unit) || 'kg',
      is_custom: isCustom,
      composition_pct:
        fertiCompositionPct(c) ||
        fertiCompositionPct(custom) ||
        (c && c.composition && typeof c.composition === 'object' ? fertiCompositionPct(c.composition) : null)
    };
  });

  const chart_nutrient_kg_ha_by_stage = {};
  FERTI_OXIDE_KEYS.concat(['N']).forEach((k) => {
    chart_nutrient_kg_ha_by_stage[k] = [];
  });
  const chart_percent_anions_by_stage = { N_NO3: [], P: [], SO4: [] };
  const chart_percent_cations_by_stage = { K: [], Ca: [], Mg: [] };
  const chart_lamina_m3ha_by_stage = [];

  const stages = weeks.map((w, i) => {
    const m3 = numOrNull(waterArr[i]) || 0;
    const ionic = fertiComputeStageIonic(w, m3, timeUnit, i);
    const oxide = fertiOxideTotals(w);
    Object.keys(chart_nutrient_kg_ha_by_stage).forEach((k) => {
      chart_nutrient_kg_ha_by_stage[k].push(oxide[k] != null ? oxide[k] : 0);
    });
    chart_lamina_m3ha_by_stage.push(m3);
    if (ionic && ionic.percent && ionic.percent.anions_triangle_N_P_S) {
      chart_percent_anions_by_stage.N_NO3.push(ionic.percent.anions_triangle_N_P_S.N_NO3);
      chart_percent_anions_by_stage.P.push(ionic.percent.anions_triangle_N_P_S.P);
      chart_percent_anions_by_stage.SO4.push(ionic.percent.anions_triangle_N_P_S.SO4);
    } else {
      chart_percent_anions_by_stage.N_NO3.push(null);
      chart_percent_anions_by_stage.P.push(null);
      chart_percent_anions_by_stage.SO4.push(null);
    }
    if (ionic && ionic.percent && ionic.percent.cations_K_Ca_Mg) {
      chart_percent_cations_by_stage.K.push(ionic.percent.cations_K_Ca_Mg.K);
      chart_percent_cations_by_stage.Ca.push(ionic.percent.cations_K_Ca_Mg.Ca);
      chart_percent_cations_by_stage.Mg.push(ionic.percent.cations_K_Ca_Mg.Mg);
    } else {
      chart_percent_cations_by_stage.K.push(null);
      chart_percent_cations_by_stage.Ca.push(null);
      chart_percent_cations_by_stage.Mg.push(null);
    }
    return Object.assign({}, ionic || {}, {
      fertilizers_kg_ha: fertiFertilizersFromProgram(program, w, customMap),
      totals_oxide_kg_ha: oxide
    });
  });

  const contrib = { N_NO3: 0, N_NH4: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, SO4: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0 };
  weeks.forEach((w) => {
    const t = (w && w.totals) || {};
    contrib.N_NO3 += numOrNull(t.N_NO3) || 0;
    contrib.N_NH4 += numOrNull(t.N_NH4) || 0;
    contrib.P2O5 += numOrNull(t.P2O5) || 0;
    contrib.K2O += numOrNull(t.K2O) || 0;
    contrib.CaO += numOrNull(t.CaO) || 0;
    contrib.MgO += numOrNull(t.MgO) || 0;
    contrib.SO4 += (numOrNull(t.SO4) || 0) + (numOrNull(t.S) || 0) * 3;
    ['Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo'].forEach((k) => {
      contrib[k] += numOrNull(t[k]) || 0;
    });
  });
  Object.keys(contrib).forEach((k) => {
    contrib[k] = fertiRound(contrib[k], 3);
  });

  const idx =
    stageIndexParam != null && stageIndexParam !== ''
      ? Math.max(0, Math.min(parseInt(stageIndexParam, 10) || 0, weeks.length - 1))
      : Math.max(0, Math.min(parseInt(program.chartSelectedStageIndex, 10) || 0, weeks.length - 1));
  const req = (data.fertirriego && data.fertirriego.requirements) || null;
  const objective = fertiObjectiveDistribution(data, program);

  const selectedStage = stages[idx] || null;
  const selOxide = (selectedStage && selectedStage.totals_oxide_kg_ha) || {};
  const chart_elements = chartElementsFromPairs(
    Object.keys(selOxide).map((k) => ({
      id: k,
      label: k,
      lab: selOxide[k],
      ideal: null,
      unit: 'kg/ha',
      group: 'stage_nutrient'
    }))
  );
  const chart_fertilizers = ((selectedStage && selectedStage.fertilizers_kg_ha) || [])
    .filter((f) => f && (f.kg_ha > 0 || f.is_custom))
    .map((f) => ({
      id: f.material_id || f.column_id,
      label: f.name,
      lab: f.kg_ha,
      ideal: null,
      unit: f.unit || 'kg/ha',
      group: f.is_custom ? 'custom_fertilizer' : 'fertilizer',
      is_custom: !!f.is_custom
    }));

  return {
    has_program: true,
    time_unit: timeUnit,
    stages_count: weeks.length,
    fertilizers_catalog,
    stages,
    selected_stage: selectedStage,
    chart_lamina_m3ha_by_stage,
    chart_nutrient_kg_ha_by_stage,
    chart_percent_meq_anions_by_stage: chart_percent_anions_by_stage,
    chart_percent_meq_cations_by_stage: chart_percent_cations_by_stage,
    objective_distribution_pct: objective,
    program_contribution_kg_ha_cycle: contrib,
    water_contribution: program.waterContribution || null,
    base_granular_contribution: program.baseContribution || null,
    granular_program_linked: program.granularProgramLinked === true,
    has_requirements: !!req,
    requirements_crop: req && (req.cropType || req.crop) ? req.cropType || req.crop : null,
    custom_fertilizers_in_program: fertilizers_catalog.filter((f) => f && f.is_custom).length,
    chart_elements,
    chart_fertilizers,
    presentation_hint:
      'Didáctico: 1) tabla 100% etapas/fertilizantes, 2) chart_elements nutrientes de la etapa activa, 3) chart_fertilizers dosis, 4) series chart_* (lámina, kg/ha, % meq) y distribución %. Si piden un nutriente o una etapa, filtra; no recortes por defecto.',
    note:
      'Programa fertirriego completo: fertilizantes por etapa (incl. personalizados custom_*), totales, composición %, lámina m³/ha → ppm/meq/%, series de gráfica de nutrientes y de % meq, y distribución objetivo (%). Muestra tablas con el 100% de etapas y fertilizantes; no recortes. stage_index elige etapa activa.'
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
      stages: cp.stages.map((st) => stageBrief(st, cp.activeStageId && st.id === cp.activeStageId))
    };
  }
  const activeBrief = stageBrief(active, true);
  const chart_elements = chartElementsFromPairs(
    meqKeys.map((k) => ({
      id: k,
      label: k,
      lab: activeBrief && activeBrief.meq_L ? activeBrief.meq_L[k] : null,
      ideal: null,
      unit: 'meq/L',
      group: 'design_meq'
    }))
  );
  const chart_fertilizers = fertilizers.map((f) => ({
    id: f.id || f.materialId || null,
    label: f.name || f.materialName || f.id || null,
    lab: f.dose != null ? numOrNull(f.dose) : f.amount != null ? numOrNull(f.amount) : null,
    ideal: null,
    unit: 'g/m³',
    group: 'hydro_fertilizer'
  })).filter((x) => x.lab != null);

  return {
    has_program: !!(stages.length || fertilizers.length || cycle),
    crop_type: h.cropType || h.cultivo || h.solutionName || null,
    design_stages_count: stages.length,
    design_stages: stages.map((st) => stageBrief(st, !!(active && st && st.id === active.id))),
    active_design_stage: activeBrief,
    fertilizers_count: fertilizers.length,
    fertilizers: fertilizers.map((f) => ({
      id: f.id || f.materialId || null,
      name: f.name || f.materialName || null,
      tank: f.tank || null,
      dose_g_per_m3: f.dose != null ? numOrNull(f.dose) : f.amount != null ? numOrNull(f.amount) : null
    })),
    volume_water_m3: numOrNull(h.volumeWaterM3),
    tank_volume_L: numOrNull(h.tankVolumeL),
    injection_L_per_m3: numOrNull(h.injectionRateLperM3),
    cycle_program: cycle,
    chart_elements,
    chart_fertilizers,
    presentation_hint:
      'Didáctico: 1) tabla etapas meq/L + micros, 2) chart_elements iones de la etapa activa, 3) chart_fertilizers dosis g/m³. Diseño ≠ ciclo ≠ lab solución.',
    note:
      'fertilizers es la lista completa del diseño activo, no una muestra. Diseño activo ≠ Programa del ciclo (cycleProgram) ≠ lab solucion_nutritiva.'
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
  const customRaw =
    (g.customMaterials && g.customMaterials.items) ||
    g.customMaterials ||
    prog.customMaterials ||
    [];
  const customItems = Array.isArray(customRaw) ? customRaw : [];
  const customMap = {};
  customItems.forEach((m) => {
    if (m && (m.id || m.materialId)) customMap[String(m.id || m.materialId)] = m;
  });

  const applications = apps.map((ap, i) => ({
    index: i,
    name: ap.name || ap.label || ap.stage || 'Aplicación ' + (i + 1),
    dose_kg_ha: numOrNull(ap.doseKgHa != null ? ap.doseKgHa : ap.dose),
    materials: Array.isArray(ap.materials)
      ? ap.materials.map((m) => {
          const mid = m.id || m.materialId || m.material_id || null;
          const custom = mid && customMap[String(mid)] ? customMap[String(mid)] : null;
          const isCustom =
            fertiIsCustomId(mid) ||
            !!(m.isCustom || m.custom) ||
            !!(custom && (custom.isCustom || custom.custom));
          const composition =
            fertiCompositionPct(m) ||
            fertiCompositionPct(custom) ||
            (m.composition && typeof m.composition === 'object' ? fertiCompositionPct(m.composition) : null);
          return {
            id: mid,
            name: m.name || (custom && custom.name) || mid || null,
            blend_pct: numOrNull(m.pct != null ? m.pct : m.percent),
            kg_ha: numOrNull(m.kgHa != null ? m.kgHa : m.dose),
            is_custom: isCustom,
            composition_pct: composition
          };
        })
      : null,
    totals: ap.totals || ap.composition || ap.nutrients || null
  }));

  let customCount = 0;
  applications.forEach((ap) => {
    (ap.materials || []).forEach((m) => {
      if (m && m.is_custom) customCount += 1;
    });
  });

  const chart_applications = applications.map((ap) => ({
    id: 'app_' + ap.index,
    label: ap.name,
    lab: ap.dose_kg_ha,
    ideal: null,
    unit: 'kg/ha',
    group: 'application'
  })).filter((x) => x.lab != null);
  const chart_materials = [];
  applications.forEach((ap) => {
    (ap.materials || []).forEach((m) => {
      if (!m) return;
      chart_materials.push({
        id: m.id || m.name,
        label: (ap.name ? ap.name + ' · ' : '') + (m.name || m.id || ''),
        lab: m.kg_ha != null ? m.kg_ha : m.blend_pct,
        ideal: null,
        unit: m.kg_ha != null ? 'kg/ha' : '% mezcla',
        group: m.is_custom ? 'custom_material' : 'material',
        is_custom: !!m.is_custom
      });
    });
  });
  const firstTotals = (applications[0] && applications[0].totals) || {};
  const chart_elements = chartElementsFromPairs(
    Object.keys(firstTotals || {}).map((k) => ({
      id: k,
      label: k,
      lab: numOrNull(firstTotals[k]),
      ideal: null,
      unit: 'kg/ha',
      group: 'app_totals'
    }))
  );

  return {
    has_program: apps.length > 0 || !!req || !!g.cropType,
    crop_type: g.cropType || null,
    applications_count: apps.length,
    applications,
    custom_fertilizers_in_program: customCount,
    has_requirements: !!req,
    requirements: req
      ? {
          crop: req.cropType || req.crop || null,
          target_yield: numOrNull(req.targetYield != null ? req.targetYield : req.yield),
          nutrients: req.nutrients || req.values || req.real || null
        }
      : null,
    chart_elements,
    chart_applications,
    chart_materials,
    presentation_hint:
      'Didáctico: 1) tabla aplicaciones/materiales, 2) chart_applications dosis, 3) chart_materials (incl. personalizados), 4) chart_elements totales de la 1ª app. Filtra si piden una aplicación o un material.',
    note:
      'Programa granular del proyecto (aplicaciones, materiales incl. personalizados, totales). ≠ fertirriego meq/% ≠ mezcla free tool suelta.'
  };
}

function vpdDeep(data) {
  const vpd = data.vpdAnalysis;
  if (!vpd || typeof vpd !== 'object') {
    return { has_data: false, message: 'Sin VPD guardado en el proyecto.' };
  }
  const env = vpd.environmental || {};
  const currentVpd = numOrNull(
    env.vpd != null ? env.vpd : env.VPD != null ? env.VPD : env.vpd_kPa
  );
  // Franja plataforma NutriPlant orientativa 0.5–1.5 kPa
  let vpdStatus = null;
  if (currentVpd != null) {
    if (currentVpd < 0.5) vpdStatus = 'bajo';
    else if (currentVpd <= 1.5) vpdStatus = 'ok';
    else vpdStatus = 'alto';
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
  out.chart_elements = chartElementsFromPairs([
    {
      id: 'VPD',
      label: 'VPD actual',
      lab: currentVpd,
      ideal: 1.0,
      unit: 'kPa',
      status: vpdStatus,
      group: 'vpd',
      tol_pct: 50
    },
    {
      id: 'VPD_max_rango',
      label: 'VPD máx. del rango guardado',
      lab: out.max_vpd_from_current_range ? out.max_vpd_from_current_range.vpd : null,
      ideal: 1.5,
      unit: 'kPa',
      group: 'vpd'
    },
    {
      id: 'T',
      label: 'Temperatura',
      lab: numOrNull(env.temperature != null ? env.temperature : env.temp),
      ideal: null,
      unit: '°C',
      group: 'env'
    },
    {
      id: 'HR',
      label: 'Humedad relativa',
      lab: numOrNull(env.humidity != null ? env.humidity : env.rh),
      ideal: null,
      unit: '%',
      group: 'env'
    }
  ]);
  out.presentation_hint =
    'Didáctico: 1) cifra VPD vs franja 0.5–1.5 kPa, 2) chart_elements (VPD/T/HR). ≠ ventana foliar ≠ pronóstico agroclimático.';
  out.note = 'VPD del predio guardado. ≠ ventana foliar ≠ pronóstico agroclimático.';
  return out;
}

function climateDeep(data) {
  const climateRadar = require('./public-mcp-climate-radar');
  return climateRadar.summarizeClimateAnalysis(data && data.climateAnalysis);
}

function summarizeExtractionState(raw) {
  if (!raw || typeof raw !== 'object') {
    return { has_data: false, message: 'Curva vacía o incompleta.' };
  }
  const nutrients = Array.isArray(raw.nutrients) ? raw.nutrients : [];
  const stages = Array.isArray(raw.stages) ? raw.stages : [];
  const pct = raw.pct && typeof raw.pct === 'object' ? raw.pct : {};
  const water = Array.isArray(raw.waterDepthByStageM3ha)
    ? raw.waterDepthByStageM3ha.map((v) => numOrNull(v) || 0)
    : null;
  const pct_by_nutrient = {};
  nutrients.forEach((n) => {
    if (!n || !n.id) return;
    const arr = Array.isArray(pct[n.id]) ? pct[n.id] : [];
    pct_by_nutrient[n.id] = stages.map((_, i) => round2(numOrNull(arr[i]) || 0));
  });
  const by_stage = stages.map((st, i) => {
    const name = String(st || '').trim() || 'Etapa ' + (i + 1);
    const kg_ha = {};
    const pct_row = {};
    nutrients.forEach((n) => {
      if (!n || !n.id) return;
      const total = numOrNull(n.total) || 0;
      const p = (numOrNull(pct_by_nutrient[n.id][i]) || 0) / 100;
      pct_row[n.id] = pct_by_nutrient[n.id][i];
      kg_ha[n.id] = round2(total * p);
    });
    const row = { stage: name, pct: pct_row, kg_ha };
    if (water) row.m3ha_lamina = water[i] || 0;
    return row;
  });
  const chart_elements = chartElementsFromPairs(
    nutrients.map((n) => ({
      id: n.id,
      label: n.label || n.id,
      lab: numOrNull(n.total),
      ideal: null,
      unit: 'kg/ha ciclo',
      group: 'extraction_total'
    }))
  );
  const chart_stages = by_stage
    .map((row, i) => ({
      id: 'stage_' + i,
      label: row.stage,
      lab: water ? water[i] : null,
      ideal: null,
      unit: 'm³/ha',
      group: 'lamina'
    }))
    .filter((x) => x.lab != null);

  return {
    has_data: nutrients.length > 0 && stages.length > 0,
    axis: raw.axis || null,
    title: raw.title || null,
    nutrients: nutrients.map((n) => ({
      id: n.id,
      label: n.label || n.id,
      total_kg_ha: numOrNull(n.total)
    })),
    stages_count: stages.length,
    pct_by_nutrient,
    lamina_m3ha_by_stage: water,
    by_stage,
    chart_percent_by_nutrient: pct_by_nutrient,
    chart_elements,
    chart_stages,
    presentation_hint:
      'Didáctico: 1) tabla % y kg/ha por etapa, 2) chart_percent_by_nutrient (selector de nutriente), 3) chart_elements totales ciclo, 4) chart_stages lámina. Filtra un nutriente si lo piden. ≠ programa de fertilizantes.',
    note: 'Distribución nutrimental por etapa (% y kg/ha). Curva de %; no es el programa de fertilizantes.'
  };
}

function extractionDeep(data) {
  const raw =
    data.extraccionEtapa ||
    data.extraccion ||
    (data.calculators && data.calculators.extraccionEtapa) ||
    null;
  if (!raw || typeof raw !== 'object') {
    return {
      has_data: false,
      message:
        'Sin curva de distribución nutrimental por etapa (%) guardada en este proyecto. La biblioteca «Mis curvas» del usuario va en extraction_library.'
    };
  }
  const out = summarizeExtractionState(raw);
  out.scope = 'project_active_curve';
  out.note =
    (out.note || '') +
    ' Esta es la curva activa del proyecto (calculators.extraccionEtapa). Las curvas de la biblioteca del usuario están en extraction_library.';
  return out;
}

/**
 * Biblioteca «Mis curvas guardadas» (por usuario, no por proyecto).
 * bucket: { version, updatedAt, presets: [{ id, title, state, savedAt }] }
 * También acepta presets legacy en project.calculators.extraccionEtapaPresets.
 */
function extractionLibraryDeep(bucketOrBuckets) {
  const buckets = Array.isArray(bucketOrBuckets)
    ? bucketOrBuckets
    : bucketOrBuckets
      ? [bucketOrBuckets]
      : [];
  const seen = {};
  const merged = [];
  buckets.forEach((bucket) => {
    if (!bucket || typeof bucket !== 'object') return;
    const list = Array.isArray(bucket.presets) ? bucket.presets : [];
    list.forEach((p) => {
      if (!p || typeof p !== 'object') return;
      const id = typeof p.id === 'string' && p.id ? p.id : '';
      if (id && seen[id]) return;
      if (id) seen[id] = true;
      merged.push(p);
    });
  });

  const curves = merged
    .map((p, i) => {
      const state = p.state && typeof p.state === 'object' ? p.state : p;
      const summarized = summarizeExtractionState(state);
      if (!summarized.has_data) return null;
      const title =
        (typeof p.title === 'string' && p.title.trim()) ||
        summarized.title ||
        'Curva ' + (i + 1);
      return {
        id: (typeof p.id === 'string' && p.id) || 'curve_' + (i + 1),
        title: String(title).slice(0, 120),
        saved_at: p.savedAt || p.saved_at || null,
        crop_hint: state.crop || state.cropType || state.cultivo || null,
        axis: summarized.axis,
        stages_count: summarized.stages_count,
        nutrients_count: (summarized.nutrients || []).length,
        curve: summarized
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.title).localeCompare(String(b.title), 'es'));

  return {
    has_data: curves.length > 0,
    curves_count: curves.length,
    curves,
    chart_curves: curves.map((c) => ({
      id: c.id,
      label: c.title,
      lab: c.stages_count,
      ideal: null,
      unit: 'etapas',
      group: 'saved_curve',
      nutrients_count: c.nutrients_count,
      crop_hint: c.crop_hint
    })),
    presentation_hint:
      'Didáctico: 1) lista chart_curves (selector de curva guardada), 2) al elegir una, muestra curve.by_stage / chart_percent_by_nutrient. Biblioteca por usuario («Mis curvas guardadas» en 📊 Distribución nutrimental por etapa). Sobrevive si borran un proyecto. ≠ curva activa del proyecto (extraction).',
    note:
      curves.length > 0
        ? 'Biblioteca de curvas del suscriptor (profiles.extraccion_etapa_presets + legacy proyecto).'
        : 'Sin curvas en «Mis curvas guardadas». El usuario las crea en la herramienta 📊 del dashboard.'
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
    extraction: null,
    extraction_library: null
  };
  const wantAll = !section || section === 'all';
  const wantExtraction =
    wantAll ||
    section === 'extraccion' ||
    section === 'extraction' ||
    section === 'distribucion' ||
    section === 'distribucion_nutrimental' ||
    section === 'curvas' ||
    section === 'presets' ||
    section === 'biblioteca_curvas';
  if (wantAll || section === 'labs' || section === 'analisis') {
    out.labs = labsDeep(data, params);
  }
  if (wantAll || section === 'enmiendas' || section === 'amendments' || section === 'cic' || section === 'balance_de_bases' || section === 'ajuste_de_bases' || section === 'bases') {
    out.amendments = amendmentsDeep(data);
  }
  if (wantAll || section === 'programs' || section === 'programas' || section === 'fertirriego' || section === 'hidro' || section === 'granular') {
    out.programs = {
      fertirriego: fertigationDeep(data, stageIndex),
      hidroponia: hydroDeep(data),
      granular: granularDeep(data)
    };
    if (section === 'fertirriego') {
      out.programs = { fertirriego: out.programs.fertirriego };
      // La distribución % vive junto al fertirriego en la UI.
      out.extraction = extractionDeep(data);
    }
    if (section === 'hidro' || section === 'hidroponia') out.programs = { hidroponia: out.programs.hidroponia };
    if (section === 'granular') out.programs = { granular: out.programs.granular };
  }
  if (wantAll || section === 'vpd') out.vpd = vpdDeep(data);
  if (
    wantAll ||
    section === 'clima' ||
    section === 'climate' ||
    section === 'radar' ||
    section === 'satelite' ||
    section === 'satelital' ||
    section === 'ndvi' ||
    section === 'lectura'
  ) {
    out.climate = climateDeep(data);
  }
  if (wantExtraction || section === 'fertirriego') {
    if (!out.extraction) out.extraction = extractionDeep(data);
    // Legacy presets guardados dentro del proyecto (migración); la biblioteca de usuario se completa en getMyProject.
    const projectPresets =
      data.calculators && data.calculators.extraccionEtapaPresets
        ? data.calculators.extraccionEtapaPresets
        : null;
    out.extraction_library = extractionLibraryDeep(projectPresets ? [projectPresets] : []);
  }

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
  extractionLibraryDeep,
  summarizeExtractionState,
  locationDeep,
  summarizeSoilReport,
  summarizeFoliarReport,
  summarizeAguaReport,
  summarizeSolucionReport,
  summarizePastaReport,
  summarizeFrutaReport,
  numOrNull
};
