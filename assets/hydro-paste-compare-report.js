/**
 * Bloque Extracto de pasta (referencia) para PDF y admin.
 * Misma lógica que Cálculo de fertilizantes: pasta vs objetivo, f editable, no resta como agua.
 */
(function (global) {
  'use strict';

  var NUTRIENTS = ['N_NH4', 'N_NO3', 'P', 'S', 'K', 'Ca', 'Mg', 'Fe', 'Mn', 'B', 'Zn', 'Cu', 'Mo', 'Cl'];
  var LABEL_MAP = {
    N_NH4: 'N-NH₄⁺', N_NO3: 'N-NO₃⁻', P: 'P-H₂PO₄⁻', S: 'S-SO₄²⁻',
    Cl: 'Cl⁻', K: 'K⁺', Ca: 'Ca²⁺', Mg: 'Mg²⁺'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function defaultLabel(n) {
    return LABEL_MAP[n] || n;
  }

  function ppmFromPasteAnalysis(analysis) {
    var cations = (analysis && analysis.cations) || {};
    var anions = (analysis && analysis.anions) || {};
    var micros = (analysis && analysis.micros) || {};
    var num = function (v) {
      var n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      N_NH4: num(micros.n_nh4),
      N_NO3: num(anions.no3_ppm),
      P: num(anions.po4_ppm),
      S: num(anions.so4_ppm),
      K: num(cations.k_ppm),
      Ca: num(cations.ca_ppm),
      Mg: num(cations.mg_ppm),
      Fe: num(micros.fe),
      Mn: num(micros.mn),
      B: num(micros.b),
      Zn: num(micros.zn),
      Cu: num(micros.cu),
      Mo: num(micros.mo),
      Cl: num(anions.cl_ppm)
    };
  }

  function analysisLabel(analysis, index, lang) {
    var title = (analysis && analysis.title && String(analysis.title).trim()) || '';
    var date = (analysis && analysis.date && String(analysis.date).trim()) || '';
    if (title && date) return title + ' · ' + date;
    if (title) return title;
    if (date) return (lang === 'en' ? 'Paste extract' : 'Extracto de pasta') + ' · ' + date;
    return (lang === 'en' ? 'Paste extract' : 'Extracto de pasta') + ' #' + (index + 1);
  }

  /**
   * opts: { lang, hidroponia, pasteAnalyses, labelFn, mode: 'report'|'admin' }
   */
  function buildHtml(opts) {
    opts = opts || {};
    var lang = opts.lang === 'en' ? 'en' : 'es';
    var t = function (es, en) { return lang === 'en' ? en : es; };
    var h = opts.hidroponia && typeof opts.hidroponia === 'object' ? opts.hidroponia : {};
    var labelFn = typeof opts.labelFn === 'function' ? opts.labelFn : defaultLabel;
    var list = Array.isArray(opts.pasteAnalyses) ? opts.pasteAnalyses : [];

    var paste = h.pastePpm && typeof h.pastePpm === 'object' ? h.pastePpm : null;
    var pasteId = h.pasteAnalysisId || null;
    var analysisName = '';
    if (pasteId && list.length) {
      var idx = -1;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === pasteId) { idx = i; break; }
      }
      var analysis = idx >= 0 ? list[idx] : null;
      if (analysis) {
        if (!paste) paste = ppmFromPasteAnalysis(analysis);
        analysisName = analysisLabel(analysis, idx >= 0 ? idx : 0, lang);
      }
    }

    if (!paste || !pasteId) {
      if (opts.mode === 'admin') {
        return '<div style="margin-top:16px;margin-bottom:0;">' +
          '<strong style="color:#1e293b;font-size:14px;">🧪📋 ' +
          t('Extracto de pasta (referencia rizósfera)', 'Paste extract (rhizosphere reference)') +
          '</strong>' +
          '<p style="margin:6px 0 0;color:#94a3b8;font-size:12px;font-style:italic;">' +
          t('Sin extracto vinculado en el cálculo de fertilizantes.', 'No paste extract linked in the fertilizer calculation.') +
          '</p></div>';
      }
      return '';
    }

    var stages = Array.isArray(h.stages) ? h.stages : [];
    var stage = null;
    if (h.activeStageId) {
      for (var s = 0; s < stages.length; s++) {
        if (stages[s] && stages[s].id === h.activeStageId) { stage = stages[s]; break; }
      }
    }
    if (!stage) stage = stages[0] || null;

    var objective = {};
    NUTRIENTS.forEach(function (n) {
      objective[n] = parseFloat(stage && stage.ppm ? stage.ppm[n] : 0) || 0;
    });

    var factor = parseFloat(h.pasteAdjustFactor);
    if (!Number.isFinite(factor)) factor = 0.3;
    factor = Math.min(1, Math.max(0, factor));
    var already = !!(h.pasteSuggestionAppliedId && h.pasteSuggestionAppliedId === pasteId);

    var diffVals = {};
    var suggestVals = {};
    NUTRIENTS.forEach(function (n) {
      var excess = (parseFloat(paste[n]) || 0) - (parseFloat(objective[n]) || 0);
      diffVals[n] = excess;
      suggestVals[n] = excess > 0.01 ? excess * factor : 0;
    });

    var appliedNote = already
      ? t('Sugerencia ya aplicada al objetivo con este análisis.', 'Suggestion already applied to the target with this analysis.')
      : t('Sugerencia aún no aplicada al objetivo (solo referencia).', 'Suggestion not yet applied to the target (reference only).');

    var method = t(
      'Steiner guía el equilibrio iónico de la solución; no resta pasta 1:1. Si pasta &gt; objetivo → bajaría = (pasta − objetivo) × f. El agua sí resta del faltante; la pasta no.',
      'Steiner guides ionic balance of the solution; it does not subtract paste 1:1. If paste &gt; target → cut = (paste − target) × f. Water does subtract from the requirement; paste does not.'
    );

    if (opts.mode === 'admin') {
      return '' +
        '<div style="margin-top:16px;margin-bottom:0;padding:12px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;">' +
        '<strong style="color:#1e293b;font-size:14px;">🧪📋 ' +
        t('Extracto de pasta (referencia rizósfera)', 'Paste extract (rhizosphere reference)') +
        '</strong>' +
        '<p style="margin:6px 0 8px;color:#64748b;font-size:12px;">' + method + '</p>' +
        '<p style="margin:0 0 8px;font-size:12px;color:#5b21b6;"><strong>' +
        t('Análisis', 'Analysis') + ':</strong> ' + esc(analysisName || pasteId) +
        ' · <strong>f</strong> = ' + factor.toFixed(2) + ' · ' + appliedNote + '</p>' +
        '<div style="margin-bottom:8px;"><strong style="font-size:12px;color:#334155;">' +
        t('Niveles pasta (ppm)', 'Paste levels (ppm)') + '</strong>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,100px),1fr));gap:8px;margin-top:6px;font-size:12px;">' +
        NUTRIENTS.map(function (n) {
          return '<div><strong>' + labelFn(n) + ':</strong> ' + (parseFloat(paste[n]) || 0).toFixed(2) + '</div>';
        }).join('') +
        '</div></div>' +
        '<div style="margin-bottom:8px;"><strong style="font-size:12px;color:#334155;">' +
        t('Diferencia: Pasta − Objetivo', 'Difference: Paste − Target') + '</strong>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,100px),1fr));gap:8px;margin-top:6px;font-size:12px;">' +
        NUTRIENTS.map(function (n) {
          var v = diffVals[n];
          var c = v > 0.01 ? '#b45309' : (v < -0.01 ? '#0369a1' : '#334155');
          return '<div><strong>' + labelFn(n) + ':</strong> <span style="color:' + c + ';font-weight:600;">' +
            (v >= 0 ? '+' : '') + v.toFixed(2) + '</span></div>';
        }).join('') +
        '</div></div>' +
        '<div><strong style="font-size:12px;color:#334155;">' +
        t('Bajaría sugerida (exceso × f)', 'Suggested cut (excess × f)') + '</strong>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,100px),1fr));gap:8px;margin-top:6px;font-size:12px;">' +
        NUTRIENTS.map(function (n) {
          var v = suggestVals[n];
          return '<div><strong>' + labelFn(n) + ':</strong> <span style="color:' +
            (v > 0.01 ? '#9a3412' : '#334155') + ';font-weight:700;">' +
            (v > 0 ? '−' : '') + v.toFixed(2) + '</span></div>';
        }).join('') +
        '</div></div></div>';
    }

    var pastePills = NUTRIENTS.map(function (n) {
      return '<span class="report-nutrient-pill"><strong>' + labelFn(n) + ':</strong> ' +
        (parseFloat(paste[n]) || 0).toFixed(2) + ' ppm</span>';
    }).join('');
    var diffPills = NUTRIENTS.map(function (n) {
      var v = diffVals[n];
      var tone = v > 0.01 ? 'color:#b45309;font-weight:700;' : (v < -0.01 ? 'color:#0369a1;font-weight:600;' : '');
      return '<span class="report-nutrient-pill"><strong>' + labelFn(n) + ':</strong> <span style="' + tone + '">' +
        (v >= 0 ? '+' : '') + v.toFixed(2) + '</span> ppm</span>';
    }).join('');
    var suggestPills = NUTRIENTS.map(function (n) {
      var v = suggestVals[n];
      var tone = v > 0.01 ? 'color:#9a3412;font-weight:800;' : '';
      return '<span class="report-nutrient-pill"><strong>' + labelFn(n) + ':</strong> <span style="' + tone + '">' +
        (v > 0 ? '−' : '') + v.toFixed(2) + '</span> ppm</span>';
    }).join('');

    return '' +
      '<div class="report-block" style="border-color:#e9d5ff;background:#faf5ff;">' +
      '<div class="report-block-title">🧪📋 ' +
      t('Extracto de pasta (referencia rizósfera)', 'Paste extract (rhizosphere reference)') +
      '</div>' +
      '<div class="report-note" style="margin-bottom:8px;">' + method + '</div>' +
      '<div class="report-note" style="margin-bottom:10px;"><strong>' +
      t('Análisis', 'Analysis') + ':</strong> ' + esc(analysisName || pasteId) +
      ' · <strong>f</strong> = ' + factor.toFixed(2) + ' · ' + appliedNote + '</div>' +
      '<div class="report-note" style="margin-bottom:4px;font-weight:600;">' +
      t('Niveles en extracto de pasta (ppm)', 'Paste extract levels (ppm)') + '</div>' +
      '<div class="report-nutrient-wrap report-hydro-nutrient-wrap" style="margin-bottom:10px;">' + pastePills + '</div>' +
      '<div class="report-note" style="margin-bottom:4px;font-weight:600;">' +
      t('Diferencia (ppm): Pasta − Objetivo', 'Difference (ppm): Paste − Target') + '</div>' +
      '<div class="report-nutrient-wrap report-hydro-nutrient-wrap" style="margin-bottom:10px;">' + diffPills + '</div>' +
      '<div class="report-note" style="margin-bottom:4px;font-weight:600;">' +
      t('Bajaría sugerida del objetivo (ppm) = exceso × f', 'Suggested target cut (ppm) = excess × f') + '</div>' +
      '<div class="report-nutrient-wrap report-hydro-nutrient-wrap">' + suggestPills + '</div>' +
      '</div>';
  }

  function buildHtmlCompat(opts) {
    if (global.NpHydroPasteCompare && typeof global.NpHydroPasteCompare.buildHtml === 'function') {
      return global.NpHydroPasteCompare.buildHtml(opts);
    }
    return buildHtml(opts);
  }

  global.NpHydroPasteCompare = {
    buildHtml: buildHtml,
    ppmFromPasteAnalysis: ppmFromPasteAnalysis
  };
  // Alias usado por dashboard / hidroponia-functions
  global.hydroBuildPasteCompareReportHtml = buildHtmlCompat;
})(typeof window !== 'undefined' ? window : this);
