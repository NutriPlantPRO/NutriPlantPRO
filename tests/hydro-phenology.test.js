'use strict';

var assert = require('node:assert/strict');
var cycle = require('../assets/hydro-cycle-program.js');

function stage(meq, ce) {
  return { meq: meq, ce: ce };
}

module.exports = [
  {
    name: 'hidro: perfil vacío sin meq',
    run: function () {
      var ph = cycle.inferPhenologyFromMeq({ meq: {} });
      assert.equal(ph.id, 'vacio');
      assert.match(cycle.phenologyReadoutHtml(null), /Perfil fenológico estimado/);
    }
  },
  {
    name: 'hidro: K/N bajo y CE baja → vegetativa',
    run: function () {
      var ph = cycle.inferPhenologyFromMeq(stage({
        N_NO3: 8, N_NH4: 0, K: 4, Ca: 6, Mg: 2, P: 1, S: 2
      }, '1.15'));
      assert.equal(ph.id, 'vegetativa');
      assert.match(ph.why, /vegetativo/i);
      var html = cycle.phenologyReadoutHtml(stage({
        N_NO3: 8, N_NH4: 0, K: 4, Ca: 6, Mg: 2, P: 1, S: 2
      }, '1.15'));
      assert.match(html, /Vegetativa/);
      assert.match(html, /K\/N/);
    }
  },
  {
    name: 'hidro: K/N equilibrado → prefloración',
    run: function () {
      var ph = cycle.inferPhenologyFromMeq(stage({
        N_NO3: 10, N_NH4: 0, K: 10, Ca: 16, Mg: 6, P: 1.5, S: 4
      }, '2.38'));
      assert.equal(ph.id, 'transicion');
      assert.match(ph.why, /prefloración/i);
    }
  },
  {
    name: 'hidro: K/N alto y CE alta → producción',
    run: function () {
      var ph = cycle.inferPhenologyFromMeq(stage({
        N_NO3: 8, N_NH4: 0, K: 16, Ca: 10, Mg: 4, P: 1, S: 3
      }, '2.10'));
      assert.equal(ph.id, 'produccion');
      assert.match(ph.why, /producción/i);
    }
  }
];
