/**
 * Netlify Function: extrae campos de un PDF/imagen de análisis de laboratorio
 * y los mapea al shape NutriPlant (fase 1: soil).
 *
 * POST JSON { analysisType: 'soil', filename, mimeType, fileBase64 }
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

function isPlainNumericValue(s) {
  const t = String(s || '').trim().replace(/,/g, '');
  if (!t) return false;
  if (isDetectionLimitValue(t)) return false;
  return /^-?\d+(\.\d+)?$/.test(t);
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

/**
 * Convierte variantes comunes de lab (P₂O₅, K₂O, SO₄, NO₃, …) a elemental.
 * Lee fertility.forms.{p,k,ca,mg,s,nNo3,…} o *ReportedAs legacy (sReportedAs).
 */
function normalizeFertilityForms(fertility, notesArr) {
  if (!fertility || typeof fertility !== 'object') return;
  const forms = {};
  const srcForms = fertility.forms && typeof fertility.forms === 'object' ? fertility.forms : {};
  Object.keys(srcForms).forEach(function (k) {
    forms[k] = canonForm(srcForms[k]);
  });
  // Legacy / aliases
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
    const num = Number(String(raw).replace(/,/g, ''));
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
        notesArr.push(field + ': ' + conv.label + ' (sin convertir)=' + fertility[field]);
      } else {
        fertility[field] = roundStr(num * conv.factor, 3);
        notesArr.push(
          field + ': lab ' + form + '=' + raw + ' → elemental=' + fertility[field] + ' (' + conv.label + ')'
        );
      }
      return;
    }
    // Forma desconocida: dejar número y avisar
    fertility[field] = roundStr(num, 3);
    notesArr.push(field + ': forma reportada "' + form + '" no mapeada; valor sin convertir=' + fertility[field]);
  });
}

/**
 * Evita confusión típica de tablas lab: fila "% Sat" vs "meq/100g" vs CIC.
 * Si hay % Sat + CIC, reconstruye meq = %/100 × CIC.
 * Si los "meq" suman ~100 y hay CIC real, eran % metidos en meq.
 */
