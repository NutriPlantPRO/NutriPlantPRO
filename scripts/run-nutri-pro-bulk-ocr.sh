#!/bin/bash
# Lanza OCR/IA Sol en lote. Credenciales por env (no hardcodear aquí).
set -euo pipefail
cd "$(dirname "$0")/.."
LOG="scripts/nutri-pro-bulk-ocr.log"
if [[ -z "${NUTRI_PRO_BULK_EMAIL:-}" || -z "${NUTRI_PRO_BULK_PASSWORD:-}" ]]; then
  echo "Define NUTRI_PRO_BULK_EMAIL y NUTRI_PRO_BULK_PASSWORD"
  exit 1
fi
echo "=== OCR/IA Sol $(date) ===" | tee -a "$LOG"
node scripts/nutri-pro-bulk-ocr.mjs --pdf-only 2>&1 | tee -a "$LOG"
echo "=== FIN $(date) exit:$? ===" | tee -a "$LOG"
