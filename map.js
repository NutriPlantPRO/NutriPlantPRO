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
      this.showMapUnavailable(np_radarT(
        'radar.map_unavailable_auth',
        'Google Maps no autorizó este dominio. Revisa la API Key y las restricciones de referencia en Google Cloud.'
      ));
    };

    // Maps UI labels (Map/Satellite) are fixed at script load via language=/region=.
    // Changing NpPrefs language later cannot retarget those controls via map.setOptions — page reload required.
    const mapsLocale = np_mapsLanguageAndRegion();
    if (window.__npMapsLang && window.__npMapsLang !== mapsLocale.language) {
      console.warn(
        '🗺️ Google Maps ya cargó con language=' + window.__npMapsLang +
        '; Map/Satellite labels need a page reload for ' + mapsLocale.language
      );
    }
    window.__npMapsLang = mapsLocale.language;

    // Cargar la API de Google Maps
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=geometry&language=${mapsLocale.language}&region=${mapsLocale.region}&callback=initNutriPlantMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('❌ No se pudo cargar Google Maps');
      window.__nutriPlantGoogleMapsLoading = false;
      this.showMapUnavailable(np_radarT(
        'radar.map_unavailable_load',
        'No se pudo cargar Google Maps. Revisa la conexión o la configuración de la API Key.'
      ));
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (!this.map && (!window.google || !window.google.maps || !window.google.maps.Map)) {
        window.__nutriPlantGoogleMapsLoading = false;
        this.showMapUnavailable(np_radarT(
          'radar.map_unavailable_timeout',
          'Google Maps tardó demasiado en responder. Recarga la página e inténtalo de nuevo.'
        ));
      }
    }, 12000);
  }

  showMapUnavailable(message) {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    const title = np_radarT('radar.map_unavailable_title', 'Mapa no disponible');

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
          <h3 style="margin: 0 0 8px; color: #1e40af;">${title}</h3>
          <p style="margin: 0; color: #475569; line-height: 1.45;">${message}</p>
        </div>
      </div>
    `;
  }

  showDemoMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const demoTitle = np_radarT('radar.demo_title', 'Mapa de Demostración');
    const demoBody = np_radarT('radar.demo_body', 'Para usar el mapa real, configura tu API Key de Google Maps');
    const demoSteps = np_radarT('radar.demo_steps', 'Pasos:');
    const demoStep1 = np_radarT('radar.demo_step_1', '1. Ve a Google Cloud Console');
    const demoStep2 = np_radarT('radar.demo_step_2', '2. Habilita Maps JavaScript API');
    const demoStep3 = np_radarT('radar.demo_step_3', '3. Crea una API Key');
    const demoStep4 = np_radarT('radar.demo_step_4', '4. Reemplaza en map.js');
    const demoTry = np_radarT('radar.demo_try', 'Probar Funcionalidad');
    const demoSimTitle = np_radarT('radar.demo_sim_title', '🎯 Haz clic para trazar tu parcela');
    const demoSimBody = np_radarT('radar.demo_sim_body', 'Simulación de dibujo de polígono');

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
          <h3 style="margin: 0 0 15px 0; font-size: 24px;">${demoTitle}</h3>
          <p style="margin: 0 0 20px 0; opacity: 0.9;">
            ${demoBody}
          </p>
          <div style="
            background: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 12px;
            margin-bottom: 20px;
          ">
            <strong>${demoSteps}</strong><br>
            ${demoStep1}<br>
            ${demoStep2}<br>
            ${demoStep3}<br>
            ${demoStep4}
          </div>
          <button type="button" data-np-demo-try="1"
                  style="
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                  ">
            ${demoTry}
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
    this.setupDemoEvents(demoSimTitle, demoSimBody);
  }

  setupDemoEvents(demoSimTitle, demoSimBody) {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    const btn = mapElement.querySelector('[data-np-demo-try]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      mapElement.innerHTML =
        `<div style="padding:20px;text-align:center;"><h3>${demoSimTitle || ''}</h3><p>${demoSimBody || ''}</p></div>`;
    });
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

    // DrawingManager ya no está disponible en Maps JS API 3.65+.
    // El trazado de NutriPlant usa clics propios sobre el mapa, así que no debe bloquear la inicialización.
    this.setupDrawingManager();

    // Configurar eventos
    this.setupEventListeners();

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
    if (!google.maps.drawing || !google.maps.drawing.DrawingManager) {
      console.warn('⚠️ DrawingManager no disponible; usando dibujo por clics de NutriPlant.');
      this.drawingManager = null;
      return;
    }

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
    
    this.showMessage(
      np_radarT('radar.msg_polygon_unique', '✅ Polígono único creado - Puedes editarlo o guardar'),
      'success'
    );
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
          this.showMessage(
            np_radarT(
              'radar.msg_already_saved',
              '⚠️ Ya hay un polígono guardado. Usa el botón «Eliminar polígono» para eliminarlo antes de dibujar uno nuevo.'
            ),
            'warning'
          );
          this.setInstructionsKey(
            'radar.instr_already_saved',
            null,
            '⚠️ Ya hay un polígono guardado. Usa el botón «Eliminar polígono» para eliminarlo.'
          );
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
        if (opening && coordsInput) {
          const currentCoordsText = self.getCurrentPolygonCoordinatesText();
          if (currentCoordsText && !String(coordsInput.value || '').trim()) {
            coordsInput.value = currentCoordsText;
          }
          coordsInput.focus();
        }
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

  getCurrentPolygonCoordinatesText() {
    let coords = null;

    if (Array.isArray(this.coordinates) && this.coordinates.length >= 3) {
      coords = this.coordinates;
    } else if (this.polygon && this.polygon.getPath) {
      coords = this.polygon.getPath().getArray().map((point) => [point.lat(), point.lng()]);
    } else {
      const project = this.getCurrentProject();
      const loc = project && project.location;
      if (loc && Array.isArray(loc.polygon) && loc.polygon.length >= 3) {
        coords = loc.polygon;
      } else if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length >= 3) {
        coords = loc.coordinates;
      }
    }

    if (!Array.isArray(coords) || coords.length < 3) return '';
    const lines = coords
      .map((coord) => {
        const lat = Array.isArray(coord) ? Number(coord[0]) : Number(coord && coord.lat);
        const lng = Array.isArray(coord) ? Number(coord[1]) : Number(coord && coord.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
        return lat.toFixed(6) + ',' + lng.toFixed(6);
      })
      .filter(Boolean);

    return lines.length >= 3 ? lines.join('\n') : '';
  }

  parseCoordinatesText(rawText) {
    const text = String(rawText || '').trim();
    if (!text) {
      return {
        points: [],
        error: np_radarT('radar.msg_coords_paste_first', 'Pega tus coordenadas primero.')
      };
    }
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const points = [];
    for (let i = 0; i < lines.length; i++) {
      const src = lines[i].replace(/\t+/g, ' ').trim();
      const parts = this.splitCoordinatePair(src);
      if (!parts || parts.length < 2) {
        return {
          points: [],
          error: np_radarT('radar.msg_coords_line_invalid', 'Línea {n} inválida. Usa: lat,lng', { n: i + 1 })
        };
      }
      const lat = this.parseCoordinateComponent(parts[0], 'lat');
      const lng = this.parseCoordinateComponent(parts[1], 'lng');
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return {
          points: [],
          error: np_radarT(
            'radar.msg_coords_line_format',
            'Línea {n} inválida. Formato decimal o grados/min/seg.',
            { n: i + 1 }
          )
        };
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return {
          points: [],
          error: np_radarT(
            'radar.msg_coords_line_range',
            'Línea {n} fuera de rango. Verifica lat/lng.',
            { n: i + 1 }
          )
        };
      }
      points.push(new google.maps.LatLng(lat, lng));
    }
    if (points.length < 3) {
      return {
        points: [],
        error: np_radarT('radar.msg_coords_min_points', 'Se requieren al menos 3 puntos.')
      };
    }
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
    this.setInstructionsKey(
      'radar.instr_coords_drawn',
      null,
      '✅ Polígono trazado desde coordenadas. Puedes editarlo o guardar.'
    );
    this.showMessage(
      np_radarT(
        'radar.msg_coords_created',
        '✅ Polígono creado con {n} puntos desde coordenadas',
        { n: polygonPath.length }
      ),
      'success'
    );
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
    
    this.setInstructionsKey(
      'radar.instr_continue_click',
      null,
      '🔄 Continúa haciendo clic para trazar tu parcela'
    );
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
    
    this.setInstructionsKey(
      'radar.instr_point_n',
      { n: this.polygonPath.length },
      '📍 Punto {n} - Haz clic cerca del inicio para cerrar o doble clic'
    );
    
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

    this.setInstructionsKey(
      'radar.instr_polygon_done',
      null,
      '✅ Polígono completado - Puedes editarlo o guardar'
    );
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
    this.setInstructionsKey(
      'radar.instr_polygon_edited',
      null,
      '🔄 Polígono editado - Los datos se han actualizado automáticamente'
    );
    
    // Mostrar mensaje temporal de confirmación
    this.showMessage(
      np_radarT('radar.msg_polygon_updated', '✅ Datos del polígono actualizados automáticamente'),
      'success'
    );
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
        areaDisplay.textContent = np_radarT('radar.area_zero', '0.00 ha (0.00 acres)');
      }
    }

    if (coordinatesDisplay) {
      if (shouldShowData && belongsToCurrentProject && this.coordinates && this.coordinates.length > 0) {
        // Mostrar centro del polígono (mismo punto que clima / Lectura / altitud).
        let center = this.getPolygonCenter();
        if (!center && this.coordinates.length >= 1) {
          let sLat = 0;
          let sLng = 0;
          let n = 0;
          this.coordinates.forEach((c) => {
            const lat = Number(Array.isArray(c) ? c[0] : c && c.lat);
            const lng = Number(Array.isArray(c) ? c[1] : c && c.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            sLat += lat;
            sLng += lng;
            n += 1;
          });
          if (n > 0) center = { lat: sLat / n, lng: sLng / n };
        }
        coordinatesDisplay.textContent = center
          ? `${Number(center.lat).toFixed(6)}, ${Number(center.lng).toFixed(6)}`
          : np_radarT('radar.not_selected', 'No seleccionadas');
      } else {
        coordinatesDisplay.textContent = np_radarT('radar.not_selected', 'No seleccionadas');
      }
    }

    if (perimeterDisplay) {
      if (shouldShowData && this.perimeter > 0 && belongsToCurrentProject) {
        perimeterDisplay.textContent = np_formatPerimeterDisplay(this.perimeter, (n) => this.formatNumber(n));
      } else {
        perimeterDisplay.textContent = np_formatPerimeterDisplay(0);
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

  setInstructionsKey(key, params, fallback) {
    this._instructionKey = key || null;
    this._instructionParams = params || null;
    const text = np_radarT(
      key,
      fallback != null ? fallback : key,
      params || undefined
    );
    this.updateInstructions(text);
  }

  refreshInstructionsForLanguage() {
    if (this._instructionKey) {
      this.setInstructionsKey(this._instructionKey, this._instructionParams);
      return;
    }
    const hasPolygon =
      (this.polygon && this.polygon.getMap && this.polygon.getMap() === this.map) ||
      (this.savedPolygon && this.savedPolygon.getMap && this.savedPolygon.getMap() === this.map);
    if (hasPolygon) {
      this.setInstructionsKey(
        'radar.instr_plot_loaded',
        null,
        '✅ Predio cargado - Puedes editarlo o guardar cambios'
      );
    } else {
      this.setInstructionsKey(
        'radar.instr_click_draw',
        null,
        '📍 Haz clic en el mapa para trazar tu parcela'
      );
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
    this.setInstructionsKey(
      'radar.instr_polygon_cleared',
      null,
      '📍 Polígono eliminado - Haz clic en el mapa para trazar uno nuevo'
    );
    
    // Mostrar mensaje de confirmación
    this.showMessage(
      np_radarT(
        'radar.msg_polygon_cleared',
        '🗑️ Polígono eliminado correctamente - Puedes dibujar uno nuevo'
      ),
      'success'
    );
    
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
      alert(np_radarT('radar.alert_draw_first', 'Por favor, traza un polígono válido antes de guardar'));
      return;
    }

    // Obtener el proyecto actual seleccionado
    const currentProject = this.getCurrentProject();
    if (!currentProject) {
      alert(np_radarT(
        'radar.alert_select_project',
        'Por favor, selecciona un proyecto desde Inicio antes de guardar el predio'
      ));
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
      alert(np_radarT('radar.alert_no_project', 'Error: No hay proyecto seleccionado'));
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
        perimeterDisplay: np_formatPerimeterDisplay(locationData.perimeter, (n) => this.formatNumber(n)),
        elevationDisplay: (function () {
          if (!Number.isFinite(locationData.elevationM)) return np_radarT('radar.na', 'N/D');
          const prefs = window.NpAgronomicUnits && typeof window.NpAgronomicUnits.getPrefs === 'function'
            ? window.NpAgronomicUnits.getPrefs()
            : null;
          if (prefs && prefs.unit_system === 'us_customary') {
            return np_formatElevM(locationData.elevationM) + ' ' + np_radarT('radar.unit_amslof', 'AMSL');
          }
          return Math.round(locationData.elevationM) + ' ' + np_radarT('radar.unit_msl', 'msnm');
        })()
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
              this.showMessage(
                np_radarT('radar.msg_saved_ok', '✅ Predio guardado correctamente'),
                'success'
              );
            } else {
              console.warn('⚠️ Polígono guardado pero sin coordenadas válidas (menos de 3 puntos)');
              this.showMessage(
                np_radarT('radar.msg_saved_invalid', '⚠️ Polígono guardado pero inválido'),
                'warning'
              );
            }
          } else {
            console.warn('⚠️ No se pudo verificar el guardado');
            this.showMessage(
              np_radarT('radar.msg_verify_failed', '⚠️ No se pudo verificar el guardado'),
              'warning'
            );
          }
        } else {
          console.error('❌ ERROR: No se pudo guardar usando sistema centralizado');
          this.showMessage(
            np_radarT('radar.msg_save_error', '❌ Error al guardar el predio'),
            'error'
          );
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
      const message = np_radarT(
        'radar.alert_saved_detail',
        '✅ Predio guardado para "{name}"!\n\n📏 Superficie: {ha} ha ({acres} acres)\n📐 Perímetro: {perimeter}\n📍 Coordenadas: {lat}, {lng}\n\n🕒 Actualizado: {updated}',
        {
          name: currentProject.name,
          ha: this.formatNumber(locationData.areaHectares),
          acres: this.formatNumber(locationData.areaAcres),
          perimeter: np_formatPerimeterDisplay(locationData.perimeter, (n) => this.formatNumber(n)),
          lat: this.formatNumber(locationData.center.lat),
          lng: this.formatNumber(locationData.center.lng),
          updated: new Date().toLocaleString(np_radarLocale())
        }
      );
      
      alert(message);
      this.showMessage(
        np_radarT('radar.msg_saved_success', '✅ Predio guardado exitosamente'),
        'success'
      );
      
      // 🚀 CRÍTICO: Actualizar instrucciones
      this.setInstructionsKey(
        'radar.instr_saved',
        null,
        '✅ Predio guardado - Puedes editarlo o guardar cambios'
      );
      
    } catch (e) {
      console.error('❌ Error al guardar polígono:', e);
      alert(np_radarT('radar.alert_save_error', 'Error al guardar el predio: {message}', {
        message: e.message
      }));
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

  /**
   * En Radar, solicita GPS solo después de confirmar que el proyecto no tiene
   * un predio guardado. Evita centrar inicialmente en el fallback de CDMX.
   */
  maybeAutoCenterOnUserLocation(projectId) {
    if (!projectId || !this.map) return;
    window.__npRadarAutoGeoDone = window.__npRadarAutoGeoDone || {};
    if (window.__npRadarAutoGeoDone[projectId]) return;
    window.__npRadarAutoGeoDone[projectId] = true;
    this.getCurrentLocation();
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
    if (typeof np_shouldHoldUserLocationCenter === 'function' && np_shouldHoldUserLocationCenter()) {
      return false;
    }

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
      this.showMessage(
        np_radarT('radar.msg_loading_map_polygon', '🔄 Cargando mapa y polígono del predio…'),
        'info'
      );
      this._centerOnPolygonAttempts = (this._centerOnPolygonAttempts || 0) + 1;
      if (this._centerOnPolygonAttempts <= 15) {
        setTimeout(() => this.centerOnPolygon(), 500);
      } else {
        this._centerOnPolygonAttempts = 0;
        this.showMessage(
          np_radarT(
            'radar.msg_map_load_failed',
            '⚠️ No se pudo cargar el mapa. Vuelve a entrar a Ubicación.'
          ),
          'warning'
        );
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
      this.showMessage(
        np_radarT('radar.msg_centered_polygon', '✅ Mapa centrado en el polígono'),
        'success'
      );
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
          (!memLoc.projectId || np_projectIdsMatch(memLoc.projectId, currentProject.id))) {
        locationData = memLoc;
      }
      if (!locationData && window.projectStorage) {
        locationData = window.projectStorage.loadSection('location', currentProject.id);
      }

      if (locationData && locationData.polygon && Array.isArray(locationData.polygon) && locationData.polygon.length >= 3) {
        const belongs =
          !locationData.projectId || np_projectIdsMatch(locationData.projectId, currentProject.id);
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
            this.showMessage(
              np_radarT('radar.msg_centered_saved', '✅ Mapa centrado en el polígono guardado'),
              'success'
            );
            return;
          }
        }
      }
    }
    
    this.showMessage(
      np_radarT('radar.msg_no_polygon_center', '⚠️ No hay polígono guardado o visible para centrar'),
      'warning'
    );
  }

  centerOnUserLocation() {
    // 🚀 "Mi Ubicación" SIEMPRE debe obtener la ubicación GPS del dispositivo
    // NO debe centrar en el polígono - eso lo hace el botón "Ubicación del Predio"

    if (typeof np_scrollLocationMapIntoView === 'function') {
      np_scrollLocationMapIntoView();
    }

    if (!np_isLocationMapReady() || !this.map) {
      if (typeof initLocationMap === 'function') initLocationMap();
      this.showMessage(np_radarT('radar.msg_loading_map', '🔄 Cargando mapa…'), 'info');
      this._centerOnUserLocationAttempts = (this._centerOnUserLocationAttempts || 0) + 1;
      if (this._centerOnUserLocationAttempts <= 15) {
        setTimeout(() => this.centerOnUserLocation(), 500);
      } else {
        this._centerOnUserLocationAttempts = 0;
        this.showMessage(
          np_radarT(
            'radar.msg_map_load_failed',
            '⚠️ No se pudo cargar el mapa. Vuelve a entrar a Ubicación.'
          ),
          'warning'
        );
      }
      return;
    }
    this._centerOnUserLocationAttempts = 0;
    
    if (!navigator.geolocation) {
      this.showMessage(
        np_radarT(
          'radar.msg_geo_unavailable',
          '❌ La geolocalización no está disponible en este navegador'
        ),
        'error'
      );
      return;
    }

    console.log('📍 Obteniendo ubicación GPS del dispositivo...');
    this.showMessage(
      np_radarT('radar.msg_getting_location', '🔄 Obteniendo tu ubicación...'),
      'info'
    );
    
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
        
        this.showMessage(
          np_radarT('radar.msg_centered_location', '📍 Centrado en tu ubicación actual'),
          'success'
        );
      },
      (error) => {
        let errorMessage = np_radarT('radar.msg_geo_error', '❌ Error al obtener tu ubicación');
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = np_radarT(
              'radar.msg_geo_denied',
              '❌ Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = np_radarT(
              'radar.msg_geo_position_unavailable',
              '❌ Ubicación no disponible. Verifica que tu dispositivo tenga GPS activado.'
            );
            break;
          case error.TIMEOUT:
            errorMessage = np_radarT(
              'radar.msg_geo_timeout',
              '❌ Tiempo de espera agotado. Intenta de nuevo.'
            );
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
      this.setInstructionsKey(
        'radar.instr_select_project',
        null,
        '📍 Selecciona un proyecto y haz clic en el mapa para trazar tu parcela'
      );
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

    // PRIORIDAD 0: usar la ubicación ya cargada en el proyecto actual.
    // Al abrir/cambiar proyectos desde nube, currentProject.location puede estar correcto
    // aunque localStorage todavía no tenga esa sección sincronizada.
    if (
      currentProject.location &&
      currentProject.location.polygon &&
      Array.isArray(currentProject.location.polygon) &&
      currentProject.location.polygon.length >= 3 &&
      (!currentProject.location.projectId || np_projectIdsMatch(currentProject.location.projectId, currentProject.id))
    ) {
      locationData = currentProject.location;
      if (!locationData.projectId) locationData.projectId = currentProject.id;
      console.log('✅ Polígono cargado desde currentProject.location');
    }
    
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
    
    if (useCentralized && !locationData) {
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
        if (!locationProjectId || np_projectIdsMatch(locationProjectId, currentProject.id)) {
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
              if (!locationProjectId || np_projectIdsMatch(locationProjectId, currentProject.id)) {
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
        const hasValidProjectId = !locationData.projectId || np_projectIdsMatch(locationData.projectId, currentProject.id);
        
        console.log('🔍 DIAGNÓSTICO - Validaciones:', {
          hasValidPolygon,
          hasValidProjectId,
          polygonLength: locationData.polygon ? locationData.polygon.length : 0,
          projectIdMatch: np_projectIdsMatch(locationData.projectId, currentProject.id)
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
      this.setInstructionsKey(
        'radar.instr_click_draw',
        null,
        '📍 Haz clic en el mapa para trazar tu parcela'
      );
      // Solo para proyectos nuevos/sin parcela: centrar una vez en GPS.
      this.maybeAutoCenterOnUserLocation(currentProject.id);
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
            if (o.location.projectId && !np_projectIdsMatch(o.location.projectId, currentProject.id)) {
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
      const hasValidProjectId = !locationData.projectId || np_projectIdsMatch(locationData.projectId, currentProject.id);
      
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
        return locationData;
      } else {
        console.warn('⚠️ Polígono válido pero projectId NO coincide. NO cargando.', {
          expected: currentProject.id,
          found: locationData.projectId
        });
        // Limpiar display
        this.updateDisplay();
        this.setInstructionsKey(
          'radar.instr_click_draw',
          null,
          '📍 Haz clic en el mapa para trazar tu parcela'
        );
        return null;
      }
    } else {
      // No hay polígono válido - ya está todo limpio arriba
      console.log('ℹ️ No hay polígono válido para este proyecto');
      this.updateDisplay();
      this.setInstructionsKey(
        'radar.instr_click_draw',
        null,
        '📍 Haz clic en el mapa para trazar tu parcela'
      );
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
    if (locationData.projectId && !np_projectIdsMatch(locationData.projectId, currentProject.id)) {
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
      this.setInstructionsKey(
        'radar.instr_plot_loaded',
        null,
        '✅ Predio cargado - Puedes editarlo o guardar cambios'
      );
      console.log('✅ UN solo polígono cargado y visible correctamente:', {
        points: polygonPath.length,
        projectId: locationData.projectId
      });
    } else {
      // Si no se pudo cargar el polígono, no mostrar mensaje confuso
      this.setInstructionsKey(
        'radar.instr_click_draw',
        null,
        '📍 Haz clic en el mapa para trazar tu parcela'
      );
      console.warn('⚠️ Polígono no se pudo cargar en el mapa');
    }
  }
}

// Inicializar el mapa cuando se carga la página
let nutriPlantMap = null;

function np_radarT(key, fallback, params) {
  try {
    if (window.NpI18n && typeof window.NpI18n.t === 'function') {
      const translated = window.NpI18n.t(key, params);
      if (translated !== key) return translated;
    }
  } catch (e) {}
  if (fallback == null) return key;
  if (!params) return fallback;
  return String(fallback).replace(/\{([A-Za-z0-9_]+)\}/g, function (match, name) {
    return params[name] !== undefined ? String(params[name]) : match;
  });
}

/** Google Maps JS API language + region from NpPrefs / NpI18n (fixed at script load). */
function np_mapsLanguageAndRegion() {
  let language = 'es';
  try {
    if (window.NpPrefs && typeof window.NpPrefs.get === 'function') {
      language = window.NpPrefs.get().language === 'en' ? 'en' : 'es';
    } else if (window.NpI18n && typeof window.NpI18n.getLanguage === 'function') {
      language = window.NpI18n.getLanguage() === 'en' ? 'en' : 'es';
    } else if (document.documentElement) {
      const htmlLang =
        document.documentElement.getAttribute('data-np-language') ||
        document.documentElement.lang ||
        'es';
      language = String(htmlLang).toLowerCase().indexOf('en') === 0 ? 'en' : 'es';
    }
  } catch (e) {}
  return { language: language, region: language === 'en' ? 'US' : 'MX' };
}

function np_radarUsesUsUnits() {
  try {
    if (window.NpPrefs && typeof window.NpPrefs.get === 'function') {
      return window.NpPrefs.get().unit_system === 'us_customary';
    }
  } catch (e) {}
  try {
    return document.documentElement.getAttribute('data-np-unit-system') === 'us_customary';
  } catch (e2) {}
  return false;
}

/** Perimeter is stored in meters; convert for display from NpPrefs unit_system. */
function np_formatPerimeterDisplay(meters, formatNumberFn) {
  const fmt = typeof formatNumberFn === 'function'
    ? formatNumberFn
    : function (n) {
        const num = Number(n);
        if (!Number.isFinite(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
  const m = Number(meters);
  if (!Number.isFinite(m) || m <= 0) {
    return np_radarUsesUsUnits()
      ? np_radarT('radar.perimeter_zero_ft', '0.00 ft (0.00 m)')
      : np_radarT('radar.perimeter_zero', '0.00 m (0.00 ft)');
  }
  const ft = m * 3.280839895;
  if (np_radarUsesUsUnits()) {
    return `${fmt(ft)} ft (${fmt(m)} m)`;
  }
  return `${fmt(m)} m (${fmt(ft)} ft)`;
}

try {
  window.addEventListener('np:prefs-changed', function (event) {
    const changed = event && event.detail && event.detail.changed;
    if (changed && changed.indexOf && changed.indexOf('unit_system') < 0 && changed.indexOf('language') < 0) {
      return;
    }
    try {
      if (nutriPlantMap && typeof nutriPlantMap.updateDisplay === 'function') {
        nutriPlantMap.updateDisplay();
      }
    } catch (e) { /* ignore */ }
    try {
      if (changed && changed.indexOf && changed.indexOf('language') >= 0 && nutriPlantMap) {
        if (typeof nutriPlantMap.refreshInstructionsForLanguage === 'function') {
          nutriPlantMap.refreshInstructionsForLanguage();
        }
        // Maps Map/Satellite control labels are locked to the language= used when the
        // Maps script first loaded; map.setOptions cannot switch them without reload.
        const mapsLocale = np_mapsLanguageAndRegion();
        if (window.__npMapsLang && window.__npMapsLang !== mapsLocale.language) {
          console.warn(
            '🗺️ Map/Satellite UI labels stay in ' + window.__npMapsLang +
            ' until page reload (Maps API language= is fixed at script load).'
          );
        }
      }
    } catch (eLang) { /* ignore */ }
  });
} catch (eListen) { /* ignore */ }

function np_radarLocale() {
  try {
    if (window.NpI18n && typeof window.NpI18n.getLanguage === 'function' && window.NpI18n.getLanguage() === 'en') {
      return 'en-US';
    }
  } catch (e) {}
  return 'es-MX';
}

function np_projectIdsMatch(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

// FUNCIÓN CRÍTICA: Limpiar elementos del DOM inmediatamente
function setLocationAltitudeDisplay(elevationM) {
  const altitudeEl = document.getElementById('altitudeDisplay');
  if (!altitudeEl) return;
  const meters = Number(elevationM);
  if (!Number.isFinite(meters)) {
    altitudeEl.textContent = np_radarT('radar.na', 'N/D');
    return;
  }
  const elevTxt = np_formatElevM(meters);
  const prefs = window.NpAgronomicUnits && typeof window.NpAgronomicUnits.getPrefs === 'function'
    ? window.NpAgronomicUnits.getPrefs()
    : null;
  const isUs = prefs && prefs.unit_system === 'us_customary';
  altitudeEl.textContent = isUs
    ? elevTxt + ' ' + np_radarT('radar.unit_amslof', 'AMSL')
    : Math.round(meters) + ' ' + np_radarT('radar.unit_msl', 'msnm');
}

function forceClearLocationDisplay() {
  console.log('🧹 FORZANDO limpieza de elementos de ubicación...');
  const coordinatesEl = document.getElementById('coordinatesDisplay');
  const areaEl = document.getElementById('areaDisplay');
  const perimeterEl = document.getElementById('perimeterDisplay');
  
  if (coordinatesEl) {
    coordinatesEl.textContent = np_radarT('radar.not_selected', 'No seleccionadas');
  }
  if (areaEl) {
    areaEl.textContent = np_radarT('radar.area_zero', '0.00 ha (0.00 acres)');
  }
  if (perimeterEl) {
    perimeterEl.textContent = np_formatPerimeterDisplay(0);
  }
  setLocationAltitudeDisplay(null);
  console.log('✅ Elementos de ubicación limpiados');
}

/** Radar NDVI (Netlify /api/radar-ndvi): capa opcional sobre el polígono */
let radarGroundOverlay = null;
let radarPreviousPolygonStyles = null;
let radarOutlinePolygons = [];
let radarActiveIndex = 'ndvi';
/** Sesión Radar: capa/mapa/pestaña al salir a Clima u otra sección lateral */
window.__nutriplantRadarSession = window.__nutriplantRadarSession || null;
window.__nutriplantRadarInternalTab = window.__nutriplantRadarInternalTab || 'poligono';

function np_getRadarProjectIdForSession() {
  try {
    if (nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function') {
      const p = nutriPlantMap.getCurrentProject();
      if (p && p.id) return String(p.id);
    }
  } catch (e) {}
  try {
    if (typeof currentProject !== 'undefined' && currentProject && currentProject.id) {
      return String(currentProject.id);
    }
  } catch (e2) {}
  return null;
}

function np_applyRadarSessionCamera(sess) {
  if (!sess || !nutriPlantMap || !nutriPlantMap.map) return;
  try {
    if (
      sess.mapCenter &&
      Number.isFinite(Number(sess.mapCenter.lat)) &&
      Number.isFinite(Number(sess.mapCenter.lng))
    ) {
      nutriPlantMap.map.setCenter({
        lat: Number(sess.mapCenter.lat),
        lng: Number(sess.mapCenter.lng)
      });
    }
    if (Number.isFinite(Number(sess.mapZoom))) {
      nutriPlantMap.map.setZoom(Number(sess.mapZoom));
    }
  } catch (e) {
    console.warn('np_applyRadarSessionCamera:', e);
  }
}

window.np_captureRadarSessionState = function np_captureRadarSessionState() {
  let internalTab = window.__nutriplantRadarInternalTab || 'poligono';
  try {
    const btn = document.querySelector('.radar-satelital-container .radar-tab-button.active');
    const t = btn && btn.getAttribute('data-radartab');
    if (t === 'lectura' || t === 'poligono') internalTab = t;
  } catch (e) {}
  window.__nutriplantRadarInternalTab = internalTab;

  let mapCenter = null;
  let mapZoom = null;
  try {
    if (nutriPlantMap && nutriPlantMap.map) {
      const c = nutriPlantMap.map.getCenter();
      if (c) mapCenter = { lat: c.lat(), lng: c.lng() };
      mapZoom = nutriPlantMap.map.getZoom();
    }
  } catch (e2) {}

  const overlayVisible = !!(radarGroundOverlay || window.__nutriplantRadarOverlaySource);
  window.__nutriplantRadarSession = {
    projectId: np_getRadarProjectIdForSession(),
    index: np_getSelectedRadarIndex(),
    overlayVisible,
    overlaySource: window.__nutriplantRadarOverlaySource || null,
    internalTab,
    requestId: np_getSelectedRadarRequestId() || null,
    mapCenter,
    mapZoom,
    at: Date.now()
  };
  return window.__nutriplantRadarSession;
};

window.np_markRadarOverlaySession = function np_markRadarOverlaySession(visible) {
  const sess = window.__nutriplantRadarSession || {};
  const projectId = np_getRadarProjectIdForSession() || sess.projectId || null;
  window.__nutriplantRadarSession = Object.assign({}, sess, {
    projectId,
    index: np_getSelectedRadarIndex(),
    overlayVisible: !!visible,
    overlaySource: visible ? window.__nutriplantRadarOverlaySource || sess.overlaySource || null : null,
    requestId: np_getSelectedRadarRequestId() || sess.requestId || null,
    at: Date.now()
  });
};

window.np_restoreRadarSessionState = async function np_restoreRadarSessionState(opts) {
  const soft = !!(opts && opts.soft);
  const sess = window.__nutriplantRadarSession;
  if (!sess || !sess.projectId) return false;
  const pid = np_getRadarProjectIdForSession();
  if (!pid || String(pid) !== String(sess.projectId)) return false;

  if (window.__npRadarRestoreBusy) return false;
  window.__npRadarRestoreBusy = true;
  try {
    if (typeof window.np_applyRadarInternalTabFromSession === 'function') {
      window.np_applyRadarInternalTabFromSession();
    }
    if (sess.index) {
      np_setSelectedRadarIndex(sess.index);
      np_updateRadarScaleUi(sess.index);
    }

    const mapReady = typeof np_isLocationMapReady === 'function' && np_isLocationMapReady();
    if (!mapReady) {
      window.__npRadarRestoreBusy = false;
      window.__npRadarRestoreTries = (window.__npRadarRestoreTries || 0) + 1;
      if (window.__npRadarRestoreTries <= 14) {
        setTimeout(function () {
          window.np_restoreRadarSessionState(opts);
        }, 350);
      }
      return false;
    }
    window.__npRadarRestoreTries = 0;

    if (soft && radarGroundOverlay) {
      try {
        if (typeof google !== 'undefined' && google.maps && nutriPlantMap.map) {
          google.maps.event.trigger(nutriPlantMap.map, 'resize');
        }
        if (nutriPlantMap && typeof nutriPlantMap.refreshMapView === 'function') {
          nutriPlantMap.refreshMapView('radar-soft-restore');
        }
      } catch (eSoft) {}
      np_applyRadarSessionCamera(sess);
      return true;
    }

    if (!sess.overlayVisible) {
      np_applyRadarSessionCamera(sess);
      return true;
    }

    const idx = np_normalizeRadarIndex(sess.index || 'ndvi');
    const restoreOpts = { skipFit: true, silent: true };
    if (idx === 'slope' || idx === 'elev') {
      await window.showRadarDemOnMap(idx, restoreOpts);
    } else if (sess.overlaySource === 'pilot') {
      const url = np_getRadarPilotDataUrl(idx);
      if (url) await np_applyRadarPilotOverlay(url, idx);
      else await window.showRadarNdviOnMap(restoreOpts);
    } else {
      await window.showRadarNdviOnMap(restoreOpts);
    }
    np_applyRadarSessionCamera(sess);
    return true;
  } catch (e) {
    console.warn('np_restoreRadarSessionState:', e);
    return false;
  } finally {
    window.__npRadarRestoreBusy = false;
  }
};

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
  },
  ndre: {
    label: 'NDRE',
    busyLabel: 'NDRE',
    title: 'Escala NDRE relativa al predio',
    low: 'Menor clorofila / dosel',
    high: 'Mayor clorofila / dosel',
    help: 'NDRE = clorofila y estado del dosel (red edge). Verde/teal = mayor; rojo/ámbar = menor dentro del mismo predio.',
    gradient: 'linear-gradient(90deg,#7f1d1d,#c2410c,#ca8a04,#eab308,#a3e635,#22c55e,#0d9488,#0f766e,#134e4a)',
    shownText: 'NDRE en mapa.',
    loadingText: 'Cargando imagen NDRE en el mapa...'
  },
  rgb: {
    label: 'RGB',
    busyLabel: 'RGB',
    title: 'Vista natural RGB del predio',
    low: 'Colores naturales',
    high: 'Sentinel-2',
    help: 'RGB = vista natural (bandas azul/verde/rojo). Útil para ubicar el predio y contrastar con índices.',
    gradient: 'linear-gradient(90deg,#1e3a8a,#2563eb,#22c55e,#eab308,#ea580c,#b91c1c)',
    shownText: 'RGB en mapa.',
    loadingText: 'Cargando imagen RGB en el mapa...'
  },
  clouds: {
    label: 'Nubes',
    busyLabel: 'Nubes',
    title: 'Máscara de nubes Sentinel-2',
    low: 'Morado = sombra',
    high: 'Blanco = nube',
    help: 'Máscara SCL: blanco/gris = nubes, morado = sombra y azul = agua. Las zonas transparentes quedaron despejadas.',
    gradient: 'linear-gradient(90deg,#7c3aed,#64748b,#cbd5e1,#ffffff)',
    shownText: 'Nubes y sombras en mapa.',
    loadingText: 'Cargando máscara de nubes en el mapa...'
  },
  slope: {
    label: 'Pendiente',
    busyLabel: 'Pendiente',
    title: 'Pendiente relativa del predio',
    low: 'Más plano',
    high: 'Más inclinado',
    help: 'Pendiente (%) del relieve (Copernicus DEM ~30 m). Crema/gris = más plano; café oscuro = más pendiente. Capa fija: no cambia con la imagen satelital.',
    gradient: 'linear-gradient(90deg,#f8f5f0,#e8e0d4,#d4c4a8,#c4a574,#a67c52,#8b5e3c,#6b4423,#4a2f1a,#2d1b0e)',
    shownText: 'Pendiente del predio en mapa.',
    loadingText: 'Cargando pendiente del predio en el mapa...'
  },
  elev: {
    label: 'Altura',
    busyLabel: 'Altura',
    title: 'Altura relativa del predio',
    low: 'Más baja',
    high: 'Más alta',
    help: 'Altitud (m) relativa al predio (Copernicus DEM ~30 m). Azul = más bajo; ámbar/café = más alto. Mismo color ≈ misma altura dentro del predio.',
    gradient: 'linear-gradient(90deg,#1e3a8a,#2563eb,#38bdf8,#7dd3fc,#a7f3d0,#fef3c7,#fbbf24,#ea580c,#9a3412)',
    shownText: 'Altura del predio en mapa.',
    loadingText: 'Cargando altura del predio en el mapa...'
  }
};

function np_normalizeRadarIndex(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'ndmi' || v === 'ndre' || v === 'rgb' || v === 'clouds' || v === 'slope' || v === 'elev') return v;
  return 'ndvi';
}

function np_getRadarIndexConfig(index) {
  const base = RADAR_INDEX_CONFIG[np_normalizeRadarIndex(index)] || RADAR_INDEX_CONFIG.ndvi;
  const idx = np_normalizeRadarIndex(index);
  const keys = {
    ndvi: {
      title: 'radar.scale_ndvi_title',
      low: 'radar.scale_low',
      high: 'radar.scale_high',
      help: 'radar.scale_ndvi_help',
      shownText: 'radar.shown_ndvi',
      loadingText: 'radar.loading_ndvi'
    },
    ndmi: {
      title: 'radar.scale_ndmi_title',
      low: 'radar.scale_ndmi_low',
      high: 'radar.scale_ndmi_high',
      help: 'radar.scale_ndmi_help',
      shownText: 'radar.shown_ndmi',
      loadingText: 'radar.loading_ndmi'
    },
    ndre: {
      title: 'radar.scale_ndre_title',
      low: 'radar.scale_ndre_low',
      high: 'radar.scale_ndre_high',
      help: 'radar.scale_ndre_help',
      shownText: 'radar.shown_ndre',
      loadingText: 'radar.loading_ndre'
    },
    rgb: {
      title: 'radar.scale_rgb_title',
      low: 'radar.scale_rgb_low',
      high: 'radar.scale_rgb_high',
      help: 'radar.scale_rgb_help',
      shownText: 'radar.shown_rgb',
      loadingText: 'radar.loading_rgb'
    },
    clouds: {
      label: 'radar.label_clouds',
      title: 'radar.scale_clouds_title',
      low: 'radar.scale_clouds_low',
      high: 'radar.scale_clouds_high',
      help: 'radar.scale_clouds_help',
      shownText: 'radar.shown_clouds',
      loadingText: 'radar.loading_clouds'
    },
    slope: {
      label: 'radar.label_slope',
      title: 'radar.scale_slope_title',
      low: 'radar.scale_slope_low',
      high: 'radar.scale_slope_high',
      help: 'radar.scale_slope_help',
      shownText: 'radar.shown_slope',
      loadingText: 'radar.loading_slope'
    },
    elev: {
      label: 'radar.label_elev',
      title: 'radar.scale_elev_title',
      low: 'radar.scale_elev_low',
      high: 'radar.scale_elev_high',
      help: 'radar.scale_elev_help',
      shownText: 'radar.shown_elev',
      loadingText: 'radar.loading_elev'
    }
  };
  const k = keys[idx] || keys.ndvi;
  const helpParams = idx === 'elev' ? { unit: np_elevDisplayUnit() } : undefined;
  return {
    label: k.label ? np_radarT(k.label, base.label) : base.label,
    busyLabel: base.busyLabel,
    title: np_radarT(k.title, base.title),
    low: np_radarT(k.low, base.low),
    high: np_radarT(k.high, base.high),
    help: np_radarT(k.help, base.help, helpParams),
    gradient: base.gradient,
    shownText: np_radarT(k.shownText, base.shownText),
    loadingText: np_radarT(k.loadingText, base.loadingText)
  };
}

function np_getSelectedRadarIndex() {
  const select = document.getElementById('radarIndexSelect');
  const value = select ? String(select.value || '').toLowerCase() : radarActiveIndex;
  return np_normalizeRadarIndex(value || radarActiveIndex);
}

function np_setSelectedRadarIndex(index) {
  radarActiveIndex = np_normalizeRadarIndex(index);
  const select = document.getElementById('radarIndexSelect');
  if (select) select.value = radarActiveIndex;
  np_updateRadarScaleUi();
}

function np_formatSlopePct(value, digits) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const d = digits != null ? digits : n >= 10 ? 0 : 1;
  return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d) + '%';
}

function np_formatElevM(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try {
    if (window.NpAgronomicUnits && typeof window.NpAgronomicUnits.formatResultFromSI === 'function') {
      return window.NpAgronomicUnits.formatResultFromSI(n, 'elevation');
    }
  } catch (e) { /* fallback */ }
  return Math.round(n) + ' ' + np_radarT('radar.unit_m', 'm');
}

function np_elevDisplayUnit() {
  try {
    if (window.NpAgronomicUnits && typeof window.NpAgronomicUnits.unit === 'function') {
      return window.NpAgronomicUnits.unit('elevation');
    }
  } catch (e) { /* fallback */ }
  return np_radarT('radar.unit_m', 'm');
}

window.np_formatElevM = np_formatElevM;
window.np_elevDisplayUnit = np_elevDisplayUnit;

function np_getSlopeScaleRange() {
  const dem = window.__nutriplantRadarDem;
  const meta = dem && dem.dem_meta ? dem.dem_meta : null;
  if (!meta) return null;
  const vis = meta.vis || null;
  let min = null;
  let max = null;
  if (vis && Number.isFinite(Number(vis.min)) && Number.isFinite(Number(vis.max))) {
    min = Number(vis.min);
    max = Number(vis.max);
  } else if (Number.isFinite(Number(meta.slope_min)) && Number.isFinite(Number(meta.slope_max))) {
    min = Number(meta.slope_min);
    max = Number(meta.slope_max);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  return { min, max, mean: Number.isFinite(Number(meta.slope_mean)) ? Number(meta.slope_mean) : null };
}

function np_getElevScaleRange() {
  const dem = window.__nutriplantRadarDem;
  const meta = dem && dem.dem_meta ? dem.dem_meta : null;
  if (!meta) return null;
  const vis = meta.elev_vis || null;
  let min = null;
  let max = null;
  if (vis && Number.isFinite(Number(vis.min)) && Number.isFinite(Number(vis.max))) {
    min = Number(vis.min);
    max = Number(vis.max);
  } else if (Number.isFinite(Number(meta.elev_min)) && Number.isFinite(Number(meta.elev_max))) {
    min = Number(meta.elev_min);
    max = Number(meta.elev_max);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  return { min, max, mean: Number.isFinite(Number(meta.elev_mean)) ? Number(meta.elev_mean) : null };
}

function np_renderRadarScaleTickRow(points) {
  const safe = (Array.isArray(points) ? points : []).slice(0, 3).map(function (item, i, arr) {
    const t = Math.max(0, Math.min(1, Number(item.t) || 0));
    return {
      t: t,
      label: String(item.label || ''),
      align: i === 0 ? 'start' : i === arr.length - 1 ? 'end' : 'mid'
    };
  });
  if (!safe.length) return '';
  const marks = safe
    .map(function (item) {
      return (
        '<span class="radar-scale-mark radar-scale-mark--' +
        item.align +
        '" style="left:' +
        item.t * 100 +
        '%"></span>'
      );
    })
    .join('');
  // Etiquetas siempre en inicio / medio / fin (space-between) para que no se amontonen.
  const labels = safe
    .map(function (item) {
      return (
        '<span class="radar-scale-tick-label radar-scale-tick-label--' +
        item.align +
        '">' +
        item.label +
        '</span>'
      );
    })
    .join('');
  return (
    '<div class="radar-scale-tick-marks" aria-hidden="true">' +
    marks +
    '</div><div class="radar-scale-tick-labels">' +
    labels +
    '</div>'
  );
}

function np_updateRadarScaleTicks(index) {
  const ticks = document.getElementById('radarScaleTicks');
  const panel = document.getElementById('radarNdviPanel');
  const scale = document.getElementById('radarNdviScale');
  const wrap = document.getElementById('radarScaleBarWrap');
  if (!ticks) return;
  const idx = np_normalizeRadarIndex(index);
  [panel, scale].forEach((el) => {
    if (!el) return;
    el.classList.toggle('radar-scale-slope', idx === 'slope');
    el.classList.toggle('radar-scale-elev', idx === 'elev');
  });
  if (wrap) {
    wrap.style.width = '';
    wrap.style.maxWidth = '';
  }

  if (idx !== 'slope' && idx !== 'elev') {
    ticks.hidden = true;
    ticks.innerHTML = '';
    return;
  }

  const isElev = idx === 'elev';
  const range = isElev ? np_getElevScaleRange() : np_getSlopeScaleRange();
  const fmt = isElev ? np_formatElevM : np_formatSlopePct;

  if (!range) {
    const fallback = isElev
      ? [
          { t: 0, label: np_radarT('radar.scale_elev_tick_low', 'baja') },
          { t: 0.5, label: np_radarT('radar.scale_elev_tick_mid', 'media') },
          { t: 1, label: np_radarT('radar.scale_elev_tick_high', 'alta') }
        ]
      : [
          { t: 0, label: '0%' },
          { t: 0.5, label: '7.5%' },
          { t: 1, label: '15%' }
        ];
    ticks.innerHTML = np_renderRadarScaleTickRow(fallback);
    ticks.hidden = false;
    return;
  }

  const mid =
    range.mean != null && range.mean >= range.min && range.mean <= range.max
      ? range.mean
      : (range.min + range.max) / 2;
  // Marca media en su posición real; si queda muy pegada a un extremo, la anclamos
  // al centro visual para que el valor medio se lea separado.
  let tMid = (mid - range.min) / (range.max - range.min);
  if (!Number.isFinite(tMid)) tMid = 0.5;
  if (tMid < 0.28 || tMid > 0.72) tMid = 0.5;
  const points = [
    { t: 0, label: fmt(range.min) },
    { t: tMid, label: fmt(mid) },
    { t: 1, label: fmt(range.max) }
  ];
  ticks.innerHTML = np_renderRadarScaleTickRow(points);
  ticks.hidden = false;
}

function np_updateRadarScaleUi(indexOverride) {
  const idx = indexOverride != null ? np_normalizeRadarIndex(indexOverride) : np_getSelectedRadarIndex();
  const cfg = np_getRadarIndexConfig(idx);
  const title = document.getElementById('radarScaleTitle');
  const low = document.getElementById('radarScaleLow');
  const high = document.getElementById('radarScaleHigh');
  const bar = document.getElementById('radarScaleBar');
  const help = document.getElementById('radarNdviHelp');
  if (title) title.textContent = cfg.title;
  if (bar) bar.style.background = cfg.gradient;
  if (help) help.textContent = cfg.help;
  const scaleEl = document.getElementById('radarNdviScale');
  if (scaleEl) scaleEl.title = [cfg.title, cfg.help].filter(Boolean).join(' — ');

  if (idx === 'slope') {
    const range = np_getSlopeScaleRange();
    if (low) {
      low.textContent = range
        ? np_radarT('radar.scale_slope_low_val', 'Plano {v}', { v: np_formatSlopePct(range.min) })
        : cfg.low;
    }
    if (high) {
      high.textContent = range
        ? np_radarT('radar.scale_slope_high_val', 'Inclinado {v}', { v: np_formatSlopePct(range.max) })
        : cfg.high;
    }
  } else if (idx === 'elev') {
    const range = np_getElevScaleRange();
    if (low) {
      low.textContent = range
        ? np_radarT('radar.scale_elev_low_val', 'Baja {v}', { v: np_formatElevM(range.min) })
        : cfg.low;
    }
    if (high) {
      high.textContent = range
        ? np_radarT('radar.scale_elev_high_val', 'Alta {v}', { v: np_formatElevM(range.max) })
        : cfg.high;
    }
  } else {
    if (low) low.textContent = cfg.low;
    if (high) high.textContent = cfg.high;
  }

  np_updateRadarScaleTicks(idx);
  np_updateRadarActionLabels(idx);
  np_updateRadarSnapshotSelectForIndex(idx);
}

function np_updateRadarActionLabels(indexOverride) {
  const idx = indexOverride != null ? np_normalizeRadarIndex(indexOverride) : np_getSelectedRadarIndex();
  const cfg = np_getRadarIndexConfig(idx);
  const viewBtn = document.getElementById('radarBtnView');
  const hideBtn = document.getElementById('radarBtnHide');
  const genBtn = document.getElementById('radarBtnGenerate');
  const statusBtn = document.getElementById('radarBtnRefresh');
  if (viewBtn) {
    viewBtn.textContent = np_radarT('radar.btn_view', '👁 Ver imagen {label}', { label: cfg.label });
  }
  if (hideBtn) hideBtn.textContent = np_radarT('radar.btn_hide', '🙈 Ocultar capa');
  if (genBtn && !genBtn.classList.contains('radar-loading')) {
    genBtn.textContent = np_radarT('radar.btn_generate', '🛰 Generar / actualizar imagen satelital');
    genBtn.dataset.originalText = genBtn.textContent;
  }
  if (statusBtn) statusBtn.textContent = np_radarT('radar.btn_status', '🔄 Estado');
}

function np_getRadarSignedUrl(data, index) {
  const snap = data && (data.snapshot || data.latest) ? data.snapshot || data.latest : data;
  if (!snap) return '';
  const idx = np_normalizeRadarIndex(index);
  if (idx === 'slope') {
    return (
      snap.dem_signed_url ||
      (data && data.dem_signed_url) ||
      (data && data.dem && data.dem.dem_signed_url) ||
      ''
    );
  }
  if (idx === 'elev') {
    return (
      snap.elev_signed_url ||
      (data && data.elev_signed_url) ||
      (data && data.dem && data.dem.elev_signed_url) ||
      ''
    );
  }
  if (idx === 'ndmi') {
    return snap.ndmi_signed_url || snap.images?.ndmi?.signed_url || '';
  }
  if (idx === 'ndre') {
    return snap.ndre_signed_url || snap.images?.ndre?.signed_url || '';
  }
  if (idx === 'rgb') {
    return snap.rgb_signed_url || snap.images?.rgb?.signed_url || '';
  }
  if (idx === 'clouds') {
    return snap.cloud_mask_signed_url || snap.images?.clouds?.signed_url || '';
  }
  return snap.signed_url || snap.images?.ndvi?.signed_url || '';
}

function np_getDemSignedUrl(statusOrDem, index) {
  if (!statusOrDem) return '';
  const idx = index != null ? np_normalizeRadarIndex(index) : np_getSelectedRadarIndex();
  if (idx === 'elev') {
    if (statusOrDem.elev_signed_url) return String(statusOrDem.elev_signed_url);
    if (statusOrDem.dem && statusOrDem.dem.elev_signed_url) {
      return String(statusOrDem.dem.elev_signed_url);
    }
    const cached = window.__nutriplantRadarDem;
    if (cached && cached.elev_signed_url) return String(cached.elev_signed_url);
    return '';
  }
  if (statusOrDem.dem_signed_url) return String(statusOrDem.dem_signed_url);
  if (statusOrDem.dem && statusOrDem.dem.dem_signed_url) {
    return String(statusOrDem.dem.dem_signed_url);
  }
  const cached = window.__nutriplantRadarDem;
  if (cached && cached.dem_signed_url) return String(cached.dem_signed_url);
  return '';
}

function np_storeRadarDemState(demPayload) {
  if (!demPayload || typeof demPayload !== 'object') {
    window.__nutriplantRadarDem = null;
    return;
  }
  window.__nutriplantRadarDem = {
    has_dem: !!demPayload.has_dem,
    has_elev: !!demPayload.has_elev || !!demPayload.elev_signed_url,
    dem_signed_url: demPayload.dem_signed_url || null,
    elev_signed_url: demPayload.elev_signed_url || null,
    dem_stale: !!demPayload.dem_stale,
    dem_meta: demPayload.dem_meta || null,
    current_polygon_hash: demPayload.current_polygon_hash || null
  };
}

function np_updateRadarSnapshotSelectForIndex(indexOverride) {
  const idx = indexOverride != null ? np_normalizeRadarIndex(indexOverride) : np_getSelectedRadarIndex();
  const sel = document.getElementById('radarSnapshotSelect');
  if (!sel) return;
  if (idx === 'slope' || idx === 'elev') {
    sel.disabled = true;
    const dem = window.__nutriplantRadarDem;
    const label =
      dem && (idx === 'elev' ? dem.has_elev || dem.elev_signed_url : dem.has_dem)
        ? np_radarT('radar.dem_snapshot_fixed', 'Relieve (fijo del predio)')
        : np_radarT('radar.dem_snapshot_none', 'Sin relieve generado');
    sel.title = label;
    return;
  }
  const st = window.__nutriplantRadarNdviStatus;
  const hasHistory = !!(st && Array.isArray(st.history) && st.history.length);
  sel.disabled = !hasHistory;
  sel.title = np_radarT('radar.snapshot_title', 'Imágenes Radar guardadas de este proyecto');
}

function np_formatRadarDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(np_radarLocale(), { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) {
    return String(iso);
  }
}

function np_formatRadarHistoryOption(item) {
  if (!item) return np_radarT('radar.image_radar', 'Imagen Radar');
  const gen = np_formatRadarDateTime(item.created_at);
  const sceneDates = Array.isArray(item.scene_dates)
    ? item.scene_dates.map((d) => String(d).slice(0, 10)).filter(Boolean)
    : [];
  if (sceneDates.length) {
    return gen + ' · ' + np_radarT('radar.data_prefix', 'Datos ') + sceneDates.join(', ');
  }
  const sp = item.sentinel_period || {};
  if (sp.from && sp.to) return gen + ' · Sentinel ' + sp.from + ' – ' + sp.to;
  if (item.month_key) return gen + ' · ' + item.month_key;
  return gen;
}

function np_formatRadarSceneMetaHtml(snap) {
  if (!snap) return '';
  const meta = snap.meta || {};
  const bits = [];
  const sceneDates = Array.isArray(meta.scene_dates)
    ? meta.scene_dates.map((d) => String(d).slice(0, 10)).filter(Boolean)
    : [];
  const from = meta.date_start || snap.sentinel_period?.from;
  const to = meta.date_end || snap.sentinel_period?.to;

  if (sceneDates.length) {
    bits.push('<strong>' + np_escapeHtml(np_radarT(sceneDates.length > 1 ? 'radar.meta_dates' : 'radar.meta_date', sceneDates.length > 1 ? 'Fechas:' : 'Fecha:')) + '</strong> ' + np_escapeHtml(sceneDates.join(', ')));
  } else if (from && to) {
    bits.push(
      from === to
        ? '<strong>' + np_escapeHtml(np_radarT('radar.meta_date', 'Fecha:')) + '</strong> ' + np_escapeHtml(from)
        : '<strong>' + np_escapeHtml(np_radarT('radar.meta_dates', 'Fechas:')) + '</strong> ' + np_escapeHtml(from) + ' – ' + np_escapeHtml(to)
    );
  }

  const lookback = meta.lookback_days != null ? Number(meta.lookback_days) : null;
  const scenes = meta.scene_count != null ? Number(meta.scene_count) : null;
  const avgCloud = meta.avg_cloud_cover != null ? Number(meta.avg_cloud_cover) : null;
  const validPct =
    meta.valid_pct != null
      ? Number(meta.valid_pct)
      : meta.coverage && meta.coverage.valid_pct != null
        ? Number(meta.coverage.valid_pct)
        : null;

  const detail = [];
  if (Number.isFinite(lookback)) detail.push(lookback + ' d');
  if (Number.isFinite(scenes) && scenes > 0) {
    detail.push(
      scenes +
        ' ' +
        (scenes === 1
          ? np_radarT('radar.scene_one', 'escena')
          : np_radarT('radar.scene_many', 'escenas')) +
        (meta.composite || scenes > 1
          ? ' · ' + np_radarT('radar.median', 'mediana')
          : ' · ' + np_radarT('radar.single_pass', 'pasada única'))
    );
  }
  if (Number.isFinite(avgCloud)) {
    detail.push(
      np_radarT('radar.clouds_approx', 'nubes ~{pct}%', {
        pct: (Math.round(avgCloud * 10) / 10).toFixed(1)
      })
    );
  }
  if (Number.isFinite(validPct)) {
    const warn = validPct < 40;
    detail.push(
      (warn ? '<span style="color:#b45309">' : '') +
        np_radarT('radar.useful_pct', 'útiles {pct}%', { pct: validPct }) +
        (warn ? '</span>' : '')
    );
  }
  if (detail.length) bits.push(detail.join(' · '));

  return bits.join(' · ');
}

function np_updateRadarSceneMeta(snap) {
  const el = document.getElementById('radarSceneMeta');
  if (!el) return;
  const html = np_formatRadarSceneMetaHtml(snap);
  if (!html) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  el.innerHTML = html;
  el.style.display = 'block';
}

function np_formatRadarDisplayedCaption(snap, overlayCtx) {
  if (!snap) return '';
  const parts = [];
  const meta = snap.meta || {};
  const sceneDates = Array.isArray(meta.scene_dates)
    ? meta.scene_dates.map((d) => String(d).slice(0, 10)).filter(Boolean)
    : [];
  const from = meta.date_start || snap.sentinel_period?.from;
  const to = meta.date_end || snap.sentinel_period?.to;
  if (sceneDates.length) {
    parts.push(
      'Datos satelitales: ' +
        (sceneDates.length > 1 ? sceneDates.join(', ') : sceneDates[0])
    );
  } else if (from && to) {
    parts.push(from === to ? 'Datos satelitales: ' + from : 'Datos satelitales: ' + from + ' – ' + to);
  }
  if (snap.created_at) parts.push('Generada ' + np_formatRadarDateTime(snap.created_at));
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

function np_setRadarSnapshotPickerUi(state) {
  const picker = document.querySelector('.radar-ndvi-panel .radar-snapshot-picker');
  const sel = document.getElementById('radarSnapshotSelect');
  const del = document.getElementById('radarBtnDeleteSnapshot');
  const mode = state === 'ready' || state === 'empty' || state === 'loading' ? state : 'empty';
  if (picker) {
    picker.classList.toggle('is-loading', mode === 'loading');
  }
  if (del) {
    if (mode === 'ready') del.removeAttribute('hidden');
    else del.setAttribute('hidden', '');
  }
  if (mode === 'loading' && sel) {
    sel.disabled = true;
    sel.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = np_radarT('radar.loading_saved_images', 'Cargando de la nube…');
    sel.appendChild(opt);
  }
}

function np_populateRadarSnapshotSelect(history, preferredId) {
  const sel = document.getElementById('radarSnapshotSelect');
  if (!sel) return;
  // Solo Pilot (pestaña 1). Las de Lectura Satelital van en su propia galería.
  const list = (Array.isArray(history) ? history : []).filter((h) => !h || !h.lectura);
  const prev = preferredId || np_getSelectedRadarRequestId();
  sel.innerHTML = '';
  if (!list.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = np_radarT('radar.no_pilot_images', 'Sin imágenes satelitales guardadas');
    sel.appendChild(opt);
    sel.disabled = true;
    np_setRadarSnapshotPickerUi('empty');
    return;
  }
  list.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = String(item.id);
    opt.textContent = (idx === 0 ? np_radarT('radar.most_recent', 'Más reciente · ') : '') + np_formatRadarHistoryOption(item);
    sel.appendChild(opt);
  });
  sel.disabled = false;
  const match = list.find((h) => String(h.id) === String(prev));
  sel.value = match ? String(match.id) : String(list[0].id);
  np_setRadarSnapshotPickerUi('ready');
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
    np_setRadarStatusHint(
      'Imagen seleccionada: ' +
        np_formatRadarHistoryOption(item) +
        '. Pulsa «Ver imagen» para superponerla.',
      { variant: 'info' }
    );
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
      if (!generateBtn.dataset.originalText) generateBtn.dataset.originalText = generateBtn.textContent || np_radarT('radar.btn_generate', '🛰 Generar / actualizar imagen satelital');
      generateBtn.textContent = np_radarT('radar.btn_generating', '⏳ Generando imagen satelital...');
      generateBtn.classList.add('radar-loading');
    } else {
      generateBtn.textContent = generateBtn.dataset.originalText || np_radarT('radar.btn_generate', '🛰 Generar / actualizar imagen satelital');
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
      'Generando imagen satelital (NDVI y NDMI)... puede tardar ~1–2 min. Si termina y no ves el mapa, pulsa «Ver imagen».';
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

function np_pilotFriendlyErrorMessage(rawMsg) {
  const msg = String(rawMsg || '');
  if (/STAC search HTTP (429|502|503|504)/i.test(msg)) {
    return (
      'El servicio satelital tardó demasiado en responder. ' +
      'No es por nubosidad del predio: es un retraso temporal. Intenta de nuevo en 1–2 minutos.'
    );
  }
  if (/maximum allowed time|gateway timeout/i.test(msg)) {
    return 'El servicio satelital tardó demasiado. Intenta de nuevo en 1–2 minutos.';
  }
  return msg || 'Error desconocido';
}

function np_pilotUserErrorMessage(status, data) {
  const errorKey = String((data && (data.error || data.code)) || '').toLowerCase();
  const serverMsg = String((data && data.message) || '');
  let code = 9000;
  let message = 'No se pudo generar la imagen satelital en este momento. Intenta de nuevo en unos minutos.';

  if (status === 401) {
    code = 4011;
    message = 'Tu sesión expiró. Vuelve a iniciar sesión e intenta generar la imagen satelital otra vez.';
  } else if (status === 403) {
    code = 4031;
    message = 'No se pudo validar el acceso a este proyecto. Vuelve a seleccionar el proyecto e intenta de nuevo.';
  } else if (status === 404 || errorKey.includes('project_not_found')) {
    code = 4041;
    message = 'No se encontró el proyecto en la nube. Sincroniza el proyecto e intenta de nuevo.';
  } else if (status === 429 || errorKey.includes('quota')) {
    code = 4291;
    message = 'No hay créditos Radar suficientes para generar imagen satelital este mes.';
  } else if (errorKey.includes('radar_area_too_large') || /Radar máximo\s+\d+\s*ha/i.test(serverMsg)) {
    code = 4002;
    message =
      serverMsg ||
      'Radar máximo 250 ha; divide el polígono en lotes más chicos para generar la imagen.';
  } else if (
    errorKey.includes('radar_low_coverage') ||
    /cobertura satelital útil|píxeles válidos|radar_low_coverage/i.test(serverMsg)
  ) {
    code = 5022;
    message =
      'Probamos las pasadas Sentinel disponibles (14–45 días) y ninguna quedó lo bastante despejada sobre este predio. ' +
      'Ya no rellenamos con otras fechas (para no engañar el vigor). Prueba de nuevo tras la próxima pasada (~5 días).';
  } else if (status === 500) {
    code = 5001;
  } else if (status === 502) {
    code = 5021;
    if (/cobertura satelital útil|píxeles válidos|radar_low_coverage|45 días|30 días/i.test(serverMsg)) {
      code = 5022;
      message =
        'Probamos las pasadas Sentinel disponibles (14–45 días) y ninguna quedó lo bastante despejada sobre este predio. ' +
        'Ya no rellenamos con otras fechas (para no engañar el vigor). Prueba de nuevo tras la próxima pasada (~5 días).';
    }
  } else if (status === 504) {
    code = 5041;
    message = /STAC search HTTP/i.test(serverMsg)
      ? np_pilotFriendlyErrorMessage(serverMsg)
      : 'La imagen satelital tardó más de lo esperado. Intenta de nuevo en unos minutos.';
  } else if (status === 409 || errorKey.includes('pilot_job_active')) {
    code = 4091;
    message =
      'Ya hay una imagen satelital generándose para este predio. Revisa «Estado» en unos minutos; no hace falta volver a pulsar Generar.';
  }

  return message + '\n\nCódigo: ' + code;
}

let np_pilotPollTimer = null;

function np_escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function np_setRadarStatusHint(content, opts) {
  const hint = document.getElementById('radarStatusHint');
  if (!hint) return;
  const options = opts || {};
  hint.classList.remove('radar-hint-pending', 'radar-hint-ready', 'radar-hint-warn', 'radar-hint-info');
  if (options.variant) hint.classList.add('radar-hint-' + options.variant);
  if (options.html) hint.innerHTML = content;
  else hint.textContent = content;
  const panel = document.getElementById('radarNdviPanel');
  if (panel) panel.classList.toggle('radar-panel-pending', options.variant === 'pending');
}

function np_buildPilotPendingHintHtml(pendingJob) {
  const when = pendingJob?.created_at
    ? np_escapeHtml(np_formatRadarHistoryOption({ created_at: pendingJob.created_at }))
    : '';
  return (
    '<span class="radar-hint-em">Generando imagen satelital (Sentinel-2) en segundo plano</span>' +
    (when ? ' · solicitud ' + when : '') +
    '. Por temas del proveedor satelital puede tardar <span class="radar-hint-em">unos minutos</span>. ' +
    'Revisa <span class="radar-hint-action">Estado</span> o vuelve más tarde; ' +
    '<span class="radar-hint-key">se guardará en la nube aunque cierres NutriPlant</span>.'
  );
}

function np_buildPilotSendingHintHtml() {
  return (
    'Enviando solicitud satelital… Por temas del proveedor puede tardar ' +
    '<span class="radar-hint-em">unos minutos</span> en quedar lista. ' +
    'Puedes seguir usando la plataforma; revisa <span class="radar-hint-action">Estado</span> cuando quieras.'
  );
}

function np_buildPilotReadyHintHtml(label) {
  const layer = np_escapeHtml(label || 'NDVI');
  return (
    '<span class="radar-hint-key">Imagen satelital lista</span> y guardada en la nube. Pulsa ' +
    '<span class="radar-hint-action">Ver imagen ' +
    layer +
    '</span> para verla en el mapa.'
  );
}

function np_buildPilotDuplicateHintHtml() {
  return (
    '<span class="radar-hint-em">Ya hay una imagen satelital generándose</span> para este predio. ' +
    'Revisa <span class="radar-hint-action">Estado</span> en unos minutos; ' +
    '<span class="radar-hint-key">no hace falta volver a pulsar Generar</span>.'
  );
}

function np_formatPilotPendingMessage(pendingJob) {
  const when = pendingJob?.created_at ? np_formatRadarHistoryOption({ created_at: pendingJob.created_at }) : '';
  return (
    'Generando imagen satelital (Sentinel-2) en segundo plano' +
    (when ? ' · solicitud ' + when : '') +
    '. Por temas del proveedor satelital puede tardar unos minutos. Revisa «Estado» o vuelve más tarde; se guardará en la nube aunque cierres NutriPlant.'
  );
}

function np_setPilotPendingUi(isPending, messageKind) {
  const generateBtn = document.getElementById('radarBtnGenerate');
  const buttons = ['radarBtnRefresh', 'radarBtnView', 'radarBtnGenerate', 'radarBtnHide']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  window.__nutriplantPilotPending = !!isPending;

  if (generateBtn) {
    if (isPending) {
      if (!generateBtn.dataset.originalText) {
        generateBtn.dataset.originalText = generateBtn.textContent || np_radarT('radar.btn_generate', '🛰 Generar / actualizar imagen satelital');
      }
      generateBtn.textContent = np_radarT('radar.btn_generating_cloud', '⏳ Generando en la nube…');
      generateBtn.classList.add('radar-loading');
      generateBtn.disabled = true;
    } else {
      generateBtn.textContent = generateBtn.dataset.originalText || np_radarT('radar.btn_generate', '🛰 Generar / actualizar imagen satelital');
      generateBtn.classList.remove('radar-loading');
      generateBtn.disabled = false;
    }
  }

  buttons.forEach((btn) => {
    if (!btn || btn.id === 'radarBtnGenerate') return;
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = '';
  });

  if (isPending) {
    let html = np_buildPilotPendingHintHtml(window.__nutriplantPilotPendingJob);
    if (messageKind === 'sending') html = np_buildPilotSendingHintHtml();
    else if (messageKind === 'duplicate') html = np_buildPilotDuplicateHintHtml();
    np_setRadarStatusHint(html, { html: true, variant: 'pending' });
  } else {
    const panel = document.getElementById('radarNdviPanel');
    if (panel) panel.classList.remove('radar-panel-pending');
  }
}

function np_stopPilotPendingPoll() {
  if (np_pilotPollTimer) {
    clearInterval(np_pilotPollTimer);
    np_pilotPollTimer = null;
  }
}

function np_startPilotPendingPoll(prevCreatedAt) {
  np_stopPilotPendingPoll();
  np_pilotPollTimer = setInterval(async () => {
    try {
      const before = prevCreatedAt || np_getRadarLatestCreatedAtFromStatus(window.__nutriplantRadarNdviStatus);
      await window.refreshRadarNdviStatus();
      const st = window.__nutriplantRadarNdviStatus;
      if (st?.pending_job) return;
      const newAt = np_getRadarLatestCreatedAtFromStatus(st);
      if (newAt && String(newAt) !== String(before)) {
        np_stopPilotPendingPoll();
        np_setPilotPendingUi(false);
        const cfg = np_getRadarIndexConfig(np_getSelectedRadarIndex());
        np_setRadarStatusHint(np_buildPilotReadyHintHtml(cfg.label), { html: true, variant: 'ready' });
        if (st.latest) np_updateRadarSceneMeta(st.latest);
        return;
      }
      if (st?.last_failed_job) {
        np_stopPilotPendingPoll();
        np_setPilotPendingUi(false);
      }
    } catch (e) {
      console.warn('Pilot poll:', e);
    }
  }, 25000);
}

function np_syncPilotPendingFromStatus(st) {
  if (st?.pending_job) {
    window.__nutriplantPilotPendingJob = st.pending_job;
    np_setPilotPendingUi(true, 'pending');
    np_startPilotPendingPoll(np_getRadarLatestCreatedAtFromStatus(st));
    return true;
  }
  if (window.__nutriplantPilotPending) {
    np_setPilotPendingUi(false);
    np_stopPilotPendingPoll();
  }
  window.__nutriplantPilotPendingJob = null;
  return false;
}

function np_clearRadarPilotState() {
  window.__nutriplantRadarPilot = null;
  np_stopPilotPendingPoll();
  window.__nutriplantPilotPending = false;
  window.__nutriplantPilotPendingJob = null;
}

function np_getPilotRadarIndex() {
  return np_getSelectedRadarIndex();
}

function np_setPilotRadarIndex(index) {
  window.__nutriplantRadarPilotLayer = np_normalizeRadarIndex(index);
  np_setSelectedRadarIndex(window.__nutriplantRadarPilotLayer);
  np_updatePilotLayerButtonUi();
}

function np_updatePilotLayerButtonUi() {
  const btn = document.getElementById('radarBtnPilotLayer');
  if (!btn) return;
  const idx = np_getPilotRadarIndex();
  const cfg = np_getRadarIndexConfig(idx);
  btn.textContent = cfg.label;
  btn.title = 'Imagen satelital: mostrando ' + cfg.label + ' (clic para ciclar NDVI → NDMI → NDRE → RGB → Nubes)';
  btn.setAttribute('aria-pressed', idx !== 'ndvi' ? 'true' : 'false');
}

async function np_togglePilotRadarLayer() {
  const order = ['ndvi', 'ndmi', 'ndre', 'rgb', 'clouds'];
  const cur = np_getPilotRadarIndex();
  const next = order[(order.indexOf(cur) + 1) % order.length];
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
      'Capa ' + cfg.label + ' activa. Cambia NDVI/NDMI/NDRE/RGB/Nubes desde el selector.';
  }
}

function np_formatPilotOkHint(data, layerIndex) {
  const comp = data.composite || {};
  const meta = data.meta || {};
  const sceneCount =
    meta.scene_count != null
      ? meta.scene_count
      : comp.scene_count != null
        ? comp.scene_count
        : 1;
  const sceneDates = Array.isArray(meta.scene_dates)
    ? meta.scene_dates.map((d) => String(d).slice(0, 10)).filter(Boolean)
    : [];
  const dateRange =
    sceneDates.length > 1
      ? sceneDates.join(', ')
      : sceneDates.length === 1
        ? sceneDates[0]
        : (meta.date_start && meta.date_end && meta.date_start !== meta.date_end
            ? meta.date_start + ' – ' + meta.date_end
            : meta.date_end || meta.date_start) ||
          (comp.date_start && comp.date_end && comp.date_start !== comp.date_end
            ? comp.date_start + ' – ' + comp.date_end
            : comp.date_end || comp.date_start || '');
  const lookback = meta.lookback_days || comp.lookback_days || 14;
  const validPct = meta.valid_pct != null ? meta.valid_pct : meta.coverage?.valid_pct;
  const avgCloud = meta.avg_cloud_cover;
  const cfg = np_getRadarIndexConfig(layerIndex);
  let hint = 'Imagen guardada · ' + cfg.label;
  if (dateRange) hint += ' · ' + dateRange;
  hint +=
    ' · ventana ' +
    lookback +
    ' d · ' +
    sceneCount +
    ' escena' +
    (sceneCount === 1 ? '' : 's') +
    ' · SCL';
  if (Number.isFinite(Number(avgCloud))) hint += ' · nubes ~' + avgCloud + '%';
  if (Number.isFinite(Number(validPct))) hint += ' · útiles ' + validPct + '%';
  hint += '. Cambia NDVI/NDMI/NDRE/RGB desde el selector.';
  return hint;
}

function np_getRadarPilotDataUrl(index) {
  const pilot = window.__nutriplantRadarPilot;
  if (!pilot || !pilot.active) return '';
  const idx = np_normalizeRadarIndex(index);
  if (idx === 'slope') return '';
  if (idx === 'elev') return '';
  if (idx === 'ndmi') {
    return pilot.ndmi_signed_url || pilot.images?.ndmi?.signed_url || pilot.ndmi_data_url || pilot.images?.ndmi?.data_url || '';
  }
  if (idx === 'ndre') {
    return pilot.ndre_signed_url || pilot.images?.ndre?.signed_url || pilot.ndre_data_url || pilot.images?.ndre?.data_url || '';
  }
  if (idx === 'rgb') {
    return pilot.rgb_signed_url || pilot.images?.rgb?.signed_url || pilot.rgb_data_url || pilot.images?.rgb?.data_url || '';
  }
  if (idx === 'clouds') {
    return pilot.cloud_mask_signed_url || pilot.images?.clouds?.signed_url || pilot.cloud_mask_data_url || pilot.images?.clouds?.data_url || '';
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
  const maxHa = Number(pricing.max_area_ha || pricing.pricing?.max_area_ha) || 250;
  const s = cost === 1 ? '' : 's';
  if (ha != null && Number.isFinite(Number(ha)) && Number(ha) > maxHa) {
    return np_radarT('radar.credit_line_over', '{ha} ha — Radar máximo {maxHa} ha; divide el polígono', {
      ha: Number(ha).toFixed(2),
      maxHa: maxHa
    });
  }
  if (ha != null && Number.isFinite(Number(ha))) {
    return np_radarT(
      'radar.credit_line_with_ha',
      '{ha} ha → {cost} crédito{s} por generación (NDVI+NDMI+NDRE+RGB · máx. {maxHa} ha)',
      { ha: Number(ha).toFixed(2), cost: cost, s: s, maxHa: maxHa }
    );
  }
  return np_radarT(
    'radar.credit_line',
    '{cost} crédito{s} por generación (NDVI+NDMI+NDRE+RGB · máx. {maxHa} ha)',
    { cost: cost, s: s, maxHa: maxHa }
  );
}

/** Actualiza el texto de créditos en Pilot (tinta, sin caja). */
function np_setRadarCreditsBadge(opts) {
  const o = opts || {};
  const label = document.getElementById('radarCreditsLabel');
  const costEl = document.getElementById('radarCreditsCost');
  const badge = document.getElementById('radarCreditsBadge');
  if (!label) return;

  label.textContent = o.value != null ? String(o.value) : '—';
  if (costEl) costEl.textContent = '';
  if (!badge) return;

  const tip = [o.cost, o.value].filter(Boolean).join(' · ');
  if (tip) badge.title = tip;
  badge.classList.remove('is-low', 'is-warn');
  const tone = o.tone || 'ok';
  if (tone === 'low') badge.classList.add('is-low');
  else if (tone === 'warn') badge.classList.add('is-warn');
}
window.np_setRadarCreditsBadge = np_setRadarCreditsBadge;

function np_getRadarAreaLimitFromStatus() {
  const st = window.__nutriplantRadarNdviStatus;
  const pricing = st && st.pricing;
  if (!pricing) return null;
  const ha = Number(pricing.area_hectares);
  const maxHa = Number(pricing.max_area_ha || pricing.pricing?.max_area_ha) || 250;
  if (!Number.isFinite(ha) || ha <= 0) return null;
  if (ha <= maxHa) return null;
  return {
    ha: ha,
    maxHa: maxHa,
    message:
      np_radarT('radar.area_limit', 'Radar máximo {maxHa} ha; divide el polígono. Este predio tiene {ha} ha.', {
        maxHa: maxHa,
        ha: Math.round(ha * 100) / 100
      })
  };
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
  const idxNorm = np_normalizeRadarIndex(indexForLabel);
  const isDemLayer = idxNorm === 'slope' || idxNorm === 'elev';
  const isSlopeLayer = idxNorm === 'slope';
  // DEM (relieve): opacidad alta — el blur no debe dejarlo “lavado”/transparente.
  const containerOpacity =
    isPilotLayer || isDemLayer ? '1' : String(Math.min(Math.max(opacity, 0.86), 0.92));
  // DEM ~30 m: difuminar bloques (pendiente más que altura). Pilot: sin filtro. GEE legacy: saturación.
  // Pendiente: blur base; en draw() se ajusta según tamaño en pantalla (predios chicos = cuadros enormes).
  let visualFilter = isSlopeLayer
    ? 'blur(6px) contrast(1.14) saturate(1.2) brightness(0.96)'
    : isDemLayer
      ? 'blur(1.75px) contrast(1.08) saturate(1.08)'
      : isPilotLayer
        ? 'none'
        : 'saturate(1.35) contrast(1.15)';
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
    img.className = isDemLayer
      ? 'np-dem-smooth-img' + (isSlopeLayer ? ' np-dem-smooth-slope' : '')
      : '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
    img.style.objectFit = 'fill';
    img.style.pointerEvents = 'none';
    img.style.opacity = '1';
    img.style.filter = visualFilter;
    img.style.imageRendering = 'auto';
    this._npIsSlopeLayer = isSlopeLayer;
    this._npIsDemLayer = isDemLayer;
    this._npImg = img;
    img.onload = () => {
      console.log('✅ Imagen Radar cargada en overlay');
      if (typeof overlay.draw === 'function') overlay.draw();
    };
    img.onerror = () => {
      console.error('❌ La imagen Radar no pudo cargarse en el navegador:', url);
      const hint = document.getElementById('radarStatusHint');
      if (hint) hint.textContent = 'No se pudo cargar la imagen Radar firmada. Vuelve a pulsar Ver imagen.';
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
    // Pendiente: más zoom / predio chico → cuadros DEM más grandes → más blur (sin lavar el color).
    if (this._npIsSlopeLayer && this._npImg) {
      const edge = Math.max(width, height);
      const blurPx = Math.max(5, Math.min(16, Math.round(edge * 0.028)));
      this._npImg.style.filter =
        'blur(' + blurPx + 'px) contrast(1.14) saturate(1.2) brightness(0.96)';
    }
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
  const idx = index != null ? np_normalizeRadarIndex(index) : np_getPilotRadarIndex();
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
  np_showRadarOverlay(url, bounds, idx === 'clouds' ? 0.82 : 0.98, { pilot: true, index: idx });
  np_setRadarPolygonMask(true, null);
  np_showRadarLegend(true);
  if (nutriPlantMap && nutriPlantMap.map && bounds) {
    nutriPlantMap.map.fitBounds(bounds, { padding: 50 });
  }
  if (typeof window.np_markRadarOverlaySession === 'function') {
    window.np_markRadarOverlaySession(true);
  }
}

async function np_applyRadarOverlay(url, snap, index, opts) {
  const options = opts && typeof opts === 'object' ? opts : {};
  const skipFit = !!options.skipFit;
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
  const selectedIndex = index || np_getSelectedRadarIndex();
  np_showRadarOverlay(url, bounds, selectedIndex === 'clouds' ? 0.82 : 0.98, {
    pilot: isPilotSnapshot,
    index: selectedIndex
  });
  np_setRadarPolygonMask(
    true,
    overlayCtx.fromSnapshot ? overlayCtx.polygon : null
  );
  np_showRadarLegend(true);
  if (!skipFit && nutriPlantMap && nutriPlantMap.map && bounds) {
    nutriPlantMap.map.fitBounds(bounds, { padding: 50 });
  }
  if (hint) {
    const cap = np_formatRadarDisplayedCaption(snap, overlayCtx);
    hint.textContent = cfg.shownText + (cap ? ' ' + cap : '');
  }
  np_updateRadarSceneMeta(snap);
  if (typeof window.np_markRadarOverlaySession === 'function') {
    window.np_markRadarOverlaySession(true);
  }
}

window.refreshRadarNdviStatus = async function refreshRadarNdviStatus() {
  const label = document.getElementById('radarCreditsLabel');
  const hint = document.getElementById('radarStatusHint');
  if (!label) return;
  if (!np_isCloudSupabaseUser()) {
    np_setRadarCreditsBadge({
      value: '—',
      cost: np_radarT('radar.credits_login', 'Inicia sesión para ver créditos Radar'),
      tone: 'warn'
    });
    if (hint) hint.textContent = np_radarT('radar.credits_login', 'Inicia sesión para ver créditos Radar');
    return;
  }
  const token = await np_getRadarAccessToken();
  if (!token) {
    np_setRadarCreditsBadge({
      value: 'Sin sesión',
      cost: 'Vuelve a iniciar sesión',
      tone: 'warn'
    });
    return;
  }
  const proj =
    nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function'
      ? nutriPlantMap.getCurrentProject()
      : null;
  if (!proj || !proj.id) {
    np_setRadarCreditsBadge({
      value: '—',
      cost: 'Elige o guarda un proyecto',
      tone: 'warn'
    });
    return;
  }
  np_setRadarCreditsBadge({
    value: 'Consultando…',
    cost: 'Saldo del mes',
    tone: 'ok'
  });
  const hadHistory =
    window.__nutriplantRadarNdviStatus &&
    Array.isArray(window.__nutriplantRadarNdviStatus.history) &&
    window.__nutriplantRadarNdviStatus.history.some((h) => h && !h.lectura);
  if (!hadHistory) np_setRadarSnapshotPickerUi('loading');
  try {
    const res = await fetch(np_radarApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'status', project_id: String(proj.id) })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // No tumbar el estado “Generando…” por un fallo transitorio de consulta.
      const keepPending = !!(window.__nutriplantPilotPending || window.__nutriplantPilotPendingJob);
      np_setRadarCreditsBadge({
        value: keepPending ? 'Generando…' : 'Error saldo',
        cost: keepPending ? 'Consulta en curso' : 'Pulsa «Estado» de nuevo',
        tone: 'warn'
      });
      if (hint && !keepPending) {
        hint.textContent = data.message || data.error || 'No se pudo consultar Radar. Pulsa «Estado» de nuevo.';
      } else if (hint && keepPending) {
        // Dejar el hint de generación; el poll reintentará.
      }
      if (!keepPending) {
        np_populateRadarSnapshotSelect([]);
      }
      window.__nutriplantRadarNdviStatus = {
        ok: false,
        projectId: proj.id,
        updatedAt: new Date().toISOString(),
        error: data.message || data.error || 'No se pudo consultar Radar.',
        pending_job: keepPending ? window.__nutriplantPilotPendingJob || { status: 'processing' } : null
      };
      return;
    }
    const u = Number(data.credits?.used) || 0;
    const base = Number(data.credits?.base);
    const bonus = Number(data.credits?.bonus);
    const baseSafe = Number.isFinite(base) ? Math.max(0, Math.floor(base)) : 20;
    const bonusSafe = Number.isFinite(bonus) ? Math.max(0, Math.floor(bonus)) : 0;
    const l =
      Number.isFinite(Number(data.credits?.limit))
        ? Math.max(0, Math.floor(Number(data.credits.limit)))
        : baseSafe + bonusSafe;
    const disponiblesFromApi = Number(data.credits?.available);
    // Preferir fórmula nueva en cliente (base restante + bonus) para no depender
    // de un deploy parcial que aún mande available = tope − usados.
    const disponibles =
      Number.isFinite(base) || Number.isFinite(bonus)
        ? Math.max(0, baseSafe - u) + bonusSafe
        : Number.isFinite(disponiblesFromApi)
          ? Math.max(0, Math.floor(disponiblesFromApi))
          : Math.max(0, l - u);
    const history = Array.isArray(data.history) ? data.history : [];
    np_populateRadarSnapshotSelect(history, np_getPreferredRadarRequestId());
    window.__nutriplantRadarNdviStatus = {
      ok: true,
      projectId: proj.id,
      updatedAt: new Date().toISOString(),
      credits: {
        used: u,
        limit: l,
        base: baseSafe,
        bonus: bonusSafe,
        base_remaining: Math.max(0, baseSafe - u),
        available: disponibles
      },
      pricing: data.pricing || null,
      latest: data.latest || null,
      pending_job: data.pending_job || null,
      last_failed_job: data.last_failed_job || null,
      history,
      hasLatestImage: !!data.latest?.signed_url,
      hasLatestNdmiImage: !!np_getRadarSignedUrl(data, 'ndmi'),
      hasLatestNdreImage: !!np_getRadarSignedUrl(data, 'ndre'),
      hasLatestRgbImage: !!np_getRadarSignedUrl(data, 'rgb'),
      latestCreatedAt: data.latest?.created_at || null,
      meta: data.latest?.meta || null,
      dem: data.dem || null
    };
    np_storeRadarDemState(data.dem || null);
    np_updateRadarSnapshotSelectForIndex();
    const demIdx = np_getSelectedRadarIndex();
    if (demIdx === 'slope' || demIdx === 'elev') np_updateRadarScaleUi(demIdx);
    const costLine = np_formatRadarCreditLine(data.pricing || null);
    const pilotCost = Number(data.pricing?.credits_charged) || 1;
    let tone = 'ok';
    if (disponibles <= 0) tone = 'low';
    else if (disponibles < pilotCost) tone = 'low';
    else if (disponibles <= 3) tone = 'warn';
    const creditValue =
      bonusSafe > 0
        ? np_radarT('radar.credits_available_bonus', '{n} disponibles (bonus {bonus})', {
            n: disponibles,
            bonus: bonusSafe
          })
        : np_radarT('radar.credits_available', '{n} disponibles', { n: disponibles });
    np_setRadarCreditsBadge({
      value: creditValue,
      cost:
        (costLine || 'Costo según hectáreas') +
        ' · usados ' +
        u +
        ' · base ' +
        baseSafe +
        (history.length
          ? ' · ' + history.length + ' imagen' + (history.length === 1 ? '' : 'es')
          : ''),
      tone
    });
    if (data.pending_job) {
      np_syncPilotPendingFromStatus(window.__nutriplantRadarNdviStatus);
    } else if (data.last_failed_job && window.__nutriplantPilotPending) {
      np_setPilotPendingUi(false);
      np_stopPilotPendingPoll();
      const failed = data.last_failed_job;
      const lowCoverage = failed.error_code === 'radar_low_coverage';
      np_setRadarStatusHint(
        lowCoverage
          ? 'Probamos las pasadas Sentinel de <span class="radar-hint-em">14–45 días</span> y ninguna quedó lo bastante despejada sobre este predio (sin relleno entre fechas). Prueba tras la próxima pasada (~5 días). Código: <span class="radar-hint-em">5022</span>'
          : 'No se pudo generar la imagen satelital. ' +
              np_escapeHtml(np_pilotFriendlyErrorMessage(failed.error_message)) +
              ' Revisa Estado e intenta de nuevo.',
        { html: true, variant: 'warn' }
      );
    } else if (history.length) {
      np_updateRadarStatusHintFromSelection();
      if (window.__nutriplantPilotPending) {
        np_setPilotPendingUi(false);
        np_stopPilotPendingPoll();
      }
      if (data.latest) np_updateRadarSceneMeta(data.latest);
    } else if (hint) {
      const lastPilotError = window.__nutriplantLastPilotError || null;
      const failed = data.last_failed_job;
      if (failed && failed.error_code === 'radar_low_coverage') {
        np_setRadarStatusHint(
          'Probamos las pasadas Sentinel de <span class="radar-hint-em">14–45 días</span> y ninguna quedó lo bastante despejada sobre este predio (sin relleno entre fechas). Prueba tras la próxima pasada (~5 días). Código: <span class="radar-hint-em">5022</span>',
          { html: true, variant: 'warn' }
        );
      } else if (lastPilotError && lastPilotError.code === 5041) {
        np_setRadarStatusHint(
          'El último intento tardó demasiado y no se guardó imagen. Intenta de nuevo en <span class="radar-hint-em">unos minutos</span>. Código: <span class="radar-hint-em">5041</span>',
          { html: true, variant: 'warn' }
        );
      } else {
        np_setRadarStatusHint(
          costLine
            ? costLine + '. ' + np_radarT('radar.status_hint_first', 'Sincroniza el predio a la nube, luego genera la primera imagen satelital.')
            : np_radarT('radar.status_hint_first', 'Sincroniza el predio a la nube, luego genera la primera imagen satelital.'),
          { variant: 'info' }
        );
      }
    }
    if (typeof window.updateLecturaCreditsHint === 'function') {
      try {
        window.updateLecturaCreditsHint();
      } catch (eLecturaCred) {}
    }
  } catch (e) {
    np_setRadarCreditsBadge({
      value: np_radarT('radar.credits_offline', 'Sin conexión'),
      cost: np_radarT('radar.credits_offline_cost', 'No se pudo leer el saldo Radar'),
      tone: 'warn'
    });
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

    if (idx === 'slope' || idx === 'elev') {
      const demUrl = np_getDemSignedUrl(window.__nutriplantRadarDem, idx);
      if (demUrl && nutriPlantMap && np_getPolygonBoundsFromMap()) {
        window.showRadarDemOnMap(idx).catch((err) => {
          console.warn('Radar: capa relieve', err);
        });
        return;
      }
      const hint = document.getElementById('radarStatusHint');
      if (hint) {
        hint.textContent = window.__nutriplantRadarDem && window.__nutriplantRadarDem.dem_stale
          ? np_radarT(
              'radar.dem_stale_hint',
              'El polígono cambió. Pulsa «Generar relieve» para actualizar.'
            )
          : np_radarT(
              'radar.dem_missing_hint',
              'Aún no hay relieve. Pulsa «Generar relieve» (0 créditos).'
            );
      }
      return;
    }

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
            'No se pudo cargar ' + cfg.label + '. Pulsa «Ver imagen» o «Estado».';
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
    const hasLayer =
      idx === 'ndmi'
        ? st?.hasLatestNdmiImage
        : idx === 'ndre'
          ? st?.hasLatestNdreImage
          : idx === 'rgb'
            ? st?.hasLatestRgbImage
            : st?.hasLatestImage;
    if (st?.ok && hasLayer) {
      np_updateRadarStatusHintFromSelection();
    } else if (window.__nutriplantRadarPilot && window.__nutriplantRadarPilot.active) {
      hint.textContent = 'Capa satelital: ' + cfg.label + '. Pulsa «Ver imagen» o «Generar / actualizar imagen satelital».';
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
  document.getElementById('radarBtnGenerateDem')?.addEventListener('click', () => {
    window.generateRadarDemSlope();
  });
  document.getElementById('radarBtnHide')?.addEventListener('click', () => {
    window.hideRadarNdviOverlay();
  });
  document.getElementById('radarBtnDeleteSnapshot')?.addEventListener('click', () => {
    window.deleteRadarNdviSnapshot().catch((err) => console.warn('Radar delete:', err));
  });
  document.getElementById('radarBtnPilotCdse')?.addEventListener('click', () => {
    window.generateRadarCdsePilot();
  });
  document.getElementById('radarBtnPilotLayer')?.addEventListener('click', () => {
    np_togglePilotRadarLayer().catch((err) => console.warn('Pilot capa:', err));
  });
  np_setPilotRadarIndex(np_getPilotRadarIndex());
  np_updateRadarSnapshotSelectForIndex();
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
  if (window.__nutriplantPilotPending) {
    alert(
      'Ya hay una imagen satelital generándose para este predio.\n\nRevisa «Estado» en unos minutos; se guardará en la nube aunque cierres NutriPlant.\n\nCódigo: 4091'
    );
    return;
  }
  const polygon = np_polygonCoordsForPilot();
  if (!polygon) {
    alert('Traza y guarda un polígono del predio antes de generar la imagen satelital.');
    return;
  }
  const bounds = np_getPolygonBoundsFromMap();
  if (!bounds) {
    alert('El polígono del mapa no es válido.');
    return;
  }
  const areaLimit = np_getRadarAreaLimitFromStatus();
  if (areaLimit) {
    alert(areaLimit.message);
    const hintBlock = document.getElementById('radarStatusHint');
    if (hintBlock) hintBlock.textContent = areaLimit.message;
    return;
  }
  // Fallback: área local del mapa si aún no llegó pricing del status
  const localHa =
    nutriPlantMap && nutriPlantMap.area != null && Number.isFinite(Number(nutriPlantMap.area))
      ? Number(nutriPlantMap.area) / 10000
      : proj.location && proj.location.areaHectares != null
        ? Number(proj.location.areaHectares)
        : null;
  if (localHa != null && Number.isFinite(localHa) && localHa > 250) {
    const msg =
      'Radar máximo 250 ha; divide el polígono. Este predio tiene ' +
      (Math.round(localHa * 100) / 100) +
      ' ha.';
    alert(msg);
    const hintBlock = document.getElementById('radarStatusHint');
    if (hintBlock) hintBlock.textContent = msg;
    return;
  }
  const hint = document.getElementById('radarStatusHint');
  let prevRadarCreatedAt = null;
  try {
    try {
      await window.refreshRadarNdviStatus();
      prevRadarCreatedAt = np_getRadarLatestCreatedAtFromStatus(window.__nutriplantRadarNdviStatus);
      if (window.__nutriplantRadarNdviStatus?.pending_job) {
        alert(
          'Ya hay una imagen satelital generándose para este predio.\n\nRevisa «Estado» en unos minutos.\n\nCódigo: 4091'
        );
        np_syncPilotPendingFromStatus(window.__nutriplantRadarNdviStatus);
        return;
      }
    } catch (e) {
      console.warn('Pilot: no se pudo leer estado previo:', e);
    }

    np_setPilotPendingUi(true, 'sending');

    const res = await fetch(np_radarPilotApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ polygon, project_id: String(proj.id), async: true, max_dim: 512, max_scenes: 8 })
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 202 || (res.ok && data.async)) {
      window.__nutriplantPilotPendingJob = data.request || null;
      window.__nutriplantLastPilotError = null;
      np_setPilotPendingUi(true, 'pending');
      np_startPilotPendingPoll(prevRadarCreatedAt);
      await window.refreshRadarNdviStatus();
      return;
    }

    if (!res.ok) {
      np_setPilotPendingUi(false);
      const serverMessage = data.message || data.error || 'Pilot falló';
      if (res.status === 409) {
        window.__nutriplantPilotPendingJob = data.pending_job || data.request || null;
        np_setPilotPendingUi(true, 'duplicate');
        np_startPilotPendingPoll(prevRadarCreatedAt);
        await window.refreshRadarNdviStatus();
        alert(np_pilotUserErrorMessage(res.status, data));
        return;
      }
      if (res.status === 504 || res.status === 502) {
        const recovered = await np_recoverRadarIfBackendSucceeded(prevRadarCreatedAt, bounds);
        if (recovered) return;
      }
      window.__nutriplantLastPilotError = {
        code: res.status === 504 ? 5041 : res.status === 502 ? 5021 : res.status,
        status: res.status,
        at: new Date().toISOString()
      };
      console.error('Radar Pilot falló:', {
        status: res.status,
        statusText: res.statusText,
        response: data,
        projectId: proj.id,
        polygonPoints: polygon.length
      });
      alert(np_pilotUserErrorMessage(res.status, data));
      if (hint) hint.textContent = 'Pilot: error ' + res.status + ' — ' + serverMessage;
      return;
    }

    np_setPilotPendingUi(false);
    window.__nutriplantRadarPilot = {
      active: true,
      signed_url: data.signed_url || data.images?.ndvi?.signed_url,
      ndmi_signed_url: data.ndmi_signed_url || data.images?.ndmi?.signed_url,
      ndre_signed_url: data.ndre_signed_url || data.images?.ndre?.signed_url,
      rgb_signed_url: data.rgb_signed_url || data.images?.rgb?.signed_url,
      cloud_mask_signed_url: data.cloud_mask_signed_url || data.images?.clouds?.signed_url,
      cloud_mask_data_url: data.cloud_mask_data_url || data.images?.clouds?.data_url,
      ndvi_data_url: data.ndvi_data_url || data.images?.ndvi?.data_url,
      ndmi_data_url: data.ndmi_data_url || data.images?.ndmi?.data_url,
      ndre_data_url: data.ndre_data_url || data.images?.ndre?.data_url,
      rgb_data_url: data.rgb_data_url || data.images?.rgb?.data_url,
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
    np_updateRadarSceneMeta({ meta: data.meta || {}, created_at: data.request?.created_at || null });
  } catch (e) {
    console.error('Radar CDSE pilot:', e);
    const recovered = await np_recoverRadarIfBackendSucceeded(prevRadarCreatedAt, bounds);
    if (recovered) return;
    window.__nutriplantLastPilotError = {
      code: 9001,
      status: 0,
      at: new Date().toISOString()
    };
    alert('No se pudo conectar con Pilot. Revisa tu conexión e intenta de nuevo en unos minutos.\n\nCódigo: 9001');
    if (hint) hint.textContent = 'Pilot: sin conexión al servidor.';
    np_setPilotPendingUi(false);
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
  np_updateRadarSceneMeta(null);
  if (typeof window.np_markRadarOverlaySession === 'function') {
    window.np_markRadarOverlaySession(false);
  }
};

/** Borra de la nube la imagen Pilot seleccionada en el selector «Imagen». */
window.deleteRadarNdviSnapshot = async function deleteRadarNdviSnapshot() {
  const requestId = np_getSelectedRadarRequestId();
  if (!requestId) {
    alert(np_radarT('radar.delete_image_none', 'Selecciona una imagen satelital para borrar.'));
    return;
  }
  const ok = window.confirm(
    np_radarT(
      'radar.delete_image_confirm',
      '¿Borrar esta imagen satelital de la nube?\n\nSe eliminará el archivo (NDVI/NDMI/NDRE/RGB) y ya no aparecerá en el selector. Esta acción no se puede deshacer.'
    )
  );
  if (!ok) return;

  const token = await np_getRadarAccessToken();
  if (!token) {
    alert(np_radarT('radar.credits_login', 'Inicia sesión para ver créditos Radar'));
    return;
  }
  const proj =
    nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function'
      ? nutriPlantMap.getCurrentProject()
      : null;
  if (!proj || !proj.id) {
    alert('Elige o guarda un proyecto.');
    return;
  }

  const btn = document.getElementById('radarBtnDeleteSnapshot');
  const hint = document.getElementById('radarStatusHint');
  const prevBtn = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }
  if (hint) hint.textContent = 'Borrando imagen de la nube…';

  try {
    const res = await fetch(np_radarApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        action: 'delete',
        project_id: String(proj.id),
        request_id: String(requestId)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || data.error || np_radarT('radar.delete_image_fail', 'No se pudo borrar la imagen.'));
    }

    if (typeof window.hideRadarNdviOverlay === 'function') window.hideRadarNdviOverlay();
    np_persistRadarSnapshotSelection('');
    await window.refreshRadarNdviStatus();
    if (hint) {
      hint.textContent = np_radarT('radar.delete_image_ok', 'Imagen borrada de la nube.');
    }
  } catch (err) {
    console.warn('deleteRadarNdviSnapshot:', err);
    alert(
      np_radarT('radar.delete_image_fail', 'No se pudo borrar la imagen.') +
        (err && err.message ? '\n\n' + err.message : '')
    );
    if (hint) hint.textContent = np_radarT('radar.delete_image_fail', 'No se pudo borrar la imagen.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevBtn || np_radarT('radar.btn_delete_image', '🗑 Borrar');
    }
  }
};

window.showRadarNdviOnMap = async function showRadarNdviOnMap(opts) {
  const options = opts && typeof opts === 'object' ? opts : {};
  const silent = !!options.silent;
  if (!nutriPlantMap || !nutriPlantMap.map) {
    if (!silent) alert('El mapa no está listo.');
    return;
  }
  const selected = np_getSelectedRadarIndex();
  if (selected === 'slope' || selected === 'elev') {
    await window.showRadarDemOnMap(selected, options);
    return;
  }
  const bounds = np_getPolygonBoundsFromMap();
  const token = await np_getRadarAccessToken();
  if (!token) {
    if (!silent) alert('No hay sesión. Vuelve a iniciar sesión.');
    return;
  }
  const proj = nutriPlantMap.getCurrentProject();
  if (!proj || !proj.id) {
    if (!silent) alert('Selecciona un proyecto.');
    return;
  }
  const requestId = np_getSelectedRadarRequestId();
  if (!requestId) {
    if (!silent) alert('No hay imágenes Radar guardadas. Genera una tras sincronizar el predio.');
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
      if (!silent) alert(data.message || data.error || 'No se pudo cargar la imagen Radar seleccionada.');
      return;
    }
    const selectedIndex = np_getSelectedRadarIndex();
    const snap = data.snapshot || null;
    const overlayCtx = np_getRadarOverlayContext(snap);
    if (!overlayCtx.bounds && !bounds) {
      if (!silent) {
        alert('Carga un polígono del predio en el mapa o elige una imagen con coordenadas guardadas.');
      }
      return;
    }
    const url = np_getRadarSignedUrl({ snapshot: snap }, selectedIndex);
    if (!url) {
      if (!silent) {
        alert(
          'Esta imagen no incluye ' +
            np_getRadarIndexConfig(selectedIndex).label +
            '. Prueba otra capa o elige otra fecha en el listado.'
        );
      }
      return;
    }
    await np_applyRadarOverlay(url, snap, selectedIndex, options);
    if (typeof window.np_markRadarOverlaySession === 'function') {
      window.np_markRadarOverlaySession(true);
    }
  } catch (e) {
    console.error('Radar NDVI view:', e);
    if (!silent) alert('No se pudo cargar la imagen Radar. Intenta pulsar Estado y luego Ver imagen.');
  }
};

window.showRadarDemOnMap = async function showRadarDemOnMap(indexOverride, opts) {
  const options = opts && typeof opts === 'object' ? opts : {};
  const silent = !!options.silent;
  const skipFit = !!options.skipFit;
  if (!nutriPlantMap || !nutriPlantMap.map) {
    if (!silent) alert('El mapa no está listo.');
    return;
  }
  const bounds = np_getPolygonBoundsFromMap();
  if (!bounds) {
    if (!silent) alert('Carga un polígono del predio en el mapa.');
    return;
  }
  let idx = np_normalizeRadarIndex(indexOverride != null ? indexOverride : np_getSelectedRadarIndex());
  if (idx !== 'slope' && idx !== 'elev') idx = 'slope';
  let url = np_getDemSignedUrl(window.__nutriplantRadarDem, idx);
  if (!url) {
    const token = await np_getRadarAccessToken();
    const proj = nutriPlantMap.getCurrentProject && nutriPlantMap.getCurrentProject();
    if (token && proj && proj.id) {
      try {
        const res = await fetch(np_radarApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ action: 'dem_status', project_id: String(proj.id) })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.dem) {
          np_storeRadarDemState(data.dem);
          url = np_getDemSignedUrl(data.dem, idx);
          if (!url && idx === 'elev' && data.dem.dem_signed_url) {
            // Relieve viejo sin capa de altura: ofrecer pendiente
            idx = 'slope';
            url = np_getDemSignedUrl(data.dem, 'slope');
          }
        }
      } catch (e) {
        console.warn('dem_status:', e);
      }
    }
  }
  if (!url) {
    if (!silent) {
      alert(
        np_radarT(
          'radar.dem_missing_alert',
          'Aún no hay relieve generado. Pulsa «Generar relieve» (no usa créditos Radar).'
        )
      );
    }
    return;
  }
  np_setSelectedRadarIndex(idx);
  const hint = document.getElementById('radarStatusHint');
  const cfg = np_getRadarIndexConfig(idx);
  if (hint) hint.textContent = cfg.loadingText;
  await np_preloadRadarImage(url);
  if (radarGroundOverlay) {
    radarGroundOverlay.setMap(null);
    radarGroundOverlay = null;
  }
  np_setRadarPolygonMask(false);
  np_showRadarOverlay(url, bounds, 1, { pilot: false, index: idx });
  np_setRadarPolygonMask(true, null);
  np_showRadarLegend(true);
  window.__nutriplantRadarOverlaySource = 'dem';
  if (!skipFit && nutriPlantMap.map && bounds) {
    nutriPlantMap.map.fitBounds(bounds, { padding: 50 });
  }
  if (typeof window.np_markRadarOverlaySession === 'function') {
    window.np_markRadarOverlaySession(true);
  }
  const dem = window.__nutriplantRadarDem;
  const meta = dem && dem.dem_meta ? dem.dem_meta : null;
  let extra = '';
  if (idx === 'elev' && meta && meta.elev_mean != null) {
    extra =
      ' ' +
      np_radarT('radar.elev_stats_hint', 'Media ~{mean} (min {min} · max {max}).', {
        mean: np_formatElevM(Number(meta.elev_mean)),
        min: meta.elev_min != null ? np_formatElevM(Number(meta.elev_min)) : '—',
        max: meta.elev_max != null ? np_formatElevM(Number(meta.elev_max)) : '—'
      });
  } else if (meta && meta.slope_mean != null) {
    extra =
      ' ' +
      np_radarT('radar.dem_stats_hint', 'Media ~{mean}% (min {min} · max {max}).', {
        mean: meta.slope_mean,
        min: meta.slope_min != null ? meta.slope_min : '—',
        max: meta.slope_max != null ? meta.slope_max : '—'
      });
  }
  if (dem && dem.dem_stale) {
    extra +=
      ' ' +
      np_radarT('radar.dem_stale_short', 'Polígono cambió: regenera el relieve.');
  }
  if (hint) hint.textContent = cfg.shownText + extra;
  np_updateRadarScaleUi(idx);
};

window.generateRadarDemSlope = async function generateRadarDemSlope() {
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
    alert('Traza y guarda un polígono del predio antes de generar el relieve.');
    return;
  }
  const areaLimit = np_getRadarAreaLimitFromStatus();
  if (areaLimit) {
    alert(areaLimit.message);
    return;
  }
  const btn = document.getElementById('radarBtnGenerateDem');
  const hint = document.getElementById('radarStatusHint');
  const original = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.classList.add('radar-loading');
    btn.textContent = np_radarT('radar.btn_generating_dem', '⏳ Generando relieve…');
  }
  if (hint) {
    hint.textContent = np_radarT(
      'radar.dem_generating_hint',
      'Generando pendiente y altura del predio (Copernicus DEM, 0 créditos)…'
    );
  }
  const force = !!(
    window.__nutriplantRadarDem &&
    (window.__nutriplantRadarDem.dem_stale || !window.__nutriplantRadarDem.has_elev)
  );
  try {
    const res = await fetch(np_radarApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        action: 'generate_dem',
        project_id: String(proj.id),
        force: !!force
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || data.error || 'No se pudo generar el relieve.');
      if (hint) hint.textContent = data.message || data.error || 'Error al generar relieve.';
      return;
    }
    const demInfo = data.dem || {
      has_dem: !!data.dem_signed_url,
      has_elev: !!data.elev_signed_url,
      dem_signed_url: data.dem_signed_url || null,
      elev_signed_url: data.elev_signed_url || null,
      dem_stale: false,
      dem_meta: data.dem && data.dem.dem_meta ? data.dem.dem_meta : null
    };
    if (data.dem_signed_url && !demInfo.dem_signed_url) {
      demInfo.dem_signed_url = data.dem_signed_url;
      demInfo.has_dem = true;
    }
    if (data.elev_signed_url && !demInfo.elev_signed_url) {
      demInfo.elev_signed_url = data.elev_signed_url;
      demInfo.has_elev = true;
    }
    np_storeRadarDemState(demInfo);
    const prefer =
      np_getSelectedRadarIndex() === 'elev' || np_getSelectedRadarIndex() === 'slope'
        ? np_getSelectedRadarIndex()
        : 'elev';
    np_setSelectedRadarIndex(prefer);
    await window.showRadarDemOnMap(prefer);
    if (hint) {
      hint.textContent = data.cached
        ? np_radarT('radar.dem_cached_ok', 'Relieve ya guardado (sin regenerar). Capas pendiente y altura listas.')
        : np_radarT('radar.dem_generated_ok', 'Relieve generado (pendiente + altura). 0 créditos.');
    }
  } catch (e) {
    console.error('generateRadarDemSlope:', e);
    alert('No se pudo conectar para generar el relieve. Revisa tu conexión.');
    if (hint) hint.textContent = 'Relieve: sin conexión al servidor.';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('radar-loading');
      btn.textContent =
        original || np_radarT('radar.btn_generate_dem', '⛰ Generar relieve');
    }
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

  if (actionName === 'user') {
    np_markUserLocationCenterIntent();
    np_centerOnUserLocationDirect(event);
    return;
  }
  np_clearUserLocationCenterIntent();

  if (actionName === 'polygon') {
    np_centerOnCurrentProjectPolygonDirect(tries);
    return;
  }

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
}

function np_showLocationMapMessage(message, type = 'info') {
  if (nutriPlantMap && typeof nutriPlantMap.showMessage === 'function') {
    nutriPlantMap.showMessage(message, type);
  }
}

function np_getCurrentProjectForLocationButton() {
  if (typeof currentProject !== 'undefined' && currentProject && currentProject.id) return currentProject;
  if (nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function') return nutriPlantMap.getCurrentProject();
  return null;
}

function np_locationHasValidPolygonForProject(location, projectId) {
  return !!(
    location &&
    location.polygon &&
    Array.isArray(location.polygon) &&
    location.polygon.length >= 3 &&
    (!location.projectId || np_projectIdsMatch(location.projectId, projectId))
  );
}

function np_loadCurrentProjectLocationForButton(projectId) {
  if (!projectId) return null;
  const project = np_getCurrentProjectForLocationButton();
  if (project && np_locationHasValidPolygonForProject(project.location, projectId)) {
    return project.location;
  }

  if (window.projectStorage && typeof window.projectStorage.loadSection === 'function') {
    try {
      const storedLocation = window.projectStorage.loadSection('location', projectId);
      if (np_locationHasValidPolygonForProject(storedLocation, projectId)) return storedLocation;
    } catch (e) {
      console.warn('np_loadCurrentProjectLocationForButton loadSection:', e);
    }
  }

  try {
    const raw = localStorage.getItem(`nutriplant_project_${projectId}`) || localStorage.getItem(`nutriplant-project-${projectId}`);
    if (raw) {
      const storedProject = JSON.parse(raw);
      if (storedProject && np_locationHasValidPolygonForProject(storedProject.location, projectId)) {
        return storedProject.location;
      }
    }
  } catch (e) {
    console.warn('np_loadCurrentProjectLocationForButton localStorage:', e);
  }

  return null;
}

function np_centerOnCurrentProjectPolygonDirect(attempt = 0) {
  np_scrollLocationMapIntoView();
  const tries = Number(attempt) || 0;

  if (!nutriPlantMap || !np_isLocationMapReady() || !nutriPlantMap.map) {
    if (typeof initLocationMap === 'function') initLocationMap();
    if (tries < 20) {
      setTimeout(() => np_centerOnCurrentProjectPolygonDirect(tries + 1), 350);
    } else {
      np_showLocationMapMessage(
        np_radarT(
          'radar.msg_map_load_center_plot',
          '⚠️ No se pudo cargar el mapa para centrar el predio.'
        ),
        'warning'
      );
    }
    return;
  }

  const project = np_getCurrentProjectForLocationButton();
  const projectId = project && project.id;
  const location = np_loadCurrentProjectLocationForButton(projectId);

  if (!np_locationHasValidPolygonForProject(location, projectId)) {
    np_showLocationMapMessage(
      np_radarT(
        'radar.msg_no_saved_polygon_project',
        '⚠️ No hay polígono guardado para este proyecto.'
      ),
      'warning'
    );
    return;
  }

  if (!location.projectId) location.projectId = projectId;
  if (typeof currentProject !== 'undefined' && currentProject && np_projectIdsMatch(currentProject.id, projectId)) {
    currentProject.location = location;
  }

  try {
    if (typeof nutriPlantMap.bindLocationControlButtons === 'function') nutriPlantMap.bindLocationControlButtons();
    if (typeof nutriPlantMap.loadProjectLocation === 'function') nutriPlantMap.loadProjectLocation();

    const bounds = new google.maps.LatLngBounds();
    location.polygon.forEach((coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return;
      const lat = Number(coord[0]);
      const lng = Number(coord[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) bounds.extend({ lat, lng });
    });

    if (bounds.isEmpty && bounds.isEmpty()) {
      np_showLocationMapMessage(
        np_radarT(
          'radar.msg_saved_polygon_invalid_coords',
          '⚠️ El polígono guardado no tiene coordenadas válidas.'
        ),
        'warning'
      );
      return;
    }

    if (typeof nutriPlantMap.refreshMapView === 'function') nutriPlantMap.refreshMapView('polygon-direct-before');
    nutriPlantMap.map.fitBounds(bounds, { padding: 50 });
    setTimeout(() => {
      if (nutriPlantMap && nutriPlantMap.map) {
        if (typeof nutriPlantMap.refreshMapView === 'function') nutriPlantMap.refreshMapView('polygon-direct-after');
        nutriPlantMap.map.fitBounds(bounds, { padding: 50 });
      }
    }, 250);
    np_showLocationMapMessage(
      np_radarT('radar.msg_centered_polygon', '✅ Mapa centrado en el polígono'),
      'success'
    );
  } catch (e) {
    console.warn('np_centerOnCurrentProjectPolygonDirect:', e);
    np_showLocationMapMessage(
      np_radarT('radar.msg_center_polygon_failed', '⚠️ No se pudo centrar el mapa en el polígono.'),
      'warning'
    );
  }
}

function np_markUserLocationCenterIntent() {
  window.__npUserLocationCenterUntil = Date.now() + 12000;
}

function np_extendUserLocationCenterIntent() {
  window.__npUserLocationCenterUntil = Date.now() + 8000;
}

function np_clearUserLocationCenterIntent() {
  window.__npUserLocationCenterUntil = 0;
}

function np_shouldHoldUserLocationCenter() {
  return Number(window.__npUserLocationCenterUntil || 0) > Date.now();
}

function np_forceRecreateLocationMapForButton(reason) {
  const mapHost = document.getElementById('map');
  if (!mapHost || typeof initLocationMap !== 'function') return;
  console.warn('🧭 Recuperando mapa para botón de ubicación:', reason || 'unknown');
  try {
    if (nutriPlantMap) {
      if (typeof window.hideRadarNdviOverlay === 'function') window.hideRadarNdviOverlay();
      if (typeof nutriPlantMap.forceRemoveAllPolygons === 'function') nutriPlantMap.forceRemoveAllPolygons();
    }
  } catch (e) {
    console.warn('np_forceRecreateLocationMapForButton cleanup:', e);
  }
  try {
    nutriPlantMap = null;
    mapHost.innerHTML = '';
  } catch (e) {
    console.warn('np_forceRecreateLocationMapForButton reset:', e);
  }
  initLocationMap();
}

function np_centerMapOnUserCoords(userLocation, attempt = 0) {
  np_scrollLocationMapIntoView();
  np_extendUserLocationCenterIntent();
  const tries = Number(attempt) || 0;
  if (!nutriPlantMap || !np_isLocationMapReady() || !nutriPlantMap.map) {
    if (typeof initLocationMap === 'function') initLocationMap();
    if (tries === 3 || tries === 8) {
      np_forceRecreateLocationMapForButton('gps-center retry ' + tries);
    }
    if (tries < 20) {
      setTimeout(() => np_centerMapOnUserCoords(userLocation, tries + 1), 350);
    } else {
      np_showLocationMapMessage(
        np_radarT(
          'radar.msg_map_load_center_location',
          '⚠️ No se pudo cargar el mapa para centrar tu ubicación.'
        ),
        'warning'
      );
    }
    return;
  }

  try {
    if (typeof nutriPlantMap.refreshMapView === 'function') {
      nutriPlantMap.refreshMapView('gps-direct-before');
    }
    nutriPlantMap.map.setCenter(userLocation);
    nutriPlantMap.map.setZoom(15);
    if (typeof nutriPlantMap.addUserLocationMarker === 'function') {
      nutriPlantMap.addUserLocationMarker(userLocation);
    }
    if (typeof nutriPlantMap.refreshMapView === 'function') {
      setTimeout(() => nutriPlantMap.refreshMapView('gps-direct-after'), 200);
    }
    np_showLocationMapMessage(
      np_radarT('radar.msg_centered_location', '📍 Centrado en tu ubicación actual'),
      'success'
    );
  } catch (e) {
    console.warn('np_centerMapOnUserCoords:', e);
    np_showLocationMapMessage(
      np_radarT(
        'radar.msg_center_location_failed',
        '⚠️ No se pudo centrar el mapa en tu ubicación.'
      ),
      'warning'
    );
  }
}

function np_centerOnUserLocationDirect() {
  np_scrollLocationMapIntoView();
  if (!navigator.geolocation) {
    np_showLocationMapMessage(
      np_radarT(
        'radar.msg_geo_unavailable',
        '❌ La geolocalización no está disponible en este navegador'
      ),
      'error'
    );
    return;
  }

  // Pedir GPS inmediatamente en respuesta al click; luego se espera al mapa si hace falta.
  np_showLocationMapMessage(
    np_radarT('radar.msg_getting_location', '🔄 Obteniendo tu ubicación...'),
    'info'
  );
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      np_centerMapOnUserCoords(userLocation);
    },
    (error) => {
      let errorMessage = np_radarT('radar.msg_geo_error', '❌ Error al obtener tu ubicación');
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = np_radarT(
            'radar.msg_geo_denied',
            '❌ Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.'
          );
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = np_radarT(
            'radar.msg_geo_position_unavailable',
            '❌ Ubicación no disponible. Verifica que tu dispositivo tenga GPS activado.'
          );
          break;
        case error.TIMEOUT:
          errorMessage = np_radarT(
            'radar.msg_geo_timeout',
            '❌ Tiempo de espera agotado. Intenta de nuevo.'
          );
          break;
      }
      console.error('❌ Error obteniendo ubicación GPS:', error);
      np_showLocationMapMessage(errorMessage, 'error');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
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
      // Soltar overlay Radar sin borrar la sesión (se restaura al volver a la sección).
      if (radarGroundOverlay) {
        try { radarGroundOverlay.setMap(null); } catch (eOv) {}
        radarGroundOverlay = null;
      }
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