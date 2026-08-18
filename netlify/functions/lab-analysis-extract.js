/**
 * Netlify Function: extrae campos de un PDF/imagen de análisis de laboratorio
 * y los mapea al shape NutriPlant.
 *
 * POST JSON {
 *   analysisType: 'soil'|'solucion_nutritiva'|'extracto_pasta'|'agua'|'foliar'|'fruta'
 *     (aliases: sn, pasta, water/aw, leaf, fruit),
 *   language, filename, mimeType, fileBase64
 * }
 * Authorization: Bearer <supabase access_token>
 *
 * Cobra créditos de la misma bolsa que el Chat IA (profiles.chat_usage_*).
 * Por defecto 3 créditos por extracción exitosa (CREDITS_LAB_EXTRACT).
 *
 * Env: OPENAI_API_KEY, OPENAI_LAB_EXTRACT_MODEL | OPENAI_OCR_MODEL | OPENAI_ADMIN_MODEL,
 *      SUPABASE_URL, SUPABASE_ANON_KEY (auth), SUPABASE_SERVICE_ROLE_KEY (cuota)
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  CREDITS_LAB_EXTRACT,
  assertChatCredits,
  addUsageInSupabase
} = require('./lib/chat-credits');
const { resolveBulkDensity, looksPlausibleGcm3, finalizeBulkDensity } = require('./lib/soil-extract-aliases');

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_BYTES = 4.5 * 1024 * 1024;

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function resolveModel() {
  return (
    (process.env.OPENAI_LAB_EXTRACT_MODEL || '').trim() ||
    (process.env.OPENAI_OCR_MODEL || '').trim() ||
    (process.env.OPENAI_ADMIN_MODEL || '').trim() ||
    DEFAULT_MODEL
  );
}

function isGpt56Family(model) {
  return /^gpt-5\.6/i.test(String(model || ''));
}

function outputTextFromResponses(data) {
  if (!data) return '';
  if (typeof data.output_text === 'string') return data.output_text;
  const out = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((part) => {
      if (part && typeof part.text === 'string') out.push(part.text);
      else if (part && typeof part.output_text === 'string') out.push(part.output_text);
    });
  });
  return out.join('\n').trim();
}

function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

function emptySoilShape() {
  return {
    title: '',
    date: '',
    physical: {
      texturalClass: '',
      saturationPoint: '',
      fieldCapacity: '',
      wiltingPoint: '',
      hydraulicConductivity: '',
      bulkDensity: ''
    },
    phSection: { ph: '', phBuffer: '', totalCarbonates: '', salinity: '' },
    fertility: {
      pMethod: '',
      mo: '',
      nNo3: '',
      p: '',
      k: '',
      ca: '',
      mg: '',
      na: '',
      s: '',
      fe: '',
      mn: '',
      b: '',
      zn: '',
      cu: '',
      al: '',
      moly: '',
      depthCm: '',
      reachPct: '',
      forms: {
        p: '',
        k: '',
        ca: '',
        mg: '',
        s: '',
        nNo3: '',
        fe: '',
        mn: '',
        zn: '',
        cu: '',
        b: '',
        mo: '',
        al: '',
        na: ''
      }
    },
    cations: {
      ca: '',
      mg: '',
      k: '',
      na: '',
      al: '',
      h: '',
      cic: '',
      pctCa: '',
      pctMg: '',
      pctK: '',
      pctNa: '',
      pctAl: '',
      pctH: ''
    },
    ratios: { caMg: '', mgK: '', caMgK: '', caK: '' },
    notes: '',
    confidence: ''
  };
}

function asStr(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  if (!s || /^n\/?a$/i.test(s) || s === '-' || s === '—') return '';
  return s;
}

/** Valores de lab tipo <25, >100, ND, traza (no son número listo para el form). */
function isDetectionLimitValue(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  if (/^(nd|n\.?\s*d\.?|traza|trace|bdl|lod|loq|ndr)$/i.test(t)) return true;
  if (/^[<>]=?\s*\d/.test(t)) return true;
  if (/^\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?$/.test(t)) return true; // rangos
  return false;
}

/**
 * Números de lab (es/en) → punto decimal, que es lo que espera el formulario.
 *   "1,5" → "1.5"   "1.234,56" → "1234.56"   "2,500" → "2500"   "1 234" → "1234"
 * Ambiguo ("1,234"): coma = miles salvo que commaIsDecimal sea true.
 * Si el texto no parece número (ND, <25, texto libre) se devuelve intacto.
 */
function normalizeDecimalText(raw, commaIsDecimal) {
  const original = String(raw == null ? '' : raw).trim();
  if (!original) return '';
  const lim = original.match(/^([<>]=?)\s*(\S.*)$/);
  if (lim) return lim[1] + normalizeDecimalText(lim[2], commaIsDecimal);
  let s = original
    .replace(/[\s\u00a0\u202f\u2009]/g, '')
    .replace(/[\u2019'\u00b4`]/g, '')
    .replace(/[\u2212\u2013\u2014]/g, '-');
  if (!/^-?(?=[\d.,]*\d)[\d.,]+$/.test(s)) return original;
  const neg = s.charAt(0) === '-';
  if (neg) s = s.slice(1);

  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  let cut = -1;
  if (dots && commas) {
    cut = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  } else if (commas === 1) {
    const idx = s.lastIndexOf(',');
    // "2,500" puede ser miles; "0,418" no (un grupo de miles nunca empieza en 0)
    const looksGrouped = s.slice(idx + 1).length === 3 && /^[1-9]\d{0,2}$/.test(s.slice(0, idx));
    if (!looksGrouped || commaIsDecimal) cut = idx;
  } else if (dots === 1) {
    cut = s.lastIndexOf('.');
  }
  let intPart = cut >= 0 ? s.slice(0, cut) : s;
  let decPart = cut >= 0 ? s.slice(cut + 1) : '';
  intPart = intPart.replace(/[.,]/g, '') || '0';
  decPart = decPart.replace(/[.,]/g, '');
  if (!/^\d+$/.test(intPart)) return original;
  if (decPart && !/^\d+$/.test(decPart)) return original;
  return (neg ? '-' : '') + (decPart ? intPart + '.' + decPart : intPart);
}

/** Claves que nunca son número: no tocar (fechas tipo 05.08.2026, formas, unidades…). */
const NON_NUMERIC_KEYS = new Set([
  'title',
  'date',
  'notes',
  'confidence',
  'forms',
  'unitHints',
  'sourceUnits',
  'pMethod',
  'texturalClass',
  'sReportedAs',
  'pReportedAs',
  'kReportedAs',
  'nNo3ReportedAs',
  'caReportedAs',
  'mgReportedAs'
]);

function collectNumericStrings(node, out, key) {
  if (node == null) return out;
  if (typeof node === 'string') {
    if (!NON_NUMERIC_KEYS.has(key)) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v) => collectNumericStrings(v, out, key));
    return out;
  }
  if (typeof node === 'object') {
    Object.keys(node).forEach((k) => {
      if (NON_NUMERIC_KEYS.has(k)) return;
      collectNumericStrings(node[k], out, k);
    });
  }
  return out;
}

/** ¿La coma es decimal en este informe? Se decide con todos los valores del JSON. */
function commaIsDecimalIn(values) {
  let comma = false;
  let dot = false;
  (values || []).forEach((v) => {
    const t = String(v == null ? '' : v).trim();
    if (!/^-?[\d.,\s]+$/.test(t)) return;
    if (/,\d{1,2}$/.test(t) || /,\d{4,}$/.test(t)) comma = true;
    if (/\.\d{1,2}$/.test(t) || /\.\d{4,}$/.test(t)) dot = true;
  });
  return comma && !dot;
}

/** Deja todo el JSON del modelo con punto decimal antes de mapearlo al shape. */
function normalizeNumericStringsDeep(node, commaIsDecimal, key) {
  if (node == null) return node;
  if (typeof node === 'string') {
    return NON_NUMERIC_KEYS.has(key) ? node : normalizeDecimalText(node, commaIsDecimal);
  }
  if (Array.isArray(node)) {
    return node.map((v) => normalizeNumericStringsDeep(v, commaIsDecimal, key));
  }
  if (typeof node !== 'object') return node;
  const out = {};
  Object.keys(node).forEach((k) => {
    out[k] = NON_NUMERIC_KEYS.has(k) ? node[k] : normalizeNumericStringsDeep(node[k], commaIsDecimal, k);
  });
  return out;
}

function normalizeDecimalsInPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const commaIsDecimal = commaIsDecimalIn(collectNumericStrings(parsed, [], ''));
  return normalizeNumericStringsDeep(parsed, commaIsDecimal, '');
}

function isPlainNumericValue(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  if (isDetectionLimitValue(t)) return false;
  return /^-?\d+(\.\d+)?$/.test(normalizeDecimalText(t));
}

function roundStr(n, digits) {
  if (!Number.isFinite(n)) return '';
  const d = digits == null ? 4 : digits;
  return String(Number(n.toFixed(d)));
}

/** Factores forma de lab → elemental (mismo criterio que conversor NutriPlant). */
const FORM_TO_ELEMENTAL = {
  // P
  p2o5: { field: 'p', factor: 0.4364, label: 'P₂O₅→P' },
  // K
  k2o: { field: 'k', factor: 0.8301, label: 'K₂O→K' },
  // Ca / Mg
  cao: { field: 'ca', factor: 0.7147, label: 'CaO→Ca' },
  mgo: { field: 'mg', factor: 0.6031, label: 'MgO→Mg' },
  // N (campo nNo3)
  no3: { field: 'nNo3', factor: 0.2259, label: 'NO₃→N' },
  no3n: { field: 'nNo3', factor: 1, label: 'N-NO₃' },
  nno3: { field: 'nNo3', factor: 1, label: 'N-NO₃' },
  nh4: { field: 'nNo3', factor: 0.7765, label: 'NH₄→N' },
  // S
  so4: { field: 's', factor: 32.06 / 96.06, label: 'SO₄→S' },
  so42: { field: 's', factor: 32.06 / 96.06, label: 'SO₄→S' },
  sulfato: { field: 's', factor: 32.06 / 96.06, label: 'SO₄→S' },
  sulphate: { field: 's', factor: 32.06 / 96.06, label: 'SO₄→S' },
  sulfate: { field: 's', factor: 32.06 / 96.06, label: 'SO₄→S' },
  so3: { field: 's', factor: 0.4005, label: 'SO₃→S' },
  sso4: { field: 's', factor: 1, label: 'S-SO₄' },
  so4s: { field: 's', factor: 1, label: 'S-SO₄' },
  // micros óxido (poco común en suelo, sí en algunos labs)
  fe2o3: { field: 'fe', factor: 0.6994, label: 'Fe₂O₃→Fe' },
  mno: { field: 'mn', factor: 0.7745, label: 'MnO→Mn' },
  zno: { field: 'zn', factor: 0.8034, label: 'ZnO→Zn' },
  cuo: { field: 'cu', factor: 0.7989, label: 'CuO→Cu' },
  b2o3: { field: 'b', factor: 0.3107, label: 'B₂O₃→B' }
};

/** Formas que ya son elementales (no convertir). */
const ELEMENTAL_FORMS = new Set([
  'p', 'k', 'ca', 'mg', 's', 'fe', 'mn', 'zn', 'cu', 'b', 'mo', 'al', 'na',
  'elemental', 'n', 'nno3', 'no3n', 'sso4', 'so4s'
]);

