/**
 * Invest PRO — Portafolio Schwab: captura → IA → tabla + pasteles.
 * Persistencia: Supabase plan_pro_invest_holdings.
 * Objetivo / comentarios: solo se escriben cuando el admin los edita (nunca por escaneo).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'np_plan_pro_invest_holdings_v1';
  var MAX_IMAGES = 4;
  var MAX_FILE_BYTES = 4.5 * 1024 * 1024;
  var MANUAL_SAVE_MS = 450;
  var PIE_COLORS = [
    '#0d9488', '#2563eb', '#059669', '#d97706', '#db2777',
    '#7c3aed', '#0891b2', '#ea580c', '#4f46e5', '#16a34a',
    '#ca8a04', '#e11d48', '#0e7490', '#9333ea', '#65a30d'
  ];

  var SORT_STORAGE = 'np_plan_pro_invest_holdings_sort_v1';
  var st = {
    wired: false,
    holdings: [],
    extracting: false,
    tableReady: true,
    pieHoldings: null,
    pieType: null,
    manualTimers: Object.create(null),
    savingCloud: false,
    sortKey: 'marketValue',
    sortDir: 'desc'
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

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function storageKey() {
    var ctx = getCtx();
    var uid = ctx.userId ? String(ctx.userId) : 'local';
    return STORAGE_KEY + '_' + uid;
  }

  function loadLocalCache() {
    try {
      var raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data && data.holdings) ? data.holdings : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalCache() {
    try {
      localStorage.setItem(
        storageKey(),
        JSON.stringify({
          version: 2,
          updatedAt: new Date().toISOString(),
          holdings: st.holdings
        })
      );
    } catch (e) {
      /* ignore quota */
    }
  }

  function numOrNull(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function holdingFromDb(row) {
    if (!row) return null;
    return {
      id: row.id || null,
      symbol: String(row.symbol || '').toUpperCase(),
      name: row.asset_name || '',
      assetType: row.asset_type || 'stock',
      quantity: numOrNull(row.quantity),
      price: numOrNull(row.price),
      priceChange: numOrNull(row.price_change),
      priceChangePct: numOrNull(row.price_change_pct),
      marketValue: numOrNull(row.market_value),
      dayChange: numOrNull(row.day_change),
      dayChangePct: numOrNull(row.day_change_pct),
      costBasis: numOrNull(row.cost_basis),
      gainLoss: numOrNull(row.gain_loss),
      gainLossPct: numOrNull(row.gain_loss_pct),
      asOfDate: row.as_of_date || '',
      targetShares: row.target_shares != null ? String(row.target_shares) : '',
      comments: row.comments != null ? String(row.comments) : ''
    };
  }

  /** Payload de mercado (+ manuals desde memoria). Escaneo NUNCA inventa manuals. */
  function holdingToDbRow(h, userId, sortOrder) {
    return {
      user_id: userId,
      symbol: String(h.symbol || '').toUpperCase(),
      asset_name: h.name || '',
      asset_type: h.assetType || 'stock',
      quantity: numOrNull(h.quantity),
      price: numOrNull(h.price),
      price_change: numOrNull(h.priceChange),
      price_change_pct: numOrNull(h.priceChangePct),
      market_value: numOrNull(h.marketValue),
      day_change: numOrNull(h.dayChange),
      day_change_pct: numOrNull(h.dayChangePct),
      cost_basis: numOrNull(h.costBasis),
      gain_loss: numOrNull(h.gainLoss),
      gain_loss_pct: numOrNull(h.gainLossPct),
      as_of_date: h.asOfDate || '',
      target_shares: h.targetShares != null ? String(h.targetShares) : '',
      comments: h.comments != null ? String(h.comments) : '',
      sort_order: sortOrder != null ? sortOrder : 0,
      updated_at: new Date().toISOString()
    };
  }

  function isMissingTableError(err) {
    var msg = (err && err.message) || '';
    return /relation|does not exist|schema|plan_pro_invest_holdings/i.test(msg);
  }

  function showSetupHint(show) {
    var el = $('npInvPfSetupMsg');
    if (!el) return;
    if (show) el.classList.remove('np-hide');
    else el.classList.add('np-hide');
  }

  async function loadFromCloud() {
    var ctx = getCtx();
    if (!ctx.client || !ctx.userId) {
      st.holdings = loadLocalCache();
      return;
    }
    try {
      var res = await ctx.client
        .from('plan_pro_invest_holdings')
        .select(
          'id, symbol, asset_name, asset_type, quantity, price, price_change, price_change_pct, market_value, day_change, day_change_pct, cost_basis, gain_loss, gain_loss_pct, as_of_date, target_shares, comments, sort_order, updated_at'
        )
        .eq('user_id', ctx.userId)
        .order('sort_order', { ascending: true })
        .order('market_value', { ascending: false });
      if (res.error) {
        if (isMissingTableError(res.error)) {
          st.tableReady = false;
          showSetupHint(true);
          st.holdings = loadLocalCache();
          return;
        }
        throw res.error;
      }
      st.tableReady = true;
      showSetupHint(false);
      var rows = (res.data || []).map(holdingFromDb).filter(Boolean);
      if (!rows.length) {
        var local = loadLocalCache();
        if (local.length) {
          st.holdings = local;
          await persistHoldingsToCloud({ reason: 'migrate-local' });
          return;
        }
      }
      st.holdings = rows;
      saveLocalCache();
    } catch (e) {
      console.warn('Invest portafolio: load cloud', e);
      st.holdings = loadLocalCache();
    }
  }

  function marketUpdatePayload(h, sortOrder) {
    return {
      asset_name: h.name || '',
      asset_type: h.assetType || 'stock',
      quantity: numOrNull(h.quantity),
      price: numOrNull(h.price),
      price_change: numOrNull(h.priceChange),
      price_change_pct: numOrNull(h.priceChangePct),
      market_value: numOrNull(h.marketValue),
      day_change: numOrNull(h.dayChange),
      day_change_pct: numOrNull(h.dayChangePct),
      cost_basis: numOrNull(h.costBasis),
      gain_loss: numOrNull(h.gainLoss),
      gain_loss_pct: numOrNull(h.gainLossPct),
      as_of_date: h.asOfDate || '',
      sort_order: sortOrder != null ? sortOrder : 0,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Guarda en nube.
   * reason=scan → UPDATE solo columnas de mercado (NUNCA target_shares/comments).
   * reason=migrate-local → upsert completo (incluye manuals del cache local).
   */
  async function persistHoldingsToCloud(opts) {
    opts = opts || {};
    var ctx = getCtx();
    saveLocalCache();
    if (!ctx.client || !ctx.userId || !st.tableReady) return { ok: !st.tableReady };
    if (!st.holdings.length && opts.reason !== 'clear') return { ok: true };

    st.savingCloud = true;
    try {
      if (opts.reason === 'scan') {
        var existingRes = await ctx.client
          .from('plan_pro_invest_holdings')
          .select('symbol')
          .eq('user_id', ctx.userId);
        if (existingRes.error) {
          if (isMissingTableError(existingRes.error)) {
            st.tableReady = false;
            showSetupHint(true);
            return { ok: false, missing: true };
          }
          throw existingRes.error;
        }
        var have = Object.create(null);
        (existingRes.data || []).forEach(function (r) {
          if (r && r.symbol) have[String(r.symbol).toUpperCase()] = 1;
        });

        var inserts = [];
        for (var i = 0; i < st.holdings.length; i++) {
          var h = st.holdings[i];
          var sym = String(h.symbol || '').toUpperCase();
          if (have[sym]) {
            // Solo mercado — Objetivo/Comentarios quedan intactos en Supabase
            var up = await ctx.client
              .from('plan_pro_invest_holdings')
              .update(marketUpdatePayload(h, i))
              .eq('user_id', ctx.userId)
              .eq('symbol', sym);
            if (up.error) throw up.error;
          } else {
            inserts.push(holdingToDbRow(h, ctx.userId, i));
          }
        }
        if (inserts.length) {
          var ins = await ctx.client.from('plan_pro_invest_holdings').insert(inserts);
          if (ins.error) throw ins.error;
        }
        return { ok: true };
      }

      // migrate-local / manual-insert: upsert completo
      var payload = st.holdings.map(function (h, idx) {
        return holdingToDbRow(h, ctx.userId, idx);
      });
      if (!payload.length) return { ok: true };
      var res = await ctx.client
        .from('plan_pro_invest_holdings')
        .upsert(payload, { onConflict: 'user_id,symbol' });
      if (res.error) {
        if (isMissingTableError(res.error)) {
          st.tableReady = false;
          showSetupHint(true);
          return { ok: false, missing: true };
        }
        throw res.error;
      }
      return { ok: true };
    } catch (e) {
      console.warn('Invest portafolio: save cloud', e);
      toast('No se pudo guardar en la nube. Quedó en este navegador.', true);
      return { ok: false, error: e };
    } finally {
      st.savingCloud = false;
    }
  }

  /** Solo Objetivo / Comentarios — nunca llamado por el escaneo. */
  async function persistManualToCloud(symbol) {
    var ctx = getCtx();
    var sym = String(symbol || '').toUpperCase();
    var h = st.holdings.find(function (x) {
      return x.symbol === sym;
    });
    if (!h) return;
    saveLocalCache();
    if (!ctx.client || !ctx.userId || !st.tableReady) return;

    try {
      var res = await ctx.client
        .from('plan_pro_invest_holdings')
        .update({
          target_shares: h.targetShares != null ? String(h.targetShares) : '',
          comments: h.comments != null ? String(h.comments) : '',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', ctx.userId)
        .eq('symbol', sym);
      if (res.error) {
        if (isMissingTableError(res.error)) {
          st.tableReady = false;
          showSetupHint(true);
          return;
        }
        // Si aún no existe fila (raro), crea con manuals
        if (/0 rows|not found/i.test(res.error.message || '')) {
          await persistHoldingsToCloud({ reason: 'manual-insert' });
        } else {
          throw res.error;
        }
      }
    } catch (e) {
      console.warn('Invest portafolio: save manual', e);
    }
  }

  function scheduleManualSave(symbol) {
    var sym = String(symbol || '').toUpperCase();
    if (st.manualTimers[sym]) clearTimeout(st.manualTimers[sym]);
    st.manualTimers[sym] = setTimeout(function () {
      delete st.manualTimers[sym];
      persistManualToCloud(sym);
    }, MANUAL_SAVE_MS);
  }

  async function flushManualSaves() {
    var syms = Object.keys(st.manualTimers);
    syms.forEach(function (sym) {
      clearTimeout(st.manualTimers[sym]);
      delete st.manualTimers[sym];
    });
    for (var i = 0; i < syms.length; i++) {
      await persistManualToCloud(syms[i]);
    }
  }

  function fmtMoney(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return (
      '$' +
      Number(v).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }

  function fmtQty(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    var n = Number(v);
    var digits = Math.abs(n) >= 100 ? 2 : Math.abs(n) >= 1 ? 4 : 4;
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    });
  }

  function fmtSigned(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    var n = Number(v);
    var sign = n > 0 ? '+' : n < 0 ? '-' : '';
    var abs = Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return sign + '$' + abs;
  }

  function signedClass(v) {
    if (v == null || !Number.isFinite(Number(v))) return '';
    if (Number(v) > 0) return 'np-inv-pf-up';
    if (Number(v) < 0) return 'np-inv-pf-down';
    return '';
  }

  function todayLabel() {
    try {
      return new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function typeLabel(t) {
    if (t === 'etf') return 'ETF';
    if (t === 'crypto') return 'Cripto';
    if (t === 'cash') return 'Cash';
    return 'Acción';
  }

  function setStatus(msg, isErr) {
    var el = $('npInvPfStatus');
    if (!el) return;
    if (!msg) {
      el.classList.add('np-hide');
      el.textContent = '';
      return;
    }
    el.classList.remove('np-hide');
    el.classList.toggle('np-inv-pf-status--err', !!isErr);
    el.textContent = msg;
  }

  function mergeExtracted(incoming, asOfDate) {
    var bySym = Object.create(null);
    st.holdings.forEach(function (h) {
      if (h && h.symbol) bySym[String(h.symbol).toUpperCase()] = h;
    });

    (incoming || []).forEach(function (row) {
      if (!row || !row.symbol) return;
      var sym = String(row.symbol).toUpperCase();
      var prev = bySym[sym] || {};
      bySym[sym] = {
        id: prev.id || null,
        symbol: sym,
        name: row.name || prev.name || sym,
        assetType: row.assetType || prev.assetType || 'stock',
        quantity: row.quantity != null ? row.quantity : prev.quantity,
        price: row.price != null ? row.price : prev.price,
        priceChange: row.priceChange != null ? row.priceChange : null,
        priceChangePct: row.priceChangePct != null ? row.priceChangePct : null,
        marketValue: row.marketValue != null ? row.marketValue : prev.marketValue,
        dayChange: row.dayChange != null ? row.dayChange : null,
        dayChangePct: row.dayChangePct != null ? row.dayChangePct : null,
        costBasis: row.costBasis != null ? row.costBasis : prev.costBasis,
        gainLoss: row.gainLoss != null ? row.gainLoss : null,
        gainLossPct: row.gainLossPct != null ? row.gainLossPct : null,
        asOfDate: asOfDate,
        // Manuales: NUNCA tocar con el escaneo — solo lo que ya tenía el usuario
        targetShares: prev.targetShares != null ? prev.targetShares : '',
        comments: prev.comments != null ? prev.comments : ''
      };
    });

    st.holdings = Object.keys(bySym)
      .map(function (k) {
        return bySym[k];
      })
      .sort(function (a, b) {
        return (b.marketValue || 0) - (a.marketValue || 0);
      });
    saveLocalCache();
  }

  function updateManual(symbol, field, value) {
    var sym = String(symbol || '').toUpperCase();
    st.holdings.forEach(function (h) {
      if (h.symbol === sym) {
        if (field === 'targetShares') {
          var n = String(value || '').trim();
          h.targetShares = n === '' ? '' : n;
        } else if (field === 'comments') {
          h.comments = String(value || '');
        }
      }
    });
    saveLocalCache();
    // Solo este path escribe Objetivo/Comentarios en Supabase
    scheduleManualSave(sym);
  }

  async function removeHolding(symbol) {
    var sym = String(symbol || '').toUpperCase();
    st.holdings = st.holdings.filter(function (h) {
      return h.symbol !== sym;
    });
    saveLocalCache();
    render();
    var ctx = getCtx();
    if (ctx.client && ctx.userId && st.tableReady) {
      try {
        var res = await ctx.client
          .from('plan_pro_invest_holdings')
          .delete()
          .eq('user_id', ctx.userId)
          .eq('symbol', sym);
        if (res.error && isMissingTableError(res.error)) {
          st.tableReady = false;
          showSetupHint(true);
        }
      } catch (e) {
        /* ignore */
      }
    }
  }

  async function clearAll() {
    if (!st.holdings.length) return;
    if (!window.confirm('¿Vaciar la tabla de portafolio? Se borran también objetivos y comentarios en la nube.')) {
      return;
    }
    st.holdings = [];
    saveLocalCache();
    render();
    var ctx = getCtx();
    if (ctx.client && ctx.userId && st.tableReady) {
      try {
        var res = await ctx.client
          .from('plan_pro_invest_holdings')
          .delete()
          .eq('user_id', ctx.userId);
        if (res.error && isMissingTableError(res.error)) {
          st.tableReady = false;
          showSetupHint(true);
        }
      } catch (e) {
        /* ignore */
      }
    }
    toast('Portafolio limpio');
  }

  function totals() {
    var total = 0;
    var stock = 0;
    var etf = 0;
    var other = 0;
    st.holdings.forEach(function (h) {
      var v = Number(h.marketValue);
      if (!Number.isFinite(v)) return;
      total += v;
      if (h.assetType === 'etf') etf += v;
      else if (h.assetType === 'stock') stock += v;
      else other += v;
    });
    return { total: total, stock: stock, etf: etf, other: other };
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function getAccessToken() {
    var ctx = getCtx();
    var client = ctx.client;
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return null;
    }
    var sessRes = await client.auth.getSession();
    return sessRes && sessRes.data && sessRes.data.session && sessRes.data.session.access_token
      ? sessRes.data.session.access_token
      : null;
  }

  async function extractOne(file, token) {
    var base64 = await fileToBase64(file);
    var apiBase =
      (typeof global.getNutriPlantApiBase === 'function' ? global.getNutriPlantApiBase() : null) ||
      (global.location && global.location.origin) ||
      '';
    var url = String(apiBase).replace(/\/$/, '') + '/api/invest-portfolio-extract';
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({
        filename: file.name || 'portafolio.png',
        mimeType: file.type || 'image/png',
        imageBase64: base64
      })
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !data.ok) {
      throw new Error((data && data.error) || 'No se pudo extraer la captura.');
    }
    return Array.isArray(data.holdings) ? data.holdings : [];
  }

  async function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(function (f) {
      return f && /^image\//i.test(f.type || '');
    });
    if (!files.length) {
      toast('Selecciona capturas de imagen (PNG/JPG/WebP).', true);
      return;
    }
    if (files.length > MAX_IMAGES) {
      toast('Máximo ' + MAX_IMAGES + ' capturas por tanda.', true);
      files = files.slice(0, MAX_IMAGES);
    }
    for (var i = 0; i < files.length; i++) {
      if (files[i].size > MAX_FILE_BYTES) {
        toast(
          '«' + (files[i].name || 'imagen') + '» supera ~4.5 MB. Comprime o recorta.',
          true
        );
        return;
      }
    }

    var token = await getAccessToken();
    if (!token) {
      toast('Sesión no disponible. Vuelve a entrar a Plan PRO.', true);
      return;
    }

    st.extracting = true;
    var btn = $('npInvPfUploadBtn');
    if (btn) btn.disabled = true;
    var asOf = todayLabel();
    var totalFound = 0;

    try {
      await flushManualSaves();
      for (var n = 0; n < files.length; n++) {
        setStatus('Analizando captura ' + (n + 1) + ' de ' + files.length + ' con Chat Admin IA…');
        var rows = await extractOne(files[n], token);
        totalFound += rows.length;
        mergeExtracted(rows, asOf);
        renderTable();
        renderCharts();
        renderSummary();
      }
      if (totalFound === 0) {
        setStatus('No se detectaron filas de portafolio. Prueba capturas más claras del listado Schwab.', true);
        toast('Sin posiciones detectadas', true);
      } else {
        setStatus('Guardando en Supabase… (objetivo y comentarios intactos)');
        var saved = await persistHoldingsToCloud({ reason: 'scan' });
        setStatus(
          'Listo: ' +
            totalFound +
            ' posición(es) leídas · valor actual con fecha ' +
            asOf +
            '. Objetivos y comentarios se conservaron' +
            (saved && saved.ok && st.tableReady ? ' · guardado en nube.' : '.')
        );
        toast('Portafolio actualizado (' + totalFound + ')');
      }
    } catch (err) {
      setStatus((err && err.message) || 'Error al extraer.', true);
      toast((err && err.message) || 'Error al extraer', true);
    } finally {
      st.extracting = false;
      if (btn) btn.disabled = false;
      var input = $('npInvPfFileInput');
      if (input) input.value = '';
    }
  }

  function loadChartJs(cb) {
    if (global.Chart) {
      cb();
      return;
    }
    if (typeof global.loadChartJs === 'function') {
      global.loadChartJs(cb);
      return;
    }
    var existing = document.querySelector('script[data-np-chartjs="1"]');
    if (existing) {
      existing.addEventListener('load', function () {
        cb();
      });
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.async = true;
    s.setAttribute('data-np-chartjs', '1');
    s.onload = function () {
      cb();
    };
    s.onerror = function () {
      console.warn('Invest PRO portafolio: no se pudo cargar Chart.js');
    };
    document.head.appendChild(s);
  }

  function destroyChart(ref) {
    if (ref && typeof ref.destroy === 'function') {
      try {
        ref.destroy();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function renderCharts() {
    var empty = $('npInvPfChartsEmpty');
    var wrap = $('npInvPfCharts');
    if (!st.holdings.length) {
      destroyChart(st.pieHoldings);
      destroyChart(st.pieType);
      st.pieHoldings = null;
      st.pieType = null;
      if (empty) empty.classList.remove('np-hide');
      if (wrap) wrap.classList.add('np-hide');
      return;
    }
    if (empty) empty.classList.add('np-hide');
    if (wrap) wrap.classList.remove('np-hide');

    loadChartJs(function () {
      if (!global.Chart) return;
      var t = totals();
      var labels = [];
      var values = [];
      var colors = [];
      st.holdings.forEach(function (h, idx) {
        var v = Number(h.marketValue);
        if (!Number.isFinite(v) || v <= 0) return;
        labels.push(h.symbol);
        values.push(v);
        colors.push(PIE_COLORS[idx % PIE_COLORS.length]);
      });

      var c1 = $('npInvPfPieHoldings');
      var c2 = $('npInvPfPieType');
      if (c1) {
        destroyChart(st.pieHoldings);
        st.pieHoldings = new global.Chart(c1, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [
              {
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { boxWidth: 12, font: { size: 11 } }
              },
              title: {
                display: true,
                text: 'Peso por posición',
                color: '#0f766e',
                font: { size: 13, weight: '700' }
              },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    var v = ctx.parsed || 0;
                    var pct = t.total > 0 ? ((v / t.total) * 100).toFixed(1) : '0';
                    return ' ' + ctx.label + ': ' + fmtMoney(v) + ' (' + pct + '%)';
                  }
                }
              }
            }
          }
        });
      }

      if (c2) {
        destroyChart(st.pieType);
        var typeLabels = [];
        var typeValues = [];
        var typeColors = [];
        if (t.stock > 0) {
          typeLabels.push('Acciones');
          typeValues.push(t.stock);
          typeColors.push('#0d9488');
        }
        if (t.etf > 0) {
          typeLabels.push('ETFs');
          typeValues.push(t.etf);
          typeColors.push('#2563eb');
        }
        if (t.other > 0) {
          typeLabels.push('Otros');
          typeValues.push(t.other);
          typeColors.push('#d97706');
        }
        st.pieType = new global.Chart(c2, {
          type: 'doughnut',
          data: {
            labels: typeLabels,
            datasets: [
              {
                data: typeValues,
                backgroundColor: typeColors,
                borderWidth: 2,
                borderColor: '#fff'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { boxWidth: 12, font: { size: 11 } }
              },
              title: {
                display: true,
                text: '% ETF vs Acciones',
                color: '#0f766e',
                font: { size: 13, weight: '700' }
              },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    var v = ctx.parsed || 0;
                    var pct = t.total > 0 ? ((v / t.total) * 100).toFixed(1) : '0';
                    return ' ' + ctx.label + ': ' + fmtMoney(v) + ' (' + pct + '%)';
                  }
                }
              }
            }
          }
        });
      }
    });
  }

  function renderSummary() {
    var el = $('npInvPfSummary');
    if (!el) return;
    if (!st.holdings.length) {
      el.innerHTML = '';
      return;
    }
    var t = totals();
    var stockPct = t.total > 0 ? ((t.stock / t.total) * 100).toFixed(1) : '0';
    var etfPct = t.total > 0 ? ((t.etf / t.total) * 100).toFixed(1) : '0';
    el.innerHTML =
      '<span><strong>' +
      st.holdings.length +
      '</strong> posiciones</span>' +
      '<span>Total <strong>' +
      escapeHtml(fmtMoney(t.total)) +
      '</strong></span>' +
      '<span>Acciones <strong>' +
      escapeHtml(stockPct) +
      '%</strong></span>' +
      '<span>ETFs <strong>' +
      escapeHtml(etfPct) +
      '%</strong></span>';
  }

  function applySortObject(data) {
    if (!data || typeof data !== 'object') return;
    if (data.key) st.sortKey = String(data.key);
    if (data.dir === 'asc' || data.dir === 'desc') st.sortDir = data.dir;
  }

  function loadSortPrefs() {
    // 1) Nube vía Plan PRO (plan_pro_ui_prefs.invest_holdings_sort)
    var ctx = getCtx();
    if (ctx.investHoldingsSort) {
      applySortObject(ctx.investHoldingsSort);
      return;
    }
    // 2) Cache local
    try {
      var raw = localStorage.getItem(SORT_STORAGE);
      if (!raw) return;
      applySortObject(JSON.parse(raw));
    } catch (e) {
      /* ignore */
    }
  }

  function saveSortPrefs() {
    var payload = { key: st.sortKey, dir: st.sortDir };
    try {
      localStorage.setItem(SORT_STORAGE, JSON.stringify(payload));
    } catch (e) {
      /* ignore */
    }
    var ctx = getCtx();
    if (typeof ctx.saveInvestHoldingsSort === 'function') {
      ctx.saveInvestHoldingsSort(payload);
    }
  }

  function sortValue(h, key) {
    if (!h) return null;
    if (key === 'symbol') return String(h.symbol || '').toUpperCase();
    if (key === 'comments') return String(h.comments || '').toLowerCase();
    if (key === 'targetShares') {
      var t = Number(h.targetShares);
      return Number.isFinite(t) ? t : String(h.targetShares || '').toLowerCase();
    }
    var n = Number(h[key]);
    return Number.isFinite(n) ? n : null;
  }

  function compareHoldings(a, b) {
    var key = st.sortKey || 'marketValue';
    var dir = st.sortDir === 'asc' ? 1 : -1;
    var va = sortValue(a, key);
    var vb = sortValue(b, key);
    if (va == null && vb == null) {
      return String(a.symbol || '').localeCompare(String(b.symbol || ''));
    }
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' || typeof vb === 'string') {
      var cmp = String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp * dir;
    } else {
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
    }
    return String(a.symbol || '').localeCompare(String(b.symbol || ''));
  }

  function holdingsGrouped() {
    var stocks = [];
    var etfs = [];
    var others = [];
    st.holdings.forEach(function (h) {
      if (h.assetType === 'etf') etfs.push(h);
      else if (h.assetType === 'stock') stocks.push(h);
      else others.push(h);
    });
    stocks.sort(compareHoldings);
    etfs.sort(compareHoldings);
    others.sort(compareHoldings);
    return { stocks: stocks, etfs: etfs, others: others };
  }

  function syncSortHeaderUi() {
    var head = $('npInvPfTableHead');
    if (!head) return;
    var buttons = head.querySelectorAll('[data-pf-sort]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var key = btn.getAttribute('data-pf-sort');
      var ico = btn.querySelector('.np-inv-pf-sort-ico');
      var active = key === st.sortKey;
      btn.classList.toggle('np-inv-pf-th-btn--active', active);
      btn.setAttribute('aria-sort', active ? (st.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      if (ico) {
        ico.textContent = active ? (st.sortDir === 'asc' ? '▲' : '▼') : '⇅';
      }
    }
  }

  function setSort(key) {
    if (!key) return;
    if (st.sortKey === key) {
      st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      st.sortKey = key;
      // Texto A→Z; números mayor→menor al primer clic
      st.sortDir = key === 'symbol' || key === 'comments' ? 'asc' : 'desc';
    }
    saveSortPrefs();
    renderTable();
  }

  function rowHtml(h, t) {
    var pct =
      t.total > 0 && Number.isFinite(Number(h.marketValue))
        ? ((Number(h.marketValue) / t.total) * 100).toFixed(1) + '%'
        : '—';
    var priceCell =
      '<div class="np-inv-pf-price">' +
      escapeHtml(fmtMoney(h.price)) +
      '</div>' +
      '<div class="np-inv-pf-asof" title="Fecha de la captura subida">' +
      escapeHtml(h.asOfDate || '—') +
      '</div>';
    return (
      '<tr data-pf-sym="' +
      escapeHtml(h.symbol) +
      '">' +
      '<td class="np-inv-pf-sym-cell">' +
      '<button type="button" class="np-inv-pf-sym-btn" data-pf-open="' +
      escapeHtml(h.symbol) +
      '" title="Abrir en gráfica">' +
      escapeHtml(h.symbol) +
      '</button>' +
      '<div class="np-inv-pf-name">' +
      escapeHtml(h.name || '') +
      '</div>' +
      '<span class="np-inv-pf-type' +
      (h.assetType === 'etf' ? ' np-inv-pf-type--etf' : '') +
      '">' +
      escapeHtml(typeLabel(h.assetType)) +
      '</span>' +
      '</td>' +
      '<td class="np-inv-pf-num">' +
      escapeHtml(fmtQty(h.quantity)) +
      '</td>' +
      '<td class="np-inv-pf-num">' +
      priceCell +
      '</td>' +
      '<td class="np-inv-pf-num">' +
      escapeHtml(fmtMoney(h.marketValue)) +
      '<div class="np-inv-pf-asof">' +
      escapeHtml(pct) +
      '</div></td>' +
      '<td class="np-inv-pf-num ' +
      signedClass(h.dayChange) +
      '">' +
      escapeHtml(fmtSigned(h.dayChange)) +
      '</td>' +
      '<td class="np-inv-pf-num ' +
      signedClass(h.gainLoss) +
      '">' +
      escapeHtml(fmtSigned(h.gainLoss)) +
      '</td>' +
      '<td><input class="np-inv-pf-input" type="text" inputmode="decimal" ' +
      'data-pf-target="' +
      escapeHtml(h.symbol) +
      '" value="' +
      escapeHtml(h.targetShares != null ? h.targetShares : '') +
      '" placeholder="ej. 2" aria-label="Objetivo acciones ' +
      escapeHtml(h.symbol) +
      '" /></td>' +
      '<td><input class="np-inv-pf-input np-inv-pf-input--wide" type="text" ' +
      'data-pf-comment="' +
      escapeHtml(h.symbol) +
      '" value="' +
      escapeHtml(h.comments || '') +
      '" placeholder="Compra / nota…" aria-label="Comentario ' +
      escapeHtml(h.symbol) +
      '" /></td>' +
      '<td class="np-inv-pf-actions">' +
      '<button type="button" class="np-inv-pf-del" data-pf-del="' +
      escapeHtml(h.symbol) +
      '" title="Quitar fila">×</button>' +
      '</td>' +
      '</tr>'
    );
  }

  function sectionSepHtml(label) {
    return (
      '<tr class="np-inv-pf-sep" aria-hidden="true">' +
      '<td colspan="9">' +
      '<div class="np-inv-pf-sep-inner">' +
      '<span class="np-inv-pf-sep-line"></span>' +
      '<span class="np-inv-pf-sep-label">' +
      escapeHtml(label) +
      '</span>' +
      '<span class="np-inv-pf-sep-line"></span>' +
      '</div>' +
      '</td>' +
      '</tr>'
    );
  }

  function renderTable() {
    var body = $('npInvPfTableBody');
    var empty = $('npInvPfEmpty');
    var tableWrap = $('npInvPfTableWrap');
    if (!body) return;

    if (!st.holdings.length) {
      body.innerHTML = '';
      if (empty) empty.classList.remove('np-hide');
      if (tableWrap) tableWrap.classList.add('np-hide');
      return;
    }
    if (empty) empty.classList.add('np-hide');
    if (tableWrap) tableWrap.classList.remove('np-hide');

    var t = totals();
    var g = holdingsGrouped();
    var parts = [];

    if (g.stocks.length) {
      parts.push(sectionSepHtml('Acciones'));
      g.stocks.forEach(function (h) {
        parts.push(rowHtml(h, t));
      });
    }
    if (g.etfs.length) {
      parts.push(sectionSepHtml('ETFs'));
      g.etfs.forEach(function (h) {
        parts.push(rowHtml(h, t));
      });
    }
    if (g.others.length) {
      parts.push(sectionSepHtml('Otros'));
      g.others.forEach(function (h) {
        parts.push(rowHtml(h, t));
      });
    }

    body.innerHTML = parts.join('');
    syncSortHeaderUi();
  }

  function render() {
    renderTable();
    renderSummary();
    renderCharts();
  }

  function wireEvents() {
    if (st.wired) return;
    var root = $('npInvPortfolioPanel');
    if (!root) return;
    st.wired = true;

    var uploadBtn = $('npInvPfUploadBtn');
    var fileInput = $('npInvPfFileInput');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () {
        if (st.extracting) return;
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        handleFiles(fileInput.files);
      });
    }

    var clearBtn = $('npInvPfClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAll);
    }

    root.addEventListener('click', function (e) {
      var sortBtn = e.target.closest('[data-pf-sort]');
      if (sortBtn) {
        setSort(sortBtn.getAttribute('data-pf-sort'));
        return;
      }
      var open = e.target.closest('[data-pf-open]');
      if (open) {
        var sym = open.getAttribute('data-pf-open');
        if (sym && global.PlanProInvest && typeof global.PlanProInvest.openSymbol === 'function') {
          global.PlanProInvest.openSymbol(sym);
        }
        return;
      }
      var del = e.target.closest('[data-pf-del]');
      if (del) {
        removeHolding(del.getAttribute('data-pf-del'));
      }
    });

    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.getAttribute('data-pf-target')) {
        updateManual(t.getAttribute('data-pf-target'), 'targetShares', t.value);
      } else if (t && t.getAttribute('data-pf-comment')) {
        updateManual(t.getAttribute('data-pf-comment'), 'comments', t.value);
      }
    });
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.getAttribute('data-pf-target')) {
        updateManual(t.getAttribute('data-pf-target'), 'targetShares', t.value);
      } else if (t && t.getAttribute('data-pf-comment')) {
        updateManual(t.getAttribute('data-pf-comment'), 'comments', t.value);
      }
    });
  }

  async function init() {
    wireEvents();
    loadSortPrefs();
    await loadFromCloud();
    render();
  }

  global.PlanProInvestPortfolio = {
    init: init,
    render: render
  };
})(typeof window !== 'undefined' ? window : globalThis);
