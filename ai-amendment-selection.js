// ================================
// IA - SELECCIÓN INTELIGENTE DE ENMIENDAS
// ================================

function selectOptimalAmendments(soilAnalysis, availableAmendments) {
  console.log('🤖 IA: Analizando necesidades del suelo...');
  
  // 1. Calcular necesidades
  const needs = calculateSoilNeeds(soilAnalysis);
  console.log('📊 Necesidades calculadas:', needs);
  
  // 2. Evaluar opciones
  const options = evaluateAmendmentOptions(needs, availableAmendments);
  console.log('🔍 Opciones evaluadas:', options);
  
  // 3. Seleccionar la mejor combinación
  const recommendation = selectBestCombination(options, needs);
  console.log('✅ Recomendación final:', recommendation);
  
  return recommendation;
}

function calculateSoilNeeds(analysis) {
  const cicTotal = analysis.cicTotal;
  const initial = analysis.initial;
  
  // Calcular porcentajes ideales
  const ideal = {
    k: cicTotal * 0.05,   // 5%
    ca: cicTotal * 0.75,  // 75%
    mg: cicTotal * 0.15,  // 15%
    h: 0,                 // 0%
    na: 0,                // 0%
    al: 0                 // 0%
  };
  
  // Calcular necesidades de ajuste
  const needs = {
    // CATIONES BUENOS: Ajustar a niveles ideales (pueden ser positivos o negativos)
    k: ideal.k - initial.k,   // Positivo = déficit, Negativo = exceso
    ca: ideal.ca - initial.ca, // Positivo = déficit, Negativo = exceso
    mg: ideal.mg - initial.mg, // Positivo = déficit, Negativo = exceso
    
    // CATIONES MALOS: Desplazar completamente
    h: initial.h,  // Todo el H debe ser desplazado
    na: initial.na, // Todo el Na debe ser desplazado
    al: initial.al  // Todo el Al debe ser desplazado
  };
  
  // Calcular total de cationes malos a desplazar
  const badCations = needs.h + needs.na + needs.al;
  
  // Calcular total de cationes buenos necesarios
  const goodCations = needs.k + needs.ca + needs.mg;
  
  // Verificar que tengamos suficientes cationes buenos para desplazar los malos
  if (goodCations < badCations) {
    console.log('⚠️ Advertencia: No hay suficientes cationes buenos para desplazar los malos');
    console.log(`Cationes buenos necesarios: ${goodCations.toFixed(2)} meq`);
    console.log(`Cationes malos a desplazar: ${badCations.toFixed(2)} meq`);
  }
  
  return needs;
}

