/**
 * Modales de herramientas gratis: ajusta altura del iframe al contenido en móvil vertical.
 */
(function () {
  'use strict';

  var FIT_FRAME_IDS = {
    waterHardnessCalculatorFrame: true,
    nMineralizableMoCalculatorFrame: true,
    agroclimateForecastFrame: true
  };

  function isMobileFit() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function maxIframeHeight() {
    return Math.max(280, Math.floor(window.innerHeight * 0.92) - 72);
  }

  function applyFrameHeight(frame, height) {
    if (!frame || !FIT_FRAME_IDS[frame.id]) return;
    if (!isMobileFit()) {
      frame.style.height = '100%';
      return;
    }
    var h = Math.min(Math.max(280, height), maxIframeHeight());
    frame.style.height = h + 'px';
  }

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'np-free-tool-resize') return;
    if (typeof e.data.height !== 'number') return;
    Object.keys(FIT_FRAME_IDS).forEach(function (id) {
      var frame = document.getElementById(id);
      if (frame && e.source === frame.contentWindow) {
        applyFrameHeight(frame, e.data.height);
      }
    });
  });

  window.resetFreeToolIframeHeight = function (frameId) {
    var frame = document.getElementById(frameId);
    if (!frame) return;
    if (isMobileFit()) {
      frame.style.height = '320px';
    } else {
      frame.style.height = '100%';
    }
  };

  window.addEventListener('resize', function () {
    Object.keys(FIT_FRAME_IDS).forEach(function (id) {
      var frame = document.getElementById(id);
      if (!frame || isMobileFit()) return;
      frame.style.height = '100%';
    });
  });
})();
