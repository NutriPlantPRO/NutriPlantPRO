/**
 * NutriPlant PRO — Ventanas de aplicación foliar (1 zona / 1 lote).
 * Clasifica hora a hora T, HR, viento, DPV (aire) y lluvia.
 * Criterio: factor limitante (el peor indicador manda).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof root !== 'undefined') {
    root.NpFoliarWindow = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var FORECAST_DAYS = 3;
  var DEFAULT_HOUR_START = 5;
  var DEFAULT_HOUR_END = 20;
  var RAIN_LOOKAHEAD_HOURS = 2;

  var CLASSES = [
    {
      id: 0,
      key: 'muy_favorable',
      labelEs: 'Muy favorable',
      labelEn: 'Very favorable',
      color: '#1a5f36'
    },
    {
      id: 1,
      key: 'favorable',
      labelEs: 'Favorable',
      labelEn: 'Favorable',
      color: '#6bbf82'
    },
    {
      id: 2,
      key: 'precaucion',
      labelEs: 'Precaución',
      labelEn: 'Caution',
      color: '#d9b84a'
    },
    {
      id: 3,
      key: 'desfavorable',
      labelEs: 'Desfavorable',
      labelEn: 'Unfavorable',
      color: '#d9844a'
    },
    {
      id: 4,
      key: 'muy_desfavorable',
      labelEs: 'Muy desfavorable',
      labelEn: 'Very unfavorable',
      color: '#c75f5f'
    }
  ];

  /**
   * Sweet spot de aplicación (intersección T ∩ HR ∩ viento).
   * Criterio clásico de pulverización: T 15–25 °C, HR 50–70 %, viento 2–8 km/h.
   * Manda el semáforo «muy favorable» cuando las tres coinciden (+ DPV y sin lluvia).
   */
  var SWEET_SPOT = {
    tempC: { idealMin: 15, idealMax: 25 },
    rhPct: { idealMin: 50, idealMax: 70 },
    windKmh: { idealMin: 2, idealMax: 8 }
  };

  /** Publicación NutriPlant (banda más amplia; referencia, no el núcleo del verde oscuro). */
  var PUBLICATION_RANGES = {
    tempC: { idealMin: 18, idealMax: 28 },
    rhPct: { idealMin: 60, idealMax: 90 },
    windKmh: { idealMin: 3, idealMax: 12 },
    vpdKpa: { idealMin: 0.3, idealMax: 1.2 },
    rainMm: { hourMax: 0.1, next2hMax: 0.2 }
  };

  /** Default de la herramienta = sweet spot + DPV/lluvia de la publicación. */
  var DEFAULT_RANGES = {
    tempC: { idealMin: 15, idealMax: 25 },
    rhPct: { idealMin: 50, idealMax: 70 },
    windKmh: { idealMin: 2, idealMax: 8 },
    vpdKpa: { idealMin: 0.3, idealMax: 1.2 },
    rainMm: { hourMax: 0.1, next2hMax: 0.2 }
  };

  function numberOrNull(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function round1(n) {
    if (n == null || !Number.isFinite(Number(n))) return null;
    return Math.round(Number(n) * 10) / 10;
  }

  function round2(n) {
    if (n == null || !Number.isFinite(Number(n))) return null;
    return Math.round(Number(n) * 100) / 100;
  }

  function clampClass(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) return 4;
    if (v < 0) return 0;
    if (v > 4) return 4;
    return v | 0;
  }

  function classInfo(id) {
    return CLASSES[clampClass(id)] || CLASSES[4];
  }

  function cloneRanges(src) {
    var s = src && typeof src === 'object' ? src : {};
    function band(key, fallback) {
      var o = s[key] && typeof s[key] === 'object' ? s[key] : {};
      var out = {};
      Object.keys(fallback).forEach(function (k) {
        var n = numberOrNull(o[k]);
        out[k] = n != null ? n : fallback[k];
      });
      return out;
    }
    return {
      tempC: band('tempC', DEFAULT_RANGES.tempC),
      rhPct: band('rhPct', DEFAULT_RANGES.rhPct),
      windKmh: band('windKmh', DEFAULT_RANGES.windKmh),
      vpdKpa: band('vpdKpa', DEFAULT_RANGES.vpdKpa),
      rainMm: band('rainMm', DEFAULT_RANGES.rainMm)
    };
  }

  /** DPV de aire (Magnus/Tetens), kPa. No usa T hoja: es el DPV ambiental de la pulverización. */
  function airVpdKpa(tempC, rhPct) {
    var t = numberOrNull(tempC);
    var h = numberOrNull(rhPct);
    if (t == null || h == null) return null;
    var rh = Math.max(0, Math.min(100, h));
    var es = 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
    return Math.max(0, es * (1 - rh / 100));
  }

  function scoreTemp(tempC, ranges) {
    var t = numberOrNull(tempC);
    if (t == null) return 4;
    var lo = ranges.tempC.idealMin;
    var hi = ranges.tempC.idealMax;
    if (t >= lo && t <= hi) return 0;
    var d = t < lo ? lo - t : t - hi;
    if (d <= 2) return 1;
    if (d <= 4) return 2;
    if (d <= 7) return 3;
    return 4;
  }

  function scoreRh(rhPct, ranges) {
    var h = numberOrNull(rhPct);
    if (h == null) return 4;
    var lo = ranges.rhPct.idealMin;
    var hi = numberOrNull(ranges.rhPct.idealMax);
    if (hi == null) {
      if (h >= lo + 10) return 0;
      if (h >= lo) return 1;
      var dMin = lo - h;
      if (dMin <= 10) return 2;
      if (dMin <= 20) return 3;
      return 4;
    }
    if (h >= lo && h <= hi) return 0;
    if (h > hi) {
      var dHi = h - hi;
      if (dHi <= 10) return 1;
      if (dHi <= 20) return 2;
      return 3;
    }
    var dLo = lo - h;
    if (dLo <= 10) return 2;
    if (dLo <= 20) return 3;
    return 4;
  }

  function scoreWind(windKmh, ranges) {
    var w = numberOrNull(windKmh);
    if (w == null) return 4;
    if (w < 0) w = 0;
    var lo = ranges.windKmh.idealMin;
    var hi = ranges.windKmh.idealMax;
    if (w >= lo && w <= hi) return 0;
    if (w < lo) {
      if (w >= lo - 1) return 1;
      return 2;
    }
    var d = w - hi;
    if (d <= 2) return 1;
    if (d <= 4) return 2;
    if (d <= 8) return 3;
    return 4;
  }

  function scoreVpd(vpdKpa, ranges) {
    var v = numberOrNull(vpdKpa);
    if (v == null) return 4;
    var lo = ranges.vpdKpa.idealMin;
    var hi = ranges.vpdKpa.idealMax;
    if (v >= lo && v <= hi) return 0;
    if (v < lo) {
      /* DPV bajo (mañana húmeda / rocío): precaución, no rojo. El DPV alto sí quema la gota. */
      if (lo - v <= 0.15) return 1;
      return 2;
    }
    var d = v - hi;
    if (d <= 0.4) return 2;
    if (d <= 1.0) return 3;
    return 4;
  }

  function scoreRain(rainMm, rainNextMm, precipProbPct, ranges) {
    var rain = numberOrNull(rainMm);
    var next = numberOrNull(rainNextMm);
    var prob = numberOrNull(precipProbPct);
    if (rain == null) rain = 0;
    if (next == null) next = 0;
    var hourMax = ranges.rainMm.hourMax;
    var nextMax = ranges.rainMm.next2hMax;
    if (rain >= Math.max(0.5, hourMax * 5)) return 4;
    if (rain >= hourMax) return 3;
    if (next >= Math.max(2, nextMax * 10)) return 3;
    if (next >= nextMax) return 2;
    if (prob != null && prob >= 70) return 2;
    if (prob != null && prob >= 50) return 1;
    return 0;
  }

  function classifyHour(input, rangesOpt) {
    var ranges = cloneRanges(rangesOpt);
    var tempC = numberOrNull(input && input.tempC);
    var rhPct = numberOrNull(input && input.rhPct);
    var windKmh = numberOrNull(input && input.windKmh);
    var rainMm = numberOrNull(input && input.rainMm);
    var rainNextMm = numberOrNull(input && input.rainNextMm);
    var precipProbPct = numberOrNull(input && input.precipProbPct);
    var vpd = numberOrNull(input && input.vpdKpa);
    if (vpd == null) vpd = airVpdKpa(tempC, rhPct);

    var parts = {
      temp: scoreTemp(tempC, ranges),
      rh: scoreRh(rhPct, ranges),
      wind: scoreWind(windKmh, ranges),
      vpd: scoreVpd(vpd, ranges),
      rain: scoreRain(rainMm, rainNextMm, precipProbPct, ranges)
    };
    var overall = Math.max(parts.temp, parts.rh, parts.wind, parts.vpd, parts.rain);
    var limiting = [];
    Object.keys(parts).forEach(function (k) {
      if (parts[k] === overall && overall > 0) limiting.push(k);
    });
    return {
      tempC: tempC != null ? round1(tempC) : null,
      rhPct: rhPct != null ? round1(rhPct) : null,
      windKmh: windKmh != null ? round1(windKmh) : null,
      vpdKpa: vpd != null ? round2(vpd) : null,
      rainMm: rainMm != null ? round1(rainMm) : null,
      rainNextMm: rainNextMm != null ? round1(rainNextMm) : null,
      precipProbPct: precipProbPct != null ? Math.round(precipProbPct) : null,
      scores: parts,
      classId: overall,
      classInfo: classInfo(overall),
      limiting: limiting
    };
  }

  function parseHourLocal(iso) {
    var s = String(iso || '');
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
    if (!m) return null;
    return {
      date: m[1] + '-' + m[2] + '-' + m[3],
      hour: Number(m[4])
    };
  }

  function sumRainAhead(list, index, hours) {
    var sum = 0;
    var n = Number(hours) || RAIN_LOOKAHEAD_HOURS;
    for (var i = 1; i <= n; i += 1) {
      var v = numberOrNull(list[index + i]);
      if (v != null) sum += v;
    }
    return round1(sum);
  }

  function classifySeries(hours, rangesOpt) {
    var ranges = cloneRanges(rangesOpt);
    return (hours || []).map(function (h) {
      var row = classifyHour(h, ranges);
      row.time = h.time || null;
      row.date = h.date || null;
      row.hour = h.hour != null ? h.hour : null;
      return row;
    });
  }

  function parseOpenMeteoHourly(data) {
    var hourly = data && data.hourly ? data.hourly : null;
    if (!hourly || !Array.isArray(hourly.time)) return [];
    var times = hourly.time;
    var temps = hourly.temperature_2m || [];
    var rhs = hourly.relative_humidity_2m || [];
    var winds = hourly.wind_speed_10m || [];
    var rains = hourly.precipitation || [];
    var probs = hourly.precipitation_probability || [];
    var out = [];
    for (var i = 0; i < times.length; i += 1) {
      var parsed = parseHourLocal(times[i]);
      if (!parsed) continue;
      var tempC = numberOrNull(temps[i]);
      var rhPct = numberOrNull(rhs[i]);
      out.push({
        time: times[i],
        date: parsed.date,
        hour: parsed.hour,
        tempC: tempC,
        rhPct: rhPct,
        windKmh: numberOrNull(winds[i]),
        rainMm: numberOrNull(rains[i]),
        rainNextMm: sumRainAhead(rains, i, RAIN_LOOKAHEAD_HOURS),
        precipProbPct: numberOrNull(probs[i]),
        vpdKpa: airVpdKpa(tempC, rhPct)
      });
    }
    return out;
  }

  function openMeteoUrl(lat, lng, forecastDays) {
    var days = Number(forecastDays);
    if (!Number.isFinite(days) || days < 1) days = FORECAST_DAYS;
    if (days > 7) days = 7;
    return (
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      encodeURIComponent(lat) +
      '&longitude=' +
      encodeURIComponent(lng) +
      '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,precipitation_probability' +
      '&forecast_days=' +
      days +
      '&timezone=auto&wind_speed_unit=kmh'
    );
  }

  function fetchHourly(lat, lng, forecastDays) {
    var url = openMeteoUrl(lat, lng, forecastDays);
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || !data.hourly) throw new Error('Respuesta climática incompleta');
      return {
        timezone: data.timezone || null,
        hours: parseOpenMeteoHourly(data)
      };
    });
  }

  function inDisplayHours(hour, hourStart, hourEnd, show24h) {
    if (show24h) return true;
    var h = Number(hour);
    if (!Number.isFinite(h)) return false;
    var a = Number(hourStart);
    var b = Number(hourEnd);
    if (!Number.isFinite(a)) a = DEFAULT_HOUR_START;
    if (!Number.isFinite(b)) b = DEFAULT_HOUR_END;
    return h >= a && h <= b;
  }

  function groupByDate(rows, opts) {
    opts = opts || {};
    var map = {};
    var order = [];
    (rows || []).forEach(function (row) {
      if (!row || !row.date) return;
      if (!inDisplayHours(row.hour, opts.hourStart, opts.hourEnd, opts.show24h)) return;
      if (!map[row.date]) {
        map[row.date] = [];
        order.push(row.date);
      }
      map[row.date].push(row);
    });
    return order.map(function (date) {
      return { date: date, hours: map[date] };
    });
  }

  function weekdayLabel(iso, lang) {
    var p = String(iso || '').split('-');
    if (p.length < 3) return iso || '';
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    try {
      return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
      });
    } catch (e) {
      return iso;
    }
  }

  function bestWindows(rows, opts) {
    opts = opts || {};
    var maxClass = opts.maxClass != null ? opts.maxClass : 1;
    var minHours = opts.minHours != null ? opts.minHours : 1;
    var filtered = (rows || []).filter(function (row) {
      return inDisplayHours(row.hour, opts.hourStart, opts.hourEnd, opts.show24h);
    });
    var windows = [];
    var current = null;
    filtered.forEach(function (row) {
      var ok = row.classId != null && row.classId <= maxClass;
      if (ok) {
        if (
          current &&
          current.date === row.date &&
          current.endHour + 1 === row.hour
        ) {
          current.endHour = row.hour;
          current.hours.push(row);
          if (row.classId < current.bestClass) current.bestClass = row.classId;
        } else {
          if (current) windows.push(current);
          current = {
            date: row.date,
            startHour: row.hour,
            endHour: row.hour,
            bestClass: row.classId,
            hours: [row]
          };
        }
      } else if (current) {
        windows.push(current);
        current = null;
      }
    });
    if (current) windows.push(current);
    return windows.filter(function (w) {
      return w.endHour - w.startHour + 1 >= minHours;
    });
  }

  function formatHourRange(startHour, endHour) {
    function pad(n) {
      return (n < 10 ? '0' : '') + n;
    }
    if (startHour === endHour) return pad(startHour) + ':00';
    return pad(startHour) + ':00–' + pad(endHour) + ':00';
  }

  return {
    FORECAST_DAYS: FORECAST_DAYS,
    DEFAULT_HOUR_START: DEFAULT_HOUR_START,
    DEFAULT_HOUR_END: DEFAULT_HOUR_END,
    RAIN_LOOKAHEAD_HOURS: RAIN_LOOKAHEAD_HOURS,
    CLASSES: CLASSES,
    SWEET_SPOT: SWEET_SPOT,
    PUBLICATION_RANGES: PUBLICATION_RANGES,
    DEFAULT_RANGES: DEFAULT_RANGES,
    cloneRanges: cloneRanges,
    classInfo: classInfo,
    airVpdKpa: airVpdKpa,
    scoreTemp: scoreTemp,
    scoreRh: scoreRh,
    scoreWind: scoreWind,
    scoreVpd: scoreVpd,
    scoreRain: scoreRain,
    classifyHour: classifyHour,
    classifySeries: classifySeries,
    parseOpenMeteoHourly: parseOpenMeteoHourly,
    openMeteoUrl: openMeteoUrl,
    fetchHourly: fetchHourly,
    groupByDate: groupByDate,
    weekdayLabel: weekdayLabel,
    bestWindows: bestWindows,
    formatHourRange: formatHourRange,
    inDisplayHours: inDisplayHours,
    round1: round1,
    round2: round2
  };
});
