/**
 * Enlaces permanentes a archivos Nutri PRO (p. ej. PDF de apunte en Plan PRO).
 *
 * GET  /api/nutri-pro-file-open?fid=<uuid>&t=<token>  → redirige al archivo (sin caducidad del link)
 * POST /api/nutri-pro-file-open  { file_ids: [] }      → genera URLs permanentes (admin, sesión Plan PRO)
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  verifyNutriProFileShareToken,
  nutriProFileOpenUrl
} = require('./lib/nutri-pro-file-share');

const NUTRI_BUCKET = 'plan-pro-nutri-pro';
const SIGNED_TTL_SEC = 3600;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function htmlError(statusCode, title, message) {
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  return {
    statusCode,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
    body: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;color:#334155"><h1>${esc(title)}</h1><p>${esc(message)}</p></body></html>`
  };
}

function publicBaseUrl(event) {
  const h = event.headers || {};
  const proto = (h['x-forwarded-proto'] || h['X-Forwarded-Proto'] || 'https').toString().split(',')[0].trim();
  const host = (h['x-forwarded-host'] || h['X-Forwarded-Host'] || h.host || h.Host || 'nutriplantpro.com')
    .toString()
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

async function verifyAdmin(supabase, accessToken) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Token inválido o expirado.' };
  }
  const userId = userData.user.id;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();
  if (profErr || !prof?.is_admin) {
    return { ok: false, status: 403, error: 'Solo administrador puede generar enlaces Nutri PRO.' };
  }
  return { ok: true, userId };
}

async function handleGet(event, supabase) {
  const params = event.queryStringParameters || {};
  const fileId = String(params.fid || params.file_id || '').trim();
  const token = String(params.t || params.token || '').trim();

  if (!fileId || !token) {
    return htmlError(400, 'Enlace incompleto', 'Faltan parámetros del archivo Nutri PRO.');
  }
  if (!verifyNutriProFileShareToken(fileId, token)) {
    return htmlError(403, 'Acceso denegado', 'Este enlace no coincide con el archivo en el servidor.');
  }

  const { data: fileRec, error: fileErr } = await supabase
    .from('plan_pro_nutri_files')
    .select('id,storage_path,original_name,mime_type')
    .eq('id', fileId)
    .maybeSingle();

  if (fileErr) {
    return htmlError(502, 'Error al abrir', fileErr.message || 'No se pudo consultar el archivo.');
  }
  if (!fileRec || !fileRec.storage_path) {
    return htmlError(404, 'Archivo no encontrado', 'El archivo ya no existe en Nutri PRO.');
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(NUTRI_BUCKET)
    .createSignedUrl(fileRec.storage_path, SIGNED_TTL_SEC);

  if (signErr || !signed?.signedUrl) {
    return htmlError(502, 'Error al abrir', signErr?.message || 'No se pudo firmar la descarga.');
  }

  const filename = String(fileRec.original_name || 'archivo').replace(/[\r\n"]/g, '');
  return {
    statusCode: 302,
    headers: {
      Location: signed.signedUrl,
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="${filename}"`
    },
    body: ''
  };
}

async function handlePost(event, supabase) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return jsonResponse(401, { ok: false, error: 'Authorization Bearer requerido.' });
  }

  const auth = await verifyAdmin(supabase, accessToken);
  if (!auth.ok) {
    return jsonResponse(auth.status || 403, { ok: false, error: auth.error });
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (_e) {
    return jsonResponse(400, { ok: false, error: 'JSON inválido.' });
  }

  const rawIds = Array.isArray(body.file_ids) ? body.file_ids : body.fileIds ? body.fileIds : [];
  const fileIds = [...new Set(rawIds.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 80);
  if (!fileIds.length) {
    return jsonResponse(400, { ok: false, error: 'Indica file_ids (array de UUID).' });
  }

  const { data: rows, error } = await supabase
    .from('plan_pro_nutri_files')
    .select('id')
    .eq('owner_id', auth.userId)
    .in('id', fileIds);

  if (error) {
    return jsonResponse(502, { ok: false, error: error.message || 'Error al consultar archivos.' });
  }

  const base = publicBaseUrl(event);
  const links = {};
  (rows || []).forEach((row) => {
    if (row && row.id) links[row.id] = nutriProFileOpenUrl(row.id, base);
  });

  return jsonResponse(200, { ok: true, links, policy: 'Los enlaces no caducan; redirigen al archivo mientras exista en Nutri PRO.' });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    const msg = { ok: false, error: 'Servidor sin credenciales Supabase.' };
    return event.httpMethod === 'GET'
      ? htmlError(500, 'Configuración incompleta', msg.error)
      : jsonResponse(500, msg);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    if (event.httpMethod === 'GET') return await handleGet(event, supabase);
    if (event.httpMethod === 'POST') return await handlePost(event, supabase);
    return jsonResponse(405, { ok: false, error: 'Método no permitido.' });
  } catch (err) {
    const message = (err && err.message) || String(err);
    return event.httpMethod === 'GET'
      ? htmlError(500, 'Error inesperado', message)
      : jsonResponse(500, { ok: false, error: message });
  }
};
