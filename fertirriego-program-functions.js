// =====================================================
// FERTIRRIEGO - PROGRAMA SEMANAL (Resumen + Semanas)
// =====================================================

function fertProgUI() { return window.NpFertigationUI || null; }
function fertProgT(key, es) { const ui = fertProgUI(); return ui ? ui.t(key, es) : es; }
function fertProgUnit(kind, fallback) { const ui = fertProgUI(); return ui ? ui.unit(kind) : fallback; }
function fertProgUnitToHtml(kind, fallback) {
  return String(fertProgUnit(kind, fallback) || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/cm³/g, 'cm<sup>3</sup>')
    .replace(/m³/g, 'm<sup>3</sup>')
    .replace(/cm3/g, 'cm<sup>3</sup>')
    .replace(/m3/g, 'm<sup>3</sup>');
}
function fertProgInputFromSI(value, kind, digits) { const ui = fertProgUI(); return ui ? ui.inputFromSI(value, kind, digits) : String(value); }
function fertProgResultFromSI(value, kind, digits) {
  const ui = fertProgUI();
  return ui ? ui.resultFromSI(value, kind, digits) : fertiNum(value, digits == null ? 2 : digits);
}
function fertProgToSI(value, kind) { const ui = fertProgUI(); return ui ? ui.toSI(value, kind) : Number(value); }
function fertProgStage(name) { const ui = fertProgUI(); return ui ? ui.stageName(name) : name; }
function fertProgMaterial(name) { const ui = fertProgUI(); return ui ? ui.materialName(name) : name; }
function fertProgChartYAxisTitle() {
  const ui = fertProgUI();
  return ui && typeof ui.chartYAxisTitle === 'function' ? ui.chartYAxisTitle() : 'Kg de nutriente';
}
function fertProgChartDoseSeries(values) {
  const ui = fertProgUI();
  if (ui && typeof ui.chartDoseSeries === 'function') return ui.chartDoseSeries(values);
  return Array.isArray(values) ? values.slice() : [];
}
function fertProgNutrientColor(key) {
  const ui = fertProgUI();
  if (ui && typeof ui.nutrientColor === 'function') return ui.nutrientColor(key);
  const fallback = {
    N_NO3: '#2563eb', N_NH4: '#3b82f6', P2O5: '#16a34a', K2O: '#ea580c',
    CaO: '#7c3aed', MgO: '#0891b2', SO4: '#ca8a04',
    Fe: '#db2777', Mn: '#0d9488', B: '#4f46e5', Zn: '#64748b', Cu: '#059669', Mo: '#b45309'
  };
  return fallback[key] || '#64748b';
}
function fertProgMacroColors() {
  return {
    N_NO3: fertProgNutrientColor('N_NO3'),
    N_NH4: fertProgNutrientColor('N_NH4'),
    P2O5: fertProgNutrientColor('P2O5'),
    K2O: fertProgNutrientColor('K2O'),
    CaO: fertProgNutrientColor('CaO'),
    MgO: fertProgNutrientColor('MgO'),
    SO4: fertProgNutrientColor('SO4')
  };
}
function fertProgMicroColors() {
  return {
    Fe: fertProgNutrientColor('Fe'),
    Mn: fertProgNutrientColor('Mn'),
    B: fertProgNutrientColor('B'),
    Zn: fertProgNutrientColor('Zn'),
    Cu: fertProgNutrientColor('Cu'),
    Mo: fertProgNutrientColor('Mo')
  };
}

// DB básica de fertilizantes solubles (porcentaje en masa)
// Nota: En sulfatos use SO4 = % masa del ion SO₄²⁻ en el producto; en hidroponía S elemental = SO4/3 (32/96).
const FERT_SOLUBLES_DB = [
  // Nitrogenados
  { id: 'fosfonitrato_33_03_00', name: 'Fosfonitrato', N_NO3: 16.5, N_NH4: 16.5, P2O5: 3 },
  { id: 'sulfonit_33_00_00_2s', name: 'Sulfonit', N_NO3: 15.5, N_NH4: 17.5, S: 2 },
  { id: 'sulfato_amonio_soluble', name: 'Sulfato de Amonio Soluble', N_NO3: 0, N_NH4: 21, SO4: 72, S: 0 },

  // Fosfatos
  { id: 'map', name: 'MAP', N_NO3: 0, N_NH4: 12, P2O5: 61 },
  { id: 'mkp', name: 'MKP', N_NO3: 0, N_NH4: 0, P2O5: 52, K2O: 34 },

  // Potasio y mezclas
  { id: 'nks', name: 'NKS', N_NO3: 12, N_NH4: 0, K2O: 46, SO4: 8.1, S: 0 },
  { id: 'nk_mg', name: 'NK+Mg', N_NO3: 13.0, N_NH4: 0, K2O: 46, MgO: 2 },
  { id: 'sop', name: 'SOP', N_NO3: 0, N_NH4: 0, K2O: 50, SO4: 51, S: 0 },
  /** K₂O 60% típico; Cl ≈ (K₂O/1,204)×(35,45/39,10) coherente con sal KCl. */
  { id: 'kcl_soluble', name: 'KCl Soluble', N_NO3: 0, N_NH4: 0, K2O: 60, Cl: 45.2 },
  /** CaCl₂·2H₂O soluble: CaO y Cl en % masa (referencia agrícola habitual). */
  { id: 'cacl2_dihidratado', name: 'Cloruro de calcio (dihidratado)', N_NO3: 0, N_NH4: 0, CaO: 38.1, Cl: 48.2 },

  // Calcio y Magnesio
  { id: 'nitrato_calcio_granular', name: 'Nitrato de Calcio', N_NO3: 14.4, N_NH4: 1.1, CaO: 26 },
  { id: 'nitrato_calcio_cristal', name: 'Nitrato de Calcio Cristal', N_NO3: 12, N_NH4: 0, CaO: 23, MgO: 0.5 },
  { id: 'nitrato_magnesio', name: 'Nitrato de Magnesio', N_NO3: 10.8, N_NH4: 0, MgO: 15 },
  { id: 'sulfato_magnesio', name: 'Sulfato de Magnesio', N_NO3: 0, N_NH4: 0, MgO: 16, SO4: 37.5, S: 0 },

  // Complejos NPK con micros
  { id: 'triple_19_me', name: 'Triple 19 +Me', N_NO3: 9.4, N_NH4: 9.7, P2O5: 19, K2O: 19, SO4: 3.9, Fe: 0.10, Mn: 0.05, B: 0.02, Zn: 0.015, Cu: 0.011, Mo: 0.007 },
  { id: 'npk_13_04_25_znb', name: '13-4-25 Zn+B', N_NO3: 5.3, N_NH4: 7.7, P2O5: 4, K2O: 25, SO4: 27, S: 0, Zn: 0.08, B: 0.08 },

  // Micros
  { id: 'sulfato_zinc', name: 'Sulfato de Zinc', Zn: 22.5, SO4: 33.5, S: 0 },
  { id: 'sulfato_manganeso', name: 'Sulfato de Manganeso', Mn: 32.5, SO4: 56.5, S: 0 },
  { id: 'sulfato_ferroso', name: 'Sulfato de Hierro', Fe: 20.0, SO4: 38.0, S: 0 },
  { id: 'mix_micros_edta', name: 'Mix Micros EDTA', Fe: 6, Mn: 4, Zn: 2, Cu: 1, B: 1 },
  { id: 'quelato_fe', name: 'Fe EDTA', Fe: 13 },
  { id: 'fe_dtpa', name: 'Fe DTPA', Fe: 11 },
  { id: 'fe_eddha', name: 'Fe EDDHA', Fe: 6 },
  { id: 'quelato_mn', name: 'Mn EDTA', Mn: 13 },
  { id: 'quelato_zn', name: 'Zn EDTA', Zn: 13 },
  { id: 'quelato_cu', name: 'Cu EDTA', Cu: 14 },
  { id: 'acido_borico', name: 'Ácido Bórico', B: 17, N_NO3: 0, N_NH4: 0 },
  { id: 'molibdato_sodio', name: 'Molibdato de Sodio', Mo: 39 },

  // Ácidos al final de predefinidos (valores en % masa; si se dosifica en L requiere convertir por densidad)
  { id: 'acido_sulfurico_98', name: 'Ácido Sulfúrico 98%', SO4: 96, S: 0, unit: 'L', density: 1.84 },
  { id: 'acido_fosforico_75', name: 'Ácido Fosfórico 75%', P2O5: 54, unit: 'L', density: 1.57 },
  { id: 'acido_fosforico_85', name: 'Ácido Fosfórico 85%', P2O5: 61, unit: 'L', density: 1.685 },
  { id: 'acido_nitrico_55', name: 'Ácido Nítrico 55%', N_NO3: 12.2, unit: 'L', density: 1.33 }
];

// Estado del programa
let fertiWeeks = []; // [{ id,label,stage,kgByCol:{[colId]:number}, totals:{...} }]
let fertiWeekCounter = 1;
let fertiColumns = []; // [{ id, materialId }]
let fertiCustomMaterials = []; // merge usuario + proyecto
let fertiCustomMaterialsUser = [];
let fertiCustomMaterialsProject = [];
/** Precio USD/t (métrica) de precargados, compartido con hidro vía NpFertilizerPrice */
let fertiPriceOverrides = {};

function fertiGetPriceApi() {
  return (typeof window !== 'undefined' && window.NpFertilizerPrice) ? window.NpFertilizerPrice : null;
}

function fertiResolveMaterialPrice(materialId) {
  const api = fertiGetPriceApi();
  if (!api) return 0;
  let overrides = fertiPriceOverrides;
  if (!overrides || typeof overrides !== 'object' || !Object.keys(overrides).length) {
    try { overrides = api.loadMergedPriceOverrides() || {}; } catch (e) { overrides = {}; }
  }
  const customItems = (Array.isArray(fertiCustomMaterials) && fertiCustomMaterials.length)
    ? fertiCustomMaterials
    : (fertiCustomMaterialsUser || []);
  return api.resolvePriceUsdPerTonne(materialId, {
    customItems: customItems,
    priceOverrides: overrides
  });
}

function fertiCostUsdPerHaFromKg(kg, priceUsdPerTonne) {
  const priceApi = fertiGetPriceApi();
  if (priceApi && typeof priceApi.costUsdPerHaFromKgHa === 'function') {
    return priceApi.costUsdPerHaFromKgHa(kg, priceUsdPerTonne) || 0;
  }
  const mass = parseFloat(kg) || 0;
  const price = parseFloat(priceUsdPerTonne) || 0;
  if (!(mass > 0) || !(price > 0)) return 0;
  return (mass / 1000) * price;
}

function fertiProductKgFromAmount(amount, material) {
  const priceApi = fertiGetPriceApi();
  if (priceApi && typeof priceApi.productKgFromAmount === 'function') {
    return priceApi.productKgFromAmount(amount, material);
  }
  const a = parseFloat(amount) || 0;
  if (!(a > 0)) return 0;
  const unit = String((material && material.unit) || '').toUpperCase();
  const density = parseFloat(material && material.density);
  if (unit === 'L' && density > 0) return a * density;
  return a;
}

/** Totales de dosis y costo por columna (líquidos: L × densidad → kg × USD/t). */
function fertiProgramCostBreakdownUsdHa() {
  const materials = typeof getAllFertiMaterials === 'function' ? getAllFertiMaterials() : [];
  const cols = Array.isArray(fertiColumns) ? fertiColumns : [];
  const weeks = Array.isArray(fertiWeeks) ? fertiWeeks : [];
  const colTotals = cols.map(c => {
    let sum = 0;
    weeks.forEach(w => {
      if (!w || !c) return;
      sum += parseFloat(w.kgByCol && w.kgByCol[c.id]) || 0;
    });
    return sum;
  });
  const costs = cols.map((c, i) => {
    const mat = (materials || []).find(m => m && m.id === c.materialId);
    const kg = fertiProductKgFromAmount(colTotals[i] || 0, mat);
    return fertiCostUsdPerHaFromKg(kg, fertiResolveMaterialPrice(c && c.materialId));
  });
  const total = costs.reduce((s, v) => s + (v || 0), 0);
  const totalDose = colTotals.reduce((s, v) => s + (v || 0), 0);
  return { colTotals: colTotals, costs: costs, total: total, totalDose: totalDose };
}

/** Costo total del programa (USD/ha SI) a partir de kg/ha por columna × precio. */
function fertiComputeProgramTotalCostUsdHa() {
  try {
    return fertiProgramCostBreakdownUsdHa().total || 0;
  } catch (e) {
    return 0;
  }
}

function fertiPaintCycleHeaderCost(totalCostUsdHa) {
  const priceApi = fertiGetPriceApi();
  const priceLabels = priceApi ? priceApi.labels() : { costAreaUnit: 'USD/ha' };
  const costUnitEl = document.getElementById('fertiTotalCostUnit');
  if (costUnitEl) costUnitEl.textContent = priceLabels.costAreaUnit || 'USD/ha';
  const costEl = document.querySelector('#programa #fertiTotalCost') || document.getElementById('fertiTotalCost');
  if (!costEl) return;
  const totalCostDisp = priceApi && typeof priceApi.toDisplayAreaCost === 'function'
    ? priceApi.toDisplayAreaCost(totalCostUsdHa)
    : totalCostUsdHa;
  const n = Number(totalCostDisp);
  if (Number.isFinite(n) && n > 0) {
    costEl.textContent = (priceApi && typeof priceApi.formatMoney === 'function')
      ? priceApi.formatMoney(n)
      : n.toFixed(2);
  } else {
    costEl.textContent = '0.00';
  }
}

function fertiPersistPriceOverrides(overrides) {
  const api = fertiGetPriceApi();
  fertiPriceOverrides = api
    ? api.syncPriceOverridesToBoth(overrides)
    : (overrides && typeof overrides === 'object' ? overrides : {});
}
let fertiTimeUnit = 'semana'; // 'semana' | 'mes'
let fertiMacroChart = null; // Chart.js instances
let fertiMicroChart = null;
let fertiChartsElementalMode = false;
let fertiProgramInitialized = false;
// Estado de autosave (Programa)
let fertiProgDirty = false;
let fertiProgAutoTimer = null;
let fertiDistPushTimer = null;
let fertiChartsResizeTimer = null;
let fertiWaterInputsBound = false;
let fertiWaterContributionOxide = {
  N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0,
  Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0, Cl: 0
};
/** Id del análisis de agua del proyecto usado para rellenar «Aporte por agua» (opcional). */
let fertiWaterAnalysisId = '';
let fertiBaseContributionOxide = {
  N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0,
  Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0, Cl: 0
};
let fertiGranularProgramLinked = false;
let fertiDistributionCreditSignature = '';
// Gráficas: lámina de riego por etapa (m3/ha) y etapa seleccionada para análisis.
let fertiChartWaterByStageM3ha = [];
let fertiChartSelectedStageIndex = 0;
let fertiChartEditMode = false;
let fertiChartLockedColumnIds = [];
let fertiChartUndoSnapshot = null;
let fertiChartEditBaseline = null;
let fertiActiveChartDrag = null;
let fertiTernDrag = null;
let fertiProgramGenerationMeta = null;
let fertiProgramGenerationDiagnostics = null;

const FERTI_NUTRIENTS = ['N_NO3','N_NH4','P','P2O5','K','K2O','Ca','CaO','Mg','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','Si','SiO2'];

// Conversión de óxido↔elemental (mismos factores que en requerimiento)
const FERTI_CONV = { P2O5_TO_P: 2.291, K2O_TO_K: 1.204, CaO_TO_Ca: 1.399, MgO_TO_Mg: 1.658, SiO2_TO_Si: 2.139, SO4_TO_S: 96 / 32 };

// ==== Utilidades de almacenamiento unificado (formato Enmienda) ====
function fertiGetUnifiedProjectId(){
  try { if (window.projectManager && window.projectManager.getCurrentProject) { const p = window.projectManager.getCurrentProject(); if (p && p.id) return p.id; } } catch {}
  try { if (window.currentProject && window.currentProject.id) return window.currentProject.id; } catch {}
  try { const pid = localStorage.getItem('nutriplant-current-project'); if (pid) return pid; } catch {}
  return null;
}
function fertiUnifiedKey(){ const id = fertiGetUnifiedProjectId(); return id ? `nutriplant_project_${id}` : null; }
function fertiUnifiedMerge(updater){
  try {
    const key = fertiUnifiedKey(); if (!key) return;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    
    // 🚀 CRÍTICO: Preservar location antes de actualizar
    const existingLocation = obj.location;
    const hasValidLocation = existingLocation && 
                            existingLocation.polygon && 
                            Array.isArray(existingLocation.polygon) && 
                            existingLocation.polygon.length >= 3;
    
    updater(obj);
    
    // 🚀 CRÍTICO: Restaurar location después de actualizar
    if (hasValidLocation) {
      obj.location = existingLocation;
    }
    
    localStorage.setItem(key, JSON.stringify(obj));
  } catch(e){ console.warn('fertiUnifiedMerge error', e); }
}

if (typeof window !== 'undefined') {
  window.addEventListener('np:prefs-changed', function () {
    // fertiWeeks, waterContribution y chartWaterByStage permanecen en SI;
    // solo se vuelve a proyectar la presentación (incl. gráficas kg/ha → lb/acre).
    try { updateFertiProgramModeButtons(); } catch {}
    try { updateFertiProgramTimeTitle(); } catch {}
    try { renderFertiWeeks(); } catch {}
    try { updateFertiSummary(); } catch {}
    try { fertiRefreshWaterAnalysisSelect(); } catch {}
    try { updateFertiCharts(); } catch {}
  });
}

function isFertiMicroNutrient(key) { return ['Fe','Mn','B','Zn','Cu','Mo','Si','SiO2'].indexOf(key) !== -1; }

/** Una sola columna azufre: óxido = kg SO₄ eq.; elemental = kg S (S + SO₄/ factor). */
function fertiMergeSulfurKgDisplay(so4Kg, sKg) {
  const so4 = parseFloat(so4Kg) || 0;
  const s = parseFloat(sKg) || 0;
  if (fertProgElementalMode) return s + so4 / FERTI_CONV.SO4_TO_S;
  return so4 + s * FERTI_CONV.SO4_TO_S;
}

function fertiProgFormat(num, nutrientKey, sKgOpt) {
  let n;
  if (nutrientKey === 'SO4' && sKgOpt !== undefined) {
    n = fertiMergeSulfurKgDisplay(num, sKgOpt);
  } else {
    n = parseFloat(num || 0);
  }
  const decimals = (nutrientKey && isFertiMicroNutrient(nutrientKey)) ? 3 : 2;
  return isNaN(n) ? (decimals === 3 ? '0.000' : '0.00') : n.toFixed(decimals);
}

/** Aporte de nutriente en unidades de pantalla (kg/ha o lb/acre), alineado con TOTAL/PDF. */
function fertiProgNutrientDisplay(num, nutrientKey, sKgOpt) {
  let n;
  if (nutrientKey === 'SO4' && sKgOpt !== undefined) {
    n = fertiMergeSulfurKgDisplay(num, sKgOpt);
  } else {
    n = parseFloat(num || 0);
  }
  if (isNaN(n)) n = 0;
  const digits = (nutrientKey && isFertiMicroNutrient(nutrientKey)) ? 3 : 2;
  return fertProgResultFromSI(n, 'dose_mass_area', digits);
}

// Modo visual del programa (óxido/elemental)
let fertProgElementalMode = false;
let fertiProgModeInitialized = false;
function updateFertiProgramModeButtons() {
  const btns = document.querySelectorAll('#toggleFertiProgramOxideElementalBtn, #toggleFertiProgramOxideElementalBtnFerti');
  btns.forEach(btn => {
    btn.textContent = fertProgElementalMode
      ? fertProgT('oxide', '🔄 Ver en Óxido')
      : fertProgT('elemental', '🔄 Ver en Elemental');
  });
}
function toggleFertiProgramOxideElemental() {
  fertProgElementalMode = !fertProgElementalMode;
  fertiProgModeInitialized = true;
  updateFertiProgramModeButtons();
  renderFertiWeeks();
  updateFertiSummary();
  try { saveFertirriegoProgram(); } catch {}
}

function syncFertiProgramModeOnce() {
  if (fertiProgModeInitialized) return;
  if (typeof window !== 'undefined' && window.fertirriegoElementalModeLoaded && typeof window.isFertirriegoElementalMode === 'boolean') {
    fertProgElementalMode = window.isFertirriegoElementalMode;
    fertiProgModeInitialized = true;
    return;
  }
  try {
    const key = fertiUnifiedKey();
    if (key) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const o = JSON.parse(raw);
        const reqMode = o?.fertirriego?.requirements?.isElementalMode;
        if (typeof reqMode === 'boolean') {
          fertProgElementalMode = reqMode;
          fertiProgModeInitialized = true;
        }
      }
    }
  } catch {}
}

// Vista de nutrientes (macro | micro)
let fertiNutrientView = 'macro';
function setFertiNutrientView(view) {
  fertiNutrientView = view === 'micro' ? 'micro' : 'macro';
  const macroBtn = document.getElementById('fertiViewMacroBtn');
  const microBtn = document.getElementById('fertiViewMicroBtn');
  if (macroBtn && microBtn) {
    macroBtn.textContent = fertProgT('macros', 'Macros');
    microBtn.textContent = fertProgT('micros', 'Micros');
    if (fertiNutrientView === 'macro') {
      macroBtn.classList.remove('btn-secondary');
      macroBtn.classList.add('btn-primary');
      microBtn.classList.remove('btn-primary');
      microBtn.classList.add('btn-secondary');
    } else {
      microBtn.classList.remove('btn-secondary');
      microBtn.classList.add('btn-primary');
      macroBtn.classList.remove('btn-primary');
      macroBtn.classList.add('btn-secondary');
    }
  }
  renderFertiWeeks();
}

// Unidad de tiempo (semana/mes) para cabecera y etiquetas
function updateFertiProgramTimeTitle() {
  const titleEl = document.getElementById('fertiProgramTitle');
  if (titleEl) {
    titleEl.textContent = fertiTimeUnit === 'mes'
      ? fertProgT('monthly_program', '📅 Programa Mensual')
      : fertProgT('weekly_program', '📅 Programa Semanal');
  }
  const countLabelEl = document.getElementById('fertiTotalApplicationsLabel');
  if (countLabelEl) {
    countLabelEl.textContent = fertiTimeUnit === 'mes'
      ? fertProgT('months', 'Número de Meses:')
      : fertProgT('weeks', 'Número de Semanas:');
  }
  const macroBtn = document.getElementById('fertiViewMacroBtn');
  const microBtn = document.getElementById('fertiViewMicroBtn');
  if (macroBtn) macroBtn.textContent = fertProgT('macros', 'Macros');
  if (microBtn) microBtn.textContent = fertProgT('micros', 'Micros');
}

function setFertiTimeUnit(unit, opts) {
  const next = unit === 'mes' ? 'mes' : 'semana';
  const changed = fertiTimeUnit !== next;
  fertiTimeUnit = next;
  updateFertiProgramTimeTitle();
  if (changed) {
    renderFertiWeeks();
    markFertiProgDirty();
    try { if (fertiProgramInitialized) saveFertirriegoProgram(); } catch (e) {}
  }
  if (!(opts && opts.fromDistribution) && typeof window.fertiDistSyncTimeUnit === 'function') {
    window.fertiDistSyncTimeUnit(fertiTimeUnit);
  }
}

function getFertiTimeUnit() {
  return fertiTimeUnit === 'mes' ? 'mes' : 'semana';
}

function pickFertiSharedTimeUnit(distState, program) {
  const distAxis = distState && (distState.axis === 'mes' || distState.axis === 'semana') ? distState.axis : null;
  let progUnit = null;
  if (program && program.timeUnit === 'mes') progUnit = 'mes';
  else if (program && program.timeUnit) progUnit = 'semana';
  if (distAxis && distAxis === progUnit) return distAxis;
  if (distAxis && !progUnit) return distAxis;
  if (progUnit && !distAxis) return progUnit;
  if (!distAxis && !progUnit) return 'semana';
  const distT = Number(distState && distState.updatedAt) || 0;
  const progT = Date.parse((program && (program.timestamp || program.updatedAt)) || 0) || 0;
  return progT > distT ? progUnit : distAxis;
}
if (typeof window !== 'undefined') {
  window.getFertiTimeUnit = getFertiTimeUnit;
  window.pickFertiSharedTimeUnit = pickFertiSharedTimeUnit;
  window.setFertiTimeUnit = setFertiTimeUnit;
}

// Materiales base + personalizados
function getAllFertiMaterials() {
  try {
    const merged = new Map();
    const push = (m) => {
      if (!m || !(m.id || m.name)) return;
      const id = String(m.id || m.name);
      if (!merged.has(id)) merged.set(id, m);
    };
    (FERT_SOLUBLES_DB || []).forEach(push);
    (Array.isArray(fertiCustomMaterials) ? fertiCustomMaterials : []).forEach(push);
    // Catálogo soluble compartido: personalizados creados en hidroponía
    if (typeof window.getHydroCustomMaterialsForShare === 'function') {
      const hydroList = window.getHydroCustomMaterialsForShare() || [];
      hydroList.forEach(function (hm) {
        if (!hm) return;
        const oxide = (typeof window.hydroElementalToFertiOxide === 'function')
          ? window.hydroElementalToFertiOxide(hm)
          : null;
        const mat = oxide || {
          id: hm.id,
          name: hm.name,
          N_NO3: hm.N_NO3, N_NH4: hm.N_NH4,
          P2O5: (parseFloat(hm.P) || 0) * 2.291,
          K2O: (parseFloat(hm.K) || 0) * 1.204,
          CaO: (parseFloat(hm.Ca) || 0) * 1.399,
          MgO: (parseFloat(hm.Mg) || 0) * 1.658,
          SO4: (parseFloat(hm.S) || 0) * 3,
          S: 0,
          Cl: hm.Cl, Fe: hm.Fe, Mn: hm.Mn, B: hm.B, Zn: hm.Zn, Cu: hm.Cu, Mo: hm.Mo,
          priceUsdPerTonne: hm.priceUsdPerTonne
        };
        const nameKey = String(mat.name || '').trim().toLowerCase();
        const already = Array.from(merged.values()).some(function (x) {
          return String(x.id) === String(mat.id) ||
            (nameKey && String(x.name || '').trim().toLowerCase() === nameKey);
        });
        if (!already) push(mat);
      });
    }
    return Array.from(merged.values());
  } catch {
    return [...FERT_SOLUBLES_DB];
  }
}

/** Solo los fertilizantes precargados (sin personalizados), para consulta de concentración */
function getBaseFertiMaterials() {
  return [...FERT_SOLUBLES_DB];
}

