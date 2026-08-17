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
    name: 'sugerir %: con requerimiento típico cada nutriente tiene su curva (meq), ciclo en zona',
    run: function () {
      var stages = ['Brotación', 'Vegetativo', 'Floración', 'Llenado', 'Maduración', 'Establecimiento', 'Prefloración', 'Amarre'];
      var totals = { N: 253.3, P2O5: 42, K2O: 344.7, CaO: 187.2, MgO: 76.7, SO4: 234.8 };
      var out = suggest.suggestPct(stages, { totals: totals });
      assert.equal(out.cycleInZone, true);
      var veg = stages.indexOf('Vegetativo');
      var lle = stages.indexOf('Llenado');
      assert.notEqual(out.pct.n[veg], out.pct.k[veg]);
      assert.ok(out.pct.k[lle] > out.pct.n[lle] || out.pct.k[lle] > out.pct.p[lle]);
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
    name: 'sugerir %: vegetativo→preflor al alza; K y Ca se sostienen hasta flor',
    run: function () {
      var veg = suggest.profileFor('Vegetativo');
      var pre = suggest.profileFor('Prefloración');
      var flor = suggest.profileFor('Floración');
      var amarre = suggest.profileFor('Amarre');
      [veg, pre, flor, amarre].forEach(function (p) {
        assert.equal(p.cat.k + p.cat.ca + p.cat.mg, 100);
      });
      assert.ok(pre.I > veg.I, 'I preflor > vegetativo');
      assert.ok(flor.I >= pre.I, 'I flor ≥ preflor');
      assert.ok(pre.cat.k >= veg.cat.k, 'K % no baja en preflor');
      assert.ok(flor.cat.k >= pre.cat.k, 'K % sigue alza en flor');
      assert.ok(pre.cat.ca >= veg.cat.ca, 'Ca se mantiene a preflor');
      assert.ok(flor.cat.ca >= veg.cat.ca - 2, 'Ca no se corta en flor');
      assert.ok(pre.I * pre.cat.k > veg.I * veg.cat.k);
      assert.ok(pre.I * pre.cat.ca > veg.I * veg.cat.ca);
      assert.ok(amarre.cat.k > pre.cat.k);
    }
  },
  {
    name: 'sugerir %: usa las etapas del usuario; si Llenado se repite, K no queda en bloque',
    run: function () {
      var stages = ['Prefloración', 'Floración', 'Amarre', 'Llenado', 'Llenado', 'Llenado', 'Llenado', 'Maduración'];
      var pct = suggest.suggestPct(stages).pct;
      assert.equal(pct.k.length, 8);
      sum100(pct.k);
      sum100(pct.n);
      assert.ok(pct.k[3] < pct.k[5] || pct.k[3] < pct.k[6], 'K should ramp across repeated Llenado');
      assert.notEqual(pct.k[3], pct.k[6]);
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
      assert.notEqual(out.pct.n[0], out.pct.p[0]);
    }
  },
  {
    name: 'sugerir %: no copia el mismo % a todos los nutrientes (curva meq)',
    run: function () {
      var stages = ['Prefloración', 'Prefloración', 'Amarre', 'Llenado', 'Llenado', 'Llenado', 'Llenado', 'Llenado'];
      var totals = { N: 253.3, P2O5: 42, K2O: 344.7, CaO: 187.2, MgO: 76.7, SO4: 234.8 };
      var pct = suggest.suggestPct(stages, { totals: totals }).pct;
      var i;
      var same = true;
      for (i = 0; i < stages.length; i++) {
        if (Math.abs(pct.n[i] - pct.k[i]) > 0.2 || Math.abs(pct.p[i] - pct.ca[i]) > 0.2) {
          same = false;
          break;
        }
      }
      assert.equal(same, false);
      assert.ok(pct.k[6] > pct.k[0], pct.k[6] + ' vs ' + pct.k[0]);
      assert.ok(pct.p[0] > pct.k[0], pct.p[0] + ' vs ' + pct.k[0]);
    }
  },
  {
    name: 'sugerir %: Zn y B altos hasta amarre; Fe sigue el tamaño de etapa',
    run: function () {
      var stages = ['Brotación', 'Establecimiento', 'Prefloración', 'Floración', 'Amarre', 'Llenado', 'Maduración'];
      var pct = suggest.suggestPct(stages).pct;
      var bro = 0;
      var flor = 3;
      var amarre = 4;
      var lle = 5;
      var mad = 6;
      sum100(pct.zn);
      sum100(pct.b);
      sum100(pct.fe);
      assert.ok(pct.zn[bro] > pct.zn[mad], 'Zn early vs mad ' + pct.zn[bro] + ' vs ' + pct.zn[mad]);
      assert.ok(pct.b[flor] > pct.b[lle] || pct.b[amarre] > pct.b[mad], 'B flower vs filling');
      assert.ok(pct.fe[lle] > pct.fe[bro], 'Fe follows stage size');
    }
  },
  {
    name: 'sugerir %: tres Vegetativo no hacen campana en el mes de enmedio',
    run: function () {
      var stages = ['Brotación', 'Vegetativo', 'Vegetativo', 'Vegetativo', 'Prefloración'];
      var pct = suggest.suggestPct(stages).pct;
      var profiles = suggest.profilesForStages(stages);
      function notBell(arr, a, b, c, label) {
        assert.ok(!(arr[b] > arr[a] + 0.05 && arr[b] > arr[c] + 0.05), label + ' ' + [arr[a], arr[b], arr[c]].join(' → '));
      }
      notBell(pct.fe, 1, 2, 3, 'Fe');
      notBell(pct.mn, 1, 2, 3, 'Mn');
      notBell(pct.zn, 1, 2, 3, 'Zn');
      notBell(pct.b, 1, 2, 3, 'B');
      notBell([profiles[1].I, profiles[2].I, profiles[3].I], 0, 1, 2, 'I');
      assert.ok(profiles[1].I <= profiles[2].I + 1e-6);
      assert.ok(profiles[2].I <= profiles[3].I + 1e-6);
    }
  },
  {
    name: 'equilibrio iónico: % meq y zona salen del requerimiento óxido',
    run: function () {
      var ok = suggest.cycleIonicBalance({ N: 300, P2O5: 200, K2O: 444, CaO: 222, MgO: 111, SO4: 278 });
      assert.equal(ok.empty, false);
      assert.equal(ok.inZone, true);
      assert.ok(ok.anions.n.pct > 60 && ok.anions.n.pct < 80);
      assert.equal(ok.anions.n.lo, 20);
      assert.equal(ok.anions.n.hi, 80);
      var out = suggest.cycleIonicBalance({ N: 427, P2O5: 192, K2O: 1067, CaO: 71, MgO: 44, SO4: 80 });
      assert.equal(out.inZone, false);
      assert.equal(out.anions.n.flag, 'high');
      assert.equal(out.cations.ca.flag, 'low');
      assert.equal(ok.anions.n.kgClosed, true);
      assert.ok(ok.anions.n.kgMin > 200 && ok.anions.n.kgMin < 320, String(ok.anions.n.kgMin));
      assert.ok(ok.anions.n.kgMax > 400, String(ok.anions.n.kgMax));
      assert.equal(out.anions.n.kgClosed, false);
      assert.equal(out.cations.ca.kgClosed, true);
      assert.ok(out.cations.ca.kgMin < out.cations.ca.kgMax);
      var ser = suggest.serializeIonicBalance(ok);
      assert.equal(ser.in_zone, true);
      assert.deepEqual(ser.anions.N.range_pct, [20, 80]);
      assert.equal(ser.anions.N.kg_range_closes, true);
      assert.ok(ser.anions.N.kg_min != null && ser.anions.N.kg_max != null);
      var serOut = suggest.serializeIonicBalance(out);
      assert.equal(serOut.in_zone, false);
      assert.equal(serOut.anions.N.kg_range_closes, false);
      assert.equal(serOut.anions.N.kg_min, null);
    }
  }
];
