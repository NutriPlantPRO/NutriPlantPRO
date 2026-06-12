/**
 * Cliente PIN de acceso (Plan PRO / admin). Valida en servidor y guarda token en sessionStorage.
 */
(function (global) {
  'use strict';

  var API = '/api/nutriplant-access-pin';
  var STORAGE_PREFIX = 'np_access_pin_';
  var ATTEMPT_PREFIX = 'np_access_pin_attempts_';
  var MAX_ATTEMPTS = 5;
  var LOCKOUT_MS = 15 * 60 * 1000;

  function storageKey(scope) {
    return STORAGE_PREFIX + scope;
  }

  function attemptKey(scope) {
    return ATTEMPT_PREFIX + scope;
  }

  function getStored(scope) {
    try {
      var raw = sessionStorage.getItem(storageKey(scope));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearAccess(scope) {
    try {
      sessionStorage.removeItem(storageKey(scope));
    } catch (e) {}
    try {
      localStorage.removeItem(attemptKey(scope));
    } catch (e2) {}
  }

  function getClientLockout(scope) {
    try {
      var raw = localStorage.getItem(attemptKey(scope));
      if (!raw) return { locked: false, remainingMs: 0 };
      var data = JSON.parse(raw);
      if (data.until && Date.now() < data.until) {
        return { locked: true, remainingMs: data.until - Date.now() };
      }
      return { locked: false, remainingMs: 0 };
    } catch (e) {
      return { locked: false, remainingMs: 0 };
    }
  }

  function recordFailedAttempt(scope) {
    try {
      var raw = localStorage.getItem(attemptKey(scope));
      var data = raw ? JSON.parse(raw) : { count: 0 };
      data.count = (data.count || 0) + 1;
      if (data.count >= MAX_ATTEMPTS) {
        data.until = Date.now() + LOCKOUT_MS;
        data.count = 0;
      }
      localStorage.setItem(attemptKey(scope), JSON.stringify(data));
      return getClientLockout(scope);
    } catch (e) {
      return { locked: false, remainingMs: 0 };
    }
  }

  function clearAttempts(scope) {
    try {
      localStorage.removeItem(attemptKey(scope));
    } catch (e) {}
  }

  async function isRequired(scope) {
    try {
      var res = await fetch(
        API + '?scope=' + encodeURIComponent(scope) + '&action=required',
        { method: 'GET', credentials: 'same-origin' }
      );
      var data = await res.json().catch(function () {
        return {};
      });
      return !!(data && data.required);
    } catch (e) {
      return false;
    }
  }

  async function hasValidAccess(scope) {
    var lock = getClientLockout(scope);
    if (lock.locked) return false;
    var stored = getStored(scope);
    if (!stored || !stored.token) return false;
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      clearAccess(scope);
      return false;
    }
    try {
      var res = await fetch(
        API +
          '?scope=' +
          encodeURIComponent(scope) +
          '&token=' +
          encodeURIComponent(stored.token),
        { method: 'GET', credentials: 'same-origin' }
      );
      var data = await res.json().catch(function () {
        return {};
      });
      if (data && data.ok) return true;
      clearAccess(scope);
      return false;
    } catch (e) {
      return stored.expiresAt && Date.now() < stored.expiresAt;
    }
  }

  async function verifyPin(scope, pin) {
    var lock = getClientLockout(scope);
    if (lock.locked) {
      return {
        ok: false,
        error: 'Demasiados intentos. Espera ' + Math.ceil(lock.remainingMs / 60000) + ' min.'
      };
    }
    var digits = String(pin || '').trim();
    if (!/^\d{4}$/.test(digits)) {
      return { ok: false, error: 'El PIN debe ser 4 números.' };
    }
    try {
      var res = await fetch(API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: scope, pin: digits })
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok || !data.ok || !data.token) {
        var after = recordFailedAttempt(scope);
        if (after.locked) {
          return {
            ok: false,
            error: 'PIN incorrecto. Bloqueado ' + Math.ceil(LOCKOUT_MS / 60000) + ' min en este dispositivo.'
          };
        }
        var left = MAX_ATTEMPTS - (JSON.parse(localStorage.getItem(attemptKey(scope)) || '{}').count || 0);
        return {
          ok: false,
          error:
            data.error === 'pin_not_configured'
              ? 'PIN no configurado en el servidor.'
              : 'PIN incorrecto.' + (left > 0 ? ' Quedan ' + left + ' intento(s).' : '')
        };
      }
      clearAttempts(scope);
      try {
        sessionStorage.setItem(
          storageKey(scope),
          JSON.stringify({ token: data.token, expiresAt: data.expiresAt })
        );
      } catch (e) {}
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'No se pudo verificar el PIN. Revisa la conexión.' };
    }
  }

  global.nutriplantAccessPin = {
    SCOPE_PLAN_PRO: 'plan_pro',
    SCOPE_ADMIN: 'admin',
    isRequired: isRequired,
    hasValidAccess: hasValidAccess,
    verifyPin: verifyPin,
    clearAccess: clearAccess,
    getClientLockout: getClientLockout
  };
})(typeof window !== 'undefined' ? window : this);
