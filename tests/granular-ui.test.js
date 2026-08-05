'use strict';

var assert = require('node:assert/strict');
var units = require('../assets/np-units-core.js');

global.NpUnits = units;
var currentPrefs = { language: 'en', unit_system: 'us_customary', locale: 'en-US' };
global.NpPrefs = { get: function () { return currentPrefs; } };
global.NpAgronomicUnits = require('../assets/np-agronomic-units.js');
var granular = require('../assets/np-granular-ui.js');

function setPrefs(next) {
  currentPrefs = next;
  global.NpPrefs = { get: function () { return currentPrefs; } };
}

function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= (tolerance || 1e-9), actual + ' != ' + expected);
}

module.exports = [
  {
    name: 'granular: adaptadores US hacen round-trip a SI',
    run: function () {
      setPrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
      [
        ['dose_mass_area', 245.75],
        ['yield_mass_area', 18.4],
        ['extraction_mass_yield', 7.25],
        ['mass', 800],
        ['area', 12]
      ].forEach(function (sample) {
        close(granular.toSI(granular.fromSI(sample[1], sample[0]), sample[0]), sample[1], 1e-10);
      });
      assert.equal(granular.unit('dose_mass_area'), 'lb/acre');
      assert.equal(granular.unit('yield_mass_area'), 'short ton/acre');
      assert.equal(granular.unit('extraction_mass_yield'), 'lb/short ton');
    }
  },
  {
    name: 'granular: limita inputs a cuatro decimales y resultados a dos',
    run: function () {
      setPrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
      assert.match(granular.inputFromSI(1.234567, 'mass'), /^\d+(?:\.\d{1,4})?$/);
      assert.match(granular.resultFromSI(123.456789, 'dose_mass_area'), /^\d+(?:\.\d{1,2})?$/);
    }
  },
  {
    name: 'granular: presentación no muta persistencia canónica',
    run: function () {
      setPrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
      var saved = { doseKgHa: 500, targetYield: 10, composition: { N: 46, P2O5: 0 } };
      var before = JSON.stringify(saved);
      var displayedDose = granular.inputFromSI(saved.doseKgHa, 'dose_mass_area');
      var displayedYield = granular.inputFromSI(saved.targetYield, 'yield_mass_area');
      close(granular.toSI(displayedDose, 'dose_mass_area'), saved.doseKgHa, 0.001);
      close(granular.toSI(displayedYield, 'yield_mass_area'), saved.targetYield, 0.001);
      assert.equal(JSON.stringify(saved), before);
      assert.equal(saved.composition.N, 46);
    }
  },
  {
    name: 'granular: traducciones conservan ids y nombres personalizados',
    run: function () {
      setPrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
      assert.equal(granular.cropName('maiz', 'Maíz'), 'Corn');
      assert.equal(granular.materialName('Sulfato de Potasio'), 'Potassium Sulfate');
      assert.equal(granular.materialName('Nitrato de Calcio'), 'Calcium Nitrate');
      assert.equal(granular.materialName('MAP'), 'MAP');
      assert.equal(granular.materialName('DAP'), 'DAP');
      assert.equal(granular.materialName('Fertilizante X'), 'Fertilizante X');
      setPrefs({ language: 'es', unit_system: 'metric', locale: 'es-MX' });
      assert.equal(granular.cropName('maiz', 'Maíz'), 'Maíz');
      assert.equal(granular.unit('dose_mass_area'), 'kg/ha');
      assert.equal(granular.materialName('Nitrato de Calcio'), 'Nitrato de Calcio');
      setPrefs({ language: 'en', unit_system: 'us_customary', locale: 'en-US' });
    }
  }
];
