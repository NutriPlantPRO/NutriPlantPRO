'use strict';

var assert = require('node:assert/strict');
require('../assets/np-fertilizer-price.js');
var api = global.NpFertilizerPrice;

function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= (tolerance || 1e-9), actual + ' != ' + expected);
}

module.exports = [
  {
    name: 'precio: ácido en L se convierte a kg con densidad',
    run: function () {
      var sulfuric = { id: 'acido_sulfurico_98', unit: 'L', density: 1.84 };
      close(api.productKgFromAmount(10, sulfuric), 18.4, 1e-9);
      close(api.productKgFromAmount(10, { id: 'mkp' }), 10, 1e-9);
    }
  },
  {
    name: 'precio: USD/t × kg/ha da USD/ha también para líquidos',
    run: function () {
      var kg = api.productKgFromAmount(100, { unit: 'L', density: 1.33 });
      close(kg, 133, 1e-9);
      close(api.costUsdPerHaFromKgHa(kg, 400), 53.2, 1e-9);
    }
  }
];
