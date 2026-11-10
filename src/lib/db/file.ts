/**
 * Archivo SQLite local, ubicado en el directorio de datos de la app.
 * En desarrollo (`npm run tauri dev`) se usa un archivo aparte para que
 * programar y probar nunca toque los datos reales de la app instalada.
 * Los comandos de Rust solo aceptan estos dos nombres.
 */
export const DATABASE_FILE = import.meta.env.DEV
  ? "aurhabits-dev.db"
  : "aurhabits.db";
