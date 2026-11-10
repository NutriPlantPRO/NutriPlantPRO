'use strict';

var assert = require('node:assert/strict');
var R = require('../assets/np-rentabilidad-core.js');

function closeTo(actual, expected) {
  assert.ok(Number.isFinite(actual), 'se esperaba un número y llegó ' + actual);
  assert.ok(Math.abs(actual - expected) < 1e-6, actual + ' ≠ ' + expected);
}

module.exports = [
  {
    name: 'Rentabilidad A: costo, utilidad, margen y precio de equilibrio',
    run: function () {
      var result = R.evaluateCrop(R.exampleModuleA());
      assert.equal(result.ok, true);
      closeTo(result.totalCost, 15000);
      closeTo(result.revenue, 20000);
      closeTo(result.costPerKg, 0.75);
      closeTo(result.profit, 5000);
      closeTo(result.returnOnCostPct, (5000 / 15000) * 100);
      closeTo(result.marginOnSalesPct, 25);
      closeTo(result.breakEvenPrice, 0.75);
      assert.equal(result.loss, false);
      assert.equal(R.formatMoney(result.totalCost, 'USD'), 'USD 15,000');
      assert.equal(R.formatPerKg(result.costPerKg, 'USD'), 'USD 0.75/kg');
      assert.equal(R.formatPct(result.returnOnCostPct), '33.33%');
      assert.equal(R.formatPct(result.marginOnSalesPct), '25%');
      assert.notEqual(R.formatPct(result.returnOnCostPct), R.formatPct(result.marginOnSalesPct));
    }
  },
  {
    name: 'Rentabilidad B: programa de nutrición sin otros costos',
    run: function () {
      var result = R.evaluateInvestment(R.exampleModuleB());
      assert.equal(result.ok, true);
      closeTo(result.investmentDelta, 200);
      closeTo(result.productionDelta, 1000);
      closeTo(result.revenueDelta, 1000);
      assert.equal(result.incomeRatioLabel, '5:1');
      assert.equal(result.benefitCostRatioLabel, '5:1');
      closeTo(result.incrementalProfit, 800);
      closeTo(result.extraKgNeeded, 200);
      assert.equal(result.extraKgMode, 'same_price');
      assert.equal(result.recovered, true);
      var text = R.conclusionModuleB(result, { strategyName: 'Programa de nutrición' });
      assert.match(text, /200/);
      assert.match(text, /1,000 kg/);
      assert.match(text, /No afirma que una tecnología/);
    }
  },
  {
    name: 'Rentabilidad C: costo variable de 0.20 por kg adicional',
    run: function () {
      var input = R.exampleModuleB();
      input.otherMode = 'per_kg';
      input.variablePerKg = 0.2;
      var result = R.evaluateInvestment(input);
      closeTo(result.revenueDelta, 1000);
      closeTo(result.otherIncremental, 200);
      closeTo(result.benefitBeforeInvestment, 800);
      closeTo(result.investmentDelta, 200);
      closeTo(result.incrementalProfit, 600);
      assert.equal(result.incomeRatioLabel, '5:1');
      assert.equal(result.benefitCostRatioLabel, '4:1');
      closeTo(result.extraKgNeeded, 250);
      assert.notEqual(result.incomeRatioLabel, result.benefitCostRatioLabel);
    }
  },
  {
    name: 'Rentabilidad D: más costo y la misma producción no se recupera',
    run: function () {
      var input = R.exampleModuleB();
      input.improved.soldKg = 20000;
      var result = R.evaluateInvestment(input);
      closeTo(result.revenueDelta, 0);
      closeTo(result.incrementalProfit, -200);
      assert.equal(result.loss, true);
      assert.equal(result.recovered, false);
      assert.match(R.conclusionModuleB(result, {}), /no se recupera/);
    }
  },
  {
    name: 'Rentabilidad E: mismo rendimiento y mejor precio',
    run: function () {
      var input = R.exampleModuleB();
      input.improved.soldKg = 20000;
      input.improved.pricePerKg = 1.05;
      var result = R.evaluateInvestment(input);
      closeTo(result.productionDelta, 0);
      closeTo(result.revenueDelta, 1000);
      closeTo(result.incrementalProfit, 800);
      assert.equal(result.origin, 'price');
      assert.notEqual(result.revenueDelta, result.productionDelta * result.improvedPrice);
      assert.equal(result.extraKgNeeded, 0);
      assert.match(R.conclusionModuleB(result, {}), /precio/);
    }
  },
  {
    name: 'Rentabilidad: no divide entre cero ni acepta kilos vendidos de más',
    run: function () {
      var zero = R.evaluateCrop({
        currency: 'USD',
        costs: [{ label: 'Nutrición', amount: 100, kind: 'cost' }],
        soldKg: 0,
        pricePerKg: 1
      });
      assert.equal(zero.ok, true);
      assert.equal(zero.costPerKg, null);
      assert.equal(zero.breakEvenPrice, null);
      closeTo(zero.profit, -100);

      var over = R.evaluateCrop({
        costs: [{ label: 'Nutrición', amount: 100, kind: 'cost' }],
        harvestedKg: 10,
        soldKg: 12,
        pricePerKg: 1
      });
      assert.equal(over.ok, false);
      assert.equal(over.costPerKg, null);
      assert.equal(over.errors.some(function (item) { return item.code === 'sold_exceeds_harvest'; }), true);

      var negative = R.evaluateCrop({
        costs: [{ label: 'Nutrición', amount: -5, kind: 'cost' }],
        soldKg: 10,
        pricePerKg: 1
      });
      assert.equal(negative.ok, false);
    }
  },
  {
    name: 'Rentabilidad: el volumen de equilibrio exige costos fijos y variables',
    run: function () {
      var missing = R.breakEvenVolume({ fixedCosts: 1000, pricePerKg: 1 });
      assert.equal(missing.ok, false);
      assert.equal(missing.kg, null);

      var blocked = R.breakEvenVolume({ fixedCosts: 1000, pricePerKg: 0.4, variableCostPerKg: 0.4 });
      assert.equal(blocked.ok, false);
      assert.equal(blocked.reason, 'no_positive_margin');

      var ok = R.breakEvenVolume({ fixedCosts: 1000, pricePerKg: 1, variableCostPerKg: 0.2 });
      closeTo(ok.kg, 1250);

      var fake = R.evaluateScenario({
        soldKg: 20000,
        pricePerKg: 1,
        costMode: 'constant_total',
        totalCost: 15000
      });
      assert.equal(fake.breakEvenVolumeKg, null);
      closeTo(fake.referenceKgAtConstantCost, 15000);
      closeTo(fake.breakEvenPrice, 0.75);
    }
  },
  {
    name: 'Rentabilidad: sin inversión extra no fabrica una relación',
    run: function () {
      var input = R.exampleModuleB();
      input.improved.programCost = 1800;
      input.improved.soldKg = 20000;
      var result = R.evaluateInvestment(input);
      closeTo(result.investmentDelta, -200);
      assert.equal(result.incomeRatio, null);
      assert.equal(result.benefitCostRatio, null);
      assert.match(result.ratioBlockedReason, /ahorro/);
      closeTo(result.incrementalProfit, 200);
    }
  },
  {
    name: 'Rentabilidad: el financiamiento no se mete solo al costo operativo',
    run: function () {
      var input = R.exampleModuleA();
      input.financingCost = 500;
      var result = R.evaluateCrop(input);
      closeTo(result.totalCost, 15000);
      closeTo(result.profit, 5000);
      closeTo(result.profitAfterFinancing, 4500);
      var moved = R.suggestModuleBFromA(input, result);
      assert.equal(moved.nutritionCost, 2000);
      assert.notEqual(moved.nutritionCost, result.totalCost);
    }
  }
];
