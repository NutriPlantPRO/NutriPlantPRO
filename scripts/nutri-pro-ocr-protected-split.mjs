#!/usr/bin/env node
/**
 * OCR PDFs protegidos/escaneados: descifra → parte páginas → Sol → indexa.
 *
 *   export OPENAI_API_KEY=...
 *   export NUTRI_PRO_BULK_EMAIL=...
 *   export NUTRI_PRO_BULK_PASSWORD=...
 *   node scripts/nutri-pro-ocr-protected-split.mjs
 *
 * Opciones:
 *   --password PWD   (default: agricolavalleesperanza + gmail del Guy Sela)
 *   --limit-pages N  máx páginas por archivo (0 = todas)
 *   --resume         reanuda state
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
const STATE_PATH = join(ROOT, 'scripts', 'nutri-pro-ocr-protected-split-state.json');
const TMP = '/tmp/nutri-pro-protected-ocr';

const DEFAULT_NAMES = [
  'Copia de Fertilizantes_ quimica y accion  (3) (2)_protected.pdf',
  'Copia de Microorganismos del suelo_nodrm_protected.pdf',
  'Copia de La Savia como indice de fertili - Carlos Cadahia (2) (1) (2)_protected.pdf',
  'Copia de Manual practico de Fertirrigaci - Eduardo Jesus Fernandez Rodrigu (1) (1)_protected.pdf',
  'Copia de Fertirrigacion - Desconocido (3) (1)_protected.pdf',
  'Copia de El suelo y su fertilidad (1)_protected.pdf'
];

function parseArgs(argv) {
  const out = {
    passwords: ['agricolavalleesperanza', 'jesuschuzzavila@gmail.com'],
    limitPages: 0,
    resume: true,
    names: DEFAULT_NAMES
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--password' && argv[i + 1]) out.passwords.unshift(argv[++i]);
    else if (a === '--limit-pages' && argv[i + 1]) out.limitPages = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--no-resume') out.resume = false;
  }
  return out;
}

function loadSupabaseConfig() {
  const raw = readFileSync(join(ROOT, 'supabase-config.js'), 'utf8');
  return {
    url: raw.match(/url:\s*['"]([^'"]+)['"]/)[1],
    anonKey: raw.match(/anonKey:\s*['"]([^'"]+)['"]/)[1]
  };
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { files: {} };
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch (_) {
    return { files: {} };
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
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

function decryptPdfToPath(encPath, passwords, outPath) {
  for (const pwd of passwords) {
    const py = `
from pypdf import PdfReader, PdfWriter
pwd = ${JSON.stringify(pwd)}
reader = PdfReader(${JSON.stringify(encPath)})
if reader.is_encrypted:
    r = reader.decrypt(pwd)
    if r == 0:
        raise SystemExit(2)
writer = PdfWriter()
for p in reader.pages:
    writer.add_page(p)
with open(${JSON.stringify(outPath)}, "wb") as f:
    writer.write(f)
print("OK", len(reader.pages), pwd)
`;
    const r = spawnSync('python3', ['-c', py], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (r.status === 0 && (r.stdout || '').startsWith('OK')) {
      return { ok: true, pages: parseInt((r.stdout || '').split(/\s+/)[1], 10) || 0, password: pwd };
    }
  }
  return { ok: false };
}

async function ocrPdfBuffer(apiKey, model, buffer, filename) {
  const prompt =
    'Transcribe todo el texto legible de esta página PDF escaneada para Nutri PRO. ' +
    'Mantén tablas, números, unidades y encabezados. No inventes. Si no hay texto: SIN_TEXTO_LEGIBLE';
  const payload = {
    model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          {
            type: 'input_file',
            filename: filename || 'page.pdf',
            file_data: 'data:application/pdf;base64,' + buffer.toString('base64')
          }
        ]
      }
    ],
    max_output_tokens: 8000
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
    data = { error: raw.slice(0, 300) };
  }
  if (!res.ok) {
    throw new Error(
      (data && data.error && (data.error.message || data.error)) || 'OpenAI HTTP ' + res.status
    );
  }
  const text = outputTextFromResponses(data);
  if (!text || /^SIN_TEXTO_LEGIBLE$/i.test(text)) return '';
  return text;
}

async function main() {
  const opts = parseArgs(process.argv);
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Falta OPENAI_API_KEY');
  const model =
    (process.env.OPENAI_ADMIN_MODEL || '').trim() ||
    (process.env.OPENAI_OCR_MODEL || '').trim() ||
    DEFAULT_MODEL;
  const email = (process.env.NUTRI_PRO_BULK_EMAIL || '').trim();
  const password = process.env.NUTRI_PRO_BULK_PASSWORD || '';
  if (!email || !password) throw new Error('Falta login Nutri PRO');

  mkdirSync(TMP, { recursive: true });
  const cfg = loadSupabaseConfig();
  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: true }
  });
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) throw loginErr;

  const state = opts.resume ? loadState() : { files: {} };
  console.log('OCR protected-split | modelo', model, '| archivos', opts.names.length);

  for (const name of opts.names) {
    const { data: fileRec, error: fileErr } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,owner_id,original_name,storage_path,size_bytes')
      .eq('original_name', name)
      .maybeSingle();
    if (fileErr || !fileRec) {
      console.log('\n↷ no en nube:', name);
      continue;
    }

    const st = state.files[fileRec.id] || { pages: {}, done: false };
    if (st.done) {
      console.log('\n↷ ya hecho:', name);
      continue;
    }

    console.log(
      '\n==',
      fileRec.original_name,
      ((fileRec.size_bytes || 0) / 1024 / 1024).toFixed(1),
      'MB'
    );

    await supabase.from('plan_pro_nutri_file_extracts').upsert(
      {
        file_id: fileRec.id,
        owner_id: fileRec.owner_id,
        status: 'processing',
        format_kind: 'ocr_pdf',
        text_plain: null,
        meta_json: { via: 'protected_split' },
        error_message: null,
        extracted_at: null
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
    const dec = decryptPdfToPath(encPath, opts.passwords, decPath);
    if (!dec.ok) {
      console.log('✗ no se pudo descifrar');
      continue;
    }
    console.log('  descifrado OK · páginas totales', dec.pages);

    const full = readFileSync(decPath);
    const src = await PDFDocument.load(full, { ignoreEncryption: true });
    const nPages = src.getPageCount();
    const max = opts.limitPages > 0 ? Math.min(nPages, opts.limitPages) : nPages;
    console.log('  OCR páginas 1..' + max + ' de ' + nPages);

    for (let i = 0; i < max; i++) {
      const key = String(i + 1);
      if (st.pages[key] != null) {
        process.stdout.write(`  [${i + 1}/${max}] resume (${String(st.pages[key]).length} car.)\n`);
        continue;
      }
      const doc = await PDFDocument.create();
      const [page] = await doc.copyPages(src, [i]);
      doc.addPage(page);
      const bytes = Buffer.from(await doc.save());
      const mb = (bytes.length / 1024 / 1024).toFixed(2);
      process.stdout.write(`  [${i + 1}/${max}] ${mb} MB … `);
      try {
        const text = await ocrPdfBuffer(
          apiKey,
          model,
          bytes,
          `${fileRec.original_name.replace(/\.pdf$/i, '')}_p${i + 1}.pdf`
        );
        console.log(text ? text.length + ' car.' : 'vacío');
        st.pages[key] = text || '';
      } catch (e) {
        console.log('✗', e.message || e);
        st.pages[key] = '';
        st.lastError = String(e.message || e);
      }
      state.files[fileRec.id] = st;
      saveState(state);

      // checkpoint extract parcial cada 10 págs o al final
      if ((i + 1) % 10 === 0 || i + 1 === max) {
        const parts = [];
        for (let p = 1; p <= Object.keys(st.pages).length; p++) {
          const t = st.pages[String(p)];
          if (t) parts.push(`## Página ${p}\n\n${t}`);
        }
        const joined = parts.join('\n\n---\n\n').trim();
        await supabase
          .from('plan_pro_nutri_file_extracts')
          .update({
            status: i + 1 === max ? (joined ? 'done' : 'skipped') : 'processing',
            format_kind: 'ocr_pdf',
            text_plain: joined || null,
            meta_json: {
              char_count: joined.length,
              pages_done: i + 1,
              pages_total: nPages,
              model,
              via: 'protected_split',
              truncated: false
            },
            error_message: joined ? null : 'OCR sin texto legible',
            extracted_at: new Date().toISOString()
          })
          .eq('file_id', fileRec.id);
      }
    }

    st.done = true;
    state.files[fileRec.id] = st;
    saveState(state);
    const totalChars = Object.values(st.pages).reduce((a, t) => a + (t || '').length, 0);
    console.log('  → listo', totalChars, 'car.');
  }

  console.log('\nListo protected-split.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
