/**
 * Parser de fórmulas químicas → % elemental (hidroponía).
 * Compartido: hidro-solucion-free (aporte fertilizantes) y futuras herramientas.
 */
(function (w) {
  'use strict';

  var ELEM = {
    H: 1.008, C: 12.011, N: 14.01, O: 16.0, P: 30.97, K: 39.10, Ca: 40.08, Mg: 24.31,
    S: 32.07, Si: 28.085, Zn: 65.38, Fe: 55.845, Mn: 54.938, Cu: 63.546, B: 10.81, Mo: 95.95,
    Cl: 35.45, Na: 22.99
  };
  var SUB = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-'
  };

  function normalizeFormula(raw) {
    var text = String(raw || '').trim();
    if (!text) return '';
    return text.split('').map(function (ch) { return SUB[ch] || ch; }).join('')
      .replace(/[−]/g, '-').replace(/\s+/g, '')
      .replace(/\{/g, '(').replace(/\}/g, ')').replace(/\[/g, '(').replace(/\]/g, ')')
      .replace(/:/g, '·').replace(/\)\(/g, ')*(')
      .replace(/([0-9)\]])([\*+])([0-9(A-Z])/g, '$1·$3').replace(/\.+/g, '.');
  }

  function parseNumber(str, index) {
    var i = index, seenDot = false, token = '';
    while (i < str.length) {
      var ch = str[i];
      if (ch >= '0' && ch <= '9') { token += ch; i++; continue; }
      if (ch === '.' && !seenDot) { seenDot = true; token += ch; i++; continue; }
      break;
    }
    if (!token) return { value: 1, index: i };
    var val = Number(token);
    if (!Number.isFinite(val) || val <= 0) throw new Error('Número inválido en fórmula.');
    return { value: val, index: i };
  }

  function parseTerms(str, index, stopChar) {
    var terms = [], i = index;
    while (i < str.length) {
      var ch = str[i];
      if (stopChar && ch === stopChar) return { terms: terms, index: i + 1 };
      if (ch === '+' || ch === '-' || ch === '^') { i++; continue; }
      if (ch === '(') {
        var nested = parseTerms(str, i + 1, ')');
        var cnt = parseNumber(str, nested.index);
        terms.push({ type: 'group', terms: nested.terms, count: cnt.value });
        i = cnt.index;
        continue;
      }
      if (ch >= 'A' && ch <= 'Z') {
        var symbol = ch;
        i++;
        if (i < str.length && str[i] >= 'a' && str[i] <= 'z') { symbol += str[i]; i++; }
        if (!Object.prototype.hasOwnProperty.call(ELEM, symbol)) throw new Error('Elemento no soportado: ' + symbol);
        var c2 = parseNumber(str, i);
        terms.push({ type: 'element', symbol: symbol, count: c2.value });
        i = c2.index;
        continue;
      }
      throw new Error('Carácter inválido: ' + ch);
    }
    if (stopChar) throw new Error('Paréntesis sin cerrar.');
    return { terms: terms, index: i };
  }

  function collectElements(terms, mult, out) {
    terms.forEach(function (t) {
      if (t.type === 'element') out[t.symbol] = (out[t.symbol] || 0) + t.count * mult;
      else collectElements(t.terms, mult * t.count, out);
    });
  }

  function countMotifInTerms(terms, mult, motif) {
    var total = 0, i, j, ok, term, m;
    for (i = 0; i <= terms.length - motif.length; i++) {
      ok = true;
      for (j = 0; j < motif.length; j++) {
        term = terms[i + j];
        m = motif[j];
        if (!term || term.type !== 'element' || term.symbol !== m.symbol || Math.abs(term.count - m.count) > 1e-9) {
          ok = false;
          break;
        }
      }
      if (ok) total += mult;
    }
    terms.forEach(function (t) {
      if (t.type === 'group') total += countMotifInTerms(t.terms, mult * t.count, motif);
    });
    return total;
  }

  function parseCompound(rawFormula) {
    var normalized = normalizeFormula(rawFormula);
    if (!normalized) throw new Error('Escribe una fórmula.');
    var parts = normalized.split(/[·•.]/).filter(Boolean);
    if (!parts.length) throw new Error('Fórmula no válida.');
    var segments = [];
    parts.forEach(function (part) {
      var m = part.match(/^(\d+(?:\.\d+)?)(.*)$/);
      var coef = 1, body = part;
      if (m && m[2]) { coef = Number(m[1]); body = m[2]; }
      var parsed = parseTerms(body, 0, null);
      if (parsed.index !== body.length) throw new Error('Error al parsear la fórmula.');
      segments.push({ coef: coef, terms: parsed.terms });
    });
    var atomCounts = {};
    segments.forEach(function (seg) { collectElements(seg.terms, seg.coef, atomCounts); });
    var mw = 0;
    Object.keys(atomCounts).forEach(function (sym) { mw += atomCounts[sym] * ELEM[sym]; });
    if (!(mw > 0)) throw new Error('No se pudo calcular el PM.');
    var no3Count = segments.reduce(function (s, seg) {
      return s + countMotifInTerms(seg.terms, seg.coef, [{ symbol: 'N', count: 1 }, { symbol: 'O', count: 3 }]);
    }, 0);
    var nh4Count = segments.reduce(function (s, seg) {
      return s + countMotifInTerms(seg.terms, seg.coef, [{ symbol: 'N', count: 1 }, { symbol: 'H', count: 4 }]);
    }, 0);
    return { normalized: normalized, atomCounts: atomCounts, mw: mw, no3Count: no3Count, nh4Count: nh4Count };
  }

  function pctElem(atomCounts, sym, mw) {
    return ((atomCounts[sym] || 0) * ELEM[sym] / mw) * 100;
  }

  /** % elemental hidroponía desde fórmula */
  function compFromFormulaHydro(formula) {
    var parsed = parseCompound(formula);
    var c = parsed.atomCounts;
    var mw = parsed.mw;
    var out = {
      N_NO3: 0, N_NH4: 0, P: 0, S: 0, K: 0, Ca: 0, Mg: 0, Cl: 0,
      Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0
    };
    var nPct = pctElem(c, 'N', mw);
    var nAtoms = c.N || 0;
    if (nAtoms > 0) {
      var no3Atoms = Math.max(0, parsed.no3Count);
      var nh4Atoms = Math.max(0, parsed.nh4Count);
      var forms = no3Atoms + nh4Atoms;
      if (forms > nAtoms && forms > 0) {
        var k = nAtoms / forms;
        no3Atoms *= k;
        nh4Atoms *= k;
      }
      if (forms > 0) {
        out.N_NO3 = nPct * (no3Atoms / nAtoms);
        out.N_NH4 = nPct * (nh4Atoms / nAtoms);
      } else {
        out.N_NO3 = nPct;
      }
    }
    out.P = pctElem(c, 'P', mw);
    out.K = pctElem(c, 'K', mw);
    out.Ca = pctElem(c, 'Ca', mw);
    out.Mg = pctElem(c, 'Mg', mw);
    out.S = pctElem(c, 'S', mw);
    out.Cl = pctElem(c, 'Cl', mw);
    out.Fe = pctElem(c, 'Fe', mw);
    out.Mn = pctElem(c, 'Mn', mw);
    out.B = pctElem(c, 'B', mw);
    out.Zn = pctElem(c, 'Zn', mw);
    out.Cu = pctElem(c, 'Cu', mw);
    out.Mo = pctElem(c, 'Mo', mw);
    return { comp: out, mw: mw, normalized: parsed.normalized };
  }

  function tryCompFromFormula(formula) {
    try {
      var r = compFromFormulaHydro(formula);
      return { ok: true, comp: r.comp, mw: r.mw, normalized: r.normalized };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : 'Fórmula no válida.' };
    }
  }

  w.FertFormulaEngine = {
    normalizeFormula: normalizeFormula,
    compFromFormulaHydro: compFromFormulaHydro,
    tryCompFromFormula: tryCompFromFormula
  };
})(window);
