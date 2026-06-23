/* ===== MAPA DE UBICACIÓN NUTRIPLANT PRO ===== */

class NutriPlantMap {
  constructor() {
    this.map = null;
    this.drawingManager = null;
    this.polygon = null;
    this.savedPolygon = null;
    this.userLocationMarker = null;
    this.polygonPath = [];
    this.isDrawing = false;
    this.area = 0;
    this.perimeter = 0;
    this.coordinates = [];
    
    // CRÍTICO: Limpiar cualquier instancia previa en el mapa
    this.forceClearAllPolygons();
    
    this.init();
  }
  
  // Función para limpiar FORZADAMENTE todos los polígonos
  forceClearAllPolygons() {
    console.log('🧹 Forzando limpieza de polígonos...');
    
    // Si hay un mapa anterior, limpiarlo
    if (this.map) {
      // Limpiar todos los overlays del mapa
      this.map.overlayMapTypes.clear();
    }
    
    // Limpiar referencias
    this.polygon = null;
    this.savedPolygon = null;
    this.polygonPath = [];
    this.coordinates = [];
    this.area = 0;
    this.perimeter = 0;
  }

  init() {
    // Esperar a que se cargue la API de Google Maps
    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      this.loadGoogleMapsAPI();
    } else {
      this.initializeMap();
    }
  }

  loadGoogleMapsAPI() {
    // IMPORTANTE: Reemplaza 'YOUR_GOOGLE_MAPS_API_KEY' con tu API Key real
    const API_KEY = 'AIzaSyBWjzVfDemtQqq0Cy-Tr0VaHinV2bdlN1k'; // ← API Key de Google Maps configurada
    
    // Si no hay API Key configurada, mostrar mapa de prueba
    if (API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      this.showDemoMap();
      return;
    }

    if (window.google && window.google.maps && window.google.maps.Map) {
      this.initializeMap();
      return;
    }

    window.initNutriPlantMap = () => this.initializeMap();

    if (window.__nutriPlantGoogleMapsLoading) {
      console.log('🗺️ Google Maps ya está cargando; esperando callback...');
      return;
    }

    window.__nutriPlantGoogleMapsLoading = true;

    window.gm_authFailure = () => {
      console.error('❌ Google Maps rechazó la clave o el dominio actual');
      window.__nutriPlantGoogleMapsLoading = false;
      this.showMapUnavailable('Google Maps no autorizó este dominio. Revisa la API Key y las restricciones de referencia en Google Cloud.');
    };
    
    // Cargar la API de Google Maps
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=drawing,geometry&callback=initNutriPlantMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('❌ No se pudo cargar Google Maps');
      window.__nutriPlantGoogleMapsLoading = false;
      this.showMapUnavailable('No se pudo cargar Google Maps. Revisa la conexión o la configuración de la API Key.');
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (!this.map && (!window.google || !window.google.maps || !window.google.maps.Map)) {
        window.__nutriPlantGoogleMapsLoading = false;
        this.showMapUnavailable('Google Maps tardó demasiado en responder. Recarga la página e inténtalo de nuevo.');
      }
    }, 12000);
  }

  showMapUnavailable(message) {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    mapElement.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        min-height: 360px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
        color: #0f172a;
        text-align: center;
        border-radius: 12px;
      ">
        <div style="max-width: 520px; background: rgba(255,255,255,0.92); border: 1px solid #dbeafe; border-radius: 16px; padding: 22px; box-shadow: 0 12px 28px rgba(15,23,42,0.10);">
          <div style="font-size: 36px; margin-bottom: 10px;">🗺️</div>
          <h3 style="margin: 0 0 8px; color: #1e40af;">Mapa no disponible</h3>
          <p style="margin: 0; color: #475569; line-height: 1.45;">${message}</p>
        </div>
      </div>
    `;
  }

  showDemoMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Crear mapa de demostración
    mapElement.innerHTML = `
      <div style="
        width: 100%; 
        height: 100%; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
        position: relative;
        overflow: hidden;
      ">
        <div style="
          background: rgba(255,255,255,0.1);
          padding: 30px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          max-width: 400px;
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">🗺️</div>
          <h3 style="margin: 0 0 15px 0; font-size: 24px;">Mapa de Demostración</h3>
          <p style="margin: 0 0 20px 0; opacity: 0.9;">
            Para usar el mapa real, configura tu API Key de Google Maps
          </p>
          <div style="
            background: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 12px;
            margin-bottom: 20px;
          ">
            <strong>Pasos:</strong><br>
            1. Ve a Google Cloud Console<br>
            2. Habilita Maps JavaScript API<br>
            3. Crea una API Key<br>
            4. Reemplaza en map.js
          </div>
          <button onclick="this.parentElement.parentElement.innerHTML='<div style=\'padding:20px;text-align:center;\'><h3>🎯 Haz clic para trazar tu parcela</h3><p>Simulación de dibujo de polígono</p></div>'" 
                  style="
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                  ">
            Probar Funcionalidad
          </button>
        </div>
        
        <!-- Efectos visuales de fondo -->
        <div style="
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          animation: move 20s linear infinite;
        "></div>
      </div>
      
      <style>
        @keyframes move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(20px, 20px); }
        }
      </style>
    `;

    // Configurar eventos de demostración
    this.setupDemoEvents();
  }

  setupDemoEvents() {
    // Las funciones reales se configuran en setupMapEvents()
    // Esta función se mantiene para compatibilidad pero no interfiere
  }

  initializeMap() {
    // Verificar si el elemento del mapa existe
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.warn('⚠️ initializeMap: Elemento #map no encontrado');
      return;
    }
    
    // 🚀 CRÍTICO: NO limpiar automáticamente aquí - solo inicializar el mapa
    // El polígono se cargará DESPUÉS de que el mapa esté listo
    console.log('🗺️ Inicializando mapa de Google Maps...');
    window.__nutriPlantGoogleMapsLoading = false;
    
    // NO limpiar variables aquí - se limpiarán solo si no hay polígono guardado

    // Configuración inicial del mapa
    const mapOptions = {
      zoom: 14, // Cambiado de 15 a 14 para vista más amplia
      center: { lat: 19.4326, lng: -99.1332 }, // Ciudad de México por defecto
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      // Abajo-derecha en Windows + overflow:hidden del contenedor recortaba el botón "−";
      // centro-izquierda evita el corte y el solape con el botón flotante de chat.
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_CENTER
      },
      styles: [
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#ffffff' }]
        }
      ]
    };

    // Crear el mapa
    this.map = new google.maps.Map(mapElement, mapOptions);

    this.refreshMapView('init');
    [120, 450, 1000, 1800].forEach((delay) => {
      setTimeout(() => this.refreshMapView('delayed-' + delay), delay);
    });

    // Configurar el Drawing Manager
    this.setupDrawingManager();

    // Configurar eventos
    this.setupEventListeners();

    // Intentar obtener la ubicación del usuario
    this.getCurrentLocation();

    // 🚀 CRÍTICO: NO limpiar ni cargar datos automáticamente aquí
    // El polígono se cargará desde initLocationMap() DESPUÉS de que el mapa esté completamente inicializado
    // Solo limpiar si NO hay proyecto (se verificará en loadProjectLocation)
    console.log('✅ Mapa de Google Maps inicializado - esperando carga de polígono desde initLocationMap()');
  }

  refreshMapView(reason = 'manual') {
    if (!this.map || typeof google === 'undefined' || !google.maps) return;

    const mapDiv = this.map.getDiv && this.map.getDiv();
    if (!mapDiv) return;

    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';

    if (mapDiv.offsetHeight < 240) {
      mapDiv.style.minHeight = '520px';
    }

    const currentCenter = this.map.getCenter();
    google.maps.event.trigger(this.map, 'resize');
    if (currentCenter) this.map.setCenter(currentCenter);

    console.log('🗺️ Refrescando vista del mapa:', reason, {
      width: mapDiv.offsetWidth,
      height: mapDiv.offsetHeight
    });
  }

  setupDrawingManager() {
    const drawingManagerOptions = {
      drawingMode: null,
      drawingControl: false, // 🚀 CRÍTICO: Deshabilitar controles de dibujo (solo usar clics en mapa)
      polygonOptions: {
        fillColor: '#2563eb',
        fillOpacity: 0.3,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        clickable: false,
        editable: true,
        draggable: false
      }
    };

    this.drawingManager = new google.maps.drawing.DrawingManager(drawingManagerOptions);
    this.drawingManager.setMap(this.map);

    // 🚀 CRÍTICO: Evento cuando se completa el dibujo con DrawingManager
    // Esto puede pasar si el usuario usa herramientas de dibujo externas
    google.maps.event.addListener(this.drawingManager, 'polygoncomplete', (polygon) => {
      console.log('⚠️ DrawingManager creó un polígono - asegurando que sea el único...');
      // 🚀 CRÍTICO: Eliminar TODOS los polígonos antes de agregar este
      this.forceRemoveAllPolygons();
      this.handlePolygonComplete(polygon);
    });
  }

  handlePolygonComplete(polygon) {
    console.log('🔍 handlePolygonComplete ejecutándose...');
    console.log('🚀 CRÍTICO: Asegurando que SOLO hay UN polígono por proyecto');
    
    // 🚀 CRÍTICO: SIEMPRE eliminar TODOS los polígonos antes de agregar el nuevo
    // Esto asegura que SOLO haya UN polígono visible
    console.log('🧹 Eliminando TODOS los polígonos existentes antes de agregar el nuevo...');
    
    // Eliminar polígono guardado
    if (this.savedPolygon) {
      google.maps.event.clearListeners(this.savedPolygon);
      if (this.savedPolygon.getPath) {
        google.maps.event.clearListeners(this.savedPolygon.getPath());
      }
      this.savedPolygon.setMap(null);
      this.savedPolygon = null;
    }
    
    // Eliminar polígono actual (si no es el que acabamos de crear)
    if (this.polygon && this.polygon !== polygon) {
      google.maps.event.clearListeners(this.polygon);
      if (this.polygon.getPath) {
        google.maps.event.clearListeners(this.polygon.getPath());
      }
      this.polygon.setMap(null);
      this.polygon = null;
    }
    
    // 🚀 CRÍTICO: Buscar y eliminar cualquier otro polígono en el mapa
    // (por si hay polígonos que no están rastreados en this.polygon o this.savedPolygon)
    if (this.map) {
      // Limpiar overlays
      if (this.map.overlayMapTypes) {
        this.map.overlayMapTypes.clear();
      }
    }
    
    console.log('✅ Aplicando nuevo polígono (único en el mapa)...');
    
    // Aplicar el nuevo polígono (ahora es el ÚNICO)
    this.polygon = polygon;
    this.calculatePolygonData();
    this.showPolygonCompleteMessage();
    
    this.showMessage('✅ Polígono único creado - Puedes editarlo o guardar', 'success');
  }

  setupEventListeners() {
    // Evento de clic en el mapa para dibujar
    // 🚀 CRÍTICO: NO eliminar polígono guardado automáticamente
    // El usuario debe usar el botón "Limpiar" para eliminar el polígono guardado
    this.map.addListener('click', (event) => {
      if (!this.isDrawing) {
        // 🚀 CRÍTICO: Verificar si hay polígono guardado
        // Si hay uno, NO permitir dibujar nuevo - el usuario debe limpiarlo primero
        const hasPolygonOnMap = (this.polygon && this.polygon.getMap && this.polygon.getMap() === this.map) || 
                                (this.savedPolygon && this.savedPolygon.getMap && this.savedPolygon.getMap() === this.map);
        
        if (hasPolygonOnMap) {
          // Hay un polígono guardado - NO permitir dibujar nuevo
          // Mostrar mensaje al usuario
          this.showMessage('⚠️ Ya hay un polígono guardado. Usa el botón "Limpiar" para eliminarlo antes de dibujar uno nuevo.', 'warning');
          this.updateInstructions('⚠️ Ya hay un polígono guardado. Usa el botón "Limpiar" para eliminarlo.');
          return; // NO permitir dibujar
        }
        
        // No hay polígono guardado - permitir dibujar
        this.startDrawing(event.latLng);
      } else {
        this.addPoint(event.latLng);
      }
    });

    // Evento de doble clic para cerrar polígono
    this.map.addListener('dblclick', (event) => {
      if (this.isDrawing && this.polygonPath.length >= 3) {
        this.finishDrawing();
      }
    });

    this.bindLocationControlButtons();
  }

  /**
   * Re-vincula botones de Ubicación (el DOM se recrea al cambiar de sección).
   * Usa onclick para evitar listeners duplicados en el mismo nodo.
   */
  bindLocationControlButtons() {
    const self = this;
    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.onclick = (e) => {
        if (e) e.preventDefault();
        handler(e);
      };
      return true;
    };

    bind('clearPolygon', () => self.clearPolygon());
    bind('centerOnPolygon', (e) => {
      if (typeof window.np_centerOnPolygonFromUi === 'function') {
        window.np_centerOnPolygonFromUi(e);
      } else {
        self.centerOnPolygon();
      }
    });
    bind('centerOnUserLocation', (e) => {
      if (typeof window.np_centerOnUserLocationFromUi === 'function') {
        window.np_centerOnUserLocationFromUi(e);
      } else {
        self.centerOnUserLocation();
      }
    });
    bind('saveLocation', () => self.saveLocation());

    const toggleCoordsBtn = document.getElementById('toggleCoordinateInput');
    const coordsPanel = document.getElementById('coordinateInputPanel');
    const coordsInput = document.getElementById('polygonCoordinatesInput');
    const drawFromCoordsBtn = document.getElementById('drawPolygonFromCoordinates');
    const clearCoordsInputBtn = document.getElementById('clearCoordinateInput');

    if (toggleCoordsBtn && coordsPanel) {
      toggleCoordsBtn.onclick = (e) => {
        if (e) e.preventDefault();
        const opening = coordsPanel.style.display === 'none';
        coordsPanel.style.display = opening ? 'block' : 'none';
        if (opening && coordsInput) coordsInput.focus();
      };
    }
    if (clearCoordsInputBtn && coordsInput) {
      clearCoordsInputBtn.onclick = (e) => {
        if (e) e.preventDefault();
        coordsInput.value = '';
        coordsInput.focus();
      };
    }
    if (drawFromCoordsBtn && coordsInput) {
      drawFromCoordsBtn.onclick = (e) => {
        if (e) e.preventDefault();
        self.drawPolygonFromCoordinatesText(coordsInput.value);
      };
    }
  }

  parseCoordinatesText(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return { points: [], error: 'Pega tus coordenadas primero.' };
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const points = [];
    for (let i = 0; i < lines.length; i++) {
      const src = lines[i].replace(/\t+/g, ' ').trim();
      const parts = this.splitCoordinatePair(src);
      if (!parts || parts.length < 2) {
        return { points: [], error: `Línea ${i + 1} inválida. Usa: lat,lng` };
      }
      const lat = this.parseCoordinateComponent(parts[0], 'lat');
      const lng = this.parseCoordinateComponent(parts[1], 'lng');
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { points: [], error: `Línea ${i + 1} inválida. Formato decimal o grados/min/seg.` };
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { points: [], error: `Línea ${i + 1} fuera de rango. Verifica lat/lng.` };
      }
      points.push(new google.maps.LatLng(lat, lng));
    }
    if (points.length < 3) return { points: [], error: 'Se requieren al menos 3 puntos.' };
    return { points, error: '' };
  }

  splitCoordinatePair(line) {
    const src = String(line || '').trim();
    if (!src) return null;
    if (src.includes(';')) {
      const parts = src.split(';').map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 2) return [parts[0], parts[1]];
    }
    if (src.includes(',')) {
      const parts = src.split(',').map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 2) return [parts[0], parts[1]];
    }
    const nsEw = src.match(/(.+?[NS])\s+(.+?[EW])$/i) || src.match(/(.+?[EW])\s+(.+?[NS])$/i);
    if (nsEw) return [nsEw[1].trim(), nsEw[2].trim()];
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts[1]];
    return null;
  }

  parseCoordinateComponent(rawValue, axis) {
    const raw = String(rawValue || '').trim();
    if (!raw) return NaN;
    const upper = raw.toUpperCase().replace(/º/g, '°');
    const hasSouth = /S/.test(upper);
    const hasWest = /W|O/.test(upper); // O = Oeste
    const hasNorth = /N/.test(upper);
    const hasEast = /E/.test(upper);
    const hasSignMinus = /^\s*-/.test(upper);
    const cleaned = upper.replace(/[NSEWO]/g, '').trim();

    // Decimal simple
    if (/^[+-]?\d+(?:\.\d+)?$/.test(cleaned)) {
      let value = parseFloat(cleaned);
      if ((axis === 'lat' && (hasSouth || hasNorth)) || (axis === 'lng' && (hasWest || hasEast))) {
        const signed = (hasSouth || hasWest) ? -Math.abs(value) : Math.abs(value);
        value = signed;
      }
      return value;
    }

    // DMS: grados, minutos, segundos
    const nums = cleaned.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || !nums.length) return NaN;
    const deg = Math.abs(parseFloat(nums[0] || '0'));
    const min = Math.abs(parseFloat(nums[1] || '0'));
    const sec = Math.abs(parseFloat(nums[2] || '0'));
    if (min >= 60 || sec >= 60) return NaN;
    let value = deg + (min / 60) + (sec / 3600);
    let sign = hasSignMinus ? -1 : 1;
    if ((axis === 'lat' && (hasSouth || hasNorth)) || (axis === 'lng' && (hasWest || hasEast))) {
      sign = (hasSouth || hasWest) ? -1 : 1;
    }
    return value * sign;
  }

  drawPolygonFromCoordinatesText(rawText) {
    const parsed = this.parseCoordinatesText(rawText);
    if (parsed.error) {
      this.showMessage(`⚠️ ${parsed.error}`, 'warning');
      return;
    }
    this.clearAllPolygons();
    this.polygon = null;
    this.savedPolygon = null;
    this.clearTempMarkers();
    this.isDrawing = false;

    const polygonPath = parsed.points;
    this.polygon = new google.maps.Polygon({
      paths: polygonPath,
      fillColor: '#2563eb',
      fillOpacity: 0.3,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      editable: true,
      draggable: false
    });
    this.polygon.setMap(this.map);
    this.savedPolygon = this.polygon;
    this.polygonPath = polygonPath;
    this.coordinates = polygonPath.map((p) => [p.lat(), p.lng()]);
    this.addPolygonEditListeners();
    this.calculateAreaAndPerimeter();
    this.centerOnPolygon();
    this.updateInstructions('✅ Polígono trazado desde coordenadas. Puedes editarlo o guardar.');
    this.showMessage(`✅ Polígono creado con ${polygonPath.length} puntos desde coordenadas`, 'success');
  }

  startDrawing(latLng) {
    // 🚀 CRÍTICO: NO eliminar polígono guardado automáticamente
    // Si llegamos aquí, es porque NO hay polígono guardado visible
    // (ya se validó en setupEventListeners)
    console.log('🚀 Iniciando dibujo de nuevo polígono...');
    
    // 🚀 CRÍTICO: Asegurar que NO hay polígonos en el mapa antes de empezar
    // Esto previene que queden polígonos residuales
    this.forceRemoveAllPolygons();
    
    // Resetear estado de dibujo
    this.isDrawing = true;
    this.polygonPath = [latLng];
    this.coordinates = [[latLng.lat(), latLng.lng()]];
    
    // Limpiar marcadores temporales previos
    this.clearTempMarkers();
    
    // Crear marcador temporal para el primer punto
    this.createTempMarker(latLng);
    
    this.updateInstructions('🔄 Continúa haciendo clic para trazar tu parcela');
  }

  addPoint(latLng) {
    this.polygonPath.push(latLng);
    this.coordinates.push([latLng.lat(), latLng.lng()]);
    
    // Crear marcador temporal
    this.createTempMarker(latLng);
    
    // Actualizar línea temporal
    this.updateTempPolyline();
    
    // Verificar si está cerca del punto inicial para cerrar automáticamente
    if (this.polygonPath.length >= 3) {
      const firstPoint = this.polygonPath[0];
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        latLng, 
        firstPoint
      );
      
      // Si está a menos de 50 metros del punto inicial, cerrar automáticamente
      if (distance < 50) {
        this.finishDrawing();
        return;
      }
    }
    
    this.updateInstructions(`📍 Punto ${this.polygonPath.length} - Haz clic cerca del inicio para cerrar o doble clic`);
    
    // Mostrar botón de cerrar si hay al menos 3 puntos
    if (this.polygonPath.length >= 3) {
      this.showCloseButton();
    }
  }

  finishDrawing() {
    if (this.polygonPath.length < 3) return;

    this.isDrawing = false;
    
    // 🚀 CRÍTICO: Antes de crear el polígono final, asegurar que NO hay otros polígonos
    // Usar clearAllPolygons para eliminar TODOS los polígonos (incluso los no rastreados)
    this.clearAllPolygons();
    
    // 🚀 CRÍTICO: Asegurar que las variables están limpias
    this.polygon = null;
    this.savedPolygon = null;
    
    // 🚀 Crear polígono final (ahora es el ÚNICO)
    this.polygon = new google.maps.Polygon({
      paths: this.polygonPath,
      fillColor: '#2563eb',
      fillOpacity: 0.3,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      editable: true,
      draggable: false
    });

    this.polygon.setMap(this.map);

    // Agregar event listeners para edición del polígono
    this.addPolygonEditListeners();

    // Calcular área y perímetro
    this.calculateAreaAndPerimeter();

    // Limpiar marcadores temporales
    this.clearTempMarkers();

    this.updateInstructions('✅ Polígono completado - Puedes editarlo o guardar');
    console.log('✅ Nuevo polígono creado - es el ÚNICO en el mapa');
  }

  addPolygonEditListeners() {
    if (!this.polygon) return;

    // Evento cuando se edita el polígono (se mueve un vértice)
    google.maps.event.addListener(this.polygon.getPath(), 'set_at', (index) => {
      console.log('🔄 Vértice editado en índice:', index);
      this.onPolygonEdited();
    });

    // Evento cuando se inserta un nuevo vértice
    google.maps.event.addListener(this.polygon.getPath(), 'insert_at', (index) => {
      console.log('➕ Nuevo vértice insertado en índice:', index);
      this.onPolygonEdited();
    });

    // Evento cuando se elimina un vértice
    google.maps.event.addListener(this.polygon.getPath(), 'remove_at', (index) => {
      console.log('➖ Vértice eliminado en índice:', index);
      this.onPolygonEdited();
    });
  }

  onPolygonEdited() {
    console.log('🔄 Polígono editado - Recalculando datos...');
    
    // Actualizar el path del polígono
    this.polygonPath = this.polygon.getPath().getArray();
    this.coordinates = this.polygonPath.map(point => [point.lat(), point.lng()]);
    
    // Recalcular área y perímetro
    this.calculateAreaAndPerimeter();
    
    // Mostrar mensaje de confirmación
    this.updateInstructions('🔄 Polígono editado - Los datos se han actualizado automáticamente');
    
    // Mostrar mensaje temporal de confirmación
    this.showMessage('✅ Datos del polígono actualizados automáticamente', 'success');
  }

  createTempMarker(latLng) {
    const marker = new google.maps.Marker({
      position: latLng,
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    if (!this.tempMarkers) this.tempMarkers = [];
    this.tempMarkers.push(marker);
  }

  updateTempPolyline() {
    if (this.tempPolyline) {
      this.tempPolyline.setMap(null);
    }

    this.tempPolyline = new google.maps.Polyline({
      path: this.polygonPath,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 2
    });

    this.tempPolyline.setMap(this.map);
  }

  clearTempMarkers() {
    console.log('🗑️ Limpiando marcadores temporales...');
    
    if (this.tempMarkers) {
      this.tempMarkers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      this.tempMarkers = [];
    }
    
    if (this.tempPolyline) {
      if (this.tempPolyline.setMap) {
      this.tempPolyline.setMap(null);
      }
      this.tempPolyline = null;
    }
    
    // Limpiar cualquier otro elemento temporal que pueda quedar
    if (this.tempElements) {
      this.tempElements.forEach(element => {
        if (element && element.setMap) {
          element.setMap(null);
        }
      });
      this.tempElements = [];
    }
  }

  calculateAreaAndPerimeter() {
    if (!this.polygon) return;

    // Calcular área usando la API de geometría de Google Maps
    const area = google.maps.geometry.spherical.computeArea(this.polygonPath);
    this.area = area; // en metros cuadrados

    // Calcular perímetro
    let perimeter = 0;
    for (let i = 0; i < this.polygonPath.length; i++) {
      const j = (i + 1) % this.polygonPath.length;
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        this.polygonPath[i],
        this.polygonPath[j]
      );
      perimeter += distance;
    }
    this.perimeter = perimeter;

    // Actualizar la interfaz
    this.updateDisplay();
  }

  updateDisplay() {
    // 🚀 CRÍTICO: Validación ESTRICTA - Solo mostrar datos si hay un polígono VISIBLE en el mapa
    // Verificar que realmente hay un polígono en el mapa (no solo en variables)
    const polygonOnMap = (this.polygon && this.polygon.getMap() && this.polygon.getMap() === this.map) || 
                          (this.savedPolygon && this.savedPolygon.getMap() && this.savedPolygon.getMap() === this.map);
    
    // 🚀 CRÍTICO: Validar que hay coordenadas Y que hay polígono visible
    const hasValidCoordinates = this.coordinates && 
                                Array.isArray(this.coordinates) && 
                                this.coordinates.length >= 3;
    
    // 🚀 CRÍTICO: Solo mostrar datos si HAY polígono visible Y coordenadas válidas
    const shouldShowData = polygonOnMap && hasValidCoordinates;
    
    // 🚀 CRÍTICO: Validar que el polígono pertenece al proyecto actual
    const currentProject = this.getCurrentProject();
    let belongsToCurrentProject = false;
    
    // Solo mostrar datos si hay proyecto Y polígono visible Y coordenadas válidas
    if (currentProject && currentProject.id && polygonOnMap && hasValidCoordinates) {
      belongsToCurrentProject = true;
    }
    // Si no hay proyecto o no hay polígono visible, NO mostrar datos (ya es false)

    // Actualizar elementos de la interfaz
    const areaDisplay = document.getElementById('areaDisplay');
    const coordinatesDisplay = document.getElementById('coordinatesDisplay');
    const perimeterDisplay = document.getElementById('perimeterDisplay');

    // 🚀 CRÍTICO: Solo mostrar datos si TODO es válido: polígono visible + coordenadas + proyecto actual
    if (areaDisplay) {
      if (shouldShowData && this.area > 0 && belongsToCurrentProject) {
        const areaHectares = this.area / 10000;
        const areaAcres = this.area * 0.000247105;
        areaDisplay.textContent = `${this.formatNumber(areaHectares)} ha (${this.formatNumber(areaAcres)} acres)`;
      } else {
        areaDisplay.textContent = '0.00 ha (0.00 acres)';
      }
    }

    if (coordinatesDisplay) {
      if (shouldShowData && belongsToCurrentProject && this.coordinates && this.coordinates.length > 0) {
        // Mostrar solo el primer punto para términos prácticos
        const firstCoord = `${this.coordinates[0][0].toFixed(4)}, ${this.coordinates[0][1].toFixed(4)}`;
        coordinatesDisplay.textContent = firstCoord;
      } else {
        coordinatesDisplay.textContent = 'No seleccionadas';
      }
    }

    if (perimeterDisplay) {
      if (shouldShowData && this.perimeter > 0 && belongsToCurrentProject) {
        perimeterDisplay.textContent = `${this.formatNumber(this.perimeter)} m`;
      } else {
        perimeterDisplay.textContent = '0.00 m';
      }
    }
  }

  async fetchElevationFromOpenMeteo(center) {
    if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) {
      return null;
    }
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' +
        encodeURIComponent(center.lat) +
        '&longitude=' + encodeURIComponent(center.lng) +
        '&current=temperature_2m';
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      const elevation = data ? Number(data.elevation) : NaN;
      return Number.isFinite(elevation) ? elevation : null;
    } catch (e) {
      console.warn('⚠️ No se pudo obtener altitud desde Open-Meteo:', e);
      return null;
    }
  }

  // Función para formatear números con separadores de miles
  formatNumber(number, decimals = 2) {
    if (isNaN(number) || number === null || number === undefined) {
      return '0.00';
    }
    
    const num = parseFloat(number);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  updateInstructions(message) {
    const instructions = document.querySelector('.instructions');
    if (instructions) {
      instructions.innerHTML = `<p>${message}</p>`;
    }
  }

  showCloseButton() {
    // Ya no mostramos botones adicionales, solo las instrucciones
    // El usuario puede usar el botón "Limpiar" de la interfaz principal
  }


  clearPolygon() {
    console.log('🗑️ Iniciando limpieza COMPLETA de polígono...');
    
    // 🚀 CRÍTICO: Usar forceRemoveAllPolygons para eliminar TODO
    // Esto asegura que se eliminen TODOS los polígonos, incluso los no rastreados
    this.forceRemoveAllPolygons();
    
    // Detener cualquier modo de dibujo activo
    if (this.drawingManager) {
      this.drawingManager.setDrawingMode(null);
      console.log('🗑️ Modo de dibujo detenido');
    }
    
    // 🚀 CRÍTICO: Limpiar datos guardados del localStorage COMPLETAMENTE
    this.clearSavedLocation();
    
    // Actualizar interfaz
    console.log('🗑️ Actualizando interfaz...');
    forceClearLocationDisplay();
    this.updateDisplay();
    this.updateInstructions('📍 Polígono eliminado - Haz clic en el mapa para trazar uno nuevo');
    
    // Mostrar mensaje de confirmación
    this.showMessage('🗑️ Polígono eliminado correctamente - Puedes dibujar uno nuevo', 'success');
    
    console.log('✅ Limpieza COMPLETA de polígono finalizada - listo para dibujar nuevo');
  }

  clearSavedLocation() {
    console.log('🗑️ Limpiando ubicación guardada COMPLETAMENTE...');
    
    // Limpiar datos guardados del proyecto actual
    const currentProject = this.getCurrentProject();
    if (currentProject && currentProject.id) {
      const projectId = currentProject.id;
      
      // 🚀 PRIORIDAD 1: Limpiar del sistema centralizado (projectStorage)
      if (window.projectStorage) {
        // 🚀 CRÍTICO: Cargar proyecto completo y eliminar location completamente
        const projectData = window.projectStorage.loadProject(projectId) || {};
        // Eliminar location completamente (no guardar objeto vacío, eliminarlo)
        delete projectData.location;
        // Guardar proyecto sin location
        window.projectStorage.saveProject(projectData, projectId);
        
        // 🚀 CRÍTICO: También limpiar del caché en memoria
        if (window.projectStorage.memoryCache && 
            window.projectStorage.memoryCache.currentProjectId === projectId &&
            window.projectStorage.memoryCache.projectData) {
          delete window.projectStorage.memoryCache.projectData.location;
          window.projectStorage.memoryCache.isDirty = true;
        }
        
        console.log('✅ Ubicación eliminada COMPLETAMENTE del sistema centralizado y caché');
      }
      
      // PRIORIDAD 2: Limpiar de projectManager (legacy)
      if (window.projectManager) {
        window.projectManager.saveProjectData('ubicacion', null);
        console.log('✅ Ubicación eliminada de projectManager');
      }
      
      // PRIORIDAD 3: Limpiar directamente del localStorage (múltiples formatos posibles)
      try {
        // Formato unificado
        const unifiedKey = `nutriplant_project_${projectId}`;
        const projectData = localStorage.getItem(unifiedKey);
        if (projectData) {
          try {
            const data = JSON.parse(projectData);
            // 🚀 CRÍTICO: Eliminar location completamente (no guardar objeto vacío)
            delete data.location;
            localStorage.setItem(unifiedKey, JSON.stringify(data));
            console.log('✅ Ubicación eliminada COMPLETAMENTE del formato unificado');
          } catch (e) {
            console.warn('⚠️ Error parseando datos del proyecto:', e);
          }
        }
        
        // Formato legacy (por si acaso)
        const legacyKey = `nutriplant_project_${projectId}_ubicacion`;
        localStorage.removeItem(legacyKey);
        
        // Formato nuevo (por si acaso)
        // 🔒 USAR FORMATO NUEVO: nutriplant_project_ (no legacy)
        const pmKey = `nutriplant_project_${projectId}`;
        const pmData = localStorage.getItem(pmKey);
        if (pmData) {
          try {
            const data = JSON.parse(pmData);
            data.ubicacion = null;
            data.location = null;
            localStorage.setItem(pmKey, JSON.stringify(data));
            console.log('✅ Ubicación eliminada del formato projectManager');
          } catch (e) {
            console.warn('⚠️ Error parseando datos de projectManager:', e);
          }
        }
      } catch (error) {
        console.error('❌ Error al limpiar localStorage:', error);
      }
    }
    
    console.log('✅ Limpieza completa de ubicación finalizada');
  }

  async saveLocation() {
    if (!this.polygon || this.coordinates.length < 3) {
      alert('Por favor, traza un polígono válido antes de guardar');
      return;
    }

    // Obtener el proyecto actual seleccionado
    const currentProject = this.getCurrentProject();
    if (!currentProject) {
      alert('Por favor, selecciona un proyecto desde Inicio antes de guardar el predio');
      return;
    }

    // Recalcular datos antes de guardar (por si hubo ediciones)
    this.calculateAreaAndPerimeter();

    const centerPoint = this.getPolygonCenter();
    const elevationM = await this.fetchElevationFromOpenMeteo(centerPoint);
    const locationData = {
      coordinates: this.coordinates,
      area: this.area,
      areaHectares: this.area / 10000,
      areaAcres: this.area * 0.000247105,
      perimeter: this.perimeter,
      center: centerPoint,
      elevationM: elevationM,
      projectId: currentProject.id,
      projectName: currentProject.name,
      lastUpdated: new Date().toISOString()
    };

    // Guardar en el sistema unificado (nutriplant_project_<id>)
    const projectId = currentProject.id;
    if (!projectId) {
      alert('Error: No hay proyecto seleccionado');
      return;
    }
    
    try {
      // 🚀 FORMATO ESTÁNDAR ÚNICO - SIEMPRE usar este formato
      // CRÍTICO: Incluir projectId para validación al cargar
      const locationDataToSave = {
        // METADATOS (SIEMPRE REQUERIDOS)
        projectId: projectId, // CRÍTICO: Incluir ID del proyecto para validación
        projectName: currentProject.name || '',
        lastUpdated: locationData.lastUpdated || new Date().toISOString(),
        
        // DATOS DEL POLÍGONO (REQUERIDO)
        polygon: locationData.coordinates, // Array de [lat, lng] - REQUERIDO
        
        // CÁLCULOS (para evitar recalcular)
        area: locationData.area,
        areaHectares: locationData.areaHectares,
        areaAcres: locationData.areaAcres,
        perimeter: locationData.perimeter, // En metros
        
        // CENTRO (para centrar mapa)
        center: locationData.center || null,
        elevationM: Number.isFinite(locationData.elevationM) ? locationData.elevationM : null,
        
        // DISPLAY (opcional, para mostrar en UI)
        coordinates: locationData.center ? `${locationData.center.lat.toFixed(6)}, ${locationData.center.lng.toFixed(6)}` : '',
        surface: `${this.formatNumber(locationData.areaHectares)} ha`,
        perimeterDisplay: `${this.formatNumber(locationData.perimeter)} m`,
        elevationDisplay: Number.isFinite(locationData.elevationM) ? `${Math.round(locationData.elevationM)} msnm` : 'N/D'
      };
      const existingLoc =
        (typeof window.projectStorage !== 'undefined' && window.projectStorage.loadSection
          ? window.projectStorage.loadSection('location', projectId)
          : null) || currentProject.location;
      if (existingLoc && existingLoc.radarSelectedRequestId) {
        locationDataToSave.radarSelectedRequestId = existingLoc.radarSelectedRequestId;
      }
      
      // 🚀 CRÍTICO: NO limpiar el polígono actual - solo asegurar que es el único
      // El polígono actual (this.polygon) debe mantenerse visible después de guardar
      console.log('💾 Guardando polígono actual (manteniéndolo visible)...');
      
      // Solo eliminar otros polígonos que NO sean el actual
      if (this.savedPolygon && this.savedPolygon !== this.polygon) {
        // Si hay un polígono guardado diferente al actual, eliminarlo
        google.maps.event.clearListeners(this.savedPolygon);
        if (this.savedPolygon.getPath) {
          google.maps.event.clearListeners(this.savedPolygon.getPath());
        }
        this.savedPolygon.setMap(null);
        this.savedPolygon = null;
      }
      
      // Usar sistema centralizado si está disponible
      const useCentralized = typeof window.projectStorage !== 'undefined';
      
      if (useCentralized) {
        // 🚀 CRÍTICO: Guardar location DIRECTAMENTE con saveSection()
        // NO usar saveProject() que hace merge - location debe guardarse directamente
        const success = window.projectStorage.saveSection('location', locationDataToSave, projectId);
        
        if (success) {
          // 🚀 CRÍTICO: Marcar el polígono como guardado Y mantenerlo visible
          // NO eliminar el polígono - debe seguir visible después de guardar
          this.savedPolygon = this.polygon;
          
          // 🚀 CRÍTICO: Asegurar que el polígono sigue en el mapa
          if (this.polygon && !this.polygon.getMap()) {
            this.polygon.setMap(this.map);
          }
          
          console.log('✅ Polígono guardado y visible (DIRECTAMENTE con saveSection) usando sistema centralizado:', {
            polygonPoints: locationDataToSave.polygon ? locationDataToSave.polygon.length : 0,
            area: locationDataToSave.areaHectares,
            projectId: projectId,
            isVisible: this.polygon && this.polygon.getMap() ? true : false
          });
          
          // Verificar que realmente se guardó y que SOLO hay UN polígono
          const verified = window.projectStorage.loadSection('location', projectId);
          if (verified && verified.polygon) {
            const polygonCount = Array.isArray(verified.polygon) ? verified.polygon.length : 0;
            if (polygonCount >= 3) {
              console.log('💾 Guardado VERIFICADO - UN solo polígono guardado:', { 
                polygonPoints: polygonCount,
                projectId: verified.projectId,
                isValid: verified.projectId === projectId
              });
              
              // Mostrar mensaje de éxito
              this.showMessage('✅ Predio guardado correctamente', 'success');
            } else {
              console.warn('⚠️ Polígono guardado pero sin coordenadas válidas (menos de 3 puntos)');
              this.showMessage('⚠️ Polígono guardado pero inválido', 'warning');
            }
          } else {
            console.warn('⚠️ No se pudo verificar el guardado');
            this.showMessage('⚠️ No se pudo verificar el guardado', 'warning');
          }
        } else {
          console.error('❌ ERROR: No se pudo guardar usando sistema centralizado');
          this.showMessage('❌ Error al guardar el predio', 'error');
        }
      } else {
        // Fallback: guardar directamente con REEMPLAZO COMPLETO
        const projectKey = `nutriplant_project_${projectId}`;
        const existingRaw = localStorage.getItem(projectKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        
        // 🚀 REEMPLAZO COMPLETO de location (no merge) para evitar duplicados
        const merged = {
          ...existing,
          location: locationDataToSave, // REEMPLAZO COMPLETO
          id: projectId,
          name: currentProject.name || existing.name,
          lastSaved: new Date().toISOString()
        };
        
        // Guardar
        localStorage.setItem(projectKey, JSON.stringify(merged));
        
        // CRÍTICO: Marcar el polígono como guardado para evitar que se pierda
        // 🚀 CRÍTICO: Marcar como guardado Y mantener visible
        this.savedPolygon = this.polygon;
        
        // 🚀 CRÍTICO: Asegurar que el polígono sigue en el mapa
        if (this.polygon && !this.polygon.getMap()) {
          this.polygon.setMap(this.map);
        }
        
        console.log('✅ Polígono guardado y visible (REEMPLAZO COMPLETO) en sistema unificado (método directo):', {
          polygonPoints: locationDataToSave.polygon ? locationDataToSave.polygon.length : 0,
          projectId: projectId,
          isVisible: this.polygon && this.polygon.getMap() ? true : false
        });
        
        // Verificar que realmente se guardó y que SOLO hay UN polígono
        const verify = localStorage.getItem(projectKey);
        if (verify) {
          const verified = JSON.parse(verify);
          const hasLocation = verified.location && verified.location.polygon;
          if (hasLocation) {
            const polygonCount = Array.isArray(verified.location.polygon) ? verified.location.polygon.length : 0;
            console.log('💾 Guardado VERIFICADO - UN solo polígono guardado (método directo):', { 
              polygonPoints: polygonCount,
              projectId: verified.location.projectId
            });
          } else {
            console.warn('⚠️ Guardado pero sin polígono válido');
          }
        }
      }
      
      // 🚀 ELIMINADO: Guardado redundante en projectManager
      // Ya se guarda correctamente en projectStorage.saveSection()
      // El guardado redundante puede causar conflictos y datos inconsistentes
      
      // 🚀 CRÍTICO: Asegurar que el polígono sigue visible después de guardar
      if (this.polygon && !this.polygon.getMap()) {
        this.polygon.setMap(this.map);
      }
      
      // Actualizar display con los datos guardados
      this.updateDisplay();
      if (typeof setLocationAltitudeDisplay === 'function') {
        setLocationAltitudeDisplay(locationDataToSave.elevationM);
      }
      
      // Mostrar confirmación
      const message = `✅ Predio guardado para "${currentProject.name}"!\n\n` +
                     `📏 Superficie: ${this.formatNumber(locationData.areaHectares)} ha (${this.formatNumber(locationData.areaAcres)} acres)\n` +
                     `📐 Perímetro: ${this.formatNumber(locationData.perimeter)} m\n` +
                     `📍 Coordenadas: ${this.formatNumber(locationData.center.lat)}, ${this.formatNumber(locationData.center.lng)}\n\n` +
                     `🕒 Actualizado: ${new Date().toLocaleString()}`;
      
      alert(message);
      this.showMessage('✅ Predio guardado exitosamente', 'success');
      
      // 🚀 CRÍTICO: Actualizar instrucciones
      this.updateInstructions('✅ Predio guardado - Puedes editarlo o guardar cambios');
      
    } catch (e) {
      console.error('❌ Error al guardar polígono:', e);
      alert('Error al guardar el predio: ' + e.message);
    }
  }

  getPolygonCenter() {
    if (!this.polygonPath.length) return null;

    let lat = 0, lng = 0;
    this.polygonPath.forEach(point => {
      lat += point.lat();
      lng += point.lng();
    });

    return {
      lat: lat / this.polygonPath.length,
      lng: lng / this.polygonPath.length
    };
  }

  getCurrentLocation() {
    const proj = this.getCurrentProject();
    const loc = proj && proj.location;
    const hasSavedPolygon =
      loc &&
      loc.polygon &&
      Array.isArray(loc.polygon) &&
      loc.polygon.length >= 3 &&
      (!loc.projectId || !proj.id || loc.projectId === proj.id);
    if (hasSavedPolygon) {
      console.log('ℹ️ getCurrentLocation: predio guardado — omitiendo GPS automático');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Centrar el mapa en la ubicación del usuario
          this.map.setCenter(userLocation);
          this.map.setZoom(15); // Cambiado de 18 a 15 para vista más amplia
          this.refreshMapView('gps-auto');
          
          // Agregar marcador de ubicación actual
          this.addUserLocationMarker(userLocation);
        },
        (error) => {
          console.log('No se pudo obtener la ubicación:', error);
          // Usar ubicación por defecto si no se puede obtener
          this.addUserLocationMarker({ lat: 19.4326, lng: -99.1332 });
        }
      );
    } else {
      console.log('Geolocalización no soportada');
      // Usar ubicación por defecto
      this.addUserLocationMarker({ lat: 19.4326, lng: -99.1332 });
    }
  }

  addUserLocationMarker(location) {
    // Crear marcador de ubicación actual
    this.userLocationMarker = new google.maps.Marker({
      position: location,
      map: this.map,
      title: 'Tu ubicación actual',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3
      },
      animation: google.maps.Animation.BOUNCE
    });

    // Crear info window para el marcador
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; text-align: center; font-family: Arial, sans-serif;">
          <strong style="color: #2563eb;">📍 Tu ubicación actual</strong><br>
          <small style="color: #666;">
            Lat: ${location.lat.toFixed(6)}<br>
            Lng: ${location.lng.toFixed(6)}
          </small>
        </div>
      `
    });

    // Mostrar info window al hacer clic
    this.userLocationMarker.addListener('click', () => {
      infoWindow.open(this.map, this.userLocationMarker);
    });

    // Parar la animación después de 2 segundos
    setTimeout(() => {
      if (this.userLocationMarker) {
        this.userLocationMarker.setAnimation(null);
      }
    }, 2000);
  }

  getCurrentProject() {
    // 🚀 PRIORIDAD 1: Usar currentProject global (dashboard.js) si está disponible
    if (typeof currentProject !== 'undefined' && currentProject && currentProject.id) {
      return currentProject;
    }
    
    // 🚀 PRIORIDAD 2: Usar projectManager como respaldo (compatibilidad con versiones anteriores)
    if (window.projectManager && typeof window.projectManager.getCurrentProject === 'function') {
      const project = window.projectManager.getCurrentProject();
      if (project && project.id) {
        return project;
      }
    }
    
    // 🚀 PRIORIDAD 3: Intentar obtener desde localStorage directamente
    try {
      const currentProjectId = localStorage.getItem('nutriplant-current-project');
      if (currentProjectId) {
        const projectKey = `nutriplant_project_${currentProjectId}`;
        const raw = localStorage.getItem(projectKey);
        if (raw) {
          const projectData = JSON.parse(raw);
          if (projectData && projectData.id) {
            return {
              id: projectData.id,
              name: projectData.name || projectData.title || ''
            };
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Error obteniendo proyecto desde localStorage:', e);
    }
    
    return null;
  }

  fitMapToVisiblePolygon(polygonToFit) {
    if (!polygonToFit || !this.map || typeof google === 'undefined' || !google.maps) return false;
    try {
      if (typeof np_scrollLocationMapIntoView === 'function') {
        np_scrollLocationMapIntoView();
      }
      this.refreshMapView('before-fit-polygon');
      const bounds = new google.maps.LatLngBounds();
      polygonToFit.getPath().forEach((point) => bounds.extend(point));
      this.map.fitBounds(bounds, { padding: 50 });
      setTimeout(() => this.refreshMapView('fit-polygon'), 200);
      return true;
    } catch (e) {
      console.warn('⚠️ fitMapToVisiblePolygon:', e);
      return false;
    }
  }

  fitMapToCurrentProjectLocation() {
    if (!np_isLocationMapReady()) return false;

    const painted = this.savedPolygon || this.polygon;
    if (painted && painted.getMap && painted.getMap() === this.map) {
      return this.fitMapToVisiblePolygon(painted);
    }

    const proj = this.getCurrentProject();
    const loc = proj && proj.location;
    if (loc && loc.polygon && Array.isArray(loc.polygon) && loc.polygon.length >= 3) {
      const center = this.calculatePolygonCenter(loc.polygon);
      if (center) {
        this.map.setCenter(center);
        this.map.setZoom(15);
        this.refreshMapView('fit-project-center');
        return true;
      }
    }
    if (loc && loc.center && loc.center.lat != null && loc.center.lng != null) {
      this.map.setCenter({ lat: Number(loc.center.lat), lng: Number(loc.center.lng) });
      this.map.setZoom(15);
      this.refreshMapView('fit-project-center');
      return true;
    }
    return false;
  }

  centerOnPolygon() {
    console.log('📍 Botón centrar en polígono presionado');

    if (typeof np_scrollLocationMapIntoView === 'function') {
      np_scrollLocationMapIntoView();
    }

    if (!np_isLocationMapReady() || !this.map) {
      if (typeof initLocationMap === 'function') initLocationMap();
      this.showMessage('🔄 Cargando mapa y polígono del predio…', 'info');
      this._centerOnPolygonAttempts = (this._centerOnPolygonAttempts || 0) + 1;
      if (this._centerOnPolygonAttempts <= 15) {
        setTimeout(() => this.centerOnPolygon(), 500);
      } else {
        this._centerOnPolygonAttempts = 0;
        this.showMessage('⚠️ No se pudo cargar el mapa. Vuelve a entrar a Ubicación.', 'warning');
      }
      return;
    }
    this._centerOnPolygonAttempts = 0;

    const currentProject = this.getCurrentProject();
    const currentProjectId = currentProject && currentProject.id ? String(currentProject.id) : '';

    const polygonBelongsToCurrentProject = (polygonToCheck) => {
      if (!polygonToCheck || !currentProjectId) return false;
      const polygonProjectId =
        polygonToCheck.__nutriplantProjectId ||
        this.loadedProjectId ||
        this.currentPolygonProjectId ||
        '';
      return !polygonProjectId || String(polygonProjectId) === currentProjectId;
    };

    const fitVisiblePolygon = (polygonToCenter) => {
      if (typeof np_scrollLocationMapIntoView === 'function') {
        np_scrollLocationMapIntoView();
      }
      this.refreshMapView('button-fit-polygon');
      const bounds = new google.maps.LatLngBounds();
      const path = polygonToCenter.getPath();
      path.forEach((point) => bounds.extend(point));
      this.map.fitBounds(bounds, { padding: 50 });
      setTimeout(() => {
        this.refreshMapView('button-fit-polygon-delayed');
        this.map.fitBounds(bounds, { padding: 50 });
      }, 300);
      this.showMessage('✅ Mapa centrado en el polígono', 'success');
    };
    
    // 🚀 PRIORIDAD 1: Verificar si hay polígono visible en el mapa
    let polygonToCenter = null;
    
    if (
      this.polygon &&
      this.polygon.getMap &&
      this.polygon.getMap() === this.map &&
      polygonBelongsToCurrentProject(this.polygon)
    ) {
      polygonToCenter = this.polygon;
    } else if (
      this.savedPolygon &&
      this.savedPolygon.getMap &&
      this.savedPolygon.getMap() === this.map &&
      polygonBelongsToCurrentProject(this.savedPolygon)
    ) {
      polygonToCenter = this.savedPolygon;
    }
    
    if (polygonToCenter) {
      try {
        fitVisiblePolygon(polygonToCenter);
        return;
      } catch (e) {
        console.warn('⚠️ Error centrando en polígono visible:', e);
      }
    }
    
    // 🚀 PRIORIDAD 2: Cargar polígono guardado y centrar
    if (currentProject && currentProject.id) {
      let locationData = null;
      const memLoc = currentProject.location;
      if (memLoc && memLoc.polygon && Array.isArray(memLoc.polygon) && memLoc.polygon.length >= 3 &&
          (!memLoc.projectId || memLoc.projectId === currentProject.id)) {
        locationData = memLoc;
      }
      if (!locationData && window.projectStorage) {
        locationData = window.projectStorage.loadSection('location', currentProject.id);
      }

      if (locationData && locationData.polygon && Array.isArray(locationData.polygon) && locationData.polygon.length >= 3) {
        const belongs =
          !locationData.projectId || locationData.projectId === currentProject.id;
        if (belongs) {
          if (!locationData.projectId) locationData.projectId = currentProject.id;
          try {
            this.loadSavedPolygon({
              ...locationData,
              polygon: locationData.polygon,
              coordinates: locationData.polygon
            });
            const painted = this.savedPolygon || this.polygon;
            if (painted && painted.getMap && painted.getMap() === this.map) {
              fitVisiblePolygon(painted);
              return;
            }
          } catch (e) {
            console.warn('⚠️ Error cargando polígono guardado desde botón:', e);
          }
          const center = this.calculatePolygonCenter(locationData.polygon);
          if (center) {
            if (typeof np_scrollLocationMapIntoView === 'function') {
              np_scrollLocationMapIntoView();
            }
            this.refreshMapView('button-fit-project-center');
            this.map.setCenter(center);
            this.map.setZoom(15);
            this.showMessage('✅ Mapa centrado en el polígono guardado', 'success');
            return;
          }
        }
      }
    }
    
    this.showMessage('⚠️ No hay polígono guardado o visible para centrar', 'warning');
  }

  centerOnUserLocation() {
    // 🚀 "Mi Ubicación" SIEMPRE debe obtener la ubicación GPS del dispositivo
    // NO debe centrar en el polígono - eso lo hace el botón "Ubicación del Predio"

    if (typeof np_scrollLocationMapIntoView === 'function') {
      np_scrollLocationMapIntoView();
    }

    if (!np_isLocationMapReady() || !this.map) {
      if (typeof initLocationMap === 'function') initLocationMap();
      this.showMessage('🔄 Cargando mapa…', 'info');
      this._centerOnUserLocationAttempts = (this._centerOnUserLocationAttempts || 0) + 1;
      if (this._centerOnUserLocationAttempts <= 15) {
        setTimeout(() => this.centerOnUserLocation(), 500);
      } else {
        this._centerOnUserLocationAttempts = 0;
        this.showMessage('⚠️ No se pudo cargar el mapa. Vuelve a entrar a Ubicación.', 'warning');
      }
      return;
    }
    this._centerOnUserLocationAttempts = 0;
    
    if (!navigator.geolocation) {
      this.showMessage('❌ La geolocalización no está disponible en este navegador', 'error');
      return;
    }

    console.log('📍 Obteniendo ubicación GPS del dispositivo...');
    this.showMessage('🔄 Obteniendo tu ubicación...', 'info');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        console.log('✅ Ubicación GPS obtenida:', userLocation);
        
        // Centrar el mapa en la ubicación del usuario
        if (typeof np_scrollLocationMapIntoView === 'function') {
          np_scrollLocationMapIntoView();
        }
        this.refreshMapView('before-gps-button');
        this.map.setCenter(userLocation);
        this.map.setZoom(15);
        this.refreshMapView('gps-button');
        
        // Agregar marcador de la ubicación del usuario
        this.addUserLocationMarker(userLocation);
        
        this.showMessage('📍 Centrado en tu ubicación actual', 'success');
      },
      (error) => {
        let errorMessage = '❌ Error al obtener tu ubicación';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '❌ Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '❌ Ubicación no disponible. Verifica que tu dispositivo tenga GPS activado.';
            break;
          case error.TIMEOUT:
            errorMessage = '❌ Tiempo de espera agotado. Intenta de nuevo.';
            break;
        }
        console.error('❌ Error obteniendo ubicación GPS:', error);
        this.showMessage(errorMessage, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // No usar ubicación en caché, siempre obtener nueva
      }
    );
  }

  calculatePolygonCenter(coordinates) {
    if (!coordinates || coordinates.length === 0) return null;
    
    let lat = 0;
    let lng = 0;
    
    coordinates.forEach(coord => {
      // Las coordenadas están guardadas como [lat, lng]
      lat += coord[0];
      lng += coord[1];
    });
    
    return {
      lat: lat / coordinates.length,
      lng: lng / coordinates.length
    };
  }

  showMessage(message, type = 'info') {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `map-message map-message-${type}`;
    messageDiv.textContent = message;
    
    // Estilos
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      font-weight: 500;
      animation: slideIn 0.3s ease;
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
  }

  loadProjectLocation() {
    const currentProject = this.getCurrentProject();
    console.log('🔄 loadProjectLocation - Proyecto actual:', currentProject);
    
    if (!currentProject || !currentProject.id) {
      console.log('⚠️ No hay proyecto actual seleccionado o el proyecto no tiene ID');
      this.updateInstructions('📍 Selecciona un proyecto y haz clic en el mapa para trazar tu parcela');
      // Limpiar si no hay proyecto
      this.forceRemoveAllPolygons();
      forceClearLocationDisplay();
      this.updateDisplay();
      return null;
    }

    // 🚀 PRIORIDAD 1: Cargar desde localStorage PRIMERO (antes de limpiar)
    // Esto evita limpiar si hay un polígono válido guardado
    let locationData = null;
    const useCentralized = typeof window.projectStorage !== 'undefined' && window.projectStorage !== null;
    
    // 🔍 DIAGNÓSTICO: Verificar qué hay en localStorage directamente
    const projectKey = `nutriplant_project_${currentProject.id}`;
    const rawData = localStorage.getItem(projectKey);
    console.log('🔍 DIAGNÓSTICO - Clave del proyecto:', projectKey);
    console.log('🔍 DIAGNÓSTICO - ¿Existe en localStorage?', !!rawData);
    
    if (rawData) {
      try {
        const projectData = JSON.parse(rawData);
        console.log('🔍 DIAGNÓSTICO - Datos del proyecto:', {
          id: projectData.id,
          name: projectData.name,
          hasLocation: !!projectData.location,
          locationKeys: projectData.location ? Object.keys(projectData.location) : [],
          hasPolygon: !!(projectData.location && projectData.location.polygon),
          polygonType: projectData.location && projectData.location.polygon ? typeof projectData.location.polygon : 'N/A',
          polygonIsArray: projectData.location && projectData.location.polygon ? Array.isArray(projectData.location.polygon) : false,
          polygonLength: projectData.location && projectData.location.polygon && Array.isArray(projectData.location.polygon) ? projectData.location.polygon.length : 0,
          locationProjectId: projectData.location ? projectData.location.projectId : 'N/A'
        });
      } catch (e) {
        console.error('🔍 DIAGNÓSTICO - Error parseando datos:', e);
      }
    }
    
    // 🔍 DIAGNÓSTICO: Verificar disponibilidad de projectStorage
    console.log('🔍 DIAGNÓSTICO - Verificando projectStorage...');
    console.log('🔍 DIAGNÓSTICO - window.projectStorage existe?', typeof window.projectStorage !== 'undefined');
    console.log('🔍 DIAGNÓSTICO - window.projectStorage es null?', window.projectStorage === null);
    console.log('🔍 DIAGNÓSTICO - window.projectStorage tipo:', typeof window.projectStorage);
    
    if (typeof window.projectStorage !== 'undefined' && window.projectStorage !== null) {
      console.log('🔍 DIAGNÓSTICO - projectStorage disponible, verificando métodos...');
      console.log('🔍 DIAGNÓSTICO - loadSection existe?', typeof window.projectStorage.loadSection === 'function');
      console.log('🔍 DIAGNÓSTICO - getCurrentProject existe?', typeof window.projectStorage.getCurrentProject === 'function');
    } else {
      console.warn('🔍 DIAGNÓSTICO - projectStorage NO está disponible');
      console.warn('🔍 DIAGNÓSTICO - Verificando si ProjectStorage está definido:', typeof ProjectStorage !== 'undefined');
      console.warn('🔍 DIAGNÓSTICO - Intentando crear instancia manualmente...');
      
      // Intentar crear instancia si la clase existe pero no la instancia
      if (typeof ProjectStorage !== 'undefined') {
        try {
          window.projectStorage = new ProjectStorage();
          console.log('✅ projectStorage creado manualmente');
        } catch (e) {
          console.error('❌ Error creando projectStorage:', e);
        }
      }
    }
    
    if (useCentralized) {
      // 🚀 CRÍTICO: Cargar ANTES de limpiar para verificar si hay datos válidos
      console.log('🔍 DIAGNÓSTICO - Llamando a loadSection con projectId:', currentProject.id);
      
      try {
      locationData = window.projectStorage.loadSection('location', currentProject.id);
        console.log('🔍 DIAGNÓSTICO - loadSection ejecutado sin errores');
      } catch (e) {
        console.error('🔍 DIAGNÓSTICO - ERROR al ejecutar loadSection:', e);
        console.error('🔍 DIAGNÓSTICO - Stack trace:', e.stack);
        locationData = null;
      }
      
      console.log('🔍 DIAGNÓSTICO - loadSection retornó:', {
        isNull: locationData === null,
        isUndefined: locationData === undefined,
        hasPolygon: !!(locationData && locationData.polygon),
        polygonType: locationData && locationData.polygon ? typeof locationData.polygon : 'N/A',
        polygonIsArray: locationData && locationData.polygon ? Array.isArray(locationData.polygon) : false,
        polygonLength: locationData && locationData.polygon && Array.isArray(locationData.polygon) ? locationData.polygon.length : 0,
        hasCoordinates: !!(locationData && locationData.coordinates),
        projectId: locationData ? locationData.projectId : 'N/A',
        allKeys: locationData ? Object.keys(locationData) : []
      });
      
      // 🚀 VALIDAR Y USAR DATOS DE loadSection SI SON VÁLIDOS
      if (locationData && locationData.polygon && Array.isArray(locationData.polygon) && locationData.polygon.length >= 3) {
        // Verificar projectId
        const locationProjectId = locationData.projectId;
        if (!locationProjectId || locationProjectId === currentProject.id) {
          console.log('✅ Polígono cargado desde projectStorage.loadSection() - Datos válidos');
          // Asegurar que tiene projectId
          if (!locationData.projectId) {
            locationData.projectId = currentProject.id;
          }
        } else {
          console.warn('⚠️ Polígono de loadSection pertenece a otro proyecto, usando fallback:', {
            expected: currentProject.id,
            found: locationProjectId
          });
          locationData = null; // Forzar uso del fallback
        }
      } else if (locationData) {
        console.warn('⚠️ loadSection retornó datos pero sin polígono válido, usando fallback');
        locationData = null; // Forzar uso del fallback
      }
      
      // 🔍 DIAGNÓSTICO ADICIONAL: Si retornó null o no es válido, verificar directamente desde localStorage
      if (!locationData) {
        console.warn('🔍 DIAGNÓSTICO - loadSection retornó null, verificando directamente desde localStorage...');
        const directKey = `nutriplant_project_${currentProject.id}`;
        const directRaw = localStorage.getItem(directKey);
        if (directRaw) {
          try {
            const directData = JSON.parse(directRaw);
            console.log('🔍 DIAGNÓSTICO - Datos directos de localStorage:', {
              hasLocation: !!directData.location,
              locationType: directData.location ? typeof directData.location : 'N/A',
              hasPolygon: !!(directData.location && directData.location.polygon),
              polygonType: directData.location && directData.location.polygon ? typeof directData.location.polygon : 'N/A',
              polygonIsArray: directData.location && directData.location.polygon ? Array.isArray(directData.location.polygon) : false,
              polygonLength: directData.location && directData.location.polygon && Array.isArray(directData.location.polygon) ? directData.location.polygon.length : 0,
              locationProjectId: directData.location ? directData.location.projectId : 'N/A',
              expectedProjectId: currentProject.id
            });
            
            // 🚀 SOLUCIÓN DIRECTA: Si loadSection retornó null pero el polígono existe en localStorage, usarlo directamente
            if (directData.location && directData.location.polygon && Array.isArray(directData.location.polygon) && directData.location.polygon.length >= 3) {
              // Verificar projectId
              const locationProjectId = directData.location.projectId;
              if (!locationProjectId || locationProjectId === currentProject.id) {
                console.log('✅ POLÍGONO ENCONTRADO DIRECTAMENTE EN localStorage - Usando como respaldo');
                // Usar los datos directamente
                locationData = directData.location;
                // Asegurar que tiene projectId
                if (!locationData.projectId) {
                  locationData.projectId = currentProject.id;
                }
              } else {
                console.warn('⚠️ Polígono en localStorage pertenece a otro proyecto:', {
                  expected: currentProject.id,
                  found: locationProjectId
                });
              }
            }
          } catch (e) {
            console.error('🔍 DIAGNÓSTICO - Error parseando datos directos:', e);
          }
        }
      }
      
      if (locationData) {
        // 🚀 CRÍTICO: Validar que realmente hay un polígono válido (no solo un objeto vacío)
        const hasValidPolygon = locationData.polygon && 
                                Array.isArray(locationData.polygon) && 
                                locationData.polygon.length >= 3;
        
        // 🚀 CRÍTICO: Validar projectId - pero ser más flexible
        // Si no tiene projectId, asumir que es del proyecto actual (datos antiguos)
        const hasValidProjectId = !locationData.projectId || locationData.projectId === currentProject.id;
        
        console.log('🔍 DIAGNÓSTICO - Validaciones:', {
          hasValidPolygon,
          hasValidProjectId,
          polygonLength: locationData.polygon ? locationData.polygon.length : 0,
          projectIdMatch: locationData.projectId === currentProject.id
        });
        
        if (!hasValidPolygon) {
          console.log('ℹ️ Datos de ubicación encontrados pero sin polígono válido - tratando como vacío');
          console.log('🔍 DIAGNÓSTICO - Razón:', {
            hasPolygon: !!locationData.polygon,
            isArray: locationData.polygon ? Array.isArray(locationData.polygon) : false,
            length: locationData.polygon && Array.isArray(locationData.polygon) ? locationData.polygon.length : 'N/A'
          });
          locationData = null;
        } else if (!hasValidProjectId) {
          console.warn('⚠️ Datos de ubicación pertenecen a otro proyecto. IGNORANDO...', {
            expected: currentProject.id,
            found: locationData.projectId
          });
          locationData = null;
        } else {
          console.log('✅ Datos de ubicación válidos encontrados para proyecto:', currentProject.id, {
            polygonPoints: locationData.polygon.length,
            projectId: locationData.projectId || 'sin projectId (datos antiguos)'
          });
        }
      } else {
        console.log('ℹ️ No hay datos de ubicación para este proyecto');
      }
    } else {
      console.warn('⚠️ projectStorage no está disponible - usando método directo');
      // Fallback: cargar directamente desde localStorage
      const directKey = `nutriplant_project_${currentProject.id}`;
      const directRaw = localStorage.getItem(directKey);
      if (directRaw) {
        try {
          const directData = JSON.parse(directRaw);
          if (directData.location && directData.location.polygon && Array.isArray(directData.location.polygon) && directData.location.polygon.length >= 3) {
            locationData = directData.location;
            if (!locationData.projectId) {
              locationData.projectId = currentProject.id;
            }
            console.log('✅ Polígono cargado directamente desde localStorage (fallback)');
          }
        } catch (e) {
          console.error('❌ Error cargando desde localStorage (fallback):', e);
        }
      }
    }
    
    // 🚀 CRÍTICO: SOLO limpiar si NO hay datos válidos para cargar
    // Si hay datos válidos, NO limpiar - solo cargar el polígono guardado
    if (!locationData || !locationData.polygon || locationData.polygon.length < 3) {
      console.log('🧹 No hay polígono válido guardado - limpiando mapa...');
      console.log('🔍 DIAGNÓSTICO FINAL - Razón de limpieza:', {
        locationDataIsNull: locationData === null,
        locationDataIsUndefined: locationData === undefined,
        hasLocationData: !!locationData,
        hasPolygon: !!(locationData && locationData.polygon),
        polygonIsArray: locationData && locationData.polygon ? Array.isArray(locationData.polygon) : false,
        polygonLength: locationData && locationData.polygon && Array.isArray(locationData.polygon) ? locationData.polygon.length : 0
      });
      // Limpiar solo si NO hay datos válidos
      this.polygon = null;
      this.savedPolygon = null;
      this.polygonPath = [];
      this.coordinates = [];
      this.area = 0;
      this.perimeter = 0;
      this.forceRemoveAllPolygons();
      forceClearLocationDisplay();
      this.updateDisplay();
      this.updateInstructions('📍 Haz clic en el mapa para trazar tu parcela');
      return null;
    }
    
    // 🚀 Si hay datos válidos, NO limpiar todavía - primero extraer coordenadas
    // Actualizar indicador del proyecto
    this.updateProjectIndicator(currentProject);
    
    // PRIORIDAD 2: Fallback a método directo (SOLO si projectStorage no está disponible)
    // 🚀 CRÍTICO: Validación ESTRICTA de projectId en fallback también
    if (!locationData && !useCentralized) {
      try {
        const projectKey = `nutriplant_project_${currentProject.id}`;
        const raw = localStorage.getItem(projectKey);
        if (raw) {
          const o = JSON.parse(raw);
          // 🚀 VALIDACIÓN ESTRICTA: Verificar que el proyecto en los datos coincide con el ID actual
          if (o && o.id && o.id !== currentProject.id) {
            console.warn('⚠️ Fallback: Datos encontrados pero pertenecen a otro proyecto. IGNORANDO...');
            locationData = null;
          } else if (o && o.location) {
            // 🚀 VALIDACIÓN ESTRICTA: Verificar también que location.projectId coincida EXACTAMENTE
            if (o.location.projectId && o.location.projectId !== currentProject.id) {
              console.warn('⚠️ Fallback: Datos de ubicación pertenecen a otro proyecto. IGNORANDO...');
              locationData = null;
            } else if (!o.location.projectId) {
              // 🚀 CRÍTICO: Si no tiene projectId, NO cargar (seguridad)
              console.warn('⚠️ Fallback: Datos sin projectId. NO cargando (seguridad).');
              locationData = null;
            } else {
              locationData = o.location;
              console.log('✅ Datos de ubicación cargados desde método directo (fallback) para proyecto:', currentProject.id);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error cargando desde método directo (fallback):', e);
        locationData = null;
      }
    }
    
    // 🚀 ELIMINADO: Fallback a projectManager
    // Ya no se usa projectManager para guardar/cargar location
    // Solo se usa projectStorage para evitar conflictos
    
    console.log('Datos de ubicación cargados para proyecto:', currentProject.name, locationData);
    
    // 🚀 CRÍTICO: Verificar si hay polígono guardado y que SOLO hay UNO
    // Verificación más estricta: debe tener al menos 3 coordenadas válidas
    let polygonCoords = null;
    
    if (locationData) {
      // Priorizar polygon sobre coordinates
      if (locationData.polygon && Array.isArray(locationData.polygon)) {
        // 🚀 Validar que NO es un array de múltiples polígonos
        if (locationData.polygon.length >= 3) {
          // Verificar si el primer elemento es un array (array de polígonos)
          if (Array.isArray(locationData.polygon[0]) && Array.isArray(locationData.polygon[0][0])) {
            console.warn('⚠️ Se detectaron múltiples polígonos guardados. Usando solo el primero.');
            polygonCoords = locationData.polygon[0]; // Tomar solo el primero
          } else {
            // Es un solo polígono válido
            polygonCoords = locationData.polygon;
          }
        }
      } else if (locationData.coordinates && Array.isArray(locationData.coordinates)) {
        // Misma validación para coordinates
        if (locationData.coordinates.length >= 3) {
          if (Array.isArray(locationData.coordinates[0]) && Array.isArray(locationData.coordinates[0][0])) {
            console.warn('⚠️ Se detectaron múltiples polígonos en coordinates. Usando solo el primero.');
            polygonCoords = locationData.coordinates[0];
          } else {
            polygonCoords = locationData.coordinates;
          }
        }
      }
    }
    
    // 🚀 CRÍTICO: Cargar polígono si hay coordenadas válidas
    // Validar projectId pero ser más flexible (datos antiguos pueden no tener projectId)
    if (polygonCoords && polygonCoords.length >= 3) {
      // Validar projectId - si no existe, asumir que es del proyecto actual (datos antiguos)
      const hasValidProjectId = !locationData.projectId || locationData.projectId === currentProject.id;
      
      if (hasValidProjectId) {
        // Si no tiene projectId, agregarlo para futuras validaciones
        if (!locationData.projectId) {
          locationData.projectId = currentProject.id;
          // Actualizar en localStorage también
          if (useCentralized && window.projectStorage) {
            window.projectStorage.saveSection('location', locationData, currentProject.id);
            console.log('ℹ️ Location sin projectId - agregado y guardado');
          }
        }
        
        console.log('✅ Cargando polígono válido para proyecto:', currentProject.id, {
          polygonPoints: polygonCoords.length,
          projectId: locationData.projectId
        });
        
        // 🚀 CRÍTICO: Limpiar SOLO AHORA, justo antes de cargar el polígono guardado
        // Esto evita que se limpie después de cargar o que se limpie dos veces
        console.log('🧹 Limpiando polígonos del mapa para cargar polígono guardado...');
        this.forceRemoveAllPolygons();
        
        // Cargar el polígono guardado
        this.loadSavedPolygon({ ...locationData, coordinates: polygonCoords });
        setTimeout(() => this.fitMapToCurrentProjectLocation(), 150);
        return locationData;
      } else {
        console.warn('⚠️ Polígono válido pero projectId NO coincide. NO cargando.', {
          expected: currentProject.id,
          found: locationData.projectId
        });
        // Limpiar display
        this.updateDisplay();
        this.updateInstructions('📍 Haz clic en el mapa para trazar tu parcela');
        return null;
      }
    } else {
      // No hay polígono válido - ya está todo limpio arriba
      console.log('ℹ️ No hay polígono válido para este proyecto');
      this.updateDisplay();
      this.updateInstructions('📍 Haz clic en el mapa para trazar tu parcela');
      return null;
    }
  }
  
  // Nueva función para limpiar todos los polígonos de forma centralizada
  // 🚀 CRÍTICO: Elimina TODOS los polígonos del mapa, no solo los rastreados
  clearAllPolygons() {
    console.log('🧹 Limpiando TODOS los polígonos del mapa...');
    
    // 🚀 CRÍTICO: Primero eliminar polígonos rastreados
    // Limpiar polígono actual
    if (this.polygon) {
      try {
        google.maps.event.clearListeners(this.polygon);
        if (this.polygon.getPath) {
          google.maps.event.clearListeners(this.polygon.getPath());
        }
        this.polygon.setMap(null);
        this.polygon = null;
        console.log('✅ Polígono actual eliminado');
      } catch (e) {
        console.warn('⚠️ Error eliminando polígono actual:', e);
        this.polygon = null;
      }
    }
    
    // Limpiar polígono guardado
    if (this.savedPolygon) {
      try {
        google.maps.event.clearListeners(this.savedPolygon);
        if (this.savedPolygon.getPath) {
          google.maps.event.clearListeners(this.savedPolygon.getPath());
        }
        this.savedPolygon.setMap(null);
        this.savedPolygon = null;
        console.log('✅ Polígono guardado eliminado');
      } catch (e) {
        console.warn('⚠️ Error eliminando polígono guardado:', e);
        this.savedPolygon = null;
      }
    }
    
    // 🚀 CRÍTICO: Buscar y eliminar TODOS los polígonos del mapa (incluso los no rastreados)
    if (this.map) {
      // Método 1: Limpiar data layer si existe
      try {
        if (this.map.data) {
          this.map.data.forEach((feature) => {
            if (feature.getGeometry && feature.getGeometry().getType() === 'Polygon') {
              this.map.data.remove(feature);
            }
          });
        }
      } catch (e) {
        console.warn('⚠️ Error limpiando data layer:', e);
      }
      
      // Método 2: Forzar redibujado del mapa para eliminar cualquier rastro visual
      try {
        const currentZoom = this.map.getZoom();
        this.map.setZoom(currentZoom + 0.001);
        setTimeout(() => {
          this.map.setZoom(currentZoom);
        }, 50);
      } catch (e) {
        console.warn('⚠️ Error forzando redibujado:', e);
      }
    }
    
    // Limpiar marcadores temporales
    this.clearTempMarkers();
    
    console.log('✅ Todos los polígonos eliminados del mapa');
  }
  
  // 🚀 NUEVA: Función para eliminar TODOS los polígonos del mapa (más agresiva)
  forceRemoveAllPolygons() {
    console.log('🔥 FORZANDO eliminación de TODOS los polígonos...');
    
    // Primero usar clearAllPolygons
    this.clearAllPolygons();
    
    // 🚀 CRÍTICO: Resetear TODAS las variables a valores iniciales
    this.polygon = null;
    this.savedPolygon = null;
    this.polygonPath = [];
    this.coordinates = [];
    this.area = 0;
    this.perimeter = 0;
    this.loadedProjectId = null;
    this.currentPolygonProjectId = null;
    this.isDrawing = false;
    
    // Limpiar también el drawingManager
    if (this.drawingManager) {
      this.drawingManager.setDrawingMode(null);
    }
    
    // 🚀 CRÍTICO: Actualizar display DESPUÉS de resetear variables
    // Esto asegura que se muestren valores en 0 o "No seleccionadas"
    this.updateDisplay();
    
    console.log('✅ Eliminación forzada completada - variables reseteadas');
  }

  updateProjectIndicator(project) {
    const projectNameElement = document.getElementById('currentProjectName');
    if (projectNameElement) {
      if (project) {
        projectNameElement.textContent = project.name;
        projectNameElement.style.color = '#059669';
      } else {
        projectNameElement.textContent = 'Selecciona un proyecto';
        projectNameElement.style.color = '#6b7280';
      }
    }
  }

  loadSavedPolygon(locationData) {
    // 🚀 CRÍTICO: NO limpiar display aquí - los datos se actualizarán después de cargar el polígono
    // NO llamar forceClearLocationDisplay() porque borra los datos antes de cargarlos
    
    // 🚀 VALIDACIÓN CAPA 1: Validar que hay datos
    if (!locationData) {
      console.warn('⚠️ loadSavedPolygon: No hay datos, no cargando');
      this.updateDisplay();
      if (typeof setLocationAltitudeDisplay === 'function') setLocationAltitudeDisplay(null);
      return;
    }
    
    // 🚀 VALIDACIÓN CAPA 2: Validar projectId (CRÍTICO pero flexible)
    const currentProject = this.getCurrentProject();
    if (!currentProject || !currentProject.id) {
      console.warn('⚠️ loadSavedPolygon: No hay proyecto actual. NO cargando.');
      this.updateDisplay();
      if (typeof setLocationAltitudeDisplay === 'function') setLocationAltitudeDisplay(null);
      return;
    }
    
    // 🚀 CRÍTICO: Validar projectId pero ser flexible con datos antiguos
    // Si no tiene projectId, asumir que es del proyecto actual (datos antiguos)
    if (locationData.projectId && locationData.projectId !== currentProject.id) {
      console.warn('⚠️ loadSavedPolygon: Datos pertenecen a otro proyecto. NO cargando.', {
        expected: currentProject.id,
        found: locationData.projectId
      });
      this.updateDisplay();
      if (typeof setLocationAltitudeDisplay === 'function') setLocationAltitudeDisplay(null);
      return;
    }
    
    // Si no tiene projectId, agregarlo (datos antiguos)
    if (!locationData.projectId) {
      locationData.projectId = currentProject.id;
      console.log('ℹ️ loadSavedPolygon: Agregando projectId a datos antiguos:', currentProject.id);
    }
    
    // 🚀 VALIDACIÓN CAPA 3: Validar que hay polígono válido
    // Priorizar polygon sobre coordinates (formato estándar)
    let polygonCoords = locationData.polygon || locationData.coordinates;
    
    if (!polygonCoords || !Array.isArray(polygonCoords) || polygonCoords.length < 3) {
      console.warn('⚠️ loadSavedPolygon: No hay polígono válido (mínimo 3 puntos). NO cargando.');
      this.updateDisplay();
      if (typeof setLocationAltitudeDisplay === 'function') setLocationAltitudeDisplay(null);
      return;
    }
    
    // 🚀 VALIDACIÓN CAPA 4: Validar que NO es array de múltiples polígonos
    if (Array.isArray(polygonCoords[0]) && Array.isArray(polygonCoords[0][0])) {
      console.warn('⚠️ loadSavedPolygon: Se detectaron múltiples polígonos. Usando solo el primero.');
      polygonCoords = polygonCoords[0];
      if (!polygonCoords || polygonCoords.length < 3) {
        console.warn('⚠️ loadSavedPolygon: Primer polígono inválido. NO cargando.');
        this.updateDisplay();
        if (typeof setLocationAltitudeDisplay === 'function') setLocationAltitudeDisplay(null);
        return;
      }
    }

    // 🚀 Crear UN SOLO polígono desde datos guardados (formato estándar)
    const polygonPath = polygonCoords.map(coord => {
      // Asegurar que coord es [lat, lng] (formato estándar)
      if (Array.isArray(coord) && coord.length >= 2) {
        const lat = parseFloat(coord[0]);
        const lng = parseFloat(coord[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return new google.maps.LatLng(lat, lng);
        }
      }
      return null;
    }).filter(point => point !== null);

    if (polygonPath.length < 3) {
      console.warn('⚠️ loadSavedPolygon: No hay suficientes puntos válidos para crear polígono');
      this.updateDisplay();
      return;
    }
    
    console.log('✅ loadSavedPolygon: Polígono válido detectado:', {
      points: polygonPath.length,
      projectId: locationData.projectId
    });

    // 🚀 CRÍTICO: Validar que el mapa esté inicializado
    if (!this.map) {
      console.warn('⚠️ loadSavedPolygon: El mapa no está inicializado. Esperando inicialización...');
      // Esperar a que el mapa se inicialice
      setTimeout(() => {
        if (this.map) {
          this.loadSavedPolygon(locationData); // Reintentar
        } else {
          console.error('❌ loadSavedPolygon: El mapa no se inicializó después de esperar');
        }
      }, 500);
      return;
    }

    // 🚀 Crear UN SOLO polígono
    this.savedPolygon = new google.maps.Polygon({
      paths: polygonPath,
      fillColor: '#2563eb',
      fillOpacity: 0.3,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      editable: true,
      draggable: false
    });

    this.savedPolygon.setMap(this.map);
    this.savedPolygon.__nutriplantProjectId = String(currentProject.id);
    this.polygon = this.savedPolygon; // IMPORTANTE: Asignar también a this.polygon
    this.polygon.__nutriplantProjectId = String(currentProject.id);
    this.polygonPath = polygonPath;
    this.coordinates = polygonCoords;
    this.loadedProjectId = String(currentProject.id);
    this.currentPolygonProjectId = String(currentProject.id);
    
    // Usar valores guardados si existen, sino calcular
    if (locationData.area && locationData.area > 0) {
      this.area = locationData.area;
    } else if (locationData.areaHectares != null && Number(locationData.areaHectares) > 0) {
      this.area = Number(locationData.areaHectares) * 10000;
    }
    if (locationData.perimeter != null && Number(locationData.perimeter) > 0) {
      this.perimeter = Number(locationData.perimeter);
    }
    
    // SIEMPRE recalcular para asegurar que el perímetro esté correcto
    // (por si el valor guardado estaba incorrecto o faltante)
    this.calculateAreaAndPerimeter();

    // Agregar event listeners para edición del polígono cargado
    this.addPolygonEditListeners();

    // Actualizar la interfaz
    this.updateDisplay();
    if (typeof setLocationAltitudeDisplay === 'function') {
      if (Object.prototype.hasOwnProperty.call(locationData, 'elevationM')) {
        var elv = Number(locationData.elevationM);
        setLocationAltitudeDisplay(Number.isFinite(elv) ? elv : null);
      }
    }
    
    // 🚀 CRÍTICO: Solo mostrar mensaje "Predio cargado" si realmente se cargó un polígono válido y visible
    // Validar una vez más que el polígono está en el mapa
    if (this.savedPolygon && this.savedPolygon.getMap() && this.savedPolygon.getMap() === this.map) {
      this.updateInstructions('✅ Predio cargado - Puedes editarlo o guardar cambios');
      setTimeout(() => this.fitMapToVisiblePolygon(this.savedPolygon), 120);
      console.log('✅ UN solo polígono cargado y visible correctamente:', {
        points: polygonPath.length,
        projectId: locationData.projectId
      });
    } else {
      // Si no se pudo cargar el polígono, no mostrar mensaje confuso
      this.updateInstructions('📍 Haz clic en el mapa para trazar tu parcela');
      console.warn('⚠️ Polígono no se pudo cargar en el mapa');
    }
  }
}

// Inicializar el mapa cuando se carga la página
let nutriPlantMap = null;

// FUNCIÓN CRÍTICA: Limpiar elementos del DOM inmediatamente
function setLocationAltitudeDisplay(elevationM) {
  const altitudeEl = document.getElementById('altitudeDisplay');
  if (!altitudeEl) return;
  const meters = Number(elevationM);
  altitudeEl.textContent = Number.isFinite(meters) ? `${Math.round(meters)} msnm` : 'N/D';
}

function forceClearLocationDisplay() {
  console.log('🧹 FORZANDO limpieza de elementos de ubicación...');
  const coordinatesEl = document.getElementById('coordinatesDisplay');
  const areaEl = document.getElementById('areaDisplay');
  const perimeterEl = document.getElementById('perimeterDisplay');
  
  if (coordinatesEl) {
    coordinatesEl.textContent = 'No seleccionadas';
  }
  if (areaEl) {
    areaEl.textContent = '0.00 ha (0.00 acres)';
  }
  if (perimeterEl) {
    perimeterEl.textContent = '0.00 m';
  }
  setLocationAltitudeDisplay(null);
  console.log('✅ Elementos de ubicación limpiados');
}

/** Radar NDVI (Netlify /api/radar-ndvi): capa opcional sobre el polígono */
let radarGroundOverlay = null;
let radarPreviousPolygonStyles = null;
let radarOutlinePolygons = [];
let radarActiveIndex = 'ndvi';

const RADAR_INDEX_CONFIG = {
  ndvi: {
    label: 'NDVI',
    busyLabel: 'NDVI',
    title: 'Escala NDVI relativa al predio',
    low: 'Menor nivel del predio',
    high: 'Mayor nivel del predio',
    help: 'Verde = mayor vigor dentro del mismo predio; rojo/naranja = menor vigor relativo.',
    gradient: 'linear-gradient(90deg,#8b0000,#d73027,#fdae61,#ffffbf,#a6d96a,#1a9850,#006837)',
    shownText: 'NDVI en mapa.',
    loadingText: 'Cargando imagen NDVI en el mapa...'
  },
  ndmi: {
    label: 'NDMI',
    busyLabel: 'NDMI',
    title: 'Escala NDMI relativa al predio',
    low: 'Menor humedad relativa',
    high: 'Mayor humedad relativa',
    help: 'NDMI = humedad relativa dentro del mismo predio; interpretar junto con NDVI, VPD, riego y campo.',
    gradient: 'linear-gradient(90deg,#7c2d12,#ea580c,#f59e0b,#fde68a,#bbf7d0,#22c55e,#0f766e,#0369a1)',
    shownText: 'NDMI en mapa.',
    loadingText: 'Cargando imagen NDMI en el mapa...'
  }
};

function np_getRadarIndexConfig(index) {
  return RADAR_INDEX_CONFIG[index] || RADAR_INDEX_CONFIG.ndvi;
}

function np_getSelectedRadarIndex() {
  const select = document.getElementById('radarIndexSelect');
  const value = select ? String(select.value || '').toLowerCase() : radarActiveIndex;
  return value === 'ndmi' ? 'ndmi' : 'ndvi';
}

function np_setSelectedRadarIndex(index) {
  radarActiveIndex = index === 'ndmi' ? 'ndmi' : 'ndvi';
  const select = document.getElementById('radarIndexSelect');
  if (select) select.value = radarActiveIndex;
  np_updateRadarScaleUi();
}

function np_updateRadarScaleUi(indexOverride) {
  const idx =
    indexOverride === 'ndvi' || indexOverride === 'ndmi' ? indexOverride : np_getSelectedRadarIndex();
  const cfg = np_getRadarIndexConfig(idx);
  const title = document.getElementById('radarScaleTitle');
  const low = document.getElementById('radarScaleLow');
  const high = document.getElementById('radarScaleHigh');
  const bar = document.getElementById('radarScaleBar');
  const help = document.getElementById('radarNdviHelp');
  if (title) title.textContent = cfg.title;
  if (low) low.textContent = cfg.low;
  if (high) high.textContent = cfg.high;
  if (bar) bar.style.background = cfg.gradient;
  if (help) help.textContent = cfg.help;
}

function np_getRadarSignedUrl(data, index) {
  const snap = data && (data.snapshot || data.latest) ? data.snapshot || data.latest : data;
  if (!snap) return '';
  if (index === 'ndmi') {
    return snap.ndmi_signed_url || snap.images?.ndmi?.signed_url || '';
  }
  return snap.signed_url || snap.images?.ndvi?.signed_url || '';
}

function np_formatRadarDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) {
    return String(iso);
  }
}

function np_formatRadarHistoryOption(item) {
  if (!item) return 'Imagen Radar';
  const gen = np_formatRadarDateTime(item.created_at);
  const sp = item.sentinel_period || {};
  if (sp.from && sp.to) return gen + ' · Sentinel ' + sp.from + ' – ' + sp.to;
  if (item.month_key) return gen + ' · ' + item.month_key;
  return gen;
}

function np_formatRadarDisplayedCaption(snap, overlayCtx) {
  if (!snap) return '';
  const parts = [];
  if (snap.created_at) parts.push('Generada ' + np_formatRadarDateTime(snap.created_at));
  const meta = snap.meta || {};
  const from = meta.date_start || snap.sentinel_period?.from;
  const to = meta.date_end || snap.sentinel_period?.to;
  if (from && to) parts.push('Sentinel ' + from + ' – ' + to);
  const locNote = np_formatRadarLocationNote(overlayCtx, snap);
  if (locNote) parts.push(locNote);
  return parts.length ? parts.join(' · ') : '';
}

function np_getSelectedRadarRequestId() {
  const sel = document.getElementById('radarSnapshotSelect');
  if (!sel || sel.disabled) return '';
  return String(sel.value || '').trim();
}

function np_getPreferredRadarRequestId() {
  const selId = np_getSelectedRadarRequestId();
  if (selId) return selId;
  const proj =
    (nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function'
      ? nutriPlantMap.getCurrentProject()
      : null) ||
    (typeof window.currentProject !== 'undefined' ? window.currentProject : null);
  const saved = proj && proj.location && proj.location.radarSelectedRequestId;
  return saved != null ? String(saved).trim() : '';
}

function np_persistRadarSnapshotSelection(requestId) {
  const reqId = requestId != null ? String(requestId).trim() : '';
  const proj =
    (nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function'
      ? nutriPlantMap.getCurrentProject()
      : null) ||
    (typeof window.currentProject !== 'undefined' ? window.currentProject : null);
  if (!proj || !proj.id) return;
  const pid = proj.id;
  let loc = null;
  if (typeof window.projectStorage !== 'undefined' && window.projectStorage.loadSection) {
    loc = window.projectStorage.loadSection('location', pid) || {};
  } else {
    loc = Object.assign({}, proj.location || {});
  }
  if (reqId) loc.radarSelectedRequestId = reqId;
  else delete loc.radarSelectedRequestId;
  if (typeof window.projectStorage !== 'undefined' && window.projectStorage.saveSection) {
    window.projectStorage.saveSection('location', loc, pid);
  } else {
    const key = 'nutriplant_project_' + pid;
    try {
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : {};
      data.location = loc;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('np_persistRadarSnapshotSelection:', e);
    }
  }
  if (typeof window.currentProject !== 'undefined' && window.currentProject && window.currentProject.id === pid) {
    window.currentProject.location = Object.assign({}, window.currentProject.location || {}, loc);
  }
}

function np_populateRadarSnapshotSelect(history, preferredId) {
  const sel = document.getElementById('radarSnapshotSelect');
  if (!sel) return;
  const list = Array.isArray(history) ? history : [];
  const prev = preferredId || np_getSelectedRadarRequestId();
  sel.innerHTML = '';
  if (!list.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Sin imágenes guardadas';
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }
  list.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = String(item.id);
    opt.textContent = (idx === 0 ? 'Más reciente · ' : '') + np_formatRadarHistoryOption(item);
    sel.appendChild(opt);
  });
  sel.disabled = false;
  const match = list.find((h) => String(h.id) === String(prev));
  sel.value = match ? String(match.id) : String(list[0].id);
}