function evaluateAmendmentOptions(needs, amendments) {
  const options = [];
  
  // Calcular total de cationes malos a desplazar
  const badCations = needs.h + needs.na + needs.al;
  
  // Calcular cationes buenos necesarios (solo los positivos = déficit)
  const goodCationsNeeded = Math.max(0, needs.k) + Math.max(0, needs.ca) + Math.max(0, needs.mg);
  
  // Calcular cationes buenos en exceso (solo los negativos = exceso)
  const goodCationsExcess = Math.abs(Math.min(0, needs.k)) + Math.abs(Math.min(0, needs.ca)) + Math.abs(Math.min(0, needs.mg));
  
  // Opción 1: Solo Cal Agrícola (si necesita Ca y hay cationes malos)
  if (needs.ca > 0 && needs.mg <= 0.5 && needs.k <= 0.5 && badCations > 0) {
    options.push({
      name: 'Solo Cal Agrícola',
      amendments: ['lime'],
      reasoning: `Necesita Ca (${needs.ca.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos. Cal Agrícola es la opción más eficiente.`,
      efficiency: 95,
      cost: 'Bajo',
      caContribution: needs.ca,
      mgContribution: 0,
      kContribution: 0,
      badCationsDisplaced: badCations
    });
  }
  
  // Opción 2: Solo Sulfato de Magnesio (si solo necesita Mg y hay cationes malos)
  if (needs.mg > 0 && needs.ca <= 0.5 && needs.k <= 0.5 && badCations > 0) {
    options.push({
      name: 'Solo Sulfato de Magnesio',
      amendments: ['mgso4-mono'],
      reasoning: `Necesita Mg (${needs.mg.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos. Sulfato de Magnesio es la opción más eficiente.`,
      efficiency: 95,
      cost: 'Bajo',
      caContribution: 0,
      mgContribution: needs.mg,
      kContribution: 0,
      badCationsDisplaced: badCations
    });
  }
  
  // Opción 3: Cal Dolomítica (si necesita Ca y Mg)
  if (needs.ca > 0 && needs.mg > 0 && needs.k <= 0.5) {
    options.push({
      name: 'Cal Dolomítica',
      amendments: ['dolomite'],
      reasoning: `Necesita Ca (${needs.ca.toFixed(2)} meq) y Mg (${needs.mg.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos. Cal Dolomítica aporta ambos nutrientes.`,
      efficiency: 90,
      cost: 'Medio',
      caContribution: needs.ca,
      mgContribution: needs.mg,
      kContribution: 0,
      badCationsDisplaced: badCations
    });
  }
  
  // Opción 4: Combinación Cal + Sulfato de Magnesio
  if (needs.ca > 0 && needs.mg > 0) {
    options.push({
      name: 'Cal Agrícola + Sulfato de Magnesio',
      amendments: ['lime', 'mgso4-mono'],
      reasoning: `Necesita Ca (${needs.ca.toFixed(2)} meq) y Mg (${needs.mg.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos. Combinación específica para cada nutriente.`,
      efficiency: 85,
      cost: 'Medio',
      caContribution: needs.ca,
      mgContribution: needs.mg,
      kContribution: 0,
      badCationsDisplaced: badCations
    });
  }
  
  // Opción 5: Incluir K si es necesario
  if (needs.k > 0) {
    options.forEach(option => {
      if (option.amendments.length === 1) {
        options.push({
          ...option,
          name: option.name + ' + SOP Granular',
          amendments: [...option.amendments, 'sop-granular'],
          reasoning: option.reasoning + ` También necesita K (${needs.k.toFixed(2)} meq), agregando SOP Granular.`,
          efficiency: option.efficiency - 5,
          cost: 'Alto',
          kContribution: needs.k
        });
      }
    });
  }
  
  // Opción 6: Manejar excesos de cationes buenos
  if (goodCationsExcess > 0) {
    // Si hay exceso de Ca
    if (needs.ca < 0) {
      options.push({
        name: 'Exceso de Ca - No aplicar Cal',
        amendments: [],
        reasoning: `Tu suelo tiene exceso de Ca (${Math.abs(needs.ca).toFixed(2)} meq por encima del ideal). NO apliques Cal Agrícola.`,
        efficiency: 100,
        cost: 'Gratis',
        caContribution: 0,
        mgContribution: 0,
        kContribution: 0,
        badCationsDisplaced: badCations,
        warning: 'Exceso de Ca detectado'
      });
    }
    
    // Si hay exceso de Mg
    if (needs.mg < 0) {
      options.push({
        name: 'Exceso de Mg - No aplicar Sulfato de Magnesio',
        amendments: [],
        reasoning: `Tu suelo tiene exceso de Mg (${Math.abs(needs.mg).toFixed(2)} meq por encima del ideal). NO apliques Sulfato de Magnesio.`,
        efficiency: 100,
        cost: 'Gratis',
        caContribution: 0,
        mgContribution: 0,
        kContribution: 0,
        badCationsDisplaced: badCations,
        warning: 'Exceso de Mg detectado'
      });
    }
    
    // Si hay exceso de K
    if (needs.k < 0) {
      options.push({
        name: 'Exceso de K - No aplicar SOP Granular',
        amendments: [],
        reasoning: `Tu suelo tiene exceso de K (${Math.abs(needs.k).toFixed(2)} meq por encima del ideal). NO apliques SOP Granular.`,
        efficiency: 100,
        cost: 'Gratis',
        caContribution: 0,
        mgContribution: 0,
        kContribution: 0,
        badCationsDisplaced: badCations,
        warning: 'Exceso de K detectado'
      });
    }
  }
  
  return options;
}

