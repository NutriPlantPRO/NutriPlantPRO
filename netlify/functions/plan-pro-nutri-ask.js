/**
 * Plan PRO Assistant → Nutri PRO (nutri_pro_ask) con sesión Supabase admin.
 * POST { q, nutri_file_id?, folder_id? }
 * Authorization: Bearer <supabase access_token>
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const { runAdminAction } = require('./nutriplant-admin-assistant');

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
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
    return { ok: false, status: 403, error: 'Solo administrador puede consultar Nutri PRO.' };
  }
  return { ok: true, userId };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método no permitido' });
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return jsonResponse(400, { error: 'JSON inválido' });
  }

  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return jsonResponse(401, { error: 'Falta sesión (Authorization: Bearer).' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: 'Supabase no configurado en el servidor.' });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const adminCheck = await verifyAdmin(supabase, accessToken);
  if (!adminCheck.ok) {
    return jsonResponse(adminCheck.status, { error: adminCheck.error });
  }

  const q = String(body.q || body.question || '').trim();
  if (!q) {
    return jsonResponse(400, { error: 'Indica q (pregunta).' });
  }

  try {
    const result = await runAdminAction('nutri_pro_ask', {
      q,
      question: q,
      nutri_file_id: body.nutri_file_id || body.file_id || undefined,
      folder_id: body.folder_id || undefined,
      limit: body.limit,
      snippet_chars: body.snippet_chars
    });
    return jsonResponse(200, { ...result, via: 'plan_pro_assistant' });
  } catch (err) {
    return jsonResponse(500, { ok: false, error: (err && err.message) || String(err) });
  }
};
