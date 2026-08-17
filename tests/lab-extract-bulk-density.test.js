'use strict';

var assert = require('node:assert/strict');
var aliases = require('../netlify/functions/lib/soil-extract-aliases.js');

module.exports = [
  {
    name: 'extractor suelo: Dens. Aparente abreviado con nota al pie',
    run: function () {
      var fromLine = aliases.salvageBulkDensityFromText('¹Dens. Aparente    1.32    g/cm³');
      assert.equal(fromLine, '1.32');
      var fromOcr = aliases.salvageBulkDensityFromText('1Dens. Aparente 1.32 g/cm3');
      assert.equal(fromOcr, '1.32');
      var fromPlain = aliases.salvageBulkDensityFromText('Dens. aparente 1,32 g/cm³');
      assert.equal(fromPlain, '1.32');
    }
  },
  {
    name: 'extractor suelo: no toma el 1 de la nota al pie como densidad',
    run: function () {
      var resolved = aliases.resolveBulkDensity(
        { bulkDensity: '1' },
        { notes: '¹Dens. Aparente  1.32  g/cm³' },
        ''
      );
      assert.equal(resolved, '1.32');
    }
  },
  {
    name: 'extractor suelo: alias densAparente / DA en el JSON del modelo',
    run: function () {
      assert.equal(
        aliases.resolveBulkDensity({ densAparente: '1.32' }, {}, ''),
        '1.32'
      );
      assert.equal(
        aliases.resolveBulkDensity({ DA: '1.40' }, {}, ''),
        '1.40'
      );
    }
  },
  {
    name: 'extractor suelo: no toma cond. hidraulica ni % de la tabla fisica',
    run: function () {
      var table = [
        'Clase Textural Franco Arenoso',
        '1Punto de Saturacion 27.6 % Mod. Bajo',
        '1Capacidad de Campo 14.5 % Mod. Bajo',
        '1Punto March. Perm. 8.63 % Mod. Bajo',
        '1Cond. Hidraulica 9.00 cm/hr Muy Alto',
        '1Dens. Aparente 1.32 g/cm³'
      ].join('\n');
      assert.equal(aliases.salvageBulkDensityFromText(table), '1.32');
      assert.equal(
        aliases.resolveBulkDensity({ bulkDensity: '9.00' }, { notes: table }, ''),
        '1.32'
      );
    }
  },
  {
    name: 'extractor suelo: reconoce g/cm3, g/cc, Mg/m3, kg/m3 y peso volumetrico',
    run: function () {
      assert.equal(aliases.salvageBulkDensityFromText('Peso volumetrico 1.45 g/cc'), '1.45');
      assert.equal(aliases.salvageBulkDensityFromText('Densidad aparente 1.28 Mg/m³'), '1.28');
      assert.equal(aliases.salvageBulkDensityFromText('Bulk density 1320 kg/m3'), '1.32');
      assert.equal(aliases.salvageBulkDensityFromText('Dens. Ap. 1.18 g/cm3'), '1.18');
    }
  }
];
