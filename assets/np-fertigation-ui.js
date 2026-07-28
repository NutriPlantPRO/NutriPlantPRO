/**
 * NutriPlant — presentación internacional de Fertirriego.
 * El estado de negocio permanece en SI agronómico: kg/ha, t/ha, kg/t y m³/ha.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpFertigationUI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var EN = {
    requirements_tab: 'Nutrient Requirements', program_tab: 'Nutrition Program', charts_tab: 'Charts',
    requirements_title: '📋 Nutrient Requirements', program_title: '📘 Nutrition Program — Fertigation',
    crop: 'Crop:', target_yield: 'Target Yield', add_custom_crop: '➕ Add Custom Crop',
    elemental: '🔄 View as Elemental', oxide: '🔄 View as Oxide', concept: 'Item',
    extraction_per_yield: 'Removal per unit yield', total_extraction: 'Total Removal',
    soil_adjustment: 'Soil-Level Adjustment', efficiency: 'Efficiency', actual_requirement: 'Actual Requirement',
    cycle_summary: '📊 Full-Cycle Summary', weeks: 'Number of Weeks:', months: 'Number of Months:',
    total_dose: 'Total Dose', program_supply: '💡 Nutrition program supply',
    water_supply: '💧 Water nutrient supply', total_supply: '📦 Total supply (program + water)',
    difference: '➖ Difference (total supply − requirement)', weekly_program: '📅 Weekly Program',
    monthly_program: '📅 Monthly Program', macros: 'Macros', micros: 'Micros', stage: 'Stage',
    week: 'Week', month: 'Month', add_week: 'Add week', add_month: 'Add month',
    add_fertilizer: 'Add fertilizer', manage_catalog: 'Manage fertilizer catalog', select: 'Select…',
    total: 'TOTAL', irrigation_by_stage: '💧 Applied water by stage',
    irrigation_help: 'Used with the nutrient rate to calculate concentration (ppm and meq/L).',
    concentration_notice: 'Concentration (ppm, mg/L, meq/L) is shown separately from nutrient rate.',
    enter_water: 'Enter applied water for this stage to calculate ppm and meq/L.',
    fertilizer_supply: 'Fertilizer supply', fertilizer_water_supply: 'Fertilizer plus water supply',
    nutrient: 'Nutrient', group_pct: '% of group', no_custom: 'No custom fertilizers.',
    available_fertilizers: '📋 Available fertilizers (concentration %)', edit_custom: '✏️ Edit Custom Raw Material',
    save_changes: 'Save changes', name_required: 'Enter a name', remove_week: 'Remove period',
    remove_column: 'Remove column', establishment: 'Establishment', vegetative: 'Vegetative',
    preflowering: 'Pre-flowering', flowering: 'Flowering', fruit_set: 'Fruit set',
    filling: 'Fruit filling', harvest: 'Harvest'
  };
  var CROPS_EN = {
    aguacate:'Avocado', arandano:'Blueberry', banano:'Banana', cana:'Sugarcane', cebolla:'Onion',
    chile:'Green Pepper', fresa:'Strawberry', frambuesa:'Raspberry', lechuga:'Lettuce', limon:'Lemon',
    maiz:'Corn', melon:'Melon', papaya:'Papaya', pepino:'Cucumber', pimiento:'Bell Pepper',
    sandia:'Watermelon', tomate:'Tomato'
  };
  var MATERIALS_EN = {
    'Nitrato de Calcio':'Calcium Nitrate', 'Nitrato de Potasio':'Potassium Nitrate',
    'Sulfato de Potasio':'Potassium Sulfate', 'Sulfato de Magnesio':'Magnesium Sulfate',
    'Fosfato Monoamónico (MAP)':'Monoammonium Phosphate (MAP)',
    'Fosfato Monopotásico (MKP)':'Monopotassium Phosphate (MKP)',
    'Sulfato de Amonio':'Ammonium Sulfate', 'Urea':'Urea'
  };
  var STAGES = {
    Establecimiento:'establishment', Vegetativo:'vegetative', Prefloración:'preflowering',
    Floración:'flowering', Amarre:'fruit_set', Llenado:'filling', Cosecha:'harvest'
  };

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    return {
      language: p && p.language === 'en' ? 'en' : 'es',
      unit_system: p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (p && p.locale) || (p && p.language === 'en' ? 'en-US' : 'es-MX')
    };
  }
  function t(key, spanish) { return prefs().language === 'en' && EN[key] ? EN[key] : spanish; }
  function agronomic() {
    if (!w.NpAgronomicUnits) throw new Error('NpAgronomicUnits no está disponible');
    return w.NpAgronomicUnits;
  }
  function unit(kind) { return agronomic().unit(kind); }
  function fromSI(value, kind) { return agronomic().fromSI(Number(value), kind); }
  function toSI(value, kind) { return agronomic().toSI(Number(value), kind); }
  function trim(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  function inputFromSI(value, kind) { return trim(fromSI(value, kind), 4); }
  function resultFromSI(value, kind) { return trim(fromSI(value, kind), 2); }
  function quantityFromSI(value, kind) { return resultFromSI(value, kind) + ' ' + unit(kind); }
  function cropName(id, fallback, language) {
    return (language || prefs().language) === 'en' ? (CROPS_EN[id] || fallback || id) : (fallback || id);
  }
  function materialName(name, language) {
    return (language || prefs().language) === 'en' ? (MATERIALS_EN[name] || name) : name;
  }
  function stageName(name, language) {
    return (language || prefs().language) === 'en' && STAGES[name] ? EN[STAGES[name]] : name;
  }
  function concentrationPpmFromDose(doseKgHa, waterM3Ha) {
    var dose = Number(doseKgHa);
    var water = Number(waterM3Ha);
    if (!Number.isFinite(dose) || !Number.isFinite(water) || water <= 0) {
      throw new TypeError('Se requiere una dosis kg/ha y un volumen de agua m3/ha positivo.');
    }
    return dose * 1000 / water;
  }
  function doseFromConcentration(ppm, waterM3Ha) {
    var c = Number(ppm);
    var water = Number(waterM3Ha);
    if (!Number.isFinite(c) || !Number.isFinite(water) || water <= 0) {
      throw new TypeError('Una concentración no puede convertirse en dosis sin m3/ha o US gal/acre.');
    }
    return c * water / 1000;
  }

  return {
    getPrefs:prefs, t:t, unit:unit, fromSI:fromSI, toSI:toSI,
    inputFromSI:inputFromSI, resultFromSI:resultFromSI, quantityFromSI:quantityFromSI,
    cropName:cropName, materialName:materialName, stageName:stageName,
    concentrationPpmFromDose:concentrationPpmFromDose, doseFromConcentration:doseFromConcentration
  };
});
