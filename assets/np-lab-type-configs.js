/**
 * Catálogos compare/review para análisis de lab (no-suelo).
 * Consumido por NpAnalysisCompare.mountLabCompare / openLabReviewModal.
 */
(function (w) {
  'use strict';

  function f(path, label, unit, block, chartable, section, labelEn) {
    return {
      path: path,
      label: label,
      labelEn: labelEn || '',
      labelKey: '',
      unit: unit || 'other',
      block: block,
      chartable: chartable !== false,
      section: section || block,
      tip: label,
      tipEn: labelEn || label
    };
  }

  var SN_FIELDS = [
    f('general.ce', 'CE', 'other', 'general', true, 'general'),
    f('general.ph', 'pH', 'other', 'general', true, 'general'),
    f('general.ras', 'RAS', 'other', 'general', true, 'general'),
    f('cations.k_ppm', 'K', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.ca_ppm', 'Ca', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.mg_ppm', 'Mg', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.na_ppm', 'Na', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.k_meq', 'K', 'meq', 'cations_meq', false, 'cations'),
    f('cations.ca_meq', 'Ca', 'meq', 'cations_meq', false, 'cations'),
    f('cations.mg_meq', 'Mg', 'meq', 'cations_meq', false, 'cations'),
    f('cations.na_meq', 'Na', 'meq', 'cations_meq', false, 'cations'),
    f('anions.no3_ppm', 'N-NO₃', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.po4_ppm', 'P', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.so4_ppm', 'S-SO₄', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.cl_ppm', 'Cl', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.hco3_ppm', 'HCO₃', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.co3_ppm', 'CO₃', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.no3_meq', 'N-NO₃', 'meq', 'anions_meq', false, 'anions'),
    f('anions.po4_meq', 'P', 'meq', 'anions_meq', false, 'anions'),
    f('anions.so4_meq', 'S-SO₄', 'meq', 'anions_meq', false, 'anions'),
    f('anions.cl_meq', 'Cl', 'meq', 'anions_meq', false, 'anions'),
    f('anions.hco3_meq', 'HCO₃', 'meq', 'anions_meq', false, 'anions'),
    f('anions.co3_meq', 'CO₃', 'meq', 'anions_meq', false, 'anions'),
    f('micros.b', 'B', 'ppm', 'micros', true, 'micros'),
    f('micros.fe', 'Fe', 'ppm', 'micros', true, 'micros'),
    f('micros.mn', 'Mn', 'ppm', 'micros', true, 'micros'),
    f('micros.zn', 'Zn', 'ppm', 'micros', true, 'micros'),
    f('micros.cu', 'Cu', 'ppm', 'micros', true, 'micros'),
    f('micros.mo', 'Mo', 'ppm', 'micros', true, 'micros'),
    f('micros.n_nh4', 'N-NH₄', 'ppm', 'micros', true, 'micros')
  ];

  var SN_BLOCKS = [
    { id: 'general', titleKey: 'analysis.block_general', title: 'General (CE / pH / RAS)', chartType: null, chart: false },
    { id: 'cations_ppm', titleKey: 'analysis.block_cations_ppm', title: 'Cationes (ppm)', chartType: 'line', chart: true },
    { id: 'cations_meq', titleKey: 'analysis.block_cations_meq', title: 'Cationes (meq/L)', chartType: null, chart: false },
    { id: 'anions_ppm', titleKey: 'analysis.block_anions_ppm', title: 'Aniones (ppm)', chartType: 'line', chart: true },
    { id: 'anions_meq', titleKey: 'analysis.block_anions_meq', title: 'Aniones (meq/L)', chartType: null, chart: false },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros (ppm)', chartType: 'line', chart: true }
  ];

  var SN_REVIEW_SECTIONS = [
    { id: 'meta', titleKey: 'analysis.review_sec_meta', title: 'General' },
    { id: 'general', titleKey: 'analysis.block_general', title: 'CE / pH / RAS' },
    { id: 'cations', titleKey: 'analysis.block_cations', title: 'Cationes' },
    { id: 'anions', titleKey: 'analysis.block_anions', title: 'Aniones' },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros' }
  ];

  var SN_REVIEW_FIELDS = [
    f('title', 'Título', '', 'meta', false, 'meta'),
    f('date', 'Fecha', '', 'meta', false, 'meta')
  ].concat(SN_FIELDS);

  var PASTA_FIELDS = SN_FIELDS.filter(function (x) {
    return x.path !== 'micros.n_nh4';
  }).map(function (x) {
    if (x.path === 'general.ce') return f('general.cee', 'CE', 'other', 'general', true, 'general');
    if (x.path === 'general.ph') return f('general.phe', 'pH', 'other', 'general', true, 'general');
    return x;
  });

  var PASTA_BLOCKS = SN_BLOCKS.slice();
  var PASTA_REVIEW_SECTIONS = SN_REVIEW_SECTIONS.slice();
  var PASTA_REVIEW_FIELDS = [
    f('title', 'Título', '', 'meta', false, 'meta'),
    f('date', 'Fecha', '', 'meta', false, 'meta')
  ].concat(PASTA_FIELDS);

  var AGUA_FIELDS = [
    f('m3Riego', 'm³ riego', 'm3', 'general', false, 'general'),
    f('acidResidualMeq', 'Residual ácido (meq)', 'meq', 'general', false, 'general'),
    f('general.ce', 'CE', 'other', 'general', true, 'general'),
    f('general.ph', 'pH', 'other', 'general', true, 'general'),
    f('general.ras', 'RAS', 'other', 'general', true, 'general'),
    f('cations.k_ppm', 'K', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.ca_ppm', 'Ca', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.mg_ppm', 'Mg', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.na_ppm', 'Na', 'ppm', 'cations_ppm', true, 'cations'),
    f('cations.k_meq', 'K', 'meq', 'cations_meq', false, 'cations'),
    f('cations.ca_meq', 'Ca', 'meq', 'cations_meq', false, 'cations'),
    f('cations.mg_meq', 'Mg', 'meq', 'cations_meq', false, 'cations'),
    f('cations.na_meq', 'Na', 'meq', 'cations_meq', false, 'cations'),
    f('anions.no3_ppm', 'N-NO₃', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.po4_ppm', 'P', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.so4_ppm', 'S-SO₄', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.cl_ppm', 'Cl', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.hco3_ppm', 'HCO₃', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.co3_ppm', 'CO₃', 'ppm', 'anions_ppm', true, 'anions'),
    f('anions.no3_meq', 'N-NO₃', 'meq', 'anions_meq', false, 'anions'),
    f('anions.po4_meq', 'P', 'meq', 'anions_meq', false, 'anions'),
    f('anions.so4_meq', 'S-SO₄', 'meq', 'anions_meq', false, 'anions'),
    f('anions.cl_meq', 'Cl', 'meq', 'anions_meq', false, 'anions'),
    f('anions.hco3_meq', 'HCO₃', 'meq', 'anions_meq', false, 'anions'),
    f('anions.co3_meq', 'CO₃', 'meq', 'anions_meq', false, 'anions'),
    f('micros.b', 'B', 'ppm', 'micros', true, 'micros'),
    f('micros.fe', 'Fe', 'ppm', 'micros', true, 'micros'),
    f('micros.mn', 'Mn', 'ppm', 'micros', true, 'micros'),
    f('micros.zn', 'Zn', 'ppm', 'micros', true, 'micros'),
    f('micros.cu', 'Cu', 'ppm', 'micros', true, 'micros')
  ];

  var AGUA_BLOCKS = SN_BLOCKS.slice();
  var AGUA_REVIEW_SECTIONS = SN_REVIEW_SECTIONS.slice();
  var AGUA_REVIEW_FIELDS = [
    f('title', 'Título', '', 'meta', false, 'meta'),
    f('date', 'Fecha', '', 'meta', false, 'meta')
  ].concat(AGUA_FIELDS);

  var FOLIAR_FIELDS = [
    f('macros.N', 'N', 'pct', 'macros', true, 'macros'),
    f('macros.P', 'P', 'pct', 'macros', true, 'macros'),
    f('macros.K', 'K', 'pct', 'macros', true, 'macros'),
    f('macros.Ca', 'Ca', 'pct', 'macros', true, 'macros'),
    f('macros.Mg', 'Mg', 'pct', 'macros', true, 'macros'),
    f('macros.S', 'S', 'pct', 'macros', true, 'macros'),
    f('micros.Fe', 'Fe', 'ppm', 'micros', true, 'micros'),
    f('micros.Mn', 'Mn', 'ppm', 'micros', true, 'micros'),
    f('micros.Zn', 'Zn', 'ppm', 'micros', true, 'micros'),
    f('micros.Cu', 'Cu', 'ppm', 'micros', true, 'micros'),
    f('micros.B', 'B', 'ppm', 'micros', true, 'micros'),
    f('micros.Mo', 'Mo', 'ppm', 'micros', true, 'micros')
  ];

  var FOLIAR_BLOCKS = [
    { id: 'macros', titleKey: 'analysis.block_macros_pct', title: 'Macros (% MS)', chartType: 'line', chart: true },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros (ppm)', chartType: 'line', chart: true }
  ];

  var FOLIAR_REVIEW_SECTIONS = [
    { id: 'meta', titleKey: 'analysis.review_sec_meta', title: 'General', titleEn: 'General' },
    { id: 'macros', titleKey: 'analysis.block_macros_pct', title: 'Macros (% MS)', titleEn: 'Macros (% DM)' },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros (ppm)', titleEn: 'Micros (ppm)' }
  ];

  var FOLIAR_REVIEW_FIELDS = [
    f('title', 'Título', '', 'meta', false, 'meta', 'Title'),
    f('date', 'Fecha', '', 'meta', false, 'meta', 'Date')
  ].concat(FOLIAR_FIELDS);

  var FRUTA_FIELDS = FOLIAR_FIELDS.concat([
    f('calidad.materiaSeca', 'Materia seca', 'pct', 'calidad', true, 'calidad', 'Dry matter'),
    f('calidad.brix', '°Brix', 'brix', 'calidad', true, 'calidad', '°Brix'),
    f('calidad.firmeza', 'Firmeza', 'kgcm2', 'calidad', true, 'calidad', 'Firmness'),
    f('calidad.acidezTitulable', 'Acidez titulable', 'pct', 'calidad', true, 'calidad', 'Titratable acidity'),
    f('calcio.caTotal', 'Ca total', 'mg100g', 'calcio', true, 'calcio', 'Total Ca'),
    f('calcio.caSolublePct', 'Ca soluble', 'pct', 'calcio', true, 'calcio', 'Soluble Ca'),
    f('calcio.caLigadoPct', 'Ca ligado', 'pct', 'calcio', true, 'calcio', 'Bound Ca'),
    f('calcio.caInsolublePct', 'Ca insoluble', 'pct', 'calcio', true, 'calcio', 'Insoluble Ca')
  ]);

  var FRUTA_BLOCKS = [
    { id: 'macros', titleKey: 'analysis.block_macros_pct', title: 'Macros (%)', titleEn: 'Macros (%)', chartType: 'line', chart: true },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros (ppm)', titleEn: 'Micros (ppm)', chartType: 'line', chart: true },
    { id: 'calidad', titleKey: 'analysis.block_calidad', title: 'Calidad', titleEn: 'Quality', chartType: 'bar', chart: true },
    { id: 'calcio', titleKey: 'analysis.block_calcio_fruta', title: 'Calcio fruta', titleEn: 'Fruit calcium', chartType: 'bar', chart: true }
  ];

  var FRUTA_REVIEW_SECTIONS = FOLIAR_REVIEW_SECTIONS.concat([
    { id: 'calidad', titleKey: 'analysis.block_calidad', title: 'Calidad', titleEn: 'Quality' },
    { id: 'calcio', titleKey: 'analysis.block_calcio_fruta', title: 'Calcio fruta', titleEn: 'Fruit calcium' }
  ]);

  var FRUTA_REVIEW_FIELDS = [
    f('title', 'Título', '', 'meta', false, 'meta', 'Title'),
    f('date', 'Fecha', '', 'meta', false, 'meta', 'Date')
  ].concat(FRUTA_FIELDS);

  var CONFIGS = {
    solucion_nutritiva: {
      id: 'solucion_nutritiva',
      aliases: ['sn', 'solucion', 'nutrient_solution'],
      fields: SN_FIELDS,
      blocks: SN_BLOCKS,
      reviewSections: SN_REVIEW_SECTIONS,
      reviewFields: SN_REVIEW_FIELDS,
      hint:
        'Cada columna es un análisis. Activa los que quieras comparar. Gráficas: cationes ppm, aniones ppm y micros.',
      reviewTitle: 'Revisar datos detectados (solución nutritiva)'
    },
    extracto_pasta: {
      id: 'extracto_pasta',
      aliases: ['pasta', 'ep', 'paste'],
      fields: PASTA_FIELDS,
      blocks: PASTA_BLOCKS,
      reviewSections: PASTA_REVIEW_SECTIONS,
      reviewFields: PASTA_REVIEW_FIELDS,
      hint:
        'Cada columna es un extracto de pasta. Gráficas: cationes ppm, aniones ppm y micros.',
      reviewTitle: 'Revisar datos detectados (extracto de pasta)'
    },
    agua: {
      id: 'agua',
      aliases: ['water', 'aw'],
      fields: AGUA_FIELDS,
      blocks: AGUA_BLOCKS,
      reviewSections: AGUA_REVIEW_SECTIONS,
      reviewFields: AGUA_REVIEW_FIELDS,
      hint:
        'Cada columna es un análisis de agua. Gráficas: cationes ppm, aniones ppm y micros.',
      reviewTitle: 'Revisar datos detectados (agua)'
    },
    foliar: {
      id: 'foliar',
      aliases: ['leaf', 'foliage'],
      fields: FOLIAR_FIELDS,
      blocks: FOLIAR_BLOCKS,
      reviewSections: FOLIAR_REVIEW_SECTIONS,
      reviewFields: FOLIAR_REVIEW_FIELDS,
      hint:
        'Cada columna es un análisis foliar. Gráficas: macros (% MS) y micros (ppm).',
      reviewTitle: 'Revisar datos detectados (foliar)'
    },
    fruta: {
      id: 'fruta',
      aliases: ['fruit'],
      fields: FRUTA_FIELDS,
      blocks: FRUTA_BLOCKS,
      reviewSections: FRUTA_REVIEW_SECTIONS,
      reviewFields: FRUTA_REVIEW_FIELDS,
      hint:
        'Cada columna es un análisis de fruta. Gráficas: macros (%), micros (ppm), calidad y calcio.',
      reviewTitle: 'Revisar datos detectados (fruta)',
      reviewTitleEn: 'Review detected data (fruit)'
    }
  };

  function resolveType(type) {
    var t = String(type || '').trim().toLowerCase();
    if (CONFIGS[t]) return CONFIGS[t];
    var keys = Object.keys(CONFIGS);
    for (var i = 0; i < keys.length; i++) {
      var cfg = CONFIGS[keys[i]];
      if ((cfg.aliases || []).indexOf(t) >= 0) return cfg;
    }
    return null;
  }

  w.NpLabTypeConfigs = {
    CONFIGS: CONFIGS,
    resolveType: resolveType
  };
})(typeof window !== 'undefined' ? window : this);
