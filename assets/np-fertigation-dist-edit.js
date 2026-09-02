/**
 * NutriPlant — utilidades puras para editar distribución porcentual.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (root) root.NpFertigationDistEdit = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function finiteNonNegative(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  /**
   * Fija el porcentaje de una etapa y reparte el resto proporcionalmente.
   * Trabaja en décimas enteras para cerrar siempre en 100.0%.
   */
  function redistributePctAtStage(values, stageIndex, nextValue) {
    var source = Array.isArray(values) ? values : [];
    var length = source.length;
    var index = Math.trunc(Number(stageIndex));
    if (!length || index < 0 || index >= length) return source.slice();
    if (length === 1) return [100];

    var requested = Number(nextValue);
    if (!Number.isFinite(requested)) requested = 0;
    var targetTenths = Math.max(0, Math.min(1000, Math.round(requested * 10)));
    var budgetTenths = 1000 - targetTenths;
    var otherIndexes = [];
    var weightTotal = 0;

    for (var i = 0; i < length; i += 1) {
      if (i === index) continue;
      otherIndexes.push(i);
      weightTotal += finiteNonNegative(source[i]);
    }

    var allocations = [];
    var allocatedTenths = 0;
    otherIndexes.forEach(function (otherIndex, order) {
      var weight = weightTotal > 0
        ? finiteNonNegative(source[otherIndex]) / weightTotal
        : 1 / otherIndexes.length;
      var rawTenths = budgetTenths * weight;
      var floorTenths = Math.floor(rawTenths);
      allocations.push({
        index: otherIndex,
        order: order,
        tenths: floorTenths,
        remainder: rawTenths - floorTenths
      });
      allocatedTenths += floorTenths;
    });

    var remainingTenths = budgetTenths - allocatedTenths;
    allocations.slice().sort(function (a, b) {
      if (b.remainder !== a.remainder) return b.remainder - a.remainder;
      return a.order - b.order;
    }).slice(0, remainingTenths).forEach(function (item) {
      allocations[item.order].tenths += 1;
    });

    var output = source.map(function () { return 0; });
    output[index] = targetTenths / 10;
    allocations.forEach(function (item) {
      output[item.index] = item.tenths / 10;
    });
    return output;
  }

  return {
    redistributePctAtStage: redistributePctAtStage
  };
});
