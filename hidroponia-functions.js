// =====================================================
// HIDROPONIA - Solución por etapa y cálculo básico
// =====================================================
// Orden: Amonio primero, luego aniones (N-NO₃, P-H₂PO₄, S-SO₄), luego cationes (K⁺, Ca²⁺, Mg²⁺)
const HYDRO_MEQ_NUTRIENTS = ['N_NH4','N_NO3','P','S','K','Ca','Mg'];
const HYDRO_ANIONS = ['N_NO3','P','S'];           // % entre ellos (100% aniones)
const HYDRO_CATIONS_TRIANGLE = ['K','Ca','Mg'];   // % entre K+Ca+Mg (100%, triángulo)
// N_NH4: % del total catiónico (K+Ca+Mg+NH4), no entra al triángulo
// Mismo orden que Cálculo de fertilizantes: macros (sin Cl), micros, Cl⁻ manual al final
const HYDRO_PPM_NUTRIENTS = ['N_NH4','N_NO3','P','S','K','Ca','Mg','Fe','Mn','B','Zn','Cu','Mo','Cl'];
const HYDRO_MICROS = ['Fe','Mn','B','Zn','Cu','Mo'];
const HYDRO_N_SPLIT = { NO3: 95, NH4: 5 };
// Conversión óxido → elemental (para materiales de fertirriego usados en hidroponía)
const HYDRO_OXIDE_TO_ELEMENTAL = { P2O5_TO_P: 2.291, K2O_TO_K: 1.204, CaO_TO_Ca: 1.399, MgO_TO_Mg: 1.658 };
const HYDRO_STAGE_OPTIONS = ['Establecimiento','Vegetativo','Prefloración','Floración','Amarre','Llenado','Cosecha'];
const HYDRO_STAGE_EN = {
  Establecimiento: 'Establishment',
  Vegetativo: 'Vegetative',
  Prefloración: 'Pre-flowering',
  Floración: 'Flowering',
  Amarre: 'Fruit set',
  Llenado: 'Filling',
  Cosecha: 'Harvest'
};

/*
 * Carga no bloqueante para el dashboard legado (no requiere editar dashboard.html).
 * Durante la carga el fallback es ES+metric, idéntico al comportamiento histórico.
 */
function hydroEnsurePresentationAssets() {
  if (typeof document === 'undefined') return;
  const queue = [
    ['NpPrefs', 'assets/np-prefs.js'],
    ['NpUnits', 'assets/np-units-core.js'],
    ['NpHydroUnits', 'assets/np-hydro-units.js?v=20260730c']
  ];
  const loadNext = function () {
    const next = queue.shift();
    if (!next) {
      try {
        if (document.querySelector('.hydroponia-container')) renderHydroAll();
      } catch (e) { /* La UI puede no estar inicializada todavía. */ }
      return;
    }
    if (window[next[0]]) {
      loadNext();
      return;
    }
    const script = document.createElement('script');
    script.src = next[1];
    script.onload = loadNext;
    script.onerror = loadNext;
    document.head.appendChild(script);
  };
  loadNext();
}

function hydroPresentation() {
  return (typeof window !== 'undefined' && window.NpHydroUnits) || null;
}

function hydroT(es, en) {
  let language = 'es';
  try {
    const prefs = window.NpPrefs && typeof window.NpPrefs.get === 'function' ? window.NpPrefs.get() : null;
    language = prefs && prefs.language ? prefs.language :
      (window.NpI18n && typeof window.NpI18n.getLanguage === 'function' ? window.NpI18n.getLanguage() : 'es');
  } catch (e) {}
  return language === 'en' ? en : es;
}

function hydroStageLabel(stageName) {
  return hydroT(stageName, HYDRO_STAGE_EN[stageName] || stageName);
}

function hydroDisplayFromSI(value, kind, options) {
  const api = hydroPresentation();
  return api ? api.fromSI(value, kind, options) : Number(value);
}

function hydroInputToSI(value, kind, options) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  const api = hydroPresentation();
  return api ? api.toSI(n, kind, options) : n;
}

/** Redondeo solo visual; el estado y los cálculos conservan precisión SI completa. */
function hydroDisplayInputValue(value, decimals = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(decimals));
}

function hydroDisplayUnit(kind, options) {
  const api = hydroPresentation();
  if (api) return api.unit(kind, options);
  return kind === 'water_volume' ? 'm3' : (kind === 'liquid_volume' ? 'L' : (kind === 'mass' ? 'kg' : 'g/L'));
}

function hydroUnitLabel(unit) {
  return unit === 'm3' ? 'm³' : (unit === 'kg/m3' ? 'kg/m³' : (unit === 'L/m3' ? 'L/m³' : unit));
}

function hydroDisplayMassKg(kg) {
  return { value: hydroDisplayFromSI(kg, 'mass'), unit: hydroDisplayUnit('mass') };
}

function hydroDisplayLiquidL(litres) {
  return { value: hydroDisplayFromSI((parseFloat(litres) || 0) / 1000, 'liquid_volume'), unit: hydroDisplayUnit('liquid_volume') };
}

function hydroInputLiquidToL(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return hydroPresentation() ? hydroInputToSI(n, 'liquid_volume') * 1000 : n;
}

hydroEnsurePresentationAssets();
const HYDRO_EQ_WEIGHTS = {
  N_NO3: 14.0,   // NO3- equiv.
  N_NH4: 14.0,   // NH4+ equiv.
  P: 31.0,       // H2PO4-
  K: 39.1,
  Ca: 20.04, // 40.08/2
  Mg: 12.15, // 24.3/2
  S: 16.03,  // SO4 2-
  /** Cl⁻ (ppm elemental → meq/L). No entra en CE (hydroComputeCE); solo leyendas y conversiones ppm↔meq de Cl */
  Cl: 35.45
};

/** N-NO₃⁻, N-NH₄⁺, Cl⁻: ppm en solución → meq/L (misma convención que la tabla meq/L de etapas + Cl manual). */
function hydroPpmToMeqForLegend(n, ppmVal) {
  if (n !== 'N_NO3' && n !== 'N_NH4' && n !== 'Cl') return 0;
  const w = HYDRO_EQ_WEIGHTS[n];
  if (!w) return 0;
  return (parseFloat(ppmVal) || 0) / w;
}

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
    case 'Cl': return 'Cl⁻';
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
  waterAnalysisId: null,
  fertilizers: [],
  volumeWaterM3: 100,
  tankVolumeL: 1000,
  injectionRateLperM3: 10
};

// Catálogo de fertilizantes solubles personalizados (hidroponía, concentración elemental %)
let hydroCustomMaterialsUser = [];
let hydroCustomSolutionsUser = [];

function hydroLoadCustomSolutionsSync() {
  const profile = hydroLoadUserProfile();
  hydroCustomSolutionsUser = Array.isArray(profile?.customHydroSolutions?.items)
    ? profile.customHydroSolutions.items
    : [];
}

function hydroSaveCustomSolutions() {
  const userId = hydroGetCurrentUserId();
  if (!userId) return;
  const profile = hydroLoadUserProfile() || {};
  profile.customHydroSolutions = { items: hydroCustomSolutionsUser };
  try { localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile)); } catch (e) {}
  try {
    if (typeof window.nutriplantSyncCustomHydroSolutionsToCloud === 'function') {
      window.nutriplantSyncCustomHydroSolutionsToCloud(userId, profile.customHydroSolutions);
    }
  } catch (e) { console.warn('Sync soluciones hidropónicas:', e); }
}

function hydroLoadCustomSolutions() {
  hydroLoadCustomSolutionsSync();
  const userId = hydroGetCurrentUserId();
  if (!userId || typeof window.nutriplantFetchCustomHydroSolutionsFromCloud !== 'function') return;
  window.nutriplantFetchCustomHydroSolutionsFromCloud(userId).then(function (bucket) {
    if (!bucket || !Array.isArray(bucket.items)) return;
    hydroCustomSolutionsUser = bucket.items;
    const profile = hydroLoadUserProfile() || {};
    profile.customHydroSolutions = bucket;
    try { localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile)); } catch (e) {}
  }).catch(function () {});
}

let hydroSaveTimer = null;
let hydroRenderTimer = null;
let hydroPpmLayoutTimer = null;
const HYDRO_PPM_LAYOUT_MS = 480;
/** Mientras se edita ppm (macros), se conserva el string para el re-render (evita 1 → 1.0 antes de "12") */
let hydroPpmTyping = null;

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
  const out = {
    id: mat.id,
    name: mat.name || mat.id,
    unit: mat.unit || 'kg',
    density: parseFloat(mat.density) || null,
    N_NH4: parseFloat(mat.N_NH4) || 0,
    N_NO3: parseFloat(mat.N_NO3) || 0,
    P, S: S_ele, K, Ca, Mg,
    Fe: parseFloat(mat.Fe) || 0, Mn: parseFloat(mat.Mn) || 0, B: parseFloat(mat.B) || 0,
    Zn: parseFloat(mat.Zn) || 0, Cu: parseFloat(mat.Cu) || 0, Mo: parseFloat(mat.Mo) || 0,
    Cl: parseFloat(mat.Cl) || 0
  };
  const price = parseFloat(mat.priceUsdPerTonne);
  if (Number.isFinite(price) && price >= 0) out.priceUsdPerTonne = price;
  return out;
}

let hydroPriceOverrides = {};

function hydroGetPriceApi() {
  return (typeof window !== 'undefined' && window.NpFertilizerPrice) ? window.NpFertilizerPrice : null;
}

function hydroResolveMaterialPrice(materialId) {
  const api = hydroGetPriceApi();
  if (!api) return 0;
  return api.resolvePriceUsdPerTonne(materialId, {
    customItems: hydroCustomMaterialsUser,
    priceOverrides: hydroPriceOverrides
  });
}

