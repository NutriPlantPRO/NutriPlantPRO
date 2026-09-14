/**
 * NutriPlant PRO — Uniformidad de riego (campo DU/CU + EU Keller-Karmeli).
 * Muestras por lote; el fertirriego hereda la desuniformidad del agua.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof root !== 'undefined') {
    root.NpIrrigationUniformity = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PSI_PER_MCA = 16 / 11.25; /* 1,422 PSI / m.c.a. (mismo criterio del ejemplo 16 PSI = 11,25 MCA) */
  var ML_PER_US_FLOZ = 29.5735;
  var ML_PER_US_GAL = 3785.411784;
  var LPH_PER_GPH = 3.785411784;

  function num(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function round(v, d) {
    var n = num(v);
    if (n == null) return null;
    var p = Math.pow(10, d == null ? 2 : d);
    return Math.round(n * p) / p;
  }

  function sortedFinite(values) {
    return (values || [])
      .map(num)
      .filter(function (n) { return n != null && n >= 0; })
      .sort(function (a, b) { return a - b; });
  }

  function mean(arr) {
    if (!arr.length) return null;
    var s = 0;
    for (var i = 0; i < arr.length; i += 1) s += arr[i];
    return s / arr.length;
  }

  function stdevSample(arr) {
    if (arr.length < 2) return null;
    var m = mean(arr);
    var s = 0;
    for (var i = 0; i < arr.length; i += 1) {
      var d = arr[i] - m;
      s += d * d;
    }
    return Math.sqrt(s / (arr.length - 1));
  }

  function median(arr) {
    if (!arr.length) return null;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  /** Cuarto bajo: n/4 redondeado al entero más cercano, mín. 1. */
  function lowQuarterCount(n) {
    var N = Number(n) || 0;
    if (N < 1) return 0;
    return Math.max(1, Math.round(N / 4));
  }

  /**
   * DU del cuarto bajo (ASAE / FAO): 100 × media del 25 % más bajo / media total.
   */
  function distributionUniformity(values) {
    var a = sortedFinite(values);
    if (!a.length) return { ok: false, error: 'Sin muestras numéricas.' };
    var m = mean(a);
    if (!m) return { ok: false, error: 'La media es 0.' };
    var k = lowQuarterCount(a.length);
    var low = a.slice(0, k);
    var lq = mean(low);
    var du = 100 * lq / m;
    return {
      ok: true,
      n: a.length,
      nLow: k,
      mean: m,
      lowQuarterMean: lq,
      min: a[0],
      max: a[a.length - 1],
      du: du,
      qminOverQavg: a[0] / m
    };
  }

  /** Coeficiente de Christiansen: 100 × (1 − Σ|qi−q̄| / (n·q̄)). */
  function christiansenCu(values) {
    var a = sortedFinite(values);
    if (!a.length) return null;
    var m = mean(a);
    if (!m) return null;
    var abs = 0;
    for (var i = 0; i < a.length; i += 1) abs += Math.abs(a[i] - m);
    return 100 * (1 - abs / (a.length * m));
  }

  function duBand(du) {
    var v = num(du);
    if (v == null) return null;
    if (v >= 90) return { key: 'excelente', labelEs: 'Excelente', labelEn: 'Excellent', color: '#166534' };
    if (v >= 80) return { key: 'buena', labelEs: 'Buena', labelEn: 'Good', color: '#15803d' };
    if (v >= 70) return { key: 'aceptable', labelEs: 'Aceptable', labelEn: 'Acceptable', color: '#ca8a04' };
    return { key: 'baja', labelEs: 'Baja — revisar sistema', labelEn: 'Poor — check the system', color: '#b91c1c' };
  }

  /**
   * EU Keller–Karmeli:
   * EU = 100 × (1 − 1.27 × CVf / √ep) × (qmin / qavg)
   */
  function emissionUniformity(opts) {
    var cvf = num(opts && opts.cvf);
    var ep = num(opts && opts.ep);
    var qmin = num(opts && opts.qmin);
    var qavg = num(opts && opts.qavg);
    if (cvf == null || cvf < 0) return { ok: false, error: 'CVf del fabricante inválido.' };
    if (ep == null || ep <= 0) return { ok: false, error: 'Goteros por planta (ep) debe ser > 0.' };
    if (qmin == null || qavg == null || qavg <= 0) return { ok: false, error: 'qmin y q medio requeridos.' };
    var ratio = qmin / qavg;
    var manu = 1 - (1.27 * cvf) / Math.sqrt(ep);
    if (manu < 0) manu = 0;
    var eu = 100 * manu * ratio;
    return {
      ok: true,
      cvf: cvf,
      ep: ep,
      qmin: qmin,
      qavg: qavg,
      qminOverQavg: ratio,
      manufacturerFactor: manu,
      eu: eu
    };
  }

  /** q = qn × (P / Pn)^x  (x típico 0,5 en gotero turbulento). */
  function flowFromPressure(qn, p, pn, x) {
    var Qn = num(qn);
    var P = num(p);
    var Pn = num(pn);
    var exp = num(x);
    if (exp == null) exp = 0.5;
    if (Qn == null || P == null || Pn == null || Pn <= 0 || P < 0) return null;
    return Qn * Math.pow(P / Pn, exp);
  }

  function psiToMca(psi) {
    var p = num(psi);
    return p == null ? null : p / PSI_PER_MCA;
  }

  function mcaToPsi(mca) {
    var p = num(mca);
    return p == null ? null : p * PSI_PER_MCA;
  }

  /**
   * Hidráulica simplificada del ejemplo:
   * P_AB = Pin − fricción_hasta_última_lateral
   * P_inicio_primera = Pin − fricción_lateral + desnivel_a_favor  (máx. ≈ Pin si desnivel/fricción se aplican al tramo)
   * En el reel: Pmax = Pin; Pmin = (Pin − f_mains − f_lateral + slope).
   */
  function designPressures(opts) {
    var pin = num(opts && opts.pinMca);
    var fMain = num(opts && opts.frictionMainMca) || 0;
    var fLat = num(opts && opts.frictionLateralMca) || 0;
    var slope = num(opts && opts.slopeFavorMca) || 0;
    if (pin == null) return { ok: false, error: 'Presión de entrada requerida.' };
    var pAB = pin - fMain;
    var pFirstEnd = pin - fLat + slope;
    var pLastEnd = pAB - fLat + slope;
    var pMax = pin;
    var pMin = Math.min(pLastEnd, pFirstEnd, pAB, pin);
    var pAvg = (pMin + pMax) / 2;
    return {
      ok: true,
      pinMca: pin,
      pAB: pAB,
      pFirstEnd: pFirstEnd,
      pLastEnd: pLastEnd,
      pMin: pMin,
      pMax: pMax,
      pAvg: pAvg
    };
  }

  function volumeToMl(value, unit) {
    var v = num(value);
    if (v == null) return null;
    switch (unit) {
      case 'mL':
      case 'cm3':
        return v;
      case 'L':
        return v * 1000;
      case 'US fl oz':
        return v * ML_PER_US_FLOZ;
      case 'US gal':
        return v * ML_PER_US_GAL;
      default:
        return null;
    }
  }

  function flowToLph(value, unit) {
    var v = num(value);
    if (v == null) return null;
    if (unit === 'L/h' || unit === 'LPH') return v;
    if (unit === 'gph') return v * LPH_PER_GPH;
    return null;
  }

  function depthToMm(value, unit) {
    var v = num(value);
    if (v == null) return null;
    if (unit === 'mm') return v;
    if (unit === 'in') return v * 25.4;
    return null;
  }

  /**
   * Convierte muestras al vector canónico según el tipo de medición.
   * kind: depth | volume | flow
   */
  function samplesToCanonical(samples, opts) {
    opts = opts || {};
    var kind = opts.kind || 'flow';
    var unit = opts.unit || 'L/h';
    var minutes = num(opts.catchMinutes);
    var areaCm2 = num(opts.catchAreaCm2);
    var out = [];
    (samples || []).forEach(function (s, i) {
      var raw = typeof s === 'number' ? s : (s && s.value);
      var n = num(raw);
      var row = {
        index: i,
        label: (s && s.label) || ('Muestra ' + (i + 1)),
        raw: n,
        low: false
      };
      if (n == null) {
        out.push(row);
        return;
      }
      if (kind === 'depth') {
        row.mm = depthToMm(n, unit);
        row.lph = null;
      } else if (kind === 'volume') {
        var ml = volumeToMl(n, unit);
        row.ml = ml;
        if (ml != null && minutes && minutes > 0) row.lph = (ml / 1000) / (minutes / 60);
        if (ml != null && areaCm2 && areaCm2 > 0) row.mm = (ml / areaCm2) * 10;
      } else {
        row.lph = flowToLph(n, unit);
      }
      out.push(row);
    });
    return out;
  }

  function emittersPerM2(opts) {
    var d = num(opts && opts.emittersPerM2);
    if (d != null && d > 0) return d;
    var row = num(opts && opts.rowM);
    var emit = num(opts && opts.emitM);
    if (row != null && emit != null && row > 0 && emit > 0) return 1 / (row * emit);
    return null;
  }

  function waterApplied(meanLph, meanMm, opts) {
    var hours = num(opts && opts.irrigHours);
    var dens = emittersPerM2(opts);
    var mm = num(meanMm);
    var lph = num(meanLph);
    if (mm == null && lph != null && hours != null && dens != null) {
      mm = lph * hours * dens; /* L/m² = mm */
    }
    var m3ha = mm != null ? mm * 10 : null;
    var lPerEmitter = lph != null && hours != null ? lph * hours : null;
    return {
      mm: mm,
      m3ha: m3ha,
      lPerEmitter: lPerEmitter,
      hours: hours,
      emittersPerM2: dens
    };
  }

  function analyzeLot(samples, opts) {
    opts = opts || {};
    var rows = samplesToCanonical(samples, opts);
    var kind = opts.kind || 'flow';
    rows.forEach(function (r) {
      if (kind === 'depth') r.canonical = r.mm != null ? r.mm : null;
      else if (kind === 'volume') r.canonical = r.lph != null ? r.lph : (r.ml != null ? r.ml : null);
      else r.canonical = r.lph != null ? r.lph : null;
    });
    var valid = rows.filter(function (r) { return r.canonical != null; });
    var series = valid.map(function (r) { return r.canonical; });

    var du = distributionUniformity(series);
    if (!du.ok) {
      return { ok: false, error: du.error, rows: rows, n: series.length };
    }
    var cu = christiansenCu(series);
    var sd = stdevSample(series);
    var cv = sd != null && du.mean ? 100 * sd / du.mean : null;
    var k = du.nLow;
    var sortedValid = valid.slice().sort(function (a, b) { return a.canonical - b.canonical; });
    var lowSet = {};
    sortedValid.slice(0, k).forEach(function (r) { lowSet[r.index] = true; });
    var thresh = 0.9 * du.mean;
    rows.forEach(function (r) {
      r.lowQuarter = !!lowSet[r.index];
      r.lowFlow = r.canonical != null && r.canonical < thresh;
      r.pctOfMean = r.canonical != null && du.mean ? 100 * r.canonical / du.mean : null;
    });

    var meanLph = kind === 'depth' ? null : du.mean;
    var meanMm = kind === 'depth' ? du.mean : null;
    if (kind === 'volume' && rows.some(function (r) { return r.mm != null; })) {
      meanMm = mean(rows.map(function (r) { return r.mm; }).filter(function (v) { return v != null; }));
    }
    var water = waterApplied(meanLph, meanMm, opts);
    var waterLow = null;
    if (water.mm != null) {
      waterLow = {
        mm: water.mm * (du.du / 100),
        m3ha: water.m3ha != null ? water.m3ha * (du.du / 100) : null
      };
    } else if (water.lPerEmitter != null) {
      waterLow = { lPerEmitter: water.lPerEmitter * (du.du / 100) };
    }

    var dose = num(opts.doseKgHa);
    var conc = num(opts.concKgM3);
    var fert = null;
    var doseAvg = dose;
    if (doseAvg == null && conc != null && water.m3ha != null) doseAvg = conc * water.m3ha;
    if (doseAvg != null) {
      var maxRatio = du.max / du.mean;
      fert = {
        doseAvgKgHa: doseAvg,
        doseLowKgHa: doseAvg * (du.du / 100),
        doseHighKgHa: doseAvg * maxRatio,
        gapKgHa: doseAvg * (1 - du.du / 100),
        concKgM3: conc
      };
    }

    var euField = null;
    if (opts.cvf != null && opts.ep != null) {
      euField = emissionUniformity({
        cvf: opts.cvf,
        ep: opts.ep,
        qmin: du.min,
        qavg: du.mean
      });
    }

    return {
      ok: true,
      n: du.n,
      recommended: du.n >= 16 ? 'ok' : du.n >= 4 ? 'minimo' : 'pocas',
      mean: du.mean,
      min: du.min,
      max: du.max,
      median: median(series),
      stdev: sd,
      cvPct: cv,
      du: du.du,
      cu: cu,
      qminOverQavg: du.qminOverQavg,
      nLow: du.nLow,
      lowQuarterMean: du.lowQuarterMean,
      band: duBand(du.du),
      rows: rows,
      lowLabels: rows.filter(function (r) { return r.lowQuarter; }).map(function (r) { return r.label; }),
      water: water,
      waterLow: waterLow,
      fert: fert,
      euField: euField
    };
  }

  function emptyLot(title, nSamples) {
    var n = Number(nSamples);
    if (!Number.isFinite(n) || n < 1) n = 4;
    var samples = [];
    for (var i = 0; i < n; i += 1) {
      samples.push({ label: 'Muestra ' + (i + 1), value: '' });
    }
    return { title: title || 'Lote 1', samples: samples };
  }

  return {
    PSI_PER_MCA: PSI_PER_MCA,
    lowQuarterCount: lowQuarterCount,
    distributionUniformity: distributionUniformity,
    christiansenCu: christiansenCu,
    duBand: duBand,
    emissionUniformity: emissionUniformity,
    flowFromPressure: flowFromPressure,
    psiToMca: psiToMca,
    mcaToPsi: mcaToPsi,
    designPressures: designPressures,
    volumeToMl: volumeToMl,
    flowToLph: flowToLph,
    depthToMm: depthToMm,
    samplesToCanonical: samplesToCanonical,
    emittersPerM2: emittersPerM2,
    waterApplied: waterApplied,
    analyzeLot: analyzeLot,
    emptyLot: emptyLot,
    round: round,
    mean: mean
  };
});
