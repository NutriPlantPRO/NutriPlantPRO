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
    { path: 'phSection.ph', labelKey: 'analysis.f_ph', label: 'pH', unit: 'other', chartable: true, block: 'ph' },
    { path: 'phSection.phBuffer', labelKey: 'analysis.f_ph_buffer', label: 'pH Buffer', unit: 'other', chartable: true, block: 'ph' },
    { path: 'phSection.totalCarbonates', labelKey: 'analysis.f_carbonates', label: 'Carbonatos totales', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'phSection.salinity', labelKey: 'analysis.f_ec', label: 'CE (dS/m)', unit: 'other', chartable: true, block: 'physical' },
    { path: 'physical.saturationPoint', labelKey: 'analysis.f_sat_point', label: 'Punto saturación', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'physical.fieldCapacity', labelKey: 'analysis.f_field_cap', label: 'Capacidad de campo', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'physical.wiltingPoint', labelKey: 'analysis.f_wilting', label: 'Punto marchitez', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'physical.bulkDensity', labelKey: 'analysis.f_bulk_density', label: 'Densidad aparente', unit: 'other', chartable: true, block: 'physical' },
    { path: 'physical.hydraulicConductivity', labelKey: 'analysis.f_hydr_cond', label: 'Cond. hidráulica', unit: 'other', chartable: true, block: 'physical' },
    { path: 'fertility.mo', labelKey: 'analysis.f_om', label: 'MO', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'fertility.nNo3', labelKey: 'analysis.f_n_no3', label: 'N-NO₃', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.p', labelKey: 'analysis.f_p', label: 'P', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.k', labelKey: 'analysis.f_k', label: 'K', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.ca', labelKey: 'analysis.f_ca', label: 'Ca', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.mg', labelKey: 'analysis.f_mg', label: 'Mg', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.na', labelKey: 'analysis.f_na', label: 'Na', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.s', labelKey: 'analysis.f_s', label: 'S', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.fe', labelKey: 'analysis.f_fe', label: 'Fe', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.mn', labelKey: 'analysis.f_mn', label: 'Mn', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.b', labelKey: 'analysis.f_b', label: 'B', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.zn', labelKey: 'analysis.f_zn', label: 'Zn', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.cu', labelKey: 'analysis.f_cu', label: 'Cu', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.moly', labelKey: 'analysis.f_mo', label: 'Mo', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.al', labelKey: 'analysis.f_al', label: 'Al', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'cations.ca', labelKey: 'analysis.f_ca_meq', label: 'Ca', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.mg', labelKey: 'analysis.f_mg_meq', label: 'Mg', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.k', labelKey: 'analysis.f_k_meq', label: 'K', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.na', labelKey: 'analysis.f_na_meq', label: 'Na', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.cic', labelKey: 'analysis.f_cec', label: 'CIC', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.pctCa', labelKey: 'analysis.f_pct_ca', label: '% Ca', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'cations.pctMg', labelKey: 'analysis.f_pct_mg', label: '% Mg', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'cations.pctK', labelKey: 'analysis.f_pct_k', label: '% K', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'cations.pctNa', labelKey: 'analysis.f_pct_na', label: '% Na', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'ratios.caMg', labelKey: 'analysis.f_ratio_ca_mg', label: 'Ca/Mg', unit: 'other', chartable: false, block: 'ratios' },
    { path: 'ratios.mgK', labelKey: 'analysis.f_ratio_mg_k', label: 'Mg/K', unit: 'other', chartable: false, block: 'ratios' },
    { path: 'ratios.caMgK', labelKey: 'analysis.f_ratio_ca_mg_k', label: '(Ca+Mg)/K', unit: 'other', chartable: false, block: 'ratios' },
    { path: 'ratios.caK', labelKey: 'analysis.f_ratio_ca_k', label: 'Ca/K', unit: 'other', chartable: false, block: 'ratios' }
  ];

  /** Orden y metadatos de bloques (tabla + gráficas). */
  var SOIL_BLOCKS = [
    { id: 'ph', titleKey: 'analysis.block_ph', title: 'pH', chartType: null, chart: false },
    { id: 'physical', titleKey: 'analysis.block_physical', title: 'Físicos / salinidad / MO', chartType: null, chart: false },
    { id: 'macros', titleKey: 'analysis.block_macros', title: 'Macros (ppm)', chartType: 'line', chart: true },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros (ppm)', chartType: 'line', chart: true },
    { id: 'cec_pct', titleKey: 'analysis.block_cec_pct', title: '% saturación CIC', chartType: 'bar', chart: true },
    { id: 'cations', titleKey: 'analysis.block_cations', title: 'Cationes (meq) / CIC', chartType: null, chart: false },
    { id: 'ratios', titleKey: 'analysis.block_ratios', title: 'Relaciones', chartType: null, chart: false }
  ];

  var SOIL_REVIEW_FIELDS = [
    { path: 'title', labelKey: 'analysis.f_title', label: 'Título' },
    { path: 'date', labelKey: 'analysis.f_date', label: 'Fecha' },
    { path: 'physical.texturalClass', labelKey: 'analysis.f_texture', label: 'Clase textural' },
    { path: 'physical.saturationPoint', labelKey: 'analysis.f_sat_point', label: 'Punto saturación %' },
    { path: 'physical.fieldCapacity', labelKey: 'analysis.f_field_cap', label: 'Capacidad de campo %' },
    { path: 'physical.wiltingPoint', labelKey: 'analysis.f_wilting', label: 'Punto marchitez %' },
    { path: 'physical.hydraulicConductivity', labelKey: 'analysis.f_hydr_cond', label: 'Cond. hidráulica cm/h' },
    { path: 'physical.bulkDensity', labelKey: 'analysis.f_bulk_density', label: 'Densidad aparente g/cm³' },
    { path: 'phSection.ph', labelKey: 'analysis.f_ph', label: 'pH' },
    { path: 'phSection.phBuffer', labelKey: 'analysis.f_ph_buffer', label: 'pH Buffer' },
    { path: 'phSection.totalCarbonates', labelKey: 'analysis.f_carbonates', label: 'Carbonatos totales %' },
    { path: 'phSection.salinity', labelKey: 'analysis.f_ec', label: 'CE dS/m' },
    { path: 'fertility.pMethod', labelKey: 'analysis.f_p_method', label: 'Método P' },
    { path: 'fertility.mo', labelKey: 'analysis.f_om', label: 'MO %' },
    { path: 'fertility.nNo3', labelKey: 'analysis.f_n_no3', label: 'N-NO₃ ppm' },
    { path: 'fertility.p', labelKey: 'analysis.f_p', label: 'P ppm' },
    { path: 'fertility.k', labelKey: 'analysis.f_k', label: 'K ppm' },
    { path: 'fertility.ca', labelKey: 'analysis.f_ca', label: 'Ca ppm' },
    { path: 'fertility.mg', labelKey: 'analysis.f_mg', label: 'Mg ppm' },
    { path: 'fertility.na', labelKey: 'analysis.f_na', label: 'Na ppm' },
    { path: 'fertility.s', labelKey: 'analysis.f_s', label: 'S ppm' },
    { path: 'fertility.fe', labelKey: 'analysis.f_fe', label: 'Fe ppm' },
    { path: 'fertility.mn', labelKey: 'analysis.f_mn', label: 'Mn ppm' },
    { path: 'fertility.b', labelKey: 'analysis.f_b', label: 'B ppm' },
    { path: 'fertility.zn', labelKey: 'analysis.f_zn', label: 'Zn ppm' },
    { path: 'fertility.cu', labelKey: 'analysis.f_cu', label: 'Cu ppm' },
    { path: 'fertility.moly', labelKey: 'analysis.f_mo', label: 'Mo ppm' },
    { path: 'fertility.al', labelKey: 'analysis.f_al', label: 'Al ppm' },
    { path: 'fertility.depthCm', labelKey: 'analysis.f_depth', label: 'Profundidad cm' },
    { path: 'cations.ca', labelKey: 'analysis.f_ca_meq', label: 'Ca meq' },
    { path: 'cations.mg', labelKey: 'analysis.f_mg_meq', label: 'Mg meq' },
    { path: 'cations.k', labelKey: 'analysis.f_k_meq', label: 'K meq' },
    { path: 'cations.na', labelKey: 'analysis.f_na_meq', label: 'Na meq' },
    { path: 'cations.al', labelKey: 'analysis.f_al_meq', label: 'Al meq' },
    { path: 'cations.h', labelKey: 'analysis.f_h_meq', label: 'H meq' },
    { path: 'cations.cic', labelKey: 'analysis.f_cec', label: 'CIC' },
    { path: 'cations.pctCa', labelKey: 'analysis.f_pct_ca', label: '% Ca' },
    { path: 'cations.pctMg', labelKey: 'analysis.f_pct_mg', label: '% Mg' },
    { path: 'cations.pctK', labelKey: 'analysis.f_pct_k', label: '% K' },
    { path: 'cations.pctNa', labelKey: 'analysis.f_pct_na', label: '% Na' }
  ];

  function fieldLabel(field) {
    if (!field) return '';
    return tr(field.labelKey || '', field.label || field.path || '');
  }

  function unitSuffix(unit) {
    if (unit === 'pct') return ' (%)';
    if (unit === 'ppm') return ' (ppm)';
    if (unit === 'meq') return ' (meq)';
    return '';
  }

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

  /** Cabecera de columna en 1–2 renglones (título / fecha) para no alargar la tabla. */
  function fillAnalysisColumnHeader(th, a, index) {
    th.classList.add('np-analysis-compare__th-analysis');
    th.title = analysisLabel(a, index);
    var title = (a && a.title) ? String(a.title).trim() : '';
    var d = (a && a.date) ? String(a.date).trim() : '';
    th.textContent = '';
    if (title && d) {
      var tEl = document.createElement('span');
      tEl.className = 'np-analysis-compare__th-title';
      tEl.textContent = title;
      var dEl = document.createElement('span');
      dEl.className = 'np-analysis-compare__th-date';
      dEl.textContent = d;
      th.appendChild(tEl);
      th.appendChild(dEl);
    } else {
      var one = document.createElement('span');
      one.className = 'np-analysis-compare__th-title';
      one.textContent = title || d || tr('analysis.analysis_n', 'Análisis {n}', { n: index + 1 });
      th.appendChild(one);
    }
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
        label: fieldLabel(field),
        unit: field.unit || 'other',
        chartable: field.chartable !== false,
        block: field.block || 'other',
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

  function destroyCharts(state) {
    if (!state) return;
    if (state.charts) {
      Object.keys(state.charts).forEach(function (id) {
        try { state.charts[id].destroy(); } catch (e) {}
      });
    }
    state.charts = {};
    if (state.chart) {
      try { state.chart.destroy(); } catch (e) {}
      state.chart = null;
    }
  }

  function selectedAnalyses(analyses, selectedIds) {
    var selected = [];
    analyses.forEach(function (a, idx) {
      if (selectedIds[a.id]) selected.push({ analysis: a, index: idx });
    });
    return selected;
  }

  function yAxisTitleForRows(rows) {
    var units = {};
    rows.forEach(function (r) { units[r.unit] = true; });
    if (units.pct && !units.ppm && !units.meq) return '%';
    if (units.ppm && !units.pct) return 'ppm';
    if (units.meq && !units.pct && !units.ppm) return 'meq';
    return tr('analysis.compare_axis_value', 'Valor');
  }

  function renderBlockChart(canvas, rows, analyses, selectedIds, chartType, chartKey, state) {
    if (!canvas || !w.Chart) return;
    if (state.charts && state.charts[chartKey]) {
      try { state.charts[chartKey].destroy(); } catch (e) {}
      delete state.charts[chartKey];
    }
    var selected = selectedAnalyses(analyses, selectedIds);
    if (!selected.length) return;

    var chartRows = rows.filter(function (r) {
      return r.chartable !== false && r.values.some(function (v) { return v != null; });
    });
    if (!chartRows.length) return;

    var labels = chartRows.map(function (r) {
      return r.label + unitSuffix(r.unit);
    });
    var isBar = chartType === 'bar';
    var datasets = selected.map(function (item, si) {
      var color = CHART_COLORS[si % CHART_COLORS.length];
      return {
        label: analysisLabel(item.analysis, item.index),
        data: chartRows.map(function (r) {
          var v = r.values[item.index];
          return v == null ? null : v;
        }),
        borderColor: color,
        backgroundColor: isBar ? color + 'cc' : color + '33',
        borderWidth: isBar ? 1 : 2,
        tension: 0.25,
        spanGaps: true,
        fill: false,
        maxBarThickness: 28
      };
    });

    if (!state.charts) state.charts = {};
    state.charts[chartKey] = new w.Chart(canvas.getContext('2d'), {
      type: isBar ? 'bar' : 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed.y;
                if (v == null) return ctx.dataset.label + ': —';
                return ctx.dataset.label + ': ' + v;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { maxRotation: 50, minRotation: 20, font: { size: 9 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: yAxisTitleForRows(chartRows), font: { size: 11 } }
          }
        }
      }
    });
  }

  function mountSoilCompare(host, options) {
    options = options || {};
    if (!host) return null;
    var state = {
      selected: {},
      charts: {},
      getAnalyses: options.getAnalyses || function () { return []; }
    };

    var chartsHtml = SOIL_BLOCKS.filter(function (b) { return b.chart; }).map(function (b) {
      return (
        '<div class="np-analysis-compare__chart-card" data-block="' + b.id + '">' +
          '<h4 class="np-analysis-compare__chart-title">' +
            tr(b.titleKey, b.title) +
          '</h4>' +
          '<div class="np-analysis-compare__chart-wrap">' +
            '<canvas id="npSoilChart_' + b.id + '" aria-label="' + tr(b.titleKey, b.title) + '"></canvas>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    host.innerHTML =
      '<details class="np-analysis-compare" open>' +
        '<summary class="np-analysis-compare__summary" data-i18n="analysis.compare_title">📊 ' +
          tr('analysis.compare_title', 'Comparar análisis (tabla y gráficas)') +
        '</summary>' +
        '<div class="np-analysis-compare__body">' +
          '<p class="np-analysis-compare__hint" data-i18n="analysis.compare_hint">' +
            tr(
              'analysis.compare_hint',
              'Cada columna es un análisis. Activa los que quieras comparar. pH y físicos/MO solo en tabla; gráficas: macros, micros y % CIC.'
            ) +
          '</p>' +
          '<div class="np-analysis-compare__cols" id="npSoilCompareCols"></div>' +
          '<div class="np-analysis-compare__tables" id="npSoilCompareTables"></div>' +
          '<div class="np-analysis-compare__charts" id="npSoilCompareCharts">' + chartsHtml + '</div>' +
        '</div>' +
      '</details>';

    function refresh() {
      var analyses = state.getAnalyses() || [];
      var colsEl = host.querySelector('#npSoilCompareCols');
      var tablesHost = host.querySelector('#npSoilCompareTables');
      if (!colsEl || !tablesHost) return;

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
      tablesHost.innerHTML = '';
      SOIL_BLOCKS.forEach(function (block) {
        var blockRows = rows.filter(function (r) { return r.block === block.id; });
        if (!blockRows.length) return;
        var wrap = document.createElement('div');
        wrap.className = 'np-analysis-compare__table-block np-analysis-compare__table-block--' + block.id;
        wrap.innerHTML =
          '<h4 class="np-analysis-compare__block-title">' + tr(block.titleKey, block.title) + '</h4>' +
          '<div class="np-analysis-compare__table-wrap">' +
            '<table class="np-analysis-compare__table"><thead></thead><tbody></tbody></table>' +
          '</div>';
        var table = wrap.querySelector('table');
        var thead = table.querySelector('thead');
        var tbody = table.querySelector('tbody');
        var hr = document.createElement('tr');
        var th0 = document.createElement('th');
        th0.textContent = tr('analysis.compare_param', 'Parámetro');
        hr.appendChild(th0);
        analyses.forEach(function (a, idx) {
          var th = document.createElement('th');
          fillAnalysisColumnHeader(th, a, idx);
          if (state.selected[a.id]) th.classList.add('is-on');
          hr.appendChild(th);
        });
        thead.appendChild(hr);
        blockRows.forEach(function (row) {
          var trEl = document.createElement('tr');
          var td0 = document.createElement('td');
          td0.textContent = row.label + unitSuffix(row.unit);
          trEl.appendChild(td0);
          row.values.forEach(function (v) {
            var td = document.createElement('td');
            td.textContent = v == null ? '—' : String(v);
            trEl.appendChild(td);
          });
          tbody.appendChild(trEl);
        });
        tablesHost.appendChild(wrap);
      });

      ensureChartJs(function () {
        destroyCharts(state);
        SOIL_BLOCKS.forEach(function (block) {
          if (!block.chart) return;
          var canvas = host.querySelector('#npSoilChart_' + block.id);
          var blockRows = rows.filter(function (r) { return r.block === block.id; });
          renderBlockChart(
            canvas,
            blockRows,
            analyses,
            state.selected,
            block.chartType,
            block.id,
            state
          );
        });
      });
    }

    state.refresh = refresh;
    refresh();
    return state;
  }

  function isDetectionLimitValue(s) {
    var t = String(s || '').trim();
    if (!t) return false;
    if (/^(nd|n\.?\s*d\.?|traza|trace|bdl|lod|loq|ndr)$/i.test(t)) return true;
    if (/^[<>]=?\s*\d/.test(t)) return true;
    return false;
  }

  function isPlainNumericValue(s) {
    var t = String(s || '').trim().replace(/,/g, '');
    if (!t) return false;
    if (isDetectionLimitValue(t)) return false;
    return /^-?\d+(\.\d+)?$/.test(t);
  }

  function flattenDetected(fields) {
    var out = [];
    var textPaths = { title: 1, date: 1, 'physical.texturalClass': 1, 'fertility.pMethod': 1 };
    SOIL_REVIEW_FIELDS.forEach(function (f) {
      var val = getByPath(fields, f.path);
      var str = val === null || val === undefined ? '' : String(val);
      var isText = !!textPaths[f.path];
      var autoCheck = str !== '' && (isText || isPlainNumericValue(str));
      var lim = str && isDetectionLimitValue(str)
        ? ' ' + tr('analysis.pdf_limit_tag', '⚠ límite')
        : '';
      out.push({
        path: f.path,
        label: fieldLabel(f) + lim,
        value: str,
        checked: autoCheck
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
        '<p class="np-lab-pdf-modal__intro" style="margin-top:-4px;color:#b45309;">' +
          tr(
            'analysis.pdf_review_limits_hint',
            'Si ves valores como &lt;25 o ND (límite de detección), cámbialos a un número antes de aplicar, o déjalos sin marcar.'
          ) +
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
    SOIL_BLOCKS: SOIL_BLOCKS,
    SOIL_REVIEW_FIELDS: SOIL_REVIEW_FIELDS,
    getByPath: getByPath,
    setByPath: setByPath,
    buildCompareRows: buildCompareRows,
    mountSoilCompare: mountSoilCompare,
    openSoilReviewModal: openSoilReviewModal,
    analysisLabel: analysisLabel
  };
})(typeof window !== 'undefined' ? window : this);
