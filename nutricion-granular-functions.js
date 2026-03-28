// =====================================================
// NUTRICIÓN GRANULAR - FUNCIONES SIMPLIFICADAS
// =====================================================

// Base de datos de materias primas (orden: N → P → K → Ca → Mg+K/Mg → S → micros → complejos; personalizados al final al cargar)
const MATERIALS_DB = {
  // Nitrogenados
  'Urea': { N: 46, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Fosfonitrato 33-03-00': { N: 33, P2O5: 3, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Sulfato de Amonio Granular': { N: 21, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 72, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  // Fosforados
  'DAP': { N: 18, P2O5: 46, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'MAP': { N: 11, P2O5: 52, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Superfosfato Simple': { N: 0, P2O5: 18, K2O: 0, CaO: 12, S: 0, SO4: 12, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Superfosfato Triple': { N: 0, P2O5: 45, K2O: 0, CaO: 13, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  // Potasio (SOP, Cloruro, Nitrato, Silicato)
  'Sulfato de Potasio': { N: 0, P2O5: 0, K2O: 50, CaO: 0, S: 0, SO4: 52, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Cloruro de Potasio': { N: 0, P2O5: 0, K2O: 60, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Nitrato de Potasio': { N: 13, P2O5: 0, K2O: 46, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Silicato de Potasio': { N: 0, P2O5: 0, K2O: 23, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 26, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  // Calcio
  'Nitrato de Calcio': { N: 15.5, P2O5: 0, K2O: 0, CaO: 26, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  // Magnesio (K+Mg, sulfato Mg)
  'Sulfato de K y Mg': { N: 0, P2O5: 0, K2O: 22, CaO: 0, S: 0, SO4: 68.91, MgO: 18, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Sulfato de Magnesio': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 40, MgO: 16, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  // Azufre
  'Azufre Granular': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 90, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  // Micros: Fe, Mn, Zn, B, Cu, Mo
  'Sulfato de Hierro': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 55, MgO: 0, SiO2: 0, Zn: 0, Fe: 20, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Sulfato de Manganeso': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 55, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 32, Cu: 0, Mo: 0 },
  'Sulfato de Zinc': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 52, MgO: 0, SiO2: 0, Zn: 36, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
  'Boro Granular': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 15, Mn: 0, Cu: 0, Mo: 0 },
  'Sulfato de Cobre': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 37, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 25, Mo: 0 },
  'Molibdato de Sodio': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 39 },
  'Micro Mix': { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 6.25, MgO: 4, SiO2: 0, Zn: 4, Fe: 8, B: 1, Mn: 1, Cu: 0, Mo: 0.06 },
  // Complejos NPK
  'Complejo 12-11-18': { N: 12, P2O5: 11, K2O: 18, CaO: 0, S: 0, SO4: 24, MgO: 2.7, SiO2: 0, Zn: 0.02, Fe: 0.2, B: 0.015, Mn: 0.02, Cu: 0, Mo: 0 },
  'Complejo 12-12-17': { N: 12, P2O5: 12, K2O: 17, CaO: 0, S: 0, SO4: 24, MgO: 2, SiO2: 0, Zn: 0.01, Fe: 0, B: 0.02, Mn: 0, Cu: 0, Mo: 0 },
  'Complejo Triple 16': { N: 16, P2O5: 16, K2O: 16, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 }
};

// Copia fija de materias primas precargadas (granular) para el modal de consulta (no se mezcla con personalizados)
const GRANULAR_BASE_MATERIALS = {};
Object.keys(MATERIALS_DB).forEach(name => {
  GRANULAR_BASE_MATERIALS[name] = { ...MATERIALS_DB[name] };
});

// Variables globales simples
let applications = [];
let appCounter = 1;

function isAutoGranularAppTitle(title) {
  return typeof title === 'string' && /^\d+\s*ª\s*Aplicación\s+Granular$/i.test(title.trim());
}

function normalizeGranularApplicationTitles() {
  if (!Array.isArray(applications)) {
    applications = [];
    appCounter = 1;
    return;
  }
  applications.forEach((app, idx) => {
    if (!app || typeof app !== 'object') return;
    const nextNumber = idx + 1;
    const nextTitle = `${nextNumber}ª Aplicación Granular`;
    if (!app.title || isAutoGranularAppTitle(app.title)) {
      app.title = nextTitle;
    }
    app.number = nextNumber;
  });
  appCounter = applications.length + 1;
}

function getCurrentUserId() {
  try {
    return localStorage.getItem('nutriplant_user_id');
  } catch {
    return null;
  }
}

function loadUserProfile() {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`nutriplant_user_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUserProfile(profile) {
  const userId = getCurrentUserId();
  if (!userId || !profile) return;
  try {
    localStorage.setItem(`nutriplant_user_${userId}`, JSON.stringify(profile));
    if (profile.customGranularMaterials && typeof profile.customGranularMaterials === 'object' && typeof window.nutriplantSyncCustomGranularMaterialsToCloud === 'function') {
      try { window.nutriplantSyncCustomGranularMaterialsToCloud(userId, profile.customGranularMaterials); } catch (e) { console.warn('Sync materiales granulares a nube:', e); }
    }
  } catch (e) {
    console.warn('saveUserProfile error', e);
  }
}

function getUserCustomMaterialsMap() {
  const profile = loadUserProfile();
  let custom = profile && profile.customGranularMaterials;
  if (custom && typeof custom === 'object' && Object.keys(custom).length > 0) return custom;
  // Sin sesión o perfil vacío: cargar desde fallback para que persistan tras reinicio
  try {
    const raw = localStorage.getItem('granularCustomMaterials_global_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return {};
}

function loadUserCustomMaterials() {
  const custom = getUserCustomMaterialsMap();
  Object.keys(custom).forEach(name => {
    if (!name) return;
    MATERIALS_DB[name] = { ...custom[name] };
  });
  // Si hay sesión y había datos en fallback, subirlos al perfil/nube y limpiar fallback
  const uid = getCurrentUserId();
  if (uid) {
    try {
      const raw = localStorage.getItem('granularCustomMaterials_global_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          Object.keys(parsed).forEach(name => {
            if (name && parsed[name]) saveUserCustomMaterial(name, parsed[name]);
          });
          localStorage.removeItem('granularCustomMaterials_global_user');
        }
      }
    } catch (e) {}
  }
}

/** Carga materiales granulares desde la nube (si hay) y los aplica; luego carga desde local. Retorna Promise. */
function ensureCustomGranularMaterialsLoaded() {
  const userId = getCurrentUserId();
  if (!userId) return Promise.resolve();
  if (typeof window.nutriplantFetchCustomGranularMaterialsFromCloud !== 'function') return Promise.resolve();
  return window.nutriplantFetchCustomGranularMaterialsFromCloud(userId).then(function(cloudData) {
    if (cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0) {
      var profile = loadUserProfile() || {};
      profile.customGranularMaterials = cloudData;
      try { localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile)); } catch (e) {}
      console.log('✅ Materiales granulares personalizados cargados desde la nube');
    }
  }).catch(function() {}).then(function() {
    loadUserCustomMaterials();
  });
}

function saveUserCustomMaterial(name, composition) {
  const userId = getCurrentUserId();
  if (userId) {
    const profile = loadUserProfile() || {};
    if (!profile.customGranularMaterials || typeof profile.customGranularMaterials !== 'object') {
      profile.customGranularMaterials = {};
    }
    profile.customGranularMaterials[name] = { ...composition };
    saveUserProfile(profile);
  } else {
    try {
      const raw = localStorage.getItem('granularCustomMaterials_global_user');
      const data = raw ? JSON.parse(raw) : {};
      if (typeof data !== 'object') return;
      data[name] = { ...composition };
      localStorage.setItem('granularCustomMaterials_global_user', JSON.stringify(data));
    } catch (e) {}
  }
}

function clearUserCustomMaterials() {
  if (!confirm('¿Eliminar todo el catálogo personal de materias primas?')) return;
  const userId = getCurrentUserId();
  const custom = getUserCustomMaterialsMap();
  Object.keys(custom).forEach(name => {
    if (MATERIALS_DB[name]) delete MATERIALS_DB[name];
  });
  if (userId) {
    const profile = loadUserProfile() || {};
    profile.customGranularMaterials = {};
    saveUserProfile(profile);
  } else {
    try {
      localStorage.setItem('granularCustomMaterials_global_user', JSON.stringify({}));
    } catch (e) {}
  }
  renderApplications();
  renderUserCustomMaterialsList();
  alert('✅ Catálogo personal limpiado');
}

function renderUserCustomMaterialsList() {
  const container = document.getElementById('customMaterialsList');
  if (!container) return;
  const custom = getUserCustomMaterialsMap();
  const names = Object.keys(custom);
  if (names.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;">Sin materias primas personalizadas.</div>';
    return;
  }
  container.innerHTML = names.map(name => {
    const encoded = encodeURIComponent(name);
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span>${name}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="openEditCustomMaterial('${encoded}')">Editar</button>
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="removeUserCustomMaterial('${encoded}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function removeUserCustomMaterial(encodedName) {
  const name = decodeURIComponent(encodedName || '');
  if (!name) return;
  if (!confirm(`¿Eliminar "${name}" del catálogo personal?`)) return;
  const userId = getCurrentUserId();
  if (userId) {
    const profile = loadUserProfile() || {};
    const custom = profile.customGranularMaterials || {};
    if (custom[name]) delete custom[name];
    profile.customGranularMaterials = custom;
    saveUserProfile(profile);
  } else {
    try {
      const raw = localStorage.getItem('granularCustomMaterials_global_user');
      const data = raw ? JSON.parse(raw) : {};
      if (data[name]) delete data[name];
      localStorage.setItem('granularCustomMaterials_global_user', JSON.stringify(data));
    } catch (e) {}
  }
  if (MATERIALS_DB[name]) delete MATERIALS_DB[name];
  applications.forEach(app => {
    app.materials.forEach(mat => {
      if (mat.name === name) mat.name = '';
    });
  });
  renderApplications();
  renderUserCustomMaterialsList();
}

function openEditCustomMaterial(encodedName) {
  const name = decodeURIComponent(encodedName || '');
  if (!name) return;
  const custom = getUserCustomMaterialsMap();
  if (!custom[name]) return;
  if (!document.querySelector('.material-modal-overlay')) {
    showNewMaterialModal('');
  }
  const modal = document.querySelector('.material-modal-overlay');
  if (!modal) return;
  const header = modal.querySelector('.material-modal-header h3');
  if (header) header.textContent = '✏️ Editar Materia Prima Personalizada';
  modal.dataset.editName = name;
  const saveBtn = modal.querySelector('#newMaterialSaveBtn');
  if (saveBtn) {
    saveBtn.textContent = 'Guardar cambios';
    saveBtn.setAttribute('onclick', 'saveEditedCustomMaterial()');
  }
  document.getElementById('newMaterialName').value = name;
  const comp = custom[name] || {};
  document.getElementById('newMaterialN').value = comp.N ?? 0;
  document.getElementById('newMaterialP2O5').value = comp.P2O5 ?? 0;
  document.getElementById('newMaterialK2O').value = comp.K2O ?? 0;
  document.getElementById('newMaterialCaO').value = comp.CaO ?? 0;
  document.getElementById('newMaterialMgO').value = comp.MgO ?? 0;
  document.getElementById('newMaterialS').value = comp.S ?? 0;
  document.getElementById('newMaterialSO4').value = comp.SO4 ?? 0;
  document.getElementById('newMaterialFe').value = comp.Fe ?? 0;
  document.getElementById('newMaterialMn').value = comp.Mn ?? 0;
  document.getElementById('newMaterialB').value = comp.B ?? 0;
  document.getElementById('newMaterialZn').value = comp.Zn ?? 0;
  document.getElementById('newMaterialCu').value = comp.Cu ?? 0;
  document.getElementById('newMaterialMo').value = comp.Mo ?? 0;
  document.getElementById('newMaterialSiO2').value = comp.SiO2 ?? 0;
}

function saveEditedCustomMaterial() {
  const modal = document.querySelector('.material-modal-overlay');
  if (!modal) return;
  const originalName = modal.dataset.editName || '';
  if (!originalName) return;
  const name = document.getElementById('newMaterialName').value.trim();
  if (!name) {
    alert('⚠️ Por favor ingresa el nombre de la materia prima');
    return;
  }
  const composition = {
    N: parseFloat(document.getElementById('newMaterialN').value) || 0,
    P2O5: parseFloat(document.getElementById('newMaterialP2O5').value) || 0,
    K2O: parseFloat(document.getElementById('newMaterialK2O').value) || 0,
    CaO: parseFloat(document.getElementById('newMaterialCaO').value) || 0,
    S: parseFloat(document.getElementById('newMaterialS').value) || 0,
    SO4: parseFloat(document.getElementById('newMaterialSO4').value) || 0,
    MgO: parseFloat(document.getElementById('newMaterialMgO').value) || 0,
    SiO2: parseFloat(document.getElementById('newMaterialSiO2').value) || 0,
    Zn: parseFloat(document.getElementById('newMaterialZn').value) || 0,
    Fe: parseFloat(document.getElementById('newMaterialFe').value) || 0,
    B: parseFloat(document.getElementById('newMaterialB').value) || 0,
    Mn: parseFloat(document.getElementById('newMaterialMn').value) || 0,
    Cu: parseFloat(document.getElementById('newMaterialCu').value) || 0,
    Mo: parseFloat(document.getElementById('newMaterialMo').value) || 0
  };
  const userId = getCurrentUserId();
  if (userId) {
    const profile = loadUserProfile() || {};
    if (!profile.customGranularMaterials || typeof profile.customGranularMaterials !== 'object') {
      profile.customGranularMaterials = {};
    }
    if (originalName !== name && profile.customGranularMaterials[originalName]) {
      delete profile.customGranularMaterials[originalName];
      if (MATERIALS_DB[originalName]) delete MATERIALS_DB[originalName];
      applications.forEach(app => {
        app.materials.forEach(mat => {
          if (mat.name === originalName) mat.name = name;
        });
      });
    }
    profile.customGranularMaterials[name] = { ...composition };
    saveUserProfile(profile);
  } else {
    try {
      const raw = localStorage.getItem('granularCustomMaterials_global_user');
      const data = raw ? JSON.parse(raw) : {};
      if (typeof data !== 'object') return;
      if (originalName !== name && data[originalName]) {
        delete data[originalName];
        if (MATERIALS_DB[originalName]) delete MATERIALS_DB[originalName];
        applications.forEach(app => {
          app.materials.forEach(mat => {
            if (mat.name === originalName) mat.name = name;
          });
        });
      }
      data[name] = { ...composition };
      localStorage.setItem('granularCustomMaterials_global_user', JSON.stringify(data));
    } catch (e) {}
  }
  MATERIALS_DB[name] = composition;
  renderApplications();
  renderUserCustomMaterialsList();
  closeNewMaterialModal();
  alert(`✅ Materia prima "${name}" actualizada`);
}

function getProgramNutrientLabel(nutrient) {
  const oxideLabels = {
    P2O5: 'P₂O₅',
    K2O: 'K₂O',
    CaO: 'CaO',
    MgO: 'MgO',
    SO4: 'SO₄',
    SiO2: 'SiO₂'
  };
  const elementalLabels = {
    P2O5: 'P',
    K2O: 'K',
    CaO: 'Ca',
    MgO: 'Mg',
    SO4: 'SO₄',
    SiO2: 'Si'
  };
  if (isElementalMode) {
    return elementalLabels[nutrient] || nutrient;
  }
  return oxideLabels[nutrient] || nutrient;
}

function formatProgramValue(nutrient, value, decimals) {
  let v = parseFloat(value);
  if (isNaN(v)) v = 0;
  if (isElementalMode) {
    switch (nutrient) {
      case 'P2O5': v = convertOxideToElemental(v, CONVERSION_FACTORS.P2O5_TO_P); break;
      case 'K2O': v = convertOxideToElemental(v, CONVERSION_FACTORS.K2O_TO_K); break;
      case 'CaO': v = convertOxideToElemental(v, CONVERSION_FACTORS.CaO_TO_Ca); break;
      case 'MgO': v = convertOxideToElemental(v, CONVERSION_FACTORS.MgO_TO_Mg); break;
      case 'SiO2': v = convertOxideToElemental(v, CONVERSION_FACTORS.SiO2_TO_Si); break;
      default: break;
    }
  }
  return v.toFixed(decimals);
}

// Función principal para agregar aplicación
function addGranularApplication() {
  try {
    console.log('🌱 Agregando nueva aplicación granular...');
    
    const appId = 'app_' + Date.now();
    const nextNumber = applications.length + 1;
    const newApp = {
      id: appId,
      number: nextNumber,
      title: `${nextNumber}ª Aplicación Granular`,
      materials: [],
      doseKgHa: 0,
      composition: { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 },
      results: { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 }
    };
    
    applications.push(newApp);
    normalizeGranularApplicationTitles();
    renderApplications();
    updateSummary();
    
    console.log('✅ Aplicación agregada exitosamente');
  } catch (error) {
    console.error('❌ Error agregando aplicación:', error);
  }
}

// Función para renderizar aplicaciones
function renderApplications() {
  try {
    normalizeGranularApplicationTitles();
    const container = document.getElementById('granularApplications');
    if (!container) {
      console.log('⚠️ Container granularApplications no encontrado');
      return;
    }
    
    container.innerHTML = applications.map(app => `
      <div class="granular-application" id="${app.id}">
        <div class="application-header">
          <div>
            <input type="text" class="application-title" value="${app.title}" data-app-id="${app.id}"
                   oninput="updateAppTitleLive('${app.id}', this.value)" onchange="updateAppTitle('${app.id}', this.value)">
            <div class="application-npk">
              Relación NPK: <span id="npk_${app.id}">-:-:-</span>
            </div>
          </div>
          <button class="remove-application-btn" onclick="removeApp('${app.id}')">
            🗑️ Eliminar
          </button>
        </div>
        
        <table class="materials-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>% por TM</th>
              <th class="notranslate" translate="no">N</th>
              <th class="notranslate" translate="no">${getProgramNutrientLabel('P2O5')}</th>
              <th class="notranslate" translate="no">${getProgramNutrientLabel('K2O')}</th>
              <th class="notranslate" translate="no">${getProgramNutrientLabel('CaO')}</th>
              <th class="notranslate" translate="no">${getProgramNutrientLabel('MgO')}</th>
              <th class="notranslate" translate="no">S</th>
              <th class="notranslate" translate="no">${getProgramNutrientLabel('SO4')}</th>
              <th class="notranslate" translate="no">Fe</th>
              <th class="notranslate" translate="no">Mn</th>
              <th class="notranslate" translate="no">B</th>
              <th class="notranslate" translate="no">Zn</th>
              <th class="notranslate" translate="no">Cu</th>
              <th class="notranslate" translate="no">Mo</th>
              <th class="notranslate" translate="no">${getProgramNutrientLabel('SiO2')}</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="materials_${app.id}">
            ${renderMaterials(app)}
          </tbody>
        </table>
        
        <div class="add-material-buttons">
          <button class="add-material-btn" onclick="addMaterial('${app.id}')">
            ➕ Agregar fertilizante
          </button>
          <button class="add-custom-material-btn btn btn-info btn-sm" onclick="showNewMaterialModal('${app.id}')">
            📋 Gestionar catálogo de fertilizante
          </button>
        </div>
        
        <div class="dose-section">
          <div class="dose-input-group">
            <label class="dose-label">Dosis Kg/Ha:</label>
            <input type="number" class="dose-input" value="${app.doseKgHa}" data-app-id="${app.id}"
                   oninput="updateDoseLive('${app.id}', this.value)" onchange="updateDose('${app.id}', this.value)">
          </div>
        </div>
      </div>
    `).join('');
    
    console.log('✅ Aplicaciones renderizadas');
    
    // Actualizar NPK para cada aplicación después de renderizar
    applications.forEach(app => {
      setTimeout(() => {
        updateNPK(app.id);
      }, 100);
    });
  } catch (error) {
    console.error('❌ Error renderizando aplicaciones:', error);
  }
}

// Función para renderizar materiales
function renderMaterials(app) {
  if (!app.materials || app.materials.length === 0) {
    return '<tr><td colspan="17" style="text-align: center; color: #6b7280;">No hay materias primas</td></tr>';
  }
  
  const rows = app.materials.map((material, index) => `
    <tr>
      <td class="material-name">
        <select class="material-select" onchange="updateMaterial('${app.id}', ${index}, this.value)">
          <option value="">Seleccionar...</option>
          ${Object.keys(MATERIALS_DB).map(name => `
            <option value="${name}" ${material.name === name ? 'selected' : ''}>${name}</option>
          `).join('')}
        </select>
      </td>
      <td><input type="number" class="material-input" value="${material.percentage || 0}" data-app-id="${app.id}" data-material-index="${index}"
                 oninput="updateMaterialPercentageLive('${app.id}', ${index}, this.value)" onchange="updateMaterialPercentage('${app.id}', ${index}, this.value)"></td>
      <td>${formatProgramValue('N', material.N, 2)}</td>
      <td>${formatProgramValue('P2O5', material.P2O5, 2)}</td>
      <td>${formatProgramValue('K2O', material.K2O, 2)}</td>
      <td>${formatProgramValue('CaO', material.CaO, 2)}</td>
      <td>${formatProgramValue('MgO', material.MgO, 2)}</td>
      <td>${formatProgramValue('S', material.S, 2)}</td>
      <td>${formatProgramValue('SO4', material.SO4, 2)}</td>
      <td>${formatProgramValue('Fe', material.Fe, 3)}</td>
      <td>${formatProgramValue('Mn', material.Mn, 3)}</td>
      <td>${formatProgramValue('B', material.B, 3)}</td>
      <td>${formatProgramValue('Zn', material.Zn, 3)}</td>
      <td>${formatProgramValue('Cu', material.Cu, 3)}</td>
      <td>${formatProgramValue('Mo', material.Mo, 3)}</td>
      <td>${formatProgramValue('SiO2', material.SiO2, 2)}</td>
      <td><button class="remove-application-btn" onclick="removeMaterial('${app.id}', ${index})" 
                  style="padding: 4px 8px; font-size: 0.7rem;">🗑️</button></td>
    </tr>
  `).join('');
  
  // Fila de totales
  const totals = calculateTotals(app);
  const totalRow = `
    <tr class="total-row">
      <td class="material-name">TOTAL</td>
      <td>${app.materials.reduce((sum, m) => sum + (parseFloat(m.percentage) || 0), 0).toFixed(2)}%</td>
      <td>${formatProgramValue('N', totals.N, 2)}</td>
      <td>${formatProgramValue('P2O5', totals.P2O5, 2)}</td>
      <td>${formatProgramValue('K2O', totals.K2O, 2)}</td>
      <td>${formatProgramValue('CaO', totals.CaO, 2)}</td>
      <td>${formatProgramValue('MgO', totals.MgO, 2)}</td>
      <td>${formatProgramValue('S', totals.S, 2)}</td>
      <td>${formatProgramValue('SO4', totals.SO4, 2)}</td>
      <td>${formatProgramValue('Fe', totals.Fe, 3)}</td>
      <td>${formatProgramValue('Mn', totals.Mn, 3)}</td>
      <td>${formatProgramValue('B', totals.B, 3)}</td>
      <td>${formatProgramValue('Zn', totals.Zn, 3)}</td>
      <td>${formatProgramValue('Cu', totals.Cu, 3)}</td>
      <td>${formatProgramValue('Mo', totals.Mo, 3)}</td>
      <td>${formatProgramValue('SiO2', totals.SiO2, 2)}</td>
      <td></td>
    </tr>
  `;
  
  return rows + totalRow;
}

// Función para agregar material
function addMaterial(appId) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    const newMaterial = {
      name: '',
      percentage: 0,
      N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0
    };
    
    app.materials.push(newMaterial);
    renderApplications();
  } catch (error) {
    console.error('❌ Error agregando material:', error);
  }
}

// Función para mostrar modal de nueva materia prima
function showNewMaterialModal(appId) {
  const modal = document.createElement('div');
  modal.className = 'material-modal-overlay';
  modal.innerHTML = `
    <div class="material-modal">
      <div class="material-modal-header">
        <h3>📋 Gestionar catálogo de fertilizante</h3>
        <button class="material-modal-close" onclick="closeNewMaterialModal()">×</button>
      </div>
      
      <div class="material-modal-body">
        <div class="form-group">
          <label>Nombre de la Materia Prima:</label>
          <input type="text" id="newMaterialName" placeholder="Ej: Superfosfato Triple" maxlength="50">
        </div>
        
        <div class="form-group">
          <label>Concentración de Nutrientes (%):</label>
          <div class="nutrient-inputs-grid">
            <div class="nutrient-input">
              <label>N:</label>
              <input type="number" id="newMaterialN" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
            <div class="nutrient-input">
              <label>P₂O₅:</label>
              <input type="number" id="newMaterialP2O5" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
            <div class="nutrient-input">
              <label>K₂O:</label>
              <input type="number" id="newMaterialK2O" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
            <div class="nutrient-input">
              <label>CaO:</label>
              <input type="number" id="newMaterialCaO" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
            <div class="nutrient-input">
              <label>MgO:</label>
              <input type="number" id="newMaterialMgO" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
            <div class="nutrient-input">
              <label>S:</label>
              <input type="number" id="newMaterialS" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
            <div class="nutrient-input">
              <label>SO₄:</label>
              <input type="number" id="newMaterialSO4" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
            <div class="nutrient-input">
              <label>Fe:</label>
              <input type="number" id="newMaterialFe" min="0" max="100" step="0.001" placeholder="0.000">
            </div>
            <div class="nutrient-input">
              <label>Mn:</label>
              <input type="number" id="newMaterialMn" min="0" max="100" step="0.001" placeholder="0.000">
            </div>
            <div class="nutrient-input">
              <label>B:</label>
              <input type="number" id="newMaterialB" min="0" max="100" step="0.001" placeholder="0.000">
            </div>
            <div class="nutrient-input">
              <label>Zn:</label>
              <input type="number" id="newMaterialZn" min="0" max="100" step="0.001" placeholder="0.000">
            </div>
            <div class="nutrient-input">
              <label>Cu:</label>
              <input type="number" id="newMaterialCu" min="0" max="100" step="0.001" placeholder="0.000">
            </div>
            <div class="nutrient-input">
              <label>Mo:</label>
              <input type="number" id="newMaterialMo" min="0" max="100" step="0.001" placeholder="0.000">
            </div>
            <div class="nutrient-input">
              <label>SiO₂:</label>
              <input type="number" id="newMaterialSiO2" min="0" max="100" step="0.01" placeholder="0.00">
            </div>
          </div>
        </div>
        
        <div class="form-group" style="margin-top: 12px;">
          <label>Fertilizantes granular personalizados:</label>
          <div id="customMaterialsList"></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
            <button class="btn btn-info btn-sm" onclick="openGranularPreloadedCatalogModal()" title="Consultar concentraciones de fertilizantes precargados">📋 Ver fertilizantes disponibles</button>
            <button class="btn btn-secondary btn-sm" onclick="clearUserCustomMaterials()">🧹 Limpiar catálogo</button>
          </div>
        </div>
        
        <div class="material-modal-actions">
          <button class="btn btn-secondary" onclick="closeNewMaterialModal()">Cancelar</button>
          <button class="btn btn-primary" id="newMaterialSaveBtn" data-app-id="${appId}" onclick="addCustomMaterial('${appId}')">Agregar fertilizante</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.dataset.editName = '';
  
  // Enfocar el primer input
  setTimeout(() => {
    document.getElementById('newMaterialName').focus();
  }, 100);
  
  renderUserCustomMaterialsList();
}

// Función para cerrar modal de nueva materia prima
function closeNewMaterialModal() {
  const modal = document.querySelector('.material-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

/** Modal de consulta: materias primas precargadas de Nutrición Granular (concentración %) */
const GRANULAR_CATALOG_COLS = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
function granularCatalogColLabel(key) {
  const labels = { N: 'N', P2O5: 'P₂O₅', K2O: 'K₂O', CaO: 'CaO', MgO: 'MgO', S: 'S', SO4: 'SO₄', Fe: 'Fe', Mn: 'Mn', B: 'B', Zn: 'Zn', Cu: 'Cu', Mo: 'Mo', SiO2: 'SiO₂' };
  return labels[key] || key;
}
function getBaseGranularMaterials() {
  return Object.keys(GRANULAR_BASE_MATERIALS).map(name => ({ name, ...GRANULAR_BASE_MATERIALS[name] }));
}
function openGranularPreloadedCatalogModal() {
  const list = getBaseGranularMaterials();
  const rows = list.map(mat => {
    const cells = [
      (mat.name || '').replace(/</g, '&lt;'),
      ...GRANULAR_CATALOG_COLS.map(k => (parseFloat(mat[k]) || 0).toFixed(2))
    ];
    return `<tr style="border-bottom:1px solid #e5e7eb;">${cells.map((c, i) => `<td style="padding:6px 10px;${i === 0 ? 'font-weight:600;' : 'text-align:right;'}">${c}</td>`).join('')}</tr>`;
  }).join('');
  const overlay = document.createElement('div');
  overlay.className = 'material-modal-overlay granular-preloaded-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
  overlay.innerHTML = `
    <div class="material-modal" style="max-width:95%;width:920px;max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div class="modal-header" style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:1.1rem;color:#1e293b;">📋 Fertilizantes disponibles (concentración %)</h3>
        <button class="btn btn-secondary btn-sm" type="button" data-close-granular-preloaded>✕</button>
      </div>
      <div style="padding:14px 18px;overflow:auto;flex:1;">
        <p style="margin:0 0 12px 0;font-size:0.9rem;color:#64748b;">Consulta de concentraciones de los fertilizantes precargados. Valores en % (óxidos donde aplica).</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">Nombre</th>
                ${GRANULAR_CATALOG_COLS.map(k => `<th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e2e8f0;">${granularCatalogColLabel(k)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="' + (1 + GRANULAR_CATALOG_COLS.length) + '" style="padding:12px;color:#64748b;">Sin fertilizantes precargados.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  overlay.querySelector('[data-close-granular-preloaded]').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// Función para agregar materia prima personalizada
function addCustomMaterial(appId) {
  try {
    const name = document.getElementById('newMaterialName').value.trim();
    if (!name) {
      alert('⚠️ Por favor ingresa el nombre de la materia prima');
      return;
    }
    
    // Obtener valores de concentración
    const composition = {
      N: parseFloat(document.getElementById('newMaterialN').value) || 0,
      P2O5: parseFloat(document.getElementById('newMaterialP2O5').value) || 0,
      K2O: parseFloat(document.getElementById('newMaterialK2O').value) || 0,
      CaO: parseFloat(document.getElementById('newMaterialCaO').value) || 0,
      S: parseFloat(document.getElementById('newMaterialS').value) || 0,
      SO4: parseFloat(document.getElementById('newMaterialSO4').value) || 0,
      MgO: parseFloat(document.getElementById('newMaterialMgO').value) || 0,
      SiO2: parseFloat(document.getElementById('newMaterialSiO2').value) || 0,
      Zn: parseFloat(document.getElementById('newMaterialZn').value) || 0,
      Fe: parseFloat(document.getElementById('newMaterialFe').value) || 0,
      B: parseFloat(document.getElementById('newMaterialB').value) || 0,
      Mn: parseFloat(document.getElementById('newMaterialMn').value) || 0,
      Cu: parseFloat(document.getElementById('newMaterialCu').value) || 0,
      Mo: parseFloat(document.getElementById('newMaterialMo').value) || 0
    };
    
    // Agregar a la base de datos de materias primas
    MATERIALS_DB[name] = composition;
    saveUserCustomMaterial(name, composition);
    
    console.log('✅ Nueva materia prima agregada:', name, composition);
    
    // Cerrar modal
    closeNewMaterialModal();
    
    // Agregar la nueva materia prima a la aplicación actual
    const app = applications.find(a => a.id === appId);
    if (app) {
      const newMaterial = {
        name: name,
        percentage: 0,
        N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, 
        MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, 
        Cu: 0, Mo: 0
      };
      
      app.materials.push(newMaterial);
    }
    
    // Actualizar el dropdown para mostrar la nueva opción
    renderApplications();
    renderUserCustomMaterialsList();
    
    alert(`✅ Materia prima "${name}" agregada exitosamente`);
    
  } catch (error) {
    console.error('❌ Error agregando materia prima personalizada:', error);
    alert('❌ Error al agregar la materia prima. Revisa la consola para más detalles.');
  }
}

// Función para actualizar material
function updateMaterial(appId, materialIndex, materialName) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    const material = app.materials[materialIndex];
    if (!material) return;
    
    material.name = materialName;
    
    if (materialName && MATERIALS_DB[materialName]) {
      const composition = MATERIALS_DB[materialName];
      const percentage = parseFloat(material.percentage) || 0;
      
      Object.keys(composition).forEach(nutrient => {
        material[nutrient] = (composition[nutrient] * percentage) / 100;
      });
    }
    
    calculateAppTotals(appId);
    renderApplications();
    updateSummary();
  } catch (error) {
    console.error('❌ Error actualizando material:', error);
  }
}

// Función para actualizar porcentaje
function updateMaterialPercentage(appId, materialIndex, percentage) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    const material = app.materials[materialIndex];
    if (!material) return;
    
    material.percentage = parseFloat(percentage) || 0;
    
    if (material.name && MATERIALS_DB[material.name]) {
      const composition = MATERIALS_DB[material.name];
      
      Object.keys(composition).forEach(nutrient => {
        material[nutrient] = (composition[nutrient] * material.percentage) / 100;
      });
    }
    
    calculateAppTotals(appId);
    renderApplications();
    updateSummary();
  } catch (error) {
    console.error('❌ Error actualizando porcentaje:', error);
  }
}

function updateMaterialPercentageLive(appId, materialIndex, percentage) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    const material = app.materials[materialIndex];
    if (!material) return;
    material.percentage = parseFloat(percentage) || 0;
    if (material.name && MATERIALS_DB[material.name]) {
      const composition = MATERIALS_DB[material.name];
      Object.keys(composition).forEach(nutrient => {
        material[nutrient] = (composition[nutrient] * material.percentage) / 100;
      });
    }
    calculateAppTotals(appId);
  } catch (error) {
    console.error('❌ Error actualizando porcentaje (live):', error);
  }
}

function syncGranularProgramFromDOM() {
  const container = document.getElementById('granularApplications');
  if (!container) return;
  const doseInputs = container.querySelectorAll('input.dose-input[data-app-id]');
  doseInputs.forEach(input => {
    const appId = input.getAttribute('data-app-id');
    if (!appId) return;
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    app.doseKgHa = parseFloat(input.value) || 0;
  });
  const titleInputs = container.querySelectorAll('input.application-title[data-app-id]');
  titleInputs.forEach(input => {
    const appId = input.getAttribute('data-app-id');
    if (!appId) return;
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    app.title = input.value || '';
  });
  const percentageInputs = container.querySelectorAll('input.material-input[data-app-id][data-material-index]');
  percentageInputs.forEach(input => {
    const appId = input.getAttribute('data-app-id');
    const idx = parseInt(input.getAttribute('data-material-index'), 10);
    if (!appId || Number.isNaN(idx)) return;
    const app = applications.find(a => a.id === appId);
    if (!app || !app.materials || !app.materials[idx]) return;
    const material = app.materials[idx];
    material.percentage = parseFloat(input.value) || 0;
    if (material.name && MATERIALS_DB[material.name]) {
      const composition = MATERIALS_DB[material.name];
      Object.keys(composition).forEach(nutrient => {
        material[nutrient] = (composition[nutrient] * material.percentage) / 100;
      });
    }
  });
  applications.forEach(app => calculateAppTotals(app.id));
}

// Función para eliminar material
function removeMaterial(appId, materialIndex) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    app.materials.splice(materialIndex, 1);
    calculateAppTotals(appId);
    renderApplications();
    updateSummary();
  } catch (error) {
    console.error('❌ Error eliminando material:', error);
  }
}

// Función para calcular totales
function calculateTotals(app) {
  const totals = { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 };
  
  app.materials.forEach(material => {
    Object.keys(totals).forEach(nutrient => {
      totals[nutrient] += material[nutrient] || 0;
    });
  });
  
  app.composition = totals;
  return totals;
}

// Función para calcular totales de aplicación
function calculateAppTotals(appId) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    calculateTotals(app);
    
    const doseKgHa = parseFloat(app.doseKgHa) || 0;
    
    Object.keys(app.composition).forEach(nutrient => {
      app.results[nutrient] = (app.composition[nutrient] * doseKgHa) / 100;
    });
    
    updateNPK(appId);
    updateSummary(); // Actualizar el resumen cuando cambien los totales
  } catch (error) {
    console.error('❌ Error calculando totales:', error);
  }
}

