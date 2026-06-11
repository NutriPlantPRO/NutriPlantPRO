/**
 * Tipo de cambio para Plan PRO.
 * Prioridad: Yahoo Finance (intradía) → open.er-api.com (respaldo diario).
 */

const UA = 'Mozilla/5.0 (compatible; NutriPlantPRO/1.0)';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body)
  };
}

async function fetchYahooSymbol(symbol) {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(symbol) +
    '?interval=1m&range=1d';
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const meta = data && data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta;
  if (!meta) return null;
  const price = Number(meta.regularMarketPrice);
  if (!isFinite(price) || price <= 0) return null;
  const updatedAt = meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now();
  return { price, updatedAt };
}

async function fetchYahooPair(from, to) {
  const direct = await fetchYahooSymbol(from + to + '=X');
  if (direct) {
    return { rate: direct.price, updatedAt: direct.updatedAt, source: 'yahoo-finance' };
  }
  const inverse = await fetchYahooSymbol(to + from + '=X');
  if (inverse) {
    return { rate: 1 / inverse.price, updatedAt: inverse.updatedAt, source: 'yahoo-finance' };
  }
  return null;
}

async function fetchErApi(from, to) {
  const url = 'https://open.er-api.com/v6/latest/' + encodeURIComponent(from);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('No se pudo consultar el tipo de cambio (respaldo).');
  const data = await res.json();
  const rates = (data && (data.rates || data.conversion_rates)) || null;
  if (!data || data.result !== 'success' || !rates || rates[to] == null) {
    throw new Error('Par de monedas no disponible.');
  }
  let updatedAt = Date.now();
  if (data.time_last_update_unix) updatedAt = data.time_last_update_unix * 1000;
  return { rate: Number(rates[to]), updatedAt, source: 'open.er-api' };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const params = event.queryStringParameters || {};
  const from = String(params.from || 'USD')
    .trim()
    .toUpperCase();
  const to = String(params.to || 'MXN')
    .trim()
    .toUpperCase();

  if (!from || !to) {
    return json(400, { error: 'Monedas no válidas.' });
  }

  if (from === to) {
    return json(200, { rate: 1, updatedAt: Date.now(), source: 'same', from, to });
  }

  try {
    let hit = await fetchYahooPair(from, to);
    if (!hit) hit = await fetchErApi(from, to);
    return json(200, {
      rate: hit.rate,
      updatedAt: hit.updatedAt,
      source: hit.source,
      from,
      to
    });
  } catch (err) {
    return json(502, { error: (err && err.message) || 'TC no disponible' });
  }
};
