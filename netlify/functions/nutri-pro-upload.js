/**
 * Nutri PRO — enlace de subida desde ChatGPT (ticket firmado + página móvil).
 *
 * GET  /api/nutri-pro-upload?ticket=...  — validar ticket, devolver carpeta
 * POST /api/nutri-pro-upload             — marcar subida completada { ticket, file_id, filename }
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  verifyNutriProUploadTicket,
  signNutriProUploadTicket,
  buildUploadTicketPayload
} = require('./lib/nutri-pro-upload-ticket');

const NUTRI_BUCKET = 'plan-pro-nutri-pro';
const TICKET_PREFIX = '_gpt_upload_tickets';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function ticketStoragePath(uploadId) {
  return TICKET_PREFIX + '/' + uploadId + '.json';
}

async function getServiceSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

async function readTicketState(supabase, uploadId) {
  const path = ticketStoragePath(uploadId);
  const { data, error } = await supabase.storage.from(NUTRI_BUCKET).download(path);
  if (error || !data) return null;
  try {
    const text = await data.text();
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function writeTicketState(supabase, uploadId, state) {
  const path = ticketStoragePath(uploadId);
  const body = JSON.stringify(state);
  const { error } = await supabase.storage.from(NUTRI_BUCKET).upload(path, Buffer.from(body, 'utf8'), {
    contentType: 'application/json',
    upsert: true,
    cacheControl: '60'
  });
  if (error) throw new Error('ticket storage: ' + error.message);
}

async function verifyAdminSession(supabase, accessToken) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Sesión inválida. Inicia sesión en NutriPlant.' };
  }
  const userId = userData.user.id;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();
  if (profErr || !prof?.is_admin) {
    return { ok: false, status: 403, error: 'Solo administrador puede subir a Nutri PRO.' };
  }
  return { ok: true, userId, email: prof.email || userData.user.email || '' };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  const supabase = await getServiceSupabase();
  if (!supabase) {
    return jsonResponse(503, { ok: false, error: 'Supabase no configurado en el servidor.' });
  }

  if (event.httpMethod === 'GET') {
    const qs = event.queryStringParameters || {};
    const ticket = (qs.ticket || qs.t || '').trim();
    const verified = verifyNutriProUploadTicket(ticket);
    if (!verified.ok) {
      return jsonResponse(400, { ok: false, error: verified.error });
    }
    const p = verified.payload;
    const state = await readTicketState(supabase, p.upload_id);
    return jsonResponse(200, {
      ok: true,
      upload_id: p.upload_id,
      folder_id: p.folder_id,
      folder_path: p.folder_path,
      title_hint: p.title_hint,
      suggested_filename: p.suggested_filename,
      expires_at: new Date(p.exp * 1000).toISOString(),
      status: (state && state.status) || 'pending',
      file_id: (state && state.file_id) || null,
      filename: (state && state.filename) || null,
      short_path: (state && state.short_path) || null
    });
  }

  if (event.httpMethod === 'POST') {
    let body = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      return jsonResponse(400, { ok: false, error: 'JSON inválido.' });
    }

    const ticket = String(body.ticket || body.t || '').trim();
    const verified = verifyNutriProUploadTicket(ticket);
    if (!verified.ok) {
      return jsonResponse(400, { ok: false, error: verified.error });
    }
    const p = verified.payload;

    const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
    if (!accessToken) {
      return jsonResponse(401, { ok: false, error: 'Falta sesión Supabase (Authorization: Bearer).' });
    }

    const adminCheck = await verifyAdminSession(supabase, accessToken);
    if (!adminCheck.ok) {
      return jsonResponse(adminCheck.status, { ok: false, error: adminCheck.error });
    }
    if (adminCheck.userId !== p.owner_id) {
      return jsonResponse(403, { ok: false, error: 'Este enlace es para otra cuenta admin.' });
    }

    const fileId = String(body.file_id || body.nutri_file_id || '').trim();
    if (!fileId) {
      return jsonResponse(400, { ok: false, error: 'Indica file_id del archivo subido.' });
    }

    const { data: fileRec, error: fileErr } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,owner_id,folder_id,original_name,title,storage_path')
      .eq('id', fileId)
      .eq('owner_id', p.owner_id)
      .maybeSingle();
    if (fileErr) {
      return jsonResponse(500, { ok: false, error: fileErr.message });
    }
    if (!fileRec) {
      return jsonResponse(404, { ok: false, error: 'Archivo no encontrado en Nutri PRO.' });
    }

    if (p.folder_id && fileRec.folder_id !== p.folder_id) {
      return jsonResponse(400, {
        ok: false,
        error: 'El archivo se subió a otra carpeta. Vuelve a intentar en la carpeta del enlace.'
      });
    }

    const gptNote = 'gpt_upload:' + p.upload_id;
    await supabase
      .from('plan_pro_nutri_files')
      .update({ description: gptNote })
      .eq('id', fileId);

    const shortPath = fileRec.original_name || fileRec.title || 'archivo';
    const doneState = {
      upload_id: p.upload_id,
      owner_id: p.owner_id,
      folder_id: p.folder_id,
      folder_path: p.folder_path,
      status: 'done',
      file_id: fileId,
      filename: fileRec.original_name,
      short_path: shortPath,
      completed_at: new Date().toISOString()
    };
    await writeTicketState(supabase, p.upload_id, doneState);

    return jsonResponse(200, {
      ok: true,
      upload_id: p.upload_id,
      status: 'done',
      nutri_file_id: fileId,
      filename: fileRec.original_name,
      folder_path: p.folder_path,
      message: 'Subida registrada. Ya puedes decirle a tu GPT: «ya subí».'
    });
  }

  return jsonResponse(405, { ok: false, error: 'Método no permitido.' });
};

/** Usado por nutriplant-admin-assistant para crear tickets */
exports.createNutriProUploadTicket = async function createNutriProUploadTicket(supabase, opts) {
  const uploadId = require('crypto').randomUUID();
  const payload = buildUploadTicketPayload({
    upload_id: uploadId,
    owner_id: opts.owner_id,
    folder_id: opts.folder_id || null,
    folder_path: opts.folder_path || 'Raíz',
    title_hint: opts.title_hint || null,
    suggested_filename: opts.suggested_filename || null,
    ttl_sec: opts.ttl_sec
  });
  const token = signNutriProUploadTicket(payload);
  const pending = {
    upload_id: uploadId,
    owner_id: opts.owner_id,
    folder_id: opts.folder_id || null,
    folder_path: opts.folder_path,
    status: 'pending',
    title_hint: opts.title_hint || null,
    suggested_filename: opts.suggested_filename || null,
    created_at: new Date().toISOString(),
    expires_at: new Date(payload.exp * 1000).toISOString()
  };
  await writeTicketState(supabase, uploadId, pending);
  const base = (opts.public_base || 'https://nutriplantpro.com').replace(/\/$/, '');
  return {
    upload_id: uploadId,
    ticket: token,
    upload_url: base + '/planpro/nutri-upload.html?t=' + encodeURIComponent(token),
    expires_at: pending.expires_at,
    folder_path: opts.folder_path,
    folder_id: opts.folder_id || null
  };
};

exports.readNutriProUploadTicketState = readTicketState;
