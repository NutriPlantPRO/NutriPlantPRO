/**
 * NutriPlant PRO — Clima (lluvia acumulada, ET₀, lectura en vivo)
 * Open-Meteo: mismas coordenadas que VPD (centro del polígono).
 */
(function () {
  'use strict';

  var MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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
        lastUpdated: null
      };
    }
    if (!p.climateAnalysis.lastTab) p.climateAnalysis.lastTab = 'climate-vpd';
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

      var dailyPrev = await fetchYearDaily(loc.lat, loc.lng, prevYear, prevYear + '-12-31');
      var dailyCurr = await fetchYearDaily(loc.lat, loc.lng, currYear, today);

      var rainPrev = aggregateDailyByMonth(dailyPrev.time, dailyPrev.precipitation_sum, prevYear);
      var rainCurr = aggregateDailyByMonth(dailyCurr.time, dailyCurr.precipitation_sum, currYear);
      var et0Prev = aggregateDailyByMonth(dailyPrev.time, dailyPrev.et0_fao_evapotranspiration, prevYear);
      var et0Curr = aggregateDailyByMonth(dailyCurr.time, dailyCurr.et0_fao_evapotranspiration, currYear);
      var hasRainPrev = hasAnyMonthValue(rainPrev);
      var hasRainCurr = hasAnyMonthValue(rainCurr);
      var hasEt0Prev = hasAnyMonthValue(et0Prev);
      var hasEt0Curr = hasAnyMonthValue(et0Curr);

      var p = getProject();
      var fetchedAt = new Date().toISOString();
      p.climateAnalysis.rainfall = {
        fetchedAt: fetchedAt,
        lat: loc.lat,
        lng: loc.lng,
        previousYear: prevYear,
        currentYear: currYear,
        monthsPrev: rainPrev,
        monthsCurr: rainCurr,
        diff: hasRainPrev && hasRainCurr ? monthDiff(rainCurr, rainPrev) : {},
        partial: !!(dailyPrev.unavailable || dailyCurr.unavailable),
        notes: dailyPrev.unavailable ? ('Histórico ' + prevYear + ' no disponible: ' + (dailyPrev.reason || 'sin respuesta')) : ''
      };
      p.climateAnalysis.et0 = {
        fetchedAt: fetchedAt,
        lat: loc.lat,
        lng: loc.lng,
        previousYear: prevYear,
        currentYear: currYear,
        monthsPrev: et0Prev,
        monthsCurr: et0Curr,
        diff: hasEt0Prev && hasEt0Curr ? monthDiff(et0Curr, et0Prev) : {},
        partial: !!(dailyPrev.unavailable || dailyCurr.unavailable),
        notes: dailyPrev.unavailable ? ('Histórico ' + prevYear + ' no disponible: ' + (dailyPrev.reason || 'sin respuesta')) : '',
        unit: 'mm'
      };
      p.climateAnalysis.lastUpdated = fetchedAt;
      persistClimateAnalysis();
      renderClimateRainfallTables();
      if (status) {
        status.textContent = (dailyPrev.unavailable ? '⚠️ Actualizado parcial ' : '✅ Actualizado ') + new Date().toLocaleString('es-MX');
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
    var wrap = document.getElementById('climate-rainfall-tables');
    if (!wrap) return;
    ensureClimateAnalysisStructures();
    var p = getProject();
    var rain = p && p.climateAnalysis && p.climateAnalysis.rainfall;
    var et0 = p && p.climateAnalysis && p.climateAnalysis.et0;
    if (!rain || !rain.monthsPrev) {
      wrap.innerHTML =
        '<p style="color:#64748b;margin:0;">Pulsa <strong>Obtener lluvia y ET₀</strong> para cargar datos mensuales del punto del predio.</p>';
      return;
    }
    var now = new Date();
    var maxMonthCurr = now.getMonth() + 1;
    var prevY = rain.previousYear || now.getFullYear() - 1;
    var currY = rain.currentYear || now.getFullYear();
    var head = buildMonthlyTableHead();

    var rainHtml =
      '<div style="margin-bottom:24px;">' +
      '<h4 style="margin:0 0 10px 0;color:#0369a1;">🌧️ Precipitación acumulada (mm/mes)</h4>' +
      '<p style="margin:0 0 10px 0;font-size:13px;color:#64748b;">Punto del predio: ' +
      Number(rain.lat).toFixed(5) +
      ', ' +
      Number(rain.lng).toFixed(5) +
      '. ' +
      (rain.partial
        ? 'Consulta parcial: el proveedor histórico no respondió; se muestra la información disponible.'
        : 'Año anterior completo; año en curso hasta el mes actual.') +
      '</p>' +
      (rain.notes ? '<p style="margin:0 0 10px 0;font-size:12px;color:#b45309;">⚠️ ' + rain.notes + '</p>' : '') +
      '<div style="overflow-x:auto;"><table style="width:100%;min-width:720px;border-collapse:collapse;font-size:13px;">' +
      head +
      '<tbody>' +
      buildMonthlyTableRow(String(prevY), rain.monthsPrev, prevY, 12) +
      buildMonthlyTableRow(String(currY) + ' (parcial)', rain.monthsCurr, currY, maxMonthCurr) +
      buildMonthlyTableRow('Diferencia (' + currY + ' − ' + prevY + ')', rain.diff, null, maxMonthCurr) +
      '</tbody></table></div></div>';

    var et0Html = '';
    if (et0 && et0.monthsPrev) {
      et0Html =
        '<div style="margin-bottom:8px;">' +
        '<h4 style="margin:0 0 10px 0;color:#b45309;">☀️ ET₀ — Evapotranspiración de referencia (mm/mes, suma diaria)</h4>' +
        '<p style="margin:0 0 10px 0;font-size:13px;color:#64748b;">Evapotranspiración de referencia (FAO). ' +
        (et0.partial ? 'Consulta parcial por disponibilidad del proveedor histórico.' : 'Misma ventana que la lluvia.') +
        '</p>' +
        (et0.notes ? '<p style="margin:0 0 10px 0;font-size:12px;color:#b45309;">⚠️ ' + et0.notes + '</p>' : '') +
        '<div style="overflow-x:auto;"><table style="width:100%;min-width:720px;border-collapse:collapse;font-size:13px;">' +
        head +
        '<tbody>' +
        buildMonthlyTableRow(String(et0.previousYear), et0.monthsPrev, et0.previousYear, 12) +
        buildMonthlyTableRow(String(et0.currentYear) + ' (parcial)', et0.monthsCurr, et0.currentYear, maxMonthCurr) +
        buildMonthlyTableRow(
          'Diferencia (' + et0.currentYear + ' − ' + et0.previousYear + ')',
          et0.diff,
          null,
          maxMonthCurr
        ) +
        '</tbody></table></div></div>';
    }

    wrap.innerHTML = rainHtml + et0Html;
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
        cloudCover: cur.cloud_cover
      };
      getProject().climateAnalysis.lastReading = reading;
      getProject().climateAnalysis.lastUpdated = reading.fetchedAt;
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
      if (tabId === 'climate-rainfall') renderClimateRainfallTables();
      if (tabId === 'climate-live') {
        var p = getProject();
        if (p && p.climateAnalysis && p.climateAnalysis.lastReading) {
          renderClimateLiveReading(p.climateAnalysis.lastReading);
        }
      }
    });
    climateRestoreLastTab();
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
      '<h3 style="margin:0 0 8px 0;color:#0369a1;">🌧️ Lluvia acumulada y ET₀</h3>' +
      '<p style="margin:0 0 16px 0;font-size:14px;color:#64748b;">Punto: <strong>' +
      loc.lat.toFixed(5) +
      ', ' +
      loc.lng.toFixed(5) +
      '</strong> (centro del polígono).</p>' +
      '<button type="button" id="climate-btn-fetch-rainfall" onclick="window.fetchClimateRainfallAndET0 && window.fetchClimateRainfallAndET0(event)" ' +
      'style="padding:12px 18px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;margin-bottom:12px;">⬇️ Obtener lluvia y ET₀</button>' +
      '<p id="climate-rainfall-status" style="margin:0 0 16px 0;font-size:13px;color:#64748b;"></p>' +
      '<div id="climate-rainfall-tables"></div>' +
      '</div>'
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
  window.renderClimateLiveReading = renderClimateLiveReading;
  window.loadClimateSavedData = loadClimateSavedData;
  window.initClimateTabs = initClimateTabs;
  window.createClimateRainfallTabHTML = createClimateRainfallTabHTML;
  window.createClimateLiveTabHTML = createClimateLiveTabHTML;
  window.persistClimateAnalysis = persistClimateAnalysis;
})();
