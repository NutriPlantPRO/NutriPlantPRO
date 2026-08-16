'use strict';

var assert = require('node:assert/strict');
var suggest = require('../assets/np-fertigation-dist-suggest.js');

function sum100(arr) {
  var s = arr.reduce(function (a, b) { return a + b; }, 0);
  assert.ok(Math.abs(s - 100) <= 0.15, 'sum ' + s);
}

function idx(stages, name) {
  return stages.indexOf(name);
}

module.exports = [
  {
    name: 'sugerir %: suma 100% en las etapas elegidas',
    run: function () {
      var stages = ['Brotación', 'Vegetativo', 'Floración', 'Llenado', 'Maduración'];
      var out = suggest.suggestPct(stages);
      suggest.NUT_IDS.forEach(function (id) {
        assert.equal(out.pct[id].length, 5);
        sum100(out.pct[id]);
      });
    }
  },
  {
    name: 'sugerir %: la fenología mueve N al vegetativo y K al llenado',
    run: function () {
      var stages = ['Brotación', 'Vegetativo', 'Floración', 'Llenado', 'Maduración'];
      var pct = suggest.suggestPct(stages).pct;
      var veg = idx(stages, 'Vegetativo');
      var mad = idx(stages, 'Maduración');
      var bro = idx(stages, 'Brotación');
      var lle = idx(stages, 'Llenado');
      assert.ok(pct.n[veg] > pct.n[mad], pct.n[veg] + ' vs ' + pct.n[mad]);
      assert.ok(pct.k[lle] > pct.k[bro], pct.k[lle] + ' vs ' + pct.k[bro]);
      assert.ok(pct.p[bro] > pct.k[bro] || pct.ca[bro] > pct.k[bro]);
    }
  },
  {
    name: 'sugerir %: con requerimiento típico cada etapa queda en zona Steiner',
    run: function () {
      var stages = ['Brotación', 'Vegetativo', 'Floración', 'Llenado', 'Maduración', 'Establecimiento', 'Prefloración', 'Amarre'];
      var totals = { N: 253.3, P2O5: 42, K2O: 344.7, CaO: 187.2, MgO: 76.7, SO4: 234.8 };
      var out = suggest.suggestPct(stages, { totals: totals });
      assert.equal(out.cycleInZone, true);
      assert.equal(out.stagesInZone, true);
      var tris = suggest.stageTernary(stages, out.pct, totals);
      tris.forEach(function (tri, i) {
        assert.ok(suggest.ternaryInZone(tri), 'stage ' + stages[i] + ' ' + JSON.stringify(tri));
      });
      suggest.NUT_IDS.forEach(function (id) { sum100(out.pct[id]); });
    }
  },
  {
    name: 'sugerir %: reconoce etapas en inglés y nombres sin acento',
    run: function () {
      var stages = ['Bud break', 'Vegetative', 'Flowering', 'Fruit set', 'Maturity'];
      var pct = suggest.suggestPct(stages).pct;
      assert.ok(pct.n[1] > pct.n[4]);
      assert.ok(pct.k[3] > pct.k[0] || pct.ca[3] >= pct.ca[0]);
      var folded = suggest.profileFor('Floracion');
      var withAccent = suggest.profileFor('Floración');
      assert.equal(folded.I, withAccent.I);
      assert.equal(folded.an.n, withAccent.an.n);
    }
  },
  {
    name: 'sugerir %: preflor flor y amarre dejan Mg en 20 y suben Ca',
    run: function () {
      ['Prefloración', 'Floración', 'Amarre'].forEach(function (name) {
        var p = suggest.profileFor(name);
        assert.equal(p.cat.mg, 20);
        assert.ok(p.cat.ca >= 50, name + ' Ca ' + p.cat.ca);
        assert.equal(p.cat.k + p.cat.ca + p.cat.mg, 100);
      });
      assert.ok(suggest.profileFor('Amarre').cat.ca > suggest.profileFor('Prefloración').cat.ca);
    }
  },
  {
    name: 'sugerir %: si el ciclo ya sale de zona, no inventa metas imposibles',
    run: function () {
      var stages = ['Vegetativo', 'Llenado'];
      var totals = { N: 10, P2O5: 200, K2O: 10, CaO: 5, MgO: 5, SO4: 10 };
      var out = suggest.suggestPct(stages, { totals: totals });
      assert.equal(out.cycleInZone, false);
      assert.equal(out.stagesInZone, false);
      sum100(out.pct.n);
      sum100(out.pct.p);
    }
  }
];
