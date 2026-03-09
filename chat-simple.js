/* ===== CHAT FLOTANTE NUTRIPLANT PRO - VERSIÓN SIMPLIFICADA ===== */

/**
 * Manual técnico NutriPlant PRO: lógica de cálculo, interpretación y nivel experto en nutrición vegetal.
 * El asistente usa este texto para responder a la altura de agrónomos y tomar mejores decisiones.
 */
function getNutriPlantProManual() {
  return `
1) ANÁLISIS DE SUELO Y CIC
- Cationes en meq/100g: K⁺, Ca²⁺, Mg²⁺, Na⁺, H⁺, Al³⁺. CIC = suma de cationes intercambiables.
- Porcentajes sobre CIC (base de interpretación NutriPlant PRO): K 3–7%, Ca 65–75%, Mg 10–15%, Na <1%. Fuera de rango implica desbalance (antagonismos, bloqueos, salinidad).
- Conversión meq→ppm (aprox.): K meq×39.1→ppm K; Ca meq×20.04→ppm Ca; Mg meq×12.15→ppm Mg; Na meq×23→ppm Na.
- pH: 6.0–7.0 óptimo para disponibilidad; <5.5 Al y Mn tóxicos; >7.5 P y micronutrientes limitados. Densidad aparente y profundidad para calcular kg/ha de suelo.

2) ENMIENDAS
- Cal dolomítica: aporta Ca y Mg; sube pH; uso en suelos ácidos con Mg bajo.
- Yeso (CaSO₄): aporta Ca y S; no sube pH; desplaza Na⁺ (mejorar RAS); no aporta Mg.
- Sulfato de potasio (SOP): K y S; para corregir K bajo sin subir pH.
- Sulfato de magnesio: Mg y S. Óxido de Mg: solo Mg, más concentrado.
- % de alcance de suelo: fracción del volumen explorado por raíces; la dosis de enmienda se reparte en ese volumen. A mayor alcance, misma dosis repartida en más suelo.
- Orden lógico: primero corregir pH y Na (yeso/cal según necesidad), luego balance Ca:Mg:K.

3) REQUERIMIENTOS Y PROGRAMAS
- Extracción por cultivo: kg nutriente/tonelada de producción (tablas por especie). Extracción total = extracción/ton × rendimiento objetivo (ton/ha).
- Ajuste por niveles en suelo: si el suelo ya aporta parte del nutriente, el requerimiento neto a fertilizar puede reducirse (o aumentarse si hay fijación/lixiviación). NutriPlant aplica ajustes por nivel en suelo en requerimientos.
- Granular: aplicaciones con materiales (fertilizantes) y % en mezcla; dosis kg/ha por aplicación; aporte = dosis × composición del material. Unidades en óxidos (N, P₂O₅, K₂O, CaO, MgO, S, SO₄) o elemental según modo.
- Fertirriego: programa por semanas; inyectores con concentración o kg/ha por semana; aporte del agua (análisis de agua) se resta del requerimiento. Conversiones óxido↔elemental: P₂O₅→P ×0.436; K₂O→K ×0.83; CaO→Ca ×0.715; MgO→Mg ×0.603.
- Hidroponía: concentración en ppm (mg/L) por elemento; volumen de tanque y relación de inyección (L stock/m³ agua) para pasar de ppm a kg de fertilizante.

4) ANÁLISIS FOLIAR Y DOP
- DOP (Diagnosis and Recommendation Integrated System): DOP = ((Valor − Óptimo) / Óptimo) × 100. Interpretación: |DOP| ≤10% óptimo; 10–25% atención; 25–50% deficiencia/exceso marcado; >50% muy bajo o muy alto.
- Macros en % materia seca (N, P, K, Ca, Mg, S); micronutrientes en mg/kg (Fe, Mn, Zn, Cu, B, Mo). Óptimos dependen de especie y etapa; en NutriPlant son editables por análisis.
- Cruce con suelo y programa: foliar bajo en K con suelo bajo en K sugiere reforzar K en suelo y/o fertirriego; foliar alto en N con programa alto en N sugiere bajar dosis de N.

5) EXTRACTO DE PASTA Y SOLUCIÓN NUTRITIVA
- Extracto de pasta saturada: CE (dS/m), RAS, pH; cationes y aniones en meq/L o ppm (NO₃, K, Ca, Mg, Na, SO₄, Cl, HCO₃, etc.). Interpretación de salinidad (CE), sodio (RAS) y balance iónico.
- Solución nutritiva: macronutrientes en meq/L o ppm; rangos de referencia (ej. N 140–200, K 180–300 ppm) para comparar. Diagrama ternario: proporciones aniones (NO₃, H₂PO₄, SO₄) y cationes (K, Ca, Mg, NH₄) para evitar antagonismos y precipitados.

6) VPD (DÉFICIT DE PRESIÓN DE VAPOR)
- VPD = presión de saturación a T_hoja − presión real de vapor. Afecta transpiración, absorción de Ca y estrés. Rangos típicos: 0.4–1.2 kPa óptimo según especie; <0.3 riesgo de edema; >1.5 estrés hídrico y cierre estomático. Se usa para programar riego y clima en invernadero.

7) CALCULADORAS NUTRIPLANT (ÓXIDO↔ELEMENTAL Y ppm↔mmol↔meq) — Alineado con la app
- Calculadora Conversión Óxido ↔ Elemental (misma estructura y factores que en la app): CaO→Ca ×0.715; Ca→CaO ×1.399. K₂O→K ×0.830; K→K₂O ×1.204. P₂O₅→P ×0.436; P→P₂O₅ ×2.291. MgO→Mg ×0.603; Mg→MgO ×1.658. S→SO₄ ×3.000; SO₄→S ×0.333. S→SO₃ ×2.497; SO₃→S ×0.400. Zn→ZnO ×1.245; ZnO→Zn ×0.803. SiO₂→Si ×0.468; Si→SiO₂ ×2.139. Usar exactamente estos factores al explicar conversiones de fertilizantes, enmiendas o análisis.
- Calculadora Unidades de Nutrientes (ppm ↔ mmol/L ↔ meq/L): ppm = mg/L del elemento o ion. Fórmulas: mmol/L = ppm ÷ PM (peso molecular o atómico); meq/L = mmol/L × Valencia; por tanto meq/L = (ppm ÷ PM) × Valencia. Pesos y valencias de la app: N (NO₃⁻/NH₄⁺) PM 14.01 val 1; P (H₂PO₄⁻) 30.97 val 1; K⁺ 39.10 val 1; Ca²⁺ 40.08 val 2; Mg²⁺ 24.31 val 2; S (SO₄²⁻) 32.07 val 2; Fe²⁺ 55.85 val 2; Mn²⁺ 54.94 val 2; Zn²⁺ 65.38 val 2; B (H₃BO₃) 10.81 val 1; Cu²⁺ 63.55 val 2; Mo 95.95 val 2; HCO₃⁻ 61.02 val 1; CO₃²⁻ 60.01 val 2. Al explicar o verificar conversiones en solución nutritiva, agua, fertirriego o hidroponía usar estos valores para coincidir con la calculadora de la plataforma.

8) DECISIONES AGRONÓMICAS (NIVEL EXPERTO)
- Priorizar diagnóstico: suelo → foliar → programa. Un solo análisis sin contexto puede llevar a sobrefertilizar o subfertilizar.
- Relaciones: Ca:Mg 3:1 a 6:1 en suelo; K/(Ca+Mg) en solución; NH₄/(NO₃+NH₄) <15–20% en fertirriego para evitar antagonismo con Ca.
- Momento y forma: nitrógeno en etapas de crecimiento activo; P al establecimiento; K en floración/cuaje; Ca vía suelo o foliar según disponibilidad; micronutrientes por foliar si suelo alcalino o con antagonismos.
- Siempre que des recomendaciones, apóyate en los datos concretos del proyecto (análisis, programa, cultivo) que tienes en el contexto.

9) SUSCRIPCIÓN Y CANCELACIÓN (NUTRIPLANT PRO)
- La suscripción a NutriPlant PRO se gestiona con PayPal. Para cancelar, el usuario debe entrar a su cuenta de PayPal, ir a la sección Pagos automáticos (o Automatic Payments) y cancelar la suscripción a NutriPlant desde ahí. No se cancela desde la app ni desde el panel de NutriPlant; es siempre desde PayPal. Si el usuario pide que le cancelemos por él o necesita ayuda para cancelar, indicar que puede contactar al equipo (soporte/WhatsApp según lo que tenga la plataforma) para asistencia.
`;
}

class NutriPlantChat {
  constructor() {
    console.log('🚀 Constructor NutriPlantChat iniciado');
    this.isOpen = false;
    this.isMinimized = false;
    this.messages = [];
    this.apiUrl = (typeof getNutriPlantApiBase !== 'undefined' ? getNutriPlantApiBase() : (window.getNutriPlantApiBase ? window.getNutriPlantApiBase() : 'http://localhost:8000')) + '/api/openai-assistant';
    this.model = 'gpt-4o-mini';
    this.contextSnapshot = null;
    this.lastSectionHint = '';
    this.responseStyle = localStorage.getItem('nutriplant-chat-response-style') || 'breve';
    
    console.log('🔧 Inicializando chat...');
    this.init();
  }

  init() {
    console.log('🔧 init() - Buscando elementos del chat...');
    this.setupElements();
    this.bindEvents();
    this.loadChatHistory();
    this.bindContextEvents();
    this.refreshContextSnapshot('init');
    this.updateChatQuotaDisplay();
    // Sin mensaje de bienvenida: el chat permanece en silencio hasta que el usuario escriba (como en Cursor).
  }

  setupElements() {
    // Usar elementos existentes en el HTML
    this.bubble = document.getElementById('chatBubble');
    this.panel = document.getElementById('chatPanel');
    this.messagesContainer = document.getElementById('chatMessages');
    this.input = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('chatSendBtn');
    this.chatImageInput = document.getElementById('chatImageInput');
    this.chatImagePreviewWrap = document.getElementById('chatImagePreviewWrap');
    this.chatImagePreview = document.getElementById('chatImagePreview');
    this.chatImageRemove = document.getElementById('chatImageRemove');
    this.chatAttachBtn = document.getElementById('chatAttachBtn');
    this.chatInputArea = document.getElementById('chatInputArea');
    this.pendingImage = null; // { base64, contentType } — 1 imagen por mensaje, máx 5 MB; no se guarda
    if (!this.bubble || !this.panel) {
      console.error('❌ Elementos del chat no encontrados en el HTML');
      return;
    }
    if (this.input) {
      this.input.placeholder = 'Preguntar a NutriPlant PRO';
    }
    console.log('✅ Elementos del chat encontrados');
  }

  bindEvents() {
    if (!this.bubble || !this.panel) {
      console.error('❌ No se pueden configurar eventos - elementos no encontrados');
      return;
    }
    
    // Botón del chat
    this.bubble.removeAttribute('onclick');
    this.bubble.addEventListener('click', () => {
      console.log('🔘 Click en botón de chat');
      this.toggleChat();
    });

    // Solo botón minimizar (al minimizar se cierra la pestaña; también se cierra con el botón IA/burbuja)
    const minimizeBtn = this.panel.querySelector('.minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.removeAttribute('onclick');
      minimizeBtn.addEventListener('click', () => this.minimizeChat());
    }

    // Input del chat
    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      this.input.addEventListener('input', () => {
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
      });
    }

