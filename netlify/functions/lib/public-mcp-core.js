'use strict';

/**
 * Motores públicos NutriPlant PRO (plugin ChatGPT).
 * Sin admin, sin Supabase, sin token Socio.
 */
const manualCatalog = require('./manual-tecnico-catalog');
const freeToolsCatalog = require('./free-tools-catalog');

const MANUAL_INDEX = 'https://nutriplantpro.com/manual-tecnico/';
const LOGIN_URL = 'https://nutriplantpro.com/login.html';

const EQ_WEIGHTS = {
  N_NO3: 14.0,
  N_NH4: 14.0,
  P: 31.0,
  K: 39.1,
  Ca: 20.04,
  Mg: 12.15,
  S: 16.03,
  Cl: 35.45
};

const ATOMIC = {
  N_NO3: 14.0,
  N_NH4: 14.0,
  P: 30.97,
  K: 39.1,
  Ca: 40.08,
  Mg: 24.3,
  S: 32.06,
  Cl: 35.45
};

/** Óxido = elemental × factor (misma convención que hidroponía). */
const OXIDE_TO_ELEMENTAL = {
  P2O5: 2.291,
  K2O: 1.204,
  CaO: 1.399,
  MgO: 1.658
};

const VPD_OPT_MIN = 0.5;
const VPD_OPT_MAX = 1.5;

const SALTS = [
  {
    id: 'nitrato_calcio_granular',
    name: 'Nitrato de Calcio',
    N_NO3: 14.4,
    N_NH4: 1.1,
    CaO: 26,
    tank: 'A',
    mix_note:
      'Tanque A. No mezclar en concentrado con sulfatos (yeso / precipitado de CaSO₄).'
  },
  {
    id: 'nitrato_calcio_cristal',
    name: 'Nitrato de Calcio Cristal',
    N_NO3: 12,
    N_NH4: 0,
    CaO: 23,
    MgO: 0.5,
    tank: 'A',
    mix_note: 'Tanque A. No mezclar en concentrado con sulfatos.'
  },
  {
    id: 'cacl2_dihidratado',
    name: 'Cloruro de calcio (dihidratado)',
    CaO: 38.1,
    Cl: 48.2,
    tank: 'A',
    mix_note: 'Aporta Cl⁻ (fuera del triángulo aniónico N-P-S).'
  },
  {
    id: 'nks',
    name: 'NKS',
    N_NO3: 12,
    N_NH4: 0,
    K2O: 46,
    SO4: 8.1,
    tank: 'B',
    mix_note: 'Catálogo NutriPlant (NKS). Suele ir en tanque B.'
  },
  {
    id: 'nitrato_magnesio',
    name: 'Nitrato de Magnesio',
    N_NO3: 10.8,
    MgO: 15,
    tank: 'B',
    mix_note: 'Aporta Mg y N-NO₃.'
  },
  {
    id: 'sulfato_magnesio',
    name: 'Sulfato de Magnesio',
    MgO: 16,
    SO4: 37.5,
    tank: 'B',
    mix_note: 'Tanque B. No juntar concentrado con nitratos de calcio.'
  }
];

const NUTRIENT_ALIASES = {
  ca: 'Ca',
  calcio: 'Ca',
  calcium: 'Ca',
  mg: 'Mg',
  magnesio: 'Mg',
  magnesium: 'Mg',
  k: 'K',
  potasio: 'K',
  potassium: 'K',
  p: 'P',
  fosforo: 'P',
  phosphorus: 'P',
  s: 'S',
  azufre: 'S',
  sulfur: 'S',
  cl: 'Cl',
  cloruro: 'Cl',
  chloride: 'Cl',
  n_no3: 'N_NO3',
  no3: 'N_NO3',
  nitrato: 'N_NO3',
  n_nh4: 'N_NH4',
  nh4: 'N_NH4',
  amonio: 'N_NH4'
};

function round(n, d) {
  const f = Math.pow(10, d == null ? 2 : d);
  return Math.round(Number(n) * f) / f;
}

function resolveNutrient(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  if (EQ_WEIGHTS[raw]) return raw;
  if (EQ_WEIGHTS[String(raw || '')]) return String(raw);
  const mapped = NUTRIENT_ALIASES[key] || NUTRIENT_ALIASES[String(raw || '').toLowerCase()];
  return mapped || null;
}

