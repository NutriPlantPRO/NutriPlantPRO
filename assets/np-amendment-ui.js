/**
 * NutriPlant — presentación internacional de Enmiendas.
 * El cálculo y la persistencia permanecen en SI: cm, g/cm3, kg/ha, kg y ha.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpAmendmentUI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var EN = {
    title: '🚜 CEC Amendment Balance (soil CEC adjustment)',
    ideal_ranges: '📊 Ideal Cation Ranges:',
    initial_analysis: '📊 Initial Soil Analysis (meq/100g or cmol⁺/kg of soil)',
    total_cec: 'Total CEC:',
    units_note: '<strong>Units:</strong> <span class="notranslate" translate="no">meq/100g</span> and <span class="notranslate" translate="no">cmol⁺/kg</span> represent the <strong>same quantity</strong> (same numeric value). Enter laboratory cations in either unit; total CEC is usually reported by the laboratory or calculated as the cation sum.',
    soil_properties: '🌱 Soil Properties',
    bulk_density: 'Bulk density',
    depth: 'Depth',
    soil_ph: 'Soil pH:',
    ph_enter: '⚪ Enter pH',
    ph_acid: '🔴 Acidic',
    ph_neutral: '🟢 Neutral',
    ph_alkaline: '🟡 Alkaline',
    targets: '🎯 meq/100g or cmol⁺/kg to adjust in CEC',
    targets_help: 'ℹ️ Same quantity in meq/100g or cmol⁺/kg: positive values indicate a deficit; negative values indicate an excess.',
    adjust_label: '(meq to adjust):',
    available: '🧪 Available Amendments',
    amendment: 'Amendment',
    formula: 'Formula',
    molecular_weight: 'Molecular Weight',
    actions: 'Actions',
    select: 'Select',
    selected: 'Selected',
    edit_composition: 'Edit composition',
    delete_custom: 'Delete custom amendment',
    custom_name: 'Amendment name',
    chemical_formula: 'Chemical formula',
    root_zone: 'Soil explored by roots (%)',
    root_zone_help: 'Enter any value; it will be constrained to 10–100% when you leave the field.',
    calculate: '🧮 Calculate Amendment',
    reset: '🔄 Reset',
    results: '📊 Amendment Calculation Results',
    no_results: 'No amendments are required with the currently selected materials.',
    total_contributions: '🎯 Total Contributions:',
    potassium: 'Potassium',
    calcium: 'Calcium',
    magnesium: 'Magnesium',
    sulfate: 'Sulfate',
    silicon: 'Silicon',
    reach_note: '% of soil volume explored by roots',
    details: '📋 Amendment Details:',
    quantity: 'Quantity',
    warning: 'Possible excess contribution due to composition',
    select_required: 'Please select at least one amendment before calculating',
    edit_title: '✏️ Edit Composition:',
    save: '💾 Save',
    cancel: '❌ Cancel',
    required_custom: '❌ Please complete at least: Name, Formula, and Molecular Weight',
    custom_saved: 'saved successfully',
    custom_only_delete: '❌ Only custom amendments can be deleted',
    confirm_delete: 'Are you sure you want to delete',
    not_found: 'Amendment not found',
    high_ph_lime: 'High pH: lime is not recommended',
    exceeds_target: 'Exceeds the {elements} target because of amendment composition',
    save_data: '💾 Save Data',
    view_card: '🃏 View Card',
    generate_pdf: '📄 Generate PDF Report',
    ph_enter_placeholder: 'Enter pH',
    ph_title: 'Soil pH (4.0 - 9.0)'
  };

  var NAMES_EN = {
    gypsum: 'Agricultural Gypsum',
    lime: 'Agricultural Lime',
    dolomite: 'Dolomitic Lime',
    'mgso4-mono': 'Magnesium Sulfate Monohydrate',
    'sop-granular': 'Granular Potassium Sulfate'
  };

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    return {
      language: p && p.language === 'en' ? 'en' : 'es',
      unit_system: p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (p && p.locale) || (p && p.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  function t(key, spanish, params) {
    var text = prefs().language === 'en' && EN[key] ? EN[key] : spanish;
    return String(text === undefined ? key : text).replace(/\{(\w+)\}/g, function (_, name) {
      return params && params[name] !== undefined ? params[name] : _;
    });
  }

  function agronomic() {
    if (!w.NpAgronomicUnits) throw new Error('NpAgronomicUnits no está disponible');
    return w.NpAgronomicUnits;
  }

  function unit(kind) { return agronomic().unit(kind); }
  function fromSI(value, kind) { return agronomic().fromSI(Number(value), kind); }
  function toSI(value, kind) { return agronomic().toSI(Number(value), kind); }

  function trimFixed(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  function inputFromSI(value, kind) { return trimFixed(fromSI(value, kind), 4); }
  function resultFromSI(value, kind) {
    var digits = kind === 'bulk_density' ? 3 : 2;
    return trimFixed(fromSI(value, kind), digits);
  }
  function quantityFromSI(value, kind) { return resultFromSI(value, kind) + ' ' + unit(kind); }

  function meqToKgHa(meq, equivalentWeight, depthCm, bulkDensityGcm3) {
    var values = [meq, equivalentWeight, depthCm, bulkDensityGcm3].map(Number);
    if (!values.every(Number.isFinite)) throw new TypeError('El cálculo requiere meq, peso equivalente, profundidad y densidad finitos.');
    if (values[2] <= 0 || values[3] <= 0) throw new RangeError('Profundidad y densidad deben ser mayores que cero.');
    var depthM = values[2] / 100;
    return values[0] * values[1] * 10 * (100 * 100 * depthM * values[3]) / 1000;
  }

  function kgHaToMeq(kgHa, equivalentWeight, depthCm, bulkDensityGcm3) {
    var denominator = meqToKgHa(1, equivalentWeight, depthCm, bulkDensityGcm3);
    return Number(kgHa) / denominator;
  }

  function materialName(id, name, language) {
    return (language || prefs().language) === 'en' && NAMES_EN[id] ? NAMES_EN[id] : name;
  }

  function setSIInput(element, value, kind) {
    if (!element) return;
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    element.dataset.npSiValue = String(n);
    element.dataset.npQuantityKind = kind;
    element.value = inputFromSI(n, kind);
  }

  function readSIInput(element, kind) {
    if (!element) return 0;
    var n = Number(element.value);
    if (!Number.isFinite(n)) return 0;
    var si = toSI(n, kind || element.dataset.npQuantityKind);
    element.dataset.npSiValue = String(si);
    return si;
  }

  function bindSIInput(element, kind) {
    if (!element) return;
    if (!element.dataset.npSiValue) setSIInput(element, Number(element.value) || 0, kind);
    element.dataset.npQuantityKind = kind;
    if (element.dataset.npAmendmentBound === '1') return;
    element.addEventListener('input', function () { readSIInput(element, kind); });
    element.dataset.npAmendmentBound = '1';
  }

  function renderSIInput(element, kind) {
    if (!element) return;
    var si = Number(element.dataset.npSiValue);
    if (!Number.isFinite(si)) si = Number(element.value) || 0;
    setSIInput(element, si, kind);
  }

  function soilInputs(root) {
    root = root || w.document;
    return [
      { element: root && root.querySelector('#soil-depth'), kind: 'depth' },
      { element: root && root.querySelector('#soil-density'), kind: 'bulk_density' }
    ];
  }

  function bindSoilInputs(root) {
    soilInputs(root).forEach(function (item) { bindSIInput(item.element, item.kind); });
  }

  function renderSoilInputs(root) {
    soilInputs(root).forEach(function (item) { renderSIInput(item.element, item.kind); });
  }

  function setText(element, text) { if (element) element.textContent = text; }
  function selectors(root, selector) { return root ? root.querySelectorAll(selector) : []; }

  function translateRoot(root) {
    root = root || w.document;
    if (!root) return root;
    var container = root.matches && root.matches('.enmienda-container') ? root : root.querySelector('.enmienda-container');
    if (!container) return root;
    var headings = container.querySelectorAll('h3');
    setText(container.querySelector('.enmienda-header h2'), t('title', '🚜 Balance de enmiendas por CIC (ajuste de CIC del suelo)'));
    if (headings[0]) setText(headings[0], t('ideal_ranges', '📊 Rangos Ideales de Cationes:'));
    if (headings[1]) setText(headings[1], t('initial_analysis', '📊 Análisis de Suelo Inicial (meq/100g o cmol⁺/kg de suelo)'));
    setText(container.querySelector('.total-display label'), t('total_cec', 'CIC Total:'));
    var note = container.querySelector('.enmienda-units-note');
    if (note) note.innerHTML = t('units_note', '<strong>Unidades:</strong> <span class="notranslate" translate="no">meq/100g</span> y <span class="notranslate" translate="no">cmol⁺/kg</span> son la <strong>misma magnitud</strong> (misma cifra numérica). Captura los cationes del laboratorio en esas unidades; la CIC total suele venir en el reporte o como suma de cationes.');
    if (headings[2]) setText(headings[2], t('soil_properties', '🌱 Propiedades del Suelo'));
    var properties = container.querySelectorAll('.property-item');
    if (properties[0]) setText(properties[0].querySelector('label'), t('bulk_density', 'Densidad aparente') + ' (' + unit('bulk_density') + '):');
    if (properties[1]) setText(properties[1].querySelector('label'), t('depth', 'Profundidad') + ' (' + unit('depth') + '):');
    if (properties[2]) setText(properties[2].querySelector('label'), t('soil_ph', 'pH del suelo:'));
    var targetHeading = container.querySelector('.target-section h3');
    setText(targetHeading, t('targets', '🎯 meq/100g o cmol⁺/kg a ajustar en CIC'));
    setText(container.querySelector('.target-section p'), t('targets_help', 'ℹ️ Misma magnitud en meq/100g o cmol⁺/kg: valores positivos = déficit; negativos = exceso.'));
    selectors(container, '.target-adjust-label').forEach(function (el) { setText(el, t('adjust_label', '(meq a ajustar):')); });
    setText(container.querySelector('.amendments-section h3'), t('available', '🧪 Enmiendas Disponibles'));
    var th = container.querySelectorAll('.amendments-table thead th');
    [t('amendment', 'Enmienda'), t('formula', 'Fórmula'), t('molecular_weight', 'Peso Molecular')].forEach(function (text, index) { setText(th[index], text); });
    if (th[10]) setText(th[10], t('actions', 'Acciones'));
    setText(container.querySelector('.soil-reach-card label'), t('root_zone', 'Suelo explorado por raíces (%)'));
    var reach = container.querySelector('#soil-reach-percent');
    if (reach) reach.title = t('root_zone_help', 'Puedes escribir cualquier valor y al salir del campo se ajusta entre 10 y 100 %.');
    setText(container.querySelector('#calculate-amendment'), t('calculate', '🧮 Calcular Enmienda'));
    setText(container.querySelector('#reset-amendment'), t('reset', '🔄 Reiniciar'));
    setText(container.querySelector('#saveAmendmentDataBtn'), t('save_data', '💾 Guardar Datos'));
    setText(container.querySelector('#showProjectCardBtn'), t('view_card', '🃏 Ver Tarjeta'));
    setText(container.querySelector('#generateReportFromAmendmentBtn'), t('generate_pdf', '📄 Generar Reporte PDF'));
    var phInput = container.querySelector('#soil-ph');
    if (phInput) {
      phInput.placeholder = t('ph_enter_placeholder', 'Ingrese pH');
      phInput.title = t('ph_title', 'pH del suelo (4.0 - 9.0)');
    }
    return root;
  }

  function refresh(root) {
    bindSoilInputs(root);
    renderSoilInputs(root);
    translateRoot(root);
  }

  return {
    getPrefs: prefs,
    t: t,
    unit: unit,
    fromSI: fromSI,
    toSI: toSI,
    inputFromSI: inputFromSI,
    resultFromSI: resultFromSI,
    quantityFromSI: quantityFromSI,
    meqToKgHa: meqToKgHa,
    kgHaToMeq: kgHaToMeq,
    materialName: materialName,
    setSIInput: setSIInput,
    readSIInput: readSIInput,
    bindSoilInputs: bindSoilInputs,
    renderSoilInputs: renderSoilInputs,
    translateRoot: translateRoot,
    refresh: refresh
  };
});
