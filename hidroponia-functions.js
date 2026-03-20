// =====================================================
// HIDROPONIA - Solución por etapa y cálculo básico
// =====================================================
// Orden: Amonio primero, luego aniones (N-NO₃, P-H₂PO₄, S-SO₄), luego cationes (K⁺, Ca²⁺, Mg²⁺)
const HYDRO_MEQ_NUTRIENTS = ['N_NH4','N_NO3','P','S','K','Ca','Mg'];
const HYDRO_ANIONS = ['N_NO3','P','S'];           // % entre ellos (100% aniones)
const HYDRO_CATIONS_TRIANGLE = ['K','Ca','Mg'];   // % entre K+Ca+Mg (100%, triángulo)
// N_NH4: % del total catiónico (K+Ca+Mg+NH4), no entra al triángulo
// Mismo orden que Solución por etapa: NH₄⁺, NO₃⁻, H₂PO₄⁻, SO₄²⁻, K⁺, Ca²⁺, Mg²⁺, luego micros
const HYDRO_PPM_NUTRIENTS = ['N_NH4','N_NO3','P','S','K','Ca','Mg','Fe','Mn','B','Zn','Cu','Mo'];
const HYDRO_MICROS = ['Fe','Mn','B','Zn','Cu','Mo'];
const HYDRO_N_SPLIT = { NO3: 95, NH4: 5 };
// Conversión óxido → elemental (para materiales de fertirriego usados en hidroponía)
const HYDRO_OXIDE_TO_ELEMENTAL = { P2O5_TO_P: 2.291, K2O_TO_K: 1.204, CaO_TO_Ca: 1.399, MgO_TO_Mg: 1.658 };
const HYDRO_STAGE_OPTIONS = ['Establecimiento','Vegetativo','Prefloración','Floración','Amarre','Llenado','Cosecha'];
const HYDRO_EQ_WEIGHTS = {
  N_NO3: 14.0,   // NO3- equiv.
  N_NH4: 14.0,   // NH4+ equiv.
  P: 31.0,       // H2PO4-
  K: 39.1,
  Ca: 20.04, // 40.08/2
  Mg: 12.15, // 24.3/2
  S: 16.03   // SO4 2-
};

function hydroComputeCE(stage) {
  const meq = stage.meq || {};
  const sumMeq = (parseFloat(meq.N_NO3) || 0) + (parseFloat(meq.N_NH4) || 0) + (parseFloat(meq.P) || 0) +
    (parseFloat(meq.K) || 0) + (parseFloat(meq.Ca) || 0) + (parseFloat(meq.Mg) || 0) + (parseFloat(meq.S) || 0);
  // CE (dS/m) = suma de meq / 20
  const ce = sumMeq / 20;
  return isNaN(ce) ? 0 : ce;
}

/** Texto plano (p. ej. title=""); no incluye HTML */
function hydroLabelPlain(n) {
  switch (n) {
    case 'N_NH4': return 'N-NH₄⁺';
    case 'N_NO3': return 'N-NO₃⁻';
    case 'P': return 'P-H₂PO₄⁻';
    case 'S': return 'S-SO₄²⁻';
    case 'K': return 'K⁺';
    case 'Ca': return 'Ca²⁺';
    case 'Mg': return 'Mg²⁺';
    default: return n;
  }
}
/** Etiqueta visible: envuelta para que Google Translate no altere símbolos (Fe, Ca, meq/L, ppm) */
function hydroLabelHtml(n) {
  return '<span class="notranslate" translate="no">' + hydroLabelPlain(n) + '</span>';
}
function hydroLabel(n) {
  return hydroLabelPlain(n);
}

const HYDRO_TANQUES = ['A', 'B', 'C', 'D', 'E'];

/** Icono inline de depósito cilíndrico; `currentColor` hereda el color del título por tanque */
function hydroTankBlockIconHtml() {
  return '<span class="hydro-tank-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" fill="none"><path d="M6 18.5c0-1.1 2.4-1.8 6-1.8s6 0.7 6 1.8v8.2c0 0-2.4 1.6-6 1.6s-6-1.6-6-1.6V18.5z" fill="currentColor" fill-opacity="0.14"/><ellipse cx="12" cy="8" rx="8" ry="3" stroke="currentColor" stroke-width="1.5"/><path d="M4 11v9M20 11v9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="12" cy="23" rx="8" ry="3" stroke="currentColor" stroke-width="1.5"/><path d="M6 19h12" stroke="currentColor" stroke-opacity="0.22" stroke-width="1"/></svg></span>';
}

let hydroState = {
  stages: [],
  activeStageId: null,
  water: {},
  fertilizers: [],
  volumeWaterM3: 100,
  tankVolumeL: 1000,
  injectionRateLperM3: 10
};

// Catálogo de fertilizantes solubles personalizados (hidroponía, concentración elemental %)
let hydroCustomMaterialsUser = [];

let hydroSaveTimer = null;
let hydroRenderTimer = null;

function hydroGetProjectId() {
  try { if (window.projectManager && window.projectManager.getCurrentProject) { const p = window.projectManager.getCurrentProject(); if (p && p.id) return p.id; } } catch {}
  try { if (window.currentProject && window.currentProject.id) return window.currentProject.id; } catch {}
  try { const pid = localStorage.getItem('nutriplant-current-project'); if (pid) return pid; } catch {}
  return null;
}

/** Convierte un material (óxido/ferti) a composición elemental % para hidroponía */
function hydroMaterialToElemental(mat) {
  if (!mat) return null;
  const c = HYDRO_OXIDE_TO_ELEMENTAL;
  const pct = (val, div) => (parseFloat(val) || 0) / (div || 1);
  const P = pct(mat.P2O5, c.P2O5_TO_P) || parseFloat(mat.P) || 0;
  const K = pct(mat.K2O, c.K2O_TO_K) || parseFloat(mat.K) || 0;
  const Ca = pct(mat.CaO, c.CaO_TO_Ca) || parseFloat(mat.Ca) || 0;
  const Mg = pct(mat.MgO, c.MgO_TO_Mg) || parseFloat(mat.Mg) || 0;
  const S = parseFloat(mat.S) || 0;
  const SO4 = parseFloat(mat.SO4) || 0;
  const S_ele = S > 0 ? S : (SO4 > 0 ? SO4 / 3 : 0);
  return {
    id: mat.id,
    name: mat.name || mat.id,
    unit: mat.unit || 'kg',
    density: parseFloat(mat.density) || null,
    N_NH4: parseFloat(mat.N_NH4) || 0,
    N_NO3: parseFloat(mat.N_NO3) || 0,
    P, S: S_ele, K, Ca, Mg,
    Fe: parseFloat(mat.Fe) || 0, Mn: parseFloat(mat.Mn) || 0, B: parseFloat(mat.B) || 0,
    Zn: parseFloat(mat.Zn) || 0, Cu: parseFloat(mat.Cu) || 0, Mo: parseFloat(mat.Mo) || 0
  };
}

function hydroGetCurrentUserId() {
  try { return localStorage.getItem('nutriplant_user_id'); } catch { return null; }
}

function hydroLoadUserProfile() {
  const userId = hydroGetCurrentUserId();
  if (!userId) return null;
  try {
    const raw = localStorage.getItem('nutriplant_user_' + userId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function hydroSaveUserProfile(profile) {
  const userId = hydroGetCurrentUserId();
  if (!userId || !profile) return;
  try {
    localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile));
    if (profile.customHydroMaterials && typeof profile.customHydroMaterials === 'object' && typeof window.nutriplantSyncCustomHydroMaterialsToCloud === 'function') {
      try { window.nutriplantSyncCustomHydroMaterialsToCloud(userId, profile.customHydroMaterials); } catch (e) { console.warn('Sync fertilizantes hidroponía a nube:', e); }
    }
  } catch {}
}

function hydroLoadCustomMaterialsSync() {
  try {
    const profile = hydroLoadUserProfile();
    let items = profile?.customHydroMaterials?.items;
    // Si no hay usuario o perfil, cargar desde fallback (ej. sin sesión o carga antes de auth)
    if (!Array.isArray(items) || items.length === 0) {
      try {
        const raw = localStorage.getItem('hydroCustomMaterials_global_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.items)) items = parsed.items;
          else if (Array.isArray(parsed)) items = parsed;
        }
      } catch (e) {}
    }
    hydroCustomMaterialsUser = Array.isArray(items) ? items : [];
    // Si hay sesión y había datos en fallback, subirlos al perfil/nube y limpiar fallback
    const uid = hydroGetCurrentUserId();
    if (uid) {
      try {
        const raw = localStorage.getItem('hydroCustomMaterials_global_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const fallbackItems = parsed && (Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : null));
          if (fallbackItems && fallbackItems.length > 0) {
            const seen = new Set((hydroCustomMaterialsUser || []).map(function(m) { return ((m.id || m.name) + '').toLowerCase(); }));
            fallbackItems.forEach(function(m) {
              var key = ((m.id || m.name) + '').toLowerCase();
              if (!seen.has(key)) {
                hydroCustomMaterialsUser.push(m);
                seen.add(key);
              }
            });
            hydroSaveCustomMaterials();
            localStorage.removeItem('hydroCustomMaterials_global_user');
          }
        }
      } catch (e) {}
    }
  } catch { hydroCustomMaterialsUser = []; }
}

function ensureHydroCustomMaterialsLoadedFromCloud() {
  const userId = hydroGetCurrentUserId();
  if (!userId) return Promise.resolve();
  if (typeof window.nutriplantFetchCustomHydroMaterialsFromCloud !== 'function') return Promise.resolve();
  return window.nutriplantFetchCustomHydroMaterialsFromCloud(userId).then(function(cloudData) {
    if (cloudData && typeof cloudData === 'object' && Array.isArray(cloudData.items) && cloudData.items.length > 0) {
      var profile = hydroLoadUserProfile() || {};
      profile.customHydroMaterials = cloudData;
      try { localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile)); } catch (e) {}
      console.log('✅ Fertilizantes hidroponía personalizados cargados desde la nube');
    }
  }).catch(function() {});
}

function hydroLoadCustomMaterials() {
  hydroLoadCustomMaterialsSync();
  ensureHydroCustomMaterialsLoadedFromCloud().then(function() {
    hydroLoadCustomMaterialsSync();
    var list = document.getElementById('hydroCustomMaterialsList');
    if (list && typeof renderHydroCustomMaterialsList === 'function') renderHydroCustomMaterialsList();
  });
}

function hydroSaveCustomMaterials() {
  try {
    const items = Array.isArray(hydroCustomMaterialsUser) ? hydroCustomMaterialsUser : [];
    const userId = hydroGetCurrentUserId();
    if (userId) {
      const profile = hydroLoadUserProfile() || {};
      profile.customHydroMaterials = { items };
      hydroSaveUserProfile(profile);
    } else {
      // Sin sesión: persistir en localStorage para que sobreviva al reinicio de página
      try {
        localStorage.setItem('hydroCustomMaterials_global_user', JSON.stringify({ items }));
      } catch (e) {}
    }
  } catch {}
}

