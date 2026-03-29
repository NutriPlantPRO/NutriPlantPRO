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
- Análisis de agua (riego): el RAS en NutriPlant es un campo manual (la app no lo calcula desde cationes). Si preguntan la fórmula: RAS = SAR = Na⁺ / √((Ca²⁺ + Mg²⁺)/2) con Na, Ca y Mg en meq/L.
- Solución nutritiva: macronutrientes en meq/L o ppm; rangos de referencia (ej. N 140–200, K 180–300 ppm) para comparar. Diagrama ternario: proporciones aniones (NO₃, H₂PO₄, SO₄) y cationes (K, Ca, Mg, NH₄) para evitar antagonismos y precipitados. NutriPlant usa rangos de referencia tipo Steiner para la zona de equilibrio: aniones NO3 20–80%, H2PO4 1.25–10%, SO4 10–70%; cationes K 10–65%, Ca 22.5–62.5%, Mg 0.5–40%.

Soluciones nutritivas de referencia (para consulta cuando el usuario pida referencias o compare con Hoagland/Steiner/otros): Hoagland (Hoagland & Arnon): cationes meq/L K ~6, Ca ~8, Mg ~2, NH₄ ~1; aniones meq/L NO₃ ~14–16, H₂PO₄ ~2, SO₄ ~2; micros ppm Fe 2–3, Mn 0.1–0.5, B 0.2–0.5, Zn 0.05–0.1, Cu 0.02–0.05, Mo 0.01–0.05. Steiner (Steiner 1961): cationes meq/L K ~6–7, Ca ~9, Mg ~4; aniones meq/L NO₃ ~12, H₂PO₄ ~1, SO₄ ~6–7; micros ppm Fe ~1–2, Mn ~0.5, B ~0.4, Zn/Cu en traza. Rangos típicos micros (varios autores) ppm: Fe 1–5, Mn 0.2–1, B 0.2–0.5, Zn 0.05–0.2, Cu 0.02–0.1, Mo 0.01–0.05. Son referencias “fuerza completa”; en práctica se usan diluciones según etapa y cultivo. Comparar con los datos del proyecto cuando el usuario pregunte. Al dar referencias o ideales, anclar siempre al mismo marco que el bloque del que preguntan (solución = ppm en solución; foliar = mg/kg en tejido; suelo = meq/100g; agua = meq/L).

6) VPD (DÉFICIT DE PRESIÓN DE VAPOR)
- VPD = presión de saturación a T_hoja − presión real de vapor. Afecta transpiración, absorción de Ca y estrés. Rangos típicos: 0.4–1.2 kPa óptimo según especie; <0.3 riesgo de edema; >1.5 estrés hídrico y cierre estomático. Se usa para programar riego y clima en invernadero.

7) CALCULADORAS NUTRIPLANT (ÓXIDO↔ELEMENTAL Y ppm↔mmol↔meq) — Alineado con la app
- Calculadora Conversión Óxido ↔ Elemental (misma estructura y factores que en la app): CaO→Ca ×0.715; Ca→CaO ×1.399. K₂O→K ×0.830; K→K₂O ×1.204. P₂O₅→P ×0.436; P→P₂O₅ ×2.291. MgO→Mg ×0.603; Mg→MgO ×1.658. S→SO₄ ×3.000; SO₄→S ×0.333. S→SO₃ ×2.497; SO₃→S ×0.400. Zn→ZnO ×1.245; ZnO→Zn ×0.803. SiO₂→Si ×0.468; Si→SiO₂ ×2.139. Usar exactamente estos factores al explicar conversiones de fertilizantes, enmiendas o análisis.
- Calculadora Unidades (meq/L ↔ ppm ↔ mmol/L) y Solución nutritiva NutriPlant: En NutriPlant la conversión meq/L ↔ ppm está hecha para que el resultado sea siempre **ppm del ELEMENTO** (ppm P, ppm S, ppm K, etc.), no del ion. Se usa el **peso equivalente del elemento** en esa forma: P-H₂PO₄⁻ → 31 (un equivalente lleva 1 P, peso atómico 31); S-SO₄²⁻ → 16 (un equivalente de SO₄ lleva medio S, 32.07/2 ≈ 16); N-NO₃⁻/NH₄⁺ → 14; K⁺ 39.1; Ca²⁺ 20.04; Mg²⁺ 12.15. Fórmula: ppm elemento = meq/L × peso equivalente. **Por qué así:** en agronomía y en etiquetas de fertilizantes se trabaja con concentración elemental (ppm P, ppm K); así el usuario ve directamente ppm del elemento y puede comparar con referencias y análisis sin convertir. La misma lógica aplica en la calculadora de conversión de la plataforma y en la pestaña Solución por etapa de Hidroponía. Para ppm ↔ mmol ↔ meq: mmol/L = ppm ÷ PM; meq/L = mmol/L × Valencia; al invertir, ppm = meq/L × (PM/Valencia) = meq/L × peso equivalente por elemento. Usar estos pesos equivalentes (N 14, P 31, S 16, K 39.1, Ca 20.04, Mg 12.15, etc.) para que coincida con la app.

8) DECISIONES AGRONÓMICAS (NIVEL EXPERTO)
- Priorizar diagnóstico: suelo → foliar → programa. Un solo análisis sin contexto puede llevar a sobrefertilizar o subfertilizar.
- Relaciones: Ca:Mg 3:1 a 6:1 en suelo; K/(Ca+Mg) en solución; NH₄/(NO₃+NH₄) <15–20% en fertirriego para evitar antagonismo con Ca.
- Momento y forma: nitrógeno en etapas de crecimiento activo; P al establecimiento; K en floración/cuaje; Ca vía suelo o foliar según disponibilidad; micronutrientes por foliar si suelo alcalino o con antagonismos.
- Siempre que des recomendaciones, apóyate en los datos concretos del proyecto (análisis, programa, cultivo) que tienes en el contexto.

9) SUSCRIPCIÓN Y CANCELACIÓN (NUTRIPLANT PRO)
- La suscripción a NutriPlant PRO se gestiona con PayPal. Para cancelar, el usuario debe entrar a su cuenta de PayPal, ir a la sección Pagos automáticos (o Automatic Payments) y cancelar la suscripción a NutriPlant desde ahí. No se cancela desde la app ni desde el panel de NutriPlant; es siempre desde PayPal. Si el usuario pide que le cancelemos por él o necesita ayuda para cancelar, indicar que puede contactar al equipo (soporte/WhatsApp según lo que tenga la plataforma) para asistencia.