function np_snapshotFromRadarApi(data) {
  if (!data) return null;
  if (data.snapshot) return data.snapshot;
  if (data.latest) return data.latest;
  if (data.meta) {
    return {
      created_at: data.request?.created_at || null,
      meta: data.meta
    };
  }
  return null;
}

function np_updateRadarStatusHintFromSelection() {
  const hint = document.getElementById('radarStatusHint');
  const sel = document.getElementById('radarSnapshotSelect');
  if (!hint || !sel || sel.disabled) return;
  const st = window.__nutriplantRadarNdviStatus;
  const id = np_getSelectedRadarRequestId();
  const item = (st?.history || []).find((h) => String(h.id) === String(id));
  if (item) {
    hint.textContent =
      'Imagen seleccionada: ' +
      np_formatRadarHistoryOption(item) +
      '. Pulsa «Ver en mapa» para superponerla.';
  }
}

/** Timestamp de la última imagen Radar en caché de estado (para detectar éxito “tardío”). */
function np_getRadarLatestCreatedAtFromStatus(st) {
  if (!st || !st.ok) return null;
  return st.latestCreatedAt || (st.latest && st.latest.created_at) || null;
}

/**
 * Tras un error HTTP/red, el servidor a veces sí guardó la imagen. Si hay fila nueva respecto
 * a prevCreatedAt, mostrar overlay y evitar alertas falsas.
 */
