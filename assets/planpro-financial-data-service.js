/**
 * financialDataService — cliente aislado de datos financieros para Invest PRO.
 * Modo consulta/análisis: baja datos, los guarda en sesión y no “tibea” en vivo.
 * Solo vuelve a la red si faltan o si pides force (Actualizar selección).
 */
(function (global) {
  'use strict';

  /** Caché de sesión larga: análisis de lo ya bajado (no streaming). */
  var ANALYSIS_TTL_MS = 45 * 60 * 1000;
  var memoryCache = Object.create(null);
  var inflight = Object.create(null);

  function apiBase() {
    return '';
  }

  function cacheKey(parts) {
    return parts.join('|');
  }

  function cacheGet(key) {
    var hit = memoryCache[key];
    if (!hit) return null;
    if (Date.now() - hit.at > ANALYSIS_TTL_MS) {
      delete memoryCache[key];
      return null;
    }
    return hit.value;
  }

  function cacheSet(key, value) {
    memoryCache[key] = { at: Date.now(), value: value };
  }

  function cacheMeta(key) {
    var hit = memoryCache[key];
    return hit ? { at: hit.at, ageMs: Date.now() - hit.at } : null;
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

  async function request(params, opts) {
    opts = opts || {};
    var force = !!opts.force;
    var qs = new URLSearchParams(params || {}).toString();
    var key = cacheKey(['req', qs]);
    if (!force) {
      var cached = cacheGet(key);
      if (cached) {
        cached.__fromCache = true;
        cached.__cachedAt = (cacheMeta(key) && cacheMeta(key).at) || Date.now();
        return cached;
      }
      if (inflight[key]) return inflight[key];
    } else {
      delete memoryCache[key];
    }

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
        data.__fromCache = false;
        data.__cachedAt = Date.now();
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

  function histKey(symbol, range) {
    return cacheKey(['req', new URLSearchParams({
      action: 'chart',
      symbol: String(symbol || '').trim(),
      range: String(range || '1A').toUpperCase()
    }).toString()]);
  }

  var service = {
    providerName: 'yahoo-finance',
    mode: 'consulta',

    search: async function (query, opts) {
      var data = await request({ action: 'search', q: String(query || '').trim() }, opts);
      return data.results || [];
    },

    getQuote: async function (symbol, opts) {
      var data = await request({ action: 'quote', symbol: String(symbol || '').trim() }, opts);
      var q = data.quote || null;
      if (q) {
        q.__fromCache = !!data.__fromCache;
        q.__cachedAt = data.__cachedAt || Date.now();
      }
      return q;
    },

    getQuotes: async function (symbols, opts) {
      var list = (symbols || []).filter(Boolean).slice(0, 12);
      if (!list.length) return [];
      // Reusa cotizaciones individuales en caché para no reconsultar todo el lote
      if (!opts || !opts.force) {
        var allCached = [];
        var missing = [];
        list.forEach(function (s) {
          var key = cacheKey(['req', new URLSearchParams({ action: 'quote', symbol: String(s).trim() }).toString()]);
          var hit = cacheGet(key);
          if (hit && hit.quote) {
            var q = hit.quote;
            q.__fromCache = true;
            q.__cachedAt = hit.__cachedAt || (cacheMeta(key) && cacheMeta(key).at) || Date.now();
            allCached.push(q);
          } else {
            missing.push(s);
          }
        });
        if (!missing.length) return allCached;
        if (missing.length < list.length) {
          var partial = await request({ action: 'quotes', symbols: missing.join(',') }, opts);
          var fetched = partial.quotes || [];
          fetched.forEach(function (q) {
            if (!q || !q.symbol || q.error) return;
            var k = cacheKey(['req', new URLSearchParams({ action: 'quote', symbol: q.symbol }).toString()]);
            cacheSet(k, { quote: q, __fromCache: false, __cachedAt: Date.now() });
          });
          return allCached.concat(fetched);
        }
      }
      var data = await request({ action: 'quotes', symbols: list.join(',') }, opts);
      return data.quotes || [];
    },

    getHistory: async function (symbol, range, opts) {
      var data = await request(
        {
          action: 'chart',
          symbol: String(symbol || '').trim(),
          range: String(range || '1A').toUpperCase()
        },
        opts
      );
      var h = data.history || null;
      if (h) {
        h.__fromCache = !!data.__fromCache;
        h.__cachedAt = data.__cachedAt || Date.now();
      }
      return h;
    },

    /** Compara solo lo que falte en caché de sesión; no re-baja lo ya consultado. */
    compare: async function (symbols, range, opts) {
      var list = (symbols || []).filter(Boolean).slice(0, 6);
      var rk = String(range || '1A').toUpperCase();
      if (!list.length) return [];
      opts = opts || {};
      var series = [];
      var missing = [];
      list.forEach(function (s) {
        if (!opts.force) {
          var hit = cacheGet(histKey(s, rk));
          if (hit && hit.history) {
            var h = hit.history;
            h.__fromCache = true;
            h.__cachedAt = hit.__cachedAt || (cacheMeta(histKey(s, rk)) && cacheMeta(histKey(s, rk)).at) || Date.now();
            series.push(h);
            return;
          }
        }
        missing.push(s);
      });
      for (var i = 0; i < missing.length; i++) {
        series.push(await service.getHistory(missing[i], rk, opts));
      }
      // Mantener orden de list
      var bySym = Object.create(null);
      series.forEach(function (h) {
        if (h && h.symbol) bySym[String(h.symbol).toUpperCase()] = h;
      });
      return list.map(function (s) {
        return (
          bySym[String(s).toUpperCase()] || {
            symbol: s,
            range: rk,
            points: [],
            error: 'Sin datos'
          }
        );
      });
    },

    clearCache: function () {
      memoryCache = Object.create(null);
    },

    clearSymbols: function (symbols) {
      var list = (symbols || []).map(function (s) {
        return String(s || '').trim().toUpperCase();
      });
      Object.keys(memoryCache).forEach(function (k) {
        list.forEach(function (sym) {
          if (k.indexOf('symbol=' + sym) >= 0 || k.indexOf(sym) >= 0) {
            delete memoryCache[k];
          }
        });
      });
    },

    getCachedAt: function (symbol, range) {
      var qKey = cacheKey(['req', new URLSearchParams({ action: 'quote', symbol: String(symbol || '').trim() }).toString()]);
      var hKey = histKey(symbol, range || '1A');
      var q = cacheMeta(qKey);
      var h = cacheMeta(hKey);
      var at = Math.max(q ? q.at : 0, h ? h.at : 0);
      return at || null;
    }
  };

  global.financialDataService = service;
  global.PlanProFinancialDataService = service;
})(typeof window !== 'undefined' ? window : globalThis);
