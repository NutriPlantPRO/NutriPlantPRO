/**
 * financialDataService — cliente aislado de datos financieros para Invest PRO.
 * Habla solo con /api/plan-pro-invest (proxy Netlify). La UI no conoce Yahoo.
 */
(function (global) {
  'use strict';

  var CACHE_TTL_MS = 45 * 1000;
  var memoryCache = Object.create(null);
  var inflight = Object.create(null);

  function apiBase() {
    if (global.location && /localhost|127\.0\.0\.1/.test(global.location.hostname || '')) {
      return '';
    }
    return '';
  }

  function cacheKey(parts) {
    return parts.join('|');
  }

  function cacheGet(key) {
    var hit = memoryCache[key];
    if (!hit) return null;
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      delete memoryCache[key];
      return null;
    }
    return hit.value;
  }

  function cacheSet(key, value) {
    memoryCache[key] = { at: Date.now(), value: value };
  }

  async function getAccessToken() {
    var client = global.getSupabaseClient && global.getSupabaseClient();
    if (!client) throw new Error('Supabase no disponible.');
    var sessRes = await client.auth.getSession();
    var token =
      sessRes && sessRes.data && sessRes.data.session && sessRes.data.session.access_token
        ? sessRes.data.session.access_token
        : '';
    if (!token) throw new Error('Inicia sesión como administrador.');
    return token;
  }

  async function request(params) {
    var qs = new URLSearchParams(params || {}).toString();
    var key = cacheKey(['req', qs]);
    var cached = cacheGet(key);
    if (cached) return cached;
    if (inflight[key]) return inflight[key];

    inflight[key] = (async function () {
      var token = await getAccessToken();
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = null;
      if (ctrl) timer = setTimeout(function () { ctrl.abort(); }, 15000);
      try {
        var res = await fetch(apiBase() + '/api/plan-pro-invest?' + qs, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json'
          },
          cache: 'no-store',
          signal: ctrl ? ctrl.signal : undefined
        });
        var data = {};
        try {
          data = await res.json();
        } catch (eJson) {
          data = {};
        }
        if (!res.ok) {
          var err = new Error((data && data.error) || 'Error al consultar mercados');
          err.status = res.status;
          err.code = data && data.code;
          throw err;
        }
        cacheSet(key, data);
        return data;
      } catch (e) {
        if (e && e.name === 'AbortError') {
          var t = new Error('Tiempo de espera agotado. Intenta de nuevo.');
          t.code = 'TIMEOUT';
          throw t;
        }
        throw e;
      } finally {
        if (timer) clearTimeout(timer);
        delete inflight[key];
      }
    })();

    return inflight[key];
  }

  var service = {
    providerName: 'yahoo-finance',

    search: async function (query) {
      var data = await request({ action: 'search', q: String(query || '').trim() });
      return data.results || [];
    },

    getQuote: async function (symbol) {
      var data = await request({ action: 'quote', symbol: String(symbol || '').trim() });
      return data.quote || null;
    },

    getQuotes: async function (symbols) {
      var list = (symbols || []).filter(Boolean).slice(0, 12);
      if (!list.length) return [];
      var data = await request({ action: 'quotes', symbols: list.join(',') });
      return data.quotes || [];
    },

    getHistory: async function (symbol, range) {
      var data = await request({
        action: 'chart',
        symbol: String(symbol || '').trim(),
        range: String(range || '1A').toUpperCase()
      });
      return data.history || null;
    },

    compare: async function (symbols, range) {
      var list = (symbols || []).filter(Boolean).slice(0, 6);
      if (!list.length) return [];
      var data = await request({
        action: 'compare',
        symbols: list.join(','),
        range: String(range || '1A').toUpperCase()
      });
      return data.series || [];
    },

    clearCache: function () {
      memoryCache = Object.create(null);
    }
  };

  global.financialDataService = service;
  global.PlanProFinancialDataService = service;
})(typeof window !== 'undefined' ? window : globalThis);
