/**
 * Invest PRO — UI de mercados (Plan PRO).
 * Depende de: window.financialDataService, Supabase client (state vía getCtx).
 */
(function (global) {
  'use strict';

  var RANGES = ['1D', '5D', '1M', '6M', '1A', '5A', 'MAX'];
  var COMPARE_COLORS = ['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2'];

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
    filter: 'portfolio',
    watchlist: [],
    watchBySymbol: Object.create(null),
    activeSymbol: null,
    quote: null,
    range: '1A',
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

  async function loadWatchlist() {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId) {
      st.watchlist = [];
      st.watchBySymbol = Object.create(null);
      return;
    }
    try {
      var res = await ctx.client
        .from('plan_pro_invest_watchlist')
        .select('id, symbol, asset_name, asset_type, exchange, currency, sort_order, created_at')
        .eq('user_id', ctx.userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (res.error) {
        if (/relation|does not exist|schema|plan_pro_invest_watchlist/i.test(res.error.message || '')) {
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

    if (st.tableReady && !st.seeded && st.watchlist.length === 0) {
      st.seeded = true;
      await seedDefaultPortfolio();
    }
  }

  async function seedDefaultPortfolio() {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId || !st.tableReady) return;
    var rows = DEFAULT_PORTFOLIO.map(function (it, i) {
      return {
        user_id: ctx.userId,
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

  async function addToWatchlist(item) {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId) return;
    if (!st.tableReady) {
      toast('Ejecuta en Supabase: supabase-plan-pro-invest-watchlist.sql', true);
      return;
    }
    var symbol = String(item.symbol || '').toUpperCase();
    if (!symbol) return;
    if (st.watchBySymbol[symbol]) return;
    var row = {
      user_id: ctx.userId,
      symbol: symbol,
      asset_name: item.name || item.asset_name || symbol,
      asset_type: item.assetType || item.asset_type || null,
      exchange: item.exchange || null,
      currency: item.currency || null,
      sort_order: st.watchlist.length
    };
    var res = await ctx.client.from('plan_pro_invest_watchlist').insert(row).select('id, symbol, asset_name, asset_type, exchange, currency, sort_order, created_at').single();
    if (res.error) {
      toast(res.error.message || 'No se pudo agregar', true);
      return;
    }
    await loadWatchlist();
    renderPicks();
    renderWatchlistBar();
    toast(symbol + ' agregado a Mi portafolio');
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
    toast(sym + ' quitado de Mi portafolio');
  }

  async function toggleWatchlist(item) {
    var sym = String(item.symbol || '').toUpperCase();
    if (st.watchBySymbol[sym]) await removeFromWatchlist(sym);
    else await addToWatchlist(item);
  }

  function renderFilters() {
    var mount = $('npInvFilters');
    if (!mount) return;
    var filters = [{ id: 'portfolio', label: '⭐ Mi portafolio' }, { id: 'all', label: 'Todos' }];
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
    if (st.filter === 'portfolio') {
      items = st.watchlist.map(function (w) {
        return {
          symbol: w.symbol,
          name: w.asset_name || w.symbol,
          group: 'Mi portafolio',
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
        (st.filter === 'portfolio'
          ? 'Tu portafolio está vacío. Marca activos en Popular Picks o busca un ticker.'
          : 'Sin activos en este filtro.') +
        '</p>';
      return;
    }

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
          (on ? 'Quitar de Mi portafolio' : 'Agregar a Mi portafolio') +
          '" title="' +
          (on ? 'Quitar de Mi portafolio' : 'Agregar a Mi portafolio') +
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
    if (!mount) return;
    if (!st.compareSymbols.length) {
      mount.innerHTML = '<span class="np-muted" style="font-size:12px;">Toca ⇄ en un activo para comparar (máx. 6).</span>';
      return;
    }
    mount.innerHTML = st.compareSymbols
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
      var on = !!st.watchBySymbol[String(quote.symbol).toUpperCase()];
      starBtn.textContent = on ? '★ En Mi portafolio' : '☆ Agregar a Mi portafolio';
      starBtn.classList.toggle('np-inv-watch-btn--on', on);
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

  function drawChart(seriesList) {
    var svg = $('npInvChartSvg');
    var empty = $('npInvChartEmpty');
    if (!svg) return;
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

    // Normalizar a % desde primer punto para comparar varios activos
    var multi = usable.length > 1;
    var norm = usable.map(function (s) {
      var pts = s.points;
      var base = pts[0].v;
      return {
        symbol: s.symbol,
        points: pts.map(function (p) {
          return {
            t: p.t,
            v: multi ? ((p.v - base) / base) * 100 : p.v
          };
        })
      };
    });

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

    var ns = 'http://www.w3.org/2000/svg';
    function el(name, attrs) {
      var node = document.createElementNS(ns, name);
      Object.keys(attrs || {}).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
      return node;
    }

    // grid
    for (var gi = 0; gi < 4; gi++) {
      var gy = pad.t + (innerH * gi) / 3;
      svg.appendChild(
        el('line', {
          x1: pad.l,
          y1: gy,
          x2: pad.l + innerW,
          y2: gy,
          stroke: 'rgba(148,163,184,0.35)',
          'stroke-width': '1'
        })
      );
      var gv = vMax - ((vMax - vMin) * gi) / 3;
      var label = multi ? fmtNum(gv, 1) + '%' : fmtNum(gv, gv >= 100 ? 0 : 2);
      var ty = el('text', {
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
        el('path', {
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
      legend.innerHTML = usable
        .map(function (s, i) {
          return (
            '<span class="np-inv-legend-item"><i style="background:' +
            COMPARE_COLORS[i % COMPARE_COLORS.length] +
            '"></i>' +
            escapeHtml(s.symbol) +
            (multi ? ' (%)' : '') +
            '</span>'
          );
        })
        .join('');
    }
  }

  async function loadAsset(symbol) {
    var svc = global.financialDataService;
    if (!svc) {
      toast('Servicio financiero no cargado', true);
      return;
    }
    var sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;
    st.activeSymbol = sym;
    st.loading = true;
    var status = $('npInvStatus');
    if (status) {
      status.textContent = 'Cargando ' + sym + '…';
      status.classList.remove('np-hide');
    }
    renderPicks();
    try {
      var quote = await svc.getQuote(sym);
      st.quote = quote;
      renderQuoteCard(quote);
      await loadChart();
      if (status) status.classList.add('np-hide');
    } catch (e) {
      st.quote = null;
      renderQuoteCard(null);
      var empty = $('npInvEmpty');
      if (empty) {
        empty.classList.remove('np-hide');
        empty.textContent =
          e && e.code === 'NOT_FOUND'
            ? 'Activo no encontrado'
            : (e && e.message) || 'No se pudo cargar el activo';
      }
      if (status) {
        status.textContent = empty ? empty.textContent : 'Error';
        status.classList.remove('np-hide');
      }
    } finally {
      st.loading = false;
    }
  }

  async function loadChart() {
    var svc = global.financialDataService;
    if (!svc) return;
    var symbols = st.compareSymbols.slice();
    if (st.activeSymbol && symbols.indexOf(st.activeSymbol) < 0) {
      symbols.unshift(st.activeSymbol);
    }
    symbols = symbols.filter(Boolean).slice(0, 6);
    if (!symbols.length) {
      drawChart([]);
      return;
    }
    var status = $('npInvStatus');
    try {
      var series =
        symbols.length === 1
          ? [await svc.getHistory(symbols[0], st.range)]
          : await svc.compare(symbols, st.range);
      drawChart(series);
      if (status) status.classList.add('np-hide');
    } catch (e) {
      drawChart([]);
      var empty = $('npInvChartEmpty');
      if (empty) {
        empty.classList.remove('np-hide');
        empty.textContent = (e && e.message) || 'No se pudo cargar la gráfica';
      }
    }
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
    var svc = global.financialDataService;
    if (!svc) return;
    mount.classList.remove('np-hide');
    mount.innerHTML = '<div class="np-inv-search-item np-muted">Buscando…</div>';
    try {
      var results = await svc.search(query);
      if (!results.length) {
        mount.innerHTML = '<div class="np-inv-search-item np-muted">Activo no encontrado</div>';
        return;
      }
      mount.innerHTML = results
        .map(function (r) {
          return (
            '<button type="button" class="np-inv-search-item" data-inv-search-pick="' +
            escapeHtml(r.symbol) +
            '" data-inv-name="' +
            escapeHtml(r.name || r.symbol) +
            '" data-inv-type="' +
            escapeHtml(r.assetType || '') +
            '">' +
            '<strong>' +
            escapeHtml(r.symbol) +
            '</strong>' +
            '<span>' +
            escapeHtml(r.name || '') +
            '</span>' +
            '<em>' +
            escapeHtml(TYPE_LABEL[r.assetType] || r.assetType || '') +
            '</em>' +
            '</button>'
          );
        })
        .join('');
    } catch (e) {
      mount.innerHTML =
        '<div class="np-inv-search-item np-muted">' +
        escapeHtml((e && e.message) || 'Error de búsqueda') +
        '</div>';
    }
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
        loadChart();
        return;
      }
      t = e.target.closest('[data-inv-compare-off]');
      if (t) {
        var off = String(t.getAttribute('data-inv-compare-off') || '').toUpperCase();
        st.compareSymbols = st.compareSymbols.filter(function (s) { return s !== off; });
        renderPicks();
        renderCompareChips();
        loadChart();
        return;
      }
      t = e.target.closest('[data-inv-range]');
      if (t) {
        st.range = t.getAttribute('data-inv-range');
        renderRangeButtons();
        loadChart();
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
        if (global.financialDataService) global.financialDataService.clearCache();
        if (st.activeSymbol) loadAsset(st.activeSymbol);
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
    renderCompareChips();
    await loadWatchlist();
    renderWatchlistBar();
    renderPicks();

    var setup = $('npInvSetupMsg');
    if (setup) setup.classList.toggle('np-hide', st.tableReady);

    if (!st.activeSymbol) {
      var first =
        (st.watchlist[0] && st.watchlist[0].symbol) ||
        (DEFAULT_PORTFOLIO[0] && DEFAULT_PORTFOLIO[0].symbol);
      if (first) await loadAsset(first);
    }
  }

  global.PlanProInvest = {
    init: init,
    setContext: function (ctx) {
      global.PlanProInvest._ctx = ctx || {};
    },
    openSymbol: loadAsset,
    catalog: CATALOG
  };
})(typeof window !== 'undefined' ? window : globalThis);
