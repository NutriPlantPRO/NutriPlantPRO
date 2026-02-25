/**
 * NUTRIPLANT PRO - SISTEMA DE EXPANSIÓN DE CONOCIMIENTO
 * Base de conocimiento progresiva para nuevas pestañas
 * Versión: 1.0.0
 * Autor: NutriPlant Pro
 */

class KnowledgeExpansion {
  constructor(nutriPlantAI) {
    this.ai = nutriPlantAI;
    this.expansionModules = new Map();
    this.learningProgress = new Map();
    this.initializeExpansionModules();
  }

  /**
   * INICIALIZAR MÓDULOS DE EXPANSIÓN
   * Cada pestaña nueva tendrá su módulo de conocimiento
   */
  initializeExpansionModules() {
    // Módulo de Análisis de Suelo
    this.expansionModules.set('soil_analysis', {
      name: 'Análisis de Suelo',
      priority: 1,
      concepts: this.getSoilAnalysisConcepts(),
      terminology: this.getSoilAnalysisTerminology(),
      interactions: this.getSoilAnalysisInteractions()
    });

    // Módulo de Nutrición Vegetal
    this.expansionModules.set('plant_nutrition', {
      name: 'Nutrición Vegetal',
      priority: 2,
      concepts: this.getPlantNutritionConcepts(),
      terminology: this.getPlantNutritionTerminology(),
      interactions: this.getPlantNutritionInteractions()
    });

    // Módulo de Fertirriego
    this.expansionModules.set('fertigation', {
      name: 'Fertirriego',
      priority: 3,
      concepts: this.getFertigationConcepts(),
      terminology: this.getFertigationTerminology(),
      interactions: this.getFertigationInteractions()
    });

    // Módulo de Manejo de Cultivos
    this.expansionModules.set('crop_management', {
      name: 'Manejo de Cultivos',
      priority: 4,
      concepts: this.getCropManagementConcepts(),
      terminology: this.getCropManagementTerminology(),
      interactions: this.getCropManagementInteractions()
    });

    // Módulo de Diagnóstico Foliar
    this.expansionModules.set('foliar_diagnosis', {
      name: 'Diagnóstico Foliar',
      priority: 5,
      concepts: this.getFoliarDiagnosisConcepts(),
      terminology: this.getFoliarDiagnosisTerminology(),
      interactions: this.getFoliarDiagnosisInteractions()
    });

    // Módulo de Manejo de Plagas y Enfermedades
    this.expansionModules.set('pest_disease', {
      name: 'Plagas y Enfermedades',
      priority: 6,
      concepts: this.getPestDiseaseConcepts(),
      terminology: this.getPestDiseaseTerminology(),
      interactions: this.getPestDiseaseInteractions()
    });
  }

  /**
   * CONCEPTOS DE ANÁLISIS DE SUELO
   */
  getSoilAnalysisConcepts() {
    return {
      textura_suelo: {
        term: "Textura del Suelo",
        description: "Proporción relativa de arena, limo y arcilla que determina las propiedades físicas del suelo",
        components: {
          arena: "Partículas de 2-0.05 mm, proporciona drenaje y aireación",
          limo: "Partículas de 0.05-0.002 mm, balance entre drenaje y retención",
          arcilla: "Partículas <0.002 mm, alta retención de agua y nutrientes"
        },
        determination: "Método de Bouyoucos o análisis de laboratorio",
        implications: {
          arenoso: "Requiere riego y fertilización frecuente",
          franco: "Balance ideal para la mayoría de cultivos",
          arcilloso: "Requiere manejo cuidadoso del riego y drenaje"
        }
      },
      estructura_suelo: {
        term: "Estructura del Suelo",
        description: "Arreglo de las partículas del suelo en agregados estables",
        types: {
          granular: "Agregados pequeños y redondos, ideal para cultivos",
          laminar: "Agregados planos, puede limitar infiltración",
          masiva: "Sin agregados, compacto y problemático"
        },
        factors: ["Materia orgánica", "Actividad microbiana", "Manejo del suelo"],
        improvement: "Aplicación de materia orgánica, labranza mínima"
      },
      densidad_aparente: {
        term: "Densidad Aparente",
        description: "Peso del suelo seco por unidad de volumen",
        units: "g/cm³",
        ranges: {
          baja: "<1.0 g/cm³ - Suelo suelto, bien aireado",
          media: "1.0-1.4 g/cm³ - Suelo normal",
          alta: ">1.4 g/cm³ - Suelo compacto, limitado"
        },
        measurement: "Método del cilindro o análisis de laboratorio",
        management: "Labranza profunda, materia orgánica, evitar compactación"
      },
      porosidad: {
        term: "Porosidad del Suelo",
        description: "Porcentaje del volumen del suelo ocupado por espacios porosos",
        types: {
          macroporos: ">0.1 mm, drenaje y aireación",
          microporos: "<0.1 mm, retención de agua"
        },
        optimal: "45-55% del volumen total",
        factors: ["Textura", "Estructura", "Materia orgánica", "Compactación"]
      }
    };
  }

