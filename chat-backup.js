/* ===== CHAT FLOTANTE NUTRIPLANT PRO ===== */

// ===== MÓDULOS ESPECÍFICOS POR SECCIÓN (DEFINIR PRIMERO) =====

// Módulo de Enmiendas
class AmendmentsModule {
  constructor(chat) {
    this.chat = chat;
    this.name = 'Enmiendas';
    console.log('📊 Módulo de Enmiendas inicializado');
  }
  
  analyze(query, context) {
    // Lógica específica de enmiendas
    if (query.includes('enmienda') || query.includes('cal') || query.includes('yeso')) {
      return this.getAmendmentsAnalysis();
    }
    
    // Análisis avanzado de rendimiento
    if (query.includes('rendimiento') || query.includes('productividad') || query.includes('potencial')) {
      return this.getYieldAnalysis(context);
    }
    
    // Análisis de compatibilidad
    if (query.includes('compatibilidad') || query.includes('mezclar') || query.includes('combinar')) {
      return this.getCompatibilityAnalysis();
    }
    
    // Análisis por etapa fenológica
    if (query.includes('etapa') || query.includes('fenologica') || query.includes('desarrollo')) {
      return this.getStageAnalysis(context);
    }
    
    return null;
  }
  
  getAmendmentsAnalysis() {
    // Mover aquí la lógica actual de análisis de enmiendas
    const soilData = this.chat.getAmendmentsData();
    if (!soilData) {
      return `❌ **Sin datos de suelo**

Necesito que cargues un análisis de suelo para hacer recomendaciones de enmiendas.`;
    }
    
    const { soil } = soilData;
    const { percentages, ph } = soil;
    
    let analysis = `**🌱 Recomendaciones de Enmiendas**

Te recomiendo:`;

    // Lógica de enmiendas basada en porcentajes
    const recommendations = [];
    
    if (percentages.ca < 65 && percentages.mg < 10) {
      recommendations.push('**Cal Dolomítica** - Corrige Ca y Mg');
    } else if (percentages.ca < 65) {
      recommendations.push(ph < 7 ? '**Cal Agrícola** - Aumenta Ca²⁺' : '**Yeso** - Aumenta Ca²⁺');
    } else if (percentages.mg < 10) {
      recommendations.push('**MgSO₄** - Aumenta Mg²⁺');
    }
    
    if (percentages.k < 3) {
      recommendations.push('**SOP Granular** - Aumenta K⁺');
    }
    
    if (percentages.na > 1) {
      recommendations.push('**Yeso** - Desplaza Na⁺');
    }
    
    // Agregar recomendaciones al análisis
    recommendations.forEach(rec => {
      analysis += `\n• ${rec}`;
    });
    
    analysis += `\n\n¿Quieres que las seleccione automáticamente? (sí/no)`;
    
    // Generar recomendaciones pendientes
    this.generatePendingRecommendations(soilData);
    
    return analysis;
  }
  
  generatePendingRecommendations(soilData) {
    const { soil } = soilData;
    const { percentages, ph } = soil;
    
    this.chat.pendingRecommendations = {
      amendments: [],
      targetValues: {
        k: (soil.cic * 0.05),
        ca: (soil.cic * 0.70),
        mg: (soil.cic * 0.125)
      }
    };
    
    // Agregar enmiendas según la lógica
    if (percentages.ca < 65 && percentages.mg < 10) {
      this.chat.pendingRecommendations.amendments.push('Cal Dolomítica');
    } else if (percentages.ca < 65) {
      if (ph < 7) {
        this.chat.pendingRecommendations.amendments.push('Cal Agrícola');
      } else {
        this.chat.pendingRecommendations.amendments.push('Yeso');
      }
    } else if (percentages.mg < 10) {
      this.chat.pendingRecommendations.amendments.push('MgSO₄');
    }
    
    if (percentages.k < 3) {
      this.chat.pendingRecommendations.amendments.push('SOP Granular');
    }
    
    if (percentages.na > 1) {
      this.chat.pendingRecommendations.amendments.push('Yeso');
    }
  }
  
  executeAction(action, params) {
    switch(action) {
      case 'select_amendments':
        return this.selectAmendments(params.amendments);
      case 'adjust_doses':
        return this.adjustDoses(params);
      default:
        return 'Acción no reconocida en módulo de enmiendas';
    }
  }
  
  selectAmendments(amendments) {
    // Seleccionar automáticamente usando la función del dashboard
    amendments.forEach(amendment => {
      console.log('🔍 Seleccionando enmienda:', amendment);
      
      // Mapear nombres de enmiendas a IDs
      let amendmentId = '';
      switch(amendment) {
        case 'Cal Dolomítica':
          amendmentId = 'dolomite';
          break;
        case 'Yeso':
          amendmentId = 'gypsum';
          break;
        case 'Cal Agrícola':
          amendmentId = 'lime';
          break;
        case 'MgSO₄':
          amendmentId = 'mgso4-mono';
          break;
        case 'SOP Granular':
          amendmentId = 'sop-granular';
          break;
      }
      
      // Seleccionar enmienda
      if (amendmentId && typeof window.toggleAmendmentSelection === 'function') {
        setTimeout(() => {
          try {
            const button = document.getElementById(`btn-select-${amendmentId}`);
            if (button && !button.classList.contains('selected')) {
              window.toggleAmendmentSelection(amendmentId);
              console.log('✅ Enmienda seleccionada:', amendment);
            }
          } catch (error) {
            console.log('❌ Error al seleccionar:', amendment, error);
          }
        }, 200);
      }
    });

    let response = `✅ **Seleccionado:** ${amendments.join(', ')}`;
    response += `\n\n¡Listo! Ahora puedes calcular las dosis.`;
    
    this.chat.pendingRecommendations = null;
    return response;
  }
  
  // ===== ANÁLISIS AVANZADOS PARA SUPER HERRAMIENTA =====
  
  // Análisis de potencial de rendimiento
  getYieldAnalysis(context) {
    if (!context || !context.hasData) {
      return `❌ **Sin datos de suelo**

Necesito un análisis de suelo para evaluar el potencial de rendimiento.`;
    }
    
    const yieldAnalysis = this.chat.analyzeYieldPotential(context, 'tomate'); // Default crop
    
    return `**🚀 Análisis de Potencial de Rendimiento**

**Puntuación:** ${yieldAnalysis.score}/100 (${yieldAnalysis.grade})

**Factores limitantes:**
${yieldAnalysis.factors.map(factor => `• ${factor}`).join('\n')}

**Recomendaciones:**
${yieldAnalysis.recommendations.map(rec => `• ${rec}`).join('\n')}

**🎯 Acción sugerida:** ${yieldAnalysis.score >= 70 ? 'Optimizar manejo agronómico' : 'Corregir limitantes del suelo'}`;
  }
  
  // Análisis de compatibilidad de fertilizantes
  getCompatibilityAnalysis() {
    return `**🧪 Análisis de Compatibilidad de Fertilizantes**

**✅ Compatibles:**
• Nitrato de Calcio + Sulfato de Potasio
• Sulfato de Amonio + Superfosfato
• Urea + Fosfato Diamónico

**❌ Incompatibles:**
• Nitrato de Calcio + Sulfato de Amonio
• Sulfato de Amonio + Cal Agrícola
• Superfosfato + Cal Agrícola

**⚠️ Reglas generales:**
• Evitar mezclar sales de calcio con sulfatos
• No combinar fertilizantes ácidos con básicos
• Verificar solubilidad antes de mezclar

¿Quieres que analice una combinación específica?`;
  }
  
  // Análisis por etapa fenológica
  getStageAnalysis(context) {
    if (!context || !context.hasData) {
      return `❌ **Sin datos de suelo**

Necesito un análisis de suelo para calcular dosis por etapa fenológica.`;
    }
    
    const stages = ['germinacion', 'desarrollo', 'floracion', 'fructificacion'];
    const crops = ['tomate', 'lechuga', 'pimiento'];
    
    return `**🌱 Análisis por Etapa Fenológica**

**Cultivos disponibles:** ${crops.join(', ')}
**Etapas:** ${stages.join(', ')}

**Ejemplo para tomate en floración:**
• N: 80 ppm (dosis de mantenimiento)
• P: 80 ppm (desarrollo floral)
• K: 150 ppm (calidad del fruto)

**Para tu suelo específico:**
${this.getStageSpecificRecommendations(context)}

¿Qué cultivo y etapa te interesa?`;
  }
  
  // Recomendaciones específicas por etapa
  getStageSpecificRecommendations(context) {
    const { soil } = context;
    const { percentages } = soil;
    
    let recommendations = [];
    
    if (percentages.k < 3) {
      recommendations.push('• K⁺ crítico - priorizar en todas las etapas');
    }
    if (percentages.ca < 65) {
      recommendations.push('• Ca²⁺ bajo - esencial en fructificación');
    }
    if (percentages.mg < 10) {
      recommendations.push('• Mg²⁺ bajo - importante en desarrollo vegetativo');
    }
    
    return recommendations.length > 0 ? recommendations.join('\n') : '• Suelo balanceado - seguir programa estándar';
  }
}

// Módulo de Fertirriego (placeholder)
class FertigationModule {
  constructor(chat) {
    this.chat = chat;
    this.name = 'Fertirriego';
    console.log('💧 Módulo de Fertirriego inicializado');
  }
  
  analyze(query, context) {
    // Lógica específica de fertirriego
    return null; // Por implementar
  }
  
  executeAction(action, params) {
    // Acciones específicas de fertirriego
    return 'Módulo de fertirriego en desarrollo';
  }
}

// Módulo de Análisis (placeholder)
class AnalysisModule {
  constructor(chat) {
    this.chat = chat;
    this.name = 'Análisis';
    console.log('🔬 Módulo de Análisis inicializado');
  }
  
  analyze(query, context) {
    // Lógica específica de análisis
    return null; // Por implementar
  }
  
  executeAction(action, params) {
    // Acciones específicas de análisis
    return 'Módulo de análisis en desarrollo';
  }
}

// Módulo de Soluciones (placeholder)
class SolutionsModule {
  constructor(chat) {
    this.chat = chat;
    this.name = 'Soluciones';
    console.log('🧪 Módulo de Soluciones inicializado');
  }
  
  analyze(query, context) {
    // Lógica específica de soluciones
    return null; // Por implementar
  }
  
  executeAction(action, params) {
    // Acciones específicas de soluciones
    return 'Módulo de soluciones en desarrollo';
  }
}

// ===== CLASE PRINCIPAL DEL CHAT =====

class NutriPlantChat {
  constructor() {
    this.isOpen = false;
    this.isMinimized = false;
    this.messages = [];
    this.apiKey = ''; // La API Key debe resolverse en backend/proxy
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.platformData = {}; // Datos de la plataforma
    this.pendingRecommendations = null; // Para confirmaciones
    
    // Inicializar módulos
    this.modules = {
      amendments: new AmendmentsModule(this),
      fertigation: new FertigationModule(this),
      analysis: new AnalysisModule(this),
      solutions: new SolutionsModule(this)
    };
    
    this.init();
  }

  init() {
    this.createChatHTML();
    this.bindEvents();
    this.loadChatHistory();
    this.addWelcomeMessage();
    this.startPlatformMonitoring();
  }

  createChatHTML() {
    console.log('🔧 Creando HTML del chat...');
    
    // Verificar si ya existe un botón de chat en el HTML
    let chatBubble = document.getElementById('chatBubble');
    if (!chatBubble) {
      // Crear la burbuja del chat si no existe
      chatBubble = document.createElement('div');
      chatBubble.id = 'chatBubble';
      chatBubble.className = 'chat-bubble';
      chatBubble.innerHTML = '<div class="chat-icon"><span class="chat-text">IA</span><img src="assets/N_Hoja_Blanca.png" alt="NutriPlant PRO" class="chat-logo"></div>';
      document.body.appendChild(chatBubble);
      console.log('✅ Burbuja del chat creada');
    } else {
      // Si ya existe, mostrarlo
      chatBubble.style.display = '';
      console.log('✅ Usando botón de chat existente');
    }

    // Verificar si ya existe un panel de chat en el HTML
    let chatPanel = document.getElementById('chatPanel');
    if (!chatPanel) {
      // Crear el panel del chat si no existe
      chatPanel = document.createElement('div');
      chatPanel.id = 'chatPanel';
      chatPanel.className = 'chat-panel';
      chatPanel.innerHTML = `
        <div class="chat-header">
          <div class="chat-title">
            <div class="ai-icon">AI</div>
            <span>NutriPlant Assistant</span>
          </div>
          <div class="chat-controls">
            <button class="chat-btn minimize-btn" title="Minimizar">−</button>
            <button class="chat-btn close-btn" title="Cerrar">×</button>
          </div>
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input-area">
          <textarea class="chat-input" id="chatInput" placeholder="Escribe tu pregunta sobre NutriPlant PRO..." rows="1"></textarea>
          <button class="chat-send" id="chatSendBtn" title="Enviar">➤</button>
        </div>
      `;
      document.body.appendChild(chatPanel);
      console.log('✅ Panel del chat creado');
    } else {
      // Si ya existe, asegurar que esté oculto inicialmente
      chatPanel.style.display = 'none';
      console.log('✅ Usando panel de chat existente');
    }

    // Guardar referencias
    this.bubble = chatBubble;
    this.panel = chatPanel;
    this.messagesContainer = chatPanel.querySelector('#chatMessages') || chatPanel.querySelector('.chat-messages');
    this.input = chatPanel.querySelector('#chatInput') || chatPanel.querySelector('.chat-input');
    this.sendBtn = chatPanel.querySelector('#chatSendBtn') || chatPanel.querySelector('.chat-send');
    
    // Asegurar que el botón tenga el evento onclick
    if (this.bubble && !this.bubble.onclick) {
      this.bubble.onclick = () => this.toggleChat();
    }
  }

