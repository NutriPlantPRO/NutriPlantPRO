// Script para verificar datos VPD en localStorage
console.log('🔍 Verificando datos VPD en proyectos...\n');

const projects = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('nutriplant_project_')) {
    try {
      const projectId = key.replace('nutriplant_project_', '');
      const data = JSON.parse(localStorage.getItem(key));
      
      if (data.vpdAnalysis) {
        const hasVPDData = (
          (data.vpdAnalysis.environmental && data.vpdAnalysis.environmental.vpd !== null) ||
          (data.vpdAnalysis.advanced && data.vpdAnalysis.advanced.vpd !== null) ||
          (data.vpdAnalysis.history && Array.isArray(data.vpdAnalysis.history) && data.vpdAnalysis.history.length > 0)
        );
        
        if (hasVPDData) {
          projects.push({
            id: projectId,
            name: data.name || 'Sin nombre',
            vpdHistoryCount: data.vpdAnalysis.history ? data.vpdAnalysis.history.length : 0,
            hasEnvironmental: !!(data.vpdAnalysis.environmental && data.vpdAnalysis.environmental.vpd !== null),
            hasAdvanced: !!(data.vpdAnalysis.advanced && data.vpdAnalysis.advanced.vpd !== null),
            environmentalVPD: data.vpdAnalysis.environmental?.vpd,
            advancedVPD: data.vpdAnalysis.advanced?.vpd
          });
        }
      }
    } catch (e) {
      // Ignorar errores
    }
  }
}

console.log(`📊 Proyectos con datos VPD: ${projects.length}\n`);
projects.forEach(p => {
  console.log(`Proyecto: ${p.name} (${p.id})`);
  console.log(`  - Historial: ${p.vpdHistoryCount} cálculos`);
  console.log(`  - Environmental VPD: ${p.environmentalVPD || 'N/A'}`);
  console.log(`  - Advanced VPD: ${p.advancedVPD || 'N/A'}`);
  console.log('');
});

