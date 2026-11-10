import { isTauri } from "@/lib/platform/env";
import { getDatabase } from "./database";
import { DATABASE_FILE } from "./file";

export interface BatchStatement {
  sql: string;
  params?: unknown[];
}

/**
 * Ejecuta varias sentencias como una única transacción atómica: o se aplican
 * todas o no se aplica ninguna.
 *
 * - Tauri: el comando `db_batch` de Rust abre su propia conexión y hace
 *   `BEGIN IMMEDIATE` / sentencias / `COMMIT`. No se puede hacer desde JS porque
 *   el plugin SQL reparte cada `execute` entre las conexiones de un pool.
 * - Fuera de Tauri (navegador de desarrollo y tests) hay una sola conexión
 *   sql.js, así que basta con `BEGIN` / `COMMIT` / `ROLLBACK` sobre ella.
 */
export async function runBatch(statements: BatchStatement[]): Promise<void> {
  if (statements.length === 0) return;

  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("db_batch", {
      file: DATABASE_FILE,
      statements: statements.map(({ sql, params }) => ({
        sql,
        params: (params ?? []).map((value) => value ?? null),
      })),
    });
    return;
  }

  const db = await getDatabase();
  await db.execute("BEGIN");
  try {
    for (const { sql, params } of statements) {
      await db.execute(sql, params);
    }
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
