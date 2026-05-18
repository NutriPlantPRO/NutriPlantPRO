/**
 * Conversor de magnitudes físicas (longitud, área, volumen, masa, temperatura, presión, concentración, carga iónica).
 * Compartido por dashboard.html y login.html.
 */
/* global document */
var MEASURE_UNITS = {
  length: [
    { id: 'm', name: 'm (metro)', toBase: 1 },
    { id: 'km', name: 'km', toBase: 1000 },
    { id: 'cm', name: 'cm', toBase: 0.01 },
    { id: 'ft', name: 'ft (pie)', toBase: 0.3048 },
    { id: 'in', name: 'in (pulgada)', toBase: 0.0254 },
    { id: 'yd', name: 'yd (yarda)', toBase: 0.9144 },
    { id: 'mi', name: 'mi (milla)', toBase: 1609.344 }
  ],
  area: [
    { id: 'm2', name: 'm²', toBase: 1 },
    { id: 'ha', name: 'ha (hectárea)', toBase: 10000 },
    { id: 'acre', name: 'acre', toBase: 4046.86 },
    { id: 'ft2', name: 'ft²', toBase: 0.092903 },
    { id: 'km2', name: 'km²', toBase: 1e6 }
  ],
  volume: [
    { id: 'L', name: 'L (litro)', toBase: 1 },
    { id: 'mL', name: 'mL', toBase: 0.001 },
    { id: 'm3', name: 'm³', toBase: 1000 },
    { id: 'galUS', name: 'gal (US)', toBase: 3.78541 },
    { id: 'galUK', name: 'gal (UK)', toBase: 4.54609 },
    { id: 'ft3', name: 'ft³', toBase: 28.3168 },
    { id: 'flozUS', name: 'fl oz (US)', toBase: 0.0295735 }
  ],
  weight: [
    { id: 'kg', name: 'kg', toBase: 1 },
    { id: 'g', name: 'g', toBase: 0.001 },
    { id: 'mg', name: 'mg', toBase: 0.000001 },
    { id: 't', name: 't (tonelada)', toBase: 1000 },
    { id: 'lb', name: 'lb (libra)', toBase: 0.453592 },
    { id: 'oz', name: 'oz (onza)', toBase: 0.0283495 }
  ],
  temperature: [
    { id: 'C', name: '°C', toBase: 1, isTemp: true },
    { id: 'F', name: '°F', toBase: 1, isTemp: true },
    { id: 'K', name: 'K', toBase: 1, isTemp: true }
  ],
  pressure: [
    { id: 'kPa', name: 'kPa', toBase: 1 },
    { id: 'psi', name: 'psi', toBase: 6.89476 },
    { id: 'bar', name: 'bar', toBase: 100 },
    { id: 'atm', name: 'atm', toBase: 101.325 },
    { id: 'mmHg', name: 'mmHg', toBase: 0.133322 }
  ],
  concentration: [
    { id: 'mgL', name: 'mg/L', toBase: 1 },
    { id: 'ppm', name: 'ppm (≈ mg/L, agua diluida)', toBase: 1 },
    { id: 'ugL', name: 'µg/L (ppb)', toBase: 0.001 },
    { id: 'gm3', name: 'g/m³ (= mg/L)', toBase: 1 },
    { id: 'mgm3', name: 'mg/m³', toBase: 0.001 },
    { id: 'gL', name: 'g/L', toBase: 1000 },
    { id: 'kgm3', name: 'kg/m³', toBase: 1000 },
    /* USA: referencia mg/L. Galón = US liquid gallon (3.785411784 L). */
    { id: 'lbMgalUS', name: 'lb / millón US gal (trat. agua, USA)', toBase: 0.1198264273 },
    { id: 'lb100galUS', name: 'lb / 100 US gal (tanques, USA)', toBase: 1198.264273 },
    { id: 'ozGalUSmass', name: 'oz masa / US gal (USA)', toBase: 7489.086034 }
  ],
  /* Carga equivalente (agrícola). No mezclar suelo con solución: grupos distintos. */
  ionic: [
    { id: 'meqL', name: 'meq/L (solución o agua)', toBase: 1, group: 'solution' },
    { id: 'cmolL', name: 'cmol(+)/L (solución)', toBase: 10, group: 'solution' },
    { id: 'mmolL', name: 'mmol/L (monovalente ≈ meq/L)', toBase: 1, group: 'solution' },
    { id: 'meq100g', name: 'meq/100 g (suelo, CIC)', toBase: 1, group: 'soil' },
    { id: 'cmolKg', name: 'cmolc/kg = cmol(+)/kg (suelo)', toBase: 1, group: 'soil' }
  ]
};

function updateMeasureUnitOptions() {
  var cat = document.getElementById('measure-category');
  var from = document.getElementById('measure-from');
  var to = document.getElementById('measure-to');
  if (!cat || !from || !to) return;
  var list = MEASURE_UNITS[cat.value];
  if (!list || !list.length) {
    from.innerHTML = '';
    to.innerHTML = '';
    return;
  }
  from.innerHTML = list.map(function(u) { return '<option value="' + u.id + '">' + u.name + '</option>'; }).join('');
  to.innerHTML = from.innerHTML;
  from.value = list[0].id;
  to.value = list[list.length > 1 ? 1 : 0].id;
  var hint = document.getElementById('measure-ionic-hint');
  if (hint) {
    hint.style.display = cat.value === 'ionic' ? 'block' : 'none';
  }
  convertMeasureUnits();
}

function convertMeasureUnits() {
  var cat = document.getElementById('measure-category');
  var valIn = document.getElementById('measure-value');
  var fromSel = document.getElementById('measure-from');
  var toSel = document.getElementById('measure-to');
  var resultEl = document.getElementById('measure-result');
  if (!cat || !valIn || !fromSel || !toSel || !resultEl) return;
  var list = MEASURE_UNITS[cat.value];
  if (!list || !list.length) return;
  var num = parseFloat(valIn.value);
  if (isNaN(num)) { resultEl.value = ''; return; }
  var fromUnit = list.find(function(u) { return u.id === fromSel.value; });
  var toUnit = list.find(function(u) { return u.id === toSel.value; });
  if (!fromUnit || !toUnit) return;
  if (cat.value === 'ionic' && fromUnit.group && toUnit.group && fromUnit.group !== toUnit.group) {
    resultEl.value = '—';
    resultEl.title = 'No se puede convertir entre unidades de suelo y de solución. Elige unidades del mismo grupo.';
    return;
  }
  resultEl.title = '';
  var outVal;
  if (cat.value === 'temperature') {
    var c = num;
    if (fromUnit.id === 'F') c = (num - 32) * 5 / 9;
    else if (fromUnit.id === 'K') c = num - 273.15;
    if (toUnit.id === 'F') outVal = c * 9 / 5 + 32;
    else if (toUnit.id === 'K') outVal = c + 273.15;
    else outVal = c;
  } else {
    var baseVal = num * fromUnit.toBase;
    outVal = baseVal / toUnit.toBase;
  }
  resultEl.value = (Math.round(outVal * 1e6) / 1e6).toString();
}
