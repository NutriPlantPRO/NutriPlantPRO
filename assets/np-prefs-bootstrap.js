/**
 * NutriPlant — bootstrap síncrono de preferencias. Cargar en <head>.
 */
(function (w, d) {
  'use strict';
  var KEY = 'nutriplant_ui_prefs_v1';

  function validLocale(value) {
    return value === null ||
      (typeof value === 'string' &&
       value.length >= 2 &&
       value.length <= 35 &&
       /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value));
  }

  function valid(value) {
    return value &&
      !Array.isArray(value) &&
      typeof value === 'object' &&
      (value.language === 'es' || value.language === 'en') &&
      (value.unit_system === 'metric' || value.unit_system === 'us_customary') &&
      validLocale(value.locale);
  }

  function suggestion() {
    var locale = (w.navigator.languages && w.navigator.languages[0]) ||
      w.navigator.language || 'es-MX';
    if (!validLocale(locale)) locale = 'es-MX';
    var region = String(locale).split('-')[1];
    return {
      language: String(locale).toLowerCase().indexOf('en') === 0 ? 'en' : 'es',
      unit_system: /^(US|LR|MM)$/i.test(region || '') ? 'us_customary' : 'metric',
      locale: locale
    };
  }

  var prefs = null;
  try {
    prefs = JSON.parse(w.localStorage.getItem(KEY));
  } catch (e) {
    prefs = null;
  }
  if (!valid(prefs)) prefs = suggestion();

  var html = d.documentElement;
  html.lang = prefs.language;
  html.setAttribute('data-np-language', prefs.language);
  html.setAttribute('data-np-unit-system', prefs.unit_system);
  w.NP_PREFS_BOOTSTRAP = {
    language: prefs.language,
    unit_system: prefs.unit_system,
    locale: prefs.locale
  };
})(window, document);
