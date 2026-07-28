'use strict';

var assert = require('node:assert/strict');
var units = require('../assets/np-units-core.js');

function close(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= (tolerance || 1e-9),
    actual + ' no está cerca de ' + expected
  );
}

module.exports = [
  {
    name: 'unidades: convierte masa, área y dosis por superficie',
    run: function () {
      close(units.convert(1, 'kg', 'lb'), 2.2046226218, 1e-9);
      close(units.convert(1, 'ha', 'acre'), 2.4710538147, 1e-9);
      close(units.convert(1, 'kg/ha', 'lb/acre'), 0.8921791216, 1e-9);
    }
  },
  {
    name: 'unidades: convierte volumen, longitud y temperatura',
    run: function () {
      close(units.convert(1, 'm3', 'L'), 1000);
      close(units.convert(1, 'US gal', 'L'), 3.785411784);
      close(units.convert(25.4, 'mm', 'in'), 1);
      close(units.convert(0, 'C', 'F'), 32);
      close(units.toCanonical(0, 'C'), 273.15);
    }
  },
  {
    name: 'unidades: distingue concentración, composición y dosis',
    run: function () {
      close(units.convert(1, 'g/L', 'kg/m3'), 1);
      close(units.convert(1, 'lb/1000 US gal', 'kg/m3'), 0.1198264273, 1e-9);
      close(units.toCanonical(25, '%'), 0.25);
      assert.throws(function () {
        units.convert(10, '%', 'g/L');
      }, /Dimensiones incompatibles/);
      assert.throws(function () {
        units.convert(10, 'kg/ha', 'kg/m3');
      }, /Dimensiones incompatibles/);
    }
  },
  {
    name: 'unidades: selecciona sistema y rechaza galón UK',
    run: function () {
      assert.equal(units.getUnitFor('dose_mass_area', 'metric'), 'kg/ha');
      assert.equal(units.getUnitFor('dose_mass_area', 'us_customary'), 'lb/acre');
      assert.equal(units.getUnitFor('concentration_mass_volume', 'us_customary'), 'lb/1000 US gal');
      assert.throws(function () { units.toCanonical(1, 'UK gal'); }, /galón UK/i);
      assert.throws(function () { units.toCanonical(1, 'gal'); }, /ambiguo/i);
    }
  },
  {
    name: 'unidades: formatea cantidades con locale y precisión',
    run: function () {
      assert.match(units.formatQuantity(1234.56, 'kg', 'en-US', 1), /^1,234\.6 kg$/);
    }
  }
];
