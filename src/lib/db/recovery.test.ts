import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestDatabase } from "@/test/testDatabase";
import { CURRENT_SCHEMA_VERSION, runMigrations } from "./migrations";
import type { SqlDatabase } from "./types";

// Copias de la base real del usuario (no se versionan). Solo se leen los bytes
// y se cargan EN MEMORIA; nunca se escribe en el archivo ni se muestran filas.
const RECOVERY_DIR = join(process.cwd(), "recovery");
const files = existsSync(RECOVERY_DIR)
  ? readdirSync(RECOVERY_DIR).filter((name) => name.endsWith(".db"))
  : [];

async function rowCounts(db: SqlDatabase): Promise<Record<string, number>> {
  const tables = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const counts: Record<string, number> = {};
  for (const { name } of tables) {
    const rows = await db.select<{ n: number }[]>(`SELECT COUNT(*) AS n FROM "${name}"`);
    counts[name] = rows[0].n;
  }
  return counts;
}

describe.skipIf(files.length === 0)("migraciones sobre copias reales (en memoria)", () => {
  it.each(files)("%s conserva los conteos de filas", async (file) => {
    const bytes = new Uint8Array(readFileSync(join(RECOVERY_DIR, file)));
    const { db } = await createTestDatabase(bytes);

    const before = await rowCounts(db);
    await runMigrations(db);
    const after = await rowCounts(db);

    // Tablas que ya existían: mismos conteos. Las nuevas pueden aparecer vacías.
    for (const [table, count] of Object.entries(before)) {
      expect(after[table], `tabla ${table}`).toBe(count);
    }
    const version = await db.select<{ user_version: number }[]>("PRAGMA user_version");
    expect(version[0].user_version).toBe(CURRENT_SCHEMA_VERSION);
  });
});
