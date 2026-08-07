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

/** USD estimado por consulta AirCI (calibración con 1–2 fotos). */
const AIRCI_USD_PER_QUERY = {
  'gpt-5.6-luna': 0.006,
  'gpt-5.6-terra': 0.012,
  'gpt-5.6-sol': 0.022,
  'gpt-4o-mini': 0.008
};

function modelShortLabel(model) {
  const m = String(model || '');
  if (/luna/i.test(m)) return 'Luna';
  if (/terra/i.test(m)) return 'Terra';
  if (/sol/i.test(m)) return 'Sol';
  if (/mini/i.test(m)) return 'Mini';
  return m.replace(/^gpt-5\.6-/i, '') || 'IA';
}

function estimateUsd(model) {
  const key = String(model || '').trim();
  if (AIRCI_USD_PER_QUERY[key] != null) return AIRCI_USD_PER_QUERY[key];
  return 0.01;
}

function monthKeyNow() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function bumpModelBucket(mapObj, model, usd) {
  const out = mapObj && typeof mapObj === 'object' ? Object.assign({}, mapObj) : {};
  const cur = out[model] && typeof out[model] === 'object' ? out[model] : { requests: 0, usd: 0 };
  out[model] = {
    requests: (Number(cur.requests) || 0) + 1,
    usd: Math.round(((Number(cur.usd) || 0) + usd) * 10000) / 10000,
    label: modelShortLabel(model)
  };
  return out;
}

