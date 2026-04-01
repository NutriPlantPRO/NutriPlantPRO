// =====================================================
// FERTIRRIEGO - FUNCIONES DE REQUERIMIENTO NUTRICIONAL
// =====================================================
console.log('📦 fertirriego-functions.js cargado (v1758360000)');

// 🚀 CRÍTICO: Exponer stubs inmediatamente para evitar errores de "no disponible"
// Estas funciones se reemplazarán con las implementaciones reales más adelante
// NOTA: Los stubs son funciones muy cortas (< 200 caracteres) para que dashboard.js pueda distinguirlas de las funciones reales
if (typeof window !== 'undefined') {
  // Stub para loadFertirriegoRequirements
  if (!window.loadFertirriegoRequirements) {
    window.loadFertirriegoRequirements = function() {
      console.log('⏳ loadFertirriegoRequirements: Esperando implementación completa...');
    };
  }
  
  // Stub para calculateNutrientRequirements
  if (!window.calculateNutrientRequirements) {
    window.calculateNutrientRequirements = function() {
      console.log('⏳ calculateNutrientRequirements: Esperando implementación completa...');
    };
  }
  
  // Stub para saveFertirriegoRequirements
  if (!window.saveFertirriegoRequirements) {
    window.saveFertirriegoRequirements = function() {
      console.log('⏳ saveFertirriegoRequirements: Esperando implementación completa...');
    };
  }
  
  // Stub para saveFertirriegoRequirementsImmediate
  if (!window.saveFertirriegoRequirementsImmediate) {
    window.saveFertirriegoRequirementsImmediate = function() {
      console.log('⏳ saveFertirriegoRequirementsImmediate: Esperando implementación completa...');
    };
  }
  
  console.log('✅ Stubs de Fertirriego expuestos inmediatamente');
}

