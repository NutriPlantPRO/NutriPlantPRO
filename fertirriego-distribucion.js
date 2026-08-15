// Fertirriego — Distribución del requerimiento por etapa (curva del proyecto)
(function (w) {
  'use strict';

  var NUTS = [
    { ferti: 'N', id: 'n', label: 'N' },
    { ferti: 'P2O5', id: 'p', label: 'P2O5' },
    { ferti: 'K2O', id: 'k', label: 'K2O' },
    { ferti: 'CaO', id: 'ca', label: 'CaO' },
    { ferti: 'MgO', id: 'mg', label: 'MgO' },
    { ferti: 'SO4', id: 's', label: 'SO4' },
    { ferti: 'Fe', id: 'fe', label: 'Fe' },
    { ferti: 'Mn', id: 'mn', label: 'Mn' },
    { ferti: 'B', id: 'b', label: 'B' },
    { ferti: 'Zn', id: 'zn', label: 'Zn' },
    { ferti: 'Cu', id: 'cu', label: 'Cu' },
    { ferti: 'Mo', id: 'mo', label: 'Mo' },
    { ferti: 'SiO2', id: 'si', label: 'SiO2' }
  ];
  var MACRO = { n: 1, p: 1, k: 1, ca: 1, mg: 1, s: 1 };
  var DEFAULT_STAGES = ['Brotación', 'Vegetativo', 'Floración', 'Llenado', 'Maduración'];
  var DEFAULT_PCT = {
    n: [10, 30, 20, 30, 10],
    p: [15, 25, 25, 20, 15],
    k: [5, 20, 25, 35, 15],
    ca: [12, 28, 22, 28, 10],
    mg: [12, 28, 22, 28, 10]
  };
  var COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#db2777', '#0d9488', '#4f46e5', '#64748b', '#059669', '#b45309', '#be185d'];
  var STAGE_EN = {
    'Brotación': 'Bud break', 'Vegetativo': 'Vegetative', 'Floración': 'Flowering',
    'Llenado': 'Filling', 'Maduración': 'Maturity', 'Cosecha': 'Harvest',
    'Mes 1': 'Month 1', 'Mes 2': 'Month 2', 'Mes 3': 'Month 3',
    'Nueva etapa': 'New stage', 'Inicio de ciclo': 'Cycle start', 'Desarrollo': 'Development'
  };
  var STAGE_SUGGEST = ['Brotación', 'Vegetativo', 'Floración', 'Llenado', 'Maduración', 'Cosecha', 'Mes 1', 'Mes 2', 'Mes 3'];
  var STAGE_CANON = STAGE_SUGGEST.concat(['Nueva etapa', 'Inicio de ciclo', 'Desarrollo', 'Establecimiento', 'Prefloración', 'Amarre']);

  var totals = {};
  var stages = DEFAULT_STAGES.slice();
  var pct = {};
  var presetsList = [];
  var persistTimer = null;
  var chartInst = null;
  var chartGroup = 'macro';
  var mounted = false;
  var booting = false;

  function t(key, es) {
    return typeof fertiT === 'function' ? fertiT(key, es) : es;
  }
  function isEnglish() {
    try {
      var ui = w.NpFertigationUI;
      if (ui && typeof ui.getPrefs === 'function') return ui.getPrefs().language === 'en';
    } catch (e) {}
    return false;
  }
  function stageLabel(name) {
    var raw = String(name == null ? '' : name);
    if (w.NpFertigationUI && typeof w.NpFertigationUI.stageName === 'function') {
      var fromUi = w.NpFertigationUI.stageName(raw);
      if (fromUi && fromUi !== raw) return fromUi;
    }
    return isEnglish() && STAGE_EN[raw] ? STAGE_EN[raw] : raw;
  }
  function canonicalStage(display) {
    var value = String(display || '');
    for (var i = 0; i < STAGE_CANON.length; i++) {
      if (STAGE_CANON[i] === value || stageLabel(STAGE_CANON[i]) === value) return STAGE_CANON[i];
    }
    var keys = Object.keys(STAGE_EN);
    for (var j = 0; j < keys.length; j++) {
      if (STAGE_EN[keys[j]] === value) return keys[j];
    }
    return value;
  }
  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }
  function equalSplit(len) {
    if (len <= 0) return [];
    var base = round1(100 / len);
    var arr = [];
    var sum = 0;
    for (var i = 0; i < len; i++) {
      var v = i === len - 1 ? round1(100 - sum) : base;
      arr.push(v);
      sum += v;
    }
    return arr;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function projectId() {
    try {
      if (typeof w.np_getCurrentProjectId === 'function') {
        var id = w.np_getCurrentProjectId();
        if (id) return id;
      }
    } catch (e) {}
    try {
      var p = w.projectManager && w.projectManager.getCurrentProject && w.projectManager.getCurrentProject();
      if (p && p.id) return p.id;
    } catch (e2) {}
    return localStorage.getItem('nutriplant-current-project') || localStorage.getItem('currentProjectId') || '';
  }
  function projectName(id) {
    try {
      var p = w.projectManager && w.projectManager.getCurrentProject && w.projectManager.getCurrentProject();
      if (p && (!id || p.id === id) && (p.projectName || p.name)) return p.projectName || p.name;
    } catch (e) {}
    try {
      var raw = localStorage.getItem('nutriplant_project_' + (id || projectId()));
      if (raw) {
        var o = JSON.parse(raw);
        if (o && (o.projectName || o.name)) return o.projectName || o.name;
      }
    } catch (e2) {}
    return t('dist_project_fallback', 'proyecto');
  }
  function curveTitle(id) {
    return t('dist_title_prefix', 'Distribución') + ' ' + projectName(id);
  }
  function userId() {
    return localStorage.getItem('nutriplant_user_id') || '';
  }
  function nutLabel(n) {
    if (typeof getConvertedValue === 'function' && w.isFertirriegoElementalMode) {
      if (n.ferti === 'P2O5') return 'P';
      if (n.ferti === 'K2O') return 'K';
      if (n.ferti === 'CaO') return 'Ca';
      if (n.ferti === 'MgO') return 'Mg';
      if (n.ferti === 'SiO2') return 'Si';
      if (n.ferti === 'SO4') return 'S';
    }
    return n.ferti === 'SO4' ? 'SO₄' : n.label;
  }
  function oxideToShownSi(oxideSi, fertiKey) {
    var shown = parseFloat(oxideSi) || 0;
    if (typeof getConvertedValue === 'function') shown = parseFloat(getConvertedValue(fertiKey, shown)) || 0;
    return shown;
  }
  function doseShownNumber(oxideSi, fertiKey) {
    var shown = oxideToShownSi(oxideSi, fertiKey);
    var ui = w.NpFertigationUI;
    if (ui && typeof ui.fromSI === 'function') return ui.fromSI(shown, 'dose_mass_area');
    return shown;
  }
  function fmtDose(oxideSi, fertiKey) {
    var shown = oxideToShownSi(oxideSi, fertiKey);
    var digits = typeof fertiAdjDisplayDigits === 'function' ? fertiAdjDisplayDigits(fertiKey) : 2;
    if (typeof fertiResultFromSI === 'function') return fertiResultFromSI(shown, 'dose_mass_area', digits);
    return Number(shown || 0).toFixed(digits);
  }
  function doseUnit() {
    return typeof fertiUnit === 'function' ? fertiUnit('dose_mass_area', 'kg/ha') : 'kg/ha';
  }
  function withUnit(es, key) {
    return t(key, es).replace(/\{unit\}/g, doseUnit());
  }

  function ensurePct() {
    NUTS.forEach(function (n) {
      if (!pct[n.id] || pct[n.id].length !== stages.length) {
        pct[n.id] = DEFAULT_PCT[n.id] && DEFAULT_PCT[n.id].length === stages.length
          ? DEFAULT_PCT[n.id].slice()
          : equalSplit(stages.length);
      }
    });
  }
  function sumPct(id) {
    return (pct[id] || []).reduce(function (a, b) { return a + (parseFloat(b) || 0); }, 0);
  }
  function applyTotals(realRequirement) {
    NUTS.forEach(function (n) {
      var v = realRequirement && realRequirement[n.ferti];
      totals[n.id] = parseFloat(v) || 0;
    });
  }

  function snapshotState() {
    ensurePct();
    return {
      version: 1,
      source: 'fertirriego',
      title: curveTitle(),
      updatedAt: Date.now(),
      nutrients: NUTS.map(function (n) {
        return { id: n.id, label: n.label, total: totals[n.id] || 0, optional: false };
      }),
      stages: stages.slice(),
      pct: JSON.parse(JSON.stringify(pct))
    };
  }

  function applyPctFromState(state) {
    if (!state) return;
    if (Array.isArray(state.stages) && state.stages.length) {
      stages = state.stages.map(function (s, i) {
        var txt = String(s || '').trim();
        return txt || (t('dist_stage', 'Etapa') + ' ' + (i + 1));
      });
    }
    if (state.pct && typeof state.pct === 'object') {
      var next = {};
      NUTS.forEach(function (n) {
        var arr = state.pct[n.id];
        next[n.id] = Array.isArray(arr) && arr.length === stages.length
          ? arr.map(function (x) { return round1(parseFloat(x) || 0); })
          : equalSplit(stages.length);
      });
      pct = next;
    }
    ensurePct();
  }

  function saveProjectCurve() {
    var pid = projectId();
    var uid = userId();
    if (!pid || !uid) return;
    var state = snapshotState();
    try {
      if (typeof w.nutriplantSaveExtractionStageToCloud === 'function') {
        w.nutriplantSaveExtractionStageToCloud({ userId: uid, projectId: pid, state: state });
      }
    } catch (e) {}
  }
  function scheduleSave() {
    if (booting) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(saveProjectCurve, 550);
  }

  async function loadProjectCurve() {
    var pid = projectId();
    var uid = userId();
    if (!pid) return null;
    try {
      if (typeof w.nutriplantLoadExtractionStageFromCloud === 'function') {
        var cloud = w.nutriplantLoadExtractionStageFromCloud({ userId: uid, projectId: pid });
        if (cloud && cloud.then) cloud = await cloud;
        if (cloud && Array.isArray(cloud.stages)) return cloud;
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('np_extraccion_etapa_' + uid + '_' + pid);
      if (raw) return JSON.parse(raw);
    } catch (e2) {}
    return null;
  }

  function persistPresetsBucket() {
    var uid = userId();
    if (!uid || uid === 'guest') return;
    var bucket = { version: 1, updatedAt: Date.now(), presets: presetsList.slice() };
    try {
      localStorage.setItem('np_extraccion_etapa_presets_user_' + uid, JSON.stringify(bucket));
    } catch (e) {}
    try {
      if (typeof w.nutriplantSaveExtractionPresetsToCloud === 'function') {
        w.nutriplantSaveExtractionPresetsToCloud({ userId: uid, presetsData: bucket });
      }
    } catch (e2) {}
    pingCatalogIframe();
  }
  async function hydratePresets() {
    var uid = userId();
    presetsList = [];
    if (!uid || uid === 'guest') return;
    try {
      if (typeof w.nutriplantLoadExtractionPresetsFromCloud === 'function') {
        var data = await w.nutriplantLoadExtractionPresetsFromCloud({ userId: uid });
        if (data && Array.isArray(data.presets)) presetsList = data.presets.slice();
      }
    } catch (e) {}
    if (!presetsList.length) {
      try {
        var raw = localStorage.getItem('np_extraccion_etapa_presets_user_' + uid);
        var loc = raw ? JSON.parse(raw) : null;
        if (loc && Array.isArray(loc.presets)) presetsList = loc.presets.slice();
      } catch (e2) {}
    }
  }
  function pingCatalogIframe() {
    try {
      var frame = document.getElementById('extraccionEtapaCalculatorFrame');
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'np-extraccion-etapa-presets-changed' }, '*');
      }
    } catch (e) {}
  }

  function hostEl() {
    return document.getElementById('fertiDistribucionBlock');
  }

  function shellHtml() {
    var unit = doseUnit();
    return (
      '<div class="ferti-dist-card">' +
        '<h3 class="ferti-dist-title" id="fertiDistTitle"></h3>' +
        '<p class="ferti-dist-lead">' + escapeHtml(withUnit('Reparte el Requerimiento real por etapa fenológica. Las dosis ({unit}) salen de la tabla de arriba; aquí diseñas los %.', 'dist_lead')) + '</p>' +
        '<div class="ferti-dist-catalog" aria-label="' + escapeHtml(t('dist_catalog', 'Catálogo de curvas')) + '">' +
          '<label>' + escapeHtml(t('dist_catalog', 'Catálogo de curvas')) +
            '<select id="fertiDistPresetSelect"><option value="">' + escapeHtml(t('dist_pick_curve', '— Elegir curva —')) + '</option></select>' +
          '</label>' +
          '<label>' + escapeHtml(t('dist_template_title', 'Título (plantilla)')) +
            '<input type="text" id="fertiDistPresetTitle" maxlength="80" placeholder="' + escapeHtml(t('dist_template_ph', 'Ej. Aguacate hass · 5 etapas')) + '" />' +
          '</label>' +
          '<div class="ferti-dist-actions">' +
            '<button type="button" class="btn btn-info btn-sm" id="fertiDistSavePreset">' + escapeHtml(t('dist_save_catalog', '💾 Guardar en catálogo')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="fertiDistApplyOther">' + escapeHtml(t('dist_apply_other', 'Aplicar a otro proyecto')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="fertiDistDeletePreset" disabled>' + escapeHtml(t('dist_delete_catalog', '🗑 Eliminar del catálogo')) + '</button>' +
          '</div>' +
          '<p class="ferti-dist-hint">' + escapeHtml(t('dist_catalog_hint', 'El catálogo es tuyo (dashboard). Guarda etapas y %. Las dosis se recalculan en cada proyecto con su requerimiento.')) + '</p>' +
        '</div>' +
        '<div class="ferti-dist-panel">' +
          '<h4>' + escapeHtml(t('dist_h1', '1. Requerimiento real')) + ' (' + escapeHtml(unit) + ')</h4>' +
          '<p class="ferti-dist-hint">' + escapeHtml(t('dist_h1_hint', 'Todos los elementos de la tabla de requerimiento. No se editan aquí.')) + '</p>' +
          '<div class="ferti-dist-totals" id="fertiDistTotals"></div>' +
        '</div>' +
        '<div class="ferti-dist-panel">' +
          '<h4>' + escapeHtml(t('dist_h2', '2. Distribución por etapa (%)')) + '</h4>' +
          '<p class="ferti-dist-hint">' + escapeHtml(t('dist_h2_hint', 'La suma de cada nutriente debe ser 100%.')) + '</p>' +
          '<div class="ferti-dist-scroll"><table class="data ferti-dist-table" id="fertiDistPctTable"></table></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="fertiDistAddStage">+ ' + escapeHtml(t('dist_add_stage', 'Agregar etapa')) + '</button>' +
          '<div class="ferti-dist-warn" id="fertiDistWarn" hidden></div>' +
        '</div>' +
        '<div class="ferti-dist-panel">' +
          '<h4>' + escapeHtml(t('dist_h3', '3. Resultado')) + ' (' + escapeHtml(unit) + ' ' + escapeHtml(t('dist_per_stage', 'por etapa')) + ')</h4>' +
          '<div class="ferti-dist-scroll"><table class="data ferti-dist-table" id="fertiDistKgTable"></table></div>' +
        '</div>' +
        '<div class="ferti-dist-panel">' +
          '<h4>' + escapeHtml(t('dist_h4', '4. Gráfica')) + '</h4>' +
          '<div class="ferti-dist-seg" role="group">' +
            '<button type="button" id="fertiDistChartMacro" class="is-on">' + escapeHtml(t('dist_macros', 'Macros')) + '</button>' +
            '<button type="button" id="fertiDistChartMicro">' + escapeHtml(t('dist_micros', 'Micros')) + '</button>' +
          '</div>' +
          '<div id="fertiDistChartWrap" class="ferti-dist-chart"><canvas id="fertiDistChart"></canvas></div>' +
        '</div>' +
      '</div>' +
      '<div class="ferti-dist-modal" id="fertiDistApplyModal" hidden>' +
        '<div class="ferti-dist-modal-box" role="dialog">' +
          '<h4>' + escapeHtml(t('dist_apply_other', 'Aplicar a otro proyecto')) + '</h4>' +
          '<p class="ferti-dist-hint">' + escapeHtml(t('dist_apply_hint', 'Copia etapas y % a ese expediente. Las dosis salen de su requerimiento.')) + '</p>' +
          '<select id="fertiDistApplySelect"></select>' +
          '<div class="ferti-dist-actions" style="margin-top:12px;">' +
            '<button type="button" class="btn btn-info btn-sm" id="fertiDistApplyGo">' + escapeHtml(t('dist_apply_go', 'Aplicar')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="fertiDistApplyCancel">' + escapeHtml(t('cancel', 'Cancelar')) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderPresetSelect() {
    var sel = document.getElementById('fertiDistPresetSelect');
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">' + escapeHtml(t('dist_pick_curve', '— Elegir curva —')) + '</option>';
    presetsList.slice().sort(function (a, b) {
      return String(a.title || '').localeCompare(String(b.title || ''), 'es');
    }).forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title || p.id;
      sel.appendChild(opt);
    });
    if (presetsList.some(function (p) { return p.id === current; })) sel.value = current;
    var del = document.getElementById('fertiDistDeletePreset');
    if (del) del.disabled = !sel.value;
  }

  function renderTotals() {
    var el = document.getElementById('fertiDistTotals');
    if (!el) return;
    el.innerHTML = NUTS.map(function (n) {
      return '<span class="ferti-dist-chip"><strong>' + escapeHtml(nutLabel(n)) + '</strong> ' + escapeHtml(fmtDose(totals[n.id] || 0, n.ferti)) + '</span>';
    }).join('');
  }

  function renderPct() {
    var table = document.getElementById('fertiDistPctTable');
    if (!table) return;
    var head = '<thead><tr><th>' + escapeHtml(t('dist_stage', 'Etapa')) + '</th>' +
      NUTS.map(function (n) { return '<th>' + escapeHtml(nutLabel(n)) + ' %</th>'; }).join('') +
      '<th></th></tr></thead>';
    var body = '<tbody>' + stages.map(function (st, ri) {
      var cells = NUTS.map(function (n) {
        var v = pct[n.id] && pct[n.id][ri] != null ? pct[n.id][ri] : 0;
        return '<td><input type="number" class="ferti-dist-pct" data-id="' + n.id + '" data-ri="' + ri + '" value="' + v + '" step="0.1" min="0" max="100"></td>';
      }).join('');
      return '<tr><td><input type="text" class="ferti-dist-stage" data-ri="' + ri + '" value="' + escapeHtml(stageLabel(st)) + '" list="fertiDistStagePresets"></td>' +
        cells +
        '<td><button type="button" class="btn btn-ghost btn-sm ferti-dist-rm" data-ri="' + ri + '"' + (stages.length <= 1 ? ' disabled' : '') + '>' + escapeHtml(t('dist_remove_stage', 'Quitar')) + '</button></td></tr>';
    }).join('') + '</tbody>';
    var footCells = NUTS.map(function (n) {
      var s = round1(sumPct(n.id));
      var ok = Math.abs(s - 100) <= 0.15;
      return '<td class="' + (ok ? 'ok' : 'bad') + '">' + s + '</td>';
    }).join('');
    var foot = '<tfoot><tr><th>Σ</th>' + footCells + '<th></th></tr></tfoot>';
    table.innerHTML = head + body + foot;
    refreshPctSums();
  }

  function refreshPctSums() {
    var table = document.getElementById('fertiDistPctTable');
    var warn = document.getElementById('fertiDistWarn');
    if (table) {
      var tds = table.querySelectorAll('tfoot td');
      NUTS.forEach(function (n, i) {
        if (!tds[i]) return;
        var s = round1(sumPct(n.id));
        var ok = Math.abs(s - 100) <= 0.15;
        tds[i].textContent = String(s);
        tds[i].className = ok ? 'ok' : 'bad';
      });
    }
    var bad = NUTS.some(function (n) { return Math.abs(sumPct(n.id) - 100) > 0.15; });
    if (warn) {
      warn.hidden = !bad;
      warn.textContent = bad ? t('dist_sum_warn', 'La suma de % por nutriente debe ser 100%.') : '';
    }
  }

  function renderKg() {
    var table = document.getElementById('fertiDistKgTable');
    if (!table) return;
    var head = '<thead><tr><th>' + escapeHtml(t('dist_stage', 'Etapa')) + '</th>' +
      NUTS.map(function (n) { return '<th>' + escapeHtml(nutLabel(n)) + '</th>'; }).join('') + '</tr></thead>';
    var body = '<tbody>' + stages.map(function (st, ri) {
      var cells = NUTS.map(function (n) {
        var kg = (totals[n.id] || 0) * ((parseFloat(pct[n.id] && pct[n.id][ri]) || 0) / 100);
        return '<td>' + escapeHtml(fmtDose(kg, n.ferti)) + '</td>';
      }).join('');
      return '<tr><td>' + escapeHtml(stageLabel(st)) + '</td>' + cells + '</tr>';
    }).join('') + '</tbody>';
    table.innerHTML = head + body;
  }

  function ensureChartJs(cb) {
    if (w.Chart) { cb(); return; }
    if (document.getElementById('npChartJs')) {
      document.getElementById('npChartJs').addEventListener('load', cb, { once: true });
      return;
    }
    var s = document.createElement('script');
    s.id = 'npChartJs';
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function renderChart() {
    var canvas = document.getElementById('fertiDistChart');
    if (!canvas || canvas.clientWidth < 40) return;
    ensureChartJs(function () {
      if (!w.Chart || !document.getElementById('fertiDistChart')) return;
      var filtered = NUTS.filter(function (n) {
        return chartGroup === 'macro' ? MACRO[n.id] : !MACRO[n.id];
      });
      var labels = stages.map(stageLabel);
      var datasets = filtered.map(function (n, i) {
        return {
          label: nutLabel(n),
          data: stages.map(function (_, ri) {
            var kgSi = (totals[n.id] || 0) * ((parseFloat(pct[n.id] && pct[n.id][ri]) || 0) / 100);
            return doseShownNumber(kgSi, n.ferti);
          }),
          borderColor: COLORS[i % COLORS.length],
          backgroundColor: COLORS[i % COLORS.length] + '22',
          tension: 0.35,
          fill: false,
          pointRadius: 3
        };
      });
      if (chartInst) chartInst.destroy();
      chartInst = new w.Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          resizeDelay: 120,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12 } } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: doseUnit() } },
            x: { ticks: { maxRotation: 40 } }
          }
        }
      });
    });
  }

  function renderAll() {
    var title = document.getElementById('fertiDistTitle');
    if (title) title.textContent = '📊 ' + curveTitle();
    renderPresetSelect();
    renderTotals();
    renderPct();
    renderKg();
    renderChart();
  }

  function bind() {
    var host = hostEl();
    if (!host) return;

    if (host.dataset.delegated !== '1') {
      host.dataset.delegated = '1';
      host.addEventListener('input', function (ev) {
        var el = ev.target;
        if (el.classList.contains('ferti-dist-pct')) {
          var id = el.getAttribute('data-id');
          var ri = parseInt(el.getAttribute('data-ri'), 10);
          if (!pct[id]) pct[id] = equalSplit(stages.length);
          pct[id][ri] = parseFloat(el.value) || 0;
          scheduleSave();
          refreshPctSums();
          renderKg();
          renderChart();
        }
        if (el.classList.contains('ferti-dist-stage')) {
          var si = parseInt(el.getAttribute('data-ri'), 10);
          stages[si] = canonicalStage(el.value);
          scheduleSave();
        }
      });
      host.addEventListener('change', function (ev) {
        if (ev.target && ev.target.id === 'fertiDistPresetSelect') {
          var del = document.getElementById('fertiDistDeletePreset');
          if (del) del.disabled = !ev.target.value;
          var id = ev.target.value;
          if (!id) return;
          var p = null;
          for (var i = 0; i < presetsList.length; i++) {
            if (presetsList[i].id === id) { p = presetsList[i]; break; }
          }
          if (!p || !p.state) return;
          applyPctFromState(p.state);
          scheduleSave();
          renderAll();
        }
      });
      host.addEventListener('click', function (ev) {
        var rm = ev.target.closest && ev.target.closest('.ferti-dist-rm');
        if (rm) {
          if (stages.length <= 1) return;
          var ri = parseInt(rm.getAttribute('data-ri'), 10);
          stages.splice(ri, 1);
          NUTS.forEach(function (n) {
            if (pct[n.id]) pct[n.id].splice(ri, 1);
          });
          ensurePct();
          scheduleSave();
          renderAll();
        }
      });
    }

    var add = document.getElementById('fertiDistAddStage');
    if (add) add.addEventListener('click', function () {
      stages.push('Nueva etapa');
      NUTS.forEach(function (n) {
        var arr = pct[n.id] || [];
        if (!arr.length) {
          pct[n.id] = equalSplit(stages.length);
          return;
        }
        var last = parseFloat(arr[arr.length - 1]) || 0;
        var a = round1(last / 2);
        arr[arr.length - 1] = a;
        arr.push(round1(last - a));
      });
      scheduleSave();
      renderAll();
    });

    var saveBtn = document.getElementById('fertiDistSavePreset');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var inp = document.getElementById('fertiDistPresetTitle');
      var title = inp && inp.value ? inp.value.trim() : '';
      if (!title) title = curveTitle();
      title = title.slice(0, 120);
      var st = snapshotState();
      st.title = title;
      presetsList.push({
        id: 'pex_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
        title: title,
        state: st,
        savedAt: Date.now()
      });
      if (inp) inp.value = '';
      persistPresetsBucket();
      renderPresetSelect();
    });

    var delBtn = document.getElementById('fertiDistDeletePreset');
    if (delBtn) delBtn.addEventListener('click', function () {
      var sel = document.getElementById('fertiDistPresetSelect');
      if (!sel || !sel.value) return;
      var id = sel.value;
      var titleDel = '';
      presetsList.forEach(function (p) { if (p.id === id) titleDel = p.title; });
      if (!confirm(t('dist_confirm_del', '¿Eliminar la curva «') + titleDel + t('dist_confirm_del_2', '» del catálogo?'))) return;
      presetsList = presetsList.filter(function (p) { return p.id !== id; });
      persistPresetsBucket();
      renderPresetSelect();
    });

    var applyBtn = document.getElementById('fertiDistApplyOther');
    if (applyBtn) applyBtn.addEventListener('click', openApplyModal);
    var cancel = document.getElementById('fertiDistApplyCancel');
    if (cancel) cancel.addEventListener('click', closeApplyModal);
    var go = document.getElementById('fertiDistApplyGo');
    if (go) go.addEventListener('click', applyToSelectedProject);

    var macro = document.getElementById('fertiDistChartMacro');
    var micro = document.getElementById('fertiDistChartMicro');
    if (macro) macro.addEventListener('click', function () {
      chartGroup = 'macro';
      macro.classList.add('is-on');
      if (micro) micro.classList.remove('is-on');
      renderChart();
    });
    if (micro) micro.addEventListener('click', function () {
      chartGroup = 'micro';
      micro.classList.add('is-on');
      if (macro) macro.classList.remove('is-on');
      renderChart();
    });

    fillStageDatalist(host);
  }

  function fillStageDatalist(host) {
    var prev = document.getElementById('fertiDistStagePresets');
    if (prev) prev.remove();
    var dl = document.createElement('datalist');
    dl.id = 'fertiDistStagePresets';
    STAGE_SUGGEST.forEach(function (s) {
      var o = document.createElement('option');
      o.value = stageLabel(s);
      dl.appendChild(o);
    });
    (host || hostEl()).appendChild(dl);
  }

  function listOtherProjects() {
    var cur = projectId();
    var list = [];
    try {
      if (w.projectManager && typeof w.projectManager.getAllProjects === 'function') {
        list = w.projectManager.getAllProjects() || [];
      }
    } catch (e) {}
    return list.filter(function (p) { return p && p.id && p.id !== cur; });
  }

  function destReqTotals(dest) {
    var out = {};
    NUTS.forEach(function (n) { out[n.id] = 0; });
    try {
      var req = dest && dest.fertirriego && dest.fertirriego.requirements;
      if (!req) return out;
      NUTS.forEach(function (n) {
        var adj = req.adjustment && typeof req.adjustment[n.ferti] === 'number' ? req.adjustment[n.ferti] : 0;
        var eff = req.efficiency && typeof req.efficiency[n.ferti] === 'number' ? req.efficiency[n.ferti] : 0;
        var div = eff > 0 ? eff / 100 : 1;
        out[n.id] = div ? adj / div : 0;
      });
    } catch (e) {}
    return out;
  }

  function openApplyModal() {
    var modal = document.getElementById('fertiDistApplyModal');
    var sel = document.getElementById('fertiDistApplySelect');
    if (!modal || !sel) return;
    var others = listOtherProjects();
    sel.innerHTML = others.length
      ? others.map(function (p) {
          return '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.name || p.id) + '</option>';
        }).join('')
      : '<option value="">' + escapeHtml(t('dist_no_other', 'No hay otros proyectos')) + '</option>';
    modal.hidden = false;
  }
  function closeApplyModal() {
    var modal = document.getElementById('fertiDistApplyModal');
    if (modal) modal.hidden = true;
  }
  function applyToSelectedProject() {
    var sel = document.getElementById('fertiDistApplySelect');
    var destId = sel && sel.value;
    if (!destId) return;
    var key = 'nutriplant_project_' + destId;
    var dest = {};
    try { dest = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { dest = {}; }
    if (dest.calculators && dest.calculators.extraccionEtapa) {
      if (!confirm(t('dist_replace_warn', 'Ese proyecto ya tiene distribución. ¿Reemplazar etapas y %?'))) return;
    }
    var reqTotals = destReqTotals(dest);
    var state = snapshotState();
    state.title = curveTitle(destId);
    state.nutrients = NUTS.map(function (n) {
      return { id: n.id, label: n.label, total: reqTotals[n.id] || 0, optional: false };
    });
    if (!dest.calculators || typeof dest.calculators !== 'object') dest.calculators = {};
    dest.calculators.extraccionEtapa = state;
    dest.updatedAt = new Date().toISOString();
    try { localStorage.setItem(key, JSON.stringify(dest)); } catch (e2) {}
    try {
      if (typeof w.nutriplantSyncProjectToCloud === 'function') w.nutriplantSyncProjectToCloud(destId, dest);
    } catch (e3) {}
    closeApplyModal();
    alert(t('dist_applied', 'Curva aplicada a') + ' ' + projectName(destId));
  }

  async function mount(realRequirement) {
    var host = hostEl();
    if (!host) return;
    if (realRequirement) applyTotals(realRequirement);
    var pid = projectId();
    var needBoot = !host.dataset.ready || host.dataset.pid !== pid;
    if (needBoot) {
      mounted = false;
      host.dataset.bound = '';
      booting = true;
      host.innerHTML = shellHtml();
      bind();
      stages = DEFAULT_STAGES.slice();
      pct = {};
      ensurePct();
      NUTS.forEach(function (n) {
        if (totals[n.id] == null) totals[n.id] = 0;
      });
      var saved = await loadProjectCurve();
      if (saved) applyPctFromState(saved);
      await hydratePresets();
      host.dataset.ready = '1';
      host.dataset.pid = pid;
      mounted = true;
      booting = false;
      renderAll();
      return;
    }
    renderAll();
  }

  w.fertiDistMount = mount;
  w.fertiDistSyncFromRequirement = function (realRequirement) {
    applyTotals(realRequirement || {});
    if (!hostEl() || !hostEl().dataset.ready) {
      mount(realRequirement);
      return;
    }
    renderAll();
    scheduleSave();
  };

  function rebuildPresentation() {
    var host = hostEl();
    if (!host || host.dataset.ready !== '1') return;
    if (chartInst) {
      try { chartInst.destroy(); } catch (e) {}
      chartInst = null;
    }
    host.innerHTML = shellHtml();
    bind();
    renderAll();
  }
  w.addEventListener('np:prefs-changed', rebuildPresentation);
})(window);
