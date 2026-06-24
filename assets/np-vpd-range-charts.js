/**
 * NutriPlant — gráficas VPD por rango (24 h apiladas) y horas críticas.
 * Dashboard, PDF y admin.
 */
(function (w) {
  'use strict';

  var CRITICAL_DISPLAY_DAYS = 30;
  var RANGE_CHART_PDF_MAX_BARS = 31;
  /** Barras visibles en gráfica de rangos (dashboard/admin); el resto en Tabla. */
  var RANGE_CHART_DASHBOARD_MAX_BARS = 31;
  /** Ancho útil A4 con márgenes ~2 cm — misma base dashboard + PDF. */
  var CRITICAL_CHART_PAGE_WIDTH = 680;
  var CRITICAL_CHART_HEIGHT = 288;
  var CHART_BAR_PX = 20;
  var CHART_VIEWPORT_H = 228;
  var CHART_INNER_H = 200;

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
    var dataStart = null;
    var dataEnd = null;

    all.forEach(function (r) {
      var d = resolveCriticalRowDate(r);
      if (!d) return;
      if (!dataEnd || compareIsoDates(d, dataEnd) > 0) dataEnd = d;
      if (!dataStart || compareIsoDates(d, dataStart) < 0) dataStart = d;
    });

    var rangeStart = rangeStartDate ? String(rangeStartDate).slice(0, 10) : dataStart;
    var rangeEnd = rangeEndDate ? String(rangeEndDate).slice(0, 10) : dataEnd;

    if (!rangeStart && !rangeEnd) {
      return {
        rows: [],
        totalAll: totalAll,
        windowStart: null,
        windowEnd: null,
        rangeStart: null,
        rangeEnd: null,
        rangeTruncated: false
      };
    }

    var windowStart = rangeStart || rangeEnd;
    var windowEnd = addDaysIso(windowStart, CRITICAL_DISPLAY_DAYS - 1);
    if (rangeEnd && compareIsoDates(windowEnd, rangeEnd) > 0) {
      windowEnd = rangeEnd;
    }

    var rows = all.filter(function (r) {
      var d = resolveCriticalRowDate(r);
      if (!d) return false;
      return compareIsoDates(d, windowStart) >= 0 && compareIsoDates(d, windowEnd) <= 0;
    });

    var fullSpan =
      rangeStart && rangeEnd ? isoDateSpanInclusiveDays(rangeStart, rangeEnd) : 0;

    return {
      rows: rows,
      totalAll: totalAll,
      windowStart: windowStart,
      windowEnd: windowEnd,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      rangeTruncated: fullSpan > CRITICAL_DISPLAY_DAYS
    };
  }

  function buildCriticalScopeNoteHtml(prep) {
    if (!prep || !prep.windowStart || !prep.windowEnd) return '';
    var shown = prep.rows ? prep.rows.length : 0;
    var periodStart = prep.rangeStart || prep.windowStart;
    var msg =
      'Desde el <strong>inicio del periodo que elegiste</strong> (<strong>' +
      periodStart +
      '</strong>) se listan hasta <strong>' +
      CRITICAL_DISPLAY_DAYS +
      ' días</strong> de horas críticas (<strong>' +
      prep.windowStart +
      '</strong> al <strong>' +
      prep.windowEnd +
      '</strong>). En ese tramo: <strong>' +
      shown +
      '</strong> hora(s).';
    if (prep.rangeTruncated && prep.rangeEnd) {
      msg +=
        ' El rango completo descargado en Clima (' +
        periodStart +
        ' a <strong>' +
        prep.rangeEnd +
        '</strong>) tiene <strong>' +
        prep.totalAll +
        '</strong> horas críticas. Acota fechas para ver otro tramo de 30 días.';
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
    if (!maxBars || items.length <= maxBars) {
      return {
        items: items,
        truncated: false,
        totalPeriods: items.length,
        fromPeriod: items.length ? items[0].period : null,
        toPeriod: items.length ? items[items.length - 1].period : null
      };
    }
    var sliced = items.slice(items.length - maxBars);
    return {
      items: sliced,
      truncated: true,
      totalPeriods: items.length,
      fromPeriod: sliced.length ? sliced[0].period : null,
      toPeriod: sliced.length ? sliced[sliced.length - 1].period : null
    };
  }

  function sizeChartInner(innerEl, barCount) {
    if (!innerEl) return;
    var w = Math.max(260, barCount * CHART_BAR_PX);
    innerEl.style.width = w + 'px';
    innerEl.style.minWidth = w + 'px';
    innerEl.style.height = CHART_INNER_H + 'px';
  }

  function computeCriticalChartLayout(barCount) {
    barCount = Math.max(1, Number(barCount) || CRITICAL_DISPLAY_DAYS);
    var canvasWidth = CRITICAL_CHART_PAGE_WIDTH;
    var canvasHeight = CRITICAL_CHART_HEIGHT;
    var plotPad = 52;
    var barSlotPx = (canvasWidth - plotPad) / barCount;
    return {
      barCount: barCount,
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
      barSlotPx: barSlotPx
    };
  }

  function applyCriticalChartLayout(innerEl, canvasEl, layout) {
    if (!layout) return;
    if (innerEl) {
      innerEl.style.width = layout.canvasWidth + 'px';
      innerEl.style.minWidth = layout.canvasWidth + 'px';
      innerEl.style.maxWidth = layout.canvasWidth + 'px';
      innerEl.style.height = layout.canvasHeight + 'px';
    }
    if (canvasEl) {
      canvasEl.width = layout.canvasWidth;
      canvasEl.height = layout.canvasHeight;
      canvasEl.style.width = layout.canvasWidth + 'px';
      canvasEl.style.height = layout.canvasHeight + 'px';
    }
  }

  function chartViewportHtml(prefix, kind) {
    return (
      '<div class="np-vpd-chart-viewport" style="max-height:' +
      CHART_VIEWPORT_H +
      'px;overflow-x:auto;overflow-y:hidden;border:1px solid #fed7aa;border-radius:8px;background:#fff;padding:4px 6px;">' +
      '<div data-np-chart-inner="' +
      kind +
      '" style="height:' +
      CHART_INNER_H +
      'px;min-width:260px;position:relative;">' +
      '<canvas id="' +
      prefix +
      '-' +
      kind +
      '-canvas"></canvas></div></div>'
    );
  }

  function criticalChartViewportHtml(prefix, layout) {
    layout = layout || computeCriticalChartLayout(CRITICAL_DISPLAY_DAYS);
    return (
      '<div class="np-vpd-critical-chart-viewport" style="width:100%;max-width:' +
      layout.canvasWidth +
      'px;margin:0 auto;border:1px solid #fed7aa;border-radius:8px;background:#fff;padding:4px 6px;box-sizing:border-box;">' +
      '<div data-np-chart-inner="critical" style="width:' +
      layout.canvasWidth +
      'px;height:' +
      layout.canvasHeight +
      'px;position:relative;margin:0 auto;">' +
      '<canvas id="' +
      prefix +
      '-critical-canvas" width="' +
      layout.canvasWidth +
      '" height="' +
      layout.canvasHeight +
      '"></canvas></div></div>'
    );
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

  /** Barras tenues 24 h + líneas VPD máx/mín (eje derecho) en gráfica horas críticas. */
  function criticalHoursChartDatasets(items, vpdAxisMax) {
    var bars = [
      {
        type: 'bar',
        label: 'Horas VPD bajo',
        yAxisID: 'y',
        data: items.map(function (i) {
          return i.low;
        }),
        backgroundColor: 'rgba(29, 78, 216, 0.26)',
        borderColor: 'rgba(29, 78, 216, 0.42)',
        borderWidth: 1,
        stack: 'day24',
        order: 3
      },
      {
        type: 'bar',
        label: 'Horas VPD óptimo',
        yAxisID: 'y',
        data: items.map(function (i) {
          return i.optimal;
        }),
        backgroundColor: 'rgba(22, 163, 74, 0.18)',
        borderColor: 'rgba(22, 163, 74, 0.35)',
        borderWidth: 1,
        stack: 'day24',
        order: 3
      },
      {
        type: 'bar',
        label: 'Horas VPD alto',
        yAxisID: 'y',
        data: items.map(function (i) {
          return i.high;
        }),
        backgroundColor: 'rgba(127, 29, 29, 0.26)',
        borderColor: 'rgba(127, 29, 29, 0.44)',
        borderWidth: 1,
        stack: 'day24',
        order: 3
      }
    ];
    var lines = [
      {
        type: 'line',
        label: 'VPD mín (kPa)',
        yAxisID: 'yVpd',
        data: items.map(function (i) {
          return Number.isFinite(i.minVpd) ? i.minVpd : null;
        }),
        borderColor: '#1d4ed8',
        backgroundColor: '#1d4ed8',
        pointBackgroundColor: '#1d4ed8',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.25,
        spanGaps: false,
        fill: false,
        order: 1
      },
      {
        type: 'line',
        label: 'VPD máx (kPa)',
        yAxisID: 'yVpd',
        data: items.map(function (i) {
          return Number.isFinite(i.maxVpd) ? i.maxVpd : null;
        }),
        borderColor: '#7f1d1d',
        backgroundColor: '#7f1d1d',
        pointBackgroundColor: '#7f1d1d',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.25,
        spanGaps: false,
        fill: false,
        order: 1
      }
    ];
    return bars.concat(lines);
  }

  function computeVpdAxisMax(items) {
    var maxVal = 1.5;
    (items || []).forEach(function (i) {
      if (Number.isFinite(i.maxVpd)) maxVal = Math.max(maxVal, i.maxVpd);
      if (Number.isFinite(i.minVpd)) maxVal = Math.max(maxVal, i.minVpd);
    });
    return Math.ceil(maxVal * 10) / 10 + 0.3;
  }

  function criticalChartTooltipCallbacks(metaItems) {
    return {
      callbacks: {
        title: function (items) {
          var idx = items[0] && items[0].dataIndex;
          return idx != null && metaItems[idx] ? metaItems[idx].period : '';
        },
        label: function (ctx) {
          var row = metaItems[ctx.dataIndex];
          if (!row) return '';
          var dsLabel = String(ctx.dataset.label || '');
          if (dsLabel.indexOf('VPD mín') >= 0) {
            return (
              'VPD mín: ' +
              (Number.isFinite(row.minVpd) ? row.minVpd.toFixed(2) : '—') +
              ' kPa · hora ' +
              String(row.minAt || '—')
            );
          }
          if (dsLabel.indexOf('VPD máx') >= 0) {
            return (
              'VPD máx: ' +
              (Number.isFinite(row.maxVpd) ? row.maxVpd.toFixed(2) : '—') +
              ' kPa · hora ' +
              String(row.maxAt || '—')
            );
          }
          var h = ctx.raw;
          var pct = row.total > 0 ? Math.round((h / row.total) * 100) : 0;
          return dsLabel + ': ' + h + ' h (' + pct + '% del día)';
        },
        afterBody: function (items) {
          var idx = items[0] && items[0].dataIndex;
          var row = idx != null ? metaItems[idx] : null;
          if (!row) return [];
          var lines = [
            'VPD mín: ' +
              (Number.isFinite(row.minVpd) ? row.minVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.minAt,
            'VPD máx: ' +
              (Number.isFinite(row.maxVpd) ? row.maxVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.maxAt
          ];
          if (row.total > 0) {
            lines.push(
              'Horas: bajo ' +
                row.low +
                ' + óptimo ' +
                row.optimal +
                ' + alto ' +
                row.high +
                (row.total < 24 ? ' · día incompleto' : '')
            );
          }
          return lines;
        }
      }
    };
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
            'Horas contadas: ' +
            row.total +
            ' (bajo ' +
            row.low +
            ' + óptimo ' +
            row.optimal +
            ' + alto ' +
            row.high +
            ')' +
            (row.total < 24 ? ' · día incompleto en serie' : '')
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
    var slice = sliceSummaryForDisplay(summaryRows, opts.maxBars);
    var items = slice.items;
    if (!items.length) return null;
    var title =
      opts.title ||
      ('Distribución horaria VPD · ' +
        (slice.truncated
          ? 'últimos ' + items.length + ' de ' + slice.totalPeriods + ' periodos'
          : items.length + ' periodos') +
        ' (suma bajo+óptimo+alto = horas/día)');
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

  function aggregateDailyVpdForChart(dailyRows, windowStart, windowEnd) {
    var map = {};
    (dailyRows || []).forEach(function (r) {
      var d = r.date ? String(r.date).slice(0, 10) : String(r.period || '').slice(0, 10);
      if (!d || d.length < 10) return;
      map[d] = {
        label: d.slice(5),
        period: d,
        low: Number(r.hoursLow) || 0,
        optimal: Number(r.hoursOptimal) || 0,
        high: Number(r.hoursHigh) || 0,
        maxVpd: Number(r.maxVpd),
        maxAt: r.maxAt || '—',
        minVpd: Number(r.minVpd),
        minAt: r.minAt || '—'
      };
    });
    var items = [];
    if (windowStart && windowEnd) {
      var cur = windowStart;
      while (compareIsoDates(cur, windowEnd) <= 0) {
        var bucket = map[cur] || {
          label: cur.slice(5),
          period: cur,
          low: 0,
          optimal: 0,
          high: 0,
          maxVpd: NaN,
          maxAt: '—',
          minVpd: NaN,
          minAt: '—'
        };
        bucket.total = bucket.low + bucket.optimal + bucket.high;
        items.push(bucket);
        if (cur === windowEnd) break;
        cur = addDaysIso(cur, 1);
      }
    }
    return { items: items };
  }

  function resolveDailySummaryRows(dailyRows, summaryRows, granularity) {
    if (Array.isArray(dailyRows) && dailyRows.length) return dailyRows;
    if (granularity === 'daily' && Array.isArray(summaryRows) && summaryRows.length) {
      return summaryRows;
    }
    return [];
  }

  function createCriticalHoursChart(canvas, dailyRows, prep, opts) {
    if (!canvas || !w.Chart) return null;
    opts = opts || {};
    var rows = resolveDailySummaryRows(
      dailyRows,
      opts.summaryRows,
      opts.granularity
    );
    var agg = aggregateDailyVpdForChart(rows, prep && prep.windowStart, prep && prep.windowEnd);
    if (!agg.items.length) return null;
    var layout = opts.layout || computeCriticalChartLayout(agg.items.length);
    var vpdAxisMax = computeVpdAxisMax(agg.items);
    var title =
      'Distribución VPD por día · ' +
      getCriticalDisplayLabel() +
      (prep && prep.windowStart && prep.windowEnd
        ? ' (' + prep.windowStart + ' a ' + prep.windowEnd + ')'
        : '') +
      ' · barras 24 h + VPD máx/mín';
    applyCriticalChartLayout(null, canvas, layout);
    var useResponsive = opts.responsive !== false && !opts.layout;
    return new w.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: agg.items.map(function (i) {
          return i.label;
        }),
        datasets: criticalHoursChartDatasets(agg.items, vpdAxisMax)
      },
      options: {
        responsive: useResponsive,
        maintainAspectRatio: false,
        animation: opts.animation !== false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        datasets: {
          bar: {
            categoryPercentage: 0.92,
            barPercentage: 0.88
          }
        },
        layout: {
          padding: { left: 2, right: 12, top: 2, bottom: 0 }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 10, font: { size: opts.legendFontSize || 10 } }
          },
          title: {
            display: true,
            text: title,
            font: { size: opts.titleFontSize || 12, weight: '600' },
            color: '#7c2d12'
          },
          tooltip: criticalChartTooltipCallbacks(agg.items)
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: 'Día', font: { size: 10 } },
            ticks: { maxRotation: 45, font: { size: 9 } }
          },
          y: {
            stacked: true,
            position: 'left',
            min: 0,
            max: 24,
            title: { display: true, text: 'Horas / día', font: { size: 10 }, color: '#7c2d12' },
            ticks: { stepSize: 4, precision: 0, font: { size: 9 }, color: '#7c2d12' },
            grid: { color: 'rgba(254, 215, 170, 0.45)' }
          },
          yVpd: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: vpdAxisMax,
            title: { display: true, text: 'VPD (kPa)', font: { size: 10 }, color: '#7c2d12' },
            ticks: {
              font: { size: 9 },
              color: '#7c2d12',
              callback: function (v) {
                return Number(v).toFixed(1);
              }
            },
            grid: { drawOnChartArea: false }
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

  function getReportChartUrls(summaryRows, criticalRows, meta, dailySummaryRows) {
    var prep = prepareCriticalRowsForDisplay(
      criticalRows,
      meta && meta.endDate,
      meta && meta.startDate
    );
    if (!prep.windowStart || !prep.windowEnd) {
      return Promise.resolve({ vpdCritical: null, criticalPrep: prep });
    }
    var rows = resolveDailySummaryRows(
      dailySummaryRows,
      summaryRows,
      meta && meta.granularity
    );
    var agg = aggregateDailyVpdForChart(rows, prep.windowStart, prep.windowEnd);
    if (!agg.items.length || !agg.items.some(function (i) { return i.total > 0; })) {
      return Promise.resolve({ vpdCritical: null, criticalPrep: prep });
    }
    var layout = computeCriticalChartLayout(agg.items.length);
    return chartToDataUrl(function (canvas) {
      return createCriticalHoursChart(canvas, rows, prep, {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        legendFontSize: 10,
        titleFontSize: 11,
        summaryRows: summaryRows,
        granularity: meta && meta.granularity,
        layout: layout
      });
    }, layout.canvasWidth, layout.canvasHeight).then(function (url) {
      return { vpdCritical: url, criticalPrep: prep };
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
    var charts = { critical: null };
    var criticalRows = cfg.criticalRows || [];
    var meta = cfg.meta || {};
    var prep = prepareCriticalRowsForDisplay(criticalRows, meta.endDate, meta.startDate);

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
          var viewport = document.getElementById(cfg.prefix + '-critical-graph');
          var inner =
            viewport && viewport.querySelector('[data-np-chart-inner="critical"]');
          var days =
            prep.windowStart && prep.windowEnd
              ? isoDateSpanInclusiveDays(prep.windowStart, prep.windowEnd)
              : CRITICAL_DISPLAY_DAYS;
          var layout = computeCriticalChartLayout(days);
          applyCriticalChartLayout(inner, canvas, layout);
          if (canvas && prep.windowStart) {
            charts.critical = createCriticalHoursChart(canvas, cfg.dailySummaryRows || [], prep, {
              responsive: false,
              maintainAspectRatio: false,
              animation: true,
              summaryRows: cfg.summaryRows,
              granularity: meta.granularity,
              layout: layout
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
    var critToggle = viewToggleButtonsHtml(prefix + '-critical');
    var granularityNote =
      cfg.granularity === 'weekly'
        ? 'Vista semanal: máximos y mínimos por semana.'
        : cfg.granularity === 'monthly'
          ? 'Vista mensual: máximos y mínimos por mes.'
          : 'Vista diaria: resumen por día.';
    var critTitle =
      'Horas críticas (' +
      critCount +
      ') · ' +
      getCriticalDisplayLabel() +
      (critPrep.windowStart && critPrep.windowEnd
        ? ' · ' + critPrep.windowStart + ' a ' + critPrep.windowEnd
        : '');
    var critDays =
      critPrep.windowStart && critPrep.windowEnd
        ? isoDateSpanInclusiveDays(critPrep.windowStart, critPrep.windowEnd)
        : CRITICAL_DISPLAY_DAYS;
    var critLayout = computeCriticalChartLayout(critDays);
    return (
      '<div style="margin-top:10px;border-top:1px dashed #fed7aa;padding-top:10px;">' +
      '<div style="margin-bottom:8px;"><strong style="color:#9a3412;font-size:13px;">Serie VPD por periodo (' +
      (cfg.summaryCount || 0) +
      ')</strong></div>' +
      '<div style="font-size:11px;color:#7c2d12;line-height:1.45;background:#fff7ed;border:1px dashed #fdba74;border-radius:6px;padding:6px 8px;margin-bottom:8px;">' +
      granularityNote +
      ' Tabla con VPD máx/mín, horas por zona y % estrés.' +
      '</div>' +
      '<div style="overflow:auto;max-height:240px;">' +
      (cfg.summaryTableHtml || '') +
      '</div></div>' +
      '<div style="margin-top:10px;border-top:1px dashed #fed7aa;padding-top:10px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">' +
      '<strong style="color:#9a3412;font-size:13px;">' +
      critTitle +
      '</strong>' +
      critToggle +
      '</div>' +
      (critPrep.windowStart
        ? '<div style="margin-bottom:6px;font-size:11px;color:#7c2d12;line-height:1.45;background:#fff7ed;border:1px dashed #fdba74;border-radius:6px;padding:6px 8px;">' +
          buildCriticalScopeNoteHtml(critPrep) +
          ' Gráfica: barras tenues = 24 h/día por zona VPD · línea <strong>azul</strong> = VPD mín + hora · línea <strong>tinta</strong> = VPD máx + hora (eje derecho). Tabla: solo horas fuera de rango.</div>'
        : '') +
      '<div id="' +
      prefix +
      '-critical-graph" style="display:block;">' +
      criticalChartViewportHtml(prefix, critLayout) +
      '</div>' +
      '<div id="' +
      prefix +
      '-critical-table" style="display:none;overflow:auto;max-height:240px;">' +
      (cfg.criticalTableHtml || '') +
      '</div></div>'
    );
  }

  w.NpVpdRangeCharts = {
    CRITICAL_DISPLAY_DAYS: CRITICAL_DISPLAY_DAYS,
    CRITICAL_CHART_PAGE_WIDTH: CRITICAL_CHART_PAGE_WIDTH,
    CRITICAL_CHART_HEIGHT: CRITICAL_CHART_HEIGHT,
    RANGE_CHART_PDF_MAX_BARS: RANGE_CHART_PDF_MAX_BARS,
    RANGE_CHART_DASHBOARD_MAX_BARS: RANGE_CHART_DASHBOARD_MAX_BARS,
    getCriticalDisplayLabel: getCriticalDisplayLabel,
    prepareCriticalRowsForDisplay: prepareCriticalRowsForDisplay,
    buildCriticalScopeNoteHtml: buildCriticalScopeNoteHtml,
    computeCriticalChartLayout: computeCriticalChartLayout,
    createRangeStackedChart: createRangeStackedChart,
    createCriticalHoursChart: createCriticalHoursChart,
    getReportChartUrls: getReportChartUrls,
    viewToggleButtonsHtml: viewToggleButtonsHtml,
    buildInteractiveBlockShell: buildInteractiveBlockShell,
    initInteractiveBlock: initInteractiveBlock,
    loadChartJs: loadChartJs
  };
})(window);
