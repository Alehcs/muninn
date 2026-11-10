import { openDatabase } from "@/lib/platform/sqlite";
import { runMigrations } from "./migrations";
import type { SqlDatabase } from "./types";

/**
 * Archivo SQLite local, ubicado en el directorio de datos de la app.
 * En desarrollo (`npm run tauri dev`) se usa un archivo aparte para que
 * programar y probar nunca toque los datos reales de la app instalada.
 */
export const DATABASE_FILE = import.meta.env.DEV
  ? "aurhabits-dev.db"
  : "aurhabits.db";

const DATABASE_URL = `sqlite:${DATABASE_FILE}`;

let connection: Promise<SqlDatabase> | null = null;

/**
 * Devuelve la conexión SQLite única.
 * La primera llamada abre la base de datos y ejecuta las migraciones.
 * Si abrir o migrar falla, la caché se limpia para que el siguiente intento
 * (p. ej. "Reintentar") vuelva a abrir en lugar de repetir el mismo error.
 */
export function getDatabase(): Promise<SqlDatabase> {
  if (connection === null) {
    const attempt = (async () => {
      const db = await openDatabase(DATABASE_URL);
      await runMigrations(db);
      return db;
    })();
    connection = attempt;
    attempt.catch(() => {
      if (connection === attempt) connection = null;
    });
  }
  return connection;
}

/** Inyecta una base de datos en tests (o `null` para restablecer). */
export function setDatabaseForTesting(db: SqlDatabase | null): void {
  connection = db === null ? null : Promise.resolve(db);
}
