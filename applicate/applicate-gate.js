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
          '<p class="ap-slot__price">' + esc(priceLabel(course)) + '</p>' +
          '<p>' + esc(course.summary || '') + '</p>' +
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

  var DEFAULT_PRESENTER = 'José de Jesús Ávila Mendoza';

  function fillDiploma(cert, course) {
    var nameEl = $('apDipName');
    var courseEl = $('apDipCourse');
    var dateEl = $('apDipDate');
    var folioEl = $('apDipFolio');
    var presenterEl = $('apDipPresenter');
    var signEl = $('apDipSign');
    var student = (state.profile && state.profile.full_name) || (state.user && state.user.email) || 'Nombre del alumno';
    var when = cert && cert.issued_at ? new Date(cert.issued_at) : new Date();
    var dateText = when.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    if (nameEl) nameEl.textContent = student;
    if (courseEl) courseEl.textContent = (course && course.title) || 'Espacio del primer curso';
    if (dateEl) dateEl.textContent = dateText;
    if (folioEl) folioEl.textContent = cert && cert.folio ? ('Folio ' + cert.folio) : 'Folio de ejemplo';
    if (presenterEl) presenterEl.textContent = (course && course.presenter) || DEFAULT_PRESENTER;
    if (signEl) {
      var presenter = (course && course.presenter) || DEFAULT_PRESENTER;
      var src = (course && course.signature_url) || '';
      if (!src && presenter === DEFAULT_PRESENTER) src = '../assets/firma José de Jesús Avila Mendoza.png';
      if (src) {
        signEl.onerror = function () { signEl.hidden = true; };
        signEl.src = src;
        signEl.hidden = false;
      } else {
        signEl.removeAttribute('src');
        signEl.hidden = true;
      }
    }
  }

  function renderCerts() {
    var box = $('apCertList');
    var cert = state.certs && state.certs[0];
    var course = cert ? courseById(cert.course_id) : (state.courses && state.courses[0]);
    fillDiploma(cert, course);
    if (!box) return;
    if (!state.certs.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = state.certs.map(function (c) {
      var item = courseById(c.course_id);
      return (
        '<li><strong>' + esc((item && item.title) || 'Curso') + '</strong>' +
        '<span class="ap-list__meta">' + esc(t('auth.applicate_cert_folio', 'Folio') + ': ' + (c.folio || '—')) + '</span></li>'
      );
    }).join('');
  }

  function loadHtml2Pdf() {
    return new Promise(function (resolve, reject) {
      if (window.html2pdf) {
        resolve(window.html2pdf);
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
      s.onload = function () {
        if (window.html2pdf) resolve(window.html2pdf);
        else reject(new Error('pdf'));
      };
      s.onerror = function () { reject(new Error('pdf')); };
      document.head.appendChild(s);
    });
  }

  async function downloadDiploma() {
    var sheet = $('apDiploma');
    var btn = $('apDipPdf');
    if (!sheet) return;
    if (btn) btn.disabled = true;
    try {
      var html2pdf = await loadHtml2Pdf();
      var course = (state.certs[0] && courseById(state.certs[0].course_id)) || (state.courses && state.courses[0]);
      var title = (course && course.title) || 'constancia';
      await html2pdf().set({
        margin: 8,
        filename: 'constancia-' + title.replace(/\s+/g, '-').toLowerCase() + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      }).from(sheet).save();
    } catch (e) {
      alert('No se pudo crear el PDF. Intenta de nuevo.');
    } finally {
      if (btn) btn.disabled = false;
    }
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
      inner.innerHTML = '<video controls controlsList="nofullscreen" playsinline src="' + esc(url) + '"></video>';
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
    if (state.isAdmin && d.ensureTrialCourse) {
      await d.ensureTrialCourse(state.client);
    }
    var published = await d.listPublishedCourses(state.client);
    var all = state.isAdmin ? await d.listAllCourses(state.client) : published;
    state.courses = all || published || [];
    state.catalog = state.isAdmin ? (all || []).slice() : (published || []).slice();
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

  function paypalAmount(course) {
    var n = course && course.price_usd != null ? Number(course.price_usd) : NaN;
    if (!n || isNaN(n) || n <= 0) return '';
    return n.toFixed(2);
  }

  async function paypalClientId() {
    try {
      var r = await fetch('/api/paypal-config', { method: 'GET' });
      var j = r.ok ? await r.json() : null;
      if (j && j.clientId) return String(j.clientId);
    } catch (e) { /* ignore */ }
    return '';
  }

  function loadPaypalSdk(clientId) {
    return new Promise(function (resolve, reject) {
      if (window.paypal && window.paypal.Buttons && window._apPaypalMode === 'capture') {
        resolve(window.paypal);
        return;
      }
      var previous = document.querySelector('script[data-ap-paypal="1"]');
      if (previous) previous.parentNode.removeChild(previous);
      var s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(clientId) + '&currency=USD&intent=capture';
      s.async = true;
      s.setAttribute('data-ap-paypal', '1');
      s.onload = function () {
        window._apPaypalMode = 'capture';
        resolve(window.paypal);
      };
      s.onerror = function () { reject(new Error('sdk')); };
      document.head.appendChild(s);
    });
  }

  async function mountPaypalButtons(course) {
    var slot = $('apPaypalButtons');
    if (!slot) return;
    slot.innerHTML = '';
    var amount = paypalAmount(course);
    if (!amount || !course || !course.id) {
      showMsg($('apBuyMsg'), 'warn', t('auth.applicate_price_tba', 'Precio al publicar'));
      return;
    }
    var clientId = await paypalClientId();
    if (!clientId) {
      showMsg($('apBuyMsg'), 'err', t('auth.applicate_paypal_site', 'PayPal live se abre en nutriplantpro.com/applicate.'));
      return;
    }
    var sdk;
    try {
      sdk = await loadPaypalSdk(clientId);
    } catch (e) {
      showMsg($('apBuyMsg'), 'err', t('auth.applicate_paypal_fail', 'No se pudo abrir PayPal. Intenta de nuevo.'));
      return;
    }
    if (!sdk || !sdk.Buttons) return;
    sdk.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: function (data, actions) {
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: amount },
            description: (course.title || 'Applicate').slice(0, 120),
            custom_id: 'ap:' + state.user.id + ':' + course.id
          }]
        });
      },
      onApprove: function (data, actions) {
        return actions.order.capture().then(async function (details) {
          var cap = details && details.purchase_units && details.purchase_units[0] && details.purchase_units[0].payments && details.purchase_units[0].payments.captures && details.purchase_units[0].payments.captures[0];
          var status = (cap && cap.status) || (details && details.status) || '';
          if (status !== 'COMPLETED') {
            showMsg($('apBuyMsg'), 'warn', t('auth.applicate_paypal_fail', 'No se pudo abrir PayPal. Intenta de nuevo.'));
            return;
          }
          var d = dataApi();
          var captureId = (cap && cap.id) || (details && details.id) || '';
          await d.ensureStudentRow(state.client, state.user.id, {
            email: state.user.email || '',
            full_name: (state.profile && state.profile.full_name) || ''
          });
          var saved = await d.assignCourse(state.client, state.user.id, course.id, 'paypal', 'PayPal ' + amount + ' USD', state.user.id, captureId);
          if (!saved.ok) {
            showMsg($('apBuyMsg'), 'err', saved.error || t('auth.applicate_paypal_fail', 'No se pudo abrir PayPal. Intenta de nuevo.'));
            return;
          }
          closeBuySheet();
          await refreshDashboard();
        });
      },
      onCancel: function () {
        showMsg($('apBuyMsg'), 'warn', t('auth.applicate_paypal_cancel', 'Pago cancelado.'));
      },
      onError: function () {
        showMsg($('apBuyMsg'), 'err', t('auth.applicate_paypal_fail', 'No se pudo abrir PayPal. Intenta de nuevo.'));
      }
    }).render(slot);
  }

  function dataApi() {
    return data();
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
    mountPaypalButtons(course);
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
    var side = $('apSide');
    document.querySelectorAll('[data-ap-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openPanel(btn.getAttribute('data-ap-nav'));
        if (side && window.matchMedia('(max-width: 720px)').matches) {
          side.classList.remove('is-open');
        }
      });
    });
    var brand = side && side.querySelector('.ap-side__brand');
    if (brand && side) {
      brand.addEventListener('click', function () {
        if (window.matchMedia('(max-width: 720px)').matches) {
          side.classList.toggle('is-open');
        }
      });
    }
  }

  function bindBuy() {
    var sheet = $('apBuySheet');
    var close = $('apBuyClose');
    if (close) close.addEventListener('click', closeBuySheet);
    if (sheet) {
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) closeBuySheet();
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
    function syncFsLabel() {
      if (!fs || !stage) return;
      var on = document.fullscreenElement === stage;
      fs.textContent = on
        ? t('auth.applicate_video_exit', 'Salir de pantalla completa')
        : t('auth.applicate_video_fs', 'Pantalla completa');
    }
    if (fs && stage) {
      fs.addEventListener('click', function () {
        if (!stage.requestFullscreen) return;
        if (document.fullscreenElement === stage) document.exitFullscreen();
        else stage.requestFullscreen();
      });
      document.addEventListener('fullscreenchange', syncFsLabel);
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    applyI18n(document);
    bindPhoneOther();
    bindNav();
    bindAula();
    bindBuy();
    var pdfBtn = $('apDipPdf');
    if (pdfBtn) pdfBtn.addEventListener('click', downloadDiploma);
    bindDelegates();
    openPanel('inicio');

    var loginForm = $('apLoginForm');
    var loginMsg = $('apLoginMsg');
    var loginBtn = $('apLoginBtn');
    var logoutBtn = $('apLogoutBtn');
    var regForm = $('apRegForm');

    var regSheet = $('apRegSheet');
    var openReg = $('apOpenReg');
    var closeReg = $('apRegClose');
    function showReg() {
      if (!regSheet) return;
      hideMsg($('apRegMsg'));
      regSheet.hidden = false;
    }
    function hideReg() {
      if (!regSheet) return;
      regSheet.hidden = true;
    }
    if (openReg) openReg.addEventListener('click', showReg);
    if (closeReg) closeReg.addEventListener('click', hideReg);
    if (regSheet) {
      regSheet.addEventListener('click', function (e) {
        if (e.target === regSheet) hideReg();
      });
    }
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
