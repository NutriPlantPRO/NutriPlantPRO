#!/usr/bin/env node
/**
 * OCR de PDFs grandes: parte por página (<32MB OpenAI) y une el texto.
 *
 * Uso:
 *   export OPENAI_API_KEY=...
 *   export NUTRI_PRO_BULK_EMAIL=...
 *   export NUTRI_PRO_BULK_PASSWORD=...
 *   node scripts/nutri-pro-ocr-split-pages.mjs --file-id UUID [--file-id UUID2]
 */

import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const NUTRI_BUCKET = 'plan-pro-nutri-pro';
const DEFAULT_MODEL = 'gpt-5.6-sol';

function parseArgs(argv) {
  const ids = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--file-id' && argv[i + 1]) ids.push(argv[++i]);
  }
  return { ids };
}

function loadSupabaseConfig() {
  const raw = readFileSync(join(ROOT, 'supabase-config.js'), 'utf8');
  const url = raw.match(/url:\s*['"]([^'"]+)['"]/)[1];
  const anonKey = raw.match(/anonKey:\s*['"]([^'"]+)['"]/)[1];
  return { url, anonKey };
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

async function ocrPdfBuffer(apiKey, model, buffer, filename) {
  const prompt =
    'Transcribe todo el texto legible de este PDF (puede ser 1 página escaneada) para Nutri PRO. ' +
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
  const { ids } = parseArgs(process.argv);
  if (!ids.length) throw new Error('Pasa --file-id UUID');
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Falta OPENAI_API_KEY');
  const model =
    (process.env.OPENAI_ADMIN_MODEL || '').trim() ||
    (process.env.OPENAI_OCR_MODEL || '').trim() ||
    DEFAULT_MODEL;

  const email = (process.env.NUTRI_PRO_BULK_EMAIL || '').trim();
  const password = process.env.NUTRI_PRO_BULK_PASSWORD || '';
  if (!email || !password) throw new Error('Falta login Nutri PRO');

  const cfg = loadSupabaseConfig();
  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: true }
  });
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) throw loginErr;
  console.log('OCR split-pages | modelo', model, '| archivos', ids.length);

  for (const fileId of ids) {
    const { data: fileRec, error: fileErr } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,owner_id,original_name,storage_path,size_bytes')
      .eq('id', fileId)
      .maybeSingle();
    if (fileErr || !fileRec) {
      console.log('✗', fileId, fileErr?.message || 'no encontrado');
      continue;
    }
    console.log('\n==', fileRec.original_name, ((fileRec.size_bytes || 0) / 1024 / 1024).toFixed(1), 'MB');

    await supabase.from('plan_pro_nutri_file_extracts').upsert(
      {
        file_id: fileRec.id,
        owner_id: fileRec.owner_id,
        status: 'processing',
        format_kind: 'ocr_pdf',
        text_plain: null,
        meta_json: { via: 'split_pages' },
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
    const full = Buffer.from(await blob.arrayBuffer());
    const src = await PDFDocument.load(full, { ignoreEncryption: true });
    const n = src.getPageCount();
    console.log('  páginas:', n);

    const parts = [];
    for (let i = 0; i < n; i++) {
      const doc = await PDFDocument.create();
      const [page] = await doc.copyPages(src, [i]);
      doc.addPage(page);
      const bytes = Buffer.from(await doc.save());
      const mb = (bytes.length / 1024 / 1024).toFixed(2);
      process.stdout.write(`  [${i + 1}/${n}] ${mb} MB … `);
      try {
        const text = await ocrPdfBuffer(
          apiKey,
          model,
          bytes,
          `${fileRec.original_name.replace(/\.pdf$/i, '')}_p${i + 1}.pdf`
        );
        console.log(text ? text.length + ' car.' : 'vacío');
        if (text) parts.push(`## Página ${i + 1}\n\n${text}`);
      } catch (e) {
        console.log('✗', e.message || e);
        parts.push(`## Página ${i + 1}\n\n[OCR error: ${e.message || e}]`);
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
          pages: n,
          model,
          via: 'split_pages',
          truncated: false
        },
        error_message: joined.length ? null : 'OCR split: sin texto legible',
        extracted_at: new Date().toISOString()
      })
      .eq('file_id', fileRec.id);

    console.log('  →', status, joined.length, 'car. total');
  }
  console.log('\nListo split-pages.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
