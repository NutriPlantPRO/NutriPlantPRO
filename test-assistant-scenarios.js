/*
  Pruebas de regresión para decisiones cruzadas del asistente.
  Ejecutar: node test-assistant-scenarios.js
*/

function deriveCrossModuleSignals(project) {
  const signals = [];
  const soil = project?.soilAnalysis?.initial || {};
  const k = Number(soil.k) || 0;
  const ca = Number(soil.ca) || 0;
  const mg = Number(soil.mg) || 0;
  const na = Number(soil.na) || 0;
  const h = Number(soil.h) || 0;
  const al = Number(soil.al) || 0;
  const cic = (Number(soil.cic) > 0 ? Number(soil.cic) : (k + ca + mg + na + h + al));
  const kPct = cic > 0 ? (k / cic) * 100 : null;
  const naPct = cic > 0 ? (na / cic) * 100 : null;

  const fertReq = project?.fertirriego?.requirements || {};
  const granularReq = project?.granular?.requirements || {};
  const fertK = Number(fertReq.K || fertReq.k || fertReq.K2O || fertReq.k2o || 0);
  const granK = Number(granularReq.K || granularReq.k || granularReq.K2O || granularReq.k2o || 0);

  if (kPct != null && kPct > 7 && (fertK > 0 || granK > 0)) {
    signals.push('K suelo alto vs K programa');
  }
  if (naPct != null && naPct > 1) {
    signals.push('Na alto');
  }
  return signals;
}

function contradictionDetected(response, project) {
  const safe = String(response || '');
  const adj = project?.soilAnalysis?.adjustments || {};
  const ini = project?.soilAnalysis?.initial || {};
  const cic = Number(ini.cic) || (Number(ini.k || 0) + Number(ini.ca || 0) + Number(ini.mg || 0) + Number(ini.na || 0) + Number(ini.h || 0) + Number(ini.al || 0));
  const kPct = cic > 0 ? ((Number(ini.k) || 0) / cic) * 100 : null;
  const asksIncreaseK = /subir\s+k|aumentar\s+k|incrementar\s+k/i.test(safe) && !/no\s+(subir|aumentar|incrementar)\s+k/i.test(safe);
  return asksIncreaseK && ((Number(adj.k) < 0) || (kPct != null && kPct > 7));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const project = {
    soilAnalysis: {
      initial: { k: 3, ca: 12, mg: 5, na: 3, h: 0, al: 0, cic: 23 },
      adjustments: { k: -1.85, ca: 5.25, mg: -1.55 }
    },
    fertirriego: { requirements: { K: 100 } },
    granular: { requirements: { K2O: 80 } }
  };

  const signals = deriveCrossModuleSignals(project);
  assert(signals.includes('K suelo alto vs K programa'), 'Debe detectar conflicto K alto suelo vs programa de K');
  assert(signals.includes('Na alto'), 'Debe detectar Na alto');

  const badResponse = 'Se recomienda aumentar K para mejorar rendimiento.';
  assert(contradictionDetected(badResponse, project), 'Debe detectar contradicción cuando sugiere subir K con ajuste negativo/K alto');

  const goodResponse = 'Se recomienda NO aumentar K y priorizar Ca para corregir balance.';
  assert(!contradictionDetected(goodResponse, project), 'No debe marcar contradicción en respuesta coherente');

  console.log('OK: test-assistant-scenarios');
}

run();
