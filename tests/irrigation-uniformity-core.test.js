'use strict';

var assert = require('node:assert/strict');
var U = require('../assets/np-irrigation-uniformity-core.js');

module.exports = [
  {
    name: 'Uniformidad: DU 25% de 8 caudales iguales es 100%',
    run: function () {
      var du = U.distributionUniformity([4, 4, 4, 4, 4, 4, 4, 4]);
      assert.equal(du.ok, true);
      assert.equal(du.nLow, 2);
      assert.equal(du.du, 100);
    }
  },
  {
    name: 'Uniformidad: DU 25% = media del cuarto bajo / media',
    run: function () {
      var vals = [10, 10, 10, 10, 8, 8, 6, 6];
      var du = U.distributionUniformity(vals);
      assert.equal(du.nLow, 2);
      assert.equal(U.round(du.lowQuarterMean, 2), 6);
      assert.equal(U.round(du.mean, 2), 8.5);
      assert.equal(U.round(du.du, 1), 70.6);
    }
  },
  {
    name: 'Uniformidad: EU Keller-Karmeli del ejemplo (91.1%)',
    run: function () {
      var qmin = U.flowFromPressure(0.51, 8.75, 5.5, 0.5);
      var qavg = U.flowFromPressure(0.51, 10, 5.5, 0.5);
      assert.ok(Math.abs(qmin - 0.643) < 0.002);
      assert.ok(Math.abs(qavg - 0.688) < 0.002);
      var eu = U.emissionUniformity({ cvf: 0.03, ep: 2, qmin: 0.643, qavg: 0.687 });
      assert.equal(eu.ok, true);
      assert.equal(U.round(eu.eu, 1), 91.1);
    }
  },
  {
    name: 'Uniformidad: presiones del ejemplo hidráulico',
    run: function () {
      var p = U.designPressures({
        pinMca: 11.25,
        frictionMainMca: 2,
        frictionLateralMca: 1.5,
        slopeFavorMca: 1
      });
      assert.equal(U.round(p.pAB, 2), 9.25);
      assert.equal(U.round(p.pFirstEnd, 2), 10.75);
      assert.equal(U.round(p.pLastEnd, 2), 8.75);
      assert.equal(U.round(p.pMin, 2), 8.75);
      assert.equal(U.round(p.pMax, 2), 11.25);
      assert.equal(U.round(p.pAvg, 2), 10);
    }
  },
  {
    name: 'Uniformidad: fertirriego del cuarto bajo = dosis × DU/100',
    run: function () {
      var r = U.analyzeLot(
        [10, 10, 10, 10, 8, 8, 6, 6].map(function (v, i) {
          return { label: 'Muestra ' + (i + 1), value: v };
        }),
        { kind: 'flow', unit: 'L/h', doseKgHa: 50 }
      );
      assert.equal(r.ok, true);
      assert.equal(U.round(r.fert.doseAvgKgHa, 1), 50);
      assert.equal(U.round(r.fert.doseLowKgHa, 1), U.round(50 * r.du / 100, 1));
      assert.ok(r.lowLabels.length >= 1);
    }
  },
  {
    name: 'Uniformidad: 1 mm de lámina media = 10 m³/ha',
    run: function () {
      var w = U.waterApplied(null, 12, {});
      assert.equal(w.mm, 12);
      assert.equal(w.m3ha, 120);
    }
  },
  {
    name: 'Uniformidad: muestra vacía no desalinea el cuarto bajo',
    run: function () {
      var r = U.analyzeLot(
        [
          { label: 'Muestra 1', value: 10 },
          { label: 'Muestra 2', value: '' },
          { label: 'Muestra 3', value: 6 },
          { label: 'Muestra 4', value: 10 }
        ],
        { kind: 'flow', unit: 'L/h' }
      );
      assert.equal(r.ok, true);
      assert.equal(r.n, 3);
      assert.equal(r.rows.length, 4);
      assert.equal(r.rows[1].canonical, null);
      assert.equal(r.rows[2].lowQuarter, true);
      assert.equal(r.lowLabels.indexOf('Muestra 3') >= 0, true);
    }
  }
];