// ==== Catálogo de usuario (fertirriego) ====
function fertiGetCurrentUserId() {
  try { return localStorage.getItem('nutriplant_user_id'); } catch { return null; }
}
function fertiLoadUserProfile() {
  const userId = fertiGetCurrentUserId();
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`nutriplant_user_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function fertiSaveUserProfile(profile) {
  const userId = fertiGetCurrentUserId();
  if (!userId || !profile) return;
  try {
    localStorage.setItem(`nutriplant_user_${userId}`, JSON.stringify(profile));
    if (profile.customFertiMaterials && typeof profile.customFertiMaterials === 'object' && typeof window.nutriplantSyncCustomFertiMaterialsToCloud === 'function') {
      try { window.nutriplantSyncCustomFertiMaterialsToCloud(userId, profile.customFertiMaterials); } catch (e) { console.warn('Sync fertilizantes solubles a nube:', e); }
    }
  } catch {}
}
function normalizeFertiMaterials(data, source) {
  let list = [];
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.items)) list = data.items;
  else if (data && typeof data === 'object') {
    list = Object.values(data).filter(v => v && typeof v === 'object' && (v.id || v.name));
  }
  return list.map(m => ({ ...m, source: m.source || source }));
}
function mergeFertiCustomMaterials() {
  const merged = new Map();
  const push = (mat) => {
    const key = ((mat.id || mat.name || '') + '').toLowerCase();
    if (!key) return;
    merged.set(key, mat);
  };
  (Array.isArray(fertiCustomMaterialsUser) ? fertiCustomMaterialsUser : []).forEach(push);
  (Array.isArray(fertiCustomMaterialsProject) ? fertiCustomMaterialsProject : []).forEach(push);
  fertiCustomMaterials = Array.from(merged.values());
}

/** Importa solubles de hidroponía al catálogo de fertirriego (mismo catálogo soluble). */
function fertiImportSharedHydroCustoms() {
  if (typeof window.getHydroCustomMaterialsForShare !== 'function') return false;
  let hydroList = [];
  try { hydroList = window.getHydroCustomMaterialsForShare() || []; } catch (e) { return false; }
  if (!Array.isArray(hydroList) || !hydroList.length) return false;
  fertiCustomMaterialsUser = Array.isArray(fertiCustomMaterialsUser) ? fertiCustomMaterialsUser : [];
  const seen = new Set(fertiCustomMaterialsUser.map(function (m) {
    return ((m.id || m.name || '') + '').toLowerCase();
  }));
  const seenNames = new Set(fertiCustomMaterialsUser.map(function (m) {
    return String(m.name || '').trim().toLowerCase();
  }).filter(Boolean));
  let changed = false;
  hydroList.forEach(function (hm) {
    if (!hm) return;
    const key = ((hm.id || hm.name || '') + '').toLowerCase();
    const nameKey = String(hm.name || '').trim().toLowerCase();
    if (!key || seen.has(key) || (nameKey && seenNames.has(nameKey))) return;
    const oxide = (typeof window.hydroElementalToFertiOxide === 'function')
      ? window.hydroElementalToFertiOxide(hm)
      : null;
    if (!oxide) return;
    fertiCustomMaterialsUser = upsertFertiMaterial(fertiCustomMaterialsUser, oxide, 'user');
    seen.add(key);
    if (nameKey) seenNames.add(nameKey);
    changed = true;
  });
  if (changed) {
    saveFertiCustomMaterialsToUser();
    mergeFertiCustomMaterials();
  }
  return changed;
}

function fertiPushCustomToHydroCatalog(mat) {
  if (!mat || typeof window.upsertHydroCustomMaterialFromFerti !== 'function') return;
  const elem = (typeof window.hydroMaterialToElemental === 'function')
    ? window.hydroMaterialToElemental(mat)
    : null;
  // Fallback local si hidro aún no expuso el helper
  const out = elem || {
    id: mat.id,
    name: mat.name,
    N_NO3: parseFloat(mat.N_NO3) || 0,
    N_NH4: parseFloat(mat.N_NH4) || 0,
    P: (parseFloat(mat.P2O5) || 0) / 2.291 || parseFloat(mat.P) || 0,
    K: (parseFloat(mat.K2O) || 0) / 1.204 || parseFloat(mat.K) || 0,
    Ca: (parseFloat(mat.CaO) || 0) / 1.399 || parseFloat(mat.Ca) || 0,
    Mg: (parseFloat(mat.MgO) || 0) / 1.658 || parseFloat(mat.Mg) || 0,
    S: parseFloat(mat.S) || ((parseFloat(mat.SO4) || 0) / 3) || 0,
    Cl: parseFloat(mat.Cl) || 0,
    Fe: parseFloat(mat.Fe) || 0,
    Mn: parseFloat(mat.Mn) || 0,
    B: parseFloat(mat.B) || 0,
    Zn: parseFloat(mat.Zn) || 0,
    Cu: parseFloat(mat.Cu) || 0,
    Mo: parseFloat(mat.Mo) || 0,
    priceUsdPerTonne: parseFloat(mat.priceUsdPerTonne) || 0
  };
  if (elem && mat.priceUsdPerTonne != null) out.priceUsdPerTonne = parseFloat(mat.priceUsdPerTonne) || 0;
  try { window.upsertHydroCustomMaterialFromFerti(out); } catch (e) { console.warn('Sync ferti→hidro:', e); }
}

function fertiRemoveCustomFromHydroCatalog(key) {
  if (!key || typeof window.removeHydroCustomMaterialShared !== 'function') return;
  try { window.removeHydroCustomMaterialShared(key); } catch (e) { console.warn('Remove hydro shared:', e); }
}

window.getFertiCustomMaterialsForShare = function () {
  mergeFertiCustomMaterials();
  return Array.isArray(fertiCustomMaterials) ? fertiCustomMaterials.slice() : [];
};
window.upsertFertiCustomMaterialFromHydro = function (oxideMat) {
  if (!oxideMat || !(oxideMat.id || oxideMat.name)) return;
  fertiCustomMaterialsUser = upsertFertiMaterial(fertiCustomMaterialsUser, oxideMat, 'user');
  saveFertiCustomMaterialsToUser();
  mergeFertiCustomMaterials();
  try {
    if (document.getElementById('fertiCustomMaterialsList')) renderFertiCustomMaterialsList();
    if (typeof renderFertiWeeks === 'function') renderFertiWeeks();
  } catch (e) {}
};
window.removeFertiCustomMaterialShared = function (key) {
  const k = String(key || '').toLowerCase();
  if (!k) return;
  const match = (m) => ((m.id || m.name || '') + '').toLowerCase() === k ||
    String(m.name || '').trim().toLowerCase() === k;
  const userBefore = (fertiCustomMaterialsUser || []).length;
  const projBefore = (fertiCustomMaterialsProject || []).length;
  fertiCustomMaterialsUser = (fertiCustomMaterialsUser || []).filter(m => !match(m));
  fertiCustomMaterialsProject = (fertiCustomMaterialsProject || []).filter(m => !match(m));
  if (userBefore !== fertiCustomMaterialsUser.length) saveFertiCustomMaterialsToUser();
  if (projBefore !== fertiCustomMaterialsProject.length) saveFertiCustomMaterials();
  mergeFertiCustomMaterials();
  try {
    if (document.getElementById('fertiCustomMaterialsList')) renderFertiCustomMaterialsList();
  } catch (e) {}
};
function upsertFertiMaterial(list, mat, source) {
  const safeList = Array.isArray(list) ? list : [];
  const key = ((mat.id || mat.name || '') + '').toLowerCase();
  if (!key) return safeList;
  const next = safeList.filter(m => ((m.id || m.name || '') + '').toLowerCase() !== key);
  next.push({ ...mat, source: source || mat.source });
  return next;
}
function stripFertiSource(mat) {
  const clean = { ...mat };
  if (clean.source) delete clean.source;
  return clean;
}
function saveFertiCustomMaterialsToUser() {
  try {
    const items = (Array.isArray(fertiCustomMaterialsUser) ? fertiCustomMaterialsUser : [])
      .map(stripFertiSource);
    const api = fertiGetPriceApi();
    const priceOverrides = api
      ? api.normalizeOverrides(fertiPriceOverrides)
      : (fertiPriceOverrides && typeof fertiPriceOverrides === 'object' ? fertiPriceOverrides : {});
    fertiPriceOverrides = priceOverrides;
    const blob = { items, priceOverrides };
    const userId = fertiGetCurrentUserId();
    if (userId) {
      const profile = fertiLoadUserProfile() || {};
      profile.customFertiMaterials = blob;
      fertiSaveUserProfile(profile);
      if (api) api.syncPriceOverridesToBoth(priceOverrides);
    } else {
      try {
        localStorage.setItem('fertiCustomMaterials_global_user', JSON.stringify(blob));
        if (api) api.syncPriceOverridesToBoth(priceOverrides);
      } catch (e) {}
    }
  } catch {}
}

function fertiCustomMaterialCompositionText(mat) {
  if (!mat) return '';
  const specs = [
    ['N(NO₃)', 'N_NO3'],
    ['N(NH₄)', 'N_NH4'],
    ['P₂O₅', 'P2O5'],
    ['K₂O', 'K2O'],
    ['CaO', 'CaO'],
    ['MgO', 'MgO'],
    ['SO₄', 'SO4'],
    ['Cl⁻', 'Cl'],
    ['Fe', 'Fe'],
    ['Mn', 'Mn'],
    ['B', 'B'],
    ['Zn', 'Zn'],
    ['Cu', 'Cu'],
    ['Mo', 'Mo'],
    ['SiO₂', 'SiO2']
  ];
  const parts = [];
  specs.forEach(function (pair) {
    const v = parseFloat(mat[pair[1]]);
    if (!(v > 0)) return;
    parts.push(pair[0] + ' ' + (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(2)) + '%');
  });
  return parts.join(' · ');
}

function fertiCustomMaterialPriceText(mat) {
  const api = fertiGetPriceApi();
  const L = api ? api.labels() : { price: fertProgT('price', 'Precio'), priceUnit: 'USD/t' };
  const id = mat && (mat.id || mat.name) ? String(mat.id || mat.name) : '';
  let canon = parseFloat(mat && mat.priceUsdPerTonne);
  if (!(canon > 0) && id) canon = fertiResolveMaterialPrice(id);
  canon = Number.isFinite(canon) ? canon : 0;
  const disp = api ? api.toDisplayPrice(canon) : canon;
  if (!(disp > 0)) return L.price + ': —';
  return L.price + ': ' + Number(disp.toFixed(2)) + ' ' + L.priceUnit;
}

function renderFertiCustomMaterialsList() {
  const container = document.getElementById('fertiCustomMaterialsList');
  if (!container) return;
  const list = Array.isArray(fertiCustomMaterials) ? fertiCustomMaterials : [];
  if (list.length === 0) {
    container.innerHTML = `<div style="color:#6b7280;">${fertProgT('no_custom', 'Sin fertilizantes personalizados.')}</div>`;
    return;
  }
  container.innerHTML = list.map(mat => {
    const key = encodeURIComponent((mat.id || mat.name || '').toString());
    const badge = mat.source === 'user'
      ? fertProgT('user_badge', 'Usuario')
      : fertProgT('project_badge', 'Proyecto');
    const name = fertProgMaterial(mat.name || mat.id);
    const comp = fertiCustomMaterialCompositionText(mat);
    const price = fertiCustomMaterialPriceText(mat);
    return `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #e5e7eb;">
        <div style="min-width:0;flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:650;color:#0f172a;">${name}</span>
            <span style="font-size:12px;color:#64748b;border:1px solid #e2e8f0;border-radius:999px;padding:2px 8px;">${badge}</span>
          </div>
          <div style="margin-top:4px;font-size:0.82rem;color:#475569;line-height:1.35;">
            <span style="font-weight:600;color:#334155;">${fertProgT('composition', 'Composición')}:</span>
            ${comp ? ('<span class="notranslate" translate="no"> ' + comp + '</span>') : (' <span style="color:#94a3b8;">' + fertProgT('no_nutrients', 'sin nutrientes capturados') + '</span>')}
          </div>
          <div style="margin-top:3px;font-size:0.82rem;color:#0369a1;font-weight:600;">${price}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="openEditFertiCustomMaterial('${key}')">${fertProgT('edit', 'Editar')}</button>
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="removeFertiCustomMaterial('${key}')">${fertProgT('delete', 'Eliminar')}</button>
        </div>
      </div>
    `;
  }).join('');
}

function findFertiCustomMaterialByKey(key) {
  const match = (m) => ((m.id || m.name || '') + '').toLowerCase() === key;
  const fromUser = (Array.isArray(fertiCustomMaterialsUser) ? fertiCustomMaterialsUser : []).find(match);
  if (fromUser) return { material: fromUser, source: 'user' };
  const fromProject = (Array.isArray(fertiCustomMaterialsProject) ? fertiCustomMaterialsProject : []).find(match);
  if (fromProject) return { material: fromProject, source: 'project' };
  return { material: null, source: null };
}

function removeFertiCustomMaterial(encodedKey) {
  const key = decodeURIComponent(encodedKey || '').toLowerCase();
  if (!key) return;
  if (!confirm(fertProgT('confirm_delete_one', '¿Eliminar este fertilizante del catálogo?'))) return;
  const match = (m) => ((m.id || m.name || '') + '').toLowerCase() === key;
  const userBefore = (Array.isArray(fertiCustomMaterialsUser) ? fertiCustomMaterialsUser : []).length;
  const projBefore = (Array.isArray(fertiCustomMaterialsProject) ? fertiCustomMaterialsProject : []).length;
  fertiCustomMaterialsUser = (Array.isArray(fertiCustomMaterialsUser) ? fertiCustomMaterialsUser : []).filter(m => !match(m));
  fertiCustomMaterialsProject = (Array.isArray(fertiCustomMaterialsProject) ? fertiCustomMaterialsProject : []).filter(m => !match(m));
  if (userBefore !== fertiCustomMaterialsUser.length) {
    saveFertiCustomMaterialsToUser();
  }
  if (projBefore !== fertiCustomMaterialsProject.length) {
    saveFertiCustomMaterials();
  }
  mergeFertiCustomMaterials();
  fertiRemoveCustomFromHydroCatalog(key);
  renderFertiCustomMaterialsList();
  renderFertiWeeks();
}

function openEditFertiCustomMaterial(encodedKey) {
  const key = decodeURIComponent(encodedKey || '').toLowerCase();
  if (!key) return;
  const found = findFertiCustomMaterialByKey(key);
  if (!found.material) return;
  if (!document.querySelector('.material-modal-overlay')) {
    openFertiNewMaterialModal();
  }
  const overlay = document.querySelector('.material-modal-overlay');
  if (!overlay) return;
  overlay.dataset.editKey = key;
  overlay.dataset.editMode = 'true';
  const titleEl = overlay.querySelector('.modal-header h3');
  if (titleEl) titleEl.textContent = fertProgT('edit_material_title', '✏️ Editar Materia Prima Personalizada');
  const saveBtn = overlay.querySelector('#fertiCustom_saveBtn');
  if (saveBtn) saveBtn.textContent = fertProgT('save_changes', 'Guardar cambios');
  const mat = found.material;
  overlay.querySelector('#fertiCustom_name').value = mat.name || '';
  overlay.querySelector('#fertiCustom_N_NO3').value = mat.N_NO3 ?? 0;
  overlay.querySelector('#fertiCustom_N_NH4').value = mat.N_NH4 ?? 0;
  overlay.querySelector('#fertiCustom_P2O5').value = mat.P2O5 ?? 0;
  overlay.querySelector('#fertiCustom_K2O').value = mat.K2O ?? 0;
  overlay.querySelector('#fertiCustom_CaO').value = mat.CaO ?? 0;
  overlay.querySelector('#fertiCustom_MgO').value = mat.MgO ?? 0;
  const mergedSo4 = (parseFloat(mat.SO4) || 0) + (parseFloat(mat.S) || 0) * FERTI_CONV.SO4_TO_S;
  overlay.querySelector('#fertiCustom_SO4').value = Number(mergedSo4.toFixed(4));
  overlay.querySelector('#fertiCustom_Cl').value = mat.Cl ?? 0;
  overlay.querySelector('#fertiCustom_Fe').value = mat.Fe ?? 0;
  overlay.querySelector('#fertiCustom_Mn').value = mat.Mn ?? 0;
  overlay.querySelector('#fertiCustom_B').value = mat.B ?? 0;
  overlay.querySelector('#fertiCustom_Zn').value = mat.Zn ?? 0;
  overlay.querySelector('#fertiCustom_Cu').value = mat.Cu ?? 0;
  overlay.querySelector('#fertiCustom_Mo').value = mat.Mo ?? 0;
  overlay.querySelector('#fertiCustom_SiO2').value = mat.SiO2 ?? 0;
  const priceEl = overlay.querySelector('#fertiCustom_price');
  if (priceEl) {
    const api = fertiGetPriceApi();
    const canon = parseFloat(mat.priceUsdPerTonne) || 0;
    const disp = api ? api.toDisplayPrice(canon) : canon;
    priceEl.value = disp > 0 ? Number(disp.toFixed(2)) : '';
  }
}

function clearFertiCustomMaterials() {
  if (!confirm(fertProgT('confirm_clear_catalog', '¿Eliminar todo el catálogo de fertilizantes solubles personalizados?'))) return;
  const keys = (Array.isArray(fertiCustomMaterials) ? fertiCustomMaterials : []).map(function (m) {
    return ((m.id || m.name || '') + '').toLowerCase();
  }).filter(Boolean);
  const userId = fertiGetCurrentUserId();
  if (userId) {
    fertiCustomMaterialsUser = [];
    saveFertiCustomMaterialsToUser();
  } else {
    fertiCustomMaterialsProject = [];
    saveFertiCustomMaterials();
  }
  mergeFertiCustomMaterials();
  keys.forEach(fertiRemoveCustomFromHydroCatalog);
  renderFertiCustomMaterialsList();
  renderFertiWeeks();
}

/** Modal de consulta: fertilizantes precargados con concentración (% óxido/elemento) */
const FERTI_CATALOG_COLS = ['N_NO3', 'N_NH4', 'P2O5', 'K2O', 'CaO', 'MgO', 'SO4', 'Cl', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
function fertiCatalogColLabel(key) {
  const labels = { N_NO3: 'N(NO₃)', N_NH4: 'N(NH₄)', P2O5: 'P₂O₅', K2O: 'K₂O', CaO: 'CaO', MgO: 'MgO', SO4: 'SO₄', Cl: 'Cl⁻', Fe: 'Fe', Mn: 'Mn', B: 'B', Zn: 'Zn', Cu: 'Cu', Mo: 'Mo', SiO2: 'SiO₂' };
  return labels[key] || key;
}
function openFertiPreloadedCatalogModal() {
  const api = fertiGetPriceApi();
  const L = api ? api.labels() : { price: 'Precio', priceUnit: 'USD/t' };
  const list = getBaseFertiMaterials();
  const colCount = 2 + FERTI_CATALOG_COLS.length;
  const rows = list.map(mat => {
    const id = mat.id || '';
    const priceCanon = fertiResolveMaterialPrice(id);
    const priceDisp = api ? api.toDisplayPrice(priceCanon) : priceCanon;
    const nutCells = FERTI_CATALOG_COLS.map(k => {
      const v = k === 'SO4'
        ? ((parseFloat(mat.SO4) || 0) + (parseFloat(mat.S) || 0) * FERTI_CONV.SO4_TO_S)
        : (parseFloat(mat[k]) || 0);
      return `<td style="padding:6px 10px;text-align:right;">${v.toFixed(2)}</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid #e5e7eb;" data-mat-id="${String(id).replace(/"/g, '&quot;')}">
      <td style="padding:6px 10px;font-weight:600;">${(fertProgMaterial(mat.name || id || '')).replace(/</g, '&lt;')}</td>
      ${nutCells}
      <td style="padding:6px 10px;text-align:right;white-space:nowrap;">
        <input type="number" min="0" step="0.01" class="ferti-price-input" data-mat-id="${String(id).replace(/"/g, '&quot;')}"
          value="${priceDisp > 0 ? Number(priceDisp.toFixed(2)) : ''}" placeholder="0"
          style="width:88px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right;">
      </td>
    </tr>`;
  }).join('');
  const overlay = document.createElement('div');
  overlay.className = 'material-modal-overlay ferti-preloaded-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
  overlay.innerHTML = `
    <div class="material-modal" style="max-width:95%;width:980px;max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div class="modal-header" style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:1.1rem;color:#1e293b;">${fertProgT('available_fertilizers', '📋 Fertilizantes disponibles (concentración %)')}</h3>
        <button class="btn btn-secondary btn-sm" type="button" data-close-ferti-preloaded>✕</button>
      </div>
      <div style="padding:14px 18px;overflow:auto;flex:1;">
        <p style="margin:0 0 12px 0;font-size:0.9rem;color:#64748b;">${fertProgT('available_fertilizers_help', 'Consulta de concentraciones de los fertilizantes solubles precargados. Valores en % (óxidos donde aplica).')} ${fertProgT('price_help', 'Puedes capturar el precio del producto')} (<strong>${L.priceUnit}</strong>).</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">${fertProgT('name_col', 'Nombre')}</th>
                ${FERTI_CATALOG_COLS.map(k => `<th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e2e8f0;">${fertiCatalogColLabel(k)}</th>`).join('')}
                <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e2e8f0;min-width:110px;">${L.price}<br><span style="font-weight:500;color:#64748b;font-size:0.75rem;">${L.priceUnit}</span></th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="' + colCount + '" style="padding:12px;color:#64748b;">' + fertProgT('no_preloaded', 'Sin fertilizantes precargados.') + '</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div style="padding:12px 18px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="btn btn-secondary btn-sm" data-close-ferti-preloaded>${fertProgT('cancel', 'Cancelar')}</button>
        <button type="button" class="btn btn-primary btn-sm" data-save-ferti-prices>${fertProgT('save_prices', 'Guardar precios')}</button>
      </div>
    </div>
  `;
  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-close-ferti-preloaded]').forEach(btn => btn.addEventListener('click', close));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const saveBtn = overlay.querySelector('[data-save-ferti-prices]');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const next = { ...(fertiPriceOverrides || {}) };
      overlay.querySelectorAll('.ferti-price-input').forEach(inp => {
        const mid = inp.getAttribute('data-mat-id');
        if (!mid) return;
        const canon = api ? api.fromDisplayPrice(inp.value) : (parseFloat(inp.value) || 0);
        if (canon > 0) next[mid] = canon;
        else delete next[mid];
      });
      fertiPersistPriceOverrides(next);
      try { renderFertiWeeks(); } catch (e) {}
      try { updateFertiSummary(); } catch (e2) {}
      if (window.showMessage) window.showMessage(fertProgT('prices_saved', '✅ Precios guardados'), 'success');
      close();
    });
  }
  document.body.appendChild(overlay);
}

function updateFertiCustomMaterial(overlay) {
  const key = (overlay.dataset.editKey || '').toLowerCase();
  if (!key) return;
  const found = findFertiCustomMaterialByKey(key);
  if (!found.material) return;
  const getNum = id => { const v = parseFloat(overlay.querySelector('#'+id).value); return isNaN(v) ? 0 : Math.max(0, v); };
  const name = (overlay.querySelector('#fertiCustom_name').value || '').trim();
  if (!name) { if (window.showMessage) window.showMessage(fertProgT('name_required', 'Escribe un nombre'), 'warning'); return; }
  const updated = {
    ...found.material,
    name,
    N_NO3: getNum('fertiCustom_N_NO3'),
    N_NH4: getNum('fertiCustom_N_NH4'),
    P2O5: getNum('fertiCustom_P2O5'),
    K2O: getNum('fertiCustom_K2O'),
    CaO: getNum('fertiCustom_CaO'),
    MgO: getNum('fertiCustom_MgO'),
    SO4: getNum('fertiCustom_SO4'),
    Cl: getNum('fertiCustom_Cl'),
    S: 0,
    Fe: getNum('fertiCustom_Fe'),
    Mn: getNum('fertiCustom_Mn'),
    Zn: getNum('fertiCustom_Zn'),
    Cu: getNum('fertiCustom_Cu'),
    B: getNum('fertiCustom_B'),
    Mo: getNum('fertiCustom_Mo'),
    SiO2: getNum('fertiCustom_SiO2'),
    priceUsdPerTonne: (function () {
      const api = fertiGetPriceApi();
      const el = overlay.querySelector('#fertiCustom_price');
      const raw = el ? el.value : '';
      return api ? api.fromDisplayPrice(raw) : (parseFloat(raw) || 0);
    })()
  };
  if (found.source === 'user') {
    fertiCustomMaterialsUser = upsertFertiMaterial(fertiCustomMaterialsUser, updated, 'user');
    saveFertiCustomMaterialsToUser();
  } else {
    fertiCustomMaterialsProject = upsertFertiMaterial(fertiCustomMaterialsProject, updated, 'project');
    saveFertiCustomMaterials();
  }
  mergeFertiCustomMaterials();
  fertiPushCustomToHydroCatalog(updated);
  renderFertiWeeks();
  renderFertiCustomMaterialsList();
  if (window.showMessage) window.showMessage('✅ Fertilizante actualizado', 'success');
  overlay.remove();
}

function ensureFertiCustomMaterialsLoadedFromCloud() {
  const userId = fertiGetCurrentUserId();
  if (!userId) return Promise.resolve();
  if (typeof window.nutriplantFetchCustomFertiMaterialsFromCloud !== 'function') return Promise.resolve();
  return window.nutriplantFetchCustomFertiMaterialsFromCloud(userId).then(function(cloudData) {
    if (cloudData && typeof cloudData === 'object' && Array.isArray(cloudData.items) && cloudData.items.length > 0) {
      var profile = fertiLoadUserProfile() || {};
      profile.customFertiMaterials = cloudData;
      try { localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile)); } catch (e) {}
      console.log('✅ Fertilizantes solubles personalizados cargados desde la nube');
    }
  }).catch(function() {});
}

function loadFertiCustomMaterials() {
  return ensureFertiCustomMaterialsLoadedFromCloud().then(doLoadFertiCustomMaterials);
}

function doLoadFertiCustomMaterials() {
  try {
    const pid = (window.projectManager && window.projectManager.getCurrentProject()) ? window.projectManager.getCurrentProject().id : localStorage.getItem('nutriplant-current-project');
    let projectData = null;
    // 1) Esquema unificado (tarjeta de proyecto)
    try {
      const key = fertiUnifiedKey();
      if (key) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.fertirriego && o.fertirriego.customMaterials) {
            projectData = o.fertirriego.customMaterials;
          }
        }
      }
    } catch {}
    if (window.projectManager && window.projectManager.loadProjectData) {
      projectData = projectData || window.projectManager.loadProjectData('fertiCustomMaterials');
    }
    if (!projectData && pid) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
      projectData = pd.fertiCustomMaterials;
    }
    // Fallback global si no hay proyecto activo (legacy)
    if (!projectData) {
      const g = localStorage.getItem('fertiCustomMaterials_global');
      if (g) projectData = JSON.parse(g);
    }

    const profile = fertiLoadUserProfile();
    let userData = profile && profile.customFertiMaterials ? profile.customFertiMaterials : null;
    // Si no hay usuario o perfil, cargar desde fallback (ej. sin sesión o carga antes de auth)
    if (!userData) {
      try {
        const raw = localStorage.getItem('fertiCustomMaterials_global_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (Array.isArray(parsed.items) || Array.isArray(parsed))) {
            userData = Array.isArray(parsed.items) ? parsed : { items: parsed };
          }
        }
      } catch (e) {}
    }

    fertiCustomMaterialsProject = normalizeFertiMaterials(projectData, 'project');
    fertiCustomMaterialsUser = normalizeFertiMaterials(userData, 'user');
    try {
      const api = fertiGetPriceApi();
      const fromUser = userData && userData.priceOverrides ? userData.priceOverrides : {};
      const merged = api
        ? api.mergeOverrides(fromUser, api.loadMergedPriceOverrides())
        : (fromUser || {});
      fertiPriceOverrides = merged;
    } catch (e) { fertiPriceOverrides = {}; }
    mergeFertiCustomMaterials();
    // Si hay sesión y había datos en fallback, subirlos al perfil/nube y limpiar fallback
    const uid = fertiGetCurrentUserId();
    if (uid) {
      try {
        const raw = localStorage.getItem('fertiCustomMaterials_global_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const items = parsed && (Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : null));
          if (items && items.length > 0) {
            let userList = Array.isArray(fertiCustomMaterialsUser) ? fertiCustomMaterialsUser : [];
            items.forEach(function(m) {
              userList = upsertFertiMaterial(userList, { ...m, source: 'user' }, 'user');
            });
            fertiCustomMaterialsUser = userList;
            mergeFertiCustomMaterials();
            saveFertiCustomMaterialsToUser();
            localStorage.removeItem('fertiCustomMaterials_global_user');
          }
        }
      } catch (e) {}
    }
  } catch {
    fertiCustomMaterials = [];
    fertiCustomMaterialsUser = [];
    fertiCustomMaterialsProject = [];
  }
}

function saveFertiCustomMaterials() {
  try {
    const pid = (window.projectManager && window.projectManager.getCurrentProject()) ? window.projectManager.getCurrentProject().id : localStorage.getItem('nutriplant-current-project');
    const projectItems = (Array.isArray(fertiCustomMaterialsProject) ? fertiCustomMaterialsProject : [])
      .map(stripFertiSource);
    if (pid) {
      if (window.projectManager && window.projectManager.saveProjectData) {
        window.projectManager.saveProjectData('fertiCustomMaterials', { items: projectItems });
      } else {
        // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
        const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
        pd.fertiCustomMaterials = { items: projectItems }; localStorage.setItem(k, JSON.stringify(pd));
      }
    } else {
      // Guardado global si no hay proyecto detectado
      localStorage.setItem('fertiCustomMaterials_global', JSON.stringify({ items: projectItems }));
    }
    // Escribir también en la tarjeta del proyecto (esquema unificado)
    fertiUnifiedMerge(obj => {
      obj.fertirriego = obj.fertirriego || {};
      obj.fertirriego.customMaterials = { items: projectItems };
    });
  } catch {}
}

function getFertiProgramColumns() {
  const macro = ['N_NO3','N_NH4'];
  if (fertProgElementalMode) macro.push('P','K','Ca','Mg'); else macro.push('P2O5','K2O','CaO','MgO');
  macro.push('SO4');
  const micro = ['Fe','Mn','B','Zn','Cu','Mo'];
  if (fertProgElementalMode) micro.push('Si'); else micro.push('SiO2');
  return fertiNutrientView === 'micro' ? micro : macro;
}

// Crear semana
function addFertiWeek() {
  const week = { id: 'week_' + Date.now(), label: `Semana ${fertiWeekCounter++}`, stage: 'Establecimiento', kgByCol: {}, totals: {} };
  fertiColumns.forEach(c => { week.kgByCol[c.id] = 0; });
  fertiWeeks.push(week);
  renderFertiWeeks();
  updateFertiSummary();
  markFertiProgDirty();
}

function removeFertiWeek(weekId) {
  fertiWeeks = fertiWeeks.filter(w => w.id !== weekId);
  renderFertiWeeks();
  updateFertiSummary();
  markFertiProgDirty();
}

function fertiColumnInsertIndex(insertIndex) {
  const n = fertiColumns.length;
  let idx = n;
  if (typeof insertIndex === 'number' && Number.isFinite(insertIndex)) {
    idx = Math.round(insertIndex);
  } else if (typeof insertIndex === 'string' && insertIndex !== '') {
    const parsed = parseInt(insertIndex, 10);
    if (Number.isFinite(parsed)) idx = parsed;
  }
  if (idx < 0) idx = 0;
  if (idx > n) idx = n;
  return idx;
}

function fertiInsertColumnButton(index) {
  const title = fertProgT('insert_fertilizer_here', 'Insertar fertilizante aquí');
  return `<button type="button" class="ferti-insert-col-btn" title="${title}" aria-label="${title}" onclick="addFertiColumn(${index})">+</button>`;
}

function fertiJoinFertCols(renderSlot, renderCol) {
  const parts = [renderSlot(0)];
  fertiColumns.forEach((c, i) => {
    parts.push(renderCol(c, i));
    parts.push(renderSlot(i + 1));
  });
  return parts.join('');
}

// Columnas de fertilizante (nuevo modelo). Sin índice → al final. Con índice → en esa posición.
function addFertiColumn(insertIndex) {
  const col = { id: 'col_' + Date.now(), materialId: '' };
  fertiColumns.splice(fertiColumnInsertIndex(insertIndex), 0, col);
  fertiWeeks.forEach(w => { if (!w.kgByCol) w.kgByCol = {}; w.kgByCol[col.id] = 0; });
  renderFertiWeeks();
  markFertiProgDirty();
  try {
    const sel = document.querySelector('#fertiWeeksContainer select.ferti-col-select[data-col-id="' + col.id + '"]');
    if (sel) sel.focus();
  } catch {}
}

function removeFertiColumn(colId) {
  fertiColumns = fertiColumns.filter(c => c.id !== colId);
  fertiChartLockedColumnIds = fertiChartLockedColumnIds.filter(id => id !== colId);
  fertiWeeks.forEach(w => { if (w.kgByCol) delete w.kgByCol[colId]; });
  renderFertiWeeks();
  updateFertiSummary();
  markFertiProgDirty();
}

function onFertiColumnMaterialChange(colId, materialId) {
  const col = fertiColumns.find(c => c.id === colId); if (!col) return;
  col.materialId = materialId;
  try {
    const selected = getAllFertiMaterials().find(m => m && m.id === materialId);
    col.name = selected ? (selected.name || selected.id || '') : '';
  } catch {
    col.name = '';
  }
  if (fertiIsWaterAcidMaterialId(materialId)) fertiEnsureWaterAcidColumnsLocked();
  else fertiChartLockedColumnIds = fertiChartLockedColumnIds.filter(id => id !== colId);
  try { fertiSyncProgramAcidFromLamina(); } catch (eAcidCol) {}
  renderFertiWeeks();
  updateFertiSummary();
  // Guardar inmediatamente para no perder la selección al cambiar de pestaña
  try { saveFertirriegoProgram(); } catch {}
  scheduleSaveFertirriegoProgram();
}

function onWeekKgInput(weekId, colId, kg) {
  const week = fertiWeeks.find(w => w.id === weekId); if (!week) return;
  if (!week.kgByCol) week.kgByCol = {};
  week.kgByCol[colId] = fertProgToSI(parseFloat(kg) || 0, 'dose_mass_area');
  computeWeekTotals(week);
  updateFertiSummary();
  markFertiProgDirty();
  if (fertiDistPushTimer) clearTimeout(fertiDistPushTimer);
  fertiDistPushTimer = setTimeout(function () {
    fertiDistPushTimer = null;
    fertiPushProgramSplitToDistribution();
  }, 280);
}

function onWeekKgChange(weekId, colId, kg) {
  onWeekKgInput(weekId, colId, kg);
  if (fertiDistPushTimer) {
    clearTimeout(fertiDistPushTimer);
    fertiDistPushTimer = null;
  }
  renderFertiWeeks();
  fertiPushProgramSplitToDistribution();
}

function syncFertiProgramFromDOM() {
  const container = document.getElementById('fertiWeeksContainer');
  if (!container) return;
  const inputs = container.querySelectorAll('input.material-input[data-week-id][data-col-id]');
  if (!inputs.length) return;
  const touchedWeeks = new Set();
  inputs.forEach(input => {
    const weekId = input.getAttribute('data-week-id');
    const colId = input.getAttribute('data-col-id');
    if (!weekId || !colId) return;
    const week = fertiWeeks.find(w => w.id === weekId);
    if (!week) return;
    if (!week.kgByCol) week.kgByCol = {};
    week.kgByCol[colId] = fertProgToSI(parseFloat(input.value) || 0, 'dose_mass_area');
    touchedWeeks.add(weekId);
  });
  touchedWeeks.forEach(weekId => {
    const week = fertiWeeks.find(w => w.id === weekId);
    if (week) computeWeekTotals(week);
  });
}

function computeFertiContribFor(amountInput, materialId) {
  const mat = getAllFertiMaterials().find(m => m.id === materialId) || {};
  // Si la unidad es Litros, convertir a kg usando densidad
  const amountNum = parseFloat(amountInput) || 0;
  const productKg = (mat.unit === 'L' && parseFloat(mat.density)) ? amountNum * parseFloat(mat.density) : amountNum;
  const contrib = {};
  ['N_NO3','N_NH4','P2O5','K2O','CaO','MgO','S','SO4','Cl','Fe','Mn','B','Zn','Cu','Mo','SiO2'].forEach(n => {
    contrib[n] = productKg * ((parseFloat(mat[n]) || 0) / 100);
  });
  contrib.P = contrib.P2O5 / FERTI_CONV.P2O5_TO_P;
  contrib.K = contrib.K2O / FERTI_CONV.K2O_TO_K;
  contrib.Ca = contrib.CaO / FERTI_CONV.CaO_TO_Ca;
  contrib.Mg = contrib.MgO / FERTI_CONV.MgO_TO_Mg;
  contrib.Si = contrib.SiO2 / FERTI_CONV.SiO2_TO_Si;
  return contrib;
}

function computeWeekTotals(week) {
  const totals = { N_NO3:0,N_NH4:0,P:0,P2O5:0,K:0,K2O:0,Ca:0,CaO:0,Mg:0,MgO:0,S:0,SO4:0,Cl:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,Si:0,SiO2:0 };
  if (!week.kgByCol) week.kgByCol = {};
  fertiColumns.forEach(c => {
    const kg = week.kgByCol[c.id] || 0;
    const contrib = computeFertiContribFor(kg, c.materialId);
    Object.keys(totals).forEach(n => { totals[n] += parseFloat(contrib[n] || 0); });
  });
  week.totals = totals;
}

function fertiProgramStageOptions(selected) {
  const base = ['Brotación','Establecimiento','Vegetativo','Prefloración','Floración','Amarre','Llenado','Maduración','Cosecha'];
  const current = String(selected || '').trim();
  const options = current && base.indexOf(current) < 0 ? [current].concat(base) : base;
  return options.map(st => `<option value="${fertiEscapeAttr(st)}" ${st === current ? 'selected' : ''}>${fertiEscapeAttr(fertProgStage(st))}</option>`).join('');
}

function fertiGeneratorFingerprint(state) {
  if (!state || typeof state !== 'object') return '';
  const compact = {
    axis: state.axis || '',
    stages: Array.isArray(state.stages) ? state.stages : [],
    nutrients: Array.isArray(state.nutrients)
      ? state.nutrients.map(n => [n.id, Number(n.total) || 0])
      : [],
    pct: state.pct || {},
    waterDepthByStageM3ha: Array.isArray(state.waterDepthByStageM3ha) ? state.waterDepthByStageM3ha : []
  };
  try { return JSON.stringify(compact); } catch { return ''; }
}

function fertiGeneratorDistributionState() {
  try {
    if (typeof window.fertiDistExportState === 'function') {
      const live = window.fertiDistExportState();
      if (live) return live;
    }
    if (typeof window.fertiDistGetStoredState === 'function') {
      const stored = window.fertiDistGetStoredState();
      if (stored) return stored;
    }
  } catch {}
  return null;
}

function fertiCyclePendingMap(state) {
  const water = fertiGeneratorWaterMap();
  const base = fertiGeneratorBaseMap();
  const out = { N:0,P2O5:0,K2O:0,CaO:0,MgO:0,SO4:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,SiO2:0 };
  const map = { n:'N',p:'P2O5',k:'K2O',ca:'CaO',mg:'MgO',s:'SO4',fe:'Fe',mn:'Mn',b:'B',zn:'Zn',cu:'Cu',mo:'Mo',si:'SiO2' };
  (state && Array.isArray(state.nutrients) ? state.nutrients : []).forEach(n => {
    const key = map[n.id];
    if (!key) return;
    out[key] = Math.max(0, (Number(n.total) || 0) - (Number(water[key]) || 0) - (Number(base[key]) || 0));
  });
  return out;
}

function fertiGeneratorTargetMap(state, stageIndex) {
  const out = { N:0,P2O5:0,K2O:0,CaO:0,MgO:0,SO4:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,SiO2:0 };
  const map = { n:'N',p:'P2O5',k:'K2O',ca:'CaO',mg:'MgO',s:'SO4',fe:'Fe',mn:'Mn',b:'B',zn:'Zn',cu:'Cu',mo:'Mo',si:'SiO2' };
  const pending = fertiCyclePendingMap(state);
  (state && Array.isArray(state.nutrients) ? state.nutrients : []).forEach(n => {
    const key = map[n.id];
    if (!key) return;
    const arr = state.pct && Array.isArray(state.pct[n.id]) ? state.pct[n.id] : [];
    out[key] = pending[key] * ((Number(arr[stageIndex]) || 0) / 100);
  });
  return out;
}

function fertiGeneratorWaterMap(source) {
  const w = source || fertiWaterContributionOxide || {};
  return {
    N: Number(w.N) || 0,
    P2O5: Number(w.P2O5) || 0,
    K2O: Number(w.K2O) || 0,
    CaO: Number(w.CaO) || 0,
    MgO: Number(w.MgO) || 0,
    SO4: (Number(w.SO4) || 0) + (Number(w.S) || 0) * FERTI_CONV.SO4_TO_S,
    Fe: Number(w.Fe) || 0,
    Mn: Number(w.Mn) || 0,
    B: Number(w.B) || 0,
    Zn: Number(w.Zn) || 0,
    Cu: Number(w.Cu) || 0,
    Mo: Number(w.Mo) || 0,
    SiO2: Number(w.SiO2) || 0
  };
}

function fertiGeneratorBaseMap(source) {
  const b = source || fertiBaseContributionOxide || {};
  return {
    N: Number(b.N) || 0,
    P2O5: Number(b.P2O5) || 0,
    K2O: Number(b.K2O) || 0,
    CaO: Number(b.CaO) || 0,
    MgO: Number(b.MgO) || 0,
    SO4: (Number(b.SO4) || 0) + (Number(b.S) || 0) * FERTI_CONV.SO4_TO_S,
    Fe: Number(b.Fe) || 0,
    Mn: Number(b.Mn) || 0,
    B: Number(b.B) || 0,
    Zn: Number(b.Zn) || 0,
    Cu: Number(b.Cu) || 0,
    Mo: Number(b.Mo) || 0,
    SiO2: Number(b.SiO2) || 0
  };
}

function fertiDistributionCreditsSnapshot() {
  let waterSource = fertiWaterContributionOxide;
  let baseSource = fertiBaseContributionOxide;
  let waterLinked = !!fertiWaterAnalysisId;
  let granularLinked = fertiGranularProgramLinked === true;
  if (!fertiProgramInitialized) {
    try {
      const pid = fertiGetUnifiedProjectId();
      const raw = pid ? localStorage.getItem(`nutriplant_project_${pid}`) : '';
      const project = raw ? JSON.parse(raw) : null;
      const saved = project && (
        (project.fertirriego && project.fertirriego.program) ||
        project.fertirriegoProgram
      );
      if (saved) {
        waterSource = saved.waterContribution || waterSource;
        baseSource = saved.baseContribution || baseSource;
        waterLinked = !!saved.waterAnalysisId;
        granularLinked = saved.granularProgramLinked === true;
      }
    } catch (e) {}
  }
  return {
    water: fertiGeneratorWaterMap(waterSource),
    base: fertiGeneratorBaseMap(baseSource),
    waterLinked,
    granularLinked
  };
}

function fertiNotifyDistributionCreditsChanged() {
  const snapshot = fertiDistributionCreditsSnapshot();
  const signature = JSON.stringify(snapshot);
  if (signature === fertiDistributionCreditSignature) return;
  fertiDistributionCreditSignature = signature;
  try {
    window.dispatchEvent(new CustomEvent('np:ferti-credits-changed', { detail: snapshot }));
  } catch (e) {}
}

window.fertiGetDistributionCredits = fertiDistributionCreditsSnapshot;

function fertiGeneratorHasProgramDoses() {
  return (fertiWeeks || []).some(w => Object.keys(w.kgByCol || {}).some(id => (Number(w.kgByCol[id]) || 0) > 0));
}

function fertiPrepareAutomaticProgram() {
  const solver = window.NpFertigationProgramGenerator;
  if (!solver || typeof solver.generate !== 'function') return { ok:false, reason:'solver-missing' };
  const state = fertiGeneratorDistributionState();
  if (!state || !Array.isArray(state.stages) || !state.stages.length) return { ok:false, reason:'distribution-missing' };
  if (state.axis !== 'semana' && state.axis !== 'mes') return { ok:false, reason:'time-axis-required' };
  const bad = (state.nutrients || []).filter(n => {
    const sum = ((state.pct && state.pct[n.id]) || []).reduce((a, v) => a + (Number(v) || 0), 0);
    return Math.abs(sum - 100) > 0.15;
  });
  if (bad.length) return { ok:false, reason:'distribution-invalid', nutrients:bad.map(n => n.label || n.id) };
  const depths = fertiProgramWaterDepths(state.stages.length);
  try { if (typeof window.fertiDistSetWaterByStage === 'function') window.fertiDistSetWaterByStage(depths); } catch (e) {}
  const generated = solver.generate({
    axis: state.axis,
    stages: state.stages,
    targetsByStage: state.stages.map((_, i) => fertiGeneratorTargetMap(state, i)),
    waterContribution: {},
    baseContribution: {},
    waterDepths: depths,
    materials: getAllFertiMaterials(),
    acid: fertiGeneratorAcidInput()
  });
  generated.distribution = state;
  generated.distributionFingerprint = fertiGeneratorFingerprint(state);
  return generated;
}

function fertiGeneratorReasonMessage(prepared) {
  const reason = prepared && prepared.reason;
  if (reason === 'distribution-missing') return fertProgT('auto_no_distribution', 'Primero configura y guarda la Distribución del requerimiento.');
  if (reason === 'time-axis-required') return fertProgT('auto_time_axis_required', 'En Distribución elige Semanal o Mensual antes de elaborar el programa.');
  if (reason === 'distribution-invalid') {
    return fertProgT('auto_distribution_invalid', 'La Distribución debe sumar 100% en cada nutriente. Revisa: ') + (prepared.nutrients || []).join(', ');
  }
  if (reason === 'water-depth-required') return fertProgT('auto_water_depth_required', 'Hay aporte de agua. Captura la lámina de riego de cada periodo en Dinámica Nutricional antes de elaborar el programa.');
  return fertProgT('auto_generator_unavailable', 'No fue posible preparar el generador automático.');
}

function closeFertiAutoProgramModal() {
  const modal = document.getElementById('fertiAutoProgramModal');
  if (modal) modal.remove();
}

function openFertiAutoProgramModal() {
  const prepared = fertiPrepareAutomaticProgram();
  if (!prepared.ok) {
    if (window.showMessage) window.showMessage(fertiGeneratorReasonMessage(prepared), 'warning');
    else alert(fertiGeneratorReasonMessage(prepared));
    return;
  }
  closeFertiAutoProgramModal();
  const state = prepared.distribution;
  const distributionName = String(state.title || '')
    .replace(/^(?:Distribución(?: objetivo)?|Objective distribution|Distribution)\s+/i, '')
    .trim();
  const materialNames = prepared.materialIds.map(id => {
    const mat = getAllFertiMaterials().find(m => m && m.id === id);
    return fertProgMaterial(mat ? (mat.name || id) : id);
  });
  const unresolvedStages = prepared.stages.filter(s => s.unresolved.length).length;
  const excessStages = prepared.stages.filter(s => Object.keys(s.excess || {}).some(key => (Number(s.excess[key]) || 0) > 0.005)).length;
  const waterMap = fertiGeneratorWaterMap();
  const hasWaterContribution = Object.keys(waterMap).some(key => (Number(waterMap[key]) || 0) > 0.000001);
  const baseMap = fertiGeneratorBaseMap();
  const hasBaseContribution = Object.keys(baseMap).some(key => (Number(baseMap[key]) || 0) > 0.000001);
  const availableWaterAnalyses = fertiGetProjectWaterAnalyses();
  const acidInput = fertiGeneratorAcidInput();
  const acidMat = acidInput && getAllFertiMaterials().find(m => m && m.id === acidInput.materialId);
  const acidLabel = acidInput
    ? fertProgMaterial(acidMat ? (acidMat.name || acidInput.materialId) : acidInput.materialId) +
      ' · ' + Number(acidInput.mlPerM3).toFixed(2) + ' mL/m³'
    : fertProgT('auto_acid_none', 'sin ácido del análisis (vincula agua con HCO₃⁻/CO₃²⁻)');
  const waterSource = fertiWaterAnalysisId
    ? fertProgT('auto_water_linked', 'análisis de agua vinculado')
    : (hasWaterContribution ? fertProgT('auto_water_manual', 'aporte capturado manualmente') : fertProgT('auto_water_none', 'sin aporte nutrimental de agua'));
  const overlay = document.createElement('div');
  overlay.id = 'fertiAutoProgramModal';
  overlay.className = 'ferti-auto-modal';
  overlay._prepared = prepared;
  overlay.innerHTML = `
    <div class="ferti-auto-modal-box" role="dialog" aria-modal="true" aria-labelledby="fertiAutoProgramTitle">
      <h3 id="fertiAutoProgramTitle"><span class="ferti-auto-program-btn-icon" aria-hidden="true"><img src="assets/N_Hoja_Azul.png" alt="" width="18" height="18" decoding="async"></span>${fertiEscapeAttr(fertProgT('auto_title', 'Propuesta automática de programa'))}</h3>
      <p>${fertiEscapeAttr(fertProgT('auto_confirm_intro', 'Se reemplazarán las filas y fertilizantes del programa con una propuesta calculada desde Distribución.'))}</p>
      <div class="ferti-auto-summary">
        <div><strong>${fertiEscapeAttr(fertProgT('auto_source', 'Distribución objetivo'))}:</strong> ${fertiEscapeAttr(distributionName || state.title || '')}</div>
        <div><strong>${fertiEscapeAttr(fertProgT('auto_periods', 'Periodos'))}:</strong> ${state.stages.length} · ${fertiEscapeAttr(state.axis === 'mes' ? fertProgT('monthly', 'Mensual') : fertProgT('weekly', 'Semanal'))}</div>
        <div><strong>${fertiEscapeAttr(fertProgT('auto_water_rule', 'Agua'))}:</strong> ${fertiEscapeAttr(fertProgT('auto_water_proportional', 'se descuenta según la lámina de cada periodo'))}</div>
        <div><strong>${fertiEscapeAttr(fertProgT('auto_water_source', 'Origen del agua'))}:</strong> ${fertiEscapeAttr(waterSource)}</div>
        <div><strong>${fertiEscapeAttr(fertProgT('auto_base_rule', 'Programa granular/base'))}:</strong> ${fertiEscapeAttr(hasBaseContribution ? fertProgT('auto_base_subtracted', 'se descuenta proporcionalmente de la meta de cada nutriente') : fertProgT('auto_base_none', 'sin aporte vinculado'))}</div>
        <div><strong>${fertiEscapeAttr(fertProgT('auto_acid', 'Ácido'))}:</strong> ${fertiEscapeAttr(acidLabel)}</div>
        <div><strong>${fertiEscapeAttr(fertProgT('auto_acid_rule', 'Ácido por etapa'))}:</strong> ${fertiEscapeAttr(fertProgT('auto_acid_proportional', 'L/ha = mL/m³ × lámina de la etapa (m³/ha) ÷ 1000; entra primero y su N/P/S resta del faltante'))}</div>
        <div><strong>${fertiEscapeAttr(fertProgT('auto_materials', 'Fertilizantes'))}:</strong> ${fertiEscapeAttr(materialNames.join(', ') || fertProgT('none', 'Ninguno'))}</div>
        ${unresolvedStages ? `<div class="ferti-auto-warning">${fertiEscapeAttr(fertProgT('auto_unresolved_preview', 'La propuesta tendrá faltantes en {count} periodo(s); se mostrarán para revisión.').replace('{count}', unresolvedStages))}</div>` : ''}
        ${excessStages ? `<div class="ferti-auto-warning">${fertiEscapeAttr(fertProgT('auto_water_excess_preview', 'El agua o el programa granular/base superan una o más metas en {count} periodo(s); el generador no añadirá fertilizante para esos nutrientes.').replace('{count}', excessStages))}</div>` : ''}
        ${!fertiWaterAnalysisId && !hasWaterContribution && availableWaterAnalyses.length ? `<div class="ferti-auto-warning">${fertiEscapeAttr(fertProgT('auto_water_analysis_available', 'Este proyecto tiene análisis de agua. Vincula el análisis correcto en Aporte por agua antes de aceptar si deseas descontarlo.'))}</div>` : ''}
        ${fertiGeneratorHasProgramDoses() ? `<div class="ferti-auto-warning">${fertiEscapeAttr(fertProgT('auto_replace_warning', 'El programa actual contiene dosis y será reemplazado.'))}</div>` : ''}
      </div>
      <p class="ferti-auto-disclaimer">${fertiEscapeAttr(fertProgT('auto_disclaimer', 'Es una propuesta agronómica. Revisa compatibilidad, solubilidad, calidad del agua y límites del sistema antes de aplicarla.'))}</p>
      <div class="ferti-auto-actions">
        <button type="button" class="btn btn-primary" id="fertiAutoAccept">${fertiEscapeAttr(fertProgT('accept', 'Aceptar'))}</button>
        <button type="button" class="btn btn-secondary" id="fertiAutoCancel">${fertiEscapeAttr(fertProgT('cancel', 'Cancelar'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#fertiAutoCancel').addEventListener('click', closeFertiAutoProgramModal);
  overlay.querySelector('#fertiAutoAccept').addEventListener('click', function () {
    const result = overlay._prepared;
    closeFertiAutoProgramModal();
    fertiApplyAutomaticProgram(result);
  });
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) closeFertiAutoProgramModal();
  });
}