  /**
   * TERMINOLOGÍA DE ANÁLISIS DE SUELO
   */
  getSoilAnalysisTerminology() {
    return {
      cec: "Capacidad de Intercambio Catiónico - Capacidad del suelo para retener cationes",
      ph: "Potencial de Hidrógeno - Medida de acidez o alcalinidad",
      materia_organica: "Componente orgánico del suelo que mejora fertilidad",
      nitratos: "Forma de nitrógeno disponible para las plantas",
      fosforo_disponible: "Fósforo en forma asimilable por las plantas",
      potasio_intercambiable: "Potasio disponible en el complejo de intercambio",
      calcio_intercambiable: "Calcio disponible en el complejo de intercambio",
      magnesio_intercambiable: "Magnesio disponible en el complejo de intercambio",
      sodio_intercambiable: "Sodio en el complejo de intercambio",
      conductividad_electrica: "Medida de la salinidad del suelo",
      saturacion_bases: "Porcentaje de saturación de bases en la CEC",
      saturacion_aluminio: "Porcentaje de saturación de aluminio en la CEC"
    };
  }

  /**
   * INTERACCIONES DE ANÁLISIS DE SUELO
   */
  getSoilAnalysisInteractions() {
    return {
      ph_nutrientes: "El pH afecta la disponibilidad de nutrientes",
      cec_fertilizacion: "La CEC determina la frecuencia de fertilización",
      textura_riego: "La textura influye en la frecuencia y cantidad de riego",
      materia_organica_estructura: "La materia orgánica mejora la estructura del suelo"
    };
  }

  /**
   * CONCEPTOS DE NUTRICIÓN VEGETAL
   */
  getPlantNutritionConcepts() {
    return {
      ciclo_nutricional: {
        term: "Ciclo Nutricional",
        description: "Proceso de absorción, transporte y utilización de nutrientes por las plantas",
        stages: ["Absorción", "Transporte", "Asimilación", "Redistribución"],
        factors: ["pH del suelo", "Humedad", "Temperatura", "Actividad microbiana"]
      },
      sinergismo_nutrientes: {
        term: "Sinergismo Nutricional",
        description: "Interacción positiva entre nutrientes que mejora su absorción",
        examples: {
          "N-P": "El nitrógeno mejora la absorción de fósforo",
          "K-Mg": "El potasio facilita la absorción de magnesio",
          "Ca-B": "El calcio mejora la absorción de boro"
        }
      },
      antagonismo_nutrientes: {
        term: "Antagonismo Nutricional",
        description: "Interacción negativa entre nutrientes que reduce su absorción",
        examples: {
          "K-Mg": "Exceso de potasio reduce absorción de magnesio",
          "P-Zn": "Exceso de fósforo reduce absorción de zinc",
          "Ca-Fe": "Exceso de calcio reduce absorción de hierro"
        }
      },
      movilidad_nutrientes: {
        term: "Movilidad de Nutrientes",
        description: "Capacidad de los nutrientes para moverse dentro de la planta",
        mobile: ["N", "P", "K", "Mg", "Cl"],
        immobile: ["Ca", "B", "Fe", "Mn", "Cu", "Zn"],
        implications: "Los nutrientes móviles muestran deficiencias en hojas viejas, los inmóviles en hojas nuevas"
      }
    };
  }

