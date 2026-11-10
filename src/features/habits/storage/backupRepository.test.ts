import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDatabaseForTesting } from "@/lib/db/database";
import { runMigrations } from "@/lib/db/migrations";
import type { BackupFile } from "@/features/backup/backupTypes";
import { ALL_TABLES } from "@/features/backup/backupTypes";
import { createTestDatabase, type TestDatabase } from "@/test/testDatabase";
import {
  createCollection,
  createRow,
  getPage,
  saveCollectionView,
  saveRowValue,
} from "@/features/pages/storage/pageRepository";
import {
  COLLECTION_TEMPLATES,
  readColumns,
  readValues,
  readView,
} from "@/features/pages/utils/collection";
import { readBackupData, replaceBackupData } from "./backupRepository";

const T = "2026-01-01T00:00:00.000Z";

async function seed({ db }: TestDatabase) {
  await db.execute(
    `INSERT INTO habits VALUES ('h1','Leer','duration',30,'minutos','estudio',1,$1,$1),
                               ('h2','Agua','count',8,'veces',NULL,0,$1,$1)`,
    [T],
  );
  await db.execute(
    `INSERT INTO habit_logs VALUES ('l1','h1','2026-01-01',30,1,'nota',$1,$1),
                                   ('l2','h2','2026-01-02',3,0,NULL,$1,$1)`,
    [T],
  );
  await db.execute(`INSERT INTO roadmaps VALUES ('r1','Ruta','desc',$1,$1)`, [T]);
  await db.execute(`INSERT INTO roadmap_sections VALUES ('s1','r1','Sección',1,$1,$1)`, [T]);
  await db.execute(
    `INSERT INTO roadmap_items
       (id, roadmap_id, section_id, section, section_order, title, description, type,
        completed, order_index, notes, url, created_at, updated_at, completed_at)
     VALUES ('i1','r1','s1','Sección',1,'Item','d','t',1,1,'n','https://x.test',$1,$1,$1),
            ('i2',NULL,NULL,'Vieja',2,'Otro',NULL,NULL,0,2,NULL,NULL,$1,$1,NULL)`,
    [T],
  );
  await db.execute(
    `INSERT INTO todo_items
       (id, title, notes, completed, order_index, created_at, updated_at, completed_at,
        due_date, priority, page_id)
     VALUES ('t1','Tarea',NULL,0,1,$1,$1,NULL,'2026-03-04',3,'p1'),
            ('t2','Hecha','n',1,2,$1,$1,$1,NULL,0,NULL)`,
    [T],
  );
  await db.execute(
    `INSERT INTO notes VALUES ('n1','Nota','contenido','cat',1,$1,$1),
                              ('n2','Otra','x',NULL,0,$1,$1)`,
    [T],
  );
  await db.execute(`INSERT INTO app_metadata VALUES ('clave','valor',$1)`, [T]);
  await db.execute(
    `INSERT INTO pages VALUES
       ('p1',NULL,'Madre','📘','# Hola\n\ncuerpo','markdown','page','{"categoria":"x"}',1,0,NULL,$1,$1),
       ('p2','p1','Hija',NULL,'texto plano','plain','page','{}',0,1,$1,$1,$1)`,
    [T],
  );
}

/** replaceBackupData marca el roadmap como sembrado; se compara sin esa clave. */
function withoutSeedFlag<T extends { app_metadata: { key: string }[] }>(data: T): T {
  return {
    ...data,
    app_metadata: data.app_metadata.filter((row) => row.key !== "roadmap_seeded"),
  };
}

