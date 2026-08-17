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
  }
];