  /**
   * TERMINOLOGÍA DE NUTRICIÓN VEGETAL
   */
  getPlantNutritionTerminology() {
    return {
      absorcion_radicular: "Proceso de absorción de nutrientes por las raíces",
      transporte_xilematico: "Transporte de nutrientes por el xilema",
      transporte_floematico: "Transporte de nutrientes por el floema",
      asimilacion: "Conversión de nutrientes en formas utilizables por la planta",
      redistribucion: "Movimiento de nutrientes dentro de la planta",
      deficiencia_nutricional: "Falta de un nutriente esencial",
      toxicidad_nutricional: "Exceso de un nutriente que causa daño",
      balance_nutricional: "Equilibrio entre nutrientes en la planta",
      eficiencia_nutricional: "Capacidad de la planta para utilizar nutrientes"
    };
  }

  /**
   * INTERACCIONES DE NUTRICIÓN VEGETAL
   */
  getPlantNutritionInteractions() {
    return {
      ph_disponibilidad: "El pH del suelo afecta la disponibilidad de nutrientes",
      humedad_absorcion: "La humedad del suelo influye en la absorción de nutrientes",
      temperatura_metabolismo: "La temperatura afecta el metabolismo de nutrientes",
      luz_fotosintesis: "La luz es necesaria para la fotosíntesis y síntesis de nutrientes"
    };
  }

  /**
   * CONCEPTOS DE FERTIRRIEGO
   */
  getFertigationConcepts() {
    return {
      fertirriego: {
        term: "Fertirriego",
        description: "Aplicación de fertilizantes a través del sistema de riego",
        advantages: ["Eficiencia", "Precisión", "Ahorro de mano de obra", "Aplicación uniforme"],
        requirements: ["Sistema de riego adecuado", "Fertilizantes solubles", "Control de pH", "Filtración"]
      },
      inyeccion_fertilizantes: {
        term: "Inyección de Fertilizantes",
        description: "Método de aplicación de fertilizantes en el sistema de riego",
        methods: {
          venturi: "Usa presión diferencial para inyectar fertilizantes",
          bomba_dosificadora: "Bomba que inyecta fertilizantes a presión constante",
          tanque_presion: "Tanque presurizado que inyecta fertilizantes"
        }
      },
      compatibilidad_fertilizantes: {
        term: "Compatibilidad de Fertilizantes",
        description: "Capacidad de los fertilizantes para mezclarse sin reaccionar",
        compatible: ["Nitrato de potasio", "Sulfato de magnesio", "Ácido fosfórico"],
        incompatible: ["Sulfato de amonio + nitrato de calcio", "Fosfatos + calcio"],
        testing: "Prueba de compatibilidad antes de mezclar"
      }
    };
  }

  /**
   * TERMINOLOGÍA DE FERTIRRIEGO
   */
  getFertigationTerminology() {
    return {
      concentracion_fertilizante: "Cantidad de fertilizante por unidad de agua",
      dosis_fertilizante: "Cantidad total de fertilizante aplicada",
      frecuencia_aplicacion: "Intervalo entre aplicaciones de fertilizantes",
      tiempo_aplicacion: "Duración de la aplicación de fertilizantes",
      orden_aplicacion: "Secuencia de aplicación de diferentes fertilizantes",
      lavado_sistema: "Limpieza del sistema después de aplicar fertilizantes",
      ph_solucion: "pH de la solución de fertilizantes",
      conductividad_solucion: "Conductividad eléctrica de la solución"
    };
  }

  /**
   * INTERACCIONES DE FERTIRRIEGO
   */
  getFertigationInteractions() {
    return {
      ph_absorcion: "El pH de la solución afecta la absorción de nutrientes",
      conductividad_tolerancia: "La conductividad debe estar dentro de la tolerancia del cultivo",
      orden_aplicacion_compatibilidad: "El orden de aplicación evita incompatibilidades",
      tiempo_contacto_absorcion: "El tiempo de contacto influye en la absorción"
    };
  }

