/* ===== SISTEMA CENTRALIZADO DE GUARDADO NUTRIPLANT PRO ===== */
/* Sistema rápido, robusto y confiable para guardado local */
/* OPTIMIZADO: Caché en memoria para navegación instantánea entre pestañas */

// 🚀 VERIFICACIÓN INMEDIATA: Este log debe aparecer SIEMPRE si el archivo se carga
(function() {
  console.log('📦 project-storage.js: Archivo cargando...');
  console.log('📦 project-storage.js: Verificando entorno...');
  console.log('📦 project-storage.js: window disponible?', typeof window !== 'undefined');
})();

// 🟢 Sincronización del proyecto (y todas sus secciones) con la nube. Por ahora no hace nada.
// Cuando tengas backend: asigna una función que envíe projectData a tu API (ej. PUT /api/projects/:id).
if (typeof window !== 'undefined' && typeof window.nutriplantSyncProjectToCloud === 'undefined') {
  window.nutriplantSyncProjectToCloud = function(projectId, projectData) {
    // Ejemplo futuro: fetch('/api/projects/' + projectId, { method: 'PUT', body: JSON.stringify(projectData), ... });
  };
}

class ProjectStorage {
  constructor() {
    this.debounceTimers = {};
    this.pendingSaves = new Set();
    
    // 🚀 CACHÉ EN MEMORIA - Proyecto actual cargado completamente
    this.memoryCache = {
      currentProjectId: null,
      projectData: null, // Datos completos del proyecto actual en memoria
      lastLoaded: null,
      isDirty: false // Indica si hay cambios sin guardar
    };
    
    // 🚀 CACHÉ DE PROYECTOS ADICIONALES (para comparación rápida)
    this.projectsCache = new Map(); // Map<projectId, projectData>
    this.maxCacheSize = 5; // Máximo 5 proyectos en caché
  }

  /**
   * 🔒 VALIDACIÓN DE SEGURIDAD: Verifica que un proyecto pertenece al usuario actual
   * @param {string} projectId - ID del proyecto a validar
   * @returns {boolean} - true si el proyecto pertenece al usuario actual
   */
  validateProjectOwnership(projectId) {
    if (!projectId) {
      console.warn('⚠️ validateProjectOwnership: No hay projectId');
      return false;
    }
    
    const userId = localStorage.getItem('nutriplant_user_id');
    if (!userId) {
      console.warn('⚠️ validateProjectOwnership: No hay usuario logueado');
      return false;
    }
    
    // Usuarios de Supabase (UUID): RLS maneja permisos
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return true;
    }
    
