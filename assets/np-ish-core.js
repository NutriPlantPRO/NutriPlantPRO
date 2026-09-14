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
  var ARCHIVE_THRESHOLD_DAYS = 92;
  var FP_HELP_ES =
    'Fp pondera el exceso de agua frente al déficit (default 0,25). 0 = solo sequía; 1 = exceso igual que déficit.';
  var FP_HELP_EN =
    'Fp weights excess water vs deficit (default 0.25). 0 = drought only; 1 = excess equals deficit.';

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
    var macro = !!(input && input.macroTunnelNoRain);
    var weeksIn = (input && input.weeks) || [];
    var sumEtc = 0;
    var sumPenalty = 0;
    var weeks = weeksIn.map(function (w) {
      var row = Object.assign({}, w);
      var rain = macro ? 0 : row.rain_mm != null && Number.isFinite(Number(row.rain_mm)) ? Number(row.rain_mm) : 0;
      var et0 = row.et0_mm != null && Number.isFinite(Number(row.et0_mm)) ? Number(row.et0_mm) : null;
      var irr =
        row.irrigation_mm != null && Number.isFinite(Number(row.irrigation_mm))
          ? Number(row.irrigation_mm)
          : 0;
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
      row.etc_mm = etc;
      row.deficit_mm = deficit;
      row.excess_mm = excess;
      if (macro) {
        row.rain_mm = 0;
        row.rainSource = row.rainSource || 'manual';
      }
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
        kc: kc,
        ish: null,
        sumEtc: 0,
        sumPenalty: sumPenalty
      };
    }

    ish = round1(Math.max(0, Math.min(100, 100 * (1 - sumPenalty / sumEtc))));
    var runningPenalty = 0;
    var runningEtc = 0;
    weeks = weeks.map(function (row) {
      var out = Object.assign({}, row);
      if (out.etc_mm != null) {
        runningEtc += out.etc_mm;
        runningPenalty += (out.deficit_mm || 0) + fp * (out.excess_mm || 0);
        out.ish_cumulative =
          runningEtc > 0
            ? round1(Math.max(0, Math.min(100, 100 * (1 - runningPenalty / runningEtc))))
            : null;
        out.yield_relative = out.ish_cumulative;
      }
      return out;
    });

    return {
      ok: true,
      weeks: weeks,
      fp: fp,
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
      return {
        index: slot.index,
        weekStart: slot.weekStart,
        weekEnd: slot.weekEnd,
        rain_mm: prev.rainSource === 'manual' ? prev.rain_mm : slot.rain_mm,
        rainSource: prev.rainSource === 'manual' ? 'manual' : slot.rainSource,
        et0_mm: prev.et0Source === 'manual' ? prev.et0_mm : slot.et0_mm,
        et0Source: prev.et0Source === 'manual' ? 'manual' : slot.et0Source,
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

  return {
    MAX_WEEKS: MAX_WEEKS,
    DEFAULT_FP: DEFAULT_FP,
    FP_HELP_ES: FP_HELP_ES,
    FP_HELP_EN: FP_HELP_EN,
    todayIso: todayIso,
    parseIso: parseIso,
    addDaysIso: addDaysIso,
    daysBetween: daysBetween,
    clampFp: clampFp,
    validateCycle: validateCycle,
    buildWeekSlots: buildWeekSlots,
    applySatelliteToWeeks: applySatelliteToWeeks,
    computeIsh: computeIsh,
    ishBand: ishBand,
    mergeWeeksPreserveManual: mergeWeeksPreserveManual,
    fetchCycleClimate: fetchCycleClimate,
    suggestIrrigationFromBalance: suggestIrrigationFromBalance,
    round1: round1,
    round2: round2
  };
});
