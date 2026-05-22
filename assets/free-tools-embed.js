/**
 * Iframe embebido (login/dashboard): reporta altura real al padre en móvil.
 */
(function () {
  'use strict';

  if (!document.documentElement.classList.contains('embed-dashboard')) return;

  var root = document.querySelector('.wrap') || document.body;

  function measureHeight() {
    var rect = root.getBoundingClientRect();
    var pad = 24;
    return Math.ceil(Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      rect.bottom + pad
    ));
  }

  function notifyParent() {
    try {
      window.parent.postMessage({
        type: 'np-free-tool-resize',
        height: measureHeight()
      }, '*');
    } catch (err) { /* cross-origin guard */ }
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(notifyParent).observe(root);
  }

  window.addEventListener('load', notifyParent);
  window.addEventListener('resize', notifyParent);
  document.querySelectorAll('details').forEach(function (el) {
    el.addEventListener('toggle', function () { setTimeout(notifyParent, 40); });
  });
  setTimeout(notifyParent, 80);
})();
