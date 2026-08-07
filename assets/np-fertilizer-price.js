/**
 * Precio de fertilizantes solubles (USD/t métrica canónico).
 * UI: métrico USD/t · US customary USD/ton (corta).
 * Costo fertirriego: USD/ha · USD/acre. Hidroponía: USD del lote.
 */
(function (global) {
  'use strict';

  var KG_PER_SHORT_TON = 907.18474;
  var HA_PER_ACRE = 0.404685642;

  function prefs() {
    var p = global.NpPrefs && typeof global.NpPrefs.get === 'function' ? global.NpPrefs.get() : null;
    var language = (p && p.language === 'en') ? 'en' : 'es';
    var unitSystem = (p && p.unit_system === 'us_customary') ? 'us_customary' : 'metric';
    return { language: language, unit_system: unitSystem };
  }

  function getUnitSystem(override) {
    if (override === 'metric' || override === 'us_customary') return override;
    return prefs().unit_system;
  }

  function getLanguage(override) {
    if (override === 'en' || override === 'es') return override;
    return prefs().language;
  }

  function t(es, en, lang) {
    return getLanguage(lang) === 'en' ? en : es;
  }

  function priceUnitLabel(lang, unitSystem) {
    var us = getUnitSystem(unitSystem);
    return us === 'us_customary'
      ? t('USD/ton', 'USD/ton', lang)
      : t('USD/t', 'USD/t', lang);
  }

  function costAreaUnitLabel(lang, unitSystem) {
    var us = getUnitSystem(unitSystem);
    return us === 'us_customary'
      ? t('USD/acre', 'USD/acre', lang)
      : t('USD/ha', 'USD/ha', lang);
  }

  function costBatchUnitLabel(lang) {
    return t('USD', 'USD', lang);
  }

  function labels(lang, unitSystem) {
    return {
      price: t('Precio', 'Price', lang),
      priceUnit: priceUnitLabel(lang, unitSystem),
      cost: t('Costo', 'Cost', lang),
      costPerProduct: t('Costo por producto', 'Cost per product', lang),
      totalCost: t('Costo total', 'Total cost', lang),
      costAreaUnit: costAreaUnitLabel(lang, unitSystem),
      costBatchUnit: costBatchUnitLabel(lang)
    };
  }

  function toDisplayPrice(priceUsdPerTonne, unitSystem) {
    var n = parseFloat(priceUsdPerTonne);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (getUnitSystem(unitSystem) === 'us_customary') {
      return n * (KG_PER_SHORT_TON / 1000);
    }
    return n;
  }

  function fromDisplayPrice(displayValue, unitSystem) {
    var n = parseFloat(displayValue);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (getUnitSystem(unitSystem) === 'us_customary') {
      return n / (KG_PER_SHORT_TON / 1000);
    }
    return n;
  }

  function formatMoney(n, digits) {
    var d = digits == null ? 2 : digits;
    var x = Number(n);
    if (!Number.isFinite(x)) return '0.00';
    return x.toFixed(d);
  }

  function costUsdFromKg(kg, priceUsdPerTonne) {
    var mass = parseFloat(kg) || 0;
    var price = parseFloat(priceUsdPerTonne) || 0;
    if (!(mass > 0) || !(price > 0)) return 0;
    return (mass / 1000) * price;
  }

  /** USD/ha canónico a partir de kg/ha (o kg producto/ha si líquido ya convertido). */
  function costUsdPerHaFromKgHa(kgHa, priceUsdPerTonne) {
    return costUsdFromKg(kgHa, priceUsdPerTonne);
  }

  function toDisplayAreaCost(usdPerHa, unitSystem) {
    var n = parseFloat(usdPerHa) || 0;
    if (getUnitSystem(unitSystem) === 'us_customary') return n * HA_PER_ACRE;
    return n;
  }

  function productKgFromAmount(amount, material) {
    var a = parseFloat(amount) || 0;
    if (!(a > 0)) return 0;
    if (!material) return a;
    var unit = String(material.unit || '').toUpperCase();
    var density = parseFloat(material.density);
    if (unit === 'L' && density > 0) return a * density;
    return a;
  }

  function normalizeOverrides(map) {
    var out = {};
    if (!map || typeof map !== 'object') return out;
    Object.keys(map).forEach(function (k) {
      var n = parseFloat(map[k]);
      if (Number.isFinite(n) && n >= 0) out[String(k)] = n;
    });
    return out;
  }

  function mergeOverrides() {
    var out = {};
    for (var i = 0; i < arguments.length; i++) {
      var m = normalizeOverrides(arguments[i]);
      Object.keys(m).forEach(function (k) { out[k] = m[k]; });
    }
    return out;
  }

  /**
   * Resuelve precio canónico USD/t.
   * Orden: custom item.priceUsdPerTonne → overrides → 0
   */
  function resolvePriceUsdPerTonne(materialId, opts) {
    opts = opts || {};
    var id = materialId == null ? '' : String(materialId);
    if (!id) return 0;
    var items = Array.isArray(opts.customItems) ? opts.customItems : [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      var mid = String(it.id || '');
      if (mid === id || String(it.name || '') === id) {
        var p = parseFloat(it.priceUsdPerTonne);
        if (Number.isFinite(p) && p >= 0) return p;
      }
    }
    var ov = mergeOverrides(opts.priceOverrides, opts.fertiOverrides, opts.hydroOverrides);
    if (ov[id] != null) return ov[id];
    return 0;
  }

  function readProfileBlob(keyCamel) {
    try {
      var userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) return null;
      var raw = localStorage.getItem('nutriplant_user_' + userId);
      if (!raw) return null;
      var profile = JSON.parse(raw);
      return profile && profile[keyCamel] && typeof profile[keyCamel] === 'object' ? profile[keyCamel] : null;
    } catch (e) {
      return null;
    }
  }

  function writeProfileBlob(keyCamel, blob) {
    try {
      var userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) return false;
      var raw = localStorage.getItem('nutriplant_user_' + userId);
      var profile = raw ? JSON.parse(raw) : {};
      profile[keyCamel] = blob && typeof blob === 'object' ? blob : { items: [] };
      localStorage.setItem('nutriplant_user_' + userId, JSON.stringify(profile));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Escribe priceOverrides en ambos catálogos de perfil y dispara sync nube si existe. */
  function syncPriceOverridesToBoth(overrides) {
    var ov = normalizeOverrides(overrides);
    var ferti = readProfileBlob('customFertiMaterials') || { items: [] };
    var hydro = readProfileBlob('customHydroMaterials') || { items: [] };
    if (!Array.isArray(ferti.items)) ferti.items = [];
    if (!Array.isArray(hydro.items)) hydro.items = [];
    ferti.priceOverrides = ov;
    hydro.priceOverrides = ov;
    writeProfileBlob('customFertiMaterials', ferti);
    writeProfileBlob('customHydroMaterials', hydro);
    try {
      var userId = localStorage.getItem('nutriplant_user_id');
      if (userId && typeof global.nutriplantSyncCustomFertiMaterialsToCloud === 'function') {
        global.nutriplantSyncCustomFertiMaterialsToCloud(userId, ferti);
      }
      if (userId && typeof global.nutriplantSyncCustomHydroMaterialsToCloud === 'function') {
        global.nutriplantSyncCustomHydroMaterialsToCloud(userId, hydro);
      }
    } catch (e) {}
    try {
      localStorage.setItem('fertiCustomMaterials_global_user', JSON.stringify(ferti));
      localStorage.setItem('hydroCustomMaterials_global_user', JSON.stringify(hydro));
    } catch (e2) {}
    return ov;
  }

  function loadMergedPriceOverrides() {
    var ferti = readProfileBlob('customFertiMaterials') || {};
    var hydro = readProfileBlob('customHydroMaterials') || {};
    try {
      if (!ferti.priceOverrides) {
        var rawF = localStorage.getItem('fertiCustomMaterials_global_user');
        if (rawF) ferti = JSON.parse(rawF) || ferti;
      }
      if (!hydro.priceOverrides) {
        var rawH = localStorage.getItem('hydroCustomMaterials_global_user');
        if (rawH) hydro = JSON.parse(rawH) || hydro;
      }
    } catch (e) {}
    return mergeOverrides(ferti.priceOverrides, hydro.priceOverrides);
  }

  global.NpFertilizerPrice = {
    KG_PER_SHORT_TON: KG_PER_SHORT_TON,
    HA_PER_ACRE: HA_PER_ACRE,
    getUnitSystem: getUnitSystem,
    getLanguage: getLanguage,
    t: t,
    labels: labels,
    priceUnitLabel: priceUnitLabel,
    costAreaUnitLabel: costAreaUnitLabel,
    costBatchUnitLabel: costBatchUnitLabel,
    toDisplayPrice: toDisplayPrice,
    fromDisplayPrice: fromDisplayPrice,
    formatMoney: formatMoney,
    costUsdFromKg: costUsdFromKg,
    costUsdPerHaFromKgHa: costUsdPerHaFromKgHa,
    toDisplayAreaCost: toDisplayAreaCost,
    productKgFromAmount: productKgFromAmount,
    normalizeOverrides: normalizeOverrides,
    mergeOverrides: mergeOverrides,
    resolvePriceUsdPerTonne: resolvePriceUsdPerTonne,
    syncPriceOverridesToBoth: syncPriceOverridesToBoth,
    loadMergedPriceOverrides: loadMergedPriceOverrides
  };
})(typeof window !== 'undefined' ? window : globalThis);
