(function (w) {
  'use strict';

  function clientOf(sb) {
    return sb || null;
  }

  var COURSE_COLS = 'id, title, summary, price_usd, cover_url, published, sort_order, created_at, presenter, signature_url';
  var COURSE_COLS_BASE = 'id, title, summary, price_usd, cover_url, published, sort_order, created_at';

  async function selectCourses(sb, onlyPublished) {
    if (!sb) return [];
    var q = sb.from('aplicate_courses').select(COURSE_COLS).order('sort_order', { ascending: true });
    if (onlyPublished) q = q.eq('published', true);
    var res = await q;
    if (res.error && /presenter|signature_url|column/i.test(res.error.message || '')) {
      q = sb.from('aplicate_courses').select(COURSE_COLS_BASE).order('sort_order', { ascending: true });
      if (onlyPublished) q = q.eq('published', true);
      res = await q;
    }
    if (res.error) return [];
    return res.data || [];
  }

  async function listPublishedCourses(sb) {
    return selectCourses(sb, true);
  }

  async function listAllCourses(sb) {
    return selectCourses(sb, false);
  }

  async function listPurchases(sb, userId) {
    if (!sb || !userId) return [];
    var res = await sb.from('aplicate_purchases').select('course_id, source, created_at').eq('user_id', userId);
    if (res.error) return [];
    return res.data || [];
  }

  async function listSaves(sb, userId) {
    if (!sb || !userId) return [];
    var res = await sb.from('aplicate_saves').select('course_id, created_at').eq('user_id', userId);
    if (res.error) return [];
    return res.data || [];
  }

  async function toggleSave(sb, userId, courseId, want) {
    if (!sb || !userId || !courseId) return false;
    if (want) {
      var ins = await sb.from('aplicate_saves').upsert({ user_id: userId, course_id: courseId });
      return !ins.error;
    }
    var del = await sb.from('aplicate_saves').delete().eq('user_id', userId).eq('course_id', courseId);
    return !del.error;
  }

  async function listLessons(sb, courseId) {
    if (!sb || !courseId) return [];
    var res = await sb.from('aplicate_lessons').select('id, title, sort_order, video_url').eq('course_id', courseId).order('sort_order', { ascending: true });
    if (res.error) return [];
    return res.data || [];
  }

  async function listFiles(sb, courseId) {
    if (!sb || !courseId) return [];
    var res = await sb.from('aplicate_files').select('id, name, storage_path, mime').eq('course_id', courseId);
    if (res.error) return [];
    return res.data || [];
  }

  async function listStudents(sb) {
    if (!sb) return [];
    var res = await sb.from('aplicate_profiles').select('id, full_name, email, phone, phone_code, country, state, profession, created_at').order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
  }

  async function listAllPurchases(sb) {
    if (!sb) return [];
    var res = await sb.from('aplicate_purchases').select('id, user_id, course_id, source, note, created_at').order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
  }

  async function assignCourse(sb, userId, courseId, source, note, assignedBy, paypalId) {
    if (!sb || !userId || !courseId) return { ok: false, error: 'faltan datos' };
    var row = {
      user_id: userId,
      course_id: courseId,
      source: source || 'admin',
      note: note || null,
      assigned_by: assignedBy || null
    };
    if (paypalId) row.paypal_id = paypalId;
    var res = await sb.from('aplicate_purchases').upsert(row, { onConflict: 'user_id,course_id' });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  }

  async function setCourseMeta(sb, courseId, fields) {
    if (!sb || !courseId) return { ok: false, error: 'faltan datos' };
    var row = {};
    if (fields && fields.presenter != null) row.presenter = String(fields.presenter).trim();
    if (fields && fields.signature_url != null) row.signature_url = String(fields.signature_url).trim();
    var res = await sb.from('aplicate_courses').update(row).eq('id', courseId);
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  }

  async function ensureTrialCourse(sb) {
    if (!sb) return { ok: false, error: 'sin cliente' };
    var all = await listAllCourses(sb);
    if (!all.length) {
      return createCourse(sb, {
        title: 'Espacio del primer curso',
        summary: 'Sin portada todavía. Precio de prueba.',
        price_usd: 30,
        sort_order: 1,
        presenter: 'José de Jesús Ávila Mendoza'
      });
    }
    var first = all[0];
    if (first.price_usd == null || first.price_usd === '') {
      var upd = await sb.from('aplicate_courses').update({ price_usd: 30 }).eq('id', first.id);
      if (upd.error) return { ok: false, error: upd.error.message };
    }
    return { ok: true, id: first.id };
  }

  async function pingTables(sb) {
    if (!sb) return { ok: false, missing: true, error: 'sin cliente' };
    var res = await sb.from('aplicate_courses').select('id').limit(1);
    if (!res.error) return { ok: true };
    var msg = (res.error && res.error.message) || '';
    var missing = /does not exist|schema cache|could not find the table/i.test(msg);
    return { ok: false, missing: missing, error: msg };
  }

  async function createCourse(sb, row) {
    if (!sb) return { ok: false, error: 'sin cliente' };
    var payload = {
      title: String((row && row.title) || '').trim(),
      summary: String((row && row.summary) || '').trim(),
      published: false,
      sort_order: row && row.sort_order != null ? row.sort_order : 0
    };
    if (!payload.title) return { ok: false, error: 'falta título' };
    if (row && row.price_usd != null && row.price_usd !== '') {
      var n = Number(row.price_usd);
      if (!isNaN(n)) payload.price_usd = n;
    }
    if (row && row.presenter) payload.presenter = String(row.presenter).trim();
    if (row && row.signature_url) payload.signature_url = String(row.signature_url).trim();
    var res = await sb.from('aplicate_courses').insert(payload).select('id').single();
    if (res.error && payload.presenter && /presenter|signature_url|column/i.test(res.error.message || '')) {
      delete payload.presenter;
      delete payload.signature_url;
      res = await sb.from('aplicate_courses').insert(payload).select('id').single();
    }
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, id: res.data && res.data.id };
  }

  async function setPublished(sb, courseId, published) {
    if (!sb || !courseId) return { ok: false, error: 'faltan datos' };
    var res = await sb.from('aplicate_courses').update({ published: !!published }).eq('id', courseId);
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  }

  async function findUserIdByEmail(sb, email) {
    if (!sb || !email) return null;
    var e = String(email).trim();
    var ap = await sb.from('aplicate_profiles').select('id').ilike('email', e).maybeSingle();
    if (ap.data && ap.data.id) return ap.data.id;
    var pr = await sb.from('profiles').select('id').ilike('email', e).maybeSingle();
    if (pr.data && pr.data.id) return pr.data.id;
    return null;
  }

  async function ensureStudentRow(sb, userId, fields) {
    if (!sb || !userId) return { ok: false, error: 'faltan datos' };
    var row = {
      id: userId,
      full_name: (fields && fields.full_name) || '',
      email: (fields && fields.email) || '',
      phone: (fields && fields.phone) || null,
      phone_code: (fields && fields.phone_code) || null,
      country: (fields && fields.country) || null,
      state: (fields && fields.state) || null,
      postal: (fields && fields.postal) || null,
      profession: (fields && fields.profession) || null
    };
    var res = await sb.from('aplicate_profiles').upsert(row);
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  }

  async function getProfile(sb, userId) {
    if (!sb || !userId) return null;
    var res = await sb.from('aplicate_profiles').select('id, full_name, email, phone, phone_code, country, state, postal, profession').eq('id', userId).maybeSingle();
    if (res.error) return null;
    return res.data || null;
  }

  async function listCertificates(sb, userId) {
    if (!sb || !userId) return [];
    var res = await sb.from('aplicate_certificates').select('id, course_id, folio, issued_at').eq('user_id', userId).order('issued_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
  }

  async function issueCertificate(sb, userId, courseId) {
    if (!sb || !userId || !courseId) return { ok: false, error: 'faltan datos' };
    var folio = 'AP-' + Date.now().toString(36).toUpperCase();
    var res = await sb.from('aplicate_certificates').upsert({
      user_id: userId,
      course_id: courseId,
      folio: folio,
      issued_at: new Date().toISOString()
    }, { onConflict: 'user_id,course_id' });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, folio: folio };
  }

  async function logVisit(sb, userId) {
    if (!sb || !userId) return;
    var key = 'np_aplicate_visit_' + userId;
    var now = Date.now();
    var last = parseInt(w.localStorage.getItem(key) || '0', 10);
    if (last && (now - last) < 60 * 60 * 1000) return;
    function insert(lat, lng) {
      var row = { user_id: userId };
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        row.lat = lat;
        row.lng = lng;
      }
      sb.from('aplicate_visits').insert(row).then(function () {
        w.localStorage.setItem(key, String(now));
      }).catch(function () {});
    }
    try {
      var geo = await fetch('https://ipapi.co/json/').then(function (r) { return r.ok ? r.json() : null; });
      insert(geo && geo.latitude != null ? parseFloat(geo.latitude) : NaN, geo && geo.longitude != null ? parseFloat(geo.longitude) : NaN);
    } catch (e) {
      insert(NaN, NaN);
    }
  }

  w.ApplicateData = {
    clientOf: clientOf,
    listPublishedCourses: listPublishedCourses,
    listAllCourses: listAllCourses,
    listPurchases: listPurchases,
    listSaves: listSaves,
    toggleSave: toggleSave,
    listLessons: listLessons,
    listFiles: listFiles,
    listStudents: listStudents,
    listAllPurchases: listAllPurchases,
    assignCourse: assignCourse,
    ensureTrialCourse: ensureTrialCourse,
    pingTables: pingTables,
    createCourse: createCourse,
    setPublished: setPublished,
    setCourseMeta: setCourseMeta,
    findUserIdByEmail: findUserIdByEmail,
    ensureStudentRow: ensureStudentRow,
    getProfile: getProfile,
    listCertificates: listCertificates,
    issueCertificate: issueCertificate,
    logVisit: logVisit
  };
})(window);
