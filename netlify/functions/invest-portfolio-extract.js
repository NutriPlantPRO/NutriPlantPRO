/**
 * Netlify Function: extrae filas de capturas de portafolio (Charles Schwab, etc.)
 * para Invest PRO (Plan PRO admin).
 *
 * POST JSON {
 *   filename, mimeType, imageBase64
 * }
 * Authorization: Bearer <supabase access_token>
 *
 * Respuesta: { ok, holdings: [...], model }
 *
 * Env: OPENAI_API_KEY, OPENAI_ADMIN_MODEL | OPENAI_OCR_MODEL,
 *      SUPABASE_URL, SUPABASE_ANON_KEY
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
    (process.env.OPENAI_INVEST_EXTRACT_MODEL || '').trim() ||
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

function asNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  let s = String(v)
    .trim()
    .replace(/[$€£,\s]/g, '')
    .replace(/[()]/g, '')
    .replace(/^[+]/, '')
    .replace(/%$/, '');
  if (!s || /^n\/?a$/i.test(s) || s === '-' || s === '—') return null;
  // "(1.23)" estilo contable negativo
  if (/^\(.*\)$/.test(String(v).trim())) {
    s = '-' + s.replace(/[()]/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function asStr(v) {
  if (v == null || v === undefined) return '';
  const s = String(v).trim();
  if (!s || /^n\/?a$/i.test(s) || s === '-' || s === '—') return '';
  return s;
}

function guessAssetType(symbol, name, rawType) {
  const t = String(rawType || '').toLowerCase();
  if (t === 'etf' || t === 'stock' || t === 'crypto' || t === 'cash' || t === 'other') return t;
  const n = String(name || '').toUpperCase();
  const s = String(symbol || '').toUpperCase();
  if (/ETF|INVESCO|VANGUARD|ISHARES|SPDR|SCHWAB|VAN ECK|ARK /i.test(n)) return 'etf';
  if (/^(VOO|QQQ|QQQM|SPY|SCHD|IWM|DIA|VTI|VXUS|SMH|SOXX|IBIT|ETHA|INDA|EWT|EWY|EWS|EWG|EWZ|EWW)$/.test(s)) {
    return 'etf';
  }
  if (/BTC|ETH|BITCOIN|ETHEREUM/i.test(n) || /^(BTC|ETH)/.test(s)) return 'crypto';
  if (/CASH|MONEY MARKET|SWVXX|SPAXX/i.test(n) || s === 'CASH') return 'cash';
  return 'stock';
}

function normalizeHolding(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const symbol = asStr(raw.symbol || raw.ticker || raw.code).toUpperCase().replace(/\s+/g, '');
  if (!symbol || symbol.length > 16) return null;
  const name = asStr(raw.name || raw.company || raw.description);
  const quantity = asNum(raw.quantity != null ? raw.quantity : raw.shares);
  const price = asNum(raw.price != null ? raw.price : raw.lastPrice);
  let marketValue = asNum(raw.marketValue != null ? raw.marketValue : raw.value);
  if (marketValue == null && quantity != null && price != null) {
    marketValue = Math.round(quantity * price * 100) / 100;
  }
  return {
    symbol: symbol,
    name: name,
    assetType: guessAssetType(symbol, name, raw.assetType || raw.type),
    quantity: quantity,
    price: price,
    priceChange: asNum(raw.priceChange != null ? raw.priceChange : raw.priceChangeDollar),
    priceChangePct: asNum(raw.priceChangePct != null ? raw.priceChangePct : raw.priceChangePercent),
    marketValue: marketValue,
    dayChange: asNum(raw.dayChange != null ? raw.dayChange : raw.dayChangeDollar),
    dayChangePct: asNum(raw.dayChangePct != null ? raw.dayChangePct : raw.dayChangePercent),
    costBasis: asNum(
      raw.costBasis != null
        ? raw.costBasis
        : raw.cost_basis != null
          ? raw.cost_basis
          : raw.totalCost != null
            ? raw.totalCost
            : raw.cost
    ),
    gainLoss: asNum(raw.gainLoss != null ? raw.gainLoss : raw.gainLossDollar),
    gainLossPct: asNum(raw.gainLossPct != null ? raw.gainLossPct : raw.gainLossPercent)
  };
}

function buildPrompt() {
  return [
    'Eres un extractor de tablas de portafolio de corretaje (Charles Schwab y similares) para NutriPlant Invest PRO.',
    'Lee la captura (puede ser una o varias filas de Symbol/Name, Quantity, Price, Price Change, Market Value, Day Change, Cost Basis, Gain/Loss).',
    'Devuelve SOLO JSON válido con esta forma exacta:',
    JSON.stringify(
      {
        holdings: [
          {
            symbol: 'ABBV',
            name: 'ABBVIE INC',
            assetType: 'stock',
            quantity: 0.4627,
            price: 246.2,
            priceChange: 2.4,
            priceChangePct: null,
            marketValue: 113.92,
            dayChange: 1.11,
            dayChangePct: null,
            costBasis: 99.98,
            gainLoss: 13.94,
            gainLossPct: null
          }
        ]
      },
      null,
      2
    ),
    '',
    'Reglas:',
    '- Extrae TODAS las filas de posiciones visibles (acciones y ETFs). Ignora totales, cash si no tiene ticker, encabezados y UI chrome.',
    '- symbol = ticker (mayúsculas). name = nombre bajo el ticker si aparece.',
    '- assetType: "etf" si el nombre/ticker es ETF (INVESCO, VANGUARD, iShares, QQQM, VOO, etc.); si no "stock"; cripto "crypto"; efectivo "cash".',
    '- Números como number (no strings). Usa punto decimal. Negativos con signo -.',
    '- costBasis = columna "Cost Basis" de Schwab (total invertido / lo que costó la posición, NO el precio por acción). Si no se ve en la captura, null.',
    '- Si solo ves $ y no %, deja *Pct en null. No inventes valores ausentes: null.',
    '- Si la imagen no es una tabla de portafolio, holdings: [].'
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
  return { ok: true, userId: userData.user.id };
}

async function extractWithOpenAI({ buffer, filename, mimeType }) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, status: 500, error: 'OPENAI_API_KEY no configurada.' };
  }
  const model = resolveModel();
  const b64 = buffer.toString('base64');
  const dataUrl = 'data:' + (mimeType || 'image/jpeg') + ';base64,' + b64;

  const content = [
    { type: 'input_text', text: buildPrompt() },
    { type: 'input_image', image_url: dataUrl }
  ];

  const payload = {
    model: model,
    input: [{ role: 'user', content: content }],
    max_output_tokens: isGpt56Family(model) ? 6000 : 4000
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
      (data && data.error && data.error.message) || ('OpenAI error HTTP ' + res.status);
    return { ok: false, status: 502, error: msg };
  }
  const text = outputTextFromResponses(data);
  if (!text) {
    return { ok: false, status: 422, error: 'No se pudo leer la captura. Prueba otra imagen más clara.' };
  }
  const parsed = parseJsonLoose(text);
  if (!parsed) {
    return {
      ok: false,
      status: 422,
      error: 'La IA no devolvió JSON válido. Intenta con otra captura más nítida.'
    };
  }
  const list = Array.isArray(parsed.holdings)
    ? parsed.holdings
    : Array.isArray(parsed.positions)
      ? parsed.positions
      : Array.isArray(parsed.rows)
        ? parsed.rows
        : [];
  const holdings = [];
  const seen = Object.create(null);
  list.forEach(function (row) {
    const h = normalizeHolding(row);
    if (!h || seen[h.symbol]) return;
    seen[h.symbol] = 1;
    holdings.push(h);
  });
  return {
    ok: true,
    holdings: holdings,
    model: model,
    filename: filename || '',
    rawPreview: text.slice(0, 300)
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

  const filename = String(body.filename || 'portafolio.png').slice(0, 180);
  const mimeType = String(body.mimeType || 'image/png').slice(0, 120);
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mimeType)) {
    return jsonResponse(400, {
      ok: false,
      error: 'Solo imágenes JPEG, PNG, WebP o GIF.'
    });
  }
  const imageBase64 = String(body.imageBase64 || body.fileBase64 || '').replace(
    /^data:[^;]+;base64,/,
    ''
  );
  if (!imageBase64) {
    return jsonResponse(400, { ok: false, error: 'Falta imageBase64.' });
  }

  let buffer;
  try {
    buffer = Buffer.from(imageBase64, 'base64');
  } catch (e) {
    return jsonResponse(400, { ok: false, error: 'Base64 inválido.' });
  }
  if (!buffer.length) {
    return jsonResponse(400, { ok: false, error: 'Imagen vacía.' });
  }
  if (buffer.length > MAX_BYTES) {
    return jsonResponse(413, {
      ok: false,
      error: 'Imagen demasiado grande (máx. ~4.5 MB). Recorta o comprime la captura.'
    });
  }

  try {
    const result = await extractWithOpenAI({ buffer: buffer, filename: filename, mimeType: mimeType });
    if (!result.ok) {
      return jsonResponse(result.status || 500, { ok: false, error: result.error });
    }
    return jsonResponse(200, {
      ok: true,
      holdings: result.holdings,
      model: result.model,
      count: result.holdings.length
    });
  } catch (err) {
    return jsonResponse(500, {
      ok: false,
      error: (err && err.message) || 'Error al extraer el portafolio.'
    });
  }
};
