#!/usr/bin/env node
/**
 * OCR eficiente de PDFs protegidos/escaneados:
 * - Si el PDF descifrado cabe (<~18MB): UNA sola llamada a Sol
 * - Si es más grande: paquetes de N páginas hasta ~15MB (no 1 hoja)
 *
 *   export OPENAI_API_KEY=...
 *   export NUTRI_PRO_BULK_EMAIL=...
 *   export NUTRI_PRO_BULK_PASSWORD=...
 *   node scripts/nutri-pro-ocr-efficient.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const NUTRI_BUCKET = 'plan-pro-nutri-pro';
const DEFAULT_MODEL = 'gpt-5.6-sol';
const STATE_PATH = join(ROOT, 'scripts', 'nutri-pro-ocr-efficient-state.json');
const TMP = '/tmp/nutri-pro-ocr-efficient';
const WHOLE_MAX = 18 * 1024 * 1024;
const PACK_MAX = 12 * 1024 * 1024;
const FILE_UPLOAD_BYTES = 18 * 1024 * 1024;
/** Evita OCR “entero” en libros con muchas págs (Sol trunca a ~300 car.). */
const MAX_PAGES_WHOLE = 35;
/** Paquetes: varias páginas por llamada (barato vs 1 hoja; mejor que 200+ págs juntas). */
const MAX_PAGES_PER_PACK = 20;
const FERT_ID = '3769cc41-ee6d-4cc6-9456-9ebbd9035fe6';
const PARTIAL_STATE = join(ROOT, 'scripts', 'nutri-pro-ocr-protected-split-state.json');

const DEFAULT_NAMES = [
  'Copia de Fertilizantes_ quimica y accion  (3) (2)_protected.pdf',
  'Copia de Microorganismos del suelo_nodrm_protected.pdf',
  'Copia de La Savia como indice de fertili - Carlos Cadahia (2) (1) (2)_protected.pdf',
  'Copia de Manual practico de Fertirrigaci - Eduardo Jesus Fernandez Rodrigu (1) (1)_protected.pdf',
  'Copia de Fertirrigacion - Desconocido (3) (1)_protected.pdf',
  'Copia de El suelo y su fertilidad (1)_protected.pdf'
];

function parseOnly(argv) {
  const names = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--only' && argv[i + 1]) names.push(argv[++i]);
  }
  return names.length ? names : DEFAULT_NAMES;
}

const PASSWORDS = ['agricolavalleesperanza', 'jesuschuzzavila@gmail.com'];

function loadSupabaseConfig() {
  const raw = readFileSync(join(ROOT, 'supabase-config.js'), 'utf8');
  return {
    url: raw.match(/url:\s*['"]([^'"]+)['"]/)[1],
    anonKey: raw.match(/anonKey:\s*['"]([^'"]+)['"]/)[1]
  };
}

function statePathFor(fileId) {
  return join(ROOT, 'scripts', 'nutri-pro-ocr-efficient-state-' + fileId + '.json');
}

function loadState(fileId) {
  const path = fileId ? statePathFor(fileId) : STATE_PATH;
  if (!existsSync(path)) return { done: {} };
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (_) {
    return { done: {} };
  }
}

function saveState(state, fileId) {
  const path = fileId ? statePathFor(fileId) : STATE_PATH;
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf8');
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

function decryptPdf(encPath, outPath) {
  for (const pwd of PASSWORDS) {
    const py = `
from pypdf import PdfReader, PdfWriter
pwd = ${JSON.stringify(pwd)}
reader = PdfReader(${JSON.stringify(encPath)})
if reader.is_encrypted:
    if reader.decrypt(pwd) == 0:
        raise SystemExit(2)
w = PdfWriter()
for p in reader.pages:
    w.add_page(p)
with open(${JSON.stringify(outPath)}, "wb") as f:
    w.write(f)
print("OK", len(reader.pages))
`;
    const r = spawnSync('python3', ['-c', py], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (r.status === 0 && (r.stdout || '').startsWith('OK')) {
      return { ok: true, pages: parseInt((r.stdout || '').split(/\s+/)[1], 10) || 0 };
    }
  }
  return { ok: false };
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
  if (!res.ok) throw new Error((json.error && json.error.message) || 'files upload failed');
  return json.id;
}

async function deleteOpenAiFile(apiKey, fileId) {
  try {
    await fetch('https://api.openai.com/v1/files/' + fileId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + apiKey }
    });
  } catch (_) {}
}