// Función para actualizar NPK
function updateNPK(appId) {
  try {
    console.log('🔄 Actualizando NPK para aplicación:', appId);
    
    const app = applications.find(a => a.id === appId);
    if (!app) {
      console.log('❌ Aplicación no encontrada:', appId);
      return;
    }
    
    const totals = app.composition;
    const N = totals.N || 0;
    const P = totals.P2O5 || 0;
    const K = totals.K2O || 0;
    
    console.log('📊 Valores NPK:', { N, P, K });
    
    if (N === 0 && P === 0 && K === 0) {
      console.log('⚠️ Todos los valores NPK son 0');
      const npkElement = document.getElementById(`npk_${appId}`);
      if (npkElement) {
        npkElement.textContent = '-:-:-';
        console.log('✅ NPK actualizado a -:-:-');
      } else {
        console.log('❌ Elemento NPK no encontrado:', `npk_${appId}`);
      }
      return;
    }
    
    // Encontrar el menor valor entre N, P, K para usarlo como base 1
    // PERO solo considerar valores diferentes de 0
    const nonZeroValues = [];
    if (N > 0) nonZeroValues.push(N);
    if (P > 0) nonZeroValues.push(P);
    if (K > 0) nonZeroValues.push(K);
    
    let minValue = 0;
    if (nonZeroValues.length > 0) {
      minValue = Math.min(...nonZeroValues);
    }
    
    console.log('📊 Valores diferentes de 0:', nonZeroValues);
    console.log('📊 Valor mínimo (base):', minValue);
    
    // Calcular la relación NPK usando el menor valor como base 1
    const ratio = {
      N: minValue > 0 ? (N / minValue).toFixed(1) : N.toFixed(1),
      P: minValue > 0 ? (P / minValue).toFixed(1) : P.toFixed(1),
      K: minValue > 0 ? (K / minValue).toFixed(1) : K.toFixed(1)
    };
    
    const npkString = `${ratio.N}-${ratio.P}-${ratio.K}`;
    console.log('📊 Relación NPK calculada:', npkString);
    
    const npkElement = document.getElementById(`npk_${appId}`);
    if (npkElement) {
      npkElement.textContent = npkString;
      console.log('✅ NPK actualizado exitosamente:', npkString);
    } else {
      console.log('❌ Elemento NPK no encontrado en DOM:', `npk_${appId}`);
      // Intentar encontrar el elemento de otra manera
      const allNpkElements = document.querySelectorAll('[id*="npk_"]');
      console.log('🔍 Elementos NPK encontrados:', allNpkElements);
    }
  } catch (error) {
    console.error('❌ Error actualizando NPK:', error);
  }
}

