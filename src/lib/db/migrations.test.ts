import { describe, expect, it } from "vitest";
import { createTestDatabase } from "@/test/testDatabase";
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  runMigrations,
} from "./migrations";
import type { SqlDatabase } from "./types";

const EXPECTED_TABLES = [
  "app_metadata",
  "habit_logs",
  "habits",
  "notes",
  "roadmap_items",
  "roadmap_sections",
  "roadmaps",
  "todo_items",
];

async function userVersion(db: SqlDatabase): Promise<number> {
  const rows = await db.select<{ user_version: number }[]>("PRAGMA user_version");
  return rows[0].user_version;
}

async function tableNames(db: SqlDatabase): Promise<string[]> {
  const rows = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

async function columnNames(db: SqlDatabase, table: string): Promise<string[]> {
  const rows = await db.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
  return rows.map((row) => row.name);
}

describe("migraciones", () => {
  it("las versiones son consecutivas desde 1", () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(
      MIGRATIONS.map((_, index) => index + 1),
    );
  });

  it("una base vacía queda en la versión actual con todas las tablas", async () => {
    const { db } = await createTestDatabase();
    await runMigrations(db);

    expect(await userVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
    expect(await tableNames(db)).toEqual(EXPECTED_TABLES);
  });

  it("actualiza una base antigua sin perder filas", async () => {
    const { db } = await createTestDatabase();
    await db.execute(`CREATE TABLE roadmap_items (
      id TEXT PRIMARY KEY, section TEXT NOT NULL, section_order INTEGER NOT NULL,
      title TEXT NOT NULL, description TEXT, type TEXT, completed INTEGER NOT NULL,
      order_index INTEGER NOT NULL, notes TEXT, url TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT)`);
    await db.execute(
      `INSERT INTO roadmap_items
         (id, section, section_order, title, completed, order_index, created_at, updated_at)
       VALUES ('i1', 'S', 1, 'Uno', 0, 1, 'x', 'x'), ('i2', 'S', 1, 'Dos', 1, 2, 'x', 'x')`,
    );
    expect(await userVersion(db)).toBe(0);

    await runMigrations(db);

    const columns = await columnNames(db, "roadmap_items");
    expect(columns).toContain("roadmap_id");
    expect(columns).toContain("section_id");
    const rows = await db.select<{ id: string; title: string }[]>(
      "SELECT id, title FROM roadmap_items ORDER BY id",
    );
    expect(rows).toEqual([
      { id: "i1", title: "Uno" },
      { id: "i2", title: "Dos" },
    ]);
    expect(await userVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("ejecutarlas dos veces no cambia nada", async () => {
    const { db, raw } = await createTestDatabase();
    await runMigrations(db);
    const schemaBefore = raw.exec("SELECT sql FROM sqlite_master ORDER BY name");
    await runMigrations(db);
    const schemaAfter = raw.exec("SELECT sql FROM sqlite_master ORDER BY name");

    expect(schemaAfter).toEqual(schemaBefore);
    expect(await userVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("beforeMigrate se invoca con una base anterior al versionado (user_version 0 con datos)", async () => {
    const { db } = await createTestDatabase();
    await db.execute(
      `CREATE TABLE habits (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
         target_value INTEGER NOT NULL, unit TEXT NOT NULL, category TEXT,
         active INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    );
    await db.execute(
      `INSERT INTO habits VALUES ('h1', 'Leer', 'duration', 30, 'minutos', NULL, 1, 'x', 'x')`,
    );
    expect(await userVersion(db)).toBe(0);

    const calls: [number, number][] = [];
    await runMigrations(db, {
      beforeMigrate: async (from, to) => {
        calls.push([from, to]);
      },
    });
    expect(calls).toEqual([[0, CURRENT_SCHEMA_VERSION]]);
    expect(await userVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("si beforeMigrate falla, no se migra", async () => {
    const { db } = await createTestDatabase();
    await db.execute("CREATE TABLE habits (id TEXT PRIMARY KEY)");

    await expect(
      runMigrations(db, {
        beforeMigrate: async () => {
          throw new Error("sin copia");
        },
      }),
    ).rejects.toThrow("sin copia");
    expect(await userVersion(db)).toBe(0);
    expect(await tableNames(db)).toEqual(["habits"]);
  });

  it("beforeMigrate no se invoca en una base nueva y vacía ni sin migraciones pendientes", async () => {
    const calls: [number, number][] = [];
    const beforeMigrate = async (from: number, to: number) => {
      calls.push([from, to]);
    };

    const fresh = await createTestDatabase();
    await runMigrations(fresh.db, { beforeMigrate });
    expect(calls).toEqual([]);

    // Sin migraciones pendientes tampoco se invoca.
    await runMigrations(fresh.db, { beforeMigrate });
    expect(calls).toEqual([]);
  });

  it("beforeMigrate se invoca una vez cuando hay migraciones pendientes sobre datos existentes", async () => {
    const { db } = await createTestDatabase();
    await runMigrations(db);

    // Simula una versión futura: el runner usa MIGRATIONS, así que añadimos una.
    MIGRATIONS.push({
      version: CURRENT_SCHEMA_VERSION + 1,
      name: "prueba",
      async up(target) {
        await target.execute("CREATE TABLE IF NOT EXISTS prueba (id TEXT)");
      },
    });
    try {
      const calls: [number, number][] = [];
      await runMigrations(db, {
        beforeMigrate: async (from, to) => {
          calls.push([from, to]);
        },
      });
      expect(calls).toEqual([[1, 2]]);
      expect(await userVersion(db)).toBe(2);
    } finally {
      MIGRATIONS.pop();
    }
  });
});