// Base de datos de extracción por tonelada de cultivos
const CROP_EXTRACTION_DB = {
  'aguacate': { N: 9, P2O5: 4, K2O: 16, CaO: 8, MgO: 4, S: 0, SO4: 10, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
  'fresa': { N: 6, P2O5: 2, K2O: 10, CaO: 3, MgO: 2, S: 0, SO4: 6, Fe: 0.05, Mn: 0.04, B: 0.03, Zn: 0.08, Cu: 0.006, Mo: 0.02, SiO2: 0 },
  'frambuesa': { N: 7, P2O5: 2.5, K2O: 11, CaO: 4, MgO: 2.5, S: 0, SO4: 7.5, Fe: 0.06, Mn: 0.05, B: 0.035, Zn: 0.1, Cu: 0.007, Mo: 0.025, SiO2: 0 },
  'tomate': { N: 5, P2O5: 2, K2O: 8, CaO: 4, MgO: 2, S: 0, SO4: 4.5, Fe: 0.06, Mn: 0.05, B: 0.03, Zn: 0.12, Cu: 0.006, Mo: 0.02, SiO2: 0 },
  'chile': { N: 6.5, P2O5: 2.5, K2O: 9, CaO: 4.5, MgO: 2.2, S: 0, SO4: 6, Fe: 0.065, Mn: 0.055, B: 0.035, Zn: 0.14, Cu: 0.007, Mo: 0.03, SiO2: 0 },
  'sandia': { N: 3.5, P2O5: 1.5, K2O: 5, CaO: 2, MgO: 1, S: 0, SO4: 3, Fe: 0.04, Mn: 0.03, B: 0.02, Zn: 0.08, Cu: 0.005, Mo: 0.015, SiO2: 0 },
  'melon': { N: 4, P2O5: 1.8, K2O: 6, CaO: 2.5, MgO: 1.2, S: 0, SO4: 3.6, Fe: 0.045, Mn: 0.035, B: 0.025, Zn: 0.1, Cu: 0.006, Mo: 0.02, SiO2: 0 },
  'banano': { N: 4, P2O5: 1.2, K2O: 12, CaO: 0.8, MgO: 0.5, S: 0, SO4: 0.9, Fe: 0.015, Mn: 0.012, B: 0.008, Zn: 0.03, Cu: 0.002, Mo: 0.005, SiO2: 0 },
  'papaya': { N: 4.5, P2O5: 1.5, K2O: 7, CaO: 3, MgO: 1.5, S: 0, SO4: 4.5, Fe: 0.05, Mn: 0.04, B: 0.03, Zn: 0.1, Cu: 0.006, Mo: 0.02, SiO2: 0 },
  'pepino': { N: 4, P2O5: 1.5, K2O: 6, CaO: 3, MgO: 1.5, S: 0, SO4: 3, Fe: 0.05, Mn: 0.04, B: 0.025, Zn: 0.1, Cu: 0.005, Mo: 0.02, SiO2: 0 },
  'lechuga': { N: 3, P2O5: 1, K2O: 4, CaO: 2, MgO: 1, S: 0, SO4: 2.4, Fe: 0.04, Mn: 0.03, B: 0.02, Zn: 0.08, Cu: 0.005, Mo: 0.015, SiO2: 0 },
  'cebolla': { N: 2.5, P2O5: 1, K2O: 3.5, CaO: 1.5, MgO: 0.8, S: 0, SO4: 4.5, Fe: 0.04, Mn: 0.03, B: 0.02, Zn: 0.08, Cu: 0.005, Mo: 0.015, SiO2: 0 },
  'maiz': { N: 18, P2O5: 4, K2O: 16, CaO: 2, MgO: 1, S: 0, SO4: 6, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
  // Caña (ajustado a valores por tonelada de la referencia)
  // S expresado como SO4 (0.50 S → ≈1.50 SO4)
  'cana': { N: 1.81, P2O5: 0.36, K2O: 2.11, CaO: 0.91, MgO: 0.42, S: 0, SO4: 1.50, Fe: 0.0375, Mn: 0.0155, B: 0.00074, Zn: 0.0062, Cu: 0.0022, Mo: 0.0, SiO2: 0 },
  'arandano': { N: 8, P2O5: 3, K2O: 12, CaO: 4, MgO: 2.5, S: 0, SO4: 6, Fe: 0.07, Mn: 0.06, B: 0.04, Zn: 0.12, Cu: 0.008, Mo: 0.025, SiO2: 0 },
  'limon': { N: 10, P2O5: 3.5, K2O: 18, CaO: 12, MgO: 3, S: 0, SO4: 7.5, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.15, Cu: 0.015, Mo: 0.03, SiO2: 0 },
  'pimiento': { N: 5.5, P2O5: 2.2, K2O: 8.5, CaO: 4.5, MgO: 2, S: 0, SO4: 6, Fe: 0.065, Mn: 0.055, B: 0.035, Zn: 0.13, Cu: 0.007, Mo: 0.025, SiO2: 0 }
};

const FERTIRRIEGO_NUTRIENTS = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];

// Eficiencia predeterminada de fertilizantes (%)
const DEFAULT_EFFICIENCY = {
  N: 75, P2O5: 50, K2O: 90, CaO: 90, MgO: 90, S: 90, SO4: 90, 
  Fe: 85, Mn: 85, B: 85, Zn: 85, Cu: 85, Mo: 85, SiO2: 90
};

// Variable global para el modo de visualización
let isFertirriegoElementalMode = false;
// 🚀 CRÍTICO: Exponer en window para acceso global desde dashboard.js
window.isFertirriegoElementalMode = false;
// Evita sobreescrituras antes de que la carga real termine
window.fertirriegoElementalModeLoaded = false;

// Los stubs ya están expuestos al inicio del archivo (líneas 6-48)
// No duplicar aquí - las funciones reales se expondrán al final

// Factores de conversión
const FERTIRRIEGO_CONVERSION_FACTORS = {
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

// Estado global para controlar cargas y reutilizar valores ya calculados
let isFertirriegoLoading = false;
let userIsChangingValue = false; // Bandera para evitar que se restauren valores mientras el usuario está escribiendo
let savedFertiAdjustments = null;
let savedFertiEfficiencies = null;
let savedFertiAdjustmentsAuto = true;
let lastFertiCrop = null;
let lastFertiTargetYield = null;
let fertirriegoHydrationState = {
  projectId: null,
  inProgress: false,
  writeUnlocked: true
};

function lockFertirriegoWrites(projectId) {
  if (!projectId) return;
  fertirriegoHydrationState.projectId = projectId;
  fertirriegoHydrationState.inProgress = true;
  fertirriegoHydrationState.writeUnlocked = false;
}

function unlockFertirriegoWrites(projectId) {
  if (!projectId) return;
  if (fertirriegoHydrationState.projectId && String(fertirriegoHydrationState.projectId) !== String(projectId)) return;
  fertirriegoHydrationState.projectId = projectId;
  fertirriegoHydrationState.inProgress = false;
  fertirriegoHydrationState.writeUnlocked = true;
}

function isFertirriegoWriteLocked(projectId) {
  if (!projectId) return false;
  if (!fertirriegoHydrationState.inProgress) return false;
  if (String(fertirriegoHydrationState.projectId || '') !== String(projectId)) return false;
  return fertirriegoHydrationState.writeUnlocked !== true;
}

// ====== Autosave y estado sucio (dirty) para Requerimiento (Fertirriego) ======
let fertiReqDirty = false;
let fertiReqAutosaveInterval = null;
function flushFertirriegoRequirementsIfDirty(){
  try {
    if (fertiReqDirty) {
      const saved = saveFertirriegoRequirements();
      if (saved !== false) fertiReqDirty = false;
    }
  } catch (e) { console.warn('flushFertirriegoRequirementsIfDirty', e); }
}

// ==== Utilidades de almacenamiento unificado (formato Enmienda) ====
function fertReqGetUnifiedProjectId(){
  try { if (window.projectManager && window.projectManager.getCurrentProject) { const p = window.projectManager.getCurrentProject(); if (p && p.id) return p.id; } } catch {}
  try { if (window.currentProject && window.currentProject.id) return window.currentProject.id; } catch {}
  try { const pid = localStorage.getItem('nutriplant-current-project'); if (pid) return pid; } catch {}
  return null;
}
function fertReqUnifiedKey(){ const id = fertReqGetUnifiedProjectId(); return id ? `nutriplant_project_${id}` : null; }
function fertReqUnifiedMerge(updater){
  try {
    const key = fertReqUnifiedKey(); if (!key) return;
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
  } catch(e){ console.warn('fertReqUnifiedMerge error', e); }
}

// Función para alternar entre óxido y elemental
function toggleFertirriegoOxideElemental() {
  // Preservar ajustes manuales al cambiar de modo
  let manualAdjustments = null;
  const nutrients = FERTIRRIEGO_NUTRIENTS;
  const hasManualDiff = nutrients.some(n => {
    const adjInput = document.getElementById(`ferti-adj-${n}`);
    const totalCell = document.getElementById(`extraccion-total-${n}`);
    if (!adjInput || !totalCell) return false;
    const adjValue = parseFloat(adjInput.value);
    const totalValue = parseFloat(totalCell.textContent);
    if (!Number.isFinite(adjValue) || !Number.isFinite(totalValue)) return false;
    return Math.abs(adjValue - totalValue) > 0.0001;
  });

  if (hasManualDiff) {
    manualAdjustments = {};
    nutrients.forEach(n => {
      const adjInput = document.getElementById(`ferti-adj-${n}`);
      if (adjInput && adjInput.value !== undefined && adjInput.value !== '') {
        let adjValue = parseFloat(adjInput.value);
        if (!Number.isFinite(adjValue)) return;
        // Convertir a óxido si el valor actual está en elemental
        if (isFertirriegoElementalMode) {
          const factor = {
            'P2O5': FERTIRRIEGO_CONVERSION_FACTORS.P_TO_P2O5,
            'K2O': FERTIRRIEGO_CONVERSION_FACTORS.K_TO_K2O,
            'CaO': FERTIRRIEGO_CONVERSION_FACTORS.Ca_TO_CaO,
            'MgO': FERTIRRIEGO_CONVERSION_FACTORS.Mg_TO_MgO,
            'SiO2': FERTIRRIEGO_CONVERSION_FACTORS.Si_TO_SiO2
          }[n];
          if (factor) {
            adjValue = adjValue * factor;
          }
        }
        manualAdjustments[n] = adjValue;
      }
    });
    if (!Object.keys(manualAdjustments).length) {
      manualAdjustments = null;
    } else {
      savedFertiAdjustmentsAuto = false;
    }
  }

  isFertirriegoElementalMode = !isFertirriegoElementalMode;
  // 🚀 CRÍTICO: Sincronizar con window para acceso global
  window.isFertirriegoElementalMode = isFertirriegoElementalMode;
  window.fertirriegoElementalModeLoaded = true;
  const btn = document.getElementById('toggleFertirriegoOxideElementalBtn');
  if (btn) {
    btn.textContent = isFertirriegoElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental';
  }
  if (manualAdjustments) {
    calculateNutrientRequirements({ adjustment: manualAdjustments });
  } else {
    calculateNutrientRequirements();
  }
  // 🚀 CRÍTICO: Guardar INMEDIATAMENTE cuando el usuario cambia el modo (IGUAL QUE GRANULAR)
  // Usar saveFertirriegoRequirementsImmediate para evitar perder el modo si el usuario recarga pronto
  if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
    window.saveFertirriegoRequirementsImmediate({ force: true });
    console.log('⚡ Modo Elemental/Óxido guardado INMEDIATAMENTE en Fertirriego');
  } else {
    scheduleSaveFertirriegoRequirements();
  }
}

let fertirriegoCustomCropEditId = null;

function fertFormatCustomCropName(cropId) {
  return cropId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function fertGetCurrentUserId() {
  try {
    return localStorage.getItem('nutriplant_user_id');
  } catch {
    return null;
  }
}

function fertLoadUserProfile() {
  const userId = fertGetCurrentUserId();
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`nutriplant_user_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function fertSaveUserProfile(profile) {
  const userId = fertGetCurrentUserId();
  if (!userId || !profile) return;
  try {
    localStorage.setItem(`nutriplant_user_${userId}`, JSON.stringify(profile));
    if (profile.customFertirriegoCrops && typeof profile.customFertirriegoCrops === 'object' && typeof window.nutriplantSyncCustomFertiCropsToCloud === 'function') {
      try { window.nutriplantSyncCustomFertiCropsToCloud(userId, profile.customFertirriegoCrops); } catch (e) { console.warn('Sync cultivos fertirriego a nube:', e); }
    }
  } catch (e) {
    console.warn('fertSaveUserProfile error', e);
  }
}

function fertGetUserCustomCrops() {
  const profile = fertLoadUserProfile();
  let custom = profile && profile.customFertirriegoCrops;
  if (custom && typeof custom === 'object' && Object.keys(custom).length > 0) return custom;
  // Sin sesión o perfil vacío: cargar desde fallback para que persistan tras reinicio
  try {
    const raw = localStorage.getItem('fertirriegoCustomCrops_global_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return {};
}

function fertNormalizeCustomCropEntry(cropId, entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.extraction && typeof entry.extraction === 'object') {
    return {
      name: entry.name || fertFormatCustomCropName(cropId),
      extraction: { ...entry.extraction }
    };
  }
  return {
    name: fertFormatCustomCropName(cropId),
    extraction: { ...entry }
  };
}

function fertNormalizeCustomCropMap(map) {
  const normalized = {};
  if (!map || typeof map !== 'object') return normalized;
  Object.keys(map).forEach(cropId => {
    const entry = fertNormalizeCustomCropEntry(cropId, map[cropId]);
    if (entry) normalized[cropId] = entry;
  });
  return normalized;
}

function fertSaveUserCustomCrop(cropId, cropName, extraction) {
  const entry = { name: cropName, extraction: { ...extraction } };
  const userId = fertGetCurrentUserId();
  if (userId) {
    const profile = fertLoadUserProfile() || {};
    if (!profile.customFertirriegoCrops || typeof profile.customFertirriegoCrops !== 'object') {
      profile.customFertirriegoCrops = {};
    }
    profile.customFertirriegoCrops[cropId] = entry;
    fertSaveUserProfile(profile);
  } else {
    // Sin sesión: persistir en localStorage para que sobreviva al reinicio
    try {
      const raw = localStorage.getItem('fertirriegoCustomCrops_global_user');
      const data = raw ? JSON.parse(raw) : {};
      if (typeof data !== 'object') return;
      data[cropId] = entry;
      localStorage.setItem('fertirriegoCustomCrops_global_user', JSON.stringify(data));
    } catch (e) {}
  }
}

function fertRemoveUserCustomCrop(cropId) {
  const userId = fertGetCurrentUserId();
  if (userId) {
    const profile = fertLoadUserProfile() || {};
    const custom = profile.customFertirriegoCrops || {};
    if (custom[cropId]) delete custom[cropId];
    profile.customFertirriegoCrops = custom;
    fertSaveUserProfile(profile);
  } else {
    try {
      const raw = localStorage.getItem('fertirriegoCustomCrops_global_user');
      const data = raw ? JSON.parse(raw) : {};
      if (data[cropId]) delete data[cropId];
      localStorage.setItem('fertirriegoCustomCrops_global_user', JSON.stringify(data));
    } catch (e) {}
  }
}

function fertReadCustomCropExtractionFromModal() {
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

function fertUpsertCustomCropOption(select, cropId, cropName) {
  if (!select) return;
  let option = select.querySelector(`option[value="${cropId}"]`);
  if (!option) {
    option = document.createElement('option');
    option.value = cropId;
    select.appendChild(option);
  }
  option.textContent = cropName;
}

function fertRemoveCustomCropOption(select, cropId) {
  if (!select) return;
  const option = select.querySelector(`option[value="${cropId}"]`);
  if (option) option.remove();
}

function renderFertirriegoCustomCropsList() {
  const container = document.getElementById('granularCustomCropsList');
  if (!container) return;
  const custom = fertNormalizeCustomCropMap(fertGetUserCustomCrops());
  const cropIds = Object.keys(custom);
  if (cropIds.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;">Sin cultivos personalizados.</div>';
    return;
  }
  container.innerHTML = cropIds.map(cropId => {
    const entry = custom[cropId];
    const safeName = entry?.name || fertFormatCustomCropName(cropId);
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span>${safeName}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="openEditCustomFertirriegoCrop('${cropId}')">Editar</button>
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="removeUserCustomFertirriegoCrop('${cropId}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function setFertirriegoCustomCropModalMode(mode) {
  const titleEl = document.getElementById('customCropModalTitle');
  const saveBtn = document.getElementById('customCropModalSaveBtn');
  if (!titleEl || !saveBtn) return;
  if (mode === 'edit') {
    titleEl.textContent = '✏️ Editar Cultivo Personalizado';
    saveBtn.textContent = 'Guardar cambios';
    saveBtn.setAttribute('onclick', 'saveEditedCustomFertirriegoCrop()');
  } else {
    titleEl.textContent = '➕ Agregar Cultivo Personalizado';
    saveBtn.textContent = 'Agregar Cultivo';
    saveBtn.setAttribute('onclick', 'addCustomCropGlobal()');
  }
}

function openEditCustomFertirriegoCrop(cropId) {
  const custom = fertNormalizeCustomCropMap(fertGetUserCustomCrops());
  const entry = custom[cropId];
  if (!entry) {
    alert('No se encontró el cultivo personalizado');
    return;
  }
  fertirriegoCustomCropEditId = cropId;
  setFertirriegoCustomCropModalMode('edit');
  const modal = document.getElementById('customCropModal');
  const nameEl = document.getElementById('customCropName');
  if (nameEl) nameEl.value = entry.name || fertFormatCustomCropName(cropId);
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
  const section = document.getElementById('granularCustomCropsSection');
  if (section) section.style.display = 'block';
  if (modal) modal.classList.add('show');
}

function saveEditedCustomFertirriegoCrop() {
  if (!fertirriegoCustomCropEditId) return;
  const cropName = document.getElementById('customCropName').value.trim();
  if (!cropName) { alert('Por favor ingrese el nombre del cultivo'); return; }
  const newCropId = cropName.toLowerCase().replace(/\s+/g, '_');
  const extraction = fertReadCustomCropExtractionFromModal();

  if (newCropId !== fertirriegoCustomCropEditId) {
    fertRemoveUserCustomCrop(fertirriegoCustomCropEditId);
    if (CROP_EXTRACTION_DB[fertirriegoCustomCropEditId]) delete CROP_EXTRACTION_DB[fertirriegoCustomCropEditId];
    const select = document.getElementById('fertirriegoCropType');
    fertRemoveCustomCropOption(select, fertirriegoCustomCropEditId);
  }

  fertSaveUserCustomCrop(newCropId, cropName, extraction);
  CROP_EXTRACTION_DB[newCropId] = extraction;
  const select = document.getElementById('fertirriegoCropType');
  fertUpsertCustomCropOption(select, newCropId, cropName);
  if (select) select.value = newCropId;

  closeCustomCropModal();
  renderFertirriegoCustomCropsList();
  if (typeof calculateNutrientRequirements === 'function') {
    calculateNutrientRequirements();
  } else if (typeof window.calculateNutrientRequirements === 'function') {
    window.calculateNutrientRequirements();
  }
}

function removeUserCustomFertirriegoCrop(cropId) {
  const custom = fertNormalizeCustomCropMap(fertGetUserCustomCrops());
  if (!custom[cropId]) return;
  if (!confirm(`¿Eliminar "${custom[cropId].name}" del catálogo personal?`)) return;
  fertRemoveUserCustomCrop(cropId);
  if (CROP_EXTRACTION_DB[cropId]) delete CROP_EXTRACTION_DB[cropId];
  const select = document.getElementById('fertirriegoCropType');
  fertRemoveCustomCropOption(select, cropId);
  if (select && select.value === cropId) {
    select.value = 'aguacate';
  }
  renderFertirriegoCustomCropsList();
  if (typeof calculateNutrientRequirements === 'function') {
    calculateNutrientRequirements();
  } else if (typeof window.calculateNutrientRequirements === 'function') {
    window.calculateNutrientRequirements();
  }
}

// Función para mostrar modal de cultivo personalizado
function showCustomCropModal() {
  console.log('🖱️ Click en botón de cultivo personalizado');
  const modal = document.getElementById('customCropModal');
  console.log('🔍 Modal encontrado:', modal);
  if (modal) {
    setFertirriegoCustomCropModalMode('add');
    fertirriegoCustomCropEditId = null;
    const section = document.getElementById('granularCustomCropsSection');
    if (section) section.style.display = 'block';
    renderFertirriegoCustomCropsList();
    // Usar la misma convención que en granular: clase 'show'
    modal.classList.add('show');
    console.log('✅ Modal mostrado');
  } else {
    console.error('❌ No se encontró el modal customCropModal');
  }
}

// Función para cerrar modal de cultivo personalizado
function closeCustomCropModal() {
  const modal = document.getElementById('customCropModal');
  if (modal) {
    modal.classList.remove('show');
    // Limpiar campos
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
  fertirriegoCustomCropEditId = null;
  setFertirriegoCustomCropModalMode('add');
}

// Función para agregar cultivo personalizado  
function addCustomCrop() {
  const cropName = document.getElementById('customCropName').value.trim();
  
  if (!cropName) {
    alert('Por favor ingrese el nombre del cultivo');
    return;
  }
  
  // Crear ID del cultivo (sin espacios, en minúsculas)
  const cropId = cropName.toLowerCase().replace(/\s+/g, '_');
  
  // Obtener valores de extracción
  const extraction = fertReadCustomCropExtractionFromModal();
  
  // Agregar a la base de datos
  CROP_EXTRACTION_DB[cropId] = extraction;
  
  // Agregar al selector
  const select = document.getElementById('fertirriegoCropType');
  fertUpsertCustomCropOption(select, cropId, cropName);
  
  console.log('✅ Cultivo personalizado agregado:', cropName, extraction);
  try {
    fertSaveUserCustomCrop(cropId, cropName, extraction);
  } catch (e) {
    console.warn('⚠️ No se pudo guardar cultivo en catálogo usuario (fertirriego):', e);
  }
  
  // Cerrar modal
  closeCustomCropModal();
  renderFertirriegoCustomCropsList();
  
  // Seleccionar el nuevo cultivo y calcular
  select.value = cropId;
  if (typeof calculateNutrientRequirements === 'function') {
    calculateNutrientRequirements();
  } else if (typeof window.calculateNutrientRequirements === 'function') {
    window.calculateNutrientRequirements();
  }
}

// Función principal para calcular requerimientos nutricionales
calculateNutrientRequirements = function(opts) {
  // CRÍTICO: Exponer INMEDIATAMENTE al definir - REEMPLAZAR stub
  if (typeof window !== 'undefined') {
    window.calculateNutrientRequirements = calculateNutrientRequirements;
    console.log('✅ calculateNutrientRequirements REAL definido y expuesto (reemplazando stub)');
    // Forzar que se reconozca como función real (no stub)
    window.calculateNutrientRequirements._isRealFunction = true;
  }
  const loadingFromOpts = !!(opts && opts._isLoading);
  isFertirriegoLoading = loadingFromOpts;
  try {
    const normalizeNumber = (value) => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      const num = typeof value === 'number' ? value : parseFloat(value);
      return Number.isFinite(num) ? num : undefined;
    };
    console.log('📊 Calculando requerimientos nutricionales...', {
      hasOpts: !!opts,
      isLoading: loadingFromOpts,
      hasAdjustment: !!(opts && opts.adjustment),
      hasEfficiency: !!(opts && opts.efficiency)
    });
    
    // CRÍTICO: Verificar que los elementos existan antes de acceder
    const cropTypeEl = document.getElementById('fertirriegoCropType');
    const targetYieldEl = document.getElementById('fertirriegoTargetYield');
    
    // 🚀 CRÍTICO: REPLICAR ESTRUCTURA DE GRANULAR (QUE FUNCIONA)
    // Usar opts.cropType ?? cropTypeEl.value ?? defaultCrop (igual que Granular línea 168)
    if (!cropTypeEl || !targetYieldEl) {
      console.warn('⚠️ Fertirriego: no se encontraron inputs principales al calcular');
      return;
    }
    
    const defaultCrop = Object.keys(CROP_EXTRACTION_DB)[0];
    // 🚀 CRÍTICO: PRIORIDAD 1: opts.cropType, 2: cropTypeEl.value, 3: storage, 4: defaultCrop
    let cropType = opts?.cropType ?? cropTypeEl?.value;
    
    // 🚀 CRÍTICO: Si NO hay cropType, intentar cargar desde storage ANTES de usar defaultCrop
    if (!cropType && !opts?._skipLoadFromStorage) {
      try {
        const projectId = fertGetCurrentProjectId();
        if (projectId && window.projectStorage) {
          const fertirriegoSection = window.projectStorage.loadSection('fertirriego', projectId);
          if (fertirriegoSection && fertirriegoSection.requirements && fertirriegoSection.requirements.cropType) {
            cropType = fertirriegoSection.requirements.cropType;
            console.log('✅ cropType cargado desde storage (fallback):', cropType);
            if (cropTypeEl && cropTypeEl.value !== cropType) {
              const prev = cropTypeEl.getAttribute('onchange');
              cropTypeEl.removeAttribute('onchange');
              cropTypeEl.value = cropType;
              if (prev) cropTypeEl.setAttribute('onchange', prev);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando cropType desde storage:', e);
      }
    }
    
    // 🚀 CRÍTICO: SOLO usar defaultCrop si NO hay cropType.
    // No forzar default cuando el cultivo es personalizado y aún no está
    // hidratado en CROP_EXTRACTION_DB (escenario frecuente multi-equipo).
    if (!cropType) {
      cropType = defaultCrop;
    }
    
    // Si opts.cropType existe y es diferente del DOM, actualizar DOM (igual que Granular líneas 175-180)
    if (opts?.cropType && cropTypeEl.value !== opts.cropType) {
      const prev = cropTypeEl.getAttribute('onchange');
      cropTypeEl.removeAttribute('onchange');
      cropTypeEl.value = opts.cropType;
      if (prev) cropTypeEl.setAttribute('onchange', prev);
    }
    
    // 🚀 CRÍTICO: REPLICAR ESTRUCTURA DE GRANULAR (QUE FUNCIONA)
    // Usar opts.targetYield ?? parseFloat(targetYieldEl.value) || 25 (igual que Granular líneas 182-185)
    let targetYield = opts?.targetYield;
    if (typeof targetYield !== 'number' || Number.isNaN(targetYield)) {
      targetYield = parseFloat(targetYieldEl?.value) || 25;
    }
    
    // Si opts.targetYield existe y es diferente del DOM, actualizar DOM (igual que Granular líneas 186-191)
    if (opts?.targetYield != null && targetYieldEl && parseFloat(targetYieldEl.value) !== opts.targetYield) {
      const prev = targetYieldEl.getAttribute('onchange');
      targetYieldEl.removeAttribute('onchange');
      targetYieldEl.value = opts.targetYield;
      if (prev) targetYieldEl.setAttribute('onchange', prev);
    }
    
    // 🚀 CRÍTICO: REPLICAR ESTRUCTURA DE GRANULAR (QUE FUNCIONA)
    // NO restaurar desde lastFertiCrop/lastFertiTargetYield - usar SOLO opts o DOM (igual que Granular)
    // Granular no restaura valores, solo usa options o DOM directamente (líneas 168, 182-185)
    
    // 🚀 CRÍTICO: NO mutar CROP_EXTRACTION_DB
    // Para cultivos personalizados en carga inicial multi-equipo puede no
    // existir base temporalmente; en ese caso continuar con overrides/ceros.
    const baseExtraction = CROP_EXTRACTION_DB[cropType]
      ? { ...CROP_EXTRACTION_DB[cropType] }
      : {};
    
    let extractionOverrides = {};
    
    // 🚀 CRÍTICO: Si opts tiene extractionOverrides, usarlo PRIMERO (valores pasados explícitamente tienen prioridad)
    if (opts && opts.extractionOverrides && typeof opts.extractionOverrides === 'object') {
      extractionOverrides = opts.extractionOverrides;
      console.log('✅ extractionOverrides desde opts (pasados explícitamente):', Object.keys(extractionOverrides));
    } else if (!opts || !opts._isLoading) {
      // Solo cargar desde storage si NO estamos cargando (_isLoading=false o no definido)
      // Si _isLoading=true, usar SOLO valores de opts (ya establecidos arriba o vacío)
      try {
        const projectId = fertGetCurrentProjectId();
        if (projectId && window.projectStorage) {
          const fertirriegoSection = window.projectStorage.loadSection('fertirriego', projectId);
          if (fertirriegoSection && fertirriegoSection.requirements && fertirriegoSection.requirements.extractionOverrides) {
            extractionOverrides = fertirriegoSection.requirements.extractionOverrides;
          }
        }
        if (!Object.keys(extractionOverrides).length) {
          // Fallback: localStorage directo
          const unifiedKey = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
            const o = JSON.parse(raw);
            if (o && o.fertirriego && o.fertirriego.requirements && o.fertirriego.requirements.extractionOverrides) {
              extractionOverrides = o.fertirriego.requirements.extractionOverrides;
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando extractionOverrides en calculateNutrientRequirements:', e);
      }
    } else {
      // Si _isLoading=true y no hay extractionOverrides en opts, usar objeto vacío
      console.log('✅ Modo carga activo - usando extractionOverrides vacío (o de opts si existe)');
    }
    
    // 🚀 CRÍTICO: Mismo patrón que Granular (líneas 235-264)
    // PRIORIDAD 1: window.savedFertiExtractionOverrides (variable global - valores más recientes)
    // PRIORIDAD 2: extractionOverrides desde opts/storage (valores guardados)
    // PRIORIDAD 3: baseExtraction (valores precargados del cultivo)
    const finalExtraction = {...baseExtraction};
    
    // PRIORIDAD 1: Variable global (valores modificados recientemente)
    if (window.savedFertiExtractionOverrides && window.savedFertiExtractionOverrides[cropType] && typeof window.savedFertiExtractionOverrides[cropType] === 'object') {
      Object.assign(finalExtraction, window.savedFertiExtractionOverrides[cropType]);
      console.log('✅ finalExtraction desde variable global window.savedFertiExtractionOverrides para', cropType, ':', {
        baseN: baseExtraction.N,
        overrideN: window.savedFertiExtractionOverrides[cropType].N,
        finalN: finalExtraction.N,
        extractionOverridesKeys: Object.keys(window.savedFertiExtractionOverrides[cropType])
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

    // Si no hay base ni overrides, inicializar con ceros para no cambiar
    // silenciosamente a otro cultivo precargado.
    if (Object.keys(finalExtraction).length === 0) {
      ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2']
        .forEach(n => { finalExtraction[n] = 0; });
      console.warn('⚠️ Fertirriego: cultivo sin base ni overrides aún. Se mantiene cultivo y se inicializa extracción en cero temporalmente:', cropType);
    }
    
    // Usar finalExtraction como extraction
    const extraction = finalExtraction;
    
    // 🚀 DEBUG: Verificar valores de extraction después de fusionar
    console.log('🔍 DEBUG calculateNutrientRequirements - extraction fusionado (base + overrides):', {
      cropType: cropType,
      extractionN: extraction.N,
      extractionP2O5: extraction.P2O5,
      extractionK2O: extraction.K2O,
      extractionSample: { N: extraction.N, P2O5: extraction.P2O5, K2O: extraction.K2O }
    });
    
    // Calcular extracción total
    const totalExtraction = {};
    const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
    
    // CRÍTICO: Si NO hay opts, cargar valores guardados SOLO si son para el CULTIVO ACTUAL
    // Esto asegura que cuando el usuario cambia cultivo/rendimiento, se mantengan sus ajustes/eficiencias guardados
    // PERO SOLO si son para el cultivo que está seleccionando ahora
    let savedAdjustments = null;
    let savedEfficiencies = null;
    
    if (!opts || !opts.adjustment || !opts.efficiency) {
      // No hay opts o no tiene adjustment/efficiency - cargar desde storage
      // CRÍTICO: Cargar valores guardados SIEMPRE que existan, sin importar el cultivo
      // (igual que Granular - los ajustes/eficiencias se mantienen aunque cambies cultivo)
      if (!(opts && opts._forceAutoAdjustments)) {
        try {
          const projectId = fertGetCurrentProjectId();
          if (projectId) {
            // PRIORIDAD 1: projectStorage
            if (window.projectStorage) {
              const fertirriegoSection = window.projectStorage.loadSection('fertirriego', projectId);
              if (fertirriegoSection && fertirriegoSection.requirements) {
                // Cargar valores guardados SIEMPRE que existan (sin verificar cultivo)
                savedAdjustments = fertirriegoSection.requirements.adjustment;
                savedEfficiencies = fertirriegoSection.requirements.efficiency;
                console.log(`✅ Valores guardados cargados desde projectStorage (cultivo guardado: ${fertirriegoSection.requirements.cropType}, cultivo actual: ${cropType})`);
              }
            }
            
            // PRIORIDAD 2: localStorage directo
            if (!savedAdjustments || !savedEfficiencies) {
              const unifiedKey = `nutriplant_project_${projectId}`;
              const raw = localStorage.getItem(unifiedKey);
              if (raw) {
                const o = JSON.parse(raw);
                if (o && o.fertirriego && o.fertirriego.requirements) {
                  // Cargar valores guardados SIEMPRE que existan (sin verificar cultivo)
                  savedAdjustments = o.fertirriego.requirements.adjustment;
                  savedEfficiencies = o.fertirriego.requirements.efficiency;
                  console.log(`✅ Valores guardados cargados desde localStorage (cultivo guardado: ${o.fertirriego.requirements.cropType}, cultivo actual: ${cropType})`);
                }
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ Error cargando valores guardados:', e);
        }
      } else {
        savedAdjustments = null;
      }
    }
    
    if (!opts || !opts.adjustment) {
      if (!savedAdjustments && savedFertiAdjustments && !savedFertiAdjustmentsAuto && lastFertiCrop === cropType && lastFertiTargetYield === targetYield) {
        savedAdjustments = savedFertiAdjustments;
        console.log('ℹ️ Reutilizando ajustes desde caché local (evitar sobrescritura)');
      }
    }
    if (!opts || !opts.efficiency) {
      if (!savedEfficiencies && savedFertiEfficiencies && lastFertiCrop === cropType && lastFertiTargetYield === targetYield) {
        savedEfficiencies = savedFertiEfficiencies;
        console.log('ℹ️ Reutilizando eficiencias desde caché local (evitar sobrescritura)');
      }
    }
    
    // CRÍTICO: Cargar eficiencias guardadas SIEMPRE (opts > saved > default) - EXACTAMENTE IGUAL QUE GRANULAR
    // Si opts.efficiency existe, usar ESOS valores (incluso si son 0) porque son los guardados del usuario
    const efficiency = { ...DEFAULT_EFFICIENCY };
    
    // PRIORIDAD 1: opts.efficiency (valores pasados explícitamente)
    if (opts && opts.efficiency) {
      Object.keys(opts.efficiency).forEach(n => {
        if (typeof opts.efficiency[n] === 'number') {
          efficiency[n] = opts.efficiency[n];
          console.log(`✅ Eficiencia Fertirriego ${n} cargada desde guardado (opts):`, opts.efficiency[n]);
        }
      });
    } 
    // PRIORIDAD 2: savedEfficiencies (valores guardados cargados desde storage)
    else if (savedEfficiencies) {
      Object.keys(savedEfficiencies).forEach(n => {
        if (typeof savedEfficiencies[n] === 'number') {
          efficiency[n] = savedEfficiencies[n];
          console.log(`✅ Eficiencia Fertirriego ${n} cargada desde guardado (storage):`, savedEfficiencies[n]);
        }
      });
    }
    
    const adjustment = {};
    const realRequirement = {};

    // Lista de nutrientes en el orden correcto
    Object.keys(extraction).forEach(nutrient => {
      if (nutrients.includes(nutrient)) {
        totalExtraction[nutrient] = (extraction[nutrient] * targetYield).toFixed(2);
      }
    });

    const sourceAdjustments = (opts && opts.adjustment && Object.keys(opts.adjustment).length > 0)
      ? opts.adjustment
      : (savedAdjustments && Object.keys(savedAdjustments).length > 0 ? savedAdjustments : null);
    const hasManualDifference = savedFertiAdjustmentsAuto === true
      ? false
      : (!!sourceAdjustments && Object.keys(sourceAdjustments).some(n => {
          const baseValue = parseFloat(totalExtraction[n] ?? 0);
          const savedValue = normalizeNumber(sourceAdjustments[n]);
          return typeof savedValue === 'number' && Math.abs(baseValue - savedValue) > 0.0001;
        }));

    if (hasManualDifference) {
      savedFertiAdjustmentsAuto = false;
    } else if (sourceAdjustments) {
      // Si los ajustes guardados coinciden con la extracción base, volver a modo auto
      savedFertiAdjustmentsAuto = true;
    } else {
      // Si no hay ajustes guardados, forzar modo auto
      savedFertiAdjustmentsAuto = true;
    }

    const adjustmentsAutoFlag = savedFertiAdjustmentsAuto === true && !hasManualDifference;
    const hasSavedAdjustments = !adjustmentsAutoFlag && !!sourceAdjustments;
    if (hasSavedAdjustments) {
      savedFertiAdjustmentsAuto = false;
    }
    const shouldAutoSyncAdjustments = adjustmentsAutoFlag ||
      (!hasSavedAdjustments && (savedFertiAdjustmentsAuto || !savedFertiAdjustments));

    Object.keys(extraction).forEach(nutrient => {
      if (nutrients.includes(nutrient)) {
        // PRIORIDAD: opts.adjustment > savedAdjustments > totalExtraction - EXACTAMENTE IGUAL QUE GRANULAR
        // CRÍTICO: NO leer del DOM aquí porque puede tener valores precargados
        let savedAdj = undefined;

        // PRIORIDAD 1: opts.adjustment (valores pasados explícitamente)
        if (opts && opts.adjustment) {
          const parsedAdj = normalizeNumber(opts.adjustment[nutrient]);
          if (typeof parsedAdj === 'number') {
            savedAdj = parsedAdj;
          }
          console.log(`✅ Ajuste Fertirriego ${nutrient} cargado desde guardado (opts):`, savedAdj);
        }
        // PRIORIDAD 2: savedAdjustments (valores guardados cargados desde storage)
        else if (!shouldAutoSyncAdjustments && savedAdjustments) {
          const parsedAdj = normalizeNumber(savedAdjustments[nutrient]);
          if (typeof parsedAdj === 'number') {
            savedAdj = parsedAdj;
          }
          console.log(`✅ Ajuste Fertirriego ${nutrient} cargado desde guardado (storage):`, savedAdj);
        }

        // Usar valor guardado si existe (incluso si es 0), sino usar extracción total
        adjustment[nutrient] = (typeof savedAdj === 'number') ? savedAdj : parseFloat(totalExtraction[nutrient]);

        // Calcular requerimiento real
        const adjValue = parseFloat(adjustment[nutrient]);
        const effValue = efficiency[nutrient] / 100;
        realRequirement[nutrient] = (adjValue / effValue).toFixed(2);

        // Log reducido - solo para debugging si es necesario
        // console.log(`📊 Fertirriego ${nutrient}: adj=${adjustment[nutrient]}, eff=${efficiency[nutrient]}, req=${realRequirement[nutrient]}`);
      }
    });
    
    // Logs detallados comentados para reducir ruido en consola
    // console.log('📈 Extracción total:', totalExtraction);
    // console.log('📈 Requerimiento real:', realRequirement);
    
    // Generar tabla
    console.log('🚀 Llamando renderNutrientTable con:', {
      hasExtraction: !!extraction,
      hasTotalExtraction: Object.keys(totalExtraction).length > 0,
      hasAdjustment: Object.keys(adjustment).length > 0,
      hasEfficiency: Object.keys(efficiency).length > 0,
      adjustmentSample: { N: adjustment.N, P2O5: adjustment.P2O5, K2O: adjustment.K2O }
    });
    renderNutrientTable(extraction, totalExtraction, adjustment, efficiency, realRequirement, targetYield);
    savedFertiAdjustments = { ...adjustment };
    savedFertiEfficiencies = { ...efficiency };
    lastFertiCrop = cropType;
    lastFertiTargetYield = targetYield;
    
    // CRÍTICO: NO guardar automáticamente después de renderizar si estamos cargando valores guardados
    // Solo guardar si el usuario hizo cambios (no durante la carga inicial)
    if (!opts || !opts._isLoading) {
      // Solo guardar si NO estamos en modo de carga
      scheduleSaveFertirriegoRequirements();
    }
  } catch (error) {
    console.error('❌ Error calculando requerimientos nutricionales:', error);
  } finally {
    isFertirriegoLoading = false;
  }
};
// CRÍTICO: Exponer inmediatamente después de definir
if (typeof window !== 'undefined') {
  window.calculateNutrientRequirements = calculateNutrientRequirements;
}

// Función para convertir valores (solo para MOSTRAR)
function getConvertedValue(nutrient, value) {
  if (!value || value === '0' || value === '0.00') return value;
  const numValue = parseFloat(value);
  
  // 🚀 CRÍTICO: Usar window.isFertirriegoElementalMode (más confiable) con fallback a variable local
  const currentMode = (typeof window.isFertirriegoElementalMode === 'boolean') 
    ? window.isFertirriegoElementalMode 
    : isFertirriegoElementalMode;
  
  if (currentMode) {
    switch(nutrient) {
      case 'P2O5':
        return (numValue / FERTIRRIEGO_CONVERSION_FACTORS.P2O5_TO_P).toFixed(2);
      case 'K2O':
        return (numValue / FERTIRRIEGO_CONVERSION_FACTORS.K2O_TO_K).toFixed(2);
      case 'CaO':
        return (numValue / FERTIRRIEGO_CONVERSION_FACTORS.CaO_TO_Ca).toFixed(2);
      case 'MgO':
        return (numValue / FERTIRRIEGO_CONVERSION_FACTORS.MgO_TO_Mg).toFixed(2);
      case 'SiO2':
        return (numValue / FERTIRRIEGO_CONVERSION_FACTORS.SiO2_TO_Si).toFixed(2);
      default:
        return numValue.toFixed(2);
    }
  }
  return numValue.toFixed(2);
}
// CRÍTICO: Exponer globalmente para que funcione desde event handlers
if (typeof window !== 'undefined') {
  window.getConvertedValue = getConvertedValue;
}

// Función inversa: convertir de elemental a óxido
function convertFromElementalToOxide(nutrient, elementalValue) {
  const numValue = parseFloat(elementalValue);
  
  switch(nutrient) {
    case 'P2O5':
      return numValue * FERTIRRIEGO_CONVERSION_FACTORS.P2O5_TO_P;
    case 'K2O':
      return numValue * FERTIRRIEGO_CONVERSION_FACTORS.K2O_TO_K;
    case 'CaO':
      return numValue * FERTIRRIEGO_CONVERSION_FACTORS.CaO_TO_Ca;
    case 'MgO':
      return numValue * FERTIRRIEGO_CONVERSION_FACTORS.MgO_TO_Mg;
    case 'SiO2':
      return numValue * FERTIRRIEGO_CONVERSION_FACTORS.SiO2_TO_Si;
    default:
      return numValue;
  }
}

// Función para renderizar la tabla
renderNutrientTable = function(extraction, totalExtraction, adjustment, efficiency, realRequirement, targetYield) {
  // CRÍTICO: Exponer INMEDIATAMENTE al definir - REEMPLAZAR stub
  if (typeof window !== 'undefined') {
    window.renderNutrientTable = renderNutrientTable;
    console.log('✅ renderNutrientTable REAL definido y expuesto (reemplazando stub)');
  }
  console.log('🎨 renderNutrientTable llamado');
  console.log('🔍 Modo actual (isFertirriegoElementalMode):', isFertirriegoElementalMode, '(window:', window.isFertirriegoElementalMode, ')');
  
  // Respetar la sub-pestaña actual; solo activar "extraccion" si ninguna está activa
  const activeTab = document.querySelector('.fertirriego-container .tab-button.active');
  if (!activeTab) {
    const extraccionTab = document.querySelector('.fertirriego-container .tab-button[data-tab="extraccion"]');
    const extraccionContent = document.getElementById('extraccion');
    if (extraccionTab) {
      console.log('🔄 Activando sub-pestaña "extraccion" (no había activa)');
      document.querySelectorAll('.fertirriego-container .tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.fertirriego-container .tab-content').forEach(el => el.classList.remove('active'));
      extraccionTab.classList.add('active');
      if (extraccionContent) extraccionContent.classList.add('active');
    }
  }
  
  const container = document.getElementById('fertirriegoTableContainer');
  if (!container) {
    console.error('❌ ERROR: fertirriegoTableContainer NO ENCONTRADO - reintentando...');
    // CRÍTICO: Reintentar múltiples veces (igual que Granular)
    let retryAttempts = 0;
    const maxRetries = 10;
    const retryInterval = setInterval(() => {
      retryAttempts++;
      const retryContainer = document.getElementById('fertirriegoTableContainer');
      if (retryContainer) {
        console.log(`✅ Container encontrado en reintento ${retryAttempts}, renderizando...`);
        clearInterval(retryInterval);
        renderNutrientTable(extraction, totalExtraction, adjustment, efficiency, realRequirement, targetYield);
      } else if (retryAttempts >= maxRetries) {
        console.error(`❌ ERROR: fertirriegoTableContainer NO ENCONTRADO después de ${maxRetries} intentos`);
        clearInterval(retryInterval);
      }
    }, 200);
    return;
  }
  console.log('✅ Container encontrado, renderizando tabla...');
  
  const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
  
  // Función para obtener etiqueta según el modo
  function getLabel(nutrient) {
    // 🚀 CRÍTICO: Usar window.isFertirriegoElementalMode (más confiable) con fallback a variable local
    const currentMode = (typeof window.isFertirriegoElementalMode === 'boolean') 
      ? window.isFertirriegoElementalMode 
      : isFertirriegoElementalMode;
    
    if (currentMode) {
      switch(nutrient) {
        case 'P2O5': return 'P';
        case 'K2O': return 'K';
        case 'CaO': return 'Ca';
        case 'MgO': return 'Mg';
        case 'SiO2': return 'Si';
        default: return nutrient;
      }
    }
    return nutrient;
  }
  
  // Crear tabla
  let tableHTML = `
    <table class="fertirriego-requirement-table">
      <thead>
        <tr>
          <th rowspan="2">Concepto</th>
          ${nutrients.map(n => `<th id="fertirriego-header-${n}"><span class="notranslate" translate="no">${getLabel(n)}</span></th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <!-- Fila 1: Extracción por tonelada -->
        <tr>
          <td><strong>Extracción por tonelada<br>(kg/ton)</strong></td>
          ${nutrients.map(n => `<td><input type="number" class="fertirriego-input" id="ferti-extract-${n}" value="${getConvertedValue(n, extraction[n])}" step="0.01" onchange="updateExtractionPerTon('${n}', this.value)"></td>`).join('')}
        </tr>
        
        <!-- Fila 2: Extracción total -->
        <tr>
          <td><strong>Extracción total<br>(kg/ha)</strong></td>
          ${nutrients.map(n => `<td id="extraccion-total-${n}">${getConvertedValue(n, totalExtraction[n])}</td>`).join('')}
        </tr>
        
        <!-- Fila 3: Ajuste por niveles en suelo -->
        <tr>
          <td><strong>Ajuste por niveles<br>en suelo</strong></td>
          ${nutrients.map(n => `<td><input type="number" class="fertirriego-input" id="ferti-adj-${n}" value="${getConvertedValue(n, adjustment[n])}" step="0.01" onchange="updateAdjustment('${n}', this.value)"></td>`).join('')}
        </tr>
        
        <!-- Fila 4: Eficiencia -->
        <tr>
          <td><strong>Eficiencia<br>(%)</strong></td>
          ${nutrients.map(n => `<td><input type="number" class="fertirriego-input" id="ferti-eff-${n}" value="${efficiency[n]}" step="0.1" min="1" max="100" onchange="updateEfficiency('${n}', this.value)"></td>`).join('')}
        </tr>
        
        <!-- Fila 5: Requerimiento Real -->
        <tr class="requirement-real-row">
          <td><strong>Requerimiento Real<br>(kg/ha)</strong></td>
          ${nutrients.map(n => `<td id="ferti-req-${n}">${getConvertedValue(n, realRequirement[n])}</td>`).join('')}
        </tr>
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
  
  // 🚀 CRÍTICO: Asegurar que los event listeners estén conectados después de renderizar
  setTimeout(() => {
    FERTIRRIEGO_NUTRIENTS.forEach(nutrient => {
      const adjInput = document.getElementById(`ferti-adj-${nutrient}`);
      const effInput = document.getElementById(`ferti-eff-${nutrient}`);
      
      if (adjInput) {
        // Asegurar que el event listener esté conectado
        if (!adjInput.getAttribute('onchange') || !adjInput.getAttribute('onchange').includes('updateAdjustment')) {
          adjInput.setAttribute('onchange', `if(window.updateAdjustment) window.updateAdjustment('${nutrient}', this.value); else console.warn('updateAdjustment no disponible');`);
          console.log(`✅ Event listener conectado para adj-${nutrient}`);
        }
        // También agregar event listener nativo como respaldo
        adjInput.addEventListener('change', function() {
          if (window.updateAdjustment) {
            window.updateAdjustment(nutrient, this.value);
          }
        });
      }
      
      if (effInput) {
        // Asegurar que el event listener esté conectado
        if (!effInput.getAttribute('onchange') || !effInput.getAttribute('onchange').includes('updateEfficiency')) {
          effInput.setAttribute('onchange', `if(window.updateEfficiency) window.updateEfficiency('${nutrient}', this.value); else console.warn('updateEfficiency no disponible');`);
          console.log(`✅ Event listener conectado para eff-${nutrient}`);
        }
        // También agregar event listener nativo como respaldo
        effInput.addEventListener('change', function() {
          if (window.updateEfficiency) {
            window.updateEfficiency(nutrient, this.value);
          }
        });
      }
    });
  }, 50);
  
  // CRÍTICO: Log de valores recibidos para diagnóstico
  console.log('📊 renderNutrientTable recibió valores:', {
    adjustmentSample: { N: adjustment.N, P2O5: adjustment.P2O5, K2O: adjustment.K2O },
    efficiencySample: { N: efficiency.N, P2O5: efficiency.P2O5, K2O: efficiency.K2O },
    adjustmentKeys: Object.keys(adjustment),
    efficiencyKeys: Object.keys(efficiency),
    adjustmentCompleto: adjustment,
    efficiencyCompleto: efficiency
  });
  
  // CRÍTICO: Verificar valores en inputs INMEDIATAMENTE después de renderizar
  setTimeout(() => {
    const adjN = document.getElementById('ferti-adj-N');
    const effN = document.getElementById('ferti-eff-N');
    const extractN = document.getElementById('ferti-extract-N');
    console.log('🔍 VALORES EN INPUTS DESPUÉS DE RENDERIZAR:', {
      adjN_value: adjN ? adjN.value : 'NO ENCONTRADO',
      effN_value: effN ? effN.value : 'NO ENCONTRADO',
      extractN_value: extractN ? extractN.value : 'NO ENCONTRADO',
      adjN_expected: adjustment.N,
      effN_expected: efficiency.N,
      extractN_expected: extraction.N
    });
  }, 10);
  
  // 🚀 CRÍTICO: Aplicar valores de extracción por tonelada después de renderizar
  // Esto asegura que los valores guardados se muestren correctamente en los inputs
  setTimeout(() => {
    nutrients.forEach(nutrient => {
      const extractInput = document.getElementById(`ferti-extract-${nutrient}`);
      if (extractInput && extraction[nutrient] !== undefined) {
        const displayValue = getConvertedValue(nutrient, extraction[nutrient]);
        const currentValue = parseFloat(extractInput.value) || 0;
        const targetValue = parseFloat(displayValue) || 0;
        // Aplicar SIEMPRE si el valor es diferente (incluso si es 0)
        if (Math.abs(currentValue - targetValue) > 0.01) {
          // CRÍTICO: Quitar onchange temporalmente para evitar guardados durante aplicación
          const oldOnChange = extractInput.getAttribute('onchange');
          extractInput.removeAttribute('onchange');
          extractInput.value = displayValue;
          // Restaurar onchange después de aplicar valor
          if (oldOnChange) extractInput.setAttribute('onchange', oldOnChange);
          console.log(`✅ Extracción por tonelada ${nutrient} aplicada: ${currentValue} → ${displayValue}`);
        }
      }
    });
  }, 50);
  
  // CRÍTICO: Aplicar valores directamente a los inputs después de renderizar
  // EXACTAMENTE IGUAL QUE GRANULAR - sin complicaciones
  // Esto asegura que los valores guardados se muestren correctamente, incluso si hubo problemas de conversión
  // Usar múltiples intentos para asegurar que los inputs estén disponibles
  let attempts = 0;
  const maxAttempts = 5;
  const applyValues = () => {
    attempts++;
    let allApplied = true;
    let appliedCount = 0;
    
    nutrients.forEach(nutrient => {
      // Aplicar ajuste - EXACTAMENTE IGUAL QUE GRANULAR
      const adjInput = document.getElementById(`ferti-adj-${nutrient}`);
      if (adjInput && adjustment[nutrient] !== undefined) {
        const displayValue = getConvertedValue(nutrient, adjustment[nutrient]);
        const currentValue = parseFloat(adjInput.value) || 0;
        const targetValue = parseFloat(displayValue) || 0;
        // Aplicar SIEMPRE si el valor es diferente (incluso si es 0)
        if (Math.abs(currentValue - targetValue) > 0.01) {
          // CRÍTICO: Quitar onchange temporalmente para evitar guardados durante aplicación
          const oldOnChange = adjInput.getAttribute('onchange');
          adjInput.removeAttribute('onchange');
          adjInput.value = displayValue;
          // Restaurar onchange después de aplicar valor
          if (oldOnChange) adjInput.setAttribute('onchange', oldOnChange);
          appliedCount++;
          console.log(`✅ Ajuste ${nutrient} aplicado: ${currentValue} → ${displayValue} (intento ${attempts})`);
          allApplied = false; // Marcar que hubo cambios
        }
      } else if (adjustment[nutrient] !== undefined) {
        allApplied = false; // Input no encontrado, reintentar
      }
      
      // Aplicar eficiencia - EXACTAMENTE IGUAL QUE GRANULAR
      const effInput = document.getElementById(`ferti-eff-${nutrient}`);
      if (effInput && efficiency[nutrient] !== undefined) {
        const effValue = efficiency[nutrient];
        const currentEff = parseFloat(effInput.value) || 0;
        const targetEff = parseFloat(effValue) || 0;
        // Aplicar SIEMPRE si el valor es diferente
        if (Math.abs(currentEff - targetEff) > 0.01) {
          // CRÍTICO: Quitar onchange temporalmente para evitar guardados durante aplicación
          const oldOnChange = effInput.getAttribute('onchange');
          effInput.removeAttribute('onchange');
          effInput.value = effValue;
          // Restaurar onchange después de aplicar valor
          if (oldOnChange) effInput.setAttribute('onchange', oldOnChange);
          appliedCount++;
          console.log(`✅ Eficiencia ${nutrient} aplicada: ${currentEff} → ${effValue} (intento ${attempts})`);
          allApplied = false; // Marcar que hubo cambios
        }
      } else if (efficiency[nutrient] !== undefined) {
        allApplied = false; // Input no encontrado, reintentar
      }
    });
    
    // Si no se aplicaron todos los valores y aún hay intentos, reintentar
    if (!allApplied && attempts < maxAttempts) {
      setTimeout(applyValues, 100);
    } else if (attempts >= maxAttempts) {
      console.warn('⚠️ Algunos valores no se pudieron aplicar después de', maxAttempts, 'intentos');
    } else if (appliedCount > 0) {
      console.log(`✅ ${appliedCount} valores aplicados correctamente en intento ${attempts}`);
      
      // CRÍTICO: Verificar valores FINALES en inputs después de aplicar
      setTimeout(() => {
        const adjN = document.getElementById('ferti-adj-N');
        const effN = document.getElementById('ferti-eff-N');
        const adjP2O5 = document.getElementById('ferti-adj-P2O5');
        const effP2O5 = document.getElementById('ferti-eff-P2O5');
        console.log('🔍 VALORES FINALES EN INPUTS DESPUÉS DE APLICAR:', {
          adjN: adjN ? adjN.value : 'NO ENCONTRADO',
          effN: effN ? effN.value : 'NO ENCONTRADO',
          adjP2O5: adjP2O5 ? adjP2O5.value : 'NO ENCONTRADO',
          effP2O5: effP2O5 ? effP2O5.value : 'NO ENCONTRADO',
          expected_adjN: adjustment.N,
          expected_effN: efficiency.N,
          expected_adjP2O5: adjustment.P2O5,
          expected_effP2O5: efficiency.P2O5
        });
      }, 50);
    }
  };
  
  // Iniciar aplicación de valores
  setTimeout(applyValues, 50);
  
  // Actualizar el resumen del programa con los requerimientos actuales
  try { if (window.updateFertiSummary) window.updateFertiSummary(); } catch {}
  
  console.log('✅ Tabla Fertirriego renderizada con valores:', {
    hasAdjustments: Object.keys(adjustment).length > 0,
    hasEfficiencies: Object.keys(efficiency).length > 0
  });
};
// CRÍTICO: Exponer inmediatamente después de definir
if (typeof window !== 'undefined') {
  window.renderNutrientTable = renderNutrientTable;
}

// Función para actualizar extracción por tonelada
updateExtractionPerTon = function(nutrient, value) {
  // CRÍTICO: Exponer inmediatamente
  window.updateExtractionPerTon = updateExtractionPerTon;
  try {
    if (isFertirriegoLoading) {
      console.debug('ℹ️ Ignorando updateExtractionPerTon durante carga');
      return;
    }
    
    const cropType = document.getElementById('fertirriegoCropType')?.value;
    if (!cropType) {
      console.warn('⚠️ No hay cropType seleccionado');
      return;
    }
    
    console.log('🔄 Actualizando extracción para:', nutrient, 'valor:', value, 'modo:', isFertirriegoElementalMode ? 'elemental' : 'óxido');
    
    let extractionValue = parseFloat(value) || 0;
    let nutrientKey = nutrient;
    
    // 🚀 CRÍTICO: SIEMPRE guardar en formato ÓXIDO (base) - IGUAL QUE GRANULAR
    // Si estamos en modo elemental, convertir a óxido antes de guardar
    if (isFertirriegoElementalMode && (nutrient === 'P2O5' || nutrient === 'K2O' || nutrient === 'CaO' || nutrient === 'MgO' || nutrient === 'SiO2')) {
      // El usuario ingresó valor elemental, necesitamos convertirlo a óxido
      extractionValue = convertFromElementalToOxide(nutrient, extractionValue);
      nutrientKey = nutrient; // Mantener el key original (P2O5, K2O, etc.)
      console.log(`🔄 Convertido ${nutrient} (elemental ${value}) → ${nutrientKey} (óxido ${extractionValue.toFixed(2)})`);
    }
    
    // 🚀 CRÍTICO: Guardar directamente en variable global (IGUAL QUE GRANULAR)
    if (!window.savedFertiExtractionOverrides) window.savedFertiExtractionOverrides = {};
    if (!window.savedFertiExtractionOverrides[cropType]) window.savedFertiExtractionOverrides[cropType] = {};
    window.savedFertiExtractionOverrides[cropType][nutrientKey] = extractionValue;
    console.log('✅ Extracción guardada en variable global (SIEMPRE en formato ÓXIDO):', { cropType, nutrient: nutrientKey, value: extractionValue });
    
    const targetYield = parseFloat(document.getElementById('fertirriegoTargetYield').value) || 25;
    
    // Calcular extracción total (multiplicar por toneladas objetivo) - SIEMPRE EN ÓXIDO
    const totalExtraction = (extractionValue * targetYield).toFixed(2);
    
    console.log('📊 Extracción total calculada:', totalExtraction);
    
    // Actualizar la celda de extracción total (mostrar en modo actual)
    const totalCell = document.querySelector(`#extraccion-total-${nutrient}`);
    if (totalCell) {
      totalCell.textContent = isFertirriegoElementalMode ? getConvertedValue(nutrient, totalExtraction) : totalExtraction;
    }
    
    // Actualizar el ajuste (por defecto igual a extracción total)
    const adjInput = document.getElementById(`ferti-adj-${nutrient}`);
    if (adjInput) {
      // Mostrar en el formato actual (elemental u óxido)
      adjInput.value = isFertirriegoElementalMode ? getConvertedValue(nutrient, totalExtraction) : totalExtraction;
      
      // Recalcular requerimiento real - SIEMPRE usar valores en óxido
      const efficiencyValue = parseFloat(document.getElementById(`ferti-eff-${nutrient}`).value) || 1;
      const realRequirement = (parseFloat(totalExtraction) / (efficiencyValue / 100)).toFixed(2);
      console.log('📊 Requerimiento real calculado:', realRequirement);
      
      const reqCell = document.getElementById(`ferti-req-${nutrient}`);
      if (reqCell) {
        reqCell.textContent = isFertirriegoElementalMode ? getConvertedValue(nutrient, realRequirement) : realRequirement;
      }
      try { if (window.updateFertiSummary) window.updateFertiSummary(); } catch {}
    }
    
    // Recalcular (esto fusionará base + overrides correctamente)
    if (typeof window.calculateNutrientRequirements === 'function') {
      window.calculateNutrientRequirements();
    }
    
    // 🚀 CRÍTICO: Guardar INMEDIATAMENTE cuando el usuario modifica extracción por tonelada (IGUAL QUE GRANULAR)
    console.log('💾 Guardando inmediatamente después de modificar extracción por tonelada');
    if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
      window.saveFertirriegoRequirementsImmediate({ force: true });
    } else if (typeof window.saveFertirriegoRequirements === 'function') {
      window.saveFertirriegoRequirements();
    } else {
      scheduleSaveFertirriegoRequirements();
    }
    
  } catch (error) {
    console.error('❌ Error actualizando extracción:', error);
  }
};

// Función para actualizar ajuste por niveles en suelo
updateAdjustment = function(nutrient, value) {
  // CRÍTICO: Exponer inmediatamente
  window.updateAdjustment = updateAdjustment;
  try {
    if (isFertirriegoLoading) {
      console.debug('ℹ️ Fertirriego: ajuste ignorado (estamos cargando)');
      return;
    }
    console.log('🔄 updateAdjustment (Fertirriego) llamado:', { nutrient, value });
    savedFertiAdjustmentsAuto = false;
    
    const efficiencyInput = document.getElementById(`ferti-eff-${nutrient}`);
    const efficiencyValue = efficiencyInput ? (parseFloat(efficiencyInput.value) || 1) : 1;
    const adjValue = parseFloat(value) || 0;
    const adjOxide = isFertirriegoElementalMode
      ? convertFromElementalToOxide(nutrient, adjValue)
      : adjValue;
    const realRequirement = (adjOxide / (efficiencyValue / 100)).toFixed(2);
    
    const reqCell = document.getElementById(`ferti-req-${nutrient}`);
    if (reqCell) {
      reqCell.textContent = getConvertedValue(nutrient, realRequirement);
      console.log(`✅ Requerimiento Real ${nutrient} actualizado: ${reqCell.textContent} (ajuste: ${adjValue}, eficiencia: ${efficiencyValue}%)`);
    } else {
      console.warn(`⚠️ No se encontró celda req-${nutrient} para actualizar`);
    }
    try { if (window.updateFertiSummary) window.updateFertiSummary(); } catch {}

    if (!savedFertiAdjustments) savedFertiAdjustments = {};
    savedFertiAdjustments[nutrient] = adjOxide;
    
    // CRÍTICO: Guardar INMEDIATAMENTE cuando el usuario modifica un valor
    console.log('💾 Guardando inmediatamente después de modificar ajuste (Fertirriego)');
    if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
      window.saveFertirriegoRequirementsImmediate({ force: true });
    } else if (typeof window.saveFertirriegoRequirements === 'function') {
      window.saveFertirriegoRequirements();
    } else {
      scheduleSaveFertirriegoRequirements();
    }
  } catch (error) {
    console.error('❌ Error actualizando ajuste:', error);
  }
};
// CRÍTICO: Exponer inmediatamente después de definir
if (typeof window !== 'undefined') {
  window.updateAdjustment = updateAdjustment;
}

// Función para actualizar eficiencia
updateEfficiency = function(nutrient, value) {
  // CRÍTICO: Exponer inmediatamente
  window.updateEfficiency = updateEfficiency;
  try {
    if (isFertirriegoLoading) {
      console.debug('ℹ️ Fertirriego: eficiencia ignorada (estamos cargando)');
      return;
    }
    console.log('🔄 updateEfficiency (Fertirriego) llamado:', { nutrient, value });
    
    const adjustmentInput = document.getElementById(`ferti-adj-${nutrient}`);
    const adjustmentValue = adjustmentInput ? (parseFloat(adjustmentInput.value) || 0) : 0;
    const efficiencyValue = parseFloat(value) || 1;
    const adjOxide = isFertirriegoElementalMode
      ? convertFromElementalToOxide(nutrient, adjustmentValue)
      : adjustmentValue;
    const realRequirement = (adjOxide / (efficiencyValue / 100)).toFixed(2);
    
    // CRÍTICO: Usar getConvertedValue igual que en updateAdjustment (EXACTAMENTE IGUAL QUE GRANULAR)
    const reqCell = document.getElementById(`ferti-req-${nutrient}`);
    if (reqCell) {
      reqCell.textContent = getConvertedValue(nutrient, realRequirement);
      console.log(`✅ Requerimiento Real ${nutrient} actualizado: ${reqCell.textContent} (ajuste: ${adjustmentValue}, eficiencia: ${efficiencyValue}%)`);
    } else {
      console.warn(`⚠️ No se encontró celda req-${nutrient} para actualizar`);
    }
    try { if (window.updateFertiSummary) window.updateFertiSummary(); } catch {}

    if (!savedFertiEfficiencies) savedFertiEfficiencies = {};
    savedFertiEfficiencies[nutrient] = efficiencyValue;
    
    // CRÍTICO: Guardar INMEDIATAMENTE cuando el usuario modifica un valor
    console.log('💾 Guardando inmediatamente después de modificar eficiencia (Fertirriego)');
    if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
      window.saveFertirriegoRequirementsImmediate({ force: true });
    } else if (typeof window.saveFertirriegoRequirements === 'function') {
      window.saveFertirriegoRequirements();
    } else {
      scheduleSaveFertirriegoRequirements();
    }
  } catch (error) {
    console.error('❌ Error actualizando eficiencia:', error);
  }
}

