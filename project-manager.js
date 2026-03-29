/* ===== GESTIÓN DE PROYECTOS NUTRIPLANT PRO ===== */

class ProjectManager {
  constructor() {
    this.currentProject = null;
    this.init();
  }

  // Parse seguro para datos de proyecto en localStorage
  parseProjectObject(raw, context = '') {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
    // Solo aceptar objetos JSON
    if (!trimmed.startsWith('{')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      if (context) {
        console.warn(`⚠️ JSON inválido en ${context}:`, error.message);
      }
      return null;
    }
  }

  init() {
    // Cargar proyecto actual al inicializar
    this.loadCurrentProject();
  }

  // Obtener proyecto actual
  getCurrentProject() {
    // Buscar el proyecto seleccionado en la lista de proyectos
    const selectedProject = this.getSelectedProjectFromList();
    if (selectedProject) {
      this.currentProject = selectedProject;
      return selectedProject;
    }

    // Fallback: buscar en la interfaz de ubicación
    const titleCard = document.querySelector('.sb-title-card .text');
    if (titleCard) {
      const projectName = titleCard.textContent.trim();
      if (projectName && projectName !== 'Proyecto') {
        this.currentProject = {
          id: projectName.toLowerCase().replace(/\s+/g, '-'),
          name: projectName
        };
        return this.currentProject;
      }
    }
    return null;
  }

  // Obtener proyecto seleccionado de la lista en Inicio
  getSelectedProjectFromList() {
    // Buscar la tarjeta de proyecto seleccionada
    const selectedCard = document.querySelector('.np-project-card.selected');
    if (selectedCard) {
      const projectId = selectedCard.getAttribute('data-id');
      const projectName = selectedCard.querySelector('.np-title')?.textContent?.trim();
      
      if (projectId && projectName) {
        return {
          id: projectId,
          name: projectName
        };
      }
    }

    // Buscar por el ID guardado en localStorage
    const currentProjectId = this.getCurrentProjectId();
    if (currentProjectId) {
      const projects = this.getAllProjects();
      const project = projects.find(p => p.id === currentProjectId);
      if (project) {
        return {
          id: project.id,
          name: project.name
        };
      }
    }

    return null;
  }

  // Obtener ID del proyecto actual guardado
  getCurrentProjectId() {
    try {
      return localStorage.getItem('nutriplant-current-project') || '';
    } catch (e) {
      if (this.currentProject && this.currentProject.id) return this.currentProject.id;
      try { return sessionStorage.getItem('nutriplant-current-project-fallback') || ''; } catch (err) { return ''; }
    }
  }

