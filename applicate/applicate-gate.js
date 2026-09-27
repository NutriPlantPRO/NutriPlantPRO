(function () {
  'use strict';

  var ADMIN_EMAIL = 'admin@nutriplantpro.com';
  var STORAGE_KEY = 'np-applicate-auth';
  var WA_NUMBER = '13868044542';

  var state = {
    client: null,
    user: null,
    isAdmin: false,
    tablesOk: false,
    courses: [],
    catalog: [],
    purchases: [],
    saves: [],
    certs: [],
    profile: null,
    buyCourseId: null,
    aulaCourseId: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function t(key, fallback) {
    if (window.NpI18n && typeof window.NpI18n.t === 'function') {
      var v = window.NpI18n.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function applyI18n(root) {
    if (window.NpI18n && typeof window.NpI18n.apply === 'function') {
      window.NpI18n.apply(root || document);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showMsg(el, kind, text) {
    if (!el) return;
    el.className = 'ap-msg is-on ' + (kind || 'warn');
    el.textContent = text || '';
  }

  function hideMsg(el) {
    if (!el) return;
    el.className = 'ap-msg';
    el.textContent = '';
  }

  function data() {
    return window.ApplicateData || null;
  }

  function applicateClient() {
    var cfg = window.NUTRIPLANT_SUPABASE;
    if (!cfg || !cfg.enabled || !cfg.url || !cfg.anonKey) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    if (!window._applicateSb) {
      window._applicateSb = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: STORAGE_KEY
        }
      });
    }
    return window._applicateSb;
  }

  function isAdminProfile(profile, email) {
    if (profile && profile.is_admin === true) return true;
    return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
  }

  async function loadAdminFlag(client, user) {
    if (!client || !user) return false;
    var email = user.email || '';
    try {
      var res = await client.from('profiles').select('is_admin, email').eq('id', user.id).maybeSingle();
      if (res.data && isAdminProfile(res.data, res.data.email || email)) return true;
    } catch (e) { /* ignore */ }
    return isAdminProfile(null, email);
  }

  function showGate() {
    var gate = $('apGate');
    var app = $('apApp');
    var top = $('apTopGate');
    if (gate) gate.style.display = '';
    if (top) top.style.display = '';
    if (app) app.classList.remove('is-on');
  }

  function showApp() {
    var gate = $('apGate');
    var app = $('apApp');
    var top = $('apTopGate');
    if (gate) gate.style.display = 'none';
    if (top) top.style.display = 'none';
    if (app) app.classList.add('is-on');
  }

  function openPanel(name) {
    document.querySelectorAll('[data-ap-panel]').forEach(function (el) {
      el.classList.toggle('is-on', el.getAttribute('data-ap-panel') === name);
    });
    document.querySelectorAll('[data-ap-nav]').forEach(function (el) {
      el.classList.toggle('is-on', el.getAttribute('data-ap-nav') === name);
    });
  }

  function ownedSet() {
    var set = {};
    (state.purchases || []).forEach(function (p) {
      if (p && p.course_id) set[p.course_id] = true;
    });
    return set;
  }

  function savedSet() {
    var set = {};
    (state.saves || []).forEach(function (s) {
      if (s && s.course_id) set[s.course_id] = true;
    });
    return set;
  }

  function courseById(id) {
    if (!id) return null;
    for (var i = 0; i < state.courses.length; i++) {
      if (state.courses[i].id === id) return state.courses[i];
    }
    return null;
  }

  function priceLabel(course) {
    if (course && course.price_usd != null && course.price_usd !== '') {
      return 'USD ' + Number(course.price_usd).toFixed(2);
    }
    return t('auth.applicate_price_tba', 'Precio al publicar');
  }

  function emptySlotHtml() {
    return (
      '<article class="ap-slot is-locked">' +
        '<div class="ap-slot__cover">' + esc(t('auth.applicate_slot_cover', 'Portada cuando se suba')) + '</div>' +
        '<div class="ap-slot__body">' +
          '<h3>' + esc(t('auth.applicate_slot_title', 'Espacio del primer curso')) + '</h3>' +
          '<p>' + esc(t('auth.applicate_slot_line', 'Vacío por ahora. Al cargar el curso aquí se verá la portada y el candado o Ver.')) + '</p>' +
          '<div class="ap-slot__actions">' +
            '<button type="button" class="ap-lock-btn" data-ap-buy>' +
              '<span class="ap-lock" aria-hidden="true">🔒</span>' +
              '<span>' + esc(t('auth.applicate_buy', 'Comprar')) + '</span>' +
            '</button>' +
            '<button type="button" class="ap-save-btn" data-ap-save>' + esc(t('auth.applicate_save', 'Guardar')) + '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function courseCardHtml(course) {
    var owned = !!ownedSet()[course.id];
    var saved = !!savedSet()[course.id];
    var cover = course.cover_url
      ? '<img src="' + esc(course.cover_url) + '" alt="">'
      : esc(t('auth.applicate_slot_cover', 'Portada cuando se suba'));
    var action = owned
      ? '<button type="button" class="ap-view-btn" data-ap-open-aula="' + esc(course.id) + '">' + esc(t('auth.applicate_view', 'Ver')) + '</button>'
      : '<button type="button" class="ap-lock-btn" data-ap-buy="' + esc(course.id) + '"><span class="ap-lock" aria-hidden="true">🔒</span><span>' + esc(t('auth.applicate_buy', 'Comprar')) + '</span></button>';
    return (
      '<article class="ap-slot' + (owned ? ' is-open' : ' is-locked') + '">' +
        '<div class="ap-slot__cover">' + cover + '</div>' +
        '<div class="ap-slot__body">' +
          '<h3>' + esc(course.title || t('auth.applicate_slot_title', 'Curso')) + '</h3>' +
          '<p>' + esc(course.summary || priceLabel(course)) + '</p>' +
          '<div class="ap-slot__actions">' +
            action +
            '<button type="button" class="ap-save-btn' + (saved ? ' is-on' : '') + '" data-ap-save="' + esc(course.id) + '">' +
              esc(saved ? t('auth.applicate_saved_on', 'Guardado') : t('auth.applicate_save', 'Guardar')) +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderCatalog() {
    var grid = $('apCourseGrid');
    var count = $('apCourseCount');
    var ownedN = (state.purchases || []).length;
    var availN = (state.catalog || []).length;
    if (count) {
      count.textContent = t('auth.applicate_counts', 'Disponibles {n} · Comprados {m}')
        .replace('{n}', String(availN))
        .replace('{m}', String(ownedN));
    }
    if (!grid) return;
    if (!state.catalog.length) {
      grid.innerHTML = emptySlotHtml();
      return;
    }
    grid.innerHTML = state.catalog.map(courseCardHtml).join('');
  }

  function listItemCourse(course, extra) {
    if (!course) {
      return '<li><strong>' + esc(t('auth.applicate_slot_title', 'Curso')) + '</strong>' +
        (extra ? '<span class="ap-list__meta">' + esc(extra) + '</span>' : '') + '</li>';
    }
    var owned = !!ownedSet()[course.id];
    var btn = owned
      ? '<button type="button" class="ap-view-btn" data-ap-open-aula="' + esc(course.id) + '">' + esc(t('auth.applicate_open', 'Abrir')) + '</button>'
      : '<button type="button" class="ap-lock-btn" data-ap-buy="' + esc(course.id) + '">' + esc(t('auth.applicate_buy', 'Comprar')) + '</button>';
    return (
      '<li>' +
        '<strong>' + esc(course.title || '') + '</strong>' +
        (extra ? '<span class="ap-list__meta">' + esc(extra) + '</span>' : '') +
        '<div class="ap-slot__actions" style="margin-top:8px;">' + btn + '</div>' +
      '</li>'
    );
  }

  function renderLists() {
    var ownedN = $('apOwnedCount');
    if (ownedN) ownedN.textContent = String((state.purchases || []).length);
    var emptyOwned = '<li class="ap-list__empty">' + esc(t('auth.applicate_empty_owned_box', 'Todavía no hay cursos asignados.')) + '</li>';
    var emptySaved = '<li class="ap-list__empty">' + esc(t('auth.applicate_empty_saved', 'Aquí irán los que se marquen para más tarde.')) + '</li>';
    var ownedHtml = (state.purchases || []).map(function (p) {
      return listItemCourse(courseById(p.course_id), p.source || '');
    }).filter(Boolean).join('') || emptyOwned;
    var savedHtml = (state.saves || []).map(function (s) {
      return listItemCourse(courseById(s.course_id), t('auth.applicate_saved', 'Guardados para después'));
    }).filter(Boolean).join('') || emptySaved;
    ['apOwnedList', 'apBiblioOwned'].forEach(function (id) {
      var el = $(id);
      if (el) el.innerHTML = ownedHtml;
    });
    var savedEl = $('apBiblioSaved');
    if (savedEl) savedEl.innerHTML = savedHtml;
  }

  function renderCerts() {
    var box = $('apCertList');
    var diplomaCourse = document.querySelector('.ap-diploma__course');
    if (!state.certs.length) {
      if (box) box.innerHTML = '';
      if (diplomaCourse) diplomaCourse.textContent = t('auth.applicate_diploma_course', 'Título del curso (cuando exista)');
      return;
    }
    var first = courseById(state.certs[0].course_id);
    if (diplomaCourse) diplomaCourse.textContent = (first && first.title) || t('auth.applicate_diploma_course', 'Título del curso (cuando exista)');
    if (!box) return;
    box.innerHTML = state.certs.map(function (c) {
      var course = courseById(c.course_id);
      return (
        '<li><strong>' + esc((course && course.title) || 'Curso') + '</strong>' +
        '<span class="ap-list__meta">' + esc(t('auth.applicate_cert_folio', 'Folio') + ': ' + (c.folio || '—')) + '</span></li>'
      );
    }).join('');
  }

  function renderProfile() {
    var box = $('apProfileBox');
    var avatar = document.querySelector('.ap-avatar');
    var email = (state.user && state.user.email) || '';
    var name = (state.profile && state.profile.full_name) || email.split('@')[0] || 'NP';
    if (avatar) {
      avatar.textContent = name.slice(0, 2).toUpperCase();
      avatar.title = email || name;
    }
    if (!box) return;
    var p = state.profile || {};
    box.innerHTML =
      '<dl class="ap-profile">' +
        '<div><dt>' + esc(t('auth.applicate_full_name', 'Nombre completo')) + '</dt><dd>' + esc(p.full_name || name) + '</dd></div>' +
        '<div><dt>' + esc(t('auth.email', 'Correo electrónico')) + '</dt><dd>' + esc(p.email || email) + '</dd></div>' +
        '<div><dt>' + esc(t('auth.phone', 'Teléfono')) + '</dt><dd>' + esc([p.phone_code, p.phone].filter(Boolean).join(' ') || '—') + '</dd></div>' +
        '<div><dt>' + esc(t('auth.country', 'País')) + '</dt><dd>' + esc(p.country || '—') + '</dd></div>' +
        '<div><dt>' + esc(t('auth.profession', 'Profesión')) + '</dt><dd>' + esc(p.profession || '—') + '</dd></div>' +
      '</dl>';
  }

  function youtubeId(url) {
    var m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : '';
  }

  function renderVideo(url) {
    var inner = $('apVideoInner');
    if (!inner) return;
    if (!url) {
      inner.innerHTML =
        '<div class="ap-video__play">▶</div>' +
        '<div>' + esc(t('auth.applicate_video_empty', 'El video se ve aquí. Pantalla completa o en esta ventana, con el marco de Applicate.')) + '</div>';
      return;
    }
    var yt = youtubeId(url);
    if (yt) {
      inner.innerHTML = '<iframe src="https://www.youtube.com/embed/' + esc(yt) + '" title="Clase" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      return;
    }
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
      inner.innerHTML = '<video controls src="' + esc(url) + '"></video>';
      return;
    }
    inner.innerHTML = '<a class="ap-btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('auth.applicate_open', 'Abrir')) + '</a>';
  }

  async function openAula(courseId) {
    state.aulaCourseId = courseId || null;
    openPanel('aula');
    openAulaTab('clases');
    var title = $('apAulaTitle');
    var course = courseById(courseId);
    if (title) title.textContent = (course && course.title) || t('auth.applicate_aula_title', 'Aula del curso');
    var d = data();
    var lessons = d ? await d.listLessons(state.client, courseId) : [];
    var files = d ? await d.listFiles(state.client, courseId) : [];
    var list = $('apLessonList');
    if (list) {
      if (!lessons.length) {
        list.innerHTML = '<li class="ap-list__empty">' + esc(t('auth.applicate_lesson_empty', 'Aún no hay clases cargadas.')) + '</li>';
      } else {
        list.innerHTML = lessons.map(function (l, i) {
          return '<li><button type="button" class="ap-lesson" data-ap-lesson="' + i + '">' + esc((i + 1) + '. ' + (l.title || 'Clase')) + '</button></li>';
        }).join('');
        list.querySelectorAll('[data-ap-lesson]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var idx = parseInt(btn.getAttribute('data-ap-lesson'), 10);
            renderVideo(lessons[idx] && lessons[idx].video_url);
          });
        });
      }
    }
    renderVideo(lessons[0] && lessons[0].video_url);
    var filesBox = $('apFilesBox');
    if (filesBox) {
      if (!files.length) {
        filesBox.textContent = t('auth.applicate_files_empty', 'PDF, Excel o Word del curso. Vacío hasta que se carguen por terminal.');
      } else {
        filesBox.innerHTML = '<ul class="ap-list">' + files.map(function (f) {
          var href = f.storage_path && /^https?:\/\//i.test(f.storage_path) ? f.storage_path : '';
          var label = esc(f.name || 'Archivo');
          return '<li>' + (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>' : label) + '</li>';
        }).join('') + '</ul>';
      }
    }
  }

  function renderTablesNotice() {
    var bar = $('apTablesNote');
    if (!bar) return;
    if (state.tablesOk) {
      bar.hidden = true;
      bar.textContent = '';
      return;
    }
    bar.hidden = false;
    bar.textContent = t('auth.applicate_tables_missing', 'Tablas Applicate aún no están en Supabase. Corre supabase-aplicate-tables.sql.');
  }

  async function refreshDashboard() {
    var d = data();
    if (!d || !state.client || !state.user) return;
    var ping = await d.pingTables(state.client);
    state.tablesOk = !!(ping && ping.ok);
    renderTablesNotice();
    if (!state.tablesOk) {
      state.courses = [];
      state.catalog = [];
      state.purchases = [];
      state.saves = [];
      state.certs = [];
      state.profile = null;
      renderCatalog();
      renderLists();
      renderCerts();
      renderProfile();
      return;
    }
    var published = await d.listPublishedCourses(state.client);
    var all = state.isAdmin ? await d.listAllCourses(state.client) : published;
    state.courses = all || published || [];
    state.catalog = (published || []).slice();
    state.purchases = await d.listPurchases(state.client, state.user.id);
    state.saves = await d.listSaves(state.client, state.user.id);
    state.certs = await d.listCertificates(state.client, state.user.id);
    state.profile = await d.getProfile(state.client, state.user.id);
    renderCatalog();
    renderLists();
    renderCerts();
    renderProfile();
  }

  function waHref(course) {
    var title = (course && course.title) ? course.title : 'un curso';
    var text = 'Hola, quiero pagar ' + title + ' de Applicate por transferencia.';
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
  }

  function openBuySheet(courseId) {
    state.buyCourseId = courseId || null;
    var sheet = $('apBuySheet');
    var course = courseById(courseId);
    var title = $('apBuyTitle');
    var wa = $('apBuyWa');
    hideMsg($('apBuyMsg'));
    if (title) title.textContent = course && course.title
      ? (t('auth.applicate_buy_title', 'Comprar curso') + ' · ' + course.title)
      : t('auth.applicate_buy_title', 'Comprar curso');
    if (wa) wa.href = waHref(course);
    if (sheet) sheet.hidden = false;
  }

  function closeBuySheet() {
    var sheet = $('apBuySheet');
    if (sheet) sheet.hidden = true;
  }

  function bindDelegates() {
    document.addEventListener('click', function (e) {
      var buy = e.target.closest && e.target.closest('[data-ap-buy]');
      if (buy) {
        e.preventDefault();
        openBuySheet(buy.getAttribute('data-ap-buy') || '');
        return;
      }
      var aula = e.target.closest && e.target.closest('[data-ap-open-aula]');
      if (aula) {
        e.preventDefault();
        openAula(aula.getAttribute('data-ap-open-aula'));
        return;
      }
      var save = e.target.closest && e.target.closest('[data-ap-save]');
      if (save) {
        e.preventDefault();
        toggleSave(save.getAttribute('data-ap-save') || '');
      }
    });
  }

  async function toggleSave(courseId) {
    if (!courseId) {
      showMsg($('apBuyMsg'), 'warn', t('auth.applicate_slot_line', 'Vacío por ahora. Al cargar el curso aquí se verá la portada y el candado o Ver.'));
      return;
    }
    var d = data();
    if (!d || !state.client || !state.user) return;
    var want = !savedSet()[courseId];
    await d.toggleSave(state.client, state.user.id, courseId, want);
    await refreshDashboard();
  }

  async function enterIfAdmin(client) {
    var sessionRes = await client.auth.getSession();
    var session = sessionRes && sessionRes.data && sessionRes.data.session;
    if (!session || !session.user) {
      showGate();
      return false;
    }
    var ok = await loadAdminFlag(client, session.user);
    if (!ok) {
      await client.auth.signOut();
      showGate();
      return false;
    }
    state.client = client;
    state.user = session.user;
    state.isAdmin = true;
    showApp();
    await refreshDashboard();
    var d = data();
    if (d) d.logVisit(client, session.user.id);
    return true;
  }

  function bindPhoneOther() {
    var sel = $('apRegPhoneCode');
    var other = $('apRegPhoneOther');
    if (!sel || !other) return;
    function sync() {
      var isOther = sel.value === 'other';
      other.hidden = !isOther;
      other.required = false;
    }
    sel.addEventListener('change', sync);
    sync();
  }

  function bindNav() {
    document.querySelectorAll('[data-ap-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openPanel(btn.getAttribute('data-ap-nav'));
      });
    });
  }

  function bindBuy() {
    var sheet = $('apBuySheet');
    var close = $('apBuyClose');
    var paypal = $('apBuyPaypal');
    if (close) close.addEventListener('click', closeBuySheet);
    if (sheet) {
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) closeBuySheet();
      });
    }
    if (paypal) {
      paypal.addEventListener('click', function () {
        showMsg($('apBuyMsg'), 'warn', t('auth.applicate_buy_paypal_soon', 'PayPal de cursos se conecta al lanzar. Por ahora usa WhatsApp o espera.'));
      });
    }
  }

  function openAulaTab(name) {
    document.querySelectorAll('[data-ap-tab]').forEach(function (el) {
      el.classList.toggle('is-on', el.getAttribute('data-ap-tab') === name);
    });
    document.querySelectorAll('[data-ap-tabpanel]').forEach(function (el) {
      var on = el.getAttribute('data-ap-tabpanel') === name;
      if (on) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
    });
  }

  function bindAula() {
    document.querySelectorAll('[data-ap-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAulaTab(btn.getAttribute('data-ap-tab'));
      });
    });
    var fs = $('apVideoFs');
    var stage = $('apVideoStage');
    if (fs && stage) {
      fs.addEventListener('click', function () {
        if (!stage.requestFullscreen) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else stage.requestFullscreen();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    applyI18n(document);
    bindPhoneOther();
    bindNav();
    bindAula();
    bindBuy();
    bindDelegates();
    openPanel('inicio');

    var loginForm = $('apLoginForm');
    var loginMsg = $('apLoginMsg');
    var loginBtn = $('apLoginBtn');
    var logoutBtn = $('apLogoutBtn');
    var regForm = $('apRegForm');

    if (regForm) {
      regForm.addEventListener('submit', function (e) {
        e.preventDefault();
        showMsg($('apRegMsg'), 'warn', t('auth.applicate_reg_blocked', 'El registro abre próximamente.'));
      });
    }

    var client = applicateClient();
    if (!client) {
      showGate();
      showMsg(loginMsg, 'err', t('auth.applicate_cfg_error', 'No se pudo abrir el acceso. Intenta más tarde.'));
      return;
    }
    state.client = client;

    try {
      await enterIfAdmin(client);
    } catch (e) {
      showGate();
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideMsg(loginMsg);
        var email = String(($('apLoginEmail') && $('apLoginEmail').value) || '').trim();
        var password = String(($('apLoginPass') && $('apLoginPass').value) || '');
        if (!email || !password) {
          showMsg(loginMsg, 'err', t('auth.err_email_pass', 'Ingresa correo y contraseña.'));
          return;
        }
        if (loginBtn) loginBtn.disabled = true;
        try {
          var signed = await client.auth.signInWithPassword({ email: email, password: password });
          if (signed.error || !signed.data || !signed.data.user) {
            showMsg(loginMsg, 'warn', t('auth.applicate_soon_login', 'Applicate abre próximamente.'));
            return;
          }
          var ok = await loadAdminFlag(client, signed.data.user);
          if (!ok) {
            await client.auth.signOut();
            showMsg(loginMsg, 'warn', t('auth.applicate_soon_login', 'Applicate abre próximamente.'));
            return;
          }
          state.user = signed.data.user;
          state.isAdmin = true;
          showApp();
          await refreshDashboard();
          var d = data();
          if (d) d.logVisit(client, signed.data.user.id);
        } catch (err) {
          showMsg(loginMsg, 'warn', t('auth.applicate_soon_login', 'Applicate abre próximamente.'));
        } finally {
          if (loginBtn) loginBtn.disabled = false;
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function () {
        try { await client.auth.signOut(); } catch (e) { /* ignore */ }
        state.user = null;
        state.isAdmin = false;
        showGate();
      });
    }
  });
})();
