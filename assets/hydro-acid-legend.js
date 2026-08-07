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

  function calculate(analysis, hydroVolumeM3) {
    if (!analysis) return null;
    var anions = analysis.anions || {};
    var hasCarbonateData = (anions.hco3_meq !== '' && anions.hco3_meq != null) ||
      (anions.co3_meq !== '' && anions.co3_meq != null);
    if (!hasCarbonateData) return null;
    var hco3 = Math.max(0, parseFloat(anions.hco3_meq) || 0);
    var co3 = Math.max(0, parseFloat(anions.co3_meq) || 0);
    var residualRaw = parseFloat(analysis.acidResidualMeq);
    var residualMeq = Number.isFinite(residualRaw) && residualRaw >= 0 ? residualRaw : 1;
    var acidId = analysis.acidId || 'acido_nitrico_55';
    var acid = ACIDS[acidId];
    if (!acid || !(acid.meqPerMl > 0)) return null;
    var neededMeqL = Math.max(0, hco3 + co3 - residualMeq);
    var mlPerM3 = neededMeqL * 1000 / acid.meqPerMl;
    var aVol = analysisVolumeM3(analysis);
    var hVol = Math.max(0, parseFloat(hydroVolumeM3) || 0);
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
        'Coincide con el volumen del análisis de agua',
        'Matches the water analysis volume'
      ) + ' (' + aVol.toFixed(2) + ' m³).</span>';
    }
    return '<span class="' + p + '-volume-match-note ' + p + '-volume-match-note--warn">' + t(lang,
      'No coincide con el análisis de agua',
      'Does not match the water analysis'
    ) + ': ' + t(lang, 'allí hay', 'there it is') + ' <strong>' + aVol.toFixed(2) + ' m³</strong> ' +
      t(lang, 'para el cálculo de ácido.', 'for the acid calculation.') + '</span>';
  }

  function warningSpan(lang, classPrefix) {
    var p = classPrefix || 'hydro';
    return '<span class="' + p + '-acid-warning">(' + t(lang,
      'Revisar la dosis de ácido a utilizar con base en el análisis de agua.',
      'Review the acid dose to use based on the water analysis.'
    ) + ')</span>';
  }

  function buildAcidHtmlFromCalc(lang, calc, classPrefix) {
    var acidName = t(lang, calc.acid.nameEs, calc.acid.nameEn);
    var analysisVolText = calc.analysisVolumeM3 > 0
      ? (calc.analysisVolumeM3.toFixed(2) + ' m³')
      : t(lang, 'sin volumen en el análisis', 'no volume in the analysis');
    var analysisLitersText = calc.analysisVolumeM3 > 0
      ? (calc.analysisTotalLiters.toFixed(2) + ' L ' + t(lang, 'según el volumen del análisis', 'for the analysis volume'))
      : t(lang, 'sin L totales (falta m³ en el análisis)', 'no total L (analysis m³ missing)');
    return '<strong>' + t(lang, 'Ácido seleccionado', 'Selected acid') + ':</strong> ' + acidName + '. ' +
      '<strong>' + calc.mlPerM3.toFixed(2) + ' mL/m³</strong> ' +
      '(' + t(lang, 'dosis en base al análisis de agua', 'dose based on the water analysis') + '). ' +
      t(lang, 'Volumen usado en el análisis', 'Volume used in the analysis') + ': <strong>' + analysisVolText + '</strong> → <strong>' + analysisLitersText + '</strong>. ' +
      t(lang, 'Para el volumen de aquí', 'For this volume') + ' (' + calc.hydroVolumeM3.toFixed(2) + ' m³): <strong>' + calc.totalLiters.toFixed(2) + ' L</strong>. ' +
      volumeMatchNoteHtml(lang, calc.analysisVolumeM3, calc.hydroVolumeM3, classPrefix) + ' ' +
      warningSpan(lang, classPrefix);
  }

  function buildAcidHtmlFromSummary(lang, summary, hydroVolumeM3Override, classPrefix) {
    if (!summary || !summary.hasAcid) return '';
    var hVol = hydroVolumeM3Override != null
      ? Math.max(0, parseFloat(hydroVolumeM3Override) || 0)
      : Math.max(0, parseFloat(summary.hydroVolumeM3) || 0);
    var aVol = Math.max(0, parseFloat(summary.analysisVolumeM3) || 0);
    var mlPerM3 = Math.max(0, parseFloat(summary.mlPerM3) || 0);
    var analysisTotalLiters = mlPerM3 * aVol / 1000;
    var totalLiters = mlPerM3 * hVol / 1000;
    var acidName = t(lang, summary.acidNameEs || '—', summary.acidNameEn || summary.acidNameEs || '—');
    var analysisVolText = aVol > 0
      ? (aVol.toFixed(2) + ' m³')
      : t(lang, 'sin volumen en el análisis', 'no volume in the analysis');
    var analysisLitersText = aVol > 0
      ? (analysisTotalLiters.toFixed(2) + ' L ' + t(lang, 'según el volumen del análisis', 'for the analysis volume'))
      : t(lang, 'sin L totales (falta m³ en el análisis)', 'no total L (analysis m³ missing)');
    return '<strong>' + t(lang, 'Ácido seleccionado', 'Selected acid') + ':</strong> ' + acidName + '. ' +
      '<strong>' + mlPerM3.toFixed(2) + ' mL/m³</strong> ' +
      '(' + t(lang, 'dosis en base al análisis de agua', 'dose based on the water analysis') + '). ' +
      t(lang, 'Volumen usado en el análisis', 'Volume used in the analysis') + ': <strong>' + analysisVolText + '</strong> → <strong>' + analysisLitersText + '</strong>. ' +
      t(lang, 'Para el volumen de aquí', 'For this volume') + ' (' + hVol.toFixed(2) + ' m³): <strong>' + totalLiters.toFixed(2) + ' L</strong>. ' +
      volumeMatchNoteHtml(lang, aVol, hVol, classPrefix) + ' ' +
      warningSpan(lang, classPrefix);
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
   */
  function buildHtml(opts) {
    opts = opts || {};
    var lang = opts.lang === 'en' ? 'en' : 'es';
    var classPrefix = opts.classPrefix || 'hydro';
    var hydroVol = Math.max(0, parseFloat(opts.hydroVolumeM3) || 0);
    var html = '';

    if (opts.analysis) {
      var calc = calculate(opts.analysis, hydroVol);
      if (calc) {
        html = buildAcidHtmlFromCalc(lang, calc, classPrefix);
      } else {
        var label = opts.analysisLabel ? (opts.analysisLabel + ': ') : '';
        html = label + t(lang,
          'no hay un ácido válido calculado. Revísalo en Análisis → Agua.',
          'there is no valid calculated acid. Review it under Analysis → Water.'
        ) + ' ' + warningSpan(lang, classPrefix);
      }
    } else if (opts.summary && opts.summary.hasAcid) {
      html = buildAcidHtmlFromSummary(lang, opts.summary, hydroVol, classPrefix);
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
