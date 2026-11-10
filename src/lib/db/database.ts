import { openDatabase } from "@/lib/platform/sqlite";
import { DATABASE_FILE } from "./file";
import { runMigrations } from "./migrations";
import { createSnapshot, ensureDailySnapshot } from "./snapshots";
import type { SqlDatabase } from "./types";

export { DATABASE_FILE };

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
      await runMigrations(db, {
        // Sin copia previa no se migra: si esto falla, el error se propaga y
        // la app no arranca (mejor que migrar sin red).
        beforeMigrate: async (fromVersion) => {
          await createSnapshot(`pre-migracion-v${fromVersion}`);
        },
      });
      // Copia diaria (no bloquea la app si falla).
      await ensureDailySnapshot();
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