function elementalPctFromSalt(salt, nutrient) {
  if (nutrient === 'N_NO3') return Number(salt.N_NO3) || 0;
  if (nutrient === 'N_NH4') return Number(salt.N_NH4) || 0;
  if (nutrient === 'Cl') return Number(salt.Cl) || 0;
  if (nutrient === 'S') {
    if (Number(salt.S) > 0) return Number(salt.S);
    if (Number(salt.SO4) > 0) return Number(salt.SO4) / 3;
    return 0;
  }
  if (nutrient === 'Ca') {
    if (Number(salt.Ca) > 0) return Number(salt.Ca);
    if (Number(salt.CaO) > 0) return Number(salt.CaO) / OXIDE_TO_ELEMENTAL.CaO;
    return 0;
  }
  if (nutrient === 'Mg') {
    if (Number(salt.Mg) > 0) return Number(salt.Mg);
    if (Number(salt.MgO) > 0) return Number(salt.MgO) / OXIDE_TO_ELEMENTAL.MgO;
    return 0;
  }
  if (nutrient === 'K') {
    if (Number(salt.K) > 0) return Number(salt.K);
    if (Number(salt.K2O) > 0) return Number(salt.K2O) / OXIDE_TO_ELEMENTAL.K2O;
    return 0;
  }
  if (nutrient === 'P') {
    if (Number(salt.P) > 0) return Number(salt.P);
    if (Number(salt.P2O5) > 0) return Number(salt.P2O5) / OXIDE_TO_ELEMENTAL.P2O5;
    return 0;
  }
  return 0;
}

function contributedIons(salt, gramsPerM3) {
  const ions = ['N_NO3', 'N_NH4', 'P', 'K', 'Ca', 'Mg', 'S', 'Cl'];
  const out = {};
  ions.forEach((n) => {
    const pct = elementalPctFromSalt(salt, n);
    if (!(pct > 0)) return;
    const ppm = gramsPerM3 * (pct / 100);
    const meq = ppm / EQ_WEIGHTS[n];
    out[n] = { ppm: round(ppm, 3), meq_L: round(meq, 3) };
  });
  return out;
}

function chapterCite(chapter) {
  if (!chapter) return null;
  return {
    id: chapter.id,
    title: chapter.title,
    url: chapter.url,
    pillar: chapter.pillar || null
  };
}

