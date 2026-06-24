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

  /** Zona objetivo NutriPlant: 40–60 % del agua útil (entre PMP y CC). */
  function computeObjectiveZone(cc, pmp) {
    var aw = Math.max(0, Number(cc) - Number(pmp));
    if (aw < 0.05) return null;
    return {
      awPctVol: round1(aw),
      lowPctVol: round1(pmp + 0.4 * aw),
      highPctVol: round1(pmp + 0.6 * aw),
      midPctVol: round1(pmp + 0.5 * aw),
      labelShort: '40–60% agua útil',
      labelLong: 'Zona objetivo de riego: 40–60% del agua útil (entre PMP y CC)'
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
      return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
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
        message:
          'Sin datos de 🪨 Agua en suelo. Calcula CC, PMP y humedad actual allí; luego pulsa <strong>Sugerir</strong>.'
      };
    }
    if (!data.hasTheta) {
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message: data.message || 'Indica <strong>humedad actual (% vol.)</strong> en 🪨 Agua en suelo y textura.'
      };
    }

    var pctAu = data.pctAguaUtil != null ? data.pctAguaUtil : null;
    var pctLabel =
      pctAu != null
        ? ' · <strong>' + pctAu + '% agua útil</strong> (entre PMP y CC)'
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
            'Sugerido <strong>exceso</strong> por encima de CC' +
            pctLabel +
            ': <strong>' +
            surM3 +
            ' m³</strong> en franja (modo <strong>Exceso (− riego)</strong>). Se resta del total integrado.'
        };
      }
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message:
          'Humedad <strong>por encima de CC</strong>' +
          pctLabel +
          '. Exceso muy bajo — revisa θ en 🪨 Agua en suelo o ingresa m³ manualmente.'
      };
    }

    if (data.status === 'at_cc') {
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message:
          'Suelo cerca de <strong>CC</strong>' +
          pctLabel +
          '. Sin déficit de almacén — no se rellena m³. Déjalo vacío o ingresa valor solo si tu criterio lo pide.'
      };
    }

    if (pctAu != null && pctAu >= 59.5) {
      return {
        mode: null,
        m3: null,
        clearFields: true,
        message:
          'Humedad en <strong>' +
          pctAu +
          '% agua útil</strong> (≥ 60% objetivo). No hace falta reponer almacén desde 🪨 — deja vacío o escribe m³ manualmente si aun así quieres sumar al total.'
      };
    }

    if (target === 'cc') {
      if (data.lamM3Franja != null && data.lamM3Franja > 0) {
        return {
          mode: 'deficit',
          m3: data.lamM3Franja,
          clearFields: false,
          message:
            'Sugerido <strong>hasta CC</strong> (' +
            data.cc +
            '% vol.)' +
            pctLabel +
            ': <strong>' +
            data.lamM3Franja +
            ' m³</strong> · ' +
            (data.lamMmFranja != null ? data.lamMmFranja + ' mm' : '') +
            ' en franja. Referencia hasta 60% AU: <strong>' +
            (data.lamM3ObjectiveFranja != null ? data.lamM3ObjectiveFranja : '—') +
            ' m³</strong>.'
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
          'Sugerido <strong>hasta 60% agua útil</strong> (' +
          data.objectiveZone.highPctVol +
          '% vol.)' +
          pctLabel +
          ': <strong>' +
          data.lamM3ObjectiveFranja +
          ' m³</strong> · ' +
          (data.lamMmObjective != null ? data.lamMmObjective + ' mm' : '') +
          '. Hasta CC (máximo): <strong>' +
          (data.lamM3Franja != null ? data.lamM3Franja : '—') +
          ' m³</strong>.'
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
        'Sin déficit claro. Ajusta humedad en 🪨 Agua en suelo o ingresa m³ manualmente.'
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
      if (m3El) m3El.value = '';
    } else {
      if (sug.mode && modeEl) modeEl.value = sug.mode;
      if (sug.m3 != null && m3El) m3El.value = String(sug.m3);
    }
    if (msgEl) {
      var updated =
        data && data.updatedAt ? ' · ' + formatUpdatedAt(data.updatedAt) : '';
      msgEl.innerHTML =
        (sug.message || '') +
        updated +
        (sug.m3 != null
          ? ' <span style="color:#0369a1;">Se integra al total al cambiar m³ o modo.</span>'
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

  function buildSuggestButtonsHtml(prefix) {
    prefix = prefix || 'irr';
    return (
      '<div class="np-soil-bridge-suggest-btns">' +
      '<button type="button" class="np-soil-bridge-suggest-btn" data-soil-prefix="' +
      prefix +
      '" data-soil-target="objective60" title="Prellena m³ hasta 60% agua útil (tope zona objetivo)">Sugerir hasta 60% AU</button>' +
      '<button type="button" class="np-soil-bridge-suggest-btn np-soil-bridge-suggest-btn--cc" data-soil-prefix="' +
      prefix +
      '" data-soil-target="cc" title="Prellena m³ hasta capacidad de campo (CC)">Sugerir hasta CC</button>' +
      '</div>'
    );
  }

  /**
   * Panel editable: el usuario elige déficit/exceso y m³; el cálculo solo lo usa si hay valor.
   * @param {{idPrefix?:string, mode?:string, m3?:number|string|null}} [opts]
   */
  function buildPanelHtml(opts) {
    opts = opts || {};
    var prefix = opts.idPrefix || 'irr';
    var modeId = prefix + '-soil-mode';
    var m3Id = prefix + '-soil-m3';
    var suggestId = prefix + '-soil-suggest-msg';
    var mode = opts.mode === 'deficit' || opts.mode === 'surplus' ? opts.mode : '';
    var m3Val = opts.m3 != null && opts.m3 !== '' ? String(opts.m3) : '';

    return (
      '<div class="np-soil-bridge-panel">' +
      '<p class="np-soil-bridge-title">🪨 Almacén suelo → ajuste manual (m³)</p>' +
      '<div class="np-soil-bridge-row">' +
      '<select id="' +
      modeId +
      '" class="np-soil-bridge-mode">' +
      '<option value=""' +
      (mode === '' ? ' selected' : '') +
      '>— Sin ajuste —</option>' +
      '<option value="deficit"' +
      (mode === 'deficit' ? ' selected' : '') +
      '>Déficit (+ riego)</option>' +
      '<option value="surplus"' +
      (mode === 'surplus' ? ' selected' : '') +
      '>Exceso (− riego)</option>' +
      '</select>' +
      '<div class="np-irr-value-unit np-soil-bridge-m3">' +
      '<input type="number" id="' +
      m3Id +
      '" min="0" step="0.1" value="' +
      m3Val +
      '" placeholder="m³ franja" title="Volumen en m³ en la franja regada">' +
      '<span class="np-irr-unit-badge" aria-hidden="true">m³</span></div>' +
      '</div>' +
      '<p class="np-soil-bridge-help">Indica con <strong>tu criterio</strong> si el almacén está en déficit o exceso y cuántos m³ (franja regada). Puedes estimarlo en 🪨 <strong>Agua en suelo y textura</strong> según tu nivel objetivo (CC, depleción %, etc.). Si dejas vacío, <strong>no se considera</strong> en el riego sugerido.</p>' +
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
    var statusLine = '';
    if (data.inObjectiveZone) {
      statusLine =
        '<p style="margin:0 0 8px;font-size:13px;color:#6d28d9;"><strong>Estado:</strong> humedad dentro de la zona objetivo (' +
        z.labelShort +
        ').</p>';
    } else if (data.aboveObjectiveZone && data.status !== 'surplus') {
      statusLine =
        '<p style="margin:0 0 8px;font-size:13px;color:#0369a1;"><strong>Estado:</strong> por encima de la zona objetivo — riego de reposición puede ser menor que hasta CC.</p>';
    } else if (data.lamM3ObjectiveFranja > 0) {
      statusLine =
        '<p style="margin:0 0 8px;font-size:13px;color:#6d28d9;"><strong>Reposición sugerida hasta objetivo:</strong> ' +
        data.lamM3ObjectiveFranja +
        ' m³ · ' +
        (data.lamMmObjective != null ? data.lamMmObjective + ' mm' : '') +
        ' (franja ' +
        (data.effAreaHa != null ? data.effAreaHa : '—') +
        ' ha).</p>';
    }
    return (
      '<div class="report-block" style="border-color:#c4b5fd;background:#faf5ff;">' +
      '<div class="report-block-title">🪨 Agua en suelo — referencia almacén (sesión navegador)</div>' +
      '<div style="padding:12px 14px;background:#fff;border-radius:8px;border:1px solid #e9d5ff;font-size:13px;line-height:1.5;">' +
      '<p style="margin:0 0 8px;"><strong>CC:</strong> ' +
      esc(String(data.cc)) +
      '% vol. · <strong>PMP:</strong> ' +
      esc(String(data.pmp)) +
      '% vol. · <strong>θ actual:</strong> ' +
      (data.thetaVol != null ? esc(String(data.thetaVol)) + '% vol.' : '—') +
      '</p>' +
      '<p style="margin:0 0 8px;"><strong>Zona objetivo riego:</strong> ' +
      z.lowPctVol +
      '–' +
      z.highPctVol +
      '% vol. (' +
      z.labelShort +
      ' entre PMP y CC).</p>' +
      statusLine +
      (data.lamM3Franja != null && data.status === 'deficit'
        ? '<p style="margin:0;font-size:12px;color:#64748b;">Referencia máxima hasta CC: <strong>' +
          data.lamM3Franja +
          ' m³</strong> · ' +
          (data.lamMmFranja != null ? data.lamMmFranja + ' mm' : '') +
          '.</p>'
        : '') +
      '<p style="margin:8px 0 0;font-size:11px;color:#64748b;">Calculado en 🪨 Agua en suelo y textura. Complementa el balance climático; validar en campo.</p>' +
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
