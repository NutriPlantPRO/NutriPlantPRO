/**
 * Navegación manual técnico: volver a la página anterior del navegador.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-mt-back]').forEach(function (btn) {
    if (btn.dataset.mtBackBound === '1') return;
    btn.dataset.mtBackBound = '1';
    btn.addEventListener('click', function () {
      var fallback = btn.getAttribute('data-mt-back-fallback') || 'index.html';
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = fallback;
    });
  });
})();
