/**
 * Envuelve en la página los términos técnicos (fórmulas, iones, unidades)
 * con <span translate="no" class="notranslate"> para que el traductor del navegador
 * no los cambie. Requiere config-no-traducir-terminos.js cargado antes.
 */
(function () {
  'use strict';

  var list = window.NUTRIPLANT_NO_TRADUCIR && window.NUTRIPLANT_NO_TRADUCIR.todos;
  if (!list || !list.length) return;

  // Ordenar por longitud descendente para no cortar términos largos (ej. SO₄²⁻ antes que SO₄)
  var terms = list.slice().sort(function (a, b) { return b.length - a.length; });

  function wrapTextNode(textNode) {
    var text = textNode.textContent;
    if (!text || text.trim().length === 0) return;
    var parent = textNode.parentNode;
    if (!parent) return;
    var tag = parent.nodeName && parent.nodeName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
    if (parent.getAttribute('translate') === 'no' || (parent.className && parent.className.indexOf('notranslate') !== -1)) return;

    var html = text;
    var changed = false;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      if (html.indexOf(term) === -1) continue;
      var span = '<span class="notranslate" translate="no">' + escapeHtml(term) + '</span>';
      html = html.split(term).join(span);
      changed = true;
    }
    if (!changed) return;

    var wrap = document.createElement('span');
    wrap.innerHTML = html;
    while (wrap.firstChild) parent.insertBefore(wrap.firstChild, textNode);
    parent.removeChild(textNode);
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function walk(node) {
    if (node.nodeType === 3) {
      wrapTextNode(node);
      return;
    }
    var child;
    var next = [];
    for (child = node.firstChild; child; child = child.nextSibling) next.push(child);
    for (var j = 0; j < next.length; j++) walk(next[j]);
  }

  function run() {
    try {
      walk(document.body);
    } catch (e) {
      console.warn('NutriPlant apply-no-traducir:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