// Hacer las funciones globales de inmediato
window.showCustomCropModal = showCustomCropModal;
window.closeCustomCropModal = closeCustomCropModal;
window.addCustomCrop = addCustomCrop;

// Obtener ID de proyecto actual
function fertGetCurrentProjectId() {
  try {
    if (typeof window !== 'undefined' && window.projectManager) {
      const currentProject = window.projectManager.getCurrentProject();
      if (currentProject && currentProject.id) return currentProject.id;
    }
    const currentProjectId = localStorage.getItem('nutriplant-current-project');
    return currentProjectId || null;
  } catch (e) {
    console.error('❌ Error obteniendo ID de proyecto (fertirriego):', e);
    return null;
  }
}

// Recordar estado rápido de UI (cultivo y rendimiento)
function rememberFertirriegoUIState() {
  try {
    const pid = fertGetCurrentProjectId(); if (!pid) return;
    const cropEl = document.getElementById('fertirriegoCropType');
    const yieldEl = document.getElementById('fertirriegoTargetYield');
    if (!cropEl || !yieldEl) {
      console.debug('⚠️ Fertirriego: elementos de UI no disponibles, se omite guardado.');
      return;
    }
    const cropType = cropEl.value || '';
    const targetYield = parseFloat(yieldEl.value) || 25;
    // Persistir SIEMPRE en localStorage del proyecto para evitar depender de métodos inexistentes
    // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
    const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
    pd.fertirriegoLastUI = { cropType, targetYield };
    localStorage.setItem(k, JSON.stringify(pd));
    // Esquema unificado
    try { fertReqUnifiedMerge(obj => { obj.fertirriego = obj.fertirriego || {}; obj.fertirriego.lastUI = { cropType, targetYield }; }); } catch {}
  } catch {}
}

