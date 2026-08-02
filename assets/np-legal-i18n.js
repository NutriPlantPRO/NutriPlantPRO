/**
 * Páginas legales (privacidad / términos): idioma desde ?lang= o preferencias NutriPlant.
 */
(function (w, d) {
  'use strict';

  var PREFS_KEY = 'nutriplant_ui_prefs_v1';

  function validLang(value) {
    return value === 'es' || value === 'en';
  }

  function langFromQuery() {
    try {
      var q = new URLSearchParams(w.location.search).get('lang');
      return validLang(q) ? q : null;
    } catch (e) {
      return null;
    }
  }

  function langFromPrefs() {
    if (w.NP_PREFS_BOOTSTRAP && validLang(w.NP_PREFS_BOOTSTRAP.language)) {
      return w.NP_PREFS_BOOTSTRAP.language;
    }
    try {
      var raw = w.localStorage.getItem(PREFS_KEY);
      var prefs = raw ? JSON.parse(raw) : null;
      if (prefs && validLang(prefs.language)) return prefs.language;
    } catch (e) {}
    var htmlLang = d.documentElement.getAttribute('data-np-language') || d.documentElement.lang;
    return validLang(htmlLang) ? htmlLang : 'es';
  }

  function persistLanguage(lang) {
    try {
      var raw = w.localStorage.getItem(PREFS_KEY);
      var prefs = raw ? JSON.parse(raw) : null;
      if (!prefs || typeof prefs !== 'object') {
        prefs = { language: lang, unit_system: 'metric', locale: lang === 'en' ? 'en-US' : 'es-MX' };
      } else {
        prefs.language = lang;
      }
      w.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
    if (w.NP_PREFS_BOOTSTRAP) w.NP_PREFS_BOOTSTRAP.language = lang;
  }

  function stampLegalHref(href, lang) {
    if (!href || href.indexOf('javascript:') === 0 || href.charAt(0) === '#') return href;
    var hash = '';
    var iHash = href.indexOf('#');
    if (iHash >= 0) {
      hash = href.slice(iHash);
      href = href.slice(0, iHash);
    }
    var base = href;
    var query = '';
    var iQ = href.indexOf('?');
    if (iQ >= 0) {
      base = href.slice(0, iQ);
      query = href.slice(iQ + 1);
    }
    if (!/politicas-privacidad\.html|terminos-condiciones\.html/i.test(base)) {
      return base + (query ? '?' + query : '') + hash;
    }
    try {
      var params = new URLSearchParams(query);
      params.set('lang', lang);
      var qs = params.toString();
      return base + (qs ? '?' + qs : '') + hash;
    } catch (e) {
      return base + '?lang=' + lang + hash;
    }
  }

  function stampLegalLinks(root, lang) {
    root = root || d;
    var nodes = root.querySelectorAll('a[href*="politicas-privacidad"], a[href*="terminos-condiciones"]');
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      var href = a.getAttribute('href');
      if (!href) continue;
      a.setAttribute('href', stampLegalHref(href, lang));
    }
  }

  function applyLegalLanguage(lang) {
    if (!validLang(lang)) lang = 'es';
    d.documentElement.lang = lang;
    d.documentElement.setAttribute('data-np-language', lang);

    var blocks = d.querySelectorAll('[data-legal-lang]');
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i];
      var on = el.getAttribute('data-legal-lang') === lang;
      el.hidden = !on;
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (on) {
        var title = el.getAttribute('data-legal-title');
        if (title) d.title = title;
        var desc = el.getAttribute('data-legal-description');
        if (desc) {
          var meta = d.querySelector('meta[name="description"]');
          if (meta) meta.setAttribute('content', desc);
        }
      }
    }

    var anchors = d.querySelectorAll('[data-legal-anchor]');
    for (var a = 0; a < anchors.length; a++) {
      var node = anchors[a];
      var block = node.closest('[data-legal-lang]');
      var active = block && block.getAttribute('data-legal-lang') === lang;
      if (active) node.id = node.getAttribute('data-legal-anchor');
      else node.removeAttribute('id');
    }

    stampLegalLinks(d, lang);

    try {
      if (w.location.hash) {
        var target = d.getElementById(w.location.hash.slice(1));
        if (target) {
          w.setTimeout(function () {
            target.scrollIntoView({ block: 'start' });
          }, 0);
        }
      }
    } catch (e) {}

    return lang;
  }

  var fromQuery = langFromQuery();
  var language = fromQuery || langFromPrefs();
  if (fromQuery) persistLanguage(fromQuery);
  applyLegalLanguage(language);

  w.NpLegalI18n = {
    getLanguage: function () { return language; },
    apply: applyLegalLanguage,
    stampLegalHref: stampLegalHref,
    stampLegalLinks: stampLegalLinks
  };
})(window, document);
