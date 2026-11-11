#!/bin/bash
# Compila Muninn e instala la nueva versión en /Applications.
#
# Uso:  npm run instalar
#
# Los datos NO se tocan: viven en
#   ~/Library/Application Support/com.aurhabits.desktop/
# y cada versión nueva abre la misma base. Aun así, antes de instalar se
# guarda una copia de la base en la subcarpeta backups/.
# La versión que estaba instalada (y cualquier copia antigua con el nombre
# anterior, Aurhabits) va a la Papelera: así en Aplicaciones y en Spotlight
# solo aparece Muninn, y aún se puede recuperar hasta vaciar la Papelera.
# Las copias de compilaciones antiguas dentro de target/ se borran.

set -euo pipefail

cd "$(dirname "$0")/.."

APP_NAME="Muninn"
PROCESS_NAME="muninn"
OLD_APP="/Applications/Aurhabits.app"
OLD_PROCESS="aurhabits"
# Restos de instalaciones anteriores que no deben quedarse en Aplicaciones.
LEFTOVERS=(
  "/Applications/Aurhabits.app"
  "/Applications/Aurhabits-anterior.app"
  "/Applications/Muninn-anterior.app"
)
BUNDLE="src-tauri/target/release/bundle/macos/${APP_NAME}.app"
DEST="/Applications/${APP_NAME}.app"
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

if [ -d "${OLD_APP}" ]; then
  echo "    Cerrando la app antigua Aurhabits…"
  osascript -e 'tell application "Aurhabits" to quit' >/dev/null 2>&1 || true
  for _ in $(seq 1 20); do
    pgrep -x "${OLD_PROCESS}" >/dev/null || break
    sleep 0.5
  done
  if pgrep -x "${OLD_PROCESS}" >/dev/null; then
    echo "Aurhabits sigue abierta. Ciérrala y vuelve a ejecutar. No se instaló nada." >&2
    exit 1
  fi
fi

echo "3/4 Copiando la base de datos…"
if [ -f "${DATABASE}" ]; then
  mkdir -p "${DATA_DIR}/backups"
  STAMP="$(date +%Y-%m-%d-%H%M%S)"
  COPY="${DATA_DIR}/backups/aurhabits-antes-de-instalar-${STAMP}.db"
  if command -v sqlite3 >/dev/null 2>&1 && sqlite3 "${DATABASE}" ".backup '${COPY}'" 2>/dev/null; then
    :
  else
    # Sin sqlite3: copia directa. Si quedaron archivos -wal/-shm (la base usa
    # modo WAL) se copian también, porque pueden contener lo último escrito.
    cp -p "${DATABASE}" "${COPY}"
    for suffix in -wal -shm; do
      if [ -f "${DATABASE}${suffix}" ]; then
        cp -p "${DATABASE}${suffix}" "${COPY}${suffix}"
      fi
    done
  fi
  echo "    Copia: ${COPY}"
else
  echo "    Aún no hay base de datos; nada que copiar."
fi

# Mueve una app a la Papelera (recuperable). Si la terminal no tiene permiso
# para mover apps de Aplicaciones, lo intenta a través de Finder.
to_trash() {
  local app="$1"
  local name
  name="$(basename "${app}" .app)-$(date +%Y%m%d-%H%M%S).app"
  if mv "${app}" "${HOME}/.Trash/${name}" 2>/dev/null; then
    return 0
  fi
  osascript -e "tell application \"Finder\" to delete (POSIX file \"${app}\")" >/dev/null 2>&1
}

echo "4/4 Instalando en /Applications…"
for app in "${LEFTOVERS[@]}" "${DEST}"; do
  if [ -d "${app}" ]; then
    if to_trash "${app}"; then
      echo "    A la Papelera: ${app}"
    else
      echo "No se pudo mover ${app} a la Papelera (permiso de macOS)." >&2
      echo "Muévela tú a la Papelera y vuelve a ejecutar. No se instaló nada." >&2
      exit 1
    fi
  fi
done
ditto "${BUNDLE}" "${DEST}"
# La copia compilada dentro de target/ ya no hace falta y Spotlight la
# mostraría como un segundo Muninn. La próxima compilación la vuelve a crear.
rm -rf "${BUNDLE}"

# Compilaciones antiguas con otro nombre dentro de target/: Spotlight las
# indexa como apps, así que se borran (son artefactos de compilación).
for stale in src-tauri/target/release/bundle/macos/*.app; do
  if [ "${stale}" != "${BUNDLE}" ] && [ -d "${stale}" ]; then
    rm -rf "${stale}"
  fi
done

echo "Listo. Abriendo ${APP_NAME}…"
open "${DEST}"