function applyFertirriegoUIState() {
  try {
    // 🚀 CRÍTICO: NO aplicar si el usuario está activamente cambiando valores
    if (isFertirriegoLoading) {
      console.debug('ℹ️ applyFertirriegoUIState: Omitido porque estamos cargando');
      return;
    }
    
    // 🚀 CRÍTICO: NO aplicar si el usuario está cambiando valores activamente
    if (userIsChangingValue) {
      console.debug('ℹ️ applyFertirriegoUIState: Omitido porque el usuario está cambiando valores');
      return;
    }
    
    const pid = fertGetCurrentProjectId(); if (!pid) return;
    let st = null;
    // Intentar primero desde el esquema unificado
    try {
      const key = fertReqUnifiedKey();
      if (key) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.fertirriego && o.fertirriego.lastUI) st = o.fertirriego.lastUI;
        }
      }
    } catch {}
    if (window.projectManager && window.projectManager.getCurrentProject) {
      const p = window.projectManager.getCurrentProject(); st = p && p.fertirriegoLastUI;
    }
    if (!st) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const k = `nutriplant_project_${pid}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
      st = pd.fertirriegoLastUI;
    }
    if (!st) return;
    
    const select = document.getElementById('fertirriegoCropType');
    if (select && st.cropType) {
      // 🚀 CRÍTICO: Solo aplicar si el valor actual es diferente (no sobrescribir si el usuario acaba de cambiarlo)
      if (select.value !== st.cropType) {
        if (!select.querySelector(`option[value="${st.cropType}"]`)) {
          const opt = document.createElement('option'); opt.value = st.cropType; opt.textContent = st.cropType;
          select.appendChild(opt);
        }
        // CRÍTICO: Quitar onchange antes de establecer valor para evitar recálculo prematuro
        const oldOnChange = select.getAttribute('onchange');
        select.removeAttribute('onchange');
        select.value = st.cropType;
        if (oldOnChange) select.setAttribute('onchange', oldOnChange);
      }
    }
    const ty = document.getElementById('fertirriegoTargetYield');
    if (ty && st.targetYield != null) {
      // 🚀 CRÍTICO: Solo aplicar si el valor actual es diferente (no sobrescribir si el usuario acaba de cambiarlo)
      const currentValue = parseFloat(ty.value);
      const savedValue = parseFloat(st.targetYield);
      if (isNaN(currentValue) || Math.abs(currentValue - savedValue) > 0.01) {
        // CRÍTICO: Quitar onchange antes de establecer valor para evitar recálculo prematuro
        const oldOnChange = ty.getAttribute('onchange');
        ty.removeAttribute('onchange');
        ty.value = st.targetYield;
        if (oldOnChange) ty.setAttribute('onchange', oldOnChange);
      }
    }
  } catch {}
}

// Guardar requerimientos y cultivos personalizados de fertirriego
function saveFertirriegoRequirements(options = {}) {
  // 🚀 CRÍTICO: Exponer inmediatamente cuando se define
  if (typeof window !== 'undefined') {
    window.saveFertirriegoRequirements = saveFertirriegoRequirements;
  }
  try {
    const forceSave = !!(options && options.force === true);
    // Blindaje anti-sobrescritura: si no hubo edición del usuario, no guardar.
    // Evita subir "precargados" al cambiar de sección/pestaña.
    if (!forceSave && !fertiReqDirty) {
      console.debug('⏭️ saveFertirriegoRequirements omitido (sin cambios del usuario)');
      return;
    }

    const projectId = fertGetCurrentProjectId();
    if (!projectId) {
      console.warn('⚠️ No hay proyecto seleccionado');
      return;
    }
    // Blindaje multi-equipo/móvil:
    // mientras el proyecto se hidrata desde nube al abrir, no permitir writes locales
    // de Fertirriego porque pueden pisar snapshot cloud reciente con estado parcial.
    try {
      const hydrationMap = window._np_project_open_cloud_refresh_in_progress || null;
      const projectHydrating = !!(hydrationMap && hydrationMap[projectId]);
      const bootstrapHydrating = !!window._np_cloud_bootstrap_in_progress;
      if (projectHydrating || bootstrapHydrating) {
        fertiReqDirty = true;
        console.warn('🛡️ Fertirriego: guardado omitido durante hidratación cloud del proyecto.');
        return false;
      }
    } catch (e) {}
    if (isFertirriegoWriteLocked(projectId)) {
      fertiReqDirty = true;
      console.warn('🔒 Fertirriego: guardado bloqueado temporalmente hasta terminar hidratación inicial.');
      return false;
    }

    const cropTypeEl = document.getElementById('fertirriegoCropType');
    const targetYieldEl = document.getElementById('fertirriegoTargetYield');
    const tableContainer = document.getElementById('fertirriegoTableContainer');
    const hasUI = !!cropTypeEl && !!targetYieldEl && !!tableContainer;
    
    const cropType = cropTypeEl?.value || '';
    const targetYield = parseFloat(targetYieldEl?.value) || 25;

    const nutrients = FERTIRRIEGO_NUTRIENTS;
    
    // CRÍTICO: Si los elementos no están visibles, cargar valores existentes para hacer merge
    let existingData = null;
    const adjInputsExist = nutrients.some(n => document.getElementById(`ferti-adj-${n}`));
    const effInputsExist = nutrients.some(n => document.getElementById(`ferti-eff-${n}`));
    
    if (!adjInputsExist || !effInputsExist) {
      // Elementos no visibles - cargar valores existentes para hacer merge
      try {
        if (window.projectStorage) {
          const fertirriegoSection = window.projectStorage.loadSection('fertirriego', projectId);
          if (fertirriegoSection && fertirriegoSection.requirements) {
            existingData = fertirriegoSection.requirements;
            console.log('ℹ️ Elementos no visibles - usando valores existentes desde projectStorage para merge');
          }
        }
        if (!existingData) {
          const unifiedKey = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
            const o = JSON.parse(raw);
            if (o && o.fertirriego && o.fertirriego.requirements) {
              existingData = o.fertirriego.requirements;
              console.log('ℹ️ Elementos no visibles - usando valores existentes desde localStorage para merge');
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando datos existentes para merge:', e);
      }
    }

    // Si la UI no está disponible y no hay datos existentes, no sobrescribir con valores por defecto
    if (!hasUI && !existingData) {
      console.warn('⚠️ Guardado omitido: UI de Fertirriego no disponible y no hay datos existentes.');
      return;
    }

    // 🚀 CRÍTICO: Elegir modo confiable según disponibilidad
    const hasLoadedMode = window.fertirriegoElementalModeLoaded === true;
    const isElementalMode = (hasLoadedMode && typeof window.isFertirriegoElementalMode === 'boolean')
      ? window.isFertirriegoElementalMode
      : (existingData && typeof existingData.isElementalMode === 'boolean')
        ? existingData.isElementalMode
        : (typeof isFertirriegoElementalMode === 'boolean' ? isFertirriegoElementalMode : false);
    
    // 🚀 CRÍTICO: Calcular effectiveCropType ANTES de usarlo en extractionOverrides
    // (para preservar el valor guardado si cropType está vacío)
    const effectiveCropType = cropType || (existingData && existingData.cropType ? existingData.cropType : '');

    // 🚀 CRÍTICO: Calcular effectiveTargetYield temprano para evitar referencias antes de definir
    const effectiveTargetYield = (targetYield === 25 && existingData && existingData.targetYield != null && existingData.targetYield !== 25) 
      ? existingData.targetYield 
      : targetYield;
    
    // Calcular extracción total para usar como default si no hay ajuste guardado
    let totalExtraction = {};
    if (effectiveCropType && CROP_EXTRACTION_DB[effectiveCropType]) {
      const extraction = CROP_EXTRACTION_DB[effectiveCropType];
      nutrients.forEach(n => {
        if (extraction[n] !== undefined) {
          totalExtraction[n] = (extraction[n] * targetYield).toFixed(2);
        }
      });
    }
    
    const adjustment = {}; const efficiency = {};
    nutrients.forEach(n => {
      // PRIORIDAD 1: Si el input existe (aunque esté oculto), leer su valor - EXACTAMENTE IGUAL QUE GRANULAR
      const adjInput = document.getElementById(`ferti-adj-${n}`);
      if (adjInput && adjInput.value !== undefined && adjInput.value !== '') {
        let adjValue = parseFloat(adjInput.value) || 0;
        // CRÍTICO: Si estamos en modo elemental, el valor en el input está en elemental
        // Necesitamos convertirlo a óxido para guardarlo consistentemente
        if (isElementalMode && adjValue > 0) {
          // Convertir de elemental a óxido para guardar
          // Usar los factores P_TO_P2O5, K_TO_K2O, etc. (multiplicar para convertir elemental → óxido)
          const factor = {
            'P2O5': FERTIRRIEGO_CONVERSION_FACTORS.P_TO_P2O5,
            'K2O': FERTIRRIEGO_CONVERSION_FACTORS.K_TO_K2O,
            'CaO': FERTIRRIEGO_CONVERSION_FACTORS.Ca_TO_CaO,
            'MgO': FERTIRRIEGO_CONVERSION_FACTORS.Mg_TO_MgO,
            'SiO2': FERTIRRIEGO_CONVERSION_FACTORS.Si_TO_SiO2
          }[n];
          if (factor) {
            // El valor en el input está en elemental, convertir a óxido multiplicando
            adjValue = adjValue * factor;
            console.log(`🔄 Convertido ${n} de elemental a óxido para guardar:`, adjValue);
          }
        }
        adjustment[n] = adjValue;
        console.log(`✅ Ajuste ${n} capturado del DOM (guardado en óxido):`, adjValue);
      } else if (existingData && existingData.adjustment && typeof existingData.adjustment[n] === 'number') {
        // PRIORIDAD 2: Input no existe pero hay valor guardado - mantenerlo
        adjustment[n] = existingData.adjustment[n];
        console.log(`ℹ️ Ajuste ${n} mantenido desde guardado:`, existingData.adjustment[n]);
      } else {
        // PRIORIDAD 3: No hay input ni valor guardado - calcular extracción total si no existe
        // Esto asegura que siempre haya un valor válido
        if (totalExtraction && totalExtraction[n] !== undefined) {
          adjustment[n] = parseFloat(totalExtraction[n]) || 0;
          console.log(`ℹ️ Ajuste ${n} usando extracción total (default):`, adjustment[n]);
        } else {
          // Si no hay extracción total, usar 0
          adjustment[n] = 0;
          console.log(`ℹ️ Ajuste ${n} usando 0 (sin datos):`, adjustment[n]);
        }
      }
      
      // PRIORIDAD 1: Si el input existe (aunque esté oculto), leer su valor - EXACTAMENTE IGUAL QUE GRANULAR
      const effInput = document.getElementById(`ferti-eff-${n}`);
      if (effInput && effInput.value !== undefined && effInput.value !== '') {
        // Guardar el valor del input (siempre en porcentaje)
        efficiency[n] = parseFloat(effInput.value) || DEFAULT_EFFICIENCY[n] || 85;
        console.log(`🔍 Eficiencia ${n} leída del DOM (raw):`, effInput.value, '→ guardado:', efficiency[n]);
      } else if (existingData && existingData.efficiency && typeof existingData.efficiency[n] === 'number') {
        // PRIORIDAD 2: Input no existe pero hay valor guardado - mantenerlo
        efficiency[n] = existingData.efficiency[n];
        console.log(`ℹ️ Eficiencia ${n} mantenida desde guardado:`, existingData.efficiency[n]);
      } else {
        // PRIORIDAD 3: No hay input ni valor guardado - usar default
        efficiency[n] = DEFAULT_EFFICIENCY[n] || 85;
        console.log(`ℹ️ Eficiencia ${n} usando default:`, efficiency[n]);
      }
    });
    
    // 🚀 CRÍTICO: Log completo de lo que se va a guardar - EXACTAMENTE IGUAL QUE GRANULAR
    console.log('💾 RESUMEN DE DATOS A GUARDAR (Fertirriego):', {
      cropType,
      targetYield,
      adjustmentCount: Object.keys(adjustment).length,
      efficiencyCount: Object.keys(efficiency).length,
      adjustmentSample: { N: adjustment.N, P2O5: adjustment.P2O5, K2O: adjustment.K2O },
      efficiencySample: { N: efficiency.N, P2O5: efficiency.P2O5, K2O: efficiency.K2O },
      adjustmentCompleto: adjustment,
      efficiencyCompleto: efficiency
    });

    // Detectar cultivos personalizados (no incluidos en los predefinidos)
    const predefined = ['aguacate','fresa','frambuesa','tomate','chile','sandia','melon','banano','papaya','pepino','lechuga','cebolla','maiz','cana','arandano','limon','pimiento'];
    const customCrops = {};
    Object.keys(CROP_EXTRACTION_DB).forEach(id => { if (!predefined.includes(id)) customCrops[id] = CROP_EXTRACTION_DB[id]; });

    // Overrides de extracción por cultivo para persistir cambios
    // 🚀 CRÍTICO: Capturar valores de extracción por tonelada desde los inputs si fueron modificados
    const extractionOverrides = {};
    // 🚀 CRÍTICO: Usar effectiveCropType en lugar de cropType para extractionOverrides
    if (effectiveCropType) {
      // Cargar overrides existentes primero para obtener valores originales
      let originalExtractionOverrides = {};
      try {
        if (window.projectStorage) {
          const fertirriegoSection = window.projectStorage.loadSection('fertirriego', projectId);
          if (fertirriegoSection && fertirriegoSection.requirements && fertirriegoSection.requirements.extractionOverrides) {
            originalExtractionOverrides = fertirriegoSection.requirements.extractionOverrides;
            Object.assign(extractionOverrides, originalExtractionOverrides);
          }
        }
        if (!Object.keys(extractionOverrides).length) {
          const unifiedKey = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
            const o = JSON.parse(raw);
            if (o && o.fertirriego && o.fertirriego.requirements && o.fertirriego.requirements.extractionOverrides) {
              originalExtractionOverrides = o.fertirriego.requirements.extractionOverrides;
              Object.assign(extractionOverrides, originalExtractionOverrides);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando extractionOverrides existentes:', e);
      }
      
      // 🚀 CRÍTICO: Obtener valores ORIGINALES de la base de datos (antes de aplicar overrides)
      // Definir valores base originales de los cultivos predefinidos
      const ORIGINAL_CROP_EXTRACTION_DB = {
        'aguacate': { N: 9, P2O5: 4, K2O: 16, CaO: 8, MgO: 4, S: 0, SO4: 10, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
        'fresa': { N: 6, P2O5: 2, K2O: 10, CaO: 3, MgO: 2, S: 0, SO4: 6, Fe: 0.05, Mn: 0.04, B: 0.03, Zn: 0.08, Cu: 0.006, Mo: 0.02, SiO2: 0 },
        'frambuesa': { N: 7, P2O5: 2.5, K2O: 11, CaO: 4, MgO: 2.5, S: 0, SO4: 7.5, Fe: 0.06, Mn: 0.05, B: 0.035, Zn: 0.1, Cu: 0.007, Mo: 0.025, SiO2: 0 },
        'tomate': { N: 5, P2O5: 2, K2O: 8, CaO: 4, MgO: 2, S: 0, SO4: 4.5, Fe: 0.06, Mn: 0.05, B: 0.03, Zn: 0.12, Cu: 0.006, Mo: 0.02, SiO2: 0 },
        'chile': { N: 6.5, P2O5: 2.5, K2O: 9, CaO: 4.5, MgO: 2.2, S: 0, SO4: 6, Fe: 0.065, Mn: 0.055, B: 0.035, Zn: 0.14, Cu: 0.007, Mo: 0.03, SiO2: 0 },
        'sandia': { N: 3.5, P2O5: 1.5, K2O: 5, CaO: 2, MgO: 1, S: 0, SO4: 3, Fe: 0.04, Mn: 0.03, B: 0.02, Zn: 0.08, Cu: 0.005, Mo: 0.015, SiO2: 0 },
        'melon': { N: 4, P2O5: 1.8, K2O: 6, CaO: 2.5, MgO: 1.2, S: 0, SO4: 3.6, Fe: 0.045, Mn: 0.035, B: 0.025, Zn: 0.1, Cu: 0.006, Mo: 0.02, SiO2: 0 },
        'banano': { N: 4, P2O5: 1.2, K2O: 12, CaO: 0.8, MgO: 0.5, S: 0, SO4: 0.9, Fe: 0.015, Mn: 0.012, B: 0.008, Zn: 0.03, Cu: 0.002, Mo: 0.005, SiO2: 0 },
        'papaya': { N: 4.5, P2O5: 1.5, K2O: 7, CaO: 3, MgO: 1.5, S: 0, SO4: 4.5, Fe: 0.05, Mn: 0.04, B: 0.03, Zn: 0.1, Cu: 0.006, Mo: 0.02, SiO2: 0 },
        'pepino': { N: 4, P2O5: 1.5, K2O: 6, CaO: 3, MgO: 1.5, S: 0, SO4: 3, Fe: 0.05, Mn: 0.04, B: 0.025, Zn: 0.1, Cu: 0.005, Mo: 0.02, SiO2: 0 },
        'lechuga': { N: 3, P2O5: 1, K2O: 4, CaO: 2, MgO: 1, S: 0, SO4: 2.4, Fe: 0.04, Mn: 0.03, B: 0.02, Zn: 0.08, Cu: 0.005, Mo: 0.015, SiO2: 0 },
        'cebolla': { N: 2.5, P2O5: 1, K2O: 3.5, CaO: 1.5, MgO: 0.8, S: 0, SO4: 4.5, Fe: 0.04, Mn: 0.03, B: 0.02, Zn: 0.08, Cu: 0.005, Mo: 0.015, SiO2: 0 },
        'maiz': { N: 18, P2O5: 4, K2O: 16, CaO: 2, MgO: 1, S: 0, SO4: 6, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.175, Cu: 0.01, Mo: 0.05, SiO2: 0 },
        'cana': { N: 1.81, P2O5: 0.36, K2O: 2.11, CaO: 0.91, MgO: 0.42, S: 0, SO4: 1.50, Fe: 0.0375, Mn: 0.0155, B: 0.00074, Zn: 0.0062, Cu: 0.0022, Mo: 0.0, SiO2: 0 },
        'arandano': { N: 8, P2O5: 3, K2O: 12, CaO: 4, MgO: 2.5, S: 0, SO4: 6, Fe: 0.07, Mn: 0.06, B: 0.04, Zn: 0.12, Cu: 0.008, Mo: 0.025, SiO2: 0 },
        'limon': { N: 10, P2O5: 3.5, K2O: 18, CaO: 12, MgO: 3, S: 0, SO4: 7.5, Fe: 0.08, Mn: 0.07, B: 0.05, Zn: 0.15, Cu: 0.015, Mo: 0.03, SiO2: 0 },
        'pimiento': { N: 5.5, P2O5: 2.2, K2O: 8.5, CaO: 4.5, MgO: 2, S: 0, SO4: 6, Fe: 0.065, Mn: 0.055, B: 0.035, Zn: 0.13, Cu: 0.007, Mo: 0.025, SiO2: 0 }
      };
      
      // 🚀 CRÍTICO: Cargar valores base primero para asegurar que todos los nutrientes estén (IGUAL QUE GRANULAR)
      const baseExtraction = CROP_EXTRACTION_DB[effectiveCropType] || {};
      // Partir de overrides existentes o valores base (IGUAL QUE GRANULAR)
      // 🚀 CRÍTICO: PRIORIDAD 1: Variable global window.savedFertiExtractionOverrides (valores más recientes) - IGUAL QUE GRANULAR
      if (window.savedFertiExtractionOverrides && window.savedFertiExtractionOverrides[effectiveCropType] && typeof window.savedFertiExtractionOverrides[effectiveCropType] === 'object') {
        // 🚀 CRÍTICO: Fusionar con existingData para preservar otros cultivos
        if (!extractionOverrides[effectiveCropType]) {
          extractionOverrides[effectiveCropType] = {};
        }
        extractionOverrides[effectiveCropType] = { ...extractionOverrides[effectiveCropType], ...window.savedFertiExtractionOverrides[effectiveCropType] };
        console.log('✅ extractionOverrides desde variable global window.savedFertiExtractionOverrides:', extractionOverrides[effectiveCropType]);
      } else {
        // PRIORIDAD 2: Leer del DOM (igual que adjustment/efficiency)
        const extraction = {};
        // 🚀 CRÍTICO: Inicializar con valores existentes para preservarlos
        if (extractionOverrides[effectiveCropType] && typeof extractionOverrides[effectiveCropType] === 'object') {
          Object.assign(extraction, extractionOverrides[effectiveCropType]);
        } else {
          Object.assign(extraction, baseExtraction);
        }
        let hasExtractionValues = false;
        nutrients.forEach(n => {
          const extInput = document.getElementById(`ferti-extract-${n}`);
          if (extInput && extInput.value !== undefined && extInput.value !== '') {
            let extValue = parseFloat(extInput.value) || 0;
            // Si estamos en modo elemental, convertir a óxido para guardar consistentemente
            if (isElementalMode && extValue > 0) {
              const factor = {
                'P2O5': FERTIRRIEGO_CONVERSION_FACTORS.P_TO_P2O5,
                'K2O': FERTIRRIEGO_CONVERSION_FACTORS.K_TO_K2O,
                'CaO': FERTIRRIEGO_CONVERSION_FACTORS.Ca_TO_CaO,
                'MgO': FERTIRRIEGO_CONVERSION_FACTORS.Mg_TO_MgO,
                'SiO2': FERTIRRIEGO_CONVERSION_FACTORS.Si_TO_SiO2
              }[n];
              if (factor) {
                extValue = extValue * factor;
              }
            }
            extraction[n] = extValue;
            hasExtractionValues = true;
            console.log(`🔍 Extracción ${n} leída del DOM (raw):`, extInput.value, '→ guardado en ÓXIDO:', extraction[n]);
          }
        });
        if (hasExtractionValues) {
          extractionOverrides[effectiveCropType] = extraction;
          console.log('✅ extractionOverrides capturados desde DOM (SIEMPRE en formato ÓXIDO):', extractionOverrides[effectiveCropType]);
        }
      }
      
      // 🚀 CRÍTICO: Si extractionOverrides aún está vacío, pero hay existingData, usar existingData
      if (!extractionOverrides[effectiveCropType] && existingData && existingData.extractionOverrides && existingData.extractionOverrides[effectiveCropType]) {
        extractionOverrides[effectiveCropType] = { ...existingData.extractionOverrides[effectiveCropType] };
        console.log('ℹ️ extractionOverrides mantenidos desde existingData:', existingData.extractionOverrides[effectiveCropType]);
      }
      
      if (extractionOverrides[effectiveCropType]) {
        console.log('💾 Guardando extractionOverrides para', effectiveCropType, ':', extractionOverrides[effectiveCropType]);
      }
    }

    // Multi-equipo: guardar snapshot completo de ajuste/eficiencia.
    // Antes se podaban valores "default/auto" y en otra sesión podían
    // reconstruirse distinto por timing/hidratación de cultivo personalizado.
    // Mantener todos los nutrientes evita deriva entre dispositivos.

    // 🚀 DEBUG: Verificar valor de isElementalMode antes de guardar
    console.log('🔍 DEBUG - isElementalMode ANTES DE GUARDAR:', {
      isElementalMode: isElementalMode,
      isElementalModeType: typeof isElementalMode,
      windowIsFertirriegoElementalMode: window.isFertirriegoElementalMode,
      windowIsFertirriegoElementalModeType: typeof window.isFertirriegoElementalMode,
      localIsFertirriegoElementalMode: isFertirriegoElementalMode,
      localIsFertirriegoElementalModeType: typeof isFertirriegoElementalMode
    });
    
    let cropSnapshot = null;
    try {
      const cropType = effectiveCropType || document.getElementById('fertirriegoCropType')?.value || null;
      if (cropType) {
        const option = document.querySelector(`#fertirriegoCropType option[value="${cropType}"]`);
        const cropLabel = option ? option.textContent : cropType;
        const extraction = CROP_EXTRACTION_DB[cropType] ? { ...CROP_EXTRACTION_DB[cropType] } : null;
        const userProfile = fertLoadUserProfile();
        const userCustom = userProfile?.customFertirriegoCrops || {};
        const isUserCatalog = !!userCustom[cropType];
        cropSnapshot = {
          cropType,
          cropLabel,
          extraction,
          source: isUserCatalog ? 'userCatalog' : 'base',
          savedAt: new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('⚠️ No se pudo generar snapshot de cultivo (fertirriego):', e);
    }

    const data = { 
      cropType: effectiveCropType, // 🚀 CRÍTICO: Usar effectiveCropType para preservar valor guardado
      targetYield: effectiveTargetYield, // 🚀 CRÍTICO: Usar effectiveTargetYield para preservar valor guardado
      adjustment, 
      efficiency, 
      adjustmentsAuto: savedFertiAdjustmentsAuto === true,
      isElementalMode, 
      customCrops, 
      extractionOverrides, 
      cropSnapshot,
      timestamp: new Date().toISOString(),
      isUserSaved: true // Marcar como valores guardados del usuario
    };
    
    // 🚀 CRÍTICO: Log completo de data antes de guardar (IGUAL QUE GRANULAR)
    console.log('💾 data ANTES DE GUARDAR (Fertirriego):', {
      cropType: data.cropType,
      targetYield: data.targetYield,
      isElementalMode: data.isElementalMode,
      isElementalModeType: typeof data.isElementalMode,
      hasExtractionOverrides: !!data.extractionOverrides,
      extractionOverridesKeys: data.extractionOverrides ? Object.keys(data.extractionOverrides) : [],
      extractionOverridesForCrop: data.extractionOverrides && data.cropType ? data.extractionOverrides[data.cropType] : null,
      extractionOverridesCompleto: data.extractionOverrides,
      extractionOverridesCompletoJSON: data.extractionOverrides ? JSON.stringify(data.extractionOverrides) : 'NO HAY',
      extractionOverridesIsEmpty: data.extractionOverrides ? Object.keys(data.extractionOverrides).length === 0 : true,
      hasAdjustment: !!data.adjustment,
      hasEfficiency: !!data.efficiency
    });

    // GUARDAR usando sistema centralizado si está disponible, sino usar método directo
    const useCentralized = typeof window.projectStorage !== 'undefined';
    
    if (useCentralized) {
      // Usar sistema centralizado con merge inteligente
      const existingSection = window.projectStorage.loadSection('fertirriego', projectId) || {};
      const fertirriegoData = {
        ...existingSection,
        requirements: data,
        lastUI: { cropType, targetYield } // Sincronizado con requirements
      };
      
      // 🚀 CRÍTICO: Log de fertirriegoData antes de guardar (IGUAL QUE GRANULAR)
      console.log('💾 fertirriegoData ANTES DE GUARDAR EN projectStorage:', {
        hasRequirements: !!fertirriegoData.requirements,
        requirementsIsElementalMode: fertirriegoData.requirements?.isElementalMode,
        requirementsIsElementalModeType: typeof fertirriegoData.requirements?.isElementalMode,
        requirementsHasExtractionOverrides: !!fertirriegoData.requirements?.extractionOverrides,
        extractionOverridesKeys: fertirriegoData.requirements?.extractionOverrides ? Object.keys(fertirriegoData.requirements.extractionOverrides) : [],
        extractionOverridesForCrop: fertirriegoData.requirements?.extractionOverrides && fertirriegoData.requirements?.cropType ? fertirriegoData.requirements.extractionOverrides[fertirriegoData.requirements.cropType] : null,
        extractionOverridesCompleto: fertirriegoData.requirements?.extractionOverrides,
        extractionOverridesCompletoJSON: fertirriegoData.requirements?.extractionOverrides ? JSON.stringify(fertirriegoData.requirements.extractionOverrides) : 'NO HAY',
        extractionOverridesIsEmpty: fertirriegoData.requirements?.extractionOverrides ? Object.keys(fertirriegoData.requirements.extractionOverrides).length === 0 : true
      });
      
      const success = window.projectStorage.saveSection('fertirriego', fertirriegoData, projectId);
      
      if (success) {
        // Verificar que realmente se guardó
        const verified = window.projectStorage.loadSection('fertirriego', projectId);
        if (verified && verified.requirements) {
          const hasAdj = verified.requirements.adjustment;
          const hasEff = verified.requirements.efficiency;
          const hasExtOv = verified.requirements.extractionOverrides;
          console.log('💾 Guardado VERIFICADO Fertirriego (sistema centralizado):', { 
            cropType,
            targetYield,
            isElementalMode: verified.requirements.isElementalMode,
            isElementalModeType: typeof verified.requirements.isElementalMode, 
            targetYield, 
            hasAdjustment: !!hasAdj && Object.keys(hasAdj).length > 0, 
            hasEfficiency: !!hasEff && Object.keys(hasEff).length > 0,
            hasExtractionOverrides: !!hasExtOv && Object.keys(hasExtOv).length > 0,
            adjustmentKeys: hasAdj ? Object.keys(hasAdj) : [],
            efficiencyKeys: hasEff ? Object.keys(hasEff) : [],
            extractionOverridesKeys: hasExtOv ? Object.keys(hasExtOv) : [],
            extractionOverridesForCrop: hasExtOv && cropType ? (hasExtOv[cropType] || null) : null,
            adjustmentVerificado: hasAdj,
            efficiencyVerificado: hasEff,
            extractionOverridesVerificado: hasExtOv
          });
          
          // 🚀 CRÍTICO: Verificar directamente en localStorage si los datos se guardaron (IGUAL QUE GRANULAR)
          try {
            const key = `nutriplant_project_${projectId}`;
            const raw = localStorage.getItem(key);
            if (raw) {
              const stored = JSON.parse(raw);
              const storedFertirriego = stored.fertirriego;
              const storedRequirements = storedFertirriego && storedFertirriego.requirements;
              console.log('🔍 VERIFICACIÓN DIRECTA EN LOCALSTORAGE (Fertirriego):', {
                hasFertirriego: !!storedFertirriego,
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
            console.warn('⚠️ Error verificando localStorage directamente (Fertirriego):', e);
          }
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
      
      // 🚀 CRÍTICO: Preservar location ANTES de actualizar fertirriego
      const existingLocation = unified.location;
      const hasValidLocation = existingLocation && 
                              existingLocation.polygon && 
                              Array.isArray(existingLocation.polygon) && 
                              existingLocation.polygon.length >= 3;
      
      unified.fertirriego = unified.fertirriego || {};
      // CRÍTICO: Sincronizar SIEMPRE requirements y lastUI
      unified.fertirriego = {
        ...unified.fertirriego,
        requirements: data,
        lastUI: { cropType, targetYield } // Sincronizado con requirements
      };
      
      // 🚀 CRÍTICO: Restaurar location después de actualizar fertirriego
      if (hasValidLocation) {
        unified.location = existingLocation;
        console.log('✅ Location preservado en fallback de saveFertirriegoRequirements');
      }
      
      localStorage.setItem(unifiedKey, JSON.stringify(unified));
      console.log('💾 Guardado Fertirriego (método directo):', { 
        cropType, 
        targetYield, 
        hasAdjustment: Object.keys(adjustment).length > 0, 
        hasEfficiency: Object.keys(efficiency).length > 0 
      });
    }
    
    // También guardar en projectManager si existe (para compatibilidad)
    if (window.projectManager && window.projectManager.saveProjectData) {
      window.projectManager.saveProjectData('fertirriegoRequirements', data);
      // Mantener estado rápido también en projectManager (si expone el proyecto actual)
      try {
        if (window.projectManager.getCurrentProject) {
          const currentProject = window.projectManager.getCurrentProject();
          if (currentProject) {
            currentProject.fertirriegoLastUI = { cropType, targetYield };
          }
        }
      } catch {}
    }

    // Sincronizar estado rápido de UI para que el cultivo/rendimiento se mantengan
    rememberFertirriegoUIState();
    // Mantener memoria en línea con el guardado real para evitar que
    // un saveProjectData posterior pise con snapshot viejo.
    try {
      if (typeof currentProject !== 'undefined' && currentProject && String(currentProject.id || '') === String(projectId)) {
        currentProject.fertirriego = {
          ...(currentProject.fertirriego || {}),
          requirements: data,
          lastUI: { cropType, targetYield }
        };
        // Compatibilidad legacy
        currentProject.fertirriegoRequirements = data;
      }
      if (window.projectStorage && window.projectStorage.memoryCache &&
          String(window.projectStorage.memoryCache.currentProjectId || '') === String(projectId) &&
          window.projectStorage.memoryCache.projectData) {
        const memProject = window.projectStorage.memoryCache.projectData;
        memProject.fertirriego = {
          ...(memProject.fertirriego || {}),
          requirements: data,
          lastUI: { cropType, targetYield }
        };
        memProject.fertirriegoRequirements = data;
      }
    } catch (e) {
      console.warn('⚠️ Fertirriego: no se pudo sincronizar snapshot en memoria:', e);
    }
    console.log('✅ Requerimientos de fertirriego guardados');
  } catch (e) {
    console.error('❌ Error guardando requerimientos de fertirriego:', e);
    if (typeof window.showMessage === 'function') {
      window.showMessage('❌ Error al guardar Fertirriego', 'error');
    } else if (typeof window.alert === 'function') {
      alert('❌ Error al guardar Fertirriego. Revisa la consola para más detalles.');
    }
  }
}

// ===== Autosave (debounce) =====
let saveFertiReqTimer = null;
function scheduleSaveFertirriegoRequirements(){
  if (isFertirriegoLoading) {
    console.debug('ℹ️ Fertirriego: autosave omitido (estamos cargando)');
    fertiReqDirty = true;
    return;
  }
  try { if (saveFertiReqTimer) clearTimeout(saveFertiReqTimer); } catch {}
  saveFertiReqTimer = setTimeout(() => {
    try {
      const saved = saveFertirriegoRequirements();
      if (saved !== false) fertiReqDirty = false;
    } catch (e) {
      console.warn('autosave fertirriegoRequirements', e);
    }
  }, 500);
  fertiReqDirty = true;
  if (!fertiReqAutosaveInterval) {
    try {
      fertiReqAutosaveInterval = setInterval(() => {
        try { flushFertirriegoRequirementsIfDirty(); } catch {}
      }, 20000);
    } catch {}
  }
}

// ===== Guardado INMEDIATO (sin debounce) para cambios de pestaña/sección =====
function saveFertirriegoRequirementsImmediate(options = {}) {
  // 🚀 CRÍTICO: Exponer inmediatamente cuando se define
  if (typeof window !== 'undefined') {
    window.saveFertirriegoRequirementsImmediate = saveFertirriegoRequirementsImmediate;
  }
  try {
    const forceSave = !!(options && options.force === true);
    // Cancelar cualquier guardado pendiente con debounce
    if (saveFertiReqTimer) {
      clearTimeout(saveFertiReqTimer);
      saveFertiReqTimer = null;
    }
    // Guardar INMEDIATAMENTE
    const saved = saveFertirriegoRequirements({ force: forceSave });
    if (saved !== false) fertiReqDirty = false;
    console.log('⚡ Guardado INMEDIATO de Fertirriego ejecutado');
  } catch (e) {
    console.error('❌ Error en guardado inmediato de Fertirriego:', e);
  }
}

// Las funciones se exponen DESPUÉS de definirlas (ver más abajo)

// Cargar cultivos desde la nube (si hay) y aplicarlos al perfil local; retorna Promise
function ensureCustomFertirriegoCropsLoadedFromCloud() {
  const userId = fertGetCurrentUserId();
  if (!userId) return Promise.resolve();
  if (typeof window.nutriplantFetchCustomFertiCropsFromCloud !== 'function') return Promise.resolve();
  return window.nutriplantFetchCustomFertiCropsFromCloud(userId).then(function(cloudData) {
    if (cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0) {
      var profile = fertLoadUserProfile() || {};
      profile.customFertirriegoCrops = cloudData;
      try { localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile)); } catch (e) {}
      console.log('✅ Cultivos fertirriego personalizados cargados desde la nube');
    }
  }).catch(function() {});
}

// Cargar cultivos personalizados anteriores y reconstruir selector (nube primero, luego local)
function loadCustomFertirriegoCrops() {
  return ensureCustomFertirriegoCropsLoadedFromCloud()
    .then(function() {
      doLoadCustomFertirriegoCrops();
      return true;
    })
    .catch(function(e) {
      console.warn('⚠️ Fertirriego: no se pudieron cargar cultivos personalizados desde nube:', e);
      try { doLoadCustomFertirriegoCrops(); } catch (_) {}
      return false;
    });
}

function doLoadCustomFertirriegoCrops() {
  try {
    const projectId = fertGetCurrentProjectId(); if (!projectId) return;
    let custom = {};
    const userCustomRaw = fertGetUserCustomCrops();
    const userCustom = fertNormalizeCustomCropMap(userCustomRaw);
    if (userCustom && typeof userCustom === 'object') {
      custom = { ...userCustom };
    }
    // Si hay sesión y había datos en fallback, subirlos al perfil/nube y limpiar fallback
    const uid = fertGetCurrentUserId();
    if (uid) {
      try {
        const raw = localStorage.getItem('fertirriegoCustomCrops_global_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            Object.keys(parsed).forEach(function(cropId) {
              var entry = parsed[cropId];
              if (entry && entry.extraction) {
                fertSaveUserCustomCrop(cropId, entry.name || fertFormatCustomCropName(cropId), entry.extraction);
                custom[cropId] = { name: entry.name || fertFormatCustomCropName(cropId), extraction: entry.extraction };
                CROP_EXTRACTION_DB[cropId] = entry.extraction;
              }
            });
            localStorage.removeItem('fertirriegoCustomCrops_global_user');
          }
        }
      } catch (e) {}
    }

    // Legacy por proyecto (se fusiona y migra al usuario)
    let legacy = null;
    if (window.projectManager && window.projectManager.loadProjectData) {
      const d = window.projectManager.loadProjectData('fertirriegoRequirements');
      if (d && d.customCrops) legacy = d.customCrops;
    }
    if (!legacy) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const k = `nutriplant_project_${projectId}`; const pd = JSON.parse(localStorage.getItem(k) || '{}');
      if (pd.fertirriegoRequirements && pd.fertirriegoRequirements.customCrops) legacy = pd.fertirriegoRequirements.customCrops;
    }
    if (legacy && typeof legacy === 'object') {
      const legacyNormalized = fertNormalizeCustomCropMap(legacy);
      custom = { ...legacyNormalized, ...custom };
      Object.keys(legacyNormalized).forEach(id => {
        const entry = legacyNormalized[id];
        if (entry && entry.extraction) {
          fertSaveUserCustomCrop(id, entry.name, entry.extraction);
        }
      });
      console.log('✅ Cultivos personalizados legacy migrados a catálogo usuario (fertirriego)');
    }

    if (custom && typeof custom === 'object') {
      Object.keys(custom).forEach(id => {
        const entry = custom[id];
        if (entry && entry.extraction) {
          CROP_EXTRACTION_DB[id] = entry.extraction;
        }
      });
    }

    const select = document.getElementById('fertirriegoCropType');
    if (select) {
      Object.keys(CROP_EXTRACTION_DB).forEach(id => {
        if (!select.querySelector(`option[value="${id}"]`)) {
          const opt = document.createElement('option');
          const entry = custom[id];
          const cropName = entry?.name || fertFormatCustomCropName(id);
          opt.value = id; opt.textContent = cropName;
          select.appendChild(opt);
        }
      });
    }
    renderFertirriegoCustomCropsList();
  } catch (e) { console.error('❌ Error cargando cultivos personalizados (fertirriego):', e); }
}

