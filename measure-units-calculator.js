/**
 * Conversor de magnitudes físicas (longitud, área, volumen, masa, temperatura, presión, concentración, carga iónica).
 * Incluye estimación % superficie con raíces (copa circular o camas).
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
    { id: 'lbMgalUS', name: 'lb / millón US gal (trat. agua, USA)', toBase: 0.1198264273 },
    { id: 'lb100galUS', name: 'lb / 100 US gal (tanques, USA)', toBase: 1198.264273 },
    { id: 'ozGalUSmass', name: 'oz masa / US gal (USA)', toBase: 7489.086034 }
  ],
  ionic: [
    { id: 'meqL', name: 'meq/L (solución o agua)', toBase: 1, group: 'solution' },
    { id: 'cmolL', name: 'cmol(+)/L (solución)', toBase: 10, group: 'solution' },
    { id: 'mmolL', name: 'mmol/L (monovalente ≈ meq/L)', toBase: 1, group: 'solution' },
    { id: 'umolL', name: 'µmol/L (monovalente; 1000 µmol/L ≈ 1 meq/L)', toBase: 0.001, group: 'solution' },
    { id: 'meq100g', name: 'meq/100 g (suelo, CIC)', toBase: 1, group: 'soil' },
    { id: 'cmolKg', name: 'cmolc/kg = cmol(+)/kg (suelo)', toBase: 1, group: 'soil' }
  ]
};

var MEASURE_SPECIAL_CATEGORIES = ['rootReachPlant', 'rootReachBed'];

function measureRound(n, dec) {
  if (!Number.isFinite(n)) return null;
  var f = Math.pow(10, dec != null ? dec : 2);
  return Math.round(n * f) / f;
}

function measureParseNum(id) {
  var el = document.getElementById(id);
  if (!el || el.value === '') return null;
  var n = parseFloat(el.value);
  return Number.isFinite(n) ? n : null;
}

function isMeasureSpecialCategory(cat) {
  return MEASURE_SPECIAL_CATEGORIES.indexOf(cat) >= 0;
}

function renderMeasureSpecialPanel(cat) {
  var panel = document.getElementById('measure-special-panel');
  if (!panel) return;
  panel.style.display = 'block';
  if (cat === 'rootReachPlant') {
    panel.innerHTML =
      '<p style="margin:0 0 12px;font-size:12px;line-height:1.45;color:#475569;">Estima el <strong>% de superficie del cultivo</strong> con exploración radical activa (círculo por planta × densidad). Referencia para franja regada en balance hídrico.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">' +
      '<div class="form-group"><label>Zona radical (tipo)</label>' +
      '<select id="measure-rrp-mode" onchange="calcMeasureSpecial()">' +
      '<option value="radius">Radio (m)</option>' +
      '<option value="diameter">Diámetro copa / raíz (m)</option>' +
      '<option value="orilla">Separación orilla a orilla (m)</option>' +
      '</select></div>' +
      '<div class="form-group"><label>Medida (m)</label>' +
      '<input type="number" id="measure-rrp-size" min="0" step="0.01" placeholder="Ej. 1.2" oninput="calcMeasureSpecial()"></div>' +
      '</div>' +
      '<p style="margin:10px 0 8px;font-size:12px;color:#64748b;"><strong>Plantas por hectárea</strong> — ingresa densidad o calcula con separaciones:</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">' +
      '<div class="form-group"><label>Plantas / ha (directo)</label>' +
      '<input type="number" id="measure-rrp-plants-ha" min="0" step="1" placeholder="Opcional" oninput="calcMeasureSpecial()"></div>' +
      '<div class="form-group"><label>Separación surcos (m)</label>' +
      '<input type="number" id="measure-rrp-row-m" min="0" step="0.01" placeholder="Ej. 3" oninput="calcMeasureSpecial()"></div>' +
      '<div class="form-group"><label>Separación en surco (m)</label>' +
      '<input type="number" id="measure-rrp-inrow-m" min="0" step="0.01" placeholder="Ej. 2" oninput="calcMeasureSpecial()"></div>' +
      '</div>';
  } else if (cat === 'rootReachBed') {
    panel.innerHTML =
      '<p style="margin:0 0 12px;font-size:12px;line-height:1.45;color:#475569;">Estima el <strong>% de superficie</strong> ocupada por camas/bandas con raíces activas (surcos + ancho de cama).</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">' +
      '<div class="form-group"><label>Distancia entre surcos (m)</label>' +
      '<input type="number" id="measure-rrb-row-m" min="0" step="0.01" placeholder="Centro a centro" oninput="calcMeasureSpecial()"></div>' +
      '<div class="form-group"><label>Ancho de cama (m)</label>' +
      '<input type="number" id="measure-rrb-bed-m" min="0" step="0.01" placeholder="Ej. 1.2" oninput="calcMeasureSpecial()"></div>' +
      '<div class="form-group"><label>Raíz en cama (% del ancho)</label>' +
      '<input type="number" id="measure-rrb-reach-pct" min="1" max="100" step="1" value="100" placeholder="100" oninput="calcMeasureSpecial()"></div>' +
      '</div>' +
      '<p style="margin:8px 0 0;font-size:11px;color:#64748b;">100 % = toda la cama humedecida; baja si solo parte del ancho tiene raíces activas.</p>';
  }
}

function calcMeasureSpecial() {
  var cat = document.getElementById('measure-category');
  var wrap = document.getElementById('measure-special-result-wrap');
  var labelEl = document.getElementById('measure-special-result-label');
  var resultEl = document.getElementById('measure-special-result');
  var detailEl = document.getElementById('measure-special-detail');
  if (!cat || !wrap || !labelEl || !resultEl || !detailEl) return;
  if (!isMeasureSpecialCategory(cat.value)) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  var pct = null;
  var detail = '';
  var label = '% superficie con raíces (estimado)';

  if (cat.value === 'rootReachPlant') {
    var modeEl = document.getElementById('measure-rrp-mode');
    var mode = modeEl ? modeEl.value : 'radius';
    var size = measureParseNum('measure-rrp-size');
    var plantsHa = measureParseNum('measure-rrp-plants-ha');
    var rowM = measureParseNum('measure-rrp-row-m');
    var inrowM = measureParseNum('measure-rrp-inrow-m');
    if (plantsHa == null && rowM != null && rowM > 0 && inrowM != null && inrowM > 0) {
      plantsHa = measureRound(10000 / (rowM * inrowM), 1);
    }
    if (size == null || size <= 0) {
      resultEl.textContent = '—';
      detailEl.textContent = 'Indica la medida (m) de la zona radical.';
      return;
    }
    if (plantsHa == null || plantsHa <= 0) {
      resultEl.textContent = '—';
      detailEl.textContent = 'Indica plantas/ha o separación surcos × en surco.';
      return;
    }
    var radius = mode === 'radius' ? size : size / 2;
    var areaPlant = Math.PI * radius * radius;
    var totalM2 = areaPlant * plantsHa;
    pct = measureRound((totalM2 / 10000) * 100, 1);
    var capped = pct > 100;
    if (capped) pct = 100;
    detail =
      'Área por planta ≈ ' +
      measureRound(areaPlant, 2) +
      ' m² (r = ' +
      measureRound(radius, 2) +
      ' m) · ' +
      measureRound(plantsHa, 0) +
      ' plantas/ha → ' +
      measureRound(totalM2, 0) +
      ' m²/ha' +
      (capped ? ' · <strong>Superposición:</strong> círculos suman más de 1 ha; se muestra 100 % máximo.' : '') +
      ' · Usa este % en balance hídrico → raíces en superficie / franja regada.';
  } else if (cat.value === 'rootReachBed') {
    var rowSpacing = measureParseNum('measure-rrb-row-m');
    var bedW = measureParseNum('measure-rrb-bed-m');
    var reachPct = measureParseNum('measure-rrb-reach-pct');
    if (reachPct == null) reachPct = 100;
    if (rowSpacing == null || rowSpacing <= 0 || bedW == null || bedW <= 0) {
      resultEl.textContent = '—';
      detailEl.textContent = 'Indica distancia entre surcos y ancho de cama (m).';
      return;
    }
    if (bedW > rowSpacing) {
      resultEl.textContent = '—';
      detailEl.textContent = 'El ancho de cama no puede ser mayor que la distancia entre surcos.';
      return;
    }
    var effectiveBed = bedW * (reachPct / 100);
    pct = measureRound((effectiveBed / rowSpacing) * 100, 1);
    var m2Ha = measureRound(pct * 100, 0);
    detail =
      'Fracción surco: ' +
      measureRound(bedW, 2) +
      ' m cama ÷ ' +
      measureRound(rowSpacing, 2) +
      ' m entre surcos' +
      (reachPct < 100 ? ' × ' + reachPct + '% raíz en cama' : '') +
      ' → ' +
      m2Ha +
      ' m²/ha con raíces · Usa este % en balance hídrico.';
  }

  if (pct != null) {
    labelEl.textContent = label;
    resultEl.textContent = pct + ' %';
    detailEl.innerHTML = detail;
  }
}

function updateMeasureUnitOptions() {
  var cat = document.getElementById('measure-category');
  var from = document.getElementById('measure-from');
  var to = document.getElementById('measure-to');
  if (!cat) return;

  var special = isMeasureSpecialCategory(cat.value);
  var standardPanel = document.getElementById('measure-standard-panel');
  var specialPanel = document.getElementById('measure-special-panel');
  var specialWrap = document.getElementById('measure-special-result-wrap');
  var hint = document.getElementById('measure-ionic-hint');

  if (special) {
    if (standardPanel) standardPanel.style.display = 'none';
    if (hint) hint.style.display = 'none';
    renderMeasureSpecialPanel(cat.value);
    calcMeasureSpecial();
    return;
  }

  if (standardPanel) standardPanel.style.display = 'block';
  if (specialPanel) {
    specialPanel.innerHTML = '';
    specialPanel.style.display = 'none';
  }
  if (specialWrap) specialWrap.style.display = 'none';

  if (!from || !to) return;
  var list = MEASURE_UNITS[cat.value];
  if (!list || !list.length) {
    from.innerHTML = '';
    to.innerHTML = '';
    return;
  }
  from.innerHTML = list.map(function (u) {
    return '<option value="' + u.id + '">' + u.name + '</option>';
  }).join('');
  to.innerHTML = from.innerHTML;
  from.value = list[0].id;
  to.value = list[list.length > 1 ? 1 : 0].id;
  if (hint) {
    hint.style.display = cat.value === 'ionic' ? 'block' : 'none';
  }
  convertMeasureUnits();
}

function convertMeasureUnits() {
  var cat = document.getElementById('measure-category');
  if (cat && isMeasureSpecialCategory(cat.value)) {
    calcMeasureSpecial();
    return;
  }
  var valIn = document.getElementById('measure-value');
  var fromSel = document.getElementById('measure-from');
  var toSel = document.getElementById('measure-to');
  var resultEl = document.getElementById('measure-result');
  if (!cat || !valIn || !fromSel || !toSel || !resultEl) return;
  var list = MEASURE_UNITS[cat.value];
  if (!list || !list.length) return;
  var num = parseFloat(valIn.value);
  if (isNaN(num)) {
    resultEl.value = '';
    return;
  }
  var fromUnit = list.find(function (u) {
    return u.id === fromSel.value;
  });
  var toUnit = list.find(function (u) {
    return u.id === toSel.value;
  });
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
