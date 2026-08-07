/**
 * NutriPlant — presentación internacional de Nutrición Granular.
 * El estado de negocio permanece en SI: t/ha, kg/ha, kg y ha.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpGranularUI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var EN = {
    requirements_tab: '📋 Nutrient Requirements',
    program_tab: '🌱 Granular Program',
    requirements_title: '📋 Nutrient Requirements',
    program_title: '⚪ Granular Nutrition — Program',
    crop: 'Crop:',
    target_yield: 'Target Yield',
    add_custom_crop: '➕ Add Custom Crop',
    elemental: '🔄 View as Elemental',
    oxide: '🔄 View as Oxide',
    cycle_summary: '📊 Full-Cycle Summary',
    application_count: 'Number of Applications:',
    total_dose: 'Total Dose',
    total_cost: 'Total cost',
    price: 'Price',
    cost: 'Cost',
    total_supply: '💡 Total Nutrient Supply',
    real_requirement: '🎯 Actual Requirement',
    difference: '➖ Difference (Supply − Requirement)',
    add_application: '➕ Add New Granular Application',
    concept: 'Item',
    extraction_per_ton: 'Removal per unit yield',
    total_extraction: 'Total Removal',
    soil_adjustment: 'Soil-Level Adjustment',
    efficiency: 'Efficiency',
    req_steps_title: 'How to use this table',
    req_step_1: 'Select your crop and target yield',
    req_step_2: 'Adjust removal per unit yield',
    req_step_3: 'Correct for soil supply or deficit',
    req_step_4: 'Adjust for fertilizer and system efficiency',
    material: 'Material',
    per_metric_ton: '% of blend',
    action: 'Action',
    select: 'Select…',
    no_materials: 'No fertilizers added',
    total: 'TOTAL',
    dose: 'Dose',
    npk_ratio: 'NPK ratio:',
    remove: '🗑️ Remove',
    add_fertilizer: '➕ Add fertilizer',
    manage_catalog: '📋 Manage fertilizer catalog and prices',
    configured_applications: 'Configured applications',
    no_applications: 'No applications are saved in the granular program.',
    application_supply: 'Supply from this application',
    custom_crop_extraction_help: '📊 Enter removal per unit yield for each nutrient:',
    confirm_clear_catalog: 'Remove all custom fertilizers?',
    catalog_cleared: '✅ Custom catalog cleared',
    confirm_remove_catalog_item: 'Remove this item from your custom catalog?',
    material_name_required: '⚠️ Enter a fertilizer name.',
    material_updated: '✅ Fertilizer updated',
    material_added: '✅ Fertilizer added',
    material_add_error: '❌ The fertilizer could not be added. Check the console for details.',
    confirm_remove_application: 'Remove this application?',
    custom_crop_not_found: 'Custom crop not found.',
    crop_name_required: 'Enter the crop name.',
    save_unavailable: '❌ Cannot save: function unavailable.',
    load_unavailable: '❌ Cannot load: function unavailable.',
    custom_crop_edit: '✏️ Edit Custom Crop',
    save_changes: 'Save changes',
    add_crop: 'Add Crop',
    no_custom_crops: 'No custom crops.',
    edit: 'Edit',
    cancel: 'Cancel',
    fertilizer_name: 'Fertilizer name:',
    nutrient_concentration: 'Nutrient concentration (%):',
    custom_fertilizers: 'Custom granular fertilizers:',
    view_available: '📋 View available fertilizers',
    clear_catalog: '🧹 Clear catalog',
    available_fertilizers: '📋 Available fertilizers (concentration %)',
    available_help: 'Reference concentrations for built-in fertilizers. Values are percentages (oxides where applicable).',
    no_custom_fertilizers: 'No custom fertilizers.',
    no_preloaded_fertilizers: 'No built-in fertilizers.',
    custom_fertilizer_edit: '✏️ Edit Custom Fertilizer',
    oxide_mode: 'Oxide Mode',
    elemental_mode: 'Elemental Mode',
    not_available: 'N/A'
  };

  var CROPS_EN = {
    maiz: 'Corn', cana: 'Sugarcane', aguacate: 'Avocado', limon: 'Lemon',
    banano: 'Banana', trigo: 'Wheat', sorgo: 'Sorghum', arroz: 'Rice', cebada: 'Barley'
  };

  /* Solo nombres descriptivos precargados. MAP, DAP, MKP, SOP, Urea, Micro Mix quedan igual. */
  var MATERIALS_EN = {
    'Fosfonitrato 33-03-00': 'Nitrophosphate 33-03-00',
    'Sulfato de Amonio Granular': 'Granular Ammonium Sulfate',
    'Superfosfato Simple': 'Single Superphosphate',
    'Superfosfato Triple': 'Triple Superphosphate',
    'Sulfato de Potasio': 'Potassium Sulfate',
    'Cloruro de Potasio': 'Potassium Chloride',
    'Nitrato de Potasio': 'Potassium Nitrate',
    'Silicato de Potasio': 'Potassium Silicate',
    'Nitrato de Calcio': 'Calcium Nitrate',
    'Sulfato de K y Mg': 'Potassium Magnesium Sulfate',
    'Sulfato de Magnesio': 'Magnesium Sulfate',
    'Sulfato de Hierro': 'Iron Sulfate',
    'Sulfato de Manganeso': 'Manganese Sulfate',
    'Sulfato de Zinc': 'Zinc Sulfate',
    'Boro Granular': 'Granular Boron',
    'Sulfato de Cobre': 'Copper Sulfate',
    'Molibdato de Sodio': 'Sodium Molybdate',
    'Complejo 12-11-18': '12-11-18 Blend',
    'Complejo 12-12-17': '12-12-17 Blend',
    'Complejo Triple 16': 'Triple 16 Blend',
    'Urea': 'Urea'
  };

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    return {
      language: p && p.language === 'en' ? 'en' : 'es',
      unit_system: p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (p && p.locale) || (p && p.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  function t(key, spanish) {
    return prefs().language === 'en' && EN[key] ? EN[key] : spanish;
  }

  function agronomic() {
    if (!w.NpAgronomicUnits) throw new Error('NpAgronomicUnits no está disponible');
    return w.NpAgronomicUnits;
  }

  function unit(kind) {
    if (kind === 'extraction_mass_yield') {
      return prefs().unit_system === 'us_customary' ? 'lb/short ton' : 'kg/t';
    }
    return agronomic().unit(kind);
  }

  function fromSI(value, kind) {
    var n = Number(value);
    if (kind === 'extraction_mass_yield') {
      return prefs().unit_system === 'us_customary' ? n * 2 : n;
    }
    return agronomic().fromSI(n, kind);
  }

  function toSI(value, kind) {
    var n = Number(value);
    if (kind === 'extraction_mass_yield') {
      return prefs().unit_system === 'us_customary' ? n / 2 : n;
    }
    return agronomic().toSI(n, kind);
  }

  function trimFixed(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  function inputFromSI(value, kind) {
    return trimFixed(fromSI(value, kind), 4);
  }

  function resultFromSI(value, kind) {
    return trimFixed(fromSI(value, kind), 2);
  }

  function cropName(id, fallback, language) {
    return (language || prefs().language) === 'en' ? (CROPS_EN[id] || fallback || id) : (fallback || id);
  }

  function materialName(name, language) {
    return (language || prefs().language) === 'en' ? (MATERIALS_EN[name] || name) : name;
  }

  function autoApplicationTitle(number, language) {
    return (language || prefs().language) === 'en'
      ? 'Granular Application ' + number
      : number + 'ª Aplicación Granular';
  }

  return {
    getPrefs: prefs,
    t: t,
    unit: unit,
    fromSI: fromSI,
    toSI: toSI,
    inputFromSI: inputFromSI,
    resultFromSI: resultFromSI,
    cropName: cropName,
    materialName: materialName,
    autoApplicationTitle: autoApplicationTitle
  };
});
