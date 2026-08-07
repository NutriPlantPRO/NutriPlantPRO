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
  var CANOPY_HISTORY_KEY = 'airci_canopy_history_v1';
  var CANOPY_HISTORY_MAX = 5;
  var TREE_COLLAPSE_KEY = 'airci_tree_collapse_v1';
  var BASEMAP_KEY = 'airci_basemap_v1';
  /** Misma API Key que NutriPlant (map.js) — Google Maps como fondo AirCI */
  var GOOGLE_MAPS_KEY = 'AIzaSyBWjzVfDemtQqq0Cy-Tr0VaHinV2bdlN1k';
  var OWNER_EMAIL = 'admin@nutriplantpro.com';
  var SESSION_MAX_MS = 12 * 60 * 60 * 1000;
  var API = '/api/airci-ortho';
  var API_AI = '/api/airci-canopy-ai';
  var DETECT_MODEL_KEY = 'airci_detect_model_v1';
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
  var activeLayer = 'ortho'; // compat: última capa tocada
  var layerOn = { ortho: true, copas: false, semaforo: false, numeros: false };
  var activeSemFilter = 'all';
  /** Filtrar por cambio vs vuelo anterior */
  var activeDeltaFilter = 'all';
  /** sem | delta | pheno | color */
  var paintMode = 'sem';
  /** dom | flor | brote | veg | atyp */
  var phenoPaintKey = 'dom';
  /** Filtrar por dominante fenológico */
  var activePhenoFilter = 'all';
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
    var coverSub = document.getElementById('aciMetricCoverSub');
    var bareEl = document.getElementById('aciMetricBare');
    var bareSub = document.getElementById('aciMetricBareSub');
    var meanEl = document.getElementById('aciMetricMean');
    var densEl = document.getElementById('aciMetricDensity');
    var densSub = document.getElementById('aciMetricDensitySub');
    var haEl = document.getElementById('aciMetricHa');
    var haSub = document.getElementById('aciMetricHaSub');
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
    if (treesSub && info.treeCount != null) {
      treesSub.textContent =
        info.treesPerHa != null && Number.isFinite(Number(info.treesPerHa))
          ? Math.round(Number(info.treesPerHa)).toLocaleString('es-MX') + ' /ha'
          : 'copas detectadas';
    }
    if (coverEl && info.coverPct != null) {
      coverEl.textContent = Number(info.coverPct).toFixed(1) + '%';
      if (coverSub) {
        coverSub.textContent =
          info.canopyAreaM2 != null && Number.isFinite(Number(info.canopyAreaM2))
            ? Number(info.canopyAreaM2).toLocaleString('es-MX', {
                maximumFractionDigits: 0
              }) + ' m² copa'
            : 'copa sobre orto';
      }
    }
    if (bareEl) {
      if (info.barePct != null && Number.isFinite(Number(info.barePct))) {
        bareEl.textContent = Number(info.barePct).toFixed(1) + '%';
      } else if (info.coverPct != null && Number.isFinite(Number(info.coverPct))) {
        bareEl.textContent = Math.max(0, 100 - Number(info.coverPct)).toFixed(1) + '%';
      }
      if (bareSub) {
        bareSub.textContent =
          info.bareAreaM2 != null && Number.isFinite(Number(info.bareAreaM2))
            ? Number(info.bareAreaM2).toLocaleString('es-MX', {
                maximumFractionDigits: 0
              }) + ' m² libres'
            : 'suelo / espacio libre';
      }
    }
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
    if (haEl) {
      if (info.orthoAreaHa != null && Number.isFinite(Number(info.orthoAreaHa))) {
        haEl.textContent = Number(info.orthoAreaHa).toFixed(2) + ' ha';
        if (haSub) {
          haSub.textContent =
            info.gsdCm != null
              ? 'GSD ' + Number(info.gsdCm).toFixed(1) + ' cm/px'
              : 'orto georreferenciado';
        }
      } else if (info.hasScale === false || info.treeCount != null) {
        haEl.textContent = '—';
        if (haSub) haSub.textContent = 'sin escala geo';
      }
    }
    if (densEl) {
      if (info.treesPerHa != null && Number.isFinite(Number(info.treesPerHa))) {
        densEl.textContent = Math.round(Number(info.treesPerHa)).toLocaleString('es-MX');
        if (densSub) densSub.textContent = 'árboles / ha';
      } else if (info.treeCount != null) {
        densEl.textContent = '—';
        if (densSub) densSub.textContent = 'requiere ha';
      }
    }
  }

  /** Completa stats viejos (sin máx/mín/CV / geo) a partir de las copas. */
  function enrichStatsFromTrees(stats, trees) {
    stats = stats && typeof stats === 'object' ? Object.assign({}, stats) : {};
    trees = Array.isArray(trees) ? trees : [];
    var areas = trees
      .map(function (t) {
        return Number(t.areaPx);
      })
      .filter(function (n) {
        return Number.isFinite(n) && n > 0;
      });
    if (!areas.length && stats.count == null) return stats;

    if (areas.length) {
      var minA = Math.min.apply(null, areas);
      var maxA = Math.max.apply(null, areas);
      var mean = Number(stats.meanArea);
      if (!Number.isFinite(mean) || mean <= 0) {
        var sum = 0;
        areas.forEach(function (a) {
          sum += a;
        });
        mean = sum / areas.length;
        stats.meanArea = mean;
      }
      var std = Number(stats.stdArea);
      if (!Number.isFinite(std) || std < 0) {
        var v = 0;
        areas.forEach(function (a) {
          var d = a - mean;
          v += d * d;
        });
        std = Math.sqrt(v / areas.length);
        stats.stdArea = std;
      }
      if (stats.minArea == null) stats.minArea = minA;
      if (stats.maxArea == null) stats.maxArea = maxA;
      if (stats.cvPct == null && mean > 0) stats.cvPct = (std / mean) * 100;
      if (stats.maxVsMeanPct == null && mean > 0) {
        stats.maxVsMeanPct = ((maxA - mean) / mean) * 100;
      }
      if (stats.minVsMeanPct == null && mean > 0) {
        stats.minVsMeanPct = ((minA - mean) / mean) * 100;
      }
      if (stats.maxMinRatio == null && minA > 0) stats.maxMinRatio = maxA / minA;
    }
    if (stats.coverPct != null && stats.barePct == null) {
      stats.barePct = Math.max(0, 100 - Number(stats.coverPct));
    }
    if (stats.count == null) stats.count = trees.length;

    var gsd = Number(stats.gsdM);
    var hasScale =
      stats.hasScale === true || (Number.isFinite(gsd) && gsd > 0);
    if (stats.hasScale == null) stats.hasScale = hasScale;
    if (hasScale && Number.isFinite(gsd) && gsd > 0) {
      if (stats.gsdCm == null) stats.gsdCm = gsd * 100;
      var totalPx = Number(stats.totalPixels);
      if (!Number.isFinite(totalPx) || totalPx <= 0) {
        var w = Number(stats.width);
        var h = Number(stats.height);
        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
          totalPx = w * h;
          stats.totalPixels = totalPx;
        }
      }
      var retained = Number(stats.vegPixels);
      if (!Number.isFinite(retained) || retained < 0) {
        retained = 0;
        trees.forEach(function (t) {
          retained += Number(t.areaPx) || 0;
        });
        stats.vegPixels = retained;
      }
      if (stats.orthoAreaM2 == null && totalPx > 0) {
        stats.orthoAreaM2 = totalPx * gsd * gsd;
      }
      if (stats.orthoAreaHa == null && stats.orthoAreaM2 != null) {
        stats.orthoAreaHa = stats.orthoAreaM2 / 10000;
      }
      if (stats.canopyAreaM2 == null) {
        stats.canopyAreaM2 = retained * gsd * gsd;
      }
      if (stats.bareAreaM2 == null && stats.orthoAreaM2 != null) {
        stats.bareAreaM2 = Math.max(0, stats.orthoAreaM2 - stats.canopyAreaM2);
      }
      if (
        stats.treesPerHa == null &&
        stats.orthoAreaHa != null &&
        stats.orthoAreaHa > 0 &&
        stats.count
      ) {
        stats.treesPerHa = stats.count / stats.orthoAreaHa;
      }
      if (stats.meanAreaM2 == null && stats.meanArea != null) {
        stats.meanAreaM2 = Number(stats.meanArea) * gsd * gsd;
      }
      if (stats.minAreaM2 == null && stats.minArea != null) {
        stats.minAreaM2 = Number(stats.minArea) * gsd * gsd;
      }
      if (stats.maxAreaM2 == null && stats.maxArea != null) {
        stats.maxAreaM2 = Number(stats.maxArea) * gsd * gsd;
      }
    }
    return stats;
  }

  function fmtHa(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return Number(v).toFixed(2) + ' ha';
  }

  function fmtM2(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    var n = Number(v);
    if (n >= 1000) {
      return n.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' m²';
    }
    return n.toFixed(1) + ' m²';
  }

  function syncScaleBadge(hasScale, gsdCm) {
    var badge = document.getElementById('aciScaleBadge');
    if (!badge) return;
    badge.hidden = false;
    if (hasScale) {
      badge.className = 'aci-scale-badge aci-scale-badge--ok';
      badge.textContent =
        'Escala OK' +
        (gsdCm != null && Number.isFinite(Number(gsdCm))
          ? ' · GSD ' + Number(gsdCm).toFixed(1) + ' cm/px'
          : '');
      badge.title = 'GeoTIFF georreferenciado: ha, m² y densidad son fiables';
    } else {
      badge.className = 'aci-scale-badge aci-scale-badge--warn';
      badge.textContent = 'Solo píxeles';
      badge.title =
        'Sube un GeoTIFF georreferenciado (WebODM) para ha, m² y árboles/ha';
    }
  }

  function areaLabel(px, m2) {
    if (m2 != null && Number.isFinite(Number(m2))) {
      return Number(m2).toFixed(2) + ' m²';
    }
    if (px == null || !Number.isFinite(Number(px))) return '—';
    return Math.round(Number(px)).toLocaleString('es-MX') + ' px';
  }

  function renderAnalysisSummary(result) {
    var panel = document.getElementById('aciSummaryPanel');
    var list = document.getElementById('aciSummaryList');
    if (!panel || !list) return;
    if (!result || !result.trees || !result.trees.length) {
      list.innerHTML = '';
      var brEmpty = document.getElementById('aciSemBreakdown');
      if (brEmpty) brEmpty.innerHTML = '';
      var semBodyEmpty = document.getElementById('aciSemStatsBody');
      if (semBodyEmpty) semBodyEmpty.innerHTML = '';
      var badgeHide = document.getElementById('aciScaleBadge');
      if (badgeHide) badgeHide.hidden = true;
      panel.hidden = true;
      return;
    }
    var s = enrichStatsFromTrees(result.stats || {}, result.trees);
    var cover = s.coverPct != null ? Number(s.coverPct) : null;
    var bare =
      s.barePct != null
        ? Number(s.barePct)
        : cover != null
          ? Math.max(0, 100 - cover)
          : null;
    var hasScale = !!s.hasScale;
    syncScaleBadge(hasScale, s.gsdCm);

    var coverValue =
      cover != null
        ? cover.toFixed(1) +
          '%' +
          (hasScale && s.canopyAreaM2 != null ? ' · ' + fmtM2(s.canopyAreaM2) : '')
        : '—';
    var bareValue =
      bare != null
        ? bare.toFixed(1) +
          '%' +
          (hasScale && s.bareAreaM2 != null ? ' · ' + fmtM2(s.bareAreaM2) : '')
        : '—';

    var rows = [
      {
        label: 'Árboles / copas detectadas',
        value: String(s.count != null ? s.count : result.trees.length),
        note: 'Total de copas usadas en el análisis del predio',
        cls: 'aci-sum--accent'
      },
      {
        label: 'Superficie analizada',
        value: hasScale ? fmtHa(s.orthoAreaHa) : '—',
        note: hasScale
          ? 'Área del ortomosaico (ancho × alto × GSD²)'
          : 'Requiere GeoTIFF georreferenciado (WebODM)',
        cls: hasScale ? 'aci-sum--accent' : 'aci-sum--warn'
      },
      {
        label: 'Cobertura total de copas',
        value: coverValue,
        note: hasScale
          ? '% del orto + m² de copa'
          : 'Suma de copas ÷ área total del ortomosaico (solo %)',
        cls: 'aci-sum--accent'
      },
      {
        label: 'Superficie sin cobertura',
        value: bareValue,
        note: '100% − cobertura total (suelo / huecos / calles)',
        cls: 'aci-sum--warn'
      },
      {
        label: 'Densidad',
        value:
          hasScale && s.treesPerHa != null
            ? Math.round(Number(s.treesPerHa)).toLocaleString('es-MX') + ' árboles/ha'
            : '—',
        note: hasScale
          ? 'Copas detectadas ÷ hectáreas del orto'
          : 'Solo con escala geo'
      },
      {
        label: 'GSD',
        value:
          hasScale && s.gsdCm != null
            ? Number(s.gsdCm).toFixed(1) + ' cm/px'
            : 'sin georreferencia usable',
        note: hasScale
          ? 'Tamaño de un píxel en el terreno'
          : 'Sube TIFF geo para ha, m² y densidad'
      },
      {
        label: 'Confianza media detección',
        value:
          s.meanConfidence != null && Number.isFinite(Number(s.meanConfidence))
            ? Math.round(Number(s.meanConfidence)) + '%'
            : '—',
        note: 'Promedio 0–100 (forma, ExG, tamaño, borde)',
        cls: 'aci-sum--accent'
      },
      {
        label: 'Candidatos excluidos',
        value:
          s.excludedTotal != null
            ? String(s.excludedTotal) +
              (s.candidatesRaw != null ? ' / ' + s.candidatesRaw + ' raw' : '')
            : '—',
        note: [
          s.excludedShape ? 'forma ' + s.excludedShape : null,
          s.excludedGiant ? 'gigantes ' + s.excludedGiant : null,
          s.excludedOutlier ? 'outliers ' + s.excludedOutlier : null,
          s.excludedLowConf ? 'baja conf. ' + s.excludedLowConf : null
        ]
          .filter(Boolean)
          .join(' · ') || 'Pasto/borde/outliers filtrados',
        cls: s.excludedTotal ? 'aci-sum--warn' : ''
      },
      {
        label: 'Área promedio de copa',
        value: areaLabel(s.meanArea, s.meanAreaM2),
        note: 'Promedio del tamaño de copa en el lote'
      },
      {
        label: 'Copa máxima',
        value: areaLabel(s.maxArea, s.maxAreaM2),
        note:
          s.maxVsMeanPct != null && Number.isFinite(Number(s.maxVsMeanPct))
            ? (Number(s.maxVsMeanPct) >= 0 ? '+' : '') +
              Number(s.maxVsMeanPct).toFixed(1) +
              '% vs promedio'
            : 'La más grande del predio'
      },
      {
        label: 'Copa mínima',
        value: areaLabel(s.minArea, s.minAreaM2),
        note:
          s.minVsMeanPct != null && Number.isFinite(Number(s.minVsMeanPct))
            ? (Number(s.minVsMeanPct) >= 0 ? '+' : '') +
              Number(s.minVsMeanPct).toFixed(1) +
              '% vs promedio'
            : 'La más chica del predio'
      },
      {
        label: 'Desviación estándar',
        value:
          s.stdArea != null && Number.isFinite(Number(s.stdArea))
            ? hasScale && s.gsdM
              ? fmtM2(Number(s.stdArea) * s.gsdM * s.gsdM) +
                ' · ' +
                Math.round(Number(s.stdArea)).toLocaleString('es-MX') +
                ' px'
              : Math.round(Number(s.stdArea)).toLocaleString('es-MX') + ' px'
            : '—',
        note: 'Dispersión de tamaños alrededor del promedio'
      },
      {
        label: 'Coeficiente de variación',
        value:
          s.cvPct != null && Number.isFinite(Number(s.cvPct))
            ? Number(s.cvPct).toFixed(1) + '%'
            : '—',
        note: 'Qué tan pareja está la huerta (más bajo = más uniforme)'
      },
      {
        label: 'Copa mayor ÷ copa menor',
        value:
          s.maxMinRatio != null && Number.isFinite(Number(s.maxMinRatio))
            ? Number(s.maxMinRatio).toFixed(1) + '×'
            : '—',
        note: 'Cuántas veces cabe la mínima en la máxima'
      }
    ];

    var match = s.match || (result.stats && result.stats.match);
    if (match && match.hasHistory) {
      rows.push({
        label: 'Match vs vuelo anterior',
        value:
          match.matched +
          ' emparejados · ' +
          match.neu +
          ' nuevos · ' +
          match.missing +
          ' faltantes',
        note: match.useGeo
          ? 'ID estable por proximidad GPS'
          : 'ID estable por proximidad en coords de imagen',
        cls: 'aci-sum--accent'
      });
      if (match.meanDeltaPct != null) {
        rows.push({
          label: 'Δ área media vs anterior',
          value:
            (match.meanDeltaPct >= 0 ? '+' : '') +
            match.meanDeltaPct.toFixed(1) +
            '%',
          note:
            'Creció ' +
            (match.grown || 0) +
            ' · redujo ' +
            (match.shrunk || 0) +
            ' · estable ' +
            (match.flat || 0),
          cls: match.meanDeltaPct < -5 ? 'aci-sum--warn' : 'aci-sum--accent'
        });
      }
    }

    if (s.hasPhenology) {
      var pmeta =
        window.AirCICanopy && AirCICanopy.PHENO_META
          ? AirCICanopy.PHENO_META
          : {};
      var dlab =
        s.dominantOrchard && pmeta[s.dominantOrchard]
          ? pmeta[s.dominantOrchard].label
          : s.dominantOrchard || '—';
      rows.push({
        label: 'Fenología dominante (lote)',
        value: dlab,
        note:
          'Media flor ' +
          (s.meanFlorPct != null ? s.meanFlorPct.toFixed(1) : '—') +
          '% · brote ' +
          (s.meanBrotePct != null ? s.meanBrotePct.toFixed(1) : '—') +
          '% · veg ' +
          (s.meanVegPct != null ? s.meanVegPct.toFixed(1) : '—') +
          '%',
        cls: 'aci-sum--accent'
      });
      rows.push({
        label: 'Coloración atípica (media)',
        value:
          s.meanAtypicalPct != null ? s.meanAtypicalPct.toFixed(1) + '%' : '—',
        note: 'Métrica paralela — no implica deficiencia ni enfermedad',
        cls: 'aci-sum--warn'
      });
    }

    if (s.hasColorScore) {
      rows.push({
        label: 'AirCI Color Score (GLI)',
        value:
          'P10 ' +
          (s.gliP10 != null ? Number(s.gliP10).toFixed(2) : '—') +
          ' · P50 ' +
          (s.gliP50 != null ? Number(s.gliP50).toFixed(2) : '—') +
          ' · P90 ' +
          (s.gliP90 != null ? Number(s.gliP90).toFixed(2) : '—'),
        note:
          'Verdor 0–100 vs predio (no es salud). 0–20 bronce · 41–60 promedio · 81–100 intenso',
        cls: 'aci-sum--accent'
      });
    }

    if (s.rowCount) {
      rows.splice(1, 0, {
        label: 'Surcos detectados',
        value: String(s.rowCount),
        note: 'Filas de plantación estimadas en el orto'
      });
    }
    list.innerHTML = rows
      .map(function (r) {
        return (
          '<tr' +
          (r.cls ? ' class="' + r.cls + '"' : '') +
          '><td>' +
          r.label +
          '</td><td><strong>' +
          r.value +
          '</strong></td><td>' +
          (r.note || '') +
          '</td></tr>'
        );
      })
      .join('');
    renderSemBreakdown(result.trees);
    renderHistoryPanel(result);
    renderPhenoPanel(result);
    panel.hidden = false;

    var treeDetail = document.getElementById('aciTreeDetail');
    if (treeDetail) {
      // Huertas grandes: el detalle por árbol queda cerrado; el foco es el predio
      if (result.trees.length > 250) treeDetail.open = false;
      else if (result.trees.length <= 80) treeDetail.open = true;
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
    activeDeltaFilter = 'all';
    paintMode = 'sem';
    phenoPaintKey = 'dom';
    activePhenoFilter = 'all';
    var histPanel = document.getElementById('aciHistoryPanel');
    if (histPanel) histPanel.hidden = true;
    var phenoPanel = document.getElementById('aciPhenoPanel');
    if (phenoPanel) phenoPanel.hidden = true;
    var deltaLeg = document.getElementById('aciDeltaLegend');
    if (deltaLeg) deltaLeg.hidden = true;
    var phenoLeg = document.getElementById('aciPhenoLegend');
    if (phenoLeg) phenoLeg.hidden = true;
    var colorLeg = document.getElementById('aciColorLegend');
    if (colorLeg) colorLeg.hidden = true;
    var legend = document.getElementById('aciLegend');
    var tablePanel = document.getElementById('aciTablePanel');
    var summaryPanel = document.getElementById('aciSummaryPanel');
    if (legend) legend.hidden = true;
    if (tablePanel) tablePanel.hidden = true;
    if (summaryPanel) summaryPanel.hidden = true;
    var summaryList = document.getElementById('aciSummaryList');
    if (summaryList) summaryList.innerHTML = '';
    var semBreak = document.getElementById('aciSemBreakdown');
    if (semBreak) semBreak.innerHTML = '';
    var semStats = document.getElementById('aciSemStatsBody');
    if (semStats) semStats.innerHTML = '';
    var bareEl = document.getElementById('aciMetricBare');
    if (bareEl) bareEl.textContent = '—';
    document.querySelectorAll(
      '#aciLayerBar [data-layer="copas"], #aciLayerBar [data-layer="semaforo"], #aciLayerBar [data-layer="numeros"], #aciLayerBar [data-paint-mode]'
    ).forEach(function (btn) {
      btn.disabled = true;
      btn.classList.remove('is-active');
    });
    var orthoBtn = document.querySelector('#aciLayerBar [data-layer="ortho"]');
    if (orthoBtn) orthoBtn.classList.add('is-active');
    layerOn = { ortho: true, copas: false, semaforo: false, numeros: false };
    activeLayer = 'ortho';
    paintMode = 'sem';
    syncPaintModeUi();
  }

  function syncLayerChips() {
    document.querySelectorAll('#aciLayerBar [data-layer]').forEach(function (btn) {
      var key = btn.getAttribute('data-layer');
      btn.classList.toggle('is-active', !!layerOn[key]);
    });
  }

  function applyLayerVisibility() {
    // Ortomosaico: si está off, se oculta; si on, opaco encima del fondo
    if (rasterLayer && map) {
      if (layerOn.ortho) {
        if (!map.hasLayer(rasterLayer)) rasterLayer.addTo(map);
        if (rasterLayer.setOpacity) rasterLayer.setOpacity(1);
      } else if (map.hasLayer(rasterLayer)) {
        map.removeLayer(rasterLayer);
      }
    }
    if (canopyOutlineLayer && map) {
      if (layerOn.copas) {
        if (!map.hasLayer(canopyOutlineLayer)) canopyOutlineLayer.addTo(map);
      } else if (map.hasLayer(canopyOutlineLayer)) {
        map.removeLayer(canopyOutlineLayer);
      }
    }
    if (canopyFillLayer && map) {
      if (layerOn.semaforo) {
        if (!map.hasLayer(canopyFillLayer)) canopyFillLayer.addTo(map);
      } else if (map.hasLayer(canopyFillLayer)) {
        map.removeLayer(canopyFillLayer);
      }
    }
    // Números solo si su capa está seleccionada
    if (canopyLabelLayer && map) {
      if (layerOn.numeros) {
        if (!map.hasLayer(canopyLabelLayer)) canopyLabelLayer.addTo(map);
        Object.keys(treeLayersById).forEach(function (id) {
          var entry = treeLayersById[id];
          if (!entry || !entry.labelEl) return;
          entry.labelEl.classList.add('aci-tree-label--strong');
          entry.labelEl.classList.remove('aci-tree-label--soft');
        });
      } else if (map.hasLayer(canopyLabelLayer)) {
        map.removeLayer(canopyLabelLayer);
      }
    }
    bringOverlaysFront();
    var legend = document.getElementById('aciLegend');
    if (legend) legend.hidden = paintMode !== 'sem' || !layerOn.semaforo;
    var deltaLeg = document.getElementById('aciDeltaLegend');
    if (deltaLeg) deltaLeg.hidden = paintMode !== 'delta' || !layerOn.semaforo;
    var phenoLeg = document.getElementById('aciPhenoLegend');
    if (phenoLeg) phenoLeg.hidden = paintMode !== 'pheno' || !layerOn.semaforo;
    var colorLeg = document.getElementById('aciColorLegend');
    if (colorLeg) colorLeg.hidden = paintMode !== 'color' || !layerOn.semaforo;
    syncLayerChips();
  }

  /** Multi-selección: enciende/apaga una capa. Orto no se apaga si es la única activa. */
  function toggleLayer(mode) {
    mode = mode || 'ortho';
    if (!Object.prototype.hasOwnProperty.call(layerOn, mode)) return;
    var next = !layerOn[mode];
    if (!next && mode === 'ortho') {
      var otherOn = layerOn.copas || layerOn.semaforo || layerOn.numeros;
      if (!otherOn) {
        // dejar al menos el orto visible
        next = true;
      }
    }
    layerOn[mode] = next;
    activeLayer = mode;
    applyLayerVisibility();
  }

  /** Enciende capas concretas (sin apagar las demás) — útil tras detectar/restaurar */
  function enableLayers(keys) {
    (keys || []).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(layerOn, k)) layerOn[k] = true;
    });
    if (keys && keys.length) activeLayer = keys[keys.length - 1];
    applyLayerVisibility();
  }

  function setLayerMode(mode) {
    // Compat: activar esa capa (multi), no exclusividad
    toggleLayer(mode);
  }

  function fmtNum(v, digits) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return Number(v).toLocaleString('es-MX', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  /** % cobertura de una copa vs área total del orto (puede ser muy chico). */
  function fmtCoverPct(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    var n = Number(v);
    if (n >= 1) return n.toFixed(2) + '%';
    if (n >= 0.01) return n.toFixed(3) + '%';
    return n.toFixed(4) + '%';
  }

  function treeCoverPct(t) {
    if (!t) return null;
    if (t.coverPct != null && Number.isFinite(Number(t.coverPct))) return Number(t.coverPct);
    var stats = canopyResult && canopyResult.stats;
    var totalPx =
      stats && stats.width && stats.height ? Number(stats.width) * Number(stats.height) : 0;
    if (totalPx > 0 && t.areaPx != null) return (Number(t.areaPx) / totalPx) * 100;
    return null;
  }

  function getAllTrees() {
    return canopyResult && Array.isArray(canopyResult.trees) ? canopyResult.trees : [];
  }

  function treeActiveSem(t) {
    return t && t.sem ? t.sem : null;
  }

  function treesMatchingSem(key) {
    var all = getAllTrees();
    if (!key || key === 'all') return filterByPheno(filterByDelta(all));
    return filterByPheno(
      filterByDelta(
        all.filter(function (t) {
          var sem = treeActiveSem(t);
          return sem && sem.key === key;
        })
      )
    );
  }

  function treeDeltaKey(t) {
    if (!t) return 'new';
    if (t.matchStatus === 'new' || t.deltaAreaPct == null) return 'new';
    var p = Number(t.deltaAreaPct);
    if (p > 5) return 'up';
    if (p < -5) return 'down';
    return 'flat';
  }

  function filterByDelta(trees) {
    if (!activeDeltaFilter || activeDeltaFilter === 'all') return trees;
    return trees.filter(function (t) {
      return treeDeltaKey(t) === activeDeltaFilter;
    });
  }

  function treePaintSem(t) {
    if (!t) return null;
    if (paintMode === 'delta' && t.semDelta) return t.semDelta;
    if (paintMode === 'color' && t.semColor) return t.semColor;
    if (paintMode === 'pheno') {
      if (phenoPaintKey === 'dom' && t.semPheno) return t.semPheno;
      if (
        window.AirCICanopy &&
        AirCICanopy.phenoSemForPct &&
        phenoPaintKey !== 'dom'
      ) {
        var pct =
          phenoPaintKey === 'flor'
            ? t.florPct
            : phenoPaintKey === 'brote'
              ? t.brotePct
              : phenoPaintKey === 'veg'
                ? t.vegPct
                : t.atypicalPct;
        if (phenoPaintKey === 'atyp') {
          return AirCICanopy.phenoSemForPct(pct, 'other');
        }
        return AirCICanopy.phenoSemForPct(pct, phenoPaintKey);
      }
      if (t.semPheno) return t.semPheno;
    }
    return treeActiveSem(t);
  }

  function treePhenoKey(t) {
    return (t && t.phenoDominant) || 'other';
  }

  function filterByPheno(trees) {
    if (!activePhenoFilter || activePhenoFilter === 'all') return trees;
    return trees.filter(function (t) {
      return treePhenoKey(t) === activePhenoFilter;
    });
  }

  function syncSemLegend() {
    var counts = { rojo: 0, amarillo: 0, verde: 0, azul: 0 };
    getAllTrees().forEach(function (t) {
      var sem = treeActiveSem(t);
      var k = sem && sem.key;
      if (k && counts[k] != null) counts[k]++;
    });
    Object.keys(counts).forEach(function (k) {
      document.querySelectorAll('[data-sem-count="' + k + '"]').forEach(function (el) {
        el.textContent = counts[k] ? '(' + counts[k] + ')' : '(0)';
      });
    });
    document.querySelectorAll('[data-sem]').forEach(function (btn) {
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

  function buildSemBreakdown(trees) {
    var meta = {
      rojo: { label: 'Muy bajo', hint: 'Z < −1.5' },
      amarillo: { label: 'Por debajo', hint: '−1.5 ≤ Z < −0.5' },
      verde: { label: 'Promedio', hint: '−0.5 ≤ Z ≤ +0.5' },
      azul: { label: 'Por encima', hint: 'Z > +0.5' }
    };
    var keys = ['rojo', 'amarillo', 'verde', 'azul'];
    var stats =
      canopyResult && canopyResult.stats
        ? enrichStatsFromTrees(canopyResult.stats, trees)
        : {};
    var gsd = Number(stats.gsdM);
    var hasScale = !!stats.hasScale && Number.isFinite(gsd) && gsd > 0;
    var out = {};
    keys.forEach(function (k) {
      out[k] = {
        key: k,
        label: meta[k].label,
        hint: meta[k].hint,
        count: 0,
        areaPx: 0,
        areaM2: 0,
        coverPct: 0,
        meanArea: 0,
        meanAreaM2: null,
        pctTrees: 0,
        hasScale: hasScale
      };
    });
    var n = trees.length || 0;
    trees.forEach(function (t) {
      var sem = treeActiveSem(t);
      var k = sem && sem.key;
      if (!k || !out[k]) return;
      out[k].count += 1;
      var px = Number(t.areaPx) || 0;
      out[k].areaPx += px;
      if (t.areaM2 != null && Number.isFinite(Number(t.areaM2))) {
        out[k].areaM2 += Number(t.areaM2);
      } else if (hasScale) {
        out[k].areaM2 += px * gsd * gsd;
      }
      var c = treeCoverPct(t);
      if (c != null) out[k].coverPct += c;
    });
    keys.forEach(function (k) {
      var row = out[k];
      row.pctTrees = n > 0 ? (row.count / n) * 100 : 0;
      row.meanArea = row.count > 0 ? row.areaPx / row.count : 0;
      row.meanAreaM2 = hasScale && row.count > 0 ? row.areaM2 / row.count : null;
      if (!hasScale) row.areaM2 = null;
    });
    return out;
  }

  function renderSemBreakdown(trees) {
    var wrap = document.getElementById('aciSemBreakdown');
    var semBody = document.getElementById('aciSemStatsBody');
    var m2Head = document.getElementById('aciSemM2Head');
    if (!wrap && !semBody) return;
    if (!trees || !trees.length) {
      if (wrap) wrap.innerHTML = '';
      if (semBody) semBody.innerHTML = '';
      return;
    }
    var br = buildSemBreakdown(trees);
    var keys = ['rojo', 'amarillo', 'verde', 'azul'];
    var hasScale = !!(br.rojo && br.rojo.hasScale);
    if (m2Head) m2Head.hidden = !hasScale;
    if (semBody) {
      semBody.innerHTML = keys
        .map(function (k) {
          var r = br[k];
          var meanCell = r.count
            ? r.meanAreaM2 != null
              ? Number(r.meanAreaM2).toFixed(2) + ' m²'
              : Math.round(r.meanArea).toLocaleString('es-MX') + ' px'
            : '—';
          var m2Cell = hasScale
            ? '<td>' + (r.count && r.areaM2 != null ? fmtM2(r.areaM2) : '—') + '</td>'
            : '';
          return (
            '<tr class="aci-sem-row aci-sem-row--' +
            k +
            (activeSemFilter === k ? ' is-active' : '') +
            '" data-sem="' +
            k +
            '"' +
            (r.count ? '' : ' data-empty="1"') +
            ' title="Filtrar: ' +
            r.label +
            '">' +
            '<td><strong>' +
            r.label +
            '</strong><div class="aci-sem-row-hint">' +
            r.hint +
            '</div></td>' +
            '<td>' +
            r.count +
            '</td>' +
            '<td>' +
            (r.count ? r.pctTrees.toFixed(1) + '%' : '—') +
            '</td>' +
            '<td>' +
            (r.count ? r.coverPct.toFixed(2) + '%' : '—') +
            '</td>' +
            m2Cell +
            '<td>' +
            meanCell +
            '</td>' +
            '</tr>'
          );
        })
        .join('');
    }
    if (wrap) {
      wrap.innerHTML = keys
        .map(function (k) {
          var r = br[k];
          var metaLine = r.count
            ? r.pctTrees.toFixed(0) +
              '% del predio · cob. ' +
              r.coverPct.toFixed(2) +
              '%' +
              (r.areaM2 != null ? ' · ' + fmtM2(r.areaM2) : '')
            : r.hint + ' · sin copas';
          return (
            '<button type="button" class="aci-sem-card aci-sem-card--' +
            k +
            (activeSemFilter === k ? ' is-active' : '') +
            '" data-sem="' +
            k +
            '"' +
            (r.count ? '' : ' disabled') +
            ' title="Filtrar tabla y mapa: ' +
            r.label +
            '">' +
            '<div class="aci-sem-card-top">' +
            '<span class="aci-sem-card-name">' +
            r.label +
            '</span>' +
            '<span class="aci-sem-card-count">' +
            r.count +
            '</span>' +
            '</div>' +
            '<div class="aci-sem-card-meta">' +
            metaLine +
            '</div>' +
            '</button>'
          );
        })
        .join('');
    }
  }

  function applySemFilterStyles() {
    Object.keys(treeLayersById).forEach(function (id) {
      var entry = treeLayersById[id];
      if (!entry || !entry.tree) return;
      var sem = treePaintSem(entry.tree) || entry.tree.sem || {
        key: 'verde',
        color: '#16a34a',
        fill: '#22c55e99'
      };
      var semMatch =
        activeSemFilter === 'all' ||
        (treeActiveSem(entry.tree) && treeActiveSem(entry.tree).key === activeSemFilter);
      var deltaMatch =
        activeDeltaFilter === 'all' || treeDeltaKey(entry.tree) === activeDeltaFilter;
      var phenoMatch =
        activePhenoFilter === 'all' || treePhenoKey(entry.tree) === activePhenoFilter;
      var match = semMatch && deltaMatch && phenoMatch;
      if (entry.fill && entry.fill.setStyle) {
        entry.fill.setStyle({
          color: sem.color,
          fillColor: sem.fill,
          weight: match
            ? activeSemFilter === 'all' &&
              activeDeltaFilter === 'all' &&
              activePhenoFilter === 'all'
              ? 1.5
              : 2.5
            : 1,
          fillOpacity: match
            ? activeSemFilter === 'all' &&
              activeDeltaFilter === 'all' &&
              activePhenoFilter === 'all'
              ? 0.72
              : 0.88
            : 0.08,
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
      if (entry.labelEl && sem && sem.color) {
        entry.labelEl.style.background = sem.color;
        entry.labelEl.className =
          'aci-tree-label aci-tree-label--strong aci-tree-label--' +
          (sem.key || 'verde');
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
    renderSemBreakdown(getAllTrees());
    var filtered = treesMatchingSem(activeSemFilter);
    renderCanopyTable(filtered);
    syncDeltaFilterUi();
    if (activeSemFilter !== 'all' || activeDeltaFilter !== 'all') {
      enableLayers(['semaforo']);
      fitSemFilterBounds(filtered);
      var treeDetail = document.getElementById('aciTreeDetail');
      if (treeDetail) treeDetail.open = true;
      var parts = [];
      if (activeSemFilter !== 'all') parts.push('sem «' + activeSemFilter + '»');
      if (activeDeltaFilter !== 'all') parts.push('Δ «' + activeDeltaFilter + '»');
      setMapStatus(
        filtered.length
          ? filtered.length + ' copas · filtro ' + parts.join(' · ')
          : 'Sin copas en ese filtro',
        filtered.length ? 'ok' : 'error'
      );
    } else if (canopyResult) {
      setMapStatus(getAllTrees().length + ' copas · mostrando todas', 'ok');
    }
  }

  function setDeltaFilter(key) {
    if (!key) key = 'all';
    if (key !== 'all' && key === activeDeltaFilter) key = 'all';
    activeDeltaFilter = key;
    syncDeltaFilterUi();
    applySemFilterStyles();
    var filtered = treesMatchingSem(activeSemFilter);
    renderCanopyTable(filtered);
    if (activeDeltaFilter !== 'all') {
      enableLayers(['semaforo']);
      if (paintMode !== 'delta') {
        setPaintMode('delta');
      }
      fitSemFilterBounds(filtered);
      var treeDetail = document.getElementById('aciTreeDetail');
      if (treeDetail) treeDetail.open = true;
    }
    setMapStatus(
      filtered.length
        ? filtered.length + ' copas' + (activeDeltaFilter !== 'all' ? ' · Δ ' + activeDeltaFilter : '')
        : 'Sin copas en ese filtro Δ',
      filtered.length ? 'ok' : 'error'
    );
  }

  function setPaintMode(mode, phenoKey) {
    if (mode !== 'delta' && mode !== 'pheno' && mode !== 'color') mode = 'sem';
    paintMode = mode;
    if (phenoKey) phenoPaintKey = phenoKey;
    syncPaintModeUi();
    if (paintMode !== 'sem') enableLayers(['semaforo']);
    applySemFilterStyles();
    if (paintMode === 'color') {
      setMapStatus(
        'Capa Color Score (GLI 0–100 vs predio) · no interpreta salud',
        'ok'
      );
    }
  }

  function setPaintByDelta(on) {
    setPaintMode(on ? 'delta' : 'sem');
  }

  function syncPaintModeUi() {
    document.querySelectorAll('[data-paint-mode]').forEach(function (btn) {
      var m = btn.getAttribute('data-paint-mode');
      var pk = btn.getAttribute('data-pheno-key');
      var active =
        m === paintMode &&
        (m !== 'pheno' || !pk || pk === phenoPaintKey);
      btn.classList.toggle('is-active', active);
    });
    // legacy delta buttons
    document.querySelectorAll('[data-paint-delta]').forEach(function (btn) {
      var v = btn.getAttribute('data-paint-delta');
      btn.classList.toggle('is-active', (v === '1') === (paintMode === 'delta'));
    });
    var legend = document.getElementById('aciLegend');
    var deltaLeg = document.getElementById('aciDeltaLegend');
    var phenoLeg = document.getElementById('aciPhenoLegend');
    var colorLeg = document.getElementById('aciColorLegend');
    if (legend) legend.hidden = paintMode !== 'sem' || !layerOn.semaforo;
    if (deltaLeg) deltaLeg.hidden = paintMode !== 'delta' || !layerOn.semaforo;
    if (phenoLeg) phenoLeg.hidden = paintMode !== 'pheno' || !layerOn.semaforo;
    if (colorLeg) colorLeg.hidden = paintMode !== 'color' || !layerOn.semaforo;
  }

  function syncPaintDeltaUi() {
    syncPaintModeUi();
  }

  function setPhenoFilter(key) {
    if (!key) key = 'all';
    if (key !== 'all' && key === activePhenoFilter) key = 'all';
    activePhenoFilter = key;
    syncPhenoFilterUi();
    applySemFilterStyles();
    var filtered = treesMatchingSem(activeSemFilter);
    renderCanopyTable(filtered);
    if (activePhenoFilter !== 'all') {
      enableLayers(['semaforo']);
      if (paintMode !== 'pheno') setPaintMode('pheno', 'dom');
      fitSemFilterBounds(filtered);
      var treeDetail = document.getElementById('aciTreeDetail');
      if (treeDetail) treeDetail.open = true;
    }
    setMapStatus(
      filtered.length
        ? filtered.length +
            ' copas' +
            (activePhenoFilter !== 'all' ? ' · feno «' + activePhenoFilter + '»' : '')
        : 'Sin copas en ese filtro fenológico',
      filtered.length ? 'ok' : 'error'
    );
  }

  function syncPhenoFilterUi() {
    var has =
      canopyResult &&
      canopyResult.stats &&
      canopyResult.stats.hasPhenology;
    var counts = { flor: 0, brote: 0, veg: 0, other: 0 };
    getAllTrees().forEach(function (t) {
      var k = treePhenoKey(t);
      if (counts[k] != null) counts[k]++;
    });
    document.querySelectorAll('[data-pheno]').forEach(function (btn) {
      var k = btn.getAttribute('data-pheno');
      btn.classList.toggle('is-active', k === activePhenoFilter);
      if (k !== 'all') {
        var n = counts[k] || 0;
        btn.disabled = !has || !n;
        var em = btn.querySelector('em');
        if (em) em.textContent = n ? '(' + n + ')' : '(0)';
      } else {
        btn.disabled = !has;
      }
    });
  }

  function renderPhenoPanel(result) {
    var panel = document.getElementById('aciPhenoPanel');
    if (!panel) return;
    var s = result && result.stats;
    if (!s || !s.hasPhenology) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    function setTxt(id, v) {
      var el = document.getElementById(id);
      if (el) el.textContent = v;
    }
    var meta =
      window.AirCICanopy && AirCICanopy.PHENO_META
        ? AirCICanopy.PHENO_META
        : {};
    var dom = s.dominantOrchard;
    setTxt(
      'aciPhenoDom',
      dom && meta[dom] ? meta[dom].label : dom || '—'
    );
    setTxt(
      'aciPhenoFlor',
      s.meanFlorPct != null ? s.meanFlorPct.toFixed(1) + '%' : '—'
    );
    setTxt(
      'aciPhenoBrote',
      s.meanBrotePct != null ? s.meanBrotePct.toFixed(1) + '%' : '—'
    );
    setTxt(
      'aciPhenoVeg',
      s.meanVegPct != null ? s.meanVegPct.toFixed(1) + '%' : '—'
    );
    setTxt(
      'aciPhenoOther',
      s.meanOtherPct != null ? s.meanOtherPct.toFixed(1) + '%' : '—'
    );
    setTxt(
      'aciPhenoAtyp',
      s.meanAtypicalPct != null ? s.meanAtypicalPct.toFixed(1) + '%' : '—'
    );
    setTxt(
      'aciPhenoConf',
      s.meanPhenoConfidence != null
        ? Math.round(s.meanPhenoConfidence) + '%'
        : '—'
    );
    var dc = s.dominantCounts || {};
    setTxt(
      'aciPhenoNote',
      'Dominantes: flor ' +
        (dc.flor || 0) +
        ' · brote ' +
        (dc.brote || 0) +
        ' · veg ' +
        (dc.veg || 0) +
        ' · otro ' +
        (dc.other || 0) +
        ' · flor+brote+veg+otro = 100% por árbol'
    );
    syncPhenoFilterUi();
    syncPaintModeUi();
  }

  function syncDeltaFilterUi() {
    var m = canopyResult && canopyResult.stats && canopyResult.stats.match;
    var counts = { up: 0, down: 0, flat: 0, new: 0 };
    getAllTrees().forEach(function (t) {
      var k = treeDeltaKey(t);
      if (counts[k] != null) counts[k]++;
    });
    document.querySelectorAll('[data-delta]').forEach(function (btn) {
      var k = btn.getAttribute('data-delta');
      btn.classList.toggle('is-active', k === activeDeltaFilter);
      if (k !== 'all') {
        var n = counts[k] || 0;
        btn.disabled = !m || !m.hasHistory || !n;
        var em = btn.querySelector('em');
        if (em) em.textContent = n ? '(' + n + ')' : '(0)';
      } else {
        btn.disabled = !m || !m.hasHistory;
      }
    });
  }

  function renderHistoryPanel(result) {
    var panel = document.getElementById('aciHistoryPanel');
    if (!panel) return;
    var m = result && result.stats && result.stats.match;
    if (!m || !m.hasHistory) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    var matchedEl = document.getElementById('aciHistMatched');
    var newEl = document.getElementById('aciHistNew');
    var missEl = document.getElementById('aciHistMissing');
    var meanEl = document.getElementById('aciHistMeanDelta');
    var noteEl = document.getElementById('aciHistNote');
    if (matchedEl) matchedEl.textContent = String(m.matched);
    if (newEl) newEl.textContent = String(m.neu);
    if (missEl) missEl.textContent = String(m.missing);
    if (meanEl) {
      meanEl.textContent =
        m.meanDeltaPct != null
          ? (m.meanDeltaPct >= 0 ? '+' : '') + m.meanDeltaPct.toFixed(1) + '%'
          : '—';
    }
    if (noteEl) {
      noteEl.textContent =
        'Match por proximidad del centro' +
        (m.useGeo ? ' (GPS, radio ≤ ' + Number(m.maxDist).toFixed(1) + ' m)' : ' (coords imagen)') +
        ' · crecieron ' +
        (m.grown || 0) +
        ' · redujeron ' +
        (m.shrunk || 0) +
        ' · estables ' +
        (m.flat || 0);
    }
    syncDeltaFilterUi();
    syncPaintDeltaUi();
  }

  var TABLE_ROW_CAP = 400;

  function renderCanopyTable(trees) {
    var tbody = document.getElementById('aciTableBody');
    var panel = document.getElementById('aciTablePanel');
    var sub = document.getElementById('aciTableSub');
    var capNote = document.getElementById('aciTableCapNote');
    if (!tbody || !panel) return;
    tbody.innerHTML = '';
    trees = Array.isArray(trees) ? trees : [];
    var total = trees.length;
    var capped = false;
    var shown = trees;
    // Con miles de filas el navegador se traba: mostrar tope y empujar al filtro / resumen del predio
    if (total > TABLE_ROW_CAP) {
      shown = trees.slice(0, TABLE_ROW_CAP);
      capped = true;
    }
    if (capNote) {
      if (capped) {
        capNote.hidden = false;
        capNote.classList.remove('np-hide');
        capNote.textContent =
          'Mostrando ' +
          shown.length.toLocaleString('es-MX') +
          ' de ' +
          total.toLocaleString('es-MX') +
          ' copas. En huertas grandes usa el resumen del predio y filtra por semáforo (rojo/amarillo/…) para revisar casos.' +
          (activeSemFilter === 'all'
            ? ' Tip: elige un color del semáforo para acotar la lista.'
            : '');
      } else {
        capNote.hidden = true;
        capNote.classList.add('np-hide');
        capNote.textContent = '';
      }
    }
    shown.forEach(function (t) {
      var tr = document.createElement('tr');
      tr.dataset.treeId = String(t.id);
      var pct = t.pctVsMean != null ? Number(t.pctVsMean) : 0;
      var z = t.z != null ? Number(t.z) : 0;
      var perc = t.percentile != null ? Number(t.percentile) : null;
      var cover = treeCoverPct(t);
      var conf =
        t.confidence != null && Number.isFinite(Number(t.confidence))
          ? Math.round(Number(t.confidence))
          : null;
      var sem = t.sem || { key: 'verde', label: '—' };
      var confCls =
        conf == null
          ? ''
          : conf >= 70
            ? 'aci-conf--hi'
            : conf >= 50
              ? 'aci-conf--mid'
              : 'aci-conf--lo';
      tr.innerHTML =
        '<td>' +
        t.id +
        '</td><td>' +
        (t.stableId != null ? t.stableId : '—') +
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
        '</td><td title="% de esta copa sobre el área total del ortomosaico">' +
        fmtCoverPct(cover) +
        '</td><td>' +
        (pct >= 0 ? '+' : '') +
        pct.toFixed(1) +
        '%</td><td>' +
        (perc != null && Number.isFinite(perc) ? Math.round(perc) : '—') +
        '</td><td title="Desvío estándar vs promedio del predio (z-score)">' +
        z.toFixed(2) +
        '</td><td class="' +
        confCls +
        '" title="Confianza de detección">' +
        (conf != null ? conf : '—') +
        '</td><td><span class="aci-badge-sem ' +
        sem.key +
        '">' +
        sem.label +
        '</span></td><td title="Cambio de área vs vuelo anterior">' +
        (t.deltaAreaM2 != null
          ? fmtNum(t.deltaAreaM2, 2)
          : t.deltaAreaPx != null
            ? Math.round(t.deltaAreaPx).toLocaleString('es-MX') + ' px'
            : '—') +
        '</td><td title="Δ % área vs vuelo anterior">' +
        (t.deltaAreaPct != null
          ? (t.deltaAreaPct >= 0 ? '+' : '') + Number(t.deltaAreaPct).toFixed(1) + '%'
          : t.matchStatus === 'new'
            ? 'nuevo'
            : '—') +
        '</td><td>' +
        (t.phenoDominant
          ? '<span class="aci-badge-pheno aci-badge-pheno--' +
            t.phenoDominant +
            '">' +
            (t.semPheno && t.semPheno.label
              ? t.semPheno.label
              : t.phenoDominant) +
            '</span>'
          : '—') +
        '</td><td>' +
        fmtNum(t.florPct, 1) +
        '</td><td>' +
        fmtNum(t.brotePct, 1) +
        '</td><td>' +
        fmtNum(t.vegPct, 1) +
        '</td><td>' +
        fmtNum(t.otherPct, 1) +
        '</td><td title="AirCI Color Score (GLI vs predio)">' +
        (t.colorScore != null && Number.isFinite(Number(t.colorScore))
          ? Number(t.colorScore).toFixed(0)
          : '—') +
        '</td><td>' +
        (t.semColor
          ? '<span class="aci-badge-sem" style="border-color:' +
            t.semColor.color +
            ';color:' +
            t.semColor.color +
            '">' +
            t.semColor.label +
            '</span>'
          : '—') +
        '</td><td title="Mediana GLI de la copa">' +
        (t.gliMedian != null && Number.isFinite(Number(t.gliMedian))
          ? Number(t.gliMedian).toFixed(3)
          : '—') +
        '</td><td title="Coloración atípica (paralela; no diagnóstico)">' +
        fmtNum(t.atypicalPct, 1) +
        '</td>';
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
        (capped
          ? shown.length.toLocaleString('es-MX') +
            ' de ' +
            total.toLocaleString('es-MX')
          : String(total)) +
        ' copas' +
        filterNote +
        ' · detalle opcional' +
        (hasScale ? '' : ' · sin escala m²');
    }
  }

  function highlightTree(id) {
    var entry = treeLayersById[id];
    if (!entry || !map) return;
    var layer = null;
    if (layerOn.semaforo && entry.fill) layer = entry.fill;
    else if (layerOn.copas && entry.outline) layer = entry.outline;
    else layer = entry.fill || entry.outline;
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
      var activeSem = treePaintSem(t) || t.sem || {
        key: 'verde',
        label: '—',
        color: '#16a34a',
        fill: '#22c55e99'
      };
      var outline = L.polygon(t.latlngs, {
        color: '#22c55e',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.06
      });
      var fill = L.polygon(t.latlngs, {
        color: activeSem.color,
        weight: 1.5,
        fillColor: activeSem.fill,
        fillOpacity: 0.72
      });
      var center = t.center;
      if (!center || center.length < 2) {
        var b0 = outline.getBounds();
        center = [b0.getCenter().lat, b0.getCenter().lng];
      }
      var labelHtml =
        '<div class="aci-tree-label aci-tree-label--soft aci-tree-label--' +
        (activeSem.key || 'verde') +
        '" style="background:' +
        (activeSem.color || '#0f172a') +
        '" title="ID ' +
        t.id +
        (t.row != null ? ' · Surco ' + t.row + ' · Pos ' + t.pos : '') +
        (activeSem.label ? ' · ' + activeSem.label : '') +
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
          activeSem.label +
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
      Object.keys(treeLayersById).forEach(function (id) {
        var entry = treeLayersById[id];
        if (!entry || !entry.label) return;
        try {
          var root = entry.label.getElement();
          entry.labelEl = root && root.querySelector('.aci-tree-label');
          if (entry.labelEl) {
            entry.labelEl.classList.add('aci-tree-label--strong');
            entry.labelEl.classList.remove('aci-tree-label--soft');
          }
        } catch (e4) {}
      });
      applySemFilterStyles();
      applyLayerVisibility();
    }, 0);

    document
      .querySelectorAll(
        '#aciLayerBar [data-layer="copas"], #aciLayerBar [data-layer="semaforo"], #aciLayerBar [data-layer="numeros"], #aciLayerBar [data-paint-mode]'
      )
      .forEach(function (btn) {
        btn.disabled = false;
      });
    activeSemFilter = 'all';
    activeDeltaFilter = 'all';
    activePhenoFilter = 'all';
    syncSemLegend();
    syncDeltaFilterUi();
    syncPhenoFilterUi();
    applySemFilterStyles();
    renderCanopyTable(result.trees);
    renderAnalysisSummary(result);
    var barePct =
      result.stats.barePct != null
        ? result.stats.barePct
        : result.stats.coverPct != null
          ? Math.max(0, 100 - Number(result.stats.coverPct))
          : null;
    var st = enrichStatsFromTrees(result.stats || {}, result.trees);
    updateMetrics({
      treeCount: st.count,
      coverPct: st.coverPct,
      barePct: barePct,
      meanArea: st.meanArea,
      meanAreaM2: st.meanAreaM2,
      hasScale: st.hasScale,
      orthoAreaHa: st.orthoAreaHa,
      canopyAreaM2: st.canopyAreaM2,
      bareAreaM2: st.bareAreaM2,
      treesPerHa: st.treesPerHa,
      gsdCm: st.gsdCm,
      filename: document.getElementById('aciMetricFile') && document.getElementById('aciMetricFile').textContent
    });
    var rowN = result.stats && result.stats.rowCount ? result.stats.rowCount : null;
    layerOn.ortho = true;
    layerOn.semaforo = true;
    layerOn.numeros = true;
    layerOn.copas = false;
    activeLayer = 'numeros';
    applyLayerVisibility();
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

  function slimTreeForHistory(t) {
    return {
      id: t.id,
      stableId: t.stableId != null ? t.stableId : String(t.id),
      areaPx: t.areaPx,
      areaM2: t.areaM2 != null ? t.areaM2 : null,
      center: t.center,
      row: t.row,
      pos: t.pos
    };
  }

  function slimStatsForHistory(stats) {
    stats = stats || {};
    return {
      count: stats.count,
      coverPct: stats.coverPct,
      meanArea: stats.meanArea,
      meanAreaM2: stats.meanAreaM2,
      hasScale: stats.hasScale,
      gsdM: stats.gsdM,
      gsdCm: stats.gsdCm,
      match: stats.match || null
    };
  }

  function loadCanopyHistory(siteId) {
    try {
      var raw = localStorage.getItem(CANOPY_HISTORY_KEY);
      var mapObj = raw ? JSON.parse(raw) : {};
      var list = mapObj && mapObj[siteId] ? mapObj[siteId] : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveCanopyHistoryList(siteId, list) {
    try {
      var raw = localStorage.getItem(CANOPY_HISTORY_KEY);
      var mapObj = raw ? JSON.parse(raw) : {};
      if (!mapObj || typeof mapObj !== 'object') mapObj = {};
      mapObj[siteId] = (list || []).slice(0, CANOPY_HISTORY_MAX);
      localStorage.setItem(CANOPY_HISTORY_KEY, JSON.stringify(mapObj));
    } catch (e) {}
  }

  function pushCanopyHistory(siteId, payload) {
    if (!payload || !Array.isArray(payload.trees) || !payload.trees.length) return;
    var list = loadCanopyHistory(siteId);
    var entry = {
      flight_id: payload.flight_id || getLastFlightId() || null,
      saved_at: payload.saved_at || Date.now(),
      stats: slimStatsForHistory(payload.stats),
      trees: payload.trees.slice(0, 2000).map(slimTreeForHistory)
    };
    // Evitar duplicar el mismo snapshot reciente
    if (list.length && list[0].saved_at && entry.saved_at - list[0].saved_at < 2000) {
      return;
    }
    list.unshift(entry);
    saveCanopyHistoryList(siteId, list);
  }

  function getPreviousTreesForMatch(siteId) {
    var cur = loadCanopyLocal(siteId);
    if (cur && Array.isArray(cur.trees) && cur.trees.length) {
      return { trees: cur.trees, stats: cur.stats || {}, source: 'current' };
    }
    var hist = loadCanopyHistory(siteId);
    if (hist.length && hist[0].trees && hist[0].trees.length) {
      return { trees: hist[0].trees, stats: hist[0].stats || {}, source: 'history' };
    }
    return null;
  }

  function applyFlightMatch(result, prevBundle) {
    if (!result || !Array.isArray(result.trees)) return null;
    if (
      !prevBundle ||
      !Array.isArray(prevBundle.trees) ||
      !prevBundle.trees.length ||
      !window.AirCICanopy ||
      typeof AirCICanopy.matchTreesAcrossFlights !== 'function'
    ) {
      result.trees.forEach(function (t) {
        if (t.stableId == null) t.stableId = String(t.id);
        if (!t.matchStatus) t.matchStatus = 'new';
        if (!t.semDelta) {
          t.semDelta =
            AirCICanopy.deltaSemClass ? AirCICanopy.deltaSemClass(null) : null;
        }
      });
      result.stats = result.stats || {};
      result.stats.match = { hasHistory: false, matched: 0, neu: result.trees.length, missing: 0 };
      return result.stats.match;
    }
    var match = AirCICanopy.matchTreesAcrossFlights(result.trees, prevBundle.trees, {
      gsdM: result.stats && result.stats.gsdM
    });
    result.stats = result.stats || {};
    result.stats.match = match;
    return match;
  }

  function saveCanopyLocal(siteId, payload) {
    try {
      var raw = localStorage.getItem(CANOPY_BY_SITE_KEY);
      var mapObj = raw ? JSON.parse(raw) : {};
      if (!mapObj || typeof mapObj !== 'object') mapObj = {};
      mapObj[siteId] = {
        stats: payload.stats,
        trees: payload.trees,
        flight_id: payload.flight_id || getLastFlightId() || null,
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
    var prev = loadCanopyLocal(siteId);
    if (prev && Array.isArray(prev.trees) && prev.trees.length) {
      pushCanopyHistory(siteId, prev);
    }
    var flightId = getLastFlightId();
    saveCanopyLocal(siteId, {
      stats: result.stats,
      trees: result.trees,
      flight_id: flightId
    });
    var r = await apiOrtho({
      action: 'save_canopy',
      site_id: siteId,
      flight_id: flightId,
      stats: result.stats,
      trees: result.trees
    });
    if (r.ok) {
      setMapStatus(
        result.stats.count +
          ' copas guardadas en Supabase · cobertura ' +
          Number(result.stats.coverPct || 0).toFixed(1) +
          '%' +
          (result.stats.match && result.stats.match.hasHistory
            ? ' · match ' + result.stats.match.matched
            : ''),
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

  /** Guarda criterio de análisis (predio + enriquece cultivo) */
  async function persistDetectProfile(detectParams, opts) {
    opts = opts || {};
    var meta = collectMeta();
    var criteria = opts.criteria || {
      shape: 'copa_compacta_redondeada',
      exclude: ['pasto', 'sombra', 'gente', 'vehiculo', 'cajas'],
      notes: (detectParams && detectParams.notes) || ''
    };
    var r = await apiOrtho({
      action: 'save_detect_profile',
      site_id: getSiteId(),
      flight_id: getLastFlightId(),
      cultivo: meta.cultivo || '',
      crop_label: meta.cultivo || '',
      detect_params: detectParams || {},
      criteria: criteria,
      source: opts.source || 'ai_calib',
      crop_hint: (detectParams && detectParams.crop_hint) || opts.crop_hint || '',
      notes: opts.notes || (detectParams && detectParams.notes) || ''
    });
    if (!r.ok && r.setup) {
      console.warn('AirCI perfil: ejecuta', r.setup);
    }
    return r;
  }

  async function loadDetectProfileForSite(siteId) {
    try {
      var r = await apiOrtho({
        action: 'load_detect_profile',
        site_id: siteId,
        cultivo: (collectMeta().cultivo || '').trim()
      });
      if (r.ok && r.profile && r.profile.detect_params) {
        return {
          level: r.level,
          params: r.profile.detect_params,
          criteria: r.profile.criteria || {},
          source: r.profile.source,
          crop_hint: r.profile.crop_hint || ''
        };
      }
    } catch (e) {}
    return null;
  }

  async function restoreCanopyForSite(siteId) {
    function finalizeRestore(trees, stats, statusMsg) {
      var result = {
        trees: trees,
        stats: stats || {
          count: trees.length,
          coverPct: 0,
          meanArea: 0,
          stdArea: 1,
          threshold: 0
        }
      };
      if (!(result.stats.match && result.stats.match.hasHistory)) {
        var hist = loadCanopyHistory(siteId);
        if (hist.length && hist[0].trees && hist[0].trees.length) {
          applyFlightMatch(result, hist[0]);
        } else {
          applyFlightMatch(result, null);
        }
      } else if (window.AirCICanopy && AirCICanopy.deltaSemClass) {
        result.trees.forEach(function (t) {
          if (!t.semDelta) t.semDelta = AirCICanopy.deltaSemClass(t.deltaAreaPct);
          if (t.stableId == null) t.stableId = String(t.id);
          if (!t.semPheno && t.phenoDominant && AirCICanopy.phenoSemForDominant) {
            t.semPheno = AirCICanopy.phenoSemForDominant(t.phenoDominant);
          }
        });
        if (
          !result.stats.hasPhenology &&
          window.AirCICanopy.summarizePhenology
        ) {
          var ps = AirCICanopy.summarizePhenology(result.trees);
          Object.keys(ps).forEach(function (k) {
            result.stats[k] = ps[k];
          });
        }
      }
      drawCanopies(result);
      showMapPane(true);
      setMapStatus(statusMsg, 'ok');
      return true;
    }
    try {
      var r = await apiOrtho({ action: 'load_canopy', site_id: siteId });
      if (r.ok && r.result && Array.isArray(r.result.trees) && r.result.trees.length) {
        return finalizeRestore(
          r.result.trees,
          r.result.stats,
          r.result.trees.length + ' copas restauradas desde Supabase'
        );
      }
    } catch (e) {}
    var local = loadCanopyLocal(siteId);
    if (local && Array.isArray(local.trees) && local.trees.length) {
      return finalizeRestore(
        local.trees,
        local.stats,
        local.trees.length + ' copas restauradas (local)'
      );
    }
    return false;
  }

  function getDetectModel() {
    var el = document.getElementById('aciDetectModel');
    var v = el ? String(el.value || 'exg') : 'exg';
    if (v === 'exg') return 'exg';
    if (
      v === 'gpt-5.6-luna' ||
      v === 'gpt-5.6-terra' ||
      v === 'gpt-5.6-sol'
    ) {
      return v;
    }
    return 'exg';
  }

  function persistDetectModelChoice() {
    try {
      localStorage.setItem(DETECT_MODEL_KEY, getDetectModel());
    } catch (e) {}
  }

  function loadDetectModelChoice() {
    var el = document.getElementById('aciDetectModel');
    if (!el) return;
    try {
      var v = localStorage.getItem(DETECT_MODEL_KEY);
      if (v) el.value = v;
    } catch (e) {}
  }

  async function apiCanopyAi(body) {
    var token = await getAccessToken();
    if (!token) {
      return {
        ok: false,
        error: 'Sin sesión Supabase. Entra de nuevo desde login.html con tu admin.'
      };
    }
    var res = await fetch(API_AI, {
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
        error: (data && data.error) || 'Error IA ' + res.status
      };
    }
    return data;
  }

  function fmtUsd4(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) v = 0;
    return '$' + v.toFixed(4);
  }

  function renderAiUsageBar(usage) {
    var bar = document.getElementById('aciAiUsageBar');
    if (!bar) return;
    if (!usage) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    var elMR = document.getElementById('aciAiUsageMonthReq');
    var elMU = document.getElementById('aciAiUsageMonthUsd');
    var elTR = document.getElementById('aciAiUsageTotalReq');
    var elTU = document.getElementById('aciAiUsageTotalUsd');
    var elBy = document.getElementById('aciAiUsageByModel');
    if (elMR) elMR.textContent = String(usage.month_requests || 0);
    if (elMU) elMU.textContent = fmtUsd4(usage.month_usd_est);
    if (elTR) elTR.textContent = String(usage.total_requests || 0);
    if (elTU) elTU.textContent = fmtUsd4(usage.total_usd_est);
    if (elBy) {
      var monthMap = usage.month_by_model || {};
      var parts = [];
      ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol'].forEach(function (k) {
        var b = monthMap[k];
        if (!b || !(Number(b.requests) > 0)) return;
        var lab = b.label || k.replace('gpt-5.6-', '');
        parts.push(
          lab +
            ' ' +
            b.requests +
            '× (' +
            fmtUsd4(b.usd) +
            ')'
        );
      });
      elBy.textContent = parts.length ? '· ' + parts.join(' · ') : '';
    }
  }

  async function refreshAiUsageBar() {
    try {
      var r = await apiCanopyAi({ action: 'usage' });
      if (r.ok && r.usage) {
        renderAiUsageBar(r.usage);
        return r.usage;
      }
      if (r.setup) {
        var bar = document.getElementById('aciAiUsageBar');
        if (bar) {
          bar.hidden = false;
          bar.innerHTML =
            'Para ver uso/costo IA ejecuta <strong>' +
            r.setup +
            '</strong> en Supabase.';
        }
      }
    } catch (e) {}
    return null;
  }

  /** USD estimado por consulta (igual que airci-canopy-ai.js). */
  var AI_USD = {
    'gpt-5.6-luna': 0.006,
    'gpt-5.6-terra': 0.012,
    'gpt-5.6-sol': 0.022,
    'gpt-4o-mini': 0.008
  };

  /** Tope de consultas IA por análisis (rejilla). */
  function maxAiBatchesForModel(model) {
    if (/sol/i.test(model)) return 8; // ~$0.18
    if (/terra/i.test(model)) return 10; // ~$0.12
    return 12; // Luna ~$0.072
  }

  /**
   * Rejilla de recortes sobre TODO el orto (no solo 2 ventanas).
   * Cada tile se baja a outSize×outSize JPEG para que la IA vea árboles, no “mancha verde”.
   */
  function makeDetectionTiles(georaster, outSize, opts) {
    outSize = outSize || 512;
    opts = opts || {};
    if (!georaster || !window.AirCICanopy) return [];
    var bands = AirCICanopy.getBandArrays(georaster);
    if (!bands) return [];
    var w = georaster.width;
    var h = georaster.height;
    var maxR = bands.maxs[0];
    var maxG = bands.maxs[1] != null ? bands.maxs[1] : bands.maxs[0];
    var maxB = bands.maxs[2] != null ? bands.maxs[2] : bands.maxs[0];

    var maxTiles = opts.maxTiles != null ? opts.maxTiles : 24;
    var overviewOnly = !!opts.overviewOnly;

    var origins = [];
    var tileW;
    var tileH;

    if (overviewOnly || Math.max(w, h) < 900) {
      // Predio chico o calibración: 2 ventanas amplias
      tileW = Math.max(96, Math.floor(w * 0.55));
      tileH = Math.max(96, Math.floor(h * 0.55));
      origins = [
        {
          id: 'tile1',
          x0: Math.max(0, Math.floor(w * 0.02)),
          y0: Math.max(0, Math.floor(h * 0.05))
        },
        {
          id: 'tile2',
          x0: Math.max(0, Math.min(w - tileW, Math.floor(w * 0.43))),
          y0: Math.max(0, Math.min(h - tileH, Math.floor(h * 0.35)))
        }
      ];
    } else {
      // Rejilla: cada celda ~árboles visibles (no comprimir 30 ha en una foto)
      var shortSide = Math.min(w, h);
      var longSide = Math.max(w, h);
      // Lado del tile en px fuente: ~28–42% del lado corto, acotado
      tileW = Math.max(160, Math.min(900, Math.floor(shortSide * 0.34)));
      tileH = tileW;
      var overlap = 0.18;
      var stepX = Math.max(64, Math.floor(tileW * (1 - overlap)));
      var stepY = Math.max(64, Math.floor(tileH * (1 - overlap)));

      // Estimar cuántas celdas caben; si exceden maxTiles, agrandar paso
      function countGrid(sx, sy, tw, th) {
        var nx = Math.max(1, Math.ceil((w - tw) / sx) + 1);
        var ny = Math.max(1, Math.ceil((h - th) / sy) + 1);
        return { nx: nx, ny: ny, n: nx * ny };
      }
      var grid = countGrid(stepX, stepY, tileW, tileH);
      var guard = 0;
      while (grid.n > maxTiles && guard < 12) {
        stepX = Math.floor(stepX * 1.18);
        stepY = Math.floor(stepY * 1.18);
        tileW = Math.min(Math.floor(tileW * 1.12), Math.floor(w * 0.55));
        tileH = Math.min(Math.floor(tileH * 1.12), Math.floor(h * 0.55));
        stepX = Math.max(64, Math.floor(tileW * (1 - overlap)));
        stepY = Math.max(64, Math.floor(tileH * (1 - overlap)));
        grid = countGrid(stepX, stepY, tileW, tileH);
        guard++;
      }

      var ti = 0;
      for (var row = 0; row < grid.ny; row++) {
        for (var col = 0; col < grid.nx; col++) {
          if (ti >= maxTiles) break;
          var x0 = Math.min(Math.max(0, col * stepX), Math.max(0, w - tileW));
          var y0 = Math.min(Math.max(0, row * stepY), Math.max(0, h - tileH));
          // Evitar duplicados exactos en el borde
          var id = 't' + row + '_' + col;
          var dup = origins.some(function (o) {
            return o.x0 === x0 && o.y0 === y0;
          });
          if (dup) continue;
          origins.push({ id: id, x0: x0, y0: y0 });
          ti++;
        }
        if (ti >= maxTiles) break;
      }
      // Si el predio es muy alargado y quedaron pocos, forzar al menos esquinas + centro
      if (origins.length < 2 && longSide > shortSide * 1.4) {
        origins = [
          { id: 'tile1', x0: 0, y0: 0 },
          {
            id: 'tile2',
            x0: Math.max(0, w - tileW),
            y0: Math.max(0, h - tileH)
          }
        ];
      }
    }

    var out = [];
    origins.forEach(function (o) {
      var x0 = o.x0;
      var y0 = o.y0;
      var tw = tileW;
      var th = tileH;
      var x1 = Math.min(w - 1, x0 + tw - 1);
      var y1 = Math.min(h - 1, y0 + th - 1);
      var cw = x1 - x0 + 1;
      var ch = y1 - y0 + 1;
      if (cw < 32 || ch < 32) return;
      var canvas = document.createElement('canvas');
      canvas.width = outSize;
      canvas.height = outSize;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      var img = ctx.createImageData(outSize, outSize);
      var i = 0;
      for (var py = 0; py < outSize; py++) {
        for (var px = 0; px < outSize; px++) {
          var sx = x0 + ((px + 0.5) / outSize) * cw;
          var sy = y0 + ((py + 0.5) / outSize) * ch;
          var ix = Math.max(0, Math.min(w - 1, sx | 0));
          var iy = Math.max(0, Math.min(h - 1, sy | 0));
          var idx = iy * w + ix;
          img.data[i++] = AirCICanopy.bandScale(bands.r[idx], maxR);
          img.data[i++] = AirCICanopy.bandScale(bands.g[idx], maxG);
          img.data[i++] = AirCICanopy.bandScale(bands.b[idx], maxB);
          img.data[i++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      out.push({
        id: o.id,
        x0: x0,
        y0: y0,
        cw: cw,
        ch: ch,
        outSize: outSize,
        imageBase64: canvas.toDataURL('image/jpeg', 0.78)
      });
    });
    return out;
  }

  function makeCalibrationTiles(georaster, outSize) {
    return makeDetectionTiles(georaster, outSize || 448, { overviewOnly: true, maxTiles: 2 }).map(
      function (t) {
        return { id: t.id, imageBase64: t.imageBase64 };
      }
    );
  }

  function plantsToSeeds(plants, tiles) {
    var byId = Object.create(null);
    tiles.forEach(function (t) {
      byId[t.id] = t;
    });
    var seeds = [];
    (plants || []).forEach(function (p) {
      var tile = byId[p.image_id] || byId[String(p.image_id)];
      if (!tile && tiles.length === 1) tile = tiles[0];
      if (!tile) return;
      var cx = Number(p.cx);
      var cy = Number(p.cy);
      var rn = Number(p.r);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      // Acepta 0–1 o 0–100 por si el modelo se confunde
      if (cx > 1.5 || cy > 1.5) {
        cx = cx / 100;
        cy = cy / 100;
        if (rn > 1.5) rn = rn / 100;
      }
      cx = Math.max(0, Math.min(1, cx));
      cy = Math.max(0, Math.min(1, cy));
      var x = Math.round(tile.x0 + cx * tile.cw);
      var y = Math.round(tile.y0 + cy * tile.ch);
      var rPx = Math.max(
        4,
        Math.round((Number.isFinite(rn) && rn > 0 ? rn : 0.06) * Math.min(tile.cw, tile.ch))
      );
      seeds.push({
        x: x,
        y: y,
        v: Math.round(180 + 70 * (Number(p.conf) || 0.85)),
        rPx: rPx,
        fromVision: true
      });
    });
    return seeds;
  }

  /** Dedup semillas de tiles solapados (misma planta vista 2 veces). */
  function dedupeVisionSeeds(seeds, minDistPx) {
    minDistPx = minDistPx || 10;
    if (!seeds || seeds.length < 2) return seeds || [];
    var sorted = seeds.slice().sort(function (a, b) {
      return (b.v || 0) - (a.v || 0);
    });
    var kept = [];
    sorted.forEach(function (s) {
      var hit = kept.some(function (k) {
        var dx = k.x - s.x;
        var dy = k.y - s.y;
        return dx * dx + dy * dy < minDistPx * minDistPx;
      });
      if (!hit) kept.push(s);
    });
    return kept;
  }

  /** Visión: rejilla de fotos → marca árboles (como ojo humano), no ExG. */
  async function detectPlantsWithAi(model) {
    var maxBatches = maxAiBatchesForModel(model);
    var maxTiles = maxBatches * 2;
    var tiles = makeDetectionTiles(currentGeoraster, 512, { maxTiles: maxTiles });
    if (!tiles.length) {
      throw new Error('No se pudieron generar recortes para visión');
    }
    var usdEach = AI_USD[model] != null ? AI_USD[model] : 0.01;
    var estTotal = usdEach * Math.ceil(tiles.length / 2);
    var short = model.replace('gpt-5.6-', '');
    setMapStatus(
      'IA ' +
        short +
        ' · ' +
        tiles.length +
        ' fotos del predio (rejilla) · est. ~' +
        fmtUsd4(estTotal) +
        '…',
      'ok'
    );

    var allPlants = [];
    var totalUsd = 0;
    var batches = Math.ceil(tiles.length / 2);
    var lastLabel = short;
    var lastSetup = null;

    for (var b = 0; b < batches; b++) {
      var slice = tiles.slice(b * 2, b * 2 + 2);
      setMapStatus(
        'IA ' +
          short +
          ' · lote ' +
          (b + 1) +
          '/' +
          batches +
          ' · buscando árboles (no pasto/gente/autos)…',
        'ok'
      );
      var r = await apiCanopyAi({
        action: 'detect_plants',
        model: model,
        images: slice.map(function (t) {
          return { id: t.id, imageBase64: t.imageBase64 };
        }),
        site_id: getSiteId()
      });
      if (!r.ok) {
        if (b === 0) throw new Error(r.error || 'Fallo detección visión');
        setMapStatus(
          'Lote ' + (b + 1) + ' falló (' + (r.error || 'error') + ') · sigo con lo ya marcado…',
          'error'
        );
        continue;
      }
      var plants = Array.isArray(r.plants)
        ? r.plants
        : r.detection && Array.isArray(r.detection.plants)
          ? r.detection.plants
          : [];
      allPlants = allPlants.concat(plants);
      if (r.cost && r.cost.usd_est != null) totalUsd += Number(r.cost.usd_est) || 0;
      if (r.cost && r.cost.label) lastLabel = r.cost.label;
      if (r.cost && r.cost.setup) lastSetup = r.cost.setup;
    }

    var seeds = dedupeVisionSeeds(plantsToSeeds(allPlants, tiles), 12);
    refreshAiUsageBar();
    setMapStatus(
      'Visión ' +
        lastLabel +
        ' · ' +
        seeds.length +
        ' árboles en ' +
        tiles.length +
        ' fotos · ~' +
        fmtUsd4(totalUsd) +
        (lastSetup ? ' · ejecuta ' + lastSetup : ''),
      lastSetup ? 'error' : seeds.length ? 'ok' : 'error'
    );
    return {
      seeds: seeds,
      notes: '',
      cost: { usd_est: totalUsd, label: lastLabel, setup: lastSetup },
      tileCount: tiles.length,
      batchCount: batches
    };
  }

  async function calibrateDetectionWithAi(model) {
    var tiles = makeCalibrationTiles(currentGeoraster, 448);
    if (!tiles.length) {
      throw new Error('No se pudieron generar recortes para calibrar');
    }
    setMapStatus(
      'IA ' + model.replace('gpt-5.6-', '') + ' · calibrando con ' + tiles.length + ' fotos…',
      'ok'
    );
    var r = await apiCanopyAi({
      action: 'calibrate',
      model: model,
      images: tiles,
      site_id: getSiteId()
    });
    if (!r.ok || !r.calibration) {
      throw new Error(r.error || 'Fallo calibración IA');
    }
    if (r.cost && r.cost.usd_est != null) {
      setMapStatus(
        'Calibrado ' +
          (r.cost.label || model) +
          ' · esta consulta ~' +
          fmtUsd4(r.cost.usd_est) +
          (r.cost.setup ? ' · ejecuta ' + r.cost.setup + ' para guardar uso' : ''),
        r.cost.setup ? 'error' : 'ok'
      );
    }
    refreshAiUsageBar();
    return r.calibration;
  }

  var detectRunId = 0;

  function setAnalyzeBusy(busy) {
    var btn = document.getElementById('aciAnalyzeBtn');
    if (!btn) return;
    btn.disabled = !!busy;
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    btn.textContent = busy ? 'Analizando…' : 'Analizar';
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
    var model = getDetectModel();
    var useAi = model !== 'exg';
    persistDetectModelChoice();
    var runId = ++detectRunId;
    setMapStatus(
      useAi
        ? 'IA ' + model.replace('gpt-5.6-', '') + ' · visión de plantas (RGB)…'
        : 'Detectando copas (local)…'
    );
    setAnalyzeBusy(true);
    setTimeout(async function () {
      try {
        if (runId !== detectRunId) return;
        var siteId = getSiteId();
        var prevBundle = getPreviousTreesForMatch(siteId);
        var savedProf = await loadDetectProfileForSite(siteId);
        if (runId !== detectRunId) return;
        var calib = null;
        var calibSource = 'exg';
        var visionSeeds = null;

        if (useAi) {
          var vision = await detectPlantsWithAi(model);
          if (runId !== detectRunId) return;
          visionSeeds = vision.seeds || [];
          calibSource = 'ai_vision';
          if (!visionSeeds.length) {
            setMapStatus(
              'Visión no marcó plantas en los recortes · reintentando con criterio local…',
              'error'
            );
          } else {
            setMapStatus(
              'Visión: ' +
                visionSeeds.length +
                ' plantas · ajustando copas…',
              'ok'
            );
          }
          // Criterio guardado solo como apoyo de forma/spacing si existe
          if (savedProf && savedProf.params) {
            calib = savedProf.params;
          }
        } else if (savedProf && savedProf.params) {
          calib = savedProf.params;
          calibSource = savedProf.level === 'site' ? 'site_profile' : 'crop_default';
          setMapStatus(
            'Usando criterio guardado (' +
              (savedProf.level === 'site' ? 'predio' : 'cultivo') +
              ')' +
              (savedProf.crop_hint ? ' · ' + savedProf.crop_hint : '') +
              '…',
            'ok'
          );
        }

        var metaNow = collectMeta();
        var densHa = Number(metaNow.densidad_ha);
        var result = window.AirCICanopy.analyzeCanopies(currentGeoraster, {
          profile: useAi || calib ? 'ai' : 'strict',
          calibration: calib || undefined,
          targetTreesPerHa:
            Number.isFinite(densHa) && densHa >= 50 && densHa <= 2500 ? densHa : undefined,
          visionSeeds: visionSeeds && visionSeeds.length ? visionSeeds : undefined,
          visionOnly: !!(visionSeeds && visionSeeds.length)
        });
        if (runId !== detectRunId) return;
        if (useAi || calib) {
          result.stats.aiModel = useAi ? model : calibSource;
          result.stats.aiCalibrated = false;
          result.stats.aiVision = !!useAi;
          result.stats.detectSource = calibSource;
          result.stats.cropHint =
            (calib && calib.crop_hint) || (savedProf && savedProf.crop_hint) || '';
        }
        applyFlightMatch(result, prevBundle);
        drawCanopies(result);
        // Liberar botón YA: persistir no debe dejar Analizar muerto
        setAnalyzeBusy(false);
        document.getElementById('aciMapSub').textContent =
          'Copas · ' +
          (useAi ? 'visión IA ' + model.replace('gpt-5.6-', '') : 'local') +
          (result.stats.targetTreesPerHa != null
            ? ' · dens. ' + Math.round(result.stats.targetTreesPerHa) + '/ha'
            : '') +
          (result.stats.expectedCanopyDiamM != null
            ? ' · Ø~' + result.stats.expectedCanopyDiamM.toFixed(1) + ' m'
            : '') +
          (result.stats.spacingM != null
            ? ' · esp. ' + result.stats.spacingM.toFixed(1) + ' m'
            : '') +
          (result.stats.meanConfidence != null
            ? ' · conf. ' + Math.round(result.stats.meanConfidence) + '%'
            : '') +
          (result.stats.cropHint ? ' · ' + result.stats.cropHint : '') +
          (result.stats.match && result.stats.match.hasHistory
            ? ' · match ' + result.stats.match.matched + '/' + result.stats.count
            : '');
        if (!result.stats.count) {
          setMapStatus(
            useAi
              ? 'Visión respondió pero 0 copas en mapa · prueba Local o vuelve a Analizar'
              : '0 copas detectadas · revisa el orto o densidad del predio',
            'error'
          );
        } else {
          setMapStatus(
            result.stats.count +
              ' plantas' +
              (result.stats.expectedTrees != null
                ? ' (ref ~' + result.stats.expectedTrees + ')'
                : '') +
              (useAi
                ? ' · visión ' + model.replace('gpt-5.6-', '')
                : calib
                  ? ' · criterio guardado'
                  : ' · local') +
              (result.stats.truncated ? ' · tope ' + result.stats.maxTrees : ''),
            'ok'
          );
        }
        setActiveTab('analisis');
        saveCurrentMetaToSiteStore();
        refreshProjectsUi();
        await persistCanopyResult(result);
      } catch (e) {
        console.error(e);
        setMapStatus('Error analizando: ' + (e.message || e), 'error');
      } finally {
        if (runId === detectRunId) setAnalyzeBusy(false);
      }
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
    refreshAiUsageBar();
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
    var title = (meta.title || '').trim() || 'Análisis sin título';
    var agricola = (meta.agricola || '').trim();
    var predio = (meta.predio || '').trim();
    if (titleEl) titleEl.textContent = title;
    if (pathEl) {
      var parts = [];
      if (agricola) parts.push(agricola);
      if (predio) parts.push(predio);
      parts.push(title);
      var path = parts.join(' → ');
      var idShort = getSiteId().slice(0, 8);
      pathEl.textContent = path + (idShort ? ' · id ' + idShort : '');
    }
  }

  function buildProjectsTree(sites) {
    var tree = Object.create(null);
    (sites || []).forEach(function (s) {
      var ag = (s.agricola || '').trim() || 'Sin agrícola';
      var pr = (s.predio || '').trim() || 'Sin predio';
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
      enableLayers(['ortho', 'semaforo', 'numeros']);
      return;
    }
    if (orthoOk && !canopyOk) {
      setMapStatus('Ortomosaico restaurado. Analizando…', 'ok');
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
      densidad_ha: '',
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
    var payload = Object.assign({}, meta);
    // densida_ha es parámetro local de detección (aún no hay columna en airci_sites)
    delete payload.densidad_ha;
    var r = await apiOrtho(
      Object.assign({ action: 'upsert_site', site_id: getSiteId() }, payload)
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
    // Fondo Google atrás; ortomosaico opaco encima; copas/números al frente
    if (basemapLayer && map && map.hasLayer(basemapLayer) && basemapLayer.bringToBack) {
      basemapLayer.bringToBack();
    }
    if (rasterLayer && map && map.hasLayer(rasterLayer)) {
      if (rasterLayer.setOpacity) rasterLayer.setOpacity(1);
      if (rasterLayer.bringToFront) rasterLayer.bringToFront();
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
    if (basemapLayer && basemapLayer.bringToBack) basemapLayer.bringToBack();
    if (rasterLayer.bringToFront) rasterLayer.bringToFront();
    bringOverlaysFront();
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
    // densida_ha se guarda en meta local del predio; no se manda a airci_sites aún

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
    el.addEventListener('input', function () {
      scheduleSave();
    });
    el.addEventListener('change', function () {
      scheduleSave();
    });
  });

  loadDetectModelChoice();
  var detectModelEl = document.getElementById('aciDetectModel');
  if (detectModelEl) {
    detectModelEl.addEventListener('change', persistDetectModelChoice);
  }

  var deltaFilterEl = document.getElementById('aciDeltaFilter');
  if (deltaFilterEl) {
    deltaFilterEl.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-delta]') : null;
      if (!btn || btn.disabled) return;
      setDeltaFilter(btn.getAttribute('data-delta'));
    });
  }

  document.querySelectorAll('[data-paint-delta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setPaintByDelta(btn.getAttribute('data-paint-delta') === '1');
    });
  });

  document.querySelectorAll('[data-paint-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      var mode = btn.getAttribute('data-paint-mode');
      var pk = btn.getAttribute('data-pheno-key');
      setPaintMode(mode, pk || undefined);
    });
  });

  var phenoFilterEl = document.getElementById('aciPhenoFilter');
  if (phenoFilterEl) {
    phenoFilterEl.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-pheno]') : null;
      if (!btn || btn.disabled) return;
      setPhenoFilter(btn.getAttribute('data-pheno'));
    });
  }

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
  var tableFilterEl = document.getElementById('aciTableFilter');
  var semBreakEl = document.getElementById('aciSemBreakdown');
  function onSemFilterClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-sem]') : null;
    if (!btn) return;
    if (btn.disabled || btn.getAttribute('data-empty') === '1') return;
    setSemFilter(btn.getAttribute('data-sem'));
  }
  if (legendEl) legendEl.addEventListener('click', onSemFilterClick);
  if (tableFilterEl) tableFilterEl.addEventListener('click', onSemFilterClick);
  if (semBreakEl) semBreakEl.addEventListener('click', onSemFilterClick);
  var semStatsBody = document.getElementById('aciSemStatsBody');
  if (semStatsBody) semStatsBody.addEventListener('click', onSemFilterClick);

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
