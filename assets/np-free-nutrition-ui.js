/**
 * NutriPlant — interfaz compartida para herramientas gratuitas de nutrición.
 * El estado de negocio permanece en SI; este módulo adapta idioma y presentación.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpFreeNutritionUI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var observer = null;
  var originals = typeof WeakMap === 'function' ? new WeakMap() : null;
  var attrOriginals = typeof WeakMap === 'function' ? new WeakMap() : null;
  var callbacks = [];

  var phrases = {
    'Composición de fertilizantes': 'Fertilizer composition',
    'Distribución nutrimental por etapa': 'Nutrient distribution by stage',
    'Estimación de N mineralizable': 'Mineralizable N estimate',
    'Solubilidad e índice salino': 'Solubility and salt index',
    'Huella de carbono de fertilizantes': 'Fertilizer carbon footprint',
    'Datos de entrada': 'Input data',
    'Resultados': 'Results',
    'Resultado de referencia': 'Reference result',
    'Materia orgánica del suelo': 'Soil organic matter',
    'Densidad aparente': 'Bulk density',
    'Profundidad efectiva': 'Effective depth',
    'Suelo explorado por raíces': 'Soil explored by roots',
    'Fracción de N en la materia orgánica': 'N fraction in organic matter',
    'Masa de suelo total evaluada': 'Total soil mass evaluated',
    'Masa de suelo efectiva por raíz': 'Effective root-zone soil mass',
    'Materia orgánica estimada': 'Estimated organic matter',
    'N orgánico total estimado': 'Estimated total organic N',
    'N potencialmente mineralizable': 'Potentially mineralizable N',
    'Tasa anual de mineralización': 'Annual mineralization rate',
    'Conservador': 'Conservative',
    'Medio': 'Medium',
    'Alto': 'High',
    'Condición agrícola promedio': 'Average agricultural condition',
    'Suelo frío, seco, compactado o baja actividad biológica': 'Cold, dry or compacted soil, or low biological activity',
    'Suelo cálido, húmedo, aireado, alta actividad biológica': 'Warm, moist, aerated soil with high biological activity',
    'Fertilizantes hidrosolubles': 'Water-soluble fertilizers',
    'Fertilizante': 'Fertilizer',
    'Solubilidad': 'Solubility',
    'Índice salino': 'Salt index',
    'Clase': 'Class',
    'Alta': 'High',
    'Media': 'Medium',
    'Baja': 'Low',
    'Filtrar': 'Filter',
    'Nombre, fórmula o comentarios': 'Name, formula or notes',
    'La solubilidad depende de': 'Solubility depends on',
    'Temperatura': 'Temperature',
    'Pureza y grado': 'Purity and grade',
    'Índice salino IS': 'Salt index SI',
    'Qué significa el índice salino': 'What the salt index means',
    'Cationes': 'Cations',
    'Aniones': 'Anions',
    'Nitrato de amonio': 'Ammonium nitrate',
    'Nitrato de magnesio': 'Magnesium nitrate',
    'Nitrato de calcio': 'Calcium nitrate',
    'Nitrato de potasio': 'Potassium nitrate',
    'Fosfato monoamónico': 'Monoammonium phosphate',
    'Fosfato monopotásico': 'Monopotassium phosphate',
    'Cloruro de potasio': 'Potassium chloride',
    'Sulfato de amonio': 'Ammonium sulfate',
    'Sulfato de magnesio': 'Magnesium sulfate',
    'Sulfato de potasio': 'Potassium sulfate',
    'Sulfato de calcio': 'Calcium sulfate',
    'Carbonato de calcio': 'Calcium carbonate',
    'yeso agrícola': 'agricultural gypsum',
    'Enmienda · no soluble en fertirriego': 'Amendment · not soluble for fertigation',
    'Moléculas en el producto': 'Molecules in the product',
    'Agregar molécula': 'Add molecule',
    'Vaciar': 'Clear',
    'Otros': 'Other',
    'impurezas, antiapelmazantes': 'impurities, anticaking agents',
    'Nutriente total en el producto': 'Total nutrient in product',
    'Composición teórica': 'Theoretical composition',
    'Fórmula': 'Formula',
    'Quitar': 'Remove',
    'en producto': 'in product',
    'en masa': 'by mass',
    'elemental': 'elemental',
    'Equivalente': 'Equivalent',
    'uso agronómico': 'agronomic use',
    'Fósforo': 'Phosphorus',
    'Potasio': 'Potassium',
    'Calcio': 'Calcium',
    'Magnesio': 'Magnesium',
    'Azufre': 'Sulfur',
    'Silicio': 'Silicon',
    'Hierro': 'Iron',
    'Manganeso': 'Manganese',
    'Boro': 'Boron',
    'Cobre': 'Copper',
    'Molibdeno': 'Molybdenum',
    'Carbono': 'Carbon',
    'Hidrógeno': 'Hydrogen',
    'Oxígeno': 'Oxygen',
    'Etapa': 'Stage',
    'Brotación': 'Bud break',
    'Vegetativo': 'Vegetative',
    'Floración': 'Flowering',
    'Llenado': 'Filling',
    'Maduración': 'Maturity',
    'Nueva etapa': 'New stage',
    'Quitar etapa': 'Remove stage',
    'Agregar etapa': 'Add stage',
    'Agregar nutriente': 'Add nutrient',
    'Totales del ciclo': 'Cycle totals',
    'Demanda por etapa': 'Demand by stage',
    'Gráfica': 'Chart',
    'Restaurar ejemplo': 'Restore example',
    'Programa A': 'Program A',
    'Programa B': 'Program B',
    'Fabricación': 'Manufacturing',
    'Transporte': 'Transport',
    'Suelo': 'Soil',
    'Campo': 'Field',
    'Marítimo': 'Ocean',
    'Origen': 'Origin',
    'Superficie': 'Area',
    'Unidad de dosis': 'Dose unit',
    'Dosis': 'Dose',
    'Valor propio': 'Custom value',
    'Nota': 'Note',
    'Total': 'Total',
    'Por hectárea': 'Per hectare',
    'Por acre': 'Per acre',
    'Agregar fertilizante': 'Add fertilizer',
    'Limpiar': 'Clear',
    'Comparar': 'Compare',
    'Diferencia': 'Difference',
    'Referencias y fuentes públicas': 'References and public sources',
    'Aviso legal': 'Legal notice',
    'Ver más': 'Show more',
    'Ocultar': 'Hide',
    'Ruta': 'Route',
    'Puerto': 'Port',
    'país destino': 'destination country',
    'Estimar': 'Estimate',
    'Selecciona': 'Select',
    'Sin filas': 'No rows',
    'Estimado': 'Estimated',
    'Propio': 'Custom',
    'Error al cargar factores': 'Error loading factors',
    'Promedio global': 'Global average',
    'Unión Europea': 'European Union',
    'Estados Unidos / Canadá': 'United States / Canada',
    'Latinoamérica (otros)': 'Latin America (other)',
    'Medio Oriente / Norte de África': 'Middle East / North Africa',
    'África subsahariana': 'Sub-Saharan Africa',
    'Sudeste asiático': 'Southeast Asia',
    'Asia Oriental': 'East Asia',
    'Oceanía': 'Oceania',
    'Estados Unidos': 'United States',
    'Alemania': 'Germany',
    'Bélgica': 'Belgium',
    'Canadá': 'Canada',
    'Chequia': 'Czechia',
    'Dinamarca': 'Denmark',
    'Egipto': 'Egypt',
    'Emiratos Árabes Unidos': 'United Arab Emirates',
    'España': 'Spain',
    'Filipinas': 'Philippines',
    'Finlandia': 'Finland',
    'Francia': 'France',
    'Grecia': 'Greece',
    'Hungría': 'Hungary',
    'Irlanda': 'Ireland',
    'Italia': 'Italy',
    'Japón': 'Japan',
    'Marruecos': 'Morocco',
    'México': 'Mexico',
    'Noruega': 'Norway',
    'Nueva Zelanda': 'New Zealand',
    'Países Bajos': 'Netherlands',
    'Polonia': 'Poland',
    'Reino Unido': 'United Kingdom',
    'República Dominicana': 'Dominican Republic',
    'Rusia': 'Russia',
    'Sudáfrica': 'South Africa',
    'Suecia': 'Sweden',
    'Suiza': 'Switzerland',
    'Corea del Sur': 'South Korea',
    'Costa / puerto de llegada': 'Arrival coast / port',
    'Pacífico': 'Pacific',
    'Golfo de México': 'Gulf of Mexico',
    'Atlántico': 'Atlantic',
    'Caribe': 'Caribbean',
    'Norte': 'North',
    'Sur': 'South',
    'Este': 'East',
    'Oeste': 'West',
    'Centro': 'Central',
    'Orgánico / compost': 'Organic / compost',
    'Solución N': 'N solution',
    'Nitrato calcio amónico': 'Calcium ammonium nitrate',
    'Fosfonitrato': 'Phosphonitrate',
    'Cloruro de calcio': 'Calcium chloride',
    'soluble': 'soluble',
    'granular': 'granular',
    'líquido': 'liquid',
    'Validar': 'Validate',
    'validar': 'validate',
    'No sustituye': 'Does not replace',
    'no sustituye': 'does not replace',
    'año': 'year'
  };

  var stageEsToEn = {
    'Brotación': 'Bud break', 'Vegetativo': 'Vegetative', 'Floración': 'Flowering',
    'Llenado': 'Filling', 'Maduración': 'Maturity', 'Mes 1': 'Month 1',
    'Mes 2': 'Month 2', 'Mes 3': 'Month 3', 'Inicio de ciclo': 'Cycle start',
    'Desarrollo': 'Development', 'Cosecha': 'Harvest', 'Nueva etapa': 'New stage'
  };

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    return {
      language: p && p.language === 'en' ? 'en' : 'es',
      unit_system: p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (p && p.locale) || (p && p.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  function agronomic() {
    if (!w.NpAgronomicUnits) throw new Error('NpAgronomicUnits no está disponible');
    return w.NpAgronomicUnits;
  }

  function unit(kind) {
    if (kind === 'carbon_intensity') return prefs().unit_system === 'us_customary' ? 'lb CO₂e/lb producto' : 'kg CO₂e/kg producto';
    return agronomic().unit(kind);
  }

  function fromSI(value, kind) { return agronomic().fromSI(Number(value), kind); }
  function toSI(value, kind) { return agronomic().toSI(Number(value), kind); }

  function number(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat(prefs().locale, {
      maximumFractionDigits: digits == null ? 2 : digits,
      minimumFractionDigits: 0,
      useGrouping: true
    }).format(n);
  }

  function input(valueSI, kind) {
    var n = fromSI(valueSI, kind);
    return Number(n.toFixed(4)).toString();
  }

  function quantity(valueSI, kind, digits) {
    return number(fromSI(valueSI, kind), digits == null ? 2 : digits) + ' ' + unit(kind);
  }

  function co2e(valueKg, perArea) {
    if (perArea) return quantity(valueKg, 'emissions_area', 2);
    return quantity(valueKg, 'mass', 2).replace(/ (kg|lb)$/, ' $1 CO₂e');
  }

  function translate(input) {
    var out = String(input == null ? '' : input);
    if (prefs().language !== 'en') return out;
    Object.keys(phrases).sort(function (a, b) { return b.length - a.length; }).forEach(function (es) {
      out = out.split(es).join(phrases[es]);
    });
    return out;
  }

  function stageLabel(canonicalName) {
    return prefs().language === 'en' && stageEsToEn[canonicalName] ? stageEsToEn[canonicalName] : canonicalName;
  }

  function canonicalStage(displayName) {
    var value = String(displayName || '');
    var keys = Object.keys(stageEsToEn);
    for (var i = 0; i < keys.length; i += 1) {
      if (stageEsToEn[keys[i]] === value) return keys[i];
    }
    return value;
  }

  function translateNode(node) {
    if (!node || !w.document) return;
    if (node.nodeType === 3) {
      if (!String(node.nodeValue || '').trim()) return;
      if (node.parentElement && node.parentElement.closest('.notranslate,[translate="no"],code,.formula,.ion-symbol')) return;
      if (originals && !originals.has(node)) originals.set(node, node.nodeValue);
      var original = originals ? originals.get(node) : node.nodeValue;
      node.nodeValue = prefs().language === 'en' ? translate(original) : original;
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
    if (node.nodeType === 1) {
      if (node.closest && node.closest('.notranslate,[translate="no"]')) return;
      if (attrOriginals && !attrOriginals.has(node)) attrOriginals.set(node, {});
      ['placeholder', 'title', 'aria-label', 'data-np-tooltip'].forEach(function (name) {
        if (!node.hasAttribute || !node.hasAttribute(name)) return;
        var bag = attrOriginals ? attrOriginals.get(node) : {};
        if (bag[name] === undefined) bag[name] = node.getAttribute(name);
        if (attrOriginals) attrOriginals.set(node, bag);
        node.setAttribute(name, prefs().language === 'en' ? translate(bag[name]) : bag[name]);
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
    if (!w.document.documentElement.getAttribute('data-np-title-es')) {
      w.document.documentElement.setAttribute('data-np-title-es', w.document.title || '');
    }
    var title = w.document.documentElement.getAttribute('data-np-title-es');
    w.document.title = prefs().language === 'en' ? translate(title) : title;
  }

  function init(options) {
    options = options || {};
    if (typeof options.refresh === 'function') callbacks.push(options.refresh);
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
      w.addEventListener('np:prefs-changed', function () {
        applyLanguage();
        callbacks.slice().forEach(function (fn) { fn(prefs()); });
      });
    }
    return api;
  }

  var api = {
    prefs: prefs, unit: unit, fromSI: fromSI, toSI: toSI, number: number,
    input: input, quantity: quantity, formatCo2e: co2e, translate: translate,
    stageLabel: stageLabel, canonicalStage: canonicalStage,
    applyLanguage: applyLanguage, init: init
  };
  return api;
});
