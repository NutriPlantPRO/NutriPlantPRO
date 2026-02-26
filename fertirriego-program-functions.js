// =====================================================
// FERTIRRIEGO - PROGRAMA SEMANAL (Resumen + Semanas)
// =====================================================

// DB básica de fertilizantes solubles (porcentaje en masa)
// Nota: En sulfatos el aporte va a SO4; S elemental = 0
const FERT_SOLUBLES_DB = [
  // Nitrogenados
  { id: 'fosfonitrato_33_03_00', name: 'Fosfonitrato', N_NO3: 30, N_NH4: 3, P2O5: 3 },
  { id: 'sulfato_amonio_soluble', name: 'Sulfato de Amonio Soluble', N_NO3: 0, N_NH4: 21, SO4: 60, S: 0 },

  // Fosfatos
  { id: 'map', name: 'MAP', N_NO3: 0, N_NH4: 12, P2O5: 61 },
  { id: 'mkp', name: 'MKP', N_NO3: 0, N_NH4: 0, P2O5: 52, K2O: 34 },

  // Potasio y mezclas
  { id: 'nks', name: 'NKS', N_NO3: 12, N_NH4: 0, K2O: 46, SO4: 3.6, S: 0 },
  { id: 'nk_mg', name: 'NK+Mg', N_NO3: 13.0, N_NH4: 0, K2O: 46, MgO: 2 },
  { id: 'sop', name: 'SOP', N_NO3: 0, N_NH4: 0, K2O: 50, SO4: 45, S: 0 },
  { id: 'kcl_soluble', name: 'KCl Soluble', N_NO3: 0, N_NH4: 0, K2O: 60 },

  // Calcio y Magnesio
  { id: 'nitrato_calcio_granular', name: 'Nitrato de Calcio', N_NO3: 14.4, N_NH4: 1.1, CaO: 26 },
  { id: 'nitrato_calcio_cristal', name: 'Nitrato de Calcio Cristal', N_NO3: 12, N_NH4: 0, CaO: 23, MgO: 0.5 },
  { id: 'nitrato_magnesio', name: 'Nitrato de Magnesio', N_NO3: 10.8, N_NH4: 0, MgO: 15 },
  { id: 'sulfato_magnesio', name: 'Sulfato de Magnesio', N_NO3: 0, N_NH4: 0, MgO: 16, SO4: 13, S: 0 },

  // Ácidos (valores en % masa; si se dosifica en L requiere convertir por densidad)
  { id: 'acido_sulfurico_98', name: 'Ácido Sulfúrico 98%', SO4: 96, S: 0, unit: 'L', density: 1.84 },
  { id: 'acido_fosforico_75', name: 'Ácido Fosfórico 75%', P2O5: 54, unit: 'L', density: 1.57 },
  { id: 'acido_fosforico_85', name: 'Ácido Fosfórico 85%', P2O5: 61, unit: 'L', density: 1.685 },
  { id: 'acido_nitrico_55', name: 'Ácido Nítrico 55%', N_NO3: 12.2, unit: 'L', density: 1.33 },

  // Complejos NPK con micros
  { id: 'triple_19_me', name: 'Triple 19 +Me', N_NO3: 9.4, N_NH4: 9.7, P2O5: 19, K2O: 19, SO4: 3.9, Fe: 0.10, Mn: 0.05, B: 0.02, Zn: 0.015, Cu: 0.011, Mo: 0.007 },
  { id: 'npk_12_43_12_me', name: '12-43-12 +Me', N_NO3: 3.5, N_NH4: 8.5, P2O5: 43, K2O: 12, SO4: 0, MgO: 0, Fe: 0.05, Mn: 0.02, B: 0.01, Zn: 0.01, Cu: 0.005, Mo: 0.003 },
  { id: 'npk_10_10_43_me', name: '10-10-43 +Me', N_NO3: 10, N_NH4: 0, P2O5: 10, K2O: 43, SO4: 0, MgO: 0, Fe: 0.05, Mn: 0.02, B: 0.01, Zn: 0.01, Cu: 0.005, Mo: 0.003 },

  // Micros
  { id: 'mix_micros_edta', name: 'Mix Micros EDTA', Fe: 6, Mn: 4, Zn: 2, Cu: 1, B: 1 },
  { id: 'quelato_fe', name: 'Fe EDTA', Fe: 13 },
  { id: 'fe_dtpa', name: 'Fe DTPA', Fe: 11 },
  { id: 'fe_eddha', name: 'Fe EDDHA', Fe: 6 },
  { id: 'quelato_mn', name: 'Mn EDTA', Mn: 13 },
  { id: 'quelato_zn', name: 'Zn EDTA', Zn: 13 },
  { id: 'quelato_cu', name: 'Cu EDTA', Cu: 14 },
  { id: 'acido_borico', name: 'Ácido Bórico', B: 17, N_NO3: 0, N_NH4: 0 },
  { id: 'molibdato_sodio', name: 'Molibdato de Sodio', Mo: 39 }
];

// Estado del programa
let fertiWeeks = []; // [{ id,label,stage,kgByCol:{[colId]:number}, totals:{...} }]
let fertiWeekCounter = 1;
let fertiColumns = []; // [{ id, materialId }]
let fertiCustomMaterials = []; // merge usuario + proyecto
let fertiCustomMaterialsUser = [];
let fertiCustomMaterialsProject = [];
let fertiTimeUnit = 'semana'; // 'semana' | 'mes'
let fertiMacroChart = null; // Chart.js instances
let fertiMicroChart = null;
let fertiChartsElementalMode = false;
let fertiProgramInitialized = false;
// Estado de autosave (Programa)
let fertiProgDirty = false;
let fertiProgAutoTimer = null;
let fertiChartsResizeTimer = null;
let fertiWaterInputsBound = false;
let fertiWaterContributionOxide = {
  N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0,
  Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0
};

const FERTI_NUTRIENTS = ['N_NO3','N_NH4','P','P2O5','K','K2O','Ca','CaO','Mg','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','Si','SiO2'];

// Conversión de óxido↔elemental (mismos factores que en requerimiento)
const FERTI_CONV = { P2O5_TO_P: 2.291, K2O_TO_K: 1.204, CaO_TO_Ca: 1.399, MgO_TO_Mg: 1.658, SiO2_TO_Si: 2.139 };

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

function isFertiMicroNutrient(key) { return ['Fe','Mn','B','Zn','Cu','Mo','Si','SiO2'].indexOf(key) !== -1; }
function fertiProgFormat(num, nutrientKey) {
  const n = parseFloat(num || 0);
  const decimals = (nutrientKey && isFertiMicroNutrient(nutrientKey)) ? 3 : 2;
  return isNaN(n) ? (decimals === 3 ? '0.000' : '0.00') : n.toFixed(decimals);
}

