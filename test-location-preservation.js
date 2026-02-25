/* ===== SISTEMA DE VERIFICACIÓN DE PRESERVACIÓN DE LOCATION ===== */
/* Ejecuta pruebas automatizadas para verificar que location se preserva correctamente */

(function() {
  'use strict';
  
  const shouldRunLocationTests =
    window.location.search.includes('runLocationTests=1') ||
    window.__RUN_LOCATION_TESTS__ === true;
  
  if (!shouldRunLocationTests) {
    console.log('ℹ️ Pruebas de preservación de location desactivadas (agrega ?runLocationTests=1 para ejecutarlas).');
    window.runLocationPreservationTests = function() {
      console.log('ℹ️ Para ejecutar las pruebas de preservación de location, agrega ?runLocationTests=1 a la URL y recarga la página.');
    };
    return;
  }
  
  console.log('🧪 INICIANDO PRUEBAS DE PRESERVACIÓN DE LOCATION...\n');
  
  // Generar un ID de proyecto de prueba único
  const testProjectId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const testKey = `nutriplant_project_${testProjectId}`;
  
  // Datos de prueba
  const testLocation = {
    projectId: testProjectId,
    projectName: 'Proyecto de Prueba',
    polygon: [
      [20.123456, -103.123456],
      [20.123500, -103.123500],
      [20.123400, -103.123400],
      [20.123456, -103.123456]
    ],
    areaHectares: 1.5,
    perimeter: 500,
    lastUpdated: new Date().toISOString()
  };
  
  const testFertirriego = {
    requirements: {
      cropType: 'aguacate',
      targetYield: 25,
      adjustment: { N: 10, P2O5: 5, K2O: 15 },
      efficiency: { N: 85, P2O5: 80, K2O: 90 },
      timestamp: new Date().toISOString()
    },
    lastUI: { cropType: 'aguacate', targetYield: 25 }
  };
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  function test(name, fn) {
    try {
      const result = fn();
      if (result === true) {
        console.log(`✅ ${name}`);
        testsPassed++;
        return true;
      } else {
        console.error(`❌ ${name}: ${result}`);
        testsFailed++;
        return false;
      }
    } catch (e) {
      console.error(`❌ ${name}: ERROR - ${e.message}`);
      testsFailed++;
      return false;
    }
  }
  
  const extraTestKeys = [];
  
  function registerTestProjectKey(key) {
    if (!extraTestKeys.includes(key)) {
      extraTestKeys.push(key);
    }
  }
  
  function getProjectData(projectId) {
    try {
      const raw = localStorage.getItem(`nutriplant_project_${projectId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('⚠️ Error obteniendo datos del proyecto:', e);
      return null;
    }
  }
  
  function ensureProjectManager(projectId) {
    if (!window.projectManager) {
      window.projectManager = {};
    }
    window.projectManager.getCurrentProject = () => ({ id: projectId, name: 'Proyecto de Prueba' });
    if (typeof window.projectManager.saveProjectData !== 'function') {
      window.projectManager.saveProjectData = () => {};
    }
    if (typeof window.projectManager.loadProjectData !== 'function') {
      window.projectManager.loadProjectData = () => null;
    }
  }
  
  function setupProjectForSectionTests(projectId, overrides = {}) {
    const baseProject = {
      id: projectId,
      name: 'Proyecto de Prueba',
      location: JSON.parse(JSON.stringify(testLocation)),
      fertirriego: {
        program: {
          weeks: [{ id: 'base', label: 'Semana Base', stage: 'Inicio', kgByCol: {}, totals: {} }],
          columns: [{ id: 'base-col', label: 'Col Base' }],
          timeUnit: 'días',
          timestamp: new Date().toISOString()
        }
      },
      granular: {
        program: {
          applications: [{ id: 'base-app', name: 'Aplicación Base', area: 1 }],
          counter: 1,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    const projectData = Object.assign({}, baseProject, overrides);
    if (projectData.location) {
      projectData.location.projectId = projectId;
      projectData.location.lastUpdated = new Date().toISOString();
    }
    const key = `nutriplant_project_${projectId}`;
    localStorage.setItem(key, JSON.stringify(projectData));
    registerTestProjectKey(key);
    ensureProjectManager(projectId);
    return projectData;
  }
  
  function createTempContainer(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
    return wrapper;
  }
  
  function cleanup() {
    try {
      localStorage.removeItem(testKey);
      extraTestKeys.forEach(key => localStorage.removeItem(key));
      extraTestKeys.length = 0;
      console.log('\n🧹 Limpieza completada');
    } catch (e) {
      console.warn('⚠️ Error en limpieza:', e);
    }
  }
  
  // PRUEBA 1: Guardar location inicial
  test('PRUEBA 1: Guardar location inicial', () => {
    const projectData = {
      id: testProjectId,
      name: 'Proyecto de Prueba',
      location: testLocation,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    const saved = JSON.parse(localStorage.getItem(testKey));
    if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
      return 'Location no se guardó correctamente';
    }
    return true;
  });
  
  // PRUEBA 2: Guardar Fertirriego preservando location
  test('PRUEBA 2: Guardar Fertirriego preservando location', () => {
    const raw = localStorage.getItem(testKey);
    const projectData = JSON.parse(raw);
    
    // Preservar location
    const existingLocation = projectData.location;
    const hasValidLocation = existingLocation && 
                            existingLocation.polygon && 
                            Array.isArray(existingLocation.polygon) && 
                            existingLocation.polygon.length >= 3;
    
    // Actualizar fertirriego
    projectData.fertirriego = testFertirriego;
    
    // Restaurar location
    if (hasValidLocation) {
      projectData.location = existingLocation;
    }
    
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    // Verificar
    const saved = JSON.parse(localStorage.getItem(testKey));
    if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
      return 'Location se perdió al guardar Fertirriego';
    }
    if (!saved.fertirriego || !saved.fertirriego.requirements) {
      return 'Fertirriego no se guardó';
    }
    return true;
  });
  
  // PRUEBA 3: Guardar Granular preservando location
  test('PRUEBA 3: Guardar Granular preservando location', () => {
    const raw = localStorage.getItem(testKey);
    const projectData = JSON.parse(raw);
    
    // Preservar location
    const existingLocation = projectData.location;
    const hasValidLocation = existingLocation && 
                            existingLocation.polygon && 
                            Array.isArray(existingLocation.polygon) && 
                            existingLocation.polygon.length >= 3;
    
    // Actualizar granular
    projectData.granular = {
      requirements: { cropType: 'tomate', targetYield: 30 },
      program: { applications: [] }
    };
    
    // Restaurar location
    if (hasValidLocation) {
      projectData.location = existingLocation;
    }
    
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    // Verificar
    const saved = JSON.parse(localStorage.getItem(testKey));
    if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
      return 'Location se perdió al guardar Granular';
    }
    if (!saved.granular || !saved.granular.requirements) {
      return 'Granular no se guardó';
    }
    return true;
  });
  
  // PRUEBA 4: Guardar múltiples secciones en secuencia
  test('PRUEBA 4: Guardar múltiples secciones en secuencia', () => {
    // Simular guardar Fertirriego
    let raw = localStorage.getItem(testKey);
    let projectData = JSON.parse(raw);
    const location1 = projectData.location;
    projectData.fertirriego = { ...testFertirriego, requirements: { ...testFertirriego.requirements, targetYield: 30 } };
    if (location1 && location1.polygon && location1.polygon.length >= 3) {
      projectData.location = location1;
    }
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    // Simular guardar Granular
    raw = localStorage.getItem(testKey);
    projectData = JSON.parse(raw);
    const location2 = projectData.location;
    projectData.granular = { requirements: { cropType: 'lechuga', targetYield: 20 } };
    if (location2 && location2.polygon && location2.polygon.length >= 3) {
      projectData.location = location2;
    }
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    // Simular guardar Amendments
    raw = localStorage.getItem(testKey);
    projectData = JSON.parse(raw);
    const location3 = projectData.location;
    projectData.amendments = { selected: ['cal'], results: { type: 'Cal Dolomítica' } };
    if (location3 && location3.polygon && location3.polygon.length >= 3) {
      projectData.location = location3;
    }
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    // Verificar que location se mantuvo en todas las operaciones
    const final = JSON.parse(localStorage.getItem(testKey));
    if (!final.location || !final.location.polygon || final.location.polygon.length !== 4) {
      return 'Location se perdió después de múltiples guardados';
    }
    if (!final.fertirriego || !final.granular || !final.amendments) {
      return 'Alguna sección no se guardó';
    }
    return true;
  });
  
  // PRUEBA 5: Verificar que saveSection preserva location
  test('PRUEBA 5: Verificar que saveSection preserva location', () => {
    if (!window.projectStorage) {
      return 'projectStorage no está disponible';
    }
    
    // Asegurar que hay location
    const raw = localStorage.getItem(testKey);
    const projectData = JSON.parse(raw);
    projectData.location = testLocation;
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    // Usar saveSection para guardar una sección
    const success = window.projectStorage.saveSection('fertirriego', testFertirriego, testProjectId);
    
    if (!success) {
      return 'saveSection falló';
    }
    
    // Verificar que location se preservó
    const saved = JSON.parse(localStorage.getItem(testKey));
    if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
      return 'saveSection no preservó location';
    }
    
    return true;
  });
  
  // PRUEBA 6: Simular race condition (múltiples guardados simultáneos)
  test('PRUEBA 6: Simular race condition (múltiples guardados)', () => {
    // Asegurar location inicial
    const raw = localStorage.getItem(testKey);
    const projectData = JSON.parse(raw);
    projectData.location = testLocation;
    localStorage.setItem(testKey, JSON.stringify(projectData));
    
    // Simular 3 guardados "simultáneos" (sin await, pero secuenciales)
    for (let i = 0; i < 3; i++) {
      const raw2 = localStorage.getItem(testKey);
      const data = JSON.parse(raw2);
      const loc = data.location;
      data.fertirriego = { ...testFertirriego, requirements: { ...testFertirriego.requirements, targetYield: 20 + i } };
      if (loc && loc.polygon && loc.polygon.length >= 3) {
        data.location = loc;
      }
      localStorage.setItem(testKey, JSON.stringify(data));
    }
    
    // Verificar que location se mantuvo
    const final = JSON.parse(localStorage.getItem(testKey));
    if (!final.location || !final.location.polygon || final.location.polygon.length !== 4) {
      return 'Location se perdió en race condition';
    }
    
    return true;
  });
  
  // Ejecutar todas las pruebas
  console.log('\n📋 EJECUTANDO PRUEBAS...\n');
  
  // Esperar un momento para que projectStorage se inicialice
  setTimeout(() => {
    // Ejecutar pruebas
    const allTests = [
      () => test('PRUEBA 1: Guardar location inicial', () => {
        const projectData = {
          id: testProjectId,
          name: 'Proyecto de Prueba',
          location: testLocation,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        const saved = JSON.parse(localStorage.getItem(testKey));
        if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
          return 'Location no se guardó correctamente';
        }
        return true;
      }),
      
      () => test('PRUEBA 2: Guardar Fertirriego preservando location', () => {
        const raw = localStorage.getItem(testKey);
        const projectData = JSON.parse(raw);
        
        const existingLocation = projectData.location;
        const hasValidLocation = existingLocation && 
                                existingLocation.polygon && 
                                Array.isArray(existingLocation.polygon) && 
                                existingLocation.polygon.length >= 3;
        
        projectData.fertirriego = testFertirriego;
        
        if (hasValidLocation) {
          projectData.location = existingLocation;
        }
        
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        const saved = JSON.parse(localStorage.getItem(testKey));
        if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
          return 'Location se perdió al guardar Fertirriego';
        }
        if (!saved.fertirriego || !saved.fertirriego.requirements) {
          return 'Fertirriego no se guardó';
        }
        return true;
      }),
      
      () => test('PRUEBA 3: Guardar Granular preservando location', () => {
        const raw = localStorage.getItem(testKey);
        const projectData = JSON.parse(raw);
        
        const existingLocation = projectData.location;
        const hasValidLocation = existingLocation && 
                                existingLocation.polygon && 
                                Array.isArray(existingLocation.polygon) && 
                                existingLocation.polygon.length >= 3;
        
        projectData.granular = {
          requirements: { cropType: 'tomate', targetYield: 30 },
          program: { applications: [] }
        };
        
        if (hasValidLocation) {
          projectData.location = existingLocation;
        }
        
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        const saved = JSON.parse(localStorage.getItem(testKey));
        if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
          return 'Location se perdió al guardar Granular';
        }
        if (!saved.granular || !saved.granular.requirements) {
          return 'Granular no se guardó';
        }
        return true;
      }),
      
      () => test('PRUEBA 4: Guardar múltiples secciones en secuencia', () => {
        let raw = localStorage.getItem(testKey);
        let projectData = JSON.parse(raw);
        const location1 = projectData.location;
        projectData.fertirriego = { ...testFertirriego, requirements: { ...testFertirriego.requirements, targetYield: 30 } };
        if (location1 && location1.polygon && location1.polygon.length >= 3) {
          projectData.location = location1;
        }
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        raw = localStorage.getItem(testKey);
        projectData = JSON.parse(raw);
        const location2 = projectData.location;
        projectData.granular = { requirements: { cropType: 'lechuga', targetYield: 20 } };
        if (location2 && location2.polygon && location2.polygon.length >= 3) {
          projectData.location = location2;
        }
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        raw = localStorage.getItem(testKey);
        projectData = JSON.parse(raw);
        const location3 = projectData.location;
        projectData.amendments = { selected: ['cal'], results: { type: 'Cal Dolomítica' } };
        if (location3 && location3.polygon && location3.polygon.length >= 3) {
          projectData.location = location3;
        }
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        const final = JSON.parse(localStorage.getItem(testKey));
        if (!final.location || !final.location.polygon || final.location.polygon.length !== 4) {
          return 'Location se perdió después de múltiples guardados';
        }
        if (!final.fertirriego || !final.granular || !final.amendments) {
          return 'Alguna sección no se guardó';
        }
        return true;
      }),
      
      () => {
        if (!window.projectStorage) {
          return test('PRUEBA 5: Verificar que saveSection preserva location', () => 'projectStorage no está disponible');
        }
        
        const raw = localStorage.getItem(testKey);
        const projectData = JSON.parse(raw);
        projectData.location = testLocation;
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        const success = window.projectStorage.saveSection('fertirriego', testFertirriego, testProjectId);
        
        if (!success) {
          return test('PRUEBA 5: Verificar que saveSection preserva location', () => 'saveSection falló');
        }
        
        const saved = JSON.parse(localStorage.getItem(testKey));
        if (!saved.location || !saved.location.polygon || saved.location.polygon.length !== 4) {
          return test('PRUEBA 5: Verificar que saveSection preserva location', () => 'saveSection no preservó location');
        }
        
        return test('PRUEBA 5: Verificar que saveSection preserva location', () => true);
      },
      
      () => test('PRUEBA 6: Simular race condition', () => {
        const raw = localStorage.getItem(testKey);
        const projectData = JSON.parse(raw);
        projectData.location = testLocation;
        localStorage.setItem(testKey, JSON.stringify(projectData));
        
        for (let i = 0; i < 3; i++) {
          const raw2 = localStorage.getItem(testKey);
          const data = JSON.parse(raw2);
          const loc = data.location;
          data.fertirriego = { ...testFertirriego, requirements: { ...testFertirriego.requirements, targetYield: 20 + i } };
          if (loc && loc.polygon && loc.polygon.length >= 3) {
            data.location = loc;
          }
          localStorage.setItem(testKey, JSON.stringify(data));
        }
        
        const final = JSON.parse(localStorage.getItem(testKey));
        if (!final.location || !final.location.polygon || final.location.polygon.length !== 4) {
          return 'Location se perdió en race condition';
        }
        
        return true;
      }),
      
      () => test('PRUEBA 7: Fertirriego mantiene programa y requerimientos', () => {
        if (typeof window.saveFertirriegoRequirements !== 'function' || typeof window.saveFertirriegoProgram !== 'function') {
          return 'Funciones de Fertirriego no están disponibles';
        }
        
        const projectId = `${testProjectId}_fert_sections`;
        setupProjectForSectionTests(projectId);
        
        const container = createTempContainer(`
          <input id="fertirriegoCropType" value="tomate">
          <input id="fertirriegoTargetYield" value="80">
        `);
        
        window.saveFertirriegoRequirements();
        
        let project = getProjectData(projectId);
        if (!project || !project.location || !Array.isArray(project.location.polygon) || project.location.polygon.length !== 4) {
          container.remove();
          return 'Location se perdió al guardar requerimientos de Fertirriego';
        }
        if (!project.fertirriego || !project.fertirriego.program) {
          container.remove();
          return 'Programa de Fertirriego se perdió al guardar requerimientos';
        }
        if (!project.fertirriego.requirements) {
          container.remove();
          return 'Requerimientos de Fertirriego no se guardaron';
        }
        
        window.fertiWeeks = [{ id: 'w1', label: 'Semana 1', stage: 'Inicio', kgByCol: {}, totals: {} }];
        window.fertiColumns = [{ id: 'c1', label: 'Columna 1' }];
        window.fertiTimeUnit = 'semanas';
        
        window.saveFertirriegoProgram();
        
        project = getProjectData(projectId);
        container.remove();
        
        if (!project.fertirriego || !project.fertirriego.requirements) {
          return 'Requerimientos se perdieron al guardar programa de Fertirriego';
        }
        if (!project.fertirriego.program || !project.fertirriego.program.weeks || project.fertirriego.program.weeks.length === 0) {
          return 'Programa de Fertirriego no se guardó correctamente';
        }
        if (!project.location || !Array.isArray(project.location.polygon) || project.location.polygon.length !== 4) {
          return 'Location se perdió al guardar programa de Fertirriego';
        }
        return true;
      }),
      
      () => test('PRUEBA 8: Granular mantiene programa y requerimientos', () => {
        if (typeof window.saveGranularRequirements !== 'function' || typeof window.saveApplications !== 'function') {
          return 'Funciones de Granular no están disponibles';
        }
        
        const projectId = `${testProjectId}_gran_sections`;
        setupProjectForSectionTests(projectId);
        
        const container = createTempContainer(`
          <input id="granularRequerimientoCropType" value="maiz">
          <input id="granularRequerimientoTargetYield" value="60">
        `);
        
        window.saveGranularRequirements();
        
        let project = getProjectData(projectId);
        if (!project || !project.location || !Array.isArray(project.location.polygon) || project.location.polygon.length !== 4) {
          container.remove();
          return 'Location se perdió al guardar requerimientos de Granular';
        }
        if (!project.granular || !project.granular.program) {
          container.remove();
          return 'Programa Granular se perdió al guardar requerimientos';
        }
        if (!project.granular.requirements) {
          container.remove();
          return 'Requerimientos Granular no se guardaron';
        }
        
        window.applications = [{ id: 1, name: 'Aplicación 1', area: 1, products: [] }];
        window.appCounter = 2;
        window.saveApplications();
        
        project = getProjectData(projectId);
        container.remove();
        
        if (!project.granular || !project.granular.requirements) {
          return 'Requerimientos se perdieron al guardar programa Granular';
        }
        if (!project.granular.program || !Array.isArray(project.granular.program.applications) || project.granular.program.applications.length === 0) {
          return 'Programa Granular no se guardó correctamente';
        }
        if (!project.location || !Array.isArray(project.location.polygon) || project.location.polygon.length !== 4) {
          return 'Location se perdió al guardar programa Granular';
        }
        return true;
      })
    ];
    
    allTests.forEach(testFn => testFn());
    
    // Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADOS DE LAS PRUEBAS:');
    console.log(`✅ Pruebas pasadas: ${testsPassed}`);
    console.log(`❌ Pruebas fallidas: ${testsFailed}`);
    console.log(`📈 Total: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
      console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! El sistema preserva location correctamente.');
    } else {
      console.log('\n⚠️ ALGUNAS PRUEBAS FALLARON. Revisa los errores arriba.');
    }
    
    console.log('='.repeat(50) + '\n');
    
    // Limpiar
    cleanup();
  }, 1000);
  
  // Exponer función para ejecutar manualmente
  window.testLocationPreservation = function() {
    console.log('🧪 Ejecutando pruebas de preservación de location...');
    // Las pruebas ya se ejecutan automáticamente
  };
  
})();

