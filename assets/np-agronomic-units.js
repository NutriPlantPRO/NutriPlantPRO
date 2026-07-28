/**
 * NutriPlant — adaptador de unidades para nutrición granular y enmiendas.
 *
 * Los valores de negocio se conservan en las unidades SI agronómicas
 * declaradas como canonical. Este módulo solo adapta entrada y presentación.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpAgronomicUnits = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var definitions = {
    dose_mass_area: { canonical: 'kg/ha', metric: 'kg/ha', us_customary: 'lb/acre', resultDigits: 2 },
    volume_area: { canonical: 'm3/ha', metric: 'm3/ha', us_customary: 'US gal/acre', resultDigits: 2 },
    water_depth: { canonical: 'mm', metric: 'mm', us_customary: 'in', resultDigits: 2 },
    yield_mass_area: { canonical: 't/ha', metric: 't/ha', us_customary: 'short ton/acre', resultDigits: 2 },
    extraction_mass_yield: { canonical: 'kg/t', metric: 'kg/t', us_customary: 'lb/short ton', resultDigits: 2 },
    depth: { canonical: 'cm', metric: 'cm', us_customary: 'in', resultDigits: 2 },
    bulk_density: { canonical: 'g/cm3', metric: 'g/cm3', us_customary: 'lb/ft3', resultDigits: 3 },
    temperature: { canonical: 'C', metric: 'C', us_customary: 'F', resultDigits: 2 },
    temperature_delta: { canonical: 'deltaC', metric: 'deltaC', us_customary: 'deltaF', resultDigits: 2 },
    volume: { canonical: 'm3', metric: 'L', us_customary: 'US gal', resultDigits: 2 },
    acid_dose_volume_volume: {
      canonical: 'mL/m3',
      metric: 'mL/m3',
      us_customary: 'US fl oz/1000 US gal',
      resultDigits: 2
    },
    speed: { canonical: 'km/h', metric: 'km/h', us_customary: 'mph', resultDigits: 2 },
    mass: { canonical: 'kg', metric: 'kg', us_customary: 'lb', resultDigits: 2 },
    area: { canonical: 'ha', metric: 'ha', us_customary: 'acre', resultDigits: 2 },
    distance: { canonical: 'km', metric: 'km', us_customary: 'mi', resultDigits: 2 },
    solubility: {
      canonical: 'g/L',
      metric: 'g/L',
      us_customary: 'lb/100 US gal',
      resultDigits: 2
    },
    emissions_area: {
      canonical: 'kg/ha',
      metric: 'kg/ha',
      us_customary: 'lb/acre',
      resultDigits: 2
    },
    carbon_intensity: {
      canonical: 'kg/kg',
      metric: 'kg/kg',
      us_customary: 'lb/lb',
      resultDigits: 3,
      identity: true
    }
  };

  var technical = {
    composition_pct: { unit: '%', reason: 'La composición porcentual es una propiedad técnica.' },
    'meq/100g': {
      unit: 'meq/100g',
      reason: 'meq/100g no puede convertirse a lb/acre sin profundidad y densidad aparente.'
    },
    meq_100g: {
      unit: 'meq/100g',
      reason: 'meq/100g no puede convertirse a lb/acre sin profundidad y densidad aparente.'
    },
    'cmol(+)/kg': { unit: 'cmol(+)/kg', reason: 'cmol(+)/kg es una propiedad técnica.' },
    cmol_kg: { unit: 'cmol(+)/kg', reason: 'cmol(+)/kg es una propiedad técnica.' },
    pH: { unit: 'pH', reason: 'pH es una escala técnica y no una dimensión convertible.' },
    ph: { unit: 'pH', reason: 'pH es una escala técnica y no una dimensión convertible.' },
    soil_ppm: {
      unit: 'ppm',
      reason: 'Una concentración de suelo no puede convertirse automáticamente en una dosis.'
    },
    ppm: {
      unit: 'ppm',
      reason: 'Una concentración de suelo no puede convertirse automáticamente en una dosis.'
    },
    cec: { unit: 'cmol(+)/kg', reason: 'La CIC es una propiedad técnica.' },
    cic: { unit: 'cmol(+)/kg', reason: 'La CIC es una propiedad técnica.' }
  };

  Object.keys(technical).forEach(function (kind) {
    technical[kind].technical = true;
    technical[kind].autoConvertible = false;
  });

  function unitsApi() {
    if (!w.NpUnits) throw new Error('NpUnits no está disponible');
    return w.NpUnits;
  }

  function getPrefs() {
    var value = w.NpPrefs && typeof w.NpPrefs.get === 'function'
      ? w.NpPrefs.get()
      : w.NP_PREFS_BOOTSTRAP;
    return {
      language: value && value.language === 'en' ? 'en' : 'es',
      unit_system: value && value.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (value && value.locale) || (value && value.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  function definition(kind) {
    if (technical[kind]) {
      throw new TypeError(technical[kind].reason + ' No se convierte automáticamente.');
    }
    if (!definitions[kind]) {
      throw new TypeError('Magnitud agronómica no soportada: ' + kind);
    }
    return definitions[kind];
  }

  function displayUnit(kind) {
    if (technical[kind]) return technical[kind].unit;
    var item = definition(kind);
    return item[getPrefs().unit_system];
  }

  function fromSI(value, kind) {
    var item = definition(kind);
    if (item.identity) return Number(value);
    return unitsApi().convert(Number(value), item.canonical, displayUnit(kind));
  }

  function toSI(value, kind) {
    var item = definition(kind);
    if (item.identity) return Number(value);
    return unitsApi().convert(Number(value), displayUnit(kind), item.canonical);
  }

  function formatNumber(value, digits) {
    var number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError('El valor debe ser un número finito');
    try {
      return new Intl.NumberFormat(getPrefs().locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
        useGrouping: false
      }).format(number);
    } catch (error) {
      return number.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    }
  }

  function formatInputFromSI(value, kind) {
    return formatNumber(fromSI(value, kind), 4);
  }

  function formatResultFromSI(value, kind) {
    var item = definition(kind);
    return unitsApi().formatQuantity(
      fromSI(value, kind),
      displayUnit(kind),
      getPrefs().locale,
      item.resultDigits
    );
  }

  function convert(value, fromKind, toKind) {
    var fromTechnical = technical[fromKind];
    if ((fromKind === 'concentration' || fromKind === 'concentration_mass_volume') &&
        (toKind === 'dose_mass_area' || toKind === 'lb/acre')) {
      throw new TypeError('Una concentración no puede convertirse automáticamente en una dosis.');
    }
    if (fromTechnical) {
      if (toKind === 'dose_mass_area' || toKind === 'lb/acre') {
        throw new TypeError(fromTechnical.reason);
      }
      throw new TypeError(fromTechnical.reason + ' No se convierte automáticamente.');
    }
    if (technical[toKind]) {
      throw new TypeError(technical[toKind].reason + ' No se convierte automáticamente.');
    }
    if (fromKind !== toKind) {
      throw new TypeError('No se convierte automáticamente entre dimensiones agronómicas distintas.');
    }
    return fromSI(toSI(value, fromKind), toKind);
  }

  return {
    definitions: definitions,
    technicalKinds: technical,
    getPrefs: getPrefs,
    unit: displayUnit,
    fromSI: fromSI,
    toSI: toSI,
    formatInputFromSI: formatInputFromSI,
    formatResultFromSI: formatResultFromSI,
    convert: convert
  };
});