// Función para actualizar dosis
function updateDose(appId, dose) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    app.doseKgHa = parseFloat(dose) || 0;
    calculateAppTotals(appId); // Esto ya llama a updateSummary()
    renderApplications();
  } catch (error) {
    console.error('❌ Error actualizando dosis:', error);
  }
}

function updateDoseLive(appId, dose) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    app.doseKgHa = parseFloat(dose) || 0;
    calculateAppTotals(appId);
  } catch (error) {
    console.error('❌ Error actualizando dosis (live):', error);
  }
}

// Función para actualizar título
function updateAppTitle(appId, title) {
  try {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    app.title = title;
  } catch (error) {
    console.error('❌ Error actualizando título:', error);
  }
}

function updateAppTitleLive(appId, title) {
  updateAppTitle(appId, title);
}

// Función para eliminar aplicación
function removeApp(appId) {
  try {
    const index = applications.findIndex(a => a.id === appId);
    if (index === -1) return;
    
    if (confirm('¿Estás seguro de eliminar esta aplicación?')) {
      applications.splice(index, 1);
      renderApplications();
      updateSummary();
    }
  } catch (error) {
    console.error('❌ Error eliminando aplicación:', error);
  }
}

// Variable global para el modo de visualización (óxido/elemental)
let isElementalMode = false;
let granularProgramModeInitialized = false;

