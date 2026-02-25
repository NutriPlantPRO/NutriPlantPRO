// =====================
// 1) Configuración base
// =====================
const SHEETS = [
  "Inicio",
  "Fertirriego",
  "Hidroponia",
  "Reporte"
];

const ICONS = {
  "Inicio": "📊",
  "Fertirriego": "💧",
  "Hidroponia": "💧",
  "Reporte": "📄",
  // vistas auxiliares (no aparecen en menú)
  "Ubicación": "📍",
  "Enmienda": "🚜",
  "Nutricion Granular": "⚪",
  "Análisis: Suelo": "🌱🟫",
      "Análisis: Solución Nutritiva": "🧪💧",
  "Análisis: Extracto de Pasta": "🧪📋",
  "Análisis: Agua": "💧🔬",
  "Análisis: Foliar": "🍃🔍",
  "Análisis: Fruta": "🍎🔬",
  "Análisis: Déficit de Presión de Vapor": "🌡️📊",
};

// Referencias al DOM del panel
const menu  = document.getElementById("menu");
const view  = document.getElementById("view");
const title = document.getElementById("sectionTitle");
const sbStack = document.getElementById("sbStack");

// Función para manejar la visibilidad del texto en el sidebar
function handleSidebarTextVisibility() {
  const sidebar = document.querySelector('.sidebar');
  const labels = sidebar.querySelectorAll('.sidebar a .label');
  
  if (sidebar.matches(':hover')) {
    // Sidebar expandido - mostrar texto
    labels.forEach(label => {
      label.style.display = 'inline';
      label.style.opacity = '1';
      label.style.visibility = 'visible';
    });
  } else {
    // Sidebar colapsado - ocultar texto
    labels.forEach(label => {
      label.style.display = 'none';
      label.style.opacity = '0';
      label.style.visibility = 'hidden';
    });
  }
}

// Agregar listeners para el sidebar
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.addEventListener('mouseenter', handleSidebarTextVisibility);
    sidebar.addEventListener('mouseleave', handleSidebarTextVisibility);
    
    // Ejecutar inmediatamente al cargar la página
    handleSidebarTextVisibility();
  }
});