async function np_recoverRadarIfBackendSucceeded(prevCreatedAt, bounds) {
  await window.refreshRadarNdviStatus();
  const st = window.__nutriplantRadarNdviStatus;
  const newAt = np_getRadarLatestCreatedAtFromStatus(st);
  if (!newAt || !st?.latest) return false;
  if (prevCreatedAt != null && String(newAt) === String(prevCreatedAt)) return false;
  const url = np_getRadarSignedUrl({ latest: st.latest }, np_getSelectedRadarIndex());
  if (!url) return false;
  try {
    const snap = st.latest || null;
    await np_applyRadarOverlay(url, snap, np_getSelectedRadarIndex());
    const hint = document.getElementById('radarStatusHint');
    const cfg = np_getRadarIndexConfig(np_getSelectedRadarIndex());
    const overlayCtx = np_getRadarOverlayContext(snap);
    if (hint) {
      hint.textContent =
        cfg.shownText +
        ' ' +
        np_formatRadarDisplayedCaption(snap, overlayCtx) +
        ' La respuesta del servidor tardó; la imagen ya estaba lista.';
    }
    return true;
  } catch (e) {
    console.warn('Radar recuperación tras error:', e);
    return false;
  }
}

function np_getRadarPolygons() {
  if (!nutriPlantMap) return [];
  return [...new Set([nutriPlantMap.savedPolygon, nutriPlantMap.polygon].filter(Boolean))];
}

