/**
 * NutriPlant — preferencias de idioma, locale y sistema de unidades.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpPrefs = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var KEY = 'nutriplant_ui_prefs_v1';
  var TOUCHED_KEY = KEY + '_touched';
  var FIELDS = ['language', 'unit_system', 'locale'];

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function validLanguage(value) {
    return value === 'es' || value === 'en';
  }

  function validUnitSystem(value) {
    return value === 'metric' || value === 'us_customary';
  }

  function validLocale(value) {
    if (value === null) return true;
    if (typeof value !== 'string' || value.length < 2 || value.length > 35) return false;
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)) return false;
    try {
      if (typeof Intl !== 'undefined' && Intl.getCanonicalLocales) {
        return Intl.getCanonicalLocales(value).length === 1;
      }
    } catch (e) {
      return false;
    }
    return true;
  }

  function validateField(field, value) {
    if (field === 'language') return validLanguage(value);
    if (field === 'unit_system') return validUnitSystem(value);
    if (field === 'locale') return validLocale(value);
    return false;
  }

  function normalizeFull(value) {
    if (!isObject(value)) return null;
    if (!validLanguage(value.language) ||
        !validUnitSystem(value.unit_system) ||
        !validLocale(value.locale)) return null;
    return {
      language: value.language,
      unit_system: value.unit_system,
      locale: value.locale
    };
  }

  function navigatorLocale() {
    var nav = w.navigator || {};
    var candidate = nav.languages && nav.languages.length ? nav.languages[0] : nav.language;
    return validLocale(candidate) ? candidate : 'es-MX';
  }

  function suggest() {
    var locale = navigatorLocale();
    var language = String(locale).toLowerCase().indexOf('en') === 0 ? 'en' : 'es';
    var region = String(locale).split('-')[1];
    var usRegions = { US: true, LR: true, MM: true };
    return {
      language: language,
      unit_system: region && usRegions[String(region).toUpperCase()] ? 'us_customary' : 'metric',
      locale: locale
    };
  }

  function readStorage(storage, key) {
    try {
      var raw = storage && storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function readLocal() {
    return normalizeFull(readStorage(w.localStorage, KEY));
  }

  function saveLocal(prefs) {
    var normalized = normalizeFull(prefs);
    if (!normalized) throw new TypeError('Preferencias inválidas');
    try {
      if (w.localStorage) w.localStorage.setItem(KEY, JSON.stringify(normalized));
    } catch (e) {
      /* Safari privado, cuota o almacenamiento deshabilitado. */
    }
    return normalized;
  }

  function getTouched() {
    var stored = readStorage(w.sessionStorage, TOUCHED_KEY);
    var result = {};
    FIELDS.forEach(function (field) {
      if (stored && stored[field] === true) result[field] = true;
    });
    return result;
  }

  function saveTouched(touched) {
    try {
      if (w.sessionStorage) w.sessionStorage.setItem(TOUCHED_KEY, JSON.stringify(touched));
    } catch (e) {
      /* Almacenamiento no disponible. */
    }
  }

  function dispatch(prefs, changed, source) {
    if (!w || typeof w.dispatchEvent !== 'function') return;
    var detail = { prefs: prefs, changed: changed || [], source: source || 'local' };
    var event;
    try {
      event = new w.CustomEvent('np:prefs-changed', { detail: detail });
    } catch (e) {
      if (!w.document || !w.document.createEvent) return;
      event = w.document.createEvent('CustomEvent');
      event.initCustomEvent('np:prefs-changed', false, false, detail);
    }
    w.dispatchEvent(event);
  }

  function get() {
    return readLocal() || suggest();
  }

  function set(partial, options) {
    if (!isObject(partial)) throw new TypeError('Las preferencias deben ser un objeto');
    var keys = Object.keys(partial);
    if (!keys.length) throw new TypeError('No hay preferencias para guardar');
    keys.forEach(function (field) {
      if (FIELDS.indexOf(field) < 0 || !validateField(field, partial[field])) {
        throw new TypeError('Preferencia inválida: ' + field);
      }
    });

    var previous = get();
    var next = {
      language: previous.language,
      unit_system: previous.unit_system,
      locale: previous.locale
    };
    keys.forEach(function (field) { next[field] = partial[field]; });
    saveLocal(next);

    if (options && options.explicit) {
      var touched = getTouched();
      keys.forEach(function (field) { touched[field] = true; });
      saveTouched(touched);
    }

    var changed = keys.filter(function (field) { return previous[field] !== next[field]; });
    if (changed.length) dispatch(next, changed, options && options.explicit ? 'explicit' : 'local');
    return next;
  }

  function wasTouched(field) {
    if (FIELDS.indexOf(field) < 0) return false;
    return getTouched()[field] === true;
  }

  function clearTouched() {
    try {
      if (w.sessionStorage) w.sessionStorage.removeItem(TOUCHED_KEY);
    } catch (e) {
      /* Almacenamiento no disponible. */
    }
  }

  function profileValue(profile, field, fallback) {
    if (!isObject(profile) || wasTouched(field)) return fallback;
    if (field === 'locale' && profile[field] === null) return null;
    return validateField(field, profile[field]) ? profile[field] : fallback;
  }

  function resolve(profile) {
    var previous = get();
    var next = {
      language: profileValue(profile, 'language', previous.language),
      unit_system: profileValue(profile, 'unit_system', previous.unit_system),
      locale: profileValue(profile, 'locale', previous.locale)
    };
    saveLocal(next);
    var changed = FIELDS.filter(function (field) { return previous[field] !== next[field]; });
    if (changed.length) dispatch(next, changed, profile ? 'profile' : 'suggestion');
    return next;
  }

  function syncAfterAuth(profile, client, userId) {
    var resolved = resolve(profile);
    if (!client || !userId || typeof client.from !== 'function') {
      return Promise.resolve(resolved);
    }

    var needsUpdate = !isObject(profile) || FIELDS.some(function (field) {
      return profile[field] !== resolved[field];
    });
    if (!needsUpdate) return Promise.resolve(resolved);

    return Promise.resolve(
      client.from('profiles').update({
        language: resolved.language,
        unit_system: resolved.unit_system,
        locale: resolved.locale
      }).eq('id', userId)
    ).then(function (result) {
      if (result && result.error) throw result.error;
      return resolved;
    });
  }

  if (w && typeof w.addEventListener === 'function') {
    w.addEventListener('storage', function (event) {
      if (event && event.key === KEY) dispatch(get(), FIELDS.slice(), 'storage');
    });
  }

  return {
    KEY: KEY,
    get: get,
    set: set,
    resolve: resolve,
    wasTouched: wasTouched,
    clearTouched: clearTouched,
    syncAfterAuth: syncAfterAuth
  };
});