// Modo visual del programa (óxido/elemental)
let fertProgElementalMode = false;
let fertiProgModeInitialized = false;
function updateFertiProgramModeButtons() {
  const btns = document.querySelectorAll('#toggleFertiProgramOxideElementalBtn, #toggleFertiProgramOxideElementalBtnFerti');
  btns.forEach(btn => { btn.textContent = fertProgElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental'; });
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
  if (!titleEl) return;
  titleEl.textContent = `📅 Programa ${fertiTimeUnit === 'mes' ? 'Mensual' : 'Semanal'}`;
}

function setFertiTimeUnit(unit) {
  fertiTimeUnit = unit === 'mes' ? 'mes' : 'semana';
  updateFertiProgramTimeTitle();
  renderFertiWeeks();
  markFertiProgDirty();
}

// Materiales base + personalizados
function getAllFertiMaterials() {
  try {
    return [...FERT_SOLUBLES_DB, ...(Array.isArray(fertiCustomMaterials) ? fertiCustomMaterials : [])];
  } catch { return [...FERT_SOLUBLES_DB]; }
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
    const userId = fertiGetCurrentUserId();
    if (userId) {
      const profile = fertiLoadUserProfile() || {};
      profile.customFertiMaterials = { items };
      fertiSaveUserProfile(profile);
    } else {
      // Sin sesión: persistir en localStorage para que sobreviva al reinicio de página
      try {
        localStorage.setItem('fertiCustomMaterials_global_user', JSON.stringify({ items }));
      } catch (e) {}
    }
  } catch {}
}

function renderFertiCustomMaterialsList() {
  const container = document.getElementById('fertiCustomMaterialsList');
  if (!container) return;
  const list = Array.isArray(fertiCustomMaterials) ? fertiCustomMaterials : [];
  if (list.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;">Sin fertilizantes personalizados.</div>';
    return;
  }
  container.innerHTML = list.map(mat => {
    const key = encodeURIComponent((mat.id || mat.name || '').toString());
    const badge = mat.source === 'user' ? 'Usuario' : 'Proyecto';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>${mat.name || mat.id}</span>
          <span style="font-size:12px;color:#64748b;border:1px solid #e2e8f0;border-radius:999px;padding:2px 8px;">${badge}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="openEditFertiCustomMaterial('${key}')">Editar</button>
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="removeFertiCustomMaterial('${key}')">Eliminar</button>
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
  if (!confirm('¿Eliminar este fertilizante del catálogo?')) return;
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
  if (titleEl) titleEl.textContent = '✏️ Editar Materia Prima Personalizada';
  const saveBtn = overlay.querySelector('#fertiCustom_saveBtn');
  if (saveBtn) saveBtn.textContent = 'Guardar cambios';
  const mat = found.material;
  overlay.querySelector('#fertiCustom_name').value = mat.name || '';
  overlay.querySelector('#fertiCustom_N_NO3').value = mat.N_NO3 ?? 0;
  overlay.querySelector('#fertiCustom_N_NH4').value = mat.N_NH4 ?? 0;
  overlay.querySelector('#fertiCustom_P2O5').value = mat.P2O5 ?? 0;
  overlay.querySelector('#fertiCustom_K2O').value = mat.K2O ?? 0;
  overlay.querySelector('#fertiCustom_CaO').value = mat.CaO ?? 0;
  overlay.querySelector('#fertiCustom_MgO').value = mat.MgO ?? 0;
  overlay.querySelector('#fertiCustom_S').value = mat.S ?? 0;
  overlay.querySelector('#fertiCustom_SO4').value = mat.SO4 ?? 0;
  overlay.querySelector('#fertiCustom_Fe').value = mat.Fe ?? 0;
  overlay.querySelector('#fertiCustom_Mn').value = mat.Mn ?? 0;
  overlay.querySelector('#fertiCustom_B').value = mat.B ?? 0;
  overlay.querySelector('#fertiCustom_Zn').value = mat.Zn ?? 0;
  overlay.querySelector('#fertiCustom_Cu').value = mat.Cu ?? 0;
  overlay.querySelector('#fertiCustom_Mo').value = mat.Mo ?? 0;
  overlay.querySelector('#fertiCustom_SiO2').value = mat.SiO2 ?? 0;
}

function clearFertiCustomMaterials() {
  if (!confirm('¿Eliminar todo el catálogo de fertilizantes solubles personalizados?')) return;
  const userId = fertiGetCurrentUserId();
  if (userId) {
    fertiCustomMaterialsUser = [];
    saveFertiCustomMaterialsToUser();
  } else {
    fertiCustomMaterialsProject = [];
    saveFertiCustomMaterials();
  }
  mergeFertiCustomMaterials();
  renderFertiCustomMaterialsList();
  renderFertiWeeks();
}

/** Modal de consulta: fertilizantes precargados con concentración (% óxido/elemento) */
const FERTI_CATALOG_COLS = ['N_NO3', 'N_NH4', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
function fertiCatalogColLabel(key) {
  const labels = { N_NO3: 'N(NO₃)', N_NH4: 'N(NH₄)', P2O5: 'P₂O₅', K2O: 'K₂O', CaO: 'CaO', MgO: 'MgO', S: 'S', SO4: 'SO₄', Fe: 'Fe', Mn: 'Mn', B: 'B', Zn: 'Zn', Cu: 'Cu', Mo: 'Mo', SiO2: 'SiO₂' };
  return labels[key] || key;
}
function openFertiPreloadedCatalogModal() {
  const list = getBaseFertiMaterials();
  const rows = list.map(mat => {
    const cells = [
      (mat.name || mat.id || '').replace(/</g, '&lt;'),
      ...FERTI_CATALOG_COLS.map(k => (parseFloat(mat[k]) || 0).toFixed(2))
    ];
    return `<tr style="border-bottom:1px solid #e5e7eb;">${cells.map((c, i) => `<td style="padding:6px 10px;${i === 0 ? 'font-weight:600;' : 'text-align:right;'}">${c}</td>`).join('')}</tr>`;
  }).join('');
  const overlay = document.createElement('div');
  overlay.className = 'material-modal-overlay ferti-preloaded-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
  overlay.innerHTML = `
    <div class="material-modal" style="max-width:95%;width:920px;max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div class="modal-header" style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:1.1rem;color:#1e293b;">📋 Fertilizantes disponibles (concentración %)</h3>
        <button class="btn btn-secondary btn-sm" type="button" data-close-ferti-preloaded>✕</button>
      </div>
      <div style="padding:14px 18px;overflow:auto;flex:1;">
        <p style="margin:0 0 12px 0;font-size:0.9rem;color:#64748b;">Consulta de concentraciones de los fertilizantes solubles precargados. Valores en % (óxidos donde aplica).</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">Nombre</th>
                ${FERTI_CATALOG_COLS.map(k => `<th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e2e8f0;">${fertiCatalogColLabel(k)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="' + (1 + FERTI_CATALOG_COLS.length) + '" style="padding:12px;color:#64748b;">Sin fertilizantes precargados.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  overlay.querySelector('[data-close-ferti-preloaded]').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function updateFertiCustomMaterial(overlay) {
  const key = (overlay.dataset.editKey || '').toLowerCase();
  if (!key) return;
  const found = findFertiCustomMaterialByKey(key);
  if (!found.material) return;
  const getNum = id => { const v = parseFloat(overlay.querySelector('#'+id).value); return isNaN(v) ? 0 : Math.max(0, v); };
  const name = (overlay.querySelector('#fertiCustom_name').value || '').trim();
  if (!name) { if (window.showMessage) window.showMessage('Escribe un nombre', 'warning'); return; }
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
    S: getNum('fertiCustom_S'),
    Fe: getNum('fertiCustom_Fe'),
    Mn: getNum('fertiCustom_Mn'),
    Zn: getNum('fertiCustom_Zn'),
    Cu: getNum('fertiCustom_Cu'),
    B: getNum('fertiCustom_B'),
    Mo: getNum('fertiCustom_Mo'),
    SiO2: getNum('fertiCustom_SiO2')
  };
  if (found.source === 'user') {
    fertiCustomMaterialsUser = upsertFertiMaterial(fertiCustomMaterialsUser, updated, 'user');
    saveFertiCustomMaterialsToUser();
  } else {
    fertiCustomMaterialsProject = upsertFertiMaterial(fertiCustomMaterialsProject, updated, 'project');
    saveFertiCustomMaterials();
  }
  mergeFertiCustomMaterials();
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
  macro.push('S');
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

// Columnas de fertilizante (nuevo modelo)
function addFertiColumn() {
  const col = { id: 'col_' + Date.now(), materialId: '' };
  fertiColumns.push(col);
  fertiWeeks.forEach(w => { if (!w.kgByCol) w.kgByCol = {}; w.kgByCol[col.id] = 0; });
  renderFertiWeeks();
  markFertiProgDirty();
}

function removeFertiColumn(colId) {
  fertiColumns = fertiColumns.filter(c => c.id !== colId);
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
  renderFertiWeeks();
  updateFertiSummary();
  // Guardar inmediatamente para no perder la selección al cambiar de pestaña
  try { saveFertirriegoProgram(); } catch {}
  scheduleSaveFertirriegoProgram();
}

function onWeekKgInput(weekId, colId, kg) {
  const week = fertiWeeks.find(w => w.id === weekId); if (!week) return;
  if (!week.kgByCol) week.kgByCol = {};
  week.kgByCol[colId] = parseFloat(kg) || 0;
  computeWeekTotals(week);
  updateFertiSummary();
  markFertiProgDirty();
}

function onWeekKgChange(weekId, colId, kg) {
  onWeekKgInput(weekId, colId, kg);
  // Re-render para reflejar aportes por nutriente en la fila y actualizar totales de la tabla
  renderFertiWeeks();
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
    week.kgByCol[colId] = parseFloat(input.value) || 0;
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
  ['N_NO3','N_NH4','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'].forEach(n => {
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
  const totals = { N_NO3:0,N_NH4:0,P:0,P2O5:0,K:0,K2O:0,Ca:0,CaO:0,Mg:0,MgO:0,S:0,SO4:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,Si:0,SiO2:0 };
  if (!week.kgByCol) week.kgByCol = {};
  fertiColumns.forEach(c => {
    const kg = week.kgByCol[c.id] || 0;
    const contrib = computeFertiContribFor(kg, c.materialId);
    Object.keys(totals).forEach(n => { totals[n] += parseFloat(contrib[n] || 0); });
  });
  week.totals = totals;
}

// Render semanas
function renderFertiWeeks() {
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
    .map(m => `<option value="${m.id}" ${m.id===selectedId?'selected':''}>${m.name}</option>`)
    .join('');
  const cols = getFertiProgramColumns();
  const headerMap = {N_NO3:'N(NO₃)',N_NH4:'N(NH₄)',P:'P',P2O5:'P₂O₅',K:'K',K2O:'K₂O',Ca:'Ca',CaO:'CaO',Mg:'Mg',MgO:'MgO',S:'S',SO4:'SO₄',Fe:'Fe',Mn:'Mn',B:'B',Zn:'Zn',Cu:'Cu',Mo:'Mo',Si:'Si',SiO2:'SiO₂'};

  // Encabezados de columnas de fertilizante (select compacto + botón X)
  const fertColsHeader = fertiColumns.map(c => {
    const m = materials.find(m => m.id === c.materialId);
    const currentName = (m?.name) || 'Selecciona…';
    const displayNamePlain = currentName + (m && m.unit === 'L' ? ' (L/ha)' : '');
    const displayNameHtml = currentName + (m && m.unit === 'L' ? ' <span class="unit-lha">(L/ha)</span>' : '');
    return `
          <th style="min-width:110px;width:110px;position:relative;">
            <button title="Eliminar columna" class="ferti-col-remove-btn" onclick="removeFertiColumn('${c.id}')">✕</button>
            <div class="fert-col-title" title="${displayNamePlain}">${displayNameHtml}</div>
            <select class="ferti-col-select" onchange="onFertiColumnMaterialChange('${c.id}', this.value)">
              <option value="">Selecciona…</option>
              ${buildOptions(c.materialId)}
            </select>
          </th>`;
  }).join('');

  fertiWeeks.forEach(w => computeWeekTotals(w));

  // Fila de subtítulo centrado (un solo rótulo para todo el renglón)
  const headerTotalCols = 2 + fertiColumns.length + cols.length;

  // Totales: por columna de fertilizante y por nutriente
  const fertColTotals = fertiColumns.map(c => {
    let sum = 0; fertiWeeks.forEach(w => { sum += parseFloat(w.kgByCol?.[c.id]||0); }); return sum;
  });
  const fertColNames = fertiColumns.map(c => (materials.find(m => m.id === c.materialId)?.name) || '');
  const nutTotals = { N_NO3:0,N_NH4:0,P:0,P2O5:0,K:0,K2O:0,Ca:0,CaO:0,Mg:0,MgO:0,S:0,SO4:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,Si:0,SiO2:0 };
  fertiWeeks.forEach(w => { Object.keys(nutTotals).forEach(n => { nutTotals[n] += parseFloat(w.totals?.[n]||0); }); });

  const weekRowsHtml = fertiWeeks.map((week, idx) => `
          <tr>
            <td class="ferti-stage-cell">
              <div style="display:flex; align-items:center; gap:6px;">
                <select onchange="window.onChangeFertiStage && window.onChangeFertiStage('${week.id}', this.value)">
                ${['Establecimiento','Vegetativo','Prefloración','Floración','Amarre','Llenado','Cosecha'].map(st => `<option ${st===week.stage?'selected':''}>${st}</option>`).join('')}
                </select>
                <button title="Eliminar semana" class="ferti-week-remove-btn" onclick="removeFertiWeek('${week.id}')">✕</button>
              </div>
            </td>
            <td class="ferti-week-num-cell" style="text-align:center;">${idx+1}</td>
            ${fertiColumns.map(c => `
              <td><input type="number" step="0.01" value="${week.kgByCol?.[c.id]||0}" class="material-input" style="width:88px;" data-week-id="${week.id}" data-col-id="${c.id}" oninput="onWeekKgInput('${week.id}','${c.id}',this.value)" onchange="onWeekKgChange('${week.id}','${c.id}',this.value)"/></td>
            `).join('')}
            ${cols.map((n,i)=>`<td class="nut-col-cell ${i===0?'nut-start':''}" style="width:60px;text-align:right;">${fertiProgFormat(week.totals?.[n]||0, n)}</td>`).join('')}
          </tr>
        `).join('');
  const totalsRowHtml = `
          <tr class="total-row">
            <td colspan="2" style="text-align:left;font-weight:700;">TOTAL</td>
            ${fertiColumns.map((c,i)=>`<td><div class="total-value">${fertiProgFormat(fertColTotals[i])}</div><div class="total-label-sm" title="${fertColNames[i]||''}">${(fertColNames[i]||'').slice(0,14)}</div></td>`).join('')}
            ${cols.map((n,i)=>`<td class="nut-col-cell ${i===0?'nut-start':''}"><div class="total-value">${fertiProgFormat(nutTotals[n]||0, n)}</div><div class="total-label-sm">${headerMap[n]||n}</div></td>`).join('')}
          </tr>`;

  const timeSelectHtml = `
    <select class="ferti-time-select" onchange="setFertiTimeUnit(this.value)">
      <option value="semana" ${fertiTimeUnit==='semana'?'selected':''}>Semana</option>
      <option value="mes" ${fertiTimeUnit==='mes'?'selected':''}>Mes</option>
    </select>`;
  const kgHeader = fertiTimeUnit === 'mes' ? 'Kg/ha/mes' : 'Kg/ha/sem';
  const kgHeaderStyle = fertiTimeUnit === 'mes'
    ? 'text-align:center;background:#f0fdf4;color:#166534;border-top:1px solid #bbf7d0;border-bottom:1px solid #bbf7d0;'
    : 'text-align:center;background:#eff6ff;color:#1e3a8a;border-top:1px solid #bfdbfe;border-bottom:1px solid #bfdbfe;';

  const addTimeLabel = fertiTimeUnit === 'mes' ? 'Agregar mes' : 'Agregar semana';
  container.innerHTML = `
    <table class="materials-table">
      <thead>
        <tr>
          <th class="ferti-stage-header">Etapa</th>
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
      </tbody>
    </table>
    <div style="margin-top:8px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" onclick="addFertiColumn()">➕ Agregar fertilizante</button>
      <button class="btn btn-secondary btn-sm" onclick="addFertiWeek()">➕ ${addTimeLabel}</button>
      <button class="btn btn-info btn-sm" onclick="openFertiNewMaterialModal()">📋 Gestionar catálogo de fertilizantes</button>
    </div>
  `;
}

function onChangeFertiStage(weekId, stage) {
  const w = fertiWeeks.find(w => w.id === weekId); if (!w) return;
  w.stage = stage;
  markFertiProgDirty();
}

// Resumen
function updateFertiSummary() {
  const labelMap = fertProgElementalMode
    ? { P2O5: 'P', K2O: 'K', CaO: 'Ca', MgO: 'Mg', SiO2: 'Si' }
    : { P2O5: 'P₂O₅', K2O: 'K₂O', CaO: 'CaO', MgO: 'MgO', SiO2: 'SiO₂' };
  const labelIds = [
    ['fertiProgLabelP2O5', 'P2O5'],
    ['fertiProgLabelK2O', 'K2O'],
    ['fertiProgLabelCaO', 'CaO'],
    ['fertiProgLabelMgO', 'MgO'],
    ['fertiProgLabelSiO2', 'SiO2'],
    ['fertiReqLabelP2O5', 'P2O5'],
    ['fertiReqLabelK2O', 'K2O'],
    ['fertiReqLabelCaO', 'CaO'],
    ['fertiReqLabelMgO', 'MgO'],
    ['fertiReqLabelSiO2', 'SiO2'],
    ['fertiWaterLabelP2O5', 'P2O5'],
    ['fertiWaterLabelK2O', 'K2O'],
    ['fertiWaterLabelCaO', 'CaO'],
    ['fertiWaterLabelMgO', 'MgO'],
    ['fertiWaterLabelSiO2', 'SiO2'],
    ['fertiTotalWithWaterLabelP2O5', 'P2O5'],
    ['fertiTotalWithWaterLabelK2O', 'K2O'],
    ['fertiTotalWithWaterLabelCaO', 'CaO'],
    ['fertiTotalWithWaterLabelMgO', 'MgO'],
    ['fertiTotalWithWaterLabelSiO2', 'SiO2'],
    ['fertiDiffLabelP2O5', 'P2O5'],
    ['fertiDiffLabelK2O', 'K2O'],
    ['fertiDiffLabelCaO', 'CaO'],
    ['fertiDiffLabelMgO', 'MgO'],
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
  const totals = { N_NO3:0,N_NH4:0,P:0,P2O5:0,K:0,K2O:0,Ca:0,CaO:0,Mg:0,MgO:0,S:0,SO4:0,Fe:0,Mn:0,B:0,Zn:0,Cu:0,Mo:0,Si:0,SiO2:0 };
  let totalKg = 0;
  fertiWeeks.forEach(w => {
    computeWeekTotals(w);
    // acumulado de kg aplicados en la semana
    if (w.kgByCol) {
      Object.values(w.kgByCol).forEach(v => { totalKg += parseFloat(v || 0); });
    }
    FERTI_NUTRIENTS.forEach(n => totals[n] += parseFloat(w.totals?.[n]||0));
  });

  // Cargar requerimiento real en ÓXIDO
  let reqOxide = {};
  try {
    const liveIds = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    let anyLive = false; const tmp = {};
    const fertiTable = document.getElementById('fertirriegoTableContainer');
    liveIds.forEach(n => {
      const scoped = fertiTable ? fertiTable.querySelector(`#ferti-req-${n}`) : null;
      const el = scoped || document.getElementById(`ferti-req-${n}`) || document.getElementById(`req-${n}`);
      if (el && el.textContent != null) {
        const v = parseFloat((el.textContent || '').toString().replace(/,/g,'').trim());
        if (!isNaN(v)) { tmp[n] = v; anyLive = true; }
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
    const list = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    if (!Object.keys(reqOxide).length && data && data.adjustment && data.efficiency) {
      list.forEach(n => {
        const adj = parseFloat(data.adjustment[n]) || 0;
        const eff = parseFloat(data.efficiency[n])||100;
        reqOxide[n] = eff>0 ? adj/(eff/100) : adj;
      });
    }
    if (!Object.keys(reqOxide).length) list.forEach(n => { reqOxide[n] = 0; });
  } catch(e){ console.warn('Req load error', e); }

  // Mostrar en el resumen del DOM (ids prefijados con ferti...)
  function set(id, value){ const el = document.getElementById(id); if (el) el.textContent = fertiProgFormat(value); }
  function setInput(id, value){
    const el = document.getElementById(id);
    if (!el) return;
    if (el === document.activeElement) return;
    el.value = fertiProgFormat(value);
  }
  // Aporte total (mostramos por defecto óxidos más N fraccionado)
  const appsEl = document.getElementById('fertiTotalApplications'); if (appsEl) appsEl.textContent = String(fertiWeeks.length || 0);
  const doseEl = document.getElementById('fertiTotalDoseKgHa'); if (doseEl) doseEl.textContent = fertiProgFormat(totalKg);
  set('fertiProgTotalN_NO3', totals.N_NO3); set('fertiProgTotalN_NH4', totals.N_NH4);
  set('fertiProgTotalP2O5', toElemental('P2O5', totals.P2O5)); set('fertiProgTotalK2O', toElemental('K2O', totals.K2O)); set('fertiProgTotalCaO', toElemental('CaO', totals.CaO)); set('fertiProgTotalMgO', toElemental('MgO', totals.MgO));
  set('fertiProgTotalS', totals.S); set('fertiProgTotalSO4', totals.SO4); set('fertiProgTotalFe', totals.Fe); set('fertiProgTotalMn', totals.Mn); set('fertiProgTotalB', totals.B); set('fertiProgTotalZn', totals.Zn); set('fertiProgTotalCu', totals.Cu); set('fertiProgTotalMo', totals.Mo); set('fertiProgTotalSiO2', toElemental('SiO2', totals.SiO2));

  // Requerimiento
  set('fertiReqN', reqOxide.N||0);
  set('fertiReqP2O5', toElemental('P2O5', reqOxide.P2O5||0)); set('fertiReqK2O', toElemental('K2O', reqOxide.K2O||0)); set('fertiReqCaO', toElemental('CaO', reqOxide.CaO||0)); set('fertiReqMgO', toElemental('MgO', reqOxide.MgO||0));
  set('fertiReqS', reqOxide.S||0); set('fertiReqSO4', reqOxide.SO4||0); set('fertiReqFe', reqOxide.Fe||0); set('fertiReqMn', reqOxide.Mn||0); set('fertiReqB', reqOxide.B||0); set('fertiReqZn', reqOxide.Zn||0); set('fertiReqCu', reqOxide.Cu||0); set('fertiReqMo', reqOxide.Mo||0); set('fertiReqSiO2', toElemental('SiO2', reqOxide.SiO2||0));

  // Aporte por agua (inputs editables)
  setInput('fertiWaterN', fertiWaterContributionOxide.N||0);
  setInput('fertiWaterP2O5', toElemental('P2O5', fertiWaterContributionOxide.P2O5||0));
  setInput('fertiWaterK2O', toElemental('K2O', fertiWaterContributionOxide.K2O||0));
  setInput('fertiWaterCaO', toElemental('CaO', fertiWaterContributionOxide.CaO||0));
  setInput('fertiWaterMgO', toElemental('MgO', fertiWaterContributionOxide.MgO||0));
  setInput('fertiWaterS', fertiWaterContributionOxide.S||0);
  setInput('fertiWaterSO4', fertiWaterContributionOxide.SO4||0);
  setInput('fertiWaterFe', fertiWaterContributionOxide.Fe||0);
  setInput('fertiWaterMn', fertiWaterContributionOxide.Mn||0);
  setInput('fertiWaterB', fertiWaterContributionOxide.B||0);
  setInput('fertiWaterZn', fertiWaterContributionOxide.Zn||0);
  setInput('fertiWaterCu', fertiWaterContributionOxide.Cu||0);
  setInput('fertiWaterMo', fertiWaterContributionOxide.Mo||0);
  setInput('fertiWaterSiO2', toElemental('SiO2', fertiWaterContributionOxide.SiO2||0));

  // Aporte total (programa + agua) — mismo criterio que Diferencia: no se cuenta el agua dos veces
  const totalWithWater = {
    N: (totals.N_NO3 + totals.N_NH4) + (fertiWaterContributionOxide.N||0),
    P2O5: (totals.P2O5) + (fertiWaterContributionOxide.P2O5||0),
    K2O: (totals.K2O) + (fertiWaterContributionOxide.K2O||0),
    CaO: (totals.CaO) + (fertiWaterContributionOxide.CaO||0),
    MgO: (totals.MgO) + (fertiWaterContributionOxide.MgO||0),
    S: (totals.S) + (fertiWaterContributionOxide.S||0),
    SO4: (totals.SO4) + (fertiWaterContributionOxide.SO4||0),
    Fe: (totals.Fe) + (fertiWaterContributionOxide.Fe||0),
    Mn: (totals.Mn) + (fertiWaterContributionOxide.Mn||0),
    B: (totals.B) + (fertiWaterContributionOxide.B||0),
    Zn: (totals.Zn) + (fertiWaterContributionOxide.Zn||0),
    Cu: (totals.Cu) + (fertiWaterContributionOxide.Cu||0),
    Mo: (totals.Mo) + (fertiWaterContributionOxide.Mo||0),
    SiO2: (totals.SiO2) + (fertiWaterContributionOxide.SiO2||0)
  };
  set('fertiTotalWithWaterN', totalWithWater.N);
  set('fertiTotalWithWaterP2O5', toElemental('P2O5', totalWithWater.P2O5));
  set('fertiTotalWithWaterK2O', toElemental('K2O', totalWithWater.K2O));
  set('fertiTotalWithWaterCaO', toElemental('CaO', totalWithWater.CaO));
  set('fertiTotalWithWaterMgO', toElemental('MgO', totalWithWater.MgO));
  set('fertiTotalWithWaterS', totalWithWater.S);
  set('fertiTotalWithWaterSO4', totalWithWater.SO4);
  set('fertiTotalWithWaterFe', totalWithWater.Fe);
  set('fertiTotalWithWaterMn', totalWithWater.Mn);
  set('fertiTotalWithWaterB', totalWithWater.B);
  set('fertiTotalWithWaterZn', totalWithWater.Zn);
  set('fertiTotalWithWaterCu', totalWithWater.Cu);
  set('fertiTotalWithWaterMo', totalWithWater.Mo);
  set('fertiTotalWithWaterSiO2', toElemental('SiO2', totalWithWater.SiO2));

  // Diferencia = Aporte total (programa + agua) - Requerimiento — el agua no se resta dos veces
  const diff = {
    N: (totals.N_NO3 + totals.N_NH4) - (reqOxide.N||0) + (fertiWaterContributionOxide.N||0),
    P2O5: (totals.P2O5) - (reqOxide.P2O5||0) + (fertiWaterContributionOxide.P2O5||0),
    K2O: (totals.K2O) - (reqOxide.K2O||0) + (fertiWaterContributionOxide.K2O||0),
    CaO: (totals.CaO) - (reqOxide.CaO||0) + (fertiWaterContributionOxide.CaO||0),
    MgO: (totals.MgO) - (reqOxide.MgO||0) + (fertiWaterContributionOxide.MgO||0),
    S: (totals.S) - (reqOxide.S||0) + (fertiWaterContributionOxide.S||0),
    SO4: (totals.SO4) - (reqOxide.SO4||0) + (fertiWaterContributionOxide.SO4||0),
    Fe: (totals.Fe) - (reqOxide.Fe||0) + (fertiWaterContributionOxide.Fe||0),
    Mn: (totals.Mn) - (reqOxide.Mn||0) + (fertiWaterContributionOxide.Mn||0),
    B: (totals.B) - (reqOxide.B||0) + (fertiWaterContributionOxide.B||0),
    Zn: (totals.Zn) - (reqOxide.Zn||0) + (fertiWaterContributionOxide.Zn||0),
    Cu: (totals.Cu) - (reqOxide.Cu||0) + (fertiWaterContributionOxide.Cu||0),
    Mo: (totals.Mo) - (reqOxide.Mo||0) + (fertiWaterContributionOxide.Mo||0),
    SiO2: (totals.SiO2) - (reqOxide.SiO2||0) + (fertiWaterContributionOxide.SiO2||0)
  };
  set('fertiDiffN', diff.N);
  set('fertiDiffP2O5', toElemental('P2O5', diff.P2O5)); set('fertiDiffK2O', toElemental('K2O', diff.K2O)); set('fertiDiffCaO', toElemental('CaO', diff.CaO)); set('fertiDiffMgO', toElemental('MgO', diff.MgO));
  set('fertiDiffS', diff.S); set('fertiDiffSO4', diff.SO4); set('fertiDiffFe', diff.Fe); set('fertiDiffMn', diff.Mn); set('fertiDiffB', diff.B); set('fertiDiffZn', diff.Zn); set('fertiDiffCu', diff.Cu); set('fertiDiffMo', diff.Mo); set('fertiDiffSiO2', toElemental('SiO2', diff.SiO2));

  try { updateFertiCharts(); } catch {}
}

function fertiWaterToOxide(key, value) {
  if (!fertProgElementalMode) return value;
  switch (key) {
    case 'P2O5': return value * FERTI_CONV.P2O5_TO_P;
    case 'K2O': return value * FERTI_CONV.K2O_TO_K;
    case 'CaO': return value * FERTI_CONV.CaO_TO_Ca;
    case 'MgO': return value * FERTI_CONV.MgO_TO_Mg;
    case 'SiO2': return value * FERTI_CONV.SiO2_TO_Si;
    default: return value;
  }
}

function initFertiWaterInputs() {
  if (fertiWaterInputsBound) return;
  fertiWaterInputsBound = true;
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el || !el.id || !el.id.startsWith('fertiWater')) return;
    const key = el.id.replace('fertiWater', '');
    if (!key) return;
    let v = parseFloat(el.value);
    if (isNaN(v)) v = 0;
    const oxideVal = fertiWaterToOxide(key, v);
    if (fertiWaterContributionOxide[key] !== oxideVal) {
      fertiWaterContributionOxide[key] = oxideVal;
      markFertiProgDirty();
      updateFertiSummary();
    }
  });
}

// ===== Gráficas (Chart.js) =====
function loadChartJs(callback){
  if (window.Chart) { callback(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  s.onload = callback; document.head.appendChild(s);
}

function getFertiWeekLabels(){
  return fertiWeeks.map((w, i) => `${fertiTimeUnit === 'mes' ? 'Mes' : 'Semana'} ${i+1}`);
}

function updateFertiCharts(){
  loadChartJs(() => {
    // Asegurar totales por semana al día
    fertiWeeks.forEach(w => computeWeekTotals(w));
    const labels = getFertiWeekLabels();
    const mk = (n) => fertiWeeks.map(w => parseFloat(w.totals?.[n]||0));

    let macros = {
      N_NO3: mk('N_NO3'), N_NH4: mk('N_NH4'), P2O5: mk('P2O5'), K2O: mk('K2O'), CaO: mk('CaO'), MgO: mk('MgO'), SO4: mk('SO4')
    };
    const micros = { Fe: mk('Fe'), Mn: mk('Mn'), B: mk('B'), Zn: mk('Zn'), Cu: mk('Cu'), Mo: mk('Mo') };

    const macroColors = {
      N_NO3: '#1f77b4', N_NH4: '#2ca02c', P2O5: '#ff7f0e', K2O: '#98df8a', CaO: '#9467bd', MgO: '#17becf', SO4: '#8c564b'
    };
    const microColors = { Fe: '#1f77b4', Mn: '#2ca02c', B: '#ff7f0e', Zn: '#9467bd', Cu: '#8c564b', Mo: '#e377c2' };

    // Conversión a elemental si aplica (P2O5->P, K2O->K, CaO->Ca, MgO->Mg)
    let macroLabels = { P2O5: 'P2O5', K2O: 'K2O', CaO: 'CaO', MgO: 'MgO' };
    if (fertiChartsElementalMode) {
      macros = {
        N_NO3: macros.N_NO3,
        N_NH4: macros.N_NH4,
        P2O5: macros.P2O5.map(v => v / FERTI_CONV.P2O5_TO_P),
        K2O: macros.K2O.map(v => v / FERTI_CONV.K2O_TO_K),
        CaO: macros.CaO.map(v => v / FERTI_CONV.CaO_TO_Ca),
        MgO: macros.MgO.map(v => v / FERTI_CONV.MgO_TO_Mg),
        SO4: macros.SO4
      };
      macroLabels = { P2O5: 'P', K2O: 'K', CaO: 'Ca', MgO: 'Mg' };
    }

    const macroCtx = document.getElementById('fertiMacroChart');
    if (macroCtx) {
      if (fertiMacroChart) fertiMacroChart.destroy();
      fertiMacroChart = new Chart(macroCtx.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'N(NO3)', data: macros.N_NO3, borderColor: macroColors.N_NO3, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'N(NH4)', data: macros.N_NH4, borderColor: macroColors.N_NH4, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.P2O5, data: macros.P2O5, borderColor: macroColors.P2O5, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.K2O, data: macros.K2O, borderColor: macroColors.K2O, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.CaO, data: macros.CaO, borderColor: macroColors.CaO, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.MgO, data: macros.MgO, borderColor: macroColors.MgO, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'SO4', data: macros.SO4, borderColor: macroColors.SO4, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10, generateLabels: chart => chart.data.datasets.map((ds, i) => ({ text: ds.label || '', fillStyle: ds.borderColor, strokeStyle: ds.borderColor, lineWidth: ds.borderWidth || 2, hidden: !chart.isDatasetVisible(i), datasetIndex: i, fontColor: ds.borderColor, pointStyle: 'circle' })) } } }, scales: { y: { title: { display: true, text: 'Kg de nutriente' } }, x: { title: { display: true, text: fertiTimeUnit === 'mes' ? 'Etapa' : 'Etapa' } } } }
      });
    }

    const microCtx = document.getElementById('fertiMicroChart');
    if (microCtx) {
      if (fertiMicroChart) fertiMicroChart.destroy();
      fertiMicroChart = new Chart(microCtx.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Fe', data: micros.Fe, borderColor: microColors.Fe, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Mn', data: micros.Mn, borderColor: microColors.Mn, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'B', data: micros.B, borderColor: microColors.B, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Zn', data: micros.Zn, borderColor: microColors.Zn, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Cu', data: micros.Cu, borderColor: microColors.Cu, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Mo', data: micros.Mo, borderColor: microColors.Mo, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10, generateLabels: chart => chart.data.datasets.map((ds, i) => ({ text: ds.label || '', fillStyle: ds.borderColor, strokeStyle: ds.borderColor, lineWidth: ds.borderWidth || 2, hidden: !chart.isDatasetVisible(i), datasetIndex: i, fontColor: ds.borderColor, pointStyle: 'circle' })) } } }, scales: { y: { title: { display: true, text: 'Kg de nutriente' } }, x: { title: { display: true, text: fertiTimeUnit === 'mes' ? 'Etapa' : 'Etapa' } } } }
      });
    }
  });
}

/**
 * Genera imágenes de las gráficas Macro/Micro desde datos del programa (para PDF sin depender del DOM).
 * program = { weeks: [{ totals: { N_NO3, N_NH4, ... } }], timeUnit: 'mes'|'semana' }
 * callback(result) con result = { macro: dataUrl, micro: dataUrl } o {} si falla.
 */
function getFertiChartsDataUrlsForReport(program, callback) {
  if (!program || !Array.isArray(program.weeks) || program.weeks.length === 0) {
    if (typeof callback === 'function') callback({});
    return;
  }
  loadChartJs(function() {
    const weeks = program.weeks;
    const timeUnit = program.timeUnit || 'semana';
    const labels = weeks.map(function(w, i) { return (timeUnit === 'mes' ? 'Mes' : 'Semana') + ' ' + (i + 1); });
    function mk(n) { return weeks.map(function(w) { return parseFloat(w.totals && w.totals[n]) || 0; }); }
    var macros = { N_NO3: mk('N_NO3'), N_NH4: mk('N_NH4'), P2O5: mk('P2O5'), K2O: mk('K2O'), CaO: mk('CaO'), MgO: mk('MgO'), SO4: mk('SO4') };
    var micros = { Fe: mk('Fe'), Mn: mk('Mn'), B: mk('B'), Zn: mk('Zn'), Cu: mk('Cu'), Mo: mk('Mo') };
    var macroColors = { N_NO3: '#1f77b4', N_NH4: '#2ca02c', P2O5: '#ff7f0e', K2O: '#98df8a', CaO: '#9467bd', MgO: '#17becf', SO4: '#8c564b' };
    var microColors = { Fe: '#1f77b4', Mn: '#2ca02c', B: '#ff7f0e', Zn: '#9467bd', Cu: '#8c564b', Mo: '#e377c2' };
    var macroLabels = { P2O5: 'P2O5', K2O: 'K2O', CaO: 'CaO', MgO: 'MgO' };
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
            { label: 'N(NO3)', data: macros.N_NO3, borderColor: macroColors.N_NO3, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'N(NH4)', data: macros.N_NH4, borderColor: macroColors.N_NH4, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.P2O5, data: macros.P2O5, borderColor: macroColors.P2O5, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.K2O, data: macros.K2O, borderColor: macroColors.K2O, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.CaO, data: macros.CaO, borderColor: macroColors.CaO, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: macroLabels.MgO, data: macros.MgO, borderColor: macroColors.MgO, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'SO4', data: macros.SO4, borderColor: macroColors.SO4, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 }
          ]
        },
        options: { responsive: false, maintainAspectRatio: false, animation: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true }, x: {} } }
      });
      chartMicro = new Chart(microCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Fe', data: micros.Fe, borderColor: microColors.Fe, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Mn', data: micros.Mn, borderColor: microColors.Mn, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'B', data: micros.B, borderColor: microColors.B, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Zn', data: micros.Zn, borderColor: microColors.Zn, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Cu', data: micros.Cu, borderColor: microColors.Cu, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 },
            { label: 'Mo', data: micros.Mo, borderColor: microColors.Mo, backgroundColor: 'transparent', tension: 0.3, borderWidth: 3 }
          ]
        },
        options: { responsive: false, maintainAspectRatio: false, animation: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true }, x: {} } }
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
  });
}
window.getFertiChartsDataUrlsForReport = getFertiChartsDataUrlsForReport;