function np_setRadarPolygonMask(active, snapshotCoords) {
  const polygons = np_getRadarPolygons();
  if (active) {
    if (typeof google === 'undefined' || !google.maps || !nutriPlantMap || !nutriPlantMap.map) return;
    if (!radarPreviousPolygonStyles) {
      radarPreviousPolygonStyles = polygons.map((poly) => ({
        poly,
        map: poly.getMap ? poly.getMap() : nutriPlantMap.map,
        fillOpacity: poly.get('fillOpacity'),
        strokeOpacity: poly.get('strokeOpacity'),
        strokeWeight: poly.get('strokeWeight')
      }));
    }
    radarOutlinePolygons.forEach((poly) => poly.setMap(null));
    radarOutlinePolygons = [];

    const useSnapshot =
      Array.isArray(snapshotCoords) && snapshotCoords.length >= 3;
    if (useSnapshot) {
      const path = snapshotCoords.map((c) => ({
        lat: Number(c[0]),
        lng: Number(c[1])
      }));
      const outline = new google.maps.Polygon({
        paths: path,
        fillOpacity: 0,
        strokeColor: '#2563eb',
        strokeOpacity: 1,
        strokeWeight: 3,
        clickable: false,
        editable: false,
        draggable: false,
        zIndex: 10050
      });
      outline.setMap(nutriPlantMap.map);
      radarOutlinePolygons.push(outline);
      polygons.forEach((poly) => {
        poly.setOptions({
          fillOpacity: 0,
          strokeOpacity: 0,
          strokeWeight: 0,
          clickable: false
        });
      });
      return;
    }

    polygons.forEach((poly) => {
      const outline = new google.maps.Polygon({
        paths: poly.getPath ? poly.getPath().getArray() : [],
        fillOpacity: 0,
        strokeColor: '#2563eb',
        strokeOpacity: 1,
        strokeWeight: 3,
        clickable: false,
        editable: false,
        draggable: false,
        zIndex: 10050
      });
      outline.setMap(nutriPlantMap.map);
      radarOutlinePolygons.push(outline);
      poly.setOptions({
        fillOpacity: 0,
        strokeOpacity: 0,
        strokeWeight: 0,
        clickable: false
      });
    });
    return;
  }
  radarOutlinePolygons.forEach((poly) => poly.setMap(null));
  radarOutlinePolygons = [];
  if (radarPreviousPolygonStyles) {
    radarPreviousPolygonStyles.forEach(({ poly, map, fillOpacity, strokeOpacity, strokeWeight }) => {
      if (!poly) return;
      poly.setMap(map || (nutriPlantMap && nutriPlantMap.map) || null);
      poly.setOptions({ fillOpacity, strokeOpacity, strokeWeight });
    });
    radarPreviousPolygonStyles = null;
  }
}

