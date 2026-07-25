#!/usr/bin/env node
/**
 * Nutri PRO — OCR/IA directo (sin Netlify) para PDFs que dieron 504.
 *
 * Descarga desde Storage, llama OpenAI Responses (Sol) y guarda en
 * plan_pro_nutri_file_extracts con sesión admin.
 *
 * Uso:
 *   export NUTRI_PRO_BULK_EMAIL="..."
 *   export NUTRI_PRO_BULK_PASSWORD="..."
 *   export OPENAI_API_KEY="..."          # misma de Netlify
 *   export OPENAI_ADMIN_MODEL="gpt-5.6-sol"  # opcional
 *   node scripts/nutri-pro-bulk-ocr-direct.mjs
 *
 * Opciones:
 *   --from-state     Solo fallidos del state OCR (default)
 *   --file-id UUID   Uno solo
 *   --limit N
 *   --dry-run
 *   --max-mb N       Saltar PDFs mayores (0 = sin límite)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const STATE_PATH = join(ROOT, 'scripts', 'nutri-pro-bulk-ocr-state.json');
const DIRECT_STATE = join(ROOT, 'scripts', 'nutri-pro-bulk-ocr-direct-state.json');
const NUTRI_BUCKET = 'plan-pro-nutri-pro';
const DEFAULT_MODEL = 'gpt-5.6-sol';
const FILE_UPLOAD_BYTES = 18 * 1024 * 1024; // base64 pesa ~33% más; subir archivo si >18MB

function parseArgs(argv) {
  const out = {
    fromState: true,
    fileId: '',
    limit: 0,
    dryRun: false,
    maxMb: 0
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file-id' && argv[i + 1]) {
      out.fileId = argv[++i];
      out.fromState = false;
    } else if (a === '--limit' && argv[i + 1]) out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--max-mb' && argv[i + 1]) out.maxMb = Math.max(0, parseFloat(argv[++i]) || 0);
    else if (a === '--from-state') out.fromState = true;
  }
  return out;
}

function loadSupabaseConfig() {
  const url = (process.env.NUTRIPLANT_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NUTRIPLANT_SUPABASE_ANON_KEY || '').trim();
  if (url && anonKey) return { url, anonKey };
  const raw = readFileSync(join(ROOT, 'supabase-config.js'), 'utf8');
  const urlM = raw.match(/url:\s*['"]([^'"]+)['"]/);
  const keyM = raw.match(/anonKey:\s*['"]([^'"]+)['"]/);
  if (!urlM || !keyM) throw new Error('No se pudo leer supabase-config.js');
  return { url: urlM[1], anonKey: keyM[1] };
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function saveJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2), 'utf8');
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

async function signIn(supabase) {
  const email = (process.env.NUTRI_PRO_BULK_EMAIL || '').trim();
  const password = process.env.NUTRI_PRO_BULK_PASSWORD || '';
  if (!email || !password) throw new Error('Define NUTRI_PRO_BULK_EMAIL y NUTRI_PRO_BULK_PASSWORD');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Login: ' + error.message);
  return data.session;
}

async function uploadOpenAiFile(apiKey, buffer, filename) {
  const form = new FormData();
  form.append('purpose', 'user_data');
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), filename || 'doc.pdf');
  const res = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey },
    body: form
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json && json.error && json.error.message) || 'OpenAI files upload failed');
  }
  return json.id;
}

async function deleteOpenAiFile(apiKey, fileId) {
  try {
    await fetch('https://api.openai.com/v1/files/' + fileId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + apiKey }
    });
  } catch (_) {
    /* ignore */
  }
}