function toggleFertiChartsOxideElemental(){
  fertiChartsElementalMode = !fertiChartsElementalMode;
  const btn = document.getElementById('toggleFertiChartsModeBtn');
  if (btn) btn.textContent = fertiChartsElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental';
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
    
    const payload = { weeks: fertiWeeks, columns: fertiColumns, timeUnit: fertiTimeUnit, mode: fertProgElementalMode, waterContribution: fertiWaterContributionOxide, timestamp: new Date().toISOString() };
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
    
    // PRIORIDAD 4: Fallback global
    if (!data) { 
      const g = localStorage.getItem('fertirriegoProgram_global'); 
      if (g) {
        data = JSON.parse(g);
        console.log('✅ Datos cargados desde global');
      }
    }
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
    fertiTimeUnit = (data && data.timeUnit) ? data.timeUnit : 'semana';
    if (data && data.waterContribution) {
      fertiWaterContributionOxide = { ...fertiWaterContributionOxide, ...data.waterContribution };
    } else {
      // Proyecto nuevo o sin aporte por agua guardado: no mostrar valores de otro proyecto
      fertiWaterContributionOxide = { N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0, SiO2: 0 };
    }
    fertiWeeks.forEach(w => { if (!w.kgByCol) w.kgByCol = {}; fertiColumns.forEach(c => { if (w.kgByCol[c.id] == null) w.kgByCol[c.id] = 0; }); });
    updateFertiProgramModeButtons();
    if (fertiWeeks.length === 0) addFertiWeek(); else { renderFertiWeeks(); updateFertiSummary(); }
    fertiProgramInitialized = true;
    if (typeof window !== 'undefined') {
      window.fertiProgramInitialized = true;
    }
  } catch (e) { console.error('loadFertirriegoProgram', e); addFertiWeek(); }
}

