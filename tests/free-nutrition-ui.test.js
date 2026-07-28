'use strict';

var assert = require('assert');
var units = require('../assets/np-units-core.js');
global.NpUnits = units;

var agronomic = require('../assets/np-agronomic-units.js');
global.NpAgronomicUnits = agronomic;
var ui = require('../assets/np-free-nutrition-ui.js');

function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= (tolerance || 1e-9),
    actual + ' no está cerca de ' + expected);
}

function withSystem(system, fn) {
  var oldGet = global.NpPrefs && global.NpPrefs.get;
  var previous = oldGet ? oldGet() : { language: 'es', locale: 'es-MX' };
  global.NpPrefs.get = function () { return {
    language: previous.language,
    unit_system: system,
    locale: previous.locale
  }; };
  try { fn(); } finally { global.NpPrefs.get = oldGet; }
}

function withPrefs(next, fn) {
  var oldGet = global.NpPrefs && global.NpPrefs.get;
  global.NpPrefs.get = function () { return next; };
  try { fn(); } finally { global.NpPrefs.get = oldGet; }
}

module.exports = [
  {
    name: 'nutrición free: round-trip de dosis, masa y emisiones superficiales',
    run: function () {
      withSystem('us_customary', function () {
        ['dose_mass_area', 'mass', 'emissions_area'].forEach(function (kind) {
          var si = kind === 'mass' ? 125.75 : 220.5;
          close(ui.toSI(ui.fromSI(si, kind), kind), si, 1e-10);
        });
      });
    }
  },
  {
    name: 'nutrición free: profundidad y densidad conservan N mineralizable',
    run: function () {
      var p = 30;
      var density = 1.2;
      var nMetric = 10000 * (p / 100) * density * 1000 * 0.7 * 0.02 * 0.05 * 0.02;
      withSystem('us_customary', function () {
        var pRound = ui.toSI(ui.fromSI(p, 'depth'), 'depth');
        var dRound = ui.toSI(ui.fromSI(density, 'bulk_density'), 'bulk_density');
        var nUs = 10000 * (pRound / 100) * dRound * 1000 * 0.7 * 0.02 * 0.05 * 0.02;
        close(nUs, nMetric, 1e-10);
      });
    }
  },
  {
    name: 'nutrición free: C-F y solubilidad lb/100 US gal hacen round-trip',
    run: function () {
      withSystem('us_customary', function () {
        close(ui.fromSI(20, 'temperature'), 68, 1e-10);
        close(ui.toSI(68, 'temperature'), 20, 1e-10);
        close(ui.toSI(ui.fromSI(500, 'solubility'), 'solubility'), 500, 1e-10);
        close(ui.fromSI(1, 'solubility'), 0.8345404452, 1e-9);
      });
    }
  },
  {
    name: 'nutrición free: km-mi y L-US gal hacen round-trip',
    run: function () {
      withSystem('us_customary', function () {
        close(ui.toSI(ui.fromSI(9000, 'distance'), 'distance'), 9000, 1e-9);
        close(ui.toSI(ui.fromSI(250, 'volume'), 'volume'), 250, 1e-9);
      });
    }
  },
  {
    name: 'nutrición free: intensidad kg/kg equivale numéricamente a lb/lb',
    run: function () {
      withSystem('us_customary', function () {
        close(ui.fromSI(1.234, 'carbon_intensity'), 1.234);
        close(ui.toSI(1.234, 'carbon_intensity'), 1.234);
      });
    }
  },
  {
    name: 'nutrición free: suma por etapas conserva igualdad física',
    run: function () {
      var total = 180;
      var pct = [10, 30, 20, 30, 10];
      withSystem('us_customary', function () {
        var sumSI = pct.reduce(function (sum, part) {
          var stageSI = total * part / 100;
          return sum + ui.toSI(ui.fromSI(stageSI, 'dose_mass_area'), 'dose_mass_area');
        }, 0);
        close(sumSI, total, 1e-10);
      });
    }
  },
  {
    name: 'nutrición free: comparación carbono A/B conserva diferencia física',
    run: function () {
      var a = { manufacturing: 200, transport: 35, field: 80 };
      var b = { manufacturing: 160, transport: 45, field: 70 };
      var totalA = a.manufacturing + a.transport + a.field;
      var totalB = b.manufacturing + b.transport + b.field;
      withSystem('us_customary', function () {
        var shownDiff = ui.fromSI(totalB, 'mass') - ui.fromSI(totalA, 'mass');
        close(ui.toSI(shownDiff, 'mass'), totalB - totalA, 1e-10);
      });
    }
  },
  {
    name: 'nutrición free: cuatro combinaciones idioma-unidades son independientes',
    run: function () {
      ['es', 'en'].forEach(function (language) {
        ['metric', 'us_customary'].forEach(function (system) {
          withPrefs({ language: language, unit_system: system, locale: language === 'en' ? 'en-US' : 'es-MX' }, function () {
            assert.strictEqual(ui.prefs().language, language);
            assert.strictEqual(ui.prefs().unit_system, system);
            assert.strictEqual(ui.translate('Resultados'), language === 'en' ? 'Results' : 'Resultados');
            assert.strictEqual(ui.unit('dose_mass_area'), system === 'us_customary' ? 'lb/acre' : 'kg/ha');
          });
        });
      });
    }
  },
  {
    name: 'nutrición free: rechaza conversiones dimensionalmente inválidas',
    run: function () {
      assert.throws(function () {
        units.convert(1, 'g/L', 'lb/acre');
      }, /Dimensiones incompatibles/);
      assert.throws(function () {
        agronomic.convert(1, 'composition_pct', 'dose_mass_area');
      }, /propiedad técnica|concentración|convierte/i);
    }
  }
];
