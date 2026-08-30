/**
 * Programa del ciclo de soluciones nutritivas (herramienta gratis + modal dashboard).
 * Catálogo de soluciones propias: localStorage; si hay login/embed, se puede sincronizar al perfil.
 */
(function (root) {
  'use strict';

  var EQ = { N_NO3: 14, N_NH4: 14, P: 31, K: 39.1, Ca: 20.04, Mg: 12.15, S: 16.03, Cl: 35.45 };
  var MACROS = ['N_NH4', 'N_NO3', 'P', 'S', 'K', 'Ca', 'Mg'];
  var MICROS = ['Fe', 'Mn', 'Zn', 'B', 'Cu', 'Mo'];
  var CUSTOM_LS_KEY = 'nutriplant_hydro_custom_solutions_v1';
  var CUSTOM_CYCLE_KEY = 'nutriplant_hydro_custom_cycle_programs_v1';
  /** Herramienta gratis / login: tope local. Dashboard (embed): sin tope (nube). */
  var FREE_CUSTOM_SOLUTION_LIMIT = 4;

  function isDashboardEmbed() {
    try {
      return /[?&]embed=dashboard(?:&|$)/.test(location.search || '');
    } catch (e) {
      return false;
    }
  }

  function customSolutionLimit() {
    return isDashboardEmbed() ? Infinity : FREE_CUSTOM_SOLUTION_LIMIT;
  }

  function canAddCustomSolution(items, updatingId) {
    items = items || [];
    var limit = customSolutionLimit();
    if (!isFinite(limit)) return { ok: true, limit: limit, count: items.length };
    if (updatingId && items.some(function (it) { return it.id === updatingId; })) {
      return { ok: true, limit: limit, count: items.length };
    }
    return {
      ok: items.length < limit,
      limit: limit,
      count: items.length
    };
  }
  // Aniones (familia ámbar/amarillo) vs cationes (familia rojo/rosa), tonos bien separados.
  // En gráficas meq: aniones = ■ + línea continua; cationes = ● + línea punteada (como el ternario).
  var COLORS = {
    N_NO3: '#eab308',  // amarillo vivo
    P: '#a16207',      // dorado oscuro (ya no naranja cerca del rojo de K)
    S: '#57534e',      // piedra / gris-marrón
    K: '#ef4444',      // rojo vivo
    Ca: '#9f1239',     // vino
    Mg: '#fb7185',     // rosa
    N_NH4: '#be123c',
    Fe: '#2563eb', Mn: '#7c3aed', Zn: '#0891b2', B: '#059669', Cu: '#d97706', Mo: '#64748b'
  };

  function t(es, en) {
    try {
      // En embed, el idioma del dashboard padre manda (misma sesión).
      if (/[?&]embed=dashboard(?:&|$)/.test(location.search || '') && root.parent && root.parent !== root) {
        try {
          var pp = root.parent.NpPrefs && typeof root.parent.NpPrefs.get === 'function'
            ? root.parent.NpPrefs.get()
            : null;
          if (pp && pp.language === 'en') return en;
          if (root.parent.NpI18n && typeof root.parent.NpI18n.getLanguage === 'function' &&
              root.parent.NpI18n.getLanguage() === 'en') return en;
        } catch (eParent) { /* cross-origin */ }
      }
      if (root.NpFreeNutritionUI && root.NpFreeNutritionUI.prefs().language === 'en') return en;
      if (typeof root.NpI18n !== 'undefined' && root.NpI18n.getLanguage && root.NpI18n.getLanguage() === 'en') return en;
      if (root.NpPrefs && typeof root.NpPrefs.get === 'function' && root.NpPrefs.get().language === 'en') return en;
    } catch (e) { /* ignore */ }
    return es;
  }

  function round2(v) {
    var x = parseFloat(v);
    if (isNaN(x)) return 0;
    return Math.round(x * 100) / 100;
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function labelMacro(k) {
    var map = {
      N_NH4: 'N-NH₄⁺', N_NO3: 'N-NO₃⁻', P: 'P-H₂PO₄⁻', S: 'S-SO₄²⁻',
      K: 'K⁺', Ca: 'Ca²⁺', Mg: 'Mg²⁺', Cl: 'Cl⁻'
    };
    return map[k] || k;
  }

  function computeCE(stage) {
    var sum = 0;
    ['N_NO3', 'N_NH4', 'P', 'S', 'Cl', 'K', 'Ca', 'Mg'].forEach(function (k) {
      sum += parseFloat(stage.meq && stage.meq[k]) || 0;
    });
    return round2(sum / 20);
  }

  function syncMacroPpm(stage) {
    if (!stage.meq) stage.meq = {};
    if (!stage.ppm) stage.ppm = {};
    ['N_NO3', 'N_NH4', 'P', 'S', 'K', 'Ca', 'Mg', 'Cl'].forEach(function (k) {
      var w = EQ[k] || 0;
      stage.ppm[k] = round2((parseFloat(stage.meq[k]) || 0) * w);
    });
  }

  function colClassMacro(k) {
    var cls = [];
    if (k === 'N_NH4') cls.push('hydro-col-nh4');
    if (k === 'K') cls.push('hydro-ion-divide');
    return cls.join(' ');
  }

  function colClassMicro(k, idx) {
    return idx === 0 ? 'hydro-micro-start' : '';
  }

  function defaultStageName(n) {
    return t('Etapa', 'Stage') + ' ' + n;
  }

  function defaultStage(name) {
    return {
      id: 'cyc_' + Date.now() + '_' + Math.floor(Math.random() * 1e4),
      name: name || defaultStageName(1),
      solutionId: '',
      ce: '0.00',
      meq: { N_NH4: 0, N_NO3: 0, P: 0, S: 0, K: 0, Ca: 0, Mg: 0, Cl: 0 },
      ppm: { Fe: 0, Mn: 0, Zn: 0, B: 0, Cu: 0, Mo: 0, N_NO3: 0, N_NH4: 0, P: 0, S: 0, K: 0, Ca: 0, Mg: 0, Cl: 0 }
    };
  }

  function normalizeStage(raw, i) {
    var base = defaultStage(defaultStageName(i + 1));
    if (!raw || typeof raw !== 'object') return base;
    base.id = raw.id ? String(raw.id) : base.id;
    var rawName = raw.name != null ? String(raw.name).trim() : '';
    base.name = rawName || defaultStageName(i + 1);
    base.solutionId = raw.solutionId ? String(raw.solutionId) : '';
    MACROS.concat(['Cl']).forEach(function (k) {
      base.meq[k] = round2(raw.meq && raw.meq[k]);
    });
    MICROS.forEach(function (k) {
      base.ppm[k] = round2(raw.ppm && raw.ppm[k]);
    });
    syncMacroPpm(base);
    base.ce = (raw.ce != null && raw.ce !== '') ? String(raw.ce) : String(computeCE(base));
    return base;
  }

  function loadCustomSolutions() {
    try {
      var raw = localStorage.getItem(CUSTOM_LS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      var items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : []);
      var cat = root.NpHydroSolutionCatalog;
      return items.map(function (it) { return cat ? cat.normalize(it) : it; }).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function saveCustomSolutions(items, opts) {
    opts = opts || {};
    try {
      localStorage.setItem(CUSTOM_LS_KEY, JSON.stringify({ items: items || [] }));
    } catch (e) { /* ignore */ }
    if (opts.silent) return;
    try {
      if (root.parent && root.parent !== root && /embed=dashboard/.test(location.search || '')) {
        root.parent.postMessage({
          type: 'np-hydro-custom-solutions',
          items: items || []
        }, '*');
      }
    } catch (e2) { /* ignore */ }
  }

  function loadCustomCyclePrograms() {
    try {
      var raw = localStorage.getItem(CUSTOM_CYCLE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      var items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : []);
      return items.filter(function (it) {
        return it && it.name && Array.isArray(it.stages) && it.stages.length;
      });
    } catch (e) {
      return [];
    }
  }

  function saveCustomCyclePrograms(items, opts) {
    opts = opts || {};
    try {
      localStorage.setItem(CUSTOM_CYCLE_KEY, JSON.stringify({ items: items || [] }));
    } catch (e) { /* ignore */ }
    if (opts.silent) return;
    try {
      if (root.parent && root.parent !== root && /embed=dashboard/.test(location.search || '')) {
        root.parent.postMessage({
          type: 'np-hydro-custom-cycle-programs',
          items: items || []
        }, '*');
      }
    } catch (e2) { /* ignore */ }
  }

  function getAllCatalogSolutions() {
    var cat = root.NpHydroSolutionCatalog;
    var builtIn = cat ? cat.builtIn.slice() : [];
    var custom = loadCustomSolutions();
    return { builtIn: builtIn, custom: custom, all: builtIn.concat(custom) };
  }

  function ternaryPercents(stage) {
    var n = parseFloat(stage.meq.N_NO3) || 0;
    var p = parseFloat(stage.meq.P) || 0;
    var s = parseFloat(stage.meq.S) || 0;
    var k = parseFloat(stage.meq.K) || 0;
    var ca = parseFloat(stage.meq.Ca) || 0;
    var mg = parseFloat(stage.meq.Mg) || 0;
    var an = n + p + s;
    var cat = k + ca + mg;
    return {
      pNO3: an > 0 ? (100 * n / an) : 0,
      pP: an > 0 ? (100 * p / an) : 0,
      pS: an > 0 ? (100 * s / an) : 0,
      pK: cat > 0 ? (100 * k / cat) : 0,
      pCa: cat > 0 ? (100 * ca / cat) : 0,
      pMg: cat > 0 ? (100 * mg / cat) : 0
    };
  }

  /** Barycentric → SVG point in equilateral triangle */
  function baryToXY(a, b, c, w, h, pad) {
    var tot = a + b + c;
    if (tot <= 0) { a = b = c = 1 / 3; tot = 1; }
    else { a /= tot; b /= tot; c /= tot; }
    var top = { x: w / 2, y: pad };
    var left = { x: pad, y: h - pad };
    var right = { x: w - pad, y: h - pad };
    return {
      x: a * top.x + b * left.x + c * right.x,
      y: a * top.y + b * left.y + c * right.y
    };
  }

  function renderMiniTernary(host, stage) {
    if (!host) return;
    if (!stage) {
      host.innerHTML = '<p class="hydro-muted">' + escapeAttr(t('Selecciona una etapa en la tabla.', 'Select a stage in the table.')) + '</p>';
      return;
    }
    var pct = ternaryPercents(stage);
    var w = 320;
    var h = 280;
    var pad = 28;
    var anPt = baryToXY(pct.pNO3, pct.pP, pct.pS, w, h, pad);
    var catPt = baryToXY(pct.pK, pct.pCa, pct.pMg, w, h, pad);
    var top = { x: w / 2, y: pad };
    var left = { x: pad, y: h - pad };
    var right = { x: w - pad, y: h - pad };
    host.innerHTML =
      '<div class="hydro-cycle-tern-info">' +
        t('Aniones', 'Anions') + ': N-NO₃⁻ ' + pct.pNO3.toFixed(1) + '% · P ' + pct.pP.toFixed(1) + '% · S ' + pct.pS.toFixed(1) + '% · ' +
        t('Cationes', 'Cations') + ': K⁺ ' + pct.pK.toFixed(1) + '% · Ca²⁺ ' + pct.pCa.toFixed(1) + '% · Mg²⁺ ' + pct.pMg.toFixed(1) + '%' +
      '</div>' +
      '<svg class="hydro-cycle-tern-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Ternary">' +
        '<polygon points="' + top.x + ',' + top.y + ' ' + left.x + ',' + left.y + ' ' + right.x + ',' + right.y + '" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>' +
        '<text x="' + top.x + '" y="' + (top.y - 8) + '" text-anchor="middle" font-size="11" fill="#64748b">N / K</text>' +
        '<text x="' + (left.x - 4) + '" y="' + (left.y + 14) + '" text-anchor="start" font-size="11" fill="#64748b">P / Ca</text>' +
        '<text x="' + (right.x + 4) + '" y="' + (right.y + 14) + '" text-anchor="end" font-size="11" fill="#64748b">S / Mg</text>' +
        '<rect x="' + (anPt.x - 5) + '" y="' + (anPt.y - 5) + '" width="10" height="10" fill="#eab308" stroke="#854d0e" stroke-width="1"/>' +
        '<circle cx="' + catPt.x + '" cy="' + catPt.y + '" r="6" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>' +
      '</svg>';
  }

  function paintTernary(host, stage, api, opts) {
    if (opts && typeof opts.renderTernary === 'function') {
      try {
        if (opts.renderTernary(host, stage, api) === true) return;
      } catch (e) { /* fallback */ }
    }
    renderMiniTernary(host, stage);
  }

  function ratioTxt(a, b) {
    var x = Number(a) || 0;
    var y = Number(b) || 0;
    if (y < 0.005) return x < 0.005 ? '—' : '∞';
    return (x / y).toFixed(2);
  }

  function pctPart(v, sum) {
    if (sum < 0.005) return '0';
    return ((100 * (Number(v) || 0) / sum)).toFixed(0);
  }

  /**
   * Orientación fenológica por relaciones (K/N, %K catiónico, %NO₃, CE).
   * Misma idea que el chat hidro: no es diagnóstico cerrado, solo lectura rápida.
   */
  function inferPhenologyFromMeq(stage) {
    var empty = {
      id: 'vacio',
      label: t('Sin datos', 'No data'),
      short: '—',
      color: '#cbd5e1',
      fill: 'rgba(148,163,184,0.12)',
      why: t('Captura meq para estimar el perfil.', 'Enter meq values to estimate the profile.')
    };
    if (!stage || !stage.meq) return empty;
    var no3 = parseFloat(stage.meq.N_NO3) || 0;
    var nh4 = parseFloat(stage.meq.N_NH4) || 0;
    var k = parseFloat(stage.meq.K) || 0;
    var ca = parseFloat(stage.meq.Ca) || 0;
    var mg = parseFloat(stage.meq.Mg) || 0;
    var p = parseFloat(stage.meq.P) || 0;
    var s = parseFloat(stage.meq.S) || 0;
    var nTotal = no3 + nh4;
    var sumCat = k + ca + mg;
    var sumAn = no3 + p + s;
    if (nTotal + sumCat + sumAn < 0.05) return empty;
    var ce = parseFloat(stage.ce);
    if (isNaN(ce)) ce = computeCE(stage);
    var kToN = nTotal > 0.01 ? k / nTotal : (k > 0 ? 99 : 0);
    var no3Pct = nTotal > 0.01 ? (100 * no3 / nTotal) : 0;
    var kPctCat = sumCat > 0.01 ? (100 * k / sumCat) : 0;

    var profiles = {
      vegetativa: {
        id: 'vegetativa',
        label: t('Vegetativa', 'Vegetative'),
        short: t('Veg', 'Veg'),
        color: '#16a34a',
        fill: 'rgba(22,163,74,0.14)'
      },
      floracion: {
        id: 'floracion',
        label: t('Floración', 'Flowering'),
        short: t('Flor', 'Flor'),
        color: '#d97706',
        fill: 'rgba(217,119,6,0.16)'
      },
      produccion: {
        id: 'produccion',
        label: t('Producción', 'Production'),
        short: t('Prod', 'Prod'),
        color: '#7c3aed',
        fill: 'rgba(124,58,237,0.14)'
      },
      transicion: {
        id: 'transicion',
        label: t('Prefloración', 'Pre-flowering'),
        short: t('Preflor', 'Preflor'),
        color: '#0284c7',
        fill: 'rgba(2,132,199,0.12)'
      }
    };

    var pick = profiles.transicion;
    var why = t('Perfil intermedio (K/N equilibrado): entre vegetativo y floración.', 'Intermediate profile (balanced K/N): between vegetative and flowering.');

    if (ce < 1.4 && kToN <= 0.85) {
      pick = profiles.vegetativa;
      why = t('CE baja y K/N bajo → empuje vegetativo / establecimiento.', 'Low EC and low K/N → vegetative / establishment push.');
    } else if (kToN < 0.95 && no3Pct >= 80) {
      pick = profiles.vegetativa;
      why = t('N (nítrico) domina frente a K → tipicamente vegetativo.', 'N (nitrate) dominates vs K → typically vegetative.');
    } else if (kToN > 1.45 && (ce >= 2.0 || kPctCat >= 38)) {
      pick = profiles.produccion;
      why = t('K/N alto y K fuerte en cationes → tipicamente producción / llenado.', 'High K/N and strong K in cations → typically production / filling.');
    } else if (kToN > 1.15 && kPctCat >= 34) {
      pick = profiles.floracion;
      why = t('K más protagonista (K/N y %K) → tipicamente floración / amarre.', 'K more dominant (K/N and %K) → typically flowering / fruit set.');
    } else if (kToN >= 0.9 && kToN <= 1.2) {
      pick = profiles.transicion;
      why = t('K/N equilibrado → prefloración (paso de vegetativo a floración).', 'Balanced K/N → pre-flowering (vegetative → flowering shift).');
    } else if (kToN <= 1.0) {
      pick = profiles.vegetativa;
      why = t('K/N ≤ 1 → sesgo vegetativo.', 'K/N ≤ 1 → vegetative bias.');
    } else {
      pick = profiles.floracion;
      why = t('K/N > 1 sin extremo → sesgo floración.', 'K/N > 1 without extremes → flowering bias.');
    }

    return Object.assign({}, pick, {
      why: why,
      kToN: kToN,
      kPctCat: kPctCat,
      no3Pct: no3Pct,
      ce: ce
    });
  }

  function meqRelationsHtml(stage) {
    if (!stage || !stage.meq) return '';
    var no3 = parseFloat(stage.meq.N_NO3) || 0;
    var p = parseFloat(stage.meq.P) || 0;
    var s = parseFloat(stage.meq.S) || 0;
    var k = parseFloat(stage.meq.K) || 0;
    var ca = parseFloat(stage.meq.Ca) || 0;
    var mg = parseFloat(stage.meq.Mg) || 0;
    var sumAn = no3 + p + s;
    var sumCat = k + ca + mg;
    var name = stage.name || '—';
    var ph = inferPhenologyFromMeq(stage);
    return (
      '<div class="hydro-cycle-tip hydro-cycle-tip--compact-inner">' +
      '<div class="hydro-cycle-tip-head">' + escapeAttr(name) +
        ' · CE ' + escapeAttr(String(stage.ce != null ? stage.ce : computeCE(stage))) +
        ' · <span style="color:' + ph.color + '">' + escapeAttr(ph.short) + '</span></div>' +
      '<div class="hydro-cycle-tip-grid hydro-cycle-tip-grid--compact">' +
        '<div class="hydro-cycle-tip-block hydro-cycle-tip-block--an">' +
          '<div class="hydro-cycle-tip-label">' + t('Aniones', 'Anions') +
            ' <span class="hydro-cycle-tip-muted">N:P:S ' + pctPart(no3, sumAn) + ':' + pctPart(p, sumAn) + ':' + pctPart(s, sumAn) + '%</span></div>' +
          '<div>NO₃/P <strong>' + ratioTxt(no3, p) + '</strong> · NO₃/S <strong>' + ratioTxt(no3, s) + '</strong> · P/S <strong>' + ratioTxt(p, s) + '</strong></div>' +
        '</div>' +
        '<div class="hydro-cycle-tip-block hydro-cycle-tip-block--cat">' +
          '<div class="hydro-cycle-tip-label">' + t('Cationes', 'Cations') +
            ' <span class="hydro-cycle-tip-muted">K:Ca:Mg ' + pctPart(k, sumCat) + ':' + pctPart(ca, sumCat) + ':' + pctPart(mg, sumCat) + '%</span></div>' +
          '<div>K/Ca <strong>' + ratioTxt(k, ca) + '</strong> · K/Mg <strong>' + ratioTxt(k, mg) + '</strong> · Ca/Mg <strong>' + ratioTxt(ca, mg) + '</strong></div>' +
        '</div>' +
        '<div class="hydro-cycle-tip-block hydro-cycle-tip-block--all">' +
          '<div class="hydro-cycle-tip-label">' + t('Balance', 'Balance') + '</div>' +
          '<div>Σan/Σcat <strong>' + ratioTxt(sumAn, sumCat) + '</strong> · K/N <strong>' + ratioTxt(k, no3) + '</strong> · N/K <strong>' + ratioTxt(no3, k) + '</strong></div>' +
        '</div>' +
      '</div></div>'
    );
  }

  function ppmRelationsHtml(stage) {
    if (!stage || !stage.ppm) return '';
    var fe = parseFloat(stage.ppm.Fe) || 0;
    var mn = parseFloat(stage.ppm.Mn) || 0;
    var zn = parseFloat(stage.ppm.Zn) || 0;
    var b = parseFloat(stage.ppm.B) || 0;
    var cu = parseFloat(stage.ppm.Cu) || 0;
    var mo = parseFloat(stage.ppm.Mo) || 0;
    var sum = fe + mn + zn + b + cu + mo;
    var sumMet = fe + mn + zn;
    var name = stage.name || '—';
    return (
      '<div class="hydro-cycle-tip hydro-cycle-tip--compact-inner">' +
      '<div class="hydro-cycle-tip-head">' + escapeAttr(name) +
        ' · Σmicros <strong>' + (sum > 0 ? sum.toFixed(2) : '0') + '</strong> ppm</div>' +
      '<div class="hydro-cycle-tip-grid hydro-cycle-tip-grid--compact">' +
        '<div class="hydro-cycle-tip-block hydro-cycle-tip-block--fe">' +
          '<div class="hydro-cycle-tip-label">' + t('Metales', 'Metals') +
            ' <span class="hydro-cycle-tip-muted">Fe:Mn:Zn ' + pctPart(fe, sumMet) + ':' + pctPart(mn, sumMet) + ':' + pctPart(zn, sumMet) + '%</span></div>' +
          '<div>Fe/Mn <strong>' + ratioTxt(fe, mn) + '</strong> · Fe/Zn <strong>' + ratioTxt(fe, zn) + '</strong> · Mn/Zn <strong>' + ratioTxt(mn, zn) + '</strong></div>' +
        '</div>' +
        '<div class="hydro-cycle-tip-block hydro-cycle-tip-block--b">' +
          '<div class="hydro-cycle-tip-label">' + t('Con B / Cu', 'With B / Cu') + '</div>' +
          '<div>Fe/B <strong>' + ratioTxt(fe, b) + '</strong> · Zn/B <strong>' + ratioTxt(zn, b) + '</strong> · Fe/Cu <strong>' + ratioTxt(fe, cu) + '</strong> · Zn/Cu <strong>' + ratioTxt(zn, cu) + '</strong></div>' +
        '</div>' +
        '<div class="hydro-cycle-tip-block hydro-cycle-tip-block--mo">' +
          '<div class="hydro-cycle-tip-label">' + t('Perfil', 'Profile') +
            ' <span class="hydro-cycle-tip-muted">% ' + t('del total', 'of total') + '</span></div>' +
          '<div>Fe <strong>' + pctPart(fe, sum) + '</strong>% · Mn <strong>' + pctPart(mn, sum) + '</strong>% · Zn <strong>' + pctPart(zn, sum) + '</strong>% · B <strong>' + pctPart(b, sum) + '</strong>% · Cu <strong>' + pctPart(cu, sum) + '</strong>% · Mo <strong>' + pctPart(mo, sum) + '</strong>%</div>' +
        '</div>' +
      '</div></div>'
    );
  }

  function lineChartSvg(labels, series, yLabel, opts) {
    opts = opts || {};
    var w = 640;
    var h = 280;
    var padL = 44;
    var padR = 16;
    var padT = 16;
    var showPheno = !!opts.showPheno;
    var showRelations = !!opts.showRelations;
    var padB = (showRelations || showPheno) ? 52 : 40;
    var n = labels.length;
    if (n < 1) return '<p class="hydro-muted">' + escapeAttr(t('Agrega etapas para ver la gráfica.', 'Add stages to see the chart.')) + '</p>';
    var allVals = [];
    series.forEach(function (s) {
      (s.data || []).forEach(function (v) { allVals.push(Number(v) || 0); });
    });
    var yMax = Math.max.apply(null, allVals.concat([1]));
    yMax = yMax * 1.15 || 1;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    function xAt(i) {
      return padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    }
    function yAt(v) {
      return padT + plotH - ((Number(v) || 0) / yMax) * plotH;
    }
    var bandHalf = n === 1 ? plotW * 0.28 : Math.min(52, plotW / Math.max(1, n - 1) * 0.42);
    var bands = '';
    var stageTags = '';
    if (showPheno && Array.isArray(opts.stages)) {
      opts.stages.forEach(function (st, i) {
        var ph = inferPhenologyFromMeq(st);
        var cx = xAt(i);
        bands += '<rect x="' + (cx - bandHalf) + '" y="' + padT + '" width="' + (bandHalf * 2) + '" height="' + plotH +
          '" fill="' + ph.fill + '" stroke="' + ph.color + '" stroke-width="0.8" stroke-opacity="0.35" rx="6"/>';
        stageTags += '<rect x="' + (cx - 22) + '" y="' + (h - 36) + '" width="44" height="14" rx="7" fill="' + ph.color + '"/>' +
          '<text x="' + cx + '" y="' + (h - 26) + '" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">' +
          escapeAttr(ph.short) + '</text>';
      });
    }
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var gy = padT + (plotH * g / 4);
      var gv = yMax * (1 - g / 4);
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="#e2e8f0" stroke-width="1"/>';
      grid += '<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="10" fill="#94a3b8">' + gv.toFixed(1) + '</text>';
    }
    var paths = '';
    series.forEach(function (s) {
      var pts = (s.data || []).map(function (v, i) { return xAt(i) + ',' + yAt(v); }).join(' ');
      var color = s.color || '#2563eb';
      var isAnion = s.group === 'anion';
      var isCation = s.group === 'cation';
      var dash = isCation ? ' stroke-dasharray="7 5"' : '';
      var sw = isAnion || isCation ? '2.6' : '2.8';
      paths += '<polyline fill="none" stroke="' + color + '" stroke-width="' + sw + '"' + dash +
        ' stroke-linecap="round" stroke-linejoin="round" points="' + pts + '"/>';
      (s.data || []).forEach(function (v, i) {
        var cx = xAt(i);
        var cy = yAt(v);
        if (isAnion) {
          // Cuadrado (igual que el ternario: aniones)
          paths += '<rect x="' + (cx - 4.5) + '" y="' + (cy - 4.5) + '" width="9" height="9" rx="1.2" fill="' + color +
            '" stroke="#fff" stroke-width="1.5"/>';
        } else {
          // Bolita (cationes / micros)
          paths += '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="' + color + '" stroke="#fff" stroke-width="1.6"/>';
        }
      });
    });
    var xLabels = labels.map(function (lab, i) {
      return '<text x="' + xAt(i) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#475569">' + escapeAttr(lab) + '</text>';
    }).join('');
    var hasIonGroups = series.some(function (s) { return s.group === 'anion' || s.group === 'cation'; });
    var legend = series.map(function (s) {
      var color = s.color || '#2563eb';
      var mark;
      if (s.group === 'anion') {
        mark = '<i style="width:9px;height:9px;border-radius:1.5px;background:' + color +
          ';display:inline-block;box-shadow:0 0 0 1px #fff,0 0 0 2px ' + color + ';"></i>';
      } else if (s.group === 'cation') {
        mark = '<i style="width:10px;height:10px;border-radius:50%;background:' + color +
          ';display:inline-block;box-shadow:0 0 0 1px #fff;"></i>' +
          '<i style="width:12px;height:0;border-top:2px dashed ' + color + ';display:inline-block;margin-left:2px;"></i>';
      } else {
        mark = '<i style="width:10px;height:10px;border-radius:50%;background:' + color + ';display:inline-block;"></i>';
      }
      return '<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:11px;color:#334155;">' +
        mark + escapeAttr(s.label) + '</span>';
    }).join('');
    if (hasIonGroups) {
      legend +=
        '<span class="hydro-cycle-ion-key" style="display:inline-flex;align-items:center;gap:10px;margin-left:4px;font-size:10px;color:#64748b;">' +
          '<span style="display:inline-flex;align-items:center;gap:4px;">' +
            '<i style="width:8px;height:8px;background:#eab308;display:inline-block;border-radius:1px;"></i>' +
            '<span style="border-top:2px solid #64748b;width:14px;display:inline-block;"></span> ' +
            escapeAttr(t('Aniones', 'Anions')) +
          '</span>' +
          '<span style="display:inline-flex;align-items:center;gap:4px;">' +
            '<i style="width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;"></i>' +
            '<span style="border-top:2px dashed #64748b;width:14px;display:inline-block;"></span> ' +
            escapeAttr(t('Cationes', 'Cations')) +
          '</span>' +
        '</span>';
    }
    var phenoLegend = '';
    if (showPheno) {
      phenoLegend =
        '<div class="hydro-cycle-pheno-legend">' +
          '<span class="hydro-cycle-pheno-chip" style="--c:#16a34a">' + t('Vegetativa', 'Vegetative') + '</span>' +
          '<span class="hydro-cycle-pheno-chip" style="--c:#0284c7">' + t('Prefloración', 'Pre-flowering') + '</span>' +
          '<span class="hydro-cycle-pheno-chip" style="--c:#d97706">' + t('Floración', 'Flowering') + '</span>' +
          '<span class="hydro-cycle-pheno-chip" style="--c:#7c3aed">' + t('Producción', 'Production') + '</span>' +
          '<span class="hydro-cycle-pheno-note">' + t(
            'Sombras = perfil estimado por K/N (orientativo). Azul = prefloración (equilibrio N–K).',
            'Shades = profile estimated from K/N (indicative). Blue = pre-flowering (N–K balance).'
          ) + '</span>' +
        '</div>';
    }
    var guide = showRelations
      ? '<line class="hydro-cycle-chart-guide" x1="' + xAt(0) + '" y1="' + padT + '" x2="' + xAt(0) + '" y2="' + (padT + plotH) + '" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 3" opacity="0"/>'
      : '';
    var hitPads = '';
    if (showRelations) {
      for (var i = 0; i < n; i++) {
        var hx = xAt(i);
        var hw = n === 1 ? plotW : Math.max(28, plotW / Math.max(1, n - 1));
        hitPads += '<rect class="hydro-cycle-chart-hit" data-stage-idx="' + i + '" x="' + (hx - hw / 2) + '" y="' + padT + '" width="' + hw + '" height="' + plotH + '" fill="transparent"/>';
      }
    }
    var svg =
      '<svg class="hydro-cycle-line-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeAttr(yLabel) + '">' +
      bands + grid + paths + guide + stageTags + xLabels + hitPads +
      '<text x="12" y="' + (padT + plotH / 2) + '" transform="rotate(-90 12 ' + (padT + plotH / 2) + ')" text-anchor="middle" font-size="11" fill="#64748b">' + escapeAttr(yLabel) + '</text>' +
      '</svg>';

    if (!showRelations) {
      return '<div class="hydro-cycle-chart-legend">' + legend + '</div>' + phenoLegend + svg;
    }

    var wrapAttr = opts.wrapAttr || 'data-hydro-meq-chart';
    var hint = opts.hint || t(
      'Pasa el cursor por una etapa: relaciones + perfil fenológico estimado.',
      'Hover a stage: ratios + estimated phenology profile.'
    );

    return (
      '<div class="hydro-cycle-chart-legend">' + legend + '</div>' +
      phenoLegend +
      '<p class="hydro-cycle-chart-hint">' + escapeAttr(hint) + '</p>' +
      '<div class="hydro-cycle-chart-interactive" ' + wrapAttr + '>' +
        svg +
        '<div class="hydro-cycle-chart-tip hydro-cycle-chart-tip--compact" hidden></div>' +
      '</div>'
    );
  }

  function bindChartRelations(host, stages, htmlBuilder, wrapSelector) {
    if (!host || typeof htmlBuilder !== 'function') return;
    var wrap = host.querySelector(wrapSelector || '[data-hydro-meq-chart]');
    if (!wrap || wrap._bound) return;
    wrap._bound = true;
    var tip = wrap.querySelector('.hydro-cycle-chart-tip');
    var svg = wrap.querySelector('svg');
    var guide = wrap.querySelector('.hydro-cycle-chart-guide');
    if (!tip || !svg) return;

    function showAt(idx, clientX, clientY) {
      var stage = stages[idx];
      if (!stage) return;
      tip.hidden = false;
      tip.innerHTML = htmlBuilder(stage);
      wrap.classList.add('is-tip-open');
      var tipHost = wrap.closest('.hydro-table-block');
      if (tipHost) tipHost.classList.add('hydro-cycle-tip-host');
      if (guide) {
        var n = stages.length;
        var padL = 44;
        var padR = 16;
        var plotW = 640 - padL - padR;
        var x = padL + (n === 1 ? plotW / 2 : (idx / (n - 1)) * plotW);
        guide.setAttribute('x1', String(x));
        guide.setAttribute('x2', String(x));
        guide.setAttribute('opacity', '1');
      }
      var rect = wrap.getBoundingClientRect();
      var left = clientX - rect.left + 10;
      var top = clientY - rect.top + 10;
      tip.style.left = '0px';
      tip.style.top = '0px';
      var tw = tip.offsetWidth || 220;
      var th = tip.offsetHeight || 90;
      if (left + tw > rect.width - 6) left = Math.max(6, rect.width - tw - 6);
      if (top + th > rect.height - 6) top = Math.max(6, clientY - rect.top - th - 10);
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }

    function hide() {
      tip.hidden = true;
      wrap.classList.remove('is-tip-open');
      var tipHost = wrap.closest('.hydro-table-block');
      if (tipHost) tipHost.classList.remove('hydro-cycle-tip-host');
      if (guide) guide.setAttribute('opacity', '0');
    }

    wrap.addEventListener('mousemove', function (ev) {
      var hit = ev.target.closest && ev.target.closest('[data-stage-idx]');
      if (!hit) {
        var pt = svg.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        var ctm = svg.getScreenCTM();
        if (!ctm) { hide(); return; }
        var sp = pt.matrixTransform(ctm.inverse());
        var n = stages.length;
        var padL = 44;
        var padR = 16;
        var plotW = 640 - padL - padR;
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < n; i++) {
          var x = padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
          var d = Math.abs(sp.x - x);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (sp.x < padL - 20 || sp.x > 640 - padR + 20) { hide(); return; }
        showAt(best, ev.clientX, ev.clientY);
        return;
      }
      var idx = parseInt(hit.getAttribute('data-stage-idx'), 10);
      if (isNaN(idx)) { hide(); return; }
      showAt(idx, ev.clientX, ev.clientY);
    });
    wrap.addEventListener('mouseleave', hide);
  }

  function renderCharts(hostMeq, hostPpm, stages) {
    var labels = stages.map(function (s) { return s.name || '—'; });
    var meqSeries = [
      { label: 'N-NO₃⁻', color: COLORS.N_NO3, group: 'anion', data: stages.map(function (s) { return parseFloat(s.meq.N_NO3) || 0; }) },
      { label: 'P', color: COLORS.P, group: 'anion', data: stages.map(function (s) { return parseFloat(s.meq.P) || 0; }) },
      { label: 'S', color: COLORS.S, group: 'anion', data: stages.map(function (s) { return parseFloat(s.meq.S) || 0; }) },
      { label: 'K⁺', color: COLORS.K, group: 'cation', data: stages.map(function (s) { return parseFloat(s.meq.K) || 0; }) },
      { label: 'Ca²⁺', color: COLORS.Ca, group: 'cation', data: stages.map(function (s) { return parseFloat(s.meq.Ca) || 0; }) },
      { label: 'Mg²⁺', color: COLORS.Mg, group: 'cation', data: stages.map(function (s) { return parseFloat(s.meq.Mg) || 0; }) }
    ];
    var ppmSeries = MICROS.map(function (k) {
      return { label: k, color: COLORS[k], data: stages.map(function (s) { return parseFloat(s.ppm[k]) || 0; }) };
    });
    if (hostMeq) {
      hostMeq.innerHTML = lineChartSvg(labels, meqSeries, 'meq/L', {
        showRelations: true,
        showPheno: true,
        stages: stages,
        wrapAttr: 'data-hydro-meq-chart',
        hint: t(
          'Pasa el cursor por una etapa: relaciones + perfil fenológico.',
          'Hover a stage: ratios + phenology profile.'
        )
      });
      bindChartRelations(hostMeq, stages, meqRelationsHtml, '[data-hydro-meq-chart]');
    }
    if (hostPpm) {
      hostPpm.innerHTML = lineChartSvg(labels, ppmSeries, 'ppm', {
        showRelations: true,
        showPheno: false,
        stages: stages,
        wrapAttr: 'data-hydro-ppm-chart',
        hint: t(
          'Pasa el cursor por una etapa: relaciones entre micros (ppm).',
          'Hover a stage: micronutrient ratios (ppm).'
        )
      });
      bindChartRelations(hostPpm, stages, ppmRelationsHtml, '[data-hydro-ppm-chart]');
    }
  }

  function applyRecipeToStage(stage, recipe) {
    if (!stage || !recipe) return;
    var cat = root.NpHydroSolutionCatalog;
    if (cat && cat.apply) cat.apply(recipe, stage);
    else {
      stage.name = recipe.name || stage.name;
      stage.solutionId = recipe.id || '';
      stage.meq = Object.assign({}, stage.meq, recipe.meq || {});
      stage.ppm = Object.assign({}, stage.ppm, recipe.ppm || {});
    }
    syncMacroPpm(stage);
    stage.ce = String(computeCE(stage));
  }

  function openCatalogForStage(stageId, api) {
    var bags = getAllCatalogSolutions();
    var cat = root.NpHydroSolutionCatalog;
    var stage = api.getStage(stageId);
    var selectedId = stage && stage.solutionId ? stage.solutionId : '';

    function rowHtml(recipe, custom) {
      var isSelected = selectedId && recipe.id === selectedId;
      var chooseCls = 'hydro-solution-modal__choose' + (isSelected ? ' is-selected' : '');
      var chooseLabel = isSelected ? t('Seleccionado', 'Selected') : t('Elegir', 'Choose');
      return '<tr class="' + (custom ? 'hydro-cycle-catalog-custom' : '') + '" data-hydro-recipe-id="' + escapeAttr(recipe.id) + '">' +
        '<td><strong>' + escapeAttr(recipe.name) + '</strong>' + (custom ? ' <small>(' + t('propia', 'custom') + ')</small>' : '') + '</td>' +
        MACROS.map(function (k) { return '<td>' + (recipe.meq && recipe.meq[k] != null ? recipe.meq[k] : 0) + '</td>'; }).join('') +
        MICROS.map(function (k) { return '<td>' + (recipe.ppm && recipe.ppm[k] != null ? recipe.ppm[k] : 0) + '</td>'; }).join('') +
        '<td><button type="button" class="' + chooseCls + '" data-hydro-cycle-choose="' + escapeAttr(recipe.id) + '">' + chooseLabel + '</button></td></tr>';
    }

    var litRows = bags.builtIn.map(function (r) { return rowHtml(r, false); }).join('');
    var myRows = bags.custom.map(function (r) { return rowHtml(r, true); }).join('');
    var sep = bags.custom.length
      ? '<tr class="hydro-cycle-catalog-sep"><td colspan="' + (MACROS.length + MICROS.length + 2) + '"><strong>' + t('Mis soluciones', 'My solutions') + '</strong> — ' +
        (isDashboardEmbed()
          ? t('cuenta / nube, sin límite', 'account / cloud, no limit')
          : (bags.custom.length + '/' + FREE_CUSTOM_SOLUTION_LIMIT + ' · ' + t('límite versión gratis', 'free version limit'))) +
        '</td></tr>'
      : '';
    var litSep = '<tr class="hydro-cycle-catalog-sep"><td colspan="' + (MACROS.length + MICROS.length + 2) + '"><strong>' + t('Literatura', 'Literature') + '</strong></td></tr>';

    var overlay = document.createElement('div');
    overlay.className = 'hydro-solution-modal';
    overlay.innerHTML = '<section class="hydro-solution-modal__card" role="dialog" aria-modal="true">' +
      '<div class="hydro-solution-modal__head"><div><h2>' + t('Catálogo de soluciones nutritivas', 'Nutrient solution catalog') + '</h2><p>' + t('Macros en meq/L y micros en ppm. Elegir copia valores a la etapa (puedes editar después).', 'Macros in meq/L and micros in ppm. Choose copies values into the stage (you can edit after).') + '</p></div><button type="button" data-hydro-catalog-close aria-label="Close">×</button></div>' +
      '<div class="hydro-table-scroll"><table class="hydro-solution-modal__table"><thead><tr><th>' + t('Solución', 'Solution') + '</th>' +
      MACROS.map(function (k) { return '<th>' + labelMacro(k) + '<br>meq/L</th>'; }).join('') +
      MICROS.map(function (k) { return '<th>' + k + '<br>ppm</th>'; }).join('') +
      '<th></th></tr></thead><tbody>' + litSep + litRows + sep + myRows + '</tbody></table></div></section>';

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay || ev.target.closest('[data-hydro-catalog-close]')) {
        overlay.remove();
        return;
      }
      var btn = ev.target.closest('[data-hydro-cycle-choose]');
      if (!btn) return;
      var id = btn.getAttribute('data-hydro-cycle-choose');
      var recipe = bags.all.find(function (r) { return r.id === id; });
      var st = api.getStage(stageId);
      if (recipe && st) {
        var keepName = st.name;
        applyRecipeToStage(st, recipe);
        // Conservar el título de etapa del programa; el nombre del catálogo queda en solutionId
        if (keepName) st.name = keepName;
        api.render();
        api.persist();
      }
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function saveCycleProgramToCatalog(api) {
    if (!api) return;
    var snap = api.snapshot();
    if (!snap.stages || !snap.stages.length) {
      window.alert(t('Agrega al menos una etapa antes de guardar.', 'Add at least one stage before saving.'));
      return;
    }
    var st = api.getState && api.getState();
    var suggested = '';
    if (st && st.programName) suggested = st.programName;
    var name = window.prompt(
      t(
        'Título del programa. Mismo título = actualiza ese; título NUEVO = se agrega otro (no borra el anterior):',
        'Program title. Same title = update that one; NEW title = adds another (does not delete the previous):'
      ),
      suggested
    );
    if (name == null) return;
    name = String(name).trim();
    if (!name) {
      window.alert(t('Necesitas un título para guardar el programa.', 'You need a title to save the program.'));
      return;
    }
    var items = loadCustomCyclePrograms();
    var nameKey = name.toLowerCase();
    // Solo actualizar si ya existe uno con EL MISMO título.
    // Si cambias el título (ej. 1.3 → 1.4), se crea uno NUEVO (antes pisaba el viejo por programId).
    var idx = items.findIndex(function (it) {
      return String(it.name || '').toLowerCase() === nameKey;
    });
    var entry = {
      id: idx >= 0
        ? items[idx].id
        : ('cycleprog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
      name: name,
      type: 'cycle',
      stages: snap.stages.map(function (s) {
        return {
          id: s.id,
          name: s.name,
          solutionId: s.solutionId || '',
          ce: s.ce,
          meq: Object.assign({}, s.meq),
          ppm: Object.assign({}, s.ppm)
        };
      }),
      activeStageId: snap.activeStageId,
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      items[idx] = entry;
    } else {
      items.push(entry);
    }
    if (st) {
      st.programId = entry.id;
      st.programName = entry.name;
    }
    saveCustomCyclePrograms(items);
    if (api && api.onCatalogSaved) api.onCatalogSaved(entry);
    try {
      openCycleProgramsCatalog(api);
    } catch (eOpen) {
      if (window.showMessage) {
        window.showMessage(
          t(
            'Programa guardado. También aparece en el catálogo del dashboard (Solución nutritiva → botón verde), por etapa.',
            'Program saved. It also appears in the dashboard catalog (Nutrient solution → green button), by stage.'
          ),
          'success'
        );
      } else {
        window.alert(
          t(
            'Programa guardado. También aparece en el catálogo del dashboard (Solución nutritiva → botón verde), por etapa.',
            'Program saved. It also appears in the dashboard catalog (Nutrient solution → green button), by stage.'
          )
        );
      }
    }
  }

  function openCycleProgramPreview(prog, api, onBack) {
    var overlay = document.createElement('div');
    overlay.className = 'hydro-solution-modal';
    var stages = (prog && prog.stages) || [];
    var stageRows = stages.length
      ? stages.map(function (s, i) {
          var meq = s.meq || {};
          var ppm = s.ppm || {};
          return '<tr><td><strong>' + escapeAttr(s.name || (t('Etapa', 'Stage') + ' ' + (i + 1))) + '</strong></td>' +
            '<td>' + escapeAttr(String(s.ce != null ? s.ce : '')) + '</td>' +
            MACROS.map(function (k) {
              return '<td>' + escapeAttr(String(round2(meq[k] || 0))) + '</td>';
            }).join('') +
            MICROS.map(function (k) {
              return '<td>' + escapeAttr(String(round2(ppm[k] || 0))) + '</td>';
            }).join('') + '</tr>';
        }).join('')
      : '<tr><td colspan="' + (2 + MACROS.length + MICROS.length) + '" class="hydro-muted">' +
        escapeAttr(t('Este programa no tiene etapas.', 'This program has no stages.')) + '</td></tr>';

    overlay.innerHTML = '<section class="hydro-solution-modal__card" role="dialog" aria-modal="true">' +
      '<div class="hydro-solution-modal__head"><div><h2>' + escapeAttr(t('Vista del programa', 'Program preview')) + ': ' + escapeAttr(prog.name || '') + '</h2><p>' +
      t('Macros en meq/L y micros en ppm (Fe, Mn, Zn, B, Cu, Mo). Desplaza la tabla a la derecha si hace falta. «Usar en la tabla» lo pone en ETAPAS DEL CICLO.', 'Macros in meq/L and micros in ppm (Fe, Mn, Zn, B, Cu, Mo). Scroll the table right if needed. “Use in table” puts it into CYCLE STAGES.') +
      '</p></div><button type="button" data-hydro-catalog-close aria-label="Close">×</button></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px;">' +
      '<button type="button" class="hydro-cycle-btn" data-cycle-prog-back>' + t('← Volver a la lista', '← Back to list') + '</button> ' +
      '<button type="button" class="hydro-solution-modal__choose" data-cycle-prog-load="' + escapeAttr(prog.id) + '">' +
      t('Usar en la tabla de etapas', 'Use in stages table') + '</button></div>' +
      '<div class="hydro-table-scroll" style="overflow:auto;max-width:100%;"><table class="hydro-solution-modal__table"><thead><tr>' +
      '<th>' + t('Etapa', 'Stage') + '</th><th>CE</th>' +
      MACROS.map(function (k) { return '<th>' + escapeAttr(k) + '<br><small>meq/L</small></th>'; }).join('') +
      MICROS.map(function (k) { return '<th>' + escapeAttr(k) + '<br><small>ppm</small></th>'; }).join('') +
      '</tr></thead><tbody>' + stageRows + '</tbody></table></div></section>';

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay || ev.target.closest('[data-hydro-catalog-close]')) {
        overlay.remove();
        return;
      }
      if (ev.target.closest('[data-cycle-prog-back]')) {
        overlay.remove();
        if (typeof onBack === 'function') onBack();
        return;
      }
      var loadBtn = ev.target.closest('[data-cycle-prog-load]');
      if (!loadBtn || !api) return;
      var st = api.getState();
      st.stages = stages.map(function (s, i) { return normalizeStage(s, i); });
      if (!st.stages.length) st.stages = [normalizeStage({ name: defaultStageName(1) }, 0)];
      st.activeStageId = prog.activeStageId && st.stages.some(function (s) { return s.id === prog.activeStageId; })
        ? prog.activeStageId
        : st.stages[0].id;
      st.programId = prog.id;
      st.programName = prog.name;
      api.render();
      api.persist();
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function openCycleProgramsCatalog(api) {
    var items = loadCustomCyclePrograms();
    var overlay = document.createElement('div');
    overlay.className = 'hydro-solution-modal';
    var rows = items.length
      ? items.map(function (p) {
          var n = (p.stages && p.stages.length) || 0;
          return '<tr data-cycle-prog-id="' + escapeAttr(p.id) + '">' +
            '<td><strong>' + escapeAttr(p.name) + '</strong><br><small>' + n + ' ' + t('etapas', 'stages') + '</small></td>' +
            '<td style="white-space:nowrap;">' +
            '<button type="button" class="hydro-cycle-btn" data-cycle-prog-view="' + escapeAttr(p.id) + '" title="' +
            escapeAttr(t('Ver las etapas y valores guardados', 'View saved stages and values')) + '">' +
            t('Ver programa', 'View program') + '</button> ' +
            '<button type="button" class="hydro-solution-modal__choose" data-cycle-prog-load="' + escapeAttr(p.id) + '" title="' +
            escapeAttr(t('Pone este programa en la tabla ETAPAS DEL CICLO (detrás de esta ventana)', 'Puts this program into the CYCLE STAGES table (behind this window)')) + '">' +
            t('Usar en la tabla', 'Use in table') + '</button> ' +
            '<button type="button" class="hydro-cycle-btn hydro-cycle-btn--danger" data-cycle-prog-del="' + escapeAttr(p.id) + '">' + t('Eliminar', 'Delete') + '</button></td></tr>';
        }).join('')
      : '<tr><td colspan="2" class="hydro-muted">' + escapeAttr(t('Aún no tienes programas guardados. Usa «Al catálogo» para guardar toda la tabla.', 'You have no saved programs yet. Use “To catalog” to save the whole table.')) + '</td></tr>';

    overlay.innerHTML = '<section class="hydro-solution-modal__card" role="dialog" aria-modal="true">' +
      '<div class="hydro-solution-modal__head"><div><h2>' + t('Mis programas del ciclo', 'My cycle programs') + '</h2><p>' +
      t('Esto no abre otra pantalla. «Ver programa» muestra cómo quedó. «Usar en la tabla» reemplaza las filas de ETAPAS DEL CICLO detrás de esta ventana.', 'This does not open another screen. “View program” shows how it was saved. “Use in table” replaces the CYCLE STAGES rows behind this window.') +
      '</p></div><button type="button" data-hydro-catalog-close aria-label="Close">×</button></div>' +
      '<div class="hydro-table-scroll"><table class="hydro-solution-modal__table"><thead><tr><th>' + t('Programa', 'Program') + '</th><th>' + t('Acciones', 'Actions') + '</th></tr></thead><tbody>' +
      rows + '</tbody></table></div></section>';

    function applyProgram(prog) {
      if (!prog || !api) return;
      var st = api.getState();
      st.stages = (prog.stages || []).map(function (s, i) { return normalizeStage(s, i); });
      if (!st.stages.length) st.stages = [normalizeStage({ name: defaultStageName(1) }, 0)];
      st.activeStageId = prog.activeStageId && st.stages.some(function (s) { return s.id === prog.activeStageId; })
        ? prog.activeStageId
        : st.stages[0].id;
      st.programId = prog.id;
      st.programName = prog.name;
      api.render();
      api.persist();
    }

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay || ev.target.closest('[data-hydro-catalog-close]')) {
        overlay.remove();
        return;
      }
      var del = ev.target.closest('[data-cycle-prog-del]');
      if (del) {
        var delId = del.getAttribute('data-cycle-prog-del');
        var next = loadCustomCyclePrograms().filter(function (it) { return it.id !== delId; });
        saveCustomCyclePrograms(next);
        overlay.remove();
        openCycleProgramsCatalog(api);
        return;
      }
      var viewBtn = ev.target.closest('[data-cycle-prog-view]');
      if (viewBtn) {
        var viewId = viewBtn.getAttribute('data-cycle-prog-view');
        var viewProg = loadCustomCyclePrograms().find(function (it) { return it.id === viewId; });
        if (!viewProg) return;
        overlay.remove();
        openCycleProgramPreview(viewProg, api, function () { openCycleProgramsCatalog(api); });
        return;
      }
      var loadBtn = ev.target.closest('[data-cycle-prog-load]');
      if (!loadBtn) return;
      var id = loadBtn.getAttribute('data-cycle-prog-load');
      var prog = loadCustomCyclePrograms().find(function (it) { return it.id === id; });
      applyProgram(prog);
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function saveStageToCatalog(stage, api) {
    // Legacy: una sola etapa como solución nutritiva (ya no se usa en UI del ciclo).
    if (!stage) return;
    var name = String(stage.name || '').trim();
    if (!name) {
      window.alert(t('Ponle un título a la etapa antes de guardarla en el catálogo.', 'Give the stage a title before saving it to the catalog.'));
      return;
    }
    syncMacroPpm(stage);
    var items = loadCustomSolutions();
    var entry = {
      id: stage.solutionId && String(stage.solutionId).indexOf('solution_') === 0
        ? stage.solutionId
        : ('solution_' + Date.now()),
      name: name,
      source: 'Personalizada',
      meq: Object.assign({}, stage.meq),
      ppm: {},
      updatedAt: new Date().toISOString()
    };
    MICROS.forEach(function (k) { entry.ppm[k] = round2(stage.ppm[k]); });
    var cat = root.NpHydroSolutionCatalog;
    if (cat) entry = cat.normalize(entry);
    var idx = items.findIndex(function (it) { return it.id === entry.id || it.name === entry.name; });
    if (idx >= 0) {
      entry.id = items[idx].id;
      items[idx] = entry;
    } else {
      var gate = canAddCustomSolution(items, null);
      if (!gate.ok) {
        window.alert(t(
          'En la versión gratis puedes guardar hasta ' + gate.limit + ' soluciones propias (' + gate.count + '/' + gate.limit + '). En el dashboard (con cuenta) no hay límite y se guardan en la nube.',
          'In the free version you can save up to ' + gate.limit + ' custom solutions (' + gate.count + '/' + gate.limit + '). In the dashboard (with an account) there is no limit and they sync to the cloud.'
        ));
        return;
      }
      items.push(entry);
    }
    stage.solutionId = entry.id;
    saveCustomSolutions(items);
    if (api && api.onCatalogSaved) api.onCatalogSaved(entry);
    if (window.showMessage) window.showMessage(t('Guardada en tu catálogo de soluciones.', 'Saved to your nutrient solution catalog.'), 'success');
    else window.alert(t('Guardada en tu catálogo de soluciones.', 'Saved to your nutrient solution catalog.'));
  }

  function createApi(opts) {
    opts = opts || {};
    var state = {
      stages: Array.isArray(opts.stages) && opts.stages.length
        ? opts.stages.map(function (s, i) {
            var st = normalizeStage(s, i);
            // Migrar placeholder antiguo del feature
            if (/^vegetativ[ao]?$/i.test(st.name) || /^vegetative$/i.test(st.name) || /^vegeta$/i.test(st.name)) {
              st.name = defaultStageName(i + 1);
            }
            return st;
          })
        : [normalizeStage({ name: defaultStageName(1) }, 0)],
      activeStageId: opts.activeStageId || null,
      programId: opts.programId || '',
      programName: opts.programName || ''
    };
    if (!state.activeStageId || !state.stages.some(function (s) { return s.id === state.activeStageId; })) {
      state.activeStageId = state.stages[0].id;
    }

    var api = {
      getState: function () { return state; },
      getStage: function (id) {
        return state.stages.find(function (s) { return s.id === id; }) || null;
      },
      getActive: function () {
        return api.getStage(state.activeStageId) || state.stages[0];
      },
      setStages: function (stages, activeId) {
        state.stages = (stages || []).map(normalizeStage);
        if (!state.stages.length) state.stages = [normalizeStage({ name: defaultStageName(1) }, 0)];
        state.activeStageId = activeId && state.stages.some(function (s) { return s.id === activeId; })
          ? activeId
          : state.stages[0].id;
      },
      persist: function () {
        if (typeof opts.onChange === 'function') opts.onChange(api.snapshot());
      },
      refreshCharts: function () {
        var rootEl = opts.root;
        if (!rootEl) return;
        renderCharts(
          rootEl.querySelector('[data-hydro-cycle-chart-meq]'),
          rootEl.querySelector('[data-hydro-cycle-chart-ppm]'),
          state.stages
        );
      },
      /** Actualiza ternario + gráficas sin rearmar la tabla (evita parpadeo al cambiar de pestaña). */
      refreshVisuals: function () {
        var rootEl = opts.root;
        if (!rootEl) return;
        var tableHost = rootEl.querySelector('[data-hydro-cycle-table]');
        if (!tableHost || !tableHost.querySelector('.hydro-cycle-table')) {
          api.render();
          return;
        }
        paintTernary(rootEl.querySelector('[data-hydro-cycle-ternary]'), api.getActive(), api, opts);
        renderCharts(
          rootEl.querySelector('[data-hydro-cycle-chart-meq]'),
          rootEl.querySelector('[data-hydro-cycle-chart-ppm]'),
          state.stages
        );
      },
      snapshot: function () {
        return {
          stages: state.stages.map(function (s) {
            return {
              id: s.id,
              name: s.name,
              solutionId: s.solutionId || '',
              ce: s.ce,
              meq: Object.assign({}, s.meq),
              ppm: Object.assign({}, s.ppm)
            };
          }),
          activeStageId: state.activeStageId,
          programId: state.programId || '',
          programName: state.programName || ''
        };
      },
      onCatalogSaved: opts.onCatalogSaved || null,
      render: function () {
        var rootEl = opts.root;
        if (!rootEl) return;
        var tableHost = rootEl.querySelector('[data-hydro-cycle-table]');
        var ternHost = rootEl.querySelector('[data-hydro-cycle-ternary]');
        var meqChart = rootEl.querySelector('[data-hydro-cycle-chart-meq]');
        var ppmChart = rootEl.querySelector('[data-hydro-cycle-chart-ppm]');
        if (tableHost) {
          var head =
            '<thead><tr>' +
            '<th>' + t('Etapa', 'Stage') + '</th>' +
            '<th>' + t('CE', 'EC') + '</th>' +
            MACROS.map(function (k) {
              return '<th class="' + colClassMacro(k) + '">' + labelMacro(k) + '<br><span class="hydro-th-unit">meq/L</span></th>';
            }).join('') +
            MICROS.map(function (k, idx) {
              return '<th class="' + colClassMicro(k, idx) + '">' + k + '<br><span class="hydro-th-unit">ppm</span></th>';
            }).join('') +
            '<th></th></tr></thead>';
          var body = state.stages.map(function (s) {
            var active = s.id === state.activeStageId ? ' is-active' : '';
            syncMacroPpm(s);
            s.ce = String(computeCE(s));
            return '<tr class="hydro-cycle-row' + active + '" data-cycle-stage="' + escapeAttr(s.id) + '">' +
              '<td class="hydro-cycle-stage-cell">' +
                '<span class="hydro-cycle-active-mark" title="' + escapeAttr(t('Etapa activa', 'Active stage')) + '" aria-hidden="true">✓</span>' +
                '<input type="text" class="hydro-input hydro-cycle-name" data-cycle-field="name" value="' + escapeAttr(s.name) + '" placeholder="' + escapeAttr(defaultStageName(1)) + '">' +
              '</td>' +
              '<td><span class="hydro-cycle-ce">' + escapeAttr(s.ce) + '</span></td>' +
              MACROS.map(function (k) {
                return '<td class="' + colClassMacro(k) + '"><input type="number" step="0.01" min="0" class="hydro-input" data-cycle-field="meq" data-cycle-key="' + k + '" value="' + round2(s.meq[k]).toFixed(2) + '"></td>';
              }).join('') +
              MICROS.map(function (k, idx) {
                return '<td class="' + colClassMicro(k, idx) + '"><input type="number" step="0.01" min="0" class="hydro-input" data-cycle-field="ppm" data-cycle-key="' + k + '" value="' + round2(s.ppm[k]).toFixed(2) + '"></td>';
              }).join('') +
              '<td class="hydro-cycle-actions">' +
                '<button type="button" class="hydro-cycle-btn" data-cycle-catalog title="' + escapeAttr(t('Cargar una solución del catálogo en esta etapa', 'Load a catalog solution into this stage')) + '">' + t('Catálogo', 'Catalog') + '</button> ' +
                '<button type="button" class="hydro-cycle-btn hydro-cycle-btn--danger" data-cycle-delete>' + t('Quitar', 'Remove') + '</button>' +
              '</td></tr>';
          }).join('');
          tableHost.innerHTML =
            '<div class="hydro-table-scroll"><table class="hydro-table hydro-cycle-table">' + head + '<tbody>' + body + '</tbody></table></div>';
        }
        paintTernary(ternHost, api.getActive(), api, opts);
        renderCharts(meqChart, ppmChart, state.stages);
      },
      mount: function () {
        var rootEl = opts.root;
        if (!rootEl || rootEl._hydroCycleBound) return;
        rootEl._hydroCycleBound = true;
        rootEl.addEventListener('click', function (ev) {
          var row = ev.target.closest('[data-cycle-stage]');
          if (row && !ev.target.closest('button') && !ev.target.closest('input')) {
            state.activeStageId = row.getAttribute('data-cycle-stage');
            api.render();
            api.persist();
            return;
          }
          if (!row) return;
          var sid = row.getAttribute('data-cycle-stage');
          if (ev.target.closest('[data-cycle-catalog]')) {
            openCatalogForStage(sid, api);
            return;
          }
          if (ev.target.closest('[data-cycle-delete]')) {
            if (state.stages.length <= 1) {
              window.alert(t('Deja al menos una etapa.', 'Keep at least one stage.'));
              return;
            }
            state.stages = state.stages.filter(function (s) { return s.id !== sid; });
            if (state.activeStageId === sid) state.activeStageId = state.stages[0].id;
            api.render();
            api.persist();
          }
        });
        rootEl.addEventListener('input', function (ev) {
          var inp = ev.target;
          if (!inp || !inp.getAttribute) return;
          var row = inp.closest('[data-cycle-stage]');
          if (!row) return;
          var st = api.getStage(row.getAttribute('data-cycle-stage'));
          if (!st) return;
          var field = inp.getAttribute('data-cycle-field');
          if (field === 'name') {
            st.name = inp.value;
            api.persist();
            return;
          }
          var key = inp.getAttribute('data-cycle-key');
          if (field === 'meq' && key) {
            st.meq[key] = round2(inp.value);
            syncMacroPpm(st);
            st.ce = String(computeCE(st));
            var ceEl = row.querySelector('.hydro-cycle-ce');
            if (ceEl) ceEl.textContent = st.ce;
            state.activeStageId = st.id;
            paintTernary(rootEl.querySelector('[data-hydro-cycle-ternary]'), st, api, opts);
            renderCharts(rootEl.querySelector('[data-hydro-cycle-chart-meq]'), rootEl.querySelector('[data-hydro-cycle-chart-ppm]'), state.stages);
            api.persist();
          }
          if (field === 'ppm' && key) {
            st.ppm[key] = round2(inp.value);
            state.activeStageId = st.id;
            renderCharts(rootEl.querySelector('[data-hydro-cycle-chart-meq]'), rootEl.querySelector('[data-hydro-cycle-chart-ppm]'), state.stages);
            api.persist();
          }
        });
        rootEl.addEventListener('focusin', function (ev) {
          var row = ev.target.closest && ev.target.closest('[data-cycle-stage]');
          if (!row) return;
          var sid = row.getAttribute('data-cycle-stage');
          if (sid && sid !== state.activeStageId) {
            state.activeStageId = sid;
            paintTernary(rootEl.querySelector('[data-hydro-cycle-ternary]'), api.getActive(), api, opts);
            rootEl.querySelectorAll('.hydro-cycle-row').forEach(function (tr) {
              tr.classList.toggle('is-active', tr.getAttribute('data-cycle-stage') === sid);
            });
          }
        });
        var addBtn = rootEl.querySelector('[data-hydro-cycle-add]');
        if (addBtn) {
          addBtn.addEventListener('click', function () {
            var st = defaultStage(defaultStageName(state.stages.length + 1));
            state.stages.push(st);
            state.activeStageId = st.id;
            api.render();
            api.persist();
          });
        }
        var useBtn = rootEl.querySelector('[data-hydro-cycle-use-design]');
        if (useBtn) {
          useBtn.addEventListener('click', function () {
            if (typeof opts.onUseInDesign === 'function') opts.onUseInDesign(api.getActive());
          });
        }
        var saveProgBtn = rootEl.querySelector('[data-hydro-cycle-save-catalog]');
        if (saveProgBtn) {
          saveProgBtn.addEventListener('click', function () {
            saveCycleProgramToCatalog(api);
          });
        }
        var loadProgBtn = rootEl.querySelector('[data-hydro-cycle-load-programs]');
        if (loadProgBtn) {
          loadProgBtn.addEventListener('click', function () {
            openCycleProgramsCatalog(api);
          });
        }
        api.render();
      }
    };
    return api;
  }

  root.NpHydroCycleProgram = {
    create: createApi,
    loadCustomSolutions: loadCustomSolutions,
    saveCustomSolutions: saveCustomSolutions,
    loadCustomCyclePrograms: loadCustomCyclePrograms,
    saveCustomCyclePrograms: saveCustomCyclePrograms,
    getAllCatalogSolutions: getAllCatalogSolutions,
    normalizeStage: normalizeStage,
    defaultStage: defaultStage,
    customSolutionLimit: customSolutionLimit,
    canAddCustomSolution: canAddCustomSolution,
    isDashboardEmbed: isDashboardEmbed,
    FREE_CUSTOM_SOLUTION_LIMIT: FREE_CUSTOM_SOLUTION_LIMIT,
    CUSTOM_LS_KEY: CUSTOM_LS_KEY,
    CUSTOM_CYCLE_KEY: CUSTOM_CYCLE_KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.NpHydroCycleProgram;
}
