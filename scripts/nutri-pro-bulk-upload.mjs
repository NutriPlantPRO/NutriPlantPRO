#!/usr/bin/env node
/**
 * Nutri PRO — importación masiva desde Mac (carpeta → carpeta Nutri PRO).
 *
 * Uso (una carpeta local = una carpeta en Nutri PRO con sus archivos):
 *
 *   export NUTRI_PRO_BULK_EMAIL="tu@correo.com"
 *   export NUTRI_PRO_BULK_PASSWORD="tu-contraseña"
 *   node scripts/nutri-pro-bulk-upload.mjs --dir "/Users/tu/Medicos"
 *
 * Opciones:
 *   --dir PATH           Carpeta local con archivos (obligatorio)
 *   --title "Nombre"     Título en Nutri PRO (default: nombre de la carpeta local)
 *   --parent "Personal"  Carpeta padre existente en Nutri PRO (opcional)
 *   --parent-id UUID     Id de carpeta padre (alternativa a --parent)
 *   --reuse-folder       Si ya existe carpeta con ese título bajo el padre, reutilizarla
 *   --recursive          Subcarpetas locales → subcarpetas Nutri PRO
 *   --concurrency N      Subidas en paralelo (default 3, max 8)
 *   --dry-run            Solo lista; no sube
 *   --resume             Continuar usando .nutri-pro-upload-state.json en la carpeta
 *   --skip-existing      Omitir si original_name ya está en esa carpeta Nutri PRO
 *
 * Credenciales: NUTRI_PRO_BULK_EMAIL + NUTRI_PRO_BULK_PASSWORD
 * Supabase URL/key: variables NUTRIPLANT_SUPABASE_URL / NUTRIPLANT_SUPABASE_ANON_KEY
 * o supabase-config.js en la raíz del proyecto.
 */

import { createClient } from '@supabase/supabase-js';
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync
} from 'fs';
import { join, basename, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const NP_BUCKET = 'plan-pro-nutri-pro';
const FILE_EXT_OK =
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|ods|odp|png|jpe?g|webp|gif|bmp|tiff?|heic|heif|svg)$/i;
const SKIP_NAMES = /^(\.DS_Store|\._.*|\.nutri-pro-upload-state\.json|Thumbs\.db|desktop\.ini)$/i;
const MIME_BY_EXT = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml'
};

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

function parseArgs(argv) {
  const out = {
    dir: '',
    title: '',
    parent: '',
    parentId: '',
    reuseFolder: false,
    recursive: false,
    concurrency: 3,
    dryRun: false,
    resume: false,
    skipExisting: true
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' && argv[i + 1]) out.dir = argv[++i];
    else if (a === '--title' && argv[i + 1]) out.title = argv[++i];
    else if (a === '--parent' && argv[i + 1]) out.parent = argv[++i];
    else if (a === '--parent-id' && argv[i + 1]) out.parentId = argv[++i];
    else if (a === '--reuse-folder') out.reuseFolder = true;
    else if (a === '--recursive') out.recursive = true;
    else if (a === '--concurrency' && argv[i + 1]) out.concurrency = Math.min(8, Math.max(1, parseInt(argv[++i], 10) || 3));
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--resume') out.resume = true;
    else if (a === '--skip-existing') out.skipExisting = true;
    else if (a === '--no-skip-existing') out.skipExisting = false;
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 28).join('\n'));
      process.exit(0);
    } else {
      console.error('Opción desconocida:', a);
      process.exit(1);
    }
  }
  return out;
}

function loadSupabaseConfig() {
  const url = (process.env.NUTRIPLANT_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NUTRIPLANT_SUPABASE_ANON_KEY || '').trim();
  if (url && anonKey) return { url, anonKey };
  const cfgPath = join(ROOT, 'supabase-config.js');
  const raw = readFileSync(cfgPath, 'utf8');
  const urlM = raw.match(/url:\s*['"]([^'"]+)['"]/);
  const keyM = raw.match(/anonKey:\s*['"]([^'"]+)['"]/);
  if (!urlM || !keyM) throw new Error('No se pudo leer Supabase URL/key de supabase-config.js');
  return { url: urlM[1], anonKey: keyM[1] };
}

