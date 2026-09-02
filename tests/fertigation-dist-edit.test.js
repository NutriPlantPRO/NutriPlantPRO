'use strict';

var assert = require('node:assert/strict');
var edit = require('../assets/np-fertigation-dist-edit.js');

function sum(values) {
  return values.reduce(function (total, value) { return total + value; }, 0);
}

function assertClosed(values) {
  assert.equal(Math.round(sum(values) * 10), 1000);
  values.forEach(function (value) {
    assert.ok(value >= 0 && value <= 100);
    assert.equal(Math.round(value * 10), value * 10);
  });
}

module.exports = [
  {
    name: 'editar distribución: subir un punto reduce las demás etapas proporcionalmente',
    run: function () {
      var result = edit.redistributePctAtStage([10, 20, 30, 40], 1, 40);
      assert.deepEqual(result, [7.5, 40, 22.5, 30]);
      assertClosed(result);
    }
  },
  {
    name: 'editar distribución: bajar un punto aumenta las demás etapas proporcionalmente',
    run: function () {
      var result = edit.redistributePctAtStage([10, 40, 20, 30], 1, 10);
      assert.deepEqual(result, [15, 10, 30, 45]);
      assertClosed(result);
    }
  },
  {
    name: 'editar distribución: reparte igual si las demás etapas están en cero',
    run: function () {
      var result = edit.redistributePctAtStage([100, 0, 0], 0, 40);
      assert.deepEqual(result, [40, 30, 30]);
      assertClosed(result);
    }
  },
  {
    name: 'editar distribución: una sola etapa permanece en 100%',
    run: function () {
      assert.deepEqual(edit.redistributePctAtStage([22], 0, 5), [100]);
    }
  },
  {
    name: 'editar distribución: limita el punto entre 0 y 100%',
    run: function () {
      var high = edit.redistributePctAtStage([25, 25, 50], 0, 150);
      var low = edit.redistributePctAtStage([25, 25, 50], 0, -10);
      assert.deepEqual(high, [100, 0, 0]);
      assert.equal(low[0], 0);
      assertClosed(high);
      assertClosed(low);
    }
  },
  {
    name: 'editar distribución: el redondeo en décimas conserva exactamente 100%',
    run: function () {
      var result = edit.redistributePctAtStage([14.3, 14.2, 14.1, 14, 13.9, 13.8, 15.7], 3, 17.3);
      assert.equal(result[3], 17.3);
      assertClosed(result);
    }
  }
];
