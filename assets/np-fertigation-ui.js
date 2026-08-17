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
    requirements_tab: 'Nutrient Requirements', program_tab: 'Nutrition Program', charts_tab: 'Nutrient Dynamics',
    requirements_title: '📋 Nutrient Requirements', program_title: '📘 Nutrition Program — Fertigation',
    crop: 'Crop:', target_yield: 'Target Yield', add_custom_crop: '➕ Add Custom Crop',
    elemental: '🔄 View as Elemental', oxide: '🔄 View as Oxide', concept: 'Item',
    extraction_per_yield: 'Removal per unit yield', total_extraction: 'Total Removal',
    soil_adjustment: 'Soil-Level Adjustment', efficiency: 'Efficiency', actual_requirement: 'Actual Requirement',
    bring_from_soil_analysis: 'Bring from analysis',
    select_soil_analysis: 'Select analysis…',
    no_soil_analyses: 'No soil analyses in this project',
    linked_soil_analysis: 'Linked analysis',
    bring_from_soil_title: 'Pick a soil analysis: the cycle considered difference is used to adjust the requirement. If you do not pick one, the current value is kept.',
    soil_maint_hint: 'Notice: for {nuts}, soil covers more than removal. Instead of 0, 25% maintenance was applied. To use another amount, change only that cell.',
    soil_maint_hint_many: 'Notice: for {nuts}, soil covers more than removal. Instead of 0, 25% maintenance was applied. To use another amount, change only those cells.',
    soil_maint_cell: '25% maintenance: soil covered more than removal. You can change only this cell.',
    soil_analysis_label: 'Analysis',
    soil_analysis_generic: 'Soil analysis',
    req_steps_title: 'How to use this table',
    req_step_1: 'Select your crop and target yield',
    req_step_2: 'Adjust removal per unit yield',
    req_step_3: 'Correct for soil supply or deficit (if soil covers more than removal, 25% maintenance remains)',
    req_step_4: 'Adjust for fertilizer and system efficiency',
    req_step_5: 'Split the actual requirement across the cycle (below: Objective distribution, % by stage and irrigation depth)',
    ionic_eq_title: 'Ionic equilibrium zone',
    ionic_eq_hint: '% meq of the actual requirement. The kg column is the range to stay in zone if you edit that nutrient and leave the others as they are. Anions N-P-S · cations K-Ca-Mg.',
    ionic_eq_col_zone: 'Zone',
    ionic_eq_col_pct: '% of cycle (range)',
    ionic_eq_col_kg: 'Zone ({unit})',
    ionic_eq_no_kg: 'No range closes',
    ionic_eq_anions: 'Anions N-P-S',
    ionic_eq_cations: 'Cations K-Ca-Mg',
    ionic_eq_ok: 'Cycle in zone',
    ionic_eq_edge: 'Near the edge',
    ionic_eq_out: 'Outside the zone',
    ionic_eq_high: '{nut} high',
    ionic_eq_low: '{nut} low',
    ionic_eq_empty: 'Need N, P, K, Ca, Mg or S in the actual requirement.',
    dist_title_prefix: 'Objective distribution',
    dist_project_fallback: 'project',
    dist_lead: 'Define the target split of actual requirement by stage or period. This objective can later be compared with a generated, edited or manually entered program.',
    dist_catalog: 'Curve catalog',
    dist_pick_curve: '— Select curve —',
    dist_template_title: 'Title (template)',
    dist_template_ph: 'E.g. Hass avocado · 5 stages',
    dist_save_catalog: '💾 Save to catalog',
    dist_apply_other: 'Apply to another project',
    dist_delete_catalog: '🗑 Remove from catalog',
    dist_catalog_hint: 'The catalog is yours (dashboard). It stores stages and %. Doses are recalculated in each project from its requirement.',
    dist_h2: '1. Distribution by stage (%)',
    dist_h2_hint: 'This table is the % of actual requirement by stage. Week or Month is the same period as the Program. Each nutrient sums to 100%.',
    dist_pct_nudge: 'The bar sets the %. You can also type the number.',
    dist_pct_minus: 'Down 1%',
    dist_pct_plus: 'Up 1%',
    dist_pct_bar: 'Set %',
    dist_assist_title: 'Support',
    dist_assist_btn: 'Support: starting % shape',
    dist_assist_in: 'Apply to',
    dist_suggest_btn: 'Suggest %',
    dist_suggest_title: 'Fills % from the stages you selected, aiming for an adequate solution in the N-P-S and K-Ca-Mg triangles.',
    dist_suggest_hint: 'Adding or removing stages readjusts the % to the suggested curve. Suggest % restores that curve if you moved a value. If you edit a % and a program already exists with the same periods, those doses are rebalanced (no need to generate the proposal again). If you change a dose in the Program, the % here moves. Suggest % does not touch the program until you generate the automatic proposal. The bar in each cell sets the %; you can also type the number.',
    dist_suggest_done: 'Percentages filled from the stages, aiming for an adequate solution in the ternary triangles.',
    dist_suggest_out: 'Percentages filled from the stages. The cycle requirement is already outside the triangle ranges; review N-P-S or K-Ca-Mg.',
    dist_suggest_confirm: 'Replace the current % with the suggested curve from the selected stages? This does not change the program until you generate the automatic proposal.',
    dist_shape_all: 'All nutrients',
    dist_shape_macros: 'Macros',
    dist_shape_desc: 'High → low',
    dist_shape_asc: 'Low → high',
    dist_shape_bell: 'Bell',
    dist_shape_equal: 'Even',
    dist_shape_norm: 'Make 100%',
    dist_copy_from: 'Copy from',
    dist_copy_to: 'to',
    dist_copy_go: 'Copy %',
    dist_copy_others: 'Copy this % to the others',
    dist_credit_water: 'water',
    dist_credit_granular: 'granular program',
    dist_credit_hint: 'Water and granular are already subtracted from the requirement. This table only splits %; doses appear when you build the program.',
    dist_kg_net_title: 'Pending: (requirement − water − granular) × %. Water {water} · granular {base}.',
    dist_shape_all_others: 'The others',
    dist_kg_readonly: 'Calculated dose: requirement × %. Not edited here.',
    dist_add_stage: 'Add stage',
    dist_axis: 'Period',
    dist_axis_pheno: 'Phenological',
    dist_axis_week: 'Weekly',
    dist_axis_month: 'Monthly',
    dist_axis_warn: 'This changes the period to {axis}. Phenology on each row is kept. Continue?',
    dist_h3: '2. Result',
    dist_per_stage: 'per stage',
    dist_water_title: '2. Target irrigation depth by stage',
    dist_water_help: 'Used to split the water-analysis contribution and to calculate ppm, meq/L and EC.',
    dist_macros: 'Macros',
    dist_micros: 'Micros',
    dist_stage: 'Stage',
    dist_remove_stage: 'Remove',
    dist_sum_warn: 'The % sum per nutrient must be 100%.',
    dist_new_stage: 'New stage',
    dist_confirm_del: 'Delete curve «',
    dist_confirm_del_2: '» from the catalog?',
    dist_apply_hint: 'Copies stages and % to that file. Doses come from its requirement.',
    dist_apply_go: 'Apply',
    dist_no_other: 'No other projects',
    dist_replace_warn: 'That project already has a distribution. Replace stages and %?',
    dist_applied: 'Curve applied to',
    auto_button: 'Automatic program proposal',
    auto_title: 'Automatic program proposal',
    auto_confirm_intro: 'The program rows and fertilizers will be replaced with a proposal calculated from Distribution.',
    auto_source: 'Objective distribution',
    auto_periods: 'Periods',
    auto_water_rule: 'Water',
    auto_water_proportional: 'contribution is deducted according to each period’s irrigation depth',
    auto_water_source: 'Water source',
    auto_water_linked: 'linked water analysis',
    auto_water_manual: 'manually entered contribution',
    auto_water_none: 'no nutrient contribution from water',
    auto_water_analysis_available: 'This project has water analyses. Link the correct analysis under Water supply before accepting if you want it deducted.',
    auto_materials: 'Fertilizers',
    auto_unresolved_preview: 'The proposal will have deficits in {count} period(s); they will remain visible for review.',
    auto_water_excess_preview: 'Water alone exceeds one or more targets in {count} period(s); the generator will add no fertilizer for those nutrients.',
    auto_replace_warning: 'The current program contains rates and will be replaced.',
    auto_disclaimer: 'This is an agronomic proposal. Review compatibility, solubility, water quality and system limits before applying it.',
    auto_no_distribution: 'First configure and save the requirement Distribution.',
    auto_time_axis_required: 'In Distribution, select Weekly or Monthly before building the program.',
    auto_distribution_invalid: 'Distribution must sum to 100% for every nutrient. Review: ',
    auto_water_depth_required: 'There is a water contribution. Enter irrigation depth for every period in Nutrient Dynamics before building the program.',
    auto_generator_unavailable: 'The automatic generator could not be prepared.',
    auto_done: 'Automatic proposal applied. Review rates and ionic balance before using it.',
    auto_done_pending: 'Automatic proposal applied. Review deficits and ionic balance before using it.',
    auto_generated: 'Program generated from Objective Distribution',
    auto_stale: 'Program is outdated relative to Objective Distribution',
    auto_pending_detail: 'Short: {list}',
    auto_water_excess: 'Water exceeds target: {list}',
    auto_period_one: 'period',
    auto_period_many: 'periods',
    auto_all_cycle: 'full cycle',
    auto_ionic_summary: 'Ionic balance by period',
    anions: 'anions',
    cations: 'cations',
    weekly: 'Weekly',
    monthly: 'Monthly',
    accept: 'Accept',
    none: 'None',
    cycle_summary: '📊 Full-Cycle Summary', weeks: 'Number of Weeks:', months: 'Number of Months:',
    total_dose: 'Total Dose', total_cost: 'Total cost', program_supply: '💡 Fertigation program supply',
    water_supply: '💧 Water nutrient supply', total_supply: '📦 Total supply (program + water)',
    ce_ref: 'Reference EC',
    bring_from_analysis: 'Bring from analysis',
    select_water_analysis: 'Select analysis…',
    bring_from_analysis_hint: 'Pick an analysis to load kg/ha and the acid. Water kg/ha use the total cycle irrigation depth (sum of stages below). Acid uses each stage’s depth.',
    linked_water_analysis: 'Linked analysis',
    analysis_cycle_lamina: 'Total depth (analysis)',
    bring_from_analysis_title: 'Pick an analysis: its kg/ha are loaded into water nutrient supply',
    no_water_analyses: 'No water analyses in this project',
    water_analysis_not_found: 'That water analysis was not found.',
    water_analysis_label: 'Analysis',
    water_analysis_generic: 'Water analysis',
    difference: '➖ Difference (total supply − requirement)', weekly_program: '📅 Weekly Program',
    monthly_program: '📅 Monthly Program', macros: 'Macros', micros: 'Micros', stage: 'Stage',
    week: 'Week', month: 'Month', add_week: 'Add week', add_month: 'Add month',
    add_fertilizer: 'Add fertilizer', insert_fertilizer_here: 'Insert fertilizer here',
    manage_catalog: 'Manage fertilizer catalog and prices', select: 'Select…',
    total: 'TOTAL', irrigation_by_stage: '💧 Applied water by stage',
    irrigation_help: 'Used with the nutrient rate to calculate concentration (ppm and meq/L).',
    concentration_notice: 'Concentration (ppm, mg/L, meq/L) is shown separately from nutrient rate.',
    concentration: 'Concentration', dose: 'Dose',
    enter_water: 'Enter this stage’s irrigation depth above to calculate ppm and meq/L.',
    charts_water_title: 'Irrigation depth by stage',
    charts_water_help: 'Used here for ppm, meq/L and EC. Same depths as in the Nutrition Program.',
    program_water_help: 'Cycle sum = water kg/ha. Each stage = acid. Dynamics uses this depth for ppm/meq.',
    fertilizer_supply: 'Fertilizer supply', fertilizer_water_supply: 'Fertilizer plus water supply',
    nutrient: 'Nutrient', group_pct: '% of group', no_custom: 'No custom fertilizers.',
    available_fertilizers: '📋 Available fertilizers (concentration %)',
    available_fertilizers_help: 'Browse concentrations of preloaded soluble fertilizers. Values in % (oxides where applicable).',
    name_col: 'Name',
    no_preloaded: 'No preloaded fertilizers.',
    edit_custom: '✏️ Edit Custom Raw Material',
    new_material_title: '➕ New Custom Raw Material',
    edit_material_title: '✏️ Edit Custom Raw Material',
    material_name: 'Raw material name:',
    material_name_ph: 'e.g. Calcium Nitrate',
    nutrient_concentration: 'Nutrient concentration (%):',
    custom_solubles: 'Custom soluble fertilizers:',
    view_available: 'View available fertilizers',
    view_available_title: 'Browse preloaded fertilizer concentrations',
    clear_catalog: 'Clear catalog',
    cancel: 'Cancel',
    add_material: 'Add raw material',
    user_badge: 'User',
    project_badge: 'Project',
    edit: 'Edit',
    delete: 'Delete',
    confirm_delete_one: 'Remove this fertilizer from the catalog?',
    confirm_clear_catalog: 'Remove all custom soluble fertilizers from the catalog?',
    fertilizer_added: '✅ Fertilizer added',
    save_changes: 'Save changes', name_required: 'Enter a name', remove_week: 'Remove period',
    remove_column: 'Remove column', bud_break: 'Bud break', establishment: 'Establishment', vegetative: 'Vegetative',
    preflowering: 'Pre-flowering', flowering: 'Flowering', fruit_set: 'Fruit set',
    filling: 'Fruit filling', maturity: 'Maturity', harvest: 'Harvest',
    macronutrients: 'Macronutrients', micronutrients: 'Micronutrients',
    chart_y_kg: 'Kg of nutrient', chart_y_lb: 'Lb of nutrient',
    stage_to_analyze: 'Stage to analyze:', lamina: 'Irrigation depth:', no_data: 'no data',
    macro_summary: 'Macro summary', micros_summary: 'Micros',
    n_relation_in_stage: 'N ratio in the stage:',
    n_relation_suffix: '(of total N = NO₃ + NH₄).',
    ternary_diagram: '📐 Ternary diagram (anions + cations)',
    ternary_note: 'Based on <strong>fertilizer + water supply</strong> for the selected stage. Yellow square = anion balance among N-NO₃⁻, P-H₂PO₄⁻ and S-SO₄²⁻ only (100%); Cl⁻ adds to Σ anions and its separate %, without moving the triangle point. Red circle = K⁺, Ca²⁺, Mg²⁺ over K+Ca+Mg. Dragging a marker rebalances the <strong>fertilizer doses of this stage</strong> (water stays fixed).',
    ternary_drag_hint: 'Drag the yellow square (anions) or the red circle (cations): fertilizer doses of this stage update, then % meq, meq/L, ppm and EC.',
    ternary_drag_no_source: 'Those triangle % cannot be reached with the unlocked fertilizers of this stage. Add a source or unlock a product.',
    macro_legend_nh4_cl: 'N-NH₄⁺: % of total cations (K+Ca+Mg+NH₄). Cation ranges ({cations}) apply to the K+Ca+Mg triangle (without NH₄). Cl⁻: % of total anions (NO₃+H₂PO₄+SO₄+Cl); the ternary diagram and {anions} still refer only to N-P-S (without Cl). Water supply comes from the Nutrition Program tab; if it is zero, both tables match.',
    micros_legend: 'Micros ppm use the same irrigation depth ({unit}) for the stage. If water supply in the Nutrition Program tab is zero, both columns match.',
    anions_triangle: 'Anions (triangle)',
    cations_triangle: 'Cations (triangle)',
    cl_outside_triangle: 'of total anions (outside the triangle)',
    nh4_outside_triangle: 'of total cations (outside the triangle)',
    anions_ranges: 'Anions: N-NO₃⁻ 20-80, P-H₂PO₄⁻ 1.25-10, S-SO₄²⁻ 10-70',
    cations_ranges: 'Cations: K⁺ 10-65, Ca²⁺ 22.5-62.5, Mg²⁺ 0.5-40',
    pct_col_hint: 'Triangle anions: 100% among NO₃+H₂PO₄+SO₄. Cl⁻ and NH₄⁺: % of the expanded total (see note). K+Ca+Mg cations: 100% in the triangle.',
    adjust_chart: '✋ Adjust on chart',
    adjust_ternary: '✋ Adjust on triangle',
    finish_chart_adjustment: '✓ Finish adjustment',
    undo: '↶ Undo', restore_original: 'Restore original',
    chart_drag_help: 'Drag a curve point or the yellow square / red circle on the triangle. Fertilizer rates, nutrient supply, ppm, meq/L and ratios will be recalculated. Use 🔒 in the table to freeze a fertilizer.',
    ternary_edit_help: 'Press “Adjust on triangle” to drag the square or the circle and rebalance this stage’s fertilizer doses.',
    chart_adjust_no_source: 'That point cannot be reached with the unlocked fertilizers. Add a nutrient source or unlock a product.',
    chart_lock_fertilizer: 'Open: the chart can adjust this fertilizer',
    chart_unlock_fertilizer: 'Locked: click to allow chart adjustments',
    chart_acid_locked: 'Locked: acid dose comes from water meq × each stage’s irrigation depth. The chart cannot change it.',
    base_fertilization_supply: '🌱 Base fertilization supply',
    bring_from_granular_program: 'Bring from granular program',
    bring_from_granular_title: 'Load the total supply from this project’s Granular Nutrition program',
    select_granular_program: 'Select program…',
    bring_from_granular_hint: 'Loads the total applied in Granular Nutrition; you can also adjust these values manually.',
    granular_program_option: 'Granular program ({count} applications)',
    linked_granular_program: 'Granular program linked',
    no_granular_program: 'No saved granular program in this project',
    total_supply_with_base: '📦 Total supply (program + water + base fertilization)',
    source_share_title: 'Fertigation vs base granular supply',
    source_share_hint: 'Share of fertilizer applied in the cycle (program + granular). Water is not included. Granular N is total N.',
    source_share_ferti: 'Fertigation',
    source_share_granular: 'Base granular nutrition',
    per_week_abbr: '/wk', per_month_abbr: '/mo'
  };
  var CROPS_EN = {
    aguacate:'Avocado', arandano:'Blueberry', banano:'Banana', cana:'Sugarcane', cebolla:'Onion',
    chile:'Green Pepper', fresa:'Strawberry', frambuesa:'Raspberry', lechuga:'Lettuce', limon:'Lemon',
    maiz:'Corn', melon:'Melon', papaya:'Papaya', pepino:'Cucumber', pimiento:'Bell Pepper',
    sandia:'Watermelon', tomate:'Tomato'
  };
  /* Solo nombres descriptivos precargados. Abreviaturas (MAP, MKP, SOP, DAP, NKS…) quedan igual. */
  var MATERIALS_EN = {
    'Fosfonitrato': 'Phosphonitrate',
    'Nitrato de Amonio': 'Ammonium Nitrate',
    'Nitrato de amonio': 'Ammonium Nitrate',
    'Sulfato de Amonio Soluble': 'Soluble Ammonium Sulfate',
    'Sulfato de amonio soluble': 'Soluble Ammonium Sulfate',
    'KCl Soluble': 'Soluble KCl',
    'KCl soluble': 'Soluble KCl',
    'Cloruro de calcio (dihidratado)': 'Calcium Chloride (Dihydrate)',
    'Cloruro de calcio (dih.)': 'Calcium Chloride (Dihydrate)',
    'Nitrato de Calcio': 'Calcium Nitrate',
    'Nitrato de calcio': 'Calcium Nitrate',
    'Nitrato de calcio granular': 'Granular Calcium Nitrate',
    'Nitrato de Calcio Cristal': 'Crystal Calcium Nitrate',
    'Nitrato de calcio cristal': 'Crystal Calcium Nitrate',
    'Nitrato de Magnesio': 'Magnesium Nitrate',
    'Nitrato de magnesio': 'Magnesium Nitrate',
    'Nitrato de Potasio': 'Potassium Nitrate',
    'Nitrato de potasio': 'Potassium Nitrate',
    'Sulfato de Potasio': 'Potassium Sulfate',
    'Sulfato de potasio': 'Potassium Sulfate',
    'Sulfato de Magnesio': 'Magnesium Sulfate',
    'Sulfato de magnesio': 'Magnesium Sulfate',
    'Sulfato de Amonio': 'Ammonium Sulfate',
    'Sulfato de amonio': 'Ammonium Sulfate',
    'Sulfato de Zinc': 'Zinc Sulfate',
    'Sulfato de zinc': 'Zinc Sulfate',
    'Sulfato de Manganeso': 'Manganese Sulfate',
    'Sulfato de manganeso': 'Manganese Sulfate',
    'Sulfato de Hierro': 'Iron Sulfate',
    'Sulfato ferroso': 'Iron Sulfate',
    'Mix Micros EDTA': 'Micros Mix EDTA',
    'Mix micros EDTA': 'Micros Mix EDTA',
    'Ácido Bórico': 'Boric Acid',
    'Ácido bórico': 'Boric Acid',
    'Molibdato de Sodio': 'Sodium Molybdate',
    'Molibdato de sodio': 'Sodium Molybdate',
    'Ácido Sulfúrico 98%': 'Sulfuric Acid 98%',
    'Ácido sulfúrico 98%': 'Sulfuric Acid 98%',
    'Ácido Fosfórico 75%': 'Phosphoric Acid 75%',
    'Ácido fosfórico 75%': 'Phosphoric Acid 75%',
    'Ácido Fosfórico 85%': 'Phosphoric Acid 85%',
    'Ácido fosfórico 85%': 'Phosphoric Acid 85%',
    'Ácido Nítrico 55%': 'Nitric Acid 55%',
    'Ácido nítrico 55%': 'Nitric Acid 55%',
    'Urea': 'Urea'
  };
  var STAGES = {
    Brotación:'bud_break', Establecimiento:'establishment', Vegetativo:'vegetative',
    Prefloración:'preflowering', Floración:'flowering', Amarre:'fruit_set',
    Llenado:'filling', Maduración:'maturity', Cosecha:'harvest'
  };

  var languageOverride = null;
  var unitSystemOverride = null;

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    var language = languageOverride === 'en' || languageOverride === 'es'
      ? languageOverride
      : (p && p.language === 'en' ? 'en' : 'es');
    var unitSystem = unitSystemOverride === 'metric' || unitSystemOverride === 'us_customary'
      ? unitSystemOverride
      : (p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric');
    return {
      language: language,
      unit_system: unitSystem,
      locale: (p && p.locale) || (language === 'en' ? 'en-US' : 'es-MX')
    };
  }
  function runWithOverride(assign, restore, callback) {
    assign();
    try {
      var result = callback();
      if (result && typeof result.then === 'function') {
        return Promise.resolve(result).then(
          function (value) { restore(); return value; },
          function (err) { restore(); return Promise.reject(err); }
        );
      }
      restore();
      return result;
    } catch (e) {
      restore();
      throw e;
    }
  }
  function withLanguage(language, callback) {
    if (language !== 'en' && language !== 'es') throw new TypeError('Idioma no soportado: ' + language);
    var prev = languageOverride;
    return runWithOverride(
      function () { languageOverride = language; },
      function () { languageOverride = prev; },
      callback
    );
  }
  function withUnitSystem(system, callback) {
    if (system !== 'metric' && system !== 'us_customary') {
      throw new TypeError('Sistema de unidades no soportado: ' + system);
    }
    var prev = unitSystemOverride;
    return runWithOverride(
      function () { unitSystemOverride = system; },
      function () { unitSystemOverride = prev; },
      callback
    );
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
  function inputFromSI(value, kind, digits) {
    var d = digits == null ? 4 : Number(digits);
    if (!Number.isFinite(d) || d < 0) d = 4;
    return trim(fromSI(value, kind), d);
  }
  function resultFromSI(value, kind, digits) {
    var d = digits == null ? 2 : Number(digits);
    if (!Number.isFinite(d) || d < 0) d = 2;
    return trim(fromSI(value, kind), d);
  }
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
  /** Eje Y de gráficas de aporte: kg (métrico) o lb (US); valores canónicos = kg/ha. */
  function chartYAxisTitle() {
    return prefs().unit_system === 'us_customary'
      ? t('chart_y_lb', 'Lb de nutriente')
      : t('chart_y_kg', 'Kg de nutriente');
  }
  /** Convierte series canónicas kg/ha → unidad de presentación (lb/acre en US). */
  function chartDoseSeries(values) {
    var list = Array.isArray(values) ? values : [];
    return list.map(function (v) {
      var n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return fromSI(n, 'dose_mass_area');
    });
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

  /**
   * Ajusta una mezcla al nuevo aporte de un nutriente con el menor cambio relativo posible.
   * La igualdad coefficients · amounts = target se respeta y ninguna dosis puede ser negativa.
   * Los coeficientes en cero sirven también para representar fertilizantes bloqueados.
   */
  function adjustBlendToTarget(amounts, coefficients, target) {
    var x = Array.isArray(amounts) ? amounts.map(function (v) {
      v = Number(v);
      return Number.isFinite(v) && v > 0 ? v : 0;
    }) : [];
    var a = Array.isArray(coefficients) ? coefficients.map(function (v) {
      v = Number(v);
      return Number.isFinite(v) && v > 0 ? v : 0;
    }) : [];
    var wanted = Math.max(0, Number(target) || 0);
    if (x.length !== a.length) throw new TypeError('Dosis y coeficientes deben tener la misma longitud.');

    var output = x.slice();
    var free = [];
    for (var i = 0; i < a.length; i += 1) if (a[i] > 1e-12) free.push(i);
    if (!free.length) return { values: output, reachable: false, achieved: 0 };

    /* La movilidad relativa mantiene la proporción de la mezcla existente. Para productos
       todavía en cero deja una movilidad mínima que permite incorporarlos si hacen falta. */
    var mobility = x.map(function (v) { var scale = Math.max(v, 1); return scale * scale; });
    var guard = free.length + 1;
    while (free.length && guard > 0) {
      guard -= 1;
      var baseContribution = 0;
      var denominator = 0;
      free.forEach(function (idx) {
        baseContribution += a[idx] * x[idx];
        denominator += a[idx] * a[idx] * mobility[idx];
      });
      if (denominator <= 1e-18) break;
      var lambda = (wanted - baseContribution) / denominator;
      var negatives = free.filter(function (idx) {
        return x[idx] + lambda * a[idx] * mobility[idx] < 0;
      });
      if (!negatives.length) {
        free.forEach(function (idx) {
          output[idx] = Math.max(0, x[idx] + lambda * a[idx] * mobility[idx]);
        });
        break;
      }
      negatives.forEach(function (idx) { output[idx] = 0; });
      free = free.filter(function (idx) { return negatives.indexOf(idx) === -1; });
      /* Los límites activos quedan en cero; la siguiente proyección parte de las dosis
         originales de las variables que aún están libres. */
    }

    var achieved = output.reduce(function (sum, value, idx) { return sum + value * a[idx]; }, 0);
    var tolerance = Math.max(1e-7, wanted * 1e-7);
    return { values: output, reachable: Math.abs(achieved - wanted) <= tolerance, achieved: achieved };
  }

  function aggregateGranularProgramContribution(program) {
    var totals = {
      N:0, P2O5:0, K2O:0, CaO:0, MgO:0, S:0, SO4:0,
      Fe:0, Mn:0, B:0, Zn:0, Cu:0, Mo:0, SiO2:0, Cl:0
    };
    var applications = program && Array.isArray(program.applications) ? program.applications : [];
    applications.forEach(function (application) {
      var stored = application && application.results && typeof application.results === 'object'
        ? application.results
        : {};
      var hasStored = Object.keys(totals).some(function (key) {
        return (Number(stored[key]) || 0) !== 0;
      }) || (Number(stored.N_NO3) || 0) !== 0 || (Number(stored.N_NH4) || 0) !== 0;
      var result = stored;
      if (!hasStored) {
        var dose = Number(application && application.doseKgHa) || 0;
        var composition = application && application.composition && typeof application.composition === 'object'
          ? application.composition
          : {};
        result = {};
        Object.keys(totals).forEach(function (key) {
          result[key] = dose * (Number(composition[key]) || 0) / 100;
        });
      }
      Object.keys(totals).forEach(function (key) {
        if (key === 'S' || key === 'SO4') return;
        var value = Number(result[key]);
        if (Number.isFinite(value)) totals[key] += value;
      });
      if (!Number.isFinite(Number(result.N))) {
        totals.N += (Number(result.N_NO3) || 0) + (Number(result.N_NH4) || 0);
      }
      totals.SO4 += (Number(result.SO4) || 0) + (Number(result.S) || 0) * 3;
    });
    return totals;
  }

  var NUTRIENT_COLORS = {
    N: '#2563eb', N_NO3: '#2563eb', N_NH4: '#3b82f6',
    P: '#16a34a', P2O5: '#16a34a',
    K: '#ea580c', K2O: '#ea580c',
    Ca: '#7c3aed', CaO: '#7c3aed',
    Mg: '#0891b2', MgO: '#0891b2',
    S: '#d97706', SO4: '#d97706',
    Fe: '#db2777', Mn: '#0d9488', B: '#4f46e5',
    Zn: '#475569', Cu: '#059669', Mo: '#c026d3',
    Si: '#0f766e', SiO2: '#0f766e'
  };
  var NUTRIENT_COLOR_ALIAS = {
    n: 'N', p: 'P2O5', k: 'K2O', ca: 'CaO', mg: 'MgO', s: 'SO4',
    fe: 'Fe', mn: 'Mn', b: 'B', zn: 'Zn', cu: 'Cu', mo: 'Mo', si: 'SiO2'
  };
  function nutrientColor(key) {
    var raw = String(key == null ? '' : key);
    if (NUTRIENT_COLORS[raw]) return NUTRIENT_COLORS[raw];
    var mapped = NUTRIENT_COLOR_ALIAS[raw] || NUTRIENT_COLOR_ALIAS[raw.toLowerCase()];
    if (mapped && NUTRIENT_COLORS[mapped]) return NUTRIENT_COLORS[mapped];
    return '#64748b';
  }

  function nutsFromDiagnostic(row, mode) {
    if (mode === 'excess') {
      var excess = row && row.excess && typeof row.excess === 'object' ? row.excess : {};
      return Object.keys(excess).filter(function (key) {
        return (Number(excess[key]) || 0) > 0.005;
      });
    }
    return Array.isArray(row && row.unresolved) ? row.unresolved.filter(Boolean) : [];
  }

  function isMacroNutrient(nut) {
    return ['N', 'P', 'P2O5', 'K', 'K2O', 'Ca', 'CaO', 'Mg', 'MgO', 'S', 'SO4', 'SO3'].indexOf(String(nut || '')) >= 0;
  }

  function formatNutrientPeriodEntry(nut, info, total) {
    var periodWord = info.count === 1
      ? t('auto_period_one', 'periodo')
      : t('auto_period_many', 'periodos');
    if (info.count === total && total > 1) {
      return nut + ' · ' + t('auto_all_cycle', 'todo el ciclo') + ' (' + info.count + ' ' + periodWord + ')';
    }
    if (info.count === 1) return nut + ' (' + info.names[0] + ')';
    var span = info.names.length === 1
      ? info.names[0]
      : info.names[0] + '–' + info.names[info.names.length - 1];
    return nut + ' · ' + info.count + ' ' + periodWord + ' (' + span + ')';
  }

  function compactNutrientPeriodList(rows, mode) {
    var list = Array.isArray(rows) ? rows : [];
    var total = list.length;
    var byNut = {};
    var order = [];
    list.forEach(function (row, i) {
      nutsFromDiagnostic(row, mode).forEach(function (nut) {
        if (!byNut[nut]) {
          byNut[nut] = { count: 0, names: [] };
          order.push(nut);
        }
        byNut[nut].count += 1;
        var label = String(row && row.name != null ? row.name : '').trim() || String(i + 1);
        label = stageName(label);
        if (byNut[nut].names.indexOf(label) < 0) byNut[nut].names.push(label);
      });
    });
    var macros = [];
    var micros = [];
    order.forEach(function (nut) {
      var text = formatNutrientPeriodEntry(nut, byNut[nut], total);
      if (isMacroNutrient(nut)) macros.push(text);
      else micros.push(text);
    });
    var parts = [];
    if (macros.length) parts.push(t('macros', 'Macros') + ': ' + macros.join(' · '));
    if (micros.length) parts.push(t('micros', 'Micros') + ': ' + micros.join(' · '));
    return parts.join('. ');
  }

  function sourceSharePct(fertilizerKg, granularKg) {
    var f = Math.max(0, Number(fertilizerKg) || 0);
    var g = Math.max(0, Number(granularKg) || 0);
    var t = f + g;
    if (!(t > 1e-12)) return { ferti: null, granular: null };
    var ferti = Math.round((1000 * f) / t) / 10;
    if (ferti > 100) ferti = 100;
    if (ferti < 0) ferti = 0;
    return { ferti: ferti, granular: Math.round((100 - ferti) * 10) / 10 };
  }

  function acidLitersHa(mlPerM3, depthM3ha) {
    return Math.max(0, Number(mlPerM3) || 0) * Math.max(0, Number(depthM3ha) || 0) / 1000;
  }

  return {
    getPrefs:prefs, t:t, unit:unit, fromSI:fromSI, toSI:toSI,
    inputFromSI:inputFromSI, resultFromSI:resultFromSI, quantityFromSI:quantityFromSI,
    cropName:cropName, materialName:materialName, stageName:stageName,
    chartYAxisTitle:chartYAxisTitle, chartDoseSeries:chartDoseSeries,
    concentrationPpmFromDose:concentrationPpmFromDose, doseFromConcentration:doseFromConcentration,
    adjustBlendToTarget:adjustBlendToTarget,
    aggregateGranularProgramContribution:aggregateGranularProgramContribution,
    sourceSharePct: sourceSharePct,
    compactNutrientPeriodList: compactNutrientPeriodList,
    acidLitersHa: acidLitersHa,
    withLanguage: withLanguage,
    withUnitSystem: withUnitSystem,
    nutrientColor: nutrientColor
  };
});
