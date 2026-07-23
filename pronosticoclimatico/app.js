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
  let lastReadingAt = null;
  let report = null;
  let savedKc = null;
  let viewKc = null;
  let referenceKcLabel = '';
  let kcModalTarget = 'location';
  const visible = { vpdHours: true, rain: true, et0: true, etc: true };

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

  function formatReadingAt(ts) {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (!Number.isFinite(d.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(d);
  }

  function readingStatusText(extra) {
    const when = lastReadingAt ? formatReadingAt(lastReadingAt) : '';
    const base = when ? `Última lectura: ${when}` : 'Lectura actualizada';
    return extra ? `${base}. ${extra}` : `${base}.`;
  }

  function markReadingNow() {
    lastReadingAt = Date.now();
  }

  function setMode() {
    if (embed) document.documentElement.classList.add('agro-embed');
    const fromEmailLink = !!token;
    $('agro-location-card').hidden = personal;
    $('agro-register-cta').hidden = personal;
    $('agro-personal-actions').hidden = !personal;
    $('agro-promo').hidden = !personal || embed;
    const unsub = $('agro-unsubscribe-btn');
    if (unsub) {
      // Solo desde el link del correo (?token=...), no en herramienta libre ni demo.
      unsub.hidden = !fromEmailLink;
      unsub.style.display = fromEmailLink ? '' : 'none';
    }
  }

  function activeKc() {
    return viewKc != null ? viewKc : savedKc;
  }

  function applyEtcWithKc(kc) {
    const factor = n(kc);
    rows = rows.map((r) => ({
      ...r,
      etc: r.et0 != null && factor != null ? round(r.et0 * factor) : null
    }));
  }

  function syncKcBar() {
    const bar = $('agro-kc-bar');
    if (!bar) return;
    // Un solo Kc arriba de la tabla (gratis y personal).
    bar.hidden = !rows.length;
    if (bar.hidden) return;
    const kc = activeKc();
    const usingViewOnly = personal && viewKc != null && savedKc != null && Number(viewKc) !== Number(savedKc);
    const hint = $('agro-kc-view-hint');
    if (hint) hint.textContent = personal ? '(solo esta vista)' : '';
    const viewInput = $('agro-kc-view');
    if (viewInput && document.activeElement !== viewInput) {
      viewInput.value = kc == null ? '' : Number(kc).toFixed(2);
    }
    const note = $('agro-kc-bar-note');
    if (note) {
      if (kc == null) {
        note.textContent = personal
          ? 'Sin Kc no hay ETc. Puedes probar un Kc aquí. El valor guardado de tu alerta se cambia por WhatsApp.'
          : 'Sin Kc no hay ETc. Usa Referencia FAO o escribe un Kc y pulsa Aplicar.';
      } else if (usingViewOnly) {
        note.innerHTML = `ETc de esta vista = <strong>ETo × ${Number(kc).toFixed(2)}</strong>. Valor <strong>guardado</strong> de tu alerta: <strong>${Number(savedKc).toFixed(2)}</strong> (cámbialo por WhatsApp).`;
      } else {
        note.innerHTML = personal
          ? `ETc = <strong>ETo × ${Number(kc).toFixed(2)}</strong>. Aquí solo pruebas; el Kc/coordenadas <strong>guardados</strong> de tu alerta se piden por WhatsApp.`
          : `ETc = <strong>ETo × ${Number(kc).toFixed(2)}</strong>. Puedes editar Kc aquí libremente.`;
      }
    }
    const wa = $('agro-kc-whatsapp');
    if (!wa) return;
    // WhatsApp solo en reporte personal (link del correo), no en herramienta gratuita.
    if (!personal) {
      wa.hidden = true;
      bar.classList.toggle('no-wa', true);
      return;
    }
    bar.classList.toggle('no-wa', false);
    const folio = report?.request_code ? ` Folio ${report.request_code}.` : '';
    const name = report?.full_name || report?.plot_name || '';
    const lat = report?.latitude ?? $('agro-lat')?.value;
    const lng = report?.longitude ?? $('agro-lng')?.value;
    const coords = (lat != null && lat !== '' && lng != null && lng !== '')
      ? ` Coordenadas guardadas actuales: ${lat}, ${lng}.`
      : '';
    const message =
      `Hola NutriPlant. Quiero cambiar el Kc y/o las coordenadas GUARDADOS de mi alerta agroclimática (valores por defecto del predio, no solo de una vista).` +
      `${folio}${name ? ` Predio/nombre: ${name}.` : ''}` +
      ` Kc guardado actual: ${savedKc == null ? 'sin definir' : savedKc}.` +
      `${coords}` +
      ` Nuevo Kc y/o nuevas coordenadas que solicito: `;
    wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
    wa.hidden = false;
    const waLabel = wa.querySelector('span');
    if (waLabel) {
      waLabel.innerHTML = 'Cambiar Kc o coordenadas <strong>guardados</strong> (alerta) · WhatsApp';
    }
    wa.title = 'Pedir cambio del Kc o coordenadas guardados de tu alerta (valores permanentes)';
  }

  function applyViewKc() {
    const next = n($('agro-kc-view').value);
    if (next != null && (next < 0 || next > 2.5)) {
      setStatus('El Kc debe estar entre 0 y 2.5.', 'error');
      return;
    }
    viewKc = next;
    if (!personal) savedKc = next;
    applyEtcWithKc(activeKc());
    render();
    if (!personal) saveInputs();
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
      const prev = saved() || {};
      localStorage.setItem(STORE, JSON.stringify({
        ...c,
        plotName: $('agro-plot-name').value,
        kc: savedKc != null ? savedKc : n($('agro-kc-view')?.value),
        timezone: timezone || prev.timezone || undefined,
        lastReadingAt: lastReadingAt || prev.lastReadingAt || undefined,
        rows: (Array.isArray(rows) && rows.length ? rows : prev.rows) || undefined,
        updatedAt: Date.now()
      }));
    } catch (_) {}
  }

  function restoreLastReading() {
    if (personal) return;
    const prior = saved();
    if (!prior) return;
    if (prior.plotName) $('agro-plot-name').value = prior.plotName;
    if (prior.kc != null) {
      savedKc = n(prior.kc);
      viewKc = savedKc;
    }
    if (prior.timezone) timezone = prior.timezone;
    if (prior.lastReadingAt) lastReadingAt = Number(prior.lastReadingAt) || Date.parse(prior.lastReadingAt) || null;
    if (Array.isArray(prior.rows) && prior.rows.length) {
      rows = prior.rows;
      report = {
        plot_name: prior.plotName || 'Ubicación seleccionada',
        latitude: n(prior.lat) ?? n(prior.latitude),
        longitude: n(prior.lng) ?? n(prior.longitude),
        kc: savedKc
      };
      applyEtcWithKc(activeKc());
      render();
      if (lastReadingAt) setStatus(readingStatusText(), 'success');
    } else if (lastReadingAt) {
      setStatus(readingStatusText('Genera de nuevo para actualizar los datos.'), '');
    }
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
    if (!window.L) {
      setStatus('No se pudo cargar el mapa. Recarga la página.', 'error');
      return;
    }
    if ((personal && !force) || map) {
      if (map) setTimeout(() => map.invalidateSize(), 80);
      return;
    }
    const prior = personal ? (report || {}) : (saved() || {});
    const lat = n(prior.lat) ?? 19.4326, lng = n(prior.lng) ?? -99.1332;
    const initialLat = n(prior.latitude) ?? lat;
    const initialLng = n(prior.longitude) ?? lng;
    if (prior.plotName || prior.plot_name) $('agro-plot-name').value = prior.plotName || prior.plot_name || '';
    if (prior.kc != null) {
      savedKc = n(prior.kc);
      viewKc = savedKc;
    }
    const mapEl = $('agro-map');
    if (!mapEl) return;
    map = L.map(mapEl, { scrollWheelZoom: true }).setView([initialLat, initialLng], personal ? 12 : 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Imágenes © Esri — Maxar, Earthstar Geographics'
    }).addTo(map);
    marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); applyCoords(p.lat, p.lng); });
    map.on('click', (e) => applyCoords(e.latlng.lat, e.latlng.lng));
    applyCoords(initialLat, initialLng);
    [100, 300, 800].forEach((ms) => setTimeout(() => { if (map) map.invalidateSize(); }, ms));
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
      hourly[day] ||= { vpds: [], radiations: [], humidities: [], dews: [], vpdLow: 0, vpdOpt: 0, vpdHigh: 0 };
      const val = vpd(data.hourly.temperature_2m?.[i], data.hourly.relative_humidity_2m?.[i], data.hourly.shortwave_radiation?.[i]);
      if (val != null) {
        hourly[day].vpds.push(val);
        if (val < 0.5) hourly[day].vpdLow += 1;
        else if (val <= 1.5) hourly[day].vpdOpt += 1;
        else hourly[day].vpdHigh += 1;
      }
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
      const h = hourly[date] || { vpds: [], radiations: [], humidities: [], dews: [], vpdLow: 0, vpdOpt: 0, vpdHigh: 0 };
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
        vpdHoursLow: h.vpdLow,
        vpdHoursOpt: h.vpdOpt,
        vpdHoursHigh: h.vpdHigh,
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
      const low = 4 + (x % 5);
      const opt = 8 + (x % 4);
      const high = Math.max(0, 24 - low - opt);
      return {
        date: day, kind: i < 7 ? 'history' : 'forecast',
        tempMin: 14 + (x % 4), tempMax: 26 + (x % 6),
        humidityMin: 34 + (x % 5) * 4, humidityMax: 76 + (x % 4) * 4,
        dewMin: 10 + (x % 4), dewMax: 16 + (x % 3),
        radiationSum: round(17 + (x % 6) * 1.2), radiationMax: 620 + (x % 5) * 45,
        vpdMin: round(.28 + (x % 3) * .08, 2), vpdMax: round(1.45 + (x % 5) * .22, 2),
        vpdHoursLow: low, vpdHoursOpt: opt, vpdHoursHigh: high,
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
      if (personal) {
        savedKc = savedKc != null ? savedKc : n(report?.kc);
      } else {
        const fromBar = n($('agro-kc-view')?.value);
        if (fromBar != null) savedKc = fromBar;
        else if (savedKc == null) savedKc = n(saved()?.kc);
      }
      viewKc = savedKc;
      rows = weatherRows(data, activeKc());
      markReadingNow();
      if (personal) {
        report = {
          ...(report || {}),
          plot_name: $('agro-plot-name').value || report?.plot_name || 'Ubicación seleccionada',
          latitude: n(report?.latitude) != null ? n(report.latitude) : c.lat,
          longitude: n(report?.longitude) != null ? n(report.longitude) : c.lng,
          kc: savedKc
        };
        render();
        setStatus(
          readingStatusText('Para cambiar Kc o coordenadas guardadas, usa WhatsApp.'),
          'success'
        );
      } else {
        report = {
          ...(report || {}),
          plot_name: $('agro-plot-name').value || 'Ubicación seleccionada',
          latitude: c.lat,
          longitude: c.lng,
          kc: savedKc
        };
        render();
        saveInputs();
        setStatus(readingStatusText(), 'success');
      }
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
      ['ETc acumulada', fmt(sum(future, 'etc'), 1, ' mm'), activeKc() != null ? `Con Kc ${Number(activeKc()).toFixed(2)} (ETo × Kc)` : 'Ingresa Kc para calcular', 'et'],
      ['Precipitación', fmt(sum(future, 'rain'), 1, ' mm'), 'Acumulada prevista', 'rain'],
      ['Humedad', `${fmt(extreme(future, 'humidityMin', 'min'), 0)} a ${fmt(extreme(future, 'humidityMax', 'max'), 0, ' %')}`, 'Rango del pronóstico', ''],
      ['Rad máx', `${fmt(extreme(future, 'radiationMax', 'min'), 0)} a ${fmt(extreme(future, 'radiationMax', 'max'), 0, ' W/m²')}`, 'Rango del pronóstico', ''],
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
        <div class="agro-day-metric"><small>Rad máx</small><strong>${fmt(r.radiationMax, 0, ' W/m²')}</strong></div>
      </div></article>`).join('');
  }

  function tableHtml() {
    let firstForecast = true;
    const body = rows.map((r) => {
      const first = r.kind === 'forecast' && firstForecast;
      if (first) firstForecast = false;
      return `<tr class="${r.kind}${first ? ' first-forecast' : ''}">
        <td class="agro-date-col">${esc(dateLabel(r.date))}<span class="agro-day-badge ${r.kind}">${r.kind === 'history' ? 'Histórico' : 'Pronóstico'}</span></td>
        <td class="col-atm col-temp-min">${fmt(r.tempMin, 1)}</td><td class="col-atm col-temp-max">${fmt(r.tempMax, 1)}</td>
        <td class="col-atm col-rh-min">${fmt(r.humidityMin, 0)}</td><td class="col-atm col-rh-max">${fmt(r.humidityMax, 0)}</td>
        <td class="col-atm col-dew-min">${fmt(r.dewMin, 1)}</td><td class="col-atm col-dew-max col-end-atm">${fmt(r.dewMax, 1)}</td>
        <td class="col-vpd col-rad">${fmt(r.radiationMax, 0)}</td>
        <td class="col-vpd col-vpd-min">${fmt(r.vpdMin, 2)}</td><td class="col-vpd col-vpd-max col-end-vpd">${fmt(r.vpdMax, 2)}</td>
        <td class="col-water col-eto">${fmt(r.et0, 1)}</td><td class="col-water col-etc">${fmt(r.etc, 1)}</td><td class="col-water col-rain">${fmt(r.rain, 1)}</td>
      </tr>`;
    }).join('');
    return `<table class="agro-table"><thead>
      <tr class="agro-group-row">
        <th class="agro-date-col" rowspan="2">Fecha</th>
        <th class="group-atmosphere" colspan="6">Ambiente</th>
        <th class="group-vpd" colspan="3">Radiación y VPD</th>
        <th class="group-water" colspan="3">Agua</th>
      </tr>
      <tr class="agro-metric-row">
        <th class="col-atm col-temp-min">T mín °C</th><th class="col-atm col-temp-max">T máx °C</th>
        <th class="col-atm col-rh-min">HR mín %</th><th class="col-atm col-rh-max">HR máx %</th>
        <th class="col-atm col-dew-min">Rocío mín °C</th><th class="col-atm col-dew-max col-end-atm">Rocío máx °C</th>
        <th class="col-vpd col-rad">Rad máx W/m²</th>
        <th class="col-vpd col-vpd-min">VPD mín</th><th class="col-vpd col-vpd-max col-end-vpd">VPD máx</th>
        <th class="col-water col-eto">ETo mm</th><th class="col-water col-etc">ETc mm${activeKc() != null ? `<span class="agro-etc-kc">· Kc ${Number(activeKc()).toFixed(2)}</span>` : ''}</th><th class="col-water col-rain">Lluvia mm</th>
      </tr>
    </thead><tbody>${body}</tbody></table>`;
  }

  function chartSets() {
    const sets = [];
    if (visible.vpdHours) {
      sets.push(
        {
          type: 'bar',
          label: 'Horas VPD <0.5',
          yAxisID: 'yHours',
          data: rows.map((r) => r.vpdHoursLow ?? 0),
          backgroundColor: 'rgba(29, 78, 216, 0.28)',
          borderColor: 'rgba(29, 78, 216, 0.45)',
          borderWidth: 1,
          stack: 'vpdHours',
          order: 3,
          barPercentage: 0.72,
          categoryPercentage: 0.78
        },
        {
          type: 'bar',
          label: 'Horas VPD 0.5–1.5',
          yAxisID: 'yHours',
          data: rows.map((r) => r.vpdHoursOpt ?? 0),
          backgroundColor: 'rgba(22, 163, 74, 0.22)',
          borderColor: 'rgba(22, 163, 74, 0.4)',
          borderWidth: 1,
          stack: 'vpdHours',
          order: 3,
          barPercentage: 0.72,
          categoryPercentage: 0.78
        },
        {
          type: 'bar',
          label: 'Horas VPD >1.5',
          yAxisID: 'yHours',
          data: rows.map((r) => r.vpdHoursHigh ?? 0),
          backgroundColor: 'rgba(127, 29, 29, 0.28)',
          borderColor: 'rgba(127, 29, 29, 0.48)',
          borderWidth: 1,
          stack: 'vpdHours',
          order: 3,
          barPercentage: 0.72,
          categoryPercentage: 0.78
        }
      );
    }
    const lines = [
      ['rain', 'Precipitación', '#0284c7', 'rain'],
      ['et0', 'ETo', '#0f766e', 'et0'],
      ['etc', 'ETc', '#64748b', 'etc']
    ];
    lines.filter((s) => visible[s[0]]).forEach((s) => {
      sets.push({
        type: 'line',
        label: s[1],
        borderColor: s[2],
        backgroundColor: 'transparent',
        yAxisID: 'yMm',
        data: rows.map((r) => r[s[3]]),
        borderWidth: 2.2,
        tension: .28,
        pointRadius: 2.5,
        order: 1
      });
    });
    return sets;
  }

  function drawChart() {
    if (!window.Chart) {
      setStatus('No se pudo cargar la gráfica. Recarga la página.', 'error');
      return;
    }
    const canvas = $('agro-chart');
    if (!canvas) return;
    chart?.destroy();
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: rows.map((r) => dateLabel(r.date, true)),
        datasets: chartSets()
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { stacked: true },
          yHours: {
            position: 'left',
            stacked: true,
            min: 0,
            max: 24,
            title: {
              display: true,
              text: 'Horas VPD · barras',
              color: '#1d4ed8',
              font: { weight: '700', size: 11 }
            },
            ticks: { stepSize: 4, color: '#1e40af' },
            border: { color: '#93c5fd' },
            grid: { color: 'rgba(147, 197, 253, 0.25)' }
          },
          yMm: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: 'mm · líneas (lluvia / ETo / ETc)',
              color: '#0f766e',
              font: { weight: '700', size: 11 }
            },
            ticks: { color: '#0f766e' },
            border: { color: '#5eead4' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            itemSort(a, b) {
              const rank = (label) => {
                const s = String(label || '');
                if (/VPD\s*>\s*1\.5/i.test(s)) return 1;
                if (/VPD\s*0\.5/i.test(s)) return 2;
                if (/VPD\s*<\s*0\.5/i.test(s)) return 3;
                if (/Precip|Lluvia/i.test(s)) return 10;
                if (/^ETo/i.test(s)) return 11;
                if (/^ETc/i.test(s)) return 12;
                return 20;
              };
              return rank(a.dataset.label) - rank(b.dataset.label);
            }
          }
        }
      }
    });
  }

  function renderToggles() {
    const labels = { vpdHours: 'Horas VPD', rain: 'Lluvia', et0: 'ETo', etc: 'ETc' };
    $('agro-chart-toggles').innerHTML = Object.keys(labels).map((key) =>
      `<button type="button" class="agro-chart-toggle series-${key}${visible[key] ? '' : ' off'}" data-series="${key}">${labels[key]}</button>`).join('');
  }

  function render() {
    if (!rows.length) return;
    const future = rows.filter((r) => r.kind === 'forecast');
    $('agro-summary-grid').innerHTML = summaryHtml(future);
    $('agro-mobile-days').innerHTML = '';
    syncKcBar();
    const chartNote = $('agro-chart-note');
    if (chartNote) {
      const kcTxt = activeKc() == null
        ? 'ETc pendiente de Kc.'
        : `ETc con Kc ${Number(activeKc()).toFixed(2)} (ETo × Kc).`;
      chartNote.innerHTML =
        `<strong>Eje izquierdo (azul):</strong> horas VPD de las barras (total 24 h/día). ` +
        `<strong>Eje derecho (verde):</strong> mm de las líneas (lluvia, ETo y ETc). ` +
        `Rangos VPD: azul &lt;0.5, verde 0.5–1.5, tinto &gt;1.5. ${kcTxt}`;
    }
    $('agro-table-wrap').innerHTML = tableHtml();
    $('agro-table-wrap').classList.add('open');
    syncTableScrollHint();
    $('agro-results').hidden = false;
    $('agro-empty-note').hidden = true;
    $('agro-register-cta').hidden = personal;
    $('agro-personal-actions').hidden = !personal;
    syncUnsubscribeLink();
    $('agro-report-meta').hidden = !personal;
    if (personal) {
      const when = lastReadingAt ? formatReadingAt(lastReadingAt) : '';
      $('agro-report-meta').innerHTML = `<strong>${esc(report?.plot_name || 'Predio')}</strong>${when ? `<br>Última lectura: ${esc(when)}` : ''}${report?.request_code ? `<br>Folio ${esc(report.request_code)}` : ''}`;
    }
    renderToggles();
    requestAnimationFrame(() => {
      drawChart();
      syncTableScrollHint();
      setTimeout(() => {
        syncTableScrollHint();
        sendResize();
      }, 120);
    });
  }

  function syncTableScrollHint() {
    const wrap = $('agro-table-wrap');
    const hint = $('agro-table-scroll-hint');
    if (!wrap || !hint) return;
    const overflow = wrap.scrollWidth > wrap.clientWidth + 4;
    hint.hidden = !overflow;
    const leftBtn = hint.querySelector('[data-scroll-dir="-1"]');
    const rightBtn = hint.querySelector('[data-scroll-dir="1"]');
    const max = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
    if (leftBtn) leftBtn.disabled = wrap.scrollLeft <= 2;
    if (rightBtn) rightBtn.disabled = wrap.scrollLeft >= max - 2;
  }

  function kcModal(target) {
    kcModalTarget = target === 'view' ? 'view' : 'location';
    $('agro-kc-modal').hidden = false;
    renderKc('');
  }

  function renderKc(filter) {
    const query = String(filter || '').toLocaleLowerCase('es');
    const data = (window.FAO_KC_REFERENCE || []).filter((x) => `${x.crop} ${x.stage}`.toLocaleLowerCase('es').includes(query));
    $('agro-kc-list').innerHTML = data.length ? data.map((x) => {
      const suggested = round((Number(x.kcMin) + Number(x.kcMax)) / 2, 2);
      return `<div class="agro-kc-row"><b>${esc(x.crop)}</b><span>${esc(x.stage)}</span><strong>${x.kcMin}–${x.kcMax}</strong><button type="button" class="agro-btn ghost" data-kc="${suggested}" data-crop="${esc(x.crop)}" data-range="${esc(`${x.kcMin}–${x.kcMax}`)}" data-stage="${esc(x.stage)}">Usar ${suggested}</button></div>`;
    }).join('') : '<p>No se encontraron coincidencias.</p>';
  }

  function openRegister() {
    const c = coords() || { lat: report?.latitude, lng: report?.longitude };
    const form = $('agro-register-form');
    form.elements.plot_name.value = $('agro-plot-name').value || report?.plot_name || '';
    form.elements.latitude.value = c?.lat ?? '';
    form.elements.longitude.value = c?.lng ?? '';
    form.elements.kc.value = activeKc() ?? report?.kc ?? '';
    $('agro-register-success').hidden = true;
    form.hidden = false;
    $('agro-register-modal').hidden = false;
  }

  async function register(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.phone_country_code === 'other') {
      let custom = String(data.phone_country_code_other || '').trim();
      if (!custom.startsWith('+')) custom = `+${custom.replace(/[^\d]/g, '')}`;
      if (!/^\+\d{1,4}$/.test(custom)) {
        setStatus('Escribe una lada válida, por ejemplo +212.', 'error', true);
        return;
      }
      data.phone_country_code = custom;
    }
    delete data.phone_country_code_other;
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
      report = { plot_name: 'Predio demostrativo', kc: .9, request_code: 'K7M2', latitude: 19.4326, longitude: -99.1332, full_name: 'Demo' };
      savedKc = .9;
      viewKc = .9;
      referenceKcLabel = 'Referencia demo · 0.90';
      return render();
    }
    try {
      const response = await fetch(`${API}?action=report&token=${encodeURIComponent(token)}`);
      const out = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(out.message || 'El enlace no está disponible.');
      report = out.subscriber || {};
      rows = out.rows || [];
      timezone = report.timezone || '';
      savedKc = n(report.kc);
      viewKc = savedKc;
      if (report.crop || report.crop_stage) {
        referenceKcLabel = [report.crop, report.crop_stage].filter(Boolean).join(' · ');
      }
      $('agro-plot-name').value = report.plot_name || '';
      $('agro-lat').value = report.latitude ?? '';
      $('agro-lng').value = report.longitude ?? '';
      if ((!rows.length || rows.some((r) => r.vpdHoursLow == null)) && report.latitude != null) {
        const weather = await fetch(weatherUrl(report.latitude, report.longitude)).then((r) => r.json());
        rows = weatherRows(weather, activeKc());
        markReadingNow();
      } else if (rows.length) {
        applyEtcWithKc(activeKc());
        if (!lastReadingAt) markReadingNow();
      }
      render();
      if (lastReadingAt) setStatus(readingStatusText(), 'success');
    } catch (error) {
      $('agro-empty-note').innerHTML = `<strong>No se pudo abrir el reporte.</strong><span>${esc(error.message)}</span>`;
    }
  }

  function unsubscribeWhatsAppHref() {
    const folio = report?.request_code ? ` Folio ${report.request_code}.` : '';
    const name = report?.full_name || '';
    const message = `Hola NutriPlant. Quiero dejar de recibir las alertas agroclimáticas.${folio}${name ? ` Nombre: ${name}.` : ''} Por favor páusenme desde administración.`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
  }

  function syncUnsubscribeLink() {
    const btn = $('agro-unsubscribe-btn');
    if (!btn) return;
    const fromEmailLink = !!token;
    btn.hidden = !fromEmailLink;
    btn.style.display = fromEmailLink ? '' : 'none';
    if (!fromEmailLink) return;
    btn.href = unsubscribeWhatsAppHref();
  }

  function sendResize() {
    if (!embed || window.parent === window) return;
    window.parent.postMessage({ type: 'np-free-tool-resize', height: Math.ceil(document.documentElement.scrollHeight) }, '*');
  }

  function bind() {
    $('agro-geolocate-btn').addEventListener('click', geolocate);
    $('agro-generate-btn').addEventListener('click', generate);
    $('agro-kc-view-ref-btn').addEventListener('click', () => kcModal('view'));
    $('agro-kc-view-apply-btn').addEventListener('click', applyViewKc);
    $('agro-kc-view').addEventListener('change', applyViewKc);
    $('agro-kc-view').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyViewKc();
      }
    });
    $('agro-kc-search').addEventListener('input', (e) => renderKc(e.target.value));
    $('agro-kc-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-kc]');
      if (!btn) return;
      const picked = n(btn.dataset.kc);
      const label = `${btn.dataset.crop || ''} · ${btn.dataset.stage || ''} · ref ${btn.dataset.range || picked}`;
      if (kcModalTarget === 'view') {
        viewKc = picked;
        referenceKcLabel = label;
        $('agro-kc-view').value = picked == null ? '' : picked;
        if (!personal) savedKc = picked;
        applyEtcWithKc(activeKc());
        render();
        if (!personal) saveInputs();
      }
      $('agro-kc-modal').hidden = true;
    });
    document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => $(btn.dataset.closeModal).hidden = true));
    document.querySelectorAll('.agro-modal').forEach((modal) => modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; }));
    $('agro-open-register-btn').addEventListener('click', openRegister);
    $('agro-register-form').addEventListener('submit', register);
    const phoneCode = $('agro-phone-code');
    const phoneOther = $('agro-phone-code-other');
    if (phoneCode && phoneOther) {
      phoneCode.addEventListener('change', () => {
        const other = phoneCode.value === 'other';
        phoneOther.hidden = !other;
        phoneOther.required = other;
        if (!other) phoneOther.value = '';
      });
    }
    $('agro-table-toggle').addEventListener('click', () => {
      $('agro-table-wrap').classList.toggle('open');
      $('agro-table-toggle').textContent = $('agro-table-wrap').classList.contains('open') ? 'Ocultar tabla completa' : 'Ver tabla completa';
      syncTableScrollHint();
    });
    const tableWrap = $('agro-table-wrap');
    const scrollHint = $('agro-table-scroll-hint');
    if (tableWrap) {
      tableWrap.addEventListener('scroll', syncTableScrollHint, { passive: true });
    }
    if (scrollHint) {
      scrollHint.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-scroll-dir]');
        if (!btn || !tableWrap) return;
        tableWrap.scrollBy({ left: Number(btn.dataset.scrollDir) * Math.max(180, Math.floor(tableWrap.clientWidth * 0.7)), behavior: 'smooth' });
      });
    }
    window.addEventListener('resize', () => {
      syncTableScrollHint();
      if (map) map.invalidateSize();
      sendResize();
    });
    $('agro-chart-toggles').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-series]');
      if (!btn) return;
      visible[btn.dataset.series] = !visible[btn.dataset.series];
      renderToggles();
      drawChart();
    });
    $('agro-pdf-btn').addEventListener('click', () => window.print());
    $('agro-unsubscribe-btn')?.addEventListener('click', (e) => {
      if (!token) {
        e.preventDefault();
        return;
      }
      syncUnsubscribeLink();
      if (!confirm('Se abrirá WhatsApp para pedir que pausemos tus alertas. ¿Continuar?')) {
        e.preventDefault();
      }
    });
    $('agro-edit-btn').addEventListener('click', () => {
      $('agro-location-card').hidden = false;
      $('agro-generate-btn').textContent = personal
        ? '🌤️ Ver pronóstico en este punto (no guarda)'
        : '💾 Guardar ubicación y actualizar';
      if (personal) {
        setStatus('Puedes mover el marcador para explorar. Kc y coordenadas guardadas se cambian por WhatsApp.', '');
      }
      initMap(true);
      [80, 250, 600].forEach((ms) => setTimeout(() => map?.invalidateSize(), ms));
      $('agro-location-card').scrollIntoView({ behavior: 'smooth' });
    });
    ['agro-lat', 'agro-lng', 'agro-plot-name'].forEach((id) => $(id).addEventListener('change', () => {
      saveInputs();
    }));
  }

  function bindAboutModal() {
    const modal = $('agro-about-modal');
    const openBtn = $('agro-about-btn');
    const closeBtn = $('agro-about-close');
    if (!modal || !openBtn) return;
    const open = () => { modal.classList.add('show'); modal.style.display = 'flex'; };
    const close = () => { modal.classList.remove('show'); modal.style.display = 'none'; };
    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) close();
    });
  }

  function init() {
    setMode();
    bind();
    bindAboutModal();
    if (personal) loadReport();
    else {
      initMap();
      restoreLastReading();
    }
    sendResize();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
