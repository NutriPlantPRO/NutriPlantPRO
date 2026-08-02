/**
 * Netlify Function: extrae campos de un PDF/imagen de análisis de laboratorio
 * y los mapea al shape NutriPlant (fase 1: soil).
 *
 * POST JSON { analysisType: 'soil', filename, mimeType, fileBase64 }
 * Authorization: Bearer <supabase access_token>
 *
 * Env: OPENAI_API_KEY, OPENAI_ADMIN_MODEL | OPENAI_OCR_MODEL,
 *      SUPABASE_URL, SUPABASE_ANON_KEY (o SERVICE_ROLE para auth.getUser)
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

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
      reachPct: ''
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

function normalizeSoilPayload(raw) {
  const base = emptySoilShape();
  if (!raw || typeof raw !== 'object') return base;
  base.title = asStr(raw.title);
  base.date = asStr(raw.date);
  base.notes = asStr(raw.notes);
  base.confidence = asStr(raw.confidence);
  ['physical', 'phSection', 'fertility', 'cations', 'ratios'].forEach((group) => {
    const src = raw[group] && typeof raw[group] === 'object' ? raw[group] : {};
    Object.keys(base[group]).forEach((key) => {
      base[group][key] = asStr(src[key]);
    });
  });
  if (base.fertility.pMethod) {
    const pm = base.fertility.pMethod.toLowerCase();
    if (pm.includes('olsen')) base.fertility.pMethod = 'Olsen';
    else if (pm.includes('bray') && pm.includes('2')) base.fertility.pMethod = 'Bray 2';
    else if (pm.includes('bray')) base.fertility.pMethod = 'Bray';
    else if (pm.includes('mehlich')) base.fertility.pMethod = 'Mehlich';
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
    '- fertility: nutrientes en ppm salvo mo (%). nNo3 = N-NO3 ppm. moly = Mo.',
    '- cations: meq/100g (ca,mg,k,na,al,h,cic) y pct* = % saturación.',
    '- phSection.salinity = CE en dS/m si aparece.',
    '- physical: % para saturación/CC/PMP; bulkDensity g/cm3; hydraulicConductivity cm/h.',
    '- date en YYYY-MM-DD si puedes; title = lab/cliente/rancho si aparece.',
    '- confidence: "high" | "medium" | "low".',
    '- notes: breve aviso si el informe es ambiguo o incompleto.'
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

  try {
    const extracted = await extractWithOpenAI({ buffer, filename, mimeType });
    if (!extracted.ok) {
      return jsonResponse(extracted.status || 500, { ok: false, error: extracted.error });
    }
    return jsonResponse(200, {
      ok: true,
      analysisType: 'soil',
      fields: extracted.fields,
      model: extracted.model
    });
  } catch (e) {
    console.error('lab-analysis-extract', e);
    return jsonResponse(500, {
      ok: false,
      error: e && e.message ? e.message : 'Error al extraer el análisis.'
    });
  }
};
