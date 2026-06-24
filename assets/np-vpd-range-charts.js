/**
 * NutriPlant — gráficas VPD por rango (24 h apiladas) y horas críticas.
 * Dashboard, PDF y admin.
 */
(function (w) {
  'use strict';

  var CRITICAL_DISPLAY_DAYS = 30;
  var RANGE_CHART_PDF_MAX_BARS = 31;

  function compareIsoDates(a, b) {
    if (!a || !b) return 0;
    return String(a).localeCompare(String(b));
  }

  function addDaysIso(isoDate, days) {
    var d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return isoDate;
    d.setDate(d.getDate() + days);
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  function isoDateSpanInclusiveDays(start, end) {
    if (!start || !end) return 0;
    var d0 = new Date(start + 'T00:00:00');
    var d1 = new Date(end + 'T00:00:00');
    if (isNaN(d0.getTime()) || isNaN(d1.getTime())) return 0;
    return Math.max(0, Math.round((d1 - d0) / 86400000) + 1);
  }

  function resolveCriticalRowDate(row) {
    if (!row) return null;
    if (row.date) return String(row.date).slice(0, 10);
    if (row.at) return String(row.at).slice(0, 10);
    return null;
  }

  function getCriticalDisplayLabel() {
    return '1 mes (' + CRITICAL_DISPLAY_DAYS + ' días)';
  }

  function prepareCriticalRowsForDisplay(criticalRows, rangeEndDate, rangeStartDate) {
    var all = Array.isArray(criticalRows) ? criticalRows.slice() : [];
    var totalAll = all.length;
    var end = rangeEndDate ? String(rangeEndDate).slice(0, 10) : null;
    var start = rangeStartDate ? String(rangeStartDate).slice(0, 10) : null;

    all.forEach(function (r) {
      var d = resolveCriticalRowDate(r);
      if (!d) return;
      if (!end || compareIsoDates(d, end) > 0) end = d;
      if (!start || compareIsoDates(d, start) < 0) start = d;
    });

    if (!end) {
      return { rows: [], totalAll: totalAll, windowStart: null, windowEnd: null, rangeTruncated: false };
    }

    var windowEnd = end;
    var windowStart = addDaysIso(windowEnd, -(CRITICAL_DISPLAY_DAYS - 1));
    if (start && compareIsoDates(windowStart, start) < 0) windowStart = start;

    var rows = all.filter(function (r) {
      var d = resolveCriticalRowDate(r);
      if (!d) return false;
      return compareIsoDates(d, windowStart) >= 0 && compareIsoDates(d, windowEnd) <= 0;
    });

    return {
      rows: rows,
      totalAll: totalAll,
      windowStart: windowStart,
      windowEnd: windowEnd,
      rangeTruncated: start && end ? isoDateSpanInclusiveDays(start, end) > CRITICAL_DISPLAY_DAYS : false
    };
  }

  function buildCriticalScopeNoteHtml(prep) {
    if (!prep || !prep.windowStart || !prep.windowEnd) return '';
    var shown = prep.rows ? prep.rows.length : 0;
    var msg =
      'Solo se pueden listar <strong>' +
      getCriticalDisplayLabel() +
      '</strong> de horas críticas. Mostrando <strong>' +
      shown +
      '</strong> hora(s) del <strong>' +
      prep.windowStart +
      '</strong> al <strong>' +
      prep.windowEnd +
      '</strong>.';
    if (prep.rangeTruncated && prep.totalAll > shown) {
      msg +=
        ' Total en el rango descargado: <strong>' +
        prep.totalAll +
        '</strong>. Acota fechas para otro tramo.';
    }
    return msg;
  }

  function mapSummaryChartItems(summaryRows) {
    return (summaryRows || []).map(function (r) {
      var low = Number(r.hoursLow) || 0;
      var optimal = Number(r.hoursOptimal) || 0;
      var high = Number(r.hoursHigh) || 0;
      var total = low + optimal + high;
      if (total <= 0) total = 24;
      var period = String(r.period || '—');
      var label = period.length >= 10 ? period.slice(5, 10) : period;
      return {
        label: label,
        period: period,
        low: low,
        optimal: optimal,
        high: high,
        total: total,
        maxVpd: Number(r.maxVpd),
        maxAt: r.maxAt || '—',
        minVpd: Number(r.minVpd),
        minAt: r.minAt || '—',
        stressPct: r.stressPct
      };
    });
  }

  function sliceSummaryForDisplay(summaryRows, maxBars) {
    var items = mapSummaryChartItems(summaryRows);
    if (!maxBars || items.length <= maxBars) return items;
    return items.slice(items.length - maxBars);
  }

  function rangeStackedDatasets(items) {
    return [
      {
        label: 'VPD bajo (<0.5 kPa)',
        data: items.map(function (i) {
          return i.low;
        }),
        backgroundColor: 'rgba(29, 78, 216, 0.85)',
        borderColor: '#1d4ed8',
        borderWidth: 1,
        stack: 'day24'
      },
      {
        label: 'VPD óptimo (0.5–1.5 kPa)',
        data: items.map(function (i) {
          return i.optimal;
        }),
        backgroundColor: 'rgba(22, 163, 74, 0.85)',
        borderColor: '#16a34a',
        borderWidth: 1,
        stack: 'day24'
      },
      {
        label: 'VPD alto (>1.5 kPa)',
        data: items.map(function (i) {
          return i.high;
        }),
        backgroundColor: 'rgba(127, 29, 29, 0.88)',
        borderColor: '#7f1d1d',
        borderWidth: 1,
        stack: 'day24'
      }
    ];
  }

  function rangeChartTooltipCallbacks(metaItems) {
    return {
      callbacks: {
        title: function (items) {
          var idx = items[0] && items[0].dataIndex;
          return idx != null && metaItems[idx] ? metaItems[idx].period : '';
        },
        label: function (ctx) {
          var row = metaItems[ctx.dataIndex];
          var h = ctx.raw;
          var pct = row && row.total > 0 ? Math.round((h / row.total) * 100) : 0;
          return ctx.dataset.label + ': ' + h + ' h (' + pct + '% del día)';
        },
        afterBody: function (items) {
          var idx = items[0] && items[0].dataIndex;
          var row = idx != null ? metaItems[idx] : null;
          if (!row) return [];
          return [
            'VPD máx: ' +
              (Number.isFinite(row.maxVpd) ? row.maxVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.maxAt,
            'VPD mín: ' +
              (Number.isFinite(row.minVpd) ? row.minVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.minAt,
            'Horas contadas: ' + row.total + ' / 24'
          ];
        }
      }
    };
  }

  function vpdRangeBarFooterPlugin(metaItems) {
    return {
      id: 'npVpdRangeBarFooter',
      afterDatasetsDraw: function (chart) {
        var ctx = chart.ctx;
        var meta = chart.getDatasetMeta(2);
        if (!meta || !meta.data) return;
        ctx.save();
        ctx.fillStyle = '#7c2d12';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        meta.data.forEach(function (bar, index) {
          var row = metaItems[index];
          if (!row || !bar) return;
          var y = chart.chartArea.bottom + 12;
          var maxTxt =
            '↑' +
            (Number.isFinite(row.maxVpd) ? row.maxVpd.toFixed(1) : '—') +
            '@' +
            String(row.maxAt).slice(-5);
          var minTxt =
            '↓' +
            (Number.isFinite(row.minVpd) ? row.minVpd.toFixed(1) : '—') +
            '@' +
            String(row.minAt).slice(-5);
          ctx.fillText(maxTxt, bar.x, y);
          ctx.fillText(minTxt, bar.x, y + 9);
        });
        ctx.restore();
      }
    };
  }

  function createRangeStackedChart(canvas, summaryRows, opts) {
    if (!canvas || !w.Chart || !summaryRows || !summaryRows.length) return null;
    opts = opts || {};
    var items = sliceSummaryForDisplay(summaryRows, opts.maxBars);
    if (!items.length) return null;
    var title =
      opts.title ||
      'Distribución horaria VPD por periodo (100% ≈ 24 h · azul <0.5 · verde óptimo · tinto >1.5)';
    return new w.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: items.map(function (i) {
          return i.label;
        }),
        datasets: rangeStackedDatasets(items)
      },
      plugins: [opts.showBarFooters ? vpdRangeBarFooterPlugin(items, true) : null].filter(Boolean),
      options: {
        responsive: opts.responsive !== false,
        maintainAspectRatio: opts.maintainAspectRatio !== false,
        animation: opts.animation !== false,
        layout: opts.showBarFooters ? { padding: { bottom: 22 } } : {},
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 10, font: { size: opts.legendFontSize || 11 } }
          },
          title: {
            display: true,
            text: title,
            font: { size: opts.titleFontSize || 12, weight: '600' },
            color: '#7c2d12'
          },
          tooltip: rangeChartTooltipCallbacks(items)
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: 'Periodo', font: { size: 10 } },
            ticks: { maxRotation: 45, minRotation: 0, font: { size: 9 } }
          },
          y: {
            stacked: true,
            min: 0,
            max: 24,
            title: { display: true, text: 'Horas del día', font: { size: 10 } },
            ticks: { stepSize: 4, font: { size: 9 } }
          }
        }
      }
    });
  }

  function aggregateCriticalByDay(rows, windowStart, windowEnd) {
    var map = {};
    (rows || []).forEach(function (r) {
      var d = resolveCriticalRowDate(r);
      if (!d) return;
      if (!map[d]) map[d] = { high: 0, low: 0 };
      if (r.type === 'high' || Number(r.vpd) > 1.5) map[d].high++;
      else map[d].low++;
    });
    var labels = [];
    var highData = [];
    var lowData = [];
    if (windowStart && windowEnd) {
      var cur = windowStart;
      while (compareIsoDates(cur, windowEnd) <= 0) {
        labels.push(cur.slice(5));
        var bucket = map[cur] || { high: 0, low: 0 };
        highData.push(bucket.high);
        lowData.push(bucket.low);
        if (cur === windowEnd) break;
        cur = addDaysIso(cur, 1);
      }
    }
    return { labels: labels, highData: highData, lowData: lowData };
  }

  function createCriticalHoursChart(canvas, rows, prep, opts) {
    if (!canvas || !w.Chart || !rows || !rows.length) return null;
    opts = opts || {};
    var agg = aggregateCriticalByDay(rows, prep && prep.windowStart, prep && prep.windowEnd);
    if (!agg.labels.length) return null;
    var title =
      'Horas críticas por día · ' +
      getCriticalDisplayLabel() +
      (prep && prep.windowStart && prep.windowEnd
        ? ' (' + prep.windowStart + ' a ' + prep.windowEnd + ')'
        : '');
    return new w.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: agg.labels,
        datasets: [
          {
            label: 'VPD bajo (<0.5 kPa)',
            data: agg.lowData,
            backgroundColor: 'rgba(29, 78, 216, 0.75)',
            borderColor: '#1d4ed8',
            borderWidth: 1,
            stack: 'crit'
          },
          {
            label: 'VPD alto (>1.5 kPa)',
            data: agg.highData,
            backgroundColor: 'rgba(127, 29, 29, 0.78)',
            borderColor: '#7f1d1d',
            borderWidth: 1,
            stack: 'crit'
          }
        ]
      },
      options: {
        responsive: opts.responsive !== false,
        maintainAspectRatio: opts.maintainAspectRatio !== false,
        animation: opts.animation !== false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 10, font: { size: opts.legendFontSize || 11 } }
          },
          title: {
            display: true,
            text: title,
            font: { size: opts.titleFontSize || 12, weight: '600' },
            color: '#7c2d12'
          }
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: 'Día', font: { size: 10 } },
            ticks: { maxRotation: 45, font: { size: 9 } }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Horas críticas / día', font: { size: 10 } },
            ticks: { precision: 0, font: { size: 9 } }
          }
        }
      }
    });
  }

  function loadChartJs(cb) {
    if (w.Chart) {
      cb();
      return;
    }
    if (typeof w.loadChartJsForReport === 'function') {
      w.loadChartJsForReport(cb);
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  function chartToDataUrl(renderFn, width, height) {
    return new Promise(function (resolve) {
      loadChartJs(function () {
        if (!w.Chart) {
          resolve(null);
          return;
        }
        var canvas = document.createElement('canvas');
        canvas.width = width || 720;
        canvas.height = height || 300;
        canvas.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(canvas);
        var chart = null;
        var url = null;
        try {
          chart = renderFn(canvas);
          url = chart && chart.toBase64Image ? chart.toBase64Image() : canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('NpVpdRangeCharts chartToDataUrl:', e);
        } finally {
          if (chart) {
            try {
              chart.destroy();
            } catch (e2) {}
          }
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }
        resolve(url);
      });
    });
  }

  function getReportChartUrls(summaryRows, criticalRows, meta) {
    var prep = prepareCriticalRowsForDisplay(
      criticalRows,
      meta && meta.endDate,
      meta && meta.startDate
    );
    var rangeRows = summaryRows;
    var rangeNote = '';
    if (Array.isArray(summaryRows) && summaryRows.length > RANGE_CHART_PDF_MAX_BARS) {
      rangeRows = summaryRows.slice(summaryRows.length - RANGE_CHART_PDF_MAX_BARS);
      rangeNote = 'last' + RANGE_CHART_PDF_MAX_BARS;
    }
    return Promise.all([
      chartToDataUrl(function (canvas) {
        return createRangeStackedChart(canvas, rangeRows, {
          responsive: false,
          maintainAspectRatio: false,
          animation: false,
          showBarFooters: true,
          legendFontSize: 10,
          titleFontSize: 11,
          maxBars: RANGE_CHART_PDF_MAX_BARS
        });
      }, 720, 320),
      prep.rows.length
        ? chartToDataUrl(function (canvas) {
            return createCriticalHoursChart(canvas, prep.rows, prep, {
              responsive: false,
              maintainAspectRatio: false,
              animation: false,
              legendFontSize: 10,
              titleFontSize: 11
            });
          }, 720, 280)
        : Promise.resolve(null)
    ]).then(function (urls) {
      return { vpdRange: urls[0], vpdCritical: urls[1], criticalPrep: prep, rangeNote: rangeNote };
    });
  }

  function bindViewToggle(graphBtn, tableBtn, graphPanel, tablePanel, onShowGraph, onShowTable) {
    if (!graphBtn || !tableBtn || !graphPanel || !tablePanel) return;
    function setActive(view) {
      var isGraph = view === 'graph';
      graphPanel.style.display = isGraph ? 'block' : 'none';
      tablePanel.style.display = isGraph ? 'none' : 'block';
      graphBtn.style.fontWeight = isGraph ? '700' : '600';
      graphBtn.style.background = isGraph ? '#ffedd5' : '#fff7ed';
      tableBtn.style.fontWeight = isGraph ? '600' : '700';
      tableBtn.style.background = isGraph ? '#fff7ed' : '#ffedd5';
      if (isGraph && onShowGraph) onShowGraph();
      if (!isGraph && onShowTable) onShowTable();
    }
    graphBtn.addEventListener('click', function () {
      setActive('graph');
    });
    tableBtn.addEventListener('click', function () {
      setActive('table');
    });
    setActive('graph');
  }

  function viewToggleButtonsHtml(prefix) {
    return (
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      '<button type="button" id="' +
      prefix +
      '-view-graph" style="padding:6px 12px;font-size:12px;font-weight:700;border-radius:8px;border:1px solid #fdba74;background:#ffedd5;color:#9a3412;cursor:pointer;">📈 Gráfica</button>' +
      '<button type="button" id="' +
      prefix +
      '-view-table" style="padding:6px 12px;font-size:12px;font-weight:600;border-radius:8px;border:1px solid #fdba74;background:#fff7ed;color:#9a3412;cursor:pointer;">📋 Tabla</button>' +
      '</div>'
    );
  }

  function initInteractiveBlock(cfg) {
    cfg = cfg || {};
    var charts = { range: null, critical: null };
    var summaryRows = cfg.summaryRows || [];
    var criticalRows = cfg.criticalRows || [];
    var meta = cfg.meta || {};
    var prep = prepareCriticalRowsForDisplay(criticalRows, meta.endDate, meta.startDate);

    bindViewToggle(
      document.getElementById(cfg.prefix + '-summary-view-graph'),
      document.getElementById(cfg.prefix + '-summary-view-table'),
      document.getElementById(cfg.prefix + '-summary-graph'),
      document.getElementById(cfg.prefix + '-summary-table'),
      function () {
        loadChartJs(function () {
          if (charts.range) {
            try {
              charts.range.destroy();
            } catch (e) {}
          }
          var canvas = document.getElementById(cfg.prefix + '-summary-canvas');
          var scroll = document.getElementById(cfg.prefix + '-summary-scroll');
          if (scroll && summaryRows.length) {
            scroll.style.minWidth = Math.max(320, summaryRows.length * 26) + 'px';
          }
          if (canvas) {
            charts.range = createRangeStackedChart(canvas, summaryRows, {
              responsive: true,
              maintainAspectRatio: false,
              animation: true
            });
          }
        });
      }
    );

    bindViewToggle(
      document.getElementById(cfg.prefix + '-critical-view-graph'),
      document.getElementById(cfg.prefix + '-critical-view-table'),
      document.getElementById(cfg.prefix + '-critical-graph'),
      document.getElementById(cfg.prefix + '-critical-table'),
      function () {
        loadChartJs(function () {
          if (charts.critical) {
            try {
              charts.critical.destroy();
            } catch (e) {}
          }
          var canvas = document.getElementById(cfg.prefix + '-critical-canvas');
          if (canvas && prep.rows.length) {
            charts.critical = createCriticalHoursChart(canvas, prep.rows, prep, {
              responsive: true,
              maintainAspectRatio: false,
              animation: true
            });
          }
        });
      }
    );

    return { prep: prep, charts: charts };
  }

  function buildInteractiveBlockShell(cfg) {
    cfg = cfg || {};
    var prefix = cfg.prefix || 'np-vpd';
    var critPrep = cfg.criticalPrep || { rows: [], windowStart: null, windowEnd: null };
    var critCount = critPrep.rows ? critPrep.rows.length : 0;
    var toggle = viewToggleButtonsHtml(prefix + '-summary');
    var critToggle = viewToggleButtonsHtml(prefix + '-critical');
    return (
      '<div style="margin-top:10px;border-top:1px dashed #fed7aa;padding-top:10px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">' +
      '<strong style="color:#9a3412;font-size:13px;">Serie VPD por periodo (' +
      (cfg.summaryCount || 0) +
      ')</strong>' +
      toggle.replace(prefix + '-summary', prefix + '-summary') +
      '</div>' +
      '<div style="font-size:11px;color:#7c2d12;line-height:1.45;background:#fff7ed;border:1px dashed #fdba74;border-radius:6px;padding:6px 8px;margin-bottom:8px;">' +
      'Cada barra = <strong>24 h</strong> apiladas: azul &lt;0.5 kPa · verde 0.5–1.5 · tinto &gt;1.5. Tooltip / pie de barra: VPD máx/mín y hora.' +
      '</div>' +
      '<div id="' +
      prefix +
      '-summary-graph" style="display:block;">' +
      '<div id="' +
      prefix +
      '-summary-scroll" style="overflow-x:auto;overflow-y:hidden;height:280px;">' +
      '<div style="height:260px;min-width:320px;">' +
      '<canvas id="' +
      prefix +
      '-summary-canvas"></canvas></div></div></div>' +
      '<div id="' +
      prefix +
      '-summary-table" style="display:none;overflow:auto;max-height:300px;">' +
      (cfg.summaryTableHtml || '') +
      '</div></div>' +
      '<div style="margin-top:10px;border-top:1px dashed #fed7aa;padding-top:10px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">' +
      '<strong style="color:#9a3412;font-size:13px;">Horas críticas (' +
      critCount +
      ') · ' +
      getCriticalDisplayLabel() +
      '</strong>' +
      critToggle.replace(prefix + '-critical', prefix + '-critical') +
      '</div>' +
      (critPrep.windowStart
        ? '<div style="margin-bottom:6px;font-size:11px;color:#7c2d12;line-height:1.45;background:#fff7ed;border:1px dashed #fdba74;border-radius:6px;padding:6px 8px;">' +
          buildCriticalScopeNoteHtml(critPrep) +
          '</div>'
        : '') +
      '<div id="' +
      prefix +
      '-critical-graph" style="display:block;height:260px;">' +
      '<canvas id="' +
      prefix +
      '-critical-canvas"></canvas></div>' +
      '<div id="' +
      prefix +
      '-critical-table" style="display:none;overflow:auto;max-height:260px;">' +
      (cfg.criticalTableHtml || '') +
      '</div></div>'
    );
  }

  w.NpVpdRangeCharts = {
    CRITICAL_DISPLAY_DAYS: CRITICAL_DISPLAY_DAYS,
    RANGE_CHART_PDF_MAX_BARS: RANGE_CHART_PDF_MAX_BARS,
    getCriticalDisplayLabel: getCriticalDisplayLabel,
    prepareCriticalRowsForDisplay: prepareCriticalRowsForDisplay,
    buildCriticalScopeNoteHtml: buildCriticalScopeNoteHtml,
    createRangeStackedChart: createRangeStackedChart,
    createCriticalHoursChart: createCriticalHoursChart,
    getReportChartUrls: getReportChartUrls,
    viewToggleButtonsHtml: viewToggleButtonsHtml,
    buildInteractiveBlockShell: buildInteractiveBlockShell,
    initInteractiveBlock: initInteractiveBlock,
    loadChartJs: loadChartJs
  };
})(window);