function fertiApplyAutomaticProgram(prepared) {
  if (!prepared || !prepared.ok) return;
  const materials = getAllFertiMaterials();
  const stamp = Date.now();
  fertiTimeUnit = prepared.axis === 'mes' ? 'mes' : 'semana';
  fertiColumns = prepared.materialIds.map((materialId, i) => {
    const mat = materials.find(m => m && m.id === materialId);
    return { id:`col_auto_${stamp}_${i}`, materialId, name:mat ? (mat.name || materialId) : materialId };
  });
  fertiWeeks = prepared.stages.map((stage, i) => {
    const kgByCol = {};
    fertiColumns.forEach(col => { kgByCol[col.id] = 0; });
    stage.rows.forEach(row => {
      const col = fertiColumns.find(c => c.materialId === row.materialId);
      if (!col) return;
      const amount = row.doseAmount != null ? row.doseAmount : row.doseKgHa;
      kgByCol[col.id] = (Number(kgByCol[col.id]) || 0) + (Number(amount) || 0);
    });
    const periodLabel = prepared.axis === 'mes' ? `Mes ${i + 1}` : `Semana ${i + 1}`;
    const week = {
      id:`week_auto_${stamp}_${i}`,
      label:periodLabel,
      stage:stage.name,
      kgByCol,
      totals:{}
    };
    computeWeekTotals(week);
    return week;
  });
  fertiWeekCounter = fertiWeeks.length + 1;
  fertiChartWaterByStageM3ha = prepared.stages.map(stage => Math.max(0, Number(stage.waterDepthM3Ha) || 0));
  fertiChartLockedColumnIds = [];
  fertiEnsureWaterAcidColumnsLocked();
  fertiChartSelectedStageIndex = 0;
  fertiProgramInitialized = true;
  window.fertiProgramInitialized = true;
  fertiProgramGenerationDiagnostics = prepared.stages.map(stage => ({
    name:stage.name,
    target:stage.target,
    water:stage.water,
    base:stage.base,
    supplied:stage.supplied,
    remaining:stage.remaining,
    excess:stage.excess,
    unresolved:stage.unresolved.slice()
  }));
  fertiProgramGenerationMeta = {
    generatorVersion:3,
    generatedAt:new Date().toISOString(),
    distributionFingerprint:prepared.distributionFingerprint,
    distributionUpdatedAt:Number(prepared.distribution.updatedAt) || 0,
    distributionSnapshot:prepared.distribution,
    axis:prepared.axis,
    stageCount:prepared.stages.length,
    targetsByStage:prepared.stages.map(stage => stage.target),
    diagnostics:fertiProgramGenerationDiagnostics
  };
  renderFertiWeeks();
  updateFertiSummary();
  updateFertiCharts();
  renderFertiAutomaticProgramStatus();
  window._fertiDistKeepSuggestedPct = false;
  window._fertiDistDrivesProgram = false;
  saveFertirriegoProgram();
  if (window.showMessage) {
    window.showMessage(
      prepared.hasUnresolved || prepared.hasWaterExcess
        ? fertProgT('auto_done_pending', 'Propuesta automática aplicada. Revisa los faltantes y el balance iónico antes de usarla.')
        : fertProgT('auto_done', 'Propuesta automática aplicada. Revisa las dosis y el balance iónico antes de usarla.'),
      prepared.hasUnresolved || prepared.hasWaterExcess ? 'warning' : 'success'
    );
  }
}

function fertiFormatAutoStatusList(diagnostics, mode, key, spanish) {
  const ui = fertProgUI();
  const list = ui && typeof ui.compactNutrientPeriodList === 'function'
    ? ui.compactNutrientPeriodList(diagnostics, mode)
    : '';
  if (!list) return '';
  return fertProgT(key, spanish).replace('{list}', list);
}

function fertiGenerationIsStale() {
  if (!fertiProgramGenerationMeta || !fertiProgramGenerationMeta.distributionFingerprint) return false;
  if (fertiProgramGenerationMeta.inputsChangedAfterGeneration === true) return true;
  const currentDistribution = fertiGeneratorDistributionState();
  if (!currentDistribution) return false;
  return fertiGeneratorFingerprint(currentDistribution) !== fertiProgramGenerationMeta.distributionFingerprint;
}

function fertiMarkGenerationInputsChanged() {
  if (!fertiProgramGenerationMeta) return;
  fertiProgramGenerationMeta.inputsChangedAfterGeneration = true;
  renderFertiAutomaticProgramStatus();
}

function renderFertiAutomaticProgramStatus() {
  const host = document.getElementById('fertiAutoProgramStatus');
  if (!host) return;
  if (!fertiProgramGenerationMeta) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  const stale = fertiGenerationIsStale();
  const diagnostics = Array.isArray(fertiProgramGenerationDiagnostics) ? fertiProgramGenerationDiagnostics : [];
  const pending = diagnostics.filter(d => Array.isArray(d.unresolved) && d.unresolved.length);
  const excess = diagnostics.filter(d => Object.keys(d.excess || {}).some(key => (Number(d.excess[key]) || 0) > 0.005));
  const ionic = fertiWeeks.map((week, i) => {
    const summary = getFertiStageIonicSummary(i, { includeWater:true });
    if (!summary || !summary.meq) return '';
    return `<li><strong>${fertiEscapeAttr(week.label || week.stage || String(i + 1))}</strong>: ` +
      `Σ ${fertiEscapeAttr(fertProgT('anions', 'aniones'))} ${fertiNum(summary.sumAnionsMeq, 2)} meq/L · ` +
      `Σ ${fertiEscapeAttr(fertProgT('cations', 'cationes'))} ${fertiNum(summary.sumCationsMeq, 2)} meq/L · ` +
      `${fertiEscapeAttr(fertProgT('ce_ref', 'CE ref'))} ${fertiNum(summary.ceRefDsM, 2)} dS/m</li>`;
  }).filter(Boolean).join('');
  host.hidden = false;
  host.className = `ferti-auto-status ${stale || pending.length || excess.length ? 'is-warning' : 'is-ok'}`;
  host.innerHTML = `
    <div class="ferti-auto-status-head">
      <strong>${fertiEscapeAttr(stale
        ? fertProgT('auto_stale', 'Programa desactualizado respecto a Distribución objetivo')
        : fertProgT('auto_generated', 'Programa generado desde Distribución objetivo'))}</strong>
      <span>${fertiEscapeAttr(fertiProgramGenerationMeta.generatedAt ? new Date(fertiProgramGenerationMeta.generatedAt).toLocaleString() : '')}</span>
    </div>
    ${pending.length ? `<p>${fertiEscapeAttr(fertiFormatAutoStatusList(diagnostics, 'unresolved', 'auto_pending_detail', 'Falta {list}'))}</p>` : ''}
    ${excess.length ? `<p>${fertiEscapeAttr(fertiFormatAutoStatusList(diagnostics, 'excess', 'auto_water_excess', 'El agua supera la meta: {list}'))}</p>` : ''}
    ${ionic ? `<details><summary>${fertiEscapeAttr(fertProgT('auto_ionic_summary', 'Balance iónico por periodo'))}</summary><ul>${ionic}</ul></details>` : ''}`;
}

// Render semanas
function renderFertiWeeks() {
  const autoBtnLabel = document.getElementById('fertiAutoProgramBtnLabel');
  if (autoBtnLabel) autoBtnLabel.textContent = fertProgT('auto_button', 'Propuesta automática de programa');
  const container = document.getElementById('fertiWeeksContainer');
  if (!container) return;
  updateFertiProgramTimeTitle();
  const materials = getAllFertiMaterials();
  // Mantener nombre legible persistido en columnas para reporte/admin aunque el catálogo cambie.
  fertiColumns.forEach(c => {
    const mat = materials.find(m => m && m.id === c.materialId);
    if (mat && (mat.name || mat.id)) c.name = mat.name || mat.id;
  });
  const buildOptions = (selectedId) => materials
    .map(m => `<option value="${m.id}" ${m.id===selectedId?'selected':''}>${fertProgMaterial(m.name || m.id)}</option>`)
    .join('');
  const cols = getFertiProgramColumns();
  const headerMap = {N_NO3:'N(NO₃)',N_NH4:'N(NH₄)',P:'P',P2O5:'P₂O₅',K:'K',K2O:'K₂O',Ca:'Ca',CaO:'CaO',Mg:'Mg',MgO:'MgO',S:'S',SO4: fertProgElementalMode ? 'S' : 'SO₄',Fe:'Fe',Mn:'Mn',B:'B',Zn:'Zn',Cu:'Cu',Mo:'Mo',Si:'Si',SiO2:'SiO₂'};

  // Encabezados de columnas de fertilizante (select compacto + botón X). El + entre columnas elige dónde insertar.
  const fertColsHeader = fertiJoinFertCols(
    (slotIdx) => `<th class="ferti-insert-slot">${fertiInsertColumnButton(slotIdx)}</th>`,
    (c) => {
      const m = materials.find(mat => mat.id === c.materialId);
      const isWaterAcid = fertiIsWaterAcidColumn(c);
      const isChartLocked = isWaterAcid || fertiChartLockedColumnIds.indexOf(c.id) !== -1;
      const currentName = fertProgMaterial((m?.name) || fertProgT('select', 'Selecciona…'));
      const displayNamePlain = currentName + (m && m.unit === 'L' ? ' (L/ha)' : '');
      const displayNameHtml = currentName + (m && m.unit === 'L' ? ' <span class="unit-lha">(L/ha)</span>' : '');
      const lockTitle = isWaterAcid
        ? fertProgT('chart_acid_locked', 'Bloqueado: la dosis de ácido sale de los meq del agua × la lámina de cada etapa. No se ajusta desde la gráfica.')
        : (isChartLocked
          ? fertProgT('chart_unlock_fertilizer', 'Bloqueado: haz clic para permitir ajustes desde la gráfica')
          : fertProgT('chart_lock_fertilizer', 'Abierto: la gráfica puede ajustar este fertilizante'));
      const lockIcon = isChartLocked
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7.2a4 4 0 0 1 8 0V11"></path></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7.2a4 4 0 0 1 8 0"></path></svg>';
      return `
          <th class="ferti-fert-col-head">
            <button type="button" title="${fertiEscapeAttr(lockTitle)}" aria-label="${fertiEscapeAttr(lockTitle)}" aria-pressed="${isChartLocked ? 'true' : 'false'}" class="ferti-col-lock-btn ${isChartLocked ? 'is-locked' : 'is-unlocked'}${isWaterAcid ? ' is-acid-locked' : ''}" onclick="toggleFertiChartColumnLock('${c.id}')">${lockIcon}</button>
            <button title="Eliminar columna" class="ferti-col-remove-btn" onclick="removeFertiColumn('${c.id}')">✕</button>
            <div class="fert-col-title" title="${displayNamePlain}">${displayNameHtml}</div>
            <select class="ferti-col-select" data-col-id="${c.id}" onchange="onFertiColumnMaterialChange('${c.id}', this.value)">
              <option value="">${fertProgT('select', 'Selecciona…')}</option>
              ${buildOptions(c.materialId)}
            </select>
          </th>`;
    }
  );

  fertiWeeks.forEach(w => computeWeekTotals(w));

  // Fila de subtítulo centrado (un solo rótulo para todo el renglón)
  const fertInsertSlotCount = fertiColumns.length + 1;
  const headerTotalCols = 2 + fertiColumns.length + fertInsertSlotCount + cols.length;

  // Totales: por columna de fertilizante y por nutriente
  const fertColTotals = fertiColumns.map(c => {
    let sum = 0; fertiWeeks.forEach(w => { sum += parseFloat(w.kgByCol?.[c.id]||0); }); return sum;
  });
  const fertColNames = fertiColumns.map(c => (materials.find(m => m.id === c.materialId)?.name) || '');
  const nutTotals = { N_NO3:0,N_NH4:0,P:0,P2O5:0,K:0,K2O:0,Ca:0,CaO:0,Mg:0,MgO:0,S:0,SO4:0,Cl:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,Si:0,SiO2:0 };
  fertiWeeks.forEach(w => { Object.keys(nutTotals).forEach(n => { nutTotals[n] += parseFloat(w.totals?.[n]||0); }); });

  const weekRowsHtml = fertiWeeks.map((week, idx) => `
          <tr>
            <td class="ferti-stage-cell">
              <div style="display:flex; align-items:center; gap:6px;">
                <select onchange="window.onChangeFertiStage && window.onChangeFertiStage('${week.id}', this.value)">
                ${fertiProgramStageOptions(week.stage)}
                </select>
                <button title="Eliminar semana" class="ferti-week-remove-btn" onclick="removeFertiWeek('${week.id}')">✕</button>
              </div>
            </td>
            <td class="ferti-week-num-cell" style="text-align:center;">${idx+1}</td>
            ${fertiJoinFertCols(
              () => '<td class="ferti-insert-slot" aria-hidden="true"></td>',
              (c) => `
              <td><input type="number" step="0.01" value="${fertProgInputFromSI(week.kgByCol?.[c.id]||0, 'dose_mass_area', 2)}" class="material-input" style="width:88px;" data-week-id="${week.id}" data-col-id="${c.id}" oninput="onWeekKgInput('${week.id}','${c.id}',this.value)" onchange="onWeekKgChange('${week.id}','${c.id}',this.value)"/></td>`
            )}
            ${cols.map((n,i)=>`<td class="nut-col-cell ${i===0?'nut-start':''}" style="width:60px;text-align:right;">${fertiProgNutrientDisplay(week.totals?.[n]||0, n, n === 'SO4' ? (week.totals?.S || 0) : undefined)}</td>`).join('')}
          </tr>
        `).join('');
  const totalsRowHtml = `
          <tr class="total-row">
            <td colspan="2" style="text-align:left;font-weight:700;">${fertProgT('total', 'TOTAL')}</td>
            ${fertiJoinFertCols(
              () => '<td class="ferti-insert-slot" aria-hidden="true"></td>',
              (c, i) => `<td><div class="total-value">${fertProgResultFromSI(fertColTotals[i], 'dose_mass_area')}</div><div class="total-label-sm" title="${fertColNames[i]||''}">${(fertColNames[i]||'').slice(0,14)}</div></td>`
            )}
            ${cols.map((n,i)=>`<td class="nut-col-cell ${i===0?'nut-start':''}"><div class="total-value">${fertiProgNutrientDisplay(nutTotals[n]||0, n, n === 'SO4' ? (nutTotals.S || 0) : undefined)}</div><div class="total-label-sm">${headerMap[n]||n}</div></td>`).join('')}
          </tr>`;

  const priceApi = fertiGetPriceApi();
  const priceLabels = priceApi ? priceApi.labels() : { costPerProduct: 'Costo por producto', totalCost: 'Costo total', costAreaUnit: 'USD/ha' };
  const costBreak = fertiProgramCostBreakdownUsdHa();
  const fertColCostsUsdHa = costBreak.costs;
  const totalCostUsdHa = costBreak.total;
  const costCells = fertiJoinFertCols(
    () => '<td class="ferti-insert-slot" aria-hidden="true"></td>',
    (c, i) => {
      const disp = priceApi ? priceApi.toDisplayAreaCost(fertColCostsUsdHa[i]) : fertColCostsUsdHa[i];
      const txt = (disp > 0 && priceApi) ? priceApi.formatMoney(disp) : (disp > 0 ? disp.toFixed(2) : '—');
      return `<td><div class="total-value" style="color:#0f766e;">${txt}</div><div class="total-label-sm" title="${fertColNames[i] || ''}">${(fertColNames[i] || '').slice(0, 14)}</div></td>`;
    }
  );
  const totalCostDisp = priceApi ? priceApi.toDisplayAreaCost(totalCostUsdHa) : totalCostUsdHa;
  const totalCostTxt = (totalCostDisp > 0 && priceApi) ? priceApi.formatMoney(totalCostDisp) : (totalCostDisp > 0 ? totalCostDisp.toFixed(2) : '—');
  const costRowHtml = fertiColumns.length
    ? `<tr class="ferti-cost-row" style="background:#f0fdfa;">
            <td colspan="2" style="text-align:left;font-weight:700;color:#0f766e;">${priceLabels.costPerProduct}<br><span style="font-weight:500;font-size:0.75rem;color:#64748b;">${priceLabels.costAreaUnit}</span></td>
            ${costCells}
            ${cols.map((n, i) => `<td class="nut-col-cell ${i === 0 ? 'nut-start' : ''}"></td>`).join('')}
          </tr>
          <tr class="ferti-cost-total-row" style="background:#ccfbf1;">
            <td colspan="2" style="text-align:left;font-weight:800;color:#115e59;">${priceLabels.totalCost} (${priceLabels.costAreaUnit})</td>
            <td colspan="${Math.max(1, fertiColumns.length + fertInsertSlotCount)}" style="text-align:left;font-weight:800;color:#115e59;font-size:1.05rem;">${totalCostTxt} ${priceLabels.costAreaUnit}</td>
            ${cols.map((n, i) => `<td class="nut-col-cell ${i === 0 ? 'nut-start' : ''}"></td>`).join('')}
          </tr>`
    : '';

  const timeSelectHtml = `
    <select class="ferti-time-select" onchange="setFertiTimeUnit(this.value)">
      <option value="semana" ${fertiTimeUnit==='semana'?'selected':''}>${fertProgT('week', 'Semana')}</option>
      <option value="mes" ${fertiTimeUnit==='mes'?'selected':''}>${fertProgT('month', 'Mes')}</option>
    </select>`;
  const kgHeader = fertProgUnit('dose_mass_area', 'kg/ha') + (fertiTimeUnit === 'mes'
    ? fertProgT('per_month_abbr', '/mes')
    : fertProgT('per_week_abbr', '/sem'));
  const kgHeaderStyle = fertiTimeUnit === 'mes'
    ? 'text-align:center;background:#f0fdf4;color:#166534;border-top:1px solid #bbf7d0;border-bottom:1px solid #bbf7d0;'
    : 'text-align:center;background:#eff6ff;color:#1e3a8a;border-top:1px solid #bfdbfe;border-bottom:1px solid #bfdbfe;';

  const addTimeLabel = fertiTimeUnit === 'mes'
    ? fertProgT('add_month', 'Agregar mes')
    : fertProgT('add_week', 'Agregar semana');
  container.innerHTML = `
    <table class="materials-table">
      <thead>
        <tr>
          <th class="ferti-stage-header">${fertProgT('stage', 'Etapa')}</th>
          <th class="ferti-week-header" style="text-align:center;">${timeSelectHtml}</th>
          ${fertColsHeader}
          ${cols.map((c,i)=>`<th class="nut-col ${i===0?'nut-start':''}" style="min-width:60px;width:60px;">${headerMap[c]||c}</th>`).join('')}
        </tr>
        <tr>
          <th colspan="${headerTotalCols}" style="${kgHeaderStyle}">${kgHeader}</th>
        </tr>
      </thead>
      <tbody>
        ${weekRowsHtml}
        ${totalsRowHtml}
        ${costRowHtml}
      </tbody>
    </table>
    <div style="margin-top:8px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" onclick="addFertiColumn()">➕ ${fertProgT('add_fertilizer', 'Agregar fertilizante')}</button>
      <button class="btn btn-secondary btn-sm" onclick="addFertiWeek()">➕ ${addTimeLabel}</button>
      <button class="btn btn-info btn-sm" onclick="openFertiNewMaterialModal()">📋 ${fertProgT('manage_catalog', 'Gestionar catálogo de fertilizantes y precios')}</button>
    </div>
  `;
  try { fertiPaintCycleHeaderCost(totalCostUsdHa); } catch (ePaint) {}
  try { renderFertiChartWaterByStageInputs(); } catch (eWater) {}
}

function onChangeFertiStage(weekId, stage) {
  const w = fertiWeeks.find(w => w.id === weekId); if (!w) return;
  w.stage = stage;
  markFertiProgDirty();
}

// Resumen
function applyFertiSVisibilityPolicy() {
  // Política solicitada: en Fertirriego trabajar visualmente con SO4 para evitar confusión con S elemental.
  const sIds = ['fertiProgTotalS', 'fertiReqS', 'fertiWaterS', 'fertiBaseS', 'fertiTotalWithWaterS', 'fertiDiffS'];
  sIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const item = el.closest('.nutrient-item');
    if (item) item.style.display = 'none';
  });
}

