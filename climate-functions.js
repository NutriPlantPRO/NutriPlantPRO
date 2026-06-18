/**
 * NutriPlant PRO — Clima (lluvia acumulada, ET₀, lectura en vivo)
 * Open-Meteo: mismas coordenadas que VPD (centro del polígono).
 */
(function () {
  'use strict';

  var MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var CLIMATE_HISTORY_YEARS = 4;
  var CLIMATE_RAIN_COLORS = ['#1e3a8a', '#2563eb', '#38bdf8', '#7dd3fc'];
  var CLIMATE_ET0_COLORS = ['#991b1b', '#c2410c', '#f97316', '#fbbf24'];
  var climateRainfallViewMode = 'table';
  var climateChartYearsVisible = { rain: {}, et0: {} };
  var climateCombinedChart = null;
  var CLIMATE_COMBINED_CANVAS_ID = 'climate-combined-chart';
  var CLIMATE_CHART_HEIGHT_PX = 560;

  /** Nota visible: origen satelital, sin citar proveedor. */
  function climateSatelliteNoteHtml(extraStyle) {
    return (
      '<p class="climate-satellite-note" style="margin:0 0 16px 0;padding:10px 12px;font-size:13px;line-height:1.45;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;' +
      (extraStyle || '') +
      '">' +
      '<strong>ℹ️ Nota:</strong> temperatura, humedad, lluvia, ET₀ y viento son <strong>estimaciones</strong> basadas en ' +
      '<strong>información obtenida por satélite</strong> en el punto del predio. Pueden diferir del microclima en el cultivo o de mediciones en campo.' +
      '</p>'
    );
  }
  window.climateSatelliteNoteHtml = climateSatelliteNoteHtml;

  function getPid() {
    try {
      if (typeof np_getCurrentProjectId === 'function') return np_getCurrentProjectId();
    } catch (e) {}
    return localStorage.getItem('nutriplant-current-project') || '';
  }

  function getProject() {
    if (typeof currentProject !== 'undefined' && currentProject) return currentProject;
    try {
      if (window.projectManager && typeof window.projectManager.getCurrentProject === 'function') {
        return window.projectManager.getCurrentProject();
      }
    } catch (e) {}
    return null;
  }

  function getLocation() {
    var p = getProject();
    if (!p || typeof getVPDLocation !== 'function') return null;
    return getVPDLocation(p);
  }

  function todayIso() {
    if (typeof getTodayIsoDate === 'function') return getTodayIsoDate();
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function addDaysIsoLocal(isoDate, days) {
    if (typeof addDaysIso === 'function') return addDaysIso(isoDate, days);
    var d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return isoDate;
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function ensureClimateAnalysisStructures() {
    var p = getProject();
    if (!p) return;
    if (!p.climateAnalysis || typeof p.climateAnalysis !== 'object') {
      p.climateAnalysis = {
        lastTab: 'climate-vpd',
        lastReading: null,
        rainfall: null,
        et0: null,
        rolling: null,
        irrigationQuickCalc: null,
        lastUpdated: null
      };
    }
    if (!p.climateAnalysis.lastTab) p.climateAnalysis.lastTab = 'climate-vpd';
    if (!p.climateAnalysis.irrigationQuickCalc || typeof p.climateAnalysis.irrigationQuickCalc !== 'object') {
      p.climateAnalysis.irrigationQuickCalc = defaultIrrigationQuickCalcState();
    } else {
      migrateIrrigationQuickCalcState(p.climateAnalysis.irrigationQuickCalc);
    }
  }

  function defaultIrrigationQuickCalcState() {
    return {
      cropName: '',
      kc: null,
      periodDays: 7,
      irrigationValue: null,
      irrigationUnit: 'mm',
      cropAreaHa: null,
      irrigatedAreaHa: null,
      rootReachPct: null,
      useManualEt0: false,
      manualEt0: null,
      useManualRain: false,
      manualRain: null,
      macroTunnelNoRain: false
    };
  }

  function migrateIrrigationQuickCalcState(st) {
    if (st.useManualEt0 == null) st.useManualEt0 = false;
    if (st.manualEt0 == null) st.manualEt0 = null;
    if (st.useManualRain == null) st.useManualRain = false;
    if (st.manualRain == null) st.manualRain = null;
    if (st.macroTunnelNoRain == null) st.macroTunnelNoRain = false;
    if (st.cropAreaHa == null) st.cropAreaHa = null;
    if (st.rootReachPct == null) st.rootReachPct = null;
  }

  function normalizeRootReachPct(value) {
    var v = Number(value);
    if (!Number.isFinite(v)) return null;
    if (v < 10) v = 10;
    if (v > 100) v = 100;
    return Math.round(v);
  }

  function getProjectSoilReachPct() {
    var p = getProject();
    var list = p && Array.isArray(p.soilAnalyses) ? p.soilAnalyses : [];
    for (var i = list.length - 1; i >= 0; i--) {
      var a = list[i];
      var r = a && a.fertility && Number(a.fertility.reachPct);
      if (Number.isFinite(r) && r >= 10 && r <= 100) return Math.round(r);
    }
    return null;
  }

  function suggestedIrrigatedHaFromReach(cropHa, reachPct) {
    if (cropHa == null || reachPct == null) return null;
    return round2(cropHa * (reachPct / 100));
  }

  function resolveAreaContext(state) {
    var projectHa = getProjectAreaHectares();
    var cropHa =
      state.cropAreaHa != null && Number.isFinite(Number(state.cropAreaHa)) && Number(state.cropAreaHa) > 0
        ? Number(state.cropAreaHa)
        : projectHa;
    var irrigatedHa =
      state.irrigatedAreaHa != null && Number.isFinite(Number(state.irrigatedAreaHa)) && Number(state.irrigatedAreaHa) > 0
        ? Number(state.irrigatedAreaHa)
        : cropHa;
    var hasSplit =
      cropHa != null && irrigatedHa != null && irrigatedHa > 0 && Math.abs(cropHa - irrigatedHa) > 0.001;
    var stripFactor = hasSplit ? cropHa / irrigatedHa : null;
    var reachPct = normalizeRootReachPct(state.rootReachPct);
    var suggestedIrrigatedHa = suggestedIrrigatedHaFromReach(cropHa, reachPct);
    return {
      projectHa: projectHa,
      cropHa: cropHa,
      irrigatedHa: irrigatedHa,
      hasSplit: hasSplit,
      stripFactor: stripFactor,
      rootReachPct: reachPct,
      suggestedIrrigatedHa: suggestedIrrigatedHa,
      soilReachPct: getProjectSoilReachPct()
    };
  }

  function persistClimateAnalysis() {
    var pid = getPid();
    var p = getProject();
    if (!pid || !p || !window.projectStorage || typeof window.projectStorage.saveSection !== 'function') return;
    try {
      window.projectStorage.saveSection('climateAnalysis', p.climateAnalysis, pid);
    } catch (e) {
      console.warn('persistClimateAnalysis', e);
    }
  }

  function aggregateDailyByMonth(dailyTimes, dailyValues, yearFilter) {
    var months = {};
    for (var i = 0; i < (dailyTimes || []).length; i++) {
      var day = String(dailyTimes[i] || '');
      if (day.length < 7) continue;
      var y = parseInt(day.slice(0, 4), 10);
      if (yearFilter && y !== yearFilter) continue;
      var m = day.slice(5, 7);
      var v = Number(dailyValues[i]);
      if (!Number.isFinite(v)) v = 0;
      months[m] = (months[m] || 0) + v;
    }
    return months;
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function getProjectAreaHectares() {
    var p = getProject();
    if (!p || !p.location) return null;
    var ha = Number(p.location.areaHectares);
    if (Number.isFinite(ha) && ha > 0) return round2(ha);
    var areaM2 = Number(p.location.area);
    if (Number.isFinite(areaM2) && areaM2 > 0) return round2(areaM2 / 10000);
    return null;
  }

  function computeRollingWindows(daily) {
    var times = (daily && daily.time) || [];
    var rain = (daily && daily.precipitation_sum) || [];
    var et0 = (daily && daily.et0_fao_evapotranspiration) || [];
    function sumLast(n, values) {
      var start = Math.max(0, values.length - n);
      var s = 0;
      var has = false;
      for (var i = start; i < values.length; i++) {
        var v = Number(values[i]);
        if (Number.isFinite(v)) {
          s += v;
          has = true;
        }
      }
      return has ? round1(s) : null;
    }
    function lastVal(values) {
      if (!values.length) return null;
      var v = Number(values[values.length - 1]);
      return Number.isFinite(v) ? round1(v) : null;
    }
    return {
      fetchedAt: new Date().toISOString(),
      dateEnd: times.length ? String(times[times.length - 1]) : todayIso(),
      et0Today: lastVal(et0),
      rainToday: lastVal(rain),
      et0_1d: sumLast(1, et0),
      rain_1d: sumLast(1, rain),
      et0_7d: sumLast(7, et0),
      rain_7d: sumLast(7, rain),
      et0_30d: sumLast(30, et0),
      rain_30d: sumLast(30, rain)
    };
  }

  async function fetchRollingClimateWindows(lat, lng) {
    var today = todayIso();
    var start30 = addDaysIsoLocal(today, -29);
    var daily = await fetchOpenMeteoDailyRange(lat, lng, start30, today, false);
    return computeRollingWindows(daily);
  }

  function getRollingForPeriod(rolling, periodDays) {
    if (!rolling || typeof rolling !== 'object') return { et0: null, rain: null };
    if (periodDays === 1) {
      return {
        et0: rolling.et0_1d != null ? rolling.et0_1d : rolling.et0Today,
        rain: rolling.rain_1d != null ? rolling.rain_1d : rolling.rainToday
      };
    }
    if (periodDays === 30) return { et0: rolling.et0_30d, rain: rolling.rain_30d };
    return { et0: rolling.et0_7d, rain: rolling.rain_7d };
  }

  function irrigationMmFromInput(value, unit, areaHa) {
    var v = Number(value);
    if (!Number.isFinite(v) || v < 0) return null;
    if (unit === 'm3') {
      if (!Number.isFinite(areaHa) || areaHa <= 0) return null;
      return round1(v / (areaHa * 10));
    }
    return round1(v);
  }

  function resolveEt0AndRain(state, rolling) {
    var period = state.periodDays === 1 || state.periodDays === 30 ? state.periodDays : 7;
    var sat = getRollingForPeriod(rolling, period);
    var et0 = null;
    var rain = null;
    var et0Source = null;
    var rainSource = null;
    if (state.useManualEt0 && state.manualEt0 != null && Number.isFinite(Number(state.manualEt0))) {
      et0 = round1(Number(state.manualEt0));
      et0Source = 'campo';
    } else if (sat.et0 != null) {
      et0 = sat.et0;
      et0Source = 'satélite';
    }
    if (state.macroTunnelNoRain) {
      rain = 0;
      rainSource = 'macrotúnel';
    } else if (state.useManualRain && state.manualRain != null && Number.isFinite(Number(state.manualRain))) {
      rain = round1(Number(state.manualRain));
      rainSource = 'campo';
    } else if (sat.rain != null) {
      rain = sat.rain;
      rainSource = 'satélite';
    }
    return { et0: et0, rain: rain, et0Source: et0Source, rainSource: rainSource, periodDays: period };
  }

  function computeIrrigationQuickResults(state, rolling) {
    var resolved = resolveEt0AndRain(state, rolling);
    var period = resolved.periodDays;
    var et0 = resolved.et0;
    var rain = resolved.rain;
    var kc = state.kc != null && Number.isFinite(Number(state.kc)) ? Number(state.kc) : null;
    var areas = resolveAreaContext(state);
    var cropHa = areas.cropHa;
    var irrigatedHa = areas.irrigatedHa;
    var irrMm = irrigationMmFromInput(state.irrigationValue, state.irrigationUnit || 'mm', irrigatedHa);
    var etc = et0 != null && kc != null ? round1(et0 * kc) : null;
    var deficitClimate = et0 != null && rain != null ? round1(et0 - rain) : null;
    var deficitCrop = etc != null && rain != null ? round1(etc - rain) : null;
    var balance = etc != null && rain != null ? round1(etc - rain - (irrMm != null ? irrMm : 0)) : null;
    function volMm(mmVal) {
      if (mmVal == null || !Number.isFinite(mmVal) || cropHa == null) {
        return { perHa: null, total: null, wettedMm: null };
      }
      var perHa = round1(mmVal * 10);
      var total = round1(perHa * cropHa);
      var wettedMm =
        areas.stripFactor != null && Number.isFinite(areas.stripFactor) ? round1(mmVal * areas.stripFactor) : null;
      return { perHa: perHa, total: total, wettedMm: wettedMm };
    }
    return {
      periodDays: period,
      et0: et0,
      rain: rain,
      et0Source: resolved.et0Source,
      rainSource: resolved.rainSource,
      kc: kc,
      etc: etc,
      deficitClimate: deficitClimate,
      deficitCrop: deficitCrop,
      irrigationMm: irrMm,
      balance: balance,
      cropHa: cropHa,
      irrigatedHa: irrigatedHa,
      hasSplitArea: areas.hasSplit,
      stripFactor: areas.stripFactor,
      projectHa: areas.projectHa,
      deficitClimateVol: volMm(deficitClimate),
      deficitCropVol: volMm(deficitCrop),
      balanceVol: volMm(balance)
    };
  }

  function sourceBadge(source) {
    if (!source) return '';
    var colors = { 'satélite': '#0369a1', campo: '#0f766e', macrotúnel: '#7c3aed' };
    var bg = { 'satélite': '#e0f2fe', campo: '#d1fae5', macrotúnel: '#ede9fe' };
    return (
      ' <span style="font-size:11px;font-weight:600;color:' +
      (colors[source] || '#64748b') +
      ';background:' +
      (bg[source] || '#f1f5f9') +
      ';padding:2px 6px;border-radius:4px;">' +
      source +
      '</span>'
    );
  }

  function getIrrigationQuickCalcState() {
    ensureClimateAnalysisStructures();
    var raw = getProject().climateAnalysis.irrigationQuickCalc || {};
    migrateIrrigationQuickCalcState(raw);
    return {
      cropName: typeof raw.cropName === 'string' ? raw.cropName : '',
      kc: raw.kc != null && Number.isFinite(Number(raw.kc)) ? Number(raw.kc) : null,
      periodDays: raw.periodDays === 1 || raw.periodDays === 30 ? raw.periodDays : 7,
      irrigationValue:
        raw.irrigationValue != null && Number.isFinite(Number(raw.irrigationValue)) ? Number(raw.irrigationValue) : null,
      irrigationUnit: raw.irrigationUnit === 'm3' ? 'm3' : 'mm',
      cropAreaHa: raw.cropAreaHa != null && Number.isFinite(Number(raw.cropAreaHa)) ? Number(raw.cropAreaHa) : null,
      irrigatedAreaHa:
        raw.irrigatedAreaHa != null && Number.isFinite(Number(raw.irrigatedAreaHa)) ? Number(raw.irrigatedAreaHa) : null,
      rootReachPct: normalizeRootReachPct(raw.rootReachPct),
      useManualEt0: !!raw.useManualEt0,
      manualEt0: raw.manualEt0 != null && Number.isFinite(Number(raw.manualEt0)) ? Number(raw.manualEt0) : null,
      useManualRain: !!raw.useManualRain,
      manualRain: raw.manualRain != null && Number.isFinite(Number(raw.manualRain)) ? Number(raw.manualRain) : null,
      macroTunnelNoRain: !!raw.macroTunnelNoRain
    };
  }

  function syncIrrigationInputsFromState() {
    var state = getIrrigationQuickCalcState();
    var cropEl = document.getElementById('climate-irr-crop');
    var kcEl = document.getElementById('climate-irr-kc');
    var irrEl = document.getElementById('climate-irr-applied');
    var unitEl = document.getElementById('climate-irr-unit');
    var cropAreaEl = document.getElementById('climate-irr-crop-area');
    var areaEl = document.getElementById('climate-irr-area');
    var reachEl = document.getElementById('climate-irr-root-reach');
    var et0ManualEl = document.getElementById('climate-irr-et0-manual');
    var rainManualEl = document.getElementById('climate-irr-rain-manual');
    var useEt0El = document.getElementById('climate-irr-use-manual-et0');
    var useRainEl = document.getElementById('climate-irr-use-manual-rain');
    var macroEl = document.getElementById('climate-irr-macro-tunnel');
    if (cropEl) cropEl.value = state.cropName || '';
    if (kcEl) kcEl.value = state.kc != null ? String(state.kc) : '';
    if (irrEl) irrEl.value = state.irrigationValue != null ? String(state.irrigationValue) : '';
    if (unitEl) unitEl.value = state.irrigationUnit === 'm3' ? 'm3' : 'mm';
    if (cropAreaEl) cropAreaEl.value = state.cropAreaHa != null ? String(state.cropAreaHa) : '';
    if (areaEl) areaEl.value = state.irrigatedAreaHa != null ? String(state.irrigatedAreaHa) : '';
    if (reachEl) reachEl.value = state.rootReachPct != null ? String(state.rootReachPct) : '';
    if (et0ManualEl) et0ManualEl.value = state.manualEt0 != null ? String(state.manualEt0) : '';
    if (rainManualEl) rainManualEl.value = state.manualRain != null ? String(state.manualRain) : '';
    if (useEt0El) useEt0El.checked = state.useManualEt0;
    if (useRainEl) useRainEl.checked = state.useManualRain;
    if (macroEl) macroEl.checked = state.macroTunnelNoRain;
    updateManualFieldAvailability(state);
  }

  function updateManualFieldAvailability(state) {
    var et0ManualEl = document.getElementById('climate-irr-et0-manual');
    var rainManualEl = document.getElementById('climate-irr-rain-manual');
    var useRainEl = document.getElementById('climate-irr-use-manual-rain');
    var et0Label = document.getElementById('climate-irr-label-manual-et0');
    var rainLabel = document.getElementById('climate-irr-label-manual-rain');
    if (et0ManualEl) et0ManualEl.disabled = !state.useManualEt0;
    var rainBlocked = state.macroTunnelNoRain;
    if (rainManualEl) rainManualEl.disabled = rainBlocked || !state.useManualRain;
    if (useRainEl) useRainEl.disabled = rainBlocked;
    if (et0Label) et0Label.style.color = state.useManualEt0 ? '#0369a1' : '#475569';
    if (rainLabel) rainLabel.style.color = state.useManualRain && !rainBlocked ? '#0369a1' : '#475569';
  }

  function resetIrrigationQuickCalcDom() {
    var root = document.getElementById('climate-irrigation-quick');
    if (!root) return;
    root.removeAttribute('data-np-irr-rendered');
    root.removeAttribute('data-np-irr-bound');
    root.innerHTML = '';
    lastIrrigationPeriodSelected = null;
  }

  function syncIrrigationQuickCalcFromDOM() {
    var cropEl = document.getElementById('climate-irr-crop');
    var kcEl = document.getElementById('climate-irr-kc');
    var irrEl = document.getElementById('climate-irr-applied');
    var unitEl = document.getElementById('climate-irr-unit');
    var cropAreaEl = document.getElementById('climate-irr-crop-area');
    var areaEl = document.getElementById('climate-irr-area');
    var reachEl = document.getElementById('climate-irr-root-reach');
    var et0ManualEl = document.getElementById('climate-irr-et0-manual');
    var rainManualEl = document.getElementById('climate-irr-rain-manual');
    var useEt0El = document.getElementById('climate-irr-use-manual-et0');
    var useRainEl = document.getElementById('climate-irr-use-manual-rain');
    var macroEl = document.getElementById('climate-irr-macro-tunnel');
    var activePeriodBtn = document.querySelector('.climate-irr-period-btn.active');
    ensureClimateAnalysisStructures();
    var st = getProject().climateAnalysis.irrigationQuickCalc;
    migrateIrrigationQuickCalcState(st);
    if (cropEl) st.cropName = String(cropEl.value || '').trim();
    if (kcEl && kcEl.value !== '') {
      var kc = parseFloat(kcEl.value);
      st.kc = Number.isFinite(kc) ? kc : null;
    } else {
      st.kc = null;
    }
    if (activePeriodBtn) {
      var pd = parseInt(activePeriodBtn.getAttribute('data-period'), 10);
      st.periodDays = pd === 1 || pd === 30 ? pd : 7;
    }
    if (irrEl && irrEl.value !== '') {
      var iv = parseFloat(irrEl.value);
      st.irrigationValue = Number.isFinite(iv) ? iv : null;
    } else {
      st.irrigationValue = null;
    }
    if (unitEl) st.irrigationUnit = unitEl.value === 'm3' ? 'm3' : 'mm';
    if (cropAreaEl && cropAreaEl.value !== '') {
      var ch = parseFloat(cropAreaEl.value);
      st.cropAreaHa = Number.isFinite(ch) && ch > 0 ? ch : null;
    } else {
      st.cropAreaHa = null;
    }
    if (areaEl && areaEl.value !== '') {
      var ah = parseFloat(areaEl.value);
      st.irrigatedAreaHa = Number.isFinite(ah) && ah > 0 ? ah : null;
    } else {
      st.irrigatedAreaHa = null;
    }
    if (reachEl && reachEl.value !== '') {
      st.rootReachPct = normalizeRootReachPct(parseFloat(reachEl.value));
    } else {
      st.rootReachPct = null;
    }
    st.useManualEt0 = !!(useEt0El && useEt0El.checked);
    st.macroTunnelNoRain = !!(macroEl && macroEl.checked);
    st.useManualRain = !!(useRainEl && useRainEl.checked && !st.macroTunnelNoRain);
    if (et0ManualEl && et0ManualEl.value !== '' && st.useManualEt0) {
      var me = parseFloat(et0ManualEl.value);
      st.manualEt0 = Number.isFinite(me) ? me : null;
    } else {
      st.manualEt0 = null;
    }
    if (rainManualEl && rainManualEl.value !== '' && st.useManualRain) {
      var mr = parseFloat(rainManualEl.value);
      st.manualRain = Number.isFinite(mr) ? mr : null;
    } else {
      st.manualRain = null;
    }
    persistClimateAnalysis();
  }

  function renderFaoKcReferenceTable(filterText) {
    if (window.NpIrrBalance && typeof window.NpIrrBalance.renderFaoKcTable === 'function') {
      var cropFilter = '';
      try {
        var cropEl = document.getElementById('climate-irr-crop');
        if (cropEl && cropEl.value.trim()) cropFilter = cropEl.value.trim();
      } catch (e) {}
      window.NpIrrBalance.renderFaoKcTable('climate-fao-kc-tbody', filterText, cropFilter);
      return;
    }
    var body = document.getElementById('climate-fao-kc-tbody');
    if (!body) return;
    var rows = window.FAO_KC_REFERENCE || [];
    var q = String(filterText || '')
      .trim()
      .toLowerCase();
    var cropFilter = '';
    try {
      var cropEl = document.getElementById('climate-irr-crop');
      if (cropEl && cropEl.value.trim()) cropFilter = cropEl.value.trim().toLowerCase();
    } catch (e) {}
    var html = '';
    rows.forEach(function (row) {
      var crop = String(row.crop || '');
      var stage = String(row.stage || '');
      var haystack = (crop + ' ' + stage).toLowerCase();
      if (q && haystack.indexOf(q) < 0) return;
      var highlight = cropFilter && crop.toLowerCase().indexOf(cropFilter) >= 0;
      var style = highlight ? 'background:#ecfdf5;' : '';
      html +=
        '<tr style="border-bottom:1px solid #e5e7eb;' +
        style +
        '">' +
        '<td style="padding:6px 8px;">' +
        crop +
        '</td>' +
        '<td style="padding:6px 8px;color:#475569;">' +
        stage +
        '</td>' +
        '<td style="padding:6px 8px;text-align:center;font-weight:600;">' +
        row.kcMin.toFixed(2) +
        ' – ' +
        row.kcMax.toFixed(2) +
        '</td>' +
        '</tr>';
    });
    body.innerHTML =
      html ||
      '<tr><td colspan="3" style="padding:12px;color:#64748b;text-align:center;">Sin coincidencias en la tabla FAO.</td></tr>';
  }

  var lastIrrigationPeriodSelected = null;

  function updateIrrigationQuickCalcDisplay() {
    var p = getProject();
    var rolling = p && p.climateAnalysis && p.climateAnalysis.rolling;
    var state = getIrrigationQuickCalcState();
    var res = computeIrrigationQuickResults(state, rolling);
    var periodLabel = res.periodDays === 1 ? '1 día' : res.periodDays === 30 ? '30 días' : '7 días';
    var satWindow = getRollingForPeriod(rolling, res.periodDays);
    var hasSatellite = !!(rolling && (satWindow.et0 != null || satWindow.rain != null));
    var hasManual =
      (state.useManualEt0 && state.manualEt0 != null) ||
      state.macroTunnelNoRain ||
      (state.useManualRain && state.manualRain != null);
    var notice = document.getElementById('climate-irr-notice');
    if (notice) {
      notice.style.display = !hasSatellite && !hasManual ? 'block' : 'none';
      notice.innerHTML =
        'Puedes usar <strong>tus valores de campo</strong> abajo (ETo, lluvia, riego) o pulsar <strong>Obtener lluvia y ET₀</strong> para datos satelitales.';
    }
    var satMeta = document.getElementById('climate-irr-satellite-meta');
    if (satMeta) {
      if (rolling && rolling.fetchedAt) {
        satMeta.textContent =
          'Referencia satélite disponible · actualizada ' + new Date(rolling.fetchedAt).toLocaleString('es-MX');
        satMeta.style.display = 'block';
      } else {
        satMeta.style.display = 'none';
      }
    }
    var periodHint = document.getElementById('climate-irr-period-hint');
    if (periodHint) {
      var hasAccum =
        state.irrigationValue != null ||
        (state.useManualEt0 && state.manualEt0 != null) ||
        (state.useManualRain && state.manualRain != null);
      if (
        lastIrrigationPeriodSelected != null &&
        lastIrrigationPeriodSelected !== state.periodDays &&
        hasAccum
      ) {
        periodHint.innerHTML =
          '<strong style="color:#b45309;">Actualiza ETo, lluvia y riego</strong> al acumulado de <strong>' +
          periodLabel +
          '</strong>.';
        periodHint.style.color = '#92400e';
        periodHint.style.background = '#fffbeb';
        periodHint.style.border = '1px solid #fde68a';
      } else {
        periodHint.textContent =
          'ETo, lluvia y riego son acumulados del periodo seleccionado (1, 7 o 30 días).';
        periodHint.style.color = '#64748b';
        periodHint.style.background = 'transparent';
        periodHint.style.border = 'none';
      }
    }
    var manualBlockHint = document.getElementById('climate-irr-manual-block-hint');
    if (manualBlockHint) {
      manualBlockHint.innerHTML =
        'ETo, lluvia y riego de esta caja corresponden al <strong>periodo seleccionado (' +
        periodLabel +
        ')</strong>. Si usas valores de campo, ingresa el <strong>acumulado de esos mismos días</strong>; la referencia satélite de arriba ya usa ese periodo.';
    }
    lastIrrigationPeriodSelected = state.periodDays;
    var et0El = document.getElementById('climate-irr-metric-et0');
    var rainEl = document.getElementById('climate-irr-metric-rain');
    if (et0El) {
      et0El.innerHTML =
        '<div style="font-size:12px;color:#64748b;margin-bottom:4px;">ETo activa (' +
        periodLabel +
        ')</div><div style="font-size:18px;font-weight:700;color:#0f172a;">' +
        (res.et0 != null ? fmtMm(res.et0) : '—') +
        (res.et0 != null
          ? ' <span style="font-size:13px;font-weight:500;color:#64748b;">' + (res.periodDays === 1 ? 'mm/día' : 'mm') + '</span>'
          : '') +
        sourceBadge(res.et0Source) +
        '</div>';
    }
    if (rainEl) {
      rainEl.innerHTML =
        '<div style="font-size:12px;color:#64748b;margin-bottom:4px;">Lluvia activa (' +
        periodLabel +
        ')</div><div style="font-size:18px;font-weight:700;color:#0f172a;">' +
        (res.rain != null ? fmtMm(res.rain) + ' <span style="font-size:13px;font-weight:500;color:#64748b;">mm</span>' : '—') +
        sourceBadge(res.rainSource) +
        '</div>';
    }
    if (!state.useManualEt0 && satWindow.et0 != null) {
      var et0Hint = document.getElementById('climate-irr-et0-sat-hint');
      if (et0Hint) et0Hint.textContent = 'Satélite: ' + fmtMm(satWindow.et0) + (res.periodDays === 1 ? ' mm/día' : ' mm');
    } else {
      var et0Hint2 = document.getElementById('climate-irr-et0-sat-hint');
      if (et0Hint2) et0Hint2.textContent = '';
    }
    if (!state.useManualRain && !state.macroTunnelNoRain && satWindow.rain != null) {
      var rainHint = document.getElementById('climate-irr-rain-sat-hint');
      if (rainHint) rainHint.textContent = 'Satélite: ' + fmtMm(satWindow.rain) + ' mm';
    } else {
      var rainHint2 = document.getElementById('climate-irr-rain-sat-hint');
      if (rainHint2) rainHint2.textContent = state.macroTunnelNoRain ? 'Lluvia fijada en 0 (macrotúnel)' : '';
    }
    updateManualFieldAvailability(state);
    [1, 7, 30].forEach(function (days) {
      var btn = document.querySelector('.climate-irr-period-btn[data-period="' + days + '"]');
      if (!btn) return;
      var active = state.periodDays === days;
      btn.classList.toggle('active', active);
      btn.style.border = active ? '1px solid #0284c7' : '1px solid #cbd5e1';
      btn.style.background = active ? '#e0f2fe' : '#fff';
      btn.style.color = active ? '#0369a1' : '#475569';
    });
    function summaryLine(label, mmVal, vol) {
      var mmText = mmVal != null ? fmtMm(mmVal) + ' mm' : '—';
      var volText = vol && vol.perHa != null ? ' → ' + vol.perHa + ' m³/ha cultivo' : '';
      var totalText = vol && vol.total != null ? ' (' + vol.total + ' m³ total)' : '';
      return '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed #e2e8f0;font-size:14px;"><span style="color:#475569;">' + label + '</span><span style="font-weight:600;color:#0f172a;text-align:right;">' + mmText + volText + totalText + '</span></div>';
    }
    function summaryWettedStrip(label, vol) {
      if (!res.hasSplitArea || !vol || vol.wettedMm == null) return '';
      return (
        '<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0 6px 12px;border-bottom:1px dashed #e2e8f0;font-size:13px;color:#0369a1;">' +
        '<span>↳ ' + label + ' en franja regada (' + fmtMm(res.irrigatedHa) + ' ha)</span>' +
        '<span style="font-weight:600;text-align:right;">' +
        fmtMm(vol.wettedMm) +
        ' mm (mismos ' +
        (vol.total != null ? vol.total + ' m³' : 'm³') +
        ')</span></div>'
      );
    }
    var irrVol =
      res.irrigationMm != null
        ? {
            perHa: round1(res.irrigationMm * 10),
            total: res.irrigatedHa != null ? round1(res.irrigationMm * 10 * res.irrigatedHa) : null,
            wettedMm: res.irrigationMm
          }
        : null;
    var areaNote = document.getElementById('climate-irr-area-note');
    var areas = resolveAreaContext(state);
    if (areaNote) {
      var parts = [];
      parts.push(
        '<strong>Criterio NutriPlant:</strong> el <strong>% raíces en superficie</strong> indica qué parte del <strong>área del cultivo</strong> tiene exploración radical activa (goteo, surco, franja).'
      );
      parts.push(
        'En <strong>riego</strong>, ese mismo % suele traducirse a <strong>superficie regada</strong>: franja ≈ ha cultivo × (% ÷ 100). Los <strong>m³ totales del déficit no se dividen</strong>; el agua se concentra en la franja (más mm, mismos m³).'
      );
      if (areas.rootReachPct != null && areas.cropHa != null && areas.suggestedIrrigatedHa != null) {
        parts.push(
          'Con <strong>' +
          areas.rootReachPct +
          '%</strong> y <strong>' +
          fmtMm(areas.cropHa) +
          ' ha</strong> cultivo → franja sugerida: <strong>' +
          fmtMm(areas.suggestedIrrigatedHa) +
          ' ha</strong>.'
        );
      }
      if (areas.soilReachPct != null && areas.rootReachPct == null) {
        parts.push('Análisis de suelo del proyecto: <strong>' + areas.soilReachPct + '%</strong> (puedes usarlo abajo).');
      }
      areaNote.innerHTML = parts.join(' ');
      areaNote.style.display = 'block';
    }
    var soilReachHint = document.getElementById('climate-irr-soil-reach-hint');
    if (soilReachHint) {
      soilReachHint.textContent =
        areas.soilReachPct != null
          ? 'Análisis de suelo guardado: ' + areas.soilReachPct + '% raíces en superficie (mismo valor que Fertilidad).'
          : 'Si tienes análisis de suelo en el proyecto, el % puede cargarse desde ahí.';
    }
    var summary = document.getElementById('climate-irr-summary');
    if (summary) {
      summary.innerHTML =
        '<h4 style="margin:0 0 12px 0;color:#0369a1;font-size:15px;">💧 Estimación rápida (' +
        periodLabel +
        ')</h4>' +
        (res.cropHa != null
          ? '<p style="margin:0 0 10px 0;font-size:12px;color:#64748b;">Referencia cultivo: <strong>' +
            fmtMm(res.cropHa) +
            ' ha</strong>' +
            (res.hasSplitArea ? ' · Franja regada: <strong>' + fmtMm(res.irrigatedHa) + ' ha</strong>' : '') +
            '</p>'
          : '') +
        summaryLine('ETo' + (res.et0Source ? ' (' + res.et0Source + ')' : ''), res.et0, null) +
        summaryLine('Lluvia' + (res.rainSource ? ' (' + res.rainSource + ')' : ''), res.rain, null) +
        summaryLine('Déficit climático (ETo − lluvia)', res.deficitClimate, res.deficitClimateVol) +
        summaryWettedStrip('Déficit climático', res.deficitClimateVol) +
        summaryLine('ETc estimada (ETo × Kc)', res.etc, null) +
        summaryLine('Déficit del cultivo (ETc − lluvia)', res.deficitCrop, res.deficitCropVol) +
        summaryWettedStrip('Déficit del cultivo', res.deficitCropVol) +
        summaryLine('Riego aplicado (mm en franja)', res.irrigationMm, irrVol) +
        summaryLine('Balance hídrico (ETc − lluvia − riego)', res.balance, res.balanceVol) +
        summaryWettedStrip('Balance por cubrir en riego', res.balanceVol);
    }
  }

  function renderIrrigationQuickCalc() {
    var root = document.getElementById('climate-irrigation-quick');
    if (!root) return;
    ensureClimateAnalysisStructures();
    var state = getIrrigationQuickCalcState();
    var projectHa = getProjectAreaHectares();
    var cropPlaceholder = projectHa != null ? 'Vacío = ' + projectHa + ' ha (predio)' : 'Vacío = ha del predio';
    var irrPlaceholder = 'Franja humedecida (goteo)';

    if (root.getAttribute('data-np-irr-version') !== '10') {
      root.removeAttribute('data-np-irr-rendered');
      root.removeAttribute('data-np-irr-bound');
      root.innerHTML = '';
      root.setAttribute('data-np-irr-version', '10');
    }
    if (window.NpIrrBalance && window.NpIrrBalance.ensureIrrCalcStyles) window.NpIrrBalance.ensureIrrCalcStyles();

    if (root.getAttribute('data-np-irr-rendered') !== '1') {
      root.innerHTML =
        '<p id="climate-irr-notice" style="margin:0 0 12px 0;padding:10px 12px;font-size:13px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">Puedes usar <strong>tus valores de campo</strong> o pulsar <strong>Obtener lluvia y ET₀</strong> para datos satelitales.</p>' +
        '<p id="climate-irr-satellite-meta" style="display:none;margin:0 0 12px 0;font-size:12px;color:#0369a1;"></p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">' +
        '<span style="font-size:13px;color:#64748b;font-weight:600;">Periodo:</span>' +
        '<button type="button" class="climate-irr-period-btn" data-period="1" style="padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:600;cursor:pointer;font-size:13px;">1 día</button>' +
        '<button type="button" class="climate-irr-period-btn" data-period="7" style="padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:600;cursor:pointer;font-size:13px;">7 días</button>' +
        '<button type="button" class="climate-irr-period-btn" data-period="30" style="padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:600;cursor:pointer;font-size:13px;">30 días</button>' +
        '</div>' +
        '<p id="climate-irr-period-hint" style="margin:0 0 14px 0;padding:8px 10px;font-size:12px;color:#64748b;border-radius:8px;">ETo, lluvia y riego son acumulados del periodo seleccionado (1, 7 o 30 días).</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;">' +
        '<div id="climate-irr-metric-et0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;"></div>' +
        '<div id="climate-irr-metric-rain" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;"></div>' +
        '</div>' +
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:16px;">' +
        '<h4 style="margin:0 0 6px 0;font-size:14px;color:#0f172a;">📋 Mis valores de agua (calculadora)</h4>' +
        '<p id="climate-irr-manual-block-hint" style="margin:0 0 12px;font-size:12px;line-height:1.45;color:#64748b;">ETo, lluvia y riego de esta caja corresponden al <strong>periodo seleccionado arriba</strong>. Si usas valores de campo, ingresa el <strong>acumulado de esos mismos días</strong> (satélite o manual).</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:12px;">' +
        '<div><label id="climate-irr-label-manual-et0" style="display:flex;align-items:center;gap:8px;font-size:13px;color:#475569;margin-bottom:6px;font-weight:600;cursor:pointer;"><input type="checkbox" id="climate-irr-use-manual-et0" style="width:auto;margin:0;flex-shrink:0;accent-color:#2563eb;"> <span>Usar mi ETo del periodo (mm)</span></label>' +
        '<input type="number" id="climate-irr-et0-manual" min="0" step="0.1" placeholder="Acumulado del periodo" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '<p id="climate-irr-et0-sat-hint" style="margin:6px 0 0;font-size:12px;color:#64748b;"></p></div>' +
        '<div><label id="climate-irr-label-manual-rain" style="display:flex;align-items:center;gap:8px;font-size:13px;color:#475569;margin-bottom:6px;font-weight:600;cursor:pointer;"><input type="checkbox" id="climate-irr-use-manual-rain" style="width:auto;margin:0;flex-shrink:0;accent-color:#2563eb;"> <span>Usar mi lluvia (pluviómetro, mm)</span></label>' +
        '<input type="number" id="climate-irr-rain-manual" min="0" step="0.1" placeholder="Acumulado del periodo" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '<p id="climate-irr-rain-sat-hint" style="margin:6px 0 0;font-size:12px;color:#64748b;"></p>' +
        '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:#475569;cursor:pointer;"><input type="checkbox" id="climate-irr-macro-tunnel" style="width:auto;margin:0;flex-shrink:0;accent-color:#2563eb;"> <span>Macrotúnel / invernadero (sin lluvia → 0 mm)</span></label></div>' +
        '</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">' +
        '<div><label style="display:block;font-size:13px;color:#475569;margin-bottom:6px;font-weight:600;">Cultivo (opcional)</label>' +
        '<input type="text" id="climate-irr-crop" placeholder="Ej. Limón, aguacate…" value="' +
        (state.cropName ? String(state.cropName).replace(/"/g, '&quot;') : '') +
        '" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>' +
        '<div><label style="display:block;font-size:13px;color:#475569;margin-bottom:6px;font-weight:600;">Kc (editable)</label>' +
        '<div class="np-irr-kc-field">' +
        '<input type="number" id="climate-irr-kc" min="0" max="2" step="0.01" placeholder="Sin valor precargado" value="' +
        (state.kc != null ? state.kc : '') +
        '" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        (window.NpIrrBalance && window.NpIrrBalance.getKcFieldHintHtml
          ? window.NpIrrBalance.getKcFieldHintHtml('climate')
          : '<p style="margin:4px 0 0;font-size:11px;color:#0369a1;">Consulta la tabla Kc FAO-56 abajo.</p>') +
        '</div></div>' +
        '</div>' +
        '<div class="np-irr-calc-row-3">' +
        '<div><label style="display:block;font-size:13px;color:#475569;margin-bottom:6px;font-weight:600;">Riego total del periodo</label>' +
        '<div class="np-irr-value-unit"><input type="number" id="climate-irr-applied" min="0" step="0.1" placeholder="Acumulado del periodo" value="' +
        (state.irrigationValue != null ? state.irrigationValue : '') +
        '"><select id="climate-irr-unit" aria-label="Unidad de riego">' +
        '<option value="mm"' +
        (state.irrigationUnit !== 'm3' ? ' selected' : '') +
        '>mm</option>' +
        '<option value="m3"' +
        (state.irrigationUnit === 'm3' ? ' selected' : '') +
        '>m³</option>' +
        '</select></div>' +
        '<p style="margin:6px 0 0;font-size:12px;color:#64748b;">Suma de todo lo regado en el periodo elegido.</p></div>' +
        '<div><label style="display:block;font-size:13px;color:#475569;margin-bottom:6px;font-weight:600;">Superficie del cultivo (ha)</label>' +
        '<input type="number" id="climate-irr-crop-area" min="0" step="0.01" placeholder="' +
        cropPlaceholder +
        '" value="' +
        (state.cropAreaHa != null ? state.cropAreaHa : '') +
        '" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '<p style="margin:6px 0 0;font-size:12px;color:#64748b;">Área donde está el cultivo (demanda ETc / m³ total).</p></div>' +
        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;">' +
        '<label style="display:block;font-size:13px;color:#166534;margin-bottom:6px;font-weight:600;">Superficie regada (ha)</label>' +
        '<input type="number" id="climate-irr-area" min="0" step="0.01" placeholder="' +
        irrPlaceholder +
        '" value="' +
        (state.irrigatedAreaHa != null ? state.irrigatedAreaHa : '') +
        '" style="width:100%;padding:10px 12px;border:1px solid #86efac;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '<p style="margin:6px 0 0;font-size:12px;color:#166534;">Zona humedecida (goteo/macrotúnel). Vacío = misma que cultivo.</p></div>' +
        '</div>' +
        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-bottom:12px;">' +
        '<label style="display:block;font-size:13px;color:#166534;margin-bottom:6px;font-weight:600;">Raíces en superficie (% del área)</label>' +
        '<p style="margin:0 0 8px;font-size:11px;line-height:1.4;color:#15803d;">Fracción del <strong>área del cultivo</strong> con raíces activas / riego localizado. <strong>No es profundidad</strong> del suelo — aquí sirve para sugerir la franja regada.</p>' +
        '<div class="np-irr-root-actions">' +
        '<input type="number" id="climate-irr-root-reach" min="0" max="100" step="1" placeholder="10–100 (vacío = sin usar)" value="' +
        (state.rootReachPct != null ? state.rootReachPct : '') +
        '">' +
        '<button type="button" id="climate-irr-apply-reach" class="np-irr-btn-suggest">Sugerir franja regada</button>' +
        '<button type="button" id="climate-irr-use-soil-reach" class="np-irr-btn-soil">Usar % del análisis de suelo</button>' +
        '</div>' +
        '<p id="climate-irr-soil-reach-hint" style="margin:8px 0 0;font-size:12px;color:#15803d;"></p>' +
        '<p style="margin:6px 0 0;font-size:12px;color:#166534;">Mismo % que en <strong>Enmiendas</strong> y <strong>Fertilidad</strong> (allí entra profundidad y densidad). En balance hídrico solo estima <strong>superficie regada</strong>.</p></div>' +
        '<p id="climate-irr-area-note" style="margin:0 0 16px 0;padding:10px 12px;font-size:12px;line-height:1.45;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;"></p>' +
        '<div id="climate-irr-summary" style="background:linear-gradient(135deg,#f0f9ff 0%,#ecfeff 100%);border:1px solid #7dd3fc;border-radius:10px;padding:16px;margin-bottom:16px;"></div>' +
        (window.NpIrrBalance && window.NpIrrBalance.getNoteHtml
          ? window.NpIrrBalance.getNoteHtml('margin-bottom:12px;')
          : '<p style="margin:0 0 8px 0;padding:10px 12px;font-size:12px;line-height:1.5;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;"><strong>Nota:</strong> El balance hídrico es una <strong>estimación rápida</strong> basada en ETo, lluvia y riego (satélite o valores de campo). No considera almacenamiento de agua en el suelo, escurrimiento superficial, drenaje profundo ni lixiviación de nutrientes. El % suelo explorado por raíces (criterio NutriPlant) solo ayuda a estimar la franja regada. <strong>Validar siempre en campo.</strong></p>') +
        (window.NpIrrBalance && window.NpIrrBalance.getKcDetailsHtml
          ? window.NpIrrBalance.getKcDetailsHtml({ idPrefix: 'climate' })
          : '<details id="climate-fao-kc-details" style="border:1px solid #e2e8f0;border-radius:8px;padding:0;background:#fff;"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;color:#0f172a;font-size:14px;">📋 Tabla de referencia Kc (FAO-56)</summary><div style="padding:0 14px 14px;"><input type="search" id="climate-fao-kc-search" placeholder="Buscar cultivo…" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;"><div style="max-height:280px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f1f5f9;position:sticky;top:0;"><th style="padding:8px;text-align:left;">Cultivo</th><th style="padding:8px;text-align:left;">Etapa</th><th style="padding:8px;text-align:center;">Kc (rango FAO)</th></tr></thead><tbody id="climate-fao-kc-tbody"></tbody></table></div></div></details>');
      root.setAttribute('data-np-irr-rendered', '1');
      syncIrrigationInputsFromState();
      bindIrrigationQuickCalcEvents(root);
      renderFaoKcReferenceTable('');
    } else {
      syncIrrigationInputsFromState();
    }
    updateIrrigationQuickCalcDisplay();
  }

  function bindIrrigationQuickCalcEvents(root) {
    if (!root || root.getAttribute('data-np-irr-bound') === '1') return;
    root.setAttribute('data-np-irr-bound', '1');
    var persistTimer = null;
    function schedulePersist() {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(function () {
        syncIrrigationQuickCalcFromDOM();
        updateIrrigationQuickCalcDisplay();
      }, 250);
    }
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.climate-irr-period-btn');
      if (btn) {
        e.preventDefault();
        root.querySelectorAll('.climate-irr-period-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        schedulePersist();
        return;
      }
      var applyReach = e.target.closest('#climate-irr-apply-reach');
      if (applyReach) {
        e.preventDefault();
        syncIrrigationQuickCalcFromDOM();
        var st = getIrrigationQuickCalcState();
        var ctx = resolveAreaContext(st);
        if (ctx.suggestedIrrigatedHa != null) {
          var areaInput = document.getElementById('climate-irr-area');
          if (areaInput) areaInput.value = String(ctx.suggestedIrrigatedHa);
          syncIrrigationQuickCalcFromDOM();
        } else {
          alert('Indica % de alcance (10–100) y superficie del cultivo (ha) para sugerir la franja regada.');
        }
        updateIrrigationQuickCalcDisplay();
        return;
      }
      var useSoilReach = e.target.closest('#climate-irr-use-soil-reach');
      if (useSoilReach) {
        e.preventDefault();
        var soilPct = getProjectSoilReachPct();
        if (soilPct != null) {
          var reachInput = document.getElementById('climate-irr-root-reach');
          if (reachInput) reachInput.value = String(soilPct);
          schedulePersist();
        }
        return;
      }
    });
    root.addEventListener('input', function (e) {
      var id = e.target && e.target.id;
      if (id === 'climate-fao-kc-search') {
        renderFaoKcReferenceTable(e.target.value);
        return;
      }
      if (
        id === 'climate-irr-crop' ||
        id === 'climate-irr-kc' ||
        id === 'climate-irr-applied' ||
        id === 'climate-irr-area' ||
        id === 'climate-irr-crop-area' ||
        id === 'climate-irr-root-reach' ||
        id === 'climate-irr-et0-manual' ||
        id === 'climate-irr-rain-manual'
      ) {
        if (id === 'climate-irr-crop') {
          var searchEl = document.getElementById('climate-fao-kc-search');
          renderFaoKcReferenceTable(searchEl ? searchEl.value : '');
        }
        schedulePersist();
      }
    });
    root.addEventListener('change', function (e) {
      var id = e.target && e.target.id;
      if (
        id === 'climate-irr-unit' ||
        id === 'climate-irr-use-manual-et0' ||
        id === 'climate-irr-use-manual-rain' ||
        id === 'climate-irr-macro-tunnel'
      ) {
        if (id === 'climate-irr-macro-tunnel' && e.target.checked) {
          var useRainEl = document.getElementById('climate-irr-use-manual-rain');
          if (useRainEl) useRainEl.checked = false;
        }
        schedulePersist();
      }
    });
  }

  function createIrrigationQuickCalcHTML() {
    return (
      '<div class="card" style="padding:24px;margin-top:20px;border:1px solid #bae6fd;">' +
      '<h3 style="margin:0 0 8px 0;color:#0369a1;">💧 Calculadora de balance hídrico</h3>' +
      '<p style="margin:0 0 16px 0;font-size:14px;color:#64748b;">Satélite, valores de campo (ETo, pluviómetro, riego) o ambos. Calcula déficit y balance en mm y m³/ha.</p>' +
      '<div id="climate-irrigation-quick"></div>' +
      '</div>'
    );
  }

  function initIrrigationQuickCalc() {
    renderIrrigationQuickCalc();
  }

  function monthDiff(curr, prev) {
    var out = {};
    for (var m = 1; m <= 12; m++) {
      var key = String(m).padStart(2, '0');
      var c = Number(curr[key]);
      var p = Number(prev[key]);
      if (!Number.isFinite(c)) c = null;
      if (!Number.isFinite(p)) p = null;
      if (c == null && p == null) out[key] = null;
      else out[key] = round1((c || 0) - (p || 0));
    }
    return out;
  }

  function emptyDailyRange(reason) {
    return {
      time: [],
      precipitation_sum: [],
      et0_fao_evapotranspiration: [],
      unavailable: true,
      reason: reason || 'Sin datos'
    };
  }

  var OPEN_METEO_ARCHIVE_THRESHOLD_DAYS = 92;

  function parseIsoDateLocal(isoDate) {
    var parts = String(isoDate || '').split('-').map(function (p) { return parseInt(p, 10); });
    if (parts.length !== 3 || parts.some(function (p) { return !Number.isFinite(p); })) return null;
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  function daysFromTodayToStartDate(startDate) {
    var today = parseIsoDateLocal(todayIso());
    var start = parseIsoDateLocal(startDate);
    if (!today || !start) return 0;
    return Math.floor((today.getTime() - start.getTime()) / 86400000);
  }

  function shouldUseOpenMeteoArchive(startDate) {
    return daysFromTodayToStartDate(startDate) > OPEN_METEO_ARCHIVE_THRESHOLD_DAYS;
  }

  function climateSatelliteUnavailableMessage() {
    return 'La lectura satelital de lluvia y ET₀ no está disponible en este momento. Intenta de nuevo más tarde; tus datos guardados se mantienen sin cambios.';
  }

  function hasAnyMonthValue(monthsObj) {
    if (!monthsObj || typeof monthsObj !== 'object') return false;
    return Object.keys(monthsObj).some(function (k) {
      return monthsObj[k] != null && Number.isFinite(Number(monthsObj[k]));
    });
  }

  async function fetchOpenMeteoDailyRange(lat, lng, startDate, endDate, useArchive) {
    if (typeof useArchive !== 'boolean') useArchive = shouldUseOpenMeteoArchive(startDate);
    var base = useArchive
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast';
    var url =
      base +
      '?latitude=' +
      encodeURIComponent(lat) +
      '&longitude=' +
      encodeURIComponent(lng) +
      '&start_date=' +
      encodeURIComponent(startDate) +
      '&end_date=' +
      encodeURIComponent(endDate) +
      '&daily=precipitation_sum,et0_fao_evapotranspiration' +
      '&timezone=auto';
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { try { controller.abort(); } catch (e) {} }, 25000) : null;
    var res;
    try {
      res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    } catch (fetchErr) {
      if (fetchErr && fetchErr.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado consultando ' + (useArchive ? 'histórico' : 'pronóstico'));
      }
      throw fetchErr;
    } finally {
      if (timer) clearTimeout(timer);
    }
    var data = await res.json().catch(function () { return null; });
    if (!res.ok) {
      var reason = data && (data.reason || data.error);
      throw new Error(reason ? String(reason) : 'Open-Meteo HTTP ' + res.status);
    }
    if (data && data.error) {
      throw new Error(data.reason ? String(data.reason) : 'Open-Meteo rechazó la consulta');
    }
    var daily = data && data.daily ? data.daily : null;
    if (!daily || !Array.isArray(daily.time)) throw new Error('Sin datos diarios');
    return daily;
  }

  async function fetchYearDaily(lat, lng, year, endDateOverride) {
    var start = year + '-01-01';
    var end = endDateOverride || year + '-12-31';
    var today = todayIso();
    if (end > today) end = today;
    return await fetchOpenMeteoDailyRange(lat, lng, start, end, shouldUseOpenMeteoArchive(start));
  }

  async function fetchClimateRainfallAndET0(ev) {
    var btn = ev && ev.target ? ev.target.closest('button') : null;
    var loc = getLocation();
    if (!loc || loc.lat == null || loc.lng == null) {
      alert('⚠️ Define el polígono en Ubicación para consultar lluvia y ET₀.');
      return;
    }
    var status = document.getElementById('climate-rainfall-status');
    if (status) status.textContent = '🌧️ Consultando datos…';
    if (btn) btn.disabled = true;
    try {
      ensureClimateAnalysisStructures();
      var now = new Date();
      var currYear = now.getFullYear();
      var prevYear = currYear - 1;
      var today = todayIso();
      var yearsToFetch = [];
      for (var yi = CLIMATE_HISTORY_YEARS - 1; yi >= 0; yi--) yearsToFetch.push(currYear - yi);

      var dailyByYear = await Promise.all(
        yearsToFetch.map(function (y) {
          var end = y === currYear ? today : y + '-12-31';
          return fetchYearDaily(loc.lat, loc.lng, y, end).catch(function (err) {
            return emptyDailyRange(err && err.message ? err.message : 'Sin datos');
          });
        })
      );

      function buildYearsPayload(field) {
        var years = {};
        yearsToFetch.forEach(function (y, idx) {
          var daily = dailyByYear[idx] || emptyDailyRange('Sin datos');
          years[String(y)] = {
            months: aggregateDailyByMonth(daily.time, daily[field], y),
            partial: y === currYear,
            unavailable: !!daily.unavailable
          };
        });
        return years;
      }

      var rainYears = buildYearsPayload('precipitation_sum');
      var et0Years = buildYearsPayload('et0_fao_evapotranspiration');
      var rainPrev = rainYears[String(prevYear)] ? rainYears[String(prevYear)].months : {};
      var rainCurr = rainYears[String(currYear)] ? rainYears[String(currYear)].months : {};
      var et0Prev = et0Years[String(prevYear)] ? et0Years[String(prevYear)].months : {};
      var et0Curr = et0Years[String(currYear)] ? et0Years[String(currYear)].months : {};
      var hasRainPrev = hasAnyMonthValue(rainPrev);
      var hasRainCurr = hasAnyMonthValue(rainCurr);
      var hasEt0Prev = hasAnyMonthValue(et0Prev);
      var hasEt0Curr = hasAnyMonthValue(et0Curr);
      var anyUnavailable = dailyByYear.some(function (d) { return d && d.unavailable; });

      var p = getProject();
      var fetchedAt = new Date().toISOString();
      p.climateAnalysis.rainfall = {
        fetchedAt: fetchedAt,
        lat: loc.lat,
        lng: loc.lng,
        previousYear: prevYear,
        currentYear: currYear,
        years: rainYears,
        monthsPrev: rainPrev,
        monthsCurr: rainCurr,
        diff: hasRainPrev && hasRainCurr ? monthDiff(rainCurr, rainPrev) : {},
        partial: anyUnavailable,
        notes: anyUnavailable ? 'Algún año histórico no respondió; se muestra la información disponible.' : ''
      };
      p.climateAnalysis.et0 = {
        fetchedAt: fetchedAt,
        lat: loc.lat,
        lng: loc.lng,
        previousYear: prevYear,
        currentYear: currYear,
        years: et0Years,
        monthsPrev: et0Prev,
        monthsCurr: et0Curr,
        diff: hasEt0Prev && hasEt0Curr ? monthDiff(et0Curr, et0Prev) : {},
        partial: anyUnavailable,
        notes: anyUnavailable ? 'Algún año histórico no respondió; se muestra la información disponible.' : '',
        unit: 'mm'
      };
      p.climateAnalysis.lastUpdated = fetchedAt;
      var rolling = await fetchRollingClimateWindows(loc.lat, loc.lng);
      p.climateAnalysis.rolling = rolling;
      persistClimateAnalysis();
      initClimateChartYearVisibility(rainYears, et0Years);
      renderClimateRainfallTables();
      renderIrrigationQuickCalc();
      if (status) {
        status.textContent = (anyUnavailable ? '⚠️ Actualizado parcial ' : '✅ Actualizado ') + new Date().toLocaleString('es-MX');
      }
    } catch (err) {
      console.error(err);
      var userMsg = climateSatelliteUnavailableMessage();
      if (status) status.textContent = '⚠️ ' + userMsg;
      alert(userMsg);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function fmtMm(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return round1(v).toFixed(1);
  }

  function sumMonthsTotal(monthsObj, maxMonth) {
    if (!monthsObj || typeof monthsObj !== 'object') return null;
    var sum = 0;
    var hasAny = false;
    for (var m = 1; m <= 12; m++) {
      if (maxMonth != null && m > maxMonth) continue;
      var key = String(m).padStart(2, '0');
      var v = monthsObj[key];
      if (v != null && Number.isFinite(Number(v))) {
        sum += Number(v);
        hasAny = true;
      }
    }
    return hasAny ? round1(sum) : null;
  }

  function getClimateYearEntries(block) {
    if (!block) return [];
    if (block.years && typeof block.years === 'object') {
      return Object.keys(block.years)
        .map(function (k) {
          var y = parseInt(k, 10);
          var entry = block.years[k] || {};
          return {
            year: y,
            months: entry.months || {},
            partial: !!entry.partial,
            unavailable: !!entry.unavailable
          };
        })
        .filter(function (e) { return Number.isFinite(e.year); })
        .sort(function (a, b) { return a.year - b.year; });
    }
    var legacy = [];
    if (block.previousYear != null && block.monthsPrev) {
      legacy.push({ year: block.previousYear, months: block.monthsPrev, partial: false, unavailable: false });
    }
    if (block.currentYear != null && block.monthsCurr) {
      legacy.push({ year: block.currentYear, months: block.monthsCurr, partial: true, unavailable: false });
    }
    return legacy.sort(function (a, b) { return a.year - b.year; });
  }

  function initClimateChartYearVisibility(rainYears, et0Years) {
    var rainKeys = rainYears ? Object.keys(rainYears) : [];
    var et0Keys = et0Years ? Object.keys(et0Years) : [];
    climateChartYearsVisible.rain = {};
    climateChartYearsVisible.et0 = {};
    rainKeys.forEach(function (k) { climateChartYearsVisible.rain[k] = true; });
    et0Keys.forEach(function (k) { climateChartYearsVisible.et0[k] = true; });
  }

  function ensureClimateChartYearVisibility(rain, et0) {
    var rainEntries = getClimateYearEntries(rain);
    var et0Entries = getClimateYearEntries(et0);
    rainEntries.forEach(function (e) {
      if (climateChartYearsVisible.rain[String(e.year)] == null) climateChartYearsVisible.rain[String(e.year)] = true;
    });
    et0Entries.forEach(function (e) {
      if (climateChartYearsVisible.et0[String(e.year)] == null) climateChartYearsVisible.et0[String(e.year)] = true;
    });
  }

  function climateMetricMeta(kind) {
    if (kind === 'et0') {
      return {
        title: '☀️ ET₀ — Evapotranspiración de referencia (mm/mes)',
        titleColor: '#b45309',
        colors: CLIMATE_ET0_COLORS,
        canvasId: 'climate-et0-chart',
        metricKey: 'et0',
        subtitle: 'Evapotranspiración de referencia (FAO). Selecciona los años a comparar.'
      };
    }
    return {
      title: '🌧️ Precipitación acumulada (mm/mes)',
      titleColor: '#0369a1',
      colors: CLIMATE_RAIN_COLORS,
      canvasId: 'climate-rain-chart',
      metricKey: 'rain',
      subtitle: 'Lluvia mensual acumulada. Selecciona los años a comparar.'
    };
  }

  function monthsToChartSeries(monthsObj, maxMonth) {
    return MONTH_LABELS.map(function (_, idx) {
      if (maxMonth != null && idx + 1 > maxMonth) return null;
      var key = String(idx + 1).padStart(2, '0');
      var v = monthsObj && monthsObj[key];
      return v != null && Number.isFinite(Number(v)) ? round1(v) : null;
    });
  }

  function loadClimateChartJs(callback) {
    if (typeof window.loadChartJs === 'function') {
      window.loadChartJs(callback);
      return;
    }
    if (window.Chart) {
      callback();
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.onload = callback;
    document.head.appendChild(s);
  }

  function climateChartDestroyIfOrphaned(chart) {
    if (!chart) return null;
    try {
      if (!chart.canvas || !chart.canvas.isConnected) {
        try { chart.destroy(); } catch (e) {}
        return null;
      }
    } catch (e) {
      try { chart.destroy(); } catch (e2) {}
      return null;
    }
    return chart;
  }

  function makeClimateLineDataset(label, data, color, dashed) {
    var ds = {
      label: label,
      data: data,
      borderColor: color,
      backgroundColor: 'transparent',
      tension: 0.3,
      borderWidth: dashed ? 2.2 : 2.4,
      pointRadius: dashed ? 2 : 2.25,
      pointHoverRadius: 4,
      pointHitRadius: 6,
      pointBorderWidth: 1.2,
      pointBackgroundColor: color,
      pointBorderColor: '#ffffff',
      spanGaps: false
    };
    if (dashed) ds.borderDash = [7, 5];
    return ds;
  }

  function computeClimateYScale(datasets) {
    var vals = [];
    (datasets || []).forEach(function (ds) {
      (ds.data || []).forEach(function (v) {
        if (v != null && Number.isFinite(Number(v))) vals.push(Number(v));
      });
    });
    var y = {
      title: { display: true, text: 'mm/mes' },
      ticks: { padding: 10, maxTicksLimit: 10 },
      beginAtZero: true
    };
    if (!vals.length) return y;
    var maxV = Math.max.apply(null, vals);
    if (maxV > 0) {
      y.suggestedMax = Math.ceil((maxV * 1.12) / 10) * 10;
    }
    return y;
  }

  function makeClimateChartOptions(yScale) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 180, easing: 'easeOutQuad' },
      layout: { padding: { bottom: 8, top: 6, left: 2, right: 6 } },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 10,
            boxHeight: 10,
            generateLabels: function (chart) {
              return chart.data.datasets.map(function (ds, i) {
                return {
                  text: ds.label || '',
                  fillStyle: ds.borderColor,
                  strokeStyle: ds.borderColor,
                  lineWidth: ds.borderWidth || 2,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i,
                  fontColor: ds.borderColor,
                  pointStyle: 'circle'
                };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var v = ctx.parsed && ctx.parsed.y;
              return (ctx.dataset.label || '') + ': ' + (v != null && Number.isFinite(v) ? v.toFixed(1) + ' mm' : '—');
            }
          }
        }
      },
      scales: {
        y: yScale || { beginAtZero: true, title: { display: true, text: 'mm/mes' } },
        x: {
          type: 'category',
          title: { display: true, text: 'Mes' },
          ticks: { autoSkip: false }
        }
      }
    };
  }

  function buildClimateYearToggleHtml(metricKey, entries, colors, marginBottom) {
    if (!entries.length) return '';
    return (
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 ' +
      (marginBottom != null ? marginBottom : 12) +
      'px 0;">' +
      '<span style="font-size:13px;color:#64748b;font-weight:600;">Años visibles:</span>' +
      entries
        .map(function (entry, idx) {
          var yearKey = String(entry.year);
          var on = climateChartYearsVisible[metricKey][yearKey] !== false;
          var color = colors[idx] || colors[colors.length - 1];
          var label = entry.partial ? entry.year + ' (parcial)' : String(entry.year);
          return (
            '<button type="button" class="climate-chart-year-btn" data-metric="' +
            metricKey +
            '" data-year="' +
            yearKey +
            '" data-color="' +
            color +
            '" style="padding:6px 12px;border-radius:999px;border:2px solid ' +
            color +
            ';background:' +
            (on ? color : '#fff') +
            ';color:' +
            (on ? '#fff' : color) +
            ';font-size:12px;font-weight:700;cursor:pointer;">' +
            label +
            '</button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function buildClimateCombinedChartHtml(rain, et0) {
    var rainEntries = getClimateYearEntries(rain);
    var et0Entries = getClimateYearEntries(et0);
    if (!rainEntries.length && !et0Entries.length) {
      return '<p style="margin:0;color:#64748b;font-size:13px;">Sin datos para graficar.</p>';
    }
    var lat = rain && rain.lat != null ? rain.lat : et0 && et0.lat;
    var lng = rain && rain.lng != null ? rain.lng : et0 && et0.lng;
    var notesHtml = '';
    if (rain && rain.notes) {
      notesHtml += '<p style="margin:0 0 8px;font-size:12px;color:#b45309;">⚠️ Lluvia: ' + rain.notes + '</p>';
    }
    if (et0 && et0.notes) {
      notesHtml += '<p style="margin:0 0 8px;font-size:12px;color:#b45309;">⚠️ ET₀: ' + et0.notes + '</p>';
    }
    return (
      '<h4 style="margin:0 0 8px;color:#0f172a;font-size:16px;font-weight:700;">📊 Lluvia vs ET₀ (mm/mes)</h4>' +
      '<p style="margin:0 0 14px;font-size:13px;color:#64748b;line-height:1.45;">Punto del predio: <strong>' +
      Number(lat).toFixed(5) +
      ', ' +
      Number(lng).toFixed(5) +
      '</strong>. Misma escala para comparar lo llovido frente a la evapotranspiración de referencia. Líneas <strong>continuas</strong> = lluvia; <strong>discontinuas</strong> = ET₀.</p>' +
      notesHtml +
      '<div style="margin-bottom:4px;">' +
      '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0369a1;">🌧️ Precipitación acumulada (mm/mes)</p>' +
      buildClimateYearToggleHtml('rain', rainEntries, CLIMATE_RAIN_COLORS, 14) +
      '</div>' +
      '<div style="margin-bottom:12px;">' +
      '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b45309;">☀️ ET₀ — Evapotranspiración de referencia (mm/mes)</p>' +
      buildClimateYearToggleHtml('et0', et0Entries, CLIMATE_ET0_COLORS, 0) +
      '</div>' +
      '<div style="height:' +
      CLIMATE_CHART_HEIGHT_PX +
      'px;position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px 6px;">' +
      '<canvas id="' +
      CLIMATE_COMBINED_CANVAS_ID +
      '"></canvas></div>'
    );
  }

  function buildClimateChartBlock(kind, block, lat, lng) {
    var meta = climateMetricMeta(kind);
    var entries = getClimateYearEntries(block);
    if (!entries.length) return '';
    var now = new Date();
    var maxMonthCurr = now.getMonth() + 1;
    return (
      '<div style="margin-bottom:' +
      (kind === 'et0' ? '0' : '24px') +
      ';">' +
      '<h4 style="margin:0 0 10px 0;color:' +
      meta.titleColor +
      ';">' +
      meta.title +
      '</h4>' +
      '<p style="margin:0 0 10px 0;font-size:13px;color:#64748b;">Punto del predio: ' +
      Number(lat).toFixed(5) +
      ', ' +
      Number(lng).toFixed(5) +
      '. ' +
      meta.subtitle +
      '</p>' +
      (block.notes ? '<p style="margin:0 0 10px 0;font-size:12px;color:#b45309;">⚠️ ' + block.notes + '</p>' : '') +
      buildClimateYearToggleHtml(meta.metricKey, entries, meta.colors) +
      '<div style="height:' +
      CLIMATE_CHART_HEIGHT_PX +
      'px;position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px 6px;">' +
      '<canvas id="' +
      meta.canvasId +
      '"></canvas></div></div>'
    );
  }

  function destroyClimateCharts() {
    if (climateCombinedChart) {
      try { climateCombinedChart.destroy(); } catch (e) {}
      climateCombinedChart = null;
    }
  }

  function getVisibleClimateDatasets(entries, metricKey, colors, opts) {
    opts = opts || {};
    var now = new Date();
    var currYear = now.getFullYear();
    var prefix = opts.labelPrefix || '';
    var dashed = !!opts.dashed;
    return entries
      .filter(function (entry) {
        return climateChartYearsVisible[metricKey][String(entry.year)] !== false;
      })
      .map(function (entry) {
        var colorIdx = entries.findIndex(function (e) { return e.year === entry.year; });
        var color = colors[colorIdx] != null ? colors[colorIdx] : colors[colors.length - 1];
        var maxMonth = entry.partial || entry.year === currYear ? now.getMonth() + 1 : 12;
        var yearLabel = entry.partial ? String(entry.year) + ' (parcial)' : String(entry.year);
        var label = prefix ? prefix + ' ' + yearLabel : yearLabel;
        return makeClimateLineDataset(label, monthsToChartSeries(entry.months, maxMonth), color, dashed);
      });
  }

  function getCombinedClimateChartDatasets(rain, et0) {
    var rainDs = rain
      ? getVisibleClimateDatasets(getClimateYearEntries(rain), 'rain', CLIMATE_RAIN_COLORS, {
          labelPrefix: '🌧',
          dashed: false
        })
      : [];
    var et0Ds = et0
      ? getVisibleClimateDatasets(getClimateYearEntries(et0), 'et0', CLIMATE_ET0_COLORS, {
          labelPrefix: '☀ ET₀',
          dashed: true
        })
      : [];
    return rainDs.concat(et0Ds);
  }

  function updateClimateCombinedChart(rain, et0) {
    if (!window.Chart) return;
    var ctx = document.getElementById(CLIMATE_COMBINED_CANVAS_ID);
    if (!ctx) return;
    climateCombinedChart = climateChartDestroyIfOrphaned(climateCombinedChart);
    var datasets = getCombinedClimateChartDatasets(rain, et0);
    var opts = makeClimateChartOptions(computeClimateYScale(datasets));
    if (!climateCombinedChart) {
      try {
        climateCombinedChart = new Chart(ctx.getContext('2d'), {
          type: 'line',
          data: { labels: MONTH_LABELS.slice(), datasets: datasets },
          options: opts
        });
      } catch (e) {
        console.warn('climate combined chart', e);
      }
      return;
    }
    climateCombinedChart.data.labels = MONTH_LABELS.slice();
    climateCombinedChart.data.datasets = datasets;
    climateCombinedChart.options = opts;
    climateCombinedChart.update();
  }

  function renderClimateRainfallCharts(rain, et0) {
    var wrap = document.getElementById('climate-rainfall-charts');
    if (!wrap) return;
    destroyClimateCharts();
    ensureClimateChartYearVisibility(rain, et0);
    wrap.innerHTML =
      '<div style="background:linear-gradient(180deg,#f8fafc 0%,#fff 100%);border:1px solid #e2e8f0;border-radius:12px;padding:16px 16px 12px;">' +
      buildClimateCombinedChartHtml(rain, et0) +
      '</div>';
    bindClimateChartYearToggles(wrap);
    loadClimateChartJs(function () {
      updateClimateCombinedChart(rain, et0);
      resizeClimateCharts();
    });
  }

  function resizeClimateCharts() {
    var doResize = function () {
      try {
        if (climateCombinedChart && typeof climateCombinedChart.resize === 'function') climateCombinedChart.resize();
      } catch (e) {}
    };
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        doResize();
        setTimeout(doResize, 120);
      });
    });
  }

  function bindClimateChartYearToggles(wrap) {
    if (!wrap || wrap.getAttribute('data-np-chart-years-bound') === '1') return;
    wrap.setAttribute('data-np-chart-years-bound', '1');
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.climate-chart-year-btn');
      if (!btn) return;
      var metric = btn.getAttribute('data-metric');
      var year = btn.getAttribute('data-year');
      if (!metric || !year || !climateChartYearsVisible[metric]) return;
      climateChartYearsVisible[metric][year] = climateChartYearsVisible[metric][year] === false;
      var on = climateChartYearsVisible[metric][year] !== false;
      var color = btn.getAttribute('data-color') || '#64748b';
      btn.style.background = on ? color : '#fff';
      btn.style.color = on ? '#fff' : color;
      ensureClimateAnalysisStructures();
      var p = getProject();
      var rain = p && p.climateAnalysis && p.climateAnalysis.rainfall;
      var et0 = p && p.climateAnalysis && p.climateAnalysis.et0;
      updateClimateCombinedChart(rain, et0);
    });
  }

  function setClimateRainfallViewMode(mode) {
    climateRainfallViewMode = mode === 'charts' ? 'charts' : 'table';
    var tableWrap = document.getElementById('climate-rainfall-view-table');
    var chartsWrap = document.getElementById('climate-rainfall-view-charts');
    var tableBtn = document.getElementById('climate-rainfall-view-table-btn');
    var chartsBtn = document.getElementById('climate-rainfall-view-charts-btn');
    if (tableWrap) tableWrap.style.display = climateRainfallViewMode === 'table' ? 'block' : 'none';
    if (chartsWrap) chartsWrap.style.display = climateRainfallViewMode === 'charts' ? 'block' : 'none';
    if (tableBtn) {
      tableBtn.style.background = climateRainfallViewMode === 'table' ? '#0284c7' : '#fff';
      tableBtn.style.color = climateRainfallViewMode === 'table' ? '#fff' : '#0284c7';
    }
    if (chartsBtn) {
      chartsBtn.style.background = climateRainfallViewMode === 'charts' ? '#0284c7' : '#fff';
      chartsBtn.style.color = climateRainfallViewMode === 'charts' ? '#fff' : '#0284c7';
    }
    if (climateRainfallViewMode === 'charts') {
      ensureClimateAnalysisStructures();
      var p = getProject();
      var rain = p && p.climateAnalysis && p.climateAnalysis.rainfall;
      var et0 = p && p.climateAnalysis && p.climateAnalysis.et0;
      if (rain && rain.monthsPrev) renderClimateRainfallCharts(rain, et0);
      else {
        var chartsInner = document.getElementById('climate-rainfall-charts');
        if (chartsInner) {
          chartsInner.innerHTML =
            '<p style="color:#64748b;margin:0;">Pulsa <strong>Obtener lluvia y ET₀</strong> para cargar las gráficas.</p>';
        }
      }
      resizeClimateCharts();
    }
  }

  function bindClimateRainfallViewToggle() {
    var tableBtn = document.getElementById('climate-rainfall-view-table-btn');
    var chartsBtn = document.getElementById('climate-rainfall-view-charts-btn');
    if (!tableBtn || !chartsBtn) return;
    if (tableBtn.getAttribute('data-np-bound') === '1') {
      setClimateRainfallViewMode(climateRainfallViewMode);
      return;
    }
    tableBtn.setAttribute('data-np-bound', '1');
    chartsBtn.setAttribute('data-np-bound', '1');
    tableBtn.addEventListener('click', function () { setClimateRainfallViewMode('table'); });
    chartsBtn.addEventListener('click', function () { setClimateRainfallViewMode('charts'); });
    setClimateRainfallViewMode(climateRainfallViewMode);
  }

  function buildClimateLocationNote(block) {
    if (!block) return '';
    return (
      'Punto del predio: ' +
      Number(block.lat).toFixed(5) +
      ', ' +
      Number(block.lng).toFixed(5) +
      '. ' +
      (block.partial
        ? 'Consulta parcial: el proveedor histórico no respondió en algún año; se muestra la información disponible.'
        : 'Histórico completo por año; año en curso hasta el mes actual.')
    );
  }

  function buildMonthlyTableHead() {
    return (
      '<thead><tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">' +
      '<th style="padding:8px;text-align:left;">Año</th>' +
      '<th style="padding:8px;text-align:center;white-space:nowrap;" title="Suma de los meses mostrados en la fila">Acum. anual (mm)</th>' +
      MONTH_LABELS.map(function (l) {
        return '<th style="padding:8px;text-align:center;">' + l + '</th>';
      }).join('') +
      '</tr></thead>'
    );
  }

  function buildMonthlyTableRow(label, monthsObj, year, maxMonth) {
    var annualTotal = sumMonthsTotal(monthsObj, maxMonth);
    var totalCell =
      '<td style="padding:8px;text-align:center;font-weight:700;background:#f8fafc;color:#0f172a;">' +
      fmtMm(annualTotal) +
      '</td>';
    var cells = MONTH_LABELS.map(function (_, idx) {
      var m = String(idx + 1).padStart(2, '0');
      if (maxMonth != null && idx + 1 > maxMonth) {
        return '<td style="padding:8px;text-align:center;color:#94a3b8;">—</td>';
      }
      return '<td style="padding:8px;text-align:center;">' + fmtMm(monthsObj && monthsObj[m]) + '</td>';
    }).join('');
    return (
      '<tr style="border-bottom:1px solid #e5e7eb;">' +
      '<td style="padding:8px;font-weight:600;white-space:nowrap;">' +
      label +
      '</td>' +
      totalCell +
      cells +
      '</tr>'
    );
  }

  function renderClimateRainfallTables() {
    bindClimateRainfallViewToggle();
    var tableWrap = document.getElementById('climate-rainfall-tables');
    var chartsWrap = document.getElementById('climate-rainfall-charts');
    if (!tableWrap) return;
    ensureClimateAnalysisStructures();
    var p = getProject();
    var rain = p && p.climateAnalysis && p.climateAnalysis.rainfall;
    var et0 = p && p.climateAnalysis && p.climateAnalysis.et0;
    if (!rain || !rain.monthsPrev) {
      tableWrap.innerHTML =
        '<p style="color:#64748b;margin:0;">Pulsa <strong>Obtener lluvia y ET₀</strong> para cargar datos mensuales del punto del predio.</p>';
      if (chartsWrap) {
        chartsWrap.innerHTML =
          '<p style="color:#64748b;margin:0;">Pulsa <strong>Obtener lluvia y ET₀</strong> para cargar las gráficas.</p>';
      }
      return;
    }
    ensureClimateChartYearVisibility(rain, et0);
    var now = new Date();
    var maxMonthCurr = now.getMonth() + 1;
    var prevY = rain.previousYear || now.getFullYear() - 1;
    var currY = rain.currentYear || now.getFullYear();
    var head = buildMonthlyTableHead();
    var rainEntries = getClimateYearEntries(rain);

    var rainRows = rainEntries
      .map(function (entry) {
        var label = entry.partial ? String(entry.year) + ' (parcial)' : String(entry.year);
        var maxM = entry.partial ? maxMonthCurr : 12;
        return buildMonthlyTableRow(label, entry.months, entry.year, maxM);
      })
      .join('');
    if (rain.diff && Object.keys(rain.diff).length) {
      rainRows += buildMonthlyTableRow('Diferencia (' + currY + ' − ' + prevY + ')', rain.diff, null, maxMonthCurr);
    }

    var rainHtml =
      '<div style="margin-bottom:24px;">' +
      '<h4 style="margin:0 0 10px 0;color:#0369a1;">🌧️ Precipitación acumulada (mm/mes)</h4>' +
      '<p style="margin:0 0 10px 0;font-size:13px;color:#64748b;">' +
      buildClimateLocationNote(rain) +
      '</p>' +
      (rain.notes ? '<p style="margin:0 0 10px 0;font-size:12px;color:#b45309;">⚠️ ' + rain.notes + '</p>' : '') +
      '<div style="overflow-x:auto;"><table style="width:100%;min-width:720px;border-collapse:collapse;font-size:13px;">' +
      head +
      '<tbody>' +
      rainRows +
      '</tbody></table></div></div>';

    var et0Html = '';
    if (et0 && et0.monthsPrev) {
      var et0Entries = getClimateYearEntries(et0);
      var et0Rows = et0Entries
        .map(function (entry) {
          var label = entry.partial ? String(entry.year) + ' (parcial)' : String(entry.year);
          var maxM = entry.partial ? maxMonthCurr : 12;
          return buildMonthlyTableRow(label, entry.months, entry.year, maxM);
        })
        .join('');
      if (et0.diff && Object.keys(et0.diff).length) {
        et0Rows += buildMonthlyTableRow(
          'Diferencia (' + et0.currentYear + ' − ' + et0.previousYear + ')',
          et0.diff,
          null,
          maxMonthCurr
        );
      }
      et0Html =
        '<div style="margin-bottom:8px;">' +
        '<h4 style="margin:0 0 10px 0;color:#b45309;">☀️ ET₀ — Evapotranspiración de referencia (mm/mes, suma diaria)</h4>' +
        '<p style="margin:0 0 10px 0;font-size:13px;color:#64748b;">' +
        buildClimateLocationNote(et0) +
        '</p>' +
        (et0.notes ? '<p style="margin:0 0 10px 0;font-size:12px;color:#b45309;">⚠️ ' + et0.notes + '</p>' : '') +
        '<div style="overflow-x:auto;"><table style="width:100%;min-width:720px;border-collapse:collapse;font-size:13px;">' +
        head +
        '<tbody>' +
        et0Rows +
        '</tbody></table></div></div>';
    }

    tableWrap.innerHTML = rainHtml + et0Html;
    if (climateRainfallViewMode === 'charts') renderClimateRainfallCharts(rain, et0);
  }

  async function fetchClimateLiveReading(ev) {
    var btn = ev && ev.target ? ev.target.closest('button') : null;
    var loc = getLocation();
    if (!loc || loc.lat == null || loc.lng == null) {
      alert('⚠️ Define el polígono en Ubicación.');
      return;
    }
    var status = document.getElementById('climate-live-status');
    if (status) status.textContent = '🌤️ Consultando…';
    if (btn) btn.disabled = true;
    try {
      var url =
        'https://api.open-meteo.com/v1/forecast?latitude=' +
        encodeURIComponent(loc.lat) +
        '&longitude=' +
        encodeURIComponent(loc.lng) +
        '&current=temperature_2m,relative_humidity_2m,shortwave_radiation,uv_index,dew_point_2m,wind_speed_10m,wind_direction_10m,cloud_cover' +
        '&wind_speed_unit=kmh';
      var res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var cur = data && data.current;
      if (!cur) throw new Error('Sin lectura actual');

      ensureClimateAnalysisStructures();
      var rolling = await fetchRollingClimateWindows(loc.lat, loc.lng);
      var dayWindow = getRollingForPeriod(rolling, 1);
      var reading = {
        fetchedAt: new Date().toISOString(),
        lat: loc.lat,
        lng: loc.lng,
        temperature: cur.temperature_2m,
        humidity: cur.relative_humidity_2m,
        shortwaveRadiation: cur.shortwave_radiation,
        uvIndex: cur.uv_index,
        dewPoint: cur.dew_point_2m,
        windSpeedKmh: cur.wind_speed_10m,
        windDirection: cur.wind_direction_10m,
        cloudCover: cur.cloud_cover,
        rainTodayMm: dayWindow.rain,
        et0TodayMm: dayWindow.et0
      };
      var p = getProject();
      p.climateAnalysis.lastReading = reading;
      p.climateAnalysis.rolling = rolling;
      p.climateAnalysis.lastUpdated = reading.fetchedAt;
      persistClimateAnalysis();
      renderClimateLiveReading(reading);
      if (status) status.textContent = '✅ ' + new Date().toLocaleString('es-MX');
    } catch (err) {
      console.error(err);
      if (status) status.textContent = '❌ Error';
      alert('No se pudo obtener la lectura del clima.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function resolveLiveDayRainEt0(r) {
    var rain = r && r.rainTodayMm != null ? r.rainTodayMm : null;
    var et0 = r && r.et0TodayMm != null ? r.et0TodayMm : null;
    if (rain == null || et0 == null) {
      var p = getProject();
      var rolling = p && p.climateAnalysis && p.climateAnalysis.rolling;
      var w = getRollingForPeriod(rolling, 1);
      if (rain == null) rain = w.rain;
      if (et0 == null) et0 = w.et0;
    }
    return { rain: rain, et0: et0 };
  }

  function windDirLabel(deg) {
    var n = Number(deg);
    if (!Number.isFinite(n)) return '—';
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    var idx = Math.round(n / 45) % 8;
    return dirs[idx] + ' (' + Math.round(n) + '°)';
  }

  function renderClimateLiveReading(r) {
    var grid = document.getElementById('climate-live-grid');
    if (!grid) return;
    if (!r) {
      grid.innerHTML = '<p style="color:#64748b;">Sin lectura guardada.</p>';
      return;
    }
    function card(label, value, icon) {
      return (
        '<div style="background:#fff;padding:14px;border-radius:8px;border:1px solid #e5e7eb;">' +
        '<div style="font-size:13px;color:#64748b;margin-bottom:4px;">' +
        icon +
        ' ' +
        label +
        '</div>' +
        '<div style="font-size:22px;font-weight:700;color:#0f172a;">' +
        value +
        '</div></div>'
      );
    }
    var dayWater = resolveLiveDayRainEt0(r);
    grid.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">' +
      card('Temperatura', fmtMm(r.temperature) + ' °C', '🌡️') +
      card('Humedad relativa', fmtMm(r.humidity) + ' %', '💧') +
      card('Radiación solar', r.shortwaveRadiation != null ? Math.round(r.shortwaveRadiation) + ' W/m²' : '—', '☀️') +
      card('Índice UV', r.uvIndex != null ? fmtMm(r.uvIndex) : '—', '🧴') +
      card('Punto de rocío', r.dewPoint != null ? fmtMm(r.dewPoint) + ' °C' : '—', '🌫️') +
      card('Viento', r.windSpeedKmh != null ? fmtMm(r.windSpeedKmh) + ' km/h' : '—', '💨') +
      card('Dirección', windDirLabel(r.windDirection), '🧭') +
      card('Nubosidad', r.cloudCover != null ? Math.round(r.cloudCover) + ' %' : '—', '☁️') +
      card('Lluvia acumulada (hoy)', dayWater.rain != null ? fmtMm(dayWater.rain) + ' mm' : '—', '🌧️') +
      card('ET₀ (hoy)', dayWater.et0 != null ? fmtMm(dayWater.et0) + ' mm' : '—', '💧') +
      '</div>' +
      '<p style="margin:12px 0 0;font-size:12px;color:#64748b;">Coordenadas: ' +
      Number(r.lat).toFixed(5) +
      ', ' +
      Number(r.lng).toFixed(5) +
      (r.fetchedAt ? ' · ' + new Date(r.fetchedAt).toLocaleString('es-MX') : '') +
      '</p>';
  }

  function loadClimateSavedData() {
    ensureClimateAnalysisStructures();
    renderClimateRainfallTables();
    renderIrrigationQuickCalc();
    var p = getProject();
    if (p && p.climateAnalysis && p.climateAnalysis.lastReading) {
      renderClimateLiveReading(p.climateAnalysis.lastReading);
    }
  }

  function climateSaveLastTab(tabId) {
    ensureClimateAnalysisStructures();
    getProject().climateAnalysis.lastTab = tabId;
    persistClimateAnalysis();
  }

  function climateRestoreLastTab() {
    var container = document.querySelector('.climate-container');
    if (!container) return;
    var last = 'climate-vpd';
    try {
      ensureClimateAnalysisStructures();
      if (getProject().climateAnalysis.lastTab) last = getProject().climateAnalysis.lastTab;
    } catch (e) {}
    var valid = ['climate-vpd', 'climate-rainfall', 'climate-live'];
    if (valid.indexOf(last) < 0) last = 'climate-vpd';
    container.querySelectorAll('.tab-button').forEach(function (b) {
      b.classList.remove('active');
    });
    container.querySelectorAll('.tab-content').forEach(function (c) {
      c.classList.remove('active');
    });
    var btn = container.querySelector('.tab-button[data-tab="' + last + '"]');
    var content = document.getElementById(last);
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
  }

  function initClimateTabs() {
    var container = document.querySelector('.climate-container');
    if (!container || container.getAttribute('data-np-climate-tabs') === '1') return;
    container.setAttribute('data-np-climate-tabs', '1');
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab-button');
      if (!btn || !btn.closest('.climate-container')) return;
      var tabId = btn.getAttribute('data-tab');
      if (!tabId || btn.classList.contains('active')) return;
      if (tabId === 'climate-vpd' && typeof window.saveVPDAnalysisFromUIToStorage === 'function') {
        try {
          window.saveVPDAnalysisFromUIToStorage();
        } catch (err) {}
      }
      container.querySelectorAll('.tab-button').forEach(function (b) {
        b.classList.remove('active');
      });
      container.querySelectorAll('.tab-content').forEach(function (c) {
        c.classList.remove('active');
      });
      btn.classList.add('active');
      var target = document.getElementById(tabId);
      if (target) target.classList.add('active');
      climateSaveLastTab(tabId);
      if (tabId === 'climate-rainfall') {
        renderClimateRainfallTables();
        renderIrrigationQuickCalc();
        if (climateRainfallViewMode === 'charts') resizeClimateCharts();
      }
      if (tabId === 'climate-live') {
        var p = getProject();
        if (p && p.climateAnalysis && p.climateAnalysis.lastReading) {
          renderClimateLiveReading(p.climateAnalysis.lastReading);
        }
      }
    });
    climateRestoreLastTab();
    initIrrigationQuickCalc();
  }

  function createClimateRainfallTabHTML(hasPolygon, loc) {
    if (!hasPolygon) {
      return (
        '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;">' +
        '<p style="margin:0;color:#92400e;">⚠️ Agrega un polígono en <strong>Ubicación</strong> para consultar lluvia y ET₀.</p></div>'
      );
    }
    return (
      '<div class="card" style="padding:24px;">' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
      '<h3 style="margin:0;color:#0369a1;">🌧️ Lluvia acumulada y ET₀</h3>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
      '<button type="button" id="climate-rainfall-view-table-btn" style="padding:8px 14px;border-radius:8px;border:2px solid #0284c7;background:#0284c7;color:#fff;font-weight:600;cursor:pointer;font-size:13px;">📋 Tabla · Lluvia y ET₀</button>' +
      '<button type="button" id="climate-rainfall-view-charts-btn" style="padding:8px 14px;border-radius:8px;border:2px solid #0284c7;background:#fff;color:#0284c7;font-weight:600;cursor:pointer;font-size:13px;">📈 Gráficas · Lluvia y ET₀</button>' +
      '</div></div>' +
      '<p style="margin:0 0 16px 0;font-size:14px;color:#64748b;">Punto: <strong>' +
      loc.lat.toFixed(5) +
      ', ' +
      loc.lng.toFixed(5) +
      '</strong> (centro del polígono). Hasta ' +
      CLIMATE_HISTORY_YEARS +
      ' años.</p>' +
      '<button type="button" id="climate-btn-fetch-rainfall" onclick="window.fetchClimateRainfallAndET0 && window.fetchClimateRainfallAndET0(event)" ' +
      'style="padding:12px 18px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;margin-bottom:12px;">⬇️ Obtener lluvia y ET₀</button>' +
      '<p id="climate-rainfall-status" style="margin:0 0 16px 0;font-size:13px;color:#64748b;"></p>' +
      '<div id="climate-rainfall-view-table"><div id="climate-rainfall-tables"></div></div>' +
      '<div id="climate-rainfall-view-charts" style="display:none;"><div id="climate-rainfall-charts"></div></div>' +
      '</div>' +
      createIrrigationQuickCalcHTML()
    );
  }

  function createClimateLiveTabHTML(hasPolygon, loc) {
    if (!hasPolygon) {
      return (
        '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;">' +
        '<p style="margin:0;color:#92400e;">⚠️ Agrega un polígono en <strong>Ubicación</strong>.</p></div>'
      );
    }
    return (
      '<div class="card" style="padding:24px;">' +
      '<h3 style="margin:0 0 8px 0;color:#0f766e;">🌤️ Tiempo actual en el predio</h3>' +
      '<p style="margin:0 0 16px 0;font-size:14px;color:#64748b;">Lectura en el punto ' +
      loc.lat.toFixed(5) +
      ', ' +
      loc.lng.toFixed(5) +
      '.</p>' +
      '<button type="button" onclick="window.fetchClimateLiveReading && window.fetchClimateLiveReading(event)" ' +
      'style="padding:12px 18px;background:#0d9488;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;margin-bottom:12px;">📡 Obtener lectura</button>' +
      '<p id="climate-live-status" style="margin:0 0 12px 0;font-size:13px;color:#64748b;"></p>' +
      '<div id="climate-live-grid"></div>' +
      '</div>'
    );
  }

  window.ensureClimateAnalysisStructures = ensureClimateAnalysisStructures;
  window.fetchClimateRainfallAndET0 = fetchClimateRainfallAndET0;
  window.fetchClimateLiveReading = fetchClimateLiveReading;
  window.renderClimateRainfallTables = renderClimateRainfallTables;
  window.renderIrrigationQuickCalc = renderIrrigationQuickCalc;
  window.initIrrigationQuickCalc = initIrrigationQuickCalc;
  window.renderClimateLiveReading = renderClimateLiveReading;
  window.loadClimateSavedData = loadClimateSavedData;
  window.initClimateTabs = initClimateTabs;
  window.createClimateRainfallTabHTML = createClimateRainfallTabHTML;
  window.createClimateLiveTabHTML = createClimateLiveTabHTML;
  window.persistClimateAnalysis = persistClimateAnalysis;

  function getClimateChartsDataUrlsForReport(rain, et0, callback) {
    var result = { rain: null, et0: null };
    if (typeof callback !== 'function') return result;
    if ((!rain || !rain.monthsPrev) && (!et0 || !et0.monthsPrev)) {
      callback(result);
      return;
    }
    loadClimateChartJs(function () {
      if (!window.Chart) {
        callback(result);
        return;
      }
      var now = new Date();
      var maxMonthCurr = now.getMonth() + 1;

      function buildReportChart(kind, block) {
        if (!block || !block.monthsPrev) return null;
        var meta = climateMetricMeta(kind);
        var entries = getClimateYearEntries(block);
        if (!entries.length) return null;
        var datasets = entries.map(function (entry, idx) {
          var color = meta.colors[idx] != null ? meta.colors[idx] : meta.colors[meta.colors.length - 1];
          var maxMonth = entry.partial ? maxMonthCurr : 12;
          var label = entry.partial ? String(entry.year) + ' (parcial)' : String(entry.year);
          if (kind === 'et0') label = '☀ ET₀ ' + label;
          else if (kind === 'rain') label = '🌧 ' + label;
          return makeClimateLineDataset(label, monthsToChartSeries(entry.months, maxMonth), color, kind === 'et0');
        });
        var canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = CLIMATE_CHART_HEIGHT_PX;
        canvas.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(canvas);
        var chart = null;
        try {
          chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: MONTH_LABELS.slice(), datasets: datasets },
            options: {
              responsive: false,
              maintainAspectRatio: false,
              animation: false,
              layout: { padding: { bottom: 8, top: 6, left: 2, right: 6 } },
              plugins: {
                legend: {
                  position: 'top',
                  labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10 }
                }
              },
              scales: {
                y: computeClimateYScale(datasets),
                x: { type: 'category', title: { display: true, text: 'Mes' }, ticks: { autoSkip: false } }
              }
            }
          });
          return (chart && chart.toBase64Image) ? chart.toBase64Image() : canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('getClimateChartsDataUrlsForReport ' + kind, e);
          return null;
        } finally {
          if (chart) {
            try { chart.destroy(); } catch (e2) {}
          }
          canvas.remove();
        }
      }

      result.rain = buildReportChart('rain', rain);
      result.et0 = buildReportChart('et0', et0);
      callback(result);
    });
  }

  function getClimateIrrigationQuickCalcSummary() {
    ensureClimateAnalysisStructures();
    var p = getProject();
    if (!p || !p.climateAnalysis) return null;
    var st = getIrrigationQuickCalcState();
    var rolling = p.climateAnalysis.rolling || null;
    var res = computeIrrigationQuickResults(st, rolling);
    return { state: st, results: res, rolling: rolling };
  }
  window.getClimateIrrigationQuickCalcSummary = getClimateIrrigationQuickCalcSummary;
  window.getClimateYearEntries = getClimateYearEntries;
  window.getClimateChartsDataUrlsForReport = getClimateChartsDataUrlsForReport;
  window.CLIMATE_RAIN_COLORS = CLIMATE_RAIN_COLORS;
  window.CLIMATE_ET0_COLORS = CLIMATE_ET0_COLORS;
  window.CLIMATE_MONTH_LABELS = MONTH_LABELS;
})();
