/**
 * Lectura Satelital — histórico por periodos (quincenal/mensual) del predio.
 * Combina NDVI/NDMI (Pilot Sentinel-2 por rango de fechas) con clima (Open-Meteo:
 * VPD promedio, ET₀ acumulada, lluvia acumulada) y riego manual por periodo.
 *
 * Reutiliza helpers globales de map.js (np_getRadarAccessToken, np_polygonCoordsForPilot,
 * getNutriPlantApiBase) y de dashboard.js (calculateVPDAdvanced/Simple).
 */
(function () {
  'use strict';

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var lecturaChart = null;
  var lecturaPollTimer = null;
  var lecturaSeriesVis = {
    ndvi: true,
    ndmi: true,
    vpd: true,
    et0: true,
    rain: true,
    riego: true
  };

  // ---------- utilidades de fecha ----------
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseIso(iso) {
    var p = String(iso || '').split('-').map(function (x) { return parseInt(x, 10); });
    if (p.length !== 3 || p.some(function (n) { return !Number.isFinite(n); })) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function toIso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(iso, days) {
    var d = parseIso(iso);
    if (!d) return iso;
    d.setDate(d.getDate() + days);
    return toIso(d);
  }
  function minIso(a, b) { return a < b ? a : b; }
  function fmtDayMonth(iso) {
    var d = parseIso(iso);
    if (!d) return iso;
    return d.getDate() + ' ' + MESES[d.getMonth()];
  }

  /** Construye N periodos hacia atrás desde endIso (clamp a hoy). */
  function buildPeriods(frequency, count, endIso) {
    var periods = [];
    var today = todayIso();
    var n = Math.min(Math.max(parseInt(count, 10) || 2, 2), 6);
    var end = endIso && endIso <= today ? endIso : today;

    if (frequency === 'mensual') {
      var base = parseIso(end);
      for (var i = 0; i < n; i++) {
        var y = base.getFullYear();
        var m = base.getMonth() - i;
        var d = new Date(y, m, 1);
        var first = new Date(d.getFullYear(), d.getMonth(), 1);
        var last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        var startIso = toIso(first);
        var endIsoP = minIso(toIso(last), today);
        periods.push({
          index: i,
          frequency: 'mensual',
          date_start: startIso,
          date_end: endIsoP,
          label: MESES[first.getMonth()] + ' ' + first.getFullYear()
        });
      }
    } else {
      // quincenal: bloques contiguos de 15 días
      for (var q = 0; q < n; q++) {
        var pEnd = addDays(end, -q * 15);
        var pStart = addDays(pEnd, -14);
        var pEndClamped = minIso(pEnd, today);
        periods.push({
          index: q,
          frequency: 'quincenal',
          date_start: pStart,
          date_end: pEndClamped,
          label: fmtDayMonth(pStart) + ' – ' + fmtDayMonth(pEndClamped)
        });
      }
    }
    return periods;
  }

  // ---------- helpers de acceso ----------
  function getToken() {
    if (typeof np_getRadarAccessToken === 'function') return np_getRadarAccessToken();
    return Promise.resolve(null);
  }
  function apiUrl(path) {
    var base = typeof window.getNutriPlantApiBase === 'function' ? window.getNutriPlantApiBase() : '';
    return (base || '').replace(/\/$/, '') + path;
  }
  function getProject() {
    if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap && typeof nutriPlantMap.getCurrentProject === 'function') {
      return nutriPlantMap.getCurrentProject();
    }
    return typeof window.currentProject !== 'undefined' ? window.currentProject : null;
  }
  function getPolygonCoords() {
    if (typeof np_polygonCoordsForPilot === 'function') return np_polygonCoordsForPilot();
    return null;
  }
  function polygonCenter(coords) {
    if (!coords || !coords.length) return null;
    var sLat = 0, sLng = 0;
    coords.forEach(function (c) { sLat += Number(c[0]); sLng += Number(c[1]); });
    return { lat: sLat / coords.length, lng: sLng / coords.length };
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- persistencia ----------
  function loadState() {
    var proj = getProject();
    if (!proj || !proj.id) return null;
    var loc = null;
    if (window.projectStorage && window.projectStorage.loadSection) {
      loc = window.projectStorage.loadSection('location', proj.id) || {};
    } else {
      loc = (proj.location) || {};
    }
    return loc.lecturaSatelital || null;
  }
  function saveState(state) {
    var proj = getProject();
    if (!proj || !proj.id) return;
    var loc;
    if (window.projectStorage && window.projectStorage.loadSection) {
      loc = window.projectStorage.loadSection('location', proj.id) || {};
    } else {
      loc = Object.assign({}, proj.location || {});
    }
    loc.lecturaSatelital = state;
    if (window.projectStorage && window.projectStorage.saveSection) {
      window.projectStorage.saveSection('location', loc, proj.id);
    }
    if (window.currentProject && window.currentProject.id === proj.id) {
      window.currentProject.location = Object.assign({}, window.currentProject.location || {}, loc);
    }
  }

  // ---------- clima Open-Meteo por periodo ----------
  var ARCHIVE_THRESHOLD_DAYS = 92;
  function daysAgo(startIso) {
    var t = parseIso(todayIso());
    var s = parseIso(startIso);
    if (!t || !s) return 0;
    return Math.floor((t.getTime() - s.getTime()) / 86400000);
  }
  async function fetchDaily(lat, lng, startIso, endIso) {
    var useArchive = daysAgo(startIso) > ARCHIVE_THRESHOLD_DAYS;
    var base = useArchive ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
    var url = base + '?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lng) +
      '&start_date=' + startIso + '&end_date=' + endIso +
      '&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=auto';
    var res = await fetch(url);
    var data = await res.json().catch(function () { return null; });
    if (!res.ok || !data || !data.daily) throw new Error('Open-Meteo daily no disponible');
    return data.daily;
  }
  async function fetchHourly(lat, lng, startIso, endIso) {
    var useArchive = daysAgo(startIso) > ARCHIVE_THRESHOLD_DAYS;
    var base = useArchive ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
    var url = base + '?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lng) +
      '&start_date=' + startIso + '&end_date=' + endIso +
      '&hourly=temperature_2m,relative_humidity_2m,shortwave_radiation&timezone=auto';
    var res = await fetch(url);
    var data = await res.json().catch(function () { return null; });
    if (!res.ok || !data || !data.hourly) throw new Error('Open-Meteo hourly no disponible');
    return data.hourly;
  }
  function sum(arr) {
    return (arr || []).reduce(function (a, b) {
      var n = Number(b);
      return a + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
  /** Horas teóricas del periodo (inclusive): quincena 15 d = 360 h. */
  function periodHoursExpected(startIso, endIso) {
    var s = parseIso(startIso);
    var e = parseIso(endIso);
    if (!s || !e) return null;
    var days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
    if (days < 1) days = 1;
    return days * 24;
  }
  function hourVpdValue(temp, hum, rad) {
    var r;
    if (Number.isFinite(rad) && typeof calculateVPDAdvanced === 'function' && typeof calculateLeafTempFromRadiation === 'function') {
      var leaf = calculateLeafTempFromRadiation(temp, rad);
      r = calculateVPDAdvanced(temp, hum, leaf);
    } else if (typeof calculateVPDSimple === 'function') {
      r = calculateVPDSimple(temp, hum);
    } else {
      var es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
      r = { vpd: es - es * (hum / 100) };
    }
    return r && Number.isFinite(Number(r.vpd)) ? Number(r.vpd) : null;
  }
  /** Promedio + horas por rango (igual criterio que Clima: <0.5 / 0.5–1.5 / >1.5). */
  function computeVpdStats(hourly, startIso, endIso) {
    var t = hourly.temperature_2m || [];
    var rh = hourly.relative_humidity_2m || [];
    var rad = hourly.shortwave_radiation || [];
    var vals = [];
    var low = 0;
    var opt = 0;
    var high = 0;
    for (var i = 0; i < t.length; i++) {
      var temp = Number(t[i]);
      var hum = Number(rh[i]);
      if (!Number.isFinite(temp) || !Number.isFinite(hum)) continue;
      var v = hourVpdValue(temp, hum, Number(rad[i]));
      if (v == null) continue;
      vals.push(v);
      if (v < 0.5) low++;
      else if (v <= 1.5) opt++;
      else high++;
    }
    var expected = periodHoursExpected(startIso, endIso);
    var counted = low + opt + high;
    return {
      vpd_mean: vals.length
        ? Math.round((vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) * 100) / 100
        : null,
      vpd_hours_low: low,
      vpd_hours_opt: opt,
      vpd_hours_high: high,
      vpd_hours_total: counted || expected,
      vpd_hours_expected: expected
    };
  }
  async function fetchClimateForPeriod(center, period) {
    var out = {
      vpd_mean: null,
      et0_sum: null,
      rain_sum: null,
      vpd_hours_low: null,
      vpd_hours_opt: null,
      vpd_hours_high: null,
      vpd_hours_total: null,
      vpd_hours_expected: periodHoursExpected(period.date_start, period.date_end)
    };
    try {
      var daily = await fetchDaily(center.lat, center.lng, period.date_start, period.date_end);
      out.rain_sum = Math.round(sum(daily.precipitation_sum) * 10) / 10;
      out.et0_sum = Math.round(sum(daily.et0_fao_evapotranspiration) * 10) / 10;
    } catch (e) { console.warn('Lectura clima daily:', e); }
    try {
      var hourly = await fetchHourly(center.lat, center.lng, period.date_start, period.date_end);
      var st = computeVpdStats(hourly, period.date_start, period.date_end);
      out.vpd_mean = st.vpd_mean;
      out.vpd_hours_low = st.vpd_hours_low;
      out.vpd_hours_opt = st.vpd_hours_opt;
      out.vpd_hours_high = st.vpd_hours_high;
      out.vpd_hours_total = st.vpd_hours_total;
      out.vpd_hours_expected = st.vpd_hours_expected;
    } catch (e) { console.warn('Lectura clima hourly:', e); }
    return out;
  }

  // ---------- HTML ----------
  function createLecturaSatelitalHTML() {
    return '' +
      '<div class="lectura-satelital-panel" style="padding:4px 2px;">' +
        '<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #bbf7d0;border-radius:12px;padding:14px;">' +
          '<div style="font-weight:700;color:#14532d;font-size:15px;margin-bottom:4px;">📈 Lectura Satelital — histórico del predio</div>' +
          '<div style="font-size:12px;color:#334155;line-height:1.5;margin-bottom:10px;">' +
            'Arma un histórico del <strong>mismo predio</strong> (2 a 6 periodos hacia atrás) con <strong>NDVI</strong>, <strong>NDMI</strong>, <strong>VPD</strong>, <strong>ET₀</strong>, <strong>lluvia</strong> y tu <strong>riego</strong> (m³ ↔ mm con % de franja).' +
          '</div>' +
          '<div style="font-size:11px;color:#334155;line-height:1.5;padding:8px 10px;margin:0 0 12px;border-radius:8px;background:rgba(255,255,255,0.75);border:1px dashed #86efac;">' +
            '<strong style="color:#14532d;">Cómo se arma:</strong> ' +
            'Sentinel-2 ~cada 5 días; se combinan hasta <strong>3 pasadas</strong> (mediana) y se quitan nubes. ' +
            '<strong>Quincenal:</strong> 15 días → si hay nubes, amplía a 30 (*). ' +
            '<strong>Mensual:</strong> mes fijo (~30 días). ' +
            'Sin imagen útil = sin mapa. Clima de Open-Meteo; riego lo pones tú. ' +
            '<strong>Costo:</strong> 3 créditos por consulta (4 si el predio es &gt;30 ha).' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end;">' +
            '<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#14532d;font-weight:700;">Frecuencia' +
              '<select id="lecturaFreq" style="border:1px solid #86efac;border-radius:8px;padding:6px 8px;font-size:13px;font-weight:600;color:#14532d;background:#fff;">' +
                '<option value="quincenal" selected>Quincenal (15 días)</option>' +
                '<option value="mensual">Mensual (mes calendario)</option>' +
              '</select>' +
            '</label>' +
            '<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#14532d;font-weight:700;">Nº de periodos' +
              '<select id="lecturaCount" style="border:1px solid #86efac;border-radius:8px;padding:6px 8px;font-size:13px;font-weight:600;color:#14532d;background:#fff;">' +
                '<option value="2">2</option><option value="3">3</option><option value="4">4</option>' +
                '<option value="5">5</option><option value="6" selected>6</option>' +
              '</select>' +
            '</label>' +
            '<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#14532d;font-weight:700;">Fecha final' +
              '<input type="date" id="lecturaEndDate" style="border:1px solid #86efac;border-radius:8px;padding:6px 8px;font-size:13px;font-weight:600;color:#14532d;background:#fff;">' +
            '</label>' +
            '<button type="button" id="lecturaBtnGenerate" class="btn btn-primary" style="font-size:13px;">🛰 Generar histórico</button>' +
            '<button type="button" id="lecturaBtnRefresh" class="btn btn-secondary" style="font-size:13px;" title="Revisa si terminaron los periodos pendientes, trae imágenes/NDVI/NDMI guardados y completa clima si falta.">🔄 Actualizar</button>' +
          '</div>' +
          '<div id="lecturaCostHint" style="font-size:12px;color:#166534;margin-top:10px;font-weight:600;"></div>' +
          '<div id="lecturaStatusHint" style="font-size:12px;color:#475569;margin-top:6px;line-height:1.5;"></div>' +
        '</div>' +
        '<div id="lecturaTableWrap" style="margin-top:14px;overflow-x:auto;"></div>' +
        '<div id="lecturaChartWrap" style="margin-top:14px;display:none;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;">' +
          '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
            '<div style="font-weight:700;color:#0f172a;font-size:14px;">Gráfica por periodo</div>' +
            '<div id="lecturaChartToggles" style="display:flex;flex-wrap:wrap;gap:6px;"></div>' +
          '</div>' +
          '<div style="position:relative;width:100%;height:240px;">' +
            '<canvas id="lecturaChart"></canvas>' +
          '</div>' +
          '<div style="font-size:10.5px;color:#64748b;margin-top:6px;line-height:1.4;">' +
            'Izquierda: NDVI / NDMI. Derecha: mm (ET₀, lluvia, riego). Barras tenues: horas VPD del periodo (&lt;0.5 azul, 0.5–1.5 verde, &gt;1.5 tinto). Total ≈ horas del periodo (15 d = 360 h).' +
          '</div>' +
        '</div>' +
        '<div id="lecturaGallery" style="margin-top:14px;"></div>' +
      '</div>';
  }
  window.createLecturaSatelitalHTML = createLecturaSatelitalHTML;

  // ---------- costo ----------
  function creditBase() {
    var st = window.__nutriplantRadarNdviStatus;
    var pricing = st && st.pricing;
    var c = pricing && Number(pricing.credits_charged);
    return Number.isFinite(c) && c > 0 ? Math.floor(c) : 1;
  }
  /** Costo FIJO por toda la consulta: 3 normal, 4 si el predio es >30 ha. */
  function lecturaCost() {
    return creditBase() >= 2 ? 4 : 3;
  }
  function updateCostHint() {
    var hint = document.getElementById('lecturaCostHint');
    if (!hint) return;
    var total = lecturaCost();
    hint.textContent = 'Costo: ' + total + ' créditos Radar por toda la consulta' +
      (total === 4 ? ' (predio >30 ha)' : '') +
      ', sin importar cuántos periodos elijas.';
  }

  // ---------- riego m³ ↔ mm (franja regada) ----------
  // Misma regla que balance hídrico: 1 mm sobre 1 ha = 10 m³.
  function round1(v) {
    return Math.round(Number(v) * 10) / 10;
  }
  function getLocationData() {
    var proj = getProject();
    if (!proj || !proj.id) return {};
    if (window.projectStorage && window.projectStorage.loadSection) {
      return window.projectStorage.loadSection('location', proj.id) || {};
    }
    return (proj.location) || {};
  }
  function getCropHa() {
    var loc = getLocationData();
    var ha = loc.areaHectares != null ? Number(loc.areaHectares) : NaN;
    return Number.isFinite(ha) && ha > 0 ? ha : null;
  }
  function suggestFranjaPct() {
    try {
      var proj = getProject();
      if (!proj || !proj.id) return 100;
      var soil = null;
      if (window.projectStorage && window.projectStorage.loadSection) {
        soil = window.projectStorage.loadSection('soil', proj.id);
      }
      var reach = soil && soil.fertility && Number(soil.fertility.reachPct);
      if (Number.isFinite(reach) && reach > 0 && reach <= 100) return Math.round(reach);
    } catch (e) { /* ignore */ }
    return 100;
  }
  function getFranjaPct(state) {
    var p = state && state.franja_pct != null ? Number(state.franja_pct) : NaN;
    if (!Number.isFinite(p) || p <= 0) p = suggestFranjaPct();
    return Math.min(100, Math.max(1, Math.round(p)));
  }
  function irrigatedHa(state) {
    var crop = getCropHa();
    if (crop == null) return null;
    return crop * (getFranjaPct(state) / 100);
  }
  function m3ToMm(m3, iHa) {
    if (m3 == null || !Number.isFinite(Number(m3)) || iHa == null || !(iHa > 0)) return null;
    return round1(Number(m3) / (iHa * 10));
  }
  function mmToM3(mm, iHa) {
    if (mm == null || !Number.isFinite(Number(mm)) || iHa == null || !(iHa > 0)) return null;
    return round1(Number(mm) * iHa * 10);
  }
  function syncRiegoMmFromM3(state) {
    var iHa = irrigatedHa(state);
    (state.rows || []).forEach(function (r) {
      r.riego_mm = m3ToMm(r.riego_m3, iHa);
    });
  }

  // ---------- render tabla / gráfica / galería ----------
  function fmtNum(v, dec) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return Number(v).toFixed(dec == null ? 2 : dec);
  }
  function statusBadge(row) {
    if (row.status === 'done') return '<span style="color:#166534;font-weight:700;">✔ Lista</span>';
    if (row.status === 'error') {
      return '<span style="color:#b45309;font-weight:700;" title="' + esc(row.error_message || '') + '">⚠ ' +
        (row.error_code === 'radar_low_coverage' ? 'Nublado' : 'Error') + '</span>';
    }
    if (row.status === 'not_found') return '<span style="color:#94a3b8;">—</span>';
    return '<span style="color:#0369a1;font-weight:700;">⏳ Generando…</span>';
  }
  function renderTable(state) {
    var wrap = document.getElementById('lecturaTableWrap');
    if (!wrap) return;
    if (!state || !state.rows || !state.rows.length) { wrap.innerHTML = ''; return; }
    if (state.franja_pct == null) state.franja_pct = suggestFranjaPct();
    syncRiegoMmFromM3(state);
    var rows = state.rows.slice().sort(function (a, b) { return a.index - b.index; });
    var cropHa = getCropHa();
    var pct = getFranjaPct(state);
    var iHa = irrigatedHa(state);
    var inpStyle = 'width:72px;border:1px solid #cbd5e1;border-radius:6px;padding:4px 6px;font-size:12px;text-align:right;';

    var html = '<div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:0 0 10px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#334155;">' +
      '<label style="display:flex;align-items:center;gap:6px;font-weight:700;color:#14532d;">' +
        '% franja regada' +
        '<input type="number" id="lecturaFranjaPct" min="1" max="100" step="1" value="' + pct + '" style="width:64px;border:1px solid #86efac;border-radius:6px;padding:4px 6px;font-size:13px;font-weight:700;color:#14532d;text-align:right;">' +
        '%' +
      '</label>' +
      '<span>Predio: <strong>' + (cropHa != null ? fmtNum(cropHa, 2) + ' ha' : '—') + '</strong></span>' +
      '<span>Franja: <strong>' + (iHa != null ? fmtNum(iHa, 2) + ' ha' : '—') + '</strong></span>' +
      '<span style="color:#64748b;font-size:11px;">1 mm en franja = 10 m³ × ha franja · edita m³ o mm y se convierte solo</span>' +
    '</div>';

    var headers = [
      ['Periodo', 'Rango de fechas del periodo analizado.'],
      ['NDVI prom', 'NDVI = vigor vegetativo. Promedio de píxeles válidos dentro del predio.'],
      ['NDMI prom', 'NDMI = humedad relativa del dosel. Promedio de píxeles válidos dentro del predio.'],
      ['VPD prom (kPa)', 'VPD promedio horario del periodo.'],
      ['h VPD <0.5', 'Horas del periodo con VPD bajo (<0.5 kPa).'],
      ['h VPD 0.5–1.5', 'Horas del periodo con VPD óptimo (0.5–1.5 kPa).'],
      ['h VPD >1.5', 'Horas del periodo con VPD alto (>1.5 kPa).'],
      ['ET₀ acum (mm)', 'ET₀ acumulada durante todo el periodo.'],
      ['Lluvia acum (mm)', 'Lluvia acumulada durante todo el periodo.'],
      ['Riego (m³)', 'Volumen total aplicado en la franja regada.'],
      ['Riego (mm)', 'Lámina equivalente en la franja regada según el % de franja.'],
      ['Estado', 'Estado de la imagen satelital del periodo.']
    ];
    html += '<table style="width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">' +
      '<thead><tr style="background:#f1f5f9;color:#0f172a;">' +
      headers.map(function (h) {
        return '<th title="' + esc(h[1]) + '" style="padding:8px 10px;text-align:center;white-space:nowrap;">' + esc(h[0]) + '</th>';
      }).join('') +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var mmVal = r.riego_mm != null ? r.riego_mm : m3ToMm(r.riego_m3, iHa);
      html += '<tr style="border-top:1px solid #e2e8f0;">' +
        '<td style="padding:8px 10px;font-weight:700;color:#14532d;white-space:nowrap;">' + esc(r.label || '') +
          (r.lookback_expanded ? ' <span title="Quincena nublada: ampliada a 30 días" style="color:#b45309;">*</span>' : '') + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.ndvi_mean, 3) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.ndmi_mean, 3) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.vpd_mean, 2) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#1d4ed8;" title="Horas VPD bajo">' + fmtNum(r.vpd_hours_low, 0) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#16a34a;" title="Horas VPD óptimo">' + fmtNum(r.vpd_hours_opt, 0) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#7f1d1d;" title="Horas VPD alto">' + fmtNum(r.vpd_hours_high, 0) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.et0_sum, 1) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.rain_sum, 1) + '</td>' +
        '<td style="padding:6px 8px;text-align:center;">' +
          '<input type="number" min="0" step="0.1" value="' + (r.riego_m3 != null ? esc(r.riego_m3) : '') +
          '" data-riego-m3-index="' + r.index + '" style="' + inpStyle + '" placeholder="0" title="Volumen total en franja">' +
        '</td>' +
        '<td style="padding:6px 8px;text-align:center;">' +
          '<input type="number" min="0" step="0.1" value="' + (mmVal != null ? esc(mmVal) : '') +
          '" data-riego-mm-index="' + r.index + '" style="' + inpStyle + '" placeholder="0" title="Lámina en franja regada"' +
          (iHa == null ? ' disabled' : '') + '>' +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + statusBadge(r) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    html += '<div style="font-size:11px;color:#64748b;margin-top:6px;">NDVI y NDMI no se traducen: son índices satelitales. ET₀ y lluvia son acumulados del periodo; VPD prom = promedio horario. Horas VPD: bajo &lt;0.5 · óptimo 0.5–1.5 · alto &gt;1.5 (total ≈ horas del periodo; 15 d = 360 h). Riego mm = lámina en la franja (% arriba). <span style="color:#b45309;">*</span> quincena ampliada a 30 días por nubosidad.' +
      (cropHa == null ? ' <span style="color:#b45309;">Guarda el polígono con área (ha) para convertir m³ ↔ mm.</span>' : '') +
      '</div>';
    wrap.innerHTML = html;

    var franjaInp = document.getElementById('lecturaFranjaPct');
    if (franjaInp) {
      franjaInp.addEventListener('change', function () {
        var v = parseFloat(franjaInp.value);
        state.franja_pct = Number.isFinite(v) ? Math.min(100, Math.max(1, Math.round(v))) : 100;
        syncRiegoMmFromM3(state);
        saveState(state);
        renderTable(state);
        renderChart(state);
      });
    }
    wrap.querySelectorAll('input[data-riego-m3-index]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var idx = parseInt(inp.getAttribute('data-riego-m3-index'), 10);
        var row = (state.rows || []).find(function (x) { return x.index === idx; });
        if (!row) return;
        var v = parseFloat(inp.value);
        row.riego_m3 = Number.isFinite(v) ? round1(v) : null;
        row.riego_mm = m3ToMm(row.riego_m3, irrigatedHa(state));
        saveState(state);
        var mmInp = wrap.querySelector('input[data-riego-mm-index="' + idx + '"]');
        if (mmInp) mmInp.value = row.riego_mm != null ? row.riego_mm : '';
        renderChart(state);
      });
    });
    wrap.querySelectorAll('input[data-riego-mm-index]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var idx = parseInt(inp.getAttribute('data-riego-mm-index'), 10);
        var row = (state.rows || []).find(function (x) { return x.index === idx; });
        if (!row) return;
        var v = parseFloat(inp.value);
        var iHaNow = irrigatedHa(state);
        if (iHaNow == null) {
          alert('Guarda el polígono del predio (con área en ha) para convertir mm ↔ m³.');
          return;
        }
        row.riego_mm = Number.isFinite(v) ? round1(v) : null;
        row.riego_m3 = mmToM3(row.riego_mm, iHaNow);
        saveState(state);
        var m3Inp = wrap.querySelector('input[data-riego-m3-index="' + idx + '"]');
        if (m3Inp) m3Inp.value = row.riego_m3 != null ? row.riego_m3 : '';
        renderChart(state);
      });
    });
  }

  function chipStyle(on, color) {
    return 'border:1px solid ' + (on ? color : '#cbd5e1') +
      ';background:' + (on ? color : '#fff') +
      ';color:' + (on ? '#fff' : '#475569') +
      ';border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;';
  }
  function renderChartToggles(state) {
    var box = document.getElementById('lecturaChartToggles');
    if (!box) return;
    var chips = [
      { key: 'ndvi', label: 'NDVI', color: '#16a34a' },
      { key: 'ndmi', label: 'NDMI', color: '#0369a1' },
      { key: 'vpd', label: 'VPD horas', color: '#7f1d1d' },
      { key: 'et0', label: 'ET₀', color: '#a16207' },
      { key: 'rain', label: 'Lluvia', color: '#2563eb' },
      { key: 'riego', label: 'Riego mm', color: '#7c3aed' }
    ];
    box.innerHTML = chips.map(function (c) {
      return '<button type="button" data-lectura-series="' + c.key + '" style="' +
        chipStyle(!!lecturaSeriesVis[c.key], c.color) + '" title="Mostrar / ocultar ' + c.label + '">' +
        c.label + '</button>';
    }).join('');
    box.querySelectorAll('[data-lectura-series]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-lectura-series');
        lecturaSeriesVis[key] = !lecturaSeriesVis[key];
        renderChart(state);
      });
    });
  }
  function renderChart(state) {
    var wrap = document.getElementById('lecturaChartWrap');
    var canvas = document.getElementById('lecturaChart');
    if (!wrap || !canvas || typeof Chart === 'undefined') return;
    if (!state || !state.rows || !state.rows.length) {
      wrap.style.display = 'none';
      if (lecturaChart) { try { lecturaChart.destroy(); } catch (e) {} lecturaChart = null; }
      return;
    }
    renderChartToggles(state);
    var rows = state.rows.slice().sort(function (a, b) { return a.index - b.index; }).reverse(); // cronológico
    var labels = rows.map(function (r) { return r.label; });
    var iHa = irrigatedHa(state);
    var hoursMax = 24;
    rows.forEach(function (r) {
      var exp = r.vpd_hours_expected != null
        ? Number(r.vpd_hours_expected)
        : periodHoursExpected(r.date_start, r.date_end);
      var sumH = (Number(r.vpd_hours_low) || 0) + (Number(r.vpd_hours_opt) || 0) + (Number(r.vpd_hours_high) || 0);
      hoursMax = Math.max(hoursMax, exp || 0, sumH);
    });
    var ds = [
      {
        type: 'bar',
        label: 'Horas VPD <0.5',
        yAxisID: 'yHours',
        data: rows.map(function (r) { return r.vpd_hours_low; }),
        backgroundColor: 'rgba(29, 78, 216, 0.26)',
        borderColor: 'rgba(29, 78, 216, 0.42)',
        borderWidth: 1,
        stack: 'vpdHours',
        order: 3,
        barPercentage: 0.72,
        categoryPercentage: 0.78,
        hidden: !lecturaSeriesVis.vpd
      },
      {
        type: 'bar',
        label: 'Horas VPD 0.5–1.5',
        yAxisID: 'yHours',
        data: rows.map(function (r) { return r.vpd_hours_opt; }),
        backgroundColor: 'rgba(22, 163, 74, 0.18)',
        borderColor: 'rgba(22, 163, 74, 0.35)',
        borderWidth: 1,
        stack: 'vpdHours',
        order: 3,
        barPercentage: 0.72,
        categoryPercentage: 0.78,
        hidden: !lecturaSeriesVis.vpd
      },
      {
        type: 'bar',
        label: 'Horas VPD >1.5',
        yAxisID: 'yHours',
        data: rows.map(function (r) { return r.vpd_hours_high; }),
        backgroundColor: 'rgba(127, 29, 29, 0.26)',
        borderColor: 'rgba(127, 29, 29, 0.44)',
        borderWidth: 1,
        stack: 'vpdHours',
        order: 3,
        barPercentage: 0.72,
        categoryPercentage: 0.78,
        hidden: !lecturaSeriesVis.vpd
      },
      {
        type: 'line',
        label: 'NDVI',
        yAxisID: 'yIdx',
        data: rows.map(function (r) { return r.ndvi_mean; }),
        borderColor: '#16a34a',
        backgroundColor: '#16a34a',
        tension: 0.3,
        spanGaps: true,
        pointRadius: 3,
        borderWidth: 2.5,
        order: 1,
        hidden: !lecturaSeriesVis.ndvi
      },
      {
        type: 'line',
        label: 'NDMI',
        yAxisID: 'yIdx',
        data: rows.map(function (r) { return r.ndmi_mean; }),
        borderColor: '#0369a1',
        backgroundColor: '#0369a1',
        tension: 0.3,
        spanGaps: true,
        pointRadius: 3,
        borderWidth: 2.5,
        order: 1,
        hidden: !lecturaSeriesVis.ndmi
      },
      {
        type: 'line',
        label: 'ET₀ acum (mm)',
        yAxisID: 'yMm',
        data: rows.map(function (r) { return r.et0_sum; }),
        borderColor: '#a16207',
        backgroundColor: '#a16207',
        borderDash: [4, 3],
        tension: 0.3,
        spanGaps: true,
        pointRadius: 3,
        borderWidth: 2,
        order: 1,
        hidden: !lecturaSeriesVis.et0
      },
      {
        type: 'line',
        label: 'Lluvia acum (mm)',
        yAxisID: 'yMm',
        data: rows.map(function (r) { return r.rain_sum; }),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        borderDash: [2, 3],
        tension: 0.3,
        spanGaps: true,
        pointRadius: 3,
        borderWidth: 2,
        order: 1,
        hidden: !lecturaSeriesVis.rain
      },
      {
        type: 'line',
        label: 'Riego (mm)',
        yAxisID: 'yMm',
        data: rows.map(function (r) {
          return r.riego_mm != null ? r.riego_mm : m3ToMm(r.riego_m3, iHa);
        }),
        borderColor: '#7c3aed',
        backgroundColor: '#7c3aed',
        borderDash: [6, 3],
        tension: 0.3,
        spanGaps: true,
        pointRadius: 3,
        borderWidth: 2,
        order: 1,
        hidden: !lecturaSeriesVis.riego
      }
    ];
    wrap.style.display = 'block';
    if (lecturaChart) { try { lecturaChart.destroy(); } catch (e) {} lecturaChart = null; }
    lecturaChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              footer: function (items) {
                if (!items || !items.length) return '';
                var i = items[0].dataIndex;
                var r = rows[i];
                if (!r) return '';
                var tot = (Number(r.vpd_hours_low) || 0) + (Number(r.vpd_hours_opt) || 0) + (Number(r.vpd_hours_high) || 0);
                var exp = r.vpd_hours_expected != null ? r.vpd_hours_expected : periodHoursExpected(r.date_start, r.date_end);
                return 'Horas VPD: ' + tot + (exp != null ? ' / ' + exp + ' h del periodo' : ' h');
              }
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { maxRotation: 40, font: { size: 10 } } },
          yIdx: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 1,
            title: { display: true, text: 'NDVI / NDMI', font: { size: 11 } },
            grid: { color: 'rgba(148,163,184,0.25)' },
            ticks: { font: { size: 10 } }
          },
          yMm: {
            type: 'linear',
            position: 'right',
            min: 0,
            title: { display: true, text: 'mm (ET₀ / lluvia / riego)', font: { size: 11 } },
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 10 } }
          },
          yHours: {
            type: 'linear',
            position: 'right',
            display: false,
            min: 0,
            max: hoursMax,
            stacked: true,
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // ---------- visor grande (lightbox) ----------
  function openLecturaLightbox(url, title, subtitle) {
    var overlay = document.getElementById('lecturaLightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lecturaLightbox';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.86);display:flex;align-items:center;justify-content:center;padding:26px;';
      overlay.innerHTML =
        '<button type="button" id="lecturaLightboxClose" ' +
          'style="position:absolute;top:14px;right:14px;z-index:2;display:inline-flex;align-items:center;gap:6px;' +
          'background:#2563eb;color:#fff;border:none;border-radius:999px;padding:9px 16px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.35);">' +
          '✕ Cerrar' +
        '</button>' +
        '<figure style="margin:0;max-width:min(92vw,900px);max-height:88vh;display:flex;flex-direction:column;gap:8px;align-items:center;">' +
          '<figcaption id="lecturaLightboxTitle" style="color:#fff;font-size:15px;font-weight:800;text-align:center;"></figcaption>' +
          '<img id="lecturaLightboxImg" alt="" style="max-width:100%;max-height:74vh;border-radius:12px;background:#f1f5f9;box-shadow:0 10px 40px rgba(0,0,0,0.5);">' +
          '<div id="lecturaLightboxSub" style="color:#cbd5e1;font-size:12px;text-align:center;"></div>' +
        '</figure>';
      document.body.appendChild(overlay);
      function closeLb() { overlay.style.display = 'none'; }
      overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeLb(); });
      var closeBtn = overlay.querySelector('#lecturaLightboxClose');
      if (closeBtn) closeBtn.addEventListener('click', closeLb);
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && overlay.style.display !== 'none') closeLb();
      });
    }
    var img = overlay.querySelector('#lecturaLightboxImg');
    var t = overlay.querySelector('#lecturaLightboxTitle');
    var s = overlay.querySelector('#lecturaLightboxSub');
    if (img) { img.src = url; img.alt = title || ''; }
    if (t) t.textContent = title || '';
    if (s) s.textContent = subtitle || '';
    overlay.style.display = 'flex';
  }

  function renderGallery(state) {
    var el = document.getElementById('lecturaGallery');
    if (!el) return;
    if (!state || !state.rows || !state.rows.length) { el.innerHTML = ''; return; }
    var rows = state.rows.slice().sort(function (a, b) { return a.index - b.index; });
    var any = rows.some(function (r) { return r.signed_url || r.ndmi_signed_url; });
    if (!any) { el.innerHTML = ''; return; }
    var count = Math.max(1, rows.length);
    var gridStyle = 'display:grid;grid-template-columns:repeat(' + count + ',minmax(0,1fr));gap:8px;align-items:stretch;';
    function scaleLegend(kind) {
      var isNdvi = kind === 'ndvi';
      var title = isNdvi ? 'Escala NDVI relativa al predio' : 'Escala NDMI relativa al predio';
      var bar = isNdvi
        ? 'linear-gradient(90deg,#7f1d1d,#b91c1c,#ea580c,#f59e0b,#fde68a,#bef264,#65a30d,#15803d,#064e3b)'
        : 'linear-gradient(90deg,#7c2d12,#ea580c,#f59e0b,#fde68a,#bbf7d0,#22c55e,#0f766e,#0369a1)';
      var tip = isNdvi
        ? 'Verde = mayor vigor dentro de ese predio/periodo; rojo = menor. No es escala absoluta universal.'
        : 'Azul/verde = mayor humedad relativa del dosel dentro de ese predio/periodo; naranja/café = menor.';
      return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px;font-size:11px;color:#475569;">' +
        '<span style="font-weight:700;color:' + (isNdvi ? '#166534' : '#0369a1') + ';">' + title + '</span>' +
        '<span>Menor</span>' +
        '<span style="width:140px;height:8px;border-radius:999px;background:' + bar + ';display:inline-block;" title="' + tip + '"></span>' +
        '<span>Mayor</span>' +
        '<span style="color:#64748b;line-height:1.35;">' +
          'Color según los niveles de <strong>ese predio y periodo</strong> (píxeles válidos dentro del polígono), no un valor fijo absoluto.' +
        '</span>' +
      '</div>';
    }
    function miniCard(r, key, label, color) {
      var url = key === 'ndvi' ? r.signed_url : r.ndmi_signed_url;
      var meta = (r.avg_cloud_cover != null ? 'nubes ~' + esc(r.avg_cloud_cover) + '%' : '') +
        (r.valid_pct != null ? (r.avg_cloud_cover != null ? ' · ' : '') + 'útil ' + esc(r.valid_pct) + '%' : '') +
        (r.lookback_expanded ? ' · 30 d*' : '');
      return '<figure style="margin:0;min-width:0;border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:6px;">' +
        '<figcaption style="font-size:10.5px;line-height:1.25;font-weight:800;color:' + color + ';margin:0 0 4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(r.label || '') + '">' +
          esc(r.label || '') +
        '</figcaption>' +
        (url
          ? '<img src="' + esc(url) + '" alt="' + label + ' ' + esc(r.label) + '" data-lectura-zoom="1" data-zoom-title="' + esc(label + ' · ' + (r.label || '')) + '" data-zoom-sub="' + esc(meta) + '" style="width:100%;height:142px;object-fit:contain;border-radius:7px;display:block;background:#f1f5f9;cursor:zoom-in;" title="Toca para ver en grande">'
          : '<div style="height:142px;display:flex;align-items:center;justify-content:center;text-align:center;color:#94a3b8;background:#f1f5f9;border-radius:7px;font-size:11px;">Sin ' + label + '</div>') +
        '<div style="font-size:9.5px;color:#64748b;text-align:center;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(meta) + '">' + (meta || '&nbsp;') + '</div>' +
      '</figure>';
    }
    var html =
      '<div style="font-weight:700;color:#0f172a;font-size:14px;margin:4px 0 8px;">Imágenes comparativas por periodo</div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#fff;overflow-x:auto;">' +
        '<div style="font-size:12px;font-weight:800;color:#166534;margin:0 0 4px;">NDVI — vigor vegetativo</div>' +
        scaleLegend('ndvi') +
        '<div style="' + gridStyle + 'min-width:' + (count * 118) + 'px;">' +
          rows.map(function (r) { return miniCard(r, 'ndvi', 'NDVI', '#166534'); }).join('') +
        '</div>' +
        '<div style="font-size:12px;font-weight:800;color:#0369a1;margin:14px 0 4px;">NDMI — humedad del dosel</div>' +
        scaleLegend('ndmi') +
        '<div style="' + gridStyle + 'min-width:' + (count * 118) + 'px;">' +
          rows.map(function (r) { return miniCard(r, 'ndmi', 'NDMI', '#0369a1'); }).join('') +
        '</div>' +
        '<div style="font-size:10.5px;color:#64748b;margin-top:8px;">* 30 d = quincena ampliada por nubosidad. El color compara zonas dentro del mismo predio/periodo; el valor numérico promedio está en la tabla. Toca cualquier imagen para verla en grande.</div>' +
      '</div>';
    el.innerHTML = html;
    el.querySelectorAll('img[data-lectura-zoom]').forEach(function (img) {
      img.addEventListener('click', function () {
        openLecturaLightbox(img.src, img.getAttribute('data-zoom-title') || '', img.getAttribute('data-zoom-sub') || '');
      });
    });
  }

  function renderAll(state) {
    renderTable(state);
    renderChart(state);
    renderGallery(state);
  }

  function setStatus(msg) {
    var el = document.getElementById('lecturaStatusHint');
    if (!el) return;
    var text = msg || '';
    var isBusy = /⏳|Generando|Enviando|Actualizando|Obteniendo/.test(text);
    if (isBusy) {
      el.innerHTML =
        '<span style="display:inline-block;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;font-weight:800;font-size:13px;padding:7px 12px;border-radius:8px;line-height:1.45;">' +
        text +
        '</span>';
    } else {
      el.innerHTML = text;
    }
  }

  // ---------- polling de estado ----------
  function stopPoll() { if (lecturaPollTimer) { clearInterval(lecturaPollTimer); lecturaPollTimer = null; } }

  async function fetchLecturaStatus(ids) {
    var token = await getToken();
    var proj = getProject();
    if (!token || !proj || !proj.id) return [];
    var res = await fetch(apiUrl('/api/radar-ndvi'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'lectura_status', project_id: String(proj.id), request_ids: ids })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.message || data.error || 'No se pudo consultar estado');
    return data.items || [];
  }

  function mergeStatusIntoState(state, items) {
    items.forEach(function (it) {
      var row = state.rows.find(function (r) { return String(r.request_id) === String(it.id); });
      if (!row) return;
      row.status = it.status;
      if (it.ndvi_mean != null) row.ndvi_mean = it.ndvi_mean;
      if (it.ndmi_mean != null) row.ndmi_mean = it.ndmi_mean;
      if (it.valid_pct != null) row.valid_pct = it.valid_pct;
      if (it.avg_cloud_cover != null) row.avg_cloud_cover = it.avg_cloud_cover;
      if (it.scene_count != null) row.scene_count = it.scene_count;
      row.lookback_expanded = !!it.lookback_expanded;
      if (it.signed_url) row.signed_url = it.signed_url;
      if (it.ndmi_signed_url) row.ndmi_signed_url = it.ndmi_signed_url;
      if (it.error_message) row.error_message = it.error_message;
      if (it.error_code) row.error_code = it.error_code;
    });
  }

  async function pollUntilDone(state) {
    stopPoll();
    var ids = state.rows.map(function (r) { return r.request_id; }).filter(Boolean);
    if (!ids.length) return;
    var attempts = 0;
    lecturaPollTimer = setInterval(async function () {
      attempts++;
      try {
        var items = await fetchLecturaStatus(ids);
        mergeStatusIntoState(state, items);
        saveState(state);
        renderAll(state);
        var pending = state.rows.filter(function (r) { return r.status === 'pending' || r.status === 'processing'; });
        var done = state.rows.filter(function (r) { return r.status === 'done'; });
        if (!pending.length) {
          stopPoll();
          await enrichClimateAndFinish(state);
        } else {
          setStatus('⏳ Generando ' + done.length + '/' + state.rows.length + ' periodos… puede tardar unos minutos por la disponibilidad satelital.');
        }
      } catch (e) {
        console.warn('Lectura poll:', e);
      }
      if (attempts > 60) { stopPoll(); setStatus('El proceso está tardando más de lo normal. Pulsa «Actualizar» en unos minutos.'); }
    }, 20000);
  }

  async function enrichClimateAndFinish(state) {
    setStatus('🌦️ Obteniendo VPD, ET₀ y lluvia por periodo…');
    var coords = getPolygonCoords();
    var center = polygonCenter(coords);
    if (center) {
      for (var i = 0; i < state.rows.length; i++) {
        var row = state.rows[i];
        var needsClimate =
          row.vpd_mean == null ||
          row.et0_sum == null ||
          row.rain_sum == null ||
          row.vpd_hours_low == null;
        if (!needsClimate) continue;
        try {
          var clim = await fetchClimateForPeriod(center, { date_start: row.date_start, date_end: row.date_end });
          if (row.vpd_mean == null) row.vpd_mean = clim.vpd_mean;
          if (row.et0_sum == null) row.et0_sum = clim.et0_sum;
          if (row.rain_sum == null) row.rain_sum = clim.rain_sum;
          if (clim.vpd_hours_low != null) {
            row.vpd_hours_low = clim.vpd_hours_low;
            row.vpd_hours_opt = clim.vpd_hours_opt;
            row.vpd_hours_high = clim.vpd_hours_high;
            row.vpd_hours_total = clim.vpd_hours_total;
            row.vpd_hours_expected = clim.vpd_hours_expected;
            if (row.vpd_mean == null) row.vpd_mean = clim.vpd_mean;
          }
        } catch (e) { console.warn('Lectura clima:', e); }
      }
    }
    state.updatedAt = new Date().toISOString();
    saveState(state);
    renderAll(state);
    var errores = state.rows.filter(function (r) { return r.status === 'error'; }).length;
    setStatus(errores
      ? '✔ Histórico listo. ' + errores + ' periodo(s) sin imagen por nubosidad; el resto se generó correctamente.'
      : '✔ Histórico completo. Edita el riego en m³ o mm (con % de franja arriba) para completar la correlación.');
  }

  // ---------- generar ----------
  async function generateLectura() {
    var token = await getToken();
    if (!token) { alert('Inicia sesión con tu cuenta en la nube.'); return; }
    var proj = getProject();
    if (!proj || !proj.id) { alert('Selecciona un proyecto.'); return; }
    var coords = getPolygonCoords();
    if (!coords || coords.length < 3) { alert('Traza y guarda el polígono del predio en la pestaña «Polígono / NDVI y NDMI».'); return; }

    var freq = (document.getElementById('lecturaFreq') || {}).value === 'mensual' ? 'mensual' : 'quincenal';
    var count = parseInt((document.getElementById('lecturaCount') || {}).value, 10) || 6;
    var endDate = (document.getElementById('lecturaEndDate') || {}).value || todayIso();
    var periods = buildPeriods(freq, count, endDate);

    var total = lecturaCost();
    if (!confirm('Se generará la Lectura Satelital de ' + periods.length + ' periodos (' + freq + ').\n\nCosto: ' + total + ' créditos Radar por toda la consulta (no por periodo).\n\n¿Continuar?')) return;

    var btn = document.getElementById('lecturaBtnGenerate');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando…'; }
    setStatus('Enviando solicitud de ' + periods.length + ' periodos…');

    try {
      var res = await fetch(apiUrl('/api/radar-cdse-pilot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          lectura: true,
          project_id: String(proj.id),
          polygon: coords,
          periods: periods,
          max_dim: 512,
          max_scenes: 3
        })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        setStatus('');
        alert(data.message || data.error || 'No se pudo iniciar la Lectura Satelital.');
        return;
      }
      var created = data.periods || [];
      var prev = loadState() || {};
      var state = {
        frequency: freq,
        periods: count,
        endDate: endDate,
        franja_pct: prev.franja_pct != null ? prev.franja_pct : suggestFranjaPct(),
        updatedAt: new Date().toISOString(),
        rows: periods.map(function (p) {
          var match = created.find(function (c) { return Number(c.period_index) === Number(p.index); }) || {};
          var prevRow = (prev.rows || []).find(function (x) {
            return x && x.date_start === p.date_start && x.date_end === p.date_end;
          });
          return {
            index: p.index,
            label: p.label,
            date_start: p.date_start,
            date_end: p.date_end,
            frequency: p.frequency,
            request_id: match.id || null,
            status: 'pending',
            ndvi_mean: null, ndmi_mean: null,
            vpd_mean: null, et0_sum: null, rain_sum: null,
            vpd_hours_low: null, vpd_hours_opt: null, vpd_hours_high: null,
            vpd_hours_total: null,
            vpd_hours_expected: periodHoursExpected(p.date_start, p.date_end),
            riego_m3: prevRow && prevRow.riego_m3 != null ? prevRow.riego_m3 : null,
            riego_mm: null,
            signed_url: null, ndmi_signed_url: null
          };
        })
      };
      syncRiegoMmFromM3(state);
      saveState(state);
      renderAll(state);
      setStatus('⏳ Solicitud enviada. Generando imágenes… no cierres hasta que termine (o vuelve y pulsa «Actualizar»).');
      pollUntilDone(state);
    } catch (e) {
      console.error('Lectura generar:', e);
      setStatus('');
      alert('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🛰 Generar histórico'; }
    }
  }

  async function refreshLectura() {
    var state = loadState();
    if (!state || !state.rows || !state.rows.length) { setStatus('Aún no hay histórico. Configura y pulsa «Generar histórico».'); return; }
    renderAll(state);
    var ids = state.rows.map(function (r) { return r.request_id; }).filter(Boolean);
    if (!ids.length) return;
    setStatus('🔄 Actualizando estado e imágenes…');
    try {
      var items = await fetchLecturaStatus(ids);
      mergeStatusIntoState(state, items);
      saveState(state);
      renderAll(state);
      var pending = state.rows.filter(function (r) { return r.status === 'pending' || r.status === 'processing'; });
      if (pending.length) { setStatus('⏳ ' + pending.length + ' periodo(s) aún generándose…'); pollUntilDone(state); }
      else { await enrichClimateAndFinish(state); }
    } catch (e) {
      console.warn('Lectura refresh:', e);
      setStatus('No se pudo actualizar. Intenta de nuevo en unos minutos.');
    }
  }

  // ---------- init ----------
  function initRadarSatelitalTabs() {
    var container = document.querySelector('.radar-satelital-container');
    if (!container || container.dataset.radarTabsBound === '1') return;
    container.dataset.radarTabsBound = '1';
    container.querySelectorAll('.radar-tab-button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-radartab');
        container.querySelectorAll('.radar-tab-button').forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('active', active);
          b.style.background = active ? '#dcfce7' : '#fff';
          b.style.color = active ? '#14532d' : '#475569';
          b.style.borderColor = active ? '#bbf7d0' : '#e2e8f0';
        });
        container.querySelectorAll('.radar-tab-content').forEach(function (c) {
          c.style.display = (c.id === 'radarTab' + (tab === 'lectura' ? 'Lectura' : 'Poligono')) ? 'block' : 'none';
          c.classList.toggle('active', c.id === 'radarTab' + (tab === 'lectura' ? 'Lectura' : 'Poligono'));
        });
        if (tab === 'lectura') {
          updateCostHint();
          var st = loadState();
          if (st) renderAll(st);
        } else if (typeof nutriPlantMap !== 'undefined' && nutriPlantMap && nutriPlantMap.map && typeof google !== 'undefined') {
          setTimeout(function () { try { google.maps.event.trigger(nutriPlantMap.map, 'resize'); } catch (e) {} }, 60);
        }
      });
    });
  }
  window.initRadarSatelitalTabs = initRadarSatelitalTabs;

  function initLecturaSatelital() {
    var panel = document.querySelector('.lectura-satelital-panel');
    if (!panel) return;
    var endInput = document.getElementById('lecturaEndDate');
    if (endInput && !endInput.value) endInput.value = todayIso();

    var state = loadState();
    if (state) {
      var f = document.getElementById('lecturaFreq');
      var c = document.getElementById('lecturaCount');
      var e = document.getElementById('lecturaEndDate');
      if (f && state.frequency) f.value = state.frequency;
      if (c && state.periods) c.value = String(state.periods);
      if (e && state.endDate) e.value = state.endDate;
    }
    updateCostHint();
    if (state) {
      renderAll(state);
      var needsHours = (state.rows || []).some(function (r) { return r.vpd_hours_low == null; });
      if (needsHours) enrichClimateAndFinish(state);
    }

    if (panel.dataset.lecturaBound === '1') return;
    panel.dataset.lecturaBound = '1';
    var genBtn = document.getElementById('lecturaBtnGenerate');
    var refBtn = document.getElementById('lecturaBtnRefresh');
    var countSel = document.getElementById('lecturaCount');
    var freqSel = document.getElementById('lecturaFreq');
    if (genBtn) genBtn.addEventListener('click', generateLectura);
    if (refBtn) refBtn.addEventListener('click', refreshLectura);
    if (countSel) countSel.addEventListener('change', updateCostHint);
    if (freqSel) freqSel.addEventListener('change', updateCostHint);
  }
  window.initLecturaSatelital = initLecturaSatelital;
})();
