/**
 * Leyendas de ácido / volumen para hidroponía (UI, admin y reporte PDF).
 * Independiente de hydroState para poder usarse en admin y reportes.
 */
(function (global) {
  'use strict';

  var ACIDS = {
    acido_nitrico_55: { nameEs: 'Ácido Nítrico 55%', nameEn: 'Nitric Acid 55%', meqPerMl: 11.6, densityKgL: 1.37 },
    acido_sulfurico_98: { nameEs: 'Ácido Sulfúrico 98%', nameEn: 'Sulfuric Acid 98%', meqPerMl: 36.7, densityKgL: 1.84 },
    acido_fosforico_75: { nameEs: 'Ácido Fosfórico 75%', nameEn: 'Phosphoric Acid 75%', meqPerMl: 12, densityKgL: 1.57 },
    acido_fosforico_85: { nameEs: 'Ácido Fosfórico 85%', nameEn: 'Phosphoric Acid 85%', meqPerMl: 14.6, densityKgL: 1.69 }
  };

  function t(lang, es, en) {
    return lang === 'en' ? en : es;
  }

  function analysisVolumeM3(analysis) {
    var n = parseFloat(analysis && analysis.m3Riego);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function volumesMatch(a, b, tol) {
    var x = parseFloat(a) || 0;
    var y = parseFloat(b) || 0;
    return Math.abs(x - y) <= (tol == null ? 0.01 : tol);
  }

  function analysisMeqFromPpm(ppm, eqWeight) {
    var p = parseFloat(ppm);
    if (!Number.isFinite(p) || !(eqWeight > 0)) return NaN;
    return p / eqWeight;
  }

  function carbonateMeq(anions) {
    anions = anions || {};
    var hco3 = parseFloat(anions.hco3_meq);
    if (!Number.isFinite(hco3) && anions.hco3_ppm !== '' && anions.hco3_ppm != null) {
      hco3 = analysisMeqFromPpm(anions.hco3_ppm, 61.02);
    }
    var co3 = parseFloat(anions.co3_meq);
    if (!Number.isFinite(co3) && anions.co3_ppm !== '' && anions.co3_ppm != null) {
      co3 = analysisMeqFromPpm(anions.co3_ppm, 30.0);
    }
    return {
      hco3: Number.isFinite(hco3) ? Math.max(0, hco3) : null,
      co3: Number.isFinite(co3) ? Math.max(0, co3) : null
    };
  }

  function calculate(analysis, hydroVolumeM3) {
    if (!analysis) return null;
    var anions = analysis.anions || {};
    var carb = carbonateMeq(anions);
    var hasCarbonateData = carb.hco3 != null || carb.co3 != null;
    if (!hasCarbonateData) return null;
    var hco3 = carb.hco3 != null ? carb.hco3 : 0;
    var co3 = carb.co3 != null ? carb.co3 : 0;
    var residualRaw = parseFloat(analysis.acidResidualMeq);
    var residualMeq = Number.isFinite(residualRaw) && residualRaw >= 0 ? residualRaw : 1;
    var acidId = analysis.acidId || 'acido_nitrico_55';
    var acid = ACIDS[acidId];
    if (!acid || !(acid.meqPerMl > 0)) return null;
    var neededMeqL = Math.max(0, hco3 + co3 - residualMeq);
    var mlPerM3 = neededMeqL * 1000 / acid.meqPerMl;
    var aVol = analysisVolumeM3(analysis);
    var hVol = Math.max(0, parseFloat(hydroVolumeM3) || 0);
    var density = (typeof acid.densityKgL === 'number' && acid.densityKgL > 0) ? acid.densityKgL : 1.5;
    return {
      acidId: acidId,
      acid: acid,
      hco3: hco3,
      co3: co3,
      residualMeq: residualMeq,
      neededMeqL: neededMeqL,
      mlPerM3: mlPerM3,
      analysisVolumeM3: aVol,
      hydroVolumeM3: hVol,
      analysisTotalLiters: mlPerM3 * aVol / 1000,
      totalLiters: mlPerM3 * hVol / 1000,
      kgPerM3: (mlPerM3 / 1000) * density,
      analysisTotalKg: (mlPerM3 * aVol / 1000) * density,
      totalKg: (mlPerM3 * hVol / 1000) * density,
      volumesMatch: aVol > 0 && volumesMatch(aVol, hVol)
    };
  }

  function toSummary(calc, waterAnalysisId) {
    if (!calc) {
      return {
        waterAnalysisId: waterAnalysisId || null,
        hasAcid: false
      };
    }
    return {
      waterAnalysisId: waterAnalysisId || null,
      hasAcid: true,
      acidId: calc.acidId,
      acidNameEs: calc.acid.nameEs,
      acidNameEn: calc.acid.nameEn,
      hco3: calc.hco3,
      co3: calc.co3,
      residualMeq: calc.residualMeq,
      neededMeqL: calc.neededMeqL,
      mlPerM3: calc.mlPerM3,
      analysisVolumeM3: calc.analysisVolumeM3,
      hydroVolumeM3: calc.hydroVolumeM3,
      analysisTotalLiters: calc.analysisTotalLiters,
      totalLiters: calc.totalLiters,
      volumesMatch: !!calc.volumesMatch
    };
  }

  function volumeMatchNoteHtml(lang, analysisVolumeM3Val, hydroVolumeM3, classPrefix) {
    var p = classPrefix || 'hydro';
    var aVol = Math.max(0, parseFloat(analysisVolumeM3Val) || 0);
    var hVol = Math.max(0, parseFloat(hydroVolumeM3) || 0);
    if (!(aVol > 0)) {
      return '<span class="' + p + '-volume-match-note ' + p + '-volume-match-note--warn">' + t(lang,
        'El análisis de agua no tiene volumen (m³) guardado para el cálculo de ácido.',
        'The water analysis has no saved volume (m³) for the acid calculation.'
      ) + '</span>';
    }
    if (volumesMatch(aVol, hVol)) {
      return '<span class="' + p + '-volume-match-note ' + p + '-volume-match-note--ok">' + t(lang,
        'Coincide con el volumen de agua considerado en Análisis → Agua para el cálculo de ácido',
        'Matches the water volume used in Analysis → Water for the acid calculation'
      ) + ' (' + aVol.toFixed(2) + ' m³).</span>';
    }
    return '<span class="' + p + '-volume-match-note ' + p + '-volume-match-note--warn">' + t(lang,
      'No coincide con el volumen de Análisis → Agua para el cálculo de ácido',
      'Does not match the Analysis → Water volume used for the acid calculation'
    ) + ': ' + t(lang, 'allí hay', 'there it is') + ' <strong>' + aVol.toFixed(2) + ' m³</strong> ' +
      t(lang, 'y aquí', 'and here') + ' <strong>' + hVol.toFixed(2) + ' m³</strong>.</span>';
  }

  function warningSpan(lang, classPrefix) {
    var p = classPrefix || 'hydro';
    return '<span class="' + p + '-acid-warning">(' + t(lang,
      'Revisar la dosis de ácido a utilizar con base en el análisis de agua.',
      'Review the acid dose to use based on the water analysis.'
    ) + ')</span>';
  }

  function analysisVolumeSentence(lang, aVol, analysisTotalLiters, extra) {
    extra = extra || {};
    if (extra.hideAnalysisVolume) return '';
    var analysisVolText = aVol > 0
      ? (Number(aVol).toFixed(2) + ' m³')
      : t(lang, 'sin volumen en el análisis', 'no volume in the analysis');
    var analysisLitersText = aVol > 0
      ? (Number(analysisTotalLiters).toFixed(2) + ' L')
      : t(lang, 'sin L totales (falta m³ en el análisis)', 'no total L (analysis m³ missing)');
    return t(lang, 'Volumen de agua en Análisis', 'Water volume in Analysis') + ': <strong>' + analysisVolText + '</strong> → ' +
      t(lang, 'ácido total', 'total acid') + ' <strong>' + analysisLitersText + '</strong>. ';
  }

  function appliedVolumeSentence(lang, volumeM3, totalLiters, extra) {
    extra = extra || {};
    if (extra.hideAppliedVolume) return '';
    if (extra.appliedVolumeHtml) return extra.appliedVolumeHtml;
    return t(lang, 'Para el volumen de aquí', 'For this volume') +
      ' (' + (Number(volumeM3) || 0).toFixed(2) + ' m³): <strong>' +
      (Number(totalLiters) || 0).toFixed(2) + ' L</strong>. ';
  }

  function buildAcidHtmlFromCalc(lang, calc, classPrefix, extra) {
    extra = extra || {};
    var acidName = t(lang, calc.acid.nameEs, calc.acid.nameEn);
    return '<div class="' + (classPrefix || 'hydro') + '-acid-summary-title"><strong>' +
      t(lang, 'Resumen de la dosis de ácido', 'Acid dose summary') + '</strong></div>' +
      '<p class="' + (classPrefix || 'hydro') + '-acid-summary-body">' +
      '<strong>' + acidName + '</strong>. ' +
      t(lang, 'meq a neutralizar (HCO₃⁻ + CO₃²⁻ − residual)', 'meq to neutralize (HCO₃⁻ + CO₃²⁻ − residual)') +
      ': <strong>' + calc.neededMeqL.toFixed(2) + ' meq/L</strong> ' +
      '(HCO₃⁻ ' + calc.hco3.toFixed(2) + ' + CO₃²⁻ ' + calc.co3.toFixed(2) +
      ' − ' + t(lang, 'residual', 'residual') + ' ' + calc.residualMeq.toFixed(2) + '). ' +
      '<strong>' + calc.mlPerM3.toFixed(2) + ' mL/m³</strong>. ' +
      analysisVolumeSentence(lang, calc.analysisVolumeM3, calc.analysisTotalLiters, extra) +
      appliedVolumeSentence(lang, calc.hydroVolumeM3, calc.totalLiters, extra) +
      warningSpan(lang, classPrefix) +
      '</p>' + (extra.extraHtml || '');
  }

  function buildAcidHtmlFromSummary(lang, summary, hydroVolumeM3Override, classPrefix, extra) {
    if (!summary || !summary.hasAcid) return '';
    extra = extra || {};
    var hVol = hydroVolumeM3Override != null
      ? Math.max(0, parseFloat(hydroVolumeM3Override) || 0)
      : Math.max(0, parseFloat(summary.hydroVolumeM3) || 0);
    var aVol = Math.max(0, parseFloat(summary.analysisVolumeM3) || 0);
    var mlPerM3 = Math.max(0, parseFloat(summary.mlPerM3) || 0);
    var neededMeqL = Math.max(0, parseFloat(summary.neededMeqL) || 0);
    var hco3 = Math.max(0, parseFloat(summary.hco3) || 0);
    var co3 = Math.max(0, parseFloat(summary.co3) || 0);
    var residualMeq = Number.isFinite(parseFloat(summary.residualMeq)) ? Math.max(0, parseFloat(summary.residualMeq)) : 1;
    var analysisTotalLiters = mlPerM3 * aVol / 1000;
    var totalLiters = mlPerM3 * hVol / 1000;
    var acidName = t(lang, summary.acidNameEs || '—', summary.acidNameEn || summary.acidNameEs || '—');
    return '<div class="' + (classPrefix || 'hydro') + '-acid-summary-title"><strong>' +
      t(lang, 'Resumen de la dosis de ácido', 'Acid dose summary') + '</strong></div>' +
      '<p class="' + (classPrefix || 'hydro') + '-acid-summary-body">' +
      '<strong>' + acidName + '</strong>. ' +
      t(lang, 'meq a neutralizar (HCO₃⁻ + CO₃²⁻ − residual)', 'meq to neutralize (HCO₃⁻ + CO₃²⁻ − residual)') +
      ': <strong>' + neededMeqL.toFixed(2) + ' meq/L</strong> ' +
      '(HCO₃⁻ ' + hco3.toFixed(2) + ' + CO₃²⁻ ' + co3.toFixed(2) +
      ' − ' + t(lang, 'residual', 'residual') + ' ' + residualMeq.toFixed(2) + '). ' +
      '<strong>' + mlPerM3.toFixed(2) + ' mL/m³</strong>. ' +
      analysisVolumeSentence(lang, aVol, analysisTotalLiters, extra) +
      appliedVolumeSentence(lang, hVol, totalLiters, extra) +
      warningSpan(lang, classPrefix) +
      '</p>' + ((extra && extra.extraHtml) || '');
  }

  /**
   * @param {object} opts
   * @param {'es'|'en'} [opts.lang]
   * @param {object|null} [opts.analysis] - análisis de agua del proyecto
   * @param {object|null} [opts.summary] - acidDoseSummary guardado
   * @param {number} [opts.hydroVolumeM3]
   * @param {string} [opts.analysisLabel]
   * @param {boolean} [opts.linked] - true si hay waterAnalysisId / análisis elegido
   * @param {'hydro'|'report'} [opts.classPrefix]
   * @param {boolean} [opts.wrap] - envolver en caja con borde
   * @param {boolean} [opts.hideAppliedVolume]
   * @param {boolean} [opts.hideAnalysisVolume] - fertirriego: no mezclar el m³ del análisis (lo pone el usuario; no es la lámina)
   * @param {string} [opts.appliedVolumeHtml]
   * @param {string} [opts.extraHtml]
   */
  function buildHtml(opts) {
    opts = opts || {};
    var lang = opts.lang === 'en' ? 'en' : 'es';
    var classPrefix = opts.classPrefix || 'hydro';
    var hydroVol = Math.max(0, parseFloat(opts.hydroVolumeM3) || 0);
    var extra = {
      hideAppliedVolume: !!opts.hideAppliedVolume,
      hideAnalysisVolume: !!opts.hideAnalysisVolume,
      appliedVolumeHtml: opts.appliedVolumeHtml || '',
      extraHtml: opts.extraHtml || ''
    };
    var html = '';

    if (opts.analysis) {
      var calc = calculate(opts.analysis, hydroVol);
      if (calc) {
        html = buildAcidHtmlFromCalc(lang, calc, classPrefix, extra);
      } else if (opts.summary && opts.summary.hasAcid) {
        html = buildAcidHtmlFromSummary(lang, opts.summary, hydroVol, classPrefix, extra);
      } else {
        var label = opts.analysisLabel ? (opts.analysisLabel + ': ') : '';
        html = label + t(lang,
          'no hay un ácido válido calculado. Revísalo en Análisis → Agua.',
          'there is no valid calculated acid. Review it under Analysis → Water.'
        ) + ' ' + warningSpan(lang, classPrefix);
      }
    } else if (opts.summary && opts.summary.hasAcid) {
      html = buildAcidHtmlFromSummary(lang, opts.summary, hydroVol, classPrefix, extra);
    } else if (opts.linked || (opts.summary && opts.summary.waterAnalysisId)) {
      html = t(lang,
        'no hay un ácido válido calculado. Revísalo en Análisis → Agua.',
        'there is no valid calculated acid. Review it under Analysis → Water.'
      ) + ' ' + warningSpan(lang, classPrefix);
    } else {
      html = t(lang,
        'Selecciona “Traer de análisis” para usar también el ácido calculado. Si el análisis todavía no tiene dosis, puedes calcularla en Análisis → Agua.',
        'Choose “Bring from analysis” to also use the calculated acid. If the analysis does not yet have a dose, calculate it under Analysis → Water.'
      ) + ' ' + warningSpan(lang, classPrefix);
    }

    if (!html) return '';
    if (opts.wrap === false) return html;
    var border = 'margin-top:10px;padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;font-size:13px;line-height:1.45;color:#9a3412;';
    return '<div class="report-hydro-acid-legend" style="' + border + '">' + html + '</div>';
  }

  /**
   * Resuelve análisis + summary desde datos de proyecto/hidroponía.
   */
  function resolveAndBuild(opts) {
    opts = opts || {};
    var hidro = opts.hidroponia || {};
    var analyses = Array.isArray(opts.aguaAnalyses) ? opts.aguaAnalyses : [];
    var id = hidro.waterAnalysisId || (hidro.acidDoseSummary && hidro.acidDoseSummary.waterAnalysisId) || null;
    var analysis = id ? (analyses.find(function (a) { return a && a.id === id; }) || null) : null;
    var summary = hidro.acidDoseSummary || null;
    var hydroVol = opts.hydroVolumeM3 != null ? opts.hydroVolumeM3 : hidro.volumeWaterM3;
    // En admin/PDF solo mostrar si hay vínculo a análisis o resumen de ácido guardado
    if (!analysis && !(summary && summary.hasAcid) && !id && !opts.forceEmptyHint) {
      return '';
    }
    return buildHtml({
      lang: opts.lang,
      analysis: analysis,
      summary: summary,
      hydroVolumeM3: hydroVol,
      analysisLabel: opts.analysisLabel,
      linked: !!id,
      classPrefix: opts.classPrefix || 'hydro',
      wrap: opts.wrap !== false,
      hideAppliedVolume: !!opts.hideAppliedVolume,
      hideAnalysisVolume: !!opts.hideAnalysisVolume,
      appliedVolumeHtml: opts.appliedVolumeHtml || '',
      extraHtml: opts.extraHtml || '',
      admin: !!opts.admin
    });
  }

  global.NpHydroAcidLegend = {
    ACIDS: ACIDS,
    t: t,
    analysisVolumeM3: analysisVolumeM3,
    volumesMatch: volumesMatch,
    calculate: calculate,
    toSummary: toSummary,
    volumeMatchNoteHtml: volumeMatchNoteHtml,
    buildHtml: buildHtml,
    resolveAndBuild: resolveAndBuild
  };
})(typeof window !== 'undefined' ? window : globalThis);
