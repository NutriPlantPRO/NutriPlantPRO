/**
 * Nutri PRO extract en background (evita 504 por timeout de ~60s).
 * Mismo body que nutri-pro-extract: { file_id, mode?, force?, access_token? }
 * Responde 202 de inmediato; el resultado queda en plan_pro_nutri_file_extracts.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { extractOneFile } = require('./nutri-pro-extract');

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

async function verifyAdmin(supabase, accessToken) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Token inválido o expirado.' };
  }
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profErr || !prof?.is_admin) {
    return { ok: false, status: 403, error: 'Solo administrador.' };
  }
  return { ok: true };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (_) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'Falta sesión' }) };
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Supabase no configurado' }) };
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const adminCheck = await verifyAdmin(supabase, accessToken);
  if (!adminCheck.ok) {
    return {
      statusCode: adminCheck.status,
      headers: corsHeaders(),
      body: JSON.stringify({ error: adminCheck.error })
    };
  }

  const force = body.force === true || body.force === 'true';
  const mode = String(body.mode || body.extract_mode || 'ocr').trim().toLowerCase();
  const fileId = String(body.file_id || body.nutri_file_id || '').trim();
  if (!fileId) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Indica file_id' }) };
  }

  // En background Netlify no espera el return al cliente; igual procesamos aquí.
  try {
    const result = await extractOneFile(supabase, fileId, force, mode === 'text' ? 'text' : 'ocr');
    console.log('nutri-pro-extract-background', fileId, result && result.status, result && result.char_count);
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true, accepted: true, file_id: fileId, result })
    };
  } catch (err) {
    console.error('nutri-pro-extract-background error', fileId, err && err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, file_id: fileId, error: (err && err.message) || String(err) })
    };
  }
};
