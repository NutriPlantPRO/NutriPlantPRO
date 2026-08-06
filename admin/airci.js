/**
 * AirCI — F0 gate + F1 GeoTIFF (visor Leaflet + subida Supabase Storage).
 */
(function () {
  'use strict';

  var META_KEY = 'airci_site_meta_v1';
  var FLIGHT_KEY = 'airci_flight_local_v1';
  var FLIGHT_BY_SITE_KEY = 'airci_flight_by_site_v1';
  var SITE_ID_KEY = 'airci_site_id_v1';
  var CATALOG_KEY = 'airci_projects_catalog_v1';
  var META_BY_SITE_KEY = 'airci_meta_by_site_v1';
  var CANOPY_BY_SITE_KEY = 'airci_canopy_by_site_v1';
  var TREE_COLLAPSE_KEY = 'airci_tree_collapse_v1';
  var BASEMAP_KEY = 'airci_basemap_v1';
  /** Misma API Key que NutriPlant (map.js) — Google Maps como fondo AirCI */
  var GOOGLE_MAPS_KEY = 'AIzaSyBWjzVfDemtQqq0Cy-Tr0VaHinV2bdlN1k';
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
  var activeBasemap = 'sat';
  var googleMapsPromise = null;
  var lastBounds = null;
  var currentGeoraster = null;
  var canopyResult = null;
  var canopyOutlineLayer = null;
  var canopyFillLayer = null;
  var canopyLabelLayer = null;
  var activeLayer = 'ortho';
  var activeSemFilter = 'all';
  var treeLayersById = {};
  var orthoLoadInFlight = false;


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
    if (meanEl && info.meanArea != null) {
      var meanSub = document.getElementById('aciMetricMeanSub');
      if (info.meanAreaM2 != null && Number.isFinite(info.meanAreaM2)) {
        meanEl.textContent = info.meanAreaM2.toFixed(2) + ' m²';
        if (meanSub) meanSub.textContent = 'copa media del lote';
      } else {
        meanEl.textContent = Math.round(info.meanArea).toLocaleString('es-MX');
        if (meanSub) meanSub.textContent = 'píxeles de copa';
      }
    }
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
    if (canopyLabelLayer && map) {
      try {
        map.removeLayer(canopyLabelLayer);
      } catch (e2) {}
    }
    canopyOutlineLayer = null;
    canopyFillLayer = null;
    canopyLabelLayer = null;
    canopyResult = null;
    activeSemFilter = 'all';
    var legend = document.getElementById('aciLegend');
    var tablePanel = document.getElementById('aciTablePanel');
    if (legend) legend.hidden = true;
    if (tablePanel) tablePanel.hidden = true;
    document.querySelectorAll(
      '#aciLayerBar [data-layer="copas"], #aciLayerBar [data-layer="semaforo"], #aciLayerBar [data-layer="numeros"]'
    ).forEach(function (btn) {
      btn.disabled = true;
      btn.classList.remove('is-active');
    });
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
      if (activeLayer === 'copas' || activeLayer === 'numeros') {
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
    if (canopyLabelLayer) {
      if (activeLayer === 'numeros' || activeLayer === 'semaforo' || activeLayer === 'copas') {
        if (!map.hasLayer(canopyLabelLayer)) canopyLabelLayer.addTo(map);
      } else {
        if (map.hasLayer(canopyLabelLayer)) map.removeLayer(canopyLabelLayer);
      }
      // En semáforo/copas los números van más discretos; en capa Números, fuertes
      var strong = activeLayer === 'numeros';
      Object.keys(treeLayersById).forEach(function (id) {
        var entry = treeLayersById[id];
        if (!entry || !entry.labelEl) return;
        entry.labelEl.classList.toggle('aci-tree-label--strong', strong);
        entry.labelEl.classList.toggle('aci-tree-label--soft', !strong);
      });
    }
    var legend = document.getElementById('aciLegend');
    if (legend) legend.hidden = activeLayer !== 'semaforo';
  }

  function fmtNum(v, digits) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return Number(v).toLocaleString('es-MX', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function getAllTrees() {
    return canopyResult && Array.isArray(canopyResult.trees) ? canopyResult.trees : [];
  }

  function treesMatchingSem(key) {
    var all = getAllTrees();
    if (!key || key === 'all') return all;
    return all.filter(function (t) {
      return t.sem && t.sem.key === key;
    });
  }

  function syncSemLegend() {
    var counts = { rojo: 0, amarillo: 0, verde: 0, azul: 0 };
    getAllTrees().forEach(function (t) {
      var k = t.sem && t.sem.key;
      if (k && counts[k] != null) counts[k]++;
    });
    Object.keys(counts).forEach(function (k) {
      var el = document.querySelector('[data-sem-count="' + k + '"]');
      if (el) el.textContent = counts[k] ? '(' + counts[k] + ')' : '(0)';
    });
    document.querySelectorAll('#aciLegend [data-sem]').forEach(function (btn) {
      var k = btn.getAttribute('data-sem');
      btn.classList.toggle('is-active', k === activeSemFilter);
      if (k !== 'all') {
        btn.disabled = !counts[k];
        btn.classList.toggle('is-empty', !counts[k]);
      } else {
        btn.disabled = false;
        btn.classList.remove('is-empty');
      }
    });
  }

  function applySemFilterStyles() {
    Object.keys(treeLayersById).forEach(function (id) {
      var entry = treeLayersById[id];
      if (!entry || !entry.tree) return;
      var match =
        activeSemFilter === 'all' || (entry.tree.sem && entry.tree.sem.key === activeSemFilter);
      if (entry.fill && entry.fill.setStyle) {
        entry.fill.setStyle({
          color: entry.tree.sem.color,
          fillColor: entry.tree.sem.fill,
          weight: match ? (activeSemFilter === 'all' ? 1.5 : 2.5) : 1,
          fillOpacity: match ? (activeSemFilter === 'all' ? 0.72 : 0.88) : 0.08,
          opacity: match ? 1 : 0.2
        });
      }
      if (entry.outline && entry.outline.setStyle) {
        entry.outline.setStyle({
          color: '#22c55e',
          weight: match ? 2 : 1,
          fillOpacity: match ? 0.06 : 0.01,
          opacity: match ? 1 : 0.15
        });
      }
      if (entry.label) {
        if (match) {
          if (entry.label.getElement) {
            var el = entry.label.getElement();
            if (el) el.style.display = '';
          }
          if (entry.label.setOpacity) entry.label.setOpacity(1);
        } else {
          if (entry.label.getElement) {
            var el2 = entry.label.getElement();
            if (el2) el2.style.display = 'none';
          }
          if (entry.label.setOpacity) entry.label.setOpacity(0);
        }
      }
    });
  }

  function fitSemFilterBounds(trees) {
    if (!map || !trees || !trees.length) return;
    var bounds = null;
    trees.forEach(function (t) {
      var entry = treeLayersById[t.id];
      var layer = entry && (entry.fill || entry.outline);
      if (!layer || !layer.getBounds) return;
      var b = layer.getBounds();
      if (!b || !b.isValid || !b.isValid()) return;
      bounds = bounds ? bounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast());
    });
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { maxZoom: 20, padding: [36, 36] });
    }
  }

  function setSemFilter(key) {
    if (!key) key = 'all';
    // segundo clic en el mismo filtro → vuelve a Todos
    if (key !== 'all' && key === activeSemFilter) key = 'all';
    activeSemFilter = key;
    syncSemLegend();
    applySemFilterStyles();
    var filtered = treesMatchingSem(activeSemFilter);
    renderCanopyTable(filtered);
    if (activeSemFilter !== 'all') {
      setLayerMode('semaforo');
      fitSemFilterBounds(filtered);
      setMapStatus(
        filtered.length
          ? filtered.length + ' copas · filtro semáforo «' + activeSemFilter + '»'
          : 'Sin copas en ese semáforo',
        filtered.length ? 'ok' : 'error'
      );
    } else if (canopyResult) {
      setMapStatus(getAllTrees().length + ' copas · mostrando todas', 'ok');
    }
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
      var pct = t.pctVsMean != null ? Number(t.pctVsMean) : 0;
      var z = t.z != null ? Number(t.z) : 0;
      var perc = t.percentile != null ? Number(t.percentile) : null;
      var sem = t.sem || { key: 'verde', label: '—' };
      tr.innerHTML =
        '<td>' +
        t.id +
        '</td><td>' +
        (t.row != null ? t.row : '—') +
        '</td><td>' +
        (t.pos != null ? t.pos : '—') +
        '</td><td>' +
        Number(t.areaPx || 0).toLocaleString('es-MX') +
        '</td><td>' +
        fmtNum(t.areaM2, 2) +
        '</td><td>' +
        fmtNum(t.diameterM, 2) +
        '</td><td>' +
        (pct >= 0 ? '+' : '') +
        pct.toFixed(1) +
        '%</td><td>' +
        (perc != null && Number.isFinite(perc) ? Math.round(perc) : '—') +
        '</td><td title="Desvío estándar vs promedio del lote (z-score)">' +
        z.toFixed(2) +
        '</td><td><span class="aci-badge-sem ' +
        sem.key +
        '">' +
        sem.label +
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
    if (sub) {
      var hasScale = getAllTrees().some(function (t) {
        return t.areaM2 != null && Number.isFinite(Number(t.areaM2));
      });
      var filterNote =
        activeSemFilter && activeSemFilter !== 'all'
          ? ' · filtro: ' + activeSemFilter
          : '';
      sub.textContent =
        trees.length +
        ' copas' +
        filterNote +
        ' · clic en fila para localizar' +
        (hasScale ? '' : ' · sin escala: m²/diámetro requieren GeoTIFF georreferenciado');
    }
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
      layer.setStyle({ weight: 4, color: '#0f172a', opacity: 1, fillOpacity: 0.9 });
      setTimeout(function () {
        applySemFilterStyles();
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
    if (canopyLabelLayer && map) {
      try {
        map.removeLayer(canopyLabelLayer);
      } catch (e2) {}
    }
    canopyResult = result;
    canopyOutlineLayer = L.layerGroup();
    canopyFillLayer = L.layerGroup();
    canopyLabelLayer = L.layerGroup();
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
      var center = t.center;
      if (!center || center.length < 2) {
        var b0 = outline.getBounds();
        center = [b0.getCenter().lat, b0.getCenter().lng];
      }
      var labelHtml =
        '<div class="aci-tree-label aci-tree-label--soft" title="ID ' +
        t.id +
        (t.row != null ? ' · Surco ' + t.row + ' · Pos ' + t.pos : '') +
        '">' +
        t.id +
        '</div>';
      var label = L.marker(center, {
        interactive: true,
        keyboard: false,
        zIndexOffset: 600,
        icon: L.divIcon({
          className: 'aci-tree-label-wrap',
          html: labelHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      });
      var tip =
        '#' +
        t.id +
        (t.row != null ? ' · S' + t.row + '-P' + t.pos : '') +
        ' · ' +
        t.areaPx +
        ' px' +
        (t.areaM2 != null ? ' · ' + Number(t.areaM2).toFixed(2) + ' m²' : '');
      outline.bindTooltip(tip);
      fill.bindTooltip(
        '#' +
          t.id +
          (t.row != null ? ' · S' + t.row + '-P' + t.pos : '') +
          ' · ' +
          t.sem.label +
          ' · ' +
          (t.pctVsMean >= 0 ? '+' : '') +
          t.pctVsMean.toFixed(0) +
          '%'
      );
      label.bindTooltip(tip);
      outline.on('click', function () {
        highlightTree(t.id);
      });
      fill.on('click', function () {
        highlightTree(t.id);
      });
      label.on('click', function () {
        highlightTree(t.id);
      });
      canopyOutlineLayer.addLayer(outline);
      canopyFillLayer.addLayer(fill);
      canopyLabelLayer.addLayer(label);
      var labelEl = null;
      try {
        labelEl = label.getElement() && label.getElement().querySelector('.aci-tree-label');
      } catch (e3) {}
      treeLayersById[t.id] = {
        outline: outline,
        fill: fill,
        label: label,
        labelEl: labelEl,
        tree: t
      };
    });

    // Enlazar elementos DOM de labels tras añadir al mapa (si aún no)
    setTimeout(function () {
      var strong = activeLayer === 'numeros';
      Object.keys(treeLayersById).forEach(function (id) {
        var entry = treeLayersById[id];
        if (!entry || !entry.label) return;
        try {
          var root = entry.label.getElement();
          entry.labelEl = root && root.querySelector('.aci-tree-label');
          if (entry.labelEl) {
            entry.labelEl.classList.toggle('aci-tree-label--strong', strong);
            entry.labelEl.classList.toggle('aci-tree-label--soft', !strong);
          }
        } catch (e4) {}
      });
      applySemFilterStyles();
    }, 0);

    document
      .querySelectorAll(
        '#aciLayerBar [data-layer="copas"], #aciLayerBar [data-layer="semaforo"], #aciLayerBar [data-layer="numeros"]'
      )
      .forEach(function (btn) {
        btn.disabled = false;
      });
    activeSemFilter = 'all';
    syncSemLegend();
    applySemFilterStyles();
    renderCanopyTable(result.trees);
    updateMetrics({
      treeCount: result.stats.count,
      coverPct: result.stats.coverPct,
      meanArea: result.stats.meanArea,
      meanAreaM2: result.stats.meanAreaM2,
      filename: document.getElementById('aciMetricFile') && document.getElementById('aciMetricFile').textContent
    });
    var rowN = result.stats && result.stats.rowCount ? result.stats.rowCount : null;
    setLayerMode('numeros');
    if (rowN) {
      setMapStatus(
        result.stats.count + ' copas · ' + rowN + ' surcos · ID por surco y línea',
        'ok'
      );
    }
  }

  function getLastFlightId() {
    try {
      var raw = localStorage.getItem(FLIGHT_KEY);
      if (!raw) return null;
      var f = JSON.parse(raw);
      if (!f || !f.flight_id) return null;
      if (f.site_id && f.site_id !== getSiteId()) return null;
      return f.flight_id;
    } catch (e) {
      return null;
    }
  }

  function saveCanopyLocal(siteId, payload) {
    try {
      var raw = localStorage.getItem(CANOPY_BY_SITE_KEY);
      var mapObj = raw ? JSON.parse(raw) : {};
      if (!mapObj || typeof mapObj !== 'object') mapObj = {};
      mapObj[siteId] = {
        stats: payload.stats,
        trees: payload.trees,
        saved_at: Date.now()
      };
      localStorage.setItem(CANOPY_BY_SITE_KEY, JSON.stringify(mapObj));
    } catch (e) {}
  }

  function loadCanopyLocal(siteId) {
    try {
      var raw = localStorage.getItem(CANOPY_BY_SITE_KEY);
      var mapObj = raw ? JSON.parse(raw) : {};
      return mapObj && mapObj[siteId] ? mapObj[siteId] : null;
    } catch (e) {
      return null;
    }
  }

  async function persistCanopyResult(result) {
    var siteId = getSiteId();
    saveCanopyLocal(siteId, { stats: result.stats, trees: result.trees });
    var r = await apiOrtho({
      action: 'save_canopy',
      site_id: siteId,
      flight_id: getLastFlightId(),
      stats: result.stats,
      trees: result.trees
    });
    if (r.ok) {
      setMapStatus(
        result.stats.count +
          ' copas guardadas en Supabase · cobertura ' +
          Number(result.stats.coverPct || 0).toFixed(1) +
          '%',
        'ok'
      );
      return true;
    }
    setMapStatus(
      r.setup
        ? 'Copas en local. Ejecuta ' + r.setup + ' en Supabase.'
        : 'Copas en local. Nube: ' + (r.error || 'error'),
      'error'
    );
    return false;
  }

  async function restoreCanopyForSite(siteId) {
    try {
      var r = await apiOrtho({ action: 'load_canopy', site_id: siteId });
      if (r.ok && r.result && Array.isArray(r.result.trees) && r.result.trees.length) {
        drawCanopies({
          trees: r.result.trees,
          stats: r.result.stats || {
            count: r.result.trees.length,
            coverPct: 0,
            meanArea: 0,
            stdArea: 1,
            threshold: 0
          }
        });
        showMapPane(true);
        setMapStatus(r.result.trees.length + ' copas restauradas desde Supabase', 'ok');
        return true;
      }
    } catch (e) {}
    var local = loadCanopyLocal(siteId);
    if (local && Array.isArray(local.trees) && local.trees.length) {
      drawCanopies({
        trees: local.trees,
        stats: local.stats || {
          count: local.trees.length,
          coverPct: 0,
          meanArea: 0,
          stdArea: 1,
          threshold: 0
        }
      });
      showMapPane(true);
      setMapStatus(local.trees.length + ' copas restauradas (local)', 'ok');
      return true;
    }
    return false;
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
    setTimeout(async function () {
      try {
        var result = window.AirCICanopy.analyzeCanopies(currentGeoraster, {});
        drawCanopies(result);
        document.getElementById('aciMapSub').textContent =
          'Copas detectadas · ExG thr ' + result.stats.threshold;
        if (result.stats.truncated) {
          setMapStatus(
            'Detectadas ' +
              result.stats.count +
              ' copas (tope ' +
              result.stats.maxTrees +
              '). Hay más en el orto; se listan las de mayor área.',
            'ok'
          );
        }
        setActiveTab('analisis');
        saveCurrentMetaToSiteStore();
        refreshProjectsUi();
        await persistCanopyResult(result);
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
    if (tab === 'analisis') {
      setTimeout(function () {
        if (map) {
          map.invalidateSize();
          if (lastBounds) map.fitBounds(lastBounds, { padding: [20, 20] });
        }
      }, 80);
      // Si no hay TIFF en memoria pero el análisis existe, recargar de la nube
      if (!currentGeoraster && !rasterLayer && !orthoLoadInFlight) {
        var sid = getSiteId();
        if (sid) {
          setMapStatus('Recuperando ortomosaico de este análisis…', 'ok');
          orthoLoadInFlight = true;
          loadOrthoAndCanopyForSite(sid)
            .catch(function (e) {
              console.error(e);
              showMapPane(false);
              setMapStatus(
                'No se pudo recuperar el GeoTIFF. Usa Subir GeoTIFF de nuevo.',
                'error'
              );
            })
            .then(function () {
              orthoLoadInFlight = false;
            });
        }
      }
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

  function purgeSitesLocal(siteIds) {
    var ids = (siteIds || []).filter(Boolean);
    if (!ids.length) return;
    var idSet = Object.create(null);
    ids.forEach(function (id) {
      idSet[id] = true;
    });

    writeCatalog(
      readCatalog().filter(function (s) {
        return !idSet[s.id];
      })
    );

    var metaMap = readMetaBySite();
    ids.forEach(function (id) {
      delete metaMap[id];
    });
    writeMetaBySite(metaMap);

    try {
      var rawF = localStorage.getItem(FLIGHT_BY_SITE_KEY);
      var byF = rawF ? JSON.parse(rawF) : {};
      if (byF && typeof byF === 'object') {
        ids.forEach(function (id) {
          delete byF[id];
        });
        localStorage.setItem(FLIGHT_BY_SITE_KEY, JSON.stringify(byF));
      }
    } catch (e) {}

    try {
      var rawC = localStorage.getItem(CANOPY_BY_SITE_KEY);
      var byC = rawC ? JSON.parse(rawC) : {};
      if (byC && typeof byC === 'object') {
        ids.forEach(function (id) {
          delete byC[id];
        });
        localStorage.setItem(CANOPY_BY_SITE_KEY, JSON.stringify(byC));
      }
    } catch (e2) {}

    var current = getSiteId();
    if (idSet[current]) {
      try {
        localStorage.removeItem(FLIGHT_KEY);
        localStorage.removeItem(META_KEY);
      } catch (e3) {}
      currentGeoraster = null;
      clearCanopyLayers();
      if (rasterLayer && map) {
        try {
          map.removeLayer(rasterLayer);
        } catch (e4) {}
        rasterLayer = null;
      }
      lastBounds = null;
      showMapPane(false);
      var analyzeBtn = document.getElementById('aciAnalyzeBtn');
      if (analyzeBtn) analyzeBtn.hidden = true;
      updateMetrics({ filename: '—', cloud: '—', cloud_sub: '—' });
      var treesEl = document.getElementById('aciMetricTrees');
      var coverEl = document.getElementById('aciMetricCover');
      var meanEl = document.getElementById('aciMetricMean');
      if (treesEl) treesEl.textContent = '—';
      if (coverEl) coverEl.textContent = '—';
      if (meanEl) meanEl.textContent = '—';

      var remaining = readCatalog();
      if (remaining.length) {
        try {
          localStorage.setItem(SITE_ID_KEY, remaining[0].id);
        } catch (e5) {}
        loadMeta();
        updateOpenBanner();
      } else {
        var freshId = uuid();
        var blank = defaultMeta();
        blank.title = 'Nuevo análisis';
        try {
          localStorage.setItem(SITE_ID_KEY, freshId);
          localStorage.setItem(META_KEY, JSON.stringify(blank));
        } catch (e6) {}
        document.querySelectorAll('[data-meta]').forEach(function (el) {
          var key = el.getAttribute('data-meta');
          if (!key) return;
          el.value = blank[key] || '';
        });
        updateOpenBanner();
      }
    }
  }

  async function deleteSiteWithConfirm(siteId, title) {
    if (!siteId) return;
    var label = title || siteId.slice(0, 8);
    var ok = window.confirm(
      '¿Borrar el análisis «' +
        label +
        '»?\n\nSe eliminará:\n• datos del predio\n• GeoTIFF en la nube\n• copas / semáforo guardados\n\nEsta acción no se puede deshacer.'
    );
    if (!ok) return;

    var hint = document.getElementById('aciProjectsHint');
    if (hint) {
      hint.textContent = 'Borrando análisis…';
      hint.classList.remove('is-ok');
    }

    var cloudOk = false;
    try {
      var r = await apiOrtho({ action: 'delete_site', site_id: siteId });
      cloudOk = !!(r && r.ok);
      if (!cloudOk && r && !r.missing) {
        var cont = window.confirm(
          'No se pudo borrar en la nube: ' +
            (r.error || 'error') +
            '\n\n¿Borrar solo de este navegador?'
        );
        if (!cont) {
          if (hint) hint.textContent = 'Borrado cancelado';
          return;
        }
      }
    } catch (e) {
      var cont2 = window.confirm(
        'Error de red al borrar en la nube.\n\n¿Borrar solo de este navegador?'
      );
      if (!cont2) return;
    }

    purgeSitesLocal([siteId]);
    await refreshProjectsUi();
    if (hint) {
      hint.textContent = cloudOk
        ? 'Análisis borrado (nube + local)'
        : 'Análisis borrado en este navegador';
      hint.classList.add('is-ok');
    }
  }

  async function deleteAgricolaWithConfirm(agName, count) {
    var label = agName || 'Sin agrícola';
    var n = Number(count) || 0;
    var ok = window.confirm(
      '¿Borrar el agrícola «' +
        label +
        '» y sus ' +
        n +
        ' análisis?\n\nSe eliminará todo lo de este agrícola:\n• análisis\n• GeoTIFF en la nube\n• copas / datos\n\nEsta acción no se puede deshacer.'
    );
    if (!ok) return;

    var hint = document.getElementById('aciProjectsHint');
    if (hint) {
      hint.textContent = 'Borrando agrícola…';
      hint.classList.remove('is-ok');
    }

    var localIds = readCatalog()
      .filter(function (s) {
        var a = (s.agricola || '').trim() || 'Sin agrícola';
        return a === label;
      })
      .map(function (s) {
        return s.id;
      });

    var cloudIds = [];
    var cloudOk = false;
    try {
      var r = await apiOrtho({ action: 'delete_agricola', agricola: label });
      cloudOk = !!(r && (r.ok || r.count === 0));
      if (r && Array.isArray(r.deleted)) cloudIds = r.deleted;
      if (!cloudOk && r && r.errors && r.errors.length) {
        var cont = window.confirm(
          'Algunos no se borraron en la nube.\n\n¿Borrar de todas formas en este navegador los análisis de «' +
            label +
            '»?'
        );
        if (!cont) {
          if (hint) hint.textContent = 'Borrado cancelado';
          return;
        }
      }
    } catch (e) {
      var cont2 = window.confirm(
        'Error de red al borrar en la nube.\n\n¿Borrar solo de este navegador el agrícola «' +
          label +
          '»?'
      );
      if (!cont2) return;
    }

    var allIds = localIds.slice();
    cloudIds.forEach(function (id) {
      if (allIds.indexOf(id) < 0) allIds.push(id);
    });
    purgeSitesLocal(allIds);
    setAgricolaCollapsed(label, false);
    await refreshProjectsUi();
    if (hint) {
      hint.textContent =
        'Agrícola «' +
        label +
        '» borrado' +
        (cloudOk ? ' (nube + local)' : ' (local)') +
        ' · ' +
        allIds.length +
        ' análisis';
      hint.classList.add('is-ok');
    }
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

  function readTreeCollapse() {
    try {
      var raw = localStorage.getItem(TREE_COLLAPSE_KEY);
      var o = raw ? JSON.parse(raw) : null;
      if (!o || typeof o !== 'object') return { ag: {}, pr: {} };
      if (!o.ag || typeof o.ag !== 'object') o.ag = {};
      if (!o.pr || typeof o.pr !== 'object') o.pr = {};
      return o;
    } catch (e) {
      return { ag: {}, pr: {} };
    }
  }

  function writeTreeCollapse(state) {
    try {
      localStorage.setItem(TREE_COLLAPSE_KEY, JSON.stringify(state || { ag: {}, pr: {} }));
    } catch (e) {}
  }

  function predioCollapseKey(ag, pr) {
    return String(ag) + '\u0001' + String(pr);
  }

  function isAgricolaCollapsed(ag) {
    return !!readTreeCollapse().ag[ag];
  }

  function isPredioCollapsed(ag, pr) {
    return !!readTreeCollapse().pr[predioCollapseKey(ag, pr)];
  }

  function setAgricolaCollapsed(ag, collapsed) {
    var st = readTreeCollapse();
    if (collapsed) st.ag[ag] = true;
    else delete st.ag[ag];
    writeTreeCollapse(st);
  }

  function setPredioCollapsed(ag, pr, collapsed) {
    var st = readTreeCollapse();
    var k = predioCollapseKey(ag, pr);
    if (collapsed) st.pr[k] = true;
    else delete st.pr[k];
    writeTreeCollapse(st);
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
      hint.textContent =
        sites.length + ' análisis · clic en agrícola/predio para minimizar · se guarda solo';
      hint.classList.add('is-ok');
    }
    var tree = buildProjectsTree(sites);
    Object.keys(tree)
      .sort()
      .forEach(function (ag) {
        var folder = document.createElement('div');
        var agCollapsed = isAgricolaCollapsed(ag);
        folder.className = 'aci-folder' + (agCollapsed ? ' is-collapsed' : '');
        folder.dataset.agricola = ag;
        var branches = tree[ag];
        var count = 0;
        Object.keys(branches).forEach(function (k) {
          count += branches[k].length;
        });
        var head = document.createElement('div');
        head.className = 'aci-folder__head';
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'aci-folder__name';
        toggle.setAttribute('data-toggle-ag', ag);
        toggle.setAttribute('aria-expanded', agCollapsed ? 'false' : 'true');
        toggle.innerHTML =
          '<span class="aci-fold-chevron" aria-hidden="true"></span>' +
          '<span class="aci-fold-label">📁 ' +
          escapeHtml(ag) +
          '<small>' +
          count +
          ' análisis</small></span>';
        var delAg = document.createElement('button');
        delAg.type = 'button';
        delAg.className = 'aci-btn aci-btn--danger aci-btn--sm';
        delAg.setAttribute('data-delete-ag', ag);
        delAg.setAttribute('data-delete-ag-count', String(count));
        delAg.title = 'Borrar agrícola y todos sus análisis';
        delAg.textContent = 'Borrar';
        head.appendChild(toggle);
        head.appendChild(delAg);
        folder.appendChild(head);

        var body = document.createElement('div');
        body.className = 'aci-folder__body';
        Object.keys(branches)
          .sort()
          .forEach(function (pr) {
            var branch = document.createElement('div');
            var prCollapsed = isPredioCollapsed(ag, pr);
            branch.className = 'aci-branch' + (prCollapsed ? ' is-collapsed' : '');
            branch.dataset.predio = pr;
            var bHead = document.createElement('button');
            bHead.type = 'button';
            bHead.className = 'aci-branch__name';
            bHead.setAttribute('data-toggle-pr', pr);
            bHead.setAttribute('data-toggle-ag-parent', ag);
            bHead.setAttribute('aria-expanded', prCollapsed ? 'false' : 'true');
            bHead.innerHTML =
              '<span class="aci-fold-chevron aci-fold-chevron--sm" aria-hidden="true"></span>' +
              '<span>🌿 ' +
              escapeHtml(pr) +
              ' <em>(' +
              branches[pr].length +
              ')</em></span>';
            branch.appendChild(bHead);

            var bBody = document.createElement('div');
            bBody.className = 'aci-branch__body';
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
                '<button type="button" class="aci-btn aci-btn--danger aci-btn--sm" data-delete-site="' +
                escapeHtml(s.id) +
                '" data-delete-title="' +
                escapeHtml(title) +
                '">Borrar</button>' +
                '</div>';
              bBody.appendChild(row);
            });
            branch.appendChild(bBody);
            body.appendChild(branch);
          });
        folder.appendChild(body);
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
    saveCurrentMetaToSiteStore();
    try {
      localStorage.setItem(SITE_ID_KEY, siteId);
    } catch (e) {}
    var mapObj = readMetaBySite();
    var meta = mapObj[siteId] || defaultMeta();
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

    currentGeoraster = null;
    clearCanopyLayers();
    if (rasterLayer && map) {
      try {
        map.removeLayer(rasterLayer);
      } catch (e) {}
      rasterLayer = null;
    }
    lastBounds = null;

    updateOpenBanner();
    setActiveTab('analisis');
    refreshProjectsUi();
    // setActiveTab dispara loadOrthoAndCanopyForSite si no hay mapa en memoria
  }

  async function loadOrthoAndCanopyForSite(siteId) {
    var orthoOk = await loadOrthoFromCloud(siteId);
    var canopyOk = await restoreCanopyForSite(siteId);
    if (orthoOk && canopyOk) {
      setMapStatus('Ortomosaico + copas restaurados desde la nube', 'ok');
      setLayerMode('semaforo');
      return;
    }
    if (orthoOk && !canopyOk) {
      setMapStatus('Ortomosaico restaurado. Pulsando Detectar copas…', 'ok');
      runCanopyDetection();
      return;
    }
    if (!orthoOk && canopyOk) {
      setMapStatus(
        'Copas restauradas (sin TIFF en mapa). Sube de nuevo el GeoTIFF para ver el fondo.',
        'ok'
      );
      return;
    }
    showMapPane(false);
    var analyzeBtn = document.getElementById('aciAnalyzeBtn');
    if (analyzeBtn) analyzeBtn.hidden = true;
    setMapStatus('Este análisis aún no tiene GeoTIFF en la nube. Súbelo aquí.', 'ok');
  }

  async function loadOrthoFromCloud(siteId) {
    var path = null;
    var filename = 'ortho.tif';
    var flightId = null;
    var byteSize = null;

    // 1) API flights
    try {
      var list = await apiOrtho({ action: 'list_flights', site_id: siteId });
      if (list.ok && list.flights && list.flights.length) {
        var f = list.flights[0];
        path = f.storage_path;
        filename = f.filename || filename;
        flightId = f.id;
        byteSize = f.byte_size;
      }
    } catch (e) {}

    // 2) local map por site
    if (!path) {
      try {
        var raw = localStorage.getItem(FLIGHT_BY_SITE_KEY);
        var by = raw ? JSON.parse(raw) : {};
        var local = by && by[siteId];
        if (local && local.path) {
          path = local.path;
          filename = local.filename || filename;
          flightId = local.flight_id || null;
          byteSize = local.byte_size || null;
        }
      } catch (e2) {}
    }

    if (!path) return false;

    setMapStatus('Descargando GeoTIFF desde Storage…');
    var signed = await apiOrtho({ action: 'signed_url', path: path, ttl_sec: 3600 });
    if (!signed.ok || !signed.url) {
      setMapStatus(signed.error || 'No hay URL firmada del TIFF', 'error');
      return false;
    }

    var res = await fetch(signed.url);
    if (!res.ok) {
      setMapStatus('Error descargando TIFF (' + res.status + ')', 'error');
      return false;
    }
    var buf = await res.arrayBuffer();
    await renderGeotiffFromArrayBuffer(buf, {
      filename: filename,
      byte_size: byteSize || buf.byteLength,
      cloud: 'En nube',
      cloud_sub: 'airci-orthos',
      skipAutoDetect: true
    });
    saveFlightLocal(
      { filename: filename, byte_size: byteSize || buf.byteLength },
      path,
      flightId
    );
    return true;
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

  function ensureGoogleMaps() {
    if (googleMapsPromise) return googleMapsPromise;
    googleMapsPromise = new Promise(function (resolve) {
      if (window.google && google.maps) {
        resolve(true);
        return;
      }
      if (!GOOGLE_MAPS_KEY) {
        resolve(false);
        return;
      }
      var existing = document.querySelector('script[data-aci-gmaps="1"]');
      if (existing) {
        var tries = 0;
        var t = setInterval(function () {
          tries++;
          if (window.google && google.maps) {
            clearInterval(t);
            resolve(true);
          } else if (tries > 80) {
            clearInterval(t);
            resolve(false);
          }
        }, 100);
        return;
      }
      var s = document.createElement('script');
      s.setAttribute('data-aci-gmaps', '1');
      s.async = true;
      s.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(GOOGLE_MAPS_KEY) +
        '&language=es&region=MX';
      s.onload = function () {
        resolve(!!(window.google && google.maps));
      };
      s.onerror = function () {
        resolve(false);
      };
      document.head.appendChild(s);
    });
    return googleMapsPromise;
  }

  function canUseGoogleBasemap() {
    return !!(
      window.google &&
      google.maps &&
      L.gridLayer &&
      typeof L.gridLayer.googleMutant === 'function'
    );
  }

  function fallbackBasemapDefs() {
    return {
      osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 22, attribution: '&copy; OpenStreetMap' }
      },
      sat: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        opts: {
          maxZoom: 22,
          attribution: 'Tiles &copy; Esri'
        }
      },
      relief: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        opts: {
          maxZoom: 17,
          attribution: '&copy; OpenTopoMap'
        }
      }
    };
  }

  function createBasemapLayer(mode) {
    if (canUseGoogleBasemap()) {
      var gType = mode === 'sat' ? 'hybrid' : mode === 'relief' ? 'terrain' : 'roadmap';
      return L.gridLayer.googleMutant({
        type: gType,
        maxZoom: 22
      });
    }
    var def = fallbackBasemapDefs()[mode];
    if (!def) return null;
    return L.tileLayer(def.url, def.opts);
  }

  function bringOverlaysFront() {
    if (rasterLayer && map && map.hasLayer(rasterLayer) && rasterLayer.bringToFront) {
      rasterLayer.bringToFront();
    }
    if (canopyOutlineLayer && map && map.hasLayer(canopyOutlineLayer) && canopyOutlineLayer.bringToFront) {
      canopyOutlineLayer.bringToFront();
    }
    if (canopyFillLayer && map && map.hasLayer(canopyFillLayer) && canopyFillLayer.bringToFront) {
      canopyFillLayer.bringToFront();
    }
    if (canopyLabelLayer && map && map.hasLayer(canopyLabelLayer) && canopyLabelLayer.bringToFront) {
      canopyLabelLayer.bringToFront();
    }
  }

  function initMapOnce() {
    if (map || typeof L === 'undefined') return;
    var mapEl = document.getElementById('aciMap');
    if (!mapEl) return;
    map = L.map(mapEl, { zoomControl: true, attributionControl: true });
    map.setView([23.6, -102.5], 5);
    try {
      var saved = localStorage.getItem(BASEMAP_KEY);
      if (saved === 'osm' || saved === 'sat' || saved === 'relief' || saved === 'off') {
        activeBasemap = saved;
      }
    } catch (e) {}
    syncBasemapChips();
    // Cargar Google Maps (API NutriPlant) y aplicar fondo
    ensureGoogleMaps().then(function () {
      setBasemap(activeBasemap);
    });
    // Mientras carga, poner fallback inmediato
    if (activeBasemap !== 'off') setBasemap(activeBasemap);
  }

  function syncBasemapChips() {
    document.querySelectorAll('#aciBasemapBar [data-basemap]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-basemap') === activeBasemap);
    });
  }

  function setBasemap(mode) {
    mode = mode || 'sat';
    if (mode !== 'osm' && mode !== 'sat' && mode !== 'relief' && mode !== 'off') mode = 'sat';
    activeBasemap = mode;
    try {
      localStorage.setItem(BASEMAP_KEY, mode);
    } catch (e) {}
    syncBasemapChips();
    if (!map || typeof L === 'undefined') return;

    if (basemapLayer) {
      try {
        map.removeLayer(basemapLayer);
      } catch (e2) {}
      basemapLayer = null;
    }

    var mapEl = document.getElementById('aciMap');
    if (mode === 'off') {
      if (mapEl) mapEl.classList.add('aci-map--no-basemap');
      return;
    }
    if (mapEl) mapEl.classList.remove('aci-map--no-basemap');

    // Si aún no está Google, intentar cargarlo y reaplicar
    if (!canUseGoogleBasemap()) {
      var layer = createBasemapLayer(mode);
      if (layer) {
        basemapLayer = layer;
        basemapLayer.addTo(map);
        if (basemapLayer.bringToBack) basemapLayer.bringToBack();
        bringOverlaysFront();
      }
      ensureGoogleMaps().then(function (ok) {
        if (ok && activeBasemap === mode && canUseGoogleBasemap()) {
          setBasemap(mode);
        }
      });
      return;
    }

    try {
      basemapLayer = createBasemapLayer(mode);
      if (!basemapLayer) return;
      basemapLayer.addTo(map);
      if (basemapLayer.bringToBack) basemapLayer.bringToBack();
      bringOverlaysFront();
    } catch (e3) {
      console.warn('AirCI basemap Google falló, usando tiles de respaldo', e3);
      var fb = fallbackBasemapDefs()[mode];
      if (fb) {
        basemapLayer = L.tileLayer(fb.url, fb.opts).addTo(map);
        if (basemapLayer.bringToBack) basemapLayer.bringToBack();
        bringOverlaysFront();
      }
    }
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
    meta = meta || {};
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

    if (!meta.skipAutoDetect) {
      setTimeout(runCanopyDetection, 120);
    }

    return info;
  }

  function saveFlightLocal(info, path, flightId) {
    var siteId = getSiteId();
    var entry = {
      site_id: siteId,
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
    };
    try {
      localStorage.setItem(FLIGHT_KEY, JSON.stringify(entry));
    } catch (e) {}
    try {
      var raw = localStorage.getItem(FLIGHT_BY_SITE_KEY);
      var by = raw ? JSON.parse(raw) : {};
      if (!by || typeof by !== 'object') by = {};
      by[siteId] = entry;
      localStorage.setItem(FLIGHT_BY_SITE_KEY, JSON.stringify(by));
    } catch (e2) {}
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

  var basemapBar = document.getElementById('aciBasemapBar');
  if (basemapBar) {
    basemapBar.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-basemap]') : null;
      if (!btn) return;
      setBasemap(btn.getAttribute('data-basemap'));
    });
    syncBasemapChips();
  }

  var legendEl = document.getElementById('aciLegend');
  if (legendEl) {
    legendEl.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-sem]') : null;
      if (!btn || btn.disabled) return;
      setSemFilter(btn.getAttribute('data-sem'));
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
      var t =
        e.target && e.target.closest
          ? e.target.closest(
              '[data-toggle-ag],[data-toggle-pr],[data-open-site],[data-delete-site],[data-delete-ag]'
            )
          : null;
      if (!t) return;

      if (t.hasAttribute('data-delete-site')) {
        e.preventDefault();
        e.stopPropagation();
        deleteSiteWithConfirm(t.getAttribute('data-delete-site'), t.getAttribute('data-delete-title'));
        return;
      }

      if (t.hasAttribute('data-delete-ag')) {
        e.preventDefault();
        e.stopPropagation();
        deleteAgricolaWithConfirm(
          t.getAttribute('data-delete-ag'),
          t.getAttribute('data-delete-ag-count')
        );
        return;
      }

      if (t.hasAttribute('data-open-site')) {
        openSite(t.getAttribute('data-open-site'));
        return;
      }

      if (t.hasAttribute('data-toggle-ag') && !t.hasAttribute('data-toggle-pr')) {
        e.preventDefault();
        var ag = t.getAttribute('data-toggle-ag');
        var folder = t.closest('.aci-folder');
        var next = !(folder && folder.classList.contains('is-collapsed'));
        setAgricolaCollapsed(ag, next);
        if (folder) {
          folder.classList.toggle('is-collapsed', next);
          t.setAttribute('aria-expanded', next ? 'false' : 'true');
        }
        return;
      }

      if (t.hasAttribute('data-toggle-pr')) {
        e.preventDefault();
        var agP = t.getAttribute('data-toggle-ag-parent');
        var pr = t.getAttribute('data-toggle-pr');
        var branch = t.closest('.aci-branch');
        var nextPr = !(branch && branch.classList.contains('is-collapsed'));
        setPredioCollapsed(agP, pr, nextPr);
        if (branch) {
          branch.classList.toggle('is-collapsed', nextPr);
          t.setAttribute('aria-expanded', nextPr ? 'false' : 'true');
        }
      }
    });
  }

  ensureAccess();
})();
