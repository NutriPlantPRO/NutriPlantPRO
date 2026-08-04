/**
 * Plan PRO — Invest PRO proxy de datos financieros.
 * GET /api/plan-pro-invest?action=search|quote|chart&q=...&symbol=...&range=1A&symbols=AAPL,MSFT
 * Authorization: Bearer <supabase access_token> (admin)
 *
 * Fuente actual: Yahoo Finance (endpoints públicos no oficiales, sin API key).
 * El proveedor está aislado en lib/yahoo-finance-provider.js para poder sustituirlo.
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const yahoo = require('./lib/yahoo-finance-provider');

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 120;
const rateBuckets = new Map();

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function checkRate(userId) {
  const now = Date.now();
  let bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(userId, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX) {
    return false;
  }
  if (rateBuckets.size > 500) {
    const first = rateBuckets.keys().next().value;
    rateBuckets.delete(first);
  }
  return true;
}

async function verifyAdmin(supabase, accessToken) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData || !userData.user || !userData.user.id) {
    return { ok: false, status: 401, error: 'Token inválido o expirado.' };
  }
  const userId = userData.user.id;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (profErr || !prof || !prof.is_admin) {
    return { ok: false, status: 403, error: 'Solo administrador puede usar Invest PRO.' };
  }
  return { ok: true, userId };
}

function normalizeSymbol(raw) {
  let s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  // Yahoo usa guion en clase B (BRK.B → BRK-B)
  if (/^[A-Z]+\.[A-Z]$/.test(s)) {
    s = s.replace(/\./, '-');
  }
  return s;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Supabase no configurado en el servidor.' });
  }

  const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json(401, { error: 'Falta Authorization Bearer.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const adminCheck = await verifyAdmin(supabase, token);
  if (!adminCheck.ok) {
    return json(adminCheck.status, { error: adminCheck.error });
  }
  if (!checkRate(adminCheck.userId)) {
    return json(429, { error: 'No se pudo consultar ahora. Reintenta en un momento.', code: 'RATE_LIMIT' });
  }

  const params = event.queryStringParameters || {};
  const action = String(params.action || 'quote').toLowerCase();

  try {
    if (action === 'search') {
      const q = String(params.q || params.query || '').trim();
      if (!q) return json(400, { error: 'Indica un ticker o nombre (q).' });
      const results = await yahoo.searchAssets(q);
      return json(200, { results, provider: 'yahoo-finance' });
    }

    if (action === 'quote') {
      const symbol = normalizeSymbol(params.symbol || params.q);
      if (!symbol) return json(400, { error: 'Indica un ticker (symbol).' });
      const quote = await yahoo.getQuote(symbol);
      return json(200, { quote });
    }

    // Ficha + gráfica en una sola ida a Yahoo (abrir activo / init).
    if (action === 'bundle') {
      const symbol = normalizeSymbol(params.symbol || params.q);
      const range = String(params.range || '1A').toUpperCase();
      if (!symbol) return json(400, { error: 'Indica un ticker (symbol).' });
      const bundle = await yahoo.getBundle(symbol, range);
      return json(200, { quote: bundle.quote, history: bundle.history });
    }

    if (action === 'quotes') {
      const raw = String(params.symbols || '').split(/[,;\s]+/).filter(Boolean);
      const symbols = raw.map(normalizeSymbol).filter(Boolean).slice(0, 12);
      if (!symbols.length) return json(400, { error: 'Indica symbols (máx. 12).' });
      const quotes = [];
      for (const s of symbols) {
        try {
          quotes.push(await yahoo.getQuote(s));
        } catch (e) {
          quotes.push({
            symbol: s,
            error: e && e.code === 'NOT_FOUND' ? 'Activo no encontrado' : (e && e.message) || 'Error'
          });
        }
      }
      return json(200, { quotes });
    }

    if (action === 'chart' || action === 'history') {
      const symbol = normalizeSymbol(params.symbol || params.q);
      const range = String(params.range || '1A').toUpperCase();
      if (!symbol) return json(400, { error: 'Indica un ticker (symbol).' });
      const history = await yahoo.getHistory(symbol, range);
      return json(200, { history });
    }

    if (action === 'compare') {
      const raw = String(params.symbols || '').split(/[,;\s]+/).filter(Boolean);
      const symbols = raw.map(normalizeSymbol).filter(Boolean).slice(0, 6);
      const range = String(params.range || '1A').toUpperCase();
      if (symbols.length < 1) return json(400, { error: 'Indica al menos un symbol.' });
      const settled = await Promise.all(
        symbols.map(async (s) => {
          try {
            return await yahoo.getHistory(s, range);
          } catch (e) {
            return {
              symbol: s,
              range,
              points: [],
              error: e && e.message ? e.message : 'Error'
            };
          }
        })
      );
      return json(200, { series: settled, range });
    }

    return json(400, { error: 'action inválida. Usa search|quote|quotes|chart|compare.' });
  } catch (err) {
    const code = err && err.code;
    if (code === 'NOT_FOUND') {
      return json(404, { error: 'Activo no encontrado', code: 'NOT_FOUND' });
    }
    if (code === 'RATE_LIMIT') {
      return json(429, { error: err.message || 'Límite temporal de la fuente', code: code });
    }
    if (code === 'PROVIDER_DOWN' || code === 'CHART_ERROR') {
      return json(502, { error: err.message || 'Fuente no disponible', code: code });
    }
    if (code === 'BAD_REQUEST') {
      return json(400, { error: err.message || 'Solicitud inválida' });
    }
    return json(500, { error: (err && err.message) || 'Error interno' });
  }
};
