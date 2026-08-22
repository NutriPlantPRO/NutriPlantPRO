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
  var MICRO_TARGETS = { Fe: 1, Mn: 1, B: 1, Zn: 1, Cu: 1, Mo: 1 };
  var MIN_BULK_DOSE_KG_HA = 3;
  var MIN_MICRO_DOSE_KG_HA = 0.05;
  var MATERIAL_SEQUENCE = [
    { id: 'nitrato_calcio_granular', target: 'CaO', order: 10 },
    { id: 'mkp', target: 'P2O5', order: 30 },
    { id: 'map', target: 'P2O5', order: 31 },
    { id: 'nks', target: 'K2O', order: 40 },
    { id: 'sop', target: 'K2O', order: 41 },
    { id: 'sulfonit_33_00_00_2s', target: 'N', order: 42 },
    { id: 'fosfonitrato_33_03_00', target: 'N', order: 43 },
    { id: 'sulfato_magnesio', target: 'MgO', order: 45 },
    { id: 'nitrato_magnesio', target: 'MgO', order: 46 },
    { id: 'fe_eddha', target: 'Fe', order: 60 },
    { id: 'quelato_mn', target: 'Mn', order: 61 },
    { id: 'acido_borico', target: 'B', order: 62 },
    { id: 'quelato_zn', target: 'Zn', order: 63 },
    { id: 'quelato_cu', target: 'Cu', order: 64 },
    { id: 'molibdato_sodio', target: 'Mo', order: 65 }
  ];
  var MICRO_SEQUENCE = MATERIAL_SEQUENCE.filter(function (step) {
    return MICRO_TARGETS[step.target];
  });
  var NITROGEN_FILL_SEQUENCE = [
    { id: 'sulfonit_33_00_00_2s', order: 42 },
    { id: 'fosfonitrato_33_03_00', order: 43 }
  ];

  function stageBlocksMap(name) {
    var s = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return /preflor|floracion|\bflor\b|amarre|pre-?flower|flowering|\bflower\b|fruit.?set/.test(s);
  }

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

  function proportionalBase(totalBase, targetsByStage) {
    var targets = Array.isArray(targetsByStage) ? targetsByStage : [];
    var base = nonNegativeMap(totalBase);
    var cycleTarget = nonNegativeMap({});
    targets.forEach(function (target) {
      cycleTarget = addMaps(cycleTarget, nonNegativeMap(target));
    });
    return targets.map(function (target) {
      var stageTarget = nonNegativeMap(target);
      var out = {};
      TARGET_KEYS.forEach(function (key) {
        var share = cycleTarget[key] > 1e-10
          ? stageTarget[key] / cycleTarget[key]
          : (targets.length ? 1 / targets.length : 0);
        out[key] = base[key] * share;
      });
      return out;
    });
  }

  function maxSafeDose(contribution, remaining, targetKey, ignoreKeys) {
    if (!(contribution[targetKey] > 0) || !(remaining[targetKey] > 1e-10)) return 0;
    var skip = ignoreKeys || [];
    var max = remaining[targetKey] / contribution[targetKey];
    TARGET_KEYS.forEach(function (key) {
      if (skip.indexOf(key) >= 0) return;
      var c = contribution[key];
      if (!(c > 0)) return;
      max = Math.min(max, remaining[key] / c);
    });
    return Math.max(0, max);
  }

  function minPracticalDoseKg(targetKey) {
    return MICRO_TARGETS[targetKey] ? MIN_MICRO_DOSE_KG_HA : MIN_BULK_DOSE_KG_HA;
  }

  function solveStage(target, water, materials, options) {
    var opts = options || {};
    var tolerance = Math.max(1e-9, num(opts.tolerance) || 1e-7);
    var stageTarget = nonNegativeMap(target);
    var stageWater = nonNegativeMap(water);
    var stageBase = nonNegativeMap(opts.base);
    var externalContribution = addMaps(stageWater, stageBase);
    var fertilizerTarget = subtractMaps(stageTarget, externalContribution);
    var remaining = nonNegativeMap(fertilizerTarget);
    var supplied = nonNegativeMap({});
    var rows = [];
    var byId = {};
    (Array.isArray(materials) ? materials : []).forEach(function (m) {
      if (m && m.id && !byId[m.id]) byId[m.id] = m;
    });

    function acidTargetKey(materialId) {
      var s = String(materialId || '');
      if (s.indexOf('fosforico') >= 0) return 'P2O5';
      if (s.indexOf('sulfurico') >= 0) return 'SO4';
      return 'N';
    }

    function rowAmountMeta(material, doseKgHa, extra) {
      extra = extra || {};
      var density = num(material && material.density) || num(extra.densityKgL) || 0;
      var isLiquid = String(material && material.unit || '').toUpperCase() === 'L' && density > 0;
      return {
        doseAmount: isLiquid ? doseKgHa / density : doseKgHa,
        amountUnit: isLiquid ? 'L' : 'kg',
        densityKgL: density
      };
    }

    function applyStep(step) {
      var material = byId[step.id];
      if (!material) return 0;
      var contribution = materialContributionPerKg(material);
      var dose = maxSafeDose(contribution, remaining, step.target, step.ignoreKeys);
      if (step.maxDose != null && isFinite(Number(step.maxDose))) {
        dose = Math.min(dose, Math.max(0, num(step.maxDose)));
      }
      if (!(dose > tolerance)) return 0;
      var rowContribution = scaleMap(contribution, dose);
      var existing = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].materialId === step.id) { existing = rows[i]; break; }
      }
      if (existing) {
        existing.doseKgHa += dose;
        existing.contribution = addMaps(existing.contribution, rowContribution);
        var meta = rowAmountMeta(material, existing.doseKgHa, existing);
        existing.doseAmount = meta.doseAmount;
        existing.amountUnit = meta.amountUnit;
      } else {
        var amount = rowAmountMeta(material, dose, step);
        rows.push({
          materialId: step.id,
          doseKgHa: dose,
          doseAmount: amount.doseAmount,
          amountUnit: amount.amountUnit,
          target: step.target,
          order: step.order,
          contribution: rowContribution
        });
      }
      supplied = addMaps(supplied, rowContribution);
      remaining = subtractMaps(fertilizerTarget, supplied);
      return dose;
    }

    function applyFixedAcid(acid, depthM3Ha) {
      if (!acid || !(num(acid.mlPerM3) > 0) || !(num(depthM3Ha) > 0)) return 0;
      var materialId = acid.materialId || 'acido_nitrico_55';
      var material = byId[materialId];
      if (!material) return 0;
      var litersHa = num(acid.mlPerM3) * num(depthM3Ha) / 1000;
      var density = num(material.density) || num(acid.densityKgL) || 1.33;
      var kgHa = litersHa * density;
      if (!(kgHa > tolerance) && !(litersHa > tolerance)) return 0;
      var contribution = materialContributionPerKg(material);
      var rowContribution = scaleMap(contribution, kgHa);
      rows.push({
        materialId: materialId,
        doseKgHa: kgHa,
        doseAmount: litersHa,
        amountUnit: 'L',
        target: acidTargetKey(materialId),
        order: 1,
        contribution: rowContribution,
        skipMinDose: true,
        fixed: true
      });
      supplied = addMaps(supplied, rowContribution);
      remaining = subtractMaps(fertilizerTarget, supplied);
      return kgHa;
    }

    var allowMap = !stageBlocksMap(opts.stageName);
    var magSource = null;
    var nitrogenFillId = null;

    function practicalDose(id, target, ignoreKeys) {
      var material = byId[id];
      if (!material) return 0;
      return maxSafeDose(materialContributionPerKg(material), remaining, target, ignoreKeys);
    }

    function applyLeftoverNitrogen() {
      if (!(remaining.N > tolerance)) return;
      if (nitrogenFillId) {
        applyStep({ id: nitrogenFillId, target: 'N', order: 42, ignoreKeys: ['SO4'] });
        return;
      }
      var i;
      for (i = 0; i < NITROGEN_FILL_SEQUENCE.length; i++) {
        var step = NITROGEN_FILL_SEQUENCE[i];
        if (practicalDose(step.id, 'N', ['SO4']) + 1e-9 < MIN_BULK_DOSE_KG_HA) continue;
        var dose = applyStep({ id: step.id, target: 'N', order: step.order, ignoreKeys: ['SO4'] });
        if (dose > 0) {
          nitrogenFillId = step.id;
          return;
        }
      }
    }

    function sulfateTargetAlreadyMet() {
      return !(remaining.SO4 > tolerance);
    }

    function applyMagnesium() {
      if (!(remaining.MgO > tolerance)) return;
      if (magSource === 'sulfate') {
        applyStep({ id: 'sulfato_magnesio', target: 'MgO', order: 45, ignoreKeys: ['SO4'] });
        return;
      }
      if (magSource === 'nitrate') {
        var moreNitrate = practicalDose('nitrato_magnesio', 'MgO');
        if (moreNitrate > tolerance) {
          applyStep({ id: 'nitrato_magnesio', target: 'MgO', order: 46 });
          return;
        }
        if (remaining.MgO > tolerance) magSource = null;
      }
      // When S is already covered (water/granular/acid), prefer Mg nitrate to avoid more SO₄.
      // Otherwise use Mg nitrate while N still has room for a bulk dose.
      var nitrateRoom = practicalDose('nitrato_magnesio', 'MgO');
      if (nitrateRoom > tolerance && (sulfateTargetAlreadyMet() || nitrateRoom + 1e-9 >= MIN_BULK_DOSE_KG_HA)) {
        var nitrateDose = applyStep({ id: 'nitrato_magnesio', target: 'MgO', order: 46 });
        if (nitrateDose > 0) {
          magSource = 'nitrate';
          return;
        }
      }
      if (remaining.MgO > tolerance) {
        var sulfateDose = applyStep({ id: 'sulfato_magnesio', target: 'MgO', order: 45, ignoreKeys: ['SO4'] });
        if (sulfateDose > 0) magSource = 'sulfate';
      }
    }

    function applyMacroPass() {
      // Acid already applied. Ca nitrate → Ca (+N). MKP → P (+K). MAP leftover P after flower.
      // NKS → remaining K (+N). Incidental SO₄ must not block K.
      // SOP only if N already full and K remains (also not blocked by a full S).
      // Mg before leftover N: if S is already covered, Mg nitrate uses N first; Sulfonit is last for N.
      // Mg sulfate only when N is full and Mg nitrate cannot close Mg (SO₄ excess is reported).
      applyStep({ id: 'nitrato_calcio_granular', target: 'CaO', order: 10 });
      applyStep({ id: 'mkp', target: 'P2O5', order: 30 });
      if (allowMap) applyStep({ id: 'map', target: 'P2O5', order: 31 });
      applyStep({ id: 'nks', target: 'K2O', order: 40, ignoreKeys: ['SO4'] });
      applyStep({ id: 'sop', target: 'K2O', order: 41, ignoreKeys: ['SO4'] });
      applyMagnesium();
      applyLeftoverNitrogen();
      MICRO_SEQUENCE.forEach(function (step) { applyStep(step); });
    }

    applyFixedAcid(opts.acid, opts.waterDepthM3Ha);
    applyMacroPass();
    var guard = 0;
    var progressed = true;
    while (progressed && guard < 3) {
      var before = rows.reduce(function (s, r) { return s + r.doseKgHa; }, 0);
      applyMacroPass();
      var after = rows.reduce(function (s, r) { return s + r.doseKgHa; }, 0);
      progressed = after > before + tolerance;
      guard += 1;
    }

    var kept = [];
    rows.forEach(function (row) {
      if (row.skipMinDose || row.fixed || row.doseKgHa + 1e-9 >= minPracticalDoseKg(row.target)) {
        kept.push(row);
        return;
      }
      supplied = subtractMaps(supplied, row.contribution);
    });
    rows = kept;
    remaining = subtractMaps(fertilizerTarget, supplied);

    var unresolved = TARGET_KEYS.filter(function (key) { return remaining[key] > tolerance; });
    var totalWithWater = addMaps(supplied, externalContribution);
    var excess = {};
    TARGET_KEYS.forEach(function (key) {
      excess[key] = Math.max(0, totalWithWater[key] - stageTarget[key]);
    });
    return {
      target: stageTarget,
      water: stageWater,
      base: stageBase,
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
    var base = proportionalBase(data.baseContribution, targets);
    var results = stages.map(function (stage, index) {
      var depth = Math.max(0, num(data.waterDepths && data.waterDepths[index]));
      var solved = solveStage(targets[index], water.byStage[index], data.materials, Object.assign({}, data.options || {}, {
        acid: data.acid || null,
        base: base[index],
        waterDepthM3Ha: depth,
        stageName: stage
      }));
      solved.name = String(stage || '');
      solved.index = index;
      solved.waterDepthM3Ha = depth;
      return solved;
    });
    var used = {};
    results.forEach(function (stage) {
      stage.rows.forEach(function (row) { used[row.materialId] = true; });
    });
    var acidId = data.acid && data.acid.materialId;
    var materialIds = [];
    if (acidId && used[acidId]) materialIds.push(acidId);
    MATERIAL_SEQUENCE.forEach(function (x) {
      if (used[x.id] && materialIds.indexOf(x.id) < 0) materialIds.push(x.id);
    });
    Object.keys(used).forEach(function (id) {
      if (materialIds.indexOf(id) < 0) materialIds.push(id);
    });
    return {
      ok: true,
      reason: '',
      axis: data.axis,
      stages: results,
      materialIds: materialIds,
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
    MIN_BULK_DOSE_KG_HA: MIN_BULK_DOSE_KG_HA,
    MIN_MICRO_DOSE_KG_HA: MIN_MICRO_DOSE_KG_HA,
    materialContributionPerKg: materialContributionPerKg,
    proportionalWater: proportionalWater,
    proportionalBase: proportionalBase,
    solveStage: solveStage,
    generate: generate,
    stageBlocksMap: stageBlocksMap
  };
});
