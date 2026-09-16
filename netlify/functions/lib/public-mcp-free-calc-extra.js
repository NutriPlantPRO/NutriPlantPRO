'use strict';

/**
 * Oleada 3 — resto de free tools (cálculo / lookup, misma lógica web).
 */
const fs = require('fs');
const path = require('path');
const core = require('./public-mcp-core');
const NpUnits = require(path.join(__dirname, '..', '..', '..', 'assets', 'np-units-core.js'));
require(path.join(__dirname, '..', '..', '..', 'assets', 'fertilizer-carbon-core.js'));
const NpCarbon = globalThis.NpFertilizerCarbon;

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

function clamp(x, a, b) {
  return Math.min(b, Math.max(a, x));
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

/* ——— N mineralizable ——— */
function calculateNMineralizable(params) {
  const P = num(params && (params.depth_cm || params.P || params.profundidad_cm));
  const DA = num(params && (params.bulk_density || params.DA || params.da));
  const R = clamp(num(params && (params.reach_pct || params.R)) != null ? num(params.reach_pct || params.R) : 70, 1, 100);
  const MO = clamp(num(params && (params.om_pct || params.MO || params.mo)) != null ? num(params.om_pct || params.MO || params.mo) : 2, 0, 100);
  const Nmo = clamp(
    num(params && (params.n_in_om_pct || params.Nmo || params.n_mo)) != null
      ? num(params.n_in_om_pct || params.Nmo || params.n_mo)
      : 5,
    0.1,
    100
  );
  let Tmin = num(params && (params.mineralization_pct || params.Tmin || params.t_min));
  if (Tmin == null) Tmin = 2;
  Tmin = clamp(Tmin, 1, 3);
  if (P == null || DA == null || P <= 0 || DA <= 0) {
    return {
      ok: false,
      error: 'Indica depth_cm (P) y bulk_density (DA g/cm³). Opcional: reach_pct, om_pct, n_in_om_pct, mineralization_pct (1–3).'
    };
  }
  const Mtotal = 10000 * (P / 100) * DA * 1000;
  const Meff = Mtotal * (R / 100);
  const MOkg = Meff * (MO / 100);
  const Norg = MOkg * (Nmo / 100);
  const Nmin = Norg * (Tmin / 100);
  const tool = freeTool('n_mineralizable');
  return {
    ok: true,
    domain: 'nutriplant_public',
    inputs: { depth_cm: P, bulk_density: DA, reach_pct: R, om_pct: MO, n_in_om_pct: Nmo, mineralization_pct: Tmin },
    mass_kg_ha: {
      soil_total: round2(Mtotal),
      soil_effective: round2(Meff),
      om: round2(MOkg),
      n_organic: round2(Norg),
      n_mineralizable_year: round2(Nmin)
    },
    formula: 'N_min = 10000×(P/100)×DA×1000×(R/100)×(MO/100)×(N_MO/100)×(T_min/100)',
    note: 'Estimación educativa kg N/ha·año. ≠ lab foliar ≠ dosis ferti.',
    chapter: chapter('n-mineralizable-agua-disponible-suelo'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Pulso hidro ——— */
function calculateHydroPulse(params) {
  const V = num(params && (params.container_L || params.V || params.volume_L));
  const awPct = num(params && (params.aw_pct || params.ATD || params.atd_pct));
  const depPct = num(params && (params.depletion_pct || params.agotamiento_pct));
  const drainPct = num(params && (params.drain_pct || params.drenaje_pct));
  const pots = num(params && (params.pots || params.macetas)) || 1;
  const drippers = num(params && (params.drippers_per_pot || params.goteros)) || 1;
  const lph = num(params && (params.dripper_lph || params.lph));
  if (!(V > 0) || !(awPct > 0) || !(depPct > 0) || drainPct == null || !(drainPct >= 0 && drainPct < 100) || !(lph > 0)) {
    return {
      ok: false,
      error:
        'Indica container_L, aw_pct (ATD %), depletion_pct, drain_pct (<100), dripper_lph. Opcional: pots, drippers_per_pot.'
    };
  }
  const aw = awPct / 100;
  const dep = depPct / 100;
  const drain = drainPct / 100;
  const awL = V * aw;
  const netL = V * aw * dep;
  const appliedL = netL / (1 - drain);
  const flowPerPot = drippers * lph;
  const minutes = (appliedL / flowPerPot) * 60;
  const totalL = appliedL * pots;
  const tool = freeTool('hidro_pulso_riego');
  return {
    ok: true,
    domain: 'nutriplant_public',
    available_water_L: round3(awL),
    net_L: round3(netL),
    pulse_L_per_pot: round3(appliedL),
    minutes: round2(minutes),
    total_L: round2(totalL),
    total_drippers: pots * drippers,
    total_flow_lph: round2(pots * drippers * lph),
    note: 'L_neto = V×ATD%×agot%; L_pulso = L_neto/(1−drenaje%). ≠ lámina suelo ≠ ISH.',
    chapter: chapter('hidroponia-solucion-por-etapa'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Magnitudes físicas ——— */
function convertPhysicalUnits(params) {
  const value = num(params && params.value);
  const from = String((params && params.from) || '').trim();
  const to = String((params && params.to) || '').trim();
  if (value == null || !from || !to) {
    return {
      ok: false,
      error: 'Indica value, from y to (ej. ha→m2, mm→in, kg→lb).',
      magnitudes: Object.keys(NpUnits.magnitudes || {})
    };
  }
  try {
    const result = NpUnits.convert(value, from, to);
    if (result == null || !Number.isFinite(Number(result))) {
      return { ok: false, error: 'Conversión no soportada: ' + from + ' → ' + to };
    }
    const tool = freeTool('conversor_magnitudes');
    return {
      ok: true,
      domain: 'nutriplant_public',
      value,
      from,
      to,
      result: Number(result),
      free_tool: tool.ok ? tool.tool : null,
      note: 'Misma tabla NpUnits que la web.'
    };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

/* ——— Solubilidad / IS ——— */
const SOLUBILITY_ROWS = [
  { name: 'Nitrato de amonio', formula: 'NH4NO3', solLo: 1850, solHi: 1950, is: 104.7 },
  { name: 'Nitrato de magnesio', formula: 'Mg(NO3)2', solLo: 1200, solHi: 1300, is: 60.5 },
  { name: 'Nitrato de calcio', formula: 'Ca(NO3)2', solLo: 1150, solHi: 1250, is: 40.7 },
  { name: 'Nitrato de potasio', formula: 'KNO3', solLo: 300, solHi: 330, is: 73.6 },
  { name: 'Urea', formula: 'CH4N2O', solLo: 1000, solHi: 1150, is: 75.4 },
  { name: 'Fosfato monoamónico (MAP)', formula: 'NH4H2PO4', solLo: 350, solHi: 400, is: 26.7 },
  { name: 'Fosfato monopotásico (MKP)', formula: 'KH2PO4', solLo: 200, solHi: 240, is: 8.4 },
  { name: 'Cloruro de potasio', formula: 'KCl', solLo: 320, solHi: 360, is: 116.3 },
  { name: 'Sulfato de amonio', formula: '(NH4)2SO4', solLo: 720, solHi: 780, is: 69.0 },
  { name: 'Sulfato de magnesio', formula: 'MgSO4', solLo: 680, solHi: 740, is: 44.0 },
  { name: 'Sulfato de potasio', formula: 'K2SO4', solLo: 105, solHi: 115, is: 46.0 },
  { name: 'Sulfato de calcio (yeso agrícola)', formula: 'CaSO4', solLo: 1.5, solHi: 2.8, is: 8 },
  { name: 'Carbonato de calcio', formula: 'CaCO3', solLo: 0.01, solHi: 0.03, is: null }
];

function lookupSolubilityIs(params) {
  const q = String((params && (params.q || params.name || params.formula)) || '')
    .trim()
    .toLowerCase();
  let list = SOLUBILITY_ROWS.slice();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().indexOf(q) >= 0 ||
        r.formula.toLowerCase().replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '').indexOf(q.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '')) >= 0
    );
  }
  const mapped = list.map((r) => {
    const mid = (r.solLo + r.solHi) / 2;
    return {
      name: r.name,
      formula: r.formula,
      solubility_g_L: { lo: r.solLo, hi: r.solHi, mid: round2(mid) },
      class_es: mid > 500 ? 'Alta' : mid >= 100 ? 'Media' : 'Baja',
      saline_index_NaNO3_100: r.is
    };
  });
  const tool = freeTool('solubilidad_is');
  return {
    ok: true,
    domain: 'nutriplant_public',
    count: mapped.length,
    results: mapped,
    note: 'Tabla educativa ~20–25 °C. IS relativo a NaNO₃=100. ≠ dosis de tanque.',
    chapter: chapter('agua-dureza-acidificacion-solubilidad'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Mulder ——— */
const MULDER_SPEC = {
  no3: { ion: 'NO3-', name: 'Nitrato', antagonists: ['cl'], synergists: ['k', 'nh4', 'moo4'] },
  nh4: { ion: 'NH4+', name: 'Amonio', antagonists: ['k', 'ca', 'mg'], synergists: ['h2po4', 'so4', 'no3'] },
  h2po4: {
    ion: 'H2PO4-/HPO4=',
    name: 'Fosfato',
    antagonists: ['zn', 'fe', 'cu', 'mn', 'ca'],
    synergists: ['nh4', 'k', 'mg']
  },
  k: { ion: 'K+', name: 'Potasio', antagonists: ['mg', 'ca', 'nh4'], synergists: ['no3', 'h2po4', 'so4', 'cl'] },
  ca: { ion: 'Ca2+', name: 'Calcio', antagonists: ['mg', 'k', 'nh4', 'h2po4'], synergists: ['so4', 'no3', 'moo4'] },
  mg: { ion: 'Mg2+', name: 'Magnesio', antagonists: ['k', 'ca', 'nh4'], synergists: ['h2po4', 'so4', 'no3'] },
  so4: { ion: 'SO4=', name: 'Sulfato', antagonists: ['moo4'], synergists: ['no3', 'nh4', 'k'] },
  fe: { ion: 'Fe', name: 'Hierro', antagonists: ['h2po4', 'zn', 'cu', 'mn'], synergists: ['no3', 'moo4'] },
  mn: { ion: 'Mn2+', name: 'Manganeso', antagonists: ['h2po4', 'fe', 'zn', 'cu'], synergists: ['no3'] },
  zn: { ion: 'Zn2+', name: 'Zinc', antagonists: ['h2po4', 'cu', 'ca', 'fe', 'mn'], synergists: [] },
  cu: { ion: 'Cu2+', name: 'Cobre', antagonists: ['zn', 'h2po4', 'fe', 'mn'], synergists: ['no3'] },
  b: { ion: 'B', name: 'Boro', antagonists: ['ca'], synergists: ['nh4'] },
  moo4: { ion: 'MoO4=', name: 'Molibdato', antagonists: ['so4'], synergists: ['no3', 'nh4'] },
  cl: { ion: 'Cl-', name: 'Cloruro', antagonists: ['no3'], synergists: ['k', 'nh4'] }
};

const ION_ALIASES = {
  n: 'no3',
  no3: 'no3',
  nitrato: 'no3',
  nh4: 'nh4',
  amonio: 'nh4',
  p: 'h2po4',
  fosfato: 'h2po4',
  h2po4: 'h2po4',
  k: 'k',
  potasio: 'k',
  ca: 'ca',
  calcio: 'ca',
  mg: 'mg',
  magnesio: 'mg',
  s: 'so4',
  so4: 'so4',
  sulfato: 'so4',
  fe: 'fe',
  hierro: 'fe',
  mn: 'mn',
  manganeso: 'mn',
  zn: 'zn',
  zinc: 'zn',
  cu: 'cu',
  cobre: 'cu',
  b: 'b',
  boro: 'b',
  mo: 'moo4',
  moo4: 'moo4',
  molibdeno: 'moo4',
  cl: 'cl',
  cloruro: 'cl'
};

function mulderInteractions(params) {
  const raw = String((params && (params.ion || params.element || params.q)) || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const id = ION_ALIASES[raw] || (MULDER_SPEC[raw] ? raw : null);
  if (!id || !MULDER_SPEC[id]) {
    return {
      ok: false,
      error: 'Indica ion (no3, nh4, h2po4, k, ca, mg, so4, fe, mn, zn, cu, b, moo4, cl).',
      ions: Object.keys(MULDER_SPEC)
    };
  }
  const s = MULDER_SPEC[id];
  function label(tid) {
    const x = MULDER_SPEC[tid];
    return x ? { id: tid, ion: x.ion, name: x.name } : { id: tid };
  }
  const tool = freeTool('interacciones');
  return {
    ok: true,
    domain: 'nutriplant_public',
    focal: { id, ion: s.ion, name: s.name },
    antagonists: (s.antagonists || []).map(label),
    synergists: (s.synergists || []).map(label),
    note: 'Referencia educativa Mulder (free tool). Validar con análisis y criterio local.',
    chapter: chapter('interacciones-mulder-compatibilidad'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Extracción por etapa ——— */
function distributeExtractionByStage(params) {
  const totals = params && (params.totals_kg_ha || params.totals || params.nutrients);
  const stages = params && (params.stages || params.pct_by_stage);
  if (!totals || typeof totals !== 'object') {
    return {
      ok: false,
      error: 'Indica totals_kg_ha: { N:120, P2O5:60, K2O:180, … } y stages: [{ name, pct }…] o pct_by_stage por nutriente.'
    };
  }
  const nutrientIds = Object.keys(totals).filter((k) => num(totals[k]) != null);
  if (!nutrientIds.length) return { ok: false, error: 'totals_kg_ha sin valores numéricos.' };

  let stageList = [];
  if (Array.isArray(stages)) {
    stageList = stages.map((s, i) => ({
      name: (s && (s.name || s.id)) || 'Etapa ' + (i + 1),
      pct: num(s && (s.pct != null ? s.pct : s.percent)) || 0
    }));
  } else if (stages && typeof stages === 'object') {
    // { vegetativo: 30, floracion: 40, ... } aplicado a todos
    stageList = Object.keys(stages).map((name) => ({ name, pct: num(stages[name]) || 0 }));
  } else {
    return { ok: false, error: 'stages debe ser array [{name,pct}] o mapa nombre→%.' };
  }
  const sumPct = stageList.reduce((a, s) => a + s.pct, 0);
  const by_stage = stageList.map((st) => {
    const row = { stage: st.name, pct: st.pct, kg_ha: {} };
    nutrientIds.forEach((nid) => {
      row.kg_ha[nid] = round2((num(totals[nid]) || 0) * (st.pct / 100));
    });
    return row;
  });
  const tool = freeTool('extraccion_etapa');
  return {
    ok: true,
    domain: 'nutriplant_public',
    totals_kg_ha: nutrientIds.reduce((o, k) => {
      o[k] = num(totals[k]);
      return o;
    }, {}),
    sum_pct: round2(sumPct),
    by_stage,
    note:
      sumPct < 99.5 || sumPct > 100.5
        ? 'Suma de % por etapa ≠ 100; revisa. No calcula dosis de fertilizante.'
        : 'Distribuye kg/ha totales × % etapa. No calcula dosis.',
    chapter: chapter('extraccion-nutrimental-por-etapa'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Agua disponible / textura ——— */
const TEXTURE_CC_PMP = {
  Arena: { ccLo: 5, ccHi: 12, pmpLo: 1, pmpHi: 5 },
  'Arena franca': { ccLo: 8, ccHi: 15, pmpLo: 2, pmpHi: 6 },
  'Franco arenoso': { ccLo: 10, ccHi: 16, pmpLo: 4, pmpHi: 8 },
  Franco: { ccLo: 18, ccHi: 26, pmpLo: 8, pmpHi: 14 },
  'Franco limoso': { ccLo: 24, ccHi: 32, pmpLo: 10, pmpHi: 18 },
  Limo: { ccLo: 26, ccHi: 34, pmpLo: 12, pmpHi: 18 },
  'Franco arcilloso': { ccLo: 28, ccHi: 36, pmpLo: 14, pmpHi: 20 },
  Arcilla: { ccLo: 34, ccHi: 45, pmpLo: 18, pmpHi: 26 }
};

function soilAvailableWater(params) {
  let cc = num(params && (params.cc_pct || params.fc_pct || params.cc));
  let pmp = num(params && (params.pmp_pct || params.pwp_pct || params.pmp));
  const texture = params && (params.texture || params.textura);
  if ((cc == null || pmp == null) && texture && TEXTURE_CC_PMP[texture]) {
    const ref = TEXTURE_CC_PMP[texture];
    cc = cc != null ? cc : (ref.ccLo + ref.ccHi) / 2;
    pmp = pmp != null ? pmp : (ref.pmpLo + ref.pmpHi) / 2;
  }
  const depth = num(params && (params.depth_cm || params.depth)) || 30;
  const areaHa = num(params && (params.area_ha || params.crop_ha)) || 1;
  const rootEff = num(params && (params.surface_pct || params.root_reach_pct || params.rootEff)) || 100;
  const theta = num(params && (params.theta_pct || params.theta_vol || params.humidity_pct));
  if (cc == null || pmp == null) {
    return {
      ok: false,
      error: 'Indica cc_pct y pmp_pct (% vol), o texture (Arena, Franco, Arcilla…).',
      textures: Object.keys(TEXTURE_CC_PMP)
    };
  }
  const adPct = Math.max(0, cc - pmp);
  const volSoilM3 = areaHa * 10000 * (depth / 100);
  const adM3 = volSoilM3 * (adPct / 100);
  const realM3 = adM3 * (rootEff / 100);
  const adMm = (adPct / 100) * depth * 10;
  const out = {
    ok: true,
    domain: 'nutriplant_public',
    cc_pct: cc,
    pmp_pct: pmp,
    available_water_pct: round2(adPct),
    available_water_mm_full: round2(adMm),
    available_water_m3_full: round2(adM3),
    available_water_m3_strip: round2(realM3),
    depth_cm: depth,
    area_ha: areaHa,
    surface_pct: rootEff,
    target_zone_pct_of_au: { low: 40, high: 60 },
    target_high_pct_vol: round2(pmp + adPct * 0.6),
    target_low_pct_vol: round2(pmp + adPct * 0.4),
    note: 'Capacidad útil = CC−PMP. Zona objetivo riego 40–60% AU. ≠ lámina clima ≠ ISH.',
    chapter: chapter('n-mineralizable-agua-disponible-suelo'),
    free_tool: null
  };
  if (theta != null) {
    const deficitPct = Math.max(0, cc - theta);
    const lamMm = (deficitPct / 100) * depth * 10;
    const lamM3 = volSoilM3 * (deficitPct / 100) * (rootEff / 100);
    out.theta_pct = theta;
    out.deficit_to_cc_pct = round2(deficitPct);
    out.depth_to_cc_mm = round2(lamMm);
    out.depth_to_cc_m3_strip = round2(lamM3);
  }
  const tool = freeTool('agua_textura');
  out.free_tool = tool.ok ? tool.tool : null;
  return out;
}

/* ——— Compatibilidad ——— */
const COMPAT_TR = {
  urea: { urea: true },
  nitrato_amonio: { nh4: true, no3: true },
  sulfonit_33_00_00_2s: { n: true, nh4: true, no3: true, so4: true },
  sulfato_amonio_soluble: { nh4: true, so4: true },
  nitrato_calcio_granular: { ca_no3: true, ca: true },
  nitrato_calcio_cristal: { ca_no3: true, ca: true },
  nitrato_magnesio: { no3: true, mg: true },
  map: { nh4: true, po4: true, p_acid: true },
  mkp: { k: true, po4: true, p_acid: true },
  nks: { no3: true, k: true, so4: true },
  sop: { k: true, so4: true },
  sulfato_magnesio: { mg: true, so4: true },
  mix_micros_edta: { chelate: true, edta: true, micro: true },
  quelato_fe: { chelate: true, edta: true, fe: true },
  fe_eddha: { chelate: true, eddha: true, fe: true },
  sulfatos_micros: { metal_sulfate: true, so4: true, micro: true },
  acido_fosforico_75: { strong_acid: true, h3po4: true, po4: true },
  acido_fosforico_85: { strong_acid: true, h3po4: true, po4: true },
  acido_nitrico_55: { strong_acid: true, hno3: true, no3: true },
  acido_sulfurico_98: { strong_acid: true, h2so4: true, so4: true }
};

const COMPAT_OVERRIDE = {
  'mkp|nitrato_calcio_granular': 'I',
  'map|nitrato_calcio_granular': 'I',
  'map|nitrato_calcio_cristal': 'I',
  'mkp|nitrato_calcio_cristal': 'I',
  'sulfonit_33_00_00_2s|nitrato_calcio_granular': 'I',
  'sulfonit_33_00_00_2s|nitrato_calcio_cristal': 'I',
  'sulfato_amonio_soluble|nitrato_calcio_granular': 'I',
  'sulfato_amonio_soluble|nitrato_calcio_cristal': 'I',
  'sulfato_magnesio|nitrato_calcio_granular': 'I',
  'sulfato_magnesio|nitrato_calcio_cristal': 'I',
  'sop|nitrato_calcio_granular': 'I',
  'sop|nitrato_calcio_cristal': 'I',
  'acido_fosforico_75|nitrato_calcio_granular': 'I',
  'acido_fosforico_75|nitrato_calcio_cristal': 'I',
  'acido_fosforico_85|nitrato_calcio_granular': 'I',
  'acido_fosforico_85|nitrato_calcio_cristal': 'I',
  'acido_sulfurico_98|nitrato_calcio_granular': 'I',
  'acido_sulfurico_98|nitrato_calcio_cristal': 'I',
  'nks|sulfato_amonio_soluble': 'R',
  'sop|nks': 'R',
  'map|sulfatos_micros': 'I',
  'mkp|sulfatos_micros': 'I',
  'mix_micros_edta|map': 'R',
  'mix_micros_edta|mkp': 'R',
  'fe_eddha|map': 'R',
  'fe_eddha|mkp': 'R',
  'nitrato_magnesio|mix_micros_edta': 'R',
  'nitrato_magnesio|quelato_fe': 'R'
};

function keyPair(ia, ib) {
  return ia < ib ? ia + '|' + ib : ib + '|' + ia;
}

function inferCompat(aid, bid) {
  if (aid === bid) return 'C';
  const k = keyPair(aid, bid);
  if (COMPAT_OVERRIDE[k]) return COMPAT_OVERRIDE[k];
  const A = COMPAT_TR[aid] || {};
  const B = COMPAT_TR[bid] || {};
  const ca = A.ca_no3 || B.ca_no3;
  function has(t) {
    return !!(A[t] || B[t]);
  }
  const isMap = aid === 'map' || bid === 'map';
  const isMkp = aid === 'mkp' || bid === 'mkp';
  if (ca && (has('po4') || has('p_acid') || (has('npk') && (A.po4 || B.po4)))) {
    if ((A.po4 || B.po4 || A.npk || B.npk) && !has('hno3')) return 'I';
  }
  if (ca && (has('h3po4') || (A.strong_acid && A.h3po4) || (B.strong_acid && B.h3po4))) return 'I';
  if (ca && (has('h2so4') || A.h2so4 || B.h2so4)) return 'I';
  if (ca && has('so4') && (A.so4 || B.so4)) {
    if ((A.nh4 && A.so4) || (B.nh4 && B.so4)) return 'I';
    if (aid === 'sop' || bid === 'sop' || aid === 'sulfato_magnesio' || bid === 'sulfato_magnesio') return 'I';
    if (aid === 'nks' || bid === 'nks') return 'I';
  }
  if (has('metal_sulfate') && (has('po4') || isMap || isMkp)) return 'I';
  if ((A.chelate || B.chelate) && (isMap || isMkp || (has('po4') && (A.npk || B.npk)))) return 'R';
  if ((aid === 'nks' || bid === 'nks') && has('nh4') && has('so4')) return 'R';
  if ((aid === 'nks' || bid === 'nks') && (aid === 'sop' || bid === 'sop')) return 'R';
  if (A.strong_acid && B.strong_acid && aid !== bid) return 'R';
  return 'C';
}

function fertilizerCompatibility(params) {
  const a = String((params && (params.a || params.fert_a || params.id_a)) || '')
    .trim()
    .toLowerCase();
  const b = String((params && (params.b || params.fert_b || params.id_b)) || '')
    .trim()
    .toLowerCase();
  if (!a || !b) {
    return {
      ok: false,
      error: 'Indica a y b (ids catálogo: map, mkp, nitrato_calcio_granular, sop…).',
      known_ids: Object.keys(COMPAT_TR)
    };
  }
  const level = inferCompat(a, b);
  const labels = { C: 'Compatible', R: 'Precaución', I: 'Incompatible' };
  const tool = freeTool('fertilizer_compatibility');
  return {
    ok: true,
    domain: 'nutriplant_public',
    a,
    b,
    level,
    label_es: labels[level],
    note: 'Riesgo típico en solución madre concentrada. En dilución baja el riesgo; A/B sigue siendo buena práctica.',
    chapter: chapter('interacciones-mulder-compatibilidad'),
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Composición por fórmula ——— */
const ELEM = {
  H: 1.008,
  C: 12.011,
  N: 14.01,
  O: 16.0,
  P: 30.97,
  K: 39.1,
  Ca: 40.08,
  Mg: 24.31,
  S: 32.07,
  Si: 28.085,
  Zn: 65.38,
  Fe: 55.845,
  Mn: 54.938,
  Cu: 63.546,
  B: 10.81,
  Mo: 95.95,
  Cl: 35.45,
  Na: 22.99
};
const OX = { P2O5: 2.29, K2O: 1.2, CaO: 1.4, MgO: 1.66, SiO2: 2.14 };
const SUBSCRIPT_MAP = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9'
};

function normalizeFormula(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  return text
    .split('')
    .map((ch) => SUBSCRIPT_MAP[ch] || ch)
    .join('')
    .replace(/[−]/g, '-')
    .replace(/\s+/g, '')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/:/g, '·')
    .replace(/\)\(/g, ')*(')
    .replace(/([0-9)\]])([\*+])([0-9(A-Z])/g, '$1·$3')
    .replace(/\.+/g, '.');
}

function parseNumber(str, index) {
  let i = index;
  let seenDot = false;
  let token = '';
  while (i < str.length) {
    const ch = str[i];
    if (ch >= '0' && ch <= '9') {
      token += ch;
      i += 1;
      continue;
    }
    if (ch === '.' && !seenDot) {
      seenDot = true;
      token += ch;
      i += 1;
      continue;
    }
    break;
  }
  if (!token) return { value: 1, index };
  const val = Number(token);
  if (!Number.isFinite(val) || val <= 0) throw new Error('Número inválido en fórmula.');
  return { value: val, index: i };
}

function parseTerms(str, index, stopChar) {
  const terms = [];
  let i = index;
  while (i < str.length) {
    const ch = str[i];
    if (stopChar && ch === stopChar) return { terms, index: i + 1 };
    if (ch === '+' || ch === '-' || ch === '^') {
      i += 1;
      continue;
    }
    if (ch === '(') {
      const nested = parseTerms(str, i + 1, ')');
      const cnt = parseNumber(str, nested.index);
      terms.push({ type: 'group', terms: nested.terms, count: cnt.value });
      i = cnt.index;
      continue;
    }
    if (ch >= 'A' && ch <= 'Z') {
      let symbol = ch;
      i += 1;
      if (i < str.length && str[i] >= 'a' && str[i] <= 'z') {
        symbol += str[i];
        i += 1;
      }
      if (!Object.prototype.hasOwnProperty.call(ELEM, symbol)) throw new Error('Elemento no soportado: ' + symbol);
      const cnt = parseNumber(str, i);
      terms.push({ type: 'element', symbol, count: cnt.value });
      i = cnt.index;
      continue;
    }
    throw new Error('Carácter inválido en fórmula: ' + ch);
  }
  if (stopChar) throw new Error('Paréntesis sin cerrar en fórmula.');
  return { terms, index: i };
}

function collectElements(terms, mult, out) {
  terms.forEach((t) => {
    if (t.type === 'element') out[t.symbol] = (out[t.symbol] || 0) + t.count * mult;
    else collectElements(t.terms, mult * t.count, out);
  });
}

function countMotifInTerms(terms, mult, motif) {
  let total = 0;
  for (let i = 0; i <= terms.length - motif.length; i += 1) {
    let ok = true;
    for (let j = 0; j < motif.length; j += 1) {
      const term = terms[i + j];
      const m = motif[j];
      if (!term || term.type !== 'element' || term.symbol !== m.symbol || Math.abs(term.count - m.count) > 1e-9) {
        ok = false;
        break;
      }
    }
    if (ok) total += mult;
  }
  terms.forEach((t) => {
    if (t.type === 'group') total += countMotifInTerms(t.terms, mult * t.count, motif);
  });
  return total;
}

function parseCompound(rawFormula) {
  const normalized = normalizeFormula(rawFormula);
  if (!normalized) throw new Error('Escribe una fórmula.');
  const parts = normalized.split(/[·•.]/).filter(Boolean);
  if (!parts.length) throw new Error('Fórmula no válida.');
  const segments = [];
  parts.forEach((part) => {
    const m = part.match(/^(\d+(?:\.\d+)?)(.*)$/);
    let coef = 1;
    let body = part;
    if (m && m[2]) {
      coef = Number(m[1]);
      body = m[2];
    }
    const parsed = parseTerms(body, 0, null);
    if (parsed.index !== body.length) throw new Error('Error al parsear la fórmula.');
    segments.push({ coef, terms: parsed.terms });
  });
  const atomCounts = {};
  segments.forEach((seg) => collectElements(seg.terms, seg.coef, atomCounts));
  let mw = 0;
  Object.keys(atomCounts).forEach((sym) => {
    mw += atomCounts[sym] * ELEM[sym];
  });
  if (!(mw > 0)) throw new Error('No se pudo calcular el PM.');
  const no3Count = segments.reduce(
    (s, seg) => s + countMotifInTerms(seg.terms, seg.coef, [{ symbol: 'N', count: 1 }, { symbol: 'O', count: 3 }]),
    0
  );
  const nh4Count = segments.reduce(
    (s, seg) => s + countMotifInTerms(seg.terms, seg.coef, [{ symbol: 'N', count: 1 }, { symbol: 'H', count: 4 }]),
    0
  );
  return { normalized, atomCounts, mw, no3Count, nh4Count };
}

function pctElem(atomCounts, sym, mw) {
  return ((atomCounts[sym] || 0) * ELEM[sym] / mw) * 100;
}

function fertilizerCompositionFromFormula(params) {
  const molecules = params && (params.molecules || params.rows || params.blend);
  const single = params && (params.formula || params.q);
  let rows = [];
  if (Array.isArray(molecules) && molecules.length) {
    rows = molecules.map((m) => ({
      formula: m.formula || m.q || m,
      pct: num(m.pct != null ? m.pct : m.percent) != null ? num(m.pct != null ? m.pct : m.percent) : 100
    }));
  } else if (single) {
    rows = [{ formula: single, pct: 100 }];
  } else {
    return {
      ok: false,
      error: 'Indica formula (ej. KNO3, Ca(NO3)2·4H2O) o molecules: [{ formula, pct }].'
    };
  }
  const others = num(params && (params.others_pct || params.others)) || 0;
  const pureRows = [];
  const totals = {};
  let sumPct = others;
  try {
    rows.forEach((row) => {
      const parsed = parseCompound(row.formula);
      const c = parsed.atomCounts;
      const mw = parsed.mw;
      const elemental = {
        N: pctElem(c, 'N', mw),
        P: pctElem(c, 'P', mw),
        K: pctElem(c, 'K', mw),
        Ca: pctElem(c, 'Ca', mw),
        Mg: pctElem(c, 'Mg', mw),
        S: pctElem(c, 'S', mw),
        Si: pctElem(c, 'Si', mw),
        Zn: pctElem(c, 'Zn', mw),
        Fe: pctElem(c, 'Fe', mw),
        Mn: pctElem(c, 'Mn', mw),
        B: pctElem(c, 'B', mw),
        Cu: pctElem(c, 'Cu', mw),
        Mo: pctElem(c, 'Mo', mw)
      };
      const nAtoms = c.N || 0;
      let N_NO3 = 0;
      let N_NH4 = 0;
      if (nAtoms > 0) {
        let no3Atoms = Math.max(0, parsed.no3Count);
        let nh4Atoms = Math.max(0, parsed.nh4Count);
        const forms = no3Atoms + nh4Atoms;
        if (forms > nAtoms && forms > 0) {
          const k = nAtoms / forms;
          no3Atoms *= k;
          nh4Atoms *= k;
        }
        N_NO3 = forms > 0 ? elemental.N * (no3Atoms / nAtoms) : 0;
        N_NH4 = forms > 0 ? elemental.N * (nh4Atoms / nAtoms) : 0;
      }
      const oxides = {
        P2O5: elemental.P * OX.P2O5,
        K2O: elemental.K * OX.K2O,
        CaO: elemental.Ca * OX.CaO,
        MgO: elemental.Mg * OX.MgO,
        SiO2: elemental.Si * OX.SiO2
      };
      const pct = row.pct;
      sumPct += pct;
      pureRows.push({
        formula: parsed.normalized,
        mw: round2(mw),
        pct_in_product: pct,
        elemental: Object.keys(elemental).reduce((o, k) => {
          o[k] = round2(elemental[k]);
          return o;
        }, {}),
        N_NO3: round2(N_NO3),
        N_NH4: round2(N_NH4),
        oxides: Object.keys(oxides).reduce((o, k) => {
          o[k] = round2(oxides[k]);
          return o;
        }, {})
      });
      const weight = pct / 100;
      Object.keys(elemental).forEach((k) => {
        totals[k] = (totals[k] || 0) + elemental[k] * weight;
      });
      totals.N_NO3 = (totals.N_NO3 || 0) + N_NO3 * weight;
      totals.N_NH4 = (totals.N_NH4 || 0) + N_NH4 * weight;
      Object.keys(oxides).forEach((k) => {
        totals[k] = (totals[k] || 0) + oxides[k] * weight;
      });
    });
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
  Object.keys(totals).forEach((k) => {
    totals[k] = round2(totals[k]);
  });
  const tool = freeTool('fertilizer_composition');
  return {
    ok: true,
    domain: 'nutriplant_public',
    sum_pct: round2(sumPct),
    others_pct: others,
    molecules: pureRows,
    product_weighted_pct: totals,
    note: 'Composición teórica de molécula pura × % en producto. Misma lógica fertilizer-composition-free.',
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Pronóstico agroclimático (punto) ——— */
async function agroclimateForecastAtPoint(params) {
  const lat = num(params && (params.lat || params.latitude));
  const lng = num(params && (params.lng || params.lon || params.longitude));
  const kc = num(params && params.kc) != null ? num(params.kc) : 1;
  if (lat == null || lng == null) {
    return { ok: false, error: 'Indica lat y lng. Opcional kc (ETc=ETo×Kc).' };
  }
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lng) +
    '&past_days=7&forecast_days=7' +
    '&daily=temperature_2m_min,temperature_2m_max,relative_humidity_2m_min,relative_humidity_2m_max,' +
    'precipitation_sum,et0_fao_evapotranspiration,shortwave_radiation_sum' +
    '&hourly=temperature_2m,relative_humidity_2m&timezone=auto';
  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
    data = await res.json();
  } catch (e) {
    return { ok: false, error: 'No se pudo obtener clima: ' + (e && e.message ? e.message : String(e)) };
  }
  const daily = data.daily || {};
  const days = (daily.time || []).map((date, i) => {
    const et0 = daily.et0_fao_evapotranspiration ? Number(daily.et0_fao_evapotranspiration[i]) : null;
    const rain = daily.precipitation_sum ? Number(daily.precipitation_sum[i]) : null;
    return {
      date,
      t_min_C: daily.temperature_2m_min ? Number(daily.temperature_2m_min[i]) : null,
      t_max_C: daily.temperature_2m_max ? Number(daily.temperature_2m_max[i]) : null,
      rh_min_pct: daily.relative_humidity_2m_min ? Number(daily.relative_humidity_2m_min[i]) : null,
      rh_max_pct: daily.relative_humidity_2m_max ? Number(daily.relative_humidity_2m_max[i]) : null,
      rain_mm: rain,
      eto_mm: et0,
      etc_mm: et0 != null ? round2(et0 * kc) : null
    };
  });
  const tool = freeTool('pronostico_agroclimatico');
  return {
    ok: true,
    domain: 'nutriplant_public',
    point: { lat, lng },
    kc,
    days,
    source: 'Open-Meteo (misma idea que pronóstico agroclimático free)',
    note: '≠ VPD puntual ≠ ventanas foliar ≠ Clima PRO. Alertas semanales = servicio aparte con registro.',
    free_tool: tool.ok ? tool.tool : null
  };
}

/* ——— Huella carbono ——— */
let carbonFactorsLoaded = false;

function ensureCarbonFactors() {
  if (carbonFactorsLoaded && NpCarbon.getFactors && NpCarbon.getFactors()) return true;
  const jsonPath = path.join(__dirname, '..', '..', '..', 'assets', 'emission-factors-by-country.json');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  if (typeof NpCarbon.setFactors === 'function') NpCarbon.setFactors(data);
  carbonFactorsLoaded = true;
  return !!(NpCarbon.getFactors && NpCarbon.getFactors());
}

function calculateFertilizerCarbon(params) {
  try {
    ensureCarbonFactors();
  } catch (e) {
    return { ok: false, error: 'No se cargaron factores: ' + (e && e.message ? e.message : String(e)) };
  }
  const areaHa = num(params && (params.area_ha || params.areaHa)) || 1;
  const rows = params && (params.rows || params.fertilizers);
  if (!Array.isArray(rows) || !rows.length) {
    const list = typeof NpCarbon.getFertilizers === 'function' ? NpCarbon.getFertilizers() : [];
    return {
      ok: false,
      error: 'Indica rows: [{ fertilizer_id, dose, dose_unit?: kg_ha|total_kg }].',
      sample_ids: list.slice(0, 12).map((f) => f.id)
    };
  }
  const result = NpCarbon.calculate({
    origin_country_iso: (params && (params.origin_country_iso || params.origin)) || 'GLOBAL',
    area_ha: areaHa,
    transport_origin_km: num(params && params.transport_origin_km) || 0,
    transport_sea_km: num(params && params.transport_sea_km) || 0,
    transport_km: num(params && (params.transport_road_km || params.transport_km)) || 0,
    rows: rows
  });
  const tool = freeTool('fertilizer_carbon');
  return {
    ok: !!(result && result.ok !== false),
    domain: 'nutriplant_public',
    result,
    note: 'Estimación FE(2020)+transporte+N₂O IPCC. Ilustrativo; no es EPD certificada.',
    chapter: chapter('huella-carbono-fertilizantes'),
    free_tool: tool.ok ? tool.tool : null,
    error: result && result.error ? result.error : null
  };
}

module.exports = {
  calculateNMineralizable,
  calculateHydroPulse,
  convertPhysicalUnits,
  lookupSolubilityIs,
  mulderInteractions,
  distributeExtractionByStage,
  soilAvailableWater,
  fertilizerCompatibility,
  fertilizerCompositionFromFormula,
  agroclimateForecastAtPoint,
  calculateFertilizerCarbon
};