async function recordAirciAiUsage(supabase, opts) {
  const model = String(opts.model || DEFAULT_MODEL);
  const usd = estimateUsd(model);
  const mk = monthKeyNow();
  const ownerId = opts.userId || null;
  const siteId = opts.siteId || null;
  const usage = opts.usage || {};

  try {
    await supabase.from('airci_ai_usage_events').insert({
      owner_id: ownerId,
      model: model,
      usd_est: usd,
      site_id: siteId,
      input_tokens: usage.input_tokens != null ? Number(usage.input_tokens) : null,
      output_tokens: usage.output_tokens != null ? Number(usage.output_tokens) : null
    });
  } catch (e) {}

  const { data: row } = await supabase
    .from('airci_ai_usage')
    .select(
      'id, total_requests, total_usd_est, month_key, month_requests, month_usd_est, by_model_json, month_by_model_json'
    )
    .eq('id', 'default')
    .maybeSingle();

  const base = row || {
    id: 'default',
    total_requests: 0,
    total_usd_est: 0,
    month_key: mk,
    month_requests: 0,
    month_usd_est: 0,
    by_model_json: {},
    month_by_model_json: {}
  };

  const sameMonth = base.month_key === mk;
  const next = {
    id: 'default',
    total_requests: (Number(base.total_requests) || 0) + 1,
    total_usd_est:
      Math.round(((Number(base.total_usd_est) || 0) + usd) * 10000) / 10000,
    month_key: mk,
    month_requests: sameMonth ? (Number(base.month_requests) || 0) + 1 : 1,
    month_usd_est: sameMonth
      ? Math.round(((Number(base.month_usd_est) || 0) + usd) * 10000) / 10000
      : usd,
    by_model_json: bumpModelBucket(base.by_model_json, model, usd),
    month_by_model_json: bumpModelBucket(
      sameMonth ? base.month_by_model_json : {},
      model,
      usd
    ),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('airci_ai_usage').upsert(next, { onConflict: 'id' });
  if (error) {
    return {
      ok: false,
      error: error.message,
      setup: /airci_ai_usage|does not exist|schema cache/i.test(error.message || '')
        ? 'supabase-airci-ai-usage.sql'
        : null,
      usd_est: usd
    };
  }
  return { ok: true, usd_est: usd, summary: next };
}

async function loadAirciAiUsage(supabase) {
  const { data, error } = await supabase
    .from('airci_ai_usage')
    .select(
      'total_requests, total_usd_est, month_key, month_requests, month_usd_est, by_model_json, month_by_model_json, updated_at'
    )
    .eq('id', 'default')
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      error: error.message,
      setup: /airci_ai_usage|does not exist/i.test(error.message || '')
        ? 'supabase-airci-ai-usage.sql'
        : null
    };
  }
  const mk = monthKeyNow();
  const row = data || {
    total_requests: 0,
    total_usd_est: 0,
    month_key: mk,
    month_requests: 0,
    month_usd_est: 0,
    by_model_json: {},
    month_by_model_json: {}
  };
  const sameMonth = row.month_key === mk;
  return {
    ok: true,
    pricing: AIRCI_USD_PER_QUERY,
    usage: {
      total_requests: Number(row.total_requests) || 0,
      total_usd_est: Number(row.total_usd_est) || 0,
      month_key: mk,
      month_requests: sameMonth ? Number(row.month_requests) || 0 : 0,
      month_usd_est: sameMonth ? Number(row.month_usd_est) || 0 : 0,
      by_model: row.by_model_json || {},
      month_by_model: sameMonth ? row.month_by_model_json || {} : {},
      updated_at: row.updated_at || null
    }
  };
}

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
  const pcRaw =
    calib.plant_context && typeof calib.plant_context === 'object'
      ? calib.plant_context
      : {};
  let crown = String(pcRaw.crown_vs_alley || 'darker').toLowerCase();
  if (crown.includes('bright')) crown = 'brighter';
  else if (crown.includes('similar') || crown.includes('igual')) crown = 'similar';
  else crown = 'darker';
  let alley = String(pcRaw.alley_type || 'grass').toLowerCase();
  if (alley.includes('soil') || alley.includes('suelo')) alley = 'bare_soil';
  else if (alley.includes('mix')) alley = 'mixed';
  else alley = 'grass';
  let shape = String(pcRaw.canopy_shape || 'round').toLowerCase();
  if (shape.includes('oval') || shape.includes('elip')) shape = 'oval';
  else if (shape.includes('irreg')) shape = 'irregular';
  else shape = 'round';

  return {
    crop_hint: String(calib.crop_hint || src.crop_hint || '').slice(0, 80),
    allow_yellow_green:
      calib.allow_yellow_green === true || pcRaw.bloom_or_yellow_crown === true,
    g_margin: clamp(calib.g_margin, 0.025, 0.12, 0.04),
    b_margin: clamp(calib.b_margin, 0.02, 0.1, 0.035),
    g_abs: clamp(calib.g_abs, 3, 20, 5),
    b_abs: clamp(calib.b_abs, 2, 20, 4),
    dark_sum: clamp(calib.dark_sum, 50, 90, 60),
    min_g: clamp(calib.min_g, 24, 60, 28),
    exg_percentile: clamp(calib.exg_percentile, 52, 80, 62),
    thr_min: clamp(calib.thr_min, 55, 120, 70),
    thr_max: clamp(calib.thr_max, 120, 200, 165),
    erosion_passes: clamp(calib.erosion_passes, 1, 2, 1) | 0,
    close_passes: clamp(calib.close_passes, 3, 6, 4) | 0,
    blur_m: clamp(calib.blur_m, 1.5, 3.0, 2.0),
    min_area_px: clamp(calib.min_area_px, 600, 4000, 900) | 0,
    min_confidence: clamp(calib.min_confidence, 48, 70, 52) | 0,
    typical_spacing_m: clamp(calib.typical_spacing_m, 3.5, 14, 6.5),
    yellow_boost: calib.yellow_boost === true || pcRaw.bloom_or_yellow_crown === true,
    plant_context: {
      crown_vs_alley: crown,
      bloom_or_yellow_crown: pcRaw.bloom_or_yellow_crown === true,
      alley_type: alley,
      typical_canopy_diam_m: clamp(pcRaw.typical_canopy_diam_m, 2.5, 12, 5.5),
      canopy_shape: shape,
      shadows_useful: pcRaw.shadows_useful !== false,
      min_evidence: clamp(pcRaw.min_evidence, 40, 75, 52) | 0,
      looks_like_notes: String(pcRaw.looks_like_notes || '').slice(0, 180)
    },
    notes: String(calib.notes || src.notes || pcRaw.looks_like_notes || '').slice(0, 200)
  };
}

