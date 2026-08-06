/**
 * AirCI — F0 gate + F1 GeoTIFF (visor Leaflet + subida Supabase Storage).
 */
(function () {
  'use strict';

  var META_KEY = 'airci_site_meta_v1';
  var FLIGHT_KEY = 'airci_flight_local_v1';
  var SITE_ID_KEY = 'airci_site_id_v1';
  var CATALOG_KEY = 'airci_projects_catalog_v1';
  var META_BY_SITE_KEY = 'airci_meta_by_site_v1';
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
  var currentGeoraster = null;
  var canopyResult = null;
  var canopyOutlineLayer = null;
  var canopyFillLayer = null;
  var activeLayer = 'ortho';
  var treeLayersById = {};


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
    var cloudEl = document.getElementById('aciMetricCloud');
    var treesEl = document.getElementById('aciMetricTrees');
    var treesSub = document.getElementById('aciMetricTreesSub');
    var coverEl = document.getElementById('aciMetricCover');
    var meanEl = document.getElementById('aciMetricMean');
    if (fileEl) {
      fileEl.textContent = info.filename
        ? String(info.filename).slice(0, 22)
        : info.cloud
          ? String(info.cloud).slice(0, 18)
          : '—';
    }
    if (cloudEl) {
      cloudEl.textContent = info.cloud_sub || info.crs || (info.byte_size ? formatBytes(info.byte_size) : 'nube');
    }
    if (treesEl && info.treeCount != null) treesEl.textContent = String(info.treeCount);
    if (treesSub && info.treeCount != null) treesSub.textContent = 'copas detectadas';
    if (coverEl && info.coverPct != null) coverEl.textContent = info.coverPct.toFixed(1) + '%';
    if (meanEl && info.meanArea != null) meanEl.textContent = Math.round(info.meanArea).toLocaleString('es-MX');
  }

  function clearCanopyLayers() {
    treeLayersById = {};
    if (canopyOutlineLayer && map) {
      try {
        map.removeLayer(canopyOutlineLayer);
      } catch (e) {}
    }
    if (canopyFillLayer && map) {
      try {
        map.removeLayer(canopyFillLayer);
      } catch (e) {}
    }
    canopyOutlineLayer = null;
    canopyFillLayer = null;
    canopyResult = null;
    var legend = document.getElementById('aciLegend');
    var tablePanel = document.getElementById('aciTablePanel');
    if (legend) legend.hidden = true;
    if (tablePanel) tablePanel.hidden = true;
    document.querySelectorAll('#aciLayerBar [data-layer="copas"], #aciLayerBar [data-layer="semaforo"]').forEach(
      function (btn) {
        btn.disabled = true;
        btn.classList.remove('is-active');
      }
    );
    var orthoBtn = document.querySelector('#aciLayerBar [data-layer="ortho"]');
    if (orthoBtn) orthoBtn.classList.add('is-active');
    activeLayer = 'ortho';
  }

  function setLayerMode(mode) {
    activeLayer = mode || 'ortho';
    document.querySelectorAll('#aciLayerBar [data-layer]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-layer') === activeLayer);
    });
    if (rasterLayer) {
      rasterLayer.setOpacity(activeLayer === 'ortho' ? 1 : 0.45);
    }
    if (canopyOutlineLayer) {
      if (activeLayer === 'copas') {
        if (!map.hasLayer(canopyOutlineLayer)) canopyOutlineLayer.addTo(map);
      } else {
        if (map.hasLayer(canopyOutlineLayer)) map.removeLayer(canopyOutlineLayer);
      }
    }
    if (canopyFillLayer) {
      if (activeLayer === 'semaforo') {
        if (!map.hasLayer(canopyFillLayer)) canopyFillLayer.addTo(map);
      } else {
        if (map.hasLayer(canopyFillLayer)) map.removeLayer(canopyFillLayer);
      }
    }
    var legend = document.getElementById('aciLegend');
    if (legend) legend.hidden = activeLayer !== 'semaforo';
  }

  function renderCanopyTable(trees) {
    var tbody = document.getElementById('aciTableBody');
    var panel = document.getElementById('aciTablePanel');
    var sub = document.getElementById('aciTableSub');
    if (!tbody || !panel) return;
    tbody.innerHTML = '';
    trees.forEach(function (t) {
      var tr = document.createElement('tr');
      tr.dataset.treeId = String(t.id);
      tr.innerHTML =
        '<td>' +
        t.id +
        '</td><td>' +
        t.areaPx.toLocaleString('es-MX') +
        '</td><td>' +
        (t.pctVsMean >= 0 ? '+' : '') +
        t.pctVsMean.toFixed(1) +
        '%</td><td>' +
        t.z.toFixed(2) +
        '</td><td><span class="aci-badge-sem ' +
        t.sem.key +
        '">' +
        t.sem.label +
        '</span></td>';
      tr.addEventListener('click', function () {
        tbody.querySelectorAll('tr').forEach(function (r) {
          r.classList.remove('is-active');
        });
        tr.classList.add('is-active');
        highlightTree(t.id);
      });
      tbody.appendChild(tr);
    });
    panel.hidden = false;
    if (sub) sub.textContent = trees.length + ' copas · clic en fila para localizar';
  }

  function highlightTree(id) {
    var entry = treeLayersById[id];
    if (!entry || !map) return;
    var layer = activeLayer === 'semaforo' ? entry.fill : entry.outline;
    if (!layer) layer = entry.outline || entry.fill;
    if (layer && layer.getBounds) {
      map.fitBounds(layer.getBounds(), { maxZoom: 20, padding: [40, 40] });
    }
    if (layer && layer.setStyle) {
      var prev = layer.options;
      layer.setStyle({ weight: 4, color: '#0f172a' });
      setTimeout(function () {
        if (activeLayer === 'semaforo' && entry.fill) {
          entry.fill.setStyle({
            color: entry.tree.sem.color,
            fillColor: entry.tree.sem.fill,
            weight: 1,
            fillOpacity: 0.75
          });
        } else if (entry.outline) {
          entry.outline.setStyle({ color: '#22c55e', weight: 2, fillOpacity: 0.05 });
        }
      }, 900);
    }
  }

  function drawCanopies(result) {
    if (!map || typeof L === 'undefined') return;
    // limpiar capas previas sin resetear UI completa a mitad
    if (canopyOutlineLayer && map) {
      try {
        map.removeLayer(canopyOutlineLayer);
      } catch (e) {}
    }
    if (canopyFillLayer && map) {
      try {
        map.removeLayer(canopyFillLayer);
      } catch (e) {}
    }
    canopyResult = result;
    canopyOutlineLayer = L.layerGroup();
    canopyFillLayer = L.layerGroup();
    treeLayersById = {};

    result.trees.forEach(function (t) {
      if (!t.latlngs || t.latlngs.length < 3) return;
      var outline = L.polygon(t.latlngs, {
        color: '#22c55e',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.06
      });
      var fill = L.polygon(t.latlngs, {
        color: t.sem.color,
        weight: 1.5,
        fillColor: t.sem.fill,
        fillOpacity: 0.72
      });
      outline.bindTooltip('Copa #' + t.id + ' · ' + t.areaPx + ' px');
      fill.bindTooltip(
        '#' + t.id + ' · ' + t.sem.label + ' · ' + (t.pctVsMean >= 0 ? '+' : '') + t.pctVsMean.toFixed(0) + '%'
      );
      outline.on('click', function () {
        highlightTree(t.id);
      });
      fill.on('click', function () {
        highlightTree(t.id);
      });
      canopyOutlineLayer.addLayer(outline);
      canopyFillLayer.addLayer(fill);
      treeLayersById[t.id] = { outline: outline, fill: fill, tree: t };
    });

    document.querySelectorAll('#aciLayerBar [data-layer="copas"], #aciLayerBar [data-layer="semaforo"]').forEach(
      function (btn) {
        btn.disabled = false;
      }
    );
    renderCanopyTable(result.trees);
    updateMetrics({
      treeCount: result.stats.count,
      coverPct: result.stats.coverPct,
      meanArea: result.stats.meanArea,
      filename: document.getElementById('aciMetricFile') && document.getElementById('aciMetricFile').textContent
    });
    setLayerMode('semaforo');
  }

  function runCanopyDetection() {
    if (!currentGeoraster) {
      setMapStatus('Primero sube un GeoTIFF', 'error');
      return;
    }
    if (!window.AirCICanopy) {
      setMapStatus('Falta airci-canopy.js', 'error');
      return;
    }
    setMapStatus('Detectando copas (ExG)…');
    var btn = document.getElementById('aciAnalyzeBtn');
    if (btn) btn.disabled = true;
    setTimeout(function () {
      try {
        var result = window.AirCICanopy.analyzeCanopies(currentGeoraster, {});
        drawCanopies(result);
    setMapStatus(
      result.stats.count +
        ' copas · cobertura ' +
        result.stats.coverPct.toFixed(1) +
        '% · semáforo por tamaño',
      'ok'
    );
    document.getElementById('aciMapSub').textContent =
      'Copas detectadas · ExG thr ' + result.stats.threshold;
    setActiveTab('analisis');
    saveCurrentMetaToSiteStore();
    refreshProjectsUi();
      } catch (e) {
        console.error(e);
        setMapStatus('Error detectando copas: ' + (e.message || e), 'error');
      }
      if (btn) btn.disabled = false;
    }, 40);
  }

  function showApp() {
    if (gateEl) gateEl.hidden = true;
    if (appEl) appEl.hidden = false;
    loadMeta();
    updateOpenBanner();
    initMapOnce();
    restoreFlightHint();
    refreshProjectsUi();
    setActiveTab('proyectos');
  }

  function setActiveTab(tab) {
    tab = tab || 'proyectos';
    document.querySelectorAll('.aci-tab').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tab);
    });
    var proy = document.getElementById('aciTabProyectos');
    var anal = document.getElementById('aciTabAnalisis');
    if (proy) proy.hidden = tab !== 'proyectos';
    if (anal) anal.hidden = tab !== 'analisis';
    if (tab === 'analisis' && map) {
      setTimeout(function () {
        map.invalidateSize();
        if (lastBounds) map.fitBounds(lastBounds, { padding: [20, 20] });
      }, 80);
    }
    if (tab === 'proyectos') refreshProjectsUi();
  }

  function readCatalog() {
    try {
      var raw = localStorage.getItem(CATALOG_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeCatalog(list) {
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(list || []));
    } catch (e) {}
  }

  function readMetaBySite() {
    try {
      var raw = localStorage.getItem(META_BY_SITE_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function writeMetaBySite(mapObj) {
    try {
      localStorage.setItem(META_BY_SITE_KEY, JSON.stringify(mapObj || {}));
    } catch (e) {}
  }

  function upsertCatalogEntry(site) {
    if (!site || !site.id) return;
    var list = readCatalog();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === site.id) {
        list[i] = Object.assign({}, list[i], site, { updated_at: Date.now() });
        found = true;
        break;
      }
    }
    if (!found) {
      list.unshift(
        Object.assign({}, site, {
          updated_at: Date.now(),
          created_at: site.created_at || Date.now()
        })
      );
    }
    writeCatalog(list);
  }

  function updateOpenBanner() {
    var meta = collectMeta();
    var titleEl = document.getElementById('aciOpenTitle');
    var pathEl = document.getElementById('aciOpenPath');
    var title = meta.title || 'Análisis sin título';
    var agricola = meta.agricola || 'Sin agrícola';
    var predio = meta.predio || 'Sin predio/rama';
    if (titleEl) titleEl.textContent = title;
    if (pathEl) pathEl.textContent = agricola + ' → ' + predio + ' · id ' + getSiteId().slice(0, 8);
  }

  function buildProjectsTree(sites) {
    var tree = Object.create(null);
    (sites || []).forEach(function (s) {
      var ag = (s.agricola || '').trim() || 'Sin agrícola';
      var pr = (s.predio || '').trim() || 'Sin predio / rama';
      if (!tree[ag]) tree[ag] = Object.create(null);
      if (!tree[ag][pr]) tree[ag][pr] = [];
      tree[ag][pr].push(s);
    });
    return tree;
  }

  function renderProjectsTree(sites) {
    var root = document.getElementById('aciProjectsTree');
    var hint = document.getElementById('aciProjectsHint');
    if (!root) return;
    root.innerHTML = '';
    var currentId = getSiteId();
    if (!sites || !sites.length) {
      root.innerHTML =
        '<div class="aci-projects-empty">Aún no hay proyectos AirCI.<br>Pulsa <strong>＋ Nuevo análisis</strong> para crear el primero.</div>';
      if (hint) {
        hint.textContent = 'Solo AirCI · no ligado a NutriPlant PRO';
        hint.classList.add('is-ok');
      }
      return;
    }
    if (hint) {
      hint.textContent = sites.length + ' análisis · Agrícola → predio/rama → título';
      hint.classList.add('is-ok');
    }
    var tree = buildProjectsTree(sites);
    Object.keys(tree)
      .sort()
      .forEach(function (ag) {
        var folder = document.createElement('div');
        folder.className = 'aci-folder';
        var branches = tree[ag];
        var count = 0;
        Object.keys(branches).forEach(function (k) {
          count += branches[k].length;
        });
        folder.innerHTML =
          '<div class="aci-folder__name">📁 ' +
          escapeHtml(ag) +
          '<small>' +
          count +
          ' análisis</small></div>';
        Object.keys(branches)
          .sort()
          .forEach(function (pr) {
            var branch = document.createElement('div');
            branch.className = 'aci-branch';
            branch.innerHTML = '<div class="aci-branch__name">🌿 ' + escapeHtml(pr) + '</div>';
            branches[pr].forEach(function (s) {
              var row = document.createElement('div');
              row.className = 'aci-project-row' + (s.id === currentId ? ' is-current' : '');
              var title = (s.title || '').trim() || 'Sin título';
              var cult = (s.cultivo || '').trim();
              row.innerHTML =
                '<div class="aci-project-row__info"><strong>' +
                escapeHtml(title) +
                '</strong><span>' +
                (cult ? escapeHtml(cult) + ' · ' : '') +
                'id ' +
                String(s.id).slice(0, 8) +
                (s.id === currentId ? ' · abierto' : '') +
                '</span></div>' +
                '<div class="aci-project-row__btns">' +
                '<button type="button" class="aci-btn aci-btn--enter aci-btn--sm" data-open-site="' +
                escapeHtml(s.id) +
                '">Abrir</button>' +
                '</div>';
              branch.appendChild(row);
            });
            folder.appendChild(branch);
          });
        root.appendChild(folder);
      });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function refreshProjectsUi() {
    var hint = document.getElementById('aciProjectsHint');
    if (hint) {
      hint.textContent = 'Actualizando lista…';
      hint.classList.remove('is-ok');
    }
    // 1) local catalog
    var local = readCatalog();
    // 2) merge current open site
    var cur = Object.assign({ id: getSiteId() }, collectMeta());
    upsertCatalogEntry(cur);
    local = readCatalog();

    // 3) try cloud
    var cloudSites = null;
    try {
      var r = await apiOrtho({ action: 'list_sites' });
      if (r.ok && Array.isArray(r.sites)) {
        cloudSites = r.sites;
        cloudSites.forEach(function (s) {
          upsertCatalogEntry({
            id: s.id,
            title: s.title,
            agricola: s.agricola,
            predio: s.predio,
            cultivo: s.cultivo,
            variedad: s.variedad,
            edad: s.edad,
            nota: s.nota,
            updated_at: s.updated_at ? Date.parse(s.updated_at) : Date.now()
          });
        });
        local = readCatalog();
      } else if (r.setup && hint) {
        hint.textContent = 'Lista local · para nube ejecuta ' + r.setup;
      }
    } catch (e) {}

    renderProjectsTree(local);
    if (hint && (!hint.textContent || hint.textContent.indexOf('Actualizando') === 0)) {
      hint.textContent =
        local.length +
        ' análisis' +
        (cloudSites ? ' (local + nube)' : ' (local)') +
        ' · solo AirCI';
      hint.classList.add('is-ok');
    }
  }

  function saveCurrentMetaToSiteStore() {
    var id = getSiteId();
    var meta = collectMeta();
    var mapObj = readMetaBySite();
    mapObj[id] = meta;
    writeMetaBySite(mapObj);
    upsertCatalogEntry(Object.assign({ id: id }, meta));
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {}
    updateOpenBanner();
  }

  function openSite(siteId) {
    if (!siteId) return;
    // guardar el actual antes de cambiar
    saveCurrentMetaToSiteStore();
    try {
      localStorage.setItem(SITE_ID_KEY, siteId);
    } catch (e) {}
    var mapObj = readMetaBySite();
    var meta = mapObj[siteId] || defaultMeta();
    // si el catálogo tiene más datos, rellenar vacíos
    var cat = readCatalog().filter(function (s) {
      return s.id === siteId;
    })[0];
    if (cat) {
      Object.keys(defaultMeta()).forEach(function (k) {
        if (!meta[k] && cat[k]) meta[k] = cat[k];
      });
    }
    document.querySelectorAll('[data-meta]').forEach(function (el) {
      var key = el.getAttribute('data-meta');
      if (!key) return;
      el.value = meta[key] || '';
    });
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {}
    // limpiar mapa al cambiar de proyecto (el TIFF se vuelve a subir o cargar)
    currentGeoraster = null;
    clearCanopyLayers();
    if (rasterLayer && map) {
      try {
        map.removeLayer(rasterLayer);
      } catch (e) {}
      rasterLayer = null;
    }
    showMapPane(false);
    var ph = document.getElementById('aciMapPlaceholder');
    if (ph) {
      ph.hidden = false;
      ph.style.display = '';
    }
    var analyzeBtn = document.getElementById('aciAnalyzeBtn');
    if (analyzeBtn) analyzeBtn.hidden = true;
    updateOpenBanner();
    setActiveTab('analisis');
    refreshProjectsUi();
    setMapStatus('Proyecto abierto. Sube el GeoTIFF de este análisis.', 'ok');
  }

  function createNewProject() {
    saveCurrentMetaToSiteStore();
    var id = uuid();
    try {
      localStorage.setItem(SITE_ID_KEY, id);
    } catch (e) {}
    var meta = defaultMeta();
    meta.title = 'Nuevo análisis';
    meta.agricola = '';
    meta.predio = '';
    document.querySelectorAll('[data-meta]').forEach(function (el) {
      var key = el.getAttribute('data-meta');
      if (!key) return;
      el.value = meta[key] || '';
    });
    saveCurrentMetaToSiteStore();
    currentGeoraster = null;
    clearCanopyLayers();
    if (rasterLayer && map) {
      try {
        map.removeLayer(rasterLayer);
      } catch (e) {}
      rasterLayer = null;
    }
    showMapPane(false);
    var analyzeBtn = document.getElementById('aciAnalyzeBtn');
    if (analyzeBtn) analyzeBtn.hidden = true;
    updateOpenBanner();
    setActiveTab('analisis');
    refreshProjectsUi();
    upsertSiteCloud().catch(function () {});
    setMapStatus('Nuevo análisis creado. Completa datos y sube el GeoTIFF.', 'ok');
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
      saveCurrentMetaToSiteStore();
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
    var wrap = document.getElementById('aciMapWrap');
    var fitBtn = document.getElementById('aciFitBounds');
    if (ph) {
      ph.hidden = !!show;
      ph.style.display = show ? 'none' : '';
    }
    if (mapEl) {
      mapEl.hidden = !show;
      mapEl.style.display = show ? 'block' : 'none';
    }
    if (wrap) wrap.classList.toggle('is-loaded', !!show);
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
    currentGeoraster = georaster;
    clearCanopyLayers();
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

    var analyzeBtn = document.getElementById('aciAnalyzeBtn');
    if (analyzeBtn) analyzeBtn.hidden = false;

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

    // Auto-detectar copas + semáforo tras cargar el TIFF
    setTimeout(runCanopyDetection, 120);

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
        cloud: f.path ? 'En nube' : 'Solo local',
        cloud_sub: f.path ? 'airci-orthos' : 'vuelve a subir para ver'
      });
      document.getElementById('aciMapSub').textContent =
        'Último TIFF: ' + f.filename + ' — vuelve a subir para ver mapa y copas';
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

  var analyzeBtn = document.getElementById('aciAnalyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', function () {
      runCanopyDetection();
    });
  }

  var layerBar = document.getElementById('aciLayerBar');
  if (layerBar) {
    layerBar.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-layer]') : null;
      if (!btn || btn.disabled) return;
      setLayerMode(btn.getAttribute('data-layer'));
    });
  }

  document.querySelectorAll('.aci-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveTab(btn.getAttribute('data-tab'));
    });
  });

  document.querySelectorAll('[data-tab-jump]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveTab(btn.getAttribute('data-tab-jump'));
    });
  });

  var newBtn = document.getElementById('aciNewProjectBtn');
  if (newBtn) newBtn.addEventListener('click', createNewProject);

  var refreshBtn = document.getElementById('aciRefreshProjectsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshProjectsUi);

  var treeEl = document.getElementById('aciProjectsTree');
  if (treeEl) {
    treeEl.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-open-site]') : null;
      if (!btn) return;
      openSite(btn.getAttribute('data-open-site'));
    });
  }

  ensureAccess();
})();