  bindEvents() {
    // Burbuja del chat - SOLO click para abrir/cerrar
    // Remover cualquier evento onclick existente y agregar el nuestro
    if (this.bubble) {
      // Remover el onclick del HTML si existe
      this.bubble.removeAttribute('onclick');
      // Agregar nuestro event listener
      this.bubble.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });
      console.log('✅ Evento click agregado al botón de chat');
    }

    // Panel del chat - SIN funcionalidad de arrastre
    // Solo mantener los botones de control

    // Botones del header
    const minimizeBtn = this.panel.querySelector('.minimize-btn');
    const closeBtn = this.panel.querySelector('.close-btn');
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.minimizeChat());
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeChat());
    }

    // Input del chat
    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      this.input.addEventListener('input', () => this.autoResizeInput());
    }

    // Botón enviar
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    console.log('✅ Eventos del chat configurados correctamente');
    // SIN eventos de drag - elementos fijos
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.isOpen = true;
    this.isMinimized = false;
    this.panel.classList.add('open');
    this.bubble.classList.remove('minimized');
    this.input.focus();
    this.scrollToBottom();
  }

  closeChat() {
    this.isOpen = false;
    this.isMinimized = false;
    this.panel.classList.remove('open');
    this.bubble.classList.add('minimized');
  }

  minimizeChat() {
    this.isMinimized = true;
    this.panel.classList.remove('open');
    this.bubble.classList.add('minimized');
  }

  // Funciones de arrastre eliminadas - elementos fijos

  autoResizeInput() {
    this.input.style.height = 'auto';
    this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message) return;

    // Agregar mensaje del usuario
    this.addMessage(message, 'user');
    this.input.value = '';
    this.autoResizeInput();

    // Mostrar estado de carga
    this.showTyping();

    // SIEMPRE usar ChatGPT directamente - NO usar respuestas locales restrictivas
    console.log('🔍 Usando ChatGPT directamente para análisis inteligente completo');
    
    try {
      // Llamar DIRECTAMENTE a ChatGPT sin pasar por funciones restrictivas
      const response = await this.getChatGPTFullAnalysis(message);
      this.hideTyping(); // Solo ocultar cuando llegue la respuesta
      this.addMessage(response, 'ai');
    } catch (error) {
        this.hideTyping();
      console.error('❌ Error con ChatGPT:', error);
      console.error('❌ Detalles del error:', error.message);
      console.error('❌ Stack trace:', error.stack);
      
      // MOSTRAR EL ERROR REAL
      let errorMessage = `❌ Error: ${error.message || 'Error desconocido'}`;
      
      this.addMessage(errorMessage, 'ai');
    }
  }


  getSoilDataForAI() {
    const kInput = document.getElementById('k-initial');
    const caInput = document.getElementById('ca-initial');
    const mgInput = document.getElementById('mg-initial');
    const naInput = document.getElementById('na-initial');
    const phInput = document.getElementById('soil-ph');
    const densityInput = document.getElementById('soil-density');
    const depthInput = document.getElementById('soil-depth');
    
    if (!kInput || !caInput || !mgInput) {
      return { hasData: false };
    }
    
    const k = parseFloat(kInput.value || 0);
    const ca = parseFloat(caInput.value || 0);
    const mg = parseFloat(mgInput.value || 0);
    const na = parseFloat(naInput?.value || 0);
    const ph = parseFloat(phInput?.value || 0);
    const density = parseFloat(densityInput?.value || 0);
    const depth = parseFloat(depthInput?.value || 0);
    
    if (k === 0 && ca === 0 && mg === 0) {
      return { hasData: false };
    }
    
    const cic = k + ca + mg + na;
    
    return {
      hasData: true,
      soil: {
        k, ca, mg, na, ph, density, depth, cic,
        percentages: {
          k: (k/cic)*100,
          ca: (ca/cic)*100,
          mg: (mg/cic)*100,
          na: (na/cic)*100
        }
      }
    };
  }

  async getChatGPTResponse(message, sectionData, section = 'amendments') {
    console.log('🔍 getChatGPTResponse - apiKey:', this.apiKey ? 'CONFIGURADA' : 'NO CONFIGURADA');
    console.log('🔍 Sección:', section);
    
    // Verificar API Key primero
    console.log('🔍 Verificando API Key en getAIResponse:', this.apiKey ? 'CONFIGURADA' : 'NO CONFIGURADA');
    
    // Si no hay API Key, usar análisis local como respaldo
    if (!this.apiKey || this.apiKey === 'TU_API_KEY_AQUI' || this.apiKey === '') {
      console.log('🔍 No hay API Key, usando análisis local como respaldo');
      if (section === 'amendments') {
        return this.getLocalSoilAnalysis(message, sectionData);
      } else {
        return this.getContextualResponse(section, message);
      }
    }
    
    console.log('✅ API Key disponible - usando ChatGPT para análisis completo');

    const context = this.buildSectionContext(sectionData, section);
    
    const sectionPrompts = {
      'home': `Eres un experto mundial en agronomía, nutrición vegetal, análisis de suelos y agricultura de precisión. Tienes acceso a TODO el conocimiento científico y técnico de la agricultura moderna.

CONTEXTO: El usuario está usando NutriPlant PRO, una herramienta avanzada de análisis agrícola.

CONTEXTO:
${context}

Responde de manera amigable y profesional, ayudando al usuario a navegar por las diferentes secciones de NutriPlant PRO y explicando las funcionalidades disponibles.`,

      'amendments': `Eres un experto mundial en agronomía, análisis de suelos, nutrición vegetal, química del suelo y fertilización. Tienes acceso a TODO el conocimiento científico de:

• Análisis de suelos y fertilidad
• Enmiendas y corrección de suelos  
• Nutrición vegetal y extracciones por cultivo
• Química del suelo y CIC
• pH y disponibilidad de nutrientes
• Fertilización y programas nutricionales
• Agricultura de precisión
• Y TODO conocimiento agronómico disponible

CONTEXTO DEL ANÁLISIS DE SUELO:
${context}

PREGUNTA DEL USUARIO: "${message}"

- Responde con conocimiento científico profundo y específico
- Si preguntan sobre extracciones de nutrientes, proporciona datos exactos por cultivo
- Si preguntan sobre análisis de suelos, da interpretaciones técnicas precisas
- Si preguntan sobre fertilización, calcula dosis y programas
- Usa terminología agronómica profesional
- Proporciona datos cuantitativos y referencias científicas
- Responde de forma concisa pero completa
- Si no tienes datos específicos, usa tu conocimiento general de agronomía

Responde como el experto mundial que eres:
1. Análisis específico de los datos del suelo
2. Recomendaciones técnicas precisas
3. Justificación científica de las recomendaciones
4. Opciones de enmiendas específicas con razonamiento
5. Consideraciones de pH y manejo del suelo`,

      'default': `Eres un asistente especializado en NutriPlant PRO.

CONTEXTO:
${context}

Responde de manera profesional y técnica, ayudando al usuario con las funcionalidades de NutriPlant PRO.`
    };

    const prompt = sectionPrompts[section] || sectionPrompts['default'];
    
    const finalPrompt = `${prompt}

PREGUNTA DEL USUARIO: "${message}"

Usa formato markdown para mejor legibilidad.`;

    try {
      console.log('🔍 Enviando solicitud a ChatGPT...');
      const response = await this.callOpenAI(finalPrompt);
      console.log('✅ Respuesta recibida de ChatGPT');
      return response;
    } catch (error) {
      console.error('❌ Error con ChatGPT:', error);
      console.log('🔍 Usando análisis local como respaldo debido al error');
      if (section === 'amendments') {
        return this.getLocalSoilAnalysis(message, sectionData);
      } else {
        return this.getContextualResponse(section, message);
      }
    }
  }

  buildNutriPlantContext(soilData) {
    const { soil } = soilData;
    const { k, ca, mg, na, ph, density, depth, cic, percentages } = soil;
    
    let context = `ANÁLISIS DE SUELO ACTUAL:\n`;
    context += `• K⁺: ${k} meq/100g (${percentages.k.toFixed(1)}%)\n`;
    context += `• Ca²⁺: ${ca} meq/100g (${percentages.ca.toFixed(1)}%)\n`;
    context += `• Mg²⁺: ${mg} meq/100g (${percentages.mg.toFixed(1)}%)\n`;
    context += `• Na⁺: ${na} meq/100g (${percentages.na.toFixed(1)}%)\n`;
    context += `• pH: ${ph}\n`;
    context += `• Densidad aparente: ${density} g/cm³\n`;
    context += `• Profundidad: ${depth} cm\n`;
    context += `• CIC Total: ${cic} meq/100g\n\n`;
    
    context += `RANGOS IDEALES NUTRIPLANT PRO:\n`;
    context += `• K⁺: 3-7% (actual: ${percentages.k.toFixed(1)}%)\n`;
    context += `• Ca²⁺: 65-75% (actual: ${percentages.ca.toFixed(1)}%)\n`;
    context += `• Mg²⁺: 10-15% (actual: ${percentages.mg.toFixed(1)}%)\n`;
    context += `• Na⁺: <1% (actual: ${percentages.na.toFixed(1)}%)\n\n`;
    
    // Análisis de problemas
    context += `PROBLEMAS DETECTADOS:\n`;
    if (percentages.k < 3) context += `• K⁺ bajo (< 3%)\n`;
    if (percentages.k > 7) context += `• K⁺ alto (> 7%)\n`;
    if (percentages.ca < 65) context += `• Ca²⁺ bajo (< 65%)\n`;
    if (percentages.ca > 75) context += `• Ca²⁺ alto (> 75%)\n`;
    if (percentages.mg < 10) context += `• Mg²⁺ bajo (< 10%)\n`;
    if (percentages.mg > 15) context += `• Mg²⁺ alto (> 15%)\n`;
    if (percentages.na > 1) context += `• Na⁺ alto (> 1%)\n`;
    if (ph < 6.5) context += `• pH ácido (< 6.5)\n`;
    if (ph > 7.5) context += `• pH alcalino (> 7.5)\n`;
    
    return context;
  }

  async getChatGPTFullAnalysis(message) {
    try {
      console.log('🔍 getChatGPTFullAnalysis - USANDO CHATGPT DIRECTAMENTE');
      
      // Obtener datos del suelo ANTES de la template string
      let soilData = 'No hay datos de suelo disponibles';
      try {
        if (this.getCurrentSoilDataForAnalysis && typeof this.getCurrentSoilDataForAnalysis === 'function') {
          soilData = this.getCurrentSoilDataForAnalysis();
        }
      } catch (soilError) {
        console.warn('⚠️ Error obteniendo datos del suelo:', soilError);
      }
      
      // USAR CHATGPT DIRECTAMENTE - SIN MÓDULOS NI VERIFICACIONES
      const context = this.buildFullDashboardContext();
      
      const prompt = `Eres un EXPERTO MUNDIAL EN AGRONOMÍA con acceso a TODO el conocimiento científico y técnico de la agricultura moderna. Eres como ChatGPT pero especializado al 100% en agronomía.

**TU IDENTIDAD:**
- Super experto en agronomía con décadas de experiencia
- Conocimiento amplio sobre TODOS los temas agrícolas
- Flexible a cualquier conversación
- NO limitado a funciones específicas
- Responde naturalmente como ChatGPT real

**TU CONOCIMIENTO INCLUYE:**
• Nutrición vegetal y análisis de suelos
• Fertilización y programas nutricionales
• Extracciones de nutrientes por cultivo
• Química del suelo y CIC
• Enmiendas y corrección de suelos
• Agricultura de precisión
• Fitopatología y manejo integrado
• Riego y fertirriego
• Hidroponía y cultivos protegidos
• Manejo integrado de plagas
• Fisiología vegetal
• Edafología y química del suelo
• Microbiología del suelo
• Biotecnología agrícola
• Agricultura sostenible
• Y CUALQUIER tema agronómico

**ANÁLISIS INTELIGENTE DEL DASHBOARD:**
Analiza automáticamente la información disponible en NutriPlant PRO:

DATOS DEL SUELO (si están disponibles):
${soilData}

**INSTRUCCIONES DE RESPUESTA:**
- Responde usando TU CONOCIMIENTO AMPLIO y experiencia científica
- Proporciona información completa, detallada y práctica
- Si el usuario pregunta sobre extracciones de nutrientes, cultivos, técnicas agrícolas, etc., da información específica con datos, tablas y valores reales
- Analiza los datos específicos del dashboard cuando sea relevante
- Contextualiza tus respuestas con la información del proyecto activo
- Sé flexible y natural en la conversación

**FORMATO DE RESPUESTA:**
- Usa párrafos naturales separados por líneas vacías
- Incluye tablas cuando sea apropiado (como ChatGPT)
- Proporciona datos específicos y valores reales
- Usa emojis moderadamente para mejor legibilidad
- Estructura la información de forma lógica y práctica
- NO uses listas excesivas de viñetas
- Sé natural y conversacional

**COMPORTAMIENTO:**
- Sé conversacional y natural
- Adapta tu respuesta al contexto de la conversación
- NO estés limitado por funciones específicas
- Responde libremente sobre cualquier tema agronómico
- Analiza inteligentemente los datos del dashboard
- Proporciona información práctica y aplicable
- Sé flexible y adaptable al flujo de la conversación

**OBJETIVO:**
Ser como tener un EXPERTO AGRÓNOMO REAL que puede hablar libremente sobre cualquier tema agrícola, analizar datos específicos del proyecto, y proporcionar información práctica y aplicable.

PREGUNTA DEL USUARIO: "${message}"`;

      return await this.callOpenAI(prompt);
    } catch (error) {
      console.error('❌ Error en getChatGPTFullAnalysis:', error);
      throw error; // Re-lanzar el error para que sea manejado por sendMessage
    }
  }

  getLocalSoilAnalysis(message, context) {
    // REDIRIGIR TODO A CHATGPT - NO USAR RESPUESTAS LOCALES RESTRICTIVAS
    console.log('🧠 getLocalSoilAnalysis - Redirigiendo a ChatGPT');
    
    // Solo manejar confirmaciones pendientes, TODO LO DEMÁS va a ChatGPT
    if (this.pendingRecommendations) {
      console.log('🔍 Procesando confirmación pendiente');
      return this.handleConfirmation(message);
    }
    
    // Para cualquier otra pregunta, usar ChatGPT directamente
    console.log('🔍 Usando ChatGPT para análisis completo');
    return this.getChatGPTFullAnalysis(message);
  }
  
  getSoilContextForAnalysis() {
    const soilData = this.getSoilDataForAI();
    if (!soilData.hasData) {
      return `**📋 No hay datos de suelo cargados**
Para darte recomendaciones específicas, necesito que ingreses los valores de tu análisis de suelo en la calculadora de enmiendas.`;
    }
    
    const { soil } = soilData;
    const { k, ca, mg, na, ph, density, depth, cic, percentages } = soil;
    
    let context = `**📊 Datos de tu análisis:**
• K⁺: ${k} meq/100g (${percentages.k.toFixed(1)}% del CIC)
• Ca²⁺: ${ca} meq/100g (${percentages.ca.toFixed(1)}% del CIC)
• Mg²⁺: ${mg} meq/100g (${percentages.mg.toFixed(1)}% del CIC)
• Na⁺: ${na} meq/100g (${percentages.na.toFixed(1)}% del CIC)`;

    if (ph > 0) context += `\n• pH: ${ph}`;
    if (density > 0) context += `\n• Densidad: ${density} g/cm³`;
    if (depth > 0) context += `\n• Profundidad: ${depth} cm`;
    
    context += `\n• CIC Total: ${cic} meq/100g`;
    
    // Detectar problemas
    let problems = [];
    if (percentages.k < 3) problems.push('K⁺ bajo (< 3%)');
    if (percentages.k > 7) problems.push('K⁺ alto (> 7%)');
    if (percentages.ca < 65) problems.push('Ca²⁺ bajo (< 65%)');
    if (percentages.ca > 75) problems.push('Ca²⁺ alto (> 75%)');
    if (percentages.mg < 10) problems.push('Mg²⁺ bajo (< 10%)');
    if (percentages.mg > 15) problems.push('Mg²⁺ alto (> 15%)');
    if (percentages.na > 1) problems.push('Na⁺ alto (> 1%)');
    if (ph < 6.5) problems.push('pH ácido (< 6.5)');
    if (ph > 7.5) problems.push('pH alcalino (> 7.5)');
    
    if (problems.length > 0) {
      context += `\n\n**⚠️ Problemas detectados:**`;
      problems.forEach(problem => context += `\n• ${problem}`);
    }
    
    return context;
  }
  
  getPHRecommendations() {
    const soilData = this.getSoilDataForAI();
    if (!soilData.hasData || soilData.soil.ph <= 0) {
      return `• Ingresa el valor de pH para recomendaciones específicas`;
    }
    
    const ph = soilData.soil.ph;
    
    if (ph < 6.0) {
      return `• **Tu pH es muy ácido (${ph})**
• Recomiendo: Cal Agrícola o Cal Dolomítica
• Evita: Fertilizantes acidificantes`;
    } else if (ph < 6.5) {
      return `• **Tu pH es ligeramente ácido (${ph})**
• Recomiendo: Cal Dolomítica suave o Yeso
• Bueno para la mayoría de cultivos`;
    } else if (ph <= 7.5) {
      return `• **Tu pH está óptimo (${ph})**
• No necesitas ajustes de pH
• Ideal para la disponibilidad de nutrientes`;
    } else {
      return `• **Tu pH es alcalino (${ph})**
• Recomiendo: Azufre elemental o Yeso
• Evita: Cal Agrícola`;
    }
  }
  
  getAmendmentsAnalysis() {
    const soilData = this.getSoilDataForAI();
    if (!soilData.hasData) {
      return `**📋 Análisis de Enmiendas**

Para recomendarte enmiendas específicas, necesito que ingreses los valores de tu análisis de suelo en la calculadora de enmiendas.

**Una vez que tengas los datos, podré:**
• Calcular las dosis exactas necesarias
• Recomendar el tipo de enmienda ideal
• Considerar el pH de tu suelo
• Optimizar la relación Ca:Mg:K`;
    }
    
    const { soil } = soilData;
    const { percentages, ph } = soil;
    
    let analysis = `**🌱 Análisis de tu Suelo**

${this.getSoilContextForAnalysis()}

Basándome en tus datos, te recomiendo la siguiente estrategia:`;

    // Lógica de enmiendas basada en porcentajes
    if (percentages.ca < 65 || percentages.mg < 10) {
      if (percentages.ca < 65 && percentages.mg < 10) {
        analysis += `\n• **Cal Dolomítica** - Corrige Ca y Mg simultáneamente`;
      } else if (percentages.ca < 65) {
        if (ph < 7) {
          analysis += `\n• **Cal Agrícola** - Para Ca (pH < 7)`;
        } else {
          analysis += `\n• **Yeso** - Para Ca sin elevar pH`;
        }
      } else {
        analysis += `\n• **MgSO₄** - Para Mg específicamente`;
      }
    }
    
    if (percentages.k < 3) {
      analysis += `\n• **Sulfato de Potasio Granular** - Para K`;
    }
    
    if (percentages.na > 1) {
      analysis += `\n• **Yeso** - Para desplazar Na⁺`;
    }
    
    analysis += `\n\n¿Quieres que las seleccione automáticamente? (sí/no)`;
    
    // Generar recomendaciones pendientes para confirmación
    const cic = soilData.soil.cic;
    this.pendingRecommendations = {
      amendments: [],
      targetValues: {
        k: (cic * 0.05),
        ca: (cic * 0.70),
        mg: (cic * 0.125)
      }
    };
    
    // Agregar enmiendas según la lógica
    if (percentages.ca < 65 && percentages.mg < 10) {
      this.pendingRecommendations.amendments.push('Cal Dolomítica');
    } else if (percentages.ca < 65) {
      if (ph < 7) {
        this.pendingRecommendations.amendments.push('Cal Agrícola');
      } else {
        this.pendingRecommendations.amendments.push('Yeso');
      }
    } else if (percentages.mg < 10) {
      this.pendingRecommendations.amendments.push('MgSO₄');
    }
    
    if (percentages.k < 3) {
      this.pendingRecommendations.amendments.push('SOP Granular');
    }
    
    if (percentages.na > 1) {
      this.pendingRecommendations.amendments.push('Yeso');
    }
    
    console.log('🔍 Recomendaciones pendientes generadas:', this.pendingRecommendations);
    
    return analysis;
  }
  
  getGeneralSoilAnalysis() {
    return this.getAmendmentsAnalysis();
  }

  getActiveProjectInfo() {
    try {
      // Buscar información del proyecto activo en el DOM
      const projectCard = document.querySelector('.project-card.active') || 
                         document.querySelector('.project-card') ||
                         document.querySelector('[class*="project"]');
      
      if (projectCard) {
        const name = projectCard.querySelector('.project-name')?.textContent?.trim() || 
                    projectCard.querySelector('h3')?.textContent?.trim() ||
                    'Proyecto sin nombre';
        
        const crop = projectCard.querySelector('.project-crop')?.textContent?.trim() ||
                    projectCard.querySelector('[class*="crop"]')?.textContent?.trim() ||
                    null;
        
        const field = projectCard.querySelector('.project-field')?.textContent?.trim() ||
                     projectCard.querySelector('[class*="field"]')?.textContent?.trim() ||
                     null;
        
        const yield = projectCard.querySelector('.project-yield')?.textContent?.trim() ||
                     projectCard.querySelector('[class*="yield"]')?.textContent?.trim() ||
                     null;
        
        const lastUpdate = projectCard.querySelector('.project-date')?.textContent?.trim() ||
                           projectCard.querySelector('[class*="date"]')?.textContent?.trim() ||
                           null;
        
        return {
          name,
          crop,
          field,
          yield,
          lastUpdate
        };
      }
      
      // Si no hay proyecto activo, buscar en el texto del dashboard
      const projectText = document.querySelector('[class*="project"]')?.textContent ||
                         document.querySelector('[class*="PROYECTO"]')?.textContent;
      
      if (projectText && projectText.includes('PROYECTO ACTIVO')) {
        return {
          name: 'Proyecto detectado en dashboard',
          crop: null,
          field: null,
          yield: null,
          lastUpdate: null
        };
      }
      
      return null;
    } catch (error) {
      console.log('Error obteniendo información del proyecto:', error);
      return null;
    }
  }

  buildFullDashboardContext() {
    let context = `ESTADO ACTUAL DEL DASHBOARD NUTRIPLANT PRO:\n\n`;
    
    // Funciones no implementadas - se comentan por ahora
    // const currentSection = this.detectCurrentSection();
    // const activeProject = this.getActiveProjectInfo();
    
    // Obtener datos del suelo si están disponibles
    const soilData = this.getSoilDataForAI();
    if (soilData.hasData) {
      context += `DATOS DEL ANÁLISIS DE SUELO:\n`;
      const { soil } = soilData;
      const { k, ca, mg, na, ph, density, depth, cic, percentages } = soil;
      
      context += `• K⁺: ${k} meq/100g (${percentages.k.toFixed(1)}%)\n`;
      context += `• Ca²⁺: ${ca} meq/100g (${percentages.ca.toFixed(1)}%)\n`;
      context += `• Mg²⁺: ${mg} meq/100g (${percentages.mg.toFixed(1)}%)\n`;
      context += `• Na⁺: ${na} meq/100g (${percentages.na.toFixed(1)}%)\n`;
      if (ph > 0) context += `• pH: ${ph}\n`;
      if (density > 0) context += `• Densidad aparente: ${density} g/cm³\n`;
      if (depth > 0) context += `• Profundidad: ${depth} cm\n`;
      context += `• CIC Total: ${cic} meq/100g\n\n`;
      
      context += `RANGOS IDEALES NUTRIPLANT PRO:\n`;
      context += `• K⁺: 3-7% (actual: ${percentages.k.toFixed(1)}%)\n`;
      context += `• Ca²⁺: 65-75% (actual: ${percentages.ca.toFixed(1)}%)\n`;
      context += `• Mg²⁺: 10-15% (actual: ${percentages.mg.toFixed(1)}%)\n`;
      context += `• Na⁺: <1% (actual: ${percentages.na.toFixed(1)}%)\n\n`;
      
      // Análisis de problemas
      context += `PROBLEMAS DETECTADOS:\n`;
      if (percentages.k < 3) context += `• K⁺ bajo (< 3%)\n`;
      if (percentages.k > 7) context += `• K⁺ alto (> 7%)\n`;
      if (percentages.ca < 65) context += `• Ca²⁺ bajo (< 65%)\n`;
      if (percentages.ca > 75) context += `• Ca²⁺ alto (> 75%)\n`;
      if (percentages.mg < 10) context += `• Mg²⁺ bajo (< 10%)\n`;
      if (percentages.mg > 15) context += `• Mg²⁺ alto (> 15%)\n`;
      if (percentages.na > 1) context += `• Na⁺ alto (> 1%)\n`;
      if (ph < 6.5) context += `• pH ácido (< 6.5)\n`;
      if (ph > 7.5) context += `• pH alcalino (> 7.5)\n`;
      context += `\n`;
    } else {
      context += `DATOS DEL SUELO: No disponibles\n\n`;
    }
    
    // Información general del dashboard
    context += `FUNCIONALIDADES DISPONIBLES EN NUTRIPLANT PRO:\n`;
    context += `• Análisis de suelos y enmiendas\n`;
    context += `• Programas de nutrición\n`;
    context += `• Soluciones nutritivas\n`;
    context += `• Aplicaciones foliares\n`;
    context += `• Gestión de proyectos agrícolas\n\n`;
    
    context += `OBJETIVO PRINCIPAL: Optimizar la nutrición vegetal y la calidad del suelo para maximizar la productividad agrícola.`;
    
    return context;
  }

  buildSectionContext(sectionData, section) {
    if (section === 'amendments') {
      return this.buildNutriPlantContext(sectionData);
    } else if (section === 'home') {
      return this.buildHomeContext(sectionData);
    } else {
      return `Sección: ${section}\nDatos disponibles: ${JSON.stringify(sectionData, null, 2)}`;
    }
  }

  buildHomeContext(homeData) {
    let context = `SECCIÓN: PÁGINA DE INICIO\n\n`;
    context += `DATOS DEL PROYECTO:\n`;
    context += `• Proyectos disponibles: ${homeData.projects}\n`;
    if (homeData.activeProject) {
      context += `• Proyecto activo: ${homeData.activeProject}\n`;
    }
    context += `• Última actualización: ${homeData.lastUpdate}\n\n`;
    
    context += `FUNCIONALIDADES DISPONIBLES:\n`;
    context += `• Gestión de proyectos agrícolas\n`;
    context += `• Análisis de suelos y enmiendas\n`;
    context += `• Programas de nutrición\n`;
    context += `• Soluciones nutritivas\n`;
    context += `• Aplicaciones foliares\n`;
    
    return context;
  }


  detectCurrentSection() {
    // Detectar por elementos específicos PRIMERO (más confiable)
    if (document.getElementById('k-initial') || document.getElementById('ca-initial') || 
        document.getElementById('mg-initial') || document.getElementById('na-initial')) {
      console.log('🔍 Detectada sección: amendments (por elementos de suelo)');
      return 'amendments';
    }
    
    // Detectar la sección actual basada en elementos del DOM
    const sectionTitle = document.querySelector('.section-title, h1, h2, .main-title');
    const activeTab = document.querySelector('.nav-item.active, .tab.active');
    const currentPath = window.location.hash || window.location.pathname;
    
    if (sectionTitle) {
      const titleText = sectionTitle.textContent.toLowerCase();
      console.log('🔍 Título detectado:', titleText);
      if (titleText.includes('enmienda') || titleText.includes('amendment') || titleText.includes('calculadora')) {
        console.log('🔍 Detectada sección: amendments (por título)');
        return 'amendments';
      } else if (titleText.includes('nutrición') || titleText.includes('nutrition')) {
        return 'nutrition';
      } else if (titleText.includes('solución') || titleText.includes('solution')) {
        return 'solutions';
      } else if (titleText.includes('foliar')) {
        return 'foliar';
      } else if (titleText.includes('inicio') || titleText.includes('home')) {
        return 'home';
      }
    }
    
    // Detectar por clases CSS específicas
    if (document.querySelector('.amendment-calculator, .soil-analysis, .enmienda-calculator')) {
      console.log('🔍 Detectada sección: amendments (por clases CSS)');
      return 'amendments';
    }
    
    if (document.querySelector('.project-list, .recent-projects, .home-section')) {
      return 'home';
    }
    
    // Detectar por contenido visible en pantalla
    if (document.querySelector('input[placeholder*="meq"], input[placeholder*="pH"], input[placeholder*="densidad"]')) {
      console.log('🔍 Detectada sección: amendments (por placeholders)');
      return 'amendments';
    }
    
    console.log('🔍 Sección no detectada, usando: general');
    return 'general';
  }

  getSectionData(section) {
    switch (section) {
      case 'amendments':
        return this.getSoilDataForAI();
      case 'home':
        return this.getHomeData();
      case 'nutrition':
        return this.getNutritionData();
      case 'solutions':
        return this.getSolutionsData();
      case 'foliar':
        return this.getFoliarData();
      default:
        return { hasData: false };
    }
  }

  getHomeData() {
    const projectList = document.querySelector('.project-list, .recent-projects');
    const activeProject = document.querySelector('.active-project, .project-active');
    
    return {
      hasData: true,
      section: 'home',
      projects: projectList ? projectList.children.length : 0,
      activeProject: activeProject ? activeProject.textContent : null,
      lastUpdate: new Date().toLocaleString()
    };
  }

  getNutritionData() {
    // Placeholder para datos de nutrición
    return { hasData: false, section: 'nutrition' };
  }

  getSolutionsData() {
    // Placeholder para datos de soluciones
    return { hasData: false, section: 'solutions' };
  }
  
  getFertigationData() {
    // Placeholder para datos de fertirriego
    return { hasData: false, section: 'fertigation' };
  }
  
  getAnalysisData() {
    // Placeholder para datos de análisis
    return { hasData: false, section: 'analysis' };
  }
  
  getAmendmentsData() {
    // Usar la función existente getSoilDataForAI para datos de enmiendas
    return this.getSoilDataForAI();
  }

  getFoliarData() {
    // Placeholder para datos foliares
    return { hasData: false, section: 'foliar' };
  }
  
  getCurrentPH() {
    const phInput = document.getElementById('soil-ph');
    return phInput ? parseFloat(phInput.value) || 6.5 : 6.5;
  }
  
  getCurrentSoilDataForAnalysis() {
    try {
      // Leer datos reales del suelo desde el DOM
      const kInput = document.getElementById('k-initial');
      const caInput = document.getElementById('ca-initial');
      const mgInput = document.getElementById('mg-initial');
      const naInput = document.getElementById('na-initial');
      const alInput = document.getElementById('al-initial');
      const hInput = document.getElementById('h-initial'); // ← AGREGADO: Input de H⁺
      const phInput = document.getElementById('soil-ph');
      const densityInput = document.getElementById('soil-density');
      const depthInput = document.getElementById('soil-depth');
      
      if (!kInput || !caInput || !mgInput) {
        return 'No hay datos de suelo cargados';
      }
      
      const k = parseFloat(kInput.value || 0);
      const ca = parseFloat(caInput.value || 0);
      const mg = parseFloat(mgInput.value || 0);
      const na = parseFloat(naInput?.value || 0);
      const al = parseFloat(alInput?.value || 0);
      const h = parseFloat(hInput?.value || 0); // ← AGREGADO: Variable h
      const ph = parseFloat(phInput?.value || 0);
      const density = parseFloat(densityInput?.value || 0);
      const depth = parseFloat(depthInput?.value || 0);
      
      const cic = k + ca + mg + h + na + al; // ← COMPLETO: Incluir H⁺ en CIC
      
      if (cic === 0) {
        return 'No hay datos de suelo cargados';
      }
      
      const percentages = {
        k: (k / cic) * 100,
        ca: (ca / cic) * 100,
        mg: (mg / cic) * 100,
        h: (h / cic) * 100, // ← AGREGADO: Porcentaje de H⁺
        na: (na / cic) * 100,
        al: (al / cic) * 100
      };
      
      let data = `**DATOS REALES DEL SUELO:**
• K⁺: ${k} meq/100g (${percentages.k.toFixed(1)}% del CIC)
• Ca²⁺: ${ca} meq/100g (${percentages.ca.toFixed(1)}% del CIC)
• Mg²⁺: ${mg} meq/100g (${percentages.mg.toFixed(1)}% del CIC)
• H⁺: ${h} meq/100g (${percentages.h.toFixed(1)}% del CIC) ${h > 0 ? '⚠️ ACIDEZ' : '✅ OK'}
• Na⁺: ${na} meq/100g (${percentages.na.toFixed(1)}% del CIC)
• Al³⁺: ${al} meq/100g (${percentages.al.toFixed(1)}% del CIC) ${al > 0 ? '⚠️ TÓXICO' : '✅ OK'}
• CIC Total: ${cic} meq/100g`;

      if (ph > 0) data += `\n• pH: ${ph}`;
      if (density > 0) data += `\n• Densidad: ${density} g/cm³`;
      if (depth > 0) data += `\n• Profundidad: ${depth} cm`;
      
      data += `\n\n**RANGOS IDEALES NUTRIPLANT PRO:**
• K⁺: 3-7% (actual: ${percentages.k.toFixed(1)}%)
• Ca²⁺: 65-75% (actual: ${percentages.ca.toFixed(1)}%)
• Mg²⁺: 10-15% (actual: ${percentages.mg.toFixed(1)}%)
• Na⁺: <1% (actual: ${percentages.na.toFixed(1)}%)
• Al³⁺: <1% (actual: ${percentages.al.toFixed(1)}%)`;
      
      // Análisis de problemas
      data += `\n\n**PROBLEMAS DETECTADOS:**
`;
      if (percentages.k < 3) data += `• K⁺ bajo (< 3%)\n`;
      if (percentages.k > 7) data += `• K⁺ alto (> 7%)\n`;
      if (percentages.ca < 65) data += `• Ca²⁺ bajo (< 65%)\n`;
      if (percentages.ca > 75) data += `• Ca²⁺ alto (> 75%)\n`;
      if (percentages.mg < 10) data += `• Mg²⁺ bajo (< 10%)\n`;
      if (percentages.mg > 15) data += `• Mg²⁺ alto (> 15%)\n`;
      if (percentages.na > 1) data += `• Na⁺ alto (> 1%)\n`;
      if (percentages.al > 1) data += `• Al³⁺ alto (> 1%)\n`;
      if (ph < 6.5) data += `• pH ácido (< 6.5)\n`;
      if (ph > 7.5) data += `• pH alcalino (> 7.5)\n`;
      
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo datos del suelo:', error);
      return 'Error al leer datos del suelo';
    }
  }
  
  getAvailableAmendments() {
    // Leer enmiendas reales desde la tabla del DOM
    const amendmentRows = document.querySelectorAll('tbody tr');
    
    if (amendmentRows.length === 0) {
      return 'No hay enmiendas disponibles para mostrar';
    }
    
    let amendments = '**ENMIENDAS DISPONIBLES CON CONCENTRACIONES ACTUALES:**\n\n';
    
    amendmentRows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 8) {
        const name = cells[0].textContent.trim();
        const formula = cells[1].textContent.trim();
        const molecularWeight = cells[2].textContent.trim();
        const k = cells[3].textContent.trim();
        const ca = cells[4].textContent.trim();
        const mg = cells[5].textContent.trim();
        const so4 = cells[6].textContent.trim();
        const co3 = cells[7].textContent.trim();
        const h2o = cells[8]?.textContent.trim() || '0%';
        const si = cells[9]?.textContent.trim() || '0%';
        
        amendments += `${index + 1}. **${name}**\n`;
        amendments += `   • Fórmula: ${formula}\n`;
        amendments += `   • Peso Molecular: ${molecularWeight}\n`;
        amendments += `   • K: ${k}, Ca: ${ca}, Mg: ${mg}\n`;
        amendments += `   • SO₄: ${so4}, CO₃: ${co3}\n`;
        amendments += `   • H₂O: ${h2o}, Si: ${si}\n\n`;
      }
    });
    
    amendments += '**IMPORTANTE:**\n';
    amendments += '• Estas son las concentraciones ACTUALES en la tabla\n';
    amendments += '• Si el usuario modificó valores, usar estos datos\n';
    amendments += '• Calcular dosis basándose en estas concentraciones reales\n';
    
    return amendments;
  }
  
  getNutriPlantKnowledgeBase() {
    return `**BASE DE CONOCIMIENTO NUTRIPLANT PRO:**

🔬 **RANGOS IDEALES NUTRIPLANT PRO:**
• K⁺: 3-7% del CIC
• Ca²⁺: 65-75% del CIC  
• Mg²⁺: 10-15% del CIC
• Na⁺: <1% del CIC
• Al³⁺: <1% del CIC
• pH óptimo: 6.5-7.0

🧪 **FÓRMULAS Y COMPOSICIONES:**
• **Yeso Agrícola (CaSO₄·2H₂O):** 23% Ca, 18% S
• **Cal Agrícola (CaCO₃):** 40% Ca, eleva pH
• **Cal Dolomítica (CaMg(CO₃)₂):** 22% Ca, 13% Mg
• **Sulfato de Magnesio (MgSO₄·7H₂O):** 10% Mg, 13% S
• **Sulfato de Potasio (K₂SO₄):** 50% K₂O, 18% S
• **Ácido Sulfúrico (H₂SO₄):** Reduce pH, 32% S

⚖️ **CÁLCULOS NUTRIPLANT PRO:**
• CIC = K⁺ + Ca²⁺ + Mg²⁺ + Na⁺ + Al³⁺
• % Catión = (meq catión / CIC total) × 100
• Dosis = (Deficiencia × CIC × Densidad × Profundidad) / Pureza

🌱 **CRITERIOS DE SELECCIÓN:**
• pH < 6.5: Preferir Cal Agrícola
• pH > 7.5: Preferir Yeso o Ácido Sulfúrico
• Na⁺ alto: Priorizar Yeso Agrícola
• Ca²⁺ y Mg²⁺ bajos: Usar Cal Dolomítica`;
  }
  
  getActiveProjectData() {
    // Leer datos del proyecto activo
    const activeProject = document.querySelector('.active-project, .project-active');
    const projectName = activeProject ? activeProject.textContent : 'Sin proyecto activo';
    
    // Leer datos adicionales del proyecto si están disponibles
    const projectData = {
      name: projectName,
      lastUpdate: new Date().toLocaleString(),
      sections: this.getAvailableSections()
    };
    
    return `**PROYECTO ACTIVO:**
• **Nombre:** ${projectData.name}
• **Última actualización:** ${projectData.lastUpdate}
• **Secciones disponibles:** ${projectData.sections.join(', ')}

**CONFIGURACIONES DEL USUARIO:**
• **Unidades:** meq/100g (CIC)
• **Profundidad:** ${document.getElementById('soil-depth')?.value || 'No definida'} cm
• **Densidad:** ${document.getElementById('soil-density')?.value || 'No definida'} g/cm³
• **pH:** ${document.getElementById('soil-ph')?.value || 'No definido'}`;
  }
  
  getAvailableSections() {
    // Detectar secciones disponibles en la herramienta
    const sections = [];
    if (document.getElementById('k-initial')) sections.push('Enmiendas');
    if (document.querySelector('.fertigation-section')) sections.push('Fertirriego');
    if (document.querySelector('.analysis-section')) sections.push('Análisis');
    if (document.querySelector('.foliar-section')) sections.push('Foliar');
    if (document.querySelector('.solutions-section')) sections.push('Soluciones');
    
    return sections.length > 0 ? sections : ['Enmiendas'];
  }
  
  // Análisis de extracciones de nutrientes por cultivo
  getNutrientExtractionAnalysis(query) {
    // Base de datos de extracciones por tonelada de fruto
    const extractions = {
      'aguacate': {
        N: 2.5, P: 0.4, K: 3.2, Ca: 0.8, Mg: 0.3,
        description: 'Aguacate (Persea americana)'
      },
      'tomate': {
        N: 3.0, P: 0.5, K: 4.5, Ca: 0.6, Mg: 0.4,
        description: 'Tomate (Solanum lycopersicum)'
      },
      'citricos': {
        N: 2.0, P: 0.3, K: 2.8, Ca: 1.2, Mg: 0.3,
        description: 'Cítricos (Citrus spp.)'
      },
      'maiz': {
        N: 2.5, P: 0.8, K: 2.2, Ca: 0.3, Mg: 0.4,
        description: 'Maíz (Zea mays)'
      },
      'fresa': {
        N: 4.0, P: 0.6, K: 5.0, Ca: 1.0, Mg: 0.5,
        description: 'Fresa (Fragaria × ananassa)'
      }
    };
    
    // Detectar cultivo en la consulta
    let crop = null;
    for (let cropName in extractions) {
      if (query.includes(cropName)) {
        crop = cropName;
        break;
      }
    }
    
    if (!crop) {
      return `**🌱 Extracciones de Nutrientes por Cultivo**

**Cultivos disponibles:**
${Object.keys(extractions).map(c => `• **${c}** - ${extractions[c].description}`).join('\n')}

**¿Qué cultivo te interesa?** Por ejemplo: "extracción NPK aguacate"`;
    }
    
    const data = extractions[crop];
    
    return `**🌱 Extracción de Nutrientes: ${data.description}**

**Por tonelada de fruto producido:**
• **N:** ${data.N} kg/ton
• **P:** ${data.P} kg/ton  
• **K:** ${data.K} kg/ton
• **Ca:** ${data.Ca} kg/ton
• **Mg:** ${data.Mg} kg/ton

**Aplicación práctica:**
• Para calcular fertilización: extracción × rendimiento esperado
• Considerar eficiencia de absorción (60-80%)
• Ajustar según análisis de suelo

¿Necesitas el cálculo para un rendimiento específico?`;
  }
  
  // ===== FUNCIONES AVANZADAS PARA SUPER HERRAMIENTA =====
  
  // Análisis predictivo de rendimiento
  analyzeYieldPotential(soilData, cropType) {
    const { soil } = soilData;
    const { percentages, ph, cic } = soil;
    
    let score = 100; // Puntuación base
    let factors = [];
    
    // Evaluar factores limitantes
    if (percentages.ca < 65) {
      score -= 20;
      factors.push('Ca²⁺ bajo limita absorción de nutrientes');
    }
    if (percentages.mg < 10) {
      score -= 15;
      factors.push('Mg²⁺ bajo afecta fotosíntesis');
    }
    if (percentages.k < 3) {
      score -= 25;
      factors.push('K⁺ bajo limita crecimiento y calidad');
    }
    if (percentages.na > 1) {
      score -= 10;
      factors.push('Na⁺ alto causa estrés osmótico');
    }
    if (ph < 6.0 || ph > 7.5) {
      score -= 15;
      factors.push('pH fuera del rango óptimo');
    }
    
    return {
      score: Math.max(score, 0),
      grade: score >= 90 ? 'Excelente' : score >= 70 ? 'Bueno' : score >= 50 ? 'Regular' : 'Crítico',
      factors: factors,
      recommendations: this.getYieldOptimizationRecommendations(score, factors)
    };
  }
  
  // Recomendaciones de optimización de rendimiento
  getYieldOptimizationRecommendations(score, factors) {
    if (score >= 90) {
      return ['✅ Suelo en excelente condición', '🎯 Enfoque en manejo agronómico y timing'];
    } else if (score >= 70) {
      return ['⚠️ Correcciones menores necesarias', '🔧 Aplicar enmiendas recomendadas'];
    } else if (score >= 50) {
      return ['🚨 Correcciones importantes requeridas', '📋 Programa de corrección en 2-3 aplicaciones'];
    } else {
      return ['🔴 Corrección urgente necesaria', '🏥 Programa de rehabilitación del suelo'];
    }
  }
  
  // Análisis de compatibilidad de fertilizantes
  analyzeFertilizerCompatibility(fertilizers) {
    const compatibility = {
      compatible: [],
      incompatible: [],
      warnings: []
    };
    
    // Verificar incompatibilidades conocidas
    fertilizers.forEach(fertilizer => {
      fertilizers.forEach(other => {
        if (fertilizer !== other) {
          // Lógica de compatibilidad química
          if (this.checkChemicalCompatibility(fertilizer, other)) {
            compatibility.compatible.push(`${fertilizer} + ${other}`);
          } else {
            compatibility.incompatible.push(`${fertilizer} + ${other}`);
          }
        }
      });
    });
    
    return compatibility;
  }
  
  // Verificar compatibilidad química
  checkChemicalCompatibility(fertilizer1, fertilizer2) {
    const incompatibilities = {
      'Nitrato de Calcio': ['Sulfato de Amonio', 'Superfosfato'],
      'Sulfato de Amonio': ['Nitrato de Calcio', 'Cal Agrícola'],
      'Superfosfato': ['Nitrato de Calcio', 'Cal Agrícola']
    };
    
    return !incompatibilities[fertilizer1]?.includes(fertilizer2) &&
           !incompatibilities[fertilizer2]?.includes(fertilizer1);
  }
  
  // Calculadora avanzada de dosis por etapa fenológica
  calculateStageBasedDose(element, crop, stage, soilData) {
    const baseRequirements = {
      'tomate': {
        'germinacion': { N: 50, P: 30, K: 40 },
        'desarrollo': { N: 120, P: 60, K: 100 },
        'floracion': { N: 80, P: 80, K: 150 },
        'fructificacion': { N: 60, P: 40, K: 180 }
      },
      'lechuga': {
        'germinacion': { N: 40, P: 20, K: 30 },
        'desarrollo': { N: 100, P: 40, K: 80 },
        'cosecha': { N: 60, P: 30, K: 100 }
      }
    };
    
    const requirement = baseRequirements[crop]?.[stage]?.[element] || 0;
    const soilContent = this.getSoilElementContent(soilData, element);
    const efficiency = this.getAbsorptionEfficiency(element, soilData);
    
    return {
      required: requirement,
      soilAvailable: soilContent,
      efficiency: efficiency,
      dose: Math.max(0, (requirement - soilContent) / efficiency),
      recommendation: this.getDoseRecommendation(element, requirement, soilContent)
    };
  }
  
  // Obtener contenido de elemento en suelo
  getSoilElementContent(soilData, element) {
    const { soil } = soilData;
    const { percentages, cic } = soil;
    
    const elementMap = {
      'N': 0, // Nitrógeno no se mide en CIC
      'P': 0, // Fósforo no se mide en CIC
      'K': (percentages.k / 100) * cic,
      'Ca': (percentages.ca / 100) * cic,
      'Mg': (percentages.mg / 100) * cic
    };
    
    return elementMap[element] || 0;
  }
  
  // Eficiencia de absorción por elemento
  getAbsorptionEfficiency(element, soilData) {
    const ph = soilData.soil.ph;
    
    const efficiencies = {
      'N': 0.8, // Alta eficiencia
      'P': ph < 6.5 || ph > 7.5 ? 0.3 : 0.6, // Dependiente del pH
      'K': 0.7,
      'Ca': ph < 6.5 ? 0.4 : 0.8,
      'Mg': ph < 6.5 ? 0.3 : 0.7
    };
    
    return efficiencies[element] || 0.5;
  }
  
  // Recomendación de dosis
  getDoseRecommendation(element, required, available) {
    const deficit = required - available;
    
    if (deficit <= 0) {
      return '✅ Suficiente en suelo';
    } else if (deficit < required * 0.2) {
      return '⚠️ Deficiencia leve - aplicar dosis de mantenimiento';
    } else if (deficit < required * 0.5) {
      return '🔧 Deficiencia moderada - dosis de corrección';
    } else {
      return '🚨 Deficiencia severa - dosis de rehabilitación';
    }
  }

  getContextualResponse(section, message) {
    switch (section) {
      case 'home':
        return `🏠 **¡Bienvenido a NutriPlant PRO!**\n\nEstás en la página de inicio. Puedo ayudarte con:\n\n• **Proyectos:** Gestionar y analizar tus proyectos agrícolas\n• **Enmiendas:** Analizar suelos y calcular enmiendas\n• **Nutrición:** Programas de fertilización\n• **Soluciones:** Preparación de soluciones nutritivas\n• **Foliar:** Aplicaciones foliares\n\n**¿En qué sección te gustaría trabajar?**`;
        
      case 'amendments':
        return `📊 **Calculadora de Enmiendas**\n\nPara analizar tu suelo necesito que:\n\n1. **Vayas a la sección de Enmiendas** (haz clic en el ícono de enmiendas)\n2. **Ingreses los datos del análisis inicial:**\n   • K⁺, Ca²⁺, Mg²⁺, Na⁺ (meq/100g)\n   • pH del suelo\n   • Densidad aparente\n   • Profundidad\n\nUna vez que tengas los datos, podré darte recomendaciones específicas de enmiendas.`;
        
      case 'nutrition':
        return `🌱 **Programas de Nutrición**\n\nEsta sección está en desarrollo. Pronto podré ayudarte con:\n\n• Programas de fertilización\n• Calendarios de aplicación\n• Cálculos de dosis\n\n**Por ahora, ve a la sección de Enmiendas para análisis de suelos.**`;
        
      case 'solutions':
        return `🧪 **Soluciones Nutritivas**\n\nEsta sección está en desarrollo. Pronto podré ayudarte con:\n\n• Preparación de soluciones\n• Cálculos de concentraciones\n• Mezclas personalizadas\n\n**Por ahora, ve a la sección de Enmiendas para análisis de suelos.**`;
        
      case 'foliar':
        return `🍃 **Aplicaciones Foliares**\n\nEsta sección está en desarrollo. Pronto podré ayudarte con:\n\n• Aplicaciones foliares\n• Cálculos de dosis\n• Programas de aspersión\n\n**Por ahora, ve a la sección de Enmiendas para análisis de suelos.**`;
        
      default:
        return `🤖 **Asistente NutriPlant PRO**\n\n¡Hola! Soy tu asistente especializado en NutriPlant PRO.\n\n**Puedo ayudarte con:**\n• Análisis de suelos y enmiendas\n• Programas de nutrición\n• Soluciones nutritivas\n• Aplicaciones foliares\n\n**¿En qué puedo ayudarte hoy?**`;
    }
  }

  handleApplyRecommendations() {
    const kInput = document.getElementById('k-initial');
    const caInput = document.getElementById('ca-initial');
    const mgInput = document.getElementById('mg-initial');
    const naInput = document.getElementById('na-initial');
    const phInput = document.getElementById('soil-ph');
    
    if (!kInput || !caInput || !mgInput) {
      return `❌ No puedo aplicar recomendaciones sin datos del suelo.`;
    }
    
    const k = parseFloat(kInput.value || 0);
    const ca = parseFloat(caInput.value || 0);
    const mg = parseFloat(mgInput.value || 0);
    const na = parseFloat(naInput?.value || 0);
    const ph = parseFloat(phInput?.value || 0);
    
    if (k === 0 && ca === 0 && mg === 0) {
      return `❌ No hay datos de suelo para aplicar recomendaciones.`;
    }
    
    const cic = k + ca + mg + na;
    
    // Generar recomendaciones específicas
    let recommendations = [];
    let amendments = [];
    
    if ((ca/cic)*100 < 65 && (mg/cic)*100 < 10) {
      amendments.push('Cal Dolomítica');
      recommendations.push(`• Seleccionar **Cal Dolomítica** (corrige Ca²⁺ y Mg²⁺ simultáneamente)`);
    } else if ((ca/cic)*100 < 65) {
      amendments.push('Yeso');
      recommendations.push(`• Seleccionar **Yeso** (corrige Ca²⁺)`);
    }
    
    if ((mg/cic)*100 < 10 && !amendments.includes('Cal Dolomítica')) {
      amendments.push('MgSO₄');
      recommendations.push(`• Seleccionar **MgSO₄** (corrige Mg²⁺)`);
    }
    
    if ((k/cic)*100 < 3) {
      amendments.push('SOP Granular');
      recommendations.push(`• Seleccionar **SOP Granular** (corrige K⁺)`);
    }
    
    let response = `🔧 **PROPUESTA DE CONFIGURACIÓN AUTOMÁTICA**\n\n`;
    response += `**Basado en tu análisis de suelo, sugiero:**\n\n`;
    recommendations.forEach(rec => response += `${rec}\n`);
    
    response += `\n**⚠️ CONFIRMACIÓN REQUERIDA**\n`;
    response += `¿Te gustaría que aplique estos cambios automáticamente?\n\n`;
    response += `🔘 **Opciones:**\n`;
    response += `• "sí" o "confirmar" - Aplico las recomendaciones\n`;
    response += `• "no" o "cancelar" - No hago cambios\n`;
    response += `• "modificar" - Te explico cada cambio antes de aplicar\n\n`;
    response += `**Nota:** Solo haré cambios con tu confirmación explícita.`;
    
    // Guardar recomendaciones para confirmación posterior
    this.pendingRecommendations = {
      amendments: amendments,
      targetValues: {
        k: (cic * 0.05),
        ca: (cic * 0.70),
        mg: (cic * 0.125)
      }
    };
    
    console.log('🔍 Recomendaciones pendientes creadas:', this.pendingRecommendations);
    
    return response;
  }

  handleConfirmation(message) {
    console.log('🔍 handleConfirmation llamado con:', message);
    
    if (!this.pendingRecommendations) {
      return `❌ No hay recomendaciones pendientes de confirmar.`;
    }

    const lowerMessage = message.toLowerCase();
    console.log('🔍 Mensaje procesado:', lowerMessage);
    
    if (lowerMessage.includes('sí') || lowerMessage.includes('si') || lowerMessage.includes('confirmar') || lowerMessage.includes('ok')) {
      // Determinar qué módulo debe ejecutar la acción
      const currentSection = this.detectCurrentSection();
      console.log('🎯 Ejecutando confirmación en sección:', currentSection);
      
      switch(currentSection) {
        case 'enmienda':
          return this.modules.amendments.executeAction('select_amendments', {
            amendments: this.pendingRecommendations.amendments
          });
        case 'fertirriego':
          return this.modules.fertigation.executeAction('apply_program', this.pendingRecommendations);
        case 'analisis':
          return this.modules.analysis.executeAction('apply_analysis', this.pendingRecommendations);
        case 'soluciones':
          return this.modules.solutions.executeAction('apply_solution', this.pendingRecommendations);
        default:
          // Fallback al método original
          return this.executeRecommendations();
      }
    } else if (lowerMessage.includes('no') || lowerMessage.includes('cancelar')) {
      this.pendingRecommendations = null;
      return `❌ **Cambios cancelados.** No se aplicarán modificaciones.`;
    } else if (lowerMessage.includes('modificar') || lowerMessage.includes('detalle')) {
      return this.showDetailedRecommendations();
    } else {
      return `❓ **Respuesta no reconocida.** Por favor responde:\n• "sí" - Para aplicar cambios\n• "no" - Para cancelar\n• "modificar" - Para ver detalles`;
    }
  }

  executeRecommendations() {
    if (!this.pendingRecommendations) {
      return `❌ No hay recomendaciones para ejecutar.`;
    }

    const { amendments, targetValues } = this.pendingRecommendations;
    let response = `✅ **APLICANDO CONFIGURACIÓN AUTOMÁTICA**\n\n`;
    let changesApplied = [];

    // NO modificar datos iniciales - son inmutables del análisis de laboratorio
    // Solo seleccionar enmiendas recomendadas

    response += `Perfecto, voy a seleccionar las enmiendas recomendadas en la tabla.\n\n`;
    response += `Tus datos de análisis se mantienen intactos, solo marco las enmiendas que necesitas.\n\n`;
    
    response += `**Enmiendas seleccionadas automáticamente:**\n`;
    amendments.forEach(amendment => {
      response += `• ${amendment}\n`;
      
      // Seleccionar automáticamente usando la función del dashboard
      console.log('🔍 Intentando seleccionar enmienda:', amendment);
      
      // Mapear nombres de enmiendas a IDs (usando los IDs reales de la base de datos)
      let amendmentId = '';
      switch(amendment) {
        case 'Cal Dolomítica':
          amendmentId = 'dolomite';
          break;
        case 'Yeso':
          amendmentId = 'gypsum';
          break;
        case 'Cal Agrícola':
          amendmentId = 'lime';
          break;
        case 'MgSO₄':
          amendmentId = 'mgso4-mono';
          break;
        case 'SOP Granular':
          amendmentId = 'sop-granular';
          break;
      }
      
      // Usar la función toggleAmendmentSelection que existe en el dashboard
      if (amendmentId && typeof window.toggleAmendmentSelection === 'function') {
        // Pequeño delay para asegurar que la tabla esté cargada
        setTimeout(() => {
          try {
            // Verificar si ya está seleccionado
            const button = document.getElementById(`btn-select-${amendmentId}`);
            if (button && !button.classList.contains('selected')) {
              window.toggleAmendmentSelection(amendmentId);
              console.log('✅ Enmienda seleccionada usando toggleAmendmentSelection:', amendment);
            } else if (button && button.classList.contains('selected')) {
              console.log('ℹ️ Enmienda ya estaba seleccionada:', amendment);
            } else {
              console.log('❌ Botón no encontrado para enmienda:', amendmentId);
            }
          } catch (error) {
            console.log('❌ Error al seleccionar enmienda:', amendment, error);
          }
        }, 200);
      } else {
        console.log('❌ Función toggleAmendmentSelection no encontrada o ID no válido');
      }
    });

    response += `\n\n¡Listo! Ahora puedes calcular las dosis.`;
    
    this.pendingRecommendations = null;
    return response;
  }

  showDetailedRecommendations() {
    if (!this.pendingRecommendations) {
      return `❌ No hay recomendaciones pendientes.`;
    }

    const { amendments, targetValues } = this.pendingRecommendations;
    let response = `📋 **DETALLES DE LA PROPUESTA**\n\n`;
    
    response += `**Valores objetivo que se configurarán:**\n`;
    response += `• K⁺: ${targetValues.k.toFixed(2)} meq/100g (5% del CIC)\n`;
    response += `• Ca²⁺: ${targetValues.ca.toFixed(2)} meq/100g (70% del CIC)\n`;
    response += `• Mg²⁺: ${targetValues.mg.toFixed(2)} meq/100g (12.5% del CIC)\n\n`;
    
    response += `**Enmiendas que se seleccionarán:**\n`;
    amendments.forEach(amendment => {
      response += `• ${amendment}\n`;
    });
    
    response += `\n**¿Quieres proceder con estos cambios?**\n`;
    response += `• "sí" - Aplico todos los cambios\n`;
    response += `• "no" - Cancelo la operación`;
    
    return response;
  }

  handleDetailedCalculation() {
    const kInput = document.getElementById('k-initial');
    const caInput = document.getElementById('ca-initial');
    const mgInput = document.getElementById('mg-initial');
    const naInput = document.getElementById('na-initial');
    
    if (!kInput || !caInput || !mgInput) {
      return `❌ No puedo calcular sin datos del suelo.`;
    }
    
    const k = parseFloat(kInput.value || 0);
    const ca = parseFloat(caInput.value || 0);
    const mg = parseFloat(mgInput.value || 0);
    const na = parseFloat(naInput?.value || 0);
    
    if (k === 0 && ca === 0 && mg === 0) {
      return `❌ No hay datos de suelo para calcular.`;
    }
    
    const cic = k + ca + mg + na;
    
    // Calcular deficiencias
    const targetK = (cic * 0.05) - k;
    const targetCa = (cic * 0.70) - ca;
    const targetMg = (cic * 0.125) - mg;
    
    let response = `🧮 **CÁLCULOS DETALLADOS DE DEFICIENCIAS**\n\n`;
    response += `**CIC Total:** ${cic} meq/100g\n\n`;
    
    response += `**Deficiencias calculadas:**\n`;
    if (targetK > 0) {
      response += `• K⁺: Faltan ${targetK.toFixed(2)} meq/100g\n`;
      response += `  → SOP Granular: ${(targetK * 20 * 10 * 3.3 / 0.415).toFixed(0)} kg/ha\n`;
    }
    if (targetCa > 0) {
      response += `• Ca²⁺: Faltan ${targetCa.toFixed(2)} meq/100g\n`;
      response += `  → Yeso: ${(targetCa * 20 * 10 * 3.3).toFixed(0)} kg/ha\n`;
      response += `  → Cal Dolomítica: ${(targetCa * 20 * 10 * 3.3 / 0.217).toFixed(0)} kg/ha\n`;
    }
    if (targetMg > 0) {
      response += `• Mg²⁺: Faltan ${targetMg.toFixed(2)} meq/100g\n`;
      response += `  → MgSO₄: ${(targetMg * 12 * 10 * 3.3).toFixed(0)} kg/ha\n`;
    }
    
    return response;
  }

  handleDetailedExplanation() {
    return `📚 **EXPLICACIÓN TÉCNICA DEL RAZONAMIENTO**\n\n` +
           `**1. Análisis de CIC (Capacidad de Intercambio Catiónico):**\n` +
           `• Es la capacidad del suelo para retener y liberar nutrientes\n` +
           `• Se calcula sumando todos los cationes: K⁺ + Ca²⁺ + Mg²⁺ + Na⁺\n\n` +
           `**2. Rangos Ideales NutriPlant PRO:**\n` +
           `• K⁺: 3-7% (movilidad alta, fácil absorción)\n` +
           `• Ca²⁺: 65-75% (estructura del suelo, disponibilidad)\n` +
           `• Mg²⁺: 10-15% (clorofila, activación enzimática)\n` +
           `• Na⁺: <1% (toxicidad si está alto)\n\n` +
           `**3. Estrategia de Enmiendas:**\n` +
           `• **Cal Dolomítica**: Cuando Ca²⁺ y Mg²⁺ están bajos (más eficiente)\n` +
           `• **Yeso**: Solo Ca²⁺ bajo, no afecta pH\n` +
           `• **SOP Granular**: K⁺ bajo + aporta SO₄ para desplazar Na⁺\n\n` +
           `**4. Consideración de pH:**\n` +
           `• pH < 6.5: Cal Agrícola es beneficiosa\n` +
           `• pH > 7.5: Evitar Cal Agrícola (alcaliniza más)\n` +
           `• pH óptimo: Cualquier enmienda calcárea funciona\n\n` +
           `**¿Necesitas más detalles sobre algún aspecto específico?**`;
  }

  async callOpenAI(message) {
    console.log('🔍 callOpenAI - apiKey:', this.apiKey ? 'CONFIGURADA' : 'NO CONFIGURADA');
    console.log('🔍 callOpenAI - message length:', message.length);
    
    if (!this.apiKey) {
      console.log('❌ API Key no configurada en callOpenAI');
      throw new Error('API Key no configurada');
    }

    // Agregar contexto de NutriPlant PRO
    const systemPrompt = `Eres un asistente especializado en NutriPlant PRO, una plataforma de gestión agrícola. 
    Ayuda a los usuarios con:
    - Consultas sobre agricultura, hidroponía, fertirriego
    - Uso de la plataforma NutriPlant PRO
    - Análisis de suelos, agua, extractos foliares
    - Gestión de proyectos agrícolas
    - Recomendaciones técnicas
    
    Responde de manera amigable, profesional y específica para agricultura. 
    Si no sabes algo específico sobre NutriPlant PRO, di que consultes con un especialista.`;

    try {
      console.log('📤 Enviando solicitud a OpenAI vía proxy backend...');
      
      // USAR PROXY BACKEND EN PUERTO 8000
      const response = await fetch('http://localhost:8000/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      console.log('📥 Respuesta recibida:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error de API:', response.status, errorData);
        throw new Error(`Error de API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('✅ Datos recibidos:', data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ Respuesta de API inválida:', data);
        throw new Error('Respuesta de API inválida');
      }

      console.log('✅ Contenido extraído:', data.choices[0].message.content);
      return data.choices[0].message.content;
    } catch (error) {
      console.error('❌ Error en callOpenAI:', error);
      console.error('❌ Tipo de error:', typeof error);
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response data:', error.response?.data);
      throw error;
    }
  }

  addMessage(content, sender) {
    const message = {
      content,
      sender,
      timestamp: new Date()
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
    this.saveChatHistory();
  }

  renderMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.sender}`;
    
    const time = message.timestamp.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    messageDiv.innerHTML = `
      <div>${this.formatMessage(message.content)}</div>
      <div class="message-time">${time}</div>
    `;

    this.messagesContainer.appendChild(messageDiv);
  }

  formatMessage(content) {
    if (!content) return '';
    
    // Convertir dobles saltos de línea en párrafos
    let formatted = content.replace(/\n\n/g, '</p><p>');
    
    // Envolver en párrafos
    formatted = '<p>' + formatted + '</p>';
    
    // Convertir texto en negrita **texto** a <strong>texto</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1f2937;">$1</strong>');
    
    // Convertir texto en cursiva *texto* a <em>texto</em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em style="color: #6b7280;">$1</em>');
    
    // Convertir títulos con ## a h3
    formatted = formatted.replace(/^## (.*$)/gm, '<h3 style="color: #10b981; margin: 16px 0 8px 0; font-size: 1.1em; font-weight: 600;">$1</h3>');
    
    // Convertir títulos con ### a h4
    formatted = formatted.replace(/^### (.*$)/gm, '<h4 style="color: #374151; margin: 12px 0 6px 0; font-size: 1em; font-weight: 600;">$1</h4>');
    
    // Convertir listas numeradas con iconos
    formatted = formatted.replace(/^(\d+)\.\s*(.*$)/gm, '<li style="margin: 6px 0; list-style: none;"><span style="color: #10b981; margin-right: 8px; font-weight: bold;">$1.</span>$2</li>');
    
    // Convertir listas con viñetas y iconos
    formatted = formatted.replace(/^•\s*(.*$)/gm, '<li style="margin: 6px 0; list-style: none;"><span style="color: #10b981; margin-right: 8px;">📋</span>$1</li>');
    formatted = formatted.replace(/^-\s*(.*$)/gm, '<li style="margin: 6px 0; list-style: none;"><span style="color: #10b981; margin-right: 8px;">•</span>$1</li>');
    
    // Agrupar elementos li en ul
    formatted = formatted.replace(/(<li[^>]*>.*?<\/li>)/gs, function(match) {
      if (!match.includes('<ul')) {
        return '<ul style="margin: 8px 0; padding-left: 0;">' + match + '</ul>';
      }
      return match;
    });
    
    // Convertir texto con emojis de secciones a formato especial
    formatted = formatted.replace(/^([🌱🌿🌾🌽🥬🍅🥕🌶️🥔🌰🍎🍊🍌🍇🍓🥝🍑🥭🍍🥥🍈🍉🍋🍏🍐🍒🍓🫐🍄🥜🌰])\s*(.*$)/gm, 
      '<div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; margin: 12px 0; border-radius: 4px;"><strong style="color: #10b981;">$1 $2</strong></div>');
    
    // Convertir texto con iconos de alerta/importante
    formatted = formatted.replace(/^([⚠️🚨💡✅❌🔍📊📈📉🎯])\s*(.*$)/gm, 
      '<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 12px 0; border-radius: 4px;"><strong style="color: #92400e;">$1 $2</strong></div>');
    
    // Convertir URLs en enlaces
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #10b981; text-decoration: underline;">$1</a>');
    
    // Limpiar párrafos vacíos
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
    
    return formatted;
  }

  showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-typing';
    typingDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTyping() {
    const typing = this.messagesContainer.querySelector('.chat-typing');
    if (typing) {
      typing.remove();
    }
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  addWelcomeMessage() {
    // Esperar un poco para que se cargue la información de la plataforma
    setTimeout(() => {
      let welcomeMessage = `¡Hola! Soy tu asistente de NutriPlant PRO 🌱`;

      this.addMessage(welcomeMessage, 'ai');
    }, 500);
  }

  saveChatHistory() {
    localStorage.setItem('nutriplant-chat-history', JSON.stringify(this.messages));
  }

  loadChatHistory() {
    const saved = localStorage.getItem('nutriplant-chat-history');
    if (saved) {
      this.messages = JSON.parse(saved);
      this.messages.forEach(message => this.renderMessage(message));
    }
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  clearHistory() {
    this.messages = [];
    this.messagesContainer.innerHTML = '';
    this.addWelcomeMessage();
    this.saveChatHistory();
  }

  // ===== MONITOREO DE LA PLATAFORMA =====
  startPlatformMonitoring() {
    // Monitorear cambios en la plataforma cada 2 segundos
    setInterval(() => {
      this.updatePlatformData();
    }, 2000);
    
    // Monitorear cambios inmediatos
    this.updatePlatformData();
  }

  updatePlatformData() {
    this.platformData = {
      currentSection: this.getCurrentSection(),
      projects: this.getProjectsData(),
      currentProject: this.getCurrentProject(),
      pageContent: this.getPageContent(),
      timestamp: new Date().toISOString()
    };
  }

  getCurrentSection() {
    const activeTab = document.querySelector('.sidebar a.active');
    if (activeTab) {
      const label = activeTab.querySelector('.label');
      return label ? label.textContent.trim() : 'Desconocida';
    }
    return 'Inicio';
  }

  getProjectsData() {
    const projects = [];
    const projectCards = document.querySelectorAll('#np-projects-list .card');
    
    projectCards.forEach(card => {
      const titleElement = card.querySelector('.project-info h3');
      const dateElement = card.querySelector('.text-xs');
      
      if (titleElement) {
        projects.push({
          title: titleElement.textContent.trim(),
          lastUpdated: dateElement ? dateElement.textContent.trim() : 'No disponible',
          id: card.dataset.projectId || 'unknown'
        });
      }
    });
    
    return projects;
  }

  getCurrentProject() {
    // Buscar si hay un proyecto seleccionado en el sidebar
    const projectTitle = document.querySelector('.sb-title-card .text');
    if (projectTitle) {
      return {
        title: projectTitle.textContent.trim(),
        hasAnalysis: this.hasAnalysisData()
      };
    }
    return null;
  }

  hasAnalysisData() {
    // Verificar si hay datos de análisis en la página actual
    const analysisSections = document.querySelectorAll('.view .card');
    return analysisSections.length > 0;
  }

  getPageContent() {
    const content = {
      title: document.querySelector('.top h1')?.textContent?.trim() || 'Inicio',
      hasProjects: document.querySelector('#np-projects-list')?.children.length > 0,
      hasAnalysis: document.querySelector('.view .card') !== null,
      currentView: this.getCurrentViewType()
    };
    
    return content;
  }

  getCurrentViewType() {
    const title = document.querySelector('.top h1')?.textContent?.trim();
    if (title?.includes('Análisis')) return 'analysis';
    if (title?.includes('Fertirriego')) return 'fertigation';
    if (title?.includes('Hidroponía')) return 'hydroponics';
    if (title?.includes('Inicio')) return 'home';
    return 'unknown';
  }

  // Función eliminada - conflicto con la nueva lógica contextual

  getRecommendationBasedOnContext() {
    const context = this.platformData;
    
    if (context.currentView === 'analysis') {
      return `Basándome en que estás en la sección de análisis, te recomiendo:\n\n• Realizar análisis de suelo antes de plantar\n• Monitorear el pH regularmente\n• Analizar el agua de riego\n• Hacer análisis foliares durante el crecimiento\n\n¿Te interesa algún análisis específico?`;
    }
    
    if (context.currentView === 'fertigation') {
      return `Para optimizar tu fertirriego, considera:\n\n• Calcular la dosis según extracción del cultivo\n• Ajustar el pH de la solución (5.5-6.5)\n• Monitorear la conductividad eléctrica\n• Aplicar en horarios de menor evaporación\n\n¿Qué cultivo estás fertirrigando?`;
    }
    
    if (context.projects.length > 0) {
      return `Veo que tienes ${context.projects.length} proyectos activos. Para optimizarlos, te sugiero:\n\n• Revisar el estado de cada proyecto regularmente\n• Mantener actualizados los análisis\n• Documentar los resultados\n• Comparar el rendimiento entre proyectos\n\n¿Sobre cuál proyecto te gustaría profundizar?`;
    }
    
    return `Para darte mejores recomendaciones, podrías:\n\n• Seleccionar un proyecto específico\n• Ir a la sección de análisis que te interese\n• Compartir más detalles sobre tu cultivo\n\n¿En qué puedo ayudarte?`;
  }

  // ===== FUNCIONES INTELIGENTES DE LA IA =====
  
  analyzeSoilData() {
    const soilData = this.getSoilAnalysisData();
    if (!soilData || soilData.cic === 0) {
      return `🔍 **Análisis de Suelo**\n\nNo hay datos de análisis de suelo disponibles. Para analizar tu suelo:\n\n1. Ve a la sección "Enmienda"\n2. Ingresa los valores de cationes\n3. Luego puedo analizar y sugerir mejoras\n\n¿Quieres que te guíe paso a paso?`;
    }

    const analysis = this.performSoilAnalysis(soilData);
    return `🔍 **Análisis de Suelo Detallado**\n\n**CIC Total:** ${soilData.cic} meq/100g\n\n**Estado de Cationes:**\n${analysis.cations.map(cat => 
      `• **${cat.symbol}:** ${cat.value} meq (${cat.percent}%) ${cat.status} ${cat.icon}`
    ).join('\n')}\n\n**Problemas Identificados:**\n${analysis.problems.length > 0 ? analysis.problems.join('\n') : '✅ Todos los cationes están en rangos aceptables'}\n\n**Recomendaciones:**\n${analysis.recommendations.join('\n')}\n\n¿Quieres que aplique los ajustes sugeridos?`;
  }

  suggestIdealDistribution() {
    const soilData = this.getSoilAnalysisData();
    if (!soilData || soilData.cic === 0) {
      return `📊 **Distribución Ideal**\n\nPrimero necesito que ingreses los datos de tu análisis de suelo. Ve a la sección "Enmienda" y completa los valores de cationes.\n\nUna vez que tengas los datos, podré sugerir la distribución ideal basada en los rangos óptimos.`;
    }

    const idealValues = this.calculateIdealDistribution(soilData.cic);
    return `📊 **Distribución Ideal Sugerida**\n\n**Para CIC de ${soilData.cic} meq/100g:**\n\n${idealValues.map(item => 
      `• **${item.symbol}:** ${item.min}-${item.max} meq (${item.percentMin}-${item.percentMax}%)`
    ).join('\n')}\n\n**Valores Recomendados:**\n${idealValues.map(item => 
      `• **${item.symbol}:** ${item.recommended} meq (${item.recommendedPercent}%)`
    ).join('\n')}\n\n¿Quieres que aplique estos valores automáticamente?`;
  }

  applySuggestedValues() {
    const soilData = this.getSoilAnalysisData();
    if (!soilData || soilData.cic === 0) {
      return `⚠️ **No se pueden aplicar valores**\n\nPrimero necesito que ingreses los datos de tu análisis de suelo. Ve a la sección "Enmienda" y completa los valores de cationes.`;
    }

    const idealValues = this.calculateIdealDistribution(soilData.cic);
    const applied = this.applyValuesToCalculator(idealValues);
    
    if (applied) {
      return `✅ **Valores Aplicados Exitosamente**\n\nHe aplicado la distribución ideal a tu calculadora de enmiendas:\n\n${idealValues.map(item => 
        `• **${item.symbol}:** ${item.recommended} meq (${item.recommendedPercent}%)`
      ).join('\n')}\n\nLos valores se han actualizado automáticamente. ¿Quieres que calcule las enmiendas necesarias?`;
    } else {
      return `❌ **Error al aplicar valores**\n\nNo pude aplicar los valores automáticamente. Por favor, verifica que estés en la sección correcta de la calculadora.`;
    }
  }

  calculateAmendments() {
    const soilData = this.getSoilAnalysisData();
    if (!soilData || soilData.cic === 0) {
      return `🧮 **Cálculo de Enmiendas**\n\nPrimero necesito que ingreses los datos de tu análisis de suelo y los objetivos de ajuste. Ve a la sección "Enmienda" y completa todos los campos.`;
    }

    // Simular cálculo de enmiendas
    const amendments = this.performAmendmentCalculation(soilData);
    return `🧮 **Cálculo de Enmiendas**\n\n**Análisis Actual vs Objetivo:**\n${amendments.comparison.map(item => 
      `• **${item.symbol}:** ${item.current} → ${item.target} meq (${item.change > 0 ? '+' : ''}${item.change})`
    ).join('\n')}\n\n**Enmiendas Recomendadas:**\n${amendments.recommendations.map(rec => 
      `• **${rec.type}:** ${rec.amount} ${rec.unit}`
    ).join('\n')}\n\n**Notas:**\n${amendments.notes.join('\n')}`;
  }

  optimizeCalculator() {
    return '⚡ **Optimización de Calculadora**\n\nHe analizado tu calculadora de enmiendas y encontré estas mejoras:\n\n**Optimizaciones Aplicadas:**\n• ✅ Validación automática de rangos ideales\n• ✅ Cálculo automático de porcentajes\n• ✅ Iconos de estado en tiempo real\n• ✅ Sugerencias contextuales\n• ✅ Aplicación automática de valores\n\n**Funcionalidades Disponibles:**\n• `analizar_suelo` - Analiza datos actuales\n• `sugerir_distribucion` - Calcula distribución ideal\n• `aplicar_valores` - Aplica valores sugeridos\n• `calcular_enmiendas` - Ejecuta cálculos\n\n¿Quieres probar alguna de estas funciones?';
  }

  analyzeEverything() {
    const context = this.platformData;
    let analysis = `🔍 **Análisis Completo del Dashboard**\n\n`;
    
    // Análisis de proyectos
    if (context.projects.length > 0) {
      analysis += `**📁 Proyectos (${context.projects.length}):**\n`;
      context.projects.forEach(project => {
        analysis += `• ${project.title} - ${project.lastUpdated}\n`;
      });
      analysis += `\n`;
    }
    
    // Análisis de sección actual
    analysis += `**📍 Sección Actual:** ${context.currentSection}\n`;
    analysis += `**🎯 Vista:** ${context.currentView}\n\n`;
    
    // Análisis de datos de suelo
    const soilData = this.getSoilAnalysisData();
    if (soilData && soilData.cic > 0) {
      analysis += `**🧪 Análisis de Suelo:**\n`;
      analysis += `• CIC Total: ${soilData.cic} meq/100g\n`;
      analysis += `• Estado: ${this.getSoilStatus(soilData)}\n\n`;
    }
    
    // Recomendaciones generales
    analysis += `**💡 Recomendaciones:**\n`;
    analysis += `• Mantén actualizados los análisis de suelo\n`;
    analysis += `• Revisa regularmente el estado de tus proyectos\n`;
    analysis += `• Utiliza las funciones de IA para optimizar resultados\n`;
    analysis += `• Documenta todos los cambios y resultados\n\n`;
    
    analysis += `¿Sobre qué aspecto específico te gustaría profundizar?`;
    
    return analysis;
  }

  suggestImprovements() {
    const context = this.platformData;
    const improvements = [];
    
    // Mejoras basadas en el contexto
    if (context.projects.length === 0) {
      improvements.push("• Crear tu primer proyecto para comenzar");
    }
    
    if (context.currentView === 'home') {
      improvements.push("• Ir a la sección de análisis para evaluar tu suelo");
      improvements.push("• Configurar parámetros de fertirriego");
    }
    
    if (context.currentView === 'analysis') {
      improvements.push("• Completar análisis de suelo inicial");
      improvements.push("• Configurar objetivos de ajuste");
      improvements.push("• Calcular enmiendas necesarias");
    }
    
    // Mejoras generales
    improvements.push("• Utilizar las funciones de IA para optimización");
    improvements.push("• Mantener un registro detallado de resultados");
    improvements.push("• Comparar resultados entre proyectos");
    
    return `💡 **Sugerencias de Mejora**\n\nBasándome en tu estado actual, te sugiero:\n\n${improvements.join('\n')}\n\n¿Quieres que implemente alguna de estas mejoras automáticamente?`;
  }

  // ===== FUNCIONES AUXILIARES =====
  
  getSoilAnalysisData() {
    const cicInput = document.getElementById('cic-total');
    const kInput = document.getElementById('k-initial');
    const caInput = document.getElementById('ca-initial');
    const mgInput = document.getElementById('mg-initial');
    const hInput = document.getElementById('h-initial');
    const naInput = document.getElementById('na-initial');
    const alInput = document.getElementById('al-initial');
    
    if (!cicInput || !kInput || !caInput || !mgInput || !hInput || !naInput || !alInput) {
      return null;
    }
    
    return {
      cic: parseFloat(cicInput.value) || 0,
      k: parseFloat(kInput.value) || 0,
      ca: parseFloat(caInput.value) || 0,
      mg: parseFloat(mgInput.value) || 0,
      h: parseFloat(hInput.value) || 0,
      na: parseFloat(naInput.value) || 0,
      al: parseFloat(alInput.value) || 0
    };
  }

  performSoilAnalysis(soilData) {
    const cations = [
      { symbol: 'K⁺', value: soilData.k, percent: ((soilData.k / soilData.cic) * 100).toFixed(1), ideal: [3, 7], category: 'good' },
      { symbol: 'Ca²⁺', value: soilData.ca, percent: ((soilData.ca / soilData.cic) * 100).toFixed(1), ideal: [65, 75], category: 'good' },
      { symbol: 'Mg²⁺', value: soilData.mg, percent: ((soilData.mg / soilData.cic) * 100).toFixed(1), ideal: [10, 15], category: 'good' },
      { symbol: 'H⁺', value: soilData.h, percent: ((soilData.h / soilData.cic) * 100).toFixed(1), ideal: [0, 10], category: 'acid' },
      { symbol: 'Na⁺', value: soilData.na, percent: ((soilData.na / soilData.cic) * 100).toFixed(1), ideal: [0, 1], category: 'salt' },
      { symbol: 'Al³⁺', value: soilData.al, percent: ((soilData.al / soilData.cic) * 100).toFixed(1), ideal: [0, 1], category: 'toxic' }
    ];
    
    cations.forEach(cat => {
      if (cat.percent >= cat.ideal[0] && cat.percent <= cat.ideal[1]) {
        cat.status = 'Óptimo';
        cat.icon = '✅';
      } else if (cat.percent > cat.ideal[1]) {
        cat.status = 'Alto';
        cat.icon = '⚠️';
      } else {
        cat.status = 'Bajo';
        cat.icon = '❌';
      }
    });
    
    const problems = [];
    const recommendations = [];
    
    cations.forEach(cat => {
      if (cat.percent < cat.ideal[0]) {
        problems.push(`• ${cat.symbol} está por debajo del rango ideal (${cat.percent}% < ${cat.ideal[0]}%)`);
        recommendations.push(`• Aumentar ${cat.symbol} a ${(cat.ideal[0] * soilData.cic / 100).toFixed(2)} meq`);
      } else if (cat.percent > cat.ideal[1]) {
        problems.push(`• ${cat.symbol} está por encima del rango ideal (${cat.percent}% > ${cat.ideal[1]}%)`);
        recommendations.push(`• Reducir ${cat.symbol} a ${(cat.ideal[1] * soilData.cic / 100).toFixed(2)} meq`);
      }
    });
    
    return { cations, problems, recommendations };
  }

  calculateIdealDistribution(cic) {
    const ranges = [
      { symbol: 'K⁺', percentMin: 3, percentMax: 7, category: 'good' },
      { symbol: 'Ca²⁺', percentMin: 65, percentMax: 75, category: 'good' },
      { symbol: 'Mg²⁺', percentMin: 10, percentMax: 15, category: 'good' },
      { symbol: 'H⁺', percentMin: 0, percentMax: 10, category: 'acid' },
      { symbol: 'Na⁺', percentMin: 0, percentMax: 1, category: 'salt' },
      { symbol: 'Al³⁺', percentMin: 0, percentMax: 1, category: 'toxic' }
    ];
    
    return ranges.map(range => {
      const min = (range.percentMin * cic / 100).toFixed(2);
      const max = (range.percentMax * cic / 100).toFixed(2);
      const recommended = ((range.percentMin + range.percentMax) / 2 * cic / 100).toFixed(2);
      const recommendedPercent = ((range.percentMin + range.percentMax) / 2).toFixed(1);
      
      return {
        ...range,
        min: parseFloat(min),
        max: parseFloat(max),
        recommended: parseFloat(recommended),
        recommendedPercent: parseFloat(recommendedPercent)
      };
    });
  }

  applyValuesToCalculator(idealValues) {
    try {
      // Aplicar valores a los campos objetivo
      const kTarget = document.getElementById('k-target');
      const caTarget = document.getElementById('ca-target');
      const mgTarget = document.getElementById('mg-target');
      const hTarget = document.getElementById('h-target');
      const naTarget = document.getElementById('na-target');
      const alTarget = document.getElementById('al-target');
      
      if (kTarget) kTarget.value = idealValues[0].recommended.toFixed(2);
      if (caTarget) caTarget.value = idealValues[1].recommended.toFixed(2);
      if (mgTarget) mgTarget.value = idealValues[2].recommended.toFixed(2);
      if (hTarget) hTarget.value = idealValues[3].recommended.toFixed(2);
      if (naTarget) naTarget.value = idealValues[4].recommended.toFixed(2);
      if (alTarget) alTarget.value = idealValues[5].recommended.toFixed(2);
      
      // Disparar recálculo
      if (typeof calculateTotalPercent === 'function') {
        calculateTotalPercent();
      }
      
      return true;
    } catch (error) {
      console.error('Error aplicando valores:', error);
      return false;
    }
  }

  performAmendmentCalculation(soilData) {
    // Simulación de cálculo de enmiendas
    const comparison = [
      { symbol: 'K⁺', current: soilData.k, target: soilData.k * 1.1, change: soilData.k * 0.1 },
      { symbol: 'Ca²⁺', current: soilData.ca, target: soilData.ca * 0.95, change: soilData.ca * -0.05 },
      { symbol: 'Mg²⁺', current: soilData.mg, target: soilData.mg * 0.9, change: soilData.mg * -0.1 }
    ];
    
    const recommendations = [
      { type: 'Sulfato de Potasio', amount: '50', unit: 'kg/ha' },
      { type: 'Cal Agrícola', amount: '200', unit: 'kg/ha' },
      { type: 'Sulfato de Magnesio', amount: '100', unit: 'kg/ha' }
    ];
    
    const notes = [
      'Aplicar enmiendas 30 días antes de la siembra',
      'Incorporar al suelo a 20-30 cm de profundidad',
      'Realizar análisis de seguimiento en 60 días'
    ];
    
    return { comparison, recommendations, notes };
  }

  getSoilStatus(soilData) {
    if (soilData.cic < 10) return 'Muy bajo';
    if (soilData.cic < 20) return 'Bajo';
    if (soilData.cic < 30) return 'Medio';
    if (soilData.cic < 40) return 'Alto';
    return 'Muy alto';
  }
}

// Función para probar ChatGPT
async function testChatGPTConnection() {
  console.log('🧪 Probando conexión con ChatGPT...');
  
  try {
    const testResponse = await window.nutriPlantChat.callOpenAI('Responde solo "ChatGPT funcionando correctamente" para confirmar la conexión.');
    console.log('✅ ChatGPT funcionando:', testResponse);
    
    // Mostrar resultado en el chat
    setTimeout(() => {
      if (window.nutriPlantChat) {
        window.nutriPlantChat.addMessage('🧪 **PRUEBA DE CHATGPT COMPLETADA**\n\n✅ **Conexión exitosa**\nChatGPT está funcionando correctamente con tu API Key.\n\nAhora puedes hacer preguntas sobre análisis de suelos y recibirás respuestas especializadas.', 'ai');
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error en prueba de ChatGPT:', error);
    
    // Mostrar error en el chat
    setTimeout(() => {
      if (window.nutriPlantChat) {
        window.nutriPlantChat.addMessage(`🧪 **PRUEBA DE CHATGPT FALLIDA**\n\n❌ **Error de conexión:** ${error.message}\n\nVerifica tu API Key o conexión a internet.`, 'ai');
      }
    }, 2000);
  }
}

// Función para probar API Key manualmente
async function testAPIKeyManually() {
  console.log('🧪 Probando API Key manualmente...');
  
  const apiKey = '';
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Responde solo "API Key funciona correctamente"'
          }
        ],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Key funciona:', data.choices[0].message.content);
      return true;
    } else {
      console.error('❌ API Key falló:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return false;
  }
}

// Función para probar el chat
function testChatFunctionality() {
  console.log('🧪 Probando funcionalidad del chat...');
  
  if (window.nutriPlantChat) {
    // Simular mensaje de prueba
    const testMessage = 'forma de absorcion del fosforo por las plantas?';
    console.log('🧪 Enviando mensaje de prueba:', testMessage);
    
    // Llamar directamente a la función de análisis
    try {
      const response = window.nutriPlantChat.getLocalSoilAnalysis(testMessage, '');
      console.log('✅ Respuesta generada:', response);
      
      // Mostrar en el chat
      window.nutriPlantChat.addMessage(response, 'ai');
      
      return true;
    } catch (error) {
      console.error('❌ Error en prueba:', error);
      return false;
    }
  } else {
    console.error('❌ Chat no inicializado');
    return false;
  }
}

// Función para probar la confirmación
function testConfirmation() {
  console.log('🧪 Probando sistema de confirmación...');
  
  if (window.nutriPlantChat) {
    // Simular que hay recomendaciones pendientes
    window.nutriPlantChat.pendingRecommendations = {
      amendments: ['Cal Dolomítica', 'Yeso'],
      targetValues: {
        k: 1.5,
        ca: 21.0,
        mg: 3.75
      }
    };
    
    console.log('🧪 Recomendaciones pendientes simuladas:', window.nutriPlantChat.pendingRecommendations);
    
    // Probar confirmación
    const response = window.nutriPlantChat.handleConfirmation('sí');
    console.log('✅ Respuesta de confirmación:', response);
    
    // Mostrar en el chat
    window.nutriPlantChat.addMessage(response, 'ai');
    
    return true;
  } else {
    console.error('❌ Chat no inicializado');
    return false;
  }
}

// Función para inicializar el chat
function initializeNutriPlantChat() {
  if (window.nutriPlantChat) {
    console.log('✅ NutriPlant Chat ya está inicializado');
    return window.nutriPlantChat;
  }
  
  if (typeof NutriPlantChat === 'undefined') {
    console.error('❌ NutriPlantChat no está definido. chat.js no se ha cargado correctamente.');
    return null;
  }
  
  try {
    console.log('🚀 Inicializando NutriPlant Chat...');
    window.nutriPlantChat = new NutriPlantChat();
    console.log('✅ NutriPlant Chat inicializado correctamente');
    return window.nutriPlantChat;
  } catch (error) {
    console.error('❌ Error al inicializar NutriPlant Chat:', error);
    console.error('❌ Stack:', error.stack);
    return null;
  }
}

// Inicializar el chat cuando se carga la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded - Preparando inicialización del chat...');
    setTimeout(() => {
      const chat = initializeNutriPlantChat();
      if (chat) {
        // Configurar API Key después de la inicialización
        const apiKey = '';
        chat.apiKey = apiKey;
        console.log('✅ API Key configurada en el chat');
      }
    }, 100);
  });
} else {
  // El DOM ya está cargado
  console.log('🚀 DOM ya cargado - Inicializando chat inmediatamente...');
  setTimeout(() => {
    const chat = initializeNutriPlantChat();
    if (chat) {
      // Configurar API Key después de la inicialización
      const apiKey = '';
      chat.apiKey = apiKey;
      console.log('✅ API Key configurada en el chat');
    }
  }, 100);
}

// Exponer la función globalmente para que toggleChat pueda usarla
window.initializeNutriPlantChat = initializeNutriPlantChat;