async function ocrPdfBuffer(apiKey, model, buffer, filename, label) {
  const prompt =
    'Transcribe TODO el texto legible de este PDF escaneado para indexarlo en Nutri PRO. ' +
    (label ? '(' + label + ') ' : '') +
    'Mantén tablas, números, unidades y encabezados. No inventes. Si no hay texto: SIN_TEXTO_LEGIBLE';

  let uploadedId = null;
  let fileContent;
  if (buffer.length >= FILE_UPLOAD_BYTES) {
    process.stdout.write('↑Files… ');
    uploadedId = await uploadOpenAiFile(apiKey, buffer, filename);
    fileContent = { type: 'input_file', file_id: uploadedId };
  } else {
    fileContent = {
      type: 'input_file',
      filename: filename || 'doc.pdf',
      file_data: 'data:application/pdf;base64,' + buffer.toString('base64')
    };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model,
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, fileContent] }],
        max_output_tokens: 16000
      })
    });
    const raw = await res.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch (_) {
      data = { error: raw.slice(0, 300) };
    }
    if (!res.ok) {
      throw new Error((data.error && (data.error.message || data.error)) || 'HTTP ' + res.status);
    }
    const text = outputTextFromResponses(data);
    if (!text || /^SIN_TEXTO_LEGIBLE$/i.test(text)) return '';
    return text;
  } finally {
    if (uploadedId) await deleteOpenAiFile(apiKey, uploadedId);
  }
}

async function buildPacks(srcDoc, nPages, startPage0 = 0) {
  const packs = [];
  let start = startPage0;
  while (start < nPages) {
    let end = start;
    let lastBytes = null;
    while (end < nPages) {
      const pageCount = end - start + 1;
      if (pageCount > MAX_PAGES_PER_PACK) break;
      const doc = await PDFDocument.create();
      const idxs = [];
      for (let i = start; i <= end; i++) idxs.push(i);
      const pages = await doc.copyPages(srcDoc, idxs);
      pages.forEach((p) => doc.addPage(p));
      const bytes = Buffer.from(await doc.save());
      if (bytes.length > PACK_MAX && end > start) break;
      lastBytes = bytes;
      end += 1;
      if (bytes.length > PACK_MAX * 0.9 || pageCount >= MAX_PAGES_PER_PACK) break;
    }
    if (!lastBytes) {
      const doc = await PDFDocument.create();
      const [page] = await doc.copyPages(srcDoc, [start]);
      doc.addPage(page);
      lastBytes = Buffer.from(await doc.save());
      end = start + 1;
    }
    packs.push({ from: start + 1, to: end, bytes: lastBytes });
    start = end;
  }
  return packs;
}

function loadFertilizantesPartialText() {
  if (!existsSync(PARTIAL_STATE)) return { text: '', lastPage: 0 };
  try {
    const st = JSON.parse(readFileSync(PARTIAL_STATE, 'utf8'));
    const rec = st.files && st.files[FERT_ID];
    if (!rec || !rec.pages) return { text: '', lastPage: 0 };
    const keys = Object.keys(rec.pages)
      .map(Number)
      .sort((a, b) => a - b);
    const parts = [];
    for (const p of keys) {
      const t = rec.pages[String(p)];
      if (t) parts.push(`## Página ${p}\n\n${t}`);
    }
    return { text: parts.join('\n\n---\n\n').trim(), lastPage: keys.length ? keys[keys.length - 1] : 0 };
  } catch (_) {
    return { text: '', lastPage: 0 };
  }
}

