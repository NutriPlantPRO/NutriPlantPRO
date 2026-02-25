// ================================
// IA - MÓDULO DE ENMIENDAS
// ================================

const AI_AMENDMENTS_MODULE = {
  
  // ================================
  // CONCEPTOS ESPECÍFICOS DE ENMIENDAS
  // ================================
  
  concepts: {
    amendmentSelection: {
      criteria: {
        efficiency: "Eficiencia en aportar los nutrientes necesarios",
        cost: "Costo económico de la enmienda",
        availability: "Disponibilidad en el mercado local",
        application: "Facilidad de aplicación en campo",
        compatibility: "Compatibilidad con otros tratamientos"
      },
      
      strategies: {
        single: "Una sola enmienda para múltiples nutrientes",
        combined: "Combinación de enmiendas específicas",
        precision: "Máxima precisión en cantidades",
        efficiency: "Máxima eficiencia en aplicación"
      }
    },
    
    calculations: {
      conversion: {
        meqToKgHa: "Conversión de meq/100g a kg/ha usando densidad del suelo",
        formula: "(meq × densidad × profundidad × 10,000) ÷ 1,000,000",
        example: "1.32 meq Ca × 1.1 g/cm³ × 30 cm × 10,000 ÷ 1,000,000 = 0.4356 kg/ha"
      },
      
      amendmentAmount: {
        formula: "Cantidad de enmienda = kg/ha necesarios ÷ % de composición",
        example: "0.4356 kg/ha Ca ÷ 0.217 (21.7%) = 2.01 kg/ha Cal Dolomítica"
      }
    }
  },
  
  // ================================
  // LENGUAJE ESPECÍFICO DE ENMIENDAS
  // ================================
  
  language: {
    analysis: {
      soilNeeds: [
        "Analizando las necesidades de tu suelo...",
        "Evaluando qué nutrientes necesita tu suelo...",
        "Calculando los déficits y excesos de nutrientes..."
      ],
      
      amendmentEvaluation: [
        "Evaluando las enmiendas disponibles...",
        "Comparando opciones de enmiendas...",
        "Analizando eficiencia y costos..."
      ]
    },
    
    recommendations: {
      singleAmendment: [
        "Para tu caso, la mejor opción es una sola enmienda:",
        "Te recomiendo usar una enmienda específica:",
        "La solución más eficiente es:"
      ],
      
      combinedAmendments: [
        "Para máxima precisión, te sugiero combinar enmiendas:",
        "La mejor estrategia es usar múltiples enmiendas:",
        "Para cantidades exactas, combina:"
      ],
      
      efficiency: [
        "Esta opción es la más eficiente porque:",
        "Te recomiendo esta opción por su eficiencia:",
        "Es la mejor opción considerando:"
      ],
      
      precision: [
        "Si buscas máxima precisión:",
        "Para cantidades exactas:",
        "Si quieres optimizar al máximo:"
      ]
    },
    
    explanations: {
      whyThisAmendment: [
        "Te explico por qué esta enmienda:",
        "La razón de esta recomendación es:",
        "Esta enmienda es ideal porque:"
      ],
      
      howItWorks: [
        "Así es como funciona esta enmienda:",
        "El mecanismo de acción es:",
        "Esta enmienda actúa de la siguiente manera:"
      ],
      
      benefits: [
        "Los beneficios de esta enmienda son:",
        "Con esta enmienda obtendrás:",
        "Esta opción te dará:"
      ]
    },
    
    confirmations: {
      applyRecommendation: [
        "¿Te parece bien que aplique esta recomendación?",
        "¿Quieres que proceda con esta enmienda?",
        "¿Aplico esta selección automáticamente?"
      ],
      
      permission: [
        "Con tu permiso, procederé a seleccionar:",
        "Si estás de acuerdo, aplicaré:",
        "Con tu autorización, configuraré:"
      ]
    }
  },
  
  // ================================
  // PLANTILLAS ESPECÍFICAS DE ENMIENDAS
  // ================================
  
  templates: {
    soilAnalysis: {
      needs: "📊 **NECESIDADES DE TU SUELO:**",
      ca: "• Calcio (Ca): {ca} meq - {status}",
      mg: "• Magnesio (Mg): {mg} meq - {status}",
      k: "• Potasio (K): {k} meq - {status}",
      na: "• Sodio (Na): {na} meq - {status}",
      summary: "**Resumen:** Tu suelo necesita {totalGood} meq de cationes buenos para desplazar {totalBad} meq de cationes malos."
    },
    
    amendmentOptions: {
      title: "🌱 **OPCIONES DE ENMIENDAS EVALUADAS:**",
      option: "**{number}. {name}**",
      description: "• {description}",
      quantity: "• Cantidad: {quantity} kg/ha",
      contributions: "• Aporta: {contributions}",
      efficiency: "• Eficiencia: {efficiency}%",
      cost: "• Costo: {cost}",
      reasoning: "• Razón: {reasoning}",
      pros: "• Ventajas: {pros}",
      cons: "• Consideraciones: {cons}"
    },
    
    recommendation: {
      selected: "✅ **RECOMENDACIÓN FINAL:**",
      name: "• Enmienda seleccionada: {name}",
      quantity: "• Cantidad: {quantity} kg/ha",
      totalCost: "• Costo estimado: {cost}",
      application: "• Método: {method}",
      timing: "• Época: {timing}",
      benefits: "• Beneficios: {benefits}",
      nextSteps: "• Próximos pasos: {nextSteps}"
    },
    
    comparison: {
      title: "⚖️ **COMPARACIÓN DE OPCIONES:**",
      efficiency: "**Eficiencia:** {option1} vs {option2}",
      cost: "**Costo:** {option1} vs {option2}",
      precision: "**Precisión:** {option1} vs {option2}",
      recommendation: "**Mi recomendación:** {recommendation}"
    }
  },
  
  // ================================
  // FUNCIONES ESPECÍFICAS DE ENMIENDAS
  // ================================
  
  functions: {
    
    // Analizar necesidades del suelo
    analyzeSoilNeeds: function(soilData) {
      const needs = {
        ca: soilData.needs.ca || 0,
        mg: soilData.needs.mg || 0,
        k: soilData.needs.k || 0,
        na: soilData.needs.na || 0
      };
      
      let analysis = this.templates.soilAnalysis.needs + "\n\n";
      
      // Analizar cada catión
      analysis += this.templates.soilAnalysis.ca
        .replace('{ca}', needs.ca.toFixed(2))
        .replace('{status}', needs.ca > 0 ? 'Déficit' : needs.ca < 0 ? 'Exceso' : 'Óptimo') + "\n";
      
      analysis += this.templates.soilAnalysis.mg
        .replace('{mg}', needs.mg.toFixed(2))
        .replace('{status}', needs.mg > 0 ? 'Déficit' : needs.mg < 0 ? 'Exceso' : 'Óptimo') + "\n";
      
      analysis += this.templates.soilAnalysis.k
        .replace('{k}', needs.k.toFixed(2))
        .replace('{status}', needs.k > 0 ? 'Déficit' : needs.k < 0 ? 'Exceso' : 'Óptimo') + "\n";
      
      analysis += this.templates.soilAnalysis.na
        .replace('{na}', needs.na.toFixed(2))
        .replace('{status}', needs.na > 0 ? 'Exceso (desplazar)' : 'Óptimo') + "\n\n";
      
      // Resumen
      const totalGood = Math.max(0, needs.ca) + Math.max(0, needs.mg) + Math.max(0, needs.k);
      const totalBad = Math.max(0, needs.na);
      
      analysis += this.templates.soilAnalysis.summary
        .replace('{totalGood}', totalGood.toFixed(2))
        .replace('{totalBad}', totalBad.toFixed(2)) + "\n";
      
      return analysis;
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
        
        if (option.quantity) {
          response += this.templates.amendmentOptions.quantity
            .replace('{quantity}', option.quantity) + "\n";
        }
        
        if (option.contributions) {
          response += this.templates.amendmentOptions.contributions
            .replace('{contributions}', option.contributions) + "\n";
        }
        
        response += this.templates.amendmentOptions.efficiency
          .replace('{efficiency}', option.efficiency) + "\n";
        
        response += this.templates.amendmentOptions.cost
          .replace('{cost}', option.cost) + "\n";
        
        if (option.pros) {
          response += this.templates.amendmentOptions.pros
            .replace('{pros}', option.pros) + "\n";
        }
        
        if (option.cons) {
          response += this.templates.amendmentOptions.cons
            .replace('{cons}', option.cons) + "\n";
        }
        
        response += "\n";
      });
      
      return response;
    },
    
    // Generar recomendación final
    generateFinalRecommendation: function(recommendation) {
      let response = this.templates.recommendation.selected + "\n\n";
      
      response += this.templates.recommendation.name
        .replace('{name}', recommendation.name) + "\n";
      
      response += this.templates.recommendation.quantity
        .replace('{quantity}', recommendation.quantity || 'Variable') + "\n";
      
      response += this.templates.recommendation.totalCost
        .replace('{cost}', recommendation.cost || 'Consultar') + "\n";
      
      response += this.templates.recommendation.application
        .replace('{method}', 'Incorporar al suelo') + "\n";
      
      response += this.templates.recommendation.timing
        .replace('{timing}', 'Antes de la siembra') + "\n";
      
      response += this.templates.recommendation.benefits
        .replace('{benefits}', 'Equilibrio de cationes y mejora de fertilidad') + "\n";
      
      response += this.templates.recommendation.nextSteps
        .replace('{nextSteps}', 'Aplicar según recomendación y monitorear resultados') + "\n";
      
      return response;
    },
    
    // Generar comparación de opciones
    generateComparison: function(option1, option2) {
      let response = this.templates.comparison.title + "\n\n";
      
      response += this.templates.comparison.efficiency
        .replace('{option1}', option1.efficiency + '%')
        .replace('{option2}', option2.efficiency + '%') + "\n";
      
      response += this.templates.comparison.cost
        .replace('{option1}', option1.cost)
        .replace('{option2}', option2.cost) + "\n";
      
      response += this.templates.comparison.precision
        .replace('{option1}', option1.precision || 'Media')
        .replace('{option2}', option2.precision || 'Alta') + "\n";
      
      const recommendation = option1.efficiency > option2.efficiency ? option1.name : option2.name;
      response += this.templates.comparison.recommendation
        .replace('{recommendation}', recommendation) + "\n";
      
      return response;
    }
  }
};

// ================================
// EXPORTAR PARA USO EN LA APLICACIÓN
// ================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AI_AMENDMENTS_MODULE;
} else {
  window.AI_AMENDMENTS_MODULE = AI_AMENDMENTS_MODULE;
}




























