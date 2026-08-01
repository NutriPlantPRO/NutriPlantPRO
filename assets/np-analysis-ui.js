/**
 * NutriPlant — i18n + unidades de presentación para Análisis (dashboard).
 * Lab units (ppm, meq, %, pH, CE) se mantienen; dosis/área/volumen/masa se adaptan.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpAnalysisUI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var phrases = {
    'Análisis de Suelo': 'Soil Analysis',
    'Solución Nutritiva': 'Nutrient Solution',
    'Extracto de Pasta': 'Saturated Paste Extract',
    'Análisis Foliar (DOP)': 'Leaf Analysis (DOP)',
    'Análisis de Fruta (ICC)': 'Fruit Analysis (CQI)',
    'Análisis de solución nutritiva o extracto de pasta saturada. Macros en meq/L y ppm (conversión automática). Rangos de referencia y diferencia vs ideal:': 'Nutrient solution or saturated paste extract analysis. Macros in meq/L and ppm (automatic conversion). Reference ranges and difference vs ideal:',
    'Análisis de extracto de pasta saturada. Datos generales, aniones, cationes, micronutrimentos y relación nutrimental. Referencias en ppm. Diferencia vs ideal:': 'Saturated paste extract analysis. General data, anions, cations, micronutrients and nutrient ratios. References in ppm. Difference vs ideal:',
    'DOP (Desviación del Óptimo Porcentual): DOP = ((Valor − Óptimo) / Óptimo) × 100. Los óptimos son editables y se guardan solo en este análisis. Regla visual igual que foliar:': 'DOP (Deviation from Optimum Percentage): DOP = ((Value − Optimum) / Optimum) × 100. Optima are editable and saved only in this analysis. Same visual rule as leaf:',
    'ICC (Índice Comparativo de Calidad): ICC = ((Valor − Óptimo) / Óptimo) × 100. Los óptimos son editables y se guardan solo en este análisis. Regla visual igual que foliar:': 'CQI (Comparative Quality Index): CQI = ((Value − Optimum) / Optimum) × 100. Optima are editable and saved only in this analysis. Same visual rule as leaf:',
    'Macronutrientes (% MS)': 'Macronutrients (% DM)',
    'Ingresa resultado del análisis y, si quieres, ajusta el óptimo.': 'Enter the lab result and, if you want, adjust the optimum.',
    'Micronutrientes (mg/kg)': 'Micronutrients (ppm)',
    'falta,': 'deficit,',
    'exceso': 'excess',
    'diferencia': 'difference',
    'elemento': 'element',
    'óxido (CaO, MgO, K₂O)': 'oxide (CaO, MgO, K₂O)',
    'óxido (P₂O₅, SO₃)': 'oxide (P₂O₅, SO₃)',
    'Dosis de ácido:': 'Acid dose:',
    'Ácido (volumen total):': 'Acid (total volume):',
    'Análisis de Agua': 'Water Analysis',
    'Reportes en este proyecto': 'Reports in this project',
    'Agregar análisis': 'Add analysis',
    'Selecciona un análisis de la lista o agrega uno nuevo.': 'Select an analysis from the list or add a new one.',
    'Eliminar': 'Delete',
    'Propiedades físicas': 'Physical properties',
    'Clase textural': 'Textural class',
    'Punto saturación %': 'Saturation point %',
    'Capacidad de campo %': 'Field capacity %',
    'Punto marchitamiento %': 'Wilting point %',
    'Cond. hidráulica cm/h': 'Hydr. conductivity cm/h',
    'Densidad aparente g/cm³': 'Bulk density g/cm³',
    'Densidad aparente': 'Bulk density',
    'pH y salinidad': 'pH and salinity',
    'pH (1:2 agua)': 'pH (1:2 water)',
    'pH Buffer': 'Buffer pH',
    'Carbonatos totales %': 'Total carbonates %',
    'Salinidad CE dS/m': 'Salinity EC dS/m',
    'Fertilidad del suelo': 'Soil fertility',
    'Profundidad (cm)': 'Depth (cm)',
    'Profundidad': 'Depth',
    'Superficie de suelo considerada (%)': 'Considered soil surface (%)',
    'Suelo explorado por raíces (%)': 'Considered soil surface (%)',
    'Base técnica de ajuste.': 'Technical adjustment basis.',
    'Los valores calculados no representan una recomendación directa; son un punto de partida sujeto a eficiencia y criterio agronómico.': 'Calculated values are not a direct recommendation; they are a starting point subject to efficiency and agronomic judgment.',
    'En kg/ha se considera solo la superficie de suelo indicada en la profundidad dada. Ideales K, Ca y Mg (ppm): desde la CIC de Cationes — meq ideal = CIC × saturación objetivo (K 5 %, Mg 13 %, Ca 70 %) y ppm = meq × factor equivalente (K 391, Mg 121,5, Ca 200,4).': 'In kg/ha only the indicated soil surface at the stated depth is considered. Ideal K, Ca and Mg (ppm): from Cations CEC — ideal meq = CEC × target saturation (K 5%, Mg 13%, Ca 70%) and ppm = meq × equivalent factor (K 391, Mg 121.5, Ca 200.4).',
    'En kg/ha se considera solo el suelo que las raíces aprovechan en la profundidad indicada. Ideales K, Ca y Mg (ppm): desde la CIC de Cationes — meq ideal = CIC × saturación objetivo (K 5 %, Mg 13 %, Ca 70 %) y ppm = meq × factor equivalente (K 391, Mg 121,5, Ca 200,4).': 'In kg/ha only the indicated soil surface at the stated depth is considered. Ideal K, Ca and Mg (ppm): from Cations CEC — ideal meq = CEC × target saturation (K 5%, Mg 13%, Ca 70%) and ppm = meq × equivalent factor (K 391, Mg 121.5, Ca 200.4).',
    'Recargar valores ideales de referencia': 'Reload reference ideal values',
    'Concepto': 'Concept',
    'Nivel (laboratorio)': 'Level (lab)',
    'Ideal (referencia)': 'Ideal (reference)',
    'kg/ha (diferencia)': 'kg/ha (difference)',
    'lb/acre (diferencia)': 'lb/acre (difference)',
    'falta': 'deficit',
    'exceso': 'excess',
    'Cationes intercambiables y CIC': 'Exchangeable cations and CEC',
    'CIC y saturación (%)': 'CEC and saturation (%)',
    'Análisis de agua de riego.': 'Irrigation water analysis.',
    'Columnas': 'Columns',
    'y ppm con conversión automática; sumas de cationes y aniones; aporte por volumen (m³) en kg elemento y óxido; y cálculo de ácido para neutralizar bicarbonatos/carbonatos.': 'and ppm with automatic conversion; cation and anion sums; contribution by volume (m³) as kg element and oxide; and acid calc to neutralize bicarbonates/carbonates.',
    'Los kilogramos en las tablas (elemento y óxido) son el aporte total para el volumen de agua de riego que indiques en cada reporte (campo m³ agua de riego).': 'Mass amounts in the tables (element and oxide) are the total contribution for the irrigation water volume you enter in each report (irrigation water volume field).',
    'm³ agua de riego:': 'Irrigation water m³:',
    'Agua de riego:': 'Irrigation water:',
    'CE, RAS y pH': 'EC, SAR and pH',
    'Cationes': 'Cations',
    'Aniones': 'Anions',
    'Elemento': 'Element',
    'kg elemento': 'kg element',
    'kg óxido (CaO, MgO, K₂O)': 'kg oxide (CaO, MgO, K₂O)',
    'kg óxido (P₂O₅, SO₃)': 'kg oxide (P₂O₅, SO₃)',
    'lb elemento': 'lb element',
    'lb óxido (CaO, MgO, K₂O)': 'lb oxide (CaO, MgO, K₂O)',
    'lb óxido (P₂O₅, SO₃)': 'lb oxide (P₂O₅, SO₃)',
    'Suma cationes': 'Cation sum',
    'Suma aniones': 'Anion sum',
    'Micronutrimentos (ppm)': 'Micronutrients (ppm)',
    'Ácido para neutralizar HCO₃⁻ y CO₃²⁻': 'Acid to neutralize HCO₃⁻ and CO₃²⁻',
    'Meq ácido = (HCO₃⁻ + CO₃²⁻) − residual objetivo': 'Acid meq = (HCO₃⁻ + CO₃²⁻) − target residual',
    'Resultado en mL/m³ y litros totales según el volumen indicado.': 'Result in mL/m³ and total liters for the stated volume.',
    'Ácido:': 'Acid:',
    'Residual objetivo': 'Target residual',
    'En base a (m³ agua):': 'Based on (water m³):',
    'En base a (agua):': 'Based on (water):',
    'meq/L o mmolc/L ácido necesarios:': 'meq/L or mmolc/L acid needed:',
    'mL ácido / m³:': 'mL acid / m³:',
    'L ácido (volumen total):': 'L acid (total volume):',
    'Características generales': 'General characteristics',
    'Relación nutrimental': 'Nutrient ratio',
    'Ratios calculados': 'Calculated ratios',
    'Estado': 'Status',
    'Diferencia': 'Difference',
    'Óptimo': 'Optimal',
    'Bajo': 'Low',
    'Alto': 'High',
    'Sin título': 'Untitled',
    'Nuevo análisis': 'New analysis',
    'Título': 'Title',
    'Resultado (%)': 'Result (%)',
    'Óptimo (%)': 'Optimum (%)',
    'Resultado (mg/kg)': 'Result (ppm)',
    'Óptimo (mg/kg)': 'Optimum (ppm)',
    'Resultado': 'Result',
    'Óptimo': 'Optimum',
    'Determinación': 'Determination',
    'Estado (semáforo)': 'Status (traffic light)',
    'Muy bajo': 'Very low',
    'Muy alto': 'Very high',
    'Concentraciones (meq/100g o cmol⁺/kg)': 'Concentrations (meq/100g or cmol⁺/kg)',
    'CIC (meq/100g o cmol⁺/kg)': 'CEC (meq/100g or cmol⁺/kg)',
    'Relaciones entre cationes (calculadas desde': 'Cation ratios (calculated from',
    'meq/100g o cmol⁺/kg': 'meq/100g or cmol⁺/kg',
    'Valores de referencia:': 'Reference values:',
    'meq/L o mmolc/L': 'meq/L or mmolc/L',
    'meq/L<br>o mmolc/L': 'meq/L<br>or mmolc/L',
    'ácido necesarios:': 'acid needed:',
    'Ácido Nítrico 55%': 'Nitric Acid 55%',
    'Ácido Sulfúrico 98%': 'Sulfuric Acid 98%',
    'Ácido Fosfórico 75%': 'Phosphoric Acid 75%',
    'Ácido Fosfórico 85%': 'Phosphoric Acid 85%',
    'Macronutrientes en fruta (%)': 'Fruit macronutrients (%)',
    'Calcio en Fruta (mg/100 g MF)': 'Fruit Calcium (mg/100 g FW)',
    'Calidad de Fruta': 'Fruit Quality',
    'Regla visual (fija):': 'Visual rule (fixed):',
    'Regla visual igual que foliar:': 'Same visual rule as leaf:',
    '|ICC|': '|CQI|',
    '<th>ICC</th>': '<th>CQI</th>',
    'Resultado en mL/m³ y litros totales según el volumen indicado.': 'Result in mL/m³ and total liters for the stated volume.',
    'Resultado en fl oz/1000 gal y galones totales según el volumen indicado.': 'Result in fl oz/1000 gal and total gallons for the stated volume.',
  };

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    return {
      language: p && p.language === 'en' ? 'en' : 'es',
      unit_system: p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (p && p.locale) || (p && p.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  function isUS() {
    return prefs().unit_system === 'us_customary';
  }

  function agronomic() {
    return w.NpAgronomicUnits || null;
  }

  function waterUI() {
    return w.NpWaterClimateUI || null;
  }

  function unitKind(kind) {
    var api = agronomic();
    if (!api || typeof api.unit !== 'function') return kind;
    try {
      return api.unit(kind);
    } catch (e) {
      return kind;
    }
  }

  function unitSymbol(kind) {
    var u = unitKind(kind);
    if (w.NpUnits && w.NpUnits.units && w.NpUnits.units[u] && w.NpUnits.units[u].symbol) {
      return w.NpUnits.units[u].symbol;
    }
    if (u === 'g/cm3') return 'g/cm³';
    if (u === 'lb/ft3') return 'lb/ft³';
    if (u === 'm3') return 'm³';
    if (u === 'mL/m3') return 'mL/m³';
    if (u === 'US fl oz/1000 US gal') return 'fl oz/1000 gal';
    return u;
  }

  function toSI(value, kind) {
    var api = agronomic();
    if (!api) return Number(value);
    return api.toSI(Number(value), kind);
  }

  function fromSI(value, kind) {
    var api = agronomic();
    if (!api) return Number(value);
    return api.fromSI(Number(value), kind);
  }

  function inputFromSI(value, kind) {
    var n = fromSI(value, kind);
    if (!Number.isFinite(n)) return '';
    var digits = kind === 'bulk_density' ? 3 : (kind === 'depth' ? 2 : 4);
    return String(Number(n.toFixed(digits)));
  }

  function formatDoseMassArea(kgHa, digits) {
    var api = agronomic();
    if (!api || !Number.isFinite(Number(kgHa))) return '—';
    var d = digits == null ? 2 : digits;
    if (typeof api.formatResultFromSI === 'function') {
      try {
        return api.formatResultFromSI(kgHa, 'dose_mass_area', d);
      } catch (e) { /* fall through */ }
    }
    var shown = fromSI(kgHa, 'dose_mass_area');
    return Number(shown).toFixed(d) + ' ' + unitSymbol('dose_mass_area');
  }

  function formatMassKg(kg, digits) {
    var api = agronomic();
    var d = digits == null ? 2 : digits;
    if (!Number.isFinite(Number(kg))) return '—';
    if (!api) return Number(kg).toFixed(d) + ' kg';
    var shown = fromSI(kg, 'mass');
    return Number(shown).toFixed(d) + ' ' + unitSymbol('mass');
  }

  function formatVolumeM3(m3, digits) {
    var ui = waterUI();
    var d = digits == null ? 2 : digits;
    if (!Number.isFinite(Number(m3)) || Number(m3) <= 0) return '—';
    if (ui && typeof ui.resultFromSI === 'function') {
      return ui.resultFromSI(m3, 'volume', d);
    }
    return Number(m3).toFixed(d) + ' m³';
  }

  function volumeInputFromSI(m3) {
    var ui = waterUI();
    if (!Number.isFinite(Number(m3))) return '';
    if (ui && typeof ui.inputFromSI === 'function') return ui.inputFromSI(m3, 'volume');
    return String(m3);
  }

  function volumeInputToSI(displayValue) {
    var ui = waterUI();
    var n = parseFloat(String(displayValue).replace(',', '.'));
    if (!Number.isFinite(n)) return NaN;
    if (ui && typeof ui.toSI === 'function') return ui.toSI(n, 'volume');
    return n;
  }

  function formatAcidDoseMlPerM3(mlPerM3, digits) {
    var ui = waterUI();
    var d = digits == null ? 2 : digits;
    if (!Number.isFinite(Number(mlPerM3))) return '—';
    if (ui && typeof ui.resultFromSI === 'function') {
      return ui.resultFromSI(mlPerM3, 'acid_dose_volume_volume', d);
    }
    return Number(mlPerM3).toFixed(d) + ' mL/m³';
  }

  function formatAcidTotalLiters(liters, digits) {
    var d = digits == null ? 2 : digits;
    if (!Number.isFinite(Number(liters))) return '—';
    if (isUS()) {
      return formatVolumeM3(Number(liters) / 1000, d);
    }
    return Number(liters).toFixed(d) + ' L';
  }

  function translateString(input) {
    var output = String(input == null ? '' : input);
    if (prefs().language !== 'en') return output;
    Object.keys(phrases).sort(function (a, b) { return b.length - a.length; }).forEach(function (es) {
      output = output.split(es).join(phrases[es]);
    });
    return output;
  }

  function t(es, en) {
    return prefs().language === 'en' ? (en || translateString(es)) : es;
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function applyUnitLabels(root) {
    root = root || (w.document && w.document.getElementById('view')) || w.document;
    if (!root || !root.querySelector) return;
    var depthSym = unitSymbol('depth');
    var bdSym = 'g/cm³';
    var doseSym = unitSymbol('dose_mass_area');
    var massSym = unitSymbol('mass');
    var volLabel = isUS() ? t('Agua de riego:', 'Irrigation water:') + ' (' + unitSymbol('volume') + ')'
      : t('m³ agua de riego:', 'Irrigation water m³:');

    var bdInput = root.querySelector('#soil-physical-bulkDensity');
    var bdLabel = bdInput && bdInput.closest('label');
    if (bdLabel) {
      var bdSpan = bdLabel.querySelector('.soil-label-blue') || bdLabel;
      if (bdSpan.classList && bdSpan.classList.contains('soil-label-blue')) {
        bdSpan.textContent = t('Densidad aparente', 'Bulk density') + ' ' + bdSym;
      }
      updateBulkDensityHint(bdInput);
    }

    var depthInput = root.querySelector('#soil-fertility-depthCm');
    if (depthInput && depthInput.closest('label')) {
      var depthLab = depthInput.closest('label');
      var depthTitle = depthLab.getAttribute('title') || '';
      depthLab.childNodes.forEach(function (node) {
        if (node.nodeType === 3 && String(node.nodeValue || '').trim()) {
          node.nodeValue = t('Profundidad', 'Depth') + ' (' + depthSym + ') ';
        }
      });
      if (prefs().language === 'en' && depthTitle) {
        depthLab.setAttribute('title', translateString(depthTitle).replace(/\(cm\)/g, '(' + depthSym + ')').replace(/ cm\b/g, ' ' + depthSym));
      }
    }

    var kghaStrong = root.querySelector('.soil-kgha-row td strong');
    if (kghaStrong) {
      kghaStrong.textContent = doseSym + ' (' + t('diferencia', 'difference') + ')';
    }

    var m3Label = root.querySelector('label[for="aw-m3-riego"], #aw-m3-riego') &&
      (root.querySelector('#aw-m3-riego') && root.querySelector('#aw-m3-riego').previousElementSibling);
    // Header row uses a bare <label> before the input
    var aguaHeader = root.querySelector('#agua-form-wrap .soil-analysis-form-header');
    if (aguaHeader) {
      var firstLabel = aguaHeader.querySelector('label');
      if (firstLabel && !firstLabel.querySelector('input')) {
        firstLabel.textContent = volLabel.replace(/:$/, '') + ':';
      }
    }

    function rewriteMassLabels(el) {
      if (!el) return;
      var html = el.innerHTML;
      if (!html) return;
      var next = html
        .replace(/\bkg elemento\b/g, massSym + ' ' + t('elemento', 'element'))
        .replace(/\blb elemento\b/g, massSym + ' ' + t('elemento', 'element'))
        .replace(/\bkg element\b/g, massSym + ' ' + t('elemento', 'element'))
        .replace(/\blb element\b/g, massSym + ' ' + t('elemento', 'element'))
        .replace(/\bkg óxido \(CaO, MgO, K₂O\)/g, massSym + ' ' + t('óxido (CaO, MgO, K₂O)', 'oxide (CaO, MgO, K₂O)'))
        .replace(/\blb óxido \(CaO, MgO, K₂O\)/g, massSym + ' ' + t('óxido (CaO, MgO, K₂O)', 'oxide (CaO, MgO, K₂O)'))
        .replace(/\bkg oxide \(CaO, MgO, K₂O\)/g, massSym + ' ' + t('óxido (CaO, MgO, K₂O)', 'oxide (CaO, MgO, K₂O)'))
        .replace(/\blb oxide \(CaO, MgO, K₂O\)/g, massSym + ' ' + t('óxido (CaO, MgO, K₂O)', 'oxide (CaO, MgO, K₂O)'))
        .replace(/\bkg óxido \(P₂O₅, SO₃\)/g, massSym + ' ' + t('óxido (P₂O₅, SO₃)', 'oxide (P₂O₅, SO₃)'))
        .replace(/\blb óxido \(P₂O₅, SO₃\)/g, massSym + ' ' + t('óxido (P₂O₅, SO₃)', 'oxide (P₂O₅, SO₃)'))
        .replace(/\bkg oxide \(P₂O₅, SO₃\)/g, massSym + ' ' + t('óxido (P₂O₅, SO₃)', 'oxide (P₂O₅, SO₃)'))
        .replace(/\blb oxide \(P₂O₅, SO₃\)/g, massSym + ' ' + t('óxido (P₂O₅, SO₃)', 'oxide (P₂O₅, SO₃)'));
      if (next !== html) el.innerHTML = next;
    }
    root.querySelectorAll('th, summary, #agua-tab-container > p').forEach(rewriteMassLabels);

    var acidHelp = root.querySelector('[data-aw-section="acid"] > p');
    if (acidHelp) {
      var helpEs = isUS()
        ? 'Meq ácido = (HCO₃⁻ + CO₃²⁻) − residual objetivo (meq/L o mmolc/L). Resultado en fl oz/1000 gal y galones totales según el volumen indicado.'
        : 'Meq ácido = (HCO₃⁻ + CO₃²⁻) − residual objetivo (meq/L o mmolc/L). Resultado en mL/m³ y litros totales según el volumen indicado.';
      acidHelp.textContent = translateString(helpEs);
    }

    root.querySelectorAll('#aw-acid-select option').forEach(function (opt) {
      var raw = opt.getAttribute('data-name-es') || opt.textContent;
      if (!opt.getAttribute('data-name-es')) opt.setAttribute('data-name-es', raw);
      opt.textContent = translateString(opt.getAttribute('data-name-es'));
    });

    var acidPer = root.querySelector('#aw-acid-per-m3');
    if (acidPer && acidPer.previousElementSibling) {
      acidPer.previousElementSibling.textContent = isUS()
        ? t('Dosis de ácido:', 'Acid dose:') + ' (' + unitSymbol('acid_dose_volume_volume') + ')'
        : t('mL ácido / m³:', 'mL acid / m³:');
    }
    var acidTotal = root.querySelector('#aw-acid-total');
    if (acidTotal && acidTotal.previousElementSibling) {
      acidTotal.previousElementSibling.textContent = isUS()
        ? t('Ácido (volumen total):', 'Acid (total volume):')
        : t('L ácido (volumen total):', 'L acid (total volume):');
    }
    var acidM3Ref = root.querySelector('#aw-acid-m3-ref');
    if (acidM3Ref && acidM3Ref.previousElementSibling) {
      acidM3Ref.previousElementSibling.textContent = isUS()
        ? t('En base a (agua):', 'Based on (water):')
        : t('En base a (m³ agua):', 'Based on (water m³):');
    }
  }

  function ensureBulkDensityHint(input) {
    if (!input) return null;
    var host = input.closest('label') || input.parentElement;
    if (!host) return null;
    var hint = host.querySelector('.np-bd-us-hint');
    if (!hint) {
      hint = w.document.createElement('div');
      hint.className = 'np-bd-us-hint';
      hint.style.cssText = 'display:block;font-size:11px;color:#64748b;margin-top:2px;line-height:1.3;min-height:1.1em;font-weight:400;';
      host.appendChild(hint);
    }
    return hint;
  }

  function updateBulkDensityHint(input) {
    if (!input) return;
    var hint = ensureBulkDensityHint(input);
    if (!hint) return;
    var api = agronomic();
    var display = parseFloat(String(input.value || '').replace(',', '.'));
    var si = Number.isFinite(display) ? toSI(display, 'bulk_density') : NaN;
    var text = api && typeof api.bulkDensitySecondaryLbFt3 === 'function'
      ? api.bulkDensitySecondaryLbFt3(si)
      : '';
    hint.textContent = text;
    hint.hidden = !text;
  }

  function bindBulkDensityHint(root) {
    root = root || (w.document && w.document.getElementById('view')) || w.document;
    if (!root || !root.querySelector) return;
    var input = root.querySelector('#soil-physical-bulkDensity');
    if (!input || input.dataset.npBdHintBound === '1') {
      if (input) updateBulkDensityHint(input);
      return;
    }
    input.addEventListener('input', function () { updateBulkDensityHint(input); });
    input.addEventListener('change', function () { updateBulkDensityHint(input); });
    input.dataset.npBdHintBound = '1';
    updateBulkDensityHint(input);
  }

  return {
    translateString: translateString,
    t: t,
    prefs: prefs,
    isUS: isUS,
    unitSymbol: unitSymbol,
    toSI: toSI,
    fromSI: fromSI,
    inputFromSI: inputFromSI,
    formatDoseMassArea: formatDoseMassArea,
    formatMassKg: formatMassKg,
    formatVolumeM3: formatVolumeM3,
    volumeInputFromSI: volumeInputFromSI,
    volumeInputToSI: volumeInputToSI,
    formatAcidDoseMlPerM3: formatAcidDoseMlPerM3,
    formatAcidTotalLiters: formatAcidTotalLiters,
    applyUnitLabels: applyUnitLabels,
    bindBulkDensityHint: bindBulkDensityHint,
    updateBulkDensityHint: updateBulkDensityHint,
    formatBulkDensityFromSI: function (gcm3, digits) {
      var api = agronomic();
      if (api && typeof api.formatBulkDensityFromSI === 'function') {
        return api.formatBulkDensityFromSI(gcm3, digits);
      }
      var n = Number(gcm3);
      return Number.isFinite(n) ? n.toFixed(digits == null ? 3 : digits) + ' g/cm³' : '—';
    }
  };
});
