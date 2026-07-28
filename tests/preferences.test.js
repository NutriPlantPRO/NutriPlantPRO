'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

function storage() {
  var values = Object.create(null);
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setItem: function (key, value) { values[key] = String(value); },
    removeItem: function (key) { delete values[key]; }
  };
}

function createPrefs(locale) {
  var listeners = {};
  var events = [];
  var fakeWindow = {
    navigator: { language: locale, languages: [locale] },
    localStorage: storage(),
    sessionStorage: storage(),
    CustomEvent: function (type, options) {
      this.type = type;
      this.detail = options.detail;
    },
    addEventListener: function (type, listener) { listeners[type] = listener; },
    dispatchEvent: function (event) { events.push(event); }
  };
  var source = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'np-prefs.js'),
    'utf8'
  );
  vm.runInNewContext(source, { window: fakeWindow, Intl: Intl, Promise: Promise });
  return { api: fakeWindow.NpPrefs, window: fakeWindow, events: events };
}

module.exports = [
  {
    name: 'preferencias: sugiere idioma y unidades desde navigator',
    run: function () {
      var prefs = createPrefs('en-US').api.get();
      assert.deepEqual(
        JSON.parse(JSON.stringify(prefs)),
        { language: 'en', unit_system: 'us_customary', locale: 'en-US' }
      );
    }
  },
  {
    name: 'preferencias: valida, persiste y marca cambios explícitos',
    run: function () {
      var loaded = createPrefs('es-MX');
      assert.throws(function () {
        loaded.api.set({ language: 'fr' }, { explicit: true });
      }, /Preferencia inválida/);
      loaded.api.set({ language: 'en' }, { explicit: true });
      assert.equal(loaded.api.get().language, 'en');
      assert.equal(loaded.api.wasTouched('language'), true);
      assert.equal(loaded.events[0].type, 'np:prefs-changed');
      loaded.api.clearTouched();
      assert.equal(loaded.api.wasTouched('language'), false);
    }
  },
  {
    name: 'preferencias: resolve respeta campos tocados en la sesión',
    run: function () {
      var loaded = createPrefs('es-MX');
      loaded.api.set({ language: 'en' }, { explicit: true });
      var resolved = loaded.api.resolve({
        language: 'es',
        unit_system: 'us_customary',
        locale: 'en-US'
      });
      assert.equal(resolved.language, 'en');
      assert.equal(resolved.unit_system, 'us_customary');
      assert.equal(resolved.locale, 'en-US');
    }
  },
  {
    name: 'preferencias: admite las cuatro combinaciones de idioma y unidades',
    run: function () {
      [
        ['es', 'metric'],
        ['en', 'metric'],
        ['en', 'us_customary'],
        ['es', 'us_customary']
      ].forEach(function (combination) {
        var loaded = createPrefs('es-MX');
        var saved = loaded.api.set({
          language: combination[0],
          unit_system: combination[1]
        }, { explicit: true });
        assert.equal(saved.language, combination[0]);
        assert.equal(saved.unit_system, combination[1]);
      });
    }
  },
  {
    name: 'preferencias: el perfil remoto gana cuando el login no se modifica',
    run: function () {
      var loaded = createPrefs('es-MX');
      var resolved = loaded.api.resolve({
        language: 'en',
        unit_system: 'us_customary',
        locale: 'en-US'
      });
      assert.deepEqual(
        JSON.parse(JSON.stringify(resolved)),
        { language: 'en', unit_system: 'us_customary', locale: 'en-US' }
      );
    }
  },
  {
    name: 'preferencias: syncAfterAuth actualiza el perfil remoto',
    run: async function () {
      var loaded = createPrefs('es-MX');
      loaded.api.set({ unit_system: 'us_customary' }, { explicit: true });
      var captured;
      var client = {
        from: function (table) {
          assert.equal(table, 'profiles');
          return {
            update: function (patch) {
              captured = patch;
              return {
                eq: function (field, value) {
                  assert.equal(field, 'id');
                  assert.equal(value, 'user-1');
                  return Promise.resolve({ error: null });
                }
              };
            }
          };
        }
      };
      var result = await loaded.api.syncAfterAuth(
        { language: 'es', unit_system: 'metric', locale: null },
        client,
        'user-1'
      );
      assert.equal(result.unit_system, 'us_customary');
      assert.equal(captured.unit_system, 'us_customary');
    }
  }
];
