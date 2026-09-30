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
    var res = await sb.from('aplicate_profiles').select('id, full_name, email, phone, phone_code, country, state, postal, profession, created_at').order('created_at', { ascending: false });
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
    var cert = await issueCertificate(sb, userId, courseId, null, null);
    return { ok: true, folio: cert && cert.folio };
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
        presenter: 'Ing. José de Jesús Ávila Mendoza'
      });
    }
    var first = all[0];
    var patch = {};
    if (first.price_usd == null || first.price_usd === '') patch.price_usd = 30;
    var bare = String(first.presenter || '').replace(/^ing\.?\s+/i, '').trim().toLowerCase();
    var withIng = 'Ing. José de Jesús Ávila Mendoza';
    if ((!bare || bare === 'josé de jesús ávila mendoza' || bare === 'jose de jesus avila mendoza') && String(first.presenter || '').trim() !== withIng) {
      patch.presenter = withIng;
    }
    if (Object.keys(patch).length) {
      var upd = await sb.from('aplicate_courses').update(patch).eq('id', first.id);
      if (upd.error && patch.presenter && /presenter|column/i.test(upd.error.message || '')) {
        delete patch.presenter;
        if (Object.keys(patch).length) upd = await sb.from('aplicate_courses').update(patch).eq('id', first.id);
        else upd = { error: null };
      }
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

  async function updateStudent(sb, userId, fields) {
    if (!sb || !userId) return { ok: false, error: 'faltan datos' };
    var text = function (v) { return String(v == null ? '' : v).trim(); };
    var row = {
      full_name: text(fields && fields.full_name),
      email: text(fields && fields.email),
      phone: text(fields && fields.phone) || null,
      phone_code: text(fields && fields.phone_code) || null,
      country: text(fields && fields.country) || null,
      state: text(fields && fields.state) || null,
      postal: text(fields && fields.postal) || null,
      profession: text(fields && fields.profession) || null
    };
    var res = await sb.from('aplicate_profiles').update(row).eq('id', userId);
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  }

  async function getProfile(sb, userId) {
    if (!sb || !userId) return null;
    var res = await sb.from('aplicate_profiles').select('id, full_name, email, phone, phone_code, country, state, postal, profession').eq('id', userId).maybeSingle();
    var data = res.error ? null : (res.data || null);
    var current = data && data.full_name ? String(data.full_name).trim() : '';
    if (!current || current.indexOf('@') !== -1) {
      var pro = await sb.from('profiles').select('name, email').eq('id', userId).maybeSingle();
      var proName = pro.data && pro.data.name ? String(pro.data.name).trim() : '';
      if (proName && proName.indexOf('@') === -1) {
        if (!data) data = { id: userId, full_name: proName, email: (pro.data && pro.data.email) || '' };
        else data.full_name = proName;
      }
    }
    return data;
  }

  function countryCode(country) {
    var raw = String(country || '').trim();
    if (!raw) return 'XX';
    var key = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var known = {
      mexico: 'MX',
      'estados unidos': 'US',
      'united states': 'US',
      usa: 'US',
      canada: 'CA',
      colombia: 'CO',
      peru: 'PE',
      chile: 'CL',
      argentina: 'AR',
      espana: 'ES',
      spain: 'ES',
      guatemala: 'GT',
      ecuador: 'EC',
      bolivia: 'BO',
      'costa rica': 'CR',
      panama: 'PA',
      honduras: 'HN',
      'el salvador': 'SV',
      nicaragua: 'NI',
      'republica dominicana': 'DO',
      brasil: 'BR',
      brazil: 'BR',
      uruguay: 'UY',
      paraguay: 'PY',
      venezuela: 'VE'
    };
    if (known[key]) return known[key];
    if (/^[a-z]{2}$/i.test(key)) return key.toUpperCase();
    var letters = key.replace(/[^a-z]/g, '');
    return (letters.slice(0, 2) || 'XX').toUpperCase();
  }

  function nameInitial(name) {
    var n = String(name || '').trim();
    if (!n || n.indexOf('@') !== -1) return 'X';
    var ch = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').charAt(0);
    return (ch || 'X').toUpperCase();
  }

  function makeFolio(when, country, fullName) {
    var d = when instanceof Date && !isNaN(when.getTime()) ? when : new Date();
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    var stamp = String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
    return countryCode(country) + '-' + nameInitial(fullName) + '-' + stamp;
  }

  async function listAllCertificates(sb) {
    if (!sb) return [];
    var res = await sb.from('aplicate_certificates').select('id, user_id, course_id, folio, issued_at').order('issued_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
  }

  async function listCertificates(sb, userId) {
    if (!sb || !userId) return [];
    var res = await sb.from('aplicate_certificates').select('id, course_id, folio, issued_at').eq('user_id', userId).order('issued_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
  }

  async function issueCertificate(sb, userId, courseId, person, issuedAt) {
    if (!sb || !userId || !courseId) return { ok: false, error: 'faltan datos' };
    var existing = await sb.from('aplicate_certificates').select('folio').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
    if (existing.data && existing.data.folio) return { ok: true, folio: existing.data.folio, already: true };
    var who = person || {};
    if (!who.full_name || !who.country) {
      var prof = await sb.from('aplicate_profiles').select('full_name, country').eq('id', userId).maybeSingle();
      if (prof.data) {
        if (!who.full_name) who.full_name = prof.data.full_name || '';
        if (!who.country) who.country = prof.data.country || '';
      }
    }
    var when = issuedAt ? new Date(issuedAt) : new Date();
    if (isNaN(when.getTime())) when = new Date();
    var folio = makeFolio(when, who.country, who.full_name);
    var res = await sb.from('aplicate_certificates').upsert({
      user_id: userId,
      course_id: courseId,
      folio: folio,
      issued_at: when.toISOString()
    }, { onConflict: 'user_id,course_id' });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, folio: folio };
  }

  async function ensurePurchaseCertificates(sb, purchases, people) {
    if (!sb || !purchases || !purchases.length) return;
    var byId = {};
    (people || []).forEach(function (p) {
      if (p && p.id) byId[p.id] = p;
    });
    var i;
    for (i = 0; i < purchases.length; i++) {
      var row = purchases[i];
      if (!row || !row.user_id || !row.course_id) continue;
      await issueCertificate(sb, row.user_id, row.course_id, byId[row.user_id] || null, row.created_at || null);
    }
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
    updateStudent: updateStudent,
    getProfile: getProfile,
    listCertificates: listCertificates,
    listAllCertificates: listAllCertificates,
    ensurePurchaseCertificates: ensurePurchaseCertificates,
    issueCertificate: issueCertificate,
    makeFolio: makeFolio,
    logVisit: logVisit
  };
})(window);