function reconcileSoilCations(cations, notesArr) {
  if (!cations || typeof cations !== 'object') return;
  const meqKeys = ['ca', 'mg', 'k', 'na', 'al', 'h'];
  const pctKeys = ['pctCa', 'pctMg', 'pctK', 'pctNa', 'pctAl', 'pctH'];

  const meqs = meqKeys.map((k) => {
    const n = Number(String(cations[k] || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  });
  const pcts = pctKeys.map((k) => {
    const n = Number(String(cations[k] || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  });
  let cic = Number(String(cations.cic || '').replace(/,/g, ''));
  if (!Number.isFinite(cic)) cic = null;

  const meqSum = meqs.reduce((a, n) => a + (n == null ? 0 : n), 0);
  const pctSum = pcts.reduce((a, n) => a + (n == null ? 0 : n), 0);
  const pctCount = pcts.filter((n) => n != null).length;
  const meqCount = meqs.filter((n) => n != null).length;

  if (meqSum > 85 && meqSum < 115 && cic != null && cic > 0 && cic < 60 && meqCount >= 4) {
    meqKeys.forEach((k, i) => {
      const p = meqs[i];
      if (p == null) return;
      cations[pctKeys[i]] = roundStr(p, 2);
      cations[k] = roundStr((p / 100) * cic, 4);
    });
    notesArr.push(
      'Cationes: los valores en meq parecían % saturación (suma≈100); se recalcularon meq con CIC=' + cic
    );
    return;
  }

  if (cic != null && cic > 0 && pctCount >= 4 && pctSum > 90 && pctSum < 110) {
    meqKeys.forEach((k, i) => {
      const p = pcts[i];
      if (p == null) return;
      cations[k] = roundStr((p / 100) * cic, 4);
    });
    cations.cic = roundStr(cic, 3);
    notesArr.push(
      'Cationes: meq reconstruidos desde % Sat del lab × CIC=' + cic + ' (evita confusión de filas)'
    );
    return;
  }

  if (meqCount >= 4 && meqSum > 0 && meqSum < 85) {
    if (cic == null || cic <= 0) {
      cations.cic = roundStr(meqSum, 3);
      notesArr.push('CIC: no venía claro; se usó suma de meq=' + cations.cic);
      cic = meqSum;
    }
    if (pctCount < 4 && cic > 0) {
      meqKeys.forEach((k, i) => {
        const m = meqs[i];
        if (m == null) return;
        if (pcts[i] == null) cations[pctKeys[i]] = roundStr((m / cic) * 100, 2);
      });
    }
  }
}

function normalizeSoilPayload(raw) {
  const base = emptySoilShape();
  if (!raw || typeof raw !== 'object') return base;
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
  normalizeFertilityForms(base.fertility, convertNotes);
  reconcileSoilCations(base.cations, convertNotes);
  if (limitHints.length) {
    const hint =
      'Límites de detección (define el número en la revisión): ' + limitHints.join('; ');
    base.notes = base.notes ? base.notes + ' | ' + hint : hint;
  }
  if (convertNotes.length) {
    const hint = convertNotes.join(' · ');
    base.notes = base.notes ? base.notes + ' | ' + hint : hint;
  }
  return base;
}

function soilPrompt() {
  return [
    'Eres un extractor de análisis de suelo agrícola para NutriPlant PRO.',
    'Lee el PDF o imagen del laboratorio y devuelve SOLO un JSON válido (sin markdown) con esta forma exacta:',
    JSON.stringify(emptySoilShape(), null, 2),
    '',
    'Reglas:',
    '- Usa números en string. Si un valor no aparece, deja "".',
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
    '- CATIONES (muy importante — tablas con 2 filas):',
    '  * Fila "meq/100g" o "cmol+/kg" → cations.ca/mg/k/na/al/h y cations.cic (típico Ca~1-40, CIC~2-50).',
    '  * Fila "% Sat" / "% saturación" / "% bases" → cations.pctCa/pctMg/pctK/pctNa/pctAl/pctH (suman ~100).',
    '  * NUNCA copies un % (ej. 75.8 o 1.42) dentro de ca/mg/k/na meq.',
    '  * NUNCA copies un meq (ej. 4.80) dentro de pct*.',
    '  * CIC/CEC va en cations.cic (meq), NO como porcentaje.',
    '  * Si la tabla muestra ambas filas, llena AMBAS con los valores exactos del lab.',
    '- phSection.salinity = CE en dS/m si aparece.',
    '- physical: % para saturación/CC/PMP; bulkDensity g/cm3; hydraulicConductivity cm/h.',
    '- date en YYYY-MM-DD si puedes; title = lab/cliente/rancho si aparece.',
    '- confidence: "high" | "medium" | "low".',
    '- notes: breve aviso si el informe es ambiguo, incompleto, tiene límites (<, ND) o formas SO4 vs S.'
  ].join('\n');
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

async function extractWithOpenAI({ buffer, filename, mimeType }) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, status: 500, error: 'OPENAI_API_KEY no configurada.' };
  }
  const model = resolveModel();
  const isPdf = /pdf/i.test(mimeType || '') || /\.pdf$/i.test(filename || '');
  const b64 = buffer.toString('base64');
  const dataUrl = isPdf
    ? 'data:application/pdf;base64,' + b64
    : 'data:' + (mimeType || 'image/jpeg') + ';base64,' + b64;

  const content = [
    { type: 'input_text', text: soilPrompt() }
  ];
  if (isPdf) {
    content.push({
      type: 'input_file',
      filename: filename || 'analisis-suelo.pdf',
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
  return { ok: true, fields: normalizeSoilPayload(parsed), model, rawPreview: text.slice(0, 400) };
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

  const analysisType = String(body.analysisType || 'soil').trim().toLowerCase();
  if (analysisType !== 'soil') {
    return jsonResponse(400, { ok: false, error: 'Por ahora solo analysisType=soil está soportado.' });
  }

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
    const extracted = await extractWithOpenAI({ buffer, filename, mimeType });
    if (!extracted.ok) {
      return jsonResponse(extracted.status || 500, { ok: false, error: extracted.error });
    }
    if (creditGate.supabase && !creditGate.skipped) {
      await addUsageInSupabase(creditGate.supabase, user.userId, creditsNeeded);
    }
    return jsonResponse(200, {
      ok: true,
      analysisType: 'soil',
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
