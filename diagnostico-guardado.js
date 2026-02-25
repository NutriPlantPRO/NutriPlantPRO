// SCRIPT DE DIAGNÓSTICO PARA EL GUARDADO
// Ejecuta esto en la consola del navegador (F12) para diagnosticar el problema

console.log('🔍 INICIANDO DIAGNÓSTICO DE GUARDADO...\n');

// 1. Verificar proyecto actual
const projectId = localStorage.getItem('nutriplant-current-project') || 
                  (window.projectManager && window.projectManager.getCurrentProject ? window.projectManager.getCurrentProject().id : null);
console.log('1️⃣ Proyecto actual:', projectId);

if (!projectId) {
  console.error('❌ NO HAY PROYECTO SELECCIONADO');
} else {
  // 2. Verificar datos guardados en localStorage
  const unifiedKey = `nutriplant_project_${projectId}`;
  const raw = localStorage.getItem(unifiedKey);
  
  if (raw) {
    const data = JSON.parse(raw);
    console.log('2️⃣ Datos en localStorage (unificado):', data);
    
    // Verificar Granular
    if (data.granular && data.granular.requirements) {
      const req = data.granular.requirements;
      console.log('3️⃣ GRANULAR - Datos guardados:');
      console.log('   - Cultivo:', req.cropType);
      console.log('   - Rendimiento:', req.targetYield);
      console.log('   - Ajustes:', req.adjustment);
      console.log('   - Eficiencias:', req.efficiency);
      console.log('   - isUserSaved:', req.isUserSaved);
      
      // Verificar si hay valores en los inputs
      const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
      console.log('\n4️⃣ GRANULAR - Valores en inputs del DOM:');
      nutrients.forEach(n => {
        const adj = document.getElementById(`granular-adj-${n}`);
        const eff = document.getElementById(`granular-eff-${n}`);
        if (adj || eff) {
          console.log(`   ${n}:`, {
            ajusteGuardado: req.adjustment ? req.adjustment[n] : 'NO',
            ajusteEnDOM: adj ? adj.value : 'NO EXISTE',
            eficienciaGuardada: req.efficiency ? req.efficiency[n] : 'NO',
            eficienciaEnDOM: eff ? eff.value : 'NO EXISTE'
          });
        }
      });
    } else {
      console.warn('⚠️ GRANULAR - No hay datos guardados');
    }
    
    // Verificar Fertirriego
    if (data.fertirriego && data.fertirriego.requirements) {
      const req = data.fertirriego.requirements;
      console.log('\n5️⃣ FERTIRRIEGO - Datos guardados:');
      console.log('   - Cultivo:', req.cropType);
      console.log('   - Rendimiento:', req.targetYield);
      console.log('   - Ajustes:', req.adjustment);
      console.log('   - Eficiencias:', req.efficiency);
      
      // Verificar si hay valores en los inputs
      const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
      console.log('\n6️⃣ FERTIRRIEGO - Valores en inputs del DOM:');
      nutrients.forEach(n => {
        const adj = document.getElementById(`adj-${n}`);
        const eff = document.getElementById(`eff-${n}`);
        if (adj || eff) {
          console.log(`   ${n}:`, {
            ajusteGuardado: req.adjustment ? req.adjustment[n] : 'NO',
            ajusteEnDOM: adj ? adj.value : 'NO EXISTE',
            eficienciaGuardada: req.efficiency ? req.efficiency[n] : 'NO',
            eficienciaEnDOM: eff ? eff.value : 'NO EXISTE'
          });
        }
      });
    } else {
      console.warn('⚠️ FERTIRRIEGO - No hay datos guardados');
    }
  } else {
    console.error('❌ NO HAY DATOS EN localStorage');
  }
  
  // 7. Verificar funciones disponibles
  console.log('\n7️⃣ Funciones disponibles:');
  console.log('   - saveGranularRequirements:', typeof window.saveGranularRequirements);
  console.log('   - saveGranularRequirementsImmediate:', typeof window.saveGranularRequirementsImmediate);
  console.log('   - loadGranularRequirements:', typeof window.loadGranularRequirements);
  console.log('   - saveFertirriegoRequirements:', typeof window.saveFertirriegoRequirements);
  console.log('   - loadFertirriegoRequirements:', typeof window.loadFertirriegoRequirements);
}

console.log('\n✅ DIAGNÓSTICO COMPLETADO');
console.log('📋 INSTRUCCIONES:');
console.log('1. Modifica algunos valores de ajuste/eficiencia');
console.log('2. Cambia de pestaña (Requerimiento ↔ Programa)');
console.log('3. Regresa a la pestaña original');
console.log('4. Ejecuta este script de nuevo para ver si los valores se mantuvieron');



























































