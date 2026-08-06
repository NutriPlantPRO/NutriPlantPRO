/**
 * AirCI — F0 gate + F1 GeoTIFF (visor Leaflet + subida Supabase Storage).
 */
(function () {
  'use strict';

  var META_KEY = 'airci_site_meta_v1';
  var FLIGHT_KEY = 'airci_flight_local_v1';
  var SITE_ID_KEY = 'airci_site_id_v1';
  var OWNER_EMAIL = 'admin@nutriplantpro.com';
  var SESSION_MAX_MS = 12 * 60 * 60 * 1000;
  var API = '/api/airci-ortho';
  var PREVIEW_WARN_BYTES = 80 * 1024 * 1024;

  var gateEl = document.getElementById('aciGate');
  var appEl = document.getElementById('aciApp');
  var errEl = document.getElementById('aciGateError');
  var pinForm = document.getElementById('aciPinForm');
  var pinInput = document.getElementById('aciPinInput');
  var saveHint = document.getElementById('aciSaveHint');
  var saveTimer = null;
  var cloudSyncTimer = null;

  var map = null;
  var rasterLayer = null;
  var basemapLayer = null;
  var lastBounds = null;

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.classList.toggle('is-visible', !!msg);
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSiteId() {
    try {
      var id = localStorage.getItem(SITE_ID_KEY);
      if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
      id = uuid();
      localStorage.setItem(SITE_ID_KEY, id);
      return id;
    } catch (e) {
      return uuid();
    }
  }

  function hasAdminSession() {
    try {
      if (localStorage.getItem('admin_logged_in') !== 'true') return false;
      var user = String(localStorage.getItem('admin_username') || '').trim().toLowerCase();
      if (user && user !== OWNER_EMAIL) return false;
      var ts = parseInt(localStorage.getItem('admin_session_timestamp') || '0', 10);
      if (ts && Date.now() - ts > SESSION_MAX_MS) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function formatBytes(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function setMapStatus(text, kind) {
    var el = document.getElementById('aciMapStatus');
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = '';
      el.classList.remove('is-error', 'is-ok');
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-ok', kind === 'ok');
  }

  function updateMetrics(info) {
    info = info || {};
    var fileEl = document.getElementById('aciMetricFile');
    var fileSub = document.getElementById('aciMetricFileSub');
    var sizeEl = document.getElementById('aciMetricSize');
    var dimsEl = document.getElementById('aciMetricDims');
    var bandsEl = document.getElementById('aciMetricBands');
    var cloudEl = document.getElementById('aciMetricCloud');
    var cloudSub = document.getElementById('aciMetricCloudSub');
    if (fileEl) fileEl.textContent = info.filename ? String(info.filename).slice(0, 28) : '—';
    if (fileSub) fileSub.textContent = info.crs ? 'CRS: ' + info.crs : info.filename ? 'GeoTIFF' : 'Sin TIFF';
    if (sizeEl) sizeEl.textContent = formatBytes(info.byte_size);
    if (dimsEl) {
      dimsEl.textContent =
        info.width_px && info.height_px ? info.width_px + ' × ' + info.height_px : '—';
    }
    if (bandsEl) bandsEl.textContent = info.bands != null ? info.bands + ' bandas' : 'bandas';
    if (cloudEl) cloudEl.textContent = info.cloud || '—';
    if (cloudSub) cloudSub.textContent = info.cloud_sub || 'Storage';
  }

  function showApp() {
    if (gateEl) gateEl.hidden = true;
    if (appEl) appEl.hidden = false;
    loadMeta();
    initMapOnce();
    restoreFlightHint();
  }

  function showGate(message) {
    if (gateEl) gateEl.hidden = false;
    if (appEl) appEl.hidden = true;
    if (message) showError(message);
    if (pinInput) {
      pinInput.value = '';
      setTimeout(function () {
        pinInput.focus();
      }, 60);
    }
  }

  function defaultMeta() {
    return {
      title: '',
      agricola: '',
      predio: '',
      cultivo: '',
      variedad: '',
      edad: '',
      nota: ''
    };
  }

  function loadMeta() {
    var data = defaultMeta();
    try {
      var raw = localStorage.getItem(META_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.keys(data).forEach(function (k) {
            if (parsed[k] != null) data[k] = String(parsed[k]);
          });
        }
      }
    } catch (e) {}
    document.querySelectorAll('[data-meta]').forEach(function (el) {
      var key = el.getAttribute('data-meta');
      if (!key) return;
      el.value = data[key] || '';
    });
  }

  function collectMeta() {
    var data = defaultMeta();
    document.querySelectorAll('[data-meta]').forEach(function (el) {
      var key = el.getAttribute('data-meta');
      if (!key) return;
      data[key] = String(el.value || '').trim();
    });
    return data;
  }

  function persistMetaLocal() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(collectMeta()));
      if (saveHint) {
        saveHint.textContent = 'Guardado en este dispositivo';
        saveHint.classList.add('is-ok');
      }
    } catch (e) {
      if (saveHint) {
        saveHint.textContent = 'No se pudo guardar local';
        saveHint.classList.remove('is-ok');
      }
    }
  }

  function scheduleSave() {
    if (saveHint) {
      saveHint.textContent = 'Guardando…';
      saveHint.classList.remove('is-ok');
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      persistMetaLocal();
      scheduleCloudMeta();
    }, 350);
  }

  function scheduleCloudMeta() {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(function () {
      upsertSiteCloud().catch(function () {});
    }, 900);
  }

  async function getAccessToken() {
    try {
      var client =
        typeof window.getSupabaseClient === 'function' ? window.getSupabaseClient() : null;
      if (!client) return null;
      var res = await client.auth.getSession();
      return (res && res.data && res.data.session && res.data.session.access_token) || null;
    } catch (e) {
      return null;
    }
  }

  async function apiOrtho(body) {
    var token = await getAccessToken();
    if (!token) {
      return { ok: false, error: 'Sin sesión Supabase. Entra de nuevo desde login.html con tu admin.' };
    }
    var res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(body)
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: (data && data.error) || 'Error API ' + res.status,
        setup: data && data.setup
      };
    }
    return data;
  }

  async function upsertSiteCloud() {
    var meta = collectMeta();
    var r = await apiOrtho(
      Object.assign({ action: 'upsert_site', site_id: getSiteId() }, meta)
    );
    if (r.ok && saveHint) {
      saveHint.textContent = 'Guardado local + nube';
      saveHint.classList.add('is-ok');
    } else if (r.setup && saveHint) {
      saveHint.textContent = 'Local OK · ejecuta ' + r.setup + ' en Supabase para nube';
      saveHint.classList.remove('is-ok');
    }
    return r;
  }

  function initMapOnce() {
    if (map || typeof L === 'undefined') return;
    var mapEl = document.getElementById('aciMap');
    if (!mapEl) return;
    map = L.map(mapEl, { zoomControl: true, attributionControl: true });
    basemapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 22,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    map.setView([23.6, -102.5], 5);
  }

  function showMapPane(show) {
    var ph = document.getElementById('aciMapPlaceholder');
    var mapEl = document.getElementById('aciMap');
    var fitBtn = document.getElementById('aciFitBounds');
    if (ph) ph.hidden = !!show;
    if (mapEl) mapEl.hidden = !show;
    if (fitBtn) fitBtn.hidden = !show;
    if (show && map) {
      setTimeout(function () {
        map.invalidateSize();
        if (lastBounds) map.fitBounds(lastBounds, { padding: [20, 20] });
      }, 80);
    }
  }

  function clamp255(v) {
    if (v == null || Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function colorFnForGeoraster(georaster) {
    var maxes = georaster.maxs || [];
    var scale = function (v, i) {
      var mx = maxes[i] != null ? maxes[i] : 255;
      if (mx > 255) return clamp255((Number(v) / mx) * 255);
      return clamp255(v);
    };
    return function (values) {
      if (!values || values[0] == null || Number.isNaN(values[0])) return null;
      // nodata common
      if (values[0] === 0 && values.length >= 3 && values[1] === 0 && values[2] === 0) {
        // keep black pixels as black (soil) — don't treat as transparent
      }
      if (values.length >= 3) {
        return 'rgb(' + scale(values[0], 0) + ',' + scale(values[1], 1) + ',' + scale(values[2], 2) + ')';
      }
      var g = scale(values[0], 0);
      return 'rgb(' + g + ',' + g + ',' + g + ')';
    };
  }

  async function renderGeotiffFromArrayBuffer(arrayBuffer, meta) {
    if (typeof parseGeoraster !== 'function' || typeof GeoRasterLayer === 'undefined') {
      throw new Error('Faltan librerías georaster en el navegador.');
    }
    initMapOnce();
    setMapStatus('Leyendo GeoTIFF…');
    var georaster = await parseGeoraster(arrayBuffer);
    if (rasterLayer && map) {
      try {
        map.removeLayer(rasterLayer);
      } catch (e) {}
      rasterLayer = null;
    }
    rasterLayer = new GeoRasterLayer({
      georaster: georaster,
      opacity: 1,
      resolution: 256,
      pixelValuesToColorFn: colorFnForGeoraster(georaster)
    });
    rasterLayer.addTo(map);
    lastBounds = rasterLayer.getBounds();
    showMapPane(true);
    map.fitBounds(lastBounds, { padding: [24, 24] });

    var info = {
      filename: meta.filename,
      byte_size: meta.byte_size,
      width_px: georaster.width,
      height_px: georaster.height,
      bands: georaster.numberOfRasters || (georaster.rasters && georaster.rasters.length) || null,
      crs: georaster.projection != null ? String(georaster.projection) : null,
      cloud: meta.cloud || 'Vista local',
      cloud_sub: meta.cloud_sub || 'pendiente de nube'
    };
    try {
      if (lastBounds && lastBounds.isValid && lastBounds.isValid()) {
        info.bbox_json = [
          lastBounds.getWest(),
          lastBounds.getSouth(),
          lastBounds.getEast(),
          lastBounds.getNorth()
        ];
      }
    } catch (e) {}

    updateMetrics(info);
    setMapStatus(
      info.filename +
        ' · ' +
        info.width_px +
        '×' +
        info.height_px +
        (info.bands ? ' · ' + info.bands + ' bandas' : ''),
      'ok'
    );
    document.getElementById('aciMapSub').textContent =
      'Ortomosaico cargado' + (info.crs ? ' · proyección ' + info.crs : '');

    return info;
  }

  function saveFlightLocal(info, path, flightId) {
    try {
      localStorage.setItem(
        FLIGHT_KEY,
        JSON.stringify({
          site_id: getSiteId(),
          flight_id: flightId || null,
          path: path || null,
          filename: info.filename,
          byte_size: info.byte_size,
          width_px: info.width_px,
          height_px: info.height_px,
          bands: info.bands,
          crs: info.crs,
          bbox_json: info.bbox_json || null,
          updated_at: Date.now()
        })
      );
    } catch (e) {}
  }

  function restoreFlightHint() {
    try {
      var raw = localStorage.getItem(FLIGHT_KEY);
      if (!raw) return;
      var f = JSON.parse(raw);
      if (!f || !f.filename) return;
      updateMetrics({
        filename: f.filename,
        byte_size: f.byte_size,
        width_px: f.width_px,
        height_px: f.height_px,
        bands: f.bands,
        crs: f.crs,
        cloud: f.path ? 'En nube' : 'Solo local',
        cloud_sub: f.path ? f.path.split('/').pop() : 'vuelve a subir para ver'
      });
      document.getElementById('aciMapSub').textContent =
        'Último TIFF: ' + f.filename + (f.path ? ' (en Storage)' : ' — vuelve a elegir el archivo para verlo)');
    } catch (e) {}
  }

  async function uploadToCloud(file, info) {
    var meta = collectMeta();
    var siteId = getSiteId();
    var flightId = uuid();

    setMapStatus('Preparando subida a Supabase…');
    updateMetrics(
      Object.assign({}, info, { cloud: 'Subiendo…', cloud_sub: 'prepare' })
    );

    var prep = await apiOrtho({
      action: 'prepare',
      site_id: siteId,
      flight_id: flightId,
      filename: file.name,
      byte_size: file.size,
      title: meta.title,
      agricola: meta.agricola,
      predio: meta.predio,
      cultivo: meta.cultivo,
      variedad: meta.variedad,
      edad: meta.edad,
      nota: meta.nota
    });

    if (!prep.ok) {
      var msg = prep.error || 'No se pudo preparar la subida';
      if (prep.setup) msg += ' · Ejecuta ' + prep.setup + ' en Supabase SQL Editor';
      setMapStatus(msg, 'error');
      updateMetrics(Object.assign({}, info, { cloud: 'Sin nube', cloud_sub: 'SQL / sesión' }));
      saveFlightLocal(info, null, null);
      return { ok: false, error: msg };
    }

    setMapStatus('Subiendo ' + formatBytes(file.size) + ' a Storage…');
    var put = await fetch(prep.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/tiff',
        'x-upsert': 'true'
      },
      body: file
    });
    if (!put.ok) {
      var t = await put.text().catch(function () {
        return '';
      });
      var errUp = 'Fallo al subir (' + put.status + ')' + (t ? ': ' + t.slice(0, 120) : '');
      setMapStatus(errUp, 'error');
      updateMetrics(Object.assign({}, info, { cloud: 'Error', cloud_sub: 'upload' }));
      return { ok: false, error: errUp };
    }

    setMapStatus('Registrando vuelo…');
    var fin = await apiOrtho({
      action: 'finalize',
      site_id: prep.site_id,
      flight_id: prep.flight_id,
      path: prep.path,
      filename: file.name,
      content_type: file.type || 'image/tiff',
      byte_size: file.size,
      width_px: info.width_px,
      height_px: info.height_px,
      bands: info.bands,
      crs: info.crs,
      bbox_json: info.bbox_json || null
    });

    if (!fin.ok) {
      setMapStatus(fin.error || 'Subido al Storage pero falló el registro', 'error');
      saveFlightLocal(info, prep.path, prep.flight_id);
      updateMetrics(Object.assign({}, info, { cloud: 'Archivo OK', cloud_sub: 'falta fila SQL?' }));
      return { ok: false, error: fin.error };
    }

    try {
      localStorage.setItem(SITE_ID_KEY, prep.site_id);
    } catch (e) {}
    saveFlightLocal(info, prep.path, prep.flight_id);
    updateMetrics(Object.assign({}, info, { cloud: 'En nube', cloud_sub: 'airci-orthos' }));
    setMapStatus('GeoTIFF en el mapa y guardado en Supabase Storage', 'ok');
    return { ok: true, path: prep.path, flight_id: prep.flight_id };
  }

  async function handleTiffFile(file) {
    if (!file) return;
    var name = String(file.name || '').toLowerCase();
    if (!/\.tiff?$/.test(name) && file.type && file.type.indexOf('tif') === -1) {
      setMapStatus('Elige un archivo .tif o .tiff', 'error');
      return;
    }

    if (file.size > PREVIEW_WARN_BYTES) {
      setMapStatus(
        'Archivo grande (' +
          formatBytes(file.size) +
          '). El visor puede tardar o fallar por memoria; la nube sí lo acepta.',
        'error'
      );
    }

    try {
      var buf = await file.arrayBuffer();
      var info = await renderGeotiffFromArrayBuffer(buf, {
        filename: file.name,
        byte_size: file.size,
        cloud: 'Vista local',
        cloud_sub: 'subiendo…'
      });
      await uploadToCloud(file, info);
    } catch (e) {
      console.error(e);
      setMapStatus(
        'No se pudo leer el GeoTIFF: ' + (e && e.message ? e.message : String(e)),
        'error'
      );
    }
  }

  async function verifyAirciPin(pinApi, pin) {
    var primary = pinApi.SCOPE_AIRCI || 'airci';
    var r = await pinApi.verifyPin(primary, pin);
    if (r && r.ok) return { ok: true, scope: primary };

    // Solo si el servidor aún no conoce scope airci (deploy pendiente), prueba admin / plan_pro
    var err = String((r && r.error) || '');
    var needFallback =
      /scope|inválid|invalido|not_configured|no configurado|503|400/i.test(err) ||
      !(await pinApi.isRequired(primary));

    if (!needFallback) return r || { ok: false, error: 'PIN incorrecto.' };

    var alts = [pinApi.SCOPE_ADMIN || 'admin', pinApi.SCOPE_PLAN_PRO || 'plan_pro'];
    for (var i = 0; i < alts.length; i++) {
      var scope = alts[i];
      var rr = await pinApi.verifyPin(scope, pin);
      if (rr && rr.ok) return { ok: true, scope: scope };
      r = rr || r;
    }
    return r || { ok: false, error: 'PIN incorrecto.' };
  }

  async function ensureAccess() {
    if (!hasAdminSession()) {
      showGate('Entra primero desde el login como admin y elige AirCI.');
      if (pinForm) pinForm.style.display = 'none';
      return;
    }

    var pinApi = window.nutriplantAccessPin;
    if (!pinApi) {
      showApp();
      return;
    }

    var scope = pinApi.SCOPE_AIRCI || 'airci';
    var lock = pinApi.getClientLockout(scope);
    if (lock.locked) {
      showGate(
        'PIN bloqueado en este dispositivo. Espera ' +
          Math.ceil(lock.remainingMs / 60000) +
          ' min.'
      );
      return;
    }

    // Si ya tienes PIN válido de AirCI, admin o Plan PRO en esta sesión, entra
    var requiredAirci = await pinApi.isRequired(scope);
    var requiredAdmin = await pinApi.isRequired(pinApi.SCOPE_ADMIN || 'admin');
    var requiredPlan = await pinApi.isRequired(pinApi.SCOPE_PLAN_PRO || 'plan_pro');
    if (!requiredAirci && !requiredAdmin && !requiredPlan) {
      showApp();
      return;
    }

    if (
      (await pinApi.hasValidAccess(scope)) ||
      (await pinApi.hasValidAccess(pinApi.SCOPE_ADMIN || 'admin')) ||
      (await pinApi.hasValidAccess(pinApi.SCOPE_PLAN_PRO || 'plan_pro'))
    ) {
      showApp();
      return;
    }

    showGate('');
  }

  if (pinInput) {
    pinInput.addEventListener('input', function () {
      this.value = String(this.value || '').replace(/\D/g, '').slice(0, 4);
    });
  }

  if (pinForm) {
    pinForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var pinApi = window.nutriplantAccessPin;
      var pin = (pinInput && pinInput.value) || '';
      var btn = document.getElementById('aciPinSubmit');
      if (!hasAdminSession()) {
        showError('Sesión admin no válida. Vuelve al login y elige AirCI.');
        return;
      }
      if (!pinApi) {
        showApp();
        return;
      }
      if (btn) btn.disabled = true;
      showError('');
      var r = await verifyAirciPin(pinApi, pin);
      if (btn) btn.disabled = false;
      if (!r.ok) {
        showError(r.error || 'PIN incorrecto.');
        return;
      }
      showApp();
    });
  }

  document.querySelectorAll('[data-meta]').forEach(function (el) {
    el.addEventListener('input', scheduleSave);
    el.addEventListener('change', scheduleSave);
  });

  var tiffInput = document.getElementById('aciTiffInput');
  if (tiffInput) {
    tiffInput.addEventListener('change', function () {
      var f = tiffInput.files && tiffInput.files[0];
      handleTiffFile(f);
      tiffInput.value = '';
    });
  }

  var fitBtn = document.getElementById('aciFitBounds');
  if (fitBtn) {
    fitBtn.addEventListener('click', function () {
      if (map && lastBounds) map.fitBounds(lastBounds, { padding: [24, 24] });
    });
  }

  ensureAccess();
})();
