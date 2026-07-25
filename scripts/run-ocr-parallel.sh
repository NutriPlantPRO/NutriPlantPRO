#!/bin/bash
set -euo pipefail
ROOT="/Users/jesusavila/Desktop/MI PROYECTO"
cd "$ROOT"

# stop previous efficient OCR
pkill -f "nutri-pro-ocr-efficient.mjs" 2>/dev/null || true
sleep 1

node -e 'require("fs").writeFileSync("scripts/nutri-pro-ocr-efficient-state.json", JSON.stringify({done:{}},null,2))'

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "Falta OPENAI_API_KEY"
  exit 1
fi
export NUTRI_PRO_BULK_EMAIL="${NUTRI_PRO_BULK_EMAIL:?}"
export NUTRI_PRO_BULK_PASSWORD="${NUTRI_PRO_BULK_PASSWORD:?}"
export OPENAI_ADMIN_MODEL="${OPENAI_ADMIN_MODEL:-gpt-5.6-sol}"

NAMES=(
  "Copia de Fertilizantes_ quimica y accion  (3) (2)_protected.pdf"
  "Copia de Microorganismos del suelo_nodrm_protected.pdf"
  "Copia de La Savia como indice de fertili - Carlos Cadahia (2) (1) (2)_protected.pdf"
  "Copia de Manual practico de Fertirrigaci - Eduardo Jesus Fernandez Rodrigu (1) (1)_protected.pdf"
  "Copia de Fertirrigacion - Desconocido (3) (1)_protected.pdf"
  "Copia de El suelo y su fertilidad (1)_protected.pdf"
)

i=0
for N in "${NAMES[@]}"; do
  i=$((i+1))
  LOG="scripts/nutri-pro-ocr-par-$i.log"
  echo "Lanzando $i: $N"
  nohup node scripts/nutri-pro-ocr-efficient.mjs --only "$N" >"$LOG" 2>&1 &
  echo "  pid $! → $LOG"
  sleep 0.2
done

echo "OK: 6 jobs en paralelo"
sleep 5
ps -ax -o pid=,command= | grep "nutri-pro-ocr-efficient.mjs" | grep -v grep || true
for i in 1 2 3 4 5 6; do
  echo "---- par-$i ----"
  tail -n 5 "scripts/nutri-pro-ocr-par-$i.log" 2>/dev/null || echo "(sin log)"
done
