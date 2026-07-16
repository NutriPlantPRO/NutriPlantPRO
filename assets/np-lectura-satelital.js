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
  function computeVpdMean(hourly) {
    var t = hourly.temperature_2m || [];
    var rh = hourly.relative_humidity_2m || [];
    var rad = hourly.shortwave_radiation || [];
    var vals = [];
    for (var i = 0; i < t.length; i++) {
      var temp = Number(t[i]);
      var hum = Number(rh[i]);
      if (!Number.isFinite(temp) || !Number.isFinite(hum)) continue;
      var r;
      if (Number.isFinite(Number(rad[i])) && typeof calculateVPDAdvanced === 'function' && typeof calculateLeafTempFromRadiation === 'function') {
        var leaf = calculateLeafTempFromRadiation(temp, Number(rad[i]));
        r = calculateVPDAdvanced(temp, hum, leaf);
      } else if (typeof calculateVPDSimple === 'function') {
        r = calculateVPDSimple(temp, hum);
      } else {
        var es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
        r = { vpd: es - es * (hum / 100) };
      }
      if (r && Number.isFinite(Number(r.vpd))) vals.push(Number(r.vpd));
    }
    if (!vals.length) return null;
    return Math.round((vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) * 100) / 100;
  }
  async function fetchClimateForPeriod(center, period) {
    var out = { vpd_mean: null, et0_sum: null, rain_sum: null };
    try {
      var daily = await fetchDaily(center.lat, center.lng, period.date_start, period.date_end);
      out.rain_sum = Math.round(sum(daily.precipitation_sum) * 10) / 10;
      out.et0_sum = Math.round(sum(daily.et0_fao_evapotranspiration) * 10) / 10;
    } catch (e) { console.warn('Lectura clima daily:', e); }
    try {
      var hourly = await fetchHourly(center.lat, center.lng, period.date_start, period.date_end);
      out.vpd_mean = computeVpdMean(hourly);
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
            'Arma un histórico del <strong>mismo predio</strong> (2 a 6 periodos hacia atrás) con <strong>NDVI</strong>, <strong>NDMI</strong>, <strong>VPD</strong>, <strong>ET₀</strong>, <strong>lluvia</strong> y tu <strong>riego</strong> (m³).' +
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
            '<button type="button" id="lecturaBtnRefresh" class="btn btn-secondary" style="font-size:13px;">🔄 Actualizar</button>' +
          '</div>' +
          '<div id="lecturaCostHint" style="font-size:12px;color:#166534;margin-top:10px;font-weight:600;"></div>' +
          '<div id="lecturaStatusHint" style="font-size:12px;color:#475569;margin-top:6px;line-height:1.5;"></div>' +
        '</div>' +
        '<div id="lecturaTableWrap" style="margin-top:14px;overflow-x:auto;"></div>' +
        '<div id="lecturaChartWrap" style="margin-top:14px;display:none;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">' +
          '<div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:8px;">Evolución por periodo</div>' +
          '<canvas id="lecturaChart" height="120"></canvas>' +
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
    var rows = state.rows.slice().sort(function (a, b) { return a.index - b.index; });
    var html = '<table style="width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">' +
      '<thead><tr style="background:#f1f5f9;color:#0f172a;">' +
      ['Periodo', 'NDVI prom', 'NDMI prom', 'VPD prom (kPa)', 'ET₀ (mm)', 'Lluvia (mm)', 'Riego (m³)', 'Estado']
        .map(function (h) { return '<th style="padding:8px 10px;text-align:center;white-space:nowrap;">' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr style="border-top:1px solid #e2e8f0;">' +
        '<td style="padding:8px 10px;font-weight:700;color:#14532d;white-space:nowrap;">' + esc(r.label || '') +
          (r.lookback_expanded ? ' <span title="Quincena nublada: ampliada a 30 días" style="color:#b45309;">*</span>' : '') + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.ndvi_mean, 3) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.ndmi_mean, 3) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.vpd_mean, 2) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.et0_sum, 1) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + fmtNum(r.rain_sum, 1) + '</td>' +
        '<td style="padding:6px 8px;text-align:center;">' +
          '<input type="number" min="0" step="0.1" value="' + (r.riego_m3 != null ? esc(r.riego_m3) : '') +
          '" data-riego-index="' + r.index + '" style="width:80px;border:1px solid #cbd5e1;border-radius:6px;padding:4px 6px;font-size:12px;text-align:right;" placeholder="0">' +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + statusBadge(r) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    html += '<div style="font-size:11px;color:#64748b;margin-top:6px;">NDVI/NDMI = promedio de píxeles válidos dentro del predio. ET₀ y lluvia = acumulado del periodo. VPD = promedio horario. <span style="color:#b45309;">*</span> quincena ampliada a 30 días por nubosidad.</div>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('input[data-riego-index]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var idx = parseInt(inp.getAttribute('data-riego-index'), 10);
        var row = (state.rows || []).find(function (x) { return x.index === idx; });
        if (row) {
          var v = parseFloat(inp.value);
          row.riego_m3 = Number.isFinite(v) ? v : null;
          saveState(state);
          renderChart(state);
        }
      });
    });
  }

  function renderChart(state) {
    var wrap = document.getElementById('lecturaChartWrap');
    var canvas = document.getElementById('lecturaChart');
    if (!wrap || !canvas || typeof Chart === 'undefined') return;
    if (!state || !state.rows || !state.rows.length) { wrap.style.display = 'none'; return; }
    var rows = state.rows.slice().sort(function (a, b) { return a.index - b.index; }).reverse(); // cronológico
    var labels = rows.map(function (r) { return r.label; });
    var ds = [
      { label: 'NDVI', yAxisID: 'yIdx', data: rows.map(function (r) { return r.ndvi_mean; }), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.15)', tension: .3, spanGaps: true },
      { label: 'NDMI', yAxisID: 'yIdx', data: rows.map(function (r) { return r.ndmi_mean; }), borderColor: '#0369a1', backgroundColor: 'rgba(3,105,161,.15)', tension: .3, spanGaps: true },
      { label: 'VPD (kPa)', yAxisID: 'yEnv', data: rows.map(function (r) { return r.vpd_mean; }), borderColor: '#ea580c', borderDash: [5, 4], tension: .3, spanGaps: true },
      { label: 'ET₀ (mm)', yAxisID: 'yEnv', data: rows.map(function (r) { return r.et0_sum; }), borderColor: '#a16207', borderDash: [2, 3], tension: .3, spanGaps: true, hidden: true },
      { label: 'Lluvia (mm)', yAxisID: 'yEnv', data: rows.map(function (r) { return r.rain_sum; }), borderColor: '#2563eb', borderDash: [2, 3], tension: .3, spanGaps: true, hidden: true },
      { label: 'Riego (m³)', yAxisID: 'yEnv', data: rows.map(function (r) { return r.riego_m3; }), borderColor: '#7c3aed', borderDash: [6, 3], tension: .3, spanGaps: true, hidden: true }
    ];
    wrap.style.display = 'block';
    if (lecturaChart) { try { lecturaChart.destroy(); } catch (e) {} lecturaChart = null; }
    lecturaChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: labels, datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          yIdx: { type: 'linear', position: 'left', min: 0, max: 1, title: { display: true, text: 'NDVI / NDMI' } },
          yEnv: { type: 'linear', position: 'right', title: { display: true, text: 'VPD / ET₀ / lluvia / riego' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  function renderGallery(state) {
    var el = document.getElementById('lecturaGallery');
    if (!el) return;
    if (!state || !state.rows || !state.rows.length) { el.innerHTML = ''; return; }
    var rows = state.rows.slice().sort(function (a, b) { return a.index - b.index; });
    var any = rows.some(function (r) { return r.signed_url || r.ndmi_signed_url; });
    if (!any) { el.innerHTML = ''; return; }
    var html = '<div style="font-weight:700;color:#0f172a;font-size:14px;margin:4px 0 10px;">Imágenes por periodo (NDVI vs NDMI)</div>';
    rows.forEach(function (r) {
      if (!r.signed_url && !r.ndmi_signed_url) return;
      html += '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-bottom:12px;background:#fff;">' +
        '<div style="font-weight:700;color:#14532d;font-size:13px;margin-bottom:8px;">' + esc(r.label || '') +
          (r.avg_cloud_cover != null ? ' · nubes ~' + esc(r.avg_cloud_cover) + '%' : '') +
          (r.valid_pct != null ? ' · útil ' + esc(r.valid_pct) + '%' : '') +
          (r.lookback_expanded ? ' · <span style="color:#b45309;">ampliada a 30 d</span>' : '') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
          '<figure style="margin:0;">' +
            (r.signed_url ? '<img src="' + esc(r.signed_url) + '" alt="NDVI ' + esc(r.label) + '" style="width:100%;border-radius:8px;display:block;background:#f1f5f9;">' : '<div style="padding:20px;text-align:center;color:#94a3b8;background:#f1f5f9;border-radius:8px;">Sin NDVI</div>') +
            '<figcaption style="text-align:center;font-size:11px;color:#166534;font-weight:700;margin-top:4px;">NDVI vigor</figcaption>' +
          '</figure>' +
          '<figure style="margin:0;">' +
            (r.ndmi_signed_url ? '<img src="' + esc(r.ndmi_signed_url) + '" alt="NDMI ' + esc(r.label) + '" style="width:100%;border-radius:8px;display:block;background:#f1f5f9;">' : '<div style="padding:20px;text-align:center;color:#94a3b8;background:#f1f5f9;border-radius:8px;">Sin NDMI</div>') +
            '<figcaption style="text-align:center;font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">NDMI humedad</figcaption>' +
          '</figure>' +
        '</div>' +
      '</div>';
    });
    el.innerHTML = html;
  }

  function renderAll(state) {
    renderTable(state);
    renderChart(state);
    renderGallery(state);
  }

  function setStatus(msg) {
    var el = document.getElementById('lecturaStatusHint');
    if (el) el.innerHTML = msg || '';
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
        if (row.vpd_mean != null && row.et0_sum != null && row.rain_sum != null) continue;
        try {
          var clim = await fetchClimateForPeriod(center, { date_start: row.date_start, date_end: row.date_end });
          row.vpd_mean = clim.vpd_mean;
          row.et0_sum = clim.et0_sum;
          row.rain_sum = clim.rain_sum;
        } catch (e) { console.warn('Lectura clima:', e); }
      }
    }
    state.updatedAt = new Date().toISOString();
    saveState(state);
    renderAll(state);
    var errores = state.rows.filter(function (r) { return r.status === 'error'; }).length;
    setStatus(errores
      ? '✔ Histórico listo. ' + errores + ' periodo(s) sin imagen por nubosidad; el resto se generó correctamente.'
      : '✔ Histórico completo. Edita el riego (m³) por periodo para completar la correlación.');
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
      var state = {
        frequency: freq,
        periods: count,
        endDate: endDate,
        updatedAt: new Date().toISOString(),
        rows: periods.map(function (p) {
          var match = created.find(function (c) { return Number(c.period_index) === Number(p.index); }) || {};
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
            riego_m3: null,
            signed_url: null, ndmi_signed_url: null
          };
        })
      };
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
    if (state) renderAll(state);

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