async function calibrateWithOpenAI(model, images) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, status: 500, error: 'OPENAI_API_KEY no configurada.' };
  }

  const prompt =
    'Eres agrónomo. Ves ortomosaico RGB como un humano: planta ≠ pasto ≠ suelo ≠ animal ≠ sombra.\n' +
    'NO listes árboles. Devuelve SOLO JSON con CONTEXTO DE PLANTA + parámetros de apoyo.\n' +
    'El detector local usa: centros + radio por spacing + evidencia (tamaño vs marco, contraste, textura, sombra, forma).\n' +
    'Formato exacto:\n' +
    '{\n' +
    '  "crop_hint": "ej. citrico adulto",\n' +
    '  "typical_spacing_m": 6.5,\n' +
    '  "plant_context": {\n' +
    '    "crown_vs_alley": "darker",\n' +
    '    "bloom_or_yellow_crown": false,\n' +
    '    "alley_type": "grass",\n' +
    '    "typical_canopy_diam_m": 5.5,\n' +
    '    "canopy_shape": "round",\n' +
    '    "shadows_useful": true,\n' +
    '    "min_evidence": 52,\n' +
    '    "looks_like_notes": "copa densa más oscura que pasto; sombra al SW"\n' +
    '  },\n' +
    '  "allow_yellow_green": false,\n' +
    '  "g_margin": 0.04,\n' +
    '  "b_margin": 0.032,\n' +
    '  "g_abs": 5,\n' +
    '  "b_abs": 3,\n' +
    '  "dark_sum": 60,\n' +
    '  "min_g": 28,\n' +
    '  "exg_percentile": 62,\n' +
    '  "thr_min": 70,\n' +
    '  "thr_max": 165,\n' +
    '  "erosion_passes": 1,\n' +
    '  "close_passes": 4,\n' +
    '  "blur_m": 2.0,\n' +
    '  "min_area_px": 900,\n' +
    '  "min_confidence": 52,\n' +
    '  "yellow_boost": false,\n' +
    '  "notes": "breve"\n' +
    '}\n' +
    'Reglas plant_context (OBLIGATORIO, es lo importante):\n' +
    '- crown_vs_alley: darker|similar|brighter (copa vs calle) — como lo ves a simple vista.\n' +
    '- bloom_or_yellow_crown: true si hay flor/copa amarilla (NO uses solo “más verde”).\n' +
    '- alley_type: grass|bare_soil|mixed.\n' +
    '- typical_canopy_diam_m: diámetro visual típico de UNA copa (m).\n' +
    '- canopy_shape: round|oval|irregular (copas que chocan → irregular/oval).\n' +
    '- shadows_useful: true si la sombra ayuda a reconocer el árbol.\n' +
    '- typical_spacing_m: distancia centro-a-centro entre vecinos.\n' +
    'ExG fields son apoyo secundario. Prioriza describir CÓMO se reconoce la planta en RGB.';

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
    max_output_tokens: isGpt56Family(model) ? 1600 : 1100
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
  const action = String(body.action || 'calibrate').toLowerCase();

  if (action === 'usage' || action === 'get_usage') {
    const u = await loadAirciAiUsage(admin.supabase);
    if (!u.ok) return json(500, u);
    return json(200, u);
  }

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

  const logged = await recordAirciAiUsage(admin.supabase, {
    userId: admin.userId,
    model: out.model || model,
    siteId: body.site_id || null,
    usage: out.usage || {}
  });

  return json(200, {
    ok: true,
    model: out.model,
    calibration: out.calibration,
    usage: out.usage,
    cost: {
      usd_est: logged.usd_est != null ? logged.usd_est : estimateUsd(model),
      model: out.model || model,
      label: modelShortLabel(out.model || model),
      pricing: AIRCI_USD_PER_QUERY,
      recorded: !!logged.ok,
      setup: logged.setup || null
    },
    rawPreview: out.rawPreview
  });
};