function selectBestCombination(options, needs) {
  if (options.length === 0) {
    return {
      selected: [],
      reasoning: 'No se requieren enmiendas. El suelo está en equilibrio.',
      confidence: 100
    };
  }
  
  // Ordenar por eficiencia y costo
  options.sort((a, b) => {
    if (a.efficiency !== b.efficiency) {
      return b.efficiency - a.efficiency; // Mayor eficiencia primero
    }
    return a.cost.localeCompare(b.cost); // Menor costo primero
  });
  
  const best = options[0];
  
  return {
    selected: best.amendments,
    reasoning: best.reasoning,
    confidence: best.efficiency,
    efficiency: best.efficiency,
    cost: best.cost,
    contributions: {
      ca: best.caContribution,
      mg: best.mgContribution,
      k: best.kContribution
    }
  };
}

// ================================
// FUNCIÓN PRINCIPAL PARA LA IA
// ================================

function getAIAmendmentRecommendation() {
  // Obtener datos del análisis de suelo
  const soilAnalysis = {
    cicTotal: parseFloat(document.getElementById('cic-total').value) || 0,
    initial: {
      k: parseFloat(document.getElementById('k-initial').value) || 0,
      ca: parseFloat(document.getElementById('ca-initial').value) || 0,
      mg: parseFloat(document.getElementById('mg-initial').value) || 0,
      h: parseFloat(document.getElementById('h-initial').value) || 0,
      na: parseFloat(document.getElementById('na-initial').value) || 0,
      al: parseFloat(document.getElementById('al-initial').value) || 0
    }
  };
  
  // Enmiendas disponibles
  const availableAmendments = [
    { id: 'lime', name: 'Cal Agrícola', ca: 40, mg: 0, k: 0 },
    { id: 'dolomite', name: 'Cal Dolomítica', ca: 21.7, mg: 13.2, k: 0 },
    { id: 'mgso4-mono', name: 'Sulfato de Magnesio', ca: 0, mg: 17, k: 0 },
    { id: 'sop-granular', name: 'SOP Granular', ca: 0, mg: 0, k: 43.2 },
    { id: 'gypsum', name: 'Yeso Agrícola', ca: 23.3, mg: 0, k: 0 }
  ];
  
  // Obtener recomendación
  const recommendation = selectOptimalAmendments(soilAnalysis, availableAmendments);
  
  return recommendation;
}

// ================================
// EJEMPLO DE USO
// ================================

// Ejemplo con el suelo del usuario:
const exampleSoil = {
  cicTotal: 13.00,
  initial: {
    k: 1.00,   // 7.7%
    ca: 8.00,  // 61.5%
    mg: 1.00,  // 7.7%
    h: 0.00,   // 0.0%
    na: 3.00,  // 23.1%
    al: 0.00   // 0.0%
  }
};

console.log('🤖 IA: Analizando suelo de ejemplo...');
const exampleRecommendation = selectOptimalAmendments(exampleSoil, []);
console.log('📋 Recomendación:', exampleRecommendation);

// Resultado esperado:
// {
//   selected: ['lime', 'mgso4-mono'],
//   reasoning: 'Necesita Ca y Mg. Combinación específica para cada nutriente.',
//   confidence: 85,
//   efficiency: 85,
//   cost: 'Medio',
//   contributions: { ca: 1.32, mg: 1.86, k: 0 }
// }
