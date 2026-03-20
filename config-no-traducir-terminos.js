/**
 * Términos que NO deben traducirse (fórmulas, iones, unidades).
 * Se usa para marcar con translate="no" solo estos, y dejar que el resto de la página sí se traduzca.
 *
 * Regla: "Nitrato de calcio" → SÍ se traduce. "NO₃" o "NO3" → NO se traduce.
 */

(function (window) {
  'use strict';

  // —— Fórmulas / iones (símbolos químicos, subíndices como ₂ ₃ ⁺ ⁻)
  var FORMULAS_IONES = [
    'NO₃', 'NO3', 'NO₄', 'NO4',
    'SO₄', 'SO4', 'SO₄²⁻', 'SO4²⁻',
    'H₂PO₄', 'H2PO4', 'H₂PO₄⁻', 'H2PO4⁻',
    'PO₄', 'PO4', 'PO₄³⁻', 'PO4³⁻',
    'NH₄', 'NH4', 'NH₄⁺', 'NH4+',
    'K⁺', 'K+', 'Ca²⁺', 'Ca2+', 'Mg²⁺', 'Mg2+',
    'Na⁺', 'Na+', 'Zn²⁺', 'Zn2+', 'Fe²⁺', 'Fe2+', 'Fe³⁺', 'Fe3+',
    'Mn²⁺', 'Mn2+', 'Cu²⁺', 'Cu2+', 'BO₃³⁻', 'BO33-',
    'CaO', 'K₂O', 'K2O', 'MgO', 'P₂O₅', 'P2O5',
    'CaCO₃', 'CaCO3', 'MgCO₃', 'MgCO3',
    'CaSO₄', 'CaSO4', 'K₂SO₄', 'K2SO4', 'MgSO₄', 'MgSO4',
    'H₂O', 'H2O', 'CO₃', 'CO3', 'CO₃²⁻', 'CO32-',
    'SiO₂', 'SiO2',
    'HCO₃⁻', 'HCO3-', 'HCO₃', 'HCO3',
    'Fe/dtp', 'Fe/DTPA', 'Fe/EDDHA', 'Fe-EDDHA',
    'SO₃', 'SO3', 'SO₂', 'SO2',
    'NH₂', 'NH2', 'NO₂', 'NO2',
    'H₃PO₄', 'H3PO4', 'H₂SO₄', 'H2SO4',
    'MnO', 'MnO₂', 'MnO2', 'CuO', 'ZnO',
    'Al₂O₃', 'Al2O3', 'Fe₂O₃', 'Fe2O3', 'FeO',
    'B₄O₇', 'B2O3',     'MoO₃', 'MoO3',
    /* Silicio: %Si y cabeceras (el traductor confunde “Si” con “sí/if”) */
    '%Si', 'Si (kg/ha)', 'Si (%)'
  ];

  /**
   * Símbolos cortos (elementos) que el traductor confunde con palabras (Fe→Faith, Si→Yeah, Na→That).
   * NO usar lista simple de texto: "Ca" dentro de "Cada" rompería la palabra.
   * Estos se aplican con límite de palabra \\b en apply-no-traducir.js
   * Omitimos "Se" (selenio) para no tocar "Se" al inicio de frases en español.
   */
  var SIMBOLOS_ELEMENTO_BORDE_PALABRA = [
    'Si', 'Ca', 'Na', 'Fe', 'Cu', 'Mo', 'Cl', 'Zn', 'Mn', 'Mg', 'Al', 'B',
    'Ni', 'Cr', 'Pb', 'Ag', 'As', 'Cd', 'Hg', 'Sb', 'Ba', 'Sr',
    /* P suelta (cabeceras N-P-K, “P” fósforo). \b no parte “P2O5”. Ojo: puede marcar la P de “P. ej.” si aparece en la UI. */
    'P'
  ];

  // —— Unidades y abreviaturas técnicas (no traducir)
  var UNIDADES_ABREVIATURAS = [
    'meq', 'mmol', 'ppm', 'mg/L', 'meq/L', 'mmol/L',
    'meq/100g', 'kg/ha', 'g/L', 'mL', 'L/ha',
    'µS/cm', 'mS/cm', 'dS/m', 'EC',
    'CIC', 'pH', 'VPD', 'kPa', '°C', '%'
  ];

  // —— Fertilizantes y quelatos (siglas en inglés de uso internacional; no traducir)
  // Nombres como "Nitrato de Calcio" o "Sulfato de Magnesio" sí se traducen.
  var FERTILIZANTES_ACRONIMOS = [
    'MAP', 'MKP', 'SOP', 'DAP', 'TSP', 'MOP', 'UAN',
    'NKS', 'NK+Mg', 'NPK', 'N-P-K', 'TE',
    'EDTA', 'EDDHA', 'DTPA', 'HEDTA', 'HEEDTA',
    'WSF', 'Me', 'Urea'
  ];

  // Unificar y exportar (sin duplicados)
  var TODOS = [];
  FORMULAS_IONES.forEach(function (t) { if (TODOS.indexOf(t) === -1) TODOS.push(t); });
  UNIDADES_ABREVIATURAS.forEach(function (t) { if (TODOS.indexOf(t) === -1) TODOS.push(t); });
  FERTILIZANTES_ACRONIMOS.forEach(function (t) { if (TODOS.indexOf(t) === -1) TODOS.push(t); });

  window.NUTRIPLANT_NO_TRADUCIR = {
    formulasIones: FORMULAS_IONES,
    unidadesAbreviaturas: UNIDADES_ABREVIATURAS,
    fertilizantesAcronimos: FERTILIZANTES_ACRONIMOS,
    simbolosElementoBordePalabra: SIMBOLOS_ELEMENTO_BORDE_PALABRA,
    todos: TODOS
  };
})(window);
