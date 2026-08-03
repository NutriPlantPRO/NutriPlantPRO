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
  /** Ancho útil A4 con márgenes ~2 cm — solo PDF. */
  var CRITICAL_CHART_PAGE_WIDTH = 680;
  var CRITICAL_CHART_PAGE_HEIGHT = 288;
  /** Dashboard: ocupa el ancho del bloque de resultados. */
  var CRITICAL_CHART_DASHBOARD_HEIGHT = 320;
  var CRITICAL_CHART_DASHBOARD_MIN_WIDTH = 680;
  var CRITICAL_CHART_DASHBOARD_MAX_WIDTH = 1280;
  var CHART_BAR_PX = 20;
  var CHART_VIEWPORT_H = 228;
  var CHART_INNER_H = 200;

  function chartT(es, en) {
    if (w.NpWaterClimateUI && typeof w.NpWaterClimateUI.t === 'function') {
      return w.NpWaterClimateUI.t(es, en);
    }
    try {
      var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : null;
      if (p && p.language === 'en') return en || es;
    } catch (e) {}
    return es;
  }

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
    return chartT('1 mes (' + CRITICAL_DISPLAY_DAYS + ' días)', '1 month (' + CRITICAL_DISPLAY_DAYS + ' days)');
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
    var msg = chartT(
      'Desde el <strong>inicio del periodo que elegiste</strong> (<strong>{start}</strong>) se listan hasta <strong>{days} días</strong> de horas críticas (<strong>{w0}</strong> al <strong>{w1}</strong>). En ese tramo: <strong>{n}</strong> hora(s).',
      'From the <strong>start of the period you chose</strong> (<strong>{start}</strong>) up to <strong>{days} days</strong> of critical hours are listed (<strong>{w0}</strong> to <strong>{w1}</strong>). In that span: <strong>{n}</strong> hour(s).'
    )
      .replace('{start}', periodStart)
      .replace('{days}', String(CRITICAL_DISPLAY_DAYS))
      .replace('{w0}', prep.windowStart)
      .replace('{w1}', prep.windowEnd)
      .replace('{n}', String(shown));
    if (prep.rangeTruncated && prep.rangeEnd) {
      msg +=
        ' ' +
        chartT(
          'El rango completo descargado en Clima ({start} a <strong>{end}</strong>) tiene <strong>{total}</strong> horas críticas. Acota fechas para ver otro tramo de 30 días.',
          'The full range downloaded in Climate ({start} to <strong>{end}</strong>) has <strong>{total}</strong> critical hours. Narrow the dates to see another 30-day window.'
        )
          .replace('{start}', periodStart)
          .replace('{end}', prep.rangeEnd)
          .replace('{total}', String(prep.totalAll));
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

  function computeCriticalChartLayout(barCount, targetWidth, targetHeight) {
    barCount = Math.max(1, Number(barCount) || CRITICAL_DISPLAY_DAYS);
    var canvasWidth = Math.floor(Number(targetWidth) || CRITICAL_CHART_PAGE_WIDTH);
    var canvasHeight = Math.floor(Number(targetHeight) || CRITICAL_CHART_PAGE_HEIGHT);
    var plotPad = 52;
    var barSlotPx = (canvasWidth - plotPad) / barCount;
    return {
      barCount: barCount,
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
      barSlotPx: barSlotPx
    };
  }

  function resolveCriticalChartTargetWidth(anchorEl) {
    var w = 0;
    var results = document.getElementById('vpd-range-results');
    if (results && results.clientWidth > 40) {
      w = results.clientWidth - 28;
    }
    if (anchorEl && anchorEl.clientWidth > 40) {
      // Preferir el ancho real del bloque (sin forzar más ancho del que ya tiene).
      w = w > 0 ? Math.min(w, anchorEl.clientWidth - 12) : anchorEl.clientWidth - 12;
    }
    if (!w && typeof window !== 'undefined' && window.innerWidth) {
      w = Math.min(1100, Math.max(320, window.innerWidth - 300));
    }
    if (!w) w = CRITICAL_CHART_DASHBOARD_MIN_WIDTH;
    return Math.max(
      280,
      Math.min(CRITICAL_CHART_DASHBOARD_MAX_WIDTH, Math.floor(w))
    );
  }

  function measureDashboardCriticalChartLayout(barCount, anchorEl) {
    return computeCriticalChartLayout(
      barCount,
      resolveCriticalChartTargetWidth(anchorEl),
      CRITICAL_CHART_DASHBOARD_HEIGHT
    );
  }

  function applyCriticalChartLayout(innerEl, canvasEl, layout, fluid) {
    if (!layout) return;
    if (innerEl) {
      if (fluid) {
        innerEl.style.width = '100%';
        innerEl.style.minWidth = '0';
        innerEl.style.maxWidth = '100%';
      } else {
        innerEl.style.width = layout.canvasWidth + 'px';
        innerEl.style.minWidth = layout.canvasWidth + 'px';
        innerEl.style.maxWidth = layout.canvasWidth + 'px';
      }
      innerEl.style.height = layout.canvasHeight + 'px';
      innerEl.style.minHeight = layout.canvasHeight + 'px';
      innerEl.style.boxSizing = 'border-box';
    }
    if (canvasEl) {
      canvasEl.width = layout.canvasWidth;
      canvasEl.height = layout.canvasHeight;
      // Fluido: CSS al 100% del contenedor (no forzar px o la sección se alarga al pintar).
      canvasEl.style.width = fluid ? '100%' : layout.canvasWidth + 'px';
      canvasEl.style.height = layout.canvasHeight + 'px';
      canvasEl.style.maxWidth = fluid ? '100%' : '';
      canvasEl.style.display = 'block';
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

  function criticalChartViewportHtml(prefix) {
    return (
      '<div class="np-vpd-critical-chart-viewport" data-np-chart-mode="dashboard" style="width:100%;max-width:100%;min-height:' +
      CRITICAL_CHART_DASHBOARD_HEIGHT +
      'px;box-sizing:border-box;overflow:hidden;border:1px solid #fed7aa;border-radius:8px;background:#fff;padding:4px 6px;position:relative;">' +
      '<div data-np-critical-chart-status style="display:flex;align-items:center;justify-content:center;position:absolute;inset:4px 6px;z-index:2;background:#fff;color:#9a3412;font-size:12px;font-weight:600;text-align:center;padding:12px;box-sizing:border-box;">' +
      chartT('Cargando gráfica…', 'Loading chart…') +
      '</div>' +
      '<div data-np-chart-inner="critical" style="width:100%;max-width:100%;min-width:0;height:' +
      CRITICAL_CHART_DASHBOARD_HEIGHT +
      'px;min-height:' +
      CRITICAL_CHART_DASHBOARD_HEIGHT +
      'px;box-sizing:border-box;position:relative;">' +
      '<canvas id="' +
      prefix +
      '-critical-canvas" style="display:block;width:100%;height:' +
      CRITICAL_CHART_DASHBOARD_HEIGHT +
      'px;visibility:hidden;"></canvas></div></div>'
    );
  }

  function rangeStackedDatasets(items) {
    return [
      {
        label: chartT('VPD bajo (<0.5 kPa)', 'Low VPD (<0.5 kPa)'),
        data: items.map(function (i) {
          return i.low;
        }),
        backgroundColor: 'rgba(29, 78, 216, 0.85)',
        borderColor: '#1d4ed8',
        borderWidth: 1,
        stack: 'day24'
      },
      {
        label: chartT('VPD óptimo (0.5–1.5 kPa)', 'Optimal VPD (0.5–1.5 kPa)'),
        data: items.map(function (i) {
          return i.optimal;
        }),
        backgroundColor: 'rgba(22, 163, 74, 0.85)',
        borderColor: '#16a34a',
        borderWidth: 1,
        stack: 'day24'
      },
      {
        label: chartT('VPD alto (>1.5 kPa)', 'High VPD (>1.5 kPa)'),
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
        label: chartT('Horas VPD bajo', 'Low VPD hours'),
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
        label: chartT('Horas VPD óptimo', 'Optimal VPD hours'),
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
        label: chartT('Horas VPD alto', 'High VPD hours'),
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
        label: chartT('VPD mín (kPa)', 'Min VPD (kPa)'),
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
        label: chartT('VPD máx (kPa)', 'Max VPD (kPa)'),
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
          if (dsLabel.indexOf('VPD mín') >= 0 || dsLabel.indexOf('Min VPD') >= 0) {
            return (
              chartT('VPD mín:', 'Min VPD:') + ' ' +
              (Number.isFinite(row.minVpd) ? row.minVpd.toFixed(2) : '—') +
              ' kPa · ' + chartT('hora', 'time') + ' ' +
              String(row.minAt || '—')
            );
          }
          if (dsLabel.indexOf('VPD máx') >= 0 || dsLabel.indexOf('Max VPD') >= 0) {
            return (
              chartT('VPD máx:', 'Max VPD:') + ' ' +
              (Number.isFinite(row.maxVpd) ? row.maxVpd.toFixed(2) : '—') +
              ' kPa · ' + chartT('hora', 'time') + ' ' +
              String(row.maxAt || '—')
            );
          }
          var h = ctx.raw;
          var pct = row.total > 0 ? Math.round((h / row.total) * 100) : 0;
          return dsLabel + ': ' + h + ' h (' + pct + '% ' + chartT('del día', 'of the day') + ')';
        },
        afterBody: function (items) {
          var idx = items[0] && items[0].dataIndex;
          var row = idx != null ? metaItems[idx] : null;
          if (!row) return [];
          var lines = [
            chartT('VPD mín:', 'Min VPD:') + ' ' +
              (Number.isFinite(row.minVpd) ? row.minVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.minAt,
            chartT('VPD máx:', 'Max VPD:') + ' ' +
              (Number.isFinite(row.maxVpd) ? row.maxVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.maxAt
          ];
          if (row.total > 0) {
            lines.push(
              chartT('Horas:', 'Hours:') + ' ' + chartT('bajo', 'low') + ' ' +
                row.low +
                ' + ' + chartT('óptimo', 'optimal') + ' ' +
                row.optimal +
                ' + ' + chartT('alto', 'high') + ' ' +
                row.high +
                (row.total < 24 ? ' · ' + chartT('día incompleto', 'incomplete day') : '')
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
          return ctx.dataset.label + ': ' + h + ' h (' + pct + '% ' + chartT('del día', 'of the day') + ')';
        },
        afterBody: function (items) {
          var idx = items[0] && items[0].dataIndex;
          var row = idx != null ? metaItems[idx] : null;
          if (!row) return [];
          return [
            chartT('VPD máx:', 'Max VPD:') + ' ' +
              (Number.isFinite(row.maxVpd) ? row.maxVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.maxAt,
            chartT('VPD mín:', 'Min VPD:') + ' ' +
              (Number.isFinite(row.minVpd) ? row.minVpd.toFixed(2) : '—') +
              ' kPa @ ' +
              row.minAt,
            chartT('Horas contadas:', 'Hours counted:') + ' ' +
            row.total +
            ' (' + chartT('bajo', 'low') + ' ' +
            row.low +
            ' + ' + chartT('óptimo', 'optimal') + ' ' +
            row.optimal +
            ' + ' + chartT('alto', 'high') + ' ' +
            row.high +
            ')' +
            (row.total < 24 ? ' · ' + chartT('día incompleto en serie', 'incomplete day in series') : '')
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
      (chartT('Distribución horaria VPD', 'Hourly VPD distribution') +
        ' · ' +
        (slice.truncated
          ? chartT('últimos {n} de {total} periodos', 'last {n} of {total} periods')
              .replace('{n}', String(items.length))
              .replace('{total}', String(slice.totalPeriods))
          : chartT('{n} periodos', '{n} periods').replace('{n}', String(items.length))) +
        ' ' +
        chartT('(suma bajo+óptimo+alto = horas/día)', '(low+optimal+high sum = hours/day)'));
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
    if (Array.isArray(summaryRows) && summaryRows.length) {
      if (granularity === 'daily') return summaryRows;
      // Series guardadas a veces solo traen summaryRows con periodo diario (YYYY-MM-DD).
      var looksDaily = summaryRows.every(function (r) {
        var p = String((r && (r.period || r.date)) || '');
        return /^\d{4}-\d{2}-\d{2}/.test(p);
      });
      if (looksDaily) return summaryRows;
    }
    return [];
  }

  /** Fallback PDF: armar filas diarias desde horas críticas si no hay dailySummaryRows. */
  function dailyRowsFromCriticalEvents(criticalRows, windowStart, windowEnd) {
    if (!windowStart || !windowEnd) return [];
    var map = {};
    (criticalRows || []).forEach(function (r) {
      var d = resolveCriticalRowDate(r);
      if (!d) return;
      if (compareIsoDates(d, windowStart) < 0 || compareIsoDates(d, windowEnd) > 0) return;
      if (!map[d]) {
        map[d] = {
          date: d,
          period: d,
          hoursLow: 0,
          hoursOptimal: 0,
          hoursHigh: 0,
          maxVpd: -Infinity,
          minVpd: Infinity,
          maxAt: '—',
          minAt: '—'
        };
      }
      var g = map[d];
      var v = Number(r.vpd);
      var t = r.type === 'high' || (Number.isFinite(v) && v > 1.5) ? 'high' : 'low';
      if (t === 'high') g.hoursHigh += 1;
      else g.hoursLow += 1;
      if (Number.isFinite(v)) {
        if (v > g.maxVpd) {
          g.maxVpd = v;
          g.maxAt = r.at || '—';
        }
        if (v < g.minVpd) {
          g.minVpd = v;
          g.minAt = r.at || '—';
        }
      }
    });
    var out = [];
    var cur = windowStart;
    while (compareIsoDates(cur, windowEnd) <= 0) {
      var g2 = map[cur];
      if (g2) {
        var used = (g2.hoursLow || 0) + (g2.hoursHigh || 0);
        g2.hoursOptimal = Math.max(0, 24 - used);
        if (!Number.isFinite(g2.maxVpd) || g2.maxVpd === -Infinity) g2.maxVpd = null;
        if (!Number.isFinite(g2.minVpd) || g2.minVpd === Infinity) g2.minVpd = null;
        out.push(g2);
      }
      if (cur === windowEnd) break;
      cur = addDaysIso(cur, 1);
    }
    return out;
  }

  function createCriticalHoursChart(canvas, dailyRows, prep, opts) {
    if (!canvas || !w.Chart) return null;
    destroyChartOnCanvas(canvas);
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
      chartT('Distribución VPD por día', 'Daily VPD distribution') +
      ' · ' +
      getCriticalDisplayLabel() +
      (prep && prep.windowStart && prep.windowEnd
        ? ' (' + prep.windowStart + ' ' + chartT('a', 'to') + ' ' + prep.windowEnd + ')'
        : '') +
      ' · ' +
      chartT('barras 24 h + VPD máx/mín', '24 h bars + max/min VPD');
    applyCriticalChartLayout(null, canvas, layout, !!opts.fluid);
    var useResponsive = opts.responsive !== false && !opts.layout;
    var animOn = opts.animation !== false;
    var ink = opts.pdfExport ? '#334155' : '#7c2d12';
    var gridTone = opts.pdfExport ? 'rgba(148, 163, 184, 0.35)' : 'rgba(254, 215, 170, 0.45)';
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
        animation: animOn ? undefined : false,
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
          padding: { left: 2, right: 12, top: 4, bottom: 0 }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
              font: { size: opts.legendFontSize || 10 },
              color: ink
            }
          },
          title: {
            display: true,
            text: title,
            font: { size: opts.titleFontSize || 12, weight: '600' },
            color: ink
          },
          tooltip: criticalChartTooltipCallbacks(agg.items)
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: chartT('Día', 'Day'), font: { size: 10 }, color: ink },
            ticks: { maxRotation: 45, font: { size: 9 }, color: ink }
          },
          y: {
            stacked: true,
            position: 'left',
            min: 0,
            max: 24,
            title: { display: true, text: chartT('Horas / día', 'Hours / day'), font: { size: 10 }, color: ink },
            ticks: { stepSize: 4, precision: 0, font: { size: 9 }, color: ink },
            grid: { color: gridTone }
          },
          yVpd: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: vpdAxisMax,
            title: { display: true, text: 'VPD (kPa)', font: { size: 10 }, color: ink },
            ticks: {
              font: { size: 9 },
              color: ink,
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

  var chartJsWaiters = [];
  var chartJsLoading = false;
  var CHART_JS_SRC = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

  function flushChartJsWaiters(ok) {
    chartJsLoading = false;
    var list = chartJsWaiters.splice(0, chartJsWaiters.length);
    list.forEach(function (fn) {
      try {
        fn(!!ok && !!w.Chart);
      } catch (e) {}
    });
  }

  function loadChartJs(cb) {
    if (typeof cb !== 'function') cb = function () {};
    if (w.Chart) {
      cb(true);
      return;
    }
    chartJsWaiters.push(cb);
    if (chartJsLoading) return;
    chartJsLoading = true;

    var existing = document.querySelector('script[data-np-chartjs="1"]');
    if (existing) {
      var tries = 0;
      var poll = setInterval(function () {
        tries += 1;
        if (w.Chart) {
          clearInterval(poll);
          flushChartJsWaiters(true);
        } else if (tries > 200) {
          clearInterval(poll);
          flushChartJsWaiters(false);
        }
      }, 50);
      return;
    }

    var s = document.createElement('script');
    s.src = CHART_JS_SRC;
    s.async = true;
    s.setAttribute('data-np-chartjs', '1');
    s.onload = function () {
      flushChartJsWaiters(!!w.Chart);
    };
    s.onerror = function () {
      flushChartJsWaiters(false);
    };
    document.head.appendChild(s);
  }

  function setCriticalChartStatus(viewport, state) {
    if (!viewport) return;
    var status = viewport.querySelector('[data-np-critical-chart-status]');
    var canvas = viewport.querySelector('canvas');
    if (!status) return;
    if (state === 'loading') {
      status.style.display = 'flex';
      status.textContent = chartT('Cargando gráfica…', 'Loading chart…');
      if (canvas) canvas.style.visibility = 'hidden';
    } else if (state === 'error') {
      status.style.display = 'flex';
      status.textContent = chartT(
        'No se pudo cargar la gráfica. Revisa la conexión o pulsa Gráfica de nuevo.',
        'Could not load the chart. Check your connection or tap Chart again.'
      );
      if (canvas) canvas.style.visibility = 'hidden';
    } else if (state === 'empty') {
      status.style.display = 'flex';
      status.textContent = chartT(
        'Sin datos diarios para graficar en este tramo.',
        'No daily data to chart in this span.'
      );
      if (canvas) canvas.style.visibility = 'hidden';
    } else {
      status.style.display = 'none';
      status.textContent = '';
      if (canvas) canvas.style.visibility = 'visible';
    }
  }

  function resolveCriticalChartDailyRows(cfg, prep) {
    cfg = cfg || {};
    var rows = resolveDailySummaryRows(
      cfg.dailySummaryRows || [],
      cfg.summaryRows,
      (cfg.meta || {}).granularity
    );
    var agg = aggregateDailyVpdForChart(rows, prep && prep.windowStart, prep && prep.windowEnd);
    var hasSignal =
      agg.items.length &&
      agg.items.some(function (i) {
        return (i.total || 0) > 0 || Number.isFinite(i.maxVpd) || Number.isFinite(i.minVpd);
      });
    if (!hasSignal && prep && prep.windowStart && prep.windowEnd) {
      rows = dailyRowsFromCriticalEvents(
        cfg.criticalRows || [],
        prep.windowStart,
        prep.windowEnd
      );
    }
    return rows;
  }

  function whenLayoutReady(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
  }

  /** JPEG/PDF: el canvas transparente se ve negro; pintar fondo blanco antes de exportar. */
  function canvasToOpaqueDataUrl(sourceCanvas, mime, quality) {
    if (!sourceCanvas) return null;
    var tmp = document.createElement('canvas');
    tmp.width = sourceCanvas.width;
    tmp.height = sourceCanvas.height;
    var ctx = tmp.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(sourceCanvas, 0, 0);
    try {
      if (mime === 'image/png') return tmp.toDataURL('image/png');
      return tmp.toDataURL('image/jpeg', quality != null ? quality : 0.93);
    } catch (e) {
      try {
        return tmp.toDataURL('image/png');
      } catch (e2) {
        return null;
      }
    }
  }

  function chartToDataUrl(renderFn, width, height) {
    return new Promise(function (resolve) {
      loadChartJs(function () {
        if (!w.Chart) {
          resolve(null);
          return;
        }
        var W = Math.max(120, Number(width) || 720);
        var H = Math.max(80, Number(height) || 300);
        var canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        // En viewport (opacity 0): left:-9999px a veces deja el canvas en blanco al exportar.
        canvas.style.cssText =
          'position:fixed;left:0;top:0;width:' + W + 'px;height:' + H + 'px;opacity:0;pointer-events:none;z-index:-1;background:#fff;';
        document.body.appendChild(canvas);
        var chart = null;
        var url = null;
        try {
          var pre = canvas.getContext('2d');
          if (pre) {
            pre.fillStyle = '#ffffff';
            pre.fillRect(0, 0, W, H);
          }
          chart = renderFn(canvas);
          if (!chart) {
            resolve(null);
            return;
          }
          try {
            if (typeof chart.resize === 'function') chart.resize();
            if (typeof chart.update === 'function') chart.update('none');
            if (typeof chart.draw === 'function') chart.draw();
          } catch (eDraw) { /* ignore */ }
          url = canvasToOpaqueDataUrl(canvas, 'image/jpeg', 0.93);
          if (!url && chart.toBase64Image) {
            try {
              url = chart.toBase64Image('image/png');
            } catch (ePng) {
              url = null;
            }
          }
          // Data URL minúscula = canvas vacío / fallido
          if (!url || typeof url !== 'string' || url.length < 800) url = null;
        } catch (e) {
          console.warn('NpVpdRangeCharts chartToDataUrl:', e);
          url = null;
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
      rows = dailyRowsFromCriticalEvents(criticalRows, prep.windowStart, prep.windowEnd);
      agg = aggregateDailyVpdForChart(rows, prep.windowStart, prep.windowEnd);
    }
    if (!agg.items.length || !agg.items.some(function (i) { return i.total > 0; })) {
      return Promise.resolve({ vpdCritical: null, criticalPrep: prep });
    }
    var layout = computeCriticalChartLayout(
      agg.items.length,
      CRITICAL_CHART_PAGE_WIDTH,
      CRITICAL_CHART_PAGE_HEIGHT
    );
    return chartToDataUrl(function (canvas) {
      return createCriticalHoursChart(canvas, rows, prep, {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        legendFontSize: 11,
        titleFontSize: 12,
        summaryRows: summaryRows,
        granularity: meta && meta.granularity,
        layout: layout,
        pdfExport: true
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
      '-view-graph" style="padding:6px 12px;font-size:12px;font-weight:700;border-radius:8px;border:1px solid #fdba74;background:#ffedd5;color:#9a3412;cursor:pointer;">📈 ' + chartT('Gráfica', 'Chart') + '</button>' +
      '<button type="button" id="' +
      prefix +
      '-view-table" style="padding:6px 12px;font-size:12px;font-weight:600;border-radius:8px;border:1px solid #fdba74;background:#fff7ed;color:#9a3412;cursor:pointer;">📋 ' + chartT('Tabla', 'Table') + '</button>' +
      '</div>'
    );
  }

  /** Libera Chart.js ligado al canvas (evita "Canvas is already in use" tras re-init). */
  function destroyChartOnCanvas(canvas) {
    if (!canvas || !w.Chart) return;
    try {
      if (typeof w.Chart.getChart === 'function') {
        var bound = w.Chart.getChart(canvas);
        if (bound) bound.destroy();
      }
    } catch (e) {}
  }

  function paintCriticalChartInteractive(cfg, prep, charts) {
    var canvas = document.getElementById(cfg.prefix + '-critical-canvas');
    var graphPanel = document.getElementById(cfg.prefix + '-critical-graph');
    var viewport =
      graphPanel && graphPanel.querySelector('.np-vpd-critical-chart-viewport');
    var inner =
      graphPanel && graphPanel.querySelector('[data-np-chart-inner="critical"]');
    if (!canvas || !canvas.isConnected || !prep || !prep.windowStart) {
      setCriticalChartStatus(viewport, 'empty');
      return false;
    }
    if (!w.Chart) {
      setCriticalChartStatus(viewport, 'error');
      return false;
    }
    if (viewport) viewport._npCriticalPaintLock = true;
    if (charts.critical) {
      try {
        charts.critical.destroy();
      } catch (e) {}
      charts.critical = null;
    }
    destroyChartOnCanvas(canvas);
    var dailyRows = resolveCriticalChartDailyRows(cfg, prep);
    var days =
      prep.windowStart && prep.windowEnd
        ? isoDateSpanInclusiveDays(prep.windowStart, prep.windowEnd)
        : CRITICAL_DISPLAY_DAYS;
    var layout = measureDashboardCriticalChartLayout(days, viewport || graphPanel);
    applyCriticalChartLayout(inner, canvas, layout, true);
    try {
      charts.critical = createCriticalHoursChart(canvas, dailyRows, prep, {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        fluid: true,
        summaryRows: cfg.summaryRows,
        granularity: (cfg.meta || {}).granularity,
        layout: layout
      });
    } catch (err) {
      console.warn('NpVpdRangeCharts paintCriticalChartInteractive:', err);
      charts.critical = null;
    }
    if (!charts.critical) {
      setCriticalChartStatus(viewport, 'empty');
      if (viewport) {
        requestAnimationFrame(function () {
          viewport._npCriticalPaintLock = false;
        });
      }
      return false;
    }
    setCriticalChartStatus(viewport, 'ready');
    if (viewport) {
      viewport._npCriticalLastWidth = layout.canvasWidth;
      requestAnimationFrame(function () {
        viewport._npCriticalPaintLock = false;
      });
    }
    return true;
  }

  function scheduleCriticalChartPaint(cfg, prep, charts, viewport) {
    setCriticalChartStatus(viewport, 'loading');
    loadChartJs(function (ok) {
      if (!ok) {
        setCriticalChartStatus(viewport, 'error');
        return;
      }
      whenLayoutReady(function () {
        var canvas = document.getElementById(cfg.prefix + '-critical-canvas');
        if (!canvas || !canvas.isConnected) return;
        paintCriticalChartInteractive(cfg, prep, charts);
      });
    });
  }

  function initInteractiveBlock(cfg) {
    cfg = cfg || {};
    var charts = { critical: null };
    var criticalRows = cfg.criticalRows || [];
    var meta = cfg.meta || {};
    var prep = prepareCriticalRowsForDisplay(criticalRows, meta.endDate, meta.startDate);
    var prefix = cfg.prefix || 'np-vpd';
    var graphPanel = document.getElementById(prefix + '-critical-graph');
    var viewport =
      graphPanel && graphPanel.querySelector('.np-vpd-critical-chart-viewport');

    // Una sola suscripción global por prefijo (evita listeners huérfanos al re-render).
    if (w._npVpdCriticalRuntime && w._npVpdCriticalRuntime[prefix]) {
      try {
        var prev = w._npVpdCriticalRuntime[prefix];
        if (prev.ro) prev.ro.disconnect();
        if (prev.onResize) window.removeEventListener('resize', prev.onResize);
        if (prev.charts && prev.charts.critical) {
          try {
            prev.charts.critical.destroy();
          } catch (e0) {}
        }
      } catch (eClean) {}
    }
    w._npVpdCriticalRuntime = w._npVpdCriticalRuntime || {};
    destroyChartOnCanvas(document.getElementById(prefix + '-critical-canvas'));

    // Evitar listeners duplicados si init se llama varias veces (p. ej. admin rAF + timeout).
    var graphBtn = document.getElementById(prefix + '-critical-view-graph');
    var tableBtn = document.getElementById(prefix + '-critical-view-table');
    var tablePanel = document.getElementById(prefix + '-critical-table');
    if (graphBtn && graphBtn.parentNode) {
      var freshGraph = graphBtn.cloneNode(true);
      graphBtn.parentNode.replaceChild(freshGraph, graphBtn);
      graphBtn = freshGraph;
    }
    if (tableBtn && tableBtn.parentNode) {
      var freshTable = tableBtn.cloneNode(true);
      tableBtn.parentNode.replaceChild(freshTable, tableBtn);
      tableBtn = freshTable;
    }

    bindViewToggle(
      graphBtn,
      tableBtn,
      graphPanel,
      tablePanel,
      function () {
        scheduleCriticalChartPaint(cfg, prep, charts, viewport);
      }
    );

    var resultsHost = document.getElementById('vpd-range-results');
    var resizeTimer = null;
    var onResize = function () {
      if (!viewport || !viewport.isConnected) return;
      if (viewport._npCriticalPaintLock) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!viewport.isConnected) return;
        if (!graphPanel || !graphPanel.isConnected || graphPanel.style.display === 'none') return;
        if (viewport._npCriticalPaintLock) return;
        var nextW = resolveCriticalChartTargetWidth(viewport || graphPanel);
        if (
          viewport._npCriticalLastWidth &&
          Math.abs(nextW - viewport._npCriticalLastWidth) < 16
        ) {
          return;
        }
        scheduleCriticalChartPaint(cfg, prep, charts, viewport);
      }, 220);
    };
    var ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      // Observar el host de resultados (ancho estable), no el canvas que se repinta.
      ro.observe(resultsHost || viewport);
    }
    window.addEventListener('resize', onResize);
    w._npVpdCriticalRuntime[prefix] = {
      onResize: onResize,
      ro: ro,
      charts: charts
    };

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
        ? chartT('Vista semanal: máximos y mínimos por semana.', 'Weekly view: maxima and minima per week.')
        : cfg.granularity === 'monthly'
          ? chartT('Vista mensual: máximos y mínimos por mes.', 'Monthly view: maxima and minima per month.')
          : chartT('Vista diaria: resumen por día.', 'Daily view: summary per day.');
    var critTitle =
      chartT('Horas críticas', 'Critical hours') + ' (' +
      critCount +
      ') · ' +
      getCriticalDisplayLabel() +
      (critPrep.windowStart && critPrep.windowEnd
        ? ' · ' + critPrep.windowStart + ' ' + chartT('a', 'to') + ' ' + critPrep.windowEnd
        : '');
    return (
      '<div style="margin-top:10px;border-top:1px dashed #fed7aa;padding-top:10px;">' +
      '<div style="margin-bottom:8px;"><strong style="color:#9a3412;font-size:13px;">' + chartT('Serie VPD por periodo', 'VPD series by period') + ' (' +
      (cfg.summaryCount || 0) +
      ')</strong></div>' +
      '<div style="font-size:11px;color:#7c2d12;line-height:1.45;background:#fff7ed;border:1px dashed #fdba74;border-radius:6px;padding:6px 8px;margin-bottom:8px;">' +
      granularityNote +
      ' ' + chartT('Tabla con VPD máx/mín, horas por zona y % estrés.', 'Table with max/min VPD, hours by zone and % stress.') +
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
          ' ' + chartT(
            'Gráfica: barras tenues = 24 h/día por zona VPD · línea <strong>azul</strong> = VPD mín + hora · línea <strong>tinta</strong> = VPD máx + hora (eje derecho). Tabla: solo horas fuera de rango.',
            'Chart: faint bars = 24 h/day by VPD zone · <strong>blue</strong> line = min VPD + time · <strong>ink</strong> line = max VPD + time (right axis). Table: out-of-range hours only.'
          ) + '</div>'
        : '') +
      '<div id="' +
      prefix +
      '-critical-graph" style="display:block;width:100%;max-width:100%;box-sizing:border-box;min-height:' +
      CRITICAL_CHART_DASHBOARD_HEIGHT +
      'px;">' +
      criticalChartViewportHtml(prefix) +
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
    CRITICAL_CHART_PAGE_HEIGHT: CRITICAL_CHART_PAGE_HEIGHT,
    CRITICAL_CHART_DASHBOARD_HEIGHT: CRITICAL_CHART_DASHBOARD_HEIGHT,
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
