/**
 * NutriPlant — UI compartida para agua, suelo y clima.
 * El DOM puede mostrar unidades elegidas; todos los valores expuestos por read()
 * y guardados por snapshot() permanecen en SI agronómico.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpWaterClimateUI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var fieldKinds = {};
  var canonicalValues = {};
  var lastUnitSystem = 'metric';
  var textOriginals = typeof WeakMap === 'function' ? new WeakMap() : null;
  var attrOriginals = typeof WeakMap === 'function' ? new WeakMap() : null;
  var observer = null;
  var refreshCallback = null;
  var unitSystemOverride = null;

  var definitions = {
    water_depth: { canonical: 'mm', metric: 'mm', us_customary: 'in' },
    volume_area: { canonical: 'm3/ha', metric: 'm3/ha', us_customary: 'US gal/acre' },
    temperature: { canonical: 'C', metric: 'C', us_customary: 'F' },
    temperature_delta: { canonical: 'deltaC', metric: 'deltaC', us_customary: 'deltaF' },
    depth: { canonical: 'cm', metric: 'cm', us_customary: 'in' },
    bulk_density: { canonical: 'g/cm3', metric: 'g/cm3', us_customary: 'lb/ft3' },
    area: { canonical: 'ha', metric: 'ha', us_customary: 'acre' },
    volume: { canonical: 'm3', metric: 'm3', us_customary: 'US gal' },
    speed: { canonical: 'km/h', metric: 'km/h', us_customary: 'mph' },
    acid_dose_volume_volume: {
      canonical: 'mL/m3',
      metric: 'mL/m3',
      us_customary: 'US fl oz/1000 US gal'
    }
  };

  var phrases = {
    'Lámina de riego y balance hídrico': 'Irrigation depth and water balance',
    'Agua en suelo y textura': 'Soil water and texture',
    'Estimador de déficit de presión de vapor': 'Vapor pressure deficit estimator',
    'Diagnóstico de agua y acondicionamiento': 'Water diagnosis and conditioning',
    'Ubicación del predio': 'Field location',
    'Clima en un punto (mapa o GPS)': 'Weather at a point (map or GPS)',
    'Mi ubicación': 'My location',
    'Obtener clima y calcular VPD': 'Get weather and calculate VPD',
    'Obtener clima y calcular': 'Get weather and calculate',
    'Latitud': 'Latitude',
    'Longitud': 'Longitude',
    'Unidad:': 'Unit:',
    'Periodo:': 'Period:',
    '1 día': '1 day',
    '7 días': '7 days',
    '30 días': '30 days',
    'Calculadora (1 o 7 días)': 'Calculator (1 or 7 days)',
    'Mis valores de agua (opcional)': 'My water values (optional)',
    'Usar mi ETo del periodo': 'Use my period ETo',
    'Usar mi lluvia': 'Use my rainfall',
    'Macrotúnel (lluvia = 0)': 'High tunnel (rainfall = 0)',
    'Acumulado del periodo': 'Period total',
    'Cultivo (opcional)': 'Crop (optional)',
    'Kc (editable)': 'Kc (editable)',
    'Sin precargar': 'No preset',
    'Riego en franja regada (periodo)': 'Irrigation in wetted strip (period)',
    'Volumen en franja': 'Strip volume',
    'Superficie del cultivo': 'Crop area',
    'Superficie regada': 'Irrigated area',
    'Franja humedecida': 'Wetted strip',
    'Raíces en superficie (% del área)': 'Surface root coverage (% of area)',
    'Sugerir franja regada': 'Suggest irrigated strip',
    'Referencia almacén suelo': 'Soil water storage reference',
    'Estimador ambiental simple': 'Simple environmental estimator',
    'Estimador avanzado': 'Advanced estimator',
    'Temperatura del Aire': 'Air Temperature',
    'Temperatura de Hoja': 'Leaf Temperature',
    'Humedad Relativa': 'Relative Humidity',
    'Modo de Cálculo:': 'Calculation Mode:',
    'Radiación Solar': 'Solar Radiation',
    'Calcular Déficit de Presión de Vapor': 'Calculate Vapor Pressure Deficit',
    'Calcular VPD': 'Calculate VPD',
    'Limpiar valores': 'Clear values',
    'Resultados:': 'Results:',
    'Déficit de Presión de Vapor': 'Vapor Pressure Deficit',
    'Déficit de Humedad': 'Humidity Deficit',
    'Rango Óptimo': 'Optimal Range',
    'Estado': 'Status',
    'Agua en suelo': 'Soil water',
    'Triángulo de textura': 'Soil texture triangle',
    'Cálculo y barra volumétrica': 'Calculation and volumetric bar',
    'Cargar valores de referencia': 'Load reference values',
    'Tus valores para el cálculo': 'Your calculation values',
    'Capacidad de campo': 'Field capacity',
    'Punto de marchitez': 'Wilting point',
    'Profundidad de suelo': 'Soil depth',
    'Área': 'Area',
    '% suelo explorado — superficie (franja)': '% explored soil — surface (strip)',
    'Humedad actual del suelo': 'Current soil moisture',
    'Resultados (actualizado al cambiar valores)': 'Results (updated when values change)',
    'Ayuda visual: saturación · CC · PMP': 'Visual guide: saturation · FC · PWP',
    'Punto de saturación': 'Saturation point',
    'Marchitez permanente': 'Permanent wilting point',
    'Todo el poro con agua': 'All pore space filled with water',
    'Arena': 'Sand',
    'Limo': 'Silt',
    'Arcilla': 'Clay',
    'Normalizar a 100%': 'Normalize to 100%',
    'Tamaño de partículas': 'Particle size',
    'Partícula': 'Particle',
    'Diámetro': 'Diameter',
    'Clasificación y valores de referencia': 'Classification and reference values',
    'Clasificación': 'Classification',
    'Blanda': 'Soft',
    'Moderadamente dura': 'Moderately hard',
    'Muy dura': 'Very hard',
    'Dura': 'Hard',
    'Dureza del agua (conversiones y rango)': 'Water hardness (conversions and range)',
    'Dureza por Ca + Mg': 'Hardness from Ca + Mg',
    'Dureza como CaCO₃': 'Hardness as CaCO₃',
    'Dureza total como CaCO₃ (resultado)': 'Total hardness as CaCO₃ (result)',
    'Calcio': 'Calcium',
    'Magnesio': 'Magnesium',
    'Ácido para neutralizar HCO₃⁻ y CO₃²⁻ (con colchón)': 'Acid to neutralize HCO₃⁻ and CO₃²⁻ (with residual buffer)',
    'Residual objetivo': 'Target residual',
    'Volumen de preparación': 'Preparation volume',
    'Ácido': 'Acid',
    'Ácido Nítrico': 'Nitric Acid',
    'Ácido Sulfúrico': 'Sulfuric Acid',
    'Ácido Fosfórico': 'Phosphoric Acid',
    'Resultado con': 'Result with',
    'Dosis': 'Dose',
    'Volumen usado': 'Volume used',
    'Equivale a': 'Equivalent to',
    'solo referencia': 'reference only',
    'Referencia técnica': 'Technical reference',
    'Foco técnico:': 'Technical focus:',
    'valida en campo': 'validate in the field',
    'validar en campo': 'validate in the field',
    'Ubicación aplicada.': 'Location set.',
    'Consultando clima': 'Fetching weather',
    'Clima cargado.': 'Weather loaded.',
    'No se pudo obtener clima.': 'Weather could not be fetched.',
    'No se pudo leer GPS.': 'GPS could not be read.',
    'Obteniendo ubicación': 'Getting location',
    'día': 'day',
    'días': 'days',
    'superávit': 'surplus',
    'déficit': 'deficit',
    'Lluvia activa': 'Active rainfall',
    'ETo activa': 'Active ETo',
    'campo': 'field',
    'satélite': 'satellite'
  };

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    return {
      language: p && p.language === 'en' ? 'en' : 'es',
      unit_system: p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (p && p.locale) || (p && p.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  function unit(kind, system) {
    if (!definitions[kind]) throw new TypeError('Magnitud agua/clima no soportada: ' + kind);
    return definitions[kind][system || unitSystemOverride || prefs().unit_system];
  }

  function convert(value, from, to) {
    if (!w.NpUnits || typeof w.NpUnits.convert !== 'function') throw new Error('NpUnits no está disponible');
    return w.NpUnits.convert(Number(value), from, to);
  }

  function toSI(value, kind, system) {
    return convert(value, unit(kind, system), definitions[kind].canonical);
  }

  function fromSI(value, kind, system) {
    return convert(value, definitions[kind].canonical, unit(kind, system));
  }

  function number(value, digits, locale) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '';
    try {
      return new Intl.NumberFormat(locale || prefs().locale, {
        maximumFractionDigits: digits == null ? 2 : digits,
        minimumFractionDigits: 0,
        useGrouping: false
      }).format(n);
    } catch (e) {
      return String(Math.round(n * Math.pow(10, digits || 0)) / Math.pow(10, digits || 0));
    }
  }

  function inputFromSI(value, kind, system) {
    return number(fromSI(value, kind, system), 4);
  }

  function resultFromSI(value, kind, digits, system) {
    var u = unit(kind, system);
    var symbol = w.NpUnits && w.NpUnits.units && w.NpUnits.units[u] ? w.NpUnits.units[u].symbol : u;
    return number(fromSI(value, kind, system), digits == null ? 2 : digits) + ' ' + symbol;
  }

  function read(target, kind) {
    var el = typeof target === 'string' && w.document ? w.document.getElementById(target) : target;
    if (!el || String(el.value).trim() === '') return null;
    var n = Number(String(el.value).replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    var k = kind || fieldKinds[el.id] || el.getAttribute('data-np-unit-kind');
    var si = k ? toSI(n, k) : n;
    if (el.id && k) canonicalValues[el.id] = si;
    return si;
  }

  function write(target, valueSI, kind) {
    var el = typeof target === 'string' && w.document ? w.document.getElementById(target) : target;
    if (!el) return;
    var k = kind || fieldKinds[el.id] || el.getAttribute('data-np-unit-kind');
    if (el.id && k) canonicalValues[el.id] = Number(valueSI);
    el.value = k ? inputFromSI(valueSI, k) : valueSI;
  }

  function bindFields(map) {
    if (!w.document) return;
    Object.keys(map || {}).forEach(function (id) {
      var el = w.document.getElementById(id);
      if (!el) return;
      var kind = map[id];
      fieldKinds[id] = kind;
      el.setAttribute('data-np-unit-kind', kind);
      if (String(el.value).trim() !== '') {
        var initial = Number(String(el.value).replace(',', '.'));
        if (Number.isFinite(initial)) canonicalValues[id] = toSI(initial, kind, lastUnitSystem);
        write(el, canonicalValues[id], kind);
      }
      el.addEventListener('input', function () { read(el, kind); });
      el.addEventListener('change', function () { read(el, kind); });
    });
  }

  function refreshUnitLabels() {
    if (!w.document) return;
    Array.prototype.forEach.call(w.document.querySelectorAll('[data-np-unit-label]'), function (el) {
      var kind = el.getAttribute('data-np-unit-label');
      if (!definitions[kind]) return;
      var u = unit(kind);
      var symbol = w.NpUnits && w.NpUnits.units && w.NpUnits.units[u] ? w.NpUnits.units[u].symbol : u;
      el.textContent = symbol;
    });
  }

  function snapshot(ids) {
    var out = { __np_si: true };
    (ids || Object.keys(fieldKinds)).forEach(function (id) {
      var el = w.document && w.document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') out[id] = el.checked;
      else if (fieldKinds[id]) out[id] = String(el.value).trim() === '' ? '' : read(el, fieldKinds[id]);
      else out[id] = el.value;
    });
    return out;
  }

  function applySnapshot(data, ids) {
    if (!data || !w.document) return;
    (ids || Object.keys(data)).forEach(function (id) {
      var el = w.document.getElementById(id);
      if (!el || data[id] === undefined) return;
      if (el.type === 'checkbox') el.checked = !!data[id];
      else if (fieldKinds[id]) {
        var si = Number(data[id]);
        if (Number.isFinite(si)) write(el, si, fieldKinds[id]);
        else el.value = '';
      } else {
        el.value = data[id];
      }
    });
  }

  function translateString(input) {
    var output = String(input == null ? '' : input);
    if (prefs().language !== 'en') return output;
    Object.keys(phrases).sort(function (a, b) { return b.length - a.length; }).forEach(function (es) {
      output = output.split(es).join(phrases[es]);
    });
    return output;
  }

  function translateNode(node) {
    if (!node || !w.document) return;
    var lang = prefs().language;
    if (node.nodeType === 3) {
      if (!String(node.nodeValue || '').trim()) return;
      if (textOriginals && !textOriginals.has(node)) textOriginals.set(node, node.nodeValue);
      var original = textOriginals ? textOriginals.get(node) : node.nodeValue;
      node.nodeValue = lang === 'en' ? translateString(original) : original;
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
    if (node.nodeType === 1) {
      if (node.closest && node.closest('.notranslate,[translate="no"]')) return;
      var attrs = ['placeholder', 'title', 'aria-label'];
      if (attrOriginals && !attrOriginals.has(node)) attrOriginals.set(node, {});
      attrs.forEach(function (name) {
        if (!node.hasAttribute || !node.hasAttribute(name)) return;
        var bag = attrOriginals ? attrOriginals.get(node) : {};
        if (bag[name] === undefined) bag[name] = node.getAttribute(name);
        if (attrOriginals) attrOriginals.set(node, bag);
        node.setAttribute(name, lang === 'en' ? translateString(bag[name]) : bag[name]);
      });
    }
    var walker = w.document.createTreeWalker(node, 4);
    var current;
    while ((current = walker.nextNode())) translateNode(current);
  }

  function applyLanguage(root) {
    if (!w.document) return;
    w.document.documentElement.lang = prefs().language;
    translateNode(root || w.document);
    if (w.document.title) {
      if (!w.document.documentElement.getAttribute('data-np-title-es')) {
        w.document.documentElement.setAttribute('data-np-title-es', w.document.title);
      }
      var titleEs = w.document.documentElement.getAttribute('data-np-title-es');
      w.document.title = prefs().language === 'en' ? translateString(titleEs) : titleEs;
    }
  }

  function refreshUnits(nextSystem) {
    Object.keys(fieldKinds).forEach(function (id) {
      var el = w.document && w.document.getElementById(id);
      if (!el || String(el.value).trim() === '') return;
      if (canonicalValues[id] === undefined) {
        var old = Number(String(el.value).replace(',', '.'));
        if (Number.isFinite(old)) canonicalValues[id] = toSI(old, fieldKinds[id], lastUnitSystem);
      }
      if (canonicalValues[id] !== undefined) write(el, canonicalValues[id], fieldKinds[id]);
    });
    lastUnitSystem = nextSystem;
    refreshUnitLabels();
    if (typeof refreshCallback === 'function') refreshCallback();
  }

  function init(options) {
    options = options || {};
    lastUnitSystem = prefs().unit_system;
    refreshCallback = typeof options.refresh === 'function' ? options.refresh : null;
    bindFields(options.fields || {});
    refreshUnitLabels();
    applyLanguage();
    if (w.MutationObserver && w.document && !observer) {
      observer = new w.MutationObserver(function (records) {
        records.forEach(function (record) {
          Array.prototype.forEach.call(record.addedNodes || [], translateNode);
        });
      });
      observer.observe(w.document.documentElement, { childList: true, subtree: true });
    }
    if (w.addEventListener) {
      w.addEventListener('np:prefs-changed', function (event) {
        var next = event && event.detail && event.detail.prefs ? event.detail.prefs : prefs();
        if (next.unit_system !== lastUnitSystem) refreshUnits(next.unit_system);
        applyLanguage();
        if (w.NpI18n && typeof w.NpI18n.setLanguage === 'function') {
          w.NpI18n.setLanguage(next.language, { persist: false });
        }
      });
    }
    return api;
  }

  function t(es, en) {
    return prefs().language === 'en' ? (en || translateString(es)) : es;
  }

  function withUnitSystem(system, callback) {
    if (system !== 'metric' && system !== 'us_customary') {
      throw new TypeError('Sistema de unidades no soportado: ' + system);
    }
    var previous = unitSystemOverride;
    unitSystemOverride = system;
    try {
      return callback();
    } finally {
      unitSystemOverride = previous;
    }
  }

  var api = {
    definitions: definitions,
    technicalKinds: {
      ppm: true, mg_L: true, meq_L: true, ph: true, ec: true, kPa: true, percent: true
    },
    prefs: prefs,
    unit: unit,
    toSI: toSI,
    fromSI: fromSI,
    inputFromSI: inputFromSI,
    resultFromSI: resultFromSI,
    read: read,
    write: write,
    bindFields: bindFields,
    snapshot: snapshot,
    applySnapshot: applySnapshot,
    translateString: translateString,
    applyLanguage: applyLanguage,
    refreshUnitLabels: refreshUnitLabels,
    init: init,
    t: t,
    withUnitSystem: withUnitSystem
  };
  return api;
});
