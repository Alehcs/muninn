#!/bin/bash
# Compila Aurhabits e instala la nueva versión en /Applications.
#
# Uso:  npm run instalar
#
# Los datos NO se tocan: viven en
#   ~/Library/Application Support/com.aurhabits.desktop/
# y cada versión nueva abre la misma base. Aun así, antes de instalar se
# guarda una copia de la base en la subcarpeta backups/.
# La versión que estaba instalada se conserva como "Aurhabits-anterior.app"
# (solo la última) por si hay que volver atrás.

set -euo pipefail

cd "$(dirname "$0")/.."

APP_NAME="Aurhabits"
PROCESS_NAME="aurhabits"
BUNDLE="src-tauri/target/release/bundle/macos/${APP_NAME}.app"
DEST="/Applications/${APP_NAME}.app"
PREVIOUS="/Applications/${APP_NAME}-anterior.app"
DATA_DIR="${HOME}/Library/Application Support/com.aurhabits.desktop"
DATABASE="${DATA_DIR}/aurhabits.db"

echo "1/4 Compilando…"
npm run tauri build -- --bundles app

if [ ! -d "${BUNDLE}" ]; then
  echo "No se generó ${BUNDLE}. No se instaló nada." >&2
  exit 1
fi

echo "2/4 Cerrando ${APP_NAME} si está abierta…"
osascript -e "tell application \"${APP_NAME}\" to quit" >/dev/null 2>&1 || true
for _ in $(seq 1 20); do
  pgrep -x "${PROCESS_NAME}" >/dev/null || break
  sleep 0.5
done
if pgrep -x "${PROCESS_NAME}" >/dev/null; then
  echo "${APP_NAME} sigue abierta. Ciérrala y vuelve a ejecutar. No se instaló nada." >&2
  exit 1
fi

echo "3/4 Copiando la base de datos…"
if [ -f "${DATABASE}" ]; then
  mkdir -p "${DATA_DIR}/backups"
  STAMP="$(date +%Y-%m-%d-%H%M%S)"
  COPY="${DATA_DIR}/backups/aurhabits-antes-de-instalar-${STAMP}.db"
  if command -v sqlite3 >/dev/null 2>&1 && sqlite3 "${DATABASE}" ".backup '${COPY}'" 2>/dev/null; then
    :
  else
    cp -p "${DATABASE}" "${COPY}"
  fi
  echo "    Copia: ${COPY}"
else
  echo "    Aún no hay base de datos; nada que copiar."
fi

echo "4/4 Instalando en /Applications…"
if [ -d "${DEST}" ]; then
  if [ -d "${PREVIOUS}" ]; then
    rm -rf "${PREVIOUS}"
  fi
  mv "${DEST}" "${PREVIOUS}"
fi
ditto "${BUNDLE}" "${DEST}"

echo "Listo. Abriendo ${APP_NAME}…"
open "${DEST}"
