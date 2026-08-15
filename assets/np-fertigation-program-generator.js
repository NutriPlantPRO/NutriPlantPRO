/**
 * NutriPlant — generador agronómico puro para programas de fertirriego.
 * Entradas y salidas en SI agronómico (kg/ha y m³/ha).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (root) root.NpFertigationProgramGenerator = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var TARGET_KEYS = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
  var MATERIAL_SEQUENCE = [
    { id: 'nitrato_calcio_granular', target: 'CaO', order: 10 },
    { id: 'nitrato_magnesio', target: 'MgO', order: 20 },
    { id: 'map', target: 'P2O5', order: 30 },
    { id: 'mkp', target: 'P2O5', order: 31 },
    { id: 'nks', target: 'N', order: 40 },
    { id: 'sop', target: 'K2O', order: 41 },
    { id: 'sulfato_magnesio', target: 'MgO', order: 50 },
    { id: 'sulfato_amonio_soluble', target: 'N', order: 51 },
    { id: 'fe_eddha', target: 'Fe', order: 60 },
    { id: 'quelato_mn', target: 'Mn', order: 61 },
    { id: 'acido_borico', target: 'B', order: 62 },
    { id: 'quelato_zn', target: 'Zn', order: 63 },
    { id: 'quelato_cu', target: 'Cu', order: 64 },
    { id: 'molibdato_sodio', target: 'Mo', order: 65 }
  ];

  function num(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function nonNegativeMap(source) {
    var out = {};
    TARGET_KEYS.forEach(function (key) { out[key] = Math.max(0, num(source && source[key])); });
    return out;
  }

  function materialContributionPerKg(material) {
    var m = material || {};
    return {
      N: (num(m.N_NO3) + num(m.N_NH4) + num(m.N)) / 100,
      P2O5: num(m.P2O5) / 100,
      K2O: num(m.K2O) / 100,
      CaO: num(m.CaO) / 100,
      MgO: num(m.MgO) / 100,
      SO4: (num(m.SO4) + num(m.S) * 3) / 100,
      Fe: num(m.Fe) / 100,
      Mn: num(m.Mn) / 100,
      B: num(m.B) / 100,
      Zn: num(m.Zn) / 100,
      Cu: num(m.Cu) / 100,
      Mo: num(m.Mo) / 100,
      SiO2: (num(m.SiO2) + num(m.Si) * 2.139) / 100
    };
  }

  function addMaps(a, b) {
    var out = {};
    TARGET_KEYS.forEach(function (key) { out[key] = num(a && a[key]) + num(b && b[key]); });
    return out;
  }

  function subtractMaps(a, b) {
    var out = {};
    TARGET_KEYS.forEach(function (key) { out[key] = Math.max(0, num(a && a[key]) - num(b && b[key])); });
    return out;
  }

  function scaleMap(source, factor) {
    var out = {};
    TARGET_KEYS.forEach(function (key) { out[key] = num(source && source[key]) * factor; });
    return out;
  }

  function proportionalWater(totalWater, depths) {
    var list = Array.isArray(depths) ? depths.map(function (v) { return Math.max(0, num(v)); }) : [];
    var totalDepth = list.reduce(function (sum, v) { return sum + v; }, 0);
    var water = nonNegativeMap(totalWater);
    var hasWater = TARGET_KEYS.some(function (key) { return water[key] > 1e-10; });
    if (hasWater && totalDepth <= 0) {
      return { ok: false, reason: 'water-depth-required', byStage: [], totalDepth: 0 };
    }
    return {
      ok: true,
      reason: '',
      totalDepth: totalDepth,
      byStage: list.map(function (depth) {
        return totalDepth > 0 ? scaleMap(water, depth / totalDepth) : nonNegativeMap({});
      })
    };
  }

  function maxSafeDose(contribution, remaining, targetKey) {
    if (!(contribution[targetKey] > 0) || !(remaining[targetKey] > 1e-10)) return 0;
    var max = remaining[targetKey] / contribution[targetKey];
    TARGET_KEYS.forEach(function (key) {
      var c = contribution[key];
      if (!(c > 0)) return;
      max = Math.min(max, remaining[key] / c);
    });
    return Math.max(0, max);
  }

  function solveStage(target, water, materials, options) {
    var opts = options || {};
    var tolerance = Math.max(1e-9, num(opts.tolerance) || 1e-7);
    var stageTarget = nonNegativeMap(target);
    var stageWater = nonNegativeMap(water);
    var fertilizerTarget = subtractMaps(stageTarget, stageWater);
    var remaining = nonNegativeMap(fertilizerTarget);
    var supplied = nonNegativeMap({});
    var rows = [];
    var byId = {};
    (Array.isArray(materials) ? materials : []).forEach(function (m) {
      if (m && m.id && !byId[m.id]) byId[m.id] = m;
    });

    MATERIAL_SEQUENCE.forEach(function (step) {
      var material = byId[step.id];
      if (!material) return;
      var contribution = materialContributionPerKg(material);
      var dose = maxSafeDose(contribution, remaining, step.target);
      if (!(dose > tolerance)) return;
      var rowContribution = scaleMap(contribution, dose);
      rows.push({
        materialId: step.id,
        doseKgHa: dose,
        target: step.target,
        order: step.order,
        contribution: rowContribution
      });
      supplied = addMaps(supplied, rowContribution);
      remaining = subtractMaps(fertilizerTarget, supplied);
    });

    var unresolved = TARGET_KEYS.filter(function (key) { return remaining[key] > tolerance; });
    var totalWithWater = addMaps(supplied, stageWater);
    var excess = {};
    TARGET_KEYS.forEach(function (key) {
      excess[key] = Math.max(0, totalWithWater[key] - stageTarget[key]);
    });
    return {
      target: stageTarget,
      water: stageWater,
      fertilizerTarget: fertilizerTarget,
      supplied: supplied,
      totalWithWater: totalWithWater,
      remaining: remaining,
      excess: excess,
      unresolved: unresolved,
      rows: rows
    };
  }

  function generate(input) {
    var data = input || {};
    var stages = Array.isArray(data.stages) ? data.stages.slice() : [];
    var targets = Array.isArray(data.targetsByStage) ? data.targetsByStage : [];
    if (!stages.length || targets.length !== stages.length) {
      return { ok: false, reason: 'invalid-stages', stages: [] };
    }
    if (data.axis !== 'semana' && data.axis !== 'mes') {
      return { ok: false, reason: 'time-axis-required', stages: [] };
    }
    var water = proportionalWater(data.waterContribution, data.waterDepths);
    if (!water.ok) return { ok: false, reason: water.reason, stages: [] };
    var results = stages.map(function (stage, index) {
      var solved = solveStage(targets[index], water.byStage[index], data.materials, data.options);
      solved.name = String(stage || '');
      solved.index = index;
      solved.waterDepthM3Ha = Math.max(0, num(data.waterDepths && data.waterDepths[index]));
      return solved;
    });
    var used = {};
    results.forEach(function (stage) {
      stage.rows.forEach(function (row) { used[row.materialId] = true; });
    });
    return {
      ok: true,
      reason: '',
      axis: data.axis,
      stages: results,
      materialIds: MATERIAL_SEQUENCE.map(function (x) { return x.id; }).filter(function (id) { return used[id]; }),
      totalDepthM3Ha: water.totalDepth,
      hasUnresolved: results.some(function (stage) { return stage.unresolved.length > 0; }),
      hasWaterExcess: results.some(function (stage) {
        return TARGET_KEYS.some(function (key) { return stage.excess[key] > 1e-7; });
      })
    };
  }

  return {
    TARGET_KEYS: TARGET_KEYS.slice(),
    MATERIAL_SEQUENCE: MATERIAL_SEQUENCE.slice(),
    materialContributionPerKg: materialContributionPerKg,
    proportionalWater: proportionalWater,
    solveStage: solveStage,
    generate: generate
  };
});