// ============================
// 2) Plantilla por cada sección
// ============================
function sectionTemplate(name) {
  if (name === "Inicio") {
    return `
      <div class="card">
        <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h2 class="text-xl">📊 Inicio</h2>
        </div>

        <section>
          <h3 class="text-xl" style="margin:6px 0 10px;">📁 Proyectos recientes</h3>
          <div id="np-projects-list" class="grid-3"></div>
          <div id="np-empty-state" class="help" style="display:none;">
            Aún no hay proyectos. Crea tu primer <b>NUTRIPLANT</b>.
          </div>
        </section>
      </div>

      <!-- Modal crear proyecto -->
      <dialog id="dlg-new-project" class="card" style="max-width:560px;">
        <form method="dialog" id="form-new-project">
          <h3 class="text-xl" style="margin-bottom:12px;">📝 Nuevo NUTRIPLANT</h3>

          <div class="row" style="gap:12px;">
            <div style="flex:1;">
              <label>Título del proyecto *</label>
              <input id="np-title" required placeholder="Ej. Aguacate Lote 3 Primavera 2026"
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <label>Campo / Sector / Finca (opcional)</label>
              <input id="np-campo" placeholder="Lote 3 / Finca San José"
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
            <div style="flex:1;">
              <label>Cultivo (opcional)</label>
              <input id="np-cultivo" placeholder="Aguacate / Limón / ..."
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <label>Rendimiento esperado (opcional)</label>
              <input id="np-rend" type="number" step="any" placeholder="Ej. 12"
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
            <div style="width:160px;">
              <label>Unidad</label>
              <select id="np-unidad" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;">
                <option value="t/ha">t/ha</option>
                <option value="kg/ha">kg/ha</option>
              </select>
            </div>
          </div>

          <div class="row" style="justify-content:flex-end; margin-top:14px;">
            <button type="button" class="btn btn-pill" id="btn-cancel-new">Cancelar</button>
            <button type="submit" class="btn btn-pill btn-primary">Crear</button>
          </div>
        </form>
      </dialog>
    `;
  }

  if (name === "Fertirriego") {
    return `
      <div class="fertirriego-container">
        <!-- Header -->
        <div class="fertirriego-header">
          <!-- El título principal ya está en el header global -->
        </div>

        <!-- Pestañas principales -->
        <div class="fertirriego-tabs">
          <button class="tab-button active" data-tab="extraccion">
            <span class="tab-icon">📋</span>
            <span class="tab-text">Requerimiento Nutricional</span>
          </button>
          <button class="tab-button" data-tab="programa">
            <span class="tab-icon">🌱</span>
            <span class="tab-text">Programa de Nutrición</span>
          </button>
          <button class="tab-button" data-tab="graficas">
            <span class="tab-icon">📈</span>
            <span class="tab-text">Gráficas</span>
          </button>
        </div>

        <!-- Contenido de las pestañas -->
        <div class="fertirriego-content">
          <!-- Pestaña Requerimiento Nutricional -->
          <div class="tab-content active" id="extraccion">
            <div class="extraction-calculator">
              <div class="crop-selection">
                <div class="form-group">
                  <label>Cultivo</label>
                  <select id="cropType">
                    <option value="aguacate">Aguacate</option>
                    <option value="citricos">Cítricos</option>
                    <option value="tomate">Tomate</option>
                    <option value="pepino">Pepino</option>
                    <option value="pimiento">Pimiento</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Rendimiento Objetivo (ton/ha)</label>
                  <input type="number" id="targetYield" step="0.1" min="1" max="100" placeholder="25">
                </div>
                <div class="form-group">
                  <label>Superficie (ha)</label>
                  <input type="number" id="surfaceArea" step="0.1" min="0.1" max="1000" placeholder="1.0">
                </div>
              </div>
              <div class="extraction-results">
                <h4>Requerimientos de Nutrientes (kg/ha)</h4>
                <div class="nutrients-grid" id="nutrientsGrid">
                  <!-- Se llenará dinámicamente -->
                </div>
              </div>
            </div>
          </div>

          <!-- Pestaña Programa -->
          <div class="tab-content" id="programa">
            <div class="fertigation-program">
              <div class="program-controls">
                <button class="btn btn-primary" onclick="generateFertigationProgram()">Generar Programa</button>
                <button class="btn btn-secondary" onclick="exportProgram()">Exportar</button>
              </div>
              <div class="program-table" id="programTable">
                <!-- Se llenará dinámicamente -->
              </div>
            </div>
          </div>

          <!-- Pestaña Gráficas -->
          <div class="tab-content" id="graficas">
            <div class="charts-container">
              <div class="charts-grid">
                <div class="chart-container">
                  <h4>Macronutrientes</h4>
                  <canvas id="macroChart"></canvas>
                </div>
                <div class="chart-container">
                  <h4>Micronutrientes</h4>
                  <canvas id="microChart"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (name === "Enmienda") {
    return `
      <div class="enmienda-container">
        <div class="enmienda-header">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">🚜 Calculadora de Enmiendas</h2>
          <p class="text-gray-600">Cálculo de enmiendas para ajuste de CIC del suelo</p>
        </div>

        <div class="enmienda-content">
          <!-- Análisis de Suelo Inicial -->
          <div class="analysis-section">
            <h3 class="section-title">📊 Análisis de Suelo Inicial</h3>
            <div class="analysis-grid">
              <div class="analysis-item">
                <label>Potasio (K) meq/100g:</label>
                <input type="number" id="k-initial" step="0.01" value="1.00" class="analysis-input">
              </div>
              <div class="analysis-item">
                <label>Calcio (Ca) meq/100g:</label>
                <input type="number" id="ca-initial" step="0.01" value="12.00" class="analysis-input">
              </div>
              <div class="analysis-item">
                <label>Magnesio (Mg) meq/100g:</label>
                <input type="number" id="mg-initial" step="0.01" value="3.00" class="analysis-input">
              </div>
              <div class="analysis-item">
                <label>Hidrógeno (H) meq/100g:</label>
                <input type="number" id="h-initial" step="0.01" value="0.00" class="analysis-input">
              </div>
              <div class="analysis-item">
                <label>Sodio (Na) meq/100g:</label>
                <input type="number" id="na-initial" step="0.01" value="2.00" class="analysis-input">
              </div>
              <div class="analysis-item">
                <label>Aluminio (Al) meq/100g:</label>
                <input type="number" id="al-initial" step="0.01" value="0.00" class="analysis-input">
              </div>
              <div class="analysis-item cic-total-item">
                <label>CIC Total meq/100g:</label>
                <input type="number" id="cic-total" step="0.01" value="18.00" class="analysis-input cic-total-input" readonly>
              </div>
            </div>
          </div>

          <!-- Objetivos de Ajuste -->
          <div class="target-section">
            <h3 class="section-title">🎯 Objetivos de Ajuste</h3>
            <div class="target-grid">
              <div class="target-item">
                <label>% K objetivo:</label>
                <input type="number" id="k-target" step="0.01" value="6" class="target-input">
              </div>
              <div class="target-item">
                <label>% Ca objetivo:</label>
                <input type="number" id="ca-target" step="0.01" value="77" class="target-input">
              </div>
              <div class="target-item">
                <label>% Mg objetivo:</label>
                <input type="number" id="mg-target" step="0.01" value="17" class="target-input">
              </div>
              <div class="target-item">
                <label>% H objetivo:</label>
                <input type="number" id="h-target" step="0.01" value="0" class="target-input">
              </div>
              <div class="target-item">
                <label>% Na objetivo:</label>
                <input type="number" id="na-target" step="0.01" value="0" class="target-input">
              </div>
              <div class="target-item">
                <label>% Al objetivo:</label>
                <input type="number" id="al-target" step="0.01" value="0" class="target-input">
              </div>
            </div>
          </div>

          <!-- Propiedades del Suelo -->
          <div class="soil-properties">
            <h3 class="section-title">🌱 Propiedades del Suelo</h3>
            <div class="properties-grid">
              <div class="property-item">
                <label>Densidad aparente (g/cm³):</label>
                <input type="number" id="soil-density" step="0.01" value="1.1" class="property-input">
              </div>
              <div class="property-item">
                <label>Profundidad (cm):</label>
                <input type="number" id="soil-depth" step="1" value="30" class="property-input">
              </div>
            </div>
          </div>

          <!-- Botón de Cálculo -->
          <div class="calculation-actions">
            <button id="calculate-amendment" class="btn-calculate">🧮 Calcular Enmienda</button>
            <button id="reset-amendment" class="btn-reset">🔄 Reiniciar</button>
          </div>

          <!-- Resultados -->
          <div id="amendment-results" class="results-section" style="display: none;">
            <h3 class="section-title">📋 Resultados del Cálculo</h3>
            <div class="results-grid">
              <div class="result-item">
                <label>Enmienda recomendada:</label>
                <span id="amendment-type" class="result-value">-</span>
              </div>
              <div class="result-item">
                <label>Cantidad (Kg/Ha):</label>
                <span id="amendment-amount" class="result-value">-</span>
              </div>
              <div class="result-item">
                <label>Ca a aportar (Kg/Ha):</label>
                <span id="ca-contribution" class="result-value">-</span>
              </div>
              <div class="result-item">
                <label>Na a remover (Kg/Ha):</label>
                <span id="na-removal" class="result-value">-</span>
              </div>
            </div>
          </div>

          <!-- Tabla de Propiedades de Enmiendas -->
          <div class="amendments-table">
            <h3 class="section-title">📚 Propiedades de Enmiendas</h3>
            <div class="table-container">
              <table class="amendments-table-content">
                <thead>
                  <tr>
                    <th>Enmienda</th>
                    <th>Fórmula</th>
                    <th>Peso Molecular</th>
                    <th>% Ca</th>
                    <th>% SO₄</th>
                    <th>% H₂O</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Yeso Agrícola</td>
                    <td>CaSO₄ + 2H₂O</td>
                    <td>170</td>
                    <td>23.53</td>
                    <td>56.5</td>
                    <td>21.2</td>
                  </tr>
                  <tr>
                    <td>Cal Agrícola</td>
                    <td>CaCO₃</td>
                    <td>100</td>
                    <td>40.0</td>
                    <td>-</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>Cal Dolomita</td>
                    <td>CaCO₃ + MgCO₃</td>
                    <td>184</td>
                    <td>21.7</td>
                    <td>-</td>
                    <td>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (name === "Nutricion Granular") {
    return `
      <div class="card"><h2 class="text-xl">⚪ Nutrición Granular</h2>
      <p>Contenido de Nutrición Granular (placeholder).</p></div>
    `;
  }

  if (name === "Hidroponia") {
    return `
      <div class="card"><h2 class="text-xl">💧 Hidroponia</h2>
      <p>Contenido de Hidroponia (placeholder).</p></div>
    `;
  }

  if (name === "Reporte") {
    return `
      <div class="card"><h2 class="text-xl">📄 Reporte</h2>
      <p>Exportar PDF/CSV (placeholder).</p></div>
    `;
  }

  if (name === "Ubicación") {
    return `
      <div class="location-container">
        <div class="location-header">
          <div class="header-left">
            <div class="location-title-section">
              <button id="centerOnPolygon" class="location-title-button">
                <span class="title-icon">📍</span>
                <span class="title-text">Ubicación del Predio</span>
                <span class="title-arrow">→</span>
              </button>
            </div>
            <div class="location-stats">
              <div class="stat-item">
                <span class="stat-label">Superficie:</span>
                <span class="stat-value" id="areaDisplay">0.00 ha</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Perímetro:</span>
                <span class="stat-value" id="perimeterDisplay">0.00 m</span>
              </div>
              <div class="stat-item coordinates">
                <span class="stat-label">Coordenadas:</span>
                <span class="stat-value" id="coordinatesDisplay">No seleccionadas</span>
              </div>
            </div>
          </div>
          <div class="location-controls">
            <button id="centerOnUserLocation" class="btn btn-secondary">📍 Mi Ubicación</button>
            <button id="clearPolygon" class="btn btn-secondary">Limpiar</button>
            <button id="saveLocation" class="btn">Guardar Predio</button>
          </div>
        </div>
        
        <div class="map-container">
          <div id="map" class="map"></div>
          <div class="map-overlay">
            <div class="instructions">
              <p>📍 Haz clic en el mapa para trazar tu parcela</p>
              <p>🔄 Haz doble clic para cerrar el polígono</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Análisis (vistas auxiliares llamadas desde la tarjeta lateral)
  if (name === "Análisis: Suelo")     return `<div class="card"><h2 class="text-xl">🔬 Análisis de Suelo</h2><p>Placeholder.</p></div>`;
  if (name === "Análisis: Solución Nutritiva")  return `<div class="card"><h2 class="text-xl">🔬 Solución Nutritiva</h2><p><em>Análisis: Solución Nutritiva o Extracto de Pasta Saturada</em></p><p>Placeholder.</p></div>`;
  if (name === "Análisis: Extracto de Pasta")   return `<div class="card"><h2 class="text-xl">🔬 Extracto de Pasta</h2><p><em>Análisis: Extracto de Pasta Saturada</em></p><p>Placeholder.</p></div>`;
  if (name === "Análisis: Agua")      return `<div class="card"><h2 class="text-xl">🔬 Análisis de Agua</h2><p>Placeholder.</p></div>`;
  if (name === "Análisis: Foliar")    return `<div class="card"><h2 class="text-xl">🔬 Análisis Foliar</h2><p>Placeholder.</p></div>`;
  if (name === "Análisis: Fruta") return `<div class="card"><h2 class="text-xl">🍎 Análisis de Fruta</h2><p><em>Análisis: Fruta</em></p><p>Placeholder.</p></div>`;
  if (name === "Análisis: Déficit de Presión de Vapor") return `<div class="card"><h2 class="text-xl">🌡️ Déficit de Presión de Vapor</h2><p><em>Análisis: Déficit de Presión de Vapor (VPD)</em></p><p>Placeholder.</p></div>`;

  return `<div class="card"><p>Sección: ${name}</p></div>`;
}

// ===================================
// 3) Selector de sección (cambia vista)
// ===================================
function highlightStack(name) {
  // Mapa para las secciones principales (usa data-section="…")
  const MAIN_MAP = {
    "Inicio":     "inicio",
    "Ubicación":  "ubicacion",
    "Enmienda":   "enmienda",
    "Nutricion Granular": "nutricion-granular",
    "Fertirriego":"fertirriego",
    "Hidroponia": "hidroponia",
    "Reporte":    "reporte",
  };
  // Mapa para las vistas de análisis (tus chips usan data-section="suelo|extracto|pasta|agua|foliar|vpd")
  const ANALYSIS_MAP = {
    "Análisis: Suelo":    "suelo",
    "Análisis: Solución Nutritiva": "extracto",
    "Análisis: Extracto de Pasta": "pasta",
    "Análisis: Agua":     "agua",
    "Análisis: Foliar":   "foliar",
    "Análisis: Fruta":    "fruta",
    "Análisis: Déficit de Presión de Vapor": "vpd",
  };

  const stack = document.getElementById("sbStack");
  if (!stack) return;

  // 1) limpiar "active" en todos los ítems del stack
  stack.querySelectorAll("[data-section], [data-go]").forEach(n => n.classList.remove("active"));

  // 2) marcar el que corresponda
  const keyMain = MAIN_MAP[name];
  if (keyMain) {
    const el = stack.querySelector(`[data-section="${keyMain}"]`);
    if (el) el.classList.add("active");
    return;
  }

  const keyAnalysis = ANALYSIS_MAP[name];
  if (keyAnalysis) {
    const el = stack.querySelector(`[data-section="${keyAnalysis}"]`);
    if (el) el.classList.add("active");
  }
}

function selectSection(name, el) {
  if (menu) {
    menu.querySelectorAll("a").forEach(a => a.classList.remove("active"));
    if (el) el.classList.add("active");
    else {
      const anchor = menu.querySelector(`a[data-section="${(name || "").toLowerCase()}"]`);
      if (anchor) anchor.classList.add("active");
    }
  }

  if (title) title.textContent = name;
  if (view)  view.innerHTML = sectionTemplate(name);

  // Agregar indicador de proyecto en todas las secciones
  addProjectIndicator(view);

  // Inicializar mapa si es la sección de ubicación
  if (name === "Ubicación") {
    setTimeout(() => {
      if (typeof initLocationMap === 'function') {
        initLocationMap();
      }
    }, 100);
  }

  if (name === "Enmienda") {
    setTimeout(() => {
      initializeEnmiendaCalculator();
    }, 100);
  }

  // Mostrar/ocultar botón "Nuevo NutriPlant" solo en Inicio
  const btnNewNutriplant = document.getElementById("btn-new-nutriplant");
  if (btnNewNutriplant) {
    if (name === "Inicio") {
      btnNewNutriplant.style.display = "inline-flex";
    } else {
      btnNewNutriplant.style.display = "none";
    }
  }

  if (name === "Inicio") {
    setTimeout(() => np_initInicio(), 0);
  }

  highlightStack(name);
}

// =====================================
// 4) Render del menú lateral y listeners
// =====================================
function renderMenu() {
  if (!menu) return;
  menu.innerHTML = "";

  const sections = ["Inicio"];

  sections.forEach((name, idx) => {
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.section = name.toLowerCase();
    a.innerHTML = `<span class="icon">📊</span><span class="label">${name}</span>`;
    if (idx === 0) a.classList.add("active");
    a.addEventListener("click", (e) => { e.preventDefault(); selectSection(name, a); });
    menu.appendChild(a);
  });

  renderSidebarCards();
  
  // Ejecutar después de renderizar el menú
  setTimeout(() => handleSidebarTextVisibility(), 0);
}

// ==========================
// 4.1) Tarjetas del sidebar
// ==========================
function renderSidebarCards(){
  if (!sbStack) return;
  sbStack.innerHTML = "";

  const currentId = np_getCurrentProjectId();
  const hasProject = !!currentId;
  
  // Verificar si hay proyectos disponibles
  const allProjects = np_allProjects();
  
  if (!hasProject) {
    // Si no hay proyecto seleccionado pero hay proyectos disponibles, seleccionar el primero
    if (allProjects && allProjects.length > 0) {
      np_setCurrentProject(allProjects[0].id);
      const p = np_getProject(allProjects[0].id);
      if (p) {
        renderProjectCards(p);
      }
    }
    return;
  }

  const p = np_getProject(currentId);
  if (!p) return;
  
  renderProjectCards(p);
}

function renderProjectCards(p) {
  if (!sbStack) return;
  
  // TARJETA DEL TÍTULO DEL PROYECTO (por fuera, con espacio fijo)
  const titleCard = document.createElement("div");
  titleCard.className = "sb-title-card";
  titleCard.innerHTML = `
    <div class="project-title">
      <span class="project-icon" data-icon="🗂️" title="${escapeHtml(p.title)}">🗂️</span>
      <span class="text">${escapeHtml(p.title)}</span>
    </div>
  `;
  sbStack.appendChild(titleCard);

  // TARJETA DE INFORMACIÓN (por dentro, sin botón cambiar)
  const card1 = document.createElement("div");
  card1.className = "sb-card";
  card1.innerHTML = `
    <div class="title">
      <div class="t">
        <span class="info-icon" data-icon="ℹ️" title="Proyecto">ℹ️</span>
        <span class="text">Proyecto</span>
      </div>
    </div>
    <div class="sb-chiprow">
      <button class="sb-chip" data-section="ubicacion">📍 <span class="text">Ubicación</span></button>
      <button class="sb-chip" data-section="enmienda">🚜 <span class="text">Enmienda</span></button>
      <button class="sb-chip" data-section="nutricion-granular">⚪ <span class="text">Nutrición Granular</span></button>
      <button class="sb-chip" data-section="fertirriego">📈 <span class="text">Fertirriego</span></button>
      <button class="sb-chip" data-section="hidroponia">💧 <span class="text">Hidroponia</span></button>
      <button class="sb-chip" data-section="reporte">📄 <span class="text">Reporte</span></button>
    </div>
  `;
  sbStack.appendChild(card1);

  const card2 = document.createElement("div");
card2.className = "sb-card";
card2.innerHTML = `
  <div class="title">
    <div class="t"><span class="analysis-icon" data-icon="🔬" title="Análisis">🔬</span><span class="text">Análisis</span></div>
  </div>
  <div class="sb-chiprow">
    <button class="sb-chip" data-section="suelo">🟤 <span class="text">Suelo</span></button>
    <button class="sb-chip" data-section="extracto">🧪 <span class="text">Solución Nutritiva</span></button>
    <button class="sb-chip" data-section="pasta">📋 <span class="text">Extracto de Pasta</span></button>
    <button class="sb-chip" data-section="agua">💧 <span class="text">Agua</span></button>
    <button class="sb-chip" data-section="foliar">🍃 <span class="text">Foliar</span></button>
    <button class="sb-chip" data-section="fruta">🍎 <span class="text">Análisis de Fruta</span></button>
  </div>
`;
  sbStack.appendChild(card2);

  // CHIP INDEPENDIENTE PARA DÉFICIT DE PRESIÓN DE VAPOR
  const vpdCard = document.createElement("div");
  vpdCard.className = "sb-card sb-vpd-card";
  vpdCard.innerHTML = `
    <div class="sb-chiprow">
      <button class="sb-chip" data-section="vpd">🌡️ <span class="text">Déficit de Presión de Vapor</span></button>
    </div>
  `;
  sbStack.appendChild(vpdCard);

  // Ejecutar después de renderizar las tarjetas
  setTimeout(() => handleSidebarTextVisibility(), 0);
}

// ==========================
// FUNCIONES DE ENMIENDA - VERSIÓN 2.0 CON H Y AL
// ==========================
function initializeEnmiendaCalculator() {
  const calculateBtn = document.getElementById('calculate-amendment');
  const resetBtn = document.getElementById('reset-amendment');
  
  if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateAmendment);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAmendmentForm);
  }
  
  // Auto-calcular CIC cuando cambien los valores
  const inputs = ['k-initial', 'ca-initial', 'mg-initial', 'h-initial', 'na-initial', 'al-initial'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', calculateCIC);
    }
  });
}

function calculateCIC() {
  const k = parseFloat(document.getElementById('k-initial')?.value || 0);
  const ca = parseFloat(document.getElementById('ca-initial')?.value || 0);
  const mg = parseFloat(document.getElementById('mg-initial')?.value || 0);
  const h = parseFloat(document.getElementById('h-initial')?.value || 0);
  const na = parseFloat(document.getElementById('na-initial')?.value || 0);
  const al = parseFloat(document.getElementById('al-initial')?.value || 0);
  
  const cic = k + ca + mg + h + na + al;
  const cicInput = document.getElementById('cic-total');
  if (cicInput) {
    cicInput.value = cic.toFixed(2);
  }
}

function calculateAmendment() {
  // Obtener valores del análisis inicial
  const kInitial = parseFloat(document.getElementById('k-initial')?.value || 0);
  const caInitial = parseFloat(document.getElementById('ca-initial')?.value || 0);
  const mgInitial = parseFloat(document.getElementById('mg-initial')?.value || 0);
  const hInitial = parseFloat(document.getElementById('h-initial')?.value || 0);
  const naInitial = parseFloat(document.getElementById('na-initial')?.value || 0);
  const alInitial = parseFloat(document.getElementById('al-initial')?.value || 0);
  const cicTotal = parseFloat(document.getElementById('cic-total')?.value || 0);
  
  // Obtener objetivos
  const kTarget = parseFloat(document.getElementById('k-target')?.value || 0);
  const caTarget = parseFloat(document.getElementById('ca-target')?.value || 0);
  const mgTarget = parseFloat(document.getElementById('mg-target')?.value || 0);
  const hTarget = parseFloat(document.getElementById('h-target')?.value || 0);
  const naTarget = parseFloat(document.getElementById('na-target')?.value || 0);
  const alTarget = parseFloat(document.getElementById('al-target')?.value || 0);
  
  // Obtener propiedades del suelo
  const soilDensity = parseFloat(document.getElementById('soil-density')?.value || 1.4);
  const soilDepth = parseFloat(document.getElementById('soil-depth')?.value || 30);
  
  // Validar que los objetivos sumen 100%
  const totalTarget = kTarget + caTarget + mgTarget + hTarget + naTarget + alTarget;
  if (Math.abs(totalTarget - 100) > 0.1) {
    alert('Los porcentajes objetivo deben sumar 100%');
    return;
  }
  
  // Calcular meq/100g objetivo
  const kTargetMeq = (kTarget / 100) * cicTotal;
  const caTargetMeq = (caTarget / 100) * cicTotal;
  const mgTargetMeq = (mgTarget / 100) * cicTotal;
  const hTargetMeq = (hTarget / 100) * cicTotal;
  const naTargetMeq = (naTarget / 100) * cicTotal;
  const alTargetMeq = (alTarget / 100) * cicTotal;
  
  // Calcular diferencias
  const kDiff = kTargetMeq - kInitial;
  const caDiff = caTargetMeq - caInitial;
  const mgDiff = mgTargetMeq - mgInitial;
  const hDiff = hTargetMeq - hInitial;
  const naDiff = naTargetMeq - naInitial;
  const alDiff = alTargetMeq - alInitial;
  
  // Convertir a meq/kg
  const kMeqKg = kDiff * 10;
  const caMeqKg = caDiff * 10;
  const mgMeqKg = mgDiff * 10;
  const hMeqKg = hDiff * 10;
  const naMeqKg = naDiff * 10;
  const alMeqKg = alDiff * 10;
  
  // Convertir a ppm (mg/kg)
  const kPpm = kMeqKg * 39.1; // Peso atómico del K
  const caPpm = caMeqKg * 20.04; // Peso atómico del Ca
  const mgPpm = mgMeqKg * 12.15; // Peso atómico del Mg
  const hPpm = hMeqKg * 1.008; // Peso atómico del H
  const naPpm = naMeqKg * 23; // Peso atómico del Na
  const alPpm = alMeqKg * 8.99; // Peso atómico del Al
  
  // Calcular volumen de suelo por hectárea (m³)
  const soilVolume = soilDepth / 100; // m³ por m²
  const soilVolumeHa = soilVolume * 10000; // m³ por hectárea
  
  // Calcular peso del suelo por hectárea (kg)
  const soilWeightHa = soilVolumeHa * soilDensity * 1000; // kg/ha
  
  // Calcular kg/ha de cada elemento
  const kKgHa = (kPpm * soilWeightHa) / 1000000;
  const caKgHa = (caPpm * soilWeightHa) / 1000000;
  const mgKgHa = (mgPpm * soilWeightHa) / 1000000;
  const hKgHa = (hPpm * soilWeightHa) / 1000000;
  const naKgHa = (naPpm * soilWeightHa) / 1000000;
  const alKgHa = (alPpm * soilWeightHa) / 1000000;
  
  // Determinar enmienda recomendada
  let amendmentType = 'Yeso Agrícola';
  let amendmentAmount = 0;
  
  if (caDiff > 0 && naDiff < 0) {
    // Necesitamos Ca y reducir Na - Yeso Agrícola
    amendmentType = 'Yeso Agrícola';
    amendmentAmount = Math.abs(caKgHa) / 0.2353; // 23.53% Ca en yeso
  } else if (caDiff > 0 && naDiff >= 0) {
    // Solo necesitamos Ca - Cal Agrícola
    amendmentType = 'Cal Agrícola';
    amendmentAmount = Math.abs(caKgHa) / 0.40; // 40% Ca en cal
  } else if (caDiff > 0 && mgDiff > 0) {
    // Necesitamos Ca y Mg - Cal Dolomita
    amendmentType = 'Cal Dolomita';
    amendmentAmount = Math.max(Math.abs(caKgHa) / 0.217, Math.abs(mgKgHa) / 0.132);
  }
  
  // Mostrar resultados
  showAmendmentResults(amendmentType, amendmentAmount, caKgHa, naKgHa);
}

function showAmendmentResults(type, amount, caContribution, naRemoval) {
  const resultsSection = document.getElementById('amendment-results');
  const typeElement = document.getElementById('amendment-type');
  const amountElement = document.getElementById('amendment-amount');
  const caElement = document.getElementById('ca-contribution');
  const naElement = document.getElementById('na-removal');
  
  if (resultsSection) {
    resultsSection.style.display = 'block';
  }
  
  if (typeElement) {
    typeElement.textContent = type;
  }
  
  if (amountElement) {
    amountElement.textContent = `${amount.toFixed(0)} Kg/Ha`;
  }
  
  if (caElement) {
    caElement.textContent = `${caContribution.toFixed(1)} Kg/Ha`;
  }
  
  if (naElement) {
    naElement.textContent = `${Math.abs(naRemoval).toFixed(1)} Kg/Ha`;
  }
}

function resetAmendmentForm() {
  // Resetear valores iniciales
  document.getElementById('k-initial').value = '1.00';
  document.getElementById('ca-initial').value = '12.00';
  document.getElementById('mg-initial').value = '3.00';
  document.getElementById('h-initial').value = '0.00';
  document.getElementById('na-initial').value = '2.00';
  document.getElementById('al-initial').value = '0.00';
  document.getElementById('cic-total').value = '18.00';
  
  // Resetear objetivos
  document.getElementById('k-target').value = '6';
  document.getElementById('ca-target').value = '77';
  document.getElementById('mg-target').value = '17';
  document.getElementById('h-target').value = '0';
  document.getElementById('na-target').value = '0';
  document.getElementById('al-target').value = '0';
  
  // Resetear propiedades del suelo
  document.getElementById('soil-density').value = '1.4';
  document.getElementById('soil-depth').value = '30';
  
  // Ocultar resultados
  const resultsSection = document.getElementById('amendment-results');
  if (resultsSection) {
    resultsSection.style.display = 'none';
  }
}

// ============================
// 5) Inicio: proyectos (storage)
// ============================
const NP_KEYS = {
  PROJECTS: "nutriplant_projects",
  CURRENT: "nutriplant_current_project",
};

function np_loadProjects() {
  try { return JSON.parse(localStorage.getItem(NP_KEYS.PROJECTS) || "[]"); }
  catch { return []; }
}
function np_saveProjects(list) {
  localStorage.setItem(NP_KEYS.PROJECTS, JSON.stringify(list));
}
function np_newId() {
  return "np_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function np_createProject(data) {
  const now = new Date().toISOString();
  const proj = {
    id: np_newId(),
    title: String(data.title || "").trim(),
    cultivo: data.cultivo || null,
    campoOsector: data.campoOsector || null,
    rendimientoEsperado: data.rendimientoEsperado ?? null,
    unidadRendimiento: data.unidadRendimiento || "t/ha",
    createdAt: now,
    updatedAt: now,
  };
  const list = np_loadProjects();
  list.unshift(proj);
  np_saveProjects(list);
  return proj;
}
function np_deleteProject(id) {
  const list = np_loadProjects().filter(p => p.id !== id);
  np_saveProjects(list);
}
function np_duplicateProject(id) {
  const p = np_loadProjects().find(p => p.id === id);
  if (!p) return null;
  const now = new Date().toISOString();
  const copy = { ...p, id: np_newId(), title: p.title + " (copia)", createdAt: now, updatedAt: now };
  const list = np_loadProjects();
  list.unshift(copy);
  np_saveProjects(list);
  return copy;
}
function np_getProject(id) {
  return np_loadProjects().find(p => p.id === id) || null;
}
function np_allProjects() { return np_loadProjects(); }
function np_setCurrentProject(id) { 
  localStorage.setItem(NP_KEYS.CURRENT, id || ""); 
  // También establecer en el sistema de gestión de proyectos
  if (window.projectManager && id) {
    const project = np_getProject(id);
    if (project) {
      window.projectManager.setCurrentProject(id, project.title);
    }
  }
}
function np_getCurrentProjectId() { return localStorage.getItem(NP_KEYS.CURRENT) || ""; }

function escapeHtml(s){
  return (s || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function np_renderProjects(){
  const listEl  = document.querySelector("#np-projects-list");
  const emptyEl = document.querySelector("#np-empty-state");
  if (!listEl || !emptyEl) return;

  const projects = np_allProjects();
  listEl.innerHTML = "";
  if (!projects.length) { emptyEl.style.display = "block"; return; }
  emptyEl.style.display = "none";

  const currentId = np_getCurrentProjectId();
  
  for (const p of projects) {
    const meta = [p.cultivo, p.campoOsector].filter(Boolean).join(" • ");
    const card = document.createElement("div");
    card.className = `card ${p.id === currentId ? 'selected' : ''}`;
    card.setAttribute('data-id', p.id);
    card.innerHTML = `
      <div class="project-info">
        <div class="font-semibold">${escapeHtml(p.title)}</div>
        <div class="text-sm" style="opacity:.7">${meta || "—"}</div>
        <div class="text-xs" style="opacity:.6">Actualizado: ${new Date(p.updatedAt).toLocaleString()}</div>
      </div>
      <div class="actions" style="margin-top:8px; display:flex; gap:8px;">
        <button class="btn" data-act="open" data-id="${p.id}">Abrir</button>
        <button class="btn" data-act="dup" data-id="${p.id}">Duplicar</button>
        <button class="btn" data-act="del" data-id="${p.id}">Eliminar</button>
      </div>
    `;
    listEl.appendChild(card);
  }

  listEl.onclick = (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");

    if (act === "open") {
      const p = np_getProject(id);
      if (p) {
        np_setCurrentProject(id);
        // Actualizar el projectManager
        if (window.projectManager) {
          window.projectManager.setCurrentProject(id, p.title);
        }
        renderMenu();
        selectSection("Inicio", menu.querySelector("a[data-section='inicio']") || null);
      }
    }
    if (act === "dup") {
      const copy = np_duplicateProject(id);
      if (copy) np_renderProjects();
    }
    if (act === "del") {
      const wasCurrent = (np_getCurrentProjectId() === id);
      if (confirm("¿Eliminar este proyecto?")) {
        np_deleteProject(id);
        if (wasCurrent) {
          np_setCurrentProject("");
          renderMenu();
          selectSection("Inicio", menu.querySelector("a[data-section='inicio']"));
        }
        np_renderProjects();
      }
    }
  };
}

function np_initInicio(){
  const headerBtn = document.getElementById("btn-new-nutriplant");
  const dlg      = document.querySelector("#dlg-new-project");
  const form     = document.querySelector("#form-new-project");
  const btnClose = document.getElementById("btn-cancel-new");

  if (headerBtn) headerBtn.onclick = () => { form?.reset(); dlg?.showModal && dlg.showModal(); };
  if (btnClose) btnClose.onclick = () => dlg?.close && dlg.close();

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const title = document.querySelector("#np-title").value.trim();
      if (!title) return;
      const payload = {
        title,
        campoOsector: (document.querySelector("#np-campo").value || "").trim() || null,
        cultivo:      (document.querySelector("#np-cultivo").value || "").trim() || null,
        rendimientoEsperado: (document.querySelector("#np-rend").value || "") === "" ? null : Number(document.querySelector("#np-rend").value),
        unidadRendimiento: document.querySelector("#np-unidad").value || "t/ha",
      };
      const proj = np_createProject(payload);
      dlg?.close && dlg.close();
      np_renderProjects();
      alert("Proyecto creado. Presiona 'Abrir' para activarlo.");
    };
  }

  np_renderProjects();
}

// =======================
// Boot
// =======================
document.addEventListener("DOMContentLoaded", () => {
  renderMenu();
  const first = menu?.querySelector("a");
  if (first) selectSection("Inicio", first);
});

// === Sidebar: manejo de clics en #sbStack (proyecto + análisis) ===
document.addEventListener("click", (e) => {
  const stackBtn = e.target.closest("#sbStack [data-go], #sbStack [data-section]");
  if (!stackBtn) return;

  // 1) Resalta solo el ítem pulsado dentro del stack lateral
  const stack = document.getElementById("sbStack");
  if (stack) {
    stack.querySelectorAll("[data-go], [data-section]").forEach(n => n.classList.remove("active"));
  }
  stackBtn.classList.add("active");

  // 2) Determina destino (principal o análisis)
  let target = null;

  if (stackBtn.hasAttribute("data-go")) {
    // Botones de la tarjeta (incluye Análisis y vistas auxiliares)
    target = stackBtn.getAttribute("data-go"); // p.ej. "Ubicación" o "Análisis: Suelo"
  } else {
    // Chips con data-section (inicio/ubicacion/fertirriego/hidroponia/reporte + análisis)
    const key = (stackBtn.dataset.section || "").toLowerCase();

    const SECTION_MAP = {
      // principales
      inicio: "Inicio",
      ubicacion: "Ubicación",
      enmienda: "Enmienda",
      "nutricion-granular": "Nutricion Granular",
      fertirriego: "Fertirriego",
      hidroponia: "Hidroponia",
      reporte: "Reporte",

      // análisis (añadidos)
      suelo: "Análisis: Suelo",
      extracto: "Análisis: Solución Nutritiva",
      pasta: "Análisis: Extracto de Pasta",
      agua: "Análisis: Agua",
      foliar: "Análisis: Foliar",
      fruta: "Análisis: Fruta",
      vpd: "Análisis: Déficit de Presión de Vapor",
    };

    target = SECTION_MAP[key] || null;
  }

  if (!target) return;

  // 3) Si es principal, sincroniza el menú; si es análisis, solo navega
  const lower = target.toLowerCase();
  const MAIN_MAP = {
    "inicio": "inicio",
    "ubicación": "ubicacion",
    "fertirriego": "fertirriego",
    "hidroponia": "hidroponia",
    "reporte": "reporte",
  };
  const keyForMenu = MAIN_MAP[lower] || null;
  const anchor = keyForMenu ? (menu?.querySelector(`a[data-section="${keyForMenu}"]`) || null) : null;

  selectSection(target, anchor);
});

// Agregar indicador de proyecto en todas las secciones
function addProjectIndicator(container) {
  if (!container) return;

  // Obtener proyecto actual
  const currentProject = window.projectManager ? window.projectManager.getCurrentProject() : null;
  
  // Crear indicador de proyecto
  const projectIndicator = document.createElement('div');
  projectIndicator.className = 'project-indicator-global';
  projectIndicator.innerHTML = `
    <div class="project-indicator-content">
      <span class="project-icon">📁</span>
      <div class="project-info">
        <span class="project-label">Proyecto Activo:</span>
        <span class="project-name">${currentProject ? currentProject.name : 'Selecciona un proyecto'}</span>
      </div>
    </div>
  `;

  // Insertar al inicio del contenedor
  container.insertBefore(projectIndicator, container.firstChild);
}

// ===== FERTIRRIEGO FUNCTIONALITY =====
function initializeFertirriegoTabs() {
  // Event listeners para las pestañas
  document.addEventListener('click', function(e) {
    if (e.target.closest('.tab-button')) {
      const button = e.target.closest('.tab-button');
      const tabId = button.getAttribute('data-tab');
      
      // Remover clase active de todas las pestañas
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Agregar clase active a la pestaña seleccionada
      button.classList.add('active');
      const targetContent = document.getElementById(tabId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    }
  });
}


// Funciones para Requerimiento Nutricional
function calculateNutrientExtraction() {
  const cropType = document.getElementById('cropType')?.value || 'aguacate';
  const targetYield = parseFloat(document.getElementById('targetYield')?.value) || 0;
  const surfaceArea = parseFloat(document.getElementById('surfaceArea')?.value) || 0;

  if (targetYield === 0 || surfaceArea === 0) {
    alert('Por favor, ingresa el rendimiento objetivo y la superficie');
    return;
  }

  // Datos de extracción por cultivo (kg/ton)
  const extractionData = {
    aguacate: { N: 9, P2O5: 4, K2O: 16, CaO: 8, MgO: 4, S: 3, Zn: 0.175, Mn: 0.07, Fe: 0.08, Cu: 0.01, B: 0.05 },
    citricos: { N: 7, P2O5: 3, K2O: 12, CaO: 6, MgO: 3, S: 2, Zn: 0.15, Mn: 0.06, Fe: 0.07, Cu: 0.008, B: 0.04 },
    tomate: { N: 5, P2O5: 2, K2O: 8, CaO: 4, MgO: 2, S: 1.5, Zn: 0.12, Mn: 0.05, Fe: 0.06, Cu: 0.006, B: 0.03 },
    pepino: { N: 4, P2O5: 1.5, K2O: 6, CaO: 3, MgO: 1.5, S: 1, Zn: 0.1, Mn: 0.04, Fe: 0.05, Cu: 0.005, B: 0.025 },
    pimiento: { N: 6, P2O5: 2.5, K2O: 10, CaO: 5, MgO: 2.5, S: 2, Zn: 0.14, Mn: 0.055, Fe: 0.065, Cu: 0.007, B: 0.035 }
  };

  const cropData = extractionData[cropType] || extractionData.aguacate;
  const totalYield = targetYield * surfaceArea;

  // Calcular requerimientos totales
  const requirements = {};
  Object.keys(cropData).forEach(nutrient => {
    requirements[nutrient] = (cropData[nutrient] * totalYield).toFixed(2);
  });

  // Mostrar resultados
  displayNutrientResults(requirements, surfaceArea);
}

function displayNutrientResults(requirements, surfaceArea) {
  const grid = document.getElementById('nutrientsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const nutrients = [
    { key: 'N', name: 'Nitrógeno', unit: 'kg' },
    { key: 'P2O5', name: 'Fósforo', unit: 'kg' },
    { key: 'K2O', name: 'Potasio', unit: 'kg' },
    { key: 'CaO', name: 'Calcio', unit: 'kg' },
    { key: 'MgO', name: 'Magnesio', unit: 'kg' },
    { key: 'S', name: 'Azufre', unit: 'kg' },
    { key: 'Zn', name: 'Zinc', unit: 'kg' },
    { key: 'Mn', name: 'Manganeso', unit: 'kg' },
    { key: 'Fe', name: 'Hierro', unit: 'kg' },
    { key: 'Cu', name: 'Cobre', unit: 'kg' },
    { key: 'B', name: 'Boro', unit: 'kg' }
  ];

  nutrients.forEach(nutrient => {
    const item = document.createElement('div');
    item.className = 'nutrient-item';
    item.innerHTML = `
      <div class="nutrient-label">${nutrient.name}</div>
      <div class="nutrient-value">${requirements[nutrient.key] || '0.00'} ${nutrient.unit}</div>
    `;
    grid.appendChild(item);
  });
}

// Funciones para Programa
function generateFertigationProgram() {
  alert('Generando programa de fertirriego...\n\nEsta funcionalidad se implementará con los datos del Excel.');
}

function exportProgram() {
  alert('Exportando programa...\n\nEsta funcionalidad se implementará próximamente.');
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  initializeFertirriegoTabs();
  
  // Event listeners para cálculo automático de extracción
  const cropType = document.getElementById('cropType');
  const targetYield = document.getElementById('targetYield');
  const surfaceArea = document.getElementById('surfaceArea');
  
  if (cropType) cropType.addEventListener('change', calculateNutrientExtraction);
  if (targetYield) targetYield.addEventListener('input', calculateNutrientExtraction);
  if (surfaceArea) targetYield.addEventListener('input', calculateNutrientExtraction);
});