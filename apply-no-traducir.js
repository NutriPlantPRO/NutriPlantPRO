/**
 * Envuelve términos técnicos con <span translate="no" class="notranslate"> para que
 * Google Translate / traductor del navegador no altere fórmulas ni símbolos (Ca, Na, Fe, Si…).
 *
 * Pasada 1: cadenas largas (Ca²⁺, SO₄, meq/L…).
 * Pasada 2: símbolos cortos con límite de palabra \b (evita romper "Cada" con "Ca").
 *
 * Requiere config-no-traducir-terminos.js cargado antes.
 */
(function () {
  'use strict';

  var cfg = window.NUTRIPLANT_NO_TRADUCIR;
  if (!cfg) return;

  var list = cfg.todos;
  if (!list || !list.length) return;

  var terms = list.slice().sort(function (a, b) { return b.length - a.length; });
  var symbols = (cfg.simbolosElementoBordePalabra || []).slice().sort(function (a, b) { return b.length - a.length; });
  var regexSimbolos = null;
  if (symbols.length) {
    try {
      regexSimbolos = new RegExp('\\b(' + symbols.map(escapeRegex).join('|') + ')\\b', 'g');
    } catch (e) {
      console.warn('NutriPlant no-traducir: regex símbolos', e);
    }
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function ancestorHasNoTranslate(el) {
    var p = el;
    while (p) {
      if (p.nodeType === 1) {
        if (p.getAttribute && p.getAttribute('translate') === 'no') return true;
        var cn = p.className;
        if (cn && String(cn).indexOf('notranslate') !== -1) return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  // Evita manipular nodos dentro de SVG: insertar <span> en <text> rompe etiquetas como K⁺ / NO₃⁻.
  function ancestorIsSvg(el) {
    var p = el;
    while (p) {
      if (p.nodeType === 1) {
        if (p.namespaceURI === 'http://www.w3.org/2000/svg') return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  /** Pasada A: términos largos (substring) */
  function wrapLongTermsInTextNode(textNode) {
    var text = textNode.textContent;
    if (!text || text.trim().length === 0) return false;
    var parent = textNode.parentNode;
    if (!parent) return false;
    var tag = parent.nodeName && parent.nodeName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return false;
    if (ancestorHasNoTranslate(parent) || ancestorIsSvg(parent)) return false;

    var html = text;
    var changed = false;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      if (html.indexOf(term) === -1) continue;
      var span = '<span class="notranslate" translate="no">' + escapeHtml(term) + '</span>';
      html = html.split(term).join(span);
      changed = true;
    }
    if (!changed) return false;

    var wrap = document.createElement('span');
    wrap.innerHTML = html;
    while (wrap.firstChild) parent.insertBefore(wrap.firstChild, textNode);
    parent.removeChild(textNode);
    return true;
  }

  /** Pasada B: símbolos cortos con \b (solo fuera de spans ya protegidos) */
  function wrapRegexSymbolsInTextNode(textNode) {
    if (!regexSimbolos) return false;
    var text = textNode.textContent;
    if (!text || !text.trim()) return false;
    var parent = textNode.parentNode;
    if (!parent) return false;
    var tag = parent.nodeName && parent.nodeName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return false;
    if (ancestorHasNoTranslate(parent) || ancestorIsSvg(parent)) return false;

    var html = text.replace(regexSimbolos, function (m) {
      return '<span class="notranslate" translate="no">' + escapeHtml(m) + '</span>';
    });
    if (html === text) return false;

    var wrap = document.createElement('span');
    wrap.innerHTML = html;
    while (wrap.firstChild) parent.insertBefore(wrap.firstChild, textNode);
    parent.removeChild(textNode);
    return true;
  }

  function walkPass(node, fn) {
    if (node.nodeType === 3) {
      fn(node);
      return;
    }
    var child;
    var next = [];
    for (child = node.firstChild; child; child = child.nextSibling) next.push(child);
    for (var j = 0; j < next.length; j++) walkPass(next[j], fn);
  }

  function run() {
    try {
      walkPass(document.body, wrapLongTermsInTextNode);
      walkPass(document.body, wrapRegexSymbolsInTextNode);
    } catch (e) {
      console.warn('NutriPlant apply-no-traducir:', e);
    }
  }

  window.nutriplantApplyNoTraducir = run;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  /* Contenido que pinta el dashboard después (innerHTML): re-aplicar con debounce */
  var tmo = null;
  function schedule() {
    if (tmo) clearTimeout(tmo);
    tmo = setTimeout(function () {
      tmo = null;
      try {
        walkPass(document.body, wrapLongTermsInTextNode);
        walkPass(document.body, wrapRegexSymbolsInTextNode);
      } catch (e) {
        console.warn('NutriPlant apply-no-traducir (observer):', e);
      }
    }, 450);
  }

  if (typeof MutationObserver !== 'undefined' && document.body) {
    var obs = new MutationObserver(function () { schedule(); });
    try {
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* ignore */ }
  }
})();
