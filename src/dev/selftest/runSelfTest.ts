/**
 * AUTOPRUEBA EN TIEMPO DE EJECUCIÓN (solo desarrollo).
 *
 * Recorre el camino real de datos contra la base abierta (plugin SQL de Tauri
 * + comandos de Rust en la app; sql.js en el navegador) y lo deja todo como lo
 * encontró. Solo se carga desde `App.tsx` con `import()` bajo
 * `import.meta.env.DEV` y `?selftest=1`, así que no entra en producción.
 */
import { BACKUP_VERSION, ALL_TABLES, type BackupFile } from "@/features/backup/backupTypes";
import { validateBackupFile } from "@/features/backup/backupValidation";
import { readBackupData } from "@/features/habits/storage/backupRepository";
import * as pageRepo from "@/features/pages/storage/pageRepository";
import {
  COLLECTION_TEMPLATES,
  readColumns,
  readValues,
  type CellValue,
} from "@/features/pages/utils/collection";
import * as roadmapRepo from "@/features/roadmap/storage/roadmapRepository";
import type { RoadmapItem } from "@/features/roadmap/types";
import * as todoRepo from "@/features/todos/storage/todoRepository";
import { runBatch } from "@/lib/db/batch";
import { getDatabase } from "@/lib/db/database";
import { createSnapshot, listSnapshots } from "@/lib/db/snapshots";
import { isTauri } from "@/lib/platform/env";

/** Todo lo que crea la autoprueba lleva este prefijo en el título (o `selftest-` en el id). */
export const SELFTEST_TITLE_PREFIX = "__autoprueba__";
export const SELFTEST_ID_PREFIX = "selftest-";
export const SELFTEST_RESULT_KEY = "selftest_result";

export interface StepResult {
  name: string;
  ok: boolean;
  /** El paso no aplica en este entorno (cuenta como correcto). */
  skipped?: boolean;
  error?: string;
}

export type TableCounts = Record<string, number>;

export interface SelfTestResult {
  startedAt: string;
  finishedAt: string;
  passed: boolean;
  steps: StepResult[];
  countsBefore: TableCounts;
  countsAfter: TableCounts;
}

class Skip extends Error {}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function same(actual: unknown, expected: unknown, what: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(a === e, `${what}: esperado ${e}, leído ${a}`);
}

async function rejects(action: () => Promise<unknown>, what: string): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error(`${what}: debía fallar y no lo hizo`);
}

async function countTables(): Promise<TableCounts> {
  const db = await getDatabase();
  const counts: TableCounts = {};
  for (const table of ALL_TABLES) {
    const rows = await db.select<{ n: number }[]>(`SELECT COUNT(*) AS n FROM ${table}`);
    counts[table] = Number(rows[0]?.n ?? 0);
  }
  return counts;
}

/**
 * Borra todo lo que crea la autoprueba, sea cual sea el punto en que se haya
 * quedado: por prefijo de título o de id. Una sola transacción.
 */
export async function cleanupSelfTestData(): Promise<void> {
  const title = SELFTEST_TITLE_PREFIX;
  const n = title.length;
  const idLike = `${SELFTEST_ID_PREFIX}%`;
  await runBatch([
    {
      sql: `DELETE FROM roadmap_items
             WHERE substr(title, 1, ${n}) = $1 OR id LIKE $2
                OR roadmap_id IN (SELECT id FROM roadmaps WHERE substr(title, 1, ${n}) = $1)`,
      params: [title, idLike],
    },
    {
      sql: `DELETE FROM roadmap_sections
             WHERE substr(name, 1, ${n}) = $1
                OR roadmap_id IN (SELECT id FROM roadmaps WHERE substr(title, 1, ${n}) = $1)`,
      params: [title],
    },
    { sql: `DELETE FROM roadmaps WHERE substr(title, 1, ${n}) = $1`, params: [title] },
    {
      sql: `DELETE FROM todo_items WHERE substr(title, 1, ${n}) = $1 OR id LIKE $2`,
      params: [title, idLike],
    },
    {
      sql: `DELETE FROM pages WHERE substr(title, 1, ${n}) = $1 OR id LIKE $2`,
      params: [title, idLike],
    },
  ]);
}

