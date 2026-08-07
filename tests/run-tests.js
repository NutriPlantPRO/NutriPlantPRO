'use strict';

var suites = [
  require('./preferences.test.js'),
  require('./units.test.js'),
  require('./agronomic-units.test.js'),
  require('./granular-ui.test.js'),
  require('./fertigation-ui.test.js'),
  require('./amendment-ui.test.js'),
  require('./hydro-units.test.js'),
  require('./hydro-solution-catalog.test.js'),
  require('./i18n.test.js'),
  require('./water-climate-ui.test.js'),
  require('./free-nutrition-ui.test.js')
];

(async function () {
  var passed = 0;
  var failed = 0;

  for (var i = 0; i < suites.length; i += 1) {
    for (var j = 0; j < suites[i].length; j += 1) {
      var test = suites[i][j];
      try {
        await test.run();
        passed += 1;
        console.log('✓ ' + test.name);
      } catch (error) {
        failed += 1;
        console.error('✗ ' + test.name);
        console.error(error && error.stack ? error.stack : error);
      }
    }
  }

  console.log('\n' + passed + ' aprobadas, ' + failed + ' fallidas');
  if (failed) process.exitCode = 1;
})();
