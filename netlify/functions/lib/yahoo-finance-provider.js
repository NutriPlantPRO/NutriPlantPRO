/**
 * Proveedor Yahoo Finance (endpoints públicos no oficiales).
 * Aislado para poder sustituir por otro proveedor sin tocar la UI.
 * Sin API key. Usa solo chart + search (sin cookies ni scraping visual).
 * Puede dejar de funcionar si Yahoo cambia el acceso.
 */

'use strict';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_TTL_SEARCH_MS = 45 * 60 * 1000;
const cache = new Map();

const RANGE_MAP = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1A': { range: '1y', interval: '1d' },
  '5A': { range: '5y', interval: '1wk' },
  MAX: { range: 'max', interval: '1mo' }
};

function cacheGet(key, ttlMs) {
  const hit = cache.get(key);
  if (!hit) return null;
  const ttl = ttlMs != null ? ttlMs : CACHE_TTL_MS;
  if (Date.now() - hit.at > ttl) {
    return null;
  }
  return hit.value;
}

/** Devuelve caché aunque esté vencida (para no fallar en 429). */
function cacheGetStale(key) {
  const hit = cache.get(key);
  return hit ? hit.value : null;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 300) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function mapAssetType(quoteType, symbol) {
  const t = String(quoteType || '').toUpperCase();
  const sym = String(symbol || '').toUpperCase();
  if (t === 'ETF' || t === 'MUTUALFUND') return 'etf';
  if (t === 'CRYPTOCURRENCY' || /-USD$/.test(sym) || /-EUR$/.test(sym)) return 'crypto';
  if (t === 'INDEX' || /^\^/.test(sym)) return 'index';
  if (t === 'EQUITY' || t === 'STOCK') return 'stock';
  return t ? t.toLowerCase() : 'other';
}

