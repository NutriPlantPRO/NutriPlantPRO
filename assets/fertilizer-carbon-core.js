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
    if (!_data || !_data.fertilizers) return [];
    var order = { granular: 1, soluble: 2, liquid: 3, organic: 4 };
    return _data.fertilizers.slice().sort(function (a, b) {
      var oa = order[a.physical_form] || 9;
      var ob = order[b.physical_form] || 9;
      if (oa !== ob) return oa - ob;
      return String(a.name).localeCompare(String(b.name), 'es');
    });
  }

  function fertilizerFormGroupLabel(form) {
    var map = {
      granular: 'Granulados',
      soluble: 'Hidrosolubles',
      liquid: 'Líquidos',
      organic: 'Orgánicos'
    };
    return map[form] || 'Otros';
  }

  function findCountry(iso) {
    if (!_data || !_data.countries) return null;
    return _data.countries.find(function (c) { return c.iso === iso; }) || null;
  }

  function findFertilizer(id) {
    if (!_data || !_data.fertilizers) return null;
    return _data.fertilizers.find(function (f) { return f.id === id; }) || null;
  }

  function isOriginGroupId(id) {
    return !!(id && _data && _data.origin_groups && _data.origin_groups[id]);
  }

  /** Acepta ISO de país o id de grupo regional (EU, CN, LATAM…). */
  function originGroupForCountry(isoOrGroup) {
    if (isOriginGroupId(isoOrGroup)) return isoOrGroup;
    var c = findCountry(isoOrGroup);
    return (c && c.origin_group) ? c.origin_group : 'GLOBAL';
  }

  function getOriginGroups() {
    if (!_data || !_data.origin_groups) return [];
    return Object.keys(_data.origin_groups).map(function (id) {
      return { id: id, label: originGroupLabel(id) };
    }).sort(function (a, b) {
      if (a.id === 'GLOBAL') return -1;
      if (b.id === 'GLOBAL') return 1;
      return String(a.label).localeCompare(String(b.label), 'es');
    });
  }

  function manufacturingRegionLabel(isoOrGroup) {
    return originGroupLabel(originGroupForCountry(isoOrGroup));
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

  function getAvailabilityProfiles() {
    if (!_data || !_data.methodology) return {};
    return _data.methodology.availability_profiles || {};
  }

  function manufacturingAvailabilityStatus(fertilizer, originGroup) {
    if (!fertilizer) return 'not_applicable';
    var profiles = getAvailabilityProfiles();
    var profileId = fertilizer.availability_profile || 'granular_np';
    var profile = profiles[profileId];
    if (!profile) return 'secondary';
    var g = originGroup || 'GLOBAL';
    return profile[g] || profile.GLOBAL || 'secondary';
  }

  function manufacturingAvailabilityLabel(status) {
    var leg = (_data && _data.methodology && _data.methodology.availability_legend) || {};
    return leg[status] || status;
  }

  function canCalculateManufacturing(fertilizer, originGroup, factorSource) {
    if (factorSource === 'custom_per_kg' || factorSource === 'custom_total_mfg') return true;
    return manufacturingAvailabilityStatus(fertilizer, originGroup) !== 'not_applicable';
  }

  function getFertilizersForOrigin(originGroup) {
    var g = originGroupForCountry(originGroup || 'GLOBAL');
    return getFertilizers().filter(function (f) {
      return manufacturingAvailabilityStatus(f, g) !== 'not_applicable';
    });
  }

  function getFertilizersForOrigins(originGroups) {
    var groups = Array.isArray(originGroups) ? originGroups : [];
    if (!groups.length) return getFertilizers();
    return getFertilizers().filter(function (f) {
      return groups.every(function (iso) {
        var g = originGroupForCountry(iso || 'GLOBAL');
        return manufacturingAvailabilityStatus(f, g) !== 'not_applicable';
      });
    });
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

  function transportCo2e(kgProduct, distanceKm, mode) {
    if (!_data || !distanceKm || distanceKm <= 0) return 0;
    var t = _data.transport || {};
    var m = mode === 'sea' ? 'sea' : 'road';
    var factor = m === 'sea'
      ? toNum(t.sea_kg_co2e_per_tonne_km, toNum(t.kg_co2e_per_tonne_km, 0.00001) * 0.16)
      : toNum(t.road_kg_co2e_per_tonne_km, toNum(t.kg_co2e_per_tonne_km, 0.000062));
    var tonnes = Math.max(0, toNum(kgProduct, 0)) / 1000;
    return tonnes * distanceKm * factor;
  }

  function transportLegsCo2e(kgProduct, originKm, seaKm, roadKm) {
    var origin = transportCo2e(kgProduct, originKm, 'road');
    var sea = transportCo2e(kgProduct, seaKm, 'sea');
    var road = transportCo2e(kgProduct, roadKm, 'road');
    return {
      origin_kg_co2e: origin,
      sea_kg_co2e: sea,
      road_kg_co2e: road,
      total_kg_co2e: origin + sea + road
    };
  }

  /** km referencia: fábrica → puerto exportación en región productora. */
  function estimateOriginFactoryToPortKm(mfgGroup) {
    if (!_data || !_data.route_estimates) return null;
    var map = _data.route_estimates.origin_factory_to_port_km || {};
    var g = originGroupForCountry(mfgGroup || 'GLOBAL');
    var km = map[g] != null ? toNum(map[g], null) : toNum(map.GLOBAL, null);
    return km != null ? Math.round(km) : null;
  }

  function getDestinationEntryConfig(countryIso) {
    var re = _data && _data.route_estimates;
    if (!re || !re.destination_entry_points || !countryIso) return null;
    return re.destination_entry_points[countryIso] || null;
  }

  function getDestinationEntryPoints(countryIso) {
    var cfg = getDestinationEntryConfig(countryIso);
    if (!cfg || !Array.isArray(cfg.options)) return [];
    return cfg.options.slice();
  }

  function findDestinationEntryPoint(countryIso, entryPointId) {
    var cfg = getDestinationEntryConfig(countryIso);
    if (!cfg || !Array.isArray(cfg.options)) return null;
    var id = entryPointId || cfg.default;
    var found = cfg.options.find(function (o) { return o.id === id; });
    if (found) return found;
    found = cfg.options.find(function (o) { return o.id === cfg.default; });
    return found || cfg.options[0] || null;
  }

  function maritimeKmFromEntry(entry, mfgGroup) {
    if (!entry || !entry.maritime_km_from) return null;
    var map = entry.maritime_km_from;
    if (map[mfgGroup] != null) return toNum(map[mfgGroup], null);
    if (map._default != null) return toNum(map._default, null);
    return null;
  }

  function lookupRouteKm(map, destIso) {
    if (!map || typeof map !== 'object') return null;
    if (destIso && map[destIso] != null) return toNum(map[destIso], null);
    if (map._default != null) return toNum(map._default, null);
    return null;
  }

  /**
   * Distancia marítima aproximada: región fábrica → puerto del país destino.
   * Referencia de rutas comerciales típicas — no GPS ni logística real.
   */
  function estimateMaritimeKm(mfgGroup, destCountryIso, entryPointId) {
    if (!_data || !destCountryIso || destCountryIso === 'GLOBAL') return null;
    var mfg = originGroupForCountry(mfgGroup || 'GLOBAL');
    var dest = findCountry(destCountryIso);
    if (!dest) return null;
    var destGroup = dest.origin_group;
    var entry = findDestinationEntryPoint(destCountryIso, entryPointId);
    if (entry) {
      var fromEntry = maritimeKmFromEntry(entry, mfg);
      if (fromEntry != null) return Math.round(fromEntry);
    }

    if (mfg === destGroup) {
      var domestic = _data.route_estimates && _data.route_estimates.maritime_km;
      if (domestic && domestic[mfg] && domestic[mfg][destCountryIso] === 0) return 0;
      if (mfg === destGroup && mfg === 'MX' && destCountryIso === 'MX') return 0;
    }

    var routes = (_data.route_estimates && _data.route_estimates.maritime_km) || {};
    var row = routes[mfg] || routes.GLOBAL || {};
    var km = lookupRouteKm(row, destCountryIso);
    if (km == null) km = lookupRouteKm(routes.GLOBAL || {}, destCountryIso);
    return km != null ? Math.round(km) : null;
  }

  /** km terrestre referencia: puerto → campo interior. */
  function estimateRoadPortToFieldKm(destCountryIso, entryPointId) {
    if (!_data || !destCountryIso || destCountryIso === 'GLOBAL') return null;
    var entry = findDestinationEntryPoint(destCountryIso, entryPointId);
    if (entry && entry.road_km != null) return Math.round(toNum(entry.road_km, 0));
    var roads = (_data.route_estimates && _data.route_estimates.road_port_to_field_km) || {};
    var km = lookupRouteKm(roads, destCountryIso);
    if (km == null) km = lookupRouteKm(roads, '_default');
    return km != null ? Math.round(km) : null;
  }

  function dominantManufacturingGroup(input) {
    var rows = Array.isArray(input && input.rows) ? input.rows : [];
    var fallback = originGroupForCountry((input && input.origin_country_iso) || 'GLOBAL');
    var counts = {};
    var hasDose = false;
    rows.forEach(function (row) {
      var dose = toNum(row && row.dose, 0);
      if (dose <= 0) return;
      hasDose = true;
      var g = originGroupForCountry((row && row.origin_country_iso) || fallback);
      counts[g] = (counts[g] || 0) + 1;
    });
    if (!hasDose) return fallback;
    var best = fallback;
    var bestN = 0;
    Object.keys(counts).forEach(function (g) {
      if (counts[g] > bestN) {
        bestN = counts[g];
        best = g;
      }
    });
    return best;
  }

  function estimateTransportRoute(input) {
    var destIso = (input && input.application_country_iso) ? input.application_country_iso : null;
    var entryPointId = (input && input.entry_point_id) ? input.entry_point_id : null;
    var mfgGroup = dominantManufacturingGroup(input);
    var entry = findDestinationEntryPoint(destIso, entryPointId);
    var seaKm = estimateMaritimeKm(mfgGroup, destIso, entry ? entry.id : entryPointId);
    var roadKm = estimateRoadPortToFieldKm(destIso, entry ? entry.id : entryPointId);
    var originKm = estimateOriginFactoryToPortKm(mfgGroup);
    var dest = findCountry(destIso);
    var re = (_data && _data.route_estimates) || {};
    var cfg = getDestinationEntryConfig(destIso);
    var portLabel = entry ? entry.label : (dest ? dest.name : destIso);
    return {
      ok: true,
      manufacturing_group: mfgGroup,
      manufacturing_group_label: originGroupLabel(mfgGroup),
      destination_country_iso: destIso,
      destination_country_name: dest ? dest.name : destIso,
      entry_point_id: entry ? entry.id : null,
      entry_point_label: entry ? entry.label : null,
      origin_km: originKm,
      origin_km_note: originKm != null
        ? 'Referencia ' + originGroupLabel(mfgGroup) + ': ~' + originKm + ' km planta → puerto exportación (suele ser poco vs marítimo).'
        : null,
      maritime_km: seaKm,
      road_km: roadKm,
      note: seaKm === 0
        ? 'Producción y destino en la misma región/país: sin tramo marítimo estimado; solo terrestre puerto/almacén → campo.'
        : (entry
          ? 'Ruta referencia: ' + originGroupLabel(mfgGroup) + ' → ' + portLabel + '. Ajusta con tu dato logístico real.'
          : 'Ruta referencia: puerto exportación (' + originGroupLabel(mfgGroup) + ') → ' + (dest ? dest.name : destIso) + '. Ajusta con tu dato logístico real.'),
      disclaimer: re.disclaimer || 'Distancia aproximada de referencia.'
    };
  }

  /**
   * @param {Object} input
   * @param {string} input.origin_country_iso - País de fabricación
   * @param {number} [input.area_ha] - Superficie (ha)
   * @param {number} [input.transport_origin_km] - Terrestre origen: fábrica → puerto exportación (km)
   * @param {number} [input.transport_km] - Distancia terrestre puerto destino → campo (km)
   * @param {number} [input.transport_sea_km] - Distancia marítima puerto origen → puerto destino (km)
   * @param {Array} input.rows - { fertilizer_id, dose, dose_unit: 'kg_ha'|'total_kg' }
   */
  function calculate(input) {
    if (!_data) {
      return { ok: false, error: 'Factores no cargados' };
    }
    var originIso = (input && input.origin_country_iso) ? input.origin_country_iso : 'GLOBAL';
    var originGroup = originGroupForCountry(originIso);
    var areaHa = Math.max(0, toNum(input && input.area_ha, 0));
    var transportOriginKm = Math.max(0, toNum(input && input.transport_origin_km, 0));
    var transportRoadKm = Math.max(0, toNum(input && input.transport_road_km, toNum(input && input.transport_km, 0)));
    var transportSeaKm = Math.max(0, toNum(input && input.transport_sea_km, 0));
    var rowsIn = Array.isArray(input && input.rows) ? input.rows : [];

    var meta = _data.methodology || {};
    var resultRows = [];
    var totals = {
      manufacturing_kg_co2e: 0,
      transport_kg_co2e: 0,
      transport_origin_kg_co2e: 0,
      transport_sea_kg_co2e: 0,
      transport_road_kg_co2e: 0,
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
      var availStatus = manufacturingAvailabilityStatus(fert, rowOriginGroup);
      var mfgBlocked = !canCalculateManufacturing(fert, rowOriginGroup, factorSource);
      var defaultMfgFactor = mfgBlocked ? 0 : manufacturingFactor(fert, rowOriginGroup);
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
      } else if (mfgBlocked) {
        mfg = 0;
        mfgFactor = 0;
        factorSourceLabel = manufacturingAvailabilityLabel('not_applicable');
      } else {
        mfg = kgProductTotal * defaultMfgFactor;
        if (availStatus === 'import_typical') {
          factorSourceLabel = 'Estimado (importación habitual — factor regional exportador)';
        } else if (availStatus === 'secondary') {
          factorSourceLabel = 'Estimado (producción regional limitada)';
        }
      }
      var rowOriginKm = transportOriginKm;
      var transportLegs = transportLegsCo2e(kgProductTotal, rowOriginKm, transportSeaKm, transportRoadKm);
      var transport = transportLegs.total_kg_co2e;
      var kgN = kgProductTotal * (toNum(fert.n_total_pct, 0) / 100);
      var field = fieldN2oCo2e(kgN);
      var total = mfg + transport + field;

      totals.manufacturing_kg_co2e += mfg;
      totals.transport_kg_co2e += transport;
      totals.transport_origin_kg_co2e += transportLegs.origin_kg_co2e;
      totals.transport_sea_kg_co2e += transportLegs.sea_kg_co2e;
      totals.transport_road_kg_co2e += transportLegs.road_kg_co2e;
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
        origin_country_name: manufacturingRegionLabel(rowOriginIso),
        dose: dose,
        dose_unit: doseUnit,
        kg_product_total: round2(kgProductTotal),
        kg_ha: round2(kgHa),
        kg_n_applied: round2(kgN),
        manufacturing_factor: round3(mfgFactor),
        manufacturing_kg_co2e: round2(mfg),
        transport_kg_co2e: round2(transport),
        transport_origin_kg_co2e: round2(transportLegs.origin_kg_co2e),
        transport_sea_kg_co2e: round2(transportLegs.sea_kg_co2e),
        transport_road_kg_co2e: round2(transportLegs.road_kg_co2e),
        field_kg_co2e: round2(field),
        total_kg_co2e: round2(total),
        factor_source: factorSource,
        factor_source_label: factorSourceLabel,
        row_precision: rowPrecision,
        manufacturing_availability: availStatus,
        manufacturing_blocked: mfgBlocked,
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
      if (!rr.origin_group) return;
      var key = rr.origin_group;
      if (originsSeen[key]) return;
      originsSeen[key] = true;
      originsUsed.push({
        iso: rr.origin_group,
        name: rr.origin_group_label,
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
      transport_km: transportRoadKm,
      transport_road_km: transportRoadKm,
      transport_origin_km: transportOriginKm,
      transport_sea_km: transportSeaKm,
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
        transport_origin_kg_co2e: round2(totals.transport_origin_kg_co2e),
        transport_sea_kg_co2e: round2(totals.transport_sea_kg_co2e),
        transport_road_kg_co2e: round2(totals.transport_road_kg_co2e),
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

      if (rr.manufacturing_blocked) {
        bestTotal += transport + field;
        worstTotal += transport + field;
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
    fertilizerFormGroupLabel: fertilizerFormGroupLabel,
    findCountry: findCountry,
    findFertilizer: findFertilizer,
    originGroupForCountry: originGroupForCountry,
    isOriginGroupId: isOriginGroupId,
    getOriginGroups: getOriginGroups,
    manufacturingRegionLabel: manufacturingRegionLabel,
    originGroupLabel: originGroupLabel,
    manufacturingFactor: manufacturingFactor,
    manufacturingAvailabilityStatus: manufacturingAvailabilityStatus,
    manufacturingAvailabilityLabel: manufacturingAvailabilityLabel,
    canCalculateManufacturing: canCalculateManufacturing,
    getFertilizersForOrigin: getFertilizersForOrigin,
    getFertilizersForOrigins: getFertilizersForOrigins,
    minMaxManufacturingFactor: minMaxManufacturingFactor,
    fieldN2oCo2e: fieldN2oCo2e,
    transportCo2e: transportCo2e,
    transportLegsCo2e: transportLegsCo2e,
    estimateOriginFactoryToPortKm: estimateOriginFactoryToPortKm,
    estimateMaritimeKm: estimateMaritimeKm,
    estimateRoadPortToFieldKm: estimateRoadPortToFieldKm,
    estimateTransportRoute: estimateTransportRoute,
    dominantManufacturingGroup: dominantManufacturingGroup,
    getDestinationEntryPoints: getDestinationEntryPoints,
    getDestinationEntryConfig: getDestinationEntryConfig,
    findDestinationEntryPoint: findDestinationEntryPoint,
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