async function main() {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Falta OPENAI_API_KEY');
  const model =
    (process.env.OPENAI_ADMIN_MODEL || '').trim() ||
    (process.env.OPENAI_OCR_MODEL || '').trim() ||
    DEFAULT_MODEL;
  const email = (process.env.NUTRI_PRO_BULK_EMAIL || '').trim();
  const password = process.env.NUTRI_PRO_BULK_PASSWORD || '';
  if (!email || !password) throw new Error('Falta login Nutri');

  mkdirSync(TMP, { recursive: true });
  const cfg = loadSupabaseConfig();
  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: true }
  });
  await supabase.auth.signInWithPassword({ email, password });
  const names = parseOnly(process.argv);
  console.log('OCR eficiente | modelo', model, '| archivos', names.length);

  for (const name of names) {
    const { data: fileRec } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,owner_id,original_name,storage_path,size_bytes')
      .eq('original_name', name)
      .maybeSingle();
    if (!fileRec) {
      console.log('\n↷ no en nube:', name);
      continue;
    }
    const state = loadState(fileRec.id);
    if (state.done[fileRec.id]?.ok && !state.done[fileRec.id]?.partial) {
      console.log('\n↷ ya OK eficiente:', name);
      continue;
    }

    console.log('\n==', fileRec.original_name, ((fileRec.size_bytes || 0) / 1024 / 1024).toFixed(1), 'MB');
    // No borrar texto existente al iniciar (p.ej. parcial Fertilizantes)
    await supabase.from('plan_pro_nutri_file_extracts').upsert(
      {
        file_id: fileRec.id,
        owner_id: fileRec.owner_id,
        status: 'processing',
        format_kind: 'ocr_pdf',
        meta_json: { via: 'efficient' },
        error_message: null
      },
      { onConflict: 'file_id' }
    );

    const { data: blob, error: dlErr } = await supabase.storage
      .from(NUTRI_BUCKET)
      .download(fileRec.storage_path);
    if (dlErr || !blob) {
      console.log('✗ download', dlErr?.message);
      continue;
    }
    const encPath = join(TMP, fileRec.id + '-enc.pdf');
    const decPath = join(TMP, fileRec.id + '-dec.pdf');
    writeFileSync(encPath, Buffer.from(await blob.arrayBuffer()));
    const dec = decryptPdf(encPath, decPath);
    if (!dec.ok) {
      console.log('✗ decrypt');
      continue;
    }
    const full = readFileSync(decPath);
    console.log('  descifrado', (full.length / 1024 / 1024).toFixed(1), 'MB ·', dec.pages, 'págs');

    let parts = [];
    let mode = 'packs';
    let startPage0 = 0;

    // Fertilizantes: conservar mitad ya pagada; solo completar 124..246
    if (fileRec.id === FERT_ID) {
      const partial = loadFertilizantesPartialText();
      if (partial.lastPage > 0 && partial.text) {
        parts.push(partial.text);
        startPage0 = partial.lastPage; // 0-index next = lastPage (since lastPage is 1-based complete)
        console.log('  conservando parcial págs 1-' + partial.lastPage + ' (' + partial.text.length + ' car.)');
        console.log('  completando desde pág', startPage0 + 1);
      }
    }

    const useWhole =
      startPage0 === 0 &&
      full.length <= WHOLE_MAX &&
      dec.pages <= MAX_PAGES_WHOLE;

    if (useWhole) {
      mode = 'whole';
      process.stdout.write('  [1/1] entero … ');
      try {
        const text = await ocrPdfBuffer(apiKey, model, full, fileRec.original_name, 'documento completo');
        console.log(text ? text.length + ' car.' : 'vacío');
        if (text) parts = [text];
        else mode = 'packs';
      } catch (e) {
        console.log('✗', e.message || e, '→ paquetes');
        mode = 'packs';
      }
    }

    if (mode === 'packs') {
      const src = await PDFDocument.load(full, { ignoreEncryption: true });
      const packs = await buildPacks(src, src.getPageCount(), startPage0);
      console.log('  paquetes:', packs.length, '(máx', MAX_PAGES_PER_PACK, 'págs/paquete)');
      for (let i = 0; i < packs.length; i++) {
        const p = packs[i];
        process.stdout.write(
          `  [${i + 1}/${packs.length}] págs ${p.from}-${p.to} ${(p.bytes.length / 1024 / 1024).toFixed(1)}MB … `
        );
        try {
          const text = await ocrPdfBuffer(
            apiKey,
            model,
            p.bytes,
            fileRec.original_name.replace(/\.pdf$/i, '') + `_p${p.from}-${p.to}.pdf`,
            `páginas ${p.from}-${p.to}`
          );
          console.log(text ? text.length + ' car.' : 'vacío');
          if (text) parts.push(`## Páginas ${p.from}-${p.to}\n\n${text}`);
          // checkpoint
          const joinedTmp = parts.join('\n\n---\n\n').trim();
          await supabase
            .from('plan_pro_nutri_file_extracts')
            .update({
              status: 'processing',
              format_kind: 'ocr_pdf',
              text_plain: joinedTmp || null,
              meta_json: {
                char_count: joinedTmp.length,
                pages_done: p.to,
                pages_total: dec.pages,
                model,
                via: 'efficient_packs',
                truncated: false
              },
              extracted_at: new Date().toISOString()
            })
            .eq('file_id', fileRec.id);
        } catch (e) {
          console.log('✗', e.message || e);
          if (/quota|billing|insufficient/i.test(String(e.message || e))) {
            console.log('  !! cuota/billing — guardo avance y paro');
            const joinedTmp = parts.join('\n\n---\n\n').trim();
            if (joinedTmp) {
              await supabase
                .from('plan_pro_nutri_file_extracts')
                .update({
                  status: 'done',
                  text_plain: joinedTmp,
                  meta_json: {
                    char_count: joinedTmp.length,
                    via: 'efficient_packs_partial_quota',
                    pages_total: dec.pages
                  },
                  extracted_at: new Date().toISOString()
                })
                .eq('file_id', fileRec.id);
            }
            state.done[fileRec.id] = {
              ok: !!joinedTmp.length,
              partial: true,
              chars: joinedTmp.length,
              error: String(e.message || e),
              at: new Date().toISOString()
            };
            saveState(state, fileRec.id);
            throw e;
          }
        }
      }
    }

    const joined = parts.join('\n\n---\n\n').trim();
    const status = joined.length ? 'done' : 'skipped';
    await supabase
      .from('plan_pro_nutri_file_extracts')
      .update({
        status,
        format_kind: 'ocr_pdf',
        text_plain: joined || null,
        meta_json: {
          char_count: joined.length,
          pages: dec.pages,
          model,
          via: 'efficient_' + mode,
          truncated: false
        },
        error_message: joined ? null : 'OCR eficiente sin texto',
        extracted_at: new Date().toISOString()
      })
      .eq('file_id', fileRec.id);

    state.done[fileRec.id] = {
      ok: !!joined.length,
      name: fileRec.original_name,
      chars: joined.length,
      mode,
      at: new Date().toISOString()
    };
    saveState(state, fileRec.id);
    console.log('  →', status, joined.length, 'car.');
  }

  console.log('\nListo OCR eficiente.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
