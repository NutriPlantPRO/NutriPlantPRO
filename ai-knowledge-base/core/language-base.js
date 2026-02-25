// ================================
// IA - LENGUAJE BASE Y CONCEPTOS FUNDAMENTALES
// ================================

const AI_LANGUAGE_BASE = {
  
  // ================================
  // CONCEPTOS FUNDAMENTALES
  // ================================
  
  concepts: {
    soil: {
      cic: {
        definition: "Capacidad de Intercambio Catiónico - medida de la capacidad del suelo para retener y liberar cationes",
        importance: "Fundamental para determinar la fertilidad y estructura del suelo",
        units: "meq/100g de suelo",
        ideal: "Valores entre 10-30 meq/100g son óptimos para la mayoría de cultivos"
      },
      
      cations: {
        good: {
          k: { 
            ideal: "5% del CIC", 
            range: "3-8%", 
            function: "Nutriente esencial para crecimiento y desarrollo",
            deficiency: "Crecimiento lento, hojas amarillentas",
            excess: "Puede interferir con absorción de Ca y Mg"
          },
          ca: { 
            ideal: "75% del CIC", 
            range: "65-78%", 
            function: "Estructura del suelo y disponibilidad de nutrientes",
            deficiency: "Suelo ácido, estructura pobre",
            excess: "Puede causar deficiencias de K y Mg"
          },
          mg: { 
            ideal: "15% del CIC", 
            range: "10-17%", 
            function: "Componente de clorofila y activador enzimático",
            deficiency: "Clorosis intervenal, crecimiento reducido",
            excess: "Puede interferir con absorción de K"
          }
        },
        bad: {
          h: { 
            ideal: "0% del CIC", 
            problem: "Acidez del suelo", 
            effect: "Reduce disponibilidad de nutrientes",
            solution: "Aplicación de cal"
          },
          na: { 
            ideal: "0% del CIC", 
            problem: "Salinidad", 
            effect: "Toxicidad y desestructuración del suelo",
            solution: "Aplicación de yeso y riego"
          },
          al: { 
            ideal: "0% del CIC", 
            problem: "Toxicidad", 
            effect: "Inhibe crecimiento radicular",
            solution: "Aplicación de cal y materia orgánica"
          }
        }
      },
      
      properties: {
        density: {
          definition: "Peso del suelo por unidad de volumen",
          units: "g/cm³",
          typical: "1.0-1.5 g/cm³",
          importance: "Afecta cálculos de aplicación de enmiendas"
        },
        depth: {
          definition: "Profundidad de la capa de suelo a tratar",
          units: "cm",
          typical: "20-30 cm",
          importance: "Determina volumen total de suelo a enmendar"
        },
        ph: {
          definition: "Medida de acidez o alcalinidad del suelo",
          scale: "0-14",
          ideal: "6.0-7.5",
          importance: "Afecta disponibilidad de nutrientes"
        }
      }
    },
    
    amendments: {
      purpose: "Materiales aplicados al suelo para mejorar sus propiedades químicas, físicas o biológicas",
      types: {
        lime: "Materiales calcáreos para neutralizar acidez",
        gypsum: "Sulfato de calcio para mejorar estructura y desplazar sodio",
        fertilizers: "Materiales que aportan nutrientes específicos",
        organic: "Materiales orgánicos para mejorar estructura y biología"
      }
    }
  },
  
  // ================================
  // LENGUAJE DE COMUNICACIÓN
  // ================================
  
  language: {
    greetings: [
      "¡Hola! Soy tu asistente de análisis de suelo.",
      "Bienvenido al sistema de análisis de suelo NutriPlant Pro.",
      "Hola, estoy aquí para ayudarte con el análisis de tu suelo."
    ],
    
    analysis: {
      start: [
        "Analizando tu muestra de suelo...",
        "Procesando los datos del análisis...",
        "Evaluando las propiedades de tu suelo..."
      ],
      
      complete: [
        "Análisis completado. Aquí están los resultados:",
        "He terminado el análisis. Estos son los hallazgos:",
        "Análisis finalizado. Aquí tienes el diagnóstico:"
      ]
    },
    
    recommendations: {
      introduction: [
        "Basándome en el análisis, te recomiendo:",
        "Según los resultados, la mejor estrategia es:",
        "Para optimizar tu suelo, sugiero:"
      ],
      
      options: [
        "Tienes varias opciones disponibles:",
        "Puedes elegir entre estas alternativas:",
        "Aquí están las opciones que mejor se adaptan a tu caso:"
      ],
      
      efficiency: [
        "Esta opción es la más eficiente:",
        "Para máxima eficiencia, recomiendo:",
        "La opción más práctica es:"
      ],
      
      precision: [
        "Si buscas máxima precisión:",
        "Para cantidades exactas:",
        "Si quieres optimizar al máximo:"
      ]
    },
    
    explanations: {
      why: [
        "Te explico por qué:",
        "La razón es la siguiente:",
        "Esto se debe a que:"
      ],
      
      how: [
        "Así es como funciona:",
        "El proceso es el siguiente:",
        "Te explico el mecanismo:"
      ],
      
      benefits: [
        "Los beneficios de esta opción son:",
        "Esta estrategia te dará:",
        "Con esta opción obtendrás:"
      ]
    },
    
    confirmations: {
      apply: [
        "¿Te parece bien que aplique esta recomendación?",
        "¿Quieres que proceda con esta opción?",
        "¿Aplico esta selección automáticamente?"
      ],
      
      permission: [
        "Con tu permiso, procederé a:",
        "Si estás de acuerdo, aplicaré:",
        "Con tu autorización, seleccionaré:"
      ]
    }
  },
  
  // ================================
  // PLANTILLAS DE RESPUESTAS
  // ================================
  
  templates: {
    soilAnalysis: {
      greeting: "🤖 Hola! He analizado tu muestra de suelo. Aquí están los resultados:",
      summary: "📊 **RESUMEN DEL ANÁLISIS:**",
      cic: "• CIC Total: {cicTotal} meq/100g",
      cations: "• Cationes analizados: K, Ca, Mg, H, Na, Al",
      needs: "• Necesidades identificadas: {needs}",
      recommendations: "💡 **RECOMENDACIONES:**"
    },
    
    amendmentOptions: {
      title: "🌱 **OPCIONES DE ENMIENDAS DISPONIBLES:**",
      option: "**Opción {number} - {name}:**",
      description: "• {description}",
      quantity: "• Cantidad: {quantity} kg/ha",
      contributions: "• Aporta: {contributions}",
      efficiency: "• Eficiencia: {efficiency}%",
      cost: "• Costo: {cost}",
      reasoning: "• Razón: {reasoning}"
    },
    
    recommendation: {
      selected: "✅ **RECOMENDACIÓN SELECCIONADA:**",
      name: "• Enmienda: {name}",
      quantity: "• Cantidad: {quantity} kg/ha",
      totalCost: "• Costo total: {cost}",
      application: "• Método de aplicación: {method}",
      timing: "• Época recomendada: {timing}",
      benefits: "• Beneficios esperados: {benefits}"
    }
  },
  
  // ================================
  // FUNCIONES DE LENGUAJE
  // ================================
  
  functions: {
    
    // Generar saludo personalizado
    generateGreeting: function() {
      const greetings = this.language.greetings;
      return greetings[Math.floor(Math.random() * greetings.length)];
    },
    
    // Generar explicación de análisis
    generateAnalysisExplanation: function(soilData) {
      let explanation = this.templates.soilAnalysis.greeting + "\n\n";
      explanation += this.templates.soilAnalysis.summary + "\n";
      explanation += this.templates.soilAnalysis.cic.replace('{cicTotal}', soilData.cicTotal) + "\n";
      explanation += this.templates.soilAnalysis.cations + "\n";
      
      // Identificar necesidades
      const needs = [];
      if (soilData.needs.ca > 0) needs.push(`Ca: +${soilData.needs.ca.toFixed(2)} meq`);
      if (soilData.needs.mg > 0) needs.push(`Mg: +${soilData.needs.mg.toFixed(2)} meq`);
      if (soilData.needs.k > 0) needs.push(`K: +${soilData.needs.k.toFixed(2)} meq`);
      if (soilData.needs.na > 0) needs.push(`Na: -${soilData.needs.na.toFixed(2)} meq`);
      
      explanation += this.templates.soilAnalysis.needs.replace('{needs}', needs.join(', ')) + "\n\n";
      explanation += this.templates.soilAnalysis.recommendations + "\n";
      
      return explanation;
    },
    
    // Generar opciones de enmiendas
    generateAmendmentOptions: function(options) {
      let response = this.templates.amendmentOptions.title + "\n\n";
      
      options.forEach((option, index) => {
        response += this.templates.amendmentOptions.option
          .replace('{number}', index + 1)
          .replace('{name}', option.name) + "\n";
        
        response += this.templates.amendmentOptions.description
          .replace('{description}', option.reasoning) + "\n";
        
        if (option.amendments.length > 0) {
          response += this.templates.amendmentOptions.quantity
            .replace('{quantity}', option.quantity || 'Variable') + "\n";
        }
        
        response += this.templates.amendmentOptions.efficiency
          .replace('{efficiency}', option.efficiency) + "\n";
        
        response += this.templates.amendmentOptions.cost
          .replace('{cost}', option.cost) + "\n\n";
      });
      
      return response;
    },
    
    // Generar recomendación final
    generateRecommendation: function(recommendation) {
      let response = this.templates.recommendation.selected + "\n\n";
      response += this.templates.recommendation.name.replace('{name}', recommendation.name) + "\n";
      response += this.templates.recommendation.quantity.replace('{quantity}', recommendation.quantity) + "\n";
      response += this.templates.recommendation.totalCost.replace('{cost}', recommendation.cost) + "\n";
      response += this.templates.recommendation.application.replace('{method}', 'Incorporar al suelo') + "\n";
      response += this.templates.recommendation.timing.replace('{timing}', 'Antes de la siembra') + "\n";
      response += this.templates.recommendation.benefits.replace('{benefits}', 'Equilibrio de cationes y mejora de fertilidad') + "\n";
      
      return response;
    }
  }
};

// ================================
// EXPORTAR PARA USO EN LA APLICACIÓN
// ================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AI_LANGUAGE_BASE;
} else {
  window.AI_LANGUAGE_BASE = AI_LANGUAGE_BASE;
}





























