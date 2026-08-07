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
      assert.equal(i18n.t('dashboard.recent_projects'), 'Recent projects');
      assert.equal(i18n.t('dashboard.edit_nutriplant'), 'Edit NUTRIPLANT');
      assert.equal(i18n.t('dashboard.active_project'), 'Active project:');
      assert.equal(i18n.t('dashboard.save_data'), '💾 Save Data');
      assert.equal(i18n.t('radar.tab_crop'), '🗺️ Crop Radar');
      assert.equal(i18n.t('radar.btn_generate'), '🛰 Generate / update Pilot');
      assert.equal(i18n.t('radar.save_field'), 'Save Field');
      assert.equal(
        i18n.t('analysis.depth_title'),
        'Depth of the soil layer considered in the analysis (e.g. 0-20 cm)'
      );
      assert.equal(i18n.t('analysis.reach_input_title'), '100 = entire layer; 50 = half');
      assert.equal(i18n.t('analysis.meta_title_simple'), 'Title');
      assert.equal(i18n.t('radar.vpd_hours_low_title'), 'Low VPD hours');
      assert.equal(i18n.t('profile.user_info_title'), 'User Information');
      assert.equal(i18n.t('free_tools.hydro_tab_design'), '1 · Target design');
      // Datos de usuario / títulos de proyecto no son claves i18n
      assert.equal(i18n.t('Aguacate Lote 3'), 'Aguacate Lote 3');
      assert.equal(i18n.t('Hola'), 'Hola');
      i18n.setLanguage('es', { persist: false, apply: false });
      assert.equal(i18n.t('dashboard.home'), 'Inicio');
      assert.equal(i18n.t('dashboard.active_project'), 'Proyecto Activo:');
      assert.equal(i18n.t('dashboard.recent_projects'), 'Proyectos recientes');
      assert.equal(i18n.t('profile.user_info_title'), 'Información de Usuario');
      assert.equal(i18n.t('free_tools.hydro_title'), '💧 Diseño de solución nutritiva');
      assert.equal(i18n.t('radar.tab_crop'), 'Radar del cultivo');
      assert.equal(
        i18n.t('analysis.depth_title'),
        'Profundidad de la capa de suelo considerada en el análisis (ej. 0-20 cm)'
      );
    }
  }
];
