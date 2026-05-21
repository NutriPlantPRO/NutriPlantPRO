/**
 * Persistencia local (localStorage) para herramientas gratuitas / login.
 * Misma clave en pestaña, dashboard (iframe) y login: solo este navegador.
 */
(function (w) {
  'use strict';
  var PREFIX = 'nutriplant_free_';

  function save(toolId, data) {
    try {
      w.localStorage.setItem(PREFIX + toolId + '_v1', JSON.stringify({ u: Date.now(), d: data }));
    } catch (e) { /* quota / privado */ }
  }

  function load(toolId) {
    try {
      var raw = w.localStorage.getItem(PREFIX + toolId + '_v1');
      if (!raw) return null;
      var o = JSON.parse(raw);
      return o && o.d != null ? o.d : null;
    } catch (e) {
      return null;
    }
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, a); }, ms);
    };
  }

  function collectIds(ids) {
    var o = {};
    (ids || []).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') o[id] = el.checked;
      else o[id] = el.value;
    });
    return o;
  }

  function applyIds(data, ids) {
    if (!data || typeof data !== 'object') return;
    (ids || []).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || data[id] === undefined) return;
      if (el.type === 'checkbox') el.checked = !!data[id];
      else el.value = data[id];
    });
  }

  function applyRadio(name, value) {
    if (value == null) return;
    document.querySelectorAll('input[type="radio"][name="' + name + '"]').forEach(function (r) {
      r.checked = r.value === String(value);
    });
  }

  function getRadio(name) {
    var el = document.querySelector('input[type="radio"][name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  /** @param {string} toolId @param {function} getState @param {function} applyState @param {{delay?:number,root?:Node}} [opts] */
  function bind(toolId, getState, applyState, opts) {
    opts = opts || {};
    var loaded = load(toolId);
    if (loaded) {
      try { applyState(loaded); } catch (e) { /* estado corrupto */ }
    }
    var sched = debounce(function () { save(toolId, getState()); }, opts.delay || 350);
    var root = opts.root || document;
    root.addEventListener('input', sched, true);
    root.addEventListener('change', sched, true);
    w.addEventListener('beforeunload', function () { save(toolId, getState()); });
    return {
      saveNow: function () { save(toolId, getState()); },
      load: function () { return load(toolId); }
    };
  }

  w.NpFreePersist = {
    save: save,
    load: load,
    bind: bind,
    collectIds: collectIds,
    applyIds: applyIds,
    applyRadio: applyRadio,
    getRadio: getRadio,
    debounce: debounce
  };
})(window);