10) ANÁLISIS DE SUELO — PESTAÑA FERTILIDAD (ORIGEN EXACTO DE "IDEAL (REFERENCIA)" EN NUTRIPLANT)
- CIC del reporte = suma en meq/100g de Ca+Mg+K+Na+Al+H ingresada en "Cationes intercambiables y CIC" del mismo análisis.
- K, Ca y Mg en ppm en la fila Ideal (valor por defecto de la app): meq ideal = CIC × (K 5 %, Mg 13 %, Ca 70 % de saturación sobre la CIC); ppm ideal = meq ideal × factor (K×391, Mg×121,5, Ca×200,4; factores de peso equivalente ×10, base 100 g suelo). Coincide con el cálculo interno de la plataforma.
- P (ppm) ideal: según método elegido en la tabla (Bray 40, Olsen 25, Merich/Mehlich 3 → 40 ppm por defecto).
- MO, N-NO3, Na, S, Fe, Mn, B, Zn, Cu, Mo, Al: ideales de referencias agronómicas generales fijas de NutriPlant (botón "Recargar valores ideales de referencia").
- La fila Ideal es editable: si el usuario la modificó, los números en pantalla pueden no coincidir con la fórmula; en ese caso explicar la fórmula por defecto pero interpretar con los valores guardados que aparecen en contexto.
- kg/ha (diferencia) = (nivel laboratorio − ideal) × 0,1 × profundidad (cm) × densidad aparente (g/cm³) × (% suelo explorado por raíces / 100); negativo = falta, positivo = exceso.
`;
}

/** Igual que dashboard.js (getSoilIdealByCIC): ppm ideales K, Ca, Mg desde CIC en meq/100g. */
function computeNutriPlantSoilKCaMgIdealPpmFromCic(cic) {
  const c = parseFloat(cic);
  if (isNaN(c) || c <= 0) return null;
  const r = (v) => Math.round(v * 10) / 10;
  return {
    k: r(c * 0.05 * 391),
    ca: r(c * 0.70 * 200.4),
    mg: r(c * 0.13 * 121.5)
  };
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
    this.refreshQuotaFromSupabase();
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
    this.refreshQuotaFromSupabase();
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
        // 🔑 Con proyecto: guardar por usuario+proyecto para que cada usuario vea solo su historial
        const chatKey = `nutriplant_chat_${userId}_${projectId}`;
        try {
          localStorage.setItem(chatKey, JSON.stringify({ chat_history: this.messages, updated_at: new Date().toISOString() }));
          console.log(`✅ Historial guardado (usuario+proyecto) - ${this.messages.length} mensajes`);
        } catch (e) { console.warn('⚠️ Error guardando chat:', e); }
        const projectKey = `nutriplant_project_${projectId}`;
        const projectData = localStorage.getItem(projectKey);
        if (projectData) {
          try {
            const project = JSON.parse(projectData);
            project.chat_history = this.messages;
            project.updated_at = new Date().toISOString();
            project.updatedAt = new Date().toISOString();
            localStorage.setItem(projectKey, JSON.stringify(project));
            if (typeof window.nutriplantSyncProjectToCloud === 'function') {
              try { window.nutriplantSyncProjectToCloud(projectId, project); } catch (err) { console.warn('Sync chat a nube:', err); }
            }
          } catch (parseError) {
            console.error('❌ Error parseando proyecto para guardar chat:', parseError);
          }
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
      const isUuidUser = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId || ''));
      
      if (projectId && userId) {
        // 🔑 Con proyecto: cargar por usuario+proyecto para que cada usuario vea solo su historial
        const chatKey = `nutriplant_chat_${userId}_${projectId}`;
        const chatData = localStorage.getItem(chatKey);
        if (chatData) {
          try {
            const parsed = JSON.parse(chatData);
            if (parsed.chat_history && Array.isArray(parsed.chat_history)) {
              this.messages = parsed.chat_history;
              console.log(`✅ Historial cargado (usuario+proyecto) - ${this.messages.length} mensajes`);
              this._renderLoadedMessages();
              return;
            }
          } catch (e) { console.warn('⚠️ Error leyendo chat por usuario:', e); }
        }
        const projectKey = `nutriplant_project_${projectId}`;
        const projectData = localStorage.getItem(projectKey);
        if (projectData) {
          try {
            const project = JSON.parse(projectData);
            if (project.chat_history && Array.isArray(project.chat_history)) {
              this.messages = project.chat_history;
              localStorage.setItem(chatKey, JSON.stringify({ chat_history: this.messages, updated_at: new Date().toISOString() }));
              console.log(`✅ Historial migrado a clave por usuario (${this.messages.length} mensajes)`);
              this._renderLoadedMessages();
              return;
            }
          } catch (parseError) { console.error('❌ Error parseando proyecto para cargar chat:', parseError); }
        }
        // 🔑 Cloud fallback (multi-equipo): si local no tiene chat, intentar traer proyecto desde Supabase.
        if (isUuidUser && typeof window.nutriplantSupabaseProjects !== 'undefined' && typeof window.nutriplantSupabaseProjects.fetchProject === 'function') {
          try {
            const cloudProject = await window.nutriplantSupabaseProjects.fetchProject(projectId);
            const cloudChat = cloudProject && Array.isArray(cloudProject.chat_history) ? cloudProject.chat_history : null;
            if (cloudChat && cloudChat.length > 0) {
              this.messages = cloudChat;
              try {
                localStorage.setItem(chatKey, JSON.stringify({ chat_history: cloudChat, updated_at: new Date().toISOString() }));
              } catch (e) {}
              try {
                const projectKey = `nutriplant_project_${projectId}`;
                const rawProject = localStorage.getItem(projectKey);
                const localProject = rawProject ? JSON.parse(rawProject) : { id: projectId };
                localProject.chat_history = cloudChat;
                if (cloudProject.updated_at || cloudProject.updatedAt) {
                  localProject.updated_at = cloudProject.updated_at || cloudProject.updatedAt;
                  localProject.updatedAt = cloudProject.updated_at || cloudProject.updatedAt;
                }
                localStorage.setItem(projectKey, JSON.stringify(localProject));
              } catch (e) {}
              console.log(`☁️ Historial chat cargado desde nube (${cloudChat.length} mensajes)`);
              this._renderLoadedMessages();
              return;
            }
          } catch (cloudErr) {
            console.warn('⚠️ Error cargando chat del proyecto desde nube:', cloudErr);
          }
        }
        this.messages = [];
        this._renderLoadedMessages();
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
      this._renderLoadedMessages();
    } catch (error) {
      console.warn('⚠️ Error cargando historial de chat:', error);
      this.messages = [];
      this._renderLoadedMessages();
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

  /** Actualiza en el header el texto de cuota por créditos (ej. 490/500). */
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
      let limitRaw = user.chat_limit_monthly;
      const hasAccess = user.subscription_status === 'active' || (user.subscription_status === 'cancelled' && user.cancelled_by_admin !== true && user.next_payment_date && new Date() <= new Date(user.next_payment_date + 'T23:59:59'));
      const isActiveSubscriber = hasAccess;
      if ((limitRaw == null || limitRaw === '' || limitRaw === -1) && isActiveSubscriber) limitRaw = 500;
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      let used = user.chat_usage_current_month;
      const usageMonth = user.chat_usage_month || '';
      if (usageMonth !== currentMonth) used = 0;
      used = Number(used) || 0;
      if (limitRaw === -1 || (limitRaw == null || limitRaw === '')) {
        el.textContent = 'Chat: Ilimitado';
        el.style.display = 'block';
        return;
      }
      const limit = Math.max(0, Number(limitRaw));
      if (limit === 0) { el.style.display = 'none'; return; }
      const remaining = Math.max(0, Math.floor(limit - used));
      el.textContent = `Chat: ${remaining}/${Math.floor(limit)} créditos mensuales`;
      el.style.display = 'block';
    } catch (e) {
      el.style.display = 'none';
    }
  }

  /** Refresca límite y uso de créditos desde Supabase (para ver cambios hechos en admin sin cerrar sesión). */
  async refreshQuotaFromSupabase() {
    try {
      const userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) return;
      const client = typeof window.getSupabaseClient === 'function' ? window.getSupabaseClient() : null;
      if (!client) return;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
      if (!isUuid) return;
      const userKey = `nutriplant_user_${userId}`;
      const raw = localStorage.getItem(userKey);
      if (!raw || !raw.startsWith('{')) return;
      const user = JSON.parse(raw);
      const { data, error } = await client
        .from('profiles')
        .select('chat_limit_monthly, chat_usage_current_month, chat_usage_month')
        .eq('id', userId)
        .maybeSingle();
      if (error || !data) return;
      user.chat_limit_monthly = data.chat_limit_monthly != null ? data.chat_limit_monthly : null;
      user.chat_usage_current_month = data.chat_usage_current_month != null ? data.chat_usage_current_month : 0;
      user.chat_usage_month = data.chat_usage_month != null ? data.chat_usage_month : null;
      localStorage.setItem(userKey, JSON.stringify(user));
      this.updateChatQuotaDisplay();
    } catch (e) {
      console.warn('⚠️ No se pudo refrescar créditos desde Supabase:', e);
    }
  }

  /** Comprueba si el usuario puede usar el chat (no bloqueado, bajo límite mensual). */
  checkUserChatAllowed(hasImage = false) {
    try {
      const userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) return { allowed: true };
      const userKey = `nutriplant_user_${userId}`;
      const raw = localStorage.getItem(userKey);
      if (!raw) return { allowed: true };
      const user = JSON.parse(raw);
      if (user.chat_blocked === true) return { allowed: false, message: 'El chat con la IA está deshabilitado para tu cuenta. Contacta al administrador si necesitas activarlo.' };
      const hasAccess = user.subscription_status === 'active' || (user.subscription_status === 'cancelled' && user.cancelled_by_admin !== true && user.next_payment_date && new Date() <= new Date(user.next_payment_date + 'T23:59:59'));
      let rawLimit = user.chat_limit_monthly;
      if ((rawLimit == null || rawLimit === '' || rawLimit === -1) && hasAccess) rawLimit = 500;
      if (rawLimit === -1 || rawLimit == null || rawLimit === '') return { allowed: true };
      const limit = parseInt(rawLimit, 10);
      if (limit === 0) return { allowed: false, message: 'No tienes chats disponibles este mes. Contacta al administrador si necesitas activarlo.' };
      if (isNaN(limit) || limit < 0) return { allowed: true };
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      let usage = user.chat_usage_current_month || 0;
      const usageMonth = user.chat_usage_month || '';
      if (usageMonth !== currentMonth) { usage = 0; }
      const requiredCredits = hasImage ? 3 : 1;
      if ((usage + requiredCredits) > limit) return { allowed: false, message: '⚠️ Has alcanzado el límite mensual de créditos. Se renuevan al inicio del próximo mes.' };
      return { allowed: true };
    } catch (e) {
      return { allowed: true };
    }
  }

  /** Incrementa uso mensual en créditos (texto=1, web=2, imagen=3). Si creditsUsed viene en la respuesta del backend, se usa ese valor. */
  incrementUserChatUsage(hasImage = false, creditsUsedFromBackend = null) {
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
      const creditsToAdd = creditsUsedFromBackend != null && creditsUsedFromBackend >= 0
        ? creditsUsedFromBackend
        : (hasImage ? 3 : 1);
      user.chat_usage_current_month = (user.chat_usage_current_month || 0) + creditsToAdd;
      localStorage.setItem(userKey, JSON.stringify(user));
    } catch (e) {
      console.warn('⚠️ Error incrementando uso de chat:', e);
    }
  }

  async sendMessage() {
    const message = (this.input && this.input.value) ? this.input.value.trim() : '';
    const hasImage = this.pendingImage != null;
    if (!message && !hasImage) return;

    const check = this.checkUserChatAllowed(hasImage);
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
      
      const creditsUsed = this._lastCreditsUsed != null ? this._lastCreditsUsed : (hasImage ? 3 : 1);
      this.incrementUserChatUsage(hasImage, creditsUsed);
      this._lastCreditsUsed = null;
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
- Inicio es la pantalla central de NutriPlant PRO: muestra los proyectos del usuario (tarjetas) y desde aquí se crea, abre, edita, duplica o elimina un proyecto. El proyecto activo (el que se abre) es el que se usa en todas las pestañas del dashboard.
- Cómo crear un proyecto (pasos para explicar al usuario): (1) En la barra superior, pulsar el botón "+ Nuevo NutriPlant". (2) Se crea una nueva tarjeta o se abre el formulario de nuevo proyecto; el usuario debe completar al menos el nombre y, si desea, cultivo, variedad y campo/sector. (3) Guardar el proyecto; a partir de ahí ese proyecto queda en la lista y puede abrirlo para trabajar. Si el usuario no tiene proyectos aún, guíalo a usar "+ Nuevo NutriPlant" para crear el primero y opcionalmente indicar que después de crearlo puede "Abrir" para empezar a llenar Ubicación, Enmienda, etc.
- Acciones en cada tarjeta de proyecto: Abrir (carga ese proyecto como activo y permite usar las pestañas Ubicación, Enmienda, Nutrición Granular, Fertirriego, Hidroponía, Análisis, VPD, Reportes); Editar (cambiar nombre, cultivo, variedad, campo/sector); Duplicar (copia del proyecto, útil para variantes o nueva temporada); Eliminar (borra el proyecto y sus reportes en la nube si está conectado).
- Arquitectura NutriPlant PRO (para explicar cómo interactuar): Inicio = centro de proyectos. Una vez que el usuario abre un proyecto, la barra de pestañas permite ir a: Ubicación (polígono del predio), Enmienda (CIC y enmiendas cálcicas), Nutrición Granular (requerimiento + programa aplicaciones), Fertirriego (requerimiento + programa por semanas/meses + gráficas), Hidroponía (solución por etapa + cálculo de fertilizantes), Análisis (suelo, foliar, agua, solución nutritiva, extracto de pasta, fruta), VPD (calculadoras déficit de presión de vapor), Reportes (generar PDF). Cada pestaña trabaja con los datos del proyecto activo; no hay que crear proyecto por cada pestaña. Si preguntan "por dónde empiezo", sugiere: crear/abrir proyecto en Inicio → luego Ubicación si tendrá mapa, Enmienda si tiene análisis de suelo, o la pestaña que corresponda a su objetivo (granular, fertirriego, hidroponía, etc.).`,
      enmienda: `
- Enmienda usa los datos del "Análisis de Suelo Inicial" (cationes en meq/100g, CIC, pH, densidad aparente, profundidad). NO confundir con la pestaña Análisis de Suelo (reportes): son orígenes distintos; el usuario puede tener valores diferentes entre este bloque y los reportes de esa pestaña.
- Lógica de % de cada catión: % catión = (meq del catión / CIC total) × 100. Rangos de referencia NutriPlant: K 3–7%, Ca 65–75%, Mg 10–15%, Na <1%. Con eso se evalúa si el suelo está bajo, alto o en rango.
- Ajuste en meq: la calculadora obtiene "meq a ajustar" = valor ideal − valor actual (por catión). NutriPlant SUGIERE esos valores (ideales según CIC); el usuario PUEDE MODIFICAR los campos "meq a ajustar" (K, Ca, Mg, H, Na, Al) antes de calcular. El asistente recibe en contexto los valores actuales de meq a ajustar (sugeridos o editados por el usuario) y los usa para interpretar.
- Enmiendas disponibles: el asistente ve la tabla de enmiendas (nombre, %K, %Ca, %Mg, %SO4 y cuál está seleccionada). Si el usuario edita una enmienda o agrega una nueva personalizada a su catálogo, eso se refleja en "Enmiendas Disponibles" y en "Enmiendas personalizadas"; el chat debe notarlo y usar esos datos.
- % suelo explorado por raíces: fracción del volumen de suelo (en %) que las raíces exploran; la dosis de enmienda (kg/ha) se reparte en ese volumen. Concepto: depende de profundidad, densidad aparente y tipo de cultivo; con pH, densidad y profundidad del proyecto el asistente puede dar retroalimentación o sugerencias si el usuario pregunta.
- Resultado del cálculo: el asistente ve la enmienda seleccionada, los valores usados para el cálculo (meq a ajustar, % suelo explorado) y los resultados obtenidos: tipo de enmienda, cantidad (kg/ha), aportes (p. ej. Ca²⁺, SO₄²⁻). Priorizar la línea "Resultado en pantalla (prioridad alta)" cuando exista.
- Regla de signo: meq a ajustar >0 subir ese catión; <0 bajar. Priorizar correcciones que reducen riesgos de Na alto y desbalance catiónico.`,
      fertirriego: `
- Fertirriego tiene tres subsecciones y la información está relacionada entre sí: (1) Requerimiento Nutricional: tabla con Extracción por tonelada (kg/ton), Extracción total (kg/ha), Ajuste por niveles en suelo, Eficiencia (%), Requerimiento real (kg/ha). Cultivo y rendimiento objetivo definen la extracción; misma lógica que granular. (2) Programa de Nutrición: programa por semanas o por meses (el usuario elige la unidad de tiempo); fertilizantes/materias y dosis; aporte del programa y aporte del agua; total (programa + agua). (3) Gráficas: visualización de aportes vs requerimiento por nutriente. Relación: el Requerimiento define la meta (kg/ha por nutriente); el Programa genera los aportes por etapa; las Gráficas comparan aporte vs requerimiento para ver si el programa cumple la meta. La eficiencia (%) y el ajuste por niveles en suelo son valores que el usuario configura; el chat los ve en contexto y aporta en base a la lógica de NutriPlant usando esos valores — no son reglas fijas, sino lo que el usuario tiene en su proyecto.
- En Fertirriego y en Granular la plataforma permite cambiar entre modo óxido (P₂O₅, K₂O, CaO, MgO, SO₄...) y modo elemental (P, K, Ca, Mg, S...); los valores y etiquetas que ves en contexto corresponden al modo en que el usuario tiene guardado el proyecto. En Fertirriego el programa puede ser por semana o por mes; el asistente recibe en contexto la unidad de tiempo (semana/mes) y el modo (óxido/elemental), además de semanas/meses, fertilizantes y aporte total del programa.
- En Fertirriego el usuario puede agregar cultivos personalizados y fertilizantes/materias personalizados; esos corresponden a la pestaña Fertirriego (cada módulo tiene su propia pestaña). El asistente recibe en contexto las semanas o meses, fertilizantes y aporte total del programa (kg/ha por nutriente), así que ve los resultados del programa de fertirriego.
- Contrastar requerimiento por extracción vs aporte real del suelo y agua. Validar semanas/meses, materiales y concentración para evitar sobredosis.`,
      granular: `
- Granular tiene dos subsecciones y la información está relacionada entre sí: (1) Requerimiento Nutricional: tabla con Extracción por tonelada (kg/ton), Extracción total (kg/ha), Ajuste por niveles en suelo, Eficiencia (%), Requerimiento real (kg/ha). Cultivo y rendimiento objetivo definen la extracción; la lógica es extracción total = extracción/ton × rendimiento; requerimiento real considera ajuste y eficiencia. (2) Programa: aplicaciones con dosis (kg/ha) y materiales (fertilizantes). La plataforma permite ver y trabajar en modo óxido (P₂O₅, K₂O, CaO, MgO...) o modo elemental (P, K, Ca, Mg...); los valores en contexto reflejan el modo del usuario. Cultivos y fertilizantes pueden ser predefinidos o personalizados; los que el usuario agrega corresponden a la pestaña Nutrición Granular (cada módulo tiene su propia pestaña). Relación: el Requerimiento define la meta (kg/ha por nutriente); el Programa son las aplicaciones (dosis y materiales) que deben cubrir esa meta. La eficiencia (%) y el ajuste por niveles en suelo son valores que el usuario configura en NutriPlant; el chat los ve en contexto (bloque del proyecto) y aporta en base a la lógica de NutriPlant usando esos valores — no son reglas fijas, sino lo que el usuario tiene definido en su proyecto. El asistente recibe en contexto la lista de aplicaciones granulares (título, dosis kg/ha, materiales), así que ve los resultados del programa de nutrición granular.
- Contrastar plan de K/Ca/Mg contra diagnóstico de suelo para evitar excesos.`,
      hidroponia: `
- Hidroponía tiene dos subsecciones y la información está relacionada entre sí: (1) Solución por etapa: definición de etapas y objetivo en meq/L y ppm por etapa; triángulo de equivalentes; suma N = NO3 + NH4. (2) Cálculo de fertilizantes: objetivo de solución (ppm), análisis de agua (ppm), requerimiento total (ppm) = objetivo − agua; volumen de agua (m³), tanque (L), relación inyección (L/m³); fertilizantes y dosis para cubrir el requerimiento. En Cálculo de fertilizantes el usuario dispone de un catálogo de fertilizantes disponibles (precargados en la plataforma + personalizados con concentración elemental %); puede agregar los que quiera al cálculo. El asistente recibe en contexto ese catálogo (nombre y % N_NH4, N_NO3, P, K, Ca, Mg, S) y la lista de fertilizantes ya añadidos al cálculo con sus dosis y aportes en ppm; debe usar ese contexto para recomendar, interpretar o explicar. Relación: Solución por etapa define la meta (objetivo ppm/meq por etapa); Cálculo de fertilizantes toma ese objetivo, resta el aporte del agua, obtiene el requerimiento total a cubrir con fertilizantes, y calcula dosis según volumen e inyección.
- Cálculo de fertilizantes (lógica que el chat debe dominar): (1) Objetivo (ppm por nutriente) viene de Solución por etapa; aporte del agua (ppm) del análisis de agua; requerimiento total = objetivo − aporte del agua (lo que hay que cubrir con fertilizantes). (2) Volumen: volumen de agua (m³) a fertirrigar, volumen del tanque (L) de solución concentrada, tasa de inyección (L de concentrado por m³ de agua). Volumen de concentrado necesario = volumen_agua_m³ × tasa_L/m³; número de recargas de tanque = techo(volumen_concentrado_L ÷ volumen_tanque_L); relación de inyección mostrada = 1:(1000 ÷ tasa). (3) Resultado por tanque: las cantidades que muestra la app (por Tanque A, B, C) son el total de cada fertilizante para todo el volumen de agua (sólidos en kg, líquidos en L); si hay varias recargas, también se muestra la cantidad por recarga. Fórmulas: aporte total en ppm (solución final) = suma por nutriente de (dosis en ppm producto × concentración elemental % ÷ 100). Para obtener kg de fertilizante sólido: kg = dosis (ppm producto) × volumen de agua (m³) ÷ 1000. Para líquidos (ej. ácidos): L = kg equivalente ÷ densidad (kg/L); si el usuario trabaja en modo "producto total" (L totales de ácido), la app convierte a ppm producto y aporte. (4) Dosis desde ppm objetivo: si el usuario fija "cuántos ppm de un elemento" quiere aportar con un fertilizante, dosis (ppm producto) = ppm_elemento_deseado × 100 ÷ %_elemental_del_fertilizante. (5) En hidroponía en NutriPlant todas las concentraciones de fertilizantes son en forma ELEMENTAL (%, ppm). Si el usuario tiene una etiqueta en óxidos (P₂O₅, K₂O, CaO, MgO) o duda de cómo obtener el % elemental, debe usar la calculadora de conversión óxido → elemental de la plataforma (o la fórmula: P = P₂O₅×0.436, K = K₂O×0.83, Ca = CaO×0.715, Mg = MgO×0.603). El asistente debe saber esta lógica, sugerir el uso de las calculadoras de conversión disponibles en la plataforma cuando el usuario pregunte por una fuente en óxido o por cómo pasar a elemental, y puede ayudar con el cálculo o explicar cómo se obtiene.
- Solución por etapa (Solución nutritiva): el asistente recibe en contexto toda la información que el usuario agrega: tablas meq/L, % meq y ppm por etapa (cuando está en esa subsección), resumen de nitrógeno (NO3+NH4) y texto del diagrama ternario. Lógica NutriPlant para %: Aniones (N-NO3, P-H2PO4, S-SO4): % = (meq del ion / suma meq de NO3+P+S) × 100. Cationes del triángulo (K, Ca, Mg): % = (meq / suma K+Ca+Mg) × 100. N-NH4: % = (meq NH4 / total cationes K+Ca+Mg+NH4) × 100; NH4 no entra al triángulo. Conversión meq → ppm en NutriPlant: se usa el peso equivalente del ELEMENTO para que el resultado sea ppm del elemento (ppm P, ppm S, etc.): P-H2PO4 → 31 (ppm P); S-SO4 → 16 (ppm S); N 14; K 39.1; Ca 20.04; Mg 12.15. Por qué: en agronomía y etiquetas se trabaja con concentración elemental; así el usuario ve ppm P, ppm S directamente y puede comparar con referencias. La calculadora de conversión meq/ppm de la plataforma usa la misma lógica. Diagrama ternario NutriPlant: dos triángulos (aniones y cationes). NutriPlant usa como referencia los rangos mín–máx (tipo Steiner) definidos en la plataforma. Aniones: NO3 (nitrato) 20–80%, H2PO4 (P) 1.25–10%, SO4 (S) 10–70%. Cationes: K 10–65%, Ca 22.5–62.5%, Mg 0.5–40%. Es decir, nitrato entre 20% y 80%; fosfato entre 1.25% y 10%; sulfato entre 10% y 70%; y en cationes K, Ca, Mg dentro de esos rangos. La zona de equilibrio (polígono amarillo en la app) es la intersección de esos límites; un punto DENTRO = equilibrio iónico adecuado (referencia Steiner), menor riesgo de antagonismos y precipitados; FUERA = desbalance, mayor riesgo de antagonismos o precipitados. Si el usuario pregunta por los máximos y mínimos o por Steiner, responde con estos valores exactos de NutriPlant. Si pregunta o cuestiona por qué está así (meq/ppm o triángulo), explica con esta lógica y el porqué (elemental para comparar con análisis/etiquetas; triángulo con rangos Steiner para visualizar equilibrio).
- Validar equilibrio catión/anión para evitar antagonismos y precipitados.`,
      analisis: `
- Análisis agrupa varias subpestañas: Análisis de Suelo, Solución Nutritiva, Extracto de Pasta, Agua, Foliar (DOP), Fruta (ICC). Análisis de Suelo: panel "Reportes en este proyecto" con "+ Agregar análisis"; cada reporte tiene título, fecha, Eliminar, y secciones: Propiedades físicas (densidad aparente, etc.), pH y salinidad, Fertilidad del suelo, Cationes intercambiables y CIC. Los datos de suelo se usan en Enmienda (CIC/cationes).
- Fertilidad del suelo (lógica que el chat debe entender): El usuario ingresa valores de laboratorio (Nivel) y la plataforma muestra Ideal (referencia) y kg/ha (diferencia). En kg/ha solo se considera el suelo que las raíces aprovechan en la profundidad indicada. Valores ideales: (1) K, Ca y Mg: desde la CIC del mismo análisis (sección Cationes), meq ideal = CIC × fracción (K 5 %, Mg 13 %, Ca 70 % de saturación) y ppm ideal = meq × factor (K ×391, Mg ×121,5, Ca ×200,4; factores de peso equivalente ×10 para base 100 g suelo). (2) P según método: Bray 40 ppm, Olsen 25 ppm, Merich (Mehlich 3) 40 ppm. (3) Resto (MO, N-NO3, Na, S, micronutrientes): referencias agronómicas generales (MO 3%, N-NO3 20 ppm, Na 0, S 15, Fe 20, Mn 20, Zn 3, Cu 1.5, B 1, Mo 0.1, Al 0). Cálculo kg/ha: factor = 0,1 × profundidad (cm) × densidad aparente (g/cm³) × (% suelo explorado por raíces / 100); kg/ha = (nivel laboratorio − ideal) × factor; negativo = déficit (falta aportar), positivo = exceso. Si el usuario pregunta de dónde salen los ideales: explicar esta fórmula (mismo texto que el párrafo "ORIGEN Ideal (referencia)" en DATOS DEL PROYECTO cuando está en Análisis > Suelo); en cada reporte suelen aparecer las claves fórmula_defecto_K/Ca/Mg_ppm (cálculo NutriPlant desde la CIC) e Ideal_ref_ppm (guardado); si difieren, el usuario editó la fila Ideal. Sirve al agronomista para equilibrar el programa de nutrición; el chat puede apoyar a llegar a la mejor conclusión interpretando déficits y excesos.
- Cationes intercambiables y CIC: meq/100g (Ca, Mg, K, Na, Al, H); CIC = suma. Saturación (%) = (meq catión / CIC) × 100. Como referencia de interpretación, rangos típicos en literatura: K 3–7%, Ca 65–75%, Mg 10–15%, Na 0–1%, Al 0–1%, H 0–10%. En NutriPlant, el ideal en ppm de K, Ca y Mg en la tabla de fertilidad se calcula con la CIC y objetivos fijos K 5 %, Mg 13 %, Ca 70 % más factores meq→ppm indicados en Fertilidad del suelo. Botón "Recargar valores ideales de referencia" aplica ideales generales y recalcula K, Ca, Mg desde CIC si existe.
- Solución Nutritiva (lógica que el chat debe entender): Cada reporte tiene valores de análisis (nivel/resultado en meq/L y ppm), rangos de referencia (ej. Ca 140–220, Mg 40–70, K 180–300, SO4 60–110, PO4 30–60, NO3 140–200 ppm; micronutrientes Fe 1.5–3, Mn 0.3–1, etc.) y una columna Ideal editable por el usuario. El usuario puede dejar el ideal vacío o definir su propio valor ideal por parámetro (distinto al rango de referencia). Diferencia = valor actual (nivel) − ideal; se muestra en la tabla: (−) falta (por debajo del ideal), (+) exceso (por encima del ideal). El chat debe ver tanto los valores que tiene el usuario como los ideales (los que haya guardado el usuario o referencia) e interpretar la diferencia para apoyar el diagnóstico y ajustes del programa de nutrición.
- Extracto de Pasta (lógica que el chat debe entender): Igual que Solución Nutritiva: cada reporte tiene nivel (meq/L y ppm), rangos de referencia (Ca 150–220, Mg 40–70, K 200–300, Na &lt;50, NO3 150–200, PO4 30–60, SO4 60–110, Cl &lt;70, HCO3 &lt;120, CO3 0 ppm; micronutrientes con ref.) e Ideal editable por el usuario. Diferencia = nivel − ideal; (−) falta, (+) exceso. El usuario puede agregar o cambiar ideales por parámetro; el chat debe usar los valores e ideales que tenga el reporte (por defecto o añadidos por el usuario) y entender la lógica de la diferencia para interpretar déficits y excesos. Además hay ratios (NO3/K, K/Ca, K/Mg, Ca/Mg, Ca/Na) con rangos ideales de referencia.
- Análisis de Agua: lista "Reportes en este proyecto" y "+ Agregar análisis"; por reporte: m³ agua de riego (volumen de referencia), título, fecha, Eliminar. Secciones: CE/RAS/pH, Cationes, Aniones, Micronutrimentos, Ácido para neutralizar. Conversión meq/L ↔ ppm automática; uso del agua en Fertirriego e Hidroponía para restar aporte del agua del requerimiento.
- Análisis de Agua — RAS / SAR (obligatorio si preguntan la fórmula): En NutriPlant el campo RAS es un valor que el usuario ingresa a mano; la plataforma NO lo calcula automáticamente desde Na/Ca/Mg. La fórmula estándar de riego (RAS = SAR, Sodium Adsorption Ratio) con cationes en meq/L es: RAS = Na⁺ / √((Ca²⁺ + Mg²⁺)/2). Usar siempre Na, Ca y Mg en las mismas unidades (meq/L), que es como están en la tabla de cationes del análisis. No inventar otra fórmula. Interpretación orientativa (literatura general, depende de suelo y cultivo): RAS &lt; 3 suele considerarse bajo riesgo de sodio; 3–6 moderado; &gt;6–8 riesgo alto — son guías, no reglas fijas.
- Análisis de Agua — Aporte del agua (lógica que el chat debe entender): Los valores del agua se ingresan en meq/L y ppm (conversión automática). Para un volumen de referencia (m³ agua de riego), la plataforma calcula el aporte en kg de elemento (y kg de óxido cuando aplica) para los nutrientes que tiene definidos: cationes Ca, Mg, Na, K → kg elemento y kg CaO, MgO, K₂O, Na₂O según factores de conversión (ej. Ca→CaO ×1.399, Mg→MgO ×1.658, K→K₂O ×1.205); aniones SO4→kg S, PO4→kg P, NO3→kg N (en forma elemental); micronutrientes B, Fe, Mn, Cu, Zn (ppm) → kg elemento = ppm × m³ / 1000. Así el usuario ve cuánto aporta el agua en macro y micro en modo elemental u óxido como en el resto de la plataforma.
- Análisis de Agua — Ácido para neutralizar (lógica que el chat debe entender): (1) Residual objetivo (meq/L): es el "colchón" de alcalinidad que se desea dejar en el agua; no se neutraliza todo el HCO₃⁻ y CO₃²⁻, sino que se deja ese residual como buffer. El usuario ajusta este valor (por defecto 1 meq/L). (2) Meq/L de ácido necesarios = (HCO₃⁻ meq/L + CO₃²⁻ meq/L) − residual objetivo; si el resultado es ≤ 0, no se requiere ácido. (3) Ácidos disponibles en la plataforma: Ácido Nítrico 55% (11.6 meq/mL), Sulfúrico 98% (36.7 meq/mL), Fosfórico 75% (12.0 meq/mL), Fosfórico 85% (14.6 meq/mL); cada uno tiene ese valor meq/mL con el que se calcula el volumen. (4) Cálculo: meq totales por m³ = meq/L × 1000; mL ácido por m³ = meq_totales_por_m³ / meqPerMl del ácido seleccionado; L ácido (volumen total) = (mL/m³ × m³ agua) / 1000. La plataforma muestra mL ácido/m³ y L total. (5) Si el usuario pregunta cuántos kg de ácido: kg = volumen ácido (L) × densidad del ácido (kg/L). La densidad es propia de cada producto (ej. nítrico 55% ~1.35 kg/L, sulfúrico 98% ~1.84 kg/L); el chat puede explicar la fórmula y usar densidades típicas o indicar que consulte la etiqueta del ácido si necesita el valor exacto.
- Análisis Foliar (DOP): lista "Reportes en este proyecto" y "+ Agregar análisis"; por reporte: título, fecha, Eliminar. El chat ve los valores que el usuario ingresa: resultado del laboratorio (macros en % MS: N, P, K, Ca, Mg, S; micros en mg/kg: Fe, Mn, Zn, Cu, B, Mo), los óptimos (por defecto o editados por el usuario, guardados por análisis) y el DOP % resultante.
- DOP (Diagnosis and Recommendation Integrated System): DOP = ((Valor − Óptimo) / Óptimo) × 100. Indica en porcentaje cuánto se desvía el resultado del óptimo: negativo = por debajo del óptimo (déficit), positivo = por encima (exceso). Sirve para evaluar niveles nutrimentales en el cultivo y apoyar la toma de decisiones (correcciones, ajustes al programa de fertilización, priorización de nutrientes a reforzar o reducir). Regla de interpretación en NutriPlant: 🟢 |DOP| ≤ 10% óptimo; 🔶 10–25% atención; 🟠 25–50% deficiencia o exceso marcado; 🔴 &gt;50% muy bajo o muy alto. Si el usuario ha editado los óptimos en un análisis, el chat puede notarlo (en contexto aparecen "opt" y el DOP calculado con ese óptimo) y aportar criterio técnico cuando consulte (por ejemplo explicar el significado del DOP, sugerir ajustes o cruzar con suelo/programa).
- Análisis de Fruta (ICC): lista "Reportes en este proyecto" y "+ Agregar análisis"; por reporte el chat ve los valores que el usuario ingresa (resultado de laboratorio), los óptimos (por defecto o editados por el usuario, guardados por análisis) y el ICC % resultante. Secciones: (1) Macronutrientes en fruta (%): N, P, K, Ca, Mg, S — Resultado, Óptimo editable, ICC y Estado; (2) Micronutrientes (mg/kg): Fe, Mn, Zn, Cu, B, Mo — Resultado, Óptimo editable, ICC y Estado; (3) Calidad de fruta: Materia Seca (%), °Brix, Firmeza (kg/cm²), Acidez titulable (%) — Resultado, Óptimo editable, ICC y Estado; (4) Calcio en fruta (mg/100 g MF): Ca total, % Ca soluble, % Ca ligado, % Ca insoluble — Resultado, Óptimo editable, Estado (semáforo). Regla visual: 🟢 |ICC| ≤ 10% | 🟡 10–25% | 🟠 25–50% | 🔴 &gt;50%. Si el usuario modifica un valor óptimo, el chat puede notarlo (en contexto aparecen "opt" e ICC con ese óptimo) y dar criterio técnico.
- ICC (Índice Comparativo de Calidad): mismo método que DOP pero aplicado a fruta para interpretar niveles o resultados de análisis de fruta. ICC = ((Valor − Óptimo) / Óptimo) × 100. Indica en % la desviación respecto al óptimo (negativo = por debajo, positivo = por encima). Sirve para evaluar calidad nutrimental y organoléptica de la fruta y apoyar decisiones (manejo poscosecha, ajustes de fertilización o calcio, priorización de correcciones).
- Parámetros de calidad de fruta: Materia Seca (%), °Brix (sólidos solubles), Firmeza (kg/cm²), Acidez titulable (%). Reflejan madurez, sabor y conservación; el chat debe interpretarlos junto con los nutrientes y el calcio.
- Calcio en fruta — valor agronómico para calidad poscosecha: el chat debe dominar este tema técnico. (1) Ca total (mg/100 g MF): contenido total de calcio en fruta. (2) % Ca soluble: fracción en forma iónica o fácilmente disponible; asociada a estabilidad de membranas y pared celular; bajo Ca soluble puede relacionarse con mayor susceptibilidad a desórdenes y ablandamiento. (3) % Ca ligado: calcio unido a pectinas y otros componentes de pared (forma menos disponible que el soluble pero estructuralmente importante). (4) % Ca insoluble: incluye calcio precipitado como oxalato de calcio, carbonatos o unido a fitato; esta fracción no está disponible para funciones celulares; alto % de Ca insoluble (ej. oxalato) puede indicar que buena parte del Ca total no contribuye a la firmeza ni a la reducción de desórdenes (bitter pit, podredumbres). En conjunto, una buena calidad poscosecha suele asociarse a Ca total adecuado y una proporción favorable de Ca soluble/ligado respecto a insoluble; el chat debe interpretar los valores del análisis (resultado vs óptimo) y el estado semáforo para aportar criterio sobre manejo de calcio y calidad de fruta. Integrar análisis foliar, suelo y fruta en diagnóstico.`,
      vpd: `
- Relación Ubicación ↔ VPD: los datos de clima en la pestaña VPD se obtienen para la ubicación del predio (centro del polígono definido en la pestaña Ubicación). "Obtener del Clima" y la "Serie VPD por Rango" usan esas coordenadas; si el usuario no tiene polígono en Ubicación, esas funciones no están disponibles hasta que lo defina. El chat debe entender esta dependencia y explicarla al usuario.
- Déficit de Presión de Vapor (VPD): VPD = presión de saturación a T_hoja − presión real de vapor. Afecta transpiración, absorción de Ca y estrés. Rangos típicos: 0.4–1.2 kPa óptimo según especie; &lt;0.3 riesgo edema; &gt;1.5 estrés hídrico. Cruza VPD con nutrición/riego para timing y riesgo de fitotoxicidad.
- Calculadora Ambiental Simple: Temperatura del Aire (°C) y Humedad Relativa (%). El usuario puede (1) pulsar "Obtener del Clima" (trae temp y humedad desde la ubicación del predio) o (2) ingresar los valores manualmente. Luego "Calcular VPD"; resultados VPD (kPa) y HD (g/m³). Los valores guardados (temp, humedad, VPD) son los que el usuario usó o obtuvo; el chat debe interpretar esos datos cuando estén en contexto.
- Serie VPD por Rango: el usuario elige vista por día, semana o mes (granularidad), fecha inicio y fin, y descarga una tabla de valores VPD para ese rango en la ubicación del predio. Esas tablas se pueden guardar (series guardadas); el chat debe entender si el contexto indica "por día", "por semana" o "por mes" y los valores VPD y fechas de cada serie guardada.
- Calculadora Avanzada: además de Temperatura del Aire (°C) y Humedad Relativa (%), usa uno de dos modos: (1) Temperatura de Hoja: el usuario ingresa la temperatura de la hoja (°C) directamente; o (2) Radiación Solar: el usuario ingresa la radiación solar (W/m²) y la plataforma calcula la temperatura de la hoja a partir de ella. Con temp aire, humedad y temp hoja se calcula el VPD. El chat debe entender esta lógica para explicar al usuario o responder consultas sobre la calculadora avanzada.
- Historial: se guardan cálculos ambientales y avanzados (fecha, VPD kPa, HD, etc.). Interpreta los datos guardados y las series de rangos cuando el usuario consulte.`,
      ubicacion: `
- Ubicación: el usuario define el predio dibujando puntos en el mapa (polígono). El asistente recibe en contexto: número de vértices del polígono, superficie/área (ha o m²), perímetro (m) y coordenadas (centro del polígono o referencia). Si no hay polígono aún, se indica "sin polígono definido" y se puede guiar al usuario a ir a la pestaña Ubicación y dibujar los puntos en el mapa. Necesario para la calculadora ambiental de VPD ("Obtener del Clima" usa el centro del polígono) y para reportes PDF.`,
      reportes: `
- Reportes: esta pestaña sirve para generar y gestionar reportes PDF del proyecto actual. Cómo generar un reporte: (1) El usuario pulsa el botón "Generar Nuevo Reporte PDF" (en la pestaña Reportes o desde la sección de enmiendas). (2) Se abre un modal donde debe seleccionar las secciones o pestañas que quiere incluir en el reporte: Ubicación, Enmiendas, Nutrición granular, Fertirriego, Hidroponía, Déficit de presión de vapor (VPD). (3) El usuario marca (selecciona) las que desee y confirma; se genera el PDF con solo esas secciones. (4) El reporte aparece en la lista; cada uno tiene Descargar (PDF) y Eliminar. Los reportes se guardan en el proyecto y se sincronizan a la nube si está conectado. El chat debe entender esta lógica para explicar al usuario cómo hacerlo: ir a Reportes → "Generar Nuevo Reporte PDF" → en el modal elegir qué secciones incluir → generar.`,
      general: `
- NutriPlant PRO: responder con base en datos del proyecto activo y criterio agronómico técnico.
- Diferenciar siempre hechos del proyecto vs conocimiento general.`
    };
    return base[module] || base.general;
  }

  /**
   * Obtiene solo los datos del usuario actual necesarios para personalizar el chat (nombre y profesión).
   * No expone email ni teléfono. Se usa únicamente el perfil del usuario logueado en esta sesión.
   */
  getCurrentUserProfileForChat() {
    const userId = localStorage.getItem('nutriplant_user_id');
    if (!userId) return null;
    try {
      const userKey = `nutriplant_user_${userId}`;
      const raw = localStorage.getItem(userKey);
      if (!raw) return null;
      const profile = JSON.parse(raw);
      const fullName = (profile.name || profile.fullName || '').trim();
      const displayName = fullName ? fullName.split(/\s+/)[0] : 'Usuario';
      const profession = (profile.profession || '').trim();
      return { displayName, profession: profession || null };
    } catch (e) {
      return null;
    }
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

CONTEXTO DE CONOCIMIENTO (qué tienes tú vs qué te pasamos):
- TU CONOCIMIENTO (no hace falta que te lo den): Agronomía, nutrición vegetal, CIC, meq/L, ppm, rangos ideales, antagonismos, fórmulas (óxido/elemental, conversiones), diagnósticos integrados, mejores prácticas. Eso ya lo dominas por tu entrenamiento.
- LO QUE TE PASAMOS: Solo los DATOS DEL PROYECTO del usuario (suelo, enmiendas, fertirriego, hidroponía, solución nutritiva, VPD, análisis, etc.) en el bloque "DATOS DEL PROYECTO". Con eso + tu conocimiento debes dominar el contexto y sacar de apuros sin que tengan que "darte contexto" de cada pantalla.
- Conclusión: No pidas datos que ya están en el bloque de abajo. Interpreta todo lo que haya (resúmenes, tablas, volcado completo) con tu expertise y responde con acciones concretas.

REGLA DE ORO: El bloque de abajo es como si el usuario te hubiera pegado su pantalla. Tu primer paso mental es LEERLO TODO. Luego responde con datos CONCRETOS, números y pasos que saquen de apuros; evita respuestas genéricas.

${(() => {
  const profile = this.getCurrentUserProfileForChat();
  if (!profile) return '';
  const nameLine = profile.displayName ? `Nombre (para personalizar): ${profile.displayName}.` : '';
  const profLine = profile.profession ? ` Profesión: ${profile.profession}.` : '';
  return `USUARIO ACTUAL (solo para personalizar el tono y las respuestas; NO compartir con otros):\n- ${nameLine}${profLine}\n- Regla crítica: Solo tienes contexto del usuario que te escribe en esta sesión. NUNCA uses, menciones ni cruces información de otros usuarios; cada sesión corresponde a un solo usuario y sus datos.\n\n`;
})()}

IDENTIDAD Y CAPACIDADES:
- Dominas lógica de NutriPlant: Enmienda, Suelo, Granular, Fertirriego, Hidroponía, Análisis y VPD.
- Diferencias claramente cálculo de plataforma vs criterio técnico general.
- Tu respuesta debe ser accionable, coherente y trazable.

ARQUITECTURA NUTRIPLANT Y CONTEXTO GLOBAL DEL PROYECTO:
- Conoces la arquitectura de NutriPlant: módulos (Inicio, Ubicación, Enmienda, Nutrición Granular, Fertirriego, Hidroponía, Análisis, VPD, Reportes), subpestañas de Análisis (Suelo, Solución Nutritiva, Extracto de Pasta, Agua, Foliar/DOP, Fruta/ICC) y cómo se relacionan (p. ej. Suelo→Enmienda, Agua→Fertirriego/Hidroponía, Foliar/Suelo/Fruta→diagnóstico integrado).
- Los datos que te pasamos son del MISMO proyecto en su totalidad: incluyen TODAS las secciones que el usuario tenga guardadas (Enmienda, Fertirriego, Granular, Hidroponía, Análisis de Suelo, Foliar, Fruta, Agua, Solución Nutritiva, Extracto de Pasta, etc.), aunque el usuario esté en otra pestaña. Por ejemplo: si está en Fertirriego y te pregunta por su análisis foliar o por su suelo, tienes esos datos en el bloque "DATOS DEL PROYECTO" y debes usarlos para responder e interactuar con él.
- Puedes usar la lógica y explicar el funcionamiento de cualquier módulo cuando el usuario pregunte; responde con los datos del bloque del módulo del que hablen.

UNIDADES POR MÓDULO (NO CONFUNDIR):
- **Hidroponía**: concentraciones y aportes de fertilizantes son SIEMPRE en forma ELEMENTAL (%, ppm por elemento). No hay modo óxido en hidroponía.
- **Orden para determinar el marco de contexto** (usa este orden cuando pregunten por *sus* datos o por interpretar *su* pantalla): (1) **Mención explícita en el mensaje**: si el usuario dice "solución nutritiva", "foliar", "análisis de agua", "enmienda", "suelo", "hidroponía", "extracto de pasta", etc. → el marco es el de ese bloque. (2) **Módulo activo**: en "DATOS DEL PROYECTO" aparece "Módulo activo: X"; si X = hidroponia → marco solución (ppm en solución); si X = enmienda → marco suelo inicial (meq/100g); si X = analisis → ver (3). (3) **Dentro de Análisis**: en el bloque "ANÁLISIS (pestaña actual)" se indica qué subpestañas tienen datos "en pantalla" y "Reporte seleccionado"; usar la subpestaña que el usuario nombre o la que tenga reporte seleccionado, o inferir por palabras del mensaje (ej. "micros en solución" → solución; "ppm foliar" o "DOP" → foliar). (4) **Marco = unidades de ese bloque**: solución/hidroponía → ppm en solución; foliar → mg/kg en tejido; suelo → meq/100g o % CIC; agua → meq/L o ppm; granular/fertirriego → kg/ha. Una vez determinado el marco, referencias/ideales/literatura en las MISMAS unidades; no mezcles (ej. no des rangos foliares si el marco es solución, ni al revés).
- **Preguntas técnicas generales (nutrición vegetal, antagonismos, rangos, DOP, etc.) sin "mis datos" ni "mi proyecto"**: no ancles al Módulo activo ni a un bloque. Usa el marco (unidades) que la pregunta indique: "rangos foliares" → responde en mg/kg; "en solución nutritiva" → ppm en solución; "CIC/suelo" → meq/100g. Responde con conocimiento técnico general; si aplica, puedes añadir "en tu proyecto, si lo ves en [bloque X], sería..." y separar "Contexto del proyecto" vs "Conocimiento general".
- **Granular y Fertirriego**: la plataforma trabaja en modo ÓXIDO (P₂O₅, K₂O, CaO, MgO...) o ELEMENTAL (P, K, Ca, Mg...) según lo que tenga guardado el usuario; los valores en contexto vienen en ese modo. Ambos módulos permiten cambiar a elemental (calculadora óxido↔elemental en la plataforma).
- No apliques reglas de hidroponía (solo elemental) a Granular/Fertirriego ni al revés: en hidroponía todo es elemental; en Granular y Fertirriego depende del modo guardado.

MANUAL DEL MÓDULO ACTIVO:
${moduleManual}

DATOS DEL PROYECTO ACTUAL DEL USUARIO (usa esto como si estuvieras viendo su pantalla y sus análisis):
${context}

INSTRUCCIONES:
- CUANDO pregunten por números, cálculos o "por qué la app sugiere X": usa ÚNICAMENTE los datos del proyecto que aparecen arriba (pestaña actual). No inventes ni mezcles con otros proyectos.
- CUANDO pregunten teoría agronómica, relaciones entre nutrientes o criterios generales (sin pedirte que interpretes sus datos): puedes responder con lógica y conocimiento técnico general; si aplica, relaciona con lo que tienen en la pestaña y separa "Contexto del proyecto" vs "Conocimiento general".
- No mezcles ni cites valores de otros proyectos del usuario. Si menciona "mi otro proyecto", indica que solo tienes contexto del proyecto actual.
- Privacidad entre usuarios: los datos y el contexto que recibes corresponden ÚNICAMENTE al usuario que te escribe en esta sesión. Nunca cruces, menciones ni uses información de otros usuarios; cada conversación es de un solo usuario con sus proyectos y su perfil.
- Granular vs Fertirriego: son dos módulos separados. Cada uno tiene su propio Requerimiento Nutricional y su propio Programa; los valores no son intercambiables. Si el usuario está en Nutrición Granular (o pregunta por granular), usa solo los datos del bloque "NUTRICIÓN GRANULAR". Si está en Fertirriego (o pregunta por fertirriego/gráficas de fertirriego), usa solo los datos del bloque "FERTIRRIEGO". No confundas requerimientos ni programas entre ambos.
- Solución Nutritiva vs Extracto de Pasta: son dos subpestañas distintas dentro de Análisis. Cada una tiene su propia lista de reportes, valores e ideales. No cruces ni mezcles datos entre ellas: si preguntan por solución nutritiva, usa solo el bloque "ANÁLISIS SOLUCIÓN NUTRITIVA"; si preguntan por extracto de pasta, usa solo el bloque "ANÁLISIS EXTRACTO DE PASTA".
- Cultivos y fertilizantes personalizados: el usuario puede agregar cultivos personalizados y fertilizantes/materias personalizados tanto en Nutrición Granular como en Fertirriego. Cada módulo tiene su propia pestaña y ahí se gestionan los de ese módulo (los de Granular en la pestaña Nutrición Granular; los de Fertirriego en la pestaña Fertirriego). Si preguntan por "mis fertilizantes", "mis cultivos" o dónde agregar uno, usa el módulo en el que estén o del que hablen y di la pestaña correspondiente.
- Resultados de los programas que el chat SÍ ve: En Nutrición Granular recibes la lista de aplicaciones guardadas (cada una con título, dosis kg/ha y materiales); puedes referirte a ellas como "las aplicaciones que tienes", "tu programa granular", etc. En Fertirriego recibes el número de semanas o meses, la unidad de tiempo (semana/mes), el modo (óxido o elemental), la lista de fertilizantes/materias y el aporte total del programa por nutriente (kg/ha); puedes referirte a "tu programa de fertirriego", "los aportes de tu programa", etc. Si el usuario agrega o cambia aplicaciones (granular) o semanas/dosis (fertirriego), tras guardar el proyecto esos datos pasan al contexto en la siguiente consulta.
- Lógica de la plataforma en Fertirriego, Granular e Hidroponía (resumen): (1) Granular y Fertirriego permiten modo óxido o elemental; los valores en contexto están en el modo guardado. (2) Granular: Requerimiento define la meta; Programa son aplicaciones (dosis kg/ha y materiales) que cubren la meta. (3) Fertirriego: Requerimiento define la meta; Programa por semanas o meses genera aportes; Gráficas comparan aporte vs requerimiento. (4) Hidroponía: las dos subsecciones están relacionadas: Solución por etapa define el objetivo (ppm/meq por etapa); Cálculo de fertilizantes usa ese objetivo, resta el aporte del agua (análisis de agua), obtiene el requerimiento total y calcula fertilizantes y dosis para cubrirlo. Interpreta números y etiquetas según el bloque de datos.
- Si existe una línea "Resultado en pantalla (prioridad alta...)" en ENMIENDAS, úsala como fuente principal para cantidades y aportes; cita esos números exactos en tu respuesta.
- Si existen los bloques "🧪 Enmiendas Disponibles", "Meq a ajustar", "% Suelo explorado por raíces" y "📊 Resultados del Cálculo de Enmiendas", trátalos como lectura directa de pantalla y priorízalos para responder preguntas de Enmienda.
- Cómo saber si el usuario habla de datos de Enmienda o de la pestaña Análisis de Suelo: (1) "ANÁLISIS DE SUELO INICIAL" = único conjunto de valores (meq/100g, CIC, etc.) usados en la pestaña Enmienda para el cálculo de enmiendas. (2) "ANÁLISIS DE SUELO (reportes)" = lista de reportes en la pestaña Análisis > Análisis de Suelo (cada uno con título, fecha, fertilidad, cationes, kg/ha). Si el usuario está en Enmienda o dice "los datos de enmienda", "lo que tengo en enmienda", "el análisis inicial" → usar el bloque INICIAL. Si está en la pestaña Análisis (subpestaña Análisis de Suelo) o dice "los reportes de análisis", "el análisis de suelo que cargué" (en contexto de reportes) → usar el bloque (reportes). Si no queda claro, responde usando el bloque que coincida con la pestaña donde está (snapshot "ANÁLISIS (pestaña actual)" indica si está en Análisis de Suelo = reportes) o aclara: "¿te refieres a los valores que usas en Enmienda (Análisis Inicial) o a uno de los reportes de la pestaña Análisis de Suelo?".
- Tu valor diferenciador es usar SIEMPRE los datos que ves del proyecto (análisis, programa, cultivo, CIC, solución nutritiva, etc.) para dar recomendaciones específicas a este agronomista, no genéricas. Interpreta sus números con la lógica NutriPlant PRO, sugiere acciones concretas y saca de apuros con pasos claros (qué cambiar, en qué rango, por qué).
- Usa el bloque INTERCONEXIONES ENTRE PESTAÑAS cuando convenga: si preguntan por qué algo no funciona (ej. VPD sin clima), de dónde sale un dato (ej. enmienda que usa CIC de suelo) o qué pestaña completar primero; indica la pestaña origen o la que debe configurarse.
- Si preguntan por conversión óxido↔elemental (P₂O₅/P, K₂O/K, CaO/Ca, MgO/Mg, S/SO₄, Zn/ZnO) o por ppm↔mmol/L↔meq/L, usa exactamente los factores y fórmulas del manual sección 7 (Calculadoras NutriPlant) para que tu respuesta coincida con las calculadoras de la plataforma.
- Solución nutritiva e hidroponía: conversión meq/L ↔ ppm en NutriPlant usa el peso equivalente del ELEMENTO para que el resultado sea ppm del elemento (ej. P-H2PO4 → 31 da ppm P; S-SO4 → 16 da ppm S). El porqué: en agronomía y etiquetas se trabaja con concentración elemental; así el usuario ve ppm P, ppm S, ppm K directamente y puede comparar con análisis y referencias. Si el usuario duda o cuestiona por qué está así, explica esta lógica y el beneficio. Diagrama ternario: NutriPlant tiene definidos los máximos y mínimos de referencia (tipo Steiner) en la plataforma: nitrato (NO3) 20–80%, H2PO4 1.25–10%, SO4 10–70%; cationes K 10–65%, Ca 22.5–62.5%, Mg 0.5–40%. Dentro de esa zona = equilibrio; fuera = riesgo de antagonismos o precipitados. Si preguntan por Steiner o por los máximos y mínimos del triángulo, usa estos valores exactos. Si habla de pasar a ppm, meq o mmol de cada elemento, usa los pesos equivalentes del manual (N 14, P 31, S 16, K 39.1, Ca 20.04, Mg 12.15) y la misma lógica que la calculadora de la plataforma. Si piden soluciones de referencia (Hoagland, Steiner u otros autores) para meq/L de aniones/cationes o ppm de microelementos, usa la sección "Soluciones nutritivas de referencia" del manual (Hoagland, Steiner, rangos típicos de micros) y compáralas con los datos del proyecto del usuario cuando aplique.
- En Cálculo de fertilizantes (Hidroponía): el chat entiende objetivo, aporte del agua, requerimiento, volumen de agua/tanque/inyección, resultado por tanque (kg o L por fertilizante y por recarga) y la lógica ppm↔kg (dosis×vol_m³/1000), aporte total ppm y dosis de ácidos (L y kg eq). En hidroponía todo es en forma ELEMENTAL; si el usuario tiene una fuente en óxido (P₂O₅, K₂O, etc.) o pregunta cómo obtener el % elemental, sugiere usar la calculadora de conversión óxido→elemental de la plataforma o ayuda con el cálculo/fórmula.
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
- GRÁFICAS DE FERTIRRIEGO: Si preguntan si "puedes ver las gráficas" o "las gráficas de fertirriego que tengo abiertas": NO digas que no puedes ver nada. Tienes los DATOS del proyecto (requerimiento nutricional, programa por semanas, cultivo, rendimiento, aportes del programa y del agua). Responde que tienes esos datos y puedes interpretarlos y dar recomendaciones; lo que no recibes es la imagen visual de la gráfica. Invita a que te describan qué ven (p. ej. qué nutriente está por encima o por debajo del requerimiento en qué etapas) o pregunten por un nutriente/mes concreto, y entonces das recomendaciones precisas con los números del contexto.
- Si el usuario adjunta una imagen, interpreta su contenido (análisis, gráfica, planta, suelo, resultado de laboratorio, etc.) en contexto agronómico y responde en consecuencia usando también los datos del proyecto cuando aplique.
- IMPORTANTE: cuando venga una imagen adjunta en el mensaje del usuario, asume que SÍ tienes visión habilitada y NUNCA respondas que "no puedes ver imágenes" o "no puedes interpretar adjuntos". En su lugar, describe lo que observas y pide zoom o re-subida solo si la imagen viene borrosa o incompleta.
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
    let recentMessages = this.messages.slice(-historyLimit);
    if (imageData && imageData.base64) {
      // Evita arrastrar respuestas antiguas que digan "no puedo ver imágenes",
      // porque contaminan el contexto cuando sí se adjunta una imagen.
      recentMessages = recentMessages.filter((msg) => {
        if (!msg || msg.sender !== 'ai') return true;
        const text = String(msg.content || '').toLowerCase();
        const deniesVision =
          (text.includes('no puedo ver') || text.includes('no tengo la capacidad de ver')) &&
          (text.includes('imagen') || text.includes('imágenes') || text.includes('adjunto'));
        return !deniesVision;
      });
    }
    recentMessages.forEach(msg => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
    
    // Agregar mensaje actual; si hay imagen, enviarlo ya en formato multimodal
    // (más robusto en producción, incluso si un proxy omite campos extra del body).
    let currentUserContent = userMessage || '(interpreta la imagen en contexto agronómico)';
    if (imageData && imageData.base64) {
      const imageUrl = 'data:' + (imageData.contentType || 'image/jpeg') + ';base64,' + imageData.base64;
      currentUserContent = [
        { type: 'text', text: userMessage || '¿Qué puedes ver en esta imagen en contexto de mi proyecto?' },
        { type: 'image_url', image_url: { url: imageUrl } }
      ];
    }
    messages.push({
      role: 'user',
      content: currentUserContent
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
      max_tokens: maxTokens,
      allowWebSearch: false
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
        const quotaMessage = data?.message || 'Has alcanzado el límite mensual de créditos. Se renuevan al inicio del próximo mes.';
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

    const np = data._nutriplant || {};
    this._lastCreditsUsed = np.credits_used_this_request != null ? np.credits_used_this_request : (imageData ? 3 : 1);

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

  /** Una o dos líneas con el dato clave del módulo actual (para el resumen ejecutivo del contexto). */
  buildExecutiveSummary(snapshot) {
    if (!snapshot || !snapshot.module) return '';
    const mod = snapshot.module;
    if (mod === 'hidroponia') {
      const live = this.getLiveHidroponiaBlocks();
      if (live.subsection === 'Solución por etapa' && (live.nitrogenSummary || live.triangleInfo)) {
        const parts = [];
        if (live.nitrogenSummary) parts.push(live.nitrogenSummary);
        if (live.triangleInfo) parts.push(live.triangleInfo.replace(/\s+/g, ' ').slice(0, 120) + (live.triangleInfo.length > 120 ? '…' : ''));
        return parts.length ? parts.join(' | ') : '';
      }
      if (live.objectiveSummary) return 'Objetivo solución (ppm): ' + live.objectiveSummary;
    }
    if (mod === 'fertirriego') {
      const live = this.getLiveFertirriegoBlocks();
      if (live.tableSummary) return live.tableSummary.split('\n')[0] || live.tableSummary.slice(0, 100);
    }
    if (mod === 'enmienda') {
      const live = this.getLiveAmendmentScreenBlocks();
      if (live.calcResultsText) return live.calcResultsText.replace(/\s+/g, ' ').slice(0, 100) + (live.calcResultsText.length > 100 ? '…' : '');
    }
    if (mod === 'granular') {
      const live = this.getLiveGranularRequirementBlocks();
      if (live.tableSummary) return live.tableSummary.split('\n')[0] || live.tableSummary.slice(0, 100);
    }
    return '';
  }

  /** Volcado compacto de todo el proyecto para que la IA tenga "toda la información" en un solo bloque y use su conocimiento agronómico para interpretarla. Máx ~3500 caracteres. */
  getFullProjectDump(project) {
    if (!project || typeof project !== 'object') return '';
    const maxLen = 3400;
    const lines = [];
    const push = (label, obj) => {
      if (obj == null || (typeof obj === 'object' && Object.keys(obj).length === 0)) return;
      try {
        const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
        if (s.length > 400) lines.push(`${label}: ${s.slice(0, 400)}…`);
        else lines.push(`${label}: ${s}`);
      } catch (e) { lines.push(`${label}: [no serializable]`); }
    };
    if (project.soilAnalysis) push('suelo', project.soilAnalysis);
    if (project.amendments) push('enmiendas', project.amendments);
    if (project.fertirriego) push('fertirriego', project.fertirriego);
    if (project.granular) push('granular', project.granular);
    if (project.hidroponia || project.sections?.hidroponia) push('hidroponia', project.hidroponia || project.sections?.hidroponia);
    if (project.location && (project.location.polygon || project.location.areaHectares != null)) push('ubicacion', { areaHectares: project.location.areaHectares, area: project.location.area, hasPolygon: !!(project.location.polygon && project.location.polygon.length >= 3) });
    if (project.vpdAnalysis) push('vpd', project.vpdAnalysis);
    if (Array.isArray(project.soilAnalyses) && project.soilAnalyses.length) push('analisisSuelo_count', project.soilAnalyses.length);
    if (Array.isArray(project.foliarAnalyses) && project.foliarAnalyses.length) push('analisisFoliar_count', project.foliarAnalyses.length);
    if (Array.isArray(project.frutaAnalyses) && project.frutaAnalyses.length) push('analisisFruta_count', project.frutaAnalyses.length);
    const out = lines.join('\n');
    return out.length > maxLen ? out.slice(0, maxLen) + '…' : out;
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
      calcResultsText: '',
      targetMeq: ''
    };

    // Meq a ajustar (K, Ca, Mg, H, Na, Al) — valores usados en el cálculo; NutriPlant sugiere pero el usuario puede modificarlos
    const kT = document.getElementById('k-target'), caT = document.getElementById('ca-target'), mgT = document.getElementById('mg-target');
    const hT = document.getElementById('h-target'), naT = document.getElementById('na-target'), alT = document.getElementById('al-target');
    const meqVals = [];
    if (kT && kT.value !== '') meqVals.push(`K:${kT.value}`);
    if (caT && caT.value !== '') meqVals.push(`Ca:${caT.value}`);
    if (mgT && mgT.value !== '') meqVals.push(`Mg:${mgT.value}`);
    if (hT && hT.value !== '') meqVals.push(`H:${hT.value}`);
    if (naT && naT.value !== '') meqVals.push(`Na:${naT.value}`);
    if (alT && alT.value !== '') meqVals.push(`Al:${alT.value}`);
    if (meqVals.length) out.targetMeq = meqVals.join(', ');

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
    const out = { subsection: '', volume: '', objectiveSummary: '', waterSummary: '', missingSummary: '', solutionMeqTable: '', solutionPercentTable: '', solutionPpmTable: '', nitrogenSummary: '', triangleInfo: '' };
    const activeBtn = document.querySelector('.hydroponia-tabs .tab-button.active');
    const tab = activeBtn && activeBtn.getAttribute('data-tab');
    if (tab === 'hidro-solucion') {
      out.subsection = 'Solución por etapa';
      const meqWrap = document.getElementById('hydroMeqTableWrap');
      const pctWrap = document.getElementById('hydroMeqPercentWrap');
      const ppmWrap = document.getElementById('hydroPpmTableWrap');
      const nSum = document.getElementById('hydroNitrogenSummaryText');
      const tri = document.getElementById('hydroTriangleInfoCombined');
      if (meqWrap && meqWrap.textContent) out.solutionMeqTable = meqWrap.innerText.replace(/\s+/g, ' ').trim().slice(0, 800);
      if (pctWrap && pctWrap.textContent) out.solutionPercentTable = pctWrap.innerText.replace(/\s+/g, ' ').trim().slice(0, 600);
      if (ppmWrap && ppmWrap.textContent) out.solutionPpmTable = ppmWrap.innerText.replace(/\s+/g, ' ').trim().slice(0, 800);
      if (nSum && nSum.textContent) out.nitrogenSummary = nSum.textContent.replace(/\s+/g, ' ').trim();
      if (tri && tri.textContent) out.triangleInfo = tri.textContent.replace(/\s+/g, ' ').trim().slice(0, 500);
    } else if (tab === 'hidro-calculo') {
      out.subsection = 'Cálculo de fertilizantes';
      try {
        const raw = localStorage.getItem('hydroCustomMaterials_global_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed?.items) ? parsed.items : [];
          if (items.length) {
            out.catalogSummary = items.map(m => {
              const name = m.name || m.id || '?';
              const pcts = ['N_NH4', 'N_NO3', 'P', 'K', 'Ca', 'Mg', 'S'].filter(n => m[n] != null && Number(m[n]) !== 0).map(n => `${n}:${m[n]}%`).slice(0, 7).join(', ');
              return pcts ? `${name} (${pcts})` : name;
            }).join('; ');
          }
        }
      } catch (_) {}
    }
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
    const out = { visible: false, reportTitles: [], currentId: '', currentTitle: '', currentDate: '', physical: null, ph: null, fertilitySummary: null, soilFertilityLogic: null };
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
      const gv = (id) => {
        const el = document.getElementById(id);
        if (!el) return '';
        const v = (el.value != null ? el.value : el.textContent) || '';
        return String(v).trim();
      };
      const cicInput = gv('soil-cations-cic');
      const cicSpan = gv('soil-cic-params');
      const cicStr = (cicInput && cicInput !== '—') ? cicInput : (cicSpan && cicSpan !== '—' ? cicSpan : '');
      const cicNum = parseFloat(String(cicStr).replace(',', '.'));
      const computedIdeal = (!isNaN(cicNum) && cicNum > 0) ? computeNutriPlantSoilKCaMgIdealPpmFromCic(cicNum) : null;
      const pMethEl = document.getElementById('soil-fertility-pMethod');
      const tdText = (id) => {
        const el = document.getElementById(id);
        if (!el) return '';
        const t = (el.textContent || '').trim();
        return t && t !== '—' ? t : '';
      };
      out.soilFertilityLogic = {
        cic: cicStr || null,
        formulaKCaMgPpm: computedIdeal,
        labK: gv('soil-fertility-k') || null,
        labCa: gv('soil-fertility-ca') || null,
        labMg: gv('soil-fertility-mg') || null,
        idealK: gv('soil-fertility-ideal-k') || null,
        idealCa: gv('soil-fertility-ideal-ca') || null,
        idealMg: gv('soil-fertility-ideal-mg') || null,
        idealP: gv('soil-fertility-ideal-p') || null,
        pMethod: (pMethEl && pMethEl.value) ? pMethEl.value : null,
        meqCa: gv('soil-cations-ca') || null,
        meqMg: gv('soil-cations-mg') || null,
        meqK: gv('soil-cations-k') || null,
        depthCm: gv('soil-fertility-depthCm') || null,
        reachPct: gv('soil-fertility-reachPct') || null,
        bulkDensityGcm3: gv('soil-physical-bulkDensity') || null,
        kgHaK: tdText('soil-kgha-k') || null,
        kgHaCa: tdText('soil-kgha-ca') || null,
        kgHaMg: tdText('soil-kgha-mg') || null
      };
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
    context += 'ÚNICO PROYECTO DEL QUE TIENES DATOS EN ESTE CONTEXTO. No uses ni mezcles información de otros proyectos.\n';
    context += 'IMPORTANTE: Usa este bloque como si el usuario te hubiera pegado su pantalla. Tu valor es dar respuestas CONCRETAS, con números y pasos claros que saquen de apuros; evita respuestas genéricas.\n\n';
    try {
      const snapshot = this.contextSnapshot || this.getUnifiedProjectSnapshot();
      const projectId = snapshot.projectId;
      if (!projectId) {
        context += 'No hay proyecto activo seleccionado.\n';
        if (snapshot.module === 'inicio') {
          context += '--- INICIO (vista de proyectos) ---\n';
          context += 'El usuario está en la sección Inicio (pantalla de proyectos recientes).\n';
          const loadProjects = typeof window.np_loadProjects === 'function' ? window.np_loadProjects() : [];
          const projectList = Array.isArray(loadProjects) ? loadProjects : [];
          if (projectList.length === 0) {
            context += 'El usuario no tiene proyectos aún. Para crear uno: botón "+ Nuevo NutriPlant" en la barra superior; luego completar nombre y opcionalmente cultivo, variedad, campo/sector y guardar.\n';
          } else {
            context += `Proyectos del usuario (${projectList.length}):\n`;
            projectList.slice(0, 15).forEach((p, i) => {
              const name = p.title || p.name || 'Sin nombre';
              const cultivo = p.cultivo || p.crop_type || '—';
              context += `  ${i + 1}. ${name} — Cultivo: ${cultivo}\n`;
            });
            if (projectList.length > 15) context += `  ... y ${projectList.length - 15} más.\n`;
            context += 'Para trabajar en un proyecto: pulsar "Abrir" en su tarjeta. Para crear uno nuevo: "+ Nuevo NutriPlant".\n';
          }
          context += '\n';
        }
        return context;
      }
      const project = snapshot.projectData;
      if (!project) {
        context += 'Proyecto no encontrado en la plataforma.\n';
        return context;
      }
      // Resumen ejecutivo (como el “contexto” que se pega en ChatGPT: situación en 2–3 líneas)
      const projName = project.name || project.title || 'Sin nombre';
      const cultivo = project.crop_type || project.cultivo || '—';
      const execSummary = this.buildExecutiveSummary(snapshot);
      context += '--- RESUMEN EJECUTIVO (situación actual en una lectura) ---\n';
      context += `Proyecto: ${projName}. Cultivo: ${cultivo}. Módulo visible: ${snapshot.module}.\n`;
      if (execSummary) context += execSummary + '\n';
      context += '\n';
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
      context += 'Ubicación → VPD (el polígono del predio define la ubicación; "Obtener del Clima" y la Serie VPD por rango usan el centro del polígono para obtener datos de clima; sin polígono esas funciones no están disponibles); Reportes (incluyen mapa). Análisis de Suelo (CIC, cationes) → Enmienda (recomendaciones y dosis). Análisis de Agua → Fertirriego y Hidroponía (aporte del agua se resta del requerimiento). Suelo, Foliar, Fruta, Solución/Extracto/Agua → diagnóstico integrado (priorizar suelo → foliar → programa). VPD → cruzar con nutrición/riego para timing y estrés. Todas las pestañas de datos → Reportes (PDF).\n\n';

      // --- Ubicación (polígono del predio: puntos en el mapa, superficie, perímetro, coordenadas) ---
      if (project.location) {
        context += '--- UBICACIÓN (polígono del predio en el mapa) ---\n';
        const loc = project.location;
        const hasPolygon = loc.polygon && Array.isArray(loc.polygon) && loc.polygon.length >= 3;
        if (hasPolygon) {
          const n = loc.polygon.length;
          context += `Polígono: ${n} vértices (puntos que el usuario colocó en el mapa).\n`;
          context += `Superficie/Área: ${loc.areaHectares != null ? loc.areaHectares + ' ha' : (loc.area != null ? loc.area + ' m²' : '—')}\n`;
          if (loc.perimeter != null) context += `Perímetro: ${loc.perimeter} m\n`;
          if (loc.center && typeof loc.center === 'object' && loc.center.lat != null && loc.center.lng != null) {
            context += `Coordenadas del centro (lat, lng): ${Number(loc.center.lat).toFixed(6)}, ${Number(loc.center.lng).toFixed(6)}\n`;
          } else if (loc.coordinates && typeof loc.coordinates === 'string' && loc.coordinates.trim()) {
            context += `Coordenadas: ${loc.coordinates.trim()}\n`;
          } else if (loc.polygon.length > 0 && Array.isArray(loc.polygon[0])) {
            const p = loc.polygon[0];
            context += `Primer vértice (lat, lng): ${Number(p[0]).toFixed(6)}, ${Number(p[1]).toFixed(6)}\n`;
          } else if (loc.polygon.length > 0 && typeof loc.polygon[0] === 'object' && loc.polygon[0].lat != null) {
            const p = loc.polygon[0];
            context += `Primer vértice (lat, lng): ${Number(p.lat).toFixed(6)}, ${Number(p.lng).toFixed(6)}\n`;
          }
        } else {
          context += 'Sin polígono definido aún (el usuario puede dibujar puntos en el mapa en la pestaña Ubicación para definir el predio).\n';
        }
        context += '\n';
      }

      // --- Análisis de suelo INICIAL (datos usados en Enmienda; no confundir con pestaña Análisis de Suelo) ---
      if (project.soilAnalysis) {
        context += '--- ANÁLISIS DE SUELO INICIAL (solo Enmienda: meq/100g, CIC — NO es la pestaña Análisis de Suelo) ---\n';
        context += 'Estos son los valores que el usuario usa en la pestaña Enmienda para el cálculo de enmiendas. Si pregunta por "datos de enmienda" o "lo que tengo en enmienda", usa ESTE bloque. Los reportes de la pestaña Análisis de Suelo son otro bloque ("ANÁLISIS DE SUELO (reportes)").\n';
        const ini = project.soilAnalysis.initial || {};
        const props = project.soilAnalysis.properties || {};
        const adj = project.soilAnalysis.adjustments || {};
        context += `Cationes (meq/100g): K ${ini.k ?? '—'}, Ca ${ini.ca ?? '—'}, Mg ${ini.mg ?? '—'}, Na ${ini.na ?? '—'}, H ${ini.h ?? '—'}, Al ${ini.al ?? '—'}; CIC total: ${ini.cic ?? '—'}\n`;
        if (props.ph > 0) context += `pH: ${props.ph}; `;
        if (props.density > 0) context += `Densidad aparente: ${props.density} g/cm³; `;
        if (props.depth > 0) context += `Profundidad: ${props.depth} cm\n`;
        if (adj.k != null || adj.ca != null || adj.mg != null) {
          context += `Ajustes objetivo (meq a ajustar; NutriPlant sugiere valores pero el usuario puede modificarlos): K ${adj.k ?? '—'}, Ca ${adj.ca ?? '—'}, Mg ${adj.mg ?? '—'}\n`;
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
        if (liveBlocks.targetMeq) context += `Meq a ajustar (valores usados en el cálculo; NutriPlant sugiere pero el usuario puede modificarlos): ${liveBlocks.targetMeq}\n`;
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
        context += 'Las dos subsecciones están relacionadas: Requerimiento define la meta (kg/ha); Programa son las aplicaciones que la cubren. NO confundir con Fertirriego: son módulos distintos, cada uno con su propio requerimiento y programa. Los cultivos y fertilizantes personalizados que el usuario agrega aquí corresponden a la pestaña Nutrición Granular.\n';
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
        context += 'Las tres subsecciones están relacionadas: Requerimiento define la meta (kg/ha); Programa genera los aportes por etapa; Gráficas comparan aporte vs requerimiento. NO confundir con Nutrición Granular: son módulos distintos, cada uno con su propio requerimiento y programa. Los cultivos y fertilizantes/materias personalizados que el usuario agrega aquí corresponden a la pestaña Fertirriego.\n';
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
        context += 'Subsección Programa de Nutrición (semanas o meses, fertilizantes, aporte programa + agua):\n';
        const prog = f.program;
        if (prog && Array.isArray(prog.weeks) && prog.weeks.length) {
          const timeUnit = prog.timeUnit === 'mes' ? 'mes' : 'semana';
          const isElemental = prog.mode === true || prog.mode === 'elemental';
          context += `  Unidad de tiempo: ${timeUnit} (programa por ${timeUnit}s). Modo unidades: ${isElemental ? 'elemental (P, K, Ca, Mg, S...)' : 'óxido (P₂O₅, K₂O, CaO, MgO, SO₄...)'}\n`;
          context += `  ${timeUnit === 'mes' ? 'Meses' : 'Semanas'}: ${prog.weeks.length}. `;
          if (prog.columns && prog.columns.length) context += `Fertilizantes/materias: ${prog.columns.map(c => c.name || c.materialId || '?').join(', ')}\n`;
          else context += '\n';
          const nutTotals = { N_NO3: 0, N_NH4: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0, S: 0, SO4: 0, Fe: 0, Mn: 0, B: 0 };
          prog.weeks.forEach(w => {
            const t = w.totals || {};
            Object.keys(nutTotals).forEach(n => { nutTotals[n] += parseFloat(t[n]) || 0; });
          });
          const aporteStr = Object.keys(nutTotals).filter(n => nutTotals[n] > 0).map(n => `${n}: ${Math.round(nutTotals[n] * 100) / 100}`).join(', ');
          if (aporteStr) context += `  Aporte total del programa (kg/ha): ${aporteStr}\n`;
        } else context += '  Sin programa guardado.\n';
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
        context += 'Las dos subsecciones están relacionadas: Solución por etapa define el objetivo (ppm/meq por etapa); Cálculo de fertilizantes usa ese objetivo, resta el aporte del agua, y calcula fertilizantes y dosis para cubrir el requerimiento.\n';
        context += 'Subsección Solución por etapa: el usuario define meq/L; la plataforma calcula % meq (aniones NO3+P+S=100%; cationes K+Ca+Mg=100% en triángulo; NH4 % total catiónico) y ppm = meq×peso equivalente del ELEMENTO (P-H2PO4→31 ppm P, S-SO4→16 ppm S, N 14, K 39.1, Ca 20.04, Mg 12.15) para que el usuario vea ppm elemental y pueda comparar con análisis/etiquetas. Diagrama ternario: referencia tipo Steiner en NutriPlant — aniones NO3 20–80%, H2PO4 1.25–10%, SO4 10–70%; cationes K 10–65%, Ca 22.5–62.5%, Mg 0.5–40%. Dentro = equilibrio; fuera = riesgo antagonismos/precipitados. Misma lógica en la calculadora meq/ppm de la plataforma.\n';
        context += 'Subsección Solución por etapa (datos): etapas con objetivo meq/L y ppm; triángulo de equivalentes.\n';
        if (Array.isArray(hydro.stages) && hydro.stages.length) {
          context += `Etapas (guardado): ${hydro.stages.map(s => s.name || s.id || '—').join(', ')}\n`;
          const active = hydro.stages.find(s => s.id === (hydro.activeStageId || hydro.stages[0]?.id));
          if (active && active.ppm && typeof active.ppm === 'object') {
            const ppm = Object.entries(active.ppm).filter(([, v]) => v != null && Number(v) !== 0).map(([k, v]) => `${k}:${v}`).slice(0, 12).join(', ');
            if (ppm) context += `Objetivo ppm (etapa activa): ${ppm}\n`;
          }
        }
        context += 'Subsección Cálculo de fertilizantes: objetivo (ppm), análisis de agua (ppm), requerimiento total (ppm), volumen, tanque, inyección; el usuario puede agregar fertilizantes desde un catálogo de fertilizantes disponibles (precargados + personalizados, concentración elemental %).\n';
        const catalog = (hydro.customMaterials && Array.isArray(hydro.customMaterials.items)) ? hydro.customMaterials.items : [];
        if (catalog.length) {
          context += `Catálogo de fertilizantes disponibles (personalizados, % elemental): ${catalog.map(m => {
            const name = m.name || m.id || '?';
            const pcts = ['N_NH4', 'N_NO3', 'P', 'K', 'Ca', 'Mg', 'S'].filter(n => m[n] != null && Number(m[n]) !== 0).map(n => `${n}:${m[n]}%`).slice(0, 7).join(', ');
            return pcts ? `${name} (${pcts})` : name;
          }).join('; ')}\n`;
        }
        if (hydro.volumeWaterM3 != null) context += `Volumen agua: ${hydro.volumeWaterM3} m³; `;
        if (hydro.tankVolumeL != null) context += `Tanque: ${hydro.tankVolumeL} L; `;
        if (hydro.injectionRateLperM3 != null) context += `Relación inyección: ${hydro.injectionRateLperM3} L/m³`;
        const vNum = Number(hydro.volumeWaterM3), tNum = Number(hydro.tankVolumeL), rNum = Number(hydro.injectionRateLperM3);
        if (vNum > 0 && rNum > 0) {
          const concL = vNum * rNum;
          context += `. Volumen concentrado necesario: ${concL.toFixed(1)} L`;
          if (tNum > 0) context += `; recargas de tanque: ${Math.ceil(concL / tNum)}`;
          context += '\n';
        } else if (hydro.injectionRateLperM3 != null) context += '\n';
        if (Array.isArray(hydro.fertilizers) && hydro.fertilizers.length) {
          context += `Fertilizantes añadidos al cálculo (${hydro.fertilizers.length}): ${hydro.fertilizers.map(f => (f.name || f.materialId || '?') + (f.dose != null ? ` dosis ${f.dose}` : '')).join('; ')}\n`;
          if (hydro.fertilizerTotalsPpm && typeof hydro.fertilizerTotalsPpm === 'object') {
            const ppm = Object.entries(hydro.fertilizerTotalsPpm).filter(([, v]) => v && Number(v) !== 0).map(([k, v]) => `${k}: ${v}`).join(', ');
            if (ppm) context += `Totales aporte del cálculo (ppm): ${ppm}\n`;
          }
        }
        context += '\n';
      }
      // BLOQUES EN VIVO HIDROPONÍA (pantalla actual: subsección, volumen/tanque/inyección, objetivo/agua/requerimiento, solución por etapa)
      if (snapshot.module === 'hidroponia') {
        const liveHydro = this.getLiveHidroponiaBlocks();
        if (liveHydro.subsection || liveHydro.volume || liveHydro.objectiveSummary || liveHydro.waterSummary || liveHydro.missingSummary || liveHydro.nitrogenSummary || liveHydro.triangleInfo) {
          context += '--- BLOQUES HIDROPONÍA (PANTALLA ACTUAL) ---\n';
          if (liveHydro.subsection) context += `Subsección visible: ${liveHydro.subsection}\n`;
          if (liveHydro.volume) context += `Volumen/tanque/inyección: ${liveHydro.volume}\n`;
          if (liveHydro.objectiveSummary) context += `Objetivo de solución (ppm): ${liveHydro.objectiveSummary}\n`;
          if (liveHydro.waterSummary) context += `Análisis de agua (ppm): ${liveHydro.waterSummary}\n`;
          if (liveHydro.missingSummary) context += `Requerimiento total (ppm): ${liveHydro.missingSummary}\n`;
          if (liveHydro.subsection === 'Solución por etapa') {
            context += 'Solución nutritiva por etapa (valores en pantalla; úsalos como referencia principal):\n';
            if (liveHydro.nitrogenSummary) context += `  Nitrógeno: ${liveHydro.nitrogenSummary}\n`;
            if (liveHydro.solutionMeqTable) context += `  Tabla meq/L: ${liveHydro.solutionMeqTable}\n`;
            if (liveHydro.solutionPercentTable) context += `  Tabla % meq: ${liveHydro.solutionPercentTable}\n`;
            if (liveHydro.solutionPpmTable) context += `  Tabla ppm: ${liveHydro.solutionPpmTable}\n`;
            if (liveHydro.triangleInfo) context += `  Diagrama ternario (aniones/cationes): ${liveHydro.triangleInfo}\n`;
          }
          if (liveHydro.subsection === 'Cálculo de fertilizantes' && liveHydro.catalogSummary) {
            context += `Catálogo de fertilizantes disponibles (personalizados, % elemental): ${liveHydro.catalogSummary}\n`;
          }
          context += '\n';
        }
      }

      // --- Reportes (generar y gestionar reportes PDF) ---
      if (snapshot.module === 'reportes') {
        context += '--- REPORTES (generar y gestionar reportes PDF) ---\n';
        context += 'Pestaña para generar y gestionar reportes PDF. Cómo hacerlo: botón "Generar Nuevo Reporte PDF" → se abre un modal donde el usuario selecciona qué secciones incluir (Ubicación, Enmiendas, Nutrición granular, Fertirriego, Hidroponía, VPD); marca las que quiera y genera; el PDF se crea solo con esas secciones. También se puede abrir el mismo flujo desde la sección de enmiendas. Lista de reportes generados: cada uno con Descargar (PDF) y Eliminar; se guardan en el proyecto y se sincronizan a la nube.\n';
        const liveReportes = this.getLiveReportesBlocks();
        if (liveReportes.hasNoReportsMessage) {
          context += 'En pantalla: No hay reportes generados aún. El usuario puede pulsar "Generar Nuevo Reporte PDF" y en el modal elegir las secciones a incluir para crear el primero.\n';
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
        context += 'El usuario está en la sección Análisis. Subpestañas: Análisis de Suelo, Solución Nutritiva, Extracto de Pasta, Agua, Foliar (DOP), Fruta (ICC). Cuando está aquí y habla de "análisis de suelo", se refiere a los REPORTES de esta pestaña (bloque "ANÁLISIS DE SUELO (reportes)" más abajo), no al Análisis Inicial de Enmienda.\n';
        const liveSuelo = this.getLiveAnalisisSueloBlocks();
        if (liveSuelo.visible) {
          context += 'ORIGEN "Ideal (referencia)" en Fertilidad (NutriPlant): K/Ca/Mg ppm por defecto = CIC (suma meq/100g Ca+Mg+K+Na+Al+H del mismo reporte) × saturación objetivo (K 5 %, Mg 13 %, Ca 70 %) → meq ideal; luego ppm = meq×(K 391, Mg 121,5, Ca 200,4). P ideal según método (Bray 40, Olsen 25, Merich 40 ppm). MO, N-NO3, Na, S, micros: referencias fijas (botón recargar). Fila Ideal editable: si difiere de la fórmula, usar valores en pantalla. kg/ha diff = (lab−ideal)×0,1×prof(cm)×densidad aparente(g/cm³)×(%raíz/100).\n';
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
              if (liveSuelo.soilFertilityLogic) {
                const L = liveSuelo.soilFertilityLogic;
                const bits = [];
                if (L.cic) bits.push(`CIC ${L.cic} meq/100g`);
                if (L.formulaKCaMgPpm) bits.push(`fórmula NutriPlant K/Ca/Mg ideal ppm = ${L.formulaKCaMgPpm.k} / ${L.formulaKCaMgPpm.ca} / ${L.formulaKCaMgPpm.mg}`);
                if (L.meqCa || L.meqMg || L.meqK) bits.push(`cationes meq/100g Ca ${L.meqCa || '—'} Mg ${L.meqMg || '—'} K ${L.meqK || '—'}`);
                if (L.labK || L.labCa || L.labMg) bits.push(`lab ppm K ${L.labK || '—'} Ca ${L.labCa || '—'} Mg ${L.labMg || '—'}`);
                if (L.idealK || L.idealCa || L.idealMg) bits.push(`Ideal fila K/Ca/Mg ppm ${L.idealK || '—'} / ${L.idealCa || '—'} / ${L.idealMg || '—'}`);
                if (L.idealP) bits.push(`P ideal ${L.idealP} ppm`);
                if (L.pMethod) bits.push(`método P ${L.pMethod}`);
                if (L.depthCm || L.reachPct || L.bulkDensityGcm3) bits.push(`kg/ha factor: prof ${L.depthCm || '—'} cm, raíz ${L.reachPct || '—'} %, dens.ap. ${L.bulkDensityGcm3 || '—'} g/cm³`);
                if (L.kgHaK || L.kgHaCa || L.kgHaMg) bits.push(`kg/ha diff K/Ca/Mg ${L.kgHaK || '—'} / ${L.kgHaCa || '—'} / ${L.kgHaMg || '—'}`);
                if (bits.length) context += 'En pantalla (reporte abierto): ' + bits.join('; ') + '. ';
              }
            }
            context += 'Cada reporte tiene Propiedades físicas, pH y salinidad, Fertilidad del suelo (nivel e ideal), Cationes y CIC.\n';
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
            context += 'Cada reporte tiene m³ riego, CE/RAS/pH, Cationes (kg elemento y óxido), Aniones (kg elemento; P₂O₅ y SO₃ donde aplica), Micronutrimentos y Ácido para neutralizar HCO3/CO3.\n';
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
        context += 'El usuario está en la pestaña Déficit de Presión de Vapor. Los datos de clima ("Obtener del Clima" y Serie VPD por rango) provienen de la ubicación del predio (centro del polígono en Ubicación). Dos calculadoras: Ambiental Simple (temp. aire, humedad; manual o "Obtener del Clima"; "Calcular VPD") y Avanzada (temp. aire, humedad + Temperatura de Hoja °C o Radiación Solar W/m²; "Calcular VPD"). Serie por rango: vista diaria/semanal/mensual y fechas; tablas guardadas por el usuario.\n';
        const liveVPD = this.getLiveVPDBlocks();
        if (liveVPD.visible) {
          if (!liveVPD.hasLocation) {
            context += 'En pantalla: no hay polígono en Ubicación; se muestra aviso para agregar polígono antes de usar la calculadora ambiental y la serie por rango.\n';
          } else {
            if (liveVPD.envTemp || liveVPD.envHumidity) {
              context += `Calculadora Ambiental: Temp. aire ${liveVPD.envTemp || '—'} °C, Humedad ${liveVPD.envHumidity || '—'}% (pueden ser manuales o de "Obtener del Clima"). `;
            }
            if (liveVPD.advAirTemp || liveVPD.advHumidity || liveVPD.leafTemp || liveVPD.solarRadiation) {
              context += `Calculadora Avanzada: Temp. aire ${liveVPD.advAirTemp || '—'} °C, Humedad ${liveVPD.advHumidity || '—'}%; modo ${liveVPD.mode === 'radiation' ? 'Radiación Solar' : 'Temperatura de Hoja'}`;
              if (liveVPD.mode === 'radiation' && liveVPD.solarRadiation) context += `, Radiación ${liveVPD.solarRadiation} W/m² (T hoja se calcula a partir de esto)`;
              else if (liveVPD.mode === 'leaf' && liveVPD.leafTemp) context += `, T hoja ${liveVPD.leafTemp} °C`;
              context += '.\n';
            } else {
              context += 'Calculadora Avanzada: valores sin rellenar o por defecto.\n';
            }
          }
        }
        context += '\n';
      }

      // --- VPD (datos guardados: relación con Ubicación, calculadoras, series por rango) ---
      if (project.vpdAnalysis && typeof project.vpdAnalysis === 'object') {
        const vpd = project.vpdAnalysis;
        const calc = vpd.calculations || {};
        const env = vpd.environmental || {};
        const adv = vpd.advanced || {};
        const temp = vpd.temperature || {};
        const hum = vpd.humidity || {};
        const hasLoc = project.location && project.location.polygon && Array.isArray(project.location.polygon) && project.location.polygon.length >= 3;
        context += '--- DÉFICIT DE PRESIÓN DE VAPOR (VPD) ---\n';
        context += `Ubicación del predio para clima: ${hasLoc ? 'tiene polígono (Obtener del Clima y Serie por Rango usan el centro del polígono)' : 'sin polígono (definir en pestaña Ubicación para usar clima)'}\n`;
        const rangeState = vpd.rangeState || {};
        const rangeTables = Array.isArray(vpd.rangeTables) ? vpd.rangeTables : [];
        if (rangeState.granularity || rangeState.startDate || rangeState.endDate) {
          const gran = rangeState.granularity === 'weekly' ? 'semanal' : (rangeState.granularity === 'monthly' ? 'mensual' : 'diario');
          context += `Serie por rango (última configuración): vista ${gran}`;
          if (rangeState.startDate || rangeState.endDate) context += `, fechas ${rangeState.startDate || '—'} a ${rangeState.endDate || '—'}`;
          context += '\n';
        }
        if (rangeTables.length > 0) {
          const last = rangeTables[rangeTables.length - 1];
          const meta = last && last.meta ? last.meta : {};
          const gran = meta.granularity === 'weekly' ? 'semanal' : (meta.granularity === 'monthly' ? 'mensual' : 'diario');
          context += `Series de rangos guardadas: ${rangeTables.length}. Última: ${gran}`;
          if (meta.startDate || meta.endDate) context += `, ${meta.startDate || ''} a ${meta.endDate || ''}`;
          if (last.summaryRows && last.summaryRows.length) context += `, ${last.summaryRows.length} filas`;
          context += '\n';
        }
        if (calc.vpd != null || env.vpd != null || adv.vpd != null) {
          if (calc.vpd != null) context += `VPD calculado: ${calc.vpd} kPa\n`;
          if (env.vpd != null) context += `VPD ambiental (calculadora simple): ${env.vpd} kPa\n`;
          if (adv.vpd != null) context += `VPD avanzado: ${adv.vpd} kPa\n`;
          if (temp.air != null || temp.leaf != null) context += `Temperatura: aire ${temp.air ?? '—'}, hoja ${temp.leaf ?? '—'} °C\n`;
          if (hum.air != null) context += `Humedad aire: ${hum.air}%\n`;
          if (calc.recommendation) context += `Recomendación: ${calc.recommendation}\n`;
        }
        context += '\n';
      }

      // --- Análisis guardados (reportes suelo, solución nutritiva, extracto pasta, agua, foliar, fruta) ---
      const summariseFoliar = (a) => {
        const mac = (a.macros && typeof a.macros === 'object') ? a.macros : {};
        const mic = (a.micros && typeof a.micros === 'object') ? a.micros : {};
        const optMacro = (a.optimalMacro && typeof a.optimalMacro === 'object') ? a.optimalMacro : {};
        const optMicro = (a.optimalMicro && typeof a.optimalMicro === 'object') ? a.optimalMicro : {};
        const defMacro = { N: 3, P: 0.275, K: 2.5, Ca: 1.25, Mg: 0.4, S: 0.325 };
        const defMicro = { Fe: 150, Mn: 160, Zn: 60, Cu: 15, B: 62.5, Mo: 2.55 };
        const dop = (val, opt) => { const v = parseFloat(val); const o = opt != null && opt !== '' ? parseFloat(opt) : NaN; if (isNaN(v) || isNaN(o) || o === 0) return null; return ((v - o) / o) * 100; };
        const parts = [];
        ['N','P','K','Ca','Mg','S'].forEach(n => {
          const v = mac[n]; const o = optMacro[n] != null && optMacro[n] !== '' ? optMacro[n] : defMacro[n];
          if (v != null && v !== '') { const d = dop(v, o); parts.push(`${n}:${v}%${o != null ? ` opt:${o}%` : ''}${d != null ? ` DOP:${d >= 0 ? '+' : ''}${d.toFixed(1)}%` : ''}`); }
        });
        ['Fe','Mn','Zn','Cu','B','Mo'].forEach(n => {
          const v = mic[n]; const o = optMicro[n] != null && optMicro[n] !== '' ? optMicro[n] : defMicro[n];
          if (v != null && v !== '') { const d = dop(v, o); parts.push(`${n}:${v}${o != null ? ` opt:${o}` : ''}${d != null ? ` DOP:${d >= 0 ? '+' : ''}${d.toFixed(1)}%` : ''}`); }
        });
        const t = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '');
        return t + (parts.length ? ' — ' + parts.join('; ') : '');
      };
      const summariseExtractoPasta = (a) => {
        const g = (a.general && typeof a.general === 'object') ? a.general : {};
        const cat = (a.cations && typeof a.cations === 'object') ? a.cations : {};
        const an = (a.anions && typeof a.anions === 'object') ? a.anions : {};
        const ideal = (a.ideal && typeof a.ideal === 'object') ? a.ideal : {};
        const parts = [];
        if (g.cee != null && g.cee !== '') parts.push(`CE:${g.cee}`);
        if (g.phe != null && g.phe !== '') parts.push(`pH:${g.phe}`);
        if (g.ras != null && g.ras !== '') parts.push(`RAS:${g.ras}`);
        if (cat.k_ppm != null && cat.k_ppm !== '') parts.push(`K:${cat.k_ppm}`);
        if (cat.ca_ppm != null && cat.ca_ppm !== '') parts.push(`Ca:${cat.ca_ppm}`);
        if (cat.mg_ppm != null && cat.mg_ppm !== '') parts.push(`Mg:${cat.mg_ppm}`);
        if (an.no3_ppm != null && an.no3_ppm !== '') parts.push(`NO3:${an.no3_ppm}`);
        const idealParts = [];
        ['k','ca','mg','no3'].forEach(k => { const v = ideal[k] != null && ideal[k] !== '' ? ideal[k] : null; if (v !== null) idealParts.push(`${k.toUpperCase()} ideal:${v}`); });
        const diffParts = [];
        ['k','ca','no3'].forEach(k => {
          const p = k === 'no3' ? (an.no3_ppm != null && an.no3_ppm !== '' ? parseFloat(an.no3_ppm) : NaN) : (cat[k + '_ppm'] != null && cat[k + '_ppm'] !== '' ? parseFloat(cat[k + '_ppm']) : NaN);
          const i = ideal[k] != null && ideal[k] !== '' ? parseFloat(ideal[k]) : NaN;
          if (!isNaN(p) && !isNaN(i)) { const d = p - i; diffParts.push(`${k.toUpperCase()} ${d >= 0 ? '+' : ''}${d.toFixed(0)}`); }
        });
        let line = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '') + (parts.length ? ' — ' + parts.join(', ') : '');
        if (idealParts.length) line += ' | ' + idealParts.join(', ');
        if (diffParts.length) line += ' | diff: ' + diffParts.join(', ');
        return line;
      };
      const summariseSoilReport = (a) => {
        const ph = (a.phSection && a.phSection.ph != null && a.phSection.ph !== '') ? a.phSection.ph : null;
        const fert = (a.fertility && typeof a.fertility === 'object') ? a.fertility : {};
        const ideal = (fert.ideal && typeof fert.ideal === 'object') ? fert.ideal : {};
        const cat = (a.cations && typeof a.cations === 'object') ? a.cations : {};
        const parts = [];
        if (ph != null) parts.push(`pH:${ph}`);
        if (fert.pMethod) parts.push(`P_método:${fert.pMethod}`);
        if (fert.p != null && fert.p !== '') parts.push(`P_lab:${fert.p}`);
        if (fert.k != null && fert.k !== '') parts.push(`K_lab:${fert.k}`);
        if (fert.ca != null && fert.ca !== '') parts.push(`Ca_lab:${fert.ca}`);
        if (fert.mg != null && fert.mg !== '') parts.push(`Mg_lab:${fert.mg}`);
        if (cat.cic != null && cat.cic !== '') parts.push(`CIC:${cat.cic}`);
        const meqBits = [];
        if (cat.ca != null && cat.ca !== '') meqBits.push(`Ca${cat.ca}`);
        if (cat.mg != null && cat.mg !== '') meqBits.push(`Mg${cat.mg}`);
        if (cat.k != null && cat.k !== '') meqBits.push(`K${cat.k}`);
        if (meqBits.length) parts.push(`meq/100g:${meqBits.join(',')}`);
        const idealBits = [];
        if (ideal.k != null && ideal.k !== '') idealBits.push(`K${ideal.k}`);
        if (ideal.ca != null && ideal.ca !== '') idealBits.push(`Ca${ideal.ca}`);
        if (ideal.mg != null && ideal.mg !== '') idealBits.push(`Mg${ideal.mg}`);
        if (ideal.p != null && ideal.p !== '') idealBits.push(`P${ideal.p}`);
        if (idealBits.length) parts.push(`Ideal_ref_ppm:${idealBits.join(',')}`);
        const cicN = parseFloat(String(cat.cic).replace(',', '.'));
        const form = (!isNaN(cicN) && cicN > 0) ? computeNutriPlantSoilKCaMgIdealPpmFromCic(cicN) : null;
        if (form) parts.push(`fórmula_defecto_K/Ca/Mg_ppm:${form.k}/${form.ca}/${form.mg}`);
        let line = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '') + (parts.length ? ' — ' + parts.join(', ') : '');
        return line;
      };
      const summariseSolucionNutritiva = (a) => {
        const t = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '');
        const cat = (a.cations && typeof a.cations === 'object') ? a.cations : {};
        const an = (a.anions && typeof a.anions === 'object') ? a.anions : {};
        const ideal = (a.ideal && typeof a.ideal === 'object') ? a.ideal : {};
        const ppmVal = (key, isCat) => { const o = isCat ? cat : an; const v = o[key + '_ppm']; return (v != null && v !== '') ? parseFloat(v) : NaN; };
        const idealVal = (key) => { const v = ideal[key]; return (v != null && v !== '') ? parseFloat(v) : NaN; };
        const parts = [];
        ['k','ca','mg','na'].forEach(k => { const v = ppmVal(k, true); if (!isNaN(v)) parts.push(`${k.toUpperCase()}:${v}`); });
        ['no3','so4','po4'].forEach(k => { const v = ppmVal(k, false); if (!isNaN(v)) parts.push(`${k === 'no3' ? 'NO3' : k.toUpperCase()}:${v}`); });
        const idealParts = [];
        ['k','ca','mg','no3'].forEach(k => { const v = idealVal(k); if (!isNaN(v)) idealParts.push(`${k.toUpperCase()} ideal:${v}`); });
        const diffParts = [];
        ['k','ca','no3'].forEach(k => {
          const isCat = k !== 'no3';
          const p = ppmVal(k, isCat);
          const i = idealVal(k);
          if (!isNaN(p) && !isNaN(i)) { const d = p - i; diffParts.push(`${k.toUpperCase()} ${d >= 0 ? '+' : ''}${d.toFixed(0)}`); }
        });
        let line = t;
        if (parts.length) line += ' — ' + parts.join(', ');
        if (idealParts.length) line += ' | ' + idealParts.join(', ');
        if (diffParts.length) line += ' | diff: ' + diffParts.join(', ');
        return line;
      };

      if (Array.isArray(project.soilAnalyses) && project.soilAnalyses.length) {
        context += '--- ANÁLISIS DE SUELO (reportes en pestaña Análisis — NO es el Análisis Inicial de Enmienda) ---\n';
        project.soilAnalyses.forEach(a => { context += `• ${summariseSoilReport(a)}\n`; });
        context += '\n';
      }
      if (Array.isArray(project.solucionNutritivaAnalyses) && project.solucionNutritivaAnalyses.length) {
        context += '--- ANÁLISIS SOLUCIÓN NUTRITIVA ---\n';
        context += 'En cada reporte: valores (ppm), ideales (editables por el usuario) y diff = nivel − ideal; (−) falta, (+) exceso.\n';
        project.solucionNutritivaAnalyses.forEach(a => { context += `• ${summariseSolucionNutritiva(a)}\n`; });
        context += '\n';
      }
      if (Array.isArray(project.extractoPastaAnalyses) && project.extractoPastaAnalyses.length) {
        context += '--- ANÁLISIS EXTRACTO DE PASTA ---\n';
        context += 'En cada reporte: valores (ppm), ideales (editables por el usuario) y diff = nivel − ideal; (−) falta, (+) exceso.\n';
        project.extractoPastaAnalyses.forEach(a => { context += `• ${summariseExtractoPasta(a)}\n`; });
        context += '\n';
      }
      const summariseAgua = (a) => {
        const cat = (a.cations && typeof a.cations === 'object') ? a.cations : {};
        const an = (a.anions && typeof a.anions === 'object') ? a.anions : {};
        const g = (a.general && typeof a.general === 'object') ? a.general : {};
        const micros = (a.micros && typeof a.micros === 'object') ? a.micros : {};
        const parts = [];
        if (a.m3Riego != null && a.m3Riego !== '') parts.push(`m³:${a.m3Riego}`);
        if (g.ce != null && g.ce !== '') parts.push(`CE:${g.ce}`);
        if (g.ph != null && g.ph !== '') parts.push(`pH:${g.ph}`);
        if (g.ras != null && g.ras !== '') parts.push(`RAS:${g.ras}`);
        if (cat.ca_ppm != null && cat.ca_ppm !== '') parts.push(`Ca:${cat.ca_ppm}`);
        if (cat.mg_ppm != null && cat.mg_ppm !== '') parts.push(`Mg:${cat.mg_ppm}`);
        if (cat.k_ppm != null && cat.k_ppm !== '') parts.push(`K:${cat.k_ppm}`);
        if (cat.na_ppm != null && cat.na_ppm !== '') parts.push(`Na:${cat.na_ppm}`);
        if (an.no3_ppm != null && an.no3_ppm !== '') parts.push(`NO3:${an.no3_ppm}`);
        if (an.so4_ppm != null && an.so4_ppm !== '') parts.push(`SO4:${an.so4_ppm}`);
        if (an.hco3_meq != null && an.hco3_meq !== '') parts.push(`HCO3:${an.hco3_meq}meq`);
        if (an.co3_meq != null && an.co3_meq !== '') parts.push(`CO3:${an.co3_meq}meq`);
        if (a.acidResidualMeq != null && a.acidResidualMeq !== '') parts.push(`residual:${a.acidResidualMeq}meq/L`);
        if (a.acidId != null && a.acidId !== '') parts.push(`ácido:${a.acidId}`);
        ['b','fe','mn','cu','zn'].forEach(k => { if (micros[k] != null && micros[k] !== '') parts.push(`${k}:${micros[k]}ppm`); });
        const t = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '');
        return t + (parts.length ? ' — ' + parts.join(', ') : '');
      };
      if (Array.isArray(project.aguaAnalyses) && project.aguaAnalyses.length) {
        context += '--- ANÁLISIS DE AGUA ---\n';
        context += 'Valores que el usuario ha ingresado en cada reporte (m³, CE/pH/RAS, cationes y aniones en ppm o meq, residual objetivo, ácido seleccionado, micronutrientes).\n';
        project.aguaAnalyses.forEach(a => { context += `• ${summariseAgua(a)}\n`; });
        context += '\n';
      }
      if (Array.isArray(project.foliarAnalyses) && project.foliarAnalyses.length) {
        context += '--- ANÁLISIS FOLIAR (DOP) ---\n';
        context += 'En cada reporte: resultado (laboratorio), óptimo (% o mg/kg, editable por el usuario) y DOP % = ((Valor−Óptimo)/Óptimo)×100. Si el usuario editó óptimos, aparecen en "opt"; el DOP se calcula con ese óptimo.\n';
        project.foliarAnalyses.forEach(a => { context += `• ${summariseFoliar(a)}\n`; });
        context += '\n';
      }
      const summariseFruta = (a) => {
        const mac = (a.macros && typeof a.macros === 'object') ? a.macros : {};
        const mic = (a.micros && typeof a.micros === 'object') ? a.micros : {};
        const calidad = (a.calidad && typeof a.calidad === 'object') ? a.calidad : {};
        const calcio = (a.calcio && typeof a.calcio === 'object') ? a.calcio : {};
        const optMacro = (a.optimalMacro && typeof a.optimalMacro === 'object') ? a.optimalMacro : {};
        const optMicro = (a.optimalMicro && typeof a.optimalMicro === 'object') ? a.optimalMicro : {};
        const optCalidad = (a.optimalCalidad && typeof a.optimalCalidad === 'object') ? a.optimalCalidad : {};
        const optCalcio = (a.optimalCalcio && typeof a.optimalCalcio === 'object') ? a.optimalCalcio : {};
        const defMacro = { N: 1.8, P: 0.25, K: 1.5, Ca: 0.25, Mg: 0.2, S: 0.18 };
        const defMicro = { Fe: 80, Mn: 40, Zn: 35, Cu: 10, B: 50, Mo: 0.5 };
        const defCalidad = { materiaSeca: 15, brix: 12, firmeza: 5, acidezTitulable: 0.5 };
        const defCalcio = { caTotal: 20, caSolublePct: 18, caLigadoPct: 25, caInsolublePct: 55 };
        const icc = (val, opt) => { const v = parseFloat(val); const o = opt != null && opt !== '' ? parseFloat(opt) : NaN; if (isNaN(v) || isNaN(o) || o === 0) return null; return ((v - o) / o) * 100; };
        const getOpt = (obj, def, k) => (obj[k] != null && obj[k] !== '') ? obj[k] : def[k];
        const parts = [];
        ['N','P','K','Ca','Mg','S'].forEach(n => {
          const v = mac[n]; const o = getOpt(optMacro, defMacro, n);
          if (v != null && v !== '') { const i = icc(v, o); parts.push(`Macro ${n}:${v}%${o != null ? ` opt:${o}%` : ''}${i != null ? ` ICC:${i >= 0 ? '+' : ''}${i.toFixed(1)}%` : ''}`); }
        });
        ['Fe','Mn','Zn','Cu','B','Mo'].forEach(n => {
          const v = mic[n]; const o = getOpt(optMicro, defMicro, n);
          if (v != null && v !== '') { const i = icc(v, o); parts.push(`Micro ${n}:${v} opt:${o != null ? o : '—'}${i != null ? ` ICC:${i >= 0 ? '+' : ''}${i.toFixed(1)}%` : ''}`); }
        });
        ['materiaSeca','brix','firmeza','acidezTitulable'].forEach(k => {
          const v = calidad[k]; const o = getOpt(optCalidad, defCalidad, k);
          if (v != null && v !== '') { const i = icc(v, o); parts.push(`Calidad ${k}:${v} opt:${o != null ? o : '—'}${i != null ? ` ICC:${i >= 0 ? '+' : ''}${i.toFixed(1)}%` : ''}`); }
        });
        ['caTotal','caSolublePct','caLigadoPct','caInsolublePct'].forEach(k => {
          const v = calcio[k]; const o = getOpt(optCalcio, defCalcio, k);
          if (v != null && v !== '') parts.push(`Ca ${k}:${v} opt:${o != null ? o : '—'}`);
        });
        const t = (a.title || 'Sin título') + (a.date ? ` (${a.date})` : '');
        return t + (parts.length ? ' — ' + parts.join('; ') : '');
      };
      if (Array.isArray(project.frutaAnalyses) && project.frutaAnalyses.length) {
        context += '--- ANÁLISIS DE FRUTA (ICC) ---\n';
        context += 'En cada reporte: resultado (laboratorio), óptimo (editable) e ICC % = ((Valor−Óptimo)/Óptimo)×100. Incluye macros/micros en fruta, parámetros de calidad (materia seca, °Brix, firmeza, acidez) y calcio en fruta (Ca total, % soluble, % ligado, % insoluble). Si el usuario editó óptimos, aparecen en "opt".\n';
        project.frutaAnalyses.forEach(a => { context += `• ${summariseFruta(a)}\n`; });
        context += '\n';
      }

      if (snapshot.signals && snapshot.signals.length) {
        context += '--- SEÑALES CRUZADAS ENTRE MÓDULOS ---\n';
        snapshot.signals.forEach(signal => {
          context += `• ${signal}\n`;
        });
        context += '\n';
      }

      // Volcado completo: toda la información del proyecto en un bloque para que la IA la interprete con su conocimiento agronómico (no hace falta dar contexto pantalla por pantalla).
      const fullDump = this.getFullProjectDump(project);
      if (fullDump) {
        context += '--- VOLCADO COMPLETO DEL PROYECTO (toda la información disponible; usa tu conocimiento agronómico para interpretarla y responder) ---\n';
        context += fullDump + '\n\n';
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





















