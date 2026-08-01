/**
 * Modales de herramientas gratis:
 * - Ajusta altura del iframe al contenido en móvil vertical.
 * - Bloquea el scroll de la página de atrás (evita que el modal se “pegue” a los bordes en iPhone).
 */
(function () {
  'use strict';

  var FIT_FRAME_IDS = {
    waterHardnessCalculatorFrame: true,
    nMineralizableMoCalculatorFrame: true,
    agroclimateForecastFrame: true
  };

  var scrollLockCount = 0;
  var lockedScrollY = 0;
  var touchMoveBound = false;

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

  function isScrollableEl(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    var style = window.getComputedStyle(el);
    var oy = style.overflowY;
    if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return false;
    return el.scrollHeight > el.clientHeight + 1;
  }

  function canScrollInside(target) {
    var el = target;
    while (el && el !== document.body) {
      if (el.classList && (el.classList.contains('modal') || el.classList.contains('modal-body'))) {
        if (isScrollableEl(el)) return true;
      }
      if (isScrollableEl(el)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function onTouchMoveWhileLocked(e) {
    if (e.touches && e.touches.length > 1) return;
    if (canScrollInside(e.target)) return;
    e.preventDefault();
  }

  function bindTouchBlock() {
    if (touchMoveBound) return;
    document.addEventListener('touchmove', onTouchMoveWhileLocked, { passive: false });
    touchMoveBound = true;
  }

  function unbindTouchBlock() {
    if (!touchMoveBound) return;
    document.removeEventListener('touchmove', onTouchMoveWhileLocked);
    touchMoveBound = false;
  }

  function lockBodyScroll() {
    scrollLockCount += 1;
    if (scrollLockCount > 1) return;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('np-scroll-locked');
    document.body.classList.add('np-scroll-locked');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + lockedScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    bindTouchBlock();
  }

  function unlockBodyScroll() {
    if (scrollLockCount <= 0) return;
    scrollLockCount -= 1;
    if (scrollLockCount > 0) return;
    document.documentElement.classList.remove('np-scroll-locked');
    document.body.classList.remove('np-scroll-locked');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    unbindTouchBlock();
    window.scrollTo(0, lockedScrollY);
    // Si el menú lateral móvil sigue abierto, reaplicar overflow hidden.
    var sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay && sidebarOverlay.classList.contains('show')) {
      document.body.style.overflow = 'hidden';
    }
  }

  function isOverlayOpen(el) {
    if (!el || !el.classList || !el.classList.contains('modal-overlay')) return false;
    if (el.classList.contains('show')) return true;
    var display = '';
    if (el.style && el.style.display) display = el.style.display;
    else if (window.getComputedStyle) display = window.getComputedStyle(el).display;
    return display === 'flex' || display === 'block';
  }

  function anyModalOverlayOpen() {
    var overlays = document.querySelectorAll('.modal-overlay');
    for (var i = 0; i < overlays.length; i++) {
      if (isOverlayOpen(overlays[i])) return true;
    }
    return false;
  }

  function syncScrollLockFromOverlays() {
    var shouldLock = anyModalOverlayOpen();
    if (shouldLock && scrollLockCount === 0) lockBodyScroll();
    else if (!shouldLock && scrollLockCount > 0) {
      scrollLockCount = 1;
      unlockBodyScroll();
    }
  }

  function injectScrollLockCss() {
    if (document.getElementById('np-modal-scroll-lock-css')) return;
    var style = document.createElement('style');
    style.id = 'np-modal-scroll-lock-css';
    style.textContent =
      'html.np-scroll-locked,html.np-scroll-locked body{overscroll-behavior:none;}' +
      '.modal-overlay{overscroll-behavior:none;}' +
      '.modal-overlay .modal,.modal-overlay .modal-body{' +
      'overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}';
    document.head.appendChild(style);
  }

  function observeModalOverlays() {
    if (!window.MutationObserver) return;

    var watched = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    var attrObserver = new MutationObserver(function () {
      syncScrollLockFromOverlays();
    });

    function watch(el) {
      if (!el || (watched && watched.has(el))) return;
      if (watched) watched.add(el);
      attrObserver.observe(el, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    document.querySelectorAll('.modal-overlay').forEach(watch);

    // Solo hijos directos nuevos en body (modales suelen ir ahí).
    var childObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (node.nodeType !== 1) continue;
          if (node.classList && node.classList.contains('modal-overlay')) watch(node);
          if (node.querySelectorAll) {
            node.querySelectorAll('.modal-overlay').forEach(watch);
          }
        }
      }
    });
    childObserver.observe(document.body, { childList: true });

    syncScrollLockFromOverlays();
  }

  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    // Pronóstico agroclimático: revelar iframe solo cuando i18n ya aplicó (sin flash).
    if (e.data.type === 'np-agro-ready') {
      var agroFrame = document.getElementById('agroclimateForecastFrame');
      if (agroFrame && e.source === agroFrame.contentWindow) {
        agroFrame.style.opacity = '1';
        setTimeout(function () {
          try { agroFrame.contentWindow.postMessage({ type: 'np-agro-shown' }, '*'); } catch (err) { /* ignore */ }
        }, 30);
      }
      return;
    }
    if (e.data.type !== 'np-free-tool-resize') return;
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

  window.lockFreeToolBodyScroll = lockBodyScroll;
  window.unlockFreeToolBodyScroll = unlockBodyScroll;
  window.syncFreeToolModalScrollLock = syncScrollLockFromOverlays;

  window.addEventListener('resize', function () {
    Object.keys(FIT_FRAME_IDS).forEach(function (id) {
      var frame = document.getElementById(id);
      if (!frame || isMobileFit()) return;
      frame.style.height = '100%';
    });
  });

  function init() {
    injectScrollLockCss();
    observeModalOverlays();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