function sanitizeStorageFilename(name) {
  let base = String(name || 'archivo').trim() || 'archivo';
  let ext = '';
  const dot = base.lastIndexOf('.');
  if (dot > 0 && dot < base.length - 1) {
    ext = base.slice(dot);
    base = base.slice(0, dot);
  }
  try {
    base = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (_) {}
  base = base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!base) base = 'archivo';
  ext = ext.replace(/[^A-Za-z0-9.]+/g, '').slice(0, 12);
  let out = base + ext;
  if (out.length > 180) out = base.slice(0, Math.max(1, 180 - ext.length)) + ext;
  return out;
}

function mimeFor(name) {
  const ext = extname(name).slice(1).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function isAllowedFile(name) {
  return FILE_EXT_OK.test(name);
}

function statePath(localDir) {
  return join(localDir, '.nutri-pro-upload-state.json');
}

function loadState(localDir) {
  const p = statePath(localDir);
  if (!existsSync(p)) return { uploaded: {}, folderId: null };
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (_) {
    return { uploaded: {}, folderId: null };
  }
}

function saveState(localDir, state) {
  writeFileSync(statePath(localDir), JSON.stringify(state, null, 2), 'utf8');
}

function listLocalFiles(dir, recursive) {
  const out = [];
  function walk(current, relPrefix) {
    const entries = readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      if (SKIP_NAMES.test(ent.name) || ent.name.startsWith('.')) continue;
      const abs = join(current, ent.name);
      const rel = relPrefix ? join(relPrefix, ent.name) : ent.name;
      if (ent.isDirectory()) {
        if (recursive) walk(abs, rel);
        continue;
      }
      if (!ent.isFile()) continue;
      if (!isAllowedFile(ent.name)) {
        console.warn('  ⊘ omitido (tipo no soportado):', rel);
        continue;
      }
      out.push({ absPath: abs, relPath: rel, name: ent.name, size: statSync(abs).size });
    }
  }
  walk(dir, '');
  return out;
}

