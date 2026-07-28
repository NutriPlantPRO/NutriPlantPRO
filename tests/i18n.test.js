'use strict';

var assert = require('node:assert/strict');
var i18n = require('../assets/np-i18n.js');

module.exports = [
  {
    name: 'i18n: traduce el shell básico del dashboard',
    run: function () {
      i18n.setLanguage('en', { persist: false, apply: false });
      assert.equal(i18n.t('dashboard.home'), 'Home');
      assert.equal(i18n.t('dashboard.logout'), 'Sign out');
      assert.equal(i18n.t('dashboard.hydroponics'), 'Hydroponics');
      assert.equal(i18n.t('dashboard.new_project'), '+ New NutriPlant');
      i18n.setLanguage('es', { persist: false, apply: false });
      assert.equal(i18n.t('dashboard.home'), 'Inicio');
    }
  }
];