  /**
   * EXPANDIR CONOCIMIENTO PARA NUEVA PESTAÑA
   */
  expandKnowledgeForTab(tabName, tabData) {
    console.log(`🧠 Expandiendo conocimiento para pestaña: ${tabName}`);
    
    // Crear módulo específico para la nueva pestaña
    const newModule = this.createModuleForTab(tabName, tabData);
    
    // Agregar al sistema de IA
    this.addModuleToAI(newModule);
    
    // Actualizar progreso de aprendizaje
    this.updateLearningProgress(tabName, tabData);
    
    // Generar respuestas contextuales
    this.generateContextualResponses(tabName, tabData);
  }

  /**
   * CREAR MÓDULO PARA NUEVA PESTAÑA
   */
  createModuleForTab(tabName, tabData) {
    const module = {
      name: tabName,
      priority: this.expansionModules.size + 1,
      concepts: this.extractConceptsFromData(tabData),
      terminology: this.extractTerminologyFromData(tabData),
      interactions: this.identifyInteractions(tabData),
      data: tabData,
      created: new Date().toISOString()
    };

    this.expansionModules.set(tabName.toLowerCase().replace(/\s+/g, '_'), module);
    return module;
  }

  /**
   * EXTRAER CONCEPTOS DE LOS DATOS
   */
  extractConceptsFromData(tabData) {
    const concepts = {};
    
    // Analizar datos para extraer conceptos
    if (tabData.nutrients) {
      concepts.nutrientes = this.analyzeNutrientConcepts(tabData.nutrients);
    }
    
    if (tabData.fertilizers) {
      concepts.fertilizantes = this.analyzeFertilizerConcepts(tabData.fertilizers);
    }
    
    if (tabData.crops) {
      concepts.cultivos = this.analyzeCropConcepts(tabData.crops);
    }
    
    return concepts;
  }

  /**
   * ANALIZAR CONCEPTOS DE NUTRIENTES
   */
  analyzeNutrientConcepts(nutrients) {
    const concepts = {};
    
    Object.entries(nutrients).forEach(([nutrient, data]) => {
      concepts[nutrient] = {
        term: nutrient,
        description: data.description || `Información sobre ${nutrient}`,
        functions: data.functions || [],
        deficiency_symptoms: data.deficiency_symptoms || [],
        sources: data.sources || [],
        optimal_levels: data.optimal_levels || {}
      };
    });
    
    return concepts;
  }

  /**
   * ANALIZAR CONCEPTOS DE FERTILIZANTES
   */
  analyzeFertilizerConcepts(fertilizers) {
    const concepts = {};
    
    Object.entries(fertilizers).forEach(([fertilizer, data]) => {
      concepts[fertilizer] = {
        term: fertilizer,
        description: data.description || `Información sobre ${fertilizer}`,
        formula: data.formula || '',
        composition: data.composition || {},
        application: data.application || {},
        compatibility: data.compatibility || []
      };
    });
    
    return concepts;
  }

  /**
   * ANALIZAR CONCEPTOS DE CULTIVOS
   */
  analyzeCropConcepts(crops) {
    const concepts = {};
    
    Object.entries(crops).forEach(([crop, data]) => {
      concepts[crop] = {
        term: crop,
        description: data.description || `Información sobre ${crop}`,
        requirements: data.requirements || {},
        growth_stages: data.growth_stages || {},
        common_problems: data.common_problems || {}
      };
    });
    
    return concepts;
  }

  /**
   * AGREGAR MÓDULO AL SISTEMA DE IA
   */
  addModuleToAI(module) {
    // Integrar conceptos en la base de conocimiento
    if (!this.ai.knowledgeBase.expansion_modules) {
      this.ai.knowledgeBase.expansion_modules = {};
    }
    
    this.ai.knowledgeBase.expansion_modules[module.name] = {
      concepts: module.concepts,
      terminology: module.terminology,
      interactions: module.interactions
    };
    
    console.log(`✅ Módulo ${module.name} agregado al sistema de IA`);
  }

