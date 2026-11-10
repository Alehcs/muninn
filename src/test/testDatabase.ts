import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import type { SqlDatabase } from "@/lib/db/types";
import { createSqlJsDatabase } from "@/lib/platform/sqlJsAdapter";

export interface TestDatabase {
  db: SqlDatabase;
  raw: SqlJsDatabase;
}

/** Crea una base SQLite en memoria (opcionalmente desde los bytes de un archivo). */
export async function createTestDatabase(
  data?: Uint8Array,
): Promise<TestDatabase> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database(data);
  return { db: createSqlJsDatabase(raw), raw };
}