function np_showRadarLegend(show) {
  const scale = document.getElementById('radarNdviScale');
  if (scale) scale.style.display = 'flex';
}

function np_setRadarBusy(isBusy, message) {
  const buttons = ['radarBtnRefresh', 'radarBtnView', 'radarBtnGenerate', 'radarBtnHide']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const generateBtn = document.getElementById('radarBtnGenerate');
  const hint = document.getElementById('radarStatusHint');

  if (generateBtn) {
    if (isBusy) {
      if (!generateBtn.dataset.originalText) generateBtn.dataset.originalText = generateBtn.textContent || 'Generar / actualizar Pilot';
      generateBtn.textContent = '⏳ Generando Pilot...';
      generateBtn.classList.add('radar-loading');
    } else {
      generateBtn.textContent = generateBtn.dataset.originalText || '🛰 Generar / actualizar Pilot';
      generateBtn.classList.remove('radar-loading');
    }
  }

  buttons.forEach((btn) => {
    btn.disabled = !!isBusy;
    btn.style.opacity = isBusy ? '0.72' : '';
    btn.style.cursor = isBusy ? 'wait' : '';
  });

  if (isBusy && hint) {
    hint.textContent =
      message ||
      'Generando imágenes Pilot NDVI y NDMI... puede tardar ~1–2 min. Si termina y no ves el mapa, pulsa «Ver en mapa».';
  }
}