function updateFertiSummary() {
  try { fertiRefreshLinkedWaterKgFromLamina(); } catch (e) {}
  applyFertiSVisibilityPolicy();
  updateFertiProgramTimeTitle();
  const labelMap = fertProgElementalMode
    ? { P2O5: 'P', K2O: 'K', CaO: 'Ca', MgO: 'Mg', SiO2: 'Si', SO4: 'S' }
    : { P2O5: 'P₂O₅', K2O: 'K₂O', CaO: 'CaO', MgO: 'MgO', SiO2: 'SiO₂', SO4: 'SO₄' };
  const labelIds = [
    ['fertiProgLabelP2O5', 'P2O5'],
    ['fertiProgLabelK2O', 'K2O'],
    ['fertiProgLabelCaO', 'CaO'],
    ['fertiProgLabelMgO', 'MgO'],
    ['fertiProgLabelSO4', 'SO4'],
    ['fertiProgLabelSiO2', 'SiO2'],
    ['fertiReqLabelP2O5', 'P2O5'],
    ['fertiReqLabelK2O', 'K2O'],
    ['fertiReqLabelCaO', 'CaO'],
    ['fertiReqLabelMgO', 'MgO'],
    ['fertiReqLabelSO4', 'SO4'],
    ['fertiReqLabelSiO2', 'SiO2'],
    ['fertiWaterLabelP2O5', 'P2O5'],
    ['fertiWaterLabelK2O', 'K2O'],
    ['fertiWaterLabelCaO', 'CaO'],
    ['fertiWaterLabelMgO', 'MgO'],
    ['fertiWaterLabelSO4', 'SO4'],
    ['fertiWaterLabelSiO2', 'SiO2'],
    ['fertiBaseLabelP2O5', 'P2O5'],
    ['fertiBaseLabelK2O', 'K2O'],
    ['fertiBaseLabelCaO', 'CaO'],
    ['fertiBaseLabelMgO', 'MgO'],
    ['fertiBaseLabelSO4', 'SO4'],
    ['fertiBaseLabelSiO2', 'SiO2'],
    ['fertiTotalWithWaterLabelP2O5', 'P2O5'],
    ['fertiTotalWithWaterLabelK2O', 'K2O'],
    ['fertiTotalWithWaterLabelCaO', 'CaO'],
    ['fertiTotalWithWaterLabelMgO', 'MgO'],
    ['fertiTotalWithWaterLabelSO4', 'SO4'],
    ['fertiTotalWithWaterLabelSiO2', 'SiO2'],
    ['fertiDiffLabelP2O5', 'P2O5'],
    ['fertiDiffLabelK2O', 'K2O'],
    ['fertiDiffLabelCaO', 'CaO'],
    ['fertiDiffLabelMgO', 'MgO'],
    ['fertiDiffLabelSO4', 'SO4'],
    ['fertiDiffLabelSiO2', 'SiO2']
  ];
  labelIds.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${labelMap[key]}:`;
  });
  const toElemental = (n, v) => {
    if (!fertProgElementalMode) return v;
    switch (n) {
      case 'P2O5': return v / FERTI_CONV.P2O5_TO_P;
      case 'K2O': return v / FERTI_CONV.K2O_TO_K;
      case 'CaO': return v / FERTI_CONV.CaO_TO_Ca;
      case 'MgO': return v / FERTI_CONV.MgO_TO_Mg;
      case 'SiO2': return v / FERTI_CONV.SiO2_TO_Si;
      default: return v;
    }
  };
  const toOxideFromElemental = (n, v) => {
    if (!fertProgElementalMode) return v;
    switch (n) {
      case 'P2O5': return v * FERTI_CONV.P2O5_TO_P;
      case 'K2O': return v * FERTI_CONV.K2O_TO_K;
      case 'CaO': return v * FERTI_CONV.CaO_TO_Ca;
      case 'MgO': return v * FERTI_CONV.MgO_TO_Mg;
      case 'SiO2': return v * FERTI_CONV.SiO2_TO_Si;
      default: return v;
    }
  };
  // Sumar aportes de todas las semanas
  const totals = { N_NO3:0,N_NH4:0,P:0,P2O5:0,K:0,K2O:0,Ca:0,CaO:0,Mg:0,MgO:0,S:0,SO4:0,Cl:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,Si:0,SiO2:0 };
  let totalKg = 0;
  fertiWeeks.forEach(w => {
    computeWeekTotals(w);
    // acumulado de kg aplicados en la semana
    if (w.kgByCol) {
      Object.values(w.kgByCol).forEach(v => { totalKg += parseFloat(v || 0); });
    }
    FERTI_NUTRIENTS.forEach(n => totals[n] += parseFloat(w.totals?.[n]||0));
    totals.Cl += parseFloat(w.totals?.Cl || 0);
  });

  // Cargar requerimiento real en ÓXIDO
  let reqOxide = {};
  try {
    const liveIds = ['N','P2O5','K2O','CaO','MgO','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    let anyLive = false; const tmp = {};
    const fertiTable = document.getElementById('fertirriegoTableContainer');
    liveIds.forEach(n => {
      const scoped = fertiTable ? fertiTable.querySelector(`#ferti-req-${n}`) : null;
      const el = scoped || document.getElementById(`ferti-req-${n}`) || document.getElementById(`req-${n}`);
      if (el && el.textContent != null) {
        // Celda ya en unidad de presentación (kg/ha o lb/acre) → SI (kg/ha)
        const vDisplay = parseFloat((el.textContent || '').toString().replace(/,/g, '').trim());
        if (!isNaN(vDisplay)) {
          tmp[n] = fertProgToSI(vDisplay, 'dose_mass_area');
          anyLive = true;
        }
      }
    });
    if (anyLive) {
      const reqModeIsElemental = typeof window !== 'undefined' && window.isFertirriegoElementalMode === true;
      liveIds.forEach(n => {
        let v = tmp[n] || 0;
        if (reqModeIsElemental) {
          switch(n){
            case 'P2O5': v *= FERTI_CONV.P2O5_TO_P; break;
            case 'K2O': v *= FERTI_CONV.K2O_TO_K; break;
            case 'CaO': v *= FERTI_CONV.CaO_TO_Ca; break;
            case 'MgO': v *= FERTI_CONV.MgO_TO_Mg; break;
            case 'SiO2': v *= FERTI_CONV.SiO2_TO_Si; break;
            case 'SO4': v *= FERTI_CONV.SO4_TO_S; break;
            default: break;
          }
        }
        reqOxide[n] = v;
      });
    }
  } catch(e) { /* ignore live read errors */ }
  try {
    const pid = (window.projectManager && window.projectManager.getCurrentProject()) ? window.projectManager.getCurrentProject().id : localStorage.getItem('nutriplant-current-project');
    let data = null;
    if (window.projectStorage && pid) {
      const fertSection = window.projectStorage.loadSection('fertirriego', pid);
      if (fertSection && fertSection.requirements) data = fertSection.requirements;
    }
    if (!data && pid) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
      if (pd.fertirriego && pd.fertirriego.requirements) data = pd.fertirriego.requirements;
    }
    if (!data && window.projectManager && window.projectManager.loadProjectData) {
      data = window.projectManager.loadProjectData('fertirriegoRequirements');
    }
    if (!data && pid) {
      // Legacy alterno
      const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
      if (pd.fertirriegoRequirements) data = pd.fertirriegoRequirements;
    }
    const list = ['N','P2O5','K2O','CaO','MgO','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    const hasSavedAdj = !!(data && data.adjustment && typeof data.adjustment === 'object' && Object.keys(data.adjustment).length > 0);
    const hasSavedEff = !!(data && data.efficiency && typeof data.efficiency === 'object' && Object.keys(data.efficiency).length > 0);
    if (!Object.keys(reqOxide).length && data && (hasSavedAdj || hasSavedEff)) {
      list.forEach(n => {
        let adj = parseFloat(data.adjustment[n]) || 0;
        if (n === 'SO4') {
          adj += (parseFloat(data.adjustment.S) || 0) * FERTI_CONV.SO4_TO_S;
        }
        const eff = parseFloat(data.efficiency[n])||100;
        reqOxide[n] = eff>0 ? adj/(eff/100) : adj;
      });
    }
    if (!Object.keys(reqOxide).length) list.forEach(n => { reqOxide[n] = 0; });
  } catch(e){ console.warn('Req load error', e); }

  // Mostrar en el resumen del DOM (ids prefijados con ferti...)
  function set(id, value){ const el = document.getElementById(id); if (el) el.textContent = fertProgResultFromSI(value, 'dose_mass_area'); }
  function setFertiDiff(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const n = parseFloat(value);
    const num = isNaN(n) ? 0 : n;
    el.textContent = fertProgResultFromSI(value, 'dose_mass_area');
    el.classList.remove('nutrient-diff--deficit', 'nutrient-diff--surplus', 'nutrient-diff--balanced');
    const item = el.closest('.nutrient-item');
    if (item) {
      item.classList.remove('nutrient-item--diff-deficit', 'nutrient-item--diff-surplus', 'nutrient-item--diff-balanced');
    }
    var diffEps = 1e-3;
    if (Math.abs(num) < diffEps) {
      el.classList.add('nutrient-diff--balanced');
      if (item) item.classList.add('nutrient-item--diff-balanced');
    } else if (num < 0) {
      el.classList.add('nutrient-diff--deficit');
      if (item) item.classList.add('nutrient-item--diff-deficit');
    } else {
      el.classList.add('nutrient-diff--surplus');
      if (item) item.classList.add('nutrient-item--diff-surplus');
    }
  }
  function setInput(id, value){
    const el = document.getElementById(id);
    if (!el) return;
    if (el === document.activeElement) return;
    el.value = fertProgInputFromSI(value, 'dose_mass_area');
  }
  // Aporte total (mostramos por defecto óxidos más N fraccionado)
  const appsEl = document.getElementById('fertiTotalApplications'); if (appsEl) appsEl.textContent = String(fertiWeeks.length || 0);
  const doseEl = document.getElementById('fertiTotalDoseKgHa'); if (doseEl) doseEl.textContent = fertProgResultFromSI(totalKg, 'dose_mass_area');
  try { fertiPaintCycleHeaderCost(fertiComputeProgramTotalCostUsdHa()); } catch (eCost) {}
  set('fertiProgTotalN_NO3', totals.N_NO3); set('fertiProgTotalN_NH4', totals.N_NH4);
  set('fertiProgTotalP2O5', toElemental('P2O5', totals.P2O5)); set('fertiProgTotalK2O', toElemental('K2O', totals.K2O)); set('fertiProgTotalCaO', toElemental('CaO', totals.CaO)); set('fertiProgTotalMgO', toElemental('MgO', totals.MgO));
  set('fertiProgTotalS', totals.S);
  set('fertiProgTotalSO4', fertiMergeSulfurKgDisplay(totals.SO4, totals.S));
  set('fertiProgTotalFe', totals.Fe); set('fertiProgTotalMn', totals.Mn); set('fertiProgTotalB', totals.B); set('fertiProgTotalZn', totals.Zn); set('fertiProgTotalCu', totals.Cu); set('fertiProgTotalMo', totals.Mo);   set('fertiProgTotalSiO2', toElemental('SiO2', totals.SiO2));
  set('fertiProgTotalCl', totals.Cl);

  // Requerimiento
  set('fertiReqN', reqOxide.N||0);
  set('fertiReqP2O5', toElemental('P2O5', reqOxide.P2O5||0)); set('fertiReqK2O', toElemental('K2O', reqOxide.K2O||0)); set('fertiReqCaO', toElemental('CaO', reqOxide.CaO||0)); set('fertiReqMgO', toElemental('MgO', reqOxide.MgO||0));
  set('fertiReqS', reqOxide.S||0);
  set('fertiReqSO4', fertiMergeSulfurKgDisplay(reqOxide.SO4 || 0, reqOxide.S || 0));
  set('fertiReqFe', reqOxide.Fe||0); set('fertiReqMn', reqOxide.Mn||0); set('fertiReqB', reqOxide.B||0); set('fertiReqZn', reqOxide.Zn||0); set('fertiReqCu', reqOxide.Cu||0); set('fertiReqMo', reqOxide.Mo||0); set('fertiReqSiO2', toElemental('SiO2', reqOxide.SiO2||0));

  // Aporte por agua (inputs editables)
  setInput('fertiWaterN', fertiWaterContributionOxide.N||0);
  setInput('fertiWaterP2O5', toElemental('P2O5', fertiWaterContributionOxide.P2O5||0));
  setInput('fertiWaterK2O', toElemental('K2O', fertiWaterContributionOxide.K2O||0));
  setInput('fertiWaterCaO', toElemental('CaO', fertiWaterContributionOxide.CaO||0));
  setInput('fertiWaterMgO', toElemental('MgO', fertiWaterContributionOxide.MgO||0));
  setInput('fertiWaterS', fertiWaterContributionOxide.S||0);
  setInput('fertiWaterSO4', fertiMergeSulfurKgDisplay(fertiWaterContributionOxide.SO4 || 0, fertiWaterContributionOxide.S || 0));
  setInput('fertiWaterFe', fertiWaterContributionOxide.Fe||0);
  setInput('fertiWaterMn', fertiWaterContributionOxide.Mn||0);
  setInput('fertiWaterB', fertiWaterContributionOxide.B||0);
  setInput('fertiWaterZn', fertiWaterContributionOxide.Zn||0);
  setInput('fertiWaterCu', fertiWaterContributionOxide.Cu||0);
  setInput('fertiWaterMo', fertiWaterContributionOxide.Mo||0);
  setInput('fertiWaterSiO2', toElemental('SiO2', fertiWaterContributionOxide.SiO2||0));
  setInput('fertiWaterCl', fertiWaterContributionOxide.Cl||0);

  // Aporte de fertilización de base / programa granular
  setInput('fertiBaseN', fertiBaseContributionOxide.N||0);
  setInput('fertiBaseP2O5', toElemental('P2O5', fertiBaseContributionOxide.P2O5||0));
  setInput('fertiBaseK2O', toElemental('K2O', fertiBaseContributionOxide.K2O||0));
  setInput('fertiBaseCaO', toElemental('CaO', fertiBaseContributionOxide.CaO||0));
  setInput('fertiBaseMgO', toElemental('MgO', fertiBaseContributionOxide.MgO||0));
  setInput('fertiBaseS', fertiBaseContributionOxide.S||0);
  setInput('fertiBaseSO4', fertiMergeSulfurKgDisplay(fertiBaseContributionOxide.SO4 || 0, fertiBaseContributionOxide.S || 0));
  setInput('fertiBaseFe', fertiBaseContributionOxide.Fe||0);
  setInput('fertiBaseMn', fertiBaseContributionOxide.Mn||0);
  setInput('fertiBaseB', fertiBaseContributionOxide.B||0);
  setInput('fertiBaseZn', fertiBaseContributionOxide.Zn||0);
  setInput('fertiBaseCu', fertiBaseContributionOxide.Cu||0);
  setInput('fertiBaseMo', fertiBaseContributionOxide.Mo||0);
  setInput('fertiBaseSiO2', toElemental('SiO2', fertiBaseContributionOxide.SiO2||0));
  setInput('fertiBaseCl', fertiBaseContributionOxide.Cl||0);

  // Aporte total (programa + agua + fertilización de base)
  const totalWithWater = {
    N: (totals.N_NO3 + totals.N_NH4) + (fertiWaterContributionOxide.N||0) + (fertiBaseContributionOxide.N||0),
    P2O5: totals.P2O5 + (fertiWaterContributionOxide.P2O5||0) + (fertiBaseContributionOxide.P2O5||0),
    K2O: totals.K2O + (fertiWaterContributionOxide.K2O||0) + (fertiBaseContributionOxide.K2O||0),
    CaO: totals.CaO + (fertiWaterContributionOxide.CaO||0) + (fertiBaseContributionOxide.CaO||0),
    MgO: totals.MgO + (fertiWaterContributionOxide.MgO||0) + (fertiBaseContributionOxide.MgO||0),
    S: totals.S + (fertiWaterContributionOxide.S||0) + (fertiBaseContributionOxide.S||0),
    SO4: totals.SO4 + (fertiWaterContributionOxide.SO4||0) + (fertiBaseContributionOxide.SO4||0),
    Fe: totals.Fe + (fertiWaterContributionOxide.Fe||0) + (fertiBaseContributionOxide.Fe||0),
    Mn: totals.Mn + (fertiWaterContributionOxide.Mn||0) + (fertiBaseContributionOxide.Mn||0),
    B: totals.B + (fertiWaterContributionOxide.B||0) + (fertiBaseContributionOxide.B||0),
    Zn: totals.Zn + (fertiWaterContributionOxide.Zn||0) + (fertiBaseContributionOxide.Zn||0),
    Cu: totals.Cu + (fertiWaterContributionOxide.Cu||0) + (fertiBaseContributionOxide.Cu||0),
    Mo: totals.Mo + (fertiWaterContributionOxide.Mo||0) + (fertiBaseContributionOxide.Mo||0),
    SiO2: totals.SiO2 + (fertiWaterContributionOxide.SiO2||0) + (fertiBaseContributionOxide.SiO2||0),
    Cl: totals.Cl + (fertiWaterContributionOxide.Cl||0) + (fertiBaseContributionOxide.Cl||0)
  };
  set('fertiTotalWithWaterN', totalWithWater.N);
  set('fertiTotalWithWaterP2O5', toElemental('P2O5', totalWithWater.P2O5));
  set('fertiTotalWithWaterK2O', toElemental('K2O', totalWithWater.K2O));
  set('fertiTotalWithWaterCaO', toElemental('CaO', totalWithWater.CaO));
  set('fertiTotalWithWaterMgO', toElemental('MgO', totalWithWater.MgO));
  set('fertiTotalWithWaterS', totalWithWater.S);
  set('fertiTotalWithWaterSO4', fertiMergeSulfurKgDisplay(totalWithWater.SO4, totalWithWater.S));
  set('fertiTotalWithWaterFe', totalWithWater.Fe);
  set('fertiTotalWithWaterMn', totalWithWater.Mn);
  set('fertiTotalWithWaterB', totalWithWater.B);
  set('fertiTotalWithWaterZn', totalWithWater.Zn);
  set('fertiTotalWithWaterCu', totalWithWater.Cu);
  set('fertiTotalWithWaterMo', totalWithWater.Mo);
  set('fertiTotalWithWaterSiO2', toElemental('SiO2', totalWithWater.SiO2));
  set('fertiTotalWithWaterCl', totalWithWater.Cl);

  // Diferencia = Aporte total (programa + agua + fertilización de base) - Requerimiento
  const diff = {
    N: totalWithWater.N - (reqOxide.N||0),
    P2O5: totalWithWater.P2O5 - (reqOxide.P2O5||0),
    K2O: totalWithWater.K2O - (reqOxide.K2O||0),
    CaO: totalWithWater.CaO - (reqOxide.CaO||0),
    MgO: totalWithWater.MgO - (reqOxide.MgO||0),
    S: totalWithWater.S - (reqOxide.S||0),
    SO4: totalWithWater.SO4 - (reqOxide.SO4||0),
    Fe: totalWithWater.Fe - (reqOxide.Fe||0),
    Mn: totalWithWater.Mn - (reqOxide.Mn||0),
    B: totalWithWater.B - (reqOxide.B||0),
    Zn: totalWithWater.Zn - (reqOxide.Zn||0),
    Cu: totalWithWater.Cu - (reqOxide.Cu||0),
    Mo: totalWithWater.Mo - (reqOxide.Mo||0),
    SiO2: totalWithWater.SiO2 - (reqOxide.SiO2||0),
    Cl: totalWithWater.Cl - (reqOxide.Cl||0)
  };
  setFertiDiff('fertiDiffN', diff.N);
  setFertiDiff('fertiDiffP2O5', toElemental('P2O5', diff.P2O5)); setFertiDiff('fertiDiffK2O', toElemental('K2O', diff.K2O)); setFertiDiff('fertiDiffCaO', toElemental('CaO', diff.CaO)); setFertiDiff('fertiDiffMgO', toElemental('MgO', diff.MgO));
  setFertiDiff('fertiDiffS', diff.S);
  setFertiDiff('fertiDiffSO4', fertiMergeSulfurKgDisplay(diff.SO4, diff.S));
  setFertiDiff('fertiDiffFe', diff.Fe); setFertiDiff('fertiDiffMn', diff.Mn); setFertiDiff('fertiDiffB', diff.B); setFertiDiff('fertiDiffZn', diff.Zn); setFertiDiff('fertiDiffCu', diff.Cu); setFertiDiff('fertiDiffMo', diff.Mo);   setFertiDiff('fertiDiffSiO2', toElemental('SiO2', diff.SiO2));
  setFertiDiff('fertiDiffCl', diff.Cl);

  try { fertiRefreshWaterAnalysisSelect(); } catch {}
  try { fertiRefreshGranularProgramSelect(); } catch {}
  try { fertiRenderAcidSummary(); } catch {}
  try { updateFertiCharts(); } catch {}
  fertiNotifyDistributionCreditsChanged();
}

function fertiWaterToOxide(key, value) {
  if (!fertProgElementalMode) return value;
  switch (key) {
    case 'P2O5': return value * FERTI_CONV.P2O5_TO_P;
    case 'K2O': return value * FERTI_CONV.K2O_TO_K;
    case 'CaO': return value * FERTI_CONV.CaO_TO_Ca;
    case 'MgO': return value * FERTI_CONV.MgO_TO_Mg;
    case 'SiO2': return value * FERTI_CONV.SiO2_TO_Si;
    case 'SO4': return value * FERTI_CONV.SO4_TO_S;
    default: return value;
  }
}

function fertiEscapeAttr(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function fertiGetProjectWaterAnalyses() {
  try {
    if (typeof window.getAguaAnalyses === 'function') {
      const list = window.getAguaAnalyses();
      if (Array.isArray(list)) return list;
    }
  } catch (e) {}
  try {
    const project = (window.projectManager && window.projectManager.getCurrentProject)
      ? window.projectManager.getCurrentProject()
      : (window.currentProject || null);
    if (project && Array.isArray(project.aguaAnalyses)) return project.aguaAnalyses;
  } catch (e) {}
  try {
    const pid = fertiGetUnifiedProjectId();
    if (pid && window.projectStorage && typeof window.projectStorage.loadSection === 'function') {
      const section = window.projectStorage.loadSection('aguaAnalyses', pid);
      if (Array.isArray(section)) return section;
    }
  } catch (e) {}
  return [];
}

function fertiWaterAnalysisLabel(analysis, index) {
  const title = (analysis && analysis.title && String(analysis.title).trim()) || '';
  const date = (analysis && analysis.date && String(analysis.date).trim()) || '';
  if (title && date) return title + ' · ' + date;
  if (title) return title;
  if (date) return fertProgT('water_analysis_label', 'Análisis') + ' · ' + date;
  return fertProgT('water_analysis_generic', 'Análisis de agua') + ' #' + (index + 1);
}

function fertiUiLang() {
  try {
    const prefs = window.NpPrefs && typeof window.NpPrefs.get === 'function' ? window.NpPrefs.get() : null;
    const language = prefs && prefs.language ? prefs.language :
      (window.NpI18n && typeof window.NpI18n.getLanguage === 'function' ? window.NpI18n.getLanguage() : 'es');
    return language === 'en' ? 'en' : 'es';
  } catch (e) {
    return 'es';
  }
}

function fertiGetLinkedWaterAnalysis() {
  const id = fertiWaterAnalysisId;
  if (!id) return null;
  const list = fertiGetProjectWaterAnalyses();
  return list.find(a => a && a.id === id) || null;
}

function fertiProgramWaterDepths(stageCount) {
  const n = Math.max(0, parseInt(stageCount, 10) || 0);
  let dist = [];
  try {
    const state = fertiGeneratorDistributionState();
    if (state && Array.isArray(state.waterDepthByStageM3ha)) dist = state.waterDepthByStageM3ha;
  } catch (e) {}
  const chart = Array.isArray(fertiChartWaterByStageM3ha) ? fertiChartWaterByStageM3ha : [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = Math.max(0, Number(chart[i]) || 0);
    const d = Math.max(0, Number(dist[i]) || 0);
    out.push(Math.max(c, d));
  }
  return out;
}

function fertiAcidWaterDepths() {
  const state = fertiGeneratorDistributionState();
  const n = state && Array.isArray(state.stages) ? state.stages.length
    : (Array.isArray(fertiWeeks) ? fertiWeeks.length : 0);
  if (n) return fertiProgramWaterDepths(n);
  return Array.isArray(fertiChartWaterByStageM3ha) ? fertiChartWaterByStageM3ha.map(v => Math.max(0, Number(v) || 0)) : [];
}

function fertiGeneratorAcidInput() {
  const analysis = fertiGetLinkedWaterAnalysis();
  if (!analysis) return null;
  const legend = window.NpHydroAcidLegend;
  if (!legend || typeof legend.calculate !== 'function') return null;
  const calc = legend.calculate(analysis, 0);
  if (!calc || !(calc.mlPerM3 > 0)) return null;
  const mats = typeof getAllFertiMaterials === 'function' ? getAllFertiMaterials() : [];
  const mat = (mats || []).find(m => m && m.id === calc.acidId);
  return {
    materialId: calc.acidId || 'acido_nitrico_55',
    mlPerM3: calc.mlPerM3,
    densityKgL: (mat && parseFloat(mat.density)) || (calc.acid && calc.acid.densityKgL) || 1.33
  };
}

function fertProgQuantity(value, kind) {
  const ui = fertProgUI();
  if (ui && typeof ui.quantityFromSI === 'function') return ui.quantityFromSI(value, kind);
  return fertiNum(value, 2) + (kind === 'volume_area' ? ' m³/ha' : '');
}

function fertiAcidLaminaQty(m3ha) {
  return fertProgQuantity(m3ha, 'volume_area');
}

function fertiAcidDoseHaQty(litersHa) {
  const ui = fertProgUI();
  let us = false;
  try {
    us = !!(ui && typeof ui.getPrefs === 'function' && ui.getPrefs().unit_system === 'us_customary');
  } catch (e) {}
  if (us && ui && typeof ui.resultFromSI === 'function') {
    return ui.resultFromSI((Number(litersHa) || 0) / 1000, 'volume_area', 2) + ' ' + fertProgUnit('volume_area', 'US gal/acre');
  }
  return fertiNum(litersHa, 2) + ' L/ha';
}

function fertiRenderAcidSummary() {
  const wrap = document.getElementById('fertiAcidSummary');
  if (!wrap) return;
  const legend = window.NpHydroAcidLegend;
  if (!legend || typeof legend.buildHtml !== 'function') {
    wrap.innerHTML = '';
    return;
  }
  const lang = fertiUiLang();
  const analysis = fertiGetLinkedWaterAnalysis();
  const depths = fertiAcidWaterDepths();
  const totalDepth = depths.reduce((s, v) => s + v, 0);
  const calc = analysis && typeof legend.calculate === 'function'
    ? legend.calculate(analysis, totalDepth)
    : null;
  let appliedVolumeHtml = '';
  let extraHtml = '';
  if (calc && calc.mlPerM3 > 0) {
    const cycleLiters = calc.mlPerM3 * totalDepth / 1000;
    appliedVolumeHtml = lang === 'en'
      ? ('For the cycle irrigation depth (' + fertiAcidLaminaQty(totalDepth) + '): <strong>' + fertiAcidDoseHaQty(cycleLiters) + '</strong>. ')
      : ('Para la lámina del ciclo (' + fertiAcidLaminaQty(totalDepth) + '): <strong>' + fertiAcidDoseHaQty(cycleLiters) + '</strong>. ');
    if (!(totalDepth > 0)) {
      extraHtml = '<p class="hydro-acid-summary-body" style="margin-top:6px;">' +
        (lang === 'en'
          ? 'Enter the irrigation depth of each period below so the program can calculate acid per hectare.'
          : 'Captura abajo la lámina de cada periodo para calcular el ácido por hectárea.') +
        '</p>';
    }
  }
  wrap.innerHTML = legend.buildHtml({
    lang: lang,
    analysis: analysis,
    hydroVolumeM3: totalDepth,
    linked: !!fertiWaterAnalysisId,
    classPrefix: 'hydro',
    wrap: false,
    hideAnalysisVolume: true,
    appliedVolumeHtml: appliedVolumeHtml,
    extraHtml: extraHtml
  });
}

/**
 * Análisis de agua → aporte por agua en SI (kg/ha), forma óxido.
 * kg = ppm × vol / 1000.
 * vol = lámina total del ciclo (suma de etapas en Programa) si > 0;
 * si no, el volumen de referencia del análisis (m3Riego).
 */
function fertiWaterContributionFromAguaAnalysis(analysis, volumeM3ha) {
  const m3Analysis = parseFloat(analysis && analysis.m3Riego);
  const m3Lamina = parseFloat(volumeM3ha);
  const vol = Number.isFinite(m3Lamina) && m3Lamina > 0
    ? m3Lamina
    : (Number.isFinite(m3Analysis) && m3Analysis > 0 ? m3Analysis : 0);
  const kgFromPpm = (ppm) => {
    const p = parseFloat(ppm);
    if (!vol || !Number.isFinite(p)) return 0;
    return (p * vol) / 1000;
  };
  const cations = (analysis && analysis.cations) || {};
  const anions = (analysis && analysis.anions) || {};
  const micros = (analysis && analysis.micros) || {};
  const kgK = kgFromPpm(cations.k_ppm);
  const kgCa = kgFromPpm(cations.ca_ppm);
  const kgMg = kgFromPpm(cations.mg_ppm);
  const kgP = kgFromPpm(anions.po4_ppm);
  const kgS = kgFromPpm(anions.so4_ppm); // so4_ppm → kg S elemental (como en awUpdateKgOxide)
  return {
    N: kgFromPpm(anions.no3_ppm),
    P2O5: kgP * FERTI_CONV.P2O5_TO_P,
    K2O: kgK * FERTI_CONV.K2O_TO_K,
    CaO: kgCa * FERTI_CONV.CaO_TO_Ca,
    MgO: kgMg * FERTI_CONV.MgO_TO_Mg,
    S: 0,
    SO4: kgS * FERTI_CONV.SO4_TO_S,
    Fe: kgFromPpm(micros.fe),
    Mn: kgFromPpm(micros.mn),
    B: kgFromPpm(micros.b),
    Zn: kgFromPpm(micros.zn),
    Cu: kgFromPpm(micros.cu),
    Mo: kgFromPpm(micros.mo),
    SiO2: kgFromPpm(micros.si) * FERTI_CONV.SiO2_TO_Si,
    Cl: kgFromPpm(anions.cl_ppm)
  };
}

function fertiRefreshWaterAnalysisSelect() {
  const select = document.getElementById('fertiImportWaterSelect');
  if (!select) return;
  const previous = select.value;
  const list = fertiGetProjectWaterAnalyses();
  // Placeholder = “elige uno”; el verbo “Traer” va en la etiqueta al lado.
  const placeholder = fertProgT('select_water_analysis', 'Seleccionar análisis…');
  let html = `<option value="">${fertiEscapeAttr(placeholder)}</option>`;
  if (!list.length) {
    html += `<option value="" disabled>${fertiEscapeAttr(fertProgT('no_water_analyses', 'Sin análisis de agua en este proyecto'))}</option>`;
  } else {
    html += list.map((analysis, index) => {
      const id = fertiEscapeAttr(analysis && analysis.id ? analysis.id : ('idx_' + index));
      const label = fertiEscapeAttr(fertiWaterAnalysisLabel(analysis, index));
      return `<option value="${id}">${label}</option>`;
    }).join('');
  }
  select.innerHTML = html;
  const selectedId = previous || fertiWaterAnalysisId || '';
  if (selectedId && list.some(a => a && a.id === selectedId)) select.value = selectedId;
  else select.value = '';
  select.title = fertProgT(
    'bring_from_analysis_title',
    'Elige un análisis: se cargan sus kg/ha y la dosis de ácido'
  );
  select.classList.toggle('is-linked', !!(select.value));
  const labelEl = select.closest('.hydro-import-water-wrap')
    && select.closest('.hydro-import-water-wrap').querySelector('.hydro-import-water-label');
  if (labelEl) {
    labelEl.textContent = select.value
      ? fertProgT('linked_water_analysis', 'Análisis vinculado')
      : fertProgT('bring_from_analysis', 'Traer de análisis');
  }
  fertiRenderLinkedAnalysisLamina();
}

function fertiRenderLinkedAnalysisLamina() {
  const el = document.getElementById('fertiLinkedWaterLamina');
  if (!el) return;
  const analysis = fertiGetLinkedWaterAnalysis();
  if (!analysis) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  const m3 = parseFloat(analysis.m3Riego);
  const qty = Number.isFinite(m3) && m3 > 0
    ? fertProgQuantity(m3, 'volume_area')
    : '—';
  el.hidden = false;
  el.textContent = fertProgT('analysis_cycle_lamina', 'Lámina total (análisis)') + ': ' + qty;
}

function fertiCycleLaminaM3ha() {
  return fertiAcidWaterDepths().reduce((s, v) => s + v, 0);
}

function fertiRefreshLinkedWaterKgFromLamina() {
  if (!fertiWaterAnalysisId) return false;
  const analysis = fertiGetLinkedWaterAnalysis();
  if (!analysis) return false;
  fertiWaterContributionOxide = Object.assign(
    {},
    fertiWaterContributionOxide,
    fertiWaterContributionFromAguaAnalysis(analysis, fertiCycleLaminaM3ha())
  );
  fertiNotifyDistributionCreditsChanged();
  return true;
}
window.fertiRefreshLinkedWaterKgFromLamina = fertiRefreshLinkedWaterKgFromLamina;

function fertiApplyWaterAnalysisById(analysisId) {
  if (!analysisId) return false;
  const list = fertiGetProjectWaterAnalyses();
  const analysis = list.find(a => a && a.id === analysisId);
  if (!analysis) return false;
  fertiWaterAnalysisId = analysisId;
  fertiWaterContributionOxide = Object.assign(
    {},
    fertiWaterContributionOxide,
    fertiWaterContributionFromAguaAnalysis(analysis, fertiCycleLaminaM3ha())
  );
  fertiMarkGenerationInputsChanged();
  markFertiProgDirty();
  try { fertiSyncProgramAcidFromLamina(); } catch (eAcid) {}
  updateFertiSummary();
  fertiRefreshWaterAnalysisSelect();
  try { fertiRenderAcidSummary(); } catch (e) {}
  try { renderFertiWeeks(); } catch (eWeeks) {}
  try { if (typeof saveFertirriegoProgram === 'function') saveFertirriegoProgram(); } catch (e) {}
  if (window.showMessage) {
    const legend = window.NpHydroAcidLegend;
    const calc = legend && typeof legend.calculate === 'function' ? legend.calculate(analysis, 0) : null;
    if (calc && calc.mlPerM3 > 0) {
      const acidName = fertiUiLang() === 'en'
        ? ((calc.acid && calc.acid.nameEn) || calc.acidId)
        : ((calc.acid && calc.acid.nameEs) || calc.acidId);
      window.showMessage(
        fertProgT('water_acid_loaded', 'Agua y ácido cargados: {acid} · {dose} mL/m³')
          .replace('{acid}', acidName)
          .replace('{dose}', calc.mlPerM3.toFixed(2)),
        'success'
      );
    } else {
      window.showMessage(
        fertProgT('water_loaded_no_acid', 'Kg/ha del agua cargados. Este análisis no tiene dosis de ácido calculable (HCO₃⁻/CO₃²⁻).'),
        'warning'
      );
    }
  }
  return true;
}

function fertiGetProjectGranularProgram() {
  const pid = fertiGetUnifiedProjectId();
  if (!pid) return null;
  try {
    if (window.projectStorage && typeof window.projectStorage.loadSection === 'function') {
      const section = window.projectStorage.loadSection('granular', pid);
      if (section && section.program && Array.isArray(section.program.applications)) return section.program;
    }
  } catch (e) {}
  try {
    const raw = localStorage.getItem(`nutriplant_project_${pid}`);
    if (raw) {
      const project = JSON.parse(raw);
      const program = project && project.granular && project.granular.program;
      if (program && Array.isArray(program.applications)) return program;
    }
  } catch (e) {}
  try {
    if (window.projectManager && typeof window.projectManager.loadProjectData === 'function') {
      const program = window.projectManager.loadProjectData('nutricionGranular');
      if (program && Array.isArray(program.applications)) return program;
    }
  } catch (e) {}
  try {
    const raw = localStorage.getItem(`nutricionGranularData_${pid}`);
    if (raw) {
      const program = JSON.parse(raw);
      if (program && Array.isArray(program.applications)) return program;
    }
  } catch (e) {}
  return null;
}

function fertiRefreshGranularProgramSelect() {
  const select = document.getElementById('fertiImportGranularSelect');
  if (!select) return;
  const program = fertiGetProjectGranularProgram();
  const count = program && Array.isArray(program.applications) ? program.applications.length : 0;
  let html = `<option value="">${fertiEscapeAttr(fertProgT('select_granular_program', 'Seleccionar programa…'))}</option>`;
  if (count > 0) {
    const crop = program.cropSnapshot && program.cropSnapshot.cropLabel
      ? String(program.cropSnapshot.cropLabel).trim()
      : '';
    const label = fertProgT('granular_program_option', 'Programa granular ({count} aplicaciones)')
      .replace('{count}', String(count));
    html += `<option value="current">${fertiEscapeAttr(crop ? `${label} · ${crop}` : label)}</option>`;
  } else {
    html += `<option value="" disabled>${fertiEscapeAttr(fertProgT('no_granular_program', 'Sin programa granular guardado en este proyecto'))}</option>`;
  }
  select.innerHTML = html;
  select.value = fertiGranularProgramLinked && count > 0 ? 'current' : '';
  select.classList.toggle('is-linked', select.value === 'current');
  const labelEl = select.closest('.hydro-import-water-wrap')
    && select.closest('.hydro-import-water-wrap').querySelector('.hydro-import-water-label');
  if (labelEl) {
    labelEl.textContent = select.value === 'current'
      ? fertProgT('linked_granular_program', 'Programa granular vinculado')
      : fertProgT('bring_from_granular_program', 'Traer de programa granular');
  }
}

function fertiApplyGranularProgram() {
  const program = fertiGetProjectGranularProgram();
  const ui = fertProgUI();
  if (!program || !Array.isArray(program.applications) || !program.applications.length ||
      !ui || typeof ui.aggregateGranularProgramContribution !== 'function') return false;
  fertiBaseContributionOxide = {
    ...fertiBaseContributionOxide,
    ...ui.aggregateGranularProgramContribution(program)
  };
  fertiGranularProgramLinked = true;
  fertiMarkGenerationInputsChanged();
  markFertiProgDirty();
  updateFertiSummary();
  try { saveFertirriegoProgram(); } catch (e) {}
  return true;
}

function initFertiWaterInputs() {
  if (fertiWaterInputsBound) return;
  fertiWaterInputsBound = true;
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el || !el.id) return;
    const isWater = el.id.startsWith('fertiWater');
    const isBase = el.id.startsWith('fertiBase');
    if (!isWater && !isBase) return;
    const key = el.id.replace(isWater ? 'fertiWater' : 'fertiBase', '');
    if (!key) return;
    let v = parseFloat(el.value);
    if (isNaN(v)) v = 0;
    v = fertProgToSI(v, 'dose_mass_area');
    const oxideVal = fertiWaterToOxide(key, v);
    const target = isWater ? fertiWaterContributionOxide : fertiBaseContributionOxide;
    if (target[key] !== oxideVal) {
      target[key] = oxideVal;
      fertiMarkGenerationInputsChanged();
      markFertiProgDirty();
      updateFertiSummary();
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el) return;
    if (el.id === 'fertiImportGranularSelect') {
      fertiGranularProgramLinked = el.value === 'current';
      if (!fertiGranularProgramLinked) {
        fertiMarkGenerationInputsChanged();
        markFertiProgDirty();
        fertiRefreshGranularProgramSelect();
        updateFertiSummary();
        return;
      }
      if (!fertiApplyGranularProgram() && window.showMessage) {
        window.showMessage(
          fertProgT('no_granular_program', 'No se encontró un programa granular guardado en este proyecto.'),
          'warning'
        );
      }
      return;
    }
    if (el.id !== 'fertiImportWaterSelect') return;
    const analysisId = el.value;
    el.classList.toggle('is-linked', !!analysisId);
    const labelEl = el.closest('.hydro-import-water-wrap')
      && el.closest('.hydro-import-water-wrap').querySelector('.hydro-import-water-label');
    if (labelEl) {
      labelEl.textContent = analysisId
        ? fertProgT('linked_water_analysis', 'Análisis vinculado')
        : fertProgT('bring_from_analysis', 'Traer de análisis');
    }
    if (!analysisId) {
      fertiWaterAnalysisId = null;
      markFertiProgDirty();
      try { fertiRenderAcidSummary(); } catch (err) {}
      try { fertiRenderLinkedAnalysisLamina(); } catch (err) {}
      try { if (typeof saveFertirriegoProgram === 'function') saveFertirriegoProgram(); } catch (err) {}
      return;
    }
    const ok = fertiApplyWaterAnalysisById(analysisId);
    if (!ok && window.showMessage) {
      window.showMessage(
        fertProgT('water_analysis_not_found', 'No se encontró ese análisis de agua.'),
        'warning'
      );
    }
  });
  fertiRefreshWaterAnalysisSelect();
  fertiRefreshGranularProgramSelect();
}

