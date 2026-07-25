#!/usr/bin/env node
/**
 * Nutri PRO — OCR/IA (Sol) en lote para archivos ya subidos.
 *
 * Lee docs/NUTRI-PRO-PENDIENTES-OCR-UTIL.csv (o --csv PATH),
 * resuelve file_id en Supabase y llama a la función Netlify nutri-pro-extract
 * con mode=ocr (usa OPENAI_ADMIN_MODEL / gpt-5.6-sol en el servidor).
 *
 * Uso:
 *   export NUTRI_PRO_BULK_EMAIL="..."
 *   export NUTRI_PRO_BULK_PASSWORD="..."
 *   node scripts/nutri-pro-bulk-ocr.mjs
 *
 * Opciones:
 *   --csv PATH     Lista CSV (default: docs/NUTRI-PRO-PENDIENTES-OCR-UTIL.csv)
 *   --limit N      Máximo a procesar (0 = todos)
 *   --pdf-only     Solo PDF (recomendado; OCR Sol no indexa PPTX aquí)
 *   --force        force:true aunque ya tengan extract
 *   --dry-run      Solo lista ids
 *   --api URL      Override API (default https://nutriplantpro.com/.netlify/functions/nutri-pro-extract)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_CSV = join(ROOT, 'docs', 'NUTRI-PRO-PENDIENTES-OCR-UTIL.csv');
const DEFAULT_API = 'https://nutriplantpro.com/.netlify/functions/nutri-pro-extract';
const STATE_PATH = join(ROOT, 'scripts', 'nutri-pro-bulk-ocr-state.json');

function parseArgs(argv) {
  const out = {
    csv: DEFAULT_CSV,
    limit: 0,
    pdfOnly: true,
    force: true,
    dryRun: false,
    api: (process.env.NUTRI_PRO_EXTRACT_API || '').trim() || DEFAULT_API
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--csv' && argv[i + 1]) out.csv = argv[++i];
    else if (a === '--limit' && argv[i + 1]) out.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--pdf-only') out.pdfOnly = true;
    else if (a === '--all-types') out.pdfOnly = false;
    else if (a === '--force') out.force = true;
    else if (a === '--no-force') out.force = false;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--api' && argv[i + 1]) out.api = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 28).join('\n'));
      process.exit(0);
    }
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

function parseCsv(path) {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] != null ? cols[idx] : '';
    });
    rows.push(obj);
  }
  return rows;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { done: {} };
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch (_) {
    return { done: {} };
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

async function signIn(supabase) {
  const email = (process.env.NUTRI_PRO_BULK_EMAIL || '').trim();
  const password = process.env.NUTRI_PRO_BULK_PASSWORD || '';
  if (!email || !password) throw new Error('Define NUTRI_PRO_BULK_EMAIL y NUTRI_PRO_BULK_PASSWORD');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Login: ' + error.message);
  if (!data.session?.access_token) throw new Error('Login sin access_token');
  return data.session.access_token;
}

async function findFileId(supabase, originalName) {
  const { data, error } = await supabase
    .from('plan_pro_nutri_files')
    .select('id,original_name,folder_id,size_bytes')
    .eq('original_name', originalName)
    .limit(5);
  if (error) throw new Error(error.message);
  if (!data || !data.length) return null;
  if (data.length === 1) return data[0];
  // prefer largest (often full scan)
  return data.slice().sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0))[0];
}

async function ocrOne(api, token, fileId, force) {
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      file_id: fileId,
      mode: 'ocr',
      force: !!force,
      access_token: token
    })
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = { error: text.slice(0, 300) };
  }
  return { http: res.status, json };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!existsSync(opts.csv)) throw new Error('No existe CSV: ' + opts.csv);
  let rows = parseCsv(opts.csv).filter((r) => (r.priority || '').startsWith('OCR_'));
  if (opts.pdfOnly) {
    rows = rows.filter((r) => /\.pdf$/i.test(r.name || ''));
  }
  const state = loadState();
  rows = rows.filter((r) => !state.done[r.name]);
  if (opts.limit > 0) rows = rows.slice(0, opts.limit);

  console.log('Nutri PRO bulk OCR/IA');
  console.log('  CSV:', opts.csv);
  console.log('  API:', opts.api);
  console.log('  Pendientes en cola:', rows.length, opts.pdfOnly ? '(solo PDF)' : '');
  console.log('  force:', opts.force);
  if (opts.dryRun) console.log('  Modo: dry-run');

  const cfg = loadSupabaseConfig();
  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: true }
  });
  const token = await signIn(supabase);
  console.log('  Sesión OK');

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name;
    process.stdout.write(`\n[${i + 1}/${rows.length}] ${name}\n`);
    let fileRec;
    try {
      fileRec = await findFileId(supabase, name);
    } catch (e) {
      console.log('  ✗ lookup:', e.message || e);
      fail += 1;
      continue;
    }
    if (!fileRec) {
      console.log('  ↷ no está en nube');
      skip += 1;
      state.done[name] = { skipped: true, reason: 'not_in_cloud', at: new Date().toISOString() };
      saveState(state);
      continue;
    }
    if (opts.dryRun) {
      console.log('  [dry-run] file_id=', fileRec.id, 'bytes=', fileRec.size_bytes);
      continue;
    }
    try {
      const res = await ocrOne(opts.api, token, fileRec.id, opts.force);
      const j = res.json || {};
      if (j.skipped) {
        console.log('  ↷ ya extraído');
        skip += 1;
      } else if (j.ok && j.status === 'done') {
        console.log('  ✓ OCR', j.char_count || 0, 'car.', j.format_kind || '');
        ok += 1;
      } else if (j.ok && j.status === 'skipped') {
        console.log('  · skipped', j.error_message || '');
        skip += 1;
      } else {
        console.log('  ✗', res.http, j.error || j.error_message || JSON.stringify(j).slice(0, 180));
        fail += 1;
      }
      state.done[name] = {
        fileId: fileRec.id,
        http: res.http,
        status: j.status || null,
        chars: j.char_count || 0,
        error: j.error || j.error_message || null,
        at: new Date().toISOString()
      };
      saveState(state);
    } catch (e) {
      console.log('  ✗', e.message || e);
      fail += 1;
      state.done[name] = { error: String(e.message || e), at: new Date().toISOString() };
      saveState(state);
    }
  }

  console.log('\nListo OCR: ' + ok + ' ok, ' + skip + ' omitidos, ' + fail + ' error(es).');
  console.log('State:', STATE_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
