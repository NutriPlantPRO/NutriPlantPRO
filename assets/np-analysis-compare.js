/**
 * Comparación multi-análisis + catálogo de campos (fase 1: suelo).
 * También helpers de UI para revisión PDF → campos.
 */
(function (w) {
  'use strict';

  var CHART_COLORS = [
    '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777',
    '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#059669'
  ];

  var SOIL_FIELDS = [
    { path: 'phSection.ph', label: 'pH', unit: 'other', chartable: true },
    { path: 'phSection.phBuffer', label: 'pH Buffer', unit: 'other', chartable: true },
    { path: 'phSection.totalCarbonates', label: 'Carbonatos totales', unit: 'pct', chartable: true },
    { path: 'phSection.salinity', label: 'CE (dS/m)', unit: 'other', chartable: true },
    { path: 'physical.saturationPoint', label: 'Punto saturación', unit: 'pct', chartable: true },
    { path: 'physical.fieldCapacity', label: 'Capacidad de campo', unit: 'pct', chartable: true },
    { path: 'physical.wiltingPoint', label: 'Punto marchitez', unit: 'pct', chartable: true },
    { path: 'physical.bulkDensity', label: 'Densidad aparente', unit: 'other', chartable: true },
    { path: 'physical.hydraulicConductivity', label: 'Cond. hidráulica', unit: 'other', chartable: true },
    { path: 'fertility.mo', label: 'MO', unit: 'pct', chartable: true },
    { path: 'fertility.nNo3', label: 'N-NO₃', unit: 'ppm', chartable: true },
    { path: 'fertility.p', label: 'P', unit: 'ppm', chartable: true },
    { path: 'fertility.k', label: 'K', unit: 'ppm', chartable: true },
    { path: 'fertility.ca', label: 'Ca', unit: 'ppm', chartable: true },
    { path: 'fertility.mg', label: 'Mg', unit: 'ppm', chartable: true },
    { path: 'fertility.na', label: 'Na', unit: 'ppm', chartable: true },
    { path: 'fertility.s', label: 'S', unit: 'ppm', chartable: true },
    { path: 'fertility.fe', label: 'Fe', unit: 'ppm', chartable: true },
    { path: 'fertility.mn', label: 'Mn', unit: 'ppm', chartable: true },
    { path: 'fertility.b', label: 'B', unit: 'ppm', chartable: true },
    { path: 'fertility.zn', label: 'Zn', unit: 'ppm', chartable: true },
    { path: 'fertility.cu', label: 'Cu', unit: 'ppm', chartable: true },
    { path: 'fertility.moly', label: 'Mo', unit: 'ppm', chartable: true },
    { path: 'fertility.al', label: 'Al', unit: 'ppm', chartable: true },
    { path: 'cations.ca', label: 'Ca (meq)', unit: 'meq', chartable: true },
    { path: 'cations.mg', label: 'Mg (meq)', unit: 'meq', chartable: true },
    { path: 'cations.k', label: 'K (meq)', unit: 'meq', chartable: true },
    { path: 'cations.na', label: 'Na (meq)', unit: 'meq', chartable: true },
    { path: 'cations.cic', label: 'CIC', unit: 'meq', chartable: true },
    { path: 'cations.pctCa', label: '% Ca', unit: 'pct', chartable: true },
    { path: 'cations.pctMg', label: '% Mg', unit: 'pct', chartable: true },
    { path: 'cations.pctK', label: '% K', unit: 'pct', chartable: true },
    { path: 'cations.pctNa', label: '% Na', unit: 'pct', chartable: true },
    { path: 'ratios.caMg', label: 'Ca/Mg', unit: 'other', chartable: true },
    { path: 'ratios.mgK', label: 'Mg/K', unit: 'other', chartable: true },
    { path: 'ratios.caMgK', label: '(Ca+Mg)/K', unit: 'other', chartable: true },
    { path: 'ratios.caK', label: 'Ca/K', unit: 'other', chartable: true }
  ];

  var SOIL_REVIEW_FIELDS = [
    { path: 'title', label: 'Título' },
    { path: 'date', label: 'Fecha' },
    { path: 'physical.texturalClass', label: 'Clase textural' },
    { path: 'physical.saturationPoint', label: 'Punto saturación %' },
    { path: 'physical.fieldCapacity', label: 'Capacidad de campo %' },
    { path: 'physical.wiltingPoint', label: 'Punto marchitez %' },
    { path: 'physical.hydraulicConductivity', label: 'Cond. hidráulica cm/h' },
    { path: 'physical.bulkDensity', label: 'Densidad aparente g/cm³' },
    { path: 'phSection.ph', label: 'pH' },
    { path: 'phSection.phBuffer', label: 'pH Buffer' },
    { path: 'phSection.totalCarbonates', label: 'Carbonatos totales %' },
    { path: 'phSection.salinity', label: 'CE dS/m' },
    { path: 'fertility.pMethod', label: 'Método P' },
    { path: 'fertility.mo', label: 'MO %' },
    { path: 'fertility.nNo3', label: 'N-NO₃ ppm' },
    { path: 'fertility.p', label: 'P ppm' },
    { path: 'fertility.k', label: 'K ppm' },
    { path: 'fertility.ca', label: 'Ca ppm' },
    { path: 'fertility.mg', label: 'Mg ppm' },
    { path: 'fertility.na', label: 'Na ppm' },
    { path: 'fertility.s', label: 'S ppm' },
    { path: 'fertility.fe', label: 'Fe ppm' },
    { path: 'fertility.mn', label: 'Mn ppm' },
    { path: 'fertility.b', label: 'B ppm' },
    { path: 'fertility.zn', label: 'Zn ppm' },
    { path: 'fertility.cu', label: 'Cu ppm' },
    { path: 'fertility.moly', label: 'Mo ppm' },
    { path: 'fertility.al', label: 'Al ppm' },
    { path: 'fertility.depthCm', label: 'Profundidad cm' },
    { path: 'cations.ca', label: 'Ca meq' },
    { path: 'cations.mg', label: 'Mg meq' },
    { path: 'cations.k', label: 'K meq' },
    { path: 'cations.na', label: 'Na meq' },
    { path: 'cations.al', label: 'Al meq' },
    { path: 'cations.h', label: 'H meq' },
    { path: 'cations.cic', label: 'CIC' },
    { path: 'cations.pctCa', label: '% Ca' },
    { path: 'cations.pctMg', label: '% Mg' },
    { path: 'cations.pctK', label: '% K' },
    { path: 'cations.pctNa', label: '% Na' }
  ];

  function getByPath(obj, path) {
    if (!obj || !path) return '';
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return '';
      cur = cur[parts[i]];
    }
    if (cur === null || cur === undefined) return '';
    return cur;
  }

  function setByPath(obj, path, value) {
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function numOrNull(v) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function tr(key, fallback, params) {
    try {
      if (w.NpI18n && typeof w.NpI18n.t === 'function') {
        var out = w.NpI18n.t(key, params);
        if (out && out !== key) return out;
      }
    } catch (e) {}
    var s = fallback || key;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (k) {
        s = String(s).replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
      });
    }
    return s;
  }

  function analysisLabel(a, index) {
    var title = (a && a.title) ? String(a.title).trim() : '';
    var d = (a && a.date) ? String(a.date).trim() : '';
    if (title && d) return title + ' · ' + d;
    if (title) return title;
    if (d) return d;
    return tr('analysis.analysis_n', 'Análisis {n}', { n: index + 1 });
  }

  function buildCompareRows(analyses, catalog) {
    catalog = catalog || SOIL_FIELDS;
    analyses = Array.isArray(analyses) ? analyses : [];
    return catalog.map(function (field) {
      var values = analyses.map(function (a) {
        return numOrNull(getByPath(a, field.path));
      });
      return {
        path: field.path,
        label: field.label,
        unit: field.unit || 'other',
        chartable: field.chartable !== false,
        values: values
      };
    });
  }

  function ensureChartJs(cb) {
    if (w.Chart) {
      cb();
      return;
    }
    var existing = document.querySelector('script[data-np-chartjs]');
    if (existing) {
      existing.addEventListener('load', function () { cb(); });
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.async = true;
    s.setAttribute('data-np-chartjs', '1');
    s.onload = function () { cb(); };
    document.head.appendChild(s);
  }

  function destroyChart(state) {
    if (state && state.chart) {
      try { state.chart.destroy(); } catch (e) {}
      state.chart = null;
    }
  }

  function renderCompareChart(canvas, rows, analyses, selectedIds, state) {
    if (!canvas || !w.Chart) return;
    destroyChart(state);
    var selected = [];
    analyses.forEach(function (a, idx) {
      if (selectedIds[a.id]) selected.push({ analysis: a, index: idx });
    });
    if (!selected.length) return;

    var chartRows = rows.filter(function (r) {
      return r.chartable && r.values.some(function (v) { return v != null; });
    });
    if (!chartRows.length) return;

    var unitsUsed = {};
    chartRows.forEach(function (r) { unitsUsed[r.unit] = true; });
    var hasPct = !!unitsUsed.pct;
    var hasPpm = !!unitsUsed.ppm;
    var dual = hasPct && hasPpm;

    // When dual, chart only % + ppm so axes stay meaningful.
    if (dual) {
      chartRows = chartRows.filter(function (r) {
        return r.unit === 'pct' || r.unit === 'ppm';
      });
    }
    if (!chartRows.length) return;

    var labels = chartRows.map(function (r) {
      var u = r.unit === 'pct' ? ' %' : (r.unit === 'ppm' ? ' ppm' : (r.unit === 'meq' ? ' meq' : ''));
      return r.label + u;
    });

    var datasets;
    if (dual) {
      datasets = [];
      selected.forEach(function (item, si) {
        var color = CHART_COLORS[si % CHART_COLORS.length];
        var base = analysisLabel(item.analysis, item.index);
        datasets.push({
          label: base + ' (%)',
          data: chartRows.map(function (r) {
            return r.unit === 'pct' ? r.values[item.index] : null;
          }),
          borderColor: color,
          backgroundColor: color + '33',
          tension: 0.2,
          spanGaps: true,
          yAxisID: 'yPct'
        });
        datasets.push({
          label: base + ' (ppm)',
          data: chartRows.map(function (r) {
            return r.unit === 'ppm' ? r.values[item.index] : null;
          }),
          borderColor: color,
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          tension: 0.2,
          spanGaps: true,
          yAxisID: 'yPpm'
        });
      });
    } else {
      datasets = selected.map(function (item, si) {
        var color = CHART_COLORS[si % CHART_COLORS.length];
        return {
          label: analysisLabel(item.analysis, item.index),
          data: chartRows.map(function (r) {
            var v = r.values[item.index];
            return v == null ? null : v;
          }),
          borderColor: color,
          backgroundColor: color + '33',
          tension: 0.2,
          spanGaps: true,
          yAxisID: 'y'
        };
      });
    }

    var scales = {
      x: {
        ticks: { maxRotation: 60, minRotation: 30, font: { size: 10 } }
      }
    };
    if (dual) {
      scales.yPct = {
        type: 'linear',
        position: 'left',
        title: { display: true, text: '%' },
        grid: { drawOnChartArea: true }
      };
      scales.yPpm = {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'ppm' },
        grid: { drawOnChartArea: false }
      };
    } else {
      scales.y = {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: hasPct ? '%' : (hasPpm ? 'ppm' : tr('analysis.compare_axis_value', 'Valor'))
        }
      };
    }

    state.chart = new w.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: {
            label: function (ctx) {
              var v = ctx.parsed.y;
              if (v == null) return ctx.dataset.label + ': —';
              return ctx.dataset.label + ': ' + v;
            }
          } }
        },
        scales: scales
      }
    });
  }

  function mountSoilCompare(host, options) {
    options = options || {};
    if (!host) return null;
    var state = {
      selected: {},
      chart: null,
      getAnalyses: options.getAnalyses || function () { return []; }
    };

    host.innerHTML =
      '<details class="np-analysis-compare" open>' +
        '<summary class="np-analysis-compare__summary" data-i18n="analysis.compare_title">📊 ' +
          tr('analysis.compare_title', 'Comparar análisis (tabla y gráfica)') +
        '</summary>' +
        '<div class="np-analysis-compare__body">' +
          '<p class="np-analysis-compare__hint" data-i18n="analysis.compare_hint">' +
            tr('analysis.compare_hint', 'Cada columna es un análisis del proyecto. Activa las columnas que quieras ver en la gráfica. Eje Y izquierdo: % · derecho: ppm cuando ambos estén presentes.') +
          '</p>' +
          '<div class="np-analysis-compare__cols" id="npSoilCompareCols"></div>' +
          '<div class="np-analysis-compare__table-wrap"><table class="np-analysis-compare__table" id="npSoilCompareTable"><thead></thead><tbody></tbody></table></div>' +
          '<div class="np-analysis-compare__chart-wrap"><canvas id="npSoilCompareChart" aria-label="' +
            tr('analysis.compare_chart_aria', 'Gráfica comparación análisis de suelo') +
          '"></canvas></div>' +
        '</div>' +
      '</details>';

    function refresh() {
      var analyses = state.getAnalyses() || [];
      var colsEl = host.querySelector('#npSoilCompareCols');
      var table = host.querySelector('#npSoilCompareTable');
      var canvas = host.querySelector('#npSoilCompareChart');
      if (!colsEl || !table) return;

      var idSet = {};
      analyses.forEach(function (a) { idSet[a.id] = true; });
      Object.keys(state.selected).forEach(function (id) {
        if (!idSet[id]) delete state.selected[id];
      });
      if (!Object.keys(state.selected).length && analyses.length) {
        analyses.forEach(function (a) { state.selected[a.id] = true; });
      }

      colsEl.innerHTML = '';
      analyses.forEach(function (a, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'np-analysis-compare__col-btn' + (state.selected[a.id] ? ' is-on' : '');
        btn.textContent = analysisLabel(a, idx);
        btn.title = tr('analysis.compare_toggle_col', 'Incluir/excluir en gráfica');
        btn.addEventListener('click', function () {
          state.selected[a.id] = !state.selected[a.id];
          refresh();
        });
        colsEl.appendChild(btn);
      });

      var rows = buildCompareRows(analyses, SOIL_FIELDS);
      var thead = table.querySelector('thead');
      var tbody = table.querySelector('tbody');
      thead.innerHTML = '';
      tbody.innerHTML = '';
      var hr = document.createElement('tr');
      hr.innerHTML = '<th>' + tr('analysis.compare_param', 'Parámetro') + '</th>';
      analyses.forEach(function (a, idx) {
        var th = document.createElement('th');
        th.textContent = analysisLabel(a, idx);
        if (state.selected[a.id]) th.className = 'is-on';
        hr.appendChild(th);
      });
      thead.appendChild(hr);

      rows.forEach(function (row) {
        var tr = document.createElement('tr');
        var unitHint = row.unit === 'pct' ? ' (%)' : (row.unit === 'ppm' ? ' (ppm)' : (row.unit === 'meq' ? ' (meq)' : ''));
        var td0 = document.createElement('td');
        td0.textContent = row.label + unitHint;
        tr.appendChild(td0);
        row.values.forEach(function (v) {
          var td = document.createElement('td');
          td.textContent = v == null ? '—' : String(v);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      ensureChartJs(function () {
        renderCompareChart(canvas, rows, analyses, state.selected, state);
      });
    }

    state.refresh = refresh;
    refresh();
    return state;
  }

  function flattenDetected(fields) {
    var out = [];
    SOIL_REVIEW_FIELDS.forEach(function (f) {
      var val = getByPath(fields, f.path);
      out.push({
        path: f.path,
        label: f.label,
        value: val === null || val === undefined ? '' : String(val),
        checked: val !== '' && val !== null && val !== undefined
      });
    });
    return out;
  }

  function openSoilReviewModal(fields, onApply) {
    var existing = document.getElementById('npLabPdfReviewModal');
    if (existing) existing.remove();

    var rows = flattenDetected(fields || {});
    var modal = document.createElement('div');
    modal.id = 'npLabPdfReviewModal';
    modal.className = 'np-lab-pdf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="np-lab-pdf-modal__panel">' +
        '<div class="np-lab-pdf-modal__head">' +
          '<h3>' + tr('analysis.pdf_review_title', 'Revisar datos detectados (suelo)') + '</h3>' +
          '<button type="button" class="np-lab-pdf-modal__close" aria-label="' +
            tr('analysis.pdf_review_close', 'Cerrar') +
          '">×</button>' +
        '</div>' +
        '<p class="np-lab-pdf-modal__intro">' +
          tr('analysis.pdf_review_intro', 'Marca los campos a aplicar. Corrige o completa los vacíos. Luego confirma para llenar el análisis.') +
        '</p>' +
        (fields && fields.notes ? '<p class="np-lab-pdf-modal__notes">' + String(fields.notes).replace(/</g, '&lt;') + '</p>' : '') +
        '<div class="np-lab-pdf-modal__actions-top">' +
          '<button type="button" class="btn btn-sm" data-act="all">' +
            tr('analysis.pdf_review_select_valued', 'Seleccionar todos con valor') +
          '</button>' +
          '<button type="button" class="btn btn-sm" data-act="none">' +
            tr('analysis.pdf_review_clear', 'Quitar selección') +
          '</button>' +
        '</div>' +
        '<div class="np-lab-pdf-modal__list"></div>' +
        '<div class="np-lab-pdf-modal__foot">' +
          '<label class="np-lab-pdf-modal__new"><input type="checkbox" data-new checked> ' +
            tr('analysis.pdf_review_as_new', 'Crear análisis nuevo (si no, aplica al actual)') +
          '</label>' +
          '<div class="np-lab-pdf-modal__foot-btns">' +
            '<button type="button" class="btn btn-sm" data-act="cancel">' +
              tr('analysis.pdf_review_cancel', 'Cancelar') +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-success" data-act="apply">' +
              tr('analysis.pdf_review_apply', 'Aplicar') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var list = modal.querySelector('.np-lab-pdf-modal__list');
    rows.forEach(function (row) {
      var item = document.createElement('label');
      item.className = 'np-lab-pdf-modal__row';
      item.innerHTML =
        '<input type="checkbox" data-path="' + row.path + '"' + (row.checked ? ' checked' : '') + '>' +
        '<span class="np-lab-pdf-modal__label">' + row.label + '</span>' +
        '<input type="text" class="np-lab-pdf-modal__val" data-path-val="' + row.path + '" value="' + String(row.value).replace(/"/g, '&quot;') + '">';
      list.appendChild(item);
    });

    function close() { modal.remove(); }

    modal.querySelector('.np-lab-pdf-modal__close').addEventListener('click', close);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="all"]').addEventListener('click', function () {
      list.querySelectorAll('.np-lab-pdf-modal__row').forEach(function (row) {
        var val = row.querySelector('[data-path-val]');
        var cb = row.querySelector('input[type="checkbox"]');
        if (cb && val && String(val.value || '').trim()) cb.checked = true;
      });
    });
    modal.querySelector('[data-act="none"]').addEventListener('click', function () {
      list.querySelectorAll('input[type="checkbox"][data-path]').forEach(function (cb) {
        cb.checked = false;
      });
    });
    modal.querySelector('[data-act="apply"]').addEventListener('click', function () {
      var payload = {};
      list.querySelectorAll('.np-lab-pdf-modal__row').forEach(function (row) {
        var cb = row.querySelector('input[type="checkbox"][data-path]');
        var val = row.querySelector('[data-path-val]');
        if (!cb || !cb.checked || !val) return;
        setByPath(payload, cb.getAttribute('data-path'), String(val.value || '').trim());
      });
      var asNew = !!(modal.querySelector('[data-new]') && modal.querySelector('[data-new]').checked);
      close();
      if (typeof onApply === 'function') onApply(payload, { asNew: asNew });
    });

    document.body.appendChild(modal);
  }

  w.NpAnalysisCompare = {
    SOIL_FIELDS: SOIL_FIELDS,
    SOIL_REVIEW_FIELDS: SOIL_REVIEW_FIELDS,
    getByPath: getByPath,
    setByPath: setByPath,
    buildCompareRows: buildCompareRows,
    mountSoilCompare: mountSoilCompare,
    openSoilReviewModal: openSoilReviewModal,
    analysisLabel: analysisLabel
  };
})(typeof window !== 'undefined' ? window : this);
