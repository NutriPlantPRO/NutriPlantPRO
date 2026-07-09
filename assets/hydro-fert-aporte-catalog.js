/**
 * Catálogo solubles + personalizados (caché) para aporte fertilizantes.
 */
(function (w) {
  'use strict';

  var OX = { P2O5: 2.291, K2O: 1.204, CaO: 1.399, MgO: 1.658 };
  var HYDRO_FERT_KEYS = ['N_NO3', 'N_NH4', 'P', 'S', 'K', 'Ca', 'Mg', 'Cl', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo'];

  var INLINE_FORMULA_ID = '_inline_formula';
  var INLINE_PCT_ID = '_inline_pct';

  function zeroComp() {
    var o = {};
    HYDRO_FERT_KEYS.forEach(function (k) { o[k] = 0; });
    return o;
  }

  function num(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function cloneComp(c) {
    var o = zeroComp();
    if (!c) return o;
    HYDRO_FERT_KEYS.forEach(function (k) { o[k] = num(c[k]); });
    return o;
  }

  function fromFertiRow(row) {
    var c = zeroComp();
    if (!row) return c;
    c.N_NO3 = num(row.N_NO3);
    c.N_NH4 = num(row.N_NH4);
    c.P = row.P2O5 ? num(row.P2O5) / OX.P2O5 : num(row.P);
    c.K = row.K2O ? num(row.K2O) / OX.K2O : num(row.K);
    c.Ca = row.CaO ? num(row.CaO) / OX.CaO : num(row.Ca);
    c.Mg = row.MgO ? num(row.MgO) / OX.MgO : num(row.Mg);
    c.S = num(row.S) || (num(row.SO4) > 0 ? num(row.SO4) / 3 : 0);
    c.Cl = num(row.Cl);
    c.Fe = num(row.Fe);
    c.Mn = num(row.Mn);
    c.B = num(row.B);
    c.Zn = num(row.Zn);
    c.Cu = num(row.Cu);
    c.Mo = num(row.Mo);
    return c;
  }

  function estimateNksBlend(so4ProductPct) {
    var sopSo4 = 51;
    var fSop = Math.min(1, Math.max(0, num(so4ProductPct) / sopSo4));
    var fKno3 = 1 - fSop;
    return {
      sopPct: fSop * 100,
      kno3Pct: fKno3 * 100,
      note: 'Estimado: ' + (fSop * 100).toFixed(1) + '% SOP (K₂SO₄) + ' + (fKno3 * 100).toFixed(1) + '% KNO₃ según SO₄ ' + num(so4ProductPct).toFixed(1) + '% del producto.'
    };
  }

  function fosfonitratoMeta(comp) {
    var nTot = num(comp.N_NO3) + num(comp.N_NH4);
    var p2o5 = num(comp.P) * OX.P2O5;
    var otros = Math.max(0, 100 - nTot - p2o5);
    return {
      othersPct: otros,
      note: 'Etiqueta 33-3-0: N ' + nTot.toFixed(1) + '% (NO₃ ' + num(comp.N_NO3).toFixed(1) + ' + NH₄ ' + num(comp.N_NH4).toFixed(1) + '), P₂O₅ ' + p2o5.toFixed(1) + '%, otros ≈ ' + otros.toFixed(1) + '% (inertes / materia orgánica).'
    };
  }

  function mapRawToEntry(row) {
    var comp = fromFertiRow(row);
    var entry = {
      id: row.id,
      name: row.name,
      formula: row.formula || '',
      kind: row.kind || 'simple',
      compNutriPlant: comp,
      unit: row.unit || 'kg',
      density: num(row.density) || null,
      rawSo4: num(row.SO4)
    };
    if (row.id === 'nks') entry.blend = estimateNksBlend(row.SO4);
    if (row.id === 'fosfonitrato_33_03_00') entry.blend = fosfonitratoMeta(comp);
    if (row.id === 'sulfonit_33_00_00_2s') entry.blend = { note: 'Etiqueta 33-00-00 + 2S: N 33,0% (NO₃ 15,5 + NH₄ 17,5) y S elemental 2,0%.' };
    if (row.id === 'nk_mg') entry.blend = { note: 'Mezcla comercial NK+Mg (KNO₃ + fuente Mg); % según catálogo NutriPlant — editable abajo.' };
    return entry;
  }

  var RAW_FERTI = [
    { id: 'fosfonitrato_33_03_00', name: 'Fosfonitrato', formula: '33-3-0 (+ otros)', kind: 'blend', N_NO3: 16.5, N_NH4: 16.5, P2O5: 3 },
    { id: 'sulfonit_33_00_00_2s', name: 'Sulfonit 33-00-00 + 2S', formula: '33-0-0 + 2S', kind: 'blend', N_NO3: 15.5, N_NH4: 17.5, S: 2 },
    { id: 'sulfato_amonio_soluble', name: 'Sulfato de amonio soluble', formula: '(NH₄)₂SO₄', N_NO3: 0, N_NH4: 21, SO4: 72 },
    { id: 'map', name: 'MAP', formula: 'NH₄H₂PO₄', N_NO3: 0, N_NH4: 12, P2O5: 61 },
    { id: 'mkp', name: 'MKP', formula: 'KH₂PO₄', N_NO3: 0, N_NH4: 0, P2O5: 52, K2O: 34 },
    { id: 'nks', name: 'NKS', formula: 'Mezcla SOP + KNO₃', kind: 'blend', N_NO3: 12, N_NH4: 0, K2O: 46, SO4: 8.1 },
    { id: 'nk_mg', name: 'NK+Mg', formula: 'Mezcla KNO₃ + Mg', kind: 'blend', N_NO3: 13.0, N_NH4: 0, K2O: 46, MgO: 2 },
    { id: 'sop', name: 'SOP', formula: 'K₂SO₄', N_NO3: 0, N_NH4: 0, K2O: 50, SO4: 51 },
    { id: 'kcl_soluble', name: 'KCl soluble', formula: 'KCl', N_NO3: 0, N_NH4: 0, K2O: 60, Cl: 45.2 },
    { id: 'cacl2_dihidratado', name: 'Cloruro de calcio (dih.)', formula: 'CaCl₂·2H₂O', N_NO3: 0, N_NH4: 0, CaO: 38.1, Cl: 48.2 },
    { id: 'nitrato_calcio_granular', name: 'Nitrato de calcio granular', formula: '5Ca(NO₃)₂+NH₄NO₃+10H₂O', N_NO3: 14.4, N_NH4: 1.1, CaO: 26 },
    { id: 'nitrato_calcio_cristal', name: 'Nitrato de calcio cristal', formula: 'Ca(NO₃)₂·4H₂O', N_NO3: 12, N_NH4: 0, CaO: 23, MgO: 0.5 },
    { id: 'nitrato_magnesio', name: 'Nitrato de magnesio', formula: 'Mg(NO₃)₂·6H₂O', N_NO3: 10.8, N_NH4: 0, MgO: 15 },
    { id: 'sulfato_magnesio', name: 'Sulfato de magnesio', formula: 'MgSO₄·7H₂O', N_NO3: 0, N_NH4: 0, MgO: 16, SO4: 37.5 },
    { id: 'sulfato_zinc', name: 'Sulfato de zinc', formula: 'ZnSO₄·H₂O', Zn: 22.5, SO4: 33.5 },
    { id: 'sulfato_manganeso', name: 'Sulfato de manganeso', formula: 'MnSO₄·H₂O', Mn: 32.5, SO4: 56.5 },
    { id: 'sulfato_ferroso', name: 'Sulfato ferroso', formula: 'FeSO₄·7H₂O', Fe: 20.0, SO4: 38.0 },
    { id: 'acido_borico', name: 'Ácido bórico', formula: 'H₃BO₃', B: 17 },
    { id: 'molibdato_sodio', name: 'Molibdato de sodio', formula: 'Na₂MoO₄·2H₂O', Mo: 39 },
    { id: 'mix_micros_edta', name: 'Mix micros EDTA', formula: 'Mezcla quelatos EDTA', kind: 'blend', Fe: 6, Mn: 4, Zn: 2, Cu: 1, B: 1 },
    { id: 'quelato_fe', name: 'Fe EDTA', formula: 'Fe-EDTA', Fe: 13 },
    { id: 'fe_dtpa', name: 'Fe DTPA', formula: 'Fe-DTPA', Fe: 11 },
    { id: 'fe_eddha', name: 'Fe EDDHA', formula: 'Fe-EDDHA', Fe: 6 },
    { id: 'quelato_mn', name: 'Mn EDTA', formula: 'Mn-EDTA', Mn: 13 },
    { id: 'quelato_zn', name: 'Zn EDTA', formula: 'Zn-EDTA', Zn: 13 },
    { id: 'quelato_cu', name: 'Cu EDTA', formula: 'Cu-EDTA', Cu: 14 },
    { id: 'acido_nitrico_55', name: 'Ácido nítrico 55%', formula: 'HNO₃ (55%)', N_NO3: 12.2, unit: 'L', density: 1.33 },
    { id: 'acido_fosforico_75', name: 'Ácido fosfórico 75%', formula: 'H₃PO₄ (75%)', P2O5: 54, unit: 'L', density: 1.57 },
    { id: 'acido_sulfurico_98', name: 'Ácido sulfúrico 98%', formula: 'H₂SO₄ (98%)', SO4: 96, unit: 'L', density: 1.84 }
  ];

  var BUILTIN = RAW_FERTI.map(mapRawToEntry);

  var INLINE_ENTRIES = [
    {
      id: INLINE_FORMULA_ID,
      name: 'Molécula (calcular %)',
      formula: '',
      kind: 'inline_formula',
      compNutriPlant: zeroComp()
    },
    {
      id: INLINE_PCT_ID,
      name: '% elemento — mezcla proveedor',
      formula: '',
      kind: 'inline_pct',
      compNutriPlant: zeroComp()
    }
  ];

  var userMaterials = [];

  function rebuildUserEntry(raw) {
    return {
      id: raw.id,
      name: raw.name || 'Personalizado',
      formula: raw.formula || '',
      kind: raw.kind || 'user_pct',
      compNutriPlant: cloneComp(raw.comp),
      unit: 'kg',
      density: null,
      isUser: true
    };
  }

  function getCatalogList() {
    return BUILTIN.concat(userMaterials.map(rebuildUserEntry)).concat(INLINE_ENTRIES);
  }

  function getById(id) {
    return getCatalogList().find(function (c) { return c.id === id; }) || null;
  }

  function isInlineKind(id) {
    return id === INLINE_FORMULA_ID || id === INLINE_PCT_ID;
  }

  function isEditablePctRow(id) {
    if (isInlineKind(id)) return id === INLINE_PCT_ID;
    var e = getById(id);
    return !!(e && (e.isUser || e.kind === 'inline_pct' || e.kind === 'user_pct'));
  }

  function isFormulaRow(id) {
    return id === INLINE_FORMULA_ID || (function () {
      var e = getById(id);
      return e && (e.kind === 'inline_formula' || e.kind === 'user_formula');
    })();
  }

  function loadUserMaterials(list) {
    if (!Array.isArray(list)) { userMaterials = []; return; }
    userMaterials = list.filter(function (u) { return u && u.id && u.name; }).map(function (u) {
      return {
        id: String(u.id),
        name: String(u.name),
        formula: u.formula != null ? String(u.formula) : '',
        kind: u.kind === 'user_formula' ? 'user_formula' : 'user_pct',
        comp: cloneComp(u.comp)
      };
    });
  }

  function getUserMaterialsSnapshot() {
    return userMaterials.map(function (u) {
      return { id: u.id, name: u.name, formula: u.formula, kind: u.kind, comp: cloneComp(u.comp) };
    });
  }

  function addUserMaterial(opts) {
    opts = opts || {};
    var name = String(opts.name || '').trim();
    if (!name) return { ok: false, error: 'Escribe un nombre para el fertilizante.' };
    var id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    var kind = opts.kind === 'formula' ? 'user_formula' : 'user_pct';
    var comp = cloneComp(opts.comp);
    var formula = String(opts.formula || '').trim();
    if (kind === 'user_formula') {
      if (!formula) return { ok: false, error: 'Escribe la fórmula química.' };
      if (w.FertFormulaEngine) {
        var parsed = w.FertFormulaEngine.tryCompFromFormula(formula);
        if (!parsed.ok) return parsed;
        comp = parsed.comp;
        formula = parsed.normalized || formula;
      }
    }
    var hasAny = HYDRO_FERT_KEYS.some(function (k) { return comp[k] > 0.0001; });
    if (!hasAny) return { ok: false, error: 'Indica al menos un % elemental mayor que 0.' };
    userMaterials.push({ id: id, name: name, formula: formula, kind: kind, comp: comp });
    return { ok: true, id: id, entry: rebuildUserEntry(userMaterials[userMaterials.length - 1]) };
  }

  function removeUserMaterial(id) {
    userMaterials = userMaterials.filter(function (u) { return u.id !== id; });
  }

  var EQ = { N_NO3: 14, N_NH4: 14, P: 31, S: 16.03, K: 39.1, Ca: 20.04, Mg: 12.15, Cl: 35.45 };

  function productPpmFromDose(doseGl) { return num(doseGl) * 1000; }
  function contributionPpm(doseGl, pctElemental) { return productPpmFromDose(doseGl) * num(pctElemental) / 100; }
  function ppmToMeq(n, ppm) { var ew = EQ[n]; return ew ? num(ppm) / ew : 0; }

  function rowTotals(doseGl, compUsed) {
    var ppm = {}, meq = {};
    HYDRO_FERT_KEYS.forEach(function (k) {
      ppm[k] = contributionPpm(doseGl, compUsed[k]);
      meq[k] = ppmToMeq(k, ppm[k]);
    });
    return { ppm: ppm, meq: meq };
  }

  function sumRows(rows) {
    var ppm = zeroComp(), meq = zeroComp();
    rows.forEach(function (r) {
      if (!r || !r.totals) return;
      HYDRO_FERT_KEYS.forEach(function (k) {
        ppm[k] += num(r.totals.ppm[k]);
        meq[k] += num(r.totals.meq[k]);
      });
    });
    return { ppm: ppm, meq: meq };
  }

  w.HydroFertAporteCatalog = {
    KEYS: HYDRO_FERT_KEYS,
    MACRO_KEYS: ['N_NO3', 'N_NH4', 'P', 'S', 'K', 'Ca', 'Mg', 'Cl'],
    MICRO_KEYS: ['Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo'],
    INLINE_FORMULA_ID: INLINE_FORMULA_ID,
    INLINE_PCT_ID: INLINE_PCT_ID,
    EQ: EQ,
    CATALOG: BUILTIN,
    getCatalogList: getCatalogList,
    getById: getById,
    isInlineKind: isInlineKind,
    isEditablePctRow: isEditablePctRow,
    isFormulaRow: isFormulaRow,
    fromFertiRow: fromFertiRow,
    cloneComp: cloneComp,
    estimateNksBlend: estimateNksBlend,
    loadUserMaterials: loadUserMaterials,
    getUserMaterialsSnapshot: getUserMaterialsSnapshot,
    addUserMaterial: addUserMaterial,
    removeUserMaterial: removeUserMaterial,
    productPpmFromDose: productPpmFromDose,
    contributionPpm: contributionPpm,
    ppmToMeq: ppmToMeq,
    rowTotals: rowTotals,
    sumRows: sumRows,
    zeroComp: zeroComp
  };
})(window);
