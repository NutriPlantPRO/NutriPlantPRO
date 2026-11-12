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
    note:
      'Labs del proyecto (solo lectura). Por defecto el reporte más reciente; reports_count es el total. Si piden historial o más análisis, se vuelve a consultar con latest_only false. suelo kg/ha ≠ enmiendas CIC. foliar DOP ≠ VPD. solucion_nutritiva lab ≠ hidroponia.'
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

  return {
    has_program: true,
    time_unit: timeUnit,
    stages_count: weeks.length,
    fertilizers_catalog,
    stages,
    selected_stage: stages[idx] || null,
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
  return {
    has_program: !!(stages.length || fertilizers.length || cycle),
    crop_type: h.cropType || h.cultivo || h.solutionName || null,
    design_stages_count: stages.length,
    design_stages: stages.map((st) => stageBrief(st, !!(active && st && st.id === active.id))),
    active_design_stage: stageBrief(active, true),
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
    note:
      'Programa granular del proyecto (aplicaciones, materiales incl. personalizados, totales). ≠ fertirriego meq/% ≠ mezcla free tool suelta.'
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
          keys: Object.keys(roll)
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
  const raw =
    data.extraccionEtapa ||
    data.extraccion ||
    (data.calculators && data.calculators.extraccionEtapa) ||
    null;
  if (!raw || typeof raw !== 'object') {
    return { has_data: false, message: 'Sin extracción / distribución objetivo por etapa guardada.' };
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
    note: 'Distribución objetivo / extracción por etapa (% y kg/ha). Es la gráfica de %; no es el programa de fertilizantes.'
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
  if (wantAll || section === 'clima' || section === 'climate') out.climate = climateDeep(data);
  if (wantAll || section === 'extraccion' || section === 'extraction' || section === 'distribucion') {
    out.extraction = extractionDeep(data);
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
  locationDeep,
  summarizeSoilReport,
  summarizeFoliarReport,
  summarizeAguaReport,
  numOrNull
};
