'use strict';

var assert = require('node:assert/strict');
var units = require('../assets/np-units-core.js');

global.NpUnits = units;
global.NpPrefs = {
  get: function () {
    return { language: 'en', unit_system: 'us_customary', locale: 'en-US' };
  }
};
var hydro = require('../assets/np-hydro-units.js');

function close(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= (tolerance || 1e-9),
    actual + ' no está cerca de ' + expected
  );
}

module.exports = [
  {
    name: 'hidro: round-trip SI para volumen, masa y concentración',
    run: function () {
      ['water_volume', 'liquid_volume', 'mass', 'concentration'].forEach(function (kind) {
        var canonical = kind === 'water_volume' ? 12.5 : (kind === 'liquid_volume' ? 0.75 : 42.25);
        close(hydro.toSI(hydro.fromSI(canonical, kind), kind), canonical, 1e-10);
      });
      assert.equal(hydro.unit('water_volume'), 'US gal');
      assert.equal(hydro.unit('mass'), 'lb');
      assert.equal(hydro.unit('concentration'), 'lb/1000 US gal');
    }
  },
  {
    name: 'hidro: 150 ppm equivale a lb por 1000 US gal',
    run: function () {
      close(
        hydro.ppmMassVolumeEquivalent(150, 'lb/1000 US gal'),
        1.25181,
        1e-5
      );
    }
  },
  {
    name: 'hidro: rechaza concentración hacia lb por acre',
    run: function () {
      assert.throws(function () {
        hydro.ppmMassVolumeEquivalent(150, 'lb/acre');
      }, /no puede convertirse a lb\/acre/i);
      assert.throws(function () {
        units.convert(0.15, 'kg/m3', 'lb/acre');
      }, /Dimensiones incompatibles/);
    }
  },
  {
    name: 'hidro: modo métrico conserva valores canónicos históricos',
    run: function () {
      global.NpPrefs.get = function () {
        return { language: 'es', unit_system: 'metric', locale: 'es-MX' };
      };
      close(hydro.fromSI(100, 'water_volume'), 100);
      close(hydro.fromSI(1, 'liquid_volume'), 1000);
      close(hydro.fromSI(5, 'mass'), 5);
      close(hydro.fromSI(2.5, 'concentration'), 2.5);
      assert.equal(hydro.unit('concentration'), 'g/L');
    }
  }
];
