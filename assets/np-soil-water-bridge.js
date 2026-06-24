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
   * @param {{idPrefix?:string, compact?:boolean}} [opts]
   */
  function buildPanelHtml(data, opts) {
    opts = opts || {};
    var prefix = opts.idPrefix || 'irr';
    var valId = prefix + '-soil-ref-m3';
    var hintId = prefix + '-soil-bridge-hint';

    if (!data) {
      return (
        '<div class="np-soil-bridge-panel np-soil-bridge-panel--empty">' +
        '<p id="' +
        hintId +
        '" style="margin:0;font-size:12px;line-height:1.45;color:#64748b;">Sin datos de 🪨 Agua en suelo. Calcula CC, PMP y humedad actual allí; luego pulsa <strong>Actualizar</strong>.</p>' +
        '</div>'
      );
    }

    var accent =
      data.status === 'surplus' ? '#b45309' : data.status === 'deficit' ? '#0369a1' : '#64748b';
    var bg =
      data.status === 'surplus'
        ? '#fffbeb'
        : data.status === 'deficit'
          ? '#f0f9ff'
          : '#f8fafc';
    var border =
      data.status === 'surplus' ? '#fcd34d' : data.status === 'deficit' ? '#7dd3fc' : '#e2e8f0';
    var m3Display =
      data.status === 'surplus'
        ? data.lamM3SurplusFranja != null
          ? String(data.lamM3SurplusFranja)
          : '0'
        : data.lamM3Franja != null
          ? String(data.lamM3Franja)
          : data.irrigationRefM3 != null
            ? String(data.irrigationRefM3)
            : '';

    var updated = formatUpdatedAt(data.updatedAt);
    var meta = updated ? ' · actualizado ' + updated : '';

    return (
      '<div class="np-soil-bridge-panel" style="background:' +
      bg +
      ';border:1px solid ' +
      border +
      ';border-radius:10px;padding:12px;">' +
      '<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:' +
      accent +
      ';">🪨 Almacén suelo → referencia m³</p>' +
      '<div class="np-soil-bridge-row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">' +
      '<div class="np-irr-value-unit" style="max-width:200px;">' +
      '<input type="number" id="' +
      valId +
      '" min="0" step="0.1" readonly tabindex="-1" aria-readonly="true" value="' +
      (m3Display !== '' ? m3Display : '') +
      '" placeholder="—" title="Referencia desde Agua en suelo (solo lectura)" style="background:#fff;color:#0f172a;font-weight:700;">' +
      '<span class="np-irr-unit-badge" aria-hidden="true">m³</span></div>' +
      (data.status === 'deficit' && data.lamMmFranja != null
        ? '<span style="font-size:12px;color:#0369a1;font-weight:600;">≈ ' + data.lamMmFranja + ' mm en franja</span>'
        : '') +
      '</div>' +
      '<p id="' +
      hintId +
      '" style="margin:0;font-size:12px;line-height:1.45;color:#334155;">' +
      data.message +
      meta +
      '<br><span style="color:#64748b;">Calculado en 🪨 <strong>Agua en suelo y textura</strong> (misma sesión del navegador). Complementa el balance climático; no es el «riego ya aplicado» del periodo.</span></p>' +
      '</div>'
    );
  }

  w.NpSoilWaterBridge = {
    BRIDGE_KEY: BRIDGE_KEY,
    computeFromFields: computeFromFields,
    publish: publish,
    read: read,
    readFromSoilToolPersist: readFromSoilToolPersist,
    refresh: refresh,
    buildPanelHtml: buildPanelHtml,
    formatUpdatedAt: formatUpdatedAt
  };
})(window);
