/**
 * NutriPlant — puente 🪨 Agua en suelo ↔ 🌧️ Balance hídrico (m³ en franja hasta CC).
 */
(function (w) {
  'use strict';

  var BRIDGE_KEY = 'nutriplant_bridge_soil_water_v1';

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function round0(n) {
    return Math.round(Number(n));
  }

  function swT(es, en) {
    if (w.NpWaterClimateUI && typeof w.NpWaterClimateUI.t === 'function') {
      return w.NpWaterClimateUI.t(es, en);
    }
    try {
      var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
      if (p && p.language === 'en') return en || es;
    } catch (e) {}
    return es;
  }

  function swQty(valueSI, kind, digits) {
    if (valueSI == null || !Number.isFinite(Number(valueSI))) return '—';
    if (w.NpWaterClimateUI && typeof w.NpWaterClimateUI.resultFromSI === 'function') {
      return w.NpWaterClimateUI.resultFromSI(Number(valueSI), kind, digits == null ? 2 : digits);
    }
    if (kind === 'water_depth') return round1(valueSI) + ' mm';
    if (kind === 'area') return round1(valueSI) + ' ha';
    return round1(valueSI) + ' m³';
  }

  /** Zona objetivo NutriPlant: 40–60 % del agua útil (entre PMP y CC). */
  function computeObjectiveZone(cc, pmp) {
    var aw = Math.max(0, Number(cc) - Number(pmp));
    if (aw < 0.05) return null;
    return {
      awPctVol: round1(aw),
      lowPctVol: round1(pmp + 0.4 * aw),
      highPctVol: round1(pmp + 0.6 * aw),
      midPctVol: round1(pmp + 0.5 * aw),
      labelShort: swT('40–60% agua útil', '40–60% available water'),
      labelLong: swT(
        'Zona objetivo de riego: 40–60% del agua útil (entre PMP y CC)',
        'Irrigation target zone: 40–60% of available water (between PWP and FC)'
      )
    };
  }

  function enrichObjectiveMetrics(result, cc, pmp, depth, volSoilM3, rootEff, thetaVal) {
    var zone = computeObjectiveZone(cc, pmp);
    if (!zone) return;
    result.objectiveZone = zone;
    var defObjPct = Math.max(0, zone.highPctVol - thetaVal);
    result.deficitToObjectivePctVol = round1(defObjPct);
    result.lamMmObjective = round1((defObjPct / 100) * depth * 10);
    result.lamM3ObjectiveTot = round0(volSoilM3 * (defObjPct / 100));
    result.lamM3ObjectiveFranja = round0(volSoilM3 * (defObjPct / 100) * (rootEff / 100));
    result.inObjectiveZone =
      thetaVal >= zone.lowPctVol - 0.05 && thetaVal <= zone.highPctVol + 0.05;
    result.aboveObjectiveZone = thetaVal > zone.highPctVol + 0.05;
    result.belowObjectiveZone = thetaVal < zone.lowPctVol - 0.05;
    if (zone.awPctVol > 0.05) {
      result.pctAguaUtil = round1(((thetaVal - pmp) / zone.awPctVol) * 100);
    }
  }

  function computeFromFields(fields) {
    if (!fields || typeof fields !== 'object') return null;
    var cc = Number(fields.cc);
    var pmp = Number(fields.pmp);
    var depth = Number(fields.depth);
    if (!Number.isFinite(depth) || depth <= 0) depth = 30;
    var areaHa = Number(fields.areaHa);
    if (!Number.isFinite(areaHa) || areaHa <= 0) areaHa = 1;
    var rootEff = Number(fields.rootEff);
    if (!Number.isFinite(rootEff) || rootEff <= 0) rootEff = 100;
    if (rootEff > 100) rootEff = 100;

    var thetaRaw = fields.thetaVol;
    var hasTheta = thetaRaw !== '' && thetaRaw != null && !Number.isNaN(parseFloat(thetaRaw));
    var thetaVal = hasTheta ? parseFloat(thetaRaw) : NaN;

    if (!Number.isFinite(cc) || !Number.isFinite(pmp)) return null;

    var effAreaHa = areaHa * (rootEff / 100);
    var volSoilM3 = areaHa * 10000 * (depth / 100);

    var result = {
      updatedAt: new Date().toISOString(),
      source: 'agua_disponible_textura',
      hasTheta: hasTheta,
      cc: cc,
      pmp: pmp,
      depthCm: depth,
      cropAreaHa: areaHa,
      rootEffPct: rootEff,
      effAreaHa: round1(effAreaHa),
      thetaVol: hasTheta ? thetaVal : null,
      irrigationRefM3: null,
      status: 'no_theta'
    };

    if (!hasTheta) {
      result.message =
        'Abre 🪨 Agua en suelo y textura e indica <strong>humedad actual (% vol.)</strong> para calcular m³ hasta CC.';
      return result;
    }

    var deficitPctRaw = cc - thetaVal;
    var deficitToCc = Math.max(0, deficitPctRaw);
    var surplusPct = Math.max(0, thetaVal - cc);
    var lamMmTot = (deficitToCc / 100) * depth * 10;
    var lamM3Tot = volSoilM3 * (deficitToCc / 100);
    var lamM3Franja = lamM3Tot * (rootEff / 100);
    var lamMmFranja = lamMmTot;
    var lamM3SurplusFranja = volSoilM3 * (surplusPct / 100) * (rootEff / 100);

    result.lamMmFranja = round1(lamMmFranja);
    result.lamMmCropRef = areaHa > 0 ? round1(lamM3Franja / (areaHa * 10)) : null;
    enrichObjectiveMetrics(result, cc, pmp, depth, volSoilM3, rootEff, thetaVal);

    if (deficitPctRaw < -0.05) {
      result.status = 'surplus';
      result.surplusPctVol = round1(surplusPct);
      result.lamM3SurplusFranja = round0(lamM3SurplusFranja);
      result.irrigationRefM3 = 0;
      result.message =
        'Humedad <strong>por encima de CC</strong> — exceso en franja ≈ <strong>' +
        result.lamM3SurplusFranja +
        ' m³</strong> (riesgo encharcamiento; no riegues para “llenar” suelo).';
      return result;
    }

    if (deficitToCc <= 0.05) {
      result.status = 'at_cc';
      result.deficitPctVol = 0;
      result.lamM3Franja = 0;
      result.irrigationRefM3 = 0;
      result.message = 'Suelo cerca de <strong>CC</strong> — sin déficit de reposición hasta CC en franja.';
      return result;
    }

    result.status = 'deficit';
    result.deficitPctVol = round1(deficitToCc);
    result.lamM3Franja = round0(lamM3Franja);
    result.irrigationRefM3 = result.lamM3Franja;
    result.message =
      'Déficit hasta CC en franja (<strong>' +
      result.effAreaHa +
      ' ha</strong>): <strong>' +
      result.lamM3Franja +
      ' m³</strong> · ' +
      result.lamMmFranja +
      ' mm en zona humedecida.';
    return result;
  }

  function publish(fields) {
    var data = computeFromFields(fields);
    if (!data) return null;
    try {
      w.localStorage.setItem(BRIDGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* quota / privado */
    }
    return data;
  }

  function read() {
    try {
      var raw = w.localStorage.getItem(BRIDGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function readFromSoilToolPersist() {
    if (!w.NpFreePersist || typeof w.NpFreePersist.load !== 'function') return null;
    var d = w.NpFreePersist.load('agua_disponible_textura');
    if (!d) return null;
    var f = d.fields || d;
    return computeFromFields({
      cc: f.cc,
      pmp: f.pmp,
      depth: f.depth,
      areaHa: f.areaHa,
      rootEff: f.rootEff,
      thetaVol: f.thetaVol
    });
  }

  function refresh() {
    var fromPersist = readFromSoilToolPersist();
    if (fromPersist) {
      try {
        w.localStorage.setItem(BRIDGE_KEY, JSON.stringify(fromPersist));
      } catch (e) {}
      return fromPersist;
    }
    return read();
  }

  function formatUpdatedAt(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(bridgeIsEn() ? 'en-US' : 'es-MX', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      return '';
    }
  }

  /**
   * @param {object|null} data
   * @param {{target?:'objective60'|'cc'}} [opts]
   * @returns {{mode:'deficit'|'surplus'|null,m3:number|null,clearFields?:boolean,message:string}}
   */
  function suggestFromBridge(data, opts) {
    opts = opts || {};
    var target = opts.target === 'cc' ? 'cc' : 'objective60';
    if (!data) {
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message: bridgeLangT(
          'Sin datos de 🪨 Agua en suelo. Calcula CC, PMP y humedad actual allí; luego pulsa <strong>Sugerir</strong>.',
          'No 🪨 Soil water data. Calculate FC, PWP and current moisture there; then press <strong>Suggest</strong>.'
        )
      };
    }
    if (!data.hasTheta) {
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message: data.message || bridgeLangT(
          'Indica <strong>humedad actual (% vol.)</strong> en 🪨 Agua en suelo y textura.',
          'Enter <strong>current moisture (% vol.)</strong> in 🪨 Soil water and texture.'
        )
      };
    }

    var pctAu = data.pctAguaUtil != null ? data.pctAguaUtil : null;
    var pctLabel =
      pctAu != null
        ? ' · <strong>' + pctAu + '% ' + bridgeLangT('agua útil', 'available water') + '</strong> (' + bridgeLangT('entre PMP y CC', 'between PWP and FC') + ')'
        : '';

    if (data.status === 'surplus') {
      var surM3 =
        data.lamM3SurplusFranja != null && data.lamM3SurplusFranja > 0
          ? data.lamM3SurplusFranja
          : null;
      if (surM3 != null) {
        return {
          mode: 'surplus',
          m3: surM3,
          clearFields: false,
          message:
            bridgeLangT('Sugerido <strong>exceso</strong> por encima de CC', 'Suggested <strong>surplus</strong> above FC') +
            pctLabel +
            ': <strong>' +
            bridgeQ(surM3, 'volume', 2) +
            '</strong> ' +
            bridgeLangT('en franja (modo <strong>Exceso (− riego)</strong>). Se resta del total integrado.', 'in strip (mode <strong>Surplus (− irrigation)</strong>). It is subtracted from the integrated total.')
        };
      }
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message:
          bridgeLangT('Humedad <strong>por encima de CC</strong>', 'Moisture <strong>above FC</strong>') +
          pctLabel +
          bridgeLangT(
            '. Exceso muy bajo — revisa θ en 🪨 Agua en suelo o ingresa el volumen manualmente.',
            '. Surplus too small — check θ in 🪨 Soil water or enter volume manually.'
          )
      };
    }

    if (data.status === 'at_cc') {
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message:
          bridgeLangT('Suelo cerca de <strong>CC</strong>', 'Soil near <strong>FC</strong>') +
          pctLabel +
          bridgeLangT(
            '. Sin déficit de almacén — no se rellena volumen. Déjalo vacío o ingresa valor solo si tu criterio lo pide.',
            '. No storage deficit — volume is not filled. Leave empty or enter a value only if your judgment requires it.'
          )
      };
    }

    if (pctAu != null && pctAu >= 59.5) {
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message:
          bridgeLangT('Humedad en', 'Moisture at') +
          ' <strong>' +
          pctAu +
          '% ' +
          bridgeLangT('agua útil', 'available water') +
          '</strong> (≥ 60% ' +
          bridgeLangT('objetivo', 'target') +
          '). ' +
          bridgeLangT(
            'No hace falta reponer almacén desde 🪨 — deja vacío o escribe el volumen manualmente si aun así quieres sumar al total.',
            'No need to refill storage from 🪨 — leave empty or enter volume manually if you still want to add to the total.'
          )
      };
    }

    if (target === 'cc') {
      if (data.lamM3Franja != null && data.lamM3Franja > 0) {
        return {
          mode: 'deficit',
          m3: data.lamM3Franja,
          clearFields: false,
          message:
            bridgeLangT('Sugerido <strong>hasta CC</strong>', 'Suggested <strong>to FC</strong>') +
            ' (' +
            data.cc +
            '% vol.)' +
            pctLabel +
            ': <strong>' +
            bridgeQ(data.lamM3Franja, 'volume', 2) +
            '</strong> · ' +
            (data.lamMmFranja != null ? bridgeQ(data.lamMmFranja, 'water_depth', 2) : '') +
            ' ' +
            bridgeLangT('en franja. Referencia hasta 60% AU:', 'in strip. Reference to 60% AW:') +
            ' <strong>' +
            (data.lamM3ObjectiveFranja != null ? bridgeQ(data.lamM3ObjectiveFranja, 'volume', 2) : '—') +
            '</strong>.'
        };
      }
    } else if (
      data.lamM3ObjectiveFranja != null &&
      data.lamM3ObjectiveFranja > 0 &&
      data.objectiveZone
    ) {
      return {
        mode: 'deficit',
        m3: data.lamM3ObjectiveFranja,
        clearFields: false,
        message:
          bridgeLangT('Sugerido <strong>hasta 60% agua útil</strong>', 'Suggested <strong>to 60% available water</strong>') +
          ' (' +
          data.objectiveZone.highPctVol +
          '% vol.)' +
          pctLabel +
          ': <strong>' +
          bridgeQ(data.lamM3ObjectiveFranja, 'volume', 2) +
          '</strong> · ' +
          (data.lamMmObjective != null ? bridgeQ(data.lamMmObjective, 'water_depth', 2) : '') +
          '. ' +
          bridgeLangT('Hasta CC (máximo):', 'Up to FC (maximum):') +
          ' <strong>' +
          (data.lamM3Franja != null ? bridgeQ(data.lamM3Franja, 'volume', 2) : '—') +
          '</strong>.'
      };
    }

    if (data.status === 'deficit' && data.lamM3Franja != null && data.lamM3Franja > 0) {
      return { mode: 'deficit', m3: data.lamM3Franja, clearFields: false, message: data.message || '' };
    }
    return {
      mode: null,
      m3: null,
      clearFields: true,
      message:
        data.message ||
        bridgeLangT(
          'Sin déficit claro. Ajusta humedad en 🪨 Agua en suelo o ingresa el volumen manualmente.',
          'No clear deficit. Adjust moisture in 🪨 Soil water or enter volume manually.'
        )
    };
  }

  /**
   * Aplica sugerencia al DOM del panel (gratis + PRO).
   * @param {string} prefix ej. irr | climate
   * @param {'objective60'|'cc'} target
   */
  function applySuggestionToDom(prefix, target) {
    var data = refresh();
    var sug = suggestFromBridge(data, { target: target });
    var modeEl = document.getElementById(prefix + '-soil-mode');
    var m3El = document.getElementById(prefix + '-soil-m3');
    var msgEl = document.getElementById(prefix + '-soil-suggest-msg');
    if (sug.clearFields) {
      if (modeEl) modeEl.value = '';
      if (m3El) {
        m3El.value = '';
      }
    } else {
      if (sug.mode && modeEl) modeEl.value = sug.mode;
      if (sug.m3 != null && m3El) {
        if (w.NpWaterClimateUI && typeof w.NpWaterClimateUI.write === 'function') {
          w.NpWaterClimateUI.write(m3El, sug.m3, 'volume');
        } else {
          m3El.value = String(sug.m3);
        }
      }
    }
    if (msgEl) {
      var updated =
        data && data.updatedAt ? ' · ' + formatUpdatedAt(data.updatedAt) : '';
      msgEl.innerHTML =
        (sug.message || '') +
        updated +
        (sug.m3 != null
          ? ' <span style="color:#0369a1;">' +
            bridgeLangT(
              'Se integra al total al cambiar volumen o modo.',
              'It is integrated into the total when volume or mode changes.'
            ) +
            '</span>'
          : '');
    }
    if (data && data.effAreaHa != null && data.status === 'deficit' && sug.m3 != null) {
      var areaEl = document.getElementById(prefix === 'climate' ? 'climate-irr-area' : 'irr-area');
      if (areaEl && (areaEl.value === '' || !Number.isFinite(parseFloat(areaEl.value)))) {
        areaEl.value = String(data.effAreaHa);
      }
      if (prefix === 'climate') {
        var cropAreaEl = document.getElementById('climate-irr-crop-area');
        if (cropAreaEl && data.cropAreaHa != null && cropAreaEl.value === '') {
          cropAreaEl.value = String(data.cropAreaHa);
        }
        var reachEl = document.getElementById('climate-irr-root-reach');
        if (reachEl && data.rootEffPct != null && reachEl.value === '') {
          reachEl.value = String(Math.round(data.rootEffPct));
        }
      } else {
        var cropAreaFree = document.getElementById('irr-crop-area');
        if (cropAreaFree && data.cropAreaHa != null && (cropAreaFree.value === '' || cropAreaFree.value === '1')) {
          cropAreaFree.value = String(data.cropAreaHa);
        }
        var reachFree = document.getElementById('irr-root-reach');
        if (reachFree && data.rootEffPct != null && reachFree.value === '') {
          reachFree.value = String(Math.round(data.rootEffPct));
        }
      }
    }
    return sug;
  }


  function bridgeIsEn() {
    if (w.NpWaterClimateUI && typeof w.NpWaterClimateUI.prefs === 'function') {
      return w.NpWaterClimateUI.prefs().language === 'en';
    }
    try {
      var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
      return !!(p && p.language === 'en');
    } catch (e) {
      return false;
    }
  }

  function bridgeLangT(es, en) {
    if (w.NpWaterClimateUI && typeof w.NpWaterClimateUI.t === 'function') return w.NpWaterClimateUI.t(es, en);
    return bridgeIsEn() ? (en || es) : es;
  }

  function bridgeVolLabel() {
    return w.NpWaterClimateUI ? w.NpWaterClimateUI.unit('volume') : 'm³';
  }

  function bridgeQ(value, kind, digits) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    if (w.NpWaterClimateUI) return w.NpWaterClimateUI.resultFromSI(Number(value), kind, digits == null ? 2 : digits);
    if (kind === 'water_depth') return Number(value).toFixed(1) + ' mm';
    return Number(value).toFixed(1) + ' m³';
  }

  function bridgeInputFromSI(valueSI) {
    if (valueSI == null || !Number.isFinite(Number(valueSI))) return '';
    if (w.NpWaterClimateUI) return w.NpWaterClimateUI.inputFromSI(Number(valueSI), 'volume');
    return String(valueSI);
  }

  function bridgeT(key, fallback) {
    try {
      if (w.NpI18n && typeof w.NpI18n.t === 'function') {
        var translated = w.NpI18n.t(key);
        if (translated !== key) return translated;
      }
    } catch (e) {}
    return fallback;
  }

  function buildSuggestButtonsHtml(prefix) {
    prefix = prefix || 'irr';
    var vu = bridgeVolLabel();
    var t60 = bridgeLangT(
      'Prellena ' + vu + ' hasta 60% agua útil (tope zona objetivo)',
      'Prefills ' + vu + ' up to 60% available water (target zone cap)'
    );
    var tCc = bridgeLangT(
      'Prellena ' + vu + ' hasta capacidad de campo (CC)',
      'Prefills ' + vu + ' up to field capacity (FC)'
    );
    return (
      '<div class="np-soil-bridge-suggest-btns">' +
      '<button type="button" class="np-soil-bridge-suggest-btn" data-soil-prefix="' +
      prefix +
      '" data-soil-target="objective60" title="' +
      t60.replace(/"/g, '&quot;') +
      '">' +
      bridgeLangT('Sugerir hasta 60% AU', 'Suggest to 60% AW') +
      '</button>' +
      '<button type="button" class="np-soil-bridge-suggest-btn np-soil-bridge-suggest-btn--cc" data-soil-prefix="' +
      prefix +
      '" data-soil-target="cc" title="' +
      tCc.replace(/"/g, '&quot;') +
      '">' +
      bridgeLangT('Sugerir hasta CC', 'Suggest to FC') +
      '</button>' +
      '</div>'
    );
  }

  /**
   * Panel editable: el usuario elige déficit/exceso y volumen; el cálculo solo lo usa si hay valor.
   * opts.m3 se interpreta siempre en SI (m³).
   * @param {{idPrefix?:string, mode?:string, m3?:number|string|null}} [opts]
   */
  function buildPanelHtml(opts) {
    opts = opts || {};
    var prefix = opts.idPrefix || 'irr';
    var modeId = prefix + '-soil-mode';
    var m3Id = prefix + '-soil-m3';
    var suggestId = prefix + '-soil-suggest-msg';
    var mode = opts.mode === 'deficit' || opts.mode === 'surplus' ? opts.mode : '';
    var m3SI = opts.m3 != null && opts.m3 !== '' && Number.isFinite(Number(opts.m3)) ? Number(opts.m3) : null;
    var m3Val = m3SI != null ? bridgeInputFromSI(m3SI) : '';
    var vu = bridgeVolLabel();
    var fc = bridgeIsEn() ? 'FC' : 'CC';
    var aw = bridgeIsEn() ? 'AW' : 'AU';

    return (
      '<div class="np-soil-bridge-panel">' +
      '<p class="np-soil-bridge-title">🪨 ' +
      bridgeLangT('Almacén suelo → ajuste manual', 'Soil storage → manual adjustment') +
      ' (' +
      vu +
      ')</p>' +
      '<div class="np-soil-bridge-row">' +
      '<select id="' +
      modeId +
      '" class="np-soil-bridge-mode">' +
      '<option value=""' +
      (mode === '' ? ' selected' : '') +
      '>' +
      bridgeLangT('— Sin ajuste —', '— No adjustment —') +
      '</option>' +
      '<option value="deficit"' +
      (mode === 'deficit' ? ' selected' : '') +
      '>' +
      bridgeLangT('Déficit (+ riego)', 'Deficit (+ irrigation)') +
      '</option>' +
      '<option value="surplus"' +
      (mode === 'surplus' ? ' selected' : '') +
      '>' +
      bridgeLangT('Exceso (− riego)', 'Surplus (− irrigation)') +
      '</option>' +
      '</select>' +
      '<div class="np-irr-value-unit np-soil-bridge-m3">' +
      '<input type="number" id="' +
      m3Id +
      '" min="0" step="0.1" value="' +
      m3Val +
      '" data-np-unit-kind="volume" placeholder="' +
      vu +
      ' ' +
      bridgeLangT('franja', 'strip') +
      '" title="' +
      bridgeLangT('Volumen en la franja regada', 'Volume in the irrigated strip').replace(/"/g, '&quot;') +
      '">' +
      '<span class="np-irr-unit-badge" data-np-unit-label="volume" aria-hidden="true">' +
      vu +
      '</span></div>' +
      '</div>' +
      '<p class="np-soil-bridge-help">' +
      bridgeLangT(
        'Indica con <strong>tu criterio</strong> si el almacén está en déficit o exceso y cuántos <strong>' +
          vu +
          '</strong> (franja regada). Puedes estimarlo en 🪨 <strong>Agua en suelo y textura</strong> según tu nivel objetivo (' +
          fc +
          ', depleción %, etc.). Si dejas vacío, <strong>no se considera</strong> en el riego sugerido.',
        'Enter with <strong>your judgment</strong> whether storage is in deficit or surplus and how many <strong>' +
          vu +
          '</strong> (irrigated strip). You can estimate it in 🪨 <strong>Soil water and texture</strong> by your target level (' +
          fc +
          ', depletion %, etc.). If left empty, it is <strong>not included</strong> in suggested irrigation.'
      ) +
      '</p>' +
      '<p id="' +
      suggestId +
      '" class="np-soil-bridge-suggest"></p>' +
      '</div>'
    );
  }

  /**
   * @deprecated use buildPanelHtml — kept for callers passing bridge data as first arg
   */
  function buildPanelHtmlLegacy(data, opts) {
    return buildPanelHtml(opts || {});
  }

  /**
   * Bloque HTML para reporte PDF del proyecto (lee puente localStorage).
   * @param {(s:string)=>string} [escapeHtmlFn]
   */
  function buildReportHtml(escapeHtmlFn) {
    var data = read();
    if (!data || !data.hasTheta || !data.objectiveZone) return '';
    var esc = escapeHtmlFn || function (s) { return String(s || ''); };
    var z = data.objectiveZone;
    // Recompute labels with current language (PDF may force EN via withLanguage).
    var zLive = computeObjectiveZone(data.cc, data.pmp) || z;
    var statusLine = '';
    if (data.inObjectiveZone) {
      statusLine =
        '<p style="margin:0 0 8px;font-size:13px;color:#6d28d9;"><strong>' +
        swT('Estado:', 'Status:') +
        '</strong> ' +
        swT('humedad dentro de la zona objetivo', 'moisture within the target zone') +
        ' (' +
        zLive.labelShort +
        ').</p>';
    } else if (data.aboveObjectiveZone && data.status !== 'surplus') {
      statusLine =
        '<p style="margin:0 0 8px;font-size:13px;color:#0369a1;"><strong>' +
        swT('Estado:', 'Status:') +
        '</strong> ' +
        swT(
          'por encima de la zona objetivo — riego de reposición puede ser menor que hasta CC.',
          'above the target zone — refill irrigation may be less than up to FC.'
        ) +
        '</p>';
    } else if (data.lamM3ObjectiveFranja > 0) {
      statusLine =
        '<p style="margin:0 0 8px;font-size:13px;color:#6d28d9;"><strong>' +
        swT('Reposición sugerida hasta objetivo:', 'Suggested refill to target:') +
        '</strong> ' +
        swQty(data.lamM3ObjectiveFranja, 'volume', 2) +
        ' · ' +
        (data.lamMmObjective != null ? swQty(data.lamMmObjective, 'water_depth', 2) : '') +
        ' (' +
        swT('franja', 'strip') +
        ' ' +
        (data.effAreaHa != null ? swQty(data.effAreaHa, 'area', 2) : '—') +
        ').</p>';
    }
    return (
      '<div class="report-block" style="border-color:#c4b5fd;background:#faf5ff;">' +
      '<div class="report-block-title">🪨 ' +
      swT(
        'Agua en suelo — referencia almacén (sesión navegador)',
        'Soil water — store reference (browser session)'
      ) +
      '</div>' +
      '<div style="padding:12px 14px;background:#fff;border-radius:8px;border:1px solid #e9d5ff;font-size:13px;line-height:1.5;">' +
      '<p style="margin:0 0 8px;"><strong>' +
      swT('CC:', 'FC:') +
      '</strong> ' +
      esc(String(data.cc)) +
      '% vol. · <strong>' +
      swT('PMP:', 'PWP:') +
      '</strong> ' +
      esc(String(data.pmp)) +
      '% vol. · <strong>' +
      swT('θ actual:', 'Current θ:') +
      '</strong> ' +
      (data.thetaVol != null ? esc(String(data.thetaVol)) + '% vol.' : '—') +
      '</p>' +
      '<p style="margin:0 0 8px;"><strong>' +
      swT('Zona objetivo riego:', 'Irrigation target zone:') +
      '</strong> ' +
      zLive.lowPctVol +
      '–' +
      zLive.highPctVol +
      '% vol. (' +
      zLive.labelShort +
      ' ' +
      swT('entre PMP y CC', 'between PWP and FC') +
      ').</p>' +
      statusLine +
      (data.lamM3Franja != null && data.status === 'deficit'
        ? '<p style="margin:0;font-size:12px;color:#64748b;">' +
          swT('Referencia máxima hasta CC:', 'Maximum reference to FC:') +
          ' <strong>' +
          swQty(data.lamM3Franja, 'volume', 2) +
          '</strong> · ' +
          (data.lamMmFranja != null ? swQty(data.lamMmFranja, 'water_depth', 2) : '') +
          '.</p>'
        : '') +
      '<p style="margin:8px 0 0;font-size:11px;color:#64748b;">' +
      swT(
        'Calculado en 🪨 Agua en suelo y textura. Complementa el balance climático; validar en campo.',
        'Calculated in 🪨 Soil water and texture. Complements the climate balance; validate in the field.'
      ) +
      '</p>' +
      '</div></div>'
    );
  }

  w.NpSoilWaterBridge = {
    BRIDGE_KEY: BRIDGE_KEY,
    computeObjectiveZone: computeObjectiveZone,
    computeFromFields: computeFromFields,
    publish: publish,
    read: read,
    readFromSoilToolPersist: readFromSoilToolPersist,
    refresh: refresh,
    suggestFromBridge: suggestFromBridge,
    applySuggestionToDom: applySuggestionToDom,
    buildSuggestButtonsHtml: buildSuggestButtonsHtml,
    buildPanelHtml: buildPanelHtml,
    buildPanelHtmlLegacy: buildPanelHtmlLegacy,
    buildReportHtml: buildReportHtml,
    formatUpdatedAt: formatUpdatedAt
  };
})(window);
