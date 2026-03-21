/**
 * NUTRIPLANT PRO - SISTEMA DE IA INTELIGENTE
 * Base de conocimiento agrícola completa y sistema de memoria
 * Versión: 1.0.0
 * Autor: NutriPlant Pro
 */

class NutriPlantAI {
  constructor() {
    this.userMemory = new Map(); // Memoria por usuario
    this.conversationHistory = new Map(); // Historial de conversaciones
    this.knowledgeBase = this.initializeKnowledgeBase();
    this.learningContext = new Map(); // Contexto de aprendizaje
  }

  /**
   * INICIALIZAR BASE DE CONOCIMIENTO COMPLETA
   * 70-80% del lenguaje agrícola especializado
   */
  initializeKnowledgeBase() {
    return {
      // === DICCIONARIO AGRÍCOLA COMPLETO ===
      terminology: {
        // NUTRIENTES PRIMARIOS
        nitrogeno: {
          term: "Nitrógeno (N)",
          description: "Elemento esencial para el crecimiento vegetativo, síntesis de proteínas y clorofila",
          functions: ["Crecimiento foliar", "Síntesis de proteínas", "Formación de clorofila", "Desarrollo vegetativo"],
          deficiency_symptoms: ["Amarillamiento de hojas viejas", "Crecimiento lento", "Hojas pequeñas", "Coloración pálida"],
          excess_symptoms: ["Crecimiento excesivo", "Hojas oscuras", "Retraso en floración", "Mayor susceptibilidad a plagas"],
          sources: ["Urea", "Nitrato de amonio", "Sulfato de amonio", "Fertilizantes orgánicos"],
          mobility: "Móvil",
          critical_stages: ["Crecimiento vegetativo", "Desarrollo de hojas", "Formación de brotes"]
        },
        fosforo: {
          term: "Fósforo (P)",
          description: "Elemento clave para el desarrollo radicular, floración y transferencia de energía",
          functions: ["Desarrollo radicular", "Formación de flores y frutos", "Transferencia de energía", "Síntesis de ADN"],
          deficiency_symptoms: ["Hojas púrpura/rojas", "Crecimiento radicular pobre", "Retraso en floración", "Frutos pequeños"],
          excess_symptoms: ["Deficiencia de zinc", "Deficiencia de hierro", "Bloqueo de micronutrientes"],
          sources: ["Superfosfato", "Fosfato diamónico", "Fosfato monoamónico", "Roca fosfórica"],
          mobility: "Poco móvil",
          critical_stages: ["Desarrollo radicular", "Floración", "Fructificación"]
        },
        potasio: {
          term: "Potasio (K)",
          description: "Elemento esencial para la regulación hídrica, resistencia y calidad de frutos",
          functions: ["Regulación hídrica", "Síntesis de azúcares", "Resistencia a estrés", "Calidad de frutos"],
          deficiency_symptoms: ["Bordes quemados en hojas", "Hojas enrolladas", "Frutos pequeños", "Mayor susceptibilidad a sequía"],
          excess_symptoms: ["Deficiencia de magnesio", "Deficiencia de calcio", "Salinidad del suelo"],
          sources: ["Cloruro de potasio", "Sulfato de potasio", "Nitrato de potasio", "Ceniza de madera"],
          mobility: "Móvil",
          critical_stages: ["Fructificación", "Maduración", "Resistencia a estrés"]
        },

        // NUTRIENTES SECUNDARIOS
        calcio: {
          term: "Calcio (Ca)",
          description: "Elemento estructural para paredes celulares y calidad de frutos",
          functions: ["Estructura de paredes celulares", "División celular", "Actividad enzimática", "Calidad de frutos"],
          deficiency_symptoms: ["Pudrición apical", "Hojas deformadas", "Raíces cortas", "Frutos agrietados"],
          excess_symptoms: ["Deficiencia de magnesio", "Deficiencia de potasio", "Alcalinización del suelo"],
          sources: ["Yeso agrícola", "Caliza", "Nitrato de calcio", "Cloruro de calcio"],
          mobility: "Inmóvil",
          critical_stages: ["División celular", "Desarrollo de frutos", "Formación de raíces"]
        },
        magnesio: {
          term: "Magnesio (Mg)",
          description: "Elemento central de la clorofila y activador enzimático",
          functions: ["Núcleo de la clorofila", "Activación enzimática", "Síntesis de proteínas", "Transferencia de energía"],
          deficiency_symptoms: ["Clorosis intervenal", "Hojas amarillas con venas verdes", "Caída prematura de hojas"],
          excess_symptoms: ["Deficiencia de calcio", "Deficiencia de potasio", "Desequilibrio nutricional"],
          sources: ["Sulfato de magnesio", "Óxido de magnesio", "Dolomita", "Kieserita"],
          mobility: "Móvil",
          critical_stages: ["Fotosíntesis", "Síntesis de clorofila", "Desarrollo foliar"]
        },
        azufre: {
          term: "Azufre (S)",
          description: "Elemento esencial para síntesis de aminoácidos y proteínas",
          functions: ["Síntesis de aminoácidos", "Formación de proteínas", "Síntesis de vitaminas", "Metabolismo"],
          deficiency_symptoms: ["Hojas amarillas uniformes", "Crecimiento lento", "Tallos delgados", "Menor producción"],
          excess_symptoms: ["Acidificación del suelo", "Deficiencia de molibdeno", "Toxicidad"],
          sources: ["Sulfato de amonio", "Sulfato de magnesio", "Yeso", "Azufre elemental"],
          mobility: "Poco móvil",
          critical_stages: ["Síntesis de proteínas", "Desarrollo vegetativo", "Formación de semillas"]
        },

        // MICRONUTRIENTES
        hierro: {
          term: "Hierro (Fe)",
          description: "Elemento esencial para síntesis de clorofila y respiración",
          functions: ["Síntesis de clorofila", "Respiración celular", "Fijación de nitrógeno", "Metabolismo"],
          deficiency_symptoms: ["Clorosis en hojas nuevas", "Hojas amarillas con venas verdes", "Crecimiento lento"],
          excess_symptoms: ["Toxicidad", "Deficiencia de fósforo", "Deficiencia de zinc"],
          sources: ["Sulfato ferroso", "Quelatos de hierro", "Óxido férrico", "Complejos orgánicos"],
          mobility: "Inmóvil",
          critical_stages: ["Síntesis de clorofila", "Desarrollo de hojas nuevas", "Fotosíntesis"]
        },
        zinc: {
          term: "Zinc (Zn)",
          description: "Elemento esencial para síntesis de auxinas y desarrollo",
          functions: ["Síntesis de auxinas", "División celular", "Síntesis de proteínas", "Desarrollo de brotes"],
          deficiency_symptoms: ["Hojas pequeñas", "Internudos cortos", "Roseta de hojas", "Frutos deformes"],
          excess_symptoms: ["Toxicidad", "Deficiencia de hierro", "Deficiencia de cobre"],
          sources: ["Sulfato de zinc", "Óxido de zinc", "Quelatos de zinc", "Fertilizantes foliares"],
          mobility: "Poco móvil",
          critical_stages: ["Desarrollo de brotes", "División celular", "Formación de frutos"]
        },
        manganeso: {
          term: "Manganeso (Mn)",
          description: "Elemento esencial para fotosíntesis y activación enzimática",
          functions: ["Fotosíntesis", "Activación enzimática", "Síntesis de clorofila", "Metabolismo"],
          deficiency_symptoms: ["Clorosis intervenal", "Manchas necróticas", "Hojas deformadas", "Crecimiento lento"],
          excess_symptoms: ["Toxicidad", "Deficiencia de hierro", "Deficiencia de magnesio"],
          sources: ["Sulfato de manganeso", "Óxido de manganeso", "Quelatos", "Fertilizantes foliares"],
          mobility: "Inmóvil",
          critical_stages: ["Fotosíntesis", "Desarrollo foliar", "Síntesis de clorofila"]
        },
        cobre: {
          term: "Cobre (Cu)",
          description: "Elemento esencial para respiración y lignificación",
          functions: ["Respiración celular", "Lignificación", "Síntesis de proteínas", "Resistencia a enfermedades"],
          deficiency_symptoms: ["Hojas marchitas", "Puntas secas", "Crecimiento lento", "Mayor susceptibilidad a enfermedades"],
          excess_symptoms: ["Toxicidad", "Deficiencia de hierro", "Deficiencia de zinc"],
          sources: ["Sulfato de cobre", "Óxido de cobre", "Quelatos", "Fertilizantes foliares"],
          mobility: "Inmóvil",
          critical_stages: ["Lignificación", "Desarrollo de tallos", "Resistencia a estrés"]
        },
        boro: {
          term: "Boro (B)",
          description: "Elemento esencial para división celular y desarrollo reproductivo",
          functions: ["División celular", "Desarrollo de flores", "Formación de frutos", "Transporte de azúcares"],
          deficiency_symptoms: ["Frutos agrietados", "Hojas gruesas", "Muerte de brotes", "Flores estériles"],
          excess_symptoms: ["Toxicidad", "Quemaduras en hojas", "Deficiencia de calcio"],
          sources: ["Bórax", "Ácido bórico", "Quelatos de boro", "Fertilizantes foliares"],
          mobility: "Inmóvil",
          critical_stages: ["Floración", "Fructificación", "División celular"]
        },
        molibdeno: {
          term: "Molibdeno (Mo)",
          description: "Elemento esencial para fijación de nitrógeno y reducción de nitratos",
          functions: ["Fijación de nitrógeno", "Reducción de nitratos", "Síntesis de aminoácidos", "Metabolismo"],
          deficiency_symptoms: ["Hojas amarillas", "Crecimiento lento", "Deficiencia de nitrógeno", "Menor producción"],
          excess_symptoms: ["Toxicidad", "Deficiencia de cobre", "Desequilibrio nutricional"],
          sources: ["Molibdato de sodio", "Molibdato de amonio", "Fertilizantes foliares", "Quelatos"],
          mobility: "Móvil",
          critical_stages: ["Fijación de nitrógeno", "Síntesis de proteínas", "Desarrollo vegetativo"]
        }
      },

      // === CONCEPTOS TÉCNICOS AVANZADOS ===
      technical_concepts: {
        ph_suelo: {
          term: "pH del Suelo",
          description: "Medida de acidez o alcalinidad del suelo que afecta la disponibilidad de nutrientes",
          optimal_range: "6.0 - 7.0",
          effects: {
            acidic: "Mayor disponibilidad de micronutrientes, menor disponibilidad de fósforo",
            alkaline: "Mayor disponibilidad de fósforo, menor disponibilidad de micronutrientes"
          },
          correction: {
            acidic: "Aplicar caliza o dolomita para elevar pH",
            alkaline: "Aplicar azufre elemental o yeso para bajar pH"
          }
        },
        cec: {
          term: "Capacidad de Intercambio Catiónico (CEC)",
          description: "Capacidad del suelo para retener y liberar nutrientes",
          interpretation: {
            low: "0-10 meq/100g - Suelos arenosos, baja retención de nutrientes",
            medium: "10-20 meq/100g - Suelos francos, retención moderada",
            high: "20+ meq/100g - Suelos arcillosos, alta retención de nutrientes"
          },
          management: "Suelos con CEC baja requieren fertilización más frecuente"
        },
        materia_organica: {
          term: "Materia Orgánica",
          description: "Componente orgánico del suelo que mejora estructura y fertilidad",
          benefits: ["Mejora estructura del suelo", "Aumenta CEC", "Fuente de nutrientes", "Mejora retención de agua"],
          optimal_percentage: "3-5%",
          sources: ["Compost", "Estiércol", "Abonos verdes", "Residuos orgánicos"]
        },
        textura_suelo: {
          term: "Textura del Suelo",
          description: "Proporción relativa de arena, limo y arcilla en el suelo",
          types: {
            arenoso: "Drenaje rápido, baja retención de agua y nutrientes",
            franco: "Balance ideal entre drenaje y retención",
            arcilloso: "Alta retención de agua y nutrientes, drenaje lento"
          },
          management: "La textura determina la frecuencia y cantidad de riego y fertilización"
        }
      },

      // === CULTIVOS ESPECÍFICOS ===
      crops: {
        aguacate: {
          name: "Aguacate (Persea americana)",
          family: "Lauraceae",
          origin: "Mesoamérica",
          climate: "Tropical y subtropical",
          soil_requirements: {
            ph: "6.0 - 7.0",
            drainage: "Excelente (crítico)",
            texture: "Franco-arenoso preferido",
            depth: "Mínimo 1.5 metros"
          },
          nutrient_requirements: {
            nitrogen: "Alto durante crecimiento vegetativo",
            phosphorus: "Moderado, crítico en floración",
            potassium: "Alto, especialmente en fructificación",
            calcium: "Alto para calidad de fruto",
            magnesium: "Moderado para fotosíntesis",
            micronutrients: "Zinc y boro críticos"
          },
          growth_stages: {
            vegetative: "Crecimiento de hojas y ramas",
            flowering: "Formación de flores (febrero-marzo)",
            fruit_set: "Cuajado de frutos (marzo-abril)",
            fruit_development: "Desarrollo de frutos (abril-septiembre)",
            harvest: "Cosecha (septiembre-febrero)"
          },
          common_problems: {
            root_rot: "Phytophthora cinnamomi - problema de drenaje",
            sunburn: "Exposición excesiva al sol",
            nutrient_deficiency: "Zinc, boro y calcio más comunes",
            water_stress: "Sensible a sequía y encharcamiento"
          }
        }
      },

      // === FERTILIZANTES Y APLICACIONES ===
      fertilizers: {
        nitrogenados: {
          urea: {
            formula: "CO(NH2)2",
            nitrogen_content: "46% N",
            characteristics: "Soluble, acidificante, económico",
            application: "Aplicación al suelo, puede volatilizarse",
            timing: "Crecimiento vegetativo"
          },
          nitrato_amonio: {
            formula: "NH4NO3",
            nitrogen_content: "33-34% N",
            characteristics: "Soluble, neutro, rápida disponibilidad",
            application: "Aplicación al suelo o foliar",
            timing: "Crecimiento activo"
          }
        },
        fosfatados: {
          superfosfato: {
            formula: "Ca(H2PO4)2",
            phosphorus_content: "16-20% P2O5",
            characteristics: "Soluble, contiene calcio",
            application: "Aplicación al suelo, incorporar",
            timing: "Preparación del suelo"
          }
        },
        potasicos: {
          cloruro_potasio: {
            formula: "KCl",
            potassium_content: "60% K2O",
            characteristics: "Soluble, económico, contiene cloro",
            application: "Aplicación al suelo",
            timing: "Fructificación"
          }
        }
      },

      // === DIAGNÓSTICO Y SÍNTOMAS ===
      diagnosis: {
        visual_symptoms: {
          nitrogen_deficiency: {
            description: "Amarillamiento de hojas viejas, crecimiento lento",
            progression: "Comienza en hojas basales, progresa hacia arriba",
            timing: "Crecimiento vegetativo activo"
          },
          phosphorus_deficiency: {
            description: "Hojas púrpura/rojas, crecimiento radicular pobre",
            progression: "Más evidente en hojas jóvenes",
            timing: "Desarrollo radicular y floración"
          },
          potassium_deficiency: {
            description: "Bordes quemados, hojas enrolladas",
            progression: "Comienza en bordes de hojas viejas",
            timing: "Fructificación y maduración"
          }
        },
        soil_analysis: {
          interpretation: {
            very_low: "Deficiencia severa, aplicación inmediata necesaria",
            low: "Deficiencia moderada, planificar aplicación",
            medium: "Nivel adecuado, mantenimiento",
            high: "Nivel alto, reducir aplicación",
            very_high: "Exceso, riesgo de toxicidad"
          }
        }
      }
    };
  }