// ===== Gráficas (Chart.js) =====
const FERTI_ION_EQ_WEIGHTS = { N_NO3: 14.0, N_NH4: 14.0, P: 31.0, SO4: 16.03, Cl: 35.45, K: 39.1, Ca: 20.04, Mg: 12.15 };

function fertiCaptureDoseSnapshot() {
  return fertiWeeks.map(w => ({
    id: w.id,
    kgByCol: { ...(w.kgByCol || {}) }
  }));
}

function fertiApplyDoseSnapshot(snapshot) {
  if (!Array.isArray(snapshot)) return false;
  const byId = {};
  snapshot.forEach(item => { if (item && item.id) byId[item.id] = item.kgByCol || {}; });
  let applied = false;
  fertiWeeks.forEach(w => {
    if (!Object.prototype.hasOwnProperty.call(byId, w.id)) return;
    w.kgByCol = { ...byId[w.id] };
    computeWeekTotals(w);
    applied = true;
  });
  if (!applied) return false;
  renderFertiWeeks();
  updateFertiSummary();
  updateFertiCharts();
  markFertiProgDirty();
  return true;
}

function fertiSetChartEditNotice(message, kind) {
  const notice = document.getElementById('fertiChartEditNotice');
  if (!notice) return;
  notice.textContent = message || '';
  notice.classList.toggle('is-visible', !!message);
  notice.style.borderColor = kind === 'warning' ? '#f59e0b' : '#93c5fd';
  notice.style.background = kind === 'warning' ? '#fffbeb' : '#eff6ff';
  notice.style.color = kind === 'warning' ? '#92400e' : '#1e3a8a';
}

function updateFertiChartEditControls() {
  const wrap = document.querySelector('#graficas .charts-container');
  if (wrap) {
    wrap.classList.toggle('is-chart-editing', fertiChartEditMode);
    if (!fertiChartEditMode) wrap.classList.remove('is-chart-dragging');
  }
  const plot = document.getElementById('fertiChartsTernaryPlot');
  if (plot) plot.classList.toggle('is-ternary-editable', !!fertiChartEditMode);
  const hint = document.querySelector('#fertiChartsTernaryPlot .hydro-tern-drag-hint');
  if (hint) {
    hint.textContent = fertiChartEditMode
      ? fertProgT('ternary_drag_hint', 'Arrastra el cuadrado amarillo (aniones) o el círculo rojo (cationes): se actualizan las dosis de fertilizante de esta etapa, luego % meq, meq/L, ppm y CE.')
      : fertProgT('ternary_edit_help', 'Pulsa «Ajustar en triángulo» para arrastrar el cuadrado o el círculo y rebalancear las dosis de esta etapa.');
  }
  document.querySelectorAll('[data-ferti-chart-edit="toggle"]').forEach((btn) => {
    const ternary = btn.getAttribute('data-ferti-edit-surface') === 'ternary';
    btn.textContent = fertiChartEditMode
      ? fertProgT('finish_chart_adjustment', '✓ Terminar ajuste')
      : (ternary
        ? fertProgT('adjust_ternary', '✋ Ajustar en triángulo')
        : fertProgT('adjust_chart', '✋ Ajustar en gráfica'));
    btn.classList.toggle('btn-primary', fertiChartEditMode);
    btn.classList.toggle('btn-secondary', !fertiChartEditMode);
  });
  const canUndo = !!fertiChartUndoSnapshot;
  document.querySelectorAll('[data-ferti-chart-edit="undo"]').forEach((undoBtn) => {
    undoBtn.textContent = fertProgT('undo', '↶ Deshacer');
    undoBtn.disabled = !canUndo;
    undoBtn.hidden = !canUndo;
    undoBtn.style.display = canUndo ? '' : 'none';
  });
  const canRestore = !!(fertiChartEditMode && fertiChartEditBaseline && fertiChartUndoSnapshot);
  document.querySelectorAll('[data-ferti-chart-edit="restore"]').forEach((restoreBtn) => {
    restoreBtn.textContent = fertProgT('restore_original', 'Restaurar original');
    restoreBtn.disabled = !canRestore;
    restoreBtn.hidden = !canRestore;
    restoreBtn.style.display = canRestore ? '' : 'none';
  });
  if (fertiChartEditMode) {
    fertiSetChartEditNotice(
      fertProgT('chart_drag_help', 'Arrastra un punto de la curva o el cuadrado/círculo del triángulo. Se recalcularán los fertilizantes, aportes, ppm, meq/L y relaciones. Usa 🔒 en la tabla para inmovilizar un fertilizante.')
    );
  } else {
    fertiSetChartEditNotice('');
  }
}

function toggleFertiChartEditMode() {
  fertiChartEditMode = !fertiChartEditMode;
  fertiActiveChartDrag = null;
  fertiTernDrag = null;
  if (fertiChartEditMode) fertiChartEditBaseline = fertiCaptureDoseSnapshot();
  updateFertiChartEditControls();
}

function fertiIsWaterAcidMaterialId(materialId) {
  const acid = fertiGeneratorAcidInput();
  return !!(acid && acid.materialId && String(materialId || '') === String(acid.materialId));
}

function fertiIsWaterAcidColumn(col) {
  return !!(col && fertiIsWaterAcidMaterialId(col.materialId));
}

function fertiWaterAcidColumnIds() {
  return (fertiColumns || []).filter(fertiIsWaterAcidColumn).map(c => c.id);
}

function fertiEnsureWaterAcidColumnsLocked() {
  let changed = false;
  fertiWaterAcidColumnIds().forEach(id => {
    if (fertiChartLockedColumnIds.indexOf(id) === -1) {
      fertiChartLockedColumnIds.push(id);
      changed = true;
    }
  });
  return changed;
}

function fertiIsChartColumnLocked(colId) {
  if (fertiChartLockedColumnIds.indexOf(colId) !== -1) return true;
  const col = (fertiColumns || []).find(c => c && c.id === colId);
  return fertiIsWaterAcidColumn(col);
}

function fertiAcidLitersHaFromDepth(mlPerM3, depthM3ha) {
  const ui = fertProgUI();
  if (ui && typeof ui.acidLitersHa === 'function') return ui.acidLitersHa(mlPerM3, depthM3ha);
  return Math.max(0, Number(mlPerM3) || 0) * Math.max(0, Number(depthM3ha) || 0) / 1000;
}

function fertiSyncProgramAcidFromLamina() {
  fertiEnsureWaterAcidColumnsLocked();
  const acid = fertiGeneratorAcidInput();
  const cols = (fertiColumns || []).filter(c => acid && c.materialId === acid.materialId);
  if (!acid || !cols.length || !Array.isArray(fertiWeeks) || !fertiWeeks.length) return false;
  const depths = fertiAcidWaterDepths();
  let changed = false;
  fertiWeeks.forEach((week, i) => {
    if (!week.kgByCol) week.kgByCol = {};
    const litersHa = fertiAcidLitersHaFromDepth(acid.mlPerM3, depths[i] || 0);
    let weekChanged = false;
    cols.forEach(col => {
      const prev = Number(week.kgByCol[col.id]) || 0;
      if (Math.abs(prev - litersHa) > 1e-6) {
        week.kgByCol[col.id] = litersHa;
        weekChanged = true;
      }
    });
    if (weekChanged) {
      computeWeekTotals(week);
      changed = true;
    }
  });
  if (changed) {
    markFertiProgDirty();
    fertiMarkGenerationInputsChanged();
  }
  return changed;
}

function toggleFertiChartColumnLock(colId) {
  const col = (fertiColumns || []).find(c => c && c.id === colId);
  if (fertiIsWaterAcidColumn(col)) {
    fertiEnsureWaterAcidColumnsLocked();
    renderFertiWeeks();
    return;
  }
  const idx = fertiChartLockedColumnIds.indexOf(colId);
  if (idx === -1) fertiChartLockedColumnIds.push(colId);
  else fertiChartLockedColumnIds.splice(idx, 1);
  renderFertiWeeks();
  markFertiProgDirty();
}

function undoFertiChartAdjustment() {
  if (!fertiChartUndoSnapshot) return;
  const current = fertiCaptureDoseSnapshot();
  if (fertiApplyDoseSnapshot(fertiChartUndoSnapshot)) {
    fertiChartUndoSnapshot = current;
    updateFertiChartEditControls();
  }
}

function restoreFertiChartEditBaseline() {
  if (!fertiChartEditBaseline) return;
  fertiChartUndoSnapshot = fertiCaptureDoseSnapshot();
  if (fertiApplyDoseSnapshot(fertiChartEditBaseline)) updateFertiChartEditControls();
}

function fertiChartCanonicalTarget(nutrientKey, displayedValue) {
  let value = Math.max(0, fertProgToSI(displayedValue, 'dose_mass_area'));
  if (!fertiChartsElementalMode) return value;
  if (nutrientKey === 'P2O5') value *= FERTI_CONV.P2O5_TO_P;
  else if (nutrientKey === 'K2O') value *= FERTI_CONV.K2O_TO_K;
  else if (nutrientKey === 'CaO') value *= FERTI_CONV.CaO_TO_Ca;
  else if (nutrientKey === 'MgO') value *= FERTI_CONV.MgO_TO_Mg;
  else if (nutrientKey === 'SO4') value *= FERTI_CONV.SO4_TO_S;
  return value;
}

function fertiChartDisplayValue(nutrientKey, canonicalValue) {
  let value = parseFloat(canonicalValue) || 0;
  if (fertiChartsElementalMode) {
    if (nutrientKey === 'P2O5') value /= FERTI_CONV.P2O5_TO_P;
    else if (nutrientKey === 'K2O') value /= FERTI_CONV.K2O_TO_K;
    else if (nutrientKey === 'CaO') value /= FERTI_CONV.CaO_TO_Ca;
    else if (nutrientKey === 'MgO') value /= FERTI_CONV.MgO_TO_Mg;
    else if (nutrientKey === 'SO4') value /= FERTI_CONV.SO4_TO_S;
  }
  return parseFloat(fertProgResultFromSI(value, 'dose_mass_area', 8)) || 0;
}

function fertiNutrientCoefficient(materialId, nutrientKey) {
  const contrib = computeFertiContribFor(1, materialId);
  if (nutrientKey === 'N') return (parseFloat(contrib.N_NO3) || 0) + (parseFloat(contrib.N_NH4) || 0);
  return parseFloat(contrib[nutrientKey]) || 0;
}

function fertiAdjustStageNutrientCanonical(stageIndex, nutrientKey, canonicalTarget, baseAmounts) {
  const week = fertiWeeks[stageIndex];
  const ui = fertProgUI();
  if (!week || !ui || typeof ui.adjustBlendToTarget !== 'function') return { ok: false, reason: 'solver' };
  const amounts = fertiColumns.map((c, idx) => {
    if (Array.isArray(baseAmounts)) return Math.max(0, parseFloat(baseAmounts[idx]) || 0);
    return Math.max(0, parseFloat(week.kgByCol?.[c.id]) || 0);
  });
  const actualCoefficients = fertiColumns.map(c => fertiNutrientCoefficient(c.materialId, nutrientKey));
  const coefficients = actualCoefficients.map((value, idx) => (
    fertiIsChartColumnLocked(fertiColumns[idx].id) ? 0 : value
  ));
  canonicalTarget = Math.max(0, parseFloat(canonicalTarget) || 0);
  const lockedContribution = amounts.reduce((sum, amount, idx) => (
    coefficients[idx] === 0 ? sum + amount * actualCoefficients[idx] : sum
  ), 0);
  const variableTarget = canonicalTarget - lockedContribution;
  const currentTarget = amounts.reduce((sum, amount, idx) => sum + amount * actualCoefficients[idx], 0);
  if (variableTarget < -1e-7) return { ok: false, reason: 'locked-minimum', achieved: currentTarget };
  if (!coefficients.some(v => v > 0)) {
    return { ok: Math.abs(currentTarget - canonicalTarget) < 1e-7, reason: 'no-source', achieved: currentTarget };
  }
  const result = ui.adjustBlendToTarget(amounts, coefficients, Math.max(0, variableTarget));
  if (!result.reachable) return { ok: false, reason: 'unreachable', achieved: result.achieved };
  if (!week.kgByCol) week.kgByCol = {};
  fertiColumns.forEach((c, idx) => { week.kgByCol[c.id] = Math.max(0, result.values[idx]); });
  computeWeekTotals(week);
  return { ok: true, achieved: result.achieved + lockedContribution, target: canonicalTarget };
}

function fertiAdjustStageNutrient(stageIndex, nutrientKey, displayedTarget, baseAmounts) {
  return fertiAdjustStageNutrientCanonical(
    stageIndex,
    nutrientKey,
    fertiChartCanonicalTarget(nutrientKey, displayedTarget),
    baseAmounts
  );
}

function fertiApplyDistributionTargetsToProgram(nutrientKey, oxideKgByStage, opts) {
  if (!Array.isArray(fertiWeeks) || !Array.isArray(oxideKgByStage)) return false;
  if (!fertiWeeks.length || fertiWeeks.length !== oxideKgByStage.length) return false;
  if (!fertiColumns.length) return false;
  oxideKgByStage.forEach((kg, index) => {
    fertiAdjustStageNutrientCanonical(index, nutrientKey, kg);
  });
  if (!(opts && opts.silent)) fertiFlushDistributionProgramPaint();
  return true;
}
window.fertiApplyDistributionTargetsToProgram = fertiApplyDistributionTargetsToProgram;

function fertiFlushDistributionProgramPaint() {
  renderFertiWeeks();
  updateFertiSummary();
  updateFertiCharts();
  markFertiProgDirty();
}
window.fertiFlushDistributionProgramPaint = fertiFlushDistributionProgramPaint;

function fertiApplyLiveDistributionToExistingProgram() {
  const state = fertiGeneratorDistributionState();
  if (!state || !Array.isArray(state.stages) || !Array.isArray(fertiWeeks)) return false;
  if (!fertiWeeks.length || state.stages.length !== fertiWeeks.length || !fertiColumns.length) return false;
  const keys = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
  keys.forEach(key => {
    const oxideKg = fertiWeeks.map((_, i) => Number(fertiGeneratorTargetMap(state, i)[key]) || 0);
    oxideKg.forEach((kg, index) => {
      fertiAdjustStageNutrientCanonical(index, key, kg);
    });
  });
  fertiFlushDistributionProgramPaint();
  return true;
}

function fertiDistIsDrivingProgram(dist) {
  if (window._fertiDistKeepSuggestedPct) return false;
  if (window._fertiDistDrivesProgram === true) return true;
  if (typeof window.fertiDistDrivesProgram === 'function' && window.fertiDistDrivesProgram()) return true;
  return !!(dist && dist.drivesProgram === true);
}

function fertiDistributionSplitFromProgram(opts) {
  if (!Array.isArray(fertiWeeks) || !fertiWeeks.length) return null;
  const fertilizerOnly = !!(opts && opts.fertilizerOnly);
  const state = fertilizerOnly ? null : fertiGeneratorDistributionState();
  const solver = window.NpFertigationProgramGenerator;
  let waterByStage = fertiWeeks.map(() => ({}));
  let baseByStage = fertiWeeks.map(() => ({}));
  if (!fertilizerOnly && state && solver && state.stages.length === fertiWeeks.length) {
    const targets = state.stages.map((_, i) => fertiGeneratorTargetMap(state, i));
    const depths = fertiProgramWaterDepths(state.stages.length);
    const water = solver.proportionalWater(fertiGeneratorWaterMap(), depths);
    if (water.ok) waterByStage = water.byStage;
    baseByStage = solver.proportionalBase(fertiGeneratorBaseMap(), targets);
  }
  const getters = {
    n: (week) => (Number(week.totals && week.totals.N_NO3) || 0) + (Number(week.totals && week.totals.N_NH4) || 0),
    p: (week) => Number(week.totals && week.totals.P2O5) || 0,
    k: (week) => Number(week.totals && week.totals.K2O) || 0,
    ca: (week) => Number(week.totals && week.totals.CaO) || 0,
    mg: (week) => Number(week.totals && week.totals.MgO) || 0,
    s: (week) => Number(week.totals && week.totals.SO4) || 0,
    fe: (week) => Number(week.totals && week.totals.Fe) || 0,
    mn: (week) => Number(week.totals && week.totals.Mn) || 0,
    b: (week) => Number(week.totals && week.totals.B) || 0,
    zn: (week) => Number(week.totals && week.totals.Zn) || 0,
    cu: (week) => Number(week.totals && week.totals.Cu) || 0,
    mo: (week) => Number(week.totals && week.totals.Mo) || 0,
    si: (week) => Number(week.totals && week.totals.SiO2) || 0
  };
  const externalKeys = {
    n:'N', p:'P2O5', k:'K2O', ca:'CaO', mg:'MgO', s:'SO4',
    fe:'Fe', mn:'Mn', b:'B', zn:'Zn', cu:'Cu', mo:'Mo', si:'SiO2'
  };
  const splits = {};
  Object.keys(getters).forEach(id => {
    const key = externalKeys[id];
    const vals = fertiWeeks.map((week, index) => (
      getters[id](week) +
      (fertilizerOnly ? 0 : (Number(waterByStage[index]?.[key]) || 0)) +
      (fertilizerOnly ? 0 : (Number(baseByStage[index]?.[key]) || 0))
    ));
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum <= 1e-9) return;
    let acc = 0;
    splits[id] = vals.map((v, i) => {
      if (i === vals.length - 1) return Math.round((100 - acc) * 10) / 10;
      const p = Math.round((v / sum) * 1000) / 10;
      acc += p;
      return p;
    });
  });
  return splits;
}

function fertiPushProgramSplitToDistribution() {
  if (typeof window.fertiDistApplyProgramNutrientSplit !== 'function') return;
  const splits = fertiDistributionSplitFromProgram({ fertilizerOnly: true });
  if (splits) window.fertiDistApplyProgramNutrientSplit(splits);
}

function fertiProgramLayoutForDistribution() {
  if (!Array.isArray(fertiWeeks) || !fertiWeeks.length) return null;
  fertiWeeks.forEach(w => computeWeekTotals(w));
  if (!fertiGeneratorHasProgramDoses()) return null;
  const splits = fertiDistributionSplitFromProgram({ fertilizerOnly: true });
  if (!splits) return null;
  const depths = Array.isArray(fertiChartWaterByStageM3ha) ? fertiChartWaterByStageM3ha : [];
  return {
    axis: getFertiTimeUnit(),
    stages: fertiWeeks.map((week, i) => String(week && week.stage || week && week.label || ('Etapa ' + (i + 1)))),
    splits: splits,
    waterDepths: fertiWeeks.map((_, i) => Math.max(0, Number(depths[i]) || 0)),
    periodCount: fertiWeeks.length
  };
}

function fertiDistSplitDiffersFromProgram(dist, layout) {
  if (!dist || !layout || !layout.splits) return true;
  const stages = Array.isArray(dist.stages) ? dist.stages : [];
  if (stages.length !== layout.periodCount) return true;
  const macros = ['n', 'p', 'k', 'ca', 'mg', 's'];
  const tol = 1.2;
  for (let i = 0; i < macros.length; i++) {
    const id = macros[i];
    const want = layout.splits[id];
    const have = dist.pct && dist.pct[id];
    if (!Array.isArray(want) || want.length !== layout.periodCount) continue;
    if (!Array.isArray(have) || have.length !== layout.periodCount) return true;
    for (let j = 0; j < want.length; j++) {
      if (Math.abs((Number(have[j]) || 0) - (Number(want[j]) || 0)) > tol) return true;
    }
  }
  return false;
}

function fertiAdoptDistributionFromProgram(opts) {
  const layout = fertiProgramLayoutForDistribution();
  const dist = fertiGeneratorDistributionState();
  if (opts && opts.auto) {
    if (window._fertiDistKeepSuggestedPct || window._fertiDistStructureEdited) return false;
    if (fertiDistIsDrivingProgram(dist)) {
      return fertiApplyLiveDistributionToExistingProgram();
    }
    if (!layout || typeof window.fertiDistAdoptFromProgram !== 'function') return false;
    if (!fertiDistSplitDiffersFromProgram(dist, layout)) return false;
  } else {
    window._fertiDistKeepSuggestedPct = false;
    window._fertiDistDrivesProgram = false;
    if (!layout || typeof window.fertiDistAdoptFromProgram !== 'function') return false;
  }
  return window.fertiDistAdoptFromProgram(layout);
}
window.fertiAdoptDistributionFromProgram = fertiAdoptDistributionFromProgram;

function fertiRefreshChartsAfterGraphAdjustment() {
  fertiWeeks.forEach(w => computeWeekTotals(w));
  [fertiMacroChart, fertiMicroChart].forEach(chart => {
    if (!chart || !chart.data || !Array.isArray(chart.data.datasets)) return;
    chart.data.datasets.forEach(ds => {
      const key = ds._fertiNutrientKey;
      if (!key) return;
      ds.data = fertiWeeks.map(w => fertiChartDisplayValue(key, w.totals?.[key] || 0));
    });
    try { chart.update('none'); } catch (e) { chart.update(); }
  });
  renderFertiChartsInsights();
}

function fertiBindChartPointDragging(canvas, getChart) {
  if (!canvas || canvas._fertiPointDragBound) return;
  canvas._fertiPointDragBound = true;
  canvas.addEventListener('pointerdown', function (event) {
    if (!fertiChartEditMode) return;
    const chart = getChart();
    if (!chart || typeof chart.getElementsAtEventForMode !== 'function') return;
    const hits = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
    if (!hits || !hits.length) return;
    const hit = hits[0];
    const dataset = chart.data.datasets[hit.datasetIndex];
    if (!dataset || !dataset._fertiNutrientKey || !fertiWeeks[hit.index]) return;
    const week = fertiWeeks[hit.index];
    fertiActiveChartDrag = {
      chart,
      canvas,
      datasetIndex: hit.datasetIndex,
      stageIndex: hit.index,
      nutrientKey: dataset._fertiNutrientKey,
      before: fertiCaptureDoseSnapshot(),
      baseAmounts: fertiColumns.map(c => Math.max(0, parseFloat(week.kgByCol?.[c.id]) || 0))
    };
    fertiChartSelectedStageIndex = hit.index;
    try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
    const wrap = document.querySelector('#graficas .charts-container');
    if (wrap) wrap.classList.add('is-chart-dragging');
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', function (event) {
    const drag = fertiActiveChartDrag;
    if (!drag || drag.canvas !== canvas) return;
    const rect = canvas.getBoundingClientRect();
    const yPixel = event.clientY - rect.top;
    const scale = drag.chart && drag.chart.scales && drag.chart.scales.y;
    if (!scale || typeof scale.getValueForPixel !== 'function') return;
    const displayedTarget = Math.max(0, scale.getValueForPixel(yPixel));
    const result = fertiAdjustStageNutrient(drag.stageIndex, drag.nutrientKey, displayedTarget, drag.baseAmounts);
    if (!result.ok) {
      fertiSetChartEditNotice(
        fertProgT('chart_adjust_no_source', 'No se puede alcanzar ese punto con los fertilizantes desbloqueados. Agrega una fuente del nutriente o desbloquea un producto.'),
        'warning'
      );
      return;
    }
    fertiRefreshChartsAfterGraphAdjustment();
    const shownAchieved = fertiChartDisplayValue(drag.nutrientKey, result.achieved);
    fertiSetChartEditNotice(
      `${fertiStageSlotLabel(drag.stageIndex)} · ${drag.chart.data.datasets[drag.datasetIndex].label}: ${fertiNum(shownAchieved, isFertiMicroNutrient(drag.nutrientKey) ? 3 : 2)} ${fertProgUnit('dose_mass_area', 'kg/ha')}`
    );
    event.preventDefault();
  });
  const finish = function (event) {
    const drag = fertiActiveChartDrag;
    if (!drag || drag.canvas !== canvas) return;
    fertiChartUndoSnapshot = drag.before;
    fertiActiveChartDrag = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (e) {}
    const wrap = document.querySelector('#graficas .charts-container');
    if (wrap) wrap.classList.remove('is-chart-dragging');
    renderFertiWeeks();
    updateFertiSummary();
    updateFertiCharts();
    markFertiProgDirty();
    updateFertiChartEditControls();
    fertiPushProgramSplitToDistribution();
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}

function fertiAnionRangesText() {
  return fertProgT('anions_ranges', 'Aniones: N-NO₃⁻ 20-80, P-H₂PO₄⁻ 1.25-10, S-SO₄²⁻ 10-70');
}
function fertiCationRangesText() {
  return fertProgT('cations_ranges', 'Cationes: K⁺ 10-65, Ca²⁺ 22.5-62.5, Mg²⁺ 0.5-40');
}

function fertiNormalizeChartWaterByStage() {
  const n = Array.isArray(fertiWeeks) ? fertiWeeks.length : 0;
  let arr = Array.isArray(fertiChartWaterByStageM3ha) ? fertiChartWaterByStageM3ha.slice(0, n) : [];
  while (arr.length < n) arr.push(0);
  try {
    const dist = fertiGeneratorDistributionState();
    if (dist && Array.isArray(dist.waterDepthByStageM3ha) && dist.waterDepthByStageM3ha.length) {
      for (let i = 0; i < n; i++) {
        const chartVal = Math.max(0, parseFloat(arr[i]) || 0);
        const distVal = Math.max(0, Number(dist.waterDepthByStageM3ha[i]) || 0);
        arr[i] = Math.max(chartVal, distVal);
      }
    }
  } catch (e) {}
  fertiChartWaterByStageM3ha = arr.map(v => Math.max(0, parseFloat(v) || 0));
  if (!Number.isInteger(fertiChartSelectedStageIndex)) fertiChartSelectedStageIndex = 0;
  if (n <= 0) fertiChartSelectedStageIndex = 0;
  else fertiChartSelectedStageIndex = Math.max(0, Math.min(fertiChartSelectedStageIndex, n - 1));
}

function fertiStageSlotLabel(i) {
  const unit = fertiTimeUnit === 'mes' ? fertProgT('month', 'Mes') : fertProgT('week', 'Semana');
  return `${unit} ${i + 1}`;
}

function fertiNum(v, d = 2) {
  const n = parseFloat(v);
  if (isNaN(n)) return (0).toFixed(d);
  return n.toFixed(d);
}

function onFertiChartStageSelect(idx) {
  fertiNormalizeChartWaterByStage();
  fertiChartSelectedStageIndex = Math.max(0, Math.min(parseInt(idx, 10) || 0, Math.max(0, fertiWeeks.length - 1)));
  renderFertiChartsInsights();
  markFertiProgDirty();
}

function fertiWaterStageSlots() {
  if (Array.isArray(fertiWeeks) && fertiWeeks.length) {
    return fertiWeeks.map((week, i) => ({
      i: i,
      stage: week.stage || '',
      label: fertiStageSlotLabel(i)
    }));
  }
  try {
    const state = fertiGeneratorDistributionState();
    if (state && Array.isArray(state.stages) && state.stages.length) {
      const unit = state.axis === 'mes' ? fertProgT('month', 'Mes') : fertProgT('week', 'Semana');
      return state.stages.map((name, i) => ({
        i: i,
        stage: name || '',
        label: unit + ' ' + (i + 1)
      }));
    }
  } catch (e) {}
  return [];
}

function fertiWaterInputWraps() {
  return Array.prototype.slice.call(document.querySelectorAll('.ferti-charts-water-wrap'));
}

function renderFertiChartWaterByStageInputs() {
  const wraps = fertiWaterInputWraps();
  if (!wraps.length) return;
  const slots = fertiWaterStageSlots();
  if (slots.length && (!Array.isArray(fertiWeeks) || !fertiWeeks.length)) {
    while (fertiChartWaterByStageM3ha.length < slots.length) fertiChartWaterByStageM3ha.push(0);
  } else {
    fertiNormalizeChartWaterByStage();
  }
  const unit = fertProgUnitToHtml('volume_area', 'm³/ha');
  const title = fertProgT('charts_water_title', 'Lámina de riego por etapa');
  wraps.forEach(function (wrap) {
    if (!slots.length) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }
    wrap.hidden = false;
    ensureFertiChartWaterBound(wrap);
    const active = document.activeElement;
    const editingHere = !!(active && wrap.contains(active) && active.getAttribute && active.getAttribute('data-ferti-chart-water') != null);
    const existing = wrap.querySelectorAll('[data-ferti-chart-water]');
    if (editingHere && existing.length === slots.length) {
      syncFertiChartWaterHighlight(wrap);
      return;
    }
    const isProgram = wrap.id === 'fertiProgramWaterByStageWrap';
    if (!isProgram) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }
    const note = fertProgT('program_water_help', 'Suma del ciclo = kg/ha del agua. Cada etapa = ácido. Dinámica usa esta lámina para ppm/meq.');
    wrap.innerHTML =
      '<div class="ferti-charts-water-head">' +
        '<h4 class="ferti-charts-water-title">' + title + ' (' + unit + ')</h4>' +
        '<p class="ferti-charts-water-note">' + note + '</p>' +
      '</div>' +
      '<div class="ferti-charts-water-grid">' +
        slots.map(function (slot) {
          const stageShown = slot.stage ? fertProgStage(slot.stage) : '';
          const shown = fertProgInputFromSI(fertiChartWaterByStageM3ha[slot.i] || 0, 'volume_area', 4);
          const current = slot.i === fertiChartSelectedStageIndex ? ' is-current' : '';
          return '<label class="ferti-charts-water-item' + current + '">' +
            '<span class="ferti-charts-water-period">' + fertiEscapeAttr(slot.label) + '</span>' +
            (stageShown ? '<span class="ferti-charts-water-stage">' + fertiEscapeAttr(stageShown) + '</span>' : '') +
            '<input type="number" min="0" step="0.0001" inputmode="decimal" size="5" data-ferti-chart-water="' + slot.i + '" value="' + fertiEscapeAttr(shown) + '">' +
          '</label>';
        }).join('') +
      '</div>';
  });
}

function syncFertiChartWaterHighlight(wrap) {
  const hosts = wrap ? [wrap] : fertiWaterInputWraps();
  hosts.forEach(function (host) {
    if (!host) return;
    const items = host.querySelectorAll('.ferti-charts-water-item');
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-current', i === fertiChartSelectedStageIndex);
    }
  });
}

function ensureFertiChartWaterBound(wrap) {
  if (!wrap || wrap.dataset.bound === '1') return;
  wrap.dataset.bound = '1';
  wrap.addEventListener('input', function (ev) {
    const el = ev.target;
    if (!el || !el.getAttribute || el.getAttribute('data-ferti-chart-water') == null) return;
    applyFertiChartWaterValue(parseInt(el.getAttribute('data-ferti-chart-water'), 10), el.value);
  });
}

function applyFertiChartWaterValue(i, displayValue) {
  fertiNormalizeChartWaterByStage();
  const slots = fertiWaterStageSlots();
  i = parseInt(i, 10);
  if (!isFinite(i) || i < 0 || i >= slots.length) return;
  while (fertiChartWaterByStageM3ha.length <= i) fertiChartWaterByStageM3ha.push(0);
  fertiChartWaterByStageM3ha[i] = Math.max(0, fertProgToSI(displayValue, 'volume_area') || 0);
  if (typeof window.fertiDistSetWaterByStage === 'function') {
    try { window.fertiDistSetWaterByStage(fertiChartWaterByStageM3ha.slice()); } catch (e) {}
  }
  if (typeof fertiRefreshLinkedWaterKgFromLamina === 'function') {
    try { fertiRefreshLinkedWaterKgFromLamina(); } catch (e2) {}
  }
  fertiMarkGenerationInputsChanged();
  markFertiProgDirty();
  const shown = fertProgInputFromSI(fertiChartWaterByStageM3ha[i] || 0, 'volume_area', 4);
  fertiWaterInputWraps().forEach(function (wrap) {
    if (document.activeElement && wrap.contains(document.activeElement)) return;
    const input = wrap.querySelector('[data-ferti-chart-water="' + i + '"]');
    if (input) input.value = shown;
  });
  try { fertiRenderAcidSummary(); } catch (eAcid) {}
  let acidChanged = false;
  try { acidChanged = !!fertiSyncProgramAcidFromLamina(); } catch (eSync) {}
  try { updateFertiSummary(); } catch (eSum) {}
  if (acidChanged) {
    renderFertiWeeks();
    try { if (typeof updateFertiCharts === 'function') updateFertiCharts(); } catch (eCh) {}
    try { fertiPushProgramSplitToDistribution(); } catch (ePush) {}
  } else {
    renderFertiChartsInsights();
  }
}

