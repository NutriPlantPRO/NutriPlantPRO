/**
 * NutriPlant PRO — Índice de Satisfacción Hídrica (ISH) / Rendimiento hídrico
 * Fórmula tipo GEOSMET: ISH = 100 × [1 − Σ(Di + Fp·Ei) / Σ ETc]
 * Agregación semanal, máx. 52 semanas. Uso: gratis + pestaña Clima PRO.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof root !== 'undefined') {
    root.NpIsh = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MAX_WEEKS = 52;
  var DEFAULT_FP = 0.25;
  /** % del riego aplicado que cuenta en el balance ISH (100 = todo cuenta). */
  var DEFAULT_IRRIGATION_EFFECTIVE_PCT = 100;
  var ARCHIVE_THRESHOLD_DAYS = 92;
  var FP_HELP_ES =
    'Fp pondera el exceso de agua frente al déficit (default 0,25). 0 = solo sequía; 1 = exceso igual que déficit.';
  var FP_HELP_EN =
    'Fp weights excess water vs deficit (default 0.25). 0 = drought only; 1 = excess equals deficit.';
  var IRR_EFF_HELP_ES =
    'Fracción del riego aplicado que realmente entra al balance del ISH (pérdidas, eficiencia del sistema). 100 = todo cuenta; 80 = solo el 80 % del riego que capturas.';
  var IRR_EFF_HELP_EN =
    'Fraction of applied irrigation that enters the ISH balance (losses, system efficiency). 100 = all counts; 80 = only 80% of the irrigation you enter.';
  var IRR_EFF_CONV_METRIC_ES = ' Conversión: 1 mm = 10 m³/ha.';
  var IRR_EFF_CONV_METRIC_EN = ' Conversion: 1 mm = 10 m³/ha.';
  var IRR_EFF_CONV_US_ES =
    ' Unidades de pantalla: in y US gal/acre (se convierten solos; internamente 1 mm = 10 m³/ha).';
  var IRR_EFF_CONV_US_EN =
    ' Display units: in and US gal/acre (auto-convert; stored as 1 mm = 10 m³/ha).';

  function round1(n) {
    if (n == null || !Number.isFinite(Number(n))) return null;
    return Math.round(Number(n) * 10) / 10;
  }

  function round2(n) {
    if (n == null || !Number.isFinite(Number(n))) return null;
    return Math.round(Number(n) * 100) / 100;
  }

  function todayIso() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function parseIso(iso) {
    if (!iso || typeof iso !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt;
  }

  function toIso(dt) {
    return (
      dt.getUTCFullYear() +
      '-' +
      String(dt.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(dt.getUTCDate()).padStart(2, '0')
    );
  }

  function addDaysIso(iso, days) {
    var dt = parseIso(iso);
    if (!dt) return null;
    dt.setUTCDate(dt.getUTCDate() + days);
    return toIso(dt);
  }

  function daysBetween(startIso, endIso) {
    var a = parseIso(startIso);
    var b = parseIso(endIso);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  }

  function daysFromTodayToStart(startIso) {
    var n = daysBetween(startIso, todayIso());
    return n == null ? null : n;
  }

  /** 1 mm sobre 1 ha = 10 m³/ha. */
  function mmToM3PerHa(mm) {
    if (mm == null || !Number.isFinite(Number(mm))) return null;
    return round1(Number(mm) * 10);
  }

  function m3PerHaToMm(m3Ha) {
    if (m3Ha == null || !Number.isFinite(Number(m3Ha))) return null;
    return round1(Number(m3Ha) / 10);
  }

  function clampIrrigationEffectivePct(pct) {
    var n = pct == null || pct === '' ? DEFAULT_IRRIGATION_EFFECTIVE_PCT : Number(pct);
    if (!Number.isFinite(n)) return DEFAULT_IRRIGATION_EFFECTIVE_PCT;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return Math.round(n * 10) / 10;
  }

  function clampFp(fp) {
    var v = fp == null || fp === '' ? DEFAULT_FP : Number(fp);
    if (!Number.isFinite(v)) return DEFAULT_FP;
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function validateCycle(cycleStart, cycleEnd) {
    var start = cycleStart;
    var end = cycleEnd || todayIso();
    if (!parseIso(start)) {
      return { ok: false, error: 'Fecha de inicio inválida', errorEn: 'Invalid start date' };
    }
    if (!parseIso(end)) {
      return { ok: false, error: 'Fecha de fin inválida', errorEn: 'Invalid end date' };
    }
    if (end < start) {
      return {
        ok: false,
        error: 'La fecha de fin debe ser ≥ inicio',
        errorEn: 'End date must be ≥ start'
      };
    }
    var days = daysBetween(start, end);
    if (days == null) {
      return { ok: false, error: 'Rango de fechas inválido', errorEn: 'Invalid date range' };
    }
    var weeks = Math.ceil((days + 1) / 7);
    if (weeks > MAX_WEEKS) {
      return {
        ok: false,
        error: 'Máximo ' + MAX_WEEKS + ' semanas (~1 año). Acorta el ciclo.',
        errorEn: 'Maximum ' + MAX_WEEKS + ' weeks (~1 year). Shorten the cycle.',
        weeks: weeks
      };
    }
    if (weeks < 1) {
      return { ok: false, error: 'El ciclo es demasiado corto', errorEn: 'Cycle is too short' };
    }
    return { ok: true, cycleStart: start, cycleEnd: end, weekCount: weeks, dayCount: days + 1 };
  }

  /**
   * Semanas consecutivas de 7 días desde cycleStart hasta cycleEnd (última puede ser más corta).
   */
  function buildWeekSlots(cycleStart, cycleEnd) {
    var v = validateCycle(cycleStart, cycleEnd);
    if (!v.ok) return [];
    var weeks = [];
    var cursor = v.cycleStart;
    var idx = 0;
    while (cursor <= v.cycleEnd && idx < MAX_WEEKS) {
      var weekEnd = addDaysIso(cursor, 6);
      if (weekEnd > v.cycleEnd) weekEnd = v.cycleEnd;
      weeks.push({
        index: idx,
        weekStart: cursor,
        weekEnd: weekEnd,
        rain_mm: null,
        rainSource: null,
        et0_mm: null,
        et0Source: null,
        irrigation_mm: null,
        irrigationSource: null,
        etc_mm: null,
        deficit_mm: null,
        excess_mm: null,
        ish_cumulative: null,
        yield_relative: null
      });
      idx += 1;
      cursor = addDaysIso(weekEnd, 1);
      if (!cursor || cursor > v.cycleEnd) break;
    }
    return weeks;
  }

  function sumDailyInRange(dailyTimes, dailyValues, weekStart, weekEnd) {
    if (!dailyTimes || !dailyValues) return null;
    var sum = 0;
    var has = false;
    for (var i = 0; i < dailyTimes.length; i++) {
      var day = String(dailyTimes[i] || '').slice(0, 10);
      if (day < weekStart || day > weekEnd) continue;
      var val = dailyValues[i];
      if (val == null || !Number.isFinite(Number(val))) continue;
      sum += Number(val);
      has = true;
    }
    return has ? round1(sum) : null;
  }

  /**
   * Rellena rain/et0 satélite en semanas sin tocar celdas marcadas como manual.
   */
  function applySatelliteToWeeks(weeks, daily, options) {
    options = options || {};
    var preserveManual = options.preserveManual !== false;
    var rainArr = (daily && daily.precipitation_sum) || [];
    var et0Arr = (daily && daily.et0_fao_evapotranspiration) || [];
    var times = (daily && daily.time) || [];
    return (weeks || []).map(function (w) {
      var row = Object.assign({}, w);
      var rainSat = sumDailyInRange(times, rainArr, row.weekStart, row.weekEnd);
      var et0Sat = sumDailyInRange(times, et0Arr, row.weekStart, row.weekEnd);
      if (!preserveManual || row.rainSource !== 'manual') {
        row.rain_mm = rainSat;
        row.rainSource = rainSat != null ? 'satellite' : row.rainSource;
      }
      if (!preserveManual || row.et0Source !== 'manual') {
        row.et0_mm = et0Sat;
        row.et0Source = et0Sat != null ? 'satellite' : row.et0Source;
      }
      return row;
    });
  }

  function computeIsh(input) {
    var kc = input && input.kc != null ? Number(input.kc) : null;
    var fp = clampFp(input && input.fp);
    var irrEffPct = clampIrrigationEffectivePct(input && input.irrigationEffectivePct);
    var irrEffFactor = irrEffPct / 100;
    var macro = !!(input && input.macroTunnelNoRain);
    var weeksIn = (input && input.weeks) || [];
    var sumEtc = 0;
    var sumPenalty = 0;
    var weeks = weeksIn.map(function (w) {
      var row = Object.assign({}, w);
      var rainStored =
        row.rain_mm != null && Number.isFinite(Number(row.rain_mm)) ? Number(row.rain_mm) : 0;
      var rain = macro ? 0 : rainStored;
      var et0 = row.et0_mm != null && Number.isFinite(Number(row.et0_mm)) ? Number(row.et0_mm) : null;
      var irrApplied =
        row.irrigation_mm != null && Number.isFinite(Number(row.irrigation_mm))
          ? Number(row.irrigation_mm)
          : 0;
      var irr = round1(irrApplied * irrEffFactor);
      var etc = null;
      var deficit = null;
      var excess = null;
      if (kc != null && Number.isFinite(kc) && kc >= 0 && et0 != null) {
        etc = round1(et0 * kc);
        var supply = rain + irr;
        deficit = round1(Math.max(0, etc - supply));
        excess = round1(Math.max(0, supply - etc));
        sumEtc += etc;
        sumPenalty += deficit + fp * excess;
      }
      row.irrigation_m3_ha =
        row.irrigation_mm != null && Number.isFinite(Number(row.irrigation_mm))
          ? mmToM3PerHa(row.irrigation_mm)
          : null;
      row.irrigation_effective_mm =
        row.irrigation_mm != null && Number.isFinite(Number(row.irrigation_mm)) ? irr : null;
      row.etc_mm = etc;
      row.deficit_mm = deficit;
      row.excess_mm = excess;
      // Macrotúnel: lluvia = 0 solo en el balance. No borrar rain_mm (al desmarcar se recupera).
      row.rain_used_mm = rain;
      row.macroRainIgnored = macro;
      return row;
    });

    var ish = null;
    if (kc == null || !Number.isFinite(kc) || kc < 0) {
      return {
        ok: false,
        error: 'Indica Kc para calcular ETc e ISH',
        errorEn: 'Enter Kc to compute ETc and ISH',
        weeks: weeks,
        fp: fp,
        irrigationEffectivePct: irrEffPct,
        kc: kc,
        ish: null,
        sumEtc: null,
        sumPenalty: null
      };
    }
    if (sumEtc <= 0) {
      return {
        ok: false,
        error: 'Sin ETc acumulada: obtén ET₀ o captura valores manuales',
        errorEn: 'No cumulative ETc: fetch ET₀ or enter manual values',
        weeks: weeks,
        fp: fp,
        irrigationEffectivePct: irrEffPct,
        kc: kc,
        ish: null,
        sumEtc: 0,
        sumPenalty: sumPenalty
      };
    }

    ish = round1(Math.max(0, Math.min(100, 100 * (1 - sumPenalty / sumEtc))));
    // Curva de rendimiento relativo (estilo GEOSMET): denominador = Σ ETc del ciclo.
    // Así el techo solo baja o se mantiene; una semana buena no “recupera” merma ya contabilizada.
    var runningPenalty = 0;
    weeks = weeks.map(function (row) {
      var out = Object.assign({}, row);
      if (out.etc_mm != null) {
        runningPenalty += (out.deficit_mm || 0) + fp * (out.excess_mm || 0);
        var y = round1(Math.max(0, Math.min(100, 100 * (1 - runningPenalty / sumEtc))));
        out.ish_cumulative = y;
        out.yield_relative = y;
      }
      return out;
    });

    return {
      ok: true,
      weeks: weeks,
      fp: fp,
      irrigationEffectivePct: irrEffPct,
      kc: kc,
      ish: ish,
      sumEtc: round1(sumEtc),
      sumPenalty: round1(sumPenalty),
      band: ishBand(ish),
      updatedAt: new Date().toISOString()
    };
  }

  function ishBand(ish) {
    if (ish == null || !Number.isFinite(Number(ish))) return null;
    var v = Number(ish);
    if (v >= 85) return { id: 'good', labelEs: 'Agua casi no limita', labelEn: 'Water barely limiting', color: '#15803d' };
    if (v >= 70) return { id: 'warn', labelEs: 'Estrés acumulado', labelEn: 'Accumulated stress', color: '#a16207' };
    return { id: 'bad', labelEs: 'Techo hídrico tocado', labelEn: 'Hydric ceiling hit', color: '#b91c1c' };
  }

  function mergeWeeksPreserveManual(prevWeeks, nextSlots) {
    var byStart = {};
    (prevWeeks || []).forEach(function (w) {
      if (w && w.weekStart) byStart[w.weekStart] = w;
    });
    return (nextSlots || []).map(function (slot) {
      var prev = byStart[slot.weekStart];
      if (!prev) return slot;
      // Conservar clima ya cargado (satélite o manual) e riego al rearmar semanas.
      // Antes solo se preservaba «manual» y el resto volvía a null → borraba el fetch.
      return {
        index: slot.index,
        weekStart: slot.weekStart,
        weekEnd: slot.weekEnd,
        rain_mm: prev.rain_mm,
        rainSource: prev.rainSource,
        et0_mm: prev.et0_mm,
        et0Source: prev.et0Source,
        irrigation_mm: prev.irrigation_mm,
        irrigationSource: prev.irrigationSource,
        etc_mm: null,
        deficit_mm: null,
        excess_mm: null,
        ish_cumulative: null,
        yield_relative: null
      };
    });
  }

  async function fetchOpenMeteoDailyRange(lat, lng, startDate, endDate, useArchive) {
    var base = useArchive
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast';
    var url =
      base +
      '?latitude=' +
      encodeURIComponent(lat) +
      '&longitude=' +
      encodeURIComponent(lng) +
      '&start_date=' +
      encodeURIComponent(startDate) +
      '&end_date=' +
      encodeURIComponent(endDate) +
      '&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=auto';
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          try {
            controller.abort();
          } catch (e) {}
        }, 28000)
      : null;
    var res;
    try {
      res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    } finally {
      if (timer) clearTimeout(timer);
    }
    var data = await res.json().catch(function () {
      return null;
    });
    if (!res.ok) {
      throw new Error((data && (data.reason || data.error)) || 'Open-Meteo HTTP ' + res.status);
    }
    if (data && data.error) {
      throw new Error(data.reason || 'Open-Meteo error');
    }
    if (!data || !data.daily || !Array.isArray(data.daily.time)) {
      throw new Error('Sin datos diarios');
    }
    return data.daily;
  }

  function mergeDaily(a, b) {
    if (!a) return b;
    if (!b) return a;
    var map = {};
    function ingest(daily) {
      var times = daily.time || [];
      var rain = daily.precipitation_sum || [];
      var et0 = daily.et0_fao_evapotranspiration || [];
      for (var i = 0; i < times.length; i++) {
        var day = String(times[i]).slice(0, 10);
        map[day] = {
          rain: rain[i],
          et0: et0[i]
        };
      }
    }
    ingest(a);
    ingest(b);
    var keys = Object.keys(map).sort();
    return {
      time: keys,
      precipitation_sum: keys.map(function (k) {
        return map[k].rain;
      }),
      et0_fao_evapotranspiration: keys.map(function (k) {
        return map[k].et0;
      })
    };
  }

  /**
   * Trae lluvia + ET₀ diarios del ciclo. Parte archive + forecast si el rango cruza ~92 d.
   */
  async function fetchCycleClimate(lat, lng, cycleStart, cycleEnd) {
    var v = validateCycle(cycleStart, cycleEnd);
    if (!v.ok) throw new Error(v.error);
    var start = v.cycleStart;
    var end = v.cycleEnd;
    var today = todayIso();
    if (end > today) end = today;
    if (start > end) throw new Error('Rango sin días históricos aún');

    var daysToStart = daysFromTodayToStart(start);
    var needsArchive = daysToStart != null && daysToStart > ARCHIVE_THRESHOLD_DAYS;
    var recentCutoff = addDaysIso(today, -5);

    if (!needsArchive) {
      return await fetchOpenMeteoDailyRange(lat, lng, start, end, false);
    }

    if (end <= recentCutoff) {
      return await fetchOpenMeteoDailyRange(lat, lng, start, end, true);
    }

    var archiveEnd = recentCutoff < start ? start : recentCutoff;
    if (archiveEnd > end) archiveEnd = end;
    var archivePart = null;
    var forecastPart = null;
    if (start <= archiveEnd) {
      archivePart = await fetchOpenMeteoDailyRange(lat, lng, start, archiveEnd, true);
    }
    var forecastStart = addDaysIso(archiveEnd, 1);
    if (forecastStart && forecastStart <= end) {
      forecastPart = await fetchOpenMeteoDailyRange(lat, lng, forecastStart, end, false);
    }
    return mergeDaily(archivePart, forecastPart);
  }

  function suggestIrrigationFromBalance(iqc, weeks) {
    if (!iqc || !weeks || !weeks.length) return null;
    if (Number(iqc.periodDays) !== 7) return null;
    var val = iqc.irrigationValue;
    if (val == null || !Number.isFinite(Number(val)) || Number(val) <= 0) return null;
    var unit = iqc.irrigationUnit || 'm3';
    var mm = null;
    if (unit === 'mm') {
      mm = Number(val);
    } else {
      var ha =
        iqc.irrigatedAreaHa != null && Number.isFinite(Number(iqc.irrigatedAreaHa))
          ? Number(iqc.irrigatedAreaHa)
          : iqc.cropAreaHa != null && Number.isFinite(Number(iqc.cropAreaHa))
            ? Number(iqc.cropAreaHa)
            : null;
      if (ha == null || ha <= 0) return null;
      mm = Number(val) / (ha * 10);
    }
    mm = round1(mm);
    if (mm == null || mm <= 0) return null;
    var today = todayIso();
    var targetIdx = -1;
    for (var i = 0; i < weeks.length; i++) {
      if (weeks[i].weekStart <= today && weeks[i].weekEnd >= today) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx < 0) targetIdx = weeks.length - 1;
    return { weekIndex: targetIdx, irrigation_mm: mm };
  }

  function weekLabelStep(n) {
    if (n > 40) return 4;
    if (n > 26) return 3;
    if (n > 16) return 2;
    return 1;
  }

  function formatWeekTick(row, index) {
    var start = row && row.weekStart ? String(row.weekStart).slice(5) : '';
    return 'S' + (index + 1) + (start ? ' · ' + start : '');
  }

  /**
   * Gráfica de rendimiento relativo (escalones). HiDPI + ejes nítidos + ticks X en diagonal.
   * options: { language: 'es'|'en', emptyText }
   */
  function drawYieldChart(canvas, rows, options) {
    options = options || {};
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2.5) : 1;
    var parent = canvas.parentElement;
    var parentW = parent ? parent.clientWidth || parent.getBoundingClientRect().width : 0;
    var cssW = parentW >= 40 ? Math.floor(parentW) : canvas.clientWidth || 0;
    if (cssW < 40) cssW = Number(canvas.getAttribute('width')) || 640;
    var cssH = canvas.clientHeight || Number(canvas.getAttribute('height')) || 280;
    if (cssH < 40) cssH = 280;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // Ancho fluido: no fijar px (antes quedaba ~800px y se veía “a la mitad”).
    canvas.style.width = '100%';
    canvas.style.maxWidth = '100%';
    canvas.style.height = cssH + 'px';
    canvas.style.display = 'block';
    canvas.style.boxSizing = 'border-box';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssW, cssH);

    var langEn = options.language === 'en';
    var emptyText =
      options.emptyText ||
      (langEn ? 'No data yet' : 'Sin datos aún');
    if (!rows || !rows.length) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px Inter, system-ui, sans-serif';
      ctx.fillText(emptyText, 24, cssH / 2);
      return;
    }

    var pad = { l: 58, r: 20, t: 22, b: 78 };
    var plotW = cssW - pad.l - pad.r;
    var plotH = cssH - pad.t - pad.b;
    var n = rows.length;
    var stepX = plotW / Math.max(n, 1);
    var fontUi = 'Inter, system-ui, -apple-system, sans-serif';

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var g = 0; g <= 4; g++) {
      var gy = pad.t + (plotH * g) / 4;
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(pad.l + plotW, gy);
    }
    ctx.stroke();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 12px ' + fontUi;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [100, 75, 50, 25, 0].forEach(function (lab, i) {
      ctx.fillText(String(lab), pad.l - 10, pad.t + (plotH * i) / 4);
    });

    ctx.save();
    ctx.translate(16, pad.t + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 13px ' + fontUi;
    ctx.fillText(langEn ? 'Yield (%)' : 'Rendimiento (%)', 0, 0);
    ctx.restore();

    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2.75;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < n; i++) {
      var row = rows[i];
      var yv = row.yield_relative != null ? row.yield_relative : row.ish_cumulative;
      if (yv == null || !Number.isFinite(Number(yv))) continue;
      var x0 = pad.l + i * stepX;
      var x1 = pad.l + (i + 1) * stepX;
      var y = pad.t + plotH * (1 - Number(yv) / 100);
      if (!started) {
        ctx.moveTo(x0, y);
        started = true;
      } else {
        ctx.lineTo(x0, y);
      }
      ctx.lineTo(x1, y);
    }
    if (started) ctx.stroke();

    var tickEvery = weekLabelStep(n);
    ctx.fillStyle = '#334155';
    ctx.font = '600 10px ' + fontUi;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var ti = 0; ti < n; ti++) {
      if (!(ti === 0 || ti === n - 1 || ti % tickEvery === 0)) continue;
      var cx = pad.l + ti * stepX + stepX / 2;
      ctx.save();
      ctx.translate(cx, pad.t + plotH + 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(formatWeekTick(rows[ti], ti), 0, 0);
      ctx.restore();
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 12px ' + fontUi;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(langEn ? 'Time (weeks)' : 'Tiempo (semanas)', pad.l + plotW / 2, cssH - 12);
    ctx.textAlign = 'left';
  }

  return {
    MAX_WEEKS: MAX_WEEKS,
    DEFAULT_FP: DEFAULT_FP,
    DEFAULT_IRRIGATION_EFFECTIVE_PCT: DEFAULT_IRRIGATION_EFFECTIVE_PCT,
    FP_HELP_ES: FP_HELP_ES,
    FP_HELP_EN: FP_HELP_EN,
    IRR_EFF_HELP_ES: IRR_EFF_HELP_ES,
    IRR_EFF_HELP_EN: IRR_EFF_HELP_EN,
    IRR_EFF_CONV_METRIC_ES: IRR_EFF_CONV_METRIC_ES,
    IRR_EFF_CONV_METRIC_EN: IRR_EFF_CONV_METRIC_EN,
    IRR_EFF_CONV_US_ES: IRR_EFF_CONV_US_ES,
    IRR_EFF_CONV_US_EN: IRR_EFF_CONV_US_EN,
    irrigationEffectiveHelp: function (lang, unitSystem) {
      var en = lang === 'en';
      var us = unitSystem === 'us_customary';
      return (
        (en ? IRR_EFF_HELP_EN : IRR_EFF_HELP_ES) +
        (us
          ? en
            ? IRR_EFF_CONV_US_EN
            : IRR_EFF_CONV_US_ES
          : en
            ? IRR_EFF_CONV_METRIC_EN
            : IRR_EFF_CONV_METRIC_ES)
      );
    },
    todayIso: todayIso,
    parseIso: parseIso,
    addDaysIso: addDaysIso,
    daysBetween: daysBetween,
    clampFp: clampFp,
    clampIrrigationEffectivePct: clampIrrigationEffectivePct,
    mmToM3PerHa: mmToM3PerHa,
    m3PerHaToMm: m3PerHaToMm,
    validateCycle: validateCycle,
    buildWeekSlots: buildWeekSlots,
    applySatelliteToWeeks: applySatelliteToWeeks,
    computeIsh: computeIsh,
    ishBand: ishBand,
    mergeWeeksPreserveManual: mergeWeeksPreserveManual,
    fetchCycleClimate: fetchCycleClimate,
    suggestIrrigationFromBalance: suggestIrrigationFromBalance,
    drawYieldChart: drawYieldChart,
    round1: round1,
    round2: round2
  };
});