// Cargar requerimientos guardados y aplicarlos a la UI
// EXACTAMENTE IGUAL QUE GRANULAR - sin complicaciones
loadFertirriegoRequirements = function(retryCount = 0) {
  // CRÍTICO: Exponer INMEDIATAMENTE al definir - REEMPLAZAR stub
  if (typeof window !== 'undefined') {
    window.loadFertirriegoRequirements = loadFertirriegoRequirements;
    console.log('✅ loadFertirriegoRequirements REAL definido y expuesto (reemplazando stub)');
    // Forzar que se reconozca como función real (no stub)
    window.loadFertirriegoRequirements._isRealFunction = true;
  }
  
  let hydrationProjectId = null;
  try {
    console.log('🔄 loadFertirriegoRequirements() llamado - iniciando carga...');
    // Reset de estado temporal para evitar arrastre entre proyectos.
    isFertirriegoLoading = false;
    userIsChangingValue = false;
    savedFertiAdjustments = null;
    savedFertiEfficiencies = null;
    savedFertiAdjustmentsAuto = true;
    lastFertiCrop = null;
    lastFertiTargetYield = null;
    if (typeof window !== 'undefined') {
      if (!window.savedFertiExtractionOverrides || typeof window.savedFertiExtractionOverrides !== 'object') {
        window.savedFertiExtractionOverrides = {};
      }
    }
    // Respetar la sub-pestaña actual; solo activar "extraccion" si ninguna está activa
    const activeTab = document.querySelector('.fertirriego-container .tab-button.active');
    if (!activeTab) {
      const extraccionTab = document.querySelector('.fertirriego-container .tab-button[data-tab="extraccion"]');
      const extraccionContent = document.getElementById('extraccion');
      if (extraccionTab) {
        console.log('🔄 Activando sub-pestaña "extraccion" (no había activa)');
        document.querySelectorAll('.fertirriego-container .tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.fertirriego-container .tab-content').forEach(el => el.classList.remove('active'));
        extraccionTab.classList.add('active');
        if (extraccionContent) extraccionContent.classList.add('active');
      }
    }
    
    // Verificar que los elementos existan antes de continuar
    const cropTypeEl = document.getElementById('fertirriegoCropType');
    const targetYieldEl = document.getElementById('fertirriegoTargetYield');
    const tableContainer = document.getElementById('fertirriegoTableContainer');
    
    if (!cropTypeEl || !targetYieldEl || !tableContainer) {
      const stillVisible = document.querySelector('.fertirriego-container');
      if (!stillVisible) {
        console.debug('⚠️ Fertirriego ya no visible, cancelando carga.');
        return;
      }
      if (retryCount >= 10) {
        console.warn('⚠️ No se encontraron elementos de Fertirriego tras varios intentos. Abortando.');
        return;
      }
      console.debug('⚠️ Elementos Fertirriego aún no listos (intento', retryCount + 1, '), reintentando...');
      setTimeout(() => loadFertirriegoRequirements(retryCount + 1), 200);
      return;
    }
    
    console.log('✅ Elementos DOM encontrados, continuando con carga...');
    
    const projectId = fertGetCurrentProjectId();
    if (!projectId) {
      console.warn('⚠️ No hay proyecto seleccionado para cargar Fertirriego. Mostrando valores por defecto.');
      if (typeof calculateNutrientRequirements === 'function') {
        calculateNutrientRequirements({ _isLoading: true, _skipLoadFromStorage: true });
      }
      return;
    }
    hydrationProjectId = projectId;
    lockFertirriegoWrites(projectId);
    let data = null;
    
    // Cargar cultivos personalizados en paralelo para evitar carreras de render/cálculo.
    // Luego se hace un recálculo corto cuando termine, con los mismos datos guardados.
    let customCropsReadyPromise = Promise.resolve(false);
    try {
      customCropsReadyPromise = Promise.resolve(loadCustomFertirriegoCrops());
    } catch (e) {
      console.warn('⚠️ Fertirriego: no se pudo iniciar carga de cultivos personalizados:', e);
    }

    // PRIORIDAD 1: Sistema centralizado si está disponible
    const useCentralized = typeof window.projectStorage !== 'undefined';
    if (useCentralized) {
      const fertirriegoSection = window.projectStorage.loadSection('fertirriego', projectId);
      console.log('🔍 DEBUG: fertirriegoSection cargado:', fertirriegoSection);
      if (fertirriegoSection && fertirriegoSection.requirements) {
        data = fertirriegoSection.requirements;
        console.log('✅ Datos Fertirriego cargados desde sistema centralizado:', { 
          cropType: data.cropType, 
          targetYield: data.targetYield,
          isElementalMode: data.isElementalMode,
          isElementalModeType: typeof data.isElementalMode,
          hasAdjustment: !!data.adjustment,
          hasEfficiency: !!data.efficiency,
          hasExtractionOverrides: !!(data.extractionOverrides && data.extractionOverrides[data.cropType]),
          adjustmentKeys: data.adjustment ? Object.keys(data.adjustment) : [],
          efficiencyKeys: data.efficiency ? Object.keys(data.efficiency) : [],
          adjustmentSample: data.adjustment ? { N: data.adjustment.N, P2O5: data.adjustment.P2O5, K2O: data.adjustment.K2O } : null,
          efficiencySample: data.efficiency ? { N: data.efficiency.N, P2O5: data.efficiency.P2O5, K2O: data.efficiency.K2O } : null
        });
        console.log('📋 Ajustes COMPLETOS cargados:', data.adjustment);
        console.log('📋 Eficiencias COMPLETAS cargadas:', data.efficiency);
        console.log('📋 extractionOverrides cargados:', data.extractionOverrides);
        
        // 🚀 CRÍTICO: Verificar directamente en localStorage para comparar (IGUAL QUE GRANULAR)
        try {
          const key = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const stored = JSON.parse(raw);
            const storedFertirriego = stored.fertirriego;
            const storedRequirements = storedFertirriego && storedFertirriego.requirements;
            console.log('🔍 VERIFICACIÓN DIRECTA EN LOCALSTORAGE AL CARGAR (Fertirriego):', {
              hasFertirriego: !!storedFertirriego,
              hasRequirements: !!storedRequirements,
              requirementsKeys: storedRequirements ? Object.keys(storedRequirements) : [],
              hasExtractionOverrides: !!(storedRequirements && storedRequirements.extractionOverrides),
              extractionOverridesKeys: storedRequirements && storedRequirements.extractionOverrides ? Object.keys(storedRequirements.extractionOverrides) : [],
              extractionOverridesCompleto: storedRequirements ? storedRequirements.extractionOverrides : null,
              extractionOverridesCompletoJSON: storedRequirements && storedRequirements.extractionOverrides ? JSON.stringify(storedRequirements.extractionOverrides) : 'NO HAY',
              extractionOverridesForCrop: storedRequirements && storedRequirements.extractionOverrides && data.cropType ? storedRequirements.extractionOverrides[data.cropType] : null
            });
            
            // 🚀 CRÍTICO: Si localStorage TIENE extractionOverrides pero loadSection NO lo devolvió, USAR localStorage (IGUAL QUE GRANULAR)
            if (storedRequirements && storedRequirements.extractionOverrides && !data.extractionOverrides) {
              console.warn('⚠️ ¡PROBLEMA DETECTADO! localStorage TIENE extractionOverrides pero loadSection NO lo devolvió (Fertirriego)');
              console.log('🔧 CORRIGIENDO: Usando extractionOverrides directamente desde localStorage (Fertirriego)');
              data.extractionOverrides = storedRequirements.extractionOverrides;
              console.log('✅ extractionOverrides corregido desde localStorage (Fertirriego):', Object.keys(data.extractionOverrides));
            }
          }
        } catch (e) {
          console.warn('⚠️ Error verificando localStorage al cargar (Fertirriego):', e);
        }
      } else {
        console.warn('⚠️ fertirriegoSection no tiene requirements:', { 
          hasSection: !!fertirriegoSection,
          hasRequirements: !!(fertirriegoSection && fertirriegoSection.requirements)
        });
      }
    }
    
    // PRIORIDAD 2: Esquema unificado (nutriplant_project_<id>) - fallback
    if (!data) {
      try {
        const unifiedKey = `nutriplant_project_${projectId}`;
        const raw = localStorage.getItem(unifiedKey);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.fertirriego && o.fertirriego.requirements) {
            data = o.fertirriego.requirements;
            console.log('✅ Datos Fertirriego cargados desde unificado:', { 
              cropType: data.cropType, 
              targetYield: data.targetYield,
              hasExtractionOverrides: !!(data.extractionOverrides && data.extractionOverrides[data.cropType]),
              extractionOverrides: data.extractionOverrides
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando desde unificado:', e);
      }
    }
    
    // PRIORIDAD 3: projectManager - fallback
    if (!data && typeof window.projectManager !== 'undefined') {
      const project = window.projectManager.getCurrentProject();
      if (project && project.fertirriegoRequirements) {
        data = project.fertirriegoRequirements;
      }
    }
    
    // PRIORIDAD 4: projectManager.loadProjectData - fallback
    if (!data && typeof window.projectManager !== 'undefined' && window.projectManager.loadProjectData) {
      data = window.projectManager.loadProjectData('fertirriegoRequirements');
    }
    
    // PRIORIDAD 5: Formato nuevo (nutriplant_project_<id>) - fallback
    if (!data) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const projectKey = `nutriplant_project_${projectId}`;
      const projectData = JSON.parse(localStorage.getItem(projectKey) || '{}');
      if (projectData.fertirriegoRequirements) {
        data = projectData.fertirriegoRequirements;
      }
      if (!data && projectData.fertirriego && projectData.fertirriego.requirements) {
        data = projectData.fertirriego.requirements;
      }
    }
    
    // PRIORIDAD 6: Proyecto ya en memoria (p. ej. tras recargar y abrir desde Inicio)
    if (!data && typeof window.currentProject !== 'undefined' && window.currentProject && window.currentProject.fertirriego && window.currentProject.fertirriego.requirements) {
      data = window.currentProject.fertirriego.requirements;
      console.log('✅ Datos Fertirriego desde currentProject en memoria (recarga/Inicio)');
    }
    if (!data && typeof window.projectManager !== 'undefined') {
      const p = window.projectManager.getCurrentProject();
      if (p && p.fertirriego && p.fertirriego.requirements) {
        data = p.fertirriego.requirements;
        console.log('✅ Datos Fertirriego desde projectManager (recarga/Inicio)');
      }
    }
    
    if (!data) {
      console.log('ℹ️ No hay datos guardados de Fertirriego para este proyecto - usando valores precargados');
      // NO retornar - dejar que se calcule con valores precargados
      // Pero marcar que no hay datos guardados para que se guarden cuando el usuario modifique
      // Además, limpiar posibles restos visuales/temporales del proyecto anterior.
      const selectNoData = document.getElementById('fertirriegoCropType');
      if (selectNoData && selectNoData.options && selectNoData.options.length > 0) {
        selectNoData.selectedIndex = 0;
      }
      const targetYieldNoData = document.getElementById('fertirriegoTargetYield');
      if (targetYieldNoData) {
        targetYieldNoData.value = targetYieldNoData.defaultValue || '25';
      }
      isFertirriegoElementalMode = false;
      window.isFertirriegoElementalMode = false;
      window.fertirriegoElementalModeLoaded = true;
      const btnNoData = document.getElementById('toggleFertirriegoOxideElementalBtn');
      if (btnNoData) btnNoData.textContent = '🔄 Ver en Elemental';
      window.savedFertiExtractionOverrides = {};
      data = null;
    }

    // REGLA: Si hay datos guardados, aplicarlos. Si no, usar valores precargados
    if (data) {
      // 🚀 CRÍTICO: Cargar isElementalMode PRIMERO (ANTES de cualquier otra lógica)
      // Esto asegura que isFertirriegoElementalMode esté sincronizado antes de renderizar la tabla
      if (typeof data.isElementalMode === 'boolean') {
        isFertirriegoElementalMode = data.isElementalMode;
        window.isFertirriegoElementalMode = isFertirriegoElementalMode;
        window.fertirriegoElementalModeLoaded = true;
        const btn = document.getElementById('toggleFertirriegoOxideElementalBtn');
        if (btn) btn.textContent = isFertirriegoElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental';
        console.log('✅ isElementalMode cargado PRIMERO:', isFertirriegoElementalMode);
      } else {
        // Inicializar window.isFertirriegoElementalMode incluso si no hay datos guardados
        window.isFertirriegoElementalMode = isFertirriegoElementalMode || false;
        window.fertirriegoElementalModeLoaded = true;
      }
      
      // 🚀 CRÍTICO: Establecer cropType PRIMERO (ANTES de aplicar overrides)
      // Esto es esencial porque los overrides dependen de cropType para saber qué aplicar
      const select = document.getElementById('fertirriegoCropType');
      
      // 🚀 DEBUG CRÍTICO: Verificar qué tiene 'data' cuando se carga
      console.log('🔍 DEBUG CRÍTICO - data cuando se carga:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        dataCropType: data?.cropType,
        dataTargetYield: data?.targetYield,
        dataIsElementalMode: data?.isElementalMode,
        dataIsElementalModeType: typeof data?.isElementalMode,
        dataType: typeof data,
        dataIsObject: data && typeof data === 'object',
        dataString: data ? JSON.stringify(data).substring(0, 200) : 'NO DATA'
      });
      
      let effectiveCropType = data.cropType;
      
      // Si data.cropType está vacío pero hay un valor en el DOM, usar el del DOM
      if (!effectiveCropType && select && select.value) {
        effectiveCropType = select.value;
        console.log('⚠️ data.cropType está vacío, usando valor del DOM:', effectiveCropType);
      }
      
      // 🚀 CRÍTICO: SIEMPRE establecer cropType en el DOM si existe en data
      // Esto asegura que el valor guardado se muestre correctamente
      if (select && data.cropType) {
        effectiveCropType = data.cropType;
        const exists = select.querySelector(`option[value="${effectiveCropType}"]`);
        if (!exists) {
          const option = document.createElement('option');
          option.value = effectiveCropType;
          option.textContent = effectiveCropType;
          select.appendChild(option);
        }
        // CRÍTICO: Establecer valor SIN disparar eventos que recalculen sin valores guardados
        const oldOnChange = select.getAttribute('onchange');
        select.removeAttribute('onchange');
        select.value = effectiveCropType;
        if (oldOnChange) select.setAttribute('onchange', oldOnChange);
        
        // 🚀 CRÍTICO: Actualizar data.cropType ANTES de aplicar overrides
        data.cropType = effectiveCropType;
        console.log('✅ cropType establecido en DOM y actualizado en data:', effectiveCropType);
      } else if (select && select.value) {
        // Si no hay data.cropType pero hay un valor en el DOM, usarlo
        effectiveCropType = select.value;
        data.cropType = effectiveCropType;
        console.log('✅ cropType tomado del DOM:', effectiveCropType);
      } else if (select && !select.value && !data.cropType) {
        // Si no hay valor en data ni en DOM, usar el primer cultivo disponible
        const firstOption = select.querySelector('option');
        if (firstOption && firstOption.value) {
          effectiveCropType = firstOption.value;
          select.value = effectiveCropType;
          data.cropType = effectiveCropType;
          console.log('✅ cropType establecido desde primer option disponible:', effectiveCropType);
        }
      }
      
      // 🚀 CRÍTICO: Aplicar overrides de extracción DESPUÉS de establecer cropType
      // Ahora que data.cropType está establecido, podemos aplicar los overrides correctamente
      // IMPORTANTE: Esto debe hacerse ANTES de llamar a calculateNutrientRequirements()
      // para que la función use los valores correctos de CROP_EXTRACTION_DB
      console.log('🔍 DEBUG extractionOverrides:', {
        hasExtractionOverrides: !!data.extractionOverrides,
        cropType: data.cropType,
        extractionOverridesKeys: data.extractionOverrides ? Object.keys(data.extractionOverrides) : [],
        hasOverrideForCropType: !!(data.extractionOverrides && data.cropType && data.extractionOverrides[data.cropType])
      });
      
      if (data.extractionOverrides && data.cropType && data.extractionOverrides[data.cropType]) {
        const ov = data.extractionOverrides[data.cropType];
        if (ov && typeof ov === 'object') {
          // 🚀 CRÍTICO: Reemplazar completamente, no merge parcial (IGUAL QUE GRANULAR)
          // Esto asegura que todos los valores modificados se muestren correctamente
          // Convertir valores a números para asegurar consistencia
          const normalizedOv = {};
          Object.keys(ov).forEach(key => {
            if (ov[key] !== undefined && ov[key] !== null) {
              const numValue = typeof ov[key] === 'string' ? parseFloat(ov[key]) : ov[key];
              if (!isNaN(numValue)) {
                normalizedOv[key] = numValue;
              }
            }
          });
          // 🚀 CRÍTICO: NO mutar CROP_EXTRACTION_DB
          // Los extractionOverrides se cargarán y fusionarán en calculateNutrientRequirements()
          console.log('✅ extractionOverrides disponibles para', data.cropType, ':', normalizedOv);
          console.log('ℹ️ Los overrides se fusionarán en calculateNutrientRequirements() sin mutar CROP_EXTRACTION_DB');
        }
      } else {
        console.warn('⚠️ No se aplicaron extractionOverrides:', {
          hasExtractionOverrides: !!data.extractionOverrides,
          cropType: data.cropType,
          hasOverrideForCropType: !!(data.extractionOverrides && data.cropType && data.extractionOverrides[data.cropType])
        });
      }
      const targetYieldInput = document.getElementById('fertirriegoTargetYield');
      if (targetYieldInput) {
        // 🚀 CRÍTICO: NO restaurar si el usuario está activamente cambiando el valor
        if (userIsChangingValue) {
          console.log('ℹ️ loadFertirriegoRequirements: Omitiendo restauración de targetYield porque el usuario está cambiando el valor');
          // NO hacer return aquí - continuar cargando otros datos (ajustes, eficiencias, etc.)
        } else if (data.targetYield != null) {
          // 🚀 CRÍTICO: SIEMPRE aplicar el valor guardado cuando estamos cargando (no cuando el usuario está cambiando)
          // Esto asegura que los valores guardados se restablezcan correctamente al recargar la página
          const currentValue = parseFloat(targetYieldInput.value);
          const savedValue = parseFloat(data.targetYield);
          
          // Aplicar SIEMPRE el valor guardado (la condición solo verifica si hay un valor válido guardado)
          if (!isNaN(savedValue) && savedValue > 0) {
            // CRÍTICO: Establecer valor SIN disparar eventos que recalculen sin valores guardados
            const oldOnChange = targetYieldInput.getAttribute('onchange');
            targetYieldInput.removeAttribute('onchange');
            targetYieldInput.value = data.targetYield;
            // 🚀 CRÍTICO: Actualizar lastFertiTargetYield para que calculateNutrientRequirements no lo sobrescriba
            lastFertiTargetYield = savedValue;
            if (oldOnChange) targetYieldInput.setAttribute('onchange', oldOnChange);
            console.log('✅ targetYield restaurado desde guardado:', data.targetYield, '(valor anterior:', currentValue, ')');
          } else {
            console.warn('⚠️ targetYield guardado no es válido:', data.targetYield);
          }
        } else {
          // Si no hay targetYield guardado pero hay un valor en el DOM, mantenerlo
          const currentValue = parseFloat(targetYieldInput.value);
          if (!isNaN(currentValue) && currentValue > 0) {
            lastFertiTargetYield = currentValue;
            console.log('ℹ️ targetYield no guardado, manteniendo valor del DOM:', currentValue);
          }
        }
      }
      // 🚀 CRÍTICO: isElementalMode ya se cargó ARRIBA (antes de establecer cropType/targetYield)
      // NO cargar de nuevo aquí para evitar sobrescribir el valor correcto

      // 🚀 CRÍTICO: Cargar extractionOverrides en variable global ANTES del if (IGUAL QUE GRANULAR)
      // Esto asegura que savedFertiExtractionOverrides tenga los valores guardados
      // (Nota: Necesitamos crear la variable global savedFertiExtractionOverrides primero)
      if (data.extractionOverrides && typeof data.extractionOverrides === 'object') {
        if (!window.savedFertiExtractionOverrides) window.savedFertiExtractionOverrides = {};
        window.savedFertiExtractionOverrides = { ...data.extractionOverrides };
        console.log('✅ extractionOverrides cargados en variable global:', Object.keys(window.savedFertiExtractionOverrides));
        const cropTypeToApply = select ? (select.value || data.cropType) : data.cropType;
        if (cropTypeToApply && window.savedFertiExtractionOverrides[cropTypeToApply]) {
          console.log('✅ extractionOverrides disponibles para', cropTypeToApply, ':', window.savedFertiExtractionOverrides[cropTypeToApply]);
        }
      } else {
        // Limpiar variable global si no hay overrides guardados
        if (!window.savedFertiExtractionOverrides) window.savedFertiExtractionOverrides = {};
        window.savedFertiExtractionOverrides = {};
        console.log('ℹ️ No hay extractionOverrides guardados - variable global limpiada');
      }

      // Sincronizar el estado rápido con los valores aplicados
      rememberFertirriegoUIState();
    }
    // CRÍTICO: Renderizar usando los datos guardados (EXACTAMENTE IGUAL QUE GRANULAR)
    // NO hacer setTimeout adicional porque puede causar recálculos que sobrescriben
    console.log('🔍 DEBUG: Verificando datos para renderizar:', {
      hasData: !!data,
      hasAdjustment: !!(data && data.adjustment),
      hasEfficiency: !!(data && data.efficiency),
      adjustmentType: data && data.adjustment ? typeof data.adjustment : 'N/A',
      efficiencyType: data && data.efficiency ? typeof data.efficiency : 'N/A',
      adjustmentKeys: data && data.adjustment ? Object.keys(data.adjustment) : [],
      efficiencyKeys: data && data.efficiency ? Object.keys(data.efficiency) : []
    });
    
    // 🚀 CRÍTICO: SIEMPRE llamar a calculateNutrientRequirements() si hay data (IGUAL QUE GRANULAR)
    // 🚀 CRÍTICO: Usar data.cropType y data.targetYield EXPLÍCITAMENTE (IGUAL QUE GRANULAR)
    // NO confiar en select.value porque puede haber problemas de timing
    const select = document.getElementById('fertirriegoCropType');
    const targetYieldInput = document.getElementById('fertirriegoTargetYield');
    // PRIORIDAD 1: data.cropType (valor guardado) - IGUAL QUE GRANULAR
    const cropTypeToUse = (data && data.cropType) ? data.cropType : ((select && select.value) ? select.value : null);
    // PRIORIDAD 1: data.targetYield (valor guardado) - IGUAL QUE GRANULAR
    const targetYieldToUse = (data && data.targetYield != null) ? data.targetYield : ((targetYieldInput && targetYieldInput.value) ? parseFloat(targetYieldInput.value) : 25);
    
    // 🚀 DEBUG CRÍTICO: Verificar valores antes de llamar calculateNutrientRequirements
    console.log('🔍 DEBUG CRÍTICO - Valores antes de calculateNutrientRequirements:', {
      dataCropType: data?.cropType,
      dataTargetYield: data?.targetYield,
      selectValue: select?.value,
      targetYieldInputValue: targetYieldInput?.value,
      cropTypeToUse: cropTypeToUse,
      targetYieldToUse: targetYieldToUse,
      hasData: !!data
    });
    
    if (data) {
      if (typeof data.adjustmentsAuto === 'boolean') {
        savedFertiAdjustmentsAuto = data.adjustmentsAuto;
      } else if (data.cropType && data.targetYield != null) {
        const baseExtraction = { ...(CROP_EXTRACTION_DB[data.cropType] || {}) };
        if (data.extractionOverrides && data.extractionOverrides[data.cropType]) {
          Object.assign(baseExtraction, data.extractionOverrides[data.cropType]);
        }
        const baseMatches = FERTIRRIEGO_NUTRIENTS.every(n => {
          const baseValue = parseFloat(((baseExtraction[n] || 0) * data.targetYield).toFixed(2));
          const savedValue = data.adjustment && typeof data.adjustment[n] === 'number' ? data.adjustment[n] : baseValue;
          return Math.abs(baseValue - savedValue) < 0.0001;
        });
        savedFertiAdjustmentsAuto = baseMatches;
      } else {
        savedFertiAdjustmentsAuto = true;
      }
    }

    const hasSavedAdjustment = !!(
      data &&
      data.adjustment &&
      typeof data.adjustment === 'object' &&
      Object.keys(data.adjustment).length > 0
    );
    const hasSavedEfficiency = !!(
      data &&
      data.efficiency &&
      typeof data.efficiency === 'object' &&
      Object.keys(data.efficiency).length > 0
    );
    const hasSavedExtractionOverrides = !!(
      data &&
      data.extractionOverrides &&
      typeof data.extractionOverrides === 'object' &&
      Object.keys(data.extractionOverrides).length > 0
    );
    const hasAnySavedValues = hasSavedAdjustment || hasSavedEfficiency || hasSavedExtractionOverrides;

    if (data && hasAnySavedValues) {
      console.log('✅ Aplicando valores guardados de Fertirriego (incluye guardado parcial):', {
        cropType: data.cropType,
        targetYield: data.targetYield,
        hasAdjustment: hasSavedAdjustment,
        hasEfficiency: hasSavedEfficiency,
        hasExtractionOverrides: hasSavedExtractionOverrides
      });
      if (hasSavedAdjustment) {
        console.log('📋 Ajustes guardados completos:', data.adjustment);
      }
      if (hasSavedEfficiency) {
        console.log('📋 Eficiencias guardadas completas:', data.efficiency);
      }
      
      // Pasar valores guardados parciales sin forzar defaults.
      console.log('🚀 Llamando calculateNutrientRequirements con datos guardados...', {
        cropType: cropTypeToUse,
        targetYield: targetYieldToUse,
        cropTypeFromDOM: select ? select.value : 'N/A',
        targetYieldFromDOM: targetYieldInput ? targetYieldInput.value : 'N/A',
        cropTypeFromData: data.cropType,
        targetYieldFromData: data.targetYield,
        hasAdjustment: hasSavedAdjustment,
        hasEfficiency: hasSavedEfficiency,
        hasExtractionOverrides: hasSavedExtractionOverrides
      });
      
      // 🚀 CRÍTICO: Asignar a variables globales ANTES de calcular (IGUAL QUE GRANULAR)
      // Esto asegura que los ajustes se mantengan incluso si hay recálculos
      if (hasSavedAdjustment) {
        savedFertiAdjustments = { ...data.adjustment };
        console.log('✅ savedFertiAdjustments asignado desde datos guardados:', Object.keys(savedFertiAdjustments).length, 'nutrientes');
      }
      if (hasSavedEfficiency) {
        savedFertiEfficiencies = { ...data.efficiency };
        console.log('✅ savedFertiEfficiencies asignado desde datos guardados:', Object.keys(savedFertiEfficiencies).length, 'nutrientes');
      }
      
      calculateNutrientRequirements({ 
        _isLoading: true, // Marcar que estamos cargando, no guardar automáticamente
        cropType: cropTypeToUse, // 🚀 CRÍTICO: Usar cropType establecido en DOM o de data
        targetYield: targetYieldToUse, // 🚀 CRÍTICO: Usar targetYield establecido en DOM o de data
        adjustment: hasSavedAdjustment ? data.adjustment : undefined,
        efficiency: hasSavedEfficiency ? data.efficiency : undefined,
        extractionOverrides: hasSavedExtractionOverrides ? data.extractionOverrides : window.savedFertiExtractionOverrides // 🚀 CRÍTICO: Pasar extractionOverrides explícitamente (usar variable global como fallback)
      });
    } else {
      // Sin datos guardados: asegurar modo auto para inicializar con extracción total
      savedFertiAdjustmentsAuto = true;
      console.warn('⚠️ NO HAY DATOS PARA APLICAR:', {
        hasData: !!data,
        hasAdjustment: !!(data && data.adjustment),
        hasEfficiency: !!(data && data.efficiency),
        dataKeys: data ? Object.keys(data) : []
      });
      console.log('ℹ️ No hay valores guardados - usando PRECARGADOS (fórmulas predefinidas)');
      // CRÍTICO: SIEMPRE renderizar la tabla, incluso sin datos guardados
      // Esto asegura que el usuario vea la tabla con valores precargados
      // Usar setTimeout para asegurar que el DOM esté completamente listo
      setTimeout(() => {
        if (typeof calculateNutrientRequirements === 'function') {
          console.log('🚀 Llamando calculateNutrientRequirements() sin datos guardados (valores precargados)');
          // 🔒 BLINDAJE: render inicial solo visual (sin autosave) para evitar
          // que una carga tardía termine pisando valores guardados del usuario.
          calculateNutrientRequirements({ _isLoading: true, _skipLoadFromStorage: true });
        } else if (typeof window.calculateNutrientRequirements === 'function') {
          console.log('🚀 Llamando window.calculateNutrientRequirements() sin datos guardados (valores precargados)');
          window.calculateNutrientRequirements({ _isLoading: true, _skipLoadFromStorage: true });
        } else {
          console.error('❌ calculateNutrientRequirements NO está disponible - reintentando en 100ms...');
          setTimeout(() => {
            if (typeof window.calculateNutrientRequirements === 'function') {
              window.calculateNutrientRequirements({ _isLoading: true, _skipLoadFromStorage: true });
            } else {
              console.error('❌ calculateNutrientRequirements NO está disponible después de reintento');
            }
          }, 100);
        }
      }, 50);
    }

    // Recálculo de estabilización: evita que "Extracción por tonelada" quede desfasada
    // cuando el catálogo personalizado termina de cargar después del primer render.
    try {
      const projectIdAtLoad = projectId;
      customCropsReadyPromise.then(function() {
        try {
          const stillVisible = document.querySelector('.fertirriego-container');
          if (!stillVisible) return;
          const currentProjectId = fertGetCurrentProjectId();
          if (!currentProjectId || String(currentProjectId) !== String(projectIdAtLoad)) return;
          if (typeof calculateNutrientRequirements !== 'function') return;

          const cropTypeEl = document.getElementById('fertirriegoCropType');
          const targetYieldEl = document.getElementById('fertirriegoTargetYield');
          if (!cropTypeEl || !targetYieldEl) return;

          const settleCropType = (data && data.cropType) ? data.cropType : (cropTypeEl.value || null);
          const settleTargetYield = (data && data.targetYield != null)
            ? parseFloat(data.targetYield)
            : (parseFloat(targetYieldEl.value) || 25);

          const settleOptions = {
            _isLoading: true,
            cropType: settleCropType,
            targetYield: settleTargetYield
          };
          const settleHasAdjustment = !!(
            data &&
            data.adjustment &&
            typeof data.adjustment === 'object' &&
            Object.keys(data.adjustment).length > 0
          );
          const settleHasEfficiency = !!(
            data &&
            data.efficiency &&
            typeof data.efficiency === 'object' &&
            Object.keys(data.efficiency).length > 0
          );
          if (settleHasAdjustment) {
            settleOptions.adjustment = data.adjustment;
          }
          if (settleHasEfficiency) {
            settleOptions.efficiency = data.efficiency;
          }
          if (data && data.extractionOverrides) {
            settleOptions.extractionOverrides = data.extractionOverrides;
          } else if (window.savedFertiExtractionOverrides && typeof window.savedFertiExtractionOverrides === 'object') {
            settleOptions.extractionOverrides = window.savedFertiExtractionOverrides;
          }

          calculateNutrientRequirements(settleOptions);
          console.log('✅ Fertirriego: recálculo post-carga de cultivos aplicado (sin reingresar a pestaña).');
        } catch (e) {
          console.warn('⚠️ Fertirriego: recálculo post-carga no aplicado:', e);
        }
      });
    } catch (e) {
      console.warn('⚠️ Fertirriego: no se pudo programar recálculo post-carga:', e);
    }
    
    if (data) {
      console.log('✅ Requerimientos de fertirriego cargados y aplicados:', {
        cropType: data.cropType,
        targetYield: data.targetYield,
        hasAdjustments: Object.keys(data.adjustment || {}).length > 0,
        hasEfficiencies: Object.keys(data.efficiency || {}).length > 0
      });
    } else {
      console.log('✅ Requerimientos de fertirriego cargados (sin datos guardados - usando precargados)');
    }
  } catch (e) { 
    console.error('❌ Error cargando requerimientos (fertirriego):', e);
    // CRÍTICO: Asegurar que la función esté disponible incluso si hay error
    if (!window.loadFertirriegoRequirements) {
      window.loadFertirriegoRequirements = loadFertirriegoRequirements;
    }
  } finally {
    if (hydrationProjectId) {
      unlockFertirriegoWrites(hydrationProjectId);
    }
  }
};

