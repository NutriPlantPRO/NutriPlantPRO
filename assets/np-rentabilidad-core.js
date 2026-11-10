/**
 * NutriPlant PRO — Rentabilidad Agrícola
 * Fórmulas, validaciones, formatos, ejemplos e interpretaciones.
 * Los cálculos viven en el navegador. Esta capa no guarda datos ni convierte divisas.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof root !== 'undefined') root.NpRentabilidad = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CURRENCIES = [
    { code: 'USD', name: 'Dólar estadounidense' },
    { code: 'MXN', name: 'Peso mexicano' },
    { code: 'EUR', name: 'Euro' }
  ];

  var COST_GROUPS = [
    { id: 'nutricion', label: 'Nutrición vegetal' },
    { id: 'sanidad', label: 'Sanidad del cultivo' },
    { id: 'operacion', label: 'Operación del ciclo' },
    { id: 'cosecha', label: 'Cosecha y comercialización' },
    { id: 'admin', label: 'Administración y otros' }
  ];

  var COST_CATEGORIES = [
    { id: 'nutricion', label: 'Nutrición vegetal', group: 'nutricion', primary: true },
    { id: 'plagas', label: 'Control de plagas y enfermedades', group: 'sanidad', primary: true },
    { id: 'malezas', label: 'Control de malezas', group: 'sanidad', primary: true },
    { id: 'energia', label: 'Combustibles y energía', group: 'operacion', primary: true },
    { id: 'personal', label: 'Personal operativo', group: 'operacion', primary: true },
    { id: 'cosecha', label: 'Cosecha', group: 'cosecha', primary: true },
    { id: 'agua', label: 'Agua y riego', group: 'operacion', primary: false },
    { id: 'maquinaria', label: 'Maquinaria y mantenimiento', group: 'operacion', primary: false },
    { id: 'empaque', label: 'Empaque y clasificación', group: 'cosecha', primary: false },
    { id: 'transporte', label: 'Transporte y comercialización', group: 'cosecha', primary: false },
    { id: 'admin', label: 'Administración', group: 'admin', primary: false },
    { id: 'otros', label: 'Otros costos', group: 'admin', primary: false }
  ];

  var EXAMPLE_DISCLAIMER =
    'Ejemplo hipotético con fines educativos. Los costos reales dependen del cultivo, región, sistema de producción y condiciones particulares.';
  var COMPARISON_DISCLAIMER =
    'Los resultados dependen de la información proporcionada. Las comparaciones deben realizarse bajo condiciones productivas equivalentes y considerar los costos relevantes.';
  var AGRONOMIC_NOTE =
    'Una respuesta productiva debe evaluarse considerando las condiciones del cultivo, calidad comercial, variación climática, manejo agronómico y costos asociados.';
  var CAUSALITY_NOTE =
    'La comparación describe los datos capturados. No afirma que una tecnología haya causado el cambio si el ejercicio es hipotético o no está respaldado por una evaluación bajo condiciones equivalentes.';
  var TAX_NOTE =
    'La utilidad presentada es previa a impuestos. El financiamiento solo entra si se registran intereses o comisiones; el capital de un préstamo no se suma otra vez si la compra ya está en los costos.';
  var MODULE_A_MESSAGE =
    'Producir más no siempre significa ganar más. Conoce tus costos y descubre tu rentabilidad.';
  var MODULE_B_MESSAGE =
    'No se trata de elegir siempre el programa más barato, sino de conocer cuánto valor genera cada dólar adicional invertido.';
  var DUPLICATE_COST_NOTE =
    'Evita duplicar gastos. Si una labor ya está en personal, maquinaria o un programa, no la anotes otra vez en otro concepto.';

  function isCurrency(code) {
    return CURRENCIES.some(function (item) { return item.code === code; });
  }

  function parseUserNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (value == null) return NaN;
    var s = String(value).trim().replace(/\s+/g, '');
    if (!s) return NaN;
    var neg = false;
    if (s.charAt(0) === '-') {
      neg = true;
      s = s.slice(1);
    } else if (s.charAt(0) === '+') {
      s = s.slice(1);
    }
    if (!s || !/^[0-9.,]+$/.test(s)) return NaN;
    var comma = s.lastIndexOf(',');
    var dot = s.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      if (comma > dot) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (comma >= 0) {
      var bits = s.split(',');
      if (bits.length > 2) s = bits.join('');
      else if (bits[1].length === 3) s = bits.join('');
      else s = bits[0] + '.' + bits[1];
    }
    var n = Number(s);
    if (!Number.isFinite(n)) return NaN;
    return neg ? -n : n;
  }

  function readOptionalNumber(value) {
    if (value == null || String(value).trim() === '') return { ok: true, empty: true, value: null };
    var n = parseUserNumber(value);
    if (!Number.isFinite(n)) return { ok: false, empty: false, value: NaN, code: 'invalid_number' };
    return { ok: true, empty: false, value: n };
  }

  function groupThousands(intText) {
    return intText.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatPlain(amount, decimals) {
    if (!Number.isFinite(amount)) return null;
    var neg = amount < 0;
    var rounded = Math.round(Math.abs(amount) * Math.pow(10, decimals)) / Math.pow(10, decimals);
    var fixed = rounded.toFixed(decimals);
    var bits = fixed.split('.');
    var body = groupThousands(bits[0]);
    if (decimals > 0 && /[1-9]/.test(bits[1])) body += '.' + bits[1].replace(/0+$/, '');
    return (neg ? '-' : '') + body;
  }

  function formatMoney(amount, currency) {
    var code = isCurrency(currency) ? currency : (currency || 'USD');
    var body = formatPlain(amount, 2);
    if (body == null) return '—';
    return code + ' ' + body;
  }

  function formatPct(amount) {
    if (!Number.isFinite(amount)) return '—';
    var rounded = Math.round(amount * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded)) + '%';
    return rounded.toFixed(2) + '%';
  }

  function formatKg(amount) {
    var body = formatPlain(amount, 3);
    if (body == null) return '—';
    return body + ' kg';
  }

  function formatPerKg(amount, currency) {
    var money = formatMoney(amount, currency);
    if (money === '—') return money;
    return money + '/kg';
  }

  function formatRatio(value) {
    if (!Number.isFinite(value)) return null;
    var rounded = Math.round(value * 100) / 100;
    var text = Math.abs(rounded - Math.round(rounded)) < 1e-9
      ? String(Math.round(rounded))
      : rounded.toFixed(2);
    return text + ':1';
  }

  function emptyCostLines() {
    return COST_CATEGORIES.map(function (cat) {
      return { id: cat.id, label: cat.label, group: cat.group, amount: '', kind: 'cost', custom: false };
    });
  }

  function exampleModuleA() {
    return {
      currency: 'USD',
      exerciseName: 'Análisis económico del ciclo productivo',
      crop: '',
      areaHa: '',
      period: 'Ciclo productivo',
      isExample: true,
      costs: [
        { id: 'ex-nut', label: 'Nutrición vegetal', group: 'nutricion', amount: 2000, kind: 'cost' },
        { id: 'ex-san', label: 'Control de plagas y malezas', group: 'sanidad', amount: 2000, kind: 'cost' },
        { id: 'ex-ene', label: 'Combustibles y energía', group: 'operacion', amount: 1500, kind: 'cost' },
        { id: 'ex-per', label: 'Personal operativo', group: 'operacion', amount: 5000, kind: 'cost' },
        { id: 'ex-cos', label: 'Cosecha, empaque y transporte', group: 'cosecha', amount: 3000, kind: 'cost' },
        { id: 'ex-otr', label: 'Mantenimiento y otros gastos', group: 'admin', amount: 1500, kind: 'cost' }
      ],
      harvestedKg: '',
      soldKg: 20000,
      pricePerKg: 1,
      byproductRevenue: '',
      financingCost: ''
    };
  }

  function exampleModuleB() {
    return {
      currency: 'USD',
      strategyName: 'Programa de nutrición',
      scope: 'intervention',
      isExample: true,
      current: { programCost: 2000, soldKg: 20000, pricePerKg: 1, associatedCosts: '' },
      improved: { programCost: 2200, soldKg: 21000, pricePerKg: 1, associatedCosts: '' },
      otherMode: 'none',
      otherLump: '',
      variablePerKg: '',
      savings: ''
    };
  }

  function pushError(list, code, message) {
    list.push({ code: code, message: message });
  }

  function sumCostLines(lines, errors) {
    var total = 0;
    var items = [];
    (lines || []).forEach(function (line, index) {
      var parsed = readOptionalNumber(line && line.amount);
      var label = (line && line.label) || ('Concepto ' + (index + 1));
      if (!parsed.ok) {
        pushError(errors, 'invalid_number', 'Revisa el importe de «' + label + '».');
        return;
      }
      var amount = parsed.empty ? 0 : parsed.value;
      var kind = line && (line.kind === 'saving' || line.kind === 'adjustment') ? line.kind : 'cost';
      if (kind === 'cost' && amount < 0) {
        pushError(errors, 'negative_cost', '«' + label + '» no puede ser negativo. Un ahorro se registra en el apartado de ahorros, no como costo ordinario.');
        return;
      }
      if (kind !== 'cost' && amount < 0) {
        pushError(errors, 'negative_saving', 'El ahorro o ajuste de «' + label + '» se anota en positivo.');
        return;
      }
      var signed = kind === 'cost' ? amount : -amount;
      total += signed;
      items.push({
        id: line && line.id,
        label: label,
        group: (line && line.group) || 'admin',
        amount: amount,
        signed: signed,
        kind: kind
      });
    });
    return { total: total, items: items };
  }

  function summarizeGroups(lines) {
    var summed = sumCostLines(lines || [], []);
    var buckets = {};
    COST_GROUPS.forEach(function (group) {
      buckets[group.id] = { id: group.id, label: group.label, total: 0 };
    });
    var loose = { id: 'sin_grupo', label: 'Otros conceptos', total: 0, used: false };
    summed.items.forEach(function (item) {
      if (buckets[item.group]) buckets[item.group].total += item.signed;
      else {
        loose.total += item.signed;
        loose.used = true;
      }
    });
    var rows = COST_GROUPS.map(function (group) { return buckets[group.id]; })
      .filter(function (row) { return Math.abs(row.total) > 0; });
    if (loose.used) rows.push({ id: loose.id, label: loose.label, total: loose.total });
    return rows;
  }

  function evaluateCrop(input) {
    input = input || {};
    var errors = [];
    var notices = [];
    var currency = isCurrency(input.currency) ? input.currency : 'USD';
    var costs = sumCostLines(input.costs, errors);
    var harvested = readOptionalNumber(input.harvestedKg);
    var sold = readOptionalNumber(input.soldKg);
    var price = readOptionalNumber(input.pricePerKg);
    var byproduct = readOptionalNumber(input.byproductRevenue);
    var financing = readOptionalNumber(input.financingCost);
    var area = readOptionalNumber(input.areaHa);

    [harvested, sold, price, byproduct, financing, area].forEach(function (parsed) {
      if (!parsed.ok) pushError(errors, parsed.code, 'Hay un dato numérico que no se pudo leer.');
    });
    if (harvested.ok && !harvested.empty && harvested.value < 0) {
      pushError(errors, 'negative_production', 'La producción cosechada no puede ser negativa.');
    }
    if (sold.ok && !sold.empty && sold.value < 0) {
      pushError(errors, 'negative_production', 'La producción comercializada no puede ser negativa.');
    }
    if (price.ok && !price.empty && price.value < 0) {
      pushError(errors, 'negative_price', 'El precio de venta no puede ser negativo.');
    }
    if (byproduct.ok && !byproduct.empty && byproduct.value < 0) {
      pushError(errors, 'negative_byproduct', 'Los ingresos por subproductos no pueden ser negativos.');
    }
    if (financing.ok && !financing.empty && financing.value < 0) {
      pushError(errors, 'negative_financing', 'Los intereses y comisiones se anotan en positivo.');
    }
    if (area.ok && !area.empty && area.value <= 0) {
      pushError(errors, 'invalid_area', 'La superficie debe ser mayor que cero para calcular valores por hectárea.');
    }
    if (harvested.ok && sold.ok && !harvested.empty && !sold.empty && sold.value > harvested.value) {
      pushError(errors, 'sold_exceeds_harvest', 'La producción comercializada no puede superar la producción cosechada.');
    }

    var blocked = errors.length > 0;
    var totalCost = blocked ? null : costs.total;
    var soldKg = !blocked && sold.ok && !sold.empty ? sold.value : null;
    var pricePerKg = !blocked && price.ok && !price.empty ? price.value : null;
    var byproductValue = !blocked && byproduct.ok && !byproduct.empty ? byproduct.value : 0;
    var financingValue = !blocked && financing.ok && !financing.empty ? financing.value : 0;
    var areaHa = !blocked && area.ok && !area.empty ? area.value : null;
    var harvestedKg = !blocked && harvested.ok && !harvested.empty ? harvested.value : null;

    var revenue = null;
    var profit = null;
    var profitAfterFinancing = null;
    var costPerKg = null;
    var returnOnCostPct = null;
    var marginOnSalesPct = null;
    var breakEvenPrice = null;
    var wasteKg = null;
    var commercializationPct = null;

    if (!blocked && soldKg != null && pricePerKg != null) {
      revenue = soldKg * pricePerKg + byproductValue;
      profit = revenue - totalCost;
      if (financingValue > 0) profitAfterFinancing = profit - financingValue;
      if (soldKg > 0) {
        costPerKg = totalCost / soldKg;
        var netCost = totalCost - byproductValue;
        breakEvenPrice = netCost <= 0 ? 0 : netCost / soldKg;
      } else {
        notices.push({
          code: 'sold_kg_zero',
          message: 'Con cero kilogramos comercializados no se calcula el costo por kilogramo ni el precio de equilibrio.'
        });
      }
      if (totalCost > 0) returnOnCostPct = (profit / totalCost) * 100;
      else {
        notices.push({
          code: 'no_cost_base',
          message: 'Sin costos mayores que cero no se calcula la rentabilidad sobre el costo.'
        });
      }
      if (revenue > 0) marginOnSalesPct = (profit / revenue) * 100;
      else {
        notices.push({
          code: 'no_revenue_base',
          message: 'Sin ingresos no se calcula el margen sobre ventas.'
        });
      }
    } else if (!blocked) {
      notices.push({
        code: 'incomplete',
        message: 'Para ingresos, utilidad y costo por kilogramo hacen falta los kilogramos comercializados y el precio promedio.'
      });
    }

    if (harvestedKg != null && soldKg != null && harvestedKg > 0) {
      wasteKg = harvestedKg - soldKg;
      commercializationPct = (soldKg / harvestedKg) * 100;
    }

    if (!blocked && financingValue === 0) {
      notices.push({ code: 'before_tax', message: TAX_NOTE });
    }

    var perHa = null;
    if (areaHa != null && areaHa > 0) {
      perHa = {
        cost: totalCost / areaHa,
        revenue: revenue == null ? null : revenue / areaHa,
        profit: profit == null ? null : profit / areaHa,
        soldKg: soldKg == null ? null : soldKg / areaHa
      };
    }

    var loss = profit != null && profit < 0;
    return {
      ok: !blocked,
      errors: errors,
      notices: notices,
      currency: currency,
      totalCost: totalCost,
      soldKg: soldKg,
      harvestedKg: harvestedKg,
      pricePerKg: pricePerKg,
      byproductRevenue: byproductValue,
      financingCost: financingValue,
      revenue: revenue,
      profit: profit,
      profitAfterFinancing: profitAfterFinancing,
      costPerKg: costPerKg,
      returnOnCostPct: returnOnCostPct,
      marginOnSalesPct: marginOnSalesPct,
      breakEvenPrice: breakEvenPrice,
      wasteKg: wasteKg,
      commercializationPct: commercializationPct,
      areaHa: areaHa,
      perHa: perHa,
      loss: loss,
      costItems: blocked ? [] : costs.items.filter(function (item) { return item.amount > 0; })
    };
  }

  function breakEvenVolume(input) {
    input = input || {};
    var fixed = readOptionalNumber(input.fixedCosts);
    var price = readOptionalNumber(input.pricePerKg);
    var variable = readOptionalNumber(input.variableCostPerKg);
    if (!fixed.ok || !price.ok || !variable.ok) {
      return { ok: false, reason: 'invalid_number', kg: null, message: 'Revisa los datos del volumen de equilibrio.' };
    }
    if (fixed.empty || price.empty || variable.empty) {
      return {
        ok: false,
        reason: 'incomplete',
        kg: null,
        message: 'El volumen de equilibrio necesita costos fijos, costo variable por kilogramo y precio. No se sustituye por el costo total dividido entre el precio.'
      };
    }
    if (fixed.value < 0 || variable.value < 0 || price.value < 0) {
      return { ok: false, reason: 'negative', kg: null, message: 'Costos fijos, costo variable y precio deben ser cero o positivos.' };
    }
    var contribution = price.value - variable.value;
    if (contribution <= 0) {
      return {
        ok: false,
        reason: 'no_positive_margin',
        kg: null,
        contributionPerKg: contribution,
        message: 'Con ese precio no se alcanza un equilibrio de volumen positivo: el precio no supera el costo variable por kilogramo.'
      };
    }
    return {
      ok: true,
      reason: null,
      kg: fixed.value / contribution,
      contributionPerKg: contribution,
      message: 'Volumen de equilibrio con la estructura de costos fijos y variables de este ejercicio. Corresponde a este precio y a este periodo.'
    };
  }

  function evaluateScenario(input) {
    input = input || {};
    var errors = [];
    var sold = readOptionalNumber(input.soldKg);
    var price = readOptionalNumber(input.pricePerKg);
    var byproduct = readOptionalNumber(input.byproductRevenue);
    if (!sold.ok || !price.ok || !byproduct.ok) {
      pushError(errors, 'invalid_number', 'Revisa el escenario.');
    }
    if (sold.ok && !sold.empty && sold.value < 0) pushError(errors, 'negative_production', 'La producción del escenario no puede ser negativa.');
    if (price.ok && !price.empty && price.value < 0) pushError(errors, 'negative_price', 'El precio del escenario no puede ser negativo.');
    var mode = input.costMode === 'fixed_plus_variable' || input.costMode === 'custom_total'
      ? input.costMode
      : 'constant_total';
    var totalCost = null;
    var volume = null;
    var assumption = '';
    if (mode === 'fixed_plus_variable') {
      var fixed = readOptionalNumber(input.fixedCosts);
      var variable = readOptionalNumber(input.variableCostPerKg);
      if (!fixed.ok || !variable.ok) pushError(errors, 'invalid_number', 'Revisa la estructura de costos del escenario.');
      if (fixed.empty || variable.empty) {
        pushError(errors, 'variable_cost_required', 'Para este escenario hay que indicar costos fijos y costo variable por kilogramo. No se asume que el variable sea cero.');
      } else if (fixed.value < 0 || variable.value < 0) {
        pushError(errors, 'negative_cost', 'Los costos del escenario no pueden ser negativos.');
      } else if (sold.ok && !sold.empty && price.ok && !price.empty) {
        totalCost = fixed.value + variable.value * sold.value;
        volume = breakEvenVolume({
          fixedCosts: fixed.value,
          pricePerKg: price.value,
          variableCostPerKg: variable.value
        });
      }
      assumption = 'El costo de este escenario sí cambia con los kilogramos: costos fijos más costo variable por kilogramo.';
    } else {
      var custom = readOptionalNumber(mode === 'custom_total' ? input.totalCost : input.totalCost);
      if (!custom.ok) pushError(errors, 'invalid_number', 'Revisa el costo total del escenario.');
      if (custom.empty || custom.value == null) {
        pushError(errors, 'missing_total', 'Indica el costo total de este escenario.');
      } else if (custom.value < 0) {
        pushError(errors, 'negative_cost', 'El costo total del escenario no puede ser negativo.');
      } else {
        totalCost = custom.value;
      }
      assumption = mode === 'custom_total'
        ? 'Se usa el costo total escrito para la alternativa. Si ese costo esconde partidas variables, no lo tomes como volumen de equilibrio.'
        : 'Esta alternativa mantiene constante el costo total del ejercicio. Los kilos donde el ingreso iguala ese costo no son el volumen de equilibrio si existen costos que crecen con la producción.';
    }

    if (errors.length || sold.empty || price.empty || totalCost == null) {
      return {
        ok: false,
        errors: errors,
        costMode: mode,
        assumption: assumption,
        totalCost: totalCost,
        revenue: null,
        profit: null,
        returnOnCostPct: null,
        marginOnSalesPct: null,
        breakEvenPrice: null,
        breakEvenVolumeKg: null,
        referenceKgAtConstantCost: null,
        loss: false
      };
    }

    var extraIncome = byproduct.ok && !byproduct.empty ? byproduct.value : 0;
    var revenue = sold.value * price.value + extraIncome;
    var profit = revenue - totalCost;
    var breakEvenPrice = sold.value > 0 ? Math.max(0, (totalCost - extraIncome) / sold.value) : null;
    var referenceKg = null;
    if (mode !== 'fixed_plus_variable' && price.value > 0) referenceKg = Math.max(0, (totalCost - extraIncome) / price.value);
    return {
      ok: true,
      errors: [],
      costMode: mode,
      assumption: assumption,
      soldKg: sold.value,
      pricePerKg: price.value,
      totalCost: totalCost,
      revenue: revenue,
      profit: profit,
      returnOnCostPct: totalCost > 0 ? (profit / totalCost) * 100 : null,
      marginOnSalesPct: revenue > 0 ? (profit / revenue) * 100 : null,
      breakEvenPrice: breakEvenPrice,
      breakEvenVolumeKg: volume && volume.ok ? volume.kg : null,
      breakEvenVolumeMessage: volume ? volume.message : '',
      referenceKgAtConstantCost: referenceKg,
      loss: profit < 0
    };
  }

  function scenarioSeries(input) {
    var probe = evaluateScenario(input);
    if (!probe.ok) return [];
    var maxKg = Math.max(probe.soldKg * 1.35, (probe.breakEvenVolumeKg || 0) * 1.15, (probe.referenceKgAtConstantCost || 0) * 1.05, 1);
    var steps = 8;
    var points = [];
    for (var i = 0; i <= steps; i += 1) {
      var kg = (maxKg * i) / steps;
      var step = evaluateScenario({
        soldKg: kg,
        pricePerKg: probe.pricePerKg,
        byproductRevenue: input.byproductRevenue || 0,
        costMode: probe.costMode,
        totalCost: input.totalCost,
        fixedCosts: input.fixedCosts,
        variableCostPerKg: input.variableCostPerKg
      });
      points.push({ kg: kg, revenue: step.revenue, cost: step.totalCost });
    }
    return points;
  }

  function classifyOrigin(productionDelta, priceCurrent, priceImproved, revenueDelta) {
    var priceChanged = Math.abs(priceImproved - priceCurrent) > 1e-9;
    var volumeChanged = Math.abs(productionDelta) > 1e-9;
    if (priceChanged && volumeChanged) return 'mixed';
    if (priceChanged) return 'price';
    if (volumeChanged) return 'volume';
    if (Math.abs(revenueDelta) < 1e-9) return 'none';
    return 'mixed';
  }

  function additionalKgForRecovery(spec) {
    var denom = spec.priceImproved - spec.variablePerKg;
    if (!(denom > 0)) {
      return {
        ok: false,
        reason: 'no_positive_margin',
        extraKg: null,
        message: 'No hay un equilibrio positivo en kilogramos: el precio del manejo mejorado no supera el costo variable incremental por kilogramo.'
      };
    }
    if (!(spec.investmentDelta > 0)) {
      return { ok: false, reason: 'no_extra_investment', extraKg: null, message: '' };
    }
    var rhs = spec.investmentDelta - spec.savings + spec.lump + spec.associatedDelta
      + spec.soldCurrent * spec.priceCurrent - spec.variablePerKg * spec.soldCurrent;
    var improvedKg = rhs / denom;
    return { ok: true, reason: null, extraKg: improvedKg - spec.soldCurrent, improvedKg: improvedKg, message: '' };
  }

  function interpretBenefitCost(ratio, currency) {
    if (!Number.isFinite(ratio)) return '';
    if (ratio < 1) return 'El beneficio incremental no alcanza a recuperar la inversión.';
    if (Math.abs(ratio - 1) < 0.005) {
      return 'La inversión adicional se recupera, pero no deja beneficio incremental después de pagarla.';
    }
    return 'Por cada ' + currency + ' 1 adicional invertido, se generan ' + formatRatio(ratio).replace(':1', '')
      + ' ' + currency + ' de beneficio antes de recuperar la inversión.';
  }

  function interpretIncomeRatio(ratio, currency) {
    if (!Number.isFinite(ratio)) return '';
    if (ratio < 1) {
      return 'Las ventas adicionales no alcanzan a igualar la inversión extra. Esto todavía no es beneficio neto.';
    }
    return 'Por cada ' + currency + ' 1 adicional invertido se generaron ' + formatRatio(ratio).replace(':1', '')
      + ' ' + currency + ' en ventas adicionales. No confundir ventas adicionales con beneficio neto.';
  }

  function evaluateInvestment(input) {
    input = input || {};
    var errors = [];
    var warnings = [];
    var currency = isCurrency(input.currency) ? input.currency : 'USD';
    var current = input.current || {};
    var improved = input.improved || {};
    var fields = {
      currentCost: readOptionalNumber(current.programCost),
      improvedCost: readOptionalNumber(improved.programCost),
      currentKg: readOptionalNumber(current.soldKg),
      improvedKg: readOptionalNumber(improved.soldKg),
      currentPrice: readOptionalNumber(current.pricePerKg),
      improvedPrice: readOptionalNumber(improved.pricePerKg),
      currentAssoc: readOptionalNumber(current.associatedCosts),
      improvedAssoc: readOptionalNumber(improved.associatedCosts),
      lump: readOptionalNumber(input.otherLump),
      variable: readOptionalNumber(input.variablePerKg),
      savings: readOptionalNumber(input.savings)
    };
    Object.keys(fields).forEach(function (key) {
      if (!fields[key].ok) pushError(errors, 'invalid_number', 'Revisa los datos de la comparación.');
    });

    function requireNonNegative(parsed, code, message, required) {
      if (!parsed.ok) return;
      if (required && parsed.empty) pushError(errors, 'incomplete', message);
      else if (!parsed.empty && parsed.value < 0) pushError(errors, code, message);
    }
    requireNonNegative(fields.currentCost, 'negative_cost', 'El costo del manejo actual no puede ser negativo.', true);
    requireNonNegative(fields.improvedCost, 'negative_cost', 'El costo del manejo mejorado no puede ser negativo.', true);
    requireNonNegative(fields.currentKg, 'negative_production', 'La producción del manejo actual no puede ser negativa.', true);
    requireNonNegative(fields.improvedKg, 'negative_production', 'La producción del manejo mejorado no puede ser negativa.', true);
    requireNonNegative(fields.currentPrice, 'negative_price', 'El precio del manejo actual no puede ser negativo.', true);
    requireNonNegative(fields.improvedPrice, 'negative_price', 'El precio del manejo mejorado no puede ser negativo.', true);
    requireNonNegative(fields.currentAssoc, 'negative_cost', 'Los otros costos del manejo actual no pueden ser negativos.', false);
    requireNonNegative(fields.improvedAssoc, 'negative_cost', 'Los otros costos del manejo mejorado no pueden ser negativos.', false);
    requireNonNegative(fields.lump, 'negative_cost', 'Los otros costos incrementales se anotan en positivo.', false);
    requireNonNegative(fields.variable, 'negative_cost', 'El costo variable incremental por kilogramo no puede ser negativo.', false);
    requireNonNegative(fields.savings, 'negative_saving', 'Los ahorros se anotan en positivo.', false);

    var otherMode = input.otherMode === 'none' || input.otherMode === 'lump' || input.otherMode === 'per_kg'
      ? input.otherMode
      : 'unspecified';
    if (otherMode === 'lump' && fields.lump.ok && fields.lump.empty) {
      pushError(errors, 'missing_lump', 'Indicaste un importe de costos incrementales, pero el campo está vacío.');
    }
    if (otherMode === 'per_kg' && fields.variable.ok && fields.variable.empty) {
      pushError(errors, 'missing_variable', 'Indicaste un costo variable por kilogramo adicional, pero el campo está vacío.');
    }
    if (errors.length) {
      return { ok: false, errors: errors, warnings: warnings, currency: currency, otherMode: otherMode };
    }

    var currentCost = fields.currentCost.value;
    var improvedCost = fields.improvedCost.value;
    var currentKg = fields.currentKg.value;
    var improvedKg = fields.improvedKg.value;
    var currentPrice = fields.currentPrice.value;
    var improvedPrice = fields.improvedPrice.value;
    var currentAssoc = fields.currentAssoc.empty ? 0 : fields.currentAssoc.value;
    var improvedAssoc = fields.improvedAssoc.empty ? 0 : fields.improvedAssoc.value;
    var investmentDelta = improvedCost - currentCost;
    var productionDelta = improvedKg - currentKg;
    var revenueCurrent = currentKg * currentPrice;
    var revenueImproved = improvedKg * improvedPrice;
    var revenueDelta = revenueImproved - revenueCurrent;
    var associatedDelta = improvedAssoc - currentAssoc;
    var savings = fields.savings.empty ? 0 : fields.savings.value;
    var lump = otherMode === 'lump' ? fields.lump.value : 0;
    var variablePerKg = otherMode === 'per_kg' ? fields.variable.value : 0;
    var variablePortion = otherMode === 'per_kg' ? variablePerKg * productionDelta : 0;
    var costsConsidered = otherMode !== 'unspecified' || Math.abs(associatedDelta) > 0 || savings > 0;
    if (otherMode === 'unspecified' && (Math.abs(associatedDelta) > 0 || savings > 0)) {
      warnings.push({
        code: 'partial_costs',
        message: 'Hay otros costos o ahorros capturados, pero conviene confirmar si ya están todos los costos de la producción adicional.'
      });
    }
    if (Math.abs(associatedDelta) > 0 && (otherMode === 'lump' || otherMode === 'per_kg')) {
      warnings.push({
        code: 'possible_double_count',
        message: 'Revisa que los otros costos de cada columna no estén repetidos en los costos incrementales.'
      });
    }
    if (input.scope === 'full_system') {
      warnings.push({
        code: 'full_system_scope',
        message: 'Estás comparando el costo del sistema completo. No sumes otra vez un programa que ya esté dentro de ese total.'
      });
    }

    var otherIncremental = null;
    var benefitBefore = null;
    var incrementalProfit = null;
    if (costsConsidered) {
      otherIncremental = lump + variablePortion + associatedDelta;
      benefitBefore = revenueDelta + savings - otherIncremental;
      incrementalProfit = benefitBefore - investmentDelta;
    }

    var samePrice = Math.abs(currentPrice - improvedPrice) < 1e-9;
    var incomeRatio = investmentDelta > 0 ? revenueDelta / investmentDelta : null;
    var benefitCostRatio = investmentDelta > 0 && costsConsidered ? benefitBefore / investmentDelta : null;
    var ratioBlockedReason = '';
    if (investmentDelta === 0) {
      ratioBlockedReason = 'No hay inversión adicional. La relación no se divide entre cero; conviene leer el cambio de ingresos, costos y utilidad.';
    } else if (investmentDelta < 0) {
      ratioBlockedReason = 'El manejo comparado cuesta menos. No se presenta una relación por cada unidad invertida de más, porque la inversión incremental es un ahorro.';
    }

    var extraKgNeeded = null;
    var extraKgMode = 'needs_variable_cost';
    var extraKgMessage = 'Para saber cuántos kilogramos adicionales recuperan la inversión hay que confirmar el costo variable por kilogramo adicional, aunque sea cero.';
    if (!costsConsidered) {
      extraKgMode = 'needs_variable_cost';
    } else if (!(investmentDelta > 0)) {
      extraKgMode = 'no_extra_investment';
      extraKgMessage = ratioBlockedReason;
    } else {
      var solved = additionalKgForRecovery({
        priceCurrent: currentPrice,
        priceImproved: improvedPrice,
        soldCurrent: currentKg,
        variablePerKg: variablePerKg,
        investmentDelta: investmentDelta,
        savings: savings,
        lump: lump,
        associatedDelta: associatedDelta
      });
      if (!solved.ok && solved.reason === 'no_positive_margin') {
        extraKgMode = 'no_positive_margin';
        extraKgMessage = solved.message;
      } else if (solved.ok && solved.extraKg <= 1e-9) {
        extraKgNeeded = 0;
        extraKgMode = 'recovered_without_more_kg';
        extraKgMessage = 'Con las condiciones registradas no hace falta comercializar más kilogramos para recuperar la inversión adicional.';
      } else if (solved.ok && samePrice && Math.abs(savings) < 1e-9 && Math.abs(lump) < 1e-9 && Math.abs(associatedDelta) < 1e-9) {
        extraKgNeeded = solved.extraKg;
        extraKgMode = 'same_price';
        extraKgMessage = 'Kilogramos adicionales para recuperar la inversión con el mismo precio y el costo variable incremental indicado.';
      } else if (solved.ok) {
        extraKgNeeded = solved.extraKg;
        extraKgMode = 'full_comparison';
        extraKgMessage = 'Los precios, ahorros o costos no dependen solo de los kilos de diferencia. Este equilibrio sale de comparar los dos escenarios completos.';
      }
    }

    var origin = classifyOrigin(productionDelta, currentPrice, improvedPrice, revenueDelta);
    var loss = costsConsidered ? incrementalProfit < 0 : revenueDelta < investmentDelta;
    var recovered = costsConsidered && investmentDelta > 0 && incrementalProfit >= -1e-9;
    if (costsConsidered && investmentDelta <= 0 && incrementalProfit >= -1e-9) recovered = true;

    return {
      ok: true,
      errors: [],
      warnings: warnings,
      currency: currency,
      scope: input.scope === 'full_system' ? 'full_system' : 'intervention',
      otherMode: otherMode,
      costsConsidered: costsConsidered,
      currentCost: currentCost,
      improvedCost: improvedCost,
      currentKg: currentKg,
      improvedKg: improvedKg,
      currentPrice: currentPrice,
      improvedPrice: improvedPrice,
      investmentDelta: investmentDelta,
      productionDelta: productionDelta,
      revenueCurrent: revenueCurrent,
      revenueImproved: revenueImproved,
      revenueDelta: revenueDelta,
      otherIncremental: otherIncremental,
      savings: savings,
      benefitBeforeInvestment: benefitBefore,
      incrementalProfit: incrementalProfit,
      incomeRatio: incomeRatio,
      incomeRatioLabel: formatRatio(incomeRatio),
      benefitCostRatio: benefitCostRatio,
      benefitCostRatioLabel: formatRatio(benefitCostRatio),
      ratioBlockedReason: ratioBlockedReason,
      extraKgNeeded: extraKgNeeded,
      extraKgMode: extraKgMode,
      extraKgMessage: extraKgMessage,
      origin: origin,
      loss: loss,
      recovered: recovered,
      samePrice: samePrice,
      incomeInterpretation: incomeRatio == null ? ratioBlockedReason : interpretIncomeRatio(incomeRatio, currency),
      benefitInterpretation: benefitCostRatio == null ? '' : interpretBenefitCost(benefitCostRatio, currency)
    };
  }

  function moneyPhrase(amount, currency) {
    return formatMoney(amount, currency);
  }

  function conclusionModuleB(result, meta) {
    meta = meta || {};
    if (!result || !result.ok) return '';
    var name = meta.strategyName ? '«' + meta.strategyName + '»' : 'el manejo comparado';
    var cur = result.currency;
    var parts = ['La comparación de ' + name + ' '];
    if (result.investmentDelta > 0) parts.push('requiere ' + moneyPhrase(result.investmentDelta, cur) + ' adicionales');
    else if (result.investmentDelta < 0) parts.push('reduce el costo del programa en ' + moneyPhrase(Math.abs(result.investmentDelta), cur));
    else parts.push('no cambia la inversión del programa');
    parts.push(' y ');
    if (result.productionDelta > 0) parts.push('presenta un incremento de ' + formatKg(result.productionDelta) + ' comercializados');
    else if (result.productionDelta < 0) parts.push('presenta ' + formatKg(Math.abs(result.productionDelta)) + ' menos comercializados');
    else parts.push('mantiene la misma producción comercializada');
    parts.push('. Bajo las condiciones registradas, el ingreso adicional es ' + moneyPhrase(result.revenueDelta, cur) + '. ');
    if (!result.costsConsidered) {
      parts.push('Esa cifra es de ventas, no de utilidad neta: todavía no se descontaron los costos de la producción adicional. ');
    } else if (result.incrementalProfit != null) {
      if (result.incrementalProfit < 0) {
        parts.push('El resultado incremental es una pérdida de ' + moneyPhrase(Math.abs(result.incrementalProfit), cur) + '. ');
      } else {
        parts.push('La utilidad incremental estimada es de ' + moneyPhrase(result.incrementalProfit, cur));
        if (result.otherIncremental > 0) parts.push(', ya descontados los costos incrementales registrados y la inversión adicional');
        else parts.push(', antes de otros gastos no registrados');
        parts.push('. ');
      }
    }
    if (result.origin === 'price') {
      parts.push('La mejora registrada se origina en el precio, no en la cantidad producida. ');
    } else if (result.origin === 'mixed') {
      parts.push('El cambio de ingreso combina cantidad y precio; no proviene solo de más kilogramos. ');
    } else if (result.origin === 'none' && result.investmentDelta > 0) {
      parts.push('La inversión adicional no se recupera con los kilogramos y el precio registrados. ');
    }
    parts.push(CAUSALITY_NOTE + ' ');
    parts.push(COMPARISON_DISCLAIMER);
    return parts.join('');
  }

  function interpretationModuleA(result) {
    if (!result || !result.ok || result.profit == null) {
      return 'Completa costos, kilogramos comercializados y precio para leer el resultado económico de este periodo.';
    }
    var cur = result.currency;
    if (result.loss) {
      return 'Con los datos de este ejercicio los ingresos no cubren los costos considerados. El resultado es una pérdida de '
        + formatMoney(Math.abs(result.profit), cur)
        + '. El precio de equilibrio de este volumen es ' + formatPerKg(result.breakEvenPrice, cur)
        + '. No es un precio universal para otros niveles de producción. ' + TAX_NOTE;
    }
    if (Math.abs(result.profit) < 1e-9) {
      return 'Con este volumen, el ingreso iguala los costos considerados. El precio de equilibrio es '
        + formatPerKg(result.breakEvenPrice, cur) + '. ' + TAX_NOTE;
    }
    var text = 'Con los costos y el volumen de este ejercicio, el costo por kilogramo comercializado es '
      + formatPerKg(result.costPerKg, cur)
      + ' y el precio de equilibrio es ' + formatPerKg(result.breakEvenPrice, cur)
      + '. Vender a ' + formatPerKg(result.pricePerKg, cur)
      + ' deja una utilidad de ' + formatMoney(result.profit, cur)
      + ', equivalente a ' + formatPct(result.returnOnCostPct)
      + ' sobre el costo y ' + formatPct(result.marginOnSalesPct)
      + ' de margen sobre ventas. Rentabilidad sobre el costo y margen sobre ventas no son el mismo indicador. ';
    if (result.byproductRevenue > 0) {
      text += 'El precio de equilibrio ya descuenta los otros ingresos registrados. ';
    }
    if (result.financingCost > 0 && result.profitAfterFinancing != null) {
      text += 'Después de intereses y comisiones, la utilidad queda en ' + formatMoney(result.profitAfterFinancing, cur) + '. ';
    }
    text += TAX_NOTE;
    return text;
  }

  function suggestModuleBFromA(cropInput, cropResult) {
    var nutrition = null;
    (cropInput && cropInput.costs || []).some(function (line) {
      var label = String(line.label || '');
      var id = String(line.id || '');
      if (id === 'nutricion' || id === 'ex-nut' || /nutrici/i.test(label)) {
        var parsed = readOptionalNumber(line.amount);
        if (parsed.ok && !parsed.empty && parsed.value > 0) nutrition = parsed.value;
        return nutrition != null;
      }
      return false;
    });
    return {
      currency: cropInput && isCurrency(cropInput.currency) ? cropInput.currency : 'USD',
      crop: (cropInput && cropInput.crop) || '',
      period: (cropInput && cropInput.period) || '',
      soldKg: cropResult && cropResult.soldKg != null ? cropResult.soldKg : '',
      pricePerKg: cropResult && cropResult.pricePerKg != null ? cropResult.pricePerKg : '',
      nutritionCost: nutrition,
      totalCost: cropResult ? cropResult.totalCost : null,
      note: 'Se copian moneda, kilogramos y precio. Si existe la partida de nutrición, esa cifra puede usarse como costo del programa actual. El costo total del cultivo no se pega solo, para no sumarlo otra vez dentro de la comparación.'
    };
  }

  function row(label, value) {
    return { label: label, value: value };
  }

  function buildModuleAReport(result, meta) {
    meta = meta || {};
    var cur = result.currency || 'USD';
    var productive = [];
    if (meta.areaHa) productive.push(row('Superficie', formatPlain(meta.areaHa, 2) + ' ha'));
    if (result.soldKg != null) productive.push(row('Producción comercializada', formatKg(result.soldKg)));
    if (result.harvestedKg != null) productive.push(row('Producción cosechada', formatKg(result.harvestedKg)));
    if (result.wasteKg != null) productive.push(row('No comercializada', formatKg(result.wasteKg)));
    if (result.pricePerKg != null) productive.push(row('Precio promedio', formatPerKg(result.pricePerKg, cur)));
    var economic = (result.costItems || []).map(function (item) {
      return row(item.label, formatMoney(item.signed, cur));
    });
    if (result.totalCost != null) economic.push(row('Costo total', formatMoney(result.totalCost, cur)));
    if (result.costPerKg != null) economic.push(row('Costo por kilogramo', formatPerKg(result.costPerKg, cur)));
    if (result.revenue != null) economic.push(row('Ingresos', formatMoney(result.revenue, cur)));
    if (result.profit != null) economic.push(row(result.loss ? 'Pérdida' : 'Utilidad', formatMoney(result.profit, cur)));
    if (result.profitAfterFinancing != null) {
      economic.push(row('Utilidad después de intereses y comisiones', formatMoney(result.profitAfterFinancing, cur)));
    }
    if (result.returnOnCostPct != null) economic.push(row('Rentabilidad sobre costo', formatPct(result.returnOnCostPct)));
    if (result.marginOnSalesPct != null) economic.push(row('Margen sobre ventas', formatPct(result.marginOnSalesPct)));
    if (result.breakEvenPrice != null) economic.push(row('Precio de equilibrio', formatPerKg(result.breakEvenPrice, cur)));
    if (meta.breakEvenVolumeLabel) economic.push(row('Volumen de equilibrio', meta.breakEvenVolumeLabel));
    return {
      product: 'NutriPlant PRO',
      tool: 'Rentabilidad Agrícola',
      module: 'Rentabilidad del cultivo',
      date: meta.date || '',
      exerciseName: meta.exerciseName || '',
      crop: meta.crop || '',
      period: meta.period || '',
      sections: [
        { title: 'Resumen productivo', rows: productive },
        { title: 'Resumen económico', rows: economic }
      ],
      interpretation: interpretationModuleA(result),
      notes: [TAX_NOTE, COMPARISON_DISCLAIMER].concat(meta.isExample ? [EXAMPLE_DISCLAIMER] : []),
      tagline: 'NutriPlant PRO — Diseña. Ajusta. Nutre.'
    };
  }

  function buildModuleBReport(result, meta) {
    meta = meta || {};
    var cur = result.currency || 'USD';
    var rows = [
      row('Inversión actual', formatMoney(result.currentCost, cur)),
      row('Inversión del manejo comparado', formatMoney(result.improvedCost, cur)),
      row('Diferencia de inversión', formatMoney(result.investmentDelta, cur)),
      row('Producción actual', formatKg(result.currentKg)),
      row('Producción del manejo comparado', formatKg(result.improvedKg)),
      row('Diferencia de producción', formatKg(result.productionDelta)),
      row('Diferencia de ingresos', formatMoney(result.revenueDelta, cur))
    ];
    if (result.costsConsidered && result.otherIncremental != null) {
      rows.push(row('Otros costos incrementales', formatMoney(result.otherIncremental, cur)));
      rows.push(row('Beneficio antes de la inversión adicional', formatMoney(result.benefitBeforeInvestment, cur)));
      rows.push(row(result.loss ? 'Pérdida incremental' : 'Utilidad incremental', formatMoney(result.incrementalProfit, cur)));
    }
    if (result.incomeRatioLabel) rows.push(row('Relación ingreso adicional / inversión adicional', result.incomeRatioLabel));
    if (result.benefitCostRatioLabel) rows.push(row('Relación beneficio–costo incremental', result.benefitCostRatioLabel));
    if (result.extraKgNeeded != null) rows.push(row('Producción adicional para recuperar la inversión', formatKg(result.extraKgNeeded)));
    return {
      product: 'NutriPlant PRO',
      tool: 'Rentabilidad Agrícola',
      module: 'Valor de una inversión adicional',
      date: meta.date || '',
      strategyName: meta.strategyName || '',
      crop: meta.crop || '',
      sections: [{ title: 'Comparación de programas', rows: rows }],
      interpretation: conclusionModuleB(result, meta),
      notes: [AGRONOMIC_NOTE, CAUSALITY_NOTE, COMPARISON_DISCLAIMER].concat(meta.isExample ? [EXAMPLE_DISCLAIMER] : []),
      tagline: 'NutriPlant PRO — Diseña. Ajusta. Nutre.'
    };
  }

  return {
    CURRENCIES: CURRENCIES,
    COST_GROUPS: COST_GROUPS,
    COST_CATEGORIES: COST_CATEGORIES,
    EXAMPLE_DISCLAIMER: EXAMPLE_DISCLAIMER,
    COMPARISON_DISCLAIMER: COMPARISON_DISCLAIMER,
    AGRONOMIC_NOTE: AGRONOMIC_NOTE,
    CAUSALITY_NOTE: CAUSALITY_NOTE,
    TAX_NOTE: TAX_NOTE,
    MODULE_A_MESSAGE: MODULE_A_MESSAGE,
    MODULE_B_MESSAGE: MODULE_B_MESSAGE,
    DUPLICATE_COST_NOTE: DUPLICATE_COST_NOTE,
    exampleModuleA: exampleModuleA,
    exampleModuleB: exampleModuleB,
    parseUserNumber: parseUserNumber,
    formatMoney: formatMoney,
    formatPct: formatPct,
    formatKg: formatKg,
    formatPerKg: formatPerKg,
    formatRatio: formatRatio,
    emptyCostLines: emptyCostLines,
    summarizeGroups: summarizeGroups,
    evaluateCrop: evaluateCrop,
    breakEvenVolume: breakEvenVolume,
    evaluateScenario: evaluateScenario,
    scenarioSeries: scenarioSeries,
    evaluateInvestment: evaluateInvestment,
    conclusionModuleB: conclusionModuleB,
    interpretationModuleA: interpretationModuleA,
    suggestModuleBFromA: suggestModuleBFromA,
    buildModuleAReport: buildModuleAReport,
    buildModuleBReport: buildModuleBReport
  };
});