if (typeof window !== 'undefined') {
  window.fertiGetProgramWaterByStage = function () {
    return Array.isArray(fertiChartWaterByStageM3ha) ? fertiChartWaterByStageM3ha.slice() : [];
  };
}

function fertiKgFromStageTotals(totals) {
  const t = totals || {};
  const kgSFromSo4AndDirect = ((parseFloat(t.SO4) || 0) / FERTI_CONV.SO4_TO_S) + (parseFloat(t.S) || 0);
  return {
    N_NO3: parseFloat(t.N_NO3) || 0,
    N_NH4: parseFloat(t.N_NH4) || 0,
    P: parseFloat(t.P) || 0,
    SO4: kgSFromSo4AndDirect,
    Cl: parseFloat(t.Cl) || 0,
    K: parseFloat(t.K) || 0,
    Ca: parseFloat(t.Ca) || 0,
    Mg: parseFloat(t.Mg) || 0,
    Fe: parseFloat(t.Fe) || 0,
    Mn: parseFloat(t.Mn) || 0,
    B: parseFloat(t.B) || 0,
    Zn: parseFloat(t.Zn) || 0,
    Cu: parseFloat(t.Cu) || 0,
    Mo: parseFloat(t.Mo) || 0
  };
}

/** kg/ha elementales del aporte de agua (pestaña Programa de nutrición). N del agua = N-NO₃⁻ (gráficas). */
function getFertiWaterKgElemental(fertNo3, fertNh4, waterOxOverride) {
  const w = waterOxOverride || fertiWaterContributionOxide || {};
  const waterN = parseFloat(w.N) || 0;
  const kgSFromSo4AndDirect = ((parseFloat(w.SO4) || 0) / FERTI_CONV.SO4_TO_S) + (parseFloat(w.S) || 0);
  return {
    N_NO3: waterN,
    N_NH4: 0,
    P: (parseFloat(w.P2O5) || 0) / FERTI_CONV.P2O5_TO_P,
    SO4: kgSFromSo4AndDirect,
    Cl: parseFloat(w.Cl) || 0,
    K: (parseFloat(w.K2O) || 0) / FERTI_CONV.K2O_TO_K,
    Ca: (parseFloat(w.CaO) || 0) / FERTI_CONV.CaO_TO_Ca,
    Mg: (parseFloat(w.MgO) || 0) / FERTI_CONV.MgO_TO_Mg,
    Fe: parseFloat(w.Fe) || 0,
    Mn: parseFloat(w.Mn) || 0,
    B: parseFloat(w.B) || 0,
    Zn: parseFloat(w.Zn) || 0,
    Cu: parseFloat(w.Cu) || 0,
    Mo: parseFloat(w.Mo) || 0
  };
}

function fertiWaterContributionForStage(waterOx, depths, stageIndex) {
  const list = Array.isArray(depths) ? depths.map(v => Math.max(0, Number(v) || 0)) : [];
  const totalDepth = list.reduce((sum, value) => sum + value, 0);
  const factor = totalDepth > 0 ? (list[stageIndex] || 0) / totalDepth : 0;
  const out = {};
  Object.keys(waterOx || {}).forEach(key => { out[key] = (Number(waterOx[key]) || 0) * factor; });
  return out;
}

function fertiMergeKg(a, b) {
  const out = { ...a };
  Object.keys(b).forEach(k => { out[k] = (parseFloat(out[k]) || 0) + (parseFloat(b[k]) || 0); });
  return out;
}

function computeFertiIonicSummaryFromKg(kg, m3ha, stage) {
  if (m3ha <= 0) return { stage, m3ha, kg };
  const ppm = {};
  Object.keys(kg).forEach(k => { ppm[k] = (kg[k] * 1000) / m3ha; });
  const meq = {
    N_NO3: ppm.N_NO3 / FERTI_ION_EQ_WEIGHTS.N_NO3,
    N_NH4: ppm.N_NH4 / FERTI_ION_EQ_WEIGHTS.N_NH4,
    P: ppm.P / FERTI_ION_EQ_WEIGHTS.P,
    SO4: ppm.SO4 / FERTI_ION_EQ_WEIGHTS.SO4,
    Cl: ppm.Cl / FERTI_ION_EQ_WEIGHTS.Cl,
    K: ppm.K / FERTI_ION_EQ_WEIGHTS.K,
    Ca: ppm.Ca / FERTI_ION_EQ_WEIGHTS.Ca,
    Mg: ppm.Mg / FERTI_ION_EQ_WEIGHTS.Mg
  };
  const sumAnionsTriangle = meq.N_NO3 + meq.P + meq.SO4;
  const sumAnionsTotal = sumAnionsTriangle + meq.Cl;
  const sumCationsKCaMg = meq.K + meq.Ca + meq.Mg;
  const sumCationsTotal = sumCationsKCaMg + meq.N_NH4;
  const pct = {
    N_NO3: sumAnionsTriangle > 0 ? (meq.N_NO3 / sumAnionsTriangle) * 100 : 0,
    P: sumAnionsTriangle > 0 ? (meq.P / sumAnionsTriangle) * 100 : 0,
    SO4: sumAnionsTriangle > 0 ? (meq.SO4 / sumAnionsTriangle) * 100 : 0,
    Cl: sumAnionsTotal > 0 ? (meq.Cl / sumAnionsTotal) * 100 : 0,
    K: sumCationsKCaMg > 0 ? (meq.K / sumCationsKCaMg) * 100 : 0,
    Ca: sumCationsKCaMg > 0 ? (meq.Ca / sumCationsKCaMg) * 100 : 0,
    Mg: sumCationsKCaMg > 0 ? (meq.Mg / sumCationsKCaMg) * 100 : 0,
    N_NH4: sumCationsTotal > 0 ? (meq.N_NH4 / sumCationsTotal) * 100 : 0
  };
  const nTotalMeq = meq.N_NO3 + meq.N_NH4;
  const nSplit = {
    NO3: nTotalMeq > 0 ? (meq.N_NO3 / nTotalMeq) * 100 : 0,
    NH4: nTotalMeq > 0 ? (meq.N_NH4 / nTotalMeq) * 100 : 0
  };
  // CE ref (dS/m) ≈ (Σ aniones + Σ cationes) / 20  ≡  promedio iónico / 10
  const ceRef = (sumAnionsTotal + sumCationsTotal) / 20;
  return {
    stage,
    m3ha,
    kg,
    ppm,
    meq,
    pct,
    nSplit,
    sumAnionsMeq: sumAnionsTotal,
    sumAnionsTriangleMeq: sumAnionsTriangle,
    sumCationsMeq: sumCationsTotal,
    ceRefDsM: Number.isFinite(ceRef) ? ceRef : 0
  };
}

function getFertiStageIonicSummary(stageIndex, opts) {
  const includeWater = opts && opts.includeWater;
  const w = fertiWeeks[stageIndex];
  if (!w) return null;
  const m3ha = parseFloat(fertiChartWaterByStageM3ha[stageIndex]) || 0;
  let kg = fertiKgFromStageTotals(w.totals || {});
  if (includeWater) {
    const waterByStage = fertiWaterContributionForStage(
      fertiWaterContributionOxide,
      fertiChartWaterByStageM3ha,
      stageIndex
    );
    const waterKg = getFertiWaterKgElemental(kg.N_NO3, kg.N_NH4, waterByStage);
    kg = fertiMergeKg(kg, waterKg);
  }
  return computeFertiIonicSummaryFromKg(kg, m3ha, w);
}

function renderFertiMacroIonicTableHtml(summary) {
  if (!summary || !summary.ppm) return '';
  return `
        <div class="ferti-insight-legend" style="margin:0 0 8px 0;">
          ${fertProgT('n_relation_in_stage', 'Relación de N en la etapa:')} <strong>N-NO₃⁻ ${fertiNum(summary.nSplit.NO3, 1)}%</strong> · <strong>N-NH₄⁺ ${fertiNum(summary.nSplit.NH4, 1)}%</strong> ${fertProgT('n_relation_suffix', '(sobre N total = NO₃ + NH₄).')}
          <span class="ferti-insight-meq-sums notranslate" translate="no" title="Σ aniones = N-NO₃⁻ + P-H₂PO₄⁻ + S-SO₄²⁻ + Cl⁻ (balance iónico). Los % del cuadrado ternario siguen siendo solo los tres primeros. Σ cationes = K⁺ + Ca²⁺ + Mg²⁺ + N-NH₄⁺. CE ref = (Σ aniones + Σ cationes) / 20"> · Σ aniones ${fertiNum(summary.sumAnionsMeq, 2)} meq/L · Σ cationes ${fertiNum(summary.sumCationsMeq, 2)} meq/L · <strong>${fertProgT('ce_ref', 'CE ref')} ${fertiNum(summary.ceRefDsM, 2)} dS/m</strong></span>
        </div>
        <table class="ferti-insight-table ferti-insight-table--macro-ionic">
          <thead><tr><th>${fertProgT('nutrient', 'Nutriente')}</th><th>${fertProgT('dose', 'Dosis')} (${fertProgUnit('dose_mass_area', 'kg/ha')})</th><th>${fertProgT('concentration', 'Concentración')} (ppm)</th><th>meq/L</th><th>${fertProgT('group_pct', '% grupo')} <span class="ferti-pct-col-hint" title="${fertProgT('pct_col_hint', 'Aniones del triángulo: suma 100% entre NO₃+H₂PO₄+SO₄. Cl⁻ y NH₄⁺: % sobre el total ampliado (ver nota). Cationes K+Ca+Mg: 100% en el triángulo.')}">ⓘ</span></th></tr></thead>
          <tbody>
            <tr>
              <td>N-NO₃⁻</td><td>${fertProgResultFromSI(summary.kg.N_NO3, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.N_NO3, 1)}</td><td>${fertiNum(summary.meq.N_NO3, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-anion ferti-pct-anion--top" title="Suma 100% entre estos tres aniones."><span class="ferti-pct-val notranslate" translate="no">${fertiNum(summary.pct.N_NO3, 1)}</span></td>
            </tr>
            <tr>
              <td>P-H₂PO₄⁻</td><td>${fertProgResultFromSI(summary.kg.P, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.P, 1)}</td><td>${fertiNum(summary.meq.P, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-anion ferti-pct-anion--mid"><span class="ferti-pct-val notranslate" translate="no">${fertiNum(summary.pct.P, 1)}</span></td>
            </tr>
            <tr title="Columnas kg/ha, ppm y meq/L en base azufre elemental (S): SO₄ del programa × 32/96 + S directo del catálogo.">
              <td>S-SO₄²⁻</td><td>${fertProgResultFromSI(summary.kg.SO4, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.SO4, 1)}</td><td>${fertiNum(summary.meq.SO4, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-anion ferti-pct-anion--bot"><span class="ferti-pct-val notranslate" translate="no">${fertiNum(summary.pct.SO4, 1)}</span></td>
            </tr>
            <tr class="ferti-macro-row-cl" title="Cl⁻ en % masa del catálogo (p. ej. KCl, CaCl₂·2H₂O); meq/L = ppm Cl / 35,45.">
              <td>Cl⁻</td><td>${fertProgResultFromSI(summary.kg.Cl, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.Cl, 1)}</td><td>${fertiNum(summary.meq.Cl, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-cl-cell">
                <span class="ferti-pct-cl notranslate" translate="no" title="% sobre aniones totales (NO₃+H₂PO₄+SO₄+Cl); no entra al triángulo N-P-S.">${fertiNum(summary.pct.Cl, 1)}</span>
              </td>
            </tr>
            <tr class="ferti-macro-ion-split" aria-hidden="true"><td colspan="5"><span class="ferti-macro-ion-split-line" title="Aniones arriba · Cationes abajo"></span></td></tr>
            <tr class="ferti-macro-cation-start">
              <td>K⁺</td><td>${fertProgResultFromSI(summary.kg.K, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.K, 1)}</td><td>${fertiNum(summary.meq.K, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-cat ferti-pct-cat--top" title="Suma 100% entre K⁺+Ca²⁺+Mg²⁺ (triángulo; sin NH₄)."><span class="ferti-pct-val notranslate" translate="no">${fertiNum(summary.pct.K, 1)}</span></td>
            </tr>
            <tr>
              <td>Ca²⁺</td><td>${fertProgResultFromSI(summary.kg.Ca, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.Ca, 1)}</td><td>${fertiNum(summary.meq.Ca, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-cat ferti-pct-cat--mid"><span class="ferti-pct-val notranslate" translate="no">${fertiNum(summary.pct.Ca, 1)}</span></td>
            </tr>
            <tr>
              <td>Mg²⁺</td><td>${fertProgResultFromSI(summary.kg.Mg, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.Mg, 1)}</td><td>${fertiNum(summary.meq.Mg, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-cat ferti-pct-cat--bot"><span class="ferti-pct-val notranslate" translate="no">${fertiNum(summary.pct.Mg, 1)}</span></td>
            </tr>
            <tr class="ferti-macro-row-nh4">
              <td>N-NH₄⁺</td><td>${fertProgResultFromSI(summary.kg.N_NH4, 'dose_mass_area')}</td><td>${fertiNum(summary.ppm.N_NH4, 1)}</td><td>${fertiNum(summary.meq.N_NH4, 2)}</td>
              <td class="ferti-pct-cell ferti-pct-nh4-cell">
                <span class="ferti-pct-nh4 notranslate" translate="no" title="% sobre cationes totales (K+Ca+Mg+NH₄); ver nota al pie.">${fertiNum(summary.pct.N_NH4, 1)}</span>
              </td>
            </tr>
          </tbody>
        </table>`;
}

const FERTI_MICRO_INSIGHT_NUTRIENTS = ['Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo'];

