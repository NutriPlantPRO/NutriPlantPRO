/**
 * Manual técnico — idioma desde prefs del usuario (misma origen) o ?lang=en|es.
 * Traduce chrome / índice. Los cuerpos de capítulo siguen en ES hasta traducción completa.
 */
(function (w) {
  'use strict';

  var SESSION_KEY = 'np_manual_lang';
  var PREFS_KEY = 'nutriplant_ui_prefs_v1';

  var STRINGS = {
    manual_tech: { es: 'Manual Técnico', en: 'Technical Manual' },
    manual_tech_short: { es: 'Manual técnico', en: 'Technical manual' },
    authorship: { es: 'Autoría', en: 'Authorship' },
    index: { es: 'Índice', en: 'Index' },
    platform: { es: 'Plataforma', en: 'Platform' },
    back: { es: '← Volver', en: '← Back' },
    back_aria: { es: 'Volver a la página anterior', en: 'Go back to the previous page' },
    available: { es: 'Disponible', en: 'Available' },
    search_label: { es: 'Buscar tema o palabra clave', en: 'Search topic or keyword' },
    search_placeholder: {
      es: 'Ej.: VPD, meq, enmiendas, foliar, RAS, Mulder, hidroponía…',
      en: 'E.g.: VPD, meq, amendments, foliar, SAR, Mulder, hydroponics…'
    },
    search_hint: {
      es: 'Escribe al menos 2 letras. Elige un capítulo en la lista y te llevamos directo.',
      en: 'Type at least 2 letters. Pick a chapter from the list to go there.'
    },
    search_empty: {
      es: 'No encontramos capítulos con esa palabra. Prueba: suelo, fertirriego, agua, % meq.',
      en: 'No chapters matched that word. Try: soil, fertigation, water, % meq.'
    },
    search_aria: { es: 'Buscar capítulos del manual', en: 'Search manual chapters' },
    badge: { es: 'Biblioteca pública · v2026.07.1', en: 'Public library · v2026.07.1' },
    hero_title: { es: 'Manual Técnico NutriPlant PRO', en: 'NutriPlant PRO Technical Manual' },
    hero_lead: {
      es: 'Información técnica agronómica estructurada sobre nutrición vegetal, análisis de laboratorio, fertirriego, enmiendas, soluciones nutritivas y manejo de cultivos — alineada con el criterio que usa la plataforma NutriPlant PRO.',
      en: 'Structured agronomic technical information on plant nutrition, lab analysis, fertigation, amendments, nutrient solutions, and crop management — aligned with the approach used in the NutriPlant PRO platform.'
    },
    hero_aside: {
      es: 'Para agrónomos, asesores, técnicos y productores, y para consultas en buscadores e inteligencia artificial con autoría y fórmulas claras.',
      en: 'For agronomists, advisors, technicians, and growers — and for search engines and AI assistants with clear authorship and formulas.'
    },
    authorship_cta: { es: 'Autoría de NutriPlant PRO', en: 'NutriPlant PRO authorship' },
    authorship_view: { es: 'Ver autoría →', en: 'View authorship →' },
    intro: {
      es: 'Cada capítulo documenta la metodología NutriPlant PRO paso a paso: entradas, cálculos, límites y relación con las pantallas de la plataforma.',
      en: 'Each chapter documents the NutriPlant PRO methodology step by step: inputs, calculations, limits, and how they map to platform screens.'
    },
    disclaimer: {
      es: 'Los contenidos son guía técnica de apoyo. La decisión en campo es responsabilidad del técnico; valide con laboratorio y observación local.',
      en: 'Content is a technical support guide. Field decisions are the technician’s responsibility; validate with lab results and local observation.'
    },
    flow_title: { es: '¿Por dónde empiezo en NutriPlant PRO?', en: 'Where do I start in NutriPlant PRO?' },
    flow_text: {
      es: 'Guía rápida del flujo: login → proyecto → diagnóstico → enmiendas → programa → seguimiento. Datos primero, interpretación después, decisión técnica al final.',
      en: 'Quick flow guide: login → project → diagnosis → amendments → program → monitoring. Data first, interpretation next, technical decision last.'
    },
    flow_cta: { es: 'Ver guía de flujo →', en: 'See flow guide →' },
    pillars_h2: { es: 'Pilares del manual', en: 'Manual pillars' },
    chapters_h2: { es: 'Capítulos', en: 'Chapters' },
    chapters_meta: {
      es: '25 capítulos publicados · El icono de cada enlace indica el pilar al que pertenece (arriba).',
      en: '25 published chapters · Each link icon shows the pillar it belongs to (above).'
    },
    authorship_h2: { es: 'Autoría técnica', en: 'Technical authorship' },
    authorship_meta: {
      es: 'Referente técnico, trayectoria y criterio detrás de NutriPlant PRO.',
      en: 'Technical reference, background, and judgment behind NutriPlant PRO.'
    },
    footer_copy: { es: '© NutriPlant PRO · Manual técnico público', en: '© NutriPlant PRO · Public technical manual' },
    footer_platform: { es: 'Ir a la plataforma', en: 'Go to the platform' },
    footer_privacy: { es: 'Privacidad', en: 'Privacy' },
    body_note: {
      es: '',
      en: 'English navigation. Chapter body text is still in Spanish; full chapter translations are in progress.'
    }
  };

  var PHRASES = [
    ['Guía rápida: flujo de plataforma y criterio de uso', 'Quick guide: platform flow and decision criteria'],
    ['Unidades: ppm, meq/L y óxidos agronómicos', 'Units: ppm, meq/L, and agronomic oxides'],
    ['% meq: triángulos aniónicos y catiónicos', '% meq: anion and cation triangles'],
    ['Análisis de suelo: fertilidad, ideales y kg/ha de ajuste', 'Soil analysis: fertility, targets, and kg/ha adjustment'],
    ['Balance de enmiendas por CIC del suelo', 'Amendment balance by soil CEC'],
    ['Extracción y distribución nutrimental por etapa', 'Nutrient extraction and distribution by stage'],
    ['Programa de fertirriego por etapas', 'Fertigation program by stages'],
    ['Gráficas iónicas en fertirriego', 'Ionic charts in fertigation'],
    ['Granular: requerimiento, programa y mezclas', 'Granular: requirement, program, and mixes'],
    ['Hidroponía: solución nutritiva por etapa', 'Hydroponics: nutrient solution by stage'],
    ['Diseño didáctico de solución nutritiva (CE y triángulos)', 'Didactic nutrient solution design (EC and triangles)'],
    ['VPD, NDVI y NDMI', 'VPD, NDVI, and NDMI'],
    ['Balance hídrico y cálculo rápido de riego', 'Water balance and quick irrigation calc'],
    ['Dureza, acidificación y solubilidad del agua', 'Water hardness, acidification, and solubility'],
    ['N mineralizable y agua disponible en suelo', 'Mineralizable N and plant-available water'],
    ['Interacciones Mulder y compatibilidad de fertilizantes', 'Mulder interactions and fertilizer compatibility'],
    ['Atlas de Aminoácidos Vegetales', 'Plant Amino Acid Atlas'],
    ['Huella de carbono de fertilizantes', 'Fertilizer carbon footprint'],
    ['Análisis de solución nutritiva (laboratorio)', 'Nutrient solution analysis (lab)'],
    ['Extracto de pasta saturada', 'Saturated paste extract'],
    ['Análisis de agua: CE, pH y RAS', 'Water analysis: EC, pH, and SAR'],
    ['Análisis foliar: DOP frente al óptimo', 'Foliar analysis: DOP vs optimum'],
    ['Análisis de fruta: ICC frente al óptimo', 'Fruit analysis: ICC vs optimum'],
    ['% meq en hidroponía y fertirriego: por qué no todo suma 100 %', '% meq in hydroponics and fertigation: why not everything adds to 100%'],
    ['Publicaciones en redes y autoridad técnica', 'Social posts and technical authority'],
    ['Detrás de NutriPlant PRO · Jesús Avila Mendoza', 'Behind NutriPlant PRO · Jesús Avila Mendoza'],
    ['Plataforma NutriPlant PRO', 'NutriPlant PRO platform'],
    ['Fundamentos y suelo', 'Fundamentals and soil'],
    ['Programas, solución y clima', 'Programs, solution, and climate'],
    ['Interacciones', 'Interactions'],
    ['Análisis de laboratorio y FAQ', 'Lab analysis and FAQ'],
    ['Comunicación y autoridad', 'Communication and authority'],
    ['1 · Flujo de la plataforma', '1 · Platform flow'],
    ['A · Fundamentos', 'A · Fundamentals'],
    ['B · Suelo y enmiendas', 'B · Soil and amendments'],
    ['C · Análisis (6 tipos)', 'C · Analysis (6 types)'],
    ['D · Programas', 'D · Programs'],
    ['E · Agua y clima', 'E · Water and climate'],
    ['F · Interacciones', 'F · Interactions'],
    ['G · Redes y comunicación', 'G · Social and communication'],
    ['Login vs proyecto PRO', 'Login vs PRO project'],
    ['Orden de trabajo recomendado', 'Recommended work order'],
    ['Unidades ppm, meq, óxidos', 'ppm, meq, oxide units'],
    ['Balance iónico y % meq', 'Ionic balance and % meq'],
    ['CIC y saturación', 'CEC and saturation'],
    ['kg/ha desde análisis', 'kg/ha from analysis'],
    ['Suelo, agua, pasta, solución', 'Soil, water, paste, solution'],
    ['Foliar, fruta', 'Foliar, fruit'],
    ['Fertirriego, hidroponía', 'Fertigation, hydroponics'],
    ['Granular, extracción por etapa', 'Granular, extraction by stage'],
    ['VPD, balance hídrico, dureza, solubilidad', 'VPD, water balance, hardness, solubility'],
    ['Mulder, compatibilidad', 'Mulder, compatibility'],
    ['Publicaciones técnicas', 'Technical posts'],
    ['Enlaces al manual (GEO)', 'Links to the manual (GEO)'],
    ['Pilar 1 · Flujo de la plataforma', 'Pillar 1 · Platform flow'],
    ['Metodología NutriPlant PRO', 'NutriPlant PRO methodology']
  ];

  function readPrefsLanguage() {
    try {
      if (w.NpPrefs && typeof w.NpPrefs.get === 'function') {
        var prefs = w.NpPrefs.get();
        if (prefs && (prefs.language === 'en' || prefs.language === 'es')) return prefs.language;
      }
    } catch (e) { /* ignore */ }
    try {
      var raw = w.localStorage && w.localStorage.getItem(PREFS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && (parsed.language === 'en' || parsed.language === 'es')) return parsed.language;
    } catch (e2) { /* ignore */ }
    return null;
  }

  function getLanguage() {
    try {
      var q = new URLSearchParams(w.location.search).get('lang');
      if (q === 'en' || q === 'es') {
        try { w.sessionStorage.setItem(SESSION_KEY, q); } catch (e) { /* ignore */ }
        return q;
      }
    } catch (e0) { /* ignore */ }
    try {
      var sess = w.sessionStorage && w.sessionStorage.getItem(SESSION_KEY);
      if (sess === 'en' || sess === 'es') return sess;
    } catch (e1) { /* ignore */ }
    return readPrefsLanguage() || 'es';
  }

  function t(key) {
    var row = STRINGS[key];
    if (!row) return key;
    return getLanguage() === 'en' ? row.en : row.es;
  }

  function withLang(href) {
    if (!href || href.indexOf('javascript:') === 0 || href.charAt(0) === '#') return href;
    try {
      var abs = new URL(href, w.location.href);
      if (abs.origin !== w.location.origin) return href;
      if (!/manual-tecnico/i.test(abs.pathname)) return href;
      abs.searchParams.set('lang', getLanguage());
      return abs.pathname + abs.search + abs.hash;
    } catch (e) {
      return href;
    }
  }

  function rewriteManualLinks(root) {
    var lang = getLanguage();
    (root || document).querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      if (/^https?:/i.test(href) && href.indexOf(w.location.origin) !== 0 && href.indexOf('manual-tecnico') < 0) return;
      if (href.indexOf('manual-tecnico') < 0 && href.indexOf('capitulos/') < 0 && href.indexOf('autoria') < 0 && href.indexOf('index.html') < 0 && href !== '../index.html' && href !== 'index.html') {
        if (!/^\.\.\/(index|autoria)/.test(href) && href.indexOf('login.html') < 0 && href.indexOf('politicas') < 0) return;
      }
      try {
        var next = withLang(href);
        if (next && next !== href) a.setAttribute('href', next);
      } catch (e) { /* ignore */ }
    });
    // Keep lang when leaving to platform/privacy too? optional — skip for login unless from manual
    void lang;
  }

  function replaceExactText(el, mapEsEn) {
    if (!el) return;
    var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (mapEsEn[txt]) el.textContent = mapEsEn[txt];
  }

  function translatePhrasesIn(root) {
    if (getLanguage() !== 'en') return;
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|CODE)$/i.test(parent.tagName)) return;
      // Do not rewrite inside language body blocks (ES/EN article content).
      if (parent.closest && parent.closest('[data-mt-lang]')) return;
      var value = node.nodeValue;
      if (!value || !value.trim()) return;
      var next = value;
      PHRASES.forEach(function (pair) {
        if (next.indexOf(pair[0]) >= 0) next = next.split(pair[0]).join(pair[1]);
      });
      if (next !== value) node.nodeValue = next;
    });
  }

  function applyChrome() {
    var lang = getLanguage();
    try { document.documentElement.lang = lang; } catch (e) { /* ignore */ }

    document.querySelectorAll('.mt-brand span').forEach(function (el) {
      el.textContent = t('manual_tech_short');
    });
    document.querySelectorAll('.mt-autoria-btn__text, .mt-portal-btn--autoria .mt-portal-btn__text').forEach(function (el) {
      el.textContent = t('authorship');
    });
    document.querySelectorAll('.mt-nav a').forEach(function (a) {
      var h = (a.getAttribute('href') || '').toLowerCase();
      var txt = (a.textContent || '').trim();
      if (h.indexOf('login') >= 0 || txt === 'Plataforma' || txt === 'Platform') a.textContent = t('platform');
    });
    document.querySelectorAll('.mt-back-btn').forEach(function (btn) {
      btn.textContent = t('back');
      btn.setAttribute('aria-label', t('back_aria'));
    });
    document.querySelectorAll('.mt-status--live').forEach(function (el) {
      el.textContent = t('available');
    });
    document.querySelectorAll('.mt-portal-btn--manual .mt-portal-btn__text').forEach(function (el) {
      el.textContent = t('manual_tech');
    });
    document.querySelectorAll('.mt-portal-btn--manual').forEach(function (el) {
      el.title = t('manual_tech');
    });

    // Index-only chrome
    var badge = document.querySelector('.mt-hero--index .mt-badge');
    if (badge) badge.textContent = t('badge');
    var h1 = document.querySelector('.mt-hero--index h1');
    if (h1) h1.textContent = t('hero_title');
    var lead = document.querySelector('.mt-hero--index .lead');
    if (lead) lead.textContent = t('hero_lead');
    var aside = document.querySelector('.mt-hero--index .mt-hero__aside');
    if (aside) {
      aside.innerHTML = lang === 'en'
        ? 'For <strong>agronomists, advisors, technicians, and growers</strong>, and for search engines and AI assistants with clear authorship and formulas.'
        : 'Para <strong>agrónomos, asesores, técnicos y productores</strong>, y para consultas en buscadores e inteligencia artificial con autoría y fórmulas claras.';
    }

    var ctaLabel = document.querySelector('.mt-autoria-btn--cta__label span:last-child');
    if (ctaLabel) ctaLabel.textContent = t('authorship_cta');
    var ctaLink = document.querySelector('.mt-autoria-btn--cta__link');
    if (ctaLink) ctaLink.textContent = t('authorship_view');

    var introP = document.querySelector('.mt-index-intro > p');
    if (introP) introP.textContent = t('intro');
    var disc = document.querySelector('.mt-index-intro .mt-disclaimer');
    if (disc) disc.textContent = t('disclaimer');

    var search = document.querySelector('[data-mt-search]');
    if (search) {
      search.setAttribute('aria-label', t('search_aria'));
      var lab = search.querySelector('.mt-search-label');
      if (lab) lab.textContent = t('search_label');
      var input = search.querySelector('#mtSearchInput');
      if (input) input.setAttribute('placeholder', t('search_placeholder'));
      var hint = search.querySelector('.mt-search-hint');
      if (hint) hint.textContent = t('search_hint');
      var empty = search.querySelector('.mt-search-empty');
      if (empty) empty.textContent = t('search_empty');
    }

    var flowTitle = document.querySelector('.mt-flow-banner__title');
    if (flowTitle) flowTitle.textContent = t('flow_title');
    var flowText = document.querySelector('.mt-flow-banner__text');
    if (flowText) flowText.textContent = t('flow_text');
    var flowCta = document.querySelector('.mt-flow-banner__cta');
    if (flowCta) flowCta.textContent = t('flow_cta');

    document.querySelectorAll('main.mt-wrap h2').forEach(function (h2) {
      var txt = (h2.textContent || '').trim();
      if (txt === 'Pilares del manual' || txt === 'Manual pillars') h2.textContent = t('pillars_h2');
      else if (txt === 'Capítulos' || txt === 'Chapters') h2.textContent = t('chapters_h2');
      else if (txt === 'Autoría técnica' || txt === 'Technical authorship') h2.textContent = t('authorship_h2');
    });
    var chaptersMeta = document.querySelector('h2 + .mt-meta');
    if (chaptersMeta && /25 capítulos|25 published/i.test(chaptersMeta.textContent || '')) {
      chaptersMeta.textContent = t('chapters_meta');
    }
    document.querySelectorAll('h2').forEach(function (h2) {
      if (/Autoría técnica|Technical authorship/.test(h2.textContent || '')) {
        var meta = h2.nextElementSibling;
        if (meta && meta.classList.contains('mt-meta')) meta.textContent = t('authorship_meta');
      }
    });

    var footer = document.querySelector('.mt-footer');
    if (footer) {
      var fps = footer.querySelectorAll('p');
      if (fps[0]) fps[0].textContent = t('footer_copy');
      if (fps[1]) {
        fps[1].innerHTML =
          '<a href="' + withLang('../login.html') + '">' + t('footer_platform') + '</a> · ' +
          '<a href="../politicas-privacidad.html">' + t('footer_privacy') + '</a>';
      }
    }

    if (lang === 'en') {
      translatePhrasesIn(document.body);
    }

    applyLangBodies(lang);
    rewriteManualLinks(document);
  }

  function enBodyReady(enEl) {
    if (!enEl) return false;
    var html = (enEl.innerHTML || '').replace(/<!--\s*EN_BODY\s*-->/gi, '').trim();
    return html.length > 40;
  }

  function applyLangBodies(lang) {
    var esEl = document.querySelector('[data-mt-lang="es"]');
    var enEl = document.querySelector('[data-mt-lang="en"]');
    if (!esEl && !enEl) return;
    var ready = enBodyReady(enEl);
    var showEn = lang === 'en' && ready;
    if (esEl) {
      esEl.hidden = showEn;
      esEl.style.display = showEn ? 'none' : '';
    }
    if (enEl) {
      enEl.hidden = !showEn;
      enEl.style.display = showEn ? '' : 'none';
    }
    var existing = document.getElementById('mt-lang-note');
    if (lang === 'en' && !ready) {
      if (!existing) {
        var main = document.querySelector('main.mt-wrap');
        if (main && (/\/capitulos\//.test(w.location.pathname) || /autoria\.html$/.test(w.location.pathname))) {
          var note = document.createElement('p');
          note.id = 'mt-lang-note';
          note.className = 'mt-note';
          note.style.cssText = 'margin:8px 0 14px;padding:8px 10px;font-size:12px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;';
          note.textContent = t('body_note');
          var toolbar = main.querySelector('.mt-toolbar');
          if (toolbar && toolbar.nextSibling) main.insertBefore(note, toolbar.nextSibling);
          else main.insertBefore(note, main.firstChild);
        }
      }
    } else if (existing) {
      existing.remove();
    }
  }

  function chapterTitle(esTitle) {
    if (getLanguage() !== 'en') return esTitle;
    for (var i = 0; i < PHRASES.length; i++) {
      if (PHRASES[i][0] === esTitle) return PHRASES[i][1];
    }
    return esTitle;
  }

  w.NpManualI18n = {
    getLanguage: getLanguage,
    t: t,
    withLang: withLang,
    apply: applyChrome,
    chapterTitle: chapterTitle,
    rewriteLinks: rewriteManualLinks
  };

  function boot() {
    applyChrome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
