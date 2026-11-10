import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDatabaseForTesting } from "@/lib/db/database";
import { runMigrations } from "@/lib/db/migrations";
import { createTestDatabase, type TestDatabase } from "@/test/testDatabase";
import { buildTree } from "../utils/pageTree";
import {
  COLLECTION_TEMPLATES,
  readColumns,
  readValues,
  readView,
  sortRows,
} from "../utils/collection";
import * as repo from "./pageRepository";

const BOOKS = COLLECTION_TEMPLATES.find((template) => template.id === "books")!;

describe("colecciones (repositorio)", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  async function books() {
    const collection = await repo.createCollection({ template: BOOKS });
    const columns = readColumns(collection.properties);
    const col = (name: string) => columns.find((column) => column.name === name)!;
    return { collection, columns, col };
  }

  it("crea una colección con la plantilla de libros (y vacía sin plantilla)", async () => {
    const { collection, columns } = await books();
    const stored = (await repo.getPage(collection.id))!;
    expect(stored.kind).toBe("collection");
    expect(stored.title).toBe("Libros");
    expect(readColumns(stored.properties).map((c) => [c.name, c.type])).toEqual([
      ["Autor", "text"],
      ["Estado", "select"],
      ["Valoración", "number"],
      ["Fuente", "url"],
    ]);
    expect(columns[1].options).toHaveLength(3);

    const empty = await repo.createCollection();
    expect((await repo.getPage(empty.id))!.properties).toEqual({ columns: [] });
  });

  it("las filas son páginas normales hijas, con orden manual, y no entran en el árbol", async () => {
    const { collection } = await books();
    const a = await repo.createRow(collection.id, "Dune");
    const b = await repo.createRow(collection.id, "Ficciones");
    expect(a.kind).toBe("page");
    expect(a.parentId).toBe(collection.id);
    expect([a.sortOrder, b.sortOrder]).toEqual([0, 1]);

    const pages = await repo.listPages();
    const tree = buildTree(pages);
    expect(tree).toHaveLength(1);
    expect(tree[0].page.id).toBe(collection.id);
    expect(tree[0].children).toHaveLength(0);

    await repo.reorderPages([b.id, a.id]);
    const rows = (await repo.listPages()).filter((page) => page.parentId === collection.id);
    expect(sortRows(rows, [], undefined).map((r) => r.title)).toEqual(["Ficciones", "Dune"]);
  });

  it("guarda valores de fila fusionando: no pisa otras claves ni otras celdas", async () => {
    const { collection, col } = await books();
    const row = await repo.createRow(collection.id, "Dune");
    await test.db.execute(`UPDATE pages SET properties = $1 WHERE id = $2`, [
      '{"categoria":"sci-fi"}',
      row.id,
    ]);
    await repo.saveRowValue(row.id, col("Autor").id, "Herbert");
    await repo.saveRowValue(row.id, col("Valoración").id, 5);
    const stored = (await repo.getPage(row.id))!;
    expect(stored.properties.categoria).toBe("sci-fi");
    expect(readValues(stored.properties)).toEqual({
      [col("Autor").id]: "Herbert",
      [col("Valoración").id]: 5,
    });

    await repo.saveRowValue(row.id, col("Autor").id, null);
    expect(readValues((await repo.getPage(row.id))!.properties)).toEqual({
      [col("Valoración").id]: 5,
    });
  });

  it("tolera properties con JSON inválido en una fila", async () => {
    const { collection, col } = await books();
    const row = await repo.createRow(collection.id, "Roto");
    await test.db.execute(`UPDATE pages SET properties = 'no json' WHERE id = $1`, [row.id]);
    expect((await repo.getPage(row.id))!.properties).toEqual({});
    await repo.saveRowValue(row.id, col("Autor").id, "X");
    expect(readValues((await repo.getPage(row.id))!.properties)).toEqual({
      [col("Autor").id]: "X",
    });
    // El resto de la colección sigue leyéndose.
    expect((await repo.listPages()).length).toBe(2);
  });

  it("añadir, renombrar y eliminar columna (esto último borra sus valores)", async () => {
    const { collection, col } = await books();
    const row = await repo.createRow(collection.id, "Dune");
    await repo.saveRowValue(row.id, col("Autor").id, "Herbert");
    await repo.saveRowValue(row.id, col("Valoración").id, 4);

    await repo.addCollectionColumn(collection.id, { name: "Leído el", type: "date" });
    await repo.renameCollectionColumn(collection.id, col("Autor").id, "  Escritor ");
    let columns = readColumns((await repo.getPage(collection.id))!.properties);
    expect(columns.map((c) => c.name)).toEqual(["Escritor", "Estado", "Valoración", "Fuente", "Leído el"]);
    expect(columns[4].type).toBe("date");

    await repo.saveCollectionView(collection.id, { sort: { columnId: col("Autor").id, dir: "asc" } });
    await repo.deleteCollectionColumn(collection.id, col("Autor").id);
    const after = (await repo.getPage(collection.id))!;
    columns = readColumns(after.properties);
    expect(columns.map((c) => c.name)).not.toContain("Escritor");
    expect(readView(after.properties).sort).toBeUndefined();
    expect(readValues((await repo.getPage(row.id))!.properties)).toEqual({
      [col("Valoración").id]: 4,
    });
  });

  it("opciones: añadir, renombrar y eliminar (las filas pierden ese valor)", async () => {
    const { collection, col } = await books();
    const state = col("Estado");
    const row = await repo.createRow(collection.id, "Dune");
    await repo.saveRowValue(row.id, state.id, state.options![2].id);

    await repo.addColumnOption(collection.id, state.id, "Abandonado");
    await repo.renameColumnOption(collection.id, state.id, state.options![0].id, "Pendiente");
    let current = readColumns((await repo.getPage(collection.id))!.properties).find((c) => c.id === state.id)!;
    expect(current.options!.map((o) => o.label)).toEqual(["Pendiente", "Leyendo", "Leído", "Abandonado"]);

    await repo.deleteColumnOption(collection.id, state.id, state.options![2].id);
    current = readColumns((await repo.getPage(collection.id))!.properties).find((c) => c.id === state.id)!;
    expect(current.options!.map((o) => o.label)).toEqual(["Pendiente", "Leyendo", "Abandonado"]);
    expect(readValues((await repo.getPage(row.id))!.properties)).toEqual({});
  });

  it("cambiar el tipo convierte los valores y devuelve cuántos se perdieron", async () => {
    const { collection, col } = await books();
    const author = col("Autor");
    const r1 = await repo.createRow(collection.id, "A");
    const r2 = await repo.createRow(collection.id, "B");
    await repo.saveRowValue(r1.id, author.id, "12");
    await repo.saveRowValue(r2.id, author.id, "Borges");

    const lost = await repo.changeCollectionColumnType(collection.id, author.id, "number");
    expect(lost).toBe(1);
    expect(readValues((await repo.getPage(r1.id))!.properties)[author.id]).toBe(12);
    expect(readValues((await repo.getPage(r2.id))!.properties)[author.id]).toBeUndefined();
    const column = readColumns((await repo.getPage(collection.id))!.properties).find((c) => c.id === author.id)!;
    expect(column.type).toBe("number");
  });

  it("papelera: la colección se lleva sus filas; una fila se borra y restaura sola", async () => {
    const { collection } = await books();
    const a = await repo.createRow(collection.id, "A");
    const b = await repo.createRow(collection.id, "B");

    await repo.trashPage(a.id);
    expect((await repo.getPage(a.id))!.deletedAt).not.toBeNull();
    expect((await repo.getPage(b.id))!.deletedAt).toBeNull();
    await repo.restorePage(a.id);
    expect((await repo.getPage(a.id))!.deletedAt).toBeNull();
    expect((await repo.getPage(a.id))!.parentId).toBe(collection.id);

    await repo.trashPage(collection.id);
    for (const id of [collection.id, a.id, b.id]) {
      expect((await repo.getPage(id))!.deletedAt).not.toBeNull();
    }
    await repo.restorePage(collection.id);
    for (const id of [collection.id, a.id, b.id]) {
      expect((await repo.getPage(id))!.deletedAt).toBeNull();
    }
    expect((await repo.getPage(b.id))!.parentId).toBe(collection.id);

    await repo.trashPage(collection.id);
    await repo.deletePagePermanently(collection.id);
    expect(await repo.listPages()).toHaveLength(0);
  });

  it("convertir en colección conserva properties y exige una página sin subpáginas", async () => {
    const page = await repo.createPage({ title: "Lecturas" });
    await repo.savePageCategory(page.id, "ocio");
    expect(await repo.convertToCollection(page.id)).toBe(true);
    const stored = (await repo.getPage(page.id))!;
    expect(stored.kind).toBe("collection");
    expect(stored.properties).toEqual({ categoria: "ocio", columns: [] });
    expect(await repo.convertToCollection(page.id)).toBe(false);

    const parent = await repo.createPage({ title: "Madre" });
    await repo.createPage({ parentId: parent.id });
    expect(await repo.convertToCollection(parent.id)).toBe(false);
    expect((await repo.getPage(parent.id))!.kind).toBe("page");
  });

  it("guarda la preferencia de vista en la colección sin tocar las columnas", async () => {
    const { collection, col } = await books();
    await repo.saveCollectionView(collection.id, {
      sort: { columnId: col("Autor").id, dir: "desc" },
      filter: { columnId: col("Estado").id, value: "x" },
    });
    const stored = (await repo.getPage(collection.id))!;
    expect(readView(stored.properties)).toEqual({
      sort: { columnId: col("Autor").id, dir: "desc" },
      filter: { columnId: col("Estado").id, value: "x" },
    });
    expect(readColumns(stored.properties)).toHaveLength(4);
  });
});
