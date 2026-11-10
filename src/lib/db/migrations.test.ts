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
  "pages",
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
    const base = CURRENT_SCHEMA_VERSION;

    // Simula una versión futura: el runner usa MIGRATIONS, así que añadimos una.
    MIGRATIONS.push({
      version: base + 1,
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
      expect(calls).toEqual([[base, base + 1]]);
      expect(await userVersion(db)).toBe(base + 1);
    } finally {
      MIGRATIONS.pop();
    }
  });

  describe("migración 2: páginas", () => {
    const NOTES: [string, string, string, string | null, number, string, string][] = [
      ["n1", "Título  con espacios ", "línea 1\n\n  línea 2 con *marcas* y https://x.test/a?b=1\r\ncrlf\t\n", "ideas", 1, "2026-01-01T10:00:00.000Z", "2026-02-03T11:12:13.000Z"],
      ["n2", "Sin categoría", "", null, 0, "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z"],
      ["n3", "Categoría vacía", "x", "", 0, "2026-01-03T00:00:00.000Z", "2026-01-04T00:00:00.000Z"],
      ["n4", "Comillas \"'", "Ñandú ✓ 日本語 \u{1F600} 'comillas' \"dobles\"", "a\"b", 0, "2026-01-05T00:00:00.000Z", "2026-01-05T00:00:00.000Z"],
    ];

    async function dbAtV1WithNotes() {
      const test = await createTestDatabase();
      // Una base en la versión 1: solo la migración 1 aplicada.
      await MIGRATIONS[0].up(test.db);
      await test.db.execute("PRAGMA user_version = 1");
      for (const note of NOTES) {
        await test.db.execute("INSERT INTO notes VALUES ($1,$2,$3,$4,$5,$6,$7)", note);
      }
      return test;
    }

    it("copia cada nota a pages sin alterar título, contenido, fijado ni fechas", async () => {
      const { db } = await dbAtV1WithNotes();
      await runMigrations(db);

      const pages = await db.select<Record<string, unknown>[]>(
        "SELECT * FROM pages ORDER BY id",
      );
      expect(pages).toHaveLength(NOTES.length);
      NOTES.forEach((note, index) => {
        const page = pages[index];
        expect(page.id).toBe(note[0]);
        expect(page.title).toBe(note[1]);
        expect(page.content).toBe(note[2]);
        expect(page.pinned).toBe(note[4]);
        expect(page.created_at).toBe(note[5]);
        expect(page.updated_at).toBe(note[6]);
        expect(page.content_format).toBe("plain");
        expect(page.kind).toBe("page");
        expect(page.parent_id).toBeNull();
        expect(page.deleted_at).toBeNull();
        expect(page.sort_order).toBe(0);
      });
    });

    it("la categoría pasa a properties como JSON; sin categoría queda {}", async () => {
      const { db } = await dbAtV1WithNotes();
      await runMigrations(db);

      const rows = await db.select<{ id: string; properties: string }[]>(
        "SELECT id, properties FROM pages ORDER BY id",
      );
      const byId = Object.fromEntries(rows.map((row) => [row.id, row.properties]));
      expect(JSON.parse(byId.n1)).toEqual({ categoria: "ideas" });
      expect(JSON.parse(byId.n2)).toEqual({});
      expect(JSON.parse(byId.n3)).toEqual({});
      expect(JSON.parse(byId.n4)).toEqual({ categoria: 'a"b' });
    });

    it("notes queda exactamente igual", async () => {
      const { db } = await dbAtV1WithNotes();
      const before = await db.select<unknown[]>("SELECT * FROM notes ORDER BY id");
      await runMigrations(db);
      expect(await db.select<unknown[]>("SELECT * FROM notes ORDER BY id")).toEqual(before);
    });

    it("ejecutarla dos veces no duplica ni pisa páginas editadas", async () => {
      const { db } = await dbAtV1WithNotes();
      await runMigrations(db);
      await db.execute(
        "UPDATE pages SET content = 'editado', content_format = 'markdown' WHERE id = 'n1'",
      );
      // Fuerza la repetición de la migración 2.
      await db.execute("PRAGMA user_version = 1");
      await runMigrations(db);

      const count = await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM pages");
      expect(count[0].n).toBe(NOTES.length);
      const page = await db.select<{ content: string; content_format: string }[]>(
        "SELECT content, content_format FROM pages WHERE id = 'n1'",
      );
      expect(page[0]).toEqual({ content: "editado", content_format: "markdown" });
    });
  });
});