  /**
   * ACTUALIZAR PROGRESO DE APRENDIZAJE
   */
  updateLearningProgress(tabName, tabData) {
    const progress = {
      tab: tabName,
      concepts_learned: Object.keys(this.extractConceptsFromData(tabData)).length,
      terminology_learned: Object.keys(this.extractTerminologyFromData(tabData)).length,
      interactions_identified: Object.keys(this.identifyInteractions(tabData)).length,
      last_update: new Date().toISOString()
    };
    
    this.learningProgress.set(tabName, progress);
    
    console.log(`📈 Progreso de aprendizaje actualizado para ${tabName}:`, progress);
  }

  /**
   * GENERAR RESPUESTAS CONTEXTUALES
   */
  generateContextualResponses(tabName, tabData) {
    const responses = [];
    
    // Generar respuestas para conceptos comunes
    const concepts = this.extractConceptsFromData(tabData);
    
    Object.entries(concepts).forEach(([concept, data]) => {
      responses.push({
        pattern: new RegExp(`\\b${concept}\\b`, 'i'),
        response: this.generateConceptResponse(concept, data),
        priority: 1
      });
    });
    
    // Agregar respuestas al sistema de IA
    this.addContextualResponses(tabName, responses);
  }

  /**
   * GENERAR RESPUESTA PARA CONCEPTO
   */
  generateConceptResponse(concept, data) {
    let response = `**${concept.toUpperCase()}**\n\n`;
    
    if (data.description) {
      response += `**Descripción:** ${data.description}\n\n`;
    }
    
    if (data.functions && data.functions.length > 0) {
      response += `**Funciones:**\n`;
      data.functions.forEach(func => {
        response += `• ${func}\n`;
      });
      response += '\n';
    }
    
    if (data.deficiency_symptoms && data.deficiency_symptoms.length > 0) {
      response += `**Síntomas de deficiencia:**\n`;
      data.deficiency_symptoms.forEach(symptom => {
        response += `• ${symptom}\n`;
      });
      response += '\n';
    }
    
    return response;
  }

  /**
   * AGREGAR RESPUESTAS CONTEXTUALES
   */
  addContextualResponses(tabName, responses) {
    if (!this.ai.contextualResponses) {
      this.ai.contextualResponses = new Map();
    }
    
    this.ai.contextualResponses.set(tabName, responses);
    console.log(`✅ ${responses.length} respuestas contextuales agregadas para ${tabName}`);
  }

  /**
   * OBTENER ESTADÍSTICAS DE EXPANSIÓN
   */
  getExpansionStats() {
    const stats = {
      total_modules: this.expansionModules.size,
      total_concepts: 0,
      total_terminology: 0,
      total_interactions: 0,
      learning_progress: Array.from(this.learningProgress.values())
    };
    
    this.expansionModules.forEach(module => {
      stats.total_concepts += Object.keys(module.concepts).length;
      stats.total_terminology += Object.keys(module.terminology).length;
      stats.total_interactions += Object.keys(module.interactions).length;
    });
    
    return stats;
  }

  /**
   * MÉTODOS AUXILIARES
   */
  extractTerminologyFromData(tabData) {
    // Implementar extracción de terminología
    return {};
  }

  identifyInteractions(tabData) {
    // Implementar identificación de interacciones
    return {};
  }

  // Métodos para otros módulos (simplificados por brevedad)
  getCropManagementConcepts() { return {}; }
  getCropManagementTerminology() { return {}; }
  getCropManagementInteractions() { return {}; }
  getFoliarDiagnosisConcepts() { return {}; }
  getFoliarDiagnosisTerminology() { return {}; }
  getFoliarDiagnosisInteractions() { return {}; }
  getPestDiseaseConcepts() { return {}; }
  getPestDiseaseTerminology() { return {}; }
  getPestDiseaseInteractions() { return {}; }
}

// Exportar para uso global
window.KnowledgeExpansion = KnowledgeExpansion;



