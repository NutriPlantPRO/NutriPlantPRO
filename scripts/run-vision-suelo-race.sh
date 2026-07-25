#!/bin/bash
# Carrera OCR El suelo: Vision local (gratis) en lotes de 20 págs.
set -euo pipefail
ROOT="/Users/jesusavila/Desktop/MI PROYECTO"
PDF="/tmp/nutri-vision/suelo-dec.pdf"
OUTDIR="/tmp/nutri-vision/batches"
ACC="/tmp/nutri-vision/suelo-vision-all.txt"
LOG="$ROOT/scripts/nutri-pro-ocr-vision-suelo.log"
META="/tmp/nutri-vision/suelo-id.txt"
mkdir -p "$OUTDIR"
: > "$LOG"
: > "$ACC"

TOTAL=665
BATCH=20
START=1

echo "=== Vision OCR El suelo $(date) ===" | tee -a "$LOG"
echo "PDF=$PDF total=$TOTAL batch=$BATCH" | tee -a "$LOG"

for ((from=START; from<=TOTAL; from+=BATCH)); do
  to=$((from+BATCH-1))
  if (( to > TOTAL )); then to=$TOTAL; fi
  part="$OUTDIR/batch-$from-$to.txt"
  echo "[Vision] págs $from-$to …" | tee -a "$LOG"
  if ! swift "$ROOT/scripts/mac-vision-ocr.swift" "$PDF" "$part" "$from" "$to" >>"$LOG" 2>&1; then
    echo "ERROR batch $from-$to" | tee -a "$LOG"
    continue
  fi
  {
    echo "## Páginas $from-$to (Vision macOS)"
    echo
    cat "$part"
    echo
    echo "---"
    echo
  } >> "$ACC"
  chars=$(wc -c < "$ACC" | tr -d ' ')
  echo "[Vision] acumulado $chars car. (hasta pág $to)" | tee -a "$LOG"

  # Subir avance a Nutri PRO (gana si supera o completa)
  FILE_ID=$(sed -n '1p' "$META")
  OWNER_ID=$(sed -n '2p' "$META")
  export NUTRI_PRO_BULK_EMAIL="${NUTRI_PRO_BULK_EMAIL:-}"
  export NUTRI_PRO_BULK_PASSWORD="${NUTRI_PRO_BULK_PASSWORD:-}"
  if [[ -n "${NUTRI_PRO_BULK_EMAIL:-}" ]]; then
    node <<NODE
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const raw = readFileSync('$ROOT/supabase-config.js','utf8');
const url = raw.match(/url:\\s*['"]([^'"]+)['"]/)[1];
const anonKey = raw.match(/anonKey:\\s*['"]([^'"]+)['"]/)[1];
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({
  email: process.env.NUTRI_PRO_BULK_EMAIL,
  password: process.env.NUTRI_PRO_BULK_PASSWORD
});
const vision = readFileSync('$ACC','utf8');
const fileId = '$FILE_ID';
const ownerId = '$OWNER_ID';
const { data: cur } = await supabase.from('plan_pro_nutri_file_extracts').select('text_plain,meta_json').eq('file_id', fileId).maybeSingle();
const solLen = (cur?.text_plain || '').length;
const visLen = vision.length;
const toPage = $to;
const total = $TOTAL;
const useVision = visLen >= solLen || toPage >= total;
if (useVision) {
  await supabase.from('plan_pro_nutri_file_extracts').upsert({
    file_id: fileId,
    owner_id: ownerId,
    status: toPage >= total ? 'done' : 'processing',
    format_kind: 'ocr_pdf',
    text_plain: vision,
    meta_json: {
      char_count: visLen,
      pages_done: toPage,
      pages_total: total,
      via: 'macos_vision_race',
      sol_chars_at_update: solLen,
      beat_sol: visLen >= solLen
    },
    error_message: null,
    extracted_at: new Date().toISOString()
  }, { onConflict: 'file_id' });
  console.log('Nutri update Vision', visLen, 'car (Sol tenía', solLen, ') págs', toPage);
} else {
  console.log('Sol aún va adelante', solLen, '>', visLen, '— no piso');
}
NODE
  fi
done

echo "=== Vision FIN $(date) ===" | tee -a "$LOG"
