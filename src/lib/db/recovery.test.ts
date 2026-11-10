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

  it.each(files)("%s: las tareas conservan su número y reciben las columnas nuevas", async (file) => {
    const bytes = new Uint8Array(readFileSync(join(RECOVERY_DIR, file)));
    const { db } = await createTestDatabase(bytes);
    const tablesBefore = await db.select<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'todo_items'",
    );
    const before = tablesBefore.length
      ? (await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM todo_items"))[0].n
      : 0;

    await runMigrations(db);

    const after = await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM todo_items");
    expect(after[0].n).toBe(before);
    // Ninguna tarea existente queda con fecha, prioridad o página inventadas.
    const touched = await db.select<{ n: number }[]>(
      "SELECT COUNT(*) AS n FROM todo_items WHERE due_date IS NOT NULL OR priority <> 0 OR page_id IS NOT NULL",
    );
    expect(touched[0].n).toBe(0);
  });

  it.each(files)("%s: tras migrar hay tantas páginas como notas, con contenido idéntico", async (file) => {
    const bytes = new Uint8Array(readFileSync(join(RECOVERY_DIR, file)));
    const { db } = await createTestDatabase(bytes);
    await runMigrations(db);

    const notes = await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM notes");
    const pages = await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM pages");
    expect(pages[0].n).toBe(notes[0].n);

    // Se compara dentro de SQLite para no sacar el contenido de las notas.
    const different = await db.select<{ n: number }[]>(
      `SELECT COUNT(*) AS n
         FROM notes JOIN pages ON pages.id = notes.id
        WHERE NOT (pages.title = notes.title
               AND pages.content = notes.content
               AND pages.pinned = notes.pinned
               AND pages.created_at = notes.created_at
               AND pages.updated_at = notes.updated_at
               AND pages.content_format = 'plain')`,
    );
    expect(different[0].n).toBe(0);
    const joined = await db.select<{ n: number }[]>(
      "SELECT COUNT(*) AS n FROM notes JOIN pages ON pages.id = notes.id",
    );
    expect(joined[0].n).toBe(notes[0].n);
  });
});
