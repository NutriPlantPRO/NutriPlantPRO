'use strict';

var assert = require('node:assert/strict');
var units = require('../assets/np-units-core.js');

global.NpUnits = units;
global.NpPrefs = {
  get: function () {
    return { language: 'en', unit_system: 'us_customary', locale: 'en-US' };
  }
};
var agronomic = require('../assets/np-agronomic-units.js');

function close(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= (tolerance || 1e-9),
    actual + ' no está cerca de ' + expected
  );
}

module.exports = [
  {
    name: 'agronómicas: factores dimensionales confirmados',
    run: function () {
      close(units.convert(100, 'kg/ha', 'lb/acre'), 89.21791216, 1e-8);
      close(units.convert(1, 't/ha', 'short ton/acre'), 0.4460895608, 1e-10);
      close(units.convert(1, 'cm', 'in'), 0.3937007874, 1e-10);
      close(units.convert(1, 'g/cm3', 'lb/ft3'), 62.42796058, 1e-8);
      close(units.convert(1, 'kg', 'lb'), 2.2046226218, 1e-9);
      close(units.convert(1, 'ha', 'acre'), 2.4710538147, 1e-9);
    }
  },
  {
    name: 'agronómicas: round-trip conserva valores SI',
    run: function () {
      [
        ['dose_mass_area', 100],
        ['yield_mass_area', 8.25],
        ['depth', 22.5],
        ['bulk_density', 1.37],
        ['mass', 75],
        ['area', 14.2]
      ].forEach(function (sample) {
        close(
          agronomic.toSI(agronomic.fromSI(sample[1], sample[0]), sample[0]),
          sample[1],
          1e-10
        );
      });
    }
  },
  {
    name: 'agronómicas: unidades y formatos siguen preferencias',
    run: function () {
      assert.equal(agronomic.unit('dose_mass_area'), 'lb/acre');
      assert.equal(agronomic.unit('yield_mass_area'), 'short ton/acre');
      assert.equal(agronomic.unit('bulk_density'), 'g/cm3');
      assert.equal(agronomic.formatInputFromSI(1.234567, 'mass'), '2.7218');
      assert.match(agronomic.formatResultFromSI(100, 'dose_mass_area'), /^89\.22 lb\/acre$/);
      assert.match(agronomic.formatResultFromSI(1.35, 'bulk_density'), /^1\.35 g\/cm³$/);
      assert.match(agronomic.bulkDensitySecondaryLbFt3(1.35), /^≈ 84\.3 lb\/ft³$/);
      assert.match(agronomic.formatBulkDensityFromSI(1.35), /^1\.35 g\/cm³ \(84\.3 lb\/ft³\)$/);
    }
  },
  {
    name: 'agronómicas: densidad aparente no convierte a lb/ft³ en métrico',
    run: function () {
      var prev = global.NpPrefs.get;
      global.NpPrefs.get = function () {
        return { language: 'es', unit_system: 'metric', locale: 'es-MX' };
      };
      try {
        assert.equal(agronomic.unit('bulk_density'), 'g/cm3');
        assert.equal(agronomic.bulkDensitySecondaryLbFt3(1.35), '');
        assert.equal(agronomic.formatBulkDensityFromSI(1.35), '1.35 g/cm³');
      } finally {
        global.NpPrefs.get = prev;
      }
    }
  },
  {
    name: 'agronómicas: declara técnicas y rechaza conversiones contextuales',
    run: function () {
      [
        'composition_pct',
        'meq/100g',
        'cmol(+)/kg',
        'pH',
        'soil_ppm',
        'cec'
      ].forEach(function (kind) {
        assert.ok(agronomic.technicalKinds[kind]);
      });
      assert.throws(function () {
        agronomic.convert(150, 'soil_ppm', 'dose_mass_area');
      }, /concentración.*no puede convertirse.*dosis/i);
      assert.throws(function () {
        agronomic.convert(0.15, 'concentration', 'dose_mass_area');
      }, /concentración.*no puede convertirse.*dosis/i);
      assert.throws(function () {
        agronomic.convert(10, 'meq/100g', 'lb/acre');
      }, /profundidad y densidad aparente/i);
      assert.throws(function () {
        units.convert(150, 'kg/m3', 'lb/acre');
      }, /Dimensiones incompatibles/);
    }
  }
];