    // Botón enviar
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Imagen: adjuntar (1 por mensaje, máx 5 MB), arrastrar y soltar
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (this.chatAttachBtn && this.chatImageInput) {
      this.chatAttachBtn.addEventListener('click', () => this.chatImageInput.click());
    }
    if (this.chatImageInput) {
      this.chatImageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        this._handleImageFile(files[0], MAX_IMAGE_BYTES, ALLOWED_TYPES);
        e.target.value = '';
      });
    }
    if (this.chatImageRemove) {
      this.chatImageRemove.addEventListener('click', () => this._clearPendingImage());
    }
    if (this.chatInputArea) {
      this.chatInputArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.chatInputArea.classList.add('drag-over');
      });
      this.chatInputArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.chatInputArea.classList.remove('drag-over');
      });
      this.chatInputArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.chatInputArea.classList.remove('drag-over');
        const files = e.dataTransfer && e.dataTransfer.files;
        if (!files || files.length === 0) return;
        this._handleImageFile(files[0], MAX_IMAGE_BYTES, ALLOWED_TYPES);
      });
    }

    console.log('✅ Eventos configurados correctamente');
  }

  _handleImageFile(file, maxBytes, allowedTypes) {
    if (!file || !file.type) return;
    if (!allowedTypes.includes(file.type)) {
      this.addMessage('Solo se permiten imágenes JPEG, PNG o WebP. Máx. 5 MB.', 'ai');
      return;
    }
    if (file.size > maxBytes) {
      this.addMessage('La imagen no debe superar 5 MB.', 'ai');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.indexOf('base64,') >= 0 ? dataUrl.split('base64,')[1] : dataUrl;
      this.pendingImage = { base64, contentType: file.type || 'image/jpeg' };
      if (this.chatImagePreview) {
        this.chatImagePreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Vista previa';
        this.chatImagePreview.appendChild(img);
      }
      if (this.chatImagePreviewWrap) this.chatImagePreviewWrap.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  _clearPendingImage() {
    this.pendingImage = null;
    if (this.chatImagePreview) this.chatImagePreview.innerHTML = '';
    if (this.chatImagePreviewWrap) this.chatImagePreviewWrap.style.display = 'none';
    if (this.chatImageInput) this.chatImageInput.value = '';
  }

  bindContextEvents() {
    // Refrescar snapshot cuando cambia proyecto/sección.
    document.addEventListener('np:project-context-updated', () => {
      this.refreshContextSnapshot('project-updated');
    });
    document.addEventListener('np:section-changed', (event) => {
      const section = event && event.detail ? event.detail.section : '';
      const mapped = this.mapSectionToModule(section);
      if (mapped) this.lastSectionHint = mapped;
      this.refreshContextSnapshot('section-changed');
    });
    window.addEventListener('storage', (event) => {
      if (!event || !event.key) return;
      const projectId = this.getCurrentProjectId();
      if (!projectId) return;
      if (event.key === `nutriplant_project_${projectId}` || event.key === 'nutriplant-current-project') {
        this.refreshContextSnapshot('storage-sync');
      }
    });
  }

  normalizeSectionKey(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  mapSectionToModule(sectionName) {
    const key = this.normalizeSectionKey(sectionName);
    if (!key) return '';
    if (key.includes('inicio')) return 'inicio';
    if (key.includes('enmienda')) return 'enmienda';
    if (key.includes('granular')) return 'granular';
    if (key.includes('fertirriego') || key.includes('fertigation')) return 'fertirriego';
    if (key.includes('hidro')) return 'hidroponia';
    if (key.includes('vpd') || key.includes('vapor')) return 'vpd';
    if (key.includes('analisis') || key === 'suelo' || key === 'extracto' || key === 'pasta' || key === 'agua' || key === 'foliar' || key === 'fruta') return 'analisis';
    if (key.includes('ubicacion') || key.includes('ubicación')) return 'ubicacion';
    if (key.includes('reporte')) return 'reportes';
    return '';
  }

  toggleChat() {
    console.log('🔄 toggleChat() - isOpen:', this.isOpen);
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    console.log('✅ openChat() - Abriendo chat');
    this.isOpen = true;
    this.isMinimized = false;
    if (this.panel) {
      this.panel.classList.add('open');
      this.panel.style.display = 'flex';
    }
    if (this.bubble) {
      this.bubble.classList.remove('minimized');
    }
    this.updateChatQuotaDisplay();
    if (this.input) {
      this.input.focus();
    }
    this.scrollToBottom();
  }

  closeChat() {
    console.log('🔒 closeChat() - Cerrando chat');
    this.isOpen = false;
    this.isMinimized = false;
    if (this.panel) {
      this.panel.classList.remove('open');
      this.panel.style.display = 'none';
    }
    if (this.bubble) {
      this.bubble.classList.add('minimized');
    }
  }

  minimizeChat() {
    console.log('🔽 minimizeChat() - Minimizando chat');
    this.isOpen = false;
    this.isMinimized = true;
    if (this.panel) {
      this.panel.classList.remove('open');
      this.panel.style.display = 'none';
    }
    if (this.bubble) {
      this.bubble.classList.add('minimized');
    }
  }

  addMessage(content, sender = 'ai') {
    console.log('💬 addMessage() - sender:', sender);
    if (!this.messagesContainer) {
      console.error('❌ messagesContainer no encontrado');
      return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = this.formatMessage(content);
    
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    // 🔑 Guardar en historial EN MEMORIA (para contexto de conversación)
    this.messages.push({ 
      content, 
      sender, 
      timestamp: new Date().toISOString() 
    });
    
    // 🔑 Guardar en localStorage por proyecto y usuario (persistencia)
    this.saveChatHistory();
  }

  getCurrentProjectId() {
    // Prioridad: clave actual + compatibilidad legacy.
    return localStorage.getItem('nutriplant-current-project') ||
           localStorage.getItem('currentProjectId') ||
           '';
  }

  saveChatHistory() {
    try {
      const projectId = this.getCurrentProjectId();
      const userId = localStorage.getItem('nutriplant_user_id');
      
      if (!userId) return;
      
      if (projectId) {
        // 🔑 Con proyecto: guardar en el objeto del proyecto (para métricas por proyecto y admin)
        const projectKey = `nutriplant_project_${projectId}`;
        const projectData = localStorage.getItem(projectKey);
        if (projectData) {
          try {
            const project = JSON.parse(projectData);
            project.chat_history = this.messages;
            project.updated_at = new Date().toISOString();
            project.updatedAt = new Date().toISOString();
            localStorage.setItem(projectKey, JSON.stringify(project));
            console.log(`✅ Historial guardado en proyecto (${this.messages.length} mensajes) - ID: ${projectId}`);
            if (typeof window.nutriplantSyncProjectToCloud === 'function') {
              try { window.nutriplantSyncProjectToCloud(projectId, project); } catch (e) { console.warn('Sync chat a nube:', e); }
            }
          } catch (parseError) {
            console.error('❌ Error parseando proyecto para guardar chat:', parseError);
          }
        } else {
          console.warn('⚠️ Proyecto no encontrado en localStorage:', projectId);
        }
      } else {
        // 🔑 Sin proyecto: guardar en el usuario (chat_history_sin_proyecto) para métricas por usuario
        const userKey = `nutriplant_user_${userId}`;
        const userData = localStorage.getItem(userKey);
        if (userData) {
          try {
            const user = JSON.parse(userData);
            user.chat_history_sin_proyecto = this.messages;
            localStorage.setItem(userKey, JSON.stringify(user));
            console.log(`✅ Historial guardado en usuario sin proyecto (${this.messages.length} mensajes)`);
            if (typeof window.nutriplantSyncUserChatNoProjectToCloud === 'function') {
              try { window.nutriplantSyncUserChatNoProjectToCloud(userId, this.messages); } catch (e) { console.warn('Sync chat sin proyecto a nube:', e); }
            }
          } catch (parseError) {
            console.error('❌ Error parseando usuario para guardar chat:', parseError);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error guardando historial de chat:', error);
    }
  }

  async loadChatHistory() {
    try {
      const projectId = this.getCurrentProjectId();
      const userId = localStorage.getItem('nutriplant_user_id');
      
      if (projectId) {
        // 🔑 Con proyecto: cargar del proyecto
        const projectKey = `nutriplant_project_${projectId}`;
        const projectData = localStorage.getItem(projectKey);
        if (projectData) {
          try {
            const project = JSON.parse(projectData);
            if (project.chat_history && Array.isArray(project.chat_history)) {
              this.messages = project.chat_history;
              console.log(`✅ Historial cargado del proyecto (${this.messages.length} mensajes) - ID: ${projectId}`);
              this._renderLoadedMessages();
              return;
            }
          } catch (parseError) {
            console.error('❌ Error parseando proyecto para cargar chat:', parseError);
          }
        }
        this.messages = [];
        return;
      }
      
      if (userId) {
        // 🔑 Sin proyecto: cargar del usuario (local + nube si hay)
        const userKey = `nutriplant_user_${userId}`;
        let userData = localStorage.getItem(userKey);
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (typeof window.nutriplantSupabaseProjects !== 'undefined' && typeof window.nutriplantSupabaseProjects.fetchUserChatNoProject === 'function' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId))) {
              const cloudChat = await window.nutriplantSupabaseProjects.fetchUserChatNoProject(userId);
              if (Array.isArray(cloudChat) && cloudChat.length > 0) {
                const local = Array.isArray(user.chat_history_sin_proyecto) ? user.chat_history_sin_proyecto : [];
                if (cloudChat.length >= local.length) {
                  user.chat_history_sin_proyecto = cloudChat;
                  localStorage.setItem(userKey, JSON.stringify(user));
                }
              }
            }
            if (user.chat_history_sin_proyecto && Array.isArray(user.chat_history_sin_proyecto)) {
              this.messages = user.chat_history_sin_proyecto;
              console.log(`✅ Historial cargado (sin proyecto) - ${this.messages.length} mensajes`);
              this._renderLoadedMessages();
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ Error parseando usuario para cargar chat sin proyecto:', parseError);
          }
        }
      }
      
      this.messages = [];
    } catch (error) {
      console.warn('⚠️ Error cargando historial de chat:', error);
      this.messages = [];
    }
  }

  /** Recarga el historial según el proyecto actual (o chat sin proyecto). Llamar al cambiar de proyecto. */
  refreshForCurrentProject() {
    this.refreshContextSnapshot('project-switch');
    this.loadChatHistory();
    this._renderLoadedMessages();
  }

  _renderLoadedMessages() {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';
    this.messages.forEach(msg => {
      if (!msg.content || !msg.content.includes('¡Hola! Soy tu asistente')) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${msg.sender}`;
        messageDiv.innerHTML = this.formatMessage(msg.content || '');
        this.messagesContainer.appendChild(messageDiv);
      }
    });
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Formato markdown legible para respuestas técnicas.
    let formatted = String(content || '');

    // Convertir LaTeX residual a texto legible (por si la IA aún envía algo en LaTeX).
    formatted = formatted.replace(/\\\[/g, '\n').replace(/\\\]/g, '\n');
    formatted = formatted.replace(/\\times/g, ' × ');
    formatted = formatted.replace(/\\,/g, ' ');
    formatted = formatted.replace(/\\frac\s*\{\s*([^}]*)\s*\}\s*\{\s*([^}]*)\s*\}/g, '($1) / ($2)');
    formatted = formatted.replace(/\\text\s*\{\s*([^}]*)\s*\}/g, '$1');
    formatted = formatted.replace(/\^3\b/g, '³').replace(/\^2\b/g, '²').replace(/\^1\b/g, '¹');
    formatted = formatted.replace(/\{\s*\\\s*\}/g, ' ');

    // Títulos markdown (#, ##, ###) con estilo visual.
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<div style="margin:10px 0 6px 0; color:#0f766e; font-weight:700;">$1</div>');
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<div style="margin:12px 0 8px 0; color:#059669; font-weight:700; font-size:1.02em;">$1</div>');
    formatted = formatted.replace(/^#\s+(.+)$/gm, '<div style="margin:14px 0 8px 0; color:#047857; font-weight:800; font-size:1.06em;">$1</div>');

    // Negritas.
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #059669;">$1</strong>');

    // Listas con viñetas y numeradas.
    formatted = formatted.replace(/^- (.*$)/gm, '<div style="margin-left: 16px; margin-bottom: 4px;">• $1</div>');
    formatted = formatted.replace(/^•\s*(.*$)/gm, '<div style="margin-left: 16px; margin-bottom: 4px;">• $1</div>');
    formatted = formatted.replace(/^(\d+)\.\s+(.*$)/gm, '<div style="margin-left: 16px; margin-bottom: 4px;"><strong style="color:#047857;">$1.</strong> $2</div>');

    // Resaltar valores técnicos (números con unidades, incl. coma de miles 1,735.97). Clase para contraste.
    formatted = formatted.replace(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(meq\/100g|meq|ppm|kg\/ha|kg|ha|t\/ha|%|kPa)/g, '<span class="chat-value-highlight">$1 $2</span>');

    // Saltos de línea.
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  addWelcomeMessage() {
    console.log('👋 Agregando mensaje de bienvenida');
    setTimeout(() => {
      this.addMessage('¡Hola! Soy tu asistente de NutriPlant PRO 🌱\n\n**Puedo ayudarte con:**\n- Análisis de suelos y enmiendas\n- Recomendaciones de fertilización\n- Interpretación de análisis\n- Cálculos nutricionales\n- Manejo agronómico\n\n¿En qué puedo ayudarte hoy?', 'ai');
    }, 500);
  }

  /** Actualiza en el header el texto de cuota: por chats (ej. 491/500) o por USD según el perfil. */
  updateChatQuotaDisplay() {
    const el = document.getElementById('chatQuotaDisplay');
    if (!el) return;
    try {
      const userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) { el.style.display = 'none'; return; }
      const userKey = `nutriplant_user_${userId}`;
      const raw = localStorage.getItem(userKey);
      if (!raw) { el.style.display = 'none'; return; }
      const user = JSON.parse(raw);
      const limitRaw = user.chat_limit_monthly;
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      let used = user.chat_usage_current_month;
      const usageMonth = user.chat_usage_month || '';
      if (usageMonth !== currentMonth) used = 0;
      used = Number(used) || 0;
      if (limitRaw === -1 || limitRaw == null || limitRaw === '') {
        el.textContent = 'Chat: Ilimitado';
        el.style.display = 'block';
        return;
      }
      const limit = Math.max(0, Number(limitRaw));
      if (limit === 0) { el.style.display = 'none'; return; }
      if (limit >= 100) {
        const remaining = Math.max(0, Math.floor(limit - used));
        el.textContent = `Quedan ${remaining} de ${limit} chats este mes`;
      } else {
        const usedFixed = used.toFixed(4);
        const limitFixed = limit.toFixed(2);
        const remaining = Math.max(0, limit - used);
        el.textContent = `${usedFixed} / ${limitFixed} USD este mes (quedan ~${remaining.toFixed(2)} USD)`;
      }
      el.style.display = 'block';
    } catch (e) {
      el.style.display = 'none';
    }
  }

  /** Comprueba si el usuario puede usar el chat (no bloqueado, bajo límite mensual). */
  checkUserChatAllowed() {
    try {
      const userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) return { allowed: true };
      const userKey = `nutriplant_user_${userId}`;
      const raw = localStorage.getItem(userKey);
      if (!raw) return { allowed: true };
      const user = JSON.parse(raw);
      if (user.chat_blocked === true) return { allowed: false, message: 'El chat con la IA está deshabilitado para tu cuenta. Contacta al administrador si necesitas activarlo.' };
      const rawLimit = user.chat_limit_monthly;
      if (rawLimit === -1 || rawLimit == null || rawLimit === '') return { allowed: true };
      const limit = parseInt(rawLimit, 10);
      if (limit === 0) return { allowed: false, message: 'No tienes chats disponibles este mes. Contacta al administrador si necesitas activarlo.' };
      if (isNaN(limit) || limit < 0) return { allowed: true };
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      let usage = user.chat_usage_current_month || 0;
      const usageMonth = user.chat_usage_month || '';
      if (usageMonth !== currentMonth) { usage = 0; }
      if (usage >= limit) return { allowed: false, message: '⚠️ Has alcanzado el límite mensual de chats' };
      return { allowed: true };
    } catch (e) {
      return { allowed: true };
    }
  }

  /** Incrementa el contador de uso mensual del chat para el usuario actual (llamar tras respuesta exitosa). */
  incrementUserChatUsage() {
    try {
      const userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) return;
      const userKey = `nutriplant_user_${userId}`;
      const raw = localStorage.getItem(userKey);
      if (!raw) return;
      const user = JSON.parse(raw);
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      if (user.chat_usage_month !== currentMonth) {
        user.chat_usage_current_month = 0;
        user.chat_usage_month = currentMonth;
      }
      user.chat_usage_current_month = (user.chat_usage_current_month || 0) + 1;
      localStorage.setItem(userKey, JSON.stringify(user));
    } catch (e) {
      console.warn('⚠️ Error incrementando uso de chat:', e);
    }
  }

  async sendMessage() {
    const message = (this.input && this.input.value) ? this.input.value.trim() : '';
    const hasImage = this.pendingImage != null;
    if (!message && !hasImage) return;

    const check = this.checkUserChatAllowed();
    if (!check.allowed) {
      this.addMessage(check.message || 'No puedes usar el chat en este momento.', 'ai');
      return;
    }

    const displayText = message || (hasImage ? '[Imagen]' : '');
    console.log('📤 Enviando mensaje:', displayText, hasImage ? '+ 1 imagen' : '');
    
    // Agregar mensaje del usuario (texto y/o imagen)
    this.addMessage(displayText, 'user');
    this.input.value = '';
    if (this.input) this.input.style.height = 'auto';
    const imageToSend = this.pendingImage;
    this._clearPendingImage();

    // Mostrar indicador de "escribiendo..."
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai typing-indicator';
    typingDiv.innerHTML = '<span>●</span><span>●</span><span>●</span>';
    typingDiv.id = 'typing-indicator';
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();

    try {
      this.refreshContextSnapshot('before-send');
      const response = await this.callOpenAI(message || '', imageToSend);
      
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();
      
      this.incrementUserChatUsage();
      this.updateChatQuotaDisplay();
      this.addMessage(response, 'ai');
    } catch (error) {
      console.error('❌ Error al obtener respuesta de IA:', error);
      
      // Remover indicador de "escribiendo..."
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();
      
      // Mostrar mensaje de error amigable
      this.addMessage('Lo siento, hubo un error al conectar con la IA. Por favor, intenta de nuevo.', 'ai');
    }
  }

  getModuleFocusedManual(module) {
    const base = {
      inicio: `
- Inicio: pantalla de proyectos recientes y proyecto activo.
- Crear proyecto: botón "+ Nuevo NutriPlant" → se crea uno nuevo; el usuario puede poner nombre, cultivo, variedad, campo/sector y guardar; ese pasa a ser el proyecto activo.
- Abrir: en cada tarjeta, "Abrir" carga ese proyecto como activo y permite trabajar en Ubicación, Enmienda, Granular, etc.
- Editar: "Editar" en la tarjeta permite cambiar nombre, cultivo, variedad, campo/sector del proyecto.
- Duplicar: "Duplicar" crea una copia del proyecto (útil para variantes o nueva temporada).
- Eliminar: "Eliminar" borra el proyecto (y sus reportes en la nube si está conectado). El proyecto activo es el que se usa en el resto de pestañas.
- Si no hay proyectos: guiar a usar "+ Nuevo NutriPlant" para crear el primero.`,
      enmienda: `
- Enmienda/CIC: evaluar rangos K 3-7%, Ca 65-75%, Mg 10-15%, Na <1%.
- Regla de signo: meq a ajustar >0 subir; <0 bajar.
- Priorizar correcciones que reducen riesgos de Na alto y desbalance catiónico.`,
      fertirriego: `
- Fertirriego tiene tres subsecciones: (1) Requerimiento Nutricional: tabla con Extracción por tonelada (kg/ton), Extracción total (kg/ha), Ajuste por niveles en suelo, Eficiencia (%), Requerimiento real (kg/ha). Cultivo y rendimiento objetivo definen la extracción; misma lógica que granular. (2) Programa de Nutrición: programa por semanas con fertilizantes/materias y dosis; aporte del programa y aporte del agua; total (programa + agua). (3) Gráficas: visualización de aportes vs requerimiento por nutriente.
- Contrastar requerimiento por extracción vs aporte real del suelo y agua. Validar semanas, materiales y concentración para evitar sobredosis.`,
      granular: `
- Granular tiene dos subsecciones: (1) Requerimiento Nutricional: tabla con Extracción por tonelada (kg/ton), Extracción total (kg/ha), Ajuste por niveles en suelo, Eficiencia (%), Requerimiento real (kg/ha). Cultivo y rendimiento objetivo definen la extracción; la lógica es extracción total = extracción/ton × rendimiento; requerimiento real considera ajuste y eficiencia. (2) Programa: aplicaciones con dosis (kg/ha) y materiales (fertilizantes). Cultivos y fertilizantes pueden ser predefinidos o personalizados.
- Contrastar plan de K/Ca/Mg contra diagnóstico de suelo para evitar excesos.`,
      hidroponia: `
- Hidroponía tiene dos subsecciones: (1) Solución por etapa: definición de etapas y objetivo en meq/L y ppm por etapa; triángulo de equivalentes; suma N = NO3 + NH4. (2) Cálculo de fertilizantes: objetivo de solución (ppm), análisis de agua (ppm), requerimiento total (ppm) = objetivo − agua; volumen de agua (m³), tanque (L), relación inyección (L/m³); fertilizantes y dosis para cubrir el requerimiento.
- Validar equilibrio catión/anión para evitar antagonismos y precipitados.`,
      analisis: `
- Análisis agrupa varias subpestañas: Análisis de Suelo, Solución Nutritiva, Extracto de Pasta, Agua, Foliar (DOP), Fruta (ICC). Análisis de Suelo: panel "Reportes en este proyecto" con "+ Agregar análisis"; cada reporte tiene título, fecha, Eliminar, y tres secciones: (1) Propiedades físicas (clase textural, punto saturación, capacidad de campo, punto marchitamiento, cond. hidráulica, densidad aparente); (2) pH y salinidad (pH 1:2 agua, pH Buffer, carbonatos totales %, salinidad CE dS/m); (3) Fertilidad del suelo (profundidad cm, % suelo explorado por raíces, CIC; tabla Nivel laboratorio e Ideal referencia: MO, N-NO3, P por método Bray/Olsen/Merich, K, Ca, Mg, Na, S, micronutrientes; conversión a kg/ha). Los datos de suelo se usan en Enmienda (CIC/cationes).
- Solución Nutritiva: misma estructura de lista "Reportes en este proyecto" y "+ Agregar análisis"; cada reporte tiene título, fecha, Eliminar; secciones: (1) Características generales: CE dS/m, pH, RAS; (2) Cationes (Ca, Mg, Na, K en meq/L y ppm, con ref. min–max y estado, ideal opcional y diferencia); (3) Aniones (SO4, HCO3, Cl, CO3, PO4, NO3 en meq/L y ppm, ref e ideal); (4) Micronutrimentos (Fe, Mn, Zn, Cu, B, Mo ppm, ref e ideal). Conversión automática meq/L ↔ ppm; interpretar estado vs referencia y diferencia vs ideal.
- Extracto de Pasta: lista "Reportes en este proyecto" y "+ Agregar análisis"; cada reporte tiene título, fecha, Eliminar. Secciones: (1) CE, RAS y pH (CE dS/m, RAS, pH del extracto); (2) Cationes (Ca, Mg, Na, K en meq/L y ppm; ref. en ppm: Ca 150–220, Mg 40–70, K 200–300, Na ideal &lt;50; estado e ideal opcional); (3) Aniones (NO3, PO4, SO4, Cl, HCO3, CO3 en meq/L y ppm; ref. NO3 150–200, PO4 30–60, SO4 60–110, Cl ideal &lt;70, HCO3 ideal &lt;120, CO3 ideal 0); (4) Micronutrimentos (Fe, Mn, Zn, Cu, B, Mo ppm con ref.); (5) Relación nutrimental: ratios calculados NO3/K (ideal 2.0–2.5), K/Ca (0.2–0.4), K/Mg (0.2–0.5), Ca/Mg (1.2–2.0), Ca/Na (1.5–3.0). Conversión meq/L ↔ ppm; interpretar estado vs ref. y ratios.
- Análisis de Agua: lista "Reportes en este proyecto" y "+ Agregar análisis"; por reporte: m³ agua de riego (volumen de referencia), título, fecha, Eliminar. Secciones: (1) CE, RAS y pH; (2) Cationes (Ca, Mg, Na, K en meq/L y ppm; suma cationes; kg elemento y kg óxido CaO, MgO, K₂O según m³); (3) Aniones (SO4, HCO3, Cl, CO3, PO4, NO3 en meq/L y ppm; suma aniones; kg elemento S, N, P según m³); (4) Micronutrimentos (B, Fe, Mn, Cu, Zn ppm; kg elemento según m³); (5) Ácido para neutralizar HCO₃⁻ y CO₃²⁻: tipo de ácido (nítrico, sulfúrico, fosfórico), residual objetivo (meq/L), resultado mL ácido/m³ y L total. Conversión meq/L ↔ ppm; uso del agua en fertirriego/hidroponía para restar aporte del agua del requerimiento.
- Análisis Foliar (DOP): lista "Reportes en este proyecto" y "+ Agregar análisis"; por reporte: título, fecha, Eliminar. DOP = Diagnosis and Recommendation Integrated System: DOP = ((Valor − Óptimo) / Óptimo) × 100. Secciones: (1) Macronutrientes (% MS): N, P, K, Ca, Mg, S — columna Resultado (análisis), Óptimo (%) editable (por defecto N 3, P 0.275, K 2.5, Ca 1.25, Mg 0.4, S 0.325), DOP calculado y Estado (Óptimo | Bajo | Alto | Muy bajo | Muy alto); (2) Micronutrientes (mg/kg): Fe, Mn, Zn, Cu, B, Mo — Resultado, Óptimo editable (por defecto Fe 150, Mn 160, Zn 60, Cu 15, B 62.5, Mo 2.55), DOP y Estado. Regla visual: 🟢 |DOP| ≤ 10% | 🔶 10–25% | 🟠 25–50% | 🔴 &gt;50%. Los óptimos se guardan por análisis.
- Análisis de Fruta (ICC): lista "Reportes en este proyecto" y "+ Agregar análisis"; por reporte: título, fecha, Eliminar. ICC = Índice Comparativo de Calidad: ICC = ((Valor − Óptimo) / Óptimo) × 100. Secciones: (1) Macronutrientes en fruta (%): N, P, K, Ca, Mg, S — Resultado, Óptimo editable (por defecto N 1.8, P 0.25, K 1.5, Ca 0.25, Mg 0.2, S 0.18), ICC y Estado; (2) Micronutrientes (mg/kg): Fe, Mn, Zn, Cu, B, Mo — Resultado, Óptimo editable, ICC y Estado; (3) Calidad de fruta: Materia Seca (%), °Brix, Firmeza (kg/cm²), Acidez titulable (%) — Resultado, Óptimo editable, ICC y Estado; (4) Calcio en fruta (mg/100 g MF): Ca total, % Ca soluble, % Ca ligado, % Ca insoluble — Resultado, Óptimo editable, Estado (semáforo). Regla visual: 🟢 |ICC| ≤ 10% | 🟡 10–25% | 🟠 25–50% | 🔴 &gt;50%. Los óptimos se guardan por análisis. Integrar todos los análisis en diagnóstico.`,
      vpd: `
- Déficit de Presión de Vapor (VPD): pestaña con dos calculadoras. (1) Calculadora Ambiental Simple: requiere ubicación del proyecto (polígono en pestaña Ubicación); muestra lat/lng; inputs Temperatura del Aire (°C) y Humedad Relativa (%); botones "Obtener del Clima" (usa ubicación) y "Calcular VPD"; resultados VPD (kPa) y HD (g/m³). (2) Calculadora Avanzada: Temperatura del Aire (°C), Humedad Relativa (%); Modo "Temperatura de Hoja" (input T hoja °C) o "Radiación Solar" (input W/m², T hoja calculada); botón "Calcular Déficit de Presión de Vapor"; resultados. Historial de cálculos (ambiental/avanzado, fecha, VPD kPa, HD). VPD = presión sat. a T_hoja − presión real vapor; afecta transpiración, absorción de Ca y estrés. Rangos típicos: 0.4–1.2 kPa óptimo según especie; &lt;0.3 riesgo edema; &gt;1.5 estrés hídrico. Cruza VPD con nutrición/riego para timing y riesgo de fitotoxicidad.`,
      ubicacion: `
- Ubicación: polígono en mapa, área, perímetro. Necesario para algunas calculadoras y reportes.`,
      reportes: `
- Reportes: esta pestaña sirve para generar y gestionar reportes PDF del proyecto. Botón "Generar Nuevo Reporte PDF" crea un reporte que puede incluir: Ubicación (coordenadas, área, polígono), Enmiendas, Nutrición granular, Fertirriego, Hidroponía, Déficit de presión de vapor (VPD). También se puede generar el primer reporte desde la sección de enmiendas. La lista muestra los reportes generados; cada uno tiene Descargar (PDF) y Eliminar. Los reportes se guardan en el proyecto y se sincronizan a la nube si el usuario está conectado.`,
      general: `
- NutriPlant PRO: responder con base en datos del proyecto activo y criterio agronómico técnico.
- Diferenciar siempre hechos del proyecto vs conocimiento general.`
    };
    return base[module] || base.general;
  }

  applyHardGuardrailsToResponse(content, snapshot, isCalculationQuestion) {
    let safeContent = String(content || '');
    if (!snapshot || !snapshot.projectData) return safeContent;

    const adj = snapshot.projectData?.soilAnalysis?.adjustments || {};
    const ini = snapshot.projectData?.soilAnalysis?.initial || {};
    const cic = Number(ini.cic) || (Number(ini.k || 0) + Number(ini.ca || 0) + Number(ini.mg || 0) + Number(ini.na || 0) + Number(ini.h || 0) + Number(ini.al || 0));
    const kPct = cic > 0 ? ((Number(ini.k) || 0) / cic) * 100 : null;
    const caPct = cic > 0 ? ((Number(ini.ca) || 0) / cic) * 100 : null;
    const mgPct = cic > 0 ? ((Number(ini.mg) || 0) / cic) * 100 : null;

    const asksIncreaseK = /subir\s+k|aumentar\s+k|incrementar\s+k/i.test(safeContent) && !/no\s+(subir|aumentar|incrementar)\s+k/i.test(safeContent);
    const asksIncreaseCa = /subir\s+ca|aumentar\s+ca|incrementar\s+ca/i.test(safeContent) && !/no\s+(subir|aumentar|incrementar)\s+ca/i.test(safeContent);
    const asksIncreaseMg = /subir\s+mg|aumentar\s+mg|incrementar\s+mg/i.test(safeContent) && !/no\s+(subir|aumentar|incrementar)\s+mg/i.test(safeContent);

    const contradictsK = asksIncreaseK && ((Number(adj.k) < 0) || (kPct != null && kPct > 7));
    const contradictsCa = asksIncreaseCa && ((Number(adj.ca) < 0) || (caPct != null && caPct > 75));
    const contradictsMg = asksIncreaseMg && ((Number(adj.mg) < 0) || (mgPct != null && mgPct > 15));

    if (contradictsK || contradictsCa || contradictsMg) {
      safeContent += `\n\n## Corrección automática de coherencia\nSe detectó una contradicción entre recomendación y cálculo del proyecto. Se debe respetar la regla: ajuste negativo o valor sobre rango implica NO aumentar ese elemento.`;
    }

    return safeContent;
  }

  async callOpenAI(userMessage, imageData) {
    console.log('🤖 Llamando al backend de IA...', imageData ? '(con imagen)' : '');
    // Siempre refrescar contexto al enviar para incluir los valores más recientes (guardados y pantalla actual)
    this.refreshContextSnapshot('call-openai');

    const snapshot = this.contextSnapshot || this.getUnifiedProjectSnapshot();
    const context = this.getProjectContext();
    const moduleManual = this.getModuleFocusedManual(snapshot.module);
    const modeGuidance = this.buildInteractionModeGuidance(userMessage);
    const isCalculationQuestion = this.isCalculationOrLogicQuestion(userMessage);

    const systemPrompt = `Eres el ASISTENTE EXPERTO de NutriPlant PRO. Tu objetivo es ayudar a tomar mejores decisiones agronómicas con base en datos reales del proyecto activo.

IDENTIDAD Y CAPACIDADES:
- Dominas lógica de NutriPlant: Enmienda, Suelo, Granular, Fertirriego, Hidroponía, Análisis y VPD.
- Diferencias claramente cálculo de plataforma vs criterio técnico general.
- Tu respuesta debe ser accionable, coherente y trazable.

MANUAL DEL MÓDULO ACTIVO:
${moduleManual}

DATOS DEL PROYECTO ACTUAL DEL USUARIO (usa esto como si estuvieras viendo su pantalla y sus análisis):
${context}

INSTRUCCIONES:
- CUANDO pregunten por números, cálculos o "por qué la app sugiere X": usa ÚNICAMENTE los datos del proyecto que aparecen arriba (pestaña actual). No inventes ni mezcles con otros proyectos.
- CUANDO pregunten teoría agronómica, relaciones entre nutrientes o criterios generales (sin pedirte que interpretes sus datos): puedes responder con lógica y conocimiento técnico general; si aplica, relaciona con lo que tienen en la pestaña y separa "Contexto del proyecto" vs "Conocimiento general".
- No mezcles ni cites valores de otros proyectos del usuario. Si menciona "mi otro proyecto", indica que solo tienes contexto del proyecto actual.
- Si existe una línea "Resultado en pantalla (prioridad alta...)" en ENMIENDAS, úsala como fuente principal para cantidades y aportes; cita esos números exactos en tu respuesta.
- Si existen los bloques "🧪 Enmiendas Disponibles", "% Suelo explorado por raíces" y "📊 Resultados del Cálculo de Enmiendas", trátalos como lectura directa de pantalla y priorízalos para responder preguntas de Enmienda.
- Tu valor diferenciador es usar SIEMPRE los datos que ves del proyecto (análisis, programa, cultivo, CIC, etc.) para dar recomendaciones específicas a este agronomista, no genéricas. Interpreta sus números con la lógica NutriPlant PRO y sugiere acciones concretas.
- Usa el bloque INTERCONEXIONES ENTRE PESTAÑAS cuando convenga: si preguntan por qué algo no funciona (ej. VPD sin clima), de dónde sale un dato (ej. enmienda que usa CIC de suelo) o qué pestaña completar primero; indica la pestaña origen o la que debe configurarse.
- Si preguntan por conversión óxido↔elemental (P₂O₅/P, K₂O/K, CaO/Ca, MgO/Mg, S/SO₄, Zn/ZnO) o por ppm↔mmol/L↔meq/L, usa exactamente los factores y fórmulas del manual sección 7 (Calculadoras NutriPlant) para que tu respuesta coincida con las calculadoras de la plataforma.
- Regla crítica de coherencia: en cationes/CIC, si un elemento está por ENCIMA del rango ideal o el "meq a ajustar" es NEGATIVO, NO recomiendes aumentarlo; en ese caso la dirección correcta es disminuir/contener/aplazar ese elemento.
- Si detectas inconsistencia entre tu recomendación y los números del contexto, corrige la recomendación y explica brevemente por qué.
- Si la pregunta es sobre "de dónde salió un valor", "cómo se calculó", "por qué sugiere eso", prioriza explicación de lógica NutriPlant con trazabilidad (dato -> fórmula/regla -> resultado -> decisión).
- Si la pregunta es agronómica general (sin depender del proyecto), puedes usar conocimiento técnico general de IA y mejores prácticas agronómicas, pero separa claramente "Contexto del proyecto" vs "Conocimiento general".
- Mantén el contexto de TODA la conversación; relaciona respuestas con preguntas anteriores cuando sea relevante.
- Responde con datos concretos del proyecto (números, cultivo, programa, análisis) cuando pregunten por su información.
- VALORES QUE EL USUARIO TE INDICA: Si el usuario te escribe un valor, número o dato (p. ej. "mi CIC es 12", "el resultado me dio 5000 kg/ha", "tengo K 2.5%") que no aparece en los "DATOS DEL PROYECTO" anteriores, ÚSALO igual y trabaja con él; confirma que lo tomas en cuenta. No digas que no lo ves si el usuario te lo está dando en el mensaje. Si quieres, puedes añadir que si guarda el proyecto ese valor aparecerá la próxima vez en el contexto automáticamente.
- Para la herramienta: explica cálculos, interpretación de valores y dónde configurar algo.
- Para nutrición vegetal: da recomendaciones técnicas, basadas en ciencia y en el manual; usa términos agronómicos correctos y nivel experto (relaciones, antagonismos, momentos de aplicación, diagnóstico integrado).
- Sé conciso pero completo; usa formato markdown para mejor legibilidad.
- Si el usuario adjunta una imagen, interpreta su contenido (análisis, gráfica, planta, suelo, resultado de laboratorio, etc.) en contexto agronómico y responde en consecuencia usando también los datos del proyecto cuando aplique.
- FÓRMULAS Y CÁLCULOS: No uses nunca LaTeX ni código (evita \\frac, \\times, \\text, \\[, \\]). Escribe las fórmulas en texto legible para que el usuario las entienda en el chat: usa el símbolo × para multiplicar, / para dividir, = para igual, y saltos de línea. Ejemplo: "Peso del suelo = 3.000 m³ × 1.100 kg/m³ = 3.300.000 kg". Así se lee directo sin confusión.

MODO DE INTERACCIÓN ACTIVO:
${modeGuidance}

ESTILO DE RESPUESTA:
- Preferencia del usuario: ${this.responseStyle}.
- Si es "breve": responde en 4-8 líneas, muy concreto y accionable.
- Si es "detallada": explica con más profundidad técnica, sin perder claridad.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    const historyLimit = isCalculationQuestion ? 6 : 12;
    const recentMessages = this.messages.slice(-historyLimit);
    recentMessages.forEach(msg => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
    
    // Agregar el mensaje actual del usuario (texto; si hay imagen, el backend lo convierte a multimodal)
    messages.push({
      role: 'user',
      content: userMessage || '(interpreta la imagen en contexto agronómico)'
    });
    
    const maxTokens = this.responseStyle === 'detallada'
      ? (isCalculationQuestion ? 900 : 1200)
      : (isCalculationQuestion ? 450 : 650);
    const userId = localStorage.getItem('nutriplant_user_id') || 'anonymous';
    const projectId = snapshot.projectId || '';

    const body = {
      userId,
      projectId,
      module: snapshot.module || 'general',
      model: this.model,
      messages: messages,
      temperature: isCalculationQuestion ? 0.25 : 0.4,
      max_tokens: maxTokens
    };
    if (imageData && imageData.base64) {
      body.imageBase64 = imageData.base64;
      body.imageContentType = imageData.contentType || 'image/jpeg';
    }
    console.log(`📜 Enviando ${messages.length} mensajes al backend IA`, body.imageBase64 ? '+ 1 imagen' : '');
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) {
        const quotaMessage = data?.message || 'Límite mensual de chat alcanzado.';
        return `⚠️ ${quotaMessage}`;
      }
      if (response.status === 403) {
        const blockedMessage = data?.message || 'El chat con la IA está deshabilitado para tu cuenta. Contacta al administrador.';
        return `⚠️ ${blockedMessage}`;
      }
      if (response.status === 501 || response.status === 404) {
        return '⚠️ El backend de IA no está activo en este puerto. Inicia `python3 server.py` en el proyecto para habilitar el chat inteligente.';
      }
      console.error('❌ Error de API backend:', data);
      throw new Error(`Error ${response.status}: ${data?.error || data?.message || 'Error desconocido'}`);
    }

    const rawContent = data?.choices?.[0]?.message?.content || '';
    const safeContent = this.applyHardGuardrailsToResponse(rawContent, snapshot, isCalculationQuestion);
    return safeContent || 'No se recibió contenido de respuesta.';
  }

  isCalculationOrLogicQuestion(message) {
    const text = String(message || '').toLowerCase();
    const keywords = [
      'meq', 'cic', 'porcentaje', 'porcentajes', 'rango', 'ajuste',
      'calculo', 'cálculo', 'como se calculo', 'cómo se calculó',
      'de donde salio', 'de dónde salió', 'por que sugiere', 'por qué sugiere',
      'enmienda', 'k', 'ca', 'mg', 'na', 'ph', 'pH'
    ];
    return keywords.some(k => text.includes(k));
  }

  buildInteractionModeGuidance(message) {
    if (this.isCalculationOrLogicQuestion(message)) {
      return `MODO: LOGICA_NUTRIPLANT
- Responde como auditor técnico de la calculadora.
- Usa formato obligatorio:
  1) Datos usados (del proyecto actual)
  2) Regla/Fórmula aplicada
  3) Resultado numérico
  4) Decisión agronómica sugerida
- Si hay ambigüedad, dilo explícitamente y pide el dato faltante.`;
    }

    return `MODO: ASESORIA_AGRONOMICA
- Responde como especialista en nutrición vegetal de nivel profesional.
- Combina contexto del proyecto (si aplica) con conocimiento agronómico general.
- Diferencia claramente:
  • Lo que sale de NutriPlant PRO
  • Lo que es recomendación técnica general.`;
  }

  buildSoilConsistencyContext(ini, adj) {
    const toNum = (v) => (typeof v === 'number' ? v : parseFloat(v));
    const k = toNum(ini.k) || 0;
    const ca = toNum(ini.ca) || 0;
    const mg = toNum(ini.mg) || 0;
    const na = toNum(ini.na) || 0;
    const h = toNum(ini.h) || 0;
    const al = toNum(ini.al) || 0;
    const cicRaw = toNum(ini.cic);
    const cic = cicRaw && cicRaw > 0 ? cicRaw : (k + ca + mg + na + h + al);

    if (!cic || cic <= 0) return '';

    const pct = {
      k: (k / cic) * 100,
      ca: (ca / cic) * 100,
      mg: (mg / cic) * 100,
      na: (na / cic) * 100
    };

    const ranges = {
      k: [3, 7],
      ca: [65, 75],
      mg: [10, 15],
      na: [0, 1]
    };

    const directionByRange = (value, min, max) => {
      if (value < min) return 'SUBIR';
      if (value > max) return 'BAJAR';
      return 'MANTENER';
    };

    const directionByAdjustment = (value) => {
      const n = toNum(value);
      if (!Number.isFinite(n)) return 'N/A';
      if (n > 0) return 'SUBIR';
      if (n < 0) return 'BAJAR';
      return 'MANTENER';
    };

    const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');
    const adjustmentK = directionByAdjustment(adj?.k);
    const adjustmentCa = directionByAdjustment(adj?.ca);
    const adjustmentMg = directionByAdjustment(adj?.mg);

    let out = '--- CHEQUEO DE COHERENCIA TÉCNICA (AUTO) ---\n';
    out += `CIC usado para diagnóstico: ${cic.toFixed(2)} meq/100g\n`;
    out += `K%: ${fmt(pct.k)} (ideal 3-7) => ${directionByRange(pct.k, ranges.k[0], ranges.k[1])}\n`;
    out += `Ca%: ${fmt(pct.ca)} (ideal 65-75) => ${directionByRange(pct.ca, ranges.ca[0], ranges.ca[1])}\n`;
    out += `Mg%: ${fmt(pct.mg)} (ideal 10-15) => ${directionByRange(pct.mg, ranges.mg[0], ranges.mg[1])}\n`;
    out += `Na%: ${fmt(pct.na)} (ideal <1) => ${directionByRange(pct.na, ranges.na[0], ranges.na[1])}\n`;
    out += `Dirección por meq a ajustar: K ${adjustmentK}, Ca ${adjustmentCa}, Mg ${adjustmentMg}\n`;
    out += 'Regla de signo: meq a ajustar positivo = SUBIR; negativo = BAJAR.\n\n';
    return out;
  }

  detectCurrentModule() {
    // 1) Última sección recibida por evento global (fuente más confiable de navegación).
    if (this.lastSectionHint) return this.lastSectionHint;

    // 2) Menú/chips activos en UI.
    const activeSectionKey =
      document.querySelector('.menu a.active[data-section]')?.getAttribute('data-section') ||
      document.querySelector('#sbStack [data-section].active')?.getAttribute('data-section') ||
      document.querySelector('.sidebar [data-section].active')?.getAttribute('data-section') ||
      '';
    const byActiveKey = this.mapSectionToModule(activeSectionKey);
    if (byActiveKey) return byActiveKey;

    // 3) Contenedores visibles por sección.
    const isVisible = (selector) => {
      const el = document.querySelector(selector);
      return !!(el && el.offsetParent !== null);
    };
    if (isVisible('.hydroponia-container')) return 'hidroponia';
    if (isVisible('.fertirriego-container')) return 'fertirriego';
    if (isVisible('.granular-container')) return 'granular';

    // 4) Fallback por título.
    const title = (document.querySelector('.top h1')?.textContent || document.getElementById('sectionTitle')?.textContent || '').toLowerCase();
    if (title.includes('inicio')) return 'inicio';
    if (title.includes('enmienda')) return 'enmienda';
    if (title.includes('granular')) return 'granular';
    if (title.includes('fertirriego')) return 'fertirriego';
    if (title.includes('hidro')) return 'hidroponia';
    if (title.includes('vapor') || title.includes('vpd')) return 'vpd';
    if (title.includes('análisis') || title.includes('analisis')) return 'analisis';
    if (title.includes('ubicación') || title.includes('ubicacion')) return 'ubicacion';
    if (title.includes('reporte')) return 'reportes';
    return 'general';
  }

  getCloudFreshnessForProject(projectId, localProject) {
    const cloudList = Array.isArray(window._np_cloud_projects_cache) ? window._np_cloud_projects_cache : [];
    const cloud = cloudList.find(p => p && p.id === projectId);
    if (!cloud) return { status: 'unknown', source: 'local-only' };

    const cloudUpdatedAt = cloud.updatedAt || cloud.updated_at || null;
    const localUpdatedAt = localProject?.updatedAt || localProject?.updated_at || localProject?.createdAt || localProject?.created_at || null;
    const cloudTs = cloudUpdatedAt ? new Date(cloudUpdatedAt).getTime() : 0;
    const localTs = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;

    if (cloudTs > 0 && localTs > 0) {
      return {
        status: cloudTs > localTs ? 'cloud_newer' : 'local_current',
        source: cloudTs > localTs ? 'cloud' : 'local',
        cloudUpdatedAt,
        localUpdatedAt
      };
    }
    return { status: 'unknown', source: 'undetermined', cloudUpdatedAt, localUpdatedAt };
  }

  getCrossModuleSignals(project) {
    const signals = [];
    const soil = project?.soilAnalysis?.initial || {};
    const k = Number(soil.k) || 0;
    const ca = Number(soil.ca) || 0;
    const mg = Number(soil.mg) || 0;
    const na = Number(soil.na) || 0;
    const h = Number(soil.h) || 0;
    const al = Number(soil.al) || 0;
    const cic = (Number(soil.cic) > 0 ? Number(soil.cic) : (k + ca + mg + na + h + al));
    const kPct = cic > 0 ? (k / cic) * 100 : null;
    const naPct = cic > 0 ? (na / cic) * 100 : null;

    const fertReq = project?.fertirriego?.requirements || {};
    const granularReq = project?.granular?.requirements || {};
    const fertK = Number(fertReq.K || fertReq.k || fertReq.K2O || fertReq.k2o || 0);
    const granK = Number(granularReq.K || granularReq.k || granularReq.K2O || granularReq.k2o || 0);

    if (kPct != null && kPct > 7 && (fertK > 0 || granK > 0)) {
      signals.push(`K en suelo alto (${kPct.toFixed(1)}%) con requerimiento K en programa (fertirriego:${fertK}, granular:${granK}). Validar reducción/ajuste por aporte de suelo.`);
    }
    if (naPct != null && naPct > 1) {
      signals.push(`Na alto (${naPct.toFixed(1)}%). Priorizar estrategia de desplazamiento y revisión de fuentes salinas en programa.`);
    }
    const vpd = project?.vpdAnalysis?.calculations?.vpd ?? project?.vpdAnalysis?.environmental?.vpd ?? null;
    if (vpd != null && Number(vpd) > 1.5 && (fertK > 0 || granK > 0)) {
      signals.push(`VPD alto (${vpd}) con programa nutricional activo. Revisar riesgo de estrés hídrico y timing de aplicaciones.`);
    }

    return signals;
  }

  getUnifiedProjectSnapshot() {
    const projectId = this.getCurrentProjectId();
    const module = this.detectCurrentModule();
    if (!projectId) {
      return {
        projectId: '',
        module,
        projectData: null,
        freshness: { status: 'no_project', source: 'none' },
        signals: []
      };
    }

    let projectData = null;
    let normalized = null;
    try {
      if (window.projectStorage && typeof window.projectStorage.getNormalizedProjectSnapshot === 'function') {
        normalized = window.projectStorage.getNormalizedProjectSnapshot(projectId);
        projectData = normalized ? {
          id: normalized.projectId,
          name: normalized.projectName,
          ...window.projectStorage.loadProject(projectId)
        } : null;
      } else if (window.projectStorage && typeof window.projectStorage.loadProject === 'function') {
        projectData = window.projectStorage.loadProject(projectId);
      }
    } catch (e) {
      console.warn('⚠️ Snapshot: projectStorage.loadProject falló', e);
    }

    if (!projectData) {
      try {
        const raw = localStorage.getItem(`nutriplant_project_${projectId}`);
        if (raw) projectData = JSON.parse(raw);
      } catch (e) {
        console.warn('⚠️ Snapshot: localStorage parse falló', e);
      }
    }

    const freshness = normalized
      ? {
          status: normalized.freshness || 'unknown',
          source: normalized.freshness === 'cloud_newer' ? 'cloud' : 'local',
          cloudUpdatedAt: normalized.cloudUpdatedAt || null,
          localUpdatedAt: normalized.localUpdatedAt || null
        }
      : this.getCloudFreshnessForProject(projectId, projectData);
    const signals = projectData ? this.getCrossModuleSignals(projectData) : [];
    const openMeta = window._np_project_freshness_meta || null;

    return {
      projectId,
      module,
      projectData,
      freshness,
      openFreshness: openMeta && openMeta.projectId === projectId ? openMeta : null,
      signals,
      builtAt: new Date().toISOString()
    };
  }

  refreshContextSnapshot(reason = 'manual') {
    this.contextSnapshot = this.getUnifiedProjectSnapshot();
    this.contextSnapshot.reason = reason;
  }

  // Lee el último resultado de enmienda disponible, priorizando el cálculo en pantalla
  getLiveAmendmentResult() {
    // 1) Resultado recién calculado (seteado por dashboard.js)
    const fromRuntime = window.__nutriplantLastAmendmentResult || null;
    if (fromRuntime && (fromRuntime.type || fromRuntime.amount || fromRuntime.ca || fromRuntime.so4)) {
      const amt = String(fromRuntime.amount || '').trim();
      return {
        type: String(fromRuntime.type || '').trim(),
        amount: amt ? (amt.includes('kg') ? amt : `${amt} kg/ha`) : '',
        ca: String(fromRuntime.ca || '').trim(),
        so4: String(fromRuntime.so4 || '').trim(),
        source: 'runtime'
      };
    }

    // 2) Lectura del DOM "simple" (si existen esos campos)
    const typeEl = document.getElementById('amendment-type');
    const amountEl = document.getElementById('amendment-amount');
    if (typeEl || amountEl) {
      const type = String(typeEl?.textContent || '').trim();
      const amount = String(amountEl?.textContent || '').trim();
      if ((type && type !== '-') || (amount && amount !== '-')) {
        return { type, amount, ca: '', so4: '', source: 'dom-basic' };
      }
    }

    // 3) Lectura del DOM "detallado" (tabla de resultados)
    const resultsSection = document.getElementById('amendment-results');
    if (resultsSection) {
      const row = resultsSection.querySelector('table.results-table tbody tr');
      if (row) {
        const cells = row.querySelectorAll('td');
        const type = String(cells[0]?.textContent || '').replace(/^⚠️\s*/, '').trim();
        const amountRaw = String(cells[1]?.textContent || '').trim();
        const ca = String(cells[3]?.textContent || '').trim();
        const so4 = String(cells[5]?.textContent || '').trim();
        const amount = amountRaw && amountRaw !== '-' ? `${amountRaw} kg/ha` : '';
        if (type || amount || (ca && ca !== '-') || (so4 && so4 !== '-')) {
          return {
            type,
            amount,
            ca: ca !== '-' ? ca : '',
            so4: so4 !== '-' ? so4 : '',
            source: 'dom-table'
          };
        }
      }
    }

    return null;
  }

  // Captura en vivo de los 3 bloques clave de Enmienda para el prompt
  getLiveAmendmentScreenBlocks() {
    const out = {
      availableTable: '',
      soilReachPercent: '',
      calcResultsText: ''
    };

    // 1) 🧪 Enmiendas Disponibles (tabla de composiciones)
    const tbody = document.getElementById('amendments-table-body');
    if (tbody) {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (rows.length > 0) {
        // Resumen compacto: Enmienda + %K/%Ca/%Mg/%SO4 (y bandera de selección)
        const parsed = rows.slice(0, 12).map((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 10) return null;
          const name = String(cells[0]?.textContent || '').trim();
          const k = String(cells[3]?.textContent || '').trim() || '-';
          const ca = String(cells[4]?.textContent || '').trim() || '-';
          const mg = String(cells[5]?.textContent || '').trim() || '-';
          const so4 = String(cells[6]?.textContent || '').trim() || '-';
          const actionBtn = row.querySelector('.btn-select-amendment');
          const isSelected = !!(actionBtn && actionBtn.classList.contains('selected'));
          if (!name) return null;
          return `${isSelected ? '[SEL]' : '[ ]'} ${name} | %K:${k} | %Ca:${ca} | %Mg:${mg} | %SO4:${so4}`;
        }).filter(Boolean);
        if (parsed.length) out.availableTable = parsed.join('\n');
      }
    }

    // 2) % Suelo explorado por raíces (input)
    const soilReachEl = document.getElementById('soil-reach-percent');
    if (soilReachEl) {
      const v = String(soilReachEl.value || '').trim();
      if (v) out.soilReachPercent = v;
    }

    // 3) 📊 Resultados del Cálculo de Enmiendas (bloque visible en pantalla)
    const resultsEl = document.getElementById('amendment-results');
    if (resultsEl) {
      const txt = String(resultsEl.innerText || '').replace(/\s+/g, ' ').trim();
      if (txt && txt.length > 30) out.calcResultsText = txt.slice(0, 2500);
    }

    return out;
  }

  getLiveGranularRequirementBlocks() {
    const out = { cultivo: '', rendimiento: '', tableSummary: '' };
    const cropEl = document.getElementById('granularRequerimientoCropType');
    const yieldEl = document.getElementById('granularRequerimientoTargetYield');
    if (cropEl) {
      const opt = cropEl.options[cropEl.selectedIndex];
      out.cultivo = (opt && opt.text) ? opt.text.trim() : (cropEl.value || '').trim();
    }
    if (yieldEl && yieldEl.value !== '') out.rendimiento = String(yieldEl.value).trim();
    const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B'];
    const rows = [];
    const extract = [], total = [], adj = [], eff = [], real = [];
    nutrients.forEach(n => {
      const e = document.getElementById(`granular-extract-${n}`);
      const t = document.getElementById(`granular-extraccion-total-${n}`);
      const a = document.getElementById(`granular-adj-${n}`);
      const f = document.getElementById(`granular-eff-${n}`);
      const r = document.getElementById(`granular-req-${n}`);
      if (e && e.value) extract.push(`${n}:${e.value}`);
      if (t && t.textContent) total.push(`${n}:${t.textContent.trim()}`);
      if (a && a.value) adj.push(`${n}:${a.value}`);
      if (f && f.value) eff.push(`${n}:${f.value}%`);
      if (r && r.textContent) real.push(`${n}:${r.textContent.trim()}`);
    });
    if (extract.length) rows.push('Extracción por tonelada (kg/ton): ' + extract.join(', '));
    if (total.length) rows.push('Extracción total (kg/ha): ' + total.join(', '));
    if (adj.length) rows.push('Ajuste por suelo: ' + adj.join(', '));
    if (eff.length) rows.push('Eficiencia (%): ' + eff.join(', '));
    if (real.length) rows.push('Requerimiento real (kg/ha): ' + real.join(', '));
    if (rows.length) out.tableSummary = rows.join('\n');
    return out;
  }

  getLiveFertirriegoBlocks() {
    const out = { subsection: '', cultivo: '', rendimiento: '', tableSummary: '' };
    const activeBtn = document.querySelector('.fertirriego-tabs .tab-button.active');
    const tab = activeBtn && activeBtn.getAttribute('data-tab');
    if (tab === 'extraccion') out.subsection = 'Requerimiento Nutricional';
    else if (tab === 'programa') out.subsection = 'Programa de Nutrición';
    else if (tab === 'graficas') out.subsection = 'Gráficas';
    const cropEl = document.getElementById('fertirriegoCropType');
    const yieldEl = document.getElementById('fertirriegoTargetYield');
    if (cropEl) {
      const opt = cropEl.options[cropEl.selectedIndex];
      out.cultivo = (opt && opt.text) ? opt.text.trim() : (cropEl.value || '').trim();
    }
    if (yieldEl && yieldEl.value !== '') out.rendimiento = String(yieldEl.value).trim();
    const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B'];
    const rows = [];
    const extract = [], total = [], adj = [], eff = [], real = [];
    nutrients.forEach(n => {
      const e = document.getElementById(`ferti-extract-${n}`);
      const t = document.getElementById(`extraccion-total-${n}`);
      const a = document.getElementById(`ferti-adj-${n}`);
      const f = document.getElementById(`ferti-eff-${n}`);
      const r = document.getElementById(`ferti-req-${n}`);
      if (e && e.value) extract.push(`${n}:${e.value}`);
      if (t && t.textContent) total.push(`${n}:${t.textContent.trim()}`);
      if (a && a.value) adj.push(`${n}:${a.value}`);
      if (f && f.value) eff.push(`${n}:${f.value}%`);
      if (r && r.textContent) real.push(`${n}:${r.textContent.trim()}`);
    });
    if (extract.length) rows.push('Extracción por tonelada (kg/ton): ' + extract.join(', '));
    if (total.length) rows.push('Extracción total (kg/ha): ' + total.join(', '));
    if (adj.length) rows.push('Ajuste por suelo: ' + adj.join(', '));
    if (eff.length) rows.push('Eficiencia (%): ' + eff.join(', '));
    if (real.length) rows.push('Requerimiento real (kg/ha): ' + real.join(', '));
    if (rows.length) out.tableSummary = rows.join('\n');
    return out;
  }

  getLiveHidroponiaBlocks() {
    const out = { subsection: '', volume: '', objectiveSummary: '', waterSummary: '', missingSummary: '' };
    const activeBtn = document.querySelector('.hydroponia-tabs .tab-button.active');
    const tab = activeBtn && activeBtn.getAttribute('data-tab');
    if (tab === 'hidro-solucion') out.subsection = 'Solución por etapa';
    else if (tab === 'hidro-calculo') out.subsection = 'Cálculo de fertilizantes';
    const vEl = document.getElementById('hydroVolumeWaterM3');
    const tEl = document.getElementById('hydroTankVolumeL');
    const rEl = document.getElementById('hydroInjectionRate');
    if (vEl && tEl && rEl) {
      const v = (vEl.value || vEl.getAttribute('value') || '').trim();
      const t = (tEl.value || tEl.getAttribute('value') || '').trim();
      const r = (rEl.value || rEl.getAttribute('value') || '').trim();
      if (v || t || r) out.volume = `${v || '—'} m³, tanque ${t || '—'} L, inyección ${r || '—'} L/m³`;
    }
    const objGrid = document.getElementById('hydroObjectiveGrid');
    if (objGrid && objGrid.querySelectorAll('.hydro-grid-item').length) {
      const items = Array.from(objGrid.querySelectorAll('.hydro-grid-item'));
      const parts = items.map(item => {
        const label = item.querySelector('.hydro-grid-label');
        const value = item.querySelector('.hydro-grid-value');
        if (label && value) return (label.textContent || '').trim() + ': ' + (value.textContent || '').trim();
        return '';
      }).filter(Boolean);
      if (parts.length) out.objectiveSummary = parts.join(', ');
    }
    const waterGrid = document.getElementById('hydroWaterGrid');
    if (waterGrid) {
      const inputs = waterGrid.querySelectorAll('input[data-water-nutrient]');
      const parts = Array.from(inputs).map(inp => {
        const n = inp.getAttribute('data-water-nutrient');
        const val = (inp.value || '').trim();
        if (n && (val || val === '0')) return `${n}: ${val}`;
        return '';
      }).filter(Boolean);
      if (parts.length) out.waterSummary = parts.join(', ');
    }
    const missGrid = document.getElementById('hydroMissingGrid');
    if (missGrid && missGrid.querySelectorAll('.hydro-grid-item').length) {
      const items = Array.from(missGrid.querySelectorAll('.hydro-grid-item'));
      const parts = items.map(item => {
        const label = item.querySelector('.hydro-grid-label');
        const value = item.querySelector('.hydro-grid-value');
        if (label && value) return (label.textContent || '').trim() + ': ' + (value.textContent || '').trim();
        return '';
      }).filter(Boolean);
      if (parts.length) out.missingSummary = parts.join(', ');
    }
    return out;
  }

  getLiveReportesBlocks() {
    const out = { reportCount: 0, reportTitles: [], hasNoReportsMessage: false };
    const listEl = document.getElementById('reportsList');
    if (!listEl) return out;
    const noReports = listEl.querySelector('.no-reports');
    if (noReports) {
      out.hasNoReportsMessage = true;
      return out;
    }
    const items = listEl.querySelectorAll('.report-item');
    out.reportCount = items.length;
    items.forEach(item => {
      const h4 = item.querySelector('h4');
      if (h4 && h4.textContent) out.reportTitles.push(h4.textContent.replace(/^📄\s*/, '').trim());
    });
    return out;
  }

  getLiveAnalisisSueloBlocks() {
    const out = { visible: false, reportTitles: [], currentId: '', currentTitle: '', currentDate: '', physical: null, ph: null, fertilitySummary: null };
    const container = document.getElementById('soil-analysis-tab-container');
    if (!container) return out;
    out.visible = true;
    const listEl = document.getElementById('soil-analyses-list');
    if (listEl) {
      listEl.querySelectorAll('.soil-analysis-card').forEach(card => {
        const titleEl = card.querySelector('.soil-analysis-card-title');
        if (titleEl && titleEl.textContent) out.reportTitles.push(titleEl.textContent.trim());
      });
    }
    const wrap = document.getElementById('soil-analysis-form-wrap');
    if (wrap && wrap.style.display !== 'none') {
      out.currentId = wrap.getAttribute('data-current-id') || '';
      const titleInp = document.getElementById('soil-meta-title');
      const dateInp = document.getElementById('soil-meta-date');
      if (titleInp) out.currentTitle = (titleInp.value || '').trim();
      if (dateInp) out.currentDate = (dateInp.value || '').trim();
      const textural = document.getElementById('soil-physical-texturalClass');
      if (textural && textural.value) out.physical = { texturalClass: textural.value.trim() };
      const phInp = document.getElementById('soil-phSection-ph');
      if (phInp && phInp.value !== '') out.ph = { ph: phInp.value };
      const mo = document.getElementById('soil-fertility-mo');
      const p = document.getElementById('soil-fertility-p');
      const k = document.getElementById('soil-fertility-k');
      if (mo || p || k) {
        out.fertilitySummary = {};
        if (mo && mo.value !== '') out.fertilitySummary.mo = mo.value;
        if (p && p.value !== '') out.fertilitySummary.p = p.value;
        if (k && k.value !== '') out.fertilitySummary.k = k.value;
      }
    }
    return out;
  }

  getLiveSolucionNutritivaBlocks() {
    const out = { visible: false, reportTitles: [], currentId: '', currentTitle: '', currentDate: '', general: null, cationsSummary: null, anionsSummary: null };
    const container = document.getElementById('solucion-nutritiva-tab-container');
    if (!container) return out;
    out.visible = true;
    const listEl = document.getElementById('solucion-nutritiva-list');
    if (listEl) {
      listEl.querySelectorAll('.soil-analysis-card').forEach(card => {
        const titleEl = card.querySelector('.soil-analysis-card-title');
        if (titleEl && titleEl.textContent) out.reportTitles.push(titleEl.textContent.trim());
      });
    }
    const wrap = document.getElementById('solucion-nutritiva-form-wrap');
    if (wrap && wrap.style.display !== 'none') {
      out.currentId = wrap.getAttribute('data-current-id') || '';
      const titleInp = document.getElementById('sn-meta-title');
      const dateInp = document.getElementById('sn-meta-date');
      if (titleInp) out.currentTitle = (titleInp.value || '').trim();
      if (dateInp) out.currentDate = (dateInp.value || '').trim();
      const ce = document.getElementById('sn-general-ce');
      const ph = document.getElementById('sn-general-ph');
      const ras = document.getElementById('sn-general-ras');
      if ((ce && ce.value !== '') || (ph && ph.value !== '') || (ras && ras.value !== '')) {
        out.general = {};
        if (ce && ce.value !== '') out.general.ce = ce.value;
        if (ph && ph.value !== '') out.general.ph = ph.value;
        if (ras && ras.value !== '') out.general.ras = ras.value;
      }
      const kPpm = document.getElementById('sn-k-ppm');
      const caPpm = document.getElementById('sn-ca-ppm');
      const no3Ppm = document.getElementById('sn-no3-ppm');
      if (kPpm || caPpm || no3Ppm) {
        out.cationsSummary = {};
        out.anionsSummary = {};
        if (kPpm && kPpm.value !== '') out.cationsSummary.k = kPpm.value;
        if (caPpm && caPpm.value !== '') out.cationsSummary.ca = caPpm.value;
        if (no3Ppm && no3Ppm.value !== '') out.anionsSummary.no3 = no3Ppm.value;
      }
    }
    return out;
  }

  getLiveExtractoPastaBlocks() {
    const out = { visible: false, reportTitles: [], currentId: '', currentTitle: '', currentDate: '', general: null, cationsSummary: null, anionsSummary: null };
    const container = document.getElementById('extracto-pasta-tab-container');
    if (!container) return out;
    out.visible = true;
    const listEl = document.getElementById('extracto-pasta-list');
    if (listEl) {
      listEl.querySelectorAll('.soil-analysis-card').forEach(card => {
        const titleEl = card.querySelector('.soil-analysis-card-title');
        if (titleEl && titleEl.textContent) out.reportTitles.push(titleEl.textContent.trim());
      });
    }
    const wrap = document.getElementById('extracto-pasta-form-wrap');
    if (wrap && wrap.style.display !== 'none') {
      out.currentId = wrap.getAttribute('data-current-id') || '';
      const titleInp = document.getElementById('ep-meta-title');
      const dateInp = document.getElementById('ep-meta-date');
      if (titleInp) out.currentTitle = (titleInp.value || '').trim();
      if (dateInp) out.currentDate = (dateInp.value || '').trim();
      const cee = document.getElementById('ep-general-cee');
      const ras = document.getElementById('ep-general-ras');
      const phe = document.getElementById('ep-general-phe');
      if ((cee && cee.value !== '') || (ras && ras.value !== '') || (phe && phe.value !== '')) {
        out.general = {};
        if (cee && cee.value !== '') out.general.ce = cee.value;
        if (ras && ras.value !== '') out.general.ras = ras.value;
        if (phe && phe.value !== '') out.general.phe = phe.value;
      }
      const kPpm = document.getElementById('ep-k-ppm');
      const caPpm = document.getElementById('ep-ca-ppm');
      const no3Ppm = document.getElementById('ep-no3-ppm');
      if (kPpm || caPpm || no3Ppm) {
        out.cationsSummary = {};
        out.anionsSummary = {};
        if (kPpm && kPpm.value !== '') out.cationsSummary.k = kPpm.value;
        if (caPpm && caPpm.value !== '') out.cationsSummary.ca = caPpm.value;
        if (no3Ppm && no3Ppm.value !== '') out.anionsSummary.no3 = no3Ppm.value;
      }
    }
    return out;
  }

  getLiveAguaBlocks() {
    const out = { visible: false, reportTitles: [], currentId: '', currentTitle: '', currentDate: '', m3Riego: '', general: null, cationsSummary: null, anionsSummary: null };
    const container = document.getElementById('agua-tab-container');
    if (!container) return out;
    out.visible = true;
    const listEl = document.getElementById('agua-list');
    if (listEl) {
      listEl.querySelectorAll('.soil-analysis-card').forEach(card => {
        const titleEl = card.querySelector('.soil-analysis-card-title');
        if (titleEl && titleEl.textContent) out.reportTitles.push(titleEl.textContent.trim());
      });
    }
    const wrap = document.getElementById('agua-form-wrap');
    if (wrap && wrap.style.display !== 'none') {
      out.currentId = wrap.getAttribute('data-current-id') || '';
      const titleInp = document.getElementById('aw-meta-title');
      const dateInp = document.getElementById('aw-meta-date');
      const m3Inp = document.getElementById('aw-m3-riego');
      if (titleInp) out.currentTitle = (titleInp.value || '').trim();
      if (dateInp) out.currentDate = (dateInp.value || '').trim();
      if (m3Inp && m3Inp.value !== '') out.m3Riego = m3Inp.value.trim();
      const ce = document.getElementById('aw-general-ce');
      const ras = document.getElementById('aw-general-ras');
      const ph = document.getElementById('aw-general-ph');
      if ((ce && ce.value !== '') || (ras && ras.value !== '') || (ph && ph.value !== '')) {
        out.general = {};
        if (ce && ce.value !== '') out.general.ce = ce.value;
        if (ras && ras.value !== '') out.general.ras = ras.value;
        if (ph && ph.value !== '') out.general.ph = ph.value;
      }
      const kPpm = document.getElementById('aw-k-ppm');
      const caPpm = document.getElementById('aw-ca-ppm');
      const no3Ppm = document.getElementById('aw-no3-ppm');
      if (kPpm || caPpm || no3Ppm) {
        out.cationsSummary = {};
        out.anionsSummary = {};
        if (kPpm && kPpm.value !== '') out.cationsSummary.k = kPpm.value;
        if (caPpm && caPpm.value !== '') out.cationsSummary.ca = caPpm.value;
        if (no3Ppm && no3Ppm.value !== '') out.anionsSummary.no3 = no3Ppm.value;
      }
    }
    return out;
  }

  getLiveFoliarBlocks() {
    const out = { visible: false, reportTitles: [], currentId: '', currentTitle: '', currentDate: '', macrosSummary: null, microsSummary: null };
    const container = document.getElementById('foliar-tab-container');
    if (!container) return out;
    out.visible = true;
    const listEl = document.getElementById('foliar-list');
    if (listEl) {
      listEl.querySelectorAll('.soil-analysis-card').forEach(card => {
        const titleEl = card.querySelector('.soil-analysis-card-title');
        if (titleEl && titleEl.textContent) out.reportTitles.push(titleEl.textContent.trim());
      });
    }
    const wrap = document.getElementById('foliar-form-wrap');
    if (wrap && wrap.style.display !== 'none') {
      out.currentId = wrap.getAttribute('data-current-id') || '';
      const titleInp = document.getElementById('f-meta-title');
      const dateInp = document.getElementById('f-meta-date');
      if (titleInp) out.currentTitle = (titleInp.value || '').trim();
      if (dateInp) out.currentDate = (dateInp.value || '').trim();
      const nEl = document.getElementById('f-macro-N');
      const kEl = document.getElementById('f-macro-K');
      const pEl = document.getElementById('f-macro-P');
      if (nEl || kEl || pEl) {
        out.macrosSummary = {};
        if (nEl && nEl.value !== '') out.macrosSummary.N = nEl.value;
        if (pEl && pEl.value !== '') out.macrosSummary.P = pEl.value;
        if (kEl && kEl.value !== '') out.macrosSummary.K = kEl.value;
      }
      const feEl = document.getElementById('f-micro-Fe');
      const bEl = document.getElementById('f-micro-B');
      if (feEl || bEl) {
        out.microsSummary = {};
        if (feEl && feEl.value !== '') out.microsSummary.Fe = feEl.value;
        if (bEl && bEl.value !== '') out.microsSummary.B = bEl.value;
      }
    }
    return out;
  }

  getLiveFrutaBlocks() {
    const out = { visible: false, reportTitles: [], currentId: '', currentTitle: '', currentDate: '', macrosSummary: null, calidadSummary: null };
    const container = document.getElementById('fruta-tab-container');
    if (!container) return out;
    out.visible = true;
    const listEl = document.getElementById('fruta-list');
    if (listEl) {
      listEl.querySelectorAll('.soil-analysis-card').forEach(card => {
        const titleEl = card.querySelector('.soil-analysis-card-title');
        if (titleEl && titleEl.textContent) out.reportTitles.push(titleEl.textContent.trim());
      });
    }
    const wrap = document.getElementById('fruta-form-wrap');
    if (wrap && wrap.style.display !== 'none') {
      out.currentId = wrap.getAttribute('data-current-id') || '';
      const titleInp = document.getElementById('fru-meta-title');
      const dateInp = document.getElementById('fru-meta-date');
      if (titleInp) out.currentTitle = (titleInp.value || '').trim();
      if (dateInp) out.currentDate = (dateInp.value || '').trim();
      const nEl = document.getElementById('fru-macro-N');
      const kEl = document.getElementById('fru-macro-K');
      const brixEl = document.getElementById('fru-calidad-brix');
      if (nEl || kEl) {
        out.macrosSummary = {};
        if (nEl && nEl.value !== '') out.macrosSummary.N = nEl.value;
        if (kEl && kEl.value !== '') out.macrosSummary.K = kEl.value;
      }
      if (brixEl && brixEl.value !== '') {
        out.calidadSummary = { brix: brixEl.value };
      }
    }
    return out;
  }

  getLiveVPDBlocks() {
    const out = { visible: false, envTemp: '', envHumidity: '', advAirTemp: '', advHumidity: '', mode: 'leaf', leafTemp: '', solarRadiation: '', hasLocation: false };
    const envTempEl = document.getElementById('vpd-env-temp');
    const advAirEl = document.getElementById('vpd-adv-air-temp');
    if (!envTempEl && !advAirEl) return out;
    out.visible = true;
    const envHumEl = document.getElementById('vpd-env-humidity');
    if (envTempEl && envTempEl.value !== '') out.envTemp = envTempEl.value.trim();
    if (envHumEl && envHumEl.value !== '') out.envHumidity = envHumEl.value.trim();
    if (advAirEl && advAirEl.value !== '') out.advAirTemp = advAirEl.value.trim();
    const advHumEl = document.getElementById('vpd-adv-humidity');
    if (advHumEl && advHumEl.value !== '') out.advHumidity = advHumEl.value.trim();
    const leafRadio = document.querySelector('input[name="vpd-mode"][value="leaf"]');
    const radRadio = document.querySelector('input[name="vpd-mode"][value="radiation"]');
    if (radRadio && radRadio.checked) {
      out.mode = 'radiation';
      const solarEl = document.getElementById('vpd-solar-radiation');
      if (solarEl && solarEl.value !== '') out.solarRadiation = solarEl.value.trim();
    } else {
      const leafEl = document.getElementById('vpd-leaf-temp');
      if (leafEl && leafEl.value !== '') out.leafTemp = leafEl.value.trim();
    }
    out.hasLocation = !!envTempEl;
    return out;
  }

  getProjectContext() {
    let context = '=== DATOS DEL PROYECTO ACTUAL (lo que el usuario tiene en NutriPlant PRO) ===\n';
    context += 'ÚNICO PROYECTO DEL QUE TIENES DATOS EN ESTE CONTEXTO. No uses ni mezcles información de otros proyectos.\n\n';
    try {
      const snapshot = this.contextSnapshot || this.getUnifiedProjectSnapshot();
      const projectId = snapshot.projectId;
      if (!projectId) {
        context += 'No hay proyecto activo seleccionado.\n';
        if (snapshot.module === 'inicio') {
          context += '--- INICIO ---\nEl usuario está en Inicio. Para crear el primer proyecto: botón "+ Nuevo NutriPlant" en la barra superior; luego puede poner nombre, cultivo, variedad y campo/sector.\n\n';
        }
        return context;
      }
      const project = snapshot.projectData;
      if (!project) {
        context += 'Proyecto no encontrado en la plataforma.\n';
        return context;
      }
      context += `Módulo activo: ${snapshot.module}\n`;
      context += `Estado de frescura de datos: ${snapshot.freshness.status}\n`;
      if (snapshot.openFreshness) {
        context += `Última apertura de proyecto: ${snapshot.openFreshness.source} (${snapshot.openFreshness.refreshedAt})\n`;
      }
      if (snapshot.freshness.cloudUpdatedAt || snapshot.freshness.localUpdatedAt) {
        context += `Tiempos de referencia: cloud=${snapshot.freshness.cloudUpdatedAt || 'N/A'}, local=${snapshot.freshness.localUpdatedAt || 'N/A'}\n`;
      }
      context += '\n';

      // --- INICIO (vista de proyectos recientes; útil cuando el usuario pide ayuda para crear/abrir/editar proyectos) ---
      if (snapshot.module === 'inicio' || snapshot.module === 'general') {
        context += '--- INICIO (vista de proyectos) ---\n';
        if (snapshot.module === 'inicio') context += 'El usuario está en la sección Inicio (pantalla de proyectos recientes).\n';
        const loadProjects = typeof window.np_loadProjects === 'function' ? window.np_loadProjects() : [];
        const projectList = Array.isArray(loadProjects) ? loadProjects : [];
        if (projectList.length === 0) {
          context += 'El usuario no tiene proyectos aún. Para crear uno: usar el botón "+ Nuevo NutriPlant" en la barra superior.\n';
        } else {
          context += `Proyectos del usuario (${projectList.length}):\n`;
          projectList.slice(0, 15).forEach((p, i) => {
            const name = p.title || p.name || 'Sin nombre';
            const cultivo = p.cultivo || p.crop_type || '—';
            const variedad = p.variedad || '—';
            const campo = p.campoOsector || '—';
            const isActive = p.id === projectId;
            context += `  ${i + 1}. ${name}${isActive ? ' [PROYECTO ACTIVO]' : ''} — Cultivo: ${cultivo}; Variedad: ${variedad}; Campo/Sector: ${campo}\n`;
          });
          if (projectList.length > 15) context += `  ... y ${projectList.length - 15} más.\n`;
          context += 'En cada tarjeta: Abrir (cargar como activo), Editar (nombre/cultivo/variedad/campo), Duplicar, Eliminar.\n';
        }
        context += '\n';
      }

      // --- Identificación (dejar claro qué proyecto es) ---
      context += '--- PROYECTO ACTUAL (solo este) ---\n';
      context += `ID: ${projectId}\n`;
      context += `Nombre: ${project.name || project.title || 'Sin nombre'}\n`;
      context += `Cultivo: ${project.crop_type || project.cultivo || 'No especificado'}\n`;
      context += `Campo/Sector: ${project.campoOsector || 'No especificado'}\n\n`;

      // --- Interconexiones entre pestañas (usa esto para cruzar datos y guiar al usuario) ---
      context += '--- INTERCONEXIONES ENTRE PESTAÑAS ---\n';
      context += 'Ubicación → VPD (calculadora ambiental necesita polígono para "Obtener del Clima"); Reportes (incluyen mapa). Análisis de Suelo (CIC, cationes) → Enmienda (recomendaciones y dosis). Análisis de Agua → Fertirriego y Hidroponía (aporte del agua se resta del requerimiento). Suelo, Foliar, Fruta, Solución/Extracto/Agua → diagnóstico integrado (priorizar suelo → foliar → programa). VPD → cruzar con nutrición/riego para timing y estrés. Todas las pestañas de datos → Reportes (PDF).\n\n';

      // --- Ubicación ---
      if (project.location && project.location.polygon && project.location.polygon.length >= 3) {
        context += '--- UBICACIÓN ---\n';
        context += `Área: ${project.location.areaHectares != null ? project.location.areaHectares + ' ha' : (project.location.area != null ? project.location.area + ' m²' : '—')}\n`;
        if (project.location.perimeter != null) context += `Perímetro: ${project.location.perimeter} m\n`;
        context += '\n';
      }

      // --- Análisis de suelo ---
      if (project.soilAnalysis) {
        context += '--- ANÁLISIS DE SUELO ---\n';
        const ini = project.soilAnalysis.initial || {};
        const props = project.soilAnalysis.properties || {};
        const adj = project.soilAnalysis.adjustments || {};
        context += `Cationes (meq/100g): K ${ini.k ?? '—'}, Ca ${ini.ca ?? '—'}, Mg ${ini.mg ?? '—'}, Na ${ini.na ?? '—'}, H ${ini.h ?? '—'}, Al ${ini.al ?? '—'}; CIC total: ${ini.cic ?? '—'}\n`;
        if (props.ph > 0) context += `pH: ${props.ph}; `;
        if (props.density > 0) context += `Densidad: ${props.density} g/cm³; `;
        if (props.depth > 0) context += `Profundidad: ${props.depth} cm\n`;
        if (adj.k != null || adj.ca != null || adj.mg != null) {
          context += `Ajustes objetivo: K ${adj.k ?? '—'}, Ca ${adj.ca ?? '—'}, Mg ${adj.mg ?? '—'}\n`;
        }
        context += '\n';
        context += this.buildSoilConsistencyContext(ini, adj);
      }

      // --- Enmiendas ---
      if (project.amendments) {
        context += '--- ENMIENDAS ---\n';
        const sel = project.amendments.selected;
        if (Array.isArray(sel) && sel.length) context += `Seleccionadas: ${sel.join(', ')}\n`;
        const live = this.getLiveAmendmentResult();
        if (live && (live.type || live.amount || live.ca || live.so4)) {
          context += `Resultado en pantalla (prioridad alta, fuente=${live.source}): Enmienda ${live.type || '—'}; Cantidad ${live.amount || '—'}; Ca²⁺ ${live.ca || '—'}; SO₄²⁻ ${live.so4 || '—'}.\n`;
        } else if (project.amendments.results) {
          const r = project.amendments.results || {};
          context += `Resultados guardados: Enmienda ${r.type || '—'}; Cantidad ${r.amount || '—'}; Ca²⁺ ${r.caContribution || '—'}; Na removido ${r.naRemoval || '—'}.\n`;
        } else {
          context += 'Sin resultado de enmienda visible/guardado en este momento.\n';
        }

        context += '\n';
      }
      // BLOQUES EN VIVO DE PANTALLA (siempre intentar en Enmienda)
      if (snapshot.module === 'enmienda' || document.getElementById('soil-reach-percent') || document.getElementById('amendment-results')) {
        const liveBlocks = this.getLiveAmendmentScreenBlocks();
        context += '--- BLOQUES ENMIENDA (PANTALLA ACTUAL) ---\n';
        context += '🧪 Enmiendas Disponibles:\n';
        context += liveBlocks.availableTable ? `${liveBlocks.availableTable}\n` : 'No disponible en pantalla.\n';
        context += '% Suelo explorado por raíces:\n';
        context += liveBlocks.soilReachPercent ? `${liveBlocks.soilReachPercent}%\n` : 'No disponible en pantalla.\n';
        context += '📊 Resultados del Cálculo de Enmiendas:\n';
        context += liveBlocks.calcResultsText ? `${liveBlocks.calcResultsText}\n` : 'No hay resultados visibles aún.\n';
        context += '\n';
      }
      if (project.customAmendments && Array.isArray(project.customAmendments) && project.customAmendments.length) {
        context += `Enmiendas personalizadas: ${project.customAmendments.length} producto(s). Nombres: ${project.customAmendments.map(a => a.name || a.id || '—').join(', ')}\n\n`;
      }

      // --- Nutrición granular (Requerimiento + Programa) ---
      if (project.granular) {
        const g = project.granular;
        context += '--- NUTRICIÓN GRANULAR (Requerimiento + Programa) ---\n';
        context += 'Subsección Requerimiento Nutricional (tabla: extracción/ton, extracción total, ajuste, eficiencia, requerimiento real):\n';
        context += `Cultivo (guardado): ${g.cropType || '—'}; Rendimiento objetivo: ${g.targetYield != null ? g.targetYield + ' ton/ha' : '—'}\n`;
        if (g.requirements && typeof g.requirements === 'object') {
          const req = g.requirements;
          const keys = Object.keys(req).filter(k => typeof req[k] === 'number' && req[k] !== 0);
          if (keys.length) context += `Requerimiento real (kg/ha) guardado: ${keys.map(k => `${k}: ${req[k]}`).join(', ')}\n`;
          if (req.adjustment && typeof req.adjustment === 'object') {
            const adj = Object.entries(req.adjustment).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}`).slice(0, 8).join(', ');
            if (adj) context += `Ajuste por suelo: ${adj}\n`;
          }
          if (req.efficiency && typeof req.efficiency === 'object') {
            const eff = Object.entries(req.efficiency).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}%`).slice(0, 8).join(', ');
            if (eff) context += `Eficiencia: ${eff}\n`;
          }
        }
        context += 'Subsección Programa (aplicaciones con dosis y materiales):\n';
        const prog = g.program;
        if (prog && Array.isArray(prog.applications) && prog.applications.length) {
          prog.applications.forEach((app, i) => {
            const title = app.title || `Aplicación ${i + 1}`;
            const dose = app.doseKgHa != null ? app.doseKgHa : '—';
            const mats = (app.materials && app.materials.length) ? app.materials.map(m => (m.name || m.id || '?') + (m.percentage != null ? ` ${m.percentage}%` : '')).join('; ') : 'sin materiales';
            context += `  • ${title}: ${dose} kg/ha. Materiales: ${mats}\n`;
          });
        } else context += '  Sin aplicaciones guardadas.\n';
        context += '\n';
      }
      // BLOQUES EN VIVO GRANULAR (pantalla actual: cultivo, rendimiento, tabla requerimiento)
      if (snapshot.module === 'granular') {
        const liveGranular = this.getLiveGranularRequirementBlocks();
        if (liveGranular.cultivo || liveGranular.rendimiento || liveGranular.tableSummary) {
          context += '--- BLOQUES GRANULAR (PANTALLA ACTUAL) ---\n';
          context += `Cultivo en pantalla: ${liveGranular.cultivo || '—'}\n`;
          context += `Rendimiento objetivo en pantalla: ${liveGranular.rendimiento || '—'} ton/ha\n`;
          if (liveGranular.tableSummary) context += `Tabla Requerimiento Nutricional (valores visibles):\n${liveGranular.tableSummary}\n`;
          context += '\n';
        }
      }

      // --- Fertirriego (Requerimiento + Programa + Gráficas) ---
      if (project.fertirriego) {
        const f = project.fertirriego;
        context += '--- FERTIRRIEGO (Requerimiento + Programa + Gráficas) ---\n';
        context += 'Subsección Requerimiento Nutricional (tabla: extracción/ton, extracción total, ajuste, eficiencia, requerimiento real):\n';
        context += `Cultivo (guardado): ${f.cropType || '—'}; Rendimiento objetivo: ${f.targetYield != null ? f.targetYield + ' ton/ha' : '—'}\n`;
        if (f.requirements && typeof f.requirements === 'object') {
          const req = f.requirements;
          const keys = Object.keys(req).filter(k => typeof req[k] === 'number' && req[k] !== 0);
          if (keys.length) context += `Requerimiento real (kg/ha) guardado: ${keys.slice(0, 12).map(k => `${k}: ${req[k]}`).join(', ')}${keys.length > 12 ? '...' : ''}\n`;
          if (req.adjustment && typeof req.adjustment === 'object') {
            const adj = Object.entries(req.adjustment).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}`).slice(0, 8).join(', ');
            if (adj) context += `Ajuste por suelo: ${adj}\n`;
          }
          if (req.efficiency && typeof req.efficiency === 'object') {
            const eff = Object.entries(req.efficiency).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}%`).slice(0, 8).join(', ');
            if (eff) context += `Eficiencia: ${eff}\n`;
          }
        }
        context += 'Subsección Programa de Nutrición (semanas, fertilizantes, aporte programa + agua):\n';
        const prog = f.program;
        if (prog && Array.isArray(prog.weeks) && prog.weeks.length) {
          context += `  Semanas: ${prog.weeks.length}. `;
          if (prog.columns && prog.columns.length) context += `Fertilizantes/materias: ${prog.columns.map(c => c.name || c.materialId || '?').join(', ')}\n`;
          else context += '\n';
        } else context += '  Sin programa de semanas guardado.\n';
        context += 'Subsección Gráficas: visualización de aportes vs requerimiento por nutriente.\n';
        context += '\n';
      }
      // BLOQUES EN VIVO FERTIRRIEGO (pantalla actual: subsección activa, cultivo, rendimiento, tabla requerimiento)
      if (snapshot.module === 'fertirriego') {
        const liveFerti = this.getLiveFertirriegoBlocks();
        if (liveFerti.cultivo || liveFerti.rendimiento || liveFerti.tableSummary || liveFerti.subsection) {
          context += '--- BLOQUES FERTIRRIEGO (PANTALLA ACTUAL) ---\n';
          if (liveFerti.subsection) context += `Subsección visible: ${liveFerti.subsection}\n`;
          context += `Cultivo en pantalla: ${liveFerti.cultivo || '—'}\n`;
          context += `Rendimiento objetivo en pantalla: ${liveFerti.rendimiento || '—'} ton/ha\n`;
          if (liveFerti.tableSummary) context += `Tabla Requerimiento Nutricional (valores visibles):\n${liveFerti.tableSummary}\n`;
          context += '\n';
        }
      }

      // --- Hidroponía (Solución por etapa + Cálculo de fertilizantes) ---
      const hydro = project.hidroponia || (project.sections && project.sections.hidroponia);
      if (hydro) {
        context += '--- HIDROPONÍA (Solución por etapa + Cálculo de fertilizantes) ---\n';
        context += 'Subsección Solución por etapa: etapas con objetivo meq/L y ppm; triángulo de equivalentes.\n';
        if (Array.isArray(hydro.stages) && hydro.stages.length) {
          context += `Etapas (guardado): ${hydro.stages.map(s => s.name || s.id || '—').join(', ')}\n`;
          const active = hydro.stages.find(s => s.id === (hydro.activeStageId || hydro.stages[0]?.id));
          if (active && active.ppm && typeof active.ppm === 'object') {
            const ppm = Object.entries(active.ppm).filter(([, v]) => v != null && Number(v) !== 0).map(([k, v]) => `${k}:${v}`).slice(0, 12).join(', ');
            if (ppm) context += `Objetivo ppm (etapa activa): ${ppm}\n`;
          }
        }
        context += 'Subsección Cálculo de fertilizantes: objetivo (ppm), análisis de agua (ppm), requerimiento total (ppm), volumen, tanque, inyección, fertilizantes.\n';
        if (hydro.volumeWaterM3 != null) context += `Volumen agua: ${hydro.volumeWaterM3} m³; `;
        if (hydro.tankVolumeL != null) context += `Tanque: ${hydro.tankVolumeL} L; `;
        if (hydro.injectionRateLperM3 != null) context += `Relación inyección: ${hydro.injectionRateLperM3} L/m³\n`;
        if (Array.isArray(hydro.fertilizers) && hydro.fertilizers.length) {
          context += `Fertilizantes (${hydro.fertilizers.length}): ${hydro.fertilizers.map(f => (f.name || f.materialId || '?') + (f.dose != null ? ` ${f.dose}` : '')).join('; ')}\n`;
          if (hydro.fertilizerTotalsPpm && typeof hydro.fertilizerTotalsPpm === 'object') {
            const ppm = Object.entries(hydro.fertilizerTotalsPpm).filter(([, v]) => v && Number(v) !== 0).map(([k, v]) => `${k}: ${v}`).join(', ');
            if (ppm) context += `Totales aporte (ppm): ${ppm}\n`;
          }
        }
        context += '\n';
      }
      // BLOQUES EN VIVO HIDROPONÍA (pantalla actual: subsección, volumen/tanque/inyección, objetivo/agua/requerimiento)
      if (snapshot.module === 'hidroponia') {
        const liveHydro = this.getLiveHidroponiaBlocks();
        if (liveHydro.subsection || liveHydro.volume || liveHydro.objectiveSummary || liveHydro.waterSummary || liveHydro.missingSummary) {
          context += '--- BLOQUES HIDROPONÍA (PANTALLA ACTUAL) ---\n';
          if (liveHydro.subsection) context += `Subsección visible: ${liveHydro.subsection}\n`;
          if (liveHydro.volume) context += `Volumen/tanque/inyección: ${liveHydro.volume}\n`;
          if (liveHydro.objectiveSummary) context += `Objetivo de solución (ppm): ${liveHydro.objectiveSummary}\n`;
          if (liveHydro.waterSummary) context += `Análisis de agua (ppm): ${liveHydro.waterSummary}\n`;
          if (liveHydro.missingSummary) context += `Requerimiento total (ppm): ${liveHydro.missingSummary}\n`;
          context += '\n';
        }
      }

      // --- Reportes (generar y gestionar reportes PDF) ---
      if (snapshot.module === 'reportes') {
        context += '--- REPORTES (generar y gestionar reportes PDF) ---\n';
        context += 'Esta pestaña sirve para generar y gestionar reportes PDF del proyecto actual. Acciones: "Generar Nuevo Reporte PDF" (o desde la sección de enmiendas). Cada reporte puede incluir: Ubicación, Enmiendas, Nutrición granular, Fertirriego, Hidroponía, VPD. Los reportes se guardan y se sincronizan a la nube.\n';
        const liveReportes = this.getLiveReportesBlocks();
        if (liveReportes.hasNoReportsMessage) {
          context += 'En pantalla: No hay reportes generados aún. El usuario puede generar el primer reporte desde aquí o desde la sección de enmiendas.\n';
        } else if (liveReportes.reportCount > 0) {
          context += `Reportes generados en pantalla: ${liveReportes.reportCount}. `;
          if (liveReportes.reportTitles.length) context += `Títulos: ${liveReportes.reportTitles.slice(0, 10).join('; ')}${liveReportes.reportTitles.length > 10 ? '...' : ''}. `;
          context += 'Cada reporte tiene Descargar (PDF) y Eliminar.\n';
        }
        context += '\n';
      }

      // --- Análisis (Análisis de Suelo y otras subpestañas: Solución Nutritiva, Extracto de Pasta, Agua, Foliar, Fruta) ---
      if (snapshot.module === 'analisis') {
        context += '--- ANÁLISIS (pestaña actual) ---\n';
        context += 'El usuario está en la sección Análisis. Subpestañas: Análisis de Suelo, Solución Nutritiva, Extracto de Pasta, Agua, Foliar (DOP), Fruta (ICC). Los datos de suelo (CIC, cationes, fertilidad) se usan en Enmienda y en el diagnóstico general.\n';
        const liveSuelo = this.getLiveAnalisisSueloBlocks();
        if (liveSuelo.visible) {
          if (liveSuelo.reportTitles.length === 0) {
            context += 'Análisis de Suelo en pantalla: lista "Reportes en este proyecto" vacía; el usuario puede usar "+ Agregar análisis" para crear el primer reporte.\n';
          } else {
            context += `Análisis de Suelo en pantalla: ${liveSuelo.reportTitles.length} reporte(s): ${liveSuelo.reportTitles.slice(0, 15).join('; ')}${liveSuelo.reportTitles.length > 15 ? '...' : ''}. `;
            if (liveSuelo.currentId && liveSuelo.currentTitle) {
              context += `Reporte seleccionado: "${liveSuelo.currentTitle}"${liveSuelo.currentDate ? ` (${liveSuelo.currentDate})` : ''}. `;
              if (liveSuelo.physical && liveSuelo.physical.texturalClass) context += `Clase textural: ${liveSuelo.physical.texturalClass}. `;
              if (liveSuelo.ph && liveSuelo.ph.ph !== '') context += `pH (1:2 agua): ${liveSuelo.ph.ph}. `;
              if (liveSuelo.fertilitySummary && Object.keys(liveSuelo.fertilitySummary).length) {
                const f = liveSuelo.fertilitySummary;
                context += `Fertilidad (laboratorio): ${f.mo != null ? 'MO% ' + f.mo : ''}${f.p != null ? ', P ' + f.p + ' ppm' : ''}${f.k != null ? ', K ' + f.k + ' ppm' : ''}. `;
              }
            }
            context += 'Cada reporte tiene Propiedades físicas, pH y salinidad, Fertilidad del suelo (nivel e ideal).\n';
          }
        }
        const liveSolucionNutritiva = this.getLiveSolucionNutritivaBlocks();
        if (liveSolucionNutritiva.visible) {
          if (liveSolucionNutritiva.reportTitles.length === 0) {
            context += 'Solución Nutritiva en pantalla: lista "Reportes en este proyecto" vacía; el usuario puede usar "+ Agregar análisis" para crear el primer reporte.\n';
          } else {
            context += `Solución Nutritiva en pantalla: ${liveSolucionNutritiva.reportTitles.length} reporte(s): ${liveSolucionNutritiva.reportTitles.slice(0, 15).join('; ')}${liveSolucionNutritiva.reportTitles.length > 15 ? '...' : ''}. `;
            if (liveSolucionNutritiva.currentId && liveSolucionNutritiva.currentTitle) {
              context += `Reporte seleccionado: "${liveSolucionNutritiva.currentTitle}"${liveSolucionNutritiva.currentDate ? ` (${liveSolucionNutritiva.currentDate})` : ''}. `;
              if (liveSolucionNutritiva.general) {
                const g = liveSolucionNutritiva.general;
                const parts = [];
                if (g.ce != null) parts.push(`CE: ${g.ce} dS/m`);
                if (g.ph != null) parts.push(`pH: ${g.ph}`);
                if (g.ras != null) parts.push(`RAS: ${g.ras}`);
                if (parts.length) context += parts.join(', ') + '. ';
              }
              if (liveSolucionNutritiva.cationsSummary && Object.keys(liveSolucionNutritiva.cationsSummary).length) {
                const c = liveSolucionNutritiva.cationsSummary;
                context += `Cationes (ppm): ${c.k != null ? 'K ' + c.k : ''}${c.ca != null ? (c.k ? ', ' : '') + 'Ca ' + c.ca : ''}. `;
              }
              if (liveSolucionNutritiva.anionsSummary && liveSolucionNutritiva.anionsSummary.no3 != null) {
                context += `NO3: ${liveSolucionNutritiva.anionsSummary.no3} ppm. `;
              }
            }
            context += 'Cada reporte tiene Características generales (CE, pH, RAS), Cationes, Aniones y Micronutrimentos (con ref. e ideal).\n';
          }
        }
        const liveExtractoPasta = this.getLiveExtractoPastaBlocks();
        if (liveExtractoPasta.visible) {
          if (liveExtractoPasta.reportTitles.length === 0) {
            context += 'Extracto de Pasta en pantalla: lista "Reportes en este proyecto" vacía; el usuario puede usar "+ Agregar análisis" para crear el primer reporte.\n';
          } else {
            context += `Extracto de Pasta en pantalla: ${liveExtractoPasta.reportTitles.length} reporte(s): ${liveExtractoPasta.reportTitles.slice(0, 15).join('; ')}${liveExtractoPasta.reportTitles.length > 15 ? '...' : ''}. `;
            if (liveExtractoPasta.currentId && liveExtractoPasta.currentTitle) {
              context += `Reporte seleccionado: "${liveExtractoPasta.currentTitle}"${liveExtractoPasta.currentDate ? ` (${liveExtractoPasta.currentDate})` : ''}. `;
              if (liveExtractoPasta.general) {
                const g = liveExtractoPasta.general;
                const parts = [];
                if (g.ce != null) parts.push(`CE: ${g.ce} dS/m`);
                if (g.ras != null) parts.push(`RAS: ${g.ras}`);
                if (g.phe != null) parts.push(`pH: ${g.phe}`);
                if (parts.length) context += parts.join(', ') + '. ';
              }
              if (liveExtractoPasta.cationsSummary && Object.keys(liveExtractoPasta.cationsSummary).length) {
                const c = liveExtractoPasta.cationsSummary;
                context += `Cationes (ppm): ${c.k != null ? 'K ' + c.k : ''}${c.ca != null ? (c.k ? ', ' : '') + 'Ca ' + c.ca : ''}. `;
              }
              if (liveExtractoPasta.anionsSummary && liveExtractoPasta.anionsSummary.no3 != null) {
                context += `NO3: ${liveExtractoPasta.anionsSummary.no3} ppm. `;
              }
            }
            context += 'Cada reporte tiene CE/RAS/pH, Cationes, Aniones, Micronutrimentos y Relación nutrimental (ratios NO3/K, K/Ca, K/Mg, Ca/Mg, Ca/Na).\n';
          }
        }
        const liveAgua = this.getLiveAguaBlocks();
        if (liveAgua.visible) {
          if (liveAgua.reportTitles.length === 0) {
            context += 'Análisis de Agua en pantalla: lista "Reportes en este proyecto" vacía; el usuario puede usar "+ Agregar análisis" para crear el primer reporte.\n';
          } else {
            context += `Análisis de Agua en pantalla: ${liveAgua.reportTitles.length} reporte(s): ${liveAgua.reportTitles.slice(0, 15).join('; ')}${liveAgua.reportTitles.length > 15 ? '...' : ''}. `;
            if (liveAgua.currentId && liveAgua.currentTitle) {
              context += `Reporte seleccionado: "${liveAgua.currentTitle}"${liveAgua.currentDate ? ` (${liveAgua.currentDate})` : ''}. `;
              if (liveAgua.m3Riego) context += `m³ agua de riego: ${liveAgua.m3Riego}. `;
              if (liveAgua.general) {
                const g = liveAgua.general;
                const parts = [];
                if (g.ce != null) parts.push(`CE: ${g.ce} dS/m`);
                if (g.ras != null) parts.push(`RAS: ${g.ras}`);
                if (g.ph != null) parts.push(`pH: ${g.ph}`);
                if (parts.length) context += parts.join(', ') + '. ';
              }
              if (liveAgua.cationsSummary && Object.keys(liveAgua.cationsSummary).length) {
                const c = liveAgua.cationsSummary;
                context += `Cationes (ppm): ${c.k != null ? 'K ' + c.k : ''}${c.ca != null ? (c.k ? ', ' : '') + 'Ca ' + c.ca : ''}. `;
              }
              if (liveAgua.anionsSummary && liveAgua.anionsSummary.no3 != null) {
                context += `NO3: ${liveAgua.anionsSummary.no3} ppm. `;
              }
            }
            context += 'Cada reporte tiene m³ riego, CE/RAS/pH, Cationes (kg elemento y óxido), Aniones (kg elemento), Micronutrimentos y Ácido para neutralizar HCO3/CO3.\n';
          }
        }
        const liveFoliar = this.getLiveFoliarBlocks();
        if (liveFoliar.visible) {
          if (liveFoliar.reportTitles.length === 0) {
            context += 'Análisis Foliar (DOP) en pantalla: lista "Reportes en este proyecto" vacía; el usuario puede usar "+ Agregar análisis" para crear el primer reporte.\n';
          } else {
            context += `Análisis Foliar (DOP) en pantalla: ${liveFoliar.reportTitles.length} reporte(s): ${liveFoliar.reportTitles.slice(0, 15).join('; ')}${liveFoliar.reportTitles.length > 15 ? '...' : ''}. `;
            if (liveFoliar.currentId && liveFoliar.currentTitle) {
              context += `Reporte seleccionado: "${liveFoliar.currentTitle}"${liveFoliar.currentDate ? ` (${liveFoliar.currentDate})` : ''}. `;
              if (liveFoliar.macrosSummary && Object.keys(liveFoliar.macrosSummary).length) {
                const m = liveFoliar.macrosSummary;
                const parts = [];
                if (m.N != null) parts.push(`N ${m.N}%`);
                if (m.P != null) parts.push(`P ${m.P}%`);
                if (m.K != null) parts.push(`K ${m.K}%`);
                if (parts.length) context += `Macros (% MS): ${parts.join(', ')}. `;
              }
              if (liveFoliar.microsSummary && Object.keys(liveFoliar.microsSummary).length) {
                const u = liveFoliar.microsSummary;
                const parts = [];
                if (u.Fe != null) parts.push(`Fe ${u.Fe}`);
                if (u.B != null) parts.push(`B ${u.B}`);
                if (parts.length) context += `Micros (mg/kg): ${parts.join(', ')}. `;
              }
            }
            context += 'Cada reporte tiene Macronutrientes (% MS) y Micronutrimentos (mg/kg) con Resultado, Óptimo editable, DOP y Estado (regla 🟢🔶🟠🔴).\n';
          }
        }
        const liveFruta = this.getLiveFrutaBlocks();
        if (liveFruta.visible) {
          if (liveFruta.reportTitles.length === 0) {
            context += 'Análisis de Fruta (ICC) en pantalla: lista "Reportes en este proyecto" vacía; el usuario puede usar "+ Agregar análisis" para crear el primer reporte.\n';
          } else {
            context += `Análisis de Fruta (ICC) en pantalla: ${liveFruta.reportTitles.length} reporte(s): ${liveFruta.reportTitles.slice(0, 15).join('; ')}${liveFruta.reportTitles.length > 15 ? '...' : ''}. `;
            if (liveFruta.currentId && liveFruta.currentTitle) {
              context += `Reporte seleccionado: "${liveFruta.currentTitle}"${liveFruta.currentDate ? ` (${liveFruta.currentDate})` : ''}. `;
              if (liveFruta.macrosSummary && Object.keys(liveFruta.macrosSummary).length) {
                const m = liveFruta.macrosSummary;
                const parts = [];
                if (m.N != null) parts.push(`N ${m.N}%`);
                if (m.K != null) parts.push(`K ${m.K}%`);
                if (parts.length) context += `Macros (%): ${parts.join(', ')}. `;
              }
              if (liveFruta.calidadSummary && liveFruta.calidadSummary.brix != null) {
                context += `°Brix: ${liveFruta.calidadSummary.brix}. `;
              }
            }
            context += 'Cada reporte tiene Macronutrientes, Micronutrimentos, Calidad de fruta (materia seca, °Brix, firmeza, acidez) y Calcio en fruta (Ca total, % soluble/ligado/insoluble), con ICC y Estado (regla 🟢🟡🟠🔴).\n';
          }
        }
        context += '\n';
      }

      // --- VPD (pestaña actual: Déficit de Presión de Vapor) ---
      if (snapshot.module === 'vpd') {
        context += '--- VPD (pestaña actual) ---\n';
        context += 'El usuario está en la pestaña Déficit de Presión de Vapor. Hay dos calculadoras: Ambiental Simple (temp. aire, humedad, "Obtener del Clima", "Calcular VPD") y Avanzada (temp. aire, humedad, modo Temperatura de Hoja o Radiación Solar, "Calcular VPD"); más historial de cálculos.\n';
        const liveVPD = this.getLiveVPDBlocks();
        if (liveVPD.visible) {
          if (!liveVPD.hasLocation) {
            context += 'En pantalla: no hay polígono en Ubicación; se muestra aviso para agregar polígono antes de usar la calculadora ambiental.\n';
          } else {
            if (liveVPD.envTemp || liveVPD.envHumidity) {
              context += `Calculadora Ambiental: Temp. aire ${liveVPD.envTemp || '—'} °C, Humedad ${liveVPD.envHumidity || '—'}%. `;
            }
            if (liveVPD.advAirTemp || liveVPD.advHumidity || liveVPD.leafTemp || liveVPD.solarRadiation) {
              context += `Calculadora Avanzada: Temp. aire ${liveVPD.advAirTemp || '—'} °C, Humedad ${liveVPD.advHumidity || '—'}%; modo ${liveVPD.mode === 'radiation' ? 'Radiación Solar' : 'Temperatura de Hoja'}`;
              if (liveVPD.mode === 'radiation' && liveVPD.solarRadiation) context += `, Radiación ${liveVPD.solarRadiation} W/m²`;
              else if (liveVPD.mode === 'leaf' && liveVPD.leafTemp) context += `, T hoja ${liveVPD.leafTemp} °C`;
              context += '.\n';
            } else {
              context += 'Calculadora Avanzada: valores sin rellenar o por defecto.\n';
            }
          }
        }
        context += '\n';
      }

      // --- VPD (datos guardados del proyecto) ---
      if (project.vpdAnalysis && typeof project.vpdAnalysis === 'object') {
        const vpd = project.vpdAnalysis;
        const calc = vpd.calculations || {};
        const env = vpd.environmental || {};
        const adv = vpd.advanced || {};
        const temp = vpd.temperature || {};
        const hum = vpd.humidity || {};
        if (calc.vpd != null || env.vpd != null || adv.vpd != null) {
          context += '--- DÉFICIT DE PRESIÓN DE VAPOR (datos guardados) ---\n';
          if (calc.vpd != null) context += `VPD calculado: ${calc.vpd} kPa\n`;
          if (env.vpd != null) context += `VPD ambiental: ${env.vpd}\n`;
          if (adv.vpd != null) context += `VPD (avanzado): ${adv.vpd}\n`;
          if (temp.air != null || temp.leaf != null) context += `Temperatura: aire ${temp.air ?? '—'}, hoja ${temp.leaf ?? '—'} °C\n`;
          if (hum.air != null) context += `Humedad aire: ${hum.air}%\n`;
          if (calc.recommendation) context += `Recomendación: ${calc.recommendation}\n`;
          context += '\n';
        }
      }

      // --- Análisis guardados (reportes suelo, solución nutritiva, extracto pasta, agua, foliar, fruta) ---
      const summariseFoliar = (a) => {
        const mac = (a.macros && typeof a.macros === 'object') ? a.macros : {};
        const mic = (a.micros && typeof a.micros === 'object') ? a.micros : {};
        const m = ['N','P','K','Ca','Mg','S'].map(n => (mac[n] != null && mac[n] !== '') ? `${n}:${mac[n]}` : null).filter(Boolean).join(', ');
        const i = ['Fe','Mn','Zn','Cu','B','Mo'].map(n => (mic[n] != null && mic[n] !== '') ? `${n}:${mic[n]}` : null).filter(Boolean).join(', ');
        return (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '') + (m || i ? ` — Macros(%): ${m || '—'} | Micros(mg/kg): ${i || '—'}` : '');
      };
      const summariseExtractoPasta = (a) => {
        const g = (a.general && typeof a.general === 'object') ? a.general : {};
        const cat = (a.cations && typeof a.cations === 'object') ? a.cations : {};
        const an = (a.anions && typeof a.anions === 'object') ? a.anions : {};
        const parts = [];
        if (g.cee != null && g.cee !== '') parts.push(`CE:${g.cee}`);
        if (g.phe != null && g.phe !== '') parts.push(`pH:${g.phe}`);
        if (g.ras != null && g.ras !== '') parts.push(`RAS:${g.ras}`);
        if (cat.k_ppm != null && cat.k_ppm !== '') parts.push(`K:${cat.k_ppm}`);
        if (cat.ca_ppm != null && cat.ca_ppm !== '') parts.push(`Ca:${cat.ca_ppm}`);
        if (cat.mg_ppm != null && cat.mg_ppm !== '') parts.push(`Mg:${cat.mg_ppm}`);
        if (an.no3_ppm != null && an.no3_ppm !== '') parts.push(`NO3:${an.no3_ppm}`);
        return (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '') + (parts.length ? ' — ' + parts.join(', ') : '');
      };
      const summariseSoilReport = (a) => {
        const ph = (a.phSection && a.phSection.ph != null && a.phSection.ph !== '') ? a.phSection.ph : null;
        const fert = (a.fertility && typeof a.fertility === 'object') ? a.fertility : {};
        const cat = (a.cations && typeof a.cations === 'object') ? a.cations : {};
        const parts = [];
        if (ph != null) parts.push(`pH:${ph}`);
        if (fert.p != null && fert.p !== '') parts.push(`P:${fert.p}`);
        if (fert.k != null && fert.k !== '') parts.push(`K:${fert.k}`);
        if (fert.ca != null && fert.ca !== '') parts.push(`Ca:${fert.ca}`);
        if (fert.mg != null && fert.mg !== '') parts.push(`Mg:${fert.mg}`);
        if (cat.cic != null && cat.cic !== '') parts.push(`CIC:${cat.cic}`);
        return (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '') + (parts.length ? ' — ' + parts.join(', ') : '');
      };
      const summariseSolucionNutritiva = (a) => {
        const t = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '');
        const meq = (a.meqL && typeof a.meqL === 'object') ? a.meqL : {};
        const ppm = (a.ppm && typeof a.ppm === 'object') ? a.ppm : {};
        const keys = ['NO3','K','Ca','Mg','S','P'];
        const parts = keys.map(k => { const v = meq[k] || ppm[k] || meq[k.toLowerCase()] || ppm[k.toLowerCase()]; return (v != null && v !== '') ? `${k}:${v}` : null; }).filter(Boolean);
        return t + (parts.length ? ' — ' + parts.join(', ') : '');
      };

      if (Array.isArray(project.soilAnalyses) && project.soilAnalyses.length) {
        context += '--- ANÁLISIS DE SUELO (reportes) ---\n';
        project.soilAnalyses.forEach(a => { context += `• ${summariseSoilReport(a)}\n`; });
        context += '\n';
      }
      if (Array.isArray(project.solucionNutritivaAnalyses) && project.solucionNutritivaAnalyses.length) {
        context += '--- ANÁLISIS SOLUCIÓN NUTRITIVA ---\n';
        project.solucionNutritivaAnalyses.forEach(a => { context += `• ${summariseSolucionNutritiva(a)}\n`; });
        context += '\n';
      }
      if (Array.isArray(project.extractoPastaAnalyses) && project.extractoPastaAnalyses.length) {
        context += '--- ANÁLISIS EXTRACTO DE PASTA ---\n';
        project.extractoPastaAnalyses.forEach(a => { context += `• ${summariseExtractoPasta(a)}\n`; });
        context += '\n';
      }
      if (Array.isArray(project.aguaAnalyses) && project.aguaAnalyses.length) {
        context += '--- ANÁLISIS DE AGUA ---\n';
        project.aguaAnalyses.forEach(a => {
          const t = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '');
          context += `• ${t}\n`;
        });
        context += '\n';
      }
      if (Array.isArray(project.foliarAnalyses) && project.foliarAnalyses.length) {
        context += '--- ANÁLISIS FOLIAR (DOP) ---\n';
        project.foliarAnalyses.forEach(a => { context += `• ${summariseFoliar(a)}\n`; });
        context += '\n';
      }
      if (Array.isArray(project.frutaAnalyses) && project.frutaAnalyses.length) {
        context += '--- ANÁLISIS DE FRUTA ---\n';
        project.frutaAnalyses.forEach(a => {
          const t = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '');
          context += `• ${t}\n`;
        });
        context += '\n';
      }

      if (snapshot.signals && snapshot.signals.length) {
        context += '--- SEÑALES CRUZADAS ENTRE MÓDULOS ---\n';
        snapshot.signals.forEach(signal => {
          context += `• ${signal}\n`;
        });
        context += '\n';
      }

      context += '=== FIN DATOS DEL PROYECTO ===\n';
    } catch (error) {
      console.warn('⚠️ Error obteniendo contexto del proyecto:', error);
      context += 'Error al leer los datos del proyecto.\n';
    }
    return context;
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }
}

// Inicializar el chat inmediatamente
console.log('📄 chat-simple.js cargado');
console.log('🔍 typeof NutriPlantChat:', typeof NutriPlantChat);

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded - Inicializando chat simple...');
    try {
      window.nutriPlantChat = new NutriPlantChat();
      console.log('✅ Chat simple inicializado correctamente');
      console.log('🔍 window.nutriPlantChat existe:', !!window.nutriPlantChat);
      console.log('🔍 window.nutriPlantChat.toggleChat es función:', typeof window.nutriPlantChat.toggleChat);
    } catch (error) {
      console.error('❌ Error al inicializar chat simple:', error);
      console.error('❌ Stack:', error.stack);
    }
  });
} else {
  console.log('🚀 DOM ya cargado - Inicializando chat simple inmediatamente...');
  try {
    window.nutriPlantChat = new NutriPlantChat();
    console.log('✅ Chat simple inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar chat simple:', error);
    console.error('❌ Stack:', error.stack);
  }
}

// Exponer función de inicialización
window.initializeNutriPlantChat = function() {
  if (window.nutriPlantChat) {
    console.log('✅ Chat ya inicializado');
    return window.nutriPlantChat;
  }
  
  try {
    window.nutriPlantChat = new NutriPlantChat();
    console.log('✅ Chat inicializado bajo demanda');
    return window.nutriPlantChat;
  } catch (error) {
    console.error('❌ Error al inicializar:', error);
    return null;
  }
};

console.log('✅ chat-simple.js completamente cargado');





















