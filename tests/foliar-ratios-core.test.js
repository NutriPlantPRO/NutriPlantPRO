'use strict';

var assert = require('node:assert/strict');
var R = require('../assets/np-foliar-ratios-core.js');

module.exports = [
  {
    name: 'Foliar ratios: ideales por defecto salen de los óptimos NutriPlant',
    run: function () {
      var rows = R.evaluateAnalysis({});
      var byId = {};
      rows.forEach(function (row) { byId[row.id] = row; });
      assert.ok(Math.abs(byId.n_k.ideal - (3 / 2.5)) < 1e-9);
      assert.ok(Math.abs(byId.ca_k.ideal - (1.25 / 2.5)) < 1e-9);
      assert.ok(Math.abs(byId.k_ca_mg.ideal - (2.5 / (1.25 + 0.4))) < 1e-9);
      assert.ok(Math.abs(byId.p_zn.ideal - ((0.275 * 10000) / 60)) < 1e-9);
      assert.ok(Math.abs(byId.ca_b.ideal - ((1.25 * 10000) / 62.5)) < 1e-9);
      assert.ok(isNaN(byId.n_k.actual));
    }
  },
  {
    name: 'Foliar ratios: editar óptimo Ca recalcula Ca/K y Ca/B ideales',
    run: function () {
      var rows = R.evaluateAnalysis({ optimalMacro: { Ca: 2 } });
      var caK = rows.find(function (row) { return row.id === 'ca_k'; });
      var caB = rows.find(function (row) { return row.id === 'ca_b'; });
      assert.ok(Math.abs(caK.ideal - (2 / 2.5)) < 1e-9);
      assert.ok(Math.abs(caB.ideal - ((2 * 10000) / 62.5)) < 1e-9);
    }
  },
  {
    name: 'Foliar ratios: real vs ideal usa resultados y misma fórmula DOP',
    run: function () {
      var rows = R.evaluateAnalysis({
        macros: { N: 1.644, P: 0.174, K: 1.779, Ca: 0.141, Mg: 0.015, S: 0.2 },
        micros: { Fe: 80, Mn: 40, Zn: 20, B: 30 }
      });
      var caK = rows.find(function (row) { return row.id === 'ca_k'; });
      var expectedActual = 0.141 / 1.779;
      var expectedIdeal = 1.25 / 2.5;
      var expectedDop = ((expectedActual - expectedIdeal) / expectedIdeal) * 100;
      assert.ok(Math.abs(caK.actual - expectedActual) < 1e-9);
      assert.ok(Math.abs(caK.ideal - expectedIdeal) < 1e-9);
      assert.ok(Math.abs(caK.dop - expectedDop) < 1e-6);
      assert.ok(caK.dop < -50);
    }
  },
  {
    name: 'Foliar ratios: P/Zn convierte % MS a ppm',
    run: function () {
      var rows = R.evaluateAnalysis({
        macros: { P: 0.3 },
        micros: { Zn: 30 },
        optimalMacro: { P: 0.3 },
        optimalMicro: { Zn: 30 }
      });
      var pZn = rows.find(function (row) { return row.id === 'p_zn'; });
      assert.ok(Math.abs(pZn.actual - 100) < 1e-9);
      assert.ok(Math.abs(pZn.ideal - 100) < 1e-9);
      assert.ok(Math.abs(pZn.dop) < 1e-9);
    }
  },
  {
    name: 'Foliar ratios: catálogo compare foliar incluye las 10 relaciones',
    run: function () {
      var g = typeof globalThis !== 'undefined' ? globalThis : global;
      g.NpFoliarRatios = R;
      g.window = g.window || g;
      delete require.cache[require.resolve('../assets/np-lab-type-configs.js')];
      require('../assets/np-lab-type-configs.js');
      var cfg = g.NpLabTypeConfigs.resolveType('foliar');
      var ratioFields = (cfg.fields || []).filter(function (f) { return f.block === 'ratios'; });
      assert.equal(ratioFields.length, R.RATIOS.length);
      var caK = ratioFields.find(function (f) { return f.path === 'ratio.ca_k'; });
      assert.ok(caK);
      var actual = caK.getValue({
        macros: { Ca: 0.141, K: 1.779 }
      });
      assert.ok(Math.abs(actual - (0.141 / 1.779)) < 1e-9);
    }
  }
];
