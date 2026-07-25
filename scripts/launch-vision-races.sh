#!/bin/bash
# Lanza carreras Vision vs Sol en Terminal.app (una ventana por libro).
# Si Vision gana en texto → mata Sol de ese libro. Si Vision falla → deja Sol.
set -euo pipefail
ROOT="/Users/jesusavila/Desktop/MI PROYECTO"
cd "$ROOT"
EMAIL="${NUTRI_PRO_BULK_EMAIL:?}"
PASS="${NUTRI_PRO_BULK_PASSWORD:?}"

# smoke: 1 página
swift scripts/mac-vision-ocr.swift /tmp/nutri-vision/suelo-dec.pdf /tmp/nutri-vision/smoke-fix.txt 50 50
CHARS=$(wc -c < /tmp/nutri-vision/smoke-fix.txt | tr -d ' ')
echo "smoke pág50: $CHARS car."
if (( CHARS < 500 )); then
  echo "Vision sigue mal — aborto lanzamiento"
  exit 1
fi

launch() {
  local SHORT="$1"
  local NAME="$2"
  local ENVF="/tmp/nutri-vision-env-$SHORT.sh"
  cat >"$ENVF" <<EOF
export NUTRI_PRO_BULK_EMAIL=$(printf %q "$EMAIL")
export NUTRI_PRO_BULK_PASSWORD=$(printf %q "$PASS")
export SHORT=$(printf %q "$SHORT")
export BOOK_NAME=$(printf %q "$NAME")
cd $(printf %q "$ROOT")
exec bash scripts/run-vision-race-book.sh
EOF
  osascript -e "tell application \"Terminal\" to do script \"bash $(printf %q "$ENVF")\""
  echo "lanzado: $SHORT"
  sleep 0.5
}

# Matar Vision viejo/malo si sigue
pkill -f "run-vision-suelo-race" 2>/dev/null || true
pkill -f "run-vision-race-book" 2>/dev/null || true
pkill -f "mac-vision-ocr.swift" 2>/dev/null || true
sleep 1

launch fert "Copia de Fertilizantes_ quimica y accion  (3) (2)_protected.pdf"
launch micro "Copia de Microorganismos del suelo_nodrm_protected.pdf"
launch savia "Copia de La Savia como indice de fertili - Carlos Cadahia (2) (1) (2)_protected.pdf"
launch manual "Copia de Manual practico de Fertirrigaci - Eduardo Jesus Fernandez Rodrigu (1) (1)_protected.pdf"
launch fertirrig "Copia de Fertirrigacion - Desconocido (3) (1)_protected.pdf"
launch suelo "Copia de El suelo y su fertilidad (1)_protected.pdf"

echo "OK: 6 carreras Vision lanzadas. Sol sigue hasta que Vision gane o Vision aborte."