function renderFertiMicroTableHtml(summary) {
  if (!summary || !summary.kg) return '';
  const rows = FERTI_MICRO_INSIGHT_NUTRIENTS.map(n => `
            <tr><td>${n}</td><td>${fertProgResultFromSI(summary.kg[n], 'dose_mass_area')}</td><td>${fertiNum(summary.ppm[n], 2)}</td></tr>`).join('');
  return `
        <table class="ferti-insight-table ferti-insight-table--micro">
          <thead><tr><th>${fertProgT('nutrient', 'Nutriente')}</th><th>${fertProgUnit('dose_mass_area', 'kg/ha')}</th><th>ppm</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
}

const FERTI_SOURCE_SHARE_NUTS = [
  { id: 'N', oxide: 'N', elemental: 'N' },
  { id: 'P2O5', oxide: 'P₂O₅', elemental: 'P' },
  { id: 'K2O', oxide: 'K₂O', elemental: 'K' },
  { id: 'CaO', oxide: 'CaO', elemental: 'Ca' },
  { id: 'MgO', oxide: 'MgO', elemental: 'Mg' },
  { id: 'SO4', oxide: 'SO₄', elemental: 'S' },
  { id: 'Fe', oxide: 'Fe', elemental: 'Fe' },
  { id: 'Mn', oxide: 'Mn', elemental: 'Mn' },
  { id: 'B', oxide: 'B', elemental: 'B' },
  { id: 'Zn', oxide: 'Zn', elemental: 'Zn' },
  { id: 'Cu', oxide: 'Cu', elemental: 'Cu' },
  { id: 'Mo', oxide: 'Mo', elemental: 'Mo' }
];

function fertiSourceSharePct(fertilizerKg, granularKg) {
  const ui = fertProgUI();
  if (ui && typeof ui.sourceSharePct === 'function') return ui.sourceSharePct(fertilizerKg, granularKg);
  const f = Math.max(0, Number(fertilizerKg) || 0);
  const g = Math.max(0, Number(granularKg) || 0);
  const t = f + g;
  if (!(t > 1e-12)) return { ferti: null, granular: null };
  const ferti = Math.round((1000 * f) / t) / 10;
  return { ferti: ferti, granular: Math.round((100 - ferti) * 10) / 10 };
}

function fertiProgramSupplyOxideTotals(weeks) {
  const out = { N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, SO4: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0 };
  const list = Array.isArray(weeks) ? weeks : (fertiWeeks || []);
  list.forEach(function (w) {
    const t = (w && w.totals) || {};
    out.N += (Number(t.N_NO3) || 0) + (Number(t.N_NH4) || 0);
    out.P2O5 += Number(t.P2O5) || 0;
    out.K2O += Number(t.K2O) || 0;
    out.CaO += Number(t.CaO) || 0;
    out.MgO += Number(t.MgO) || 0;
    out.SO4 += (Number(t.SO4) || 0) + (Number(t.S) || 0) * FERTI_CONV.SO4_TO_S;
    out.Fe += Number(t.Fe) || 0;
    out.Mn += Number(t.Mn) || 0;
    out.B += Number(t.B) || 0;
    out.Zn += Number(t.Zn) || 0;
    out.Cu += Number(t.Cu) || 0;
    out.Mo += Number(t.Mo) || 0;
  });
  return out;
}

function fertiFormatSourceSharePct(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return fertiNum(value, 1) + '%';
}

function renderFertiChartsSourceShare() {
  const host = document.getElementById('fertiChartsSourceShareWrap');
  if (!host) return;
  if (!Array.isArray(fertiWeeks) || !fertiWeeks.length) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  const programKg = fertiProgramSupplyOxideTotals();
  const granularKg = fertiGeneratorBaseMap();
  const elemental = !!fertiChartsElementalMode;
  const heads = FERTI_SOURCE_SHARE_NUTS.map(function (n) {
    const color = fertProgNutrientColor(n.id);
    const label = elemental ? n.elemental : n.oxide;
    return '<th style="color:' + color + ';border-bottom:2px solid ' + color + ';">' + fertiEscapeInsightsLabel(label) + '</th>';
  }).join('');
  const fertiCells = FERTI_SOURCE_SHARE_NUTS.map(function (n) {
    const share = fertiSourceSharePct(programKg[n.id], granularKg[n.id]);
    const empty = share.ferti == null;
    return '<td class="' + (empty ? 'is-empty' : '') + '">' + fertiFormatSourceSharePct(share.ferti) + '</td>';
  }).join('');
  const granularCells = FERTI_SOURCE_SHARE_NUTS.map(function (n) {
    const share = fertiSourceSharePct(programKg[n.id], granularKg[n.id]);
    const empty = share.granular == null;
    return '<td class="' + (empty ? 'is-empty' : '') + '">' + fertiFormatSourceSharePct(share.granular) + '</td>';
  }).join('');
  host.hidden = false;
  host.innerHTML =
    '<h5>' + fertiEscapeInsightsLabel(fertProgT('source_share_title', 'Aporte fertirriego vs nutrición granular')) + '</h5>' +
    '<p class="ferti-source-share-hint">' + fertiEscapeInsightsLabel(fertProgT('source_share_hint', 'Porcentaje del fertilizante aplicado en el ciclo (programa + granular). No incluye agua. El N granular es N total.')) + '</p>' +
    '<div class="ferti-source-share-scroll"><table class="ferti-source-share-table">' +
      '<thead><tr><th></th>' + heads + '</tr></thead>' +
      '<tbody>' +
        '<tr><td>' + fertiEscapeInsightsLabel(fertProgT('source_share_ferti', 'Fertirriego')) + '</td>' + fertiCells + '</tr>' +
        '<tr><td>' + fertiEscapeInsightsLabel(fertProgT('source_share_granular', 'Nutrición granular de base')) + '</td>' + granularCells + '</tr>' +
      '</tbody>' +
    '</table></div>';
}

function fertiMeqToElementalKg(meq, ionKey, m3ha) {
  const eq = FERTI_ION_EQ_WEIGHTS[ionKey];
  if (!(eq > 0) || !(m3ha > 0)) return 0;
  return (meq * eq * m3ha) / 1000;
}

function fertiRestoreStageDoseAmounts(stageIndex, amounts) {
  const week = fertiWeeks[stageIndex];
  if (!week || !Array.isArray(amounts)) return;
  if (!week.kgByCol) week.kgByCol = {};
  fertiColumns.forEach((c, idx) => {
    week.kgByCol[c.id] = Math.max(0, parseFloat(amounts[idx]) || 0);
  });
  computeWeekTotals(week);
}

function fertiTernaryCanonicalFromPct(role, pTop, pLeft, pRight, sumMeq, waterKg, m3ha) {
  let pa = Math.max(0, Number(pTop) || 0);
  let pb = Math.max(0, Number(pLeft) || 0);
  let pc = Math.max(0, Number(pRight) || 0);
  const s = pa + pb + pc;
  if (s > 0) { pa = (pa / s) * 100; pb = (pb / s) * 100; pc = (pc / s) * 100; }
  const toCanonical = {
    N_NO3: (kg) => kg,
    P: (kg) => kg * FERTI_CONV.P2O5_TO_P,
    SO4: (kg) => kg * FERTI_CONV.SO4_TO_S,
    K: (kg) => kg * FERTI_CONV.K2O_TO_K,
    Ca: (kg) => kg * FERTI_CONV.CaO_TO_Ca,
    Mg: (kg) => kg * FERTI_CONV.MgO_TO_Mg
  };
  const specs = role === 'an'
    ? [
        { ion: 'N_NO3', pct: pa, programKey: 'N_NO3' },
        { ion: 'P', pct: pb, programKey: 'P2O5' },
        { ion: 'SO4', pct: pc, programKey: 'SO4' }
      ]
    : [
        { ion: 'K', pct: pa, programKey: 'K2O' },
        { ion: 'Ca', pct: pb, programKey: 'CaO' },
        { ion: 'Mg', pct: pc, programKey: 'MgO' }
      ];
  return specs.map((spec) => {
    const targetTotalKg = fertiMeqToElementalKg(sumMeq * spec.pct / 100, spec.ion, m3ha);
    const fertKg = Math.max(0, targetTotalKg - (Number(waterKg && waterKg[spec.ion]) || 0));
    return { programKey: spec.programKey, canonical: toCanonical[spec.ion](fertKg) };
  });
}

function fertiApplyTernaryPctToStage(stageIndex, role, pTop, pLeft, pRight, opts) {
  const week = fertiWeeks[stageIndex];
  if (!week || !fertiColumns.length) return { ok: false, reason: 'no-stage' };
  const m3ha = opts && opts.m3ha != null ? Number(opts.m3ha) : (parseFloat(fertiChartWaterByStageM3ha[stageIndex]) || 0);
  if (!(m3ha > 0)) return { ok: false, reason: 'no-lamina' };
  const waterKg = (opts && opts.waterKg) || {};
  const sumMeq = Number(opts && opts.sumMeq) || 0;
  if (!(sumMeq > 1e-9)) return { ok: false, reason: 'no-ions' };
  if (Array.isArray(opts && opts.baseAmounts)) fertiRestoreStageDoseAmounts(stageIndex, opts.baseAmounts);
  const targets = fertiTernaryCanonicalFromPct(role, pTop, pLeft, pRight, sumMeq, waterKg, m3ha);
  let anyOk = false;
  let lastFail = null;
  for (let pass = 0; pass < 5; pass++) {
    targets.forEach((spec) => {
      const result = fertiAdjustStageNutrientCanonical(stageIndex, spec.programKey, spec.canonical);
      if (result && result.ok) anyOk = true;
      else if (result) lastFail = result;
    });
  }
  return { ok: anyOk, reason: anyOk ? null : (lastFail && lastFail.reason) };
}

function fertiTernaryInfoText(summary) {
  if (!summary || !summary.pct) return '';
  return (
    `${fertProgT('anions_triangle', 'Aniones (triángulo)')}: N-NO₃⁻ ${fertiNum(summary.pct.N_NO3, 1)}% · P-H₂PO₄⁻ ${fertiNum(summary.pct.P, 1)}% · S-SO₄²⁻ ${fertiNum(summary.pct.SO4, 1)}% | ` +
    `Cl⁻ ${fertiNum(summary.pct.Cl, 1)}% ${fertProgT('cl_outside_triangle', 'sobre aniones totales (fuera del triángulo)')} | ` +
    `${fertProgT('cations_triangle', 'Cationes (triángulo)')}: K⁺ ${fertiNum(summary.pct.K, 1)}% · Ca²⁺ ${fertiNum(summary.pct.Ca, 1)}% · Mg²⁺ ${fertiNum(summary.pct.Mg, 1)}% · ` +
    `N-NH₄⁺ ${fertiNum(summary.pct.N_NH4, 1)}% ${fertProgT('nh4_outside_triangle', 'sobre cationes totales (fuera del triángulo)')}.`
  );
}

function fertiPatchTernaryPlot(summary) {
  const tri = document.getElementById('fertiChartsTernaryPlot');
  const svg = tri && tri.querySelector('svg');
  const geom = (tri && tri._ternGeom) || (typeof hydroTernGeom !== 'undefined' ? hydroTernGeom : null);
  if (!svg || !geom || !summary || !summary.pct || typeof hydroBaryToXY !== 'function') return;
  const norm3 = (a, b, c) => {
    let pa = Math.max(0, Number(a) || 0);
    let pb = Math.max(0, Number(b) || 0);
    let pc = Math.max(0, Number(c) || 0);
    const s = pa + pb + pc;
    if (s > 0) { pa = (pa / s) * 100; pb = (pb / s) * 100; pc = (pc / s) * 100; }
    return [pa, pb, pc];
  };
  const [pNO3, pH2PO4, pSO4] = norm3(summary.pct.N_NO3, summary.pct.P, summary.pct.SO4);
  const [pK, pCa, pMg] = norm3(summary.pct.K, summary.pct.Ca, summary.pct.Mg);
  const anPt = hydroBaryToXY(geom.vTop, geom.vLeft, geom.vRight, pNO3, pH2PO4, pSO4);
  const catPt = hydroBaryToXY(geom.vTop, geom.vLeft, geom.vRight, pK, pCa, pMg);
  const lay = typeof hydroTernMarkerLayout === 'function' ? hydroTernMarkerLayout(anPt, catPt) : { an: anPt, cat: catPt };
  if (typeof hydroTernApplyMarkerAttrs === 'function') hydroTernApplyMarkerAttrs(svg, lay.an, lay.cat);
  const triInfo = document.getElementById('fertiChartsTernaryInfo');
  if (triInfo) triInfo.textContent = fertiTernaryInfoText(summary);
}

function fertiTernaryLiveSummary(stageIndex) {
  return getFertiStageIonicSummary(stageIndex, { includeWater: true }) || getFertiStageIonicSummary(stageIndex);
}

function setupFertiTernaryDrag() {
  const host = document.getElementById('fertiChartsStageInsightsWrap');
  if (!host || host._fertiTernDragReady) return;
  host._fertiTernDragReady = true;

  function applyAt(clientX, clientY) {
    const drag = fertiTernDrag;
    if (!drag || !drag.role) return;
    const plot = host.querySelector('#fertiChartsTernaryPlot');
    const svg = plot && plot.querySelector('svg');
    const geom = (plot && plot._ternGeom) || (typeof hydroTernGeom !== 'undefined' ? hydroTernGeom : null);
    if (!svg || !geom || typeof hydroTernClientToSvg !== 'function' || typeof hydroXYToBaryPct !== 'function') return;
    const p = hydroTernClientToSvg(svg, clientX, clientY);
    const b = hydroXYToBaryPct(p.x, p.y, geom);
    const result = fertiApplyTernaryPctToStage(drag.stageIndex, drag.role, b.top, b.left, b.right, {
      baseAmounts: drag.baseAmounts,
      waterKg: drag.waterKg,
      sumMeq: drag.sumMeq,
      m3ha: drag.m3ha
    });
    if (!result.ok) {
      fertiSetChartEditNotice(
        fertProgT('ternary_drag_no_source', 'No se puede alcanzar ese % del triángulo con los fertilizantes desbloqueados de esta etapa. Agrega una fuente o desbloquea un producto.'),
        'warning'
      );
    } else {
      fertiSetChartEditNotice('');
    }
    if (!drag.raf) {
      drag.raf = requestAnimationFrame(function () {
        drag.raf = null;
        const summary = fertiTernaryLiveSummary(drag.stageIndex);
        fertiPatchTernaryPlot(summary);
        [fertiMacroChart, fertiMicroChart].forEach((chart) => {
          if (!chart || !chart.data || !Array.isArray(chart.data.datasets)) return;
          chart.data.datasets.forEach((ds) => {
            const key = ds._fertiNutrientKey;
            if (!key) return;
            ds.data = fertiWeeks.map((w) => fertiChartDisplayValue(key, w.totals?.[key] || 0));
          });
          try { chart.update('none'); } catch (e) { try { chart.update(); } catch (e2) {} }
        });
      });
    }
  }

  host.addEventListener('pointerdown', function (e) {
    const plot = host.querySelector('#fertiChartsTernaryPlot');
    if (!plot || !plot.contains(e.target)) return;
    if (!fertiChartEditMode) return;
    const role = e.target.getAttribute && e.target.getAttribute('data-tern-role');
    if (role !== 'an' && role !== 'cat') return;
    const idx = fertiChartSelectedStageIndex;
    const week = fertiWeeks[idx];
    if (!week) return;
    const summary = fertiTernaryLiveSummary(idx);
    if (!summary || !summary.meq) return;
    const waterByStage = fertiWaterContributionForStage(
      fertiWaterContributionOxide,
      fertiChartWaterByStageM3ha,
      idx
    );
    fertiTernDrag = {
      role,
      stageIndex: idx,
      before: fertiCaptureDoseSnapshot(),
      baseAmounts: fertiColumns.map((c) => Math.max(0, parseFloat(week.kgByCol?.[c.id]) || 0)),
      waterKg: getFertiWaterKgElemental(0, 0, waterByStage),
      sumMeq: role === 'an'
        ? (Number(summary.sumAnionsTriangleMeq) || ((summary.meq.N_NO3 || 0) + (summary.meq.P || 0) + (summary.meq.SO4 || 0)))
        : ((summary.meq.K || 0) + (summary.meq.Ca || 0) + (summary.meq.Mg || 0)),
      m3ha: parseFloat(fertiChartWaterByStageM3ha[idx]) || 0,
      raf: null
    };
    plot.classList.add('tern-dragging');
    const svg = plot.querySelector('svg');
    if (svg) {
      svg.classList.add('tern-dragging');
      svg.classList.remove('tern-dragging-an', 'tern-dragging-cat');
      svg.classList.add(role === 'an' ? 'tern-dragging-an' : 'tern-dragging-cat');
    }
    try { host.setPointerCapture(e.pointerId); } catch (_) {}
    applyAt(e.clientX, e.clientY);
    e.preventDefault();
  });

  host.addEventListener('pointermove', function (e) {
    if (!fertiTernDrag || !fertiTernDrag.role) return;
    applyAt(e.clientX, e.clientY);
    e.preventDefault();
  });

  function endDrag(e) {
    const drag = fertiTernDrag;
    if (!drag || !drag.role) return;
    fertiTernDrag = null;
    const plot = host.querySelector('#fertiChartsTernaryPlot');
    if (plot) plot.classList.remove('tern-dragging');
    const svg = plot && plot.querySelector('svg');
    if (svg) svg.classList.remove('tern-dragging', 'tern-dragging-an', 'tern-dragging-cat');
    try { host.releasePointerCapture(e.pointerId); } catch (_) {}
    fertiChartUndoSnapshot = drag.before;
    renderFertiWeeks();
    updateFertiSummary();
    updateFertiCharts();
    markFertiProgDirty();
    updateFertiChartEditControls();
    fertiPushProgramSplitToDistribution();
  }
  host.addEventListener('pointerup', endDrag);
  host.addEventListener('pointercancel', endDrag);
}

function renderFertiChartsInsights() {
  renderFertiChartsSourceShare();
  if (fertiTernDrag && fertiTernDrag.role) return;
  const wrap = document.getElementById('fertiChartsStageInsightsWrap');
  if (!wrap) return;
  fertiNormalizeChartWaterByStage();
  if (!fertiWeeks.length) { wrap.innerHTML = ''; return; }
  const idx = fertiChartSelectedStageIndex;
  const summaryFert = getFertiStageIonicSummary(idx);
  const summaryWithWater = getFertiStageIonicSummary(idx, { includeWater: true });
  const summaryTernary = (summaryWithWater && summaryWithWater.ppm) ? summaryWithWater : summaryFert;
  const options = fertiWeeks.map((w, i) => {
    const stageRaw = w.stage || '';
    const stageShown = stageRaw ? fertProgStage(stageRaw) : '';
    return `<option value="${i}" ${i === idx ? 'selected' : ''}>${fertiStageSlotLabel(i)}${stageShown ? ' · ' + stageShown : ''}</option>`;
  }).join('');
  const macroLegend = fertProgT(
    'macro_legend_nh4_cl',
    'N-NH₄⁺: % sobre cationes totales (K+Ca+Mg+NH₄). Los rangos de cationes ({cations}) aplican al triángulo K+Ca+Mg (sin NH₄). Cl⁻: % sobre aniones totales (NO₃+H₂PO₄+SO₄+Cl); el diagrama ternario y {anions} siguen referidos solo a N-P-S (sin Cl). El aporte de agua proviene de la pestaña Programa de nutrición; si está en cero, ambas tablas coinciden.'
  ).replace('{cations}', fertiCationRangesText()).replace('{anions}', fertiAnionRangesText());
  let body = '';
  if (!summaryFert || summaryFert.m3ha <= 0) {
    body = `<div class="ferti-insight-alert">${fertProgT('enter_water', 'Captura la lámina de esta etapa arriba para calcular ppm y meq/L.')} <strong>${fertProgUnit('volume_area', 'm³/ha')}</strong></div>`;
  } else {
    const stageRaw = (summaryFert.stage && summaryFert.stage.stage) || '';
    const stageLabel = stageRaw ? fertProgStage(stageRaw) : fertProgT('stage', 'Etapa');
    body = `
      <div class="ferti-insight-card ferti-insight-card--macro-dual">
        <h5>${fertProgT('macro_summary', 'Macro resumen')} · ${fertiStageSlotLabel(idx)} (${stageLabel})</h5>
        <div class="ferti-macro-dual-grid">
          <div class="ferti-macro-dual-col">
            <h6 class="ferti-macro-dual-title">${fertProgT('fertilizer_supply', 'Aporte de fertilizante')}</h6>
            ${renderFertiMacroIonicTableHtml(summaryFert)}
          </div>
          <div class="ferti-macro-dual-col">
            <h6 class="ferti-macro-dual-title">${fertProgT('fertilizer_water_supply', 'Fertilizante más aporte de agua')}</h6>
            ${renderFertiMacroIonicTableHtml(summaryWithWater)}
          </div>
        </div>
        <div class="ferti-insight-legend">${macroLegend}</div>
      </div>
      <div class="ferti-insight-card ferti-insight-card--ternary">
        <div class="ferti-ternary-head">
          <h5>${fertProgT('ternary_diagram', '📐 Diagrama ternario (aniones + cationes)')}</h5>
          <div class="ferti-chart-edit-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-ferti-chart-edit="toggle" data-ferti-edit-surface="ternary" onclick="toggleFertiChartEditMode()">${fertProgT('adjust_ternary', '✋ Ajustar en triángulo')}</button>
            <button type="button" class="btn btn-secondary btn-sm" data-ferti-chart-edit="undo" onclick="undoFertiChartAdjustment()" hidden style="display:none;">${fertProgT('undo', '↶ Deshacer')}</button>
            <button type="button" class="btn btn-secondary btn-sm" data-ferti-chart-edit="restore" onclick="restoreFertiChartEditBaseline()" hidden style="display:none;">${fertProgT('restore_original', 'Restaurar original')}</button>
          </div>
        </div>
        <p class="ferti-insight-ternary-note">${fertProgT('ternary_note', 'Basado en <strong>fertilizante + aporte de agua</strong> de la etapa seleccionada. Cuadrado amarillo = balance aniónico solo entre N-NO₃⁻, P-H₂PO₄⁻ y S-SO₄²⁻ (100%); el Cl⁻ suma en Σ aniones y en su % aparte, sin mover el punto del triángulo. Círculo rojo = K⁺, Ca²⁺, Mg²⁺ sobre K+Ca+Mg. Arrastrar un marcador rebalancea las <strong>dosis de fertilizante de esta etapa</strong> (el agua no se mueve).')}</p>
        <div id="fertiChartsTernaryInfo" class="ferti-insight-muted-ternary notranslate" translate="no"></div>
        <div id="fertiChartsTernaryPlot" class="ferti-charts-ternary-plot hydro-triangle notranslate" translate="no"></div>
      </div>
      <div class="ferti-insight-card ferti-insight-card--micro-dual">
        <h5>${fertProgT('micros_summary', 'Micros')} · ${fertiStageSlotLabel(idx)} (${stageLabel})</h5>
        <div class="ferti-macro-dual-grid ferti-micro-dual-grid">
          <div class="ferti-macro-dual-col">
            <h6 class="ferti-macro-dual-title ferti-micro-dual-title">${fertProgT('fertilizer_supply', 'Aporte de fertilizante')}</h6>
            ${renderFertiMicroTableHtml(summaryFert)}
          </div>
          <div class="ferti-macro-dual-col">
            <h6 class="ferti-macro-dual-title ferti-micro-dual-title ferti-micro-dual-title--water">${fertProgT('fertilizer_water_supply', 'Fertilizante más aporte de agua')}</h6>
            ${renderFertiMicroTableHtml(summaryWithWater)}
          </div>
        </div>
        <p class="ferti-insight-legend" style="margin:10px 0 0;">${fertProgT('micros_legend', 'Los ppm de micros usan la misma lámina de riego ({unit}) de la etapa. Si el aporte de agua en Programa de nutrición está en cero, ambas columnas coinciden.').replace('{unit}', fertProgUnit('volume_area', 'm³/ha'))}</p>
      </div>
    `;
  }
  const laminaText = summaryFert && summaryFert.m3ha > 0
    ? fertProgResultFromSI(summaryFert.m3ha, 'volume_area') + ' ' + fertProgUnitToHtml('volume_area', 'm³/ha')
    : fertProgT('no_data', 'sin dato');
  wrap.innerHTML = `
    <div class="ferti-charts-insights-head">
      <label for="fertiChartsStageSelect">${fertProgT('stage_to_analyze', 'Etapa a analizar:')}</label>
      <select id="fertiChartsStageSelect" onchange="onFertiChartStageSelect(this.value)">${options}</select>
      <span class="ferti-charts-water-note">${fertProgT('lamina', 'Lámina de riego:')} <strong>${laminaText}</strong></span>
    </div>
    ${body}
  `;
  syncFertiChartWaterHighlight();
  if (summaryTernary && summaryTernary.m3ha > 0 && summaryTernary.pct && typeof hydroDrawCombinedTernary === 'function') {
    const tri = document.getElementById('fertiChartsTernaryPlot');
    if (tri) {
    const triInfo = document.getElementById('fertiChartsTernaryInfo');
    const anionZ = typeof hydroEquilibriumPolygonAnions === 'function' ? hydroEquilibriumPolygonAnions() : [];
    const catZ = typeof hydroEquilibriumPolygonCations === 'function' ? hydroEquilibriumPolygonCations() : [];
    hydroDrawCombinedTernary(tri, {
      pNO3: summaryTernary.pct.N_NO3,
      pH2PO4: summaryTernary.pct.P,
      pSO4: summaryTernary.pct.SO4,
      pK: summaryTernary.pct.K,
      pCa: summaryTernary.pct.Ca,
      pMg: summaryTernary.pct.Mg,
      anionZone: anionZ,
      cationZone: catZ,
      bindHydroDrag: false,
      dragHint: fertiChartEditMode
        ? fertProgT('ternary_drag_hint', 'Arrastra el cuadrado amarillo (aniones) o el círculo rojo (cationes): se actualizan las dosis de fertilizante de esta etapa, luego % meq, meq/L, ppm y CE.')
        : fertProgT('ternary_edit_help', 'Pulsa «Ajustar en triángulo» para arrastrar el cuadrado o el círculo y rebalancear las dosis de esta etapa.')
    });
    if (triInfo) triInfo.textContent = fertiTernaryInfoText(summaryTernary);
    }
  }
  setupFertiTernaryDrag();
  updateFertiChartEditControls();
}

function loadChartJs(callback){
  if (window.Chart) { callback(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  s.onload = callback; document.head.appendChild(s);
}

/** Eje X en gráficas: etapa + periodo, ej. "Vegetativo Mes 1". Sin week = solo "Mes N" / "Semana N". */
function fertiChartSlotLabelAtIndex(timeUnit, index0, week) {
  const slot = timeUnit === 'mes' ? fertProgT('month', 'Mes') : fertProgT('week', 'Semana');
  const period = `${slot} ${index0 + 1}`;
  const raw = week && (week.stage || week.label);
  if (!raw) return period;
  const stage = String(fertProgStage(raw) || '').trim();
  if (!stage || stage === period || /^(?:Mes|Semana|Month|Week)\s+\d+$/i.test(stage)) return period;
  return stage + ' ' + period;
}

function getFertiWeekLabels() {
  return fertiWeeks.map((w, i) => fertiChartSlotLabelAtIndex(fertiTimeUnit, i, w));
}

/** Fuerza redibujo con tamaño correcto (p. ej. la pestaña Gráficas estuvo oculta y el canvas quedó en 0×0). */
function resizeFertiCharts() {
  try {
    if (fertiMacroChart && typeof fertiMacroChart.resize === 'function') fertiMacroChart.resize();
  } catch (e) {}
  try {
    if (fertiMicroChart && typeof fertiMicroChart.resize === 'function') fertiMicroChart.resize();
  } catch (e) {}
}

function fertiChartDestroyIfOrphaned(chart) {
  if (!chart) return null;
  try {
    if (!chart.canvas || !chart.canvas.isConnected) {
      try { chart.destroy(); } catch (e) {}
      return null;
    }
  } catch (e) {
    try { chart.destroy(); } catch (e2) {}
    return null;
  }
  return chart;
}

function updateFertiCharts(){
  loadChartJs(() => {
    fertiNormalizeChartWaterByStage();
    renderFertiChartWaterByStageInputs();
    // Asegurar totales por semana al día
    fertiWeeks.forEach(w => computeWeekTotals(w));
    fertiMacroChart = fertiChartDestroyIfOrphaned(fertiMacroChart);
    fertiMicroChart = fertiChartDestroyIfOrphaned(fertiMicroChart);
    const labels = getFertiWeekLabels();
    const mk = (n) => fertiWeeks.map(w => parseFloat(w.totals?.[n]||0));

    let macros = {
      N_NO3: mk('N_NO3'), N_NH4: mk('N_NH4'), P2O5: mk('P2O5'), K2O: mk('K2O'), CaO: mk('CaO'), MgO: mk('MgO'), SO4: mk('SO4')
    };
    const micros = { Fe: mk('Fe'), Mn: mk('Mn'), B: mk('B'), Zn: mk('Zn'), Cu: mk('Cu'), Mo: mk('Mo') };

    const macroColors = fertProgMacroColors();
    const microColors = fertProgMicroColors();
    const totalStages = labels.length;
    // Mantener puntos limpios cuando hay muchas semanas y visibles respecto a la línea.
    const chartStroke = totalStages >= 24 ? 1.6 : (totalStages >= 16 ? 1.8 : 2.0);
    const chartPoint = chartStroke + 0.25; // Punto apenas más grueso que la línea.
    const chartPointHover = chartPoint + 1.1;
    const chartPointBorder = Math.max(1.2, chartStroke - 0.2);
    // Ladeado siempre (ni horizontal ni vertical): ~38°; más etapas, un poco más inclinado.
    const xTickRotation = totalStages >= 16 ? 48 : 38;
    // autoSkip: en programas largos evita amontonamiento; NO usar maxTicksLimit aquí: en eje
    // tipo categoría (Mes 1, Mes 2, …) provoca en algunos entornos área de dibujo 0 o gráfico en blanco.
    const xTickAutoSkip = totalStages >= 10;
    const xLabelBottomPad = xTickRotation >= 45 ? 48 : 40;
    const makeDataset = (label, data, color, nutrientKey) => ({
      label,
      data: fertProgChartDoseSeries(data),
      _fertiNutrientKey: nutrientKey,
      borderColor: color,
      backgroundColor: 'transparent',
      tension: 0.3,
      borderWidth: chartStroke,
      pointRadius: chartPoint,
      pointHoverRadius: chartPointHover,
      pointHitRadius: Math.max(9, chartPointHover + 2),
      pointBorderWidth: chartPointBorder,
      pointBackgroundColor: color,
      pointBorderColor: '#ffffff'
    });

    // Conversión a elemental si aplica (P2O5->P, K2O->K, CaO->Ca, MgO->Mg, SO4->S como masa S / masa SO4 en producto)
    let macroLabels = { P2O5: 'P2O5', K2O: 'K2O', CaO: 'CaO', MgO: 'MgO', SO4: 'SO4' };
    if (fertiChartsElementalMode) {
      macros = {
        N_NO3: macros.N_NO3,
        N_NH4: macros.N_NH4,
        P2O5: macros.P2O5.map(v => v / FERTI_CONV.P2O5_TO_P),
        K2O: macros.K2O.map(v => v / FERTI_CONV.K2O_TO_K),
        CaO: macros.CaO.map(v => v / FERTI_CONV.CaO_TO_Ca),
        MgO: macros.MgO.map(v => v / FERTI_CONV.MgO_TO_Mg),
        SO4: macros.SO4.map(v => v / FERTI_CONV.SO4_TO_S)
      };
      macroLabels = { P2O5: 'P', K2O: 'K', CaO: 'Ca', MgO: 'Mg', SO4: 'S' };
    }

    const yAxisTitle = fertProgChartYAxisTitle();
    const xAxisTitle = fertProgT('stage', 'Etapa');
    const makeChartOptions = () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 180, easing: 'easeOutQuad' },
      layout: { padding: { bottom: xLabelBottomPad, top: 6, left: 2, right: 6 } },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 10,
            boxHeight: 10,
            generateLabels: chart => chart.data.datasets.map((ds, i) => ({
              text: ds.label || '',
              fillStyle: ds.borderColor,
              strokeStyle: ds.borderColor,
              lineWidth: ds.borderWidth || 2,
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i,
              fontColor: ds.borderColor,
              pointStyle: 'circle'
            }))
          }
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: yAxisTitle } },
        x: {
          type: 'category',
          title: { display: true, text: xAxisTitle },
          ticks: { minRotation: xTickRotation, maxRotation: xTickRotation, autoSkip: xTickAutoSkip, autoSkipPadding: 4 }
        }
      }
    });

    function syncChartSeries(chart, chartLabels, datasets, chartOptions) {
      chart.data.labels = chartLabels.slice();
      // Reutiliza datasets existentes; asegurar array `data` nuevo para que Chart.js actualice series.
      datasets.forEach((next, idx) => {
        const curr = chart.data.datasets[idx];
        if (curr) {
          Object.assign(curr, next);
          curr.data = Array.isArray(next.data) ? next.data.slice() : next.data;
        } else {
          chart.data.datasets.push({ ...next, data: Array.isArray(next.data) ? next.data.slice() : next.data });
        }
      });
      chart.data.datasets.length = datasets.length;
      chart.options = chartOptions;
      chart.update();
    }

    const macroDatasets = [
      makeDataset('N(NO3)', macros.N_NO3, macroColors.N_NO3, 'N_NO3'),
      makeDataset('N(NH4)', macros.N_NH4, macroColors.N_NH4, 'N_NH4'),
      makeDataset(macroLabels.P2O5, macros.P2O5, macroColors.P2O5, 'P2O5'),
      makeDataset(macroLabels.K2O, macros.K2O, macroColors.K2O, 'K2O'),
      makeDataset(macroLabels.CaO, macros.CaO, macroColors.CaO, 'CaO'),
      makeDataset(macroLabels.MgO, macros.MgO, macroColors.MgO, 'MgO'),
      makeDataset(macroLabels.SO4, macros.SO4, macroColors.SO4, 'SO4')
    ];
    const microDatasets = [
      makeDataset('Fe', micros.Fe, microColors.Fe, 'Fe'),
      makeDataset('Mn', micros.Mn, microColors.Mn, 'Mn'),
      makeDataset('B', micros.B, microColors.B, 'B'),
      makeDataset('Zn', micros.Zn, microColors.Zn, 'Zn'),
      makeDataset('Cu', micros.Cu, microColors.Cu, 'Cu'),
      makeDataset('Mo', micros.Mo, microColors.Mo, 'Mo')
    ];

    const macroTitleEl = document.getElementById('fertiMacroChartTitle');
    if (macroTitleEl) macroTitleEl.textContent = fertProgT('macronutrients', 'Macronutrientes');
    const microTitleEl = document.getElementById('fertiMicroChartTitle');
    if (microTitleEl) microTitleEl.textContent = fertProgT('micronutrients', 'Micronutrientes');
    const chartsModeBtn = document.getElementById('toggleFertiChartsModeBtn');
    if (chartsModeBtn) {
      chartsModeBtn.textContent = fertiChartsElementalMode
        ? fertProgT('oxide', '🔄 Ver en Óxido')
        : fertProgT('elemental', '🔄 Ver en Elemental');
    }

    const macroCtx = document.getElementById('fertiMacroChart');
    if (macroCtx) {
      const opts = makeChartOptions();
      if (!fertiMacroChart) {
        try {
          fertiMacroChart = new Chart(macroCtx.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: macroDatasets },
            options: opts
          });
        } catch (e) { console.warn('Ferti macro chart create:', e); }
      } else {
        try {
          syncChartSeries(fertiMacroChart, labels, macroDatasets, opts);
        } catch (e) {
          console.warn('Ferti macro chart sync, recreando', e);
          try { fertiMacroChart.destroy(); } catch (e2) {}
          fertiMacroChart = null;
          try {
            fertiMacroChart = new Chart(macroCtx.getContext('2d'), {
              type: 'line',
              data: { labels, datasets: macroDatasets },
              options: makeChartOptions()
            });
          } catch (e3) { console.warn('Ferti macro chart recreate:', e3); }
        }
      }
      fertiBindChartPointDragging(macroCtx, () => fertiMacroChart);
    }

    const microCtx = document.getElementById('fertiMicroChart');
    if (microCtx) {
      const opts2 = makeChartOptions();
      if (!fertiMicroChart) {
        try {
          fertiMicroChart = new Chart(microCtx.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: microDatasets },
            options: opts2
          });
        } catch (e) { console.warn('Ferti micro chart create:', e); }
      } else {
        try {
          syncChartSeries(fertiMicroChart, labels, microDatasets, opts2);
        } catch (e) {
          console.warn('Ferti micro chart sync, recreando', e);
          try { fertiMicroChart.destroy(); } catch (e2) {}
          fertiMicroChart = null;
          try {
            fertiMicroChart = new Chart(microCtx.getContext('2d'), {
              type: 'line',
              data: { labels, datasets: microDatasets },
              options: makeChartOptions()
            });
          } catch (e3) { console.warn('Ferti micro chart recreate:', e3); }
        }
      }
      fertiBindChartPointDragging(microCtx, () => fertiMicroChart);
    }
    renderFertiChartsInsights();
    updateFertiChartEditControls();
    const doResize = () => { try { resizeFertiCharts(); } catch (e) {} };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        doResize();
        setTimeout(doResize, 120);
      });
    });
  });
}

function fertiNormalizeWaterM3haFromProgram(program) {
  const weeks = Array.isArray(program && program.weeks) ? program.weeks : [];
  const arr = Array.isArray(program && program.chartWaterByStageM3ha) ? program.chartWaterByStageM3ha.slice(0, weeks.length) : [];
  while (arr.length < weeks.length) arr.push(0);
  return arr.map(v => Math.max(0, parseFloat(v) || 0));
}

function fertiStageSlotLabelFromProgram(program, index0) {
  const timeUnit = program && program.timeUnit === 'mes' ? 'mes' : 'semana';
  return fertiChartSlotLabelAtIndex(timeUnit, index0);
}

function getFertiStageIonicSummaryFromProgram(program, stageIndex, waterOx, opts) {
  const includeWater = opts === true || (opts && opts.includeWater);
  const weeks = Array.isArray(program && program.weeks) ? program.weeks : [];
  const waterArr = fertiNormalizeWaterM3haFromProgram(program);
  const week = weeks[stageIndex];
  if (!week) return null;
  const m3ha = waterArr[stageIndex] || 0;
  let kg = fertiKgFromStageTotals(week.totals || {});
  if (includeWater) {
    const waterByStage = fertiWaterContributionForStage(waterOx || {}, waterArr, stageIndex);
    kg = fertiMergeKg(kg, getFertiWaterKgElemental(kg.N_NO3, kg.N_NH4, waterByStage));
  }
  return computeFertiIonicSummaryFromKg(kg, m3ha, week);
}

var FERTI_REPORT_INSIGHTS_COMPACT_THRESHOLD = 7;
var FERTI_REPORT_PIVOT_CHUNK_SIZE = 12;

var FERTI_MACRO_PIVOT_ROWS = [
  { label: 'N-NO₃⁻', key: 'N_NO3' },
  { label: 'P-H₂PO₄⁻', key: 'P' },
  { label: 'S-SO₄²⁻', key: 'SO4' },
  { label: 'Cl⁻', key: 'Cl' },
  { label: 'K⁺', key: 'K' },
  { label: 'Ca²⁺', key: 'Ca' },
  { label: 'Mg²⁺', key: 'Mg' },
  { label: 'N-NH₄⁺', key: 'N_NH4' }
];

function fertiEscapeInsightsLabel(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fertiGetStageColLabelForPivot(program, stageIndex) {
  const week = program.weeks[stageIndex];
  const slot = fertiStageSlotLabelFromProgram(program, stageIndex);
  const name = week && (week.stage || week.label);
  if (name) return slot + ' · ' + String(fertProgStage(name));
  return slot;
}

function fertiChunkStageIndexes(stageIndexes, chunkSize) {
  const chunks = [];
  for (let i = 0; i < stageIndexes.length; i += chunkSize) {
    chunks.push(stageIndexes.slice(i, i + chunkSize));
  }
  return chunks;
}

function fertiCollectStageSummariesForReport(program, waterOx, stageIndexes, includeWater) {
  return stageIndexes.map(function (i) {
    return getFertiStageIonicSummaryFromProgram(program, i, waterOx, { includeWater: !!includeWater });
  });
}

function buildFertiInsightsPivotTableReport(opts) {
  const title = opts.title || '';
  const unit = opts.unit || '';
  const decimals = opts.decimals != null ? opts.decimals : 1;
  const stageIndexes = opts.stageIndexes || [];
  const summaries = opts.summaries || [];
  const waterArr = opts.waterArr || [];
  const rowDefs = opts.rowDefs || [];
  const partSuffix = opts.partSuffix ? ' ' + opts.partSuffix : '';
  const thStage = stageIndexes.map(function (i) {
    const lbl = fertiGetStageColLabelForPivot(opts.program, i);
    return '<th title="' + fertiEscapeInsightsLabel(lbl) + '">' + fertiEscapeInsightsLabel(lbl) + '</th>';
  }).join('');
  const waterUnit = fertProgUnitToHtml('volume_area', 'm³/ha');
  const m3Row = '<tr><td class="report-ferti-stage-cell">' + fertiEscapeInsightsLabel(fertProgT('lamina', 'Lámina de riego:')) + ' (' + waterUnit + ')</td>' +
    stageIndexes.map(function (i) {
      const shown = fertProgUI() ? fertProgUI().fromSI(waterArr[i], 'volume_area') : (Number(waterArr[i]) || 0);
      return '<td class="report-ferti-stage-num">' + fertiNum(shown, 2) + '</td>';
    }).join('') + '</tr>';
  const body = rowDefs.map(function (rd) {
    const cells = stageIndexes.map(function (si, ci) {
      const s = summaries[ci];
      let v = s && rd.pick ? rd.pick(s) : null;
      if (v == null || isNaN(v)) return '<td class="report-ferti-stage-num">—</td>';
      return '<td class="report-ferti-stage-num">' + fertiNum(v, decimals) + '</td>';
    }).join('');
    return '<tr><td class="report-ferti-stage-cell">' + rd.label + '</td>' + cells + '</tr>';
  }).join('');
  return (
    '<div class="report-block" style="margin-bottom:10px;padding:10px 12px;">' +
    '<div class="report-block-title">' + title + partSuffix + (unit ? ' (' + unit + ')' : '') + '</div>' +
    '<div class="report-table-wrap report-pdf-compact-table">' +
    '<table class="report-app-table"><thead><tr><th>Nutriente</th>' + thStage + '</tr></thead>' +
    '<tbody>' + m3Row + body + '</tbody></table></div></div>'
  );
}

function buildFertiChartsInsightsCompactHtmlForReport(program, waterOx, stageIndexes, waterArr) {
  const chunks = fertiChunkStageIndexes(stageIndexes, FERTI_REPORT_PIVOT_CHUNK_SIZE);
  const ppmRows = FERTI_MACRO_PIVOT_ROWS.map(function (r) {
    return { label: r.label, pick: function (s) { return s.ppm && s.ppm[r.key]; } };
  });
  const meqRows = FERTI_MACRO_PIVOT_ROWS.map(function (r) {
    return { label: r.label, pick: function (s) { return s.meq && s.meq[r.key]; } };
  });
  const pctRows = FERTI_MACRO_PIVOT_ROWS.map(function (r) {
    return { label: r.label, pick: function (s) { return s.pct && s.pct[r.key]; } };
  });
  const microRows = FERTI_MICRO_INSIGHT_NUTRIENTS.map(function (n) {
    return { label: n, pick: function (s) { return s.ppm && s.ppm[n]; } };
  });
  let html = '';
  chunks.forEach(function (chunk, chunkIdx) {
    const summaries = fertiCollectStageSummariesForReport(program, waterOx, chunk, true);
    const partSuffix = chunks.length > 1 ? '(parte ' + (chunkIdx + 1) + '/' + chunks.length + ')' : '';
    html += buildFertiInsightsPivotTableReport({
      title: 'Macro · ppm',
      unit: 'fertilizante + agua',
      decimals: 1,
      program: program,
      stageIndexes: chunk,
      summaries: summaries,
      waterArr: waterArr,
      rowDefs: ppmRows,
      partSuffix: partSuffix
    });
    html += buildFertiInsightsPivotTableReport({
      title: 'Macro · meq/L',
      unit: 'fertilizante + agua',
      decimals: 2,
      program: program,
      stageIndexes: chunk,
      summaries: summaries,
      waterArr: waterArr,
      rowDefs: meqRows,
      partSuffix: partSuffix
    });
    html += buildFertiInsightsPivotTableReport({
      title: 'Macro · % grupo',
      unit: 'fertilizante + agua',
      decimals: 1,
      program: program,
      stageIndexes: chunk,
      summaries: summaries,
      waterArr: waterArr,
      rowDefs: pctRows,
      partSuffix: partSuffix
    });
    html += buildFertiInsightsPivotTableReport({
      title: 'Micro · ppm',
      unit: 'fertilizante + agua',
      decimals: 2,
      program: program,
      stageIndexes: chunk,
      summaries: summaries,
      waterArr: waterArr,
      rowDefs: microRows,
      partSuffix: partSuffix
    });
  });
  return html;
}

function fertiReportDose(value, digits) {
  const ui = fertProgUI();
  const shown = ui ? ui.fromSI(value, 'dose_mass_area') : Number(value || 0);
  return fertiNum(shown, digits == null ? 2 : digits) + ' ' + (ui ? ui.unit('dose_mass_area') : 'kg/ha');
}

function fertiReportWater(value) {
  const ui = fertProgUI();
  const shown = ui ? ui.fromSI(value, 'volume_area') : Number(value || 0);
  return fertiNum(shown, 2) + ' ' + fertProgUnitToHtml('volume_area', 'm³/ha');
}

function renderFertiMacroIonicTableHtmlForReport(summary) {
  if (!summary || !summary.ppm) return '';
  const th = 'padding:6px 8px;border:1px solid #cbd5e1;background:#e2e8f0;font-size:11px;text-align:center;';
  const td = 'padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:right;';
  const tdL = 'padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:left;';
  const s = summary;
  return '<table style="width:100%;border-collapse:collapse;margin-top:6px;">' +
    '<thead><tr><th style="' + th + 'text-align:left;">Nutriente</th><th style="' + th + '">Dosis</th><th style="' + th + '">ppm</th><th style="' + th + '">meq/L</th><th style="' + th + '">% grupo</th></tr></thead><tbody>' +
    '<tr><td style="' + tdL + '">N-NO₃⁻</td><td style="' + td + '">' + fertiReportDose(s.kg.N_NO3) + '</td><td style="' + td + '">' + fertiNum(s.ppm.N_NO3, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.N_NO3, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.N_NO3, 1) + ' %</td></tr>' +
    '<tr><td style="' + tdL + '">P-H₂PO₄⁻</td><td style="' + td + '">' + fertiReportDose(s.kg.P) + '</td><td style="' + td + '">' + fertiNum(s.ppm.P, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.P, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.P, 1) + ' %</td></tr>' +
    '<tr><td style="' + tdL + '">S-SO₄²⁻</td><td style="' + td + '">' + fertiReportDose(s.kg.SO4) + '</td><td style="' + td + '">' + fertiNum(s.ppm.SO4, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.SO4, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.SO4, 1) + ' %</td></tr>' +
    '<tr><td style="' + tdL + '">Cl⁻</td><td style="' + td + '">' + fertiReportDose(s.kg.Cl) + '</td><td style="' + td + '">' + fertiNum(s.ppm.Cl, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.Cl, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.Cl, 1) + ' %</td></tr>' +
    '<tr style="background:#f8fafc;"><td style="' + tdL + 'font-weight:600;">K⁺</td><td style="' + td + '">' + fertiReportDose(s.kg.K) + '</td><td style="' + td + '">' + fertiNum(s.ppm.K, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.K, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.K, 1) + ' %</td></tr>' +
    '<tr><td style="' + tdL + '">Ca²⁺</td><td style="' + td + '">' + fertiReportDose(s.kg.Ca) + '</td><td style="' + td + '">' + fertiNum(s.ppm.Ca, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.Ca, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.Ca, 1) + ' %</td></tr>' +
    '<tr><td style="' + tdL + '">Mg²⁺</td><td style="' + td + '">' + fertiReportDose(s.kg.Mg) + '</td><td style="' + td + '">' + fertiNum(s.ppm.Mg, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.Mg, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.Mg, 1) + ' %</td></tr>' +
    '<tr><td style="' + tdL + '">N-NH₄⁺</td><td style="' + td + '">' + fertiReportDose(s.kg.N_NH4) + '</td><td style="' + td + '">' + fertiNum(s.ppm.N_NH4, 1) + ' ppm</td><td style="' + td + '">' + fertiNum(s.meq.N_NH4, 2) + ' meq/L</td><td style="' + td + '">' + fertiNum(s.pct.N_NH4, 1) + ' %</td></tr>' +
    '</tbody></table>' +
    '<div style="margin-top:8px;font-size:11px;color:#64748b;">N: NO₃ ' + fertiNum(s.nSplit.NO3, 1) + '% · NH₄ ' + fertiNum(s.nSplit.NH4, 1) + '% · Σ aniones ' + fertiNum(s.sumAnionsMeq, 2) + ' meq/L · Σ cationes ' + fertiNum(s.sumCationsMeq, 2) + ' meq/L · ' + fertProgT('ce_ref', 'CE ref') + ' ' + fertiNum(s.ceRefDsM, 2) + ' dS/m</div>';
}

function renderFertiMicroTableHtmlForReport(summary) {
  if (!summary || !summary.kg) return '';
  const th = 'padding:6px 8px;border:1px solid #cbd5e1;background:#e2e8f0;font-size:11px;text-align:center;';
  const td = 'padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:right;';
  const tdL = 'padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:left;';
  const rows = FERTI_MICRO_INSIGHT_NUTRIENTS.map(n =>
    '<tr><td style="' + tdL + '">' + n + '</td><td style="' + td + '">' + fertiReportDose(summary.kg[n], 2) + '</td><td style="' + td + '">' + fertiNum(summary.ppm && summary.ppm[n], 2) + ' ppm</td></tr>'
  ).join('');
  return '<table style="width:100%;border-collapse:collapse;margin-top:6px;"><thead><tr><th style="' + th + 'text-align:left;">Nutriente</th><th style="' + th + '">Dosis</th><th style="' + th + '">Concentración</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function buildFertiStageInsightsBlockForReport(program, waterOx, stageIndex, m3ha) {
  const week = program.weeks[stageIndex];
  const slotLabel = fertiStageSlotLabelFromProgram(program, stageIndex);
  const stageRaw = (week && (week.stage || week.label)) || '';
  const stageName = String(stageRaw ? fertProgStage(stageRaw) : fertProgT('stage', 'Etapa')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const summaryFert = getFertiStageIonicSummaryFromProgram(program, stageIndex, waterOx, { includeWater: false });
  const summaryWithWater = getFertiStageIonicSummaryFromProgram(program, stageIndex, waterOx, { includeWater: true });
  return `
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px dashed #cbd5e1;">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:10px;">
        <strong style="color:#0f766e;font-size:14px;">${slotLabel} · ${stageName}</strong>
        <span style="font-size:12px;color:#64748b;">${fertProgT('lamina', 'Lámina de riego:')} <strong>${fertiReportWater(m3ha)}</strong></span>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-weight:600;color:#166534;margin-bottom:10px;">${fertProgT('macro_summary', 'Macro resumen')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px;">
          <div style="background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:10px;">
            <div style="font-weight:600;color:#1e293b;font-size:13px;margin-bottom:4px;">${fertProgT('fertilizer_supply', 'Aporte de fertilizante')}</div>
            ${renderFertiMacroIonicTableHtmlForReport(summaryFert)}
          </div>
          <div style="background:#fff;border:1px solid #bae6fd;border-radius:8px;padding:10px;">
            <div style="font-weight:600;color:#0369a1;font-size:13px;margin-bottom:4px;">${fertProgT('fertilizer_water_supply', 'Fertilizante más aporte de agua')}</div>
            ${renderFertiMacroIonicTableHtmlForReport(summaryWithWater)}
          </div>
        </div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;">
        <div style="font-weight:600;color:#1d4ed8;margin-bottom:10px;">${fertProgT('micronutrients', 'Micronutrientes')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px;">
          <div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:10px;">
            <div style="font-weight:600;color:#1e293b;font-size:13px;margin-bottom:4px;">${fertProgT('fertilizer_supply', 'Aporte de fertilizante')}</div>
            ${renderFertiMicroTableHtmlForReport(summaryFert)}
          </div>
          <div style="background:#fff;border:1px solid #bae6fd;border-radius:8px;padding:10px;">
            <div style="font-weight:600;color:#0369a1;font-size:13px;margin-bottom:4px;">${fertProgT('fertilizer_water_supply', 'Fertilizante más aporte de agua')}</div>
            ${renderFertiMicroTableHtmlForReport(summaryWithWater)}
          </div>
        </div>
      </div>
    </div>`;
}

/**
 * HTML para PDF/reporte: ppm, meq/L y % por etapa según m³/ha capturados en Gráficas.
 * program.chartWaterByStageM3ha + program.waterContribution (o waterOx pasado).
 */
function buildFertiChartsInsightsHtmlForReport(program, waterOx, opts) {
  opts = opts || {};
  const isEn = opts.language === 'en';
  const rt = function (es, en) { return isEn ? en : es; };
  const weeks = Array.isArray(program && program.weeks) ? program.weeks : [];
  if (!weeks.length) return '';
  const waterArr = fertiNormalizeWaterM3haFromProgram(program);
  const stageIndexes = weeks.map((_, i) => i).filter(i => (waterArr[i] || 0) > 0);
  const volUnit = (typeof fertProgUI === 'function' && fertProgUI())
    ? fertProgUI().unit('volume_area')
    : 'm³/ha';
  const timeUnitLabel = program.timeUnit === 'mes' ? rt('mes', 'month') : rt('semana', 'week');
  if (!stageIndexes.length) {
    const idx = Math.max(0, Math.min(parseInt(program.chartSelectedStageIndex, 10) || 0, weeks.length - 1));
    const slotLabel = fertiStageSlotLabelFromProgram(program, idx);
    return `
      <div class="report-block" style="border-color:#fde68a;background:#fffbeb;">
        <div class="report-block-title">⚗️ ${rt('Relación ppm · meq/L · % (lámina de riego)', 'ppm · meq/L · % relationship (irrigation depth)')}</div>
        <div class="report-note" style="margin:0;">
          ${rt('Captura', 'Enter')} <strong>${volUnit}</strong> ${rt('de lámina en Dinámica Nutricional para cada', 'irrigation depth in Nutrient Dynamics for each')} ${timeUnitLabel} (e.g. ${slotLabel}).
          ${rt('Sin ese dato no se calculan ppm, meq/L ni % en el reporte.', 'Without that value, ppm, meq/L and % are not calculated in the report.')}
        </div>
      </div>`;
  }
  const waterSummary = stageIndexes.map(i =>
    `${fertiStageSlotLabelFromProgram(program, i)}: <strong>${fertiReportWater(waterArr[i])}</strong>`
  ).join(' · ');
  const useCompact = stageIndexes.length >= FERTI_REPORT_INSIGHTS_COMPACT_THRESHOLD;
  const stageBlocks = useCompact
    ? buildFertiChartsInsightsCompactHtmlForReport(program, waterOx, stageIndexes, waterArr)
    : stageIndexes.map(i =>
        buildFertiStageInsightsBlockForReport(program, waterOx, i, waterArr[i])
      ).join('');
  const introNote = useCompact
    ? `<p class="report-note" style="margin-top:0;margin-bottom:12px;">
        <strong>${rt('Vista compacta', 'Compact view')}</strong> (${stageIndexes.length} ${rt('etapas con lámina', 'stages with depth')}): ${rt('tablas cruzadas por nutriente.', 'cross tables by nutrient.')}
        ${rt('Base operativa:', 'Operating base:')} <strong>${rt('fertilizante + aporte de agua', 'fertilizer + water supply')}</strong>. ${rt('Lámina de riego:', 'Irrigation depth:')} ${waterSummary}.
        ${rt('Los % siguen la misma lógica que Dinámica Nutricional (triángulos N-P-S y K-Ca-Mg; Cl⁻ y N-NH₄⁺ aparte).', 'Percentages follow the same Nutrient Dynamics logic (N-P-S and K-Ca-Mg triangles; Cl⁻ and N-NH₄⁺ separate).')}
      </p>`
    : `<p class="report-note" style="margin-top:0;margin-bottom:12px;">
        ${rt('Lámina capturada en Dinámica Nutricional:', 'Depth captured in Nutrient Dynamics:')} ${waterSummary}.
      </p>`;
  return `
    <div class="report-block" style="border-color:#5eead4;background:#f0fdfa;">
      <div class="report-block-title">⚗️ ${rt('Relación ppm · meq/L · % (por lámina de riego)', 'ppm · meq/L · % relationship (by irrigation depth)')}</div>
      ${introNote}
      ${stageBlocks}
    </div>`;
}

function buildFertiSourceShareHtmlForReport(program, opts) {
  opts = opts || {};
  const isEn = opts.language === 'en';
  const rt = function (es, en) { return isEn ? en : es; };
  const weeks = Array.isArray(program && program.weeks) ? program.weeks : [];
  if (!weeks.length) return '';
  const elemental = opts.elemental === true;
  const programKg = fertiProgramSupplyOxideTotals(weeks);
  const granularKg = fertiGeneratorBaseMap(program && program.baseContribution);
  const heads = FERTI_SOURCE_SHARE_NUTS.map(function (n) {
    const color = fertProgNutrientColor(n.id);
    const label = elemental ? n.elemental : n.oxide;
    return '<th style="color:' + color + ';border-bottom:2px solid ' + color + ';">' + fertiEscapeInsightsLabel(label) + '</th>';
  }).join('');
  const fertiCells = FERTI_SOURCE_SHARE_NUTS.map(function (n) {
    const share = fertiSourceSharePct(programKg[n.id], granularKg[n.id]);
    return '<td>' + fertiFormatSourceSharePct(share.ferti) + '</td>';
  }).join('');
  const granularCells = FERTI_SOURCE_SHARE_NUTS.map(function (n) {
    const share = fertiSourceSharePct(programKg[n.id], granularKg[n.id]);
    return '<td>' + fertiFormatSourceSharePct(share.granular) + '</td>';
  }).join('');
  return `
    <div class="report-block" style="border-color:#5eead4;background:#f0fdfa;">
      <div class="report-block-title">${rt('Aporte fertirriego vs nutrición granular', 'Fertigation vs base granular supply')}</div>
      <p class="report-note" style="margin:0 0 8px;">${rt('Porcentaje del fertilizante aplicado en el ciclo (programa + granular). No incluye agua. El N granular es N total.', 'Share of fertilizer applied in the cycle (program + granular). Water is not included. Granular N is total N.')}</p>
      <div class="report-table-wrap">
        <table class="report-app-table">
          <thead><tr><th></th>${heads}</tr></thead>
          <tbody>
            <tr><td>${rt('Fertirriego', 'Fertigation')}</td>${fertiCells}</tr>
            <tr><td>${rt('Nutrición granular de base', 'Base granular nutrition')}</td>${granularCells}</tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

/**
 * Genera imágenes de las gráficas Macro/Micro desde datos del programa (para PDF sin depender del DOM).
 * program = { weeks: [{ totals: { N_NO3, N_NH4, ... } }], timeUnit: 'mes'|'semana' }
 * callback(result) con result = { macro: dataUrl, micro: dataUrl } o {} si falla.
 */
function getFertiChartsDataUrlsForReport(program, callback, reportOptions) {
  if (!program || !Array.isArray(program.weeks) || program.weeks.length === 0) {
    if (typeof callback === 'function') callback({});
    return;
  }
  const reportLang = reportOptions && reportOptions.language === 'en' ? 'en' : 'es';
  const reportUnits = reportOptions && reportOptions.unit_system === 'us_customary' ? 'us_customary' : 'metric';
  loadChartJs(function() {
    const buildCharts = function () {
    const weeks = program.weeks;
    const timeUnit = program.timeUnit || 'semana';
    const labels = weeks.map(function(w, i) { return fertiChartSlotLabelAtIndex(timeUnit, i, w); });
    const totalStages = labels.length;
    const reportTickRotation = totalStages >= 16 ? 48 : 38;
    const reportTickAutoSkip = totalStages >= 10;
    function mk(n) { return weeks.map(function(w) { return parseFloat(w.totals && w.totals[n]) || 0; }); }
    var macros = { N_NO3: mk('N_NO3'), N_NH4: mk('N_NH4'), P2O5: mk('P2O5'), K2O: mk('K2O'), CaO: mk('CaO'), MgO: mk('MgO'), SO4: mk('SO4') };
    var micros = { Fe: mk('Fe'), Mn: mk('Mn'), B: mk('B'), Zn: mk('Zn'), Cu: mk('Cu'), Mo: mk('Mo') };
    var macroColors = fertProgMacroColors();
    var microColors = fertProgMicroColors();
    var macroLabels = { P2O5: 'P2O5', K2O: 'K2O', CaO: 'CaO', MgO: 'MgO', SO4: 'SO4' };
    if (typeof fertiChartsElementalMode !== 'undefined' && fertiChartsElementalMode) {
      macros = {
        N_NO3: macros.N_NO3,
        N_NH4: macros.N_NH4,
        P2O5: macros.P2O5.map(function(v) { return v / FERTI_CONV.P2O5_TO_P; }),
        K2O: macros.K2O.map(function(v) { return v / FERTI_CONV.K2O_TO_K; }),
        CaO: macros.CaO.map(function(v) { return v / FERTI_CONV.CaO_TO_Ca; }),
        MgO: macros.MgO.map(function(v) { return v / FERTI_CONV.MgO_TO_Mg; }),
        SO4: macros.SO4.map(function(v) { return v / FERTI_CONV.SO4_TO_S; })
      };
      macroLabels = { P2O5: 'P', K2O: 'K', CaO: 'Ca', MgO: 'Mg', SO4: 'S' };
    }
    function present(series) { return fertProgChartDoseSeries(series); }
    var yTitle = fertProgChartYAxisTitle();
    var xTitle = fertProgT('stage', 'Etapa');
    var reportScaleOpts = {
      y: { beginAtZero: true, title: { display: true, text: yTitle } },
      x: { type: 'category', title: { display: true, text: xTitle }, ticks: { minRotation: reportTickRotation, maxRotation: reportTickRotation, autoSkip: reportTickAutoSkip, autoSkipPadding: 4 } }
    };
    var W = 480, H = 280;
    var macroCanvas = document.createElement('canvas');
    macroCanvas.width = W;
    macroCanvas.height = H;
    var microCanvas = document.createElement('canvas');
    microCanvas.width = W;
    microCanvas.height = H;
    macroCanvas.style.cssText = 'position:fixed;left:-9999px;top:0;';
    microCanvas.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(macroCanvas);
    document.body.appendChild(microCanvas);
    var chartMacro = null, chartMicro = null;
    var result = {};
    try {
      chartMacro = new Chart(macroCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'N(NO3)', data: present(macros.N_NO3), borderColor: macroColors.N_NO3, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'N(NH4)', data: present(macros.N_NH4), borderColor: macroColors.N_NH4, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.P2O5, data: present(macros.P2O5), borderColor: macroColors.P2O5, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.K2O, data: present(macros.K2O), borderColor: macroColors.K2O, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.CaO, data: present(macros.CaO), borderColor: macroColors.CaO, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.MgO, data: present(macros.MgO), borderColor: macroColors.MgO, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.SO4, data: present(macros.SO4), borderColor: macroColors.SO4, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { bottom: 48 } },
          plugins: {
            legend: {
              display: true,
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 10,
                boxHeight: 10
              }
            }
          },
          scales: reportScaleOpts
        }
      });
      chartMicro = new Chart(microCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Fe', data: present(micros.Fe), borderColor: microColors.Fe, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Mn', data: present(micros.Mn), borderColor: microColors.Mn, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'B', data: present(micros.B), borderColor: microColors.B, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Zn', data: present(micros.Zn), borderColor: microColors.Zn, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Cu', data: present(micros.Cu), borderColor: microColors.Cu, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Mo', data: present(micros.Mo), borderColor: microColors.Mo, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { bottom: 48 } },
          plugins: {
            legend: {
              display: true,
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 10,
                boxHeight: 10
              }
            }
          },
          scales: reportScaleOpts
        }
      });
      result.macro = (chartMacro && chartMacro.toBase64Image) ? chartMacro.toBase64Image() : macroCanvas.toDataURL('image/png');
      result.micro = (chartMicro && chartMicro.toBase64Image) ? chartMicro.toBase64Image() : microCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('getFertiChartsDataUrlsForReport:', e);
    }
    if (chartMacro) try { chartMacro.destroy(); } catch (e2) {}
    if (chartMicro) try { chartMicro.destroy(); } catch (e2) {}
    macroCanvas.remove();
    microCanvas.remove();
    if (typeof callback === 'function') callback(result);
    };
    var runBuild = buildCharts;
    if (window.NpFertigationUI && typeof window.NpFertigationUI.withLanguage === 'function') {
      var prevLangBuild = runBuild;
      runBuild = function () { return window.NpFertigationUI.withLanguage(reportLang, prevLangBuild); };
    }
    if (window.NpFertigationUI && typeof window.NpFertigationUI.withUnitSystem === 'function') {
      var prevUnitBuild = runBuild;
      runBuild = function () { return window.NpFertigationUI.withUnitSystem(reportUnits, prevUnitBuild); };
    }
    runBuild();
  });
}
window.getFertiChartsDataUrlsForReport = getFertiChartsDataUrlsForReport;
window.buildFertiChartsInsightsHtmlForReport = buildFertiChartsInsightsHtmlForReport;
window.buildFertiChartsInsightsCompactHtmlForReport = buildFertiChartsInsightsCompactHtmlForReport;
window.buildFertiSourceShareHtmlForReport = buildFertiSourceShareHtmlForReport;
window.FERTI_REPORT_INSIGHTS_COMPACT_THRESHOLD = FERTI_REPORT_INSIGHTS_COMPACT_THRESHOLD;

