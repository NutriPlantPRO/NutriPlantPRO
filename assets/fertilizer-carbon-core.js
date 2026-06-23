/**
 * NutriPlant — núcleo compartido: huella de carbono de fertilizantes (estimación).
 * Fuentes públicas: IPCC (N₂O suelo), promedios regionales LCA (fabricación), DEFRA (transporte).
 */
(function (w) {
  'use strict';

  var _data = null;

  function round3(n) {
    return Math.round(Number(n) * 1000) / 1000;
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function toNum(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) ? n : (fallback != null ? fallback : 0);
  }

  function loadFactors(url) {
    var u = url || 'assets/emission-factors-by-country.json';
    return fetch(u)
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar factores de emisión');
        return r.json();
      })
      .then(function (json) {
        _data = json;
        return json;
      });
  }

  function setFactors(data) {
    _data = data;
    return _data;
  }

  function getFactors() {
    return _data;
  }

  function getCountries() {
    if (!_data || !_data.countries) return [];
    return _data.countries.slice().sort(function (a, b) {
      if (a.iso === 'GLOBAL') return -1;
      if (b.iso === 'GLOBAL') return 1;
      return String(a.name).localeCompare(String(b.name), 'es');
    });
  }

  function getFertilizers() {
    return (_data && _data.fertilizers) ? _data.fertilizers.slice() : [];
  }

  function findCountry(iso) {
    if (!_data || !_data.countries) return null;
    return _data.countries.find(function (c) { return c.iso === iso; }) || null;
  }

  function findFertilizer(id) {
    if (!_data || !_data.fertilizers) return null;
    return _data.fertilizers.find(function (f) { return f.id === id; }) || null;
  }

  function originGroupForCountry(iso) {
    var c = findCountry(iso);
    return (c && c.origin_group) ? c.origin_group : 'GLOBAL';
  }

  function originGroupLabel(groupId) {
    if (!_data || !_data.origin_groups || !_data.origin_groups[groupId]) return groupId || 'GLOBAL';
    return _data.origin_groups[groupId].label || groupId;
  }

  function manufacturingFactor(fertilizer, originGroup) {
    if (!fertilizer || !fertilizer.manufacturing_kg_co2e_per_kg) return 0;
    var map = fertilizer.manufacturing_kg_co2e_per_kg;
    var g = originGroup || 'GLOBAL';
    if (map[g] != null) return toNum(map[g], map.GLOBAL || 0);
    return toNum(map.GLOBAL, 0);
  }

  function fieldN2oCo2e(kgNApplied) {
    if (!_data) return 0;
    var meta = _data.methodology || {};
    var ef1 = toNum(meta.field_ef1, 0.01);
    var gwp = toNum(meta.gwp_n2o, 273);
    var n = Math.max(0, toNum(kgNApplied, 0));
    if (n <= 0) return 0;
    var kgN2o = n * ef1 * (44 / 28);
    return kgN2o * gwp;
  }

  function transportCo2e(kgProduct, distanceKm) {
    if (!_data || !distanceKm || distanceKm <= 0) return 0;
    var t = _data.transport || {};
    var factor = toNum(t.kg_co2e_per_tonne_km, 0.000062);
    var tonnes = Math.max(0, toNum(kgProduct, 0)) / 1000;
    return tonnes * distanceKm * factor;
  }

  /**
   * @param {Object} input
   * @param {string} input.origin_country_iso - País de fabricación
   * @param {number} [input.area_ha] - Superficie (ha)
   * @param {number} [input.transport_km] - Distancia transporte (km)
   * @param {Array} input.rows - { fertilizer_id, dose, dose_unit: 'kg_ha'|'total_kg' }
   */
  function calculate(input) {
    if (!_data) {
      return { ok: false, error: 'Factores no cargados' };
    }
    var originIso = (input && input.origin_country_iso) ? input.origin_country_iso : 'GLOBAL';
    var originGroup = originGroupForCountry(originIso);
    var areaHa = Math.max(0, toNum(input && input.area_ha, 0));
    var transportKm = Math.max(0, toNum(input && input.transport_km, 0));
    var rowsIn = Array.isArray(input && input.rows) ? input.rows : [];

    var meta = _data.methodology || {};
    var resultRows = [];
    var totals = {
      manufacturing_kg_co2e: 0,
      transport_kg_co2e: 0,
      field_kg_co2e: 0,
      total_kg_co2e: 0,
      total_kg_n_applied: 0,
      total_kg_product: 0
    };

    rowsIn.forEach(function (row, idx) {
      var fert = findFertilizer(row && row.fertilizer_id);
      if (!fert) {
        resultRows.push({ index: idx, ok: false, error: 'Fertilizante no encontrado' });
        return;
      }
      var rowOriginIso = (row && row.origin_country_iso) ? row.origin_country_iso : originIso;
      var rowOriginGroup = originGroupForCountry(rowOriginIso);
      var dose = Math.max(0, toNum(row.dose, 0));
      var doseUnit = row.dose_unit === 'total_kg' ? 'total_kg' : 'kg_ha';
      var kgProduct = doseUnit === 'total_kg' ? dose : dose;
      var kgProductTotal = doseUnit === 'total_kg' ? dose : (areaHa > 0 ? dose * areaHa : dose);
      var kgHa = doseUnit === 'kg_ha' ? dose : (areaHa > 0 ? dose / areaHa : 0);

      var factorSource = (row && row.factor_source) ? row.factor_source : 'estimated';
      var customFactor = toNum(row && row.custom_factor, 0);
      var customMfgTotal = toNum(row && row.custom_mfg_total_kg_co2e, 0);
      var defaultMfgFactor = manufacturingFactor(fert, rowOriginGroup);
      var mfgFactor = defaultMfgFactor;
      var mfg = 0;
      var factorSourceLabel = 'Estimado por origen';
      var rowPrecision = 'estimated';

      if (factorSource === 'custom_per_kg' && customFactor > 0) {
        mfgFactor = customFactor;
        mfg = kgProductTotal * customFactor;
        factorSourceLabel = 'Factor ingresado por usuario (kg CO₂e/kg)';
        rowPrecision = 'user_provided';
      } else if (factorSource === 'custom_total_mfg' && customMfgTotal > 0) {
        mfgFactor = kgProductTotal > 0 ? customMfgTotal / kgProductTotal : customMfgTotal;
        mfg = customMfgTotal;
        factorSourceLabel = 'Emisión fabricación ingresada por usuario (kg CO₂e total)';
        rowPrecision = 'user_provided';
      } else {
        mfg = kgProductTotal * defaultMfgFactor;
      }
      var transport = transportCo2e(kgProductTotal, transportKm);
      var kgN = kgProductTotal * (toNum(fert.n_total_pct, 0) / 100);
      var field = fieldN2oCo2e(kgN);
      var total = mfg + transport + field;

      totals.manufacturing_kg_co2e += mfg;
      totals.transport_kg_co2e += transport;
      totals.field_kg_co2e += field;
      totals.total_kg_co2e += total;
      totals.total_kg_n_applied += kgN;
      totals.total_kg_product += kgProductTotal;

      resultRows.push({
        index: idx,
        ok: true,
        fertilizer_id: fert.id,
        fertilizer_name: fert.name,
        origin_country_iso: rowOriginIso,
        origin_group: rowOriginGroup,
        origin_group_label: originGroupLabel(rowOriginGroup),
        origin_country_name: (findCountry(rowOriginIso) || {}).name || rowOriginIso,
        dose: dose,
        dose_unit: doseUnit,
        kg_product_total: round2(kgProductTotal),
        kg_ha: round2(kgHa),
        kg_n_applied: round2(kgN),
        manufacturing_factor: round3(mfgFactor),
        manufacturing_kg_co2e: round2(mfg),
        transport_kg_co2e: round2(transport),
        field_kg_co2e: round2(field),
        total_kg_co2e: round2(total),
        factor_source: factorSource,
        factor_source_label: factorSourceLabel,
        row_precision: rowPrecision,
        custom_note: (row && row.custom_note) ? String(row.custom_note).trim() : '',
        source: rowPrecision === 'user_provided' ? 'Factor ingresado por usuario (no verificado por NutriPlant)' : fert.source,
        factor_year: fert.factor_year
      });
    });

    var perHa = areaHa > 0 ? totals.total_kg_co2e / areaHa : null;
    var originsUsed = [];
    var originsSeen = {};
    var hasUserFactors = false;
    resultRows.forEach(function (rr) {
      if (!rr.ok) return;
      if (rr.row_precision === 'user_provided') hasUserFactors = true;
      if (!rr.origin_country_iso) return;
      var key = rr.origin_country_iso;
      if (originsSeen[key]) return;
      originsSeen[key] = true;
      originsUsed.push({
        iso: rr.origin_country_iso,
        name: rr.origin_country_name,
        group_label: rr.origin_group_label
      });
    });

    return {
      ok: true,
      disclaimer: meta.disclaimer || '',
      origin_country_iso: originIso,
      origin_group: originGroup,
      origin_group_label: originGroupLabel(originGroup),
      origins_used: originsUsed,
      multiple_origins: originsUsed.length > 1,
      has_user_provided_factors: hasUserFactors,
      precision: hasUserFactors ? 'mixed' : (meta.precision || 'estimated'),
      area_ha: areaHa,
      transport_km: transportKm,
      methodology: {
        manufacturing: meta.manufacturing_note,
        field: meta.field_note,
        transport: meta.transport_note,
        gwp_n2o: toNum(meta.gwp_n2o, 273),
        field_ef1: toNum(meta.field_ef1, 0.01),
        factor_year: meta.factor_year,
        sources: meta.sources || []
      },
      rows: resultRows,
      totals: {
        manufacturing_kg_co2e: round2(totals.manufacturing_kg_co2e),
        transport_kg_co2e: round2(totals.transport_kg_co2e),
        field_kg_co2e: round2(totals.field_kg_co2e),
        total_kg_co2e: round2(totals.total_kg_co2e),
        total_t_co2e: round3(totals.total_kg_co2e / 1000),
        total_kg_n_applied: round2(totals.total_kg_n_applied),
        total_kg_product: round2(totals.total_kg_product),
        per_ha_kg_co2e: perHa != null ? round2(perHa) : null,
        per_ha_t_co2e: perHa != null ? round3(perHa / 1000) : null
      },
      citations: getCitationsForCalculation({ rows: resultRows, totals: totals })
    };
  }

  function getCitations() {
    var meta = (_data && _data.methodology) ? _data.methodology : {};
    return Array.isArray(meta.citations) ? meta.citations.slice() : [];
  }

  function findCitation(id) {
    return getCitations().find(function (c) { return c.id === id; }) || null;
  }

  function getCitationsForIds(ids) {
    if (!Array.isArray(ids)) return [];
    return ids.map(function (id) { return findCitation(id); }).filter(Boolean);
  }

  function getCitationsForCalculation(result) {
    var seen = {};
    var list = [];
    function add(c) {
      if (!c || !c.id || seen[c.id]) return;
      seen[c.id] = true;
      list.push(c);
    }
    add(findCitation('ipcc_2019_refinement'));
    add(findCitation('ipcc_ar6_gwp'));
    if (result && result.totals && result.totals.transport_kg_co2e > 0) {
      var t = _data && _data.transport;
      add(findCitation(t && t.citation_id ? t.citation_id : 'desnz_freight'));
    }
    if (result && result.rows) {
      result.rows.forEach(function (row) {
        if (!row.ok) return;
        var fert = findFertilizer(row.fertilizer_id);
        if (fert && Array.isArray(fert.citation_ids)) {
          getCitationsForIds(fert.citation_ids).forEach(add);
        }
        if (row.field_kg_co2e > 0) add(findCitation('ipcc_2019_refinement'));
        if (row.manufacturing_kg_co2e > 0) add(findCitation('lca_regional_avg'));
      });
    }
    return list;
  }

  function formatCitationHtml(c) {
    if (!c) return '';
    var url = c.url ? '<a href="' + c.url + '" target="_blank" rel="noopener noreferrer">' + c.short + '</a>' : c.short;
    var param = c.parameter ? ' · ' + c.parameter : '';
    var lic = c.license ? ' <em>(' + c.license + ')</em>' : '';
    return '<li><strong>' + url + '</strong> — ' + c.full + param + lic + '</li>';
  }

  function formatCo2e(kg) {
    if (kg == null || !Number.isFinite(Number(kg))) return '—';
    var n = Number(kg);
    if (Math.abs(n) >= 1000) return round3(n / 1000) + ' t CO₂e';
    return round2(n) + ' kg CO₂e';
  }

  function minMaxManufacturingFactor(fertilizer) {
    if (!fertilizer || !fertilizer.manufacturing_kg_co2e_per_kg) {
      return { min: 0, max: 0, minGroup: 'GLOBAL', maxGroup: 'GLOBAL' };
    }
    var map = fertilizer.manufacturing_kg_co2e_per_kg;
    var min = Infinity;
    var max = -Infinity;
    var minGroup = 'GLOBAL';
    var maxGroup = 'GLOBAL';
    Object.keys(map).forEach(function (g) {
      var v = toNum(map[g], NaN);
      if (!Number.isFinite(v)) return;
      if (v < min) {
        min = v;
        minGroup = g;
      }
      if (v > max) {
        max = v;
        maxGroup = g;
      }
    });
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = min;
    return { min: min, max: max, minGroup: minGroup, maxGroup: maxGroup };
  }

  function efficiencyTierLabel(score) {
    if (score == null) return 'Sin referencia de rango';
    if (score >= 75) return 'Eficiente — cerca del mínimo estimado por origen';
    if (score >= 50) return 'Moderado — hay margen de mejora cambiando origen';
    if (score >= 25) return 'Mejorable — lejos del mínimo estimado';
    return 'Poco eficiente — cerca del máximo estimado por origen';
  }

  /**
   * Benchmark de eficiencia por origen de fabricación (mismos productos y dosis).
   * Compara el total actual con el mínimo/máximo teórico según factores regionales en la tabla.
   */
  function calculateOriginEfficiency(input) {
    var base = calculate(input);
    if (!base.ok) return { ok: false, error: base.error || 'Error de cálculo' };

    var rowsIn = Array.isArray(input && input.rows) ? input.rows : [];
    var bestTotal = 0;
    var worstTotal = 0;
    var adjustableRows = 0;
    var opportunities = [];

    rowsIn.forEach(function (row, idx) {
      var rr = base.rows[idx];
      if (!rr || !rr.ok) return;

      var fert = findFertilizer(row && row.fertilizer_id);
      if (!fert) return;

      var transport = rr.transport_kg_co2e;
      var field = rr.field_kg_co2e;
      var currentMfg = rr.manufacturing_kg_co2e;
      var kgProductTotal = rr.kg_product_total;
      var factorSource = (row && row.factor_source) ? row.factor_source : 'estimated';
      var isCustom = factorSource === 'custom_per_kg' || factorSource === 'custom_total_mfg';

      if (isCustom || kgProductTotal <= 0) {
        bestTotal += currentMfg + transport + field;
        worstTotal += currentMfg + transport + field;
        return;
      }

      adjustableRows += 1;
      var mm = minMaxManufacturingFactor(fert);
      var bestMfg = kgProductTotal * mm.min;
      var worstMfg = kgProductTotal * mm.max;
      bestTotal += bestMfg + transport + field;
      worstTotal += worstMfg + transport + field;

      var saving = currentMfg - bestMfg;
      if (saving > 0.001) {
        opportunities.push({
          fertilizer_id: fert.id,
          fertilizer_name: fert.name,
          current_mfg_kg_co2e: round2(currentMfg),
          best_mfg_kg_co2e: round2(bestMfg),
          saving_kg_co2e: round2(saving),
          best_origin_group: mm.minGroup,
          best_origin_group_label: originGroupLabel(mm.minGroup),
          worst_origin_group_label: originGroupLabel(mm.maxGroup)
        });
      }
    });

    opportunities.sort(function (a, b) {
      return b.saving_kg_co2e - a.saving_kg_co2e;
    });

    var currentTotal = base.totals.total_kg_co2e;
    var range = worstTotal - bestTotal;
    var efficiencyScore = null;
    var positionPct = null;

    if (adjustableRows > 0 && range > 0.001) {
      efficiencyScore = Math.round(Math.max(0, Math.min(100, ((worstTotal - currentTotal) / range) * 100)));
      positionPct = Math.round(Math.max(0, Math.min(100, ((currentTotal - bestTotal) / range) * 100)));
    }

    var potentialReduction = Math.max(0, currentTotal - bestTotal);
    var potentialReductionPct = currentTotal > 0
      ? Math.round((potentialReduction / currentTotal) * 100)
      : 0;

    return {
      ok: true,
      current_total_kg_co2e: round2(currentTotal),
      best_case_total_kg_co2e: round2(bestTotal),
      worst_case_total_kg_co2e: round2(worstTotal),
      range_kg_co2e: round2(range),
      efficiency_score: efficiencyScore,
      position_pct: positionPct,
      tier_label: efficiencyTierLabel(efficiencyScore),
      potential_reduction_kg_co2e: round2(potentialReduction),
      potential_reduction_pct: potentialReductionPct,
      adjustable_rows: adjustableRows,
      has_user_provided_factors: base.has_user_provided_factors,
      opportunities: opportunities.slice(0, 5),
      disclaimer: 'Referencia metodológica según rango de orígenes en factores públicos. No es ranking oficial ni certificación.'
    };
  }

  w.NpFertilizerCarbon = {
    loadFactors: loadFactors,
    setFactors: setFactors,
    getFactors: getFactors,
    getCountries: getCountries,
    getFertilizers: getFertilizers,
    findCountry: findCountry,
    findFertilizer: findFertilizer,
    originGroupForCountry: originGroupForCountry,
    originGroupLabel: originGroupLabel,
    manufacturingFactor: manufacturingFactor,
    minMaxManufacturingFactor: minMaxManufacturingFactor,
    fieldN2oCo2e: fieldN2oCo2e,
    transportCo2e: transportCo2e,
    calculate: calculate,
    calculateOriginEfficiency: calculateOriginEfficiency,
    formatCo2e: formatCo2e,
    getCitations: getCitations,
    findCitation: findCitation,
    getCitationsForIds: getCitationsForIds,
    getCitationsForCalculation: getCitationsForCalculation,
    formatCitationHtml: formatCitationHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