function canonForm(s) {
  return asStr(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function noteLang(lang) {
  return String(lang || '').toLowerCase().slice(0, 2) === 'en' ? 'en' : 'es';
}

function tNote(lang, es, en) {
  return noteLang(lang) === 'en' ? en : es;
}

/**
 * Extrae número + unidad opcional de un string de lab.
 * Ej.: "12 in", "6 inches", '8"', "1.35 g/cm3", "0.5 in/hr", "90 lb/ft³"
 */
function parseQtyWithUnit(raw) {
  const t = String(raw == null ? '' : raw)
    .trim()
    .replace(/\s+/g, ' ');
  if (!t) return null;
  const m = t.match(
    /^(-?[\d.,]+)\s*(in(?:ch(?:es)?)?|"|ft|feet|cm|mm|g\/?cm[3³]|g\/?cc|g\s*cm-3|mg\/?m[3³]|t\/?m[3³]|kg\/?m[3³]|lb\/?ft[3³]|pcf|in\/?h(?:r|our)?|cm\/?h(?:r|our)?|mmhos\/?cm|mmho\/?cm|ms\/?cm|ds\/?m|ppm|mg\/?kg|lb\/?ac(?:re)?|lbs\/?ac(?:re)?)?\s*$/i
  );
  if (!m) {
    const only = normalizeDecimalText(t);
    if (/^-?\d+(\.\d+)?$/.test(only)) return { num: Number(only), unit: '' };
    return null;
  }
  const num = Number(normalizeDecimalText(m[1]));
  if (!Number.isFinite(num)) return null;
  let unit = String(m[2] || '')
    .toLowerCase()
    .replace(/³/g, '3')
    .replace(/\s+/g, '')
    .replace(/hour/g, 'h')
    .replace(/hr/g, 'h');
  if (unit === '"' || unit === 'inch' || unit === 'inches') unit = 'in';
  if (unit === 'feet') unit = 'ft';
  if (unit === 'g/cc' || unit === 'gcm-3' || unit === 'gcm3' || unit === 'mg/m3' || unit === 't/m3') unit = 'g/cm3';
  if (unit === 'lb/ft³' || unit === 'pcf') unit = 'lb/ft3';
  if (unit === 'kg/m3') unit = 'kg/m3';
  if (unit === 'mmho/cm' || unit === 'mmhos/cm' || unit === 'ms/cm') unit = 'dS/m';
  if (unit === 'ds/m') unit = 'dS/m';
  if (unit === 'lbs/acre' || unit === 'lb/acre' || unit === 'lbs/ac' || unit === 'lb/ac') unit = 'lb/acre';
  if (unit === 'mg/kg') unit = 'ppm';
  if (unit === 'in/hour') unit = 'in/h';
  if (unit === 'cm/hour') unit = 'cm/h';
  return { num: num, unit: unit };
}

function canonUnitHint(raw) {
  const u = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/³/g, '3')
    .replace(/\s+/g, '');
  if (!u) return '';
  if (/^(in|inch|inches|")$/.test(u)) return 'in';
  if (/^(ft|feet)$/.test(u)) return 'ft';
  if (/^(cm)$/.test(u)) return 'cm';
  if (/^(mm)$/.test(u)) return 'mm';
  if (/^(g\/?cm3|g\/?cc|gcm3|mg\/?m3|t\/?m3)$/.test(u)) return 'g/cm3';
  if (/^(kg\/?m3)$/.test(u)) return 'kg/m3';
  if (/^(lb\/?ft3|pcf)$/.test(u)) return 'lb/ft3';
  if (/^(in\/?h|in\/?hr)$/.test(u)) return 'in/h';
  if (/^(cm\/?h|cm\/?hr)$/.test(u)) return 'cm/h';
  if (/^(mmhos?\/?cm|ms\/?cm|ds\/?m)$/.test(u)) return 'dS/m';
  if (/^(lb\/?ac|lbs\/?ac|lb\/?acre|lbs\/?acre)$/.test(u)) return 'lb/acre';
  if (/^(ppm|mg\/?kg)$/.test(u)) return 'ppm';
  return u;
}

/**
 * Convierte físicos / profundidad / CE desde unidades inglesas (o con sufijo) al canónico NutriPlant.
 * También usa unitHints opcionales del modelo: { depth, bulkDensity, hydraulicConductivity, salinity }.
 */
function normalizeEnglishPhysicalUnits(base, notesArr, lang, unitHints) {
  if (!base) return;
  const hints = unitHints && typeof unitHints === 'object' ? unitHints : {};
  const phys = base.physical || {};
  const fert = base.fertility || {};
  const ph = base.phSection || {};

  // —— Profundidad → cm ——
  const depthRaw = asStr(fert.depthCm);
  if (depthRaw && !isDetectionLimitValue(depthRaw)) {
    const parsed = parseQtyWithUnit(depthRaw);
    const hint = canonUnitHint(hints.depth || hints.depthCm || hints.sampleDepth);
    if (parsed) {
      const unit = parsed.unit || hint;
      let cm = parsed.num;
      let converted = false;
      if (unit === 'in') {
        cm = parsed.num * 2.54;
        converted = true;
      } else if (unit === 'ft') {
        cm = parsed.num * 30.48;
        converted = true;
      } else if (unit === 'mm') {
        cm = parsed.num / 10;
        converted = true;
      } else if (!unit && hint === 'in') {
        cm = parsed.num * 2.54;
        converted = true;
      } else if (!unit && hint === 'ft') {
        cm = parsed.num * 30.48;
        converted = true;
      }
      // Heurística: lab USA suele muestrear 6/8/12/24 in; solo si unitHints marca sistema US
      if (
        !converted &&
        !unit &&
        !hint &&
        /us|imperial|english|usa/.test(String(hints.system || hints.unitSystem || '').toLowerCase()) &&
        parsed.num > 0 &&
        parsed.num <= 36 &&
        Number.isInteger(parsed.num)
      ) {
        cm = parsed.num * 2.54;
        converted = true;
      }
      fert.depthCm = roundStr(cm, 2);
      if (converted) {
        notesArr.push(
          tNote(
            lang,
            'Profundidad: lab ' + depthRaw + (unit || hint ? ' (' + (unit || hint) + ')' : '') + ' → ' + fert.depthCm + ' cm',
            'Depth: lab ' + depthRaw + (unit || hint ? ' (' + (unit || hint) + ')' : '') + ' → ' + fert.depthCm + ' cm'
          )
        );
      }
    }
  }

  // —— Densidad aparente → g/cm³ ——
  const bdRaw = asStr(phys.bulkDensity);
  const systemHint = String(hints.system || hints.unitSystem || '').toLowerCase();
  const looksUsSystem = /us|imperial|english|usa/.test(systemHint);
  if (bdRaw && !isDetectionLimitValue(bdRaw)) {
    const parsed = parseQtyWithUnit(bdRaw);
    const hint = canonUnitHint(hints.bulkDensity || hints.bd);
    if (parsed) {
      const unit = parsed.unit || hint;
      let gcm3 = parsed.num;
      let converted = false;
      if (unit === 'lb/ft3') {
        gcm3 = parsed.num * 0.016018463;
        converted = true;
      } else if (unit === 'kg/m3' || hint === 'kg/m3') {
        gcm3 = parsed.num / 1000;
        converted = true;
      } else if (!unit && hint === 'lb/ft3') {
        gcm3 = parsed.num * 0.016018463;
        converted = true;
      } else if (!unit && !hint && looksUsSystem && parsed.num > 20 && parsed.num < 140) {
        // Solo con sistema USA marcado: valores típicos lb/ft³ (≈70–110)
        gcm3 = parsed.num * 0.016018463;
        converted = true;
      }
      phys.bulkDensity = roundStr(gcm3, 3);
      if (converted) {
        notesArr.push(
          tNote(
            lang,
            'Densidad aparente: lab ' + bdRaw + ' → ' + phys.bulkDensity + ' g/cm³',
            'Bulk density: lab ' + bdRaw + ' → ' + phys.bulkDensity + ' g/cm³'
          )
        );
      }
    }
  }

  // —— Conductividad hidráulica → cm/h ——
  const hcRaw = asStr(phys.hydraulicConductivity);
  if (hcRaw && !isDetectionLimitValue(hcRaw)) {
    const parsed = parseQtyWithUnit(hcRaw);
    const hint = canonUnitHint(hints.hydraulicConductivity || hints.kSat || hints.ksat);
    if (parsed) {
      const unit = parsed.unit || hint;
      let cmh = parsed.num;
      let converted = false;
      if (unit === 'in/h') {
        cmh = parsed.num * 2.54;
        converted = true;
      } else if (!unit && hint === 'in/h') {
        cmh = parsed.num * 2.54;
        converted = true;
      }
      phys.hydraulicConductivity = roundStr(cmh, 3);
      if (converted) {
        notesArr.push(
          tNote(
            lang,
            'Cond. hidráulica: lab ' + hcRaw + ' → ' + phys.hydraulicConductivity + ' cm/h',
            'Hydraulic conductivity: lab ' + hcRaw + ' → ' + phys.hydraulicConductivity + ' cm/h'
          )
        );
      }
    }
  }

  // —— CE / salinidad: mmhos/cm ≡ mS/cm ≡ dS/m (mismo número) ——
  const salRaw = asStr(ph.salinity);
  if (salRaw && !isDetectionLimitValue(salRaw)) {
    const parsed = parseQtyWithUnit(salRaw);
    if (parsed) {
      ph.salinity = roundStr(parsed.num, 3);
      if (parsed.unit && parsed.unit !== 'dS/m') {
        notesArr.push(
          tNote(
            lang,
            'CE: lab ' + salRaw + ' → ' + ph.salinity + ' dS/m (mmhos/cm y mS/cm equivalen a dS/m)',
            'EC: lab ' + salRaw + ' → ' + ph.salinity + ' dS/m (mmhos/cm and mS/cm equal dS/m)'
          )
        );
      }
    }
  }

  // —— Fertilidad en lb/acre: no convertir a ciegas (depende de profundidad/DA); avisar ——
  const fertFields = ['nNo3', 'p', 'k', 'ca', 'mg', 'na', 's', 'fe', 'mn', 'b', 'zn', 'cu', 'moly', 'al'];
  const lbAcreHits = [];
  fertFields.forEach(function (field) {
    const raw = asStr(fert[field]);
    if (!raw || isDetectionLimitValue(raw)) return;
    const parsed = parseQtyWithUnit(raw);
    const fertHint = canonUnitHint(hints.fertility || hints.nutrients);
    if (!parsed) return;
    if (parsed.unit === 'lb/acre' || fertHint === 'lb/acre') {
      lbAcreHits.push(field + '=' + raw);
      // Dejar el número visible pero marcar para revisión humana
      fert[field] = roundStr(parsed.num, 3);
    } else if (parsed.unit === 'ppm' || !parsed.unit) {
      fert[field] = roundStr(parsed.num, 3);
    }
  });
  if (lbAcreHits.length) {
    notesArr.push(
      tNote(
        lang,
        'Fertilidad en lb/acre detectada (' +
          lbAcreHits.join(', ') +
          '): no se convirtió a ppm (hace falta profundidad/DA). Revisa y convierte a mano si aplica.',
        'Fertility in lb/acre detected (' +
          lbAcreHits.join(', ') +
          '): not auto-converted to ppm (needs depth/BD). Review and convert manually if needed.'
      )
    );
  }
}

/**
 * Convierte variantes comunes de lab (P₂O₅, K₂O, SO₄, NO₃, …) a elemental.
 * Lee fertility.forms.{p,k,ca,mg,s,nNo3,…} o *ReportedAs legacy (sReportedAs).
 */
function normalizeFertilityForms(fertility, notesArr, lang) {
  if (!fertility || typeof fertility !== 'object') return;
  const forms = {};
  const srcForms = fertility.forms && typeof fertility.forms === 'object' ? fertility.forms : {};
  Object.keys(srcForms).forEach(function (k) {
    forms[k] = canonForm(srcForms[k]);
  });
  if (!forms.s && fertility.sReportedAs) forms.s = canonForm(fertility.sReportedAs);
  if (!forms.p && fertility.pReportedAs) forms.p = canonForm(fertility.pReportedAs);
  if (!forms.k && fertility.kReportedAs) forms.k = canonForm(fertility.kReportedAs);
  if (!forms.nNo3 && fertility.nNo3ReportedAs) forms.nNo3 = canonForm(fertility.nNo3ReportedAs);

  delete fertility.forms;
  delete fertility.sReportedAs;
  delete fertility.pReportedAs;
  delete fertility.kReportedAs;
  delete fertility.nNo3ReportedAs;
  delete fertility.caReportedAs;
  delete fertility.mgReportedAs;

  const fieldToFormKey = {
    p: 'p',
    k: 'k',
    ca: 'ca',
    mg: 'mg',
    s: 's',
    nNo3: 'nNo3',
    fe: 'fe',
    mn: 'mn',
    zn: 'zn',
    cu: 'cu',
    b: 'b',
    moly: 'mo',
    al: 'al',
    na: 'na'
  };

  Object.keys(fieldToFormKey).forEach(function (field) {
    const raw = asStr(fertility[field]);
    if (!raw || isDetectionLimitValue(raw)) return;
    const num = Number(normalizeDecimalText(raw));
    if (!Number.isFinite(num)) return;

    const formKey = fieldToFormKey[field];
    const form = forms[formKey] || forms[field] || '';
    if (!form || ELEMENTAL_FORMS.has(form)) {
      fertility[field] = roundStr(num, 3);
      return;
    }
    const conv = FORM_TO_ELEMENTAL[form];
    if (conv && conv.field === field) {
      if (conv.factor === 1) {
        fertility[field] = roundStr(num, 3);
        notesArr.push(
          tNote(
            lang,
            field + ': ' + conv.label + ' (sin convertir)=' + fertility[field],
            field + ': ' + conv.label + ' (no conversion)=' + fertility[field]
          )
        );
      } else {
        fertility[field] = roundStr(num * conv.factor, 3);
        notesArr.push(
          tNote(
            lang,
            field + ': lab ' + form + '=' + raw + ' → elemental=' + fertility[field] + ' (' + conv.label + ')',
            field + ': lab ' + form + '=' + raw + ' → elemental=' + fertility[field] + ' (' + conv.label + ')'
          )
        );
      }
      return;
    }
    fertility[field] = roundStr(num, 3);
    notesArr.push(
      tNote(
        lang,
        field + ': forma reportada "' + form + '" no mapeada; valor sin convertir=' + fertility[field],
        field + ': reported form "' + form + '" not mapped; value left as-is=' + fertility[field]
      )
    );
  });
}

function parseCationNum(v) {
  const n = Number(normalizeDecimalText(v));
  return Number.isFinite(n) ? n : null;
}

function sumFinite(arr) {
  return arr.reduce((a, n) => a + (n == null ? 0 : n), 0);
}

function looksLikePctRow(vals, countHint) {
  const nums = vals.filter((n) => n != null);
  if (nums.length < (countHint || 3)) return false;
  const s = sumFinite(nums);
  const max = Math.max.apply(null, nums);
  // Suma típica de bases ≈100; no usar umbral bajo (~70) o se confunde con meq+CIC mezclados
  return s > 88 && s < 112 && max > 20;
}

function looksLikeMeqRow(vals) {
  const nums = vals.filter((n) => n != null);
  if (!nums.length) return false;
  const s = sumFinite(nums);
  const max = Math.max.apply(null, nums);
  return s > 0 && s < 70 && max < 45;
}

/**
 * Si Al/H vienen NA y el modelo metió la CIC en H, recupérala.
 */
function rescueCicFromHydrogen(cations, notesArr, lang) {
  let cic = parseCationNum(cations.cic);
  const h = parseCationNum(cations.h);
  const al = parseCationNum(cations.al);
  if (cic != null && cic > 0) return cic;
  if (h == null || h < 2 || h > 60) return null;
  if (al != null && al > 0) return null;
  const bases = ['ca', 'mg', 'k', 'na'].map((k) => parseCationNum(cations[k]));
  const baseSum = sumFinite(bases);
  // H ≈ CIC típica cuando las "bases" parecen % (suma alta) o no suman como meq≈H
  if (looksLikePctRow(bases, 3) || Math.abs(baseSum - h) > 2) {
    cations.cic = roundStr(h, 3);
    cations.h = '';
    cations.pctH = cations.pctH && parseCationNum(cations.pctH) === h ? '' : cations.pctH;
    notesArr.push(
      tNote(
        lang,
        'CIC: se tomó el valor que venía en H (Al/H no analizados)=' + cations.cic,
        'CEC: took the value that was in H (Al/H not analyzed)=' + cations.cic
      )
    );
    return h;
  }
  return null;
}

/**
 * Cuando la IA mezcla filas % Sat / meq, busca 4 números que sumen ≈100
 * entre ca/mg/k/na y pct* y reconstruye con CIC.
 * Prefiere el subconjunto cuyos meq derivados coinciden con números “sobrantes” del pool.
 */
function recoverBaseSaturationFromPool(cations, cic, notesArr, lang) {
  if (cic == null || cic <= 0 || cic > 80) return false;
  const baseMeqKeys = ['ca', 'mg', 'k', 'na'];
  const basePctKeys = ['pctCa', 'pctMg', 'pctK', 'pctNa'];
  const pool = [];
  baseMeqKeys.forEach((k) => {
    const n = parseCationNum(cations[k]);
    if (n != null && n > 0) pool.push(n);
  });
  basePctKeys.forEach((k) => {
    const n = parseCationNum(cations[k]);
    if (n != null && n > 0) pool.push(n);
  });
  if (pool.length < 4) return false;

  const currentPct = basePctKeys.map((k) => parseCationNum(cations[k]));
  const currentMeq = baseMeqKeys.map((k) => parseCationNum(cations[k]));
  const pctAlreadyGood = looksLikePctRow(currentPct, 4);
  const meqMatchesPct =
    pctAlreadyGood &&
    cic > 0 &&
    currentMeq.filter((m, i) => {
      if (m == null || currentPct[i] == null) return false;
      return Math.abs(m - (currentPct[i] / 100) * cic) < Math.max(0.15, cic * 0.02);
    }).length >= 3;
  if (pctAlreadyGood && meqMatchesPct) return false;

  let best = null;
  const n = pool.length;
  for (let a = 0; a < n - 3; a++) {
    for (let b = a + 1; b < n - 2; b++) {
      for (let c = b + 1; c < n - 1; c++) {
        for (let d = c + 1; d < n; d++) {
          const idxs = [a, b, c, d];
          const subset = idxs.map((i) => pool[i]);
          const s = sumFinite(subset);
          if (s < 90 || s > 110) continue;
          // Evitar elegir meq reales como si fueran % (p.ej. 7.82 dentro del cuarteto)
          const pctSorted = subset.slice().sort((x, y) => y - x);
          if (pctSorted[0] < 25) continue; // Ca% suele ser el mayor
          const meqDerived = pctSorted.map((p) => (p / 100) * cic);
          const used = idxs.slice();
          const leftovers = pool.filter((_, i) => used.indexOf(i) < 0);
          let match = 0;
          meqDerived.forEach((m) => {
            const hit = leftovers.findIndex((v) => Math.abs(v - m) < Math.max(0.12, cic * 0.015));
            if (hit >= 0) {
              match += 1;
              leftovers.splice(hit, 1);
            }
          });
          const err = Math.abs(s - 100);
          // match de sobrantes pesa más que err pequeño (evita 54.7+37.6+7.82+0.55≈100)
          const score = match * 10 - err;
          if (!best || score > best.score) {
            best = { subset: pctSorted, err, sum: s, match, score };
          }
        }
      }
    }
  }
  // Exigir al menos 2 meq del lab reconocibles en el pool, o suma muy cercana a 100
  if (!best || best.err > 8) return false;
  if (best.match < 2 && best.err > 1.5) return false;

  const pctSorted = best.subset;
  basePctKeys.forEach((k, i) => {
    cations[k] = roundStr(pctSorted[i], 2);
  });
  baseMeqKeys.forEach((k, i) => {
    cations[k] = roundStr((pctSorted[i] / 100) * cic, 4);
  });
  cations.cic = roundStr(cic, 3);
  notesArr.push(
    tNote(
      lang,
      'Cationes: se corrigió confusión % Sat / meq (suma %≈' +
        roundStr(best.sum, 2) +
        '); meq = % × CIC=' +
        cations.cic,
      'Cations: fixed % sat / meq mix-up (% sum≈' +
        roundStr(best.sum, 2) +
        '); meq = % × CEC=' +
        cations.cic
    )
  );
  return true;
}

/**
 * Evita confusión típica de tablas lab: fila "% Sat" (arriba) vs "meq/100g" (abajo) vs CIC.
 */
function reconcileSoilCations(cations, notesArr, lang) {
  if (!cations || typeof cations !== 'object') return;
  const baseMeqKeys = ['ca', 'mg', 'k', 'na'];
  const basePctKeys = ['pctCa', 'pctMg', 'pctK', 'pctNa'];

  let cic = rescueCicFromHydrogen(cations, notesArr, lang);
  if (cic == null) {
    cic = parseCationNum(cations.cic);
    if (!Number.isFinite(cic) || cic <= 0) cic = null;
  }

  let baseMeqs = baseMeqKeys.map((k) => parseCationNum(cations[k]));
  let basePcts = basePctKeys.map((k) => parseCationNum(cations[k]));
  let meqSum = sumFinite(baseMeqs);
  let pctSum = sumFinite(basePcts);
  const meqCount = baseMeqs.filter((n) => n != null).length;
  const pctCount = basePcts.filter((n) => n != null).length;

  // Primero intentar recuperar mezcla parcial (% y meq intercalados) con CIC conocida
  if (recoverBaseSaturationFromPool(cations, cic, notesArr, lang)) {
    return;
  }

  // Filas completas intercambiadas: meq←% y pct←meq (solo si la fila meq suma ≈100 limpia)
  if (
    looksLikePctRow(baseMeqs, 4) &&
    (looksLikeMeqRow(basePcts) || pctSum < 70 || pctCount < 3)
  ) {
    baseMeqKeys.forEach((k, i) => {
      const pctVal = baseMeqs[i];
      const meqVal = basePcts[i];
      cations[basePctKeys[i]] = pctVal != null ? roundStr(pctVal, 2) : '';
      cations[k] = meqVal != null ? roundStr(meqVal, 4) : '';
    });
    notesArr.push(
      tNote(
        lang,
        'Cationes: se intercambiaron filas % Sat ↔ meq (el lab pone % arriba y meq abajo)',
        'Cations: swapped % sat ↔ meq rows (lab puts % on top and meq below)'
      )
    );
    if (cic != null && cic > 0) {
      baseMeqKeys.forEach((k, i) => {
        const p = parseCationNum(cations[basePctKeys[i]]);
        if (p == null) return;
        // Si tras el swap el meq quedó vacío o raro, recalcular desde % × CIC
        const m = parseCationNum(cations[k]);
        if (m == null || Math.abs(m - (p / 100) * cic) > Math.max(0.2, cic * 0.03)) {
          cations[k] = roundStr((p / 100) * cic, 4);
        }
      });
    }
    return;
  }

  baseMeqs = baseMeqKeys.map((k) => parseCationNum(cations[k]));
  basePcts = basePctKeys.map((k) => parseCationNum(cations[k]));
  meqSum = sumFinite(baseMeqs);
  pctSum = sumFinite(basePcts);

  if (looksLikePctRow(baseMeqs, 3) && cic != null && cic > 0 && cic < 80) {
    baseMeqKeys.forEach((k, i) => {
      const p = baseMeqs[i];
      if (p == null) return;
      cations[basePctKeys[i]] = roundStr(p, 2);
      cations[k] = roundStr((p / 100) * cic, 4);
    });
    cations.cic = roundStr(cic, 3);
    notesArr.push(
      tNote(
        lang,
        'Cationes: los valores en meq parecían % saturación (suma≈100); se recalcularon meq con CIC=' + cic,
        'Cations: meq values looked like % saturation (sum≈100); meq recalculated with CEC=' + cic
      )
    );
    return;
  }

  const pctCountNow = basePcts.filter((n) => n != null).length;
  if (cic != null && cic > 0 && pctCountNow >= 3 && pctSum > 85 && pctSum < 115) {
    baseMeqKeys.forEach((k, i) => {
      const p = basePcts[i];
      if (p == null) return;
      cations[k] = roundStr((p / 100) * cic, 4);
    });
    cations.cic = roundStr(cic, 3);
    notesArr.push(
      tNote(
        lang,
        'Cationes: meq reconstruidos desde % Sat del lab × CIC=' + cic + ' (evita confusión de filas)',
        'Cations: meq rebuilt from lab % sat × CEC=' + cic + ' (avoids row mix-ups)'
      )
    );
    return;
  }

  // Solo inventar CIC=suma si los meq parecen reales (no % disfrazados)
  if (meqCount >= 4 && looksLikeMeqRow(baseMeqs) && meqSum > 0 && meqSum < 70) {
    if (cic == null || cic <= 0) {
      cations.cic = roundStr(meqSum, 3);
      notesArr.push(
        tNote(
          lang,
          'CIC: no venía claro; se usó suma de meq=' + cations.cic,
          'CEC: was unclear; used sum of meq=' + cations.cic
        )
      );
      cic = meqSum;
    }
    const pctCountFill = basePctKeys.filter((k) => parseCationNum(cations[k]) != null).length;
    if (pctCountFill < 4 && cic > 0) {
      baseMeqKeys.forEach((k, i) => {
        const m = parseCationNum(cations[k]);
        if (m == null) return;
        if (parseCationNum(cations[basePctKeys[i]]) == null) {
          cations[basePctKeys[i]] = roundStr((m / cic) * 100, 2);
        }
      });
    }
  } else if (
    (cic == null || cic <= 0) &&
    looksLikePctRow(baseMeqs, 3) &&
    meqSum > 70
  ) {
    notesArr.push(
      tNote(
        lang,
        'Cationes: los meq parecen % saturación; revisa la fila meq/CIC del informe antes de aplicar',
        'Cations: meq fields look like % saturation; check the meq/CEC row in the report before applying'
      )
    );
  }
}

function normalizeSoilPayload(raw, lang) {
  const base = emptySoilShape();
  if (!raw || typeof raw !== 'object') return base;
  lang = noteLang(lang);
  base.title = asStr(raw.title);
  base.date = asStr(raw.date);
  base.notes = asStr(raw.notes);
  base.confidence = asStr(raw.confidence);
  const limitHints = [];
  const convertNotes = [];
  ['physical', 'phSection', 'fertility', 'cations', 'ratios'].forEach((group) => {
    const src = raw[group] && typeof raw[group] === 'object' ? raw[group] : {};
    Object.keys(base[group]).forEach((key) => {
      if (key === 'forms') return;
      const val = asStr(src[key]);
      base[group][key] = val;
      if (val && isDetectionLimitValue(val)) {
        limitHints.push(group + '.' + key + ': ' + val);
      }
    });
  });
  if (raw.fertility && raw.fertility.forms && typeof raw.fertility.forms === 'object') {
    base.fertility.forms = raw.fertility.forms;
  }
  if (raw.fertility) {
    ['sReportedAs', 'pReportedAs', 'kReportedAs', 'nNo3ReportedAs', 'caReportedAs', 'mgReportedAs'].forEach(
      function (k) {
        if (raw.fertility[k] != null) base.fertility[k] = asStr(raw.fertility[k]);
      }
    );
  }
  if (base.fertility.pMethod) {
    const pm = base.fertility.pMethod.toLowerCase();
    if (pm.includes('olsen')) base.fertility.pMethod = 'Olsen';
    else if (pm.includes('bray') && pm.includes('2')) base.fertility.pMethod = 'Bray 2';
    else if (pm.includes('bray')) base.fertility.pMethod = 'Bray';
    else if (pm.includes('mehlich')) base.fertility.pMethod = 'Mehlich';
  }
  const unitHints =
    (raw.unitHints && typeof raw.unitHints === 'object' && raw.unitHints) ||
    (raw.sourceUnits && typeof raw.sourceUnits === 'object' && raw.sourceUnits) ||
    {};
  const bdResolved = resolveBulkDensity(base.physical, raw, base.notes);
  if (bdResolved) base.physical.bulkDensity = bdResolved;
  else if (!looksPlausibleGcm3(parseFloat(String(base.physical.bulkDensity || '').replace(',', '.')))) {
    base.physical.bulkDensity = '';
  }
  normalizeEnglishPhysicalUnits(base, convertNotes, lang, unitHints);
  base.physical.bulkDensity = finalizeBulkDensity(base.physical.bulkDensity);
  normalizeFertilityForms(base.fertility, convertNotes, lang);
  reconcileSoilCations(base.cations, convertNotes, lang);
  if (limitHints.length) {
    const hint = tNote(
      lang,
      'Límites de detección (define el número en la revisión): ' + limitHints.join('; '),
      'Detection limits (set a number in review): ' + limitHints.join('; ')
    );
    base.notes = base.notes ? base.notes + ' | ' + hint : hint;
  }
  if (convertNotes.length) {
    const hint = convertNotes.join(' · ');
    base.notes = base.notes ? base.notes + ' | ' + hint : hint;
  }
  return base;
}

function decimalRule(lang) {
  return noteLang(lang) === 'en'
    ? '- DECIMAL SEPARATOR: always use a dot (1.5, 0.418), even if the report uses a comma ("1,5" → "1.5"). Never output thousands separators ("2,500" → "2500").'
    : '- SEPARADOR DECIMAL: usa SIEMPRE punto (1.5, 0.418), aunque el informe use coma ("1,5" → "1.5"). Nunca uses separador de miles ("2,500" → "2500").';
}

function soilPrompt(lang) {
  const en = noteLang(lang) === 'en';
  const notesRule = en
    ? '- notes: short note in ENGLISH if the report is ambiguous, incomplete, has limits (<, ND), SO4 vs S forms, or English/US units were converted. Always write notes in English.'
    : '- notes: breve aviso en ESPAÑOL si el informe es ambiguo, incompleto, tiene límites (<, ND), formas SO4 vs S, o se convirtieron unidades inglesas/USA. Escribe notes siempre en español.';
  return [
    en
      ? 'You are a soil lab report extractor for NutriPlant PRO.'
      : 'Eres un extractor de análisis de suelo agrícola para NutriPlant PRO.',
    en
      ? 'Read the lab PDF or image and return ONLY valid JSON (no markdown) with this exact shape:'
      : 'Lee el PDF o imagen del laboratorio y devuelve SOLO un JSON válido (sin markdown) con esta forma exacta:',
    JSON.stringify(emptySoilShape(), null, 2),
    '',
    en
      ? 'You MAY also include an optional sibling object unitHints (not inside the soil fields) describing ORIGINAL lab units before conversion, e.g.:'
      : 'Puedes incluir además un objeto opcional unitHints (fuera de los campos de suelo) con las unidades ORIGINALES del lab antes de convertir, ej.:',
    '{"unitHints":{"system":"us_customary","depth":"in","bulkDensity":"lb/ft3","hydraulicConductivity":"in/h","salinity":"mmhos/cm","fertility":"ppm"}}',
    '',
    en ? 'Rules:' : 'Reglas:',
    '- Usa números en string. Si un valor no aparece, deja "".',
    decimalRule(lang),
    '- No inventes datos. Prefiere vacío a adivinar.',
    '- IMPORTANTE: si el lab reporta límite de detección o no cuantificado, NO inventes un número.',
    '  Ejemplos: "<25", "< 0.5", ">100", "ND", "traza", "BDL". Conserva el texto EXACTO en el campo',
    '  (ej. fertility.na = "<25") y menciónalo en notes. El usuario lo convertirá a número en la revisión.',
    '- mg/kg y ppm son equivalentes para fertility; guarda solo el número (o el texto de límite).',
    '- fertility: nutrientes en ppm elemental (salvo mo %). nNo3 = N-NO3 ppm. moly = Mo.',
    '- FORMAS DE LAB (fertility.forms): indica cómo vino cada valor. NutriPlant guarda ELEMENTAL.',
    '  Ejemplos forms: p="P2O5"| "P"; k="K2O"|"K"; ca="CaO"|"Ca"; mg="MgO"|"Mg";',
    '  s="SO4"|"SO3"|"S"|"S-SO4"; nNo3="NO3"|"N-NO3"|"NH4"; fe="Fe2O3"|"Fe"; mn="MnO"|"Mn"; zn="ZnO"|"Zn".',
    '  El servidor convierte óxido/ion → elemental (P₂O₅×0.436, K₂O×0.830, SO₄×0.334, NO₃×0.226, etc.).',
    '  Si ya es elemental, forms="P"/"K"/"S"/… o "".',
    '- UNIDADES INGLESAS / USA (CRÍTICO): NutriPlant guarda SIEMPRE métrico canónico.',
    '  Detecta si el PDF es lab USA / English units (inches, in/hr, lb/ft³, lb/acre, mmhos/cm, etc.).',
    '  Convierte ANTES de guardar en los campos:',
    '  * fertility.depthCm: pulgadas/inches → cm (×2.54). pies/ft → cm (×30.48). Resultado en CM.',
    '  * physical.bulkDensity: lb/ft³ (pcf) → g/cm³ (×0.016018). Resultado en g/cm³.',
    '  * physical.hydraulicConductivity: in/h o in/hr → cm/h (×2.54). Resultado en cm/h.',
    '  * phSection.salinity: mmhos/cm y mS/cm = dS/m (mismo número). Guarda dS/m.',
    '  * fertility ppm/mg/kg: no cambian de número. Si el lab trae lb/acre para nutrientes, NO inventes ppm;',
    '    deja el número y pon unitHints.fertility="lb/acre" + avisa en notes (el servidor no convierte lb/acre a ppm a ciegas).',
    '  * CEC/meq/100g y % sat: iguales en labs USA y MX; no conviertas.',
    '  Llena unitHints con las unidades ORIGINALES detectadas (system="us_customary" si aplica).',
    '  En notes menciona cada conversión hecha (ej. "Depth 6 in → 15.24 cm").',
    '- CATIONES (CRÍTICO — formato típico de lab mexicano/español; labs USA usan CEC meq/100g + % base sat igual):',
    '  Tabla "Cationes Intercambiables / Porcentaje de saturación de bases" / "Exchangeable cations / Base saturation":',
    '  * Fila SUPERIOR "% Sat" / "% Base Sat" → SOLO pctCa, pctMg, pctK, pctNa, pctAl, pctH (suman ≈100).',
    '  * Fila INFERIOR "me/100g" o "meq/100g" → SOLO ca, mg, k, na, al, h y CIC en cations.cic.',
    '  * Las etiquetas Ca Mg K Na Al H CIC suelen estar ABAJO; no te guíes solo por el orden visual.',
    '  * Ejemplo real: %Sat Ca=54.7 Mg=37.6 K=3.85 Na=3.64 | meq Ca=7.82 Mg=5.38 K=0.55 Na=0.52 | CIC=14.3',
    '  * En ese ejemplo: cations.ca="7.82" (NO 54.7), cations.pctCa="54.7", cations.cic="14.3".',
    '  * NA / ND / vacío en Al o H → deja "" ; NUNCA pongas la CIC dentro de cations.h.',
    '  * CIC/CEC va SOLO en cations.cic (meq ~2-50). NUNCA como % ni en H.',
    '  * NUNCA copies un % (54.7, 37.6…) en ca/mg/k/na meq.',
    '  * NUNCA copies un meq (7.82, 0.55…) en pct*.',
    '  * Si hay ambas filas, llena AMBAS con los valores exactos del lab (fila correcta → campo correcto).',
    '- phSection.salinity = CE en dS/m si aparece.',
    '- physical: % para saturación/CC/PMP; bulkDensity g/cm3; hydraulicConductivity cm/h.',
    '- physical.bulkDensity = DENSIDAD APARENTE del suelo (g/cm³). Labs la escriben distinto:',
    '  Títulos: "Densidad aparente", "Dens. Aparente", "Dens. aparente", "Dens Aparente",',
    '  "Dens. Ap.", "D.A.", "DA", "Dap", "Peso volumétrico", "Densidad volumétrica",',
    '  "Bulk density", "Bulk dens.", "Bd", "Apparent density".',
    '  "¹Dens. Aparente" / "1Dens. Aparente": el 1 o ¹ es NOTA AL PIE, no el valor.',
    '  Unidades (mismo valor físico): g/cm³, g/cm3, g/cc, Mg/m³, t/m³. kg/m³ = ÷1000 (1320 → 1.32).',
    '  USA: lb/ft³ o pcf → g/cm³ (×0.016018). Ejemplo: "¹Dens. Aparente  1.32  g/cm³" → "1.32".',
    '  Rango típico 0.8–1.4 g/cm³. NUNCA uses el 1/2/3 de la nota al pie.
  Si no hay un valor claro en ese rango, deja bulkDensity vacío (el sistema pondrá 1).',
    '  NUNCA copies Cond. Hidráulica (cm/hr, p.ej. 9.00), % saturación/CC/PMP, ni textura.',
    '  No confundas con densidad real/partícula (~2.65).',
    '- date en YYYY-MM-DD si puedes; title = lab/cliente/rancho si aparece.',
    '- confidence: "high" | "medium" | "low".',
    notesRule
  ].join('\n');
}

function emptyIonicShape(kind) {
  const base = {
    title: '',
    date: '',
    notes: '',
    confidence: '',
    general: {},
    cations: {
      ca_meq: '',
      ca_ppm: '',
      mg_meq: '',
      mg_ppm: '',
      na_meq: '',
      na_ppm: '',
      k_meq: '',
      k_ppm: ''
    },
    anions: {
      so4_meq: '',
      so4_ppm: '',
      hco3_meq: '',
      hco3_ppm: '',
      cl_meq: '',
      cl_ppm: '',
      co3_meq: '',
      co3_ppm: '',
      po4_meq: '',
      po4_ppm: '',
      no3_meq: '',
      no3_ppm: ''
    },
    micros: {}
  };
  if (kind === 'solucion_nutritiva') {
    base.general = { ce: '', ph: '', ras: '' };
    base.micros = { b: '', fe: '', mn: '', cu: '', zn: '', mo: '', n_nh4: '' };
    base.ideal = {};
  } else if (kind === 'extracto_pasta') {
    base.general = { cee: '', ras: '', phe: '' };
    base.micros = { b: '', fe: '', mn: '', cu: '', zn: '', mo: '' };
    base.ideal = {};
  } else if (kind === 'agua') {
    base.m3Riego = '';
    base.acidResidualMeq = '';
    base.general = { ce: '', ph: '', ras: '' };
    base.micros = { b: '', fe: '', mn: '', cu: '', zn: '' };
  }
  return base;
}

function emptyFoliarShape() {
  return {
    title: '',
    date: '',
    notes: '',
    confidence: '',
    macros: { N: '', P: '', K: '', Ca: '', Mg: '', S: '' },
    micros: { Fe: '', Mn: '', Zn: '', Cu: '', B: '', Mo: '' }
  };
}

function emptyFrutaShape() {
  return Object.assign(emptyFoliarShape(), {
    calidad: { materiaSeca: '', brix: '', firmeza: '', acidezTitulable: '' },
    calcio: { caTotal: '', caSolublePct: '', caLigadoPct: '', caInsolublePct: '' }
  });
}

function reconcileIonicMeqPpm(base, kind) {
  const weights = {
    k: 39.1,
    ca: 20.04,
    mg: 12.15,
    na: 23,
    no3: 14,
    po4: kind === 'agua' ? 30.97 : 31,
    so4: 16.03,
    cl: 35.45,
    hco3: 61,
    co3: 30
  };
  function numOk(s) {
    const t = asStr(s).trim();
    if (!t) return false;
    if (/^(nd|n\.?\s*d\.?|traza|trace|bdl|lod|loq|ndr)$/i.test(t)) return false;
    if (/^[<>]=?\s*\d/.test(t)) return false;
    const n = Number(t);
    return Number.isFinite(n);
  }
  function fillGroup(group) {
    if (!group || typeof group !== 'object') return;
    Object.keys(weights).forEach((ion) => {
      const meqKey = ion + '_meq';
      const ppmKey = ion + '_ppm';
      if (!(meqKey in group) && !(ppmKey in group)) return;
      const w = weights[ion];
      if (!w) return;
      const hasMeq = numOk(group[meqKey]);
      const hasPpm = numOk(group[ppmKey]);
      // Si hay ambos, manda ppm y recalcula meq (labs suelen reportar ppm elemental).
      if (hasPpm) {
        group[meqKey] = (Number(group[ppmKey]) / w).toFixed(2);
      } else if (hasMeq) {
        group[ppmKey] = (Number(group[meqKey]) * w).toFixed(2);
      }
    });
  }
  fillGroup(base.cations);
  fillGroup(base.anions);
}

function normalizeIonicPayload(raw, kind, lang) {
  const base = emptyIonicShape(kind);
  if (!raw || typeof raw !== 'object') return base;
  lang = noteLang(lang);
  base.title = asStr(raw.title);
  base.date = asStr(raw.date);
  base.notes = asStr(raw.notes);
  base.confidence = asStr(raw.confidence);
  if (kind === 'agua') {
    base.m3Riego = asStr(raw.m3Riego);
    base.acidResidualMeq = asStr(raw.acidResidualMeq);
  }
  ['general', 'cations', 'anions', 'micros'].forEach((group) => {
    const src = raw[group] && typeof raw[group] === 'object' ? raw[group] : {};
    Object.keys(base[group]).forEach((key) => {
      base[group][key] = asStr(src[key]);
    });
  });
  if (kind === 'extracto_pasta' && raw.general) {
    if (!base.general.cee) base.general.cee = asStr(raw.general.ce || raw.general.EC || raw.general.ec);
    if (!base.general.phe) base.general.phe = asStr(raw.general.ph || raw.general.pH);
  }
  if ((kind === 'solucion_nutritiva' || kind === 'agua') && raw.general) {
    if (!base.general.ce) base.general.ce = asStr(raw.general.EC || raw.general.ec || raw.general.cee);
    if (!base.general.ph) base.general.ph = asStr(raw.general.pH || raw.general.phe);
  }
  reconcileIonicMeqPpm(base, kind);
  return base;
}

function normalizeFoliarPayload(raw) {
  const base = emptyFoliarShape();
  if (!raw || typeof raw !== 'object') return base;
  base.title = asStr(raw.title);
  base.date = asStr(raw.date);
  base.notes = asStr(raw.notes);
  base.confidence = asStr(raw.confidence);
  const macros = raw.macros && typeof raw.macros === 'object' ? raw.macros : {};
  const micros = raw.micros && typeof raw.micros === 'object' ? raw.micros : {};
  Object.keys(base.macros).forEach((k) => {
    base.macros[k] = asStr(macros[k] != null ? macros[k] : macros[k.toLowerCase()]);
  });
  Object.keys(base.micros).forEach((k) => {
    base.micros[k] = asStr(micros[k] != null ? micros[k] : micros[k.toLowerCase()]);
  });
  return base;
}

function normalizeFrutaPayload(raw) {
  const base = emptyFrutaShape();
  const foliar = normalizeFoliarPayload(raw);
  base.title = foliar.title;
  base.date = foliar.date;
  base.notes = foliar.notes;
  base.confidence = foliar.confidence;
  base.macros = foliar.macros;
  base.micros = foliar.micros;
  const calidad = raw && raw.calidad && typeof raw.calidad === 'object' ? raw.calidad : {};
  const calcio = raw && raw.calcio && typeof raw.calcio === 'object' ? raw.calcio : {};
  Object.keys(base.calidad).forEach((k) => {
    base.calidad[k] = asStr(calidad[k]);
  });
  if (!base.calidad.brix) {
    base.calidad.brix = asStr(calidad.Brix || calidad.degreesBrix || calidad['°Brix']);
  }
  Object.keys(base.calcio).forEach((k) => {
    base.calcio[k] = asStr(calcio[k]);
  });
  return base;
}

function ionicPrompt(kind, lang) {
  const en = noteLang(lang) === 'en';
  const shape = emptyIonicShape(kind);
  const labels = {
    solucion_nutritiva: en ? 'nutrient solution / fertigation liquor' : 'solución nutritiva / licor de fertirriego',
    extracto_pasta: en ? 'saturated paste extract' : 'extracto de pasta saturada',
    agua: en ? 'irrigation / fertigation water' : 'agua de riego / fertirrigación'
  };
  const name = labels[kind] || kind;
  return [
    en
      ? 'You are a lab report extractor for NutriPlant PRO (' + name + ').'
      : 'Eres un extractor de análisis de laboratorio para NutriPlant PRO (' + name + ').',
    en
      ? 'Read the PDF/image (Spanish or English labs) and return ONLY valid JSON with this exact shape:'
      : 'Lee el PDF/imagen (lab en español o inglés) y devuelve SOLO JSON válido con esta forma exacta:',
    JSON.stringify(shape, null, 2),
    '',
    en ? 'Rules:' : 'Reglas:',
    '- Numbers as strings. Missing values = "". Do not invent.',
    decimalRule(lang),
    '- Detection limits (<, ND, trace, BDL): keep EXACT text in the field; mention in notes.',
    '- Synonyms EN/ES: EC/CE/electrical conductivity → general.ce (or general.cee for paste); pH; SAR/RAS;',
    '  K/Ca/Mg/Na cations; NO3/nitrate, H2PO4/PO4/phosphate/P, SO4/sulfate/S, Cl/chloride, HCO3/bicarbonate, CO3/carbonate;',
    '  micros B Fe Mn Zn Cu Mo; NH4/ammonium → micros.n_nh4 when present (SN only).',
    '- Prefer ppm elemental for nutrient concentrations when both meq and ppm appear; still fill both if clear.',
    '- meq/L and mmolc/L are equivalent for charge; store the number in *_meq fields.',
    '- date YYYY-MM-DD if possible; title = lab/client/ranch if present.',
    '- confidence: high|medium|low.',
    en
      ? '- notes: short ENGLISH note if ambiguous or conversions needed.'
      : '- notes: breve aviso en ESPAÑOL si hay ambigüedad o conversiones.'
  ].join('\n');
}

function foliarPrompt(lang) {
  const en = noteLang(lang) === 'en';
  return [
    en
      ? 'You are a leaf/tissue lab report extractor for NutriPlant PRO.'
      : 'Eres un extractor de análisis foliar para NutriPlant PRO.',
    en
      ? 'Read the PDF/image (ES or EN) and return ONLY valid JSON:'
      : 'Lee el PDF/imagen (ES o EN) y devuelve SOLO JSON válido:',
    JSON.stringify(emptyFoliarShape(), null, 2),
    '',
    decimalRule(lang),
    '- macros N P K Ca Mg S as % dry matter (string numbers).',
    '- micros Fe Mn Zn Cu B Mo as mg/kg or ppm (same number).',
    '- Do not invent. Limits (<, ND) keep exact text.',
    '- Synonyms: leaf analysis, tissue test, foliar, hoja, % MS, dry weight.',
    '- date YYYY-MM-DD; title if present; confidence high|medium|low.',
    en ? '- notes in English if needed.' : '- notes en español si hace falta.'
  ].join('\n');
}

function frutaPrompt(lang) {
  const en = noteLang(lang) === 'en';
  return [
    en
      ? 'You are a fruit quality/nutrient lab report extractor for NutriPlant PRO.'
      : 'Eres un extractor de análisis de fruta para NutriPlant PRO.',
    en
      ? 'Read the PDF/image (ES or EN) and return ONLY valid JSON:'
      : 'Lee el PDF/imagen (ES o EN) y devuelve SOLO JSON válido:',
    JSON.stringify(emptyFrutaShape(), null, 2),
    '',
    decimalRule(lang),
    '- macros % ; micros mg/kg; calidad: dry matter / materiaSeca, Brix/°Brix → brix, firmness/firmeza, titratable acidity/acidezTitulable.',
    '- calcio: total Ca, soluble/ligado/insoluble % if present.',
    '- Do not invent. Keep detection-limit text exact.',
    '- date YYYY-MM-DD; title; confidence; notes language matches UI language.'
  ].join('\n');
}

function resolveAnalysisType(raw) {
  const t = String(raw || 'soil').trim().toLowerCase();
  const map = {
    soil: 'soil',
    suelo: 'soil',
    solucion_nutritiva: 'solucion_nutritiva',
    sn: 'solucion_nutritiva',
    solucion: 'solucion_nutritiva',
    nutrient_solution: 'solucion_nutritiva',
    extracto_pasta: 'extracto_pasta',
    pasta: 'extracto_pasta',
    ep: 'extracto_pasta',
    paste: 'extracto_pasta',
    agua: 'agua',
    water: 'agua',
    aw: 'agua',
    foliar: 'foliar',
    leaf: 'foliar',
    fruta: 'fruta',
    fruit: 'fruta'
  };
  return map[t] || null;
}

function promptForType(analysisType, lang) {
  if (analysisType === 'soil') return soilPrompt(lang);
  if (analysisType === 'solucion_nutritiva' || analysisType === 'extracto_pasta' || analysisType === 'agua') {
    return ionicPrompt(analysisType, lang);
  }
  if (analysisType === 'foliar') return foliarPrompt(lang);
  if (analysisType === 'fruta') return frutaPrompt(lang);
  return soilPrompt(lang);
}

function normalizeForType(analysisType, parsed, lang) {
  if (analysisType === 'soil') return normalizeSoilPayload(parsed, lang);
  if (analysisType === 'solucion_nutritiva' || analysisType === 'extracto_pasta' || analysisType === 'agua') {
    return normalizeIonicPayload(parsed, analysisType, lang);
  }
  if (analysisType === 'foliar') return normalizeFoliarPayload(parsed);
  if (analysisType === 'fruta') return normalizeFrutaPayload(parsed);
  return normalizeSoilPayload(parsed, lang);
}

async function verifyUser(accessToken) {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key =
    (process.env.SUPABASE_ANON_KEY || '').trim() ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    return { ok: false, status: 500, error: 'Supabase no configurado en el servidor.' };
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error } = await supabase.auth.getUser(accessToken);
  if (error || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' };
  }
  return { ok: true, userId: userData.user.id, email: userData.user.email || '' };
}

async function extractWithOpenAI({ buffer, filename, mimeType, language, analysisType }) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, status: 500, error: 'OPENAI_API_KEY no configurada.' };
  }
  const lang = noteLang(language);
  const type = resolveAnalysisType(analysisType) || 'soil';
  const model = resolveModel();
  const isPdf = /pdf/i.test(mimeType || '') || /\.pdf$/i.test(filename || '');
  const b64 = buffer.toString('base64');
  const dataUrl = isPdf
    ? 'data:application/pdf;base64,' + b64
    : 'data:' + (mimeType || 'image/jpeg') + ';base64,' + b64;

  const content = [
    { type: 'input_text', text: promptForType(type, lang) }
  ];
  if (isPdf) {
    content.push({
      type: 'input_file',
      filename: filename || ('analisis-' + type + '.pdf'),
      file_data: dataUrl
    });
  } else {
    content.push({
      type: 'input_image',
      image_url: dataUrl
    });
  }

  const payload = {
    model,
    input: [{ role: 'user', content }],
    max_output_tokens: isGpt56Family(model) ? 8000 : 6000
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && data.error && data.error.message) ||
      ('OpenAI error HTTP ' + res.status);
    return { ok: false, status: 502, error: msg };
  }
  const text = outputTextFromResponses(data);
  if (!text || text === 'SIN_TEXTO_LEGIBLE') {
    return { ok: false, status: 422, error: 'No se pudo leer texto útil del archivo.' };
  }
  const parsed = parseJsonLoose(text);
  if (!parsed) {
    return { ok: false, status: 422, error: 'La IA no devolvió JSON válido. Intenta con otro PDF o captura más clara.' };
  }
  return {
    ok: true,
    analysisType: type,
    fields: normalizeForType(type, normalizeDecimalsInPayload(parsed), lang),
    model,
    rawPreview: text.slice(0, 400)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Método no permitido.' });
  }

  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse(401, { ok: false, error: 'Falta autorización.' });
  }

  const user = await verifyUser(token);
  if (!user.ok) {
    return jsonResponse(user.status, { ok: false, error: user.error });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { ok: false, error: 'JSON inválido.' });
  }

  const analysisType = resolveAnalysisType(body.analysisType || 'soil');
  if (!analysisType) {
    return jsonResponse(400, {
      ok: false,
      error:
        'analysisType no soportado. Usa: soil, solucion_nutritiva, extracto_pasta, agua, foliar, fruta (o aliases sn/pasta/water/leaf/fruit).'
    });
  }
  const language = noteLang(body.language || body.lang || 'es');

  const filename = String(body.filename || 'analisis.pdf').slice(0, 180);
  const mimeType = String(body.mimeType || 'application/pdf').slice(0, 120);
  const fileBase64 = String(body.fileBase64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!fileBase64) {
    return jsonResponse(400, { ok: false, error: 'Falta fileBase64.' });
  }

  let buffer;
  try {
    buffer = Buffer.from(fileBase64, 'base64');
  } catch (e) {
    return jsonResponse(400, { ok: false, error: 'Base64 inválido.' });
  }
  if (!buffer.length) {
    return jsonResponse(400, { ok: false, error: 'Archivo vacío.' });
  }
  if (buffer.length > MAX_BYTES) {
    return jsonResponse(413, {
      ok: false,
      error: 'Archivo demasiado grande (máx. ~4.5 MB). Comprime el PDF o usa una imagen más liviana.'
    });
  }

  const creditsNeeded = CREDITS_LAB_EXTRACT;
  const creditGate = await assertChatCredits(user.userId, creditsNeeded);
  if (!creditGate.ok) {
    return jsonResponse(creditGate.status || 429, {
      ok: false,
      error: creditGate.error,
      code: creditGate.code,
      quota: creditGate.quota || null,
      credits_required: creditsNeeded
    });
  }

  try {
    const extracted = await extractWithOpenAI({
      buffer,
      filename,
      mimeType,
      language,
      analysisType
    });
    if (!extracted.ok) {
      return jsonResponse(extracted.status || 500, { ok: false, error: extracted.error });
    }
    if (creditGate.supabase && !creditGate.skipped) {
      await addUsageInSupabase(creditGate.supabase, user.userId, creditsNeeded);
    }
    return jsonResponse(200, {
      ok: true,
      analysisType: extracted.analysisType || analysisType,
      fields: extracted.fields,
      model: extracted.model,
      credits_used: creditGate.skipped ? 0 : creditsNeeded,
      credits_required: creditsNeeded
    });
  } catch (e) {
    console.error('lab-analysis-extract', e);
    return jsonResponse(500, {
      ok: false,
      error: e && e.message ? e.message : 'Error al extraer el análisis.'
    });
  }
};