function np_isCloudSupabaseUser() {
  const id = localStorage.getItem('nutriplant_user_id');
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function np_getRadarAccessToken() {
  if (typeof window.getSupabaseClient !== 'function') return null;
  const client = window.getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.access_token || null;
}

function np_radarApiUrl() {
  const base =
    typeof window.getNutriPlantApiBase === 'function' ? window.getNutriPlantApiBase() : '';
  return (base || '').replace(/\/$/, '') + '/api/radar-ndvi';
}

function np_radarPilotApiUrl() {
  const base =
    typeof window.getNutriPlantApiBase === 'function' ? window.getNutriPlantApiBase() : '';
  return (base || '').replace(/\/$/, '') + '/api/radar-cdse-pilot';
}

function np_clearRadarPilotState() {
  window.__nutriplantRadarPilot = null;
}

function np_getPilotRadarIndex() {
  return np_getSelectedRadarIndex();
}

function np_setPilotRadarIndex(index) {
  window.__nutriplantRadarPilotLayer = index === 'ndmi' ? 'ndmi' : 'ndvi';
  np_setSelectedRadarIndex(window.__nutriplantRadarPilotLayer);
  np_updatePilotLayerButtonUi();
}

function np_updatePilotLayerButtonUi() {
  const btn = document.getElementById('radarBtnPilotLayer');
  if (!btn) return;
  const idx = np_getPilotRadarIndex();
  btn.textContent = idx === 'ndmi' ? 'NDMI' : 'NDVI';
  btn.title =
    idx === 'ndmi'
      ? 'Pilot: mostrando NDMI humedad dosel (clic → NDVI)'
      : 'Pilot: mostrando NDVI vigor (clic → NDMI)';
  btn.setAttribute('aria-pressed', idx === 'ndmi' ? 'true' : 'false');
}

async function np_togglePilotRadarLayer() {
  const next = np_getPilotRadarIndex() === 'ndmi' ? 'ndvi' : 'ndmi';
  np_setPilotRadarIndex(next);
  const pilot = window.__nutriplantRadarPilot;
  if (!pilot || !pilot.active) return;
  np_updateRadarScaleUi(next);
  const url = np_getRadarPilotDataUrl(next);
  if (!url || !nutriPlantMap || !np_getPolygonBoundsFromMap()) return;
  await np_applyRadarPilotOverlay(url, next);
  const hint = document.getElementById('radarStatusHint');
  const cfg = np_getRadarIndexConfig(next);
  if (hint) {
    hint.textContent =
      'Capa ' + cfg.label + ' activa. Cambia NDVI/NDMI desde el selector.';
  }
}

function np_formatPilotOkHint(data, layerIndex) {
  const comp = data.composite || {};
  const sceneCount = comp.scene_count != null ? comp.scene_count : 1;
  const dateRange =
    comp.date_start && comp.date_end && comp.date_start !== comp.date_end
      ? comp.date_start + ' – ' + comp.date_end
      : comp.date_end || comp.date_start || '';
  const cfg = np_getRadarIndexConfig(layerIndex);
  return (
    'Imagen guardada · mostrando ' +
    cfg.label +
    ' · mediana ' +
    (comp.lookback_days || 30) +
    ' d · ' +
    sceneCount +
    ' escena' +
    (sceneCount === 1 ? '' : 's') +
    ' · SCL' +
    (dateRange ? ' · ' + dateRange : '') +
    '. Cambia NDVI/NDMI desde el selector.'
  );
}

function np_getRadarPilotDataUrl(index) {
  const pilot = window.__nutriplantRadarPilot;
  if (!pilot || !pilot.active) return '';
  if (index === 'ndmi') {
    return pilot.ndmi_signed_url || pilot.images?.ndmi?.signed_url || pilot.ndmi_data_url || pilot.images?.ndmi?.data_url || '';
  }
  return pilot.signed_url || pilot.images?.ndvi?.signed_url || pilot.ndvi_data_url || pilot.images?.ndvi?.data_url || '';
}

function np_polygonCoordsForPilot() {
  if (nutriPlantMap && Array.isArray(nutriPlantMap.coordinates) && nutriPlantMap.coordinates.length >= 3) {
    return nutriPlantMap.coordinates.map((c) => {
      if (Array.isArray(c)) return [Number(c[0]), Number(c[1])];
      return [Number(c.lat), Number(c.lng)];
    });
  }
  const proj =
    nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function'
      ? nutriPlantMap.getCurrentProject()
      : null;
  const poly = proj && proj.location && proj.location.polygon;
  if (!Array.isArray(poly) || poly.length < 3) return null;
  return poly.map((pt) => {
    if (Array.isArray(pt)) return [Number(pt[0]), Number(pt[1])];
    return [Number(pt.lat), Number(pt.lng)];
  });
}

function np_formatRadarCreditLine(pricing) {
  if (!pricing) return '';
  const ha = pricing.area_hectares;
  const cost = Number(pricing.credits_charged) || 1;
  if (ha != null && Number.isFinite(Number(ha))) {
    return (
      Number(ha).toFixed(2) +
      ' ha → ' +
      cost +
      ' crédito' +
      (cost === 1 ? '' : 's') +
      ' por generación (NDVI+NDMI)'
    );
  }
  return cost + ' crédito' + (cost === 1 ? '' : 's') + ' por generación (NDVI+NDMI)';
}

function np_getRadarGenerationCreditCost() {
  const pricing = window.__nutriplantRadarNdviStatus?.pricing;
  const cost = Number(pricing?.credits_charged);
  return Number.isFinite(cost) && cost > 0 ? Math.floor(cost) : 1;
}

function np_getPolygonBoundsFromMap() {
  if (!nutriPlantMap || typeof google === 'undefined' || !google.maps || !nutriPlantMap.coordinates) return null;
  if (!Array.isArray(nutriPlantMap.coordinates) || nutriPlantMap.coordinates.length < 3) return null;
  return np_boundsFromLatLngCoords(nutriPlantMap.coordinates);
}

function np_boundsFromLatLngCoords(coords) {
  if (!coords || !coords.length || typeof google === 'undefined' || !google.maps) return null;
  const bounds = new google.maps.LatLngBounds();
  coords.forEach((c) => {
    const lat = Array.isArray(c) ? Number(c[0]) : Number(c.lat);
    const lng = Array.isArray(c) ? Number(c[1]) : Number(c.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      bounds.extend(new google.maps.LatLng(lat, lng));
    }
  });
  return bounds;
}

function np_normalizeRadarPolygonCoords(source) {
  if (!source) return null;
  const loc = source.location_snapshot || source;
  const poly = loc.polygon;
  if (!Array.isArray(poly) || poly.length < 3) return null;
  const out = [];
  poly.forEach((pt) => {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lat = Number(pt[0]);
      const lng = Number(pt[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
    } else if (pt && pt.lat != null && pt.lng != null) {
      const lat = Number(pt.lat);
      const lng = Number(pt.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
    }
  });
  return out.length >= 3 ? out : null;
}

function np_centerOfCoords(coords) {
  if (!coords || !coords.length) return null;
  let sumLat = 0;
  let sumLng = 0;
  coords.forEach((c) => {
    sumLat += Number(c[0]);
    sumLng += Number(c[1]);
  });
  return [sumLat / coords.length, sumLng / coords.length];
}

function np_radarMapDiffersFromSnapshot(snapshotCoords) {
  const current = nutriPlantMap && nutriPlantMap.coordinates;
  if (!snapshotCoords || snapshotCoords.length < 3 || !current || current.length < 3) return false;
  const a = np_centerOfCoords(snapshotCoords);
  const b = np_centerOfCoords(current);
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) > 0.00015 || Math.abs(a[1] - b[1]) > 0.00015;
}

/** Bounds y polígono para superponer Radar: prioriza coordenadas guardadas al generar. */
function np_getRadarOverlayContext(snap) {
  const meta = (snap && snap.meta) || {};
  const snapshotCoords = np_normalizeRadarPolygonCoords(meta);
  if (snapshotCoords) {
    const bounds = np_boundsFromLatLngCoords(snapshotCoords);
    if (bounds) {
      return {
        bounds,
        polygon: snapshotCoords,
        fromSnapshot: true,
        center: meta.location_snapshot && meta.location_snapshot.center ? meta.location_snapshot.center : null
      };
    }
  }
  return {
    bounds: np_getPolygonBoundsFromMap(),
    polygon: nutriPlantMap && nutriPlantMap.coordinates ? nutriPlantMap.coordinates.slice() : null,
    fromSnapshot: false,
    center: null
  };
}

function np_formatRadarLocationNote(overlayCtx, snap) {
  if (!overlayCtx) return '';
  const meta = (snap && snap.meta) || {};
  const loc = meta.location_snapshot;
  if (overlayCtx.fromSnapshot && loc && loc.center) {
    const lat = Number(loc.center.lat).toFixed(4);
    const lng = Number(loc.center.lng).toFixed(4);
    let note = 'Centro del predio ' + lat + ', ' + lng;
    if (np_radarMapDiffersFromSnapshot(overlayCtx.polygon)) {
      note += '. El polígono actual del mapa es distinto';
    }
    return note;
  }
  if (!overlayCtx.fromSnapshot) {
  return 'Usando el predio actual del mapa';
  }
  return '';
}

function np_showRadarOverlay(url, bounds, opacity = 0.98, opts) {
  if (typeof google === 'undefined' || !google.maps || !nutriPlantMap || !nutriPlantMap.map) return;
  if (radarGroundOverlay) {
    radarGroundOverlay.setMap(null);
    radarGroundOverlay = null;
  }
  const overlayOpts = opts || {};
  const isPilotLayer = overlayOpts.pilot === true;
  if (isPilotLayer) {
    window.__nutriplantRadarOverlaySource = 'pilot';
  } else if (overlayOpts.pilot === false) {
    window.__nutriplantRadarOverlaySource = 'google';
  }
  const indexForLabel =
    overlayOpts.index ||
    (isPilotLayer ? np_getPilotRadarIndex() : np_getSelectedRadarIndex());
  const containerOpacity = isPilotLayer ? '1' : String(Math.min(Math.max(opacity, 0.86), 0.92));
  const visualFilter = isPilotLayer ? 'none' : 'saturate(1.35) contrast(1.15)';
  const overlay = new google.maps.OverlayView();
  overlay.onAdd = function() {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '9999';
    div.style.opacity = containerOpacity;
    div.style.mixBlendMode = 'normal';
    div.style.filter = 'none';
    div.style.background = 'transparent';
    div.style.border = '0';
    div.style.boxShadow = 'none';
    div.style.overflow = 'hidden';
    div.style.borderRadius = '0';
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Radar ' + np_getRadarIndexConfig(indexForLabel).label;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
    img.style.objectFit = 'fill';
    img.style.pointerEvents = 'none';
    img.style.opacity = '1';
    img.style.filter = visualFilter;
    img.style.imageRendering = 'auto';
    img.onload = () => {
      console.log('✅ Imagen Radar cargada en overlay');
      if (typeof overlay.draw === 'function') overlay.draw();
    };
    img.onerror = () => {
      console.error('❌ La imagen Radar no pudo cargarse en el navegador:', url);
      const hint = document.getElementById('radarStatusHint');
      if (hint) hint.textContent = 'No se pudo cargar la imagen Radar firmada. Vuelve a pulsar Ver en mapa.';
    };
    div.appendChild(img);
    this.div = div;
    const panes = this.getPanes();
    (panes.floatPane || panes.overlayMouseTarget || panes.overlayLayer).appendChild(div);
  };
  overlay.draw = function() {
    if (!this.div) return;
    const projection = this.getProjection();
    const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
    const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
    const left = Math.min(sw.x, ne.x);
    const top = Math.min(sw.y, ne.y);
    const width = Math.abs(ne.x - sw.x);
    const height = Math.abs(sw.y - ne.y);
    this.div.style.left = left + 'px';
    this.div.style.top = top + 'px';
    this.div.style.width = Math.max(width, 2) + 'px';
    this.div.style.height = Math.max(height, 2) + 'px';
    this.div.style.display = 'block';
    console.log('🛰️ Radar overlay draw:', { left, top, width, height });
  };
  overlay.onRemove = function() {
    if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
    this.div = null;
  };
  overlay.setMap(nutriPlantMap.map);
  radarGroundOverlay = overlay;
}

function np_preloadRadarImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('La imagen Radar no cargó'));
    img.src = url;
  });
}

async function np_applyRadarPilotOverlay(url, index) {
  const hint = document.getElementById('radarStatusHint');
  const idx = index === 'ndmi' || index === 'ndvi' ? index : np_getPilotRadarIndex();
  const cfg = np_getRadarIndexConfig(idx);
  const bounds = np_getPolygonBoundsFromMap();
  if (!bounds) {
    if (hint) hint.textContent = 'No hay polígono en el mapa para anclar el pilot.';
    return;
  }
  if (hint) hint.textContent = cfg.loadingText;
  await np_preloadRadarImage(url);
  if (radarGroundOverlay) {
    radarGroundOverlay.setMap(null);
    radarGroundOverlay = null;
  }
  np_setRadarPolygonMask(false);
  np_updateRadarScaleUi(idx);
  np_showRadarOverlay(url, bounds, 0.98, { pilot: true, index: idx });
  np_setRadarPolygonMask(true, null);
  np_showRadarLegend(true);
  if (nutriPlantMap && nutriPlantMap.map && bounds) {
    nutriPlantMap.map.fitBounds(bounds, { padding: 50 });
  }
}

async function np_applyRadarOverlay(url, snap, index) {
  const hint = document.getElementById('radarStatusHint');
  const cfg = np_getRadarIndexConfig(index || np_getSelectedRadarIndex());
  const overlayCtx = np_getRadarOverlayContext(snap);
  const bounds = overlayCtx && overlayCtx.bounds;
  if (!bounds) {
    if (hint) hint.textContent = 'No hay coordenadas para ubicar esta imagen Radar.';
    return;
  }
  if (hint) hint.textContent = cfg.loadingText;
  await np_preloadRadarImage(url);
  if (radarGroundOverlay) {
    radarGroundOverlay.setMap(null);
    radarGroundOverlay = null;
  }
  np_setRadarPolygonMask(false);
  np_setSelectedRadarIndex(index || np_getSelectedRadarIndex());
  const isPilotSnapshot = !!(snap && snap.meta && snap.meta.pilot);
  np_showRadarOverlay(url, bounds, 0.98, { pilot: isPilotSnapshot, index: index || np_getSelectedRadarIndex() });
  np_setRadarPolygonMask(
    true,
    overlayCtx.fromSnapshot ? overlayCtx.polygon : null
  );
  np_showRadarLegend(true);
  if (nutriPlantMap && nutriPlantMap.map && bounds) {
    nutriPlantMap.map.fitBounds(bounds, { padding: 50 });
  }
  if (hint) {
    const cap = np_formatRadarDisplayedCaption(snap, overlayCtx);
    hint.textContent = cfg.shownText + (cap ? ' ' + cap : '');
  }
}