    try {
      const userKey = `nutriplant_user_${userId}`;
      const userData = localStorage.getItem(userKey);
      if (!userData) {
        console.warn('⚠️ validateProjectOwnership: No se encontró perfil de usuario');
        return false;
      }
      
      const userProfile = JSON.parse(userData);
      if (!userProfile || !userProfile.projects || !Array.isArray(userProfile.projects)) {
        console.warn('⚠️ validateProjectOwnership: Perfil de usuario inválido');
        return false;
      }
      
      const belongsToUser = userProfile.projects.includes(projectId);
      if (!belongsToUser) {
        console.error('❌ SEGURIDAD: Intento de acceso a proyecto de otro usuario:', {
          projectId,
          userId,
          userProjects: userProfile.projects
        });
      }
      
      return belongsToUser;
    } catch (e) {
      console.error('❌ Error validando propiedad del proyecto:', e);
      return false;
    }
  }

  /**
   * Obtiene la clave del proyecto en localStorage
   */
  getProjectKey(projectId) {
    if (!projectId) {
      const currentProject = this.getCurrentProject();
      projectId = currentProject?.id;
    }
    if (!projectId) {
      console.warn('⚠️ No hay projectId disponible');
      return null;
    }
    return `nutriplant_project_${projectId}`;
  }

  /**
   * Obtiene el proyecto actual
   */
  getCurrentProject() {
    // 🚀 PRIORIDAD 1: projectManager (más confiable)
    if (window.projectManager && typeof window.projectManager.getCurrentProject === 'function') {
      const project = window.projectManager.getCurrentProject();
      if (project && project.id) {
        return project;
      }
    }
    
    // 🚀 PRIORIDAD 2: currentProject global (dashboard.js)
    if (typeof currentProject !== 'undefined' && currentProject && currentProject.id) {
      return currentProject;
    }
    
    // 🚀 PRIORIDAD 3: localStorage directo
    try {
      const currentProjectId = localStorage.getItem('nutriplant-current-project');
      if (currentProjectId) {
        const projectKey = `nutriplant_project_${currentProjectId}`;
        const raw = localStorage.getItem(projectKey);
        if (raw) {
          const projectData = JSON.parse(raw);
          if (projectData && projectData.id) {
            return {
              id: projectData.id,
              name: projectData.name || projectData.title || ''
            };
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Error obteniendo proyecto desde localStorage:', e);
    }
    
    return null;
  }

  /**
   * Carga todos los datos del proyecto
   * 🚀 OPTIMIZADO: Usa caché en memoria si el proyecto ya está cargado
   */
  loadProject(projectId = null) {
    if (!projectId) {
      projectId = this.getCurrentProject()?.id;
    }
    if (!projectId) return null;
    
    // 🔒 VALIDACIÓN DE SEGURIDAD: Verificar que el proyecto pertenece al usuario actual
    if (!this.validateProjectOwnership(projectId)) {
      console.error('❌ SEGURIDAD: Intento de cargar proyecto que no pertenece al usuario');
      return null;
    }

    // 🚀 PRIORIDAD 1: Si está en caché de memoria y es el proyecto actual, retornar inmediatamente
    if (this.memoryCache.currentProjectId === projectId && this.memoryCache.projectData) {
      console.log('⚡ Datos cargados desde caché en memoria (instantáneo)');
      return this.memoryCache.projectData;
    }

    // 🚀 PRIORIDAD 2: Si está en caché de proyectos adicionales
    // IMPORTANTE: Para el proyecto ACTUAL, evitar caché secundaria para no servir datos viejos
    // después de un "Actualizar con la nube".
    const currentProjectId = this.getCurrentProject()?.id;
    if (projectId !== currentProjectId && this.projectsCache.has(projectId)) {
      console.log('⚡ Datos cargados desde caché de proyectos');
      return this.projectsCache.get(projectId);
    }

    // PRIORIDAD 3: Cargar desde localStorage
    const key = this.getProjectKey(projectId);
    if (!key) return null;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      
      // 🚀 CRÍTICO: Manejo robusto de errores en JSON.parse
      let projectData;
      try {
        projectData = JSON.parse(raw);
        // Validar que es un objeto válido
        if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
          console.warn('⚠️ Datos del proyecto no son un objeto válido');
          return null;
        }
      } catch (parseError) {
        console.error('❌ Error parseando datos del proyecto (JSON corrupto):', parseError);
        // Intentar recuperar: guardar backup
        try {
          const backupKey = `${key}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, raw);
          console.log('💾 Backup de datos corruptos guardado en:', backupKey);
        } catch (backupError) {
          console.error('❌ No se pudo guardar backup:', backupError);
        }
        return null; // Retornar null en lugar de objeto vacío para indicar error
      }
      
      // 🚀 Guardar en caché si es el proyecto actual
      if (projectId === this.getCurrentProject()?.id) {
        this.memoryCache.currentProjectId = projectId;
        this.memoryCache.projectData = projectData;
        this.memoryCache.lastLoaded = Date.now();
        this.memoryCache.isDirty = false;
        console.log('💾 Proyecto cargado en memoria - navegación será instantánea');
      } else {
        // Guardar en caché de proyectos adicionales (para comparación)
        this.addToProjectsCache(projectId, projectData);
      }
      
      return projectData;
    } catch (e) {
      console.error('❌ Error cargando proyecto:', e);
      return null;
    }
  }
  
  /**
   * Agrega proyecto al caché de proyectos adicionales
   */
  addToProjectsCache(projectId, projectData) {
    // Si el caché está lleno, eliminar el más antiguo
    if (this.projectsCache.size >= this.maxCacheSize) {
      const firstKey = this.projectsCache.keys().next().value;
      this.projectsCache.delete(firstKey);
    }
    this.projectsCache.set(projectId, projectData);
  }
  
  /**
   * Establece el proyecto actual en memoria (para navegación instantánea)
   */
  setCurrentProjectInMemory(projectId, projectData) {
    // Guardar cambios pendientes del proyecto anterior
    if (this.memoryCache.isDirty && this.memoryCache.currentProjectId) {
      this.flushPendingSaves();
    }
    
    // Cargar nuevo proyecto en memoria
    this.memoryCache.currentProjectId = projectId;
    this.memoryCache.projectData = projectData;
    this.memoryCache.lastLoaded = Date.now();
    this.memoryCache.isDirty = false;
    
    console.log('💾 Proyecto establecido en memoria - navegación instantánea activada');
  }
  
  /**
   * Obtiene datos del proyecto actual desde memoria (SIN tocar localStorage)
   */
  getCurrentProjectFromMemory() {
    if (this.memoryCache.currentProjectId && this.memoryCache.projectData) {
      return this.memoryCache.projectData;
    }
    return null;
  }
  
  /**
   * Obtiene una sección específica desde memoria (instantáneo)
   */
  getSectionFromMemory(section) {
    const projectData = this.getCurrentProjectFromMemory();
    if (projectData && projectData[section]) {
      return projectData[section];
    }
    return null;
  }
  
  /**
   * Actualiza una sección en memoria (sin guardar aún)
   * 🚀 CRÍTICO: Preserva TODAS las demás secciones (especialmente location)
   */
  updateSectionInMemory(section, data) {
    if (!section || !data) {
      console.warn('⚠️ updateSectionInMemory: sección o datos inválidos');
      return false;
    }
    
    if (!this.memoryCache.projectData) {
      // Si no hay proyecto en memoria, cargarlo primero
      const projectId = this.getCurrentProject()?.id;
      if (projectId) {
        const loaded = this.loadProject(projectId);
        if (!loaded) {
          console.warn('⚠️ No se pudo cargar proyecto para actualizar sección en memoria');
          return false;
        }
      } else {
        console.warn('⚠️ No hay projectId para actualizar sección en memoria');
        return false;
      }
    }
    
    // 🚀 CRÍTICO: Preservar TODAS las demás secciones del proyecto
    // Especialmente location, que no debe perderse cuando se guarda otra sección
    const existingSection = this.memoryCache.projectData[section] || {};
    
    // 🚀 CRÍTICO: Si estamos actualizando location, hacer reemplazo completo (no merge)
    // Si estamos actualizando otra sección, hacer merge preservando location
    if (section === 'location') {
      // Location: reemplazo completo
      this.memoryCache.projectData[section] = {
        ...data,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Otras secciones: merge preservando location
      this.memoryCache.projectData[section] = {
        ...existingSection,
        ...data,
        lastUpdated: new Date().toISOString()
      };
      
      // 🚀 CRÍTICO: Asegurar que location NO se pierda
      // Si location existe y tiene polígono válido, preservarlo SIEMPRE
      if (this.memoryCache.projectData.location) {
        const existingLocation = this.memoryCache.projectData.location;
        // Si location tiene polígono válido, NO tocarlo
        if (existingLocation.polygon && Array.isArray(existingLocation.polygon) && existingLocation.polygon.length >= 3) {
          // Location válido - ya está preservado porque solo actualizamos la sección específica
          console.log('✅ Location preservado en memoria al actualizar sección:', section);
        }
      }
    }
    
    this.memoryCache.isDirty = true;
    
    return true;
  }
  
  /**
   * Fuerza guardado de cambios pendientes en memoria
   */
  flushPendingSaves() {
    if (!this.memoryCache.isDirty || !this.memoryCache.projectData) {
      return true;
    }
    
    const projectId = this.memoryCache.currentProjectId;
    if (!projectId) {
      console.warn('⚠️ flushPendingSaves: No hay projectId');
      return false;
    }
    
    // Guardar en localStorage (en background)
    const key = this.getProjectKey(projectId);
    if (!key) {
      console.error('❌ flushPendingSaves: No se puede obtener clave del proyecto');
      return false;
    }
    
    try {
      // 🚀 CRÍTICO: Cargar datos actuales de localStorage antes de guardar
      // Esto preserva secciones que se guardaron directamente con saveSection()
      const raw = localStorage.getItem(key);
      let existingData = {};
      
      if (raw) {
        try {
          existingData = JSON.parse(raw);
          // Validar que es un objeto válido
          if (!existingData || typeof existingData !== 'object' || Array.isArray(existingData)) {
            existingData = {};
          }
        } catch (parseError) {
          console.warn('⚠️ Error parseando datos existentes en flushPendingSaves:', parseError);
          existingData = {};
        }
      }
      
      // 🚀 CRÍTICO: Preservar secciones que se guardaron directamente
      // Especialmente location que se guarda con saveSection()
      const merged = {
        ...existingData, // Datos de localStorage (más recientes)
        ...this.memoryCache.projectData, // Datos en memoria
        id: projectId,
        updated_at: new Date().toISOString()
      };
      
      // Si location existe en localStorage y es válido, preservarlo
      if (existingData.location && 
          existingData.location.polygon && 
          Array.isArray(existingData.location.polygon) && 
          existingData.location.polygon.length >= 3) {
        merged.location = existingData.location;
        console.log('✅ Location preservado desde localStorage en flushPendingSaves');
      }
      
      const serialized = JSON.stringify(merged);
      localStorage.setItem(key, serialized);
      this.memoryCache.isDirty = false;
      if (typeof window.nutriplantSyncProjectToCloud === 'function') {
        try { window.nutriplantSyncProjectToCloud(projectId, merged); } catch (err) { console.warn('nutriplantSyncProjectToCloud:', err); }
      }
      console.log('💾 Cambios guardados en background');
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('❌ ERROR: localStorage lleno al guardar cambios pendientes');
        // Intentar limpiar caché
        this.clearProjectsCache();
        try {
          localStorage.setItem(key, JSON.stringify(this.memoryCache.projectData));
          this.memoryCache.isDirty = false;
          console.log('✅ Guardado exitoso después de limpiar caché');
          return true;
        } catch (retryError) {
          console.error('❌ No se pudo guardar incluso después de limpiar caché');
        }
      } else {
        console.error('❌ Error guardando cambios:', e);
      }
      return false;
    }
  }

  /**
   * Guarda datos del proyecto (merge inteligente)
   * 🚀 OPTIMIZADO: Actualiza memoria primero, guarda en background
   */
  saveProject(data, projectId = null) {
    if (!projectId) {
      projectId = this.getCurrentProject()?.id;
    }
    if (!projectId) {
      console.warn('⚠️ No se puede guardar: no hay projectId');
      return false;
    }
    
    // 🔒 VALIDACIÓN DE SEGURIDAD: Verificar que el proyecto pertenece al usuario actual
    if (!this.validateProjectOwnership(projectId)) {
      console.error('❌ SEGURIDAD: Intento de guardar en proyecto que no pertenece al usuario');
      alert('Error de seguridad: Este proyecto no pertenece a tu cuenta. Por favor, recarga la página.');
      return false;
    }

    try {
      // 🚀 REGLA DE ORO: Location es COMPLETAMENTE INDEPENDIENTE
      // Location SOLO se guarda con saveSection('location', ...)
      // saveProject() NUNCA debe tocar location, solo preservarlo
      
      // 🚀 PRIORIDAD 1: Si es el proyecto actual, actualizar memoria primero
      if (projectId === this.memoryCache.currentProjectId) {
        // 🚀 CRÍTICO: Cargar location desde localStorage ANTES de cualquier merge
        // Location siempre se guarda directamente, no a través de saveProject
        const existingLocation = this.loadSection('location', projectId);
        const hasValidLocation = existingLocation && 
                                existingLocation.polygon && 
                                Array.isArray(existingLocation.polygon) && 
                                existingLocation.polygon.length >= 3;
        
        const existing = this.memoryCache.projectData || this.loadProject(projectId) || {};
        
        // 🚀 CRÍTICO: Remover location de data SIEMPRE (nunca se guarda aquí)
        // Location se guarda exclusivamente con saveSection()
        const dataWithoutLocation = { ...data };
        delete dataWithoutLocation.location; // SIEMPRE remover
        
        // Hacer merge SIN location
        const merged = this.smartMerge(existing, dataWithoutLocation);
        merged.updated_at = new Date().toISOString();
        if (!merged.id) merged.id = projectId;
        if (!merged.name && this.getCurrentProject()) {
          merged.name = this.getCurrentProject().name;
        }
        
        // 🚀 CRÍTICO: SIEMPRE restaurar location desde localStorage después del merge
        if (hasValidLocation) {
          merged.location = existingLocation;
          console.log('✅ Location preservado desde localStorage (independiente de saveProject)');
        } else if (existing.location) {
          // Si hay location en memoria pero no en storage, preservarlo también
          merged.location = existing.location;
          console.log('✅ Location preservado desde memoria');
        }
        
        // Actualizar en memoria (instantáneo)
        this.memoryCache.projectData = merged;
        this.memoryCache.isDirty = true;
        
        // Guardar en localStorage en background (no bloquea)
        setTimeout(() => {
          const key = this.getProjectKey(projectId);
          localStorage.setItem(key, JSON.stringify(merged));
          this.memoryCache.isDirty = false;
          if (typeof window.nutriplantSyncProjectToCloud === 'function') {
            try { window.nutriplantSyncProjectToCloud(projectId, merged); } catch (err) { console.warn('nutriplantSyncProjectToCloud:', err); }
          }
          // 🚀 CRÍTICO: Verificar que location se mantuvo después del guardado
          const verifyLocation = this.loadSection('location', projectId);
          if (hasValidLocation && (!verifyLocation || !verifyLocation.polygon || verifyLocation.polygon.length < 3)) {
            console.error('❌ ERROR: Location se perdió después del guardado - restaurando...');
            this.saveSection('location', existingLocation, projectId);
            console.log('✅ Location restaurado después de detectar pérdida');
          } else {
            console.log('💾 Guardado en background completado - location preservado:', hasValidLocation);
          }
        }, 0);
        
        return true;
      }
      
      // Para proyectos que no son el actual, guardar normalmente
      // 🚀 REGLA DE ORO: Location es COMPLETAMENTE INDEPENDIENTE
      const existing = this.loadProject(projectId) || {};
      
      // 🚀 CRÍTICO: Cargar location desde localStorage (siempre la fuente de verdad)
      const existingLocation = this.loadSection('location', projectId) || existing.location;
      const hasValidLocation = existingLocation && 
                              existingLocation.polygon && 
                              Array.isArray(existingLocation.polygon) && 
                              existingLocation.polygon.length >= 3;
      
      // 🚀 CRÍTICO: Remover location de data SIEMPRE (nunca se guarda aquí)
      const dataWithoutLocation = { ...data };
      delete dataWithoutLocation.location; // SIEMPRE remover
      
      const merged = this.smartMerge(existing, dataWithoutLocation);
      merged.updated_at = new Date().toISOString();
      if (!merged.id) merged.id = projectId;
      
      // 🚀 CRÍTICO: SIEMPRE restaurar location desde localStorage después del merge
      if (hasValidLocation) {
        merged.location = existingLocation;
        console.log('✅ Location preservado desde localStorage (proyecto no actual)');
      } else if (existing.location) {
        merged.location = existing.location;
        console.log('✅ Location preservado desde memoria (proyecto no actual)');
      }
      
      const key = this.getProjectKey(projectId);
      localStorage.setItem(key, JSON.stringify(merged));
      if (typeof window.nutriplantSyncProjectToCloud === 'function') {
        try { window.nutriplantSyncProjectToCloud(projectId, merged); } catch (err) { console.warn('nutriplantSyncProjectToCloud:', err); }
      }
      // Actualizar caché si existe
      if (this.projectsCache.has(projectId)) {
        this.projectsCache.set(projectId, merged);
      }
      
      return true;
    } catch (e) {
      console.error('❌ Error guardando proyecto:', e);
      return false;
    }
  }

  /**
   * Guarda una sección específica del proyecto
   * 🚀 OPTIMIZADO: Actualiza memoria primero, guarda en background
   */
  saveSection(section, data, projectId = null) {
    if (!section) {
      console.warn('⚠️ No se especificó sección para guardar');
      return false;
    }

    if (!projectId) {
      projectId = this.getCurrentProject()?.id;
    }
    if (!projectId) {
      console.warn('⚠️ No se puede guardar sección: no hay projectId');
      return false;
    }
    
    // 🔒 VALIDACIÓN DE SEGURIDAD: Verificar que el proyecto pertenece al usuario actual
    if (!this.validateProjectOwnership(projectId)) {
      console.error('❌ SEGURIDAD: Intento de guardar sección en proyecto que no pertenece al usuario');
      return false;
    }

    // Preparar datos de la sección con timestamp
    // 🚀 CRÍTICO: Log para diagnosticar qué se recibe en saveSection (solo para granular)
    if (section === 'granular' && data && data.requirements) {
      console.log('🔍 saveSection RECIBE data (Granular):', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        hasRequirements: !!data.requirements,
        requirementsKeys: data.requirements ? Object.keys(data.requirements) : [],
        hasExtractionOverrides: !!(data.requirements && data.requirements.extractionOverrides),
        extractionOverridesKeys: data.requirements && data.requirements.extractionOverrides ? Object.keys(data.requirements.extractionOverrides) : [],
        extractionOverrides: data.requirements ? data.requirements.extractionOverrides : null
      });
    }
    
    // Si data es un array (ej. soilAnalyses), guardarlo como array; si no, como objeto con lastUpdated
    const isArraySection = Array.isArray(data);
    const sectionData = isArraySection ? data : {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    // 🚀 CRÍTICO: Log para diagnosticar qué se crea en sectionData (solo para granular)
    if (section === 'granular' && sectionData && sectionData.requirements) {
      console.log('🔍 saveSection CREA sectionData (Granular):', {
        hasSectionData: !!sectionData,
        sectionDataKeys: sectionData ? Object.keys(sectionData) : [],
        hasRequirements: !!sectionData.requirements,
        requirementsKeys: sectionData.requirements ? Object.keys(sectionData.requirements) : [],
        hasExtractionOverrides: !!(sectionData.requirements && sectionData.requirements.extractionOverrides),
        extractionOverridesKeys: sectionData.requirements && sectionData.requirements.extractionOverrides ? Object.keys(sectionData.requirements.extractionOverrides) : [],
        extractionOverrides: sectionData.requirements ? sectionData.requirements.extractionOverrides : null
      });
    }

    // 🚀 REGLA DE ORO: Cada sección se guarda DIRECTAMENTE e INDEPENDIENTEMENTE
    // NO usar saveProject() que hace merge - guardar directamente en localStorage
    
    try {
      const key = this.getProjectKey(projectId);
      if (!key) {
        console.error('❌ No se puede obtener clave del proyecto');
        return false;
      }

      // 🚀 CRÍTICO: Protección contra race conditions
      // Leer-Modificar-Escribir debe ser atómico
      // Usar un retry loop para manejar conflictos de escritura
      let retries = 3;
      let success = false;
      let lastError = null;
      let projectData = {}; // Definir fuera del while para que esté disponible después
      let existingLocation = null; // Definir fuera del while
      let hasValidLocation = false; // Definir fuera del while
      const isLocationSection = section === 'location'; // Definir fuera del while
      let skippedNoopSave = false;
      
      while (retries > 0 && !success) {
        try {
          // Cargar proyecto completo desde localStorage (siempre leer la versión más reciente)
          const raw = localStorage.getItem(key);
          projectData = {}; // Reinicializar en cada intento
          
          // 🚀 CRÍTICO: Manejo robusto de errores en JSON.parse
          if (raw) {
            try {
              projectData = JSON.parse(raw);
              // Validar que es un objeto válido
              if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
                console.warn('⚠️ Datos del proyecto no son un objeto válido, inicializando vacío');
                projectData = {};
              }
            } catch (parseError) {
              console.error('❌ Error parseando datos del proyecto (JSON corrupto):', parseError);
              // Intentar recuperar: guardar backup y reinicializar
              try {
                const backupKey = `${key}_backup_${Date.now()}`;
                localStorage.setItem(backupKey, raw);
                console.log('💾 Backup de datos corruptos guardado en:', backupKey);
              } catch (backupError) {
                console.error('❌ No se pudo guardar backup:', backupError);
              }
              projectData = {}; // Reinicializar con objeto vacío
            }
          }
          
          // 🚀 CRÍTICO: Preservar location SIEMPRE antes de actualizar cualquier sección
          // Location es completamente independiente y NO debe perderse
          // IMPORTANTE: Capturar location DENTRO del retry loop para tener la versión más reciente
          existingLocation = projectData.location;
          hasValidLocation = existingLocation && 
                                  existingLocation.polygon && 
                                  Array.isArray(existingLocation.polygon) && 
                                  existingLocation.polygon.length >= 3;
          
          if (hasValidLocation) {
            console.log('🔒 Location detectado antes de guardar sección:', section, '- Preservando...', {
              polygonPoints: existingLocation.polygon.length,
              projectId: existingLocation.projectId
            });
          }
          
          if (isLocationSection && sectionData) {
            if (!sectionData.projectId) {
              sectionData.projectId = projectData.id || projectId;
            } else if (projectData.id && sectionData.projectId !== projectData.id) {
              console.warn('⚠️ location.projectId no coincide, corrigiendo...', {
                expected: projectData.id,
                found: sectionData.projectId
              });
              sectionData.projectId = projectData.id;
            }
          }

          // 🚀 OPTIMIZACIÓN: evitar escritura/sync si la sección no cambió realmente.
          const existingSectionData = projectData[section];

          // Blindaje específico Granular:
          // Si llega un guardado parcial de 'granular' (p.ej. solo program) y ya había
          // requirements válidos, preservarlos para que no se pierdan al recargar.
          if (section === 'granular' && !isArraySection && sectionData && typeof sectionData === 'object') {
            const existingReq = existingSectionData && typeof existingSectionData === 'object'
              ? existingSectionData.requirements
              : null;
            const incomingReq = sectionData.requirements;
            const incomingHasReq = !!(incomingReq &&
              typeof incomingReq === 'object' &&
              (
                incomingReq.cropType ||
                incomingReq.targetYield != null ||
                (incomingReq.adjustment && Object.keys(incomingReq.adjustment).length > 0) ||
                (incomingReq.efficiency && Object.keys(incomingReq.efficiency).length > 0) ||
                (incomingReq.extractionOverrides && Object.keys(incomingReq.extractionOverrides).length > 0)
              ));
            const existingHasReq = !!(existingReq &&
              typeof existingReq === 'object' &&
              (
                existingReq.cropType ||
                existingReq.targetYield != null ||
                (existingReq.adjustment && Object.keys(existingReq.adjustment).length > 0) ||
                (existingReq.efficiency && Object.keys(existingReq.efficiency).length > 0) ||
                (existingReq.extractionOverrides && Object.keys(existingReq.extractionOverrides).length > 0)
              ));
            if (!incomingHasReq && existingHasReq) {
              sectionData.requirements = existingReq;
              console.warn('🛡️ Granular guard: preservando requirements existentes en saveSection()');
            }
          }
          if (!this.hasSectionChanged(existingSectionData, sectionData)) {
            skippedNoopSave = true;
            success = true;
            console.log(`⏭️ Sección '${section}' sin cambios reales - se omite write/sync`);
            continue;
          }
          
          // 🚀 CRÍTICO: Actualizar SOLO esta sección (reemplazo completo de la sección)
          // NO hacer merge dentro de la sección - reemplazo completo
          // Si es array (soilAnalyses), guardar el array tal cual para que persista correctamente
          projectData[section] = isArraySection ? sectionData : sectionData;
          
          // 🚀 CRÍTICO: SIEMPRE restaurar location después de actualizar la sección
          // Esto asegura que location NUNCA se pierda, incluso si hay un error
          if (hasValidLocation && !isLocationSection) {
            projectData.location = existingLocation;
            console.log('✅ Location preservado al guardar sección:', section);
          } else if (!isLocationSection) {
            console.log('ℹ️ No hay location válido para preservar al guardar sección:', section);
          }
          
          // Asegurar propiedades del proyecto
          if (!projectData.id) projectData.id = projectId;
          projectData.updated_at = new Date().toISOString();
          
          // 🚀 CRÍTICO: Guardar DIRECTAMENTE en localStorage (sin merge, sin delay)
          // Manejo robusto de errores (QuotaExceededError, etc.)
          try {
            // 🚀 CRÍTICO: Log para diagnosticar qué se está guardando (solo para granular)
            if (section === 'granular' && sectionData && sectionData.requirements) {
              console.log('🔍 GUARDANDO granular en localStorage - sectionData.requirements:', {
                hasRequirements: !!sectionData.requirements,
                requirementsKeys: Object.keys(sectionData.requirements),
                hasExtractionOverrides: !!sectionData.requirements.extractionOverrides,
                extractionOverridesKeys: sectionData.requirements.extractionOverrides ? Object.keys(sectionData.requirements.extractionOverrides) : [],
                extractionOverrides: sectionData.requirements.extractionOverrides
              });
            }
            const serialized = JSON.stringify(projectData);
            localStorage.setItem(key, serialized);
            success = true;
          } catch (storageError) {
            if (storageError.name === 'QuotaExceededError') {
              console.error('❌ ERROR CRÍTICO: localStorage está lleno. Limpiando caché antiguo...');
              // Intentar limpiar caché de proyectos antiguos
              this.clearProjectsCache();
              // Intentar guardar nuevamente
              try {
                localStorage.setItem(key, JSON.stringify(projectData));
                success = true;
                console.log('✅ Guardado exitoso después de limpiar caché');
              } catch (retryError) {
                console.error('❌ ERROR: No se pudo guardar incluso después de limpiar caché');
                throw new Error('localStorage lleno - no se puede guardar');
              }
            } else {
              throw storageError;
            }
          }
        } catch (e) {
          lastError = e;
          retries--;
          if (retries > 0) {
            // Esperar un poco antes de reintentar (evitar race conditions)
            // Usar setTimeout en lugar de await (función no es async)
            const delay = (4 - retries) * 10; // Delay incremental: 10ms, 20ms, 30ms
            const start = Date.now();
            while (Date.now() - start < delay) {
              // Busy wait (simple, no requiere async)
            }
            console.warn(`⚠️ Reintentando guardar sección '${section}'... (${retries} intentos restantes)`);
          }
        }
      }
      
      if (!success) {
        throw lastError || new Error('No se pudo guardar después de múltiples intentos');
      }
      
      // 🚀 Si es el proyecto actual, actualizar memoria también (instantáneo)
      if (projectId === this.memoryCache.currentProjectId) {
        if (!this.memoryCache.projectData) {
          this.memoryCache.projectData = projectData;
        } else if (!skippedNoopSave) {
          // Actualizar solo esta sección en memoria (array se guarda como array)
          this.memoryCache.projectData[section] = isArraySection ? sectionData : sectionData;
          this.memoryCache.projectData.updated_at = projectData.updated_at;
          
          // 🚀 CRÍTICO: Preservar location en memoria también
          if (hasValidLocation && !isLocationSection) {
            this.memoryCache.projectData.location = existingLocation;
            console.log('✅ Location preservado en memoria al guardar sección:', section);
          }
          
          // 🚀 CRÍTICO: Log para verificar que extractionOverrides se guardó en memoria (solo para granular)
          if (section === 'granular' && sectionData && sectionData.requirements) {
            console.log('🔍 MEMORIA ACTUALIZADA (Granular):', {
              hasRequirements: !!sectionData.requirements,
              requirementsKeys: sectionData.requirements ? Object.keys(sectionData.requirements) : [],
              hasExtractionOverrides: !!(sectionData.requirements && sectionData.requirements.extractionOverrides),
              extractionOverridesKeys: sectionData.requirements && sectionData.requirements.extractionOverrides ? Object.keys(sectionData.requirements.extractionOverrides) : [],
              extractionOverrides: sectionData.requirements ? sectionData.requirements.extractionOverrides : null
            });
          }
        }
        this.memoryCache.isDirty = false; // Ya guardado
        if (skippedNoopSave) {
          console.log(`✅ Sección '${section}' sin cambios reales (memoria/local intactos)`);
        } else {
          console.log(`✅ Sección '${section}' guardada directamente en localStorage y memoria`);
        }
      } else {
        // Actualizar caché de otros proyectos si existe
        if (!skippedNoopSave && this.projectsCache.has(projectId)) {
          const cached = this.projectsCache.get(projectId);
          cached[section] = sectionData;
          cached.updated_at = projectData.updated_at;
          this.projectsCache.set(projectId, cached);
        }
        if (skippedNoopSave) {
          console.log(`✅ Sección '${section}' sin cambios reales (se omite escritura local)`);
        } else {
          console.log(`✅ Sección '${section}' guardada directamente en localStorage`);
        }
      }
      // 🟢 Sincronizar con la nube en segundo plano (enmiendas, fertirriego, hidroponía, análisis, etc.)
      if (!skippedNoopSave && typeof window.nutriplantSyncProjectToCloud === 'function') {
        try { window.nutriplantSyncProjectToCloud(projectId, projectData); } catch (err) { console.warn('nutriplantSyncProjectToCloud:', err); }
      }
      return true;
    } catch (e) {
      console.error(`❌ Error guardando sección '${section}':`, e);
      return false;
    }
  }

  /**
   * Carga una sección específica del proyecto
   * 🚀 CRÍTICO: Para 'location', SIEMPRE cargar desde localStorage (fuente de verdad)
   * 🚀 OPTIMIZADO: Para otras secciones, carga desde memoria si está disponible (instantáneo)
   * 🚀 CRÍTICO: Valida projectId estrictamente para evitar datos de otros proyectos
   */
  loadSection(section, projectId = null) {
    if (!projectId) {
      projectId = this.getCurrentProject()?.id;
    }
    if (!projectId) {
      console.warn('⚠️ No se puede cargar sección: no hay projectId');
      return null;
    }
    
    // 🔒 VALIDACIÓN DE SEGURIDAD: Verificar que el proyecto pertenece al usuario actual
    if (!this.validateProjectOwnership(projectId)) {
      console.error('❌ SEGURIDAD: Intento de cargar sección de proyecto que no pertenece al usuario');
      return null;
    }
    
    // 🚀 CRÍTICO: Para 'location', SIEMPRE cargar desde localStorage (fuente de verdad)
    // Esto evita problemas de sincronización cuando se guarda en otra pestaña
    if (section === 'location') {
      const key = this.getProjectKey(projectId);
      console.log('🔍 loadSection(location) - Clave:', key, 'projectId:', projectId);
      
      if (!key) {
        console.warn('⚠️ No se puede obtener clave del proyecto');
        return null;
      }
      
      try {
        const raw = localStorage.getItem(key);
        console.log('🔍 loadSection(location) - ¿Existe en localStorage?', !!raw);
        
        if (!raw) {
          console.log('🔍 loadSection(location) - No hay datos en localStorage para esta clave');
          return null;
        }
        
        const projectData = JSON.parse(raw);
        console.log('🔍 loadSection(location) - Datos parseados:', {
          isObject: projectData && typeof projectData === 'object',
          isArray: Array.isArray(projectData),
          hasLocation: !!(projectData && projectData.location)
        });
        
        if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
          console.warn('🔍 loadSection(location) - Datos no son un objeto válido');
          return null;
        }
        
        const locationData = projectData.location;
        console.log('🔍 loadSection(location) - locationData:', {
          isNull: locationData === null,
          isUndefined: locationData === undefined,
          isObject: locationData && typeof locationData === 'object',
          hasPolygon: !!(locationData && locationData.polygon),
          polygonType: locationData && locationData.polygon ? typeof locationData.polygon : 'N/A',
          polygonIsArray: locationData && locationData.polygon ? Array.isArray(locationData.polygon) : false,
          polygonLength: locationData && locationData.polygon && Array.isArray(locationData.polygon) ? locationData.polygon.length : 0,
          projectId: locationData ? locationData.projectId : 'N/A',
          allKeys: locationData ? Object.keys(locationData) : []
        });
        
        if (!locationData) {
          console.log('🔍 loadSection(location) - locationData es null/undefined');
          return null;
        }
        
        // 🚀 CRÍTICO: Validar projectId - pero ser flexible con datos antiguos
        if (locationData.projectId && locationData.projectId !== projectId) {
          console.warn('⚠️ Location en localStorage pertenece a otro proyecto. IGNORANDO...', {
            expected: projectId,
            found: locationData.projectId
          });
          return null;
        }
        
        // Si no tiene projectId, agregarlo (datos antiguos)
        if (!locationData.projectId) {
          console.log('🔍 loadSection(location) - Agregando projectId a location sin projectId');
          locationData.projectId = projectId;
          // Actualizar en localStorage también
          projectData.location = locationData;
          localStorage.setItem(key, JSON.stringify(projectData));
          console.log('ℹ️ Location sin projectId - agregado y guardado');
        }
        
        // Actualizar memoria también
        if (projectId === this.memoryCache.currentProjectId) {
          if (!this.memoryCache.projectData) {
            this.memoryCache.projectData = projectData;
          } else {
            this.memoryCache.projectData.location = locationData;
          }
        }
        
        console.log('✅ Location cargado desde localStorage (fuente de verdad):', {
          polygonPoints: locationData.polygon ? locationData.polygon.length : 0,
          projectId: locationData.projectId
        });
        
        return locationData;
      } catch (e) {
        console.error('❌ Error cargando location desde localStorage:', e);
        console.error('🔍 Error details:', {
          message: e.message,
          stack: e.stack
        });
        return null;
      }
    }
    
    // 🚀 Para otras secciones: PRIORIDAD 1 - Cargar desde memoria (instantáneo)
    if (projectId === this.memoryCache.currentProjectId) {
      const sectionData = this.getSectionFromMemory(section);
      if (sectionData) {
        // 🚀 CRÍTICO: Log para diagnosticar carga desde memoria
        if (section === 'granular') {
          console.log('🔍 loadSection(granular) desde MEMORIA:', {
            hasSectionData: !!sectionData,
            sectionDataKeys: sectionData ? Object.keys(sectionData) : [],
            hasRequirements: !!(sectionData && sectionData.requirements),
            requirementsKeys: sectionData && sectionData.requirements ? Object.keys(sectionData.requirements) : [],
            hasExtractionOverrides: !!(sectionData && sectionData.requirements && sectionData.requirements.extractionOverrides),
            extractionOverrides: sectionData && sectionData.requirements ? sectionData.requirements.extractionOverrides : null
          });
        }
        // 🚀 CRÍTICO: Validar projectId si existe en los datos
        if (sectionData.projectId && sectionData.projectId !== projectId) {
          console.warn('⚠️ Datos en memoria pertenecen a otro proyecto. IGNORANDO...', {
            expected: projectId,
            found: sectionData.projectId
          });
          return null;
        }
        return sectionData;
      }
    }
    
    // PRIORIDAD 2: Cargar desde caché de proyectos adicionales
    if (this.projectsCache.has(projectId)) {
      const project = this.projectsCache.get(projectId);
      if (project && project[section]) {
        const sectionData = project[section];
        // 🚀 CRÍTICO: Validar projectId si existe en los datos
        if (sectionData.projectId && sectionData.projectId !== projectId) {
          console.warn('⚠️ Datos en caché pertenecen a otro proyecto. IGNORANDO...', {
            expected: projectId,
            found: sectionData.projectId
          });
          return null;
        }
        return sectionData;
      }
    }
    
    // PRIORIDAD 3: Cargar desde localStorage (solo si no está en memoria)
    const project = this.loadProject(projectId);
    if (!project) return null;
    
    const sectionData = project[section];
    if (!sectionData) return null;
    
    // 🚀 CRÍTICO: Log para diagnosticar carga desde localStorage
    if (section === 'granular') {
      console.log('🔍 loadSection(granular) desde LOCALSTORAGE:', {
        hasProject: !!project,
        projectKeys: project ? Object.keys(project) : [],
        hasSectionData: !!sectionData,
        sectionDataKeys: sectionData ? Object.keys(sectionData) : [],
        hasRequirements: !!(sectionData && sectionData.requirements),
        requirementsKeys: sectionData && sectionData.requirements ? Object.keys(sectionData.requirements) : [],
        hasExtractionOverrides: !!(sectionData && sectionData.requirements && sectionData.requirements.extractionOverrides),
        extractionOverrides: sectionData && sectionData.requirements ? sectionData.requirements.extractionOverrides : null
      });
    }
    
    // 🚀 CRÍTICO: Validar projectId si existe en los datos
    if (sectionData.projectId && sectionData.projectId !== projectId) {
      console.warn('⚠️ Datos en localStorage pertenecen a otro proyecto. IGNORANDO...', {
        section: section,
        expected: projectId,
        found: sectionData.projectId
      });
      return null;
    }
    
    // 🚀 CRÍTICO: Validar también que el proyecto padre tenga el ID correcto
    if (project.id && project.id !== projectId) {
      console.warn('⚠️ Proyecto en localStorage tiene ID diferente. IGNORANDO...', {
        expected: projectId,
        found: project.id
      });
      return null;
    }
    
    return sectionData;
  }
  
  /**
   * Limpia el caché de memoria (útil al cambiar de proyecto)
   */
  clearMemoryCache() {
    // Guardar cambios pendientes antes de limpiar
    if (this.memoryCache.isDirty) {
      this.flushPendingSaves();
    }
    
    this.memoryCache.currentProjectId = null;
    this.memoryCache.projectData = null;
    this.memoryCache.lastLoaded = null;
    this.memoryCache.isDirty = false;
  }
  
  /**
   * Limpia el caché de proyectos adicionales
   */
  clearProjectsCache() {
    this.projectsCache.clear();
  }

  /**
   * 🚀 SISTEMA DE DIAGNÓSTICO Y VERIFICACIÓN
   * Verifica que el sistema de guardado funciona correctamente
   */
  diagnose() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      projectStorage: {
        available: typeof window.projectStorage !== 'undefined',
        currentProject: this.getCurrentProject()?.id || null,
        memoryCache: {
          hasProject: !!this.memoryCache.currentProjectId,
          projectId: this.memoryCache.currentProjectId,
          hasData: !!this.memoryCache.projectData,
          isDirty: this.memoryCache.isDirty
        }
      },
      localStorage: {
        available: typeof localStorage !== 'undefined',
        test: null,
        error: null
      },
      currentProject: {
        id: this.getCurrentProject()?.id || null,
        name: this.getCurrentProject()?.name || null
      }
    };

    // Probar localStorage
    try {
      const testKey = 'nutriplant_diagnostic_test';
      const testValue = { test: true, timestamp: Date.now() };
      localStorage.setItem(testKey, JSON.stringify(testValue));
      const retrieved = JSON.parse(localStorage.getItem(testKey));
      localStorage.removeItem(testKey);
      
      if (retrieved && retrieved.test) {
        diagnostics.localStorage.test = 'OK';
      } else {
        diagnostics.localStorage.test = 'FAILED';
      }
    } catch (e) {
      diagnostics.localStorage.test = 'ERROR';
      diagnostics.localStorage.error = e.message;
    }

    // Verificar proyecto actual
    if (diagnostics.currentProject.id) {
      const key = this.getProjectKey(diagnostics.currentProject.id);
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          diagnostics.currentProject.sections = {
            location: !!data.location,
            amendments: !!data.amendments,
            soilAnalysis: !!data.soilAnalysis,
            granular: !!data.granular,
            fertirriego: !!data.fertirriego
          };
          diagnostics.currentProject.hasData = true;
        } catch (e) {
          diagnostics.currentProject.hasData = false;
          diagnostics.currentProject.parseError = e.message;
        }
      } else {
        diagnostics.currentProject.hasData = false;
      }
    }

    return diagnostics;
  }

  /**
   * Verifica que una sección específica se guardó correctamente
   */
  verifySection(section, projectId = null) {
    if (!projectId) {
      projectId = this.getCurrentProject()?.id;
    }
    if (!projectId) {
      return { success: false, error: 'No hay projectId' };
    }

    const key = this.getProjectKey(projectId);
    if (!key) {
      return { success: false, error: 'No se puede obtener clave del proyecto' };
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return { success: false, error: 'Proyecto no existe en localStorage' };
      }

      const projectData = JSON.parse(raw);
      const sectionData = projectData[section];

      return {
        success: true,
        exists: !!sectionData,
        hasData: sectionData && Object.keys(sectionData).length > 0,
        lastUpdated: sectionData?.lastUpdated || null,
        projectId: projectData.id,
        sectionProjectId: sectionData?.projectId || null,
        isValid: sectionData?.projectId === projectId
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
        parseError: true
      };
    }
  }

  /**
   * Merge inteligente que preserva valores del usuario
   * PRIORIDAD: valores del usuario > valores guardados > valores precargados
   */
  smartMerge(existing, newData) {
    if (!newData || typeof newData !== 'object') {
      return existing;
    }

    const merged = { ...existing };

    // Iterar sobre las propiedades del nuevo dato
    Object.keys(newData).forEach(key => {
      const newValue = newData[key];
      const existingValue = existing[key];

      // 🚀 CRÍTICO: Si el nuevo valor es null, undefined o string vacío, NO sobrescribir
      if (newValue === null || newValue === undefined || newValue === '') {
        return; // Mantener el valor existente
      }

      // 🚀 CRÍTICO: Si estamos guardando una sección específica (ej: amendments),
      // NO tocar otras secciones (ej: location) - preservarlas completamente
      // Esto asegura que location no se pierda cuando se guarda otra sección
      
      // Si ambos son objetos (no arrays), hacer merge profundo
      if (this.isPlainObject(newValue) && this.isPlainObject(existingValue)) {
        merged[key] = this.smartMerge(existingValue, newValue);
      }
      // Si el nuevo valor tiene isUserSaved: true, SIEMPRE priorizarlo
      else if (newValue && typeof newValue === 'object' && newValue.isUserSaved === true) {
        merged[key] = newValue;
      }
      // Si el valor existente tiene isUserSaved: true, NO sobrescribir a menos que el nuevo también lo tenga
      else if (existingValue && typeof existingValue === 'object' && existingValue.isUserSaved === true) {
        if (newValue && typeof newValue === 'object' && newValue.isUserSaved === true) {
          // Ambos son del usuario, hacer merge preservando valores del usuario
          merged[key] = this.smartMerge(existingValue, newValue);
        } else {
          // Mantener el valor del usuario existente
          return; // No sobrescribir
        }
      }
      // 🚀 CRÍTICO: Para location, si existe y tiene polígono válido, preservarlo SIEMPRE
      // a menos que el nuevo valor también sea location con polígono válido
      else if (key === 'location' && existingValue && existingValue.polygon && 
               Array.isArray(existingValue.polygon) && existingValue.polygon.length >= 3) {
        // Si el nuevo location también tiene polígono válido, hacer merge
        if (newValue && newValue.polygon && Array.isArray(newValue.polygon) && newValue.polygon.length >= 3) {
          merged[key] = newValue; // El nuevo location tiene polígono válido, reemplazar
        } else {
          // Mantener el location existente (tiene polígono válido)
          return; // No sobrescribir
        }
      }
      // Arrays: reemplazar completamente (no hacer merge de arrays)
      else if (Array.isArray(newValue)) {
        merged[key] = newValue;
      }
      // Valores primitivos: reemplazar
      else {
        merged[key] = newValue;
      }
    });

    return merged;
  }

  /**
   * Verifica si un valor es un objeto plano (no array, no null)
   */
  isPlainObject(value) {
    return value !== null && 
           typeof value === 'object' && 
           !Array.isArray(value) && 
           value.constructor === Object;
  }

  /**
   * Normaliza una sección para comparar cambios reales sin ruido de timestamps.
   */
  normalizeSectionForCompare(value) {
    if (Array.isArray(value)) return value;
    if (!this.isPlainObject(value)) return value;
    const normalized = { ...value };
    delete normalized.lastUpdated;
    return normalized;
  }

  /**
   * Retorna true si la sección cambió realmente (ignorando lastUpdated).
   */
  hasSectionChanged(existingSection, nextSection) {
    try {
      const prev = this.normalizeSectionForCompare(existingSection);
      const next = this.normalizeSectionForCompare(nextSection);
      return JSON.stringify(prev) !== JSON.stringify(next);
    } catch (e) {
      // En caso de duda, asumir que sí cambió para no perder datos.
      return true;
    }
  }

  /**
   * Guarda con debounce (para inputs que cambian frecuentemente)
   */
  saveWithDebounce(section, data, delay = 500, projectId = null) {
    const key = `${section}_${projectId || this.getCurrentProject()?.id || 'default'}`;
    
    // Cancelar guardado anterior pendiente
    if (this.debounceTimers[key]) {
      clearTimeout(this.debounceTimers[key]);
    }

    // Guardar inmediatamente si es crítico
    if (data.isUserSaved === true || data.isCritical === true) {
      return this.saveSection(section, data, projectId);
    }

    // Guardar con delay
    this.debounceTimers[key] = setTimeout(() => {
      this.saveSection(section, data, projectId);
      this.debounceTimers[key] = null;
    }, delay);
  }

  /**
   * Guarda inmediatamente (sin debounce)
   */
  saveImmediate(section, data, projectId = null) {
    return this.saveSection(section, data, projectId);
  }

  /**
   * Limpia todos los timers de debounce
   */
  clearDebounceTimers() {
    Object.values(this.debounceTimers).forEach(timer => clearTimeout(timer));
    this.debounceTimers = {};
  }

  /**
   * Verifica si hay datos guardados para un proyecto
   */
  hasProjectData(projectId = null) {
    const key = this.getProjectKey(projectId);
    if (!key) return false;
    return localStorage.getItem(key) !== null;
  }

  /**
   * Elimina un proyecto completo
   */
  deleteProject(projectId = null) {
    const key = this.getProjectKey(projectId);
    if (!key) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('❌ Error eliminando proyecto:', e);
      return false;
    }
  }

  /**
   * Obtiene todos los proyectos del usuario actual
   * Para usuarios Supabase: usa caché (np_loadProjects en dashboard). Para otros: desde localStorage.
   */
  getAllProjects() {
    const userId = localStorage.getItem('nutriplant_user_id');
    if (!userId) return [];

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return Array.isArray(window._np_cloud_projects_cache) ? window._np_cloud_projects_cache : [];
    }
    
    // Usuarios localStorage: lógica original
    let userProjects = [];
    try {
      const userKey = `nutriplant_user_${userId}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        const userProfile = JSON.parse(userData);
        if (userProfile && userProfile.projects && Array.isArray(userProfile.projects)) {
          userProjects = userProfile.projects;
        }
      }
    } catch (e) {
      console.warn('⚠️ Error obteniendo proyectos del usuario:', e);
      return [];
    }
    
    if (userProjects.length === 0) return [];
    
    const projects = [];
    userProjects.forEach(projectId => {
      try {
        const projectKey = `nutriplant_project_${projectId}`;
        const projectData = localStorage.getItem(projectKey);
        if (projectData) {
          const data = JSON.parse(projectData);
          if (data && data.id) {
            projects.push({
              id: data.id,
              name: data.name || 'Sin nombre',
              updated_at: data.updated_at || data.created_at,
              hasLocation: !!(data.location && data.location.polygon),
              hasSoilAnalysis: !!(data.soilAnalysis && Object.keys(data.soilAnalysis).length > 0),
              hasFertirriego: !!(data.fertirriego && Object.keys(data.fertirriego).length > 0),
              hasGranular: !!(data.granular && Object.keys(data.granular).length > 0)
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ Error parseando proyecto:', projectId, e);
      }
    });
    
    return projects;
  }

  /**
   * Retorna snapshot normalizado del proyecto para asistentes/analítica.
   */
  getNormalizedProjectSnapshot(projectId = null) {
    const current = this.getCurrentProject();
    const pid = projectId || current?.id;
    if (!pid) return null;

    const project = this.loadProject(pid);
    if (!project) return null;

    const cloudMeta = (window.nutriplantSupabaseProjects && typeof window.nutriplantSupabaseProjects.getCloudProjectMeta === 'function')
      ? window.nutriplantSupabaseProjects.getCloudProjectMeta(pid)
      : null;

    const localUpdatedAt = project.updated_at || project.updatedAt || project.created_at || project.createdAt || null;
    const cloudUpdatedAt = cloudMeta ? (cloudMeta.updatedAt || null) : null;
    const localTs = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;
    const cloudTs = cloudUpdatedAt ? new Date(cloudUpdatedAt).getTime() : 0;

    return {
      projectId: pid,
      projectName: project.name || project.title || '',
      localUpdatedAt,
      cloudUpdatedAt,
      freshness: cloudTs > localTs ? 'cloud_newer' : 'local_current',
      sections: {
        soilAnalysis: project.soilAnalysis || null,
        amendments: project.amendments || null,
        granular: project.granular || null,
        fertirriego: project.fertirriego || null,
        hidroponia: project.hidroponia || (project.sections && project.sections.hidroponia) || null,
        vpdAnalysis: project.vpdAnalysis || null,
        analyses: {
          soil: project.soilAnalyses || [],
          solucionNutritiva: project.solucionNutritivaAnalyses || [],
          extractoPasta: project.extractoPastaAnalyses || [],
          agua: project.aguaAnalyses || [],
          foliar: project.foliarAnalyses || [],
          fruta: project.frutaAnalyses || []
        }
      }
    };
  }
}

// 🚀 EXPONER FUNCIONES DE DIAGNÓSTICO GLOBALMENTE
// Para que puedas probar desde la consola del navegador
if (typeof window !== 'undefined') {
  window.diagnoseProjectStorage = function() {
    if (window.projectStorage) {
      const diagnostics = window.projectStorage.diagnose();
      console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE GUARDADO:', diagnostics);
      return diagnostics;
    } else {
      console.error('❌ projectStorage no está disponible');
      return null;
    }
  };

  window.verifySection = function(section, projectId) {
    if (window.projectStorage) {
      const result = window.projectStorage.verifySection(section, projectId);
      console.log(`🔍 VERIFICACIÓN DE SECCIÓN '${section}':`, result);
      return result;
    } else {
      console.error('❌ projectStorage no está disponible');
      return null;
    }
  };

  console.log('✅ Funciones de diagnóstico disponibles:');
  console.log('  - window.diagnoseProjectStorage() - Diagnóstico completo');
  console.log('  - window.verifySection("location", projectId) - Verificar sección específica');
}

// Crear instancia global
console.log('📦 project-storage.js: Creando instancia global...');
try {
window.projectStorage = new ProjectStorage();
  console.log('✅ projectStorage inicializado correctamente');
  console.log('✅ window.projectStorage disponible:', typeof window.projectStorage !== 'undefined');
} catch (e) {
  console.error('❌ ERROR al inicializar projectStorage:', e);
  console.error('Stack trace:', e.stack);
  // Intentar crear una instancia básica como fallback
  window.projectStorage = null;
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectStorage;
}





