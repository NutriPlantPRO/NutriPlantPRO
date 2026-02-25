/* ===== PRESERVADOR DE LOCATION - SISTEMA CENTRALIZADO ===== */
/* 
 * Esta función SIEMPRE preserva location cuando se escribe a localStorage
 * ÚSALA en TODOS los lugares donde se escribe a localStorage con nutriplant_project_*
 */

/**
 * Guarda datos en localStorage preservando SIEMPRE location
 * @param {string} projectId - ID del proyecto
 * @param {Function} updater - Función que recibe el objeto y lo modifica
 * @returns {boolean} - true si se guardó correctamente
 */
function saveWithLocationPreservation(projectId, updater) {
  if (!projectId) {
    console.warn('⚠️ saveWithLocationPreservation: No hay projectId');
    return false;
  }
  
  try {
    const key = `nutriplant_project_${projectId}`;
    const raw = localStorage.getItem(key);
    let projectData = raw ? JSON.parse(raw) : {};
    
    // 🚀 CRÍTICO: Preservar location ANTES de cualquier actualización
    const existingLocation = projectData.location;
    const hasValidLocation = existingLocation && 
                            existingLocation.polygon && 
                            Array.isArray(existingLocation.polygon) && 
                            existingLocation.polygon.length >= 3;
    
    if (hasValidLocation) {
      console.log('🔒 Location detectado - preservando automáticamente', {
        polygonPoints: existingLocation.polygon.length,
        projectId: existingLocation.projectId || projectId
      });
    }
    
    // Ejecutar la función de actualización
    updater(projectData);
    
    // 🚀 CRÍTICO: SIEMPRE restaurar location después de actualizar
    if (hasValidLocation) {
      projectData.location = existingLocation;
      console.log('✅ Location preservado automáticamente');
    }
    
    // Guardar en localStorage
    localStorage.setItem(key, JSON.stringify(projectData));
    return true;
  } catch (e) {
    console.error('❌ Error en saveWithLocationPreservation:', e);
    return false;
  }
}

// Exponer globalmente
window.saveWithLocationPreservation = saveWithLocationPreservation;





















































