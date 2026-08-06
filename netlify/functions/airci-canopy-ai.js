/**
 * AirCI — calibración IA del detector (2 fotos → parámetros ExG).
 * POST /api/airci-canopy-ai
 * Authorization: Bearer <supabase admin token>
 * Body: { model, action?: 'calibrate', images: [{ id, imageBase64 }] }
 *
 * Modelos: gpt-5.6-luna | gpt-5.6-terra | gpt-5.6-sol
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_MODELS = new Set([
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'gpt-5.6-sol',
  'gpt-4o-mini'
]);
const DEFAULT_MODEL = 'gpt-5.6-luna';
const MAX_IMAGES = 2;

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function isGpt56Family(model) {
  return /^gpt-5\.6/i.test(String(model || ''));
}

function resolveModel(requested) {
  const req = String(requested || '').trim();
  if (req && ALLOWED_MODELS.has(req)) return req;
  const fromEnv = (process.env.OPENAI_ADMIN_MODEL || '').trim();
  if (fromEnv && ALLOWED_MODELS.has(fromEnv)) return fromEnv;
  return DEFAULT_MODEL;
}

async function verifyAdmin(accessToken) {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    return { ok: false, status: 500, error: 'Supabase no configurado en el servidor.' };
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Sesión inválida. Entra de nuevo desde el login.' };
  }
  const userId = userData.user.id;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (profErr || !prof?.is_admin) {
    return { ok: false, status: 403, error: 'Solo admin puede usar detección IA AirCI.' };
  }
  return { ok: true, userId, supabase };
}

function parseJsonLoose(text) {
  if (!text) return null;
  const raw = String(text).trim();
  try {
    return JSON.parse(raw);
  } catch (e) {}
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch (e2) {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (e3) {}
  }
  return null;
}

function outputTextFromResponses(data) {
  if (!data) return '';
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const out = Array.isArray(data.output) ? data.output : [];
  const parts = [];
  out.forEach(function (item) {
    const content = item && Array.isArray(item.content) ? item.content : [];
    content.forEach(function (c) {
      if (!c) return;
      if (typeof c.text === 'string') parts.push(c.text);
      else if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
    });
  });
  return parts.join('\n').trim();
}

function clamp(n, lo, hi, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

function normalizeCalib(parsed) {
  const src = parsed && typeof parsed === 'object' ? parsed : {};
  const calib =
    src.calibration && typeof src.calibration === 'object' ? src.calibration : src;
  return {
    crop_hint: String(calib.crop_hint || src.crop_hint || '').slice(0, 80),
    allow_yellow_green: calib.allow_yellow_green !== false,
    g_margin: clamp(calib.g_margin, 0.01, 0.12, 0.035),
    b_margin: clamp(calib.b_margin, 0.01, 0.1, 0.03),
    g_abs: clamp(calib.g_abs, 0, 20, 4),
    b_abs: clamp(calib.b_abs, 0, 20, 3),
    dark_sum: clamp(calib.dark_sum, 20, 80, 40),
    min_g: clamp(calib.min_g, 10, 60, 24),
    exg_percentile: clamp(calib.exg_percentile, 40, 85, 58),
    thr_min: clamp(calib.thr_min, 40, 120, 60),
    thr_max: clamp(calib.thr_max, 100, 200, 165),
    erosion_passes: clamp(calib.erosion_passes, 1, 2, 1) | 0,
    close_passes: clamp(calib.close_passes, 1, 3, 2) | 0,
    min_area_px: clamp(calib.min_area_px, 120, 800, 200) | 0,
    min_confidence: clamp(calib.min_confidence, 28, 55, 34) | 0,
    yellow_boost: calib.yellow_boost !== false,
    notes: String(calib.notes || src.notes || '').slice(0, 200)
  };
}

async function calibrateWithOpenAI(model, images) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, status: 500, error: 'OPENAI_API_KEY no configurada.' };
  }

  const prompt =
    'Eres agrónomo + visión para detectar COPAS de árboles frutales en ortomosaico RGB.\n' +
    'Te paso 1 o 2 recortes del mismo vuelo. NO listes árboles uno a uno.\n' +
    'Devuelve SOLO JSON con parámetros para un detector Excess Green (ExG) que separe COPA vs PASTO/suelo/sombra.\n' +
    'Formato exacto:\n' +
    '{\n' +
    '  "crop_hint": "ej. citrico amarillo-verdoso",\n' +
    '  "allow_yellow_green": true,\n' +
    '  "g_margin": 0.03,\n' +
    '  "b_margin": 0.025,\n' +
    '  "g_abs": 3,\n' +
    '  "b_abs": 2,\n' +
    '  "dark_sum": 38,\n' +
    '  "min_g": 22,\n' +
    '  "exg_percentile": 55,\n' +
    '  "thr_min": 55,\n' +
    '  "thr_max": 160,\n' +
    '  "erosion_passes": 1,\n' +
    '  "close_passes": 2,\n' +
    '  "min_area_px": 200,\n' +
    '  "min_confidence": 34,\n' +
    '  "yellow_boost": true,\n' +
    '  "notes": "breve"\n' +
    '}\n' +
    'Reglas: si copa es amarillo-verdosa y pasto similar, permite yellow_green y márgenes más bajos; ' +
    'si pasto muy verde y copa oscura, sé más estricto (márgenes más altos, percentile más alto). ' +
    'NUNCA pongas min_area_px bajo (evita <150): produce micro-copas falsas. ' +
    'Prefer min_area_px 180–350. close_passes 2 reconecta huecos dentro de la misma copa. ' +
    'erosion_passes 1 = menos achica copa; 2 = más limpia pasto.';

  const content = [{ type: 'input_text', text: prompt }];
  images.forEach(function (img, idx) {
    let url = String(img.imageBase64 || '');
    if (!url) return;
    if (!/^data:/i.test(url)) {
      url = 'data:image/jpeg;base64,' + url.replace(/^data:[^;]+;base64,/, '');
    }
    content.push({ type: 'input_text', text: 'Recorte ' + (idx + 1) + ' id=' + (img.id || idx + 1) });
    content.push({ type: 'input_image', image_url: url });
  });

  const payload = {
    model: model,
    input: [{ role: 'user', content: content }],
    max_output_tokens: isGpt56Family(model) ? 1200 : 900
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    const msg =
      (data && data.error && data.error.message) || 'OpenAI error HTTP ' + res.status;
    return { ok: false, status: 502, error: msg };
  }
  const text = outputTextFromResponses(data);
  const parsed = parseJsonLoose(text);
  if (!parsed) {
    return {
      ok: false,
      status: 422,
      error: 'La IA no devolvió JSON de calibración válido.'
    };
  }
  const usage = data.usage || {};
  return {
    ok: true,
    model: model,
    calibration: normalizeCalib(parsed),
    usage: {
      input_tokens: usage.input_tokens || usage.prompt_tokens || null,
      output_tokens: usage.output_tokens || usage.completion_tokens || null
    },
    rawPreview: text.slice(0, 280)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método no permitido.' });
  }

  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { ok: false, error: 'Falta autorización.' });

  const admin = await verifyAdmin(token);
  if (!admin.ok) return json(admin.status, { ok: false, error: admin.error });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'JSON inválido.' });
  }

  const model = resolveModel(body.model);
  const imagesIn = Array.isArray(body.images)
    ? body.images
    : Array.isArray(body.crops)
      ? body.crops
      : [];
  const images = imagesIn
    .filter(function (c) {
      return c && c.imageBase64;
    })
    .slice(0, MAX_IMAGES)
    .map(function (c, i) {
      return {
        id: String(c.id != null ? c.id : i + 1),
        imageBase64: String(c.imageBase64).slice(0, 1200000)
      };
    });

  if (!images.length) {
    return json(400, {
      ok: false,
      error: 'Envía images[{imageBase64}] (1 o 2 recortes del orto).'
    });
  }

  const out = await calibrateWithOpenAI(model, images);
  if (!out.ok) return json(out.status || 500, { ok: false, error: out.error });
  return json(200, out);
};
