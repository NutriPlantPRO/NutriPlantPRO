/**
 * NutriPlant — sugerencia de % de distribución por etapa.
 * Parte de la fenología elegida y busca quedar dentro de los rangos Steiner
 * de los triángulos N-P-S y K-Ca-Mg (misma lógica que Gráficas / Hidroponía).
 * Entradas de dosis en SI agronómico (kg/ha óxido).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (root) root.NpFertigationDistSuggest = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var NUT_IDS = ['n', 'p', 'k', 'ca', 'mg', 's', 'fe', 'mn', 'b', 'zn', 'cu', 'mo', 'si'];
  var MACRO_IDS = ['n', 'p', 'k', 'ca', 'mg', 's'];
  var CONV = {
    P2O5_TO_P: 2.291,
    K2O_TO_K: 1.204,
    CaO_TO_Ca: 1.399,
    MgO_TO_Mg: 1.658,
    SO4_TO_S: 96 / 32
  };
  var EQ = { n: 14, p: 31, s: 16.03, k: 39.1, ca: 20.04, mg: 12.15 };
  var RANGES = {
    n: [20, 80],
    p: [1.25, 10],
    s: [10, 70],
    k: [10, 65],
    ca: [22.5, 62.5],
    mg: [0.5, 40]
  };
  var FALLBACK = {
    I: 12,
    an: { n: 52, p: 5, s: 43 },
    cat: { k: 35, ca: 45, mg: 20 }
  };
  var STAGE_PROFILES = {
    brotacion: { I: 8, an: { n: 48, p: 8, s: 44 }, cat: { k: 28, ca: 52, mg: 20 } },
    establecimiento: { I: 10, an: { n: 50, p: 8, s: 42 }, cat: { k: 28, ca: 52, mg: 20 } },
    vegetativo: { I: 20, an: { n: 62, p: 5, s: 33 }, cat: { k: 30, ca: 50, mg: 20 } },
    prefloracion: { I: 12, an: { n: 55, p: 6, s: 39 }, cat: { k: 30, ca: 50, mg: 20 } },
    floracion: { I: 14, an: { n: 52, p: 6, s: 42 }, cat: { k: 28, ca: 52, mg: 20 } },
    amarre: { I: 10, an: { n: 48, p: 5, s: 47 }, cat: { k: 26, ca: 54, mg: 20 } },
    llenado: { I: 18, an: { n: 48, p: 5, s: 47 }, cat: { k: 48, ca: 35, mg: 17 } },
    maduracion: { I: 8, an: { n: 38, p: 4, s: 58 }, cat: { k: 55, ca: 30, mg: 15 } },
    cosecha: { I: 4, an: { n: 32, p: 4, s: 64 }, cat: { k: 50, ca: 32, mg: 18 } }
  };

  function num(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function foldName(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function profileFor(name) {
    var s = foldName(name);
    if (!s) return FALLBACK;
    if (/brotacion|bud\s*break/.test(s)) return STAGE_PROFILES.brotacion;
    if (/establecimiento|establishment/.test(s)) return STAGE_PROFILES.establecimiento;
    if (/vegetativo|vegetative/.test(s)) return STAGE_PROFILES.vegetativo;
    if (/preflor|pre-?flower/.test(s)) return STAGE_PROFILES.prefloracion;
    if (/floracion|\bflor\b|flowering|\bflower\b/.test(s)) return STAGE_PROFILES.floracion;
    if (/amarre|fruit\s*set/.test(s)) return STAGE_PROFILES.amarre;
    if (/llenado|filling/.test(s)) return STAGE_PROFILES.llenado;
    if (/maduracion|maturity|ripen/.test(s)) return STAGE_PROFILES.maduracion;
    if (/cosecha|harvest/.test(s)) return STAGE_PROFILES.cosecha;
    return FALLBACK;
  }

  function weightsToPct(weights) {
    var len = weights.length;
    if (len <= 0) return [];
    var sum = 0;
    var i;
    for (i = 0; i < len; i++) sum += Math.max(0, num(weights[i]));
    if (sum <= 0) {
      var even = round1(100 / len);
      var out = [];
      var acc = 0;
      for (i = 0; i < len; i++) {
        var v = i === len - 1 ? round1(100 - acc) : even;
        out.push(v);
        acc += v;
      }
      return out;
    }
    var arr = [];
    var run = 0;
    for (i = 0; i < len; i++) {
      var w = Math.max(0, num(weights[i]));
      var p = i === len - 1 ? round1(100 - run) : round1(100 * w / sum);
      if (p < 0) p = 0;
      arr.push(p);
      run += p;
    }
    return arr;
  }

  function blendPct(safeArr, phenoArr, alpha) {
    var len = safeArr.length;
    var w = [];
    var i;
    for (i = 0; i < len; i++) {
      w.push((1 - alpha) * num(safeArr[i]) + alpha * num(phenoArr[i]));
    }
    return weightsToPct(w);
  }

  function readTotals(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    function pick(keys) {
      var i;
      for (i = 0; i < keys.length; i++) {
        if (src[keys[i]] != null && src[keys[i]] !== '') return Math.max(0, num(src[keys[i]]));
      }
      return 0;
    }
    return {
      n: pick(['N', 'n']),
      p: pick(['P2O5', 'p']),
      k: pick(['K2O', 'k']),
      ca: pick(['CaO', 'ca']),
      mg: pick(['MgO', 'mg']),
      s: pick(['SO4', 's'])
    };
  }

  function oxideToMeq(ox) {
    return {
      n: num(ox.n) / EQ.n,
      p: num(ox.p) / CONV.P2O5_TO_P / EQ.p,
      s: num(ox.s) / CONV.SO4_TO_S / EQ.s,
      k: num(ox.k) / CONV.K2O_TO_K / EQ.k,
      ca: num(ox.ca) / CONV.CaO_TO_Ca / EQ.ca,
      mg: num(ox.mg) / CONV.MgO_TO_Mg / EQ.mg
    };
  }

  function pctOf(part, sum) {
    return sum > 1e-12 ? (part / sum) * 100 : 0;
  }

  function ternaryFromMeq(meq) {
    var an = num(meq.n) + num(meq.p) + num(meq.s);
    var cat = num(meq.k) + num(meq.ca) + num(meq.mg);
    return {
      anions: { n: pctOf(meq.n, an), p: pctOf(meq.p, an), s: pctOf(meq.s, an), sum: an },
      cations: { k: pctOf(meq.k, cat), ca: pctOf(meq.ca, cat), mg: pctOf(meq.mg, cat), sum: cat }
    };
  }

  function inRange(value, bounds) {
    return value + 1e-6 >= bounds[0] && value - 1e-6 <= bounds[1];
  }

  function ternaryInZone(tri) {
    if (!tri) return false;
    if (tri.anions.sum > 1e-12) {
      if (!inRange(tri.anions.n, RANGES.n)) return false;
      if (!inRange(tri.anions.p, RANGES.p)) return false;
      if (!inRange(tri.anions.s, RANGES.s)) return false;
    }
    if (tri.cations.sum > 1e-12) {
      if (!inRange(tri.cations.k, RANGES.k)) return false;
      if (!inRange(tri.cations.ca, RANGES.ca)) return false;
      if (!inRange(tri.cations.mg, RANGES.mg)) return false;
    }
    return true;
  }

  function stageOxide(totals, pct, index) {
    return {
      n: num(totals.n) * num(pct.n && pct.n[index]) / 100,
      p: num(totals.p) * num(pct.p && pct.p[index]) / 100,
      k: num(totals.k) * num(pct.k && pct.k[index]) / 100,
      ca: num(totals.ca) * num(pct.ca && pct.ca[index]) / 100,
      mg: num(totals.mg) * num(pct.mg && pct.mg[index]) / 100,
      s: num(totals.s) * num(pct.s && pct.s[index]) / 100
    };
  }

  function stageTernary(stages, pct, totalsRaw) {
    var list = Array.isArray(stages) ? stages : [];
    var totals = readTotals(totalsRaw);
    return list.map(function (_, i) {
      return ternaryFromMeq(oxideToMeq(stageOxide(totals, pct, i)));
    });
  }

  function cycleInZone(totalsRaw) {
    return ternaryInZone(ternaryFromMeq(oxideToMeq(readTotals(totalsRaw))));
  }

  function allStagesInZone(stages, pct, totalsRaw) {
    var tris = stageTernary(stages, pct, totalsRaw);
    var i;
    for (i = 0; i < tris.length; i++) {
      if (!ternaryInZone(tris[i])) return false;
    }
    return true;
  }

  function hasTernaryTotals(totals) {
    var an = num(totals.n) + num(totals.p) + num(totals.s);
    var cat = num(totals.k) + num(totals.ca) + num(totals.mg);
    return an > 1e-9 || cat > 1e-9;
  }

  function phenoWeights(stages) {
    var list = Array.isArray(stages) ? stages : [];
    var safe = [];
    var n = [];
    var p = [];
    var k = [];
    var ca = [];
    var mg = [];
    var s = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var pr = profileFor(list[i]);
      var I = Math.max(0.1, num(pr.I));
      safe.push(I);
      n.push(I * num(pr.an.n) * EQ.n);
      p.push(I * num(pr.an.p) * EQ.p * CONV.P2O5_TO_P);
      s.push(I * num(pr.an.s) * EQ.s * CONV.SO4_TO_S);
      k.push(I * num(pr.cat.k) * EQ.k * CONV.K2O_TO_K);
      ca.push(I * num(pr.cat.ca) * EQ.ca * CONV.CaO_TO_Ca);
      mg.push(I * num(pr.cat.mg) * EQ.mg * CONV.MgO_TO_Mg);
    }
    var safePct = weightsToPct(safe);
    return {
      safe: safePct,
      n: weightsToPct(n),
      p: weightsToPct(p),
      k: weightsToPct(k),
      ca: weightsToPct(ca),
      mg: weightsToPct(mg),
      s: weightsToPct(s),
      micro: safePct.slice()
    };
  }

  function assemble(pheno, alpha) {
    var pct = {
      n: blendPct(pheno.safe, pheno.n, alpha),
      p: blendPct(pheno.safe, pheno.p, alpha),
      k: blendPct(pheno.safe, pheno.k, alpha),
      ca: blendPct(pheno.safe, pheno.ca, alpha),
      mg: blendPct(pheno.safe, pheno.mg, alpha),
      s: blendPct(pheno.safe, pheno.s, alpha)
    };
    var i;
    for (i = 0; i < NUT_IDS.length; i++) {
      if (MACRO_IDS.indexOf(NUT_IDS[i]) >= 0) continue;
      pct[NUT_IDS[i]] = pheno.micro.slice();
    }
    return pct;
  }

  function suggestPct(stages, options) {
    var list = Array.isArray(stages) ? stages.slice() : [];
    if (!list.length) {
      var empty = {};
      NUT_IDS.forEach(function (id) { empty[id] = []; });
      return { pct: empty, alpha: 0, cycleInZone: false, stagesInZone: true };
    }
    var pheno = phenoWeights(list);
    var totals = readTotals(options && options.totals);
    var checkZone = hasTernaryTotals(totals);
    var lo = 0;
    var hi = 1;
    var best = assemble(pheno, checkZone ? 0 : 1);
    var alpha = checkZone ? 0 : 1;
    if (checkZone) {
      var step;
      for (step = 0; step < 14; step++) {
        var mid = (lo + hi) / 2;
        var cand = assemble(pheno, mid);
        if (allStagesInZone(list, cand, totals)) {
          lo = mid;
          best = cand;
          alpha = mid;
        } else {
          hi = mid;
        }
      }
      if (!allStagesInZone(list, best, totals)) {
        best = assemble(pheno, 0);
        alpha = 0;
      }
    }
    return {
      pct: best,
      alpha: alpha,
      cycleInZone: checkZone ? cycleInZone(totals) : false,
      stagesInZone: !checkZone || allStagesInZone(list, best, totals)
    };
  }

  return {
    NUT_IDS: NUT_IDS,
    RANGES: RANGES,
    STAGE_PROFILES: STAGE_PROFILES,
    profileFor: profileFor,
    weightsToPct: weightsToPct,
    suggestPct: suggestPct,
    stageTernary: stageTernary,
    ternaryInZone: ternaryInZone,
    cycleInZone: cycleInZone
  };
});
