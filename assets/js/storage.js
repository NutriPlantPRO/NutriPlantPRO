// ====== storage.js (NutriPlant Pro) ======
const NP_KEYS = {
    PROJECTS: "nutriplant_projects",
    CURRENT: "nutriplant_current_project",
  };
  
  function np_loadProjects() {
    try { return JSON.parse(localStorage.getItem(NP_KEYS.PROJECTS) || "[]"); }
    catch { return []; }
  }
  function np_saveProjects(list) {
    localStorage.setItem(NP_KEYS.PROJECTS, JSON.stringify(list));
  }
  function np_newId() {
    return "np_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  
  export function np_createProject(data) {
    const now = new Date().toISOString();
    const proj = {
      id: np_newId(),
      title: data.title.trim(),
      cultivo: data.cultivo || null,
      campoOsector: data.campoOsector || null,
      rendimientoEsperado: data.rendimientoEsperado ?? null,
      unidadRendimiento: data.unidadRendimiento || "t/ha",
      // ubicación básica (opcionales, para más adelante):
      address: data.address || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      areaHa: data.areaHa ?? null,
      areaAcres: data.areaAcres ?? null,
      polygonPath: data.polygonPath || null,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    const list = np_loadProjects();
    list.unshift(proj);
    np_saveProjects(list);
    return proj;
  }
  
  export function np_updateProject(id, patch) {
    const list = np_loadProjects();
    const i = list.findIndex(p => p.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    np_saveProjects(list);
    return list[i];
  }
  
  export function np_deleteProject(id) {
    const list = np_loadProjects().filter(p => p.id !== id);
    np_saveProjects(list);
  }
  
  export function np_duplicateProject(id) {
    const p = np_loadProjects().find(p => p.id === id);
    if (!p) return null;
    
    // Crear copia básica del proyecto
    const newId = np_newId();
    const now = new Date().toISOString();
    const copy = { 
      ...p, 
      id: newId, 
      title: p.title + " (copia)", 
      createdAt: now, 
      updatedAt: now 
    };
    
    // Agregar a la lista
    const list = np_loadProjects();
    list.unshift(copy);
    np_saveProjects(list);
    
    // 🚀 CRÍTICO: Copiar TODOS los datos del proyecto original
    // Nota: Esta función es básica, la implementación completa está en dashboard.js
    // que maneja la copia de location, amendments, granular, fertirriego, etc.
    
    return copy;
  }
  
  export function np_getProject(id) {
    return np_loadProjects().find(p => p.id === id) || null;
  }
  
  export function np_setCurrentProject(id) {
    localStorage.setItem(NP_KEYS.CURRENT, id || "");
  }
  export function np_getCurrentProjectId() {
    return localStorage.getItem(NP_KEYS.CURRENT) || "";
  }
  