function toggleFertiChartsOxideElemental(){
  fertiChartsElementalMode = !fertiChartsElementalMode;
  const btn = document.getElementById('toggleFertiChartsModeBtn');
  if (btn) {
    btn.textContent = fertiChartsElementalMode
      ? fertProgT('oxide', '🔄 Ver en Óxido')
      : fertProgT('elemental', '🔄 Ver en Elemental');
  }
  updateFertiCharts();
}

// ===== Autosave (debounce) =====
let saveFertiProgTimer = null;
function scheduleSaveFertirriegoProgram(){
  try { if (saveFertiProgTimer) clearTimeout(saveFertiProgTimer); } catch {}
  saveFertiProgTimer = setTimeout(() => {
    try { saveFertirriegoProgram(); } catch (e) { console.warn('autosave fertirriegoProgram', e); }
  }, 500);
}

function markFertiProgDirty(){
  fertiProgDirty = true;
  scheduleSaveFertirriegoProgram();
}

function flushFertiProgramIfDirty(){
  try { if (fertiProgDirty) saveFertirriegoProgram(); } catch {}
}

// Guardado/carga del programa
function saveFertirriegoProgram() {
  try {
    // Evitar sobrescribir con estado vacío si el programa aún no se ha inicializado
    if (!fertiProgramInitialized && (!fertiWeeks || fertiWeeks.length === 0) && (!fertiColumns || fertiColumns.length === 0)) {
      console.warn('⚠️ Programa Fertirriego aún no inicializado - guardado omitido');
      return;
    }
    const pid = fertiGetUnifiedProjectId();
    if (!pid) {
      console.warn('⚠️ No hay proyecto seleccionado para guardar Programa Fertirriego');
      return;
    }
    
    // Sincronizar valores desde el DOM para no perder el último input
    syncFertiProgramFromDOM();
    
    fertiNormalizeChartWaterByStage();
    const payload = {
      weeks: fertiWeeks,
      columns: fertiColumns,
      timeUnit: fertiTimeUnit,
      mode: fertProgElementalMode,
      waterContribution: fertiWaterContributionOxide,
      waterAnalysisId: fertiWaterAnalysisId || '',
      baseContribution: fertiBaseContributionOxide,
      granularProgramLinked: fertiGranularProgramLinked === true,
      chartWaterByStageM3ha: Array.isArray(fertiChartWaterByStageM3ha) ? fertiChartWaterByStageM3ha.slice() : [],
      chartSelectedStageIndex: parseInt(fertiChartSelectedStageIndex, 10) || 0,
      chartLockedColumnIds: Array.isArray(fertiChartLockedColumnIds) ? fertiChartLockedColumnIds.slice() : [],
      generationMeta: fertiProgramGenerationMeta,
      timestamp: new Date().toISOString()
    };
    const useCentralized = typeof window.projectStorage !== 'undefined';
    let savedWithCentralized = false;
    
    if (useCentralized) {
      const existingSection = window.projectStorage.loadSection('fertirriego', pid) || {};
      const mergedSection = {
        ...existingSection,
        program: payload
      };
      
      savedWithCentralized = window.projectStorage.saveSection('fertirriego', mergedSection, pid);
      if (savedWithCentralized) {
        console.log('💾 Programa Fertirriego guardado (sistema centralizado):', { projectId: pid, weeksCount: fertiWeeks.length });
      } else {
        console.warn('⚠️ No se pudo guardar programa mediante projectStorage, usando fallback directo...');
      }
    }
    
    if (!savedWithCentralized) {
      // PRIORIDAD 2: Guardar en esquema unificado (nutriplant_project_<id>) como fallback
      const unifiedKey = `nutriplant_project_${pid}`;
      let unified = {};
      try {
        const raw = localStorage.getItem(unifiedKey);
        if (raw) unified = JSON.parse(raw);
      } catch {}
      
      // 🚀 CRÍTICO: Preservar location antes de actualizar
      const existingLocation = unified.location;
      const hasValidLocation = existingLocation && 
                              existingLocation.polygon && 
                              Array.isArray(existingLocation.polygon) && 
                              existingLocation.polygon.length >= 3;
      
      unified.fertirriego = unified.fertirriego || {};
      unified.fertirriego.program = payload;
      
      // 🚀 CRÍTICO: Restaurar location después de actualizar
      if (hasValidLocation) {
        unified.location = existingLocation;
      }
      
      localStorage.setItem(unifiedKey, JSON.stringify(unified));
      console.log('💾 Programa Fertirriego guardado en esquema unificado (fallback):', { projectId: pid, weeksCount: fertiWeeks.length });
    }
    
    // Guardado para compatibilidad con projectManager
    if (window.projectManager && window.projectManager.saveProjectData) {
      window.projectManager.saveProjectData('fertirriegoProgram', payload);
    }
    
    // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
    const k = `nutriplant_project_${pid}`;
    const pd = JSON.parse(localStorage.getItem(k) || '{}');
    const pdNew = { ...pd, fertirriegoProgram: payload };
    localStorage.setItem(k, JSON.stringify(pdNew));
    
    fertiProgDirty = false;
  } catch (e) { 
    console.error('❌ Error guardando Programa Fertirriego:', e); 
  }
}

function loadFertirriegoProgram() {
  try {
    const pid = fertiGetUnifiedProjectId();
    let data = null;
    
    // PRIORIDAD 1: Cargar desde esquema unificado (nutriplant_project_<id>)
    if (pid) {
      try {
        const unifiedKey = `nutriplant_project_${pid}`;
        const raw = localStorage.getItem(unifiedKey);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.fertirriego && o.fertirriego.program) {
            data = o.fertirriego.program;
            console.log('✅ Programa Fertirriego cargado desde esquema unificado');
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando desde unificado:', e);
      }
    }
    
    // PRIORIDAD 2: Fallback a projectManager
    if (!data && window.projectManager && window.projectManager.loadProjectData) {
      data = window.projectManager.loadProjectData('fertirriegoProgram');
      if (data) console.log('✅ Datos cargados desde ProjectManager');
    }
    
    // PRIORIDAD 3: Formato nuevo (fallback)
    if (!data && pid) { 
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const k = `nutriplant_project_${pid}`; 
      const pd = JSON.parse(localStorage.getItem(k) || '{}'); 
      data = pd.fertirriegoProgram;
      if (data) console.log('✅ Datos cargados desde formato nuevo');
    }
    
    // No usar fallback global aquí para evitar mezclar programas entre proyectos.
    if (data && data.weeks) { fertiWeeks = data.weeks; fertiWeekCounter = fertiWeeks.length+1; } else { fertiWeeks = []; fertiWeekCounter = 1; }
    if (data && typeof data.mode === 'boolean') {
      fertProgElementalMode = data.mode;
      fertiProgModeInitialized = true;
    } else {
      syncFertiProgramModeOnce();
    }
    // CRÍTICO: Solo usar columnas guardadas si existen, NO sobrescribir con predefinidas
    if (data && Array.isArray(data.columns) && data.columns.length > 0) {
      fertiColumns = data.columns;
      console.log('✅ Columnas cargadas desde datos guardados:', fertiColumns.length);
    } else {
      // Solo crear columnas predefinidas si NO hay datos guardados
      fertiColumns = [ { id:'col_def_1', materialId:'sop' }, { id:'col_def_2', materialId:'nks' }, { id:'col_def_3', materialId:'mkp' }, { id:'col_def_4', materialId:'nitrato_calcio_granular' } ];
      console.log('ℹ️ No hay columnas guardadas - usando predefinidas');
    }
    fertiTimeUnit = (typeof pickFertiSharedTimeUnit === 'function')
      ? pickFertiSharedTimeUnit(
          (function () {
            try {
              const host = document.getElementById('fertiDistribucionBlock');
              if (host && host.dataset.ready === '1' && typeof window.fertiDistGetAxis === 'function') {
                return { axis: window.fertiDistGetAxis(), updatedAt: Date.now() };
              }
              if (typeof window.fertiDistGetStoredState === 'function') return window.fertiDistGetStoredState();
            } catch (e) {}
            return null;
          })(),
          data || {}
        )
      : ((data && data.timeUnit === 'mes') ? 'mes' : 'semana');
    if (typeof window.fertiDistSyncTimeUnit === 'function') {
      window.fertiDistSyncTimeUnit(fertiTimeUnit);
    }
    fertiChartWaterByStageM3ha = (data && Array.isArray(data.chartWaterByStageM3ha)) ? data.chartWaterByStageM3ha.slice() : [];
    fertiChartSelectedStageIndex = (data && Number.isInteger(data.chartSelectedStageIndex)) ? data.chartSelectedStageIndex : 0;
    fertiChartLockedColumnIds = (data && Array.isArray(data.chartLockedColumnIds))
      ? data.chartLockedColumnIds.filter(id => fertiColumns.some(c => c.id === id))
      : [];
    try { fertiEnsureWaterAcidColumnsLocked(); } catch (eLock) {}
    fertiProgramGenerationMeta = data && data.generationMeta && typeof data.generationMeta === 'object'
      ? data.generationMeta
      : null;
    fertiProgramGenerationDiagnostics = fertiProgramGenerationMeta && Array.isArray(fertiProgramGenerationMeta.diagnostics)
      ? fertiProgramGenerationMeta.diagnostics
      : null;
    if (data && data.waterContribution) {
      fertiWaterContributionOxide = { ...fertiWaterContributionOxide, ...data.waterContribution };
    } else {
      // Proyecto nuevo o sin aporte por agua guardado: no mostrar valores de otro proyecto
      fertiWaterContributionOxide = { N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0, Cl: 0 };
    }
    fertiWaterAnalysisId = (data && data.waterAnalysisId) ? String(data.waterAnalysisId) : '';
    if (data && data.baseContribution) {
      fertiBaseContributionOxide = { ...fertiBaseContributionOxide, ...data.baseContribution };
    } else {
      fertiBaseContributionOxide = { N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0, Cl: 0 };
    }
    fertiGranularProgramLinked = !!(data && data.granularProgramLinked);
    fertiWeeks.forEach(w => { if (!w.kgByCol) w.kgByCol = {}; fertiColumns.forEach(c => { if (w.kgByCol[c.id] == null) w.kgByCol[c.id] = 0; }); });
    fertiNormalizeChartWaterByStage();
    try { fertiSyncProgramAcidFromLamina(); } catch (eAcidLoad) {}
    try {
      if (typeof window.fertiAdoptDistributionFromProgram === 'function') {
        window.fertiAdoptDistributionFromProgram({ auto: true });
      }
    } catch (eAdopt) {}
    updateFertiProgramModeButtons();
    if (fertiWeeks.length === 0) addFertiWeek(); else { renderFertiWeeks(); updateFertiSummary(); }
    renderFertiAutomaticProgramStatus();
    fertiProgramInitialized = true;
    if (typeof window !== 'undefined') {
      window.fertiProgramInitialized = true;
    }
  } catch (e) { console.error('loadFertirriegoProgram', e); addFertiWeek(); }
}

function initFertirriegoProgramUI() {
  // Reinicio base para evitar arrastre visual/lógico entre proyectos.
  fertiProgramInitialized = false;
  fertiWeeks = [];
  fertiWeekCounter = 1;
  fertiColumns = [];
  fertiTimeUnit = 'semana';
  fertiChartWaterByStageM3ha = [];
  fertiChartSelectedStageIndex = 0;
  fertiChartEditMode = false;
  fertiChartLockedColumnIds = [];
  fertiChartUndoSnapshot = null;
  fertiChartEditBaseline = null;
  fertiActiveChartDrag = null;
  fertiProgramGenerationMeta = null;
  fertiProgramGenerationDiagnostics = null;
  fertiWaterContributionOxide = {
    N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0,
    Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0, Cl: 0
  };
  fertiWaterAnalysisId = '';
  fertiBaseContributionOxide = {
    N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0,
    Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0, Cl: 0
  };
  fertiGranularProgramLinked = false;
  fertiProgDirty = false;

  // Vincular eventos globales
  window.addFertiWeek = addFertiWeek;
  window.removeFertiWeek = removeFertiWeek;
  window.addFertiColumn = addFertiColumn;
  window.removeFertiColumn = removeFertiColumn;
  window.onFertiColumnMaterialChange = onFertiColumnMaterialChange;
  window.onWeekKgChange = onWeekKgChange;
  window.onChangeFertiStage = onChangeFertiStage;
  window.saveFertirriegoProgram = saveFertirriegoProgram;
  window.setFertiNutrientView = setFertiNutrientView;
  window.updateFertiSummary = updateFertiSummary;
  window.fertiComputeProgramTotalCostUsdHa = fertiComputeProgramTotalCostUsdHa;
  window.updateFertiCharts = updateFertiCharts;
  window.resizeFertiCharts = resizeFertiCharts;
  window.getAllFertiMaterials = getAllFertiMaterials;
  window.getBaseFertiMaterials = getBaseFertiMaterials;
  window.openFertiNewMaterialModal = openFertiNewMaterialModal;
  window.openFertiPreloadedCatalogModal = openFertiPreloadedCatalogModal;
  window.renderFertiCustomMaterialsList = renderFertiCustomMaterialsList;
  window.removeFertiCustomMaterial = removeFertiCustomMaterial;
  window.clearFertiCustomMaterials = clearFertiCustomMaterials;
  window.openEditFertiCustomMaterial = openEditFertiCustomMaterial;
  window.toggleFertiChartsOxideElemental = toggleFertiChartsOxideElemental;
  window.onFertiChartStageSelect = onFertiChartStageSelect;
  window.toggleFertiChartEditMode = toggleFertiChartEditMode;
  window.toggleFertiChartColumnLock = toggleFertiChartColumnLock;
  window.undoFertiChartAdjustment = undoFertiChartAdjustment;
  window.restoreFertiChartEditBaseline = restoreFertiChartEditBaseline;
  window.loadFertiCustomMaterials = loadFertiCustomMaterials;
  window.loadFertirriegoProgram = loadFertirriegoProgram;
  window.renderFertiWeeks = renderFertiWeeks;
  window.flushFertiProgramIfDirty = flushFertiProgramIfDirty;
  window.fertiRefreshWaterAnalysisSelect = fertiRefreshWaterAnalysisSelect;
  window.fertiApplyWaterAnalysisById = fertiApplyWaterAnalysisById;
  window.openFertiAutoProgramModal = openFertiAutoProgramModal;
  window.closeFertiAutoProgramModal = closeFertiAutoProgramModal;
  window.fertiRenderAcidSummary = fertiRenderAcidSummary;
  if (!window._fertiAcidDistBound) {
    window._fertiAcidDistBound = true;
    window.addEventListener('np:ferti-distribution-changed', function () {
      try { fertiRenderAcidSummary(); } catch (e) {}
      try {
        if (fertiSyncProgramAcidFromLamina()) {
          renderFertiWeeks();
          updateFertiSummary();
        }
      } catch (e2) {}
    });
  }
  // Cargar primero desde localStorage (sin esperar nube) para que el aporte del programa aparezca al instante
  function paintProgramNow() {
    doLoadFertiCustomMaterials();
    renderFertiCustomMaterialsList();
    loadFertirriegoProgram();
    initFertiWaterInputs();
    try { if (fertiProgAutoTimer) clearInterval(fertiProgAutoTimer); } catch {}
    fertiProgAutoTimer = setInterval(function() { if (fertiProgDirty) { try { saveFertirriegoProgram(); } catch {} } }, 20000);
    window.addEventListener('beforeunload', function() { try { if (fertiProgDirty) saveFertirriegoProgram(); } catch {} });
    setFertiNutrientView(fertiNutrientView);
    try {
      if (!fertiWeeks || fertiWeeks.length === 0) addFertiWeek(); else renderFertiWeeks();
      updateFertiSummary();
    } catch (e) {}
  }
  paintProgramNow();
  // Traer materiales desde la nube en segundo plano; al terminar refrescar por si hay nuevos
  var loadPromise = ensureFertiCustomMaterialsLoadedFromCloud();
  if (loadPromise && typeof loadPromise.then === 'function') {
    loadPromise.then(function() {
      doLoadFertiCustomMaterials();
      renderFertiCustomMaterialsList();
      loadFertirriegoProgram();
      if (!fertiWeeks || fertiWeeks.length === 0) addFertiWeek(); else renderFertiWeeks();
      updateFertiSummary();
    }).catch(function() {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('⚪ fertirriego-program-functions.js cargado');
  try {
    const container = document.getElementById('fertiWeeksContainer');
    if (container && typeof window.initFertirriegoProgramUI === 'function') {
      // Auto-inicializar si el contenedor ya está presente en el DOM
      window.initFertirriegoProgramUI();
    }
  } catch {}
});

window.addEventListener('np:ferti-distribution-changed', function () {
  try { renderFertiAutomaticProgramStatus(); } catch {}
  try { renderFertiChartsInsights(); } catch {}
});

document.addEventListener('projectChanged', () => {
  // Limpiar estado runtime para impedir arrastre visual/lógico entre proyectos
  fertiProgramInitialized = false;
  fertiWeeks = [];
  fertiWeekCounter = 1;
  fertiColumns = [];
  fertiTimeUnit = 'semana';
  fertiChartEditMode = false;
  fertiChartLockedColumnIds = [];
  fertiChartUndoSnapshot = null;
  fertiChartEditBaseline = null;
  fertiActiveChartDrag = null;
  fertiBaseContributionOxide = {
    N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0,
    Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0, Cl: 0
  };
  fertiGranularProgramLinked = false;
  fertiProgDirty = false;
  if (typeof window !== 'undefined') window.fertiProgramInitialized = false;
  try {
    if (document.getElementById('fertiWeeksContainer')) {
      setTimeout(() => {
        loadFertirriegoProgram();
      }, 80);
    }
  } catch (e) {
    console.warn('projectChanged fertirriego-program:', e);
  }
});


// ========= Modal: Nuevo fertilizante soluble =========
function openFertiNewMaterialModal() {
  try { const existing = document.querySelector('.material-modal-overlay'); if (existing) existing.remove(); } catch {}

  const api = fertiGetPriceApi();
  const priceUnit = api ? api.priceUnitLabel() : 'USD/t';
  const overlay = document.createElement('div');
  overlay.className = 'material-modal-overlay';
  overlay.innerHTML = `
    <div class="material-modal">
      <div class="modal-header">
        <h3 style="margin:0;display:flex;align-items:center;gap:8px;">${fertProgT('new_material_title', '➕ Nueva Materia Prima Personalizada')}</h3>
        <button class="btn btn-secondary btn-sm" onclick="this.closest('.material-modal-overlay').remove()">✕</button>
      </div>
      <div class="material-modal-body">
        <div class="form-group">
          <label>${fertProgT('material_name', 'Nombre de la Materia Prima:')}</label>
          <input type="text" id="fertiCustom_name" placeholder="${fertProgT('material_name_ph', 'Ej: Nitrato de Calcio')}">
        </div>
        <div class="form-group">
          <label>${fertProgT('price_label', 'Precio')} (${priceUnit}):</label>
          <input type="number" id="fertiCustom_price" min="0" step="0.01" placeholder="0.00" style="max-width:180px;">
        </div>
        <div class="form-group">
          <label>${fertProgT('nutrient_concentration', 'Concentración de Nutrientes (%):')}</label>
          <div class="nutrient-inputs-grid">
            <div class="nutrient-input"><label>N(NO3):</label><input type="number" id="fertiCustom_N_NO3" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>N(NH4):</label><input type="number" id="fertiCustom_N_NH4" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>P₂O₅:</label><input type="number" id="fertiCustom_P2O5" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>K₂O:</label><input type="number" id="fertiCustom_K2O" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>CaO:</label><input type="number" id="fertiCustom_CaO" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>MgO:</label><input type="number" id="fertiCustom_MgO" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label title="% masa ión SO₄²⁻ en el producto (incluye equivalencia si había S en datos antiguos al editar).">SO₄:</label><input type="number" id="fertiCustom_SO4" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label title="% masa de cloro (Cl) en el producto; para macro iónico en gráficas (meq/L = ppm Cl / 35,45).">Cl⁻:</label><input type="number" id="fertiCustom_Cl" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>Fe:</label><input type="number" id="fertiCustom_Fe" step="0.001" placeholder="0.000"></div>
            <div class="nutrient-input"><label>Mn:</label><input type="number" id="fertiCustom_Mn" step="0.001" placeholder="0.000"></div>
            <div class="nutrient-input"><label>B:</label><input type="number" id="fertiCustom_B" step="0.001" placeholder="0.000"></div>
            <div class="nutrient-input"><label>Zn:</label><input type="number" id="fertiCustom_Zn" step="0.001" placeholder="0.000"></div>
            <div class="nutrient-input"><label>Cu:</label><input type="number" id="fertiCustom_Cu" step="0.001" placeholder="0.000"></div>
            <div class="nutrient-input"><label>Mo:</label><input type="number" id="fertiCustom_Mo" step="0.001" placeholder="0.000"></div>
            <div class="nutrient-input"><label>SiO₂:</label><input type="number" id="fertiCustom_SiO2" step="0.01" placeholder="0.00"></div>
          </div>
        </div>
        <div class="form-group">
          <label>${fertProgT('custom_solubles', 'Fertilizantes solubles personalizados (fertirriego ↔ hidroponía):')}</label>
          <p style="margin:4px 0 6px 0;font-size:0.82rem;color:#64748b;">${fertProgT('shared_soluble_help', 'Mismo catálogo soluble: lo que agregues aquí también aparece en Hidroponía, y viceversa.')}</p>
          <div id="fertiCustomMaterialsList" style="margin-top:6px;"></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
            <button class="btn btn-info btn-sm" onclick="openFertiPreloadedCatalogModal()" title="${fertProgT('view_available_title', 'Consultar concentraciones de fertilizantes precargados')}">📋 ${fertProgT('view_available', 'Ver fertilizantes disponibles')}</button>
            <button class="btn btn-secondary btn-sm" onclick="clearFertiCustomMaterials()">🧹 ${fertProgT('clear_catalog', 'Limpiar catálogo')}</button>
          </div>
        </div>
        <div class="material-modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.material-modal-overlay').remove()">${fertProgT('cancel', 'Cancelar')}</button>
          <button class="btn btn-primary" id="fertiCustom_saveBtn">${fertProgT('add_material', 'Agregar Materia Prima')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.dataset.editMode = 'false';
  overlay.dataset.editKey = '';
  fertiImportSharedHydroCustoms();
  renderFertiCustomMaterialsList();

  // Guardar
  overlay.querySelector('#fertiCustom_saveBtn').addEventListener('click', () => {
    if (overlay.dataset.editMode === 'true') {
      updateFertiCustomMaterial(overlay);
      return;
    }
    const getNum = id => { const v = parseFloat(overlay.querySelector('#'+id).value); return isNaN(v) ? 0 : Math.max(0, v); };
    const name = (overlay.querySelector('#fertiCustom_name').value || '').trim();
    if (!name) { if (window.showMessage) window.showMessage(fertProgT('name_required', 'Escribe un nombre'), 'warning'); return; }
    const mat = {
      id: 'custom_' + Date.now(),
      name,
      N_NO3: getNum('fertiCustom_N_NO3'),
      N_NH4: getNum('fertiCustom_N_NH4'),
      P2O5: getNum('fertiCustom_P2O5'),
      K2O: getNum('fertiCustom_K2O'),
      CaO: getNum('fertiCustom_CaO'),
      MgO: getNum('fertiCustom_MgO'),
      SO4: getNum('fertiCustom_SO4'),
      Cl: getNum('fertiCustom_Cl'),
      S: 0,
      Fe: getNum('fertiCustom_Fe'),
      Mn: getNum('fertiCustom_Mn'),
      Zn: getNum('fertiCustom_Zn'),
      Cu: getNum('fertiCustom_Cu'),
      B: getNum('fertiCustom_B'),
      Mo: getNum('fertiCustom_Mo'),
      SiO2: getNum('fertiCustom_SiO2'),
      priceUsdPerTonne: (function () {
        const priceApi = fertiGetPriceApi();
        const el = overlay.querySelector('#fertiCustom_price');
        const raw = el ? el.value : '';
        return priceApi ? priceApi.fromDisplayPrice(raw) : (parseFloat(raw) || 0);
      })()
    };

    // Siempre al catálogo de usuario (o fallback si no hay sesión) para que persista y aparezca en el programa
    fertiCustomMaterialsUser = upsertFertiMaterial(fertiCustomMaterialsUser, mat, 'user');
    saveFertiCustomMaterialsToUser();
    mergeFertiCustomMaterials();
    fertiPushCustomToHydroCatalog(mat);
    renderFertiWeeks();
    renderFertiCustomMaterialsList();
    if (window.showMessage) window.showMessage(fertProgT('fertilizer_added', '✅ Fertilizante agregado'), 'success');
    overlay.remove();
  });
}


