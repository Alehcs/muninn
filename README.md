# Aurhabits

Aurhabits es una app desktop local para registrar habitos diarios, revisar progreso por fecha, ver estadisticas/rachas, usar calendario mensual, manejar timers para habitos de duracion y exportar/importar backups JSON.

La app esta pensada como una herramienta personal y funciona 100% local/offline. No usa backend externo ni sincronizacion remota.

## Stack

- Tauri 2
- React 19
- TypeScript
- Tailwind CSS 4
- SQLite local con `@tauri-apps/plugin-sql`

## Desarrollo

```bash
npm install
npm run tauri dev
```

Para levantar solo el frontend en Vite:

```bash
npm run dev
```

## Build

```bash
npm run build
npm run tauri build
```

El build instalable queda en `src-tauri/target/release/bundle/`.

## Datos locales

La base SQLite se abre como `sqlite:aurhabits.db` desde el plugin SQL de Tauri. En una instalacion normal, Tauri la ubica dentro del directorio de datos/configuracion de la app para el identificador `com.aurhabits.desktop`.

Ubicaciones aproximadas:

- macOS: `~/Library/Application Support/com.aurhabits.desktop/aurhabits.db`
- Windows: `%APPDATA%/com.aurhabits.desktop/aurhabits.db`
- Linux: `~/.local/share/com.aurhabits.desktop/aurhabits.db`

En desarrollo (`npm run tauri dev`) la app usa un archivo aparte, `aurhabits-dev.db`, en ese mismo directorio. Asi los datos reales de la app instalada no se tocan mientras se programa; la barra lateral muestra la etiqueta `DEV` para distinguirlo.

Los backups se exportan/importan manualmente como JSON desde la vista Configuracion. Incluyen todos los datos: habitos, registros, notas, tareas y roadmaps. Los backups antiguos (version 1, solo habitos y registros) se siguen pudiendo importar y no modifican el resto de los datos.

## Iconos

Los iconos actuales son placeholders y estan referenciados desde `src-tauri/tauri.conf.json`.

Para reemplazarlos, actualiza los archivos en:

- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`

Mantener esos nombres permite cambiar el icono sin tocar la configuracion de Tauri.
