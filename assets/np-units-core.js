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
  var M3_PER_FT3 = 0.028316846592;
  var KG_PER_SHORT_TON = 907.18474;
  var ML_PER_US_FL_OZ = 29.5735295625;

  var magnitudes = {
    mass: { canonical: 'kg', metric: 'kg', us_customary: 'lb' },
    area: { canonical: 'm2', metric: 'ha', us_customary: 'acre' },
    dose_mass_area: { canonical: 'kg/m2', metric: 'kg/ha', us_customary: 'lb/acre' },
    volume_area: { canonical: 'm3/m2', metric: 'm3/ha', us_customary: 'US gal/acre' },
    water_depth: { canonical: 'm', metric: 'mm', us_customary: 'in' },
    yield_mass_area: {
      canonical: 'kg/m2',
      metric: 't/ha',
      us_customary: 'short ton/acre'
    },
    bulk_density: {
      canonical: 'kg/m3',
      metric: 'g/cm3',
      us_customary: 'lb/ft3'
    },
    volume: { canonical: 'm3', metric: 'L', us_customary: 'US gal' },
    length: { canonical: 'm', metric: 'mm', us_customary: 'in' },
    temperature: { canonical: 'K', metric: 'C', us_customary: 'F' },
    temperature_delta: { canonical: 'deltaC', metric: 'deltaC', us_customary: 'deltaF' },
    acid_dose_volume_volume: {
      canonical: 'mL/m3',
      metric: 'mL/m3',
      us_customary: 'US fl oz/1000 US gal'
    },
    speed: { canonical: 'm/s', metric: 'km/h', us_customary: 'mph' },
    distance: { canonical: 'm', metric: 'km', us_customary: 'mi' },
    concentration_mass_volume: {
      canonical: 'kg/m3',
      metric: 'g/L',
      us_customary: 'lb/1000 US gal'
    },
    composition_pct: {
      canonical: 'ratio',
      metric: '%',
      us_customary: '%',
      technical: true,
      autoConvertible: false
    },
    extraction_mass_yield: {
      canonical: 'kg/kg',
      metric: 'kg/t',
      us_customary: 'lb/short ton'
    },
    meq_100g: { canonical: 'meq/100g', technical: true, autoConvertible: false },
    cmol_kg: { canonical: 'cmol(+)/kg', technical: true, autoConvertible: false },
    ph: { canonical: 'pH', technical: true, autoConvertible: false },
    soil_ppm: { canonical: 'ppm', technical: true, autoConvertible: false },
    cec: { canonical: 'cmol(+)/kg', technical: true, autoConvertible: false }
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
    'm3/m2': { magnitude: 'volume_area', symbol: 'm³/m²', factor: 1 },
    'm3/ha': { magnitude: 'volume_area', symbol: 'm³/ha', factor: 1 / 10000 },
    'US gal/acre': {
      magnitude: 'volume_area',
      symbol: 'US gal/acre',
      factor: M3_PER_US_GAL / M2_PER_ACRE
    },
    't/ha': { magnitude: 'yield_mass_area', symbol: 't/ha', factor: 0.1 },
    'short ton/acre': {
      magnitude: 'yield_mass_area',
      symbol: 'short ton/acre',
      factor: KG_PER_SHORT_TON / M2_PER_ACRE
    },
    m3: { magnitude: 'volume', symbol: 'm³', factor: 1 },
    L: { magnitude: 'volume', symbol: 'L', factor: 0.001 },
    'US gal': { magnitude: 'volume', symbol: 'US gal', factor: M3_PER_US_GAL },
    'US fl oz': {
      magnitude: 'volume',
      symbol: 'US fl oz',
      factor: (ML_PER_US_FL_OZ / 1000000)
    },
    m: { magnitude: 'length', symbol: 'm', factor: 1 },
    mm: { magnitude: 'length', symbol: 'mm', factor: 0.001 },
    cm: { magnitude: 'length', symbol: 'cm', factor: 0.01 },
    in: { magnitude: 'length', symbol: 'in', factor: 0.0254 },
    ft: { magnitude: 'length', symbol: 'ft', factor: 0.3048 },
    'kg/kg': { magnitude: 'extraction_mass_yield', symbol: 'kg/kg', factor: 1 },
    'kg/t': { magnitude: 'extraction_mass_yield', symbol: 'kg/t', factor: 0.001 },
    'lb/short ton': {
      magnitude: 'extraction_mass_yield',
      symbol: 'lb/short ton',
      factor: KG_PER_LB / KG_PER_SHORT_TON
    },
    'g/cm3': { magnitude: 'bulk_density', symbol: 'g/cm³', factor: 1000 },
    'lb/ft3': {
      magnitude: 'bulk_density',
      symbol: 'lb/ft³',
      factor: KG_PER_LB / M3_PER_FT3
    },
    K: { magnitude: 'temperature', symbol: 'K', toCanonical: function (n) { return n; },
      fromCanonical: function (n) { return n; } },
    C: { magnitude: 'temperature', symbol: '°C',
      toCanonical: function (n) { return n + 273.15; },
      fromCanonical: function (n) { return n - 273.15; } },
    F: { magnitude: 'temperature', symbol: '°F',
      toCanonical: function (n) { return (n - 32) * 5 / 9 + 273.15; },
      fromCanonical: function (n) { return (n - 273.15) * 9 / 5 + 32; } },
    deltaC: { magnitude: 'temperature_delta', symbol: 'Δ°C', factor: 1 },
    deltaF: { magnitude: 'temperature_delta', symbol: 'Δ°F', factor: 5 / 9 },
    'mL/m3': {
      magnitude: 'acid_dose_volume_volume',
      symbol: 'mL/m³',
      factor: 0.000001
    },
    'US fl oz/1000 US gal': {
      magnitude: 'acid_dose_volume_volume',
      symbol: 'US fl oz/1,000 US gal',
      factor: (ML_PER_US_FL_OZ / 1000000) / (1000 * M3_PER_US_GAL)
    },
    'm/s': { magnitude: 'speed', symbol: 'm/s', factor: 1 },
    'km/h': { magnitude: 'speed', symbol: 'km/h', factor: 1 / 3.6 },
    mph: { magnitude: 'speed', symbol: 'mph', factor: 0.44704 },
    'kg/m3': { magnitude: 'concentration_mass_volume', symbol: 'kg/m³', factor: 1 },
    'g/L': { magnitude: 'concentration_mass_volume', symbol: 'g/L', factor: 1 },
    'lb/1000 US gal': {
      magnitude: 'concentration_mass_volume',
      symbol: 'lb/1000 US gal',
      factor: KG_PER_LB / (1000 * M3_PER_US_GAL)
    },
    'lb/100 US gal': {
      magnitude: 'concentration_mass_volume',
      symbol: 'lb/100 US gal',
      factor: KG_PER_LB / (100 * M3_PER_US_GAL)
    },
    km: { magnitude: 'distance', symbol: 'km', factor: 1000 },
    mi: { magnitude: 'distance', symbol: 'mi', factor: 1609.344 },
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
    'm3/m2': 'm3/m2',
    'm3/m²': 'm3/m2',
    'm3/ha': 'm3/ha',
    'm³/ha': 'm3/ha',
    'us gal/acre': 'US gal/acre',
    'gal_us/acre': 'US gal/acre',
    't/ha': 't/ha',
    'tonne/ha': 't/ha',
    'metric ton/ha': 't/ha',
    'short ton/acre': 'short ton/acre',
    'us ton/acre': 'short ton/acre',
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
    'us fl oz': 'US fl oz',
    'fl oz us': 'US fl oz',
    m: 'm',
    mm: 'mm',
    cm: 'cm',
    centimeter: 'cm',
    centimeters: 'cm',
    in: 'in',
    inch: 'in',
    inches: 'in',
    ft: 'ft',
    foot: 'ft',
    feet: 'ft',
    'kg/kg': 'kg/kg',
    'kg/t': 'kg/t',
    'kg/ton': 'kg/t',
    'lb/short ton': 'lb/short ton',
    'g/cm3': 'g/cm3',
    'g/cm³': 'g/cm3',
    'lb/ft3': 'lb/ft3',
    'lb/ft³': 'lb/ft3',
    k: 'K',
    c: 'C',
    '°c': 'C',
    f: 'F',
    '°f': 'F',
    deltac: 'deltaC',
    'delta°c': 'deltaC',
    'Δ°c': 'deltaC',
    deltaf: 'deltaF',
    'delta°f': 'deltaF',
    'Δ°f': 'deltaF',
    'ml/m3': 'mL/m3',
    'ml/m³': 'mL/m3',
    'us fl oz/1000 us gal': 'US fl oz/1000 US gal',
    'us fl oz/1,000 us gal': 'US fl oz/1000 US gal',
    'm/s': 'm/s',
    'km/h': 'km/h',
    kph: 'km/h',
    mph: 'mph',
    'kg/m3': 'kg/m3',
    'kg/m³': 'kg/m3',
    'g/l': 'g/L',
    'lb/1000 us gal': 'lb/1000 US gal',
    'lb/100 us gal': 'lb/100 US gal',
    km: 'km',
    kilometer: 'km',
    kilometers: 'km',
    kilometre: 'km',
    kilometres: 'km',
    mi: 'mi',
    mile: 'mi',
    miles: 'mi',
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
