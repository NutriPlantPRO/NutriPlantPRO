/**
 * NutriPlant — conversiones dimensionales con valores canónicos SI.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (root) root.NpUnits = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var M2_PER_ACRE = 4046.8564224;
  var KG_PER_LB = 0.45359237;
  var M3_PER_US_GAL = 0.003785411784;

  var magnitudes = {
    mass: { canonical: 'kg', metric: 'kg', us_customary: 'lb' },
    area: { canonical: 'm2', metric: 'ha', us_customary: 'acre' },
    dose_mass_area: { canonical: 'kg/m2', metric: 'kg/ha', us_customary: 'lb/acre' },
    volume: { canonical: 'm3', metric: 'L', us_customary: 'US gal' },
    length: { canonical: 'm', metric: 'mm', us_customary: 'in' },
    temperature: { canonical: 'K', metric: 'C', us_customary: 'F' },
    concentration_mass_volume: {
      canonical: 'kg/m3',
      metric: 'g/L',
      us_customary: 'lb/1000 US gal'
    },
    composition_pct: { canonical: 'ratio', metric: '%', us_customary: '%' }
  };

  var units = {
    kg: { magnitude: 'mass', symbol: 'kg', factor: 1 },
    lb: { magnitude: 'mass', symbol: 'lb', factor: KG_PER_LB },
    m2: { magnitude: 'area', symbol: 'm²', factor: 1 },
    ha: { magnitude: 'area', symbol: 'ha', factor: 10000 },
    acre: { magnitude: 'area', symbol: 'acre', factor: M2_PER_ACRE },
    'kg/m2': { magnitude: 'dose_mass_area', symbol: 'kg/m²', factor: 1 },
    'kg/ha': { magnitude: 'dose_mass_area', symbol: 'kg/ha', factor: 1 / 10000 },
    'lb/acre': {
      magnitude: 'dose_mass_area',
      symbol: 'lb/acre',
      factor: KG_PER_LB / M2_PER_ACRE
    },
    m3: { magnitude: 'volume', symbol: 'm³', factor: 1 },
    L: { magnitude: 'volume', symbol: 'L', factor: 0.001 },
    'US gal': { magnitude: 'volume', symbol: 'US gal', factor: M3_PER_US_GAL },
    m: { magnitude: 'length', symbol: 'm', factor: 1 },
    mm: { magnitude: 'length', symbol: 'mm', factor: 0.001 },
    in: { magnitude: 'length', symbol: 'in', factor: 0.0254 },
    K: { magnitude: 'temperature', symbol: 'K', toCanonical: function (n) { return n; },
      fromCanonical: function (n) { return n; } },
    C: { magnitude: 'temperature', symbol: '°C',
      toCanonical: function (n) { return n + 273.15; },
      fromCanonical: function (n) { return n - 273.15; } },
    F: { magnitude: 'temperature', symbol: '°F',
      toCanonical: function (n) { return (n - 32) * 5 / 9 + 273.15; },
      fromCanonical: function (n) { return (n - 273.15) * 9 / 5 + 32; } },
    'kg/m3': { magnitude: 'concentration_mass_volume', symbol: 'kg/m³', factor: 1 },
    'g/L': { magnitude: 'concentration_mass_volume', symbol: 'g/L', factor: 1 },
    'lb/1000 US gal': {
      magnitude: 'concentration_mass_volume',
      symbol: 'lb/1000 US gal',
      factor: KG_PER_LB / (1000 * M3_PER_US_GAL)
    },
    ratio: { magnitude: 'composition_pct', symbol: '', factor: 1 },
    '%': { magnitude: 'composition_pct', symbol: '%', factor: 0.01 }
  };

  var aliases = {
    kg: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    lb: 'lb',
    lbs: 'lb',
    pound: 'lb',
    pounds: 'lb',
    m2: 'm2',
    'm²': 'm2',
    ha: 'ha',
    hectare: 'ha',
    hectares: 'ha',
    acre: 'acre',
    acres: 'acre',
    'kg/m2': 'kg/m2',
    'kg/m²': 'kg/m2',
    'kg/ha': 'kg/ha',
    'lb/acre': 'lb/acre',
    m3: 'm3',
    'm³': 'm3',
    l: 'L',
    liter: 'L',
    liters: 'L',
    litre: 'L',
    litres: 'L',
    'us gal': 'US gal',
    'gal us': 'US gal',
    'gal_us': 'US gal',
    'gal (us)': 'US gal',
    m: 'm',
    mm: 'mm',
    in: 'in',
    inch: 'in',
    inches: 'in',
    k: 'K',
    c: 'C',
    '°c': 'C',
    f: 'F',
    '°f': 'F',
    'kg/m3': 'kg/m3',
    'kg/m³': 'kg/m3',
    'g/l': 'g/L',
    'lb/1000 us gal': 'lb/1000 US gal',
    ratio: 'ratio',
    '%': '%',
    pct: '%'
  };

  function normalizeUnit(unit) {
    var input = String(unit == null ? '' : unit).trim();
    var lower = input.toLowerCase();
    if (lower === 'gal' || lower === 'gallon' || lower === 'gallons') {
      throw new TypeError('Galón ambiguo; usa "US gal". El galón UK no está soportado.');
    }
    if (/(^| )(uk|imperial)( |$)/i.test(input) || /gal(?:lons?)? uk/i.test(input)) {
      throw new TypeError('El galón UK no está soportado; usa "US gal".');
    }
    var id = aliases[lower];
    if (!id || !units[id]) throw new TypeError('Unidad no soportada: ' + input);
    return id;
  }

  function finiteValue(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError('El valor debe ser un número finito');
    return number;
  }

  function toCanonical(value, unit) {
    var id = normalizeUnit(unit);
    var definition = units[id];
    var number = finiteValue(value);
    return definition.toCanonical
      ? definition.toCanonical(number)
      : number * definition.factor;
  }

  function fromCanonical(value, unit) {
    var id = normalizeUnit(unit);
    var definition = units[id];
    var number = finiteValue(value);
    return definition.fromCanonical
      ? definition.fromCanonical(number)
      : number / definition.factor;
  }

  function convert(value, from, to) {
    var fromId = normalizeUnit(from);
    var toId = normalizeUnit(to);
    if (units[fromId].magnitude !== units[toId].magnitude) {
      throw new TypeError(
        'Dimensiones incompatibles: ' +
        units[fromId].magnitude + ' y ' + units[toId].magnitude
      );
    }
    return fromCanonical(toCanonical(value, fromId), toId);
  }

  function formatQuantity(value, unit, locale, precision) {
    var id = normalizeUnit(unit);
    var number = finiteValue(value);
    var digits = precision == null ? 2 : Number(precision);
    if (!Number.isInteger(digits) || digits < 0 || digits > 20) {
      throw new TypeError('La precisión debe ser un entero entre 0 y 20');
    }
    var formatted;
    try {
      formatted = new Intl.NumberFormat(locale || 'es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits
      }).format(number);
    } catch (e) {
      formatted = number.toFixed(digits);
    }
    return units[id].symbol ? formatted + ' ' + units[id].symbol : formatted;
  }

  function getUnitFor(magnitude, unitSystem) {
    if (!magnitudes[magnitude]) throw new TypeError('Magnitud no soportada: ' + magnitude);
    if (unitSystem !== 'metric' && unitSystem !== 'us_customary') {
      throw new TypeError('Sistema de unidades no soportado: ' + unitSystem);
    }
    return magnitudes[magnitude][unitSystem];
  }

  return {
    magnitudes: magnitudes,
    units: units,
    toCanonical: toCanonical,
    fromCanonical: fromCanonical,
    convert: convert,
    formatQuantity: formatQuantity,
    getUnitFor: getUnitFor
  };
});
