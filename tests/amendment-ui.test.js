'use strict';

var assert = require('node:assert/strict');
var units = require('../assets/np-units-core.js');

global.NpUnits = units;
var currentPrefs = { language: 'en', unit_system: 'us_customary', locale: 'en-US' };
global.NpPrefs = { get: function () { return currentPrefs; } };
global.NpAgronomicUnits = require('../assets/np-agronomic-units.js');
var amendment = require('../assets/np-amendment-ui.js');

function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= (tolerance || 1e-9), actual + ' != ' + expected);
}

module.exports = [
  {
    name: 'enmiendas: profundidad, densidad y dosis hacen round-trip',
    run: function () {
      currentPrefs = { language: 'en', unit_system: 'us_customary', locale: 'en-US' };
      [
        ['depth', 30],
        ['bulk_density', 1.1],
        ['dose_mass_area', 245.75]
      ].forEach(function (sample) {
        close(amendment.toSI(amendment.fromSI(sample[1], sample[0]), sample[0]), sample[1], 1e-10);
        assert.match(amendment.inputFromSI(sample[1], sample[0]), /^-?\d+(?:\.\d{1,4})?$/);
      });
      assert.equal(amendment.unit('depth'), 'in');
      assert.equal(amendment.unit('bulk_density'), 'g/cm3');
      assert.equal(amendment.unit('dose_mass_area'), 'lb/acre');
      assert.match(amendment.formatBulkDensityFromSI(1.1), /g\/cm³.*lb\/ft³/);
    }
  },
  {
    name: 'enmiendas: cálculo físico es equivalente en métrico y US',
    run: function () {
      var metric = amendment.meqToKgHa(2.5, 20.04, 30, 1.1);
      var depthIn = units.convert(30, 'cm', 'in');
      var densityLbFt3 = units.convert(1.1, 'g/cm3', 'lb/ft3');
      var usCanonical = amendment.meqToKgHa(
        2.5,
        20.04,
        units.convert(depthIn, 'in', 'cm'),
        units.convert(densityLbFt3, 'lb/ft3', 'g/cm3')
      );
      close(usCanonical, metric, 1e-10);
      close(amendment.kgHaToMeq(metric, 20.04, 30, 1.1), 2.5, 1e-10);
    }
  },
  {
    name: 'enmiendas: rechaza conversión técnica sin contexto físico',
    run: function () {
      assert.throws(function () {
        global.NpAgronomicUnits.convert(5, 'meq/100g', 'dose_mass_area');
      }, /profundidad y densidad/i);
      assert.throws(function () {
        amendment.meqToKgHa(5, 20.04, 0, 1.1);
      }, /mayores que cero/i);
    }
  },
  {
    name: 'enmiendas: resultados limitan decimales y nombres personalizados',
    run: function () {
      assert.match(amendment.resultFromSI(123.4567, 'dose_mass_area'), /^\d+(?:\.\d{1,2})?$/);
      assert.match(amendment.resultFromSI(1.123456, 'bulk_density'), /^\d+(?:\.\d{1,3})?$/);
      assert.equal(amendment.materialName('gypsum', 'Yeso Agrícola'), 'Agricultural Gypsum');
      assert.equal(amendment.materialName('custom-1', 'Mi mezcla'), 'Mi mezcla');
    }
  }
];