  // Establecer proyecto actual
  setCurrentProject(projectId, projectName) {
    try {
      localStorage.setItem('nutriplant-current-project', projectId);
    } catch (e) {
      console.warn('No se pudo persistir nutriplant-current-project:', e && e.message ? e.message : e);
      try {
        if (typeof window !== 'undefined' && typeof window.np_tryRelieveLocalStoragePressure === 'function') {
          window.np_tryRelieveLocalStoragePressure();
          localStorage.setItem('nutriplant-current-project', projectId);
        }
      } catch (retryErr) {}
      try { sessionStorage.setItem('nutriplant-current-project-fallback', projectId || ''); } catch (err) {}
    }
    this.currentProject = {
      id: projectId,
      name: projectName
    };
    
    // Recargar datos del proyecto cuando se cambia
    setTimeout(() => {
      // Si estamos en la sección de ubicación, recargar el mapa
      if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap) {
        nutriPlantMap.loadProjectLocation();
      }
    }, 100);
    this.notifyProjectChange();
  }

  // Guardar datos de cualquier sección
  saveProjectData(section, data) {
    const project = this.getCurrentProject();
    if (!project) {
      console.warn('No hay proyecto seleccionado');
      return false;
    }

    try {
      // Obtener datos existentes del proyecto
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const projectKey = `nutriplant_project_${project.id}`;
      const existingData = localStorage.getItem(projectKey);
      let projectData = this.parseProjectObject(existingData, projectKey) || {};

      // Actualizar la sección específica
      projectData[section] = {
        ...data,
        lastUpdated: new Date().toISOString(),
        section: section
      };

      // Guardar en localStorage
      localStorage.setItem(projectKey, JSON.stringify(projectData));
      
      console.log(`Datos guardados en ${project.name} - Sección: ${section}`);
      return true;
    } catch (error) {
      console.error('Error al guardar datos del proyecto:', error);
      return false;
    }
  }

  // Cargar datos de cualquier sección
  loadProjectData(section) {
    const project = this.getCurrentProject();
    if (!project) {
      return null;
    }

    try {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const projectKey = `nutriplant_project_${project.id}`;
      const projectDataRaw = localStorage.getItem(projectKey);
      const projectData = this.parseProjectObject(projectDataRaw, projectKey);
      if (projectData) {
        return projectData[section] || null;
      }
      return null;
    } catch (error) {
      console.error('Error al cargar datos del proyecto:', error);
      return null;
    }
  }

  // Obtener todos los datos del proyecto
  getAllProjectData() {
    const project = this.getCurrentProject();
    if (!project) {
      return null;
    }

    try {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const projectKey = `nutriplant_project_${project.id}`;
      const projectDataRaw = localStorage.getItem(projectKey);
      return this.parseProjectObject(projectDataRaw, projectKey) || {};
    } catch (error) {
      console.error('Error al cargar todos los datos del proyecto:', error);
      return {};
    }
  }

  // Cambiar proyecto
  switchProject(projectId, projectName) {
    this.currentProject = {
      id: projectId,
      name: projectName
    };
    
    // Notificar cambio de proyecto
    this.notifyProjectChange();
    
    console.log(`Cambiado a proyecto: ${projectName}`);
  }

  // Notificar cambio de proyecto
  notifyProjectChange() {
    // Disparar evento personalizado
    const event = new CustomEvent('projectChanged', {
      detail: { project: this.currentProject }
    });
    document.dispatchEvent(event);
  }

  // Cargar proyecto actual desde la interfaz
  loadCurrentProject() {
    const project = this.getCurrentProject();
    if (project) {
      this.currentProject = project;
      this.notifyProjectChange();
    }
  }

  // Verificar si hay datos en una sección
  hasSectionData(section) {
    const data = this.loadProjectData(section);
    return data !== null && Object.keys(data).length > 0;
  }

  // Obtener resumen del proyecto
  getProjectSummary() {
    const project = this.getCurrentProject();
    if (!project) return null;

    const allData = this.getAllProjectData();
    const sections = ['ubicacion', 'fertirriego', 'hidroponia', 'analisis', 'reportes'];
    
    const summary = {
      project: project,
      sections: {}
    };

    sections.forEach(section => {
      summary.sections[section] = {
        hasData: this.hasSectionData(section),
        lastUpdated: allData[section]?.lastUpdated || null
      };
    });

    return summary;
  }

  // Limpiar datos de una sección
  clearSectionData(section) {
    const project = this.getCurrentProject();
    if (!project) return false;

    try {
      // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
      const projectKey = `nutriplant_project_${project.id}`;
      const existingData = localStorage.getItem(projectKey);
      let projectData = this.parseProjectObject(existingData, projectKey) || {};

      // Eliminar la sección
      delete projectData[section];

      // Guardar datos actualizados
      localStorage.setItem(projectKey, JSON.stringify(projectData));
      
      console.log(`Datos eliminados de ${project.name} - Sección: ${section}`);
      return true;
    } catch (error) {
      console.error('Error al limpiar datos del proyecto:', error);
      return false;
    }
  }

  // Obtener lista de todos los proyectos
  getAllProjects() {
    const projects = [];
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      // 🔒 BUSCAR AMBOS FORMATOS: nuevo y legacy (para compatibilidad con proyectos antiguos)
      if (key.startsWith('nutriplant_project_') || key.startsWith('nutriplant-project-')) {
        try {
          // Excluir claves auxiliares que no son objetos de proyecto
          if (key === 'nutriplant_project_sort_mode') {
            return;
          }
          // Normalizar: extraer ID de cualquier formato
          const projectId = key.replace(/^nutriplant[-_]project[-_]/, '');
          const projectData = this.parseProjectObject(localStorage.getItem(key), key);
          if (!projectData) {
            return;
          }
          
          // Buscar el nombre del proyecto en los datos
          const projectName = projectData.projectName || projectId.replace(/-/g, ' ');
          
          projects.push({
            id: projectId,
            name: projectName,
            lastUpdated: projectData.lastUpdated || null
          });
        } catch (error) {
          console.error('Error al procesar proyecto:', key, error);
        }
      }
    });
    
    return projects;
  }
}

// Crear instancia global
window.projectManager = new ProjectManager();

// Exportar para uso en otros archivos
window.ProjectManager = ProjectManager;