window.refreshRadarNdviStatus = async function refreshRadarNdviStatus() {
  const label = document.getElementById('radarCreditsLabel');
  const hint = document.getElementById('radarStatusHint');
  if (!label) return;
  if (!np_isCloudSupabaseUser()) {
    label.textContent = 'Pilot: requiere cuenta nube';
    if (hint) hint.textContent = 'Inicia sesión con tu cuenta NutriPlant en la nube para usar Radar.';
    return;
  }
  const token = await np_getRadarAccessToken();
  if (!token) {
    label.textContent = 'Pilot: sin sesión';
    return;
  }
  const proj =
    nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function'
      ? nutriPlantMap.getCurrentProject()
      : null;
  if (!proj || !proj.id) {
    label.textContent = 'Créditos Radar: —';
    return;
  }
  label.textContent = 'Pilot: consultando imágenes…';
  try {
    const res = await fetch(np_radarApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'status', project_id: String(proj.id) })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      label.textContent = 'Pilot: error de historial';
      if (hint) hint.textContent = data.message || data.error || 'No se pudo consultar Radar.';
      np_populateRadarSnapshotSelect([]);
      window.__nutriplantRadarNdviStatus = {
        ok: false,
        projectId: proj.id,
        updatedAt: new Date().toISOString(),
        error: data.message || data.error || 'No se pudo consultar Radar.'
      };
      return;
    }
    const u = Number(data.credits?.used) || 0;
    const l = Number(data.credits?.limit) || 0;
    const disponibles = Math.max(0, l - u);
    const history = Array.isArray(data.history) ? data.history : [];
    np_populateRadarSnapshotSelect(history, np_getPreferredRadarRequestId());
    window.__nutriplantRadarNdviStatus = {
      ok: true,
      projectId: proj.id,
      updatedAt: new Date().toISOString(),
      credits: { used: u, limit: l, available: disponibles },
      pricing: data.pricing || null,
      latest: data.latest || null,
      history,
      hasLatestImage: !!data.latest?.signed_url,
      hasLatestNdmiImage: !!np_getRadarSignedUrl(data, 'ndmi'),
      latestCreatedAt: data.latest?.created_at || null,
      meta: data.latest?.meta || null
    };
    label.textContent =
      disponibles +
      ' disponibles de ' +
      l +
      ' este mes · ' +
      history.length +
      ' imagen' +
      (history.length === 1 ? '' : 'es') +
      ' guardada' +
      (history.length === 1 ? '' : 's');
    const costLine = np_formatRadarCreditLine(data.pricing || null);
    if (history.length) {
      np_updateRadarStatusHintFromSelection();
    } else if (hint) {
      hint.textContent = costLine
        ? costLine + '. Sincroniza el predio a la nube, luego genera la primera imagen Pilot.'
        : 'Sincroniza el predio a la nube, luego genera la primera imagen Pilot.';
    }
  } catch (e) {
    label.textContent = 'Pilot: sin conexión';
  }
};

window.initRadarNdviUi = function initRadarNdviUi() {
  const panel = document.getElementById('radarNdviPanel');
  if (!panel) return;
  if (panel.dataset.radarBound === '1') {
    return;
  }
  panel.dataset.radarBound = '1';
  np_setSelectedRadarIndex(radarActiveIndex);
  document.getElementById('radarSnapshotSelect')?.addEventListener('change', () => {
    np_persistRadarSnapshotSelection(np_getSelectedRadarRequestId());
    np_updateRadarStatusHintFromSelection();
    const busyGen = document.getElementById('radarBtnGenerate')?.classList.contains('radar-loading');
    if (busyGen) return;
    if (radarGroundOverlay && nutriPlantMap && np_getPolygonBoundsFromMap()) {
      window.showRadarNdviOnMap().catch((err) => {
        console.warn('Radar: cambio de imagen', err);
      });
    }
  });
  document.getElementById('radarIndexSelect')?.addEventListener('change', () => {
    np_setSelectedRadarIndex(np_getSelectedRadarIndex());
    const busyGen = document.getElementById('radarBtnGenerate')?.classList.contains('radar-loading');
    if (busyGen) return;

    const idx = np_getSelectedRadarIndex();
    np_updateRadarScaleUi(idx);
    window.__nutriplantRadarPilotLayer = idx;

    if (window.__nutriplantRadarOverlaySource === 'pilot' && radarGroundOverlay) {
      const url = np_getRadarPilotDataUrl(idx);
      if (url) {
        np_applyRadarPilotOverlay(url, idx).catch((err) => console.warn('Radar Pilot: cambio de capa', err));
        return;
      }
    }

    const requestId = np_getSelectedRadarRequestId();
    if (requestId && nutriPlantMap && np_getPolygonBoundsFromMap()) {
      window.showRadarNdviOnMap().catch((err) => {
        console.warn('Radar: cambio de capa', err);
        const hint = document.getElementById('radarStatusHint');
        const cfg = np_getRadarIndexConfig(idx);
        if (hint) {
          hint.textContent =
            'No se pudo cargar ' + cfg.label + '. Pulsa «Ver en mapa» o «Estado».';
        }
      });
      return;
    }

    if (radarGroundOverlay && nutriPlantMap && np_getPolygonBoundsFromMap()) {
      window.showRadarNdviOnMap().catch((err) => console.warn('Radar: cambio de capa', err));
      return;
    }

    const hint = document.getElementById('radarStatusHint');
    if (!hint) return;
    const cfg = np_getRadarIndexConfig(idx);
    const st = window.__nutriplantRadarNdviStatus;
    const hasLayer = idx === 'ndmi' ? st?.hasLatestNdmiImage : st?.hasLatestImage;
    if (st?.ok && hasLayer) {
      np_updateRadarStatusHintFromSelection();
    } else if (window.__nutriplantRadarPilot && window.__nutriplantRadarPilot.active) {
      hint.textContent = 'Capa Pilot: ' + cfg.label + '. Pulsa «Ver en mapa» o «Generar / actualizar Pilot».';
    }
  });
  document.getElementById('radarBtnRefresh')?.addEventListener('click', () => {
    window.refreshRadarNdviStatus();
  });
  document.getElementById('radarBtnView')?.addEventListener('click', () => {
    window.showRadarNdviOnMap();
  });
  document.getElementById('radarBtnGenerate')?.addEventListener('click', () => {
    window.generateRadarCdsePilot();
  });
  document.getElementById('radarBtnHide')?.addEventListener('click', () => {
    window.hideRadarNdviOverlay();
  });
  document.getElementById('radarBtnPilotCdse')?.addEventListener('click', () => {
    window.generateRadarCdsePilot();
  });
  document.getElementById('radarBtnPilotLayer')?.addEventListener('click', () => {
    np_togglePilotRadarLayer().catch((err) => console.warn('Pilot capa:', err));
  });
  np_setPilotRadarIndex(np_getPilotRadarIndex());
};

window.generateRadarCdsePilot = async function generateRadarCdsePilot() {
  const token = await np_getRadarAccessToken();
  if (!token) {
    alert('Inicia sesión con tu cuenta en la nube.');
    return;
  }
  const proj = nutriPlantMap && nutriPlantMap.getCurrentProject ? nutriPlantMap.getCurrentProject() : null;
  if (!proj || !proj.id) {
    alert('Selecciona un proyecto.');
    return;
  }
  const polygon = np_polygonCoordsForPilot();
  if (!polygon) {
    alert('Traza y guarda un polígono del predio antes de generar Radar Pilot.');
    return;
  }
  const bounds = np_getPolygonBoundsFromMap();
  if (!bounds) {
    alert('El polígono del mapa no es válido.');
    return;
  }
  const hint = document.getElementById('radarStatusHint');
  np_setRadarBusy(
    true,
    'Pilot Copernicus: calculando y guardando NDVI/NDMI con Sentinel-2… puede tardar ~1–2 min.'
  );
  try {
    const res = await fetch(np_radarPilotApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ polygon, project_id: String(proj.id) })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(
        (data.message || data.error || 'Pilot falló') +
          '\n\nSi estás en local: usa netlify dev o activa RADAR_CDSE_PILOT_ENABLED=true en Netlify.'
      );
      if (hint) hint.textContent = 'Pilot: error — ' + (data.message || data.error || res.status);
      return;
    }
    window.__nutriplantRadarPilot = {
      active: true,
      signed_url: data.signed_url || data.images?.ndvi?.signed_url,
      ndmi_signed_url: data.ndmi_signed_url || data.images?.ndmi?.signed_url,
      ndvi_data_url: data.ndvi_data_url || data.images?.ndvi?.data_url,
      ndmi_data_url: data.ndmi_data_url || data.images?.ndmi?.data_url,
      images: data.images,
      meta: data.meta,
      scene: data.scene,
      composite: data.composite,
      provider: data.provider,
      source: data.source
    };
    const idx = np_getPilotRadarIndex();
    np_updateRadarScaleUi(idx);
    const url = np_getRadarPilotDataUrl(idx) || data.ndvi_data_url;
    if (url) {
      await np_applyRadarPilotOverlay(url, idx);
    }
    if (data.request?.id) {
      np_persistRadarSnapshotSelection(data.request.id);
    }
    await window.refreshRadarNdviStatus();
    const sel = document.getElementById('radarSnapshotSelect');
    if (sel && data.request?.id) {
      sel.value = String(data.request.id);
      np_persistRadarSnapshotSelection(data.request.id);
    }
    if (hint) {
      hint.textContent = np_formatPilotOkHint(data, idx);
    }
  } catch (e) {
    console.error('Radar CDSE pilot:', e);
    alert('Error de red en pilot Radar.');
    if (hint) hint.textContent = 'Pilot: sin conexión al servidor.';
  } finally {
    np_setRadarBusy(false);
  }
};

window.hideRadarNdviOverlay = function hideRadarNdviOverlay() {
  if (radarGroundOverlay) {
    radarGroundOverlay.setMap(null);
    radarGroundOverlay = null;
  }
  window.__nutriplantRadarOverlaySource = null;
  np_setRadarPolygonMask(false);
  np_showRadarLegend(false);
};

window.showRadarNdviOnMap = async function showRadarNdviOnMap() {
  if (!nutriPlantMap || !nutriPlantMap.map) {
    alert('El mapa no está listo.');
    return;
  }
  const bounds = np_getPolygonBoundsFromMap();
  const token = await np_getRadarAccessToken();
  if (!token) {
    alert('No hay sesión. Vuelve a iniciar sesión.');
    return;
  }
  const proj = nutriPlantMap.getCurrentProject();
  if (!proj || !proj.id) {
    alert('Selecciona un proyecto.');
    return;
  }
  const requestId = np_getSelectedRadarRequestId();
  if (!requestId) {
    alert('No hay imágenes Radar guardadas. Genera una tras sincronizar el predio.');
    return;
  }
  try {
    const res = await fetch(np_radarApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        action: 'view',
        project_id: String(proj.id),
        request_id: requestId
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || data.error || 'No se pudo cargar la imagen Radar seleccionada.');
      return;
    }
    const selectedIndex = np_getSelectedRadarIndex();
    const snap = data.snapshot || null;
    const overlayCtx = np_getRadarOverlayContext(snap);
    if (!overlayCtx.bounds && !bounds) {
      alert('Carga un polígono del predio en el mapa o elige una imagen con coordenadas guardadas.');
      return;
    }
    const url = np_getRadarSignedUrl({ snapshot: snap }, selectedIndex);
    if (!url) {
      alert(
        'Esta imagen no incluye ' +
          np_getRadarIndexConfig(selectedIndex).label +
          '. Prueba otra capa o elige otra fecha en el listado.'
      );
      return;
    }
    await np_applyRadarOverlay(url, snap, selectedIndex);
  } catch (e) {
    console.error('Radar NDVI view:', e);
    alert('No se pudo cargar la imagen Radar. Intenta pulsar Estado y luego Ver en mapa.');
  }
};

window.generateRadarNdvi = async function generateRadarNdvi() {
  const token = await np_getRadarAccessToken();
  if (!token) {
    alert('Inicia sesión con tu cuenta en la nube.');
    return;
  }
  const proj = nutriPlantMap && nutriPlantMap.getCurrentProject ? nutriPlantMap.getCurrentProject() : null;
  if (!proj || !proj.id) {
    alert('Selecciona un proyecto.');
    return;
  }
  const bounds = np_getPolygonBoundsFromMap();
  if (!bounds) {
    alert('Guarda un polígono en el mapa y sincronízalo a la nube antes de generar Radar.');
    return;
  }
  np_setRadarBusy(
    true,
    'Generando imágenes NDVI y NDMI con Sentinel-2... puede tardar hasta ~1 minuto (primera vez o red lenta).'
  );
  let prevRadarCreatedAt = null;
  try {
    await window.refreshRadarNdviStatus();
    prevRadarCreatedAt = np_getRadarLatestCreatedAtFromStatus(window.__nutriplantRadarNdviStatus);
    const res = await fetch(np_radarApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'generate', project_id: String(proj.id) })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.latest && data.latest.signed_url) {
      if (data.pricing && window.__nutriplantRadarNdviStatus) {
        window.__nutriplantRadarNdviStatus.pricing = data.pricing;
      }
      const regenCost = np_getRadarGenerationCreditCost();
      const regenerate = confirm(
        'Este mes ya hay una imagen Radar guardada para este proyecto.\n\n' +
          'Si la generación tardó o pareció fallar, suele estar lista en la nube: pulsa «Cancelar» y luego «Ver última» en el panel (no gasta crédito).\n\n' +
          '¿Quieres regenerar con el estilo más intenso? Eso usa ' +
          regenCost +
          ' crédito' +
          (regenCost === 1 ? '' : 's') +
          ' adicional' +
          (regenCost === 1 ? '' : 'es') +
          '.'
      );
      if (regenerate) {
        np_setRadarBusy(true, 'Regenerando NDVI y NDMI... preparando imágenes actualizadas.');
        await window.refreshRadarNdviStatus();
        const prevBeforeForce = np_getRadarLatestCreatedAtFromStatus(
          window.__nutriplantRadarNdviStatus
        );
        const forcedRes = await fetch(np_radarApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ action: 'generate', project_id: String(proj.id), force: true })
        });
        const forcedData = await forcedRes.json().catch(() => ({}));
        if (!forcedRes.ok) {
          const recovered = await np_recoverRadarIfBackendSucceeded(prevBeforeForce, bounds);
          if (!recovered) {
            alert(
              (forcedData.message || forcedData.error || 'No se pudo regenerar Radar.') +
                '\n\nPrueba «Ver última» por si la imagen anterior sigue disponible; luego «Estado».'
            );
            await window.refreshRadarNdviStatus();
          }
          return;
        }
        await window.refreshRadarNdviStatus();
        const forcedUrl = np_getRadarSignedUrl(forcedData, np_getSelectedRadarIndex()) || forcedData.signed_url;
        if (forcedUrl) {
          await np_applyRadarOverlay(
            forcedUrl,
            np_snapshotFromRadarApi(forcedData),
            np_getSelectedRadarIndex()
          );
        }
        return;
      }
      const existingUrl = np_getRadarSignedUrl(data.latest || data, np_getSelectedRadarIndex()) || data.latest.signed_url;
      await np_applyRadarOverlay(
        existingUrl,
        np_snapshotFromRadarApi(data),
        np_getSelectedRadarIndex()
      );
      await window.refreshRadarNdviStatus();
      return;
    }
    if (!res.ok) {
      const recovered = await np_recoverRadarIfBackendSucceeded(prevRadarCreatedAt, bounds);
      if (!recovered) {
        const serverMsg = data.message || data.error;
        alert(
          serverMsg
            ? serverMsg +
                '\n\nSi acabas de generar: prueba «Ver última» (a veces la imagen ya quedó guardada aunque la respuesta tardara o fallara). Luego «Estado» para ver fecha y créditos.'
            : 'No se pudo confirmar la generación (red, tiempo de espera o servidor).\n\n' +
                'Pulsa «Ver última»: si el Radar ya se guardó, se mostrará sin gastar crédito. Si no hay imagen, «Estado» y vuelve a intentar con el predio sincronizado.'
        );
        await window.refreshRadarNdviStatus();
      }
      return;
    }
    await window.refreshRadarNdviStatus();
    const generatedUrl = np_getRadarSignedUrl(data, np_getSelectedRadarIndex()) || data.signed_url;
    if (generatedUrl) {
      await np_applyRadarOverlay(
        generatedUrl,
        np_snapshotFromRadarApi(data),
        np_getSelectedRadarIndex()
      );
    }
  } catch (e) {
    console.error('Radar NDVI generate:', e);
    const boundsCatch = np_getPolygonBoundsFromMap();
    const recovered =
      boundsCatch &&
      (await np_recoverRadarIfBackendSucceeded(prevRadarCreatedAt, boundsCatch));
    if (!recovered) {
      alert(
        'Error de red al generar Radar.\n\n' +
          'Pulsa «Ver última» por si la imagen ya quedó en la nube; si no aparece, «Estado» y comprueba conexión o sincroniza el predio.'
      );
    }
  } finally {
    np_setRadarBusy(false);
  }
};

function np_isLocationMapReady() {
  const mapHost = document.getElementById('map');
  if (!nutriPlantMap || !nutriPlantMap.map || !mapHost) return false;
  try {
    const mapDiv = nutriPlantMap.map.getDiv();
    return !!(mapDiv && (mapDiv === mapHost || mapHost.contains(mapDiv)) && document.body.contains(mapDiv));
  } catch (e) {
    return false;
  }
}

