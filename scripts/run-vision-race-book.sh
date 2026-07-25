#!/bin/bash
# Vision gratis vs Sol: si Vision gana en texto, mata Sol de ESE libro.
# Uso: BOOK_NAME='...' SHORT='manual' bash scripts/run-vision-race-book.sh
set -euo pipefail
ROOT="/Users/jesusavila/Desktop/MI PROYECTO"
cd "$ROOT"
NAME="${BOOK_NAME:?}"
SHORT="${SHORT:?}"
WORKDIR="/tmp/nutri-vision-$SHORT"
mkdir -p "$WORKDIR/batches"
LOG="scripts/nutri-pro-ocr-vision-$SHORT.log"
ACC="$WORKDIR/all.txt"
: >"$LOG"
: >"$ACC"
export NUTRI_PRO_BULK_EMAIL="${NUTRI_PRO_BULK_EMAIL:?}"
export NUTRI_PRO_BULK_PASSWORD="${NUTRI_PRO_BULK_PASSWORD:?}"
export BOOK_NAME NAME SHORT WORKDIR

echo "=== Vision race $SHORT $(date) ===" | tee -a "$LOG"
echo "book: $NAME" | tee -a "$LOG"

node <<'NODE'
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
const work = process.env.WORKDIR;
const name = process.env.BOOK_NAME;
const raw = readFileSync('supabase-config.js', 'utf8');
const url = raw.match(/url:\s*['"]([^'"]+)['"]/)[1];
const anonKey = raw.match(/anonKey:\s*['"]([^'"]+)['"]/)[1];
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({
  email: process.env.NUTRI_PRO_BULK_EMAIL,
  password: process.env.NUTRI_PRO_BULK_PASSWORD
});
const { data: f } = await supabase
  .from('plan_pro_nutri_files')
  .select('*')
  .eq('original_name', name)
  .maybeSingle();
if (!f) {
  console.error('no file');
  process.exit(2);
}
writeFileSync(work + '/meta.json', JSON.stringify({ id: f.id, owner: f.owner_id, name }));
const dec = work + '/dec.pdf';
if (!existsSync(dec)) {
  const { data: blob } = await supabase.storage.from('plan-pro-nutri-pro').download(f.storage_path);
  const enc = work + '/enc.pdf';
  writeFileSync(enc, Buffer.from(await blob.arrayBuffer()));
  let ok = false;
  for (const pwd of ['agricolavalleesperanza', 'jesuschuzzavila@gmail.com']) {
    const py = `
from pypdf import PdfReader, PdfWriter
r=PdfReader(${JSON.stringify(enc)})
if r.is_encrypted and r.decrypt(${JSON.stringify(pwd)})==0: raise SystemExit(2)
w=PdfWriter()
for p in r.pages: w.add_page(p)
with open(${JSON.stringify(dec)},'wb') as out: w.write(out)
print(len(r.pages))
`;
    const rr = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
    if (rr.status === 0) {
      console.log('decrypt OK', rr.stdout.trim());
      ok = true;
      break;
    }
  }
  if (!ok) process.exit(3);
} else {
  const rr = spawnSync(
    'python3',
    ['-c', `from pypdf import PdfReader; print(len(PdfReader(${JSON.stringify(dec)}).pages))`],
    { encoding: 'utf8' }
  );
  console.log('decrypt exists', rr.stdout.trim());
}
NODE

TOTAL=$(python3 -c "from pypdf import PdfReader; print(len(PdfReader('$WORKDIR/dec.pdf').pages))")
BATCH=20
echo "págs totales=$TOTAL" | tee -a "$LOG"

for ((from = 1; from <= TOTAL; from += BATCH)); do
  to=$((from + BATCH - 1))
  if ((to > TOTAL)); then to=$TOTAL; fi
  part="$WORKDIR/batches/b-$from-$to.txt"
  echo "[Vision/$SHORT] págs $from-$to …" | tee -a "$LOG"
  swift scripts/mac-vision-ocr.swift "$WORKDIR/dec.pdf" "$part" "$from" "$to" >>"$LOG" 2>&1 || true
  {
    echo "## Páginas $from-$to (Vision)"
    echo
    cat "$part" 2>/dev/null || true
    echo
    echo "---"
    echo
  } >>"$ACC"

  EVAL=$(
    WORKDIR="$WORKDIR" TO_PAGE="$to" TOTAL="$TOTAL" SHORT="$SHORT" NAME="$NAME" node <<'NODE'
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
const work = process.env.WORKDIR;
const meta = JSON.parse(readFileSync(work + '/meta.json', 'utf8'));
const vision = readFileSync(work + '/all.txt', 'utf8');
const visLen = vision.length;
const toPage = Number(process.env.TO_PAGE);
const total = Number(process.env.TOTAL);
const raw = readFileSync('supabase-config.js', 'utf8');
const url = raw.match(/url:\s*['"]([^'"]+)['"]/)[1];
const anonKey = raw.match(/anonKey:\s*['"]([^'"]+)['"]/)[1];
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({
  email: process.env.NUTRI_PRO_BULK_EMAIL,
  password: process.env.NUTRI_PRO_BULK_PASSWORD
});
const { data: cur } = await supabase
  .from('plan_pro_nutri_file_extracts')
  .select('text_plain')
  .eq('file_id', meta.id)
  .maybeSingle();
const solLen = (cur?.text_plain || '').length;
const beat = visLen > Math.max(solLen * 1.2, 25000);
const done = toPage >= total;
if (beat || (done && visLen > solLen)) {
  await supabase.from('plan_pro_nutri_file_extracts').upsert(
    {
      file_id: meta.id,
      owner_id: meta.owner,
      status: done ? 'done' : 'processing',
      format_kind: 'ocr_pdf',
      text_plain: vision,
      meta_json: {
        char_count: visLen,
        pages_done: toPage,
        pages_total: total,
        via: 'macos_vision_race_win',
        sol_chars: solLen
      },
      error_message: null,
      extracted_at: new Date().toISOString()
    },
    { onConflict: 'file_id' }
  );
  console.log(`BEAT ${visLen} ${solLen}`);
  if (beat) {
    spawnSync('pkill', ['-f', 'nutri-pro-ocr-efficient.mjs --only ' + process.env.NAME], { encoding: 'utf8' });
  }
} else {
  console.log(`KEEP ${visLen} ${solLen}`);
}
if (toPage >= 40 && visLen < 8000) {
  console.log('ABORT_BAD_VISION');
}
NODE
  )

  echo "$EVAL" | tee -a "$LOG"
  if echo "$EVAL" | grep -q ABORT_BAD_VISION; then
    echo "Vision no sirve en $SHORT → dejo Sol" | tee -a "$LOG"
    exit 0
  fi
  if echo "$EVAL" | grep -q '^BEAT '; then
    echo "Sol parado para $SHORT; Vision sigue hasta el final" | tee -a "$LOG"
  fi
done

echo "=== Vision $SHORT FIN $(date) ===" | tee -a "$LOG"
