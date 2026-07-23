(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const adminKey = params.get('k') || '';
  const API = '/api/admin/agroclimate';
  let records = [];
  let filtered = [];
  let map;
  let layer;

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const dateTime = (v) => v ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—';
  const plotOf = (r) => Array.isArray(r.climate_alert_plots) ? r.climate_alert_plots[0] : r.climate_alert_plots;
  const statusLabel = {
    pending_whatsapp: 'Esperando WhatsApp', pending_review: 'Pendiente de revisión',
    active: 'Activo', paused: 'Pausado', rejected: 'Rechazado', unsubscribed: 'Baja'
  };

  function setStatus(text, error) {
    $('aa-status-line').textContent = text || '';
    $('aa-status-line').style.color = error ? '#b91c1c' : '';
  }

  async function api(action, data) {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_key: adminKey, ...(data || {}) })
    });
    const out = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(out.message || out.error || `HTTP ${response.status}`);
    return out;
  }

  function interestScore(r) {
    const p = plotOf(r) || {};
    let score = 0;
    if (r.whatsapp_confirmed_at || !['pending_whatsapp'].includes(r.status)) score += 25;
    if (String(r.decision_goal || '').length >= 40) score += 20;
    if (r.crop && r.crop_stage && r.primary_use && r.area_range) score += 15;
    if (Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))) score += 10;
    if (p.kc != null) score += 10;
    if (Number(r.report_access_count || 0) > 0) score += 10;
    if (r.whatsapp_consent) score += 10;
    return score;
  }

  function metric(label, value) {
    return `<article class="aa-metric"><small>${label}</small><strong>${value}</strong></article>`;
  }

  function renderMetrics() {
    const all = records;
    $('aa-metrics').innerHTML = [
      ['Total', all.length],
      ['Por revisar', all.filter((r) => ['pending_whatsapp', 'pending_review'].includes(r.status)).length],
      ['Activos', all.filter((r) => r.status === 'active').length],
      ['Pausados', all.filter((r) => r.status === 'paused').length],
      ['Entraron al reporte', all.filter((r) => Number(r.report_access_count || 0) > 0).length],
      ['Activos sin entrar', all.filter((r) => r.status === 'active' && !r.last_report_access_at).length]
    ].map((x) => metric(x[0], x[1])).join('');
  }

  function normalizePhoneParts(countryCode, national) {
    let code = String(countryCode || '').trim();
    if (!code.startsWith('+')) code = `+${code.replace(/[^\d]/g, '')}`;
    code = `+${code.replace(/[^\d]/g, '')}`;
    let local = String(national || '').replace(/\D/g, '').replace(/^0+/, '');
    const digitsCode = code.replace(/\D/g, '');
    if (digitsCode && local.startsWith(digitsCode) && local.length > digitsCode.length + 6) {
      local = local.slice(digitsCode.length);
    }
    const e164 = `${code}${local}`;
    const digits = e164.replace(/\D/g, '');
    const ok = /^\+\d{1,4}$/.test(code) && local.length >= 6 && local.length <= 15 && digits.length >= 8 && digits.length <= 15;
    return { code, local, e164, digits, ok };
  }

  function actionButtons(r) {
    const buttons = [`<button type="button" class="aa-action" data-action="edit" data-id="${r.id}" title="Editar registro">Editar</button>`];
    if (r.status === 'pending_whatsapp') buttons.push(`<button type="button" class="aa-action warn" data-action="confirm" data-id="${r.id}" title="Marcar WhatsApp recibido">WA ok</button>`);
    if (['pending_whatsapp', 'pending_review', 'paused'].includes(r.status)) buttons.push(`<button type="button" class="aa-action primary" data-action="approve" data-id="${r.id}" title="Aprobar y enviar primer correo">Aprobar</button>`);
    if (r.status === 'active') {
      buttons.push(`<button type="button" class="aa-action" data-action="send" data-id="${r.id}" title="Enviar reporte ahora">Enviar</button>`);
      buttons.push(`<button type="button" class="aa-action danger" data-action="pause" data-id="${r.id}" title="Pausar alertas">Pausar</button>`);
    }
    if (r.status === 'paused') buttons.push(`<button type="button" class="aa-action primary" data-action="activate" data-id="${r.id}" title="Reactivar alertas">Activar</button>`);
    if (['pending_whatsapp', 'pending_review'].includes(r.status)) buttons.push(`<button type="button" class="aa-action danger" data-action="reject" data-id="${r.id}" title="Rechazar solicitud">Rechazar</button>`);
    buttons.push(`<button type="button" class="aa-action aa-wa" data-action="whatsapp" data-id="${r.id}" title="Abrir WhatsApp">WA</button>`);
    return buttons.join('');
  }

  function openWhatsApp(id) {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    const phone = normalizePhoneParts(r.phone_country_code, r.phone_national || '');
    const fromE164 = String(r.phone_e164 || '').replace(/\D/g, '');
    const usable = phone.ok ? phone.digits : (fromE164.length >= 8 && fromE164.length <= 15 ? fromE164 : '');
    if (!usable) {
      alert('El WhatsApp está incompleto o mal escrito (lada/número). Corrígelo en la edición.');
      showEdit(id);
      return;
    }
    const message = `Hola ${r.full_name}. Soy de NutriPlant PRO y te escribo sobre tu solicitud de alertas agroclimáticas, folio ${r.request_code}.`;
    window.open(`https://wa.me/${usable}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  function renderTable() {
    $('aa-table-body').innerHTML = filtered.length ? filtered.map((r) => {
      const p = plotOf(r) || {};
      const score = interestScore(r);
      return `<tr>
        <td><span class="aa-cell-title">${esc(r.request_code)}</span><span class="aa-badge ${esc(r.status)}">${esc(statusLabel[r.status] || r.status)}</span></td>
        <td><span class="aa-cell-title">${esc(r.full_name)}</span><span class="aa-cell-sub">${esc(r.email)}<br>${esc(r.phone_e164)}<br>${esc(r.occupation)}</span></td>
        <td><span class="aa-cell-title">${esc(p.plot_name || '—')}</span><span class="aa-cell-sub">${esc(r.crop)} · ${esc(r.crop_stage)}<br>${esc(r.region)}, ${esc(r.country)}<br>${Number(p.latitude).toFixed(5)}, ${Number(p.longitude).toFixed(5)} · Kc ${p.kc ?? '—'}</span></td>
        <td><span class="aa-score ${score >= 75 ? 'high' : score >= 50 ? 'medium' : ''}">${score}</span><span class="aa-cell-sub">${esc(r.primary_use)}<br>${esc(String(r.decision_goal || '').slice(0, 90))}${String(r.decision_goal || '').length > 90 ? '…' : ''}</span></td>
        <td><span class="aa-cell-title">${Number(r.report_access_count || 0)}</span><span class="aa-cell-sub">Primero: ${dateTime(r.first_report_access_at)}<br>Último: ${dateTime(r.last_report_access_at)}</span></td>
        <td><span class="aa-cell-title">${dateTime(r.created_at)}</span><span class="aa-cell-sub">Aprobado: ${dateTime(r.approved_at)}<br>Zona: ${esc(p.timezone || 'por definir')}</span></td>
        <td><div class="aa-actions">${actionButtons(r)}</div></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7">No hay registros con estos filtros.</td></tr>';
  }

  function applyFilters() {
    const query = $('aa-search').value.trim().toLocaleLowerCase('es');
    const state = $('aa-status').value;
    filtered = records.filter((r) => {
      const p = plotOf(r) || {};
      const haystack = [r.request_code, r.full_name, r.email, r.phone_e164, r.crop, r.region, r.country, p.plot_name].join(' ').toLocaleLowerCase('es');
      return (!state || r.status === state) && (!query || haystack.includes(query));
    });
    renderTable();
    if (!$('aa-map-view').hidden) renderMap();
  }

  async function load() {
    setStatus('Consultando solicitudes…');
    try {
      const out = await api('list');
      records = out.subscribers || [];
      renderMetrics();
      applyFilters();
      setStatus(`${records.length} registros actualizados.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function normalizePlace(value) {
    return String(value || '')
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function guessTimezone(country, region, latitude, longitude) {
    const c = normalizePlace(country);
    const r = normalizePlace(region);
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (c.includes('mexico') || c === 'mx' || c.includes('méxico')) {
      if (/baja california$|tijuana|mexicali|ensenada/.test(r) && !/sur/.test(r)) return 'America/Tijuana';
      if (/baja california sur|la paz|los cabos/.test(r)) return 'America/Mazatlan';
      if (/sonora|hermosillo|obregon/.test(r)) return 'America/Hermosillo';
      if (/sinaloa|nayarit|durango|mazatlan/.test(r)) return 'America/Mazatlan';
      if (/quintana roo|cancun|cancún|playa del carmen|tulum|chetumal/.test(r)) return 'America/Cancun';
      if (/yucatan|yucatán|merida|mérida|campeche/.test(r)) return 'America/Merida';
      if (/nuevo leon|nuevo león|monterrey|coahuila|tamaulipas/.test(r)) return 'America/Monterrey';
      if (/chihuahua/.test(r)) return 'America/Chihuahua';
      return 'America/Mexico_City';
    }

    if (c.includes('estados unidos') || c.includes('united states') || c === 'usa' || c === 'us' || c.includes('ee.?uu')) {
      if (/florida|new york|georgia|carolina|virginia|massachusetts|pennsylvania|ohio|michigan|indiana|maine|jersey/.test(r)) return 'America/New_York';
      if (/texas|illinois|missouri|louisiana|alabama|mississippi|wisconsin|minnesota|iowa|kansas|oklahoma|arkansas|tennessee|kentucky/.test(r)) return 'America/Chicago';
      if (/colorado|utah|new mexico|montana|wyoming|idaho|arizona/.test(r) && !/phoenix/.test(r)) return 'America/Denver';
      if (/arizona|phoenix/.test(r)) return 'America/Phoenix';
      if (/california|washington|oregon|nevada|seattle|los angeles|san francisco/.test(r)) return 'America/Los_Angeles';
      if (Number.isFinite(lng)) {
        if (lng <= -115) return 'America/Los_Angeles';
        if (lng <= -102) return 'America/Denver';
        if (lng <= -87) return 'America/Chicago';
        return 'America/New_York';
      }
      return 'America/New_York';
    }

    const byCountry = [
      [['canada'], 'America/Toronto'],
      [['colombia'], 'America/Bogota'],
      [['peru', 'perú'], 'America/Lima'],
      [['ecuador'], 'America/Guayaquil'],
      [['chile'], 'America/Santiago'],
      [['argentina'], 'America/Argentina/Buenos_Aires'],
      [['brasil', 'brazil'], 'America/Sao_Paulo'],
      [['venezuela'], 'America/Caracas'],
      [['bolivia'], 'America/La_Paz'],
      [['paraguay'], 'America/Asuncion'],
      [['uruguay'], 'America/Montevideo'],
      [['guatemala'], 'America/Guatemala'],
      [['el salvador'], 'America/El_Salvador'],
      [['honduras'], 'America/Tegucigalpa'],
      [['nicaragua'], 'America/Managua'],
      [['costa rica'], 'America/Costa_Rica'],
      [['panama', 'panamá'], 'America/Panama'],
      [['cuba'], 'America/Havana'],
      [['republica dominicana', 'dominican'], 'America/Santo_Domingo'],
      [['puerto rico'], 'America/Puerto_Rico'],
      [['espana', 'españa', 'spain'], 'Europe/Madrid'],
      [['portugal'], 'Europe/Lisbon'],
      [['francia', 'france'], 'Europe/Paris'],
      [['italia', 'italy'], 'Europe/Rome'],
      [['alemania', 'germany'], 'Europe/Berlin'],
      [['reino unido', 'united kingdom', 'uk', 'inglaterra'], 'Europe/London'],
      [['paises bajos', 'países bajos', 'netherlands', 'holanda'], 'Europe/Amsterdam'],
      [['belgica', 'bélgica', 'belgium'], 'Europe/Brussels'],
      [['suiza', 'switzerland'], 'Europe/Zurich'],
      [['marruecos', 'morocco'], 'Africa/Casablanca'],
      [['argelia', 'algeria'], 'Africa/Algiers'],
      [['egipto', 'egypt'], 'Africa/Cairo'],
      [['sudafrica', 'sudáfrica', 'south africa'], 'Africa/Johannesburg'],
      [['nigeria'], 'Africa/Lagos'],
      [['kenia', 'kenya'], 'Africa/Nairobi'],
      [['costa de marfil', "cote d'ivoire", 'ivory coast'], 'Africa/Abidjan'],
      [['senegal'], 'Africa/Dakar']
    ];
    for (let i = 0; i < byCountry.length; i += 1) {
      if (byCountry[i][0].some((token) => c.includes(token))) return byCountry[i][1];
    }

    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      if (lng >= -120 && lng <= -85 && lat >= 14 && lat <= 33) return 'America/Mexico_City';
      if (lng >= -125 && lng <= -66 && lat >= 24 && lat <= 50) return 'America/New_York';
    }
    return '';
  }

  function ensureTimezoneOption(select, value) {
    if (!value) return;
    const exists = Array.from(select.options).some((opt) => opt.value === value);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    }
    select.value = value;
  }

  function refreshTimezoneSuggestion(force) {
    const form = $('aa-edit-form');
    if (!form) return;
    const select = form.elements.timezone;
    const hint = $('aa-timezone-hint');
    const guessed = guessTimezone(
      form.elements.country.value,
      form.elements.region.value,
      form.elements.latitude.value,
      form.elements.longitude.value
    );
    if (!guessed) {
      if (hint) hint.textContent = 'No se pudo inferir zona. Elige una de la lista.';
      return;
    }
    if (force || !select.value) {
      ensureTimezoneOption(select, guessed);
      if (hint) hint.textContent = `Sugerida por país/región: ${guessed}`;
    } else if (hint) {
      hint.textContent = select.value === guessed
        ? `Coincide con país/región: ${guessed}`
        : `País/región sugieren ${guessed}. Puedes dejar la actual.`;
    }
  }

  function showCreate() {
    const form = $('aa-edit-form');
    form.reset();
    form.elements.subscriber_id.value = '';
    form.elements.form_mode.value = 'create';
    form.elements.phone_country_code.value = '+52';
    form.elements.plot_name.value = 'Mi predio';
    form.elements.initial_status.value = 'pending_review';
    form.elements.timezone.value = '';
    $('aa-status-field').hidden = false;
    $('aa-delete-btn').hidden = true;
    $('aa-edit-kicker').textContent = 'Alta manual';
    $('aa-edit-title').textContent = 'Nuevo usuario de alertas';
    $('aa-edit-status').textContent = 'Se guardará directo en Supabase.';
    $('aa-edit-status').style.color = '';
    $('aa-timezone-hint').textContent = '';
    form.querySelector('[type="submit"]').textContent = 'Crear usuario';
    $('aa-edit-modal').hidden = false;
  }

  function showEdit(id) {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    const p = plotOf(r) || {};
    const form = $('aa-edit-form');
    form.elements.form_mode.value = 'edit';
    form.elements.subscriber_id.value = r.id;
    ['full_name','email','phone_country_code','phone_national','occupation','country','region','postal_code','crop','area_range','crop_stage','primary_use','decision_goal','admin_notes']
      .forEach((key) => { form.elements[key].value = r[key] ?? ''; });
    form.elements.plot_name.value = p.plot_name ?? 'Mi predio';
    form.elements.kc.value = p.kc == null ? '' : p.kc;
    form.elements.latitude.value = Number.isFinite(Number(p.latitude)) ? p.latitude : '';
    form.elements.longitude.value = Number.isFinite(Number(p.longitude)) ? p.longitude : '';
    ensureTimezoneOption(form.elements.timezone, p.timezone || '');
    if (!form.elements.timezone.value) refreshTimezoneSuggestion(true);
    else refreshTimezoneSuggestion(false);
    $('aa-status-field').hidden = true;
    $('aa-delete-btn').hidden = false;
    $('aa-edit-kicker').textContent = 'Edición administrativa';
    $('aa-edit-title').textContent = `${r.request_code} · ${r.full_name}`;
    $('aa-edit-status').textContent = '';
    $('aa-edit-status').style.color = '';
    form.querySelector('[type="submit"]').textContent = 'Guardar todos los cambios';
    $('aa-edit-modal').hidden = false;
  }

  async function saveEdit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const mode = form.elements.form_mode.value || 'edit';
    refreshTimezoneSuggestion(false);
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.timezone) {
      values.timezone = guessTimezone(values.country, values.region, values.latitude, values.longitude);
      ensureTimezoneOption(form.elements.timezone, values.timezone);
    }
    const phone = normalizePhoneParts(values.phone_country_code, values.phone_national);
    if (!phone.ok) {
      $('aa-edit-status').textContent = 'WhatsApp inválido. Revisa lada (+1, +52…) y número nacional.';
      $('aa-edit-status').style.color = '#b91c1c';
      return;
    }
    const subscriber = {};
    ['full_name','email','phone_country_code','phone_national','occupation','country','region','postal_code','crop','area_range','crop_stage','primary_use','decision_goal','admin_notes']
      .forEach((key) => { subscriber[key] = values[key]; });
    subscriber.phone_country_code = phone.code;
    subscriber.phone_national = phone.local;
    subscriber.phone_e164 = phone.e164;
    subscriber.email_consent = true;
    subscriber.whatsapp_consent = true;
    if (mode === 'create') subscriber.status = values.initial_status || 'pending_review';
    form.elements.phone_country_code.value = phone.code;
    form.elements.phone_national.value = phone.local;
    const plot = {
      plot_name: values.plot_name,
      kc: values.kc === '' ? null : Number(values.kc),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      timezone: values.timezone || null
    };
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    $('aa-edit-status').textContent = mode === 'create' ? 'Creando en Supabase…' : 'Guardando…';
    $('aa-edit-status').style.color = '';
    try {
      if (mode === 'create') {
        const out = await api('create', { subscriber, plot });
        $('aa-edit-modal').hidden = true;
        setStatus(`Usuario creado. Folio ${out.subscriber?.request_code || ''}.`);
      } else {
        await api('update', { subscriber_id: values.subscriber_id, subscriber, plot });
        $('aa-edit-modal').hidden = true;
        setStatus('Registro actualizado en Supabase.');
      }
      await load();
    } catch (error) {
      $('aa-edit-status').textContent = error.message;
      $('aa-edit-status').style.color = '#b91c1c';
    } finally { submit.disabled = false; }
  }

  async function deleteSubscriber() {
    const form = $('aa-edit-form');
    const id = form.elements.subscriber_id.value;
    const r = records.find((x) => x.id === id);
    if (!id || !r) return;
    const ok = confirm(
      `¿Borrar definitivamente a ${r.full_name} (folio ${r.request_code})?\n\n` +
      'Se eliminará también de Supabase: predio, tokens, reportes y entregas.'
    );
    if (!ok) return;
    const sure = prompt(`Para confirmar, escribe el folio exactamente: ${r.request_code}`);
    if (String(sure || '').trim().toUpperCase() !== String(r.request_code).toUpperCase()) {
      alert('Folio no coincide. No se borró nada.');
      return;
    }
    $('aa-edit-status').textContent = 'Borrando en Supabase…';
    $('aa-edit-status').style.color = '';
    try {
      await api('delete', { subscriber_id: id });
      $('aa-edit-modal').hidden = true;
      setStatus(`Usuario ${r.request_code} eliminado de Supabase.`);
      await load();
    } catch (error) {
      $('aa-edit-status').textContent = error.message;
      $('aa-edit-status').style.color = '#b91c1c';
    }
  }

  async function runAction(action, id) {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    const messages = {
      confirm: '¿Marcar que recibiste su mensaje de WhatsApp?',
      approve: '¿Aprobar, generar el primer reporte y enviarlo por correo ahora?',
      send: '¿Generar y enviar un nuevo reporte ahora?',
      pause: '¿Pausar sus correos semanales?',
      activate: '¿Reactivar sus correos semanales?',
      reject: '¿Rechazar esta solicitud?'
    };
    if (!confirm(messages[action] || '¿Continuar?')) return;
    setStatus(`Procesando ${r.request_code}…`);
    try {
      if (action === 'confirm') await api('status', { subscriber_id: id, status: 'pending_review' });
      if (action === 'approve') {
        const out = await api('approve', { subscriber_id: id });
        if (out.delivery && !out.delivery.ok) alert(`El usuario quedó activo, pero el correo falló: ${out.delivery.error}`);
      }
      if (action === 'send') await api('send_now', { subscriber_id: id, weekly: true });
      if (action === 'pause') await api('status', { subscriber_id: id, status: 'paused' });
      if (action === 'activate') await api('status', { subscriber_id: id, status: 'active' });
      if (action === 'reject') await api('status', { subscriber_id: id, status: 'rejected' });
      await load();
    } catch (error) {
      setStatus(error.message, true);
      alert(error.message);
    }
  }

  function renderMap() {
    if (!window.L) return;
    if (!map) {
      map = L.map('aa-map').setView([19.4326, -99.1332], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      layer = L.featureGroup().addTo(map);
    }
    layer.clearLayers();
    filtered.forEach((r) => {
      const p = plotOf(r);
      if (!p || !Number.isFinite(Number(p.latitude)) || !Number.isFinite(Number(p.longitude))) return;
      const marker = L.marker([p.latitude, p.longitude]).addTo(layer);
      marker.bindPopup(`<div class="aa-popup"><strong>${esc(p.plot_name || 'Predio')}</strong>${esc(r.full_name)} · ${esc(r.request_code)}<br>${esc(r.crop)} · ${esc(r.region)}, ${esc(r.country)}<br><span class="aa-badge ${esc(r.status)}">${esc(statusLabel[r.status] || r.status)}</span><button onclick="window.aaEditFromMap('${r.id}')">Ver y editar registro</button></div>`);
    });
    $('aa-map-count').textContent = `${layer.getLayers().length} predios visibles`;
    setTimeout(() => {
      map.invalidateSize();
      if (layer.getLayers().length) map.fitBounds(layer.getBounds().pad(.15), { maxZoom: 10 });
    }, 80);
  }

  function switchView(view) {
    $('aa-table-view').hidden = view !== 'table';
    $('aa-map-view').hidden = view !== 'map';
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'map') renderMap();
  }

  function bind() {
    $('aa-back').href = `./?k=${encodeURIComponent(adminKey)}`;
    $('aa-refresh').addEventListener('click', load);
    $('aa-add-user').addEventListener('click', showCreate);
    $('aa-search').addEventListener('input', applyFilters);
    $('aa-status').addEventListener('change', applyFilters);
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
    $('aa-table-body').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit') showEdit(btn.dataset.id);
      else if (btn.dataset.action === 'whatsapp') openWhatsApp(btn.dataset.id);
      else runAction(btn.dataset.action, btn.dataset.id);
    });
    $('aa-edit-form').addEventListener('submit', saveEdit);
    $('aa-delete-btn').addEventListener('click', deleteSubscriber);
    ['country', 'region', 'latitude', 'longitude'].forEach((name) => {
      const field = $('aa-edit-form').elements[name];
      if (field) field.addEventListener('change', () => refreshTimezoneSuggestion(true));
      if (field) field.addEventListener('blur', () => refreshTimezoneSuggestion(!field.form.elements.timezone.value));
    });
    $('aa-edit-close').addEventListener('click', () => { $('aa-edit-modal').hidden = true; });
    $('aa-edit-modal').addEventListener('click', (e) => { if (e.target === $('aa-edit-modal')) $('aa-edit-modal').hidden = true; });
    window.aaEditFromMap = showEdit;
  }

  if (!adminKey) location.replace('../login.html');
  else { bind(); load(); }
})();