function hydroPersistPriceOverrides(overrides) {
  const api = hydroGetPriceApi();
  hydroPriceOverrides = api
    ? api.syncPriceOverridesToBoth(overrides)
    : (overrides && typeof overrides === 'object' ? overrides : {});
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
    try {
      const api = hydroGetPriceApi();
      const profile = hydroLoadUserProfile();
      const fromProfile = profile && profile.customHydroMaterials && profile.customHydroMaterials.priceOverrides
        ? profile.customHydroMaterials.priceOverrides
        : {};
      hydroPriceOverrides = api
        ? api.mergeOverrides(fromProfile, api.loadMergedPriceOverrides())
        : (fromProfile || {});
    } catch (e) { hydroPriceOverrides = {}; }
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
    const api = hydroGetPriceApi();
    const priceOverrides = api
      ? api.normalizeOverrides(hydroPriceOverrides)
      : (hydroPriceOverrides && typeof hydroPriceOverrides === 'object' ? hydroPriceOverrides : {});
    hydroPriceOverrides = priceOverrides;
    const blob = { items, priceOverrides };
    const userId = hydroGetCurrentUserId();
    if (userId) {
      const profile = hydroLoadUserProfile() || {};
      profile.customHydroMaterials = blob;
      hydroSaveUserProfile(profile);
      if (api) api.syncPriceOverridesToBoth(priceOverrides);
    } else {
      try {
        localStorage.setItem('hydroCustomMaterials_global_user', JSON.stringify(blob));
        if (api) api.syncPriceOverridesToBoth(priceOverrides);
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
    const fertilizerTotalsMeq = hydroFertTotalsPpmToMeq(fertilizerTotalsPpm);
    const fertilizerTotalsPctMeq = hydroComputePctMeqFromMeq(fertilizerTotalsMeq);
    hydroLoadCustomMaterials();
    const payload = {
      stages: hydroState.stages,
      activeStageId: hydroState.activeStageId,
      volumeWaterM3: hydroState.volumeWaterM3,
      tankVolumeL: hydroState.tankVolumeL,
      injectionRateLperM3: hydroState.injectionRateLperM3,
      water: hydroState.water,
      waterAnalysisId: hydroState.waterAnalysisId || null,
      acidDoseSummary: (typeof hydroBuildAcidDoseSummary === 'function') ? hydroBuildAcidDoseSummary() : null,
      fertilizers: fertilizersToSave,
      fertilizerTotalsPpm,
      fertilizerTotalsMeq,
      fertilizerTotalsPctMeq,
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

/** Cancela el debounce y guarda ya (p. ej. al cambiar de subpestaña; mismo criterio que Fertirriego). */
function hydroFlushSaveNow() {
  try {
    if (hydroSaveTimer) {
      clearTimeout(hydroSaveTimer);
      hydroSaveTimer = null;
    }
    hydroSaveData();
  } catch (e) {
    console.warn('⚠️ hydroFlushSaveNow:', e);
  }
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
    ppm: { N_NO3: 0, N_NH4: 0, P: 0, K: 0, Ca: 0, Mg: 0, S: 0, Cl: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0 }
  };
}

function hydroEnsureDefaults() {
  if (!Array.isArray(hydroState.stages) || hydroState.stages.length === 0) {
    const s1 = hydroDefaultStage('Solución nutritiva');
    hydroState.stages = [s1];
    hydroState.activeStageId = null;
  }
  if (!hydroState.water) hydroState.water = {};
  if (!Array.isArray(hydroState.fertilizers)) hydroState.fertilizers = [];
}

function hydroGetActiveStage() {
  return hydroState.stages.find(s => s.id === hydroState.activeStageId) || hydroState.stages[0] || null;
}

function hydroOpenSolutionCatalog() {
  const catalog = window.NpHydroSolutionCatalog;
  if (!catalog) return;
  hydroLoadCustomSolutionsSync();
  const macroKeys = ['N_NH4', 'N_NO3', 'P', 'S', 'K', 'Ca', 'Mg'];
  const microKeys = ['Fe', 'Mn', 'Zn', 'B', 'Cu', 'Mo'];
  const all = catalog.all(hydroCustomSolutionsUser);
  const rows = all.map(function (recipe, index) {
    const custom = index >= catalog.builtIn.length;
    return '<tr><td><strong>' + hydroEscapeAttr(recipe.name) + '</strong>' + (custom ? ' <small>(' + hydroT('propia', 'custom') + ')</small>' : '') + '</td>' +
      macroKeys.map(k => '<td>' + (recipe.meq[k] || 0) + '</td>').join('') +
      microKeys.map(k => '<td>' + (recipe.ppm[k] || 0) + '</td>').join('') +
      '<td><button data-hydro-solution-choose="' + hydroEscapeAttr(recipe.id) + '">' + hydroT('Elegir', 'Choose') + '</button>' +
      (custom ? ' <button data-hydro-solution-edit="' + hydroEscapeAttr(recipe.id) + '">' + hydroT('Editar', 'Edit') + '</button><button data-hydro-solution-delete="' + hydroEscapeAttr(recipe.id) + '">' + hydroT('Eliminar', 'Delete') + '</button>' : '') + '</td></tr>';
  }).join('');
  const overlay = document.createElement('div');
  overlay.className = 'hydro-solution-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.55)';
  overlay.innerHTML = '<section style="width:min(1120px,100%);max-height:85vh;overflow:auto;background:#fff;border-radius:14px;padding:20px;box-shadow:0 24px 60px rgba(15,23,42,.25)" role="dialog" aria-modal="true">' +
    '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2 style="margin:0">' + hydroT('Catálogo de soluciones nutritivas', 'Nutrient solution catalog') + '</h2><p>' + hydroT('Macros en meq/L y micros en ppm.', 'Macros in meq/L and micros in ppm.') + '</p></div><button data-hydro-solution-close>×</button></div>' +
    (hydroGetCurrentUserId() ? '<button data-hydro-solution-new>' + hydroT('+ Crear solución propia', '+ Create custom solution') + '</button>' : '') +
    '<div style="overflow:auto"><table class="hydro-table" style="margin-top:12px"><thead><tr><th>' + hydroT('Solución', 'Solution') + '</th>' +
    macroKeys.map(k => '<th>' + hydroLabelHtml(k) + '<br>meq/L</th>').join('') + microKeys.map(k => '<th>' + k + '<br>ppm</th>').join('') + '<th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  const saveFromActive = function (existingId) {
    const active = hydroGetActiveStage();
    const name = window.prompt(hydroT('Nombre de la solución', 'Solution name'), active && active.name || '');
    if (!name || !active) return;
    const entry = {
      id: existingId || 'solution_' + Date.now(),
      name: name.trim(),
      meq: Object.assign({}, active.meq),
      ppm: Object.assign({}, active.ppm),
      updatedAt: new Date().toISOString()
    };
    const found = hydroCustomSolutionsUser.findIndex(item => item.id === entry.id);
    if (found >= 0) hydroCustomSolutionsUser[found] = entry; else hydroCustomSolutionsUser.push(entry);
    hydroSaveCustomSolutions();
    overlay.remove();
    hydroOpenSolutionCatalog();
  };
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay || event.target.closest('[data-hydro-solution-close]')) { overlay.remove(); return; }
    if (event.target.closest('[data-hydro-solution-new]')) { saveFromActive(null); return; }
    const choose = event.target.closest('[data-hydro-solution-choose]');
    if (choose) {
      const recipe = all.find(item => item.id === choose.getAttribute('data-hydro-solution-choose'));
      const active = hydroGetActiveStage();
      catalog.apply(recipe, active);
      active.ce = hydroComputeCE(active).toFixed(2);
      renderHydroAll();
      hydroScheduleSave();
      overlay.remove();
      return;
    }
    const edit = event.target.closest('[data-hydro-solution-edit]');
    if (edit) { saveFromActive(edit.getAttribute('data-hydro-solution-edit')); return; }
    const del = event.target.closest('[data-hydro-solution-delete]');
    if (del && window.confirm(hydroT('¿Eliminar esta solución propia?', 'Delete this custom solution?'))) {
      hydroCustomSolutionsUser = hydroCustomSolutionsUser.filter(item => item.id !== del.getAttribute('data-hydro-solution-delete'));
      hydroSaveCustomSolutions();
      overlay.remove();
      hydroOpenSolutionCatalog();
    }
  });
  document.body.appendChild(overlay);
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

function hydroRound2(v) {
  const x = parseFloat(v);
  if (isNaN(x)) return 0;
  return Math.round(x * 100) / 100;
}

function hydroEscapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Inversa de hydroComputeMacroPpm: ppm (elemento) → meq/L, 2 decimales (mismos equivalentes) */
function hydroMeqFromMacroPpm(ppmRow) {
  const meq = {};
  HYDRO_MEQ_NUTRIENTS.forEach(n => {
    const w = HYDRO_EQ_WEIGHTS[n];
    meq[n] = w ? hydroRound2((parseFloat(ppmRow[n]) || 0) / w) : 0;
  });
  return meq;
}

function hydroSavePpmInputFocusState(input) {
  if (!input) return null;
  const s = String(input.value || '');
  return {
    stageId: input.getAttribute('data-stage-id'),
    nutrient: input.getAttribute('data-nutrient'),
    type: 'ppm',
    start: (typeof input.selectionStart === 'number' && !isNaN(input.selectionStart)) ? input.selectionStart : s.length,
    end: (typeof input.selectionEnd === 'number' && !isNaN(input.selectionEnd)) ? input.selectionEnd : s.length
  };
}

function hydroRestorePpmInputFocus(fi) {
  if (!fi || !fi.stageId || !fi.nutrient) return;
  const cur = document.activeElement;
  if (cur && cur.getAttribute) {
    const dt = cur.getAttribute('data-type');
    if (dt === 'meq' || cur.getAttribute('data-field') === 'ce' || (cur.classList && cur.classList.contains('hydro-stage-select'))) return;
  }
  const wrap = document.getElementById('hydroPpmTableWrap');
  if (!wrap) return;
  const el = wrap.querySelector(
    'input.hydro-ppm-macro[data-type="ppm"][data-stage-id="' + fi.stageId + '"][data-nutrient="' + fi.nutrient + '"]'
  );
  if (!el) return;
  el.focus();
  if (el.setSelectionRange) {
    const len = String(el.value).length;
    const a = Math.max(0, Math.min(fi.start != null ? fi.start : len, len));
    const b = Math.max(0, Math.min(fi.end != null ? fi.end : len, len));
    try { el.setSelectionRange(a, b); } catch (e) { /* */ }
  }
}

/** Actualiza celdas meq/CE mientras tipeás en ppm (sin rearmar toda la tabla = no se cae el foco). */
function hydroPatchMeqAndCeFromPpmState(root, stage) {
  if (!root || !stage) return;
  const id = stage.id;
  HYDRO_MEQ_NUTRIENTS.forEach(n => {
    const el = root.querySelector(
      '#hydroMeqTableWrap input.hydro-input[data-type="meq"][data-stage-id="' + id + '"][data-nutrient="' + n + '"]'
    );
    if (el) {
      const m = (stage.meq && stage.meq[n] != null) ? stage.meq[n] : 0;
      const v = hydroRound2(m);
      if (el !== document.activeElement) el.value = v.toFixed(2);
    }
  });
  const ce = parseFloat(hydroComputeCE(stage)) || 0;
  stage.ce = ce.toFixed(2);
  const ceEl = root.querySelector(
    '#hydroMeqTableWrap input.hydro-input[data-field="ce"][data-stage-id="' + id + '"]'
  );
  if (ceEl) ceEl.value = stage.ce;
}

function hydroSchedulePpmLayoutSync(focusInfo) {
  if (hydroPpmLayoutTimer) clearTimeout(hydroPpmLayoutTimer);
  hydroPpmLayoutTimer = setTimeout(function() {
    hydroPpmLayoutTimer = null;
    renderHydroStageTable();
    renderHydroNitrogenSummary();
    renderHydroTriangle();
    renderHydroObjective();
    renderHydroMissing();
    requestAnimationFrame(function() { hydroRestorePpmInputFocus(focusInfo); });
  }, HYDRO_PPM_LAYOUT_MS);
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
          <button type="button" class="hydro-input hydro-solution-picker" data-hydro-solution-picker>${hydroEscapeAttr(stage.name || hydroT('Solución nutritiva', 'Nutrient solution'))}</button>
        </td>
        <td><input class="hydro-input" data-stage-id="${stage.id}" data-field="ce" type="number" step="0.01" value="${stage.ce ?? ''}" readonly></td>
        ${HYDRO_MEQ_NUTRIENTS.map(n => {
          const mv = (stage.meq && stage.meq[n] != null) ? stage.meq[n] : 0;
          return `<td class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}"><input class="hydro-input" data-stage-id="${stage.id}" data-type="meq" data-nutrient="${n}" type="number" step="0.01" value="${hydroRound2(mv).toFixed(2)}"></td>`;
        }).join('')}
      </tr>
    `;
  }).join('');

  meqWrap.innerHTML = `
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored">
        <thead>
          <tr>
            <th>${hydroT('Solución nutritiva', 'Nutrient solution')}</th>
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
      <tr data-stage-id="${stage.id}">
        <td>${hydroEscapeAttr(stage.name || hydroT('Solución nutritiva', 'Nutrient solution'))}</td>
        <td>${stage.ce ?? ''}</td>
        ${HYDRO_MEQ_NUTRIENTS.map(n => {
          const useLive = hydroPpmTyping && hydroPpmTyping.stageId === stage.id && hydroPpmTyping.nutrient === n;
          const vAttr = useLive
            ? hydroEscapeAttr(hydroPpmTyping.raw)
            : hydroEscapeAttr((macroPpm[n] != null ? macroPpm[n] : 0).toFixed(1));
          return `<td class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}"><input class="hydro-input hydro-ppm-macro" data-stage-id="${stage.id}" data-type="ppm" data-nutrient="${n}" type="text" inputmode="decimal" autocomplete="off" value="${vAttr}"></td>`;
        }).join('')}
        ${HYDRO_MICROS.map((n, idx) => `<td class="${idx === 0 ? 'hydro-micro-start' : ''}"><input class="hydro-input" data-stage-id="${stage.id}" data-type="ppm" data-nutrient="${n}" type="number" step="0.01" value="${stage.ppm?.[n] ?? 0}"></td>`).join('')}
        <td class="hydro-col-cl hydro-col-cl-after-micros"><input class="hydro-input" data-stage-id="${stage.id}" data-type="ppm" data-nutrient="Cl" type="number" step="0.01" value="${stage.ppm?.Cl ?? 0}"></td>
      </tr>
    `;
  }).join('');

  ppmWrap.innerHTML = `
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored">
        <thead>
          <tr>
            <th>${hydroT('Solución nutritiva', 'Nutrient solution')}</th>
            <th>CE (dS/m)</th>
            ${HYDRO_MEQ_NUTRIENTS.map(n => `<th class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${hydroLabelHtml(n)} <span class="notranslate" translate="no">ppm</span></th>`).join('')}
            ${HYDRO_MICROS.map((n, idx) => `<th class="${idx === 0 ? 'hydro-micro-start' : ''}">${hydroLabelHtml(n)} <span class="notranslate" translate="no">ppm</span></th>`).join('')}
            <th class="hydro-col-cl hydro-col-cl-after-micros">${hydroLabelHtml('Cl')} <span class="notranslate" translate="no">ppm</span></th>
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
        <td>${hydroEscapeAttr(stage.name || hydroT('Solución nutritiva', 'Nutrient solution'))}</td>
        ${HYDRO_MEQ_NUTRIENTS.map(n => `<td class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${pct[n].toFixed(1)}</td>`).join('')}
      </tr>
    `;
  }).join('');

  pctWrap.innerHTML = `
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored">
        <thead>
          <tr>
            <th>${hydroT('Solución nutritiva', 'Nutrient solution')}</th>
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
  const anSquare = `<rect x="${anPoint.x - 6}" y="${anPoint.y - 6}" width="12" height="12" fill="${anInside ? '#eab308' : '#b45309'}" stroke="#92400e" stroke-width="1.2" />`;

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

  // Etiquetas simples y estables: mitad de cada lado + separacion fija.
  const leftMid = lerp(vTop, vLeft, 0.5);
  const rightMid = lerp(vTop, vRight, 0.5);
  const bottomMid = lerp(vLeft, vRight, 0.5);
  const lC = { x: leftMid.x - 28, y: leftMid.y };
  const rC = { x: rightMid.x + 28, y: rightMid.y };
  const bC = { x: bottomMid.x, y: bottomMid.y + 26 };
  const edgeLabels =
    `<text class="notranslate" translate="no" x="${lC.x}" y="${lC.y}" text-anchor="end" dominant-baseline="middle" font-size="12" font-weight="700" fill="#334155">Mg²⁺ / SO₄²⁻</text>` +
    `<text class="notranslate" translate="no" x="${rC.x}" y="${rC.y}" text-anchor="start" dominant-baseline="middle" font-size="12" font-weight="700" fill="#334155">Ca²⁺ / H₂PO₄⁻</text>` +
    `<text class="notranslate" translate="no" x="${bC.x}" y="${bC.y}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#334155">K⁺ / NO₃⁻</text>`;

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
      ${anSquare}
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
    container.innerHTML = `<div class="hydro-muted">${hydroT('Selecciona una etapa para ver el diagrama.', 'Select a stage to view the diagram.')}</div>`;
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
    info.textContent = `${hydroT('Aniones', 'Anions')}: N-NO₃⁻ ${pNO3.toFixed(1)}% · P-H₂PO₄⁻ ${pH2PO4.toFixed(1)}% · S-SO₄²⁻ ${pSO4.toFixed(1)}% | ${hydroT('Cationes', 'Cations')}: K⁺ ${pK.toFixed(1)}% · Ca²⁺ ${pCa.toFixed(1)}% · Mg²⁺ ${pMg.toFixed(1)}%`;
  }
}