async function ocrPdfWithOpenAI(apiKey, model, buffer, originalName) {
  const prompt =
    'Transcribe todo el texto legible de este PDF escaneado para indexarlo en Nutri PRO. ' +
    'Mantén encabezados, listas, tablas simples, unidades y saltos de sección cuando sea posible. ' +
    'No inventes texto. Si no hay texto legible, responde exactamente: SIN_TEXTO_LEGIBLE';

  let uploadedId = null;
  let fileContent;
  if (buffer.length >= FILE_UPLOAD_BYTES) {
    process.stdout.write('  ↑ subiendo a OpenAI Files… ');
    uploadedId = await uploadOpenAiFile(apiKey, buffer, originalName);
    console.log(uploadedId);
    fileContent = { type: 'input_file', file_id: uploadedId };
  } else {
    fileContent = {
      type: 'input_file',
      filename: originalName || 'documento.pdf',
      file_data: 'data:application/pdf;base64,' + buffer.toString('base64')
    };
  }

  try {
    const payload = {
      model,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }, fileContent]
        }
      ],
      max_output_tokens: 12000
    };
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify(payload)
    });
    const raw = await res.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch (_) {
      data = { error: raw.slice(0, 400) };
    }
    if (!res.ok) {
      return {
        status: 'error',
        error_message:
          (data && data.error && (data.error.message || data.error)) ||
          'OpenAI OCR HTTP ' + res.status
      };
    }
    const text = outputTextFromResponses(data);
    if (!text || /^SIN_TEXTO_LEGIBLE$/i.test(text)) {
      return {
        status: 'skipped',
        text_plain: null,
        meta_json: { char_count: 0, model, via: 'direct' },
        error_message: 'OCR/IA no encontró texto legible en el PDF.'
      };
    }
    return {
      status: 'done',
      text_plain: text,
      meta_json: { char_count: text.length, truncated: false, model, via: 'direct' },
      error_message: null
    };
  } finally {
    if (uploadedId) await deleteOpenAiFile(apiKey, uploadedId);
  }
}

