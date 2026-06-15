/**
 * Netlify Function: extrae texto de archivos Nutri PRO tras subida.
 *
 * Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * POST { file_id, force?: boolean }
 * Authorization: Bearer <supabase access_token> (admin)
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const { extractNutriProText } = require('./lib/nutri-pro-text-extract');

const NUTRI_BUCKET = 'plan-pro-nutri-pro';
const OCR_IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const MAX_OCR_CHARS = 500000;

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
    return { ok: false, status: 403, error: 'Solo administrador puede extraer archivos Nutri PRO.' };
  }
  return { ok: true, userId, email: prof.email || userData.user.email || '' };
}

function extOf(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

function truncateOcrText(text) {
  const s = String(text || '');
  if (s.length <= MAX_OCR_CHARS) return { text: s, truncated: false };
  return { text: s.slice(0, MAX_OCR_CHARS), truncated: true };
}

function outputTextFromResponses(data) {
  if (!data) return '';
  if (typeof data.output_text === 'string') return data.output_text;
  const out = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((part) => {
      if (part && typeof part.text === 'string') out.push(part.text);
      else if (part && typeof part.output_text === 'string') out.push(part.output_text);
    });
  });
  return out.join('\n').trim();
}

async function extractPdfTextWithOpenAI(buffer, fileRec) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      status: 'error',
      format_kind: 'ocr_pdf',
      error_message: 'OPENAI_API_KEY no configurada para OCR/IA.'
    };
  }

  const model = process.env.OPENAI_OCR_MODEL || 'gpt-4o-mini';
  const payload = {
    model,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text:
              'Transcribe todo el texto legible de este PDF escaneado para indexarlo en Nutri PRO. ' +
              'Mantén encabezados, listas, tablas simples, unidades y saltos de sección cuando sea posible. ' +
              'No inventes texto. Si no hay texto legible, responde exactamente: SIN_TEXTO_LEGIBLE'
          },
          {
            type: 'input_file',
            filename: fileRec.original_name || 'documento.pdf',
            file_data: 'data:application/pdf;base64,' + buffer.toString('base64')
          }
        ]
      }
    ],
    max_output_tokens: 12000
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const raw = await res.text();
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch (_) {
    data = { error: raw || 'Respuesta no JSON' };
  }
  if (!res.ok) {
    return {
      status: 'error',
      format_kind: 'ocr_pdf',
      error_message:
        (data && data.error && (data.error.message || data.error)) ||
        'OpenAI OCR no pudo procesar el PDF.'
    };
  }
  const text = outputTextFromResponses(data);
  if (!text || /^SIN_TEXTO_LEGIBLE$/i.test(text)) {
    return {
      status: 'skipped',
      format_kind: 'ocr_pdf',
      text_plain: null,
      meta_json: { char_count: 0, model },
      error_message: 'OCR/IA no encontró texto legible en el PDF.'
    };
  }
  const trimmed = truncateOcrText(text);
  return {
    status: 'done',
    format_kind: 'ocr_pdf',
    text_plain: trimmed.text,
    meta_json: {
      char_count: trimmed.text.length,
      truncated: trimmed.truncated,
      model
    },
    error_message: null
  };
}

async function extractImageTextWithOpenAI(buffer, fileRec) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      status: 'error',
      format_kind: 'ocr_image',
      error_message: 'OPENAI_API_KEY no configurada para OCR/IA.'
    };
  }

  const ext = extOf(fileRec.original_name);
  const mime = String(fileRec.mime_type || '').toLowerCase();
  if (ext === 'pdf' || /pdf/i.test(mime)) {
    return extractPdfTextWithOpenAI(buffer, fileRec);
  }
  const allowedMime = /^image\/(png|jpe?g|webp|gif)$/i.test(mime);
  if (!OCR_IMAGE_EXT.has(ext) && !allowedMime) {
    return {
      status: 'skipped',
      format_kind: 'ocr_unsupported',
      error_message:
        'OCR/IA disponible por ahora para imágenes PNG/JPG/WebP/GIF y PDF.'
    };
  }

  const contentType = allowedMime ? mime : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
  const payload = {
    model: process.env.OPENAI_OCR_MODEL || 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content:
          'Eres un motor OCR para Nutri PRO. Extrae solo el texto visible de la imagen. Mantén saltos de línea, tablas simples y unidades si aparecen. No inventes texto.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Transcribe todo el texto legible de esta imagen. Si no hay texto legible, responde exactamente: SIN_TEXTO_LEGIBLE'
          },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ]
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const raw = await res.text();
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch (_) {
    data = { error: raw || 'Respuesta no JSON' };
  }
  if (!res.ok) {
    return {
      status: 'error',
      format_kind: 'ocr_image',
      error_message:
        (data && data.error && (data.error.message || data.error)) ||
        'OpenAI OCR no respondió correctamente.'
    };
  }
  const text = data && data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || '').trim()
    : '';
  if (!text || /^SIN_TEXTO_LEGIBLE$/i.test(text)) {
    return {
      status: 'skipped',
      format_kind: 'ocr_image',
      text_plain: null,
      meta_json: { char_count: 0, model: payload.model },
      error_message: 'OCR/IA no encontró texto legible en la imagen.'
    };
  }
  const trimmed = truncateOcrText(text);
  return {
    status: 'done',
    format_kind: 'ocr_image',
    text_plain: trimmed.text,
    meta_json: {
      char_count: trimmed.text.length,
      truncated: trimmed.truncated,
      model: payload.model
    },
    error_message: null
  };
}

async function extractOneFile(supabase, fileId, force, mode) {
  const { data: fileRec, error: fileErr } = await supabase
    .from('plan_pro_nutri_files')
    .select('id,owner_id,original_name,mime_type,storage_path,size_bytes')
    .eq('id', fileId)
    .maybeSingle();
  if (fileErr) throw new Error('plan_pro_nutri_files: ' + fileErr.message);
  if (!fileRec) return { ok: false, status: 404, error: 'Archivo no encontrado.' };

  if (!force) {
    const { data: existing } = await supabase
      .from('plan_pro_nutri_file_extracts')
      .select('file_id,status,extracted_at')
      .eq('file_id', fileId)
      .maybeSingle();
    if (existing && (existing.status === 'done' || existing.status === 'skipped') && existing.extracted_at) {
      return {
        ok: true,
        file_id: fileId,
        skipped: true,
        status: existing.status,
        message: 'Ya extraído; usa force:true para repetir.'
      };
    }
  }

  const processingRow = {
    file_id: fileId,
    owner_id: fileRec.owner_id,
    status: 'processing',
    format_kind: null,
    text_plain: null,
    meta_json: {},
    error_message: null,
    extracted_at: null
  };
  const { error: upsertErr } = await supabase.from('plan_pro_nutri_file_extracts').upsert(processingRow, {
    onConflict: 'file_id'
  });
  if (upsertErr) {
    if (/plan_pro_nutri_file_extracts|does not exist|schema/i.test(upsertErr.message || '')) {
      return {
        ok: false,
        status: 503,
        error: 'Tabla de extracción no instalada. Ejecuta supabase-plan-pro-nutri-pro-extracts.sql en Supabase.'
      };
    }
    throw new Error('plan_pro_nutri_file_extracts upsert: ' + upsertErr.message);
  }

  const { data: blob, error: dlErr } = await supabase.storage.from(NUTRI_BUCKET).download(fileRec.storage_path);
  if (dlErr || !blob) {
    const fail = {
      status: 'error',
      error_message: (dlErr && dlErr.message) || 'No se pudo descargar el archivo.',
      extracted_at: new Date().toISOString()
    };
    await supabase.from('plan_pro_nutri_file_extracts').update(fail).eq('file_id', fileId);
    return { ok: false, status: 500, error: fail.error_message, file_id: fileId, extract_status: 'error' };
  }

  const ab = await blob.arrayBuffer();
  const buffer = Buffer.from(ab);
  const extracted = mode === 'ocr'
    ? await extractImageTextWithOpenAI(buffer, fileRec)
    : await extractNutriProText(buffer, fileRec.original_name, fileRec.mime_type);

  const patch = {
    status: extracted.status,
    format_kind: extracted.format_kind || null,
    text_plain: extracted.text_plain || null,
    meta_json: extracted.meta_json || {},
    error_message: extracted.error_message || null,
    extracted_at: new Date().toISOString()
  };
  const { error: patchErr } = await supabase.from('plan_pro_nutri_file_extracts').update(patch).eq('file_id', fileId);
  if (patchErr) throw new Error('plan_pro_nutri_file_extracts update: ' + patchErr.message);

  return {
    ok: true,
    file_id: fileId,
    status: extracted.status,
    format_kind: extracted.format_kind || null,
    char_count: (extracted.meta_json && extracted.meta_json.char_count) || (extracted.text_plain || '').length,
    truncated: !!(extracted.meta_json && extracted.meta_json.truncated),
    error_message: extracted.error_message || null,
    meta: extracted.meta_json || {}
  };
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

  const force = body.force === true || body.force === 'true';
  const mode = String(body.mode || body.extract_mode || 'text').trim().toLowerCase();
  const fileId = String(body.file_id || body.nutri_file_id || '').trim();
  const fileIds = Array.isArray(body.file_ids) ? body.file_ids.map((id) => String(id || '').trim()).filter(Boolean) : [];

  if (!fileId && !fileIds.length) {
    return jsonResponse(400, { error: 'Indica file_id o file_ids.' });
  }

  const ids = fileId ? [fileId] : fileIds.slice(0, 20);
  const results = [];
  for (const id of ids) {
    try {
      results.push(await extractOneFile(supabase, id, force, mode));
    } catch (err) {
      results.push({ ok: false, file_id: id, error: (err && err.message) || String(err) });
    }
  }

  if (ids.length === 1) {
    const one = results[0];
    if (!one.ok && one.status) return jsonResponse(one.status, one);
    if (!one.ok) return jsonResponse(500, one);
    return jsonResponse(200, one);
  }

  return jsonResponse(200, { ok: true, count: results.length, results });
};
