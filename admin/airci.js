/**
 * AirCI F0 — shell admin: gate PIN + metadatos editables (local).
 */
(function () {
  'use strict';

  var META_KEY = 'airci_site_meta_v1';
  var OWNER_EMAIL = 'admin@nutriplantpro.com';
  var SESSION_MAX_MS = 12 * 60 * 60 * 1000;

  var gateEl = document.getElementById('aciGate');
  var appEl = document.getElementById('aciApp');
  var errEl = document.getElementById('aciGateError');
  var pinForm = document.getElementById('aciPinForm');
  var pinInput = document.getElementById('aciPinInput');
  var saveHint = document.getElementById('aciSaveHint');
  var saveTimer = null;

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.classList.toggle('is-visible', !!msg);
  }

  function hasAdminSession() {
    try {
      if (localStorage.getItem('admin_logged_in') !== 'true') return false;
      var user = String(localStorage.getItem('admin_username') || '').trim().toLowerCase();
      if (user && user !== OWNER_EMAIL) return false;
      var ts = parseInt(localStorage.getItem('admin_session_timestamp') || '0', 10);
      if (ts && Date.now() - ts > SESSION_MAX_MS) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function showApp() {
    if (gateEl) gateEl.hidden = true;
    if (appEl) appEl.hidden = false;
    loadMeta();
  }

  function showGate(message) {
    if (gateEl) gateEl.hidden = false;
    if (appEl) appEl.hidden = true;
    if (message) showError(message);
    if (pinInput) {
      pinInput.value = '';
      setTimeout(function () {
        pinInput.focus();
      }, 60);
    }
  }

  function defaultMeta() {
    return {
      title: '',
      agricola: '',
      predio: '',
      cultivo: '',
      variedad: '',
      edad: '',
      nota: ''
    };
  }

  function loadMeta() {
    var data = defaultMeta();
    try {
      var raw = localStorage.getItem(META_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.keys(data).forEach(function (k) {
            if (parsed[k] != null) data[k] = String(parsed[k]);
          });
        }
      }
    } catch (e) {}

    document.querySelectorAll('[data-meta]').forEach(function (el) {
      var key = el.getAttribute('data-meta');
      if (!key) return;
      el.value = data[key] || '';
    });
  }

  function collectMeta() {
    var data = defaultMeta();
    document.querySelectorAll('[data-meta]').forEach(function (el) {
      var key = el.getAttribute('data-meta');
      if (!key) return;
      data[key] = String(el.value || '').trim();
    });
    return data;
  }

  function persistMeta() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(collectMeta()));
      if (saveHint) {
        saveHint.textContent = 'Guardado en este dispositivo';
        saveHint.classList.add('is-ok');
      }
    } catch (e) {
      if (saveHint) {
        saveHint.textContent = 'No se pudo guardar (almacenamiento lleno o bloqueado)';
        saveHint.classList.remove('is-ok');
      }
    }
  }

  function scheduleSave() {
    if (saveHint) {
      saveHint.textContent = 'Guardando…';
      saveHint.classList.remove('is-ok');
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistMeta, 350);
  }

  async function ensureAccess() {
    if (!hasAdminSession()) {
      showGate('Entra primero desde el login como admin y elige AirCI.');
      if (pinForm) pinForm.style.display = 'none';
      return;
    }

    var pinApi = window.nutriplantAccessPin;
    if (!pinApi) {
      showApp();
      return;
    }

    var scope = pinApi.SCOPE_AIRCI || 'airci';
    var lock = pinApi.getClientLockout(scope);
    if (lock.locked) {
      showGate(
        'PIN bloqueado en este dispositivo. Espera ' +
          Math.ceil(lock.remainingMs / 60000) +
          ' min.'
      );
      return;
    }

    var required = await pinApi.isRequired(scope);
    if (!required) {
      // Sin PIN en Netlify: abrir panel (dev / aún no configurado)
      showApp();
      return;
    }

    if (await pinApi.hasValidAccess(scope)) {
      showApp();
      return;
    }

    showGate('');
  }

  if (pinInput) {
    pinInput.addEventListener('input', function () {
      this.value = String(this.value || '').replace(/\D/g, '').slice(0, 4);
    });
  }

  if (pinForm) {
    pinForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var pinApi = window.nutriplantAccessPin;
      var pin = (pinInput && pinInput.value) || '';
      var btn = document.getElementById('aciPinSubmit');
      if (!hasAdminSession()) {
        showError('Sesión admin no válida. Vuelve al login y elige AirCI.');
        return;
      }
      if (!pinApi) {
        showApp();
        return;
      }
      if (btn) btn.disabled = true;
      showError('');
      var r = await pinApi.verifyPin(pinApi.SCOPE_AIRCI || 'airci', pin);
      if (btn) btn.disabled = false;
      if (!r.ok) {
        showError(r.error || 'PIN incorrecto.');
        return;
      }
      showApp();
    });
  }

  document.querySelectorAll('[data-meta]').forEach(function (el) {
    el.addEventListener('input', scheduleSave);
    el.addEventListener('change', scheduleSave);
  });

  ensureAccess();
})();
