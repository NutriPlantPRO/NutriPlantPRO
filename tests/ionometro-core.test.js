'use strict';

var assert = require('node:assert/strict');
var core = require('../assets/np-ionometro-core.js');

function close(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= (tolerance || 0.02),
    actual + ' no está cerca de ' + expected
  );
}

module.exports = [
  {
    name: 'ionómetro: 280 ppm NO₃⁻ son 4.5 meq y como N son 20',
    run: function () {
      close(core.meqFromPpm('no3', 'NO3', '280'), 4.516, 0.01);
      close(core.meqFromPpm('no3', 'N', 280), 20, 0.01);
    }
  },
  {
    name: 'ionómetro: 95 ppm PO₄ y 31 ppm P son 1 meq',
    run: function () {
      close(core.meqFromPpm('p', 'PO4', 95), 1, 0.01);
      close(core.meqFromPpm('p', 'P', 31), 1, 0.01);
    }
  },
  {
    name: 'ionómetro: un hueco corta la línea y no la une',
    run: function () {
      var runs = core.segments([4, null, 4, 5]);
      assert.deepEqual(runs, [[0], [2, 3]]);
    }
  },
  {
    name: 'ionómetro: sin números no hay tramos',
    run: function () {
      assert.deepEqual(core.segments([null, null]), []);
      assert.equal(core.hasAny([null, null]), false);
    }
  },
  {
    name: 'ionómetro: el porcentaje sale con dos iones del grupo',
    run: function () {
      var one = core.proportions({ k: 391 }, core.defaultForms());
      assert.equal(one.cations.length, 0);
      var two = core.proportions({ k: 391, ca: 200.4 }, core.defaultForms());
      assert.equal(two.cations.length, 2);
      close(two.cations[0].pct, 50, 0.2);
    }
  },
  {
    name: 'ionómetro: la CE compara cationes con 10 meq por dS/m',
    run: function () {
      var row = core.proportions({ ec: 2.2, k: 391 }, core.defaultForms());
      close(row.ecNote.expected, 22, 0.01);
      close(row.ecNote.cationSum, 10, 0.05);
    }
  },
  {
    name: 'ionómetro: 280 ppm NO₃⁻ se comparan como N contra la franja',
    run: function () {
      close(core.elementalPpm('no3', 'NO3', 280), 63.23, 0.05);
      assert.equal(core.refLevel(core.elementalPpm('no3', 'NO3', 280), 140, 200), 'low');
      assert.equal(core.refLevel(core.elementalPpm('no3', 'N', 280), 140, 200), 'high');
      var shown = core.bandInForm('no3', 'NO3', [140, 200]);
      close(shown[0], 620, 0.2);
      close(shown[1], 885.71, 0.2);
    }
  },
  {
    name: 'ionómetro: foliar no enciende franja y la de NutriPlant no cuenta como editada',
    run: function () {
      assert.equal(core.sampleHasBand('foliar'), false);
      assert.equal(core.sampleHasBand('solution'), true);
      assert.equal(core.sampleHasBand('paste'), true);
      assert.equal(core.bandsDiffer(null), false);
      assert.equal(core.bandsDiffer({ no3: [140, 200] }), false);
      assert.equal(core.bandsDiffer({ no3: [100, 180] }), true);
    }
  }
];