/** Lista de materiales solubles en forma elemental para hidroponía (base + personalizados) */
function getAllHydroMaterials() {
  hydroLoadCustomMaterials();
  const base = (typeof window.getAllFertiMaterials === 'function')
    ? window.getAllFertiMaterials()
    : [];
  const elemental = base.map(m => hydroMaterialToElemental(m));
  const custom = (hydroCustomMaterialsUser || []).map(m => ({
    ...m,
    id: m.id || 'hydro_' + (m.name || '').replace(/\s/g, '_'),
    name: m.name || m.id
  }));
  const byId = new Map();
  elemental.forEach(m => { if (m && m.id) byId.set(String(m.id), m); });
  custom.forEach(m => { if (m && m.id) byId.set(String(m.id), m); });
  return Array.from(byId.values());
}

function hydroLoadData() {
  const pid = hydroGetProjectId();
  if (!pid) return null;
  try {
    if (window.projectStorage) {
      const section = window.projectStorage.loadSection('hidroponia', pid);
      if (section) return section;
    }
  } catch {}
  try {
    const key = `nutriplant_project_${pid}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.sections && o.sections.hidroponia) return o.sections.hidroponia;
      if (o && o.hidroponia) return o.hidroponia;
      if (o && o.hydroponics) return o.hydroponics;
    }
  } catch {}
  return null;
}

function hydroSaveData() {
  try {
    const pid = hydroGetProjectId();
    if (!pid) return;
    const vol = parseFloat(hydroState.volumeWaterM3) || 100;
    const allMats = getAllHydroMaterials();
    const fertilizersToSave = hydroState.fertilizers.map(f => {
      const mat = allMats.find(m => m.id === f.materialId);
      const displayName = (mat && (mat.name || mat.id)) || f.name || f.materialId || '';
      if (f.materialId != null && f.materialId !== '') {
        const { dose, contributions } = hydroFertRowComputed(f);
        return { ...f, dose, contributions, name: displayName };
      }
      const dose = parseFloat(f.dose) || 0;
      const contributions = hydroFertRowContributionsLegacy(f);
      return { ...f, dose, contributions, name: displayName || f.name || '' };
    });
    const fertilizerTotalsPpm = {};
    HYDRO_PPM_NUTRIENTS.forEach(n => { fertilizerTotalsPpm[n] = 0; });
    fertilizersToSave.forEach(f => {
      const c = f.contributions || {};
      HYDRO_PPM_NUTRIENTS.forEach(n => { fertilizerTotalsPpm[n] += (parseFloat(c[n]) || 0); });
    });
    hydroLoadCustomMaterials();
    const payload = {
      stages: hydroState.stages,
      activeStageId: hydroState.activeStageId,
      volumeWaterM3: hydroState.volumeWaterM3,
      tankVolumeL: hydroState.tankVolumeL,
      injectionRateLperM3: hydroState.injectionRateLperM3,
      water: hydroState.water,
      fertilizers: fertilizersToSave,
      fertilizerTotalsPpm,
      customMaterials: { items: Array.isArray(hydroCustomMaterialsUser) ? hydroCustomMaterialsUser : [] }
    };
    if (window.projectStorage) {
      window.projectStorage.saveSection('hidroponia', payload, pid);
    } else {
      const key = `nutriplant_project_${pid}`;
      const raw = localStorage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      obj.sections = obj.sections || {};
      obj.sections.hidroponia = payload;
      localStorage.setItem(key, JSON.stringify(obj));
    }
  } catch (e) {
    console.warn('⚠️ Error guardando Hidroponia:', e);
  }
}

function hydroScheduleSave() {
  try { if (hydroSaveTimer) clearTimeout(hydroSaveTimer); } catch {}
  hydroSaveTimer = setTimeout(() => {
    hydroSaveData();
  }, 300);
}

function hydroScheduleRender() {
  try { if (hydroRenderTimer) clearTimeout(hydroRenderTimer); } catch {}
  hydroRenderTimer = setTimeout(() => {
    const activeEl = document.activeElement;
    const inHydroInput = activeEl && activeEl.closest && activeEl.closest('.hydroponia-container') &&
      activeEl.matches('input, select, textarea');
    if (inHydroInput) {
      hydroScheduleRender();
      return;
    }
    renderHydroStageTable();
    renderHydroNitrogenSummary();
    renderHydroTriangle();
    renderHydroObjective();
    renderHydroMissing();
    renderHydroFertTotals();
  }, 500);
}

function hydroDefaultStage(name) {
  // Etapa limpia sin meq (inicio de proyecto y al agregar nueva etapa)
  const baseMeq = {
    N_NO3: 0, N_NH4: 0, P: 0, K: 0, Ca: 0, Mg: 0, S: 0
  };
  return {
    id: 'stage_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: name || 'Nueva etapa',
    ce: '',
    meq: { ...baseMeq },
    ppm: { N_NO3: 0, N_NH4: 0, P: 0, K: 0, Ca: 0, Mg: 0, S: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0 }
  };
}

function hydroEnsureDefaults() {
  if (!Array.isArray(hydroState.stages) || hydroState.stages.length === 0) {
    const s1 = hydroDefaultStage('Vegetativo');
    hydroState.stages = [s1];
    hydroState.activeStageId = null;
  }
  if (!hydroState.water) hydroState.water = {};
  if (!Array.isArray(hydroState.fertilizers)) hydroState.fertilizers = [];
}

function hydroGetActiveStage() {
  return hydroState.stages.find(s => s.id === hydroState.activeStageId) || hydroState.stages[0] || null;
}

function hydroComputeMacroPpm(stage) {
  const ppm = {};
  const nNo3 = parseFloat(stage.meq?.N_NO3 || 0);
  const nNh4 = parseFloat(stage.meq?.N_NH4 || 0);
  ppm.N_NO3 = nNo3 * (HYDRO_EQ_WEIGHTS.N_NO3 || 0);
  ppm.N_NH4 = nNh4 * (HYDRO_EQ_WEIGHTS.N_NH4 || 0);
  ['P','K','Ca','Mg','S'].forEach(n => {
    const meq = parseFloat(stage.meq?.[n] || 0);
    const eqw = HYDRO_EQ_WEIGHTS[n] || 0;
    ppm[n] = meq * eqw;
  });
  return ppm;
}

function renderHydroStageTable() {
  const meqWrap = document.getElementById('hydroMeqTableWrap');
  const ppmWrap = document.getElementById('hydroPpmTableWrap');
  const pctWrap = document.getElementById('hydroMeqPercentWrap');
  if (!meqWrap || !ppmWrap || !pctWrap) return;

  var savedMeqScroll = (meqWrap.firstElementChild && typeof meqWrap.firstElementChild.scrollLeft === 'number') ? meqWrap.firstElementChild.scrollLeft : 0;
  var savedPpmScroll = (ppmWrap.firstElementChild && typeof ppmWrap.firstElementChild.scrollLeft === 'number') ? ppmWrap.firstElementChild.scrollLeft : 0;
  var savedPctScroll = (pctWrap.firstElementChild && typeof pctWrap.firstElementChild.scrollLeft === 'number') ? pctWrap.firstElementChild.scrollLeft : 0;

  const meqRows = hydroState.stages.map(stage => {
    const computedCe = hydroComputeCE(stage);
    stage.ce = computedCe.toFixed(2);
    return `
      <tr data-stage-id="${stage.id}">
        <td>
          <select class="hydro-input hydro-stage-select" data-stage-id="${stage.id}" data-field="name">
            ${HYDRO_STAGE_OPTIONS.map(opt => `<option ${opt === stage.name ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </td>
        <td><input class="hydro-input" data-stage-id="${stage.id}" data-field="ce" type="number" step="0.01" value="${stage.ce ?? ''}" readonly></td>
        ${HYDRO_MEQ_NUTRIENTS.map(n => `<td class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}"><input class="hydro-input" data-stage-id="${stage.id}" data-type="meq" data-nutrient="${n}" type="number" step="0.1" value="${stage.meq?.[n] ?? 0}"></td>`).join('')}
      </tr>
    `;
  }).join('');

  meqWrap.innerHTML = `
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored">
        <thead>
          <tr>
            <th>Etapa</th>
            <th>CE (dS/m)</th>
            ${HYDRO_MEQ_NUTRIENTS.map(n => `<th class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${hydroLabelHtml(n)} <span class="notranslate" translate="no">(meq/L)</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>${meqRows}</tbody>
      </table>
    </div>
  `;

  const ppmRows = hydroState.stages.map(stage => {
    const computedCe = hydroComputeCE(stage);
    stage.ce = computedCe.toFixed(2);
    const macroPpm = hydroComputeMacroPpm(stage);
    stage.ppm = { ...stage.ppm, ...macroPpm };
    return `
      <tr>
        <td>${stage.name || ''}</td>
        <td>${stage.ce ?? ''}</td>
        ${HYDRO_MEQ_NUTRIENTS.map(n => `<td class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${(macroPpm[n] || stage.ppm?.[n] || 0).toFixed(1)}</td>`).join('')}
        ${HYDRO_MICROS.map((n, idx) => `<td class="${idx === 0 ? 'hydro-micro-start' : ''}"><input class="hydro-input" data-stage-id="${stage.id}" data-type="ppm" data-nutrient="${n}" type="number" step="0.01" value="${stage.ppm?.[n] ?? 0}"></td>`).join('')}
      </tr>
    `;
  }).join('');

  ppmWrap.innerHTML = `
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored">
        <thead>
          <tr>
            <th>Etapa</th>
            <th>CE (dS/m)</th>
            ${HYDRO_MEQ_NUTRIENTS.map(n => `<th class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${hydroLabelHtml(n)} <span class="notranslate" translate="no">ppm</span></th>`).join('')}
            ${HYDRO_MICROS.map((n, idx) => `<th class="${idx === 0 ? 'hydro-micro-start' : ''}">${hydroLabelHtml(n)} <span class="notranslate" translate="no">ppm</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>${ppmRows}</tbody>
      </table>
    </div>
  `;

  const pctRows = hydroState.stages.map(stage => {
    const sumAnions = HYDRO_ANIONS.reduce((acc, n) => acc + (parseFloat(stage.meq?.[n] || 0)), 0);
    const sumKCaMg = HYDRO_CATIONS_TRIANGLE.reduce((acc, n) => acc + (parseFloat(stage.meq?.[n] || 0)), 0);
    const totalCations = sumKCaMg + (parseFloat(stage.meq?.N_NH4 || 0));
    const pct = {};
    HYDRO_MEQ_NUTRIENTS.forEach(n => {
      const val = parseFloat(stage.meq?.[n] || 0);
      if (HYDRO_ANIONS.includes(n)) {
        pct[n] = sumAnions > 0 ? (val / sumAnions) * 100 : 0;
      } else if (HYDRO_CATIONS_TRIANGLE.includes(n)) {
        pct[n] = sumKCaMg > 0 ? (val / sumKCaMg) * 100 : 0;
      } else {
        // N_NH4: % del total catiónico (K+Ca+Mg+NH4)
        pct[n] = totalCations > 0 ? (val / totalCations) * 100 : 0;
      }
    });
    return `
      <tr>
        <td>${stage.name || ''}</td>
        ${HYDRO_MEQ_NUTRIENTS.map(n => `<td class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${pct[n].toFixed(1)}</td>`).join('')}
      </tr>
    `;
  }).join('');

  pctWrap.innerHTML = `
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored">
        <thead>
          <tr>
            <th>Etapa</th>
            ${HYDRO_MEQ_NUTRIENTS.map(n => `<th class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${hydroLabelHtml(n)} <span class="notranslate" translate="no">% meq</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>${pctRows}</tbody>
      </table>
    </div>
  `;

  if (meqWrap.firstElementChild) meqWrap.firstElementChild.scrollLeft = savedMeqScroll;
  if (ppmWrap.firstElementChild) ppmWrap.firstElementChild.scrollLeft = savedPpmScroll;
  if (pctWrap.firstElementChild) pctWrap.firstElementChild.scrollLeft = savedPctScroll;
}

// Límites de equilibrio (min–max %) para generar la zona matemáticamente
const HYDRO_ANION_LIMITS = { NO3: [20, 80], H2PO4: [1.25, 10], SO4: [10, 70] };
const HYDRO_CATION_LIMITS = { K: [10, 65], Ca: [22.5, 62.5], Mg: [0.5, 40] };

// Polígono de equilibrio ANIONES.
// Misma situación que cationes: cada anión está en su línea base; 0% en su línea, 100% en la esquina contraria.
// La figura (amarilla) se ubica en otra zona porque los mín/máx son otros. Fuera de estos rangos puede haber antagonismos.
// NO3 (línea de abajo): mín 20%, máx 80%. H2PO4 (línea derecha): mín 1.25%, máx 10%. SO4 (línea izquierda): mín 10%, máx 70%.
function hydroEquilibriumPolygonAnions() {
  // [no3, h2po4, so4] con no3+h2po4+so4=100
  const a1 = [20, 10, 70];        // NO3=20, H2PO4=10 → SO4=70 (NO3 mín, SO4 máx)
  const a2 = [28.75, 1.25, 70];   // SO4=70, H2PO4=1.25 → NO3=28.75 (SO4 máx, H2PO4 mín)
  const a3 = [80, 1.25, 18.75];   // NO3=80, H2PO4=1.25 (NO3 máx, H2PO4 mín)
  const a4 = [80, 10, 10];        // NO3=80, H2PO4=10, SO4=10 (NO3 máx, SO4 mín)
  // Orden cíclico: borde NO3=20 → SO4=70 → NO3=80 → H2PO4=10
  return [a1, a2, a3, a4];
}

// Polígono de equilibrio CATIONES.
// Lógica: 0% = sobre la línea del elemento; 100% = esquina contraria. Avance en paralelo a su línea.
// K (línea de abajo): mín 10%, máx 65%; referencia % a la izquierda (10 abajo → 100 arriba).
// Mg (línea izquierda): mín 5% (como en el autor), máx 40%; referencia % a la derecha (0 arriba → 100 abajo).
// Ca (línea derecha): mín 22.5%, máx 62.5%; referencia % en la base (0 derecha → 100 izquierda).
// Los vértices del polígono = intersecciones de esos mín/máx; la figura es la zona de equilibrio.
function hydroEquilibriumPolygonCations() {
  const c1 = [10, 62.5, 27.5];   // K=10, Ca=62.5 → Mg=27.5 (K mín, Ca máx)
  const c2 = [32.5, 62.5, 5];    // Ca=62.5, Mg=5 → K=32.5 (Ca máx, Mg mín 5%)
  const c3 = [65, 30, 5];        // K=65, Mg=5 → Ca=30 (K máx, Mg mín 5%)
  const c4 = [65, 22.5, 12.5];  // K=65, Ca=22.5 (K máx, Ca mín)
  const c5 = [37.5, 22.5, 40];  // Ca=22.5, Mg=40 (Ca mín, Mg máx)
  const c6 = [10, 50, 40];       // K=10, Mg=40 → Ca=50 (K mín, Mg máx)
  return [c1, c2, c3, c4, c5, c6];
}

// Point-in-polygon (ray casting)
function hydroPointInPolygon(px, py, vertsXY) {
  let inside = false;
  const n = vertsXY.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertsXY[i].x, yi = vertsXY[i].y, xj = vertsXY[j].x, yj = vertsXY[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Intersección segmento (A→B) con segmento (C→D). Retorna t tal que P = A + t*(B-A) o null.
function hydroSegmentIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const v1x = bx - ax, v1y = by - ay, v2x = dx - cx, v2y = dy - cy, wx = cx - ax, wy = cy - ay;
  const denom = v1x * v2y - v1y * v2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = (wx * v2y - wy * v2x) / denom;
  const s = (wx * v1y - wy * v1x) / denom;
  if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return t;
  return null;
}

// Recorta polígono por semiplano: se mantienen los puntos a la derecha de la recta A→B (cruz negativa; la zona que “cortamos” es la de la izquierda).
// Retorna array de {x,y} (puede ser vacío o con menos vértices).
function hydroClipPolygonByLine(pts, ax, ay, bx, by, keepSide) {
  const cross = (px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const keep = keepSide || ((c) => c <= 0);
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const cur = pts[i], next = pts[(i + 1) % n];
    const cCur = cross(cur.x, cur.y), cNext = cross(next.x, next.y);
    if (keep(cCur)) {
      if (keep(cNext)) out.push(next);
      else {
        const denom = cCur - cNext;
        if (Math.abs(denom) > 1e-12) {
          const t = cCur / denom;
          out.push({ x: cur.x + t * (next.x - cur.x), y: cur.y + t * (next.y - cur.y) });
        }
      }
    } else {
      if (keep(cNext)) {
        const denom = cCur - cNext;
        if (Math.abs(denom) > 1e-12) {
          const t = cCur / denom;
          out.push({ x: cur.x + t * (next.x - cur.x), y: cur.y + t * (next.y - cur.y) });
        }
        out.push(next);
      }
    }
  }
  return out;
}

// Baricéntricas: P = (pA/100)*vA + (pB/100)*vB + (pC/100)*vC
function hydroBaryToXY(vA, vB, vC, pA, pB, pC) {
  return {
    x: (vA.x * pA + vB.x * pB + vC.x * pC) / 100,
    y: (vA.y * pA + vB.y * pB + vC.y * pC) / 100
  };
}

function hydroDrawCombinedTernary(container, data) {
  if (!container) return;
  const width = 460, height = 430, pad = 44;
  const base = width - 2 * pad;
  const triHeight = base * Math.sqrt(3) / 2;
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  // Regla fija: 0% = sobre la LÍNEA del elemento; 100% = esquina CONTRARIA a esa línea (como en el ejemplo).
  // Línea de abajo → 100% en punta de arriba (vTop). Línea derecha → 100% en esquina abajo-izq (vLeft). Línea izquierda → 100% en esquina abajo-der (vRight).
  const vTop = { x: width / 2, y: pad };                      // 100% K, 100% NO₃ (opuesto a la base)
  const vLeft = { x: pad, y: pad + triHeight };               // 100% Ca, 100% H₂PO₄ (opuesto a línea derecha)
  const vRight = { x: width - pad, y: pad + triHeight };      // 100% Mg, 100% SO₄ (opuesto a línea izquierda)

  const toXY_cation = (k, ca, mg) => hydroBaryToXY(vTop, vLeft, vRight, k, ca, mg);
  const toXY_anion = (no3, h2po4, so4) => hydroBaryToXY(vTop, vLeft, vRight, no3, h2po4, so4);

  // Rejilla del triángulo grande (10% pasos)
  let grid = '';
  for (let i = 1; i <= 9; i++) {
    const t = i / 10;
    grid += `<line x1="${vTop.x + (vLeft.x - vTop.x) * t}" y1="${vTop.y + (vLeft.y - vTop.y) * t}" x2="${vTop.x + (vRight.x - vTop.x) * t}" y2="${vTop.y + (vRight.y - vTop.y) * t}" stroke="#93c5fd" stroke-width="0.6" />`;
    grid += `<line x1="${vLeft.x + (vRight.x - vLeft.x) * t}" y1="${vLeft.y + (vRight.y - vLeft.y) * t}" x2="${vLeft.x + (vTop.x - vLeft.x) * t}" y2="${vLeft.y + (vTop.y - vLeft.y) * t}" stroke="#93c5fd" stroke-width="0.6" />`;
    grid += `<line x1="${vRight.x + (vTop.x - vRight.x) * t}" y1="${vRight.y + (vTop.y - vRight.y) * t}" x2="${vRight.x + (vLeft.x - vRight.x) * t}" y2="${vRight.y + (vLeft.y - vRight.y) * t}" stroke="#93c5fd" stroke-width="0.6" />`;
  }

  const normalize = (a, b, c) => {
    let pa = Math.max(0, Math.min(100, a)), pb = Math.max(0, Math.min(100, b)), pc = Math.max(0, Math.min(100, c));
    const sum = pa + pb + pc;
    if (sum > 0 && Math.abs(sum - 100) > 0.01) { pa = (pa / sum) * 100; pb = (pb / sum) * 100; pc = (pc / sum) * 100; }
    return [pa, pb, pc];
  };

  // Línea de corte: coordenadas (K, Ca, Mg) deben sumar 100% para el triángulo
  const catZonePtsFull = (data.cationZone || []).map(([k, ca, mg]) => toXY_cation(k, ca, mg));
  const cutLineStart = toXY_cation(10, 50, 40);  // abajo: 10+50+40=100 ✓
  const norm = (a, b, c) => { const s = a + b + c; return s > 0 ? [a/s*100, b/s*100, c/s*100] : [a, b, c]; };
  const [k65, ca25, mg15] = norm(65, 25, 15);   // arriba: 65+25+15=105 → normalizar a 100%
  const cutLineEnd = toXY_cation(k65, ca25, mg15);
  const cut55K = `<line x1="${cutLineStart.x}" y1="${cutLineStart.y}" x2="${cutLineEnd.x}" y2="${cutLineEnd.y}" stroke="#b91c1c" stroke-width="1.5" stroke-dasharray="6,4" />`;
  // Polígono de cationes recortado por esa línea: se mantiene el lado que contiene vLeft (zona izquierda)
  let catZonePts = catZonePtsFull;
  if (catZonePtsFull.length >= 3) {
    const cross = (px, py) => (cutLineEnd.x - cutLineStart.x) * (py - cutLineStart.y) - (cutLineEnd.y - cutLineStart.y) * (px - cutLineStart.x);
    const keepSign = Math.sign(cross(vLeft.x, vLeft.y)) || 1;
    const keepSide = (c) => c * keepSign >= 0;
    catZonePts = hydroClipPolygonByLine(catZonePtsFull, cutLineStart.x, cutLineStart.y, cutLineEnd.x, cutLineEnd.y, keepSide);
  }

  // Contorno de figura con mezcla de línea continua y punteada (como en el ejemplo)
  const polygonWithMixedStroke = (pts, fillColor, strokeColor, strokeWidth = 2, dashedFn) => {
    if (!pts || pts.length < 3) return '';
    const ptsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
    let path = `<polygon points="${ptsStr}" fill="${fillColor}" stroke="none" />`;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const dashed = dashedFn ? dashedFn(a, b, i, pts) : i % 2 === 1;
      path += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashed ? 'stroke-dasharray="5,4"' : ''} />`;
    }
    return path;
  };

  // Zona y punto CATIONES (relleno + borde con tramos sólidos y punteados; ya usa catZonePts recortado arriba)
  const catMaxY = catZonePts.length ? Math.max(...catZonePts.map(p => p.y)) : 0;
  const catDashedFn = (a, b, i) => {
    const isBottom = catMaxY > 0 && Math.abs(a.y - catMaxY) < 2 && Math.abs(b.y - catMaxY) < 2;
    if (isBottom) return false; // borde inferior (Mg 5%) sólido, sin piquito
    return i % 2 === 1;
  };
  const catPoly = catZonePts.length >= 3
    ? polygonWithMixedStroke(catZonePts, 'rgba(185,28,28,0.28)', '#b91c1c', 2, catDashedFn)
    : '';
  const [pK, pCa, pMg] = normalize(data.pK, data.pCa, data.pMg);
  const catPoint = toXY_cation(pK, pCa, pMg);
  const catInside = catZonePts.length >= 3 && hydroPointInPolygon(catPoint.x, catPoint.y, catZonePts);
  const catCircle = `<circle cx="${catPoint.x}" cy="${catPoint.y}" r="6" fill="${catInside ? '#ef4444' : '#b91c1c'}" stroke="#7f1d1d" stroke-width="1.2" />`;

  // Zona y punto ANIONES (relleno + borde con tramos sólidos y punteados)
  const anZonePts = (data.anionZone || []).map(([no3, h2po4, so4]) => toXY_anion(no3, h2po4, so4));
  const anPoly = anZonePts.length >= 3
    ? polygonWithMixedStroke(anZonePts, 'rgba(234,179,8,0.35)', '#ca8a04')
    : '';
  const [pNO3, pH2PO4, pSO4] = normalize(data.pNO3, data.pH2PO4, data.pSO4);
  const anPoint = toXY_anion(pNO3, pH2PO4, pSO4);
  const anInside = anZonePts.length >= 3 && hydroPointInPolygon(anPoint.x, anPoint.y, anZonePts);
  const anCircle = `<circle cx="${anPoint.x}" cy="${anPoint.y}" r="6" fill="${anInside ? '#eab308' : '#b45309'}" stroke="#92400e" stroke-width="1.2" />`;

  // Como en el ejemplo: en las esquinas solo 100 (sin 0). Escalas de 10 en 10 hasta 100.
  // Base: de derecha abajo hacia izquierda → 10, 20, ..., 90 (100 en esquina izq).
  // Línea izquierda: de abajo hacia arriba → 10, 20, ..., 90 (100 arriba).
  // Línea derecha: de arriba hacia abajo → 10, 20, ..., 90 (100 arriba).
  let tickLabels = '';
  for (let i = 1; i <= 9; i++) {
    const v = i * 10;
    const tBase = 1 - i / 10;   // base: 10 cerca de vRight, 90 cerca de vLeft
    const tLeft = 1 - i / 10;   // izquierda: 10 abajo, 90 arriba
    const tRight = i / 10;      // derecha: 10 cerca de vTop, 90 hacia abajo
    const basePos = lerp(vLeft, vRight, tBase);
    const leftPos = lerp(vTop, vLeft, tLeft);
    const rightPos = lerp(vTop, vRight, tRight);
    tickLabels += `<text x="${basePos.x}" y="${basePos.y + 14}" text-anchor="middle" font-size="10" fill="#64748b">${v}</text>`;
    tickLabels += `<text x="${leftPos.x - 8}" y="${leftPos.y + 2}" text-anchor="end" font-size="10" fill="#64748b">${v}</text>`;
    tickLabels += `<text x="${rightPos.x + 8}" y="${rightPos.y + 2}" text-anchor="start" font-size="10" fill="#64748b">${v}</text>`;
  }
  tickLabels += `<text x="${vTop.x}" y="${vTop.y - 10}" text-anchor="middle" font-size="11" fill="#64748b">100</text>`;
  tickLabels += `<text x="${vLeft.x - 10}" y="${vLeft.y + 4}" text-anchor="end" font-size="10" fill="#64748b">100</text>`;
  tickLabels += `<text x="${vRight.x + 10}" y="${vRight.y + 4}" text-anchor="start" font-size="10" fill="#64748b">100</text>`;

  /* Etiquetas de arista: fuera del triángulo, en la dirección opuesta al vértice opuesto (no desde el centroide; evita solaparse con la rejilla). */
  const outwardFromEdge = (va, vb, vOpp, dist) => {
    const mx = (va.x + vb.x) / 2;
    const my = (va.y + vb.y) / 2;
    const ix = vOpp.x - mx;
    const iy = vOpp.y - my;
    const len = Math.sqrt(ix * ix + iy * iy) || 1;
    return { x: mx - (ix / len) * dist, y: my - (iy / len) * dist };
  };
  const foNs = 'http://www.w3.org/1999/xhtml';
  const foStyle = 'font-size:12px;font-weight:bold;color:#334155;line-height:1.25;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  const lw = 200;
  const lh = 48;
  const labelDist = 52;
  const labelNudgeX = 10;
  const lCraw = outwardFromEdge(vTop, vLeft, vRight, labelDist);
  const rCraw = outwardFromEdge(vTop, vRight, vLeft, labelDist);
  const bCraw = outwardFromEdge(vLeft, vRight, vTop, labelDist + 10);
  const lC = { x: lCraw.x + labelNudgeX, y: lCraw.y };
  const rC = { x: rCraw.x + labelNudgeX, y: rCraw.y };
  const bC = { x: bCraw.x + labelNudgeX, y: bCraw.y };
  const divCell = `${foStyle}text-align:center;display:flex;align-items:center;justify-content:center;height:100%;width:100%;pointer-events:none;box-sizing:border-box;`;
  const fo = (cx, cy, html) =>
    `<foreignObject x="${cx - lw / 2}" y="${cy - lh / 2}" width="${lw}" height="${lh}">` +
    `<div xmlns="${foNs}" class="notranslate" translate="no" style="${divCell}">${html}</div></foreignObject>`;
  const edgeLabels = fo(lC.x, lC.y, 'Mg²⁺ / SO₄²⁻') + fo(rC.x, rC.y, 'Ca²⁺ / H₂PO₄⁻') + fo(bC.x, bC.y, 'K⁺ / NO₃⁻');

  /* SVG + texto: envolver en notranslate (Chrome Translate suele borrar o romper <text> en SVG) */
  container.innerHTML = `
    <div class="hydro-ternary-svg-wrap notranslate" translate="no">
    <svg xmlns="http://www.w3.org/2000/svg" class="notranslate hydro-ternary-chart-svg" translate="no" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet" style="background:#fff;border-radius:8px;overflow:visible;display:block;max-width:100%;">
      ${grid}
      ${anPoly}
      ${catPoly}
      ${cut55K}
      <polygon points="${vTop.x},${vTop.y} ${vRight.x},${vRight.y} ${vLeft.x},${vLeft.y}" fill="none" stroke="#2563eb" stroke-width="2" />
      ${catCircle}
      ${anCircle}
      ${tickLabels}
      ${edgeLabels}
    </svg>
    </div>
  `;
}

function renderHydroTriangle() {
  const container = document.getElementById('hydroTriangleCombined');
  const info = document.getElementById('hydroTriangleInfoCombined');
  const stage = hydroGetActiveStage();

  if (!container) return;
  if (!stage) {
    container.innerHTML = '<div class="hydro-muted">Selecciona una etapa para ver el diagrama.</div>';
    if (info) info.textContent = '';
    return;
  }

  const meq = stage.meq || {};
  const sumAnions = HYDRO_ANIONS.reduce((acc, n) => acc + (parseFloat(meq[n]) || 0), 0);
  const sumKCaMg = HYDRO_CATIONS_TRIANGLE.reduce((acc, n) => acc + (parseFloat(meq[n]) || 0), 0);

  const pNO3 = sumAnions > 0 ? (parseFloat(meq.N_NO3) || 0) / sumAnions * 100 : 33.3;
  const pH2PO4 = sumAnions > 0 ? (parseFloat(meq.P) || 0) / sumAnions * 100 : 33.3;
  const pSO4 = sumAnions > 0 ? (parseFloat(meq.S) || 0) / sumAnions * 100 : 33.3;

  const pK = sumKCaMg > 0 ? (parseFloat(meq.K) || 0) / sumKCaMg * 100 : 33.3;
  const pCa = sumKCaMg > 0 ? (parseFloat(meq.Ca) || 0) / sumKCaMg * 100 : 33.3;
  const pMg = sumKCaMg > 0 ? (parseFloat(meq.Mg) || 0) / sumKCaMg * 100 : 33.3;

  hydroDrawCombinedTernary(container, {
    pNO3, pH2PO4, pSO4,
    pK, pCa, pMg,
    anionZone: hydroEquilibriumPolygonAnions(),
    cationZone: hydroEquilibriumPolygonCations()
  });

  if (info) {
    info.textContent = `Aniones: N-NO₃⁻ ${pNO3.toFixed(1)}% · P-H₂PO₄⁻ ${pH2PO4.toFixed(1)}% · S-SO₄²⁻ ${pSO4.toFixed(1)}% | Cationes: K⁺ ${pK.toFixed(1)}% · Ca²⁺ ${pCa.toFixed(1)}% · Mg²⁺ ${pMg.toFixed(1)}% (N-NH₄⁺ fuera del triángulo).`;
  }
}

function renderHydroObjective() {
  const grid = document.getElementById('hydroObjectiveGrid');
  const stage = hydroGetActiveStage();
  if (!grid) return;
  if (!stage) {
    grid.innerHTML = '<div class="hydro-muted">No hay etapa seleccionada</div>';
    return;
  }
  grid.innerHTML = HYDRO_PPM_NUTRIENTS.map((n, i) => {
    const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : '');
    return `
    <div class="hydro-grid-item${extraClass}">
      <span class="hydro-grid-label">${hydroLabelHtml(n)}</span>
      <span class="hydro-grid-value">${parseFloat(stage.ppm?.[n] || 0).toFixed(2)}</span>
    </div>
  `;
  }).join('');
}

function renderHydroWater() {
  const grid = document.getElementById('hydroWaterGrid');
  if (!grid) return;
  grid.innerHTML = HYDRO_PPM_NUTRIENTS.map(n => {
    const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : '');
    return `
    <div class="hydro-grid-item${extraClass}">
      <span class="hydro-grid-label">${hydroLabelHtml(n)}</span>
      <input class="hydro-input" data-water-nutrient="${n}" type="number" step="0.1" value="${hydroState.water?.[n] ?? 0}">
    </div>
  `;
  }).join('');
}

function renderHydroMissing() {
  const grid = document.getElementById('hydroMissingGrid');
  const stage = hydroGetActiveStage();
  if (!grid) return;
  if (!stage) {
    grid.innerHTML = '<div class="hydro-muted">No hay etapa seleccionada</div>';
    return;
  }
  grid.innerHTML = HYDRO_PPM_NUTRIENTS.map(n => {
    const obj = parseFloat(stage.ppm?.[n] || 0);
    const water = parseFloat(hydroState.water?.[n] || 0);
    const missing = obj - water;
    const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : '');
    return `
      <div class="hydro-grid-item${extraClass}">
        <span class="hydro-grid-label">${hydroLabelHtml(n)}</span>
        <span class="hydro-grid-value">${missing.toFixed(2)}</span>
      </div>
    `;
  }).join('');
}

function hydroAddFert() {
  hydroState.fertilizers.push({
    id: 'fert_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    materialId: '',
    element: 'K',
    targetPpm: 0,
    calcMode: 'ppm',
    productTotalL: 0,
    tank: 'A'
  });
}

/** Para una fila con materialId devuelve { dose, comp, contributions } en elemental */
function hydroFertRowComputed(f) {
  const mat = getAllHydroMaterials().find(m => m.id === f.materialId);
  const comp = mat ? { ...mat } : {};
  HYDRO_PPM_NUTRIENTS.forEach(n => { if (comp[n] == null) comp[n] = 0; });
  const unit = String(comp.unit || '').toUpperCase();
  const density = parseFloat(comp.density) || 0;
  const vol = parseFloat(hydroState.volumeWaterM3) || 100;
  let dose = 0;

  // Modo por producto total para líquidos (ej. ácidos): L totales -> kg eq -> ppm producto (dose).
  if (f && f.calcMode === 'product' && unit === 'L' && density > 0) {
    const productTotalL = parseFloat(f.productTotalL) || 0;
    const kgEq = productTotalL * density;
    dose = vol > 0 ? (kgEq * 1000 / vol) : 0;
  } else {
    const elemPct = parseFloat(comp[f.element]) || 0;
    const targetPpm = parseFloat(f.targetPpm) || 0;
    dose = elemPct > 0 ? (targetPpm * 100 / elemPct) : 0;
  }
  const contributions = {};
  HYDRO_PPM_NUTRIENTS.forEach(n => { contributions[n] = dose * (parseFloat(comp[n]) || 0) / 100; });
  return { dose, comp, contributions };
}

function hydroFertRowContributionsLegacy(f) {
  const dose = parseFloat(f.dose || 0);
  const comp = f.comp || {};
  const contributions = {};
  HYDRO_PPM_NUTRIENTS.forEach(n => { contributions[n] = dose * (parseFloat(comp[n]) || 0) / 100; });
  return contributions;
}

const thClass = (n) => n === 'N_NH4' ? ' hydro-col-nh4' : (n === 'Fe' ? ' hydro-micro-start' : '');

/** Kg de fertilizante para un volumen de agua: dose (ppm) * volumen_m3 / 1000 */
function hydroFertRowKg(f) {
  let dose;
  if (f.materialId != null && f.materialId !== '') {
    dose = hydroFertRowComputed(f).dose;
  } else {
    dose = parseFloat(f.dose || 0);
  }
  const vol = parseFloat(hydroState.volumeWaterM3) || 100;
  return (dose * vol) / 1000;
}

/**
 * Cantidad total de producto por fila.
 * - Sólidos: kg
 * - Líquidos (unit='L' con densidad): L + kg equivalente
 */
function hydroFertRowProductTotal(f, materials) {
  const kgEquivalent = hydroFertRowKg(f);
  if (!(f && f.materialId)) {
    return { value: kgEquivalent, unit: 'kg', kgEquivalent };
  }
  const mats = Array.isArray(materials) ? materials : getAllHydroMaterials();
  const mat = mats.find(m => m && m.id === f.materialId);
  const unit = String(mat?.unit || '').toUpperCase();
  const density = parseFloat(mat?.density);
  if (unit === 'L' && density > 0) {
    // En modo "product", respetar el valor ingresado por el usuario.
    if (f && f.calcMode === 'product') {
      const manualL = parseFloat(f.productTotalL) || 0;
      return { value: manualL, unit: 'L', kgEquivalent };
    }
    return { value: kgEquivalent / density, unit: 'L', kgEquivalent };
  }
  return { value: kgEquivalent, unit: 'kg', kgEquivalent };
}

function renderHydroFertTable() {
  const wrap = document.getElementById('hydroFertTableWrap');
  if (!wrap) return;
  var scrollEl = wrap.querySelector && wrap.querySelector('.hydro-table-scroll');
  var savedFertScroll = (scrollEl && typeof scrollEl.scrollLeft === 'number') ? scrollEl.scrollLeft : 0;
  const materials = getAllHydroMaterials();
  const optNew = '<option value="__hydro_new__">➕ Agregar nuevo…</option>';
  const options = (selectedId) =>
    optNew + materials.map(m =>
      `<option value="${(m.id || '').replace(/"/g, '&quot;')}" ${m.id === selectedId ? 'selected' : ''}>${(m.name || m.id || '').replace(/</g, '&lt;')}</option>`
    ).join('');
  const tankOptions = (sel) => HYDRO_TANQUES.map(t =>
    `<option value="${t}" ${t === (sel || 'A') ? 'selected' : ''}>Tanque ${t}</option>`
  ).join('');

  const rows = hydroState.fertilizers.map(f => {
    const legacy = !f.materialId && (f.name != null || f.dose != null);
    const tank = f.tank || 'A';
    const total = hydroFertRowProductTotal(f, materials);
    if (legacy) {
      const contrib = hydroFertRowContributionsLegacy(f);
      const contribCells = HYDRO_PPM_NUTRIENTS.map(n => {
        const v = contrib[n];
        return `<td class="hydro-contrib-cell ${thClass(n)}">${(v > 0 ? v.toFixed(2) : '')}</td>`;
      }).join('');
      return `
    <tr data-fert-id="${f.id}" data-legacy="1">
      <td><input class="hydro-input" data-fert-id="${f.id}" data-fert-field="name" value="${(f.name || '').replace(/"/g, '&quot;')}" placeholder="Nombre"></td>
      <td class="hydro-dose-readonly">${(parseFloat(f.dose || 0) > 0 ? parseFloat(f.dose).toFixed(1) : '—')}</td>
      ${contribCells}
      <td><select class="hydro-input hydro-tank-select" data-fert-id="${f.id}" data-fert-field="tank">${tankOptions(tank)}</select></td>
      <td class="hydro-kg-readonly">${total.value > 0 ? `${total.value.toFixed(2)} ${total.unit}` : '—'}</td>
      <td><button class="btn btn-secondary btn-sm hydro-remove-fert" data-fert-id="${f.id}">✕</button></td>
    </tr>`;
    }
    const { dose, contributions } = hydroFertRowComputed(f);
    const contribCells = HYDRO_PPM_NUTRIENTS.map(n => {
      const v = contributions[n] || 0;
      const val = v > 0 ? v.toFixed(2) : '';
      return `<td class="${thClass(n)}"><input class="hydro-input hydro-contrib-input" data-fert-id="${f.id}" data-fert-element="${n}" type="number" step="0.01" min="0" placeholder="—" value="${val}" title="ppm de ${hydroLabelPlain(n)} que aporta este fertilizante"></td>`;
    }).join('');
    const mat = materials.find(m => m && m.id === f.materialId);
    const matUnit = String(mat?.unit || '').toUpperCase();
    const matDensity = parseFloat(mat?.density) || 0;
    const isLiquid = matUnit === 'L' && matDensity > 0;
    const liquidInputValue = (f && f.calcMode === 'product')
      ? (parseFloat(f.productTotalL) || 0)
      : total.value;
    const totalCell = isLiquid
      ? `<div style="display:flex;align-items:center;gap:6px;">
          <input class="hydro-input hydro-product-total-input" data-fert-id="${f.id}" data-fert-field="productTotalL" type="number" step="0.01" min="0" value="${liquidInputValue > 0 ? liquidInputValue.toFixed(2) : ''}" placeholder="L total" title="Litros totales del producto para el volumen de agua">
          <span class="hydro-muted" style="white-space:nowrap;">L</span>
        </div>`
      : `${total.value > 0 ? `${total.value.toFixed(2)} ${total.unit}` : '—'}`;
    return `
    <tr data-fert-id="${f.id}">
      <td>
        <select class="hydro-input hydro-fert-select" data-fert-id="${f.id}" data-fert-field="materialId">
          <option value="">Selecciona…</option>
          ${options(f.materialId)}
        </select>
      </td>
      <td class="hydro-dose-readonly">${(dose > 0 ? dose.toFixed(1) : '—')}</td>
      ${contribCells}
      <td><select class="hydro-input hydro-tank-select" data-fert-id="${f.id}" data-fert-field="tank" title="Tanque">${tankOptions(tank)}</select></td>
      <td class="hydro-kg-readonly">${totalCell}</td>
      <td><button class="btn btn-secondary btn-sm hydro-remove-fert" data-fert-id="${f.id}">✕</button></td>
    </tr>`;
  }).join('');

  const headerCells = HYDRO_PPM_NUTRIENTS.map(n => `<th class="hydro-contrib-th ${thClass(n)}">${hydroLabelHtml(n)}</th>`).join('');
  wrap.innerHTML = `
    <p class="hydro-legend-elemental" style="margin:0 0 8px 0;font-size:0.9rem;color:#64748b;">Concentración elemental (%). Puedes trabajar por ppm de un elemento (flujo tradicional) o, en líquidos, escribir el total de producto (L) para calcular ppm aportadas.</p>
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored hydro-fert-contrib-table">
        <thead>
          <tr>
            <th>Fertilizante</th>
            <th>Dosis (ppm producto)</th>
            ${headerCells}
            <th>Tanque</th>
            <th>Total producto</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  var newScrollEl = wrap.querySelector && wrap.querySelector('.hydro-table-scroll');
  if (newScrollEl) newScrollEl.scrollLeft = savedFertScroll;
}

function renderHydroFertTotals() {
  const grid = document.getElementById('hydroFertTotals');
  const stage = hydroGetActiveStage();
  if (!grid) return;
  const totals = {};
  HYDRO_PPM_NUTRIENTS.forEach(n => { totals[n] = 0; });
  hydroState.fertilizers.forEach(f => {
    let dose, comp;
    if (f.materialId != null && f.materialId !== '') {
      const c = hydroFertRowComputed(f);
      dose = c.dose;
      comp = c.comp;
    } else {
      dose = parseFloat(f.dose || 0);
      comp = f.comp || {};
    }
    HYDRO_PPM_NUTRIENTS.forEach(n => {
      const pct = parseFloat(comp[n] || 0);
      totals[n] += dose * (pct / 100);
    });
  });
  const titleHtml = stage ? '<div class="hydro-muted hydro-grid-title" style="grid-column:1/-1;margin-bottom:6px;">Aporte total estimado (ppm):</div>' : '';
  grid.innerHTML = titleHtml + HYDRO_PPM_NUTRIENTS.map(n => {
    let extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : '');
    if (stage && n !== 'N_NH4') {
      const obj = parseFloat(stage.ppm?.[n] || 0);
      const water = parseFloat(hydroState.water?.[n] || 0);
      const faltante = obj - water;
      const aporte = totals[n] || 0;
      const tol = 0.01;
      if (aporte < faltante - tol) extraClass += ' hydro-aport-below';
      else if (aporte > faltante + tol) extraClass += ' hydro-aport-above';
    }
    return `
    <div class="hydro-grid-item${extraClass}">
      <span class="hydro-grid-label">${hydroLabelHtml(n)}</span>
      <span class="hydro-grid-value">${totals[n].toFixed(2)}</span>
    </div>
  `;
  }).join('');

  // Bloque "Pendiente por cubrir" = Faltante por cubrir − Aporte total estimado (más pequeño, abajo)
  const remainingEl = document.getElementById('hydroFertRemaining');
  if (remainingEl && stage) {
    const missingByNutrient = {};
    HYDRO_PPM_NUTRIENTS.forEach(n => {
      const obj = parseFloat(stage.ppm?.[n] || 0);
      const water = parseFloat(hydroState.water?.[n] || 0);
      missingByNutrient[n] = obj - water;
    });
    const remainingHtml = HYDRO_PPM_NUTRIENTS.map(n => {
      const faltante = missingByNutrient[n] || 0;
      const aporte = totals[n] || 0;
      const pendiente = faltante - aporte;
      const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : '');
      const valueClass = pendiente > 0.01 ? ' hydro-remaining-positive' : (pendiente < -0.01 ? ' hydro-remaining-negative' : '');
      return `
    <div class="hydro-grid-item${extraClass}">
      <span class="hydro-grid-label">${hydroLabelHtml(n)}</span>
      <span class="hydro-grid-value${valueClass}">${pendiente.toFixed(2)}</span>
    </div>
  `;
    }).join('');
    remainingEl.innerHTML =
      '<div class="hydro-muted hydro-grid-title" style="grid-column:1/-1;margin-bottom:4px;font-size:0.9rem;">📉 Pendiente por cubrir (ppm): Faltante − Aporte</div>' + remainingHtml;
  } else if (remainingEl) {
    remainingEl.innerHTML = '';
  }

  // Nota de validación: fórmulas para que el usuario pueda verificar el cálculo
  const validationEl = document.getElementById('hydroValidationNote');
  if (validationEl) {
    const vol = parseFloat(hydroState.volumeWaterM3) || 100;
    validationEl.innerHTML = `
      <div class="hydro-validation-box" style="padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:0.8rem;color:#166534;line-height:1.5;">
        <strong>✓ Validación del cálculo (solución nutritiva)</strong><br>
        Todas las ppm son concentraciones en la <strong>solución final</strong> (mg/L en el agua de riego).<br>
        • <strong>Aporte total (ppm)</strong> = suma por nutriente de: dosis (ppm producto) × concentración elemental (%) ÷ 100.<br>
        • <strong>Producto sólido (kg)</strong> = dosis (ppm producto) × volumen de agua (m³) ÷ 1000.<br>
        • <strong>Producto líquido (L)</strong> = kg equivalente ÷ densidad (kg/L).<br>
        Para <strong>${vol} m³</strong> de agua, los totales mostrados por tanque (total y por recarga) producen exactamente las ppm del «Aporte total estimado» en toda la solución.
      </div>`;
  }
}

function renderHydroVolumeCard() {
  const wrap = document.getElementById('hydroVolumeCard');
  if (!wrap) return;
  const materials = getAllHydroMaterials();
  const v = parseFloat(hydroState.volumeWaterM3) || 100;
  const t = parseFloat(hydroState.tankVolumeL) || 1000;
  const r = parseFloat(hydroState.injectionRateLperM3) || 10;
  const byTank = {};
  HYDRO_TANQUES.forEach(tq => { byTank[tq] = { totalKg: 0, totalL: 0, items: [] }; });
  hydroState.fertilizers.forEach(f => {
    const total = hydroFertRowProductTotal(f, materials);
    if (total.value <= 0) return;
    const tank = f.tank || 'A';
    if (!HYDRO_TANQUES.includes(tank)) return;
    const name = f.materialId
      ? (materials.find(m => m.id === f.materialId)?.name || f.materialId)
      : (f.name || 'Sin nombre');
    if (total.unit === 'L') byTank[tank].totalL += total.value;
    else byTank[tank].totalKg += total.value;
    byTank[tank].items.push({ name, value: total.value, unit: total.unit, kgEquivalent: total.kgEquivalent });
  });
  // Volumen de concentrado necesario = agua (m³) × tasa (L/m³). Recargas = ese volumen ÷ capacidad del tanque.
  const concentradoL = v * r;
  const recargas = t > 0 ? Math.ceil(concentradoL / t) : 0;
  const recargasText = recargas <= 1
    ? '1 recarga (tu tanque alcanza).'
    : `${recargas} recargas de tanque necesarias.`;

  const tankBlocks = HYDRO_TANQUES.map(tq => {
    const data = byTank[tq];
    if (data.totalKg <= 0 && data.totalL <= 0) return '';
    const totalParts = [];
    if (data.totalKg > 0) totalParts.push(`${data.totalKg.toFixed(2)} kg`);
    if (data.totalL > 0) totalParts.push(`${data.totalL.toFixed(2)} L`);
    let perRecargaLine = '';
    if (recargas > 1) {
      const perRecParts = [];
      if (data.totalKg > 0) perRecParts.push(`${(data.totalKg / recargas).toFixed(2)} kg`);
      if (data.totalL > 0) perRecParts.push(`${(data.totalL / recargas).toFixed(2)} L`);
      perRecargaLine = ` <span class="hydro-muted" style="font-size:0.9rem;">(${perRecParts.join(' + ')} por recarga si son ${recargas} recargas)</span>`;
    }
    const itemsHtml = data.items.map(i => {
      const itemPerRec = recargas > 1 ? `${(i.value / recargas).toFixed(2)} ${i.unit}` : null;
      const eqText = i.unit === 'L' ? ` <span class="hydro-muted">(≈ ${i.kgEquivalent.toFixed(2)} kg eq)</span>` : '';
      return `<span class="hydro-tank-item">${(i.name || '').replace(/</g, '&lt;')}: ${i.value.toFixed(2)} ${i.unit}${eqText}${itemPerRec != null ? ` <span class="hydro-muted">(${itemPerRec} por recarga)</span>` : ''}</span>`;
    }).join('');
    return `
      <div class="hydro-tank-block" data-tank="${tq}">
        <strong class="hydro-tank-block-title">${hydroTankBlockIconHtml()}<span class="hydro-tank-block-title-text">Tanque ${tq}: ${totalParts.join(' + ')} total${perRecargaLine}</span></strong>
        <div class="hydro-tank-block-items">${itemsHtml}</div>
      </div>
    `;
  }).filter(Boolean).join('');

  const porTanqueLegend = '<p class="hydro-muted" style="margin:0 0 6px 0;font-size:0.85rem;">Las cantidades son el <strong>total</strong> para todo el volumen de agua indicado (sólidos en kg y líquidos en L). Si necesitas varias recargas, en cada llenada usa la cantidad "por recarga".</p>';

  // Relación de inyección: 1:(1000/tasa). Ej: tasa 10 → 1:100; tasa 15 → 1:66.7
  const ratioVal = r > 0 ? 1000 / r : NaN;
  const ratioStr = !isNaN(ratioVal) ? (Number.isInteger(ratioVal) ? ratioVal : ratioVal.toFixed(1)) : '—';
  const ratioDisplay = !isNaN(ratioVal) ? '1:' + ratioStr : '—';

  wrap.innerHTML = `
    <div class="hydro-volume-inputs">
      <div class="hydro-volume-intro">
        <img src="assets/NutriPlant_PRO_blue.png" alt="" class="hydro-volume-watermark" aria-hidden="true">
        <h4 style="margin:0 0 10px 0;font-size:1rem;">📦 Cálculo por volumen de agua</h4>
        <p class="hydro-muted" style="margin:0 0 10px 0;font-size:0.9rem;">Volumen de agua a fertirrigar, capacidad del tanque y tasa de inyección. Con esto se calculan los totales por fertilizante (kg en sólidos y L en líquidos), el volumen de concentrado y las recargas de tanque.</p>
      </div>
      <div class="hydro-volume-row">
        <label>Volumen de agua (m³):</label>
        <input type="number" id="hydroVolumeWaterM3" class="hydro-input" min="0.1" step="1" value="${v}" title="m³ de agua a inyectar">
        <label>Volumen del tanque (L):</label>
        <input type="number" id="hydroTankVolumeL" class="hydro-input" min="1" step="1" value="${t}" title="Litros de solución concentrada">
        <label>Tasa de inyección (L/m³):</label>
        <input type="number" id="hydroInjectionRate" class="hydro-input" min="0.1" step="0.5" value="${r}" title="L de concentrado por m³ de agua">
      </div>
      <div class="hydro-volume-row" style="margin-top:6px;">
        <label>Relación de inyección:</label>
        <span id="hydroInjectionRatio" style="display:inline-block;min-width:4em;font-weight:500;" title="1:(1000 ÷ tasa)">${ratioDisplay}</span>
      </div>
      <div class="hydro-volume-result" style="margin-top:10px;padding:8px 12px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
        <strong>Volumen de concentrado necesario:</strong> ${concentradoL.toFixed(1)} L (${v} m³ × ${r} L/m³). <span class="hydro-muted">Con tu tanque de ${t} L:</span> ${recargasText}
      </div>
      ${tankBlocks ? `<div class="hydro-tank-summary" style="margin-top:12px;">${porTanqueLegend}<strong>Por tanque (A, B, C):</strong><div class="hydro-tank-blocks">${tankBlocks}</div></div>` : ''}
    </div>
  `;
}

function renderHydroNitrogenSummary() {
  const infoEl = document.getElementById('hydroNitrogenSummaryText');
  if (!infoEl) return;
  const stage = hydroGetActiveStage();
  if (!stage) {
    infoEl.textContent = 'Suma de N (meq/L): 0.00 · % Nitrato: 0.0% · % Amonio: 0.0%.';
    return;
  }
  const nNo3 = parseFloat(stage.meq?.N_NO3 || 0) || 0;
  const nNh4 = parseFloat(stage.meq?.N_NH4 || 0) || 0;
  const nTotal = nNo3 + nNh4;
  const pctNo3 = nTotal > 0 ? (nNo3 / nTotal) * 100 : 0;
  const pctNh4 = nTotal > 0 ? (nNh4 / nTotal) * 100 : 0;
  const stageName = stage.name || 'Etapa';
  infoEl.textContent = `${stageName} · Suma de N (meq/L): ${nTotal.toFixed(2)} · % Nitrato: ${pctNo3.toFixed(1)}% · % Amonio: ${pctNh4.toFixed(1)}%.`;
}

function renderHydroAll() {
  renderHydroStageTable();
  renderHydroNitrogenSummary();
  renderHydroTriangle();
  renderHydroObjective();
  renderHydroWater();
  renderHydroMissing();
  renderHydroVolumeCard();
  renderHydroFertTable();
  renderHydroFertTotals();
}

// ---------- Modal: fertilizante soluble (concentración elemental) ----------
function renderHydroCustomMaterialsList() {
  const container = document.getElementById('hydroCustomMaterialsList');
  if (!container) return;
  const list = Array.isArray(hydroCustomMaterialsUser) ? hydroCustomMaterialsUser : [];
  if (list.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;">Sin fertilizantes personalizados.</div>';
    return;
  }
  container.innerHTML = list.map(mat => {
    const key = encodeURIComponent((mat.id || mat.name || '').toString());
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span>${(mat.name || mat.id || '').replace(/</g, '&lt;')}</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="openEditHydroCustomMaterial('${key.replace(/'/g, "\\'")}')">Editar</button>
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="removeHydroCustomMaterial('${key.replace(/'/g, "\\'")}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function findHydroCustomMaterialByKey(key) {
  const list = Array.isArray(hydroCustomMaterialsUser) ? hydroCustomMaterialsUser : [];
  const k = (key || '').toLowerCase();
  return list.find(m => ((m.id || m.name || '') + '').toLowerCase() === k) || null;
}

function removeHydroCustomMaterial(encodedKey) {
  const key = decodeURIComponent(encodedKey || '').toLowerCase();
  if (!key) return;
  if (!confirm('¿Eliminar este fertilizante del catálogo?')) return;
  hydroCustomMaterialsUser = (hydroCustomMaterialsUser || []).filter(
    m => ((m.id || m.name || '') + '').toLowerCase() !== key
  );
  hydroSaveCustomMaterials();
  renderHydroCustomMaterialsList();
  renderHydroFertTable();
  renderHydroFertTotals();
}

function openEditHydroCustomMaterial(encodedKey) {
  const key = decodeURIComponent(encodedKey || '').toLowerCase();
  const mat = findHydroCustomMaterialByKey(key);
  if (!mat) return;
  if (!document.querySelector('.hydro-material-modal-overlay')) {
    openHydroNewMaterialModal();
  }
  const overlay = document.querySelector('.hydro-material-modal-overlay');
  if (!overlay) return;
  overlay.dataset.editKey = key;
  overlay.dataset.editMode = 'true';
  const titleEl = overlay.querySelector('.modal-header h3');
  if (titleEl) titleEl.textContent = '✏️ Editar fertilizante (concentración elemental)';
  const saveBtn = overlay.querySelector('#hydroCustom_saveBtn');
  if (saveBtn) saveBtn.textContent = 'Guardar cambios';
  const set = (id, v) => { const el = overlay.querySelector('#' + id); if (el) el.value = v ?? ''; };
  set('hydroCustom_name', mat.name);
  HYDRO_PPM_NUTRIENTS.forEach(n => set('hydroCustom_' + n, mat[n]));
}

function clearHydroCustomMaterials() {
  if (!confirm('¿Eliminar todo el catálogo de fertilizantes solubles personalizados de hidroponía?')) return;
  hydroCustomMaterialsUser = [];
  hydroSaveCustomMaterials();
  renderHydroCustomMaterialsList();
  renderHydroFertTable();
  renderHydroFertTotals();
}

/** Modal de consulta: fertilizantes precargados con concentración elemental (%) */
function openHydroPreloadedCatalogModal() {
  const base = (typeof window.getBaseFertiMaterials === 'function') ? window.getBaseFertiMaterials() : [];
  const list = base.map(m => hydroMaterialToElemental(m)).filter(Boolean);
  const rows = list.map(mat => {
    const cells = [
      (mat.name || mat.id || '').replace(/</g, '&lt;'),
      ...HYDRO_PPM_NUTRIENTS.map(n => (parseFloat(mat[n]) || 0).toFixed(2))
    ];
    return `<tr style="border-bottom:1px solid #e5e7eb;">${cells.map((c, i) => `<td style="padding:6px 10px;${i === 0 ? 'font-weight:600;' : 'text-align:right;'}">${c}</td>`).join('')}</tr>`;
  }).join('');
  const overlay = document.createElement('div');
  overlay.className = 'hydro-material-modal-overlay hydro-preloaded-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  overlay.innerHTML = `
    <div class="material-modal" style="max-width:95%;width:900px;max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div class="modal-header" style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:1.1rem;color:#1e293b;">📋 Fertilizantes disponibles (concentración elemental %)</h3>
        <button class="btn btn-secondary btn-sm" type="button" data-close-preloaded>✕</button>
      </div>
      <div style="padding:14px 18px;overflow:auto;flex:1;">
        <p style="margin:0 0 12px 0;font-size:0.9rem;color:#64748b;">Consulta de concentraciones de los fertilizantes precargados. Valores en % del elemento.</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">Nombre</th>
                ${HYDRO_PPM_NUTRIENTS.map(n => `<th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e2e8f0;">${hydroLabelHtml(n)} <span class="notranslate" translate="no">%</span></th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="' + (1 + HYDRO_PPM_NUTRIENTS.length) + '" style="padding:12px;color:#64748b;">Sin fertilizantes precargados.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  overlay.querySelector('[data-close-preloaded]').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function updateHydroCustomMaterial(overlay) {
  const key = (overlay.dataset.editKey || '').toLowerCase();
  const mat = findHydroCustomMaterialByKey(key);
  if (!mat) return;
  const getNum = id => { const v = parseFloat(overlay.querySelector('#' + id)?.value); return isNaN(v) ? 0 : Math.max(0, v); };
  const name = (overlay.querySelector('#hydroCustom_name')?.value || '').trim();
  if (!name) { if (window.showMessage) window.showMessage('Escribe un nombre', 'warning'); return; }
  const updated = { ...mat, name };
  HYDRO_PPM_NUTRIENTS.forEach(n => { updated[n] = getNum('hydroCustom_' + n); });
  hydroCustomMaterialsUser = (hydroCustomMaterialsUser || []).filter(
    m => ((m.id || m.name || '') + '').toLowerCase() !== key
  );
  hydroCustomMaterialsUser.push(updated);
  hydroSaveCustomMaterials();
  renderHydroCustomMaterialsList();
  renderHydroFertTable();
  renderHydroFertTotals();
  if (window.showMessage) window.showMessage('✅ Fertilizante actualizado', 'success');
  overlay.remove();
}

function openHydroNewMaterialModal() {
  try { document.querySelectorAll('.hydro-material-modal-overlay').forEach(el => el.remove()); } catch {}

  const overlay = document.createElement('div');
  overlay.className = 'hydro-material-modal-overlay material-modal-overlay';
  const nutrientInputs = HYDRO_PPM_NUTRIENTS.map(n =>
    `<div class="nutrient-input"><label class="notranslate" translate="no">${hydroLabelPlain(n)} %:</label><input type="number" id="hydroCustom_${n}" step="0.01" placeholder="0.00"></div>`
  ).join('');

  overlay.innerHTML = `
    <div class="material-modal">
      <div class="modal-header">
        <h3 style="margin:0;display:flex;align-items:center;gap:8px;">➕ Nueva materia prima (hidroponía)</h3>
        <button class="btn btn-secondary btn-sm" onclick="this.closest('.hydro-material-modal-overlay').remove()">✕</button>
      </div>
      <div class="material-modal-body">
        <p class="hydro-legend-elemental" style="margin:0 0 10px 0;font-size:0.9rem;color:#64748b;">Concentración elemental (%). Todos los valores en % del elemento.</p>
        <div class="form-group">
          <label>Nombre del fertilizante:</label>
          <input type="text" id="hydroCustom_name" placeholder="Ej: MKP">
        </div>
        <div class="form-group">
          <label>Concentración de nutrientes (% elemental):</label>
          <p class="hydro-legend-elemental" style="margin:4px 0 8px 0;font-size:0.85rem;color:#64748b;">Ej: MKP 0-22.67-28.22 (P y K en elemental, no como P₂O₅ ni K₂O).</p>
          <div class="nutrient-inputs-grid">${nutrientInputs}</div>
        </div>
        <div class="form-group">
          <label>Fertilizantes solubles personalizados (hidroponía):</label>
          <div id="hydroCustomMaterialsList" style="margin-top:6px;"></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
            <button class="btn btn-info btn-sm" onclick="openHydroPreloadedCatalogModal()" title="Consultar concentraciones elementales de fertilizantes precargados">📋 Ver fertilizantes disponibles</button>
            <button class="btn btn-secondary btn-sm" onclick="clearHydroCustomMaterials()">🧹 Limpiar catálogo</button>
          </div>
        </div>
        <div class="material-modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.hydro-material-modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-primary" id="hydroCustom_saveBtn">Agregar Materia Prima</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.dataset.editMode = 'false';
  overlay.dataset.editKey = '';
  renderHydroCustomMaterialsList();

  overlay.querySelector('#hydroCustom_saveBtn').addEventListener('click', () => {
    if (overlay.dataset.editMode === 'true') {
      updateHydroCustomMaterial(overlay);
      return;
    }
    const getNum = id => { const v = parseFloat(overlay.querySelector('#' + id)?.value); return isNaN(v) ? 0 : Math.max(0, v); };
    const name = (overlay.querySelector('#hydroCustom_name')?.value || '').trim();
    if (!name) { if (window.showMessage) window.showMessage('Escribe un nombre', 'warning'); return; }
    const mat = {
      id: 'hydro_custom_' + Date.now(),
      name,
      N_NH4: 0, N_NO3: 0, P: 0, S: 0, K: 0, Ca: 0, Mg: 0,
      Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0
    };
    HYDRO_PPM_NUTRIENTS.forEach(n => { mat[n] = getNum('hydroCustom_' + n); });
    hydroCustomMaterialsUser = hydroCustomMaterialsUser || [];
    hydroCustomMaterialsUser.push(mat);
    hydroSaveCustomMaterials();
    renderHydroCustomMaterialsList();
    renderHydroFertTable();
    renderHydroFertTotals();
    if (window.showMessage) window.showMessage('✅ Fertilizante agregado', 'success');
    overlay.remove();
  });
}

function bindHydroEvents(container) {
  if (!container) return;
  container.addEventListener('focusin', (e) => {
    const target = e.target;
    const stageId = target && target.getAttribute ? target.getAttribute('data-stage-id') : null;
    if (stageId) {
      hydroState.activeStageId = stageId;
      renderHydroNitrogenSummary();
    }
  });

  container.addEventListener('click', (e) => {
    const isFormControl = e.target.closest('input, select, textarea');
    if (isFormControl) {
      return;
    }
    const removeFertBtn = e.target.closest('.hydro-remove-fert');
    if (removeFertBtn) {
      const id = removeFertBtn.getAttribute('data-fert-id');
      hydroState.fertilizers = hydroState.fertilizers.filter(f => f.id !== id);
      renderHydroFertTable();
      renderHydroFertTotals();
      hydroScheduleSave();
    }
  });

  container.addEventListener('input', (e) => {
    const input = e.target;
    // Solo actualizar estado en volumen/tanque/inyección; NO re-renderizar para no perder foco al escribir
    if (input.id === 'hydroVolumeWaterM3') {
      hydroState.volumeWaterM3 = parseFloat(input.value) || 100;
      return;
    }
    if (input.id === 'hydroTankVolumeL') {
      hydroState.tankVolumeL = parseFloat(input.value) || 1000;
      return;
    }
    if (input.id === 'hydroInjectionRate') {
      const rate = parseFloat(input.value) || 0;
      hydroState.injectionRateLperM3 = rate || 10;
      const ratioEl = document.getElementById('hydroInjectionRatio');
      if (ratioEl) {
        const rv = rate > 0 ? 1000 / rate : NaN;
        ratioEl.textContent = !isNaN(rv) ? '1:' + (Number.isInteger(rv) ? rv : rv.toFixed(1)) : '—';
      }
      return;
    }
    const stageId = input.getAttribute('data-stage-id');
    if (stageId) {
      hydroState.activeStageId = stageId;
      const stage = hydroState.stages.find(s => s.id === stageId);
      if (!stage) return;
      const field = input.getAttribute('data-field');
      const type = input.getAttribute('data-type');
      const nutrient = input.getAttribute('data-nutrient');
      if (field) stage[field] = input.value;
      if (type === 'meq' && nutrient) {
        stage.meq = stage.meq || {};
        stage.meq[nutrient] = parseFloat(input.value) || 0;
      }
      if (type === 'ppm' && nutrient) {
        stage.ppm = stage.ppm || {};
        stage.ppm[nutrient] = parseFloat(input.value) || 0;
      }
      if ((type === 'meq' && (nutrient === 'N_NO3' || nutrient === 'N_NH4')) || field === 'name') {
        renderHydroNitrogenSummary();
      }
      hydroScheduleRender();
      hydroScheduleSave();
    }

    const waterNutrient = input.getAttribute('data-water-nutrient');
    if (waterNutrient) {
      hydroState.water[waterNutrient] = parseFloat(input.value) || 0;
      hydroScheduleRender();
      hydroScheduleSave();
    }

    const fertId = input.getAttribute('data-fert-id');
    if (fertId) {
      const fert = hydroState.fertilizers.find(f => f.id === fertId);
      if (!fert) return;
      const field = input.getAttribute('data-fert-field');
      const ntr = input.getAttribute('data-fert-nutrient');
      if (field === 'name') fert.name = input.value;
      if (field === 'dose') fert.dose = parseFloat(input.value) || 0;
      if (field === 'materialId') fert.materialId = input.value;
      if (field === 'element') fert.element = input.value;
      if (field === 'targetPpm') fert.targetPpm = parseFloat(input.value) || 0;
      if (field === 'productTotalL') {
        fert.calcMode = 'product';
        fert.productTotalL = parseFloat(input.value) || 0;
      }
      // En celdas de aporte (ppm de elemento) el usuario teclea aquí;
      // actualizar el modo/objetivo al instante (antes solo se hacía en "change").
      if (input.classList && input.classList.contains('hydro-contrib-input')) {
        const elem = input.getAttribute('data-fert-element');
        if (elem) {
          fert.calcMode = 'ppm';
          fert.element = elem;
          fert.targetPpm = parseFloat(input.value) || 0;
        }
      }
      if (ntr) {
        fert.comp = fert.comp || {};
        fert.comp[ntr] = parseFloat(input.value) || 0;
      }
      // Actualizar al instante salidas dependientes del cálculo de fertilizantes
      // sin re-renderizar la tabla completa (evita perder foco al escribir).
      renderHydroFertTotals();
      renderHydroVolumeCard();
      hydroScheduleRender();
      hydroScheduleSave();
    }
  });

  container.addEventListener('change', (e) => {
    const target = e.target;
    const stageId = target.getAttribute('data-stage-id');
    if (stageId) {
      hydroState.activeStageId = stageId;
      const stage = hydroState.stages.find(s => s.id === stageId);
      if (stage) {
        const field = target.getAttribute('data-field');
        const type = target.getAttribute('data-type');
        const nutrient = target.getAttribute('data-nutrient');
        if (field) stage[field] = target.value;
        if (type === 'meq' && nutrient) {
          stage.meq = stage.meq || {};
          stage.meq[nutrient] = parseFloat(target.value) || 0;
        }
        if (type === 'ppm' && nutrient) {
          stage.ppm = stage.ppm || {};
          stage.ppm[nutrient] = parseFloat(target.value) || 0;
        }
        // Recalcular al salir del campo para reflejar el valor final.
        renderHydroStageTable();
        renderHydroNitrogenSummary();
        renderHydroTriangle();
        renderHydroObjective();
        renderHydroMissing();
        renderHydroFertTotals();
        hydroScheduleSave();
      }
      return;
    }

    // Al salir del campo (blur/Enter): actualizar tarjeta de volumen y recalcular
    if (target.id === 'hydroVolumeWaterM3') {
      hydroState.volumeWaterM3 = parseFloat(target.value) || 100;
      renderHydroVolumeCard();
      renderHydroFertTable();
      renderHydroFertTotals();
      hydroScheduleSave();
      return;
    }
    if (target.id === 'hydroTankVolumeL') {
      hydroState.tankVolumeL = parseFloat(target.value) || 1000;
      renderHydroVolumeCard();
      hydroScheduleSave();
      return;
    }
    if (target.id === 'hydroInjectionRate') {
      hydroState.injectionRateLperM3 = parseFloat(target.value) || 10;
      renderHydroVolumeCard();
      hydroScheduleSave();
      return;
    }
    const fertId = target.getAttribute('data-fert-id');
    if (!fertId) return;
    if (target.classList && target.classList.contains('hydro-fert-select')) {
      const value = target.value;
      if (value === '__hydro_new__') {
        if (typeof window.openHydroNewMaterialModal === 'function') window.openHydroNewMaterialModal();
        target.value = (hydroState.fertilizers.find(f => f.id === fertId) || {}).materialId || '';
        return;
      }
      const fert = hydroState.fertilizers.find(f => f.id === fertId);
      if (fert) {
        fert.materialId = value;
        // Al cambiar material, iniciar en modo ppm para evitar arrastrar litros de otro producto.
        fert.calcMode = 'ppm';
        if (!fert.element) fert.element = 'K';
        if (fert.productTotalL == null) fert.productTotalL = 0;
        renderHydroFertTable();
        renderHydroFertTotals();
        hydroScheduleSave();
      }
      return;
    }
    if (target.classList && target.classList.contains('hydro-contrib-input')) {
      const elem = target.getAttribute('data-fert-element');
      const fert = hydroState.fertilizers.find(f => f.id === fertId);
      if (fert && elem) {
        fert.calcMode = 'ppm';
        fert.element = elem;
        fert.targetPpm = parseFloat(target.value) || 0;
        renderHydroFertTable();
        renderHydroFertTotals();
        hydroScheduleSave();
      }
      return;
    }
    if (target.classList && target.classList.contains('hydro-product-total-input')) {
      const fert = hydroState.fertilizers.find(f => f.id === fertId);
      if (fert) {
        fert.calcMode = 'product';
        fert.productTotalL = parseFloat(target.value) || 0;
        renderHydroVolumeCard();
        renderHydroFertTable();
        renderHydroFertTotals();
        hydroScheduleSave();
      }
      return;
    }
    if (target.classList && target.classList.contains('hydro-tank-select')) {
      const fert = hydroState.fertilizers.find(f => f.id === fertId);
      if (fert) {
        fert.tank = target.value || 'A';
        renderHydroVolumeCard();
        renderHydroFertTable();
        hydroScheduleSave();
      }
    }
  });

  const addFertBtn = document.getElementById('hydroAddFertBtn');
  if (addFertBtn) {
    // Asignar onclick para que un solo clic = una sola fila (evitar listeners acumulados si initHydroponiaUI se llama varias veces)
    addFertBtn.onclick = function () {
      hydroAddFert();
      renderHydroFertTable();
      renderHydroFertTotals();
      hydroScheduleSave();
    };
  }
  const manageCatalogBtn = document.getElementById('hydroManageCatalogBtn');
  if (manageCatalogBtn) {
    manageCatalogBtn.addEventListener('click', () => {
      if (typeof window.openHydroNewMaterialModal === 'function') window.openHydroNewMaterialModal();
    });
  }
}

function hydroSaveLastTab(tabId) {
  try {
    const project = (window.projectManager && window.projectManager.getCurrentProject) ? window.projectManager.getCurrentProject() : null;
    if (project) {
      project.hidroponiaLastTab = tabId;
      if (window.projectManager.updateProject) window.projectManager.updateProject(project);
    }
    const pid = localStorage.getItem('nutriplant-current-project');
    if (pid) {
      const key = `nutriplant_project_${pid}`;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      data.hidroponiaLastTab = tabId;
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('⚠️ No se pudo guardar la pestaña de Hidroponía:', err);
  }
}

function hydroRestoreLastTab() {
  const container = document.querySelector('.hydroponia-container');
  if (!container) return;
  let last = 'hidro-solucion';
  try {
    const project = (window.projectManager && window.projectManager.getCurrentProject) ? window.projectManager.getCurrentProject() : null;
    if (project && project.hidroponiaLastTab) {
      last = project.hidroponiaLastTab;
    } else {
      const pid = localStorage.getItem('nutriplant-current-project');
      if (pid) {
        const key = `nutriplant_project_${pid}`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.hidroponiaLastTab) last = data.hidroponiaLastTab;
      }
    }
    const validIds = ['hidro-solucion', 'hidro-calculo'];
    if (!validIds.includes(last)) last = 'hidro-solucion';
    container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const btn = container.querySelector(`.tab-button[data-tab="${last}"]`);
    const content = document.getElementById(last);
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
  } catch {}
}

function initHydroponiaTabs() {
  const container = document.querySelector('.hydroponia-container');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-button');
    if (!btn) return;
    if (!btn.closest('.hydroponia-container')) return;
    const tabId = btn.getAttribute('data-tab');
    if (!tabId) return;
    container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const target = container.querySelector(`#${tabId}`);
    if (target) target.classList.add('active');
    hydroSaveLastTab(tabId);
  });
}

function initHydroponiaUI() {
  const container = document.querySelector('.hydroponia-container');
  if (!container) return;
  // Reiniciar estado base en cada apertura/cambio de proyecto para evitar arrastre entre proyectos.
  hydroState = {
    stages: [],
    activeStageId: null,
    water: {},
    fertilizers: [],
    volumeWaterM3: 100,
    tankVolumeL: 1000,
    injectionRateLperM3: 10
  };
  const saved = hydroLoadData();
  if (saved) {
    hydroState = {
      stages: Array.isArray(saved.stages) ? saved.stages : [],
      activeStageId: saved.activeStageId || null,
      water: saved.water || {},
      fertilizers: Array.isArray(saved.fertilizers) ? saved.fertilizers : [],
      volumeWaterM3: saved.volumeWaterM3 != null ? saved.volumeWaterM3 : 100,
      tankVolumeL: saved.tankVolumeL != null ? saved.tankVolumeL : 1000,
      injectionRateLperM3: saved.injectionRateLperM3 != null ? saved.injectionRateLperM3 : 10
    };
  }
  hydroState.volumeWaterM3 = hydroState.volumeWaterM3 != null ? hydroState.volumeWaterM3 : 100;
  hydroState.tankVolumeL = hydroState.tankVolumeL != null ? hydroState.tankVolumeL : 1000;
  hydroState.injectionRateLperM3 = hydroState.injectionRateLperM3 != null ? hydroState.injectionRateLperM3 : 10;
  (hydroState.fertilizers || []).forEach(f => { if (f.tank == null) f.tank = 'A'; });
  // Migración: si existe meq.N, dividir a N_NO3/N_NH4
  hydroState.stages = (hydroState.stages || []).map(s => {
    const stage = { ...s };
    stage.meq = stage.meq || {};
    if ((stage.meq.N != null) && (stage.meq.N_NO3 == null && stage.meq.N_NH4 == null)) {
      const nVal = parseFloat(stage.meq.N) || 0;
      stage.meq.N_NO3 = nVal * (HYDRO_N_SPLIT.NO3 / 100);
      stage.meq.N_NH4 = nVal * (HYDRO_N_SPLIT.NH4 / 100);
      delete stage.meq.N;
    }
    return stage;
  });
  hydroEnsureDefaults();
  hydroLoadCustomMaterials();
  initHydroponiaTabs();
  hydroRestoreLastTab();
  renderHydroAll();
  bindHydroEvents(container);
}

window.initHydroponiaUI = initHydroponiaUI;
window.saveHydroponiaData = hydroSaveData;
window.openHydroNewMaterialModal = openHydroNewMaterialModal;
window.openEditHydroCustomMaterial = openEditHydroCustomMaterial;
window.openHydroPreloadedCatalogModal = openHydroPreloadedCatalogModal;
window.removeHydroCustomMaterial = removeHydroCustomMaterial;
window.clearHydroCustomMaterials = clearHydroCustomMaterials;