// Hacer las funciones globales - EXPONER INMEDIATAMENTE (IGUAL QUE GRANULAR)
// 🚀 CRÍTICO: Reemplazar stubs con funciones reales
if (typeof window !== 'undefined') {
  window.saveFertirriegoRequirements = saveFertirriegoRequirements;
  window.saveFertirriegoRequirementsImmediate = saveFertirriegoRequirementsImmediate;
  window.loadFertirriegoRequirements = loadFertirriegoRequirements;
  window.calculateNutrientRequirements = calculateNutrientRequirements;
  window.renderNutrientTable = renderNutrientTable;
  
  // Marcar todas como funciones reales (no stubs)
  window.saveFertirriegoRequirements._isRealFunction = true;
  window.saveFertirriegoRequirementsImmediate._isRealFunction = true;
  window.loadFertirriegoRequirements._isRealFunction = true;
  window.calculateNutrientRequirements._isRealFunction = true;
  window.renderNutrientTable._isRealFunction = true;
  
  console.log('✅ Funciones reales de Fertirriego expuestas en window:', {
    saveFertirriegoRequirements: typeof window.saveFertirriegoRequirements === 'function',
    saveFertirriegoRequirementsImmediate: typeof window.saveFertirriegoRequirementsImmediate === 'function',
    loadFertirriegoRequirements: typeof window.loadFertirriegoRequirements === 'function',
    calculateNutrientRequirements: typeof window.calculateNutrientRequirements === 'function',
    renderNutrientTable: typeof window.renderNutrientTable === 'function'
  });
}