interface Context {
  page?: string;
  subpage?: string;
  collection?: string;
  rows: string[];
  todos: string[];
}

/** Texto con todo lo que suele romper el camino de datos. */
const NASTY_MARKDOWN = [
  "# Canción de cuña, ñandú y ÁÉÍÓÚ",
  "",
  "Él dijo: 'hola' y \"adiós\"; “comillas curvas” y ‘simples’.",
  "",
  "- ítem con emojis 🎉🚀 y 👩‍💻",
  "- `código` con 'comillas' y un $1 $2 $10 literal",
  "- SQL: '); DROP TABLE pages; -- %_ \\ \\n",
  "",
  "> Cita larga — con raya, … y símbolos ≠ ≤ ∑",
  "",
].join("\n");

export async function runSelfTest(
  onProgress?: (steps: StepResult[]) => void,
): Promise<SelfTestResult> {
  const startedAt = new Date().toISOString();
  const steps: StepResult[] = [];
  const ctx: Context = { rows: [], todos: [] };
  const tauri = isTauri();

  const step = async (name: string, run: () => Promise<void>) => {
    try {
      await run();
      steps.push({ name, ok: true });
    } catch (error) {
      if (error instanceof Skip) steps.push({ name, ok: true, skipped: true, error: error.message });
      else {
        console.error(`Autoprueba: falló «${name}»`, error);
        steps.push({
          name,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    onProgress?.([...steps]);
  };

  /** Pasos que dependen de datos de un paso anterior. */
  const need = <T>(value: T | null | undefined, what: string): T => {
    check(value !== undefined && value !== null, `Falta ${what} (falló un paso anterior)`);
    return value;
  };

  // Por si una ejecución anterior se cortó a medias.
  await cleanupSelfTestData();
  const countsBefore = await countTables();

  /* ---------- páginas ---------- */

  await step("Página Markdown (tildes, comillas, emojis): crear y releer", async () => {
    const created = await pageRepo.createPage({
      title: `${SELFTEST_TITLE_PREFIX} página ñ'"`,
      content: NASTY_MARKDOWN,
    });
    ctx.page = created.id;
    const stored = need(await pageRepo.getPage(created.id), "la página");
    same(stored.content, NASTY_MARKDOWN, "contenido");
    same(stored.title, `${SELFTEST_TITLE_PREFIX} página ñ'"`, "título");
    same(stored.contentFormat, "markdown", "formato");
  });

  await step("Guardar título, contenido y fijado", async () => {
    const id = need(ctx.page, "la página");
    const title = `${SELFTEST_TITLE_PREFIX} título nuevo é`;
    const body = `${NASTY_MARKDOWN}\nSegunda edición — ✓ 'ok'\n`;
    await pageRepo.savePageTitle(id, title);
    const saved = await pageRepo.savePageContent(id, body);
    check(saved.updatedAt !== "", "savePageContent no devolvió fecha");
    await pageRepo.setPagePinned(id, true);
    const stored = need(await pageRepo.getPage(id), "la página");
    same(stored.title, title, "título");
    same(stored.content, body, "contenido");
    same(stored.pinned, true, "fijada");
    await pageRepo.setPagePinned(id, false);
    same((await pageRepo.getPage(id))?.pinned, false, "soltada");
  });

  await step("Crear una subpágina", async () => {
    const parent = need(ctx.page, "la página");
    const sub = await pageRepo.createPage({
      parentId: parent,
      title: `${SELFTEST_TITLE_PREFIX} subpágina`,
      content: "hija 🌱",
    });
    ctx.subpage = sub.id;
    const stored = need(await pageRepo.getPage(sub.id), "la subpágina");
    same(stored.parentId, parent, "parentId");
    same(stored.content, "hija 🌱", "contenido");
  });

  /* ---------- colecciones ---------- */

  let titleColumn = "";
  let dateColumn = "";
  await step("Colección con la plantilla de libros y una columna nueva", async () => {
    const template = COLLECTION_TEMPLATES.find((candidate) => candidate.id === "books");
    check(template, "no existe la plantilla de libros");
    const collection = await pageRepo.createCollection({ parentId: null, template });
    ctx.collection = collection.id;
    await pageRepo.savePageTitle(collection.id, `${SELFTEST_TITLE_PREFIX} colección`);
    same(readColumns(collection.properties).map((c) => c.name), template.columns.map((c) => c.name), "columnas de la plantilla");

    await pageRepo.addCollectionColumn(collection.id, { name: "Terminado", type: "checkbox" });
    await pageRepo.addCollectionColumn(collection.id, { name: "Fecha", type: "date" });
    const stored = need(await pageRepo.getPage(collection.id), "la colección");
    const columns = readColumns(stored.properties);
    same(columns.map((c) => c.name), [...template.columns.map((c) => c.name), "Terminado", "Fecha"], "columnas tras añadir");
    titleColumn = columns.find((c) => c.name === "Autor")!.id;
    dateColumn = columns.find((c) => c.name === "Fecha")!.id;
  });

  await step("Dos filas: escribir un valor de cada tipo y releerlos", async () => {
    const collectionId = need(ctx.collection, "la colección");
    const collection = need(await pageRepo.getPage(collectionId), "la colección");
    const columns = readColumns(collection.properties);
    const byName = (name: string) => need(columns.find((c) => c.name === name), `la columna ${name}`);

    const row1 = await pageRepo.createRow(collectionId, `${SELFTEST_TITLE_PREFIX} fila 1`);
    const row2 = await pageRepo.createRow(collectionId, `${SELFTEST_TITLE_PREFIX} fila 2`);
    ctx.rows.push(row1.id, row2.id);

    const read = byName("Estado").options?.find((option) => option.label === "Leído");
    const expected: Record<string, CellValue> = {
      [byName("Autor").id]: "Frank Herbert ñ 'x'",
      [byName("Estado").id]: need(read, "la opción «Leído»").id,
      [byName("Valoración").id]: 4.5,
      [byName("Fuente").id]: "https://example.com/?a=1&b='2'",
      [byName("Terminado").id]: true,
      [byName("Fecha").id]: "2026-11-10",
    };
    for (const [columnId, value] of Object.entries(expected)) {
      await pageRepo.saveRowValue(row1.id, columnId, value);
    }
    await pageRepo.saveRowValue(row2.id, byName("Autor").id, "Otra persona");
    // Una casilla sin marcar equivale a «sin valor»: no se guarda.
    await pageRepo.saveRowValue(row2.id, byName("Terminado").id, false);

    same(readValues(need(await pageRepo.getPage(row1.id), "la fila 1").properties), expected, "valores de la fila 1");
    same(
      readValues(need(await pageRepo.getPage(row2.id), "la fila 2").properties),
      { [byName("Autor").id]: "Otra persona" },
      "valores de la fila 2",
    );
  });

  await step("Renombrar y eliminar una columna", async () => {
    const collectionId = need(ctx.collection, "la colección");
    await pageRepo.renameCollectionColumn(collectionId, titleColumn, "Escritor");
    const renamed = readColumns(need(await pageRepo.getPage(collectionId), "la colección").properties);
    check(renamed.some((c) => c.id === titleColumn && c.name === "Escritor"), "la columna no se renombró");

    await pageRepo.deleteCollectionColumn(collectionId, dateColumn);
    const after = readColumns(need(await pageRepo.getPage(collectionId), "la colección").properties);
    check(!after.some((c) => c.id === dateColumn), "la columna no se eliminó");
    const row1 = need(await pageRepo.getPage(need(ctx.rows[0], "la fila 1")), "la fila 1");
    check(!(dateColumn in readValues(row1.properties)), "el valor de la columna eliminada sigue en la fila");
    check(titleColumn in readValues(row1.properties), "se perdió el valor de otra columna");
  });

  /* ---------- tareas ---------- */

  await step("Tareas con fecha, prioridad y página: reordenar y completar", async () => {
    const pageId = need(ctx.page, "la página");
    const a = await todoRepo.insertTodoItem({ title: `${SELFTEST_TITLE_PREFIX} tarea A`, dueDate: "2026-12-01", priority: 3, pageId, notes: "nota ñ 'q'" });
    const b = await todoRepo.insertTodoItem({ title: `${SELFTEST_TITLE_PREFIX} tarea B`, dueDate: "2026-12-02", priority: 1, pageId });
    const c = await todoRepo.insertTodoItem({ title: `${SELFTEST_TITLE_PREFIX} tarea C`, priority: 2 });
    ctx.todos.push(a.id, b.id, c.id);

    const ours = async () =>
      (await todoRepo.listTodoItems()).filter((todo) => todo.title.startsWith(SELFTEST_TITLE_PREFIX));
    const first = await ours();
    same(first.map((t) => t.id), [a.id, b.id, c.id], "orden inicial");
    same(first[0], { ...a, orderIndex: first[0].orderIndex }, "la tarea A se relee igual");

    // Orden inverso: C, B, A.
    const base = Math.min(...first.map((t) => t.orderIndex));
    await todoRepo.reorderTodoItems([
      { id: c.id, position: base },
      { id: b.id, position: base + 1 },
      { id: a.id, position: base + 2 },
    ]);
    same((await ours()).map((t) => t.id), [c.id, b.id, a.id], "orden tras reordenar");

    await todoRepo.setTodoCompleted(c.id, true);
    const afterComplete = await ours();
    same(afterComplete.map((t) => t.id), [b.id, a.id, c.id], "las completadas van al final");
    check(afterComplete[2].completed && afterComplete[2].completedAt !== undefined, "C no quedó completada");
    same(afterComplete[1].pageId, pageId, "página enlazada");
    same(afterComplete[1].dueDate, "2026-12-01", "fecha");
    same(afterComplete[1].priority, 3, "prioridad");
  });

  /* ---------- listas ---------- */

  await step("Lista con sección e items: reordenar", async () => {
    const roadmap = await roadmapRepo.insertRoadmap({ title: `${SELFTEST_TITLE_PREFIX} lista`, description: "desc ñ" });
    const section = await roadmapRepo.insertRoadmapSection(roadmap.id, { name: `${SELFTEST_TITLE_PREFIX} sección` });
    const items: RoadmapItem[] = [];
    for (const name of ["uno", "dos", "tres"]) {
      const item = await roadmapRepo.insertRoadmapItem({
        sectionId: section.id,
        title: `${SELFTEST_TITLE_PREFIX} ${name}`,
        description: "d 'x'",
        type: "Libro",
        url: "https://example.com",
        notes: "n",
      });
      items.push(need(item ?? undefined, `el item ${name}`));
    }
    const titles = async () => (await roadmapRepo.listRoadmapItems(roadmap.id)).map((i) => i.title.slice(SELFTEST_TITLE_PREFIX.length + 1));
    same(await titles(), ["uno", "dos", "tres"], "orden inicial");

    await roadmapRepo.reorderRoadmapItems([items[2].id, items[0].id, items[1].id]);
    same(await titles(), ["tres", "uno", "dos"], "orden tras reordenar");

    await roadmapRepo.setRoadmapItemCompleted(items[0].id, true);
    const stored = (await roadmapRepo.listRoadmapItems(roadmap.id)).find((i) => i.id === items[0].id);
    same(stored?.completed, true, "completado");
    same((await roadmapRepo.listRoadmapSections(roadmap.id)).length, 1, "secciones");
  });

  /* ---------- transacciones ---------- */

  await step("runBatch se revierte entero si falla su última sentencia", async () => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const ids = [`${SELFTEST_ID_PREFIX}lote-1`, `${SELFTEST_ID_PREFIX}lote-2`];
    const insert = (id: string) => ({
      sql: `INSERT INTO todo_items
              (id, title, notes, completed, order_index, created_at, updated_at, completed_at)
            VALUES ($1, $2, NULL, 0, 99999, $3, $3, NULL)`,
      params: [id, `${SELFTEST_TITLE_PREFIX} lote`, now],
    });
    const countRows = async () =>
      Number((await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM todo_items"))[0].n);
    const before = await countRows();

    await rejects(
      () =>
        runBatch([
          insert(ids[0]),
          insert(ids[1]),
          { sql: "INSERT INTO tabla_que_no_existe (x) VALUES ($1)", params: [1] },
        ]),
      "el lote con sentencia final inválida",
    );
    same(await countRows(), before, "filas de todo_items tras el lote fallido");
    const leftovers = await db.select<{ id: string }[]>(
      "SELECT id FROM todo_items WHERE id IN ($1, $2)",
      ids,
    );
    same(leftovers, [], "restos del lote");

    // Y un lote correcto sí se aplica (control).
    await runBatch([insert(ids[0])]);
    same(await countRows(), before + 1, "filas tras un lote correcto");
  });

  /* ---------- papelera ---------- */

  await step("Papelera: enviar, restaurar y eliminar definitivamente", async () => {
    const id = need(ctx.subpage, "la subpágina");
    await pageRepo.trashPage(id);
    check((await pageRepo.getPage(id))?.deletedAt, "no se envió a la papelera");
    await pageRepo.restorePage(id);
    same((await pageRepo.getPage(id))?.deletedAt, null, "tras restaurar");
    await pageRepo.trashPage(id);
    await pageRepo.deletePagePermanently(id);
    same(await pageRepo.getPage(id), null, "tras eliminar definitivamente");
    ctx.subpage = undefined;
  });

  /* ---------- backup ---------- */

  await step("Backup en memoria: generar y validar", async () => {
    const data = await readBackupData();
    const backup: BackupFile = {
      metadata: { backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), app: "Aurhabits" },
      ...data,
    };
    // Pasa por JSON, como al guardar y volver a abrir el archivo.
    const validated = validateBackupFile(JSON.parse(JSON.stringify(backup)));
    check(validated.habits.length === data.habits.length, "el backup validado perdió hábitos");
    check(
      data.pages.some((page) => page.title.startsWith(SELFTEST_TITLE_PREFIX) && page.content.includes("ñandú")),
      "el backup no contiene la página de la autoprueba",
    );
    same(
      data.todo_items.filter((todo) => ctx.todos.includes(todo.id)).length,
      3,
      "tareas de la autoprueba en el backup",
    );
  });

  await step("Copia de la base (db_snapshot «autoprueba») y listado", async () => {
    if (!tauri) throw new Skip("Solo existe en la app de escritorio (Tauri).");
    const info = await createSnapshot("autoprueba");
    check(info, "createSnapshot no devolvió información");
    check(info.sizeBytes > 0, "la copia está vacía");
    const listed = await listSnapshots();
    check(listed.some((snapshot) => snapshot.name === info.name && snapshot.reason === "autoprueba"), "la copia no aparece en el listado");
  });

  /* ---------- limpieza ---------- */

  await step("Limpieza de todo lo creado", async () => {
    await cleanupSelfTestData();
    const db = await getDatabase();
    const left = await db.select<{ n: number }[]>(
      `SELECT (SELECT COUNT(*) FROM pages WHERE substr(title, 1, ${SELFTEST_TITLE_PREFIX.length}) = $1)
            + (SELECT COUNT(*) FROM todo_items WHERE substr(title, 1, ${SELFTEST_TITLE_PREFIX.length}) = $1 OR id LIKE $2)
            + (SELECT COUNT(*) FROM roadmaps WHERE substr(title, 1, ${SELFTEST_TITLE_PREFIX.length}) = $1) AS n`,
      [SELFTEST_TITLE_PREFIX, `${SELFTEST_ID_PREFIX}%`],
    );
    same(Number(left[0].n), 0, "restos tras la limpieza");
  });

  const countsAfter = await countTables();
  await step("Los conteos de cada tabla son iguales a los del inicio", async () => {
    const differences = ALL_TABLES.filter((table) => countsBefore[table] !== countsAfter[table]).map(
      (table) => `${table}: ${countsBefore[table]} → ${countsAfter[table]}`,
    );
    check(differences.length === 0, `Conteos distintos: ${differences.join("; ")}`);
  });

  const result: SelfTestResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    passed: steps.every((entry) => entry.ok),
    steps,
    countsBefore,
    countsAfter,
  };

  // El resultado se guarda DESPUÉS de comparar los conteos (añade/actualiza una fila de app_metadata).
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO app_metadata (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [SELFTEST_RESULT_KEY, JSON.stringify(result), result.finishedAt],
  );
  return result;
}
