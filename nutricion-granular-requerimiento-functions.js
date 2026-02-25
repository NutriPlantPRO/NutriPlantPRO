// =====================================================
// NUTRICIÓN GRANULAR - REQUERIMIENTO NUTRICIONAL
// =====================================================

// Base de datos de extracción por tonelada de cultivos
const GRANULAR_CROP_EXTRACTION_DB = {
  'maiz': { N: 18, P2O5: 4, K2O: 16, CaO: 2, MgO: 1, S: 0, SO4: 6, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
  // Caña (ajustado a referencia por tonelada)
  // S expresado como SO4 (0.50 S → ≈1.50 SO4)
  'cana': { N: 1.81, P2O5: 0.36, K2O: 2.11, CaO: 0.91, MgO: 0.42, S: 0, SO4: 1.50, Fe: 0.0375, Mn: 0.0155, B: 0.00074, Zn: 0.0062, Cu: 0.0022, Mo: 0.0, SiO2: 0 },
  'aguacate': { N: 9, P2O5: 4, K2O: 16, CaO: 8, MgO: 4, S: 0, SO4: 10, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
  'limon': { N: 10, P2O5: 3.5, K2O: 18, CaO: 12, MgO: 3, S: 0, SO4: 7.5, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.15, Cu: 0.015, Mo: 0.03, SiO2: 0 },
  'banano': { N: 4, P2O5: 1.2, K2O: 12, CaO: 0.8, MgO: 0.5, S: 0, SO4: 0.9, Fe: 0.015, Mn: 0.012, B: 0.008, Zn: 0.03, Cu: 0.002, Mo: 0.005, SiO2: 0 },
  'trigo': { N: 25, P2O5: 10, K2O: 18, CaO: 3, MgO: 2, S: 0, SO4: 12, Fe: 0.15, Mn: 0.12, B: 0.08, Zn: 0.25, Cu: 0.02, Mo: 0.06, SiO2: 0 },
  'sorgo': { N: 35, P2O5: 12, K2O: 25, CaO: 4, MgO: 3, S: 0, SO4: 15, Fe: 0.2, Mn: 0.15, B: 0.1, Zn: 0.35, Cu: 0.025, Mo: 0.08, SiO2: 0 },
  'arroz': { N: 15, P2O5: 6, K2O: 12, CaO: 1.5, MgO: 1, S: 0, SO4: 6, Fe: 0.1, Mn: 0.08, B: 0.06, Zn: 0.2, Cu: 0.015, Mo: 0.04, SiO2: 0 },
  'cebada': { N: 20, P2O5: 8, K2O: 15, CaO: 2.5, MgO: 1.5, S: 0, SO4: 10.5, Fe: 0.12, Mn: 0.1, B: 0.07, Zn: 0.22, Cu: 0.018, Mo: 0.05, SiO2: 0 }
};

// 🚀 CRÍTICO: Base de datos ORIGINAL de extracción (sin modificar por overrides)
// Esta constante mantiene los valores predefinidos originales para comparar correctamente
// cuando se guardan extractionOverrides
const ORIGINAL_GRANULAR_CROP_EXTRACTION_DB = {
  'maiz': { N: 18, P2O5: 4, K2O: 16, CaO: 2, MgO: 1, S: 0, SO4: 6, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
  'cana': { N: 1.81, P2O5: 0.36, K2O: 2.11, CaO: 0.91, MgO: 0.42, S: 0, SO4: 1.50, Fe: 0.0375, Mn: 0.0155, B: 0.00074, Zn: 0.0062, Cu: 0.0022, Mo: 0.0, SiO2: 0 },
  'aguacate': { N: 9, P2O5: 4, K2O: 16, CaO: 8, MgO: 4, S: 0, SO4: 10, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
  'limon': { N: 10, P2O5: 3.5, K2O: 18, CaO: 12, MgO: 3, S: 0, SO4: 7.5, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.15, Cu: 0.015, Mo: 0.03, SiO2: 0 },
  'banano': { N: 4, P2O5: 1.2, K2O: 12, CaO: 0.8, MgO: 0.5, S: 0, SO4: 0.9, Fe: 0.015, Mn: 0.012, B: 0.008, Zn: 0.03, Cu: 0.002, Mo: 0.005, SiO2: 0 },
  'trigo': { N: 25, P2O5: 10, K2O: 18, CaO: 3, MgO: 2, S: 0, SO4: 12, Fe: 0.15, Mn: 0.12, B: 0.08, Zn: 0.25, Cu: 0.02, Mo: 0.06, SiO2: 0 },
  'sorgo': { N: 35, P2O5: 12, K2O: 25, CaO: 4, MgO: 3, S: 0, SO4: 15, Fe: 0.2, Mn: 0.15, B: 0.1, Zn: 0.35, Cu: 0.025, Mo: 0.08, SiO2: 0 },
  'arroz': { N: 15, P2O5: 6, K2O: 12, CaO: 1.5, MgO: 1, S: 0, SO4: 6, Fe: 0.1, Mn: 0.08, B: 0.06, Zn: 0.2, Cu: 0.015, Mo: 0.04, SiO2: 0 },
  'cebada': { N: 20, P2O5: 8, K2O: 15, CaO: 2.5, MgO: 1.5, S: 0, SO4: 10.5, Fe: 0.12, Mn: 0.1, B: 0.07, Zn: 0.22, Cu: 0.018, Mo: 0.05, SiO2: 0 }
};

// Eficiencia predeterminada para nutrición granular (diferente a fertirriego)
const GRANULAR_DEFAULT_EFFICIENCY = {
  N: 65, P2O5: 40, K2O: 85, CaO: 85, MgO: 85, S: 85, SO4: 85, 
  Fe: 80, Mn: 80, B: 80, Zn: 80, Cu: 80, Mo: 80, SiO2: 85
};

// Variable global para el modo de visualización
let isGranularRequerimientoElementalMode = false;
// 🚀 CRÍTICO: Exponer en window para acceso global y evitar sobrescrituras prematuras
window.isGranularRequerimientoElementalMode = false;
window.granularElementalModeLoaded = false;

// Factores de conversión (mismo que fertirriego)
const GRANULAR_CONVERSION_FACTORS = {
  P2O5_TO_P: 2.291,
  P_TO_P2O5: 2.291,
  K2O_TO_K: 1.204,
  K_TO_K2O: 1.204,
  CaO_TO_Ca: 1.399,
  Ca_TO_CaO: 1.399,
  MgO_TO_Mg: 1.658,
  Mg_TO_MgO: 1.658,
  SiO2_TO_Si: 2.139,
  Si_TO_SiO2: 2.139
};

// ====== Autosave y estado sucio (dirty) ======
let granularReqDirty = false;
let granularReqAutosaveInterval = null;
// CRÍTICO: Bandera para evitar recálculos automáticos durante la carga de valores guardados
let isGranularLoading = false;
function flushGranularRequirementsIfDirty(){
  try {
    if (granularReqDirty) {
      saveGranularRequirements();
      granularReqDirty = false;
    }
  } catch (e) { console.warn('flushGranularRequirementsIfDirty', e); }
}

// ==== Utilidades de almacenamiento unificado (formato Enmienda) ====
function granGetUnifiedProjectId(){
  try { if (window.projectManager && window.projectManager.getCurrentProject) { const p = window.projectManager.getCurrentProject(); if (p && p.id) return p.id; } } catch {}
  try { if (window.currentProject && window.currentProject.id) return window.currentProject.id; } catch {}
  try { const pid = localStorage.getItem('nutriplant-current-project'); if (pid) return pid; } catch {}
  return null;
}
function granUnifiedKey(){ const id = granGetUnifiedProjectId(); return id ? `nutriplant_project_${id}` : null; }
function granUnifiedMerge(updater){
  try {
    const key = granUnifiedKey(); if (!key) return;
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
  } catch(e){ console.warn('granUnifiedMerge error', e); }
}

// Función para alternar entre óxido y elemental
function toggleGranularRequerimientoOxideElemental() {
  isGranularRequerimientoElementalMode = !isGranularRequerimientoElementalMode;
  window.isGranularRequerimientoElementalMode = isGranularRequerimientoElementalMode;
  window.granularElementalModeLoaded = true;
  const btn = document.getElementById('toggleGranularRequerimientoOxideElementalBtn');
  if (btn) {
    btn.textContent = isGranularRequerimientoElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental';
  }
  calculateGranularNutrientRequirements();
  if (typeof window.saveGranularRequirementsImmediate === 'function') {
    window.saveGranularRequirementsImmediate();
  } else {
    scheduleSaveGranularRequirements();
  }
}
// Exponer
window.toggleGranularRequerimientoOxideElemental = toggleGranularRequerimientoOxideElemental;

// Función para obtener etiqueta según modo
function getGranularLabel(nutrient) {
  if (!isGranularRequerimientoElementalMode) {
    return nutrient;
  }
  const labels = {
    'P2O5': 'P', 'K2O': 'K', 'CaO': 'Ca', 'MgO': 'Mg', 'SiO2': 'Si'
  };
  return labels[nutrient] || nutrient;
}

// Función para convertir valor para visualización
function getGranularConvertedValue(nutrient, value) {
  if (!isGranularRequerimientoElementalMode) {
    return parseFloat(value).toFixed(2);
  }
  const factor = {
    'P2O5': GRANULAR_CONVERSION_FACTORS.P2O5_TO_P,
    'K2O': GRANULAR_CONVERSION_FACTORS.K2O_TO_K,
    'CaO': GRANULAR_CONVERSION_FACTORS.CaO_TO_Ca,
    'MgO': GRANULAR_CONVERSION_FACTORS.MgO_TO_Mg,
    'SiO2': GRANULAR_CONVERSION_FACTORS.SiO2_TO_Si
  }[nutrient];
  if (factor) {
    return (parseFloat(value) / factor).toFixed(2);
  }
  return parseFloat(value).toFixed(2);
}

// FUNCIÓN DUPLICADA ELIMINADA - Usar la función calculateGranularNutrientRequirements de la línea 1109 que es más completa

// Variable global para almacenar valores guardados del usuario
let savedGranularAdjustments = null;
let savedGranularEfficiencies = null;
let savedGranularExtractionOverrides = {}; // 🚀 CRÍTICO: Variable global para extractionOverrides (igual que Ajuste y Eficiencia)
let savedGranularAdjustmentsAuto = true;
let lastGranularCalculatedCrop = null;
let lastGranularCalculatedYield = null;

function calculateGranularNutrientRequirements(options = {}) {
  try {
    const cropSelect = document.getElementById('granularRequerimientoCropType');
    const yieldInput = document.getElementById('granularRequerimientoTargetYield');
    if (!cropSelect || !yieldInput) {
      console.warn('⚠️ Granular: no se encontraron inputs principales al calcular');
      return;
    }

    const {_isLoading = false} = options;
    isGranularLoading = _isLoading;

    const defaultCrop = Object.keys(GRANULAR_CROP_EXTRACTION_DB)[0];
    let cropType = options.cropType ?? cropSelect.value ?? defaultCrop;
    if (!cropType) cropType = defaultCrop;
    if (!GRANULAR_CROP_EXTRACTION_DB[cropType]) {
      console.warn('⚠️ Granular: no hay datos de extracción para', cropType);
      return;
    }

    if (options.cropType && cropSelect.value !== options.cropType) {
      const prev = cropSelect.getAttribute('onchange');
      cropSelect.removeAttribute('onchange');
      cropSelect.value = options.cropType;
      if (prev) cropSelect.setAttribute('onchange', prev);
    }

    let targetYield = options.targetYield;
    if (typeof targetYield !== 'number' || Number.isNaN(targetYield)) {
      targetYield = parseFloat(yieldInput.value) || 10;
    }
    if (options.targetYield != null && parseFloat(yieldInput.value) !== options.targetYield) {
      const prev = yieldInput.getAttribute('onchange');
      yieldInput.removeAttribute('onchange');
      yieldInput.value = options.targetYield;
      if (prev) yieldInput.setAttribute('onchange', prev);
    }

    if (!options.adjustment && lastGranularCalculatedCrop && lastGranularCalculatedCrop !== cropType) {
      savedGranularAdjustments = null;
      savedGranularEfficiencies = null;
      savedGranularAdjustmentsAuto = true;
    }

    // 🚀 CRÍTICO: NO mutar GRANULAR_CROP_EXTRACTION_DB
    // Crear finalExtraction fusionando base + overrides en cada cálculo/render
    const baseExtraction = {...GRANULAR_CROP_EXTRACTION_DB[cropType]};
    let extractionOverrides = {};
    
    // 🚀 CRÍTICO: PRIORIDAD 0: Si vienen en options (valores pasados explícitamente)
    if (options.extractionOverrides && typeof options.extractionOverrides === 'object') {
      extractionOverrides = options.extractionOverrides;
      console.log('✅ extractionOverrides desde options (pasados explícitamente):', Object.keys(extractionOverrides));
    }
    
    // Cargar extractionOverrides guardados desde storage (PRIORIDAD 2)
    if (!options._skipLoadFromStorage && !Object.keys(extractionOverrides).length) {
      try {
        const projectId = getCurrentProjectId();
        if (projectId && window.projectStorage) {
          const granularSection = window.projectStorage.loadSection('granular', projectId);
          if (granularSection && granularSection.requirements && granularSection.requirements.extractionOverrides) {
            extractionOverrides = granularSection.requirements.extractionOverrides;
          }
        }
        if (!Object.keys(extractionOverrides).length) {
          // Fallback: localStorage directo
          const unifiedKey = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
            const o = JSON.parse(raw);
            if (o && o.granular && o.granular.requirements && o.granular.requirements.extractionOverrides) {
              extractionOverrides = o.granular.requirements.extractionOverrides;
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando extractionOverrides en calculateGranularNutrientRequirements:', e);
      }
    }
    
    // 🚀 CRÍTICO: Mismo patrón que adjustment/efficiency (líneas 336-337, 350-351)
    // PRIORIDAD 1: savedGranularExtractionOverrides (variable global - valores más recientes)
    // PRIORIDAD 2: extractionOverrides desde options/storage (valores guardados)
    // PRIORIDAD 3: baseExtraction (valores precargados del cultivo)
    const finalExtraction = {...baseExtraction};
    
    // PRIORIDAD 1: Variable global (valores modificados recientemente)
    if (savedGranularExtractionOverrides && savedGranularExtractionOverrides[cropType] && typeof savedGranularExtractionOverrides[cropType] === 'object') {
      Object.assign(finalExtraction, savedGranularExtractionOverrides[cropType]);
      console.log('✅ finalExtraction desde variable global savedGranularExtractionOverrides para', cropType, ':', {
        baseN: baseExtraction.N,
        overrideN: savedGranularExtractionOverrides[cropType].N,
        finalN: finalExtraction.N,
        extractionOverridesKeys: Object.keys(savedGranularExtractionOverrides[cropType])
      });
    }
    // PRIORIDAD 2: Options/Storage (valores guardados)
    else if (extractionOverrides[cropType] && typeof extractionOverrides[cropType] === 'object') {
      Object.assign(finalExtraction, extractionOverrides[cropType]);
      console.log('✅ finalExtraction desde options/storage extractionOverrides para', cropType, ':', {
        baseN: baseExtraction.N,
        overrideN: extractionOverrides[cropType].N,
        finalN: finalExtraction.N,
        extractionOverridesKeys: Object.keys(extractionOverrides[cropType])
      });
    }
    // PRIORIDAD 3: Valores base (precargados)
    else {
      console.log('ℹ️ No hay extractionOverrides para', cropType, '- usando valores base (precargados)');
    }
    
    // Usar finalExtraction en lugar de extraction
    const extraction = finalExtraction;
    const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    const totalExtraction = {};
    const finalAdjustment = {};
    const finalEfficiency = {};
    const realRequirement = {};

    // CRÍTICO: Los ajustes y eficiencias son INDEPENDIENTES del cultivo
    // Son valores que el usuario establece manualmente y deben persistir sin importar el cultivo
    let providedAdjustments = options.adjustment ? {...options.adjustment} : null;
    let providedEfficiencies = options.efficiency ? {...options.efficiency} : null;
    
    // Si no vienen en options, intentar cargar desde localStorage
    // PERO NO si se pasa _skipLoadFromStorage (cuando loadGranularRequirements ya determinó que no hay datos)
    if ((!providedAdjustments || !providedEfficiencies) && !options._skipLoadFromStorage) {
      try {
        const projectId = getCurrentProjectId();
        if (projectId) {
          // PRIORIDAD 1: projectStorage
          if (window.projectStorage) {
            const granularSection = window.projectStorage.loadSection('granular', projectId);
            if (granularSection && granularSection.requirements) {
              // CRÍTICO: Cargar ajustes y eficiencias SIEMPRE que existan, INDEPENDIENTE del cultivo
              // Los ajustes y eficiencias son valores del usuario, no dependen del cultivo
              if (!providedAdjustments && granularSection.requirements.adjustment) {
                providedAdjustments = {...granularSection.requirements.adjustment};
                console.log('✅ Ajustes cargados desde projectStorage (INDEPENDIENTES del cultivo):', Object.keys(providedAdjustments).length, 'nutrientes');
              }
              if (!providedEfficiencies && granularSection.requirements.efficiency) {
                providedEfficiencies = {...granularSection.requirements.efficiency};
                console.log('✅ Eficiencias cargadas desde projectStorage (INDEPENDIENTES del cultivo):', Object.keys(providedEfficiencies).length, 'nutrientes');
                console.log('📋 Muestra de eficiencias cargadas:', {
                  N: providedEfficiencies.N,
                  P2O5: providedEfficiencies.P2O5,
                  K2O: providedEfficiencies.K2O
                });
              }
            }
          }
          
          // PRIORIDAD 2: localStorage directo
          if ((!providedAdjustments || !providedEfficiencies)) {
            const unifiedKey = `nutriplant_project_${projectId}`;
            const raw = localStorage.getItem(unifiedKey);
            if (raw) {
              const o = JSON.parse(raw);
              if (o && o.granular && o.granular.requirements) {
                // CRÍTICO: Cargar ajustes y eficiencias SIEMPRE que existan, INDEPENDIENTE del cultivo
                if (!providedAdjustments && o.granular.requirements.adjustment) {
                  providedAdjustments = {...o.granular.requirements.adjustment};
                  console.log('✅ Ajustes cargados desde localStorage (INDEPENDIENTES del cultivo):', Object.keys(providedAdjustments).length, 'nutrientes');
                }
                if (!providedEfficiencies && o.granular.requirements.efficiency) {
                  providedEfficiencies = {...o.granular.requirements.efficiency};
                  console.log('✅ Eficiencias cargadas desde localStorage (INDEPENDIENTES del cultivo):', Object.keys(providedEfficiencies).length, 'nutrientes');
                  console.log('📋 Muestra de eficiencias cargadas:', {
                    N: providedEfficiencies.N,
                    P2O5: providedEfficiencies.P2O5,
                    K2O: providedEfficiencies.K2O
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando valores guardados en calculateGranularNutrientRequirements:', e);
      }
    }

    // REGLA DE RIGOR: Si hay valores guardados, usarlos SIEMPRE, sin excepciones
    // Los valores guardados tienen prioridad ABSOLUTA sobre cualquier predefinido
    const adjustmentsAutoFlag = savedGranularAdjustmentsAuto === true;
    const hasSavedAdjustments = !adjustmentsAutoFlag && providedAdjustments && Object.keys(providedAdjustments).length > 0;
    const hasSavedEfficiencies = providedEfficiencies && Object.keys(providedEfficiencies).length > 0;
    
    console.log('🔒 REGLA DE RIGOR aplicada:', {
      hasSavedAdjustments,
      hasSavedEfficiencies,
      adjustmentKeys: hasSavedAdjustments ? Object.keys(providedAdjustments) : [],
      efficiencyKeys: hasSavedEfficiencies ? Object.keys(providedEfficiencies) : []
    });

    if (hasSavedAdjustments) {
      savedGranularAdjustmentsAuto = false;
    }

    const shouldAutoSyncAdjustments = adjustmentsAutoFlag ||
      (!hasSavedAdjustments && (savedGranularAdjustmentsAuto || !savedGranularAdjustments));

    nutrients.forEach(nutrient => {
      const perTon = typeof extraction[nutrient] === 'number' ? extraction[nutrient] : 0;
      const total = parseFloat((perTon * targetYield).toFixed(2));
      totalExtraction[nutrient] = total;

      let adjValue;
      // REGLA DE RIGOR: PRIORIDAD ABSOLUTA a valores guardados
      // Si hay valores guardados, usarlos SIEMPRE, incluso si son 0
      if (hasSavedAdjustments && providedAdjustments && typeof providedAdjustments[nutrient] === 'number') {
        adjValue = providedAdjustments[nutrient];
      } else if (!shouldAutoSyncAdjustments && savedGranularAdjustments && typeof savedGranularAdjustments[nutrient] === 'number') {
        adjValue = savedGranularAdjustments[nutrient];
      } else {
        // Solo usar predefinido si NO hay valores guardados
        // INICIALIZAR con extracción total cuando no hay valores guardados
        adjValue = total;
      }
      finalAdjustment[nutrient] = adjValue;

      let effValue;
      // REGLA DE RIGOR: PRIORIDAD ABSOLUTA a valores guardados
      // Si hay valores guardados, usarlos SIEMPRE, incluso si son 0 o muy pequeños
      if (hasSavedEfficiencies && providedEfficiencies && typeof providedEfficiencies[nutrient] === 'number') {
        effValue = providedEfficiencies[nutrient];
      } else if (savedGranularEfficiencies && typeof savedGranularEfficiencies[nutrient] === 'number') {
        effValue = savedGranularEfficiencies[nutrient];
      } else {
        // Solo usar predefinido si NO hay valores guardados
        effValue = GRANULAR_DEFAULT_EFFICIENCY[nutrient] || 85;
      }
      finalEfficiency[nutrient] = effValue;

      const divisor = effValue > 0 ? effValue / 100 : 1;
      realRequirement[nutrient] = parseFloat((adjValue / divisor).toFixed(2));
    });

    savedGranularAdjustments = {...finalAdjustment};
    savedGranularEfficiencies = {...finalEfficiency};
    lastGranularCalculatedCrop = cropType;
    lastGranularCalculatedYield = targetYield;

    renderGranularNutrientTable(
      extraction,
      totalExtraction,
      finalAdjustment,
      finalEfficiency,
      realRequirement,
      targetYield
    );
  } catch (error) {
    console.error('❌ Error en calculateGranularNutrientRequirements:', error);
  } finally {
    isGranularLoading = false;
  }
}

// Función para renderizar la tabla de nutrientes
function renderGranularNutrientTable(extraction, totalExtraction, adjustment, efficiency, realRequirement, targetYield) {
  console.log('📋 renderGranularNutrientTable ejecutándose...');
  const container = document.getElementById('granularRequerimientoTableContainer');
  console.log('🔍 Contenedor encontrado:', container);
  if (!container) { console.error('❌ NO SE ENCONTRÓ granularRequerimientoTableContainer'); return; }

  const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
  
  // 🚀 SIMPLIFICADO: Usar directamente los valores pasados como parámetros
  // extraction ya viene fusionado (base + overrides) desde calculateGranularNutrientRequirements()
  
  const tableHTML = `
    <table class="fertirriego-requirement-table">
      <thead>
        <tr>
          <th rowspan="2">Concepto</th>
          ${nutrients.map(n => `<th id="granular-header-${n}">${getGranularLabel(n)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Extracción por tonelada<br>(kg/ton)</strong></td>
          ${nutrients.map(n => `<td><input type="number" class="fertirriego-input" id="granular-extract-${n}" value="${getGranularConvertedValue(n, (extraction[n] ?? 0))}" step="0.01" onchange="updateGranularExtractionPerTon('${n}', this.value)"></td>`).join('')}
        </tr>
        <tr>
          <td><strong>Extracción total<br>(kg/ha)</strong></td>
          ${nutrients.map(n => `<td id="granular-extraccion-total-${n}">${getGranularConvertedValue(n, totalExtraction[n])}</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Ajuste por niveles<br>en suelo</strong></td>
          ${nutrients.map(n => {
            // CRÍTICO: Usar SIEMPRE el valor pasado como parámetro (incluso si es 0)
            // Estos valores YA vienen de los datos guardados o calculados correctamente
            const adjValue = adjustment[n] ?? 0;
            const displayValue = getGranularConvertedValue(n, adjValue);
            console.log(`🎨 Renderizando ajuste ${n}: valor guardado=${adjValue}, valor mostrado=${displayValue}, modo elemental=${isGranularRequerimientoElementalMode}`);
            return `<td><input type="number" class="fertirriego-input" id="granular-adj-${n}" value="${displayValue}" step="0.01" onchange="updateGranularAdjustment('${n}', this.value)"></td>`;
          }).join('')}
        </tr>
        <tr>
          <td><strong>Eficiencia<br>(%)</strong></td>
          ${nutrients.map(n => {
            // CRÍTICO: Usar SIEMPRE el valor pasado como parámetro (incluso si es 0 o muy pequeño)
            // Estos valores YA vienen de los datos guardados o calculados correctamente
            const effValue = efficiency[n] ?? GRANULAR_DEFAULT_EFFICIENCY[n] ?? 85;
            // Asegurar que el valor se muestre correctamente (incluso si es 0, 2, 5, etc.)
            const displayValue = typeof effValue === 'number' && !isNaN(effValue) ? effValue : (GRANULAR_DEFAULT_EFFICIENCY[n] || 85);
            console.log(`🎨 Renderizando eficiencia ${n}: valor guardado=${efficiency[n]}, valor mostrado=${displayValue}`);
            return `<td><input type="number" class="fertirriego-input" id="granular-eff-${n}" value="${displayValue}" step="0.1" min="1" max="100" onchange="updateGranularEfficiency('${n}', this.value)"></td>`;
          }).join('')}
        </tr>
        <tr class="requirement-real-row">
          <td><strong>Requerimiento Real<br>(kg/ha)</strong></td>
          ${nutrients.map(n => `<td id="granular-req-${n}">${getGranularConvertedValue(n, realRequirement[n])}</td>`).join('')}
        </tr>
      </tbody>
    </table>
  `;
  container.innerHTML = tableHTML;
  
  // 🚀 SIMPLIFICADO: Confiar en que el HTML inicial tiene los valores correctos
  // extraction ya viene fusionado (base + overrides) desde calculateGranularNutrientRequirements()
  // No necesitamos applyValues() - el HTML ya tiene los valores correctos en el atributo value
}
// Exponer
window.renderGranularNutrientTable = renderGranularNutrientTable;

// Función para actualizar extracción por tonelada
function updateGranularExtractionPerTon(nutrient, value) {
  try {
    if (isGranularLoading) {
      console.debug('ℹ️ Ignorando updateGranularExtractionPerTon durante carga');
      return;
    }
    
    const cropType = document.getElementById('granularRequerimientoCropType').value;
    let numValue = parseFloat(value);
    
    // 🚀 CRÍTICO: SIEMPRE guardar en formato ÓXIDO (base) - IGUAL QUE ADJUSTMENT
    // Si estamos en modo elemental, el valor viene convertido y necesitamos convertirlo de vuelta a óxido
    let nutrientKey = nutrient;
    if (isGranularRequerimientoElementalMode) {
      // En modo elemental, el nutriente puede venir como 'P', 'K', etc.
      // Necesitamos identificar el nutriente base y convertir el valor
      const elementalToOxide = {
        'P': { key: 'P2O5', factor: GRANULAR_CONVERSION_FACTORS.P_TO_P2O5 },
        'K': { key: 'K2O', factor: GRANULAR_CONVERSION_FACTORS.K_TO_K2O },
        'Ca': { key: 'CaO', factor: GRANULAR_CONVERSION_FACTORS.Ca_TO_CaO },
        'Mg': { key: 'MgO', factor: GRANULAR_CONVERSION_FACTORS.Mg_TO_MgO },
        'Si': { key: 'SiO2', factor: GRANULAR_CONVERSION_FACTORS.Si_TO_SiO2 }
      };
      const conversion = elementalToOxide[nutrient];
      if (conversion) {
        numValue = numValue * conversion.factor;
        nutrientKey = conversion.key;
        console.log(`🔄 Convertido ${nutrient} (elemental ${value}) → ${nutrientKey} (óxido ${numValue.toFixed(2)})`);
      }
    }
    
    console.log('🔄 updateGranularExtractionPerTon llamado:', { cropType, nutrient: nutrientKey, value: numValue, modoElemental: isGranularRequerimientoElementalMode });
    
    // 🚀 CRÍTICO: Guardar directamente en variable global (IGUAL QUE AJUSTE Y EFICIENCIA)
    if (!savedGranularExtractionOverrides[cropType]) {
      savedGranularExtractionOverrides[cropType] = {};
    }
    savedGranularExtractionOverrides[cropType][nutrientKey] = numValue;
    console.log('✅ Extracción guardada en variable global (SIEMPRE en formato ÓXIDO):', { cropType, nutrient: nutrientKey, value: numValue });
    
    // Recalcular (esto fusionará base + overrides correctamente)
    calculateGranularNutrientRequirements();
    
    // CRÍTICO: Guardar INMEDIATAMENTE para que los overrides se persistan
    console.log('💾 Guardando inmediatamente después de modificar extracción por tonelada');
    if (typeof window.saveGranularRequirementsImmediate === 'function') {
      window.saveGranularRequirementsImmediate();
    } else if (typeof window.saveGranularRequirements === 'function') {
      window.saveGranularRequirements();
    } else {
      scheduleSaveGranularRequirements();
    }
  } catch (error) {
    console.error('❌ Error actualizando extracción por tonelada:', error);
  }
}
// Exponer
window.updateGranularExtractionPerTon = updateGranularExtractionPerTon;

// Función para actualizar ajuste
function updateGranularAdjustment(nutrient, value) {
  try {
    if (isGranularLoading) {
      console.debug('ℹ️ Ignorando updateGranularAdjustment durante carga');
      return;
    }
    console.log('🔄 updateGranularAdjustment llamado:', { nutrient, value });
    savedGranularAdjustmentsAuto = false;
    
    // Convertir de elemental a óxido si es necesario
    let convertedValue = parseFloat(value);
    let nutrientKey = nutrient;
    if (isGranularRequerimientoElementalMode) {
      const factor = {
        'P': GRANULAR_CONVERSION_FACTORS.P_TO_P2O5,
        'K': GRANULAR_CONVERSION_FACTORS.K_TO_K2O,
        'Ca': GRANULAR_CONVERSION_FACTORS.Ca_TO_CaO,
        'Mg': GRANULAR_CONVERSION_FACTORS.Mg_TO_MgO,
        'Si': GRANULAR_CONVERSION_FACTORS.Si_TO_SiO2
      }[nutrientKey];
      if (factor) {
        const nutrientNames = { 'P': 'P2O5', 'K': 'K2O', 'Ca': 'CaO', 'Mg': 'MgO', 'Si': 'SiO2' };
        convertedValue = convertedValue * factor;
        nutrientKey = nutrientNames[nutrientKey] || nutrientKey;
      }
    }
    const efficiencyValue = parseFloat(document.getElementById(`granular-eff-${nutrientKey}`).value) || 1;
    const realRequirement = (convertedValue / (efficiencyValue / 100)).toFixed(2);
    document.getElementById(`granular-req-${nutrientKey}`).textContent = getGranularConvertedValue(nutrientKey, realRequirement);

    if (!savedGranularAdjustments) savedGranularAdjustments = {};
    savedGranularAdjustments[nutrientKey] = convertedValue;
    
    // CRÍTICO: Guardar INMEDIATAMENTE cuando el usuario modifica un valor
    console.log('💾 Guardando inmediatamente después de modificar ajuste');
    if (typeof window.saveGranularRequirementsImmediate === 'function') {
      window.saveGranularRequirementsImmediate();
    } else if (typeof window.saveGranularRequirements === 'function') {
      window.saveGranularRequirements();
    } else {
      scheduleSaveGranularRequirements();
    }
  } catch (error) {
    console.error('❌ Error actualizando ajuste:', error);
  }
}
// Exponer
window.updateGranularAdjustment = updateGranularAdjustment;

// Función para actualizar eficiencia
function updateGranularEfficiency(nutrient, value) {
  try {
    if (isGranularLoading) {
      console.debug('ℹ️ Ignorando updateGranularEfficiency durante carga');
      return;
    }
    console.log('🔄 updateGranularEfficiency llamado:', { nutrient, value });
    
    const adjustmentInput = document.getElementById(`granular-adj-${nutrient}`);
    const adjustmentValue = adjustmentInput ? (parseFloat(adjustmentInput.value) || 0) : 0;
    const efficiencyValue = parseFloat(value) || 1;
    const realRequirement = (adjustmentValue / (efficiencyValue / 100)).toFixed(2);
    const reqCell = document.getElementById(`granular-req-${nutrient}`);
    if (reqCell) {
      reqCell.textContent = getGranularConvertedValue(nutrient, realRequirement);
      console.log(`✅ Requerimiento Real ${nutrient} actualizado: ${reqCell.textContent} (ajuste: ${adjustmentValue}, eficiencia: ${efficiencyValue}%)`);
    } else {
      console.warn(`⚠️ No se encontró celda granular-req-${nutrient} para actualizar`);
    }

    if (!savedGranularEfficiencies) savedGranularEfficiencies = {};
    savedGranularEfficiencies[nutrient] = efficiencyValue;
    
    // CRÍTICO: Guardar INMEDIATAMENTE cuando el usuario modifica un valor
    console.log('💾 Guardando inmediatamente después de modificar eficiencia');
    if (typeof window.saveGranularRequirementsImmediate === 'function') {
      window.saveGranularRequirementsImmediate();
    } else if (typeof window.saveGranularRequirements === 'function') {
      window.saveGranularRequirements();
    } else {
      scheduleSaveGranularRequirements();
    }
  } catch (error) {
    console.error('❌ Error actualizando eficiencia:', error);
  }
}
// Exponer
window.updateGranularEfficiency = updateGranularEfficiency;

let granularCustomCropEditId = null;

function formatCustomCropName(cropId) {
  return cropId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getCustomCropModalTitleEl() {
  return document.getElementById('customCropModalTitle');
}

function getCustomCropModalSaveBtn() {
  return document.getElementById('customCropModalSaveBtn');
}

function setGranularCustomCropModalMode(mode) {
  const titleEl = getCustomCropModalTitleEl();
  const saveBtn = getCustomCropModalSaveBtn();
  if (!titleEl || !saveBtn) return;
  if (mode === 'edit') {
    titleEl.textContent = '✏️ Editar Cultivo Personalizado';
    saveBtn.textContent = 'Guardar cambios';
    saveBtn.setAttribute('onclick', 'saveEditedCustomGranularCrop()');
  } else {
    titleEl.textContent = '➕ Agregar Cultivo Personalizado';
    saveBtn.textContent = 'Agregar Cultivo';
    saveBtn.setAttribute('onclick', 'addCustomCropGlobal()');
  }
}

// Función para mostrar modal de cultivo personalizado en granulares
function showCustomGranularCropModal() {
  console.log('🖱️ Click en botón de cultivo personalizado granular');
  const modal = document.getElementById('customCropModal');
  console.log('🔍 Modal encontrado:', modal);
  setGranularCustomCropModalMode('add');
  granularCustomCropEditId = null;
  const granularSection = document.getElementById('granularCustomCropsSection');
  if (granularSection) granularSection.style.display = 'block';
  if (modal) { modal.classList.add('show'); console.log('✅ Modal mostrado'); }
  else { console.error('❌ No se encontró el modal customCropModal'); }
}

// Función para cerrar modal de cultivo personalizado
function closeCustomGranularCropModal() {
  const modal = document.getElementById('customCropModal');
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('customCropName').value = '';
    document.getElementById('customCropN').value = '0';
    document.getElementById('customCropP2O5').value = '0';
    document.getElementById('customCropK2O').value = '0';
    document.getElementById('customCropCaO').value = '0';
    document.getElementById('customCropMgO').value = '0';
    document.getElementById('customCropS').value = '0';
    document.getElementById('customCropSO4').value = '0';
    document.getElementById('customCropFe').value = '0';
    document.getElementById('customCropMn').value = '0';
    document.getElementById('customCropB').value = '0';
    document.getElementById('customCropZn').value = '0';
    document.getElementById('customCropCu').value = '0';
    document.getElementById('customCropMo').value = '0';
    document.getElementById('customCropSiO2').value = '0';
  }
  granularCustomCropEditId = null;
  setGranularCustomCropModalMode('add');
}

// ============================
// Catálogo de cultivos por usuario
// ============================
function np_getCurrentUserId() {
  try {
    return localStorage.getItem('nutriplant_user_id');
  } catch {
    return null;
  }
}

function np_loadUserProfile() {
  const userId = np_getCurrentUserId();
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`nutriplant_user_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function np_saveUserProfile(profile) {
  const userId = np_getCurrentUserId();
  if (!userId || !profile) return;
  try {
    localStorage.setItem(`nutriplant_user_${userId}`, JSON.stringify(profile));
    if (profile.customGranularCrops && typeof profile.customGranularCrops === 'object' && typeof window.nutriplantSyncCustomGranularCropsToCloud === 'function') {
      try { window.nutriplantSyncCustomGranularCropsToCloud(userId, profile.customGranularCrops); } catch (e) { console.warn('Sync cultivos granulares a nube:', e); }
    }
  } catch (e) {
    console.warn('np_saveUserProfile error', e);
  }
}

function np_getUserCustomGranularCrops() {
  const profile = np_loadUserProfile();
  let custom = profile && profile.customGranularCrops;
  if (custom && typeof custom === 'object' && Object.keys(custom).length > 0) return custom;
  // Sin sesión o perfil vacío: cargar desde fallback para que persistan tras reinicio
  try {
    const raw = localStorage.getItem('granularCustomCrops_global_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return {};
}

function normalizeCustomCropEntry(cropId, entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.extraction && typeof entry.extraction === 'object') {
    return {
      name: entry.name || formatCustomCropName(cropId),
      extraction: { ...entry.extraction }
    };
  }
  return {
    name: formatCustomCropName(cropId),
    extraction: { ...entry }
  };
}

function normalizeCustomCropMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object') return normalized;
  Object.keys(map).forEach(cropId => {
    const entry = normalizeCustomCropEntry(cropId, map[cropId]);
    if (entry) normalized[cropId] = entry;
  });
  return normalized;
}

function np_saveUserCustomGranularCrop(cropId, cropName, extraction) {
  const entry = { name: cropName, extraction: { ...extraction } };
  const userId = np_getCurrentUserId();
  if (userId) {
    const profile = np_loadUserProfile() || {};
    if (!profile.customGranularCrops || typeof profile.customGranularCrops !== 'object') {
      profile.customGranularCrops = {};
    }
    profile.customGranularCrops[cropId] = entry;
    np_saveUserProfile(profile);
  } else {
    // Sin sesión: persistir en localStorage para que sobreviva al reinicio
    try {
      const raw = localStorage.getItem('granularCustomCrops_global_user');
      const data = raw ? JSON.parse(raw) : {};
      if (typeof data !== 'object') return;
      data[cropId] = entry;
      localStorage.setItem('granularCustomCrops_global_user', JSON.stringify(data));
    } catch (e) {}
  }
}

function np_removeUserCustomGranularCrop(cropId) {
  const userId = np_getCurrentUserId();
  if (userId) {
    const profile = np_loadUserProfile() || {};
    const custom = profile.customGranularCrops || {};
    if (custom[cropId]) delete custom[cropId];
    profile.customGranularCrops = custom;
    np_saveUserProfile(profile);
  } else {
    try {
      const raw = localStorage.getItem('granularCustomCrops_global_user');
      const data = raw ? JSON.parse(raw) : {};
      if (data[cropId]) delete data[cropId];
      localStorage.setItem('granularCustomCrops_global_user', JSON.stringify(data));
    } catch (e) {}
  }
}

function readCustomCropExtractionFromModal() {
  return {
    N: parseFloat(document.getElementById('customCropN').value) || 0,
    P2O5: parseFloat(document.getElementById('customCropP2O5').value) || 0,
    K2O: parseFloat(document.getElementById('customCropK2O').value) || 0,
    CaO: parseFloat(document.getElementById('customCropCaO').value) || 0,
    MgO: parseFloat(document.getElementById('customCropMgO').value) || 0,
    S: parseFloat(document.getElementById('customCropS').value) || 0,
    SO4: parseFloat(document.getElementById('customCropSO4').value) || 0,
    Fe: parseFloat(document.getElementById('customCropFe').value) || 0,
    Mn: parseFloat(document.getElementById('customCropMn').value) || 0,
    B: parseFloat(document.getElementById('customCropB').value) || 0,
    Zn: parseFloat(document.getElementById('customCropZn').value) || 0,
    Cu: parseFloat(document.getElementById('customCropCu').value) || 0,
    Mo: parseFloat(document.getElementById('customCropMo').value) || 0,
    SiO2: parseFloat(document.getElementById('customCropSiO2').value) || 0
  };
}

function upsertCustomCropOption(select, cropId, cropName) {
  if (!select) return;
  let option = select.querySelector(`option[value="${cropId}"]`);
  if (!option) {
    option = document.createElement('option');
    option.value = cropId;
    select.appendChild(option);
  }
  option.textContent = cropName;
}

function removeCustomCropOption(select, cropId) {
  if (!select) return;
  const option = select.querySelector(`option[value="${cropId}"]`);
  if (option) option.remove();
}

function renderGranularCustomCropsList() {
  const container = document.getElementById('granularCustomCropsList');
  if (!container) return;
  const customRaw = np_getUserCustomGranularCrops();
  const custom = normalizeCustomCropMap(customRaw);
  const cropIds = Object.keys(custom);
  if (cropIds.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;">Sin cultivos personalizados.</div>';
    return;
  }
  container.innerHTML = cropIds.map(cropId => {
    const entry = custom[cropId];
    const safeName = entry?.name || formatCustomCropName(cropId);
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span>${safeName}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="openEditCustomGranularCrop('${cropId}')">Editar</button>
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="removeUserCustomGranularCrop('${cropId}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function openEditCustomGranularCrop(cropId) {
  const custom = normalizeCustomCropMap(np_getUserCustomGranularCrops());
  const entry = custom[cropId];
  if (!entry) {
    alert('No se encontró el cultivo personalizado');
    return;
  }
  granularCustomCropEditId = cropId;
  setGranularCustomCropModalMode('edit');
  const modal = document.getElementById('customCropModal');
  const granularSection = document.getElementById('granularCustomCropsSection');
  if (granularSection) granularSection.style.display = 'block';
  const nameEl = document.getElementById('customCropName');
  if (nameEl) nameEl.value = entry.name || formatCustomCropName(cropId);
  const extraction = entry.extraction || {};
  document.getElementById('customCropN').value = extraction.N ?? 0;
  document.getElementById('customCropP2O5').value = extraction.P2O5 ?? 0;
  document.getElementById('customCropK2O').value = extraction.K2O ?? 0;
  document.getElementById('customCropCaO').value = extraction.CaO ?? 0;
  document.getElementById('customCropMgO').value = extraction.MgO ?? 0;
  document.getElementById('customCropS').value = extraction.S ?? 0;
  document.getElementById('customCropSO4').value = extraction.SO4 ?? 0;
  document.getElementById('customCropFe').value = extraction.Fe ?? 0;
  document.getElementById('customCropMn').value = extraction.Mn ?? 0;
  document.getElementById('customCropB').value = extraction.B ?? 0;
  document.getElementById('customCropZn').value = extraction.Zn ?? 0;
  document.getElementById('customCropCu').value = extraction.Cu ?? 0;
  document.getElementById('customCropMo').value = extraction.Mo ?? 0;
  document.getElementById('customCropSiO2').value = extraction.SiO2 ?? 0;
  if (modal) modal.classList.add('show');
}

function saveEditedCustomGranularCrop() {
  if (!granularCustomCropEditId) return;
  const cropName = document.getElementById('customCropName').value.trim();
  if (!cropName) { alert('Por favor ingrese el nombre del cultivo'); return; }
  const newCropId = cropName.toLowerCase().replace(/\s+/g, '_');
  const extraction = readCustomCropExtractionFromModal();

  if (newCropId !== granularCustomCropEditId) {
    np_removeUserCustomGranularCrop(granularCustomCropEditId);
    if (GRANULAR_CROP_EXTRACTION_DB[granularCustomCropEditId]) delete GRANULAR_CROP_EXTRACTION_DB[granularCustomCropEditId];
    const select = document.getElementById('granularRequerimientoCropType');
    removeCustomCropOption(select, granularCustomCropEditId);
  }

  np_saveUserCustomGranularCrop(newCropId, cropName, extraction);
  GRANULAR_CROP_EXTRACTION_DB[newCropId] = extraction;
  const select = document.getElementById('granularRequerimientoCropType');
  upsertCustomCropOption(select, newCropId, cropName);
  if (select) select.value = newCropId;

  closeCustomGranularCropModal();
  renderGranularCustomCropsList();
  calculateGranularNutrientRequirements();
}

function removeUserCustomGranularCrop(cropId) {
  const custom = normalizeCustomCropMap(np_getUserCustomGranularCrops());
  if (!custom[cropId]) return;
  if (!confirm(`¿Eliminar "${custom[cropId].name}" del catálogo personal?`)) return;
  np_removeUserCustomGranularCrop(cropId);
  if (GRANULAR_CROP_EXTRACTION_DB[cropId]) delete GRANULAR_CROP_EXTRACTION_DB[cropId];
  const select = document.getElementById('granularRequerimientoCropType');
  removeCustomCropOption(select, cropId);
  if (select && select.value === cropId) {
    select.value = 'maiz';
  }
  renderGranularCustomCropsList();
  calculateGranularNutrientRequirements();
}

// Función para agregar cultivo personalizado a granulares
function addCustomGranularCrop() {
  const cropName = document.getElementById('customCropName').value.trim();
  if (!cropName) { alert('Por favor ingrese el nombre del cultivo'); return; }
  const cropId = cropName.toLowerCase().replace(/\s+/g, '_');
  const extraction = readCustomCropExtractionFromModal();
  
  // Agregar a la base de datos en memoria
  GRANULAR_CROP_EXTRACTION_DB[cropId] = extraction;
  
  // Agregar al selector
  const select = document.getElementById('granularRequerimientoCropType');
  upsertCustomCropOption(select, cropId, cropName);
  if (select) select.value = cropId;
  
  // CRÍTICO: Guardar cultivo personalizado en el catálogo del usuario
  try {
    // Cultivos predefinidos (no deben guardarse como personalizados)
    const predefinedCrops = ['maiz', 'cana', 'aguacate', 'limon', 'banano', 'trigo', 'sorgo', 'arroz', 'cebada'];
    const isPredefined = predefinedCrops.includes(cropId);
    if (!isPredefined) {
      np_saveUserCustomGranularCrop(cropId, cropName, extraction);
      console.log('✅ Cultivo personalizado guardado (catálogo usuario):', cropId);
    }
  } catch (error) {
    console.error('❌ Error guardando cultivo personalizado en catálogo usuario:', error);
  }
  
  closeCustomGranularCropModal();
  renderGranularCustomCropsList();
  
  // Recalcular con el nuevo cultivo
  calculateGranularNutrientRequirements();
  
  console.log('✅ Cultivo personalizado agregado:', cropName);
}

// Hacer las funciones globales
window.showCustomGranularCropModal = showCustomGranularCropModal;
window.closeCustomGranularCropModal = closeCustomGranularCropModal;
window.addCustomGranularCrop = addCustomGranularCrop;
window.openEditCustomGranularCrop = openEditCustomGranularCrop;
window.saveEditedCustomGranularCrop = saveEditedCustomGranularCrop;
window.removeUserCustomGranularCrop = removeUserCustomGranularCrop;
window.renderGranularCustomCropsList = renderGranularCustomCropsList;

// Función para obtener el ID del proyecto actual (mismo que en nutricion-granular-functions.js)
function getCurrentProjectId() {
  try {
    if (typeof window !== 'undefined' && window.projectManager) {
      const currentProject = window.projectManager.getCurrentProject();
      if (currentProject && currentProject.id) { return currentProject.id; }
    }
    const currentProjectId = localStorage.getItem('nutriplant-current-project');
    if (currentProjectId) { return currentProjectId; }
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo ID de proyecto:', error);
    return null;
  }
}

// Recordar estado rápido de UI (cultivo y rendimiento) en Granular
function rememberGranularUIState() {
  try {
    const pid = getCurrentProjectId(); if (!pid) return;
    const cropType = document.getElementById('granularRequerimientoCropType')?.value || '';
    const targetYield = parseFloat(document.getElementById('granularRequerimientoTargetYield')?.value) || 10;
    // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
    const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
    pd.granularLastUI = { cropType, targetYield }; localStorage.setItem(k, JSON.stringify(pd));
    // También guardar en esquema unificado
    try { granUnifiedMerge(obj => { obj.granular = obj.granular || {}; obj.granular.lastUI = { cropType, targetYield }; }); } catch {}
  } catch {}
}

function applyGranularUIState() {
  try {
    const pid = getCurrentProjectId(); if (!pid) return;
    let st = null;
    // Intentar desde esquema unificado primero
    try {
      const key = granUnifiedKey();
      if (key) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.granular && o.granular.lastUI) st = o.granular.lastUI;
        }
      }
    } catch {}
    if (window.projectManager && window.projectManager.getCurrentProject) {
      const p = window.projectManager.getCurrentProject(); st = p && p.granularLastUI;
    }
    if (!st) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
      st = pd.granularLastUI;
    }
    if (!st) return;
    const select = document.getElementById('granularRequerimientoCropType');
    if (select && st.cropType) {
      if (!select.querySelector(`option[value="${st.cropType}"]`)) {
        const opt = document.createElement('option'); opt.value = st.cropType; opt.textContent = st.cropType; select.appendChild(opt);
      }
      select.value = st.cropType;
    }
    const ty = document.getElementById('granularRequerimientoTargetYield'); if (ty && st.targetYield!=null) ty.value = st.targetYield;
  } catch {}
}

// Función SIMPLE y DIRECTA para guardar datos de requerimiento nutricional granular
function saveGranularRequirements() {
  try {
    const projectId = getCurrentProjectId();
    if (!projectId) {
      console.warn('⚠️ No hay proyecto seleccionado');
      return;
    }

    const cropEl = document.getElementById('granularRequerimientoCropType');
    const yieldEl = document.getElementById('granularRequerimientoTargetYield');
    const tableContainer = document.getElementById('granularRequerimientoTableContainer');
    const hasUI = !!cropEl && !!yieldEl && !!tableContainer;

    if (!cropEl || !yieldEl) {
      console.debug('⚠️ Granular: elementos de UI no disponibles, se omite guardado.');
      return;
    }

    const cropType = cropEl.value || '';
    const targetYield = parseFloat(yieldEl.value) || 10;
    
    const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
    const adjustment = {};
    const efficiency = {};
    
    // 🚀 CRÍTICO: SIEMPRE cargar existingData para preservar extractionOverrides
    // NO solo cuando los elementos no están visibles - SIEMPRE para preservar valores existentes
    let existingData = null;
    try {
      // PRIORIDAD 1: Intentar desde projectStorage (sistema centralizado)
      if (window.projectStorage) {
        const granularSection = window.projectStorage.loadSection('granular', projectId);
        if (granularSection && granularSection.requirements) {
          existingData = granularSection.requirements;
          console.log('✅ existingData cargado desde projectStorage para preservar extractionOverrides:', {
            hasExtractionOverrides: !!existingData.extractionOverrides,
            extractionOverridesKeys: existingData.extractionOverrides ? Object.keys(existingData.extractionOverrides) : []
          });
        }
      }
      // PRIORIDAD 2: Fallback a localStorage directo
      if (!existingData) {
        const unifiedKey = `nutriplant_project_${projectId}`;
        const raw = localStorage.getItem(unifiedKey);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.granular && o.granular.requirements) {
            existingData = o.granular.requirements;
            console.log('✅ existingData cargado desde localStorage para preservar extractionOverrides:', {
              hasExtractionOverrides: !!existingData.extractionOverrides,
              extractionOverridesKeys: existingData.extractionOverrides ? Object.keys(existingData.extractionOverrides) : []
            });
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Error cargando datos existentes para merge:', e);
    }

    // Si la UI no está disponible y no hay datos existentes, no sobrescribir con valores por defecto
    if (!hasUI && !existingData) {
      console.warn('⚠️ Guardado omitido: UI de Granular no disponible y no hay datos existentes.');
      return;
    }

    // 🚀 CRÍTICO: Elegir modo confiable según disponibilidad
    const hasLoadedMode = window.granularElementalModeLoaded === true;
    const effectiveIsElementalMode = (hasLoadedMode && typeof window.isGranularRequerimientoElementalMode === 'boolean')
      ? window.isGranularRequerimientoElementalMode
      : (existingData && typeof existingData.isElementalMode === 'boolean')
        ? existingData.isElementalMode
        : (typeof isGranularRequerimientoElementalMode === 'boolean' ? isGranularRequerimientoElementalMode : false);
    
    // Leer ajustes y eficiencias directamente del DOM
    // CRÍTICO: Buscar elementos aunque estén ocultos (aún existen en el DOM)
    // CRÍTICO: Guardar TODOS los valores, incluso si son iguales a los precargados
    nutrients.forEach(nutrient => {
      // Buscar el input aunque esté oculto (querySelector busca en todo el DOM)
      const adjInput = document.getElementById(`granular-adj-${nutrient}`);
      const effInput = document.getElementById(`granular-eff-${nutrient}`);
      
      // PRIORIDAD 1: Si el input existe (aunque esté oculto), leer su valor
      if (adjInput && adjInput.value !== undefined && adjInput.value !== '') {
        // Guardar el valor del input (puede estar en modo elemental u óxido)
        let adjValue = parseFloat(adjInput.value) || 0;
        console.log(`🔍 Ajuste ${nutrient} leído del DOM (raw):`, adjInput.value, 'modo elemental:', effectiveIsElementalMode);
        // Si estamos en modo elemental, el valor mostrado está convertido
        // Necesitamos guardar el valor base (óxido) para consistencia
        if (effectiveIsElementalMode && adjValue > 0) {
          // Convertir de elemental a óxido para guardar
          // El nutriente viene como 'P2O5', 'K2O', etc., pero en modo elemental se muestra como 'P', 'K', etc.
          // Necesitamos convertir el valor mostrado (elemental) a óxido
          const factor = {
            'P2O5': GRANULAR_CONVERSION_FACTORS.P_TO_P2O5,
            'K2O': GRANULAR_CONVERSION_FACTORS.K_TO_K2O,
            'CaO': GRANULAR_CONVERSION_FACTORS.Ca_TO_CaO,
            'MgO': GRANULAR_CONVERSION_FACTORS.Mg_TO_MgO,
            'SiO2': GRANULAR_CONVERSION_FACTORS.Si_TO_SiO2
          }[nutrient];
          if (factor) {
            // El valor en el input está en elemental, convertir a óxido
            adjValue = adjValue * factor;
            console.log(`🔄 Convertido ${nutrient} de elemental a óxido:`, adjValue);
          }
        }
        adjustment[nutrient] = adjValue;
        console.log(`✅ Ajuste ${nutrient} capturado del DOM (guardado en óxido):`, adjValue);
      } else if (existingData && existingData.adjustment && typeof existingData.adjustment[nutrient] === 'number') {
        // PRIORIDAD 2: Input no existe pero hay valor guardado - mantenerlo
        adjustment[nutrient] = existingData.adjustment[nutrient];
        console.log(`ℹ️ Ajuste ${nutrient} mantenido desde guardado:`, existingData.adjustment[nutrient]);
      } else {
        // PRIORIDAD 3: No hay input ni valor guardado - calcular extracción total si no existe
        // Esto asegura que siempre haya un valor válido
        if (cropType && GRANULAR_CROP_EXTRACTION_DB[cropType] && GRANULAR_CROP_EXTRACTION_DB[cropType][nutrient] !== undefined) {
          const extraction = GRANULAR_CROP_EXTRACTION_DB[cropType][nutrient];
          const totalExtraction = (extraction * targetYield).toFixed(2);
          adjustment[nutrient] = parseFloat(totalExtraction) || 0;
          console.log(`ℹ️ Ajuste ${nutrient} usando extracción total (default):`, adjustment[nutrient]);
        } else {
          // Si no hay extracción total, usar 0
        adjustment[nutrient] = 0;
          console.log(`ℹ️ Ajuste ${nutrient} usando 0 (sin datos):`, adjustment[nutrient]);
        }
      }
      
      // PRIORIDAD 1: Si el input existe (aunque esté oculto), leer su valor
      if (effInput && effInput.value !== undefined && effInput.value !== '') {
        // CRÍTICO: Guardar el valor EXACTO del input, incluso si es 0 o muy pequeño
        // No usar || default porque eso sobrescribe valores válidos como 2, 5, etc.
        const rawValue = parseFloat(effInput.value);
        if (!isNaN(rawValue)) {
          efficiency[nutrient] = rawValue;
          console.log(`🔍 Eficiencia ${nutrient} leída del DOM (raw):`, effInput.value, '→ guardado:', efficiency[nutrient]);
        } else {
          // Solo usar default si realmente no es un número válido
          efficiency[nutrient] = GRANULAR_DEFAULT_EFFICIENCY[nutrient] || 85;
          console.log(`⚠️ Eficiencia ${nutrient} no es número válido, usando default:`, efficiency[nutrient]);
        }
      } else if (existingData && existingData.efficiency && typeof existingData.efficiency[nutrient] === 'number') {
        // PRIORIDAD 2: Input no existe pero hay valor guardado - mantenerlo
        efficiency[nutrient] = existingData.efficiency[nutrient];
        console.log(`ℹ️ Eficiencia ${nutrient} mantenida desde guardado:`, existingData.efficiency[nutrient]);
      } else {
        // PRIORIDAD 3: No hay input ni valor guardado - usar default
        efficiency[nutrient] = GRANULAR_DEFAULT_EFFICIENCY[nutrient] || 85;
        console.log(`ℹ️ Eficiencia ${nutrient} usando default:`, efficiency[nutrient]);
      }
    });
    
    // 🚀 CRÍTICO: Log completo de lo que se va a guardar
    console.log('💾 RESUMEN DE DATOS A GUARDAR (Granular):', {
      cropType,
      targetYield,
      adjustmentCount: Object.keys(adjustment).length,
      efficiencyCount: Object.keys(efficiency).length,
      adjustmentSample: { N: adjustment.N, P2O5: adjustment.P2O5, K2O: adjustment.K2O },
      efficiencySample: { N: efficiency.N, P2O5: efficiency.P2O5, K2O: efficiency.K2O },
      adjustmentCompleto: adjustment,
      efficiencyCompleto: efficiency
    });

    // Leer extracción por tonelada - EXACTAMENTE IGUAL QUE ADJUSTMENT Y EFFICIENCY (leer del DOM directamente)
    // 🚀 CRÍTICO: SIEMPRE guardar en formato ÓXIDO (base) - igual que adjustment
    // 🚀 CRÍTICO: PRIORIDAD 1: Usar savedGranularExtractionOverrides (variable global) - IGUAL QUE ADJUSTMENT/EFFICIENCY
    // 🚀 CRÍTICO: PRIORIDAD 2: Usar existingData.extractionOverrides (valores guardados) - NO PERDER VALORES EXISTENTES
    let extractionOverrides = {};
    
    // 🚀 CRÍTICO: Cargar existingData.extractionOverrides primero para preservarlos
    if (existingData && existingData.extractionOverrides && typeof existingData.extractionOverrides === 'object') {
      extractionOverrides = { ...existingData.extractionOverrides };
      console.log('✅ extractionOverrides inicializados desde existingData (preservar valores existentes):', Object.keys(extractionOverrides));
    }
    
    if (cropType) {
      // PRIORIDAD 1: Variable global savedGranularExtractionOverrides (valores más recientes)
      if (savedGranularExtractionOverrides && savedGranularExtractionOverrides[cropType] && typeof savedGranularExtractionOverrides[cropType] === 'object') {
        // 🚀 CRÍTICO: Fusionar con existingData para preservar otros cultivos
        if (!extractionOverrides[cropType]) {
          extractionOverrides[cropType] = {};
        }
        extractionOverrides[cropType] = { ...extractionOverrides[cropType], ...savedGranularExtractionOverrides[cropType] };
        console.log('✅ extractionOverrides desde variable global savedGranularExtractionOverrides:', extractionOverrides[cropType]);
      } else {
        // PRIORIDAD 2: Leer del DOM (igual que adjustment/efficiency)
        const extraction = {};
        // 🚀 CRÍTICO: Inicializar con valores existentes para preservarlos
        if (extractionOverrides[cropType] && typeof extractionOverrides[cropType] === 'object') {
          Object.assign(extraction, extractionOverrides[cropType]);
        }
        let hasExtractionValues = false;
        nutrients.forEach(n => {
          const extInput = document.getElementById(`granular-extract-${n}`);
          // PRIORIDAD 1: Si el input existe (aunque esté oculto), leer su valor (igual que adjustment/efficiency)
          if (extInput && extInput.value !== undefined && extInput.value !== '') {
            let extValue = parseFloat(extInput.value);
            if (!isNaN(extValue)) {
              // 🚀 CRÍTICO: Si estamos en modo elemental, convertir de elemental a óxido antes de guardar
              // (igual que se hace con adjustment en línea 857-873)
              if (isGranularRequerimientoElementalMode && extValue > 0) {
                const factor = {
                  'P2O5': GRANULAR_CONVERSION_FACTORS.P_TO_P2O5,
                  'K2O': GRANULAR_CONVERSION_FACTORS.K_TO_K2O,
                  'CaO': GRANULAR_CONVERSION_FACTORS.Ca_TO_CaO,
                  'MgO': GRANULAR_CONVERSION_FACTORS.Mg_TO_MgO,
                  'SiO2': GRANULAR_CONVERSION_FACTORS.Si_TO_SiO2
                }[n];
                if (factor) {
                  // El valor en el input está en elemental, convertir a óxido para guardar
                  extValue = extValue * factor;
                  console.log(`🔄 Extracción ${n} convertida de elemental a óxido:`, extInput.value, '→', extValue.toFixed(2));
                }
              }
              extraction[n] = extValue;
              hasExtractionValues = true;
              console.log(`🔍 Extracción ${n} leída del DOM (raw):`, extInput.value, '→ guardado en ÓXIDO:', extraction[n]);
            }
          } else if (extractionOverrides[cropType] && typeof extractionOverrides[cropType][n] === 'number') {
            // PRIORIDAD 2: Input no existe pero hay valor guardado - mantenerlo (igual que adjustment/efficiency)
            // Los valores guardados ya están en formato óxido
            extraction[n] = extractionOverrides[cropType][n];
            console.log(`ℹ️ Extracción ${n} mantenida desde guardado (óxido):`, extraction[n]);
          }
        });
        // 🚀 CRÍTICO: SIEMPRE guardar extractionOverrides si hay valores (modificados o existentes) - IGUAL QUE ADJUSTMENT/EFFICIENCY
        if (hasExtractionValues || Object.keys(extraction).length > 0) {
          extractionOverrides[cropType] = extraction;
          console.log('✅ extractionOverrides capturados desde DOM (SIEMPRE en formato ÓXIDO):', extractionOverrides[cropType]);
        }
      }
    }
    
    // 🚀 CRÍTICO: NO guardar extractionOverrides vacío si hay valores existentes en other crops
    // Si extractionOverrides está vacío pero había existingData, mantener existingData
    if (!Object.keys(extractionOverrides).length && existingData && existingData.extractionOverrides && typeof existingData.extractionOverrides === 'object' && Object.keys(existingData.extractionOverrides).length > 0) {
      extractionOverrides = { ...existingData.extractionOverrides };
      console.log('✅ extractionOverrides preservados desde existingData (no perder valores de otros cultivos):', Object.keys(extractionOverrides));
    }

    // Guardar cultivos personalizados (solo los que NO son predefinidos)
    const predefinedCrops = ['maiz', 'cana', 'aguacate', 'limon', 'banano', 'trigo', 'sorgo', 'arroz', 'cebada'];
    const customCrops = {};
    Object.keys(GRANULAR_CROP_EXTRACTION_DB).forEach(cropId => {
      if (!predefinedCrops.includes(cropId)) {
        customCrops[cropId] = GRANULAR_CROP_EXTRACTION_DB[cropId];
      }
    });

    // Crear objeto de datos completo
    // CRÍTICO: Guardar TODOS los valores, incluso si son 0 o iguales a precargados
    // Esto marca que el usuario ha "tocado" estos valores
    const requirementData = {
      cropType,
      targetYield,
      adjustment: { ...adjustment }, // Copia para asegurar que todos los nutrientes estén
      efficiency: { ...efficiency }, // Copia para asegurar que todos los nutrientes estén
      adjustmentsAuto: savedGranularAdjustmentsAuto === true,
      isElementalMode: typeof effectiveIsElementalMode === 'boolean' ? effectiveIsElementalMode : false,
      extractionOverrides,
      customCrops, // Guardar cultivos personalizados
      timestamp: new Date().toISOString(),
      // Marcar que estos son valores guardados del usuario (no precargados)
      isUserSaved: true
    };
    
    // Asegurar que TODOS los nutrientes estén en adjustment y efficiency
    nutrients.forEach(nutrient => {
      if (requirementData.adjustment[nutrient] === undefined) {
        requirementData.adjustment[nutrient] = 0;
      }
      if (requirementData.efficiency[nutrient] === undefined) {
        requirementData.efficiency[nutrient] = GRANULAR_DEFAULT_EFFICIENCY[nutrient] || 85;
      }
    });

    // 🚀 CRÍTICO: Log completo de requirementData antes de guardar
    console.log('💾 requirementData ANTES DE GUARDAR (Granular):', {
      cropType: requirementData.cropType,
      targetYield: requirementData.targetYield,
      hasExtractionOverrides: !!requirementData.extractionOverrides,
      extractionOverridesKeys: requirementData.extractionOverrides ? Object.keys(requirementData.extractionOverrides) : [],
      extractionOverridesForCrop: requirementData.extractionOverrides && requirementData.cropType ? requirementData.extractionOverrides[requirementData.cropType] : null,
      extractionOverridesCompleto: requirementData.extractionOverrides,
      extractionOverridesCompletoJSON: requirementData.extractionOverrides ? JSON.stringify(requirementData.extractionOverrides) : 'NO HAY',
      extractionOverridesIsEmpty: requirementData.extractionOverrides ? Object.keys(requirementData.extractionOverrides).length === 0 : true,
      hasAdjustment: !!requirementData.adjustment,
      hasEfficiency: !!requirementData.efficiency
    });

    // GUARDAR usando sistema centralizado si está disponible, sino usar método directo
    const useCentralized = typeof window.projectStorage !== 'undefined';
    
    if (useCentralized) {
      // Usar sistema centralizado con merge inteligente
      const existingSection = window.projectStorage.loadSection('granular', projectId) || {};
      // Preservar program.mode si no viene en loadSection
      if (!existingSection.program || typeof existingSection.program.mode !== 'boolean') {
        try {
          const unifiedKey = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
            const stored = JSON.parse(raw);
            const storedProgram = stored?.granular?.program;
            if (storedProgram && typeof storedProgram.mode === 'boolean') {
              existingSection.program = { ...storedProgram };
            }
          }
        } catch (e) {
          console.warn('⚠️ No se pudo preservar program.mode desde unificado:', e);
        }
      }
      const granularData = {
        ...existingSection,
        requirements: requirementData,
        lastUI: { cropType, targetYield } // Sincronizado con requirements
      };
      
      // 🚀 CRÍTICO: Log de granularData antes de guardar
      console.log('💾 granularData ANTES DE GUARDAR EN projectStorage:', {
        hasRequirements: !!granularData.requirements,
        requirementsHasExtractionOverrides: !!granularData.requirements?.extractionOverrides,
        extractionOverridesKeys: granularData.requirements?.extractionOverrides ? Object.keys(granularData.requirements.extractionOverrides) : [],
        extractionOverridesForCrop: granularData.requirements?.extractionOverrides && granularData.requirements?.cropType ? granularData.requirements.extractionOverrides[granularData.requirements.cropType] : null,
        extractionOverridesCompleto: granularData.requirements?.extractionOverrides,
        extractionOverridesCompletoJSON: granularData.requirements?.extractionOverrides ? JSON.stringify(granularData.requirements.extractionOverrides) : 'NO HAY',
        extractionOverridesIsEmpty: granularData.requirements?.extractionOverrides ? Object.keys(granularData.requirements.extractionOverrides).length === 0 : true
      });
      
      const success = window.projectStorage.saveSection('granular', granularData, projectId);
      
      if (success) {
        // 🚀 CRÍTICO: Verificar directamente en localStorage si los datos se guardaron
        try {
          const key = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const stored = JSON.parse(raw);
            const storedGranular = stored.granular;
            const storedRequirements = storedGranular && storedGranular.requirements;
            console.log('🔍 VERIFICACIÓN DIRECTA EN LOCALSTORAGE (Granular):', {
              hasGranular: !!storedGranular,
              hasRequirements: !!storedRequirements,
              requirementsKeys: storedRequirements ? Object.keys(storedRequirements) : [],
              hasExtractionOverrides: !!(storedRequirements && storedRequirements.extractionOverrides),
              extractionOverridesKeys: storedRequirements && storedRequirements.extractionOverrides ? Object.keys(storedRequirements.extractionOverrides) : [],
              extractionOverrides: storedRequirements ? storedRequirements.extractionOverrides : null,
              extractionOverridesCompleto: storedRequirements && storedRequirements.extractionOverrides ? JSON.stringify(storedRequirements.extractionOverrides) : 'NO HAY',
              extractionOverridesForCrop: storedRequirements && storedRequirements.extractionOverrides && cropType ? storedRequirements.extractionOverrides[cropType] : null
            });
          }
        } catch (e) {
          console.warn('⚠️ Error verificando localStorage directamente:', e);
        }
        
        // Verificar que realmente se guardó
        const verified = window.projectStorage.loadSection('granular', projectId);
        if (verified && verified.requirements) {
          const hasAdj = verified.requirements.adjustment;
          const hasEff = verified.requirements.efficiency;
          const hasExtOv = verified.requirements.extractionOverrides;
          console.log('💾 Guardado VERIFICADO Granular (sistema centralizado):', { 
            cropType, 
            targetYield, 
            hasAdjustment: !!hasAdj && Object.keys(hasAdj).length > 0, 
            hasEfficiency: !!hasEff && Object.keys(hasEff).length > 0,
            hasExtractionOverrides: !!hasExtOv && Object.keys(hasExtOv).length > 0,
            extractionOverridesKeys: hasExtOv ? Object.keys(hasExtOv) : [],
            extractionOverridesForCrop: hasExtOv && cropType ? (hasExtOv[cropType] || null) : null,
            adjustmentKeys: hasAdj ? Object.keys(hasAdj) : [],
            efficiencyKeys: hasEff ? Object.keys(hasEff) : [],
            adjustmentVerificado: hasAdj,
            efficiencyVerificado: hasEff,
            extractionOverridesVerificado: hasExtOv
          });
        } else {
          console.error('❌ ERROR: No se pudo verificar el guardado - verified:', verified);
        }
      } else {
        console.error('❌ ERROR: No se pudo guardar usando sistema centralizado');
      }
    } else {
      // Fallback: guardar directamente
      const unifiedKey = `nutriplant_project_${projectId}`;
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
      
      unified.granular = {
        ...(unified.granular || {}),
        requirements: requirementData,
        lastUI: { cropType, targetYield } // Sincronizado con requirements
      };
      
      // 🚀 CRÍTICO: Restaurar location después de actualizar
      if (hasValidLocation) {
        unified.location = existingLocation;
      }
      
      localStorage.setItem(unifiedKey, JSON.stringify(unified));
      
      // Verificar que realmente se guardó
      const verify = localStorage.getItem(unifiedKey);
      if (verify) {
        const verified = JSON.parse(verify);
        const hasAdj = verified.granular && verified.granular.requirements && verified.granular.requirements.adjustment;
        const hasEff = verified.granular && verified.granular.requirements && verified.granular.requirements.efficiency;
        const hasExtOv = verified.granular && verified.granular.requirements && verified.granular.requirements.extractionOverrides;
        console.log('💾 Guardado VERIFICADO Granular (método directo):', { 
          cropType, 
          targetYield, 
          hasAdjustment: !!hasAdj && Object.keys(hasAdj).length > 0, 
          hasEfficiency: !!hasEff && Object.keys(hasEff).length > 0,
          hasExtractionOverrides: !!hasExtOv && Object.keys(hasExtOv).length > 0,
          extractionOverridesKeys: hasExtOv ? Object.keys(hasExtOv) : [],
          extractionOverridesForCrop: hasExtOv && cropType ? (hasExtOv[cropType] || null) : null,
          adjustmentKeys: hasAdj ? Object.keys(hasAdj) : [],
          efficiencyKeys: hasEff ? Object.keys(hasEff) : [],
          extractionOverridesVerificado: hasExtOv
        });
      } else {
        console.error('❌ ERROR: No se pudo verificar el guardado');
      }
    }
    
    // Sincronizar el estado rápido del selector (cultivo y rendimiento)
    rememberGranularUIState();
    
  } catch (error) {
    console.error('❌ Error guardando requerimientos granular:', error);
  }
}

// ===== Autosave (debounce) =====
let saveGranReqTimer = null;
function scheduleSaveGranularRequirements(){
  if (isGranularLoading) {
    return;
  }
  try { if (saveGranReqTimer) clearTimeout(saveGranReqTimer); } catch {}
  saveGranReqTimer = setTimeout(() => {
    try { saveGranularRequirements(); granularReqDirty = false; } catch (e) { console.warn('autosave granularRequirements', e); }
  }, 500);
  granularReqDirty = true;
  if (!granularReqAutosaveInterval) {
    try {
      granularReqAutosaveInterval = setInterval(() => { try { flushGranularRequirementsIfDirty(); } catch {} }, 20000);
    } catch {}
  }
}

// ===== Guardado INMEDIATO (sin debounce) para cambios de pestaña/sección =====
function saveGranularRequirementsImmediate() {
  try {
    // Cancelar cualquier guardado pendiente con debounce
    if (saveGranReqTimer) {
      clearTimeout(saveGranReqTimer);
      saveGranReqTimer = null;
    }
    // Guardar INMEDIATAMENTE
    saveGranularRequirements();
    granularReqDirty = false;
    console.log('⚡ Guardado INMEDIATO de Granular ejecutado');
  } catch (e) {
    console.error('❌ Error en guardado inmediato de Granular:', e);
  }
}

// Hacer la función global - EXPONER INMEDIATAMENTE
window.saveGranularRequirements = saveGranularRequirements;
window.saveGranularRequirementsImmediate = saveGranularRequirementsImmediate;
window.loadGranularRequirements = loadGranularRequirements;
window.calculateGranularNutrientRequirements = calculateGranularNutrientRequirements;
window.renderGranularNutrientTable = renderGranularNutrientTable;

// Cargar cultivos desde la nube (si hay) y aplicarlos al perfil local; retorna Promise
function ensureCustomGranularCropsLoadedFromCloud() {
  const userId = np_getCurrentUserId();
  if (!userId) return Promise.resolve();
  if (typeof window.nutriplantFetchCustomGranularCropsFromCloud !== 'function') return Promise.resolve();
  return window.nutriplantFetchCustomGranularCropsFromCloud(userId).then(function(cloudData) {
    if (cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0) {
      var profile = np_loadUserProfile() || {};
      profile.customGranularCrops = cloudData;
      try { localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile)); } catch (e) {}
      console.log('✅ Cultivos granulares personalizados cargados desde la nube');
    }
  }).catch(function() {});
}

// Función para cargar cultivos personalizados guardados (nube primero, luego local)
function loadCustomGranularCrops() {
  ensureCustomGranularCropsLoadedFromCloud().then(doLoadCustomGranularCrops);
}

function doLoadCustomGranularCrops() {
  try {
    const projectId = getCurrentProjectId();
    if (!projectId) { return; }
    let customCrops = {};
    
    // PRIORIDAD 1: Catálogo por usuario (ya incluye datos de nube si se aplicaron en ensure...)
    const userCustomRaw = np_getUserCustomGranularCrops();
    const userCustom = normalizeCustomCropMap(userCustomRaw);
    if (userCustom && typeof userCustom === 'object') {
      customCrops = { ...userCustom };
    }
    // Si hay sesión y había datos en fallback, subirlos al perfil/nube y limpiar fallback
    const uid = np_getCurrentUserId();
    if (uid) {
      try {
        const raw = localStorage.getItem('granularCustomCrops_global_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            Object.keys(parsed).forEach(function(cropId) {
              var entry = parsed[cropId];
              if (entry && entry.extraction) {
                np_saveUserCustomGranularCrop(cropId, entry.name || formatCustomCropName(cropId), entry.extraction);
                customCrops[cropId] = { name: entry.name || formatCustomCropName(cropId), extraction: entry.extraction };
                GRANULAR_CROP_EXTRACTION_DB[cropId] = entry.extraction;
              }
            });
            localStorage.removeItem('granularCustomCrops_global_user');
          }
        }
      } catch (e) {}
    }
    
    // PRIORIDAD 2: Legacy por proyecto (se fusiona y migra a usuario)
    let legacyCustom = null;
    if (typeof window.projectStorage !== 'undefined') {
      const granularSection = window.projectStorage.loadSection('granular', projectId);
      if (granularSection && granularSection.requirements && granularSection.requirements.customCrops) {
        legacyCustom = granularSection.requirements.customCrops;
      }
    }
    if (!legacyCustom && typeof window.projectManager !== 'undefined' && window.projectManager.loadProjectData) {
      const sectionData = window.projectManager.loadProjectData('granularRequirements');
      if (sectionData && sectionData.customCrops) legacyCustom = sectionData.customCrops;
    }
    if (!legacyCustom) {
      const projectKey = `nutriplant_project_${projectId}`;
      const projectData = JSON.parse(localStorage.getItem(projectKey) || '{}');
      if (projectData.granular && projectData.granular.requirements && projectData.granular.requirements.customCrops) {
        legacyCustom = projectData.granular.requirements.customCrops;
      } else if (projectData.granularRequirements && projectData.granularRequirements.customCrops) {
        legacyCustom = projectData.granularRequirements.customCrops;
      }
    }
    if (!legacyCustom) {
      const projectKey = `nutriplant-project-${projectId}`;
      const projectData = JSON.parse(localStorage.getItem(projectKey) || '{}');
      if (projectData.granularRequirements && projectData.granularRequirements.customCrops) {
        legacyCustom = projectData.granularRequirements.customCrops;
      }
    }
    if (legacyCustom && typeof legacyCustom === 'object') {
      const legacyNormalized = normalizeCustomCropMap(legacyCustom);
      const merged = { ...legacyNormalized, ...customCrops };
      customCrops = merged;
      // Migrar cultivos legacy al catálogo del usuario
      Object.keys(legacyNormalized).forEach(cropId => {
        const entry = legacyNormalized[cropId];
        if (entry && entry.extraction) {
          np_saveUserCustomGranularCrop(cropId, entry.name, entry.extraction);
        }
      });
      console.log('✅ Cultivos personalizados legacy migrados a catálogo usuario');
    }
    
    // Aplicar cultivos personalizados a la base de datos
    if (customCrops && typeof customCrops === 'object') {
      Object.keys(customCrops).forEach(cropId => {
        const entry = customCrops[cropId];
        if (entry && entry.extraction) {
          GRANULAR_CROP_EXTRACTION_DB[cropId] = entry.extraction;
          console.log('✅ Cultivo personalizado cargado:', cropId);
        }
      });
    }
    
    // Actualizar selector con todos los cultivos (predefinidos + personalizados)
    const select = document.getElementById('granularRequerimientoCropType');
    if (select) {
      Object.keys(GRANULAR_CROP_EXTRACTION_DB).forEach(cropId => {
        const existingOption = select.querySelector(`option[value="${cropId}"]`);
        if (!existingOption) {
          const option = document.createElement('option');
          const entry = customCrops[cropId];
          const cropName = entry?.name || formatCustomCropName(cropId);
          option.value = cropId;
          option.textContent = cropName;
          select.appendChild(option);
        }
      });
    }
    renderGranularCustomCropsList();
  } catch (error) {
    console.error('❌ Error cargando cultivos personalizados:', error);
  }
}

// Hacer la función global
window.loadCustomGranularCrops = loadCustomGranularCrops;

// Inicializar cuando se carga la sección
document.addEventListener('DOMContentLoaded', function() {
  console.log('⚪ Nutrición Granular - Requerimiento functions cargado');
  setTimeout(() => loadCustomGranularCrops(), 100);
  // ✅ OPTIMIZADO: Los inputs principales (cultivo y rendimiento) ya tienen onchange inline en el HTML
  // Solo escuchar cambios en inputs dinámicos (extracción, ajuste, eficiencia) que no tienen onchange inline
  document.addEventListener('change', (e) => {
    if (isGranularLoading) { return; }
    const id = e.target && e.target.id;
    
    // NOTA: granularRequerimientoCropType y granularRequerimientoTargetYield ya tienen onchange inline
    // que llama a calculateGranularNutrientRequirements(), NO duplicar aquí
    
    // Solo manejar inputs dinámicos que no tienen onchange inline
    if (id && (id.startsWith('granular-extract-') || id.startsWith('granular-adj-') || id.startsWith('granular-eff-'))) {
      scheduleSaveGranularRequirements();
    }
  });
  
  // ✅ OPTIMIZADO: granularRequerimientoTargetYield ya tiene onchange inline en el HTML
  // El evento 'input' con debounce es útil para feedback en tiempo real, pero puede causar duplicados
  // Mantener solo para casos específicos si es necesario, pero comentado para evitar duplicados
  // Si se necesita feedback en tiempo real, considerar usar solo el debounce sin el onchange inline
  // document.addEventListener('input', (e) => {
  //   if (isGranularLoading) { return; }
  //   const id = e.target && e.target.id;
  //   if (id === 'granularRequerimientoTargetYield') {
  //     clearTimeout(window.granularRecalcTimer);
  //     window.granularRecalcTimer = setTimeout(() => {
  //       if (typeof window.calculateGranularNutrientRequirements === 'function') {
  //         window.calculateGranularNutrientRequirements();
  //       }
  //     }, 300);
  //   }
  // });
  document.addEventListener('input', (e) => {
    if (isGranularLoading) { return; }
    const id = e.target && e.target.id;
    if (id === 'granularRequerimientoTargetYield') {
      clearTimeout(window.granularRecalcTimer);
      window.granularRecalcTimer = setTimeout(() => {
        const currentValue = parseFloat(e.target.value);
        if (typeof window.calculateGranularNutrientRequirements === 'function') {
          window.calculateGranularNutrientRequirements({
            _isLoading: false,
            _userChanged: true,
            targetYield: currentValue
          });
        }
        scheduleSaveGranularRequirements();
      }, 300);
      return;
    }
    if (id && (id.startsWith('granular-extract-') || id.startsWith('granular-adj-') || id.startsWith('granular-eff-'))) {
      scheduleSaveGranularRequirements();
    }
  });
  window.addEventListener('beforeunload', () => { try { flushGranularRequirementsIfDirty(); } catch {} });
  // Guardar al perder visibilidad (cambiar de pestaña/ventana)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      try { flushGranularRequirementsIfDirty(); } catch {}
    }
  });
  // Guardar al ocultar página (más confiable en móviles/iOS)
  window.addEventListener('pagehide', () => {
    try { flushGranularRequirementsIfDirty(); } catch {}
  });
  document.addEventListener('projectChanged', () => {
    try { flushGranularRequirementsIfDirty(); } catch {}
    try { setTimeout(() => loadGranularRequirements(), 50); } catch {}
  });

  // 🚀 CRÍTICO: NO renderizar inicialmente aquí porque loadGranularRequirements() ya lo maneja
  // Si renderizamos aquí ANTES de cargar los overrides, usará valores precargados
  // y sobrescribirá los valores guardados cuando loadGranularRequirements() se ejecute
  // loadGranularRequirements() se llama desde selectGranularSubTab() y maneja toda la renderización
  // try {
  //   const cont = document.getElementById('granularRequerimientoTableContainer');
  //   if (cont && !cont.querySelector('table') && typeof calculateGranularNutrientRequirements === 'function') {
  //     calculateGranularNutrientRequirements();
  //   }
  // } catch {}
});

// Cargar y aplicar requerimientos guardados
function loadGranularRequirements(retryCount = 0) {
  try {
    console.log('🔄 loadGranularRequirements() llamado - iniciando carga...');
    
    // CRÍTICO: Asegurar que esta función esté disponible globalmente
    if (!window.loadGranularRequirements) {
      window.loadGranularRequirements = loadGranularRequirements;
    }
    // Verificar que los elementos existan antes de continuar
    const cropTypeEl = document.getElementById('granularRequerimientoCropType');
    const targetYieldEl = document.getElementById('granularRequerimientoTargetYield');
    
    if (!cropTypeEl || !targetYieldEl) {
      const stillVisible = document.querySelector('.nutricion-granular-container');
      if (!stillVisible) {
        console.debug('⚠️ Nutrición Granular ya no visible, cancelando carga.');
        return;
      }
      if (retryCount >= 10) {
        console.warn('⚠️ Elementos de Granular no aparecieron tras múltiples intentos. Abortando.');
        return;
      }
      console.debug(`⚠️ Elementos DOM de Granular aún no listos (intento ${retryCount + 1}), reintentando...`);
      setTimeout(() => loadGranularRequirements(retryCount + 1), 200);
      return;
    }
    
    console.log('✅ Elementos DOM encontrados, continuando con carga...');
    
    const projectId = getCurrentProjectId();
    if (!projectId) {
      console.warn('⚠️ No hay proyecto seleccionado para cargar Granular. Mostrando valores por defecto.');
      // CRÍTICO: Limpiar savedGranularAdjustments cuando no hay proyecto
      savedGranularAdjustments = null;
      savedGranularEfficiencies = null;
      if (typeof calculateGranularNutrientRequirements === 'function') {
        calculateGranularNutrientRequirements({ _skipLoadFromStorage: true });
      }
      return;
    }
    let requirementData = null;
    
    // PRIORIDAD 1: Sistema centralizado si está disponible
    const useCentralized = typeof window.projectStorage !== 'undefined';
    if (useCentralized) {
      const granularSection = window.projectStorage.loadSection('granular', projectId);
      // 🚀 CRÍTICO: Log de granularSection completo para diagnosticar
      console.log('🔍 granularSection COMPLETO desde loadSection:', {
        hasGranularSection: !!granularSection,
        granularSectionKeys: granularSection ? Object.keys(granularSection) : [],
        hasRequirements: !!(granularSection && granularSection.requirements),
        requirementsKeys: granularSection && granularSection.requirements ? Object.keys(granularSection.requirements) : [],
        requirementsHasExtractionOverrides: !!(granularSection && granularSection.requirements && granularSection.requirements.extractionOverrides),
        requirementsExtractionOverridesKeys: granularSection && granularSection.requirements && granularSection.requirements.extractionOverrides ? Object.keys(granularSection.requirements.extractionOverrides) : [],
        requirementsExtractionOverrides: granularSection && granularSection.requirements ? granularSection.requirements.extractionOverrides : null
      });
      
      if (granularSection && granularSection.requirements) {
        requirementData = granularSection.requirements;
        console.log('✅ Datos Granular cargados desde sistema centralizado:', { 
          cropType: requirementData.cropType, 
          targetYield: requirementData.targetYield,
          hasAdjustment: !!requirementData.adjustment,
          hasEfficiency: !!requirementData.efficiency,
          hasExtractionOverrides: !!requirementData.extractionOverrides,
          extractionOverridesKeys: requirementData.extractionOverrides ? Object.keys(requirementData.extractionOverrides) : [],
          extractionOverrides: requirementData.extractionOverrides,
          isUserSaved: requirementData.isUserSaved
        });
        
        // 🚀 CRÍTICO: Verificar directamente en localStorage para comparar
        try {
          const key = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const stored = JSON.parse(raw);
            const storedGranular = stored.granular;
            const storedRequirements = storedGranular && storedGranular.requirements;
            console.log('🔍 VERIFICACIÓN DIRECTA EN LOCALSTORAGE AL CARGAR:', {
              hasGranular: !!storedGranular,
              hasRequirements: !!storedRequirements,
              requirementsKeys: storedRequirements ? Object.keys(storedRequirements) : [],
              hasExtractionOverrides: !!(storedRequirements && storedRequirements.extractionOverrides),
              extractionOverridesKeys: storedRequirements && storedRequirements.extractionOverrides ? Object.keys(storedRequirements.extractionOverrides) : [],
              extractionOverridesCompleto: storedRequirements ? storedRequirements.extractionOverrides : null,
              extractionOverridesCompletoJSON: storedRequirements && storedRequirements.extractionOverrides ? JSON.stringify(storedRequirements.extractionOverrides) : 'NO HAY',
              extractionOverridesForCrop: storedRequirements && storedRequirements.extractionOverrides && requirementData.cropType ? storedRequirements.extractionOverrides[requirementData.cropType] : null
            });
            
            // 🚀 CRÍTICO: Si localStorage TIENE extractionOverrides pero requirementData NO, USAR localStorage
            if (storedRequirements && storedRequirements.extractionOverrides && !requirementData.extractionOverrides) {
              console.warn('⚠️ ¡PROBLEMA DETECTADO! localStorage TIENE extractionOverrides pero loadSection NO lo devolvió');
              console.log('🔧 CORRIGIENDO: Usando extractionOverrides directamente desde localStorage');
              requirementData.extractionOverrides = storedRequirements.extractionOverrides;
              console.log('✅ extractionOverrides corregido desde localStorage:', Object.keys(requirementData.extractionOverrides));
            }
          }
        } catch (e) {
          console.warn('⚠️ Error verificando localStorage al cargar:', e);
        }
      }
    }
    
    // PRIORIDAD 2: Esquema unificado (nutriplant_project_<id>) - fallback
    if (!requirementData) {
      try {
        const unifiedKey = `nutriplant_project_${projectId}`;
        const raw = localStorage.getItem(unifiedKey);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.granular && o.granular.requirements) {
            requirementData = o.granular.requirements;
            console.log('✅ Datos Granular cargados desde unificado:', { cropType: requirementData.cropType, targetYield: requirementData.targetYield });
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando desde unificado:', e);
      }
    }
    
    // PRIORIDAD 3: projectManager - fallback
    if (!requirementData && typeof window.projectManager !== 'undefined') {
      const project = window.projectManager.getCurrentProject();
      if (project && project.granularRequirements) {
        requirementData = project.granularRequirements;
      }
    }
    
    // PRIORIDAD 4: projectManager.loadProjectData - fallback
    if (!requirementData && typeof window.projectManager !== 'undefined' && window.projectManager.loadProjectData) {
      requirementData = window.projectManager.loadProjectData('granularRequirements');
    }
    
    // PRIORIDAD 5: Formato nuevo (nutriplant_project_<id>) - fallback
    if (!requirementData) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const projectKey = `nutriplant_project_${projectId}`;
      const projectData = JSON.parse(localStorage.getItem(projectKey) || '{}');
      if (projectData.granularRequirements) {
        requirementData = projectData.granularRequirements;
      }
    }
    
    if (!requirementData) {
      console.log('ℹ️ No hay datos guardados de Granular para este proyecto - usando valores precargados');
      // NO retornar - dejar que se calcule con valores precargados
      // Pero marcar que no hay datos guardados para que se guarden cuando el usuario modifique
      requirementData = null;
    }

    // REGLA: Si hay datos guardados, aplicarlos. Si no, usar valores precargados
    if (requirementData) {
      const select = document.getElementById('granularRequerimientoCropType');
      if (select && requirementData.cropType) {
        const exists = select.querySelector(`option[value="${requirementData.cropType}"]`);
        if (!exists) {
          const option = document.createElement('option');
          option.value = requirementData.cropType;
          option.textContent = requirementData.cropType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          select.appendChild(option);
        }
        // CRÍTICO: Establecer valor SIN disparar eventos que recalculen sin valores guardados
        const oldOnChange = select.getAttribute('onchange');
        select.removeAttribute('onchange');
        select.value = requirementData.cropType;
        if (oldOnChange) select.setAttribute('onchange', oldOnChange);
      }
      const targetYieldInput = document.getElementById('granularRequerimientoTargetYield');
      if (targetYieldInput && requirementData.targetYield != null) {
        // CRÍTICO: Establecer valor SIN disparar eventos que recalculen sin valores guardados
        const oldOnChange = targetYieldInput.getAttribute('onchange');
        targetYieldInput.removeAttribute('onchange');
        targetYieldInput.value = requirementData.targetYield;
        if (oldOnChange) targetYieldInput.setAttribute('onchange', oldOnChange);
      }
      
      // 🚀 CRÍTICO: Cargar extractionOverrides en variable global (IGUAL QUE AJUSTE Y EFICIENCIA)
      // Esto asegura que savedGranularExtractionOverrides tenga los valores guardados
      if (requirementData.extractionOverrides && typeof requirementData.extractionOverrides === 'object') {
        savedGranularExtractionOverrides = { ...requirementData.extractionOverrides };
        console.log('✅ extractionOverrides cargados en variable global:', Object.keys(savedGranularExtractionOverrides));
        const cropTypeToApply = select ? (select.value || requirementData.cropType) : requirementData.cropType;
        if (cropTypeToApply && savedGranularExtractionOverrides[cropTypeToApply]) {
          console.log('✅ extractionOverrides disponibles para', cropTypeToApply, ':', savedGranularExtractionOverrides[cropTypeToApply]);
        }
      } else {
        // Limpiar variable global si no hay overrides guardados
        savedGranularExtractionOverrides = {};
        console.log('ℹ️ No hay extractionOverrides guardados - variable global limpiada');
      }
      
      // Guardar estado rápido con los valores aplicados
      rememberGranularUIState();
    if (typeof requirementData.isElementalMode === 'boolean') {
      isGranularRequerimientoElementalMode = requirementData.isElementalMode;
      window.isGranularRequerimientoElementalMode = isGranularRequerimientoElementalMode;
      window.granularElementalModeLoaded = true;
      const btn = document.getElementById('toggleGranularRequerimientoOxideElementalBtn');
      if (btn) { btn.textContent = isGranularRequerimientoElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental'; }
    } else {
      window.isGranularRequerimientoElementalMode = isGranularRequerimientoElementalMode || false;
      window.granularElementalModeLoaded = true;
    }
    }
    // 🚀 CRÍTICO: Renderizar usando los datos guardados
    // Los ajustes y eficiencias son INDEPENDIENTES del cultivo
    // Usar el cultivo ACTUAL del DOM, pero mantener los ajustes/eficiencias guardados
    // IMPORTANTE: Los extractionOverrides ya se aplicaron arriba a GRANULAR_CROP_EXTRACTION_DB,
    // por lo que calculateGranularNutrientRequirements() usará los valores correctos
    const currentCropType = cropTypeEl ? cropTypeEl.value : null;
    const currentTargetYield = targetYieldEl ? parseFloat(targetYieldEl.value) : null;
    
    if (requirementData) {
      if (typeof requirementData.adjustmentsAuto === 'boolean') {
        savedGranularAdjustmentsAuto = requirementData.adjustmentsAuto;
      } else if (requirementData.cropType && requirementData.targetYield != null) {
        const baseExtraction = { ...(GRANULAR_CROP_EXTRACTION_DB[requirementData.cropType] || {}) };
        if (requirementData.extractionOverrides && requirementData.extractionOverrides[requirementData.cropType]) {
          Object.assign(baseExtraction, requirementData.extractionOverrides[requirementData.cropType]);
        }
        const baseMatches = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'].every(n => {
          const baseValue = parseFloat(((baseExtraction[n] || 0) * requirementData.targetYield).toFixed(2));
          const savedValue = requirementData.adjustment && typeof requirementData.adjustment[n] === 'number' ? requirementData.adjustment[n] : baseValue;
          return Math.abs(baseValue - savedValue) < 0.0001;
        });
        savedGranularAdjustmentsAuto = baseMatches;
      } else {
        savedGranularAdjustmentsAuto = true;
      }
    }

    if (requirementData && requirementData.adjustment && requirementData.efficiency) {
      console.log('✅ Aplicando valores guardados de Granular:', {
        cropTypeGuardado: requirementData.cropType,
        cropTypeActual: currentCropType,
        targetYieldGuardado: requirementData.targetYield,
        targetYieldActual: currentTargetYield,
        hasAdjustment: Object.keys(requirementData.adjustment).length > 0,
        hasEfficiency: Object.keys(requirementData.efficiency).length > 0,
        adjustmentSample: requirementData.adjustment.K2O || requirementData.adjustment.N || 'ninguno',
        efficiencySample: requirementData.efficiency.K2O || requirementData.efficiency.N || 'ninguno'
      });
      console.log('📋 Ajustes guardados completos (INDEPENDIENTES del cultivo):', requirementData.adjustment);
      console.log('📋 Eficiencias guardadas completas (INDEPENDIENTES del cultivo):', requirementData.efficiency);
      
      // CRÍTICO: Usar el cultivo ACTUAL del DOM, pero mantener los ajustes/eficiencias guardados
      // Los ajustes y eficiencias son valores del usuario, no dependen del cultivo
      // 🚀 CRÍTICO: Pasar extractionOverrides explícitamente para asegurar que se usen
      calculateGranularNutrientRequirements({ 
        _isLoading: true, // Marcar que estamos cargando, no guardar automáticamente
        cropType: currentCropType || requirementData.cropType, // Usar cultivo actual si existe
        targetYield: (currentTargetYield != null && !isNaN(currentTargetYield)) ? currentTargetYield : requirementData.targetYield, // Usar rendimiento actual si existe
        adjustment: requirementData.adjustment, // SIEMPRE usar ajustes guardados (independientes del cultivo)
        efficiency: requirementData.efficiency, // SIEMPRE usar eficiencias guardadas (independientes del cultivo)
        extractionOverrides: requirementData.extractionOverrides || savedGranularExtractionOverrides // 🚀 CRÍTICO: Pasar extractionOverrides explícitamente
      });
    } else {
      console.log('ℹ️ No hay valores guardados - usando PRECARGADOS (fórmulas predefinidas)');
      // CRÍTICO: Limpiar savedGranularAdjustments cuando NO hay datos guardados
      // para asegurar que los ajustes se inicialicen con la extracción total
      savedGranularAdjustments = null;
      savedGranularEfficiencies = null;
      if (typeof calculateGranularNutrientRequirements === 'function') {
        // CRÍTICO: Pasar _skipLoadFromStorage para evitar que intente cargar desde localStorage
        // ya que loadGranularRequirements ya determinó que no hay datos guardados
        calculateGranularNutrientRequirements({ _skipLoadFromStorage: true });
      }
    }
    
    if (requirementData) {
    console.log('✅ Requerimientos de nutrición granular cargados y aplicados:', {
      cropType: requirementData.cropType,
      targetYield: requirementData.targetYield,
      hasAdjustments: Object.keys(requirementData.adjustment || {}).length > 0,
      hasEfficiencies: Object.keys(requirementData.efficiency || {}).length > 0
    });
    } else {
      console.log('✅ Requerimientos de nutrición granular cargados (sin datos guardados - usando precargados)');
    }
  } catch (error) {
    console.error('❌ Error cargando requerimientos de nutrición granular:', error);
    // CRÍTICO: Asegurar que la función esté disponible incluso si hay error
    if (!window.loadGranularRequirements) {
      window.loadGranularRequirements = loadGranularRequirements;
    }
  }
}

// Ya está expuesta arriba, no duplicar


// Verificación de que las funciones críticas estén disponibles
if (typeof window.saveGranularRequirements === 'function') {
  console.log('✅ saveGranularRequirements disponible');
} else {
  console.error('❌ saveGranularRequirements NO está disponible');
}

// Asegurar que todas las funciones críticas estén expuestas
window.flushGranularRequirementsIfDirty = flushGranularRequirementsIfDirty;
window.scheduleSaveGranularRequirements = scheduleSaveGranularRequirements;
window.applyGranularUIState = applyGranularUIState;
window.rememberGranularUIState = rememberGranularUIState;
window.calculateGranularNutrientRequirements = calculateGranularNutrientRequirements;
window.renderGranularNutrientTable = renderGranularNutrientTable;
window.toggleGranularRequerimientoOxideElemental = toggleGranularRequerimientoOxideElemental;

// ===== FUNCIÓN DE DIAGNÓSTICO PARA CONSOLA =====
window.diagnoseGranularStorage = function() {
  console.log('🔍 ===== DIAGNÓSTICO DE ALMACENAMIENTO GRANULAR =====');
  
  try {
    // 1. Obtener ID del proyecto actual
    let projectId = null;
    if (typeof getCurrentProjectId === 'function') {
      projectId = getCurrentProjectId();
    } else if (window.projectManager && window.projectManager.getCurrentProject) {
      const project = window.projectManager.getCurrentProject();
      projectId = project ? project.id : null;
    } else if (window.currentProject && window.currentProject.id) {
      projectId = window.currentProject.id;
    } else {
      projectId = localStorage.getItem('nutriplant-current-project');
    }
    if (!projectId) {
      console.error('❌ No hay proyecto seleccionado');
      return;
    }
    console.log('✅ Proyecto ID:', projectId);
    
    // 2. Verificar datos desde projectStorage (sistema centralizado)
    if (window.projectStorage) {
      const granularSection = window.projectStorage.loadSection('granular', projectId);
      if (granularSection && granularSection.requirements) {
        const req = granularSection.requirements;
        console.log('✅ Datos encontrados en projectStorage:');
        console.log('  - Cultivo:', req.cropType);
        console.log('  - Rendimiento objetivo:', req.targetYield);
        console.log('  - Ajustes guardados:', req.adjustment);
        console.log('  - Eficiencias guardadas:', req.efficiency);
        console.log('  - Timestamp:', req.timestamp);
        console.log('  - Es guardado del usuario:', req.isUserSaved);
        
        // Mostrar valores específicos de ajustes
        if (req.adjustment) {
          console.log('📊 AJUSTES GUARDADOS (muestra):');
          console.log('  - N:', req.adjustment.N);
          console.log('  - P2O5:', req.adjustment.P2O5);
          console.log('  - K2O:', req.adjustment.K2O);
          console.log('  - CaO:', req.adjustment.CaO);
          console.log('  - MgO:', req.adjustment.MgO);
        }
        
        // Mostrar valores específicos de eficiencias
        if (req.efficiency) {
          console.log('⚡ EFICIENCIAS GUARDADAS (muestra):');
          console.log('  - N:', req.efficiency.N);
          console.log('  - P2O5:', req.efficiency.P2O5);
          console.log('  - K2O:', req.efficiency.K2O);
          console.log('  - CaO:', req.efficiency.CaO);
          console.log('  - MgO:', req.efficiency.MgO);
        }
    } else {
        console.warn('⚠️ No hay datos en projectStorage para sección granular');
      }
    } else {
      console.warn('⚠️ projectStorage no está disponible');
    }
    
    // 3. Verificar datos desde localStorage directo
          const unifiedKey = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
      const projectData = JSON.parse(raw);
      if (projectData.granular && projectData.granular.requirements) {
        const req = projectData.granular.requirements;
        console.log('✅ Datos encontrados en localStorage directo:');
        console.log('  - Cultivo:', req.cropType);
        console.log('  - Rendimiento objetivo:', req.targetYield);
        console.log('  - Ajustes guardados:', req.adjustment);
        console.log('  - Eficiencias guardadas:', req.efficiency);
              } else {
        console.warn('⚠️ No hay datos granular en localStorage');
      }
    } else {
      console.warn('⚠️ No hay datos del proyecto en localStorage');
    }
    
    // 4. Verificar valores actuales en el DOM
    console.log('🔍 Valores actuales en el DOM:');
    const cropEl = document.getElementById('granularRequerimientoCropType');
    const yieldEl = document.getElementById('granularRequerimientoTargetYield');
    if (cropEl) console.log('  - Cultivo (DOM):', cropEl.value);
    if (yieldEl) console.log('  - Rendimiento (DOM):', yieldEl.value);
    
    const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
    console.log('  - Ajustes en DOM:');
    nutrients.forEach(n => {
      const adjEl = document.getElementById(`granular-adj-${n}`);
      if (adjEl) console.log(`    ${n}:`, adjEl.value);
    });
    
    console.log('  - Eficiencias en DOM:');
    nutrients.forEach(n => {
      const effEl = document.getElementById(`granular-eff-${n}`);
      if (effEl) console.log(`    ${n}:`, effEl.value);
    });
    
    // 5. Verificar variables globales
    console.log('🔍 Variables globales:');
    console.log('  - savedGranularAdjustments:', savedGranularAdjustments);
    console.log('  - savedGranularEfficiencies:', savedGranularEfficiencies);
    
    console.log('✅ ===== FIN DEL DIAGNÓSTICO =====');
  } catch (e) {
    console.error('❌ Error en diagnóstico:', e);
  }
};

// Asegurar que la función esté disponible inmediatamente
if (typeof window.diagnoseGranularStorage === 'function') {
  console.log('✅ Función diagnoseGranularStorage disponible');
} else {
  console.warn('⚠️ Función diagnoseGranularStorage NO está disponible');
}

// ====== FUNCIÓN DE PRUEBA AUTOMÁTICA ======
// Prueba rápida: guarda valores actuales, simula cambio de pestaña, carga y compara
window.testGranularSaveLoad = function() {
  console.log('🧪 INICIANDO PRUEBA DE GUARDADO Y CARGA...');
  
  // 1. Capturar valores actuales del DOM
  const currentValues = {
    cropType: document.getElementById('granularRequerimientoCropType')?.value || '',
    targetYield: document.getElementById('granularRequerimientoTargetYield')?.value || '',
    adjustments: {},
    efficiencies: {}
  };
  
  const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
  nutrients.forEach(n => {
    const adjEl = document.getElementById(`granular-adj-${n}`);
    const effEl = document.getElementById(`granular-eff-${n}`);
    if (adjEl) currentValues.adjustments[n] = adjEl.value;
    if (effEl) currentValues.efficiencies[n] = effEl.value;
  });
  
  console.log('📋 Valores capturados del DOM:', currentValues);
  
  // 2. Guardar valores
  if (typeof window.saveGranularRequirementsImmediate === 'function') {
    window.saveGranularRequirementsImmediate();
    console.log('💾 Valores guardados');
  } else if (typeof window.saveGranularRequirements === 'function') {
    window.saveGranularRequirements();
    console.log('💾 Valores guardados (método normal)');
  } else {
    alert('❌ Error: No se puede guardar - función no disponible');
    return;
  }
  
  // 3. Esperar un momento para que se complete el guardado
  setTimeout(() => {
    // 4. Cargar valores guardados
    if (typeof window.loadGranularRequirements === 'function') {
      window.loadGranularRequirements();
      console.log('🔄 Valores cargados');
    } else {
      alert('❌ Error: No se puede cargar - función no disponible');
    return;
  }
  
    // 5. Esperar a que se renderice la tabla
    setTimeout(() => {
      // 6. Comparar valores cargados con los originales
      const loadedValues = {
        cropType: document.getElementById('granularRequerimientoCropType')?.value || '',
        targetYield: document.getElementById('granularRequerimientoTargetYield')?.value || '',
        adjustments: {},
        efficiencies: {}
      };
      
      nutrients.forEach(n => {
        const adjEl = document.getElementById(`granular-adj-${n}`);
        const effEl = document.getElementById(`granular-eff-${n}`);
        if (adjEl) loadedValues.adjustments[n] = adjEl.value;
        if (effEl) loadedValues.efficiencies[n] = effEl.value;
      });
      
      console.log('📋 Valores cargados del DOM:', loadedValues);
      
      // 7. Comparar y mostrar resultados
      const results = {
        cropType: currentValues.cropType === loadedValues.cropType ? '✅' : '❌',
        targetYield: currentValues.targetYield === loadedValues.targetYield ? '✅' : '❌',
        adjustments: {},
        efficiencies: {}
      };
      
      let adjustmentsOk = 0;
      let adjustmentsFail = 0;
      let efficienciesOk = 0;
      let efficienciesFail = 0;
      
      nutrients.forEach(n => {
        const adjMatch = Math.abs(parseFloat(currentValues.adjustments[n] || 0) - parseFloat(loadedValues.adjustments[n] || 0)) < 0.01;
        const effMatch = Math.abs(parseFloat(currentValues.efficiencies[n] || 0) - parseFloat(loadedValues.efficiencies[n] || 0)) < 0.01;
        
        results.adjustments[n] = adjMatch ? '✅' : '❌';
        results.efficiencies[n] = effMatch ? '✅' : '❌';
        
        if (adjMatch) adjustmentsOk++; else adjustmentsFail++;
        if (effMatch) efficienciesOk++; else efficienciesFail++;
      });
      
      // 8. Mostrar resultados en un mensaje claro
      const summary = `
🧪 RESULTADO DE LA PRUEBA:

📊 RESUMEN:
• Cultivo: ${results.cropType} ${currentValues.cropType === loadedValues.cropType ? '' : `(Guardado: ${currentValues.cropType}, Cargado: ${loadedValues.cropType})`}
• Rendimiento: ${results.targetYield} ${currentValues.targetYield === loadedValues.targetYield ? '' : `(Guardado: ${currentValues.targetYield}, Cargado: ${loadedValues.targetYield})`}
• Ajustes: ${adjustmentsOk} ✅ / ${adjustmentsFail} ❌
• Eficiencias: ${efficienciesOk} ✅ / ${efficienciesFail} ❌

${adjustmentsFail > 0 || efficienciesFail > 0 ? '⚠️ HAY PROBLEMAS - Revisa la consola para detalles' : '✅ TODO CORRECTO - Los valores se mantienen correctamente'}

🔍 Revisa la consola (F12) para ver los valores detallados.
      `.trim();
      
      alert(summary);
      console.log('📊 RESULTADOS DETALLADOS:', results);
      
      // Mostrar nutrientes problemáticos
      if (adjustmentsFail > 0 || efficienciesFail > 0) {
        console.log('❌ NUTRIENTES CON PROBLEMAS:');
        nutrients.forEach(n => {
          if (results.adjustments[n] === '❌') {
            console.log(`  Ajuste ${n}: Guardado=${currentValues.adjustments[n]}, Cargado=${loadedValues.adjustments[n]}`);
          }
          if (results.efficiencies[n] === '❌') {
            console.log(`  Eficiencia ${n}: Guardado=${currentValues.efficiencies[n]}, Cargado=${loadedValues.efficiencies[n]}`);
          }
        });
      }
    }, 1000); // Esperar 1 segundo para que se renderice
  }, 500); // Esperar 500ms para que se complete el guardado
};

// 🚀 CRÍTICO: NO exponer de nuevo - ya se expuso en línea 525
// window.updateGranularExtractionPerTon = updateGranularExtractionPerTon; // ❌ DUPLICADO - ELIMINADO
window.updateGranularAdjustment = updateGranularAdjustment;
window.updateGranularEfficiency = updateGranularEfficiency;