function failedFromState() {
  const state = loadJson(STATE_PATH, { done: {} });
  const out = [];
  for (const [name, v] of Object.entries(state.done || {})) {
    const is504 = v.http && v.http >= 400;
    const isErr = !!v.error && v.status !== 'skipped' && v.status !== 'done';
    if (is504 || (isErr && v.status !== 'skipped')) {
      if (v.fileId) out.push({ name, fileId: v.fileId });
    }
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv);
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey && !opts.dryRun) {
    throw new Error(
      'Falta OPENAI_API_KEY (la misma de Netlify → Environment variables).'
    );
  }
  const model =
    (process.env.OPENAI_ADMIN_MODEL || '').trim() ||
    (process.env.OPENAI_OCR_MODEL || '').trim() ||
    DEFAULT_MODEL;

  let queue = [];
  if (opts.fileId) {
    queue = [{ name: opts.fileId, fileId: opts.fileId }];
  } else {
    queue = failedFromState();
  }

  const directState = loadJson(DIRECT_STATE, { done: {} });
  queue = queue.filter((q) => !directState.done[q.fileId]?.ok);
  if (opts.limit > 0) queue = queue.slice(0, opts.limit);

  console.log('Nutri PRO OCR directo (sin Netlify)');
  console.log('  modelo:', model);
  console.log('  cola:', queue.length);
  if (opts.dryRun) console.log('  dry-run');

  const cfg = loadSupabaseConfig();
  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: true }
  });
  await signIn(supabase);
  console.log('  sesión OK');

  let ok = 0;
  let fail = 0;
  let skip = 0;
  const bulkState = loadJson(STATE_PATH, { done: {} });

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    process.stdout.write(`\n[${i + 1}/${queue.length}] ${item.name}\n`);

    const { data: fileRec, error: fileErr } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,owner_id,original_name,mime_type,storage_path,size_bytes')
      .eq('id', item.fileId)
      .maybeSingle();
    if (fileErr || !fileRec) {
      console.log('  ✗ archivo:', fileErr?.message || 'no encontrado');
      fail += 1;
      continue;
    }
    const mb = (fileRec.size_bytes || 0) / (1024 * 1024);
    console.log('  size:', mb.toFixed(2), 'MB');
    if (opts.maxMb > 0 && mb > opts.maxMb) {
      console.log('  ↷ salta por --max-mb');
      skip += 1;
      continue;
    }
    if (opts.dryRun) continue;

    const { error: upsertErr } = await supabase.from('plan_pro_nutri_file_extracts').upsert(
      {
        file_id: fileRec.id,
        owner_id: fileRec.owner_id,
        status: 'processing',
        format_kind: 'ocr_pdf',
        text_plain: null,
        meta_json: { via: 'direct' },
        error_message: null,
        extracted_at: null
      },
      { onConflict: 'file_id' }
    );
    if (upsertErr) {
      console.log('  ✗ upsert:', upsertErr.message);
      fail += 1;
      continue;
    }

    const { data: blob, error: dlErr } = await supabase.storage
      .from(NUTRI_BUCKET)
      .download(fileRec.storage_path);
    if (dlErr || !blob) {
      console.log('  ✗ download:', dlErr?.message || 'sin blob');
      fail += 1;
      await supabase
        .from('plan_pro_nutri_file_extracts')
        .update({
          status: 'error',
          error_message: dlErr?.message || 'download failed',
          extracted_at: new Date().toISOString()
        })
        .eq('file_id', fileRec.id);
      continue;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    try {
      const extracted = await ocrPdfWithOpenAI(apiKey, model, buffer, fileRec.original_name);
      const patch = {
        status: extracted.status,
        format_kind: 'ocr_pdf',
        text_plain: extracted.text_plain || null,
        meta_json: extracted.meta_json || {},
        error_message: extracted.error_message || null,
        extracted_at: new Date().toISOString()
      };
      const { error: patchErr } = await supabase
        .from('plan_pro_nutri_file_extracts')
        .update(patch)
        .eq('file_id', fileRec.id);
      if (patchErr) throw new Error(patchErr.message);

      if (extracted.status === 'done') {
        console.log('  ✓ OCR', extracted.meta_json?.char_count || 0, 'car.');
        ok += 1;
        directState.done[fileRec.id] = {
          ok: true,
          name: fileRec.original_name,
          chars: extracted.meta_json?.char_count || 0,
          at: new Date().toISOString()
        };
        bulkState.done[fileRec.original_name] = {
          fileId: fileRec.id,
          http: 200,
          status: 'done',
          chars: extracted.meta_json?.char_count || 0,
          error: null,
          via: 'direct',
          at: new Date().toISOString()
        };
      } else if (extracted.status === 'skipped') {
        console.log('  · skipped', extracted.error_message || '');
        skip += 1;
        directState.done[fileRec.id] = {
          ok: true,
          skipped: true,
          name: fileRec.original_name,
          at: new Date().toISOString()
        };
        bulkState.done[fileRec.original_name] = {
          fileId: fileRec.id,
          http: 200,
          status: 'skipped',
          chars: 0,
          error: extracted.error_message,
          via: 'direct',
          at: new Date().toISOString()
        };
      } else {
        console.log('  ✗', extracted.error_message || extracted.status);
        fail += 1;
        directState.done[fileRec.id] = {
          ok: false,
          error: extracted.error_message,
          at: new Date().toISOString()
        };
      }
      saveJson(DIRECT_STATE, directState);
      saveJson(STATE_PATH, bulkState);
    } catch (e) {
      console.log('  ✗', e.message || e);
      fail += 1;
      await supabase
        .from('plan_pro_nutri_file_extracts')
        .update({
          status: 'error',
          error_message: String(e.message || e),
          extracted_at: new Date().toISOString()
        })
        .eq('file_id', fileRec.id);
      directState.done[fileRec.id] = {
        ok: false,
        error: String(e.message || e),
        at: new Date().toISOString()
      };
      saveJson(DIRECT_STATE, directState);
    }
  }

  console.log('\nListo OCR directo: ' + ok + ' ok, ' + skip + ' omitidos, ' + fail + ' error(es).');
  console.log('State:', DIRECT_STATE);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
