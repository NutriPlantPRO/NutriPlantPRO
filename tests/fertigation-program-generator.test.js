const assert = require('assert');
const generator = require('../assets/np-fertigation-program-generator.js');

const materials = [
  { id: 'cacl2_dihidratado', CaO: 38.1, Cl: 48.2 },
  { id: 'nitrato_calcio_granular', N_NO3: 14.4, N_NH4: 1.1, CaO: 26 },
  { id: 'nitrato_magnesio', N_NO3: 10.8, MgO: 15 },
  { id: 'map', N_NH4: 12, P2O5: 61 },
  { id: 'mkp', P2O5: 52, K2O: 34 },
  { id: 'nks', N_NO3: 12, K2O: 46, SO4: 8.1 },
  { id: 'sop', K2O: 50, SO4: 51 },
  { id: 'sulfato_magnesio', MgO: 16, SO4: 37.5 },
  { id: 'fosfonitrato_33_03_00', N_NO3: 16.5, N_NH4: 16.5, P2O5: 3 },
  { id: 'sulfonit_33_00_00_2s', N_NO3: 15.5, N_NH4: 17.5, S: 2 },
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

(function calciumNitrateCoversCaAndNWithoutChloride() {
  const result = generator.solveStage(
    { N: 5, CaO: 40, MgO: 0, P2O5: 0, K2O: 0, SO4: 0 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('nitrato_calcio_granular'));
  assert.ok(!ids.includes('cacl2_dihidratado'), ids.join(','));
  assert.ok(result.supplied.N > 0);
  assert.ok(result.supplied.N <= 5 + 1e-8);
  assert.ok(result.unresolved.includes('CaO'));
  assert.ok(result.remaining.CaO > 0.25, result.remaining.CaO);
})();

(function magnesiumSulfateWhenNitrogenAlreadyCovered() {
  const result = generator.solveStage(
    { N: 0, MgO: 15, SO4: 0, CaO: 0, P2O5: 0, K2O: 0 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('sulfato_magnesio'), ids.join(','));
  assert.ok(!ids.includes('nitrato_magnesio'), 'nitrate when N is covered: ' + ids.join(','));
  assert.ok(result.excess.SO4 > 0, 'Mg sulfate may pass SO4');
})();

(function magnesiumNitrateWhenNitrogenStillOpenAndNoNFill() {
  const slim = materials.filter(m => m.id !== 'sulfonit_33_00_00_2s' && m.id !== 'fosfonitrato_33_03_00');
  const result = generator.solveStage(
    { N: 20, MgO: 15, SO4: 0, CaO: 0, P2O5: 0, K2O: 0 },
    {},
    slim
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('nitrato_magnesio'), ids.join(','));
  assert.ok(!ids.includes('sulfato_magnesio'), 'sulfate while leftover N is still open: ' + ids.join(','));
})();

(function leftoverNitrogenNotBlockedBySulfate() {
  const result = generator.solveStage(
    { N: 20, CaO: 0, MgO: 0, P2O5: 0, K2O: 0, SO4: 0 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('sulfonit_33_00_00_2s'), 'Sulfonit missing when SO4 remaining is 0: ' + ids.join(','));
  assert.ok(result.supplied.N > 15, result.supplied.N);
})();

(function tinyBulkSaltIsNotRepresentative() {
  const result = generator.solveStage(
    { N: 20, CaO: 0, MgO: 0.18, P2O5: 0, K2O: 0, SO4: 0.2 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(!ids.includes('sulfato_magnesio'), ids.join(','));
  result.rows.forEach(row => {
    const min = row.target === 'Fe' || row.target === 'Mn' || row.target === 'B' || row.target === 'Zn' || row.target === 'Cu' || row.target === 'Mo'
      ? generator.MIN_MICRO_DOSE_KG_HA
      : generator.MIN_BULK_DOSE_KG_HA;
    assert.ok(row.doseKgHa + 1e-9 >= min, `${row.materialId} ${row.doseKgHa}`);
  });
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

(function granularBaseFollowsEachNutrientTargetCurve() {
  const targets = [
    { N: 10, P2O5: 30 },
    { N: 30, P2O5: 10 }
  ];
  const byStage = generator.proportionalBase({ N: 20, P2O5: 8 }, targets);
  close(byStage[0].N, 5);
  close(byStage[1].N, 15);
  close(byStage[0].P2O5, 6);
  close(byStage[1].P2O5, 2);
})();

(function waterAndGranularBaseAreBothSubtracted() {
  const result = generator.generate({
    axis: 'semana',
    stages: ['Semana 1', 'Semana 2'],
    targetsByStage: [{ N: 10 }, { N: 30 }],
    waterContribution: { N: 4 },
    baseContribution: { N: 20 },
    waterDepths: [100, 100],
    materials
  });
  assert.strictEqual(result.ok, true);
  close(result.stages[0].water.N, 2);
  close(result.stages[0].base.N, 5);
  close(result.stages[0].fertilizerTarget.N, 3);
  close(result.stages[1].water.N, 2);
  close(result.stages[1].base.N, 15);
  close(result.stages[1].fertilizerTarget.N, 13);
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

(function mkpIsDefaultPhosphorusAndMapSkippedInFlower() {
  const highPLowK = { N: 30, CaO: 26, MgO: 6, P2O5: 40, K2O: 8, SO4: 12 };
  const flower = generator.solveStage(highPLowK, {}, materials, { stageName: 'Floración' });
  const fill = generator.solveStage(highPLowK, {}, materials, { stageName: 'Llenado' });
  const flowerIds = flower.rows.map(r => r.materialId);
  assert.ok(flowerIds.includes('mkp'), flowerIds.join(','));
  assert.ok(!flowerIds.includes('map'), 'MAP in flower: ' + flowerIds.join(','));
  assert.ok(fill.rows.some(r => r.materialId === 'map'), 'MAP missing in fill');
  assert.ok(flowerIds.indexOf('nitrato_calcio_granular') < flowerIds.indexOf('mkp'));
})();

(function leftoverNitrogenUsesSulfonitNotMagnesiumNitrate() {
  const result = generator.solveStage(
    { N: 80, CaO: 30, MgO: 16, P2O5: 12, K2O: 40, SO4: 50 },
    {},
    materials
  );
  const ids = result.rows.map(r => r.materialId);
  assert.ok(ids.includes('sulfonit_33_00_00_2s'), 'expected Sulfonit for leftover N: ' + ids.join(','));
  assert.ok(
    ids.includes('nitrato_magnesio') || ids.includes('sulfato_magnesio'),
    'expected a Mg source: ' + ids.join(',')
  );
  assert.ok(!ids.includes('nitrato_amonio'), ids.join(','));
  assert.ok(!ids.includes('sulfato_amonio_soluble'), ids.join(','));
  if (ids.includes('nitrato_magnesio') && ids.includes('sulfonit_33_00_00_2s')) {
    assert.ok(
      ids.indexOf('nitrato_magnesio') < ids.indexOf('sulfonit_33_00_00_2s'),
      'Mg nitrate before Sulfonit: ' + ids.join(',')
    );
  }
})();

(function magNitrateWhenSulfateAlreadyCoveredEvenWithOpenN() {
  const nThenS = generator.solveStage({ N: 8, MgO: 18, SO4: 0 }, {}, materials);
  const nThenSIds = nThenS.rows.map(r => r.materialId);
  assert.ok(nThenSIds.includes('nitrato_magnesio'), 'prefer Mg nitrate when S target is already met: ' + nThenSIds.join(','));
  if (nThenSIds.includes('sulfonit_33_00_00_2s')) {
    assert.ok(
      nThenSIds.indexOf('nitrato_magnesio') < nThenSIds.indexOf('sulfonit_33_00_00_2s'),
      'Mg nitrate before Sulfonit: ' + nThenSIds.join(',')
    );
  }
})();

(function magSulfateWhenNitrogenCoveredEvenIfSulfateTargetIsZero() {
  const nClosed = generator.solveStage({ N: 0, MgO: 18, SO4: 40 }, {}, materials);
  assert.ok(nClosed.rows.some(r => r.materialId === 'sulfato_magnesio'));
  assert.ok(!nClosed.rows.some(r => r.materialId === 'nitrato_magnesio'));
})();

(function highWaterSulfatePrefersMagnesiumNitrateBeforeSulfonit() {
  const result = generator.solveStage(
    { N: 25, MgO: 12, SO4: 0, CaO: 0, P2O5: 0, K2O: 0 },
    { SO4: 30 },
    materials
  );
  const ids = result.rows.map(r => r.materialId);
  assert.ok(ids.includes('nitrato_magnesio'), ids.join(','));
  assert.ok(ids.includes('sulfonit_33_00_00_2s'), ids.join(','));
  assert.ok(!ids.includes('sulfato_magnesio'), 'Mg sulfate should not add more S when water already filled it: ' + ids.join(','));
  assert.ok(ids.indexOf('nitrato_magnesio') < ids.indexOf('sulfonit_33_00_00_2s'), ids.join(','));
  assert.ok(result.excess.SO4 >= 29, result.excess.SO4);
})();

(function leftoverNitrogenPrefersSulfonitOverFosfonitrato() {
  const sulfonit = generator.solveStage({ N: 20, SO4: 10, P2O5: 8 }, {}, materials.filter(m => m.id !== 'mkp' && m.id !== 'map'));
  const ids = sulfonit.rows.map(r => r.materialId);
  assert.ok(ids.includes('sulfonit_33_00_00_2s'), ids.join(','));
  assert.ok(!ids.includes('fosfonitrato_33_03_00'), 'fosfonitrato should wait: ' + ids.join(','));
  assert.ok(!ids.includes('nitrato_amonio'), ids.join(','));
  assert.ok(!ids.includes('sulfato_amonio_soluble'));

  const onlyFosfo = materials.filter(m => m.id !== 'sulfonit_33_00_00_2s' && m.id !== 'mkp' && m.id !== 'map');
  const fosfo = generator.solveStage({ N: 20, P2O5: 8 }, {}, onlyFosfo);
  assert.ok(fosfo.rows.some(r => r.materialId === 'fosfonitrato_33_03_00'), fosfo.rows.map(r => r.materialId).join(','));
})();

(function sulfurIsNotForcedWithAmmoniumSulfate() {
  const result = generator.solveStage({ N: 5, SO4: 40 }, {}, materials);
  assert.ok(!result.rows.some(r => r.materialId === 'sulfato_amonio_soluble'));
})();

(function mkpKeepsPotassiumOnDistributionLine() {
  const risingK = [
    { N: 20, CaO: 26, MgO: 6, P2O5: 14, K2O: 20, SO4: 12 },
    { N: 22, CaO: 22, MgO: 6, P2O5: 13, K2O: 24, SO4: 14 },
    { N: 24, CaO: 16, MgO: 6, P2O5: 12, K2O: 28, SO4: 16 }
  ];
  const delivered = risingK.map(t => generator.solveStage(t, {}, materials).totalWithWater.K2O);
  assert.ok(delivered[1] + 1e-6 >= delivered[0] - 0.4, `K dip ${delivered.join(', ')}`);
  assert.ok(delivered[2] + 1e-6 >= delivered[1] - 0.4, `K dip ${delivered.join(', ')}`);
  risingK.forEach((t, i) => {
    const r = generator.solveStage(t, {}, materials);
    assert.ok(r.excess.K2O <= 1e-8, `K excess stage ${i}`);
    assert.ok(r.excess.P2O5 <= 1e-8, `P excess stage ${i}`);
    assert.ok(
      r.totalWithWater.K2O >= t.K2O * 0.9 || r.unresolved.includes('K2O'),
      `stage ${i} K ${r.totalWithWater.K2O} vs target ${t.K2O}`
    );
  });
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

(function acidFromWaterFollowsStageDepth() {
  const withAcid = materials.concat([
    { id: 'acido_nitrico_55', N_NO3: 12.2, unit: 'L', density: 1.33 }
  ]);
  const result = generator.generate({
    axis: 'semana',
    stages: ['Semana 1', 'Semana 2'],
    targetsByStage: [
      { N: 20, CaO: 10, K2O: 8, SO4: 6, P2O5: 4, MgO: 4 },
      { N: 20, CaO: 10, K2O: 8, SO4: 6, P2O5: 4, MgO: 4 }
    ],
    waterContribution: {},
    waterDepths: [100, 200],
    materials: withAcid,
    acid: { materialId: 'acido_nitrico_55', mlPerM3: 18.97, densityKgL: 1.33 }
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.materialIds[0], 'acido_nitrico_55');
  const row0 = result.stages[0].rows.find(r => r.materialId === 'acido_nitrico_55');
  const row1 = result.stages[1].rows.find(r => r.materialId === 'acido_nitrico_55');
  assert.ok(row0, 'acid missing stage 0');
  assert.ok(row1, 'acid missing stage 1');
  close(row0.doseAmount, 1.897, 1e-6);
  close(row1.doseAmount, 3.794, 1e-6);
  close(row0.doseKgHa, 1.897 * 1.33, 1e-6);
  assert.ok(result.stages[0].supplied.N > 0);
  assert.ok(result.stages[0].rows[0].materialId === 'acido_nitrico_55');
})();

(function sulfuricAcidEntersProgramEvenWhenSulfateIsFull() {
  const withAcid = materials.concat([
    { id: 'acido_sulfurico_98', SO4: 96, unit: 'L', density: 1.84 }
  ]);
  const result = generator.generate({
    axis: 'semana',
    stages: ['Semana 1'],
    targetsByStage: [{ N: 10, CaO: 8, K2O: 6, SO4: 0, P2O5: 4, MgO: 4 }],
    waterContribution: {},
    waterDepths: [150],
    materials: withAcid,
    acid: { materialId: 'acido_sulfurico_98', mlPerM3: 20, densityKgL: 1.84 }
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.materialIds[0], 'acido_sulfurico_98');
  const row = result.stages[0].rows.find(r => r.materialId === 'acido_sulfurico_98');
  assert.ok(row, 'sulfuric acid missing');
  close(row.doseAmount, 3, 1e-6);
  assert.ok(result.stages[0].excess.SO4 > 0, 'acid SO4 may go over');
})();

(function nksFillsPotassiumFirst() {
  const result = generator.solveStage(
    { N: 50, CaO: 20, MgO: 6, P2O5: 8, K2O: 30, SO4: 12 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('nks'), 'NKS missing: ' + ids.join(','));
  assert.ok(!ids.includes('sop'), 'SOP should wait until N is full: ' + ids.join(','));
  assert.ok(result.excess.N <= 1e-8, result.excess.N);
})();

(function sopComplementsPotassiumWhenNitrogenWouldOvershoot() {
  const result = generator.solveStage(
    { N: 16, CaO: 26, MgO: 8, P2O5: 8, K2O: 50, SO4: 30 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('sop'), 'SOP missing when N limits NKS: ' + ids.join(','));
  const sop = result.rows.find(row => row.materialId === 'sop');
  assert.ok(sop.doseKgHa + 1e-9 >= generator.MIN_BULK_DOSE_KG_HA, sop.doseKgHa);
  assert.ok(sop.contribution.SO4 > 1, sop.contribution.SO4);
  assert.ok(result.excess.N <= 1e-8, 'SOP must not overshoot N');
  assert.ok(result.supplied.K2O + 1e-6 >= 49.9, result.supplied.K2O);
})();

(function nksCoversPotassiumEvenWhenSulfateIsAlreadyFull() {
  const result = generator.solveStage(
    { N: 40, CaO: 5, MgO: 0, P2O5: 0, K2O: 30, SO4: 0 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('nks'), 'NKS missing when SO4 remaining is 0: ' + ids.join(','));
  assert.ok(!ids.includes('sop'), 'SOP should wait while N still has room: ' + ids.join(','));
  assert.ok(result.supplied.K2O > 20, result.supplied.K2O);
  assert.ok(result.excess.SO4 > 0, 'incidental SO4 from NKS is allowed to cover K');
  assert.ok(result.excess.N <= 1e-8, result.excess.N);
})();

(function sopCoversPotassiumWhenNitrogenAndSulfateAreFull() {
  const result = generator.solveStage(
    { N: 15.5, CaO: 26, MgO: 0, P2O5: 0, K2O: 40, SO4: 0 },
    {},
    materials
  );
  const ids = result.rows.map(row => row.materialId);
  assert.ok(ids.includes('sop'), 'SOP missing when N and SO4 are full: ' + ids.join(','));
  assert.ok(!ids.includes('nks'), 'NKS would overshoot N: ' + ids.join(','));
  assert.ok(result.supplied.K2O > 35, result.supplied.K2O);
  assert.ok(result.excess.N <= 1e-8, result.excess.N);
  assert.ok(result.excess.SO4 > 0, 'SOP may add SO4 to cover K');
})();

console.log('fertigation-program-generator tests passed');
