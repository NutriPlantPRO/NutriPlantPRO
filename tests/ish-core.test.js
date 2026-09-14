'use strict';

var assert = require('node:assert/strict');
var NpIsh = require('../assets/np-ish-core.js');

module.exports = [
  {
    name: 'ISH: valida ciclo y tope 52 semanas',
    run: function () {
      var ok = NpIsh.validateCycle('2026-01-01', '2026-03-01');
      assert.equal(ok.ok, true);
      assert.ok(ok.weekCount >= 8 && ok.weekCount <= 10);

      var bad = NpIsh.validateCycle('2025-01-01', '2026-12-31');
      assert.equal(bad.ok, false);
      assert.match(bad.error, /52/);
    }
  },
  {
    name: 'ISH: fórmula déficit + Fp·exceso',
    run: function () {
      var weeks = [
        {
          weekStart: '2026-01-01',
          weekEnd: '2026-01-07',
          rain_mm: 10,
          et0_mm: 20,
          irrigation_mm: 0
        },
        {
          weekStart: '2026-01-08',
          weekEnd: '2026-01-14',
          rain_mm: 40,
          et0_mm: 20,
          irrigation_mm: 0
        }
      ];
      // kc=1 → ETc 20+20=40; D1=10 E1=0; D2=0 E2=20; Fp=0.25 → penalty=10+5=15; ISH=100*(1-15/40)=62.5
      var r = NpIsh.computeIsh({ weeks: weeks, kc: 1, fp: 0.25 });
      assert.equal(r.ok, true);
      assert.equal(r.sumEtc, 40);
      assert.equal(r.sumPenalty, 15);
      assert.equal(r.ish, 62.5);
      assert.equal(r.weeks[0].deficit_mm, 10);
      assert.equal(r.weeks[1].excess_mm, 20);
      assert.ok(r.weeks[1].ish_cumulative != null);
    }
  },
  {
    name: 'ISH: Fp=0 ignora exceso; sin Kc no calcula',
    run: function () {
      var weeks = [
        {
          weekStart: '2026-01-01',
          weekEnd: '2026-01-07',
          rain_mm: 50,
          et0_mm: 20,
          irrigation_mm: 0
        }
      ];
      var r0 = NpIsh.computeIsh({ weeks: weeks, kc: 1, fp: 0 });
      assert.equal(r0.ok, true);
      assert.equal(r0.ish, 100);

      var noKc = NpIsh.computeIsh({ weeks: weeks, fp: 0.25 });
      assert.equal(noKc.ok, false);
    }
  },
  {
    name: 'ISH: macrotúnel pone lluvia 0; agrega satélite a semanas',
    run: function () {
      var slots = NpIsh.buildWeekSlots('2026-01-01', '2026-01-14');
      assert.equal(slots.length, 2);
      var daily = {
        time: ['2026-01-01', '2026-01-02', '2026-01-08', '2026-01-09'],
        precipitation_sum: [5, 5, 3, 7],
        et0_fao_evapotranspiration: [2, 2, 4, 4]
      };
      var filled = NpIsh.applySatelliteToWeeks(slots, daily);
      assert.equal(filled[0].rain_mm, 10);
      assert.equal(filled[0].et0_mm, 4);
      assert.equal(filled[1].rain_mm, 10);
      assert.equal(filled[1].et0_mm, 8);

      var r = NpIsh.computeIsh({
        weeks: filled,
        kc: 1,
        fp: 0.25,
        macroTunnelNoRain: true
      });
      assert.equal(r.weeks[0].rain_mm, 0);
      assert.equal(r.weeks[0].deficit_mm, 4);
    }
  },
  {
    name: 'ISH: sugerir riego solo si balance = 7 días',
    run: function () {
      var weeks = NpIsh.buildWeekSlots('2026-01-01', '2026-01-21');
      assert.equal(
        NpIsh.suggestIrrigationFromBalance({ periodDays: 30, irrigationValue: 50 }, weeks),
        null
      );
      var sug = NpIsh.suggestIrrigationFromBalance(
        { periodDays: 7, irrigationValue: 50, irrigationUnit: 'mm' },
        weeks
      );
      assert.ok(sug);
      assert.equal(sug.irrigation_mm, 50);
    }
  }
];
