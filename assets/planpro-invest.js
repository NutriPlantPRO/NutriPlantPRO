/**
 * Invest PRO — UI de mercados (Plan PRO).
 * Depende de: window.financialDataService, Supabase client (state vía getCtx).
 */
(function (global) {
  'use strict';

  var RANGES = ['1D', '5D', '1M', '6M', '1A', '5A', 'MAX'];
  var CHART_METRICS = [
    { id: 'price', label: 'Precio' },
    { id: 'volume', label: 'Volumen' },
    { id: 'pct', label: 'Rendimiento %' },
    { id: 'pe', label: 'P/E' },
    { id: 'forwardPe', label: 'Fwd P/E' },
    { id: 'changePercent', label: 'Cambio día %' }
  ];
  var COMPARE_COLORS = ['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2'];
  var SNAPSHOT_METRICS = { pe: 1, forwardPe: 1, changePercent: 1 };

  /** Catálogo Popular Picks (predefinido). symbol Yahoo + nombre visible. */
  var CATALOG = [
    { group: 'IA', icon: '🤖', items: [
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'AMZN', name: 'Amazon' },
      { symbol: 'PLTR', name: 'Palantir' },
      { symbol: 'META', name: 'Meta' }
    ]},
    { group: 'Semiconductores', icon: '💾', items: [
      { symbol: 'ASML', name: 'ASML' },
      { symbol: 'TSM', name: 'TSMC' },
      { symbol: 'AMD', name: 'AMD' },
      { symbol: 'AVGO', name: 'Broadcom' },
      { symbol: 'QCOM', name: 'Qualcomm' }
    ]},
    { group: 'Agricultura', icon: '🌱', items: [
      { symbol: 'DE', name: 'Deere' },
      { symbol: 'YAR.OL', name: 'Yara' },
      { symbol: 'NTR', name: 'Nutrien' },
      { symbol: 'CF', name: 'CF Industries' },
      { symbol: 'MOS', name: 'Mosaic' }
    ]},
    { group: 'Salud', icon: '💊', items: [
      { symbol: 'ABBV', name: 'AbbVie' },
      { symbol: 'LLY', name: 'Eli Lilly' },
      { symbol: 'NVO', name: 'Novo Nordisk' },
      { symbol: 'JNJ', name: 'Johnson & Johnson' }
    ]},
    { group: 'Finanzas', icon: '🏦', items: [
      { symbol: 'JPM', name: 'JPMorgan' },
      { symbol: 'V', name: 'Visa' },
      { symbol: 'MA', name: 'Mastercard' },
      { symbol: 'BRK-B', name: 'Berkshire Hathaway' }
    ]},
    { group: 'Consumo', icon: '🛒', items: [
      { symbol: 'WMT', name: 'Walmart' },
      { symbol: 'COST', name: 'Costco' },
      { symbol: 'KO', name: 'Coca-Cola' },
      { symbol: 'PG', name: 'Procter & Gamble' }
    ]},
    { group: 'Espacio', icon: '🚀', items: [
      { symbol: 'SPCX', name: 'SPCX' },
      { symbol: 'RKLB', name: 'Rocket Lab' },
      { symbol: 'LUNR', name: 'Intuitive Machines' }
    ]},
    { group: 'Energía', icon: '⚡', items: [
      { symbol: 'NEE', name: 'NextEra Energy' },
      { symbol: 'FSLR', name: 'First Solar' }
    ]},
    { group: 'ETFs EE.UU.', icon: '📈', items: [
      { symbol: 'VOO', name: 'Vanguard S&P 500' },
      { symbol: 'QQQM', name: 'Invesco Nasdaq 100' },
      { symbol: 'SCHD', name: 'Schwab US Dividend' },
      { symbol: 'SPY', name: 'SPDR S&P 500' }
    ]},
    { group: 'ETFs Internacional', icon: '🌍', items: [
      { symbol: 'VXUS', name: 'Vanguard Total Int.' },
      { symbol: 'INDA', name: 'iShares MSCI India' },
      { symbol: 'EWT', name: 'iShares Taiwan' },
      { symbol: 'EWY', name: 'iShares South Korea' },
      { symbol: 'EWS', name: 'iShares Singapore' },
      { symbol: 'EWG', name: 'iShares Germany' },
      { symbol: 'EWZ', name: 'iShares Brazil' },
      { symbol: 'EWW', name: 'iShares Mexico' }
    ]},
    { group: 'ETFs Tecnología', icon: '💻', items: [
      { symbol: 'SMH', name: 'VanEck Semiconductor' },
      { symbol: 'SOXX', name: 'iShares Semiconductor' }
    ]},
    { group: 'Cripto', icon: '₿', items: [
      { symbol: 'IBIT', name: 'iShares Bitcoin' },
      { symbol: 'ETHA', name: 'iShares Ethereum' },
      { symbol: 'BTC-USD', name: 'Bitcoin' },
      { symbol: 'ETH-USD', name: 'Ethereum' }
    ]},
    { group: 'Índices', icon: '📊', items: [
      { symbol: '^GSPC', name: 'S&P 500' },
      { symbol: '^NDX', name: 'Nasdaq 100' },
      { symbol: '^DJI', name: 'Dow Jones' },
      { symbol: '^RUT', name: 'Russell 2000' },
      { symbol: '^VIX', name: 'VIX' }
    ]}
  ];

  /** Semilla inicial de “Mi portafolio” si la watchlist está vacía. */
  var DEFAULT_PORTFOLIO = [
    { symbol: 'AAPL', name: 'Apple', asset_type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft', asset_type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet', asset_type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA', asset_type: 'stock' },
    { symbol: 'DE', name: 'Deere', asset_type: 'stock' },
    { symbol: 'ABBV', name: 'AbbVie', asset_type: 'stock' },
    { symbol: 'JPM', name: 'JPMorgan', asset_type: 'stock' },
    { symbol: 'WMT', name: 'Walmart', asset_type: 'stock' },
    { symbol: 'SPCX', name: 'SPCX', asset_type: 'etf' },
    { symbol: 'VOO', name: 'Vanguard S&P 500', asset_type: 'etf' },
    { symbol: 'QQQM', name: 'Invesco Nasdaq 100', asset_type: 'etf' },
    { symbol: 'INDA', name: 'iShares MSCI India', asset_type: 'etf' },
    { symbol: 'IBIT', name: 'iShares Bitcoin', asset_type: 'etf' }
  ];

  var TYPE_LABEL = {
    stock: 'Empresa',
    etf: 'ETF',
    crypto: 'Cripto',
    index: 'Índice',
    other: 'Otro'
  };

  var st = {
    wired: false,
    filter: 'list',
    lists: [],
    activeListId: null,
    listsReady: true,
    watchlist: [],
    watchBySymbol: Object.create(null),
    activeSymbol: null,
    quote: null,
    range: '1A',
    chartMetric: 'price',
    lastSeries: [],
    lastFetchedAt: null,
    fromCache: false,
    compareSymbols: [],
    searchTimer: null,
    loading: false,
    tableReady: true,
    seeded: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getCtx() {
    return (global.PlanProInvest && global.PlanProInvest._ctx) || {};
  }

  function toast(msg, isErr) {
    var ctx = getCtx();
    if (typeof ctx.toast === 'function') ctx.toast(msg, isErr);
  }

  function fmtNum(v, digits) {
    if (v == null || !Number.isFinite(Number(v))) return 'N/D';
    var d = digits != null ? digits : 2;
    return Number(v).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function fmtPrice(v, currency) {
    if (v == null || !Number.isFinite(Number(v))) return 'N/D';
    var n = Number(v);
    var digits = Math.abs(n) >= 1000 ? 2 : Math.abs(n) >= 1 ? 2 : 4;
    return fmtNum(n, digits) + (currency ? ' ' + currency : '');
  }

  function fmtPct(v) {
    if (v == null || !Number.isFinite(Number(v))) return 'N/D';
    var n = Number(v);
    var sign = n > 0 ? '+' : '';
    return sign + fmtNum(n, 2) + '%';
  }

  function fmtCap(v) {
    if (v == null || !Number.isFinite(Number(v))) return 'N/D';
    var n = Number(v);
    if (n >= 1e12) return fmtNum(n / 1e12, 2) + ' T';
    if (n >= 1e9) return fmtNum(n / 1e9, 2) + ' B';
    if (n >= 1e6) return fmtNum(n / 1e6, 2) + ' M';
    return fmtNum(n, 0);
  }

  function fmtVol(v) {
    if (v == null || !Number.isFinite(Number(v))) return 'N/D';
    return Number(v).toLocaleString('es-MX');
  }

  function changeClass(v) {
    if (v == null || !Number.isFinite(Number(v))) return '';
    if (Number(v) > 0) return 'np-inv-up';
    if (Number(v) < 0) return 'np-inv-down';
    return '';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function catalogFlat() {
    var out = [];
    CATALOG.forEach(function (g) {
      g.items.forEach(function (it) {
        out.push({
          symbol: it.symbol,
          name: it.name,
          group: g.group,
          icon: g.icon,
          asset_type: guessType(it.symbol, g.group)
        });
      });
    });
    return out;
  }

  function guessType(symbol, group) {
    if (/^BTC-|^ETH-/.test(symbol)) return 'crypto';
    if (/^\^/.test(symbol)) return 'index';
    if (/ETF|Cripto|Índices/i.test(group || '')) {
      if (/Cripto/i.test(group) && !/IBIT|ETHA/.test(symbol)) return 'crypto';
      if (/Índices/i.test(group)) return 'index';
      return 'etf';
    }
    return 'stock';
  }

  /** Yahoo/ticker interno → símbolo TradingView. */
  var TV_SYMBOL_MAP = {
    '^GSPC': 'SPX',
    '^NDX': 'NDX',
    '^DJI': 'DJI',
    '^RUT': 'RUT',
    '^VIX': 'VIX',
    'BTC-USD': 'BINANCE:BTCUSDT',
    'ETH-USD': 'BINANCE:ETHUSDT',
    'BRK-B': 'NYSE:BRK.B',
    'BRK.B': 'NYSE:BRK.B',
    'YAR.OL': 'OSE:YAR'
  };

  function toTvSymbol(raw) {
    var s = String(raw || '').trim().toUpperCase();
    if (!s) return 'NASDAQ:AAPL';
    if (TV_SYMBOL_MAP[s]) return TV_SYMBOL_MAP[s];
    if (/\.OL$/.test(s)) return 'OSE:' + s.replace(/\.OL$/, '');
    return s.replace(/-/g, '.');
  }

  function tvChartUrl(symbol) {
    return 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(toTvSymbol(symbol));
  }

  function resolveAssetMeta(symbol) {
    var sym = String(symbol || '').trim().toUpperCase();
    var hit = catalogFlat().find(function (x) {
      return x.symbol === sym;
    });
    if (hit) return hit;
    var w = (st.watchlist || []).find(function (x) {
      return String(x.symbol || '').toUpperCase() === sym;
    });
    if (w) {
      return {
        symbol: sym,
        name: w.name || sym,
        asset_type: w.asset_type || guessType(sym, '')
      };
    }
    return { symbol: sym, name: sym, asset_type: guessType(sym, '') };
  }

  function bindTradingViewTouchIsolation(root) {
    if (!root || root.dataset.npTvTouchBound === '1') return;
    root.dataset.npTvTouchBound = '1';

    var chartShell = root.closest('.np-inv-chart-wrap--tv') || root;

    function setPageTouchLock(on) {
      try {
        document.documentElement.classList.toggle('np-inv-tv-touch-lock', !!on);
      } catch (e) {}
    }

    function syncPageLock(e) {
      setPageTouchLock(!!(e && e.touches && e.touches.length > 0));
    }

    chartShell.addEventListener(
      'touchstart',
      function (e) {
        syncPageLock(e);
        if (e.touches && e.touches.length > 1) {
          try {
            e.preventDefault();
          } catch (err) {}
        }
      },
      { passive: false, capture: true }
    );

    chartShell.addEventListener(
      'touchmove',
      function (e) {
        syncPageLock(e);
        if (e.touches && e.touches.length > 1) {
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch (err) {}
        }
      },
      { passive: false, capture: true }
    );

    chartShell.addEventListener('touchend', syncPageLock, { passive: true, capture: true });
    chartShell.addEventListener('touchcancel', syncPageLock, { passive: true, capture: true });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
      chartShell.addEventListener(
        type,
        function (e) {
          try {
            e.preventDefault();
          } catch (err) {}
        },
        { passive: false, capture: true }
      );
    });

    // Pellizco sobre el iframe de TradingView a veces lo toma el navegador (zoom de página).
    // Si hay 2+ dedos y alguno cae en el área del chart, bloquear zoom de Plan PRO.
    if (!document.documentElement.dataset.npInvTvDocTouch) {
      document.documentElement.dataset.npInvTvDocTouch = '1';
      document.addEventListener(
        'touchmove',
        function (e) {
          if (!document.getElementById('npInvTvWrap')) return;
          var view = document.getElementById('npViewInvestPro');
          if (!view || view.classList.contains('np-hide')) return;
          if (!(e.touches && e.touches.length > 1)) return;
          var shell = document.querySelector('#npViewInvestPro .np-inv-chart-wrap--tv');
          if (!shell) return;
          var r = shell.getBoundingClientRect();
          for (var i = 0; i < e.touches.length; i++) {
            var t = e.touches[i];
            if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
              try {
                e.preventDefault();
              } catch (err) {}
              return;
            }
          }
        },
        { passive: false, capture: true }
      );
      document.addEventListener(
        'gesturestart',
        function (e) {
          var view = document.getElementById('npViewInvestPro');
          if (!view || view.classList.contains('np-hide')) return;
          if (!document.querySelector('#npViewInvestPro .np-inv-chart-wrap--tv iframe')) return;
          try {
            e.preventDefault();
          } catch (err) {}
        },
        { passive: false, capture: true }
      );
    }

    // Cuando TradingView inyecta el iframe, forzar touch-action
    try {
      var mo = new MutationObserver(function () {
        var iframes = root.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
          iframes[i].style.touchAction = 'none';
          iframes[i].setAttribute('scrolling', 'no');
        }
      });
      mo.observe(root, { childList: true, subtree: true });
    } catch (e) {}
  }

  function mountTradingViewChart(opts) {
    opts = opts || {};
    var wrap = $('npInvTvWrap');
    var empty = $('npInvChartEmpty');
    var status = $('npInvStatus');
    var symbols = opts.symbols && opts.symbols.length ? opts.symbols.slice(0, 6) : selectedSymbols();
    if (!wrap) return;
    if (!symbols.length) {
      wrap.innerHTML = '';
      if (empty) {
        empty.classList.remove('np-hide');
        empty.textContent = 'Selecciona un activo para ver la gráfica.';
      }
      try {
        document.documentElement.classList.remove('np-inv-tv-touch-lock');
      } catch (e) {}
      return;
    }
    var primary = symbols[0];
    var compares = symbols.slice(1);
    if (empty) empty.classList.add('np-hide');
    wrap.innerHTML = '';

    var container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.width = '100%';
    container.style.height = '100%';

    var widgetEl = document.createElement('div');
    widgetEl.className = 'tradingview-widget-container__widget';
    widgetEl.style.width = '100%';
    widgetEl.style.height = '100%';
    container.appendChild(widgetEl);

    var cfg = {
      autosize: true,
      symbol: toTvSymbol(primary),
      interval: 'D',
      timezone: 'America/Mexico_City',
      theme: 'light',
      style: '1',
      locale: 'es',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      calendar: false,
      support_host: 'https://www.tradingview.com'
    };
    if (compares.length) {
      cfg.compareSymbols = compares.map(function (s) {
        return { symbol: toTvSymbol(s), position: 'SameScale' };
      });
    }

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.textContent = JSON.stringify(cfg);
    container.appendChild(script);
    wrap.appendChild(container);
    bindTradingViewTouchIsolation(wrap);

    var legend = $('npInvChartLegend');
    if (legend) {
      legend.innerHTML =
        '<span class="np-muted" style="font-size:12px;">TradingView · ' +
        escapeHtml(primary) +
        ' → <strong>' +
        escapeHtml(toTvSymbol(primary)) +
        '</strong>' +
        (compares.length
          ? ' · vs ' +
            compares
              .map(function (s) {
                return escapeHtml(s);
              })
              .join(', ')
          : '') +
        '</span>';
    }
    if (status) status.classList.add('np-hide');
    st.lastFetchedAt = Date.now();
    st.fromCache = false;
    renderDataStamp();
  }

  function activeList() {
    return (st.lists || []).find(function (l) {
      return l.id === st.activeListId;
    }) || null;
  }

  function activeListName() {
    var l = activeList();
    return (l && l.name) || 'Mi portafolio';
  }

  async function ensureDefaultList() {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId || !st.listsReady) return null;
    var existing = (st.lists || []).find(function (l) {
      return l.is_default;
    });
    if (existing) return existing;
    var named = (st.lists || []).find(function (l) {
      return String(l.name || '').toLowerCase() === 'mi portafolio';
    });
    if (named) {
      await ctx.client
        .from('plan_pro_invest_lists')
        .update({ is_default: true })
        .eq('id', named.id)
        .eq('user_id', ctx.userId);
      return named;
    }
    var ins = await ctx.client
      .from('plan_pro_invest_lists')
      .insert({
        user_id: ctx.userId,
        name: 'Mi portafolio',
        is_default: true,
        sort_order: 0
      })
      .select('id, user_id, name, is_default, sort_order, created_at')
      .single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function loadLists() {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId) {
      st.lists = [];
      st.activeListId = null;
      return;
    }
    try {
      var res = await ctx.client
        .from('plan_pro_invest_lists')
        .select('id, user_id, name, is_default, sort_order, created_at')
        .eq('user_id', ctx.userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (res.error) {
        if (/relation|does not exist|schema|plan_pro_invest_lists/i.test(res.error.message || '')) {
          st.listsReady = false;
          st.lists = [];
          return;
        }
        throw res.error;
      }
      st.listsReady = true;
      st.lists = res.data || [];
      if (!st.lists.length) {
        var def = await ensureDefaultList();
        if (def) st.lists = [def];
      }
      if (!st.activeListId || !(st.lists || []).some(function (l) { return l.id === st.activeListId; })) {
        var pref =
          (st.lists || []).find(function (l) {
            return l.is_default;
          }) || st.lists[0];
        st.activeListId = pref ? pref.id : null;
      }
    } catch (e) {
      st.lists = [];
    }
  }

  async function loadWatchlist() {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId) {
      st.watchlist = [];
      st.watchBySymbol = Object.create(null);
      return;
    }
    await loadLists();
    try {
      var q = ctx.client
        .from('plan_pro_invest_watchlist')
        .select('id, list_id, symbol, asset_name, asset_type, exchange, currency, sort_order, created_at')
        .eq('user_id', ctx.userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (st.activeListId && st.listsReady) {
        q = q.eq('list_id', st.activeListId);
      }
      var res = await q;
      if (res.error) {
        // Fallback si aún no corrió migración list_id
        if (/list_id|column/i.test(res.error.message || '')) {
          var legacy = await ctx.client
            .from('plan_pro_invest_watchlist')
            .select('id, symbol, asset_name, asset_type, exchange, currency, sort_order, created_at')
            .eq('user_id', ctx.userId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });
          if (legacy.error) {
            if (/relation|does not exist|schema|plan_pro_invest_watchlist/i.test(legacy.error.message || '')) {
              st.tableReady = false;
              st.watchlist = [];
            } else {
              throw legacy.error;
            }
          } else {
            st.tableReady = true;
            st.watchlist = legacy.data || [];
          }
        } else if (/relation|does not exist|schema|plan_pro_invest_watchlist/i.test(res.error.message || '')) {
          st.tableReady = false;
          st.watchlist = [];
        } else {
          throw res.error;
        }
      } else {
        st.tableReady = true;
        st.watchlist = res.data || [];
      }
    } catch (e) {
      st.watchlist = [];
    }
    st.watchBySymbol = Object.create(null);
    st.watchlist.forEach(function (row) {
      st.watchBySymbol[String(row.symbol).toUpperCase()] = row;
    });

    if (st.tableReady && st.listsReady && !st.seeded && st.watchlist.length === 0 && activeList() && activeList().is_default) {
      st.seeded = true;
      await seedDefaultPortfolio();
    }
  }

  async function seedDefaultPortfolio() {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId || !st.tableReady || !st.activeListId) return;
    var rows = DEFAULT_PORTFOLIO.map(function (it, i) {
      return {
        user_id: ctx.userId,
        list_id: st.activeListId,
        symbol: it.symbol,
        asset_name: it.name,
        asset_type: it.asset_type,
        sort_order: i
      };
    });
    try {
      await ctx.client.from('plan_pro_invest_watchlist').insert(rows);
      await loadWatchlist();
    } catch (e) {}
  }

  async function createList(name) {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId) return;
    if (!st.listsReady) {
      toast('Ejecuta en Supabase: supabase-plan-pro-invest-lists.sql', true);
      return;
    }
    var n = String(name || '').trim();
    if (!n) return;
    var res = await ctx.client
      .from('plan_pro_invest_lists')
      .insert({
        user_id: ctx.userId,
        name: n,
        is_default: false,
        sort_order: (st.lists || []).length
      })
      .select('id, user_id, name, is_default, sort_order, created_at')
      .single();
    if (res.error) {
      toast(res.error.message || 'No se pudo crear la lista', true);
      return;
    }
    st.activeListId = res.data.id;
    st.filter = 'list';
    await loadWatchlist();
    renderListsBar();
    renderFilters();
    renderPicks();
    renderWatchlistBar();
    updateWatchButtonLabel();
    toast('Lista creada: ' + n);
  }

  async function renameActiveList(name) {
    var ctx = getCtx();
    var list = activeList();
    if (!ctx.client || !list) return;
    var n = String(name || '').trim();
    if (!n) return;
    var res = await ctx.client
      .from('plan_pro_invest_lists')
      .update({ name: n })
      .eq('id', list.id)
      .eq('user_id', ctx.userId);
    if (res.error) {
      toast(res.error.message || 'No se pudo renombrar', true);
      return;
    }
    await loadLists();
    renderListsBar();
    renderFilters();
    updateWatchButtonLabel();
    toast('Lista renombrada');
  }

  async function deleteActiveList() {
    var ctx = getCtx();
    var list = activeList();
    if (!ctx.client || !list) return;
    if (list.is_default) {
      toast('No puedes eliminar «Mi portafolio». Crea otra lista y bórrala si quieres.', true);
      return;
    }
    if (!window.confirm('¿Eliminar la lista «' + list.name + '» y todos sus tickers?')) return;
    var res = await ctx.client
      .from('plan_pro_invest_lists')
      .delete()
      .eq('id', list.id)
      .eq('user_id', ctx.userId);
    if (res.error) {
      toast(res.error.message || 'No se pudo eliminar', true);
      return;
    }
    st.activeListId = null;
    await loadWatchlist();
    st.filter = 'list';
    renderListsBar();
    renderFilters();
    renderPicks();
    renderWatchlistBar();
    updateWatchButtonLabel();
    toast('Lista eliminada');
  }

  async function addToWatchlist(item) {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId) return;
    if (!st.tableReady) {
      toast('Ejecuta en Supabase: supabase-plan-pro-invest-watchlist.sql', true);
      return;
    }
    if (!st.listsReady || !st.activeListId) {
      toast('Ejecuta en Supabase: supabase-plan-pro-invest-lists.sql', true);
      return;
    }
    var symbol = String(item.symbol || '').toUpperCase();
    if (!symbol) return;
    if (st.watchBySymbol[symbol]) return;
    var row = {
      user_id: ctx.userId,
      list_id: st.activeListId,
      symbol: symbol,
      asset_name: item.name || item.asset_name || symbol,
      asset_type: item.assetType || item.asset_type || null,
      exchange: item.exchange || null,
      currency: item.currency || null,
      sort_order: st.watchlist.length
    };
    var res = await ctx.client
      .from('plan_pro_invest_watchlist')
      .insert(row)
      .select('id, list_id, symbol, asset_name, asset_type, exchange, currency, sort_order, created_at')
      .single();
    if (res.error) {
      toast(res.error.message || 'No se pudo agregar', true);
      return;
    }
    await loadWatchlist();
    renderPicks();
    renderWatchlistBar();
    updateWatchButtonLabel();
    toast(symbol + ' → ' + activeListName());
  }

  async function removeFromWatchlist(symbol) {
    var ctx = getCtx();
    var sym = String(symbol || '').toUpperCase();
    var row = st.watchBySymbol[sym];
    if (!row || !ctx.client) return;
    var res = await ctx.client.from('plan_pro_invest_watchlist').delete().eq('id', row.id).eq('user_id', ctx.userId);
    if (res.error) {
      toast(res.error.message || 'No se pudo quitar', true);
      return;
    }
    st.compareSymbols = st.compareSymbols.filter(function (s) { return s !== sym; });
    await loadWatchlist();
    renderPicks();
    renderWatchlistBar();
    renderCompareChips();
    updateWatchButtonLabel();
    toast(sym + ' quitado de «' + activeListName() + '»');
  }

  async function toggleWatchlist(item) {
    var sym = String(item.symbol || '').toUpperCase();
    if (st.watchBySymbol[sym]) await removeFromWatchlist(sym);
    else await addToWatchlist(item);
  }

  function updateWatchButtonLabel() {
    var starBtn = $('npInvWatchBtn');
    if (!starBtn || !st.quote) return;
    var on = !!st.watchBySymbol[String(st.quote.symbol).toUpperCase()];
    var listName = activeListName();
    starBtn.textContent = on ? '★ En «' + listName + '»' : '☆ Agregar a «' + listName + '»';
    starBtn.classList.toggle('np-inv-watch-btn--on', on);
  }

  function renderListsBar() {
    var mount = $('npInvListsBar');
    if (!mount) return;
    if (!st.listsReady) {
      mount.innerHTML =
        '<p class="np-muted" style="margin:0;font-size:12px;">Ejecuta <code>supabase-plan-pro-invest-lists.sql</code> para crear listas.</p>';
      return;
    }
    if (!(st.lists || []).length) {
      mount.innerHTML = '<p class="np-muted" style="margin:0;font-size:12px;">Sin listas aún.</p>';
      return;
    }
    mount.innerHTML = st.lists
      .map(function (l) {
        var active = l.id === st.activeListId ? ' np-inv-chip--active' : '';
        var portfolio = l.is_default ? ' np-inv-list-chip--portfolio' : '';
        var mark = l.is_default ? '⭐ ' : '📁 ';
        return (
          '<button type="button" class="np-inv-chip' +
          portfolio +
          active +
          '" data-inv-list="' +
          escapeHtml(l.id) +
          '" title="' +
          (l.is_default ? 'Mi portafolio principal' : 'Lista de interés') +
          '">' +
          mark +
          escapeHtml(l.name) +
          '</button>'
        );
      })
      .join('');
  }

  function renderFilters() {
    var mount = $('npInvFilters');
    if (!mount) return;
    var filters = [
      { id: 'list', label: '📋 ' + activeListName() },
      { id: 'all', label: 'Todos (catálogo)' }
    ];
    CATALOG.forEach(function (g) {
      filters.push({ id: 'g:' + g.group, label: (g.icon ? g.icon + ' ' : '') + g.group });
    });
    mount.innerHTML = filters
      .map(function (f) {
        var active = st.filter === f.id ? ' np-inv-chip--active' : '';
        return (
          '<button type="button" class="np-inv-chip' +
          active +
          '" data-inv-filter="' +
          escapeHtml(f.id) +
          '">' +
          escapeHtml(f.label) +
          '</button>'
        );
      })
      .join('');
  }

  function renderPicks() {
    var mount = $('npInvPicks');
    if (!mount) return;
    var items = [];
    if (st.filter === 'list' || st.filter === 'portfolio') {
      items = st.watchlist.map(function (w) {
        return {
          symbol: w.symbol,
          name: w.asset_name || w.symbol,
          group: activeListName(),
          asset_type: w.asset_type,
          inWatch: true
        };
      });
    } else if (st.filter === 'all') {
      items = catalogFlat();
    } else if (st.filter.indexOf('g:') === 0) {
      var gName = st.filter.slice(2);
      var g = CATALOG.find(function (x) { return x.group === gName; });
      items = g
        ? g.items.map(function (it) {
            return {
              symbol: it.symbol,
              name: it.name,
              group: g.group,
              asset_type: guessType(it.symbol, g.group)
            };
          })
        : [];
    }

    if (!items.length) {
      mount.innerHTML =
        '<p class="np-muted" style="margin:0;font-size:13px;">' +
        (st.filter === 'list' || st.filter === 'portfolio'
          ? 'Lista vacía. Marca ★ en Popular Picks o busca un ticker para agregarlo a «' +
            escapeHtml(activeListName()) +
            '».'
          : 'Sin activos en este filtro.') +
        '</p>';
      return;
    }

    var listName = activeListName();
    mount.innerHTML = items
      .map(function (it) {
        var sym = String(it.symbol).toUpperCase();
        var on = !!st.watchBySymbol[sym];
        var active = st.activeSymbol === sym ? ' np-inv-pick--active' : '';
        return (
          '<div class="np-inv-pick' +
          active +
          '" data-inv-symbol="' +
          escapeHtml(sym) +
          '">' +
          '<button type="button" class="np-inv-pick-main" data-inv-open="' +
          escapeHtml(sym) +
          '" title="Ver ficha">' +
          '<span class="np-inv-pick-sym">' +
          escapeHtml(sym) +
          '</span>' +
          '<span class="np-inv-pick-name">' +
          escapeHtml(it.name || sym) +
          '</span>' +
          '</button>' +
          '<button type="button" class="np-inv-star' +
          (on ? ' np-inv-star--on' : '') +
          '" data-inv-toggle="' +
          escapeHtml(sym) +
          '" data-inv-name="' +
          escapeHtml(it.name || sym) +
          '" data-inv-type="' +
          escapeHtml(it.asset_type || '') +
          '" aria-label="' +
          (on ? 'Quitar de ' + listName : 'Agregar a ' + listName) +
          '" title="' +
          (on ? 'Quitar de «' + listName + '»' : 'Agregar a «' + listName + '»') +
          '">' +
          (on ? '★' : '☆') +
          '</button>' +
          '<button type="button" class="np-inv-cmp-btn' +
          (st.compareSymbols.indexOf(sym) >= 0 ? ' np-inv-cmp-btn--on' : '') +
          '" data-inv-compare="' +
          escapeHtml(sym) +
          '" title="Comparar en gráfica">⇄</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderWatchlistBar() {
    var el = $('npInvWatchCount');
    if (el) el.textContent = String(st.watchlist.length);
  }

  function renderCompareChips() {
    var mount = $('npInvCompareChips');
    var graphBtn = $('npInvGraphCompareBtn');
    if (graphBtn) {
      var n = st.compareSymbols.length;
      graphBtn.disabled = n < 1;
      graphBtn.textContent = n < 1 ? 'Graficar' : 'Graficar (' + n + ')';
    }
    if (!mount) return;
    if (!st.compareSymbols.length) {
      mount.innerHTML =
        '<span class="np-muted" style="font-size:12px;">Marca ⇄ en 2 o más activos para comparar.</span>';
      return;
    }
    mount.innerHTML =
      '<span class="np-inv-cmp-count">' +
      st.compareSymbols.length +
      '/6</span>' +
      st.compareSymbols
        .map(function (sym, i) {
          return (
            '<span class="np-inv-cmp-chip" style="--np-inv-cmp:' +
            COMPARE_COLORS[i % COMPARE_COLORS.length] +
            '">' +
            escapeHtml(sym) +
            '<button type="button" data-inv-compare-off="' +
            escapeHtml(sym) +
            '" aria-label="Quitar de comparación">×</button></span>'
          );
        })
        .join('');
  }

  function renderMetricButtons() {
    var mount = $('npInvMetrics');
    if (!mount) return;
    mount.innerHTML = CHART_METRICS.map(function (m) {
      return (
        '<button type="button" class="np-inv-range np-inv-metric-btn' +
        (st.chartMetric === m.id ? ' np-inv-range--active' : '') +
        '" data-inv-metric="' +
        m.id +
        '">' +
        m.label +
        '</button>'
      );
    }).join('');
  }

  function setMetric(id, valueHtml, cls) {
    var el = $(id);
    if (!el) return;
    el.innerHTML = valueHtml;
    el.className = 'np-inv-metric-val' + (cls ? ' ' + cls : '');
  }

  function renderQuoteCard(quote) {
    var empty = $('npInvEmpty');
    var card = $('npInvQuoteCard');
    if (!quote) {
      if (empty) empty.classList.remove('np-hide');
      if (card) card.classList.add('np-hide');
      return;
    }
    if (empty) empty.classList.add('np-hide');
    if (card) card.classList.remove('np-hide');

    var logo = $('npInvLogo');
    if (logo) {
      if (quote.logoUrl) {
        logo.innerHTML =
          '<img src="' +
          escapeHtml(quote.logoUrl) +
          '" alt="" width="40" height="40" loading="lazy" onerror="this.parentNode.textContent=\'' +
          escapeHtml((quote.symbol || '?').charAt(0)) +
          '\'" />';
      } else {
        logo.textContent = (quote.symbol || '?').charAt(0);
      }
    }
    var nameEl = $('npInvName');
    if (nameEl) nameEl.textContent = quote.name || quote.symbol;
    var symEl = $('npInvSymbol');
    if (symEl) symEl.textContent = quote.symbol || '';
    var typeEl = $('npInvType');
    if (typeEl) typeEl.textContent = TYPE_LABEL[quote.assetType] || quote.assetType || '—';
    var exchEl = $('npInvExchange');
    if (exchEl) exchEl.textContent = quote.exchange || '—';

    var priceEl = $('npInvPrice');
    if (priceEl) priceEl.textContent = fmtPrice(quote.price, quote.currency);

    var chEl = $('npInvChange');
    if (chEl) {
      var chTxt =
        (quote.change != null ? (quote.change > 0 ? '+' : '') + fmtNum(quote.change, 2) : 'N/D') +
        '  ·  ' +
        fmtPct(quote.changePercent);
      chEl.textContent = chTxt;
      chEl.className = 'np-inv-change ' + changeClass(quote.changePercent);
    }

    var starBtn = $('npInvWatchBtn');
    if (starBtn) {
      updateWatchButtonLabel();
    }

    var tvLink = $('npInvTvLink');
    if (tvLink && quote.symbol) {
      tvLink.href = tvChartUrl(quote.symbol);
    }

    setMetric('npInvOpen', fmtPrice(quote.open, null));
    setMetric('npInvDayHigh', fmtPrice(quote.dayHigh, null));
    setMetric('npInvDayLow', fmtPrice(quote.dayLow, null));
    setMetric('npInv52High', fmtPrice(quote.week52High, null));
    setMetric('npInv52Low', fmtPrice(quote.week52Low, null));
    setMetric('npInvMktCap', fmtCap(quote.marketCap));
    setMetric('npInvPe', fmtNum(quote.pe, 2));
    setMetric('npInvFwdPe', fmtNum(quote.forwardPe, 2));
    setMetric('npInvEps', fmtNum(quote.eps, 2));
    setMetric(
      'npInvDiv',
      quote.dividendYield != null ? fmtNum(quote.dividendYield, 2) + '%' : 'N/D'
    );
    setMetric('npInvVol', fmtVol(quote.volume));
  }

  function renderRangeButtons() {
    var mount = $('npInvRanges');
    if (!mount) return;
    mount.innerHTML = RANGES.map(function (r) {
      return (
        '<button type="button" class="np-inv-range' +
        (st.range === r ? ' np-inv-range--active' : '') +
        '" data-inv-range="' +
        r +
        '">' +
        (r === 'MAX' ? 'Máx' : r) +
        '</button>'
      );
    }).join('');
  }

  function svgEl(name, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(function (k) {
      node.setAttribute(k, attrs[k]);
    });
    return node;
  }

  function drawBarChart(rows, metricId) {
    var svg = $('npInvChartSvg');
    var empty = $('npInvChartEmpty');
    if (!svg) return;
    var w = svg.clientWidth || 640;
    var h = 260;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '';

    var usable = (rows || []).filter(function (r) {
      return r && r.value != null && Number.isFinite(Number(r.value));
    });
    if (!usable.length) {
      if (empty) {
        empty.classList.remove('np-hide');
        empty.textContent =
          metricId === 'pe' || metricId === 'forwardPe'
            ? 'P/E no disponible aún con la fuente pública (aparece N/D). Precio y Volumen sí se grafican en el tiempo.'
            : 'Sin valores para este indicador en los activos seleccionados.';
      }
      return;
    }
    if (empty) empty.classList.add('np-hide');

    var pad = { t: 20, r: 16, b: 36, l: 48 };
    var innerW = w - pad.l - pad.r;
    var innerH = h - pad.t - pad.b;
    var vals = usable.map(function (r) { return Number(r.value); });
    var vMin = Math.min.apply(null, vals.concat([0]));
    var vMax = Math.max.apply(null, vals.concat([0]));
    if (vMin === vMax) {
      vMin -= 1;
      vMax += 1;
    }
    var barW = Math.min(64, (innerW / usable.length) * 0.62);
    var gap = innerW / usable.length;

    function yScale(v) {
      return pad.t + (1 - (v - vMin) / (vMax - vMin || 1)) * innerH;
    }
    var zeroY = yScale(0);

    for (var gi = 0; gi < 4; gi++) {
      var gy = pad.t + (innerH * gi) / 3;
      svg.appendChild(
        svgEl('line', {
          x1: pad.l,
          y1: gy,
          x2: pad.l + innerW,
          y2: gy,
          stroke: 'rgba(148,163,184,0.35)',
          'stroke-width': '1'
        })
      );
      var gv = vMax - ((vMax - vMin) * gi) / 3;
      var ty = svgEl('text', {
        x: pad.l - 6,
        y: gy + 3,
        'text-anchor': 'end',
        fill: '#64748b',
        'font-size': '10'
      });
      ty.textContent = fmtNum(gv, Math.abs(gv) >= 100 ? 0 : 2);
      svg.appendChild(ty);
    }

    usable.forEach(function (r, i) {
      var val = Number(r.value);
      var x = pad.l + gap * i + (gap - barW) / 2;
      var y = yScale(val);
      var bh = Math.abs(zeroY - y);
      var top = Math.min(y, zeroY);
      var color = COMPARE_COLORS[i % COMPARE_COLORS.length];
      svg.appendChild(
        svgEl('rect', {
          x: x,
          y: top,
          width: barW,
          height: Math.max(2, bh),
          rx: '4',
          fill: color,
          opacity: '0.85'
        })
      );
      var lx = svgEl('text', {
        x: x + barW / 2,
        y: h - 12,
        'text-anchor': 'middle',
        fill: '#334155',
        'font-size': '10',
        'font-weight': '700'
      });
      lx.textContent = r.symbol;
      svg.appendChild(lx);
      var vx = svgEl('text', {
        x: x + barW / 2,
        y: top - 4,
        'text-anchor': 'middle',
        fill: '#0f172a',
        'font-size': '10',
        'font-weight': '700'
      });
      vx.textContent = fmtNum(val, 2);
      svg.appendChild(vx);
    });

    var legend = $('npInvChartLegend');
    if (legend) {
      var label =
        metricId === 'pe'
          ? 'P/E actual (comparación)'
          : metricId === 'forwardPe'
            ? 'Forward P/E actual'
            : 'Cambio del día %';
      legend.innerHTML = '<span class="np-muted" style="font-size:12px;">' + label + ' · barras al momento (no serie histórica)</span>';
    }
  }

  function drawChart(seriesList) {
    var svg = $('npInvChartSvg');
    var empty = $('npInvChartEmpty');
    if (!svg) return;
    var metric = st.chartMetric || 'price';
    var w = svg.clientWidth || 640;
    var h = 260;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '';

    var usable = (seriesList || []).filter(function (s) {
      return s && Array.isArray(s.points) && s.points.length > 1 && !s.error;
    });
    if (!usable.length) {
      if (empty) {
        empty.classList.remove('np-hide');
        empty.textContent = 'Sin datos de gráfica para este periodo.';
      }
      return;
    }
    if (empty) empty.classList.add('np-hide');

    var pad = { t: 16, r: 16, b: 28, l: 48 };
    var innerW = w - pad.l - pad.r;
    var innerH = h - pad.t - pad.b;

    var multi = usable.length > 1 || metric === 'pct';
    var useVolume = metric === 'volume';
    var norm = usable.map(function (s) {
      var pts = s.points
        .map(function (p) {
          var raw = useVolume ? p.vol : p.v;
          return raw != null && Number.isFinite(Number(raw))
            ? { t: p.t, raw: Number(raw) }
            : null;
        })
        .filter(Boolean);
      if (!pts.length) return { symbol: s.symbol, points: [] };
      var base = pts[0].raw;
      return {
        symbol: s.symbol,
        points: pts.map(function (p) {
          var v = multi || metric === 'pct' ? ((p.raw - base) / (base || 1)) * 100 : p.raw;
          return { t: p.t, v: v };
        })
      };
    }).filter(function (s) {
      return s.points.length > 1;
    });

    if (!norm.length) {
      if (empty) {
        empty.classList.remove('np-hide');
        empty.textContent = useVolume
          ? 'Sin volumen histórico para este periodo.'
          : 'Sin datos de gráfica para este periodo.';
      }
      return;
    }

    var allT = [];
    var allV = [];
    norm.forEach(function (s) {
      s.points.forEach(function (p) {
        allT.push(p.t);
        allV.push(p.v);
      });
    });
    var tMin = Math.min.apply(null, allT);
    var tMax = Math.max.apply(null, allT);
    var vMin = Math.min.apply(null, allV);
    var vMax = Math.max.apply(null, allV);
    if (vMin === vMax) {
      vMin -= 1;
      vMax += 1;
    }
    var vPad = (vMax - vMin) * 0.06;
    vMin -= vPad;
    vMax += vPad;

    function xScale(t) {
      return pad.l + ((t - tMin) / (tMax - tMin || 1)) * innerW;
    }
    function yScale(v) {
      return pad.t + (1 - (v - vMin) / (vMax - vMin || 1)) * innerH;
    }

    for (var gi = 0; gi < 4; gi++) {
      var gy = pad.t + (innerH * gi) / 3;
      svg.appendChild(
        svgEl('line', {
          x1: pad.l,
          y1: gy,
          x2: pad.l + innerW,
          y2: gy,
          stroke: 'rgba(148,163,184,0.35)',
          'stroke-width': '1'
        })
      );
      var gv = vMax - ((vMax - vMin) * gi) / 3;
      var asPct = multi || metric === 'pct';
      var label = asPct
        ? fmtNum(gv, 1) + '%'
        : useVolume
          ? fmtCap(gv)
          : fmtNum(gv, gv >= 100 ? 0 : 2);
      var ty = svgEl('text', {
        x: pad.l - 6,
        y: gy + 3,
        'text-anchor': 'end',
        fill: '#64748b',
        'font-size': '10'
      });
      ty.textContent = label;
      svg.appendChild(ty);
    }

    norm.forEach(function (s, i) {
      var color = COMPARE_COLORS[i % COMPARE_COLORS.length];
      var d = s.points
        .map(function (p, idx) {
          return (idx === 0 ? 'M' : 'L') + xScale(p.t).toFixed(1) + ' ' + yScale(p.v).toFixed(1);
        })
        .join(' ');
      svg.appendChild(
        svgEl('path', {
          d: d,
          fill: 'none',
          stroke: color,
          'stroke-width': '2',
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round'
        })
      );
    });

    var legend = $('npInvChartLegend');
    if (legend) {
      var suffix =
        metric === 'volume' ? ' · volumen' : multi || metric === 'pct' ? ' (%)' : '';
      legend.innerHTML = norm
        .map(function (s, i) {
          return (
            '<span class="np-inv-legend-item"><i style="background:' +
            COMPARE_COLORS[i % COMPARE_COLORS.length] +
            '"></i>' +
            escapeHtml(s.symbol) +
            suffix +
            '</span>'
          );
        })
        .join('');
    }
  }

  function renderDataStamp() {
    var el = $('npInvDataStamp');
    if (!el) return;
    if (!st.activeSymbol) {
      el.textContent = 'Elige un ticker · gráfica TradingView (tu sesión del navegador si ya entraste ahí)';
      return;
    }
    var sel = selectedSymbols();
    el.textContent =
      'TradingView · ' +
      st.activeSymbol +
      ' → ' +
      toTvSymbol(st.activeSymbol) +
      (sel.length > 1 ? ' · comparación: ' + sel.join(', ') : '') +
      ' · listas ★ guardadas en Plan PRO';
  }

  function selectedSymbols() {
    var symbols = st.compareSymbols.slice();
    if (st.activeSymbol && symbols.indexOf(st.activeSymbol) < 0) {
      symbols.unshift(st.activeSymbol);
    }
    return symbols.filter(Boolean).slice(0, 6);
  }

  async function loadSnapshotMetricChart(opts) {
    opts = opts || {};
    var force = !!opts.force;
    var svc = global.financialDataService;
    if (!svc) return;
    var symbols = selectedSymbols();
    if (!symbols.length) {
      drawBarChart([], st.chartMetric);
      return;
    }
    var status = $('npInvStatus');
    if (status && force) {
      status.textContent = 'Actualizando indicadores…';
      status.classList.remove('np-hide');
    }
    try {
      var quotes = await svc.getQuotes(symbols, { force: force });
      var rows = (quotes || []).map(function (q) {
        if (!q || q.error) return { symbol: (q && q.symbol) || '?', value: null };
        var val = null;
        if (st.chartMetric === 'pe') val = q.pe;
        else if (st.chartMetric === 'forwardPe') val = q.forwardPe;
        else if (st.chartMetric === 'changePercent') val = q.changePercent;
        return { symbol: q.symbol, value: val };
      });
      var times = (quotes || [])
        .map(function (q) {
          return q && q.__cachedAt;
        })
        .filter(Boolean);
      if (times.length) st.lastFetchedAt = Math.max.apply(null, times);
      st.fromCache = (quotes || []).every(function (q) {
        return !q || q.error || q.__fromCache;
      });
      drawBarChart(rows, st.chartMetric);
      renderDataStamp();
      if (status) status.classList.add('np-hide');
    } catch (e) {
      drawBarChart([], st.chartMetric);
      var empty = $('npInvChartEmpty');
      if (empty) {
        empty.classList.remove('np-hide');
        empty.textContent = (e && e.message) || 'No se pudieron cargar indicadores';
      }
      if (status) {
        status.textContent = (e && e.message) || 'Error';
        status.classList.remove('np-hide');
      }
    }
  }

  async function loadAsset(symbol, opts) {
    opts = opts || {};
    var sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;
    st.activeSymbol = sym;
    st.loading = false;
    var status = $('npInvStatus');
    if (status) status.classList.add('np-hide');
    renderPicks();

    var meta = resolveAssetMeta(sym);
    var quote = {
      symbol: sym,
      name: meta.name || sym,
      assetType: meta.asset_type || 'stock',
      exchange: 'TradingView',
      logoUrl: null,
      price: null,
      change: null,
      changePercent: null
    };
    st.quote = quote;
    st.lastFetchedAt = Date.now();
    st.fromCache = false;
    renderQuoteCard(quote);
    renderDataStamp();

    var chartSymbols;
    if (st.compareSymbols.length >= 2) {
      chartSymbols =
        st.compareSymbols.indexOf(sym) >= 0
          ? st.compareSymbols.slice()
          : [sym].concat(st.compareSymbols).slice(0, 6);
    } else if (st.compareSymbols.length === 1 && st.compareSymbols[0] !== sym) {
      chartSymbols = [sym, st.compareSymbols[0]];
    } else {
      chartSymbols = [sym];
    }
    mountTradingViewChart({ symbols: chartSymbols });
  }

  async function loadChart(opts) {
    opts = opts || {};
    var symbols = opts.symbols && opts.symbols.length ? opts.symbols.slice(0, 6) : selectedSymbols();
    if (!symbols.length) {
      mountTradingViewChart({ symbols: [] });
      return;
    }
    if (!st.activeSymbol) st.activeSymbol = symbols[0];
    mountTradingViewChart({ symbols: symbols });
  }

  async function graphCompareSelection() {
    if (!st.compareSymbols.length) {
      toast('Marca al menos 1 activo con ⇄', true);
      return;
    }
    if (!st.activeSymbol) st.activeSymbol = st.compareSymbols[0];
    toast('Comparando en TradingView: ' + st.compareSymbols.join(', '));
    await loadChart({ symbols: st.compareSymbols.slice() });
  }

  async function refreshSelection() {
    var symbols = selectedSymbols();
    if (!symbols.length) {
      toast('Selecciona un activo primero', true);
      return;
    }
    toast('Recargando gráfica TradingView…');
    mountTradingViewChart({ symbols: symbols });
  }

  async function runSearch(q) {
    var mount = $('npInvSearchResults');
    if (!mount) return;
    var query = String(q || '').trim();
    if (query.length < 1) {
      mount.classList.add('np-hide');
      mount.innerHTML = '';
      return;
    }
    mount.classList.remove('np-hide');
    var ql = query.toLowerCase();
    var exact = query.toUpperCase().replace(/\s+/g, '');
    var hits = catalogFlat()
      .filter(function (it) {
        return (
          it.symbol.toLowerCase().indexOf(ql) >= 0 ||
          String(it.name || '')
            .toLowerCase()
            .indexOf(ql) >= 0
        );
      })
      .slice(0, 12);
    var hasExact = hits.some(function (h) {
      return h.symbol === exact;
    });
    var parts = [];
    if (!hasExact && /^[\^A-Z0-9.-]{1,20}$/i.test(exact)) {
      parts.push(
        '<button type="button" class="np-inv-search-item" data-inv-search-pick="' +
          escapeHtml(exact) +
          '" data-inv-name="' +
          escapeHtml(exact) +
          '" data-inv-type="stock">' +
          '<strong>' +
          escapeHtml(exact) +
          '</strong>' +
          '<span>Abrir en TradingView</span>' +
          '<em>' +
          escapeHtml(toTvSymbol(exact)) +
          '</em>' +
          '</button>'
      );
    }
    hits.forEach(function (r) {
      parts.push(
        '<button type="button" class="np-inv-search-item" data-inv-search-pick="' +
          escapeHtml(r.symbol) +
          '" data-inv-name="' +
          escapeHtml(r.name || r.symbol) +
          '" data-inv-type="' +
          escapeHtml(r.asset_type || '') +
          '">' +
          '<strong>' +
          escapeHtml(r.symbol) +
          '</strong>' +
          '<span>' +
          escapeHtml(r.name || '') +
          '</span>' +
          '<em>' +
          escapeHtml(TYPE_LABEL[r.asset_type] || r.asset_type || '') +
          '</em>' +
          '</button>'
      );
    });
    if (!parts.length) {
      mount.innerHTML =
        '<div class="np-inv-search-item np-muted" style="display:block;line-height:1.45;">' +
        'Sin coincidencias en el catálogo.<br>Escribe el <strong>ticker exacto</strong> (AAPL, VOO, BTC-USD, BRK-B) y Enter.' +
        '</div>';
      return;
    }
    mount.innerHTML = parts.join('');
  }

  function wireEvents() {
    var root = $('npViewInvestPro');
    if (!root || root.dataset.npInvWired === '1') return;
    root.dataset.npInvWired = '1';

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-inv-filter]');
      if (t) {
        st.filter = t.getAttribute('data-inv-filter');
        renderFilters();
        renderPicks();
        return;
      }
      t = e.target.closest('[data-inv-list]');
      if (t) {
        st.activeListId = t.getAttribute('data-inv-list');
        st.filter = 'list';
        loadWatchlist().then(function () {
          renderListsBar();
          renderFilters();
          renderPicks();
          renderWatchlistBar();
          updateWatchButtonLabel();
        });
        return;
      }
      t = e.target.closest('[data-inv-open]');
      if (t) {
        loadAsset(t.getAttribute('data-inv-open'));
        return;
      }
      t = e.target.closest('[data-inv-toggle]');
      if (t) {
        toggleWatchlist({
          symbol: t.getAttribute('data-inv-toggle'),
          name: t.getAttribute('data-inv-name'),
          asset_type: t.getAttribute('data-inv-type')
        });
        return;
      }
      t = e.target.closest('[data-inv-compare]');
      if (t) {
        var sym = String(t.getAttribute('data-inv-compare') || '').toUpperCase();
        var idx = st.compareSymbols.indexOf(sym);
        if (idx >= 0) st.compareSymbols.splice(idx, 1);
        else if (st.compareSymbols.length < 6) st.compareSymbols.push(sym);
        else toast('Máximo 6 activos en comparación', true);
        renderPicks();
        renderCompareChips();
        if (st.compareSymbols.length) {
          loadChart({ force: false, symbols: st.compareSymbols.slice() });
        } else if (st.activeSymbol) {
          loadChart({ force: false, symbols: [st.activeSymbol] });
        }
        return;
      }
      t = e.target.closest('[data-inv-compare-off]');
      if (t) {
        var off = String(t.getAttribute('data-inv-compare-off') || '').toUpperCase();
        st.compareSymbols = st.compareSymbols.filter(function (s) { return s !== off; });
        renderPicks();
        renderCompareChips();
        if (st.compareSymbols.length) {
          loadChart({ force: false, symbols: st.compareSymbols.slice() });
        } else if (st.activeSymbol) {
          loadChart({ force: false, symbols: [st.activeSymbol] });
        }
        return;
      }
      t = e.target.closest('[data-inv-range]');
      if (t) {
        st.range = t.getAttribute('data-inv-range');
        renderRangeButtons();
        loadChart();
        return;
      }
      t = e.target.closest('[data-inv-metric]');
      if (t) {
        st.chartMetric = t.getAttribute('data-inv-metric') || 'price';
        renderMetricButtons();
        if (SNAPSHOT_METRICS[st.chartMetric]) {
          loadChart();
        } else if (st.lastSeries && st.lastSeries.length) {
          drawChart(st.lastSeries);
        } else {
          loadChart();
        }
        return;
      }
      t = e.target.closest('[data-inv-search-pick]');
      if (t) {
        var pickSym = t.getAttribute('data-inv-search-pick');
        var results = $('npInvSearchResults');
        if (results) {
          results.classList.add('np-hide');
          results.innerHTML = '';
        }
        var input = $('npInvSearch');
        if (input) input.value = pickSym;
        loadAsset(pickSym);
        return;
      }
    });

    var search = $('npInvSearch');
    if (search) {
      search.addEventListener('input', function () {
        var q = this.value;
        clearTimeout(st.searchTimer);
        st.searchTimer = setTimeout(function () {
          runSearch(q);
        }, 320);
      });
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(st.searchTimer);
          var q = String(this.value || '').trim();
          if (!q) return;
          var results = $('npInvSearchResults');
          if (results) {
            results.classList.add('np-hide');
            results.innerHTML = '';
          }
          loadAsset(q.toUpperCase());
        }
      });
    }

    var watchBtn = $('npInvWatchBtn');
    if (watchBtn) {
      watchBtn.addEventListener('click', function () {
        if (!st.quote) return;
        toggleWatchlist({
          symbol: st.quote.symbol,
          name: st.quote.name,
          asset_type: st.quote.assetType,
          exchange: st.quote.exchange,
          currency: st.quote.currency
        }).then(function () {
          renderQuoteCard(st.quote);
        });
      });
    }

    var refreshBtn = $('npInvRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        refreshSelection();
      });
    }

    var graphBtn = $('npInvGraphCompareBtn');
    if (graphBtn && graphBtn.dataset.npWired !== '1') {
      graphBtn.dataset.npWired = '1';
      graphBtn.addEventListener('click', function () {
        graphCompareSelection();
      });
    }

    var listNew = $('npInvListNewBtn');
    if (listNew && listNew.dataset.npWired !== '1') {
      listNew.dataset.npWired = '1';
      listNew.addEventListener('click', function () {
        var name = window.prompt('Nombre de la nueva lista (ej. Agricultura, Semis, Largo plazo):');
        if (name) createList(name);
      });
    }
    var listRename = $('npInvListRenameBtn');
    if (listRename && listRename.dataset.npWired !== '1') {
      listRename.dataset.npWired = '1';
      listRename.addEventListener('click', function () {
        var cur = activeListName();
        var name = window.prompt('Nuevo nombre de la lista:', cur);
        if (name && name.trim() !== cur) renameActiveList(name);
      });
    }
    var listDel = $('npInvListDeleteBtn');
    if (listDel && listDel.dataset.npWired !== '1') {
      listDel.dataset.npWired = '1';
      listDel.addEventListener('click', function () {
        deleteActiveList();
      });
    }

    document.addEventListener('click', function (e) {
      var box = $('npInvSearchWrap');
      var results = $('npInvSearchResults');
      if (!box || !results) return;
      if (!box.contains(e.target)) {
        results.classList.add('np-hide');
      }
    });
  }

  async function init() {
    wireEvents();
    renderFilters();
    renderRangeButtons();
    renderMetricButtons();
    renderCompareChips();
    await loadWatchlist();
    renderListsBar();
    renderWatchlistBar();
    renderFilters();
    renderPicks();
    renderDataStamp();
    updateWatchButtonLabel();

    var setup = $('npInvSetupMsg');
    if (setup) {
      if (!st.tableReady) {
        setup.classList.remove('np-hide');
        setup.innerHTML =
          'Ejecuta en Supabase SQL Editor: <code>supabase-plan-pro-invest-watchlist.sql</code>';
      } else if (!st.listsReady) {
        setup.classList.remove('np-hide');
        setup.innerHTML =
          'Ejecuta en Supabase SQL Editor: <code>supabase-plan-pro-invest-lists.sql</code> (listas personalizadas)';
      } else {
        setup.classList.add('np-hide');
      }
    }

    // Si ya hay ficha en esta sesión, remonta TradingView (sin Yahoo)
    if (st.activeSymbol && st.quote) {
      renderQuoteCard(st.quote);
      mountTradingViewChart({ symbols: selectedSymbols() });
      return;
    }

    if (!st.activeSymbol) {
      var first =
        (st.watchlist[0] && st.watchlist[0].symbol) ||
        (DEFAULT_PORTFOLIO[0] && DEFAULT_PORTFOLIO[0].symbol);
      if (first) await loadAsset(first, { force: false });
    }
  }

  global.PlanProInvest = {
    init: init,
    setContext: function (ctx) {
      global.PlanProInvest._ctx = ctx || {};
    },
    openSymbol: loadAsset,
    refreshSelection: refreshSelection,
    catalog: CATALOG
  };
})(typeof window !== 'undefined' ? window : globalThis);
