import Database from "@tauri-apps/plugin-sql";
import { runMigrations } from "./migrations";

/**
 * Archivo SQLite local, ubicado en el directorio de datos de la app.
 * En desarrollo (`npm run tauri dev`) se usa un archivo aparte para que
 * programar y probar nunca toque los datos reales de la app instalada.
 */
const DATABASE_URL = import.meta.env.DEV
  ? "sqlite:aurhabits-dev.db"
  : "sqlite:aurhabits.db";

let connection: Promise<Database> | null = null;

/**
 * Devuelve la conexión SQLite única.
 * La primera llamada abre la base de datos y ejecuta las migraciones.
 */
export function getDatabase(): Promise<Database> {
  if (connection === null) {
    connection = (async () => {
      const db = await Database.load(DATABASE_URL);
      await runMigrations(db);
      return db;
    })();
  }
  return connection;
}
