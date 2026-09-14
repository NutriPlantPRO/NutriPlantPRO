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
      // Semana 1: penalty 10 / 40 → 75 %. Semana 2: penalty 15 / 40 → 62.5 % (solo baja).
      assert.equal(r.weeks[0].ish_cumulative, 75);
      assert.equal(r.weeks[1].ish_cumulative, 62.5);
      assert.equal(r.weeks[1].ish_cumulative, r.ish);
    }
  },
  {
    name: 'ISH: curva de rendimiento no recupera tras estrés',
    run: function () {
      var weeks = [
        {
          weekStart: '2026-01-01',
          weekEnd: '2026-01-07',
          rain_mm: 0,
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
      // D1=20, E2=20*0.25=5 con Fp 0.25; sumEtc=40; Y1=50 %, Y2=37.5 % (no sube).
      var r = NpIsh.computeIsh({ weeks: weeks, kc: 1, fp: 0.25 });
      assert.equal(r.weeks[0].ish_cumulative, 50);
      assert.equal(r.weeks[1].ish_cumulative, 37.5);
      assert.ok(r.weeks[1].ish_cumulative <= r.weeks[0].ish_cumulative);
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
  },
  {
    name: 'ISH: merge conserva satélite (no solo manual)',
    run: function () {
      var prev = [
        {
          weekStart: '2026-01-01',
          weekEnd: '2026-01-07',
          rain_mm: 12,
          rainSource: 'satellite',
          et0_mm: 18,
          et0Source: 'satellite',
          irrigation_mm: 5,
          irrigationSource: 'manual'
        }
      ];
      var slots = NpIsh.buildWeekSlots('2026-01-01', '2026-01-07');
      var merged = NpIsh.mergeWeeksPreserveManual(prev, slots);
      assert.equal(merged[0].rain_mm, 12);
      assert.equal(merged[0].et0_mm, 18);
      assert.equal(merged[0].rainSource, 'satellite');
      assert.equal(merged[0].irrigation_mm, 5);
    }
  },
  {
    name: 'ISH: mm ↔ m³/ha y % efectivo en el balance',
    run: function () {
      assert.equal(NpIsh.mmToM3PerHa(25), 250);
      assert.equal(NpIsh.m3PerHaToMm(250), 25);
      assert.equal(NpIsh.clampIrrigationEffectivePct(null), 100);
      assert.equal(NpIsh.clampIrrigationEffectivePct(150), 100);
      assert.equal(NpIsh.clampIrrigationEffectivePct(-5), 0);

      var weeks = [
        {
          weekStart: '2026-01-01',
          weekEnd: '2026-01-07',
          rain_mm: 0,
          et0_mm: 20,
          irrigation_mm: 20
        }
      ];
      // 100% efectivo → supply=20, D=0 → ISH 100
      var full = NpIsh.computeIsh({ weeks: weeks, kc: 1, fp: 0.25, irrigationEffectivePct: 100 });
      assert.equal(full.ok, true);
      assert.equal(full.ish, 100);
      assert.equal(full.weeks[0].irrigation_m3_ha, 200);
      assert.equal(full.weeks[0].irrigation_effective_mm, 20);

      // 50% efectivo → supply=10, D=10, ETc=20 → ISH 50
      var half = NpIsh.computeIsh({ weeks: weeks, kc: 1, fp: 0.25, irrigationEffectivePct: 50 });
      assert.equal(half.ok, true);
      assert.equal(half.ish, 50);
      assert.equal(half.weeks[0].irrigation_effective_mm, 10);
      assert.equal(half.irrigationEffectivePct, 50);
    }
  }
];