function np_scrollLocationMapIntoView() {
  const mapHost = document.getElementById('map');
  const panel = document.querySelector('.map-container') || mapHost;
  const target = panel || mapHost;
  if (!target || typeof target.scrollIntoView !== 'function') return;
  try {
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch (e) {
    target.scrollIntoView();
  }
  try {
    const content = document.querySelector('.content') || document.querySelector('.main-content') || document.scrollingElement;
    if (content && typeof content.scrollTo === 'function') {
      const cRect = content === document.scrollingElement
        ? { top: 0 }
        : content.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      const currentTop = content === document.scrollingElement
        ? (window.scrollY || document.documentElement.scrollTop || 0)
        : content.scrollTop;
      const nextTop = currentTop + (tRect.top - cRect.top) - 90;
      content.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    }
  } catch (e) {}
}

function np_runLocationButtonAction(actionName, event, attempt = 0) {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (e) {}
  }

  if (!document.getElementById('map')) return;
  np_scrollLocationMapIntoView();

  const tries = Number(attempt) || 0;
  if (!nutriPlantMap || !np_isLocationMapReady()) {
    if (typeof initLocationMap === 'function') initLocationMap();
    if (tries < 18) {
      setTimeout(() => np_runLocationButtonAction(actionName, null, tries + 1), 350);
    }
    return;
  }

  if (typeof nutriPlantMap.bindLocationControlButtons === 'function') {
    nutriPlantMap.bindLocationControlButtons();
  }

  if (typeof nutriPlantMap.refreshMapView === 'function') {
    nutriPlantMap.refreshMapView('location-button-action');
  }

  if (actionName === 'polygon') {
    try {
      const proj = nutriPlantMap.getCurrentProject && nutriPlantMap.getCurrentProject();
      if (proj && proj.id && window.projectStorage && typeof window.projectStorage.loadSection === 'function') {
        const freshLocation = window.projectStorage.loadSection('location', proj.id);
        if (freshLocation && freshLocation.polygon && Array.isArray(freshLocation.polygon) && freshLocation.polygon.length >= 3) {
          if (!freshLocation.projectId) freshLocation.projectId = proj.id;
          if (typeof currentProject !== 'undefined' && currentProject && currentProject.id === proj.id) {
            currentProject.location = freshLocation;
          }
        }
      }
      if (typeof nutriPlantMap.loadProjectLocation === 'function') {
        nutriPlantMap.loadProjectLocation();
      }
    } catch (e) {
      console.warn('np_runLocationButtonAction polygon preload:', e);
    }

    const fitNow = () => {
      np_scrollLocationMapIntoView();
      let fitted = false;
      if (typeof nutriPlantMap.fitMapToCurrentProjectLocation === 'function') {
        fitted = nutriPlantMap.fitMapToCurrentProjectLocation();
      }
      if (!fitted && typeof nutriPlantMap.centerOnPolygon === 'function') {
        nutriPlantMap.centerOnPolygon();
      }
    };
    fitNow();
    setTimeout(fitNow, 450);
  } else if (actionName === 'user' && typeof nutriPlantMap.centerOnUserLocation === 'function') {
    np_scrollLocationMapIntoView();
    nutriPlantMap.centerOnUserLocation();
  }
}

window.np_centerOnPolygonFromUi = function np_centerOnPolygonFromUi(event) {
  np_runLocationButtonAction('polygon', event);
};

window.np_centerOnUserLocationFromUi = function np_centerOnUserLocationFromUi(event) {
  np_runLocationButtonAction('user', event);
};

if (!window.__npLocationButtonDelegationBound) {
  window.__npLocationButtonDelegationBound = true;
  document.addEventListener(
    'click',
    function np_locationButtonDelegatedClick(event) {
      const target = event && event.target;
      if (!target || typeof target.closest !== 'function') return;
      const polygonBtn = target.closest('#centerOnPolygon');
      const userBtn = target.closest('#centerOnUserLocation');
      if (!polygonBtn && !userBtn) return;

      try {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
      } catch (e) {}

      if (polygonBtn) {
        np_runLocationButtonAction('polygon', event);
      } else {
        np_runLocationButtonAction('user', event);
      }
    },
    true
  );
}

function initLocationMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.warn('⚠️ initLocationMap: Elemento #map no encontrado');
    return;
  }

  console.log('🗺️ Inicializando mapa de ubicación...');

  // 🚀 CRÍTICO: Verificar si el mapa existe Y está acoplado al #map visible
  if (nutriPlantMap && nutriPlantMap.map && np_isLocationMapReady()) {
        console.log('✅ Mapa ya existe e inicializado - recargando polígono guardado...');
        if (typeof nutriPlantMap.bindLocationControlButtons === 'function') {
          nutriPlantMap.bindLocationControlButtons();
        }
        if (typeof nutriPlantMap.refreshMapView === 'function') {
          nutriPlantMap.refreshMapView('reuse');
          setTimeout(() => nutriPlantMap.refreshMapView('reuse-delayed'), 350);
        }
        
        // Solo recargar el polígono guardado (no destruir el mapa)
        setTimeout(() => {
          if (nutriPlantMap && typeof nutriPlantMap.bindLocationControlButtons === 'function') {
            nutriPlantMap.bindLocationControlButtons();
          }
          if (nutriPlantMap && typeof nutriPlantMap.loadProjectLocation === 'function') {
            nutriPlantMap.loadProjectLocation();
          }
          setTimeout(() => {
            if (nutriPlantMap && typeof nutriPlantMap.fitMapToCurrentProjectLocation === 'function') {
              nutriPlantMap.fitMapToCurrentProjectLocation();
            }
          }, 250);
        }, 100); // Delay más corto porque el mapa ya está listo
        
        return; // NO crear nueva instancia
  }

  if (nutriPlantMap && nutriPlantMap.map && !np_isLocationMapReady()) {
    console.log('⚠️ El elemento del mapa fue recreado o no es válido - reinicializando el mapa');
  }

  // Si el mapa NO existe, NO está inicializado, o el elemento DOM fue recreado
  console.log('🆕 Creando nueva instancia del mapa...');
  
  // Destruir instancia previa completamente
  if (nutriPlantMap) {
    console.log('🗑️ Eliminando instancia previa del mapa...');
    try {
      const currentMapElement = document.getElementById('map');
      if (nutriPlantMap.polygon) {
        nutriPlantMap.polygon.setMap(null);
      }
      if (nutriPlantMap.savedPolygon) {
        nutriPlantMap.savedPolygon.setMap(null);
      }
      if (nutriPlantMap.map) {
        // Limpiar referencias del mapa anterior sin eliminar el contenedor actual.
        // Google Maps usa #map como su propio div; removerlo deja la vista en blanco.
        const mapDiv = nutriPlantMap.map.getDiv();
        if (mapDiv && mapDiv.parentNode && mapDiv !== currentMapElement) {
          mapDiv.parentNode.removeChild(mapDiv);
        }
      }
      nutriPlantMap.forceRemoveAllPolygons();
    } catch (e) {
      console.warn('⚠️ Error limpiando instancia previa del mapa:', e);
    }
    nutriPlantMap = null;
  }

  // 🚀 CRÍTICO: Limpiar el contenido del elemento del mapa antes de crear nueva instancia
  // Esto asegura que no haya elementos residuales
  if (mapElement) {
    mapElement.innerHTML = ''; // Limpiar completamente el contenido
  }

  // Crear nueva instancia fresca
  nutriPlantMap = new NutriPlantMap();
  if (typeof nutriPlantMap.bindLocationControlButtons === 'function') {
    nutriPlantMap.bindLocationControlButtons();
  }

  // 🚀 CRÍTICO: Esperar a que Google Maps termine de inicializar completamente
  // Usar un delay más largo para asegurar que el mapa esté completamente listo
  // También verificar que el mapa esté inicializado antes de cargar el polígono
  setTimeout(() => {
    if (nutriPlantMap && np_isLocationMapReady()) {
      console.log('✅ Mapa inicializado correctamente - cargando polígono guardado...');
      if (typeof nutriPlantMap.bindLocationControlButtons === 'function') {
        nutriPlantMap.bindLocationControlButtons();
      }
      if (typeof nutriPlantMap.refreshMapView === 'function') {
        nutriPlantMap.refreshMapView('after-initLocationMap');
      }
      if (typeof nutriPlantMap.loadProjectLocation === 'function') {
        nutriPlantMap.loadProjectLocation();
      }
      setTimeout(() => {
        if (typeof nutriPlantMap.fitMapToCurrentProjectLocation === 'function') {
          nutriPlantMap.fitMapToCurrentProjectLocation();
        }
      }, 200);
    } else {
      console.warn('⚠️ Mapa aún no está inicializado, esperando un poco más...');
      // Reintentar después de un delay adicional
      setTimeout(() => {
        if (nutriPlantMap && np_isLocationMapReady()) {
          if (typeof nutriPlantMap.bindLocationControlButtons === 'function') {
            nutriPlantMap.bindLocationControlButtons();
          }
          if (typeof nutriPlantMap.loadProjectLocation === 'function') {
            nutriPlantMap.loadProjectLocation();
          }
          setTimeout(() => {
            if (typeof nutriPlantMap.fitMapToCurrentProjectLocation === 'function') {
              nutriPlantMap.fitMapToCurrentProjectLocation();
            }
          }, 200);
        } else {
          console.error('❌ Error: No se pudo inicializar el mapa después de múltiples intentos');
        }
      }, 500);
    }
  }, 600); // Delay aumentado para asegurar que Google Maps esté completamente listo
}

// Función de debug temporal
window.debugProjectData = function() {
  console.log('=== DEBUG PROJECT DATA ===');
  console.log('Proyecto actual:', window.projectManager.getCurrentProject());
  console.log('Todos los proyectos:', window.projectManager.getAllProjects());
  console.log('Datos de ubicación:', window.projectManager.loadProjectData('ubicacion'));
  
  // Verificar localStorage directamente
  const keys = Object.keys(localStorage);
  console.log('Claves en localStorage:', keys);
  
  keys.forEach(key => {
    if (key.includes('nutriplant')) {
      console.log(`${key}:`, localStorage.getItem(key));
    }
  });
  
  // Verificar tarjeta seleccionada
  const selectedCard = document.querySelector('.np-project-card.selected');
  console.log('Tarjeta seleccionada:', selectedCard);
  if (selectedCard) {
    console.log('ID de la tarjeta:', selectedCard.getAttribute('data-id'));
    console.log('Nombre de la tarjeta:', selectedCard.querySelector('.np-title')?.textContent?.trim());
  }
};

// 🔍 FUNCIÓN PARA VERIFICAR FORMATO DEL POLÍGONO GUARDADO
window.checkPolygonFormat = function() {
  const currentProject = nutriPlantMap ? nutriPlantMap.getCurrentProject() : null;
  if (!currentProject || !currentProject.id) {
    console.error('❌ No hay proyecto seleccionado');
    return;
  }
  
  const projectKey = `nutriplant_project_${currentProject.id}`;
  const rawData = localStorage.getItem(projectKey);
  
  if (!rawData) {
    console.warn('⚠️ No hay datos para este proyecto');
    return;
  }
  
  try {
    const projectData = JSON.parse(rawData);
    if (projectData.location && projectData.location.polygon) {
      const polygon = projectData.location.polygon;
      console.log('=== FORMATO DEL POLÍGONO ===');
      console.log('Tipo:', typeof polygon);
      console.log('¿Es array?', Array.isArray(polygon));
      console.log('Longitud:', polygon.length);
      console.log('Primer elemento:', polygon[0]);
      console.log('Tipo del primer elemento:', typeof polygon[0]);
      console.log('¿Primer elemento es array?', Array.isArray(polygon[0]));
      console.log('Estructura completa:', polygon);
      
      // Verificar si es un array anidado (formato incorrecto)
      if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
        console.warn('⚠️ PROBLEMA: El polígono tiene formato anidado incorrecto');
        console.log('Formato actual: [[[lat, lng], ...], ...]');
        console.log('Formato esperado: [[lat, lng], ...]');
      } else if (Array.isArray(polygon[0]) && polygon[0].length === 2) {
        console.log('✅ Formato correcto: [[lat, lng], ...]');
      } else {
        console.warn('⚠️ Formato desconocido o incorrecto');
      }
    } else {
      console.warn('⚠️ No hay polígono en los datos');
    }
  } catch (e) {
    console.error('❌ Error:', e);
  }
};

// 🔍 FUNCIÓN DE DIAGNÓSTICO COMPLETO PARA UBICACIÓN
window.diagnoseLocation = function() {
  console.log('=== 🔍 DIAGNÓSTICO COMPLETO DE UBICACIÓN ===');
  
  // 1. Verificar proyecto actual
  const currentProject = nutriPlantMap ? nutriPlantMap.getCurrentProject() : null;
  console.log('1️⃣ Proyecto actual:', currentProject);
  
  if (!currentProject || !currentProject.id) {
    console.error('❌ No hay proyecto seleccionado');
    return;
  }
  
  const projectId = currentProject.id;
  const projectKey = `nutriplant_project_${projectId}`;
  
  // 2. Verificar localStorage directamente
  console.log('2️⃣ Verificando localStorage...');
  const rawData = localStorage.getItem(projectKey);
  console.log('   Clave:', projectKey);
  console.log('   ¿Existe?', !!rawData);
  
  if (rawData) {
    try {
      const projectData = JSON.parse(rawData);
      console.log('   Datos del proyecto:', {
        id: projectData.id,
        name: projectData.name,
        hasLocation: !!projectData.location
      });
      
      if (projectData.location) {
        console.log('   Location encontrado:', {
          keys: Object.keys(projectData.location),
          hasPolygon: !!projectData.location.polygon,
          polygonType: typeof projectData.location.polygon,
          polygonIsArray: Array.isArray(projectData.location.polygon),
          polygonLength: projectData.location.polygon && Array.isArray(projectData.location.polygon) ? projectData.location.polygon.length : 0,
          hasCoordinates: !!projectData.location.coordinates,
          projectId: projectData.location.projectId,
          area: projectData.location.area,
          perimeter: projectData.location.perimeter
        });
        
        // Mostrar primeros puntos del polígono
        if (projectData.location.polygon && Array.isArray(projectData.location.polygon)) {
          console.log('   Primeros 3 puntos del polígono:', projectData.location.polygon.slice(0, 3));
        }
      } else {
        console.warn('   ⚠️ No hay location en los datos del proyecto');
      }
    } catch (e) {
      console.error('   ❌ Error parseando datos:', e);
    }
  } else {
    console.warn('   ⚠️ No hay datos en localStorage para este proyecto');
  }
  
  // 3. Verificar projectStorage
  console.log('3️⃣ Verificando projectStorage...');
  if (window.projectStorage) {
    const locationData = window.projectStorage.loadSection('location', projectId);
    console.log('   loadSection retornó:', {
      isNull: locationData === null,
      isUndefined: locationData === undefined,
      hasPolygon: !!(locationData && locationData.polygon),
      polygonLength: locationData && locationData.polygon && Array.isArray(locationData.polygon) ? locationData.polygon.length : 0,
      projectId: locationData ? locationData.projectId : 'N/A'
    });
    
    if (locationData) {
      console.log('   Datos completos de location:', locationData);
    }
  } else {
    console.warn('   ⚠️ projectStorage no está disponible');
  }
  
  // 4. Verificar mapa
  console.log('4️⃣ Verificando mapa...');
  if (nutriPlantMap) {
    console.log('   Mapa existe:', {
      hasMap: !!nutriPlantMap.map,
      mapDiv: nutriPlantMap.map ? nutriPlantMap.map.getDiv() : null,
      hasPolygon: !!nutriPlantMap.polygon,
      hasSavedPolygon: !!nutriPlantMap.savedPolygon,
      coordinates: nutriPlantMap.coordinates ? nutriPlantMap.coordinates.length : 0,
      area: nutriPlantMap.area,
      perimeter: nutriPlantMap.perimeter
    });
  } else {
    console.warn('   ⚠️ nutriPlantMap no está disponible');
  }
  
  // 5. Verificar caché en memoria
  console.log('5️⃣ Verificando caché en memoria...');
  if (window.projectStorage && window.projectStorage.memoryCache) {
    const cache = window.projectStorage.memoryCache;
    console.log('   Caché:', {
      currentProjectId: cache.currentProjectId,
      hasData: !!cache.projectData,
      hasLocation: !!(cache.projectData && cache.projectData.location),
      locationPolygonLength: cache.projectData && cache.projectData.location && cache.projectData.location.polygon && Array.isArray(cache.projectData.location.polygon) ? cache.projectData.location.polygon.length : 0
    });
  }
  
  console.log('=== FIN DEL DIAGNÓSTICO ===');
  console.log('💡 Para recargar el polígono, ejecuta: nutriPlantMap.loadProjectLocation()');
};

// 🔍 FUNCIÓN SIMPLE DE DIAGNÓSTICO (alternativa)
window.diag = function() {
  const projectId = nutriPlantMap ? (nutriPlantMap.getCurrentProject()?.id) : null;
  if (!projectId) {
    console.error('❌ No hay proyecto');
    return;
  }
  
  console.log('=== DIAGNÓSTICO RÁPIDO ===');
  console.log('Proyecto ID:', projectId);
  
  // Verificar directamente
  const key = `nutriplant_project_${projectId}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    const data = JSON.parse(raw);
    console.log('Location en localStorage:', {
      hasLocation: !!data.location,
      hasPolygon: !!(data.location && data.location.polygon),
      polygonLength: data.location && data.location.polygon ? data.location.polygon.length : 0,
      projectId: data.location ? data.location.projectId : 'N/A'
    });
  }
  
  // Verificar loadSection
  if (window.projectStorage) {
    const result = window.projectStorage.loadSection('location', projectId);
    console.log('loadSection retornó:', result ? '✅ Datos' : '❌ null');
    if (result) {
      console.log('Datos:', result);
    } else {
      console.log('⚠️ loadSection retornó null aunque el polígono existe');
    }
  }
};

// Función para forzar la carga de datos
window.forceLoadLocation = function() {
  console.log('=== FORZANDO CARGA DE UBICACIÓN ===');
  const currentProject = window.projectManager.getCurrentProject();
  console.log('Proyecto actual:', currentProject);
  
  if (currentProject) {
    const locationData = window.projectManager.loadProjectData('ubicacion');
    console.log('Datos de ubicación:', locationData);
    
    if (locationData && locationData.coordinates) {
      console.log('Coordenadas encontradas:', locationData.coordinates);
      console.log('Número de coordenadas:', locationData.coordinates.length);
      
      // Intentar cargar el polígono
      if (nutriPlantMap) {
        nutriPlantMap.loadSavedPolygon(locationData);
        console.log('Polígono cargado forzadamente');
      }
    } else {
      console.log('No hay datos de ubicación para este proyecto');
    }
  } else {
    console.log('No hay proyecto seleccionado');
  }
};

// Función para verificar todos los datos guardados
window.checkAllData = function() {
  console.log('=== VERIFICANDO TODOS LOS DATOS ===');
  
  // Verificar localStorage directamente
  const keys = Object.keys(localStorage);
  console.log('Todas las claves en localStorage:', keys);
  
  // Buscar claves de NutriPlant
  const nutriplantKeys = keys.filter(key => key.includes('nutriplant'));
  console.log('Claves de NutriPlant:', nutriplantKeys);
  
  nutriplantKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`${key}:`, data);
    } catch (e) {
      console.log(`${key}:`, localStorage.getItem(key));
    }
  });
  
  // Verificar proyecto actual
  const currentProject = window.projectManager.getCurrentProject();
  console.log('Proyecto actual:', currentProject);
  
  if (currentProject) {
    const allData = window.projectManager.getAllProjectData();
    console.log('Todos los datos del proyecto:', allData);
  }
};

// Exportar para uso global
window.NutriPlantMap = NutriPlantMap;
window.initLocationMap = initLocationMap;
window.np_isLocationMapReady = np_isLocationMapReady;
window.forceClearLocationDisplay = forceClearLocationDisplay;

document.addEventListener('np:project-context-updated', () => {
  if (!document.getElementById('map')) return;
  setTimeout(() => {
    if (typeof np_syncMapLocationFromProject === 'function') {
      np_syncMapLocationFromProject();
    }
  }, 180);
});