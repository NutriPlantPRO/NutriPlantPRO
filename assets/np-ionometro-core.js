/**
 * Seguimiento con ionómetro: meq, proporción y cortes de la gráfica.
 * El ppm tecleado no cambia al elegir otra forma; solo el meq.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NpIonometro = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var COLUMNS = [
    { id: 'ph', kind: 'ph', label: 'pH (H⁺)', unit: 'pH', color: '#0f766e' },
    { id: 'ec', kind: 'ec', label: 'CE', unit: 'dS/m', color: '#b45309' },
    { id: 'no3', kind: 'ion', group: 'anion', label: 'NO₃⁻', unit: 'meq/L', color: '#1d4ed8', forms: { NO3: 62, N: 14 }, defaultForm: 'NO3', labelByForm: { NO3: 'NO₃⁻', N: 'N' } },
    { id: 'p', kind: 'ion', group: 'anion', label: 'PO₄', unit: 'meq/L', color: '#15803d', forms: { PO4: 95, P: 31 }, defaultForm: 'PO4', labelByForm: { PO4: 'PO₄', P: 'P' } },
    { id: 'so4', kind: 'ion', group: 'anion', label: 'SO₄²⁻', unit: 'meq/L', color: '#7c3aed', forms: { SO4: 48.03, S: 16.03 }, defaultForm: 'SO4', labelByForm: { SO4: 'SO₄²⁻', S: 'S' } },
    { id: 'k', kind: 'ion', group: 'cation', label: 'K⁺', unit: 'meq/L', color: '#c2410c', weight: 39.1 },
    { id: 'ca', kind: 'ion', group: 'cation', label: 'Ca²⁺', unit: 'meq/L', color: '#0e7490', weight: 20.04 },
    { id: 'mg', kind: 'ion', group: 'cation', label: 'Mg²⁺', unit: 'meq/L', color: '#4d7c0f', weight: 12.15 },
    { id: 'cl', kind: 'ion', group: 'anion', label: 'Cl⁻', unit: 'meq/L', color: '#475569', weight: 35.45 },
    { id: 'na', kind: 'ion', group: 'cation', label: 'Na⁺', unit: 'meq/L', color: '#a16207', weight: 22.99 },
    { id: 'nh4', kind: 'ion', group: 'cation', label: 'NH₄⁺', unit: 'meq/L', color: '#0369a1', forms: { NH4: 18.04, N: 14 }, defaultForm: 'NH4', labelByForm: { NH4: 'NH₄⁺', N: 'N' } }
  ];

  var BY_ID = {};
  COLUMNS.forEach(function (col) { BY_ID[col.id] = col; });

  function column(id) {
    return BY_ID[id] || null;
  }

  function parseNumber(raw) {
    if (raw == null) return null;
    var text = String(raw).trim().replace(',', '.');
    if (!text) return null;
    var value = Number(text);
    return isFinite(value) ? value : null;
  }

  function weightOf(col, form) {
    if (!col || col.kind !== 'ion') return null;
    if (col.forms) {
      var chosen = form && col.forms[form] != null ? form : col.defaultForm;
      return col.forms[chosen];
    }
    return col.weight;
  }

  function meqFromPpm(columnId, form, ppm) {
    var col = column(columnId);
    var value = parseNumber(ppm);
    if (!col || col.kind !== 'ion' || value == null) return null;
    var weight = weightOf(col, form);
    if (!weight) return null;
    return value / weight;
  }

  function formatMeq(value) {
    if (value == null || !isFinite(value)) return '';
    var rounded = Math.round(value * 100) / 100;
    var text = rounded.toFixed(2);
    return text.replace(/\.?0+$/, '');
  }

  var SAMPLE_TYPES = [
    { id: 'solution', label: 'Solución nutritiva', band: true },
    { id: 'paste', label: 'Extracto de pasta saturada', band: true },
    { id: 'extract21', label: 'Extracto 2:1', band: false },
    { id: 'petiole', label: 'Pecíolo', band: false },
    { id: 'foliar', label: 'Foliar', band: false },
    { id: 'sap', label: 'Savia', band: false }
  ];

  /** ppm del elemento. Franja NutriPlant de solución de invernadero intensivo. */
  var REF_ELEMENTAL = {
    no3: [140, 200],
    p: [30, 60],
    so4: [60, 110],
    k: [180, 300],
    ca: [140, 220],
    mg: [40, 70]
  };

  var REF_IDS = Object.keys(REF_ELEMENTAL);
  var ELEMENTAL_FORM = { no3: 'N', p: 'P', so4: 'S', nh4: 'N' };

  function sampleType(id) {
    for (var i = 0; i < SAMPLE_TYPES.length; i++) {
      if (SAMPLE_TYPES[i].id === id) return SAMPLE_TYPES[i];
    }
    return SAMPLE_TYPES[0];
  }

  function sampleHasBand(id) {
    return !!sampleType(id).band;
  }

  function defaultRefBands() {
    var bands = {};
    REF_IDS.forEach(function (id) {
      bands[id] = REF_ELEMENTAL[id].slice();
    });
    return bands;
  }

  function elementalPpm(columnId, form, ppm) {
    var col = column(columnId);
    var value = parseNumber(ppm);
    if (!col || col.kind !== 'ion' || value == null) return null;
    var formWeight = weightOf(col, form);
    var elementalKey = ELEMENTAL_FORM[columnId];
    var elementalWeight = elementalKey ? weightOf(col, elementalKey) : formWeight;
    if (!formWeight || !elementalWeight) return null;
    return value * (elementalWeight / formWeight);
  }

  function bandInForm(columnId, form, elementalBand) {
    var col = column(columnId);
    if (!col || !elementalBand) return null;
    var formWeight = weightOf(col, form);
    var elementalKey = ELEMENTAL_FORM[columnId];
    var elementalWeight = elementalKey ? weightOf(col, elementalKey) : formWeight;
    if (!formWeight || !elementalWeight) return null;
    var factor = formWeight / elementalWeight;
    return [elementalBand[0] * factor, elementalBand[1] * factor];
  }

  function refLevel(elemental, min, max) {
    if (elemental == null || min == null || max == null || !isFinite(elemental)) return null;
    if (elemental < min) return 'low';
    if (elemental > max) return 'high';
    return 'ok';
  }

  function bandsDiffer(custom) {
    if (!custom) return false;
    return REF_IDS.some(function (id) {
      var band = custom[id];
      var base = REF_ELEMENTAL[id];
      if (!band) return false;
      return Math.abs(band[0] - base[0]) > 0.5 || Math.abs(band[1] - base[1]) > 0.5;
    });
  }

  function defaultForms() {
    var forms = {};
    COLUMNS.forEach(function (col) {
      if (col.forms) forms[col.id] = col.defaultForm;
    });
    return forms;
  }

  function labelFor(columnId, form) {
    var col = column(columnId);
    if (!col) return '';
    if (col.labelByForm && form && col.labelByForm[form]) return col.labelByForm[form];
    return col.label;
  }

  /** Índices seguidos con número. Un hueco corta el tramo. */
  function segments(values) {
    var runs = [];
    var current = [];
    (values || []).forEach(function (value, index) {
      if (typeof value !== 'number' || !isFinite(value)) {
        if (current.length) runs.push(current);
        current = [];
        return;
      }
      current.push(index);
    });
    if (current.length) runs.push(current);
    return runs;
  }

  function columnValues(rows, columnId, forms) {
    return (rows || []).map(function (row) {
      if (!row) return null;
      var col = column(columnId);
      if (!col) return null;
      if (col.kind === 'ion') return meqFromPpm(columnId, forms && forms[columnId], row[columnId]);
      return parseNumber(row[columnId]);
    });
  }

  function hasAny(values) {
    return (values || []).some(function (value) { return value != null && isFinite(value); });
  }

  function proportions(row, forms) {
    var cations = [];
    var anions = [];
    var cationSum = 0;
    var anionSum = 0;
    COLUMNS.forEach(function (col) {
      if (col.kind !== 'ion') return;
      var meq = meqFromPpm(col.id, forms && forms[col.id], row && row[col.id]);
      if (meq == null) return;
      var item = { id: col.id, meq: meq };
      if (col.group === 'cation') {
        cations.push(item);
        cationSum += meq;
      } else if (col.group === 'anion') {
        anions.push(item);
        anionSum += meq;
      }
    });
    function withPct(list, sum) {
      if (list.length < 2 || !sum) return [];
      return list.map(function (item) {
        return { id: item.id, meq: item.meq, pct: (item.meq / sum) * 100 };
      });
    }
    var ec = parseNumber(row && row.ec);
    var ecNote = null;
    if (ec != null && cations.length) {
      ecNote = {
        cationSum: cationSum,
        ec: ec,
        expected: ec * 10
      };
    }
    return {
      cations: withPct(cations, cationSum),
      anions: withPct(anions, anionSum),
      cationSum: cationSum,
      anionSum: anionSum,
      ecNote: ecNote
    };
  }

  return {
    COLUMNS: COLUMNS,
    column: column,
    parseNumber: parseNumber,
    meqFromPpm: meqFromPpm,
    formatMeq: formatMeq,
    defaultForms: defaultForms,
    labelFor: labelFor,
    SAMPLE_TYPES: SAMPLE_TYPES,
    REF_IDS: REF_IDS,
    sampleType: sampleType,
    sampleHasBand: sampleHasBand,
    defaultRefBands: defaultRefBands,
    elementalPpm: elementalPpm,
    bandInForm: bandInForm,
    refLevel: refLevel,
    bandsDiffer: bandsDiffer,
    segments: segments,
    columnValues: columnValues,
    hasAny: hasAny,
    proportions: proportions
  };
});
