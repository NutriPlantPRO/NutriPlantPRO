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
  var PHENO_STAGES = ['Brotación', 'Establecimiento', 'Vegetativo', 'Prefloración', 'Floración', 'Amarre', 'Llenado', 'Maduración', 'Cosecha'];
  var DEFAULT_PCT = {
    n: [10, 30, 20, 30, 10],
    p: [15, 25, 25, 20, 15],
    k: [5, 20, 25, 35, 15],
    ca: [12, 28, 22, 28, 10],
    mg: [12, 28, 22, 28, 10]
  };
  var COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#db2777', '#0d9488', '#4f46e5', '#64748b', '#059669', '#b45309', '#be185d'];
  var POINT_STYLES = {
    n: 'circle', p: 'rect', k: 'triangle', ca: 'rectRot', mg: 'rectRounded', s: 'star',
    fe: 'circle', mn: 'rect', b: 'triangle', zn: 'rectRot', cu: 'star', mo: 'crossRot', si: 'rectRounded'
  };
  var STAGE_EN = {
    'Brotación': 'Bud break', 'Establecimiento': 'Establishment', 'Vegetativo': 'Vegetative',
    'Prefloración': 'Pre-flowering', 'Floración': 'Flowering', 'Amarre': 'Fruit set',
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
  var programPushTimer = null;
  var distProgramSync = false;
  var chartRetryTimer = null;
  var chartSizeTimer = null;
  var chartInst = null;
  var chartGroup = 'macro';
  var chartDrag = null;
  var chartFocusId = null;
  var chartPendingClear = false;
  var mounted = false;
  var booting = false;
  var lastAutoTitle = '';
  var axis = 'semana';
  var waterDepthByStageM3ha = [];

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
    var week = /^(?:Semana|Week)\s+(\d+)$/i.exec(raw);
    if (week) return t('week', 'Semana') + ' ' + week[1];
    var month = /^(?:Mes|Month)\s+(\d+)$/i.exec(raw);
    if (month) return t('month', 'Mes') + ' ' + month[1];
    if (w.NpFertigationUI && typeof w.NpFertigationUI.stageName === 'function') {
      var fromUi = w.NpFertigationUI.stageName(raw);
      if (fromUi && fromUi !== raw) return fromUi;
    }
    return isEnglish() && STAGE_EN[raw] ? STAGE_EN[raw] : raw;
  }
  function canonicalStage(display) {
    var value = String(display || '');
    var week = /^(?:Semana|Week)\s+(\d+)$/i.exec(value);
    if (week) return 'Semana ' + week[1];
    var month = /^(?:Mes|Month)\s+(\d+)$/i.exec(value);
    if (month) return 'Mes ' + month[1];
    for (var i = 0; i < STAGE_CANON.length; i++) {
      if (STAGE_CANON[i] === value || stageLabel(STAGE_CANON[i]) === value) return STAGE_CANON[i];
    }
    var keys = Object.keys(STAGE_EN);
    for (var j = 0; j < keys.length; j++) {
      if (STAGE_EN[keys[j]] === value) return keys[j];
    }
    return value;
  }
  function detectAxis(list) {
    var rows = Array.isArray(list) ? list : [];
    if (!rows.length) return 'semana';
    var week = 0;
    var month = 0;
    rows.forEach(function (s) {
      if (/^(?:Semana|Week)\s+\d+$/i.test(String(s))) week += 1;
      else if (/^(?:Mes|Month)\s+\d+$/i.test(String(s))) month += 1;
    });
    if (week >= rows.length * 0.6) return 'semana';
    if (month >= rows.length * 0.6) return 'mes';
    return 'semana';
  }
  function axisLabel(ax) {
    if (ax === 'mes') return t('month', 'Mes');
    return t('week', 'Semana');
  }
  function addStageLabel() {
    return axis === 'mes' ? t('add_month', 'Agregar mes') : t('add_week', 'Agregar semana');
  }
  function isPeriodName(name) {
    return /^(?:Semana|Week|Mes|Month)\s+\d+$/i.test(String(name || ''));
  }
  function phenoNameForIndex(index) {
    return PHENO_STAGES[index] || (t('dist_stage', 'Etapa') + ' ' + (index + 1));
  }
  function normalizePhenologyNames() {
    stages = stages.map(function (s, i) {
      var canon = canonicalStage(s);
      if (isPeriodName(canon)) return phenoNameForIndex(i);
      return canon || phenoNameForIndex(i);
    });
  }
  function periodLabel(index) {
    return (axis === 'mes' ? t('month', 'Mes') : t('week', 'Semana')) + ' ' + (index + 1);
  }
  function rowDisplayLabel(st, index) {
    return stageLabel(st) + ' · ' + periodLabel(index);
  }
  function periodHeadLabel() {
    return axis === 'mes' ? t('month', 'Mes') : t('week', 'Semana');
  }
  function nextAddName() {
    for (var i = 0; i < PHENO_STAGES.length; i++) {
      if (stages.indexOf(PHENO_STAGES[i]) < 0) return PHENO_STAGES[i];
    }
    return 'Nueva etapa';
  }
  function stageOptionList() {
    return PHENO_STAGES.slice();
  }
  function stageSelectHtml(st, ri) {
    var canon = canonicalStage(st);
    if (isPeriodName(canon)) canon = phenoNameForIndex(ri);
    var opts = stageOptionList();
    if (canon && opts.indexOf(canon) < 0) opts = [canon].concat(opts);
    return '<select class="ferti-dist-stage" data-ri="' + ri + '">' +
      opts.map(function (v) {
        return '<option value="' + escapeHtml(v) + '"' + (v === canon ? ' selected' : '') + '>' + escapeHtml(stageLabel(v)) + '</option>';
      }).join('') + '</select>';
  }
  function stageCellHtml(st, ri) {
    return '<td class="ferti-dist-stage-cell"><div class="ferti-dist-stage-wrap">' +
      stageSelectHtml(st, ri) +
      '<button type="button" class="ferti-week-remove-btn ferti-dist-rm" data-ri="' + ri + '"' +
      (stages.length <= 1 ? ' disabled' : '') +
      ' title="' + escapeHtml(t('dist_remove_stage', 'Quitar')) + '">✕</button>' +
      '</div></td>';
  }
  function periodCellHtml(ri) {
    return '<td class="ferti-dist-period-cell">' + escapeHtml(String(ri + 1)) + '</td>';
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
    return t('dist_title_prefix', 'Distribución objetivo') + ' ' + projectName(id);
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
  function doseInputValue(oxideSi, fertiKey) {
    var shown = doseShownNumber(oxideSi, fertiKey);
    var digits = typeof fertiAdjDisplayDigits === 'function' ? fertiAdjDisplayDigits(fertiKey) : 2;
    if (!Number.isFinite(shown)) return '0';
    return String(Number(shown.toFixed(digits)));
  }
  function doseUnit() {
    return typeof fertiUnit === 'function' ? fertiUnit('dose_mass_area', 'kg/ha') : 'kg/ha';
  }
  function waterUnit() {
    return typeof fertiUnit === 'function' ? fertiUnit('volume_area', 'm³/ha') : 'm³/ha';
  }
  function waterInputValue(siValue) {
    if (typeof fertiInputFromSI === 'function') return fertiInputFromSI(siValue, 'volume_area', 4);
    var ui = w.NpFertigationUI;
    if (ui && typeof ui.inputFromSI === 'function') return ui.inputFromSI(siValue, 'volume_area', 4);
    return String(parseFloat(siValue) || 0);
  }
  function waterToSI(value) {
    var ui = w.NpFertigationUI;
    if (ui && typeof ui.toSI === 'function') return Math.max(0, ui.toSI(value, 'volume_area') || 0);
    return Math.max(0, parseFloat(value) || 0);
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
    while (waterDepthByStageM3ha.length < stages.length) waterDepthByStageM3ha.push(0);
    if (waterDepthByStageM3ha.length > stages.length) waterDepthByStageM3ha.length = stages.length;
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
      pct: JSON.parse(JSON.stringify(pct)),
      waterDepthByStageM3ha: waterDepthByStageM3ha.slice(),
      axis: axis
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
    if (state.axis === 'mes') {
      axis = 'mes';
    } else {
      axis = state.axis === 'semana' ? 'semana' : detectAxis(stages);
      if (axis !== 'mes') axis = 'semana';
    }
    normalizePhenologyNames();
    var savedWater = Array.isArray(state.waterDepthByStageM3ha)
      ? state.waterDepthByStageM3ha
      : (Array.isArray(state.chartWaterByStageM3ha) ? state.chartWaterByStageM3ha : null);
    if (savedWater) {
      waterDepthByStageM3ha = savedWater.slice(0, stages.length).map(function (v) {
        return Math.max(0, parseFloat(v) || 0);
      });
    }
    ensurePct();
  }

  function saveProjectCurve() {
    var pid = projectId();
    var uid = userId();
    if (!pid || !uid) return;
    var state = snapshotState();
    try {
      localStorage.setItem('np_extraccion_etapa_' + uid + '_' + pid, JSON.stringify(state));
    } catch (e0) {}
    try {
      if (typeof w.nutriplantSaveExtractionStageToCloud === 'function') {
        w.nutriplantSaveExtractionStageToCloud({ userId: uid, projectId: pid, state: state });
      }
    } catch (e) {}
    try {
      w.dispatchEvent(new CustomEvent('np:ferti-distribution-changed', {
        detail: { projectId: pid, updatedAt: state.updatedAt, axis: state.axis }
      }));
    } catch (e2) {}
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
        if (cloud && Array.isArray(cloud.stages)) {
          try { localStorage.setItem('np_extraccion_etapa_' + uid + '_' + pid, JSON.stringify(cloud)); } catch (e0) {}
          return cloud;
        }
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
        '<p class="ferti-dist-lead">' + escapeHtml(withUnit('Define la distribución objetivo del Requerimiento real por etapa o periodo. Después podrás compararla con un programa generado, editado o capturado manualmente.', 'dist_lead')) + '</p>' +
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
          '<div class="ferti-dist-panel-head">' +
            '<div class="ferti-dist-seg ferti-dist-axis" role="group" aria-label="' + escapeHtml(t('dist_axis', 'Periodo')) + '">' +
              '<button type="button" data-axis="semana">' + escapeHtml(t('week', 'Semana')) + '</button>' +
              '<button type="button" data-axis="mes">' + escapeHtml(t('month', 'Mes')) + '</button>' +
            '</div>' +
            '<h4>' + escapeHtml(t('dist_h2', '2. Distribución por etapa (% y dosis)')) + '</h4>' +
          '</div>' +
          '<p class="ferti-dist-hint">' + escapeHtml(withUnit('Elige Semana o Mes para el cálculo de fertirriego. Cada nutriente: % y {unit} editables. La suma de % debe ser 100%.', 'dist_h2_hint')) + '</p>' +
          '<div class="ferti-dist-scroll"><table class="data ferti-dist-table" id="fertiDistPctTable"></table></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="fertiDistAddStage">+ ' + escapeHtml(addStageLabel()) + '</button>' +
          '<div class="ferti-dist-water" id="fertiDistWaterByStage"></div>' +
          '<div class="ferti-dist-warn" id="fertiDistWarn" hidden></div>' +
        '</div>' +
        '<div class="ferti-dist-panel">' +
          '<h4>' + escapeHtml(t('dist_h4', '4. Gráfica')) + '</h4>' +
          '<div class="ferti-dist-seg" role="group">' +
            '<button type="button" id="fertiDistChartMacro" class="is-on">' + escapeHtml(t('dist_macros', 'Macros')) + '</button>' +
            '<button type="button" id="fertiDistChartMicro">' + escapeHtml(t('dist_micros', 'Micros')) + '</button>' +
          '</div>' +
          '<div id="fertiDistChartWrap" class="ferti-dist-chart"><canvas id="fertiDistChart"></canvas></div>' +
          '<p class="ferti-dist-hint" id="fertiDistChartHint">' + escapeHtml(t('dist_chart_drag', 'Arrastra un punto para ajustar el %. Toca una curva o su nombre abajo para resaltarla si está cerca de otras. Las demás etapas se compensan a 100%. El kg/ha se recalcula; si el programa tiene los mismos periodos, también se ajustan los fertilizantes.')) + '</p>' +
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

  function kgFor(n, ri) {
    return (totals[n.id] || 0) * ((parseFloat(pct[n.id] && pct[n.id][ri]) || 0) / 100);
  }

  function renderPct() {
    var table = document.getElementById('fertiDistPctTable');
    if (!table) return;
    var unit = doseUnit();
    var head = '<thead><tr><th rowspan="2" class="ferti-dist-stage-head">' + escapeHtml(t('dist_stage', 'Etapa')) + '</th>' +
      '<th rowspan="2" class="ferti-dist-period-head">' + escapeHtml(periodHeadLabel()) + '</th>' +
      NUTS.map(function (n) {
        return '<th colspan="2" class="ferti-dist-nut-start">' + escapeHtml(nutLabel(n)) + '</th>';
      }).join('') +
      '</tr><tr>' +
      NUTS.map(function () {
        return '<th class="ferti-dist-sub ferti-dist-nut-start">%</th><th class="ferti-dist-sub">' + escapeHtml(unit) + '</th>';
      }).join('') + '</tr></thead>';
    var body = '<tbody>' + stages.map(function (st, ri) {
      var cells = NUTS.map(function (n) {
        var v = pct[n.id] && pct[n.id][ri] != null ? pct[n.id][ri] : 0;
        return '<td class="ferti-dist-pct-cell ferti-dist-nut-start"><input type="number" class="ferti-dist-pct" data-id="' + n.id + '" data-ri="' + ri + '" value="' + v + '" step="0.1" min="0" max="100"></td>' +
          '<td class="ferti-dist-kg-cell"><input type="number" class="ferti-dist-kg-input" data-id="' + n.id + '" data-ri="' + ri + '" value="' + escapeHtml(doseInputValue(kgFor(n, ri), n.ferti)) + '" min="0" step="0.01"></td>';
      }).join('');
      return '<tr>' + stageCellHtml(st, ri) + periodCellHtml(ri) + cells + '</tr>';
    }).join('') + '</tbody>';
    var footCells = NUTS.map(function (n) {
      var s = round1(sumPct(n.id));
      var ok = Math.abs(s - 100) <= 0.15;
      return '<td colspan="2" class="ferti-dist-nut-start ' + (ok ? 'ok' : 'bad') + '">' + s + '%</td>';
    }).join('');
    var foot = '<tfoot><tr><th colspan="2">Σ</th>' + footCells + '</tr></tfoot>';
    table.innerHTML = head + body + foot;
    refreshPctSums();
  }

  function refreshKgCells() {
    var cells = document.querySelectorAll('#fertiDistPctTable .ferti-dist-kg-input');
    var active = document.activeElement;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i] === active) continue;
      var id = cells[i].getAttribute('data-id');
      var ri = parseInt(cells[i].getAttribute('data-ri'), 10);
      var n = nutFromId(id);
      if (!n) continue;
      cells[i].value = doseInputValue(kgFor(n, ri), n.ferti);
    }
  }

  function renderWaterByStage() {
    var host = document.getElementById('fertiDistWaterByStage');
    if (!host) return;
    ensurePct();
    host.innerHTML =
      '<div class="ferti-dist-water-head">' +
        '<h4>' + escapeHtml(t('dist_water_title', '3. Lámina de riego objetivo por etapa')) + ' (' + escapeHtml(waterUnit()) + ')</h4>' +
        '<p>' + escapeHtml(t('dist_water_help', 'Captúrala aquí para descontar proporcionalmente el aporte del análisis de agua y calcular ppm, meq/L y CE.')) + '</p>' +
      '</div>' +
      '<div class="ferti-dist-water-grid">' +
        stages.map(function (stage, i) {
          var period = periodLabel(i);
          return '<label><span>' + escapeHtml(stageLabel(stage)) +
            (period ? '<small>' + escapeHtml(period) + '</small>' : '') + '</span>' +
            '<input type="number" class="ferti-dist-water-input" data-ri="' + i + '" min="0" step="0.0001" value="' +
            escapeHtml(waterInputValue(waterDepthByStageM3ha[i] || 0)) + '"></label>';
        }).join('') +
      '</div>';
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
        tds[i].textContent = s + '%';
        tds[i].className = 'ferti-dist-nut-start ' + (ok ? 'ok' : 'bad');
      });
    }
    var bad = NUTS.some(function (n) { return Math.abs(sumPct(n.id) - 100) > 0.15; });
    if (warn) {
      warn.hidden = !bad;
      warn.textContent = bad ? t('dist_sum_warn', 'La suma de % por nutriente debe ser 100%.') : '';
    }
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

  function applyPctKeepSum100(id, ri, target) {
    ensurePct();
    var arr = pct[id];
    if (!arr || !arr.length) return;
    if (arr.length === 1) {
      arr[0] = 100;
      return;
    }
    target = round1(Math.max(0, Math.min(100, target)));
    var remain = round1(100 - target);
    var others = [];
    var i;
    for (i = 0; i < arr.length; i++) {
      if (i !== ri) others.push(i);
    }
    var weights = others.map(function (idx) { return Math.max(0, parseFloat(arr[idx]) || 0); });
    var wsum = weights.reduce(function (a, b) { return a + b; }, 0);
    arr[ri] = target;
    if (wsum <= 0.0001) {
      var base = round1(remain / others.length);
      var acc = 0;
      others.forEach(function (idx, k) {
        arr[idx] = k === others.length - 1 ? round1(remain - acc) : base;
        acc += arr[idx];
      });
      return;
    }
    var acc2 = 0;
    others.forEach(function (idx, k) {
      var v = k === others.length - 1
        ? round1(remain - acc2)
        : round1(remain * (weights[k] / wsum));
      if (v < 0) v = 0;
      arr[idx] = v;
      acc2 += v;
    });
  }

  function syncPctInputsFromData() {
    var inputs = document.querySelectorAll('#fertiDistPctTable .ferti-dist-pct');
    for (var i = 0; i < inputs.length; i++) {
      var id = inputs[i].getAttribute('data-id');
      var ri = parseInt(inputs[i].getAttribute('data-ri'), 10);
      if (pct[id] && pct[id][ri] != null) inputs[i].value = pct[id][ri];
    }
    refreshKgCells();
    refreshPctSums();
  }

  function nutFromId(id) {
    for (var i = 0; i < NUTS.length; i++) {
      if (NUTS[i].id === id) return NUTS[i];
    }
    return null;
  }

  function pctAt(id, ri) {
    return pct[id] && pct[id][ri] != null ? Number(pct[id][ri]) || 0 : 0;
  }
  function programKeyFor(n) {
    if (n.id === 'n') return 'N';
    if (n.id === 'p') return 'P2O5';
    if (n.id === 'k') return 'K2O';
    if (n.id === 'ca') return 'CaO';
    if (n.id === 'mg') return 'MgO';
    if (n.id === 's') return 'SO4';
    if (n.id === 'si') return 'SiO2';
    return n.ferti;
  }
  function canLinkProgram() {
    if (axis !== 'semana' && axis !== 'mes') return false;
    return typeof w.fertiApplyDistributionTargetsToProgram === 'function';
  }
  function pushDistToProgram(nutId) {
    if (distProgramSync || !canLinkProgram()) return;
    var n = nutId ? nutFromId(nutId) : null;
    var list = n ? [n] : NUTS.slice();
    distProgramSync = true;
    try {
      list.forEach(function (nut) {
        var oxideKg = stages.map(function (_, ri) {
          return kgFor(nut, ri);
        });
        w.fertiApplyDistributionTargetsToProgram(programKeyFor(nut), oxideKg);
      });
    } catch (e) {}
    distProgramSync = false;
  }
  function scheduleProgramPush(nutId) {
    if (programPushTimer) clearTimeout(programPushTimer);
    programPushTimer = setTimeout(function () { pushDistToProgram(nutId); }, 280);
  }
  function visiblePctMax() {
    var max = 0;
    NUTS.forEach(function (n) {
      if (chartGroup === 'macro' ? !MACRO[n.id] : MACRO[n.id]) return;
      stages.forEach(function (_, ri) {
        var v = pctAt(n.id, ri);
        if (v > max) max = v;
      });
    });
    return max;
  }
  function niceChartYMax(rawMax) {
    if (!(rawMax > 0)) return 25;
    if (rawMax >= 94.5) return 100;
    var padded = rawMax + 8;
    if (padded > 100) padded = 100;
    var step = padded <= 50 ? 5 : 10;
    var nice = Math.ceil(padded / step) * step;
    if (nice > 100) nice = 100;
    if (nice < 25) nice = 25;
    return nice;
  }
  function applyChartYScale(growOnly) {
    if (!chartInst || !chartInst.options || !chartInst.options.scales || !chartInst.options.scales.y) return;
    var next = niceChartYMax(visiblePctMax());
    var y = chartInst.options.scales.y;
    if (growOnly && y.max != null && next < Number(y.max)) return;
    y.min = 0;
    y.max = next;
    y.beginAtZero = true;
    y.suggestedMax = undefined;
    y.ticks = y.ticks || {};
    y.ticks.stepSize = next <= 50 ? 5 : 10;
  }
  function colorForNut(id) {
    for (var i = 0; i < NUTS.length; i++) {
      if (NUTS[i].id === id) return COLORS[i % COLORS.length];
    }
    return COLORS[0];
  }
  function hexToRgba(hex, a) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    if (!isFinite(n)) return 'rgba(37,99,235,' + a + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function applyDatasetFocusStyles(datasets) {
    var list = datasets || (chartInst && chartInst.data && chartInst.data.datasets) || [];
    var hasFocus = !!chartFocusId;
    list.forEach(function (ds) {
      var color = colorForNut(ds._nutId);
      var on = !hasFocus || ds._nutId === chartFocusId;
      ds.borderColor = on ? color : hexToRgba(color, 0.2);
      ds.backgroundColor = on ? color : hexToRgba(color, 0.2);
      ds.borderWidth = on ? (hasFocus ? 3.6 : 2.6) : 1.4;
      ds.pointRadius = on ? (hasFocus ? 7 : 5) : 3;
      ds.pointHoverRadius = on ? (hasFocus ? 9 : 7) : 4;
      ds.pointHitRadius = on ? (hasFocus ? 24 : 16) : 8;
      ds.pointBackgroundColor = on ? color : hexToRgba(color, 0.2);
      ds.pointBorderColor = on ? '#ffffff' : hexToRgba('#ffffff', 0.35);
      ds.pointBorderWidth = on ? 1.6 : 0.6;
      ds.order = on && hasFocus ? 12 : 0;
      ds.pointStyle = POINT_STYLES[ds._nutId] || 'circle';
    });
  }
  function setChartFocus(id) {
    var next = id && nutFromId(id) ? id : null;
    chartFocusId = next;
    applyDatasetFocusStyles();
    if (chartInst) {
      try { chartInst.update('none'); } catch (e) { try { chartInst.update(); } catch (e2) {} }
    }
    setChartHint('');
  }
  function defaultChartHint() {
    return t('dist_chart_drag', 'Arrastra un punto para ajustar el %. Toca una curva o su nombre abajo para resaltarla si está cerca de otras. Las demás etapas se compensan a 100%. El kg/ha se recalcula; si el programa tiene los mismos periodos, también se ajustan los fertilizantes.');
  }
  function updateChartPctSeries(nutId) {
    if (!chartInst || !chartInst.data || !chartInst.data.datasets) return;
    chartInst.data.datasets.forEach(function (ds) {
      if (nutId && ds._nutId !== nutId) return;
      ds.data = stages.map(function (_, idx) { return pctAt(ds._nutId, idx); });
    });
    applyChartYScale(!!chartDrag);
    try { chartInst.update('none'); } catch (e) { chartInst.update(); }
  }

  function setChartHint(text) {
    var el = document.getElementById('fertiDistChartHint');
    if (!el) return;
    if (text) {
      el.textContent = text;
      return;
    }
    if (chartFocusId) {
      var n = nutFromId(chartFocusId);
      el.textContent = (n ? nutLabel(n) : '') + ' — ' + t('dist_chart_focus', 'Resaltado. Arrastra sus puntos; toca su nombre abajo o el fondo de la gráfica para ver todas las curvas.');
      return;
    }
    el.textContent = defaultChartHint();
  }

  function applyChartDragValue(nutId, ri, displayedPct) {
    var n = nutFromId(nutId);
    if (!n) return;
    applyPctKeepSum100(nutId, ri, displayedPct);
    syncPctInputsFromData();
    updateChartPctSeries(nutId);
  }

  function bindChartDrag(canvas) {
    if (!canvas || canvas._fertiDistDragBound) return;
    canvas._fertiDistDragBound = true;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', function (event) {
      chartPendingClear = false;
      if (!chartInst || typeof chartInst.getElementsAtEventForMode !== 'function') return;
      var lg = chartInst.legend;
      if (lg) {
        var box = canvas.getBoundingClientRect();
        var lx = event.clientX - box.left;
        var ly = event.clientY - box.top;
        if (lx >= lg.left && lx <= lg.right && ly >= lg.top && ly <= lg.bottom) return;
      }
      var hits = chartInst.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true) || [];
      if (!Array.isArray(hits)) hits = Array.prototype.slice.call(hits);
      if (chartFocusId && hits.length) {
        var focusedHits = hits.filter(function (h) {
          var row = chartInst.data.datasets[h.datasetIndex];
          return row && row._nutId === chartFocusId;
        });
        if (focusedHits.length) hits = focusedHits;
      }
      if (!hits.length) {
        chartPendingClear = true;
        return;
      }
      var hit = hits[0];
      var ds = chartInst.data.datasets[hit.datasetIndex];
      if (!ds || !ds._nutId) return;
      if (!nutFromId(ds._nutId)) return;
      chartDrag = {
        canvas: canvas,
        nutId: ds._nutId,
        ri: hit.index,
        label: ds.label,
        x: event.clientX,
        y: event.clientY,
        moved: false
      };
      try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
      var wrap = document.getElementById('fertiDistChartWrap');
      if (wrap) wrap.classList.add('is-dragging');
      canvas.style.cursor = 'grabbing';
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', function (event) {
      if (!chartDrag || chartDrag.canvas !== canvas) return;
      if (!chartDrag.moved) {
        var dx = event.clientX - chartDrag.x;
        var dy = event.clientY - chartDrag.y;
        if ((dx * dx) + (dy * dy) < 25) return;
        chartDrag.moved = true;
        if (chartFocusId !== chartDrag.nutId) setChartFocus(chartDrag.nutId);
      }
      var scale = chartInst && chartInst.scales && chartInst.scales.y;
      if (!scale || typeof scale.getValueForPixel !== 'function') return;
      var rect = canvas.getBoundingClientRect();
      var displayed = Math.max(0, Math.min(100, scale.getValueForPixel(event.clientY - rect.top)));
      applyChartDragValue(chartDrag.nutId, chartDrag.ri, displayed);
      var n = nutFromId(chartDrag.nutId);
      var kgTxt = n ? fmtDose(kgFor(n, chartDrag.ri), n.ferti) : '';
      var pctTxt = pct[chartDrag.nutId] && pct[chartDrag.nutId][chartDrag.ri] != null
        ? pct[chartDrag.nutId][chartDrag.ri] : '';
      setChartHint(
        stageLabel(stages[chartDrag.ri] || '') + ' · ' + (chartDrag.label || '') +
        ': ' + pctTxt + '% · ' + kgTxt + ' ' + doseUnit()
      );
      event.preventDefault();
    });
    function finish(event) {
      if (chartPendingClear && !chartDrag) {
        chartPendingClear = false;
        setChartFocus(null);
        return;
      }
      if (!chartDrag || chartDrag.canvas !== canvas) return;
      var nutId = chartDrag.nutId;
      var moved = !!chartDrag.moved;
      chartDrag = null;
      try { canvas.releasePointerCapture(event.pointerId); } catch (e) {}
      var wrap = document.getElementById('fertiDistChartWrap');
      if (wrap) wrap.classList.remove('is-dragging');
      canvas.style.cursor = '';
      setChartFocus(nutId);
      applyChartYScale(false);
      try { chartInst.update('none'); } catch (e) { if (chartInst) chartInst.update(); }
      if (moved) {
        scheduleSave();
        pushDistToProgram(nutId);
      }
    }
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
  }

  function chartCanvasReady() {
    var canvas = document.getElementById('fertiDistChart');
    if (!canvas) return false;
    var wrap = document.getElementById('fertiDistChartWrap') || canvas.parentElement;
    var width = Math.max(canvas.clientWidth || 0, wrap ? wrap.clientWidth || 0 : 0);
    var height = Math.max(canvas.clientHeight || 0, wrap ? wrap.clientHeight || 0 : 0);
    return width >= 40 && height >= 40;
  }
  function scheduleChartRender() {
    if (chartRetryTimer) return;
    var tries = 0;
    function tick() {
      chartRetryTimer = null;
      if (chartCanvasReady()) {
        renderChart();
        return;
      }
      tries += 1;
      if (tries < 24) {
        chartRetryTimer = setTimeout(tick, tries < 6 ? 50 : 120);
      }
    }
    chartRetryTimer = setTimeout(tick, 0);
  }
  function observeChartHost() {
    var wrap = document.getElementById('fertiDistChartWrap');
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    if (wrap._fertiDistObs) return;
    wrap._fertiDistObs = true;
    var observer = new ResizeObserver(function () {
      if (chartDrag) return;
      if (chartSizeTimer) clearTimeout(chartSizeTimer);
      chartSizeTimer = setTimeout(function () {
        if (!chartCanvasReady()) return;
        if (!chartInst) renderChart();
        else {
          try { chartInst.resize(); } catch (e) { renderChart(); }
        }
      }, 50);
    });
    observer.observe(wrap);
  }
  function renderChart() {
    var canvas = document.getElementById('fertiDistChart');
    if (!canvas) return;
    observeChartHost();
    if (!chartCanvasReady()) {
      ensureChartJs(function () {});
      scheduleChartRender();
      return;
    }
    if (chartDrag) return;
    ensureChartJs(function () {
      if (!w.Chart || !document.getElementById('fertiDistChart')) return;
      if (chartDrag) return;
      var filtered = NUTS.filter(function (n) {
        return chartGroup === 'macro' ? MACRO[n.id] : !MACRO[n.id];
      });
      var labels = stages.map(function (st, i) { return rowDisplayLabel(st, i); });
      var datasets = filtered.map(function (n) {
        var color = colorForNut(n.id);
        return {
          label: nutLabel(n),
          _nutId: n.id,
          data: stages.map(function (_, ri) {
            return pctAt(n.id, ri);
          }),
          borderColor: color,
          backgroundColor: color,
          tension: 0.32,
          fill: false,
          pointStyle: POINT_STYLES[n.id] || 'circle'
        };
      });
      applyDatasetFocusStyles(datasets);
      var yMax = niceChartYMax(visiblePctMax());
      if (chartInst) chartInst.destroy();
      chartInst = new w.Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          resizeDelay: 120,
          interaction: { mode: 'nearest', intersect: true },
          onHover: function (evt, elements) {
            var target = canvas;
            if (chartDrag) target.style.cursor = 'grabbing';
            else target.style.cursor = (elements && elements.length) ? 'grab' : 'pointer';
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 16,
                boxHeight: 12,
                padding: 14,
                usePointStyle: true,
                pointStyleWidth: 12,
                font: { size: 12, weight: '600' },
                generateLabels: function (chart) {
                  var items = w.Chart.defaults.plugins.legend.labels.generateLabels(chart);
                  items.forEach(function (item) {
                    var row = chart.data.datasets[item.datasetIndex];
                    if (!row) return;
                    var color = colorForNut(row._nutId);
                    item.fillStyle = color;
                    item.strokeStyle = color;
                    item.lineWidth = 0;
                    item.hidden = false;
                    item.pointStyle = POINT_STYLES[row._nutId] || 'rect';
                    item.fontStyle = row._nutId === chartFocusId ? 'bold' : 'normal';
                  });
                  return items;
                }
              },
              onClick: function (_evt, item, legend) {
                var row = legend.chart.data.datasets[item.datasetIndex];
                if (!row || !row._nutId) return;
                setChartFocus(chartFocusId === row._nutId ? null : row._nutId);
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var nut = nutFromId(ctx.dataset._nutId);
                  var pctVal = Number(ctx.parsed && ctx.parsed.y) || 0;
                  var kgTxt = nut ? fmtDose(kgFor(nut, ctx.dataIndex), nut.ferti) : '';
                  return (ctx.dataset.label || '') + ': ' + pctVal.toFixed(1) + '% · ' + kgTxt + ' ' + doseUnit();
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              min: 0,
              max: yMax,
              ticks: { stepSize: yMax <= 50 ? 5 : 10 },
              title: { display: true, text: '%' }
            },
            x: { ticks: { maxRotation: 40 } }
          }
        }
      });
      bindChartDrag(canvas);
    });
  }

  function fillPresetTitle() {
    var inp = document.getElementById('fertiDistPresetTitle');
    if (!inp) return;
    var next = curveTitle().slice(0, 80);
    var current = (inp.value || '').trim();
    if (!current || current === lastAutoTitle) inp.value = next;
    lastAutoTitle = next;
  }

  function syncAxisUi() {
    var wrap = document.querySelector('#fertiDistribucionBlock .ferti-dist-axis');
    if (wrap) {
      var buttons = wrap.querySelectorAll('[data-axis]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle('is-on', buttons[i].getAttribute('data-axis') === axis);
      }
    }
    var add = document.getElementById('fertiDistAddStage');
    if (add) add.textContent = '+ ' + addStageLabel();
  }

  function renderAll() {
    var title = document.getElementById('fertiDistTitle');
    if (title) title.textContent = '📊 ' + curveTitle();
    fillPresetTitle();
    syncAxisUi();
    renderPresetSelect();
    renderTotals();
    renderPct();
    renderWaterByStage();
    renderChart();
    observeChartHost();
    scheduleChartRender();
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
          refreshKgCells();
          updateChartPctSeries(id);
          scheduleProgramPush(id);
          return;
        }
        if (el.classList.contains('ferti-dist-kg-input')) {
          var kid = el.getAttribute('data-id');
          var kri = parseInt(el.getAttribute('data-ri'), 10);
          var kn = nutFromId(kid);
          if (!kn) return;
          var totalShown = doseShownNumber(totals[kn.id] || 0, kn.ferti);
          if (totalShown > 1e-9) {
            applyPctKeepSum100(kid, kri, (Math.max(0, parseFloat(el.value) || 0) / totalShown) * 100);
            syncPctInputsFromData();
            updateChartPctSeries(kid);
            scheduleProgramPush(kid);
            scheduleSave();
          }
          return;
        }
        if (el.classList.contains('ferti-dist-water-input')) {
          var wi = parseInt(el.getAttribute('data-ri'), 10);
          waterDepthByStageM3ha[wi] = waterToSI(el.value);
          scheduleSave();
        }
      });
      host.addEventListener('change', function (ev) {
        var el = ev.target;
        if (el && el.classList.contains('ferti-dist-stage')) {
          var si = parseInt(el.getAttribute('data-ri'), 10);
          stages[si] = canonicalStage(el.value);
          scheduleSave();
          renderWaterByStage();
          renderChart();
          return;
        }
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
        var axisBtn = ev.target.closest && ev.target.closest('[data-axis]');
        if (axisBtn && axisBtn.closest('.ferti-dist-axis')) {
          setAxis(axisBtn.getAttribute('data-axis'));
          return;
        }
        var rm = ev.target.closest && ev.target.closest('.ferti-dist-rm');
        if (rm) {
          if (stages.length <= 1) return;
          var ri = parseInt(rm.getAttribute('data-ri'), 10);
          NUTS.forEach(function (n) {
            var arr = pct[n.id];
            if (!arr || !arr.length) return;
            var rmv = parseFloat(arr[ri]) || 0;
            if (ri > 0) {
              arr[ri - 1] = round1((parseFloat(arr[ri - 1]) || 0) + rmv);
            } else if (arr.length > 1) {
              arr[1] = round1((parseFloat(arr[1]) || 0) + rmv);
            }
            arr.splice(ri, 1);
          });
          waterDepthByStageM3ha.splice(ri, 1);
          stages.splice(ri, 1);
          ensurePct();
          scheduleSave();
          renderAll();
        }
      });
    }

    var add = document.getElementById('fertiDistAddStage');
    if (add) add.addEventListener('click', function () {
      stages.push(nextAddName());
      waterDepthByStageM3ha.push(0);
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
      delete st.waterDepthByStageM3ha;
      presetsList.push({
        id: 'pex_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
        title: title,
        state: st,
        savedAt: Date.now()
      });
      persistPresetsBucket();
      renderPresetSelect();
      lastAutoTitle = '';
      fillPresetTitle();
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
      if (chartFocusId && !MACRO[chartFocusId]) chartFocusId = null;
      renderChart();
      setChartHint('');
    });
    if (micro) micro.addEventListener('click', function () {
      chartGroup = 'micro';
      micro.classList.add('is-on');
      if (macro) macro.classList.remove('is-on');
      if (chartFocusId && MACRO[chartFocusId]) chartFocusId = null;
      renderChart();
      setChartHint('');
    });
  }

  function syncProgramTimeUnit(next) {
    if (next !== 'semana' && next !== 'mes') return;
    if (typeof w.setFertiTimeUnit !== 'function') return;
    try { w.setFertiTimeUnit(next, { fromDistribution: true }); } catch (e) {}
  }

  function setAxis(next, opts) {
    opts = opts || {};
    next = next === 'mes' ? 'mes' : 'semana';
    if (next === axis) return false;
    axis = next;
    normalizePhenologyNames();
    if (!opts.silent) syncProgramTimeUnit(next);
    scheduleSave();
    renderAll();
    return true;
  }

  function listOtherProjects() {
    var cur = projectId();
    var list = [];
    try {
      if (typeof w.np_loadProjects === 'function') {
        list = w.np_loadProjects() || [];
      } else if (w.nutriPlantStorage && typeof w.nutriPlantStorage.getAllProjects === 'function') {
        list = w.nutriPlantStorage.getAllProjects() || [];
      } else if (w.projectManager && typeof w.projectManager.getAllProjects === 'function') {
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
          return '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.name || p.title || p.id) + '</option>';
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
    state.waterDepthByStageM3ha = stages.map(function () { return 0; });
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
      axis = 'semana';
      pct = {};
      waterDepthByStageM3ha = [];
      ensurePct();
      NUTS.forEach(function (n) {
        if (totals[n.id] == null) totals[n.id] = 0;
      });
      var saved = await loadProjectCurve();
      if (saved) applyPctFromState(saved);
      var migratedWater = false;
      if (!saved || !Array.isArray(saved.waterDepthByStageM3ha)) {
        try {
          if (typeof w.fertiGetProgramWaterByStage === 'function') {
            var legacyWater = w.fertiGetProgramWaterByStage();
            if (Array.isArray(legacyWater) && legacyWater.length) {
              waterDepthByStageM3ha = legacyWater.slice(0, stages.length).map(function (v) {
                return Math.max(0, parseFloat(v) || 0);
              });
              ensurePct();
              migratedWater = true;
            }
          }
        } catch (e3) {}
      }
      await hydratePresets();
      host.dataset.ready = '1';
      host.dataset.pid = pid;
      mounted = true;
      booting = false;
      renderAll();
      if (migratedWater) saveProjectCurve();
      return;
    }
    renderAll();
  }

  w.fertiDistRefreshChart = function () {
    observeChartHost();
    if (chartInst && chartCanvasReady()) {
      try { chartInst.resize(); } catch (e) { renderChart(); }
      return;
    }
    scheduleChartRender();
  };
  w.fertiDistMount = mount;
  w.fertiDistSyncTimeUnit = function (unit) {
    var next = unit === 'mes' ? 'mes' : 'semana';
    if (axis === next) return;
    setAxis(next, { silent: true });
  };
  w.fertiDistApplyProgramNutrientSplit = function (splits) {
    if (distProgramSync || !splits || typeof splits !== 'object') return;
    var changed = false;
    distProgramSync = true;
    try {
      NUTS.forEach(function (n) {
        var arr = splits[n.id];
        if (!Array.isArray(arr) || arr.length !== stages.length) return;
        pct[n.id] = arr.map(function (x) { return round1(parseFloat(x) || 0); });
        changed = true;
      });
      if (changed) {
        ensurePct();
        if (hostEl() && hostEl().dataset.ready === '1') {
          syncPctInputsFromData();
          updateChartPctSeries();
        }
        scheduleSave();
      }
    } finally {
      distProgramSync = false;
    }
  };
  w.fertiDistExportState = function () {
    if (!mounted || !hostEl() || hostEl().dataset.ready !== '1') return null;
    return JSON.parse(JSON.stringify(snapshotState()));
  };
  w.fertiDistGetStoredState = function () {
    var pid = projectId();
    var uid = userId();
    if (!pid || !uid) return null;
    try {
      var raw = localStorage.getItem('np_extraccion_etapa_' + uid + '_' + pid);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {}
    return null;
  };
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