function renderHydroObjective() {
  const grid = document.getElementById('hydroObjectiveGrid');
  const stage = hydroGetActiveStage();
  if (!grid) return;
  if (!stage) {
    grid.innerHTML = `<div class="hydro-muted">${hydroT('No hay etapa seleccionada', 'No stage selected')}</div>`;
    return;
  }
  grid.innerHTML = HYDRO_PPM_NUTRIENTS.map((n) => {
    const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : (n === 'Cl' ? ' hydro-grid-item-cl hydro-grid-item-cl-tail' : ''));
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
    const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : (n === 'Cl' ? ' hydro-grid-item-cl hydro-grid-item-cl-tail' : ''));
    return `
    <div class="hydro-grid-item${extraClass}">
      <span class="hydro-grid-label">${hydroLabelHtml(n)}</span>
      <input class="hydro-input" data-water-nutrient="${n}" type="number" step="0.1" value="${hydroState.water?.[n] ?? 0}">
    </div>
  `;
  }).join('');
  hydroRefreshWaterAnalysisSelect();
}

function hydroGetProjectWaterAnalyses() {
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
    const pid = hydroGetProjectId();
    if (pid && window.projectStorage && typeof window.projectStorage.loadSection === 'function') {
      const section = window.projectStorage.loadSection('aguaAnalyses', pid);
      if (Array.isArray(section)) return section;
    }
  } catch (e) {}
  return [];
}

function hydroWaterAnalysisLabel(analysis, index) {
  const title = (analysis && analysis.title && String(analysis.title).trim()) || '';
  const date = (analysis && analysis.date && String(analysis.date).trim()) || '';
  if (title && date) return title + ' · ' + date;
  if (title) return title;
  if (date) return hydroT('Análisis', 'Analysis') + ' · ' + date;
  return hydroT('Análisis de agua', 'Water analysis') + ' #' + (index + 1);
}

function hydroPpmFromAguaAnalysis(analysis) {
  const cations = (analysis && analysis.cations) || {};
  const anions = (analysis && analysis.anions) || {};
  const micros = (analysis && analysis.micros) || {};
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    N_NH4: 0,
    N_NO3: num(anions.no3_ppm),
    P: num(anions.po4_ppm),
    S: num(anions.so4_ppm),
    K: num(cations.k_ppm),
    Ca: num(cations.ca_ppm),
    Mg: num(cations.mg_ppm),
    Fe: num(micros.fe),
    Mn: num(micros.mn),
    B: num(micros.b),
    Zn: num(micros.zn),
    Cu: num(micros.cu),
    Mo: 0,
    Cl: num(anions.cl_ppm)
  };
}

const HYDRO_WATER_ACIDS = (typeof window !== 'undefined' && window.NpHydroAcidLegend && window.NpHydroAcidLegend.ACIDS)
  ? window.NpHydroAcidLegend.ACIDS
  : {
    acido_nitrico_55: { nameEs: 'Ácido Nítrico 55%', nameEn: 'Nitric Acid 55%', meqPerMl: 11.6, densityKgL: 1.37 },
    acido_sulfurico_98: { nameEs: 'Ácido Sulfúrico 98%', nameEn: 'Sulfuric Acid 98%', meqPerMl: 36.7, densityKgL: 1.84 },
    acido_fosforico_75: { nameEs: 'Ácido Fosfórico 75%', nameEn: 'Phosphoric Acid 75%', meqPerMl: 12, densityKgL: 1.57 },
    acido_fosforico_85: { nameEs: 'Ácido Fosfórico 85%', nameEn: 'Phosphoric Acid 85%', meqPerMl: 14.6, densityKgL: 1.69 }
  };

function hydroGetSelectedWaterAnalysis() {
  const id = hydroState.waterAnalysisId;
  if (!id) return null;
  return hydroGetProjectWaterAnalyses().find(a => a && a.id === id) || null;
}

