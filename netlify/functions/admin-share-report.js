/**
 * Admin: preparar/finalizar link de vista de reporte (mismo /api/report-view).
 *
 * El HTML grande NO pasa por esta función (límite ~6 MB Netlify).
 * Flujo:
 *   1) action=prepare  → reportId, token, path, signedUploadUrl
 *   2) cliente sube HTML con PUT al signedUploadUrl
 *   3) action=finalize → upsert reports + shareHtmlPath
 *
 * Body: { admin_key, action, user_id, project_id, ... }
 */
const { createClient } = require('@supabase/supabase-js');

const SHARE_BUCKET = 'report-shares';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));
}

function adminAuthorized(body) {
  const expectedKey = (process.env.NUTRIPLANT_ADMIN_KEY || 'np_admin_key_8f4a2b9c1e7d').trim();
  const adminKey = body.admin_key != null ? String(body.admin_key).trim() : '';
  return !!(adminKey && adminKey === expectedKey);
}

function makeShareToken() {
  const bytes = new Uint8Array(24);
  require('crypto').randomFillSync(bytes);
  return Array.from(bytes, function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

function safeReportId(raw) {
  const s = String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100);
  return s || 'report_admin_' + Date.now();
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método no permitido' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'Cuerpo JSON inválido' });
  }

  if (!adminAuthorized(body)) {
    return json(403, { ok: false, error: 'Acceso no autorizado' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { ok: false, error: 'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const action = String(body.action || 'prepare').toLowerCase();
  const userId = body.user_id != null ? String(body.user_id).trim() : '';
  const projectId = body.project_id != null ? String(body.project_id).trim() : '';

  if (!isUuid(userId) || !projectId) {
    return json(400, { ok: false, error: 'user_id (UUID) y project_id son obligatorios' });
  }

  if (action === 'prepare') {
    const reportId = safeReportId(
      body.report_id || 'report_admin_' + Date.now() + '_' + Math.floor(Math.random() * 1e6)
    );
    const token = makeShareToken();
    const path = userId + '/' + reportId + '.html';

    let signedUrl = null;
    let uploadToken = null;
    try {
      const { data, error } = await supabase.storage.from(SHARE_BUCKET).createSignedUploadUrl(path, {
        upsert: true
      });
      if (error) {
        console.warn('createSignedUploadUrl:', error.message);
      } else if (data) {
        signedUrl = data.signedUrl || data.signedURL || null;
        uploadToken = data.token || null;
      }
    } catch (e) {
      console.warn('createSignedUploadUrl exception:', e && e.message);
    }

    // Fallback REST (algunas versiones del SDK)
    if (!signedUrl) {
      try {
        const res = await fetch(
          supabaseUrl.replace(/\/$/, '') +
            '/storage/v1/object/upload/sign/' +
            SHARE_BUCKET +
            '/' +
            path.split('/').map(encodeURIComponent).join('/'),
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + serviceRoleKey,
              apikey: serviceRoleKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ upsert: true })
          }
        );
        const j = await res.json().catch(function () {
          return {};
        });
        if (res.ok && (j.url || j.signedUrl || j.signedURL)) {
          const rel = j.url || j.signedUrl || j.signedURL;
          signedUrl = String(rel).startsWith('http')
            ? rel
            : supabaseUrl.replace(/\/$/, '') + '/storage/v1' + (String(rel).startsWith('/') ? rel : '/' + rel);
          uploadToken = j.token || null;
        } else {
          console.warn('upload/sign fallback:', res.status, j);
        }
      } catch (e2) {
        console.warn('upload/sign fallback exception:', e2 && e2.message);
      }
    }

    if (!signedUrl) {
      return json(502, {
        ok: false,
        error:
          'No se pudo crear URL de subida. ¿Existe el bucket report-shares? Ejecuta supabase/migrations/20260720_report_shares_storage.sql'
      });
    }

    return json(200, {
      ok: true,
      report_id: reportId,
      share_token: token,
      share_html_path: path,
      upload_url: signedUrl,
      upload_token: uploadToken
    });
  }

  if (action === 'finalize') {
    const reportId = safeReportId(body.report_id);
    const token = String(body.share_token || '').trim();
    const path = String(body.share_html_path || '').trim();
    if (!reportId || !token || !path) {
      return json(400, { ok: false, error: 'report_id, share_token y share_html_path son obligatorios' });
    }
    if (!path.startsWith(userId + '/')) {
      return json(400, { ok: false, error: 'share_html_path inválido para este usuario' });
    }

    const sections = Array.isArray(body.selected_sections) ? body.selected_sections : [];
    const lang = body.report_language === 'en' ? 'en' : 'es';
    const projectName =
      body.project_name != null ? String(body.project_name).slice(0, 200) : 'Proyecto';
    const nowIso = new Date().toISOString();

    const payload = {
      id: reportId,
      userId: userId,
      projectId: String(projectId),
      projectName: projectName,
      project: { name: projectName, id: String(projectId) },
      selectedSections: sections,
      reportLanguage: lang,
      shareToken: token,
      shareEnabled: true,
      shareHtmlPath: path,
      shareCreatedAt: nowIso,
      shareExpiresAt: null,
      adminShared: true,
      adminAuthorName: String(body.admin_author_name || 'Consulta Admin NutriPlant PRO').slice(0, 120),
      timestamp: nowIso
    };

    const row = {
      id: reportId,
      user_id: userId,
      project_id: String(projectId),
      data: payload,
      created_at: nowIso
    };

    const { error } = await supabase.from('reports').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.error('admin-share-report finalize:', error.message);
      return json(502, { ok: false, error: error.message || 'No se pudo guardar el reporte' });
    }

    return json(200, {
      ok: true,
      report_id: reportId,
      share_token: token,
      share_html_path: path
    });
  }

  return json(400, { ok: false, error: 'action debe ser prepare o finalize' });
};
