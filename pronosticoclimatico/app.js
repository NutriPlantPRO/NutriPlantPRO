(function () {
  'use strict';

  const q = new URLSearchParams(location.search);
  const embed = ['login', 'dashboard'].includes(q.get('embed'));
  const demo = q.get('demo') === '1';
  const token = String(q.get('token') || '');
  const personal = demo || !!token;
  const $ = (id) => document.getElementById(id);
  const API = '/api/agroclimate';
  const STORE = 'nutriplant_free_agroclimate_v1';
  const WHATSAPP = '13868044542';
  let map;
  let marker;
  let chart;
  let rows = [];
  let timezone = '';
  let report = null;
  const visible = { rain: true, et0: true, etc: true, vpdMin: true, vpdMax: true };

  const n = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
  const round = (v, d = 1) => n(v) == null ? null : Math.round(n(v) * 10 ** d) / 10 ** d;
  const fmt = (v, d = 1, unit = '') => n(v) == null ? '—' : `${n(v).toFixed(d)}${unit}`;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const sum = (list, key) => {
    const vals = list.map((r) => n(r[key])).filter((v) => v != null);
    return vals.length ? round(vals.reduce((a, b) => a + b, 0)) : null;
  };
  const extreme = (list, key, kind) => {
    const vals = list.map((r) => n(r[key])).filter((v) => v != null);
    return vals.length ? Math[kind](...vals) : null;
  };
  const dateLabel = (iso, short) => {
    const p = String(iso).split('-').map(Number);
    return new Intl.DateTimeFormat('es-MX', short
      ? { weekday: 'short', day: '2-digit' }
      : { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(p[0], p[1] - 1, p[2]));
  };
  const addDays = (iso, days) => {
    const p = String(iso).split('-').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const vpd = (temp, humidity, radiation) => {
    const t = n(temp), h = n(humidity), rad = n(radiation);
    if (t == null || h == null) return null;
    const leaf = rad != null && rad > 200 ? t + ((rad - 200) * .6 / 100) : t;
    const esLeaf = .6108 * Math.exp(17.27 * leaf / (leaf + 237.3));
    const esAir = .6108 * Math.exp(17.27 * t / (t + 237.3));
    return Math.max(0, esLeaf - esAir * h / 100);
  };

  function setStatus(text, type, register) {
    const node = $(register ? 'agro-register-status' : 'agro-location-status');
    if (!node) return;
    node.textContent = text || '';
    node.className = `agro-status${type ? ` ${type}` : ''}`;
  }

  function setMode() {
    if (embed) document.documentElement.classList.add('agro-embed');
    $('agro-location-card').hidden = personal;
    $('agro-register-cta').hidden = personal;
    $('agro-personal-actions').hidden = !personal;
    $('agro-promo').hidden = !personal || embed;
  }

  function saved() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) { return null; }
  }

  function coords() {
    const lat = n($('agro-lat').value), lng = n($('agro-lng').value);
    return lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
  }

  function saveInputs() {
    if (personal) return;
    const c = coords();
    if (!c) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({
        ...c,
        plotName: $('agro-plot-name').value,
        kc: n($('agro-kc').value),
        updatedAt: Date.now()
      }));
    } catch (_) {}
  }

  function applyCoords(lat, lng, pan) {
    if (n(lat) == null || n(lng) == null) return;
    $('agro-lat').value = Number(lat).toFixed(5);
    $('agro-lng').value = Number(lng).toFixed(5);
    marker?.setLatLng([lat, lng]);
    if (pan) map?.setView([lat, lng], Math.max(12, map.getZoom()));
    saveInputs();
  }

  function initMap(force) {
    if (!window.L || (personal && !force) || map) return;
    const prior = personal ? (report || {}) : (saved() || {});
    const lat = n(prior.lat) ?? 19.4326, lng = n(prior.lng) ?? -99.1332;
    const initialLat = n(prior.latitude) ?? lat;
    const initialLng = n(prior.longitude) ?? lng;
    if (prior.plotName) $('agro-plot-name').value = prior.plotName;
    if (prior.kc != null) $('agro-kc').value = prior.kc;
    map = L.map('agro-map').setView([initialLat, initialLng], personal ? 12 : 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Imágenes © Esri — Maxar, Earthstar Geographics'
    }).addTo(map);
    marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); applyCoords(p.lat, p.lng); });
    map.on('click', (e) => applyCoords(e.latlng.lat, e.latlng.lng));
    applyCoords(initialLat, initialLng);
    setTimeout(() => map.invalidateSize(), 150);
  }

  function geolocate() {
    if (!navigator.geolocation) return setStatus('Tu navegador no permite geolocalización.', 'error');
    const btn = $('agro-geolocate-btn');
    btn.disabled = true;
    setStatus('Solicitando ubicación…');
    navigator.geolocation.getCurrentPosition((p) => {
      applyCoords(p.coords.latitude, p.coords.longitude, true);
      setStatus('Ubicación aplicada. Puedes mover el marcador para afinarla.', 'success');
      btn.disabled = false;
    }, (err) => {
      setStatus(err.code === 1 ? 'Permiso de ubicación denegado.' : 'No se pudo obtener la ubicación.', 'error');
      btn.disabled = false;
    }, { enableHighAccuracy: true, timeout: 15000 });
  }

  function weatherUrl(lat, lng) {
    const daily = [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'et0_fao_evapotranspiration', 'shortwave_radiation_sum'
    ].join(',');
    const hourly = 'temperature_2m,relative_humidity_2m,dew_point_2m,shortwave_radiation';
    return `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&past_days=7&forecast_days=8&daily=${daily}&hourly=${hourly}&current=temperature_2m&timezone=auto`;
  }

  function weatherRows(data, kc) {
    if (!data?.daily?.time?.length) throw new Error('La fuente no devolvió datos diarios.');
    const hourly = {};
    (data.hourly?.time || []).forEach((time, i) => {
      const day = time.slice(0, 10);
      hourly[day] ||= { vpds: [], radiations: [], humidities: [], dews: [] };
      const val = vpd(data.hourly.temperature_2m?.[i], data.hourly.relative_humidity_2m?.[i], data.hourly.shortwave_radiation?.[i]);
      if (val != null) hourly[day].vpds.push(val);
      const rad = n(data.hourly.shortwave_radiation?.[i]);
      if (rad != null) hourly[day].radiations.push(rad);
      const humidity = n(data.hourly.relative_humidity_2m?.[i]);
      if (humidity != null) hourly[day].humidities.push(humidity);
      const dew = n(data.hourly.dew_point_2m?.[i]);
      if (dew != null) hourly[day].dews.push(dew);
    });
    const today = String(data.current?.time || data.daily.time[7]).slice(0, 10);
    const historyStart = addDays(today, -7), forecastEnd = addDays(today, 6);
    return data.daily.time.map((date, i) => {
      const h = hourly[date] || { vpds: [], radiations: [], humidities: [], dews: [] };
      const et0 = n(data.daily.et0_fao_evapotranspiration?.[i]);
      return {
        date,
        kind: date < today ? 'history' : 'forecast',
        tempMin: n(data.daily.temperature_2m_min?.[i]),
        tempMax: n(data.daily.temperature_2m_max?.[i]),
        humidityMin: h.humidities.length ? Math.min(...h.humidities) : null,
        humidityMax: h.humidities.length ? Math.max(...h.humidities) : null,
        dewMin: h.dews.length ? round(Math.min(...h.dews), 1) : null,
        dewMax: h.dews.length ? round(Math.max(...h.dews), 1) : null,
        radiationSum: n(data.daily.shortwave_radiation_sum?.[i]),
        radiationMax: h.radiations.length ? Math.max(...h.radiations) : null,
        vpdMin: h.vpds.length ? round(Math.min(...h.vpds), 2) : null,
        vpdMax: h.vpds.length ? round(Math.max(...h.vpds), 2) : null,
        et0,
        etc: et0 != null && kc != null ? round(et0 * kc) : null,
        rain: n(data.daily.precipitation_sum?.[i])
      };
    }).filter((r) => r.date >= historyStart && r.date <= forecastEnd);
  }

  function demoRows() {
    const today = new Date().toISOString().slice(0, 10);
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(today, i - 7), x = i + 1, et0 = round(3.2 + (x % 5) * .55);
      return {
        date: day, kind: i < 7 ? 'history' : 'forecast',
        tempMin: 14 + (x % 4), tempMax: 26 + (x % 6),
        humidityMin: 34 + (x % 5) * 4, humidityMax: 76 + (x % 4) * 4,
        dewMin: 10 + (x % 4), dewMax: 16 + (x % 3),
        radiationSum: round(17 + (x % 6) * 1.2), radiationMax: 620 + (x % 5) * 45,
        vpdMin: round(.28 + (x % 3) * .08, 2), vpdMax: round(1.45 + (x % 5) * .22, 2),
        et0, etc: round(et0 * .9), rain: x % 4 === 0 ? round(2.5 + x * .35) : 0
      };
    });
  }

  async function generate() {
    const c = coords();
    if (!c) return setStatus('Selecciona coordenadas válidas.', 'error');
    const btn = $('agro-generate-btn');
    btn.disabled = true;
    setStatus('Consultando los últimos 7 días y el pronóstico…');
    try {
      const response = await fetch(weatherUrl(c.lat, c.lng));
      if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);
      const data = await response.json();
      timezone = data.timezone || '';
      rows = weatherRows(data, n($('agro-kc').value));
      report = { ...(report || {}), plot_name: $('agro-plot-name').value || 'Ubicación seleccionada', latitude: c.lat, longitude: c.lng, kc: n($('agro-kc').value) };
      if (personal && token) {
        const saveResponse = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_plot', token, ...report })
        });
        const savedPlot = await saveResponse.json().catch(() => ({}));
        if (!saveResponse.ok) throw new Error(savedPlot.message || 'No se pudo guardar el predio.');
      }
      render();
      saveInputs();
      setStatus(`Lectura actualizada${timezone ? ` · ${timezone}` : ''}.`, 'success');
    } catch (error) {
      setStatus(`No se pudo generar el pronóstico. ${error.message || ''}`, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  function summaryHtml(future) {
    const cards = [
      ['Temperatura', `${fmt(extreme(future, 'tempMin', 'min'), 1)} a ${fmt(extreme(future, 'tempMax', 'max'), 1, ' °C')}`, 'Rango del pronóstico', ''],
      ['VPD', `${fmt(extreme(future, 'vpdMin', 'min'), 2)} a ${fmt(extreme(future, 'vpdMax', 'max'), 2, ' kPa')}`, 'Mínimo y máximo', 'vpd'],
      ['ETo acumulada', fmt(sum(future, 'et0'), 1, ' mm'), 'Demanda de referencia', 'et'],
      ['ETc acumulada', fmt(sum(future, 'etc'), 1, ' mm'), report?.kc != null ? `Kc ${report.kc}` : 'Ingresa Kc para calcular', 'et'],
      ['Precipitación', fmt(sum(future, 'rain'), 1, ' mm'), 'Acumulada prevista', 'rain'],
      ['Humedad', `${fmt(extreme(future, 'humidityMin', 'min'), 0)} a ${fmt(extreme(future, 'humidityMax', 'max'), 0, ' %')}`, 'Rango del pronóstico', ''],
      ['Radiación', fmt(sum(future, 'radiationSum'), 1, ' MJ/m²'), 'Acumulada prevista', ''],
      ['Periodo', `${dateLabel(future[0]?.date, true)} – ${dateLabel(future.at(-1)?.date, true)}`, `${future.length} días`, '']
    ];
    return cards.map((c) => `<article class="agro-summary-card ${c[3]}"><small>${c[0]}</small><strong>${c[1]}</strong><span>${c[2]}</span></article>`).join('');
  }

  function dayCardsHtml() {
    return rows.map((r) => `<article class="agro-day-card ${r.kind}">
      <div class="agro-day-card-head"><strong>${esc(dateLabel(r.date))}</strong><span class="agro-day-badge ${r.kind}">${r.kind === 'history' ? 'Histórico' : 'Pronóstico'}</span></div>
      <div class="agro-day-card-grid">
        <div class="agro-day-metric"><small>Temperatura</small><strong>${fmt(r.tempMin, 1)}–${fmt(r.tempMax, 1, ' °C')}</strong></div>
        <div class="agro-day-metric"><small>Humedad</small><strong>${fmt(r.humidityMin, 0)}–${fmt(r.humidityMax, 0, ' %')}</strong></div>
        <div class="agro-day-metric"><small>VPD</small><strong>${fmt(r.vpdMin, 2)}–${fmt(r.vpdMax, 2, ' kPa')}</strong></div>
        <div class="agro-day-metric"><small>ETo / ETc</small><strong>${fmt(r.et0, 1)} / ${fmt(r.etc, 1)} mm</strong></div>
        <div class="agro-day-metric"><small>Lluvia</small><strong>${fmt(r.rain, 1, ' mm')}</strong></div>
        <div class="agro-day-metric"><small>Radiación</small><strong>${fmt(r.radiationSum, 1, ' MJ/m²')}</strong></div>
      </div></article>`).join('');
  }

  function tableHtml() {
    let firstForecast = true;
    const body = rows.map((r) => {
      const first = r.kind === 'forecast' && firstForecast;
      if (first) firstForecast = false;
      return `<tr class="${r.kind}${first ? ' first-forecast' : ''}">
        <td>${esc(dateLabel(r.date))}<span class="agro-day-badge ${r.kind}">${r.kind === 'history' ? 'Histórico' : 'Pronóstico'}</span></td>
        <td>${fmt(r.tempMin, 1)}</td><td>${fmt(r.tempMax, 1)}</td>
        <td>${fmt(r.humidityMin, 0)}</td><td>${fmt(r.humidityMax, 0)}</td>
        <td>${fmt(r.dewMin, 1)}</td><td>${fmt(r.dewMax, 1)}</td>
        <td>${fmt(r.radiationSum, 1)}</td><td>${fmt(r.radiationMax, 0)}</td>
        <td>${fmt(r.vpdMin, 2)}</td><td>${fmt(r.vpdMax, 2)}</td>
        <td>${fmt(r.et0, 1)}</td><td>${fmt(r.etc, 1)}</td><td>${fmt(r.rain, 1)}</td>
      </tr>`;
    }).join('');
    return `<table class="agro-table"><thead>
      <tr><th rowspan="2">Fecha</th><th class="group-atmosphere" colspan="6">Ambiente</th><th class="group-vpd" colspan="4">Radiación y VPD</th><th class="group-water" colspan="3">Agua</th></tr>
      <tr><th title="Temperatura mínima">T mín °C</th><th title="Temperatura máxima">T máx °C</th><th>HR mín %</th><th>HR máx %</th><th>Rocío mín °C</th><th>Rocío máx °C</th><th>Rad MJ/m²</th><th>Rad máx W/m²</th><th>VPD mín</th><th>VPD máx</th><th>ETo mm</th><th>ETc mm</th><th>Lluvia mm</th></tr>
    </thead><tbody>${body}</tbody></table>`;
  }

  function chartSets() {
    const sets = [
      ['rain', 'Precipitación', '#0284c7', 'bar', 'yMm', 'rain'],
      ['et0', 'ETo', '#16a34a', 'line', 'yMm', 'et0'],
      ['etc', 'ETc', '#64748b', 'line', 'yMm', 'etc'],
      ['vpdMin', 'VPD mínimo', '#7c3aed', 'line', 'yVpd', 'vpdMin'],
      ['vpdMax', 'VPD máximo', '#be123c', 'line', 'yVpd', 'vpdMax']
    ];
    return sets.filter((s) => visible[s[0]]).map((s) => ({
      key: s[0], label: s[1], borderColor: s[2], backgroundColor: s[3] === 'bar' ? `${s[2]}55` : s[2],
      type: s[3], yAxisID: s[4], data: rows.map((r) => r[s[5]]), borderWidth: 2, tension: .28, pointRadius: 2
    }));
  }

  function drawChart() {
    if (!window.Chart) return;
    chart?.destroy();
    chart = new Chart($('agro-chart'), {
      data: { labels: rows.map((r) => shortDateLabel(r.date)), datasets: chartSets() },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        scales: {
          yMm: { position: 'left', beginAtZero: true, title: { display: true, text: 'mm' } },
          yVpd: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'kPa' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderToggles() {
    const labels = { rain: 'Lluvia', et0: 'ETo', etc: 'ETc', vpdMin: 'VPD mín', vpdMax: 'VPD máx' };
    $('agro-chart-toggles').innerHTML = Object.keys(labels).map((key) =>
      `<button type="button" class="agro-chart-toggle${visible[key] ? '' : ' off'}" data-series="${key}">${labels[key]}</button>`).join('');
  }

  function render() {
    if (!rows.length) return;
    const future = rows.filter((r) => r.kind === 'forecast');
    $('agro-summary-grid').innerHTML = summaryHtml(future);
    $('agro-mobile-days').innerHTML = dayCardsHtml();
    $('agro-table-wrap').innerHTML = tableHtml();
    $('agro-results').hidden = false;
    $('agro-empty-note').hidden = true;
    $('agro-report-meta').hidden = !personal;
    if (personal) $('agro-report-meta').innerHTML = `<strong>${esc(report?.plot_name || 'Predio')}</strong><br>${esc(timezone || report?.timezone || '')}${report?.request_code ? `<br>Folio ${esc(report.request_code)}` : ''}`;
    renderToggles();
    drawChart();
    setTimeout(sendResize, 100);
  }

  function kcModal() {
    $('agro-kc-modal').hidden = false;
    renderKc('');
  }

  function renderKc(filter) {
    const query = String(filter || '').toLocaleLowerCase('es');
    const data = (window.FAO_KC_REFERENCE || []).filter((x) => `${x.crop} ${x.stage}`.toLocaleLowerCase('es').includes(query));
    $('agro-kc-list').innerHTML = data.length ? data.map((x, i) => {
      const suggested = round((Number(x.kcMin) + Number(x.kcMax)) / 2, 2);
      return `<div class="agro-kc-row"><b>${esc(x.crop)}</b><span>${esc(x.stage)}</span><strong>${x.kcMin}–${x.kcMax}</strong><button type="button" class="agro-btn ghost" data-kc="${suggested}" data-crop="${esc(x.crop)}">Usar ${suggested}</button></div>`;
    }).join('') : '<p>No se encontraron coincidencias.</p>';
  }

  function openRegister() {
    const c = coords() || { lat: report?.latitude, lng: report?.longitude };
    const form = $('agro-register-form');
    form.elements.plot_name.value = $('agro-plot-name').value || report?.plot_name || '';
    form.elements.latitude.value = c?.lat ?? '';
    form.elements.longitude.value = c?.lng ?? '';
    form.elements.kc.value = $('agro-kc').value || report?.kc || '';
    $('agro-register-success').hidden = true;
    form.hidden = false;
    $('agro-register-modal').hidden = false;
  }

  async function register(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    data.accept_terms = !!form.elements.accept_terms.checked;
    data.email_consent = !!form.elements.email_consent.checked;
    data.whatsapp_consent = !!form.elements.whatsapp_consent.checked;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    setStatus('Guardando solicitud…', '', true);
    try {
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', ...data }) });
      const out = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(out.message || out.error || 'No se pudo guardar.');
      form.hidden = true;
      $('agro-register-success').hidden = false;
      $('agro-request-code').textContent = out.request_code;
      const message = `Hola NutriPlant. Me interesa registrarme para recibir Alertas Agroclimáticas.\nNombre: ${data.full_name}\nFolio: ${out.request_code}`;
      $('agro-whatsapp-link').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
    } catch (error) {
      setStatus(error.message, 'error', true);
    } finally { submit.disabled = false; }
  }

  async function loadReport() {
    if (demo) {
      rows = demoRows();
      timezone = 'America/Mexico_City';
      report = { plot_name: 'Predio demostrativo', kc: .9, request_code: 'K7M2', latitude: 19.4326, longitude: -99.1332 };
      return render();
    }
    try {
      const response = await fetch(`${API}?action=report&token=${encodeURIComponent(token)}`);
      const out = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(out.message || 'El enlace no está disponible.');
      report = out.subscriber || {};
      rows = out.rows || [];
      timezone = report.timezone || '';
      $('agro-plot-name').value = report.plot_name || '';
      $('agro-lat').value = report.latitude ?? '';
      $('agro-lng').value = report.longitude ?? '';
      $('agro-kc').value = report.kc ?? '';
      if (!rows.length && report.latitude != null) {
        const weather = await fetch(weatherUrl(report.latitude, report.longitude)).then((r) => r.json());
        rows = weatherRows(weather, n(report.kc));
      }
      render();
    } catch (error) {
      $('agro-empty-note').innerHTML = `<strong>No se pudo abrir el reporte.</strong><span>${esc(error.message)}</span>`;
    }
  }

  async function unsubscribe() {
    if (!token || !confirm('¿Deseas dejar de recibir las alertas agroclimáticas?')) return;
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unsubscribe', token }) });
    const out = await response.json().catch(() => ({}));
    alert(response.ok ? 'Tus alertas fueron desactivadas.' : (out.message || 'No se pudo procesar la solicitud.'));
  }

  function sendResize() {
    if (!embed || window.parent === window) return;
    window.parent.postMessage({ type: 'np-free-tool-resize', height: Math.ceil(document.documentElement.scrollHeight) }, '*');
  }

  function bind() {
    $('agro-geolocate-btn').addEventListener('click', geolocate);
    $('agro-generate-btn').addEventListener('click', generate);
    $('agro-kc-reference-btn').addEventListener('click', kcModal);
    $('agro-kc-search').addEventListener('input', (e) => renderKc(e.target.value));
    $('agro-kc-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-kc]');
      if (!btn) return;
      $('agro-kc').value = btn.dataset.kc;
      const crop = $('agro-register-form').elements.crop;
      if (crop && !crop.value) crop.value = btn.dataset.crop || '';
      $('agro-kc-modal').hidden = true;
      saveInputs();
    });
    document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => $(btn.dataset.closeModal).hidden = true));
    document.querySelectorAll('.agro-modal').forEach((modal) => modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; }));
    $('agro-open-register-btn').addEventListener('click', openRegister);
    $('agro-register-form').addEventListener('submit', register);
    $('agro-table-toggle').addEventListener('click', () => {
      $('agro-table-wrap').classList.toggle('open');
      $('agro-table-toggle').textContent = $('agro-table-wrap').classList.contains('open') ? 'Ocultar tabla completa' : 'Ver tabla completa';
    });
    $('agro-chart-toggles').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-series]');
      if (!btn) return;
      visible[btn.dataset.series] = !visible[btn.dataset.series];
      renderToggles();
      drawChart();
    });
    $('agro-pdf-btn').addEventListener('click', () => window.print());
    $('agro-unsubscribe-btn').addEventListener('click', unsubscribe);
    $('agro-edit-btn').addEventListener('click', () => {
      $('agro-location-card').hidden = false;
      $('agro-generate-btn').textContent = '💾 Guardar ubicación y actualizar';
      initMap(true);
      setTimeout(() => map?.invalidateSize(), 100);
      $('agro-location-card').scrollIntoView({ behavior: 'smooth' });
    });
    ['agro-lat', 'agro-lng', 'agro-kc', 'agro-plot-name'].forEach((id) => $(id).addEventListener('change', saveInputs));
    window.addEventListener('resize', sendResize);
  }

  function init() {
    setMode();
    bind();
    if (personal) loadReport(); else initMap();
    sendResize();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
