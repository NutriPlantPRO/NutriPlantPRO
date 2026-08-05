/**
 * Comparación multi-análisis + catálogo de campos (fase 1: suelo).
 * También helpers de UI para revisión PDF → campos.
 */
(function (w) {
  'use strict';

  var CHART_COLORS = [
    '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777',
    '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#059669'
  ];

  function analysisColor(index) {
    return CHART_COLORS[(Number(index) || 0) % CHART_COLORS.length];
  }

  /** Fondo tenue a partir del color de gráfica (hex #rrggbb). */
  function analysisColorWash(color, alphaHex) {
    var c = String(color || '#2563eb');
    if (c.charAt(0) === '#' && (c.length === 7 || c.length === 4)) {
      return c + (alphaHex || '1a');
    }
    return c;
  }

  var SOIL_FIELDS = [
    { path: 'phSection.ph', labelKey: 'analysis.f_ph', label: 'pH', unit: 'other', chartable: true, block: 'ph' },
    { path: 'phSection.phBuffer', labelKey: 'analysis.f_ph_buffer', label: 'pH Buffer', unit: 'other', chartable: true, block: 'ph' },
    { path: 'phSection.totalCarbonates', labelKey: 'analysis.f_carbonates', label: 'Carbonatos totales', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'phSection.salinity', labelKey: 'analysis.f_ec', label: 'CE (dS/m)', unit: 'other', chartable: true, block: 'physical' },
    { path: 'physical.saturationPoint', labelKey: 'analysis.f_sat_point', label: 'Punto saturación', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'physical.fieldCapacity', labelKey: 'analysis.f_field_cap', label: 'Capacidad de campo', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'physical.wiltingPoint', labelKey: 'analysis.f_wilting', label: 'Punto marchitez', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'physical.bulkDensity', labelKey: 'analysis.f_bulk_density', label: 'Densidad aparente', unit: 'other', chartable: true, block: 'physical' },
    { path: 'physical.hydraulicConductivity', labelKey: 'analysis.f_hydr_cond', label: 'Cond. hidráulica', unit: 'other', chartable: true, block: 'physical' },
    { path: 'fertility.mo', labelKey: 'analysis.f_om', label: 'MO', unit: 'pct', chartable: true, block: 'physical' },
    { path: 'fertility.nNo3', labelKey: 'analysis.f_n_no3', label: 'N-NO₃', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.p', labelKey: 'analysis.f_p', label: 'P', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.k', labelKey: 'analysis.f_k', label: 'K', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.ca', labelKey: 'analysis.f_ca', label: 'Ca', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.mg', labelKey: 'analysis.f_mg', label: 'Mg', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.na', labelKey: 'analysis.f_na', label: 'Na', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.s', labelKey: 'analysis.f_s', label: 'S', unit: 'ppm', chartable: true, block: 'macros' },
    { path: 'fertility.fe', labelKey: 'analysis.f_fe', label: 'Fe', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.mn', labelKey: 'analysis.f_mn', label: 'Mn', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.b', labelKey: 'analysis.f_b', label: 'B', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.zn', labelKey: 'analysis.f_zn', label: 'Zn', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.cu', labelKey: 'analysis.f_cu', label: 'Cu', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.moly', labelKey: 'analysis.f_mo', label: 'Mo', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'fertility.al', labelKey: 'analysis.f_al', label: 'Al', unit: 'ppm', chartable: true, block: 'micros' },
    { path: 'cations.ca', labelKey: 'analysis.f_ca_meq', label: 'Ca', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.mg', labelKey: 'analysis.f_mg_meq', label: 'Mg', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.k', labelKey: 'analysis.f_k_meq', label: 'K', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.na', labelKey: 'analysis.f_na_meq', label: 'Na', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.cic', labelKey: 'analysis.f_cec', label: 'CIC', unit: 'meq', chartable: false, block: 'cations' },
    { path: 'cations.pctCa', labelKey: 'analysis.f_pct_ca', label: '% Ca', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'cations.pctMg', labelKey: 'analysis.f_pct_mg', label: '% Mg', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'cations.pctK', labelKey: 'analysis.f_pct_k', label: '% K', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'cations.pctNa', labelKey: 'analysis.f_pct_na', label: '% Na', unit: 'pct', chartable: true, block: 'cec_pct' },
    { path: 'ratios.caMg', labelKey: 'analysis.f_ratio_ca_mg', label: 'Ca/Mg', unit: 'other', chartable: false, block: 'ratios' },
    { path: 'ratios.mgK', labelKey: 'analysis.f_ratio_mg_k', label: 'Mg/K', unit: 'other', chartable: false, block: 'ratios' },
    { path: 'ratios.caMgK', labelKey: 'analysis.f_ratio_ca_mg_k', label: '(Ca+Mg)/K', unit: 'other', chartable: false, block: 'ratios' },
    { path: 'ratios.caK', labelKey: 'analysis.f_ratio_ca_k', label: 'Ca/K', unit: 'other', chartable: false, block: 'ratios' }
  ];

  /** Orden y metadatos de bloques (tabla + gráficas). */
  var SOIL_BLOCKS = [
    { id: 'ph', titleKey: 'analysis.block_ph', title: 'pH', chartType: null, chart: false },
    { id: 'physical', titleKey: 'analysis.block_physical', title: 'Físicos / salinidad / MO', chartType: null, chart: false },
    { id: 'macros', titleKey: 'analysis.block_macros', title: 'Macros (ppm)', chartType: 'line', chart: true },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros (ppm)', chartType: 'line', chart: true },
    { id: 'cec_pct', titleKey: 'analysis.block_cec_pct', title: '% saturación CIC', chartType: 'bar', chart: true },
    { id: 'cations', titleKey: 'analysis.block_cations', title: 'Cationes (meq) / CIC', chartType: null, chart: false },
    { id: 'ratios', titleKey: 'analysis.block_ratios', title: 'Relaciones', chartType: null, chart: false }
  ];

  /** Campos de revisión PDF: sección (como las tablas del análisis) + unidad + tip. */
  var SOIL_REVIEW_SECTIONS = [
    { id: 'meta', titleKey: 'analysis.review_sec_meta', title: 'General' },
    { id: 'physical', titleKey: 'analysis.block_physical', title: 'Físicos / salinidad / MO' },
    { id: 'ph', titleKey: 'analysis.block_ph', title: 'pH' },
    { id: 'macros', titleKey: 'analysis.block_macros', title: 'Macros (ppm)' },
    { id: 'micros', titleKey: 'analysis.block_micros', title: 'Micros (ppm)' },
    { id: 'cations', titleKey: 'analysis.block_cations', title: 'Cationes (meq) / CIC' },
    { id: 'cec_pct', titleKey: 'analysis.block_cec_pct', title: '% saturación CIC' }
  ];

  var SOIL_REVIEW_FIELDS = [
    { path: 'title', labelKey: 'analysis.f_title', label: 'Título', section: 'meta', unit: '', tipKey: 'analysis.unit_tip_text', tip: 'Texto libre (lab, predio o cliente)' },
    { path: 'date', labelKey: 'analysis.f_date', label: 'Fecha', section: 'meta', unit: '', tipKey: 'analysis.unit_tip_date', tip: 'Fecha del informe (YYYY-MM-DD)' },
    { path: 'physical.texturalClass', labelKey: 'analysis.f_texture', label: 'Clase textural', section: 'physical', unit: '', tipKey: 'analysis.unit_tip_texture', tip: 'Clase textural (ej. Franco, Arenoso)' },
    { path: 'physical.saturationPoint', labelKey: 'analysis.f_sat_point', label: 'Punto saturación', section: 'physical', unit: '%', tipKey: 'analysis.unit_tip_pct_water', tip: 'Porcentaje de humedad a saturación' },
    { path: 'physical.fieldCapacity', labelKey: 'analysis.f_field_cap', label: 'Capacidad de campo', section: 'physical', unit: '%', tipKey: 'analysis.unit_tip_pct_water', tip: 'Porcentaje de humedad a capacidad de campo' },
    { path: 'physical.wiltingPoint', labelKey: 'analysis.f_wilting', label: 'Punto marchitez', section: 'physical', unit: '%', tipKey: 'analysis.unit_tip_pct_water', tip: 'Porcentaje de humedad en punto de marchitez permanente' },
    { path: 'physical.hydraulicConductivity', labelKey: 'analysis.f_hydr_cond', label: 'Cond. hidráulica', section: 'physical', unit: 'cm/h', tipKey: 'analysis.unit_tip_cm_h', tip: 'Conductividad hidráulica saturada en centímetros por hora' },
    { path: 'physical.bulkDensity', labelKey: 'analysis.f_bulk_density', label: 'Densidad aparente', section: 'physical', unit: 'g/cm³', tipKey: 'analysis.unit_tip_bd', tip: 'Densidad aparente del suelo en gramos por centímetro cúbico' },
    { path: 'phSection.totalCarbonates', labelKey: 'analysis.f_carbonates', label: 'Carbonatos totales', section: 'physical', unit: '%', tipKey: 'analysis.unit_tip_pct', tip: 'Porcentaje de carbonatos totales' },
    { path: 'phSection.salinity', labelKey: 'analysis.f_ec', label: 'CE', section: 'physical', unit: 'dS/m', tipKey: 'analysis.unit_tip_ec', tip: 'Conductividad eléctrica (salinidad); dS/m = mmhos/cm' },
    { path: 'fertility.mo', labelKey: 'analysis.f_om', label: 'MO', section: 'physical', unit: '%', tipKey: 'analysis.unit_tip_om', tip: 'Materia orgánica en porcentaje' },
    { path: 'fertility.depthCm', labelKey: 'analysis.f_depth', label: 'Profundidad', section: 'physical', unit: 'cm', tipKey: 'analysis.unit_tip_cm', tip: 'Profundidad de muestreo en centímetros (canónico NutriPlant)' },
    { path: 'fertility.pMethod', labelKey: 'analysis.f_p_method', label: 'Método P', section: 'physical', unit: '', tipKey: 'analysis.unit_tip_p_method', tip: 'Método de extracción de P (Olsen, Bray, Mehlich…)' },
    { path: 'phSection.ph', labelKey: 'analysis.f_ph', label: 'pH', section: 'ph', unit: 'pH', tipKey: 'analysis.unit_tip_ph', tip: 'pH del suelo (sin unidad; escala 0–14)' },
    { path: 'phSection.phBuffer', labelKey: 'analysis.f_ph_buffer', label: 'pH Buffer', section: 'ph', unit: 'pH', tipKey: 'analysis.unit_tip_ph_buf', tip: 'pH buffer / SMP si el lab lo reporta' },
    { path: 'fertility.nNo3', labelKey: 'analysis.f_n_no3', label: 'N-NO₃', section: 'macros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Nitrógeno nítrico elemental en ppm (mg/kg)' },
    { path: 'fertility.p', labelKey: 'analysis.f_p', label: 'P', section: 'macros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Fósforo elemental en ppm (mg/kg)' },
    { path: 'fertility.k', labelKey: 'analysis.f_k', label: 'K', section: 'macros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Potasio elemental en ppm (mg/kg)' },
    { path: 'fertility.ca', labelKey: 'analysis.f_ca', label: 'Ca', section: 'macros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Calcio elemental en ppm (mg/kg)' },
    { path: 'fertility.mg', labelKey: 'analysis.f_mg', label: 'Mg', section: 'macros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Magnesio elemental en ppm (mg/kg)' },
    { path: 'fertility.na', labelKey: 'analysis.f_na', label: 'Na', section: 'macros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Sodio elemental en ppm (mg/kg)' },
    { path: 'fertility.s', labelKey: 'analysis.f_s', label: 'S', section: 'macros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Azufre elemental en ppm (mg/kg)' },
    { path: 'fertility.fe', labelKey: 'analysis.f_fe', label: 'Fe', section: 'micros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Hierro en ppm (mg/kg)' },
    { path: 'fertility.mn', labelKey: 'analysis.f_mn', label: 'Mn', section: 'micros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Manganeso en ppm (mg/kg)' },
    { path: 'fertility.b', labelKey: 'analysis.f_b', label: 'B', section: 'micros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Boro en ppm (mg/kg)' },
    { path: 'fertility.zn', labelKey: 'analysis.f_zn', label: 'Zn', section: 'micros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Zinc en ppm (mg/kg)' },
    { path: 'fertility.cu', labelKey: 'analysis.f_cu', label: 'Cu', section: 'micros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Cobre en ppm (mg/kg)' },
    { path: 'fertility.moly', labelKey: 'analysis.f_mo', label: 'Mo', section: 'micros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Molibdeno en ppm (mg/kg)' },
    { path: 'fertility.al', labelKey: 'analysis.f_al', label: 'Al', section: 'micros', unit: 'ppm', tipKey: 'analysis.unit_tip_ppm', tip: 'Aluminio en ppm (mg/kg) — fertilidad, no meq' },
    { path: 'cations.ca', labelKey: 'analysis.f_ca_meq', label: 'Ca', section: 'cations', unit: 'meq', tipKey: 'analysis.unit_tip_meq', tip: 'Calcio intercambiable en meq/100g (o cmol⁺/kg)' },
    { path: 'cations.mg', labelKey: 'analysis.f_mg_meq', label: 'Mg', section: 'cations', unit: 'meq', tipKey: 'analysis.unit_tip_meq', tip: 'Magnesio intercambiable en meq/100g (o cmol⁺/kg)' },
    { path: 'cations.k', labelKey: 'analysis.f_k_meq', label: 'K', section: 'cations', unit: 'meq', tipKey: 'analysis.unit_tip_meq', tip: 'Potasio intercambiable en meq/100g (o cmol⁺/kg)' },
    { path: 'cations.na', labelKey: 'analysis.f_na_meq', label: 'Na', section: 'cations', unit: 'meq', tipKey: 'analysis.unit_tip_meq', tip: 'Sodio intercambiable en meq/100g (o cmol⁺/kg)' },
    { path: 'cations.al', labelKey: 'analysis.f_al_meq', label: 'Al', section: 'cations', unit: 'meq', tipKey: 'analysis.unit_tip_meq', tip: 'Aluminio intercambiable en meq/100g' },
    { path: 'cations.h', labelKey: 'analysis.f_h_meq', label: 'H', section: 'cations', unit: 'meq', tipKey: 'analysis.unit_tip_meq', tip: 'Hidrógeno intercambiable en meq/100g' },
    { path: 'cations.cic', labelKey: 'analysis.f_cec', label: 'CIC', section: 'cations', unit: 'meq', tipKey: 'analysis.unit_tip_cec', tip: 'Capacidad de intercambio catiónico en meq/100g (CEC)' },
    { path: 'cations.pctCa', labelKey: 'analysis.f_pct_ca', label: '% Ca', section: 'cec_pct', unit: '%', tipKey: 'analysis.unit_tip_pct_sat', tip: 'Porcentaje de saturación de bases — calcio' },
    { path: 'cations.pctMg', labelKey: 'analysis.f_pct_mg', label: '% Mg', section: 'cec_pct', unit: '%', tipKey: 'analysis.unit_tip_pct_sat', tip: 'Porcentaje de saturación de bases — magnesio' },
    { path: 'cations.pctK', labelKey: 'analysis.f_pct_k', label: '% K', section: 'cec_pct', unit: '%', tipKey: 'analysis.unit_tip_pct_sat', tip: 'Porcentaje de saturación de bases — potasio' },
    { path: 'cations.pctNa', labelKey: 'analysis.f_pct_na', label: '% Na', section: 'cec_pct', unit: '%', tipKey: 'analysis.unit_tip_pct_sat', tip: 'Porcentaje de saturación de bases — sodio' }
  ];

  function isEnLang() {
    try {
      if (w.NpI18n && typeof w.NpI18n.getLanguage === 'function') {
        return String(w.NpI18n.getLanguage() || '').toLowerCase().indexOf('en') === 0;
      }
      var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : null;
      return !!(p && p.language === 'en');
    } catch (e) {
      return false;
    }
  }

  function fieldLabel(field) {
    if (!field) return '';
    if (field.labelKey) {
      var viaKey = tr(field.labelKey, '');
      if (viaKey && viaKey !== field.labelKey) return viaKey;
    }
    if (isEnLang() && field.labelEn) return field.labelEn;
    return field.label || field.path || '';
  }

  function sectionTitle(sec) {
    if (!sec) return '';
    if (sec.titleKey) {
      var viaKey = tr(sec.titleKey, '');
      if (viaKey && viaKey !== sec.titleKey) return viaKey;
    }
    if (isEnLang() && sec.titleEn) return sec.titleEn;
    return sec.title || sec.id || '';
  }

  function unitSuffix(unit) {
    if (!unit || unit === 'other') return '';
    if (unit === 'pct') return ' (%)';
    if (unit === 'ppm') return ' (ppm)';
    if (unit === 'meq') return ' (meq)';
    if (unit === 'brix') return ' (°Brix)';
    if (unit === 'kgcm2') return ' (kg/cm²)';
    if (unit === 'psi') return ' (psi)';
    if (unit === 'mg100g') return ' (mg/100 g)';
    // Si ya es un símbolo legible (%, °Brix…), úsalo directo
    if (/[%°]|ppm|meq|kg|psi|g\b/i.test(String(unit))) {
      return ' (' + String(unit) + ')';
    }
    return '';
  }

  function chartLabelForRow(row) {
    var base = row.label || '';
    // Evitar duplicar unidad si el label ya la trae
    if (/\(%\)|°Brix|\(kg\/cm| \(psi\)|\(mg\/100|\(ppm\)|\(meq\)/i.test(base)) return base;
    if (row.unit === 'brix' && /brix/i.test(base)) return base;
    return base + unitSuffix(row.unit);
  }

  function getByPath(obj, path) {
    if (!obj || !path) return '';
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return '';
      cur = cur[parts[i]];
    }
    if (cur === null || cur === undefined) return '';
    return cur;
  }

  function setByPath(obj, path, value) {
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function numOrNull(v) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /** CEC % y relaciones: 2 decimales; el resto sin forzar (labs ya vienen redondeados). */
  function formatCompareValue(v, row) {
    if (v == null || !Number.isFinite(v)) return '—';
    var block = row && row.block;
    if (block === 'cec_pct' || block === 'ratios' || (row && row.unit === 'pct')) {
      return Number(v).toFixed(2);
    }
    return String(v);
  }

  function tr(key, fallback, params) {
    try {
      if (w.NpI18n && typeof w.NpI18n.t === 'function') {
        var out = w.NpI18n.t(key, params);
        if (out && out !== key) return out;
      }
    } catch (e) {}
    var s = fallback || key;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (k) {
        s = String(s).replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
      });
    }
    return s;
  }

  function analysisLabel(a, index) {
    var title = (a && a.title) ? String(a.title).trim() : '';
    var d = (a && a.date) ? String(a.date).trim() : '';
    if (title && d) return title + ' · ' + d;
    if (title) return title;
    if (d) return d;
    return tr('analysis.analysis_n', 'Análisis {n}', { n: index + 1 });
  }

  /** Cabecera de columna en 1–2 renglones (título / fecha) para no alargar la tabla. */
  function fillAnalysisColumnHeader(th, a, index, opts) {
    opts = opts || {};
    th.classList.add('np-analysis-compare__th-analysis');
    th.title = analysisLabel(a, index);
    var title = (a && a.title) ? String(a.title).trim() : '';
    var d = (a && a.date) ? String(a.date).trim() : '';
    th.textContent = '';
    if (title && d) {
      var tEl = document.createElement('span');
      tEl.className = 'np-analysis-compare__th-title';
      tEl.textContent = title;
      var dEl = document.createElement('span');
      dEl.className = 'np-analysis-compare__th-date';
      dEl.textContent = d;
      th.appendChild(tEl);
      th.appendChild(dEl);
    } else {
      var one = document.createElement('span');
      one.className = 'np-analysis-compare__th-title';
      one.textContent = title || d || tr('analysis.analysis_n', 'Análisis {n}', { n: index + 1 });
      th.appendChild(one);
    }
    var color = analysisColor(index);
    th.style.color = color;
    th.style.borderTop = '3px solid ' + color;
    if (opts.on) {
      th.style.background = analysisColorWash(color, '18');
      th.style.opacity = '1';
    } else {
      th.style.background = '#f8fafc';
      th.style.opacity = '0.72';
    }
  }

  function buildCompareRows(analyses, catalog) {
    catalog = catalog || SOIL_FIELDS;
    analyses = Array.isArray(analyses) ? analyses : [];
    var usFirm = !!(w.NpAnalysisUI && typeof w.NpAnalysisUI.isUS === 'function' && w.NpAnalysisUI.isUS());
    return catalog.map(function (field) {
      var unit = field.unit || 'other';
      var label = fieldLabel(field);
      var values = analyses.map(function (a) {
        var raw = getByPath(a, field.path);
        if (field.path === 'calidad.firmeza' && usFirm) {
          var n = numOrNull(raw);
          return n == null ? null : n * 14.223343307;
        }
        return numOrNull(raw);
      });
      if (field.path === 'calidad.firmeza' && usFirm) {
        unit = 'psi';
        label = isEnLang() ? 'Firmness' : 'Firmeza';
      }
      return {
        path: field.path,
        label: label,
        unit: unit,
        chartable: field.chartable !== false,
        block: field.block || 'other',
        values: values
      };
    });
  }

  function ensureChartJs(cb) {
    if (w.Chart) {
      cb();
      return;
    }
    var existing = document.querySelector('script[data-np-chartjs]');
    if (existing) {
      existing.addEventListener('load', function () { cb(); });
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.async = true;
    s.setAttribute('data-np-chartjs', '1');
    s.onload = function () { cb(); };
    document.head.appendChild(s);
  }

  function destroyCharts(state) {
    if (!state) return;
    if (state.charts) {
      Object.keys(state.charts).forEach(function (id) {
        try { state.charts[id].destroy(); } catch (e) {}
      });
    }
    state.charts = {};
    if (state.chart) {
      try { state.chart.destroy(); } catch (e) {}
      state.chart = null;
    }
  }

  function selectedAnalyses(analyses, selectedIds) {
    var selected = [];
    analyses.forEach(function (a, idx) {
      if (selectedIds[a.id]) selected.push({ analysis: a, index: idx });
    });
    return selected;
  }

  function yAxisTitleForRows(rows) {
    var units = {};
    var count = 0;
    rows.forEach(function (r) {
      var u = r.unit || 'other';
      if (!units[u]) {
        units[u] = true;
        count += 1;
      }
    });
    // Unidades mezcladas (ej. calidad fruta: %, °Brix, firmeza): sin título genérico engañoso
    if (count > 1) return '';
    if (units.pct) return '%';
    if (units.ppm) return 'ppm';
    if (units.meq) return 'meq';
    if (units.brix) return '°Brix';
    if (units.kgcm2) return 'kg/cm²';
    if (units.psi) return 'psi';
    if (units.mg100g) return 'mg/100 g';
    return tr('analysis.compare_axis_value', 'Valor');
  }

  function renderBlockChart(canvas, rows, analyses, selectedIds, chartType, chartKey, state) {
    if (!canvas || !w.Chart) return;
    if (state.charts && state.charts[chartKey]) {
      try { state.charts[chartKey].destroy(); } catch (e) {}
      delete state.charts[chartKey];
    }
    var selected = selectedAnalyses(analyses, selectedIds);
    if (!selected.length) return;

    var chartRows = rows.filter(function (r) {
      return r.chartable !== false && r.values.some(function (v) { return v != null; });
    });
    if (!chartRows.length) return;

    var labels = chartRows.map(function (r) {
      return chartLabelForRow(r);
    });
    var isBar = chartType === 'bar';
    var datasets = selected.map(function (item) {
      var color = analysisColor(item.index);
      return {
        label: analysisLabel(item.analysis, item.index),
        data: chartRows.map(function (r) {
          var v = r.values[item.index];
          return v == null ? null : v;
        }),
        borderColor: color,
        backgroundColor: isBar ? color + 'cc' : color + '33',
        borderWidth: isBar ? 1 : 2,
        tension: 0.25,
        spanGaps: true,
        fill: false,
        maxBarThickness: 28
      };
    });

    if (!state.charts) state.charts = {};
    state.charts[chartKey] = new w.Chart(canvas.getContext('2d'), {
      type: isBar ? 'bar' : 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed.y;
                if (v == null) return ctx.dataset.label + ': —';
                var rowMeta = chartRows[ctx.dataIndex];
                return ctx.dataset.label + ': ' + formatCompareValue(v, rowMeta);
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { maxRotation: 50, minRotation: 20, font: { size: 9 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: (function () {
              var yt = yAxisTitleForRows(chartRows);
              return { display: !!yt, text: yt || '', font: { size: 11 } };
            })()
          }
        }
      }
    });
  }

  function getTypeConfig(type) {
    if (type === 'soil' || type === 'suelo') {
      return {
        id: 'soil',
        fields: SOIL_FIELDS,
        blocks: SOIL_BLOCKS,
        reviewSections: SOIL_REVIEW_SECTIONS,
        reviewFields: SOIL_REVIEW_FIELDS,
        hint:
          'Cada columna es un análisis. Activa los que quieras comparar. pH y físicos/MO solo en tabla; gráficas: macros, micros y % CIC.',
        reviewTitle: 'Revisar datos detectados (suelo)',
        canvasPrefix: 'npSoilChart_'
      };
    }
    var cfg =
      w.NpLabTypeConfigs && typeof w.NpLabTypeConfigs.resolveType === 'function'
        ? w.NpLabTypeConfigs.resolveType(type)
        : null;
    if (!cfg) return null;
    return Object.assign({ canvasPrefix: 'npLabChart_' + cfg.id + '_' }, cfg);
  }

  function mountLabCompare(host, options) {
    options = options || {};
    if (!host) return null;
    var typeCfg = getTypeConfig(options.type || 'soil');
    if (!typeCfg) {
      console.warn('NpAnalysisCompare.mountLabCompare: tipo desconocido', options.type);
      return null;
    }
    var fieldsCatalog = typeCfg.fields;
    var blocksCatalog = typeCfg.blocks;
    var uid = 'npCmp_' + String(typeCfg.id || 'x').replace(/[^a-z0-9_]/gi, '') + '_' + String(Date.now()).slice(-6);
    var state = {
      type: typeCfg.id,
      selected: {},
      charts: {},
      getAnalyses: options.getAnalyses || function () { return []; }
    };

    var chartsHtml = blocksCatalog.filter(function (b) { return b.chart; }).map(function (b) {
      return (
        '<div class="np-analysis-compare__chart-card" data-block="' + b.id + '">' +
          '<h4 class="np-analysis-compare__chart-title">' +
            sectionTitle(b) +
          '</h4>' +
          '<div class="np-analysis-compare__chart-wrap">' +
            '<canvas id="' + uid + '_' + b.id + '" aria-label="' + sectionTitle(b) + '"></canvas>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    host.innerHTML =
      '<details class="np-analysis-compare" open>' +
        '<summary class="np-analysis-compare__summary">📊 ' +
          tr('analysis.compare_title', 'Comparar análisis (tabla y gráficas)') +
        '</summary>' +
        '<div class="np-analysis-compare__body">' +
          '<p class="np-analysis-compare__hint">' +
            tr('analysis.compare_hint_' + typeCfg.id, typeCfg.hint || '') +
          '</p>' +
          '<div class="np-analysis-compare__cols" id="' + uid + '_cols"></div>' +
          '<div class="np-analysis-compare__tables" id="' + uid + '_tables"></div>' +
          '<div class="np-analysis-compare__charts" id="' + uid + '_charts">' + chartsHtml + '</div>' +
        '</div>' +
      '</details>';

    function refresh() {
      var analyses = state.getAnalyses() || [];
      var colsEl = host.querySelector('#' + uid + '_cols');
      var tablesHost = host.querySelector('#' + uid + '_tables');
      if (!colsEl || !tablesHost) return;

      var idSet = {};
      analyses.forEach(function (a) { if (a && a.id) idSet[a.id] = true; });
      Object.keys(state.selected).forEach(function (id) {
        if (!idSet[id]) delete state.selected[id];
      });
      if (!Object.keys(state.selected).length && analyses.length) {
        analyses.forEach(function (a) { if (a && a.id) state.selected[a.id] = true; });
      }

      colsEl.innerHTML = '';
      analyses.forEach(function (a, idx) {
        var on = !!state.selected[a.id];
        var color = analysisColor(idx);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'np-analysis-compare__col-btn' + (on ? ' is-on' : '');
        btn.textContent = analysisLabel(a, idx);
        btn.title = tr('analysis.compare_toggle_col', 'Incluir/excluir en gráfica');
        btn.style.borderColor = color;
        btn.style.color = on ? color : '#64748b';
        btn.style.background = on ? analysisColorWash(color, '1a') : '#f8fafc';
        btn.style.boxShadow = on ? 'inset 0 0 0 1px ' + color : 'none';
        btn.addEventListener('click', function () {
          state.selected[a.id] = !state.selected[a.id];
          refresh();
        });
        colsEl.appendChild(btn);
      });

      var rows = buildCompareRows(analyses, fieldsCatalog);
      tablesHost.innerHTML = '';
      blocksCatalog.forEach(function (block) {
        var blockRows = rows.filter(function (r) { return r.block === block.id; });
        if (!blockRows.length) return;
        var wrap = document.createElement('div');
        wrap.className = 'np-analysis-compare__table-block np-analysis-compare__table-block--' + block.id;
        wrap.innerHTML =
          '<h4 class="np-analysis-compare__block-title">' + sectionTitle(block) + '</h4>' +
          '<div class="np-analysis-compare__table-wrap">' +
            '<table class="np-analysis-compare__table"><thead></thead><tbody></tbody></table>' +
          '</div>';
        var table = wrap.querySelector('table');
        var thead = table.querySelector('thead');
        var tbody = table.querySelector('tbody');
        var hr = document.createElement('tr');
        var th0 = document.createElement('th');
        th0.textContent = tr('analysis.compare_param', 'Parámetro');
        hr.appendChild(th0);
        analyses.forEach(function (a, idx) {
          var th = document.createElement('th');
          fillAnalysisColumnHeader(th, a, idx, { on: !!state.selected[a.id] });
          if (state.selected[a.id]) th.classList.add('is-on');
          hr.appendChild(th);
        });
        thead.appendChild(hr);
        blockRows.forEach(function (row) {
          var trEl = document.createElement('tr');
          var td0 = document.createElement('td');
          td0.textContent = chartLabelForRow(row);
          trEl.appendChild(td0);
          row.values.forEach(function (v) {
            var td = document.createElement('td');
            td.textContent = formatCompareValue(v, row);
            trEl.appendChild(td);
          });
          tbody.appendChild(trEl);
        });
        tablesHost.appendChild(wrap);
      });

      ensureChartJs(function () {
        destroyCharts(state);
        blocksCatalog.forEach(function (block) {
          if (!block.chart) return;
          var canvas = host.querySelector('#' + uid + '_' + block.id);
          var blockRows = rows.filter(function (r) { return r.block === block.id; });
          renderBlockChart(
            canvas,
            blockRows,
            analyses,
            state.selected,
            block.chartType,
            block.id,
            state
          );
        });
      });
    }

    state.refresh = refresh;
    refresh();
    return state;
  }

  function mountSoilCompare(host, options) {
    options = options || {};
    options.type = 'soil';
    return mountLabCompare(host, options);
  }

  function isDetectionLimitValue(s) {
    var t = String(s || '').trim();
    if (!t) return false;
    if (/^(nd|n\.?\s*d\.?|traza|trace|bdl|lod|loq|ndr)$/i.test(t)) return true;
    if (/^[<>]=?\s*\d/.test(t)) return true;
    return false;
  }

  function normalizeDecimal(s, commaIsDecimal) {
    if (w.NpNum && typeof w.NpNum.normalizeDecimal === 'function') {
      return w.NpNum.normalizeDecimal(s, commaIsDecimal);
    }
    return String(s == null ? '' : s).trim();
  }

  function commaIsDecimalIn(values) {
    if (w.NpNum && typeof w.NpNum.commaIsDecimalIn === 'function') {
      return w.NpNum.commaIsDecimalIn(values);
    }
    return false;
  }

  function isPlainNumericValue(s, commaIsDecimal) {
    if (w.NpNum && typeof w.NpNum.isNumericLike === 'function') {
      return w.NpNum.isNumericLike(s, commaIsDecimal);
    }
    var t = String(s || '').trim();
    if (!t) return false;
    if (isDetectionLimitValue(t)) return false;
    return /^-?\d+(\.\d+)?$/.test(t);
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function flattenDetectedForType(fields, reviewFields, textPaths) {
    var out = [];
    textPaths = textPaths || { title: 1, date: 1 };
    var numericRaw = (reviewFields || []).map(function (f) {
      if (textPaths[f.path]) return '';
      var v = getByPath(fields, f.path);
      return v === null || v === undefined ? '' : String(v);
    });
    var commaIsDecimal = commaIsDecimalIn(numericRaw);
    (reviewFields || []).forEach(function (f) {
      var val = getByPath(fields, f.path);
      var str = val === null || val === undefined ? '' : String(val);
      var isText = !!textPaths[f.path];
      if (!isText && str) str = normalizeDecimal(str, commaIsDecimal);
      var autoCheck = str !== '' && (isText || isPlainNumericValue(str));
      var lim = str && isDetectionLimitValue(str)
        ? ' ' + tr('analysis.pdf_limit_tag', '⚠ límite')
        : '';
      out.push({
        path: f.path,
        section: f.section || 'meta',
        label: fieldLabel(f) + lim,
        unit: f.unit || '',
        tip: (isEnLang() && f.tipEn) ? f.tipEn : tr(f.tipKey || '', f.tip || ''),
        value: str,
        checked: autoCheck
      });
    });
    return out;
  }

  function flattenDetected(fields) {
    return flattenDetectedForType(fields, SOIL_REVIEW_FIELDS, {
      title: 1,
      date: 1,
      'physical.texturalClass': 1,
      'fertility.pMethod': 1
    });
  }

  function openLabReviewModal(typeOrFields, fieldsOrOnApply, maybeOnApply) {
    var type = 'soil';
    var fields = typeOrFields;
    var onApply = fieldsOrOnApply;
    if (typeof typeOrFields === 'string') {
      type = typeOrFields;
      fields = fieldsOrOnApply;
      onApply = maybeOnApply;
    }
    var typeCfg = getTypeConfig(type);
    if (!typeCfg) {
      console.warn('openLabReviewModal: tipo desconocido', type);
      return;
    }

    var existing = document.getElementById('npLabPdfReviewModal');
    if (existing) existing.remove();

    var textPaths = { title: 1, date: 1, 'physical.texturalClass': 1, 'fertility.pMethod': 1 };
    var rows = flattenDetectedForType(fields || {}, typeCfg.reviewFields, textPaths);
    var isUsUnits = !!(w.NpAnalysisUI && typeof w.NpAnalysisUI.isUS === 'function' && w.NpAnalysisUI.isUS());
    var KGCM2_TO_PSI = 14.223343307;
    function isFirmezaPath(p) {
      return p === 'calidad.firmeza' || p === 'optimalCalidad.firmeza';
    }
    function toPsiDisplay(raw) {
      if (w.frutaFirmezaFromSI) return String(w.frutaFirmezaFromSI(raw));
      var n = Number(normalizeDecimal(raw));
      if (!Number.isFinite(n)) return String(raw);
      return String(Number((n * KGCM2_TO_PSI).toFixed(1)));
    }
    function fromPsiToSi(raw) {
      if (w.frutaFirmezaToSI) return String(w.frutaFirmezaToSI(raw));
      var n = Number(normalizeDecimal(raw));
      if (!Number.isFinite(n)) return String(raw);
      return String(Number((n / KGCM2_TO_PSI).toFixed(4)));
    }
    rows.forEach(function (row) {
      if (row.path === 'm3Riego') {
        if (isUsUnits) {
          row.label = tr('analysis.review_irrigation_gal', 'Agua riego');
          row.unit = 'US gal';
          row.tip = tr('analysis.review_irrigation_gal_tip', 'Volumen de riego en galones US. Se guarda internamente en m³.');
          if (row.value && isPlainNumericValue(row.value) && w.NpAnalysisUI && typeof w.NpAnalysisUI.volumeInputFromSI === 'function') {
            row.value = String(w.NpAnalysisUI.volumeInputFromSI(row.value));
          }
        } else {
          row.label = tr('analysis.review_irrigation_m3', 'm³ riego');
          row.unit = 'm³';
          row.tip = tr('analysis.review_irrigation_m3_tip', 'Volumen de riego en metros cúbicos.');
        }
        return;
      }
      if (isFirmezaPath(row.path)) {
        if (isUsUnits) {
          row.unit = 'psi';
          row.tip = tr(
            'analysis.review_firmness_psi_tip',
            isEnLang()
              ? 'Firmness in psi. Stored internally as kg/cm².'
              : 'Firmeza en psi. Se guarda internamente en kg/cm².'
          );
          if (row.value && isPlainNumericValue(row.value)) {
            row.value = toPsiDisplay(row.value);
          }
        } else {
          row.unit = 'kg/cm²';
          row.tip = tr(
            'analysis.review_firmness_kg_tip',
            isEnLang() ? 'Firmness in kg/cm².' : 'Firmeza en kg/cm².'
          );
        }
      }
    });
    var isUsVol = isUsUnits;
    var modal = document.createElement('div');
    modal.id = 'npLabPdfReviewModal';
    modal.className = 'np-lab-pdf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="np-lab-pdf-modal__panel">' +
        '<div class="np-lab-pdf-modal__head">' +
          '<h3>' +
            (isEnLang() && typeCfg.reviewTitleEn
              ? typeCfg.reviewTitleEn
              : tr('analysis.pdf_review_title_' + typeCfg.id, typeCfg.reviewTitle || 'Revisar datos detectados')) +
          '</h3>' +
          '<button type="button" class="np-lab-pdf-modal__close" aria-label="' +
            tr('analysis.pdf_review_close', isEnLang() ? 'Close' : 'Cerrar') +
          '">×</button>' +
        '</div>' +
        '<p class="np-lab-pdf-modal__intro">' +
          tr('analysis.pdf_review_intro', 'Marca los campos a aplicar. Corrige o completa los vacíos. Luego confirma para llenar el análisis.') +
        '</p>' +
        '<p class="np-lab-pdf-modal__intro" style="margin-top:-4px;color:#b45309;">' +
          tr(
            'analysis.pdf_review_limits_hint',
            'Si ves valores como &lt;25 o ND (límite de detección), cámbialos a un número antes de aplicar, o déjalos sin marcar.'
          ) +
        '</p>' +
        '<p class="np-lab-pdf-modal__intro" style="margin-top:-4px;color:#0369a1;">' +
          tr(
            'analysis.pdf_review_units_hint',
            'Cada campo muestra su unidad (ppm, meq, %, cm…). Revisa sinónimos EN/ES del lab antes de aplicar.'
          ) +
        '</p>' +
        (fields && fields.notes ? '<p class="np-lab-pdf-modal__notes">' + String(fields.notes).replace(/</g, '&lt;') + '</p>' : '') +
        '<div class="np-lab-pdf-modal__actions-top">' +
          '<button type="button" class="btn btn-sm" data-act="all">' +
            tr('analysis.pdf_review_select_valued', 'Seleccionar todos con valor') +
          '</button>' +
          '<button type="button" class="btn btn-sm" data-act="none">' +
            tr('analysis.pdf_review_clear', 'Quitar selección') +
          '</button>' +
        '</div>' +
        '<div class="np-lab-pdf-modal__list"></div>' +
        '<div class="np-lab-pdf-modal__foot">' +
          '<label class="np-lab-pdf-modal__new"><input type="checkbox" data-new checked> ' +
            tr('analysis.pdf_review_as_new', 'Crear análisis nuevo (si no, aplica al actual)') +
          '</label>' +
          '<div class="np-lab-pdf-modal__foot-btns">' +
            '<button type="button" class="btn btn-sm" data-act="cancel">' +
              tr('analysis.pdf_review_cancel', 'Cancelar') +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-success" data-act="apply">' +
              tr('analysis.pdf_review_apply', 'Aplicar') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var list = modal.querySelector('.np-lab-pdf-modal__list');
    var bySection = {};
    rows.forEach(function (row) {
      var sid = row.section || 'meta';
      if (!bySection[sid]) bySection[sid] = [];
      bySection[sid].push(row);
    });
    (typeCfg.reviewSections || []).forEach(function (sec) {
      var secRows = bySection[sec.id];
      if (!secRows || !secRows.length) return;
      var head = document.createElement('div');
      head.className = 'np-lab-pdf-modal__section np-lab-pdf-modal__section--' + sec.id;
      head.textContent = sectionTitle(sec);
      list.appendChild(head);
      secRows.forEach(function (row) {
        var item = document.createElement('label');
        item.className = 'np-lab-pdf-modal__row';
        var unitHtml = row.unit
          ? '<span class="np-lab-pdf-modal__unit" title="' +
            escapeAttr(row.tip || row.unit) +
            '">' +
            escapeAttr(row.unit) +
            '</span>'
          : '<span class="np-lab-pdf-modal__unit np-lab-pdf-modal__unit--empty" title="' +
            escapeAttr(row.tip || '') +
            '">—</span>';
        item.innerHTML =
          '<input type="checkbox" data-path="' +
          escapeAttr(row.path) +
          '"' +
          (row.checked ? ' checked' : '') +
          '>' +
          '<span class="np-lab-pdf-modal__label-wrap">' +
            '<span class="np-lab-pdf-modal__label" title="' +
            escapeAttr(row.tip || row.label) +
            '">' +
            row.label +
            '</span>' +
            unitHtml +
          '</span>' +
          '<span class="np-lab-pdf-modal__val-wrap" style="display:inline-flex;align-items:center;gap:6px;min-width:0;flex:1;">' +
            '<input type="text" class="np-lab-pdf-modal__val" data-path-val="' +
            escapeAttr(row.path) +
            '" value="' +
            escapeAttr(row.value) +
            '" placeholder="' +
            escapeAttr(row.unit || '') +
            '" title="' +
            escapeAttr(row.tip || '') +
            '">' +
            (row.path === 'm3Riego' && isUsVol
              ? '<span class="np-lab-pdf-modal__m3-equiv" data-m3-equiv style="font-size:11px;color:#64748b;white-space:nowrap;"></span>'
              : '') +
          '</span>';
        list.appendChild(item);
        if (row.path === 'm3Riego' && isUsVol) {
          var valInp = item.querySelector('[data-path-val]');
          var equivEl = item.querySelector('[data-m3-equiv]');
          function refreshM3Equiv() {
            if (!equivEl || !valInp) return;
            var si = w.NpAnalysisUI && typeof w.NpAnalysisUI.volumeInputToSI === 'function'
              ? w.NpAnalysisUI.volumeInputToSI(valInp.value)
              : NaN;
            if (!Number.isFinite(si) || si <= 0) {
              equivEl.textContent = '(≈ — m³)';
              return;
            }
            var shown = si >= 100 ? si.toFixed(1) : (si >= 10 ? si.toFixed(2) : si.toFixed(3));
            equivEl.textContent = '(≈ ' + shown + ' m³)';
          }
          if (valInp) {
            valInp.addEventListener('input', refreshM3Equiv);
            valInp.addEventListener('change', refreshM3Equiv);
          }
          refreshM3Equiv();
        }
      });
    });

    function close() { modal.remove(); }

    modal.querySelector('.np-lab-pdf-modal__close').addEventListener('click', close);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="all"]').addEventListener('click', function () {
      list.querySelectorAll('.np-lab-pdf-modal__row').forEach(function (row) {
        var val = row.querySelector('[data-path-val]');
        var cb = row.querySelector('input[type="checkbox"]');
        if (cb && val && String(val.value || '').trim()) cb.checked = true;
      });
    });
    modal.querySelector('[data-act="none"]').addEventListener('click', function () {
      list.querySelectorAll('input[type="checkbox"][data-path]').forEach(function (cb) {
        cb.checked = false;
      });
    });
    modal.querySelector('[data-act="apply"]').addEventListener('click', function () {
      var payload = {};
      list.querySelectorAll('.np-lab-pdf-modal__row').forEach(function (row) {
        var cb = row.querySelector('input[type="checkbox"][data-path]');
        var val = row.querySelector('[data-path-val]');
        if (!cb || !cb.checked || !val) return;
        var path = cb.getAttribute('data-path');
        var raw = String(val.value || '').trim();
        if (raw && !textPaths[path]) raw = normalizeDecimal(raw);
        if (path === 'm3Riego' && isUsVol && raw && w.NpAnalysisUI && typeof w.NpAnalysisUI.volumeInputToSI === 'function') {
          var siVol = w.NpAnalysisUI.volumeInputToSI(raw);
          if (Number.isFinite(siVol)) raw = String(siVol);
        }
        if (isFirmezaPath(path) && isUsUnits && raw && isPlainNumericValue(raw)) {
          raw = fromPsiToSi(raw);
        }
        setByPath(payload, path, raw);
      });
      var asNew = !!(modal.querySelector('[data-new]') && modal.querySelector('[data-new]').checked);
      close();
      if (typeof onApply === 'function') onApply(payload, { asNew: asNew });
    });

    document.body.appendChild(modal);
  }

  function openSoilReviewModal(fields, onApply) {
    return openLabReviewModal('soil', fields, onApply);
  }

  w.NpAnalysisCompare = {
    SOIL_FIELDS: SOIL_FIELDS,
    SOIL_BLOCKS: SOIL_BLOCKS,
    SOIL_REVIEW_FIELDS: SOIL_REVIEW_FIELDS,
    SOIL_REVIEW_SECTIONS: SOIL_REVIEW_SECTIONS,
    getByPath: getByPath,
    setByPath: setByPath,
    buildCompareRows: buildCompareRows,
    getTypeConfig: getTypeConfig,
    mountLabCompare: mountLabCompare,
    mountSoilCompare: mountSoilCompare,
    openLabReviewModal: openLabReviewModal,
    openSoilReviewModal: openSoilReviewModal,
    analysisLabel: analysisLabel
  };
})(typeof window !== 'undefined' ? window : this);