// Asegurar que todas las funciones críticas estén expuestas (IGUAL QUE GRANULAR)
window.flushFertirriegoRequirementsIfDirty = flushFertirriegoRequirementsIfDirty;
window.scheduleSaveFertirriegoRequirements = scheduleSaveFertirriegoRequirements;
window.applyFertirriegoUIState = applyFertirriegoUIState;
window.rememberFertirriegoUIState = rememberFertirriegoUIState;
window.updateAdjustment = updateAdjustment;
window.updateEfficiency = updateEfficiency;
window.updateExtractionPerTon = updateExtractionPerTon;
window.loadCustomFertirriegoCrops = loadCustomFertirriegoCrops;

// Inicializar cuando se carga la sección
document.addEventListener('DOMContentLoaded', function() {
  console.log('💧 Fertirriego functions cargado');
  // Exponer funciones globalmente después del DOM
  window.showCustomCropModal = showCustomCropModal;
  window.closeCustomCropModal = closeCustomCropModal;
  window.addCustomCrop = addCustomCrop;
  window.applyFertirriegoUIState = applyFertirriegoUIState;
  window.rememberFertirriegoUIState = rememberFertirriegoUIState;
  
  // Asegurar que el botón funcione
  console.log('🔧 showCustomCropModal disponible:', typeof window.showCustomCropModal);

  // 🚀 SIMPLIFICADO: Un solo event listener para cambios - sin duplicados
  document.addEventListener('change', (e) => {
    if (isFertirriegoLoading) { return; }
    const id = e.target && e.target.id;
    
    // Cambios en cultivo o rendimiento: recalcular y guardar
    if (id === 'fertirriegoCropType' || id === 'fertirriegoTargetYield') {
      // 🚀 CRÍTICO: Marcar que el usuario está cambiando valores para evitar que se restauren
      userIsChangingValue = true;

      // Resetear ajustes SOLO cuando cambia el cultivo (no cuando cambia rendimiento)
      if (id === 'fertirriegoCropType') {
        savedFertiAdjustments = null;
        savedFertiEfficiencies = null;
        savedFertiAdjustmentsAuto = true;
        lastFertiCrop = null;
        lastFertiTargetYield = null;
      }

      rememberFertirriegoUIState();

      // 🚀 CRÍTICO: Actualizar lastFertiTargetYield con el NUEVO valor antes de recalcular
      // para que calculateNutrientRequirements no lo sobrescriba
      if (id === 'fertirriegoTargetYield') {
        const newValue = parseFloat(e.target.value);
        if (!isNaN(newValue)) {
          lastFertiTargetYield = newValue;
        }
      }
      if (id === 'fertirriegoCropType') {
        lastFertiCrop = e.target.value;
      }
      
      // Recalcular inmediatamente (pero NO restaurar valores guardados - usar el valor que el usuario acaba de poner)
      if (typeof window.calculateNutrientRequirements === 'function' && window.calculateNutrientRequirements._isRealFunction === true) {
        // Pasar el valor actual del input para que NO lo sobrescriba
        const currentValue = id === 'fertirriegoTargetYield' ? parseFloat(e.target.value) : undefined;
        const currentCrop = id === 'fertirriegoCropType' ? e.target.value : undefined;
        window.calculateNutrientRequirements({
          _isLoading: false,
          _userChanged: true, // Marcar que el usuario hizo el cambio
          _forceAutoAdjustments: id === 'fertirriegoCropType',
          targetYield: currentValue,
          cropType: currentCrop
        });
      }
      
      // 🚀 CRÍTICO: Guardar INMEDIATAMENTE cuando el usuario modifica targetYield (valor crítico)
      // Usar saveFertirriegoRequirementsImmediate para evitar perder valores si el usuario recarga pronto
      if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
        window.saveFertirriegoRequirementsImmediate({ force: true });
        console.log('⚡ targetYield guardado INMEDIATAMENTE');
      } else {
        scheduleSaveFertirriegoRequirements();
      }
      
      // 🚀 CRÍTICO: Desactivar la bandera después de un breve delay para permitir que se complete el cambio
      setTimeout(() => {
        userIsChangingValue = false;
      }, 1000);
      
      return;
    }
    
    // Cambios en ajuste o eficiencia: solo guardar (ya se actualiza el requerimiento real en updateAdjustment/updateEfficiency)
    // 🚀 CRÍTICO: Usar prefijo 'ferti-' para coincidir con los IDs creados por renderNutrientTable()
    if (id && (id.startsWith('ferti-extract-') || id.startsWith('ferti-adj-') || id.startsWith('ferti-eff-'))) {
      if (id.startsWith('ferti-adj-')) {
        savedFertiAdjustmentsAuto = false;
      }
      scheduleSaveFertirriegoRequirements();
    }
  });
  
  // Event listener para input (solo para rendimiento, con debounce)
  document.addEventListener('input', (e) => {
    if (isFertirriegoLoading) { return; }
    const id = e.target && e.target.id;
    
    if (id === 'fertirriegoTargetYield') {
      // 🚀 CRÍTICO: Marcar que el usuario está cambiando el valor
      userIsChangingValue = true;
      
      // Actualizar lastFertiTargetYield con el valor que el usuario está escribiendo
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        lastFertiTargetYield = newValue;
      }
      
      clearTimeout(window.fertirriegoRecalcTimer);
      window.fertirriegoRecalcTimer = setTimeout(() => {
        if (typeof window.calculateNutrientRequirements === 'function' && window.calculateNutrientRequirements._isRealFunction === true) {
          // Pasar el valor actual para que NO lo sobrescriba
          const currentValue = parseFloat(e.target.value);
          window.calculateNutrientRequirements({
            _isLoading: false,
            _userChanged: true,
            targetYield: currentValue
          });
        }
        // Desactivar la bandera después de recalcular
        setTimeout(() => {
          userIsChangingValue = false;
        }, 500);
      }, 500);
    }
    
    // Guardar en tiempo real mientras escribe (solo para inputs de tabla)
    // 🚀 CRÍTICO: Usar prefijo 'ferti-' para coincidir con los IDs creados por renderNutrientTable()
    if (id && (id.startsWith('ferti-extract-') || id.startsWith('ferti-adj-') || id.startsWith('ferti-eff-'))) {
      if (id.startsWith('ferti-adj-')) {
        savedFertiAdjustmentsAuto = false;
      }
      scheduleSaveFertirriegoRequirements();
    }
  });
  // Guardar al salir
  window.addEventListener('beforeunload', () => {
    try { flushFertirriegoRequirementsIfDirty(); } catch {}
  });
  // Guardar al perder visibilidad (cambiar de pestaña/ventana)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      try { flushFertirriegoRequirementsIfDirty(); } catch {}
    }
  });
  // Guardar al ocultar página (más confiable en móviles)
  window.addEventListener('pagehide', () => {
    try { flushFertirriegoRequirementsIfDirty(); } catch {}
  });
  // Guardar en pagehide (más confiable en móvil/iOS)
  window.addEventListener('pagehide', () => { try { flushFertirriegoRequirementsIfDirty(); } catch {} });
  // Guardar/cargar al cambiar de proyecto
  document.addEventListener('projectChanged', () => {
    // Evitar guardar con el ID del nuevo proyecto para no arrastrar datos previos.
  });
  
  // CRÍTICO: Si estamos en la pestaña de Fertirriego cuando se carga el script, cargar automáticamente
  setTimeout(() => {
    try {
      // Verificar si estamos en la sección de Fertirriego de múltiples formas
      const activeSectionLink = document.querySelector('.sidebar a.active');
      const isFertirriegoActive = activeSectionLink && (
        activeSectionLink.textContent?.trim() === 'Fertirriego' ||
        activeSectionLink.getAttribute('data-section') === 'Fertirriego' ||
        activeSectionLink.getAttribute('data-go') === 'Fertirriego'
      );
      
      // También verificar si los elementos de Fertirriego existen y son visibles
      const cropTypeEl = document.getElementById('fertirriegoCropType');
      const isFertirriegoVisible = cropTypeEl && cropTypeEl.offsetParent !== null;
      
      if (isFertirriegoActive || isFertirriegoVisible) {
        console.log('🔄 Script cargado tarde - detectada pestaña Fertirriego activa, cargando datos...');
        // Verificar que los elementos existan
        const targetYieldEl = document.getElementById('fertirriegoTargetYield');
        const tableContainer = document.getElementById('fertirriegoTableContainer');
        if (cropTypeEl && targetYieldEl) {
          // Asegurar que la sub-pestaña esté activa
          const extraccionTab = document.querySelector('.fertirriego-container .tab-button[data-tab="extraccion"]');
          const extraccionContent = document.getElementById('extraccion');
          if (extraccionTab && !extraccionTab.classList.contains('active')) {
            document.querySelectorAll('.fertirriego-container .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.fertirriego-container .tab-content').forEach(el => el.classList.remove('active'));
            extraccionTab.classList.add('active');
            if (extraccionContent) extraccionContent.classList.add('active');
          }
          
          // Intentar cargar primero, luego fallback a calcular
          if (typeof window.loadFertirriegoRequirements === 'function') {
            setTimeout(() => window.loadFertirriegoRequirements(), 100);
          } else if (typeof window.calculateNutrientRequirements === 'function') {
            // Fallback: al menos renderizar la tabla
            console.log('🔄 Fallback: Llamando calculateNutrientRequirements() directamente desde verificación automática...');
            setTimeout(() => window.calculateNutrientRequirements(), 200);
          }
        }
      }
    } catch (e) {
      console.error('❌ Error en verificación automática de Fertirriego:', e);
    }
  }, 500); // Esperar un poco para que el DOM esté listo
});

