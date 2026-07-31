/**
 * NutriPlant — adaptador de presentación para el piloto hidropónico.
 *
 * El estado y la persistencia permanecen en SI. Este módulo solo convierte
 * entradas/salidas inequívocas: volumen, masa, masa/volumen y tasa de
 * inyección. No acepta dosis por superficie y no convierte ppm, meq/L,
 * mmol/L, pH ni EC.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpHydroUnits = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  function unitsApi() {
    if (!w.NpUnits) throw new Error('NpUnits no está disponible');
    return w.NpUnits;
  }

  function prefs() {
    var value = w.NpPrefs && typeof w.NpPrefs.get === 'function'
      ? w.NpPrefs.get()
      : w.NP_PREFS_BOOTSTRAP;
    return {
      language: value && value.language === 'en' ? 'en' : 'es',
      unit_system: value && value.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (value && value.locale) || (value && value.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  /** Nombres descriptivos del catálogo hidrosoluble; abreviaturas y personalizados no se tocan. */
  function materialName(name, language) {
    if (w.NpFertigationUI && typeof w.NpFertigationUI.materialName === 'function') {
      return w.NpFertigationUI.materialName(name, language);
    }
    return name == null ? name : String(name);
  }

  function definition(kind, options) {
    var us = prefs().unit_system === 'us_customary';
    if (kind === 'water_volume') return { canonical: 'm3', display: us ? 'US gal' : 'm3' };
    if (kind === 'liquid_volume') return { canonical: 'm3', display: us ? 'US gal' : 'L' };
    if (kind === 'mass') return { canonical: 'kg', display: us ? 'lb' : 'kg' };
    if (kind === 'injection_rate') {
      return {
        canonical: 'L/m3',
        display: us ? 'US gal/1,000 US gal' : 'L/m3',
        identity: true
      };
    }
    if (kind === 'concentration') {
      return {
        canonical: 'kg/m3',
        display: us ? 'lb/1000 US gal' : ((options && options.metricUnit === 'kg/m3') ? 'kg/m3' : 'g/L')
      };
    }
    throw new TypeError('Magnitud hidropónica no soportada: ' + kind);
  }

  function fromSI(value, kind, options) {
    var d = definition(kind, options);
    if (d.identity) return Number(value);
    return unitsApi().convert(Number(value), d.canonical, d.display);
  }

  function toSI(value, kind, options) {
    var d = definition(kind, options);
    if (d.identity) return Number(value);
    return unitsApi().convert(Number(value), d.display, d.canonical);
  }

  function unit(kind, options) {
    return definition(kind, options).display;
  }

  function formatFromSI(value, kind, precision, options) {
    var d = definition(kind, options);
    return unitsApi().formatQuantity(fromSI(value, kind, options), d.display, prefs().locale, precision);
  }

  /**
   * Equivalencia explícita masa/volumen: ppm acuoso ≈ mg/L.
   * No cambia la unidad técnica mostrada como ppm y nunca produce lb/acre.
   */
  function ppmMassVolumeEquivalent(ppmValue, targetUnit) {
    if (targetUnit === 'lb/acre') {
      throw new TypeError('Una concentración masa/volumen no puede convertirse a lb/acre');
    }
    var kgM3 = Number(ppmValue) / 1000;
    return unitsApi().convert(kgM3, 'kg/m3', targetUnit || 'lb/1000 US gal');
  }

  return {
    getPrefs: prefs,
    fromSI: fromSI,
    toSI: toSI,
    unit: unit,
    formatFromSI: formatFromSI,
    ppmMassVolumeEquivalent: ppmMassVolumeEquivalent,
    materialName: materialName
  };
});
