'use strict';

var assert = require('node:assert/strict');
var units = require('../assets/np-units-core.js');
global.NpUnits = units;
var prefs = { language: 'en', unit_system: 'us_customary', locale: 'en-US' };
global.NpPrefs = { get: function () { return prefs; } };
global.NpAgronomicUnits = require('../assets/np-agronomic-units.js');
var ferti = require('../assets/np-fertigation-ui.js');

function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= (tolerance || 1e-9), actual + ' != ' + expected);
}

module.exports = [
  {
    name: 'fertirriego: 1 m3/ha equivale a 106.9067 US gal/acre',
    run: function () {
      close(units.convert(1, 'm3/ha', 'US gal/acre'), 106.9067, 0.0001);
    }
  },
  {
    name: 'fertirriego: dosis agua rendimiento y extracción hacen round-trip',
    run: function () {
      [
        ['dose_mass_area', 175.25],
        ['volume_area', 430.75],
        ['yield_mass_area', 22.4],
        ['extraction_mass_yield', 8.75],
        ['mass', 90.5]
      ].forEach(function (sample) {
        close(ferti.toSI(ferti.fromSI(sample[1], sample[0]), sample[0]), sample[1], 1e-9);
      });
      assert.equal(ferti.unit('yield_mass_area'), 'lb/acre');
      assert.equal(ferti.unit('extraction_mass_yield'), 'lb/short ton');
    }
  },
  {
    name: 'fertirriego: ppm conserva igualdad física entre sistemas',
    run: function () {
      var doseSI = 12.5;
      var waterSI = 250;
      var ppmMetric = ferti.concentrationPpmFromDose(doseSI, waterSI);
      var doseRoundTrip = ferti.toSI(ferti.fromSI(doseSI, 'dose_mass_area'), 'dose_mass_area');
      var waterRoundTrip = ferti.toSI(ferti.fromSI(waterSI, 'volume_area'), 'volume_area');
      close(ppmMetric, 50);
      close(ferti.concentrationPpmFromDose(doseRoundTrip, waterRoundTrip), ppmMetric, 1e-10);
    }
  },
  {
    name: 'fertirriego: rechaza concentration a dose sin agua',
    run: function () {
      assert.throws(function () { ferti.doseFromConcentration(100); }, /sin m3\/ha|requiere/i);
      close(ferti.doseFromConcentration(100, 250), 25);
      assert.throws(function () {
        global.NpAgronomicUnits.convert(100, 'concentration_mass_volume', 'dose_mass_area');
      }, /concentración/i);
    }
  },
  {
    name: 'fertirriego: formatos y traducciones respetan límites',
    run: function () {
      assert.match(ferti.inputFromSI(1.234567, 'mass'), /^-?\d+(?:\.\d{1,4})?$/);
      assert.match(ferti.resultFromSI(123.456789, 'dose_mass_area'), /^-?\d+(?:\.\d{1,2})?$/);
      assert.equal(ferti.t('program_tab', 'Programa de Nutrición'), 'Nutrition Program');
      assert.equal(ferti.cropName('tomate', 'Tomate'), 'Tomato');
      assert.equal(ferti.materialName('Fertilizante Personalizado'), 'Fertilizante Personalizado');
      assert.equal(ferti.materialName('Nitrato de Calcio'), 'Calcium Nitrate');
      assert.equal(ferti.materialName('MAP'), 'MAP');
      assert.equal(ferti.materialName('MKP'), 'MKP');
      assert.equal(ferti.materialName('SOP'), 'SOP');
      assert.equal(ferti.materialName('Ácido Fosfórico 75%'), 'Phosphoric Acid 75%');
      assert.equal(ferti.stageName('Establecimiento'), 'Establishment');
      assert.equal(ferti.stageName('Vegetativo'), 'Vegetative');
      assert.equal(ferti.stageName('Mi etapa custom'), 'Mi etapa custom');
      assert.equal(ferti.t('macronutrients', 'Macronutrientes'), 'Macronutrients');
      assert.equal(ferti.t('week', 'Semana'), 'Week');
      assert.equal(ferti.t('stage_to_analyze', 'Etapa a analizar:'), 'Stage to analyze:');
      assert.equal(ferti.t('macro_summary', 'Macro resumen'), 'Macro summary');
    }
  },
  {
    name: 'fertirriego: gráficas convierten kg/ha→lb/acre y eje Y usa lb en US',
    run: function () {
      global.NpPrefs = { get: function () { return prefs; } };
      prefs.language = 'en';
      prefs.unit_system = 'us_customary';
      prefs.locale = 'en-US';
      assert.match(ferti.chartYAxisTitle(), /lb/i);
      var series = ferti.chartDoseSeries([10, 20]);
      close(series[0], units.convert(10, 'kg/ha', 'lb/acre'), 1e-9);
      close(series[1], units.convert(20, 'kg/ha', 'lb/acre'), 1e-9);
      prefs.unit_system = 'metric';
      assert.match(ferti.chartYAxisTitle(), /kg/i);
      assert.deepEqual(ferti.chartDoseSeries([10, 20]), [10, 20]);
      prefs.language = 'es';
      assert.equal(ferti.chartYAxisTitle(), 'Kg de nutriente');
      prefs.language = 'en';
      prefs.unit_system = 'us_customary';
    }
  }
];
