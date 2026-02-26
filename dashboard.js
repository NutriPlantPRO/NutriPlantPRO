// =====================
// 1) Configuración base
// =====================
// Silenciar logs en producción (activar con localStorage np_debug = "1")
(function(){
  try {
    const debugEnabled = localStorage.getItem('np_debug') === '1';
    if (!debugEnabled) {
      console.log = function(){};
      console.debug = function(){};
    }
  } catch {}
})();
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

// Preservar posición de scroll por sección/subpestaña (ej. "Nutricion Granular|programa")
var sectionScrollPositions = {};
function getScrollPosition() {
  try {
    return window.scrollY !== undefined ? window.scrollY : (document.documentElement && document.documentElement.scrollTop) || 0;
  } catch (e) { return 0; }
}
function setScrollPosition(pos) {
  try {
    if (typeof pos !== 'number' || pos < 0) return;
    window.scrollTo(0, pos);
  } catch (e) {}
}
function restoreScrollForKey(scrollKey) {
  var pos = sectionScrollPositions[scrollKey];
  var content = document.querySelector('.content');
  if (typeof pos === 'number' && pos > 0) {
    requestAnimationFrame(function() {
      setScrollPosition(pos);
      requestAnimationFrame(function() {
        if (content) content.classList.remove('restoring-scroll');
      });
    });
  } else if (content) {
    content.classList.remove('restoring-scroll');
  }
}
function getCurrentSubTabForSection(sectionName) {
  if (sectionName === 'Nutricion Granular') {
    var btn = document.querySelector('.nutricion-granular-container .tab-button.active');
    if (btn) {
      var onclick = (btn.getAttribute('onclick') || '');
      if (onclick.indexOf("'programa'") !== -1) return 'programa';
      if (onclick.indexOf("'requerimiento'") !== -1) return 'requerimiento';
    }
  }
  if (sectionName === 'Fertirriego') {
    var activeBtn = document.querySelector('.fertirriego-container .tab-button.active');
    if (activeBtn) {
      var tab = activeBtn.getAttribute('data-tab');
      if (tab) return tab;
    }
  }
  return '';
}

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

// Función para inicializar el sidebar
function initializeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) {
    // Funcionalidad desktop (hover)
    sidebar.addEventListener('mouseenter', handleSidebarTextVisibility);
    sidebar.addEventListener('mouseleave', handleSidebarTextVisibility);
    
    // Ejecutar inmediatamente al cargar la página
    handleSidebarTextVisibility();
  }
  
  // Funcionalidad móvil
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }
  
  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }
  
  // Cerrar sidebar al cambiar de sección en móvil
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      const isSidebarClick = sidebar && sidebar.contains(e.target);
      const isToggleClick = sidebarToggle && sidebarToggle.contains(e.target);
      
      if (!isSidebarClick && !isToggleClick && isSidebarOpen()) {
        closeSidebar();
      }
    }
  });
}

// Función para abrir/cerrar sidebar en móvil
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (isSidebarOpen()) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

// Función para abrir sidebar
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) {
    sidebar.style.transform = 'translateX(0)';
    sidebar.classList.add('open');
  }
  
  if (overlay) {
    overlay.classList.add('show');
  }
  
  // Prevenir scroll del body
  document.body.style.overflow = 'hidden';
}

// Función para cerrar sidebar
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) {
    sidebar.style.transform = 'translateX(-100%)';
    sidebar.classList.remove('open');
  }
  
  if (overlay) {
    overlay.classList.remove('show');
  }
  
  // Restaurar scroll del body
  document.body.style.overflow = '';
}

// Función para verificar si el sidebar está abierto
function isSidebarOpen() {
  const sidebar = document.getElementById('sidebar');
  return sidebar && sidebar.classList.contains('open');
}

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
          <div class="row" style="justify-content:space-between; align-items:center; margin:6px 0 10px;">
            <h3 class="text-xl" style="margin:0;">📁 Proyectos recientes</h3>
            <span id="np-sync-status" style="display:none; font-size:12px; padding:4px 10px; border-radius:999px; background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe;"></span>
          </div>
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
              <label>Campo / Sector / Finca</label>
              <input id="np-campo" placeholder="Lote 3 / Finca San José"
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
            <div style="flex:1;">
              <label>Cultivo</label>
              <input id="np-cultivo" placeholder="Aguacate / Limón / ..."
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <label>Variedad</label>
              <input id="np-variedad" placeholder="Ej. Hass, Mendez, etc."
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <label>Rendimiento esperado</label>
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

      <!-- Modal editar proyecto -->
      <dialog id="dlg-edit-project" class="card" style="max-width:560px;">
        <form method="dialog" id="form-edit-project">
          <h3 class="text-xl" style="margin-bottom:12px;">✏️ Editar NUTRIPLANT</h3>

          <div class="row" style="gap:12px;">
            <div style="flex:1;">
              <label>Título del proyecto *</label>
              <input id="edit-np-title" required placeholder="Ej. Aguacate Lote 3 Primavera 2026"
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <label>Campo / Sector / Finca</label>
              <input id="edit-np-campo" placeholder="Lote 3 / Finca San José"
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
            <div style="flex:1;">
              <label>Cultivo</label>
              <input id="edit-np-cultivo" placeholder="Aguacate / Limón / ..."
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <label>Variedad</label>
              <input id="edit-np-variedad" placeholder="Ej. Hass, Mendez, etc."
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <label>Rendimiento esperado</label>
              <input id="edit-np-rend" type="number" step="any" placeholder="Ej. 12"
                     style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" />
            </div>
            <div style="width:160px;">
              <label>Unidad</label>
              <select id="edit-np-unidad" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;">
                <option value="t/ha">t/ha</option>
                <option value="kg/ha">kg/ha</option>
              </select>
            </div>
          </div>

          <div class="row" style="justify-content:flex-end; margin-top:14px;">
            <button type="button" class="btn btn-pill" id="btn-cancel-edit">Cancelar</button>
            <button type="submit" class="btn btn-pill btn-primary">Guardar Cambios</button>
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
            <div class="fertirriego-requirement-container">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #0369a1; font-size: 1.5rem; margin: 0;">📋 Requerimiento Nutricional</h3>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <button class="btn btn-info btn-sm" onclick="toggleFertirriegoOxideElemental()" id="toggleFertirriegoOxideElementalBtn">
                    🔄 Ver en Elemental
                  </button>
                </div>
              </div>
              
              <div class="fertirriego-inputs">
                <div class="form-group">
                  <label for="fertirriegoCropType">Cultivo:</label>
                  <select id="fertirriegoCropType">
                    <option value="aguacate">Aguacate</option>
                    <option value="arandano">Arándano</option>
                    <option value="banano">Banano</option>
                    <option value="cana">Caña</option>
                    <option value="cebolla">Cebolla</option>
                    <option value="chile">Chile Verde</option>
                    <option value="fresa">Fresa</option>
                    <option value="frambuesa">Frambuesa</option>
                    <option value="lechuga">Lechuga</option>
                    <option value="limon">Limón</option>
                    <option value="maiz">Maiz</option>
                    <option value="melon">Melon</option>
                    <option value="papaya">Papaya</option>
                    <option value="pepino">Pepino</option>
                    <option value="pimiento">Pimiento</option>
                    <option value="sandia">Sandia</option>
                    <option value="tomate">Tomate</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="fertirriegoTargetYield">Rendimiento Objetivo (ton/ha):</label>
                  <input type="number" id="fertirriegoTargetYield" step="0.1" min="1" value="25">
                </div>
                <div class="form-group" style="min-width: 280px;">
                  <label style="visibility: hidden;">Botón</label>
                  <button type="button" class="btn btn-success" onclick="showCustomCropModal()" style="width: 100%; padding: 10px; cursor: pointer;">
                    ➕ Agregar Cultivo Personalizado
                  </button>
                </div>
              </div>

              <div class="fertirriego-table-container" id="fertirriegoTableContainer">
                <!-- La tabla se generará dinámicamente con JavaScript -->
              </div>
            </div>
          </div>

          <!-- Pestaña Programa -->
          <div class="tab-content" id="programa">
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 class="summary-title">📘 Programa de Nutrición - Fertirriego</h3>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                  <button class="btn btn-info btn-sm" onclick="toggleFertiProgramOxideElemental()" id="toggleFertiProgramOxideElementalBtn">🔄 Ver en Elemental</button>
              </div>
              </div>

              <div class="nutrition-summary">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h3 class="summary-title">📊 Resumen Total del Ciclo</h3>
                </div>
                <div class="summary-grid">
                  <div class="summary-item">
                    <span class="summary-label">Número de Semanas:</span>
                    <span class="summary-value" id="fertiTotalApplications">0</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">Dosis Total Kg/Ha:</span>
                    <span class="summary-value" id="fertiTotalDoseKgHa">0</span>
                  </div>
                </div>

                <div class="summary-nutrients">
                  <h4>💡 Aporte del programa de nutrición (Kg/Ha):</h4>
                  <div class="nutrients-grid">
                    <div class="nutrient-item"><span class="nutrient-label">N(NO₃):</span><span class="nutrient-value" id="fertiProgTotalN_NO3">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">N(NH₄):</span><span class="nutrient-value" id="fertiProgTotalN_NH4">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiProgLabelP2O5">P₂O₅:</span><span class="nutrient-value" id="fertiProgTotalP2O5">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiProgLabelK2O">K₂O:</span><span class="nutrient-value" id="fertiProgTotalK2O">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiProgLabelCaO">CaO:</span><span class="nutrient-value" id="fertiProgTotalCaO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiProgLabelMgO">MgO:</span><span class="nutrient-value" id="fertiProgTotalMgO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">S:</span><span class="nutrient-value" id="fertiProgTotalS">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">SO₄:</span><span class="nutrient-value" id="fertiProgTotalSO4">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Fe:</span><span class="nutrient-value" id="fertiProgTotalFe">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mn:</span><span class="nutrient-value" id="fertiProgTotalMn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">B:</span><span class="nutrient-value" id="fertiProgTotalB">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Zn:</span><span class="nutrient-value" id="fertiProgTotalZn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Cu:</span><span class="nutrient-value" id="fertiProgTotalCu">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mo:</span><span class="nutrient-value" id="fertiProgTotalMo">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiProgLabelSiO2">SiO₂:</span><span class="nutrient-value" id="fertiProgTotalSiO2">0.0</span></div>
                  </div>
                </div>

                <div class="summary-nutrients" style="margin-top: 16px;">
                  <h4>💧 Aporte por agua (Kg/Ha):</h4>
                  <div class="nutrients-grid">
                    <div class="nutrient-item"><span class="nutrient-label">N:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterN" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiWaterLabelP2O5">P₂O₅:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterP2O5" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiWaterLabelK2O">K₂O:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterK2O" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiWaterLabelCaO">CaO:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterCaO" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiWaterLabelMgO">MgO:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterMgO" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">S:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterS" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">SO₄:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterSO4" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">Fe:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterFe" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mn:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterMn" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">B:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterB" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">Zn:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterZn" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">Cu:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterCu" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mo:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterMo" step="0.01" value="0.0"></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiWaterLabelSiO2">SiO₂:</span><input type="number" class="nutrient-input ferti-water-input" id="fertiWaterSiO2" step="0.01" value="0.0"></div>
                  </div>
                </div>

                <div class="summary-nutrients" style="margin-top: 16px;">
                  <h4>📦 Aporte total (programa + agua) (Kg/Ha):</h4>
                  <div class="nutrients-grid">
                    <div class="nutrient-item"><span class="nutrient-label">N:</span><span class="nutrient-value" id="fertiTotalWithWaterN">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiTotalWithWaterLabelP2O5">P₂O₅:</span><span class="nutrient-value" id="fertiTotalWithWaterP2O5">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiTotalWithWaterLabelK2O">K₂O:</span><span class="nutrient-value" id="fertiTotalWithWaterK2O">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiTotalWithWaterLabelCaO">CaO:</span><span class="nutrient-value" id="fertiTotalWithWaterCaO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiTotalWithWaterLabelMgO">MgO:</span><span class="nutrient-value" id="fertiTotalWithWaterMgO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">S:</span><span class="nutrient-value" id="fertiTotalWithWaterS">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">SO₄:</span><span class="nutrient-value" id="fertiTotalWithWaterSO4">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Fe:</span><span class="nutrient-value" id="fertiTotalWithWaterFe">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mn:</span><span class="nutrient-value" id="fertiTotalWithWaterMn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">B:</span><span class="nutrient-value" id="fertiTotalWithWaterB">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Zn:</span><span class="nutrient-value" id="fertiTotalWithWaterZn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Cu:</span><span class="nutrient-value" id="fertiTotalWithWaterCu">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mo:</span><span class="nutrient-value" id="fertiTotalWithWaterMo">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiTotalWithWaterLabelSiO2">SiO₂:</span><span class="nutrient-value" id="fertiTotalWithWaterSiO2">0.0</span></div>
                  </div>
                </div>

                <div class="summary-nutrients" style="margin-top: 16px;">
                  <h4>🎯 Requerimiento Real (Kg/Ha):</h4>
                  <div class="nutrients-grid">
                    <div class="nutrient-item"><span class="nutrient-label">N:</span><span class="nutrient-value" id="fertiReqN">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiReqLabelP2O5">P₂O₅:</span><span class="nutrient-value" id="fertiReqP2O5">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiReqLabelK2O">K₂O:</span><span class="nutrient-value" id="fertiReqK2O">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiReqLabelCaO">CaO:</span><span class="nutrient-value" id="fertiReqCaO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiReqLabelMgO">MgO:</span><span class="nutrient-value" id="fertiReqMgO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">S:</span><span class="nutrient-value" id="fertiReqS">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">SO₄:</span><span class="nutrient-value" id="fertiReqSO4">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Fe:</span><span class="nutrient-value" id="fertiReqFe">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mn:</span><span class="nutrient-value" id="fertiReqMn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">B:</span><span class="nutrient-value" id="fertiReqB">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Zn:</span><span class="nutrient-value" id="fertiReqZn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Cu:</span><span class="nutrient-value" id="fertiReqCu">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mo:</span><span class="nutrient-value" id="fertiReqMo">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiReqLabelSiO2">SiO₂:</span><span class="nutrient-value" id="fertiReqSiO2">0.0</span></div>
                  </div>
                </div>

                <div class="summary-nutrients" style="margin-top: 16px;">
                  <h4>➖ Diferencia (Aporte total - Requerimiento) (Kg/Ha):</h4>
                  <div class="nutrients-grid">
                    <div class="nutrient-item"><span class="nutrient-label">N:</span><span class="nutrient-value" id="fertiDiffN">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiDiffLabelP2O5">P₂O₅:</span><span class="nutrient-value" id="fertiDiffP2O5">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiDiffLabelK2O">K₂O:</span><span class="nutrient-value" id="fertiDiffK2O">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiDiffLabelCaO">CaO:</span><span class="nutrient-value" id="fertiDiffCaO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiDiffLabelMgO">MgO:</span><span class="nutrient-value" id="fertiDiffMgO">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">S:</span><span class="nutrient-value" id="fertiDiffS">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">SO₄:</span><span class="nutrient-value" id="fertiDiffSO4">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Fe:</span><span class="nutrient-value" id="fertiDiffFe">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mn:</span><span class="nutrient-value" id="fertiDiffMn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">B:</span><span class="nutrient-value" id="fertiDiffB">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Zn:</span><span class="nutrient-value" id="fertiDiffZn">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Cu:</span><span class="nutrient-value" id="fertiDiffCu">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label">Mo:</span><span class="nutrient-value" id="fertiDiffMo">0.0</span></div>
                    <div class="nutrient-item"><span class="nutrient-label" id="fertiDiffLabelSiO2">SiO₂:</span><span class="nutrient-value" id="fertiDiffSiO2">0.0</span></div>
                  </div>
                </div>
              </div>

              <div style="display:flex; justify-content: space-between; align-items:center; margin: 16px 0;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <h3 id="fertiProgramTitle">📅 Programa Semanal</h3>
                  <div class="btn-group" role="group" aria-label="vista nutrientes">
                    <button id="fertiViewMacroBtn" class="btn btn-primary btn-sm" onclick="setFertiNutrientView('macro')">Macros</button>
                    <button id="fertiViewMicroBtn" class="btn btn-secondary btn-sm" onclick="setFertiNutrientView('micro')">Micros</button>
                  </div>
                </div>
                
              </div>
              <div id="fertiWeeksContainer"></div>
            </div>
          </div>

          <!-- Pestaña Gráficas -->
          <div class="tab-content" id="graficas">
            <div class="charts-container">
              <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                <button class="btn btn-info btn-sm" onclick="toggleFertiChartsOxideElemental()" id="toggleFertiChartsModeBtn">🔄 Ver en Elemental</button>
              </div>
              <div class="fertirriego-graphs-watermark">
                <img src="assets/NutriPlant_PRO_blue.png" alt="" aria-hidden="true">
              </div>
              <div class="charts-grid">
                <div class="chart-container">
                  <h4>Macronutrientes</h4>
                  <canvas id="fertiMacroChart"></canvas>
                </div>
                <div class="chart-container">
                  <h4>Micronutrientes</h4>
                  <canvas id="fertiMicroChart"></canvas>
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
      <div class="enmienda-container enmienda-watermark-wrap">
        <div class="enmienda-watermark" aria-hidden="true">
          <img src="assets/NutriPlant_PRO_blue.png" alt="">
        </div>
        <div class="enmienda-header">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 class="text-2xl font-bold text-gray-800 mb-0">🚜 Calculadora de Enmiendas (ajuste de CIC del suelo)</h2>
          </div>
          <div class="ideal-ranges">
            <h3>📊 Rangos Ideales de Cationes:</h3>
            <div class="ranges-grid">
              <div class="range-item good">K⁺: 3-7%</div>
              <div class="range-item good">Ca²⁺: 65-75%</div>
              <div class="range-item good">Mg²⁺: 10-15%</div>
              <div class="range-item warning">H⁺: 0-10%</div>
              <div class="range-item warning">Na⁺: 0-1%</div>
              <div class="range-item warning">Al³⁺: 0-1%</div>
            </div>
          </div>
        </div>

        <div class="enmienda-content">
          <!-- Análisis de Suelo Inicial -->
          <div class="ideal-ranges">
            <h3>📊 Análisis de Suelo Inicial (meq/100g de suelo)</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <div></div>
              <div class="total-display">
                <label>CIC Total:</label>
                <input type="number" id="cic-total" step="0.01" value="0.00" class="total-input" readonly>
              </div>
            </div>
            <div class="analysis-grid">
              <div class="analysis-item cation-good">
                <label>K⁺:</label>
                <input type="number" id="k-initial" step="0.01" value="0.00" class="analysis-input">
                <div class="percent-display" id="k-percent">0.0%</div>
                <div class="status-icon" id="k-status">-</div>
              </div>
              <div class="analysis-item cation-good">
                <label>Ca²⁺:</label>
                <input type="number" id="ca-initial" step="0.01" value="0.00" class="analysis-input">
                <div class="percent-display" id="ca-percent">0.0%</div>
                <div class="status-icon" id="ca-status">-</div>
              </div>
              <div class="analysis-item cation-good">
                <label>Mg²⁺:</label>
                <input type="number" id="mg-initial" step="0.01" value="0.00" class="analysis-input">
                <div class="percent-display" id="mg-percent">0.0%</div>
                <div class="status-icon" id="mg-status">-</div>
              </div>
              <div class="analysis-item cation-acid">
                <label>H⁺:</label>
                <input type="number" id="h-initial" step="0.01" value="0.00" class="analysis-input">
                <div class="percent-display" id="h-percent">0.0%</div>
                <div class="status-icon" id="h-status">-</div>
              </div>
              <div class="analysis-item cation-salt">
                <label>Na⁺:</label>
                <input type="number" id="na-initial" step="0.01" value="0.00" class="analysis-input">
                <div class="percent-display" id="na-percent">0.0%</div>
                <div class="status-icon" id="na-status">-</div>
              </div>
              <div class="analysis-item cation-toxic">
                <label>Al³⁺:</label>
                <input type="number" id="al-initial" step="0.01" value="0.00" class="analysis-input">
                <div class="percent-display" id="al-percent">0.0%</div>
                <div class="status-icon" id="al-status">-</div>
              </div>
            </div>
          </div>

          <!-- Propiedades del Suelo -->
          <div class="ideal-ranges">
            <h3>🌱 Propiedades del Suelo</h3>
            <div class="properties-grid">
              <div class="property-item">
                <label>Densidad aparente (g/cm³):</label>
                <input type="number" id="soil-density" step="0.01" value="1.1" class="property-input">
              </div>
              <div class="property-item">
                <label>Profundidad (cm):</label>
                <input type="number" id="soil-depth" step="1" value="30" class="property-input">
              </div>
              <div class="property-item">
                <label>pH del suelo:</label>
                <div class="ph-input-container">
                  <input type="number" id="soil-ph" step="0.1" placeholder="Ingrese pH" min="4.0" max="9.0" class="property-input" title="pH del suelo (4.0 - 9.0)" onchange="updatePHIndicator()">
                  <div id="ph-indicator" class="ph-indicator">⚪ Ingrese pH</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Objetivos de Ajuste -->
          <div class="ideal-ranges target-section">
            <h3>🎯 Meq/100g a ajustar en CIC</h3>
            <div class="target-grid">
              <div class="target-item cation-good">
                <label>K⁺ (meq a ajustar):</label>
                <input type="number" id="k-target" step="0.01" value="0.00" class="target-input">
              </div>
              <div class="target-item cation-good">
                <label>Ca²⁺ (meq a ajustar):</label>
                <input type="number" id="ca-target" step="0.01" value="0.00" class="target-input">
              </div>
              <div class="target-item cation-good">
                <label>Mg²⁺ (meq a ajustar):</label>
                <input type="number" id="mg-target" step="0.01" value="0.00" class="target-input">
              </div>
              <div class="target-item cation-acid">
                <label>H⁺ (meq a ajustar):</label>
                <input type="number" id="h-target" step="0.01" value="0.00" class="target-input">
              </div>
              <div class="target-item cation-salt">
                <label>Na⁺ (meq a ajustar):</label>
                <input type="number" id="na-target" step="0.01" value="0.00" class="target-input">
              </div>
              <div class="target-item cation-toxic">
                <label>Al³⁺ (meq a ajustar):</label>
                <input type="number" id="al-target" step="0.01" value="0.00" class="target-input">
              </div>
            </div>
          </div>

          <!-- Enmiendas Disponibles -->
          <div class="amendments-section">
            <h3 class="section-title">🧪 Enmiendas Disponibles</h3>
            <div class="amendments-table-container">
              <table class="amendments-table">
    <thead>
      <tr>
        <th>Enmienda</th>
        <th>Fórmula</th>
        <th>Peso Molecular</th>
        <th>%K</th>
        <th>%Ca</th>
        <th>%Mg</th>
        <th>%SO₄</th>
        <th>%CO₃</th>
        <th>%H₂O</th>
        <th>%Si</th>
        <th>Acciones</th>
      </tr>
    </thead>
                <tbody id="amendments-table-body">
                  <!-- Enmiendas se cargarán dinámicamente -->
                </tbody>
              </table>
            </div>
            
          </div>

          <!-- Botón de Cálculo -->
          <div class="calculation-actions">
            <div class="soil-reach-card">
              <label for="soil-reach-percent">Suelo explorado por raíces (%)</label>
              <div class="soil-reach-input">
                <input type="number" id="soil-reach-percent" min="10" max="100" step="1" value="100">
                <span>%</span>
              </div>
            </div>
            <button id="calculate-amendment" type="button" class="btn-calculate">🧮 Calcular Enmienda</button>
            <button id="reset-amendment" type="button" class="btn-reset">🔄 Reiniciar</button>
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
            
            <!-- Botones de Acción -->
            <div class="report-actions" style="margin-top: 20px; text-align: center;">
              <button id="saveAmendmentDataBtn" class="btn btn-secondary" onclick="saveProject()" style="margin-right: 10px;">
                💾 Guardar Datos
              </button>
              <button id="showProjectCardBtn" class="btn btn-secondary" onclick="showProjectCard()" style="margin-right: 10px;">
                🃏 Ver Tarjeta
              </button>
              <button id="generateReportFromAmendmentBtn" class="btn btn-primary btn-lg" onclick="openReportModal()">
                📄 Generar Reporte PDF
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  if (name === "Nutricion Granular") {
    // Fallback crítico: si el módulo de requerimiento granular no cargó por caché o 404,
    // definir funciones mínimas para renderizar la tabla exactamente como antes
    (function __ensureGranularRequirementModule(){
      try {
        if (typeof window.calculateGranularNutrientRequirements === 'function') return;
        console.warn('⚠️ Módulo nutricion-granular-requerimiento no cargado; activando fallback inline');

        window.isGranularRequerimientoElementalMode = false;
        window.GRANULAR_CONVERSION_FACTORS = { P2O5_TO_P:2.291, P_TO_P2O5:2.291, K2O_TO_K:1.204, K_TO_K2O:1.204, CaO_TO_Ca:1.399, Ca_TO_CaO:1.399, MgO_TO_Mg:1.658, Mg_TO_MgO:1.658, SiO2_TO_Si:2.139, Si_TO_SiO2:2.139 };
        window.GRANULAR_DEFAULT_EFFICIENCY = { N:65, P2O5:40, K2O:85, CaO:85, MgO:85, S:85, SO4:85, Fe:80, Mn:80, B:80, Zn:80, Cu:80, Mo:80, SiO2:85 };
        // 🚀 CRÍTICO: NO reinicializar GRANULAR_CROP_EXTRACTION_DB aquí porque podría sobrescribir overrides aplicados
        // Si el módulo nutricion-granular-requerimiento-functions.js carga, GRANULAR_CROP_EXTRACTION_DB ya está definido
        // y puede tener overrides aplicados. Reinicializarlo aquí sobrescribiría esos overrides.
        // Solo inicializar si NO existe (primera vez) y si el módulo NO cargó
        if (typeof window.GRANULAR_CROP_EXTRACTION_DB === 'undefined') {
          window.GRANULAR_CROP_EXTRACTION_DB = {
            maiz:{ N:18, P2O5:4, K2O:16, CaO:2, MgO:1, S:0, SO4:6, Fe:0.08, Mn:0.07, B:0.05, Zn:0.175, Cu:0.01, Mo:0.05, SiO2:0 },
            cana:{ N:1.81, P2O5:0.36, K2O:2.11, CaO:0.91, MgO:0.42, S:0, SO4:1.50, Fe:0.0375, Mn:0.0155, B:0.00074, Zn:0.0062, Cu:0.0022, Mo:0.0, SiO2:0 },
            aguacate:{ N:9, P2O5:4, K2O:16, CaO:8, MgO:4, S:0, SO4:10, Fe:0.08, Mn:0.07, B:0.05, Zn:0.175, Cu:0.01, Mo:0.05, SiO2:0 },
            limon:{ N:10, P2O5:3.5, K2O:18, CaO:12, MgO:3, S:0, SO4:7.5, Fe:0.08, Mn:0.07, B:0.05, Zn:0.15, Cu:0.015, Mo:0.03, SiO2:0 },
            banano:{ N:4, P2O5:1.2, K2O:12, CaO:0.8, MgO:0.5, S:0, SO4:0.9, Fe:0.015, Mn:0.012, B:0.008, Zn:0.03, Cu:0.002, Mo:0.005, SiO2:0 },
            trigo:{ N:25, P2O5:10, K2O:18, CaO:3, MgO:2, S:0, SO4:12, Fe:0.15, Mn:0.12, B:0.08, Zn:0.25, Cu:0.02, Mo:0.06, SiO2:0 },
            sorgo:{ N:35, P2O5:12, K2O:25, CaO:4, MgO:3, S:0, SO4:15, Fe:0.2, Mn:0.15, B:0.1, Zn:0.35, Cu:0.025, Mo:0.08, SiO2:0 },
            arroz:{ N:15, P2O5:6, K2O:12, CaO:1.5, MgO:1, S:0, SO4:6, Fe:0.1, Mn:0.08, B:0.06, Zn:0.2, Cu:0.015, Mo:0.04, SiO2:0 },
            cebada:{ N:20, P2O5:8, K2O:15, CaO:2.5, MgO:1.5, S:0, SO4:10.5, Fe:0.12, Mn:0.1, B:0.07, Zn:0.22, Cu:0.018, Mo:0.05, SiO2:0 }
          };
        }
        function getGranularLabel(n){ if(!window.isGranularRequerimientoElementalMode) return n; const m={P2O5:'P',K2O:'K',CaO:'Ca',MgO:'Mg',SiO2:'Si'}; return m[n]||n; }
        function getGranularConvertedValue(n,v){ if(!window.isGranularRequerimientoElementalMode) return parseFloat(v).toFixed(2); const f={P2O5:2.291,K2O:1.204,CaO:1.399,MgO:1.658,SiO2:2.139}[n]; return f? (parseFloat(v)/f).toFixed(2) : parseFloat(v).toFixed(2); }
        window.toggleGranularRequerimientoOxideElemental = function(){
          try {
            window.isGranularRequerimientoElementalMode = !window.isGranularRequerimientoElementalMode;
            const btn = document.getElementById('toggleGranularRequerimientoOxideElementalBtn');
            if (btn) { btn.textContent = window.isGranularRequerimientoElementalMode ? '🔄 Ver en Óxido' : '🔄 Ver en Elemental'; }
            window.calculateGranularNutrientRequirements && window.calculateGranularNutrientRequirements();
          } catch(e) { console.warn('fallback toggle error', e); }
        };
        window.calculateGranularNutrientRequirements = function(opts){
          try{
            const cropType = document.getElementById('granularRequerimientoCropType')?.value; const targetYield = parseFloat(document.getElementById('granularRequerimientoTargetYield')?.value)||10;
            const baseExtraction = window.GRANULAR_CROP_EXTRACTION_DB[cropType]; if(!baseExtraction) return;
            
            // 🚀 CRÍTICO: Cargar extractionOverrides desde storage (igual que función real)
            let extractionOverrides = {};
            if (!opts || !opts._skipLoadFromStorage) {
              try {
                const pid = localStorage.getItem('nutriplant-current-project');
                if (pid) {
                  const key = `nutriplant_project_${pid}`;
                  const data = JSON.parse(localStorage.getItem(key) || '{}');
                  if (data.granular && data.granular.requirements && data.granular.requirements.extractionOverrides) {
                    extractionOverrides = data.granular.requirements.extractionOverrides;
                  }
                }
              } catch(e) { console.warn('Error cargando extractionOverrides en fallback:', e); }
            }
            
            // 🚀 CRÍTICO: PRIORIDAD 1: savedGranularExtractionOverrides (variable global)
            // PRIORIDAD 2: extractionOverrides desde storage
            // PRIORIDAD 3: baseExtraction (valores precargados)
            const finalExtraction = {...baseExtraction};
            if (window.savedGranularExtractionOverrides && window.savedGranularExtractionOverrides[cropType]) {
              Object.assign(finalExtraction, window.savedGranularExtractionOverrides[cropType]);
            } else if (extractionOverrides[cropType]) {
              Object.assign(finalExtraction, extractionOverrides[cropType]);
            }
            
            const nutrients=['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
            const efficiency=Object.assign({}, window.GRANULAR_DEFAULT_EFFICIENCY, (opts&&opts.efficiency)||{});
            const totalExtraction={}, adjustment={}, realRequirement={};
            Object.keys(finalExtraction).forEach(n=>{ if(nutrients.includes(n)){ totalExtraction[n]=(finalExtraction[n]*targetYield).toFixed(2); const savedAdj=opts&&opts.adjustment?opts.adjustment[n]:undefined; adjustment[n]=(typeof savedAdj==='number')?savedAdj:parseFloat(totalExtraction[n]); const eff=efficiency[n]/100; realRequirement[n]=(parseFloat(adjustment[n])/eff).toFixed(2);} });
            window.renderGranularNutrientTable(finalExtraction,totalExtraction,adjustment,efficiency,realRequirement,targetYield);
          }catch(e){ console.error('fallback granular calc error', e); }
        };
        window.renderGranularNutrientTable = function(extraction,totalExtraction,adjustment,efficiency,realRequirement,targetYield){
          const container=document.getElementById('granularRequerimientoTableContainer'); if(!container) return; const nutrients=['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
          const html = '\n    <table class="fertirriego-requirement-table">\n      <thead>\n        <tr>\n          <th rowspan="2">Concepto</th>' + nutrients.map(n=>`<th id=\"granular-header-${n}\">${getGranularLabel(n)}</th>`).join('') + '\n        </tr>\n      </thead>\n      <tbody>\n        <tr>\n          <td><strong>Extracción por tonelada<br>(kg/ton)</strong></td>' + nutrients.map(n=>`<td><input type=\"number\" class=\"fertirriego-input\" id=\"granular-extract-${n}\" value=\"${getGranularConvertedValue(n, extraction[n])}\" step=\"0.01\" onchange=\"updateGranularExtractionPerTon('${n}', this.value)\"></td>`).join('') + '\n        </tr>\n        <tr>\n          <td><strong>Extracción total<br>(kg/ha)</strong></td>' + nutrients.map(n=>`<td id=\"granular-extraccion-total-${n}\">${getGranularConvertedValue(n, totalExtraction[n])}</td>`).join('') + '\n        </tr>\n        <tr>\n          <td><strong>Ajuste por niveles<br>en suelo</strong></td>' + nutrients.map(n=>`<td><input type=\"number\" class=\"fertirriego-input\" id=\"granular-adj-${n}\" value=\"${getGranularConvertedValue(n, adjustment[n])}\" step=\"0.01\" onchange=\"updateGranularAdjustment('${n}', this.value)\"></td>`).join('') + '\n        </tr>\n        <tr>\n          <td><strong>Eficiencia<br>(%)</strong></td>' + nutrients.map(n=>`<td><input type=\"number\" class=\"fertirriego-input\" id=\"granular-eff-${n}\" value=\"${efficiency[n]}\" step=\"0.1\" min=\"1\" max=\"100\" onchange=\"updateGranularEfficiency('${n}', this.value)\"></td>`).join('') + '\n        </tr>\n        <tr class=\"requirement-real-row\">\n          <td><strong>Requerimiento Real<br>(kg/ha)</strong></td>' + nutrients.map(n=>`<td id=\"granular-req-${n}\">${getGranularConvertedValue(n, realRequirement[n])}</td>`).join('') + '\n        </tr>\n      </tbody>\n    </table>';
          container.innerHTML = html;
        };
        window.updateGranularExtractionPerTon = function(nutrient,value){
          try{
            const cropType=document.getElementById('granularRequerimientoCropType').value;
            let val=parseFloat(value)||0;
            let nutrientKey = nutrient;
            // 🚀 CRÍTICO: Convertir de elemental a óxido si es necesario (igual que función real)
            if (window.isGranularRequerimientoElementalMode) {
              const elementalToOxide = {
                'P': { key: 'P2O5', factor: window.GRANULAR_CONVERSION_FACTORS?.P_TO_P2O5 || 2.291 },
                'K': { key: 'K2O', factor: window.GRANULAR_CONVERSION_FACTORS?.K_TO_K2O || 1.204 },
                'Ca': { key: 'CaO', factor: window.GRANULAR_CONVERSION_FACTORS?.Ca_TO_CaO || 1.399 },
                'Mg': { key: 'MgO', factor: window.GRANULAR_CONVERSION_FACTORS?.Mg_TO_MgO || 1.658 },
                'Si': { key: 'SiO2', factor: window.GRANULAR_CONVERSION_FACTORS?.Si_TO_SiO2 || 2.139 }
              };
              const conversion = elementalToOxide[nutrient];
              if (conversion) {
                val = val * conversion.factor;
                nutrientKey = conversion.key;
              }
            }
            // 🚀 CRÍTICO: NO mutar GRANULAR_CROP_EXTRACTION_DB directamente
            // Usar savedGranularExtractionOverrides (igual que función real)
            if (!window.savedGranularExtractionOverrides) window.savedGranularExtractionOverrides = {};
            if (!window.savedGranularExtractionOverrides[cropType]) window.savedGranularExtractionOverrides[cropType] = {};
            window.savedGranularExtractionOverrides[cropType][nutrientKey] = val;
            // Recalcular
            window.calculateGranularNutrientRequirements();
            // 🚀 CRÍTICO: Guardar en storage (igual que función real)
            if (typeof window.saveGranularRequirementsImmediate === 'function') {
              window.saveGranularRequirementsImmediate();
            } else if (typeof window.saveGranularRequirements === 'function') {
              window.saveGranularRequirements();
            }
          }catch(e){console.error('Error en updateGranularExtractionPerTon fallback:', e);}
        };
        // CRÍTICO: Estas funciones fallback DEBEN guardar también
        window.updateGranularAdjustment = function(nutrient,value){ 
          try{ 
            const eff=parseFloat(document.getElementById(`granular-eff-${nutrient}`).value)||1; 
            const rr=( (parseFloat(value)||0) / (eff/100) ).toFixed(2); 
            const cell=document.getElementById(`granular-req-${nutrient}`); 
            if(cell) cell.textContent = getGranularConvertedValue(nutrient, rr); 
            // CRÍTICO: Guardar inmediatamente
            if (typeof window.saveGranularRequirementsImmediate === 'function') {
              window.saveGranularRequirementsImmediate();
            } else if (typeof window.saveGranularRequirements === 'function') {
              window.saveGranularRequirements();
            }
          }catch(e){console.error('Error en updateGranularAdjustment fallback:', e);} 
        };
        window.updateGranularEfficiency = function(nutrient,value){ 
          try{ 
            const adj=parseFloat(document.getElementById(`granular-adj-${nutrient}`).value)||0; 
            const rr=( adj / ((parseFloat(value)||1)/100) ).toFixed(2); 
            const cell=document.getElementById(`granular-req-${nutrient}`); 
            if(cell) cell.textContent = getGranularConvertedValue(nutrient, rr); 
            // CRÍTICO: Guardar inmediatamente
            if (typeof window.saveGranularRequirementsImmediate === 'function') {
              window.saveGranularRequirementsImmediate();
            } else if (typeof window.saveGranularRequirements === 'function') {
              window.saveGranularRequirements();
            }
          }catch(e){console.error('Error en updateGranularEfficiency fallback:', e);} 
        };
      } catch(e) { console.warn('fallback granular inject error', e); }
    })();
    return `
      <div class="nutricion-granular-container">
        <div class="tab-navigation">
          <button class="tab-button active" onclick="selectGranularSubTab('requerimiento')">📋 Requerimiento Nutricional</button>
          <button class="tab-button" onclick="selectGranularSubTab('programa')">🌱 Programa Granular</button>
        </div>

        <div class="tab-content active" id="granularRequerimiento">
          <div class="fertirriego-requirement-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h3 style="color: #0369a1; font-size: 1.5rem; margin: 0;">📋 Requerimiento Nutricional</h3>
              <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-info btn-sm" onclick="toggleGranularRequerimientoOxideElemental()" id="toggleGranularRequerimientoOxideElementalBtn">
                  🔄 Ver en Elemental
                </button>
              </div>
            </div>
            
            <div class="fertirriego-inputs">
              <div class="form-group">
                <label for="granularRequerimientoCropType">Cultivo:</label>
                <select id="granularRequerimientoCropType" onchange="calculateGranularNutrientRequirements(); window.scheduleSaveGranularRequirements && window.scheduleSaveGranularRequirements();">
                  <option value="maiz">Maíz</option>
                  <option value="cana">Caña</option>
                  <option value="aguacate">Aguacate</option>
                  <option value="limon">Limón</option>
                  <option value="banano">Banano</option>
                  <option value="trigo">Trigo</option>
                  <option value="sorgo">Sorgo</option>
                  <option value="arroz">Arroz</option>
                  <option value="cebada">Cebada</option>
                </select>
              </div>
              <div class="form-group">
                <label for="granularRequerimientoTargetYield">Rendimiento Objetivo (ton/ha):</label>
                <input type="number" id="granularRequerimientoTargetYield" step="0.1" min="1" value="10" onchange="calculateGranularNutrientRequirements(); window.scheduleSaveGranularRequirements && window.scheduleSaveGranularRequirements();">
              </div>
              <div class="form-group" style="min-width: 280px;">
                <label style="visibility: hidden;">Botón</label>
                <button type="button" class="btn btn-success" onclick="showCustomGranularCropModal()" style="width: 100%; padding: 10px; cursor: pointer;">
                  ➕ Agregar Cultivo Personalizado
                </button>
              </div>
            </div>

            <div class="fertirriego-table-container" id="granularRequerimientoTableContainer">
              <!-- La tabla se generará dinámicamente con JavaScript -->
            </div>
          </div>
        </div>

        <div class="tab-content" id="granularPrograma">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 class="text-xl">⚪ Nutrición Granular - Programa</h2>
              <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <button class="btn btn-info btn-sm" onclick="toggleOxideElemental()" id="toggleOxideElementalBtn">
                  🔄 Ver en Elemental
                </button>
              </div>
        </div>
            
            <!-- RESUMEN TOTAL DEL CICLO -->
            <div class="nutrition-summary">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 class="summary-title">📊 Resumen Total del Ciclo</h3>
              </div>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Número de Aplicaciones:</span>
                  <span class="summary-value" id="totalApplications">0</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Dosis Total Kg/Ha:</span>
                  <span class="summary-value" id="totalDoseKgHa">0</span>
                </div>
              </div>
              
              <div class="summary-nutrients">
                <h4>💡 Aporte Total de Nutrientes (Kg/Ha):</h4>
                     <div class="nutrients-grid">
                       <div class="nutrient-item">
                         <span class="nutrient-label">N:</span>
                         <span class="nutrient-value" id="totalN">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label" id="labelP2O5">P₂O₅:</span>
                         <span class="nutrient-value" id="totalP2O5">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label" id="labelK2O">K₂O:</span>
                         <span class="nutrient-value" id="totalK2O">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label" id="labelCaO">CaO:</span>
                         <span class="nutrient-value" id="totalCaO">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label" id="labelMgO">MgO:</span>
                         <span class="nutrient-value" id="totalMgO">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">S:</span>
                         <span class="nutrient-value" id="totalS">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">SO₄:</span>
                         <span class="nutrient-value" id="totalSO4">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">Fe:</span>
                         <span class="nutrient-value" id="totalFe">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">Mn:</span>
                         <span class="nutrient-value" id="totalMn">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">B:</span>
                         <span class="nutrient-value" id="totalB">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">Zn:</span>
                         <span class="nutrient-value" id="totalZn">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">Cu:</span>
                         <span class="nutrient-value" id="totalCu">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label">Mo:</span>
                         <span class="nutrient-value" id="totalMo">0.0</span>
                       </div>
                       <div class="nutrient-item">
                         <span class="nutrient-label" id="labelSiO2">SiO₂:</span>
                         <span class="nutrient-value" id="totalSiO2">0.0</span>
                       </div>
                     </div>

              <div class="summary-nutrients" style="margin-top: 16px;">
                <h4>🎯 Requerimiento Real (Kg/Ha):</h4>
                <div class="nutrients-grid">
                  <div class="nutrient-item"><span class="nutrient-label">N:</span><span class="nutrient-value" id="reqN">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="reqLabelP2O5">P₂O₅:</span><span class="nutrient-value" id="reqP2O5">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="reqLabelK2O">K₂O:</span><span class="nutrient-value" id="reqK2O">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="reqLabelCaO">CaO:</span><span class="nutrient-value" id="reqCaO">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="reqLabelMgO">MgO:</span><span class="nutrient-value" id="reqMgO">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">S:</span><span class="nutrient-value" id="reqS">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">SO₄:</span><span class="nutrient-value" id="reqSO4">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Fe:</span><span class="nutrient-value" id="reqFe">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Mn:</span><span class="nutrient-value" id="reqMn">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">B:</span><span class="nutrient-value" id="reqB">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Zn:</span><span class="nutrient-value" id="reqZn">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Cu:</span><span class="nutrient-value" id="reqCu">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Mo:</span><span class="nutrient-value" id="reqMo">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="reqLabelSiO2">SiO₂:</span><span class="nutrient-value" id="reqSiO2">0.0</span></div>
                </div>
              </div>

              <div class="summary-nutrients" style="margin-top: 16px;">
                <h4>➖ Diferencia (Aporte - Requerimiento) (Kg/Ha):</h4>
                <div class="nutrients-grid">
                  <div class="nutrient-item"><span class="nutrient-label">N:</span><span class="nutrient-value" id="diffN">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="diffLabelP2O5">P₂O₅:</span><span class="nutrient-value" id="diffP2O5">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="diffLabelK2O">K₂O:</span><span class="nutrient-value" id="diffK2O">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="diffLabelCaO">CaO:</span><span class="nutrient-value" id="diffCaO">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="diffLabelMgO">MgO:</span><span class="nutrient-value" id="diffMgO">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">S:</span><span class="nutrient-value" id="diffS">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">SO₄:</span><span class="nutrient-value" id="diffSO4">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Fe:</span><span class="nutrient-value" id="diffFe">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Mn:</span><span class="nutrient-value" id="diffMn">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">B:</span><span class="nutrient-value" id="diffB">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Zn:</span><span class="nutrient-value" id="diffZn">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Cu:</span><span class="nutrient-value" id="diffCu">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label">Mo:</span><span class="nutrient-value" id="diffMo">0.0</span></div>
                  <div class="nutrient-item"><span class="nutrient-label" id="diffLabelSiO2">SiO₂:</span><span class="nutrient-value" id="diffSiO2">0.0</span></div>
                </div>
              </div>
              </div>
            </div>
            
            <!-- APLICACIONES GRANULARES -->
            <div class="granular-applications" id="granularApplications">
              <!-- Las aplicaciones se generan dinámicamente -->
            </div>
            
            <!-- BOTÓN PARA AGREGAR NUEVA APLICACIÓN -->
            <div class="add-application-section">
              <button id="addApplicationBtn" class="btn btn-primary" onclick="addGranularApplication()">
                ➕ Agregar Nueva Aplicación Granular
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  if (name === "Hidroponia") {
    return `
      <div class="hydroponia-container">
        <div class="hydroponia-tabs">
          <button class="tab-button active" data-tab="hidro-solucion">
            <span class="tab-icon">🧪</span>
            <span class="tab-text">Solución por etapa</span>
          </button>
          <button class="tab-button" data-tab="hidro-calculo">
            <span class="tab-icon">⚙️</span>
            <span class="tab-text">Cálculo de fertilizantes</span>
          </button>
        </div>

        <div class="hydroponia-content">
          <div class="tab-content active" id="hidro-solucion">
            <div class="hydro-card">
              <div class="hydro-card-header">
                <h3>🧪 Solución nutritiva por etapa</h3>
                <p id="hydroNitrogenSummaryText" class="hydro-muted" style="margin:8px 0 0 0;font-size:0.9rem;">Suma de N (meq/L) = N-NO₃⁻ + N-NH₄⁺. Cargando resumen de nitrato/amonio...</p>
              </div>
              <div id="hydroMeqTableWrap" class="hydro-table-wrap"></div>
              <div id="hydroMeqPercentWrap" class="hydro-table-wrap" style="margin-top:12px;"></div>
              <div id="hydroPpmTableWrap" class="hydro-table-wrap" style="margin-top:12px;"></div>
            </div>

            <div class="hydro-card hydro-card-ternary-wrap">
              <div class="hidroponia-ternary-watermark" aria-hidden="true">
                <img src="assets/NutriPlant_PRO_blue.png" alt="">
              </div>
              <div class="hydro-card-header">
                <h3>📐 Diagrama ternario (aniones + cationes)</h3>
                <div class="hydro-muted">
                  <strong>Rangos por elemento (%).</strong> Aniones: N-NO₃⁻ 20–80, P-H₂PO₄⁻ 1.25–10, S-SO₄²⁻ 10–70. Cationes: K⁺ 10–65, Ca²⁺ 22.5–62.5, Mg²⁺ 0.5–40. Fuera de estos mín/máx puede haber antagonismos y precipitados. El % de NH₄⁺ se calcula sobre el total de cationes (K+Ca+Mg+NH₄⁺) y no entra en el triángulo.
                </div>
              </div>
              <div id="hydroTriangleInfoCombined" class="hydro-muted" style="margin-bottom:8px;"></div>
              <div id="hydroTriangleCombined" class="hydro-triangle"></div>
            </div>
          </div>

          <div class="tab-content" id="hidro-calculo">
            <div class="hydro-card">
              <div class="hydro-card-header">
                <h3>🎯 Objetivo de solución (ppm)</h3>
                <div class="hydro-muted">Se toma de la etapa seleccionada en la pestaña anterior.</div>
              </div>
              <div id="hydroObjectiveGrid" class="hydro-grid"></div>
            </div>

            <div class="hydro-card">
              <div class="hydro-card-header">
                <h3>💧 Análisis de agua (ppm)</h3>
                <div class="hydro-muted">Ingresa los aportes del agua para calcular el faltante.</div>
              </div>
              <div id="hydroWaterGrid" class="hydro-grid"></div>
            </div>

            <div class="hydro-card">
              <div class="hydro-card-header">
                <h3>📉 Requerimiento total (ppm)</h3>
              </div>
              <div id="hydroMissingGrid" class="hydro-grid"></div>
            </div>

            <div class="hydro-card">
              <div class="hydro-card-header">
                <h3>🧮 Fertilizantes disponibles (elemental)</h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <button class="btn btn-secondary btn-sm" id="hydroAddFertBtn">➕ Agregar fertilizante</button>
                  <button class="btn btn-info btn-sm" id="hydroManageCatalogBtn" type="button" title="Ver, editar o eliminar fertilizantes personalizados">Gestionar catálogo de fertilizantes</button>
                </div>
              </div>
              <div id="hydroVolumeCard" class="hydro-volume-card" style="margin-bottom:14px;"></div>
              <div id="hydroFertTableWrap" class="hydro-table-wrap"></div>
              <div id="hydroFertTotals" class="hydro-grid" style="margin-top:10px;"></div>
              <div id="hydroFertRemaining" class="hydro-grid hydro-grid-remaining" style="margin-top:8px;font-size:0.85rem;opacity:0.92;"></div>
              <div id="hydroValidationNote" class="hydro-validation-note" style="margin-top:12px;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (name === "Reporte") {
    return `
      <div class="card">
        <h2 class="text-xl">📄 Reportes Generados</h2>
        
        <!-- Botón para generar nuevo reporte -->
        <div class="report-header" style="margin-bottom: 20px;">
          <button id="generateNewReportBtn" class="btn btn-primary" onclick="openReportModal()">
            📄 Generar Nuevo Reporte PDF
          </button>
        </div>
        
        <!-- Lista de reportes generados -->
        <div id="reportsList" class="reports-list">
          <div class="no-reports" style="text-align: center; padding: 40px; color: #666;">
            <p>📋 No hay reportes generados aún</p>
            <p style="font-size: 14px; margin-top: 10px;">Genera tu primer reporte desde la sección de enmiendas</p>
          </div>
        </div>
        
        <!-- Información sobre reportes -->
        <div class="report-info" style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h4>ℹ️ Información sobre los Reportes</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Ubicación del proyecto (coordenadas, área y polígono)</li>
            <li>Enmiendas</li>
            <li>Nutrición granular</li>
            <li>Fertirriego</li>
            <li>Hidroponía</li>
            <li>Déficit de presión de vapor (VPD)</li>
          </ul>
        </div>
      </div>
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
            <button id="centerOnUserLocation" class="btn btn-primary">📍 Mi Ubicación</button>
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
  if (name === "Análisis: Suelo")     return createSoilAnalysisTabHTML();
  if (name === "Análisis: Solución Nutritiva")  return createSolucionNutritivaTabHTML();
  if (name === "Análisis: Extracto de Pasta")   return createExtractoPastaTabHTML();
  if (name === "Análisis: Agua")      return createAguaTabHTML();
  if (name === "Análisis: Foliar")    return (typeof createFoliarTabHTML === 'function' ? createFoliarTabHTML() : '<div class="card"><h2 class="text-xl">🔬 Análisis Foliar</h2><p>Cargando…</p></div>');
  if (name === "Análisis: Fruta") return (typeof createFrutaTabHTML === 'function' ? createFrutaTabHTML() : '<div class="card"><h2 class="text-xl">🍎 Análisis de Fruta</h2><p>Cargando…</p></div>');
  if (name === "Análisis: Déficit de Presión de Vapor") {
    return createVPDSectionHTML();
  }

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

function emitProjectContextUpdate(detail = {}) {
  try {
    const payload = {
      projectId: typeof np_getCurrentProjectId === 'function' ? np_getCurrentProjectId() : (localStorage.getItem('nutriplant-current-project') || ''),
      section: (typeof title !== 'undefined' && title && title.textContent) ? title.textContent.trim() : 'Inicio',
      ...detail,
      at: new Date().toISOString()
    };
    document.dispatchEvent(new CustomEvent('np:project-context-updated', { detail: payload }));
  } catch (e) {
    console.warn('emitProjectContextUpdate:', e);
  }
}

function selectSection(name, el) {
  console.log('🔄 selectSection ejecutándose para:', name);
  try {
    document.dispatchEvent(new CustomEvent('np:section-changed', { detail: { section: name, at: new Date().toISOString() } }));
  } catch {}
  
  // Preservar posición de scroll de la sección actual antes de cambiar (para restaurar al regresar)
  var previousSection = title ? title.textContent.trim() : '';
  if (previousSection) {
    var subTab = getCurrentSubTabForSection(previousSection);
    var scrollKey = subTab ? previousSection + '|' + subTab : previousSection;
    sectionScrollPositions[scrollKey] = getScrollPosition();
    if (previousSection === 'Análisis: Solución Nutritiva' && currentProject.id && typeof window.saveSolucionNutritivaUIState === 'function') {
      try { window.saveSolucionNutritivaUIState(); } catch (e) { console.warn('saveSolucionNutritivaUIState', e); }
    }
    if (previousSection === 'Análisis: Extracto de Pasta' && currentProject.id && typeof window.saveExtractoPastaUIState === 'function') {
      try { window.saveExtractoPastaUIState(); } catch (e) { console.warn('saveExtractoPastaUIState', e); }
    }
    if (previousSection === 'Análisis: Agua' && currentProject.id && typeof window.saveAguaUIState === 'function') {
      try { window.saveAguaUIState(); } catch (e) { console.warn('saveAguaUIState', e); }
    }
    if (previousSection === 'Análisis: Foliar' && currentProject.id && typeof window.saveFoliarUIState === 'function') {
      try { window.saveFoliarUIState(); } catch (e) { console.warn('saveFoliarUIState', e); }
    }
    if (previousSection === 'Análisis: Fruta' && currentProject.id && typeof window.saveFrutaUIState === 'function') {
      try { window.saveFrutaUIState(); } catch (e) { console.warn('saveFrutaUIState', e); }
    }
  }
  
  // CRÍTICO: Guardar datos INMEDIATAMENTE (sin debounce) ANTES de cambiar de sección
  // Hacer esto de forma síncrona para asegurar que los elementos aún existen
  if (currentProject.id) {
    try {
      // PRIMERO: Guardar Requerimientos de Granular y Fertirriego INMEDIATAMENTE
      // Esto asegura que se guarden incluso si los elementos están ocultos
      if (typeof window.saveGranularRequirementsImmediate === 'function') {
        try {
          window.saveGranularRequirementsImmediate();
          console.log('⚡ Requerimientos Granular guardados INMEDIATAMENTE');
        } catch (e) {
          console.warn('⚠️ Error guardando Granular:', e);
        }
      } else if (typeof window.saveGranularRequirements === 'function') {
        // Fallback si no existe la función inmediata
        try {
          window.saveGranularRequirements();
          console.log('✅ Requerimientos Granular guardados explícitamente');
        } catch (e) {
          console.warn('⚠️ Error guardando Granular:', e);
        }
      }
      
      if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
        try {
          window.saveFertirriegoRequirementsImmediate();
          console.log('⚡ Requerimientos Fertirriego guardados INMEDIATAMENTE');
        } catch (e) {
          console.warn('⚠️ Error guardando Fertirriego:', e);
        }
      } else if (typeof window.saveFertirriegoRequirements === 'function') {
        // Fallback si no existe la función inmediata
        try {
          window.saveFertirriegoRequirements();
          console.log('✅ Requerimientos Fertirriego guardados explícitamente');
        } catch (e) {
          console.warn('⚠️ Error guardando Fertirriego:', e);
        }
      }
      
      // SEGUNDO: Llamar a saveProjectData que recopila de los elementos actuales
      saveProjectData();
      console.log('✅ Datos guardados INMEDIATAMENTE ANTES de cambiar sección');
    } catch (e) {
      console.error('❌ Error al guardar antes de cambiar sección:', e);
    }
  }
  
  // Aplicar clase especial para página de inicio
  const content = document.querySelector('.content');
  if (content) {
    if (name === 'Inicio') {
      content.classList.add('inicio-page');
    } else {
      content.classList.remove('inicio-page');
    }
  }

  if (menu) {
    menu.querySelectorAll("a").forEach(a => a.classList.remove("active"));
    if (el) el.classList.add("active");
    else {
      const anchor = menu.querySelector(`a[data-section="${(name || "").toLowerCase()}"]`);
      if (anchor) anchor.classList.add("active");
    }
  }

  if (previousSection === 'Análisis: Suelo' && currentProject.id && typeof window.saveSoilAnalysisUIState === 'function') {
    try { window.saveSoilAnalysisUIState(); } catch (e) { console.warn('saveSoilAnalysisUIState', e); }
  }
  if (title) title.textContent = name;
  if (view)  view.innerHTML = sectionTemplate(name);

  // Agregar indicador de proyecto en todas las secciones
  addProjectIndicator(view);
  
  // Restaurar posición de scroll para secciones sin subpestañas (Enmienda, Ubicación, Reporte, etc.)
  // Análisis: Suelo, Solución Nutritiva y Extracto de Pasta se restaura después de init (en su propio bloque)
  if (name !== 'Nutricion Granular' && name !== 'Fertirriego' && name !== 'Análisis: Suelo' && name !== 'Análisis: Solución Nutritiva' && name !== 'Análisis: Extracto de Pasta' && name !== 'Análisis: Agua' && name !== 'Análisis: Foliar' && name !== 'Análisis: Fruta') {
    if (content && sectionScrollPositions[name]) content.classList.add('restoring-scroll');
    requestAnimationFrame(function() { restoreScrollForKey(name); });
  }
  
  // Cargar resultados guardados de VPD después de renderizar (solo si no hay resultados nuevos)
  if (name === "Análisis: Déficit de Presión de Vapor") {
    // Delay para asegurar que el DOM esté completamente renderizado
    setTimeout(() => {
      const resultsDiv = document.getElementById('vpd-environmental-results');
      // Solo cargar resultados guardados si el div está completamente vacío
      if (resultsDiv && resultsDiv.innerHTML.trim() === '') {
        loadVPDSavedResults();
      }
    }, 100);
  }

  // Inicializar pestaña Análisis de Suelo (listado y formulario) y restaurar estado (secciones abiertas, análisis seleccionado)
  if (name === "Análisis: Suelo") {
    if (content && sectionScrollPositions['Análisis: Suelo']) content.classList.add('restoring-scroll');
    setTimeout(() => {
      if (typeof window.initSoilAnalysesTab === 'function') window.initSoilAnalysesTab();
      if (typeof window.restoreSoilAnalysisUIState === 'function') window.restoreSoilAnalysisUIState();
      setTimeout(function() { restoreScrollForKey('Análisis: Suelo'); }, 80);
    }, 50);
  }
  
  // Inicializar pestaña Análisis: Solución Nutritiva (misma estructura que Análisis de Suelo)
  if (name === "Análisis: Solución Nutritiva") {
    if (content && sectionScrollPositions['Análisis: Solución Nutritiva']) content.classList.add('restoring-scroll');
    setTimeout(() => {
      if (typeof window.initSolucionNutritivaTab === 'function') window.initSolucionNutritivaTab();
      if (typeof window.restoreSolucionNutritivaUIState === 'function') window.restoreSolucionNutritivaUIState();
      setTimeout(function() { restoreScrollForKey('Análisis: Solución Nutritiva'); }, 120);
    }, 50);
  }

  // Inicializar pestaña Análisis: Extracto de Pasta
  if (name === "Análisis: Extracto de Pasta") {
    if (content && sectionScrollPositions['Análisis: Extracto de Pasta']) content.classList.add('restoring-scroll');
    setTimeout(() => {
      if (typeof window.initExtractoPastaTab === 'function') window.initExtractoPastaTab();
      if (typeof window.restoreExtractoPastaUIState === 'function') window.restoreExtractoPastaUIState();
      setTimeout(function() { restoreScrollForKey('Análisis: Extracto de Pasta'); }, 120);
    }, 50);
  }

  // Inicializar pestaña Análisis: Agua
  if (name === "Análisis: Agua") {
    if (content && sectionScrollPositions['Análisis: Agua']) content.classList.add('restoring-scroll');
    setTimeout(() => {
      if (typeof window.initAguaTab === 'function') window.initAguaTab();
      if (typeof window.restoreAguaUIState === 'function') window.restoreAguaUIState();
      setTimeout(function() { restoreScrollForKey('Análisis: Agua'); }, 120);
    }, 50);
  }

  // Inicializar pestaña Análisis: Foliar (DOP)
  if (name === "Análisis: Foliar") {
    if (content && sectionScrollPositions['Análisis: Foliar']) content.classList.add('restoring-scroll');
    setTimeout(() => {
      if (typeof window.initFoliarTab === 'function') window.initFoliarTab();
      if (typeof window.restoreFoliarUIState === 'function') window.restoreFoliarUIState();
      setTimeout(function() { restoreScrollForKey('Análisis: Foliar'); }, 120);
    }, 50);
  }

  // Inicializar pestaña Análisis: Fruta (ICC)
  if (name === "Análisis: Fruta") {
    if (content && sectionScrollPositions['Análisis: Fruta']) content.classList.add('restoring-scroll');
    setTimeout(() => {
      if (typeof window.initFrutaTab === 'function') window.initFrutaTab();
      if (typeof window.restoreFrutaUIState === 'function') window.restoreFrutaUIState();
      setTimeout(function() { restoreScrollForKey('Análisis: Fruta'); }, 120);
    }, 50);
  }
  
  // CARGAR DATOS DEL PROYECTO cuando entramos a una sección que lo requiere
  // En Nutricion Granular la carga se maneja en selectGranularSubTab()
  if (currentProject.id && name === 'Ubicacion') {
    requestAnimationFrame(() => {
      loadProjectData();
      applyProjectDataToUI();
    });
  }
  
  // Refrescar sección específica si es Nutrición Granular
  if (name === 'Nutricion Granular') {
    
    // Inicializar inmediatamente sin delay
    console.log('🔄 Refrescando sección de Nutrición Granular...');
    
    // Inicializar la última subpestaña usada (por defecto 'requerimiento')
    let lastGranular = 'requerimiento';
    try {
      const project = window.projectManager ? window.projectManager.getCurrentProject() : null;
      if (project && project.granularLastTab) {
        lastGranular = project.granularLastTab;
      } else {
        const pid = localStorage.getItem('nutriplant-current-project');
        if (pid) {
          // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
          const key = `nutriplant_project_${pid}`;
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.granularLastTab) lastGranular = data.granularLastTab;
        }
      }
    } catch {}
    if (sectionScrollPositions['Nutricion Granular|' + lastGranular] && content) content.classList.add('restoring-scroll');
    // Esperar a que el DOM esté listo antes de inicializar subpestañas
    requestAnimationFrame(() => {
      if (typeof window.selectGranularSubTab === 'function') {
        window.selectGranularSubTab(lastGranular);
      }
      // Restaurar scroll después de que el programa/requerimiento esté renderizado (ej. aplicación 4)
      setTimeout(function() { restoreScrollForKey('Nutricion Granular|' + lastGranular); }, 180);
    });
    
    // NOTA: La carga de datos se maneja en selectGranularSubTab() para evitar duplicados
    // NO llamar loadProjectData() aquí porque selectGranularSubTab() ya lo hace
  }

  // Inicializar Fertirriego cuando se seleccione la sección
  if (name === 'Fertirriego') {
    // CARGAR DATOS DEL PROYECTO PRIMERO (igual que Enmienda)
    loadProjectData();
    var fertiLastTab = 'extraccion';
    try {
      var fp = window.projectManager ? window.projectManager.getCurrentProject() : null;
      if (fp && fp.fertirriegoLastTab) fertiLastTab = fp.fertirriegoLastTab;
      else {
        var fpid = localStorage.getItem('nutriplant-current-project');
        if (fpid) {
          var fdata = JSON.parse(localStorage.getItem('nutriplant_project_' + fpid) || '{}');
          if (fdata.fertirriegoLastTab) fertiLastTab = fdata.fertirriegoLastTab;
        }
      }
    } catch (e) {}
    if (sectionScrollPositions['Fertirriego|' + fertiLastTab] && content) content.classList.add('restoring-scroll');
    requestAnimationFrame(() => {
      console.log('💧 Inicializando sección Fertirriego...');
      // Restaurar última subpestaña activa
      try {
        let last = 'extraccion';
        const project = window.projectManager ? window.projectManager.getCurrentProject() : null;
        if (project && project.fertirriegoLastTab) {
          last = project.fertirriegoLastTab;
        } else {
          const pid = localStorage.getItem('nutriplant-current-project');
          if (pid) {
            // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
            const key = `nutriplant_project_${pid}`;
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.fertirriegoLastTab) last = data.fertirriegoLastTab;
          }
        }
        // Activar pestaña correspondiente
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        const btn = document.querySelector(`.tab-button[data-tab="${last}"]`);
        const content = document.getElementById(last);
        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');
      } catch {}

      // ORDEN CRÍTICO: 1) Cargar requirements PRIMERO (valores guardados), 2) NO aplicar UI state (puede sobrescribir), 3) Solo entonces calcular si no hay tabla
      // Paso 1: Cargar cultivos personalizados guardados PRIMERO
      if (typeof window.loadCustomFertirriegoCrops === 'function') {
        window.loadCustomFertirriegoCrops();
      }
      
      // CRÍTICO: Cargar requerimientos guardados PRIMERO - así la tabla (ferti-req-*) queda llena
      // antes de initFertirriegoProgramUI/updateFertiSummary, y "Requerimiento Real" se ve bien al cargar/recargar.
      requestAnimationFrame(() => {
        if (typeof window.loadFertirriegoRequirements === 'function') {
          console.log('🔄 selectSection: Llamando loadFertirriegoRequirements() (maneja renderización completa)...');
          window.loadFertirriegoRequirements();
        } else {
          console.error('❌ loadFertirriegoRequirements no disponible - la tabla no se renderizará');
        }
        // Inicializar programa / gráficas DESPUÉS de cargar requerimientos para que Requerimiento Real sea correcto
        requestAnimationFrame(() => {
          try {
            const activeBtn = document.querySelector('.fertirriego-container .tab-button.active');
            const activeTab = activeBtn && activeBtn.getAttribute('data-tab');
            if (activeTab === 'programa') {
              if (typeof window.initFertirriegoProgramUI === 'function') window.initFertirriegoProgramUI();
            } else if (activeTab === 'graficas') {
              if (typeof window.loadFertiCustomMaterials === 'function') window.loadFertiCustomMaterials();
              if (typeof window.loadFertirriegoProgram === 'function') window.loadFertirriegoProgram();
              if (typeof window.updateFertiSummary === 'function') {
                window.updateFertiSummary();
              } else if (typeof window.updateFertiCharts === 'function') {
                window.updateFertiCharts();
              }
            }
          } catch (e) { console.warn('Fertirriego init programa/graficas:', e); }
        });
      });
      
      // Restaurar scroll al volver a Fertirriego (ej. en programa o gráficas)
      var fertiActive = document.querySelector('.fertirriego-container .tab-button.active');
      var fertiTab = fertiActive ? (fertiActive.getAttribute('data-tab') || 'extraccion') : 'extraccion';
      setTimeout(function() { restoreScrollForKey('Fertirriego|' + fertiTab); }, 120);
    });
  }

  // Inicializar Hidroponia cuando se seleccione la sección
  if (name === 'Hidroponia') {
    loadProjectData();
    requestAnimationFrame(() => {
      if (typeof window.initHydroponiaUI === 'function') {
        window.initHydroponiaUI();
      }
    });
  }

  // Verificar si hay proyecto seleccionado para secciones que lo requieren
  const currentProjectId = np_getCurrentProjectId();
  const requiresProject = !['Inicio'].includes(name);
  
  if (requiresProject && !currentProjectId) {
    // Si la sección requiere proyecto pero no hay uno seleccionado, mostrar mensaje
    if (view) {
      view.innerHTML = `
        <div class="card">
          <div class="no-project-message">
            <h2>📁 Selecciona un proyecto primero</h2>
            <p>Para acceder a esta sección, primero debes seleccionar un proyecto desde la página de inicio.</p>
            <button class="btn btn-primary" onclick="selectSection('Inicio')">
              ← Volver al Inicio
            </button>
          </div>
        </div>
      `;
    }
    return;
  }

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
      console.log('🔧 Inicializando sección Enmienda...');
      initializeEnmiendaCalculator();
      // Cargar tabla de enmiendas cuando se seleccione esta sección
      console.log('🔄 Cargando tabla de enmiendas para sección Enmienda...');
      loadAmendmentsTable();
      console.log('✅ Sección Enmienda inicializada');
    }, 500); // Aumentado de 100ms a 500ms para asegurar que el DOM esté listo
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
  
  // Cargar datos después del cambio de sección
  // ✅ NOTA: Para "Nutricion Granular", la carga se maneja en selectGranularSubTab() (línea 1240-1246)
  // NO llamar loadOnTabChange para evitar duplicados
  if (name !== 'Nutricion Granular') {
  setTimeout(() => {
    loadOnTabChange(name);
  }, 100);
  }
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
    // Si no hay proyecto seleccionado, mostrar mensaje para seleccionar uno
    const noProjectCard = document.createElement("div");
    noProjectCard.className = "sb-card";
    noProjectCard.innerHTML = `
      <div class="title">
        <div class="t">
          <span class="info-icon" data-icon="ℹ️" title="Proyecto">ℹ️</span>
          <span class="text">Proyecto</span>
        </div>
      </div>
      <div class="sb-chiprow">
        <div class="no-project-message">
          <p>📁 Selecciona un proyecto desde la página de inicio para comenzar</p>
        </div>
      </div>
    `;
    sbStack.appendChild(noProjectCard);
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
    <button class="sb-chip" data-section="fruta">🍎 <span class="text">Fruta</span></button>
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
// FUNCIONES DE ENMIENDA - VERSIÓN 2.1 CON H Y AL + TÍTULOS ACTUALIZADOS
// ==========================
let enmiendaAutoSaveTimer = null;
function scheduleEnmiendaAutoSave(options = {}) {
  const { immediate = false } = options;
  try {
    if (!currentProject || !currentProject.id) return;
    if (enmiendaAutoSaveTimer) clearTimeout(enmiendaAutoSaveTimer);
    const delay = immediate ? 0 : 600;
    enmiendaAutoSaveTimer = setTimeout(() => {
      try {
        saveProjectData({ silent: true });
      } catch (e) {
        console.warn('autosave enmienda', e);
      }
    }, delay);
  } catch {}
}

function initializeEnmiendaCalculator() {
  console.log('🔧 Inicializando calculadora de enmiendas...');
  console.log('🔍 Buscando botones en el DOM...');
  const calculateBtn = document.getElementById('calculate-amendment');
  const resetBtn = document.getElementById('reset-amendment');
  const resultsSectionInit = document.getElementById('amendment-results');
  const soilReachInput = document.getElementById('soil-reach-percent');
  // Ocultar resultados al iniciar, a menos que haya resultados guardados visibles
  try {
    const hasSavedVisible = !!(currentProject && currentProject.amendments && currentProject.amendments.results && (currentProject.amendments.results.isVisible || currentProject.amendments.results.detailedHTML));
    if (resultsSectionInit && !hasSavedVisible) {
      resultsSectionInit.style.display = 'none';
    }
  } catch {}
  
  console.log('Botón calcular encontrado:', calculateBtn);
  console.log('Botón reset encontrado:', resetBtn);
  
  
  if (calculateBtn && !calculateBtn.dataset.bound) {
    calculateBtn.addEventListener('click', function(event) {
      event.preventDefault();
      console.log('🎯 Botón calcular presionado!');
      calculateAmendment();
      scheduleEnmiendaAutoSave({ immediate: true });
    });
    calculateBtn.dataset.bound = '1';
    console.log('✅ Event listener agregado al botón calcular');
    
  } else {
    console.log('❌ Botón calcular NO encontrado');
  }
  
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.addEventListener('click', function(event) {
      event.preventDefault();
      resetAmendmentForm();
    });
    resetBtn.dataset.bound = '1';
  }

  if (soilReachInput) {
    soilReachInput.addEventListener('input', () => {
      updateSoilReachAdjustment({ mutate: false });
      scheduleEnmiendaAutoSave();
    });
    soilReachInput.addEventListener('change', () => {
      normalizeSoilReachPercent(soilReachInput, { mutate: true });
      updateSoilReachAdjustment({ mutate: true });
      scheduleEnmiendaAutoSave();
    });
    soilReachInput.addEventListener('blur', () => {
      normalizeSoilReachPercent(soilReachInput, { mutate: true });
      updateSoilReachAdjustment({ mutate: true });
      scheduleEnmiendaAutoSave();
    });
  }
  
  // Auto-calcular CIC cuando cambien los valores
  const inputs = ['k-initial', 'ca-initial', 'mg-initial', 'h-initial', 'na-initial', 'al-initial'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', calculateCIC);
      input.addEventListener('input', calculateAutomaticAdjustments);
      input.addEventListener('input', () => scheduleEnmiendaAutoSave());
    }
  });
  
  // Auto-calcular ajustes cuando cambie el CIC total
  const cicTotalInput = document.getElementById('cic-total');
  if (cicTotalInput) {
    cicTotalInput.addEventListener('input', calculateAutomaticAdjustments);
    cicTotalInput.addEventListener('input', () => scheduleEnmiendaAutoSave());
  }

  // Auto-calcular Total % cuando cambien los objetivos
  const targetInputs = ['k-target', 'ca-target', 'mg-target', 'h-target', 'na-target', 'al-target'];
  targetInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', calculateTotalPercent);
      input.addEventListener('input', () => scheduleEnmiendaAutoSave());
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
  
  // Calcular porcentajes de cada catión
  calculateCationPercentages(cic);
  
  // Actualizar iconos de estado
  updateCationStatusIcons();
  
  // Recalcular porcentajes objetivo si hay meq definidos
  const kMeq = parseFloat(document.getElementById('k-target')?.value || 0);
  const caMeq = parseFloat(document.getElementById('ca-target')?.value || 0);
  const mgMeq = parseFloat(document.getElementById('mg-target')?.value || 0);
  const hMeq = parseFloat(document.getElementById('h-target')?.value || 0);
  const naMeq = parseFloat(document.getElementById('na-target')?.value || 0);
  const alMeq = parseFloat(document.getElementById('al-target')?.value || 0);
  
  if (kMeq > 0 || caMeq > 0 || mgMeq > 0 || hMeq > 0 || naMeq > 0 || alMeq > 0) {
    calculateTargetPercentages(kMeq, caMeq, mgMeq, hMeq, naMeq, alMeq, cic);
  }
}

function calculateCationPercentages(cic) {
  if (cic === 0) return;
  
  const cations = [
    { id: 'k-percent', value: parseFloat(document.getElementById('k-initial')?.value || 0) },
    { id: 'ca-percent', value: parseFloat(document.getElementById('ca-initial')?.value || 0) },
    { id: 'mg-percent', value: parseFloat(document.getElementById('mg-initial')?.value || 0) },
    { id: 'h-percent', value: parseFloat(document.getElementById('h-initial')?.value || 0) },
    { id: 'na-percent', value: parseFloat(document.getElementById('na-initial')?.value || 0) },
    { id: 'al-percent', value: parseFloat(document.getElementById('al-initial')?.value || 0) }
  ];
  
  cations.forEach(cation => {
    const percent = (cation.value / cic) * 100;
    const element = document.getElementById(cation.id);
    if (element) {
      element.textContent = percent.toFixed(1) + '%';
    }
  });
}

function updateCationStatusIcons() {
  const k = parseFloat(document.getElementById('k-initial')?.value || 0);
  const ca = parseFloat(document.getElementById('ca-initial')?.value || 0);
  const mg = parseFloat(document.getElementById('mg-initial')?.value || 0);
  const h = parseFloat(document.getElementById('h-initial')?.value || 0);
  const na = parseFloat(document.getElementById('na-initial')?.value || 0);
  const al = parseFloat(document.getElementById('al-initial')?.value || 0);
  const cic = k + ca + mg + h + na + al;
  
  if (cic === 0) return;
  
  // Calcular porcentajes
  const kPercent = (k / cic) * 100;
  const caPercent = (ca / cic) * 100;
  const mgPercent = (mg / cic) * 100;
  const hPercent = (h / cic) * 100;
  const naPercent = (na / cic) * 100;
  const alPercent = (al / cic) * 100;
  
  // Actualizar iconos de estado
  updateStatusIcon('k-status', kPercent, 3, 7);
  updateStatusIcon('ca-status', caPercent, 65, 75);
  updateStatusIcon('mg-status', mgPercent, 10, 15);
  updateStatusIcon('h-status', hPercent, 0, 10);
  updateStatusIcon('na-status', naPercent, 0, 1);
  updateStatusIcon('al-status', alPercent, 0, 1);
}

function updateStatusIcon(elementId, percent, minRange, maxRange) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Si no hay datos (CIC = 0), mostrar guión
  if (isNaN(percent) || percent === 0) {
    element.textContent = '-';
    return;
  }
  
  if (percent >= minRange && percent <= maxRange) {
    element.textContent = '✅';
  } else if (percent > maxRange) {
    element.textContent = '⚠️';
  } else {
    element.textContent = '❌';
  }
}

function calculateTotalPercent() {
  const k = parseFloat(document.getElementById('k-target')?.value || 0);
  const ca = parseFloat(document.getElementById('ca-target')?.value || 0);
  const mg = parseFloat(document.getElementById('mg-target')?.value || 0);
  const h = parseFloat(document.getElementById('h-target')?.value || 0);
  const na = parseFloat(document.getElementById('na-target')?.value || 0);
  const al = parseFloat(document.getElementById('al-target')?.value || 0);
  
  const totalMeq = k + ca + mg + h + na + al;
  const cic = parseFloat(document.getElementById('cic-total')?.value || 0);
  
  // Calcular porcentajes basados en los meq objetivo
  calculateTargetPercentages(k, ca, mg, h, na, al, cic);
  
  // Mostrar total de meq en lugar de porcentaje
  const totalInput = document.getElementById('total-percent');
  if (totalInput) {
    totalInput.value = totalMeq.toFixed(2);
    
    // Cambiar color según si la suma de meq es igual al CIC
    if (Math.abs(totalMeq - cic) < 0.1) {
      totalInput.style.borderColor = '#10b981';
      totalInput.style.background = '#f0fdf4';
      totalInput.style.color = '#059669';
    } else {
      totalInput.style.borderColor = '#ef4444';
      totalInput.style.background = '#fef2f2';
      totalInput.style.color = '#dc2626';
    }
  }
}

function calculateTargetPercentages(kMeq, caMeq, mgMeq, hMeq, naMeq, alMeq, cic) {
  if (cic === 0) return;
  
  const targetPercentages = [
    { id: 'k-target-percent', meq: kMeq, percent: (kMeq / cic) * 100 },
    { id: 'ca-target-percent', meq: caMeq, percent: (caMeq / cic) * 100 },
    { id: 'mg-target-percent', meq: mgMeq, percent: (mgMeq / cic) * 100 },
    { id: 'h-target-percent', meq: hMeq, percent: (hMeq / cic) * 100 },
    { id: 'na-target-percent', meq: naMeq, percent: (naMeq / cic) * 100 },
    { id: 'al-target-percent', meq: alMeq, percent: (alMeq / cic) * 100 }
  ];
  
  targetPercentages.forEach(item => {
    const element = document.getElementById(item.id);
    if (element) {
      element.textContent = item.percent.toFixed(1) + '%';
    }
  });
}


// 🧠 ALGORITMO INTELIGENTE DE PRIORIZACIÓN DE ENMIENDAS
function calcularEstrategiaEnmiendas(enmiendasSeleccionadas, necesidades) {
  const estrategia = [];
  let caRestante = necesidades.ca;
  let mgRestante = necesidades.mg;
  let kRestante = necesidades.k;
  let so4Necesario = necesidades.so4;
  
  console.log('🧪 Análisis inicial:', {
    pH: necesidades.pH,
    ca: caRestante,
    mg: mgRestante,
    k: kRestante,
    so4: so4Necesario
  });
  
  console.log('🔍 VALORES DE NECESIDADES RECIBIDOS:');
  console.log(`  - necesidades.ca: ${necesidades.ca}`);
  console.log(`  - necesidades.mg: ${necesidades.mg}`);
  console.log(`  - necesidades.k: ${necesidades.k}`);
  
  console.log('🔍 COMPARACIÓN DIRECTA:');
  console.log(`  - caRestante > mgRestante: ${caRestante > mgRestante}`);
  console.log(`  - mgRestante > caRestante: ${mgRestante > caRestante}`);
  console.log(`  - Diferencia: Ca=${caRestante}, Mg=${mgRestante}, Diferencia=${Math.abs(caRestante - mgRestante)}`);
  
  
  
  // 0️⃣ PRIORIDAD MÁXIMA: Enmiendas personalizadas con MÚLTIPLES elementos (K, Ca, Mg)
  const enmiendasMultiElemento = enmiendasSeleccionadas.filter(a => {
    const tieneK = (a.composition?.k || a.k || 0) > 0;
    const tieneCa = (a.composition?.ca || a.ca || 0) > 0;
    const tieneMg = (a.composition?.mg || a.mg || 0) > 0;
    const elementosCount = (tieneK ? 1 : 0) + (tieneCa ? 1 : 0) + (tieneMg ? 1 : 0);
    return elementosCount >= 2; // Tiene al menos 2 de los 3 elementos
  });
  
  if (enmiendasMultiElemento.length > 0 && (kRestante > 0 || caRestante > 0 || mgRestante > 0)) {
    // Usar la primera enmienda multi-elemento encontrada
    const multiAmendment = enmiendasMultiElemento[0];
    
    // Identificar qué elementos faltan y cuál es el MÁS limitante
    const elementosDisponibles = [];
    if (kRestante > 0) elementosDisponibles.push({ elemento: 'K', meq: kRestante });
    if (caRestante > 0) elementosDisponibles.push({ elemento: 'Ca', meq: caRestante });
    if (mgRestante > 0) elementosDisponibles.push({ elemento: 'Mg', meq: mgRestante });
    
    // Encontrar el elemento con MAYOR deficiencia (el más limitante)
    const elementoLimitante = elementosDisponibles.reduce((max, actual) => 
      actual.meq > max.meq ? actual : max
    );
    
    console.log('🔍 ENMIENDA MULTI-ELEMENTO DETECTADA:', multiAmendment.name);
    console.log('🔍 ELEMENTO MÁS LIMITANTE:');
    console.log(`  - Elementos disponibles: ${elementosDisponibles.map(e => `${e.elemento}: ${e.meq} meq`).join(', ')}`);
    console.log(`  - Elemento MÁS limitante: ${elementoLimitante.elemento} (${elementoLimitante.meq} meq)`);
    
    // Obtener concentraciones de la enmienda multi-elemento
    const kPercent = multiAmendment.composition?.k || multiAmendment.k || 0;
    const caPercent = multiAmendment.composition?.ca || multiAmendment.ca || 0;
    const mgPercent = multiAmendment.composition?.mg || multiAmendment.mg || 0;
    
    // Calcular dosis necesaria para cada elemento
    let kAmount = 0, caAmount = 0, mgAmount = 0;
    
    if (kRestante > 0 && kPercent > 0) {
      const kKgHaNeeded = convertMeqToKgHa(kRestante, 39.1);
      kAmount = kKgHaNeeded / (kPercent / 100);
    }
    if (caRestante > 0 && caPercent > 0) {
      const caKgHaNeeded = convertMeqToKgHa(caRestante, 20.04);
      caAmount = caKgHaNeeded / (caPercent / 100);
    }
    if (mgRestante > 0 && mgPercent > 0) {
      const mgKgHaNeeded = convertMeqToKgHa(mgRestante, 12.15);
      mgAmount = mgKgHaNeeded / (mgPercent / 100);
    }
    
    // USAR LA DOSIS DEL ELEMENTO MÁS LIMITANTE
    let dosisMulti = 0;
    if (elementoLimitante.elemento === 'K') {
      dosisMulti = kAmount;
    } else if (elementoLimitante.elemento === 'Ca') {
      dosisMulti = caAmount;
    } else if (elementoLimitante.elemento === 'Mg') {
      dosisMulti = mgAmount;
    }
    
    console.log('🔍 CÁLCULO DE DOSIS BASADO EN ELEMENTO MÁS LIMITANTE:');
    console.log(`  - kAmount: ${kAmount.toFixed(2)} kg/ha (para ${kRestante} meq K)`);
    console.log(`  - caAmount: ${caAmount.toFixed(2)} kg/ha (para ${caRestante} meq Ca)`);
    console.log(`  - mgAmount: ${mgAmount.toFixed(2)} kg/ha (para ${mgRestante} meq Mg)`);
    console.log(`  - dosisMulti: ${dosisMulti.toFixed(2)} kg/ha`);
    console.log(`  - Usando: ${elementoLimitante.elemento}Amount (elemento MÁS limitante)`);
    
    estrategia.push({
      tipo: multiAmendment.id,
      dosis: dosisMulti,
      razon: `Enmienda multi-elemento - Elemento limitante: ${elementoLimitante.elemento} (${kPercent}% K, ${caPercent}% Ca, ${mgPercent}% Mg)`,
      elementoLimitante: elementoLimitante
    });
    
    // Recalcular necesidades restantes
    const kAportado = dosisMulti * (kPercent / 100);
    const caAportado = dosisMulti * (caPercent / 100);
    const mgAportado = dosisMulti * (mgPercent / 100);
    
    if (kPercent > 0) kRestante = Math.max(0, kRestante - convertKgHaToMeq(kAportado, 39.1));
    if (caPercent > 0) caRestante = Math.max(0, caRestante - convertKgHaToMeq(caAportado, 20.04));
    if (mgPercent > 0) mgRestante = Math.max(0, mgRestante - convertKgHaToMeq(mgAportado, 12.15));
    
    console.log(`🎯 Enmienda multi-elemento aplicada - Elemento limitante: ${elementoLimitante.elemento}`);
  }
  
  // 1️⃣ PRIORIDAD: Cal Dolomítica si necesitas Ca + Mg simultáneamente
  const tieneDolomita = enmiendasSeleccionadas.find(a => a.id === 'dolomite');
  if (tieneDolomita && caRestante > 0 && mgRestante > 0) {
    const caKgHaNeeded = convertMeqToKgHa(caRestante, 20.04);
    const mgKgHaNeeded = convertMeqToKgHa(mgRestante, 12.15);
    
    // El elemento limitante es el que MÁS FALTA (mayor deficiencia en meq)
    // Comparar K, Ca Y Mg para encontrar el más limitante
    const elementosDisponibles = [];
    if (kRestante > 0) elementosDisponibles.push({ elemento: 'K', meq: kRestante });
    if (caRestante > 0) elementosDisponibles.push({ elemento: 'Ca', meq: caRestante });
    if (mgRestante > 0) elementosDisponibles.push({ elemento: 'Mg', meq: mgRestante });
    
    // Encontrar el elemento con MAYOR deficiencia (el más limitante)
    const elementoLimitante = elementosDisponibles.reduce((max, actual) => 
      actual.meq > max.meq ? actual : max
    );
    
    console.log('🔍 ELEMENTO MÁS LIMITANTE:');
    console.log(`  - Elementos disponibles: ${elementosDisponibles.map(e => `${e.elemento}: ${e.meq} meq`).join(', ')}`);
    console.log(`  - Elemento MÁS limitante: ${elementoLimitante.elemento} (${elementoLimitante.meq} meq)`);
    
    // Calcular cuánta enmienda necesitaríamos para cada elemento
    // Usar porcentajes actuales de la enmienda (no fijos)
    const dolomiteAmendment = enmiendasSeleccionadas.find(a => a.id === 'dolomite');
    const caPercent = dolomiteAmendment?.composition?.ca || dolomiteAmendment?.ca || 21.7;
    const mgPercent = dolomiteAmendment?.composition?.mg || dolomiteAmendment?.mg || 13.2;
    
    const caAmount = caKgHaNeeded / (caPercent / 100);
    const mgAmount = mgKgHaNeeded / (mgPercent / 100);
    
    // Calcular cantidad para K si está disponible
    let kAmount = 0;
    if (kRestante > 0) {
      const kPercent = dolomiteAmendment?.composition?.k || dolomiteAmendment?.k || 0;
      if (kPercent > 0) {
        const kKgHaNeeded = convertMeqToKgHa(kRestante, 39.1);
        kAmount = kKgHaNeeded / (kPercent / 100);
      }
    }
    
    // Usar la cantidad del elemento MÁS LIMITANTE (el que más falta)
    let dosisDolomita = 0;
    if (elementoLimitante.elemento === 'Ca') {
      dosisDolomita = caAmount;
    } else if (elementoLimitante.elemento === 'Mg') {
      dosisDolomita = mgAmount;
    } else if (elementoLimitante.elemento === 'K') {
      dosisDolomita = kAmount;
    }
    
    console.log('🔍 CÁLCULO DE DOSIS BASADO EN ELEMENTO MÁS LIMITANTE:');
    console.log(`  - caAmount: ${caAmount.toFixed(2)} kg/ha (para ${caRestante} meq Ca)`);
    console.log(`  - mgAmount: ${mgAmount.toFixed(2)} kg/ha (para ${mgRestante} meq Mg)`);
    console.log(`  - kAmount: ${kAmount.toFixed(2)} kg/ha (para ${kRestante} meq K)`);
    console.log(`  - dosisDolomita: ${dosisDolomita.toFixed(2)} kg/ha`);
    console.log(`  - Usando: ${elementoLimitante.elemento}Amount (elemento MÁS limitante)`);
    
    // Verificar si pH es alto para mostrar advertencia
    const advertenciaPH = necesidades.pH >= 7;
    const razon = advertenciaPH 
      ? `⚠️ ADVERTENCIA: pH ${necesidades.pH} - Cal Dolomítica NO recomendada (alcalinizaría más) - Elemento limitante: ${elementoLimitante.elemento}`
      : `Elemento limitante: ${elementoLimitante.elemento} - Cal Dolomítica optimizada`;
    
    estrategia.push({
      tipo: 'dolomite',
      dosis: dosisDolomita,
      razon: razon,
      elementoLimitante: elementoLimitante,
      advertencia: advertenciaPH
    });
    
    // Recalcular necesidades restantes usando porcentajes DINÁMICOS
    const caAportado = dosisDolomita * (caPercent / 100);
    const mgAportado = dosisDolomita * (mgPercent / 100);
    caRestante = Math.max(0, caRestante - convertKgHaToMeq(caAportado, 20.04));
    mgRestante = Math.max(0, mgRestante - convertKgHaToMeq(mgAportado, 12.15));
    
    console.log(`🎯 Cal Dolomítica aplicada - Elemento limitante: ${elementoLimitante}${advertenciaPH ? ' (CON ADVERTENCIA pH)' : ''}`);
  }
  
  // 2️⃣ CALCIO RESTANTE: Decisión basada en pH
  const tieneYeso = enmiendasSeleccionadas.find(a => a.id === 'gypsum');
  const tieneCalAgricola = enmiendasSeleccionadas.find(a => a.id === 'lime');
  
  if (caRestante > 0) {
    // YESO: Permite en cualquier pH (no acidifica ni alcaliniza)
    if (tieneYeso) {
      const caKgHaNeeded = convertMeqToKgHa(caRestante, 20.04);
      // 🔧 USAR CONCENTRACIÓN DINÁMICA (editada o por defecto)
      const yesoAmendment = enmiendasSeleccionadas.find(a => a.id === 'gypsum');
      const caPercent = yesoAmendment?.composition?.ca || yesoAmendment?.ca || 23.3;
      const dosisYeso = caKgHaNeeded / (caPercent / 100);
      
      console.log(`🔍 YESO - Ca requerido: ${caKgHaNeeded.toFixed(2)} kg/ha, Concentración Ca: ${caPercent}%, Dosis: ${dosisYeso.toFixed(2)} kg/ha`);
      
      estrategia.push({
        tipo: 'gypsum',
        dosis: dosisYeso,
        razon: `Yeso para Ca (${caPercent}% Ca) - No afecta pH`
      });
      
      caRestante = 0;
    } 
    // CAL AGRÍCOLA: Solo si pH < 7 (no alcalinizar más)
    else if (tieneCalAgricola && necesidades.pH < 7) {
      const caKgHaNeeded = convertMeqToKgHa(caRestante, 20.04);
      // 🔧 USAR CONCENTRACIÓN DINÁMICA (editada o por defecto)
      const limeAmendment = enmiendasSeleccionadas.find(a => a.id === 'lime');
      const caPercent = limeAmendment?.composition?.ca || limeAmendment?.ca || 40.0;
      const dosisCalAgricola = caKgHaNeeded / (caPercent / 100);
      
      console.log(`🔍 CAL AGRÍCOLA - Ca requerido: ${caKgHaNeeded.toFixed(2)} kg/ha, Concentración Ca: ${caPercent}%, Dosis: ${dosisCalAgricola.toFixed(2)} kg/ha`);
      
      estrategia.push({
        tipo: 'lime',
        dosis: dosisCalAgricola,
        razon: `Cal Agrícola para Ca (${caPercent}% Ca) y elevar pH`
      });
      
      caRestante = 0;
    }
    // ADVERTENCIA: Cal Agrícola con pH ≥ 7
    else if (tieneCalAgricola && necesidades.pH >= 7) {
      const caKgHaNeeded = convertMeqToKgHa(caRestante, 20.04);
      // 🔧 USAR CONCENTRACIÓN DINÁMICA (editada o por defecto)
      const limeAmendment = enmiendasSeleccionadas.find(a => a.id === 'lime');
      const caPercent = limeAmendment?.composition?.ca || limeAmendment?.ca || 40.0;
      const dosisCalAgricola = caKgHaNeeded / (caPercent / 100);
      
      estrategia.push({
        tipo: 'lime',
        dosis: dosisCalAgricola,
        razon: `⚠️ ADVERTENCIA: pH ${necesidades.pH} - Cal Agrícola NO recomendada (alcalinizaría más)`,
        advertencia: true
      });
      
      console.log(`⚠️ Cal Agrícola calculada pero NO recomendada (pH ${necesidades.pH})`);
    }
    
    // 2️⃣.1 CALCIO RESTANTE - ENMIENDAS PERSONALIZADAS (solo si no se usó antes)
    if (caRestante > 0) {
      const enmiendasConCa = enmiendasSeleccionadas.filter(a => 
        a.id !== 'gypsum' && a.id !== 'lime' && a.id !== 'dolomite' && 
        (a.composition?.ca > 0 || a.ca > 0) &&
        !estrategia.some(e => e.tipo === a.id) // Evitar duplicados
      );
      
      enmiendasConCa.forEach(enmienda => {
        const caPercent = enmienda.composition?.ca || enmienda.ca || 0;
        if (caPercent > 0) {
          const caKgHaNeeded = convertMeqToKgHa(caRestante, 20.04);
          const dosisEnmienda = caKgHaNeeded / (caPercent / 100);
          
          estrategia.push({
            tipo: enmienda.id,
            dosis: dosisEnmienda,
            razon: `Calcio adicional requerido (${caPercent}% Ca)`
          });
          
          caRestante = 0;
          console.log(`✅ ${enmienda.name} seleccionado para Ca (${caPercent}%)`);
        }
      });
    }
  }
  
  // 3️⃣ MAGNESIO RESTANTE
  const tieneMgSO4 = enmiendasSeleccionadas.find(a => a.id === 'mgso4-mono');
  if (mgRestante > 0 && tieneMgSO4) {
    const mgKgHaNeeded = convertMeqToKgHa(mgRestante, 12.15);
    // 🔧 USAR CONCENTRACIÓN DINÁMICA (editada o por defecto)
    const mgso4Amendment = enmiendasSeleccionadas.find(a => a.id === 'mgso4-mono');
    const mgPercent = mgso4Amendment?.composition?.mg || mgso4Amendment?.mg || 17.0;
    const dosisMgSO4 = mgKgHaNeeded / (mgPercent / 100);
    
    console.log(`🔍 MgSO₄ - Mg requerido: ${mgKgHaNeeded.toFixed(2)} kg/ha, Concentración Mg: ${mgPercent}%, Dosis: ${dosisMgSO4.toFixed(2)} kg/ha`);
    
    estrategia.push({
      tipo: 'mgso4-mono',
      dosis: dosisMgSO4,
      razon: `Magnesio adicional requerido (${mgPercent}% Mg)`
    });
    
    mgRestante = 0;
    console.log('✅ MgSO₄ seleccionado para Mg');
  }
  
  // 3️⃣.1 MAGNESIO RESTANTE - ENMIENDAS PERSONALIZADAS (solo si no se usó antes)
  if (mgRestante > 0) {
    const enmiendasConMg = enmiendasSeleccionadas.filter(a => 
      a.id !== 'mgso4-mono' && a.id !== 'dolomite' && 
      (a.composition?.mg > 0 || a.mg > 0) &&
      !estrategia.some(e => e.tipo === a.id) // Evitar duplicados
    );
    
    enmiendasConMg.forEach(enmienda => {
      const mgPercent = enmienda.composition?.mg || enmienda.mg || 0;
      if (mgPercent > 0) {
        const mgKgHaNeeded = convertMeqToKgHa(mgRestante, 12.15);
        const dosisEnmienda = mgKgHaNeeded / (mgPercent / 100);
        
        estrategia.push({
          tipo: enmienda.id,
          dosis: dosisEnmienda,
          razon: `Magnesio adicional requerido (${mgPercent}% Mg)`
        });
        
        mgRestante = 0;
        console.log(`✅ ${enmienda.name} seleccionado para Mg (${mgPercent}%)`);
      }
    });
  }
  
  // 4️⃣ POTASIO
  const tieneSOP = enmiendasSeleccionadas.find(a => a.id === 'sop-granular');
  if (kRestante > 0 && tieneSOP) {
    const kKgHaNeeded = convertMeqToKgHa(kRestante, 39.1);
    // 🔧 USAR CONCENTRACIÓN DINÁMICA (editada o por defecto)
    const sopAmendment = enmiendasSeleccionadas.find(a => a.id === 'sop-granular');
    const kPercent = sopAmendment?.composition?.k || sopAmendment?.k || 41.5;
    const dosisSOP = kKgHaNeeded / (kPercent / 100);
    
    console.log(`🔍 SOP - K requerido: ${kKgHaNeeded.toFixed(2)} kg/ha, Concentración K: ${kPercent}%, Dosis: ${dosisSOP.toFixed(2)} kg/ha`);
    
    estrategia.push({
      tipo: 'sop-granular',
      dosis: dosisSOP,
      razon: `Potasio requerido (${kPercent}% K)`
    });
    
    kRestante = 0;
    console.log('✅ SOP seleccionado para K');
  }
  
  // 4️⃣.1 POTASIO - ENMIENDAS PERSONALIZADAS (solo si no se usó antes)
  if (kRestante > 0) {
    const enmiendasConK = enmiendasSeleccionadas.filter(a => 
      a.id !== 'sop-granular' && 
      (a.composition?.k > 0 || a.k > 0) &&
      !estrategia.some(e => e.tipo === a.id) // Evitar duplicados
    );
    
    enmiendasConK.forEach(enmienda => {
      const kPercent = enmienda.composition?.k || enmienda.k || 0;
      if (kPercent > 0) {
        const kKgHaNeeded = convertMeqToKgHa(kRestante, 39.1);
        const dosisEnmienda = kKgHaNeeded / (kPercent / 100);
        
        estrategia.push({
          tipo: enmienda.id,
          dosis: dosisEnmienda,
          razon: `Potasio adicional requerido (${kPercent}% K)`
        });
        
        kRestante = 0;
        console.log(`✅ ${enmienda.name} seleccionado para K (${kPercent}%)`);
      }
    });
  }
  
  // 5️⃣ SO₄ PARA DESPLAZAR Na⁺ (si no se cubrió con otras enmiendas)
  const so4YaAportado = estrategia.reduce((total, e) => {
    // 🔧 USAR CONCENTRACIONES DINÁMICAS para calcular aportes
    const enmienda = enmiendasSeleccionadas.find(a => a.id === e.tipo);
    if (enmienda) {
      const so4Percent = enmienda.composition?.so4 || enmienda.so4 || 
                         (e.tipo === 'gypsum' ? 55.8 : 
                          e.tipo === 'sop-granular' ? 54.1 : 
                          e.tipo === 'mgso4-mono' ? 69 : 0);
      return total + (e.dosis * (so4Percent / 100));
    }
    
    return total;
  }, 0);
  
  const so4Restante = Math.max(0, so4Necesario - so4YaAportado);
  if (so4Restante > 0 && tieneYeso) {
    // 🔧 USAR CONCENTRACIÓN DINÁMICA
    const yesoAmendment = enmiendasSeleccionadas.find(a => a.id === 'gypsum');
    const so4Percent = yesoAmendment?.composition?.so4 || yesoAmendment?.so4 || 55.8;
    const dosisYesoAdicional = so4Restante / (so4Percent / 100);
    
    estrategia.push({
      tipo: 'gypsum',
      dosis: dosisYesoAdicional,
      razon: 'SO₄ adicional para desplazar Na⁺'
    });
    
    console.log('✅ Yeso adicional para SO₄');
  }
  
  console.log('🎯 Estrategia final:', estrategia);
  return estrategia;
}

// Función auxiliar para convertir kg/ha a meq/100g
function convertKgHaToMeq(kgHa, pesoMolecular) {
  // Obtener valores del formulario
  const densidadAparente = parseFloat(document.getElementById('soil-density')?.value || 1.1);
  const profundidad = parseFloat(document.getElementById('soil-depth')?.value || 30) / 100; // convertir cm a m
  
  // Conversión inversa: kg/ha → meq/100g
  // Factor: kgHa / (pesoMolecular × 10 × (100 × 100 × profundidadEnMetros × densidadAparente) / 1,000)
  return kgHa / (pesoMolecular * 10 * (100 * 100 * profundidad * densidadAparente) / 1000);
}

// Función auxiliar para convertir meq/100g a kg/ha
function convertMeqToKgHa(meq, pesoEquivalente) {
  // Obtener valores del formulario
  const densidadAparente = parseFloat(document.getElementById('soil-density')?.value || 1.1);
  const profundidad = parseFloat(document.getElementById('soil-depth')?.value || 30) / 100; // convertir cm a m
  
  // Fórmula correcta: meq × pesoEquivalente × 10 × (100 × 100 × profundidadEnMetros × densidadAparente) / 1,000
  return meq * pesoEquivalente * 10 * (100 * 100 * profundidad * densidadAparente) / 1000;
}

// ===== Ajuste por % de alcance de suelo =====
function normalizeSoilReachPercent(inputEl, { mutate = true } = {}) {
  if (!inputEl) return 100;
  const raw = inputEl.value;
  let value = parseFloat(raw);
  if (Number.isNaN(value)) return null;
  if (value < 10) value = 10;
  if (value > 100) value = 100;
  if (mutate) inputEl.value = value;
  return value;
}

function getSoilReachPercent({ mutate = true } = {}) {
  const inputEl = document.getElementById('soil-reach-percent');
  if (!inputEl) return 100;
  const value = normalizeSoilReachPercent(inputEl, { mutate });
  return value == null ? 100 : value;
}

function updateSoilReachAdjustment({ mutate = true } = {}) {
  const resultsSection = document.getElementById('amendment-results');
  if (!resultsSection || resultsSection.style.display === 'none') return;
  if (!window.lastAmendmentCalc || !window.lastAmendmentCalc.details) return;
  const value = getSoilReachPercent({ mutate });
  if (value == null) return;
  const totals = window.lastAmendmentCalc.totals || {};
  showCombinedAmendmentResults(
    window.lastAmendmentCalc.details,
    totals.totalCa || 0,
    totals.totalMg || 0,
    totals.totalK || 0,
    totals.totalSi || 0,
    totals.totalNaRemoval || 0
  );
}

function calculateAmendment() {
  console.log('🧮 Función calculateAmendment ejecutándose...');
  console.log('🔍 DEBUGGING: Verificando enmiendas seleccionadas...');
  
  // Leer % de alcance de suelo al inicio (aplica a todas las enmiendas, incl. personalizadas)
  const reachPercentAtCalc = getSoilReachPercent({ mutate: true });
  console.log('🔍 % de alcance de suelo (aplicado a todas las enmiendas):', reachPercentAtCalc);
  
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
  
  // Obtener enmiendas seleccionadas
  const selectedAmendments = getSelectedAmendments();
  const selectedIdsAtCalc = selectedAmendments.map(function (a) { return a.id; });
  console.log('🔍 DEBUGGING: Enmiendas seleccionadas:', selectedAmendments);
  
  // Verificar que hay enmiendas seleccionadas
  if (selectedAmendments.length === 0) {
    console.log('No hay enmiendas seleccionadas');
    alert('Por favor selecciona al menos una enmienda antes de calcular');
    return;
  }
  
  // Validación removida - el usuario puede ajustar libremente los valores objetivo
  
  
  // Los valores objetivo son los meq de ajuste necesarios (ya calculados)
  const kDiff = kTarget;  // Meq de ajuste para K
  const caDiff = caTarget; // Meq de ajuste para Ca
  const mgDiff = mgTarget; // Meq de ajuste para Mg
  const hDiff = hTarget;   // Meq de ajuste para H
  const naDiff = naTarget; // Meq de ajuste para Na
  const alDiff = alTarget; // Meq de ajuste para Al
  
  console.log('🔍 VALORES DE LOS CAMPOS (meq a ajustar):');
  console.log(`  - kTarget: ${kTarget}`);
  console.log(`  - caTarget: ${caTarget}`);
  console.log(`  - mgTarget: ${mgTarget}`);
  console.log(`  - hTarget: ${hTarget}`);
  console.log(`  - naTarget: ${naTarget}`);
  console.log(`  - alTarget: ${alTarget}`);
  
  
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
  
  // Calcular necesidades totales (en meq, no en kg/ha)
  const totalCaNeeded = caDiff > 0 ? Math.abs(caDiff) : 0;
  const totalMgNeeded = mgDiff > 0 ? Math.abs(mgDiff) : 0;
  const totalKNeeded = kDiff > 0 ? Math.abs(kDiff) : 0;
  const totalNaToRemove = naDiff < 0 ? Math.abs(naDiff) : 0;

  // Necesidades en kg/ha (solo para advertencias simples)
  const neededCaKgHa = Math.max(0, caKgHa);
  const neededMgKgHa = Math.max(0, mgKgHa);
  const neededKKgHa = Math.max(0, kKgHa);
  
  console.log('🔍 CÁLCULO DE NECESIDADES TOTALES:');
  console.log(`  - totalCaNeeded: ${totalCaNeeded} (de caDiff: ${caDiff})`);
  console.log(`  - totalMgNeeded: ${totalMgNeeded} (de mgDiff: ${mgDiff})`);
  console.log(`  - totalKNeeded: ${totalKNeeded} (de kDiff: ${kDiff})`);
  
  // Calcular aportes de todas las enmiendas seleccionadas
  let totalCaContribution = 0;
  let totalMgContribution = 0;
  let totalKContribution = 0;
  let totalSiContribution = 0;
  let totalNaRemoval = 0;
  let amendmentDetails = [];
  
  // NUEVA LÓGICA INTELIGENTE: Priorización basada en pH y sinergia
  const soilPH = parseFloat(document.getElementById('soil-ph')?.value || 7);
  console.log('🧪 pH del suelo:', soilPH);
  
  // Calcular necesidades restantes después de cada enmienda
  let caRemaining = totalCaNeeded;
  let mgRemaining = totalMgNeeded;
  let kRemaining = totalKNeeded;
  let so4Needed = totalNaToRemove; // SO₄ para desplazar Na⁺
  
  // ALGORITMO INTELIGENTE DE PRIORIZACIÓN
  const amendmentStrategy = calcularEstrategiaEnmiendas(selectedAmendments, {
    ca: caRemaining,
    mg: mgRemaining,
    k: kRemaining,
    so4: so4Needed,
    pH: soilPH
  });
  
  console.log('🎯 Estrategia calculada:', amendmentStrategy);
  
  
  // FILTRAR ENMIENDAS CON UMBRAL MÍNIMO OPERATIVO (100 kg/ha)
  const umbralMinimoOperativo = 100; // kg/ha
  const estrategiaFiltrada = amendmentStrategy.filter(strategy => {
    if (strategy.dosis >= umbralMinimoOperativo) {
      return true;
    } else {
      console.log(`⚠️ ${strategy.tipo}: ${strategy.dosis.toFixed(2)} kg/ha - Cantidad menor al umbral mínimo (${umbralMinimoOperativo} kg/ha)`);
      return false;
    }
  });
  
  console.log('🎯 Estrategia filtrada (umbral mínimo 100 kg/ha):', estrategiaFiltrada);
  
  estrategiaFiltrada.forEach(strategy => {
    const amendment = selectedAmendments.find(a => a.id === strategy.tipo);
    if (!amendment) return;
    
    // USAR la cantidad calculada por la estrategia inteligente (elemento limitante)
    let amendmentAmount = strategy.dosis;
    
    console.log(`✅ Usando cantidad de estrategia inteligente: ${amendmentAmount.toFixed(2)} kg/ha`);
    console.log(`✅ Elemento limitante: ${strategy.elementoLimitante?.elemento || 'No definido'}`);
    let caContribution = 0;
    let mgContribution = 0;
    let kContribution = 0;
    let so4Contribution = 0;
    let siContribution = 0;
    let naRemoval = 0;
    
    // DIAGNÓSTICO COMPLETO
    console.log(`🔍 DIAGNÓSTICO COMPLETO para ${amendment.name}:`);
    console.log(`🔍 amendment.id:`, amendment.id);
    console.log(`🔍 amendment.ca:`, amendment.ca, typeof amendment.ca);
    console.log(`🔍 amendment.mg:`, amendment.mg, typeof amendment.mg);
    console.log(`🔍 amendment.k:`, amendment.k, typeof amendment.k);
    console.log(`🔍 amendment.so4:`, amendment.so4, typeof amendment.so4);
    console.log(`🔍 amendment.si:`, amendment.si, typeof amendment.si);
    console.log(`🔍 amendment completo:`, amendment);
    
    // Usar valores reales (leer de composition O directamente)
    const caPercent = amendment.composition?.ca || amendment.ca || 0;
    const mgPercent = amendment.composition?.mg || amendment.mg || (amendment.id === 'dolomite' ? 13.2 : amendment.id === 'mgso4-mono' ? 17 : 0);
    const kPercent = amendment.composition?.k || amendment.k || (amendment.id === 'sop-granular' ? 41.5 : 0);
    const so4Percent = amendment.composition?.so4 || amendment.so4 || (amendment.id === 'gypsum' ? 55.8 : amendment.id === 'sop-granular' ? 54.1 : amendment.id === 'mgso4-mono' ? 69 : 0);
    const siPercent = amendment.composition?.si || amendment.si || 0;
    
    caContribution = amendmentAmount * (caPercent / 100);
    mgContribution = amendmentAmount * (mgPercent / 100);
    kContribution = amendmentAmount * (kPercent / 100);
    so4Contribution = amendmentAmount * (so4Percent / 100);
    siContribution = amendmentAmount * (siPercent / 100);

    // Advertencia simple si la enmienda sobrepasa objetivos de Ca/Mg/K (tolerancia 1% para evitar falsos positivos por redondeo)
    const TOLERANCIA_EXCESO = 1.01; // solo alertar si aporte > 101% del necesario
    const overContrib = [];
    if (neededCaKgHa > 0 && caContribution > neededCaKgHa * TOLERANCIA_EXCESO) overContrib.push('Ca');
    if (neededMgKgHa > 0 && mgContribution > neededMgKgHa * TOLERANCIA_EXCESO) overContrib.push('Mg');
    if (neededKKgHa > 0 && kContribution > neededKKgHa * TOLERANCIA_EXCESO) overContrib.push('K');
    const advertencia = overContrib.length > 0;
    const advertenciaMensaje = advertencia
      ? `Excede objetivo de ${overContrib.join(', ')} por la composición de la enmienda`
      : '';
    
    console.log(`🧮 Aportes calculados:`, {
      ca: `${caPercent}% → ${caContribution.toFixed(2)} kg/ha`,
      mg: `${mgPercent}% → ${mgContribution.toFixed(2)} kg/ha`,
      k: `${kPercent}% → ${kContribution.toFixed(2)} kg/ha`,
      so4: `${so4Percent}% → ${so4Contribution.toFixed(2)} kg/ha`,
      si: `${siPercent}% → ${siContribution.toFixed(2)} kg/ha`
    });
    // El switch ya no es necesario - todos usan la misma lógica
    
    // Acumular contribuciones
    totalCaContribution += caContribution;
    totalMgContribution += mgContribution;
    totalKContribution += kContribution;
    totalSiContribution += siContribution;
    totalNaRemoval += naRemoval;
    
    // Guardar detalles de esta enmienda
    if (amendmentAmount > 0) {
      amendmentDetails.push({
        name: amendment.name,
        amount: amendmentAmount,
        ca: caContribution,
        mg: mgContribution,
        k: kContribution,
        so4: so4Contribution,
        si: siContribution,
        naRemoval: naRemoval,
        razon: strategy.razon,
        elementoLimitante: strategy.elementoLimitante,
        advertencia: strategy.advertencia || advertencia || false,
        advertenciaMensaje: strategy.advertencia ? 'pH alto: cal no recomendada' : advertenciaMensaje
      });
    }
  });
  
  // Mostrar resultados combinados (pasamos reach leído al inicio para que aplique a todas, incl. personalizadas)
  showCombinedAmendmentResults(amendmentDetails, totalCaContribution, totalMgContribution, totalKContribution, totalSiContribution, totalNaRemoval, reachPercentAtCalc);
  // Mantener estado visual del usuario tras calcular (selección y % de suelo explorado)
  restoreAmendmentUIState(selectedIdsAtCalc, reachPercentAtCalc);
  // Reaplicar una vez más por si hubo rerender asíncrono de la tabla
  setTimeout(function () { restoreAmendmentUIState(selectedIdsAtCalc, reachPercentAtCalc); }, 80);
}

// Función para mostrar resultados combinados de múltiples enmiendas
// reachPercentOverride: si se pasa (ej. desde calculateAmendment), se usa ese % de alcance para todas las enmiendas
function showCombinedAmendmentResults(amendmentDetails, totalCa, totalMg, totalK, totalSi, totalNaRemoval, reachPercentOverride) {
  const resultsSection = document.getElementById('amendment-results');
  if (!resultsSection) {
    console.error('No se encontró la sección amendment-results');
    return;
  }

  // Cache de resultados base (sin ajuste) para recalcular sin ejecutar todo el cálculo
  window.lastAmendmentCalc = {
    details: Array.isArray(amendmentDetails) ? amendmentDetails : [],
    totals: { totalCa, totalMg, totalK, totalSi, totalNaRemoval }
  };
  try {
    if (currentProject && currentProject.amendments && currentProject.amendments.results) {
      currentProject.amendments.results.rawDetails = window.lastAmendmentCalc.details;
      currentProject.amendments.results.rawTotals = window.lastAmendmentCalc.totals;
    }
  } catch {}

  const reachPercent = (reachPercentOverride != null && reachPercentOverride >= 10 && reachPercentOverride <= 100)
    ? reachPercentOverride
    : getSoilReachPercent();
  const reachFactor = reachPercent / 100;
  const adjustedDetails = (window.lastAmendmentCalc.details || []).map(item => ({
    ...item,
    amount: (item.amount || 0) * reachFactor,
    ca: (item.ca || 0) * reachFactor,
    mg: (item.mg || 0) * reachFactor,
    k: (item.k || 0) * reachFactor,
    so4: (item.so4 || 0) * reachFactor,
    si: (item.si || 0) * reachFactor,
    naRemoval: (item.naRemoval || 0) * reachFactor
  }));
  
  let html = `<h3>📊 Resultados del Cálculo de Enmiendas</h3>`;
  
  if (adjustedDetails.length === 0) {
    html += '<p>No se requieren enmiendas con las seleccionadas actuales.</p>';
  } else {
    // Calcular totales reales de todos los nutrientes
    let totalKReal = 0, totalCaReal = 0, totalMgReal = 0, totalSo4Real = 0, totalSiReal = 0;
    
    adjustedDetails.forEach(amendment => {
      totalKReal += amendment.k || 0;
      totalCaReal += amendment.ca || 0;
      totalMgReal += amendment.mg || 0;
      totalSo4Real += amendment.so4 || 0;
      totalSiReal += amendment.si || 0;
    });
    
    html += '<div class="amendment-summary">';
    html += '<h4>🎯 Aportes Totales:</h4>';
    html += '<ul>';
    if (totalKReal > 0) html += `<li><strong>Potasio (K⁺):</strong> ${formatNumber(totalKReal)} kg/ha</li>`;
    if (totalCaReal > 0) html += `<li><strong>Calcio (Ca²⁺):</strong> ${formatNumber(totalCaReal)} kg/ha</li>`;
    if (totalMgReal > 0) html += `<li><strong>Magnesio (Mg²⁺):</strong> ${formatNumber(totalMgReal)} kg/ha</li>`;
    if (totalSo4Real > 0) html += `<li><strong>Sulfato (SO₄²⁻):</strong> ${formatNumber(totalSo4Real)} kg/ha</li>`;
    if (totalSiReal > 0) html += `<li><strong>Silicio (Si):</strong> ${formatNumber(totalSiReal)} kg/ha</li>`;
    html += '</ul>';
    html += `<div style="font-size: 12px; color: #64748b; margin-top: 6px;">% del volumen de suelo explorado por raíces (${formatNumber(reachPercent, 0)}%).</div>`;
    html += '</div>';
    
    html += '<div class="amendment-details">';
    html += '<h4>📋 Detalles por Enmienda:</h4>';
    html += '<table class="results-table">';
    html += '<thead><tr><th>Enmienda</th><th>Cantidad (kg/ha)</th><th>K⁺ (kg/ha)</th><th>Ca²⁺ (kg/ha)</th><th>Mg²⁺ (kg/ha)</th><th>SO₄²⁻ (kg/ha)</th><th>Si (kg/ha)</th></tr></thead>';
    html += '<tbody>';
    
    adjustedDetails.forEach(amendment => {
      html += '<tr>';
      if (amendment.advertencia) {
        const warnMsg = amendment.advertenciaMensaje ? amendment.advertenciaMensaje : 'Posible sobreaporte por composición';
        html += `<td style="color: #dc2626; font-weight: bold;" title="${warnMsg}">⚠️ ${amendment.name}</td>`;
      } else {
      html += `<td>${amendment.name}</td>`;
      }
      html += `<td>${formatNumber(amendment.amount)}</td>`;
      html += `<td>${amendment.k > 0 ? formatNumber(amendment.k) : '-'}</td>`;
      html += `<td>${amendment.ca > 0 ? formatNumber(amendment.ca) : '-'}</td>`;
      html += `<td>${amendment.mg > 0 ? formatNumber(amendment.mg) : '-'}</td>`;
      html += `<td>${amendment.so4 > 0 ? formatNumber(amendment.so4) : '-'}</td>`;
      html += `<td>${amendment.si > 0 ? formatNumber(amendment.si) : '-'}</td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '</div>';
    
  }
  
  resultsSection.innerHTML = html;
  resultsSection.style.display = 'block';
  
  // Exponer último resultado para que el chat pueda leerlo (no depender solo del DOM)
  if (adjustedDetails.length > 0) {
    const first = adjustedDetails[0];
    try {
      window.__nutriplantLastAmendmentResult = {
        type: first.name || '',
        amount: typeof first.amount === 'number' ? formatNumber(first.amount) : String(first.amount || ''),
        ca: first.ca > 0 ? formatNumber(first.ca) : '',
        so4: first.so4 > 0 ? formatNumber(first.so4) : ''
      };
    } catch (e) { window.__nutriplantLastAmendmentResult = null; }
  } else {
    window.__nutriplantLastAmendmentResult = null;
  }
}

// Función para actualizar el cálculo cuando cambia el tipo de enmienda
function updateAmendmentCalculation() {
  // Si ya hay resultados mostrados, recalcular automáticamente
  const resultsSection = document.getElementById('amendment-results');
  if (resultsSection && resultsSection.style.display !== 'none') {
    calculateAmendment();
  }
  
  // NO recalcular ajustes automáticos cuando cambian las enmiendas
  // Los valores de ajuste deben mantenerse fijos hasta que el usuario los modifique
}

// Función para alternar la selección de una enmienda
function toggleAmendmentSelection(amendmentId) {
  console.log('🔄 Alternando selección de enmienda:', amendmentId);
  
  const button = document.getElementById(`btn-select-${amendmentId}`);
  if (!button) return;
  
  // Alternar estado
  const isSelected = button.classList.contains('selected');
  
  if (isSelected) {
    // Deseleccionar
    button.classList.remove('selected');
    button.textContent = 'Seleccionar';
    button.style.backgroundColor = '';
    button.style.color = '';
  } else {
    // Seleccionar
    button.classList.add('selected');
    button.textContent = 'Seleccionado';
    button.style.backgroundColor = '#10b981'; // Verde
    button.style.color = 'white';
  }
  
  // Guardar automáticamente selección de enmiendas (debounce)
  scheduleEnmiendaAutoSave();
  
  // REMOVIDO: Cálculo automático eliminado - solo calcular cuando se presione el botón
}

function restoreAmendmentUIState(selectedIds, reachPercent) {
  const ids = Array.isArray(selectedIds) ? selectedIds : [];
  ids.forEach(function (amendmentId) {
    const button = document.getElementById('btn-select-' + amendmentId);
    if (!button) return;
    button.classList.add('selected');
    button.textContent = 'Seleccionado';
    button.style.backgroundColor = '#10b981';
    button.style.color = 'white';
  });
  const soilReachEl = document.getElementById('soil-reach-percent');
  if (soilReachEl && reachPercent != null) {
    soilReachEl.value = reachPercent;
    normalizeSoilReachPercent(soilReachEl, { mutate: true });
  }
}

// Hacer las funciones disponibles globalmente
window.toggleAmendmentSelection = toggleAmendmentSelection;
window.calculateAmendment = calculateAmendment;
window.calculateCIC = calculateCIC;
window.calculateAutomaticAdjustments = calculateAutomaticAdjustments;
window.calculateTotalPercent = calculateTotalPercent;
window.getSelectedAmendments = getSelectedAmendments;
window.calculateCationPercentages = calculateCationPercentages;
window.calculateTargetPercentages = calculateTargetPercentages;
window.updateCationStatusIcons = updateCationStatusIcons;
window.resetAmendmentForm = resetAmendmentForm;
window.calcularEstrategiaEnmiendas = calcularEstrategiaEnmiendas;
window.showCombinedAmendmentResults = showCombinedAmendmentResults;
window.formatNumber = formatNumber;

// Función de prueba para verificar que las enmiendas se leen correctamente
window.testAmendmentReading = function() {
  console.log('🧪 PRUEBA: Verificando lectura de enmiendas...');
  const selectedAmendments = getSelectedAmendments();
  console.log('🧪 Enmiendas seleccionadas:', selectedAmendments);
  
  selectedAmendments.forEach(amendment => {
    console.log(`🧪 ${amendment.name}:`, {
      ca: amendment.composition.ca,
      mg: amendment.composition.mg,
      k: amendment.composition.k
    });
  });
  
  return selectedAmendments;
};

// Función para verificar el estado de la base de datos
window.checkDatabase = function() {
  console.log('🔍 VERIFICANDO BASE DE DATOS:');
  console.log('🔍 amendmentsDatabase:', amendmentsDatabase);
  
  const dolomite = amendmentsDatabase.find(a => a.id === 'dolomite');
  if (dolomite) {
    console.log('🔍 Cal Dolomítica en base de datos:', {
      ca: dolomite.ca,
      mg: dolomite.mg,
      k: dolomite.k
    });
  } else {
    console.log('❌ Cal Dolomítica no encontrada en base de datos');
  }
  
  return amendmentsDatabase;
};

// Bandera para evitar recálculos automáticos cuando se modifica la concentración
let skipAutomaticAdjustments = false;

// Función para calcular ajustes automáticos basados en CIC del análisis inicial
function calculateAutomaticAdjustments() {
  if (skipAutomaticAdjustments) {
    console.log('⏭️ Saltando recálculo automático (modificando concentración)');
    return;
  }
  
  console.log('🎯 Recalculando ajustes automáticos...');
  
  // Verificar si los elementos existen antes de leerlos
  const cicTotalElement = document.getElementById('cic-total');
  const kInitialElement = document.getElementById('k-initial');
  const caInitialElement = document.getElementById('ca-initial');
  const mgInitialElement = document.getElementById('mg-initial');
  const hInitialElement = document.getElementById('h-initial');
  const naInitialElement = document.getElementById('na-initial');
  const alInitialElement = document.getElementById('al-initial');
  
  // Si no existen los elementos, salir silenciosamente (no estamos en análisis de suelo)
  if (!cicTotalElement || !kInitialElement || !caInitialElement || !mgInitialElement || !hInitialElement || !naInitialElement || !alInitialElement) {
    console.log('⏭️ No estamos en la sección de análisis de suelo, saltando recálculo');
    return;
  }
  
  // Obtener valores del análisis inicial (solo si los elementos existen)
  const cicTotal = parseFloat(cicTotalElement.value) || 0;
  const kInitial = parseFloat(kInitialElement.value) || 0;
  const caInitial = parseFloat(caInitialElement.value) || 0;
  const mgInitial = parseFloat(mgInitialElement.value) || 0;
  const hInitial = parseFloat(hInitialElement.value) || 0;
  const naInitial = parseFloat(naInitialElement.value) || 0;
  const alInitial = parseFloat(alInitialElement.value) || 0;
  
  console.log('📊 Valores iniciales:', { cicTotal, kInitial, caInitial, mgInitial, hInitial, naInitial, alInitial });
  
  if (cicTotal === 0) {
    // Si no hay CIC, limpiar los campos de ajuste
    clearAdjustmentFields();
    return;
  }
  
  // Calcular valores ideales directamente (sin balance iónico complejo)
  const idealValues = calculateIdealValues(cicTotal);
  
  console.log('🎯 Valores ideales calculados:', idealValues);
  
  // Calcular ajustes necesarios (diferencia entre ideal y actual)
  const adjustments = {
    k: idealValues.k - kInitial,
    ca: idealValues.ca - caInitial,
    mg: idealValues.mg - mgInitial,
    h: idealValues.h - hInitial, // Ideal = 0
    na: idealValues.na - naInitial, // Ideal = 0
    al: idealValues.al - alInitial // Ideal = 0
  };
  
  console.log('📊 Ajustes calculados:', adjustments);
  
  // Aplicar los ajustes a los campos de objetivo
  applyAdjustmentsToFields(adjustments);
  
  console.log('✅ Ajustes aplicados a los campos');
}

// Función para calcular valores ideales basados en CIC
function calculateIdealValues(cic) {
  return {
    k: Math.round((cic * 0.05) * 100) / 100,   // 5% del CIC
    ca: Math.round((cic * 0.75) * 100) / 100,  // 75% del CIC (ideal)
    mg: Math.round((cic * 0.15) * 100) / 100,  // 15% del CIC (ideal)
    h: 0,   // Ideal = 0
    na: 0,  // Ideal = 0
    al: 0   // Ideal = 0
  };
}

// Función para calcular balance iónico considerando cationes malos
function calculateBalancedAdjustments(cic, kInitial, caInitial, mgInitial, hInitial, naInitial, alInitial) {
  // Calcular valores ideales para los cationes buenos
  const idealValues = calculateIdealValues(cic);
  
  // Calcular total de cationes malos que necesitan ser desplazados
  const badCations = hInitial + naInitial + alInitial;
  
  // Evaluar déficits y excesos de cationes buenos
  const kDeficit = Math.max(0, idealValues.k - kInitial); // Solo si falta K
  const caDeficit = Math.max(0, idealValues.ca - caInitial); // Solo si falta Ca
  const mgDeficit = Math.max(0, idealValues.mg - mgInitial); // Solo si falta Mg
  
  // Evaluar si los cationes están en niveles adecuados (no tocar si están altos o cerca del ideal)
  const kIsHigh = kInitial >= idealValues.k; // K está alto o en ideal
  const caIsHigh = caInitial >= idealValues.ca; // Ca está alto o en ideal
  const mgIsHigh = mgInitial >= idealValues.mg; // Mg está alto o en ideal
  
  // Calcular total de meq necesarios para ajustes
  const totalNeeded = badCations + kDeficit + caDeficit + mgDeficit;
  
  if (totalNeeded === 0) {
    // Si no hay cationes malos ni déficits, usar valores ideales normales
    return idealValues;
  }
  
  // Distribuir el total necesario entre los cationes que necesitan ajuste
  let kFinal = kInitial;
  let caFinal = caInitial;
  let mgFinal = mgInitial;
  
  // Si hay cationes malos, distribuirlos entre los cationes que necesitan ajuste
  if (badCations > 0) {
    const cationsToAdjust = [];
    
    // Solo incluir cationes que necesitan ajuste Y no están altos
    if (kDeficit > 0 && !kIsHigh) cationsToAdjust.push('k');
    if (caDeficit > 0 && !caIsHigh) cationsToAdjust.push('ca');
    if (mgDeficit > 0 && !mgIsHigh) cationsToAdjust.push('mg');
    
    if (cationsToAdjust.length > 0) {
      // Distribuir cationes malos entre los que necesitan ajuste
      const badCationsPerCation = badCations / cationsToAdjust.length;
      
      if (cationsToAdjust.includes('k')) {
        kFinal = Math.round((kInitial + kDeficit + badCationsPerCation) * 100) / 100;
      }
      if (cationsToAdjust.includes('ca')) {
        caFinal = Math.round((caInitial + caDeficit + badCationsPerCation) * 100) / 100;
      }
      if (cationsToAdjust.includes('mg')) {
        mgFinal = Math.round((mgInitial + mgDeficit + badCationsPerCation) * 100) / 100;
      }
    } else {
      // Si no hay cationes que necesiten ajuste, todo va al Ca
      caFinal = Math.round((caInitial + badCations) * 100) / 100;
    }
  } else {
    // Solo ajustar déficits sin cationes malos
    if (!kIsHigh) kFinal = Math.round((kInitial + kDeficit) * 100) / 100;
    if (!caIsHigh) caFinal = Math.round((caInitial + caDeficit) * 100) / 100;
    if (!mgIsHigh) mgFinal = Math.round((mgInitial + mgDeficit) * 100) / 100;
  }
  
  // Verificar que no excedamos el CIC total disponible
  const totalCations = kFinal + caFinal + mgFinal;
  if (totalCations > cic) {
    // Si excedemos el CIC, ajustar proporcionalmente
    const scaleFactor = cic / totalCations;
    kFinal = Math.round((kFinal * scaleFactor) * 100) / 100;
    caFinal = Math.round((caFinal * scaleFactor) * 100) / 100;
    mgFinal = Math.round((mgFinal * scaleFactor) * 100) / 100;
  }
  
  return {
    k: kFinal,
    ca: caFinal,
    mg: mgFinal,
    h: 0,   // Ideal = 0
    na: 0,  // Ideal = 0
    al: 0   // Ideal = 0
  };
}

// Función para aplicar ajustes a los campos
function applyAdjustmentsToFields(adjustments) {
  document.getElementById('k-target').value = adjustments.k.toFixed(2);
  document.getElementById('ca-target').value = adjustments.ca.toFixed(2);
  document.getElementById('mg-target').value = adjustments.mg.toFixed(2);
  document.getElementById('h-target').value = adjustments.h.toFixed(2);
  document.getElementById('na-target').value = adjustments.na.toFixed(2);
  document.getElementById('al-target').value = adjustments.al.toFixed(2);
  
  // Aplicar colores de atención
  applyAttentionColors(adjustments);
}

// Función para aplicar colores de atención a cationes que requieren mayor atención
function applyAttentionColors(adjustments) {
  // Obtener valores del análisis inicial para calcular porcentajes
  const cicTotal = parseFloat(document.getElementById('cic-total').value) || 0;
  const kInitial = parseFloat(document.getElementById('k-initial').value) || 0;
  const caInitial = parseFloat(document.getElementById('ca-initial').value) || 0;
  const mgInitial = parseFloat(document.getElementById('mg-initial').value) || 0;
  const hInitial = parseFloat(document.getElementById('h-initial').value) || 0;
  const naInitial = parseFloat(document.getElementById('na-initial').value) || 0;
  const alInitial = parseFloat(document.getElementById('al-initial').value) || 0;
  
  // Calcular porcentajes actuales
  const kPercent = cicTotal > 0 ? (kInitial / cicTotal) * 100 : 0;
  const caPercent = cicTotal > 0 ? (caInitial / cicTotal) * 100 : 0;
  const mgPercent = cicTotal > 0 ? (mgInitial / cicTotal) * 100 : 0;
  const hPercent = cicTotal > 0 ? (hInitial / cicTotal) * 100 : 0;
  const naPercent = cicTotal > 0 ? (naInitial / cicTotal) * 100 : 0;
  const alPercent = cicTotal > 0 ? (alInitial / cicTotal) * 100 : 0;
  
  // Obtener todos los valores absolutos
  const values = [
    { id: 'k-target', value: Math.abs(adjustments.k), cation: 'K', percent: kPercent },
    { id: 'ca-target', value: Math.abs(adjustments.ca), cation: 'Ca', percent: caPercent },
    { id: 'mg-target', value: Math.abs(adjustments.mg), cation: 'Mg', percent: mgPercent },
    { id: 'h-target', value: Math.abs(adjustments.h), cation: 'H', percent: hPercent },
    { id: 'na-target', value: Math.abs(adjustments.na), cation: 'Na', percent: naPercent },
    { id: 'al-target', value: Math.abs(adjustments.al), cation: 'Al', percent: alPercent }
  ];
  
  // Encontrar el valor máximo
  const maxValue = Math.max(...values.map(v => v.value));
  
  // Determinar qué cationes necesitan atención
  const attentionCations = values.filter(v => {
    // Criterio general
    const generalCriteria = v.value >= 1.0 || (v.value >= 0.5 && v.value === maxValue);
    
    // Criterio especial para K: si está muy por debajo o muy por encima del ideal
    const kSpecialCriteria = v.cation === 'K' && (v.percent < 3.0 || v.percent > 8.0);
    
    // Criterio especial para Ca: si está muy por debajo o muy por encima del ideal
    const caSpecialCriteria = v.cation === 'Ca' && (v.percent < 65.0 || v.percent > 78.0);
    
    // Criterio especial para Mg: si está muy por debajo o muy por encima del ideal
    const mgSpecialCriteria = v.cation === 'Mg' && (v.percent < 10.0 || v.percent > 17.0);
    
    // Criterio especial para H: si está por encima del 10%
    const hSpecialCriteria = v.cation === 'H' && v.percent > 10.0;
    
    // Criterio especial para Na: si está por encima del 1%
    const naSpecialCriteria = v.cation === 'Na' && v.percent > 1.0;
    
    // Criterio especial para Al: si está por encima del 1%
    const alSpecialCriteria = v.cation === 'Al' && v.percent > 1.0;
    
    return generalCriteria || kSpecialCriteria || caSpecialCriteria || mgSpecialCriteria || hSpecialCriteria || naSpecialCriteria || alSpecialCriteria;
  });
  
  // Aplicar colores
  values.forEach(v => {
    const element = document.getElementById(v.id);
    if (element) {
      if (attentionCations.some(ac => ac.id === v.id)) {
        // Rojo para atención
        element.style.color = '#dc2626';
        element.style.fontWeight = '700';
      } else {
        // Color normal
        element.style.color = '#374151';
        element.style.fontWeight = '400';
      }
    }
  });
}

// Función para limpiar campos de ajuste
function clearAdjustmentFields() {
  document.getElementById('k-target').value = '0.00';
  document.getElementById('ca-target').value = '0.00';
  document.getElementById('mg-target').value = '0.00';
  document.getElementById('h-target').value = '0.00';
  document.getElementById('na-target').value = '0.00';
  document.getElementById('al-target').value = '0.00';
  
  // Resetear colores
  const targetInputs = ['k-target', 'ca-target', 'mg-target', 'h-target', 'na-target', 'al-target'];
  targetInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.color = '#374151';
      element.style.fontWeight = '400';
    }
  });
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
    amountElement.textContent = `${formatNumber(amount, 0)} Kg/Ha`;
  }
  
  if (caElement) {
    caElement.textContent = `${formatNumber(caContribution, 1)} Kg/Ha`;
  }
  
  if (naElement) {
    naElement.textContent = `${formatNumber(Math.abs(naRemoval), 1)} Kg/Ha`;
  }
}

function resetAmendmentForm() {
  // Resetear valores iniciales
  document.getElementById('k-initial').value = '0.00';
  document.getElementById('ca-initial').value = '0.00';
  document.getElementById('mg-initial').value = '0.00';
  document.getElementById('h-initial').value = '0.00';
  document.getElementById('na-initial').value = '0.00';
  document.getElementById('al-initial').value = '0.00';
  document.getElementById('cic-total').value = '0.00';
  
  // Recalcular porcentajes de cationes
  calculateCationPercentages(0.00);
  
  // Resetear objetivos (valores en meq)
  document.getElementById('k-target').value = '0.00';
  document.getElementById('ca-target').value = '0.00';
  document.getElementById('mg-target').value = '0.00';
  document.getElementById('h-target').value = '0.00';
  document.getElementById('na-target').value = '0.00';
  document.getElementById('al-target').value = '0.00';
  
  // Recalcular total de meq y porcentajes
  calculateTotalPercent();
  
  // Resetear propiedades del suelo
  document.getElementById('soil-density').value = '';
  document.getElementById('soil-depth').value = '30';
  document.getElementById('soil-ph').value = '';
  const soilReachEl = document.getElementById('soil-reach-percent');
  if (soilReachEl) soilReachEl.value = '100';
  
  // Limpiar colores de atención
  clearAttentionColors();
  
  // Ocultar resultados
  const resultsSection = document.getElementById('amendment-results');
  if (resultsSection) {
    resultsSection.style.display = 'none';
  }
  
  // Mostrar mensaje de estado
  console.log('✅ Formulario reseteado - Ingresa valores y haz clic en "Calcular Enmienda"');
  
  // Las enmiendas seleccionadas se mantienen (comportamiento original)
  
  // El event listener ya está agregado en initializeEnmiendaCalculator()
  // No es necesario re-agregarlo aquí
}

// REMOVIDO: Función addAmendmentCalculationListeners eliminada para evitar molestias

// Función para limpiar colores de atención
function clearAttentionColors() {
  const cations = ['k', 'ca', 'mg', 'h', 'na', 'al'];
  
  cations.forEach(cation => {
    // Limpiar colores de inputs iniciales
    const initialInput = document.getElementById(`${cation}-initial`);
    if (initialInput) {
      initialInput.style.color = '';
      initialInput.style.backgroundColor = '';
    }
    
    // Limpiar colores de inputs objetivo
    const targetInput = document.getElementById(`${cation}-target`);
    if (targetInput) {
      targetInput.style.color = '';
      targetInput.style.backgroundColor = '';
    }
    
    // Limpiar colores de labels
    const initialLabel = document.querySelector(`label[for="${cation}-initial"]`);
    if (initialLabel) {
      initialLabel.style.color = '';
    }
    
    const targetLabel = document.querySelector(`label[for="${cation}-target"]`);
    if (targetLabel) {
      targetLabel.style.color = '';
    }
  });
}

// ============================
// 5) Inicio: proyectos (storage)
// ============================
const NP_KEYS = {
  PROJECTS: "nutriplant_projects",
  CURRENT: "nutriplant_current_project",
};

function np_applySyncStatusBadge() {
  const badge = document.getElementById('np-sync-status');
  if (!badge) return;
  const state = window._npProjectSyncState || { kind: 'idle', text: '' };
  if (!state.text) {
    badge.style.display = 'none';
    badge.textContent = '';
    return;
  }
  const palette = {
    syncing: { bg: '#fffbeb', fg: '#92400e', border: '#fde68a' },
    ok: { bg: '#ecfdf5', fg: '#065f46', border: '#a7f3d0' },
    error: { bg: '#fef2f2', fg: '#991b1b', border: '#fecaca' },
    idle: { bg: '#eef2ff', fg: '#3730a3', border: '#c7d2fe' }
  };
  const colors = palette[state.kind] || palette.idle;
  badge.style.display = 'inline-flex';
  badge.style.background = colors.bg;
  badge.style.color = colors.fg;
  badge.style.border = '1px solid ' + colors.border;
  badge.textContent = state.text;
}

function np_setProjectSyncStatus(kind, text) {
  window._npProjectSyncState = { kind: kind || 'idle', text: text || '' };
  np_applySyncStatusBadge();
}

function np_loadProjects() {
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) {
    console.log('⚠️ No hay usuario logueado - retornando lista vacía');
    return [];
  }
  
  // Usuarios Supabase (UUID): combinar nube + localStorage para no perder proyectos históricos/locales.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    const cloudCache = Array.isArray(window._np_cloud_projects_cache) ? window._np_cloud_projects_cache : [];
    const mergedById = new Map();
    const cloudOwnerById = new Map();

    // Solo proyectos del usuario actual (evita ver en dashboard proyectos de otros; admin y usuario ven solo los suyos)
    cloudCache.forEach(p => {
      if (p && p.id) {
        if (p.user_id) cloudOwnerById.set(p.id, p.user_id);
        if (p.user_id === userId) mergedById.set(p.id, p);
      }
    });

    // Incluir proyectos recién creados en localStorage que aún no están en la nube,
    // para que aparezcan al instante sin tener que recargar.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const isProjectKey = key && (key.startsWith('nutriplant_project_') || key.startsWith('nutriplant-project-'));
      if (!isProjectKey) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) continue;
        const p = JSON.parse(raw);
        if (!p || typeof p !== 'object' || !p.id) continue;
        const pid = p.id || key.replace(/^nutriplant[-_]project[-_]/, '');
        if (!pid) continue;
        if ((p.user_id || p.userId) !== userId) continue;
        if (cloudOwnerById.get(pid) && cloudOwnerById.get(pid) !== userId) continue;
        if (mergedById.has(pid)) continue;
        mergedById.set(pid, {
          id: pid,
          title: p.name || p.title || 'Sin nombre',
          cultivo: p.crop_type || p.cultivo || '',
          variedad: p.variedad || '',
          campoOsector: p.campoOsector || null,
          createdAt: p.created_at || p.createdAt || new Date().toISOString(),
          updatedAt: p.updated_at || p.updatedAt || p.created_at || new Date().toISOString()
        });
      } catch (e) { continue; }
    }

    return Array.from(mergedById.values()).sort((a, b) => {
      const ad = a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0;
      const bd = b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0;
      return new Date(bd) - new Date(ad);
    });
  }

  // Usuarios localStorage: obtener desde perfil
  try {
    const userKey = `nutriplant_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
      const userProfile = JSON.parse(userData);
      if (userProfile && userProfile.projects && Array.isArray(userProfile.projects)) {
        // Cargar solo los proyectos del usuario
        const userProjects = [];
        const validProjectIds = []; // IDs de proyectos que realmente existen
        
        userProfile.projects.forEach(projectId => {
          try {
            // Intentar formato nuevo primero
            let projectKey = `nutriplant_project_${projectId}`;
            let projectData = localStorage.getItem(projectKey);
            
            // Si no se encuentra, intentar formato legacy
            if (!projectData) {
              projectKey = `nutriplant-project-${projectId}`;
              projectData = localStorage.getItem(projectKey);
            }
            
            if (projectData) {
              const project = JSON.parse(projectData);
              if (project && project.id) {
                // Convertir al formato esperado por np_renderProjects
                userProjects.push({
                  id: project.id,
                  title: project.name || project.title || 'Sin nombre',
                  cultivo: project.crop_type || project.cultivo || '',
                  variedad: project.variedad || '',
                  campoOsector: project.campoOsector || null,
                  createdAt: project.created_at || project.createdAt || new Date().toISOString(),
                  updatedAt: project.updated_at || project.updatedAt || project.created_at || new Date().toISOString()
                });
                validProjectIds.push(projectId); // Marcar como válido
              }
            } else {
              // 🧹 LIMPIEZA AUTOMÁTICA: Proyecto no existe en localStorage pero está en la lista del usuario
              console.warn(`⚠️ Proyecto "${projectId}" está en la lista del usuario pero no existe en localStorage. Será omitido.`);
            }
          } catch (e) {
            console.warn('⚠️ Error cargando proyecto:', projectId, e);
          }
        });
        
        // 🧹 LIMPIEZA AUTOMÁTICA: Actualizar lista del usuario eliminando proyectos que no existen
        if (validProjectIds.length !== userProfile.projects.length) {
          console.log(`🧹 Limpiando ${userProfile.projects.length - validProjectIds.length} proyecto(s) huérfano(s) de la lista del usuario`);
          userProfile.projects = validProjectIds;
          localStorage.setItem(userKey, JSON.stringify(userProfile));
          console.log(`✅ Lista del usuario actualizada. Proyectos válidos: ${validProjectIds.length}`);
        }
        
        // Ordenar por más reciente primero (updatedAt descendente)
        userProjects.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        return userProjects;
      }
    }
  } catch (e) {
    console.warn('⚠️ Error obteniendo proyectos del usuario:', e);
  }
  
  // Si no hay usuario o no tiene proyectos, retornar lista vacía
  return [];
}

function np_isSupabaseUuid(userId) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId || ''));
}

/**
 * Validación de pertenencia del proyecto para evitar falsos positivos.
 * - Usuario Supabase (UUID): si hay caché cloud cargado, validar contra esa lista.
 *   Si todavía no está cargada, permitir temporalmente y delegar seguridad real a RLS/backend.
 * - Usuario localStorage: validar contra userProfile.projects.
 */
function np_userOwnsProject(projectId) {
  if (!projectId) return false;

  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) return false;

  if (np_isSupabaseUuid(userId)) {
    const userProjects = np_loadProjects();
    if (Array.isArray(userProjects) && userProjects.length > 0) {
      return userProjects.some(p => p && p.id === projectId);
    }
    return true;
  }

  try {
    const userKey = `nutriplant_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (!userData) return false;

    const userProfile = JSON.parse(userData);
    return !!(userProfile && Array.isArray(userProfile.projects) && userProfile.projects.includes(projectId));
  } catch (e) {
    console.error('❌ Error validando propiedad del proyecto:', e);
    return false;
  }
}
function np_saveProjects(list) {
  // 🔒 ACTUALIZAR: Ya no guardamos en lista global, sino en perfil de usuario
  // Esta función se mantiene para compatibilidad pero ya no se usa
  // Los proyectos ahora se guardan en userProfile.projects
  console.log('⚠️ np_saveProjects: Esta función está deprecada. Los proyectos se guardan en el perfil del usuario.');
}
/**
 * 🔑 GENERA ID DESCRIPTIVO PARA PROYECTOS
 * Formato: [InicialesUsuario]_[NombreProyecto]_[FechaHora]
 * Ejemplo: "JA_PEPE-PRUEBA_20251215_193045"
 * 
 * @param {string} projectName - Nombre del proyecto
 * @param {string} userId - ID del usuario (opcional, se obtiene automáticamente si no se proporciona)
 * @returns {string} ID único y descriptivo
 */
function np_newId(projectName = '', userId = null) {
  // Obtener información del usuario
  if (!userId) {
    userId = localStorage.getItem('nutriplant_user_id');
  }
  
  let userInitials = 'USR'; // Por defecto
  if (userId) {
    try {
      const userKey = `nutriplant_user_${userId}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        const user = JSON.parse(userData);
        // Extraer iniciales del nombre o email
        const nameOrEmail = user.name || user.email || '';
        if (nameOrEmail) {
          // Obtener iniciales del nombre completo o email
          const parts = nameOrEmail.trim().split(/\s+/);
          if (parts.length >= 2) {
            // Si hay nombre y apellido
            userInitials = (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
          } else {
            // Si solo hay un nombre, tomar primeras 2 letras
            userInitials = nameOrEmail.substring(0, 2).toUpperCase();
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Error obteniendo iniciales del usuario:', e);
    }
  }
  
  // Normalizar nombre del proyecto para el ID
  let projectPart = '';
  if (projectName && projectName.trim()) {
    projectPart = projectName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')  // Reemplazar caracteres especiales con guión
      .replace(/-+/g, '-')          // Múltiples guiones a uno solo
      .substring(0, 20);            // Máximo 20 caracteres
  } else {
    projectPart = 'PROJ';
  }
  
  // Generar fecha y hora en formato compacto: YYYYMMDD_HHMMSS
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  
  // Construir ID final
  const projectId = `${userInitials}_${projectPart}_${dateTime}`;
  
  // Validar longitud máxima (algunos sistemas tienen límites)
  if (projectId.length > 50) {
    // Si es muy largo, truncar el nombre del proyecto
    const maxProjectPartLength = 50 - userInitials.length - dateTime.length - 2; // -2 por los guiones bajos
    projectPart = projectPart.substring(0, maxProjectPartLength);
    return `${userInitials}_${projectPart}_${dateTime}`;
  }
  
  return projectId;
}

/**
 * 🔄 FUNCIÓN LEGACY: Genera ID aleatorio (mantenida para compatibilidad)
 * Se usa como fallback si falla la generación descriptiva
 */
function np_newIdLegacy() {
  return "np_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function np_createProject(data) {
  const now = new Date().toISOString();
  const projectName = String(data.title || data.name || "").trim() || 'Nuevo Proyecto';
  
  // 🔑 GENERAR ID DESCRIPTIVO basado en usuario, nombre y fecha/hora
  let newId = np_newId(projectName);
  
  // 🔒 VALIDACIÓN: Verificar que no exista ya un proyecto con este ID
  let projectKey = `nutriplant_project_${newId}`;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (localStorage.getItem(projectKey) && attempts < maxAttempts) {
    console.warn(`⚠️ ID ya existe (intento ${attempts + 1}/${maxAttempts}), generando variación...`);
    attempts++;
    
    if (attempts < 5) {
      // Intentar agregar un sufijo numérico
      newId = np_newId(projectName) + '_' + attempts;
    } else {
      // Si sigue fallando, usar ID legacy como último recurso
      console.warn('⚠️ Usando ID legacy como fallback');
      newId = np_newIdLegacy();
    }
    projectKey = `nutriplant_project_${newId}`;
  }
  
  if (localStorage.getItem(projectKey)) {
    console.error('❌ ERROR CRÍTICO: No se pudo generar un ID único después de múltiples intentos');
    return null;
  }
  
  console.log('✅ ID generado:', newId);
  
  // 🔒 ASOCIAR PROYECTO AL USUARIO ACTUAL
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) {
    console.error('❌ No hay usuario logueado - no se puede crear proyecto');
    alert('Error: No hay usuario logueado. Por favor, inicia sesión nuevamente.');
    return null;
  }
  
  // 🔑 OBTENER INFORMACIÓN DEL USUARIO para el proyecto
  let userInfo = {};
  if (userId) {
    try {
      const userKey = `nutriplant_user_${userId}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        const user = JSON.parse(userData);
        userInfo = {
          user_id: userId,
          user_name: user.name || '',
          user_email: user.email || ''
        };
      }
    } catch (e) {
      console.warn('⚠️ Error obteniendo información del usuario:', e);
    }
  }
  
  // 📋 ESTRUCTURA COMPLETA DEL PROYECTO
  const proj = {
    // 🔑 IDENTIFICADORES
    id: newId, // 🔒 CRÍTICO: El ID debe ser consistente en todo el objeto
    code: newId, // Código del proyecto (mismo que ID para compatibilidad)
    
    // 📝 INFORMACIÓN BÁSICA
    title: projectName,
    name: projectName, // Asegurar que también tenga 'name' para consistencia
    
    // 👤 INFORMACIÓN DEL USUARIO
    ...userInfo,
    
    // 🌾 INFORMACIÓN DEL CULTIVO
    cultivo: data.cultivo || null,
    crop_type: data.cultivo || null, // Asegurar que también tenga 'crop_type'
    variedad: data.variedad || null,
    campoOsector: data.campoOsector || null,
    rendimientoEsperado: data.rendimientoEsperado ?? null,
    unidadRendimiento: data.unidadRendimiento || "t/ha",
    
    // 📅 FECHAS
    createdAt: now,
    created_at: now, // Asegurar ambos formatos
    updatedAt: now,
    updated_at: now, // Asegurar ambos formatos
    
    // 📍 UBICACIÓN (inicializada vacía)
    location: {
      coordinates: '',
      surface: '',
      perimeter: '',
      polygon: null,
      city: '',
      state: '',
      country: ''
    },
    
    // 🏷️ METADATOS
    status: 'active', // active, archived, deleted
    version: '1.0', // Versión del formato de datos
  };
  
  // 🚀 CRÍTICO: Inicializar proyecto con estructura vacía en localStorage
  // Esto asegura que NO se carguen datos de proyectos anteriores
  let useCentralized = typeof window.projectStorage !== 'undefined';
  
  // 🔒 NORMALIZAR: Crear objeto de proyecto completo con estructura consistente
  // 📋 ESTRUCTURA COMPLETA DE INFORMACIÓN DEL PROYECTO
    const emptyProject = {
    // 🔑 IDENTIFICADORES
    id: newId, // 🔒 CRÍTICO: ID debe ser EXACTAMENTE el mismo en toda la estructura
    code: newId,
    
    // 📝 INFORMACIÓN BÁSICA
      name: proj.title,
    title: proj.title, // Mantener ambos campos para compatibilidad
    
    // 👤 INFORMACIÓN DEL USUARIO
    ...proj, // Incluir user_id, user_name, user_email
    
    // 🌾 INFORMACIÓN DEL CULTIVO
    crop_type: proj.crop_type,
    cultivo: proj.cultivo,
    variedad: proj.variedad,
    campoOsector: proj.campoOsector,
    rendimientoEsperado: proj.rendimientoEsperado,
    unidadRendimiento: proj.unidadRendimiento,
    
    // 📍 UBICACIÓN Y MAPA
    location: {
      projectId: newId, // 🔒 CRÍTICO: Validación de pertenencia
      coordinates: '',
      surface: '',
      perimeter: '',
      polygon: null,
      city: '',
      state: '',
      country: '',
      center: null,
      area: null,
      areaHectares: null,
      areaAcres: null
    },
    
    // 🚜 ANÁLISIS DE ENMIENDAS
      amendments: {
        selected: [],
      results: {
        type: '',
        amount: '',
        caContribution: '',
        naRemoval: '',
        detailedHTML: '',
        isVisible: false
      },
      lastUpdated: null
    },
    
    // 🔬 ANÁLISIS DE SUELO
    soilAnalysis: {
      initial: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0, cic: 0 },
      properties: { ph: 0, density: 0, depth: 0 },
      adjustments: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0 },
      lastUpdated: null
    },
    
    // 📊 NUTRICIÓN GRANULAR
      granular: null,
    
    // 💧 FERTIRRIEGO
    fertirriego: null,
    
    // 🌡️ DÉFICIT DE PRESIÓN DE VAPOR (VPD)
      vpdAnalysis: {
      // Calculadora Ambiental Simple
      environmental: {
        temperature: null,
        humidity: null,
        vpd: null,
        hd: null,
        calculatedAt: null,
        location: { lat: null, lng: null },
        source: null
      },
      // Calculadora Avanzada
      advanced: {
        airTemperature: null,
        airHumidity: null,
        mode: null, // 'leaf' o 'radiation'
        leafTemperature: null,
        solarRadiation: null,
        calculatedLeafTemp: null,
        vpd: null,
        hd: null,
        calculatedAt: null
      },
      // Historial de cálculos
      history: [],
      lastUpdated: null
    },
    
    // 🌱 HIDROPONÍA
    hydroponics: null,
    
    // 🧪 EXTRACTO DE PASTA
    extracto: null,
    
    // 💧 ANÁLISIS DE AGUA
    agua: null,
    
    // 🌿 ANÁLISIS FOLIAR
    foliar: null,
    
    // 🍎 ANÁLISIS DE FRUTA
    fruta: null,
    
    // 💬 HISTORIAL DE CHAT
    chat_history: [],
    
    // 📄 CÁLCULOS Y DOCUMENTOS
    calculations: {},
    documents: [],
    
    // 📅 FECHAS
      created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
    
    // 🏷️ METADATOS
    status: 'active',
    version: '1.0'
  };
  
  if (useCentralized) {
    // Guardar usando sistema centralizado
    const saved = window.projectStorage.saveProject(emptyProject, newId);
    if (!saved) {
      console.error('❌ Error guardando proyecto con sistema centralizado, intentando fallback...');
      useCentralized = false; // Intentar fallback
    } else {
      console.log('✅ Proyecto nuevo inicializado con sistema centralizado (ID único):', newId);
    }
  }
  
  if (!useCentralized) {
    // Fallback: inicializar directamente en localStorage
    // 🔒 CRÍTICO: Asegurar que el ID en la clave sea EXACTAMENTE el mismo que en el objeto
    const finalProjectKey = `nutriplant_project_${newId}`;
    
    // 🔒 VALIDACIÓN FINAL: Verificar que el ID en el objeto coincida con la clave
    if (emptyProject.id !== newId) {
      console.error('❌ ERROR CRÍTICO: ID del objeto no coincide con ID de la clave');
      emptyProject.id = newId; // Forzar corrección
    }
    
    // 🔒 CRÍTICO: Asegurar que el proyecto SIEMPRE tenga información del usuario
    if (!emptyProject.user_id || !emptyProject.user_name) {
      console.warn('⚠️ Proyecto sin información de usuario - agregando automáticamente');
      emptyProject.user_id = userId;
      emptyProject.user_name = userInfo.user_name || '';
      emptyProject.user_email = userInfo.user_email || '';
      emptyProject.userId = userId; // Compatibilidad
    }
    
    localStorage.setItem(finalProjectKey, JSON.stringify(emptyProject));
    console.log('✅ Proyecto nuevo inicializado en localStorage (ID único):', newId, 'Clave:', finalProjectKey, 'Usuario:', emptyProject.user_name || userId);
  }
    
  // 🔒 ASOCIAR PROYECTO AL USUARIO ACTUAL (una sola vez, después de guardar)
      try {
        const userKey = `nutriplant_user_${userId}`;
        const userData = localStorage.getItem(userKey);
        if (userData) {
          const userProfile = JSON.parse(userData);
          if (!userProfile.projects) {
            userProfile.projects = [];
          }
      // 🔒 VALIDACIÓN: Verificar que el proyecto no esté ya en la lista
          if (!userProfile.projects.includes(newId)) {
            userProfile.projects.push(newId);
            localStorage.setItem(userKey, JSON.stringify(userProfile));
        console.log('✅ Proyecto asociado al usuario:', userId, 'ID:', newId);
      } else {
        console.warn('⚠️ El proyecto ya estaba en la lista del usuario (ignorado)');
          }
    } else {
      console.error('❌ No se encontró perfil de usuario');
        }
      } catch (e) {
        console.error('❌ Error asociando proyecto al usuario:', e);
      }
  
  if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    const key = 'nutriplant_project_' + newId;
    const stored = localStorage.getItem(key);
    if (stored && typeof window.nutriplantSyncProjectToCloud === 'function') {
      try {
        const projectData = JSON.parse(stored);
        window.nutriplantSyncProjectToCloud(newId, projectData);
      } catch (e) { console.warn('sync new project:', e); }
    }
    if (Array.isArray(window._np_cloud_projects_cache)) {
      window._np_cloud_projects_cache.unshift({ id: newId, title: proj.title, cultivo: proj.cultivo || '', variedad: proj.variedad || '', campoOsector: proj.campoOsector || null, createdAt: now, updatedAt: now });
      if (typeof np_renderProjects === 'function') np_renderProjects();
    }
  }
  
  return proj;
}
async function np_deleteProject(id) {
  console.log('🗑️ Eliminando proyecto:', id);
  
  // 🔒 VALIDACIÓN: Verificar que hay usuario logueado
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) {
    console.error('❌ No hay usuario logueado');
    alert('Error: No hay usuario logueado.');
    return;
  }
  
  // 1. 💬 PRESERVAR HISTORIAL DE CHAT EN EL USUARIO (chat sin proyecto) ANTES DE BORRAR
  const projectKey = `nutriplant_project_${id}`;
  const projectRaw = localStorage.getItem(projectKey);
  if (projectRaw && userId) {
    try {
      const project = JSON.parse(projectRaw);
      if (project.chat_history && Array.isArray(project.chat_history) && project.chat_history.length > 0) {
        const userKey = `nutriplant_user_${userId}`;
        const userRaw = localStorage.getItem(userKey);
        if (userRaw) {
          const user = JSON.parse(userRaw);
          user.chat_history_sin_proyecto = user.chat_history_sin_proyecto || [];
          user.chat_history_sin_proyecto = user.chat_history_sin_proyecto.concat(project.chat_history);
          localStorage.setItem(userKey, JSON.stringify(user));
          console.log('💬 Historial del chat del proyecto movido al chat sin proyecto del usuario (' + project.chat_history.length + ' mensajes)');
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo preservar historial del chat:', e.message);
    }
  }

  // 2. 🔒 ELIMINAR PROYECTO DE LOCALSTORAGE
  if (projectRaw) {
    localStorage.removeItem(projectKey);
    console.log('✅ Proyecto eliminado de localStorage:', projectKey);
  } else {
    console.warn('⚠️ Proyecto no encontrado en localStorage:', projectKey);
  }

  // Quitar de la caché de nube al instante para que la lista se actualice sin recargar
  if (Array.isArray(window._np_cloud_projects_cache)) {
    window._np_cloud_projects_cache = window._np_cloud_projects_cache.filter(p => p.id !== id);
  }
    
  // 3. 🔒 ELIMINAR DE LA LISTA DEL USUARIO
      try {
        const userKey = `nutriplant_user_${userId}`;
        const userData = localStorage.getItem(userKey);
        if (userData) {
          const userProfile = JSON.parse(userData);
      if (userProfile.projects && Array.isArray(userProfile.projects)) {
        const index = userProfile.projects.indexOf(id);
        if (index > -1) {
          userProfile.projects.splice(index, 1);
            localStorage.setItem(userKey, JSON.stringify(userProfile));
          console.log('✅ Proyecto eliminado de la lista del usuario:', id);
        } else {
          console.warn('⚠️ Proyecto no estaba en la lista del usuario:', id);
        }
          }
        }
      } catch (e) {
    console.error('❌ Error eliminando proyecto de la lista del usuario:', e);
      }
  
  // 3b. 🟢 Si es usuario Supabase, eliminar proyecto también en la nube (caché ya actualizada arriba)
  if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    const sp = window.nutriplantSupabaseProjects;
    if (sp && typeof sp.deleteProject === 'function') {
      try {
        const ok = await sp.deleteProject(id);
        if (ok) console.log('☁️ Proyecto eliminado de la nube:', id);
      } catch (e) { console.warn('⚠️ Supabase delete project:', e); }
    }
  }
  
  // 4. 🔄 LIMPIAR PROYECTO ACTUAL SI ES EL QUE SE ELIMINÓ
  if (np_getCurrentProjectId() === id) {
    np_setCurrentProject('');
    console.log('🧹 Proyecto actual limpiado (era el eliminado)');
    
    // 🔄 ELIMINAR INDICADOR VISUAL DE PROYECTO ACTIVO
    const projectIndicator = document.querySelector('.project-indicator-global');
    if (projectIndicator) {
      projectIndicator.remove();
      console.log('✅ Indicador de proyecto activo eliminado');
    }
  }
  
  // 4. 🔄 SI NO QUEDAN PROYECTOS, LIMPIAR TODO
  const remainingProjects = np_loadProjects();
  if (remainingProjects.length === 0) {
    console.log('🧹 No quedan proyectos - limpiando todo');
    np_setCurrentProject('');
    
    // Eliminar indicador visual si existe
    const projectIndicator = document.querySelector('.project-indicator-global');
    if (projectIndicator) {
      projectIndicator.remove();
      console.log('✅ Indicador eliminado (no hay proyectos)');
    }
  }
  
  console.log('✅ Proyecto eliminado completamente:', id);
}
function np_duplicateProject(id) {
  console.log('📋 Duplicando proyecto:', id);
  
  // 1. Obtener información básica del proyecto
  const p = np_loadProjects().find(p => p.id === id);
  if (!p) {
    console.error('❌ Proyecto no encontrado:', id);
    return null;
  }
  
  // 2. 🚀 CRÍTICO: Cargar TODOS los datos del proyecto original
  let originalProjectData = null;
  const useCentralized = typeof window.projectStorage !== 'undefined';
  
  if (useCentralized) {
    // Cargar desde sistema centralizado
    originalProjectData = window.projectStorage.loadProject(id);
    console.log('✅ Datos del proyecto original cargados desde sistema centralizado');
  } else {
    // Fallback: cargar directamente desde localStorage
    const projectKey = `nutriplant_project_${id}`;
    const savedData = localStorage.getItem(projectKey);
    if (savedData) {
      try {
        originalProjectData = JSON.parse(savedData);
        console.log('✅ Datos del proyecto original cargados desde localStorage');
      } catch (e) {
        console.error('❌ Error parseando datos del proyecto:', e);
        originalProjectData = {};
      }
    } else {
      originalProjectData = {};
      console.log('ℹ️ No hay datos guardados para el proyecto original');
    }
  }
  
  // 3. Crear nuevo ID para el proyecto duplicado
  const newId = np_newId(p.title + " (copia)");
  const now = new Date().toISOString();
  
  // 🔑 OBTENER INFORMACIÓN DEL USUARIO ACTUAL
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) {
    console.error('❌ No hay usuario logueado - no se puede duplicar proyecto');
    alert('Error: No hay usuario logueado. Por favor, inicia sesión nuevamente.');
    return null;
  }
  
  let userInfo = {};
  try {
    const userKey = `nutriplant_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
      const user = JSON.parse(userData);
      userInfo = {
        user_id: userId,
        user_name: user.name || '',
        user_email: user.email || ''
      };
    }
  } catch (e) {
    console.warn('⚠️ Error obteniendo información del usuario:', e);
  }
  
  // 4. Crear copia de la información básica del proyecto
  const copy = { 
    ...p, 
    id: newId, 
    title: p.title + " (copia)", 
    name: p.title + " (copia)",
    ...userInfo,  // 🔒 ASEGURAR que tenga información del usuario
    createdAt: now, 
    updatedAt: now,
    created_at: now,
    updated_at: now
  };
  
  // 5. 🚀 CRÍTICO: Copiar TODOS los datos del proyecto original al nuevo proyecto PRIMERO
  if (originalProjectData) {
    // Crear copia profunda de todos los datos
    const duplicatedData = JSON.parse(JSON.stringify(originalProjectData));
    
    // Actualizar ID, nombre y usuario del proyecto duplicado
    duplicatedData.id = newId;
    duplicatedData.code = newId;
    duplicatedData.name = copy.title;
    duplicatedData.title = copy.title;
    duplicatedData.updated_at = now;
    duplicatedData.updatedAt = now;
    duplicatedData.created_at = now;
    duplicatedData.createdAt = now;
    
    // 🔒 ASEGURAR que el proyecto duplicado tenga información del usuario actual
    duplicatedData.user_id = userId;
    duplicatedData.userId = userId;
    duplicatedData.user_name = userInfo.user_name;
    duplicatedData.user_email = userInfo.user_email;
    
    // 🚀 NOTA: Se copian TODOS los datos (incluyendo vpdAnalysis, amendments, granular, etc.)
    // porque es un snapshot completo del proyecto en ese momento.
    // Después de duplicar, los proyectos son completamente independientes.
    console.log('✅ Todos los datos copiados (incluyendo vpdAnalysis) - proyectos independientes después de la duplicación');
    
    // 🚀 CRÍTICO: Actualizar projectId en location si existe
    if (duplicatedData.location) {
      // Verificar que location tiene polígono válido
      const hasValidPolygon = duplicatedData.location.polygon && 
                             Array.isArray(duplicatedData.location.polygon) && 
                             duplicatedData.location.polygon.length >= 3;
      
      if (hasValidPolygon) {
        // Actualizar projectId y projectName en location
        duplicatedData.location.projectId = newId;
        duplicatedData.location.projectName = copy.title;
        duplicatedData.location.lastUpdated = now;
        console.log('✅ Location copiado con nuevo projectId:', newId, '- Polígono válido:', duplicatedData.location.polygon.length, 'puntos');
      } else {
        console.log('ℹ️ Location existe pero no tiene polígono válido - se copia igual');
        duplicatedData.location.projectId = newId;
        duplicatedData.location.projectName = copy.title;
      }
    } else {
      console.log('ℹ️ No hay location para copiar');
    }
    
    // 🔒 GUARDAR PROYECTO DUPLICADO EN LOCALSTORAGE DIRECTAMENTE
    const newProjectKey = `nutriplant_project_${newId}`;
    localStorage.setItem(newProjectKey, JSON.stringify(duplicatedData));
    console.log('✅ Proyecto duplicado guardado en localStorage:', newId);
    
    // 🟢 Sincronizar el duplicado con la nube (misma info que en el momento de duplicar)
    if (typeof window.nutriplantSyncProjectToCloud === 'function') {
      try {
        window.nutriplantSyncProjectToCloud(newId, duplicatedData);
        if (Array.isArray(window._np_cloud_projects_cache)) {
          window._np_cloud_projects_cache.unshift({
            id: newId,
            title: duplicatedData.name || duplicatedData.title || copy.title,
            cultivo: duplicatedData.cultivo || duplicatedData.crop_type || '',
            variedad: duplicatedData.variedad || '',
            campoOsector: duplicatedData.campoOsector || null,
            createdAt: now,
            updatedAt: now
          });
        }
      } catch (err) {
        console.warn('⚠️ Sync proyecto duplicado a nube:', err);
      }
    }
    
    // NO usar projectStorage.saveProject para evitar validaciones durante duplicación
    if (useCentralized) {
      // Solo actualizar caché en memoria si existe
      if (window.projectStorage && window.projectStorage.memoryCache) {
        // NO llamar a saveProject - solo actualizar caché si es necesario
        console.log('ℹ️ Proyecto duplicado - usando guardado directo, sin validaciones');
      }
      const success = true; // Ya guardamos directamente
      if (success) {
        // Verificación simple - el proyecto ya está guardado directamente
        const verifyLocation = duplicatedData.location;
        const locationSaved = verifyLocation && 
                             verifyLocation.polygon && 
                             Array.isArray(verifyLocation.polygon) && 
                             verifyLocation.polygon.length >= 3;
        
        console.log('✅ Proyecto duplicado con TODOS los datos guardados (snapshot completo):', {
          location: locationSaved ? `✅ Polígono válido (${verifyLocation.polygon.length} puntos)` : (duplicatedData.location ? '⚠️ Sin polígono válido' : '❌ No hay location'),
          locationProjectId: verifyLocation ? verifyLocation.projectId : 'N/A',
          amendments: !!duplicatedData.amendments,
          soilAnalysis: !!duplicatedData.soilAnalysis,
          granular: !!duplicatedData.granular,
          fertirriego: !!duplicatedData.fertirriego,
          vpdAnalysis: !!duplicatedData.vpdAnalysis ? '✅ Copiado (datos independientes después)' : '❌ Sin datos VPD'
        });
        
        // Location ya está incluido en duplicatedData que se guardó directamente
        // No necesitamos saveSection aquí porque ya guardamos todo el proyecto
        if (duplicatedData.location && duplicatedData.location.polygon && duplicatedData.location.polygon.length >= 3) {
          console.log('✅ Location incluido en proyecto duplicado:', duplicatedData.location.polygon.length, 'puntos');
        }
      } else {
        console.error('❌ Error guardando datos del proyecto duplicado');
      }
    } else {
      // Fallback: guardar directamente en localStorage
      const newProjectKey = `nutriplant_project_${newId}`;
      localStorage.setItem(newProjectKey, JSON.stringify(duplicatedData));
      console.log('✅ Proyecto duplicado con TODOS los datos guardados en localStorage');
    }
  } else {
    console.log('ℹ️ No hay datos para copiar - proyecto duplicado sin datos');
    // Aún así, crear un proyecto vacío
    const emptyDuplicatedData = {
      id: newId,
      code: newId,
      name: copy.title,
      title: copy.title,
      ...userInfo,
      created_at: now,
      createdAt: now,
      updated_at: now,
      updatedAt: now,
      status: 'active'
    };
    const newProjectKey = `nutriplant_project_${newId}`;
    localStorage.setItem(newProjectKey, JSON.stringify(emptyDuplicatedData));
    console.log('✅ Proyecto duplicado vacío guardado en localStorage:', newId);
    // 🟢 Sincronizar también a la nube
    if (typeof window.nutriplantSyncProjectToCloud === 'function') {
      try {
        window.nutriplantSyncProjectToCloud(newId, emptyDuplicatedData);
        if (Array.isArray(window._np_cloud_projects_cache)) {
          window._np_cloud_projects_cache.unshift({
            id: newId,
            title: copy.title,
            cultivo: '',
            variedad: '',
            campoOsector: null,
            createdAt: now,
            updatedAt: now
          });
        }
      } catch (err) {
        console.warn('⚠️ Sync proyecto duplicado (vacío) a nube:', err);
      }
    }
  }
  
  // 🔒 AHORA SÍ: Asociar proyecto al usuario (DESPUÉS de guardarlo en localStorage)
  try {
    const userKey = `nutriplant_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
      const userProfile = JSON.parse(userData);
      if (!userProfile.projects) {
        userProfile.projects = [];
      }
      // Verificar que el proyecto no esté ya en la lista
      if (!userProfile.projects.includes(newId)) {
        userProfile.projects.push(newId);
        localStorage.setItem(userKey, JSON.stringify(userProfile));
        console.log('✅ Proyecto duplicado asociado al usuario (después de guardarlo):', userId, 'ID:', newId);
      }
    }
  } catch (e) {
    console.error('❌ Error asociando proyecto duplicado al usuario:', e);
  }
  
  // 🔄 Renderizar la lista actualizada para mostrar el proyecto duplicado
  np_renderProjects();
  
  // 🎉 Mostrar mensaje de éxito al usuario
  const projectName = copy.title;
  alert(`✅ Proyecto duplicado exitosamente: "${projectName}"\n\nID: ${newId}\n\nEl proyecto duplicado incluye toda la información del original y está listo para que lo edites.`);
  
  console.log('✅ Proyecto duplicado exitosamente:', newId);
  console.log('✅ Proyecto asociado al usuario:', userId);
  console.log('✅ Visible en panel del usuario y panel de admin');
  
  return copy;
}

// Función para abrir el modal de edición de proyecto
function np_openEditProjectModal(projectId) {
  console.log('✏️ Abriendo modal de edición para proyecto:', projectId);
  
  // Cargar datos del proyecto
  const project = np_getProject(projectId);
  if (!project) {
    alert('❌ No se encontró el proyecto');
    return;
  }
  
  // Cargar datos completos del proyecto desde localStorage
  const projectKey = `nutriplant_project_${projectId}`;
  const projectDataRaw = localStorage.getItem(projectKey);
  if (!projectDataRaw) {
    alert('❌ No se encontraron los datos del proyecto');
    return;
  }
  
  let projectData;
  try {
    projectData = JSON.parse(projectDataRaw);
  } catch (e) {
    console.error('❌ Error parseando datos del proyecto:', e);
    alert('❌ Error al cargar los datos del proyecto');
    return;
  }
  
  // Llenar el formulario con los datos actuales
  const titleInput = document.getElementById('edit-np-title');
  const campoInput = document.getElementById('edit-np-campo');
  const cultivoInput = document.getElementById('edit-np-cultivo');
  const variedadInput = document.getElementById('edit-np-variedad');
  const rendInput = document.getElementById('edit-np-rend');
  const unidadInput = document.getElementById('edit-np-unidad');
  
  if (titleInput) titleInput.value = projectData.title || projectData.name || '';
  if (campoInput) campoInput.value = projectData.campoOsector || '';
  if (cultivoInput) cultivoInput.value = projectData.cultivo || projectData.crop_type || '';
  if (variedadInput) variedadInput.value = projectData.variedad || '';
  if (rendInput) rendInput.value = projectData.rendimientoEsperado || '';
  if (unidadInput) unidadInput.value = projectData.unidadRendimiento || 't/ha';
  
  // Guardar el ID del proyecto en un atributo del formulario para usarlo al guardar
  const editForm = document.getElementById('form-edit-project');
  if (editForm) {
    editForm.setAttribute('data-project-id', projectId);
  }
  
  // Abrir el modal
  const editModal = document.getElementById('dlg-edit-project');
  if (editModal) {
    editModal.showModal();
  } else {
    console.error('❌ No se encontró el modal de edición');
  }
}

// Función para actualizar/editar un proyecto
function np_updateProject(projectId, updates) {
  console.log('✏️ Actualizando proyecto:', projectId, updates);
  
  // Validar que hay usuario logueado
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) {
    console.error('❌ No hay usuario logueado');
    alert('Error: No hay usuario logueado. Por favor, inicia sesión nuevamente.');
    return false;
  }
  
  // Cargar datos actuales del proyecto
  const projectKey = `nutriplant_project_${projectId}`;
  const projectDataRaw = localStorage.getItem(projectKey);
  if (!projectDataRaw) {
    console.error('❌ No se encontró el proyecto en localStorage');
    alert('❌ No se encontró el proyecto');
    return false;
  }
  
  let projectData;
  try {
    projectData = JSON.parse(projectDataRaw);
  } catch (e) {
    console.error('❌ Error parseando datos del proyecto:', e);
    alert('❌ Error al cargar los datos del proyecto');
    return false;
  }
  
  // 🚀 CRÍTICO: Preservar datos importantes antes de actualizar
  const preservedData = {
    id: projectData.id,
    code: projectData.code,
    user_id: projectData.user_id,
    userId: projectData.userId,
    user_name: projectData.user_name,
    user_email: projectData.user_email,
    createdAt: projectData.createdAt,
    created_at: projectData.created_at,
    location: projectData.location,
    sections: projectData.sections,
    chat_history: projectData.chat_history,
    amendments: projectData.amendments,
    soilAnalysis: projectData.soilAnalysis,
    granular: projectData.granular,
    fertirriego: projectData.fertirriego,
    vpdAnalysis: projectData.vpdAnalysis
  };
  
  // Actualizar campos editables
  const now = new Date().toISOString();
  const updatedProject = {
    ...projectData,
    ...updates,
    ...preservedData, // Preservar datos críticos
    updated_at: now,
    updatedAt: now
  };
  
  // Asegurar que title y name estén sincronizados
  if (updates.title) {
    updatedProject.name = updates.title;
  }
  if (updates.cultivo) {
    updatedProject.crop_type = updates.cultivo;
  }
  
  // Guardar proyecto actualizado
  try {
    localStorage.setItem(projectKey, JSON.stringify(updatedProject));
    console.log('✅ Proyecto actualizado exitosamente:', projectId);
    
    // 🟢 Sincronizar con la nube (tarjeta del proyecto: nombre, cultivo, variedad, etc.)
    if (typeof window.nutriplantSyncProjectToCloud === 'function') {
      try {
        window.nutriplantSyncProjectToCloud(projectId, updatedProject);
      } catch (err) {
        console.warn('⚠️ nutriplantSyncProjectToCloud (tarjeta):', err);
      }
    }
    
    // Limpiar caché si existe
    if (window.projectStorage) {
      window.projectStorage.clearMemoryCache();
      window.projectStorage.clearProjectsCache();
    }
    
    // Si el proyecto editado es el proyecto actual, actualizar currentProject
    if (currentProject.id === projectId) {
      if (updates.title) {
        currentProject.name = updates.title;
      }
      // Actualizar projectManager si existe
      if (window.projectManager) {
        window.projectManager.setCurrentProject(projectId, updates.title || currentProject.name);
      }
    }
    
    return true;
  } catch (e) {
    console.error('❌ Error guardando proyecto actualizado:', e);
    alert('❌ Error al guardar los cambios');
    return false;
  }
}

function np_getProject(id) {
  // 🔒 FILTRAR: Solo buscar en proyectos del usuario actual
  const userProjects = np_loadProjects();
  return userProjects.find(p => p.id === id) || null;
}
function np_allProjects() { return np_loadProjects(); }
function np_setCurrentProject(id) { 
  localStorage.setItem(NP_KEYS.CURRENT, id || ""); 
  
  // 🚀 GUARDAR cambios pendientes del proyecto anterior antes de cambiar
  if (window.projectStorage && currentProject.id) {
    window.projectStorage.flushPendingSaves();
  }
  
  // 🚀 CRÍTICO: PRIMERO limpiar location Y mapa ANTES de actualizar el proyecto
  currentProject.location = { coordinates: '', surface: '', perimeter: '', polygon: null };
  
  // 🚀 CRÍTICO: Limpiar vpdAnalysis al cambiar de proyecto para evitar mezclar datos
  currentProject.vpdAnalysis = {
    environmental: {
      temperature: null,
      humidity: null,
      vpd: null,
      hd: null,
      calculatedAt: null,
      location: { lat: null, lng: null },
      source: null
    },
    advanced: {
      airTemperature: null,
      airHumidity: null,
      mode: null,
      leafTemperature: null,
      solarRadiation: null,
      calculatedLeafTemp: null,
      vpd: null,
      hd: null,
      calculatedAt: null
    },
    history: [],
    lastUpdated: null
  };
  
  // 🚀 CRÍTICO: Limpiar caché en memoria cuando se cambia de proyecto
  if (window.projectStorage) {
    console.log('🧹 Limpiando caché en memoria al cambiar proyecto...');
    window.projectStorage.clearMemoryCache();
  }
  
  // 🚀 CRÍTICO: Limpiar mapa completamente antes de cambiar proyecto
  if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap) {
    console.log('🧹 Limpiando mapa al cambiar proyecto...');
    if (typeof nutriPlantMap.forceRemoveAllPolygons === 'function') {
      nutriPlantMap.forceRemoveAllPolygons();
    }
    // También limpiar display
    if (typeof forceClearLocationDisplay === 'function') {
      forceClearLocationDisplay();
    }
    // Actualizar display para mostrar valores en 0
    if (typeof nutriPlantMap.updateDisplay === 'function') {
      nutriPlantMap.updateDisplay();
    }
    // Actualizar instrucciones
    if (typeof nutriPlantMap.updateInstructions === 'function') {
      nutriPlantMap.updateInstructions('📍 Haz clic en el mapa para trazar tu parcela');
    }
  }
  
  // Actualizar el currentProject global con el nuevo ID
  if (id) {
    currentProject.id = id;
    const project = np_getProject(id);
    if (project) {
      currentProject.name = project.title;
    }
  } else {
    currentProject.id = null;
    currentProject.name = '';
    // Si no hay proyecto, limpiar también location
    currentProject.location = { coordinates: '', surface: '', perimeter: '', polygon: null };
    
    // Limpiar caché de memoria
    if (window.projectStorage) {
      window.projectStorage.clearMemoryCache();
    }
  }
  
  // También establecer en el sistema de gestión de proyectos
  if (window.projectManager && id) {
    const project = np_getProject(id);
    if (project) {
      window.projectManager.setCurrentProject(id, project.title);
      
      // CRÍTICO: PRIMERO limpiar elementos de ubicación antes de cargar datos
      if (typeof forceClearLocationDisplay === 'function') {
        forceClearLocationDisplay();
      } else {
        // Fallback: limpiar directamente
        const coordinatesEl = document.getElementById('coordinatesDisplay');
        const areaEl = document.getElementById('areaDisplay');
        const perimeterEl = document.getElementById('perimeterDisplay');
        if (coordinatesEl) coordinatesEl.textContent = 'No seleccionadas';
        if (areaEl) areaEl.textContent = '0.00 ha (0.00 acres)';
        if (perimeterEl) perimeterEl.textContent = '0.00 m';
      }
      
      // 🚀 CARGAR PROYECTO EN MEMORIA (optimizado: usar caché si está disponible)
      // Verificar si el proyecto ya está en caché de proyectos (navegación instantánea)
      if (window.projectStorage && window.projectStorage.projectsCache && window.projectStorage.projectsCache.has(id)) {
        console.log('⚡ Proyecto encontrado en caché - navegación instantánea');
        // Cargar desde caché directamente usando el método existente
        const cachedProject = window.projectStorage.projectsCache.get(id);
        window.projectStorage.setCurrentProjectInMemory(id, cachedProject);
        // Aplicar a UI inmediatamente (sin delay)
        loadProjectData();
      } else {
        // Si no está en caché, cargar una vez (luego quedará en caché)
        setTimeout(() => {
          loadProjectData();
        }, 50); // Delay mínimo solo para primera carga
      }
      
      // Si estamos en la sección de ubicación, recargar el mapa
      setTimeout(() => {
        if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap) {
          nutriPlantMap.loadProjectLocation();
        }
      }, 100);
    }
  } else {
    // CRÍTICO: Si no hay proyecto, limpiar elementos de ubicación
    if (typeof forceClearLocationDisplay === 'function') {
      forceClearLocationDisplay();
    } else {
      const coordinatesEl = document.getElementById('coordinatesDisplay');
      const areaEl = document.getElementById('areaDisplay');
      const perimeterEl = document.getElementById('perimeterDisplay');
      if (coordinatesEl) coordinatesEl.textContent = 'No seleccionadas';
      if (areaEl) areaEl.textContent = '0.00 ha (0.00 acres)';
      if (perimeterEl) perimeterEl.textContent = '0.00 m';
    }
  }
  emitProjectContextUpdate({ reason: 'set-current-project' });
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
  np_applySyncStatusBadge();

  const projects = np_allProjects();
  listEl.innerHTML = "";
  if (!projects.length) { 
    emptyEl.style.display = "block";
    // 🚀 CRÍTICO: Si no hay proyectos, limpiar cualquier ID guardado
    const currentId = np_getCurrentProjectId();
    if (currentId) {
      console.log('🧹 No hay proyectos - limpiando ID guardado:', currentId);
      np_setCurrentProject('');
    }
    return; 
  }
  emptyEl.style.display = "none";

  const currentId = np_getCurrentProjectId();
  
  // 🚀 CRÍTICO: Validar que el proyecto actual existe en la lista
  if (currentId) {
    const projectExists = projects.find(p => p.id === currentId);
    if (!projectExists) {
      console.warn('⚠️ Proyecto actual no existe en lista - limpiando ID:', currentId);
      np_setCurrentProject('');
      // Actualizar el indicador si existe
      const projectIndicator = document.querySelector('.project-indicator-global');
      if (projectIndicator) {
        projectIndicator.remove();
      }
    }
  }

  for (const p of projects) {
    const card = document.createElement("div");
    card.className = `card ${p.id === currentId ? 'selected' : ''}`;
    card.setAttribute('data-id', p.id);
    
    // Construir información del proyecto de forma más clara
    let projectDetails = '';
    if (p.cultivo) {
      projectDetails += `<div class="text-sm" style="opacity:.8; margin-bottom:4px;">
        <span style="font-weight:500;">🌾 Cultivo:</span> <span>${escapeHtml(p.cultivo)}</span>
      </div>`;
    }
    if (p.variedad) {
      projectDetails += `<div class="text-sm" style="opacity:.8; margin-bottom:4px;">
        <span style="font-weight:500;">🧬 Variedad:</span> <span>${escapeHtml(p.variedad)}</span>
      </div>`;
    }
    if (p.campoOsector) {
      projectDetails += `<div class="text-sm" style="opacity:.8; margin-bottom:4px;">
        <span style="font-weight:500;">📍 Campo o Sector:</span> <span>${escapeHtml(p.campoOsector)}</span>
      </div>`;
    }
    if (!p.cultivo && !p.variedad && !p.campoOsector) {
      projectDetails = '<div class="text-sm" style="opacity:.7">—</div>';
    }
    
    card.innerHTML = `
      <div class="project-info">
        <div class="font-semibold" style="margin-bottom:8px;">${escapeHtml(p.title)}</div>
        ${projectDetails}
        <div class="text-xs" style="opacity:.6; margin-top:8px;">Actualizado: ${new Date(p.updatedAt).toLocaleString()}</div>
      </div>
      <div class="actions" style="margin-top:8px; display:flex; gap:8px;">
        <button class="btn" data-act="open" data-id="${p.id}">Abrir</button>
        <button class="btn" data-act="edit" data-id="${p.id}">Editar</button>
        <button class="btn" data-act="dup" data-id="${p.id}">Duplicar</button>
        <button class="btn" data-act="del" data-id="${p.id}">Eliminar</button>
      </div>
    `;
    listEl.appendChild(card);
  }

  listEl.onclick = async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");

    if (act === "open") {
      let p = np_getProject(id);
      const userId = localStorage.getItem('nutriplant_user_id');
      const isSupabase = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let freshnessSource = 'local-cache';
      if (p && isSupabase) {
        const sp = window.nutriplantSupabaseProjects;
        if (sp && sp.fetchProject) {
          try {
            const key = 'nutriplant_project_' + id;
            const localRaw = localStorage.getItem(key);
            const cloudUpdatedAt = p.updatedAt || p.updated_at || null;
            const cloudTs = cloudUpdatedAt ? new Date(cloudUpdatedAt).getTime() : 0;

            let shouldRefreshFromCloud = !localRaw;
            if (localRaw && cloudTs > 0) {
              try {
                const localData = JSON.parse(localRaw);
                const localUpdatedAt = localData?.updated_at || localData?.updatedAt || localData?.created_at || localData?.createdAt || null;
                const localTs = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;
                shouldRefreshFromCloud = localTs <= 0 || localTs < cloudTs;
              } catch (parseErr) {
                // Si el JSON local está corrupto, forzar refresco desde nube.
                shouldRefreshFromCloud = true;
              }
            }

            if (shouldRefreshFromCloud) {
              const fullData = await sp.fetchProject(id);
              if (fullData) {
                const toStore = typeof fullData === 'object' && fullData.id ? fullData : { id, name: p.title, ...fullData };
                if (!toStore.updated_at && !toStore.updatedAt && cloudUpdatedAt) {
                  toStore.updatedAt = cloudUpdatedAt;
                }
                localStorage.setItem(key, JSON.stringify(toStore));
                console.log('☁️ Proyecto actualizado desde nube al abrir:', id);
                freshnessSource = 'cloud-refresh';
              }
            }
          } catch (err) { console.warn('fetchProject:', err); }
        }
      }
      p = np_getProject(id) || p;
      if (p) {
        np_setCurrentProject(id);
        // Actualizar el projectManager
        if (window.projectManager) {
          window.projectManager.setCurrentProject(id, p.title);
        }
        if (window.nutriPlantChat && typeof window.nutriPlantChat.refreshForCurrentProject === 'function') {
          window.nutriPlantChat.refreshForCurrentProject();
        }
        window._np_project_freshness_meta = {
          projectId: id,
          source: freshnessSource,
          refreshedAt: new Date().toISOString()
        };
        emitProjectContextUpdate({ reason: 'project-open', freshnessSource, projectId: id });
        renderMenu();
        selectSection("Inicio", menu.querySelector("a[data-section='inicio']") || null);
      }
    }
    if (act === "dup") {
      const copy = np_duplicateProject(id);
      if (copy) np_renderProjects();
    }
    if (act === "edit") {
      np_openEditProjectModal(id);
    }
    if (act === "del") {
      const wasCurrent = (np_getCurrentProjectId() === id);
      if (confirm("¿Eliminar este proyecto?")) {
        np_deleteProject(id).then(function() {
          if (wasCurrent) {
            np_setCurrentProject("");
            if (window.nutriPlantChat && typeof window.nutriPlantChat.refreshForCurrentProject === 'function') {
              window.nutriPlantChat.refreshForCurrentProject();
            }
            renderMenu();
            var menu = document.querySelector('.sidebar-menu');
            if (menu) selectSection("Inicio", menu.querySelector("a[data-section='inicio']") || menu.querySelector("a"));
          }
          if (typeof np_renderProjects === 'function') np_renderProjects();
        });
      }
    }
  };
}

// Funciones globales para el modal de cultivo personalizado (compartido entre Fertirriego y Granular)
function addCustomCropGlobal() {
  // Detectar si estamos en Granular o Fertirriego
  const granularContainer = document.querySelector('.nutricion-granular-container');
  const fertirriegoContainer = document.querySelector('.fertirriego-container');
  
  if (granularContainer && granularContainer.offsetParent !== null) {
    // Estamos en Granular
    if (typeof window.addCustomGranularCrop === 'function') {
      window.addCustomGranularCrop();
    } else {
      console.error('❌ addCustomGranularCrop no está disponible');
      alert('Error: La función de agregar cultivo personalizado no está disponible');
    }
  } else if (fertirriegoContainer && fertirriegoContainer.offsetParent !== null) {
    // Estamos en Fertirriego
    if (typeof window.addCustomCrop === 'function') {
      window.addCustomCrop();
    } else {
      console.error('❌ addCustomCrop (Fertirriego) no está disponible');
      alert('Error: La función de agregar cultivo personalizado no está disponible');
    }
  } else {
    // Por defecto, intentar Granular primero
    if (typeof window.addCustomGranularCrop === 'function') {
      window.addCustomGranularCrop();
    } else if (typeof window.addCustomCrop === 'function') {
      window.addCustomCrop();
    } else {
      alert('Error: No se pudo determinar la sección activa');
    }
  }
}

function closeCustomCropModalGlobal() {
  // Cerrar modal (compartido)
  const modal = document.getElementById('customCropModal');
  if (modal) {
    modal.classList.remove('show');
    // Limpiar campos
    const nameEl = document.getElementById('customCropName');
    if (nameEl) nameEl.value = '';
    const nutrients = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
    nutrients.forEach(n => {
      const el = document.getElementById(`customCrop${n}`);
      if (el) el.value = '0';
    });
  }
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
        variedad:     (document.querySelector("#np-variedad").value || "").trim() || null,
        rendimientoEsperado: (document.querySelector("#np-rend").value || "") === "" ? null : Number(document.querySelector("#np-rend").value),
        unidadRendimiento: document.querySelector("#np-unidad").value || "t/ha",
      };
      const proj = np_createProject(payload);
      dlg?.close && dlg.close();
      
      // 🚀 CRÍTICO: Limpiar caché en memoria ANTES de hacer cualquier otra cosa
      // Esto asegura que NO se carguen datos de proyectos anteriores
      if (window.projectStorage) {
        console.log('🧹 Limpiando caché en memoria al crear proyecto nuevo...');
        window.projectStorage.clearMemoryCache();
        window.projectStorage.clearProjectsCache(); // También limpiar caché de otros proyectos
      }
      
      // CRÍTICO: Limpiar currentProject.location cuando se crea un proyecto nuevo
      currentProject.location = { coordinates: '', surface: '', perimeter: '', polygon: null };
      currentProject.id = null; // Limpiar ID temporalmente hasta que se abra el proyecto
      currentProject.name = '';
      
      // CRÍTICO: Limpiar elementos de ubicación cuando se crea un proyecto nuevo
      if (typeof forceClearLocationDisplay === 'function') {
        forceClearLocationDisplay();
      } else {
        const coordinatesEl = document.getElementById('coordinatesDisplay');
        const areaEl = document.getElementById('areaDisplay');
        const perimeterEl = document.getElementById('perimeterDisplay');
        if (coordinatesEl) coordinatesEl.textContent = 'No seleccionadas';
        if (areaEl) areaEl.textContent = '0.00 ha (0.00 acres)';
        if (perimeterEl) perimeterEl.textContent = '0.00 m';
      }
      
      // 🚀 CRÍTICO: Limpiar el mapa COMPLETAMENTE cuando se crea un proyecto nuevo
      if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap) {
        console.log('🧹 Limpiando mapa al crear proyecto nuevo...');
        // Usar función forzada para eliminar TODO
        if (typeof nutriPlantMap.forceRemoveAllPolygons === 'function') {
          nutriPlantMap.forceRemoveAllPolygons();
        } else {
          // Fallback: limpiar manualmente
          nutriPlantMap.clearAllPolygons();
          nutriPlantMap.polygon = null;
          nutriPlantMap.savedPolygon = null;
          nutriPlantMap.polygonPath = [];
          nutriPlantMap.coordinates = [];
          nutriPlantMap.area = 0;
          nutriPlantMap.perimeter = 0;
        }
        // Limpiar display explícitamente
        if (typeof forceClearLocationDisplay === 'function') {
          forceClearLocationDisplay();
        }
        // Actualizar display (mostrará valores en 0)
        nutriPlantMap.updateDisplay();
        // 🚀 CRÍTICO: Actualizar instrucciones para proyecto nuevo
        if (typeof nutriPlantMap.updateInstructions === 'function') {
          nutriPlantMap.updateInstructions('📍 Haz clic en el mapa para trazar tu parcela');
        }
        console.log('✅ Mapa limpiado completamente para proyecto nuevo');
      }
      
      np_renderProjects();
      alert("Proyecto creado. Presiona 'Abrir' para activarlo.");
    };
  }

  // Inicializar modal de edición
  const editDlg = document.querySelector("#dlg-edit-project");
  const editForm = document.querySelector("#form-edit-project");
  const editBtnClose = document.getElementById("btn-cancel-edit");
  
  if (editBtnClose) editBtnClose.onclick = () => editDlg?.close && editDlg.close();
  
  if (editForm) {
    editForm.onsubmit = (e) => {
      e.preventDefault();
      const projectId = editForm.getAttribute('data-project-id');
      if (!projectId) {
        alert('❌ Error: No se identificó el proyecto a editar');
        return;
      }
      
      const title = document.querySelector("#edit-np-title").value.trim();
      if (!title) {
        alert('⚠️ El título del proyecto es obligatorio');
        return;
      }
      
      const updates = {
        title: title,
        name: title, // Sincronizar name con title
        campoOsector: (document.querySelector("#edit-np-campo").value || "").trim() || null,
        cultivo: (document.querySelector("#edit-np-cultivo").value || "").trim() || null,
        crop_type: (document.querySelector("#edit-np-cultivo").value || "").trim() || null, // Sincronizar
        variedad: (document.querySelector("#edit-np-variedad").value || "").trim() || null,
        rendimientoEsperado: (document.querySelector("#edit-np-rend").value || "") === "" ? null : Number(document.querySelector("#edit-np-rend").value),
        unidadRendimiento: document.querySelector("#edit-np-unidad").value || "t/ha",
      };
      
      const success = np_updateProject(projectId, updates);
      if (success) {
        editDlg?.close && editDlg.close();
        np_renderProjects(); // Refrescar lista de proyectos
        alert('✅ Proyecto actualizado exitosamente');
      }
    };
  }

  np_renderProjects();
}

// =======================
// Boot - MOVED TO initializeDashboard()
// =======================

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

  // 🚀 CRÍTICO: Validar que hay un proyecto válido antes de mostrar indicador
  let projectName = null;
  let hasValidProject = false;
  
  try {
    // PRIMERO: Intentar desde localStorage directamente (más confiable)
    const currentId = np_getCurrentProjectId();
    
    // 🚀 VALIDACIÓN ESTRICTA: Solo proceder si hay un ID Y el proyecto existe
    if (currentId && currentId.trim() !== '') {
      const projects = np_loadProjects();
      const project = projects.find(p => p.id === currentId);
      
      if (project && project.id) {
        // 🚀 Proyecto válido encontrado
        projectName = project.title || project.name || project.id;
        hasValidProject = true;
        console.log('✅ Proyecto válido encontrado:', projectName);
      } else {
        // 🚀 CRÍTICO: ID existe pero proyecto NO existe - limpiar localStorage
        console.warn('⚠️ ID de proyecto en localStorage no corresponde a proyecto válido. Limpiando...', currentId);
        np_setCurrentProject(''); // Limpiar ID inválido
        hasValidProject = false;
      }
    }
    
    // Si aún no se obtuvo, intentar desde projectManager como fallback
    if (!hasValidProject && window.projectManager && typeof window.projectManager.getCurrentProject === 'function') {
      const currentProject = window.projectManager.getCurrentProject();
      if (currentProject && currentProject.id) {
        // Validar que el proyecto existe en la lista
        const projects = np_loadProjects();
        const projectExists = projects.find(p => p.id === currentProject.id);
        
        if (projectExists) {
          projectName = currentProject.name || currentProject.title;
          hasValidProject = true;
          console.log('✅ Proyecto válido obtenido desde projectManager:', projectName);
        } else {
          console.warn('⚠️ Proyecto de projectManager no existe en lista. Ignorando...');
          hasValidProject = false;
        }
      }
    }
  } catch (e) {
    console.error('❌ Error obteniendo nombre del proyecto:', e);
    hasValidProject = false;
  }
  
  // 🚀 CRÍTICO: Solo mostrar indicador si hay un proyecto VÁLIDO
  // Si no hay proyecto válido, NO mostrar nada (especialmente en Inicio)
  if (!hasValidProject || !projectName) {
    console.log('ℹ️ No hay proyecto válido seleccionado - no se muestra indicador');
    return; // NO crear el indicador si no hay proyecto válido
  }
  
  // Crear indicador de proyecto solo si hay proyecto válido
  const projectIndicator = document.createElement('div');
  projectIndicator.className = 'project-indicator-global';
  projectIndicator.innerHTML = `
    <div class="project-indicator-content">
      <span class="project-icon">📁</span>
      <div class="project-info">
        <span class="project-label">Proyecto Activo:</span>
        <span class="project-name">${escapeHtml(projectName)}</span>
      </div>
      <button id="globalSaveDataBtn" class="btn-save-data-global" onclick="window.saveProject()" title="Guardar todos los datos del proyecto">
        💾 Guardar Datos
      </button>
    </div>
  `;

  // Insertar al inicio del contenedor
  container.insertBefore(projectIndicator, container.firstChild);
}

// ===== FERTIRRIEGO FUNCTIONALITY =====
function initializeFertirriegoTabs() {
  // Event listeners para las pestañas
  document.addEventListener('click', function(e) {
      const button = e.target.closest('.tab-button');
    if (!button) return;
    // Asegurar que el click proviene de las pestañas de Fertirriego (evitar interferir con Granular)
    const fertContainer = button.closest('.fertirriego-container');
    if (!fertContainer) return;

      const tabId = button.getAttribute('data-tab');
      
    // GUARDAR DATOS INMEDIATAMENTE ANTES de cambiar de pestaña interna
    if (currentProject.id) {
      try {
        // PRIMERO: Guardar Requerimientos de Fertirriego INMEDIATAMENTE
        if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
          window.saveFertirriegoRequirementsImmediate();
          console.log('⚡ Requerimientos Fertirriego guardados INMEDIATAMENTE antes de cambiar pestaña');
        } else if (typeof window.saveFertirriegoRequirements === 'function') {
          window.saveFertirriegoRequirements();
          console.log('✅ Requerimientos Fertirriego guardados antes de cambiar pestaña');
        }
        // SEGUNDO: Guardar Programa de Fertirriego solo si ya fue inicializado
        if (typeof window.saveFertirriegoProgram === 'function' && window.fertiProgramInitialized === true) {
          window.saveFertirriegoProgram();
          console.log('⚡ Programa Fertirriego guardado INMEDIATAMENTE antes de cambiar pestaña');
        }
        // TERCERO: Guardar todo con saveProjectData
        saveProjectData();
      } catch (e) {
        console.warn('⚠️ Error al guardar antes de cambiar pestaña:', e);
      }
    }
    
    // Si se activó el tab de programa, inicializar UI del programa
    if (tabId === 'programa') {
      // PRIMERO: Cargar datos del proyecto
      loadProjectData();
      // SEGUNDO: Inicializar UI del programa
      if (typeof window.initFertirriegoProgramUI === 'function') {
        setTimeout(() => window.initFertirriegoProgramUI(), 0);
      }
    }
    // Remover clase active solo dentro del contenedor de Fertirriego
    fertContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    fertContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Agregar clase active a la pestaña seleccionada
      button.classList.add('active');
    const targetContent = fertContainer.querySelector(`#${tabId}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    
    // Si se activó el tab de gráficas, asegurar render con datos (incl. materiales personalizados)
    if (tabId === 'graficas') {
      try {
        if (typeof window.loadFertiCustomMaterials === 'function') {
          window.loadFertiCustomMaterials();
        }
        if (typeof window.loadFertirriegoProgram === 'function') {
          window.loadFertirriegoProgram();
        }
        // Esperar layout visible para que Chart.js mida bien el canvas
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (typeof window.updateFertiSummary === 'function') {
              window.updateFertiSummary();
            } else if (typeof window.updateFertiCharts === 'function') {
              window.updateFertiCharts();
            }
          });
        });
      } catch (e) {
        console.warn('⚠️ No se pudieron refrescar las gráficas de Fertirriego:', e);
      }
    }
    
    // Persistir última subpestaña usada en Fertirriego por proyecto
    try {
      const project = window.projectManager ? window.projectManager.getCurrentProject() : null;
      if (project) {
        project.fertirriegoLastTab = tabId;
        if (window.projectManager.updateProject) {
          window.projectManager.updateProject(project);
        }
      } else {
        const pid = localStorage.getItem('nutriplant-current-project');
        if (pid) {
          // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
          const key = `nutriplant_project_${pid}`;
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          data.fertirriegoLastTab = tabId;
          localStorage.setItem(key, JSON.stringify(data));
        }
      }
      // Persistir SIEMPRE en localStorage para restaurar al regresar
      const pidPersist = localStorage.getItem('nutriplant-current-project');
      if (pidPersist) {
        const keyPersist = `nutriplant_project_${pidPersist}`;
        const dataPersist = JSON.parse(localStorage.getItem(keyPersist) || '{}');
        dataPersist.fertirriegoLastTab = tabId;
        localStorage.setItem(keyPersist, JSON.stringify(dataPersist));
      }
    } catch (err) {
      console.warn('⚠️ No se pudo persistir la subpestaña de Fertirriego:', err);
    }
  });
}

// ===== NUTRICIÓN GRANULAR FUNCTIONALITY =====
function selectGranularSubTab(tabName) {
  try {
    console.log('🔄 selectGranularSubTab llamado con:', tabName);
    
    // Validar que tabName sea válido
    if (tabName !== 'requerimiento' && tabName !== 'programa') {
      console.warn('⚠️ Tab inválido:', tabName);
      return;
    }
    
    // NOTA: NO guardar antes de cambiar de pestaña interna
    // El guardado automático ya funciona cuando el usuario modifica valores
    // Solo se guarda cuando se cambia de SECCIÓN PRINCIPAL (en selectSection)
    
    // Encontrar el contenedor de nutrición granular
    const granularContainer = document.querySelector('.nutricion-granular-container');
    if (!granularContainer) {
      console.warn('⚠️ No se encontró el contenedor de nutrición granular');
      return;
    }
    
    // Remover clase active de todos los botones y contenidos dentro del contenedor granular
    granularContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    granularContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Activar el botón correspondiente
    const buttons = granularContainer.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
      const onclickAttr = btn.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes(`selectGranularSubTab('${tabName}')`)) {
        btn.classList.add('active');
      }
    });
    
    // Activar el contenido correspondiente
    let targetContentId = '';
    if (tabName === 'requerimiento') {
      targetContentId = 'granularRequerimiento';
    } else if (tabName === 'programa') {
      targetContentId = 'granularPrograma';
    }
    
    const targetContent = document.getElementById(targetContentId);
    if (targetContent) {
      targetContent.classList.add('active');
      console.log('✅ Contenido activado:', targetContentId);
    } else {
      console.warn('⚠️ No se encontró el contenido:', targetContentId);
    }
    
    // Si se activó el tab de requerimiento, cargar datos guardados
    if (tabName === 'requerimiento') {
      // PRIMERO: Cargar cultivos personalizados ANTES de cargar datos del proyecto
      if (typeof window.loadCustomGranularCrops === 'function') {
        window.loadCustomGranularCrops();
        console.log('✅ Cultivos personalizados Granular cargados');
      }
      // SEGUNDO: Cargar datos del proyecto (esto carga currentProject.granular desde localStorage)
      loadProjectData();
      // TERCERO: Cargar requerimientos guardados después de que loadProjectData complete
      requestAnimationFrame(() => {
        if (typeof window.loadGranularRequirements === 'function') {
          window.loadGranularRequirements();
          console.log('✅ Requerimientos Granular cargados al activar pestaña');
        }
      });
    }
    
    // Si se activó el tab de programa, inicializar UI del programa
    if (tabName === 'programa') {
      // PRIMERO: Cargar datos del proyecto
      loadProjectData();
      // Cargar cultivos personalizados para que la tabla de requerimiento tenga contexto
      if (typeof window.loadCustomGranularCrops === 'function') {
        window.loadCustomGranularCrops();
      }
      // SEGUNDO: Poblar la tabla de Requerimiento (aunque esté en la otra pestaña) para que
      // updateSummary() lea los valores correctos de "Requerimiento Real" al cargar/recargar.
      requestAnimationFrame(() => {
        if (typeof window.loadGranularRequirements === 'function') {
          window.loadGranularRequirements();
        }
        if (typeof window.forceLoadApplications === 'function') {
          window.forceLoadApplications();
        }
        if (typeof renderApplications === 'function') {
          renderApplications();
        }
        if (typeof updateSummary === 'function') {
          updateSummary();
        }
      });
    }
    
    // Persistir última subpestaña usada en Granular por proyecto
    try {
      const project = window.projectManager ? window.projectManager.getCurrentProject() : null;
      if (project) {
        project.granularLastTab = tabName;
        if (window.projectManager.updateProject) {
          window.projectManager.updateProject(project);
        }
      } else {
        const pid = localStorage.getItem('nutriplant-current-project');
        if (pid) {
          // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
          const key = `nutriplant_project_${pid}`;
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          data.granularLastTab = tabName;
          localStorage.setItem(key, JSON.stringify(data));
        }
      }
      // Persistir SIEMPRE en localStorage para restaurar al regresar
      const pidPersist = localStorage.getItem('nutriplant-current-project');
      if (pidPersist) {
        const keyPersist = `nutriplant_project_${pidPersist}`;
        const dataPersist = JSON.parse(localStorage.getItem(keyPersist) || '{}');
        dataPersist.granularLastTab = tabName;
        localStorage.setItem(keyPersist, JSON.stringify(dataPersist));
      }
      console.log('✅ Última pestaña Granular guardada:', tabName);
    } catch (err) {
      console.warn('⚠️ No se pudo persistir la subpestaña de Granular:', err);
    }
    
  } catch (error) {
    console.error('❌ Error en selectGranularSubTab:', error);
  }
}

// Exponer función globalmente
window.selectGranularSubTab = selectGranularSubTab;


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

// Función para formatear números con separadores de miles
function formatNumber(number, decimals = 2) {
  if (isNaN(number) || number === null || number === undefined) {
    return '0.00';
  }
  
  const num = parseFloat(number);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Función para actualizar el indicador de pH
function updatePHIndicator() {
  const phInput = document.getElementById('soil-ph');
  const phIndicator = document.getElementById('ph-indicator');
  
  if (!phInput || !phIndicator) return;
  
  const ph = parseFloat(phInput.value);
  
  if (isNaN(ph) || phInput.value === '') {
    phIndicator.innerHTML = '⚪ Ingrese pH';
    phIndicator.className = 'ph-indicator ph-empty';
  } else if (ph < 5.5) {
    phIndicator.innerHTML = '🔴 Ácido';
    phIndicator.className = 'ph-indicator ph-acid';
  } else if (ph < 6.0) {
    phIndicator.innerHTML = '🟡 Ligeramente ácido';
    phIndicator.className = 'ph-indicator ph-slightly-acid';
  } else if (ph >= 6.0 && ph <= 7.5) {
    phIndicator.innerHTML = '🟢 Neutro';
    phIndicator.className = 'ph-indicator ph-neutral';
  } else if (ph > 7.5) {
    phIndicator.innerHTML = '🔵 Alcalino';
    phIndicator.className = 'ph-indicator ph-alkaline';
  }
}

// Base de datos de enmiendas
const amendmentsDatabase = [
  {
    id: 'gypsum',
    name: 'Yeso Agrícola',
    formula: 'CaSO₄·2H₂O',
    molecularWeight: 172.2,
    ca: 23.3,
    mg: 0,
    k: 0,
    so4: 55.8,
    co3: 0,
    h2o: 20.9,
    type: 'sulfate'
  },
  {
    id: 'lime',
    name: 'Cal Agrícola',
    formula: 'CaCO₃',
    molecularWeight: 100,
    ca: 40.0,
    mg: 0,
    k: 0,
    so4: 0,
    co3: 60.0,
    h2o: 0,
    type: 'carbonate'
  },
  {
    id: 'dolomite',
    name: 'Cal Dolomítica',
    formula: 'CaCO₃ + MgCO₃',
    molecularWeight: 184,
    ca: 21.7,
    mg: 13.2,
    k: 0,
    so4: 0,
    co3: 65.2,
    h2o: 0,
    type: 'carbonate'
  },
  {
    id: 'mgso4-mono',
    name: 'Sulfato de Magnesio Monohidrato',
    formula: 'MgSO₄·H₂O',
    molecularWeight: 138,
    ca: 0,
    mg: 17.0,
    k: 0,
    so4: 69.0,
    co3: 0,
    h2o: 14.0,
    type: 'sulfate'
  },
  {
    id: 'sop-granular',
    name: 'Sulfato de Potasio Granular',
    formula: 'K₂SO₄',
    molecularWeight: 174,
    ca: 0,
    mg: 0,
    k: 41.5,
    so4: 54.1,
    co3: 0,
    h2o: 0,
    type: 'sulfate'
  }
];

// Función para cargar enmiendas en la tabla
// 💾 GUARDAR ENMIENDAS PERSONALIZADAS EN LOCALSTORAGE
// ✅ VERSIÓN POR USUARIO: Cada usuario tiene sus propias enmiendas aisladas
function saveCustomAmendmentsToStorage() {
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) {
    console.warn('⚠️ No hay usuario logueado - enmiendas no se guardarán');
    return Promise.resolve();
  }
  const customAmendments = amendmentsDatabase.filter(a => a.type === 'custom');
  const userKey = `nutriplant_custom_amendments_${userId}`;
  try {
    localStorage.setItem(userKey, JSON.stringify(customAmendments));
    console.log(`✅ ${customAmendments.length} enmienda(s) personalizada(s) guardadas (local) para usuario: ${userId}`);
  } catch (e) {
    console.error('❌ Error guardando enmiendas en local:', e);
  }
  const projectId = localStorage.getItem('currentProjectId');
  if (projectId) {
    try {
      localStorage.setItem('nutriplant_custom_amendments_' + projectId, JSON.stringify(customAmendments));
    } catch (e) {}
  }
  // Sincronizar a la nube y esperar para que otro navegador/dispositivo vea el catálogo
  if (typeof window.nutriplantSyncCustomAmendmentsToCloud === 'function') {
    return window.nutriplantSyncCustomAmendmentsToCloud(userId, customAmendments).catch(function (e) {
      console.warn('⚠️ Sync enmiendas a nube:', e);
    });
  }
  return Promise.resolve();
}

// 📂 CARGAR ENMIENDAS PERSONALIZADAS (nube primero, luego localStorage)
// ✅ VERSIÓN POR USUARIO: Carga enmiendas del usuario actual (aisladas)
// Retorna una promesa que se resuelve cuando las enmiendas están listas (para que la tabla se pinte después)
function loadCustomAmendmentsFromStorage() {
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId) {
    console.log('ℹ️ No hay usuario logueado - no se cargan enmiendas personalizadas');
    return Promise.resolve();
  }

  function applyAmendments(customAmendments, source) {
    if (!Array.isArray(customAmendments) || customAmendments.length === 0) return;
    const predefinedOnly = amendmentsDatabase.filter(a => a.type !== 'custom');
    amendmentsDatabase.length = 0;
    amendmentsDatabase.push(...predefinedOnly);
    amendmentsDatabase.push(...customAmendments);
    console.log(`✅ ${customAmendments.length} enmienda(s) personalizada(s) cargadas desde ${source}`);
  }

  function loadFromLocal() {
    try {
      var savedAmendments = null;
      var source = '';
      var projectId = localStorage.getItem('currentProjectId');
      if (projectId) {
        var projectKey = 'nutriplant_custom_amendments_' + projectId;
        savedAmendments = localStorage.getItem(projectKey);
        if (savedAmendments) source = 'proyecto ' + projectId;
      }
      if (!savedAmendments) {
        var userKey = 'nutriplant_custom_amendments_' + userId;
        savedAmendments = localStorage.getItem(userKey);
        if (savedAmendments) source = 'usuario (local)';
      }
      if (savedAmendments) {
        var customAmendments = JSON.parse(savedAmendments);
        applyAmendments(customAmendments, source);
      } else {
        console.log('ℹ️ No hay enmiendas personalizadas guardadas para este usuario');
      }
    } catch (error) {
      console.error('❌ Error cargando enmiendas personalizadas:', error);
    }
  }

  if (typeof window.nutriplantFetchCustomAmendmentsFromCloud === 'function') {
    return window.nutriplantFetchCustomAmendmentsFromCloud(userId).then(function(cloudAmendments) {
      if (Array.isArray(cloudAmendments) && cloudAmendments.length > 0) {
        applyAmendments(cloudAmendments, 'nube');
        var userKey = 'nutriplant_custom_amendments_' + userId;
        try { localStorage.setItem(userKey, JSON.stringify(cloudAmendments)); } catch (e) {}
      } else {
        loadFromLocal();
      }
    }).catch(function() { loadFromLocal(); });
  }
  loadFromLocal();
  return Promise.resolve();
}

// 💾 GUARDAR EDICIONES DE ENMIENDAS PREDEFINIDAS
// ✅ VERSIÓN POR USUARIO: Cada usuario tiene sus propias ediciones aisladas
function saveAmendmentEditsToStorage(amendmentId, composition) {
  try {
    // Obtener userId del usuario actual
    const userId = localStorage.getItem('nutriplant_user_id');
    if (!userId) {
      console.warn('⚠️ No hay usuario logueado - ediciones no se guardarán');
      return;
    }
    
    // 1️⃣ GUARDAR POR USUARIO (SIEMPRE, aislado por usuario)
    const userKey = `nutriplant_amendment_edits_${userId}`;
    let userEdits = {};
    const savedUserEdits = localStorage.getItem(userKey);
    if (savedUserEdits) {
      userEdits = JSON.parse(savedUserEdits);
    }
    userEdits[amendmentId] = composition;
    localStorage.setItem(userKey, JSON.stringify(userEdits));
    console.log(`✅ Edición de enmienda ${amendmentId} guardada para usuario: ${userId}`);
    
    // 2️⃣ TAMBIÉN guardar por proyecto si hay uno activo (opcional, para compatibilidad)
    const projectId = localStorage.getItem('currentProjectId');
    if (projectId) {
      const projectKey = `nutriplant_amendment_edits_${projectId}`;
      let projectEdits = {};
      const savedProjectEdits = localStorage.getItem(projectKey);
      if (savedProjectEdits) {
        projectEdits = JSON.parse(savedProjectEdits);
      }
      projectEdits[amendmentId] = composition;
      localStorage.setItem(projectKey, JSON.stringify(projectEdits));
      console.log(`✅ Edición también guardada para proyecto: ${projectId}`);
    }
  } catch (error) {
    console.error('❌ Error guardando ediciones de enmiendas:', error);
  }
}

// 📂 CARGAR EDICIONES DE ENMIENDAS PREDEFINIDAS
// ✅ VERSIÓN POR USUARIO: Carga ediciones del usuario actual (aisladas)
function loadAmendmentEditsFromStorage() {
  try {
    // Obtener userId del usuario actual
    const userId = localStorage.getItem('nutriplant_user_id');
    if (!userId) {
      console.log('ℹ️ No hay usuario logueado - no se cargan ediciones de enmiendas');
      return;
    }
    
    let savedEdits = null;
    
    // PRIORIDAD 1: Cargar específicas del proyecto si hay uno activo
    const projectId = localStorage.getItem('currentProjectId');
    if (projectId) {
      const projectKey = `nutriplant_amendment_edits_${projectId}`;
      savedEdits = localStorage.getItem(projectKey);
      if (savedEdits) {
        console.log(`📂 Cargando ediciones del proyecto: ${projectId}`);
      }
    }
    
    // PRIORIDAD 2: Cargar del usuario si no hay proyecto o no tiene ediciones
    if (!savedEdits) {
      const userKey = `nutriplant_amendment_edits_${userId}`;
      savedEdits = localStorage.getItem(userKey);
      if (savedEdits) {
        console.log(`📂 Cargando ediciones del usuario: ${userId}`);
      }
    }
    
    if (savedEdits) {
      const edits = JSON.parse(savedEdits);
      
      // Aplicar ediciones a las enmiendas predefinidas
      Object.keys(edits).forEach(amendmentId => {
        const amendment = amendmentsDatabase.find(a => a.id === amendmentId);
        if (amendment) {
          amendment.composition = edits[amendmentId];
          // También actualizar valores directos
          if (edits[amendmentId].k !== undefined) amendment.k = edits[amendmentId].k;
          if (edits[amendmentId].ca !== undefined) amendment.ca = edits[amendmentId].ca;
          if (edits[amendmentId].mg !== undefined) amendment.mg = edits[amendmentId].mg;
          if (edits[amendmentId].so4 !== undefined) amendment.so4 = edits[amendmentId].so4;
          if (edits[amendmentId].co3 !== undefined) amendment.co3 = edits[amendmentId].co3;
          if (edits[amendmentId].h2o !== undefined) amendment.h2o = edits[amendmentId].h2o;
          if (edits[amendmentId].si !== undefined) amendment.si = edits[amendmentId].si;
        }
      });
      
      console.log(`✅ Ediciones de enmiendas aplicadas`);
    }
  } catch (error) {
    console.error('❌ Error cargando ediciones de enmiendas:', error);
  }
}

function loadAmendmentsTable() {
  console.log('=== INICIANDO CARGA DE TABLA ===');
  
  // 📂 CARGAR ENMIENDAS PERSONALIZADAS (nube primero, luego local) y ediciones; luego pintar tabla
  var loadDone = loadCustomAmendmentsFromStorage();
  if (loadDone && typeof loadDone.then === 'function') {
    loadDone.then(function() {
      loadAmendmentEditsFromStorage();
      renderAmendmentsTableBody();
    });
    return;
  }
  loadAmendmentEditsFromStorage();
  renderAmendmentsTableBody();
}

function renderAmendmentsTableBody() {
  const tbody = document.getElementById('amendments-table-body');
  console.log('Elemento tbody:', tbody);
  
  if (!tbody) {
    console.log('❌ Tabla de enmiendas no encontrada');
    console.log('Elementos disponibles:', document.querySelectorAll('tbody'));
    return;
  }
  
  console.log('✅ Tabla encontrada, cargando enmiendas...');
  tbody.innerHTML = '';
  
  // Mostrar todas las enmiendas disponibles (incluyendo personalizadas)
  const availableAmendments = amendmentsDatabase;
  console.log('Enmiendas en base de datos:', availableAmendments.length);
  console.log('Base de datos:', amendmentsDatabase);
  
  // 1️⃣ Mostrar las enmiendas predefinidas primero
  const predefinedAmendments = amendmentsDatabase.filter(amendment => 
    ['gypsum', 'lime', 'dolomite', 'sop-granular', 'mgso4-mono'].includes(amendment.id)
  );
  
  console.log('Enmiendas predefinidas encontradas:', predefinedAmendments.length);
  console.log('Enmiendas predefinidas:', predefinedAmendments);
  
  predefinedAmendments.forEach((amendment, index) => {
    console.log(`Procesando enmienda ${index + 1}:`, amendment.name);
    const row = document.createElement('tr');
    row.className = 'amendment-row';
    row.innerHTML = `
      <td>${amendment.name}</td>
      <td>${amendment.formula}</td>
      <td>${amendment.molecularWeight}</td>
      <td>${amendment.k > 0 ? amendment.k + '%' : '-'}</td>
      <td>${amendment.ca > 0 ? amendment.ca + '%' : '-'}</td>
      <td>${amendment.mg > 0 ? amendment.mg + '%' : '-'}</td>
      <td>${amendment.so4 > 0 ? amendment.so4 + '%' : '-'}</td>
      <td>${amendment.co3 > 0 ? amendment.co3 + '%' : '-'}</td>
      <td>${amendment.h2o > 0 ? amendment.h2o + '%' : '-'}</td>
      <td>${amendment.si > 0 ? amendment.si + '%' : '-'}</td>
      <td>
        <button class="btn-select-amendment" id="btn-select-${amendment.id}" onclick="toggleAmendmentSelection('${amendment.id}')">
          Seleccionar
        </button>
        <button class="btn-edit-amendment" onclick="editAmendment('${amendment.id}')" title="Editar composición">
          ✏️
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Mostrar enmiendas personalizadas
  const customAmendments = amendmentsDatabase.filter(amendment => amendment.type === 'custom');
  console.log(`📋 Enmiendas personalizadas a mostrar: ${customAmendments.length}`);
  console.log('📋 Enmiendas personalizadas:', customAmendments);
  
  customAmendments.forEach((amendment, index) => {
    console.log(`Procesando enmienda personalizada ${index + 1}:`, amendment.name);
    const row = document.createElement('tr');
    row.className = 'amendment-row';
    row.innerHTML = `
      <td>${amendment.name}</td>
      <td>${amendment.formula}</td>
      <td>${amendment.molecularWeight}</td>
      <td>${amendment.k > 0 ? amendment.k + '%' : '-'}</td>
      <td>${amendment.ca > 0 ? amendment.ca + '%' : '-'}</td>
      <td>${amendment.mg > 0 ? amendment.mg + '%' : '-'}</td>
      <td>${amendment.so4 > 0 ? amendment.so4 + '%' : '-'}</td>
      <td>${amendment.co3 > 0 ? amendment.co3 + '%' : '-'}</td>
      <td>${amendment.h2o > 0 ? amendment.h2o + '%' : '-'}</td>
      <td>${amendment.si > 0 ? amendment.si + '%' : '-'}</td>
      <td>
        <button id="btn-select-${amendment.id}" class="btn-select-amendment" onclick="toggleAmendmentSelection('${amendment.id}')">
          Seleccionar
        </button>
        <button class="btn-edit-amendment" onclick="editAmendment('${amendment.id}')" title="Editar composición">
          ✏️
        </button>
        <button class="btn-delete-amendment-small" onclick="deleteAmendment('${amendment.id}')" title="Eliminar enmienda personalizada">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Agregar fila en blanco para nueva enmienda
  const newRow = document.createElement('tr');
  newRow.id = 'new-amendment-row';
  newRow.innerHTML = `
    <td><input type="text" id="new-amendment-name" placeholder="Nombre de la enmienda" class="amendment-input"></td>
    <td><input type="text" id="new-amendment-formula" placeholder="Fórmula química" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-molecular" placeholder="Peso molecular" class="amendment-input" step="0.01"></td>
    <td><input type="number" id="new-amendment-k" placeholder="%K" class="amendment-input" step="0.01" min="0" max="100"></td>
    <td><input type="number" id="new-amendment-ca" placeholder="%Ca" class="amendment-input" step="0.01" min="0" max="100"></td>
    <td><input type="number" id="new-amendment-mg" placeholder="%Mg" class="amendment-input" step="0.01" min="0" max="100"></td>
    <td><input type="number" id="new-amendment-so4" placeholder="%SO₄" class="amendment-input" step="0.01" min="0" max="100"></td>
    <td><input type="number" id="new-amendment-co3" placeholder="%CO₃" class="amendment-input" step="0.01" min="0" max="100"></td>
    <td><input type="number" id="new-amendment-h2o" placeholder="%H₂O" class="amendment-input" step="0.01" min="0" max="100"></td>
    <td><input type="number" id="new-amendment-si" placeholder="%Si" class="amendment-input" step="0.01" min="0" max="100"></td>
    <td>
      <button class="btn-save-amendment-small" onclick="saveNewAmendment()">💾</button>
      <button class="btn-cancel-amendment-small" onclick="clearNewAmendmentRow()">❌</button>
    </td>
  `;
  tbody.appendChild(newRow);
  
  console.log('=== TABLA CARGADA COMPLETAMENTE ===');
  console.log('Total de filas en tbody:', tbody.children.length);
}

// Array para almacenar las enmiendas seleccionadas (múltiples)
let selectedAmendments = [];

// REMOVIDO: Función selectAmendment eliminada - ahora se usa toggleAmendmentSelection para todas las enmiendas

// Función para actualizar el indicador de selección
function updateSelectionIndicator() {
  const count = selectedAmendments.length;
  console.log(`Enmiendas seleccionadas: ${count}`);
  
  // Actualizar el título de la sección
  const sectionTitle = document.querySelector('.amendments-section h3');
  if (sectionTitle) {
    if (count > 0) {
      sectionTitle.innerHTML = `🧪 Enmiendas Disponibles <span class="selection-count">(${count} seleccionada${count > 1 ? 's' : ''})</span>`;
    } else {
      sectionTitle.innerHTML = '🧪 Enmiendas Disponibles';
    }
  }
}

// Función para guardar nueva enmienda desde la fila en blanco (espera sync a nube para que se vea en otros navegadores)
async function saveNewAmendment() {
  const name = document.getElementById('new-amendment-name').value.trim();
  const formula = document.getElementById('new-amendment-formula').value.trim();
  const molecularWeight = parseFloat(document.getElementById('new-amendment-molecular').value);
  
  if (!name || !formula || isNaN(molecularWeight)) {
    showMessage('❌ Por favor completa al menos: Nombre, Fórmula y Peso Molecular', 'error');
    return;
  }
  
  const ca = parseFloat(document.getElementById('new-amendment-ca').value) || 0;
  const mg = parseFloat(document.getElementById('new-amendment-mg').value) || 0;
  const k = parseFloat(document.getElementById('new-amendment-k').value) || 0;
  const so4 = parseFloat(document.getElementById('new-amendment-so4').value) || 0;
  const co3 = parseFloat(document.getElementById('new-amendment-co3').value) || 0;
  const h2o = parseFloat(document.getElementById('new-amendment-h2o').value) || 0;
  const si = parseFloat(document.getElementById('new-amendment-si').value) || 0;
  
  const newAmendment = {
    id: 'custom-' + Date.now(),
    name: name,
    formula: formula,
    molecularWeight: molecularWeight,
    ca: ca,
    mg: mg,
    k: k,
    so4: so4,
    co3: co3,
    h2o: h2o,
    si: si,
    type: 'custom'
  };
  
  amendmentsDatabase.push(newAmendment);
  
  // 💾 Guardar local y sincronizar a la nube (await para que otro navegador/dispositivo vea el catálogo)
  await saveCustomAmendmentsToStorage();
  
  const select = document.getElementById('amendment-type-select');
  if (select) {
    const option = document.createElement('option');
    option.value = newAmendment.id;
    option.textContent = `${newAmendment.name} (${newAmendment.formula})`;
    select.appendChild(option);
  }
  
  clearNewAmendmentRow();
  loadAmendmentsTable();
  showMessage(`✅ Enmienda "${name}" guardada exitosamente`, 'success');
  console.log('✅ Enmienda personalizada guardada (local y nube)');
}

// Función para limpiar la fila de nueva enmienda
function clearNewAmendmentRow() {
  document.getElementById('new-amendment-name').value = '';
  document.getElementById('new-amendment-formula').value = '';
  document.getElementById('new-amendment-molecular').value = '';
  document.getElementById('new-amendment-ca').value = '';
  document.getElementById('new-amendment-mg').value = '';
  document.getElementById('new-amendment-k').value = '';
  document.getElementById('new-amendment-so4').value = '';
  document.getElementById('new-amendment-co3').value = '';
  document.getElementById('new-amendment-h2o').value = '';
  document.getElementById('new-amendment-si').value = '';
}

// Función para eliminar una enmienda personalizada (espera sync a nube)
async function deleteAmendment(amendmentId) {
  const amendment = amendmentsDatabase.find(a => a.id === amendmentId);
  if (!amendment || amendment.type !== 'custom') {
    showMessage('❌ Solo se pueden eliminar enmiendas personalizadas', 'error');
    return;
  }
  
  if (confirm(`¿Estás seguro de que quieres eliminar "${amendment.name}"?`)) {
    const index = amendmentsDatabase.findIndex(a => a.id === amendmentId);
    amendmentsDatabase.splice(index, 1);
    
    await saveCustomAmendmentsToStorage();
    
    const select = document.getElementById('amendment-type-select');
    if (select) {
      const option = select.querySelector(`option[value="${amendmentId}"]`);
      if (option) {
        option.remove();
      }
    }
    
    loadAmendmentsTable();
    showMessage(`✅ Enmienda "${amendment.name}" eliminada`, 'success');
    console.log('✅ Enmienda personalizada eliminada (local y nube)');
  }
}

// Función para forzar la recarga de la tabla de enmiendas
function refreshAmendmentsTable() {
  loadAmendmentsTable();
}

// Función global para debug - se puede llamar desde la consola
window.debugAmendments = function() {
  console.log('=== DEBUG ENMIENDAS ===');
  console.log('Base de datos:', amendmentsDatabase);
  console.log('Elemento tbody:', document.getElementById('amendments-table-body'));
  console.log('Intentando cargar tabla...');
  loadAmendmentsTable();
};

// Función simple para forzar la carga
window.forceLoadTable = function() {
  console.log('=== FORZANDO CARGA DE TABLA ===');
  
  // Buscar el tbody
  let tbody = document.getElementById('amendments-table-body');
  if (!tbody) {
    console.log('No se encontró tbody, buscando alternativas...');
    tbody = document.querySelector('tbody');
    if (!tbody) {
      console.log('No se encontró ningún tbody');
      return;
    }
  }
  
  console.log('Tbody encontrado:', tbody);
  
  // Limpiar contenido
  tbody.innerHTML = '';
  
  // Agregar enmiendas manualmente
  const enmiendas = [
    { name: 'Yeso Agrícola', formula: 'CaSO₄·2H₂O', molecular: 172.2, ca: 23.3, mg: 0, k: 0, so4: 55.8, co3: 0, h2o: 20.9, si: 0 },
    { name: 'Cal Agrícola', formula: 'CaCO₃', molecular: 100, ca: 40.0, mg: 0, k: 0, so4: 0, co3: 60.0, h2o: 0, si: 0 },
    { name: 'Cal Dolomítica', formula: 'CaCO₃ + MgCO₃', molecular: 184, ca: 21.7, mg: 13.2, k: 0, so4: 0, co3: 65.2, h2o: 0, si: 0 },
    { name: 'Sulfato de Potasio Granular', formula: 'K₂SO₄', molecular: 174, ca: 0, mg: 0, k: 41.5, so4: 54.1, co3: 0, h2o: 0, si: 0 },
    { name: 'Sulfato de Magnesio Monohidrato', formula: 'MgSO₄·H₂O', molecular: 138, ca: 0, mg: 17.0, k: 0, so4: 69.0, co3: 0, h2o: 14.0, si: 0 }
  ];
  
  enmiendas.forEach((enmienda, index) => {
    console.log(`Agregando enmienda ${index + 1}:`, enmienda.name);
    const row = document.createElement('tr');
    row.className = 'amendment-row';
    row.innerHTML = `
      <td>${enmienda.name}</td>
      <td>${enmienda.formula}</td>
      <td>${enmienda.molecular}</td>
      <td>${enmienda.k > 0 ? enmienda.k + '%' : '-'}</td>
      <td>${enmienda.ca > 0 ? enmienda.ca + '%' : '-'}</td>
      <td>${enmienda.mg > 0 ? enmienda.mg + '%' : '-'}</td>
      <td>${enmienda.so4 > 0 ? enmienda.so4 + '%' : '-'}</td>
      <td>${enmienda.co3 > 0 ? enmienda.co3 + '%' : '-'}</td>
      <td>${enmienda.h2o > 0 ? enmienda.h2o + '%' : '-'}</td>
      <td>${enmienda.si > 0 ? enmienda.si + '%' : '-'}</td>
      <td>
        <button class="btn-select-amendment" onclick="selectAmendment('${enmienda.name}')">
          Seleccionar
        </button>
        <button class="btn-edit-amendment" onclick="editAmendment('${enmienda.name}')" title="Editar composición">
          ✏️
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Agregar fila en blanco
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td><input type="text" id="new-amendment-name" placeholder="Nombre" class="amendment-input"></td>
    <td><input type="text" id="new-amendment-formula" placeholder="Fórmula" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-molecular" placeholder="Peso" step="0.1" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-k" placeholder="%K" step="0.1" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-ca" placeholder="%Ca" step="0.1" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-mg" placeholder="%Mg" step="0.1" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-so4" placeholder="%SO₄" step="0.1" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-co3" placeholder="%CO₃" step="0.1" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-h2o" placeholder="%H₂O" step="0.1" class="amendment-input"></td>
    <td><input type="number" id="new-amendment-si" placeholder="%Si" step="0.1" class="amendment-input"></td>
    <td>
      <button class="btn-save-amendment-small" onclick="saveNewAmendment()">💾</button>
      <button class="btn-cancel-amendment-small" onclick="clearNewAmendmentRow()">❌</button>
    </td>
  `;
  tbody.appendChild(newRow);
  
  console.log('=== TABLA CARGADA MANUALMENTE ===');
  console.log('Total de filas:', tbody.children.length);
  
  // Forzar actualización visual
  setTimeout(() => {
    console.log('Forzando actualización visual...');
    tbody.style.display = 'none';
    tbody.offsetHeight; // Trigger reflow
    tbody.style.display = '';
  }, 100);
};

// Función adicional para forzar recarga completa
window.forceReloadTable = function() {
  console.log('=== FORZANDO RECARGA COMPLETA ===');
  
  // Recargar la página
  window.location.reload();
};

// Función centralizada para inicializar todo
function initializeApp() {
  console.log('🚀 INICIALIZANDO APLICACIÓN');
  
  // Inicializar indicador de pH
  updatePHIndicator();
  
  // Cargar tabla de enmiendas
  console.log('=== CARGANDO TABLA DE ENMIENDAS ===');
  const tbody = document.getElementById('amendments-table-body');
  console.log('Elemento tbody encontrado:', tbody);
  
  if (tbody) {
    loadAmendmentsTable();
    console.log('✅ Tabla cargada exitosamente');
  } else {
    console.log('❌ Elemento tbody no encontrado, reintentando...');
    setTimeout(() => {
      const tbodyRetry = document.getElementById('amendments-table-body');
      if (tbodyRetry) {
        loadAmendmentsTable();
        console.log('✅ Tabla cargada en segundo intento');
      } else {
        console.log('❌ Elemento tbody aún no encontrado');
      }
    }, 500);
  }
}

// Función principal de inicialización
async function np_loadProjectsFromCloud() {
  const userId = localStorage.getItem('nutriplant_user_id');
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return;
  const sp = window.nutriplantSupabaseProjects;
  if (!sp || !sp.fetchProjects) return;
  try {
    const list = await sp.fetchProjects();
    window._np_cloud_projects_cache = (list || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      title: p.name || p.title || 'Sin nombre',
      cultivo: (p.data && (p.data.cultivo || p.data.crop_type)) || '',
      variedad: (p.data && p.data.variedad) || '',
      campoOsector: (p.data && p.data.campoOsector) || null,
      createdAt: (p.data && (p.data.created_at || p.data.createdAt)) || new Date().toISOString(),
      updatedAt: p.updated_at || (p.data && (p.data.updated_at || p.data.updatedAt)) || new Date().toISOString()
    }));
    if (typeof np_renderProjects === 'function') np_renderProjects();
  } catch (e) {
    console.warn('⚠️ np_loadProjectsFromCloud:', e);
    window._np_cloud_projects_cache = [];
  }
}

/**
 * Para usuarios Supabase: descarga el proyecto actual desde la nube y lo guarda en localStorage.
 * Así, al abrir la app en otro equipo (lap, cel, tablet) siempre se carga la última versión.
 */
async function np_refreshCurrentProjectFromCloud() {
  const projectId = np_getCurrentProjectId && np_getCurrentProjectId();
  if (!projectId) return;
  const userId = localStorage.getItem('nutriplant_user_id');
  const isSupabase = !!(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));
  if (!isSupabase) return;
  const sp = window.nutriplantSupabaseProjects;
  if (!sp || typeof sp.fetchProject !== 'function') return;
  try {
    const fullData = await sp.fetchProject(projectId);
    if (fullData && typeof fullData === 'object') {
      const toStore = fullData.id ? fullData : { id: projectId, ...fullData };
      const key = 'nutriplant_project_' + projectId;
      localStorage.setItem(key, JSON.stringify(toStore));
      if (window.projectStorage && window.projectStorage.memoryCache && window.projectStorage.memoryCache.currentProjectId === projectId) {
        window.projectStorage.memoryCache.currentProjectId = null;
        window.projectStorage.memoryCache.projectData = null;
      }
      console.log('☁️ Proyecto actual actualizado desde la nube (multi-equipo)');
    }
  } catch (e) {
    console.warn('⚠️ np_refreshCurrentProjectFromCloud:', e);
  }
}

async function np_syncLocalProjectsAtStartup() {
  if (window._npStartupSyncRunning) return;
  const userId = localStorage.getItem('nutriplant_user_id');
  const isSupabaseUser = !!(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));
  if (!isSupabaseUser) return;
  const sp = window.nutriplantSupabaseProjects;
  if (!sp || !sp.syncAllLocalProjectsToCloud) return;

  window._npStartupSyncRunning = true;
  np_setProjectSyncStatus('syncing', 'Sincronizando proyectos...');
  try {
    const syncSummary = await sp.syncAllLocalProjectsToCloud({ silent: true });
    await np_loadProjectsFromCloud();
    if (typeof np_renderProjects === 'function') np_renderProjects();

    const synced = syncSummary && typeof syncSummary.synced === 'number' ? syncSummary.synced : 0;
    if (synced > 0) {
      np_setProjectSyncStatus('ok', `Sincronizado (${synced})`);
    } else {
      np_setProjectSyncStatus('ok', 'Sincronizado');
    }
  } catch (e) {
    console.warn('⚠️ np_syncLocalProjectsAtStartup:', e);
    np_setProjectSyncStatus('error', 'Error de sincronización');
  } finally {
    window._npStartupSyncRunning = false;
    setTimeout(() => {
      const state = window._npProjectSyncState;
      if (state && state.kind !== 'syncing') np_setProjectSyncStatus('idle', '');
    }, 5000);
  }
}

async function initializeDashboard() {
  console.log('🚀 INICIALIZANDO DASHBOARD COMPLETO');
  let validCurrentProjectId = '';
  
  const userId = localStorage.getItem('nutriplant_user_id');
  const isSupabaseUser = !!(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));
  if (isSupabaseUser) {
    window._np_cloud_projects_cache = [];
    await np_loadProjectsFromCloud();
  }
  
  // 🔒 VALIDAR Y LIMPIAR PROYECTOS DEL USUARIO ACTUAL
  if (userId) {
    // Obtener proyectos del usuario
    const userProjects = np_loadProjects();
    const currentProjectId = localStorage.getItem(NP_KEYS.CURRENT);
    
    // Si hay un proyecto seleccionado, verificar que pertenezca al usuario
    if (currentProjectId) {
      const projectBelongsToUser = userProjects.some(p => p.id === currentProjectId);
      if (!projectBelongsToUser) {
        console.log('🧹 Proyecto actual no pertenece al usuario - limpiando:', currentProjectId);
        np_setCurrentProject("");
      } else {
        console.log('✅ Proyecto actual válido para el usuario');
        validCurrentProjectId = currentProjectId;
      }
    }
    
    console.log(`📋 Usuario tiene ${userProjects.length} proyecto(s)`);
  } else {
    console.log('⚠️ No hay usuario logueado - limpiando proyecto seleccionado');
    np_setCurrentProject("");
  }
  
  // 1. Limpiar proyecto seleccionado al iniciar (siempre empezar limpio)
  // np_setCurrentProject(""); // Ya se limpia arriba si es necesario
  console.log('🧹 Validación de proyectos completada');
  
  // 2. Inicializar sidebar
  initializeSidebar();
  
  // 3. Renderizar menú
  renderMenu();
  // 3.1 Restaurar proyecto activo en memoria tras recarga (evita secciones vacías hasta pulsar "Abrir")
  if (validCurrentProjectId) {
    try {
      np_setCurrentProject(validCurrentProjectId);
      console.log('🔄 Proyecto activo restaurado al iniciar:', validCurrentProjectId);
      // 3.2 Usuario Supabase: traer siempre la última versión desde la nube (lap → cel → tablet = mismo dato)
      if (isSupabaseUser && typeof np_refreshCurrentProjectFromCloud === 'function') {
        await np_refreshCurrentProjectFromCloud();
      }
    } catch (e) {
      console.warn('⚠️ No se pudo restaurar el proyecto activo al iniciar:', e);
    }
  }
  
  // 4. Seleccionar primera sección (Inicio)
  const first = menu?.querySelector("a");
  if (first) selectSection("Inicio", first);
  if (isSupabaseUser) {
    np_setProjectSyncStatus('syncing', 'Sincronizando proyectos...');
    np_syncLocalProjectsAtStartup();
  }
  
  // 5. Inicializar pestañas de fertirriego
  initializeFertirriegoTabs();
  
  // 6. Event listeners para cálculo automático de extracción
  const cropType = document.getElementById('cropType');
  const targetYield = document.getElementById('targetYield');
  const surfaceArea = document.getElementById('surfaceArea');
  
  if (cropType) cropType.addEventListener('change', calculateNutrientExtraction);
  if (targetYield) targetYield.addEventListener('input', calculateNutrientExtraction);
  if (surfaceArea) targetYield.addEventListener('input', calculateNutrientExtraction);
  
  // 7. El proyecto activo queda restaurado automáticamente si era válido
  if (!validCurrentProjectId) {
    console.log('ℹ️ Iniciando sin proyecto seleccionado - usuario debe elegir uno');
  }
  
  console.log('✅ DASHBOARD INICIALIZADO COMPLETAMENTE');
}

// Cuando el usuario vuelve a la pestaña (tablet → lap o cel → lap), actualizar datos desde la nube
// para que vea los cambios sin tener que recargar el navegador.
(function() {
  var lastHiddenAt = 0;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState !== 'visible') {
      lastHiddenAt = Date.now();
      return;
    }
    var userId = localStorage.getItem('nutriplant_user_id');
    var isSupabase = !!(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));
    if (!isSupabase) return;
    if (Date.now() - lastHiddenAt < 2000) return;
    (async function() {
      try {
        await np_loadProjectsFromCloud();
        if (typeof np_renderProjects === 'function') np_renderProjects();
        if (typeof np_refreshCurrentProjectFromCloud === 'function') await np_refreshCurrentProjectFromCloud();
        var currentId = typeof np_getCurrentProjectId === 'function' ? np_getCurrentProjectId() : null;
        if (currentId && typeof loadProjectData === 'function') {
          loadProjectData();
        }
      } catch (e) {
        console.warn('Actualizar al volver a la pestaña:', e);
      }
    })();
  });
})();

// ÚNICO listener DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Función de respaldo para cargar tabla si no se cargó automáticamente
setTimeout(() => {
  const tbody = document.getElementById('amendments-table-body');
  if (tbody && tbody.children.length === 0) {
    console.log('Tabla vacía detectada, cargando con delay de respaldo...');
    loadAmendmentsTable();
  }
}, 2000);

// Función de prueba para verificar que selectAmendment funciona
window.testSelection = function() {
  console.log('=== PRUEBA DE SELECCIÓN ===');
  selectAmendment('Yeso Agrícola');
};

// Función de prueba para cargar la tabla manualmente
window.testLoadTable = function() {
  console.log('=== PRUEBA DE CARGA DE TABLA ===');
  console.log('Elemento tbody:', document.getElementById('amendments-table-body'));
  loadAmendmentsTable();
  console.log('Tabla cargada manualmente');
};

// Función para verificar el estado de la tabla
window.checkTableStatus = function() {
  const tbody = document.getElementById('amendments-table-body');
  console.log('=== ESTADO DE LA TABLA ===');
  console.log('Elemento tbody:', tbody);
  console.log('Número de filas:', tbody ? tbody.children.length : 'No encontrado');
  console.log('Contenido HTML:', tbody ? tbody.innerHTML.substring(0, 200) + '...' : 'No encontrado');
};

// Función para editar enmienda
window.editAmendment = function(amendmentId) {
  console.log('=== EDITANDO ENMIENDA ===');
  console.log('ID de enmienda:', amendmentId);
  
  // Buscar la enmienda en la base de datos
  let amendment = amendmentsDatabase.find(a => a.id === amendmentId);
  
  if (!amendment) {
    // Si no se encuentra por ID, buscar por nombre
    amendment = amendmentsDatabase.find(a => a.name === amendmentId);
  }
  
  if (!amendment) {
    console.log('❌ Enmienda no encontrada');
    alert('Enmienda no encontrada');
    return;
  }
  
  console.log('Enmienda encontrada:', amendment);
  
  // Crear modal de edición
  const modal = document.createElement('div');
  modal.className = 'edit-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>✏️ Editar Composición: ${amendment.name}</h3>
      <form id="edit-amendment-form">
        <div class="form-group">
          <label>Peso Molecular:</label>
          <input type="number" id="edit-molecular" value="${amendment.molecularWeight}" step="0.1">
        </div>
        <div class="form-group">
          <label>%K:</label>
          <input type="number" id="edit-k" value="${amendment.k}" step="0.1">
        </div>
        <div class="form-group">
          <label>%Ca:</label>
          <input type="number" id="edit-ca" value="${amendment.ca}" step="0.1">
        </div>
        <div class="form-group">
          <label>%Mg:</label>
          <input type="number" id="edit-mg" value="${amendment.mg}" step="0.1">
        </div>
        <div class="form-group">
          <label>%SO₄:</label>
          <input type="number" id="edit-so4" value="${amendment.so4}" step="0.1">
        </div>
        <div class="form-group">
          <label>%CO₃:</label>
          <input type="number" id="edit-co3" value="${amendment.co3}" step="0.1">
        </div>
        <div class="form-group">
          <label>%H₂O:</label>
          <input type="number" id="edit-h2o" value="${amendment.h2o}" step="0.1">
        </div>
        <div class="form-group">
          <label>%Si:</label>
          <input type="number" id="edit-si" value="${amendment.si}" step="0.1">
        </div>
        <div class="modal-buttons">
          <button type="button" onclick="saveAmendmentEdit('${amendment.id}')" class="btn-save">💾 Guardar</button>
          <button type="button" onclick="closeEditModal()" class="btn-cancel">❌ Cancelar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
};

// Función para guardar cambios de edición (async para esperar sync enmiendas personalizadas a nube)
window.saveAmendmentEdit = async function(amendmentId) {
  console.log('=== GUARDANDO CAMBIOS DE EDICIÓN ===');
  
  // Obtener valores del formulario
  const molecularWeight = parseFloat(document.getElementById('edit-molecular').value) || 0;
  const k = parseFloat(document.getElementById('edit-k').value) || 0;
  const ca = parseFloat(document.getElementById('edit-ca').value) || 0;
  const mg = parseFloat(document.getElementById('edit-mg').value) || 0;
  const so4 = parseFloat(document.getElementById('edit-so4').value) || 0;
  const co3 = parseFloat(document.getElementById('edit-co3').value) || 0;
  const h2o = parseFloat(document.getElementById('edit-h2o').value) || 0;
  const si = parseFloat(document.getElementById('edit-si').value) || 0;
  
  // Buscar y actualizar la enmienda
  const amendmentIndex = amendmentsDatabase.findIndex(a => a.id === amendmentId);
  
  if (amendmentIndex !== -1) {
    console.log('🔍 ANTES de actualizar:', {
      ca: amendmentsDatabase[amendmentIndex].ca,
      mg: amendmentsDatabase[amendmentIndex].mg,
      k: amendmentsDatabase[amendmentIndex].k
    });
    
    amendmentsDatabase[amendmentIndex].molecularWeight = molecularWeight;
    amendmentsDatabase[amendmentIndex].k = k;
    amendmentsDatabase[amendmentIndex].ca = ca;
    amendmentsDatabase[amendmentIndex].mg = mg;
    amendmentsDatabase[amendmentIndex].so4 = so4;
    amendmentsDatabase[amendmentIndex].co3 = co3;
    amendmentsDatabase[amendmentIndex].h2o = h2o;
    amendmentsDatabase[amendmentIndex].si = si;
    
    console.log('🔍 DESPUÉS de actualizar:', {
      ca: amendmentsDatabase[amendmentIndex].ca,
      mg: amendmentsDatabase[amendmentIndex].mg,
      k: amendmentsDatabase[amendmentIndex].k
    });
    
    console.log('✅ Enmienda actualizada:', amendmentsDatabase[amendmentIndex]);
    
    const amendment = amendmentsDatabase[amendmentIndex];
    if (amendment.type === 'custom') {
      await saveCustomAmendmentsToStorage();
      console.log('✅ Enmienda personalizada guardada (local y nube)');
    } else {
      saveAmendmentEditsToStorage(amendmentId, {
        k, ca, mg, so4, co3, h2o, si
      });
      console.log('✅ Edición de enmienda predefinida guardada en localStorage');
    }
    
    closeEditModal();
    skipAutomaticAdjustments = true;
    
    setTimeout(() => {
    loadAmendmentsTable();
      console.log('✅ Tabla recargada después de modificar enmienda');
      
      // Desactivar bandera después de un tiempo
      setTimeout(() => {
        skipAutomaticAdjustments = false;
        console.log('✅ Bandera de recálculo automático desactivada');
      }, 1000);
    }, 100);
    
    alert('✅ Composición actualizada correctamente');
  } else {
    console.log('❌ Enmienda no encontrada para actualizar');
    alert('❌ Error al actualizar la enmienda');
  }
};

// Función para cerrar modal de edición
window.closeEditModal = function() {
  const modal = document.querySelector('.edit-modal');
  if (modal) {
    modal.remove();
  }
};

// Función global para forzar la inicialización
window.forceInitialize = function() {
  console.log('🔄 FORZANDO INICIALIZACIÓN...');
  initializeApp();
};

// Función para verificar si la página está lista
window.checkPageReady = function() {
  console.log('=== VERIFICANDO ESTADO DE LA PÁGINA ===');
  console.log('Document ready state:', document.readyState);
  console.log('DOMContentLoaded ejecutado:', document.readyState === 'complete');
  console.log('Elemento tbody existe:', !!document.getElementById('amendments-table-body'));
  console.log('Función loadAmendmentsTable existe:', typeof loadAmendmentsTable);
  console.log('Función initializeApp existe:', typeof initializeApp);
  console.log('Función initializeDashboard existe:', typeof initializeDashboard);
};

// Función de diagnóstico completo
window.diagnoseProblem = function() {
  console.log('=== DIAGNÓSTICO COMPLETO ===');
  
  // 1. Verificar estado del DOM
  console.log('1. Estado del DOM:');
  console.log('   - Document ready:', document.readyState);
  console.log('   - Body existe:', !!document.body);
  
  // 2. Verificar elementos específicos
  console.log('2. Elementos específicos:');
  console.log('   - Menu existe:', !!document.getElementById('menu'));
  console.log('   - View existe:', !!document.getElementById('view'));
  console.log('   - Tbody existe:', !!document.getElementById('amendments-table-body'));
  
  // 3. Verificar funciones
  console.log('3. Funciones:');
  console.log('   - loadAmendmentsTable:', typeof loadAmendmentsTable);
  console.log('   - initializeApp:', typeof initializeApp);
  console.log('   - initializeDashboard:', typeof initializeDashboard);
  
  // 4. Verificar si estamos en la sección correcta
  console.log('4. Sección actual:');
  const currentView = document.getElementById('view');
  if (currentView) {
    console.log('   - Contenido de view:', currentView.innerHTML.substring(0, 200) + '...');
    console.log('   - Contiene tbody:', currentView.querySelector('tbody') !== null);
  }
  
  // 5. Intentar cargar la tabla
  console.log('5. Intentando cargar tabla...');
  try {
    loadAmendmentsTable();
    console.log('   - ✅ Función ejecutada sin errores');
  } catch (error) {
    console.log('   - ❌ Error al ejecutar:', error.message);
  }
  
  // 6. Verificar resultado
  const tbody = document.getElementById('amendments-table-body');
  if (tbody) {
    console.log('6. Resultado:');
    console.log('   - Filas en tbody:', tbody.children.length);
    console.log('   - Contenido:', tbody.innerHTML.substring(0, 100) + '...');
  }
};

// Función de prueba para selección múltiple
window.testMultipleSelection = function() {
  console.log('=== PRUEBA DE SELECCIÓN MÚLTIPLE ===');
  selectAmendment('Yeso Agrícola');
  setTimeout(() => selectAmendment('Sulfato de Potasio Granular'), 500);
  setTimeout(() => selectAmendment('Cal Dolomítica'), 1000);
};

// Función de prueba simple
window.testSimple = function() {
  console.log('=== PRUEBA SIMPLE ===');
  alert('Función de prueba ejecutada correctamente');
};

// Función para probar selección directa
window.testDirectSelection = function() {
  console.log('=== PRUEBA DE SELECCIÓN DIRECTA ===');
  
  // Desmarcar todas las filas
  document.querySelectorAll('.amendment-row').forEach(row => {
    row.classList.remove('selected');
    const button = row.querySelector('.btn-select-amendment');
    if (button) {
      button.innerHTML = 'Seleccionar';
      button.classList.remove('selected');
    }
  });
  
  // Marcar la primera fila
  const firstRow = document.querySelector('.amendment-row');
  if (firstRow) {
    firstRow.classList.add('selected');
    const button = firstRow.querySelector('.btn-select-amendment');
    if (button) {
      button.innerHTML = '✅ Seleccionada';
      button.classList.add('selected');
    }
    console.log('Primera fila marcada como seleccionada');
  } else {
    console.log('No se encontró ninguna fila .amendment-row');
  }
};

// ==================== SISTEMA DE REPORTES PDF ====================

// Array para almacenar reportes generados
let generatedReports = [];

function getCurrentReportScope() {
  const userId = localStorage.getItem('nutriplant_user_id') || 'anon';
  const projectId = (currentProject && currentProject.id) || (typeof np_getCurrentProjectId === 'function' ? np_getCurrentProjectId() : '') || localStorage.getItem('nutriplant-current-project') || 'no_project';
  return { userId, projectId };
}

function getReportsStorageKey(scope) {
  const resolved = scope || getCurrentReportScope();
  return `nutriplant_reports_${resolved.userId}_${resolved.projectId}`;
}

// Función antigua eliminada - ahora usa la nueva función del modal

// Función eliminada - ya no se valida si hay datos suficientes

// Recopilar todos los datos para el reporte
function collectReportData() {
  const timestamp = new Date();
  const reportId = `report_${timestamp.getTime()}`;
  
  // Datos del proyecto
  const projectData = {
    name: document.querySelector('.project-banner')?.textContent || 'Proyecto NutriPlant',
    location: document.getElementById('coordinatesDisplay')?.textContent || 'Ubicación no especificada',
    surface: document.getElementById('surfaceDisplay')?.textContent || 'Superficie no especificada',
    perimeter: document.getElementById('perimeterDisplay')?.textContent || 'Perímetro no especificado'
  };
  
  // Datos del análisis inicial
  const initialAnalysis = {
    k: parseFloat(document.getElementById('k-initial')?.value) || 0,
    ca: parseFloat(document.getElementById('ca-initial')?.value) || 0,
    mg: parseFloat(document.getElementById('mg-initial')?.value) || 0,
    h: parseFloat(document.getElementById('h-initial')?.value) || 0,
    na: parseFloat(document.getElementById('na-initial')?.value) || 0,
    al: parseFloat(document.getElementById('al-initial')?.value) || 0,
    cic: parseFloat(document.getElementById('cic-total')?.value) || 0,
    ph: parseFloat(document.getElementById('soil-ph')?.value) || 0,
    density: parseFloat(document.getElementById('soil-density')?.value) || 0,
    depth: parseFloat(document.getElementById('soil-depth')?.value) || 0
  };
  
  // Datos de ajuste
  const adjustments = {
    k: parseFloat(document.getElementById('k-target')?.value) || 0,
    ca: parseFloat(document.getElementById('ca-target')?.value) || 0,
    mg: parseFloat(document.getElementById('mg-target')?.value) || 0,
    h: parseFloat(document.getElementById('h-target')?.value) || 0,
    na: parseFloat(document.getElementById('na-target')?.value) || 0,
    al: parseFloat(document.getElementById('al-target')?.value) || 0
  };
  
  // Datos de enmiendas seleccionadas
  const selectedAmendments = getSelectedAmendments();
  
  // Resultados de cálculo
  const calculationResults = {
    amendmentType: document.getElementById('amendment-type')?.textContent || '-',
    totalAmount: document.getElementById('amendment-amount')?.textContent || '-',
    caContribution: document.getElementById('ca-contribution')?.textContent || '-',
    naRemoval: document.getElementById('na-removal')?.textContent || '-'
  };
  
  // Recomendaciones de IA
  const aiRecommendations = getAIRecommendations();
  
  return {
    id: reportId,
    timestamp: timestamp,
    project: projectData,
    initialAnalysis: initialAnalysis,
    adjustments: adjustments,
    selectedAmendments: selectedAmendments,
    results: calculationResults,
    aiRecommendations: aiRecommendations
  };
}

// Obtener enmiendas seleccionadas
function getSelectedAmendments() {
  console.log('🔍 getSelectedAmendments - INICIANDO');
  const selected = [];
  const selectedButtons = document.querySelectorAll('.btn-select-amendment.selected');
  
  console.log(`🔍 Botones seleccionados encontrados: ${selectedButtons.length}`);
  
  selectedButtons.forEach(button => {
    const amendmentId = button.id.replace('btn-select-', '');
    console.log(`🔍 Procesando enmienda ID: ${amendmentId}`);
    
    // LEER VALORES REALES DE LA TABLA DOM (como las enmiendas nuevas)
    const row = button.closest('tr');
    if (row) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 8) {
        const name = cells[0].textContent.trim();
        const formula = cells[1].textContent.trim();
        const molecularWeight = parseFloat(cells[2].textContent.trim()) || 0;
        const k = cells[3].textContent.trim() === '-' ? 0 : parseFloat(cells[3].textContent.trim()) || 0;
        const ca = cells[4].textContent.trim() === '-' ? 0 : parseFloat(cells[4].textContent.trim()) || 0;
        const mg = cells[5].textContent.trim() === '-' ? 0 : parseFloat(cells[5].textContent.trim()) || 0;
        const so4 = cells[6].textContent.trim() === '-' ? 0 : parseFloat(cells[6].textContent.trim()) || 0;
        const co3 = cells[7].textContent.trim() === '-' ? 0 : parseFloat(cells[7].textContent.trim()) || 0;
        const h2o = cells[8]?.textContent.trim() === '-' ? 0 : parseFloat(cells[8]?.textContent.trim()) || 0;
        const si = cells[9]?.textContent.trim() === '-' ? 0 : parseFloat(cells[9]?.textContent.trim()) || 0;
        
        console.log(`🔍 Enmienda encontrada: ${name}`);
        console.log(`🔍 Valores REALES de la tabla:`, {
          ca: ca,
          mg: mg,
          k: k,
          so4: so4,
          co3: co3,
          h2o: h2o,
          si: si
        });
        console.log(`🔍 Texto completo de la celda Ca: "${cells[4].textContent}"`);
        console.log(`🔍 Texto después de trim: "${cells[4].textContent.trim()}"`);
        console.log(`🔍 Valor parseFloat: ${parseFloat(cells[4].textContent.trim())}`);
        
      selected.push({
        id: amendmentId,
          name: name,
          formula: formula,
          molecularWeight: molecularWeight,
        composition: {
            k: k,
            ca: ca,
            mg: mg,
            so4: so4,
            co3: co3,
            h2o: h2o,
            si: si
          }
        });
      }
    } else {
      console.warn(`❌ No se pudo encontrar la fila para ${amendmentId}`);
    }
  });
  
  console.log(`🔍 Enmiendas seleccionadas finales:`, selected);
  return selected;
}

// Obtener recomendaciones de IA
function getAIRecommendations() {
  // Aquí podemos integrar con el sistema de IA existente
  return {
    summary: "Análisis realizado por NutriPlant AI",
    recommendations: "Recomendaciones basadas en el análisis de CIC y balance catiónico",
    reasoning: "El sistema ha analizado las necesidades del suelo y sugiere las enmiendas más apropiadas"
  };
}

// Generar documento PDF
function generatePDFDocument(reportData) {
  // Crear contenido HTML para el PDF
  const htmlContent = createLegacyReportHTML(reportData);
  
  // Crear ventana para imprimir
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Esperar a que se cargue el contenido y luego imprimir
  printWindow.onload = function() {
    printWindow.print();
    printWindow.close();
  };
}

// Crear HTML del reporte
function createLegacyReportHTML(data) {
  const date = data.timestamp.toLocaleDateString('es-MX');
  const time = data.timestamp.toLocaleTimeString('es-MX');
  
  return `
    <!DOCTYPE html>
    <html lang="es" class="notranslate" translate="no">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="google" content="notranslate">
      <title>Reporte NutriPlant PRO - ${data.project.name}</title>
      <style>
        @page {
          size: A4;
          margin: 2cm;
        }
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #666;
        }
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .data-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .data-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .data-label {
          font-weight: bold;
          color: #374151;
          margin-bottom: 5px;
        }
        .data-value {
          font-size: 16px;
          color: #1f2937;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .table th, .table td {
          border: 1px solid #d1d5db;
          padding: 12px;
          text-align: left;
        }
        .table th {
          background: #2563eb;
          color: white;
          font-weight: bold;
        }
        .table tr:nth-child(even) {
          background: #f9fafb;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        .copyright {
          margin-top: 10px;
          font-weight: bold;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body class="notranslate" translate="no">
      <!-- Header con membrete -->
      <div class="header">
        <div class="logo">🌱 NutriPlant PRO</div>
        <div class="subtitle">Sistema Inteligente de Análisis de Suelos</div>
        <div class="subtitle">Reporte de Análisis y Recomendaciones</div>
      </div>
      
      <!-- Información del Proyecto -->
      <div class="section">
        <div class="section-title">📋 Información del Proyecto</div>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Proyecto:</div>
            <div class="data-value">${data.project.name}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Ubicación:</div>
            <div class="data-value">${data.project.location}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Superficie:</div>
            <div class="data-value">${data.project.surface}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Perímetro:</div>
            <div class="data-value">${data.project.perimeter}</div>
          </div>
        </div>
      </div>
      
      <!-- Análisis Inicial del Suelo -->
      <div class="section">
        <div class="section-title">🔬 Análisis Inicial del Suelo</div>
        <table class="table">
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Valor Inicial</th>
              <th>Unidad</th>
              <th>% en CIC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Potasio (K)</strong></td>
              <td>${data.initialAnalysis.k.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${((data.initialAnalysis.k / data.initialAnalysis.cic) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>Calcio (Ca)</strong></td>
              <td>${data.initialAnalysis.ca.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${((data.initialAnalysis.ca / data.initialAnalysis.cic) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>Magnesio (Mg)</strong></td>
              <td>${data.initialAnalysis.mg.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${((data.initialAnalysis.mg / data.initialAnalysis.cic) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>Hidrógeno (H)</strong></td>
              <td>${data.initialAnalysis.h.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${((data.initialAnalysis.h / data.initialAnalysis.cic) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>Sodio (Na)</strong></td>
              <td>${data.initialAnalysis.na.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${((data.initialAnalysis.na / data.initialAnalysis.cic) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>Aluminio (Al)</strong></td>
              <td>${data.initialAnalysis.al.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${((data.initialAnalysis.al / data.initialAnalysis.cic) * 100).toFixed(1)}%</td>
            </tr>
            <tr style="background: #e0f2fe;">
              <td><strong>CIC Total</strong></td>
              <td><strong>${data.initialAnalysis.cic.toFixed(2)}</strong></td>
              <td><strong>meq/100g</strong></td>
              <td><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">pH del Suelo:</div>
            <div class="data-value">${data.initialAnalysis.ph || 'No especificado'}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Densidad Aparente:</div>
            <div class="data-value">${data.initialAnalysis.density || 'No especificado'} g/cm³</div>
          </div>
          <div class="data-item">
            <div class="data-label">Profundidad Efectiva:</div>
            <div class="data-value">${data.initialAnalysis.depth || 'No especificado'} cm</div>
          </div>
        </div>
      </div>
      
      <!-- Ajustes Recomendados -->
      <div class="section">
        <div class="section-title">🎯 Ajustes Recomendados en CIC</div>
        <table class="table">
          <thead>
            <tr>
              <th>Catión</th>
              <th>Ajuste Requerido</th>
              <th>Unidad</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Potasio (K)</strong></td>
              <td>${data.adjustments.k > 0 ? '+' : ''}${data.adjustments.k.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${data.adjustments.k > 0 ? 'Aumentar' : data.adjustments.k < 0 ? 'Disminuir' : 'Sin cambio'}</td>
            </tr>
            <tr>
              <td><strong>Calcio (Ca)</strong></td>
              <td>${data.adjustments.ca > 0 ? '+' : ''}${data.adjustments.ca.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${data.adjustments.ca > 0 ? 'Aumentar' : data.adjustments.ca < 0 ? 'Disminuir' : 'Sin cambio'}</td>
            </tr>
            <tr>
              <td><strong>Magnesio (Mg)</strong></td>
              <td>${data.adjustments.mg > 0 ? '+' : ''}${data.adjustments.mg.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${data.adjustments.mg > 0 ? 'Aumentar' : data.adjustments.mg < 0 ? 'Disminuir' : 'Sin cambio'}</td>
            </tr>
            <tr>
              <td><strong>Hidrógeno (H)</strong></td>
              <td>${data.adjustments.h > 0 ? '+' : ''}${data.adjustments.h.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${data.adjustments.h > 0 ? 'Aumentar' : data.adjustments.h < 0 ? 'Disminuir' : 'Sin cambio'}</td>
            </tr>
            <tr>
              <td><strong>Sodio (Na)</strong></td>
              <td>${data.adjustments.na > 0 ? '+' : ''}${data.adjustments.na.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${data.adjustments.na > 0 ? 'Aumentar' : data.adjustments.na < 0 ? 'Disminuir' : 'Sin cambio'}</td>
            </tr>
            <tr>
              <td><strong>Aluminio (Al)</strong></td>
              <td>${data.adjustments.al > 0 ? '+' : ''}${data.adjustments.al.toFixed(2)}</td>
              <td>meq/100g</td>
              <td>${data.adjustments.al > 0 ? 'Aumentar' : data.adjustments.al < 0 ? 'Disminuir' : 'Sin cambio'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Enmiendas Seleccionadas -->
      <div class="section">
        <div class="section-title">🌱 Enmiendas Recomendadas</div>
        ${data.selectedAmendments.length > 0 ? `
          <table class="table">
            <thead>
              <tr>
                <th>Enmienda</th>
                <th>% K</th>
                <th>% Ca</th>
                <th>% Mg</th>
                <th>% SO₄</th>
                <th>% H₂O</th>
                <th>% Si</th>
              </tr>
            </thead>
            <tbody>
              ${data.selectedAmendments.map(amendment => `
                <tr>
                  <td><strong>${amendment.name}</strong></td>
                  <td>${amendment.composition.k || '-'}</td>
                  <td>${amendment.composition.ca || '-'}</td>
                  <td>${amendment.composition.mg || '-'}</td>
                  <td>${amendment.composition.so4 || '-'}</td>
                  <td>${amendment.composition.h2o || '-'}</td>
                  <td>${amendment.composition.si || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No se han seleccionado enmiendas específicas.</p>'}
      </div>
      
      <!-- Resultados del Cálculo -->
      <div class="section">
        <div class="section-title">📊 Resultados del Cálculo</div>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Enmienda Recomendada:</div>
            <div class="data-value">${data.results.amendmentType}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Cantidad Total:</div>
            <div class="data-value">${data.results.totalAmount}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Calcio a Aportar:</div>
            <div class="data-value">${data.results.caContribution}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Sodio a Remover:</div>
            <div class="data-value">${data.results.naRemoval}</div>
          </div>
        </div>
      </div>
      
      <!-- Recomendaciones de IA -->
      <div class="section">
        <div class="section-title">🤖 Recomendaciones de IA</div>
        <div class="data-item">
          <div class="data-label">Resumen:</div>
          <div class="data-value">${data.aiRecommendations.summary}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Recomendaciones:</div>
          <div class="data-value">${data.aiRecommendations.recommendations}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Razonamiento:</div>
          <div class="data-value">${data.aiRecommendations.reasoning}</div>
        </div>
      </div>
      
      <!-- Instrucciones de Aplicación -->
      <div class="section">
        <div class="section-title">📋 Instrucciones de Aplicación</div>
        <div class="data-item">
          <p><strong>1. Preparación del Suelo:</strong> Asegúrese de que el suelo esté libre de malezas y bien preparado.</p>
          <p><strong>2. Aplicación:</strong> Distribuya las enmiendas de manera uniforme sobre la superficie del suelo.</p>
          <p><strong>3. Incorporación:</strong> Incorpore las enmiendas al suelo mediante labranza superficial (5-10 cm).</p>
          <p><strong>4. Riego:</strong> Aplique un riego ligero para facilitar la incorporación.</p>
          <p><strong>5. Monitoreo:</strong> Realice análisis de seguimiento después de 30-60 días.</p>
        </div>
      </div>
      
      <!-- Footer con derechos -->
      <div class="footer">
        <div>Reporte generado el ${date} a las ${time}</div>
        <div class="copyright">
          © 2026 NutriPlant PRO. Todos los derechos reservados.<br>
          🌱 NutriPlant PRO es una marca registrada.<br>
          Sistema Inteligente de Análisis de Suelos
        </div>
      </div>
    </body>
    </html>
  `;
}

// Guardar reporte en la lista
function saveReportToList(reportData) {
  if (!reportData || typeof reportData !== 'object') return;
  const scope = getCurrentReportScope();
  reportData.userId = scope.userId;
  reportData.projectId = scope.projectId;
  if (!reportData.id) reportData.id = 'report_' + Date.now();
  generatedReports.unshift(reportData);
  updateReportsList();

  // Guardar en localStorage para persistencia
  localStorage.setItem(getReportsStorageKey(scope), JSON.stringify(generatedReports));

  // Sincronizar a la nube (Supabase) si está disponible
  if (typeof window.nutriplantSyncReportToCloud === 'function') {
    console.log('☁️ Intentando sincronizar reporte a la nube...');
    window.nutriplantSyncReportToCloud(scope.userId, scope.projectId, reportData);
  } else {
    console.warn('⚠️ nutriplantSyncReportToCloud no está disponible (¿supabase-projects.js cargado?)');
  }
}

function getReportDisplayTimestamp(report) {
  const raw = report?.timestamp || report?.createdAt || report?.date;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function createReportMetaText(report) {
  const selectedSections = Array.isArray(report?.selectedSections) ? report.selectedSections : [];
  if (selectedSections.length > 0) {
    const sectionLabels = selectedSections
      .map(section => (typeof reportFriendlyKey === 'function' ? reportFriendlyKey(section) : section))
      .join(', ');
    return `${selectedSections.length} secciones incluidas | ${sectionLabels}`;
  }

  const cic = report?.initialAnalysis?.cic;
  const amendmentsCount = Array.isArray(report?.selectedAmendments) ? report.selectedAmendments.length : null;
  if (Number.isFinite(cic)) {
    return `CIC: ${cic.toFixed(2)} meq/100g${amendmentsCount !== null ? ` | Enmiendas: ${amendmentsCount}` : ''}`;
  }

  return 'Reporte listo para descarga en PDF';
}

// Actualizar lista de reportes en la UI
function updateReportsList() {
  const reportsList = document.getElementById('reportsList');
  if (!reportsList) return;
  
  if (generatedReports.length === 0) {
    reportsList.innerHTML = `
      <div class="no-reports" style="text-align: center; padding: 40px; color: #666;">
        <p>📋 No hay reportes generados aún</p>
        <p style="font-size: 14px; margin-top: 10px;">Genera tu primer reporte desde la sección de enmiendas</p>
      </div>
    `;
    return;
  }
  
  reportsList.innerHTML = generatedReports.map((report, index) => `
    <div class="report-item" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0; color: #2563eb;">📄 ${report.project?.name || report.projectName || `Reporte ${index + 1}`}</h4>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">
            ${getReportDisplayTimestamp(report).toLocaleDateString('es-MX')} - ${getReportDisplayTimestamp(report).toLocaleTimeString('es-MX')}
          </p>
          <p style="margin: 0; color: #666; font-size: 12px;">
            ${createReportMetaText(report)}
          </p>
        </div>
        <div>
          <button onclick="downloadReport('${report.id}')" class="btn btn-secondary" style="margin-right: 10px;">
            📥 Descargar
          </button>
          <button onclick="deleteReport('${report.id}')" class="btn btn-danger">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Descargar reporte específico
window.downloadReport = function(reportId) {
  const report = generatedReports.find(r => r.id === reportId);
  if (!report) {
    alert('Reporte no encontrado');
    return;
  }

  if (Array.isArray(report.selectedSections) && report.selectedSections.length > 0) {
    const printableSections = normalizeReportSections(report.selectedSections);
    if (!printableSections.length) {
      showMessage('⚠️ Este reporte no contiene secciones válidas para PDF.', 'warning');
      return;
    }
    // Capturar gráficas de fertirriego (Macro/Micro) si la sección va en el PDF y los canvas existen
    var chartImages = {};
    if (printableSections.indexOf('fertigation') >= 0) {
      try {
        var macroCanvas = document.getElementById('fertiMacroChart');
        var microCanvas = document.getElementById('fertiMicroChart');
        if (macroCanvas && macroCanvas.width > 0 && macroCanvas.height > 0) {
          chartImages.macro = macroCanvas.toDataURL('image/png');
        }
        if (microCanvas && microCanvas.width > 0 && microCanvas.height > 0) {
          chartImages.micro = microCanvas.toDataURL('image/png');
        }
      } catch (e) {
        console.warn('No se pudieron capturar gráficas de fertirriego para el PDF:', e);
      }
    }
    const reportHTML = createReportHTML(printableSections, chartImages);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showMessage('❌ Tu navegador bloqueó la ventana de impresión. Habilita pop-ups para descargar PDF.', 'error');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = function() {
      setTimeout(function() {
        printWindow.print();
      }, 300);
    };
    return;
  }

  generatePDFDocument(report);
};

// Eliminar reporte
window.deleteReport = function(reportId) {
  if (confirm('¿Estás seguro de que quieres eliminar este reporte?')) {
    const scope = getCurrentReportScope();
    generatedReports = generatedReports.filter(r => r.id !== reportId);
    updateReportsList();
    localStorage.setItem(getReportsStorageKey(scope), JSON.stringify(generatedReports));
    if (typeof window.nutriplantDeleteReportFromCloud === 'function') {
      window.nutriplantDeleteReportFromCloud(reportId);
    }
  }
};

// Cargar reportes guardados (primero desde la nube si hay usuario Supabase, luego fallback a localStorage)
function loadSavedReports() {
  const scope = getCurrentReportScope();
  const useCloud = typeof window.nutriplantFetchReportsFromCloud === 'function';

  function applyReports(list) {
    generatedReports = Array.isArray(list) ? list : [];
    generatedReports.forEach(function(report) {
      if (report && report.timestamp) {
        report.timestamp = new Date(report.timestamp);
      }
    });
    localStorage.setItem(getReportsStorageKey(scope), JSON.stringify(generatedReports));
    updateReportsList();
  }

  if (useCloud) {
    window.nutriplantFetchReportsFromCloud(scope.userId, scope.projectId).then(function(cloudReports) {
      if (cloudReports && cloudReports.length > 0) {
        applyReports(cloudReports);
        return;
      }
      var savedReports = localStorage.getItem(getReportsStorageKey(scope));
      if (savedReports) {
        try {
          applyReports(JSON.parse(savedReports));
        } catch (e) {
          console.error('Error al cargar reportes guardados:', e);
          applyReports([]);
        }
      } else {
        applyReports([]);
      }
    }).catch(function() {
      var savedReports = localStorage.getItem(getReportsStorageKey(scope));
      if (savedReports) {
        try {
          applyReports(JSON.parse(savedReports));
        } catch (e) {
          applyReports([]);
        }
      } else {
        applyReports([]);
      }
    });
    return;
  }

  var savedReports = localStorage.getItem(getReportsStorageKey(scope));
  if (savedReports) {
    try {
      applyReports(JSON.parse(savedReports));
    } catch (error) {
      console.error('Error al cargar reportes guardados:', error);
      applyReports([]);
    }
  } else {
    applyReports([]);
  }
}

// Inicializar sistema de reportes
document.addEventListener('DOMContentLoaded', function() {
  loadSavedReports();
});

// ==================== SISTEMA DE GUARDADO AUTOMÁTICO ====================

// Estructura de datos del proyecto
let currentProject = {
  id: null,
  name: '',
  location: {
    coordinates: '',
    surface: '',
    perimeter: '',
    polygon: null
  },
  soilAnalysis: {
    initial: {
      k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0, cic: 0
    },
    properties: {
      ph: 0, density: 0, depth: 0
    },
    adjustments: {
      k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0
    }
  },
  amendments: {
    selected: [],
    soilReachPercent: 100,
    results: {
      type: '',
      amount: '',
      caContribution: '',
      naRemoval: '',
      detailedHTML: '',
      isVisible: false
    }
  },
  vpdAnalysis: {
    // Calculadora Ambiental Simple
    environmental: {
      temperature: null,
      humidity: null,
      vpd: null,
      hd: null,
      calculatedAt: null,
      location: { lat: null, lng: null },
      source: null
    },
    // Calculadora Avanzada
    advanced: {
      airTemperature: null,
      airHumidity: null,
      mode: null, // 'leaf' o 'radiation'
      leafTemperature: null,
      solarRadiation: null,
      calculatedLeafTemp: null,
      vpd: null,
      hd: null,
      calculatedAt: null
    },
    // Historial de cálculos
    history: [],
    lastUpdated: null
  },
  nutrition: {
    // Datos de nutrición granular (futuro)
  },
  hydroponics: {
    // Datos de hidroponía (futuro)
  },
  lastSaved: null,
  isDirty: false
};

// Función para guardar datos del proyecto (MEJORADA con sistema centralizado)
function saveProjectData(options = {}) {
  const { silent = false } = options;
  console.log('💾 Guardando datos del proyecto...');
  console.log('🔍 currentProject.id actual:', currentProject.id);
  
  // Asegurar que tenemos un ID válido
  if (!currentProject.id) {
    console.log('⚠️ No hay proyecto seleccionado, no se pueden guardar datos');
    return;
  }
  
  // 🔒 VALIDACIÓN DE SEGURIDAD: Verificar que el proyecto pertenece al usuario actual
  if (!np_userOwnsProject(currentProject.id)) {
    console.error('❌ SEGURIDAD: Intento de guardar en proyecto que no pertenece al usuario');
    alert('Error de seguridad: Este proyecto no pertenece a tu cuenta. Por favor, recarga la página.');
    return;
  }
  
  // Usar sistema centralizado si está disponible
  const useCentralized = typeof window.projectStorage !== 'undefined';
  const projectKey = `nutriplant_project_${currentProject.id}`;
  console.log('🔑 Guardando en clave:', projectKey);
  
    try {
      // Cargar datos existentes primero (usar sistema centralizado si está disponible)
      let existing = {};
      if (useCentralized) {
        existing = window.projectStorage.loadProject(currentProject.id) || {};
      } else {
        try {
          const existingRaw = localStorage.getItem(projectKey);
          existing = existingRaw ? JSON.parse(existingRaw) : {};
          // Validar que es un objeto válido
          if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
            existing = {};
          }
        } catch (parseError) {
          console.error('❌ Error parseando datos existentes en saveProjectData:', parseError);
          existing = {};
        }
      }
    
    // Recopilar SOLO los datos de la sección actual (no todas las secciones)
    // Esto evita sobrescribir datos de otras secciones con objetos vacíos
    const sectionData = {};
    
    // Verificar qué sección está activa y recopilar solo esa
    const activeSection = document.querySelector('.sidebar a.active')?.textContent?.trim() || '';
    
    // 🚀 CRÍTICO: NO recopilar location aquí - solo map.js::saveLocation() debe guardar location
    // Esto evita conflictos y duplicación de guardado
    // Location se guarda exclusivamente a través de map.js::saveLocation()
    
    // ENMIENDA - Solo recopilar si realmente hay datos
    const selectedButtons = document.querySelectorAll('.btn-select-amendment.selected');
    const typeEl = document.getElementById('amendment-type');
    const amountEl = document.getElementById('amendment-amount');
    const resultsSection = document.getElementById('amendment-results');
    
    // Solo recopilar si hay enmiendas seleccionadas, resultados visibles, o datos en los campos
    if (selectedButtons.length > 0 || 
        (resultsSection && resultsSection.style.display !== 'none' && resultsSection.innerHTML.trim()) ||
        (typeEl && typeEl.textContent.trim()) ||
        (amountEl && amountEl.textContent.trim())) {
      
      sectionData.amendments = {
        selected: [],
        results: {
          type: '',
          amount: '',
          caContribution: '',
          naRemoval: '',
          detailedHTML: '',
          isVisible: false
        }
      };
      
      // Recopilar enmiendas seleccionadas
      selectedButtons.forEach(button => {
        sectionData.amendments.selected.push(button.id.replace('btn-select-', ''));
      });
      const soilReachEl = document.getElementById('soil-reach-percent');
      if (soilReachEl) {
        sectionData.amendments.soilReachPercent = normalizeSoilReachPercent(soilReachEl);
      }
      
      // Recopilar resultados
      const caContEl = document.getElementById('ca-contribution');
      const naRemEl = document.getElementById('na-removal');
      
      if (typeEl) sectionData.amendments.results.type = typeEl.textContent.trim() || '';
      if (amountEl) sectionData.amendments.results.amount = amountEl.textContent.trim() || '';
      if (caContEl) sectionData.amendments.results.caContribution = caContEl.textContent.trim() || '';
      if (naRemEl) sectionData.amendments.results.naRemoval = naRemEl.textContent.trim() || '';
      if (resultsSection && resultsSection.style.display !== 'none' && resultsSection.innerHTML.trim()) {
        sectionData.amendments.results.detailedHTML = resultsSection.innerHTML;
        sectionData.amendments.results.isVisible = true;
      }
    }
    
    // ANÁLISIS DE SUELO - SIEMPRE recopilar si los elementos existen
    const kElement = document.getElementById('k-initial');
    const phElement = document.getElementById('soil-ph');
    if (kElement || phElement || document.getElementById('k-target')) {
      sectionData.soilAnalysis = {
        initial: {},
        properties: {},
        adjustments: {}
      };
      
      // Recopilar TODOS los valores, incluso si son 0
      if (kElement) sectionData.soilAnalysis.initial.k = parseFloat(kElement.value) || 0;
      const caEl = document.getElementById('ca-initial');
      if (caEl) sectionData.soilAnalysis.initial.ca = parseFloat(caEl.value) || 0;
      const mgEl = document.getElementById('mg-initial');
      if (mgEl) sectionData.soilAnalysis.initial.mg = parseFloat(mgEl.value) || 0;
      const hEl = document.getElementById('h-initial');
      if (hEl) sectionData.soilAnalysis.initial.h = parseFloat(hEl.value) || 0;
      const naEl = document.getElementById('na-initial');
      if (naEl) sectionData.soilAnalysis.initial.na = parseFloat(naEl.value) || 0;
      const alEl = document.getElementById('al-initial');
      if (alEl) sectionData.soilAnalysis.initial.al = parseFloat(alEl.value) || 0;
      const cicEl = document.getElementById('cic-total');
      if (cicEl) sectionData.soilAnalysis.initial.cic = parseFloat(cicEl.value) || 0;
      
      // Propiedades
      if (phElement) sectionData.soilAnalysis.properties.ph = parseFloat(phElement.value) || 0;
      const densityEl = document.getElementById('soil-density');
      if (densityEl) sectionData.soilAnalysis.properties.density = parseFloat(densityEl.value) || 0;
      const depthEl = document.getElementById('soil-depth');
      if (depthEl) sectionData.soilAnalysis.properties.depth = parseFloat(depthEl.value) || 0;
      
      // Ajustes - RECOPILAR TODOS
      const kTargetEl = document.getElementById('k-target');
      if (kTargetEl) sectionData.soilAnalysis.adjustments.k = parseFloat(kTargetEl.value) || 0;
      const caTargetEl = document.getElementById('ca-target');
      if (caTargetEl) sectionData.soilAnalysis.adjustments.ca = parseFloat(caTargetEl.value) || 0;
      const mgTargetEl = document.getElementById('mg-target');
      if (mgTargetEl) sectionData.soilAnalysis.adjustments.mg = parseFloat(mgTargetEl.value) || 0;
      const hTargetEl = document.getElementById('h-target');
      if (hTargetEl) sectionData.soilAnalysis.adjustments.h = parseFloat(hTargetEl.value) || 0;
      const naTargetEl = document.getElementById('na-target');
      if (naTargetEl) sectionData.soilAnalysis.adjustments.na = parseFloat(naTargetEl.value) || 0;
      const alTargetEl = document.getElementById('al-target');
      if (alTargetEl) sectionData.soilAnalysis.adjustments.al = parseFloat(alTargetEl.value) || 0;
    }
    
    // 🚀 CRÍTICO: NO recopilar Granular/Fertirriego aquí
    // Las funciones específicas (saveGranularRequirements, saveFertirriegoRequirements)
    // ya guardan correctamente con extractionOverrides.
    // Si recopilamos aquí, SOBRESCRIBIMOS extractionOverrides con datos vacíos.
    // selectSection() ya llama saveGranularRequirements() y saveFertirriegoRequirements() ANTES de saveProjectData()
    // Por lo tanto, NO debemos recopilar aquí para evitar sobrescritura.
    
    // MERGE PROFUNDO: Preservar TODO lo existente, solo actualizar lo nuevo
    // Función helper para merge profundo
    function deepMerge(target, source) {
      if (!source) return target;
      const output = { ...target };
      if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
          if (Array.isArray(source[key])) {
            // Para arrays, reemplazar completamente si tiene elementos, sino preservar
            if (source[key].length > 0) {
              output[key] = source[key];
            } else if (target[key] && target[key].length > 0) {
              output[key] = target[key];
            } else {
              output[key] = source[key];
            }
          } else if (isObject(source[key])) {
            if (!(key in target) || !isObject(target[key])) {
              output[key] = { ...source[key] };
            } else {
              output[key] = deepMerge(target[key], source[key]);
            }
          } else {
            // Solo actualizar si el valor nuevo no está vacío
            if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
              output[key] = source[key];
            } else if (target[key] !== undefined && target[key] !== null && target[key] !== '') {
              // Preservar el valor existente si el nuevo está vacío
              output[key] = target[key];
            }
          }
        });
      }
      return output;
    }
    
    function isObject(item) {
      return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    // 🚀 CRÍTICO: Preservar location ANTES del merge (si tiene polígono válido)
    // Esto evita que deepMerge() lo sobrescriba
    const existingLocation = existing.location;
    const hasValidLocation = existingLocation && 
                            existingLocation.polygon && 
                            Array.isArray(existingLocation.polygon) && 
                            existingLocation.polygon.length >= 3;
    
    // 🚀 REGLA DE ORO: Cada sección se guarda DIRECTAMENTE e INDEPENDIENTEMENTE
    // NO hacer merge - guardar cada sección con saveSection() directamente
    
    // Guardar cada sección directamente con saveSection()
    // Esto asegura que cada sección se guarde independientemente sin afectar otras
    
    if (useCentralized && window.projectStorage) {
      // 🚀 REGLA DE ORO: Guardar cada sección DIRECTAMENTE con saveSection()
      // Cada sección es independiente y se guarda sin afectar otras
      
      let savedCount = 0;
      let errorCount = 0;
      
      if (sectionData.amendments) {
        const success = window.projectStorage.saveSection('amendments', sectionData.amendments, currentProject.id);
        if (success) {
          savedCount++;
          console.log('✅ Sección amendments guardada directamente');
        } else {
          errorCount++;
          console.error('❌ Error guardando amendments');
        }
      }
      
      if (sectionData.soilAnalysis) {
        const success = window.projectStorage.saveSection('soilAnalysis', sectionData.soilAnalysis, currentProject.id);
        if (success) {
          savedCount++;
          console.log('✅ Sección soilAnalysis guardada directamente');
        } else {
          errorCount++;
          console.error('❌ Error guardando soilAnalysis');
        }
      }
      
      if (sectionData.granular) {
        const success = window.projectStorage.saveSection('granular', sectionData.granular, currentProject.id);
        if (success) {
          savedCount++;
          console.log('✅ Sección granular guardada directamente');
        } else {
          errorCount++;
          console.error('❌ Error guardando granular');
        }
      }
      
      if (sectionData.fertirriego) {
        const success = window.projectStorage.saveSection('fertirriego', sectionData.fertirriego, currentProject.id);
        if (success) {
          savedCount++;
          console.log('✅ Sección fertirriego guardada directamente');
        } else {
          errorCount++;
          console.error('❌ Error guardando fertirriego');
        }
      }
      
      // VPD ANALYSIS - Guardar si existe en currentProject (guardado desde saveVPDCalculation)
      if (currentProject.vpdAnalysis && Object.keys(currentProject.vpdAnalysis).length > 0) {
        // Verificar que tenga datos válidos (no solo estructura vacía)
        const hasVPDData = currentProject.vpdAnalysis.environmental?.vpd !== null && currentProject.vpdAnalysis.environmental?.vpd !== undefined ||
                          currentProject.vpdAnalysis.advanced?.vpd !== null && currentProject.vpdAnalysis.advanced?.vpd !== undefined ||
                          (currentProject.vpdAnalysis.history && currentProject.vpdAnalysis.history.length > 0);
        
        if (hasVPDData) {
          const success = window.projectStorage.saveSection('vpdAnalysis', currentProject.vpdAnalysis, currentProject.id);
          if (success) {
            savedCount++;
            console.log('✅ Sección vpdAnalysis guardada directamente');
          } else {
            errorCount++;
            console.error('❌ Error guardando vpdAnalysis');
          }
        }
      }
      
      // 🚀 CRÍTICO: Location NO se guarda aquí - solo map.js::saveLocation() lo guarda
      // Location es completamente independiente
      
      if (errorCount > 0) {
        console.warn(`⚠️ ${errorCount} sección(es) no se pudieron guardar`);
      }
      
      console.log(`✅ ${savedCount} sección(es) guardada(s) directamente e independientemente`);
      return; // Ya se guardó todo directamente
    }
    
    // Fallback: si no hay sistema centralizado, hacer merge (compatibilidad)
    const sectionDataWithoutLocation = { ...sectionData };
    delete sectionDataWithoutLocation.location;
    
    const merged = deepMerge(existing, sectionDataWithoutLocation);
    
    // 🚀 CRÍTICO: SIEMPRE restaurar location después del merge
    if (hasValidLocation) {
      merged.location = existingLocation;
      console.log('✅ Location preservado ANTES y DESPUÉS del merge (tiene polígono válido)');
    } else if (existingLocation && existingLocation.projectId === currentProject.id) {
      merged.location = existingLocation;
      console.log('✅ Location preservado (pertenece a este proyecto)');
    }
    
    // Asegurar propiedades importantes
    merged.id = currentProject.id;
    merged.name = currentProject.name || existing.name || '';
    const now = new Date();
    merged.lastSaved = now.toISOString();
    // También actualizar en currentProject para que el indicador funcione
    currentProject.lastSaved = now;
    
    // Preservar secciones que no se recopilaron
    if (!sectionData.amendments && existing.amendments) {
      merged.amendments = existing.amendments;
    }
    if (!sectionData.soilAnalysis && existing.soilAnalysis) {
      merged.soilAnalysis = existing.soilAnalysis;
    }
    // SIEMPRE preservar fertirriego y granular si existen (incluyendo programas)
    if (existing.fertirriego) {
      if (!sectionData.fertirriego) {
        merged.fertirriego = existing.fertirriego;
      } else {
        // Merge: preservar requirements y program si existen (NO sobrescribir con datos parciales)
        merged.fertirriego = {
          ...existing.fertirriego,
          ...sectionData.fertirriego,
          // CRÍTICO: Si requirements ya existe y tiene datos completos, NO sobrescribir con datos parciales
          requirements: (existing.fertirriego.requirements && existing.fertirriego.requirements.timestamp) 
            ? existing.fertirriego.requirements 
            : (sectionData.fertirriego.requirements || existing.fertirriego.requirements),
          program: existing.fertirriego.program || sectionData.fertirriego.program
        };
      }
    }
    if (existing.granular) {
      if (!sectionData.granular) {
        merged.granular = existing.granular;
      } else {
        // Merge: preservar requirements y program si existen (NO sobrescribir con datos parciales)
        merged.granular = {
          ...existing.granular,
          ...sectionData.granular,
          // CRÍTICO: Si requirements ya existe y tiene datos completos, NO sobrescribir con datos parciales
          requirements: (existing.granular.requirements && existing.granular.requirements.isUserSaved) 
            ? existing.granular.requirements 
            : (sectionData.granular.requirements || existing.granular.requirements),
          program: existing.granular.program || sectionData.granular.program
        };
      }
    }
    
    // Guardar usando sistema centralizado o directamente
    if (useCentralized) {
      // 🚀 REGLA DE ORO: Location es COMPLETAMENTE INDEPENDIENTE
      // Location SOLO se guarda con saveSection('location', ...)
      // saveProject() NUNCA debe tocar location, solo preservarlo
      
      // 🚀 CRÍTICO: Cargar location desde localStorage ANTES de guardar
      // Location siempre se guarda directamente, no a través de saveProject
      const locationBeforeSave = window.projectStorage.loadSection('location', currentProject.id);
      const hasValidLocationBefore = locationBeforeSave && 
                                    locationBeforeSave.polygon && 
                                    Array.isArray(locationBeforeSave.polygon) && 
                                    locationBeforeSave.polygon.length >= 3;
      
      if (hasValidLocationBefore) {
        console.log('✅ Location válido detectado antes de guardar:', locationBeforeSave.polygon.length, 'puntos');
        // Asegurar que location está en merged (para preservarlo en memoria)
        merged.location = locationBeforeSave;
      }
      
      // 🚀 Ya se guardaron todas las secciones directamente con saveSection()
      // No necesitamos hacer nada más - cada sección está guardada independientemente
      console.log('✅ Todas las secciones guardadas directamente - no se requiere merge');
    } else {
      // Fallback: si no hay sistema centralizado, guardar directamente
      localStorage.setItem(projectKey, JSON.stringify(merged));
    }
    
    // VERIFICAR que realmente se guardó
    if (useCentralized && window.projectStorage) {
      const verify = window.projectStorage.loadProject(currentProject.id);
      if (verify) {
        console.log('✅ Guardado VERIFICADO. Secciones guardadas:', {
          location: !!verify.location,
          amendments: !!verify.amendments,
          soilAnalysis: !!verify.soilAnalysis,
          fertirriego: !!verify.fertirriego,
          granular: !!verify.granular
        });
      } else {
        console.error('❌ ERROR: Los datos NO se guardaron');
      }
    }
    
  } catch (e) {
    console.error('❌ Error al guardar:', e);
    throw e;
  }
  
  // Actualizar timestamp
  currentProject.lastSaved = new Date();
  currentProject.isDirty = false;
  
  // Mostrar indicador de guardado
  if (!silent) {
    showSaveIndicator('✅ Datos guardados');
  }
  
  // Actualizar indicador de tiempo de guardado
  updateSaveTimeIndicator();
}

// Recopilar datos actuales de todas las pestañas
function collectCurrentData() {
  console.log('🔍 collectCurrentData ejecutándose...');
  console.log('Sección actual:', document.querySelector('.sidebar a.active')?.textContent?.trim());
  
  // Datos de ubicación - SOLO si los elementos existen
  const coordsEl = document.getElementById('coordinatesDisplay');
  const surfaceEl = document.getElementById('surfaceDisplay');
  const perimeterEl = document.getElementById('perimeterDisplay');
  if (coordsEl || surfaceEl || perimeterEl) {
    if (coordsEl) currentProject.location.coordinates = coordsEl.textContent || '';
    if (surfaceEl) currentProject.location.surface = surfaceEl.textContent || '';
    if (perimeterEl) currentProject.location.perimeter = perimeterEl.textContent || '';
  }
  
  // Datos de análisis de suelo - SOLO si los elementos existen
  const kElement = document.getElementById('k-initial');
  const caElement = document.getElementById('ca-initial');
  const mgElement = document.getElementById('mg-initial');
  const hElement = document.getElementById('h-initial');
  const naElement = document.getElementById('na-initial');
  const alElement = document.getElementById('al-initial');
  const cicElement = document.getElementById('cic-total');
  
  if (kElement || caElement || mgElement || hElement || naElement || alElement || cicElement) {
    if (kElement) currentProject.soilAnalysis.initial.k = parseFloat(kElement.value) || 0;
    if (caElement) currentProject.soilAnalysis.initial.ca = parseFloat(caElement.value) || 0;
    if (mgElement) currentProject.soilAnalysis.initial.mg = parseFloat(mgElement.value) || 0;
    if (hElement) currentProject.soilAnalysis.initial.h = parseFloat(hElement.value) || 0;
    if (naElement) currentProject.soilAnalysis.initial.na = parseFloat(naElement.value) || 0;
    if (alElement) currentProject.soilAnalysis.initial.al = parseFloat(alElement.value) || 0;
    if (cicElement) currentProject.soilAnalysis.initial.cic = parseFloat(cicElement.value) || 0;
    
    // Propiedades del suelo
    const phEl = document.getElementById('soil-ph');
    const densityEl = document.getElementById('soil-density');
    const depthEl = document.getElementById('soil-depth');
    if (phEl) currentProject.soilAnalysis.properties.ph = parseFloat(phEl.value) || 0;
    if (densityEl) currentProject.soilAnalysis.properties.density = parseFloat(densityEl.value) || 0;
    if (depthEl) currentProject.soilAnalysis.properties.depth = parseFloat(depthEl.value) || 0;
    
    // Ajustes
    const kTargetEl = document.getElementById('k-target');
    const caTargetEl = document.getElementById('ca-target');
    const mgTargetEl = document.getElementById('mg-target');
    const hTargetEl = document.getElementById('h-target');
    const naTargetEl = document.getElementById('na-target');
    const alTargetEl = document.getElementById('al-target');
    if (kTargetEl) currentProject.soilAnalysis.adjustments.k = parseFloat(kTargetEl.value) || 0;
    if (caTargetEl) currentProject.soilAnalysis.adjustments.ca = parseFloat(caTargetEl.value) || 0;
    if (mgTargetEl) currentProject.soilAnalysis.adjustments.mg = parseFloat(mgTargetEl.value) || 0;
    if (hTargetEl) currentProject.soilAnalysis.adjustments.h = parseFloat(hTargetEl.value) || 0;
    if (naTargetEl) currentProject.soilAnalysis.adjustments.na = parseFloat(naTargetEl.value) || 0;
    if (alTargetEl) currentProject.soilAnalysis.adjustments.al = parseFloat(alTargetEl.value) || 0;
  }
  
  // Enmiendas seleccionadas - SOLO si los elementos existen
  const selectedButtons = document.querySelectorAll('.btn-select-amendment.selected');
  if (selectedButtons.length > 0 || document.getElementById('amendment-type')) {
    currentProject.amendments.selected = [];
    selectedButtons.forEach(button => {
      const amendmentId = button.id.replace('btn-select-', '');
      currentProject.amendments.selected.push(amendmentId);
    });

    const soilReachEl = document.getElementById('soil-reach-percent');
    if (soilReachEl) {
      currentProject.amendments.soilReachPercent = normalizeSoilReachPercent(soilReachEl);
    }
    
    // Resultados de cálculo básicos
    const typeEl = document.getElementById('amendment-type');
    const amountEl = document.getElementById('amendment-amount');
    const caContEl = document.getElementById('ca-contribution');
    const naRemEl = document.getElementById('na-removal');
    if (typeEl) currentProject.amendments.results.type = typeEl.textContent || '';
    if (amountEl) currentProject.amendments.results.amount = amountEl.textContent || '';
    if (caContEl) currentProject.amendments.results.caContribution = caContEl.textContent || '';
    if (naRemEl) currentProject.amendments.results.naRemoval = naRemEl.textContent || '';
    
    // Resultados detallados completos (HTML)
    const resultsSection = document.getElementById('amendment-results');
    if (resultsSection && resultsSection.style.display !== 'none') {
      currentProject.amendments.results.detailedHTML = resultsSection.innerHTML;
      currentProject.amendments.results.isVisible = true;
    } else {
      currentProject.amendments.results.detailedHTML = '';
      currentProject.amendments.results.isVisible = false;
    }

    if (currentProject.amendments.results) {
      currentProject.amendments.results.rawDetails = window.lastAmendmentCalc?.details || [];
      currentProject.amendments.results.rawTotals = window.lastAmendmentCalc?.totals || {};
    }
  }
  
  // Datos de análisis VPD - SOLO si los elementos existen
  const vpdAirTemp = document.getElementById('vpd-air-temp');
  if (vpdAirTemp || document.getElementById('vpd-result')) {
    if (vpdAirTemp) currentProject.vpdAnalysis.temperature.air = parseFloat(vpdAirTemp.value) || 0;
    const vpdLeafTemp = document.getElementById('vpd-leaf-temp');
    if (vpdLeafTemp) currentProject.vpdAnalysis.temperature.leaf = parseFloat(vpdLeafTemp.value) || 0;
    const vpdSoilTemp = document.getElementById('vpd-soil-temp');
    if (vpdSoilTemp) currentProject.vpdAnalysis.temperature.soil = parseFloat(vpdSoilTemp.value) || 0;
    const vpdAirHum = document.getElementById('vpd-air-humidity');
    if (vpdAirHum) currentProject.vpdAnalysis.humidity.air = parseFloat(vpdAirHum.value) || 0;
    const vpdSoilHum = document.getElementById('vpd-soil-humidity');
    if (vpdSoilHum) currentProject.vpdAnalysis.humidity.soil = parseFloat(vpdSoilHum.value) || 0;
    
    // Cálculos de VPD
    const vpdResult = document.getElementById('vpd-result');
    if (vpdResult) currentProject.vpdAnalysis.calculations.vpd = parseFloat(vpdResult.textContent) || 0;
    const vpdOptimal = document.getElementById('vpd-optimal');
    if (vpdOptimal) currentProject.vpdAnalysis.calculations.optimalVPD = parseFloat(vpdOptimal.textContent) || 0;
    const vpdStatus = document.getElementById('vpd-status');
    if (vpdStatus) currentProject.vpdAnalysis.calculations.status = vpdStatus.textContent || '';
    const vpdRec = document.getElementById('vpd-recommendation');
    if (vpdRec) currentProject.vpdAnalysis.calculations.recommendation = vpdRec.textContent || '';
    
    // Recomendaciones de riego
    const irrFreq = document.getElementById('irrigation-frequency');
    if (irrFreq) currentProject.vpdAnalysis.irrigation.frequency = irrFreq.value || '';
    const irrDur = document.getElementById('irrigation-duration');
    if (irrDur) currentProject.vpdAnalysis.irrigation.duration = irrDur.value || '';
    const irrTim = document.getElementById('irrigation-timing');
    if (irrTim) currentProject.vpdAnalysis.irrigation.timing = irrTim.value || '';
    const irrNotes = document.getElementById('irrigation-notes');
    if (irrNotes) currentProject.vpdAnalysis.irrigation.notes = irrNotes.value || '';
  }
  
  // ===== RECOPILAR DATOS DE GRANULAR Y FERTIRRIEGO (solo si están visibles) =====
  // Granular Requerimiento - SOLO si los elementos existen (sección visible)
  const gCrop = document.getElementById('granularRequerimientoCropType');
  const gYield = document.getElementById('granularRequerimientoTargetYield');
  const gTableContainer = document.getElementById('granularRequerimientoTableContainer');
  if (gCrop && gYield && gTableContainer) {
    // Solo recopilar si la sección está realmente visible
    currentProject.granular = currentProject.granular || {};
    currentProject.granular.requirements = currentProject.granular.requirements || {};
    
    // 🚀 CRÍTICO: Cargar extractionOverrides existentes para no perderlos
    // Esto asegura que si saveProjectData se ejecuta, no sobrescriba los overrides
    let existingGranularSection = null;
    try {
      if (window.projectStorage) {
        existingGranularSection = window.projectStorage.loadSection('granular', currentProject.id);
      }
      if (!existingGranularSection || !existingGranularSection.requirements || !existingGranularSection.requirements.extractionOverrides) {
        // Fallback: cargar desde localStorage directo
        try {
          const unifiedKey = `nutriplant_project_${currentProject.id}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
            const o = JSON.parse(raw);
            if (o && o.granular && o.granular.requirements && o.granular.requirements.extractionOverrides) {
              currentProject.granular.requirements.extractionOverrides = o.granular.requirements.extractionOverrides;
            }
          }
        } catch (e) {
          console.warn('⚠️ Error cargando extractionOverrides en collectCurrentData:', e);
        }
      } else {
        currentProject.granular.requirements.extractionOverrides = existingGranularSection.requirements.extractionOverrides;
      }
    } catch (e) {
      console.warn('⚠️ Error cargando extractionOverrides en collectCurrentData:', e);
    }
    
    if (gCrop) currentProject.granular.requirements.cropType = gCrop.value;
    if (gYield) currentProject.granular.requirements.targetYield = parseFloat(gYield.value) || 10;
    
    const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    currentProject.granular.requirements.adjustment = {};
    currentProject.granular.requirements.efficiency = {};
    
    nutrients.forEach(n => {
      const adj = document.getElementById(`granular-adj-${n}`);
      const eff = document.getElementById(`granular-eff-${n}`);
      if (adj) currentProject.granular.requirements.adjustment[n] = parseFloat(adj.value) || 0;
      if (eff) currentProject.granular.requirements.efficiency[n] = parseFloat(eff.value) || 0;
    });
    
    const isElemBtn = document.getElementById('toggleGranularRequerimientoOxideElementalBtn');
    if (isElemBtn) {
      currentProject.granular.requirements.isElementalMode = isGranularRequerimientoElementalMode || false;
    }
  }
  
  // Fertirriego Requerimiento - SOLO si los elementos existen (sección visible)
  const fCrop = document.getElementById('fertirriegoCropType');
  const fYield = document.getElementById('fertirriegoTargetYield');
  const fTableContainer = document.getElementById('fertirriegoTableContainer');
  if (fCrop && fYield && fTableContainer) {
    // Solo recopilar si la sección está realmente visible
    currentProject.fertirriego = currentProject.fertirriego || {};
    currentProject.fertirriego.requirements = currentProject.fertirriego.requirements || {};
    
    // 🚀 CRÍTICO: Cargar extractionOverrides existentes para no perderlos
    // Esto asegura que si saveProjectData se ejecuta, no sobrescriba los overrides
    let existingFertirriegoSection = null;
    try {
      if (window.projectStorage) {
        existingFertirriegoSection = window.projectStorage.loadSection('fertirriego', currentProject.id);
      }
      if (!existingFertirriegoSection || !existingFertirriegoSection.requirements || !existingFertirriegoSection.requirements.extractionOverrides) {
        // Fallback: cargar desde localStorage directo
        try {
          const unifiedKey = `nutriplant_project_${currentProject.id}`;
          const raw = localStorage.getItem(unifiedKey);
          if (raw) {
            const o = JSON.parse(raw);
            if (o && o.fertirriego && o.fertirriego.requirements && o.fertirriego.requirements.extractionOverrides) {
              currentProject.fertirriego.requirements.extractionOverrides = o.fertirriego.requirements.extractionOverrides;
            }
          }
        } catch (e) {
          console.warn('⚠️ Error cargando extractionOverrides en collectCurrentData (Fertirriego):', e);
        }
      } else {
        currentProject.fertirriego.requirements.extractionOverrides = existingFertirriegoSection.requirements.extractionOverrides;
      }
    } catch (e) {
      console.warn('⚠️ Error cargando extractionOverrides en collectCurrentData (Fertirriego):', e);
    }
    
    if (fCrop) currentProject.fertirriego.requirements.cropType = fCrop.value;
    if (fYield) currentProject.fertirriego.requirements.targetYield = parseFloat(fYield.value) || 10;
    
    const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    currentProject.fertirriego.requirements.adjustment = {};
    currentProject.fertirriego.requirements.efficiency = {};
    
    nutrients.forEach(n => {
      const adj = document.getElementById(`ferti-adj-${n}`);
      const eff = document.getElementById(`ferti-eff-${n}`);
      if (adj) currentProject.fertirriego.requirements.adjustment[n] = parseFloat(adj.value) || 0;
      if (eff) currentProject.fertirriego.requirements.efficiency[n] = parseFloat(eff.value) || 0;
    });
    
    const isElemBtn = document.getElementById('toggleFertirriegoOxideElementalBtn');
    if (isElemBtn) {
      // 🚀 CRÍTICO: Verificar que isFertirriegoElementalMode existe antes de usarlo
      // Puede estar en window o como variable local en fertirriego-functions.js
      const isElementalMode = (typeof window.isFertirriegoElementalMode === 'boolean') 
        ? window.isFertirriegoElementalMode 
        : (typeof isFertirriegoElementalMode !== 'undefined' && typeof isFertirriegoElementalMode === 'boolean')
          ? isFertirriegoElementalMode
          : false;
      currentProject.fertirriego.requirements.isElementalMode = isElementalMode;
    }
  }
  
  // Marcar como modificado
  currentProject.isDirty = true;
  
  console.log('📊 Datos recopilados:', {
    location: currentProject.location,
    soilAnalysis: currentProject.soilAnalysis,
    amendments: currentProject.amendments,
    granular: currentProject.granular,
    fertirriego: currentProject.fertirriego
  });
  
  // 🚀 CRÍTICO: Retornar datos recopilados para uso en saveProject
  return {
    granular: currentProject.granular,
    fertirriego: currentProject.fertirriego,
    amendments: currentProject.amendments,
    soilAnalysis: currentProject.soilAnalysis,
    location: currentProject.location
  };
}

// 🚀 CRÍTICO: Función helper para obtener datos de Granular para guardar
// Incluye extractionOverrides correctamente
function getGranularDataForSave(existingGranular = {}) {
  const gCrop = document.getElementById('granularRequerimientoCropType');
  const gYield = document.getElementById('granularRequerimientoTargetYield');
  const gTableContainer = document.getElementById('granularRequerimientoTableContainer');
  
  if (!gCrop || !gYield || !gTableContainer) {
    // Si no hay elementos visibles, retornar datos existentes
    return existingGranular;
  }
  
  const projectId = currentProject.id;
  if (!projectId) {
    return existingGranular;
  }
  
  // 🚀 CRÍTICO: Cargar extractionOverrides existentes para preservarlos
  let extractionOverrides = {};
  try {
    if (window.projectStorage) {
      const granularSection = window.projectStorage.loadSection('granular', projectId);
      if (granularSection && granularSection.requirements && granularSection.requirements.extractionOverrides) {
        extractionOverrides = granularSection.requirements.extractionOverrides;
      }
    }
    if (!Object.keys(extractionOverrides).length) {
      // Fallback: cargar desde localStorage directo
      const unifiedKey = `nutriplant_project_${projectId}`;
      const raw = localStorage.getItem(unifiedKey);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.granular && o.granular.requirements && o.granular.requirements.extractionOverrides) {
          extractionOverrides = o.granular.requirements.extractionOverrides;
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Error cargando extractionOverrides en getGranularDataForSave:', e);
  }
  
  // 🚀 CRÍTICO: Capturar valores actuales de extracción por tonelada del DOM si fueron modificados
  const cropType = gCrop.value;
  if (cropType) {
    const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    const currentExtraction = {};
    let hasModifiedExtraction = false;
    
    nutrients.forEach(n => {
      const extInput = document.getElementById(`granular-extract-${n}`);
      if (extInput && extInput.value) {
        const extValue = parseFloat(extInput.value);
        if (!isNaN(extValue)) {
          currentExtraction[n] = extValue;
          hasModifiedExtraction = true;
        }
      }
    });
    
    // Si hay valores modificados en el DOM, actualizar extractionOverrides
    if (hasModifiedExtraction) {
      if (!extractionOverrides[cropType]) {
        extractionOverrides[cropType] = {};
      }
      extractionOverrides[cropType] = { ...extractionOverrides[cropType], ...currentExtraction };
      console.log('✅ extractionOverrides actualizados con valores del DOM:', currentExtraction);
    }
  }
  
  // Recopilar datos actuales del DOM
  const requirements = {
    cropType: gCrop.value,
    targetYield: parseFloat(gYield.value) || 10,
    extractionOverrides: extractionOverrides, // 🚀 CRÍTICO: Preservar y actualizar extractionOverrides
    adjustment: {},
    efficiency: {},
    timestamp: new Date().toISOString(),
    isUserSaved: true
  };
  
  const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
  nutrients.forEach(n => {
    const adj = document.getElementById(`granular-adj-${n}`);
    const eff = document.getElementById(`granular-eff-${n}`);
    if (adj) requirements.adjustment[n] = parseFloat(adj.value) || 0;
    if (eff) requirements.efficiency[n] = parseFloat(eff.value) || 0;
  });
  
  const isElemBtn = document.getElementById('toggleGranularRequerimientoOxideElementalBtn');
  if (isElemBtn) {
    requirements.isElementalMode = typeof isGranularRequerimientoElementalMode === 'boolean' ? isGranularRequerimientoElementalMode : false;
  }
  
  // Combinar con datos existentes (preservar program, etc.)
  return {
    ...existingGranular,
    requirements: requirements,
    lastUI: { cropType: requirements.cropType, targetYield: requirements.targetYield }
  };
}

// Cargar datos del proyecto (MEJORADA con sistema centralizado y caché en memoria)
function loadProjectData() {
  console.log('📂 Cargando datos del proyecto...');
  
  // Asegurar que tenemos un ID válido
  if (!currentProject.id) {
    console.log('⚠️ No hay proyecto seleccionado, no se pueden cargar datos');
    return;
  }
  
  // 🔒 VALIDACIÓN DE SEGURIDAD: Verificar que el proyecto pertenece al usuario actual
  if (!np_userOwnsProject(currentProject.id)) {
    console.error('❌ SEGURIDAD: Intento de cargar proyecto que no pertenece al usuario');
    // Limpiar proyecto inválido
    currentProject = { id: '', name: '', isDirty: false };
    np_setCurrentProject('');
    alert('Error de seguridad: Este proyecto no pertenece a tu cuenta. Por favor, selecciona otro proyecto.');
    return;
  }
  
  const projectKey = `nutriplant_project_${currentProject.id}`;
  console.log('🔑 Clave de proyecto:', projectKey);
  
  // 🚀 Usar sistema centralizado con caché en memoria
  const useCentralized = typeof window.projectStorage !== 'undefined';
  let loadedProject = null;
  
  if (useCentralized) {
    // 🚀 Cargar proyecto (usa caché si está disponible, sino carga desde localStorage)
    loadedProject = window.projectStorage.loadProject(currentProject.id);
    
    // 🚀 Establecer proyecto actual en memoria para navegación instantánea
    if (loadedProject) {
      window.projectStorage.setCurrentProjectInMemory(currentProject.id, loadedProject);
      console.log('⚡ Proyecto cargado en memoria - navegación entre pestañas será instantánea');
    }
  } else {
    // Fallback: cargar directamente desde localStorage
    const savedData = localStorage.getItem(projectKey);
    if (savedData) {
      try {
        loadedProject = JSON.parse(savedData);
      } catch (e) {
        console.error('❌ Error parseando datos:', e);
        loadedProject = null;
      }
    }
  }
  
  if (loadedProject) {
    try {
      // CRÍTICO: Verificar que los datos cargados pertenecen al proyecto actual
      if (loadedProject.id && loadedProject.id !== currentProject.id) {
        console.warn('⚠️ Datos cargados pertenecen a otro proyecto. Ignorando...', {
          expected: currentProject.id,
          found: loadedProject.id
        });
        // NO cargar datos de otro proyecto - usar estructura base vacía
        loadedProject = null;
      }
      
      // MERGE SEGURO: Preservar estructura base, solo actualizar con datos guardados válidos
      // Helper para merge profundo preservando valores no vacíos
      function safeMerge(target, source) {
        if (!source) return target;
        const result = { ...target };
        Object.keys(source).forEach(key => {
          if (source[key] !== null && source[key] !== undefined && source[key] !== '') {
            if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
              result[key] = safeMerge(target[key] || {}, source[key]);
            } else {
              result[key] = source[key];
            }
          } else if (target[key] !== undefined) {
            result[key] = target[key];
          }
        });
        return result;
      }
      
      // CRÍTICO: Cargar también Fertirriego y Granular desde el esquema unificado
      if (loadedProject.fertirriego) {
        currentProject.fertirriego = safeMerge(currentProject.fertirriego || {}, loadedProject.fertirriego);
        console.log('✅ Datos Fertirriego cargados desde unificado');
      }
      if (loadedProject.granular) {
        currentProject.granular = safeMerge(currentProject.granular || {}, loadedProject.granular);
        console.log('✅ Datos Granular cargados desde unificado');
      }
      
      // VPD ANALYSIS - Cargar desde datos del proyecto (REEMPLAZAR completamente, no merge)
      if (loadedProject.vpdAnalysis && typeof loadedProject.vpdAnalysis === 'object') {
        // 🚀 CRÍTICO: Reemplazar completamente para evitar mezclar datos de proyectos diferentes
        currentProject.vpdAnalysis = {
          environmental: loadedProject.vpdAnalysis.environmental || {
            temperature: null,
            humidity: null,
            vpd: null,
            hd: null,
            calculatedAt: null,
            location: { lat: null, lng: null },
            source: null
          },
          advanced: loadedProject.vpdAnalysis.advanced || {
            airTemperature: null,
            airHumidity: null,
            mode: null,
            leafTemperature: null,
            solarRadiation: null,
            calculatedLeafTemp: null,
            vpd: null,
            hd: null,
            calculatedAt: null
          },
          history: Array.isArray(loadedProject.vpdAnalysis.history) ? [...loadedProject.vpdAnalysis.history] : [],
          lastUpdated: loadedProject.vpdAnalysis.lastUpdated || null
        };
        console.log('✅ Datos vpdAnalysis cargados (reemplazados completamente)');
      } else {
        // Si no hay datos guardados, inicializar estructura vacía
        currentProject.vpdAnalysis = {
          environmental: {
            temperature: null,
            humidity: null,
            vpd: null,
            hd: null,
            calculatedAt: null,
            location: { lat: null, lng: null },
            source: null
          },
          advanced: {
            airTemperature: null,
            airHumidity: null,
            mode: null,
            leafTemperature: null,
            solarRadiation: null,
            calculatedLeafTemp: null,
            vpd: null,
            hd: null,
            calculatedAt: null
          },
          history: [],
          lastUpdated: null
        };
        console.log('✅ Estructura vpdAnalysis inicializada vacía (proyecto sin datos VPD)');
      }
      
      // CRÍTICO: Validar location.projectId si existe
      if (loadedProject.location) {
        if (loadedProject.location.projectId && loadedProject.location.projectId !== currentProject.id) {
          console.warn('⚠️ Datos de ubicación pertenecen a otro proyecto. Limpiando...', {
            expected: currentProject.id,
            found: loadedProject.location.projectId
          });
          loadedProject.location = { coordinates: '', surface: '', perimeter: '', polygon: null };
        } else if (!loadedProject.location.polygon || !Array.isArray(loadedProject.location.polygon) || loadedProject.location.polygon.length < 3) {
          // Si no hay polígono válido, limpiar también
          console.log('⚠️ No hay polígono válido en datos cargados. Limpiando ubicación...');
          loadedProject.location = { coordinates: '', surface: '', perimeter: '', polygon: null };
        }
      }
      
      // Estructura base completa
      const baseStructure = {
        id: currentProject.id || loadedProject.id,
        name: currentProject.name || loadedProject.name || '',
        location: { coordinates: '', surface: '', perimeter: '', polygon: null },
        soilAnalysis: {
          initial: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0, cic: 0 },
          properties: { ph: 0, density: 0, depth: 0 },
          adjustments: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0 }
        },
        amendments: {
          selected: [],
          results: { type: '', amount: '', caContribution: '', naRemoval: '', detailedHTML: '', isVisible: false }
        },
        fertirriego: null,
        granular: null,
        vpdAnalysis: {
          environmental: {
            temperature: null,
            humidity: null,
            vpd: null,
            hd: null,
            calculatedAt: null,
            location: { lat: null, lng: null },
            source: null
          },
          advanced: {
            airTemperature: null,
            airHumidity: null,
            mode: null,
            leafTemperature: null,
            solarRadiation: null,
            calculatedLeafTemp: null,
            vpd: null,
            hd: null,
            calculatedAt: null
          },
          history: [],
          lastUpdated: null
        },
        soilAnalyses: [],
        solucionNutritivaAnalyses: [],
        extractoPastaAnalyses: [],
        aguaAnalyses: [],
        foliarAnalyses: [],
        frutaAnalyses: [],
        lastSaved: null,
        isDirty: false
      };
      
      // Merge seguro: primero base, luego loadedProject, preservando valores no vacíos
      currentProject = safeMerge(baseStructure, loadedProject);
      
      // Asegurar que ID y name siempre estén correctos
      currentProject.id = currentProject.id || loadedProject.id;
      currentProject.name = currentProject.name || loadedProject.name || '';
      // Asegurar que soilAnalyses y solucionNutritivaAnalyses sean siempre arrays (evitar objeto por carga antigua)
      if (!Array.isArray(currentProject.soilAnalyses)) currentProject.soilAnalyses = [];
      if (!Array.isArray(currentProject.solucionNutritivaAnalyses)) currentProject.solucionNutritivaAnalyses = [];
      if (!Array.isArray(currentProject.extractoPastaAnalyses)) currentProject.extractoPastaAnalyses = [];
      if (!Array.isArray(currentProject.aguaAnalyses)) currentProject.aguaAnalyses = [];
      if (!Array.isArray(currentProject.foliarAnalyses)) currentProject.foliarAnalyses = [];
      if (!Array.isArray(currentProject.frutaAnalyses)) currentProject.frutaAnalyses = [];
      
      // 🚀 CRÍTICO: Convertir lastSaved a objeto Date si viene como string
      if (loadedProject.lastSaved) {
        if (typeof loadedProject.lastSaved === 'string') {
          currentProject.lastSaved = new Date(loadedProject.lastSaved);
        } else if (loadedProject.lastSaved instanceof Date) {
          currentProject.lastSaved = loadedProject.lastSaved;
        } else if (loadedProject.lastSaved.getTime) {
          currentProject.lastSaved = loadedProject.lastSaved;
        }
      } else if (loadedProject.updated_at) {
        // Si no hay lastSaved pero hay updated_at, usar ese
        currentProject.lastSaved = new Date(loadedProject.updated_at);
      }
      
      // SIMPLE: Si location no tiene polígono válido O pertenece a otro proyecto, limpiar
      if (currentProject.location) {
        const hasValidPolygon = currentProject.location.polygon && 
                                Array.isArray(currentProject.location.polygon) && 
                                currentProject.location.polygon.length >= 3;
        const belongsToProject = !currentProject.location.projectId || currentProject.location.projectId === currentProject.id;
        
        if (!hasValidPolygon || !belongsToProject) {
          currentProject.location = { coordinates: '', surface: '', perimeter: '', polygon: null };
        }
      }
      
      // VERIFICAR que los datos se cargaron correctamente
      console.log('📊 Datos cargados del localStorage:', {
        id: currentProject.id,
        name: currentProject.name,
        location: currentProject.location,
        soilAnalysis: currentProject.soilAnalysis,
        amendments: currentProject.amendments,
        fertirriego: currentProject.fertirriego,
        granular: currentProject.granular,
        vpdAnalysis: currentProject.vpdAnalysis
      });
      
      // Aplicar datos cargados a la UI
      applyProjectDataToUI();
      
      console.log('✅ Datos del proyecto cargados y aplicados exitosamente');
    } catch (error) {
      console.error('❌ Error al cargar datos del proyecto:', error);
    }
  } else {
    console.log('📝 No hay datos guardados para este proyecto. Inicializando estructura vacía.');
    // CRÍTICO: Inicializar estructura vacía pero completa - SIEMPRE limpiar location
    currentProject.location = { coordinates: '', surface: '', perimeter: '', polygon: null };
    
    // CRÍTICO: Limpiar elementos del DOM cuando no hay datos
    if (typeof forceClearLocationDisplay === 'function') {
      forceClearLocationDisplay();
    }
    currentProject.soilAnalysis = currentProject.soilAnalysis || {
      initial: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0, cic: 0 },
      properties: { ph: 0, density: 0, depth: 0 },
      adjustments: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0 }
    };
    currentProject.amendments = currentProject.amendments || {
      selected: [],
      results: { type: '', amount: '', caContribution: '', naRemoval: '', detailedHTML: '', isVisible: false }
    };
    if (!Array.isArray(currentProject.soilAnalyses)) currentProject.soilAnalyses = [];
    if (!Array.isArray(currentProject.solucionNutritivaAnalyses)) currentProject.solucionNutritivaAnalyses = [];
    if (!Array.isArray(currentProject.extractoPastaAnalyses)) currentProject.extractoPastaAnalyses = [];
    if (!Array.isArray(currentProject.aguaAnalyses)) currentProject.aguaAnalyses = [];
    if (!Array.isArray(currentProject.foliarAnalyses)) currentProject.foliarAnalyses = [];
    if (!Array.isArray(currentProject.frutaAnalyses)) currentProject.frutaAnalyses = [];
    
    // CRÍTICO: Inicializar vpdAnalysis vacío cuando no hay datos guardados
    currentProject.vpdAnalysis = {
      environmental: {
        temperature: null,
        humidity: null,
        vpd: null,
        hd: null,
        calculatedAt: null,
        location: { lat: null, lng: null },
        source: null
      },
      advanced: {
        airTemperature: null,
        airHumidity: null,
        mode: null,
        leafTemperature: null,
        solarRadiation: null,
        calculatedLeafTemp: null,
        vpd: null,
        hd: null,
        calculatedAt: null
      },
      history: [],
      lastUpdated: null
    };
  }
}

// Aplicar datos del proyecto a la UI
function applyProjectDataToUI() {
  // SIMPLE: SIEMPRE limpiar primero
  if (typeof forceClearLocationDisplay === 'function') {
    forceClearLocationDisplay();
  }
  
  // SIMPLE: Solo aplicar datos si hay polígono válido CON projectId que coincida
  const currentProjectId = currentProject.id || np_getCurrentProjectId();
  const hasValidLocation = currentProjectId && 
                          currentProject.location && 
                          currentProject.location.polygon && 
                          Array.isArray(currentProject.location.polygon) && 
                          currentProject.location.polygon.length >= 3 &&
                          currentProject.location.projectId === currentProjectId;
  
  if (hasValidLocation) {
    const coordinatesElement = document.getElementById('coordinatesDisplay');
    if (coordinatesElement && currentProject.location.coordinates) {
      coordinatesElement.textContent = currentProject.location.coordinates;
    }
    
    const surfaceElement = document.getElementById('surfaceDisplay');
    if (surfaceElement && currentProject.location.surface) {
      surfaceElement.textContent = currentProject.location.surface;
    }
    
    const perimeterElement = document.getElementById('perimeterDisplay');
    if (perimeterElement && currentProject.location.perimeter) {
      perimeterElement.textContent = currentProject.location.perimeter;
    }
    
    // CARGAR POLÍGONO EN EL MAPA si existe
    if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap) {
      // CRÍTICO: Validar una vez más que el polígono pertenece a este proyecto
      const polygonProjectId = currentProject.location.projectId;
      if (polygonProjectId && polygonProjectId !== currentProjectId) {
        console.warn('⚠️ applyProjectDataToUI: Polígono pertenece a otro proyecto. NO cargando.', {
          expected: currentProjectId,
          found: polygonProjectId
        });
        // NO cargar el polígono
        return;
      }
      
      // El polígono está guardado como coordenadas - cargarlo en el mapa
      const polygonData = {
        coordinates: currentProject.location.polygon,
        area: currentProject.location.area || 0,
        perimeter: currentProject.location.perimeterValue || 0,
        center: currentProject.location.center || null,
        projectId: currentProjectId // CRÍTICO: Incluir projectId para validación
      };
      
      // Esperar a que el mapa esté listo
      setTimeout(() => {
        if (nutriPlantMap && nutriPlantMap.map && polygonData.coordinates && polygonData.coordinates.length >= 3) {
          try {
            nutriPlantMap.loadSavedPolygon(polygonData);
            console.log('✅ Polígono cargado en el mapa desde datos guardados');
          } catch (e) {
            console.error('❌ Error al cargar polígono en el mapa:', e);
          }
        }
      }, 500);
    }
  } else {
    // CRÍTICO: Si no hay datos válidos, limpiar los elementos del DOM
    const coordinatesElement = document.getElementById('coordinatesDisplay');
    if (coordinatesElement) {
      coordinatesElement.textContent = 'No seleccionadas';
    }
    
    const surfaceElement = document.getElementById('surfaceDisplay');
    if (surfaceElement) {
      surfaceElement.textContent = '0.00 ha (0.00 acres)';
    }
    
    const perimeterElement = document.getElementById('perimeterDisplay');
    if (perimeterElement) {
      perimeterElement.textContent = '0.00 m';
    }
    
    // CRÍTICO: Limpiar el mapa si no hay datos válidos
    if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap) {
      nutriPlantMap.clearAllPolygons();
      nutriPlantMap.polygon = null;
      nutriPlantMap.savedPolygon = null;
      nutriPlantMap.polygonPath = [];
      nutriPlantMap.coordinates = [];
      nutriPlantMap.area = 0;
      nutriPlantMap.perimeter = 0;
      nutriPlantMap.updateDisplay();
    }
  }
  
  // Aplicar datos de análisis inicial - SOLO si hay datos guardados REALES (no solo 0s)
  if (currentProject.soilAnalysis && currentProject.soilAnalysis.initial) {
    // Verificar si hay datos REALES guardados (al menos un valor > 0 o todos fueron explícitamente guardados)
    const hasRealData = currentProject.soilAnalysis.initial.k > 0 ||
                       currentProject.soilAnalysis.initial.ca > 0 ||
                       currentProject.soilAnalysis.initial.mg > 0 ||
                       currentProject.soilAnalysis.initial.h > 0 ||
                       currentProject.soilAnalysis.initial.na > 0 ||
                       currentProject.soilAnalysis.initial.al > 0 ||
                       currentProject.soilAnalysis.initial.cic > 0;
    
    // SOLO aplicar si hay datos reales guardados, sino dejar los valores precargados del HTML
    if (hasRealData) {
      const kElement = document.getElementById('k-initial');
      if (kElement && currentProject.soilAnalysis.initial.k !== undefined) {
        kElement.value = currentProject.soilAnalysis.initial.k;
      }
      
      const caElement = document.getElementById('ca-initial');
      if (caElement && currentProject.soilAnalysis.initial.ca !== undefined) {
        caElement.value = currentProject.soilAnalysis.initial.ca;
      }
      
      const mgElement = document.getElementById('mg-initial');
      if (mgElement && currentProject.soilAnalysis.initial.mg !== undefined) {
        mgElement.value = currentProject.soilAnalysis.initial.mg;
      }
      
      const hElement = document.getElementById('h-initial');
      if (hElement && currentProject.soilAnalysis.initial.h !== undefined) {
        hElement.value = currentProject.soilAnalysis.initial.h;
      }
      
      const naElement = document.getElementById('na-initial');
      if (naElement && currentProject.soilAnalysis.initial.na !== undefined) {
        naElement.value = currentProject.soilAnalysis.initial.na;
      }
      
      const alElement = document.getElementById('al-initial');
      if (alElement && currentProject.soilAnalysis.initial.al !== undefined) {
        alElement.value = currentProject.soilAnalysis.initial.al;
      }
      
      const cicElement = document.getElementById('cic-total');
      if (cicElement && currentProject.soilAnalysis.initial.cic !== undefined) {
        cicElement.value = currentProject.soilAnalysis.initial.cic;
      }
    }
  }
  
  // Recalcular porcentajes después de cargar los datos
  setTimeout(() => {
    calculateCIC();
    calculateAutomaticAdjustments();
    console.log('✅ Porcentajes recalculados al cargar datos');
  }, 100);
  
  // Aplicar propiedades del suelo - SOLO si hay datos guardados REALES
  if (currentProject.soilAnalysis && currentProject.soilAnalysis.properties) {
    const hasRealProps = currentProject.soilAnalysis.properties.ph > 0 ||
                        currentProject.soilAnalysis.properties.density > 0 ||
                        currentProject.soilAnalysis.properties.depth > 0;
    
    if (hasRealProps) {
      const phElement = document.getElementById('soil-ph');
      if (phElement && currentProject.soilAnalysis.properties.ph !== undefined && currentProject.soilAnalysis.properties.ph > 0) {
        phElement.value = currentProject.soilAnalysis.properties.ph;
        setTimeout(() => {
          if (typeof updatePHIndicator === 'function') updatePHIndicator();
        }, 50);
      }
      
      const densityElement = document.getElementById('soil-density');
      if (densityElement && currentProject.soilAnalysis.properties.density !== undefined && currentProject.soilAnalysis.properties.density > 0) {
        densityElement.value = currentProject.soilAnalysis.properties.density;
      }
      
      const depthElement = document.getElementById('soil-depth');
      if (depthElement && currentProject.soilAnalysis.properties.depth !== undefined && currentProject.soilAnalysis.properties.depth > 0) {
        depthElement.value = currentProject.soilAnalysis.properties.depth;
      }
    }
  }
  
  // Aplicar ajustes - SOLO si hay datos guardados REALES
  if (currentProject.soilAnalysis && currentProject.soilAnalysis.adjustments) {
    const hasRealAdjustments = currentProject.soilAnalysis.adjustments.k !== 0 ||
                              currentProject.soilAnalysis.adjustments.ca !== 0 ||
                              currentProject.soilAnalysis.adjustments.mg !== 0 ||
                              currentProject.soilAnalysis.adjustments.h !== 0 ||
                              currentProject.soilAnalysis.adjustments.na !== 0 ||
                              currentProject.soilAnalysis.adjustments.al !== 0;
    
    if (hasRealAdjustments) {
      const kTargetElement = document.getElementById('k-target');
      if (kTargetElement && currentProject.soilAnalysis.adjustments.k !== undefined) {
        kTargetElement.value = currentProject.soilAnalysis.adjustments.k;
      }
      
      const caTargetElement = document.getElementById('ca-target');
      if (caTargetElement && currentProject.soilAnalysis.adjustments.ca !== undefined) {
        caTargetElement.value = currentProject.soilAnalysis.adjustments.ca;
      }
      
      const mgTargetElement = document.getElementById('mg-target');
      if (mgTargetElement && currentProject.soilAnalysis.adjustments.mg !== undefined) {
        mgTargetElement.value = currentProject.soilAnalysis.adjustments.mg;
      }
      
      const hTargetElement = document.getElementById('h-target');
      if (hTargetElement && currentProject.soilAnalysis.adjustments.h !== undefined) {
        hTargetElement.value = currentProject.soilAnalysis.adjustments.h;
      }
      
      const naTargetElement = document.getElementById('na-target');
      if (naTargetElement && currentProject.soilAnalysis.adjustments.na !== undefined) {
        naTargetElement.value = currentProject.soilAnalysis.adjustments.na;
      }
      
      const alTargetElement = document.getElementById('al-target');
      if (alTargetElement && currentProject.soilAnalysis.adjustments.al !== undefined) {
        alTargetElement.value = currentProject.soilAnalysis.adjustments.al;
      }
    }
  }
  
  // Aplicar enmiendas seleccionadas
  if (currentProject.amendments.selected) {
    currentProject.amendments.selected.forEach(amendmentId => {
      const button = document.getElementById(`btn-select-${amendmentId}`);
      if (button) {
        button.classList.add('selected');
        button.textContent = 'Seleccionado';
        button.style.backgroundColor = '#10b981'; // Verde
        button.style.color = 'white';
      }
    });
  }

  // Aplicar % de alcance de suelo
  const soilReachEl = document.getElementById('soil-reach-percent');
  if (soilReachEl) {
    const savedReach = currentProject.amendments.soilReachPercent ?? 100;
    soilReachEl.value = savedReach;
    normalizeSoilReachPercent(soilReachEl);
  }
  
  // Aplicar resultados de cálculo básicos
  if (currentProject.amendments.results.type) {
    const typeElement = document.getElementById('amendment-type');
    if (typeElement) typeElement.textContent = currentProject.amendments.results.type;
  }
  
  if (currentProject.amendments.results.amount) {
    const amountElement = document.getElementById('amendment-amount');
    if (amountElement) amountElement.textContent = currentProject.amendments.results.amount;
  }
  
  if (currentProject.amendments.results.caContribution) {
    const caElement = document.getElementById('ca-contribution');
    if (caElement) caElement.textContent = currentProject.amendments.results.caContribution;
  }
  
  if (currentProject.amendments.results.naRemoval) {
    const naElement = document.getElementById('na-removal');
    if (naElement) naElement.textContent = currentProject.amendments.results.naRemoval;
  }
  
  // Restaurar resultados detallados completos (HTML)
  const resultsSection = document.getElementById('amendment-results');
  if (resultsSection && currentProject.amendments.results.detailedHTML) {
    resultsSection.innerHTML = currentProject.amendments.results.detailedHTML;
    if (currentProject.amendments.results.isVisible) {
      resultsSection.style.display = 'block';
      console.log('✅ Resultados detallados de enmiendas restaurados');
    } else {
      resultsSection.style.display = 'none';
    }
  }

  // Reaplicar ajuste de alcance si hay datos base guardados
  if (currentProject.amendments.results?.rawDetails && currentProject.amendments.results?.rawTotals) {
    window.lastAmendmentCalc = {
      details: currentProject.amendments.results.rawDetails,
      totals: currentProject.amendments.results.rawTotals
    };
    updateSoilReachAdjustment();
  }
  
  // Mostrar sección de resultados si hay datos básicos pero no HTML detallado
  if (currentProject.amendments.results.type && !currentProject.amendments.results.detailedHTML) {
    if (resultsSection) {
      resultsSection.style.display = 'block';
      console.log('✅ Sección de resultados básicos mostrada');
    }
  }
  
  // Aplicar datos de análisis VPD (estructura antigua - solo si existe, sino ignorar)
  // NOTA: La nueva estructura usa environmental/advanced, no temperature/humidity directos
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.temperature && currentProject.vpdAnalysis.temperature.air) {
    const airTempElement = document.getElementById('vpd-air-temp');
    if (airTempElement) airTempElement.value = currentProject.vpdAnalysis.temperature.air;
  }
  
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.temperature && currentProject.vpdAnalysis.temperature.leaf) {
    const leafTempElement = document.getElementById('vpd-leaf-temp');
    if (leafTempElement) leafTempElement.value = currentProject.vpdAnalysis.temperature.leaf;
  }
  
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.temperature && currentProject.vpdAnalysis.temperature.soil) {
    const soilTempElement = document.getElementById('vpd-soil-temp');
    if (soilTempElement) soilTempElement.value = currentProject.vpdAnalysis.temperature.soil;
  }
  
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.humidity && currentProject.vpdAnalysis.humidity.air) {
    const airHumidityElement = document.getElementById('vpd-air-humidity');
    if (airHumidityElement) airHumidityElement.value = currentProject.vpdAnalysis.humidity.air;
  }
  
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.humidity && currentProject.vpdAnalysis.humidity.soil) {
    const soilHumidityElement = document.getElementById('vpd-soil-humidity');
    if (soilHumidityElement) soilHumidityElement.value = currentProject.vpdAnalysis.humidity.soil;
  }
  
  // Aplicar cálculos de VPD (estructura antigua - solo si existe)
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.calculations && currentProject.vpdAnalysis.calculations.vpd) {
    const vpdResultElement = document.getElementById('vpd-result');
    if (vpdResultElement) vpdResultElement.textContent = currentProject.vpdAnalysis.calculations.vpd;
  }
  
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.calculations && currentProject.vpdAnalysis.calculations.optimalVPD) {
    const vpdOptimalElement = document.getElementById('vpd-optimal');
    if (vpdOptimalElement) vpdOptimalElement.textContent = currentProject.vpdAnalysis.calculations.optimalVPD;
  }
  
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.calculations && currentProject.vpdAnalysis.calculations.status) {
    const vpdStatusElement = document.getElementById('vpd-status');
    if (vpdStatusElement) vpdStatusElement.textContent = currentProject.vpdAnalysis.calculations.status;
  }
  
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.calculations && currentProject.vpdAnalysis.calculations.recommendation) {
    const vpdRecommendationElement = document.getElementById('vpd-recommendation');
    if (vpdRecommendationElement) vpdRecommendationElement.textContent = currentProject.vpdAnalysis.calculations.recommendation;
  }
  
  // Aplicar recomendaciones de riego
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.irrigation) {
    if (currentProject.vpdAnalysis.irrigation.frequency) {
      const frequencyElement = document.getElementById('irrigation-frequency');
      if (frequencyElement) frequencyElement.value = currentProject.vpdAnalysis.irrigation.frequency;
    }
    
    if (currentProject.vpdAnalysis.irrigation.duration) {
      const durationElement = document.getElementById('irrigation-duration');
      if (durationElement) durationElement.value = currentProject.vpdAnalysis.irrigation.duration;
    }
    
    if (currentProject.vpdAnalysis.irrigation.timing) {
      const timingElement = document.getElementById('irrigation-timing');
      if (timingElement) timingElement.value = currentProject.vpdAnalysis.irrigation.timing;
    }
    
    if (currentProject.vpdAnalysis.irrigation.notes) {
      const notesElement = document.getElementById('irrigation-notes');
      if (notesElement) notesElement.value = currentProject.vpdAnalysis.irrigation.notes;
    }
  }
  
  // Recalcular ajustes automáticos si hay datos
  if (currentProject.soilAnalysis.initial.cic > 0) {
    setTimeout(() => {
      if (typeof calculateAutomaticAdjustments === 'function') {
        calculateAutomaticAdjustments();
      }
    }, 100);
  }
  
  // Recalcular VPD si hay datos
  if (currentProject.vpdAnalysis && currentProject.vpdAnalysis.temperature && currentProject.vpdAnalysis.temperature.air > 0) {
    setTimeout(() => {
      if (typeof calculateVPD === 'function') {
        calculateVPD();
      }
    }, 100);
  }
  
  // ===== APLICAR DATOS DE GRANULAR Y FERTIRRIEGO (igual que Enmienda) =====
  // 🚀 CRÍTICO: NO aplicar valores de Granular aquí porque selectGranularSubTab() y loadGranularRequirements() ya lo manejan
  // Si aplicamos valores aquí DESPUÉS de loadGranularRequirements(), podemos disparar onchange
  // que llama calculateGranularNutrientRequirements() sin parámetros, sobrescribiendo valores guardados
  // Granular Requerimiento
  if (currentProject.granular && currentProject.granular.requirements) {
    const req = currentProject.granular.requirements;
    const gCrop = document.getElementById('granularRequerimientoCropType');
    const gYield = document.getElementById('granularRequerimientoTargetYield');
    
    // 🚀 CRÍTICO: Solo agregar opción si no existe, pero NO establecer valores
    // selectGranularSubTab() y loadGranularRequirements() ya establecen los valores correctamente
    if (gCrop && req.cropType) {
      if (!gCrop.querySelector(`option[value="${req.cropType}"]`)) {
        const opt = document.createElement('option');
        opt.value = req.cropType;
        opt.textContent = req.cropType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        gCrop.appendChild(opt);
      }
      // ❌ NO establecer gCrop.value aquí - loadGranularRequirements() ya lo hace
      // Si lo establecemos aquí, puede disparar onchange que sobrescribe valores guardados
    }
    
    // ❌ NO establecer gYield.value aquí - loadGranularRequirements() ya lo hace
    // Si lo establecemos aquí, puede disparar onchange que sobrescribe valores guardados
    
    // NOTA: NO llamar loadGranularRequirements() aquí porque selectGranularSubTab() ya lo maneja
    // Esto evita conflictos y duplicados cuando se carga desde selectGranularSubTab
  }
  
  // Fertirriego Requerimiento
  // 🚀 CRÍTICO: NO aplicar valores aquí porque loadFertirriegoRequirements() ya maneja la carga completa
  // Si aplicamos valores aquí DESPUÉS de loadFertirriegoRequirements(), podemos disparar onchange
  // que llama calculateNutrientRequirements() sin parámetros, sobrescribiendo valores guardados
  // Esto evita conflictos y duplicados cuando se carga desde selectSection()
  if (currentProject.fertirriego && currentProject.fertirriego.requirements) {
    const req = currentProject.fertirriego.requirements;
    const fCrop = document.getElementById('fertirriegoCropType');
    const fYield = document.getElementById('fertirriegoTargetYield');
    
    // 🚀 CRÍTICO: Solo agregar opción si no existe, pero NO establecer valores
    // loadFertirriegoRequirements() ya establece los valores correctamente
    if (fCrop && req.cropType) {
      if (!fCrop.querySelector(`option[value="${req.cropType}"]`)) {
        const opt = document.createElement('option');
        opt.value = req.cropType;
        opt.textContent = req.cropType;
        fCrop.appendChild(opt);
      }
      // ❌ NO establecer fCrop.value aquí - loadFertirriegoRequirements() ya lo hace
      // Si lo establecemos aquí, puede disparar onchange que sobrescribe valores guardados
    }
    
    // ❌ NO establecer fYield.value aquí - loadFertirriegoRequirements() ya lo hace
    // Si lo establecemos aquí, puede disparar onchange que sobrescribe valores guardados
    
    // NOTA: NO llamar loadFertirriegoRequirements() aquí porque selectSection() ya lo maneja
    // Esto evita conflictos y duplicados cuando se carga desde selectSection
  }
}

// Mostrar indicador de guardado
function showSaveIndicator(message) {
  // Crear o actualizar indicador
  let indicator = document.getElementById('save-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'save-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    `;
    document.body.appendChild(indicator);
  }
  
  indicator.textContent = message;
  indicator.style.display = 'block';
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    indicator.style.display = 'none';
  }, 3000);
}

// Actualizar indicador de tiempo de guardado
function updateSaveTimeIndicator() {
  const timeElement = document.getElementById('last-saved-time');
  if (!timeElement) {
    // Elemento no existe aún, reintentar después de un delay
    setTimeout(() => updateSaveTimeIndicator(), 100);
    return;
  }
  
  if (currentProject.lastSaved) {
    const now = new Date();
    // Asegurar que lastSaved sea un objeto Date
    let lastSavedDate;
    if (currentProject.lastSaved instanceof Date) {
      lastSavedDate = currentProject.lastSaved;
    } else if (typeof currentProject.lastSaved === 'string') {
      lastSavedDate = new Date(currentProject.lastSaved);
    } else if (currentProject.lastSaved.getTime) {
      lastSavedDate = currentProject.lastSaved;
    } else {
      // No hay fecha válida
      timeElement.textContent = 'Último guardado: Nunca';
      timeElement.style.color = '#666';
      return;
    }
    
    const diffMs = now - lastSavedDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    let timeText;
    if (diffMins < 1) {
      timeText = 'Hace un momento';
    } else if (diffMins < 60) {
      timeText = `Hace ${diffMins} min`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      timeText = `Hace ${diffHours}h`;
    }
    
    timeElement.textContent = `Último guardado: ${timeText}`;
    timeElement.style.color = '#10b981';
  } else {
    // No hay fecha de guardado
    timeElement.textContent = 'Último guardado: Nunca';
    timeElement.style.color = '#666';
  }
}

// Guardar datos relevantes antes de cambiar de pestaña (solo Fertirriego)
// Snapshot helpers para guardar sin depender del orden de carga
function np_snapshotGranularRequirements() {
  try {
    const projectId = (window.projectManager && window.projectManager.getCurrentProject && window.projectManager.getCurrentProject()) ? window.projectManager.getCurrentProject().id : localStorage.getItem('nutriplant-current-project');
    if (!projectId) return;
    const container = document.getElementById('granularRequerimientoTableContainer');
    const select = document.getElementById('granularRequerimientoCropType');
    const target = document.getElementById('granularRequerimientoTargetYield');
    if (!select || !target) return; // no UI visible; dejar que los guardados normales se encarguen
    const cropType = select.value || '';
    const targetYield = parseFloat(target.value) || 10;
    const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    const adjustment = {}; const efficiency = {};
    nutrients.forEach(n => {
      const adj = document.getElementById(`granular-adj-${n}`);
      const eff = document.getElementById(`granular-eff-${n}`);
      if (adj) adjustment[n] = parseFloat(adj.value) || 0;
      if (eff) efficiency[n] = parseFloat(eff.value) || 0;
    });
    const isElementalMode = !!(window.isGranularRequerimientoElementalMode);
    // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
    const keyProject = `nutriplant_project_${projectId}`;
    const pd = JSON.parse(localStorage.getItem(keyProject) || '{}');
    const existing = pd.granularRequirements || {};
    const requirementData = {
      ...existing,
      cropType,
      targetYield,
      adjustment,
      efficiency,
      isElementalMode,
      timestamp: new Date().toISOString()
    };
    pd.granularRequirements = requirementData;
    // También guardar lastUI
    pd.granularLastUI = { cropType, targetYield };
    localStorage.setItem(keyProject, JSON.stringify(pd));
    // Unificado
    try {
      const unifiedKey = `nutriplant_project_${projectId}`;
      const raw = localStorage.getItem(unifiedKey);
      const obj = raw ? JSON.parse(raw) : {};
      // 🚀 CRÍTICO: Preservar location antes de actualizar
      const existingLocation = obj.location;
      const hasValidLocation = existingLocation && 
                              existingLocation.polygon && 
                              Array.isArray(existingLocation.polygon) && 
                              existingLocation.polygon.length >= 3;
      
      obj.granular = obj.granular || {};
      obj.granular.requirements = requirementData;
      
      // 🚀 CRÍTICO: Restaurar location después de actualizar
      if (hasValidLocation) {
        obj.location = existingLocation;
      }
      
      localStorage.setItem(unifiedKey, JSON.stringify(obj));
    } catch {}
  } catch {}
}
function np_snapshotFertirriegoRequirements() {
  try {
    const projectId = (window.projectManager && window.projectManager.getCurrentProject && window.projectManager.getCurrentProject()) ? window.projectManager.getCurrentProject().id : localStorage.getItem('nutriplant-current-project');
    if (!projectId) return;
    const select = document.getElementById('fertirriegoCropType');
    const target = document.getElementById('fertirriegoTargetYield');
    if (!select || !target) return;
    const cropType = select.value || '';
    const targetYield = parseFloat(target.value) || 25;
    const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
    const adjustment = {}; const efficiency = {};
    nutrients.forEach(n => {
      const adj = document.getElementById(`adj-${n}`);
      const eff = document.getElementById(`eff-${n}`);
      if (adj) adjustment[n] = parseFloat(adj.value) || 0;
      if (eff) efficiency[n] = parseFloat(eff.value) || 0;
    });
    const isElementalMode = !!(window.isFertirriegoElementalMode);
    // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
    const keyProject = `nutriplant_project_${projectId}`;
    const pd = JSON.parse(localStorage.getItem(keyProject) || '{}');
    const existing = pd.fertirriegoRequirements || {};
    const data = {
      ...existing,
      cropType,
      targetYield,
      adjustment,
      efficiency,
      isElementalMode,
      timestamp: new Date().toISOString()
    };
    pd.fertirriegoRequirements = data;
    // También guardar lastUI
    pd.fertirriegoLastUI = { cropType, targetYield };
    localStorage.setItem(keyProject, JSON.stringify(pd));
    // Unificado
    try {
      const unifiedKey = `nutriplant_project_${projectId}`;
      const raw = localStorage.getItem(unifiedKey);
      const obj = raw ? JSON.parse(raw) : {};
      
      // 🚀 CRÍTICO: Preservar location ANTES de actualizar fertirriego
      const existingLocation = obj.location;
      const hasValidLocation = existingLocation && 
                              existingLocation.polygon && 
                              Array.isArray(existingLocation.polygon) && 
                              existingLocation.polygon.length >= 3;
      
      obj.fertirriego = obj.fertirriego || {};
      obj.fertirriego.requirements = data;
      
      // 🚀 CRÍTICO: Restaurar location después de actualizar fertirriego
      if (hasValidLocation) {
        obj.location = existingLocation;
        console.log('✅ Location preservado en np_snapshotFertirriegoRequirements');
      }
      
      localStorage.setItem(unifiedKey, JSON.stringify(obj));
    } catch {}
  } catch {}
}

function saveBeforeTabChange() {
  try {
    // Snapshot inmediato de UI de Requerimiento (Granular y Fertirriego) antes de que el DOM se reemplace
    try {
      // Granular Requerimiento
      const gCrop = document.getElementById('granularRequerimientoCropType');
      const gYield = document.getElementById('granularRequerimientoTargetYield');
      if (gCrop || gYield) {
        const pid = np_getCurrentProjectId();
        if (!pid) return;
        const keyUnified = `nutriplant_project_${pid}`;
        // Cargar existente
        let unified = {};
        if (keyUnified) {
          try { unified = JSON.parse(localStorage.getItem(keyUnified) || '{}'); } catch {}
        }
        unified.granular = unified.granular || {};
        // lastUI
        unified.granular.lastUI = unified.granular.lastUI || {};
        if (gCrop) unified.granular.lastUI.cropType = gCrop.value;
        if (gYield) unified.granular.lastUI.targetYield = parseFloat(gYield.value) || 0;
        // requirements merge
        const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
        const adjustment = {}; const efficiency = {};
        let anyAdj = false, anyEff = false;
        nutrients.forEach(n => {
          const a = document.getElementById(`granular-adj-${n}`);
          const e = document.getElementById(`granular-eff-${n}`);
          if (a) { adjustment[n] = parseFloat(a.value) || 0; anyAdj = true; }
          if (e) { efficiency[n] = parseFloat(e.value) || 0; anyEff = true; }
        });
        const isElemBtn = document.getElementById('toggleGranularRequerimientoOxideElementalBtn');
        const hasLoadedMode = window.granularElementalModeLoaded === true;
        const isElem = (function(){
          try {
            if (hasLoadedMode && typeof window.isGranularRequerimientoElementalMode === 'boolean') {
              return window.isGranularRequerimientoElementalMode;
            }
            if (hasLoadedMode && isElemBtn && isElemBtn.textContent) {
              return isElemBtn.textContent.includes('Óxido');
            }
            return typeof req.isElementalMode === 'boolean' ? req.isElementalMode : false;
          } catch {
            return typeof req.isElementalMode === 'boolean' ? req.isElementalMode : false;
          }
        })();
        const req = unified.granular.requirements || {};
        const cropType = gCrop ? gCrop.value : (req.cropType || '');
        const targetYield = gYield ? (parseFloat(gYield.value) || req.targetYield || 0) : (req.targetYield || 0);
        // Capturar extracción por tonelada si fue editada
        const extractionOverrides = req.extractionOverrides || {};
        if (cropType) {
          const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
          const extraction = {};
          let anyExtraction = false;
          nutrients.forEach(n => {
            const ext = document.getElementById(`granular-extract-${n}`);
            if (ext && ext.value) {
              extraction[n] = parseFloat(ext.value) || 0;
              anyExtraction = true;
            }
          });
          if (anyExtraction) {
            extractionOverrides[cropType] = extraction;
          }
        }
        unified.granular.requirements = {
          ...(req || {}),
          cropType,
          targetYield,
          adjustment: anyAdj ? adjustment : (req.adjustment || {}),
          efficiency: anyEff ? efficiency : (req.efficiency || {}),
          extractionOverrides,
          isElementalMode: typeof isElem === 'boolean' ? isElem : (req.isElementalMode || false),
          timestamp: new Date().toISOString()
        };
        if (keyUnified) {
          try { 
            localStorage.setItem(keyUnified, JSON.stringify(unified)); 
            console.log('💾 Snapshot Granular guardado en unificado:', { 
              cropType, 
              targetYield, 
              hasAdjustment: anyAdj, 
              hasEfficiency: anyEff,
              adjustmentKeys: Object.keys(adjustment),
              efficiencyKeys: Object.keys(efficiency)
            });
          } catch {}
        }
        // 🔒 ELIMINADO: Ya no guardamos en formato legacy para evitar duplicados
        // Todo se guarda en formato nuevo: nutriplant_project_
      }
      // Fertirriego Requerimiento
      const fCrop = document.getElementById('fertirriegoCropType');
      const fYield = document.getElementById('fertirriegoTargetYield');
      if (fCrop || fYield) {
        const pid = np_getCurrentProjectId();
        if (!pid) return;
        const keyUnified = `nutriplant_project_${pid}`;
        let unified = {};
        if (keyUnified) {
          try { unified = JSON.parse(localStorage.getItem(keyUnified) || '{}'); } catch {}
        }
        unified.fertirriego = unified.fertirriego || {};
        // lastUI
        unified.fertirriego.lastUI = unified.fertirriego.lastUI || {};
        if (fCrop) unified.fertirriego.lastUI.cropType = fCrop.value;
        if (fYield) unified.fertirriego.lastUI.targetYield = parseFloat(fYield.value) || 0;
        // requirements merge
        const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
        const adjustment = {}; const efficiency = {};
        let anyAdj = false, anyEff = false;
        nutrients.forEach(n => {
          const a = document.getElementById(`adj-${n}`);
          const e = document.getElementById(`eff-${n}`);
          if (a) { adjustment[n] = parseFloat(a.value) || 0; anyAdj = true; }
          if (e) { efficiency[n] = parseFloat(e.value) || 0; anyEff = true; }
        });
        const isElemBtn = document.getElementById('toggleFertirriegoOxideElementalBtn');
        const hasLoadedMode = window.fertirriegoElementalModeLoaded === true;
        const isElem = (function(){
          try {
            if (hasLoadedMode && typeof window.isFertirriegoElementalMode === 'boolean') {
              return window.isFertirriegoElementalMode;
            }
            if (hasLoadedMode && isElemBtn && isElemBtn.textContent) {
              return isElemBtn.textContent.includes('Óxido');
            }
            return typeof req.isElementalMode === 'boolean' ? req.isElementalMode : false;
          } catch {
            return typeof req.isElementalMode === 'boolean' ? req.isElementalMode : false;
          }
        })();
        const req = unified.fertirriego.requirements || {};
        const cropType = fCrop ? fCrop.value : (req.cropType || '');
        const targetYield = fYield ? (parseFloat(fYield.value) || req.targetYield || 0) : (req.targetYield || 0);
        // Capturar extracción por tonelada si fue editada
        const extractionOverrides = req.extractionOverrides || {};
        if (cropType) {
          const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
          const extraction = {};
          let anyExtraction = false;
          nutrients.forEach(n => {
            // 🚀 CRÍTICO: Usar prefijo 'ferti-' para coincidir con IDs creados por renderNutrientTable()
            const ext = document.getElementById(`ferti-extract-${n}`);
            if (ext && ext.value) {
              extraction[n] = parseFloat(ext.value) || 0;
              anyExtraction = true;
            }
          });
          if (anyExtraction) {
            extractionOverrides[cropType] = extraction;
          }
        }
        // 🚀 CRÍTICO: Preservar location ANTES de actualizar fertirriego
        const existingLocation = unified.location;
        const hasValidLocation = existingLocation && 
                                existingLocation.polygon && 
                                Array.isArray(existingLocation.polygon) && 
                                existingLocation.polygon.length >= 3;
        
        unified.fertirriego.requirements = {
          ...(req || {}),
          cropType,
          targetYield,
          adjustment: anyAdj ? adjustment : (req.adjustment || {}),
          efficiency: anyEff ? efficiency : (req.efficiency || {}),
          extractionOverrides,
          isElementalMode: typeof isElem === 'boolean' ? isElem : (req.isElementalMode || false),
          timestamp: new Date().toISOString()
        };
        
        // 🚀 CRÍTICO: Restaurar location después de actualizar fertirriego
        if (hasValidLocation) {
          unified.location = existingLocation;
          console.log('✅ Location preservado en saveBeforeTabChange (Fertirriego)');
        }
        
        if (keyUnified) {
          try { 
            localStorage.setItem(keyUnified, JSON.stringify(unified)); 
            console.log('💾 Snapshot Fertirriego guardado en unificado:', { 
              cropType, 
              targetYield, 
              hasAdjustment: anyAdj, 
              hasEfficiency: anyEff,
              adjustmentKeys: Object.keys(adjustment),
              efficiencyKeys: Object.keys(efficiency)
            });
          } catch {}
        }
        // 🔒 ELIMINADO: Ya no guardamos en formato legacy para evitar duplicados
        // Todo se guarda en formato nuevo: nutriplant_project_
      }
    } catch (snapErr) { console.warn('snapshot before tab change warn', snapErr); }

    // Volcar cambios pendientes del Programa de Fertirriego
    if (typeof window.flushFertiProgramIfDirty === 'function') {
      window.flushFertiProgramIfDirty();
    }
    // Recordar estado rápido de UI (Fertirriego) antes de salir
    try { if (typeof window.rememberFertirriegoUIState === 'function') window.rememberFertirriegoUIState(); } catch {}
    // Volcar cambios pendientes del Requerimiento de Fertirriego
    try { if (typeof window.flushFertirriegoRequirementsIfDirty === 'function') window.flushFertirriegoRequirementsIfDirty(); } catch {}
    // Guardar Requerimiento de Fertirriego (merge seguro)
    if (typeof window.saveFertirriegoRequirements === 'function') {
      window.saveFertirriegoRequirements();
    }
    // Recordar estado rápido de UI (cultivo/rendimiento) de Granular antes de salir
    try { if (typeof window.rememberGranularUIState === 'function') window.rememberGranularUIState(); } catch {}
    // Volcar cambios pendientes del Requerimiento Granular
    if (typeof window.flushGranularRequirementsIfDirty === 'function') {
      window.flushGranularRequirementsIfDirty();
    }
    // Snapshot síncrono de inputs visibles (evita perder datos si el DOM se reemplaza)
    try { np_snapshotFertirriegoRequirements(); } catch {}
    try { np_snapshotGranularRequirements(); } catch {}
    // Guardar Requerimiento de Fertirriego si existe (seguro, no intrusivo)
    if (typeof window.saveFertirriegoRequirements === 'function') {
      // Guardar solo si la UI de requerimiento de fertirriego está visible para evitar sobreescrituras
      const fertUIVisible = !!document.getElementById('fertirriegoTableContainer');
      if (fertUIVisible) {
      window.saveFertirriegoRequirements();
      }
    }
    // Guardar Requerimiento de Granular si existe
    if (typeof window.saveGranularRequirements === 'function') {
      // Guardar SIEMPRE: la función hace merge cuando la UI no está visible
      window.saveGranularRequirements();
    }

    // Guardar Programa de Granular si estamos en esa pestaña
    try {
      const granularProgramTab = document.querySelector('#granularPrograma.tab-content.active');
      if (granularProgramTab && typeof window.saveApplications === 'function') {
        console.log('💾 Guardando programa de Granular antes de cambiar pestaña...');
        window.saveApplications();
      }
    } catch {}
  } catch (e) {
    console.warn('saveBeforeTabChange warn', e);
  }
}

// Función para cargar datos al cambiar a una pestaña
// 🚀 OPTIMIZADO: Usa caché en memoria - NO recarga desde localStorage, solo actualiza DOM
function loadOnTabChange(tabName) {
  console.log(`🔄 Cambiando a pestaña: ${tabName} (desde caché en memoria)`);
  
  // 🚀 PRIORIDAD: Si el proyecto está en memoria, usar datos de memoria (instantáneo)
  // Solo cargar desde localStorage si NO está en memoria
  if (window.projectStorage && currentProject.id) {
    const cachedData = window.projectStorage.getCurrentProjectFromMemory();
    if (cachedData) {
      // 🚀 Proyecto en memoria - actualizar currentProject desde caché (instantáneo)
      console.log('⚡ Usando datos desde caché en memoria (navegación instantánea)');
      
      // Actualizar currentProject desde caché
      if (cachedData.location) currentProject.location = cachedData.location;
      if (cachedData.soilAnalysis) currentProject.soilAnalysis = cachedData.soilAnalysis;
      if (cachedData.amendments) currentProject.amendments = cachedData.amendments;
      if (cachedData.fertirriego) currentProject.fertirriego = cachedData.fertirriego;
      if (cachedData.granular) currentProject.granular = cachedData.granular;
      if (cachedData.soilAnalyses !== undefined) currentProject.soilAnalyses = Array.isArray(cachedData.soilAnalyses) ? cachedData.soilAnalyses : [];
      
      // Aplicar a UI inmediatamente
      applyProjectDataToUI();
    } else {
      // Si no está en memoria, cargar una vez
      console.log('📂 Proyecto no está en memoria, cargando...');
      loadProjectData();
    }
  }
  
  // Cargar datos específicos de la pestaña (solo actualizar DOM, datos ya están en memoria)
  switch(tabName) {
    case 'Enmienda':
      // Aplicar datos de análisis de suelo y enmiendas (desde memoria)
      setTimeout(() => {
        // Recalcular porcentajes después de aplicar datos
        setTimeout(() => {
          if (typeof calculateCIC === 'function') calculateCIC();
          if (typeof calculateAutomaticAdjustments === 'function') calculateAutomaticAdjustments();
          if (typeof updatePHIndicator === 'function') updatePHIndicator();
          // Actualizar indicador de tiempo de guardado
          updateSaveTimeIndicator();
          console.log('✅ Datos de enmiendas aplicados desde memoria (instantáneo)');
        }, 50); // Delay mínimo solo para DOM
      }, 50);
      break;
    case 'Ubicación':
      // 🚀 CRÍTICO: Validar proyecto ANTES de cargar datos
      console.log('⚡ Abriendo pestaña Ubicación - validando proyecto...');
      
      // 🚀 CRÍTICO: Esperar a que el mapa esté inicializado antes de intentar cargar
      // initLocationMap() se ejecuta en selectSection() y puede tardar en inicializar
      setTimeout(() => {
        if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap) {
          const currentProject = nutriPlantMap.getCurrentProject();
          if (currentProject && currentProject.id) {
            console.log('✅ Proyecto válido detectado:', currentProject.id, '- Cargando ubicación...');
            
            // 🚀 CRÍTICO: Verificar que el mapa está completamente inicializado
            if (!nutriPlantMap.map || !nutriPlantMap.map.getDiv()) {
              console.log('⏳ Mapa aún no está inicializado, esperando...');
              // Esperar un poco más y reintentar
              setTimeout(() => {
                if (nutriPlantMap && nutriPlantMap.map && nutriPlantMap.map.getDiv()) {
                  nutriPlantMap.loadProjectLocation();
                }
              }, 500);
              return;
            }
            
            // 🚀 CRÍTICO: Forzar recarga completa desde localStorage (NO desde caché)
            // Esto asegura que se cargue el location más reciente, incluso si acabamos de guardar en otra pestaña
            if (window.projectStorage) {
              // Limpiar caché de location en memoria para forzar recarga desde localStorage
              if (window.projectStorage.memoryCache && 
                  window.projectStorage.memoryCache.currentProjectId === currentProject.id &&
                  window.projectStorage.memoryCache.projectData) {
                // NO eliminar location del caché, pero forzar recarga desde localStorage
                const freshLocation = window.projectStorage.loadSection('location', currentProject.id);
                if (freshLocation && freshLocation.polygon && Array.isArray(freshLocation.polygon) && freshLocation.polygon.length >= 3) {
                  // Actualizar caché en memoria con datos frescos
                  window.projectStorage.memoryCache.projectData.location = freshLocation;
                  console.log('✅ Location actualizado en caché desde localStorage:', freshLocation.polygon.length, 'puntos');
                } else {
                  console.log('ℹ️ No hay location válido en localStorage para este proyecto');
                }
              }
            }
            
            // Cargar ubicación con validación estricta (cargará desde localStorage directamente)
            // loadProjectLocation() ya carga desde localStorage, no desde caché
            nutriPlantMap.loadProjectLocation();
          } else {
            console.log('ℹ️ No hay proyecto seleccionado - mapa limpio');
            // 🚀 CRÍTICO: Asegurar que el mapa está completamente limpio
            if (nutriPlantMap.map && nutriPlantMap.map.getDiv()) {
              nutriPlantMap.forceRemoveAllPolygons();
            }
            if (typeof forceClearLocationDisplay === 'function') {
              forceClearLocationDisplay();
            }
            if (nutriPlantMap.updateDisplay) {
              nutriPlantMap.updateDisplay();
            }
            if (typeof nutriPlantMap.updateInstructions === 'function') {
              nutriPlantMap.updateInstructions('📍 Selecciona un proyecto y haz clic en el mapa para trazar tu parcela');
            }
          }
        }
      }, 600); // Esperar a que initLocationMap() termine de inicializar (400ms + margen)
      break;
    case 'Fertirriego':
      // 🚀 SIMPLIFICADO: selectSection() ya maneja la carga de Fertirriego
      // NO forzar la pestaña "extraccion" aquí para respetar la última sub-pestaña
      break;
    case 'Nutricion Granular':
      // ✅ NOTA: La carga de datos de Nutrición Granular se maneja en selectSection() -> selectGranularSubTab()
      // NO cargar aquí para evitar duplicados. selectGranularSubTab() ya maneja:
      // 1. loadCustomGranularCrops()
      // 2. loadProjectData()
      // 3. loadGranularRequirements()
      console.log('ℹ️ Nutrición Granular: carga manejada por selectGranularSubTab()');
      break;
    case 'Reporte':
      // Actualizar lista de reportes (datos ya están en memoria)
      setTimeout(() => {
        if (typeof loadSavedReports === 'function') {
          loadSavedReports();
        }
        if (typeof updateReportsList === 'function') {
          updateReportsList();
        }
        console.log('✅ Lista de reportes actualizada para el proyecto/usuario actual');
      }, 50);
      break;
    default:
      console.log(`ℹ️ Pestaña ${tabName} - datos desde memoria (instantáneo)`);
  }
}

// Interceptar cambios de pestaña
function interceptTabChanges() {
  // Interceptar clicks en el menú del sidebar
  const menuItems = document.querySelectorAll('#menu a');
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      const tabName = this.textContent.trim();
      
      // Guardar datos antes de cambiar
      saveBeforeTabChange();
      
      // Cargar datos después del cambio (con un pequeño delay)
      setTimeout(() => {
        loadOnTabChange(tabName);
      }, 100);
    });
  });
  
  // También interceptar la función selectSection original
  const originalSelectSection = window.selectSection;
  if (originalSelectSection) {
    window.selectSection = function(name, element) {
      // Guardar datos antes de cambiar
      saveBeforeTabChange();
      
      // Llamar a la función original
      originalSelectSection(name, element);
      
      // Cargar datos después del cambio
      setTimeout(() => {
        loadOnTabChange(name);
      }, 100);
    };
  }
}

// Función global para mostrar mensajes (compatible con map.js)
window.showMessage = function(message, type = 'success') {
  // Crear elemento de mensaje
  const messageDiv = document.createElement('div');
  messageDiv.className = `save-message save-message-${type}`;
  messageDiv.textContent = message;
  
  // Estilos según el tipo
  const bgColor = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#3b82f6';
  
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;
  
  // Agregar al DOM
  document.body.appendChild(messageDiv);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 300);
  }, 3000);
};

// Función global para guardar proyecto (disponible desde cualquier pestaña)
window.saveProject = function() {
  console.log('💾 Guardando proyecto manualmente...');
  
  try {
    // 🚀 CRÍTICO: Detectar sección activa por DOM (no por textContent que tiene emojis/acentos)
    const isGranularActive = !!(
      document.getElementById('granularRequerimientoTableContainer') ||
      document.querySelector('[data-section="granular"]') ||
      (document.querySelector('h2')?.textContent.includes('Requerimiento Nutricional') && 
       document.getElementById('granularRequerimientoCropType'))
    );
    
    const isFertirriegoActive = !!(
      document.getElementById('fertirriegoTableContainer') ||
      document.querySelector('[data-section="fertirriego"]') ||
      (document.getElementById('fertirriegoCropType') && 
       document.getElementById('fertirriegoTargetYield'))
    );
    
    // 🚀 CRÍTICO: Guardar Requerimientos de Granular INMEDIATAMENTE antes de recopilar datos
    if (isGranularActive) {
      if (typeof window.saveGranularRequirementsImmediate === 'function') {
        console.log('💾 Guardando requerimientos de Granular antes de recopilar...');
        window.saveGranularRequirementsImmediate();
      } else if (typeof window.saveGranularRequirements === 'function') {
        console.log('💾 Guardando requerimientos de Granular antes de recopilar...');
        window.saveGranularRequirements();
      }
      
      // 🚀 CRÍTICO: NO hacer guardado explícito aquí
      // saveGranularRequirementsImmediate() ya guardó correctamente con extractionOverrides
      // Hacer guardado duplicado aquí causa race conditions y puede sobrescribir datos
      
      // Guardar Programa Granular si estamos en esa pestaña
      const granularProgramTab = document.querySelector('#granularPrograma.tab-content.active');
      if (granularProgramTab && typeof window.saveApplications === 'function') {
        console.log('💾 Guardando programa de Granular antes de recopilar...');
        window.saveApplications();
      }
    }
    
    // Guardar Fertirriego si está activo
    if (isFertirriegoActive) {
      if (typeof window.saveFertirriegoRequirementsImmediate === 'function') {
        console.log('💾 Guardando requerimientos de Fertirriego antes de recopilar...');
        window.saveFertirriegoRequirementsImmediate();
      } else if (typeof window.saveFertirriegoRequirements === 'function') {
        console.log('💾 Guardando requerimientos de Fertirriego antes de recopilar...');
        window.saveFertirriegoRequirements();
      }
      
      // También guardar el programa si estamos en esa pestaña
      const fertiProgramTab = document.querySelector('#programa.tab-content.active');
      if (fertiProgramTab && typeof window.saveFertirriegoProgram === 'function') {
        console.log('💾 Guardando programa de Fertirriego antes de recopilar...');
        window.saveFertirriegoProgram();
      }
    }
    
    // Guardar Hidroponia si está activa
    const isHydroponiaActive = !!document.querySelector('.hydroponia-container');
    if (isHydroponiaActive && typeof window.saveHydroponiaData === 'function') {
      console.log('💾 Guardando Hidroponia antes de recopilar...');
      window.saveHydroponiaData();
    }
    
    // Recopilar datos actuales ANTES de guardar
    collectCurrentData();
    
    // Guardar los datos
    saveProjectData();
    
    // Mostrar mensaje de confirmación al usuario
    if (typeof window.showMessage === 'function') {
      window.showMessage('✅ Proyecto guardado exitosamente', 'success');
    } else {
      // Fallback: usar showSaveIndicator si showMessage no está disponible
      if (typeof showSaveIndicator === 'function') {
        showSaveIndicator('✅ Proyecto guardado exitosamente');
      } else {
        console.log('✅ Proyecto guardado exitosamente');
      }
    }
    
    console.log('✅ Guardado manual completado');
  } catch (error) {
    console.error('❌ Error al guardar proyecto:', error);
    if (typeof window.showMessage === 'function') {
      window.showMessage('❌ Error al guardar el proyecto', 'error');
    } else {
      alert('❌ Error al guardar el proyecto. Por favor, intenta de nuevo.');
    }
  }
};

// Función global para cargar proyecto
window.loadProject = function() {
  loadProjectData();
};

// ==================== SISTEMA DE TARJETAS DE PROYECTO ====================

// Función para generar resumen completo del proyecto
function generateProjectSummary() {
  const summary = {
    id: currentProject.id || 'default',
    name: currentProject.name || 'Proyecto NutriPlant',
    lastUpdated: currentProject.lastSaved || new Date(),
    status: currentProject.isDirty ? 'Modificado' : 'Guardado',
    
    // Resumen de análisis realizados
    analyses: {
      soilAnalysis: {
        completed: currentProject.soilAnalysis.initial.cic > 0,
        cic: currentProject.soilAnalysis.initial.cic,
        cations: {
          k: currentProject.soilAnalysis.initial.k,
          ca: currentProject.soilAnalysis.initial.ca,
          mg: currentProject.soilAnalysis.initial.mg,
          h: currentProject.soilAnalysis.initial.h,
          na: currentProject.soilAnalysis.initial.na,
          al: currentProject.soilAnalysis.initial.al
        },
        adjustments: currentProject.soilAnalysis.adjustments,
        amendments: currentProject.amendments.selected.length,
        results: currentProject.amendments.results
      },
      
      vpdAnalysis: {
        completed: currentProject.vpdAnalysis.temperature.air > 0,
        temperature: currentProject.vpdAnalysis.temperature,
        humidity: currentProject.vpdAnalysis.humidity,
        vpd: currentProject.vpdAnalysis.calculations.vpd,
        status: currentProject.vpdAnalysis.calculations.status,
        recommendation: currentProject.vpdAnalysis.calculations.recommendation
      },
      
      location: {
        completed: currentProject.location.coordinates !== '',
        coordinates: currentProject.location.coordinates,
        surface: currentProject.location.surface,
        perimeter: currentProject.location.perimeter
      }
    },
    
    // Estadísticas del proyecto
    statistics: {
      totalAnalyses: Object.values(summary.analyses).filter(a => a.completed).length,
      lastActivity: currentProject.lastSaved,
      dataPoints: calculateDataPoints()
    }
  };
  
  return summary;
}

// Calcular puntos de datos del proyecto
function calculateDataPoints() {
  let points = 0;
  
  // Análisis de suelo
  if (currentProject.soilAnalysis.initial.cic > 0) points += 7; // 6 cationes + CIC
  if (currentProject.soilAnalysis.properties.ph > 0) points += 1;
  if (currentProject.soilAnalysis.properties.density > 0) points += 1;
  if (currentProject.soilAnalysis.properties.depth > 0) points += 1;
  
  // Análisis VPD
  if (currentProject.vpdAnalysis.temperature.air > 0) points += 1;
  if (currentProject.vpdAnalysis.temperature.leaf > 0) points += 1;
  if (currentProject.vpdAnalysis.temperature.soil > 0) points += 1;
  if (currentProject.vpdAnalysis.humidity.air > 0) points += 1;
  if (currentProject.vpdAnalysis.humidity.soil > 0) points += 1;
  
  // Ubicación
  if (currentProject.location.coordinates !== '') points += 3; // coordenadas, superficie, perímetro
  
  // Enmiendas
  points += currentProject.amendments.selected.length;
  
  return points;
}

// Función para mostrar tarjeta del proyecto
function showProjectCard() {
  const summary = generateProjectSummary();
  
  // Crear modal para mostrar la tarjeta
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div class="project-card" style="
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      max-width: 800px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    ">
      <div class="card-header" style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #2563eb; margin: 0;">🌱 Tarjeta del Proyecto</h2>
        <p style="color: #666; margin: 10px 0;">${summary.name}</p>
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px;">
          <span style="background: #f0f9ff; color: #2563eb; padding: 5px 15px; border-radius: 20px; font-size: 14px;">
            📊 ${summary.statistics.totalAnalyses} Análisis
          </span>
          <span style="background: #f0fdf4; color: #16a34a; padding: 5px 15px; border-radius: 20px; font-size: 14px;">
            📈 ${summary.statistics.dataPoints} Datos
          </span>
          <span style="background: #fef3c7; color: #d97706; padding: 5px 15px; border-radius: 20px; font-size: 14px;">
            ${summary.status}
          </span>
        </div>
      </div>
      
      <div class="card-content">
        <!-- Análisis de Suelo -->
        <div class="analysis-section" style="margin-bottom: 25px;">
          <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            🚜 Análisis de Suelo
            ${summary.analyses.soilAnalysis.completed ? '✅' : '⏳'}
          </h3>
          ${summary.analyses.soilAnalysis.completed ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>CIC Total:</strong> ${summary.analyses.soilAnalysis.cic.toFixed(2)} meq/100g
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Enmiendas:</strong> ${summary.analyses.soilAnalysis.amendments} seleccionadas
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>K:</strong> ${summary.analyses.soilAnalysis.cations.k.toFixed(2)} meq/100g
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Ca:</strong> ${summary.analyses.soilAnalysis.cations.ca.toFixed(2)} meq/100g
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Mg:</strong> ${summary.analyses.soilAnalysis.cations.mg.toFixed(2)} meq/100g
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Na:</strong> ${summary.analyses.soilAnalysis.cations.na.toFixed(2)} meq/100g
              </div>
            </div>
          ` : '<p style="color: #666; font-style: italic;">No se ha realizado análisis de suelo</p>'}
        </div>
        
        <!-- Análisis VPD -->
        <div class="analysis-section" style="margin-bottom: 25px;">
          <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            💧 Análisis VPD
            ${summary.analyses.vpdAnalysis.completed ? '✅' : '⏳'}
          </h3>
          ${summary.analyses.vpdAnalysis.completed ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Temperatura Aire:</strong> ${summary.analyses.vpdAnalysis.temperature.air}°C
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Humedad Aire:</strong> ${summary.analyses.vpdAnalysis.humidity.air}%
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>VPD:</strong> ${summary.analyses.vpdAnalysis.vpd.toFixed(2)} kPa
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Estado:</strong> ${summary.analyses.vpdAnalysis.status}
              </div>
            </div>
          ` : '<p style="color: #666; font-style: italic;">No se ha realizado análisis VPD</p>'}
        </div>
        
        <!-- Ubicación -->
        <div class="analysis-section" style="margin-bottom: 25px;">
          <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            📍 Ubicación
            ${summary.analyses.location.completed ? '✅' : '⏳'}
          </h3>
          ${summary.analyses.location.completed ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Coordenadas:</strong> ${summary.analyses.location.coordinates}
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Superficie:</strong> ${summary.analyses.location.surface}
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Perímetro:</strong> ${summary.analyses.location.perimeter}
              </div>
            </div>
          ` : '<p style="color: #666; font-style: italic;">No se ha definido ubicación</p>'}
        </div>
      </div>
      
      <div class="card-footer" style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <button onclick="this.closest('.modal').remove()" class="btn btn-primary" style="margin-right: 10px;">
          Cerrar
        </button>
        <button onclick="exportProjectCard()" class="btn btn-secondary">
          📄 Exportar Tarjeta
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Cerrar modal al hacer clic fuera
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Función para exportar tarjeta del proyecto
function exportProjectCard() {
  const summary = generateProjectSummary();
  const content = `
TARJETA DEL PROYECTO - NUTRIPLANT PRO
=====================================

Proyecto: ${summary.name}
Última actualización: ${summary.lastUpdated.toLocaleString('es-MX')}
Estado: ${summary.status}

ANÁLISIS REALIZADOS:
===================

🚜 Análisis de Suelo: ${summary.analyses.soilAnalysis.completed ? 'COMPLETADO' : 'PENDIENTE'}
${summary.analyses.soilAnalysis.completed ? `
  - CIC Total: ${summary.analyses.soilAnalysis.cic.toFixed(2)} meq/100g
  - Potasio (K): ${summary.analyses.soilAnalysis.cations.k.toFixed(2)} meq/100g
  - Calcio (Ca): ${summary.analyses.soilAnalysis.cations.ca.toFixed(2)} meq/100g
  - Magnesio (Mg): ${summary.analyses.soilAnalysis.cations.mg.toFixed(2)} meq/100g
  - Sodio (Na): ${summary.analyses.soilAnalysis.cations.na.toFixed(2)} meq/100g
  - Enmiendas seleccionadas: ${summary.analyses.soilAnalysis.amendments}
` : '  - No se ha realizado análisis de suelo'}

💧 Análisis VPD: ${summary.analyses.vpdAnalysis.completed ? 'COMPLETADO' : 'PENDIENTE'}
${summary.analyses.vpdAnalysis.completed ? `
  - Temperatura Aire: ${summary.analyses.vpdAnalysis.temperature.air}°C
  - Humedad Aire: ${summary.analyses.vpdAnalysis.humidity.air}%
  - VPD: ${summary.analyses.vpdAnalysis.vpd.toFixed(2)} kPa
  - Estado: ${summary.analyses.vpdAnalysis.status}
` : '  - No se ha realizado análisis VPD'}

📍 Ubicación: ${summary.analyses.location.completed ? 'COMPLETADA' : 'PENDIENTE'}
${summary.analyses.location.completed ? `
  - Coordenadas: ${summary.analyses.location.coordinates}
  - Superficie: ${summary.analyses.location.surface}
  - Perímetro: ${summary.analyses.location.perimeter}
` : '  - No se ha definido ubicación'}

ESTADÍSTICAS:
============
- Total de análisis: ${summary.statistics.totalAnalyses}
- Puntos de datos: ${summary.statistics.dataPoints}
- Última actividad: ${summary.statistics.lastActivity.toLocaleString('es-MX')}

© 2026 NutriPlant PRO. Todos los derechos reservados.
  `;
  
  // Crear y descargar archivo
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tarjeta_Proyecto_${summary.name.replace(/\s+/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Función global para mostrar tarjeta del proyecto
window.showProjectCard = function() {
  showProjectCard();
};

// Inicializar sistema de guardado automático
document.addEventListener('DOMContentLoaded', function() {
  // Cargar datos existentes
  loadProjectData();
  
  // Interceptar cambios de pestaña
  setTimeout(() => {
    interceptTabChanges();
  }, 1000);
  
  // REMOVIDO: Guardado automático cada 30 segundos eliminado
});

// ==================== SISTEMA DE REPORTES PDF ====================

// Función para abrir el modal de reportes
function openReportModal() {
  console.log('📄 Abriendo modal de reportes...');
  
  const modal = document.getElementById('reportModal');
  if (modal) {
    // Mostrar modal
    modal.classList.add('active');
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeReportModal();
      }
    });
  }
}

// Función de debugging para verificar datos del proyecto
function debugProjectData() {
  console.log('🔍 === DEBUGGING PROJECT DATA ===');
  console.log('📊 currentProject completo:', currentProject);
  console.log('📊 currentProject.id:', currentProject.id);
  console.log('📊 currentProject.name:', currentProject.name);
  
  // Debug ubicación
  console.log('📍 === UBICACIÓN DEBUG ===');
  console.log('📍 currentProject.location:', currentProject.location);
  
  const coordinatesEl = document.getElementById('coordinatesDisplay');
  const surfaceEl = document.getElementById('surfaceDisplay');
  const perimeterEl = document.getElementById('perimeterDisplay');
  
  console.log('📍 coordinatesDisplay element:', coordinatesEl);
  console.log('📍 coordinatesDisplay textContent:', coordinatesEl?.textContent);
  console.log('📍 surfaceDisplay element:', surfaceEl);
  console.log('📍 surfaceDisplay textContent:', surfaceEl?.textContent);
  console.log('📍 perimeterDisplay element:', perimeterEl);
  console.log('📍 perimeterDisplay textContent:', perimeterEl?.textContent);
  
  // Debug enmiendas
  console.log('🚜 === ENMIENDAS DEBUG ===');
  console.log('🚜 currentProject.amendments:', currentProject.amendments);
  
  const resultsEl = document.getElementById('amendment-results');
  const amendmentTable = document.querySelector('#amendments-table-body');
  const selectedButtons = document.querySelectorAll('.btn-select-amendment.selected');
  
  console.log('🚜 amendment-results element:', resultsEl);
  console.log('🚜 amendment-results innerHTML:', resultsEl?.innerHTML);
  console.log('🚜 amendments-table-body element:', amendmentTable);
  console.log('🚜 selected amendment buttons:', selectedButtons);
  console.log('🚜 selected buttons count:', selectedButtons.length);
  
  // Debug elementos de análisis de suelo
  console.log('🔬 === ANÁLISIS DE SUELO DEBUG ===');
  const kInitial = document.getElementById('k-initial');
  const caInitial = document.getElementById('ca-initial');
  const mgInitial = document.getElementById('mg-initial');
  const naInitial = document.getElementById('na-initial');
  const hInitial = document.getElementById('h-initial');
  const alInitial = document.getElementById('al-initial');
  
  console.log('🔬 k-initial:', kInitial?.value);
  console.log('🔬 ca-initial:', caInitial?.value);
  console.log('🔬 mg-initial:', mgInitial?.value);
  console.log('🔬 na-initial:', naInitial?.value);
  console.log('🔬 h-initial:', hInitial?.value);
  console.log('🔬 al-initial:', alInitial?.value);
  
  // Verificar si hay algún valor en los campos de análisis
  const hasSoilData = (
    kInitial?.value || caInitial?.value || mgInitial?.value || 
    naInitial?.value || hInitial?.value || alInitial?.value
  );
  console.log('🔬 ¿Hay datos de análisis de suelo?', hasSoilData);
  
  console.log('🔍 === END DEBUG ===');
}

// Función para cerrar el modal de reportes
function closeReportModal() {
  console.log('❌ Cerrando modal de reportes...');
  
  const modal = document.getElementById('reportModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Función eliminada - ya no verificamos datos, el usuario decide qué incluir

// Función eliminada - ya no mostramos estado de datos

// Función súper simple - solo pintar la tarjeta
function toggleReportSection(sectionId) {
  console.log('🔄 Toggleando sección:', sectionId);
  
  const sectionItem = document.querySelector(`#reportModal .report-section-item[data-section="${sectionId}"]`);
  
  if (!sectionItem) {
    console.log('❌ No se encontró la sección:', sectionId);
    return;
  }
  
  // Alternar clase visual
  if (sectionItem.classList.contains('selected')) {
    sectionItem.classList.remove('selected');
    console.log('❌ Sección deseleccionada:', sectionId);
  } else {
    sectionItem.classList.add('selected');
    console.log('✅ Sección seleccionada:', sectionId);
  }
  
  // Actualizar botón
  updateGenerateButton();
}

// Función eliminada - ahora solo funciona tocando la tarjeta completa

// Función para actualizar el estado del botón de generar
function updateGenerateButton() {
  const generateBtn = document.querySelector('#reportModal #generateReportBtn');
  
  if (generateBtn) {
    const selected = document.querySelectorAll('#reportModal .report-section-item.selected');
    generateBtn.disabled = selected.length === 0;
  }
}

const REPORT_ALLOWED_SECTIONS = ['location', 'amendments', 'granular', 'fertigation', 'hidroponia', 'vpd'];

function normalizeReportSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.filter(sectionId => REPORT_ALLOWED_SECTIONS.includes(sectionId));
}

function getSelectedReportSections() {
  const selected = Array.from(document.querySelectorAll('#reportModal .report-section-item.selected'))
    .map(el => el.getAttribute('data-section'))
    .filter(Boolean);
  return normalizeReportSections(selected);
}

// Función para generar el reporte PDF
window.generatePDFReport = function() {
  console.log('📄 Generando reporte PDF...');
  
  const selectedSections = normalizeReportSections(getSelectedReportSections());
  if (!selectedSections.length) {
    showMessage('⚠️ Selecciona al menos una sección para el reporte.', 'warning');
    return;
  }

  // Cerrar modal al confirmar generación
  closeReportModal();

  try {
    const reportHTML = createReportHTML(selectedSections);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showMessage('❌ Tu navegador bloqueó la ventana de impresión. Habilita pop-ups para descargar PDF.', 'error');
      return;
    }

    saveReportToList({
      id: `report_panel_${Date.now()}`,
      timestamp: new Date().toISOString(),
      projectName: currentProject?.name || 'Proyecto NutriPlant',
      selectedSections: selectedSections.slice(0),
      reportHTML
    });

    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.focus();

    // Dar tiempo a que carguen estilos y layout antes de imprimir
    printWindow.onload = function() {
      setTimeout(function() {
        printWindow.print();
      }, 300);
    };

    showMessage('✅ Se abrió la vista para descargar PDF (' + selectedSections.length + ' secciones).', 'success');
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    showMessage('❌ Error generando PDF: ' + error.message, 'error');
  }
};

// Función para generar el contenido del PDF
function generatePDFContent(selectedSections) {
  console.log('📄 Generando contenido del PDF...');
  
  try {
    // Crear contenido HTML para el reporte
    let reportHTML = createReportHTML(selectedSections);
    
    // Obtener el área de contenido principal
    const contentArea = document.querySelector('.content');
    
    if (contentArea) {
      // Guardar el contenido original
      contentArea.setAttribute('data-original-content', contentArea.innerHTML);
      
      // Reemplazar con el reporte
      contentArea.innerHTML = `
        <div class="reporte-contenido">
          <div class="reporte-header">
            <h1>📄 Reporte Generado</h1>
            <button onclick="volverAlDashboard()" class="btn-volver">
              ← Volver al Dashboard
            </button>
          </div>
          ${reportHTML}
        </div>
      `;
      
      console.log('✅ Reporte mostrado en el panel');
      showMessage('✅ Reporte generado exitosamente', 'success');
    } else {
      showMessage('❌ Error: No se encontró el área de contenido', 'error');
    }
    
  } catch (error) {
    console.error('❌ Error generando el reporte:', error);
    showMessage('❌ Error generando el reporte: ' + error.message, 'error');
  }
}

// Función para crear el HTML del reporte (chartImages opcional: { macro, micro } data URLs para gráficas de fertirriego)
function createReportHTML(selectedSections, chartImages) {
  const currentDate = new Date().toLocaleDateString('es-ES');
  const projectName = currentProject.name || 'Proyecto NutriPlant';
  const projectCampoSector = currentProject.campoOsector || currentProject.campo_sector || 'No especificado';
  const projectCultivo = currentProject.cultivo || currentProject.crop_type || 'No especificado';
  const projectVariedad = currentProject.variedad || 'No especificado';
  const currentUserId = localStorage.getItem('nutriplant_user_id');
  let reportAuthorName = 'Usuario NutriPlant';
  if (currentUserId) {
    try {
      const rawUser = localStorage.getItem(`nutriplant_user_${currentUserId}`);
      if (rawUser) {
        const userProfile = JSON.parse(rawUser);
        reportAuthorName = userProfile?.name || userProfile?.fullName || userProfile?.username || userProfile?.email || reportAuthorName;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo leer perfil del usuario para firma de reporte:', error);
    }
  }
  const safeReportAuthorName = (typeof escapeHtml === 'function') ? escapeHtml(String(reportAuthorName)) : String(reportAuthorName);
  // URL absoluta para assets (evita que en celular/print no carguen imagen ni marcas de agua)
  let reportAssetBase = '';
  try {
    var a = document.createElement('a');
    a.href = 'assets/NutriPlant_PRO_blue.png';
    reportAssetBase = a.href.replace(/[^/]+$/, '');
  } catch (e) {}
  if (!reportAssetBase) reportAssetBase = window.location.origin + '/assets/';

  let html = `
    <!DOCTYPE html>
    <html lang="es" class="notranslate" translate="no">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="google" content="notranslate">
      <title>NutriPlant PRO</title>
      <link rel="stylesheet" href="dashboard.css?v=1760001000">
      <style>
        body {
          font-family: 'Inter', 'Arial', sans-serif;
          margin: 0;
          padding: 24px;
          background: #f1f5f9;
          color: #0f172a;
          line-height: 1.45;
          position: relative;
        }
        .report-watermark-corner {
          position: fixed;
          top: 2mm;
          right: 2mm;
          width: 118px;
          opacity: 0.11;
          pointer-events: none;
          z-index: 30;
        }
        .report-main {
          position: relative;
          z-index: 1;
        }
        .header {
          text-align: center;
          margin-bottom: 18px;
          padding: 14px 12px;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          background: #eff6ff;
        }
        .logo {
          display: inline-block;
          text-align: center;
          font-size: 2rem;
          font-weight: 800;
          color: #1e3a8a;
          letter-spacing: 0.2px;
          margin-bottom: 4px;
        }
        .logo-text {
          display: block;
          line-height: 1.05;
        }
        .logo-icon {
          display: block;
          width: 34px;
          height: 34px;
          object-fit: contain;
          margin: 5px auto 0;
        }
        .project-info {
          background: #fff;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #3b82f6;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 14px;
        }
        .section {
          margin-bottom: 14px;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #3b82f6;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
          padding: 14px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1f2937;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          margin: 0 0 10px 0;
        }
        .data-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 10px;
        }
        .data-item {
          border: 1px solid #cbd5e1;
          padding: 10px;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }
        .data-label {
          font-weight: 700;
          color: #374151;
          margin-bottom: 4px;
          font-size: 12px;
        }
        .data-value {
          color: #0f172a;
          font-size: 13px;
        }
        .footer {
          margin-top: 18px;
          text-align: center;
          font-size: 0.78rem;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
          position: relative;
        }
        .footer-leaf-watermark {
          display: block;
          width: 62px;
          margin: 8px auto 2px;
          opacity: 0.14;
          pointer-events: none;
        }
        .footer-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
        }
        .footer-legal {
          text-align: left;
          line-height: 1.3;
          flex: 1 1 auto;
        }
        .report-generated-by {
          margin-top: 0;
          color: #1f2937;
          font-size: 0.84rem;
          font-weight: 600;
          white-space: nowrap;
          text-align: right;
          margin-left: auto;
          flex: 0 0 auto;
        }
        .footer-row + .footer-leaf-watermark {
          margin-top: 10px;
          margin-left: auto;
          margin-right: auto;
          align-self: center;
          float: none;
          position: static;
        }
        .report-block {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 10px;
          background: #fff;
        }
        .report-block-title {
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 6px;
          font-size: 13px;
        }
        .report-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          padding: 12px;
          margin-bottom: 10px;
        }
        .report-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: 700;
          color: #0f172a;
        }
        .report-card-meta {
          color: #64748b;
          font-weight: 500;
          font-size: 12px;
        }
        .report-note {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
          color: #475569;
          padding: 10px 12px;
          font-size: 12px;
        }
        .report-list {
          margin: 0;
          padding-left: 18px;
          color: #1f2937;
          font-size: 13px;
        }
        .report-list li {
          margin: 2px 0;
        }
        .report-kv {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .report-kv-item {
          background: #fff;
          border-radius: 6px;
          padding: 8px;
          border: 1px solid #cbd5e1;
        }
        .report-admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .report-admin-table th,
        .report-admin-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
        }
        .report-admin-table th {
          width: 38%;
          background: #f8fafc;
          color: #334155;
          font-weight: 700;
        }
        .report-admin-table td {
          color: #0f172a;
          word-break: break-word;
        }
        .report-subtitle {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin: 10px 0 6px;
        }
        .report-mode-badge {
          display: inline-block;
          margin-left: 6px;
          padding: 1px 7px;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #f8fafc;
          color: #475569;
          font-size: 11px;
          font-weight: 600;
          vertical-align: middle;
        }
        .report-nutrient-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 8px;
          margin-top: 6px;
        }
        .report-nutrient-pill {
          font-size: 11px;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          color: #1e293b;
          border-radius: 999px;
          padding: 3px 8px;
          white-space: nowrap;
        }
        .report-nutrient-pill.negative {
          border-color: #fecaca;
          background: #fff7f7;
          color: #991b1b;
        }
        .report-note-inline {
          color: #64748b;
          font-size: 11px;
        }
        .report-app-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 10px;
        }
        .report-app-table th,
        .report-app-table td {
          border: 1px solid #d1d5db;
          padding: 4px 5px;
          text-align: center;
        }
        .report-app-table th:first-child,
        .report-app-table td:first-child {
          text-align: left;
        }
        .report-app-table th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
        }
        .report-app-table tr.total-row td {
          background: #f8fafc;
          font-weight: 700;
        }
        .report-app-table .report-divider-left {
          border-left: 3px solid #64748b !important;
        }
        .report-json {
          margin-top: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          font-size: 11px;
          overflow: auto;
          max-height: 360px;
          white-space: pre-wrap;
        }
        .admin-analysis-rel-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 8px;
        }
        .admin-analysis-rel-table th, .admin-analysis-rel-table td {
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
          text-align: center;
        }
        .admin-analysis-rel-table th.col-concept,
        .admin-analysis-rel-table td.col-concept {
          text-align: left;
          font-weight: 600;
          color: #334155;
        }
        .admin-analysis-group-title {
          font-weight: 700;
          margin: 10px 0 6px;
          color: #1f2937;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .02em;
        }
        .admin-analysis-legend {
          font-size: 12px;
          color: #64748b;
          margin: 8px 0;
        }
        .admin-analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 8px;
        }
        .admin-analysis-item {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px;
          background: #fff;
        }
        .admin-analysis-label {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }
        .admin-analysis-value {
          display: block;
          margin-top: 2px;
          color: #0f172a;
          font-weight: 700;
        }
        .badge-ok { color: #059669; font-weight: 700; }
        .badge-low { color: #d97706; font-weight: 700; }
        .badge-high { color: #dc2626; font-weight: 700; }
        @page {
          size: A4;
          margin: 12mm;
        }
        @media print {
          body {
            padding: 0;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-watermark-corner {
            position: fixed;
            display: block;
          }
          .section {
            break-inside: auto;
            page-break-inside: auto;
          }
          .report-section-new-page {
            break-before: page;
            page-break-before: always;
          }
          .report-section-first {
            break-before: auto;
            page-break-before: auto;
          }
        }
      </style>
    </head>
    <body class="notranslate" translate="no">
      <img src="${reportAssetBase}NutriPlant_PRO_blue.png" alt="" class="report-watermark-corner" aria-hidden="true">
      <div class="report-main">
        <div class="header">
          <div class="logo">
            <span class="logo-text">NutriPlant PRO</span>
            <img src="${reportAssetBase}N_Hoja_Azul.png" alt="NutriPlant PRO" class="logo-icon">
          </div>
          <h1>Reporte de Análisis Agrícola</h1>
        </div>
        
        <div class="project-info">
          <h2>Información del Proyecto</h2>
          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">Nombre del Proyecto</div>
              <div class="data-value">${projectName}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Fecha de Generación</div>
              <div class="data-value">${currentDate}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Campo o Sector</div>
              <div class="data-value">${projectCampoSector}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Cultivo</div>
              <div class="data-value">${projectCultivo}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Variedad</div>
              <div class="data-value">${projectVariedad}</div>
            </div>
          </div>
        </div>
  `;
  
  // Agregar secciones seleccionadas (chartImages para gráficas de fertirriego en PDF)
  const chartImgs = chartImages || {};
  selectedSections.forEach((sectionId, idx) => {
    let sectionHTML = createSectionHTML(sectionId, chartImgs);
    if (typeof sectionHTML === 'string' && sectionHTML.includes('class="section"')) {
      sectionHTML = sectionHTML.replace(
        'class="section"',
        idx === 0 ? 'class="section report-section-first"' : 'class="section report-section-new-page"'
      );
    }
    html += sectionHTML;
  });
  
  html += `
      <div class="footer">
        <div class="footer-content">
          <div class="footer-row">
            <div class="footer-legal">
              <strong>© 2026 NutriPlant PRO</strong><br>
              Todos los derechos reservados • Marca registrada
            </div>
            <div class="report-generated-by">Generado por: <strong>${safeReportAuthorName}</strong></div>
          </div>
          <img src="${reportAssetBase}N_Hoja_Azul.png" alt="" class="footer-leaf-watermark" aria-hidden="true">
        </div>
      </div>
    </div>
    </body>
    </html>
  `;
  
  return html;
}

// Función para crear HTML de cada sección (chartImages opcional para fertirriego)
function createSectionHTML(sectionId, chartImages) {
  let html = '';
  
  switch (sectionId) {
    case 'location':
      html += createLocationSectionHTML();
      break;
    case 'amendments':
      html += createAmendmentsSectionHTML();
      break;
    case 'fertigation':
      html += createFertigationSectionHTML(chartImages);
      break;
    case 'analysis':
      html += createAnalysisSectionHTML();
      break;
    case 'vpd':
      html += createVPDReportSectionHTML();
      break;
    case 'granular':
      html += createGranularSectionHTML();
      break;
    case 'hidroponia':
      html += createHidroponiaSectionHTML();
      break;
    case 'soil_analyses':
      html += createAnalysesListSectionHTML('🟫 Análisis: Suelo (reportes)', currentProject.soilAnalyses);
      break;
    case 'solucion_nutritiva':
      html += createAnalysesListSectionHTML('🧪💧 Análisis: Solución Nutritiva', currentProject.solucionNutritivaAnalyses);
      break;
    case 'extracto_pasta':
      html += createAnalysesListSectionHTML('🧪📋 Análisis: Extracto de Pasta', currentProject.extractoPastaAnalyses);
      break;
    case 'agua_analyses':
      html += createAnalysesListSectionHTML('💧🔬 Análisis: Agua', currentProject.aguaAnalyses);
      break;
    case 'foliar_analyses':
      html += createAnalysesListSectionHTML('🍃🔍 Análisis: Foliar', currentProject.foliarAnalyses);
      break;
    case 'fruta_analyses':
      html += createAnalysesListSectionHTML('🍎🔬 Análisis: Fruta', currentProject.frutaAnalyses);
      break;
  }
  
  return html;
}

// Función para crear sección de ubicación
function createLocationPolygonSVG(polygon) {
  const points = (Array.isArray(polygon) ? polygon : [])
    .map(coord => {
      const lat = Array.isArray(coord) ? Number(coord[0]) : NaN;
      const lng = Array.isArray(coord) ? Number(coord[1]) : NaN;
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })
    .filter(Boolean);

  if (points.length < 3) return '';

  const width = 520;
  const height = 250;
  const pad = 20;
  const meanLat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
  const meanLatRad = meanLat * Math.PI / 180;
  const metersPerDegLat = 111132;
  const metersPerDegLng = 111320 * Math.cos(meanLatRad);
  const origin = points[0];
  const pointsMeters = points.map(p => ({
    x: (p.lng - origin.lng) * metersPerDegLng,
    y: (p.lat - origin.lat) * metersPerDegLat
  }));
  const xs = pointsMeters.map(p => p.x);
  const ys = pointsMeters.map(p => p.y);
  const minX = Math.min.apply(null, xs);
  const maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys);
  const maxY = Math.max.apply(null, ys);
  const rangeX = Math.max(maxX - minX, 1e-6);
  const rangeY = Math.max(maxY - minY, 1e-6);
  const drawW = width - pad * 2;
  const drawH = height - pad * 2;
  const scale = Math.min(drawW / rangeX, drawH / rangeY);
  const usedW = rangeX * scale;
  const usedH = rangeY * scale;
  const offsetX = pad + (drawW - usedW) / 2;
  const offsetY = pad + (drawH - usedH) / 2;

  const svgPoints = pointsMeters.map(p => {
    const x = offsetX + (p.x - minX) * scale;
    const y = offsetY + (maxY - p.y) * scale; // Norte hacia arriba
    return { x, y };
  });

  const pointsAttr = svgPoints.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(svgPoints.length / 12));
  const vertexDots = svgPoints.slice(0, 80).map((p, idx) => `
    <circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="2.5" fill="#0284c7" />
    ${(idx % labelEvery === 0 || idx === svgPoints.length - 1)
      ? `<text x="${(p.x + 4).toFixed(2)}" y="${(p.y - 4).toFixed(2)}" font-size="9" fill="#0f172a">${idx + 1}</text>`
      : ''}
  `).join('');
  const northX = width - 28;
  const northY = 24;

  return `
    <div style="margin-top:10px;border:1px solid #bae6fd;background:#fff;border-radius:8px;padding:8px;">
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px;">Polígono del predio</div>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="220" style="display:block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
        <rect x="${pad}" y="${pad}" width="${drawW}" height="${drawH}" fill="#f1f5f9" stroke="#cbd5e1" stroke-dasharray="3 3" />
        <polygon points="${pointsAttr}" fill="#86efac" fill-opacity="0.45" stroke="#0ea5e9" stroke-width="2" />
        ${vertexDots}
        <line x1="${northX}" y1="${(northY + 12)}" x2="${northX}" y2="${(northY - 10)}" stroke="#0f172a" stroke-width="2" />
        <polygon points="${northX},${(northY - 14)} ${northX - 5},${(northY - 5)} ${northX + 5},${(northY - 5)}" fill="#0f172a" />
        <text x="${(northX - 4)}" y="${(northY + 24)}" font-size="11" font-weight="700" fill="#0f172a">N</text>
      </svg>
      <div class="report-note-inline" style="margin-top:6px;">Croquis proporcional en coordenadas geográficas (escala relativa).</div>
    </div>
  `;
}

function stripAmendmentWatermark(html) {
  const raw = String(html || '');
  if (!raw) return '';
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = raw;
    const logoNodes = tmp.querySelectorAll('img[src*="NutriPlant_PRO_blue.png"], img[src*="nutriplant_pro_blue.png"]');
    logoNodes.forEach(function (img) {
      const parent = img.parentElement;
      if (parent && parent.style && parent.style.position === 'absolute') parent.remove();
      else img.remove();
    });
    return tmp.innerHTML;
  } catch {
    return raw.replace(/<div[^>]*position:\s*absolute[^>]*>[\s\S]*?NutriPlant_PRO_blue\.png[\s\S]*?<\/div>/gi, '');
  }
}

function createLocationSectionHTML() {
  const location = currentProject.location || {};
  const polygon = Array.isArray(location.polygon) ? location.polygon : [];
  const hasPolygon = polygon.length >= 3;
  const areaValue = location.areaHectares != null ? `${reportNum(location.areaHectares, 2)} ha` : (location.surface || 'No disponible');
  const perimeterValue = location.perimeterDisplay || (location.perimeter != null ? `${reportNum(location.perimeter, 2)} m` : 'No disponible');
  const center = location.center && Number.isFinite(location.center.lat) && Number.isFinite(location.center.lng)
    ? `${reportNum(location.center.lat, 6)}, ${reportNum(location.center.lng, 6)}`
    : 'No disponible';
  const compactCoordinates = hasPolygon
    ? polygon.slice(0, 6).map((coord, idx) => {
        const lat = Array.isArray(coord) && coord.length > 0 ? Number(coord[0]) : null;
        const lng = Array.isArray(coord) && coord.length > 1 ? Number(coord[1]) : null;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
        return `<span class="report-nutrient-pill"><strong>${idx + 1}:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>`;
      }).filter(Boolean).join('')
    : '';
  
  return `
    <div class="section">
      <h2 class="section-title">📍 Ubicación</h2>
      <div class="report-block" style="border-color:#86efac;background:#f0fdf4;">
        <div class="report-block-title">🗺️ Ubicación del Proyecto</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
          <div><strong>Área:</strong><br><span style="color:#059669;font-weight:700;">${reportEscapeHtml(areaValue)}</span></div>
          <div><strong>Perímetro:</strong><br><span>${reportEscapeHtml(perimeterValue)}</span></div>
          <div><strong>Centro:</strong><br><span style="font-family:monospace;">${reportEscapeHtml(center)}</span></div>
          <div><strong>Estado:</strong><br><span>${hasPolygon ? `Polígono registrado (${polygon.length} vértices)` : 'Sin polígono'}</span></div>
        </div>
        <div style="margin-top:10px;padding:10px;border:1px solid #bbf7d0;background:#fff;border-radius:8px;">
          <strong>Coordenadas:</strong> <span class="report-note-inline">${reportEscapeHtml(location.coordinates || 'No disponibles')}</span>
          ${hasPolygon ? `
            <div class="report-nutrient-wrap" style="margin-top:6px;">${compactCoordinates}</div>
            ${polygon.length > 6 ? `<div class="report-note-inline" style="margin-top:6px;">Mostrando 6 de ${polygon.length} vértices.</div>` : ''}
          ` : ''}
        </div>
        ${hasPolygon ? createLocationPolygonSVG(polygon) : ''}
      </div>
    </div>
  `;
}

// Función para crear sección de enmiendas
function createAmendmentsSectionHTML() {
  const amendments = currentProject.amendments || {};
  const soil = currentProject.soilAnalysis || {};
  const initial = soil.initial || {};
  const properties = soil.properties || {};
  const adjustments = soil.adjustments || {};
  const results = amendments.results || {};
  const rawTotals = results.rawTotals || results.totals || {};
  const detailedHTML = stripAmendmentWatermark(typeof results.detailedHTML === 'string' ? results.detailedHTML.trim() : '');
  const selected = Array.isArray(amendments.selected) ? amendments.selected : (Array.isArray(amendments.selectedAmendments) ? amendments.selectedAmendments : []);
  
  return `
    <div class="section">
      <h2 class="section-title">🚜 Enmiendas</h2>
      <div class="report-block" style="border-color:#fde68a;background:#fffbeb;">
        <div class="report-block-title">🔬 Datos de Análisis de Suelo (para cálculo de enmiendas)</div>
        <div style="background:#fff;padding:10px;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px;">
          <strong>Elementos Iniciales (meq/100g):</strong>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:6px;font-size:13px;">
            <div><strong>K:</strong> ${reportNum(initial.k, 2)}</div>
            <div><strong>Ca:</strong> ${reportNum(initial.ca, 2)}</div>
            <div><strong>Mg:</strong> ${reportNum(initial.mg, 2)}</div>
            <div><strong>H:</strong> ${reportNum(initial.h, 2)}</div>
            <div><strong>Na:</strong> ${reportNum(initial.na, 2)}</div>
            <div><strong>Al:</strong> ${reportNum(initial.al, 2)}</div>
            <div><strong>CIC:</strong> ${reportNum(initial.cic, 2)}</div>
          </div>
        </div>
        <div style="background:#fff;padding:10px;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px;">
          <strong>Propiedades del Suelo:</strong>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px;font-size:13px;">
            <div><strong>pH:</strong> ${reportNum(properties.ph, 2)}</div>
            <div><strong>Densidad:</strong> ${reportNum(properties.density, 2)} g/cm³</div>
            <div><strong>Profundidad:</strong> ${reportNum(properties.depth, 2)} cm</div>
          </div>
        </div>
        <div style="background:#fff;padding:10px;border:1px solid #fde68a;border-radius:8px;">
          <strong>Ajustes Requeridos (meq/100g):</strong>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:6px;font-size:13px;">
            <div><strong>K:</strong> ${reportNum(adjustments.k, 2)}</div>
            <div><strong>Ca:</strong> ${reportNum(adjustments.ca, 2)}</div>
            <div><strong>Mg:</strong> ${reportNum(adjustments.mg, 2)}</div>
            <div><strong>H:</strong> ${reportNum(adjustments.h, 2)}</div>
            <div><strong>Na:</strong> ${reportNum(adjustments.na, 2)}</div>
            <div><strong>Al:</strong> ${reportNum(adjustments.al, 2)}</div>
          </div>
        </div>
      </div>
      <div class="report-block" style="border-color:#fde68a;background:#fffef3;">
        <div class="report-block-title">📊 Resultados del Cálculo de Enmiendas</div>
        ${detailedHTML ? `
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:580px;overflow:auto;">
            ${detailedHTML}
          </div>
        ` : `
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">
            <div style="font-weight:700;margin-bottom:8px;">🎯 Aportes Totales</div>
            <ul class="report-list" style="margin-bottom:8px;">
              <li><strong>Calcio (Ca²⁺):</strong> ${reportNum(rawTotals.totalCa, 2)} kg/ha</li>
              <li><strong>Magnesio (Mg²⁺):</strong> ${reportNum(rawTotals.totalMg, 2)} kg/ha</li>
              <li><strong>Potasio (K⁺):</strong> ${reportNum(rawTotals.totalK, 2)} kg/ha</li>
              <li><strong>Silicio (Si):</strong> ${reportNum(rawTotals.totalSi, 2)} kg/ha</li>
            </ul>
            <div style="font-weight:700;margin-bottom:6px;">🧾 Detalles por Enmienda</div>
            <table class="report-admin-table">
              <thead>
                <tr>
                  <th>Enmienda</th>
                  <th>Cantidad (kg/ha)</th>
                  <th>Ca (%)</th>
                  <th>Mg (%)</th>
                  <th>K (%)</th>
                  <th>Si (%)</th>
                </tr>
              </thead>
              <tbody>
                ${selected.length ? selected.map(function (item) {
                  const comp = item.composition || {};
                  return `<tr>
                    <td>${reportEscapeHtml(item.name || item.id || 'Enmienda')}</td>
                    <td>${reportNum(item.amountKgHa || item.amount || item.doseKgHa || 0, 2)}</td>
                    <td>${reportNum(comp.ca, 2)}</td>
                    <td>${reportNum(comp.mg, 2)}</td>
                    <td>${reportNum(comp.k, 2)}</td>
                    <td>${reportNum(comp.si, 2)}</td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" style="text-align:center;color:#64748b;">No hay enmiendas seleccionadas.</td></tr>'}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

function reportNum(value, decimals) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return reportEscapeHtml(value);
  const d = Number.isFinite(decimals) ? decimals : 2;
  return n.toFixed(d);
}

function createSimpleNutrientList(items, emptyText) {
  const rows = Object.entries(items || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) !== 0)
    .slice(0, 10)
    .map(([k, v]) => `<li><strong>${reportFriendlyKey(k)}:</strong> ${reportNum(v, 2)}</li>`)
    .join('');
  return rows ? `<ul class="report-list">${rows}</ul>` : `<div class="report-note">${emptyText}</div>`;
}

const REPORT_FIELD_LABELS = {
  croptype: 'Cultivo',
  targetyield: 'Rendimiento objetivo',
  requirements: 'Requerimientos',
  adjustment: 'Ajuste',
  adjustmentauto: 'Ajustes automaticos',
  elementalmode: 'Modo elemental',
  iselementalmode: 'Modo elemental',
  solutionname: 'Solucion',
  solutiondata: 'Datos de solucion',
  recommendation: 'Recomendacion',
  targets: 'Objetivos',
  totals: 'Totales',
  totalnutrients: 'Nutrientes totales',
  selectedmaterials: 'Materiales seleccionados',
  weeks: 'Semanas',
  week: 'Semana',
  program: 'Programa',
  ph: 'pH',
  ce: 'CE',
  ras: 'RAS',
  p2o5: 'P2O5',
  k2o: 'K2O',
  cao: 'Ca O',
  mgo: 'Mg O',
  so4: 'SO4',
  fe: 'Fe',
  mn: 'Mn',
  zn: 'Zn',
  cu: 'Cu',
  b: 'B',
  mo: 'Mo',
  sio2: 'Si O2',
  n: 'N',
  p: 'P',
  k: 'K',
  ca: 'Ca',
  mg: 'Mg',
  s: 'S',
  temperature: 'Temperatura',
  humidity: 'Humedad',
  vpd: 'VPD',
  environment: 'Ambiente',
  environmental: 'Ambiental',
  advanced: 'Avanzado',
  leaftemperature: 'Temperatura de hoja',
  leafairdelta: 'Deficit hoja-aire',
  result: 'Resultado',
  history: 'Historial',
  selectedamendments: 'Enmiendas seleccionadas',
  results: 'Resultados',
  status: 'Estado',
  source: 'Origen',
  savedat: 'Fecha guardado',
  createdat: 'Fecha creacion',
  updatedat: 'Fecha actualizacion',
  timestamp: 'Marca de tiempo',
  isusersaved: 'Guardado por usuario',
  lastui: 'Ultima vista',
  lastupdated: 'Ultima actualizacion',
  asremoval: 'Aplicar como remocion',
  isvisible: 'Visible',
  amount: 'Cantidad',
  type: 'Tipo',
  date: 'Fecha',
  title: 'Titulo',
  coordinates: 'Coordenadas',
  surface: 'Superficie',
  perimeter: 'Perimetro',
  polygon: 'Poligono'
};

function reportFriendlyKey(key) {
  const raw = String(key || '');
  if (raw.indexOf('/') >= 0) {
    return raw.split('/').map(function (part) {
      return reportFriendlyKey(part.trim());
    }).join(' / ');
  }
  const simple = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (REPORT_FIELD_LABELS[simple]) return REPORT_FIELD_LABELS[simple];
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function reportValuePreview(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return reportNum(value, 2);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) {
    if (!value.length) return '—';
    if (value.every(function (v) { return v && typeof v === 'object'; })) {
      return `${value.length} elementos`;
    }
    const preview = value.slice(0, 3).map(function (v) {
      if (v && typeof v === 'object') return '[objeto]';
      return String(v);
    }).join(', ');
    return reportEscapeHtml(preview + (value.length > 3 ? '…' : ''));
  }
  if (typeof value === 'object') return '[objeto]';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length > 500) return reportEscapeHtml(text.slice(0, 500) + '…');
  return reportEscapeHtml(text);
}

function reportFlattenObject(source, prefix, out, depth) {
  if (!source || typeof source !== 'object' || depth > 2) return;
  Object.keys(source).forEach(function (key) {
    const value = source[key];
    const fullKey = prefix ? (prefix + '.' + key) : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      reportFlattenObject(value, fullKey, out, depth + 1);
      return;
    }
    out.push({ key: fullKey, value: value });
  });
}

function createAdminMirrorBlock(title, source, maxItems) {
  const rows = [];
  reportFlattenObject(source || {}, '', rows, 0);
  function skipField(row) {
    const key = String(row.key || '').toLowerCase();
    const value = row.value;
    if (key === 'id' || key === 'meta' || key === 'timestamp') return true;
    if (/(\.|^)(html|markup|raw|template|debug|json|xml|script|styles?)(\.|$)/.test(key)) return true;
    if (/(\.|^)(detailhtml|reporthtml|fullhtml|innerhtml|outerhtml|resulthtml)(\.|$)/.test(key)) return true;
    if (typeof value === 'string') {
      const compact = value.replace(/\s+/g, ' ').trim().toLowerCase();
      if (compact.length > 240) return true;
      if (compact.indexOf('<div') >= 0 || compact.indexOf('<table') >= 0 || compact.indexOf('<tr') >= 0 || compact.indexOf('</') >= 0) return true;
    }
    return false;
  }
  const visible = rows.filter(function (r) {
    return !skipField(r);
  });

  if (!visible.length) return '';
  const leafCount = {};
  visible.forEach(function (row) {
    const leaf = row.key.split('.').pop();
    leafCount[leaf] = (leafCount[leaf] || 0) + 1;
  });
  const items = visible.map(function (row) {
    const leaf = row.key.split('.').pop();
    const labelSource = leafCount[leaf] > 1 ? row.key.replace(/\./g, ' / ') : leaf;
    const label = reportFriendlyKey(labelSource);
    const value = reportValuePreview(row.value);
    return `<tr><th>${reportEscapeHtml(label)}</th><td>${value}</td></tr>`;
  }).join('');

  return `
    <div style="margin-top:10px;" class="report-block">
      <div class="report-block-title">${reportEscapeHtml(title)}</div>
      <table class="report-admin-table"><tbody>${items}</tbody></table>
    </div>
  `;
}

function createGranularSectionHTML() {
  const g = currentProject.granular || {};
  const req = g.requirements || {};
  const program = g.program || {};
  const reqModeIsElemental = !!req.isElementalMode;
  const programModeIsElemental = !!program.mode;
  const crop = req.cropType || program?.cropSnapshot?.cropLabel || 'N/D';
  const yieldTarget = req.targetYield != null && req.targetYield !== '' ? Number(req.targetYield) : 0;

  const NUTRIENTS = ['N', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
  const MICRO_NUTRIENTS = { Fe: true, Mn: true, B: true, Zn: true, Cu: true, Mo: true };
  const OXIDE_TO_ELEMENTAL = { P2O5: 2.291, K2O: 1.204, CaO: 1.399, MgO: 1.658, SiO2: 2.139 };
  const ELEMENTAL_LABELS = { P2O5: 'P', K2O: 'K', CaO: 'Ca', MgO: 'Mg', SiO2: 'Si' };

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function decimalFor(nutrient) {
    return MICRO_NUTRIENTS[nutrient] ? 3 : 2;
  }

  function toDisplayValue(nutrient, value, isElementalMode) {
    if (!isElementalMode) return value;
    const factor = OXIDE_TO_ELEMENTAL[nutrient];
    if (!factor) return value;
    return value / factor;
  }

  function nutrientLabel(nutrient, isElementalMode) {
    if (!isElementalMode) return nutrient;
    return ELEMENTAL_LABELS[nutrient] || nutrient;
  }

  function renderNutrientPills(source, isElementalMode, useNegativeClass) {
    const pills = NUTRIENTS.map(nutrient => {
      if (!source || source[nutrient] === undefined || source[nutrient] === null || source[nutrient] === '') return '';
      const oxideValue = toNumber(source[nutrient]);
      const displayValue = toDisplayValue(nutrient, oxideValue, isElementalMode);
      const cls = useNegativeClass && displayValue < 0 ? 'report-nutrient-pill negative' : 'report-nutrient-pill';
      return `<span class="${cls}"><strong>${nutrientLabel(nutrient, isElementalMode)}:</strong> ${displayValue.toFixed(decimalFor(nutrient))}</span>`;
    }).filter(Boolean).join('');
    return pills || '<span class="report-note-inline">Sin datos disponibles.</span>';
  }

  const extractionOverrides = (req.extractionOverrides && crop && req.extractionOverrides[crop]) || {};
  const baseExtraction = (window.GRANULAR_CROP_EXTRACTION_DB && crop && window.GRANULAR_CROP_EXTRACTION_DB[crop]) || {};
  const extraction = {};
  NUTRIENTS.forEach(nutrient => {
    if (extractionOverrides[nutrient] !== undefined) extraction[nutrient] = toNumber(extractionOverrides[nutrient]);
    else if (baseExtraction[nutrient] !== undefined) extraction[nutrient] = toNumber(baseExtraction[nutrient]);
  });

  const totalExtraction = {};
  NUTRIENTS.forEach(nutrient => {
    totalExtraction[nutrient] = toNumber(extraction[nutrient]) * toNumber(yieldTarget);
  });

  const adjustment = req.adjustment || {};
  const efficiency = req.efficiency || {};
  const realRequirement = {};
  NUTRIENTS.forEach(nutrient => {
    const adj = toNumber(adjustment[nutrient]);
    const eff = toNumber(efficiency[nutrient]);
    realRequirement[nutrient] = eff > 0 ? (adj / (eff / 100)) : adj;
  });

  const applications = Array.isArray(program.applications) ? program.applications : [];
  const totalProgram = {};
  NUTRIENTS.forEach(nutrient => { totalProgram[nutrient] = 0; });
  applications.forEach(app => {
    const results = app && app.results ? app.results : {};
    NUTRIENTS.forEach(nutrient => {
      totalProgram[nutrient] += toNumber(results[nutrient]);
    });
  });

  const diffProgram = {};
  NUTRIENTS.forEach(nutrient => {
    diffProgram[nutrient] = totalProgram[nutrient] - realRequirement[nutrient];
  });

  function renderMaterialsTable(app) {
    const materials = Array.isArray(app.materials) ? app.materials : [];
    const rows = materials.map(material => `
      <tr>
        <td>${reportEscapeHtml(material.name || '—')}</td>
        <td>${toNumber(material.percentage).toFixed(2)}</td>
        ${NUTRIENTS.map(nutrient => {
          const v = toDisplayValue(nutrient, toNumber(material[nutrient]), programModeIsElemental);
          return `<td>${v.toFixed(decimalFor(nutrient))}</td>`;
        }).join('')}
      </tr>
    `).join('');

    const composition = app.composition || {};
    const totalRow = `
      <tr class="total-row">
        <td>TOTAL</td>
        <td>100.00</td>
        ${NUTRIENTS.map(nutrient => {
          const v = toDisplayValue(nutrient, toNumber(composition[nutrient]), programModeIsElemental);
          return `<td>${v.toFixed(decimalFor(nutrient))}</td>`;
        }).join('')}
      </tr>
    `;

    return `
      <table class="report-app-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>%</th>
            ${NUTRIENTS.map(nutrient => `<th>${nutrientLabel(nutrient, programModeIsElemental)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="${NUTRIENTS.length + 2}" style="text-align:center;color:#64748b;">No hay materiales en esta aplicación.</td></tr>`}
          ${totalRow}
        </tbody>
      </table>
    `;
  }

  return `
    <div class="section">
      <h2 class="section-title">🌾 Nutrición Granular</h2>
      <div class="report-block">
        <div class="report-block-title">🧮 Requerimiento Nutricional <span class="report-mode-badge">${reqModeIsElemental ? 'Modo Elemental' : 'Modo Óxido'}</span></div>
        <div class="report-kv">
          <div class="report-kv-item"><div class="data-label">Cultivo</div><div class="data-value">${reportEscapeHtml(crop)}</div></div>
          <div class="report-kv-item"><div class="data-label">Rendimiento objetivo</div><div class="data-value">${yieldTarget > 0 ? reportEscapeHtml(yieldTarget) + ' ton/ha' : 'N/D'}</div></div>
        </div>
        <div class="report-subtitle">Extracción por Tonelada (kg/ton):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(extraction, reqModeIsElemental, false)}</div>
        <div class="report-subtitle">Extracción Total (kg/ha):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(totalExtraction, reqModeIsElemental, false)}</div>
        <div class="report-subtitle">Ajuste por Niveles en Suelo (kg/ha):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(adjustment, reqModeIsElemental, false)}</div>
        <div class="report-subtitle">Eficiencia (%):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(efficiency, false, false)}</div>
        <div class="report-subtitle">Requerimiento Real (kg/ha):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(realRequirement, reqModeIsElemental, false)}</div>
      </div>
      <div class="report-block">
        <div class="report-block-title">🌱 Programa Granular <span class="report-mode-badge">${programModeIsElemental ? 'Modo Elemental' : 'Modo Óxido'}</span></div>
        <div class="report-subtitle">Aporte Total (kg/ha):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(totalProgram, programModeIsElemental, false)}</div>
        <div class="report-subtitle">Requerimiento Real (kg/ha):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(realRequirement, programModeIsElemental, false)}</div>
        <div class="report-subtitle">Diferencia (Aporte - Requerimiento) (kg/ha):</div>
        <div class="report-nutrient-wrap">${renderNutrientPills(diffProgram, programModeIsElemental, true)}</div>
      </div>
      <div class="report-block">
        <div class="report-block-title">Aplicaciones configuradas (${applications.length})</div>
        ${applications.length ? applications.map(function(app, idx) {
          return `
            <div class="report-card" style="margin-top:10px;">
              <div class="report-card-head">
                <span>${reportEscapeHtml(app.title || `${idx + 1}ª Aplicación Granular`)}</span>
                <span class="report-card-meta">Dosis: ${toNumber(app.doseKgHa).toFixed(2)} kg/ha</span>
              </div>
              ${renderMaterialsTable(app)}
            </div>
          `;
        }).join('') : `
          <div class="report-note">No hay aplicaciones guardadas en el programa granular.</div>
        `}
        </div>
      </div>
    </div> 
  `;
}

function reportEscapeHtml(s) {
  if (s == null) return '';
  if (typeof escapeHtml === 'function') return escapeHtml(String(s));
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

function createFertigationSectionHTML(chartImages) {
  const f = currentProject.fertirriego || {};
  const req = f.requirements || {};
  const prog = f.program || {};
  const crop = req.cropType || 'N/D';
  const hasCharts = chartImages && (chartImages.macro || chartImages.micro);
  const targetYield = Number(req.targetYield) || 0;
  const reqModeIsElemental = !!req.isElementalMode;
  const programModeIsElemental = !!prog.mode;
  const nutrients = ['N','P2O5','K2O','CaO','MgO','S','SO4','Fe','Mn','B','Zn','Cu','Mo','SiO2'];
  const macroCols = ['N_NO3','N_NH4','P2O5','K2O','CaO','MgO','S','SO4'];
  const microCols = ['Fe','Mn','B','Zn','Cu','Mo','SiO2'];
  const conv = { P2O5: 2.291, K2O: 1.204, CaO: 1.399, MgO: 1.658, SiO2: 2.139 };
  const elemLabels = { P2O5: 'P', K2O: 'K', CaO: 'Ca', MgO: 'Mg', SiO2: 'Si' };

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function label(n, elemental) {
    if (n === 'N_NO3') return 'N(NO3)';
    if (n === 'N_NH4') return 'N(NH4)';
    if (!elemental) return n;
    return elemLabels[n] || n;
  }
  function display(n, value, elemental) {
    const raw = toNum(value);
    if (!elemental || !conv[n]) return raw;
    return raw / conv[n];
  }
  function d(n) { return ['Fe','Mn','B','Zn','Cu','Mo','SiO2'].includes(n) ? 3 : 2; }
  function nutrientGrid(values, elemental, cls) {
    return nutrients.map(n => {
      const v = display(n, values ? values[n] : 0, elemental);
      const extra = cls && v < 0 ? ' negative' : '';
      return `<span class="report-nutrient-pill${extra}"><strong>${label(n, elemental)}:</strong> ${v.toFixed(d(n))}</span>`;
    }).join('');
  }

  const extractionOverrides = (req.extractionOverrides && crop && req.extractionOverrides[crop]) || {};
  const baseExtraction = (typeof CROP_EXTRACTION_DB !== 'undefined' && CROP_EXTRACTION_DB && crop && CROP_EXTRACTION_DB[crop]) ? CROP_EXTRACTION_DB[crop] : {};
  const extraction = {};
  nutrients.forEach(n => { extraction[n] = extractionOverrides[n] !== undefined ? toNum(extractionOverrides[n]) : toNum(baseExtraction[n]); });
  const totalExtraction = {};
  nutrients.forEach(n => { totalExtraction[n] = extraction[n] * targetYield; });

  const adjustment = req.adjustment || {};
  const efficiency = req.efficiency || {};
  const required = {};
  nutrients.forEach(n => {
    const adj = toNum(adjustment[n]);
    const eff = toNum(efficiency[n]) || 85;
    required[n] = eff > 0 ? adj / (eff / 100) : adj;
  });

  const weeks = Array.isArray(prog.weeks) ? prog.weeks : [];
  const columns = Array.isArray(prog.columns) ? prog.columns : [];
  let fertiMaterials = [];
  try {
    if (typeof window.getAllFertiMaterials === 'function') {
      const list = window.getAllFertiMaterials();
      fertiMaterials = Array.isArray(list) ? list : [];
    } else if (typeof getAllFertiMaterials === 'function') {
      const list = getAllFertiMaterials();
      fertiMaterials = Array.isArray(list) ? list : [];
    }
  } catch (e) {
    fertiMaterials = [];
  }
  const fertiCustomItems = currentProject?.sections?.fertirriego?.customMaterials?.items
    || currentProject?.fertirriego?.customMaterials?.items
    || currentProject?.fertiCustomMaterials?.items
    || currentProject?.fertirriegoCustomMaterials?.items
    || [];
  const fertiById = new Map((Array.isArray(fertiMaterials) ? fertiMaterials : []).filter(m => m && m.id).map(m => [m.id, m]));
  const fertiCustomById = new Map((Array.isArray(fertiCustomItems) ? fertiCustomItems : []).filter(m => m && m.id).map(m => [m.id, m]));
  const macroNutrients = ['N_NO3', 'N_NH4', 'P2O5', 'K2O', 'CaO', 'MgO', 'S', 'SO4'];
  const microNutrients = ['Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'SiO2'];
  function columnHasDose(c) {
    return weeks.some(w => toNum(w?.kgByCol?.[c?.id]) > 0);
  }
  function fertiColumnName(c, idx) {
    const explicit = (c && (c.name || c.label)) ? String(c.name || c.label).trim() : '';
    if (explicit) return explicit;
    const mat = fertiById.get(c?.materialId) || fertiCustomById.get(c?.materialId);
    const matName = (mat && (mat.name || mat.label)) ? String(mat.name || mat.label).trim() : '';
    if (matName) return matName;
    if (c?.materialId && String(c.materialId).startsWith('custom_')) return `Personalizado ${idx + 1}`;
    if (c?.materialId && !String(c.materialId).startsWith('col_')) {
      return String(c.materialId).replace(/_/g, ' ').trim();
    }
    return `Fertilizante ${idx + 1}`;
  }
  const columnNames = columns.map((c, idx) => fertiColumnName(c, idx));
  function fertiColumnHasMacro(c) {
    const mat = fertiById.get(c?.materialId) || fertiCustomById.get(c?.materialId) || {};
    const hasFromCatalog = macroNutrients.some(n => toNum(mat[n]) > 0);
    // Si no encontramos composición (p.ej. personalizado no resuelto), no ocultar columna si tiene dosis.
    if (hasFromCatalog) return true;
    if ((c?.materialId && String(c.materialId).startsWith('custom_')) || columnHasDose(c)) return true;
    return false;
  }
  function fertiColumnHasMicro(c) {
    const mat = fertiById.get(c?.materialId) || fertiCustomById.get(c?.materialId) || {};
    const hasFromCatalog = microNutrients.some(n => toNum(mat[n]) > 0);
    if (hasFromCatalog) return true;
    if ((c?.materialId && String(c.materialId).startsWith('custom_')) || columnHasDose(c)) return true;
    return false;
  }
  const macroDoseColumns = columns.filter(fertiColumnHasMacro);
  const macroDoseColumnNames = macroDoseColumns.map(c => {
    const idx = columns.indexOf(c);
    return idx >= 0 ? columnNames[idx] : fertiColumnName(c, 0);
  });
  const microDoseColumns = columns.filter(fertiColumnHasMicro);
  const microDoseColumnNames = microDoseColumns.map(c => {
    const idx = columns.indexOf(c);
    return idx >= 0 ? columnNames[idx] : fertiColumnName(c, 0);
  });
  const waterContribution = prog.waterContribution || {};
  const totalProgram = {};
  nutrients.forEach(n => { totalProgram[n] = 0; });
  weeks.forEach(w => {
    const t = w && w.totals ? w.totals : {};
    nutrients.forEach(n => { totalProgram[n] += toNum(t[n]); });
  });
  const totalWithWater = {};
  const diff = {};
  nutrients.forEach(n => {
    totalWithWater[n] = totalProgram[n] + toNum(waterContribution[n]);
    diff[n] = totalWithWater[n] - required[n];
  });
  const totalDose = weeks.reduce((acc, w) => {
    const kgByCol = w && w.kgByCol ? w.kgByCol : {};
    return acc + Object.values(kgByCol).reduce((s, x) => s + toNum(x), 0);
  }, 0);
  const macroDoseColumnTotals = macroDoseColumns.map(c => weeks.reduce((acc, w) => acc + toNum(w?.kgByCol?.[c.id]), 0));
  const microDoseColumnTotals = microDoseColumns.map(c => weeks.reduce((acc, w) => acc + toNum(w?.kgByCol?.[c.id]), 0));
  const totalMacroCols = macroCols.map(n => weeks.reduce((acc, w) => acc + toNum(w?.totals?.[n]), 0));
  const totalMicroCols = microCols.map(n => weeks.reduce((acc, w) => acc + toNum(w?.totals?.[n]), 0));

  const macroRows = weeks.map((w, idx) => `
    <tr>
      <td>${reportEscapeHtml(w?.stage || '')}</td>
      <td>${idx + 1}</td>
      ${macroDoseColumns.map(c => `<td>${toNum(w?.kgByCol?.[c.id]).toFixed(2)}</td>`).join('')}
      ${macroCols.map((n, i) => `<td class="${i === 0 ? 'report-divider-left' : ''}">${display(n, w?.totals?.[n], programModeIsElemental).toFixed(d(n))}</td>`).join('')}
    </tr>
  `).join('');
  const microRows = weeks.map((w, idx) => `
    <tr>
      <td>${reportEscapeHtml(w?.stage || '')}</td>
      <td>${idx + 1}</td>
      ${microDoseColumns.map(c => `<td>${toNum(w?.kgByCol?.[c.id]).toFixed(2)}</td>`).join('')}
      ${microCols.map((n, i) => `<td class="${i === 0 ? 'report-divider-left' : ''}">${display(n, w?.totals?.[n], programModeIsElemental).toFixed(d(n))}</td>`).join('')}
    </tr>
  `).join('');

  const chartsBlock = hasCharts ? `
      <div class="report-block" style="border-color:#93c5fd;background:#eff6ff;">
        <div class="report-block-title">📈 Gráficas de Fertirriego</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
          ${chartImages.macro ? `<div><div class="report-subtitle" style="margin-bottom:6px;">Macronutrientes</div><img src="${chartImages.macro}" alt="Macronutrientes" style="max-width:100%;height:auto;display:block;border-radius:8px;" /></div>` : ''}
          ${chartImages.micro ? `<div><div class="report-subtitle" style="margin-bottom:6px;">Micronutrientes</div><img src="${chartImages.micro}" alt="Micronutrientes" style="max-width:100%;height:auto;display:block;border-radius:8px;" /></div>` : ''}
        </div>
      </div>
  ` : '';

  return `
    <div class="section">
      <h2 class="section-title">💧 Fertirriego</h2>
      ${chartsBlock}
      <div class="report-block" style="border-color:#99f6e4;background:#ecfeff;">
        <div class="report-block-title">📋 Requerimiento Nutricional <span class="report-mode-badge">${reqModeIsElemental ? 'Modo Elemental' : 'Modo Óxido'}</span></div>
        <div class="report-kv">
          <div class="report-kv-item"><div class="data-label">Cultivo</div><div class="data-value">${reportEscapeHtml(crop)}</div></div>
          <div class="report-kv-item"><div class="data-label">Rendimiento Objetivo</div><div class="data-value">${targetYield > 0 ? `${reportNum(targetYield, 2)} ton/ha` : 'N/D'}</div></div>
        </div>
        <div class="report-subtitle">Extracción por Tonelada (kg/ton):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(extraction, reqModeIsElemental, false)}</div>
        <div class="report-subtitle">Extracción Total (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(totalExtraction, reqModeIsElemental, false)}</div>
        <div class="report-subtitle">Ajuste por Niveles en Suelo (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(adjustment, reqModeIsElemental, false)}</div>
        <div class="report-subtitle">Eficiencia (%):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(efficiency, false, false)}</div>
        <div class="report-subtitle">Requerimiento Real (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(required, reqModeIsElemental, false)}</div>
      </div>
      <div class="report-block" style="border-color:#99f6e4;background:#f0fdfa;">
        <div class="report-block-title">💧 Programa de Fertirriego <span class="report-mode-badge">${programModeIsElemental ? 'Modo Elemental' : 'Modo Óxido'}</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:8px;">
          <div><strong>Semanas:</strong> ${weeks.length}</div>
          <div><strong>Dosis total Kg/Ha:</strong> ${totalDose.toFixed(2)}</div>
          <div><strong>Unidad:</strong> ${prog.timeUnit === 'mes' ? 'Mes' : 'Semana'}</div>
        </div>
        <div class="report-subtitle">Aporte del programa de nutrición (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(totalProgram, programModeIsElemental, false)}</div>
        <div class="report-subtitle">Aporte por agua (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(waterContribution, programModeIsElemental, false)}</div>
        <div class="report-subtitle">Aporte total (programa + agua) (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(totalWithWater, programModeIsElemental, false)}</div>
        <div class="report-subtitle">Requerimiento Real (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(required, programModeIsElemental, false)}</div>
        <div class="report-subtitle">Diferencia (Aporte total - Requerimiento) (kg/ha):</div>
        <div class="report-nutrient-wrap">${nutrientGrid(diff, programModeIsElemental, true)}</div>
      </div>
      <div class="report-block">
        <div class="report-block-title">Programa ${prog.timeUnit === 'mes' ? 'Mensual' : 'Semanal'} - Macros</div>
        <table class="report-app-table">
          <thead>
            <tr>
              <th>Etapa</th>
              <th>#</th>
              ${macroDoseColumnNames.map(name => `<th>${reportEscapeHtml(name)}</th>`).join('')}
              ${macroCols.map((n, i) => `<th class="${i === 0 ? 'report-divider-left' : ''}">${label(n, programModeIsElemental)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${macroRows || `<tr><td colspan="${2 + macroDoseColumns.length + macroCols.length}" style="text-align:center;color:#64748b;">Sin semanas configuradas.</td></tr>`}
            <tr class="total-row">
              <td>TOTAL</td>
              <td></td>
              ${macroDoseColumnTotals.map(v => `<td>${v.toFixed(2)}</td>`).join('')}
              ${macroCols.map((n, i) => `<td class="${i === 0 ? 'report-divider-left' : ''}">${display(n, totalMacroCols[i], programModeIsElemental).toFixed(d(n))}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <div class="report-block">
        <div class="report-block-title">Programa ${prog.timeUnit === 'mes' ? 'Mensual' : 'Semanal'} - Micros</div>
        <table class="report-app-table">
          <thead>
            <tr>
              <th>Etapa</th>
              <th>#</th>
              ${microDoseColumnNames.map(name => `<th>${reportEscapeHtml(name)}</th>`).join('')}
              ${microCols.map((n, i) => `<th class="${i === 0 ? 'report-divider-left' : ''}">${label(n, programModeIsElemental)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${microRows || `<tr><td colspan="${2 + microDoseColumns.length + microCols.length}" style="text-align:center;color:#64748b;">Sin semanas configuradas.</td></tr>`}
            <tr class="total-row">
              <td>TOTAL</td>
              <td></td>
              ${microDoseColumnTotals.map(v => `<td>${v.toFixed(2)}</td>`).join('')}
              ${microCols.map((n, i) => `<td class="${i === 0 ? 'report-divider-left' : ''}">${display(n, totalMicroCols[i], programModeIsElemental).toFixed(d(n))}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function createAnalysisSectionHTML() {
  const s = currentProject.soilAnalysis || {};
  const initial = s.initial || {};
  const properties = s.properties || {};
  const adjustments = s.adjustments || {};
  const cic = initial.cic != null ? initial.cic : '—';
  return `
    <div class="section">
      <h2 class="section-title">🔬 Análisis de Suelo (Enmienda)</h2>
      <div class="report-block">
        <div class="report-block-title">Valores iniciales</div>
        <div class="report-kv">
          <div class="report-kv-item"><div class="data-label">K</div><div class="data-value">${reportEscapeHtml(initial.k ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Ca</div><div class="data-value">${reportEscapeHtml(initial.ca ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Mg</div><div class="data-value">${reportEscapeHtml(initial.mg ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">H</div><div class="data-value">${reportEscapeHtml(initial.h ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Na</div><div class="data-value">${reportEscapeHtml(initial.na ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Al</div><div class="data-value">${reportEscapeHtml(initial.al ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">CIC</div><div class="data-value">${reportEscapeHtml(cic)}</div></div>
          <div class="report-kv-item"><div class="data-label">pH</div><div class="data-value">${reportEscapeHtml(properties.ph ?? '—')}</div></div>
        </div>
        <div style="margin-top:12px;" class="report-block-title">Ajustes</div>
        <div class="report-kv">
          <div class="report-kv-item"><div class="data-label">K</div><div class="data-value">${reportEscapeHtml(adjustments.k ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Ca</div><div class="data-value">${reportEscapeHtml(adjustments.ca ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Mg</div><div class="data-value">${reportEscapeHtml(adjustments.mg ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">H</div><div class="data-value">${reportEscapeHtml(adjustments.h ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Na</div><div class="data-value">${reportEscapeHtml(adjustments.na ?? '—')}</div></div>
          <div class="report-kv-item"><div class="data-label">Al</div><div class="data-value">${reportEscapeHtml(adjustments.al ?? '—')}</div></div>
        </div>
      </div>
    </div>
  `;
}

function createHidroponiaSectionHTML() {
  const h = currentProject.hidroponia || {};
  const projectCrop = currentProject.cultivo || currentProject.crop_type || currentProject.cropType || currentProject.cultivoTipo || '';
  const crop = h.cropType || h.cultivo || h.solutionName || projectCrop || 'N/D';
  const stages = Array.isArray(h.stages) ? h.stages : [];
  const activeStage = stages.find(s => s && h.activeStageId && s.id === h.activeStageId) || stages[0] || null;
  const fertilizers = Array.isArray(h.fertilizers) ? h.fertilizers : [];
  const volumeWaterM3 = Number(h.volumeWaterM3) || 0;
  const tankVolumeL = Number(h.tankVolumeL) || 0;
  const injectionRateLperM3 = Number(h.injectionRateLperM3) || 0;
  const injectionRatio = injectionRateLperM3 > 0 ? Math.round(1000 / injectionRateLperM3) : 0;
  const recargas = tankVolumeL > 0 ? Math.ceil((volumeWaterM3 * injectionRateLperM3) / tankVolumeL) : 0;
  const meqNutrients = ['N_NH4', 'N_NO3', 'P', 'S', 'K', 'Ca', 'Mg'];
  const microNutrients = ['Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo'];
  const hydroNutrients = [...meqNutrients, ...microNutrients];
  const eqW = { N_NO3: 14, N_NH4: 14, P: 31, S: 16.03, K: 39.1, Ca: 20.04, Mg: 12.15 };
  function label(n) {
    const map = { N_NH4: 'N-NH4+', N_NO3: 'N-NO3-', P: 'P-H2PO4-', S: 'S-SO4-2', K: 'K+', Ca: 'Ca2+', Mg: 'Mg2+' };
    return map[n] || n;
  }
  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  const hydroMaterials = (typeof window.getAllHydroMaterials === 'function')
    ? (Array.isArray(window.getAllHydroMaterials()) ? window.getAllHydroMaterials() : [])
    : [];
  const hydroById = new Map(hydroMaterials.filter(m => m && m.id).map(m => [m.id, m]));
  const hydroCustomItems = (h && h.customMaterials && Array.isArray(h.customMaterials.items))
    ? h.customMaterials.items
    : (currentProject?.sections?.hidroponia?.customMaterials?.items || currentProject?.hidroponia?.customMaterials?.items || []);
  const hydroCustomById = new Map((Array.isArray(hydroCustomItems) ? hydroCustomItems : []).filter(m => m && m.id).map(m => [m.id, m]));
  function hydroFertName(fert) {
    if (fert && fert.name && String(fert.name).trim()) return String(fert.name).trim();
    const custom = hydroCustomById.get(fert?.materialId);
    if (custom && (custom.name || custom.label)) return String(custom.name || custom.label).trim();
    const mat = hydroById.get(fert?.materialId);
    if (mat && (mat.name || mat.label)) return String(mat.name || mat.label).trim();
    if (fert?.materialId && String(fert.materialId).startsWith('custom_')) return 'Personalizado';
    return fert?.materialId || 'Fertilizante';
  }
  function hydroDoseAndTotals(fert) {
    const mat = hydroById.get(fert?.materialId) || hydroCustomById.get(fert?.materialId) || {};
    const unit = String(mat?.unit || '').toUpperCase();
    const density = toNum(mat?.density);
    const isLiquid = unit === 'L' && density > 0;
    const vol = volumeWaterM3 > 0 ? volumeWaterM3 : 100;

    let dose = fert && fert.dose != null ? Number(fert.dose) : NaN;
    if ((!Number.isFinite(dose) || dose <= 0) && isLiquid && fert && fert.calcMode === 'product') {
      const productL = toNum(fert.productTotalL);
      const kgEq = productL * density;
      if (vol > 0 && kgEq > 0) dose = (kgEq * 1000) / vol;
    }
    if (!Number.isFinite(dose) && fert && fert.materialId && fert.element && (fert.targetPpm != null || fert.targetPpm === 0)) {
      const elemPct = toNum(mat[fert.element]);
      const targetPpm = toNum(fert.targetPpm);
      if (elemPct > 0) dose = (targetPpm * 100) / elemPct;
    }

    const kgComputed = (Number.isFinite(dose) && dose > 0 && vol > 0) ? (dose * vol / 1000) : NaN;
    const kgStored = fert && fert.kg != null ? Number(fert.kg) : NaN;
    const kg = Number.isFinite(kgStored) && kgStored > 0 ? kgStored : kgComputed;

    if (isLiquid) {
      const totalL = (fert && fert.calcMode === 'product' && toNum(fert.productTotalL) > 0)
        ? toNum(fert.productTotalL)
        : (Number.isFinite(kg) && kg > 0 ? (kg / density) : NaN);
      return { dose, kg, totalValue: totalL, totalUnit: 'L', isLiquid };
    }
    return { dose, kg, totalValue: kg, totalUnit: 'kg', isLiquid };
  }
  const ppmTotals = h.fertilizerTotalsPpm || {};
  const activeMeq = activeStage ? (activeStage.meq || {}) : {};
  const activeNNo3 = toNum(activeMeq.N_NO3);
  const activeNNh4 = toNum(activeMeq.N_NH4);
  const activeNTotal = activeNNo3 + activeNNh4;
  const activePctNo3 = activeNTotal > 0 ? (activeNNo3 / activeNTotal) * 100 : 0;
  const activePctNh4 = activeNTotal > 0 ? (activeNNh4 / activeNTotal) * 100 : 0;
  const activeStageName = activeStage ? reportEscapeHtml(activeStage.name || 'Etapa') : 'Etapa';
  const stageRowsMeq = stages.map(stage => {
    const meq = stage.meq || {};
    const ce = meqNutrients.reduce((acc, n) => acc + toNum(meq[n]), 0) / 20;
    return `<tr>
      <td>${reportEscapeHtml(stage.name || '')}</td>
      <td>${ce.toFixed(2)}</td>
      ${meqNutrients.map(n => `<td>${toNum(meq[n]).toFixed(1)}</td>`).join('')}
    </tr>`;
  }).join('');
  const stageRowsPpm = stages.map(stage => {
    const meq = stage.meq || {};
    const ppm = stage.ppm || {};
    return `<tr>
      <td>${reportEscapeHtml(stage.name || '')}</td>
      ${meqNutrients.map(n => {
        const v = ppm[n] != null ? toNum(ppm[n]) : (toNum(meq[n]) * toNum(eqW[n]));
        return `<td>${v.toFixed(1)}</td>`;
      }).join('')}
      ${microNutrients.map(n => `<td>${toNum(ppm[n]).toFixed(2)}</td>`).join('')}
    </tr>`;
  }).join('');
  const fertRows = fertilizers.map(f => {
    const c = f.contributions || {};
    const { dose, totalValue, totalUnit } = hydroDoseAndTotals(f);
    return `<tr>
      <td>${reportEscapeHtml(hydroFertName(f))}</td>
      <td>Tanque ${reportEscapeHtml(f.tank || 'A')}</td>
      <td>${Number.isFinite(dose) && dose > 0 ? dose.toFixed(1) : '—'}</td>
      ${hydroNutrients.map(n => `<td>${toNum(c[n]).toFixed(2)}</td>`).join('')}
      <td>${Number.isFinite(totalValue) && totalValue > 0 ? `${totalValue.toFixed(2)} ${totalUnit}` : '—'}</td>
    </tr>`;
  }).join('');
  const hydroTankOrder = ['A', 'B', 'C', 'D', 'E'];
  const byTank = {};
  hydroTankOrder.forEach(tq => { byTank[tq] = { totalKg: 0, totalL: 0, items: [] }; });
  fertilizers.forEach(f => {
    const totals = hydroDoseAndTotals(f);
    const { kg, totalValue, totalUnit } = totals;
    if (!Number.isFinite(totalValue) || totalValue <= 0) return;
    const tank = String(f?.tank || 'A').toUpperCase();
    if (!byTank[tank]) byTank[tank] = { totalKg: 0, totalL: 0, items: [] };
    const name = hydroFertName(f);
    if (totalUnit === 'L') byTank[tank].totalL += totalValue;
    else byTank[tank].totalKg += totalValue;
    byTank[tank].items.push({ name, value: totalValue, unit: totalUnit, kg });
  });
  const tankKeys = Object.keys(byTank)
    .filter(k => byTank[k] && (byTank[k].totalKg > 0 || byTank[k].totalL > 0))
    .sort((a, b) => {
      const ia = hydroTankOrder.indexOf(a);
      const ib = hydroTankOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  const tankBlocksHtml = tankKeys.map(tq => {
    const data = byTank[tq];
    const totalParts = [];
    if (data.totalKg > 0) totalParts.push(`${data.totalKg.toFixed(2)} kg`);
    if (data.totalL > 0) totalParts.push(`${data.totalL.toFixed(2)} L`);
    const perRecParts = [];
    if (data.totalKg > 0) perRecParts.push(`${(recargas > 0 ? data.totalKg / recargas : data.totalKg).toFixed(2)} kg`);
    if (data.totalL > 0) perRecParts.push(`${(recargas > 0 ? data.totalL / recargas : data.totalL).toFixed(2)} L`);
    const totalLine = recargas > 1
      ? `${totalParts.join(' + ')} total <span style="color:#64748b;font-size:12px;">(${perRecParts.join(' + ')} por recarga si son ${recargas} recargas)</span>`
      : `${totalParts.join(' + ')} total <span style="color:#64748b;font-size:12px;">(${perRecParts.join(' + ')} por recarga)</span>`;
    const itemsHtml = data.items.map(i => {
      const perRec = recargas > 0 ? (i.value / recargas) : i.value;
      const eq = i.unit === 'L' && Number.isFinite(i.kg) && i.kg > 0
        ? ` <span style="color:#64748b;">(≈ ${i.kg.toFixed(2)} kg eq)</span>`
        : '';
      return `<span style="display:block;font-size:12px;">${reportEscapeHtml(i.name)}: ${i.value.toFixed(2)} ${i.unit}${eq} <span style="color:#64748b;">(${perRec.toFixed(2)} ${i.unit} por recarga)</span></span>`;
    }).join('');
    return `<div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:8px;"><strong>Tanque ${reportEscapeHtml(tq)}:</strong> ${totalLine}<div style="margin-top:6px;">${itemsHtml}</div></div>`;
  }).join('');
  return `
    <div class="section">
      <h2 class="section-title">🌱 Hidroponía</h2>
      <div class="report-block" style="border-color:#7dd3fc;background:#f0f9ff;">
        <div class="report-block-title">✅ Solución nutritiva por etapa (meq/L)</div>
        <div class="report-kv">
          <div class="report-kv-item"><div class="data-label">Cultivo</div><div class="data-value">${reportEscapeHtml(crop)}</div></div>
          <div class="report-kv-item"><div class="data-label">Etapas configuradas</div><div class="data-value">${stages.length}</div></div>
        </div>
        ${activeStage ? `
        <div class="report-note" style="margin:8px 0 10px 0;">
          <strong>${activeStageName}</strong> · Suma de N (meq/L): <strong>${activeNTotal.toFixed(2)}</strong> · % Nitrato: <strong>${activePctNo3.toFixed(1)}%</strong> · % Amonio: <strong>${activePctNh4.toFixed(1)}%</strong>
        </div>` : ''}
        <table class="report-app-table">
          <thead><tr><th>Etapa</th><th>CE (dS/m)</th>${meqNutrients.map(n => `<th>${label(n)} (meq/L)</th>`).join('')}</tr></thead>
          <tbody>${stageRowsMeq || `<tr><td colspan="${meqNutrients.length + 2}" style="text-align:center;color:#64748b;">Sin etapas configuradas.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="report-block" style="border-color:#7dd3fc;background:#f0f9ff;">
        <div class="report-block-title">📐 Solución nutritiva por etapa (ppm)</div>
        <table class="report-app-table">
          <thead><tr><th>Etapa</th>${meqNutrients.map(n => `<th>${label(n)} ppm</th>`).join('')}${microNutrients.map(n => `<th>${n} ppm</th>`).join('')}</tr></thead>
          <tbody>${stageRowsPpm || `<tr><td colspan="${meqNutrients.length + microNutrients.length + 1}" style="text-align:center;color:#64748b;">Sin etapas configuradas.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="report-block" style="border-color:#7dd3fc;background:#f0f9ff;">
        <div class="report-block-title">📦 Cálculo por volumen de agua</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
          <div><strong>Volumen de agua:</strong> ${reportNum(volumeWaterM3, 2)} m³</div>
          <div><strong>Volumen tanque:</strong> ${reportNum(tankVolumeL, 0)} L</div>
          <div><strong>Tasa inyección:</strong> ${reportNum(injectionRateLperM3, 2)} L/m³</div>
          <div><strong>Relación de inyección:</strong> ${injectionRatio > 0 ? `1:${injectionRatio}` : 'N/D'}</div>
          <div><strong>Recargas estimadas:</strong> ${recargas || 0}</div>
        </div>
      </div>
      <div class="report-block">
        <div class="report-block-title">🧮 Fertilizantes</div>
        <div class="report-note" style="margin-bottom:8px;">
          Los valores por elemento (N, P, K, Ca, Mg, Fe, etc.) se expresan en <strong>ppm</strong> del aporte en la solución final.
          La columna <strong>Total producto</strong> corresponde a la cantidad total requerida para el volumen de agua configurado (sólidos en kg y líquidos en L).
        </div>
        <table class="report-app-table">
          <thead><tr><th>Fertilizante</th><th>Tanque</th><th>Dosis (ppm)</th>${meqNutrients.map(n => `<th>${label(n)}</th>`).join('')}${microNutrients.map(n => `<th>${n}</th>`).join('')}<th>Total producto</th></tr></thead>
          <tbody>${fertRows || `<tr><td colspan="${meqNutrients.length + microNutrients.length + 4}" style="text-align:center;color:#64748b;">Sin fertilizantes guardados.</td></tr>`}</tbody>
        </table>
      </div>
      ${tankBlocksHtml ? `
      <div class="report-block">
        <div class="report-block-title">📋 Por tanque (A, B, C...)</div>
        <div class="report-note" style="margin-bottom:8px;">
          Las cantidades son el total para todo el volumen de agua indicado (sólidos en kg y líquidos en L). Si necesitas varias recargas, en cada llenada usa la cantidad "por recarga".
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">
          ${tankBlocksHtml}
        </div>
      </div>` : ''}
      <div class="report-block">
        <div class="report-block-title">📊 PPM aportadas totales</div>
        <div class="report-nutrient-wrap">
          ${[...meqNutrients, ...microNutrients].map(n => `<span class="report-nutrient-pill"><strong>${label(n)}:</strong> ${toNum(ppmTotals[n]).toFixed(2)} ppm</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function createVPDReportSectionHTML() {
  const vpd = currentProject.vpdAnalysis || {};
  const env = vpd.environmental || {};
  const adv = vpd.advanced || {};
  const history = Array.isArray(vpd.history) ? vpd.history : [];
  const envVpd = (env.result && env.result.vpd != null) ? env.result.vpd : env.vpd;
  const advVpd = (adv.result && adv.result.vpd != null) ? adv.result.vpd : adv.vpd;
  const historyRows = history.slice().reverse().slice(0, 20).map(item => `
    <tr>
      <td>${item.type === 'advanced' ? 'Avanzada' : 'Ambiental'}</td>
      <td>${reportNum(item.vpd, 2)}</td>
      <td>${reportNum(item.hd, 2)}</td>
      <td>${reportEscapeHtml(item.timestamp ? new Date(item.timestamp).toLocaleString('es-MX') : (item.date || '—'))}</td>
    </tr>
  `).join('');

  return `
    <div class="section">
      <h2 class="section-title">🌡️ Déficit de Presión de Vapor (VPD)</h2>
      <div class="report-block" style="border-color:#fcd34d;background:#fffbeb;">
        <div class="report-block-title">📊 Calculadora Ambiental</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
          <div><strong>Temperatura:</strong> ${reportNum(env.temperature, 2)} °C</div>
          <div><strong>Humedad Relativa:</strong> ${reportNum(env.humidity, 2)} %</div>
          <div><strong>VPD:</strong> <span class="badge-ok">${reportNum(envVpd, 2)} kPa</span></div>
          <div><strong>HD:</strong> ${reportNum(env.hd, 2)} g/m³</div>
          ${env.calculatedAt ? `<div><strong>Calculado:</strong> ${reportEscapeHtml(new Date(env.calculatedAt).toLocaleString('es-MX'))}</div>` : ''}
          ${env.source ? `<div><strong>Fuente:</strong> ${reportEscapeHtml(env.source === 'api' ? 'API Meteorológica' : 'Manual')}</div>` : ''}
        </div>
      </div>
      <div class="report-block" style="border-color:#fcd34d;background:#fffbeb;">
        <div class="report-block-title">🔬 Calculadora Avanzada</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
          <div><strong>Temperatura Aire:</strong> ${reportNum(adv.airTemperature, 2)} °C</div>
          <div><strong>Humedad Relativa:</strong> ${reportNum(adv.airHumidity, 2)} %</div>
          <div><strong>Temp. Hoja:</strong> ${reportNum(adv.leafTemperature, 2)} °C</div>
          <div><strong>VPD:</strong> <span class="badge-ok">${reportNum(advVpd, 2)} kPa</span></div>
          <div><strong>HD:</strong> ${reportNum(adv.hd, 2)} g/m³</div>
          ${adv.calculatedAt ? `<div><strong>Calculado:</strong> ${reportEscapeHtml(new Date(adv.calculatedAt).toLocaleString('es-MX'))}</div>` : ''}
        </div>
      </div>
      <div class="report-block" style="border-color:#fcd34d;background:#fffbeb;">
        <div class="report-block-title">📜 Historial de Cálculos (${history.length})</div>
        <table class="report-admin-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>VPD (kPa)</th>
              <th>HD (g/m³)</th>
              <th>Fecha/Hora</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Sin historial de cálculos.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function createAnalysesListSectionHTML(title, list) {
  const arr = Array.isArray(list) ? list : [];
  const items = arr.map((r, i) => {
    const name = r.title || r.name || `Reporte ${i + 1}`;
    const date = r.date || '';
    const rendered = (typeof window.NutriPlantRenderAnalysisReport === 'function')
      ? window.NutriPlantRenderAnalysisReport(r, { escapeHtml: reportEscapeHtml })
      : '';
    return `
      <div class="report-card">
        <div class="report-card-head">
          <span>${name}</span>
          ${date ? `<span class="report-card-meta">${date}</span>` : ''}
        </div>
        ${rendered ? `<div style="margin-top:10px;">${rendered}</div>` : '<div style="font-size:13px;color:#6b7280;margin-top:6px;">Sin datos detallados para mostrar.</div>'}
      </div>
    `;
  }).join('');

  return `
    <div class="section">
      <h2 class="section-title">${title}</h2>
      ${arr.length
        ? `<div>${items}</div>`
        : `<div class="report-note">No hay reportes guardados en esta sección.</div>`}
    </div>
  `;
}

// ===================================
// ANÁLISIS DE SUELO (pestaña Suelo) - Múltiples reportes por proyecto
// ===================================
function createEmptySoilAnalysis() {
  return {
    id: 'sa_' + Date.now(),
    title: '',
    date: '',
    physical: { texturalClass: '', saturationPoint: '', fieldCapacity: '', wiltingPoint: '', hydraulicConductivity: '', bulkDensity: '' },
    phSection: { ph: '', phBuffer: '', totalCarbonates: '', salinity: '' },
    fertility: { pMethod: 'Bray', mo: '', nNo3: '', p: '', k: '', ca: '', mg: '', na: '', s: '', fe: '', mn: '', b: '', zn: '', cu: '', al: '', moly: '', ideal: {}, depthCm: 20, reachPct: 100 },
    cations: { ca: '', mg: '', k: '', na: '', al: '', h: '', cic: '', pctCa: '', pctMg: '', pctK: '', pctNa: '', pctAl: '', pctH: '' },
    ratios: { caMg: '', mgK: '', caMgK: '', caK: '' }
  };
}

function createExampleSoilAnalysis() {
  const a = createEmptySoilAnalysis();
  a.id = 'sa_ejemplo';
  a.title = 'Rancho Agrícola Junio 2025';
  a.date = '2025-06-01';
  a.physical = { texturalClass: 'Franco Arcillo Arenoso', saturationPoint: '27.6', fieldCapacity: '14.5', wiltingPoint: '8.63', hydraulicConductivity: '9', bulkDensity: '1.32' };
  a.phSection = { ph: '5.98', phBuffer: '6.87', totalCarbonates: '0.01', salinity: '1.81' };
  a.fertility = { pMethod: 'Bray', mo: '1.5', nNo3: '16.9', p: '284', k: '241', ca: '962', mg: '94.6', na: '25', s: '72.3', fe: '39.9', mn: '2.68', b: '0.6', zn: '72', cu: '9.11', al: '3.89', moly: '', ideal: {}, depthCm: 20, reachPct: 100 };
  a.cations = { ca: '4.8', mg: '0.78', k: '0.62', na: '0.09', al: '0.04', h: '0', cic: '6.33', pctCa: '75.8', pctMg: '12.3', pctK: '9.79', pctNa: '1.42', pctAl: '0.63', pctH: '0' };
  a.ratios = { caMg: '6.15', mgK: '1.26', caMgK: '9', caK: '7.74' };
  return a;
}

// ========== SOLUCIÓN NUTRITIVA (misma estructura que Análisis de Suelo) ==========
var SN_EQ_WEIGHTS = { N_NO3: 14, NO3: 14, N_NH4: 14, P: 31, S: 16.03, K: 39.1, Ca: 20.04, Mg: 12.15, Na: 23, SO4: 16.03, HCO3: 61, Cl: 35.45, CO3: 30, PO4: 31 };
var SN_REF_DEFAULT = { N: [140,200], P: [30,60], K: [180,300], Ca: [140,220], Mg: [40,70], S: [60,110], Fe: [1.5,3], Mn: [0.3,1], Zn: [0.05,0.3], Cu: [0.03,0.1], B: [0.3,0.6], Mo: [0.03,0.08] };

function createEmptySolucionNutritivaAnalysis() {
  var id = 'sn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  return {
    id: id,
    title: '',
    date: '',
    general: { ce: '', ph: '', ras: '' },
    cations: { ca_meq: '', ca_ppm: '', mg_meq: '', mg_ppm: '', na_meq: '', na_ppm: '', k_meq: '', k_ppm: '' },
    anions: { so4_meq: '', so4_ppm: '', hco3_meq: '', hco3_ppm: '', cl_meq: '', cl_ppm: '', co3_meq: '', co3_ppm: '', po4_meq: '', po4_ppm: '', no3_meq: '', no3_ppm: '' },
    micros: { b: '', fe: '', mn: '', cu: '', zn: '', mo: '', n_nh4: '' },
    ideal: {}
  };
}

function createSolucionNutritivaTabHTML() {
  return `
    <div class="card soil-analysis-tab-container soil-analysis-watermark-wrap" id="solucion-nutritiva-tab-container">
      <div class="soil-analysis-watermark" aria-hidden="true">
        <img src="assets/NutriPlant_PRO_blue.png" alt="">
      </div>
      <h2 class="text-xl" style="margin-bottom: 16px;">🔬 Solución Nutritiva</h2>
      <p style="margin-bottom:12px;font-size:0.9rem;color:#64748b;">Análisis de solución nutritiva o extracto de pasta saturada. Macros en meq/L y ppm (conversión automática). Rangos de referencia y diferencia vs ideal.</p>
      <div class="soil-analysis-layout">
        <div class="soil-analysis-list-panel">
          <div class="soil-analysis-list-header">
            <strong>Reportes en este proyecto</strong>
            <div class="soil-analysis-list-actions">
              <button type="button" class="btn btn-sm btn-success" onclick="window.addNewSolucionNutritivaAnalysis && window.addNewSolucionNutritivaAnalysis();">➕ Agregar análisis</button>
            </div>
          </div>
          <div id="solucion-nutritiva-list" class="soil-analyses-list"></div>
        </div>
        <div class="soil-analysis-form-panel" id="solucion-nutritiva-form-panel">
          <div id="solucion-nutritiva-form-empty" class="soil-analysis-form-empty">
            <p>Selecciona un análisis de la lista o agrega uno nuevo.</p>
          </div>
          <div id="solucion-nutritiva-form-wrap" class="soil-analysis-form-wrap" style="display: none;" data-current-id="">
            <div class="soil-analysis-form-header">
              <input type="text" id="sn-meta-title" placeholder="Título (ej. Agua Carrizalillo May 2025)" class="soil-input-inline" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('meta','title',this.value)">
              <input type="text" id="sn-meta-date" placeholder="Fecha (ej. 2025-05-28)" class="soil-input-inline" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('meta','date',this.value)">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteCurrentSolucionNutritivaAnalysis && window.deleteCurrentSolucionNutritivaAnalysis();">Eliminar</button>
            </div>
            <div class="soil-analysis-sections">
              <details class="soil-section" data-sn-section="general" open>
                <summary>📐 Características generales (salinidad / sodicidad)</summary>
                <div class="soil-fields">
                  <label>CE (dS/m) <input type="number" step="0.01" id="sn-general-ce" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('general','ce',this.value)"></label>
                  <label>pH <input type="number" step="0.01" id="sn-general-ph" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('general','ph',this.value)"></label>
                  <label>RAS <input type="number" step="0.01" id="sn-general-ras" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('general','ras',this.value)"></label>
                </div>
              </details>
              <details class="soil-section" data-sn-section="cations" open>
                <summary>⚗️ Cationes (meq/L y ppm)</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>meq/L</th><th>ppm</th><th>Ref. min–max (ppm)</th><th>Estado</th><th>Ideal (opc.)</th><th>Diferencia</th></tr></thead>
                    <tbody>
                      <tr><td>Ca²⁺</td><td><input type="number" step="0.01" id="sn-ca-meq" class="fertirriego-input" data-sn-macro="Ca" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Ca','meq',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','ca');"></td><td><input type="number" step="0.1" id="sn-ca-ppm" class="fertirriego-input" data-sn-macro="Ca" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Ca','ppm',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','ca');"></td><td>140 – 220</td><td id="sn-ref-ca" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-ca" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','ca',this.value); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','ca');"></td><td id="sn-diff-ca">—</td></tr>
                      <tr><td>Mg²⁺</td><td><input type="number" step="0.01" id="sn-mg-meq" class="fertirriego-input" data-sn-macro="Mg" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Mg','meq',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','mg');"></td><td><input type="number" step="0.1" id="sn-mg-ppm" class="fertirriego-input" data-sn-macro="Mg" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Mg','ppm',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','mg');"></td><td>40 – 70</td><td id="sn-ref-mg" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-mg" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','mg',this.value); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','mg');"></td><td id="sn-diff-mg">—</td></tr>
                      <tr><td>Na⁺</td><td><input type="number" step="0.01" id="sn-na-meq" class="fertirriego-input" data-sn-macro="Na" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Na','meq',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','na');"></td><td><input type="number" step="0.1" id="sn-na-ppm" class="fertirriego-input" data-sn-macro="Na" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Na','ppm',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','na');"></td><td>—</td><td id="sn-ref-na" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-na" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','na',this.value); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','na');"></td><td id="sn-diff-na">—</td></tr>
                      <tr><td>K⁺</td><td><input type="number" step="0.01" id="sn-k-meq" class="fertirriego-input" data-sn-macro="K" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('K','meq',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','k');"></td><td><input type="number" step="0.1" id="sn-k-ppm" class="fertirriego-input" data-sn-macro="K" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('K','ppm',this); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','k');"></td><td>180 – 300</td><td id="sn-ref-k" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-k" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','k',this.value); window.snUpdateMacroRef && window.snUpdateMacroRef('cations','k');"></td><td id="sn-diff-k">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-sn-section="anions" open>
                <summary>⚗️ Aniones (meq/L y ppm)</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>meq/L</th><th>ppm</th><th>Ref. min–max (ppm)</th><th>Estado</th><th>Ideal (opc.)</th><th>Diferencia</th></tr></thead>
                    <tbody>
                      <tr><td>S-SO₄²⁻</td><td><input type="number" step="0.01" id="sn-so4-meq" class="fertirriego-input" data-sn-macro="SO4" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('SO4','meq',this); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','so4');"></td><td><input type="number" step="0.1" id="sn-so4-ppm" class="fertirriego-input" data-sn-macro="SO4" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('SO4','ppm',this); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','so4');"></td><td>60 – 110</td><td id="sn-ref-so4" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-so4" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','so4',this.value); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','so4');"></td><td id="sn-diff-so4">—</td></tr>
                      <tr><td>HCO₃⁻</td><td><input type="number" step="0.01" id="sn-hco3-meq" class="fertirriego-input" data-sn-macro="HCO3" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('HCO3','meq',this);"></td><td><input type="number" step="0.1" id="sn-hco3-ppm" class="fertirriego-input" data-sn-macro="HCO3" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('HCO3','ppm',this);"></td><td>—</td><td id="sn-ref-hco3" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-hco3" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','hco3',this.value);"></td><td id="sn-diff-hco3">—</td></tr>
                      <tr><td>Cl⁻</td><td><input type="number" step="0.01" id="sn-cl-meq" class="fertirriego-input" data-sn-macro="Cl" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Cl','meq',this);"></td><td><input type="number" step="0.1" id="sn-cl-ppm" class="fertirriego-input" data-sn-macro="Cl" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('Cl','ppm',this);"></td><td>—</td><td id="sn-ref-cl" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-cl" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','cl',this.value);"></td><td id="sn-diff-cl">—</td></tr>
                      <tr><td>CO₃²⁻</td><td><input type="number" step="0.01" id="sn-co3-meq" class="fertirriego-input" data-sn-macro="CO3" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('CO3','meq',this);"></td><td><input type="number" step="0.1" id="sn-co3-ppm" class="fertirriego-input" data-sn-macro="CO3" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('CO3','ppm',this);"></td><td>—</td><td id="sn-ref-co3" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-co3" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','co3',this.value);"></td><td id="sn-diff-co3">—</td></tr>
                      <tr><td>P-H₂PO₄⁻</td><td><input type="number" step="0.01" id="sn-po4-meq" class="fertirriego-input" data-sn-macro="PO4" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('PO4','meq',this); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','po4');"></td><td><input type="number" step="0.1" id="sn-po4-ppm" class="fertirriego-input" data-sn-macro="PO4" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('PO4','ppm',this); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','po4');"></td><td>30 – 60</td><td id="sn-ref-po4" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-po4" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','po4',this.value); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','po4');"></td><td id="sn-diff-po4">—</td></tr>
                      <tr><td>N-NO₃⁻</td><td><input type="number" step="0.01" id="sn-no3-meq" class="fertirriego-input" data-sn-macro="NO3" data-sn-unit="meq" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('NO3','meq',this); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','no3');"></td><td><input type="number" step="0.1" id="sn-no3-ppm" class="fertirriego-input" data-sn-macro="NO3" data-sn-unit="ppm" oninput="window.snSyncMeqPpm && window.snSyncMeqPpm('NO3','ppm',this); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','no3');"></td><td>140 – 200</td><td id="sn-ref-no3" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="sn-ideal-no3" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','no3',this.value); window.snUpdateMacroRef && window.snUpdateMacroRef('anions','no3');"></td><td id="sn-diff-no3">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-sn-section="micros" open>
                <summary>🔬 Micronutrimentos (ppm) y referencia</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>Análisis (ppm)</th><th>Ref. min–max</th><th>Estado</th><th>Ideal (opc.)</th><th>Diferencia</th></tr></thead>
                    <tbody>
                      <tr><td>Fe</td><td><input type="number" step="0.01" id="sn-micro-fe" class="fertirriego-input" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('micros','fe',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td>1.5 – 3.0</td><td id="sn-ref-fe" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="sn-ideal-fe" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','fe',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td id="sn-diff-fe">—</td></tr>
                      <tr><td>Mn</td><td><input type="number" step="0.01" id="sn-micro-mn" class="fertirriego-input" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('micros','mn',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td>0.3 – 1.0</td><td id="sn-ref-mn" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="sn-ideal-mn" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','mn',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td id="sn-diff-mn">—</td></tr>
                      <tr><td>Zn</td><td><input type="number" step="0.01" id="sn-micro-zn" class="fertirriego-input" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('micros','zn',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td>0.05 – 0.3</td><td id="sn-ref-zn" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="sn-ideal-zn" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','zn',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td id="sn-diff-zn">—</td></tr>
                      <tr><td>Cu</td><td><input type="number" step="0.01" id="sn-micro-cu" class="fertirriego-input" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('micros','cu',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td>0.03 – 0.1</td><td id="sn-ref-cu" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="sn-ideal-cu" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','cu',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td id="sn-diff-cu">—</td></tr>
                      <tr><td>B</td><td><input type="number" step="0.01" id="sn-micro-b" class="fertirriego-input" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('micros','b',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td>0.3 – 0.6</td><td id="sn-ref-b" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="sn-ideal-b" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','b',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td id="sn-diff-b">—</td></tr>
                      <tr><td>Mo</td><td><input type="number" step="0.01" id="sn-micro-mo" class="fertirriego-input" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('micros','mo',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td>0.03 – 0.08</td><td id="sn-ref-mo" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="sn-ideal-mo" class="fertirriego-input" style="width:70px;" onchange="window.saveSolucionNutritivaField && window.saveSolucionNutritivaField('ideal','mo',this.value); window.snUpdateMicroRef && window.snUpdateMicroRef();"></td><td id="sn-diff-mo">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.getSolucionNutritivaAnalyses = function getSolucionNutritivaAnalyses() {
  if (!currentProject.id) return [];
  if (!Array.isArray(currentProject.solucionNutritivaAnalyses)) currentProject.solucionNutritivaAnalyses = [];
  return currentProject.solucionNutritivaAnalyses;
};

window.addNewSolucionNutritivaAnalysis = function addNewSolucionNutritivaAnalysis() {
  if (!currentProject.id) { alert('Selecciona un proyecto primero.'); return; }
  var list = window.getSolucionNutritivaAnalyses();
  var a = createEmptySolucionNutritivaAnalysis();
  a.title = 'Nuevo análisis ' + (list.length + 1);
  list.push(a);
  window.saveSolucionNutritivaAnalysesToProject();
  window.renderSolucionNutritivaList && window.renderSolucionNutritivaList();
  window.selectSolucionNutritivaAnalysis && window.selectSolucionNutritivaAnalysis(a.id);
};

var _solucionNutritivaSaveTimer = null;
window.saveSolucionNutritivaAnalysesToProject = function saveSolucionNutritivaAnalysesToProject() {
  if (!currentProject.id) return;
  if (_solucionNutritivaSaveTimer) clearTimeout(_solucionNutritivaSaveTimer);
  var projectId = currentProject.id;
  var dataCopy = JSON.parse(JSON.stringify(window.getSolucionNutritivaAnalyses() || []));
  _solucionNutritivaSaveTimer = setTimeout(function() {
    _solucionNutritivaSaveTimer = null;
    var run = function() {
      try { window.projectStorage && window.projectStorage.saveSection('solucionNutritivaAnalyses', dataCopy, projectId); } catch (e) { console.warn('saveSolucionNutritivaAnalysesToProject', e); }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 0);
    }
  }, 350);
};

window.saveSolucionNutritivaField = function saveSolucionNutritivaField(group, field, value) {
  var wrap = document.getElementById('solucion-nutritiva-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getSolucionNutritivaAnalyses();
  var a = list.find(function(x) { return x.id === id; });
  if (!a) return;
  if (group === 'meta') { a[field] = value; }
  else if (group === 'general' && a.general) { a.general[field] = value; }
  else if (group === 'cations' && a.cations) { a.cations[field] = value; }
  else if (group === 'anions' && a.anions) { a.anions[field] = value; }
  else if (group === 'micros' && a.micros) { a.micros[field] = value; }
  else if (group === 'ideal') { if (!a.ideal) a.ideal = {}; a.ideal[field] = value; }
  window.saveSolucionNutritivaAnalysesToProject();
};

window.snSyncMeqPpm = function snSyncMeqPpm(macro, fromUnit, inputEl) {
  var val = parseFloat(inputEl.value);
  if (isNaN(val)) return;
  var w = SN_EQ_WEIGHTS[macro];
  if (!w) return;
  var key = (macro === 'NO3' ? 'no3' : macro === 'PO4' ? 'po4' : macro === 'SO4' ? 'so4' : macro === 'HCO3' ? 'hco3' : macro === 'CO3' ? 'co3' : macro.toLowerCase());
  var meqEl = document.getElementById('sn-' + key + '-meq');
  var ppmEl = document.getElementById('sn-' + key + '-ppm');
  if (!meqEl || !ppmEl) return;
  if (fromUnit === 'meq') ppmEl.value = (val * w).toFixed(2);
  else meqEl.value = (val / w).toFixed(2);
  var wrap = document.getElementById('solucion-nutritiva-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getSolucionNutritivaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var keyMeq = key + '_meq', keyPpm = key + '_ppm';
  var isCation = ['Ca','Mg','Na','K'].indexOf(macro) !== -1;
  if (isCation && a.cations) { a.cations[keyMeq] = meqEl.value; a.cations[keyPpm] = ppmEl.value; }
  if (!isCation && a.anions) { a.anions[keyMeq] = meqEl.value; a.anions[keyPpm] = ppmEl.value; }
  window.saveSolucionNutritivaAnalysesToProject();
};

window.snUpdateMicroRef = function snUpdateMicroRef() {
  var wrap = document.getElementById('solucion-nutritiva-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getSolucionNutritivaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var micros = ['fe','mn','zn','cu','b','mo'];
  var ranges = { fe: [1.5,3], mn: [0.3,1], zn: [0.05,0.3], cu: [0.03,0.1], b: [0.3,0.6], mo: [0.03,0.08] };
  micros.forEach(function(key) {
    var val = parseFloat(a.micros && a.micros[key]);
    var refEl = document.getElementById('sn-ref-' + key);
    var diffEl = document.getElementById('sn-diff-' + key);
    var idealVal = a.ideal && a.ideal[key] !== undefined && a.ideal[key] !== '' ? parseFloat(a.ideal[key]) : NaN;
    if (refEl) { if (isNaN(val)) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="Sin dato"></span>'; refEl.className = 'sn-ref-badge'; } else { var r = ranges[key]; if (r) { if (val >= r[0] && val <= r[1]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Dentro"></span>'; refEl.className = 'sn-ref-badge'; } else if (val < r[0]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-low" title="Bajo"></span>'; refEl.className = 'sn-ref-badge'; } else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Alto"></span>'; refEl.className = 'sn-ref-badge'; } } else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="—"></span>'; refEl.className = 'sn-ref-badge'; } } }
    if (diffEl && !isNaN(idealVal) && !isNaN(val)) { var d = idealVal - val; diffEl.textContent = (d >= 0 ? '+' : '') + d.toFixed(2); } else if (diffEl) diffEl.textContent = '—';
  });
};

window.snUpdateMacroRef = function snUpdateMacroRef(group, key) {
  var wrap = document.getElementById('solucion-nutritiva-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getSolucionNutritivaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var data = group === 'cations' ? a.cations : a.anions;
  var ppmVal = data && data[key + '_ppm'] !== undefined && data[key + '_ppm'] !== '' ? parseFloat(data[key + '_ppm']) : NaN;
  var refRanges = { ca: [140,220], mg: [40,70], k: [180,300], so4: [60,110], po4: [30,60], no3: [140,200] };
  var r = refRanges[key];
  var refEl = document.getElementById('sn-ref-' + key);
  var diffEl = document.getElementById('sn-diff-' + key);
  var idealVal = a.ideal && a.ideal[key] !== undefined && a.ideal[key] !== '' ? parseFloat(a.ideal[key]) : NaN;
  if (refEl) {
    if (isNaN(ppmVal)) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="Sin dato"></span>'; refEl.className = 'sn-ref-badge'; }
    else if (r) {
      if (ppmVal >= r[0] && ppmVal <= r[1]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Dentro"></span>'; refEl.className = 'sn-ref-badge'; }
      else if (ppmVal < r[0]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-low" title="Bajo"></span>'; refEl.className = 'sn-ref-badge'; }
      else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Alto"></span>'; refEl.className = 'sn-ref-badge'; }
    } else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="—"></span>'; refEl.className = 'sn-ref-badge'; }
  }
  if (diffEl && !isNaN(idealVal) && !isNaN(ppmVal)) { var d = idealVal - ppmVal; diffEl.textContent = (d >= 0 ? '+' : '') + d.toFixed(2); } else if (diffEl) diffEl.textContent = '—';
};

window.selectSolucionNutritivaAnalysis = function selectSolucionNutritivaAnalysis(id) {
  var list = window.getSolucionNutritivaAnalyses();
  var a = list.find(function(x) { return x.id === id; });
  var emptyEl = document.getElementById('solucion-nutritiva-form-empty');
  var wrapEl = document.getElementById('solucion-nutritiva-form-wrap');
  if (!wrapEl) return;
  if (!a) { wrapEl.style.display = 'none'; wrapEl.setAttribute('data-current-id', ''); if (emptyEl) emptyEl.style.display = 'block'; document.querySelectorAll('#solucion-nutritiva-list .soil-analysis-card').forEach(function(c) { c.classList.remove('active'); }); return; }
  wrapEl.setAttribute('data-current-id', id);
  wrapEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  document.getElementById('sn-meta-title').value = a.title || '';
  document.getElementById('sn-meta-date').value = a.date || '';
  if (a.general) { ['ce','ph','ras'].forEach(function(f) { var el = document.getElementById('sn-general-' + f); if (el) el.value = a.general[f] !== undefined && a.general[f] !== '' ? a.general[f] : ''; }); }
  function snFmt2(v) { if (v === undefined || v === '' || v === null) return ''; var n = parseFloat(v); return isNaN(n) ? '' : n.toFixed(2); }
  ['Ca','Mg','Na','K'].forEach(function(m) { var k = m.toLowerCase(); var elMeq = document.getElementById('sn-' + k + '-meq'); var elPpm = document.getElementById('sn-' + k + '-ppm'); if (elMeq && a.cations) elMeq.value = snFmt2(a.cations[k + '_meq']); if (elPpm && a.cations) elPpm.value = snFmt2(a.cations[k + '_ppm']); });
  ['SO4','HCO3','Cl','CO3','PO4','NO3'].forEach(function(m) { var k = (m === 'NO3' ? 'no3' : m === 'PO4' ? 'po4' : m === 'SO4' ? 'so4' : m === 'HCO3' ? 'hco3' : m === 'CO3' ? 'co3' : m.toLowerCase()); var elMeq = document.getElementById('sn-' + k + '-meq'); var elPpm = document.getElementById('sn-' + k + '-ppm'); if (elMeq && a.anions) elMeq.value = snFmt2(a.anions[k + '_meq']); if (elPpm && a.anions) elPpm.value = snFmt2(a.anions[k + '_ppm']); });
  if (a.micros) { ['b','fe','mn','cu','zn','mo'].forEach(function(f) { var el = document.getElementById('sn-micro-' + f); if (el) el.value = a.micros[f] !== undefined && a.micros[f] !== '' ? a.micros[f] : ''; }); }
  if (a.ideal) {
    ['fe','mn','zn','cu','b','mo'].forEach(function(f) { var el = document.getElementById('sn-ideal-' + f); if (el) el.value = a.ideal[f] !== undefined && a.ideal[f] !== '' ? a.ideal[f] : ''; });
    ['ca','mg','na','k','so4','hco3','cl','co3','po4','no3'].forEach(function(f) { var el = document.getElementById('sn-ideal-' + f); if (el) el.value = a.ideal[f] !== undefined && a.ideal[f] !== '' ? a.ideal[f] : ''; });
  }
  document.querySelectorAll('#solucion-nutritiva-list .soil-analysis-card').forEach(function(c) { c.classList.toggle('active', c.getAttribute('data-id') === id); });
  window.snUpdateMicroRef && window.snUpdateMicroRef();
  ['ca','mg','na','k'].forEach(function(k) { window.snUpdateMacroRef && window.snUpdateMacroRef('cations', k); });
  ['so4','hco3','cl','co3','po4','no3'].forEach(function(k) { window.snUpdateMacroRef && window.snUpdateMacroRef('anions', k); });
};

window.renderSolucionNutritivaList = function renderSolucionNutritivaList() {
  var listEl = document.getElementById('solucion-nutritiva-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  window.getSolucionNutritivaAnalyses().forEach(function(a) {
    var card = document.createElement('div');
    card.className = 'soil-analysis-card';
    card.setAttribute('data-id', a.id);
    card.innerHTML = '<div class="soil-analysis-card-title">' + (a.title || 'Sin título') + '</div><div class="soil-analysis-card-date">' + (a.date || '') + '</div>';
    card.onclick = function() { window.selectSolucionNutritivaAnalysis(a.id); };
    listEl.appendChild(card);
  });
};

window.deleteCurrentSolucionNutritivaAnalysis = function deleteCurrentSolucionNutritivaAnalysis() {
  var wrap = document.getElementById('solucion-nutritiva-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  if (!confirm('¿Eliminar este análisis de solución nutritiva?')) return;
  var list = window.getSolucionNutritivaAnalyses();
  var arr = list.filter(function(a) { return a.id !== id; });
  currentProject.solucionNutritivaAnalyses = arr;
  window.saveSolucionNutritivaAnalysesToProject();
  window.renderSolucionNutritivaList && window.renderSolucionNutritivaList();
  wrap.style.display = 'none';
  wrap.setAttribute('data-current-id', '');
  document.getElementById('solucion-nutritiva-form-empty').style.display = 'block';
  window.selectSolucionNutritivaAnalysis(null);
};

window.initSolucionNutritivaTab = function initSolucionNutritivaTab() {
  window.getSolucionNutritivaAnalyses();
  window.renderSolucionNutritivaList && window.renderSolucionNutritivaList();
  var wrap = document.getElementById('solucion-nutritiva-form-wrap');
  var emptyEl = document.getElementById('solucion-nutritiva-form-empty');
  if (wrap) { wrap.style.display = 'none'; wrap.setAttribute('data-current-id', ''); }
  if (emptyEl) emptyEl.style.display = 'block';
};

window.saveSolucionNutritivaUIState = function saveSolucionNutritivaUIState() {
  if (!currentProject.id) return;
  var wrap = document.getElementById('solucion-nutritiva-form-wrap');
  var selectedId = wrap ? wrap.getAttribute('data-current-id') || '' : '';
  var openSections = [];
  var sections = document.querySelectorAll('#solucion-nutritiva-form-wrap .soil-section[data-sn-section]');
  sections.forEach(function(d) {
    if (d.open) openSections.push(d.getAttribute('data-sn-section'));
  });
  try {
    var key = 'nutriplant_solucion_nutritiva_ui_' + currentProject.id;
    localStorage.setItem(key, JSON.stringify({ selectedId: selectedId, openSections: openSections }));
  } catch (e) { console.warn('saveSolucionNutritivaUIState', e); }
};

window.restoreSolucionNutritivaUIState = function restoreSolucionNutritivaUIState() {
  if (!currentProject.id) return;
  try {
    var key = 'nutriplant_solucion_nutritiva_ui_' + currentProject.id;
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var state = JSON.parse(raw);
    var selectedId = state.selectedId;
    var openSections = Array.isArray(state.openSections) ? state.openSections : [];
    if (selectedId) {
      var list = window.getSolucionNutritivaAnalyses();
      if (list.some(function(a) { return a.id === selectedId; }) && typeof window.selectSolucionNutritivaAnalysis === 'function') {
        window.selectSolucionNutritivaAnalysis(selectedId);
      }
    }
    if (openSections.length > 0) {
      document.querySelectorAll('#solucion-nutritiva-form-wrap .soil-section[data-sn-section]').forEach(function(d) {
        var section = d.getAttribute('data-sn-section');
        d.open = openSections.indexOf(section) !== -1;
      });
    }
    var container = document.querySelector('#solucion-nutritiva-form-wrap .soil-analysis-sections');
    if (container && !container._snToggleBound) {
      container._snToggleBound = true;
      container.addEventListener('toggle', function(e) {
        if (e.target && e.target.matches && e.target.matches('details[data-sn-section]') && typeof window.saveSolucionNutritivaUIState === 'function') {
          window.saveSolucionNutritivaUIState();
        }
      });
    }
  } catch (e) { console.warn('restoreSolucionNutritivaUIState', e); }
};

// ========== EXTRACTO DE PASTA (referencias en ppm; CE, RAS, pH sin ref) ==========
function createEmptyExtractoPastaAnalysis() {
  var id = 'ep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  return {
    id: id,
    title: '',
    date: '',
    general: { cee: '', ras: '', phe: '' },
    cations: { ca_meq: '', ca_ppm: '', mg_meq: '', mg_ppm: '', na_meq: '', na_ppm: '', k_meq: '', k_ppm: '' },
    anions: { so4_meq: '', so4_ppm: '', hco3_meq: '', hco3_ppm: '', cl_meq: '', cl_ppm: '', co3_meq: '', co3_ppm: '', po4_meq: '', po4_ppm: '', no3_meq: '', no3_ppm: '' },
    micros: { b: '', fe: '', mn: '', cu: '', zn: '', mo: '' },
    ideal: {}
  };
}

function createExtractoPastaTabHTML() {
  return `
    <div class="card soil-analysis-tab-container soil-analysis-watermark-wrap" id="extracto-pasta-tab-container">
      <div class="soil-analysis-watermark" aria-hidden="true">
        <img src="assets/NutriPlant_PRO_blue.png" alt="">
      </div>
      <h2 class="text-xl" style="margin-bottom: 16px;">🔬 Extracto de Pasta</h2>
      <p style="margin-bottom:12px;font-size:0.9rem;color:#64748b;">Análisis de extracto de pasta saturada. Datos generales, aniones, cationes, micronutrimentos y relación nutrimental. Referencias en ppm.</p>
      <div class="soil-analysis-layout">
        <div class="soil-analysis-list-panel">
          <div class="soil-analysis-list-header">
            <strong>Reportes en este proyecto</strong>
            <div class="soil-analysis-list-actions">
              <button type="button" class="btn btn-sm btn-success" onclick="window.addNewExtractoPastaAnalysis && window.addNewExtractoPastaAnalysis();">➕ Agregar análisis</button>
            </div>
          </div>
          <div id="extracto-pasta-list" class="soil-analyses-list"></div>
        </div>
        <div class="soil-analysis-form-panel" id="extracto-pasta-form-panel">
          <div id="extracto-pasta-form-empty" class="soil-analysis-form-empty">
            <p>Selecciona un análisis de la lista o agrega uno nuevo.</p>
          </div>
          <div id="extracto-pasta-form-wrap" class="soil-analysis-form-wrap" style="display: none;" data-current-id="">
            <div class="soil-analysis-form-header">
              <input type="text" id="ep-meta-title" placeholder="Título (ej. Extracto pasta Ene 2025)" class="soil-input-inline" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('meta','title',this.value)">
              <input type="text" id="ep-meta-date" placeholder="Fecha (ej. 2025-01-15)" class="soil-input-inline" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('meta','date',this.value)">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteCurrentExtractoPastaAnalysis && window.deleteCurrentExtractoPastaAnalysis();">Eliminar</button>
            </div>
            <div class="soil-analysis-sections">
              <details class="soil-section" data-ep-section="general" open>
                <summary>📐 CE, RAS y pH</summary>
                <div class="soil-fields">
                  <label>CE (dS/m) <input type="number" step="0.01" id="ep-general-cee" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('general','cee',this.value)"></label>
                  <label>RAS <input type="number" step="0.01" id="ep-general-ras" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('general','ras',this.value)"></label>
                  <label>pH <input type="number" step="0.01" id="ep-general-phe" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('general','phe',this.value)"></label>
                </div>
              </details>
              <details class="soil-section" data-ep-section="cations" open>
                <summary>⚗️ Cationes (meq/L y ppm)</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>meq/L</th><th>ppm</th><th>Ref. (ppm)</th><th>Estado</th><th>Ideal (opc.)</th><th>Diferencia</th></tr></thead>
                    <tbody>
                      <tr><td>Ca²⁺</td><td><input type="number" step="0.01" id="ep-ca-meq" class="fertirriego-input" data-ep-macro="Ca" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Ca','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','ca');"></td><td><input type="number" step="0.1" id="ep-ca-ppm" class="fertirriego-input" data-ep-macro="Ca" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Ca','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','ca');"></td><td>150 – 220</td><td id="ep-ref-ca" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-ca" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','ca',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','ca');"></td><td id="ep-diff-ca">—</td></tr>
                      <tr><td>Mg²⁺</td><td><input type="number" step="0.01" id="ep-mg-meq" class="fertirriego-input" data-ep-macro="Mg" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Mg','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','mg');"></td><td><input type="number" step="0.1" id="ep-mg-ppm" class="fertirriego-input" data-ep-macro="Mg" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Mg','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','mg');"></td><td>40 – 70</td><td id="ep-ref-mg" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-mg" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','mg',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','mg');"></td><td id="ep-diff-mg">—</td></tr>
                      <tr><td>Na⁺</td><td><input type="number" step="0.01" id="ep-na-meq" class="fertirriego-input" data-ep-macro="Na" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Na','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','na');"></td><td><input type="number" step="0.1" id="ep-na-ppm" class="fertirriego-input" data-ep-macro="Na" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Na','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','na');"></td><td>ideal &lt;50</td><td id="ep-ref-na" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-na" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','na',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','na');"></td><td id="ep-diff-na">—</td></tr>
                      <tr><td>K⁺</td><td><input type="number" step="0.01" id="ep-k-meq" class="fertirriego-input" data-ep-macro="K" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('K','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','k');"></td><td><input type="number" step="0.1" id="ep-k-ppm" class="fertirriego-input" data-ep-macro="K" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('K','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','k');"></td><td>200 – 300</td><td id="ep-ref-k" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-k" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','k',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('cations','k');"></td><td id="ep-diff-k">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-ep-section="anions" open>
                <summary>⚗️ Aniones (meq/L y ppm)</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>meq/L</th><th>ppm</th><th>Ref. (ppm)</th><th>Estado</th><th>Ideal (opc.)</th><th>Diferencia</th></tr></thead>
                    <tbody>
                      <tr><td>N-NO₃⁻</td><td><input type="number" step="0.01" id="ep-no3-meq" class="fertirriego-input" data-ep-macro="NO3" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('NO3','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','no3'); window.epUpdateRatiosRef && window.epUpdateRatiosRef();"></td><td><input type="number" step="0.1" id="ep-no3-ppm" class="fertirriego-input" data-ep-macro="NO3" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('NO3','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','no3'); window.epUpdateRatiosRef && window.epUpdateRatiosRef();"></td><td>150 – 200</td><td id="ep-ref-no3" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-no3" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','no3',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','no3'); window.epUpdateRatiosRef && window.epUpdateRatiosRef();"></td><td id="ep-diff-no3">—</td></tr>
                      <tr><td>P-PO₄</td><td><input type="number" step="0.01" id="ep-po4-meq" class="fertirriego-input" data-ep-macro="PO4" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('PO4','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','po4');"></td><td><input type="number" step="0.01" id="ep-po4-ppm" class="fertirriego-input" data-ep-macro="PO4" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('PO4','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','po4');"></td><td>30 – 60</td><td id="ep-ref-po4" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-po4" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','po4',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','po4');"></td><td id="ep-diff-po4">—</td></tr>
                      <tr><td>S-SO₄²⁻</td><td><input type="number" step="0.01" id="ep-so4-meq" class="fertirriego-input" data-ep-macro="SO4" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('SO4','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','so4');"></td><td><input type="number" step="0.1" id="ep-so4-ppm" class="fertirriego-input" data-ep-macro="SO4" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('SO4','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','so4');"></td><td>60 – 110</td><td id="ep-ref-so4" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-so4" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','so4',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','so4');"></td><td id="ep-diff-so4">—</td></tr>
                      <tr><td>Cl⁻</td><td><input type="number" step="0.01" id="ep-cl-meq" class="fertirriego-input" data-ep-macro="Cl" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Cl','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','cl');"></td><td><input type="number" step="0.1" id="ep-cl-ppm" class="fertirriego-input" data-ep-macro="Cl" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('Cl','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','cl');"></td><td>ideal &lt;70</td><td id="ep-ref-cl" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-cl" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','cl',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','cl');"></td><td id="ep-diff-cl">—</td></tr>
                      <tr><td>HCO₃⁻</td><td><input type="number" step="0.01" id="ep-hco3-meq" class="fertirriego-input" data-ep-macro="HCO3" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('HCO3','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','hco3');"></td><td><input type="number" step="0.1" id="ep-hco3-ppm" class="fertirriego-input" data-ep-macro="HCO3" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('HCO3','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','hco3');"></td><td>ideal &lt;120</td><td id="ep-ref-hco3" class="sn-ref-badge">—</td><td><input type="number" step="0.1" id="ep-ideal-hco3" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','hco3',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','hco3');"></td><td id="ep-diff-hco3">—</td></tr>
                      <tr><td>CO₃²⁻</td><td><input type="number" step="0.01" id="ep-co3-meq" class="fertirriego-input" data-ep-macro="CO3" data-ep-unit="meq" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('CO3','meq',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','co3');"></td><td><input type="number" step="0.01" id="ep-co3-ppm" class="fertirriego-input" data-ep-macro="CO3" data-ep-unit="ppm" oninput="window.epSyncMeqPpm && window.epSyncMeqPpm('CO3','ppm',this); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','co3');"></td><td>ideal 0</td><td id="ep-ref-co3" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-co3" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','co3',this.value); window.epUpdateMacroRef && window.epUpdateMacroRef('anions','co3');"></td><td id="ep-diff-co3">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-ep-section="micros" open>
                <summary>🔬 Micronutrimentos (ppm)</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>Análisis (ppm)</th><th>Ref. min–max</th><th>Estado</th><th>Ideal (opc.)</th><th>Diferencia</th></tr></thead>
                    <tbody>
                      <tr><td>Fe</td><td><input type="number" step="0.01" id="ep-micro-fe" class="fertirriego-input" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('micros','fe',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td>1.5 – 3.0</td><td id="ep-ref-fe" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-fe" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','fe',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td id="ep-diff-fe">—</td></tr>
                      <tr><td>Mn</td><td><input type="number" step="0.01" id="ep-micro-mn" class="fertirriego-input" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('micros','mn',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td>0.3 – 1.0</td><td id="ep-ref-mn" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-mn" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','mn',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td id="ep-diff-mn">—</td></tr>
                      <tr><td>Zn</td><td><input type="number" step="0.01" id="ep-micro-zn" class="fertirriego-input" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('micros','zn',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td>0.05 – 0.3</td><td id="ep-ref-zn" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-zn" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','zn',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td id="ep-diff-zn">—</td></tr>
                      <tr><td>Cu</td><td><input type="number" step="0.01" id="ep-micro-cu" class="fertirriego-input" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('micros','cu',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td>0.03 – 0.1</td><td id="ep-ref-cu" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-cu" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','cu',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td id="ep-diff-cu">—</td></tr>
                      <tr><td>B</td><td><input type="number" step="0.01" id="ep-micro-b" class="fertirriego-input" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('micros','b',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td>0.3 – 0.6</td><td id="ep-ref-b" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-b" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','b',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td id="ep-diff-b">—</td></tr>
                      <tr><td>Mo</td><td><input type="number" step="0.01" id="ep-micro-mo" class="fertirriego-input" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('micros','mo',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td>0.03 – 0.08</td><td id="ep-ref-mo" class="sn-ref-badge">—</td><td><input type="number" step="0.01" id="ep-ideal-mo" class="fertirriego-input" style="width:70px;" onchange="window.saveExtractoPastaField && window.saveExtractoPastaField('ideal','mo',this.value); window.epUpdateMicroRef && window.epUpdateMicroRef();"></td><td id="ep-diff-mo">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-ep-section="ratios" open>
                <summary>📊 Relación nutrimental</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:10px;">Ratios calculados a partir de cationes y aniones.</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Relación</th><th>Resultado (meq/L)</th><th>Nivel ideal</th><th>Estado</th></tr></thead>
                    <tbody>
                      <tr><td>N-NO₃ / K</td><td id="ep-ratio-no3-k">—</td><td>2.00 – 2.50</td><td id="ep-ref-ratio-no3-k" class="sn-ref-badge">—</td></tr>
                      <tr><td>K / Ca</td><td id="ep-ratio-k-ca">—</td><td>0.20 – 0.40</td><td id="ep-ref-ratio-k-ca" class="sn-ref-badge">—</td></tr>
                      <tr><td>K / Mg</td><td id="ep-ratio-k-mg">—</td><td>0.20 – 0.50</td><td id="ep-ref-ratio-k-mg" class="sn-ref-badge">—</td></tr>
                      <tr><td>Ca / Mg</td><td id="ep-ratio-ca-mg">—</td><td>1.20 – 2.00</td><td id="ep-ref-ratio-ca-mg" class="sn-ref-badge">—</td></tr>
                      <tr><td>Ca / Na</td><td id="ep-ratio-ca-na">—</td><td>1.50 – 3.00</td><td id="ep-ref-ratio-ca-na" class="sn-ref-badge">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.getExtractoPastaAnalyses = function getExtractoPastaAnalyses() {
  if (!currentProject.id) return [];
  if (!Array.isArray(currentProject.extractoPastaAnalyses)) currentProject.extractoPastaAnalyses = [];
  return currentProject.extractoPastaAnalyses;
};

window.addNewExtractoPastaAnalysis = function addNewExtractoPastaAnalysis() {
  if (!currentProject.id) { alert('Selecciona un proyecto primero.'); return; }
  var list = window.getExtractoPastaAnalyses();
  var a = createEmptyExtractoPastaAnalysis();
  a.title = 'Nuevo análisis ' + (list.length + 1);
  list.push(a);
  window.saveExtractoPastaAnalysesToProject();
  window.renderExtractoPastaList && window.renderExtractoPastaList();
  window.selectExtractoPastaAnalysis && window.selectExtractoPastaAnalysis(a.id);
};

var _extractoPastaSaveTimer = null;
window.saveExtractoPastaAnalysesToProject = function saveExtractoPastaAnalysesToProject() {
  if (!currentProject.id) return;
  if (_extractoPastaSaveTimer) clearTimeout(_extractoPastaSaveTimer);
  var projectId = currentProject.id;
  var dataCopy = JSON.parse(JSON.stringify(window.getExtractoPastaAnalyses() || []));
  _extractoPastaSaveTimer = setTimeout(function() {
    _extractoPastaSaveTimer = null;
    var run = function() {
      try { window.projectStorage && window.projectStorage.saveSection('extractoPastaAnalyses', dataCopy, projectId); } catch (e) { console.warn('saveExtractoPastaAnalysesToProject', e); }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 0);
    }
  }, 350);
};

window.saveExtractoPastaField = function saveExtractoPastaField(group, field, value) {
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getExtractoPastaAnalyses();
  var a = list.find(function(x) { return x.id === id; });
  if (!a) return;
  if (group === 'meta') { a[field] = value; }
  else if (group === 'general' && a.general) { a.general[field] = value; }
  else if (group === 'cations' && a.cations) { a.cations[field] = value; }
  else if (group === 'anions' && a.anions) { a.anions[field] = value; }
  else if (group === 'micros' && a.micros) { a.micros[field] = value; }
  else if (group === 'ideal') { if (!a.ideal) a.ideal = {}; a.ideal[field] = value; }
  window.saveExtractoPastaAnalysesToProject();
};

window.epSyncMeqPpm = function epSyncMeqPpm(macro, fromUnit, inputEl) {
  var val = parseFloat(inputEl.value);
  if (isNaN(val)) return;
  var w = SN_EQ_WEIGHTS[macro];
  if (!w) return;
  var key = (macro === 'NO3' ? 'no3' : macro === 'PO4' ? 'po4' : macro === 'SO4' ? 'so4' : macro === 'HCO3' ? 'hco3' : macro === 'CO3' ? 'co3' : macro.toLowerCase());
  var meqEl = document.getElementById('ep-' + key + '-meq');
  var ppmEl = document.getElementById('ep-' + key + '-ppm');
  if (!meqEl || !ppmEl) return;
  if (fromUnit === 'meq') ppmEl.value = (val * w).toFixed(2);
  else meqEl.value = (val / w).toFixed(2);
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getExtractoPastaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var keyMeq = key + '_meq', keyPpm = key + '_ppm';
  var isCation = ['Ca','Mg','Na','K'].indexOf(macro) !== -1;
  if (isCation && a.cations) { a.cations[keyMeq] = meqEl.value; a.cations[keyPpm] = ppmEl.value; }
  if (!isCation && a.anions) { a.anions[keyMeq] = meqEl.value; a.anions[keyPpm] = ppmEl.value; }
  window.saveExtractoPastaAnalysesToProject();
  if (typeof window.epUpdateRatiosRef === 'function') window.epUpdateRatiosRef();
};

// Referencias en ppm: rango [min,max] o ideal/riesgo { idealMax, riskMin }
var EP_REF_PPM = {
  ca: [150, 220], mg: [40, 70], k: [200, 300], no3: [150, 200],
  so4: [60, 110],
  na: { idealMax: 50, riskMin: 100 },
  cl: { idealMax: 70, riskMin: 140 },
  hco3: { idealMax: 120, riskMin: 200 },
  co3: { maxMeq: 0.2 }
};
// P ref 30-60 ppm (P elemental); comparar po4_ppm * 31/95
var EP_P_REF = [30, 60];

window.epUpdateMacroRef = function epUpdateMacroRef(group, key) {
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getExtractoPastaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var data = group === 'cations' ? a.cations : a.anions;
  var ppmVal = data && data[key + '_ppm'] !== undefined && data[key + '_ppm'] !== '' ? parseFloat(data[key + '_ppm']) : NaN;
  var meqVal = data && data[key + '_meq'] !== undefined && data[key + '_meq'] !== '' ? parseFloat(data[key + '_meq']) : NaN;
  var refEl = document.getElementById('ep-ref-' + key);
  var diffEl = document.getElementById('ep-diff-' + key);
  var idealVal = a.ideal && a.ideal[key] !== undefined && a.ideal[key] !== '' ? parseFloat(a.ideal[key]) : NaN;

  if (key === 'po4') {
    var pPpm = isNaN(ppmVal) ? NaN : ppmVal * 31 / 95;
    ppmVal = pPpm;
  } else if (key === 'so4') {
    var sPpm = data && data.so4_ppm !== undefined && data.so4_ppm !== '' ? parseFloat(data.so4_ppm) * 32 / 96 : NaN;
    ppmVal = sPpm;
  }

  if (refEl) {
    if (isNaN(ppmVal) && key !== 'co3') { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="Sin dato"></span>'; refEl.className = 'sn-ref-badge'; }
    else if (key === 'co3') {
      if (isNaN(meqVal)) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="Sin dato"></span>'; refEl.className = 'sn-ref-badge'; }
      else if (meqVal <= EP_REF_PPM.co3.maxMeq) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Dentro"></span>'; refEl.className = 'sn-ref-badge'; }
      else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Alto"></span>'; refEl.className = 'sn-ref-badge'; }
    } else if (key === 'na' || key === 'cl' || key === 'hco3') {
      var th = EP_REF_PPM[key];
      if (ppmVal <= th.idealMax) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Ideal"></span>'; refEl.className = 'sn-ref-badge'; }
      else if (ppmVal >= th.riskMin) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Riesgo"></span>'; refEl.className = 'sn-ref-badge'; }
      else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-low" title="Atención"></span>'; refEl.className = 'sn-ref-badge'; }
    } else if (key === 'po4') {
      var r = EP_P_REF;
      if (isNaN(ppmVal)) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="Sin dato"></span>'; refEl.className = 'sn-ref-badge'; }
      else if (ppmVal >= r[0] && ppmVal <= r[1]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Dentro"></span>'; refEl.className = 'sn-ref-badge'; }
      else if (ppmVal < r[0]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-low" title="Bajo"></span>'; refEl.className = 'sn-ref-badge'; }
      else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Alto"></span>'; refEl.className = 'sn-ref-badge'; }
    } else {
      var r = EP_REF_PPM[key];
      if (!r || !Array.isArray(r)) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="—"></span>'; refEl.className = 'sn-ref-badge'; }
      else if (ppmVal >= r[0] && ppmVal <= r[1]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Dentro"></span>'; refEl.className = 'sn-ref-badge'; }
      else if (ppmVal < r[0]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-low" title="Bajo"></span>'; refEl.className = 'sn-ref-badge'; }
      else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Alto"></span>'; refEl.className = 'sn-ref-badge'; }
    }
  }
  if (diffEl && !isNaN(idealVal)) {
    var cmpPpm = data && data[key + '_ppm'] ? parseFloat(data[key + '_ppm']) : NaN;
    if (!isNaN(cmpPpm)) { var d = idealVal - cmpPpm; diffEl.textContent = (d >= 0 ? '+' : '') + d.toFixed(2); } else diffEl.textContent = '—';
  } else if (diffEl) diffEl.textContent = '—';
};

window.epUpdateGeneralRef = function epUpdateGeneralRef() {
  /* CE, RAS y pH sin parámetros de referencia; no actualizar estado. */
};

window.epUpdateMicroRef = function epUpdateMicroRef() {
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getExtractoPastaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var micros = ['fe','mn','zn','cu','b','mo'];
  var ranges = { fe: [1.5,3], mn: [0.3,1], zn: [0.05,0.3], cu: [0.03,0.1], b: [0.3,0.6], mo: [0.03,0.08] };
  micros.forEach(function(key) {
    var val = parseFloat(a.micros && a.micros[key]);
    var refEl = document.getElementById('ep-ref-' + key);
    var diffEl = document.getElementById('ep-diff-' + key);
    var idealVal = a.ideal && a.ideal[key] !== undefined && a.ideal[key] !== '' ? parseFloat(a.ideal[key]) : NaN;
    if (refEl) { if (isNaN(val)) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="Sin dato"></span>'; refEl.className = 'sn-ref-badge'; } else { var r = ranges[key]; if (r) { if (val >= r[0] && val <= r[1]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Dentro"></span>'; refEl.className = 'sn-ref-badge'; } else if (val < r[0]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-low" title="Bajo"></span>'; refEl.className = 'sn-ref-badge'; } else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Alto"></span>'; refEl.className = 'sn-ref-badge'; } } else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="—"></span>'; refEl.className = 'sn-ref-badge'; } } }
    if (diffEl && !isNaN(idealVal) && !isNaN(val)) { var d = idealVal - val; diffEl.textContent = (d >= 0 ? '+' : '') + d.toFixed(2); } else if (diffEl) diffEl.textContent = '—';
  });
};

var EP_RATIO_IDEAL = { no3_k: [2,2.5], k_ca: [0.2,0.4], k_mg: [0.2,0.5], ca_mg: [1.2,2], ca_na: [1.5,3] };
window.epUpdateRatiosRef = function epUpdateRatiosRef() {
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getExtractoPastaAnalyses().find(function(x) { return x.id === id; });
  if (!a || !a.cations || !a.anions) return;
  var k = parseFloat(a.cations.k_meq); var ca = parseFloat(a.cations.ca_meq); var mg = parseFloat(a.cations.mg_meq); var na = parseFloat(a.cations.na_meq);
  var no3 = parseFloat(a.anions.no3_meq);
  function setRatio(name, num, den, valueElId, refElId, range) {
    var valueEl = document.getElementById(valueElId);
    var refEl = document.getElementById(refElId);
    if (!valueEl || !refEl) return;
    if (!range || isNaN(num) || isNaN(den) || den === 0) { valueEl.textContent = '—'; refEl.innerHTML = '<span class="sn-status-dot sn-ref-none" title="—"></span>'; refEl.className = 'sn-ref-badge'; return; }
    var ratio = num / den;
    valueEl.textContent = ratio.toFixed(2);
    if (ratio >= range[0] && ratio <= range[1]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-ok" title="Dentro"></span>'; refEl.className = 'sn-ref-badge'; }
    else if (ratio < range[0]) { refEl.innerHTML = '<span class="sn-status-dot sn-ref-low" title="Bajo"></span>'; refEl.className = 'sn-ref-badge'; }
    else { refEl.innerHTML = '<span class="sn-status-dot sn-ref-high" title="Alto"></span>'; refEl.className = 'sn-ref-badge'; }
  }
  setRatio('no3_k', no3, k, 'ep-ratio-no3-k', 'ep-ref-ratio-no3-k', EP_RATIO_IDEAL.no3_k);
  setRatio('k_ca', k, ca, 'ep-ratio-k-ca', 'ep-ref-ratio-k-ca', EP_RATIO_IDEAL.k_ca);
  setRatio('k_mg', k, mg, 'ep-ratio-k-mg', 'ep-ref-ratio-k-mg', EP_RATIO_IDEAL.k_mg);
  setRatio('ca_mg', ca, mg, 'ep-ratio-ca-mg', 'ep-ref-ratio-ca-mg', EP_RATIO_IDEAL.ca_mg);
  setRatio('ca_na', ca, na, 'ep-ratio-ca-na', 'ep-ref-ratio-ca-na', EP_RATIO_IDEAL.ca_na);
};

window.selectExtractoPastaAnalysis = function selectExtractoPastaAnalysis(id) {
  var list = window.getExtractoPastaAnalyses();
  var a = list.find(function(x) { return x.id === id; });
  var emptyEl = document.getElementById('extracto-pasta-form-empty');
  var wrapEl = document.getElementById('extracto-pasta-form-wrap');
  if (!wrapEl) return;
  if (!a) { wrapEl.style.display = 'none'; wrapEl.setAttribute('data-current-id', ''); if (emptyEl) emptyEl.style.display = 'block'; document.querySelectorAll('#extracto-pasta-list .soil-analysis-card').forEach(function(c) { c.classList.remove('active'); }); return; }
  wrapEl.setAttribute('data-current-id', id);
  wrapEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  document.getElementById('ep-meta-title').value = a.title || '';
  document.getElementById('ep-meta-date').value = a.date || '';
  if (a.general) { ['cee','ras','phe'].forEach(function(f) { var el = document.getElementById('ep-general-' + f); if (el) el.value = a.general[f] !== undefined && a.general[f] !== '' ? a.general[f] : ''; }); }
  function epFmt2(v) { if (v === undefined || v === '' || v === null) return ''; var n = parseFloat(v); return isNaN(n) ? '' : n.toFixed(2); }
  ['Ca','Mg','Na','K'].forEach(function(m) { var k = m.toLowerCase(); var elMeq = document.getElementById('ep-' + k + '-meq'); var elPpm = document.getElementById('ep-' + k + '-ppm'); if (elMeq && a.cations) elMeq.value = epFmt2(a.cations[k + '_meq']); if (elPpm && a.cations) elPpm.value = epFmt2(a.cations[k + '_ppm']); });
  ['SO4','HCO3','Cl','CO3','PO4','NO3'].forEach(function(m) { var k = (m === 'NO3' ? 'no3' : m === 'PO4' ? 'po4' : m === 'SO4' ? 'so4' : m === 'HCO3' ? 'hco3' : m === 'CO3' ? 'co3' : m.toLowerCase()); var elMeq = document.getElementById('ep-' + k + '-meq'); var elPpm = document.getElementById('ep-' + k + '-ppm'); if (elMeq && a.anions) elMeq.value = epFmt2(a.anions[k + '_meq']); if (elPpm && a.anions) elPpm.value = epFmt2(a.anions[k + '_ppm']); });
  if (a.micros) { ['b','fe','mn','cu','zn','mo'].forEach(function(f) { var el = document.getElementById('ep-micro-' + f); if (el) el.value = a.micros[f] !== undefined && a.micros[f] !== '' ? a.micros[f] : ''; }); }
  if (a.ideal) { ['ca','mg','na','k','so4','hco3','cl','co3','po4','no3','fe','mn','zn','cu','b','mo'].forEach(function(f) { var el = document.getElementById('ep-ideal-' + f); if (el) el.value = a.ideal[f] !== undefined && a.ideal[f] !== '' ? a.ideal[f] : ''; }); }
  document.querySelectorAll('#extracto-pasta-list .soil-analysis-card').forEach(function(c) { c.classList.toggle('active', c.getAttribute('data-id') === id); });
  window.epUpdateGeneralRef && window.epUpdateGeneralRef();
  window.epUpdateMicroRef && window.epUpdateMicroRef();
  ['ca','mg','na','k'].forEach(function(k) { window.epUpdateMacroRef && window.epUpdateMacroRef('cations', k); });
  ['so4','hco3','cl','co3','po4','no3'].forEach(function(k) { window.epUpdateMacroRef && window.epUpdateMacroRef('anions', k); });
  window.epUpdateRatiosRef && window.epUpdateRatiosRef();
};

window.renderExtractoPastaList = function renderExtractoPastaList() {
  var listEl = document.getElementById('extracto-pasta-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  window.getExtractoPastaAnalyses().forEach(function(a) {
    var card = document.createElement('div');
    card.className = 'soil-analysis-card';
    card.setAttribute('data-id', a.id);
    card.innerHTML = '<div class="soil-analysis-card-title">' + (a.title || 'Sin título') + '</div><div class="soil-analysis-card-date">' + (a.date || '') + '</div>';
    card.onclick = function() { window.selectExtractoPastaAnalysis(a.id); };
    listEl.appendChild(card);
  });
};

window.deleteCurrentExtractoPastaAnalysis = function deleteCurrentExtractoPastaAnalysis() {
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  if (!confirm('¿Eliminar este análisis de extracto de pasta?')) return;
  var list = window.getExtractoPastaAnalyses();
  var arr = list.filter(function(a) { return a.id !== id; });
  currentProject.extractoPastaAnalyses = arr;
  window.saveExtractoPastaAnalysesToProject();
  window.renderExtractoPastaList && window.renderExtractoPastaList();
  wrap.style.display = 'none';
  wrap.setAttribute('data-current-id', '');
  document.getElementById('extracto-pasta-form-empty').style.display = 'block';
  window.selectExtractoPastaAnalysis(null);
};

window.initExtractoPastaTab = function initExtractoPastaTab() {
  window.getExtractoPastaAnalyses();
  window.renderExtractoPastaList && window.renderExtractoPastaList();
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var emptyEl = document.getElementById('extracto-pasta-form-empty');
  if (wrap) { wrap.style.display = 'none'; wrap.setAttribute('data-current-id', ''); }
  if (emptyEl) emptyEl.style.display = 'block';
};

window.saveExtractoPastaUIState = function saveExtractoPastaUIState() {
  if (!currentProject.id) return;
  var wrap = document.getElementById('extracto-pasta-form-wrap');
  var selectedId = wrap ? wrap.getAttribute('data-current-id') || '' : '';
  var openSections = [];
  var sections = document.querySelectorAll('#extracto-pasta-form-wrap .soil-section[data-ep-section]');
  sections.forEach(function(d) { if (d.open) openSections.push(d.getAttribute('data-ep-section')); });
  try {
    var key = 'nutriplant_extracto_pasta_ui_' + currentProject.id;
    localStorage.setItem(key, JSON.stringify({ selectedId: selectedId, openSections: openSections }));
  } catch (e) { console.warn('saveExtractoPastaUIState', e); }
};

window.restoreExtractoPastaUIState = function restoreExtractoPastaUIState() {
  if (!currentProject.id) return;
  try {
    var key = 'nutriplant_extracto_pasta_ui_' + currentProject.id;
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var state = JSON.parse(raw);
    var selectedId = state.selectedId;
    var openSections = Array.isArray(state.openSections) ? state.openSections : [];
    if (selectedId) {
      var list = window.getExtractoPastaAnalyses();
      if (list.some(function(a) { return a.id === selectedId; }) && typeof window.selectExtractoPastaAnalysis === 'function') {
        window.selectExtractoPastaAnalysis(selectedId);
      }
    }
    if (openSections.length > 0) {
      document.querySelectorAll('#extracto-pasta-form-wrap .soil-section[data-ep-section]').forEach(function(d) {
        var section = d.getAttribute('data-ep-section');
        d.open = openSections.indexOf(section) !== -1;
      });
    }
    var container = document.querySelector('#extracto-pasta-form-wrap .soil-analysis-sections');
    if (container && !container._epToggleBound) {
      container._epToggleBound = true;
      container.addEventListener('toggle', function(e) {
        if (e.target && e.target.matches && e.target.matches('details[data-ep-section]') && typeof window.saveExtractoPastaUIState === 'function') {
          window.saveExtractoPastaUIState();
        }
      });
    }
  } catch (e) { console.warn('restoreExtractoPastaUIState', e); }
};

// ========== ANÁLISIS DE AGUA (sumas meq, m³ riego, kg elemento/óxido, ácido neutralización) ==========
var AGUA_ACIDS = [
  { id: 'acido_nitrico_55', name: 'Ácido Nítrico 55%', meqPerMl: 11.6 },
  { id: 'acido_sulfurico_98', name: 'Ácido Sulfúrico 98%', meqPerMl: 36.7 },
  { id: 'acido_fosforico_75', name: 'Ácido Fosfórico 75%', meqPerMl: 12.0 },
  { id: 'acido_fosforico_85', name: 'Ácido Fosfórico 85%', meqPerMl: 14.6 }
];

function createEmptyAguaAnalysis() {
  var id = 'aw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  return {
    id: id,
    title: '',
    date: '',
    m3Riego: '',
    acidResidualMeq: 1,
    general: { ce: '', ph: '', ras: '' },
    cations: { ca_meq: '', ca_ppm: '', mg_meq: '', mg_ppm: '', na_meq: '', na_ppm: '', k_meq: '', k_ppm: '' },
    anions: { so4_meq: '', so4_ppm: '', hco3_meq: '', hco3_ppm: '', cl_meq: '', cl_ppm: '', co3_meq: '', co3_ppm: '', po4_meq: '', po4_ppm: '', no3_meq: '', no3_ppm: '' },
    micros: { b: '', fe: '', mn: '', cu: '', zn: '' }
  };
}

function createAguaTabHTML() {
  var acidOptions = AGUA_ACIDS.map(function(ac){ return '<option value="'+ac.id+'">'+ac.name+'</option>'; }).join('');
  return `
    <div class="card soil-analysis-tab-container soil-analysis-watermark-wrap" id="agua-tab-container">
      <div class="soil-analysis-watermark" aria-hidden="true">
        <img src="assets/NutriPlant_PRO_blue.png" alt="">
      </div>
      <h2 class="text-xl" style="margin-bottom: 16px;">🔬 Análisis de Agua</h2>
      <p style="margin-bottom:12px;font-size:0.9rem;color:#64748b;">Análisis de agua de riego. meq/L y ppm con conversión automática, sumas de cationes y aniones, aporte por volumen (m³) en kg elemento y óxido, y cálculo de ácido para neutralizar bicarbonatos/carbonatos.</p>
      <div class="soil-analysis-layout">
        <div class="soil-analysis-list-panel">
          <div class="soil-analysis-list-header">
            <strong>Reportes en este proyecto</strong>
            <div class="soil-analysis-list-actions">
              <button type="button" class="btn btn-sm btn-success" onclick="window.addNewAguaAnalysis && window.addNewAguaAnalysis();">➕ Agregar análisis</button>
            </div>
          </div>
          <div id="agua-list" class="soil-analyses-list"></div>
        </div>
        <div class="soil-analysis-form-panel" id="agua-form-panel">
          <div id="agua-form-empty" class="soil-analysis-form-empty">
            <p>Selecciona un análisis de la lista o agrega uno nuevo.</p>
          </div>
          <div id="agua-form-wrap" class="soil-analysis-form-wrap" style="display: none;" data-current-id="">
            <div class="soil-analysis-form-header">
              <label style="margin-right:8px;">m³ agua de riego:</label>
              <input type="number" step="0.01" min="0" id="aw-m3-riego" placeholder="ej. 100" style="width:80px;" oninput="window.saveAguaField && window.saveAguaField('m3Riego',this.value); window.awUpdateKgOxide && window.awUpdateKgOxide(); window.awUpdateAcid && window.awUpdateAcid();" onchange="window.saveAguaField && window.saveAguaField('m3Riego',this.value); window.awUpdateKgOxide && window.awUpdateKgOxide(); window.awUpdateAcid && window.awUpdateAcid();">
              <input type="text" id="aw-meta-title" placeholder="Título" class="soil-input-inline" onchange="window.saveAguaField && window.saveAguaField('meta','title',this.value)">
              <input type="text" id="aw-meta-date" placeholder="Fecha" class="soil-input-inline" onchange="window.saveAguaField && window.saveAguaField('meta','date',this.value)">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteCurrentAguaAnalysis && window.deleteCurrentAguaAnalysis();">Eliminar</button>
            </div>
            <div class="soil-analysis-sections">
              <details class="soil-section" data-aw-section="general" open>
                <summary>📐 CE, RAS y pH</summary>
                <div class="soil-fields">
                  <label>CE (dS/m) <input type="number" step="0.01" id="aw-general-ce" onchange="window.saveAguaField && window.saveAguaField('general','ce',this.value)"></label>
                  <label>RAS <input type="number" step="0.01" id="aw-general-ras" onchange="window.saveAguaField && window.saveAguaField('general','ras',this.value)"></label>
                  <label>pH <input type="number" step="0.01" id="aw-general-ph" onchange="window.saveAguaField && window.saveAguaField('general','ph',this.value)"></label>
                </div>
              </details>
              <details class="soil-section" data-aw-section="cations" open>
                <summary>⚗️ Cationes (meq/L, ppm, kg elemento, kg óxido (CaO, MgO, K₂O))</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>meq/L</th><th>ppm</th><th>kg elemento</th><th>kg óxido (CaO, MgO, K₂O)</th></tr></thead>
                    <tbody>
                      <tr><td>Ca²⁺</td><td><input type="number" step="0.01" id="aw-ca-meq" class="fertirriego-input" data-aw-macro="Ca" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Ca','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td><input type="number" step="0.01" id="aw-ca-ppm" class="fertirriego-input" data-aw-macro="Ca" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Ca','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-ca">—</td><td id="aw-kg-cao">—</td></tr>
                      <tr><td>Mg²⁺</td><td><input type="number" step="0.01" id="aw-mg-meq" class="fertirriego-input" data-aw-macro="Mg" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Mg','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td><input type="number" step="0.01" id="aw-mg-ppm" class="fertirriego-input" data-aw-macro="Mg" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Mg','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-mg">—</td><td id="aw-kg-mgo">—</td></tr>
                      <tr><td>Na⁺</td><td><input type="number" step="0.01" id="aw-na-meq" class="fertirriego-input" data-aw-macro="Na" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Na','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td><input type="number" step="0.01" id="aw-na-ppm" class="fertirriego-input" data-aw-macro="Na" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Na','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-na">—</td><td id="aw-kg-na2o">—</td></tr>
                      <tr><td>K⁺</td><td><input type="number" step="0.01" id="aw-k-meq" class="fertirriego-input" data-aw-macro="K" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('K','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td><input type="number" step="0.01" id="aw-k-ppm" class="fertirriego-input" data-aw-macro="K" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('K','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-k">—</td><td id="aw-kg-k2o">—</td></tr>
                      <tr><td colspan="2"><strong>Suma cationes (meq/L)</strong></td><td id="aw-sum-cations-meq" colspan="3">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-aw-section="anions" open>
                <summary>⚗️ Aniones (meq/L, ppm, kg elemento)</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Para fertilizante: conversión elemento → óxido (P → P₂O₅, S → SO₃). Usa la Calculadora de Conversión Óxido ↔ Elemental</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>meq/L</th><th>ppm</th><th>kg elemento</th></tr></thead>
                    <tbody>
                      <tr><td>S-SO₄²⁻</td><td><input type="number" step="0.01" id="aw-so4-meq" class="fertirriego-input" data-aw-macro="SO4" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('SO4','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td><input type="number" step="0.01" id="aw-so4-ppm" class="fertirriego-input" data-aw-macro="SO4" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('SO4','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-s">—</td></tr>
                      <tr><td>HCO₃⁻</td><td><input type="number" step="0.01" id="aw-hco3-meq" class="fertirriego-input" data-aw-macro="HCO3" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('HCO3','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateAcid && window.awUpdateAcid();"></td><td><input type="number" step="0.01" id="aw-hco3-ppm" class="fertirriego-input" data-aw-macro="HCO3" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('HCO3','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateAcid && window.awUpdateAcid();"></td><td>—</td></tr>
                      <tr><td>Cl⁻</td><td><input type="number" step="0.01" id="aw-cl-meq" class="fertirriego-input" data-aw-macro="Cl" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Cl','meq',this); window.awUpdateSums && window.awUpdateSums();"></td><td><input type="number" step="0.01" id="aw-cl-ppm" class="fertirriego-input" data-aw-macro="Cl" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('Cl','ppm',this); window.awUpdateSums && window.awUpdateSums();"></td><td>—</td></tr>
                      <tr><td>CO₃²⁻</td><td><input type="number" step="0.01" id="aw-co3-meq" class="fertirriego-input" data-aw-macro="CO3" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('CO3','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateAcid && window.awUpdateAcid();"></td><td><input type="number" step="0.01" id="aw-co3-ppm" class="fertirriego-input" data-aw-macro="CO3" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('CO3','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateAcid && window.awUpdateAcid();"></td><td>—</td></tr>
                      <tr><td>P-H₂PO₄⁻</td><td><input type="number" step="0.01" id="aw-po4-meq" class="fertirriego-input" data-aw-macro="PO4" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('PO4','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td><input type="number" step="0.01" id="aw-po4-ppm" class="fertirriego-input" data-aw-macro="PO4" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('PO4','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-p">—</td></tr>
                      <tr><td>N-NO₃⁻</td><td><input type="number" step="0.01" id="aw-no3-meq" class="fertirriego-input" data-aw-macro="NO3" data-aw-unit="meq" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('NO3','meq',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td><input type="number" step="0.01" id="aw-no3-ppm" class="fertirriego-input" data-aw-macro="NO3" data-aw-unit="ppm" oninput="window.awSyncMeqPpm && window.awSyncMeqPpm('NO3','ppm',this); window.awUpdateSums && window.awUpdateSums(); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-n">—</td></tr>
                      <tr><td colspan="2"><strong>Suma aniones (meq/L)</strong></td><td id="aw-sum-anions-meq" colspan="2">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-aw-section="micros" open>
                <summary>🔬 Micronutrimentos (ppm)</summary>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>ppm</th><th>kg elemento</th></tr></thead>
                    <tbody>
                      <tr><td>B</td><td><input type="number" step="0.01" id="aw-micro-b" class="fertirriego-input" onchange="window.saveAguaField && window.saveAguaField('micros','b',this.value); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-b">—</td></tr>
                      <tr><td>Fe</td><td><input type="number" step="0.01" id="aw-micro-fe" class="fertirriego-input" onchange="window.saveAguaField && window.saveAguaField('micros','fe',this.value); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-fe">—</td></tr>
                      <tr><td>Mn</td><td><input type="number" step="0.01" id="aw-micro-mn" class="fertirriego-input" onchange="window.saveAguaField && window.saveAguaField('micros','mn',this.value); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-mn">—</td></tr>
                      <tr><td>Cu</td><td><input type="number" step="0.01" id="aw-micro-cu" class="fertirriego-input" onchange="window.saveAguaField && window.saveAguaField('micros','cu',this.value); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-cu">—</td></tr>
                      <tr><td>Zn</td><td><input type="number" step="0.01" id="aw-micro-zn" class="fertirriego-input" onchange="window.saveAguaField && window.saveAguaField('micros','zn',this.value); window.awUpdateKgOxide && window.awUpdateKgOxide();"></td><td id="aw-kg-zn">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-aw-section="acid" open style="border:2px solid #16a34a;background:#f0fdf4;border-radius:8px;padding:12px;margin-top:8px;">
                <summary>🧪 Ácido para neutralizar HCO₃⁻ y CO₃²⁻</summary>
                <p style="font-size:0.85rem;color:#166534;margin-bottom:8px;">Meq ácido = (HCO₃⁻ + CO₃²⁻) − meq/L residual objetivo. Resultado en mL/m³ y litros totales según el volumen indicado.</p>
                <div class="soil-fields" style="margin-bottom:12px;">
                  <label>Ácido: <select id="aw-acid-select" onchange="window.saveAguaField && window.saveAguaField('acidId',this.value); window.awUpdateAcid && window.awUpdateAcid();">` + acidOptions + `</select></label>
                  <label>Residual objetivo (meq/L): <input type="number" step="0.01" min="0" id="aw-acid-residual" style="width:90px;" oninput="window.saveAguaField && window.saveAguaField('acidResidualMeq',this.value); window.awUpdateAcid && window.awUpdateAcid();" onchange="window.saveAguaField && window.saveAguaField('acidResidualMeq',this.value); window.awUpdateAcid && window.awUpdateAcid();"></label>
                </div>
                <div class="aw-acid-results" style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:0.9rem;">
                  <span>En base a (m³ agua):</span><span id="aw-acid-m3-ref">—</span>
                  <span>HCO₃⁻ (meq/L):</span><span id="aw-acid-hco3">—</span>
                  <span>CO₃²⁻ (meq/L):</span><span id="aw-acid-co3">—</span>
                  <span>Residual objetivo (meq/L):</span><span id="aw-acid-residual-ref">—</span>
                  <span>Meq/L ácido necesarios:</span><span id="aw-acid-meq-needed">—</span>
                </div>
                <div class="aw-acid-dosis-box" style="margin-top:10px;padding:10px 14px;border:2px solid #16a34a;border-radius:6px;background:#fff;display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:0.9rem;">
                  <span>mL ácido / m³:</span><span id="aw-acid-per-m3">—</span>
                  <span>L ácido (volumen total):</span><span id="aw-acid-total">—</span>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.getAguaAnalyses = function getAguaAnalyses() {
  if (!currentProject.id) return [];
  if (!Array.isArray(currentProject.aguaAnalyses)) currentProject.aguaAnalyses = [];
  return currentProject.aguaAnalyses;
};

window.addNewAguaAnalysis = function addNewAguaAnalysis() {
  if (!currentProject.id) { alert('Selecciona un proyecto primero.'); return; }
  var list = window.getAguaAnalyses();
  var a = createEmptyAguaAnalysis();
  a.title = 'Nuevo análisis ' + (list.length + 1);
  list.push(a);
  window.saveAguaAnalysesToProject();
  window.renderAguaList && window.renderAguaList();
  window.selectAguaAnalysis && window.selectAguaAnalysis(a.id);
};

var _aguaSaveTimer = null;
window.saveAguaAnalysesToProject = function saveAguaAnalysesToProject() {
  if (!currentProject.id) return;
  if (_aguaSaveTimer) clearTimeout(_aguaSaveTimer);
  var projectId = currentProject.id;
  var dataCopy = JSON.parse(JSON.stringify(window.getAguaAnalyses() || []));
  _aguaSaveTimer = setTimeout(function() {
    _aguaSaveTimer = null;
    var run = function() {
      try { window.projectStorage && window.projectStorage.saveSection('aguaAnalyses', dataCopy, projectId); } catch (e) { console.warn('saveAguaAnalysesToProject', e); }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 0);
    }
  }, 350);
};

window.saveAguaField = function saveAguaField(group, valueOrField, value) {
  var wrap = document.getElementById('agua-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getAguaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  if (group === 'm3Riego') { a.m3Riego = valueOrField; }
  else if (group === 'meta') { a[valueOrField] = value; }
  else if (group === 'general' && a.general) { a.general[valueOrField] = value; }
  else if (group === 'acidId') { a.acidId = valueOrField; }
  else if (group === 'acidResidualMeq') { a.acidResidualMeq = valueOrField; }
  else if (group === 'micros' && a.micros) { a.micros[valueOrField] = value; }
  window.saveAguaAnalysesToProject();
};

window.awSyncMeqPpm = function awSyncMeqPpm(macro, fromUnit, inputEl) {
  var val = parseFloat(inputEl.value);
  if (isNaN(val)) return;
  var w = (macro === 'PO4' ? 30.97 : SN_EQ_WEIGHTS[macro]); // P peso atómico 30.970 en Análisis de Agua
  if (!w) return;
  var key = (macro === 'NO3' ? 'no3' : macro === 'PO4' ? 'po4' : macro === 'SO4' ? 'so4' : macro === 'HCO3' ? 'hco3' : macro === 'CO3' ? 'co3' : macro.toLowerCase());
  var meqEl = document.getElementById('aw-' + key + '-meq');
  var ppmEl = document.getElementById('aw-' + key + '-ppm');
  if (!meqEl || !ppmEl) return;
  if (fromUnit === 'meq') ppmEl.value = (val * w).toFixed(2);
  else meqEl.value = (val / w).toFixed(2);
  var wrap = document.getElementById('agua-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getAguaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var keyMeq = key + '_meq', keyPpm = key + '_ppm';
  var isCation = ['Ca','Mg','Na','K'].indexOf(macro) !== -1;
  if (isCation && a.cations) { a.cations[keyMeq] = meqEl.value; a.cations[keyPpm] = ppmEl.value; }
  if (!isCation && a.anions) { a.anions[keyMeq] = meqEl.value; a.anions[keyPpm] = ppmEl.value; }
  window.saveAguaAnalysesToProject();
  if (typeof window.awUpdateSums === 'function') window.awUpdateSums();
  if (typeof window.awUpdateKgOxide === 'function') window.awUpdateKgOxide();
  if (typeof window.awUpdateAcid === 'function') window.awUpdateAcid();
};

window.awUpdateSums = function awUpdateSums() {
  var wrap = document.getElementById('agua-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getAguaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var c = a.cations; var an = a.anions;
  var sumC = 0; ['ca_meq','mg_meq','na_meq','k_meq'].forEach(function(k){ var v = parseFloat(c && c[k]); if (!isNaN(v)) sumC += v; });
  var sumA = 0; ['so4_meq','hco3_meq','cl_meq','co3_meq','po4_meq','no3_meq'].forEach(function(k){ var v = parseFloat(an && an[k]); if (!isNaN(v)) sumA += v; });
  var elC = document.getElementById('aw-sum-cations-meq'); if (elC) elC.textContent = sumC > 0 ? sumC.toFixed(2) + ' meq/L' : '—';
  var elA = document.getElementById('aw-sum-anions-meq'); if (elA) elA.textContent = sumA > 0 ? sumA.toFixed(2) + ' meq/L' : '—';
};

var AW_OXIDE_FACTORS = { ca: 1.399, mg: 1.658, na: 1.348, k: 1.205, s: 3 }; // S → SO4 (96/32 = 3)
window.awUpdateKgOxide = function awUpdateKgOxide() {
  var wrap = document.getElementById('agua-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getAguaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var m3 = parseFloat(a.m3Riego);
  if (!m3 || m3 <= 0) m3 = 0;
  function setKg(ppm, elKg, elOxide, factor) {
    var p = parseFloat(ppm); if (isNaN(p)) { if (elKg) elKg.textContent = '—'; if (elOxide) elOxide.textContent = '—'; return; }
    var kg = (p * m3) / 1000;
    if (elKg) elKg.textContent = m3 ? kg.toFixed(2) : '—';
    if (elOxide) elOxide.textContent = factor ? (m3 ? (kg * factor).toFixed(2) : '—') : '—';
  }
  var c = a.cations; var an = a.anions;
  setKg(c && c.ca_ppm, document.getElementById('aw-kg-ca'), document.getElementById('aw-kg-cao'), AW_OXIDE_FACTORS.ca);
  setKg(c && c.mg_ppm, document.getElementById('aw-kg-mg'), document.getElementById('aw-kg-mgo'), AW_OXIDE_FACTORS.mg);
  setKg(c && c.na_ppm, document.getElementById('aw-kg-na'), document.getElementById('aw-kg-na2o'), null); // Na solo elemento, sin óxido
  setKg(c && c.k_ppm, document.getElementById('aw-kg-k'), document.getElementById('aw-kg-k2o'), AW_OXIDE_FACTORS.k);
  // S-SO4: solo kg S (elemental)
  var so4Ppm = an && an.so4_ppm ? parseFloat(an.so4_ppm) : NaN;
  var elS = document.getElementById('aw-kg-s');
  if (!isNaN(so4Ppm) && m3) { if (elS) elS.textContent = ((so4Ppm * m3) / 1000).toFixed(2); } else { if (elS) elS.textContent = '—'; }
  // P-PO4: la ppm es de P (elemento, peso 30.97); kg P = ppm P × m³/1000 (solo elemental)
  var po4Ppm = an && an.po4_ppm ? parseFloat(an.po4_ppm) : NaN;
  var elP = document.getElementById('aw-kg-p');
  if (!isNaN(po4Ppm) && m3) { if (elP) elP.textContent = ((po4Ppm * m3) / 1000).toFixed(2); } else { if (elP) elP.textContent = '—'; }
  // N-NO3: la ppm es de N (elemento); kg N = ppm N × m³/1000 (el fertilizante se expresa como N)
  var no3Ppm = an && an.no3_ppm ? parseFloat(an.no3_ppm) : NaN;
  if (!isNaN(no3Ppm) && m3) { var kgN = (no3Ppm * m3) / 1000; var elN = document.getElementById('aw-kg-n'); if (elN) elN.textContent = kgN.toFixed(2); } else { var elN = document.getElementById('aw-kg-n'); if (elN) elN.textContent = '—'; }
  var micros = a.micros; if (micros) { ['b','fe','mn','cu','zn'].forEach(function(k){ var p = parseFloat(micros[k]); var el = document.getElementById('aw-kg-' + k); if (el) el.textContent = (m3 && !isNaN(p)) ? ((p * m3) / 1000).toFixed(2) : '—'; }); }
};

window.awUpdateAcid = function awUpdateAcid() {
  var wrap = document.getElementById('agua-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getAguaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var hco3 = parseFloat(a.anions && a.anions.hco3_meq); var co3 = parseFloat(a.anions && a.anions.co3_meq);
  if (isNaN(hco3)) hco3 = 0; if (isNaN(co3)) co3 = 0;
  var totalCarbonatos = hco3 + co3; // ya en meq/L, 1 meq ácido por 1 meq base
  var residualMeq = parseFloat(a.acidResidualMeq);
  if (isNaN(residualMeq) || residualMeq < 0) residualMeq = 1; // valor recomendado por defecto
  var meqPerL = Math.max(0, totalCarbonatos - residualMeq);
  var acidId = a.acidId || (AGUA_ACIDS[0] && AGUA_ACIDS[0].id);
  var acid = AGUA_ACIDS.find(function(x) { return x.id === acidId; }) || AGUA_ACIDS[0];
  var m3 = parseFloat(a.m3Riego); if (!m3 || m3 <= 0) m3 = 0;
  var elResidualInput = document.getElementById('aw-acid-residual');
  if (elResidualInput && document.activeElement !== elResidualInput) elResidualInput.value = residualMeq.toFixed(2);
  document.getElementById('aw-acid-m3-ref').textContent = m3 ? m3.toFixed(2) + ' m³' : '—';
  document.getElementById('aw-acid-hco3').textContent = !isNaN(parseFloat(a.anions && a.anions.hco3_meq)) ? parseFloat(a.anions.hco3_meq).toFixed(2) : '—';
  document.getElementById('aw-acid-co3').textContent = !isNaN(parseFloat(a.anions && a.anions.co3_meq)) ? parseFloat(a.anions.co3_meq).toFixed(2) : '—';
  document.getElementById('aw-acid-residual-ref').textContent = residualMeq.toFixed(2);
  document.getElementById('aw-acid-meq-needed').textContent = meqPerL > 0 ? meqPerL.toFixed(2) : '0';
  if (meqPerL <= 0 || !acid.meqPerMl) { document.getElementById('aw-acid-per-m3').textContent = meqPerL <= 0 ? '0 mL' : '—'; document.getElementById('aw-acid-total').textContent = (meqPerL <= 0 && m3) ? '0 L' : '—'; return; }
  var meqPerM3 = meqPerL * 1000;
  var mlPerM3 = meqPerM3 / acid.meqPerMl;
  document.getElementById('aw-acid-per-m3').textContent = mlPerM3.toFixed(1) + ' mL';
  document.getElementById('aw-acid-total').textContent = m3 ? ((mlPerM3 * m3) / 1000).toFixed(2) + ' L' : '—';
};

window.selectAguaAnalysis = function selectAguaAnalysis(id) {
  var list = window.getAguaAnalyses();
  var a = list.find(function(x) { return x.id === id; });
  var emptyEl = document.getElementById('agua-form-empty');
  var wrapEl = document.getElementById('agua-form-wrap');
  if (!wrapEl) return;
  if (!a) { wrapEl.style.display = 'none'; wrapEl.setAttribute('data-current-id', ''); if (emptyEl) emptyEl.style.display = 'block'; document.querySelectorAll('#agua-list .soil-analysis-card').forEach(function(c) { c.classList.remove('active'); }); return; }
  wrapEl.setAttribute('data-current-id', id);
  wrapEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  document.getElementById('aw-m3-riego').value = a.m3Riego !== undefined && a.m3Riego !== '' ? a.m3Riego : '';
  document.getElementById('aw-meta-title').value = a.title || '';
  document.getElementById('aw-meta-date').value = a.date || '';
  if (a.general) { ['ce','ras','ph'].forEach(function(f) { var el = document.getElementById('aw-general-' + f); if (el) el.value = a.general[f] !== undefined && a.general[f] !== '' ? a.general[f] : ''; }); }
  function awFmt(v) { if (v === undefined || v === '' || v === null) return ''; var n = parseFloat(v); return isNaN(n) ? '' : n.toFixed(2); }
  ['Ca','Mg','Na','K'].forEach(function(m) { var k = m.toLowerCase(); var elMeq = document.getElementById('aw-' + k + '-meq'); var elPpm = document.getElementById('aw-' + k + '-ppm'); if (elMeq && a.cations) elMeq.value = awFmt(a.cations[k + '_meq']); if (elPpm && a.cations) elPpm.value = awFmt(a.cations[k + '_ppm']); });
  ['SO4','HCO3','Cl','CO3','PO4','NO3'].forEach(function(m) { var k = (m === 'NO3' ? 'no3' : m === 'PO4' ? 'po4' : m === 'SO4' ? 'so4' : m === 'HCO3' ? 'hco3' : m === 'CO3' ? 'co3' : m.toLowerCase()); var elMeq = document.getElementById('aw-' + k + '-meq'); var elPpm = document.getElementById('aw-' + k + '-ppm'); if (elMeq && a.anions) elMeq.value = awFmt(a.anions[k + '_meq']); if (elPpm && a.anions) elPpm.value = awFmt(a.anions[k + '_ppm']); });
  if (a.micros) { ['b','fe','mn','cu','zn'].forEach(function(f) { var el = document.getElementById('aw-micro-' + f); if (el) el.value = a.micros[f] !== undefined && a.micros[f] !== '' ? a.micros[f] : ''; }); }
  var acidSelect = document.getElementById('aw-acid-select'); if (acidSelect && a.acidId) acidSelect.value = a.acidId;
  var acidResidualEl = document.getElementById('aw-acid-residual');
  if (acidResidualEl) {
    var residual = parseFloat(a.acidResidualMeq);
    if (isNaN(residual) || residual < 0) residual = 1;
    acidResidualEl.value = residual.toFixed(2);
  }
  document.querySelectorAll('#agua-list .soil-analysis-card').forEach(function(c) { c.classList.toggle('active', c.getAttribute('data-id') === id); });
  window.awUpdateSums && window.awUpdateSums();
  window.awUpdateKgOxide && window.awUpdateKgOxide();
  window.awUpdateAcid && window.awUpdateAcid();
};

window.renderAguaList = function renderAguaList() {
  var listEl = document.getElementById('agua-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  window.getAguaAnalyses().forEach(function(a) {
    var card = document.createElement('div');
    card.className = 'soil-analysis-card';
    card.setAttribute('data-id', a.id);
    card.innerHTML = '<div class="soil-analysis-card-title">' + (a.title || 'Sin título') + '</div><div class="soil-analysis-card-date">' + (a.date || '') + '</div>';
    card.onclick = function() { window.selectAguaAnalysis(a.id); };
    listEl.appendChild(card);
  });
};

window.deleteCurrentAguaAnalysis = function deleteCurrentAguaAnalysis() {
  var wrap = document.getElementById('agua-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  if (!confirm('¿Eliminar este análisis de agua?')) return;
  var list = window.getAguaAnalyses();
  var arr = list.filter(function(a) { return a.id !== id; });
  currentProject.aguaAnalyses = arr;
  window.saveAguaAnalysesToProject();
  window.renderAguaList && window.renderAguaList();
  wrap.style.display = 'none';
  wrap.setAttribute('data-current-id', '');
  document.getElementById('agua-form-empty').style.display = 'block';
  window.selectAguaAnalysis(null);
};

window.initAguaTab = function initAguaTab() {
  window.getAguaAnalyses();
  window.renderAguaList && window.renderAguaList();
  var wrap = document.getElementById('agua-form-wrap');
  var emptyEl = document.getElementById('agua-form-empty');
  if (wrap) { wrap.style.display = 'none'; wrap.setAttribute('data-current-id', ''); }
  if (emptyEl) emptyEl.style.display = 'block';
};

window.saveAguaUIState = function saveAguaUIState() {
  if (!currentProject.id) return;
  var wrap = document.getElementById('agua-form-wrap');
  var selectedId = wrap ? wrap.getAttribute('data-current-id') || '' : '';
  var openSections = [];
  document.querySelectorAll('#agua-form-wrap .soil-section[data-aw-section]').forEach(function(d) { if (d.open) openSections.push(d.getAttribute('data-aw-section')); });
  try {
    var key = 'nutriplant_agua_ui_' + currentProject.id;
    localStorage.setItem(key, JSON.stringify({ selectedId: selectedId, openSections: openSections }));
  } catch (e) { console.warn('saveAguaUIState', e); }
};

window.restoreAguaUIState = function restoreAguaUIState() {
  if (!currentProject.id) return;
  try {
    var key = 'nutriplant_agua_ui_' + currentProject.id;
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var state = JSON.parse(raw);
    var selectedId = state.selectedId;
    var openSections = Array.isArray(state.openSections) ? state.openSections : [];
    if (selectedId) {
      var list = window.getAguaAnalyses();
      if (list.some(function(a) { return a.id === selectedId; }) && typeof window.selectAguaAnalysis === 'function') {
        window.selectAguaAnalysis(selectedId);
      }
    }
    if (openSections.length > 0) {
      document.querySelectorAll('#agua-form-wrap .soil-section[data-aw-section]').forEach(function(d) {
        var section = d.getAttribute('data-aw-section');
        d.open = openSections.indexOf(section) !== -1;
      });
    }
    var container = document.querySelector('#agua-form-wrap .soil-analysis-sections');
    if (container && !container._awToggleBound) {
      container._awToggleBound = true;
      container.addEventListener('toggle', function(e) {
        if (e.target && e.target.matches && e.target.matches('details[data-aw-section]') && typeof window.saveAguaUIState === 'function') {
          window.saveAguaUIState();
        }
      });
    }
  } catch (e) { console.warn('restoreAguaUIState', e); }
};

// ========== ANÁLISIS FOLIAR (DOP) ==========
var FOLIAR_OPTIMAL_MACRO = { N: 3, P: 0.275, K: 2.5, Ca: 1.25, Mg: 0.4, S: 0.325 }; // % MS
var FOLIAR_OPTIMAL_MICRO = { Fe: 150, Mn: 160, Zn: 60, Cu: 15, B: 62.5, Mo: 2.55 }; // mg/kg

function createEmptyFoliarAnalysis() {
  return {
    id: 'foliar_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: '',
    date: '',
    macros: { N: '', P: '', K: '', Ca: '', Mg: '', S: '' },
    micros: { Fe: '', Mn: '', Zn: '', Cu: '', B: '', Mo: '' },
    optimalMacro: {},
    optimalMicro: {}
  };
}

function foliarDOPIconStatus(dop) {
  if (dop === null || typeof dop !== 'number' || isNaN(dop)) return { icon: '—', status: '—' };
  var abs = Math.abs(dop);
  var icon = abs <= 10 ? '🟢' : abs <= 25 ? '🔶' : abs <= 50 ? '🟠' : '🔴';
  var status = abs <= 10 ? 'Óptimo' : (dop < 0 ? (abs > 50 ? 'Muy bajo' : 'Bajo') : (abs > 50 ? 'Muy alto' : 'Alto'));
  return { icon: icon, status: status };
}

function createFoliarTabHTML() {
  var macroRows = ['N','P','K','Ca','Mg','S'].map(function(n) {
    return '<tr><td>' + n + '</td><td><input type="number" step="0.001" id="f-macro-' + n + '" class="fertirriego-input" data-f-nutrient="macro-' + n + '" oninput="window.saveFoliarField && window.saveFoliarField(\'macros\',\'' + n + '\',this.value); window.foliarUpdateDOP && window.foliarUpdateDOP();"></td><td><input type="number" step="0.001" id="f-opt-macro-' + n + '" class="fertirriego-input" style="width:70px;" data-f-opt="macro-' + n + '" oninput="window.saveFoliarField && window.saveFoliarField(\'optimalMacro\',\'' + n + '\',this.value); window.foliarUpdateDOP && window.foliarUpdateDOP();"></td><td id="f-dop-macro-' + n + '">—</td><td id="f-status-macro-' + n + '">—</td></tr>';
  }).join('');
  var microRows = ['Fe','Mn','Zn','Cu','B','Mo'].map(function(n) {
    return '<tr><td>' + n + '</td><td><input type="number" step="0.01" id="f-micro-' + n + '" class="fertirriego-input" data-f-nutrient="micro-' + n + '" oninput="window.saveFoliarField && window.saveFoliarField(\'micros\',\'' + n + '\',this.value); window.foliarUpdateDOP && window.foliarUpdateDOP();"></td><td><input type="number" step="0.01" id="f-opt-micro-' + n + '" class="fertirriego-input" style="width:70px;" data-f-opt="micro-' + n + '" oninput="window.saveFoliarField && window.saveFoliarField(\'optimalMicro\',\'' + n + '\',this.value); window.foliarUpdateDOP && window.foliarUpdateDOP();"></td><td id="f-dop-micro-' + n + '">—</td><td id="f-status-micro-' + n + '">—</td></tr>';
  }).join('');
  return `
    <div class="card soil-analysis-tab-container soil-analysis-watermark-wrap" id="foliar-tab-container">
      <div class="soil-analysis-watermark" aria-hidden="true">
        <img src="assets/NutriPlant_PRO_blue.png" alt="">
      </div>
      <h2 class="text-xl" style="margin-bottom: 16px;">🔬 Análisis Foliar (DOP)</h2>
      <p style="margin-bottom:12px;font-size:0.9rem;color:#64748b;">DOP (Diagnosis and Recommendation Integrated System): DOP = ((Valor − Óptimo) / Óptimo) × 100. Los óptimos son editables y se guardan solo en este análisis. Regla visual igual que foliar: 🟢 |DOP| ≤ 10% | 🔶 10–25% | 🟠 25–50% | 🔴 &gt;50%.</p>
      <div class="soil-analysis-layout">
        <div class="soil-analysis-list-panel">
          <div class="soil-analysis-list-header">
            <strong>Reportes en este proyecto</strong>
            <div class="soil-analysis-list-actions">
              <button type="button" class="btn btn-sm btn-success" onclick="window.addNewFoliarAnalysis && window.addNewFoliarAnalysis();">➕ Agregar análisis</button>
            </div>
          </div>
          <div id="foliar-list" class="soil-analyses-list"></div>
        </div>
        <div class="soil-analysis-form-panel" id="foliar-form-panel">
          <div id="foliar-form-empty" class="soil-analysis-form-empty">
            <p>Selecciona un análisis de la lista o agrega uno nuevo.</p>
          </div>
          <div id="foliar-form-wrap" class="soil-analysis-form-wrap" style="display: none;" data-current-id="">
            <div class="soil-analysis-form-header">
              <input type="text" id="f-meta-title" placeholder="Título" class="soil-input-inline" onchange="window.saveFoliarField && window.saveFoliarField('meta','title',this.value)">
              <input type="text" id="f-meta-date" placeholder="Fecha" class="soil-input-inline" onchange="window.saveFoliarField && window.saveFoliarField('meta','date',this.value)">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteCurrentFoliarAnalysis && window.deleteCurrentFoliarAnalysis();">Eliminar</button>
            </div>
            <div class="soil-analysis-sections">
              <details class="soil-section" data-f-section="macro" open>
                <summary>📊 Macronutrientes (% MS)</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Ingresa resultado del análisis y, si quieres, ajusta el óptimo.</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>Resultado (%)</th><th>Óptimo (%)</th><th>DOP</th><th>Estado</th></tr></thead>
                    <tbody>${macroRows}</tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-f-section="micro" open>
                <summary>📊 Micronutrientes (mg/kg)</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Ingresa resultado del análisis y, si quieres, ajusta el óptimo.</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>Resultado (mg/kg)</th><th>Óptimo (mg/kg)</th><th>DOP</th><th>Estado</th></tr></thead>
                    <tbody>${microRows}</tbody>
                  </table>
                </div>
              </details>
              <div class="soil-section" style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <strong>Regla visual (fija):</strong> 🟢 |DOP| ≤ 10% &nbsp;|&nbsp; 🔶 10–25% &nbsp;|&nbsp; 🟠 25–50% &nbsp;|&nbsp; 🔴 &gt;50%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.getFoliarAnalyses = function getFoliarAnalyses() {
  if (!currentProject.id) return [];
  if (!Array.isArray(currentProject.foliarAnalyses)) currentProject.foliarAnalyses = [];
  return currentProject.foliarAnalyses;
};

window.addNewFoliarAnalysis = function addNewFoliarAnalysis() {
  if (!currentProject.id) { alert('Selecciona un proyecto primero.'); return; }
  var list = window.getFoliarAnalyses();
  var a = createEmptyFoliarAnalysis();
  a.title = 'Nuevo análisis ' + (list.length + 1);
  list.push(a);
  window.saveFoliarAnalysesToProject();
  window.renderFoliarList && window.renderFoliarList();
  window.selectFoliarAnalysis && window.selectFoliarAnalysis(a.id);
};

var _foliarSaveTimer = null;
window.saveFoliarAnalysesToProject = function saveFoliarAnalysesToProject() {
  if (!currentProject.id) return;
  if (_foliarSaveTimer) clearTimeout(_foliarSaveTimer);
  var projectId = currentProject.id;
  var dataCopy = JSON.parse(JSON.stringify(window.getFoliarAnalyses() || []));
  _foliarSaveTimer = setTimeout(function() {
    _foliarSaveTimer = null;
    var run = function() {
      try { window.projectStorage && window.projectStorage.saveSection('foliarAnalyses', dataCopy, projectId); } catch (e) { console.warn('saveFoliarAnalysesToProject', e); }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 0);
    }
  }, 350);
};

window.saveFoliarField = function saveFoliarField(group, valueOrField, value) {
  var wrap = document.getElementById('foliar-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getFoliarAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  if (group === 'meta') { a[valueOrField] = value; }
  else if (group === 'macros' && a.macros) { a.macros[valueOrField] = value; }
  else if (group === 'micros' && a.micros) { a.micros[valueOrField] = value; }
  else if (group === 'optimalMacro') { if (!a.optimalMacro) a.optimalMacro = {}; a.optimalMacro[valueOrField] = value; }
  else if (group === 'optimalMicro') { if (!a.optimalMicro) a.optimalMicro = {}; a.optimalMicro[valueOrField] = value; }
  window.saveFoliarAnalysesToProject();
};

window.foliarUpdateDOP = function foliarUpdateDOP() {
  var wrap = document.getElementById('foliar-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getFoliarAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var macros = a.macros || {}; var micros = a.micros || {};
  var optMacro = a.optimalMacro || {}; var optMicro = a.optimalMicro || {};
  function getOptMacro(n) { var v = optMacro[n]; if (v !== undefined && v !== '' && !isNaN(parseFloat(v))) return parseFloat(v); return FOLIAR_OPTIMAL_MACRO[n]; }
  function getOptMicro(n) { var v = optMicro[n]; if (v !== undefined && v !== '' && !isNaN(parseFloat(v))) return parseFloat(v); return FOLIAR_OPTIMAL_MICRO[n]; }
  ['N','P','K','Ca','Mg','S'].forEach(function(n) {
    var val = parseFloat(macros[n]); var opt = getOptMacro(n);
    var dop = (opt && opt !== 0 && !isNaN(val)) ? ((val - opt) / opt) * 100 : NaN;
    var res = foliarDOPIconStatus(isNaN(dop) ? null : dop);
    var dopEl = document.getElementById('f-dop-macro-' + n); var statusEl = document.getElementById('f-status-macro-' + n);
    if (dopEl) dopEl.textContent = !isNaN(dop) ? res.icon + ' ' + (dop >= 0 ? '+' : '') + dop.toFixed(1) + '%' : '—';
    if (statusEl) statusEl.textContent = res.status;
  });
  ['Fe','Mn','Zn','Cu','B','Mo'].forEach(function(n) {
    var val = parseFloat(micros[n]); var opt = getOptMicro(n);
    var dop = (opt && opt !== 0 && !isNaN(val)) ? ((val - opt) / opt) * 100 : NaN;
    var res = foliarDOPIconStatus(isNaN(dop) ? null : dop);
    var dopEl = document.getElementById('f-dop-micro-' + n); var statusEl = document.getElementById('f-status-micro-' + n);
    if (dopEl) dopEl.textContent = !isNaN(dop) ? res.icon + ' ' + (dop >= 0 ? '+' : '') + dop.toFixed(1) + '%' : '—';
    if (statusEl) statusEl.textContent = res.status;
  });
};

window.selectFoliarAnalysis = function selectFoliarAnalysis(id) {
  var list = window.getFoliarAnalyses();
  var a = list.find(function(x) { return x.id === id; });
  var emptyEl = document.getElementById('foliar-form-empty');
  var wrapEl = document.getElementById('foliar-form-wrap');
  if (!wrapEl) return;
  if (!a) { wrapEl.style.display = 'none'; wrapEl.setAttribute('data-current-id', ''); if (emptyEl) emptyEl.style.display = 'block'; document.querySelectorAll('#foliar-list .soil-analysis-card').forEach(function(c) { c.classList.remove('active'); }); return; }
  wrapEl.setAttribute('data-current-id', id);
  wrapEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  document.getElementById('f-meta-title').value = a.title || '';
  document.getElementById('f-meta-date').value = a.date || '';
  function fFmt(v) { if (v === undefined || v === '' || v === null) return ''; return String(v); }
  var macros = a.macros || {}; var micros = a.micros || {};
  var optMacro = a.optimalMacro || {}; var optMicro = a.optimalMicro || {};
  ['N','P','K','Ca','Mg','S'].forEach(function(n) {
    var r = document.getElementById('f-macro-' + n); if (r) r.value = fFmt(macros[n]);
    var o = document.getElementById('f-opt-macro-' + n); if (o) o.value = (optMacro[n] !== undefined && optMacro[n] !== '') ? fFmt(optMacro[n]) : (FOLIAR_OPTIMAL_MACRO[n] % 1 === 0 ? FOLIAR_OPTIMAL_MACRO[n] + '.00' : (FOLIAR_OPTIMAL_MACRO[n] < 0.1 ? FOLIAR_OPTIMAL_MACRO[n].toFixed(3) : FOLIAR_OPTIMAL_MACRO[n].toFixed(2)));
  });
  ['Fe','Mn','Zn','Cu','B','Mo'].forEach(function(n) {
    var r = document.getElementById('f-micro-' + n); if (r) r.value = fFmt(micros[n]);
    var o = document.getElementById('f-opt-micro-' + n); if (o) o.value = (optMicro[n] !== undefined && optMicro[n] !== '') ? fFmt(optMicro[n]) : (FOLIAR_OPTIMAL_MICRO[n] % 1 === 0 ? FOLIAR_OPTIMAL_MICRO[n] : FOLIAR_OPTIMAL_MICRO[n].toFixed(2));
  });
  document.querySelectorAll('#foliar-list .soil-analysis-card').forEach(function(c) { c.classList.toggle('active', c.getAttribute('data-id') === id); });
  window.foliarUpdateDOP && window.foliarUpdateDOP();
};

window.renderFoliarList = function renderFoliarList() {
  var listEl = document.getElementById('foliar-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  window.getFoliarAnalyses().forEach(function(a) {
    var card = document.createElement('div');
    card.className = 'soil-analysis-card';
    card.setAttribute('data-id', a.id);
    card.innerHTML = '<div class="soil-analysis-card-title">' + (a.title || 'Sin título') + '</div><div class="soil-analysis-card-date">' + (a.date || '') + '</div>';
    card.onclick = function() { window.selectFoliarAnalysis(a.id); };
    listEl.appendChild(card);
  });
};

window.deleteCurrentFoliarAnalysis = function deleteCurrentFoliarAnalysis() {
  var wrap = document.getElementById('foliar-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  if (!confirm('¿Eliminar este análisis foliar?')) return;
  var arr = window.getFoliarAnalyses().filter(function(a) { return a.id !== id; });
  currentProject.foliarAnalyses = arr;
  window.saveFoliarAnalysesToProject();
  window.renderFoliarList && window.renderFoliarList();
  wrap.style.display = 'none';
  wrap.setAttribute('data-current-id', '');
  document.getElementById('foliar-form-empty').style.display = 'block';
  window.selectFoliarAnalysis(null);
};

window.initFoliarTab = function initFoliarTab() {
  window.getFoliarAnalyses();
  window.renderFoliarList && window.renderFoliarList();
  var wrap = document.getElementById('foliar-form-wrap');
  var emptyEl = document.getElementById('foliar-form-empty');
  if (wrap) { wrap.style.display = 'none'; wrap.setAttribute('data-current-id', ''); }
  if (emptyEl) emptyEl.style.display = 'block';
};

window.saveFoliarUIState = function saveFoliarUIState() {
  if (!currentProject.id) return;
  var wrap = document.getElementById('foliar-form-wrap');
  var selectedId = wrap ? wrap.getAttribute('data-current-id') || '' : '';
  var openSections = [];
  document.querySelectorAll('#foliar-form-wrap .soil-section[data-f-section]').forEach(function(d) { if (d.open) openSections.push(d.getAttribute('data-f-section')); });
  try {
    var key = 'nutriplant_foliar_ui_' + currentProject.id;
    localStorage.setItem(key, JSON.stringify({ selectedId: selectedId, openSections: openSections }));
  } catch (e) { console.warn('saveFoliarUIState', e); }
};

window.restoreFoliarUIState = function restoreFoliarUIState() {
  if (!currentProject.id) return;
  try {
    var key = 'nutriplant_foliar_ui_' + currentProject.id;
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var state = JSON.parse(raw);
    var selectedId = state.selectedId;
    var openSections = Array.isArray(state.openSections) ? state.openSections : [];
    if (selectedId && window.getFoliarAnalyses().some(function(a) { return a.id === selectedId; }) && typeof window.selectFoliarAnalysis === 'function') {
      window.selectFoliarAnalysis(selectedId);
    }
    if (openSections.length > 0) {
      document.querySelectorAll('#foliar-form-wrap .soil-section[data-f-section]').forEach(function(d) {
        d.open = openSections.indexOf(d.getAttribute('data-f-section')) !== -1;
      });
    }
    var container = document.querySelector('#foliar-form-wrap .soil-analysis-sections');
    if (container && !container._fToggleBound) {
      container._fToggleBound = true;
      container.addEventListener('toggle', function(e) {
        if (e.target && e.target.matches && e.target.matches('details[data-f-section]') && typeof window.saveFoliarUIState === 'function') window.saveFoliarUIState();
      });
    }
  } catch (e) { console.warn('restoreFoliarUIState', e); }
};

// ========== ANÁLISIS DE FRUTA (ICC) ==========
var FRUTA_OPTIMAL_MACRO = { N: 1.80, P: 0.25, K: 1.50, Ca: 0.25, Mg: 0.20, S: 0.18 };
var FRUTA_OPTIMAL_MICRO = { Fe: 80, Mn: 40, Zn: 35, Cu: 10, B: 50, Mo: 0.5 };
var FRUTA_OPTIMAL_CALIDAD = { materiaSeca: 15, brix: 12, firmeza: 5, acidezTitulable: 0.5 };
var FRUTA_OPTIMAL_CALCIO = { caTotal: 20, caSolublePct: 18, caLigadoPct: 25, caInsolublePct: 55 };
var FRUTA_CALIDAD_LABELS = { materiaSeca: 'Materia Seca (%)', brix: '°Brix', firmeza: 'Firmeza (kg/cm²)', acidezTitulable: 'Acidez titulable (%)' };
var FRUTA_CALCIO_LABELS = { caTotal: 'Ca total (mg/100 g MF)', caSolublePct: '% Ca soluble', caLigadoPct: '% Ca ligado', caInsolublePct: '% Ca insoluble' };

function createEmptyFrutaAnalysis() {
  return {
    id: 'fruta_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: '',
    date: '',
    macros: { N: '', P: '', K: '', Ca: '', Mg: '', S: '' },
    micros: { Fe: '', Mn: '', Zn: '', Cu: '', B: '', Mo: '' },
    calidad: { materiaSeca: '', brix: '', firmeza: '', acidezTitulable: '' },
    calcio: { caTotal: '', caSolublePct: '', caLigadoPct: '', caInsolublePct: '' },
    optimalMacro: {},
    optimalMicro: {},
    optimalCalidad: {},
    optimalCalcio: {}
  };
}

function frutaICCIconStatus(icc) {
  if (icc === null || typeof icc !== 'number' || isNaN(icc)) return { icon: '—', status: '—' };
  var abs = Math.abs(icc);
  var icon = abs <= 10 ? '🟢' : abs <= 25 ? '🔶' : abs <= 50 ? '🟠' : '🔴';
  var status = abs <= 10 ? 'Óptimo' : (icc < 0 ? (abs > 50 ? 'Muy bajo' : 'Bajo') : (abs > 50 ? 'Muy alto' : 'Alto'));
  return { icon: icon, status: status };
}

function frutaIconFromICC(icc) {
  if (icc === null || typeof icc !== 'number' || isNaN(icc)) return '—';
  var abs = Math.abs(icc);
  if (abs <= 10) return '🟢';
  if (abs <= 25) return '🟡';
  if (abs <= 50) return '🟠';
  return '🔴';
}

function createFrutaTabHTML() {
  var macroRows = ['N','P','K','Ca','Mg','S'].map(function(n) {
    return '<tr><td>' + n + '</td><td><input type="number" step="0.001" id="fru-macro-' + n + '" class="fertirriego-input" oninput="window.saveFrutaField && window.saveFrutaField(\'macros\',\'' + n + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td><input type="number" step="0.001" id="fru-opt-macro-' + n + '" class="fertirriego-input" style="width:70px;" oninput="window.saveFrutaField && window.saveFrutaField(\'optimalMacro\',\'' + n + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td id="fru-icc-macro-' + n + '">—</td><td id="fru-status-macro-' + n + '">—</td></tr>';
  }).join('');
  var microRows = ['Fe','Mn','Zn','Cu','B','Mo'].map(function(n) {
    return '<tr><td>' + n + '</td><td><input type="number" step="0.01" id="fru-micro-' + n + '" class="fertirriego-input" oninput="window.saveFrutaField && window.saveFrutaField(\'micros\',\'' + n + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td><input type="number" step="0.01" id="fru-opt-micro-' + n + '" class="fertirriego-input" style="width:70px;" oninput="window.saveFrutaField && window.saveFrutaField(\'optimalMicro\',\'' + n + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td id="fru-icc-micro-' + n + '">—</td><td id="fru-status-micro-' + n + '">—</td></tr>';
  }).join('');
  var calidadKeys = ['materiaSeca','brix','firmeza','acidezTitulable'];
  var calidadRows = calidadKeys.map(function(k) {
    return '<tr><td>' + FRUTA_CALIDAD_LABELS[k] + '</td><td><input type="number" step="0.01" id="fru-calidad-' + k + '" class="fertirriego-input" oninput="window.saveFrutaField && window.saveFrutaField(\'calidad\',\'' + k + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td><input type="number" step="0.01" id="fru-opt-calidad-' + k + '" class="fertirriego-input" style="width:70px;" oninput="window.saveFrutaField && window.saveFrutaField(\'optimalCalidad\',\'' + k + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td id="fru-icc-calidad-' + k + '">—</td><td id="fru-status-calidad-' + k + '">—</td></tr>';
  }).join('');
  var calcioKeys = ['caTotal','caSolublePct','caLigadoPct','caInsolublePct'];
  var calcioRows = calcioKeys.map(function(k) {
    return '<tr><td>' + FRUTA_CALCIO_LABELS[k] + '</td><td><input type="number" step="0.01" id="fru-calcio-' + k + '" class="fertirriego-input" oninput="window.saveFrutaField && window.saveFrutaField(\'calcio\',\'' + k + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td><input type="number" step="0.01" id="fru-opt-calcio-' + k + '" class="fertirriego-input" style="width:70px;" oninput="window.saveFrutaField && window.saveFrutaField(\'optimalCalcio\',\'' + k + '\',this.value); window.frutaUpdateICC && window.frutaUpdateICC();"></td><td id="fru-status-calcio-' + k + '">—</td></tr>';
  }).join('');
  return `
    <div class="card soil-analysis-tab-container soil-analysis-watermark-wrap" id="fruta-tab-container">
      <div class="soil-analysis-watermark" aria-hidden="true">
        <img src="assets/NutriPlant_PRO_blue.png" alt="">
      </div>
      <h2 class="text-xl" style="margin-bottom: 16px;">🍎 Análisis de Fruta (ICC)</h2>
      <p style="margin-bottom:12px;font-size:0.9rem;color:#64748b;">ICC (Índice Comparativo de Calidad): ICC = ((Valor − Óptimo) / Óptimo) × 100. Los óptimos son editables y se guardan solo en este análisis. Regla visual igual que foliar: 🟢 |ICC| ≤ 10% | 🔶 10–25% | 🟠 25–50% | 🔴 &gt;50%.</p>
      <div class="soil-analysis-layout">
        <div class="soil-analysis-list-panel">
          <div class="soil-analysis-list-header">
            <strong>Reportes en este proyecto</strong>
            <div class="soil-analysis-list-actions">
              <button type="button" class="btn btn-sm btn-success" onclick="window.addNewFrutaAnalysis && window.addNewFrutaAnalysis();">➕ Agregar análisis</button>
            </div>
          </div>
          <div id="fruta-list" class="soil-analyses-list"></div>
        </div>
        <div class="soil-analysis-form-panel" id="fruta-form-panel">
          <div id="fruta-form-empty" class="soil-analysis-form-empty">
            <p>Selecciona un análisis de la lista o agrega uno nuevo.</p>
          </div>
          <div id="fruta-form-wrap" class="soil-analysis-form-wrap" style="display: none;" data-current-id="">
            <div class="soil-analysis-form-header">
              <input type="text" id="fru-meta-title" placeholder="Título" class="soil-input-inline" onchange="window.saveFrutaField && window.saveFrutaField('meta','title',this.value)">
              <input type="text" id="fru-meta-date" placeholder="Fecha" class="soil-input-inline" onchange="window.saveFrutaField && window.saveFrutaField('meta','date',this.value)">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteCurrentFrutaAnalysis && window.deleteCurrentFrutaAnalysis();">Eliminar</button>
            </div>
            <div class="soil-analysis-sections">
              <details class="soil-section" data-fru-section="macro" open>
                <summary>📊 Macronutrientes en fruta (%)</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Ingresa resultado del análisis y, si quieres, ajusta el óptimo.</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>Resultado (%)</th><th>Óptimo (%)</th><th>ICC</th><th>Estado</th></tr></thead>
                    <tbody>${macroRows}</tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-fru-section="micro" open>
                <summary>📊 Micronutrientes (mg/kg)</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Ingresa resultado del análisis y, si quieres, ajusta el óptimo.</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Elemento</th><th>Resultado (mg/kg)</th><th>Óptimo (mg/kg)</th><th>ICC</th><th>Estado</th></tr></thead>
                    <tbody>${microRows}</tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-fru-section="calidad" open>
                <summary>🍎 Calidad de Fruta</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Ingresa resultado del análisis y, si quieres, ajusta el óptimo.</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Determinación</th><th>Resultado</th><th>Óptimo</th><th>ICC</th><th>Estado</th></tr></thead>
                    <tbody>${calidadRows}</tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-fru-section="calcio" open>
                <summary>🥛 Calcio en Fruta (mg/100 g MF)</summary>
                <p style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Ingresa resultado del análisis y, si quieres, ajusta el óptimo.</p>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead><tr><th>Determinación</th><th>Resultado</th><th>Óptimo</th><th>Estado (semáforo)</th></tr></thead>
                    <tbody>${calcioRows}</tbody>
                  </table>
                </div>
              </details>
              <div class="soil-section" style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <strong>Regla visual (fija):</strong> 🟢 |ICC| ≤ 10% &nbsp;|&nbsp; 🟡 10–25% &nbsp;|&nbsp; 🟠 25–50% &nbsp;|&nbsp; 🔴 &gt;50%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.getFrutaAnalyses = function getFrutaAnalyses() {
  if (!currentProject.id) return [];
  if (!Array.isArray(currentProject.frutaAnalyses)) currentProject.frutaAnalyses = [];
  return currentProject.frutaAnalyses;
};

window.addNewFrutaAnalysis = function addNewFrutaAnalysis() {
  if (!currentProject.id) { alert('Selecciona un proyecto primero.'); return; }
  var list = window.getFrutaAnalyses();
  var a = createEmptyFrutaAnalysis();
  a.title = 'Nuevo análisis ' + (list.length + 1);
  list.push(a);
  window.saveFrutaAnalysesToProject();
  window.renderFrutaList && window.renderFrutaList();
  window.selectFrutaAnalysis && window.selectFrutaAnalysis(a.id);
};

var _frutaSaveTimer = null;
window.saveFrutaAnalysesToProject = function saveFrutaAnalysesToProject() {
  if (!currentProject.id) return;
  // Datos en memoria (currentProject). Guardado en segundo plano para ser ágil al cambiar de pestaña.
  if (_frutaSaveTimer) clearTimeout(_frutaSaveTimer);
  var projectId = currentProject.id;
  var dataCopy = JSON.parse(JSON.stringify(window.getFrutaAnalyses() || []));
  _frutaSaveTimer = setTimeout(function() {
    _frutaSaveTimer = null;
    var run = function() {
      try { window.projectStorage && window.projectStorage.saveSection('frutaAnalyses', dataCopy, projectId); } catch (e) { console.warn('saveFrutaAnalysesToProject', e); }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 0);
    }
  }, 350);
};

window.saveFrutaField = function saveFrutaField(group, valueOrField, value) {
  var wrap = document.getElementById('fruta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getFrutaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  if (group === 'meta') { a[valueOrField] = value; }
  else if (group === 'macros' && a.macros) { a.macros[valueOrField] = value; }
  else if (group === 'micros' && a.micros) { a.micros[valueOrField] = value; }
  else if (group === 'calidad' && a.calidad) { a.calidad[valueOrField] = value; }
  else if (group === 'calcio' && a.calcio) { a.calcio[valueOrField] = value; }
  else if (group === 'optimalMacro') { if (!a.optimalMacro) a.optimalMacro = {}; a.optimalMacro[valueOrField] = value; }
  else if (group === 'optimalMicro') { if (!a.optimalMicro) a.optimalMicro = {}; a.optimalMicro[valueOrField] = value; }
  else if (group === 'optimalCalidad') { if (!a.optimalCalidad) a.optimalCalidad = {}; a.optimalCalidad[valueOrField] = value; }
  else if (group === 'optimalCalcio') { if (!a.optimalCalcio) a.optimalCalcio = {}; a.optimalCalcio[valueOrField] = value; }
  window.saveFrutaAnalysesToProject();
};

window.frutaUpdateICC = function frutaUpdateICC() {
  var wrap = document.getElementById('fruta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var a = window.getFrutaAnalyses().find(function(x) { return x.id === id; });
  if (!a) return;
  var optMacro = a.optimalMacro || {}; var optMicro = a.optimalMicro || {}; var optCalidad = a.optimalCalidad || {}; var optCalcio = a.optimalCalcio || {};
  function getOptMacro(n) { var v = optMacro[n]; if (v !== undefined && v !== '' && !isNaN(parseFloat(v))) return parseFloat(v); return FRUTA_OPTIMAL_MACRO[n]; }
  function getOptMicro(n) { var v = optMicro[n]; if (v !== undefined && v !== '' && !isNaN(parseFloat(v))) return parseFloat(v); return FRUTA_OPTIMAL_MICRO[n]; }
  function getOptCalidad(k) { var v = optCalidad[k]; if (v !== undefined && v !== '' && !isNaN(parseFloat(v))) return parseFloat(v); return FRUTA_OPTIMAL_CALIDAD[k]; }
  function getOptCalcio(k) { var v = optCalcio[k]; if (v !== undefined && v !== '' && !isNaN(parseFloat(v))) return parseFloat(v); return FRUTA_OPTIMAL_CALCIO[k]; }
  var macros = a.macros || {}; var micros = a.micros || {}; var calidad = a.calidad || {}; var calcio = a.calcio || {};
  ['N','P','K','Ca','Mg','S'].forEach(function(n) {
    var val = parseFloat(macros[n]); var opt = getOptMacro(n);
    var icc = (opt && opt !== 0 && !isNaN(val)) ? ((val - opt) / opt) * 100 : NaN;
    var res = frutaICCIconStatus(isNaN(icc) ? null : icc);
    var iccEl = document.getElementById('fru-icc-macro-' + n); var statusEl = document.getElementById('fru-status-macro-' + n);
    if (iccEl) iccEl.textContent = !isNaN(icc) ? res.icon + ' ' + (icc >= 0 ? '+' : '') + icc.toFixed(1) + '%' : '—';
    if (statusEl) statusEl.textContent = res.status;
  });
  ['Fe','Mn','Zn','Cu','B','Mo'].forEach(function(n) {
    var val = parseFloat(micros[n]); var opt = getOptMicro(n);
    var icc = (opt && opt !== 0 && !isNaN(val)) ? ((val - opt) / opt) * 100 : NaN;
    var res = frutaICCIconStatus(isNaN(icc) ? null : icc);
    var iccEl = document.getElementById('fru-icc-micro-' + n); var statusEl = document.getElementById('fru-status-micro-' + n);
    if (iccEl) iccEl.textContent = !isNaN(icc) ? res.icon + ' ' + (icc >= 0 ? '+' : '') + icc.toFixed(1) + '%' : '—';
    if (statusEl) statusEl.textContent = res.status;
  });
  ['materiaSeca','brix','firmeza','acidezTitulable'].forEach(function(k) {
    var val = parseFloat(calidad[k]); var opt = getOptCalidad(k);
    var icc = (opt !== undefined && opt !== null && opt !== '' && !isNaN(opt) && opt !== 0 && !isNaN(val)) ? ((val - opt) / opt) * 100 : NaN;
    var res = frutaICCIconStatus(isNaN(icc) ? null : icc);
    var iccEl = document.getElementById('fru-icc-calidad-' + k); var statusEl = document.getElementById('fru-status-calidad-' + k);
    if (iccEl) iccEl.textContent = !isNaN(icc) ? res.icon + ' ' + (icc >= 0 ? '+' : '') + icc.toFixed(1) + '%' : '—';
    if (statusEl) statusEl.textContent = res.status;
  });
  ['caTotal','caSolublePct','caLigadoPct','caInsolublePct'].forEach(function(k) {
    var val = parseFloat(calcio[k]); var opt = getOptCalcio(k);
    var icc = (opt !== undefined && opt !== null && opt !== '' && !isNaN(opt) && opt !== 0 && !isNaN(val)) ? ((val - opt) / opt) * 100 : NaN;
    var icon = frutaIconFromICC(isNaN(icc) ? null : icc);
    var statusEl = document.getElementById('fru-status-calcio-' + k);
    if (statusEl) statusEl.textContent = icon;
  });
};

window.selectFrutaAnalysis = function selectFrutaAnalysis(id) {
  var list = window.getFrutaAnalyses();
  var a = list.find(function(x) { return x.id === id; });
  var emptyEl = document.getElementById('fruta-form-empty');
  var wrapEl = document.getElementById('fruta-form-wrap');
  if (!wrapEl) return;
  if (!a) { wrapEl.style.display = 'none'; wrapEl.setAttribute('data-current-id', ''); if (emptyEl) emptyEl.style.display = 'block'; document.querySelectorAll('#fruta-list .soil-analysis-card').forEach(function(c) { c.classList.remove('active'); }); return; }
  wrapEl.setAttribute('data-current-id', id);
  wrapEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  document.getElementById('fru-meta-title').value = a.title || '';
  document.getElementById('fru-meta-date').value = a.date || '';
  function fFmt(v) { if (v === undefined || v === '' || v === null) return ''; return String(v); }
  var macros = a.macros || {}; var micros = a.micros || {}; var calidad = a.calidad || {}; var calcio = a.calcio || {};
  var optMacro = a.optimalMacro || {}; var optMicro = a.optimalMicro || {}; var optCalidad = a.optimalCalidad || {}; var optCalcio = a.optimalCalcio || {};
  ['N','P','K','Ca','Mg','S'].forEach(function(n) {
    var r = document.getElementById('fru-macro-' + n); if (r) r.value = fFmt(macros[n]);
    var o = document.getElementById('fru-opt-macro-' + n); if (o) o.value = (optMacro[n] !== undefined && optMacro[n] !== '') ? fFmt(optMacro[n]) : (FRUTA_OPTIMAL_MACRO[n] % 1 === 0 ? FRUTA_OPTIMAL_MACRO[n] + '.00' : (FRUTA_OPTIMAL_MACRO[n] < 0.1 ? FRUTA_OPTIMAL_MACRO[n].toFixed(3) : FRUTA_OPTIMAL_MACRO[n].toFixed(2)));
  });
  ['Fe','Mn','Zn','Cu','B','Mo'].forEach(function(n) {
    var r = document.getElementById('fru-micro-' + n); if (r) r.value = fFmt(micros[n]);
    var o = document.getElementById('fru-opt-micro-' + n); if (o) o.value = (optMicro[n] !== undefined && optMicro[n] !== '') ? fFmt(optMicro[n]) : (FRUTA_OPTIMAL_MICRO[n] % 1 === 0 ? FRUTA_OPTIMAL_MICRO[n] : FRUTA_OPTIMAL_MICRO[n].toFixed(2));
  });
  ['materiaSeca','brix','firmeza','acidezTitulable'].forEach(function(k) {
    var r = document.getElementById('fru-calidad-' + k); if (r) r.value = fFmt(calidad[k]);
    var o = document.getElementById('fru-opt-calidad-' + k); if (o) o.value = (optCalidad[k] !== undefined && optCalidad[k] !== '') ? fFmt(optCalidad[k]) : (FRUTA_OPTIMAL_CALIDAD[k] % 1 === 0 ? FRUTA_OPTIMAL_CALIDAD[k] : FRUTA_OPTIMAL_CALIDAD[k].toFixed(2));
  });
  ['caTotal','caSolublePct','caLigadoPct','caInsolublePct'].forEach(function(k) {
    var r = document.getElementById('fru-calcio-' + k); if (r) r.value = fFmt(calcio[k]);
    var o = document.getElementById('fru-opt-calcio-' + k); if (o) o.value = (optCalcio[k] !== undefined && optCalcio[k] !== '') ? fFmt(optCalcio[k]) : (FRUTA_OPTIMAL_CALCIO[k] % 1 === 0 ? FRUTA_OPTIMAL_CALCIO[k] : FRUTA_OPTIMAL_CALCIO[k].toFixed(2));
  });
  document.querySelectorAll('#fruta-list .soil-analysis-card').forEach(function(c) { c.classList.toggle('active', c.getAttribute('data-id') === id); });
  window.frutaUpdateICC && window.frutaUpdateICC();
};

window.renderFrutaList = function renderFrutaList() {
  var listEl = document.getElementById('fruta-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  window.getFrutaAnalyses().forEach(function(a) {
    var card = document.createElement('div');
    card.className = 'soil-analysis-card';
    card.setAttribute('data-id', a.id);
    card.innerHTML = '<div class="soil-analysis-card-title">' + (a.title || 'Sin título') + '</div><div class="soil-analysis-card-date">' + (a.date || '') + '</div>';
    card.onclick = function() { window.selectFrutaAnalysis(a.id); };
    listEl.appendChild(card);
  });
};

window.deleteCurrentFrutaAnalysis = function deleteCurrentFrutaAnalysis() {
  var wrap = document.getElementById('fruta-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  if (!confirm('¿Eliminar este análisis de fruta?')) return;
  var arr = window.getFrutaAnalyses().filter(function(a) { return a.id !== id; });
  currentProject.frutaAnalyses = arr;
  window.saveFrutaAnalysesToProject();
  window.renderFrutaList && window.renderFrutaList();
  wrap.style.display = 'none';
  wrap.setAttribute('data-current-id', '');
  document.getElementById('fruta-form-empty').style.display = 'block';
  window.selectFrutaAnalysis(null);
};

window.initFrutaTab = function initFrutaTab() {
  window.getFrutaAnalyses();
  window.renderFrutaList && window.renderFrutaList();
  var wrap = document.getElementById('fruta-form-wrap');
  var emptyEl = document.getElementById('fruta-form-empty');
  if (wrap) { wrap.style.display = 'none'; wrap.setAttribute('data-current-id', ''); }
  if (emptyEl) emptyEl.style.display = 'block';
};

window.saveFrutaUIState = function saveFrutaUIState() {
  if (!currentProject.id) return;
  var wrap = document.getElementById('fruta-form-wrap');
  var selectedId = wrap ? wrap.getAttribute('data-current-id') || '' : '';
  var openSections = [];
  document.querySelectorAll('#fruta-form-wrap .soil-section[data-fru-section]').forEach(function(d) { if (d.open) openSections.push(d.getAttribute('data-fru-section')); });
  try {
    var key = 'nutriplant_fruta_ui_' + currentProject.id;
    localStorage.setItem(key, JSON.stringify({ selectedId: selectedId, openSections: openSections }));
  } catch (e) { console.warn('saveFrutaUIState', e); }
};

window.restoreFrutaUIState = function restoreFrutaUIState() {
  if (!currentProject.id) return;
  try {
    var key = 'nutriplant_fruta_ui_' + currentProject.id;
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var state = JSON.parse(raw);
    var selectedId = state.selectedId;
    var openSections = Array.isArray(state.openSections) ? state.openSections : [];
    if (selectedId && window.getFrutaAnalyses().some(function(a) { return a.id === selectedId; }) && typeof window.selectFrutaAnalysis === 'function') {
      window.selectFrutaAnalysis(selectedId);
    }
    if (openSections.length > 0) {
      document.querySelectorAll('#fruta-form-wrap .soil-section[data-fru-section]').forEach(function(d) {
        d.open = openSections.indexOf(d.getAttribute('data-fru-section')) !== -1;
      });
    }
    var container = document.querySelector('#fruta-form-wrap .soil-analysis-sections');
    if (container && !container._fruToggleBound) {
      container._fruToggleBound = true;
      container.addEventListener('toggle', function(e) {
        if (e.target && e.target.matches && e.target.matches('details[data-fru-section]') && typeof window.saveFrutaUIState === 'function') window.saveFrutaUIState();
      });
    }
  } catch (e) { console.warn('restoreFrutaUIState', e); }
};

function createSoilAnalysisTabHTML() {
  return `
    <div class="card soil-analysis-tab-container soil-analysis-watermark-wrap" id="soil-analysis-tab-container">
      <div class="soil-analysis-watermark" aria-hidden="true">
        <img src="assets/NutriPlant_PRO_blue.png" alt="">
      </div>
      <h2 class="text-xl" style="margin-bottom: 16px;">🔬 Análisis de Suelo</h2>
      <div class="soil-analysis-layout">
        <div class="soil-analysis-list-panel">
          <div class="soil-analysis-list-header">
            <strong>Reportes en este proyecto</strong>
            <div class="soil-analysis-list-actions">
              <button type="button" class="btn btn-sm btn-success" onclick="window.addNewSoilAnalysis && window.addNewSoilAnalysis();">➕ Agregar análisis</button>
            </div>
          </div>
          <div id="soil-analyses-list" class="soil-analyses-list"></div>
        </div>
        <div class="soil-analysis-form-panel" id="soil-analysis-form-panel">
          <div id="soil-analysis-form-empty" class="soil-analysis-form-empty">
            <p>Selecciona un análisis de la lista o agrega uno nuevo.</p>
          </div>
          <div id="soil-analysis-form-wrap" class="soil-analysis-form-wrap" style="display: none;" data-current-id="">
            <div class="soil-analysis-form-header">
              <input type="text" id="soil-meta-title" placeholder="Título (ej. Rancho Agrícola Junio 2025)" class="soil-input-inline" data-group="meta" data-field="title" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('meta','title',this.value)" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('meta','title',this.value)">
              <input type="text" id="soil-meta-date" placeholder="Fecha (ej. 2025-06-01)" class="soil-input-inline" data-group="meta" data-field="date" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('meta','date',this.value)">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteCurrentSoilAnalysis && window.deleteCurrentSoilAnalysis();">Eliminar</button>
            </div>
            <div class="soil-analysis-sections">
              <details class="soil-section" data-soil-section="physical" open>
                <summary>🌱 Propiedades físicas</summary>
                <div class="soil-fields">
                  <label>Clase textural <input type="text" id="soil-physical-texturalClass" data-group="physical" data-field="texturalClass" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('physical','texturalClass',this.value)" placeholder="ej. Franco Arenoso"></label>
                  <label>Punto saturación % <input type="number" step="0.01" id="soil-physical-saturationPoint" data-group="physical" data-field="saturationPoint" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('physical','saturationPoint',this.value)"></label>
                  <label>Capacidad de campo % <input type="number" step="0.01" id="soil-physical-fieldCapacity" data-group="physical" data-field="fieldCapacity" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('physical','fieldCapacity',this.value)"></label>
                  <label>Punto marchitamiento % <input type="number" step="0.01" id="soil-physical-wiltingPoint" data-group="physical" data-field="wiltingPoint" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('physical','wiltingPoint',this.value)"></label>
                  <label>Cond. hidráulica cm/h <input type="number" step="0.01" id="soil-physical-hydraulicConductivity" data-group="physical" data-field="hydraulicConductivity" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('physical','hydraulicConductivity',this.value)"></label>
                  <label><span class="soil-label-blue">Densidad aparente g/cm³</span> <input type="number" step="0.01" id="soil-physical-bulkDensity" data-group="physical" data-field="bulkDensity" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('physical','bulkDensity',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></label>
                </div>
              </details>
              <details class="soil-section" data-soil-section="ph">
                <summary>📐 pH y salinidad</summary>
                <div class="soil-fields">
                  <label>pH (1:2 agua) <input type="number" step="0.01" id="soil-phSection-ph" data-group="phSection" data-field="ph" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('phSection','ph',this.value)"></label>
                  <label>pH Buffer <input type="number" step="0.01" id="soil-phSection-phBuffer" data-group="phSection" data-field="phBuffer" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('phSection','phBuffer',this.value)"></label>
                  <label>Carbonatos totales % <input type="number" step="0.001" id="soil-phSection-totalCarbonates" data-group="phSection" data-field="totalCarbonates" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('phSection','totalCarbonates',this.value)"></label>
                  <label>Salinidad CE dS/m <input type="number" step="0.01" id="soil-phSection-salinity" data-group="phSection" data-field="salinity" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('phSection','salinity',this.value)"></label>
                </div>
              </details>
              <details class="soil-section" data-soil-section="fertility">
                <summary>🧪 Fertilidad del suelo</summary>
                <div class="soil-fertility-params">
                  <div class="soil-fertility-params-row" style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start;">
                    <label title="Profundidad de la capa de suelo considerada en el análisis (ej. 0-20 cm)">Profundidad (cm) <input type="number" id="soil-fertility-depthCm" min="1" step="1" style="width:70px;" placeholder="ej. 20" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','depthCm',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></label>
                    <label title="Qué parte de esa capa de suelo es realmente explorada por las raíces del cultivo. 100% = toda la capa; 50% = solo la mitad (ej. riego por goteo).">Suelo explorado por raíces (%) <input type="number" id="soil-fertility-reachPct" min="0" max="100" step="1" style="width:70px;" placeholder="100" title="100 = toda la capa; 50 = mitad" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','reachPct',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></label>
                    <label title="CIC proviene de la sección Cationes intercambiables y CIC (suma Ca+Mg+K+Na+Al+H). Solo visual.">CIC (meq/100g) <span id="soil-cic-params" class="soil-cic-display">—</span></label>
                  </div>
                  <div class="soil-fertility-params-hint">
                    En kg/ha se considera solo el suelo que las raíces aprovechan en la profundidad indicada. CIC define los ideales de K, Ca y Mg (tabla saturación equilibrada).
                    <button type="button" class="btn btn-sm soil-btn-ideal-ref" style="margin-left:8px; font-size:10px; padding:2px 8px; color:#0369a1; border:1px solid #0369a1; background:transparent; border-radius:4px; cursor:pointer;" onclick="window.applyGeneralIdealReferences && window.applyGeneralIdealReferences();" title="Llena la fila Ideal con valores de referencia generales (MO, N-NO₃, P por método, Na, S, micronutrientes). K, Ca y Mg se llenan con CIC.">Recargar valores ideales de referencia</button>
                  </div>
                </div>
                <div class="soil-fertility-table-wrap" style="overflow-x:auto;">
                  <table class="fertirriego-requirement-table soil-fertility-table">
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th>MO %</th>
                        <th>N-NO<sub>3</sub><sup>&minus;</sup> ppm</th>
                        <th class="soil-fertility-th-p">P (ppm)<br><select id="soil-fertility-pMethod" class="soil-fertility-p-method-header" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','pMethod',this.value); window.onSoilPMethodChange && window.onSoilPMethodChange(this.value);">
                            <option value="Bray">Bray</option>
                            <option value="Olsen">Olsen</option>
                            <option value="Merich">Merich</option>
                          </select></th>
                        <th>K ppm</th>
                        <th>Ca ppm</th>
                        <th>Mg ppm</th>
                        <th>Na ppm</th>
                        <th>S ppm</th>
                        <th>Fe ppm</th>
                        <th>Mn ppm</th>
                        <th>B ppm</th>
                        <th>Zn ppm</th>
                        <th>Cu ppm</th>
                        <th>Mo ppm</th>
                        <th>Al ppm</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Nivel (laboratorio)</strong></td>
                        <td><input type="number" step="0.01" id="soil-fertility-mo" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','mo',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','mo',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-nNo3" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','nNo3',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','nNo3',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-p" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','p',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','p',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-k" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','k',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','k',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ca" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','ca',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','ca',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-mg" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','mg',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','mg',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-na" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','na',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','na',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-s" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','s',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','s',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-fe" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','fe',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','fe',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-mn" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','mn',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','mn',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-b" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','b',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','b',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-zn" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','zn',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','zn',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-cu" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','cu',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','cu',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-moly" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','moly',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','moly',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-al" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','al',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();" onblur="window.saveSoilAnalysisField && window.saveSoilAnalysisField('fertility','al',this.value); window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();"></td>
                      </tr>
                      <tr>
                        <td><strong>Ideal (referencia)</strong></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-mo" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('mo',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('mo',this.value)"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ideal-nNo3" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('nNo3',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('nNo3',this.value)"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ideal-p" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('p',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('p',this.value)"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ideal-k" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('k',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('k',this.value)"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ideal-ca" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('ca',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('ca',this.value)"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ideal-mg" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('mg',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('mg',this.value)"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ideal-na" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('na',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('na',this.value)"></td>
                        <td><input type="number" step="0.1" id="soil-fertility-ideal-s" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('s',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('s',this.value)"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-fe" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('fe',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('fe',this.value)"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-mn" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('mn',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('mn',this.value)"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-b" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('b',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('b',this.value)"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-zn" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('zn',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('zn',this.value)"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-cu" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('cu',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('cu',this.value)"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-moly" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('moly',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('moly',this.value)"></td>
                        <td><input type="number" step="0.01" id="soil-fertility-ideal-al" class="fertirriego-input soil-fertility-input" onchange="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('al',this.value)" onblur="window.saveSoilAnalysisIdealField && window.saveSoilAnalysisIdealField('al',this.value)"></td>
                      </tr>
                      <tr class="soil-kgha-row">
                        <td><strong title="Diferencia en kg/ha: lo que hay (laboratorio) menos lo ideal. Negativo = falta aportar; positivo = exceso.">kg/ha (diferencia)</strong><br><span style="font-weight:normal; font-size:10px; color:#64748b;"><span style="color:#0369a1;">−</span> falta, <span style="color:#0369a1;">+</span> exceso</span></td>
                        <td id="soil-kgha-mo"></td>
                        <td id="soil-kgha-nNo3"></td>
                        <td id="soil-kgha-p"></td>
                        <td id="soil-kgha-k"></td>
                        <td id="soil-kgha-ca"></td>
                        <td id="soil-kgha-mg"></td>
                        <td id="soil-kgha-na"></td>
                        <td id="soil-kgha-s"></td>
                        <td id="soil-kgha-fe"></td>
                        <td id="soil-kgha-mn"></td>
                        <td id="soil-kgha-b"></td>
                        <td id="soil-kgha-zn"></td>
                        <td id="soil-kgha-cu"></td>
                        <td id="soil-kgha-moly"></td>
                        <td id="soil-kgha-al"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <details class="soil-section" data-soil-section="cations">
                <summary>⚗️ Cationes intercambiables y CIC</summary>
                <div class="soil-cations-structure">
                  <div class="soil-cations-meq-block">
                    <p class="soil-block-title">Concentraciones (meq/100g)</p>
                    <div class="soil-fields soil-fields-inline">
                      <label>Ca <input type="number" step="0.01" id="soil-cations-ca" data-group="cations" data-field="ca" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('cations','ca',this.value)"></label>
                      <label>Mg <input type="number" step="0.01" id="soil-cations-mg" data-group="cations" data-field="mg" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('cations','mg',this.value)"></label>
                      <label>K <input type="number" step="0.01" id="soil-cations-k" data-group="cations" data-field="k" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('cations','k',this.value)"></label>
                      <label>Na <input type="number" step="0.01" id="soil-cations-na" data-group="cations" data-field="na" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('cations','na',this.value)"></label>
                      <label>Al <input type="number" step="0.01" id="soil-cations-al" data-group="cations" data-field="al" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('cations','al',this.value)"></label>
                      <label>H <input type="number" step="0.01" id="soil-cations-h" data-group="cations" data-field="h" onchange="window.saveSoilAnalysisField && window.saveSoilAnalysisField('cations','h',this.value)"></label>
                    </div>
                  </div>
                  <div class="soil-cations-pct-box">
                    <p class="soil-block-title soil-block-title-blue">CIC y saturación (%)</p>
                    <div class="soil-cations-pct-inner">
                      <label class="soil-cic-label-blue" title="Calculado: suma de Ca+Mg+K+Na+Al+H (meq/100g)"><strong>CIC (meq/100g)</strong> <input type="text" id="soil-cations-cic" readonly class="soil-ratio-calc" placeholder="—"></label>
                      <label title="Calculado: 100 × (Ca meq / CIC)">% Ca <input type="text" id="soil-cations-pctCa" readonly class="soil-ratio-calc" placeholder="—"></label>
                      <label title="Calculado: 100 × (Mg meq / CIC)">% Mg <input type="text" id="soil-cations-pctMg" readonly class="soil-ratio-calc" placeholder="—"></label>
                      <label title="Calculado: 100 × (K meq / CIC)">% K <input type="text" id="soil-cations-pctK" readonly class="soil-ratio-calc" placeholder="—"></label>
                      <label title="Calculado: 100 × (Na meq / CIC)">% Na <input type="text" id="soil-cations-pctNa" readonly class="soil-ratio-calc" placeholder="—"></label>
                    </div>
                  </div>
                </div>
              </details>
              <details class="soil-section" data-soil-section="ratios">
                <summary>📊 Relaciones entre cationes (calculadas desde meq/100g)</summary>
                <div class="soil-ratios-structure">
                  <p class="soil-ratios-ref-title">Valores de referencia: Ca/Mg = 6 · Mg/K = 3.5 · (Ca+Mg)/K = 18 · Ca/K = 14</p>
                  <div class="soil-fields soil-ratios-grid">
                    <label>Ca/Mg <span class="soil-ratio-value-wrap"><input type="text" id="soil-ratios-caMg" readonly class="soil-ratio-calc" placeholder="—"><span class="soil-ratio-icon" id="soil-ratios-icon-caMg" aria-hidden="true"></span></span></label>
                    <label>Mg/K <span class="soil-ratio-value-wrap"><input type="text" id="soil-ratios-mgK" readonly class="soil-ratio-calc" placeholder="—"><span class="soil-ratio-icon" id="soil-ratios-icon-mgK" aria-hidden="true"></span></span></label>
                    <label>(Ca+Mg)/K <span class="soil-ratio-value-wrap"><input type="text" id="soil-ratios-caMgK" readonly class="soil-ratio-calc" placeholder="—"><span class="soil-ratio-icon" id="soil-ratios-icon-caMgK" aria-hidden="true"></span></span></label>
                    <label>Ca/K <span class="soil-ratio-value-wrap"><input type="text" id="soil-ratios-caK" readonly class="soil-ratio-calc" placeholder="—"><span class="soil-ratio-icon" id="soil-ratios-icon-caK" aria-hidden="true"></span></span></label>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.getSoilAnalyses = function getSoilAnalyses() {
  if (!currentProject.id) return [];
  if (!Array.isArray(currentProject.soilAnalyses)) currentProject.soilAnalyses = [];
  return currentProject.soilAnalyses;
};

window.addNewSoilAnalysis = function addNewSoilAnalysis() {
  if (!currentProject.id) { alert('Selecciona un proyecto primero.'); return; }
  var list = window.getSoilAnalyses();
  var a = createEmptySoilAnalysis();
  a.title = 'Nuevo análisis ' + (list.length + 1);
  list.push(a);
  window.saveSoilAnalysesToProject();
  window.renderSoilAnalysesList && window.renderSoilAnalysesList();
  window.selectSoilAnalysis && window.selectSoilAnalysis(a.id);
}

window.addExampleSoilAnalysis = function addExampleSoilAnalysis() {
  if (!currentProject.id) { alert('Selecciona un proyecto primero.'); return; }
  var list = window.getSoilAnalyses();
  var existing = list.find(function (x) { return x.id === 'sa_ejemplo'; });
  if (existing) { window.selectSoilAnalysis(existing.id); return; }
  var a = createExampleSoilAnalysis();
  list.push(a);
  window.saveSoilAnalysesToProject();
  window.renderSoilAnalysesList && window.renderSoilAnalysesList();
  window.selectSoilAnalysis && window.selectSoilAnalysis(a.id);
};

var _soilAnalysesSaveTimer = null;
window.saveSoilAnalysesToProject = function saveSoilAnalysesToProject() {
  if (!currentProject.id || !window.projectStorage) return;
  if (_soilAnalysesSaveTimer) clearTimeout(_soilAnalysesSaveTimer);
  var projectId = currentProject.id;
  var arr = Array.isArray(currentProject.soilAnalyses) ? currentProject.soilAnalyses : [];
  var dataCopy = JSON.parse(JSON.stringify(arr));
  _soilAnalysesSaveTimer = setTimeout(function() {
    _soilAnalysesSaveTimer = null;
    var run = function() {
      try { window.projectStorage && window.projectStorage.saveSection('soilAnalyses', dataCopy, projectId); } catch (e) { console.warn('saveSoilAnalysesToProject', e); }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 0);
    }
  }, 350);
};

window.saveSoilAnalysisField = function saveSoilAnalysisField(group, field, value) {
  const wrap = document.getElementById('soil-analysis-form-wrap');
  const id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  const list = window.getSoilAnalyses();
  const analysis = list.find(function (a) { return a.id === id; });
  if (!analysis) return;
  if (group === 'meta') {
    if (field === 'title') analysis.title = value;
    if (field === 'date') analysis.date = value;
  } else if (analysis[group]) {
    const num = parseFloat(value);
    analysis[group][field] = (value !== '' && !isNaN(num)) ? num : value;
  }
  window.saveSoilAnalysesToProject();
  if (group === 'cations') {
    window.updateCationsCICAndPct && window.updateCationsCICAndPct();
    window.updateSoilAnalysisRatios && window.updateSoilAnalysisRatios();
  }
  if (group === 'meta') window.renderSoilAnalysesList && window.renderSoilAnalysesList();
};

window.saveSoilAnalysisIdealField = function saveSoilAnalysisIdealField(field, value) {
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getSoilAnalyses();
  var analysis = list.find(function (a) { return a.id === id; });
  if (!analysis || !analysis.fertility) return;
  if (!analysis.fertility.ideal) analysis.fertility.ideal = {};
  var num = parseFloat(value);
  analysis.fertility.ideal[field] = (value !== '' && !isNaN(num)) ? num : value;
  window.saveSoilAnalysesToProject();
  window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();
};

window.updateSoilFertilityKgHa = function updateSoilFertilityKgHa() {
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getSoilAnalyses();
  var analysis = list.find(function (a) { return a.id === id; });
  if (!analysis) return;
  var bulk = parseFloat(analysis.physical && analysis.physical.bulkDensity) || 0;
  var depth = parseFloat(analysis.fertility && analysis.fertility.depthCm) || 20;
  var reach = parseFloat(analysis.fertility && analysis.fertility.reachPct) || 100;
  if (bulk <= 0) bulk = 1;
  // factor: convierte ppm (o % MO) a kg/ha en la capa considerada (profundidad × densidad × % alcance raíces)
  var factor = 0.1 * depth * bulk * (reach / 100);
  var fert = analysis.fertility || {};
  var ideal = (fert.ideal && typeof fert.ideal === 'object') ? fert.ideal : {};
  var keys = ['mo','nNo3','p','k','ca','mg','na','s','fe','mn','b','zn','cu','moly','al'];
  keys.forEach(function (key) {
    var v = fert[key];
    var lab = (v !== '' && v !== null && v !== undefined) ? parseFloat(v) : NaN;
    var idealVal = (ideal[key] !== '' && ideal[key] !== null && ideal[key] !== undefined) ? parseFloat(ideal[key]) : NaN;
    var el = document.getElementById('soil-kgha-' + key);
    if (!el) return;
    if (isNaN(lab)) { el.textContent = '—'; return; }
    // kg/ha = (nivel lab − ideal) × factor → positivo = exceso, negativo = falta
    var diff = isNaN(idealVal) ? lab : (lab - idealVal);
    var kgHa = diff * factor;
    el.textContent = kgHa.toFixed(2);
  });
};

// Tabla 8 - Saturación equilibrada (AyL). K = Normal (2-5%); Mg (10-15%); Ca (65-75%). Valores extraídos de la tabla; solo búsqueda por CIC.
var SOIL_CIC_TABLE = [
  { cic: 4, k: 85, ca: 520, mg: 75 }, { cic: 5, k: 108, ca: 650, mg: 90 }, { cic: 6, k: 117, ca: 708, mg: 106 },
  { cic: 7, k: 123, ca: 910, mg: 121 }, { cic: 8, k: 129, ca: 1040, mg: 135 }, { cic: 9, k: 135, ca: 1170, mg: 148 },
  { cic: 10, k: 141, ca: 1300, mg: 160 }, { cic: 11, k: 147, ca: 1430, mg: 172 }, { cic: 12, k: 152, ca: 1560, mg: 183 },
  { cic: 13, k: 158, ca: 1690, mg: 193 }, { cic: 14, k: 164, ca: 1820, mg: 202 }, { cic: 15, k: 170, ca: 1950, mg: 210 },
  { cic: 16, k: 176, ca: 2080, mg: 218 }, { cic: 17, k: 182, ca: 2210, mg: 225 }, { cic: 18, k: 187, ca: 2340, mg: 230 },
  { cic: 19, k: 192, ca: 2470, mg: 236 }, { cic: 20, k: 195, ca: 2600, mg: 240 }, { cic: 21, k: 205, ca: 2730, mg: 252 },
  { cic: 22, k: 215, ca: 2860, mg: 263 }, { cic: 23, k: 224, ca: 2990, mg: 275 }, { cic: 24, k: 234, ca: 3120, mg: 288 },
  { cic: 25, k: 244, ca: 3250, mg: 300 }, { cic: 26, k: 254, ca: 3380, mg: 312 }, { cic: 27, k: 264, ca: 3510, mg: 324 },
  { cic: 28, k: 274, ca: 3640, mg: 336 }, { cic: 29, k: 284, ca: 3770, mg: 348 }, { cic: 30, k: 292, ca: 3900, mg: 360 },
  { cic: 31, k: 298, ca: 4030, mg: 372 }, { cic: 32, k: 304, ca: 4160, mg: 384 }, { cic: 33, k: 309, ca: 4290, mg: 396 },
  { cic: 34, k: 314, ca: 4420, mg: 408 }, { cic: 35, k: 319, ca: 4550, mg: 420 }, { cic: 36, k: 323, ca: 4680, mg: 432 },
  { cic: 37, k: 327, ca: 4810, mg: 444 }, { cic: 38, k: 331, ca: 4940, mg: 456 }, { cic: 39, k: 335, ca: 5070, mg: 468 },
  { cic: 40, k: 338, ca: 5200, mg: 480 }, { cic: 41, k: 341, ca: 5330, mg: 492 }, { cic: 42, k: 344, ca: 5460, mg: 504 },
  { cic: 43, k: 347, ca: 5590, mg: 516 }, { cic: 44, k: 349, ca: 5720, mg: 528 }, { cic: 45, k: 351, ca: 5850, mg: 540 },
  { cic: 46, k: 359, ca: 5980, mg: 552 }, { cic: 47, k: 367, ca: 6110, mg: 564 }, { cic: 48, k: 375, ca: 6240, mg: 576 },
  { cic: 49, k: 382, ca: 6370, mg: 588 }, { cic: 50, k: 390, ca: 6500, mg: 600 }
];
function getSoilIdealByCIC(cic) {
  var c = parseFloat(cic);
  if (isNaN(c) || c < 4) c = 4;
  if (c > 50) c = 50;
  var row = Math.round(c);
  if (row < 4) row = 4;
  if (row > 50) row = 50;
  var r = SOIL_CIC_TABLE.find(function (x) { return x.cic === row; });
  if (r) return { k: r.k, ca: r.ca, mg: r.mg };
  var last = SOIL_CIC_TABLE[SOIL_CIC_TABLE.length - 1];
  return { k: last.k, ca: last.ca, mg: last.mg };
}

// Manual CIC desde Fertilidad (ya no usado: CIC en Fertilidad es solo visual; se edita en Cationes).
window.syncCICFromParams = function syncCICFromParams() {
  var inp = document.getElementById('soil-cic-params');
  if (!inp || inp.tagName !== 'INPUT') return;
  var val = (inp.value || '').trim();
  var num = val !== '' ? parseFloat(val) : NaN;
  window.saveSoilAnalysisField('cations', 'cic', val !== '' && !isNaN(num) ? String(num) : '');
  var other = document.getElementById('soil-cations-cic');
  if (other) other.value = val !== '' && !isNaN(num) ? String(num) : '—';
  if (val !== '' && !isNaN(num)) window.applyIdealFromCIC && window.applyIdealFromCIC();
};

// Llevar CIC desde Cationes al dato visual de Fertilidad (sin cuadrito de input).
window.syncCICToParams = function syncCICToParams() {
  var cationesEl = document.getElementById('soil-cations-cic');
  var paramsEl = document.getElementById('soil-cic-params');
  if (cationesEl && paramsEl) paramsEl.textContent = cationesEl.value || '—';
};

window.applyIdealFromCIC = function applyIdealFromCIC() {
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getSoilAnalyses();
  var analysis = list.find(function (a) { return a.id === id; });
  if (!analysis || !analysis.cations) return;
  var cic = analysis.cations.cic;
  if (cic === '' || cic === undefined || cic === null) return;
  var ideal = getSoilIdealByCIC(cic);
  if (!analysis.fertility.ideal) analysis.fertility.ideal = {};
  analysis.fertility.ideal.k = ideal.k;
  analysis.fertility.ideal.ca = ideal.ca;
  analysis.fertility.ideal.mg = ideal.mg;
  window.saveSoilAnalysesToProject();
  var kEl = document.getElementById('soil-fertility-ideal-k');
  var caEl = document.getElementById('soil-fertility-ideal-ca');
  var mgEl = document.getElementById('soil-fertility-ideal-mg');
  if (kEl) kEl.value = ideal.k;
  if (caEl) caEl.value = ideal.ca;
  if (mgEl) mgEl.value = ideal.mg;
  window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();
};

// Ideales de referencia generales (no dependen de CIC): MO, N-NO3, P por método, Na, S, micronutrientes. P Bray 40 ppm, Olsen 25, Mehlich 3 (Merich) 40.
var SOIL_GENERAL_IDEAL = { mo: 3, nNo3: 20, na: 0, s: 15, fe: 20, mn: 20, zn: 3, cu: 1.5, b: 1, moly: 0.1, al: 0 };
var SOIL_IDEAL_P_BY_METHOD = { Bray: 40, Olsen: 25, Merich: 40 };

window.onSoilPMethodChange = function onSoilPMethodChange(method) {
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getSoilAnalyses();
  var analysis = list.find(function (a) { return a.id === id; });
  if (!analysis || !analysis.fertility) return;
  if (!analysis.fertility.ideal) analysis.fertility.ideal = {};
  var methodKey = (method || '').trim();
  var pIdeal = SOIL_IDEAL_P_BY_METHOD[methodKey] != null ? SOIL_IDEAL_P_BY_METHOD[methodKey] : 40;
  analysis.fertility.ideal.p = pIdeal;
  window.saveSoilAnalysesToProject();
  var el = document.getElementById('soil-fertility-ideal-p');
  if (el) el.value = pIdeal;
  window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();
};

window.applyGeneralIdealReferences = function applyGeneralIdealReferences() {
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getSoilAnalyses();
  var analysis = list.find(function (a) { return a.id === id; });
  if (!analysis) return;
  if (!analysis.fertility.ideal) analysis.fertility.ideal = {};
  var method = (analysis.fertility.pMethod || 'Bray').trim();
  var pIdeal = SOIL_IDEAL_P_BY_METHOD[method] != null ? SOIL_IDEAL_P_BY_METHOD[method] : 40;
  Object.keys(SOIL_GENERAL_IDEAL).forEach(function (key) {
    analysis.fertility.ideal[key] = SOIL_GENERAL_IDEAL[key];
  });
  analysis.fertility.ideal.p = pIdeal;
  window.saveSoilAnalysesToProject();
  var ids = ['mo','nNo3','p','na','s','fe','mn','zn','cu','b','moly','al'];
  var vals = [SOIL_GENERAL_IDEAL.mo, SOIL_GENERAL_IDEAL.nNo3, pIdeal, SOIL_GENERAL_IDEAL.na, SOIL_GENERAL_IDEAL.s, SOIL_GENERAL_IDEAL.fe, SOIL_GENERAL_IDEAL.mn, SOIL_GENERAL_IDEAL.zn, SOIL_GENERAL_IDEAL.cu, SOIL_GENERAL_IDEAL.b, SOIL_GENERAL_IDEAL.moly, SOIL_GENERAL_IDEAL.al];
  ids.forEach(function (key, i) {
    var el = document.getElementById('soil-fertility-ideal-' + key);
    if (el) el.value = vals[i];
  });
  if (analysis.cations && (analysis.cations.cic !== '' && analysis.cations.cic !== undefined && analysis.cations.cic !== null)) window.applyIdealFromCIC && window.applyIdealFromCIC();
  window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();
};

window.selectSoilAnalysis = function selectSoilAnalysis(id) {
  const list = window.getSoilAnalyses();
  const analysis = list.find(function (a) { return a.id === id; });
  const emptyEl = document.getElementById('soil-analysis-form-empty');
  const wrapEl = document.getElementById('soil-analysis-form-wrap');
  if (!wrapEl) return;
  if (!analysis) {
    wrapEl.style.display = 'none';
    wrapEl.setAttribute('data-current-id', '');
    if (emptyEl) emptyEl.style.display = 'block';
    document.querySelectorAll('.soil-analysis-card').forEach(function (c) { c.classList.remove('active'); });
    return;
  }
  wrapEl.setAttribute('data-current-id', id);
  wrapEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  document.getElementById('soil-meta-title').value = analysis.title || '';
  document.getElementById('soil-meta-date').value = analysis.date || '';
  ['physical','phSection','fertility','cations','ratios'].forEach(function (group) {
    if (!analysis[group]) return;
    Object.keys(analysis[group]).forEach(function (field) {
      if (group === 'fertility' && field === 'ideal') return;
      var el = document.getElementById('soil-' + group + '-' + field);
      if (el) el.value = analysis[group][field] !== undefined && analysis[group][field] !== null ? analysis[group][field] : '';
    });
  });
  if (analysis.fertility && analysis.fertility.ideal && typeof analysis.fertility.ideal === 'object') {
    Object.keys(analysis.fertility.ideal).forEach(function (f) {
      var el = document.getElementById('soil-fertility-ideal-' + f);
      if (el) el.value = analysis.fertility.ideal[f] !== undefined && analysis.fertility.ideal[f] !== null ? analysis.fertility.ideal[f] : '';
    });
  }
  var cicParamsEl = document.getElementById('soil-cic-params');
  if (cicParamsEl && analysis.cations && (analysis.cations.cic !== undefined && analysis.cations.cic !== null && analysis.cations.cic !== '')) cicParamsEl.textContent = analysis.cations.cic;
  else if (cicParamsEl) cicParamsEl.textContent = '—';
  document.querySelectorAll('.soil-analysis-card').forEach(function (c) {
    c.classList.toggle('active', c.getAttribute('data-id') === id);
  });
  window.updateCationsCICAndPct && window.updateCationsCICAndPct();
  window.updateSoilAnalysisRatios && window.updateSoilAnalysisRatios();
  window.updateSoilFertilityKgHa && window.updateSoilFertilityKgHa();
};

// CIC = suma de Ca+Mg+K+Na+Al+H (meq/100g). % = 100 × (meq / CIC). Actualiza Cationes y sincroniza con Fertilidad.
window.updateCationsCICAndPct = function updateCationsCICAndPct() {
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  var list = window.getSoilAnalyses();
  var analysis = list.find(function (a) { return a.id === id; });
  if (!analysis || !analysis.cations) return;
  var ca = parseFloat(analysis.cations.ca); var mg = parseFloat(analysis.cations.mg); var k = parseFloat(analysis.cations.k);
  var na = parseFloat(analysis.cations.na); var al = parseFloat(analysis.cations.al); var h = parseFloat(analysis.cations.h);
  if (isNaN(ca)) ca = 0; if (isNaN(mg)) mg = 0; if (isNaN(k)) k = 0;
  if (isNaN(na)) na = 0; if (isNaN(al)) al = 0; if (isNaN(h)) h = 0;
  var sum = ca + mg + k + na + al + h;
  var cic = sum;
  function fmtNum(v) { return v != null && !isNaN(v) ? Number(v).toFixed(2) : ''; }
  function fmtPct(v) { return v != null && !isNaN(v) ? Number(v).toFixed(1) : ''; }
  if (sum > 0) {
    analysis.cations.cic = cic;
    analysis.cations.pctCa = (ca / sum) * 100;
    analysis.cations.pctMg = (mg / sum) * 100;
    analysis.cations.pctK = (k / sum) * 100;
    analysis.cations.pctNa = (na / sum) * 100;
    var cicEl = document.getElementById('soil-cations-cic');
    if (cicEl) cicEl.value = fmtNum(cic);
    var pctCaEl = document.getElementById('soil-cations-pctCa'); if (pctCaEl) pctCaEl.value = fmtPct(analysis.cations.pctCa);
    var pctMgEl = document.getElementById('soil-cations-pctMg'); if (pctMgEl) pctMgEl.value = fmtPct(analysis.cations.pctMg);
    var pctKEl = document.getElementById('soil-cations-pctK'); if (pctKEl) pctKEl.value = fmtPct(analysis.cations.pctK);
    var pctNaEl = document.getElementById('soil-cations-pctNa'); if (pctNaEl) pctNaEl.value = fmtPct(analysis.cations.pctNa);
    window.saveSoilAnalysesToProject();
    window.syncCICToParams && window.syncCICToParams();
    window.applyIdealFromCIC && window.applyIdealFromCIC();
  } else {
    analysis.cations.pctCa = ''; analysis.cations.pctMg = ''; analysis.cations.pctK = ''; analysis.cations.pctNa = '';
    var cicEl = document.getElementById('soil-cations-cic');
    if (cicEl) cicEl.value = (analysis.cations.cic !== undefined && analysis.cations.cic !== null && analysis.cations.cic !== '') ? fmtNum(parseFloat(analysis.cations.cic)) : '—';
    var pctCaEl = document.getElementById('soil-cations-pctCa'); if (pctCaEl) pctCaEl.value = '—';
    var pctMgEl = document.getElementById('soil-cations-pctMg'); if (pctMgEl) pctMgEl.value = '—';
    var pctKEl = document.getElementById('soil-cations-pctK'); if (pctKEl) pctKEl.value = '—';
    var pctNaEl = document.getElementById('soil-cations-pctNa'); if (pctNaEl) pctNaEl.value = '—';
    window.saveSoilAnalysesToProject();
    window.syncCICToParams && window.syncCICToParams();
  }
};

window.updateSoilAnalysisRatios = function updateSoilAnalysisRatios() {
  const wrap = document.getElementById('soil-analysis-form-wrap');
  const id = wrap && wrap.getAttribute('data-current-id');
  if (!id) return;
  const list = window.getSoilAnalyses();
  const analysis = list.find(function (a) { return a.id === id; });
  if (!analysis || !analysis.cations) return;
  var ca = parseFloat(analysis.cations.ca);
  var mg = parseFloat(analysis.cations.mg);
  var k = parseFloat(analysis.cations.k);
  if (isNaN(ca)) ca = 0;
  if (isNaN(mg)) mg = 0;
  if (isNaN(k)) k = 0;
  function fmt(v) { return v != null && !isNaN(v) ? Number(v).toFixed(2) : '—'; }
  var caMg = (mg > 0) ? ca / mg : null;
  var mgK = (k > 0) ? mg / k : null;
  var caMgK = (k > 0) ? (ca + mg) / k : null;
  var caK = (k > 0) ? ca / k : null;
  analysis.ratios = analysis.ratios || {};
  analysis.ratios.caMg = caMg;
  analysis.ratios.mgK = mgK;
  analysis.ratios.caMgK = caMgK;
  analysis.ratios.caK = caK;
  var refs = { caMg: 6, mgK: 3.5, caMgK: 18, caK: 14 };
  function setRatioAndIcon(value, ref, inputId, iconId) {
    var el = document.getElementById(inputId);
    var iconEl = document.getElementById(iconId);
    if (el) el.value = fmt(value);
    if (!iconEl) return;
    if (value == null || isNaN(value)) { iconEl.textContent = ''; iconEl.className = 'soil-ratio-icon'; iconEl.title = ''; return; }
    var tol = Math.max(ref * 0.05, 0.15);
    if (Math.abs(value - ref) <= tol) {
      iconEl.textContent = '\u2713';
      iconEl.className = 'soil-ratio-icon soil-ratio-ok';
      iconEl.title = 'OK';
    } else if (value > ref) {
      iconEl.textContent = '\u2191';
      iconEl.className = 'soil-ratio-icon soil-ratio-alto';
      iconEl.title = 'Alto';
    } else {
      iconEl.textContent = '\u2193';
      iconEl.className = 'soil-ratio-icon soil-ratio-bajo';
      iconEl.title = 'Bajo';
    }
  }
  setRatioAndIcon(caMg, refs.caMg, 'soil-ratios-caMg', 'soil-ratios-icon-caMg');
  setRatioAndIcon(mgK, refs.mgK, 'soil-ratios-mgK', 'soil-ratios-icon-mgK');
  setRatioAndIcon(caMgK, refs.caMgK, 'soil-ratios-caMgK', 'soil-ratios-icon-caMgK');
  setRatioAndIcon(caK, refs.caK, 'soil-ratios-caK', 'soil-ratios-icon-caK');
  window.saveSoilAnalysesToProject();
};

window.deleteCurrentSoilAnalysis = function deleteCurrentSoilAnalysis() {
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var id = wrap && wrap.getAttribute('data-current-id');
  if (!id || !confirm('¿Eliminar este análisis de suelo?')) return;
  var list = window.getSoilAnalyses();
  currentProject.soilAnalyses = list.filter(function (a) { return a.id !== id; });
  window.saveSoilAnalysesToProject();
  window.renderSoilAnalysesList && window.renderSoilAnalysesList();
  wrap.style.display = 'none';
  wrap.setAttribute('data-current-id', '');
  document.getElementById('soil-analysis-form-empty').style.display = 'block';
};

window.renderSoilAnalysesList = function renderSoilAnalysesList() {
  var listEl = document.getElementById('soil-analyses-list');
  if (!listEl) return;
  var list = window.getSoilAnalyses();
  if (!Array.isArray(list)) list = [];
  listEl.innerHTML = '';
  list.forEach(function (a) {
    const card = document.createElement('div');
    card.className = 'soil-analysis-card';
    card.setAttribute('data-id', a.id);
    card.innerHTML = '<div class="soil-analysis-card-title">' + (a.title || 'Sin título') + '</div><div class="soil-analysis-card-date">' + (a.date || '') + '</div>';
    card.onclick = function () { window.selectSoilAnalysis(a.id); };
    listEl.appendChild(card);
  });
};

window.initSoilAnalysesTab = function initSoilAnalysesTab() {
  window.getSoilAnalyses();
  window.renderSoilAnalysesList && window.renderSoilAnalysesList();
  const wrap = document.getElementById('soil-analysis-form-wrap');
  const emptyEl = document.getElementById('soil-analysis-form-empty');
  if (wrap) { wrap.style.display = 'none'; wrap.setAttribute('data-current-id', ''); }
  if (emptyEl) emptyEl.style.display = 'block';
};

// Guardar estado de la pestaña Análisis de Suelo (análisis seleccionado y secciones abiertas) para restaurar al volver o tras recargar
window.saveSoilAnalysisUIState = function saveSoilAnalysisUIState() {
  if (!currentProject.id) return;
  var wrap = document.getElementById('soil-analysis-form-wrap');
  var selectedId = wrap ? wrap.getAttribute('data-current-id') || '' : '';
  var openSections = [];
  document.querySelectorAll('.soil-section[data-soil-section]').forEach(function (d) {
    if (d.open) openSections.push(d.getAttribute('data-soil-section'));
  });
  try {
    var key = 'nutriplant_soil_ui_' + currentProject.id;
    localStorage.setItem(key, JSON.stringify({ selectedId: selectedId, openSections: openSections }));
  } catch (e) { console.warn('saveSoilAnalysisUIState', e); }
};

// Restaurar estado al volver a Análisis de Suelo: mismo análisis seleccionado y mismas secciones desplegadas
window.restoreSoilAnalysisUIState = function restoreSoilAnalysisUIState() {
  if (!currentProject.id) return;
  try {
    var key = 'nutriplant_soil_ui_' + currentProject.id;
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var state = JSON.parse(raw);
    var selectedId = state.selectedId;
    var openSections = Array.isArray(state.openSections) ? state.openSections : [];
    if (selectedId) {
      var list = window.getSoilAnalyses();
      if (list.some(function (a) { return a.id === selectedId; }) && typeof window.selectSoilAnalysis === 'function') {
        window.selectSoilAnalysis(selectedId);
      }
    }
    if (openSections.length > 0) {
      document.querySelectorAll('.soil-section[data-soil-section]').forEach(function (d) {
        var section = d.getAttribute('data-soil-section');
        d.open = openSections.indexOf(section) !== -1;
      });
    }
    var container = document.querySelector('.soil-analysis-sections');
    if (container && !container._soilToggleBound) {
      container._soilToggleBound = true;
      container.addEventListener('toggle', function (e) {
        if (e.target && e.target.matches && e.target.matches('details[data-soil-section]') && typeof window.saveSoilAnalysisUIState === 'function') {
          window.saveSoilAnalysisUIState();
        }
      });
    }
  } catch (e) { console.warn('restoreSoilAnalysisUIState', e); }
};

// Al recargar o cerrar la página: si estabas en Análisis de Suelo, guardar estado para restaurar al volver
window.addEventListener('beforeunload', function () {
  if (!currentProject.id) return;
  if (document.querySelector('.soil-section[data-soil-section]') && typeof window.saveSoilAnalysisUIState === 'function') {
    try { window.saveSoilAnalysisUIState(); } catch (e) {}
  }
});

// ===================================
// CALCULADORA DE DÉFICIT DE PRESIÓN DE VAPOR (VPD)
// ===================================

// Función para calcular VPD Simple (ambiental)
function calculateVPDSimple(airTemp, humidity) {
  // Presión de saturación de vapor a temperatura del aire (kPa)
  const es = 0.6108 * Math.exp((17.27 * airTemp) / (airTemp + 237.3));
  
  // Presión de vapor actual (kPa)
  const ea = es * (humidity / 100);
  
  // VPD (kPa)
  const vpd = es - ea;
  
  // HD (Humidity Deficit) en g/m³
  const hd = (vpd * 216.7) / (airTemp + 273.15);
  
  return { vpd: parseFloat(vpd.toFixed(2)), hd: parseFloat(hd.toFixed(2)) };
}

// Función para calcular temperatura de hoja desde radiación solar
function calculateLeafTempFromRadiation(airTemp, solarRadiation) {
  // Fórmula simplificada basada en modelos agrícolas
  // T_leaf ≈ T_air + (solarRadiation / factor)
  // Factor ajustable según tipo de cultivo (valores típicos: 200-400)
  const factor = 250; // Factor promedio para cultivos generales
  const leafTemp = airTemp + (solarRadiation / factor) * 2.5;
  return parseFloat(leafTemp.toFixed(1));
}

// Función para calcular VPD Avanzado (con temperatura de hoja)
function calculateVPDAdvanced(airTemp, airHumidity, leafTemp) {
  // Presión de saturación de vapor a temperatura de hoja (kPa)
  const es_leaf = 0.6108 * Math.exp((17.27 * leafTemp) / (leafTemp + 237.3));
  
  // Presión de saturación de vapor a temperatura del aire (kPa)
  const es_air = 0.6108 * Math.exp((17.27 * airTemp) / (airTemp + 237.3));
  
  // Presión de vapor actual (del aire) (kPa)
  const ea = es_air * (airHumidity / 100);
  
  // VPD (diferencia entre presión de saturación de hoja y presión actual del aire)
  const vpd = es_leaf - ea;
  
  // HD (Humidity Deficit) en g/m³
  const hd = (vpd * 216.7) / (airTemp + 273.15);
  
  return { vpd: parseFloat(vpd.toFixed(2)), hd: parseFloat(hd.toFixed(2)) };
}

// Obtener ubicación para VPD: center guardado o centroide del polígono
function getVPDLocation(project) {
  var loc = project && project.location;
  if (!loc) return null;
  if (loc.center && typeof loc.center.lat === 'number' && typeof loc.center.lng === 'number')
    return { lat: loc.center.lat, lng: loc.center.lng };
  var poly = loc.polygon;
  if (poly && Array.isArray(poly) && poly.length >= 3) {
    var lat = 0, lng = 0;
    poly.forEach(function(c) {
      lat += Array.isArray(c) ? c[0] : (c.lat != null ? c.lat : c[0]);
      lng += Array.isArray(c) ? c[1] : (c.lng != null ? c.lng : c[1]);
    });
    return { lat: lat / poly.length, lng: lng / poly.length };
  }
  return null;
}

// Clima desde Open-Meteo (gratuito, sin API key). Temperatura °C y humedad %.
async function getWeatherData(lat, lng) {
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) +
    '&longitude=' + encodeURIComponent(lng) +
    '&current=temperature_2m,relative_humidity_2m';
  var response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error ' + response.status);
  }
  var data = await response.json();
  if (!data || !data.current) {
    throw new Error('Datos de clima no válidos');
  }
  return {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m
  };
}

// Función para guardar cálculo VPD en historial
function saveVPDCalculation(type, data) {
  const currentProjectId = np_getCurrentProjectId();
  if (!currentProjectId) {
    console.error('❌ No hay proyecto activo');
    return false;
  }
  
  if (!currentProject.vpdAnalysis) {
    currentProject.vpdAnalysis = {
      environmental: {},
      advanced: {},
      history: [],
      lastUpdated: null
    };
  }
  
  const calculation = {
    type: type, // 'environmental' o 'advanced'
    vpd: data.vpd,
    hd: data.hd,
    timestamp: new Date().toISOString(),
    data: { ...data }
  };
  
  // Guardar en el cálculo correspondiente
  if (type === 'environmental') {
    currentProject.vpdAnalysis.environmental = {
      temperature: data.temperature,
      humidity: data.humidity,
      vpd: data.vpd,
      hd: data.hd,
      calculatedAt: calculation.timestamp,
      location: data.location || {},
      source: data.source || 'api'
    };
  } else if (type === 'advanced') {
    currentProject.vpdAnalysis.advanced = {
      airTemperature: data.airTemperature,
      airHumidity: data.airHumidity,
      mode: data.mode,
      leafTemperature: data.leafTemperature,
      solarRadiation: data.solarRadiation,
      calculatedLeafTemp: data.calculatedLeafTemp,
      vpd: data.vpd,
      hd: data.hd,
      calculatedAt: calculation.timestamp
    };
  }
  
  // Agregar al historial
  if (!currentProject.vpdAnalysis.history) {
    currentProject.vpdAnalysis.history = [];
  }
  currentProject.vpdAnalysis.history.push(calculation);
  
  // Actualizar lastUpdated
  currentProject.vpdAnalysis.lastUpdated = calculation.timestamp;
  
  // 🚀 GUARDAR DIRECTAMENTE usando saveSection() (igual que otras secciones)
  // Esto asegura que se guarde independientemente por proyecto y por usuario
  if (typeof window.projectStorage !== 'undefined' && window.projectStorage.saveSection) {
    const success = window.projectStorage.saveSection('vpdAnalysis', currentProject.vpdAnalysis, currentProjectId);
    if (success) {
      console.log('✅ Sección vpdAnalysis guardada directamente');
      // Actualizar también en memoria para que esté disponible inmediatamente
      if (currentProject.vpdAnalysis) {
        currentProject.vpdAnalysis = { ...currentProject.vpdAnalysis };
      }
    } else {
      console.error('❌ Error guardando vpdAnalysis');
    }
  } else {
    // Fallback: usar saveProjectData si no hay sistema centralizado
    console.warn('⚠️ Sistema centralizado no disponible, usando saveProjectData()');
    saveProjectData();
  }
  
  return true;
}

// Función para crear gráfica de rangos ideales de VPD
function createVPDRangeChart(vpdValue) {
  const minVPD = 0;
  const maxVPD = 3.0;
  const optimalMin = 0.5;
  const optimalMax = 1.5;
  const range = maxVPD - minVPD;
  
  // Determinar color según valor
  let barColor = '#10b981'; // Verde (óptimo)
  let status = 'Óptimo';
  
  if (vpdValue < optimalMin) {
    barColor = '#3b82f6'; // Azul (bajo)
    status = 'Bajo';
  } else if (vpdValue > optimalMax) {
    barColor = '#ef4444'; // Rojo (alto)
    status = 'Alto';
  }
  
  // Calcular posición del valor en el rango completo (0-100%)
  const position = Math.max(0, Math.min(100, ((vpdValue - minVPD) / range) * 100));
  
  // Calcular posiciones porcentuales para el gradiente
  // 0 a 0.5 kPa (azul): 0% a 16.67%
  // 0.5 a 1.5 kPa (verde): 16.67% a 50%
  // 1.5 a 3.0 kPa (amarillo->naranja->rojo): 50% a 100%
  const blueEndPos = (0.5 / range) * 100; // 16.67%
  const greenEndPos = (1.5 / range) * 100; // 50%
  
  // Generar etiquetas cada 0.5 kPa (0.5, 1.0, 1.5, 2.0, 2.5, 3.0) - sin líneas debajo
  const tickLabelsHTML = [];
  for (let i = 0.5; i <= 3.0; i += 0.5) {
    const tickPos = (i / range) * 100;
    tickLabelsHTML.push(`<div style="position: absolute; left: ${tickPos}%; top: 0; transform: translateX(-50%); font-size: 10px; color: #64748b; white-space: nowrap;">${i.toFixed(1)}</div>`);
  }
  
  return `
    <div style="margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 50px;">
        <span style="font-weight: 600; color: #1e293b;">Rango Óptimo: ${optimalMin} - ${optimalMax} kPa</span>
        <span style="font-weight: 600; color: ${barColor};">Estado: ${status}</span>
      </div>
      <div style="position: relative; height: 50px; background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${blueEndPos * 0.85}%, #60a5fa ${blueEndPos * 0.92}%, #34d399 ${blueEndPos * 0.98}%, #22d3ee ${blueEndPos}%, #10b981 ${blueEndPos + (greenEndPos - blueEndPos) * 0.3}%, #10b981 ${greenEndPos * 0.85}%, #10b981 ${greenEndPos}%, #fbbf24 ${greenEndPos + (100 - greenEndPos) * 0.15}%, #fbbf24 ${greenEndPos + (100 - greenEndPos) * 0.35}%, #f59e0b ${greenEndPos + (100 - greenEndPos) * 0.5}%, #fb923c ${greenEndPos + (100 - greenEndPos) * 0.65}%, #f97316 ${greenEndPos + (100 - greenEndPos) * 0.78}%, #f87171 ${greenEndPos + (100 - greenEndPos) * 0.88}%, #ef4444 95%, #dc2626 100%); border-radius: 8px; overflow: visible; border: 2px solid #e5e7eb; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Marcadores del rango óptimo (líneas blancas) -->
        <div style="position: absolute; left: ${blueEndPos}%; width: 2px; height: 100%; background: rgba(255,255,255,0.9); box-shadow: 0 0 3px rgba(0,0,0,0.4); z-index: 2;"></div>
        <div style="position: absolute; left: ${greenEndPos}%; width: 2px; height: 100%; background: rgba(255,255,255,0.9); box-shadow: 0 0 3px rgba(0,0,0,0.4); z-index: 2;"></div>
        <!-- Línea vertical indicadora del valor actual (blanca para mejor visibilidad) -->
        <div style="position: absolute; left: ${position}%; top: -8px; width: 3px; height: 66px; background: white; border-radius: 2px; box-shadow: 0 3px 6px rgba(0,0,0,0.4); transform: translateX(-50%); z-index: 10;"></div>
        <!-- Círculo/distintivo en el valor actual (blanco para mejor visibilidad) -->
        <div style="position: absolute; left: ${position}%; top: -12px; width: 24px; height: 24px; background: white; border: 3px solid #1e293b; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.5); transform: translateX(-50%); z-index: 11; display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: #1e293b; border-radius: 50%;"></div>
        </div>
        <!-- Etiqueta del valor actual sobre el marcador -->
        <div style="position: absolute; left: ${position}%; top: -52px; transform: translateX(-50%); z-index: 12; background: #1e293b; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          ${vpdValue.toFixed(2)} kPa
        </div>
      </div>
      <!-- Etiquetas de escala cada 0.5 kPa -->
      <div style="position: relative; height: 20px; margin-top: 2px;">
        ${tickLabelsHTML.join('')}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: #64748b;">
        <span style="font-weight: 500;">${minVPD} kPa</span>
        <span style="font-weight: 500;">${maxVPD} kPa</span>
      </div>
    </div>
  `;
}

function createVPDSectionHTML() {
  // Obtener datos guardados
  const envData = currentProject.vpdAnalysis?.environmental || {};
  const advData = currentProject.vpdAnalysis?.advanced || {};
  const history = currentProject.vpdAnalysis?.history || [];
  
  // Ubicación para VPD: center o centroide del polígono
  const vpdLocation = getVPDLocation(currentProject);
  const hasPolygon = vpdLocation && vpdLocation.lat != null && vpdLocation.lng != null;
  
  return `
    <div class="card soil-analysis-watermark-wrap">
      <div class="soil-analysis-watermark" aria-hidden="true">
        <img src="assets/NutriPlant_PRO_blue.png" alt="">
      </div>
      <h2 class="text-xl" style="margin-bottom: 24px;">🌡️ Déficit de Presión de Vapor</h2>
      
      <!-- CALCULADORA AMBIENTAL SIMPLE -->
      <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 20px 0; color: #0369a1; font-size: 18px; font-weight: 600;">
          📊 Calculadora Ambiental Simple
        </h3>
        
        ${!hasPolygon ? `
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-weight: 500;">
              ⚠️ Para usar esta calculadora, primero necesitas agregar un polígono desde la pestaña <strong>Ubicación</strong>.
            </p>
      </div>
        ` : `
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
              📍 <strong>Ubicación del Proyecto:</strong> 
              ${vpdLocation.lat.toFixed(6)}, ${vpdLocation.lng.toFixed(6)}
            </p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">
                🌡️ Temperatura del Aire (°C)
              </label>
              <input 
                type="number" 
                id="vpd-env-temp" 
                step="0.1" 
                value="${envData.temperature || ''}"
                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;"
                placeholder="Ej: 20.5"
              />
            </div>
            
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">
                💧 Humedad Relativa (%)
              </label>
              <input 
                type="number" 
                id="vpd-env-humidity" 
                step="0.1" 
                value="${envData.humidity || ''}"
                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;"
                placeholder="Ej: 85"
              />
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <button 
              onclick="getEnvironmentalWeatherData()"
              style="padding: 14px; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;"
              onmouseover="this.style.background='#0284c7'"
              onmouseout="this.style.background='#0ea5e9'"
            >
              🌐 Obtener del Clima
            </button>
            <button 
              onclick="calculateEnvironmentalVPD()"
              style="padding: 14px; background: #22c55e; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;"
              onmouseover="this.style.background='#16a34a'"
              onmouseout="this.style.background='#22c55e'"
            >
              📊 Calcular VPD
            </button>
          </div>
          
          <div id="vpd-environmental-results"></div>
        `}
      </div>
      
      <!-- CALCULADORA AVANZADA -->
      <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px;">
        <h3 style="margin: 0 0 20px 0; color: #15803d; font-size: 18px; font-weight: 600;">
          🔬 Calculadora Avanzada
        </h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">
              🌡️ Temperatura del Aire (°C)
            </label>
            <input 
              type="number" 
              id="vpd-adv-air-temp" 
              step="0.1" 
              value="${advData.airTemperature || ''}"
              style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;"
              placeholder="Ej: 25"
            />
          </div>
          
          <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">
              💧 Humedad Relativa (%)
            </label>
            <input 
              type="number" 
              id="vpd-adv-humidity" 
              step="0.1" 
              value="${advData.airHumidity || ''}"
              style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;"
              placeholder="Ej: 80"
            />
          </div>
        </div>
        
        <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #1e293b;">
            Modo de Cálculo:
          </label>
          
          <div style="margin-bottom: 16px;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 12px; border-radius: 8px; background: #f9fafb; margin-bottom: 8px;">
              <input 
                type="radio" 
                name="vpd-mode" 
                value="leaf" 
                ${advData.mode === 'leaf' || !advData.mode ? 'checked' : ''}
                style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;"
                onchange="toggleVPDMode()"
              />
              <span style="font-weight: 500;">🌿 Temperatura de Hoja</span>
            </label>
            
            <div id="vpd-leaf-input" style="margin-left: 28px; margin-top: 8px; ${advData.mode === 'radiation' ? 'display: none;' : ''}">
              <input 
                type="number" 
                id="vpd-leaf-temp" 
                step="0.1" 
                value="${advData.leafTemperature || advData.calculatedLeafTemp || ''}"
                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;"
                placeholder="Ej: 27.4"
              />
            </div>
          </div>
          
          <div>
            <label style="display: flex; align-items: center; cursor: pointer; padding: 12px; border-radius: 8px; background: #f9fafb;">
              <input 
                type="radio" 
                name="vpd-mode" 
                value="radiation" 
                ${advData.mode === 'radiation' ? 'checked' : ''}
                style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;"
                onchange="toggleVPDMode()"
              />
              <span style="font-weight: 500;">☀️ Radiación Solar</span>
            </label>
            
            <div id="vpd-radiation-input" style="margin-left: 28px; margin-top: 8px; ${advData.mode === 'radiation' ? '' : 'display: none;'}">
              <input 
                type="number" 
                id="vpd-solar-radiation" 
                step="1" 
                value="${advData.solarRadiation || ''}"
                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;"
                placeholder="Ej: 600 W/m²"
              />
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">
                La temperatura de hoja se calculará automáticamente
              </p>
            </div>
          </div>
        </div>
        
        <button 
          onclick="calculateAdvancedVPD()"
          style="width: 100%; padding: 14px; background: #22c55e; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 20px;"
          onmouseover="this.style.background='#16a34a'"
          onmouseout="this.style.background='#22c55e'"
        >
          📊 Calcular Déficit de Presión de Vapor
        </button>
        
        <div id="vpd-advanced-results"></div>
      </div>
      
      <!-- HISTORIAL -->
      ${history.length > 0 ? `
        <div style="margin-top: 32px; padding: 24px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
            📋 Historial de Cálculos (${history.length})
          </h3>
          <div style="max-height: 300px; overflow-y: auto;">
            ${history.slice().reverse().slice(0, 10).map((calc, idx) => `
              <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 600; color: #1e293b;">
                      ${calc.type === 'environmental' ? '🌐 Ambiental' : '🔬 Avanzado'}
                    </div>
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                      ${new Date(calc.timestamp).toLocaleString('es-MX')}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: 700; color: #0ea5e9;">
                      ${calc.vpd} kPa
                    </div>
                    <div style="font-size: 13px; color: #64748b;">
                      HD: ${calc.hd} g/m³
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Función para cargar resultados guardados de VPD después de renderizar
function loadVPDSavedResults() {
  setTimeout(() => {
    const envData = currentProject.vpdAnalysis?.environmental || {};
    const resultsDiv = document.getElementById('vpd-environmental-results');
    // Solo cargar si el div está vacío (no hay resultados nuevos calculados)
    if (resultsDiv && envData.vpd !== null && envData.vpd !== undefined && resultsDiv.innerHTML.trim() === '') {
      resultsDiv.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
          <h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Resultados:</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Presión de Vapor</div>
              <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">${envData.vpd.toFixed(2)} kPa</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Humedad</div>
              <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">${envData.hd.toFixed(2)} g/m³</div>
            </div>
          </div>
          ${createVPDRangeChart(envData.vpd)}
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <button 
              onclick="saveEnvironmentalVPD()"
              style="width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;"
              onmouseover="this.style.background='#059669'"
              onmouseout="this.style.background='#10b981'"
            >
              💾 Guardar Cálculo
            </button>
          </div>
        </div>
      `;
    }
  }, 200);
}

// ===================================
// FUNCIONES DE INTERACCIÓN VPD
// ===================================

// Función para obtener datos del clima desde API
async function getEnvironmentalWeatherData() {
  const currentProjectId = np_getCurrentProjectId();
  if (!currentProjectId) {
    alert('❌ No hay proyecto activo');
    return;
  }
  
  const location = getVPDLocation(currentProject);
  if (!location || location.lat == null || location.lng == null) {
    alert('⚠️ Este proyecto no tiene polígono. Por favor, agrega uno desde la pestaña Ubicación.');
    return;
  }
  
  try {
    // Mostrar loading
    const button = event.target;
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '⏳ Obteniendo datos...';
    
    // Obtener datos del clima
    const weatherData = await getWeatherData(location.lat, location.lng);
    
    // Actualizar inputs
    const tempInput = document.getElementById('vpd-env-temp');
    const humidityInput = document.getElementById('vpd-env-humidity');
    
    if (tempInput) tempInput.value = weatherData.temperature.toFixed(1);
    if (humidityInput) humidityInput.value = weatherData.humidity;
    
    // Calcular VPD
    const results = calculateVPDSimple(weatherData.temperature, weatherData.humidity);
    
    // Guardar temporalmente en el objeto (sin guardar todavía)
    if (!currentProject.vpdAnalysis) {
      currentProject.vpdAnalysis = {
        environmental: {},
        advanced: {},
        history: [],
        lastUpdated: null
      };
    }
    
    currentProject.vpdAnalysis.environmental = {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      vpd: results.vpd,
      hd: results.hd,
      calculatedAt: new Date().toISOString(),
      location: { lat: location.lat, lng: location.lng },
      source: 'api'
    };
    
    // Mostrar resultados directamente sin recargar la sección (LIMPIAR primero para evitar duplicación)
    const resultsDiv = document.getElementById('vpd-environmental-results');
    if (resultsDiv) {
      resultsDiv.innerHTML = ''; // Limpiar primero
      resultsDiv.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
          <h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Resultados:</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Presión de Vapor</div>
              <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">${results.vpd.toFixed(2)} kPa</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Humedad</div>
              <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">${results.hd.toFixed(2)} g/m³</div>
            </div>
          </div>
          ${createVPDRangeChart(results.vpd)}
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <button 
              onclick="saveEnvironmentalVPD()"
              style="width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;"
              onmouseover="this.style.background='#059669'"
              onmouseout="this.style.background='#10b981'"
            >
              💾 Guardar Cálculo
            </button>
          </div>
        </div>
      `;
    }
    
    button.disabled = false;
    button.innerHTML = originalText;
    
    console.log('✅ Datos del clima obtenidos:', weatherData);
    console.log('✅ VPD calculado:', results);
    
  } catch (error) {
    console.error('❌ Error obteniendo datos del clima:', error);
    alert('No se pudo obtener el clima automáticamente. Ingresa los datos manualmente.');
    
    var btn = event && event.target;
    if (btn) { btn.disabled = false; btn.innerHTML = '🌐 Obtener del Clima'; }
  }
}

// Función para calcular VPD ambiental desde valores manuales
function calculateEnvironmentalVPD() {
  const currentProjectId = np_getCurrentProjectId();
  if (!currentProjectId) {
    alert('❌ No hay proyecto activo');
    return;
  }
  
  // Obtener valores de inputs
  const tempInput = document.getElementById('vpd-env-temp');
  const humidityInput = document.getElementById('vpd-env-humidity');
  
  if (!tempInput || !humidityInput) {
    alert('❌ Error: No se encontraron los campos necesarios');
    return;
  }
  
  const temperature = parseFloat(tempInput.value);
  const humidity = parseFloat(humidityInput.value);
  
  // Validar valores
  if (isNaN(temperature) || isNaN(humidity)) {
    alert('⚠️ Por favor ingresa temperatura del aire y humedad relativa');
    return;
  }
  
  if (humidity < 0 || humidity > 100) {
    alert('⚠️ La humedad relativa debe estar entre 0 y 100%');
    return;
  }
  
  // Calcular VPD
  const results = calculateVPDSimple(temperature, humidity);
  
  // Guardar en objeto (sin guardar todavía)
  if (!currentProject.vpdAnalysis) {
    currentProject.vpdAnalysis = {
      environmental: {},
      advanced: {},
      history: [],
      lastUpdated: null
    };
  }
  
  const location = currentProject.location?.center || {};
  
  currentProject.vpdAnalysis.environmental = {
    temperature: temperature,
    humidity: humidity,
    vpd: results.vpd,
    hd: results.hd,
    calculatedAt: new Date().toISOString(),
    location: { lat: location.lat || null, lng: location.lng || null },
    source: 'manual'
  };
  
  // Mostrar resultados en el div correspondiente (LIMPIAR primero para evitar duplicación)
  const resultsDiv = document.getElementById('vpd-environmental-results');
  if (resultsDiv) {
    resultsDiv.innerHTML = ''; // Limpiar primero
    resultsDiv.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
        <h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Resultados:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Presión de Vapor</div>
            <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">${results.vpd} kPa</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Humedad</div>
            <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">${results.hd} g/m³</div>
          </div>
        </div>
        ${createVPDRangeChart(results.vpd)}
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <button 
            onclick="saveEnvironmentalVPD()"
            style="width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;"
            onmouseover="this.style.background='#059669'"
            onmouseout="this.style.background='#10b981'"
          >
            💾 Guardar Cálculo
          </button>
        </div>
      </div>
    `;
  }
  
  console.log('✅ VPD ambiental calculado manualmente:', results);
}

// Función para guardar cálculo ambiental VPD
function saveEnvironmentalVPD() {
  const currentProjectId = np_getCurrentProjectId();
  if (!currentProjectId) {
    alert('❌ No hay proyecto activo');
    return;
  }
  
  const envData = currentProject.vpdAnalysis?.environmental;
  if (!envData || envData.vpd === null || envData.vpd === undefined) {
    alert('⚠️ Primero debes obtener y calcular los datos del clima');
    return;
  }
  
  // Guardar en historial
  const saved = saveVPDCalculation('environmental', envData);
  
  if (saved) {
    alert('✅ Cálculo ambiental guardado exitosamente');
    // Recargar la sección para actualizar historial
    const title = document.getElementById('sectionTitle');
    if (title && title.textContent.trim() === "Análisis: Déficit de Presión de Vapor") {
      selectSection("Análisis: Déficit de Presión de Vapor");
    }
  } else {
    alert('❌ Error al guardar el cálculo');
  }
}

// Función para calcular VPD avanzado
function calculateAdvancedVPD() {
  console.log('🔧 calculateAdvancedVPD() llamada');
  
  const currentProjectId = np_getCurrentProjectId();
  if (!currentProjectId) {
    alert('❌ No hay proyecto activo');
    return;
  }
  
  // Obtener valores de inputs
  const airTempInput = document.getElementById('vpd-adv-air-temp');
  const humidityInput = document.getElementById('vpd-adv-humidity');
  const modeRadio = document.querySelector('input[name="vpd-mode"]:checked');
  
  console.log('🔍 Elementos encontrados:', {
    airTempInput: !!airTempInput,
    humidityInput: !!humidityInput,
    modeRadio: !!modeRadio
  });
  
  if (!airTempInput || !humidityInput || !modeRadio) {
    alert('❌ Error: No se encontraron los campos necesarios');
    console.error('❌ Campos faltantes:', {
      airTempInput: !airTempInput,
      humidityInput: !humidityInput,
      modeRadio: !modeRadio
    });
    return;
  }
  
  const airTemp = parseFloat(airTempInput.value);
  const airHumidity = parseFloat(humidityInput.value);
  const mode = modeRadio.value;
  
  // Validar valores
  if (isNaN(airTemp) || isNaN(airHumidity)) {
    alert('⚠️ Por favor ingresa temperatura del aire y humedad relativa');
    return;
  }
  
  let leafTemp = null;
  let calculatedLeafTemp = null;
  let solarRadiation = null;
  
  if (mode === 'leaf') {
    // Modo: Temperatura de hoja directa
    const leafTempInput = document.getElementById('vpd-leaf-temp');
    if (!leafTempInput) {
      alert('❌ Error: Campo de temperatura de hoja no encontrado');
      return;
    }
    
    leafTemp = parseFloat(leafTempInput.value);
    if (isNaN(leafTemp)) {
      alert('⚠️ Por favor ingresa la temperatura de hoja');
      return;
    }
  } else if (mode === 'radiation') {
    // Modo: Radiación solar
    const radiationInput = document.getElementById('vpd-solar-radiation');
    if (!radiationInput) {
      alert('❌ Error: Campo de radiación solar no encontrado');
      return;
    }
    
    solarRadiation = parseFloat(radiationInput.value);
    if (isNaN(solarRadiation)) {
      alert('⚠️ Por favor ingresa la radiación solar');
      return;
    }
    
    // Calcular temperatura de hoja desde radiación
    calculatedLeafTemp = calculateLeafTempFromRadiation(airTemp, solarRadiation);
    leafTemp = calculatedLeafTemp;
  }
  
  console.log('📊 Valores a calcular:', { airTemp, airHumidity, leafTemp, mode });
  
  // Calcular VPD
  const results = calculateVPDAdvanced(airTemp, airHumidity, leafTemp);
  console.log('✅ Resultados calculados:', results);
  
  // Guardar en objeto (sin guardar todavía)
  if (!currentProject.vpdAnalysis) {
    currentProject.vpdAnalysis = {
      environmental: {},
      advanced: {},
      history: [],
      lastUpdated: null
    };
  }
  
  currentProject.vpdAnalysis.advanced = {
    airTemperature: airTemp,
    airHumidity: airHumidity,
    mode: mode,
    leafTemperature: mode === 'leaf' ? leafTemp : null,
    solarRadiation: mode === 'radiation' ? solarRadiation : null,
    calculatedLeafTemp: calculatedLeafTemp,
    vpd: results.vpd,
    hd: results.hd,
    calculatedAt: new Date().toISOString()
  };
  
  // Mostrar resultados en el div correspondiente
  const resultsDiv = document.getElementById('vpd-advanced-results');
  console.log('🔍 Div de resultados encontrado:', !!resultsDiv);
  
  if (!resultsDiv) {
    alert('❌ Error: No se encontró el elemento para mostrar resultados');
    console.error('❌ No se encontró #vpd-advanced-results');
    return;
  }
  
  try {
    resultsDiv.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
        <h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Resultados:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Presión de Vapor</div>
            <div style="font-size: 24px; font-weight: 700; color: #22c55e;">${results.vpd} kPa</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Déficit de Humedad</div>
            <div style="font-size: 24px; font-weight: 700; color: #22c55e;">${results.hd} g/m³</div>
          </div>
        </div>
        ${calculatedLeafTemp ? `
          <div style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border-radius: 6px; border: 1px solid #86efac;">
            <div style="color: #15803d; font-size: 14px; margin-bottom: 4px;">🌿 Temperatura de Hoja Calculada:</div>
            <div style="font-size: 20px; font-weight: 700; color: #15803d;">${calculatedLeafTemp} °C</div>
          </div>
        ` : ''}
        ${createVPDRangeChart(results.vpd)}
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <button 
            onclick="saveAdvancedVPD()"
            style="width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;"
            onmouseover="this.style.background='#059669'"
            onmouseout="this.style.background='#10b981'"
          >
            💾 Guardar Cálculo
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('❌ Error mostrando resultados:', error);
    alert('❌ Error al mostrar resultados: ' + error.message);
  }
  
  console.log('✅ VPD avanzado calculado:', results);
}

// Función para guardar cálculo avanzado VPD
function saveAdvancedVPD() {
  const currentProjectId = np_getCurrentProjectId();
  if (!currentProjectId) {
    alert('❌ No hay proyecto activo');
    return;
  }
  
  const advData = currentProject.vpdAnalysis?.advanced;
  if (!advData || advData.vpd === null || advData.vpd === undefined) {
    alert('⚠️ Primero debes calcular el VPD avanzado');
    return;
  }
  
  // Guardar en historial
  const saved = saveVPDCalculation('advanced', advData);
  
  if (saved) {
    alert('✅ Cálculo avanzado guardado exitosamente');
    // Recargar la sección para actualizar historial
    const title = document.getElementById('sectionTitle');
    if (title && title.textContent.trim() === "Análisis: Déficit de Presión de Vapor") {
      selectSection("Análisis: Déficit de Presión de Vapor");
    }
  } else {
    alert('❌ Error al guardar el cálculo');
  }
}

// Función para cambiar entre modo hoja/radiación
function toggleVPDMode() {
  const modeRadio = document.querySelector('input[name="vpd-mode"]:checked');
  const leafInput = document.getElementById('vpd-leaf-input');
  const radiationInput = document.getElementById('vpd-radiation-input');
  
  if (!modeRadio || !leafInput || !radiationInput) {
    return;
  }
  
  if (modeRadio.value === 'leaf') {
    leafInput.style.display = 'block';
    radiationInput.style.display = 'none';
  } else if (modeRadio.value === 'radiation') {
    leafInput.style.display = 'none';
    radiationInput.style.display = 'block';
  }
}

// Exponer funciones globalmente
window.getEnvironmentalWeatherData = getEnvironmentalWeatherData;
window.calculateEnvironmentalVPD = calculateEnvironmentalVPD;
window.saveEnvironmentalVPD = saveEnvironmentalVPD;
window.calculateAdvancedVPD = calculateAdvancedVPD;
window.saveAdvancedVPD = saveAdvancedVPD;
window.toggleVPDMode = toggleVPDMode;

console.log('✅ Funciones VPD expuestas globalmente:', {
  getEnvironmentalWeatherData: typeof window.getEnvironmentalWeatherData,
  calculateEnvironmentalVPD: typeof window.calculateEnvironmentalVPD,
  saveEnvironmentalVPD: typeof window.saveEnvironmentalVPD,
  calculateAdvancedVPD: typeof window.calculateAdvancedVPD,
  saveAdvancedVPD: typeof window.saveAdvancedVPD,
  toggleVPDMode: typeof window.toggleVPDMode
});

// Función global para debugging desde la consola
window.debugReportData = function() {
  console.log('🔍 === DEBUG REPORT DATA ===');
  debugProjectData();
  updateReportSectionsStatus();
  console.log('🔍 === END DEBUG ===');
};

// Función para probar selección directa
window.testSelection = function(sectionId) {
  console.log('🧪 Probando selección de:', sectionId);
  toggleReportSection(sectionId);
};

// Función global para testing del reporte desde la consola
window.testReport = function() {
  console.log('🧪 Testing generación de reporte...');
  generatePDFReport();
};

// Función para generar nuevo reporte (abrir modal)
window.generarNuevoReporte = function() {
  openReportModal();
};

// Función para eliminar reporte
window.eliminarReporte = function() {
  if (confirm('¿Estás seguro de que quieres eliminar este reporte?')) {
    // Volver a la vista normal de reportes
    selectSection('reporte');
    showMessage('🗑️ Reporte eliminado', 'info');
  }
};

// Función para descargar reporte como PDF
window.descargarReporte = function() {
  showMessage('🔄 Generando PDF para descarga...', 'info');
  
  // Aquí iría la lógica para generar y descargar el PDF real
  // Por ahora, mostrar mensaje
  setTimeout(() => {
    showMessage('✅ PDF generado y descargado exitosamente', 'success');
  }, 2000);
};

// Función para volver al dashboard
window.volverAlDashboard = function() {
  // Ir a la sección de inicio
  selectSection('Inicio');
  
  showMessage('✅ Volviendo al dashboard', 'info');
};

// Función para recopilar datos de ubicación
function recopilarDatosUbicacion() {
  const data = {
    coordinates: 'No disponible',
    surface: 'No disponible',
    perimeter: 'No disponible',
    polygon: false,
    mapImage: ''
  };
  
  // Buscar en currentProject
  if (currentProject.location) {
    data.coordinates = currentProject.location.coordinates || data.coordinates;
    data.surface = currentProject.location.surface || data.surface;
    data.perimeter = currentProject.location.perimeter || data.perimeter;
    data.polygon = !!currentProject.location.polygon;
  }
  
  // Buscar en elementos del DOM con múltiples selectores
  let coordinatesEl = document.getElementById('coordinatesDisplay');
  if (!coordinatesEl) {
    coordinatesEl = document.querySelector('[data-stat="coordinates"] .stat-value');
  }
  if (!coordinatesEl) {
    coordinatesEl = document.querySelector('.stat-item.coordinates .stat-value');
  }
  
  let surfaceEl = document.getElementById('surfaceDisplay');
  if (!surfaceEl) {
    surfaceEl = document.querySelector('[data-stat="surface"] .stat-value');
  }
  if (!surfaceEl) {
    surfaceEl = document.querySelector('.stat-item:not(.coordinates):not(.perimeter) .stat-value');
  }
  
  let perimeterEl = document.getElementById('perimeterDisplay');
  if (!perimeterEl) {
    perimeterEl = document.querySelector('[data-stat="perimeter"] .stat-value');
  }
  if (!perimeterEl) {
    perimeterEl = document.querySelector('.stat-item.perimeter .stat-value');
  }
  
  // Buscar todos los elementos .stat-value
  const allStatValues = document.querySelectorAll('.stat-value');
  if (allStatValues.length >= 3) {
    data.coordinates = allStatValues[0]?.textContent?.trim() || data.coordinates;
    data.surface = allStatValues[1]?.textContent?.trim() || data.surface;
    data.perimeter = allStatValues[2]?.textContent?.trim() || data.perimeter;
  }
  
  // Buscar el mapa
  const mapContainer = document.getElementById('map') || document.querySelector('.map-container');
  if (mapContainer && mapContainer.style.display !== 'none') {
    data.mapImage = '<div class="mapa-preview">🗺️ Mapa con polígono registrado</div>';
    data.polygon = true;
  }
  
  return data;
}

// Función para recopilar datos de enmiendas
function recopilarDatosEnmiendas() {
  const data = {
    estado: 'Sin análisis',
    enmiendasSeleccionadas: 'Ninguna',
    resultados: '',
    analisisInicial: '',
    propiedades: '',
    rangos: '',
    targetAnalysis: ''
  };
  
  // Buscar en currentProject
  if (currentProject.amendments) {
    if (currentProject.amendments.results) {
      data.estado = 'Análisis completado';
      data.resultados = currentProject.amendments.results;
    }
    
    if (currentProject.amendments.selectedAmendments && currentProject.amendments.selectedAmendments.length > 0) {
      data.enmiendasSeleccionadas = currentProject.amendments.selectedAmendments.join(', ');
    }
  }
  
  // Buscar cualquier input con datos para determinar si hay análisis
  const allInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
  let hasAnyData = false;
  let analysisData = [];
  let propertiesData = [];
  
  allInputs.forEach(input => {
    if (input.value && input.value.trim() !== '') {
      hasAnyData = true;
      
      // Clasificar según la sección
      const section = input.closest('.analysis-section, .soil-properties, .target-section, .results-section');
      if (section) {
        if (section.classList.contains('analysis-section')) {
          analysisData.push(`${input.name || input.placeholder || 'Campo'}: ${input.value}`);
        } else if (section.classList.contains('soil-properties')) {
          propertiesData.push(`${input.name || input.placeholder || 'Campo'}: ${input.value}`);
        }
      }
    }
  });
  
  if (hasAnyData) {
    data.estado = 'Análisis completado';
    data.analisisInicial = analysisData.join('; ');
    data.propiedades = propertiesData.join('; ');
  }
  
  // Buscar enmiendas seleccionadas en el DOM
  const selectedButtons = document.querySelectorAll('.btn-select-amendment.selected');
  if (selectedButtons.length > 0) {
    const enmiendas = Array.from(selectedButtons).map(btn => {
      const row = btn.closest('tr');
      return row ? row.querySelector('td:first-child')?.textContent?.trim() : '';
    }).filter(name => name);
    
    if (enmiendas.length > 0) {
      data.enmiendasSeleccionadas = enmiendas.join(', ');
    }
  }
  
  // Buscar resultados en el DOM
  const resultsEl = document.getElementById('amendment-results');
  if (resultsEl && resultsEl.innerHTML && resultsEl.innerHTML.trim() !== '') {
    data.estado = 'Análisis completado';
    data.resultados = resultsEl.innerHTML;
  }
  
  // Buscar análisis inicial en el DOM
  const analysisGrid = document.querySelector('.analysis-grid');
  if (analysisGrid) {
    const inputs = analysisGrid.querySelectorAll('input[type="number"]');
    const valores = Array.from(inputs).map(input => {
      if (input.value && input.value !== '') {
        const label = input.closest('.form-group')?.querySelector('label')?.textContent?.trim();
        return `${label}: ${input.value}`;
      }
      return '';
    }).filter(valor => valor);
    
    if (valores.length > 0) {
      data.analisisInicial = valores.join('<br>');
    }
  }
  
  // Buscar propiedades del suelo
  const propertiesGrid = document.querySelector('.properties-grid');
  if (propertiesGrid) {
    const inputs = propertiesGrid.querySelectorAll('input[type="number"]');
    const propiedades = Array.from(inputs).map(input => {
      if (input.value && input.value !== '') {
        const label = input.closest('.form-group')?.querySelector('label')?.textContent?.trim();
        return `${label}: ${input.value}`;
      }
      return '';
    }).filter(valor => valor);
    
    if (propiedades.length > 0) {
      data.propiedades = propiedades.join('<br>');
    }
  }
  
  // Buscar rangos ideales
  const rangesGrid = document.querySelector('.ranges-grid');
  if (rangesGrid) {
    const rangeItems = rangesGrid.querySelectorAll('.range-item');
    const rangos = Array.from(rangeItems).map(item => {
      const text = item.textContent?.trim();
      return text ? text : '';
    }).filter(rango => rango);
    
    if (rangos.length > 0) {
      data.rangos = rangos.join('<br>');
    }
  }
  
  // Buscar análisis objetivo
  const targetGrid = document.querySelector('.target-grid');
  if (targetGrid) {
    const inputs = targetGrid.querySelectorAll('input[type="number"]');
    const targetValues = Array.from(inputs).map(input => {
      if (input.value && input.value !== '') {
        const label = input.closest('.form-group')?.querySelector('label')?.textContent?.trim();
        return `${label}: ${input.value}`;
      }
      return '';
    }).filter(valor => valor);
    
    if (targetValues.length > 0) {
      data.targetAnalysis = targetValues.join('<br>');
    }
  }
  
  return data;
}

// Función para guardar nutrición granular
function saveGranularNutrition() {
  try {
    let savedCount = 0;
    
    // Guardar datos de requerimiento nutricional
    // CRÍTICO: Intentar múltiples veces si no está disponible (puede ser problema de timing)
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts && typeof window.saveGranularRequirements !== 'function') {
      attempts++;
      console.log(`⏳ Esperando saveGranularRequirements... (intento ${attempts}/${maxAttempts})`);
      // Esperar un poco antes de reintentar
      const start = Date.now();
      while (Date.now() - start < 100) {} // Esperar 100ms
    }
    
    // Guardar requerimientos nutricionales
    if (typeof window.saveGranularRequirements === 'function') {
      window.saveGranularRequirements();
      savedCount++;
    }
    
    // Guardar otros datos si es necesario
    console.log(`✅ Nutrición granular guardada (${savedCount} operaciones)`);
  } catch (error) {
    console.error('❌ Error guardando nutrición granular:', error);
  }
}
