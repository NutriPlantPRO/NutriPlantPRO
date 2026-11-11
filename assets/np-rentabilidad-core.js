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
    { code: 'USD', name: 'Dólar estadounidense', nameEn: 'US dollar' },
    { code: 'MXN', name: 'Peso mexicano', nameEn: 'Mexican peso' },
    { code: 'EUR', name: 'Euro', nameEn: 'Euro' },
    { code: 'COP', name: 'Peso colombiano', nameEn: 'Colombian peso' },
    { code: 'PEN', name: 'Sol peruano', nameEn: 'Peruvian sol' },
    { code: 'CLP', name: 'Peso chileno', nameEn: 'Chilean peso' },
    { code: 'ARS', name: 'Peso argentino', nameEn: 'Argentine peso' },
    { code: 'PYG', name: 'Guaraní paraguayo', nameEn: 'Paraguayan guaraní' },
    { code: 'BRL', name: 'Real brasileño', nameEn: 'Brazilian real' },
    { code: 'MAD', name: 'Dírham marroquí', nameEn: 'Moroccan dirham' },
    { code: 'EGP', name: 'Libra egipcia', nameEn: 'Egyptian pound' },
    { code: 'CAD', name: 'Dólar canadiense', nameEn: 'Canadian dollar' },
    { code: 'GTQ', name: 'Quetzal guatemalteco', nameEn: 'Guatemalan quetzal' },
    { code: 'HNL', name: 'Lempira hondureña', nameEn: 'Honduran lempira' },
    { code: 'NIO', name: 'Córdoba nicaragüense', nameEn: 'Nicaraguan córdoba' },
    { code: 'CRC', name: 'Colón costarricense', nameEn: 'Costa Rican colón' },
    { code: 'PAB', name: 'Balboa panameño', nameEn: 'Panamanian balboa' },
    { code: 'BZD', name: 'Dólar beliceño', nameEn: 'Belize dollar' },
    { code: 'BOB', name: 'Boliviano', nameEn: 'Bolivian boliviano' },
    { code: 'UYU', name: 'Peso uruguayo', nameEn: 'Uruguayan peso' },
    { code: 'DOP', name: 'Peso dominicano', nameEn: 'Dominican peso' },
    { code: 'GBP', name: 'Libra esterlina', nameEn: 'British pound' }
  ];

  var COST_GROUPS = [
    { id: 'nutricion', label: 'Nutrición vegetal', labelEn: 'Plant nutrition' },
    { id: 'sanidad', label: 'Sanidad del cultivo', labelEn: 'Crop protection' },
    { id: 'operacion', label: 'Operación del ciclo', labelEn: 'Cycle operations' },
    { id: 'cosecha', label: 'Cosecha y comercialización', labelEn: 'Harvest and marketing' },
    { id: 'admin', label: 'Administración y otros', labelEn: 'Administration and other' }
  ];

  var COST_CATEGORIES = [
    { id: 'nutricion', label: 'Nutrición vegetal', labelEn: 'Plant nutrition', group: 'nutricion', primary: true },
    { id: 'plagas', label: 'Control de plagas y enfermedades', labelEn: 'Pest and disease control', group: 'sanidad', primary: true },
    { id: 'malezas', label: 'Control de malezas', labelEn: 'Weed control', group: 'sanidad', primary: true },
    { id: 'energia', label: 'Combustibles y energía', labelEn: 'Fuel and energy', group: 'operacion', primary: true },
    { id: 'personal', label: 'Personal operativo', labelEn: 'Field labor', group: 'operacion', primary: true },
    { id: 'cosecha', label: 'Cosecha', labelEn: 'Harvest', group: 'cosecha', primary: true },
    { id: 'agua', label: 'Agua y riego', labelEn: 'Water and irrigation', group: 'operacion', primary: false },
    { id: 'maquinaria', label: 'Maquinaria y mantenimiento', labelEn: 'Machinery and maintenance', group: 'operacion', primary: false },
    { id: 'empaque', label: 'Empaque y clasificación', labelEn: 'Packing and grading', group: 'cosecha', primary: false },
    { id: 'transporte', label: 'Transporte y comercialización', labelEn: 'Transport and marketing', group: 'cosecha', primary: false },
    { id: 'admin', label: 'Administración', labelEn: 'Administration', group: 'admin', primary: false },
    { id: 'otros', label: 'Otros costos', labelEn: 'Other costs', group: 'admin', primary: false }
  ];

  var EXAMPLE_COST_LABELS = {
    'ex-nut': { es: 'Nutrición vegetal', en: 'Plant nutrition' },
    'ex-san': { es: 'Control de plagas y malezas', en: 'Pest and weed control' },
    'ex-ene': { es: 'Combustibles y energía', en: 'Fuel and energy' },
    'ex-per': { es: 'Personal operativo', en: 'Field labor' },
    'ex-cos': { es: 'Cosecha, empaque y transporte', en: 'Harvest, packing and transport' },
    'ex-otr': { es: 'Mantenimiento y otros gastos', en: 'Maintenance and other expenses' }
  };

  // Textos por defecto que el usuario puede ver sin haberlos escrito (ejemplos, atajos).
  // Sirven para traducirlos al cambiar de idioma sin tocar lo que el usuario capturó.
  var KNOWN_TEXT_PAIRS = [
    ['Análisis económico del ciclo productivo', 'Economic analysis of the production cycle'],
    ['Ciclo productivo', 'Production cycle'],
    ['Programa de nutrición', 'Nutrition program'],
    ['Programa de nutrición vegetal', 'Plant nutrition program'],
    ['Tecnología de fertirriego', 'Fertigation technology'],
    ['Eficiencia de riego', 'Irrigation efficiency'],
    ['Manejo fitosanitario', 'Crop protection management'],
    ['Calidad comercial', 'Commercial quality'],
    ['Cambio operativo', 'Operational change'],
    ['Otro costo', 'Other cost']
  ];

  var NOTES = {
    es: {
      exampleDisclaimer:
        'Ejemplo hipotético con fines educativos. Los costos reales dependen del cultivo, región, sistema de producción y condiciones particulares.',
      comparisonDisclaimer:
        'Los resultados dependen de la información proporcionada. Las comparaciones deben realizarse bajo condiciones productivas equivalentes y considerar los costos relevantes.',
      agronomicNote:
        'Una respuesta productiva debe evaluarse considerando las condiciones del cultivo, calidad comercial, variación climática, manejo agronómico y costos asociados.',
      causalityNote:
        'La comparación describe los datos capturados. No afirma que una tecnología haya causado el cambio si el ejercicio es hipotético o no está respaldado por una evaluación bajo condiciones equivalentes.',
      taxNote:
        'La utilidad presentada es previa a impuestos. El financiamiento solo entra si se registran intereses o comisiones; el capital de un préstamo no se suma otra vez si la compra ya está en los costos.',
      moduleA:
        'Producir más no siempre significa ganar más. Conoce tus costos y descubre tu rentabilidad.',
      moduleB:
        'No se trata de elegir siempre el programa más barato, sino de conocer cuánto valor genera cada unidad monetaria adicional invertida.',
      duplicateCost:
        'Evita duplicar gastos. Si una labor ya está en personal, maquinaria o un programa, no la anotes otra vez en otro concepto.',
      tagline: 'NutriPlant PRO — Diseña. Ajusta. Nutre.'
    },
    en: {
      exampleDisclaimer:
        'Hypothetical example for educational purposes. Actual costs depend on the crop, region, production system and specific conditions.',
      comparisonDisclaimer:
        'Results depend on the information provided. Comparisons should be made under equivalent production conditions and should include the relevant costs.',
      agronomicNote:
        'A production response should be evaluated considering crop conditions, commercial quality, climate variability, agronomic management and associated costs.',
      causalityNote:
        'The comparison describes the data entered. It does not claim that a technology caused the change if the exercise is hypothetical or not backed by an evaluation under equivalent conditions.',
      taxNote:
        'The profit shown is before taxes. Financing is only included if you record interest or fees; a loan principal is not added again if the purchase is already in the costs.',
      moduleA:
        'Producing more does not always mean earning more. Know your costs and find out your profitability.',
      moduleB:
        'It is not about always choosing the cheapest program, but about knowing how much value each additional unit invested generates.',
      duplicateCost:
        'Avoid double counting. If a task is already in labor, machinery or a program, do not enter it again under another item.',
      tagline: 'NutriPlant PRO — Design. Adjust. Nourish.'
    }
  };

  var EXAMPLE_DISCLAIMER = NOTES.es.exampleDisclaimer;
  var COMPARISON_DISCLAIMER = NOTES.es.comparisonDisclaimer;
  var AGRONOMIC_NOTE = NOTES.es.agronomicNote;
  var CAUSALITY_NOTE = NOTES.es.causalityNote;
  var TAX_NOTE = NOTES.es.taxNote;
  var MODULE_A_MESSAGE = NOTES.es.moduleA;
  var MODULE_B_MESSAGE = NOTES.es.moduleB;
  var DUPLICATE_COST_NOTE = NOTES.es.duplicateCost;

  function pick(lang, es, en) { return lang === 'en' ? en : es; }

  function langOf(input) {
    if (typeof input === 'string') return input === 'en' ? 'en' : 'es';
    return input && input.language === 'en' ? 'en' : 'es';
  }

  function notes(lang) {
    return NOTES[lang === 'en' ? 'en' : 'es'];
  }

  function currencyName(code, lang) {
    for (var i = 0; i < CURRENCIES.length; i += 1) {
      if (CURRENCIES[i].code === code) return pick(lang, CURRENCIES[i].name, CURRENCIES[i].nameEn);
    }
    return code;
  }

  function groupLabel(id, lang) {
    for (var i = 0; i < COST_GROUPS.length; i += 1) {
      if (COST_GROUPS[i].id === id) return pick(lang, COST_GROUPS[i].label, COST_GROUPS[i].labelEn);
    }
    return id;
  }

  function categoryLabel(id, lang) {
    for (var i = 0; i < COST_CATEGORIES.length; i += 1) {
      if (COST_CATEGORIES[i].id === id) return pick(lang, COST_CATEGORIES[i].label, COST_CATEGORIES[i].labelEn);
    }
    return null;
  }

  // Etiqueta visible de una partida. Las partidas propias conservan lo que escribió el usuario;
  // las de catálogo (y las del ejemplo) se traducen desde su id.
  function costLineLabel(line, lang) {
    if (!line) return '';
    var id = String(line.id || '');
    var own = line.label == null ? '' : String(line.label);
    var example = EXAMPLE_COST_LABELS[id];
    if (example) {
      if (!line.custom || own === example.es || own === example.en) return pick(lang, example.es, example.en);
      return own;
    }
    if (!line.custom) {
      var fromId = categoryLabel(id, lang);
      if (fromId) return fromId;
    }
    return own;
  }

  // Si el texto es uno de los textos por defecto (en cualquier idioma), lo devuelve en el idioma pedido.
  function localizeKnownText(value, lang) {
    var text = value == null ? '' : String(value);
    for (var i = 0; i < KNOWN_TEXT_PAIRS.length; i += 1) {
      if (text === KNOWN_TEXT_PAIRS[i][0] || text === KNOWN_TEXT_PAIRS[i][1]) {
        return pick(lang, KNOWN_TEXT_PAIRS[i][0], KNOWN_TEXT_PAIRS[i][1]);
      }
    }
    return text;
  }

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

  function exampleModuleA(opts) {
    var lang = langOf(opts);
    var costs = [
      ['ex-nut', 'nutricion', 2000],
      ['ex-san', 'sanidad', 2000],
      ['ex-ene', 'operacion', 1500],
      ['ex-per', 'operacion', 5000],
      ['ex-cos', 'cosecha', 3000],
      ['ex-otr', 'admin', 1500]
    ].map(function (item) {
      return {
        id: item[0],
        label: pick(lang, EXAMPLE_COST_LABELS[item[0]].es, EXAMPLE_COST_LABELS[item[0]].en),
        group: item[1],
        amount: item[2],
        kind: 'cost'
      };
    });
    return {
      currency: 'USD',
      exerciseName: pick(lang, 'Análisis económico del ciclo productivo', 'Economic analysis of the production cycle'),
      crop: '',
      areaHa: '',
      period: pick(lang, 'Ciclo productivo', 'Production cycle'),
      isExample: true,
      costs: costs,
      harvestedKg: '',
      soldKg: 20000,
      pricePerKg: 1,
      byproductRevenue: '',
      financingCost: ''
    };
  }

  function exampleModuleB(opts) {
    var lang = langOf(opts);
    return {
      currency: 'USD',
      strategyName: pick(lang, 'Programa de nutrición', 'Nutrition program'),
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

  function sumCostLines(lines, errors, lang) {
    var total = 0;
    var items = [];
    (lines || []).forEach(function (line, index) {
      var parsed = readOptionalNumber(line && line.amount);
      var label = costLineLabel(line, lang) || pick(lang, 'Concepto ', 'Item ') + (index + 1);
      if (!parsed.ok) {
        pushError(errors, 'invalid_number', pick(lang,
          'Revisa el importe de «' + label + '».',
          'Check the amount for “' + label + '”.'));
        return;
      }
      var amount = parsed.empty ? 0 : parsed.value;
      var kind = line && (line.kind === 'saving' || line.kind === 'adjustment') ? line.kind : 'cost';
      if (kind === 'cost' && amount < 0) {
        pushError(errors, 'negative_cost', pick(lang,
          '«' + label + '» no puede ser negativo. Un ahorro se registra en el apartado de ahorros, no como costo ordinario.',
          '“' + label + '” cannot be negative. A saving is entered in the savings section, not as an ordinary cost.'));
        return;
      }
      if (kind !== 'cost' && amount < 0) {
        pushError(errors, 'negative_saving', pick(lang,
          'El ahorro o ajuste de «' + label + '» se anota en positivo.',
          'The saving or adjustment for “' + label + '” is entered as a positive number.'));
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

  function summarizeGroups(lines, opts) {
    var lang = langOf(opts);
    var summed = sumCostLines(lines || [], [], lang);
    var buckets = {};
    COST_GROUPS.forEach(function (group) {
      buckets[group.id] = { id: group.id, label: pick(lang, group.label, group.labelEn), total: 0 };
    });
    var loose = { id: 'sin_grupo', label: pick(lang, 'Otros conceptos', 'Other items'), total: 0, used: false };
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
    var lang = langOf(input);
    var N = notes(lang);
    var errors = [];
    var notices = [];
    var currency = isCurrency(input.currency) ? input.currency : 'USD';
    var costs = sumCostLines(input.costs, errors, lang);
    var harvested = readOptionalNumber(input.harvestedKg);
    var sold = readOptionalNumber(input.soldKg);
    var price = readOptionalNumber(input.pricePerKg);
    var byproduct = readOptionalNumber(input.byproductRevenue);
    var financing = readOptionalNumber(input.financingCost);
    var area = readOptionalNumber(input.areaHa);

    [harvested, sold, price, byproduct, financing, area].forEach(function (parsed) {
      if (!parsed.ok) pushError(errors, parsed.code, pick(lang,
        'Hay un dato numérico que no se pudo leer.',
        'A numeric value could not be read.'));
    });
    if (harvested.ok && !harvested.empty && harvested.value < 0) {
      pushError(errors, 'negative_production', pick(lang,
        'La producción cosechada no puede ser negativa.',
        'Harvested production cannot be negative.'));
    }
    if (sold.ok && !sold.empty && sold.value < 0) {
      pushError(errors, 'negative_production', pick(lang,
        'La producción comercializada no puede ser negativa.',
        'Marketed production cannot be negative.'));
    }
    if (price.ok && !price.empty && price.value < 0) {
      pushError(errors, 'negative_price', pick(lang,
        'El precio de venta no puede ser negativo.',
        'The sale price cannot be negative.'));
    }
    if (byproduct.ok && !byproduct.empty && byproduct.value < 0) {
      pushError(errors, 'negative_byproduct', pick(lang,
        'Los ingresos por subproductos no pueden ser negativos.',
        'Income from by-products cannot be negative.'));
    }
    if (financing.ok && !financing.empty && financing.value < 0) {
      pushError(errors, 'negative_financing', pick(lang,
        'Los intereses y comisiones se anotan en positivo.',
        'Interest and fees are entered as positive numbers.'));
    }
    if (area.ok && !area.empty && area.value <= 0) {
      pushError(errors, 'invalid_area', pick(lang,
        'La superficie debe ser mayor que cero para calcular valores por hectárea.',
        'The area must be greater than zero to calculate per-hectare values.'));
    }
    if (harvested.ok && sold.ok && !harvested.empty && !sold.empty && sold.value > harvested.value) {
      pushError(errors, 'sold_exceeds_harvest', pick(lang,
        'La producción comercializada no puede superar la producción cosechada.',
        'Marketed production cannot exceed harvested production.'));
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
          message: pick(lang,
            'Con cero kilogramos comercializados no se calcula el costo por kilogramo ni el precio de equilibrio.',
            'With zero kilograms marketed, the cost per kilogram and the break-even price are not calculated.')
        });
      }
      if (totalCost > 0) returnOnCostPct = (profit / totalCost) * 100;
      else {
        notices.push({
          code: 'no_cost_base',
          message: pick(lang,
            'Sin costos mayores que cero no se calcula la rentabilidad sobre el costo.',
            'Without costs greater than zero, the return on cost is not calculated.')
        });
      }
      if (revenue > 0) marginOnSalesPct = (profit / revenue) * 100;
      else {
        notices.push({
          code: 'no_revenue_base',
          message: pick(lang,
            'Sin ingresos no se calcula el margen sobre ventas.',
            'Without revenue, the margin on sales is not calculated.')
        });
      }
    } else if (!blocked) {
      notices.push({
        code: 'incomplete',
        message: pick(lang,
          'Para ingresos, utilidad y costo por kilogramo hacen falta los kilogramos comercializados y el precio promedio.',
          'To calculate revenue, profit and cost per kilogram, you need the kilograms marketed and the average price.')
      });
    }

    if (harvestedKg != null && soldKg != null && harvestedKg > 0) {
      wasteKg = harvestedKg - soldKg;
      commercializationPct = (soldKg / harvestedKg) * 100;
    }

    if (!blocked && financingValue === 0) {
      notices.push({ code: 'before_tax', message: N.taxNote });
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
      language: lang,
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
    var lang = langOf(input);
    var fixed = readOptionalNumber(input.fixedCosts);
    var price = readOptionalNumber(input.pricePerKg);
    var variable = readOptionalNumber(input.variableCostPerKg);
    if (!fixed.ok || !price.ok || !variable.ok) {
      return { ok: false, reason: 'invalid_number', kg: null, message: pick(lang,
        'Revisa los datos del volumen de equilibrio.',
        'Check the break-even volume data.') };
    }
    if (fixed.empty || price.empty || variable.empty) {
      return {
        ok: false,
        reason: 'incomplete',
        kg: null,
        message: pick(lang,
          'El volumen de equilibrio necesita costos fijos, costo variable por kilogramo y precio. No se sustituye por el costo total dividido entre el precio.',
          'Break-even volume needs fixed costs, variable cost per kilogram and price. It is not replaced by total cost divided by price.')
      };
    }
    if (fixed.value < 0 || variable.value < 0 || price.value < 0) {
      return { ok: false, reason: 'negative', kg: null, message: pick(lang,
        'Costos fijos, costo variable y precio deben ser cero o positivos.',
        'Fixed costs, variable cost and price must be zero or positive.') };
    }
    var contribution = price.value - variable.value;
    if (contribution <= 0) {
      return {
        ok: false,
        reason: 'no_positive_margin',
        kg: null,
        contributionPerKg: contribution,
        message: pick(lang,
          'Con ese precio no se alcanza un equilibrio de volumen positivo: el precio no supera el costo variable por kilogramo.',
          'At that price there is no positive break-even volume: the price does not exceed the variable cost per kilogram.')
      };
    }
    return {
      ok: true,
      reason: null,
      kg: fixed.value / contribution,
      contributionPerKg: contribution,
      message: pick(lang,
        'Volumen de equilibrio con la estructura de costos fijos y variables de este ejercicio. Corresponde a este precio y a este periodo.',
        'Break-even volume for the fixed and variable cost structure of this exercise. It applies to this price and this period.')
    };
  }

  function evaluateScenario(input) {
    input = input || {};
    var lang = langOf(input);
    var errors = [];
    var sold = readOptionalNumber(input.soldKg);
    var price = readOptionalNumber(input.pricePerKg);
    var byproduct = readOptionalNumber(input.byproductRevenue);
    if (!sold.ok || !price.ok || !byproduct.ok) {
      pushError(errors, 'invalid_number', pick(lang, 'Revisa el escenario.', 'Check the scenario.'));
    }
    if (sold.ok && !sold.empty && sold.value < 0) pushError(errors, 'negative_production', pick(lang,
      'La producción del escenario no puede ser negativa.',
      'The scenario production cannot be negative.'));
    if (price.ok && !price.empty && price.value < 0) pushError(errors, 'negative_price', pick(lang,
      'El precio del escenario no puede ser negativo.',
      'The scenario price cannot be negative.'));
    var mode = input.costMode === 'fixed_plus_variable' || input.costMode === 'custom_total'
      ? input.costMode
      : 'constant_total';
    var totalCost = null;
    var volume = null;
    var assumption = '';
    if (mode === 'fixed_plus_variable') {
      var fixed = readOptionalNumber(input.fixedCosts);
      var variable = readOptionalNumber(input.variableCostPerKg);
      if (!fixed.ok || !variable.ok) pushError(errors, 'invalid_number', pick(lang,
        'Revisa la estructura de costos del escenario.',
        'Check the scenario cost structure.'));
      if (fixed.empty || variable.empty) {
        pushError(errors, 'variable_cost_required', pick(lang,
          'Para este escenario hay que indicar costos fijos y costo variable por kilogramo. No se asume que el variable sea cero.',
          'For this scenario you must enter fixed costs and variable cost per kilogram. The variable cost is not assumed to be zero.'));
      } else if (fixed.value < 0 || variable.value < 0) {
        pushError(errors, 'negative_cost', pick(lang,
          'Los costos del escenario no pueden ser negativos.',
          'The scenario costs cannot be negative.'));
      } else if (sold.ok && !sold.empty && price.ok && !price.empty) {
        totalCost = fixed.value + variable.value * sold.value;
        volume = breakEvenVolume({
          language: lang,
          fixedCosts: fixed.value,
          pricePerKg: price.value,
          variableCostPerKg: variable.value
        });
      }
      assumption = pick(lang,
        'El costo de este escenario sí cambia con los kilogramos: costos fijos más costo variable por kilogramo.',
        'The cost of this scenario does change with kilograms: fixed costs plus variable cost per kilogram.');
    } else {
      var custom = readOptionalNumber(input.totalCost);
      if (!custom.ok) pushError(errors, 'invalid_number', pick(lang,
        'Revisa el costo total del escenario.',
        'Check the total cost of the scenario.'));
      if (custom.empty || custom.value == null) {
        pushError(errors, 'missing_total', pick(lang,
          'Indica el costo total de este escenario.',
          'Enter the total cost for this scenario.'));
      } else if (custom.value < 0) {
        pushError(errors, 'negative_cost', pick(lang,
          'El costo total del escenario no puede ser negativo.',
          'The total cost of the scenario cannot be negative.'));
      } else {
        totalCost = custom.value;
      }
      assumption = mode === 'custom_total'
        ? pick(lang,
          'Se usa el costo total escrito para la alternativa. Si ese costo esconde partidas variables, no lo tomes como volumen de equilibrio.',
          'The total cost you entered is used for the alternative. If that cost hides variable items, do not take it as a break-even volume.')
        : pick(lang,
          'Esta alternativa mantiene constante el costo total del ejercicio. Los kilos donde el ingreso iguala ese costo no son el volumen de equilibrio si existen costos que crecen con la producción.',
          'This alternative keeps the total cost of the exercise constant. The kilograms where revenue equals that cost are not the break-even volume if some costs grow with production.');
    }

    if (errors.length || sold.empty || price.empty || totalCost == null) {
      return {
        ok: false,
        language: lang,
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
      language: lang,
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
        language: langOf(input),
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

  function additionalKgForRecovery(spec, lang) {
    var denom = spec.priceImproved - spec.variablePerKg;
    if (!(denom > 0)) {
      return {
        ok: false,
        reason: 'no_positive_margin',
        extraKg: null,
        message: pick(lang,
          'No hay un equilibrio positivo en kilogramos: el precio del manejo mejorado no supera el costo variable incremental por kilogramo.',
          'There is no positive break-even in kilograms: the price of the improved management does not exceed the incremental variable cost per kilogram.')
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

  function interpretBenefitCost(ratio, currency, lang) {
    if (!Number.isFinite(ratio)) return '';
    if (ratio < 1) return pick(lang,
      'El beneficio incremental no alcanza a recuperar la inversión.',
      'The incremental benefit does not recover the investment.');
    if (Math.abs(ratio - 1) < 0.005) {
      return pick(lang,
        'La inversión adicional se recupera, pero no deja beneficio incremental después de pagarla.',
        'The additional investment is recovered, but it leaves no incremental benefit after paying for it.');
    }
    var n = formatRatio(ratio).replace(':1', '');
    return pick(lang,
      'Por cada ' + currency + ' 1 adicional invertido, se generan ' + n + ' ' + currency + ' de beneficio antes de recuperar la inversión.',
      'For each additional ' + currency + ' 1 invested, ' + n + ' ' + currency + ' of benefit is generated before recovering the investment.');
  }

  function interpretIncomeRatio(ratio, currency, lang) {
    if (!Number.isFinite(ratio)) return '';
    if (ratio < 1) {
      return pick(lang,
        'Las ventas adicionales no alcanzan a igualar la inversión extra. Esto todavía no es beneficio neto.',
        'The additional sales do not match the extra investment. This is not net benefit yet.');
    }
    var n = formatRatio(ratio).replace(':1', '');
    return pick(lang,
      'Por cada ' + currency + ' 1 adicional invertido se generaron ' + n + ' ' + currency + ' en ventas adicionales. No confundir ventas adicionales con beneficio neto.',
      'For each additional ' + currency + ' 1 invested, ' + n + ' ' + currency + ' in additional sales were generated. Do not confuse additional sales with net benefit.');
  }

  function evaluateInvestment(input) {
    input = input || {};
    var lang = langOf(input);
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
      if (!fields[key].ok) pushError(errors, 'invalid_number', pick(lang,
        'Revisa los datos de la comparación.',
        'Check the comparison data.'));
    });

    function requireNonNegative(parsed, code, message, required) {
      if (!parsed.ok) return;
      if (required && parsed.empty) pushError(errors, 'incomplete', message);
      else if (!parsed.empty && parsed.value < 0) pushError(errors, code, message);
    }
    requireNonNegative(fields.currentCost, 'negative_cost', pick(lang, 'El costo del manejo actual no puede ser negativo.', 'The cost of the current management cannot be negative.'), true);
    requireNonNegative(fields.improvedCost, 'negative_cost', pick(lang, 'El costo del manejo mejorado no puede ser negativo.', 'The cost of the improved management cannot be negative.'), true);
    requireNonNegative(fields.currentKg, 'negative_production', pick(lang, 'La producción del manejo actual no puede ser negativa.', 'The production of the current management cannot be negative.'), true);
    requireNonNegative(fields.improvedKg, 'negative_production', pick(lang, 'La producción del manejo mejorado no puede ser negativa.', 'The production of the improved management cannot be negative.'), true);
    requireNonNegative(fields.currentPrice, 'negative_price', pick(lang, 'El precio del manejo actual no puede ser negativo.', 'The price of the current management cannot be negative.'), true);
    requireNonNegative(fields.improvedPrice, 'negative_price', pick(lang, 'El precio del manejo mejorado no puede ser negativo.', 'The price of the improved management cannot be negative.'), true);
    requireNonNegative(fields.currentAssoc, 'negative_cost', pick(lang, 'Los otros costos del manejo actual no pueden ser negativos.', 'The other costs of the current management cannot be negative.'), false);
    requireNonNegative(fields.improvedAssoc, 'negative_cost', pick(lang, 'Los otros costos del manejo mejorado no pueden ser negativos.', 'The other costs of the improved management cannot be negative.'), false);
    requireNonNegative(fields.lump, 'negative_cost', pick(lang, 'Los otros costos incrementales se anotan en positivo.', 'Other incremental costs are entered as positive numbers.'), false);
    requireNonNegative(fields.variable, 'negative_cost', pick(lang, 'El costo variable incremental por kilogramo no puede ser negativo.', 'The incremental variable cost per kilogram cannot be negative.'), false);
    requireNonNegative(fields.savings, 'negative_saving', pick(lang, 'Los ahorros se anotan en positivo.', 'Savings are entered as positive numbers.'), false);

    var otherMode = input.otherMode === 'none' || input.otherMode === 'lump' || input.otherMode === 'per_kg'
      ? input.otherMode
      : 'unspecified';
    if (otherMode === 'lump' && fields.lump.ok && fields.lump.empty) {
      pushError(errors, 'missing_lump', pick(lang,
        'Indicaste un importe de costos incrementales, pero el campo está vacío.',
        'You indicated an amount of incremental costs, but the field is empty.'));
    }
    if (otherMode === 'per_kg' && fields.variable.ok && fields.variable.empty) {
      pushError(errors, 'missing_variable', pick(lang,
        'Indicaste un costo variable por kilogramo adicional, pero el campo está vacío.',
        'You indicated a variable cost per additional kilogram, but the field is empty.'));
    }
    if (errors.length) {
      return { ok: false, language: lang, errors: errors, warnings: warnings, currency: currency, otherMode: otherMode };
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
        message: pick(lang,
          'Hay otros costos o ahorros capturados, pero conviene confirmar si ya están todos los costos de la producción adicional.',
          'Other costs or savings were entered, but you should confirm that all the costs of the additional production are included.')
      });
    }
    if (Math.abs(associatedDelta) > 0 && (otherMode === 'lump' || otherMode === 'per_kg')) {
      warnings.push({
        code: 'possible_double_count',
        message: pick(lang,
          'Revisa que los otros costos de cada columna no estén repetidos en los costos incrementales.',
          'Check that the other costs in each column are not repeated in the incremental costs.')
      });
    }
    if (input.scope === 'full_system') {
      warnings.push({
        code: 'full_system_scope',
        message: pick(lang,
          'Estás comparando el costo del sistema completo. No sumes otra vez un programa que ya esté dentro de ese total.',
          'You are comparing the full system cost. Do not add a program again if it is already included in that total.')
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
      ratioBlockedReason = pick(lang,
        'No hay inversión adicional. La relación no se divide entre cero; conviene leer el cambio de ingresos, costos y utilidad.',
        'There is no additional investment. The ratio is not divided by zero; read the change in revenue, costs and profit instead.');
    } else if (investmentDelta < 0) {
      ratioBlockedReason = pick(lang,
        'El manejo comparado cuesta menos. No se presenta una relación por cada unidad invertida de más, porque la inversión incremental es un ahorro.',
        'The compared management costs less. No ratio per extra unit invested is shown, because the incremental investment is a saving.');
    }

    var extraKgNeeded = null;
    var extraKgMode = 'needs_variable_cost';
    var extraKgMessage = pick(lang,
      'Para saber cuántos kilogramos adicionales recuperan la inversión hay que confirmar el costo variable por kilogramo adicional, aunque sea cero.',
      'To know how many additional kilograms recover the investment, confirm the variable cost per additional kilogram, even if it is zero.');
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
      }, lang);
      if (!solved.ok && solved.reason === 'no_positive_margin') {
        extraKgMode = 'no_positive_margin';
        extraKgMessage = solved.message;
      } else if (solved.ok && solved.extraKg <= 1e-9) {
        extraKgNeeded = 0;
        extraKgMode = 'recovered_without_more_kg';
        extraKgMessage = pick(lang,
          'Con las condiciones registradas no hace falta comercializar más kilogramos para recuperar la inversión adicional.',
          'With the conditions entered, no additional kilograms need to be marketed to recover the additional investment.');
      } else if (solved.ok && samePrice && Math.abs(savings) < 1e-9 && Math.abs(lump) < 1e-9 && Math.abs(associatedDelta) < 1e-9) {
        extraKgNeeded = solved.extraKg;
        extraKgMode = 'same_price';
        extraKgMessage = pick(lang,
          'Kilogramos adicionales para recuperar la inversión con el mismo precio y el costo variable incremental indicado.',
          'Additional kilograms needed to recover the investment at the same price and the incremental variable cost indicated.');
      } else if (solved.ok) {
        extraKgNeeded = solved.extraKg;
        extraKgMode = 'full_comparison';
        extraKgMessage = pick(lang,
          'Los precios, ahorros o costos no dependen solo de los kilos de diferencia. Este equilibrio sale de comparar los dos escenarios completos.',
          'Prices, savings or costs do not depend only on the difference in kilograms. This break-even comes from comparing the two complete scenarios.');
      }
    }

    var origin = classifyOrigin(productionDelta, currentPrice, improvedPrice, revenueDelta);
    var loss = costsConsidered ? incrementalProfit < 0 : revenueDelta < investmentDelta;
    var recovered = costsConsidered && investmentDelta > 0 && incrementalProfit >= -1e-9;
    if (costsConsidered && investmentDelta <= 0 && incrementalProfit >= -1e-9) recovered = true;

    return {
      ok: true,
      language: lang,
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
      incomeInterpretation: incomeRatio == null ? ratioBlockedReason : interpretIncomeRatio(incomeRatio, currency, lang),
      benefitInterpretation: benefitCostRatio == null ? '' : interpretBenefitCost(benefitCostRatio, currency, lang)
    };
  }

  function moneyPhrase(amount, currency) {
    return formatMoney(amount, currency);
  }

  function conclusionModuleB(result, meta) {
    meta = meta || {};
    if (!result || !result.ok) return '';
    var lang = meta.language != null ? langOf(meta) : langOf(result);
    var N = notes(lang);
    var name = meta.strategyName
      ? pick(lang, '«' + meta.strategyName + '»', '“' + meta.strategyName + '”')
      : pick(lang, 'el manejo comparado', 'the compared management');
    var cur = result.currency;
    var parts = [pick(lang, 'La comparación de ', 'The comparison of ') + name + ' '];
    if (result.investmentDelta > 0) parts.push(pick(lang,
      'requiere ' + moneyPhrase(result.investmentDelta, cur) + ' adicionales',
      'requires an additional ' + moneyPhrase(result.investmentDelta, cur)));
    else if (result.investmentDelta < 0) parts.push(pick(lang,
      'reduce el costo del programa en ' + moneyPhrase(Math.abs(result.investmentDelta), cur),
      'reduces the program cost by ' + moneyPhrase(Math.abs(result.investmentDelta), cur)));
    else parts.push(pick(lang, 'no cambia la inversión del programa', 'does not change the program investment'));
    parts.push(pick(lang, ' y ', ' and '));
    if (result.productionDelta > 0) parts.push(pick(lang,
      'presenta un incremento de ' + formatKg(result.productionDelta) + ' comercializados',
      'shows an increase of ' + formatKg(result.productionDelta) + ' marketed'));
    else if (result.productionDelta < 0) parts.push(pick(lang,
      'presenta ' + formatKg(Math.abs(result.productionDelta)) + ' menos comercializados',
      'shows ' + formatKg(Math.abs(result.productionDelta)) + ' less marketed'));
    else parts.push(pick(lang, 'mantiene la misma producción comercializada', 'keeps the same marketed production'));
    parts.push(pick(lang,
      '. Bajo las condiciones registradas, el ingreso adicional es ' + moneyPhrase(result.revenueDelta, cur) + '. ',
      '. Under the conditions entered, the additional revenue is ' + moneyPhrase(result.revenueDelta, cur) + '. '));
    if (!result.costsConsidered) {
      parts.push(pick(lang,
        'Esa cifra es de ventas, no de utilidad neta: todavía no se descontaron los costos de la producción adicional. ',
        'That figure is sales, not net profit: the costs of the additional production have not been deducted yet. '));
    } else if (result.incrementalProfit != null) {
      if (result.incrementalProfit < 0) {
        parts.push(pick(lang,
          'El resultado incremental es una pérdida de ' + moneyPhrase(Math.abs(result.incrementalProfit), cur) + '. ',
          'The incremental result is a loss of ' + moneyPhrase(Math.abs(result.incrementalProfit), cur) + '. '));
      } else {
        parts.push(pick(lang,
          'La utilidad incremental estimada es de ' + moneyPhrase(result.incrementalProfit, cur),
          'The estimated incremental profit is ' + moneyPhrase(result.incrementalProfit, cur)));
        if (result.otherIncremental > 0) parts.push(pick(lang,
          ', ya descontados los costos incrementales registrados y la inversión adicional',
          ', after deducting the incremental costs entered and the additional investment'));
        else parts.push(pick(lang, ', antes de otros gastos no registrados', ', before other unrecorded expenses'));
        parts.push('. ');
      }
    }
    if (result.origin === 'price') {
      parts.push(pick(lang,
        'La mejora registrada se origina en el precio, no en la cantidad producida. ',
        'The improvement recorded comes from price, not from the quantity produced. '));
    } else if (result.origin === 'mixed') {
      parts.push(pick(lang,
        'El cambio de ingreso combina cantidad y precio; no proviene solo de más kilogramos. ',
        'The change in revenue combines quantity and price; it does not come only from more kilograms. '));
    } else if (result.origin === 'none' && result.investmentDelta > 0) {
      parts.push(pick(lang,
        'La inversión adicional no se recupera con los kilogramos y el precio registrados. ',
        'The additional investment is not recovered with the kilograms and price entered. '));
    }
    parts.push(N.causalityNote + ' ');
    parts.push(N.comparisonDisclaimer);
    return parts.join('');
  }

  function interpretationModuleA(result, meta) {
    var lang = meta != null ? langOf(meta) : langOf(result);
    var N = notes(lang);
    if (!result || !result.ok || result.profit == null) {
      return pick(lang,
        'Completa costos, kilogramos comercializados y precio para leer el resultado económico de este periodo.',
        'Fill in costs, kilograms marketed and price to read the economic result for this period.');
    }
    var cur = result.currency;
    if (result.loss) {
      return pick(lang,
        'Con los datos de este ejercicio los ingresos no cubren los costos considerados. El resultado es una pérdida de '
          + formatMoney(Math.abs(result.profit), cur)
          + '. El precio de equilibrio de este volumen es ' + formatPerKg(result.breakEvenPrice, cur)
          + '. No es un precio universal para otros niveles de producción. ',
        'With the data in this exercise, revenue does not cover the costs considered. The result is a loss of '
          + formatMoney(Math.abs(result.profit), cur)
          + '. The break-even price for this volume is ' + formatPerKg(result.breakEvenPrice, cur)
          + '. It is not a universal price for other production levels. ') + N.taxNote;
    }
    if (Math.abs(result.profit) < 1e-9) {
      return pick(lang,
        'Con este volumen, el ingreso iguala los costos considerados. El precio de equilibrio es '
          + formatPerKg(result.breakEvenPrice, cur) + '. ',
        'At this volume, revenue equals the costs considered. The break-even price is '
          + formatPerKg(result.breakEvenPrice, cur) + '. ') + N.taxNote;
    }
    var text = pick(lang,
      'Con los costos y el volumen de este ejercicio, el costo por kilogramo comercializado es '
        + formatPerKg(result.costPerKg, cur)
        + ' y el precio de equilibrio es ' + formatPerKg(result.breakEvenPrice, cur)
        + '. Vender a ' + formatPerKg(result.pricePerKg, cur)
        + ' deja una utilidad de ' + formatMoney(result.profit, cur)
        + ', equivalente a ' + formatPct(result.returnOnCostPct)
        + ' sobre el costo y ' + formatPct(result.marginOnSalesPct)
        + ' de margen sobre ventas. Rentabilidad sobre el costo y margen sobre ventas no son el mismo indicador. ',
      'With the costs and volume of this exercise, the cost per kilogram marketed is '
        + formatPerKg(result.costPerKg, cur)
        + ' and the break-even price is ' + formatPerKg(result.breakEvenPrice, cur)
        + '. Selling at ' + formatPerKg(result.pricePerKg, cur)
        + ' leaves a profit of ' + formatMoney(result.profit, cur)
        + ', equivalent to ' + formatPct(result.returnOnCostPct)
        + ' on cost and ' + formatPct(result.marginOnSalesPct)
        + ' margin on sales. Return on cost and margin on sales are not the same indicator. ');
    if (result.byproductRevenue > 0) {
      text += pick(lang,
        'El precio de equilibrio ya descuenta los otros ingresos registrados. ',
        'The break-even price already deducts the other income entered. ');
    }
    if (result.financingCost > 0 && result.profitAfterFinancing != null) {
      text += pick(lang,
        'Después de intereses y comisiones, la utilidad queda en ' + formatMoney(result.profitAfterFinancing, cur) + '. ',
        'After interest and fees, the profit is ' + formatMoney(result.profitAfterFinancing, cur) + '. ');
    }
    text += N.taxNote;
    return text;
  }

  function suggestModuleBFromA(cropInput, cropResult, opts) {
    var lang = opts != null ? langOf(opts) : langOf(cropInput);
    var nutrition = null;
    (cropInput && cropInput.costs || []).some(function (line) {
      var label = String(line.label || '');
      var id = String(line.id || '');
      if (id === 'nutricion' || id === 'ex-nut' || /nutrici|nutrition/i.test(label)) {
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
      note: pick(lang,
        'Se copian moneda, kilogramos y precio. Si existe la partida de nutrición, esa cifra puede usarse como costo del programa actual. El costo total del cultivo no se pega solo, para no sumarlo otra vez dentro de la comparación.',
        'Currency, kilograms and price are copied. If a nutrition line exists, that figure can be used as the current program cost. The total crop cost is not pasted automatically, so it is not counted again inside the comparison.'),
      noteTotalCost: pick(lang, 'Costo total del módulo A: ', 'Module A total cost: ')
    };
  }

  function row(label, value) {
    return { label: label, value: value };
  }

  function buildModuleAReport(result, meta) {
    meta = meta || {};
    var lang = meta.language != null ? langOf(meta) : langOf(result);
    var N = notes(lang);
    var cur = result.currency || 'USD';
    var productive = [];
    if (meta.areaHa) productive.push(row(pick(lang, 'Superficie', 'Area'), formatPlain(meta.areaHa, 2) + ' ha'));
    if (result.soldKg != null) productive.push(row(pick(lang, 'Producción comercializada', 'Marketed production'), formatKg(result.soldKg)));
    if (result.harvestedKg != null) productive.push(row(pick(lang, 'Producción cosechada', 'Harvested production'), formatKg(result.harvestedKg)));
    if (result.wasteKg != null) productive.push(row(pick(lang, 'No comercializada', 'Not marketed'), formatKg(result.wasteKg)));
    if (result.pricePerKg != null) productive.push(row(pick(lang, 'Precio promedio', 'Average price'), formatPerKg(result.pricePerKg, cur)));
    var costs = (result.costItems || []).map(function (item) {
      return row(item.label, formatMoney(item.signed, cur));
    });
    if (result.totalCost != null) costs.push(row(pick(lang, 'Costo total', 'Total cost'), formatMoney(result.totalCost, cur)));
    var lossWord = pick(lang, 'Pérdida', 'Loss');
    var profitWord = pick(lang, 'Utilidad', 'Profit');
    var indicators = [];
    if (result.costPerKg != null) indicators.push(row(pick(lang, 'Costo por kilogramo', 'Cost per kilogram'), formatPerKg(result.costPerKg, cur)));
    if (result.revenue != null) indicators.push(row(pick(lang, 'Ingresos', 'Revenue'), formatMoney(result.revenue, cur)));
    if (result.profit != null) {
      indicators.push(row(result.loss ? lossWord : profitWord, formatMoney(result.loss ? Math.abs(result.profit) : result.profit, cur)));
    }
    if (result.profitAfterFinancing != null) {
      var afterLoss = result.profitAfterFinancing < 0;
      indicators.push(row(
        afterLoss
          ? pick(lang, 'Pérdida después de financiamiento', 'Loss after financing')
          : pick(lang, 'Utilidad después de financiamiento', 'Profit after financing'),
        formatMoney(afterLoss ? Math.abs(result.profitAfterFinancing) : result.profitAfterFinancing, cur)
      ));
    }
    if (result.returnOnCostPct != null) indicators.push(row(pick(lang, 'Rentabilidad sobre costo', 'Return on cost'), formatPct(result.returnOnCostPct)));
    if (result.marginOnSalesPct != null) indicators.push(row(pick(lang, 'Margen sobre ventas', 'Margin on sales'), formatPct(result.marginOnSalesPct)));
    if (result.breakEvenPrice != null) indicators.push(row(pick(lang, 'Precio de equilibrio', 'Break-even price'), formatPerKg(result.breakEvenPrice, cur)));
    if (meta.breakEvenVolumeLabel) indicators.push(row(pick(lang, 'Volumen de equilibrio', 'Break-even volume'), meta.breakEvenVolumeLabel));
    var highlights = [];
    if (result.costPerKg != null) highlights.push({ label: pick(lang, 'Costo por kg', 'Cost per kg'), value: formatPerKg(result.costPerKg, cur), tone: 'navy' });
    if (result.breakEvenPrice != null) highlights.push({ label: pick(lang, 'Precio de equilibrio', 'Break-even price'), value: formatPerKg(result.breakEvenPrice, cur), tone: 'navy' });
    if (result.returnOnCostPct != null) {
      highlights.push({
        label: pick(lang, 'Rentabilidad sobre costo', 'Return on cost'),
        value: formatPct(result.returnOnCostPct),
        tone: result.loss ? 'loss' : 'ok'
      });
    }
    if (result.profit != null) {
      highlights.push({
        label: result.loss ? lossWord : profitWord,
        value: formatMoney(result.loss ? Math.abs(result.profit) : result.profit, cur),
        tone: result.loss ? 'loss' : 'ok'
      });
    }
    return {
      language: lang,
      product: 'NutriPlant PRO',
      tool: pick(lang, 'Rentabilidad Agrícola', 'Crop Profitability'),
      module: pick(lang, 'Rentabilidad del cultivo', 'Crop profit analysis'),
      date: meta.date || '',
      exerciseName: meta.exerciseName || '',
      crop: meta.crop || '',
      period: meta.period || '',
      loss: !!result.loss,
      highlights: highlights,
      chartTitles: pick(lang,
        ['Distribución de costos', 'Ingresos y costos', 'Escenario: ingreso y costo'],
        ['Cost distribution', 'Revenue and costs', 'Scenario: revenue and cost']),
      sections: [
        { title: pick(lang, 'Resumen productivo', 'Production summary'), rows: productive },
        { title: pick(lang, 'Desglose de costos', 'Cost breakdown'), rows: costs },
        { title: pick(lang, 'Indicadores económicos', 'Economic indicators'), rows: indicators }
      ],
      interpretation: interpretationModuleA(result, { language: lang }),
      notes: [N.taxNote, N.comparisonDisclaimer].concat(meta.isExample ? [N.exampleDisclaimer] : []),
      tagline: N.tagline
    };
  }

  function buildModuleBReport(result, meta) {
    meta = meta || {};
    var lang = meta.language != null ? langOf(meta) : langOf(result);
    var N = notes(lang);
    var cur = result.currency || 'USD';
    var compare = [
      row(pick(lang, 'Inversión actual', 'Current investment'), formatMoney(result.currentCost, cur)),
      row(pick(lang, 'Inversión del manejo comparado', 'Investment of the compared management'), formatMoney(result.improvedCost, cur)),
      row(pick(lang, 'Diferencia de inversión', 'Investment difference'), formatMoney(result.investmentDelta, cur)),
      row(pick(lang, 'Producción actual', 'Current production'), formatKg(result.currentKg)),
      row(pick(lang, 'Producción del manejo comparado', 'Production of the compared management'), formatKg(result.improvedKg)),
      row(pick(lang, 'Diferencia de producción', 'Production difference'), (result.productionDelta > 0 ? '+' : '') + formatKg(result.productionDelta)),
      row(pick(lang, 'Diferencia de ingresos', 'Revenue difference'), formatMoney(result.revenueDelta, cur))
    ];
    var incLossWord = pick(lang, 'Pérdida incremental', 'Incremental loss');
    var incProfitWord = pick(lang, 'Utilidad incremental', 'Incremental profit');
    var indicators = [];
    if (result.costsConsidered && result.otherIncremental != null) {
      indicators.push(row(pick(lang, 'Otros costos incrementales', 'Other incremental costs'), formatMoney(result.otherIncremental, cur)));
      indicators.push(row(pick(lang, 'Beneficio antes de la inversión adicional', 'Benefit before the additional investment'), formatMoney(result.benefitBeforeInvestment, cur)));
      indicators.push(row(
        result.loss ? incLossWord : incProfitWord,
        formatMoney(result.loss ? Math.abs(result.incrementalProfit) : result.incrementalProfit, cur)
      ));
    }
    if (result.incomeRatioLabel) indicators.push(row(pick(lang, 'Relación ingreso adicional / inversión adicional', 'Additional revenue / additional investment ratio'), result.incomeRatioLabel));
    if (result.benefitCostRatioLabel) indicators.push(row(pick(lang, 'Relación beneficio-costo incremental', 'Incremental benefit-cost ratio'), result.benefitCostRatioLabel));
    if (result.extraKgNeeded != null) indicators.push(row(pick(lang, 'Producción adicional para recuperar la inversión', 'Additional production needed to recover the investment'), formatKg(result.extraKgNeeded)));
    var ratioLabel = result.benefitCostRatioLabel
      ? pick(lang, 'Relación beneficio-costo', 'Benefit-cost ratio')
      : (result.incomeRatioLabel ? pick(lang, 'Ingreso / inversión', 'Revenue / investment') : null);
    var ratioValue = result.benefitCostRatioLabel || result.incomeRatioLabel;
    var highlights = [];
    if (ratioLabel && ratioValue) {
      highlights.push({
        label: ratioLabel,
        value: ratioValue,
        tone: result.loss ? 'loss' : 'ok'
      });
    }
    highlights.push({ label: pick(lang, 'Inversión adicional', 'Additional investment'), value: formatMoney(result.investmentDelta, cur), tone: 'navy' });
    highlights.push({
      label: pick(lang, 'Producción adicional', 'Additional production'),
      value: (result.productionDelta > 0 ? '+' : '') + formatKg(result.productionDelta),
      tone: result.productionDelta < 0 ? 'loss' : 'ok'
    });
    if (result.costsConsidered && result.incrementalProfit != null) {
      highlights.push({
        label: result.loss ? incLossWord : incProfitWord,
        value: formatMoney(result.loss ? Math.abs(result.incrementalProfit) : result.incrementalProfit, cur),
        tone: result.loss ? 'loss' : 'ok'
      });
    }
    return {
      language: lang,
      product: 'NutriPlant PRO',
      tool: pick(lang, 'Rentabilidad Agrícola', 'Crop Profitability'),
      module: pick(lang, 'Valor de una inversión adicional', 'Value of an additional investment'),
      date: meta.date || '',
      strategyName: meta.strategyName || '',
      crop: meta.crop || '',
      loss: !!result.loss,
      highlights: highlights,
      chartTitles: pick(lang, [
        'Comparación de inversión',
        'Comparación de producción',
        'Valor económico incremental',
        'Producción para recuperar la inversión'
      ], [
        'Investment comparison',
        'Production comparison',
        'Incremental economic value',
        'Production needed to recover the investment'
      ]),
      sections: [
        { title: pick(lang, 'Comparación de programas', 'Program comparison'), rows: compare },
        { title: pick(lang, 'Indicadores económicos', 'Economic indicators'), rows: indicators }
      ],
      interpretation: conclusionModuleB(result, { language: lang, strategyName: meta.strategyName }),
      notes: [N.agronomicNote, N.causalityNote, N.comparisonDisclaimer].concat(meta.isExample ? [N.exampleDisclaimer] : []),
      tagline: N.tagline
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
    pick: pick,
    langOf: langOf,
    notes: notes,
    currencyName: currencyName,
    groupLabel: groupLabel,
    categoryLabel: categoryLabel,
    costLineLabel: costLineLabel,
    localizeKnownText: localizeKnownText,
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
