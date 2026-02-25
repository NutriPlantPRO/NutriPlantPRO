// ================================
// IA - BASE DE CONOCIMIENTO: AJUSTE DE CIC Y ENMIENDAS
// ================================

const AI_AMENDMENT_KNOWLEDGE = {
  
  // ================================
  // CONCEPTOS FUNDAMENTALES
  // ================================
  
  concepts: {
    cic: {
      definition: "Capacidad de Intercambio Catiónico - medida de la capacidad del suelo para retener y liberar cationes",
      importance: "Fundamental para determinar la fertilidad y estructura del suelo",
      units: "meq/100g de suelo"
    },
    
    cations: {
      good: {
        k: { ideal: "5% del CIC", range: "3-8%", function: "Nutriente esencial para crecimiento y desarrollo" },
        ca: { ideal: "75% del CIC", range: "65-78%", function: "Estructura del suelo y disponibilidad de nutrientes" },
        mg: { ideal: "15% del CIC", range: "10-17%", function: "Componente de clorofila y activador enzimático" }
      },
      bad: {
        h: { ideal: "0% del CIC", problem: "Acidez del suelo", effect: "Reduce disponibilidad de nutrientes" },
        na: { ideal: "0% del CIC", problem: "Salinidad", effect: "Toxicidad y desestructuración del suelo" },
        al: { ideal: "0% del CIC", problem: "Toxicidad", effect: "Inhibe crecimiento radicular" }
      }
    },
    
    adjustment: {
      objective: "Equilibrar todos los cationes en la CIC para optimizar la fertilidad del suelo",
      strategy: "Ajustar cationes buenos (K, Ca, Mg) y desplazar cationes malos (H, Na, Al)",
      approach: "Calcular necesidades exactas y seleccionar enmiendas específicas"
    }
  },
  
  // ================================
  // ENMIENDAS DISPONIBLES
  // ================================
  
  amendments: {
    'lime': {
      name: 'Cal Agrícola',
      formula: 'CaCO₃',
      composition: { ca: 40, mg: 0, k: 0, so4: 0, co3: 60, h2o: 0, si: 0 },
      uses: ['Ajuste de pH', 'Aporte de Ca', 'Desplazamiento de H'],
      efficiency: 95,
      cost: 'Bajo',
      application: 'Incorporar al suelo'
    },
    
    'dolomite': {
      name: 'Cal Dolomítica',
      formula: 'CaCO₃ + MgCO₃',
      composition: { ca: 21.7, mg: 13.2, k: 0, so4: 0, co3: 65.2, h2o: 0, si: 0 },
      uses: ['Aporte de Ca y Mg', 'Ajuste de pH', 'Desplazamiento de H'],
      efficiency: 90,
      cost: 'Medio',
      application: 'Incorporar al suelo'
    },
    
    'gypsum': {
      name: 'Yeso Agrícola',
      formula: 'CaSO₄·2H₂O',
      composition: { ca: 23.3, mg: 0, k: 0, so4: 55.8, co3: 0, h2o: 20.9, si: 0 },
      uses: ['Aporte de Ca y SO₄', 'Desplazamiento de Na', 'Mejora estructura'],
      efficiency: 85,
      cost: 'Bajo',
      application: 'Incorporar al suelo'
    },
    
    'sop-granular': {
      name: 'Sulfato de Potasio Granular',
      formula: 'K₂SO₄',
      composition: { ca: 0, mg: 0, k: 43.2, so4: 53.2, co3: 0, h2o: 0, si: 0 },
      uses: ['Aporte de K y SO₄', 'Nutrición vegetal', 'Desplazamiento de Na'],
      efficiency: 95,
      cost: 'Alto',
      application: 'Aplicación superficial'
    },
    
    'mgso4-mono': {
      name: 'Sulfato de Magnesio Monohidrato',
      formula: 'MgSO₄·H₂O',
      composition: { ca: 0, mg: 17, k: 0, so4: 69, co3: 0, h2o: 14, si: 0 },
      uses: ['Aporte de Mg y SO₄', 'Nutrición vegetal', 'Desplazamiento de Na'],
      efficiency: 95,
      cost: 'Medio',
      application: 'Aplicación superficial'
    }
  },
  
  // ================================
  // ALGORITMOS DE DECISIÓN
  // ================================
  
  decisionAlgorithms: {
    
    // Algoritmo para detectar excesos de cationes buenos
    detectExcess: function(analysis) {
      const cicTotal = analysis.cicTotal;
      const initial = analysis.initial;
      
      const excesses = {
        k: initial.k > (cicTotal * 0.08) ? initial.k - (cicTotal * 0.08) : 0,
        ca: initial.ca > (cicTotal * 0.78) ? initial.ca - (cicTotal * 0.78) : 0,
        mg: initial.mg > (cicTotal * 0.17) ? initial.mg - (cicTotal * 0.17) : 0
      };
      
      return excesses;
    },
    
    // Algoritmo para calcular necesidades de ajuste
    calculateNeeds: function(analysis) {
      const cicTotal = analysis.cicTotal;
      const initial = analysis.initial;
      
      const ideal = {
        k: cicTotal * 0.05,   // 5%
        ca: cicTotal * 0.75,  // 75%
        mg: cicTotal * 0.15   // 15%
      };
      
      const needs = {
        k: ideal.k - initial.k,   // Positivo = déficit, Negativo = exceso
        ca: ideal.ca - initial.ca,
        mg: ideal.mg - initial.mg,
        h: initial.h,  // Todo el H debe ser desplazado
        na: initial.na, // Todo el Na debe ser desplazado
        al: initial.al  // Todo el Al debe ser desplazado
      };
      
      return needs;
    },
    
    // Algoritmo para seleccionar enmiendas óptimas
    selectOptimalAmendments: function(needs, availableAmendments) {
      const options = [];
      const badCations = needs.h + needs.na + needs.al;
      
      // Solo aplicar enmiendas si hay cationes malos que desplazar
      if (badCations > 0) {
        
        // Opción 1: Solo Cal Agrícola (si solo necesita Ca)
        if (needs.ca > 0 && needs.mg <= 0.5 && needs.k <= 0.5) {
          options.push({
            name: 'Solo Cal Agrícola',
            amendments: ['lime'],
            reasoning: `Necesita Ca (${needs.ca.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos.`,
            efficiency: 95,
            cost: 'Bajo'
          });
        }
        
        // Opción 2: Solo Sulfato de Magnesio (si solo necesita Mg)
        if (needs.mg > 0 && needs.ca <= 0.5 && needs.k <= 0.5) {
          options.push({
            name: 'Solo Sulfato de Magnesio',
            amendments: ['mgso4-mono'],
            reasoning: `Necesita Mg (${needs.mg.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos.`,
            efficiency: 95,
            cost: 'Bajo'
          });
        }
        
        // Opción 3: Cal Dolomítica (si necesita Ca y Mg)
        if (needs.ca > 0 && needs.mg > 0 && needs.k <= 0.5) {
          options.push({
            name: 'Cal Dolomítica',
            amendments: ['dolomite'],
            reasoning: `Necesita Ca (${needs.ca.toFixed(2)} meq) y Mg (${needs.mg.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos.`,
            efficiency: 90,
            cost: 'Medio'
          });
        }
        
        // Opción 4: Combinación Cal + Sulfato de Magnesio
        if (needs.ca > 0 && needs.mg > 0) {
          options.push({
            name: 'Cal Agrícola + Sulfato de Magnesio',
            amendments: ['lime', 'mgso4-mono'],
            reasoning: `Necesita Ca (${needs.ca.toFixed(2)} meq) y Mg (${needs.mg.toFixed(2)} meq) para desplazar ${badCations.toFixed(2)} meq de cationes malos.`,
            efficiency: 85,
            cost: 'Medio'
          });
        }
      }
      
      // Manejar excesos de cationes buenos
      if (needs.ca < 0) {
        options.push({
          name: 'Exceso de Ca - No aplicar Cal',
          amendments: [],
          reasoning: `Tu suelo tiene exceso de Ca (${Math.abs(needs.ca).toFixed(2)} meq). NO apliques Cal Agrícola.`,
          efficiency: 100,
          cost: 'Gratis',
          warning: 'Exceso de Ca detectado'
        });
      }
      
      if (needs.mg < 0) {
        options.push({
          name: 'Exceso de Mg - No aplicar Sulfato de Magnesio',
          amendments: [],
          reasoning: `Tu suelo tiene exceso de Mg (${Math.abs(needs.mg).toFixed(2)} meq). NO apliques Sulfato de Magnesio.`,
          efficiency: 100,
          cost: 'Gratis',
          warning: 'Exceso de Mg detectado'
        });
      }
      
      if (needs.k < 0) {
        options.push({
          name: 'Exceso de K - No aplicar SOP Granular',
          amendments: [],
          reasoning: `Tu suelo tiene exceso de K (${Math.abs(needs.k).toFixed(2)} meq). NO apliques SOP Granular.`,
          efficiency: 100,
          cost: 'Gratis',
          warning: 'Exceso de K detectado'
        });
      }
      
      return options;
    }
  },
  
  // ================================
  // FRASES Y EXPLICACIONES DE IA
  // ================================
  
  explanations: {
    cicAdjustment: {
      objective: "El objetivo del ajuste de CIC es equilibrar todos los cationes para optimizar la fertilidad del suelo.",
      strategy: "Ajustamos los cationes buenos (K, Ca, Mg) a niveles ideales y desplazamos los cationes malos (H, Na, Al).",
      approach: "Calculamos las necesidades exactas y seleccionamos las enmiendas más eficientes para cada caso."
    },
    
    amendmentSelection: {
      efficiency: "Seleccionamos enmiendas basándonos en eficiencia, costo y especificidad para las necesidades del suelo.",
      reasoning: "Cada recomendación incluye el razonamiento técnico y los cálculos que la sustentan.",
      optimization: "Optimizamos para evitar excesos, desperdicios y sobredosificación de nutrientes."
    },
    
    warnings: {
      excess: "Si detectamos exceso de un catión bueno, recomendamos NO aplicar la enmienda correspondiente.",
      balance: "El equilibrio de cationes es crucial para la salud del suelo y el crecimiento de las plantas.",
      precision: "Los cálculos son precisos para evitar problemas de desequilibrio y optimizar recursos."
    }
  },
  
  // ================================
  // FUNCIONES DE IA
  // ================================
  
  functions: {
    
    // Función principal para obtener recomendación de IA
    getRecommendation: function(soilAnalysis) {
      console.log('🤖 IA: Analizando suelo para recomendación de enmiendas...');
      
      // Calcular necesidades
      const needs = this.decisionAlgorithms.calculateNeeds(soilAnalysis);
      console.log('📊 Necesidades calculadas:', needs);
      
      // Detectar excesos
      const excesses = this.decisionAlgorithms.detectExcess(soilAnalysis);
      console.log('⚠️ Excesos detectados:', excesses);
      
      // Seleccionar enmiendas
      const options = this.decisionAlgorithms.selectOptimalAmendments(needs, []);
      console.log('🔍 Opciones evaluadas:', options);
      
      // Seleccionar la mejor opción
      const bestOption = options.length > 0 ? options[0] : {
        name: 'No se requieren enmiendas',
        amendments: [],
        reasoning: 'El suelo está en equilibrio. No se requieren enmiendas.',
        efficiency: 100,
        cost: 'Gratis'
      };
      
      console.log('✅ Recomendación final:', bestOption);
      
      return bestOption;
    },
    
    // Función para explicar la recomendación
    explainRecommendation: function(recommendation, soilAnalysis) {
      let explanation = `🤖 IA: ${recommendation.reasoning}\n\n`;
      
      if (recommendation.amendments.length > 0) {
        explanation += `📋 Enmiendas recomendadas:\n`;
        recommendation.amendments.forEach(amendmentId => {
          const amendment = this.amendments[amendmentId];
          if (amendment) {
            explanation += `• ${amendment.name} (${amendment.formula})\n`;
            explanation += `  - Eficiencia: ${amendment.efficiency}%\n`;
            explanation += `  - Costo: ${amendment.cost}\n`;
            explanation += `  - Usos: ${amendment.uses.join(', ')}\n\n`;
          }
        });
      }
      
      explanation += `💡 Esta recomendación tiene una eficiencia del ${recommendation.efficiency}% y un costo ${recommendation.cost}.`;
      
      return explanation;
    }
  }
};

// ================================
// EXPORTAR PARA USO EN LA APLICACIÓN
// ================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AI_AMENDMENT_KNOWLEDGE;
} else {
  window.AI_AMENDMENT_KNOWLEDGE = AI_AMENDMENT_KNOWLEDGE;
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
const recommendation = AI_AMENDMENT_KNOWLEDGE.functions.getRecommendation(exampleSoil);
const explanation = AI_AMENDMENT_KNOWLEDGE.functions.explainRecommendation(recommendation, exampleSoil);
console.log('📋 Explicación:', explanation);





























