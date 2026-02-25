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
    'SiO₂', 'SiO2', 'Si'
  ];

  // —— Unidades y abreviaturas técnicas (no traducir)
  var UNIDADES_ABREVIATURAS = [
    'meq', 'mmol', 'ppm', 'mg/L', 'meq/L', 'mmol/L',
    'meq/100g', 'kg/ha', 'g/L', 'mL', 'L/ha',
    'µS/cm', 'mS/cm', 'dS/m', 'EC',
    'CIC', 'pH', 'VPD', 'kPa', '°C', '%'
  ];

  // Unificar y exportar (sin duplicados)
  var TODOS = [];
  FORMULAS_IONES.forEach(function (t) { if (TODOS.indexOf(t) === -1) TODOS.push(t); });
  UNIDADES_ABREVIATURAS.forEach(function (t) { if (TODOS.indexOf(t) === -1) TODOS.push(t); });

  window.NUTRIPLANT_NO_TRADUCIR = {
    formulasIones: FORMULAS_IONES,
    unidadesAbreviaturas: UNIDADES_ABREVIATURAS,
    todos: TODOS
  };
})(window);