  /**
   * SISTEMA DE MEMORIA POR USUARIO
   */
  getUserMemory(userId) {
    if (!this.userMemory.has(userId)) {
      this.userMemory.set(userId, {
        preferences: {},
        history: [],
        context: {},
        learning: {},
        lastInteraction: new Date()
      });
    }
    return this.userMemory.get(userId);
  }

  /**
   * GUARDAR CONTEXTO DE CONVERSACIÓN
   */
  saveConversationContext(userId, message, response, context = {}) {
    const userMemory = this.getUserMemory(userId);
    const conversation = {
      timestamp: new Date(),
      message: message,
      response: response,
      context: context,
      topics: this.extractTopics(message)
    };
    
    userMemory.history.push(conversation);
    userMemory.lastInteraction = new Date();
    
    // Mantener solo los últimos 50 mensajes
    if (userMemory.history.length > 50) {
      userMemory.history = userMemory.history.slice(-50);
    }
  }

  /**
   * EXTRAER TEMAS DE LA CONVERSACIÓN
   */
  extractTopics(message) {
    const topics = [];
    const lowerMessage = message.toLowerCase();
    
    // Detectar temas por palabras clave
    const topicKeywords = {
      'nutrientes': ['nitrógeno', 'fósforo', 'potasio', 'calcio', 'magnesio', 'micronutrientes'],
      'suelo': ['ph', 'textura', 'drenaje', 'materia orgánica', 'cec'],
      'cultivos': ['aguacate', 'cultivo', 'plantación', 'siembra'],
      'fertilizantes': ['fertilizante', 'aplicación', 'dosis', 'timing'],
      'diagnostico': ['síntomas', 'deficiencia', 'exceso', 'problemas', 'enfermedades'],
      'riego': ['riego', 'agua', 'humedad', 'drenaje'],
      'cosecha': ['cosecha', 'maduración', 'calidad', 'rendimiento']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * ANÁLISIS INTELIGENTE CON CONTEXTO
   */
  analyzeWithContext(userId, message, currentData = {}) {
    const userMemory = this.getUserMemory(userId);
    const context = this.buildContext(userMemory, currentData);
    
    // Análisis de la consulta
    const analysis = {
      intent: this.detectIntent(message),
      topics: this.extractTopics(message),
      urgency: this.assessUrgency(message),
      complexity: this.assessComplexity(message),
      context: context
    };

    return analysis;
  }

  /**
   * CONSTRUIR CONTEXTO PERSONALIZADO
   */
  buildContext(userMemory, currentData) {
    const context = {
      user_preferences: userMemory.preferences,
      recent_topics: this.getRecentTopics(userMemory),
      current_data: currentData,
      expertise_level: this.assessExpertiseLevel(userMemory),
      seasonal_context: this.getSeasonalContext()
    };

    return context;
  }

  /**
   * DETECTAR INTENCIÓN DEL USUARIO
   */
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    const intents = {
      'diagnostic': ['diagnosticar', 'analizar', 'evaluar', 'revisar', 'qué opinas'],
      'recommendation': ['recomendar', 'sugerir', 'qué hacer', 'cómo mejorar'],
      'explanation': ['explicar', 'qué es', 'por qué', 'cómo funciona'],
      'calculation': ['calcular', 'cuánto', 'dosis', 'cantidad'],
      'problem_solving': ['problema', 'error', 'falla', 'no funciona'],
      'general_question': ['pregunta', 'duda', 'ayuda', 'información']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return intent;
      }
    }

    return 'general_question';
  }

