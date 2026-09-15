'use strict';

var assert = require('node:assert/strict');
var FW = require('../assets/np-foliar-window-core.js');

module.exports = [
  {
    name: 'Foliar: DPV aire Magnus coincide con ejemplo 07:00 de la publicación',
    run: function () {
      var vpd = FW.airVpdKpa(22, 78);
      assert.ok(vpd != null);
      assert.ok(Math.abs(vpd - 0.65) < 0.08);
    }
  },
  {
    name: 'Foliar: sweet spot T20 HR60 V5 es muy favorable',
    run: function () {
      var r = FW.classifyHour({
        tempC: 20,
        rhPct: 60,
        windKmh: 5,
        vpdKpa: 0.7,
        rainMm: 0,
        rainNextMm: 0
      });
      assert.equal(r.classId, 0);
      assert.equal(r.classInfo.key, 'muy_favorable');
      assert.equal(r.scores.temp, 0);
      assert.equal(r.scores.rh, 0);
      assert.equal(r.scores.wind, 0);
    }
  },
  {
    name: 'Foliar: sweet spot HR llega a 80 (costa); 78 queda muy favorable',
    run: function () {
      assert.equal(FW.SWEET_SPOT.rhPct.idealMax, 80);
      assert.equal(FW.DEFAULT_RANGES.rhPct.idealMax, 80);
      var r = FW.classifyHour({
        tempC: 22,
        rhPct: 78,
        windKmh: 5,
        vpdKpa: 0.65,
        rainMm: 0,
        rainNextMm: 0
      });
      assert.equal(r.classId, 0);
      assert.equal(r.scores.rh, 0);
      assert.equal(r.scores.temp, 0);
      assert.equal(r.scores.wind, 0);
    }
  },
  {
    name: 'Foliar: HR 81 (un poco arriba de 80) es favorable, no precaución',
    run: function () {
      var r = FW.classifyHour({
        tempC: 18.7,
        rhPct: 81,
        windKmh: 7.9,
        vpdKpa: 0.41,
        rainMm: 0,
        rainNextMm: 0
      });
      assert.equal(r.classId, 1);
      assert.equal(r.scores.rh, 1);
      assert.equal(r.classInfo.key, 'favorable');
    }
  },
  {
    name: 'Foliar: ejemplo 14:00 (T31 HR43 V16 DPV2.10) es desfavorable por factor limitante',
    run: function () {
      var r = FW.classifyHour({
        tempC: 31,
        rhPct: 43,
        windKmh: 16,
        vpdKpa: 2.1,
        rainMm: 0,
        rainNextMm: 0
      });
      assert.equal(r.classId, 3);
      assert.equal(r.classInfo.key, 'desfavorable');
      assert.ok(r.scores.vpd >= 3);
      assert.ok(r.limiting.indexOf('rh') >= 0 || r.limiting.indexOf('vpd') >= 0 || r.limiting.indexOf('wind') >= 0 || r.limiting.indexOf('temp') >= 0);
    }
  },
  {
    name: 'Foliar: lluvia en la hora es muy desfavorable aunque el resto esté ideal',
    run: function () {
      var r = FW.classifyHour({
        tempC: 20,
        rhPct: 60,
        windKmh: 5,
        rainMm: 1.2,
        rainNextMm: 0
      });
      assert.equal(r.classId, 4);
      assert.equal(r.scores.rain, 4);
    }
  },
  {
    name: 'Foliar: noche con HR alta y viento calmo no es muy favorable',
    run: function () {
      var r = FW.classifyHour({
        tempC: 16,
        rhPct: 92,
        windKmh: 1.2,
        vpdKpa: 0.12,
        rainMm: 0,
        rainNextMm: 0
      });
      assert.ok(r.classId >= 2);
      assert.ok(r.scores.rh >= 2);
    }
  },
  {
    name: 'Foliar: una sola zona — bestWindows une horas consecutivas buenas',
    run: function () {
      var hours = [6, 7, 8, 9, 14].map(function (h) {
        var good = h < 10;
        return FW.classifyHour({
          tempC: good ? 20 : 31,
          rhPct: good ? 60 : 43,
          windKmh: good ? 5 : 16,
          rainMm: 0,
          rainNextMm: 0
        });
      });
      hours.forEach(function (row, i) {
        row.date = '2026-09-14';
        row.hour = [6, 7, 8, 9, 14][i];
      });
      var wins = FW.bestWindows(hours, { show24h: true });
      assert.equal(wins.length, 1);
      assert.equal(wins[0].startHour, 6);
      assert.equal(wins[0].endHour, 9);
      assert.equal(FW.formatHourRange(6, 9), '06:00–09:00');
    }
  },
  {
    name: 'Foliar: parse Open-Meteo incluye noche en 24 h (una sola serie)',
    run: function () {
      var hours = FW.parseOpenMeteoHourly({
        hourly: {
          time: ['2026-09-14T02:00', '2026-09-14T07:00', '2026-09-14T14:00'],
          temperature_2m: [16, 22, 31],
          relative_humidity_2m: [92, 60, 43],
          wind_speed_10m: [1.5, 5, 16],
          precipitation: [0, 0, 0],
          precipitation_probability: [5, 5, 10]
        }
      });
      assert.equal(hours.length, 3);
      var classified = FW.classifySeries(hours);
      var days24 = FW.groupByDate(classified, { show24h: true });
      assert.equal(days24[0].hours.length, 3);
      assert.equal(classified[1].classId, 0);
      assert.ok(classified[2].classId >= 3);
    }
  },
  {
    name: 'Foliar: DPV muy bajo (mañana húmeda) es precaución, no muy desfavorable',
    run: function () {
      var r = FW.classifyHour({
        tempC: 18,
        rhPct: 68,
        windKmh: 5,
        vpdKpa: 0.02,
        rainMm: 0,
        rainNextMm: 0
      });
      assert.ok(r.classId <= 2);
      assert.equal(r.scores.vpd, 2);
    }
  }
];
