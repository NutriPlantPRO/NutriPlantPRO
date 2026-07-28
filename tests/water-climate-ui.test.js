'use strict';

var assert = require('node:assert/strict');
var units = require('../assets/np-units-core.js');

global.NpUnits = units;
var currentPrefs = { language: 'en', unit_system: 'us_customary', locale: 'en-US' };
global.NpPrefs = { get: function () { return currentPrefs; } };
var ui = require('../assets/np-water-climate-ui.js');

function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= (tolerance || 1e-9), actual + ' != ' + expected);
}

function vpd(tempC, rh) {
  var es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return es * (1 - rh / 100);
}

function usePrefs(next) {
  currentPrefs = next || currentPrefs;
  global.NpPrefs.get = function () { return currentPrefs; };
}

module.exports = [
  {
    name: 'agua/clima: round-trip de profundidades, temperatura y densidad',
    run: function () {
      usePrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
      [
        ['water_depth', 25.4],
        ['depth', 30],
        ['bulk_density', 1.37],
        ['temperature', 24.5],
        ['temperature_delta', 6.25]
      ].forEach(function (sample) {
        close(ui.toSI(ui.fromSI(sample[1], sample[0]), sample[0]), sample[1], 1e-10);
      });
      close(units.convert(10, 'deltaC', 'deltaF'), 18, 1e-12);
      close(units.convert(68, 'F', 'C'), 20, 1e-12);
    }
  },
  {
    name: 'agua/clima: factores agua por superficie y dosis de ácido',
    run: function () {
      usePrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
      close(units.convert(1, 'm3/ha', 'US gal/acre'), 106.90663667, 1e-8);
      close(units.convert(106.90663667, 'US gal/acre', 'm3/ha'), 1, 1e-8);
      var usDose = units.convert(1, 'mL/m3', 'US fl oz/1000 US gal');
      close(units.convert(usDose, 'US fl oz/1000 US gal', 'mL/m3'), 1, 1e-12);
      assert.equal(ui.unit('acid_dose_volume_volume'), 'US fl oz/1000 US gal');
    }
  },
  {
    name: 'agua/clima: lámina y volumen por área conservan igualdad física',
    run: function () {
      var depthMm = 25.4;
      var volumeM3Ha = depthMm * 10;
      var inches = units.convert(depthMm, 'mm', 'in');
      var galAcre = units.convert(volumeM3Ha, 'm3/ha', 'US gal/acre');
      close(inches, 1, 1e-12);
      close(galAcre, 27154.285714, 1e-6);
    }
  },
  {
    name: 'agua/clima: VPD es idéntico con entrada C o F',
    run: function () {
      var c = 27.3;
      var f = units.convert(c, 'C', 'F');
      close(vpd(c, 68), vpd(units.convert(f, 'F', 'C'), 68), 1e-12);
    }
  },
  {
    name: 'agua/clima: rechaza dimensiones inválidas y conserva técnicas',
    run: function () {
      assert.throws(function () {
        units.convert(2, 'meq/100g', 'lb/acre');
      }, /Unidad no soportada|Dimensiones incompatibles/);
      assert.throws(function () {
        units.convert(150, 'g/L', 'mL/m3');
      }, /Dimensiones incompatibles/);
      assert.equal(ui.technicalKinds.kPa, true);
      assert.equal(ui.technicalKinds.ppm, true);
      assert.equal(ui.technicalKinds.percent, true);
    }
  },
  {
    name: 'agua/clima: formato y cuatro combinaciones son independientes',
    run: function () {
      [
        ['es', 'metric', 'mm'],
        ['es', 'us_customary', 'in'],
        ['en', 'metric', 'mm'],
        ['en', 'us_customary', 'in']
      ].forEach(function (combo) {
        usePrefs({ language: combo[0], unit_system: combo[1], locale: combo[0] === 'en' ? 'en-US' : 'es-MX' });
        assert.equal(ui.unit('water_depth'), combo[2]);
        assert.equal(ui.t('Resultados', 'Results'), combo[0] === 'en' ? 'Results' : 'Resultados');
        assert.ok(ui.inputFromSI(12.345678, 'water_depth').split(/[.,]/)[1].length <= 4);
        assert.match(ui.resultFromSI(12.345678, 'water_depth', 2), combo[2] === 'in' ? / in$/ : / mm$/);
      });
    }
  },
  {
    name: 'agua/clima: reporte congela sistema de unidades',
    run: function () {
      usePrefs({ language: 'en', unit_system: 'metric', locale: 'en-US' });
      var frozen = ui.withUnitSystem('us_customary', function () {
        return ui.resultFromSI(25.4, 'water_depth', 2);
      });
      assert.equal(frozen, '1 in');
      assert.equal(ui.resultFromSI(25.4, 'water_depth', 2), '25.4 mm');
    }
  },
  {
    name: 'agua/clima: snapshot persiste inputs en SI',
    run: function () {
      usePrefs({ language: 'en', unit_system: 'metric', locale: 'en-US' });
      var attrs = {};
      var input = {
        id: 'test-temperature',
        value: '20',
        type: 'number',
        setAttribute: function (k, v) { attrs[k] = v; },
        getAttribute: function (k) { return attrs[k] || null; },
        addEventListener: function () {}
      };
      var previousDocument = global.document;
      global.document = {
        getElementById: function (id) { return id === input.id ? input : null; }
      };
      try {
        ui.bindFields({ 'test-temperature': 'temperature' });
        usePrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
        input.value = '68';
        var saved = ui.snapshot(['test-temperature']);
        assert.equal(saved.__np_si, true);
        close(saved['test-temperature'], 20, 1e-12);
      } finally {
        global.document = previousDocument;
      }
    }
  }
];
