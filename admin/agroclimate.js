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

  function actionButtons(r) {
    const buttons = [`<button class="aa-action" data-action="edit" data-id="${r.id}">Editar</button>`];
    if (r.status === 'pending_whatsapp') buttons.push(`<button class="aa-action warn" data-action="confirm" data-id="${r.id}">Confirmó WhatsApp</button>`);
    if (['pending_whatsapp', 'pending_review', 'paused'].includes(r.status)) buttons.push(`<button class="aa-action primary" data-action="approve" data-id="${r.id}">Aprobar y enviar</button>`);
    if (r.status === 'active') {
      buttons.push(`<button class="aa-action" data-action="send" data-id="${r.id}">Enviar ahora</button>`);
      buttons.push(`<button class="aa-action danger" data-action="pause" data-id="${r.id}">Pausar</button>`);
    }
    if (r.status === 'paused') buttons.push(`<button class="aa-action primary" data-action="activate" data-id="${r.id}">Reactivar</button>`);
    if (['pending_whatsapp', 'pending_review'].includes(r.status)) buttons.push(`<button class="aa-action danger" data-action="reject" data-id="${r.id}">Rechazar</button>`);
    const message = `Hola ${r.full_name}. Soy de NutriPlant y te escribo sobre tu solicitud de alertas agroclimáticas, folio ${r.request_code}.`;
    buttons.push(`<a class="aa-action" href="https://wa.me/${esc(String(r.phone_e164 || '').replace(/\D/g, ''))}?text=${encodeURIComponent(message)}" target="_blank">WhatsApp</a>`);
    return buttons.join('');
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

  function showEdit(id) {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    const p = plotOf(r) || {};
    const form = $('aa-edit-form');
    form.elements.subscriber_id.value = r.id;
    ['full_name','email','phone_country_code','phone_national','occupation','country','region','postal_code','crop','area_range','crop_stage','primary_use','decision_goal','admin_notes']
      .forEach((key) => { form.elements[key].value = r[key] ?? ''; });
    ['plot_name','kc','latitude','longitude','timezone'].forEach((key) => { form.elements[key].value = p[key] ?? ''; });
    $('aa-edit-title').textContent = `${r.request_code} · ${r.full_name}`;
    $('aa-edit-status').textContent = '';
    $('aa-edit-modal').hidden = false;
  }

  async function saveEdit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const subscriber = {};
    ['full_name','email','phone_country_code','phone_national','occupation','country','region','postal_code','crop','area_range','crop_stage','primary_use','decision_goal','admin_notes']
      .forEach((key) => { subscriber[key] = values[key]; });
    subscriber.phone_e164 = `${values.phone_country_code}${String(values.phone_national).replace(/\D/g, '')}`;
    const plot = {
      plot_name: values.plot_name,
      kc: values.kc === '' ? null : Number(values.kc),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      timezone: values.timezone || null
    };
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    $('aa-edit-status').textContent = 'Guardando…';
    try {
      await api('update', { subscriber_id: values.subscriber_id, subscriber, plot });
      $('aa-edit-modal').hidden = true;
      await load();
    } catch (error) {
      $('aa-edit-status').textContent = error.message;
      $('aa-edit-status').style.color = '#b91c1c';
    } finally { submit.disabled = false; }
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
    $('aa-search').addEventListener('input', applyFilters);
    $('aa-status').addEventListener('change', applyFilters);
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
    $('aa-table-body').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit') showEdit(btn.dataset.id);
      else runAction(btn.dataset.action, btn.dataset.id);
    });
    $('aa-edit-form').addEventListener('submit', saveEdit);
    $('[data-close]').addEventListener('click', () => { $('aa-edit-modal').hidden = true; });
    $('aa-edit-modal').addEventListener('click', (e) => { if (e.target === $('aa-edit-modal')) $('aa-edit-modal').hidden = true; });
    window.aaEditFromMap = showEdit;
  }

  if (!adminKey) location.replace('../login.html');
  else { bind(); load(); }
})();
