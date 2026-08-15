const assert = require('assert');
const generator = require('../assets/np-fertigation-program-generator.js');

const materials = [
  { id: 'nitrato_calcio_granular', N_NO3: 14.4, N_NH4: 1.1, CaO: 26 },
  { id: 'nitrato_magnesio', N_NO3: 10.8, MgO: 15 },
  { id: 'map', N_NH4: 12, P2O5: 61 },
  { id: 'mkp', P2O5: 52, K2O: 34 },
  { id: 'nks', N_NO3: 12, K2O: 46, SO4: 8.1 },
  { id: 'sop', K2O: 50, SO4: 51 },
  { id: 'sulfato_magnesio', MgO: 16, SO4: 37.5 },
  { id: 'sulfato_amonio_soluble', N_NH4: 21, SO4: 72 },
  { id: 'fe_eddha', Fe: 6 },
  { id: 'quelato_mn', Mn: 13 },
  { id: 'acido_borico', B: 17 },
  { id: 'quelato_zn', Zn: 13 },
  { id: 'quelato_cu', Cu: 14 },
  { id: 'molibdato_sodio', Mo: 39 }
];

function close(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= eps, `${actual} != ${expected}`);
}

(function calciumIsFirstAndNeverOvershoots() {
  const result = generator.solveStage(
    { N: 30, CaO: 26, MgO: 10, P2O5: 8, K2O: 25, SO4: 30 },
    {},
    materials
  );
  assert.strictEqual(result.rows[0].materialId, 'nitrato_calcio_granular');
  generator.TARGET_KEYS.forEach(key => assert.ok(result.excess[key] <= 1e-8, `excess ${key}`));
})();

(function magnesiumUsesNitrateThenSulfate() {
  const result = generator.solveStage(
    { N: 5, MgO: 20, SO4: 30, CaO: 0, P2O5: 0, K2O: 0 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('nitrato_magnesio'));
  assert.ok(ids.includes('sulfato_magnesio'));
})();

(function waterIsDistributedByDepth() {
  const result = generator.proportionalWater({ N: 30, CaO: 12 }, [100, 200]);
  assert.strictEqual(result.ok, true);
  close(result.byStage[0].N, 10);
  close(result.byStage[1].N, 20);
  close(result.byStage[0].CaO, 4);
  close(result.byStage[1].CaO, 8);
})();

(function waterNeedsDepthWhenContributionExists() {
  const result = generator.proportionalWater({ N: 10 }, [0, 0]);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'water-depth-required');
})();

(function impossibleTargetStaysVisible() {
  const result = generator.solveStage({ SiO2: 5 }, {}, materials);
  assert.ok(result.unresolved.includes('SiO2'));
  close(result.remaining.SiO2, 5);
})();

(function waterExcessIsReportedWithoutAddingFertilizer() {
  const result = generator.solveStage({ N: 2 }, { N: 5 }, materials);
  close(result.supplied.N, 0);
  close(result.excess.N, 3);
})();

(function nitrogenComesFromChosenProducts() {
  const result = generator.solveStage(
    { N: 25, CaO: 20, MgO: 5, P2O5: 5, K2O: 10, SO4: 15 },
    {},
    materials
  );
  assert.ok(result.supplied.N > 0);
  assert.ok(result.supplied.N <= 25 + 1e-8);
})();

(function generatesWeeklyProgram() {
  const result = generator.generate({
    axis: 'semana',
    stages: ['Semana 1', 'Semana 2'],
    targetsByStage: [
      { N: 10, CaO: 8, K2O: 6, SO4: 5 },
      { N: 20, CaO: 12, K2O: 10, SO4: 8 }
    ],
    waterContribution: { N: 3 },
    waterDepths: [100, 200],
    materials
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.stages.length, 2);
  close(result.stages[0].water.N, 1);
  close(result.stages[1].water.N, 2);
})();

console.log('fertigation-program-generator tests passed');