async function signIn(supabase) {
  const email = (process.env.NUTRI_PRO_BULK_EMAIL || '').trim();
  const password = process.env.NUTRI_PRO_BULK_PASSWORD || '';
  if (!email || !password) {
    throw new Error('Define NUTRI_PRO_BULK_EMAIL y NUTRI_PRO_BULK_PASSWORD en el entorno.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Login: ' + error.message);
  if (!data.user?.id) throw new Error('Login sin usuario.');
  return data.user.id;
}

async function assertAdmin(supabase, userId) {
  const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  if (error) throw new Error('Perfil: ' + error.message);
  if (!data?.is_admin) throw new Error('La cuenta no es administrador (is_admin en Supabase).');
}

async function fetchAllFolders(supabase) {
  const { data, error } = await supabase
    .from('plan_pro_nutri_folders')
    .select('id,title,parent_id,sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw new Error('Carpetas: ' + error.message);
  return data || [];
}

function normTitle(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findFolderByTitle(folders, title, parentId) {
  const want = normTitle(title);
  return (
    folders.find((f) => normTitle(f.title) === want && (f.parent_id || null) === (parentId || null)) || null
  );
}

async function resolveParentId(supabase, folders, opts) {
  if (opts.parentId) return opts.parentId;
  if (!opts.parent) return null;
  const hit = findFolderByTitle(folders, opts.parent, null);
  if (!hit) {
    const any = folders.filter((f) => normTitle(f.title) === normTitle(opts.parent));
    if (any.length === 1) return any[0].id;
    if (any.length > 1) {
      throw new Error(
        'Hay varias carpetas «' + opts.parent + '». Usa --parent-id con el UUID exacto.'
      );
    }
    throw new Error('No existe carpeta padre «' + opts.parent + '» en Nutri PRO.');
  }
  return hit.id;
}

async function nextFolderSortOrder(supabase, parentId) {
  let q = supabase.from('plan_pro_nutri_folders').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  if (parentId) q = q.eq('parent_id', parentId);
  else q = q.is('parent_id', null);
  const { data } = await q;
  const top = data && data[0] ? Number(data[0].sort_order) || 0 : 0;
  return top + 10;
}

async function ensureNutriFolder(supabase, userId, folders, title, parentId, reuse) {
  if (reuse) {
    const existing = findFolderByTitle(folders, title, parentId);
    if (existing) return existing.id;
  }
  const sortOrder = await nextFolderSortOrder(supabase, parentId);
  const { data, error } = await supabase
    .from('plan_pro_nutri_folders')
    .insert({
      owner_id: userId,
      parent_id: parentId || null,
      title: String(title).trim(),
      sort_order: sortOrder
    })
    .select('id,title')
    .single();
  if (error) throw new Error('Crear carpeta «' + title + '»: ' + error.message);
  folders.push({ id: data.id, title: data.title, parent_id: parentId || null, sort_order: sortOrder });
  return data.id;
}

async function nextFileSortOrder(supabase, folderId) {
  const { data } = await supabase
    .from('plan_pro_nutri_files')
    .select('sort_order')
    .eq('folder_id', folderId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const top = data && data[0] ? Number(data[0].sort_order) || 0 : 0;
  return top + 10;
}

async function existingNamesInFolder(supabase, folderId) {
  const { data, error } = await supabase
    .from('plan_pro_nutri_files')
    .select('original_name')
    .eq('folder_id', folderId);
  if (error) throw new Error('Listar archivos: ' + error.message);
  const set = new Set();
  (data || []).forEach((r) => {
    if (r.original_name) set.add(r.original_name);
  });
  return set;
}

async function uploadOneFile(supabase, userId, folderId, fileRec, sortOrder) {
  const rawName = fileRec.name;
  const safeName = sanitizeStorageFilename(rawName);
  const fileId = randomUUID();
  const folderSeg = folderId || 'root';
  const path = userId + '/' + folderSeg + '/' + fileId + '/' + safeName;
  const buffer = readFileSync(fileRec.absPath);

  const { error: upErr } = await supabase.storage.from(NP_BUCKET).upload(path, buffer, {
    contentType: mimeFor(rawName),
    upsert: false,
    cacheControl: '3600'
  });
  if (upErr) throw new Error(upErr.message || 'Storage upload failed');

  const title = rawName.replace(/\.[^.]+$/, '') || rawName;
  const { error: insErr } = await supabase.from('plan_pro_nutri_files').insert({
    id: fileId,
    owner_id: userId,
    folder_id: folderId,
    title,
    original_name: rawName,
    storage_path: path,
    mime_type: mimeFor(rawName),
    size_bytes: fileRec.size || buffer.length,
    sort_order: sortOrder
  });
  if (insErr) {
    await supabase.storage.from(NP_BUCKET).remove([path]).catch(() => {});
    throw new Error(insErr.message || 'DB insert failed');
  }
  return { fileId, safeName, rawName };
}

async function runPool(items, concurrency, worker) {
  let idx = 0;
  const results = [];
  async function runner() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runner()));
  return results;
}

async function uploadFolderTree(supabase, userId, folders, localDir, nutriFolderId, opts, state) {
  const files = listLocalFiles(localDir, false);
  const existing = opts.skipExisting ? await existingNamesInFolder(supabase, nutriFolderId) : new Set();
  let sortOrder = await nextFileSortOrder(supabase, nutriFolderId);

  const queue = [];
  for (const f of files) {
    const key = f.relPath;
    if (opts.resume && state.uploaded[key]) continue;
    if (opts.skipExisting && existing.has(f.name)) {
      console.log('  ↷ ya en nube:', f.name);
      state.uploaded[key] = { skipped: true, at: new Date().toISOString() };
      continue;
    }
    queue.push(f);
  }

  if (!queue.length) {
    console.log('  (sin archivos nuevos en esta carpeta)');
    return { ok: 0, fail: 0 };
  }

  console.log('  → subiendo', queue.length, 'archivo(s)…');

  if (opts.dryRun) {
    queue.forEach((f) => console.log('    [dry-run]', f.name, '(' + f.size + ' bytes)'));
    return { ok: queue.length, fail: 0 };
  }

  let ok = 0;
  let fail = 0;
  let order = sortOrder;

  await runPool(queue, opts.concurrency, async (file) => {
    const myOrder = order;
    order += 10;
    try {
      const res = await uploadOneFile(supabase, userId, nutriFolderId, file, myOrder);
      state.uploaded[file.relPath] = { fileId: res.fileId, at: new Date().toISOString() };
      saveState(opts.dir, state);
      ok += 1;
      console.log('  ✓', file.name);
      return res;
    } catch (e) {
      fail += 1;
      console.error('  ✗', file.name, '—', e.message || e);
      return null;
    }
  });

  return { ok, fail };
}

async function uploadRecursive(supabase, userId, folders, localDir, parentNutriId, opts, state) {
  const folderTitle = basename(localDir);
  const nutriId = await ensureNutriFolder(supabase, userId, folders, folderTitle, parentNutriId, opts.reuseFolder);
  console.log('\n📁', folderTitle, '→ Nutri PRO', nutriId);

  const stats = await uploadFolderTree(supabase, userId, folders, localDir, nutriId, opts, state);

  const entries = readdirSync(localDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith('.') || SKIP_NAMES.test(ent.name)) continue;
    await uploadRecursive(supabase, userId, folders, join(localDir, ent.name), nutriId, opts, state);
  }
  return stats;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.dir) {
    console.error('Indica --dir "/ruta/a/tu/carpeta"');
    process.exit(1);
  }
  const localDir = opts.dir.replace(/\/$/, '');
  if (!existsSync(localDir) || !statSync(localDir).isDirectory()) {
    console.error('No es una carpeta válida:', localDir);
    process.exit(1);
  }

  const folderTitle = opts.title || basename(localDir);
  const cfg = loadSupabaseConfig();
  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: true }
  });

  console.log('Nutri PRO bulk upload');
  console.log('  Local:', localDir);
  console.log('  Título Nutri PRO:', folderTitle);
  if (opts.dryRun) console.log('  Modo: dry-run (no sube nada)');

  const userId = await signIn(supabase);
  await assertAdmin(supabase, userId);
  console.log('  Sesión OK · admin', userId.slice(0, 8) + '…');

  let folders = await fetchAllFolders(supabase);
  const parentId = await resolveParentId(supabase, folders, opts);
  if (parentId) {
    const p = folders.find((f) => f.id === parentId);
    console.log('  Carpeta padre:', p ? p.title : parentId);
  }

  const state = opts.resume ? loadState(localDir) : { uploaded: {}, folderId: null };
  let totalOk = 0;
  let totalFail = 0;

  if (opts.recursive) {
    console.log('  Modo recursivo: subcarpetas locales → subcarpetas Nutri PRO');
    const rootNutriId = await ensureNutriFolder(
      supabase,
      userId,
      folders,
      folderTitle,
      parentId,
      opts.reuseFolder
    );
    state.folderId = rootNutriId;
    if (!opts.dryRun) saveState(localDir, state);

    const subdirs = readdirSync(localDir, { withFileTypes: true }).filter(
      (e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP_NAMES.test(e.name)
    );
    if (subdirs.length) {
      for (const sub of subdirs) {
        const st = await uploadRecursive(
          supabase,
          userId,
          folders,
          join(localDir, sub.name),
          rootNutriId,
          { ...opts, dir: localDir },
          state
        );
        totalOk += st.ok;
        totalFail += st.fail;
      }
      const rootFiles = listLocalFiles(localDir, false);
      if (rootFiles.length) {
        console.log('\n📁 archivos sueltos en raíz de', folderTitle);
        const st = await uploadFolderTree(supabase, userId, folders, localDir, rootNutriId, opts, state);
        totalOk += st.ok;
        totalFail += st.fail;
      }
    } else {
      const st = await uploadFolderTree(supabase, userId, folders, localDir, rootNutriId, opts, state);
      totalOk += st.ok;
      totalFail += st.fail;
    }
  } else {
    let nutriFolderId = state.folderId;
    if (!nutriFolderId) {
      if (opts.reuseFolder) {
        const existing = findFolderByTitle(folders, folderTitle, parentId);
        if (existing) nutriFolderId = existing.id;
      }
      if (!nutriFolderId && !opts.dryRun) {
        nutriFolderId = await ensureNutriFolder(
          supabase,
          userId,
          folders,
          folderTitle,
          parentId,
          false
        );
        state.folderId = nutriFolderId;
        saveState(localDir, state);
      }
    }
    if (nutriFolderId) console.log('  Carpeta Nutri PRO:', nutriFolderId);
    else if (opts.dryRun) console.log('  [dry-run] crearía carpeta «' + folderTitle + '»');

    const dryParentId = nutriFolderId || randomUUID();
    const st = await uploadFolderTree(
      supabase,
      userId,
      folders,
      localDir,
      dryParentId,
      opts,
      state
    );
    totalOk += st.ok;
    totalFail += st.fail;
  }

  if (!opts.dryRun) saveState(localDir, state);

  console.log('\nListo:', totalOk, 'subido(s),', totalFail, 'error(es).');
  console.log('Revisa Plan PRO → Nutri PRO. Indexación: usa «Reindexar texto» / «OCR» en la app cuando quieras.');
  if (totalFail) process.exit(1);
}

main().catch((e) => {
  console.error('\nError:', e.message || e);
  process.exit(1);
});