function syncGranularProgramMode(reqData) {
  // Inicializar SOLO una vez con el modo de Requerimientos.
  if (granularProgramModeInitialized) {
    return;
  }
  if (typeof window !== 'undefined' && typeof window.isGranularRequerimientoElementalMode === 'boolean') {
    isElementalMode = window.isGranularRequerimientoElementalMode;
  } else if (reqData && typeof reqData.isElementalMode === 'boolean') {
    isElementalMode = reqData.isElementalMode;
  }
  granularProgramModeInitialized = true;
}

function saveProgramMode() {
  try {
    const projectId = getCurrentProjectId();
    if (!projectId) return;
    if (typeof window.projectStorage !== 'undefined') {
      const existingSection = window.projectStorage.loadSection('granular', projectId) || {};
      const program = {
        ...(existingSection.program || {}),
        mode: isElementalMode
      };
      window.projectStorage.saveSection('granular', { ...existingSection, program }, projectId);
    }
    const key = `nutriplant_project_${projectId}`;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    obj.granular = obj.granular || {};
    obj.granular.program = obj.granular.program || {};
    obj.granular.program.mode = isElementalMode;
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {
    console.warn('saveProgramMode error', e);
  }
}

// Función para alternar entre óxido y elemental
function toggleOxideElemental() {
  isElementalMode = !isElementalMode;
  const btn = document.getElementById('toggleOxideElementalBtn');
  if (btn) {
    btn.textContent = isElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental';
  }
  
  // Actualizar todos los valores visibles
  renderApplications();
  updateSummary({ _skipModeSync: true });
  granularProgramModeInitialized = true;
  saveProgramMode();
  if (typeof window.saveGranularRequirementsImmediate === 'function') {
    window.saveGranularRequirementsImmediate();
  }
}

// Función para convertir óxido a elemental
function convertOxideToElemental(oxideValue, conversionFactor) {
  return oxideValue / conversionFactor;
}

// Función para convertir elemental a óxido
function convertElementalToOxide(elementalValue, conversionFactor) {
  return elementalValue * conversionFactor;
}

// Factores de conversión
const CONVERSION_FACTORS = {
  P2O5_TO_P: 2.291,  // P₂O₅ → P
  P_TO_P2O5: 2.291,  // P → P₂O₅
  K2O_TO_K: 1.204,   // K₂O → K
  K_TO_K2O: 1.204,   // K → K₂O
  CaO_TO_Ca: 1.399,  // CaO → Ca
  Ca_TO_CaO: 1.399,  // Ca → CaO
  MgO_TO_Mg: 1.658,  // MgO → Mg
  Mg_TO_MgO: 1.658,  // Mg → MgO
  SiO2_TO_Si: 2.139, // SiO₂ → Si
  Si_TO_SiO2: 2.139  // Si → SiO₂
};

// Función para formatear números con comas
function formatNumberWithCommas(number) {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  const num = parseFloat(number);
  if (num >= 1000) {
    return num.toLocaleString('en-US');
  }
  
  return num.toFixed(2);
}

// Función para actualizar resumen
function updateSummary(options = {}) {
  try {
    console.log('🔄 Actualizando resumen...', applications.length, 'aplicaciones');
    
    // Actualizar número de aplicaciones
    const totalAppsElement = document.getElementById('totalApplications');
    if (totalAppsElement) {
      totalAppsElement.textContent = applications.length;
    }

    const btn = document.getElementById('toggleOxideElementalBtn');
    if (btn) {
      btn.textContent = isElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental';
    }
    
    // Calcular dosis total
    const totalDose = applications.reduce((sum, app) => sum + (parseFloat(app.doseKgHa) || 0), 0);
    const totalDoseElement = document.getElementById('totalDoseKgHa');
    if (totalDoseElement) {
      totalDoseElement.textContent = formatNumberWithCommas(totalDose);
    }
    
    // Calcular totales de nutrientes REALES (Kg/Ha) de todas las aplicaciones
    const totals = { N: 0, P2O5: 0, K2O: 0, CaO: 0, S: 0, SO4: 0, MgO: 0, SiO2: 0, Zn: 0, Fe: 0, B: 0, Mn: 0, Cu: 0, Mo: 0 };
    
    applications.forEach(app => {
      console.log(`📊 Aplicación ${app.title}:`, app.results);
      Object.keys(totals).forEach(nutrient => {
        totals[nutrient] += app.results[nutrient] || 0;
      });
    });
    
    console.log('📈 Totales calculados:', totals);
    
    // Cargar requerimientos guardados y calcular Requerimiento Real por nutriente (en ÓXIDO internamente)
    const projectId = getCurrentProjectId();
    let reqData = null;
    if (typeof window.projectManager !== 'undefined' && window.projectManager.loadProjectData) {
      reqData = window.projectManager.loadProjectData('granularRequirements');
    }
    if (!reqData && projectId) {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const key = `nutriplant_project_${projectId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const pd = JSON.parse(raw);
        if (pd.granularRequirements) reqData = pd.granularRequirements;
      }
    }
    if (!options._skipModeSync) {
      syncGranularProgramMode(reqData);
    }

    const nutrientsList = Object.keys(totals);
    const reqModeIsElemental = typeof window !== 'undefined' && window.isGranularRequerimientoElementalMode === true;
    const reqOxide = {};
    // Intentar leer requerimiento en vivo desde la tabla de requerimiento granular
    let hasLiveReq = false;
    nutrientsList.forEach(n => {
      const liveEl = document.getElementById(`granular-req-${n}`);
      if (liveEl && liveEl.textContent != null) {
        let v = parseFloat((liveEl.textContent || '').toString().replace(/,/g,'').trim());
        if (!isNaN(v)) {
          if (reqModeIsElemental) {
            switch(n) {
              case 'P2O5': v = convertElementalToOxide(v, CONVERSION_FACTORS.P_TO_P2O5); break;
              case 'K2O': v = convertElementalToOxide(v, CONVERSION_FACTORS.K_TO_K2O); break;
              case 'CaO': v = convertElementalToOxide(v, CONVERSION_FACTORS.Ca_TO_CaO); break;
              case 'MgO': v = convertElementalToOxide(v, CONVERSION_FACTORS.Mg_TO_MgO); break;
              case 'SiO2': v = convertElementalToOxide(v, CONVERSION_FACTORS.Si_TO_SiO2); break;
              default: /* N, S, SO4, micros no requieren conversión */ break;
            }
          }
          reqOxide[n] = v;
          hasLiveReq = true;
        }
      }
    });
    if (!hasLiveReq && reqData && reqData.adjustment && reqData.efficiency) {
      nutrientsList.forEach(n => {
        let adj = parseFloat(reqData.adjustment[n]) || 0;
        const eff = parseFloat(reqData.efficiency[n]) || 100;
        // Si el requerimiento fue guardado en modo elemental, convertir a óxido
        if (reqData.isElementalMode) {
          switch(n) {
            case 'P2O5': adj = convertElementalToOxide(adj, CONVERSION_FACTORS.P_TO_P2O5); break;
            case 'K2O': adj = convertElementalToOxide(adj, CONVERSION_FACTORS.K_TO_K2O); break;
            case 'CaO': adj = convertElementalToOxide(adj, CONVERSION_FACTORS.Ca_TO_CaO); break;
            case 'MgO': adj = convertElementalToOxide(adj, CONVERSION_FACTORS.Mg_TO_MgO); break;
            case 'SiO2': adj = convertElementalToOxide(adj, CONVERSION_FACTORS.Si_TO_SiO2); break;
            default: /* N, S, SO4, micros no requieren conversión */ break;
          }
        }
        reqOxide[n] = eff > 0 ? (adj / (eff / 100)) : adj;
      });
    } else if (!hasLiveReq) {
      nutrientsList.forEach(n => reqOxide[n] = 0);
    }

    // Actualizar valores en el DOM con conversiones según el modo
    nutrientsList.forEach(nutrient => {
      const element = document.getElementById(`total${nutrient}`);
      const labelElement = document.getElementById(`label${nutrient}`);
      const reqEl = document.getElementById(`req${nutrient}`);
      const diffEl = document.getElementById(`diff${nutrient}`);
      const reqLabelEl = document.getElementById(`reqLabel${nutrient}`);
      const diffLabelEl = document.getElementById(`diffLabel${nutrient}`);
      
      if (element) {
        let displayValue = totals[nutrient];
        let labelText = '';
        let reqDisplay = reqOxide[nutrient] || 0;
        
        // Convertir según el modo para los nutrientes específicos
        if (isElementalMode) {
          switch(nutrient) {
            case 'P2O5':
              displayValue = convertOxideToElemental(totals['P2O5'], CONVERSION_FACTORS.P2O5_TO_P);
              reqDisplay = convertOxideToElemental(reqDisplay, CONVERSION_FACTORS.P2O5_TO_P);
              labelText = 'P:';
              break;
            case 'K2O':
              displayValue = convertOxideToElemental(totals['K2O'], CONVERSION_FACTORS.K2O_TO_K);
              reqDisplay = convertOxideToElemental(reqDisplay, CONVERSION_FACTORS.K2O_TO_K);
              labelText = 'K:';
              break;
            case 'CaO':
              displayValue = convertOxideToElemental(totals['CaO'], CONVERSION_FACTORS.CaO_TO_Ca);
              reqDisplay = convertOxideToElemental(reqDisplay, CONVERSION_FACTORS.CaO_TO_Ca);
              labelText = 'Ca:';
              break;
            case 'MgO':
              displayValue = convertOxideToElemental(totals['MgO'], CONVERSION_FACTORS.MgO_TO_Mg);
              reqDisplay = convertOxideToElemental(reqDisplay, CONVERSION_FACTORS.MgO_TO_Mg);
              labelText = 'Mg:';
              break;
            case 'SiO2':
              displayValue = convertOxideToElemental(totals['SiO2'], CONVERSION_FACTORS.SiO2_TO_Si);
              reqDisplay = convertOxideToElemental(reqDisplay, CONVERSION_FACTORS.SiO2_TO_Si);
              labelText = 'Si:';
              break;
            default:
              displayValue = totals[nutrient];
              reqDisplay = reqDisplay;
              labelText = '';
          }
        } else {
          displayValue = totals[nutrient];
          reqDisplay = reqDisplay;
          // Restaurar etiquetas originales
          switch(nutrient) {
            case 'P2O5':
              labelText = 'P₂O₅:';
              break;
            case 'K2O':
              labelText = 'K₂O:';
              break;
            case 'CaO':
              labelText = 'CaO:';
              break;
            case 'MgO':
              labelText = 'MgO:';
              break;
            case 'SiO2':
              labelText = 'SiO₂:';
              break;
            default:
              labelText = '';
          }
        }
        
        element.textContent = formatNumberWithCommas(displayValue);
        if (reqEl) reqEl.textContent = formatNumberWithCommas(reqDisplay);
        if (diffEl) {
          var diffNum = (parseFloat(displayValue) || 0) - (parseFloat(reqDisplay) || 0);
          diffEl.textContent = formatNumberWithCommas(diffNum);
          diffEl.classList.remove('nutrient-diff--deficit', 'nutrient-diff--surplus', 'nutrient-diff--balanced');
          var diffItem = diffEl.closest('.nutrient-item');
          if (diffItem) {
            diffItem.classList.remove('nutrient-item--diff-deficit', 'nutrient-item--diff-surplus', 'nutrient-item--diff-balanced');
          }
          var diffEps = 1e-3;
          if (Math.abs(diffNum) < diffEps) {
            diffEl.classList.add('nutrient-diff--balanced');
            if (diffItem) diffItem.classList.add('nutrient-item--diff-balanced');
          } else if (diffNum < 0) {
            diffEl.classList.add('nutrient-diff--deficit');
            if (diffItem) diffItem.classList.add('nutrient-item--diff-deficit');
          } else {
            diffEl.classList.add('nutrient-diff--surplus');
            if (diffItem) diffItem.classList.add('nutrient-item--diff-surplus');
          }
        }
        
        // Actualizar la etiqueta si existe (innerHTML + notranslate: evita Fe→Faith, Ca→AC, Si→Yes con Google Translate)
        if (labelElement && labelText) {
          labelElement.innerHTML = '<span class="notranslate" translate="no">' + labelText + '</span>';
        }
        if (reqLabelEl && labelText) reqLabelEl.innerHTML = '<span class="notranslate" translate="no">' + labelText + '</span>';
        if (diffLabelEl && labelText) diffLabelEl.innerHTML = '<span class="notranslate" translate="no">' + labelText + '</span>';
        
        console.log(`✅ Actualizado ${nutrient}: ${formatNumberWithCommas(displayValue)} (modo: ${isElementalMode ? 'elemental' : 'óxido'})`);
      } else {
        console.warn(`⚠️ Elemento no encontrado: total${nutrient}`);
      }
    });
  } catch (error) {
    console.error('❌ Error actualizando resumen:', error);
  }
}

// Función para obtener el ID del proyecto actual
function getCurrentProjectId() {
  try {
    // CRÍTICO: Usar el mismo método que el ProjectManager
    if (typeof window !== 'undefined' && window.projectManager) {
      const currentProject = window.projectManager.getCurrentProject();
      if (currentProject && currentProject.id) {
        console.log('✅ ID del proyecto desde projectManager:', currentProject.id);
        return currentProject.id;
      }
    }
    
    // Fallback: buscar en localStorage
    const currentProjectId = localStorage.getItem('nutriplant-current-project');
    if (currentProjectId) {
      console.log('✅ ID del proyecto desde localStorage:', currentProjectId);
      return currentProjectId;
    }
    
    console.warn('⚠️ No se encontró ID de proyecto');
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo ID de proyecto:', error);
    return null;
  }
}

// Función para cargar aplicaciones guardadas
function loadSavedApplications() {
  try {
    // PRIMERO: Limpiar aplicaciones actuales para evitar datos mezclados
    applications = [];
    appCounter = 1;
    
    const projectId = getCurrentProjectId();
    console.log('📂 Intentando cargar aplicaciones para proyecto:', projectId);
    
    if (!projectId) {
      console.log('📝 No hay proyecto seleccionado - inicializando vacío');
      return;
    }
    
    // PRIORIDAD 1: Sistema centralizado
    let savedData = null;
    try {
      if (typeof window.projectStorage !== 'undefined') {
        const granularSection = window.projectStorage.loadSection('granular', projectId);
        if (granularSection && granularSection.program) {
          savedData = granularSection.program;
          console.log('✅ Programa Granular cargado desde sistema centralizado');
        }
      }
    } catch (e) {
      console.warn('⚠️ Error cargando desde projectStorage:', e);
    }

    // PRIORIDAD 2: Cargar desde esquema unificado (nutriplant_project_<id>)
    if (!savedData) {
      try {
        const unifiedKey = `nutriplant_project_${projectId}`;
        const raw = localStorage.getItem(unifiedKey);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.granular && o.granular.program) {
            savedData = o.granular.program;
            console.log('✅ Programa Granular cargado desde esquema unificado');
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando desde unificado:', e);
      }
    }
    
    // PRIORIDAD 2: Fallback a projectManager
    if (!savedData && typeof window.projectManager !== 'undefined' && window.projectManager.loadProjectData) {
      savedData = window.projectManager.loadProjectData('nutricionGranular');
      if (savedData) {
        console.log('✅ Datos cargados desde ProjectManager');
      }
    }
    
    // PRIORIDAD 3: Fallback legacy
    if (!savedData) {
      const storageKey = `nutricionGranularData_${projectId}`;
      const dataString = localStorage.getItem(storageKey);
      if (dataString) {
        savedData = JSON.parse(dataString);
        console.log('✅ Datos cargados desde localStorage (legacy)');
      }
    }
    
    if (savedData) {
      if (typeof savedData.mode === 'boolean') {
        isElementalMode = savedData.mode;
        granularProgramModeInitialized = true;
      } else {
        try {
          const unifiedKey = `nutriplant_project_${projectId}`;
          const raw = localStorage.getItem(unifiedKey);
          const storedMode = raw ? JSON.parse(raw)?.granular?.program?.mode : undefined;
          if (typeof storedMode === 'boolean') {
            isElementalMode = storedMode;
            granularProgramModeInitialized = true;
          }
        } catch {}
      }
      applications = Array.isArray(savedData.applications) ? savedData.applications : [];
      appCounter = savedData.counter || 1;
      
      console.log('📂 Aplicaciones cargadas:', applications.length);
      
      // Renderizar aplicaciones cargadas
      if (applications.length > 0) {
        console.log('🔄 Renderizando aplicaciones cargadas...');
        renderApplications();
        updateSummary();
        console.log('✅ Aplicaciones restauradas exitosamente');
      } else {
        console.log('📝 No hay aplicaciones para renderizar');
        updateSummary();
      }
    } else {
      console.log('📝 No hay datos guardados para este proyecto - inicializando vacío');
      applications = [];
      appCounter = 1;
      granularProgramModeInitialized = false;
      updateSummary();
    }
  } catch (error) {
    console.error('❌ Error cargando aplicaciones:', error);
    applications = [];
    appCounter = 1;
    granularProgramModeInitialized = false;
  }
}

// Función para guardar aplicaciones
function saveApplications() {
  try {
    const projectId = getCurrentProjectId();
    
    if (!projectId) {
      console.warn('⚠️ No hay proyecto seleccionado, no se guardarán los datos');
      return;
    }
    
    // Sincronizar valores desde el DOM para no perder el último input (solo si la pestaña Programa está en pantalla)
    const container = document.getElementById('granularApplications');
    syncGranularProgramFromDOM();
    
    // 🚀 CRÍTICO: No sobrescribir el programa guardado con vacío si la pestaña Programa no se abrió (o tras recargar)
    // Si no hay DOM de aplicaciones y en memoria está vacío, preservar lo que ya está en storage
    if (!container && applications.length === 0) {
      const existing = typeof window.projectStorage !== 'undefined' ? window.projectStorage.loadSection('granular', projectId) : null;
      const existingProgram = existing && existing.program && Array.isArray(existing.program.applications) && existing.program.applications.length > 0;
      if (existingProgram) {
        console.log('💾 Programa Granular: sin pestaña abierta y memoria vacía; se preserva el programa ya guardado (no sobrescribir).');
        return;
      }
    }
    
    let cropSnapshot = null;
    try {
      let reqData = null;
      if (typeof window.projectStorage !== 'undefined') {
        reqData = window.projectStorage.loadSection('granular', projectId)?.requirements || null;
      }
      if (!reqData) {
        const unifiedKey = `nutriplant_project_${projectId}`;
        const raw = localStorage.getItem(unifiedKey);
        if (raw) {
          const unified = JSON.parse(raw);
          reqData = unified?.granular?.requirements || unified?.granularRequirements || null;
        }
      }
      const cropType = reqData?.cropType || document.getElementById('granularRequerimientoCropType')?.value || null;
      if (cropType) {
        const option = document.querySelector(`#granularRequerimientoCropType option[value="${cropType}"]`);
        const cropLabel = option ? option.textContent : cropType;
        const extraction = GRANULAR_CROP_EXTRACTION_DB[cropType] ? { ...GRANULAR_CROP_EXTRACTION_DB[cropType] } : null;
        const userProfile = loadUserProfile();
        const userCustom = userProfile?.customGranularCrops || {};
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
      console.warn('⚠️ No se pudo generar snapshot de cultivo granular:', e);
    }

    const programData = {
      applications: applications,
      counter: appCounter,
      mode: isElementalMode,
      cropSnapshot,
      timestamp: new Date().toISOString()
    };
    
    const useCentralized = typeof window.projectStorage !== 'undefined';
    let savedWithCentralized = false;
    
    if (useCentralized) {
      const existingSection = window.projectStorage.loadSection('granular', projectId) || {};
      const mergedSection = {
        ...existingSection,
        program: programData
      };
      
      savedWithCentralized = window.projectStorage.saveSection('granular', mergedSection, projectId);
      if (savedWithCentralized) {
        console.log('💾 Programa Granular guardado (sistema centralizado):', { projectId, applicationsCount: applications.length });
      } else {
        console.warn('⚠️ No se pudo guardar Programa Granular con projectStorage, usando fallback...');
      }
    }
    
    if (!savedWithCentralized) {
      // PRIORIDAD 1 Fallback: Guardar en esquema unificado (nutriplant_project_<id>)
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
        program: programData
      };
      
      // 🚀 CRÍTICO: Restaurar location después de actualizar
      if (hasValidLocation) {
        unified.location = existingLocation;
      }
      
      localStorage.setItem(unifiedKey, JSON.stringify(unified));
      console.log('💾 Programa Granular guardado en esquema unificado (fallback):', { projectId, applicationsCount: applications.length });
    }
    
    // Guardar en projectManager para compatibilidad
    if (typeof window.projectManager !== 'undefined' && window.projectManager.saveProjectData) {
      window.projectManager.saveProjectData('nutricionGranular', programData);
    }
    
    // Fallback legacy (solo compatibilidad)
    const storageKey = `nutricionGranularData_${projectId}`;
    localStorage.setItem(storageKey, JSON.stringify(programData));
    
  } catch (error) {
    console.error('❌ Error guardando aplicaciones:', error);
  }
}

