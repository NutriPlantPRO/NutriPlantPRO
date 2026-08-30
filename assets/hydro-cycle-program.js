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
  var COLORS = {
    N_NO3: '#ca8a04', P: '#a16207', S: '#854d0e',
    K: '#dc2626', Ca: '#b91c1c', Mg: '#f87171', N_NH4: '#be123c',
    Fe: '#2563eb', Mn: '#7c3aed', Zn: '#0891b2', B: '#059669', Cu: '#d97706', Mo: '#64748b'
  };

  function t(es, en) {
    try {
      if (root.NpFreeNutritionUI && root.NpFreeNutritionUI.prefs().language === 'en') return en;
      if (typeof root.NpI18n !== 'undefined' && root.NpI18n.getLanguage && root.NpI18n.getLanguage() === 'en') return en;
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

  function defaultStage(name) {
    return {
      id: 'cyc_' + Date.now() + '_' + Math.floor(Math.random() * 1e4),
      name: name || t('Nueva etapa', 'New stage'),
      solutionId: '',
      ce: '0.00',
      meq: { N_NH4: 0, N_NO3: 0, P: 0, S: 0, K: 0, Ca: 0, Mg: 0, Cl: 0 },
      ppm: { Fe: 0, Mn: 0, Zn: 0, B: 0, Cu: 0, Mo: 0, N_NO3: 0, N_NH4: 0, P: 0, S: 0, K: 0, Ca: 0, Mg: 0, Cl: 0 }
    };
  }

  function normalizeStage(raw, i) {
    var base = defaultStage(t('Etapa', 'Stage') + ' ' + (i + 1));
    if (!raw || typeof raw !== 'object') return base;
    base.id = raw.id ? String(raw.id) : base.id;
    base.name = raw.name != null ? String(raw.name) : base.name;
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

  function saveCustomSolutions(items) {
    try {
      localStorage.setItem(CUSTOM_LS_KEY, JSON.stringify({ items: items || [] }));
    } catch (e) { /* ignore */ }
    try {
      if (root.parent && root.parent !== root && /embed=dashboard/.test(location.search || '')) {
        root.parent.postMessage({
          type: 'np-hydro-custom-solutions',
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

  function lineChartSvg(labels, series, yLabel) {
    var w = 640;
    var h = 260;
    var padL = 44;
    var padR = 16;
    var padT = 16;
    var padB = 40;
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
      paths += '<polyline fill="none" stroke="' + color + '" stroke-width="2.2" points="' + pts + '"/>';
      (s.data || []).forEach(function (v, i) {
        paths += '<circle cx="' + xAt(i) + '" cy="' + yAt(v) + '" r="4" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>';
      });
    });
    var xLabels = labels.map(function (lab, i) {
      return '<text x="' + xAt(i) + '" y="' + (h - 12) + '" text-anchor="middle" font-size="10" fill="#475569">' + escapeAttr(lab) + '</text>';
    }).join('');
    var legend = series.map(function (s, i) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:11px;color:#334155;">' +
        '<i style="width:10px;height:10px;border-radius:50%;background:' + (s.color || '#2563eb') + ';display:inline-block;"></i>' +
        escapeAttr(s.label) + '</span>';
    }).join('');
    return '<div class="hydro-cycle-chart-legend">' + legend + '</div>' +
      '<svg class="hydro-cycle-line-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeAttr(yLabel) + '">' +
      grid + paths + xLabels +
      '<text x="12" y="' + (padT + plotH / 2) + '" transform="rotate(-90 12 ' + (padT + plotH / 2) + ')" text-anchor="middle" font-size="11" fill="#64748b">' + escapeAttr(yLabel) + '</text>' +
      '</svg>';
  }

  function renderCharts(hostMeq, hostPpm, stages) {
    var labels = stages.map(function (s) { return s.name || '—'; });
    var meqSeries = [
      { label: 'N-NO₃⁻', color: COLORS.N_NO3, data: stages.map(function (s) { return parseFloat(s.meq.N_NO3) || 0; }) },
      { label: 'P', color: COLORS.P, data: stages.map(function (s) { return parseFloat(s.meq.P) || 0; }) },
      { label: 'S', color: COLORS.S, data: stages.map(function (s) { return parseFloat(s.meq.S) || 0; }) },
      { label: 'K⁺', color: COLORS.K, data: stages.map(function (s) { return parseFloat(s.meq.K) || 0; }) },
      { label: 'Ca²⁺', color: COLORS.Ca, data: stages.map(function (s) { return parseFloat(s.meq.Ca) || 0; }) },
      { label: 'Mg²⁺', color: COLORS.Mg, data: stages.map(function (s) { return parseFloat(s.meq.Mg) || 0; }) }
    ];
    var ppmSeries = MICROS.map(function (k) {
      return { label: k, color: COLORS[k], data: stages.map(function (s) { return parseFloat(s.ppm[k]) || 0; }) };
    });
    if (hostMeq) hostMeq.innerHTML = lineChartSvg(labels, meqSeries, 'meq/L');
    if (hostPpm) hostPpm.innerHTML = lineChartSvg(labels, ppmSeries, 'ppm');
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
      ? '<tr class="hydro-cycle-catalog-sep"><td colspan="' + (MACROS.length + MICROS.length + 2) + '"><strong>' + t('Mis soluciones', 'My solutions') + '</strong> — ' + t('disponibles en cualquier proyecto (con cuenta)', 'available in any project (with account)') + '</td></tr>'
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

  function saveStageToCatalog(stage, api) {
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
        ? opts.stages.map(normalizeStage)
        : [normalizeStage({ name: t('Vegetativa', 'Vegetative') }, 0)],
      activeStageId: opts.activeStageId || null
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
        if (!state.stages.length) state.stages = [normalizeStage({ name: t('Vegetativa', 'Vegetative') }, 0)];
        state.activeStageId = activeId && state.stages.some(function (s) { return s.id === activeId; })
          ? activeId
          : state.stages[0].id;
      },
      persist: function () {
        if (typeof opts.onChange === 'function') opts.onChange(api.snapshot());
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
          activeStageId: state.activeStageId
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
            '<th>CE</th>' +
            MACROS.map(function (k) { return '<th>' + labelMacro(k) + '<br><span class="hydro-th-unit">meq/L</span></th>'; }).join('') +
            MICROS.map(function (k) { return '<th>' + k + '<br><span class="hydro-th-unit">ppm</span></th>'; }).join('') +
            '<th></th></tr></thead>';
          var body = state.stages.map(function (s) {
            var active = s.id === state.activeStageId ? ' is-active' : '';
            syncMacroPpm(s);
            s.ce = String(computeCE(s));
            return '<tr class="hydro-cycle-row' + active + '" data-cycle-stage="' + escapeAttr(s.id) + '">' +
              '<td><input type="text" class="hydro-input hydro-cycle-name" data-cycle-field="name" value="' + escapeAttr(s.name) + '" placeholder="' + escapeAttr(t('Ej. Vegetativa', 'E.g. Vegetative')) + '"></td>' +
              '<td><span class="hydro-cycle-ce">' + escapeAttr(s.ce) + '</span></td>' +
              MACROS.map(function (k) {
                return '<td><input type="number" step="0.01" min="0" class="hydro-input" data-cycle-field="meq" data-cycle-key="' + k + '" value="' + round2(s.meq[k]).toFixed(2) + '"></td>';
              }).join('') +
              MICROS.map(function (k) {
                return '<td><input type="number" step="0.01" min="0" class="hydro-input" data-cycle-field="ppm" data-cycle-key="' + k + '" value="' + round2(s.ppm[k]).toFixed(2) + '"></td>';
              }).join('') +
              '<td class="hydro-cycle-actions">' +
                '<button type="button" class="hydro-cycle-btn" data-cycle-catalog>' + t('Catálogo', 'Catalog') + '</button> ' +
                '<button type="button" class="hydro-cycle-btn hydro-cycle-btn--save" data-cycle-save-catalog title="' + escapeAttr(t('Guardar esta etapa en tu catálogo de soluciones', 'Save this stage to your solution catalog')) + '">' + t('Al catálogo', 'To catalog') + '</button> ' +
                '<button type="button" class="hydro-cycle-btn hydro-cycle-btn--danger" data-cycle-delete>' + t('Quitar', 'Remove') + '</button>' +
              '</td></tr>';
          }).join('');
          tableHost.innerHTML =
            '<div class="hydro-table-scroll"><table class="hydro-table hydro-cycle-table">' + head + '<tbody>' + body + '</tbody></table></div>';
        }
        renderMiniTernary(ternHost, api.getActive());
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
          if (ev.target.closest('[data-cycle-save-catalog]')) {
            saveStageToCatalog(api.getStage(sid), api);
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
            renderMiniTernary(rootEl.querySelector('[data-hydro-cycle-ternary]'), st);
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
            renderMiniTernary(rootEl.querySelector('[data-hydro-cycle-ternary]'), api.getActive());
            rootEl.querySelectorAll('.hydro-cycle-row').forEach(function (tr) {
              tr.classList.toggle('is-active', tr.getAttribute('data-cycle-stage') === sid);
            });
          }
        });
        var addBtn = rootEl.querySelector('[data-hydro-cycle-add]');
        if (addBtn) {
          addBtn.addEventListener('click', function () {
            var st = defaultStage(t('Etapa', 'Stage') + ' ' + (state.stages.length + 1));
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
        api.render();
      }
    };
    return api;
  }

  root.NpHydroCycleProgram = {
    create: createApi,
    loadCustomSolutions: loadCustomSolutions,
    saveCustomSolutions: saveCustomSolutions,
    getAllCatalogSolutions: getAllCatalogSolutions,
    normalizeStage: normalizeStage,
    defaultStage: defaultStage,
    CUSTOM_LS_KEY: CUSTOM_LS_KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.NpHydroCycleProgram;
}