describe("backup: ida y vuelta", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  it("leer, vaciar, restaurar y leer da lo mismo", async () => {
    await seed(test);
    const first = await readBackupData();
    expect(first.habits).toHaveLength(2);
    expect(first.roadmap_items).toHaveLength(2);

    for (const table of ALL_TABLES) {
      await test.db.execute(`DELETE FROM ${table}`);
    }
    expect((await readBackupData()).habits).toHaveLength(0);

    const backup: BackupFile = {
      metadata: { backupVersion: 4, exportedAt: T, app: "Aurhabits" },
      ...first,
    };
    await replaceBackupData(backup);

    const second = await readBackupData();
    expect(withoutSeedFlag(second)).toEqual(withoutSeedFlag(first));
    expect(second.app_metadata.some((row) => row.key === "roadmap_seeded")).toBe(true);
  });

  it("las colecciones y los valores de sus filas hacen la ida y vuelta", async () => {
    await seed(test);
    const collection = await createCollection({ template: COLLECTION_TEMPLATES[1] });
    const columns = readColumns(collection.properties);
    const row = await createRow(collection.id, "Dune");
    await saveRowValue(row.id, columns[0].id, "Herbert");
    await saveRowValue(row.id, columns[2].id, 5);
    await saveCollectionView(collection.id, { sort: { columnId: columns[0].id, dir: "asc" } });

    const first = await readBackupData();
    const stored = first.pages.find((page) => page.id === collection.id)!;
    expect(stored.kind).toBe("collection");

    // Se pasa por JSON, como el archivo real.
    const file = JSON.parse(
      JSON.stringify({ metadata: { backupVersion: 4, exportedAt: T, app: "Aurhabits" }, ...first }),
    ) as BackupFile;
    for (const table of ALL_TABLES) {
      await test.db.execute(`DELETE FROM ${table}`);
    }
    await replaceBackupData(file);

    const second = await readBackupData();
    expect(second.pages).toEqual(first.pages);
    const back = (await getPage(row.id))!;
    expect(readValues(back.properties)).toEqual({ [columns[0].id]: "Herbert", [columns[2].id]: 5 });
    expect(back.parentId).toBe(collection.id);
    expect(readView((await getPage(collection.id))!.properties).sort?.dir).toBe("asc");
  });

  it("v4: las columnas nuevas de tareas hacen la ida y vuelta", async () => {
    await seed(test);
    const first = await readBackupData();
    expect(first.todo_items[0]).toMatchObject({
      due_date: "2026-03-04",
      priority: 3,
      page_id: "p1",
    });
    await test.db.execute("UPDATE todo_items SET due_date = NULL, priority = 0, page_id = NULL");

    await replaceBackupData({
      metadata: { backupVersion: 4, exportedAt: T, app: "Aurhabits" },
      ...first,
    });
    expect((await readBackupData()).todo_items).toEqual(first.todo_items);
  });

  it("v3 (tareas sin columnas nuevas): se importa con valores por defecto", async () => {
    await seed(test);
    const data = await readBackupData();
    const oldTodos = data.todo_items.map((todo) => {
      const { due_date: _d, priority: _p, page_id: _g, ...old } = todo;
      void _d;
      void _p;
      void _g;
      return old;
    });
    // Un v3 real no tiene las columnas: se pasa tal cual, sin normalizar.
    const v3 = {
      metadata: { backupVersion: 3, exportedAt: T, app: "Aurhabits" },
      ...data,
      todo_items: oldTodos,
    } as unknown as BackupFile;

    await replaceBackupData(v3);

    const after = await readBackupData();
    expect(after.todo_items).toHaveLength(2);
    expect(after.todo_items.map((todo) => todo.title)).toEqual(["Tarea", "Hecha"]);
    expect(after.todo_items.every((todo) => todo.due_date === null)).toBe(true);
    expect(after.todo_items.every((todo) => todo.priority === 0)).toBe(true);
    expect(after.todo_items.every((todo) => todo.page_id === null)).toBe(true);
  });

  it("v3: reemplaza todo, páginas incluidas (con papelera y formato)", async () => {
    await seed(test);
    const first = await readBackupData();
    expect(first.pages).toHaveLength(2);
    await test.db.execute("UPDATE pages SET title = 'cambiado'");
    await test.db.execute("INSERT INTO pages (id,title,created_at,updated_at) VALUES ('p9','extra',$1,$1)", [T]);

    await replaceBackupData({
      metadata: { backupVersion: 4, exportedAt: T, app: "Aurhabits" },
      ...first,
    });
    expect((await readBackupData()).pages).toEqual(first.pages);
  });

  it("v2 (sin páginas): reemplaza sus tablas y reconstruye pages desde las notas", async () => {
    await seed(test);
    const data = await readBackupData();
    const { pages: _pages, ...v2Tables } = data;
    void _pages;
    await test.db.execute("INSERT INTO pages (id,title,created_at,updated_at) VALUES ('p9','extra',$1,$1)", [T]);

    await replaceBackupData({
      metadata: { backupVersion: 2, exportedAt: T, app: "Aurhabits" },
      ...v2Tables,
    });

    const after = await readBackupData();
    // Las páginas anteriores desaparecen y salen de las notas importadas.
    expect(after.pages.map((page) => page.id)).toEqual(["n1", "n2"]);
    expect(after.pages.map((page) => page.content)).toEqual(
      after.notes.map((note) => note.content),
    );
    expect(after.pages.every((page) => page.content_format === "plain")).toBe(true);
    expect(JSON.parse(after.pages[0].properties)).toEqual({ categoria: "cat" });
    expect(after.pages[0].pinned).toBe(1);
  });

  it("v1: solo toca hábitos y registros; notas y páginas se quedan", async () => {
    await seed(test);
    const before = await readBackupData();

    await replaceBackupData({
      metadata: { backupVersion: 1, exportedAt: T, app: "Aurhabits" },
      habits: [],
      habit_logs: [],
    });

    const after = await readBackupData();
    expect(after.habits).toHaveLength(0);
    expect(after.habit_logs).toHaveLength(0);
    expect(after.pages).toEqual(before.pages);
    expect(after.notes).toEqual(before.notes);
    expect(after.todo_items).toEqual(before.todo_items);
    expect(after.roadmap_items).toEqual(before.roadmap_items);
  });
});