// Función para inicializar cuando se carga la sección
function initializeGranularSection() {
  console.log('🔄 Inicializando sección de Nutrición Granular...');
  
  // Siempre intentar cargar aplicaciones guardadas
  loadSavedApplications();
  
  // Mostrar mensaje de estado
  if (applications.length === 0) {
    console.log('📝 No hay aplicaciones guardadas');
  } else {
    console.log('✅ Aplicaciones restauradas:', applications.length);
  }
}

// Función global para refrescar la sección (llamada desde dashboard)
function refreshGranularSection() {
  console.log('🔄 Refrescando sección de Nutrición Granular...');
  initializeGranularSection();
}

// Función para forzar la carga de aplicaciones (carga materiales desde nube primero si hay)
function forceLoadApplications() {
  console.log('🔧 Forzando carga de aplicaciones...');
  var runAfterMaterials = function() {
  try {
    var projectId = getCurrentProjectId();
    if (!projectId) {
      console.log('📝 No hay proyecto seleccionado');
      return;
    }
    
    // PRIORIDAD 1: Cargar desde projectStorage (sistema centralizado)
    let savedData = null;
    try {
      if (typeof window.projectStorage !== 'undefined') {
        const granularSection = window.projectStorage.loadSection('granular', projectId);
        if (granularSection && granularSection.program) {
          savedData = granularSection.program;
          console.log('✅ Programa Granular cargado desde projectStorage');
        }
      }
    } catch (e) {
      console.warn('⚠️ Error cargando desde projectStorage:', e);
    }
    
    // PRIORIDAD 2: Cargar desde esquema unificado (nutriplant_project_<id>)
    if (!savedData) {
      try {
        const unifiedKey = `nutriplant_project_${projectId}`;
        const raw = localStorage.getItem(unifiedKey);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && o.granular && o.granular.program) {
            savedData = o.granular.program;
            console.log('✅ Programa Granular cargado desde esquema unificado');
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando desde unificado:', e);
      }
    }
    
    // PRIORIDAD 3: Fallback a projectManager
    if (!savedData && typeof window.projectManager !== 'undefined' && window.projectManager.loadProjectData) {
      savedData = window.projectManager.loadProjectData('nutricionGranular');
      if (savedData) console.log('✅ Datos cargados desde ProjectManager');
    }
    
    // PRIORIDAD 4: Fallback legacy
    if (!savedData) {
      const storageKey = `nutricionGranularData_${projectId}`;
      const dataString = localStorage.getItem(storageKey);
      if (dataString) {
        savedData = JSON.parse(dataString);
        console.log('✅ Datos cargados desde localStorage (legacy)');
      }
    }
    
    if (savedData) {
      if (typeof savedData.mode === 'boolean') {
        isElementalMode = savedData.mode;
        granularProgramModeInitialized = true;
      }
      applications = Array.isArray(savedData.applications) ? savedData.applications : [];
      appCounter = savedData.counter || 1;
      
      console.log('📂 Aplicaciones cargadas para proyecto:', projectId, 'total:', applications.length);
      
      // Renderizar si hay aplicaciones
      if (applications.length > 0) {
        console.log('🔄 Renderizando aplicaciones...');
        renderApplications();
        updateSummary();
        console.log('✅ Aplicaciones restauradas exitosamente');
      } else {
        console.log('📝 No hay aplicaciones para renderizar');
      }
    } else {
      console.log('📝 No hay datos guardados para este proyecto');
      applications = [];
      appCounter = 1;
    }
  } catch (error) {
    console.error('❌ Error en forceLoadApplications:', error);
    applications = [];
    appCounter = 1;
  }
  };
  ensureCustomGranularMaterialsLoaded().then(runAfterMaterials);
}