function findChapter(q) {
  const chapters = manualCatalog.chapters || [];
  const needle = String(q || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!needle) return { ok: false, error: 'Indica q o chapter_id.' };
  const exact = chapters.find(
    (c) =>
      c.id === q ||
      c.slug === q ||
      String(c.id).replace(/_/g, '-') === needle ||
      c.slug === needle
  );
  if (exact) return { ok: true, chapter: exact, match: 'exact' };
  const scored = chapters
    .map((c) => {
      const blob = [c.id, c.slug, c.title, c.summary, c.pillar]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      let score = 0;
      needle.split(/\s+/).forEach((w) => {
        if (w.length < 2) return;
        if (blob.indexOf(w) >= 0) score += 1;
      });
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) {
    return {
      ok: false,
      error: 'No hay capítulo para: ' + q,
      index: MANUAL_INDEX
    };
  }
  return {
    ok: true,
    chapter: scored[0].c,
    match: 'search',
    alternatives: scored.slice(1, 4).map((x) => chapterCite(x.c))
  };
}

function lookupChapter(params) {
  const q = (params && (params.chapter_id || params.q || params.query)) || '';
  const found = findChapter(q);
  if (!found.ok) return found;
  return {
    ok: true,
    domain: 'nutriplant_public',
    chapter: {
      ...chapterCite(found.chapter),
      summary: found.chapter.summary,
      status: found.chapter.status
    },
    match: found.match,
    alternatives: found.alternatives || [],
    rule: 'Si el código y el capítulo divergen, gana el código de las calculadoras; luego se actualiza el capítulo.'
  };
}

function listCatalog() {
  return {
    ok: true,
    domain: 'nutriplant_public',
    manual: {
      version: manualCatalog.version,
      index: MANUAL_INDEX,
      llms: (manualCatalog.publicUrls && manualCatalog.publicUrls.llms) || null,
      chapters: (manualCatalog.chapters || []).map((c) => chapterCite(c))
    },
    free_tools: {
      version: freeToolsCatalog.version,
      login: LOGIN_URL,
      tools: (freeToolsCatalog.tools || []).map((t) => ({
        id: t.id,
        title: t.title,
        summary: t.summary,
        manual_chapter: t.manualChapter || t.manual_chapter || null
      }))
    }
  };
}

function convertNutrientUnits(params) {
  const nutrient = resolveNutrient(params && params.nutrient);
  if (!nutrient || !EQ_WEIGHTS[nutrient]) {
    return {
      ok: false,
      error: 'Nutriente no válido. Usa Ca, Mg, K, P, S, Cl, N_NO3 o N_NH4.'
    };
  }
  const value = Number(params && params.value);
  if (!Number.isFinite(value)) return { ok: false, error: 'Indica value numérico.' };
  const from = String((params && params.from) || 'meq_L')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  let ppm;
  if (from === 'ppm' || from === 'mg_l') ppm = value;
  else if (from === 'meq' || from === 'meq_l' || from === 'meq_litro') ppm = value * EQ_WEIGHTS[nutrient];
  else if (from === 'mmol' || from === 'mmol_l') ppm = value * ATOMIC[nutrient];
  else return { ok: false, error: 'from debe ser ppm, meq_L o mmol_L.' };

  const meq = ppm / EQ_WEIGHTS[nutrient];
  const mmol = ppm / ATOMIC[nutrient];
  const ch = findChapter('unidades-ppm-meq-oxidos');
  return {
    ok: true,
    domain: 'nutriplant_public',
    nutrient,
    input: { value, from },
    ppm: round(ppm, 4),
    meq_L: round(meq, 4),
    mmol_L: round(mmol, 4),
    equivalent_weight: EQ_WEIGHTS[nutrient],
    chapter: chapterCite(ch.chapter),
    note: 'Macros iónicos: meq/L = ppm / peso equivalente (Ca 20.04).'
  };
}

function tetensEs(tempC) {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

function vpdBand(vpd) {
  if (vpd < VPD_OPT_MIN) return 'bajo';
  if (vpd > VPD_OPT_MAX) return 'alto';
  return 'optimo';
}

function calculateVpd(params) {
  const given = Number(params && (params.vpd_kPa || params.vpd));
  let vpd;
  let mode = 'given';
  const details = {};
  if (Number.isFinite(given) && given >= 0) {
    vpd = given;
  } else {
    const t = Number(params && (params.temperature_C || params.temp_C || params.t));
    const rh = Number(params && (params.rh_pct || params.humidity || params.hr));
    if (!Number.isFinite(t) || !Number.isFinite(rh)) {
      return {
        ok: false,
        error: 'Indica vpd_kPa o temperature_C + rh_pct.'
      };
    }
    const es = tetensEs(t);
    const ea = es * (rh / 100);
    vpd = es - ea;
    mode = 'tetens_air';
    details.temperature_C = t;
    details.rh_pct = rh;
    details.es_kPa = round(es, 3);
    details.ea_kPa = round(ea, 3);
  }
  const band = vpdBand(vpd);
  const ch = findChapter('vpd-deficit-presion-vapor');
  return {
    ok: true,
    domain: 'nutriplant_public',
    vpd_kPa: round(vpd, 2),
    band,
    range_platform_kPa: { min: VPD_OPT_MIN, max: VPD_OPT_MAX },
    mode,
    details,
    crop: (params && (params.crop || params.cultivo)) || null,
    chapter: chapterCite(ch.chapter),
    not: [
      'No es ventana de aplicación foliar',
      'No es ISH ni lámina de riego',
      'No es pronóstico agroclimático'
    ]
  };
}

function interpretContext(params) {
  const crop = String((params && (params.crop || params.cultivo)) || '').trim();
  const vpdIn = params && (params.vpd_kPa || params.vpd);
  let vpdBlock = null;
  if (vpdIn != null && vpdIn !== '') {
    vpdBlock = calculateVpd({
      vpd_kPa: vpdIn,
      temperature_C: params.temperature_C,
      rh_pct: params.rh_pct,
      crop
    });
  } else if (params && (params.temperature_C || params.rh_pct)) {
    vpdBlock = calculateVpd(params);
  }
  const relations = [];
  if (vpdBlock && vpdBlock.ok && vpdBlock.band === 'alto') {
    relations.push(
      'VPD alto: más demanda evaporativa; cuidar riego y Ca en tejidos de baja transpiración (punta/blossom).'
    );
  }
  if (vpdBlock && vpdBlock.ok && vpdBlock.band === 'bajo') {
    relations.push('VPD bajo: poco déficit; riesgo de humedad/edema según cultivo y invernadero.');
  }
  if (crop) relations.push('Cultivo declarado: ' + crop + '. El rango 0.5–1.5 kPa es el de la plataforma; afinar con el manejo del predio.');
  return {
    ok: true,
    domain: 'nutriplant_public',
    crop: crop || null,
    vpd: vpdBlock && vpdBlock.ok ? vpdBlock : null,
    relations,
    chapters: [
      chapterCite(findChapter('vpd-deficit-presion-vapor').chapter),
      chapterCite(findChapter('ventanas-aplicacion-foliar').chapter),
      chapterCite(findChapter('analisis-foliar-dop').chapter)
    ].filter(Boolean),
    floor:
      'Piso NutriPlant: no bajar a recetario genérico. Distinguir VPD puntual ≠ foliar ≠ ISH ≠ lámina.'
  };
}

function resolveSalt(q) {
  const needle = String(q || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!needle) return SALTS[0];
  return (
    SALTS.find((s) => s.id === q) ||
    SALTS.find((s) => s.id.replace(/_/g, ' ') === needle) ||
    SALTS.find((s) => s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(needle) >= 0) ||
    null
  );
}

function saltFromMeq(params) {
  const nutrient = resolveNutrient((params && (params.nutrient || params.ion)) || 'Ca');
  if (!nutrient) return { ok: false, error: 'Nutriente no válido.' };
  const meq = Number(params && (params.meq_L || params.meq));
  if (!Number.isFinite(meq) || meq <= 0) return { ok: false, error: 'Indica meq_L > 0.' };
  const salt = resolveSalt(params && (params.salt_id || params.salt || params.fertilizer));
  if (!salt) {
    return {
      ok: false,
      error: 'Sal no encontrada. Ejemplos: nitrato_calcio_granular, nks, sulfato_magnesio.',
      salts: SALTS.map((s) => ({ id: s.id, name: s.name }))
    };
  }
  const pct = elementalPctFromSalt(salt, nutrient);
  if (!(pct > 0)) {
    return {
      ok: false,
      error: salt.name + ' no aporta ' + nutrient + ' de forma útil para este cálculo.'
    };
  }
  const ppm = meq * EQ_WEIGHTS[nutrient];
  const gramsPerM3 = ppm / (pct / 100);
  const volumeM3 = Number(params && (params.volume_m3 || params.m3));
  const volumeL = Number(params && (params.volume_L || params.liters));
  let scaleM3 = 1;
  if (Number.isFinite(volumeM3) && volumeM3 > 0) scaleM3 = volumeM3;
  else if (Number.isFinite(volumeL) && volumeL > 0) scaleM3 = volumeL / 1000;
  const gramsTotal = gramsPerM3 * scaleM3;
  const ions = contributedIons(salt, gramsPerM3);
  const ch = findChapter('hidroponia-solucion-por-etapa');
  const chUnits = findChapter('unidades-ppm-meq-oxidos');
  return {
    ok: true,
    domain: 'nutriplant_public',
    target: { nutrient, meq_L: meq, ppm: round(ppm, 3) },
    salt: { id: salt.id, name: salt.name, tank: salt.tank, mix_note: salt.mix_note },
    elemental_pct_in_product: round(pct, 3),
    dose: {
      g_per_m3: round(gramsPerM3, 2),
      kg_per_m3: round(gramsPerM3 / 1000, 4),
      volume_m3: round(scaleM3, 4),
      grams_for_volume: round(gramsTotal, 2)
    },
    also_contributes: ions,
    chapter: chapterCite(ch.chapter),
    units_chapter: chapterCite(chUnits.chapter),
    tool_url: LOGIN_URL,
    note:
      '1 m³ = 1000 L. El nitrato de calcio aporta también N-NO₃ (y a veces N-NH₄). No sustituye el diseño completo de solución (CE, triángulos, tanques).'
  };
}

module.exports = {
  MANUAL_INDEX,
  LOGIN_URL,
  EQ_WEIGHTS,
  SALTS,
  VPD_OPT_MIN,
  VPD_OPT_MAX,
  lookupChapter,
  listCatalog,
  convertNutrientUnits,
  calculateVpd,
  interpretContext,
  saltFromMeq,
  findChapter,
  chapterCite,
  resolveNutrient,
  elementalPctFromSalt
};
