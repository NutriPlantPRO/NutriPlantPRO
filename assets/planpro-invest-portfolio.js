/**
 * Invest PRO — Portafolio Schwab: captura → IA → tabla + pasteles.
 * Columnas manuales (objetivo / comentarios) persisten por símbolo.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'np_plan_pro_invest_holdings_v1';
  var MAX_IMAGES = 4;
  var MAX_FILE_BYTES = 4.5 * 1024 * 1024;
  var PIE_COLORS = [
    '#0d9488', '#2563eb', '#059669', '#d97706', '#db2777',
    '#7c3aed', '#0891b2', '#ea580c', '#4f46e5', '#16a34a',
    '#ca8a04', '#e11d48', '#0e7490', '#9333ea', '#65a30d'
  ];

  var st = {
    wired: false,
    holdings: [],
    extracting: false,
    pieHoldings: null,
    pieType: null
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

  function loadStored() {
    try {
      var raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data && data.holdings) ? data.holdings : [];
    } catch (e) {
      return [];
    }
  }

  function saveStored() {
    try {
      localStorage.setItem(
        storageKey(),
        JSON.stringify({
          version: 1,
          updatedAt: new Date().toISOString(),
          holdings: st.holdings
        })
      );
    } catch (e) {
      /* ignore quota */
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
        // Manuales: NUNCA sobrescribir con la captura
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
    saveStored();
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
    saveStored();
  }

  function removeHolding(symbol) {
    var sym = String(symbol || '').toUpperCase();
    st.holdings = st.holdings.filter(function (h) {
      return h.symbol !== sym;
    });
    saveStored();
    render();
  }

  function clearAll() {
    if (!st.holdings.length) return;
    if (!window.confirm('¿Vaciar la tabla de portafolio? Se borran también objetivos y comentarios.')) {
      return;
    }
    st.holdings = [];
    saveStored();
    render();
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
        setStatus(
          'Listo: ' +
            totalFound +
            ' posición(es) leídas · valor actual con fecha ' +
            asOf +
            '. Objetivos y comentarios se conservaron.'
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
    var html = st.holdings
      .map(function (h) {
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
          '<span class="np-inv-pf-type">' +
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
      })
      .join('');
    body.innerHTML = html;
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

  function init() {
    wireEvents();
    st.holdings = loadStored();
    render();
  }

  global.PlanProInvestPortfolio = {
    init: init,
    render: render
  };
})(typeof window !== 'undefined' ? window : globalThis);