function initFertirriegoProgramUI() {
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
  window.getAllFertiMaterials = getAllFertiMaterials;
  window.getBaseFertiMaterials = getBaseFertiMaterials;
  window.openFertiNewMaterialModal = openFertiNewMaterialModal;
  window.openFertiPreloadedCatalogModal = openFertiPreloadedCatalogModal;
  window.renderFertiCustomMaterialsList = renderFertiCustomMaterialsList;
  window.removeFertiCustomMaterial = removeFertiCustomMaterial;
  window.clearFertiCustomMaterials = clearFertiCustomMaterials;
  window.openEditFertiCustomMaterial = openEditFertiCustomMaterial;
  window.toggleFertiChartsOxideElemental = toggleFertiChartsOxideElemental;
  window.loadFertiCustomMaterials = loadFertiCustomMaterials;
  window.loadFertirriegoProgram = loadFertirriegoProgram;
  window.renderFertiWeeks = renderFertiWeeks;
  window.flushFertiProgramIfDirty = flushFertiProgramIfDirty;
  // Cargar primero materiales personalizados y LUEGO el programa, para que las columnas encuentren el fertilizante agregado
  var loadPromise = loadFertiCustomMaterials();
  function afterMaterialsLoaded() {
    renderFertiCustomMaterialsList();
    loadFertirriegoProgram();
    initFertiWaterInputs();
    try { if (fertiProgAutoTimer) clearInterval(fertiProgAutoTimer); } catch {}
    fertiProgAutoTimer = setInterval(function() { if (fertiProgDirty) { try { saveFertirriegoProgram(); } catch {} } }, 20000);
    window.addEventListener('beforeunload', function() { try { if (fertiProgDirty) saveFertirriegoProgram(); } catch {} });
    setFertiNutrientView(fertiNutrientView);
    try {
      requestAnimationFrame(function() {
        if (!fertiWeeks || fertiWeeks.length === 0) addFertiWeek(); else renderFertiWeeks();
        updateFertiSummary();
      });
      setTimeout(function() {
        var container = document.getElementById('fertiWeeksContainer');
        if (container && !container.querySelector('table')) {
          if (!fertiWeeks || fertiWeeks.length === 0) addFertiWeek(); else renderFertiWeeks();
          updateFertiSummary();
        }
      }, 400);
    } catch (e) {}
  }
  if (loadPromise && typeof loadPromise.then === 'function') {
    loadPromise.then(afterMaterialsLoaded).catch(function() { afterMaterialsLoaded(); });
  } else {
    afterMaterialsLoaded();
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


// ========= Modal: Nuevo fertilizante soluble =========
function openFertiNewMaterialModal() {
  try { const existing = document.querySelector('.material-modal-overlay'); if (existing) existing.remove(); } catch {}

  const overlay = document.createElement('div');
  overlay.className = 'material-modal-overlay';
  overlay.innerHTML = `
    <div class="material-modal">
      <div class="modal-header">
        <h3 style="margin:0;display:flex;align-items:center;gap:8px;">➕ Nueva Materia Prima Personalizada</h3>
        <button class="btn btn-secondary btn-sm" onclick="this.closest('.material-modal-overlay').remove()">✕</button>
      </div>
      <div class="material-modal-body">
        <div class="form-group">
          <label>Nombre de la Materia Prima:</label>
          <input type="text" id="fertiCustom_name" placeholder="Ej: Nitrato de Calcio">
        </div>
        <div class="form-group">
          <label>Concentración de Nutrientes (%):</label>
          <div class="nutrient-inputs-grid">
            <div class="nutrient-input"><label>N(NO3):</label><input type="number" id="fertiCustom_N_NO3" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>N(NH4):</label><input type="number" id="fertiCustom_N_NH4" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>P₂O₅:</label><input type="number" id="fertiCustom_P2O5" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>K₂O:</label><input type="number" id="fertiCustom_K2O" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>CaO:</label><input type="number" id="fertiCustom_CaO" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>MgO:</label><input type="number" id="fertiCustom_MgO" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>S:</label><input type="number" id="fertiCustom_S" step="0.01" placeholder="0.00"></div>
            <div class="nutrient-input"><label>SO₄:</label><input type="number" id="fertiCustom_SO4" step="0.01" placeholder="0.00"></div>
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
          <label>Fertilizantes solubles personalizados:</label>
          <div id="fertiCustomMaterialsList" style="margin-top:6px;"></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
            <button class="btn btn-info btn-sm" onclick="openFertiPreloadedCatalogModal()" title="Consultar concentraciones de fertilizantes precargados">📋 Ver fertilizantes disponibles</button>
            <button class="btn btn-secondary btn-sm" onclick="clearFertiCustomMaterials()">🧹 Limpiar catálogo</button>
          </div>
        </div>
        <div class="material-modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.material-modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-primary" id="fertiCustom_saveBtn">Agregar Materia Prima</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.dataset.editMode = 'false';
  overlay.dataset.editKey = '';
  renderFertiCustomMaterialsList();

  // Guardar
  overlay.querySelector('#fertiCustom_saveBtn').addEventListener('click', () => {
    if (overlay.dataset.editMode === 'true') {
      updateFertiCustomMaterial(overlay);
      return;
    }
    const getNum = id => { const v = parseFloat(overlay.querySelector('#'+id).value); return isNaN(v) ? 0 : Math.max(0, v); };
    const name = (overlay.querySelector('#fertiCustom_name').value || '').trim();
    if (!name) { if (window.showMessage) window.showMessage('Escribe un nombre', 'warning'); return; }
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
      S: getNum('fertiCustom_S'),
      Fe: getNum('fertiCustom_Fe'),
      Mn: getNum('fertiCustom_Mn'),
      Zn: getNum('fertiCustom_Zn'),
      Cu: getNum('fertiCustom_Cu'),
      B: getNum('fertiCustom_B'),
      Mo: getNum('fertiCustom_Mo'),
      SiO2: getNum('fertiCustom_SiO2')
    };

    // Siempre al catálogo de usuario (o fallback si no hay sesión) para que persista y aparezca en el programa
    fertiCustomMaterialsUser = upsertFertiMaterial(fertiCustomMaterialsUser, mat, 'user');
    saveFertiCustomMaterialsToUser();
    mergeFertiCustomMaterials();
    renderFertiWeeks();
    renderFertiCustomMaterialsList();
    if (window.showMessage) window.showMessage('✅ Fertilizante agregado', 'success');
    overlay.remove();
  });
}