function hydroAnalysisVolumeM3(analysis) {
  if (window.NpHydroAcidLegend && typeof window.NpHydroAcidLegend.analysisVolumeM3 === 'function') {
    return window.NpHydroAcidLegend.analysisVolumeM3(analysis);
  }
  const n = parseFloat(analysis && analysis.m3Riego);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hydroVolumesMatch(a, b, tol) {
  if (window.NpHydroAcidLegend && typeof window.NpHydroAcidLegend.volumesMatch === 'function') {
    return window.NpHydroAcidLegend.volumesMatch(a, b, tol);
  }
  const x = parseFloat(a) || 0;
  const y = parseFloat(b) || 0;
  return Math.abs(x - y) <= (tol == null ? 0.01 : tol);
}

function hydroWaterAcidCalculation(analysis) {
  const hydroVolumeM3 = Math.max(0, parseFloat(hydroState.volumeWaterM3) || 0);
  if (window.NpHydroAcidLegend && typeof window.NpHydroAcidLegend.calculate === 'function') {
    return window.NpHydroAcidLegend.calculate(analysis, hydroVolumeM3);
  }
  if (!analysis) return null;
  const anions = analysis.anions || {};
  const hasCarbonateData = (anions.hco3_meq !== '' && anions.hco3_meq != null) ||
    (anions.co3_meq !== '' && anions.co3_meq != null);
  if (!hasCarbonateData) return null;
  const hco3 = Math.max(0, parseFloat(anions.hco3_meq) || 0);
  const co3 = Math.max(0, parseFloat(anions.co3_meq) || 0);
  const residualRaw = parseFloat(analysis.acidResidualMeq);
  const residualMeq = Number.isFinite(residualRaw) && residualRaw >= 0 ? residualRaw : 1;
  const acidId = analysis.acidId || 'acido_nitrico_55';
  const acid = HYDRO_WATER_ACIDS[acidId];
  if (!acid || !(acid.meqPerMl > 0)) return null;
  const neededMeqL = Math.max(0, hco3 + co3 - residualMeq);
  const mlPerM3 = neededMeqL * 1000 / acid.meqPerMl;
  const analysisVolumeM3 = hydroAnalysisVolumeM3(analysis);
  return {
    acidId,
    acid,
    hco3,
    co3,
    residualMeq,
    neededMeqL,
    mlPerM3,
    analysisVolumeM3,
    hydroVolumeM3,
    analysisTotalLiters: mlPerM3 * analysisVolumeM3 / 1000,
    totalLiters: mlPerM3 * hydroVolumeM3 / 1000,
    volumesMatch: analysisVolumeM3 > 0 && hydroVolumesMatch(analysisVolumeM3, hydroVolumeM3)
  };
}

function hydroBuildAcidDoseSummary() {
  const analysis = hydroGetSelectedWaterAnalysis();
  const calc = hydroWaterAcidCalculation(analysis);
  if (window.NpHydroAcidLegend && typeof window.NpHydroAcidLegend.toSummary === 'function') {
    return window.NpHydroAcidLegend.toSummary(calc, hydroState.waterAnalysisId || (analysis && analysis.id) || null);
  }
  return { waterAnalysisId: hydroState.waterAnalysisId || null, hasAcid: !!calc };
}

function hydroUiLang() {
  try {
    const prefs = window.NpPrefs && typeof window.NpPrefs.get === 'function' ? window.NpPrefs.get() : null;
    const language = prefs && prefs.language ? prefs.language :
      (window.NpI18n && typeof window.NpI18n.getLanguage === 'function' ? window.NpI18n.getLanguage() : 'es');
    return language === 'en' ? 'en' : 'es';
  } catch (e) {
    return 'es';
  }
}

function hydroVolumeMatchNoteHtml(analysisVolumeM3) {
  const lang = hydroUiLang();
  const hydroVolumeM3 = Math.max(0, parseFloat(hydroState.volumeWaterM3) || 0);
  if (window.NpHydroAcidLegend && typeof window.NpHydroAcidLegend.volumeMatchNoteHtml === 'function') {
    return window.NpHydroAcidLegend.volumeMatchNoteHtml(lang, analysisVolumeM3, hydroVolumeM3, 'hydro');
  }
  return '';
}

function renderHydroAcidSummary() {
  const wrap = document.getElementById('hydroAcidSummary');
  if (!wrap) return;
  const analysis = hydroGetSelectedWaterAnalysis();
  const lang = hydroUiLang();
  if (window.NpHydroAcidLegend && typeof window.NpHydroAcidLegend.buildHtml === 'function') {
    const label = analysis
      ? hydroEscapeAttr(hydroWaterAnalysisLabel(analysis, hydroGetProjectWaterAnalyses().indexOf(analysis)))
      : '';
    wrap.innerHTML = window.NpHydroAcidLegend.buildHtml({
      lang,
      analysis,
      hydroVolumeM3: hydroState.volumeWaterM3,
      analysisLabel: label,
      linked: !!hydroState.waterAnalysisId,
      classPrefix: 'hydro',
      wrap: false
    });
    return;
  }
  wrap.innerHTML = '';
}

function hydroRefreshWaterAnalysisSelect() {
  const select = document.getElementById('hydroImportWaterSelect');
  if (!select) return;
  const previous = select.value;
  const list = hydroGetProjectWaterAnalyses();
  const placeholder = hydroT('Traer de análisis', 'Bring from analysis');
  let html = `<option value="">${placeholder}</option>`;
  if (!list.length) {
    html += `<option value="" disabled>${hydroT('Sin análisis de agua en este proyecto', 'No water analyses in this project')}</option>`;
  } else {
    html += list.map((analysis, index) => {
      const id = hydroEscapeAttr(analysis && analysis.id ? analysis.id : ('idx_' + index));
      const label = hydroEscapeAttr(hydroWaterAnalysisLabel(analysis, index));
      return `<option value="${id}">${label}</option>`;
    }).join('');
  }
  select.innerHTML = html;
  const selectedId = previous || hydroState.waterAnalysisId || '';
  if (selectedId && list.some(a => a && a.id === selectedId)) select.value = selectedId;
  else select.value = '';
  select.title = hydroT('Traer ppm desde un análisis de agua guardado en este proyecto', 'Load ppm from a water analysis saved in this project');
}

function hydroApplyWaterAnalysisById(analysisId) {
  if (!analysisId) return false;
  const list = hydroGetProjectWaterAnalyses();
  const analysis = list.find(a => a && a.id === analysisId);
  if (!analysis) return false;
  hydroState.waterAnalysisId = analysisId;
  hydroState.water = Object.assign({}, hydroState.water || {}, hydroPpmFromAguaAnalysis(analysis));
  renderHydroWater();
  renderHydroAcidSummary();
  renderHydroVolumeCard();
  renderHydroMissing();
  hydroScheduleSave();
  return true;
}

function renderHydroMissing() {
  const grid = document.getElementById('hydroMissingGrid');
  const stage = hydroGetActiveStage();
  if (!grid) return;
  if (!stage) {
    grid.innerHTML = `<div class="hydro-muted">${hydroT('No hay etapa seleccionada', 'No stage selected')}</div>`;
    return;
  }
  grid.innerHTML = HYDRO_PPM_NUTRIENTS.map(n => {
    const obj = parseFloat(stage.ppm?.[n] || 0);
    const water = parseFloat(hydroState.water?.[n] || 0);
    const missing = obj - water;
    const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : (n === 'Cl' ? ' hydro-grid-item-cl hydro-grid-item-cl-tail' : ''));
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

function hydroAutoCalculateSolution() {
  const stage = hydroGetActiveStage();
  if (!stage) return;
  if (hydroState.fertilizers.length && !window.confirm(hydroT(
    'El cálculo automático reemplazará las filas actuales de fertilizantes. ¿Continuar?',
    'Automatic calculation will replace the current fertilizer rows. Continue?'
  ))) return;

  const materials = getAllHydroMaterials();
  const byId = (id) => materials.find(m => m && m.id === id);
  const required = {};
  HYDRO_PPM_NUTRIENTS.forEach(n => {
    required[n] = Math.max(0, (parseFloat(stage.ppm?.[n]) || 0) - (parseFloat(hydroState.water?.[n]) || 0));
  });
  hydroState.fertilizers = [];

  const addTargetRow = (materialId, element, targetPpm, tank, order) => {
    const mat = byId(materialId);
    const target = Math.max(0, parseFloat(targetPpm) || 0);
    if (!mat || !(parseFloat(mat[element]) > 0) || target <= 0.001) return null;
    const row = {
      id: 'fert_auto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      materialId,
      element,
      targetPpm: target,
      calcMode: 'ppm',
      productTotalL: 0,
      tank: tank || 'B',
      autoOrder: order || 50
    };
    hydroState.fertilizers.push(row);
    return row;
  };
  const totals = () => hydroGetFertTotalsPpm();
  const remaining = (n) => Math.max(0, (required[n] || 0) - (totals()[n] || 0));
  const ratio = (materialId, numerator, denominator) => {
    const mat = byId(materialId);
    const den = parseFloat(mat?.[denominator]) || 0;
    return den > 0 ? (parseFloat(mat?.[numerator]) || 0) / den : 0;
  };

  // El ácido calculado se incorpora primero para descontar su aporte de N, P o S.
  const acidCalc = hydroWaterAcidCalculation(hydroGetSelectedWaterAnalysis());
  if (acidCalc && acidCalc.totalLiters > 0 && byId(acidCalc.acidId)) {
    hydroState.fertilizers.push({
      id: 'fert_auto_acid_' + Date.now(),
      materialId: acidCalc.acidId,
      element: acidCalc.acidId.indexOf('nitrico') >= 0 ? 'N_NO3' : (acidCalc.acidId.indexOf('fosforico') >= 0 ? 'P' : 'S'),
      targetPpm: 0,
      calcMode: 'product',
      productTotalL: acidCalc.totalLiters,
      tank: 'C',
      autoOrder: 90
    });
  }

  // 1) Calcio: nitrato de calcio en tanque A.
  addTargetRow('nitrato_calcio_granular', 'Ca', remaining('Ca'), 'A', 10);

  // 2) Amonio + fósforo: MAP hasta el menor límite; MKP completa el P.
  const mapNh4PerP = ratio('map', 'N_NH4', 'P');
  const mapNh4Target = Math.min(remaining('N_NH4'), remaining('P') * mapNh4PerP);
  addTargetRow('map', 'N_NH4', mapNh4Target, 'B', 30);
  addTargetRow('mkp', 'P', remaining('P'), 'B', 31);

  // 3) NKS cubre el nitrato pendiente sin rebasar el K pendiente.
  const nksNPerK = ratio('nks', 'N_NO3', 'K');
  const nksNTarget = Math.min(remaining('N_NO3'), remaining('K') * nksNPerK);
  addTargetRow('nks', 'N_NO3', nksNTarget, 'B', 40);

  // 4) Magnesio: nitrato de Mg si aún falta nitrato; no empuja S todavía.
  const nitrateMgPerN = ratio('nitrato_magnesio', 'Mg', 'N_NO3');
  const mgFromNitrate = Math.min(remaining('Mg'), remaining('N_NO3') * nitrateMgPerN);
  addTargetRow('nitrato_magnesio', 'Mg', mgFromNitrate, 'A', 20);

  // 5) SOP completa solamente el potasio que todavía falta (también aporta S).
  addTargetRow('sop', 'K', remaining('K'), 'B', 41);

  // 6) El amonio restante se completa con sulfato de amonio (también aporta S).
  addTargetRow('sulfato_amonio_soluble', 'N_NH4', remaining('N_NH4'), 'B', 50);

  // 7) Micronutrientes, uno por elemento.
  [
    ['fe_eddha', 'Fe'],
    ['quelato_mn', 'Mn'],
    ['acido_borico', 'B'],
    ['quelato_zn', 'Zn'],
    ['quelato_cu', 'Cu'],
    ['molibdato_sodio', 'Mo']
  ].forEach((pair, index) => addTargetRow(pair[0], pair[1], remaining(pair[1]), 'B', 60 + index));

  // 8) Último: sulfatos. Primero el Mg restante; si aún falta S, se completa con sulfato de Mg.
  // El S casi siempre se pasa o falta un poco: se cierra al final y se reporta.
  const mgSulfateRow = addTargetRow('sulfato_magnesio', 'Mg', remaining('Mg'), 'B', 80);
  const sStillNeeded = remaining('S');
  if (sStillNeeded > 0.05) {
    if (mgSulfateRow) {
      const mat = byId('sulfato_magnesio');
      const sPct = parseFloat(mat && mat.S) || 0;
      const mgPct = parseFloat(mat && mat.Mg) || 0;
      if (sPct > 0 && mgPct > 0) {
        const extraMgForS = sStillNeeded * (mgPct / sPct);
        mgSulfateRow.targetPpm = (parseFloat(mgSulfateRow.targetPpm) || 0) + extraMgForS;
        mgSulfateRow.element = 'Mg';
      }
    } else {
      addTargetRow('sulfato_magnesio', 'S', sStillNeeded, 'B', 81);
    }
  }

  hydroState.fertilizers.sort((a, b) => (a.autoOrder || 50) - (b.autoOrder || 50));
  renderHydroFertTable();
  renderHydroFertTotals();
  renderHydroVolumeCard();
  hydroScheduleSave();

  const finalTotals = hydroGetFertTotalsPpm();
  const unresolved = HYDRO_PPM_NUTRIENTS.filter(n =>
    n !== 'Cl' && n !== 'S' && Math.max(0, required[n] - (finalTotals[n] || 0)) > 0.05
  );
  const sDelta = (finalTotals.S || 0) - (required.S || 0);
  let sNote = '';
  if (Math.abs(sDelta) > 0.05) {
    sNote = sDelta > 0
      ? hydroT(
        ' Azufre (S): se pasó ~' + sDelta.toFixed(2) + ' ppm (normal al cerrar con sulfatos).',
        ' Sulfur (S): overshot by ~' + sDelta.toFixed(2) + ' ppm (common when closing with sulfates).'
      )
      : hydroT(
        ' Azufre (S): faltan ~' + Math.abs(sDelta).toFixed(2) + ' ppm (normal al cerrar con sulfatos).',
        ' Sulfur (S): short by ~' + Math.abs(sDelta).toFixed(2) + ' ppm (common when closing with sulfates).'
      );
  }
  if (window.showMessage) {
    const base = unresolved.length
      ? hydroT(
        'Propuesta calculada. Revisa los nutrientes todavía pendientes: ',
        'Proposal calculated. Review nutrients still pending: '
      ) + unresolved.map(hydroLabelPlain).join(', ')
      : hydroT('Propuesta automática calculada. Revisa compatibilidad y dosis antes de aplicarla.', 'Automatic proposal calculated. Review compatibility and doses before applying.');
    window.showMessage(base + sNote, (unresolved.length || Math.abs(sDelta) > 0.05) ? 'warning' : 'success');
  }
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

const thClass = (n) => n === 'N_NH4' ? ' hydro-col-nh4' : (n === 'Fe' ? ' hydro-micro-start' : (n === 'Cl' ? ' hydro-col-cl hydro-col-cl-after-micros' : ''));

/** Totales ppm del aporte de fertilizantes en solución (Cálculo de fertilizantes). */
function hydroGetFertTotalsPpm() {
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
  return totals;
}

/** ppm aportadas → meq/L (macros + Cl⁻; mismos equivalentes que la tabla de etapas). */
function hydroFertTotalsPpmToMeq(totals) {
  const ppmMacro = {};
  HYDRO_MEQ_NUTRIENTS.forEach(n => { ppmMacro[n] = parseFloat(totals[n]) || 0; });
  const meq = hydroMeqFromMacroPpm(ppmMacro);
  meq.Cl = hydroPpmToMeqForLegend('Cl', totals.Cl);
  return meq;
}

/** % meq como en «Solución nutritiva por etapa»: aniones sin Cl; K+Ca+Mg sin NH₄; NH₄ sobre catiónico total. */
function hydroComputePctMeqFromMeq(meq) {
  const sumAnions = HYDRO_ANIONS.reduce((acc, n) => acc + (parseFloat(meq[n]) || 0), 0);
  const sumKCaMg = HYDRO_CATIONS_TRIANGLE.reduce((acc, n) => acc + (parseFloat(meq[n]) || 0), 0);
  const totalCations = sumKCaMg + (parseFloat(meq.N_NH4) || 0);
  const pct = {};
  HYDRO_MEQ_NUTRIENTS.forEach(n => {
    const val = parseFloat(meq[n]) || 0;
    if (HYDRO_ANIONS.includes(n)) pct[n] = sumAnions > 0 ? (val / sumAnions) * 100 : 0;
    else if (HYDRO_CATIONS_TRIANGLE.includes(n)) pct[n] = sumKCaMg > 0 ? (val / sumKCaMg) * 100 : 0;
    else pct[n] = totalCations > 0 ? (val / totalCations) * 100 : 0;
  });
  return pct;
}

/** Bloque meq/L + tabla % meq del aporte de fertilizantes (UI, reporte, admin). */
function hydroBuildFertMeqContributionHtml(totals) {
  const hasAny = HYDRO_PPM_NUTRIENTS.some(n => (parseFloat(totals[n]) || 0) > 0);
  if (!hasAny) return '';
  const meq = hydroFertTotalsPpmToMeq(totals);
  const pct = hydroComputePctMeqFromMeq(meq);
  const meqDisplay = (n) => {
    if (HYDRO_MEQ_NUTRIENTS.includes(n)) return (parseFloat(meq[n]) || 0).toFixed(2);
    if (n === 'Cl') return (parseFloat(meq.Cl) || 0).toFixed(2);
    return '—';
  };
  const meqGrid = `
    <div class="hydro-muted hydro-grid-title" style="grid-column:1/-1;margin-bottom:6px;margin-top:4px;">${hydroT('Aporte total estimado (meq/L):', 'Estimated total contribution (meq/L):')}</div>
    ${HYDRO_PPM_NUTRIENTS.map(n => {
      let extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : (n === 'Cl' ? ' hydro-grid-item-cl hydro-grid-item-cl-tail' : ''));
      return `<div class="hydro-grid-item${extraClass}"><span class="hydro-grid-label">${hydroLabelHtml(n)}</span><span class="hydro-grid-value">${meqDisplay(n)}</span></div>`;
    }).join('')}
  `;
  const pctTable = `
    <div class="hydro-fert-meq-pct-wrap">
      <p class="hydro-muted hydro-fert-meq-pct-note">${hydroT('% sobre meq/L aportado: aniones N-NO₃⁻ + P-H₂PO₄⁻ + S-SO₄²⁻ = 100%; cationes K⁺ + Ca²⁺ + Mg²⁺ = 100%.', '% of contributed meq/L: anions N-NO₃⁻ + P-H₂PO₄⁻ + S-SO₄²⁻ = 100%; cations K⁺ + Ca²⁺ + Mg²⁺ = 100%.')}</p>
      <div class="hydro-table-scroll hydro-table-colored">
        <table class="hydro-table hydro-table-colored hydro-table-compact">
          <thead><tr>
            ${HYDRO_MEQ_NUTRIENTS.map(n => `<th class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${hydroLabelHtml(n)} <span class="notranslate" translate="no">% meq</span></th>`).join('')}
          </tr></thead>
          <tbody><tr>
            ${HYDRO_MEQ_NUTRIENTS.map(n => `<td class="${n === 'N_NH4' ? 'hydro-col-nh4' : ''}">${pct[n].toFixed(1)}</td>`).join('')}
          </tr></tbody>
        </table>
      </div>
    </div>
  `;
  return `<div class="hydro-grid hydro-fert-meq-grid">${meqGrid}</div>${pctTable}`;
}

/** Leyenda: % del aporte por fertilizantes (N-NO₃ vs N-NH₄; N-NO₃ vs Cl⁻) y lo mismo en solución (fertilizantes + agua). */
function hydroBuildFertContributionRatioLegendHtml(totals, water) {
  const w = water || {};
  const tNo3 = parseFloat(totals.N_NO3) || 0;
  const tNh4 = parseFloat(totals.N_NH4) || 0;
  const tCl = parseFloat(totals.Cl) || 0;
  const wNo3 = parseFloat(w.N_NO3) || 0;
  const wNh4 = parseFloat(w.N_NH4) || 0;
  const wCl = parseFloat(w.Cl) || 0;
  const mNo3F = hydroPpmToMeqForLegend('N_NO3', tNo3);
  const mNh4F = hydroPpmToMeqForLegend('N_NH4', tNh4);
  const mClF = hydroPpmToMeqForLegend('Cl', tCl);
  const nFer = mNo3F + mNh4F;
  const pNo3F = nFer > 0 ? (mNo3F / nFer) * 100 : 0;
  const pNh4F = nFer > 0 ? (mNh4F / nFer) * 100 : 0;
  const ncFer = mNo3F + mClF;
  const pNo3NcF = ncFer > 0 ? (mNo3F / ncFer) * 100 : 0;
  const pClF = ncFer > 0 ? (mClF / ncFer) * 100 : 0;
  const mNo3Sol = mNo3F + hydroPpmToMeqForLegend('N_NO3', wNo3);
  const mNh4Sol = mNh4F + hydroPpmToMeqForLegend('N_NH4', wNh4);
  const mClSol = mClF + hydroPpmToMeqForLegend('Cl', wCl);
  const nSol = mNo3Sol + mNh4Sol;
  const pNo3S = nSol > 0 ? (mNo3Sol / nSol) * 100 : 0;
  const pNh4S = nSol > 0 ? (mNh4Sol / nSol) * 100 : 0;
  const ncSol = mNo3Sol + mClSol;
  const pNo3NcS = ncSol > 0 ? (mNo3Sol / ncSol) * 100 : 0;
  const pClS = ncSol > 0 ? (mClSol / ncSol) * 100 : 0;
  const fmt = (x) => (Number.isFinite(x) ? x.toFixed(1) : '0.0');
  const bitsF = [];
  if (nFer > 0) {
    bitsF.push(hydroT(
      `partición del N en <strong>meq/L</strong> (N-NO₃⁻ + N-NH₄⁺): <strong>N-NO₃⁻ ${fmt(pNo3F)}%</strong> · <strong>N-NH₄⁺ ${fmt(pNh4F)}%</strong>`,
      `N partition in <strong>meq/L</strong> (N-NO₃⁻ + N-NH₄⁺): <strong>N-NO₃⁻ ${fmt(pNo3F)}%</strong> · <strong>N-NH₄⁺ ${fmt(pNh4F)}%</strong>`
    ));
  }
  if (ncFer > 0) {
    bitsF.push(hydroT(
      `N-NO₃⁻ + Cl⁻ en <strong>meq/L</strong> (mismo aporte): <strong>N-NO₃⁻ ${fmt(pNo3NcF)}%</strong> · <strong>Cl⁻ ${fmt(pClF)}%</strong>`,
      `N-NO₃⁻ + Cl⁻ in <strong>meq/L</strong> (same contribution): <strong>N-NO₃⁻ ${fmt(pNo3NcF)}%</strong> · <strong>Cl⁻ ${fmt(pClF)}%</strong>`
    ));
  } else if (mClF <= 0 && nFer > 0) {
    bitsF.push(hydroT(
      'sin Cl⁻ en meq/L por fertilizantes (aparece al usar KCl, cloruro de calcio, etc.)',
      'no Cl⁻ in meq/L from fertilizers (appears when using KCl, calcium chloride, etc.)'
    ));
  }
  const lineFert = bitsF.length
    ? hydroT(
      `<strong>Aporte solo fertilizantes:</strong> porcentajes sobre <strong>meq/L</strong> calculados desde las ppm aportadas (N a 14 mg/meq, Cl⁻ a 35,45 mg/meq). ${bitsF.join('; ')}.`,
      `<strong>Fertilizer-only contribution:</strong> percentages over <strong>meq/L</strong> calculated from contributed ppm (N at 14 mg/meq, Cl⁻ at 35.45 mg/meq). ${bitsF.join('; ')}.`
    )
    : '';
  const bitsS = [];
  if (nSol > 0) {
    bitsS.push(hydroT(
      `partición del N total en <strong>meq/L</strong>: <strong>N-NO₃⁻ ${fmt(pNo3S)}%</strong> · <strong>N-NH₄⁺ ${fmt(pNh4S)}%</strong>`,
      `total N partition in <strong>meq/L</strong>: <strong>N-NO₃⁻ ${fmt(pNo3S)}%</strong> · <strong>N-NH₄⁺ ${fmt(pNh4S)}%</strong>`
    ));
  }
  if (ncSol > 0) {
    bitsS.push(hydroT(
      `N-NO₃⁻ + Cl⁻ total en <strong>meq/L</strong>: <strong>N-NO₃⁻ ${fmt(pNo3NcS)}%</strong> · <strong>Cl⁻ ${fmt(pClS)}%</strong> (incluye agua si capturaste Cl⁻)`,
      `total N-NO₃⁻ + Cl⁻ in <strong>meq/L</strong>: <strong>N-NO₃⁻ ${fmt(pNo3NcS)}%</strong> · <strong>Cl⁻ ${fmt(pClS)}%</strong> (includes water if you entered Cl⁻)`
    ));
  } else if (mClSol <= 0 && nSol > 0) {
    bitsS.push(hydroT(
      'sin Cl⁻ en meq/L (fertilizantes ni agua) para el par N-NO₃⁻ + Cl⁻',
      'no Cl⁻ in meq/L (fertilizers or water) for the N-NO₃⁻ + Cl⁻ pair'
    ));
  }
  const lineSol = bitsS.length
    ? hydroT(
      `<strong>Solución final (fertilizantes + agua):</strong> mismos criterios en <strong>meq/L</strong>. ${bitsS.join('; ')}.`,
      `<strong>Final solution (fertilizers + water):</strong> same criteria in <strong>meq/L</strong>. ${bitsS.join('; ')}.`
    )
    : '';
  if (!lineFert && !lineSol) return '';
  return `<div class="hydro-fert-split-legend notranslate" translate="no">${lineFert}${lineFert && lineSol ? '<br>' : ''}${lineSol}</div>`;
}

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

function hydroMaterialDisplayName(name) {
  const ui = hydroPresentation();
  if (ui && typeof ui.materialName === 'function') return ui.materialName(name);
  if (window.NpFertigationUI && typeof window.NpFertigationUI.materialName === 'function') {
    return window.NpFertigationUI.materialName(name);
  }
  return name == null ? '' : String(name);
}

function renderHydroFertTable() {
  const wrap = document.getElementById('hydroFertTableWrap');
  if (!wrap) return;
  var scrollEl = wrap.querySelector && wrap.querySelector('.hydro-table-scroll');
  var savedFertScroll = (scrollEl && typeof scrollEl.scrollLeft === 'number') ? scrollEl.scrollLeft : 0;
  const materials = getAllHydroMaterials();
  const optNew = `<option value="__hydro_new__">➕ ${hydroT('Agregar nuevo…', 'Add new…')}</option>`;
  const options = (selectedId) =>
    optNew + materials.map(m => {
      const label = hydroMaterialDisplayName(m.name || m.id || '');
      return `<option value="${(m.id || '').replace(/"/g, '&quot;')}" ${m.id === selectedId ? 'selected' : ''}>${String(label).replace(/</g, '&lt;')}</option>`;
    }).join('');
  const tankOptions = (sel) => HYDRO_TANQUES.map(t =>
    `<option value="${t}" ${t === (sel || 'A') ? 'selected' : ''}>${hydroT('Tanque', 'Tank')} ${t}</option>`
  ).join('');

  const rows = hydroState.fertilizers.map(f => {
    const legacy = !f.materialId && (f.name != null || f.dose != null);
    const tank = f.tank || 'A';
    const total = hydroFertRowProductTotal(f, materials);
    const totalDisplay = total.unit === 'L'
      ? hydroDisplayLiquidL(total.value)
      : hydroDisplayMassKg(total.value);
    if (legacy) {
      const contrib = hydroFertRowContributionsLegacy(f);
      const contribCells = HYDRO_PPM_NUTRIENTS.map(n => {
        const v = contrib[n];
        return `<td class="hydro-contrib-cell ${thClass(n)}">${(v > 0 ? v.toFixed(2) : '')}</td>`;
      }).join('');
      return `
    <tr data-fert-id="${f.id}" data-legacy="1">
      <td><input class="hydro-input" data-fert-id="${f.id}" data-fert-field="name" value="${(f.name || '').replace(/"/g, '&quot;')}" placeholder="${hydroT('Nombre', 'Name')}"></td>
      <td class="hydro-dose-readonly">${(parseFloat(f.dose || 0) > 0 ? parseFloat(f.dose).toFixed(1) : '—')}</td>
      ${contribCells}
      <td><select class="hydro-input hydro-tank-select" data-fert-id="${f.id}" data-fert-field="tank">${tankOptions(tank)}</select></td>
      <td class="hydro-kg-readonly">${totalDisplay.value > 0 ? `${totalDisplay.value.toFixed(2)} ${totalDisplay.unit}` : '—'}</td>
      <td class="hydro-cost-cell" style="text-align:right;">—</td>
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
    const liquidDisplay = hydroDisplayLiquidL(liquidInputValue);
    const priceApi = hydroGetPriceApi();
    const priceCanon = hydroResolveMaterialPrice(f.materialId);
    const costUsd = priceApi
      ? priceApi.costUsdFromKg(total.kgEquivalent || 0, priceCanon)
      : 0;
    const costTxt = (costUsd > 0 && priceApi) ? priceApi.formatMoney(costUsd) : (costUsd > 0 ? costUsd.toFixed(2) : '—');
    const totalCell = isLiquid
      ? `<div style="display:flex;align-items:center;gap:6px;">
          <input class="hydro-input hydro-product-total-input" data-fert-id="${f.id}" data-fert-field="productTotalL" type="number" step="0.01" min="0" value="${liquidDisplay.value > 0 ? liquidDisplay.value.toFixed(2) : ''}" placeholder="${liquidDisplay.unit} ${hydroT('total', 'total')}" title="${hydroT('Volumen total del producto para el volumen de agua', 'Total product volume for the configured water volume')}">
          <span class="hydro-muted" style="white-space:nowrap;">${liquidDisplay.unit}</span>
        </div>`
      : `${totalDisplay.value > 0 ? `${totalDisplay.value.toFixed(2)} ${totalDisplay.unit}` : '—'}`;
    return `
    <tr data-fert-id="${f.id}">
      <td>
        <select class="hydro-input hydro-fert-select" data-fert-id="${f.id}" data-fert-field="materialId">
          <option value="">${hydroT('Selecciona…', 'Select…')}</option>
          ${options(f.materialId)}
        </select>
      </td>
      <td class="hydro-dose-readonly">${(dose > 0 ? dose.toFixed(1) : '—')}</td>
      ${contribCells}
      <td><select class="hydro-input hydro-tank-select" data-fert-id="${f.id}" data-fert-field="tank" title="${hydroT('Tanque', 'Tank')}">${tankOptions(tank)}</select></td>
      <td class="hydro-kg-readonly">${totalCell}</td>
      <td class="hydro-cost-cell" style="text-align:right;white-space:nowrap;color:#0f766e;font-weight:600;">${costTxt}</td>
      <td><button class="btn btn-secondary btn-sm hydro-remove-fert" data-fert-id="${f.id}">✕</button></td>
    </tr>`;
  }).join('');

  const priceApi = hydroGetPriceApi();
  const priceLabels = priceApi ? priceApi.labels() : { cost: 'Costo', costBatchUnit: 'USD', totalCost: 'Costo total' };
  let batchTotalUsd = 0;
  hydroState.fertilizers.forEach(f => {
    const tot = hydroFertRowProductTotal(f, materials);
    const price = hydroResolveMaterialPrice(f.materialId);
    batchTotalUsd += priceApi ? priceApi.costUsdFromKg(tot.kgEquivalent || 0, price) : 0;
  });
  const batchTotalTxt = (batchTotalUsd > 0 && priceApi)
    ? priceApi.formatMoney(batchTotalUsd)
    : (batchTotalUsd > 0 ? batchTotalUsd.toFixed(2) : '—');

  const headerCells = HYDRO_PPM_NUTRIENTS.map(n => `<th class="hydro-contrib-th ${thClass(n)}">${hydroLabelHtml(n)}</th>`).join('');
  wrap.innerHTML = `
    <p class="hydro-legend-elemental" style="margin:0 0 8px 0;font-size:0.9rem;color:#64748b;">${hydroT('Concentración elemental (%). Puedes trabajar por ppm de un elemento (flujo tradicional) o, en líquidos, escribir el total de producto (L) para calcular ppm aportadas.', 'Elemental concentration (%). Work from an element target in ppm, or enter the total liquid product volume to calculate contributed ppm.')}</p>
    <div class="hydro-table-scroll hydro-table-colored">
      <table class="hydro-table hydro-table-colored hydro-fert-contrib-table">
        <thead>
          <tr>
            <th>${hydroT('Fertilizante', 'Fertilizer')}</th>
            <th>${hydroT('Dosis (ppm producto)', 'Dose (product ppm)')}</th>
            ${headerCells}
            <th>${hydroT('Tanque', 'Tank')}</th>
            <th>${hydroT('Total producto', 'Total product')}</th>
            <th>${priceLabels.cost}<br><span style="font-weight:500;color:#64748b;font-size:0.75rem;">${priceLabels.costBatchUnit}</span></th>
            <th>${hydroT('Acción', 'Action')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#ccfbf1;">
            <td colspan="${3 + HYDRO_PPM_NUTRIENTS.length}" style="text-align:right;font-weight:800;color:#115e59;padding:10px;">${priceLabels.totalCost}</td>
            <td style="font-weight:800;color:#115e59;text-align:right;white-space:nowrap;">${batchTotalTxt} ${priceLabels.costBatchUnit}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  var newScrollEl = wrap.querySelector && wrap.querySelector('.hydro-table-scroll');
  if (newScrollEl) newScrollEl.scrollLeft = savedFertScroll;
}

function renderHydroFertTotals() {
  const grid = document.getElementById('hydroFertTotals');
  const meqWrap = document.getElementById('hydroFertMeqWrap');
  const stage = hydroGetActiveStage();
  if (!grid) return;
  const totals = hydroGetFertTotalsPpm();
  const titleHtml = stage ? `<div class="hydro-muted hydro-grid-title" style="grid-column:1/-1;margin-bottom:6px;">${hydroT('Aporte total estimado (ppm):', 'Estimated total contribution (ppm):')}</div>` : '';
  grid.innerHTML = titleHtml + HYDRO_PPM_NUTRIENTS.map(n => {
    let extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : (n === 'Cl' ? ' hydro-grid-item-cl hydro-grid-item-cl-tail' : ''));
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
      const extraClass = n === 'N_NH4' ? ' hydro-grid-item-nh4' : (n === 'Fe' ? ' hydro-grid-item-micro-start' : (n === 'Cl' ? ' hydro-grid-item-cl hydro-grid-item-cl-tail' : ''));
      const valueClass = pendiente > 0.01 ? ' hydro-remaining-positive' : (pendiente < -0.01 ? ' hydro-remaining-negative' : '');
      return `
    <div class="hydro-grid-item${extraClass}">
      <span class="hydro-grid-label">${hydroLabelHtml(n)}</span>
      <span class="hydro-grid-value${valueClass}">${pendiente.toFixed(2)}</span>
    </div>
  `;
    }).join('');
    remainingEl.innerHTML =
      `<div class="hydro-muted hydro-grid-title" style="grid-column:1/-1;margin-bottom:4px;font-size:0.9rem;">📉 ${hydroT('Pendiente por cubrir (ppm): Faltante − Aporte', 'Remaining to cover (ppm): Requirement − Contribution')}</div>` + remainingHtml +
      hydroBuildFertContributionRatioLegendHtml(totals, hydroState.water || {});
  } else if (remainingEl) {
    remainingEl.innerHTML = '';
  }

  if (meqWrap) {
    meqWrap.innerHTML = hydroBuildFertMeqContributionHtml(totals);
  }

  // Nota de validación: fórmulas para que el usuario pueda verificar el cálculo
  const validationEl = document.getElementById('hydroValidationNote');
  if (validationEl) {
    const vol = parseFloat(hydroState.volumeWaterM3) || 100;
    const waterShown = hydroDisplayFromSI(vol, 'water_volume');
    const waterUnit = hydroUnitLabel(hydroDisplayUnit('water_volume'));
    const massUnit = hydroDisplayUnit('mass');
    const liquidUnit = hydroDisplayUnit('liquid_volume');
    const usUnits = hydroPresentation() && hydroPresentation().getPrefs().unit_system === 'us_customary';
    const productFormula = usUnits
      ? `• <strong>${hydroT('Producto sólido', 'Solid product')} (${massUnit})</strong> = ${hydroT('dosis (ppm producto) × volumen de agua (US gal) × 0.0000083454', 'dose (product ppm) × water volume (US gal) × 0.0000083454')}.<br>
        • <strong>${hydroT('Producto líquido', 'Liquid product')} (${liquidUnit})</strong> = ${hydroT('masa equivalente ÷ densidad en lb/US gal', 'equivalent mass ÷ density in lb/US gal')}.<br>`
      : `• <strong>${hydroT('Producto sólido (kg)', 'Solid product (kg)')}</strong> = ${hydroT('dosis (ppm producto) × volumen de agua (m³) ÷ 1000', 'dose (product ppm) × water volume (m³) ÷ 1000')}.<br>
        • <strong>${hydroT('Producto líquido (L)', 'Liquid product (L)')}</strong> = ${hydroT('kg equivalente ÷ densidad (kg/L)', 'equivalent kg ÷ density (kg/L)')}.<br>`;
    validationEl.innerHTML = `
      <div class="hydro-validation-box" style="padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:0.8rem;color:#166534;line-height:1.5;">
        <strong>✓ ${hydroT('Validación del cálculo (solución nutritiva)', 'Calculation validation (nutrient solution)')}</strong><br>
        ${hydroT('Todas las ppm son concentraciones en la', 'All ppm values are concentrations in the')} <strong>${hydroT('solución final', 'final solution')}</strong>.<br>
        • <strong>${hydroT('Aporte total (ppm)', 'Total contribution (ppm)')}</strong> = ${hydroT('suma por nutriente de: dosis (ppm producto) × concentración elemental (%) ÷ 100', 'sum by nutrient of: dose (product ppm) × elemental concentration (%) ÷ 100')}.<br>
        ${productFormula}
        ${hydroT('Para', 'For')} <strong>${waterShown.toFixed(2)} ${waterUnit}</strong> ${hydroT('de agua, los totales mostrados por tanque producen exactamente las ppm del aporte total estimado.', 'of water, the totals shown by tank produce exactly the ppm in the estimated total contribution.')}
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
  const vDisplay = hydroDisplayFromSI(v, 'water_volume');
  const vUnit = hydroUnitLabel(hydroDisplayUnit('water_volume'));
  const tDisplay = hydroDisplayLiquidL(t);
  const vInputDisplay = hydroDisplayInputValue(vDisplay, 4);
  const tInputDisplay = hydroDisplayInputValue(tDisplay.value, 4);
  const rateUnit = hydroUnitLabel(hydroDisplayUnit('injection_rate'));
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
  const concentradoDisplay = hydroDisplayLiquidL(concentradoL);
  const recargas = t > 0 ? Math.ceil(concentradoL / t) : 0;
  const recargasText = recargas <= 1
    ? hydroT('1 recarga (tu tanque alcanza).', '1 tank fill (your tank is sufficient).')
    : `${recargas} ${hydroT('recargas de tanque necesarias.', 'tank fills required.')}`;

  const tankBlocks = HYDRO_TANQUES.map(tq => {
    const data = byTank[tq];
    if (data.totalKg <= 0 && data.totalL <= 0) return '';
    const totalParts = [];
    const massTotal = hydroDisplayMassKg(data.totalKg);
    const liquidTotal = hydroDisplayLiquidL(data.totalL);
    if (data.totalKg > 0) totalParts.push(`${massTotal.value.toFixed(2)} ${massTotal.unit}`);
    if (data.totalL > 0) totalParts.push(`${liquidTotal.value.toFixed(2)} ${liquidTotal.unit}`);
    let perRecargaLine = '';
    if (recargas > 1) {
      const perRecParts = [];
      if (data.totalKg > 0) perRecParts.push(`${(massTotal.value / recargas).toFixed(2)} ${massTotal.unit}`);
      if (data.totalL > 0) perRecParts.push(`${(liquidTotal.value / recargas).toFixed(2)} ${liquidTotal.unit}`);
      perRecargaLine = ` <span class="hydro-muted" style="font-size:0.9rem;">(${perRecParts.join(' + ')} ${hydroT(`por recarga si son ${recargas} recargas`, `per fill for ${recargas} fills`)})</span>`;
    }
    const itemsHtml = data.items.map(i => {
      const shown = i.unit === 'L' ? hydroDisplayLiquidL(i.value) : hydroDisplayMassKg(i.value);
      const eq = hydroDisplayMassKg(i.kgEquivalent);
      const itemPerRec = recargas > 1 ? `${(shown.value / recargas).toFixed(2)} ${shown.unit}` : null;
      const eqText = i.unit === 'L' ? ` <span class="hydro-muted">(≈ ${eq.value.toFixed(2)} ${eq.unit} eq)</span>` : '';
      return `<span class="hydro-tank-item">${(i.name || '').replace(/</g, '&lt;')}: ${shown.value.toFixed(2)} ${shown.unit}${eqText}${itemPerRec != null ? ` <span class="hydro-muted">(${itemPerRec} por recarga)</span>` : ''}</span>`;
    }).join('');
    return `
      <div class="hydro-tank-block" data-tank="${tq}">
        <strong class="hydro-tank-block-title">${hydroTankBlockIconHtml()}<span class="hydro-tank-block-title-text">${hydroT('Tanque', 'Tank')} ${tq}: ${totalParts.join(' + ')} ${hydroT('total', 'total')}${perRecargaLine}</span></strong>
        <div class="hydro-tank-block-items">${itemsHtml}</div>
      </div>
    `;
  }).filter(Boolean).join('');

  const porTanqueLegend = `<p class="hydro-muted" style="margin:0 0 6px 0;font-size:0.85rem;">${hydroT(`Las cantidades son el total para todo el volumen de agua indicado (sólidos en ${hydroDisplayUnit('mass')} y líquidos en ${hydroDisplayUnit('liquid_volume')}). Si necesitas varias recargas, usa la cantidad por recarga.`, `Amounts are totals for the full water volume (solids in ${hydroDisplayUnit('mass')} and liquids in ${hydroDisplayUnit('liquid_volume')}). For multiple fills, use the per-fill amount.`)}</p>`;

  // Relación de inyección: 1:(1000/tasa). Ej: tasa 10 → 1:100; tasa 15 → 1:66.7
  const ratioVal = r > 0 ? 1000 / r : NaN;
  const ratioStr = !isNaN(ratioVal) ? (Number.isInteger(ratioVal) ? ratioVal : ratioVal.toFixed(1)) : '—';
  const ratioDisplay = !isNaN(ratioVal) ? '1:' + ratioStr : '—';

  wrap.innerHTML = `
    <div class="hydro-volume-inputs">
      <div class="hydro-volume-intro">
        <img src="assets/NutriPlant_PRO_blue.png" alt="" class="hydro-volume-watermark" aria-hidden="true">
        <h4 style="margin:0 0 10px 0;font-size:1rem;">📦 ${hydroT('Cálculo por volumen de agua', 'Calculation by water volume')}</h4>
        <p class="hydro-muted" style="margin:0 0 10px 0;font-size:0.9rem;">${hydroT('Volumen de agua a fertirrigar, capacidad del tanque y tasa de inyección. Con esto se calculan los totales por fertilizante, el volumen de concentrado y las recargas de tanque.', 'Water volume to fertigate, tank capacity, and injection rate. These values calculate fertilizer totals, concentrate volume, and tank fills.')}</p>
      </div>
      <div class="hydro-volume-row">
        <label>${hydroT('Volumen de agua', 'Water volume')} (${vUnit}):</label>
        <input type="number" id="hydroVolumeWaterM3" class="hydro-input" min="0.1" step="1" value="${vInputDisplay}" title="${hydroT('Volumen de agua a inyectar', 'Water volume to inject')} (${vUnit})">
        <label>${hydroT('Volumen del tanque', 'Tank volume')} (${tDisplay.unit}):</label>
        <input type="number" id="hydroTankVolumeL" class="hydro-input" min="1" step="1" value="${tInputDisplay}" title="${hydroT('Volumen de solución concentrada', 'Concentrated solution volume')} (${tDisplay.unit})">
        <label>${hydroT('Tasa de inyección', 'Injection rate')} (${rateUnit}):</label>
        <input type="number" id="hydroInjectionRate" class="hydro-input" min="0.1" step="0.5" value="${r}" title="${hydroT('Concentrado por volumen de agua', 'Concentrate per water volume')} (${rateUnit})">
      </div>
      ${(() => {
        const analysis = hydroGetSelectedWaterAnalysis();
        if (!analysis) return '';
        return `<div class="hydro-volume-row" style="margin-top:4px;"><span style="grid-column:1/-1;">${hydroVolumeMatchNoteHtml(hydroAnalysisVolumeM3(analysis))}</span></div>`;
      })()}
      <div class="hydro-volume-row" style="margin-top:6px;">
        <label>${hydroT('Relación de inyección', 'Injection ratio')}:</label>
        <span id="hydroInjectionRatio" style="display:inline-block;min-width:4em;font-weight:500;" title="${hydroT('1:(1000 ÷ tasa)', '1:(1000 ÷ rate)')}">${ratioDisplay}</span>
      </div>
      <div class="hydro-volume-result" style="margin-top:10px;padding:8px 12px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
        <strong>${hydroT('Volumen de concentrado necesario', 'Required concentrate volume')}:</strong> ${concentradoDisplay.value.toFixed(2)} ${concentradoDisplay.unit} (${vInputDisplay} ${vUnit} × ${hydroDisplayInputValue(r, 4)} ${rateUnit}${rateUnit === 'US gal/1,000 US gal' ? ' ÷ 1,000' : ''}). <span class="hydro-muted">${hydroT('Con tu tanque de', 'With your tank of')} ${tDisplay.value.toFixed(2)} ${tDisplay.unit}:</span> ${recargasText}
      </div>
      ${tankBlocks ? `<div class="hydro-tank-summary" style="margin-top:12px;">${porTanqueLegend}<strong>${hydroT('Por tanque (A, B, C)', 'By tank (A, B, C)')}:</strong><div class="hydro-tank-blocks">${tankBlocks}</div></div>` : ''}
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
  const stageName = stage.name || hydroT('Solución nutritiva', 'Nutrient solution');
  infoEl.textContent = `${stageName} · Suma de N (meq/L): ${nTotal.toFixed(2)} · % Nitrato: ${pctNo3.toFixed(1)}% · % Amonio: ${pctNh4.toFixed(1)}%.`;
}

function renderHydroAll() {
  renderHydroStageTable();
  renderHydroNitrogenSummary();
  renderHydroTriangle();
  renderHydroObjective();
  renderHydroWater();
  renderHydroAcidSummary();
  renderHydroMissing();
  renderHydroVolumeCard();
  renderHydroFertTable();
  renderHydroFertTotals();
}

function hydroApplyStaticTranslations() {
  const container = document.querySelector('.hydroponia-container');
  if (!container) return;
  const setText = (selector, text) => {
    const el = container.querySelector(selector);
    if (el) el.textContent = text;
  };
  setText('[data-tab="hidro-solucion"] .tab-text', hydroT('Solución nutritiva', 'Nutrient solution'));
  setText('[data-tab="hidro-calculo"] .tab-text', hydroT('Cálculo de fertilizantes', 'Fertilizer calculation'));
  setText('#hidro-solucion .hydro-card:first-child h3', '🧪 ' + hydroT('Solución nutritiva', 'Nutrient solution'));
  const ternaryHelp = container.querySelector('.hydro-card-ternary-wrap .hydro-card-header .hydro-muted');
  if (ternaryHelp) {
    ternaryHelp.innerHTML = `<strong>${hydroT('Rangos por elemento (%).', 'Ranges by element (%).')}</strong> ${hydroT('Aniones', 'Anions')}: N-NO₃⁻ 20–80, P-H₂PO₄⁻ 1.25–10, S-SO₄²⁻ 10–70. ${hydroT('Cationes', 'Cations')}: K⁺ 10–65, Ca²⁺ 22.5–62.5, Mg²⁺ 0.5–40. ${hydroT('Fuera de estos rangos puede haber antagonismos y precipitados.', 'Outside these ranges, antagonisms and precipitates may occur.')}`;
  }
  setText('#hidro-calculo .hydro-card:nth-child(1) h3', '🎯 ' + hydroT('Objetivo de solución (ppm)', 'Solution target (ppm)'));
  setText('#hidro-calculo .hydro-card:nth-child(1) .hydro-muted', hydroT('Se toma de la solución nutritiva de la pestaña anterior.', 'Uses the nutrient solution from the previous tab.'));
  setText('#hidro-calculo .hydro-card:nth-child(2) h3', '💧 ' + hydroT('Análisis de agua (ppm)', 'Water analysis (ppm)'));
  setText('#hidro-calculo .hydro-card:nth-child(2) .hydro-muted', hydroT('Ingresa los aportes del agua para calcular el faltante.', 'Enter water contributions to calculate the remaining requirement.'));
  hydroRefreshWaterAnalysisSelect();
  setText('#hidro-calculo .hydro-card:nth-child(3) h3', '📉 ' + hydroT('Requerimiento total (ppm)', 'Total requirement (ppm)'));
  setText('#hidro-calculo .hydro-card:nth-child(4) h3', '🧮 ' + hydroT('Fertilizantes disponibles (elemental)', 'Available fertilizers (elemental)'));
  setText('#hydroAddFertBtn', '➕ ' + hydroT('Agregar fertilizante', 'Add fertilizer'));
  setText('#hydroAutoCalculateBtn', '✨ ' + hydroT('Calcular solución automática', 'Calculate solution automatically'));
  setText('#hydroManageCatalogBtn', hydroT('Gestionar catálogo de fertilizantes', 'Manage fertilizer catalog'));
  const autoCalculate = container.querySelector('#hydroAutoCalculateBtn');
  if (autoCalculate) autoCalculate.title = hydroT(
    'Genera una propuesta automática con los requerimientos, el agua y el ácido seleccionado',
    'Generates an automatic proposal from requirements, water, and the selected acid'
  );
  const manage = container.querySelector('#hydroManageCatalogBtn');
  if (manage) manage.title = hydroT('Ver, editar o eliminar fertilizantes personalizados', 'View, edit, or delete custom fertilizers');
}

function rerenderHydroForPreferences() {
  // hydroState siempre permanece en SI; estas funciones solo recalculan la presentación.
  hydroApplyStaticTranslations();
  renderHydroAll();
}

// ---------- Modal: fertilizante soluble (concentración elemental) ----------
function renderHydroCustomMaterialsList() {
  const container = document.getElementById('hydroCustomMaterialsList');
  if (!container) return;
  const list = Array.isArray(hydroCustomMaterialsUser) ? hydroCustomMaterialsUser : [];
  if (list.length === 0) {
    container.innerHTML = `<div style="color:#6b7280;">${hydroT('Sin fertilizantes personalizados.', 'No custom fertilizers.')}</div>`;
    return;
  }
  container.innerHTML = list.map(mat => {
    const key = encodeURIComponent((mat.id || mat.name || '').toString());
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span>${(mat.name || mat.id || '').replace(/</g, '&lt;')}</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="openEditHydroCustomMaterial('${key.replace(/'/g, "\\'")}')">${hydroT('Editar', 'Edit')}</button>
          <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem;" onclick="removeHydroCustomMaterial('${key.replace(/'/g, "\\'")}')">${hydroT('Eliminar', 'Delete')}</button>
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
  const priceEl = overlay.querySelector('#hydroCustom_price');
  if (priceEl) {
    const api = hydroGetPriceApi();
    const canon = parseFloat(mat.priceUsdPerTonne) || 0;
    const disp = api ? api.toDisplayPrice(canon) : canon;
    priceEl.value = disp > 0 ? Number(disp.toFixed(2)) : '';
  }
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
  const api = hydroGetPriceApi();
  const L = api ? api.labels() : { price: hydroT('Precio', 'Price'), priceUnit: 'USD/t' };
  const base = (typeof window.getBaseFertiMaterials === 'function') ? window.getBaseFertiMaterials() : [];
  const list = base.map(m => hydroMaterialToElemental(m)).filter(Boolean);
  const colCount = 2 + HYDRO_PPM_NUTRIENTS.length;
  const rows = list.map(mat => {
    const id = mat.id || '';
    const priceCanon = hydroResolveMaterialPrice(id);
    const priceDisp = api ? api.toDisplayPrice(priceCanon) : priceCanon;
    const nutCells = HYDRO_PPM_NUTRIENTS.map(n =>
      `<td style="padding:6px 10px;text-align:right;">${(parseFloat(mat[n]) || 0).toFixed(2)}</td>`
    ).join('');
    return `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:6px 10px;font-weight:600;">${hydroMaterialDisplayName(mat.name || id || '').replace(/</g, '&lt;')}</td>
      ${nutCells}
      <td style="padding:6px 10px;text-align:right;white-space:nowrap;">
        <input type="number" min="0" step="0.01" class="hydro-price-input" data-mat-id="${String(id).replace(/"/g, '&quot;')}"
          value="${priceDisp > 0 ? Number(priceDisp.toFixed(2)) : ''}" placeholder="0"
          style="width:88px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right;">
      </td>
    </tr>`;
  }).join('');
  const overlay = document.createElement('div');
  overlay.className = 'hydro-material-modal-overlay hydro-preloaded-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  overlay.innerHTML = `
    <div class="material-modal" style="max-width:95%;width:960px;max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div class="modal-header" style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:1.1rem;color:#1e293b;">📋 ${hydroT('Fertilizantes disponibles (concentración elemental %)', 'Available fertilizers (elemental concentration %)')}</h3>
        <button class="btn btn-secondary btn-sm" type="button" data-close-preloaded>✕</button>
      </div>
      <div style="padding:14px 18px;overflow:auto;flex:1;">
        <p style="margin:0 0 12px 0;font-size:0.9rem;color:#64748b;">${hydroT('Consulta de concentraciones de los fertilizantes precargados. Valores en % del elemento.', 'Reference concentrations for preloaded fertilizers. Values are elemental percentages.')} ${hydroT('Puedes capturar el precio del producto', 'You can enter the product price')} (<strong>${L.priceUnit}</strong>).</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">${hydroT('Nombre', 'Name')}</th>
                ${HYDRO_PPM_NUTRIENTS.map(n => `<th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e2e8f0;">${hydroLabelHtml(n)} <span class="notranslate" translate="no">%</span></th>`).join('')}
                <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e2e8f0;min-width:110px;">${L.price}<br><span style="font-weight:500;color:#64748b;font-size:0.75rem;">${L.priceUnit}</span></th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="' + colCount + '" style="padding:12px;color:#64748b;">' + hydroT('Sin fertilizantes precargados.', 'No preloaded fertilizers.') + '</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div style="padding:12px 18px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="btn btn-secondary btn-sm" data-close-preloaded>${hydroT('Cancelar', 'Cancel')}</button>
        <button type="button" class="btn btn-primary btn-sm" data-save-hydro-prices>${hydroT('Guardar precios', 'Save prices')}</button>
      </div>
    </div>
  `;
  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-close-preloaded]').forEach(btn => btn.addEventListener('click', close));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const saveBtn = overlay.querySelector('[data-save-hydro-prices]');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const next = { ...(hydroPriceOverrides || {}) };
      overlay.querySelectorAll('.hydro-price-input').forEach(inp => {
        const mid = inp.getAttribute('data-mat-id');
        if (!mid) return;
        const canon = api ? api.fromDisplayPrice(inp.value) : (parseFloat(inp.value) || 0);
        if (canon > 0) next[mid] = canon;
        else delete next[mid];
      });
      hydroPersistPriceOverrides(next);
      try { renderHydroFertTable(); renderHydroFertTotals(); } catch (e) {}
      if (window.showMessage) window.showMessage(hydroT('✅ Precios guardados', '✅ Prices saved'), 'success');
      close();
    });
  }
  document.body.appendChild(overlay);
}

function updateHydroCustomMaterial(overlay) {
  const key = (overlay.dataset.editKey || '').toLowerCase();
  const mat = findHydroCustomMaterialByKey(key);
  if (!mat) return;
  const getNum = id => { const v = parseFloat(overlay.querySelector('#' + id)?.value); return isNaN(v) ? 0 : Math.max(0, v); };
  const name = (overlay.querySelector('#hydroCustom_name')?.value || '').trim();
  if (!name) { if (window.showMessage) window.showMessage('Escribe un nombre', 'warning'); return; }
  const api = hydroGetPriceApi();
  const priceRaw = overlay.querySelector('#hydroCustom_price')?.value;
  const updated = {
    ...mat,
    name,
    priceUsdPerTonne: api ? api.fromDisplayPrice(priceRaw) : (parseFloat(priceRaw) || 0)
  };
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

  const priceApi = hydroGetPriceApi();
  const priceUnit = priceApi ? priceApi.priceUnitLabel() : 'USD/t';
  const overlay = document.createElement('div');
  overlay.className = 'hydro-material-modal-overlay material-modal-overlay';
  const nutrientInputs = HYDRO_PPM_NUTRIENTS.map(n =>
    `<div class="nutrient-input"><label class="notranslate" translate="no">${hydroLabelPlain(n)} %:</label><input type="number" id="hydroCustom_${n}" step="0.01" placeholder="0.00"></div>`
  ).join('');

  overlay.innerHTML = `
    <div class="material-modal">
      <div class="modal-header">
        <h3 style="margin:0;display:flex;align-items:center;gap:8px;">➕ ${hydroT('Nueva materia prima (hidroponía)', 'New raw material (hydroponics)')}</h3>
        <button class="btn btn-secondary btn-sm" onclick="this.closest('.hydro-material-modal-overlay').remove()">✕</button>
      </div>
      <div class="material-modal-body">
        <p class="hydro-legend-elemental" style="margin:0 0 10px 0;font-size:0.9rem;color:#64748b;">${hydroT('Concentración elemental (%). Todos los valores en % del elemento.', 'Elemental concentration (%). All values are elemental percentages.')}</p>
        <div class="form-group">
          <label>${hydroT('Nombre del fertilizante', 'Fertilizer name')}:</label>
          <input type="text" id="hydroCustom_name" placeholder="Ej: MKP">
        </div>
        <div class="form-group">
          <label>${hydroT('Precio', 'Price')} (${priceUnit}):</label>
          <input type="number" id="hydroCustom_price" min="0" step="0.01" placeholder="0.00" style="max-width:180px;">
        </div>
        <div class="form-group">
          <label>${hydroT('Concentración de nutrientes (% elemental)', 'Nutrient concentration (% elemental)')}:</label>
          <p class="hydro-legend-elemental" style="margin:4px 0 8px 0;font-size:0.85rem;color:#64748b;">Ej: MKP 0-22.67-28.22 (P y K en elemental, no como P₂O₅ ni K₂O).</p>
          <div class="nutrient-inputs-grid">${nutrientInputs}</div>
        </div>
        <div class="form-group">
          <label>${hydroT('Fertilizantes solubles personalizados (hidroponía)', 'Custom soluble fertilizers (hydroponics)')}:</label>
          <div id="hydroCustomMaterialsList" style="margin-top:6px;"></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
            <button class="btn btn-info btn-sm" onclick="openHydroPreloadedCatalogModal()" title="${hydroT('Consultar concentraciones elementales de fertilizantes precargados', 'View elemental concentrations of preloaded fertilizers')}">📋 ${hydroT('Ver fertilizantes disponibles', 'View available fertilizers')}</button>
            <button class="btn btn-secondary btn-sm" onclick="clearHydroCustomMaterials()">🧹 ${hydroT('Limpiar catálogo', 'Clear catalog')}</button>
          </div>
        </div>
        <div class="material-modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.hydro-material-modal-overlay').remove()">${hydroT('Cancelar', 'Cancel')}</button>
          <button class="btn btn-primary" id="hydroCustom_saveBtn">${hydroT('Agregar Materia Prima', 'Add raw material')}</button>
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
    const priceRaw = overlay.querySelector('#hydroCustom_price')?.value;
    const mat = {
      id: 'hydro_custom_' + Date.now(),
      name,
      N_NH4: 0, N_NO3: 0, P: 0, S: 0, K: 0, Ca: 0, Mg: 0,
      Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0,
      priceUsdPerTonne: priceApi ? priceApi.fromDisplayPrice(priceRaw) : (parseFloat(priceRaw) || 0)
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
    if (target && target.getAttribute('data-type') === 'ppm' && target.classList && target.classList.contains('hydro-ppm-macro')) {
      const nut = target.getAttribute('data-nutrient');
      if (nut && HYDRO_MEQ_NUTRIENTS.indexOf(nut) >= 0) {
        hydroPpmTyping = { stageId: target.getAttribute('data-stage-id'), nutrient: nut, raw: String(target.value) };
      }
    }
  });

  container.addEventListener('click', (e) => {
    if (e.target.closest('[data-hydro-solution-picker]')) {
      hydroOpenSolutionCatalog();
      return;
    }
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
      hydroState.volumeWaterM3 = hydroInputToSI(input.value, 'water_volume') || 100;
      renderHydroAcidSummary();
      return;
    }
    if (input.id === 'hydroTankVolumeL') {
      hydroState.tankVolumeL = hydroInputLiquidToL(input.value) || 1000;
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
        stage.meq[nutrient] = hydroRound2(parseFloat(input.value) || 0);
      } else if (type === 'ppm' && nutrient) {
        if (HYDRO_MEQ_NUTRIENTS.indexOf(nutrient) >= 0) {
          const fi = hydroSavePpmInputFocusState(input);
          hydroPpmTyping = { stageId: stage.id, nutrient: nutrient, raw: String(input.value) };
          const tr = input.closest('tr');
          if (tr) {
            const ppmRow = {};
            HYDRO_MEQ_NUTRIENTS.forEach(n => {
              const el = tr.querySelector('input.hydro-ppm-macro[data-type="ppm"][data-nutrient="' + n + '"]');
              ppmRow[n] = parseFloat(el && el.value) || 0;
            });
            stage.meq = stage.meq || {};
            Object.assign(stage.meq, hydroMeqFromMacroPpm(ppmRow));
            Object.assign(stage.ppm, hydroComputeMacroPpm(stage));
            const root = input.closest('.hydroponia-container') || document.querySelector('.hydroponia-container');
            if (root) hydroPatchMeqAndCeFromPpmState(root, stage);
            renderHydroTriangle();
            renderHydroNitrogenSummary();
            renderHydroObjective();
            renderHydroMissing();
            hydroSchedulePpmLayoutSync(fi);
            hydroScheduleSave();
            return;
          }
        } else {
          stage.ppm = stage.ppm || {};
          stage.ppm[nutrient] = parseFloat(input.value) || 0;
        }
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
        fert.productTotalL = hydroInputLiquidToL(input.value);
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
    if (target && target.id === 'hydroImportWaterSelect') {
      const analysisId = target.value;
      if (!analysisId) return;
      const ok = hydroApplyWaterAnalysisById(analysisId);
      if (!ok && window.showMessage) {
        window.showMessage(hydroT('No se encontró ese análisis de agua.', 'That water analysis was not found.'), 'warning');
      }
      return;
    }
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
          stage.meq[nutrient] = hydroRound2(parseFloat(target.value) || 0);
        } else if (type === 'ppm' && nutrient) {
          if (HYDRO_MEQ_NUTRIENTS.indexOf(nutrient) >= 0) {
            const tr = target.closest('tr');
            if (tr) {
              const ppmRow = {};
              HYDRO_MEQ_NUTRIENTS.forEach(n2 => {
                const el2 = tr.querySelector('input.hydro-ppm-macro[data-type="ppm"][data-nutrient="' + n2 + '"]');
                ppmRow[n2] = parseFloat(el2 && el2.value) || 0;
              });
              stage.meq = stage.meq || {};
              Object.assign(stage.meq, hydroMeqFromMacroPpm(ppmRow));
              Object.assign(stage.ppm, hydroComputeMacroPpm(stage));
            }
            hydroPpmTyping = null;
          } else {
            stage.ppm = stage.ppm || {};
            stage.ppm[nutrient] = parseFloat(target.value) || 0;
          }
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
      hydroState.volumeWaterM3 = hydroInputToSI(target.value, 'water_volume') || 100;
      renderHydroAcidSummary();
      renderHydroVolumeCard();
      renderHydroFertTable();
      renderHydroFertTotals();
      hydroScheduleSave();
      return;
    }
    if (target.id === 'hydroTankVolumeL') {
      hydroState.tankVolumeL = hydroInputLiquidToL(target.value) || 1000;
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
        fert.productTotalL = hydroInputLiquidToL(target.value);
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
  const autoCalculateBtn = document.getElementById('hydroAutoCalculateBtn');
  if (autoCalculateBtn) autoCalculateBtn.onclick = hydroAutoCalculateSolution;
  const manageCatalogBtn = document.getElementById('hydroManageCatalogBtn');
  if (manageCatalogBtn) {
    manageCatalogBtn.addEventListener('click', () => {
      if (typeof window.openHydroNewMaterialModal === 'function') window.openHydroNewMaterialModal();
    });
  }

  container.addEventListener('focusout', (e) => {
    const t = e.target;
    if (!t || t.getAttribute('data-type') !== 'ppm') return;
    if (!t.classList || !t.classList.contains('hydro-ppm-macro')) return;
    const n = t.getAttribute('data-nutrient');
    if (HYDRO_MEQ_NUTRIENTS.indexOf(n) < 0) return;
    const rel = e.relatedTarget;
    if (rel && rel.getAttribute && rel.getAttribute('data-type') === 'ppm' && rel.classList && rel.classList.contains('hydro-ppm-macro') && rel.closest && rel.closest('.hydroponia-container')) return;
    if (hydroPpmLayoutTimer) {
      clearTimeout(hydroPpmLayoutTimer);
      hydroPpmLayoutTimer = null;
    }
    const stageId = t.getAttribute('data-stage-id');
    const stage = hydroState.stages.find(s => s.id === stageId);
    if (!stage) return;
    const tr = t.closest('tr');
    if (tr) {
      const ppmRow = {};
      HYDRO_MEQ_NUTRIENTS.forEach(nut => {
        const el = tr.querySelector('input.hydro-ppm-macro[data-type="ppm"][data-nutrient="' + nut + '"]');
        ppmRow[nut] = parseFloat(el && el.value) || 0;
      });
      stage.meq = stage.meq || {};
      Object.assign(stage.meq, hydroMeqFromMacroPpm(ppmRow));
      Object.assign(stage.ppm, hydroComputeMacroPpm(stage));
    }
    stage.ce = (hydroComputeCE(stage) || 0).toFixed(2);
    hydroPpmTyping = null;
    renderHydroStageTable();
    renderHydroNitrogenSummary();
    renderHydroTriangle();
    renderHydroObjective();
    renderHydroMissing();
    hydroScheduleSave();
  }, true);
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
    if (btn.classList.contains('active')) return;
    try {
      hydroFlushSaveNow();
    } catch (e) {
      console.warn('⚠️ Error guardando Hidroponía antes de cambiar subpestaña:', e);
    }
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
  // La interfaz actual trabaja con una solución activa, no con un programa por etapas.
  if (hydroState.stages.length > 1) {
    const active = hydroState.stages.find(s => s.id === hydroState.activeStageId) || hydroState.stages[0];
    hydroState.stages = [active];
    hydroState.activeStageId = active.id;
  }
  /* ppm Cl objetivo y agua: defaults */
  (hydroState.stages || []).forEach(s => {
    s.ppm = s.ppm || {};
    if (s.ppm.Cl == null || s.ppm.Cl === '') s.ppm.Cl = 0;
  });
  hydroState.water = hydroState.water || {};
  HYDRO_PPM_NUTRIENTS.forEach(key => {
    if (hydroState.water[key] == null || hydroState.water[key] === '') hydroState.water[key] = 0;
  });
  hydroEnsureDefaults();
  hydroLoadCustomMaterials();
  hydroLoadCustomSolutions();
  initHydroponiaTabs();
  hydroRestoreLastTab();
  hydroApplyStaticTranslations();
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
window.hydroBuildFertMeqContributionHtml = hydroBuildFertMeqContributionHtml;
window.hydroGetFertTotalsPpm = hydroGetFertTotalsPpm;
window.hydroFertTotalsPpmToMeq = hydroFertTotalsPpmToMeq;
window.hydroComputePctMeqFromMeq = hydroComputePctMeqFromMeq;
window.hydroT = hydroT;
window.rerenderHydroForPreferences = rerenderHydroForPreferences;

if (typeof window !== 'undefined' && !window.__npHydroPrefsBound) {
  window.__npHydroPrefsBound = true;
  window.addEventListener('np:prefs-changed', function () {
    // El estado sigue en SI: solo se vuelve a presentar, sin convertirlo otra vez.
    try {
      if (document.querySelector('.hydroponia-container')) rerenderHydroForPreferences();
    } catch (e) { /* La vista puede estar cerrada. */ }
  });
}