function nd(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeQuote(partial) {
  return {
    provider: 'yahoo-finance',
    symbol: partial.symbol || '',
    name: partial.name || partial.symbol || '',
    assetType: partial.assetType || 'other',
    exchange: partial.exchange || null,
    currency: partial.currency || null,
    logoUrl: partial.logoUrl || null,
    price: partial.price != null ? partial.price : null,
    change: partial.change != null ? partial.change : null,
    changePercent: partial.changePercent != null ? partial.changePercent : null,
    open: partial.open != null ? partial.open : null,
    dayHigh: partial.dayHigh != null ? partial.dayHigh : null,
    dayLow: partial.dayLow != null ? partial.dayLow : null,
    week52High: partial.week52High != null ? partial.week52High : null,
    week52Low: partial.week52Low != null ? partial.week52Low : null,
    marketCap: partial.marketCap != null ? partial.marketCap : null,
    pe: partial.pe != null ? partial.pe : null,
    forwardPe: partial.forwardPe != null ? partial.forwardPe : null,
    eps: partial.eps != null ? partial.eps : null,
    dividendYield: partial.dividendYield != null ? partial.dividendYield : null,
    volume: partial.volume != null ? partial.volume : null,
    updatedAt: partial.updatedAt || Date.now()
  };
}

function logoFromSymbol(symbol) {
  const sym = String(symbol || '').replace(/[^A-Za-z0-9.-]/g, '');
  if (!sym || /^\^/.test(sym) || /-USD$/i.test(sym)) return null;
  return 'https://storage.googleapis.com/iex/api/logos/' + encodeURIComponent(sym.toUpperCase()) + '.png';
}

async function fetchChart(symbol, rangeKey) {
  const conf = RANGE_MAP[rangeKey] || RANGE_MAP['1A'];
  const path =
    '/v8/finance/chart/' +
    encodeURIComponent(symbol) +
    '?interval=' +
    encodeURIComponent(conf.interval) +
    '&range=' +
    encodeURIComponent(conf.range) +
    '&includePrePost=false';
  const hosts = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
  let lastStatus = 0;
  let lastData = null;
  for (let i = 0; i < hosts.length; i++) {
    const { ok, status, data } = await fetchJson(hosts[i] + path);
    lastStatus = status;
    lastData = data;
    if (status === 429) continue;
    if (ok && data && data.chart && !data.chart.error && data.chart.result && data.chart.result[0]) {
      return data.chart.result[0];
    }
    if (ok && data && data.chart && !data.chart.result) {
      const err = new Error('Activo no encontrado');
      err.code = 'NOT_FOUND';
      throw err;
    }
  }
  if (lastStatus === 429) {
    const err = new Error('La fuente limitó temporalmente las consultas. Espera un momento.');
    err.code = 'RATE_LIMIT';
    throw err;
  }
  const desc =
    lastData && lastData.chart && lastData.chart.error && lastData.chart.error.description;
  const err = new Error(desc || 'No se pudo obtener la gráfica.');
  err.code = 'CHART_ERROR';
  throw err;
}

function normalizeYahooSymbol(raw) {
  let s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (/^[A-Z]+\.[A-Z]$/.test(s)) s = s.replace(/\./, '-');
  return s;
}

async function searchAssets(query) {
  const qRaw = String(query || '').trim();
  if (!qRaw) return [];
  const qNorm = normalizeYahooSymbol(qRaw);
  const cacheKey = 'search:' + qRaw.toLowerCase();
  const cached = cacheGet(cacheKey, CACHE_TTL_SEARCH_MS);
  if (cached) return cached;

  async function runSearch(q) {
    const url =
      'https://query1.finance.yahoo.com/v1/finance/search?q=' +
      encodeURIComponent(q) +
      '&quotesCount=12&newsCount=0&listsCount=0';
    const { ok, status, data } = await fetchJson(url);
    if (status === 429) {
      const err = new Error('La fuente limitó temporalmente las consultas. Espera un momento.');
      err.code = 'RATE_LIMIT';
      throw err;
    }
    if (!ok || !data) return null;
    const quotes = Array.isArray(data.quotes) ? data.quotes : [];
    return quotes.map((row) => ({
      symbol: row.symbol,
      name: row.longname || row.shortname || row.symbol,
      assetType: mapAssetType(row.quoteType || row.typeDisp, row.symbol),
      exchange: row.exchDisp || row.exchange || null,
      currency: null
    }));
  }

  let items = await runSearch(qRaw);
  if (items == null) {
    const err = new Error('La fuente de datos no respondió. Intenta de nuevo.');
    err.code = 'PROVIDER_DOWN';
    throw err;
  }
  // Si no hay hits y el ticker parece símbolo, prueba forma Yahoo (BRK-B) y chart directo
  if (!items.length && qNorm && qNorm !== qRaw.toUpperCase()) {
    items = (await runSearch(qNorm)) || [];
  }
  if (!items.length && /^[\^A-Z0-9.-]{1,15}$/i.test(qNorm)) {
    try {
      const quote = await getQuote(qNorm);
      if (quote && quote.symbol) {
        items = [
          {
            symbol: quote.symbol,
            name: quote.name || quote.symbol,
            assetType: quote.assetType || 'other',
            exchange: quote.exchange || null,
            currency: quote.currency || null
          }
        ];
      }
    } catch (e) {
      /* sin hit */
    }
  }
  cacheSet(cacheKey, items);
  return items;
}

async function getQuote(symbol) {
  const sym = normalizeYahooSymbol(symbol);
  if (!sym) {
    const err = new Error('Ticker vacío');
    err.code = 'BAD_REQUEST';
    throw err;
  }
  const cacheKey = 'quote:' + sym;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let chart;
  try {
    chart = await fetchChart(sym, '5D');
  } catch (e) {
    const stale = cacheGetStale(cacheKey);
    if (stale && e && (e.code === 'RATE_LIMIT' || e.code === 'PROVIDER_DOWN' || e.code === 'CHART_ERROR')) {
      stale.__stale = true;
      return stale;
    }
    if (e && (e.code === 'NOT_FOUND' || e.code === 'RATE_LIMIT')) throw e;
    const err = new Error('La fuente de datos no respondió. Intenta de nuevo.');
    err.code = 'PROVIDER_DOWN';
    throw err;
  }

  const meta = chart.meta || {};
  const quote = meta.regularMarketPrice != null ? Number(meta.regularMarketPrice) : null;
  const prev =
    meta.chartPreviousClose != null
      ? Number(meta.chartPreviousClose)
      : meta.previousClose != null
        ? Number(meta.previousClose)
        : null;
  const change = quote != null && prev != null ? quote - prev : null;
  const changePercent = change != null && prev ? (change / prev) * 100 : null;

  const indicators = chart.indicators && chart.indicators.quote && chart.indicators.quote[0];
  const opens = indicators && indicators.open;
  const lastOpen = Array.isArray(opens) ? opens.filter((x) => x != null).slice(-1)[0] : null;

  // Campos fundamentales (P/E, forward P/E, EPS, yield, marketCap) no vienen en el
  // endpoint chart público. Se dejan null → UI muestra "N/D". El servicio está
  // preparado para rellenarlos cuando se cambie de proveedor o se habilite uno con auth.
  const out = normalizeQuote({
    symbol: meta.symbol || sym,
    name: meta.longName || meta.shortName || sym,
    assetType: mapAssetType(meta.instrumentType, meta.symbol || sym),
    exchange: meta.fullExchangeName || meta.exchangeName || null,
    currency: meta.currency || null,
    logoUrl: logoFromSymbol(meta.symbol || sym),
    price: quote,
    change,
    changePercent,
    open: nd(lastOpen),
    dayHigh: nd(meta.regularMarketDayHigh),
    dayLow: nd(meta.regularMarketDayLow),
    week52High: nd(meta.fiftyTwoWeekHigh),
    week52Low: nd(meta.fiftyTwoWeekLow),
    marketCap: null,
    pe: nd(meta.trailingPE),
    forwardPe: nd(meta.forwardPE),
    eps: nd(meta.epsTrailingTwelveMonths),
    dividendYield: null,
    volume: nd(meta.regularMarketVolume),
    updatedAt: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()
  });

  if (out.price == null) {
    const err = new Error('Activo no encontrado');
    err.code = 'NOT_FOUND';
    throw err;
  }

  cacheSet(cacheKey, out);
  return out;
}

async function getHistory(symbol, rangeKey) {
  const sym = normalizeYahooSymbol(symbol);
  const rk = String(rangeKey || '1A').toUpperCase();
  if (!sym) {
    const err = new Error('Ticker vacío');
    err.code = 'BAD_REQUEST';
    throw err;
  }
  const cacheKey = 'hist:' + sym + ':' + rk;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let chart;
  try {
    chart = await fetchChart(sym, rk);
  } catch (e) {
    const stale = cacheGetStale(cacheKey);
    if (stale && e && (e.code === 'RATE_LIMIT' || e.code === 'PROVIDER_DOWN' || e.code === 'CHART_ERROR')) {
      stale.__stale = true;
      return stale;
    }
    if (e && (e.code === 'NOT_FOUND' || e.code === 'RATE_LIMIT')) throw e;
    const err = new Error('La fuente de datos no respondió. Intenta de nuevo.');
    err.code = 'PROVIDER_DOWN';
    throw err;
  }

  const meta = chart.meta || {};
  const ts = Array.isArray(chart.timestamp) ? chart.timestamp : [];
  const quote = chart.indicators && chart.indicators.quote && chart.indicators.quote[0];
  const closes = (quote && quote.close) || [];
  const volumes = (quote && quote.volume) || [];
  const points = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(Number(c))) continue;
    const vol = volumes[i];
    points.push({
      t: ts[i] * 1000,
      v: Number(c),
      vol: vol != null && Number.isFinite(Number(vol)) ? Number(vol) : null
    });
  }

  const out = {
    provider: 'yahoo-finance',
    symbol: meta.symbol || sym,
    range: rk,
    currency: meta.currency || null,
    points
  };
  cacheSet(cacheKey, out);
  return out;
}

module.exports = {
  searchAssets,
  getQuote,
  getHistory,
  RANGE_MAP,
  normalizeQuote
};