// Hacer las funciones globalmente accesibles
window.refreshGranularSection = refreshGranularSection;
  window.forceLoadApplications = forceLoadApplications;
  window.saveApplications = saveApplications;
  window.openGranularPreloadedCatalogModal = openGranularPreloadedCatalogModal;

// Inicialización simple (materiales desde nube primero, luego local)
document.addEventListener('DOMContentLoaded', function() {
  console.log('🌱 Nutrición Granular cargado');
  ensureCustomGranularMaterialsLoaded();
});

// Guardar automáticamente cuando se hacen cambios
function autoSave() {
  saveApplications();
}

// Modificar las funciones para que guarden automáticamente
const originalAddGranularApplication = addGranularApplication;
addGranularApplication = function() {
  originalAddGranularApplication();
  autoSave();
};

const originalUpdateMaterial = updateMaterial;
updateMaterial = function(appId, materialIndex, materialName) {
  originalUpdateMaterial(appId, materialIndex, materialName);
  autoSave();
};

const originalUpdateMaterialPercentage = updateMaterialPercentage;
updateMaterialPercentage = function(appId, materialIndex, percentage) {
  originalUpdateMaterialPercentage(appId, materialIndex, percentage);
  autoSave();
};

const originalUpdateDose = updateDose;
updateDose = function(appId, dose) {
  originalUpdateDose(appId, dose);
  autoSave();
};

const originalRemoveApp = removeApp;
removeApp = function(appId) {
  originalRemoveApp(appId);
  autoSave();
};

