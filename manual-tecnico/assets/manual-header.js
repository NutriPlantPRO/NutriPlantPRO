/**
 * Manual técnico — botones Manual Técnico / Autoría (contorno discreto + iconos).
 */
(function () {
  'use strict';

  function assetBase() {
    return /\/capitulos\//.test(location.pathname) ? '../../' : '../';
  }

  function pageFlags() {
    var path = location.pathname;
    return {
      isIndex: /\/manual-tecnico\/?$/.test(path) || /\/manual-tecnico\/index\.html$/.test(path),
      isAutoria: /\/autoria\.html$/.test(path),
      inCapitulos: /\/capitulos\//.test(path)
    };
  }

  function iconImg(src, size) {
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'mt-portal-btn__icon-img';
    img.width = size || 18;
    img.height = size || 18;
    img.decoding = 'async';
    return img;
  }

  function upgradeAutoriaBtn(base, flags) {
    document.querySelectorAll('.mt-autoria-btn').forEach(function (btn) {
      btn.classList.add('mt-portal-btn', 'mt-portal-btn--autoria');
      if (flags.isAutoria) {
        btn.classList.add('mt-portal-btn--active');
        btn.classList.remove('mt-autoria-btn--active');
      }
      var iconWrap = btn.querySelector('.mt-autoria-btn__icon');
      if (iconWrap && !iconWrap.querySelector('img')) {
        iconWrap.textContent = '';
        iconWrap.appendChild(iconImg(base + 'assets/marca%20JA.png', 18));
      }
      var text = btn.querySelector('.mt-autoria-btn__text');
      if (text) text.classList.add('mt-portal-btn__text');
    });
  }

  function insertManualBtn(base, flags) {
    var right = document.querySelector('.mt-header-right');
    if (!right || document.querySelector('.mt-portal-btn--manual')) return;

    var manualHref = flags.inCapitulos ? '../index.html' : 'index.html';
    var manual = document.createElement('a');
    manual.href = manualHref;
    manual.className = 'mt-portal-btn mt-portal-btn--manual';
    manual.title = 'Manual técnico NutriPlant PRO';
    if (flags.isIndex) manual.classList.add('mt-portal-btn--active');
    manual.appendChild(iconImg(base + 'assets/N_Hoja_Azul.png', 18));
    var span = document.createElement('span');
    span.className = 'mt-portal-btn__text';
    span.textContent = 'Manual Técnico';
    manual.appendChild(span);

    var autoriaBtn = right.querySelector('.mt-autoria-btn');
    if (autoriaBtn) right.insertBefore(manual, autoriaBtn);
    else right.insertBefore(manual, right.firstChild);
  }

  function hideBrandSubtitle() {
    var brandSpan = document.querySelector('.mt-brand span');
    if (brandSpan) brandSpan.style.display = 'none';
  }

  function upgradeAutoriaTitle(base, flags) {
    if (!flags.isAutoria) return;
    var h1 = document.querySelector('main.mt-wrap > h1, main > h1');
    if (!h1 || h1.querySelector('.mt-autoria-title-logo')) return;
    h1.classList.add('mt-autoria-title');
    var logo = iconImg(base + 'assets/marca%20JA.png', 36);
    logo.classList.add('mt-autoria-title-logo');
    h1.insertBefore(logo, h1.firstChild);
  }

  function resolveGaPageTitle(flags) {
    if (flags.isAutoria) return 'Manual técnico — Autoría';
    if (flags.isIndex) return 'Manual técnico';
    return 'Manual técnico';
  }

  /** Solo índice + Autoría. Capítulos no se miden (login/dashboard siguen en sus HTML). */
  function shouldTrackManualPage(flags) {
    return flags.isIndex || flags.isAutoria;
  }

  function loadGoogleAnalytics(base, flags) {
    if (window.__npGaInit) return;
    if (!shouldTrackManualPage(flags)) return;

    function boot() {
      var id = (window.NUTRIPLANT_APP && window.NUTRIPLANT_APP.googleAnalyticsMeasurementId) || '';
      if (!id) return;
      window.__npGaInit = true;
      window.dataLayer = window.dataLayer || [];
      function gtag(){ window.dataLayer.push(arguments); }
      window.gtag = window.gtag || gtag;
      gtag('js', new Date());
      gtag('config', id, {
        page_title: resolveGaPageTitle(flags),
        page_location: window.location.href
      });
      if (!document.querySelector('script[data-np-ga]')) {
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
        s.setAttribute('data-np-ga', '1');
        document.head.appendChild(s);
      }
    }

    if (window.NUTRIPLANT_APP) {
      boot();
      return;
    }

    var configScript = document.createElement('script');
    configScript.src = base + 'app-config.js';
    configScript.onload = boot;
    configScript.onerror = boot;
    document.head.appendChild(configScript);
  }

  function init() {
    var base = assetBase();
    var flags = pageFlags();
    loadGoogleAnalytics(base, flags);
    upgradeAutoriaBtn(base, flags);
    insertManualBtn(base, flags);
    hideBrandSubtitle();
    upgradeAutoriaTitle(base, flags);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
