/**
 * NutriPlant — núcleo compartido: balance hídrico / lámina de riego (dashboard + herramienta gratis).
 */
(function (w) {
  'use strict';

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function fmtMm(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return round1(v).toFixed(1);
  }

  /** Positivo = falta agua; negativo = superávit (lluvia > demanda). */
  function waterGapKind(mmVal) {
    if (mmVal == null || !Number.isFinite(Number(mmVal))) return 'neutral';
    if (mmVal > 0) return 'deficit';
    if (mmVal < 0) return 'surplus';
    return 'equilibrio';
  }

  function fmtWaterGapMm(mmVal) {
    if (mmVal == null || !Number.isFinite(Number(mmVal))) return '—';
    var n = round1(mmVal);
    if (n === 0) return '0 mm';
    var abs = fmtMm(Math.abs(n));
    return n > 0 ? abs + ' mm' : abs + ' mm superávit';
  }

  function fmtWaterGapVolSuffix(vol, mmVal) {
    if (!vol) return { volText: '', totalText: '' };
    var perHa = vol.perHa != null ? Math.abs(vol.perHa) : null;
    var total = vol.total != null ? Math.abs(vol.total) : null;
    var tag = waterGapKind(mmVal) === 'surplus' ? ' superávit' : '';
    return {
      volText: perHa != null ? ' → ' + perHa + ' m³/ha cultivo' + tag : '',
      totalText: total != null ? ' (' + total + ' m³ total' + tag + ')' : ''
    };
  }

  function balanceRowLabel(deficitLabel, surplusLabel, mmVal) {
    var kind = waterGapKind(mmVal);
    if (kind === 'surplus') return surplusLabel;
    return deficitLabel;
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function addDaysIso(isoDate, days) {
    var parts = String(isoDate || '').split('-').map(function (p) { return parseInt(p, 10); });
    if (parts.length !== 3) return isoDate;
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + days);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }

  function computeRollingWindows(daily) {
    var times = (daily && daily.time) || [];
    var rain = (daily && daily.precipitation_sum) || [];
    var et0 = (daily && daily.et0_fao_evapotranspiration) || [];
    function sumLast(n, values) {
      var start = Math.max(0, values.length - n);
      var s = 0;
      var has = false;
      for (var i = start; i < values.length; i++) {
        var v = Number(values[i]);
        if (Number.isFinite(v)) { s += v; has = true; }
      }
      return has ? round1(s) : null;
    }
    function lastVal(values) {
      if (!values.length) return null;
      var v = Number(values[values.length - 1]);
      return Number.isFinite(v) ? round1(v) : null;
    }
    return {
      fetchedAt: new Date().toISOString(),
      dateEnd: times.length ? String(times[times.length - 1]) : todayIso(),
      et0Today: lastVal(et0),
      rainToday: lastVal(rain),
      et0_1d: sumLast(1, et0),
      rain_1d: sumLast(1, rain),
      et0_7d: sumLast(7, et0),
      rain_7d: sumLast(7, rain),
      et0_30d: sumLast(30, et0),
      rain_30d: sumLast(30, rain)
    };
  }

  function getRollingForPeriod(rolling, periodDays) {
    if (!rolling || typeof rolling !== 'object') return { et0: null, rain: null };
    if (periodDays === 1) {
      return {
        et0: rolling.et0_1d != null ? rolling.et0_1d : rolling.et0Today,
        rain: rolling.rain_1d != null ? rolling.rain_1d : rolling.rainToday
      };
    }
    if (periodDays === 30) return { et0: rolling.et0_30d, rain: rolling.rain_30d };
    return { et0: rolling.et0_7d, rain: rolling.rain_7d };
  }

  function resolveAreaContext(state) {
    var cropHa =
      state.cropAreaHa != null && Number.isFinite(Number(state.cropAreaHa)) && Number(state.cropAreaHa) > 0
        ? Number(state.cropAreaHa)
        : 1;
    var irrigatedHa =
      state.irrigatedAreaHa != null && Number.isFinite(Number(state.irrigatedAreaHa)) && Number(state.irrigatedAreaHa) > 0
        ? Number(state.irrigatedAreaHa)
        : cropHa;
    var hasSplit = Math.abs(cropHa - irrigatedHa) > 0.001;
    return {
      cropHa: round2(cropHa),
      irrigatedHa: round2(irrigatedHa),
      hasSplit: hasSplit,
      stripFactor: hasSplit && irrigatedHa > 0 ? cropHa / irrigatedHa : null
    };
  }

  function normalizeRootReachPct(v) {
    var n = Number(v);
    if (!Number.isFinite(n) || n < 10) return null;
    return Math.min(100, n);
  }

  function suggestedIrrigatedHaFromReach(cropHa, reachPct) {
    if (reachPct == null || cropHa == null) return null;
    return round2(cropHa * (reachPct / 100));
  }

  /** Texto del recuadro «Criterio NutriPlant» (contenedor externo en cada UI). */
  function buildAreaCriterionNoteHtml(state, opts) {
    opts = opts || {};
    var areas = resolveAreaContext(state);
    var reachPct = normalizeRootReachPct(state && state.rootReachPct);
    var suggestedHa = reachPct != null ? suggestedIrrigatedHaFromReach(areas.cropHa, reachPct) : null;
    var parts = [];
    parts.push(
      '<strong>Criterio NutriPlant:</strong> el <strong>% raíces en superficie</strong> indica qué parte del <strong>área del cultivo</strong> tiene exploración radical activa (goteo, surco, franja).'
    );
    parts.push(
      'En <strong>riego localizado</strong>, ese % suele ser la <strong>superficie regada</strong> (franja ≈ ha cultivo × % ÷ 100). El déficit del cultivo se expresa en <strong>m³ totales</strong>; en la franja esos m³ se aplican con <strong>más mm</strong> en menos hectáreas — ver recuadro destacado abajo.'
    );
    if (reachPct != null && areas.cropHa != null && suggestedHa != null) {
      parts.push(
        'Con <strong>' +
        reachPct +
        '%</strong> y <strong>' +
        fmtMm(areas.cropHa) +
        ' ha</strong> cultivo → franja sugerida: <strong>' +
        fmtMm(suggestedHa) +
        ' ha</strong>.'
      );
    }
    if (opts.soilReachPct != null && reachPct == null) {
      parts.push('Análisis de suelo del proyecto: <strong>' + opts.soilReachPct + '%</strong> (puedes usarlo abajo).');
    }
    return parts.join(' ');
  }

  function irrigationMmFromInput(value, unit, areaHa) {
    var v = Number(value);
    if (!Number.isFinite(v) || v < 0) return null;
    if (unit === 'm3') {
      if (!Number.isFinite(areaHa) || areaHa <= 0) return null;
      return round1(v / (areaHa * 10));
    }
    return round1(v);
  }

  /** Convierte riego guardado (legacy mm) a m³ para la UI m³-only. */
  function migrateIrrigationValueToM3(value, unit, irrigatedHa, cropHa) {
    var v = Number(value);
    if (!Number.isFinite(v) || v < 0) return null;
    if (unit === 'm3') return round1(v);
    var iHa =
      irrigatedHa != null && Number.isFinite(Number(irrigatedHa)) && Number(irrigatedHa) > 0
        ? Number(irrigatedHa)
        : cropHa != null && Number.isFinite(Number(cropHa)) && Number(cropHa) > 0
          ? Number(cropHa)
          : 1;
    var vol = mmToVolTotal(v, iHa);
    return vol != null ? vol : round1(v);
  }

  /** Fuerza unit m³ y convierte valores legacy guardados en mm. */
  function normalizeIrrigationInputM3Only(state) {
    if (!state) return state;
    if (state.irrigationValue == null || !Number.isFinite(Number(state.irrigationValue))) {
      state.irrigationUnit = 'm3';
      return state;
    }
    var areas = resolveAreaContext(state);
    state.irrigationValue = migrateIrrigationValueToM3(
      state.irrigationValue,
      state.irrigationUnit,
      areas.irrigatedHa,
      areas.cropHa
    );
    state.irrigationUnit = 'm3';
    return state;
  }

  /** m³ totales: mm × ha × 10 (1 mm sobre 1 ha = 10 m³). */
  function mmToVolTotal(mm, ha) {
    if (mm == null || !Number.isFinite(Number(mm)) || !Number.isFinite(ha) || ha <= 0) return null;
    return round1(Number(mm) * 10 * ha);
  }

  function volTotalToCropRefMm(volTotal, cropHa) {
    if (volTotal == null || !Number.isFinite(Number(volTotal)) || !Number.isFinite(cropHa) || cropHa <= 0) {
      return null;
    }
    return round1(Number(volTotal) / (cropHa * 10));
  }

  /**
   * Balance en mm de referencia cultivo: déficit (m³ cultivo) − riego (m³ en franja regada).
   * El riego siempre se interpreta en la franja humedecida; el déficit ETc−lluvia es sobre el cultivo.
   */
  function computeBalanceMm(deficitCropMm, irrStripMm, cropHa, irrigatedHa) {
    if (deficitCropMm == null || !Number.isFinite(Number(deficitCropMm))) return null;
    var irr = irrStripMm != null && Number.isFinite(Number(irrStripMm)) ? Number(irrStripMm) : 0;
    var cHa = cropHa != null && Number.isFinite(cropHa) && cropHa > 0 ? cropHa : 1;
    var iHa =
      irrigatedHa != null && Number.isFinite(irrigatedHa) && irrigatedHa > 0 ? irrigatedHa : cHa;
    var deficitVol = mmToVolTotal(deficitCropMm, cHa);
    var irrVol = mmToVolTotal(irr, iHa);
    if (deficitVol == null || irrVol == null) return null;
    return volTotalToCropRefMm(deficitVol - irrVol, cHa);
  }

  function computeResults(state, rolling) {
    var period = state.periodDays === 1 || state.periodDays === 30 ? state.periodDays : 7;
    var sat = getRollingForPeriod(rolling, period);
    var et0 = null;
    var rain = null;
    var et0Source = null;
    var rainSource = null;
    if (state.useManualEt0 && state.manualEt0 != null && Number.isFinite(Number(state.manualEt0))) {
      et0 = round1(Number(state.manualEt0));
      et0Source = 'campo';
    } else if (sat.et0 != null) {
      et0 = sat.et0;
      et0Source = 'satélite';
    }
    if (state.macroTunnelNoRain) {
      rain = 0;
      rainSource = 'macrotúnel';
    } else if (state.useManualRain && state.manualRain != null && Number.isFinite(Number(state.manualRain))) {
      rain = round1(Number(state.manualRain));
      rainSource = 'campo';
    } else if (sat.rain != null) {
      rain = sat.rain;
      rainSource = 'satélite';
    }
    var kc = state.kc != null && Number.isFinite(Number(state.kc)) ? Number(state.kc) : null;
    var areas = resolveAreaContext(state);
    var cropHa = areas.cropHa;
    var irrigatedHa = areas.irrigatedHa;
    var irrMm = irrigationMmFromInput(state.irrigationValue, state.irrigationUnit || 'mm', irrigatedHa);
    var etc = et0 != null && kc != null ? round1(et0 * kc) : null;
    var deficitClimate = et0 != null && rain != null ? round1(et0 - rain) : null;
    var deficitCrop = etc != null && rain != null ? round1(etc - rain) : null;
    var balance = deficitCrop != null ? computeBalanceMm(deficitCrop, irrMm, cropHa, irrigatedHa) : null;
    function volMm(mmVal) {
      if (mmVal == null || !Number.isFinite(mmVal) || cropHa == null) {
        return { perHa: null, total: null, wettedMm: null };
      }
      var perHa = round1(mmVal * 10);
      var total = round1(perHa * cropHa);
      var wettedMm =
        areas.stripFactor != null && Number.isFinite(areas.stripFactor) ? round1(mmVal * areas.stripFactor) : null;
      return { perHa: perHa, total: total, wettedMm: wettedMm };
    }
    return enrichWithSoilStorage(
      {
        periodDays: period,
        et0: et0,
        rain: rain,
        et0Source: et0Source,
        rainSource: rainSource,
        kc: kc,
        etc: etc,
        deficitClimate: deficitClimate,
        deficitCrop: deficitCrop,
        irrigationMm: irrMm,
        balance: balance,
        cropHa: cropHa,
        irrigatedHa: irrigatedHa,
        hasSplitArea: areas.hasSplit,
        stripFactor: areas.stripFactor,
        deficitClimateVol: volMm(deficitClimate),
        deficitCropVol: volMm(deficitCrop),
        balanceVol: volMm(balance)
      },
      state
    );
  }

  function parseSoilStorageAdjustment(state) {
    var mode = state && state.soilStorageMode;
    var m3 = Number(state && state.soilStorageM3);
    if (mode !== 'deficit' && mode !== 'surplus') {
      return { mode: null, m3: null, deltaM3: 0 };
    }
    if (!Number.isFinite(m3) || m3 <= 0) {
      return { mode: null, m3: null, deltaM3: 0 };
    }
    m3 = round1(m3);
    return { mode: mode, m3: m3, deltaM3: mode === 'deficit' ? m3 : round1(-m3) };
  }

  function volObjFromTotalM3(totalM3, cropHa, stripFactor) {
    if (!Number.isFinite(totalM3) || !Number.isFinite(cropHa) || cropHa <= 0) return null;
    var mmCrop = totalM3 / (cropHa * 10);
    var wettedMm =
      stripFactor != null && Number.isFinite(stripFactor) ? round1(mmCrop * stripFactor) : round1(mmCrop);
    return { perHa: round1(totalM3 / cropHa), total: round1(totalM3), wettedMm: wettedMm };
  }

  function pickClimateTargetVol(res) {
    if (
      res.balance != null &&
      res.balanceVol &&
      res.balanceVol.total != null &&
      res.irrigationMm != null &&
      res.irrigationMm > 0
    ) {
      return { vol: res.balanceVol, mm: res.balance };
    }
    if (res.deficitCrop != null && res.deficitCropVol) {
      return { vol: res.deficitCropVol, mm: res.deficitCrop };
    }
    return { vol: null, mm: null };
  }

  function enrichWithSoilStorage(res, state) {
    var adj = parseSoilStorageAdjustment(state);
    res.soilStorage = adj;
    var base = pickClimateTargetVol(res);
    if (!adj.deltaM3 || !base.vol || base.vol.total == null) {
      res.fieldTargetVol = base.vol;
      res.fieldTargetMm = base.mm;
      return res;
    }
    var adjustedM3 = round1(Number(base.vol.total) + adj.deltaM3);
    res.fieldTargetVol = volObjFromTotalM3(adjustedM3, res.cropHa, res.stripFactor);
    res.fieldTargetMm = volTotalToCropRefMm(adjustedM3, res.cropHa);
    return res;
  }

  function sourceBadge(source) {
    if (!source) return '';
    var colors = { 'satélite': '#0369a1', campo: '#0f766e', macrotúnel: '#7c3aed' };
    var bg = { 'satélite': '#e0f2fe', campo: '#d1fae5', macrotúnel: '#ede9fe' };
    return (
      ' <span style="font-size:11px;font-weight:600;color:' +
      (colors[source] || '#64748b') +
      ';background:' +
      (bg[source] || '#f1f5f9') +
      ';padding:2px 6px;border-radius:4px;">' +
      source +
      '</span>'
    );
  }

  async function fetchRollingOpenMeteo(lat, lng) {
    var today = todayIso();
    var start = addDaysIso(today, -29);
    var url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      encodeURIComponent(lat) +
      '&longitude=' +
      encodeURIComponent(lng) +
      '&start_date=' +
      encodeURIComponent(start) +
      '&end_date=' +
      encodeURIComponent(today) +
      '&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=auto';
    var res = await fetch(url);
    var data = await res.json().catch(function () { return null; });
    if (!res.ok || !data || !data.daily) {
      throw new Error((data && (data.reason || data.error)) || 'Open-Meteo sin datos');
    }
    return computeRollingWindows(data.daily);
  }

  function buildSuggestedCompositionNoteHtml(res) {
    if (res.deficitCrop == null || !res.deficitCropVol || res.deficitCropVol.total == null) return '';
    var hasIrr = res.irrigationMm != null && res.irrigationMm > 0;
    var hasSoilAdj = !!(res.soilStorage && res.soilStorage.deltaM3);
    var deficitM3 = Math.abs(res.deficitCropVol.total);
    var irrM3 =
      hasIrr && res.irrigatedHa != null
        ? mmToVolTotal(res.irrigationMm, res.irrigatedHa)
        : null;
    if (irrM3 != null) irrM3 = Math.abs(irrM3);
    var balanceM3 =
      res.balanceVol && res.balanceVol.total != null ? res.balanceVol.total : null;
    var targetVol = res.fieldTargetVol || (hasIrr && balanceM3 != null ? res.balanceVol : res.deficitCropVol);
    var targetM3 = targetVol && targetVol.total != null ? targetVol.total : null;
    var targetMm =
      res.fieldTargetMm != null
        ? res.fieldTargetMm
        : hasIrr && res.balance != null
          ? res.balance
          : res.deficitCrop;
    var isDeficit = targetMm != null ? targetMm > 0 : deficitM3 > 0;
    var accent = isDeficit ? '#0369a1' : '#0f766e';
    var border = isDeficit ? '#bae6fd' : '#a7f3d0';
    var bg = isDeficit ? 'rgba(255,255,255,0.72)' : 'rgba(236,253,245,0.85)';
    var formula = '';

    if (hasSoilAdj && targetM3 != null) {
      var climateM3 =
        hasIrr && balanceM3 != null ? Math.abs(balanceM3) : deficitM3;
      var adjSign = res.soilStorage.mode === 'deficit' ? '+' : '−';
      formula =
        (hasIrr
          ? 'balance climático (ETc − lluvia − riego aplicado) <strong>' +
            climateM3 +
            ' m³</strong>'
          : 'déficit cultivo (ETc − lluvia) <strong>' + climateM3 + ' m³</strong>') +
        ' ' +
        adjSign +
        ' ajuste almacén suelo <strong>' +
        res.soilStorage.m3 +
        ' m³</strong> = <strong>' +
        Math.abs(targetM3) +
        ' m³</strong> ' +
        (isDeficit ? 'integrados' : 'integrados (superávit)');
    } else if (hasIrr && balanceM3 != null) {
      formula =
        'déficit cultivo (ETc − lluvia) <strong>' +
        deficitM3 +
        ' m³</strong> − riego ya aplicado en franja <strong>' +
        round1(irrM3) +
        ' m³</strong> = <strong>' +
        Math.abs(balanceM3) +
        ' m³</strong> ' +
        (isDeficit ? 'pendientes' : 'de superávit');
    } else {
      formula =
        'déficit cultivo (ETc − lluvia) <strong>' +
        deficitM3 +
        ' m³</strong>' +
        (isDeficit
          ? ' — aún no descontaste riego aplicado en el periodo'
          : ' — superávit hídrico (lluvia cubrió la demanda ETc)');
    }

    return (
      '<div style="margin:12px 0 0;padding:12px 14px;background:' +
      bg +
      ';border:1px dashed ' +
      border +
      ';border-radius:10px;font-size:12px;line-height:1.55;color:#334155;">' +
      '<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:' +
      accent +
      ';">Qué contempla el riego sugerido</p>' +
      '<p style="margin:0 0 6px;">' +
      formula +
      '.</p>' +
      '<p style="margin:0;font-size:11px;color:#64748b;">El m³ sugerido es el <strong>resultado</strong> del balance (tabla arriba); <strong>no</strong> es lo que ya ingresaste en «Riego aplicado» ni se descuenta dos veces. El ajuste 🪨 almacén suelo solo entra si lo indicas manualmente arriba.</p>' +
      '</div>'
    );
  }

  function buildStripActionBoxHtml(res) {
    if (!res.hasSplitArea || res.irrigatedHa == null) return '';
    var targetVol =
      res.fieldTargetVol ||
      (res.balanceVol && res.balanceVol.total != null ? res.balanceVol : res.deficitCropVol);
    var targetMm = targetVol && targetVol.wettedMm != null ? targetVol.wettedMm : res.fieldTargetMm;
    var hasSoilAdj = !!(res.soilStorage && res.soilStorage.deltaM3);
    var climateBase =
      res.balance != null && res.irrigationMm != null && res.irrigationMm > 0 ? 'balance' : 'deficit';
    var targetLabel =
      climateBase === 'balance'
        ? balanceRowLabel('Balance integrado en franja', 'Superávit integrado en franja', targetMm)
        : balanceRowLabel('Déficit integrado por cubrir', 'Superávit integrado en franja', targetMm);
    if (!hasSoilAdj) {
      targetLabel =
        climateBase === 'balance'
          ? balanceRowLabel('Balance por cubrir en riego', 'Superávit hídrico en franja', targetMm)
          : balanceRowLabel('Déficit del cultivo por cubrir', 'Superávit en franja', targetMm);
    }
    if (targetMm == null) return '';
    var mmAbs = Math.abs(targetMm);
    var m3Abs = targetVol && targetVol.total != null ? Math.abs(targetVol.total) : round1(mmAbs * 10 * res.irrigatedHa);
    var cropRefMm = res.balance != null ? res.balance : res.deficitCrop;
    /* Positivo = ETc > lluvia (falta agua); negativo = superávit hídrico */
    var isDeficit = targetMm > 0;
    var accent = isDeficit ? '#0369a1' : '#0f766e';
    var bg = isDeficit ? 'linear-gradient(135deg,#eff6ff 0%,#e0f2fe 100%)' : 'linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)';
    var border = isDeficit ? '#7dd3fc' : '#6ee7b7';
    var actionVerb = isDeficit ? 'Aplicar en franja regada' : 'Superávit hídrico en franja';
    var coverWhat =
      res.balance != null && res.irrigationMm != null && res.irrigationMm > 0
        ? 'el balance pendiente'
        : 'el déficit';
    var soilAdjNote = '';
    if (hasSoilAdj) {
      soilAdjNote =
        ' · ajuste almacén suelo <strong>' +
        (res.soilStorage.mode === 'deficit' ? '+' : '−') +
        res.soilStorage.m3 +
        ' m³</strong>';
    }
    var periodText = res.periodDays === 1 ? 'del día' : 'del periodo de ' + res.periodDays + ' días';
    var suggestedLine = isDeficit
      ? 'Riego sugerido: <strong style="color:' +
        accent +
        ';font-size:18px;">' +
        m3Abs +
        ' m³</strong> para cubrir ' +
        coverWhat +
        ' ' +
        periodText +
        soilAdjNote
      : 'No requiere riego de reposición — superávit de <strong style="color:' +
        accent +
        ';">' +
        m3Abs +
        ' m³</strong> ' +
        periodText;
    return (
      '<div style="margin:16px 0 4px 0;padding:18px 20px;border:2px solid ' +
      border +
      ';border-radius:12px;background:' +
      bg +
      ';box-shadow:0 2px 8px rgba(3,105,161,0.08);">' +
      '<p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' +
      accent +
      ';">📍 Dato importante — riego en campo</p>' +
      '<p style="margin:0 0 14px 0;padding:12px 14px;background:rgba(255,255,255,0.92);border-radius:10px;border-left:4px solid ' +
      accent +
      ';font-size:16px;font-weight:800;color:#0f172a;line-height:1.45;">' +
      suggestedLine +
      '</p>' +
      '<p style="margin:0 0 14px 0;font-size:13px;line-height:1.5;color:#334155;">El cultivo (<strong>' +
      fmtMm(res.cropHa) +
      ' ha</strong>) tiene un ' +
      (isDeficit ? 'déficit' : 'superávit') +
      ' de referencia; en la <strong>franja regada (' +
      fmtMm(res.irrigatedHa) +
      ' ha)</strong> ese volumen se concentra en <strong>más mm</strong>, no en menos m³.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
      '<div style="background:rgba(255,255,255,0.75);border-radius:10px;padding:12px 14px;text-align:center;">' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:4px;">Lámina en franja (' +
      targetLabel.toLowerCase() +
      ')</div>' +
      '<div style="font-size:28px;font-weight:800;color:' +
      accent +
      ';line-height:1.1;">' +
      fmtMm(mmAbs) +
      (isDeficit ? '' : ' <span style="font-size:14px;font-weight:700;">superávit</span>') +
      ' <span style="font-size:16px;font-weight:700;">mm</span></div>' +
      '</div>' +
      '<div style="background:rgba(255,255,255,0.75);border-radius:10px;padding:12px 14px;text-align:center;">' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:4px;">' +
      actionVerb +
      '</div>' +
      '<div style="font-size:28px;font-weight:800;color:' +
      accent +
      ';line-height:1.1;">' +
      m3Abs +
      ' <span style="font-size:16px;font-weight:700;">m³</span></div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">en ' +
      fmtMm(res.irrigatedHa) +
      ' ha regadas</div>' +
      '</div></div>' +
      '<p style="margin:0;font-size:12px;line-height:1.5;color:#475569;">Referencia cultivo: <strong>' +
      fmtWaterGapMm(cropRefMm) +
      '</strong> sobre ' +
      fmtMm(res.cropHa) +
      ' ha ≈ <strong>' +
      m3Abs +
      ' m³</strong> totales' +
      (isDeficit ? '' : ' de superávit') +
      '. ' +
      (isDeficit
        ? '<strong>En goteo/microaspersor aplicas esos ' +
          m3Abs +
          ' m³</strong> en la franja de ' +
          fmtMm(res.irrigatedHa) +
          ' ha (<strong>' +
          fmtMm(mmAbs) +
          ' mm</strong> en zona humedecida).'
        : 'La lluvia cubrió más que la ETc del periodo; <strong>no necesitas regar para cubrir déficit</strong> (superávit de ' +
          m3Abs +
          ' m³ en franja de ' +
          fmtMm(res.irrigatedHa) +
          ' ha, <strong>' +
          fmtMm(mmAbs) +
          ' mm superávit</strong> en zona humedecida).') +
      '</p></div>'
    );
  }

  function buildSummaryHtml(res) {
    var periodLabel = res.periodDays === 1 ? '1 día' : res.periodDays === 30 ? '30 días' : '7 días';
    function summaryLine(label, mmVal, vol) {
      var mmText = mmVal != null ? fmtMm(mmVal) + ' mm' : '—';
      var volText = vol && vol.perHa != null ? ' → ' + vol.perHa + ' m³/ha cultivo' : '';
      var totalText = vol && vol.total != null ? ' (' + vol.total + ' m³ total)' : '';
      return (
        '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed #e2e8f0;font-size:14px;">' +
        '<span style="color:#475569;">' + label + '</span>' +
        '<span style="font-weight:600;color:#0f172a;text-align:right;">' + mmText + volText + totalText + '</span></div>'
      );
    }
    function summaryBalanceLine(deficitLabel, surplusLabel, mmVal, vol) {
      var label = balanceRowLabel(deficitLabel, surplusLabel, mmVal);
      var mmText = fmtWaterGapMm(mmVal);
      var volBits = fmtWaterGapVolSuffix(vol, mmVal);
      return (
        '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed #e2e8f0;font-size:14px;">' +
        '<span style="color:#475569;">' + label + '</span>' +
        '<span style="font-weight:600;color:' +
        (waterGapKind(mmVal) === 'surplus' ? '#0f766e' : '#0f172a') +
        ';text-align:right;">' +
        mmText +
        volBits.volText +
        volBits.totalText +
        '</span></div>'
      );
    }
    function summaryWettedStrip(deficitLabel, surplusLabel, vol) {
      if (!res.hasSplitArea || !vol || vol.wettedMm == null) return '';
      var mmVal = vol.wettedMm;
      var label = balanceRowLabel(deficitLabel, surplusLabel, mmVal);
      var m3 = vol.total != null ? Math.abs(vol.total) : null;
      return (
        '<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0 6px 12px;border-bottom:1px dashed #e2e8f0;font-size:13px;color:' +
        (waterGapKind(mmVal) === 'surplus' ? '#0f766e' : '#0369a1') +
        ';">' +
        '<span>↳ ' + label + ' en franja regada (' + fmtMm(res.irrigatedHa) + ' ha)</span>' +
        '<span style="font-weight:600;text-align:right;">' +
        fmtWaterGapMm(mmVal) +
        (m3 != null ? ' (mismos ' + m3 + ' m³)' : '') +
        '</span></div>'
      );
    }
    var irrVolTotal =
      res.irrigationMm != null && res.irrigatedHa != null
        ? mmToVolTotal(res.irrigationMm, res.irrigatedHa)
        : null;
    var irrVol =
      res.irrigationMm != null
        ? {
            perHa:
              irrVolTotal != null && res.cropHa > 0 ? round1(irrVolTotal / res.cropHa) : null,
            total: irrVolTotal,
            wettedMm: res.irrigationMm
          }
        : null;
    return (
      '<h4 style="margin:0 0 12px 0;color:#0369a1;font-size:15px;">💧 Estimación rápida (' +
      periodLabel +
      ')</h4>' +
      (res.cropHa != null
        ? '<p style="margin:0 0 10px 0;font-size:12px;color:#64748b;">Referencia cultivo: <strong>' +
          fmtMm(res.cropHa) +
          ' ha</strong>' +
          (res.hasSplitArea ? ' · Franja regada: <strong>' + fmtMm(res.irrigatedHa) + ' ha</strong>' : '') +
          '</p>'
        : '') +
      summaryLine('ETo' + (res.et0Source ? ' (' + res.et0Source + ')' : ''), res.et0, null) +
      summaryLine('Lluvia' + (res.rainSource ? ' (' + res.rainSource + ')' : ''), res.rain, null) +
      summaryBalanceLine('Déficit climático (ETo − lluvia)', 'Superávit climático (lluvia − ETo)', res.deficitClimate, res.deficitClimateVol) +
      summaryWettedStrip('Déficit climático', 'Superávit climático', res.deficitClimateVol) +
      summaryLine('ETc estimada (ETo × Kc)', res.etc, null) +
      summaryBalanceLine('Déficit del cultivo (ETc − lluvia)', 'Superávit del cultivo (lluvia − ETc)', res.deficitCrop, res.deficitCropVol) +
      summaryWettedStrip('Déficit del cultivo', 'Superávit del cultivo', res.deficitCropVol) +
      summaryLine('Riego aplicado (mm en franja)', res.irrigationMm, irrVol) +
      summaryBalanceLine('Balance hídrico (ETc − lluvia − riego)', 'Superávit hídrico (lluvia + riego − ETc)', res.balance, res.balanceVol) +
      summaryWettedStrip('Balance por cubrir en riego', 'Superávit hídrico en riego', res.balanceVol) +
      (res.soilStorage && res.soilStorage.deltaM3
        ? '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed #e2e8f0;font-size:14px;">' +
          '<span style="color:#475569;">Ajuste almacén suelo (' +
          (res.soilStorage.mode === 'deficit' ? 'déficit +' : 'exceso −') +
          res.soilStorage.m3 +
          ' m³)</span>' +
          '<span style="font-weight:600;color:#0369a1;text-align:right;">' +
          (res.soilStorage.mode === 'deficit' ? '+' : '−') +
          res.soilStorage.m3 +
          ' m³ en franja</span></div>' +
          summaryBalanceLine(
            'Total integrado (clima ± almacén suelo)',
            'Superávit integrado (clima ± almacén suelo)',
            res.fieldTargetMm,
            res.fieldTargetVol
          ) +
          summaryWettedStrip('Total integrado en franja', 'Superávit integrado en franja', res.fieldTargetVol)
        : '') +
      buildSuggestedCompositionNoteHtml(res) +
      buildStripActionBoxHtml(res)
    );
  }

  var NOTE_STYLE =
    'margin:0 0 12px 0;padding:12px 14px;font-size:12px;line-height:1.55;color:#475569;' +
    'background:linear-gradient(135deg,rgba(254,243,199,0.42) 0%,rgba(255,251,235,0.55) 100%);' +
    'border:1px solid rgba(251,191,36,0.55);border-radius:10px;box-shadow:0 1px 2px rgba(180,83,9,0.06);';

  var KC_WRAP_STYLE =
    'border:1px solid rgba(14,165,233,0.45);border-radius:10px;padding:0;' +
    'background:linear-gradient(180deg,rgba(240,249,255,0.65) 0%,rgba(255,255,255,0.92) 100%);' +
    'box-shadow:0 1px 3px rgba(2,132,199,0.08);';

  var KC_HINT_STYLE =
    'margin:4px 0 0;padding:6px 8px;font-size:11px;line-height:1.4;color:#0369a1;' +
    'background:linear-gradient(135deg,rgba(240,249,255,0.78) 0%,rgba(255,255,255,0.96) 100%);' +
    'border:1px solid rgba(14,165,233,0.42);border-radius:8px;';

  var ROOT_REACH_WRAP_STYLE =
    'border:1px solid rgba(34,197,94,0.45);border-radius:10px;padding:0;margin-top:12px;' +
    'background:linear-gradient(180deg,rgba(240,253,244,0.65) 0%,rgba(255,255,255,0.92) 100%);' +
    'box-shadow:0 1px 3px rgba(22,163,74,0.08);';

  var ROOT_REACH_HINT_STYLE =
    'display:block;margin-top:10px;padding:8px 10px;font-size:11px;line-height:1.45;color:#166534;' +
    'background:linear-gradient(135deg,rgba(240,253,244,0.78) 0%,rgba(255,255,255,0.96) 100%);' +
    'border:1px solid rgba(34,197,94,0.42);border-radius:8px;cursor:pointer;text-align:left;width:100%;font-family:inherit;';

  var ROOT_REACH_REFERENCE = [
    { system: 'Cultivo extensivo cerrado', pct: '80 – 100' },
    { system: 'Hortaliza en cama o surco', pct: '50 – 80' },
    { system: 'Berry en cama', pct: '40 – 70' },
    { system: 'Aguacate joven', pct: '20 – 50' },
    { system: 'Aguacate adulto', pct: '50 – 80' },
    { system: 'Frutal con calles amplias', pct: '40 – 70' },
    { system: 'Frutal con cobertura activa', pct: '60 – 90' }
  ];

  function ensureIrrCalcStyles() {
    if (ensureIrrCalcStyles._done) return;
    ensureIrrCalcStyles._done = true;
    var css = document.createElement('style');
    css.id = 'np-irr-calc-ui';
    css.textContent =
      '.np-irr-kc-field{display:flex;flex-direction:column;gap:0;align-self:start;max-width:100%;}' +
      '.np-irr-kc-field input{margin-bottom:0;}' +
      '.np-irr-kc-scroll-hint{margin-top:4px!important;}' +
      '.np-irr-value-unit{display:flex;align-items:stretch;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff;width:100%;max-width:220px;}' +
      '.np-irr-value-unit input{flex:1;min-width:0;border:none!important;border-radius:0!important;box-shadow:none!important;padding:10px 12px;font-size:14px;}' +
      '.np-irr-value-unit select{width:auto;min-width:4.25rem;flex-shrink:0;border:none!important;border-left:1px solid #cbd5e1!important;border-radius:0!important;background:#f8fafc;font-weight:700;color:#0369a1;padding:10px 10px;font-size:14px;cursor:pointer;}' +
      '.np-irr-value-unit .np-irr-unit-badge,.irr-riego-row .irr-unit-badge{display:flex;align-items:center;flex-shrink:0;border-left:1px solid #cbd5e1;background:#f8fafc;font-weight:700;color:#0369a1;padding:10px 12px;font-size:14px;white-space:nowrap;}' +
      '.np-irr-calc-row-3{display:grid;grid-template-columns:minmax(0,240px) minmax(0,1fr) minmax(0,1fr);gap:12px;margin-bottom:16px;align-items:start;}' +
      '@media (max-width:720px){.np-irr-calc-row-3{grid-template-columns:1fr;}.np-irr-value-unit{max-width:100%;}}' +
      '.np-irr-root-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}' +
      '.np-irr-root-actions input{width:100px!important;flex-shrink:0;padding:10px 12px;border:1px solid #86efac;border-radius:8px;font-size:14px;}' +
      '.np-irr-btn-suggest,.np-irr-btn-soil{flex:0 0 auto;padding:8px 12px;font-size:12px;white-space:nowrap;border-radius:8px;font-weight:600;cursor:pointer;line-height:1.25;}' +
      '.np-irr-btn-suggest{background:#16a34a;color:#fff;border:none;}' +
      '.np-irr-btn-suggest:hover{background:#15803d;}' +
      '.np-irr-btn-soil{background:#fff;color:#166534;border:1px solid #86efac;}' +
      '.np-irr-btn-soil:hover{background:#f0fdf4;}' +
      '.np-soil-bridge-panel{background:#f0f9ff;border:1px solid #7dd3fc;border-radius:10px;padding:12px;}' +
      '.np-soil-bridge-title{margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#0369a1;}' +
      '.np-soil-bridge-row{display:flex;flex-wrap:nowrap;gap:8px;align-items:stretch;margin-bottom:8px;max-width:420px;}' +
      '.np-soil-bridge-row select.np-soil-bridge-mode{width:auto!important;flex:1 1 auto;min-width:0;max-width:none;padding:10px 12px;border:1px solid #7dd3fc;border-radius:8px;font-size:14px;font-weight:600;color:#0369a1;background:#fff;box-sizing:border-box;}' +
      '.np-soil-bridge-row .np-soil-bridge-m3{flex:0 0 132px;width:132px;max-width:132px;}' +
      '.np-soil-bridge-row .np-soil-bridge-m3 input{font-weight:700;color:#0f172a;background:#fff;}' +
      '.np-soil-bridge-help{margin:0 0 8px;font-size:12px;line-height:1.45;color:#334155;}' +
      '.np-soil-bridge-suggest{margin:0;font-size:12px;line-height:1.45;color:#64748b;}' +
      '.np-soil-bridge-suggest-btns{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;}' +
      '.np-soil-bridge-suggest-btn{flex:0 0 auto;padding:6px 10px;font-size:11px;font-weight:600;border-radius:8px;border:1px solid #7dd3fc;background:#fff;color:#0369a1;cursor:pointer;white-space:nowrap;line-height:1.25;}' +
      '.np-soil-bridge-suggest-btn:hover{background:#f0f9ff;}' +
      '.np-soil-bridge-suggest-btn--cc{border-color:#cbd5e1;color:#475569;}' +
      '.np-soil-bridge-suggest-btn--cc:hover{background:#f8fafc;}' +
      '@media (max-width:520px){.np-soil-bridge-row{flex-wrap:wrap;max-width:100%;}.np-soil-bridge-row select.np-soil-bridge-mode{flex:1 1 100%;max-width:100%;}.np-soil-bridge-row .np-soil-bridge-m3{flex:1 1 100%;width:100%;max-width:220px;}}' +
      '.np-irr-scroll-arrow{display:inline-block;animation:npIrrScrollBounce 1.8s ease-in-out infinite;}' +
      '@keyframes npIrrScrollBounce{0%,100%{transform:translateY(0);opacity:0.85;}50%{transform:translateY(5px);opacity:1;}}';
    document.head.appendChild(css);
  }

  ensureIrrCalcStyles();

  function getKcFieldHintHtml(idPrefix) {
    idPrefix = idPrefix || 'climate';
    return (
      '<button type="button" class="np-irr-kc-scroll-hint" data-kc-prefix="' +
      idPrefix +
      '" style="' +
      KC_HINT_STYLE +
      'cursor:pointer;text-align:left;width:100%;font-family:inherit;">' +
      '📋 Puedes tomar <strong>Kc de referencia</strong> de la tabla FAO-56 abajo. ' +
      '<span style="font-weight:700;white-space:nowrap;">↓ Ver tabla</span></button>'
    );
  }

  function scrollToKcTable(idPrefix) {
    idPrefix = idPrefix || 'climate';
    var details = document.getElementById(idPrefix + '-fao-kc-details');
    if (!details) return;
    if (!details.open) details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    details.style.transition = 'box-shadow 0.35s ease';
    details.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.38)';
    setTimeout(function () {
      details.style.boxShadow = '';
    }, 2000);
  }

  function scrollToRootReachTable(idPrefix) {
    idPrefix = idPrefix || 'climate';
    var details = document.getElementById(idPrefix + '-root-reach-details');
    if (!details) return;
    if (!details.open) details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    details.style.transition = 'box-shadow 0.35s ease';
    details.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.38)';
    setTimeout(function () {
      details.style.boxShadow = '';
    }, 2000);
  }

  function getAreaCriterionScrollHintHtml(idPrefix) {
    idPrefix = idPrefix || 'climate';
    return (
      '<button type="button" class="np-irr-root-reach-scroll-hint" data-reach-prefix="' +
      idPrefix +
      '" style="' +
      ROOT_REACH_HINT_STYLE +
      '">' +
      '📌 Tabla de referencia <strong>% suelo explorado por sistema</strong> abajo. ' +
      '<span style="font-weight:700;white-space:nowrap;"><span class="np-irr-scroll-arrow">↓</span> Ver tabla</span></button>'
    );
  }

  function bindKcScrollHints() {
    if (bindKcScrollHints._bound) return;
    bindKcScrollHints._bound = true;
    document.addEventListener('click', function (e) {
      var kcBtn = e.target.closest('.np-irr-kc-scroll-hint');
      if (kcBtn) {
        e.preventDefault();
        scrollToKcTable(kcBtn.getAttribute('data-kc-prefix') || 'climate');
        return;
      }
      var reachBtn = e.target.closest('.np-irr-root-reach-scroll-hint');
      if (reachBtn) {
        e.preventDefault();
        scrollToRootReachTable(reachBtn.getAttribute('data-reach-prefix') || 'climate');
      }
    });
  }

  bindKcScrollHints();

  function getNoteHtml(extraStyle) {
    return (
      '<p class="np-irr-balance-note" style="' +
      NOTE_STYLE +
      (extraStyle || '') +
      '">' +
      '<strong>Nota:</strong> El balance hídrico es una <strong>estimación rápida</strong> basada en ETo, lluvia y riego (satélite o valores de campo). ' +
      'El <strong>riego sugerido</strong> (m³ en recuadro azul) es el <strong>resultado</strong> ETc − lluvia − riego aplicado (± ajuste 🪨 si lo indicas); no es volumen ya regado. ' +
      'El ajuste opcional de <strong>almacén suelo</strong> (déficit/exceso en m³) solo se suma o resta si tú lo indicas arriba; calcúlalo con tu criterio en 🪨 Agua en suelo y textura. ' +
      'No considera escurrimiento superficial, drenaje profundo ni lixiviación de nutrientes. ' +
      'El % raíces en superficie (criterio NutriPlant) solo ayuda a estimar la franja regada en el área, no la profundidad del suelo. <strong>Validar siempre en campo.</strong></p>'
    );
  }

  function getKcDetailsHtml(opts) {
    opts = opts || {};
    var idPrefix = opts.idPrefix || 'climate';
    var detailsId = idPrefix + '-fao-kc-details';
    var searchId = idPrefix + '-fao-kc-search';
    var tbodyId = idPrefix + '-fao-kc-tbody';
    return (
      '<details id="' +
      detailsId +
      '" class="np-irr-kc-details" style="' +
      KC_WRAP_STYLE +
      '">' +
      '<summary style="padding:12px 14px;cursor:pointer;font-weight:600;color:#0369a1;font-size:14px;">📋 Tabla de referencia Kc (FAO-56)</summary>' +
      '<div style="padding:0 14px 14px;">' +
      '<input type="search" id="' +
      searchId +
      '" placeholder="Buscar cultivo…" style="width:100%;padding:8px 10px;border:1px solid #bae6fd;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box;background:#fff;">' +
      '<div style="max-height:280px;overflow:auto;border:1px solid #e0f2fe;border-radius:8px;background:#fff;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
      '<thead><tr style="background:#f0f9ff;position:sticky;top:0;">' +
      '<th style="padding:8px;text-align:left;">Cultivo</th>' +
      '<th style="padding:8px;text-align:left;">Etapa</th>' +
      '<th style="padding:8px;text-align:center;">Kc (rango FAO)</th></tr></thead>' +
      '<tbody id="' +
      tbodyId +
      '"></tbody></table></div></div></details>'
    );
  }

  function getRootReachDetailsHtml(opts) {
    opts = opts || {};
    var idPrefix = opts.idPrefix || 'climate';
    var detailsId = idPrefix + '-root-reach-details';
    var rows = ROOT_REACH_REFERENCE
      .map(function (row) {
        return (
          '<tr style="border-bottom:1px solid #e5e7eb;">' +
          '<td style="padding:8px;">' +
          row.system +
          '</td><td style="padding:8px;text-align:center;font-weight:600;color:#166534;">' +
          row.pct +
          '</td></tr>'
        );
      })
      .join('');
    return (
      '<details id="' +
      detailsId +
      '" class="np-irr-root-reach-details" style="' +
      ROOT_REACH_WRAP_STYLE +
      '">' +
      '<summary style="padding:12px 14px;cursor:pointer;font-weight:600;color:#166534;font-size:14px;">📌 Referencia: % suelo explorado por sistema</summary>' +
      '<div style="padding:0 14px 14px;">' +
      '<p style="margin:0 0 10px;font-size:12px;line-height:1.45;color:#475569;">Orienta el <strong>% raíces en superficie</strong> para sugerir la franja regada. Referencia ilustrativa — validar en campo.</p>' +
      '<div style="border:1px solid #bbf7d0;border-radius:8px;background:#fff;overflow:hidden;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
      '<thead><tr style="background:#f0fdf4;">' +
      '<th style="padding:8px;text-align:left;color:#334155;">Sistema</th>' +
      '<th style="padding:8px;text-align:center;color:#334155;">% sugerido</th></tr></thead>' +
      '<tbody>' +
      rows +
      '</tbody></table></div></div></details>'
    );
  }

  function getReferenceTablesHtml(opts) {
    opts = opts || {};
    return getKcDetailsHtml(opts) + getRootReachDetailsHtml(opts);
  }

  function renderFaoKcTable(tbodyId, filterText, cropFilter) {
    var body = document.getElementById(tbodyId);
    if (!body) return;
    var rows = w.FAO_KC_REFERENCE || [];
    var q = String(filterText || '').trim().toLowerCase();
    var cropQ = String(cropFilter || '').trim().toLowerCase();
    var html = '';
    rows.forEach(function (row) {
      var crop = String(row.crop || '');
      var stage = String(row.stage || '');
      var haystack = (crop + ' ' + stage).toLowerCase();
      if (q && haystack.indexOf(q) < 0) return;
      var highlight = cropQ && crop.toLowerCase().indexOf(cropQ) >= 0;
      html +=
        '<tr style="border-bottom:1px solid #e5e7eb;' +
        (highlight ? 'background:#ecfdf5;' : '') +
        '">' +
        '<td style="padding:6px 8px;">' +
        crop +
        '</td><td style="padding:6px 8px;color:#475569;">' +
        stage +
        '</td><td style="padding:6px 8px;text-align:center;font-weight:600;">' +
        row.kcMin.toFixed(2) +
        ' – ' +
        row.kcMax.toFixed(2) +
        '</td></tr>';
    });
    body.innerHTML =
      html ||
      '<tr><td colspan="3" style="padding:12px;color:#64748b;text-align:center;">Sin coincidencias en la tabla FAO.</td></tr>';
  }

  function buildReportBlockHtml(res, meta) {
    meta = meta || {};
    var metaHtml = '';
    if (meta.cropName) {
      metaHtml +=
        '<p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Cultivo:</strong> ' +
        String(meta.cropName) +
        '</p>';
    }
    if (meta.kc != null && Number.isFinite(Number(meta.kc))) {
      metaHtml +=
        '<p style="margin:0 0 10px;font-size:13px;color:#334155;"><strong>Kc:</strong> ' +
        fmtMm(meta.kc) +
        '</p>';
    }
    return (
      '<div class="report-block" style="border-color:#7dd3fc;background:#f0f9ff;">' +
      '<div class="report-block-title">💧 Calculadora de balance hídrico</div>' +
      metaHtml +
      '<div style="padding:12px 14px;background:#fff;border-radius:8px;border:1px solid #e0f2fe;">' +
      buildSummaryHtml(res) +
      getNoteHtml('margin-top:12px;margin-bottom:0;') +
      '</div></div>'
    );
  }

  w.NpIrrBalance = {
    round1: round1,
    fmtMm: fmtMm,
    computeRollingWindows: computeRollingWindows,
    getRollingForPeriod: getRollingForPeriod,
    resolveAreaContext: resolveAreaContext,
    normalizeRootReachPct: normalizeRootReachPct,
    suggestedIrrigatedHaFromReach: suggestedIrrigatedHaFromReach,
    buildAreaCriterionNoteHtml: buildAreaCriterionNoteHtml,
    irrigationMmFromInput: irrigationMmFromInput,
    migrateIrrigationValueToM3: migrateIrrigationValueToM3,
    normalizeIrrigationInputM3Only: normalizeIrrigationInputM3Only,
    mmToVolTotal: mmToVolTotal,
    volTotalToCropRefMm: volTotalToCropRefMm,
    computeBalanceMm: computeBalanceMm,
    computeResults: computeResults,
    parseSoilStorageAdjustment: parseSoilStorageAdjustment,
    enrichWithSoilStorage: enrichWithSoilStorage,
    sourceBadge: sourceBadge,
    fetchRollingOpenMeteo: fetchRollingOpenMeteo,
    buildSummaryHtml: buildSummaryHtml,
    buildStripActionBoxHtml: buildStripActionBoxHtml,
    buildReportBlockHtml: buildReportBlockHtml,
    getNoteHtml: getNoteHtml,
    getKcDetailsHtml: getKcDetailsHtml,
    getKcFieldHintHtml: getKcFieldHintHtml,
    ensureIrrCalcStyles: ensureIrrCalcStyles,
    scrollToKcTable: scrollToKcTable,
    scrollToRootReachTable: scrollToRootReachTable,
    getAreaCriterionScrollHintHtml: getAreaCriterionScrollHintHtml,
    renderFaoKcTable: renderFaoKcTable,
    getRootReachDetailsHtml: getRootReachDetailsHtml,
    getReferenceTablesHtml: getReferenceTablesHtml,
    NOTE_STYLE: NOTE_STYLE,
    KC_WRAP_STYLE: KC_WRAP_STYLE,
    KC_HINT_STYLE: KC_HINT_STYLE
  };
})(window);
