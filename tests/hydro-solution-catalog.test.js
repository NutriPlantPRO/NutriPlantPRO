'use strict';

var assert = require('node:assert/strict');
var catalog = require('../assets/hydro-solution-catalog.js');

module.exports = [
  {
    name: 'hidro: catálogo de literatura contiene las cinco soluciones',
    run: function () {
      assert.equal(catalog.builtIn.length, 5);
      var steiner = catalog.builtIn.find(function (item) { return item.id === 'steiner-100'; });
      assert.equal(steiner.meq.N_NO3, 12);
      assert.equal(steiner.meq.Ca, 9);
      assert.equal(steiner.ppm.Fe, 1.33);
    }
  },
  {
    name: 'hidro: aplicar receta conserva la estructura de meq y ppm',
    run: function () {
      var target = { meq: { N_NO3: 99 }, ppm: { Fe: 99 } };
      catalog.apply(catalog.builtIn[2], target);
      assert.equal(target.name, 'Hoagland & Arnon II');
      assert.equal(target.meq.N_NH4, 1);
      assert.equal(target.meq.N_NO3, 14);
      assert.equal(target.ppm.Mo, 0.011);
      assert.equal(target.ppm.Fe, 1);
    }
  }
];
