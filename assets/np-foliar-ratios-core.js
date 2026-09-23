/**
 * NutriPlant PRO — Relaciones foliar.
 * Real = resultado A / resultado B.
 * Ideal = óptimo A / óptimo B (sigue los óptimos editables del mismo análisis).
 * P/Zn y Ca/B: el macro (% MS) se pasa a ppm (× 10 000) para comparar en la misma unidad.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof root !== 'undefined') {
    root.NpFoliarRatios = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_MACRO = { N: 3, P: 0.275, K: 2.5, Ca: 1.25, Mg: 0.4, S: 0.325 };
  var DEFAULT_MICRO = { Fe: 150, Mn: 160, Zn: 60, Cu: 15, B: 62.5, Mo: 2.55 };
  var MACRO_KEYS = ['N', 'P', 'K', 'Ca', 'Mg', 'S'];
  var MICRO_KEYS = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'];
  var PCT_TO_PPM = 10000;

  function parseNum(v) {
    if (v === undefined || v === null || v === '') return NaN;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }

  function pair(a, b) {
    if (!isFinite(a) || !isFinite(b) || b === 0) return NaN;
    return a / b;
  }

  var RATIOS = [
    { id: 'n_k', label: 'N / K', compute: function (g) { return pair(g.N, g.K); } },
    { id: 'n_p', label: 'N / P', compute: function (g) { return pair(g.N, g.P); } },
    { id: 'n_s', label: 'N / S', compute: function (g) { return pair(g.N, g.S); } },
    { id: 'ca_k', label: 'Ca / K', compute: function (g) { return pair(g.Ca, g.K); } },
    { id: 'k_mg', label: 'K / Mg', compute: function (g) { return pair(g.K, g.Mg); } },
    { id: 'ca_mg', label: 'Ca / Mg', compute: function (g) { return pair(g.Ca, g.Mg); } },
    {
      id: 'k_ca_mg',
      label: 'K / (Ca + Mg)',
      compute: function (g) {
        if (!isFinite(g.K) || !isFinite(g.Ca) || !isFinite(g.Mg)) return NaN;
        return pair(g.K, g.Ca + g.Mg);
      }
    },
    {
      id: 'p_zn',
      label: 'P / Zn',
      compute: function (g) {
        return pair(isFinite(g.P) ? g.P * PCT_TO_PPM : NaN, g.Zn);
      }
    },
    { id: 'fe_mn', label: 'Fe / Mn', compute: function (g) { return pair(g.Fe, g.Mn); } },
    {
      id: 'ca_b',
      label: 'Ca / B',
      compute: function (g) {
        return pair(isFinite(g.Ca) ? g.Ca * PCT_TO_PPM : NaN, g.B);
      }
    }
  ];

  function mapResults(macros, micros) {
    var out = {};
    MACRO_KEYS.forEach(function (k) {
      out[k] = parseNum(macros && macros[k]);
    });
    MICRO_KEYS.forEach(function (k) {
      out[k] = parseNum(micros && micros[k]);
    });
    return out;
  }

  function mapOptima(optMacro, optMicro) {
    var out = {};
    MACRO_KEYS.forEach(function (k) {
      var n = parseNum(optMacro && optMacro[k]);
      out[k] = !isNaN(n) ? n : DEFAULT_MACRO[k];
    });
    MICRO_KEYS.forEach(function (k) {
      var n = parseNum(optMicro && optMicro[k]);
      out[k] = !isNaN(n) ? n : DEFAULT_MICRO[k];
    });
    return out;
  }

  function dopPct(actual, ideal) {
    if (!isFinite(actual) || !isFinite(ideal) || ideal === 0) return NaN;
    return ((actual - ideal) / ideal) * 100;
  }

  function formatRatio(n) {
    if (!isFinite(n)) return '';
    var abs = Math.abs(n);
    if (abs >= 100) return n.toFixed(1);
    return n.toFixed(2);
  }

  function evaluateAnalysis(analysis) {
    var src = analysis || {};
    var actuals = mapResults(src.macros, src.micros);
    var ideals = mapOptima(src.optimalMacro, src.optimalMicro);
    return RATIOS.map(function (def) {
      var actual = def.compute(actuals);
      var ideal = def.compute(ideals);
      return {
        id: def.id,
        label: def.label,
        actual: actual,
        ideal: ideal,
        dop: dopPct(actual, ideal)
      };
    });
  }

  return {
    DEFAULT_MACRO: DEFAULT_MACRO,
    DEFAULT_MICRO: DEFAULT_MICRO,
    RATIOS: RATIOS,
    PCT_TO_PPM: PCT_TO_PPM,
    parseNum: parseNum,
    formatRatio: formatRatio,
    dopPct: dopPct,
    evaluateAnalysis: evaluateAnalysis
  };
});