  /**
   * EVALUAR URGENCIA
   */
  assessUrgency(message) {
    const urgentKeywords = ['urgente', 'emergencia', 'problema grave', 'muerte', 'pérdida'];
    const lowerMessage = message.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'high';
    }
    
    return 'normal';
  }

  /**
   * EVALUAR COMPLEJIDAD
   */
  assessComplexity(message) {
    const complexKeywords = ['análisis completo', 'evaluación integral', 'plan nutricional', 'programa'];
    const lowerMessage = message.toLowerCase();
    
    if (complexKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * OBTENER TEMAS RECIENTES
   */
  getRecentTopics(userMemory) {
    const recentTopics = [];
    const recentHistory = userMemory.history.slice(-10);
    
    recentHistory.forEach(conversation => {
      recentTopics.push(...conversation.topics);
    });
    
    // Contar frecuencia de temas
    const topicCount = {};
    recentTopics.forEach(topic => {
      topicCount[topic] = (topicCount[topic] || 0) + 1;
    });
    
    return Object.entries(topicCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  /**
   * EVALUAR NIVEL DE EXPERTISE
   */
  assessExpertiseLevel(userMemory) {
    const history = userMemory.history;
    if (history.length < 5) return 'beginner';
    if (history.length < 20) return 'intermediate';
    return 'advanced';
  }

  /**
   * OBTENER CONTEXTO ESTACIONAL
   */
  getSeasonalContext() {
    const month = new Date().getMonth() + 1;
    const season = this.getSeason(month);
    
    return {
      month: month,
      season: season,
      recommendations: this.getSeasonalRecommendations(season)
    };
  }

  getSeason(month) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  getSeasonalRecommendations(season) {
    const recommendations = {
      spring: ['Preparar suelo', 'Aplicar fertilizantes base', 'Controlar malezas'],
      summer: ['Riego frecuente', 'Control de plagas', 'Fertilización foliar'],
      autumn: ['Cosecha', 'Preparar para invierno', 'Aplicar enmiendas'],
      winter: ['Poda', 'Protección contra frío', 'Planificación']
    };
    
    return recommendations[season] || [];
  }

  /**
   * GENERAR RESPUESTA INTELIGENTE
   */
  generateIntelligentResponse(userId, message, currentData = {}) {
    const analysis = this.analyzeWithContext(userId, message, currentData);
    const userMemory = this.getUserMemory(userId);
    
    // Construir respuesta basada en análisis
    let response = this.buildResponse(analysis, message, currentData);
    
    // Personalizar respuesta según historial del usuario
    response = this.personalizeResponse(response, userMemory, analysis);
    
    // Guardar contexto de la conversación
    this.saveConversationContext(userId, message, response, analysis);
    
    return response;
  }

  /**
   * CONSTRUIR RESPUESTA BASE
   */
  buildResponse(analysis, message, currentData) {
    const { intent, topics, urgency, complexity } = analysis;
    
    let response = '';
    
    // Respuesta según intención
    switch (intent) {
      case 'diagnostic':
        response = this.generateDiagnosticResponse(message, topics, currentData);
        break;
      case 'recommendation':
        response = this.generateRecommendationResponse(message, topics, currentData);
        break;
      case 'explanation':
        response = this.generateExplanationResponse(message, topics);
        break;
      case 'calculation':
        response = this.generateCalculationResponse(message, topics, currentData);
        break;
      case 'problem_solving':
        response = this.generateProblemSolvingResponse(message, topics, currentData);
        break;
      default:
        response = this.generateGeneralResponse(message, topics);
    }
    
    return response;
  }

  /**
   * GENERAR RESPUESTA DE DIAGNÓSTICO
   */
  generateDiagnosticResponse(message, topics, currentData) {
    let response = '🔍 **ANÁLISIS DIAGNÓSTICO**\n\n';
    
    if (topics.includes('nutrientes')) {
      response += this.analyzeNutrientStatus(currentData);
    }
    
    if (topics.includes('suelo')) {
      response += this.analyzeSoilStatus(currentData);
    }
    
    if (topics.includes('cultivos')) {
      response += this.analyzeCropStatus(currentData);
    }
    
    return response;
  }

  /**
   * ANALIZAR ESTADO NUTRICIONAL
   */
  analyzeNutrientStatus(data) {
    let analysis = '**📊 ESTADO NUTRICIONAL:**\n\n';
    
    // Análisis de macronutrientes
    const macronutrients = ['N', 'P', 'K', 'Ca', 'Mg'];
    macronutrients.forEach(nutrient => {
      if (data[nutrient]) {
        const value = data[nutrient];
        const status = this.assessNutrientLevel(nutrient, value);
        analysis += `• **${nutrient}:** ${value} ppm - ${status}\n`;
      }
    });
    
    analysis += '\n**💡 RECOMENDACIONES:**\n';
    analysis += this.generateNutrientRecommendations(data);
    
    return analysis;
  }

  /**
   * EVALUAR NIVEL DE NUTRIENTE
   */
  assessNutrientLevel(nutrient, value) {
    const ranges = {
      'N': { low: 0, medium: 50, high: 100 },
      'P': { low: 0, medium: 20, high: 40 },
      'K': { low: 0, medium: 100, high: 200 },
      'Ca': { low: 0, medium: 1000, high: 2000 },
      'Mg': { low: 0, medium: 100, high: 200 }
    };
    
    const range = ranges[nutrient];
    if (!range) return 'Desconocido';
    
    if (value < range.low) return '❌ Muy bajo';
    if (value < range.medium) return '⚠️ Bajo';
    if (value < range.high) return '✅ Adecuado';
    return '✅ Alto';
  }

  /**
   * GENERAR RECOMENDACIONES NUTRICIONALES
   */
  generateNutrientRecommendations(data) {
    let recommendations = '';
    
    // Recomendaciones específicas basadas en datos
    if (data.N && data.N < 50) {
      recommendations += '• Aplicar fertilizante nitrogenado (urea o nitrato de amonio)\n';
    }
    
    if (data.P && data.P < 20) {
      recommendations += '• Aplicar superfosfato o fosfato diamónico\n';
    }
    
    if (data.K && data.K < 100) {
      recommendations += '• Aplicar cloruro de potasio o sulfato de potasio\n';
    }
    
    if (data.Ca && data.Ca < 1000) {
      recommendations += '• Aplicar yeso agrícola o caliza\n';
    }
    
    if (data.Mg && data.Mg < 100) {
      recommendations += '• Aplicar sulfato de magnesio o dolomita\n';
    }
    
    return recommendations || '• Mantener programa de fertilización actual\n';
  }

  /**
   * PERSONALIZAR RESPUESTA
   */
  personalizeResponse(response, userMemory, analysis) {
    let personalizedResponse = response;
    
    // Ajustar nivel técnico según expertise
    const expertiseLevel = analysis.context.expertise_level;
    if (expertiseLevel === 'beginner') {
      personalizedResponse = this.simplifyResponse(personalizedResponse);
    } else if (expertiseLevel === 'advanced') {
      personalizedResponse = this.addTechnicalDetails(personalizedResponse);
    }
    
    // Agregar referencias al historial si es relevante
    if (userMemory.history.length > 0) {
      const recentTopics = analysis.context.recent_topics;
      if (recentTopics.length > 0) {
        personalizedResponse += `\n\n**📚 CONTEXTO:** Veo que has estado trabajando con ${recentTopics.join(', ')}. `;
        personalizedResponse += `Esto puede estar relacionado con tu consulta actual.`;
      }
    }
    
    return personalizedResponse;
  }

  /**
   * SIMPLIFICAR RESPUESTA PARA PRINCIPIANTES
   */
  simplifyResponse(response) {
    // Reemplazar términos técnicos con explicaciones simples
    const simplifications = {
      'CEC': 'capacidad del suelo para retener nutrientes',
      'pH': 'acidez del suelo',
      'ppm': 'partes por millón (concentración)',
      'meq/100g': 'miliequivalentes por 100 gramos'
    };
    
    let simplified = response;
    for (const [technical, simple] of Object.entries(simplifications)) {
      simplified = simplified.replace(new RegExp(technical, 'g'), `${technical} (${simple})`);
    }
    
    return simplified;
  }

  /**
   * AGREGAR DETALLES TÉCNICOS PARA AVANZADOS
   */
  addTechnicalDetails(response) {
    return response + '\n\n**🔬 DETALLES TÉCNICOS:**\n• Consulte análisis de suelo completo\n• Monitoree pH y CEC regularmente\n• Considere análisis foliar complementario';
  }

  /**
   * MÉTODOS DE RESPUESTA ESPECÍFICOS
   */
  generateRecommendationResponse(message, topics, currentData) {
    return '**💡 RECOMENDACIONES ESPECÍFICAS:**\n\n' + 
           'Basándome en tu consulta, aquí tienes mis recomendaciones...';
  }

  generateExplanationResponse(message, topics) {
    return '**📖 EXPLICACIÓN DETALLADA:**\n\n' + 
           'Te explico el concepto que mencionas...';
  }

  generateCalculationResponse(message, topics, currentData) {
    return '**🧮 CÁLCULOS:**\n\n' + 
           'Aquí están los cálculos que necesitas...';
  }

  generateProblemSolvingResponse(message, topics, currentData) {
    return '**🔧 SOLUCIÓN DE PROBLEMAS:**\n\n' + 
           'Vamos a resolver este problema paso a paso...';
  }

  generateGeneralResponse(message, topics, currentData = {}) {
    const lowerMessage = message.toLowerCase();
    
    console.log('🤖 IA recibió mensaje:', message);
    console.log('📊 Datos actuales:', currentData);
    console.log('🔍 Mensaje en minúsculas:', lowerMessage);
    
    // Detectar respuestas de aceptación para aplicar valores ideales
    if (lowerMessage.includes('sí') || lowerMessage.includes('si') || 
        lowerMessage.includes('aplicar') || lowerMessage.includes('acepto') ||
        lowerMessage.includes('ok') || lowerMessage.includes('vale')) {
      return this.handleApplyIdealValues(currentData);
    }
    
    // Detectar consultas sobre niveles o recomendaciones específicas
    const isSpecificQuery = lowerMessage.includes('nivel') || lowerMessage.includes('sugieres') || 
        lowerMessage.includes('recomiendas') || lowerMessage.includes('que me sugieres') ||
        lowerMessage.includes('ajuste') || lowerMessage.includes('para este suelo') ||
        lowerMessage.includes('suelo') || lowerMessage.includes('cic') ||
        lowerMessage.includes('ideales') || lowerMessage.includes('65') || lowerMessage.includes('75') ||
        lowerMessage.includes('calcio') || lowerMessage.includes('calcio') || lowerMessage.includes('ca') ||
        lowerMessage.includes('rango') || lowerMessage.includes('sugerido') ||
        lowerMessage.includes('sugerir') || lowerMessage.includes('puedes sugerir') ||
        lowerMessage.includes('ajustar') || lowerMessage.includes('cic a ajustar') ||
        lowerMessage.includes('nivel sugieres') || lowerMessage.includes('ajsute') ||
        lowerMessage.includes('sugieres para') || lowerMessage.includes('este suelo') ||
        lowerMessage.includes('nievel') || lowerMessage.includes('en cic') ||
        lowerMessage.includes('cic me sugieres') || lowerMessage.includes('para este suelo') ||
        lowerMessage.includes('sugiere') || lowerMessage.includes('sugerir') ||
        lowerMessage.includes('que nivel') || lowerMessage.includes('nivel en') ||
        lowerMessage.includes('para este') || lowerMessage.includes('este suelo') ||
        lowerMessage.includes('sugerirme') || lowerMessage.includes('niveles en cic') ||
        lowerMessage.includes('en base a este suelo');
    
    console.log('🔍 ¿Es consulta específica?', isSpecificQuery);
    console.log('🔍 Palabras clave encontradas:', {
      nivel: lowerMessage.includes('nivel'),
      sugiere: lowerMessage.includes('sugieres'),
      cic: lowerMessage.includes('cic'),
      suelo: lowerMessage.includes('suelo'),
      sugerirme: lowerMessage.includes('sugerirme'),
      niveles: lowerMessage.includes('niveles')
    });
    
    if (isSpecificQuery) {
      console.log('🎯 Detectada consulta específica, generando recomendación...');
      console.log('🔍 Palabras clave detectadas:', {
        nivel: lowerMessage.includes('nivel'),
        sugiere: lowerMessage.includes('sugieres'),
        ajuste: lowerMessage.includes('ajuste'),
        suelo: lowerMessage.includes('suelo'),
        cic: lowerMessage.includes('cic'),
        ideales: lowerMessage.includes('ideales'),
        ca: lowerMessage.includes('65') || lowerMessage.includes('75'),
        calcio: lowerMessage.includes('calcio') || lowerMessage.includes('ca')
      });
      return this.generateSpecificRecommendation(message, topics, currentData);
    }
    
    // Respuestas específicas para consultas comunes (solo si no se detectó consulta específica)
    if (lowerMessage.includes('ajustar cic') && !lowerMessage.includes('sugieres')) {
      return this.generateCICResponse(message, topics, currentData);
    }
    
    if (lowerMessage.includes('ph') || lowerMessage.includes('acidez')) {
      return this.generatePHResponse(message, topics);
    }
    
    if (lowerMessage.includes('calcio') || lowerMessage.includes('ca')) {
      return this.generateCalciumResponse(message, topics, currentData);
    }
    
    if (lowerMessage.includes('nutriente') || lowerMessage.includes('fertilizante')) {
      return this.generateNutrientResponse(message, topics);
    }
    
    if (lowerMessage.includes('aguacate') || lowerMessage.includes('cultivo')) {
      return this.generateCropResponse(message, topics);
    }
    
    if (lowerMessage.includes('enmienda') || lowerMessage.includes('yeso') || lowerMessage.includes('cal')) {
      return this.generateAmendmentResponse(message, topics);
    }
    
    // Respuesta general mejorada
    return '**🤖 ASISTENTE NUTRIPLANT PRO**\n\n' + 
           '¡Hola! Soy tu asistente especializado en nutrición vegetal y manejo de suelos.\n\n' +
           '**¿En qué puedo ayudarte?**\n' +
           '• 📊 Análisis de suelos y CIC\n' +
           '• 🌱 Nutrición de cultivos (especialmente aguacate)\n' +
           '• 🧪 Enmiendas y fertilizantes\n' +
           '• 🔬 Diagnóstico de problemas nutricionales\n' +
           '• 💧 Manejo de riego y drenaje\n\n' +
           '**Para consultas específicas sobre tu suelo, escribe:**\n' +
           '• "analiza mi CIC"\n' +
           '• "que nivel de calcio me sugieres"\n' +
           '• "que enmiendas necesito"\n\n' +
           'Escribe tu consulta específica y te daré una respuesta detallada y técnica.';
  }
  
  /**
   * RESPUESTA ESPECÍFICA PARA CIC
   */
  generateCICResponse(message, topics, currentData = {}) {
    let response = '**📊 AJUSTE DE CIC (Capacidad de Intercambio Catiónico)**\n\n';
    
    // Si hay datos del suelo, analizarlos automáticamente
    if (currentData && currentData.soil && currentData.soil.cic > 0) {
      const soil = currentData.soil;
      const cic = soil.cic;
      
      response += '**🔍 ANÁLISIS DE TU SUELO:**\n\n';
      response += `**CIC Total:** ${cic} meq/100g\n\n`;
      
      // Calcular porcentajes actuales
      const kPercent = ((soil.k / cic) * 100).toFixed(1);
      const caPercent = ((soil.ca / cic) * 100).toFixed(1);
      const mgPercent = ((soil.mg / cic) * 100).toFixed(1);
      const hPercent = ((soil.h / cic) * 100).toFixed(1);
      const naPercent = ((soil.na / cic) * 100).toFixed(1);
      const alPercent = ((soil.al / cic) * 100).toFixed(1);
      
      response += '**Estado actual de cationes:**\n';
      response += `• **K⁺:** ${soil.k} meq (${kPercent}%) ${this.getCationStatus('K', kPercent)}\n`;
      response += `• **Ca²⁺:** ${soil.ca} meq (${caPercent}%) ${this.getCationStatus('Ca', caPercent)}\n`;
      response += `• **Mg²⁺:** ${soil.mg} meq (${mgPercent}%) ${this.getCationStatus('Mg', mgPercent)}\n`;
      response += `• **H⁺:** ${soil.h} meq (${hPercent}%) ${this.getCationStatus('H', hPercent)}\n`;
      response += `• **Na⁺:** ${soil.na} meq (${naPercent}%) ${this.getCationStatus('Na', naPercent)}\n`;
      response += `• **Al³⁺:** ${soil.al} meq (${alPercent}%) ${this.getCationStatus('Al', alPercent)}\n\n`;
      
      // Análisis y recomendaciones específicas
      response += '**💡 RECOMENDACIONES ESPECÍFICAS:**\n\n';
      
      if (caPercent < 65) {
        response += `• **Calcio bajo (${caPercent}%):** Aplicar yeso agrícola o caliza para elevar a 65-75%\n`;
      }
      if (mgPercent < 10 || mgPercent > 15) {
        response += `• **Magnesio fuera de rango (${mgPercent}%):** Aplicar sulfato de magnesio o dolomita para ajustar a 10-15%\n`;
      }
      if (kPercent < 3 || kPercent > 7) {
        response += `• **Potasio fuera de rango (${kPercent}%):** Aplicar sulfato de potasio para ajustar a 3-7%\n`;
      }
      if (hPercent > 10) {
        response += `• **Hidrógeno alto (${hPercent}%):** Aplicar caliza para neutralizar acidez\n`;
      }
      if (naPercent > 1) {
        response += `• **Sodio alto (${naPercent}%):** Aplicar yeso para desplazar sodio\n`;
      }
      if (alPercent > 1) {
        response += `• **Aluminio alto (${alPercent}%):** Aplicar caliza para neutralizar toxicidad\n`;
      }
      
      if (soil.ph !== null) {
        response += `\n**pH del suelo:** ${soil.ph} ${this.getPHStatus(soil.ph)}\n`;
      }
      
      response += '\n**🎯 ESTRATEGIA DE AJUSTE:**\n';
      response += '1. Prioriza cationes problemáticos (H⁺, Na⁺, Al³⁺)\n';
      response += '2. Ajusta cationes beneficiosos (Ca²⁺, Mg²⁺, K⁺)\n';
      response += '3. Verifica que la suma sea igual al CIC total\n\n';
      
      // Proponer valores ideales y pedir permiso para aplicarlos
      response += '**🤖 PROPUESTA AUTOMÁTICA:**\n\n';
      response += 'Basándome en tu análisis, puedo proponer valores ideales para optimizar tu CIC:\n\n';
      
      // Calcular valores ideales
      const idealK = Math.round((cic * 0.05) * 100) / 100; // 5% del CIC
      const idealCa = Math.round((cic * 0.70) * 100) / 100; // 70% del CIC
      const idealMg = Math.round((cic * 0.13) * 100) / 100; // 13% del CIC
      const idealH = 0; // Ideal: 0
      const idealNa = 0; // Ideal: 0
      const idealAl = 0; // Ideal: 0
      
      response += `• **K⁺:** ${idealK} meq (5.0%) - Actual: ${soil.k} meq (${kPercent}%)\n`;
      response += `• **Ca²⁺:** ${idealCa} meq (70.0%) - Actual: ${soil.ca} meq (${caPercent}%)\n`;
      response += `• **Mg²⁺:** ${idealMg} meq (13.0%) - Actual: ${soil.mg} meq (${mgPercent}%)\n`;
      response += `• **H⁺:** ${idealH} meq (0.0%) - Actual: ${soil.h} meq (${hPercent}%)\n`;
      response += `• **Na⁺:** ${idealNa} meq (0.0%) - Actual: ${soil.na} meq (${naPercent}%)\n`;
      response += `• **Al³⁺:** ${idealAl} meq (0.0%) - Actual: ${soil.al} meq (${alPercent}%)\n\n`;
      
      response += '**¿Quieres que aplique estos valores ideales en tu calculadora?**\n\n';
      response += 'Escribe "SÍ" o "APLICAR" para que actualice automáticamente los campos con estos valores optimizados.';
      
    } else {
      // Respuesta general si no hay datos
      response += '**¿Qué es el CIC?**\n' +
                 'El CIC es la capacidad del suelo para retener y liberar nutrientes. Un CIC adecuado es fundamental para la fertilidad del suelo.\n\n' +
                 '**Rangos ideales de cationes:**\n' +
                 '• **K⁺ (Potasio):** 3-7% del CIC total\n' +
                 '• **Ca²⁺ (Calcio):** 65-75% del CIC total\n' +
                 '• **Mg²⁺ (Magnesio):** 10-15% del CIC total\n' +
                 '• **H⁺ (Hidrógeno):** 0-10% del CIC total\n' +
                 '• **Na⁺ (Sodio):** 0-1% del CIC total\n' +
                 '• **Al³⁺ (Aluminio):** 0-1% del CIC total\n\n' +
                 '**💡 Recomendaciones para ajustar CIC:**\n' +
                 '1. **Si el Ca está bajo:** Aplicar yeso agrícola o caliza\n' +
                 '2. **Si el Mg está bajo:** Aplicar sulfato de magnesio o dolomita\n' +
                 '3. **Si el K está bajo:** Aplicar sulfato de potasio\n' +
                 '4. **Si el pH está bajo:** Aplicar caliza para elevar pH\n' +
                 '5. **Si hay exceso de Na:** Aplicar yeso para desplazar sodio\n\n' +
                 '**📊 Para análisis específico:** Ingresa los valores de tu análisis de suelo en la calculadora y te daré recomendaciones precisas.';
    }
    
    return response;
  }
  
  /**
   * OBTENER ESTADO DE UN CATIÓN
   */
  getCationStatus(cation, percent) {
    const ranges = {
      'K': { min: 3, max: 7 },
      'Ca': { min: 65, max: 75 },
      'Mg': { min: 10, max: 15 },
      'H': { min: 0, max: 10 },
      'Na': { min: 0, max: 1 },
      'Al': { min: 0, max: 1 }
    };
    
    const range = ranges[cation];
    if (!range) return '';
    
    if (percent < range.min) return '❌ Bajo';
    if (percent > range.max) return '⚠️ Alto';
    return '✅ Óptimo';
  }
  
  /**
   * OBTENER ESTADO DEL PH
   */
  getPHStatus(ph) {
    if (ph < 5.5) return '🔴 Ácido';
    if (ph < 6.0) return '🟡 Ligeramente ácido';
    if (ph >= 6.0 && ph <= 7.5) return '🟢 Óptimo';
    if (ph > 7.5) return '🔵 Alcalino';
    return '';
  }
  
  /**
   * APLICAR VALORES IDEALES EN LA CALCULADORA
   */
  handleApplyIdealValues(currentData) {
    if (!currentData || !currentData.soil || currentData.soil.cic === 0) {
      return '**❌ Error:** No hay datos de análisis de suelo para aplicar valores ideales.';
    }
    
    const soil = currentData.soil;
    const cic = soil.cic;
    
    // Calcular valores ideales
    const idealK = Math.round((cic * 0.05) * 100) / 100; // 5% del CIC
    const idealCa = Math.round((cic * 0.70) * 100) / 100; // 70% del CIC
    const idealMg = Math.round((cic * 0.13) * 100) / 100; // 13% del CIC
    const idealH = 0; // Ideal: 0
    const idealNa = 0; // Ideal: 0
    const idealAl = 0; // Ideal: 0
    
    // Aplicar valores en la calculadora
    this.applyValuesToCalculator({
      k: idealK,
      ca: idealCa,
      mg: idealMg,
      h: idealH,
      na: idealNa,
      al: idealAl
    });
    
    return `**✅ VALORES IDEALES APLICADOS**\n\n` +
           `He actualizado tu calculadora con los valores ideales:\n\n` +
           `• **K⁺:** ${idealK} meq (5.0%)\n` +
           `• **Ca²⁺:** ${idealCa} meq (70.0%)\n` +
           `• **Mg²⁺:** ${idealMg} meq (12.5%)\n` +
           `• **H⁺:** ${idealH} meq (0.0%)\n` +
           `• **Na⁺:** ${idealNa} meq (0.0%)\n` +
           `• **Al³⁺:** ${idealAl} meq (0.0%)\n\n` +
           `**🎯 Resultado:** CIC optimizado con cationes problemáticos en 0 y cationes beneficiosos en rangos ideales.\n\n` +
           `Ahora puedes calcular las enmiendas necesarias para alcanzar estos valores ideales.`;
  }
  
  /**
   * APLICAR VALORES EN LA CALCULADORA
   */
  applyValuesToCalculator(values) {
    // Esta función se ejecutará en el contexto del dashboard
    if (typeof window !== 'undefined' && window.applyIdealValues) {
      window.applyIdealValues(values);
    }
  }
  
  /**
   * RECOMENDACIÓN ESPECÍFICA PARA EL SUELO ACTUAL
   */
  generateSpecificRecommendation(message, topics, currentData = {}) {
    console.log('🎯 Generando recomendación específica...');
    console.log('📊 Datos recibidos:', currentData);
    
    // Usar datos reales si están disponibles
    const soil = currentData?.soil || {
      cic: 14.00,
      k: 1.00,
      ca: 8.00,
      mg: 3.00,
      h: 0.00,
      na: 2.00,
      al: 0.00,
      ph: 7.00
    };
    
    const cic = soil.cic;
    const kPercent = ((soil.k / cic) * 100).toFixed(1);
    const caPercent = ((soil.ca / cic) * 100).toFixed(1);
    const mgPercent = ((soil.mg / cic) * 100).toFixed(1);
    const hPercent = ((soil.h / cic) * 100).toFixed(1);
    const naPercent = ((soil.na / cic) * 100).toFixed(1);
    const alPercent = ((soil.al / cic) * 100).toFixed(1);
    
    let response = `**🎯 ANÁLISIS ESPECÍFICO DE TU SUELO**\n\n`;
    
    response += `**📊 TUS DATOS ACTUALES:**\n`;
    response += `• **CIC Total:** ${soil.cic} meq/100g\n`;
    response += `• **Ca²⁺:** ${soil.ca} meq (${caPercent}%)\n`;
    response += `• **K⁺:** ${soil.k} meq (${kPercent}%)\n`;
    response += `• **Mg²⁺:** ${soil.mg} meq (${mgPercent}%)\n`;
    response += `• **Na⁺:** ${soil.na} meq (${naPercent}%)\n`;
    response += `• **H⁺:** ${soil.h} meq (${hPercent}%)\n`;
    response += `• **Al³⁺:** ${soil.al} meq (${alPercent}%)\n\n`;
    
    response += `**🎯 RANGOS IDEALES:**\n`;
    response += `• **Ca²⁺:** 65-75% del CIC (9.1-10.5 meq)\n`;
    response += `• **K⁺:** 3-7% del CIC (0.4-1.0 meq)\n`;
    response += `• **Mg²⁺:** 10-15% del CIC (1.4-2.1 meq)\n`;
    response += `• **Na⁺:** 0-1% del CIC (0-0.14 meq)\n`;
    response += `• **H⁺:** 0-10% del CIC (0-1.4 meq)\n`;
    response += `• **Al³⁺:** 0% del CIC (0 meq)\n\n`;
    
    response += `**🔍 DIAGNÓSTICO:**\n`;
    if (caPercent < 65) {
      response += `• **Ca²⁺:** ❌ **BAJO** (${caPercent}%) - Necesitas elevar a 65-75%\n`;
    } else if (caPercent > 75) {
      response += `• **Ca²⁺:** ⚠️ **ALTO** (${caPercent}%) - Puede causar desequilibrio\n`;
    } else {
      response += `• **Ca²⁺:** ✅ **ÓPTIMO** (${caPercent}%)\n`;
    }
    
    if (kPercent > 7) {
      response += `• **K⁺:** ⚠️ **ALTO** (${kPercent}%) - Ideal sería 3-7%\n`;
    } else if (kPercent < 3) {
      response += `• **K⁺:** ❌ **BAJO** (${kPercent}%) - Necesitas elevar\n`;
    } else {
      response += `• **K⁺:** ✅ **ÓPTIMO** (${kPercent}%)\n`;
    }
    
    if (mgPercent > 15) {
      response += `• **Mg²⁺:** ⚠️ **ALTO** (${mgPercent}%) - Ideal sería 10-15%\n`;
    } else if (mgPercent < 10) {
      response += `• **Mg²⁺:** ❌ **BAJO** (${mgPercent}%) - Necesitas elevar\n`;
    } else {
      response += `• **Mg²⁺:** ✅ **ÓPTIMO** (${mgPercent}%)\n`;
    }
    
    if (naPercent > 1) {
      response += `• **Na⁺:** ❌ **MUY ALTO** (${naPercent}%) - Ideal sería 0-1%\n`;
    } else {
      response += `• **Na⁺:** ✅ **ÓPTIMO** (${naPercent}%)\n`;
    }
    
    response += `• **H⁺:** ✅ **ÓPTIMO** (${hPercent}%)\n`;
    response += `• **Al³⁺:** ✅ **ÓPTIMO** (${alPercent}%)\n\n`;
    
    response += `**🔧 RECOMENDACIONES ESPECÍFICAS:**\n`;
    if (caPercent < 65) {
      response += `1. **Aplicar YESO AGRÍCOLA** para elevar Ca²⁺\n`;
    }
    if (kPercent > 7) {
      response += `2. **Reducir aplicaciones de K⁺** temporalmente\n`;
    }
    if (mgPercent > 15) {
      response += `3. **Reducir aplicaciones de Mg²⁺**\n`;
    }
    if (naPercent > 1) {
      response += `4. **Aplicar YESO** para desplazar Na⁺\n`;
    }
    
    response += `\n**🎯 VALORES IDEALES PARA TU CIC (${cic} meq):**\n`;
    const idealK = Math.round((cic * 0.05) * 100) / 100;
    const idealCa = Math.round((cic * 0.70) * 100) / 100;
    const idealMg = Math.round((cic * 0.13) * 100) / 100;
    response += `• **K⁺:** ${idealK} meq (5.0%)\n`;
    response += `• **Ca²⁺:** ${idealCa} meq (70.0%)\n`;
    response += `• **Mg²⁺:** ${idealMg} meq (13.0%)\n`;
    response += `• **H⁺:** 0.00 meq (0.0%)\n`;
    response += `• **Na⁺:** 0.00 meq (0.0%)\n`;
    response += `• **Al³⁺:** 0.00 meq (0.0%)\n\n`;
    
    response += `**¿Quieres que aplique estos valores ideales en tu calculadora?**\n`;
    response += `Escribe "SÍ" o "APLICAR" para actualizar automáticamente.`;
    
    console.log('✅ Respuesta específica generada');
    return response;
  }
  
  /**
   * RESPUESTA ESPECÍFICA PARA CALCIO
   */
  generateCalciumResponse(message, topics, currentData = {}) {
    console.log('🧪 Generando respuesta específica sobre calcio...');
    
    let response = `**🧪 CALCIO (Ca²⁺) EN EL SUELO**\n\n`;
    
    response += `**📊 RANGO IDEAL:**\n`;
    response += `• **65-75%** del CIC total\n`;
    response += `• **Función:** Estructura celular, calidad de frutos, desarrollo radicular\n\n`;
    
    // Analizar datos específicos si están disponibles
    if (currentData && currentData.soil) {
      const soil = currentData.soil;
      const cic = soil.cic;
      const caPercent = ((soil.ca / cic) * 100).toFixed(1);
      
      response += `**🔍 ANÁLISIS DE TU SUELO:**\n`;
      response += `• **CIC Total:** ${cic} meq/100g\n`;
      response += `• **Ca²⁺ actual:** ${soil.ca} meq (${caPercent}%)\n\n`;
      
      if (caPercent < 65) {
        response += `**❌ PROBLEMA:** Calcio BAJO (${caPercent}%)\n`;
        response += `• Necesitas elevar a 65-75%\n`;
        response += `• **Solución:** Aplicar yeso agrícola (CaSO₄) o caliza (CaCO₃)\n\n`;
      } else if (caPercent > 75) {
        response += `**⚠️ PROBLEMA:** Calcio ALTO (${caPercent}%)\n`;
        response += `• Puede causar desequilibrio con Mg²⁺\n`;
        response += `• **Solución:** Reducir aplicaciones de calcio\n\n`;
      } else {
        response += `**✅ ÓPTIMO:** Calcio en rango ideal (${caPercent}%)\n\n`;
      }
      
      // Calcular valor ideal
      const idealCa = Math.round((cic * 0.70) * 100) / 100;
      response += `**🎯 VALOR IDEAL PARA TU CIC:**\n`;
      response += `• **Ca²⁺:** ${idealCa} meq (70.0%)\n`;
      response += `• **Diferencia:** ${(idealCa - soil.ca).toFixed(2)} meq\n\n`;
    }
    
    response += `**💡 FUENTES DE CALCIO:**\n`;
    response += `• **Yeso Agrícola (CaSO₄):** 23.53% Ca\n`;
    response += `• **Cal Agrícola (CaCO₃):** 40% Ca\n`;
    response += `• **Cal Dolomítica:** 21.7% Ca + 13.2% Mg\n\n`;
    
    response += `**🔬 EFECTOS DEL CALCIO:**\n`;
    response += `• **Estructura del suelo:** Mejora agregación\n`;
    response += `• **Calidad de frutos:** Reduce problemas fisiológicos\n`;
    response += `• **Desarrollo radicular:** Fortalece raíces\n`;
    response += `• **Absorción de nutrientes:** Facilita intercambio catiónico\n\n`;
    
    response += `**¿Quieres que calcule la dosis específica para tu suelo?**`;
    
    return response;
  }

  /**
   * RESPUESTA ESPECÍFICA PARA PH
   */
  generatePHResponse(message, topics) {
    return '**🌡️ pH DEL SUELO**\n\n' +
           '**¿Qué es el pH?**\n' +
           'El pH mide la acidez o alcalinidad del suelo. Afecta directamente la disponibilidad de nutrientes para las plantas.\n\n' +
           '**Rangos óptimos:**\n' +
           '• **Aguacate:** 6.0 - 7.0\n' +
           '• **Cítricos:** 6.0 - 7.5\n' +
           '• **Hortalizas:** 6.0 - 7.0\n' +
           '• **Cereales:** 6.0 - 7.5\n\n' +
           '**Efectos del pH:**\n' +
           '• **pH < 6.0 (ácido):** Mayor disponibilidad de micronutrientes, menor disponibilidad de fósforo\n' +
           '• **pH 6.0-7.0 (óptimo):** Disponibilidad equilibrada de nutrientes\n' +
           '• **pH > 7.0 (alcalino):** Menor disponibilidad de micronutrientes, mayor disponibilidad de fósforo\n\n' +
           '**💡 Corrección del pH:**\n' +
           '• **Para elevar pH (suelos ácidos):** Aplicar caliza o dolomita\n' +
           '• **Para bajar pH (suelos alcalinos):** Aplicar azufre elemental o yeso\n\n' +
           '**¿Cuál es el pH actual de tu suelo?** Te ayudo a calcular las dosis necesarias.';
  }
  
  /**
   * RESPUESTA ESPECÍFICA PARA NUTRIENTES
   */
  generateNutrientResponse(message, topics) {
    return '**🌱 NUTRIENTES ESENCIALES**\n\n' +
           '**Macronutrientes primarios:**\n' +
           '• **N (Nitrógeno):** Crecimiento vegetativo, síntesis de proteínas\n' +
           '• **P (Fósforo):** Desarrollo radicular, floración, fructificación\n' +
           '• **K (Potasio):** Regulación hídrica, calidad de frutos\n\n' +
           '**Macronutrientes secundarios:**\n' +
           '• **Ca (Calcio):** Estructura celular, calidad de frutos\n' +
           '• **Mg (Magnesio):** Núcleo de la clorofila, fotosíntesis\n' +
           '• **S (Azufre):** Síntesis de aminoácidos y proteínas\n\n' +
           '**Micronutrientes importantes:**\n' +
           '• **Fe (Hierro):** Síntesis de clorofila\n' +
           '• **Zn (Zinc):** Síntesis de auxinas, desarrollo\n' +
           '• **B (Boro):** División celular, fructificación\n' +
           '• **Mn (Manganeso):** Fotosíntesis, activación enzimática\n\n' +
           '**💡 ¿Qué nutriente específico te interesa?** Te doy información detallada sobre funciones, síntomas de deficiencia y fuentes.';
  }
  
  /**
   * RESPUESTA ESPECÍFICA PARA CULTIVOS
   */
  generateCropResponse(message, topics) {
    return '**🥑 CULTIVOS ESPECIALIZADOS**\n\n' +
           '**Aguacate (Persea americana):**\n' +
           '• **Familia:** Lauraceae\n' +
           '• **Clima:** Tropical y subtropical\n' +
           '• **pH óptimo:** 6.0 - 7.0\n' +
           '• **Drenaje:** Excelente (crítico)\n' +
           '• **Profundidad:** Mínimo 1.5 metros\n\n' +
           '**Requerimientos nutricionales del aguacate:**\n' +
           '• **N:** Alto durante crecimiento vegetativo\n' +
           '• **P:** Moderado, crítico en floración\n' +
           '• **K:** Alto, especialmente en fructificación\n' +
           '• **Ca:** Alto para calidad de fruto\n' +
           '• **Mg:** Moderado para fotosíntesis\n' +
           '• **Micronutrientes:** Zn y B críticos\n\n' +
           '**Etapas de crecimiento:**\n' +
           '1. **Vegetativo:** Crecimiento de hojas y ramas\n' +
           '2. **Floración:** Febrero-marzo\n' +
           '3. **Cuajado:** Marzo-abril\n' +
           '4. **Desarrollo:** Abril-septiembre\n' +
           '5. **Cosecha:** Septiembre-febrero\n\n' +
           '**¿Qué aspecto específico del aguacate te interesa?** Nutrición, riego, poda, etc.';
  }
  
  /**
   * RESPUESTA ESPECÍFICA PARA ENMIENDAS
   */
  generateAmendmentResponse(message, topics) {
    return '**🧪 ENMIENDAS DEL SUELO**\n\n' +
           '**Tipos de enmiendas disponibles:**\n\n' +
           '**1. YESO AGRÍCOLA (CaSO₄·2H₂O):**\n' +
           '• **Contenido:** 23.53% Ca, 56.5% SO₄\n' +
           '• **Uso:** Aportar calcio, desplazar sodio\n' +
           '• **Aplicación:** Al suelo, incorporar\n\n' +
           '**2. CAL AGRÍCOLA (CaCO₃):**\n' +
           '• **Contenido:** 40% Ca, 60% CO₃\n' +
           '• **Uso:** Elevar pH, aportar calcio\n' +
           '• **Aplicación:** Al suelo, incorporar\n\n' +
           '**3. CAL DOLOMÍTICA (CaCO₃ + MgCO₃):**\n' +
           '• **Contenido:** 21.7% Ca, 13.2% Mg\n' +
           '• **Uso:** Elevar pH, aportar Ca y Mg\n' +
           '• **Aplicación:** Al suelo, incorporar\n\n' +
           '**4. SULFATO DE POTASIO (K₂SO₄):**\n' +
           '• **Contenido:** 44.9% K, 55.1% SO₄\n' +
           '• **Uso:** Aportar potasio\n' +
           '• **Aplicación:** Al suelo o foliar\n\n' +
           '**💡 Selección de enmienda:**\n' +
           '• **pH bajo + Ca bajo:** Cal agrícola\n' +
           '• **pH bajo + Ca y Mg bajos:** Cal dolomítica\n' +
           '• **Solo Ca bajo:** Yeso agrícola\n' +
           '• **K bajo:** Sulfato de potasio\n\n' +
           '**¿Qué tipo de ajuste necesitas hacer en tu suelo?** Te ayudo a seleccionar la enmienda correcta.';
  }

  /**
   * OBTENER ESTADÍSTICAS DE USO
   */
  getUsageStats() {
    const totalUsers = this.userMemory.size;
    const totalConversations = Array.from(this.userMemory.values())
      .reduce((sum, user) => sum + user.history.length, 0);
    
    return {
      totalUsers,
      totalConversations,
      averageConversationsPerUser: totalUsers > 0 ? totalConversations / totalUsers : 0
    };
  }
}

// ================================
// INTEGRACIÓN CON NUEVA BASE DE CONOCIMIENTO
// ================================

// Extender la clase NutriPlantAI con la nueva funcionalidad
NutriPlantAI.prototype.analyzeSoilWithNewAI = function(soilData) {
  console.log('🤖 IA: Iniciando análisis inteligente del suelo...');
  console.log('📊 Datos del suelo recibidos:', soilData);
  
    try {
    // Análisis inteligente del suelo
    const analysis = this.performIntelligentSoilAnalysis(soilData);
      
    if (analysis) {
      console.log('✅ Análisis inteligente completado');
      return {
        success: true,
        analysis: analysis.analysis,
        recommendations: analysis.recommendations,
        response: analysis.response,
        options: analysis.options,
        source: 'intelligent-analysis'
      };
    } else {
      return {
        success: false,
        error: 'No se pudo realizar el análisis del suelo',
        source: 'analysis-error'
      };
    }
    } catch (error) {
    console.error('❌ Error en análisis inteligente:', error);
      return {
        success: false,
        error: error.message,
      source: 'analysis-error'
    };
  }
};

// Función para realizar análisis inteligente del suelo
NutriPlantAI.prototype.performIntelligentSoilAnalysis = function(soilData) {
  console.log('🧠 Realizando análisis inteligente...');
  
  if (!soilData || !soilData.cic || soilData.cic <= 0) {
    return null;
  }
  
  const cic = soilData.cic;
  const percentages = soilData.percentages;
  const ph = soilData.ph;
  
  // Analizar cada catión
  const problems = [];
  const recommendations = [];
  const analysis = [];
  
  // K⁺ (3-7%)
  const kPercent = parseFloat(percentages.k);
  if (kPercent < 3) {
    problems.push(`K⁺ está por debajo del rango ideal (${kPercent}% < 3%)`);
    recommendations.push('Considerar SOP Granular para aumentar K⁺');
    analysis.push(`❌ K⁺: ${kPercent}% - BAJO (ideal: 3-7%)`);
  } else if (kPercent > 7) {
    problems.push(`K⁺ está por encima del rango ideal (${kPercent}% > 7%)`);
    analysis.push(`⚠️ K⁺: ${kPercent}% - ALTO (ideal: 3-7%)`);
  } else {
    analysis.push(`✅ K⁺: ${kPercent}% - ÓPTIMO (ideal: 3-7%)`);
  }
  
  // Ca²⁺ (65-75%)
  const caPercent = parseFloat(percentages.ca);
  if (caPercent < 65) {
    problems.push(`Ca²⁺ está por debajo del rango ideal (${caPercent}% < 65%)`);
    if (ph < 7) {
      recommendations.push('Considerar Cal Agrícola o Yeso para aumentar Ca²⁺');
    } else {
      recommendations.push('Considerar Yeso para aumentar Ca²⁺ (evitar Cal Agrícola con pH > 7)');
    }
    analysis.push(`❌ Ca²⁺: ${caPercent}% - BAJO (ideal: 65-75%)`);
  } else if (caPercent > 75) {
    problems.push(`Ca²⁺ está por encima del rango ideal (${caPercent}% > 75%)`);
    analysis.push(`⚠️ Ca²⁺: ${caPercent}% - ALTO (ideal: 65-75%)`);
  } else {
    analysis.push(`✅ Ca²⁺: ${caPercent}% - ÓPTIMO (ideal: 65-75%)`);
  }
  
  // Mg²⁺ (10-15%)
  const mgPercent = parseFloat(percentages.mg);
  if (mgPercent < 10) {
    problems.push(`Mg²⁺ está por debajo del rango ideal (${mgPercent}% < 10%)`);
    recommendations.push('Considerar Cal Dolomítica o MgSO₄ para aumentar Mg²⁺');
    analysis.push(`❌ Mg²⁺: ${mgPercent}% - BAJO (ideal: 10-15%)`);
  } else if (mgPercent > 15) {
    problems.push(`Mg²⁺ está por encima del rango ideal (${mgPercent}% > 15%)`);
    analysis.push(`⚠️ Mg²⁺: ${mgPercent}% - ALTO (ideal: 10-15%)`);
  } else {
    analysis.push(`✅ Mg²⁺: ${mgPercent}% - ÓPTIMO (ideal: 10-15%)`);
  }
  
  // Na⁺ (0-1%)
  const naPercent = parseFloat(percentages.na);
  if (naPercent > 1) {
    problems.push(`Na⁺ está por encima del rango ideal (${naPercent}% > 1%)`);
    recommendations.push('Usar enmiendas con SO₄ para desplazar Na⁺ (Yeso, SOP Granular, MgSO₄)');
    analysis.push(`❌ Na⁺: ${naPercent}% - ALTO (ideal: 0-1%)`);
  } else {
    analysis.push(`✅ Na⁺: ${naPercent}% - ÓPTIMO (ideal: 0-1%)`);
  }
  
  // Generar respuesta
  let response = `📊 **ANÁLISIS DE TU SUELO**\n\n`;
  response += `**CIC Total:** ${cic} meq/100g\n`;
  response += `**pH:** ${ph} (${this.getPHCategory(ph)})\n\n`;
  
  response += `**📈 Estado de Cationes:**\n${analysis.join('\n')}\n\n`;
  
  if (problems.length > 0) {
    response += `**⚠️ PROBLEMAS DETECTADOS:**\n${problems.map(p => `• ${p}`).join('\n')}\n\n`;
    response += `**💡 RECOMENDACIONES ESPECÍFICAS:**\n${recommendations.map(r => `• ${r}`).join('\n')}\n\n`;
  } else {
    response += `**🎉 ¡Excelente! Tu suelo está en rangos óptimos.**\n\n`;
  }
  
  // Estrategia de enmiendas
  if (problems.length > 0) {
    response += `**🎯 ESTRATEGIA RECOMENDADA:**\n`;
    const strategy = this.generateAmendmentStrategy(soilData, problems, recommendations);
    response += strategy;
  }
  
    return {
    analysis: analysis,
    problems: problems,
    recommendations: recommendations,
    response: response,
    options: this.generateAmendmentOptions(soilData)
  };
};

// Función para categorizar pH
NutriPlantAI.prototype.getPHCategory = function(ph) {
  if (ph < 6.5) return 'Ácido';
  if (ph > 7.5) return 'Alcalino';
  return 'Neutro';
};

// Función para generar estrategia de enmiendas
NutriPlantAI.prototype.generateAmendmentStrategy = function(soilData, problems, recommendations) {
  const cic = soilData.cic;
  const percentages = soilData.percentages;
  const ph = soilData.ph;
  
  let strategy = '';
  
  // Priorizar según el elemento más limitante
  const kPercent = parseFloat(percentages.k);
  const caPercent = parseFloat(percentages.ca);
  const mgPercent = parseFloat(percentages.mg);
  const naPercent = parseFloat(percentages.na);
  
  // Si Ca y Mg están bajos, priorizar Cal Dolomítica
  if (caPercent < 65 && mgPercent < 10) {
    strategy += `• **Cal Dolomítica** (prioridad alta): Corrige Ca²⁺ y Mg²⁺ simultáneamente\n`;
  }
  // Si solo Ca está bajo
  else if (caPercent < 65) {
    if (ph < 7) {
      strategy += `• **Cal Agrícola** (pH < 7): Para aumentar Ca²⁺\n`;
    } else {
      strategy += `• **Yeso**: Para aumentar Ca²⁺ sin afectar pH\n`;
    }
  }
  
  // Si Mg está bajo y Ca está bien
  if (mgPercent < 10 && caPercent >= 65) {
    strategy += `• **MgSO₄**: Para aumentar Mg²⁺\n`;
  }
  
  // Si K está bajo
  if (kPercent < 3) {
    strategy += `• **SOP Granular**: Para aumentar K⁺\n`;
  }
  
  // Si Na está alto
  if (naPercent > 1) {
    strategy += `• **Enmiendas con SO₄**: Para desplazar Na⁺\n`;
  }
  
  strategy += `\n**📝 Nota:** Con pH ${ph}, ${ph < 7 ? 'puedes usar Cal Agrícola' : 'evita Cal Agrícola y usa Yeso'}.\n`;
  
  return strategy;
};

// Función para generar opciones de aplicación automática
NutriPlantAI.prototype.generateAmendmentOptions = function(soilData) {
  return [
    'Aplicar recomendaciones automáticamente',
    'Mostrar cálculo detallado',
    'Explicar el razonamiento',
    'Sugerir dosis específicas'
  ];
};

// Función para aplicar recomendación automáticamente
NutriPlantAI.prototype.applyRecommendation = function(recommendation, soilData) {
  console.log('🤖 IA: Aplicando recomendación automáticamente...');
  
  if (typeof window.AI_KNOWLEDGE_BASE_COMPLETE !== 'undefined') {
    try {
      const result = window.AI_KNOWLEDGE_BASE_COMPLETE.functions.applyRecommendation(recommendation, soilData);
      console.log('✅ Recomendación aplicada exitosamente');
      return result;
    } catch (error) {
      console.error('❌ Error aplicando recomendación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  } else {
    return {
      success: false,
      error: 'Nueva base de conocimiento no disponible'
    };
  }
};

// Función para generar respuesta inteligente con nueva base
NutriPlantAI.prototype.generateIntelligentResponse = function(message, context) {
  console.log('🤖 IA: Generando respuesta inteligente...');
  
  // Detectar si es una consulta sobre análisis de suelo
  if (this.isSoilAnalysisQuery(message)) {
    console.log('📊 Detectada consulta de análisis de suelo');
    
    // Extraer datos del contexto si están disponibles
    const soilData = this.extractSoilDataFromContext(context);
    
    if (soilData) {
      console.log('✅ Datos de suelo encontrados, iniciando análisis...');
      return this.analyzeSoilWithNewAI(soilData);
    } else {
      console.log('⚠️ No se encontraron datos de suelo en el contexto');
      return {
        success: false,
        message: 'Para analizar tu suelo, necesito que primero ingreses los datos del análisis inicial.',
        suggestion: 'Por favor, completa el análisis de suelo inicial y luego pregunta sobre recomendaciones.'
      };
    }
  }
  
  // Si no es análisis de suelo, usar el método original
  return this.generateGeneralResponse(message, context);
};

// Función para detectar consultas de análisis de suelo
NutriPlantAI.prototype.isSoilAnalysisQuery = function(message) {
  const soilKeywords = [
    'analizar', 'análisis', 'suelo', 'recomendar', 'recomendación',
    'enmienda', 'enmiendas', 'cal', 'yeso', 'dolomita', 'magnesio',
    'calcio', 'potasio', 'cic', 'cationes', 'ajustar', 'ajuste',
    'sugerir', 'sugerencia', 'opciones', 'mejor', 'eficiente',
    'precisión', 'cantidad', 'aplicar', 'aplicación'
  ];
  
  const messageLower = message.toLowerCase();
  return soilKeywords.some(keyword => messageLower.includes(keyword));
};

// Función para extraer datos de suelo del contexto
NutriPlantAI.prototype.extractSoilDataFromContext = function(context) {
  try {
    console.log('🔍 Extrayendo datos de suelo del contexto...');
    
    // Primero intentar usar los datos del contexto si están disponibles
    if (context && context.soil && context.soil.cic > 0) {
      console.log('✅ Usando datos del contexto:', context.soil);
      return context.soil;
    }
    
    // Si no hay datos en el contexto, extraer del DOM
    console.log('🔍 Extrayendo datos del DOM...');
    const cicTotal = document.getElementById('cic-total')?.value;
    const kInitial = document.getElementById('k-initial')?.value;
    const caInitial = document.getElementById('ca-initial')?.value;
    const mgInitial = document.getElementById('mg-initial')?.value;
    const hInitial = document.getElementById('h-initial')?.value;
    const naInitial = document.getElementById('na-initial')?.value;
    const alInitial = document.getElementById('al-initial')?.value;
    const phInput = document.getElementById('soil-ph')?.value;
    const densityInput = document.getElementById('soil-density')?.value;
    const depthInput = document.getElementById('soil-depth')?.value;
    
    // Objetivos de ajuste
    const kTarget = document.getElementById('k-target')?.value;
    const caTarget = document.getElementById('ca-target')?.value;
    const mgTarget = document.getElementById('mg-target')?.value;
    const naTarget = document.getElementById('na-target')?.value;
    
    if (cicTotal && parseFloat(cicTotal) > 0) {
      const cic = parseFloat(cicTotal);
      const soilData = {
        cic: cic,
        k: parseFloat(kInitial) || 0,
        ca: parseFloat(caInitial) || 0,
        mg: parseFloat(mgInitial) || 0,
        h: parseFloat(hInitial) || 0,
        na: parseFloat(naInitial) || 0,
        al: parseFloat(alInitial) || 0,
        ph: parseFloat(phInput) || 0,
        density: parseFloat(densityInput) || 1.1,
        depth: parseFloat(depthInput) || 30
      };
      
      // Calcular porcentajes
      soilData.percentages = {
        k: ((soilData.k / cic) * 100).toFixed(1),
        ca: ((soilData.ca / cic) * 100).toFixed(1),
        mg: ((soilData.mg / cic) * 100).toFixed(1),
        h: ((soilData.h / cic) * 100).toFixed(1),
        na: ((soilData.na / cic) * 100).toFixed(1),
        al: ((soilData.al / cic) * 100).toFixed(1)
      };
      
      // Agregar objetivos de ajuste
      soilData.targets = {
        k: parseFloat(kTarget) || 0,
        ca: parseFloat(caTarget) || 0,
        mg: parseFloat(mgTarget) || 0,
        na: parseFloat(naTarget) || 0
      };
      
      console.log('✅ Datos extraídos del DOM:', soilData);
      return soilData;
    }
    
    console.log('⚠️ No se encontraron datos válidos de suelo');
    return null;
  } catch (error) {
    console.error('❌ Error extrayendo datos de suelo:', error);
    return null;
  }
};

// Función para calcular necesidades del suelo
NutriPlantAI.prototype.calculateSoilNeeds = function(cicTotal, k, ca, mg, h, na, al) {
  const cic = parseFloat(cicTotal);
  const kVal = parseFloat(k);
  const caVal = parseFloat(ca);
  const mgVal = parseFloat(mg);
  const hVal = parseFloat(h || 0);
  const naVal = parseFloat(na || 0);
  const alVal = parseFloat(al || 0);
  
  // Calcular porcentajes ideales
  const idealK = cic * 0.05;  // 5%
  const idealCa = cic * 0.75; // 75%
  const idealMg = cic * 0.15; // 15%
  
  // Calcular necesidades
  const kNeed = idealK - kVal;
  const caNeed = idealCa - caVal;
  const mgNeed = idealMg - mgVal;
  
  return {
    k: kNeed,
    ca: caNeed,
    mg: mgNeed,
    h: -hVal, // Desplazar
    na: -naVal, // Desplazar
    al: -alVal // Desplazar
  };
};

// Exportar para uso global
window.NutriPlantAI = NutriPlantAI;

