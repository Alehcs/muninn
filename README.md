<p align="center">
  <img src="assets/brand/muninn-icon.svg" alt="Logotipo de Muninn: un cuervo sobre la luna" width="140">
</p>

<h1 align="center">Muninn</h1>

Muninn es una app de escritorio personal, local y sin conexión, para organizar el día. Todo vive en una base SQLite en tu equipo; no hay backend ni sincronización remota.

El nombre viene de Muninn («Memoria»), uno de los dos cuervos de Odín. Antes se llamaba Aurhabits.

## Qué incluye

- **Hoy**: hábitos del día, tareas de hoy y páginas fijadas o recientes.
- **Páginas**: documentos con editor Markdown, anidables (subpáginas), con iconos, categorías, papelera y guardado automático.
- **Colecciones**: páginas especiales con forma de tabla; cada fila es una subpágina con columnas propias (texto, número, selección, casilla, fecha, enlace), orden, filtro y plantilla de libros.
- **Tareas**: con fecha, prioridad, página enlazada, vistas Pendientes / Hoy / Próximas / Completadas y orden manual.
- **Listas**: listas con secciones e items (tipo, enlace, descripción, notas) que se reordenan arrastrando.
- **Hábitos**: registro diario, calendario, historial y estadísticas con rachas; timers para hábitos de duración.
- **Enfoque**: temporizador Pomodoro.
- **Búsqueda global** (`Cmd/Ctrl+K`): páginas, tareas, items de listas y hábitos, sin distinguir mayúsculas ni tildes.

## Stack

Tauri 2 (Rust) · React 19 · TypeScript · Tailwind CSS 4 · SQLite (`@tauri-apps/plugin-sql`).

## Atajos de teclado

| Atajo | Acción |
| --- | --- |
| `Cmd/Ctrl+K` | Búsqueda global y acciones rápidas |
| `Cmd/Ctrl+1…6` | Hoy, Páginas, Tareas, Listas, Hábitos, Enfoque |
| `Cmd/Ctrl+,` | Configuración |
| `Cmd/Ctrl+N` | Acción principal de la vista (nueva página, tarea…; en una colección, foco en «Nuevo elemento…») |

## Datos, copias y backups

- La base está en el directorio de datos de la app (`com.aurhabits.desktop`; ver nota sobre el identificador más abajo):
  - macOS: `~/Library/Application Support/com.aurhabits.desktop/aurhabits.db`
  - Windows: `%APPDATA%/com.aurhabits.desktop/aurhabits.db`
  - Linux: `~/.local/share/com.aurhabits.desktop/aurhabits.db`
- **Nota sobre el identificador**: la app se renombró de Aurhabits a Muninn, pero el `identifier` de `src-tauri/tauri.conf.json` sigue siendo `com.aurhabits.desktop` a propósito. Tauri deriva de él la carpeta de datos; cambiarlo haría que la app arrancara vacía y sin preferencias. Por la misma razón se mantienen los nombres `aurhabits.db` / `aurhabits-dev.db`, el patrón de las copias de `backups/` y las claves `aurhabits.*` de `localStorage`. Los backups JSON antiguos (`app: "Aurhabits"`) se siguen importando; los nuevos escriben `"Muninn"`.
- En desarrollo (`npm run tauri dev`) se usa `aurhabits-dev.db` en el mismo directorio, y la barra lateral muestra `DEV`. Tus datos reales no se tocan.
- **Copias automáticas**: una al día, otra antes de migrar la base y otra antes de importar un backup, en la subcarpeta `backups/` (se podan solas). Configuración las lista y abre la carpeta. Para restaurar una, cierra la app y sustituye el archivo de la base por la copia.
- **Backup JSON** (Configuración): exporta e importa todos los datos, incluidos los registros diarios de hábitos. Se pueden importar backups antiguos (v1 solo hábitos; v2 sin páginas).
- **Exportar a Markdown** (Configuración › «Exportar todo…»): eliges una carpeta y dentro se crea `Muninn-export-<fecha-hora>/` (nunca sobrescribe) con `Páginas/` (subpáginas en carpetas; colecciones con `_Índice.md` y una tabla, más un `.md` por fila), `Tareas.md`, `Listas/` y `Habitos.md`. La papelera no se exporta. Cada página también tiene «Exportar como Markdown…» en su menú ⋯. Es una vía de salida legible; para restaurar usa el backup JSON.

## Desarrollo

```bash
npm install
npm run tauri dev     # app de escritorio con recarga en caliente
npm run dev           # solo el frontend, en http://localhost:1420
```

`npm run dev` funciona en un navegador normal con SQLite **en memoria** (sql.js): nada se guarda al recargar. Con `?seed=/ruta/archivo.db` se parte de una copia de ese archivo servido por Vite (solo lectura). El modo navegador no existe en producción.

### Autoprueba de datos (solo desarrollo)

Comprueba el camino real de datos (páginas, colecciones, tareas, listas, transacciones, papelera, backup, copias) y deja la base como estaba. Se ejecuta una vez al cargar si la URL lleva `?selftest=1`, muestra un panel con el resultado y lo guarda en `app_metadata` (clave `selftest_result`).

- Navegador: abre `http://localhost:1420/?selftest=1` (los pasos de copia se omiten).
- En la app de escritorio, usando la base de desarrollo (macOS/Linux):

```bash
npm run tauri dev -- --config '{"build":{"devUrl":"http://localhost:1420/?selftest=1"}}'
```

`--config` acepta un JSON que se fusiona con `tauri.conf.json`. El código de la autoprueba no entra en el build de producción.

## Tests

```bash
npm test                 # Vitest (lógica, repositorios sobre sql.js, búsqueda, exportación)
cd src-tauri && cargo test
```

## Build e instalación

```bash
npm run build            # tsc + vite build
npm run tauri build      # instalable en src-tauri/target/release/bundle/
npm run instalar         # compila e instala en /Applications (macOS), con copia previa de la base
```

## Iconos

Los iconos son placeholders referenciados desde `src-tauri/tauri.conf.json` (`src-tauri/icons/32x32.png`, `128x128.png`, `128x128@2x.png`). Mantener los nombres permite cambiarlos sin tocar la configuración.
