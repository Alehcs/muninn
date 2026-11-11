import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDatabaseForTesting } from "@/lib/db/database";
import { runMigrations } from "@/lib/db/migrations";
import { createTestDatabase, type TestDatabase } from "@/test/testDatabase";
import * as repo from "./pageRepository";

async function ids(filter: (page: Awaited<ReturnType<typeof repo.listPages>>[number]) => boolean) {
  return (await repo.listPages()).filter(filter).map((page) => page.id).sort();
}

describe("pageRepository", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  /** raíz → hija → nieta, y una hermana de la hija. */
  async function family() {
    const root = await repo.createPage({ title: "raíz" });
    const child = await repo.createPage({ title: "hija", parentId: root.id });
    const grand = await repo.createPage({ title: "nieta", parentId: child.id });
    const sibling = await repo.createPage({ title: "hermana", parentId: root.id });
    return { root, child, grand, sibling };
  }

  it("crea páginas Markdown vacías, ordenadas al final de sus hermanas", async () => {
    const a = await repo.createPage();
    const b = await repo.createPage();
    const stored = await repo.getPage(a.id);
    expect(stored).toMatchObject({
      title: "",
      content: "",
      contentFormat: "markdown",
      kind: "page",
      parentId: null,
      pinned: false,
      deletedAt: null,
      properties: {},
    });
    expect((await repo.getPage(b.id))!.sortOrder).toBe(1);
  });

  it("guardar el cuerpo pasa la página a markdown y actualiza updated_at", async () => {
    await test.db.execute(
      `INSERT INTO pages (id, title, content, content_format, created_at, updated_at)
       VALUES ('v', 'Vieja', 'a\nb', 'plain', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')`,
    );
    const saved = await repo.savePageContent("v", "a\\\nb");
    const page = (await repo.getPage("v"))!;
    expect(page.content).toBe("a\\\nb");
    expect(page.contentFormat).toBe("markdown");
    expect(page.updatedAt).toBe(saved.updatedAt);
    expect(page.createdAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("fijar no cambia updated_at; la categoría vive en properties", async () => {
    const page = await repo.createPage({ title: "x" });
    await repo.setPagePinned(page.id, true);
    const pinned = (await repo.getPage(page.id))!;
    expect(pinned.pinned).toBe(true);
    expect(pinned.updatedAt).toBe(page.updatedAt);

    await repo.savePageCategory(page.id, "  ideas ");
    expect((await repo.getPage(page.id))!.properties).toEqual({ categoria: "ideas" });
    await repo.savePageCategory(page.id, "");
    expect((await repo.getPage(page.id))!.properties).toEqual({});
  });

  it("mover cambia la madre y rechaza ciclos", async () => {
    const { root, child, grand, sibling } = await family();
    await repo.movePage(grand.id, sibling.id);
    expect((await repo.getPage(grand.id))!.parentId).toBe(sibling.id);

    await expect(repo.movePage(root.id, grand.id)).rejects.toThrow();
    await expect(repo.movePage(child.id, child.id)).rejects.toThrow();
    await repo.movePage(grand.id, null);
    expect((await repo.getPage(grand.id))!.parentId).toBeNull();
  });

  it("la papelera marca la página y sus descendientes con la misma fecha", async () => {
    const { root, child, grand, sibling } = await family();
    const at = await repo.trashPage(child.id);

    const pages = await repo.listPages();
    const byId = Object.fromEntries(pages.map((page) => [page.id, page]));
    expect(byId[child.id].deletedAt).toBe(at);
    expect(byId[grand.id].deletedAt).toBe(at);
    expect(byId[root.id].deletedAt).toBeNull();
    expect(byId[sibling.id].deletedAt).toBeNull();
  });

  it("restaurar devuelve la página y solo los descendientes que se fueron con ella", async () => {
    const { root, child, grand } = await family();
    // La nieta se borra antes, por su cuenta, con otra marca.
    await repo.trashPage(grand.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.trashPage(root.id);

    await repo.restorePage(root.id);
    const pages = await repo.listPages();
    const active = pages.filter((page) => page.deletedAt === null).map((page) => page.id);
    expect(active).toContain(root.id);
    expect(active).toContain(child.id);
    expect(active).not.toContain(grand.id); // seguía en la papelera antes
    expect(pages.find((page) => page.id === grand.id)!.deletedAt).not.toBeNull();
  });

  it("restaurar una hija cuya madre sigue en la papelera la devuelve a la raíz", async () => {
    const { root, child } = await family();
    const orphanRoot = await repo.trashPage(child.id);
    expect(orphanRoot).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.trashPage(root.id);

    await repo.restorePage(child.id);
    const page = (await repo.getPage(child.id))!;
    // Su marca era distinta de la de la madre, pero la madre no se restauró.
    expect(page.deletedAt).toBeNull();
    expect(page.parentId).toBeNull();
    expect((await repo.getPage(root.id))!.deletedAt).not.toBeNull();
  });

  it("eliminar definitivamente solo funciona desde la papelera y borra su subárbol borrado", async () => {
    const { root, child, grand, sibling } = await family();

    await repo.deletePagePermanently(child.id); // activa: no hace nada
    expect(await repo.getPage(child.id)).not.toBeNull();

    await repo.trashPage(child.id);
    await repo.deletePagePermanently(child.id);
    expect(await repo.getPage(child.id)).toBeNull();
    expect(await repo.getPage(grand.id)).toBeNull();
    expect(await repo.getPage(root.id)).not.toBeNull();
    expect(await repo.getPage(sibling.id)).not.toBeNull();
  });

  it("una descendiente activa de una página borrada para siempre sube a la raíz", async () => {
    const { root, child } = await family();
    await repo.trashPage(root.id);
    await repo.restorePage(child.id); // sale a la raíz
    await repo.movePage(child.id, root.id); // se vuelve a colgar de una madre en papelera
    await repo.deletePagePermanently(root.id);

    expect(await repo.getPage(root.id)).toBeNull();
    const kept = (await repo.getPage(child.id))!;
    expect(kept.deletedAt).toBeNull();
    expect(kept.parentId).toBeNull();
  });

  it("nada se purga solo: tras trashPage las filas siguen ahí", async () => {
    const { root } = await family();
    await repo.trashPage(root.id);
    expect(await ids(() => true)).toHaveLength(4);
  });
});

describe("pageRepository y tareas enlazadas", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  async function linkedTodo(id: string, pageId: string | null) {
    await test.db.execute(
      `INSERT INTO todo_items
         (id, title, completed, order_index, created_at, updated_at, page_id)
       VALUES ($1, $1, 0, 1, 'x', 'x', $2)`,
      [id, pageId],
    );
  }

  async function pageIdOf(id: string) {
    const rows = await test.db.select<{ page_id: string | null }[]>(
      "SELECT page_id FROM todo_items WHERE id = $1",
      [id],
    );
    return rows[0].page_id;
  }

  it("mandar a la papelera no toca las tareas", async () => {
    const page = await repo.createPage({ title: "proyecto" });
    await linkedTodo("t1", page.id);
    await repo.trashPage(page.id);
    expect(await pageIdOf("t1")).toBe(page.id);
  });

  it("eliminar definitivamente conserva las tareas, ahora sin página", async () => {
    const root = await repo.createPage({ title: "raíz" });
    const child = await repo.createPage({ title: "hija", parentId: root.id });
    const other = await repo.createPage({ title: "otra" });
    await linkedTodo("t1", root.id);
    await linkedTodo("t2", child.id);
    await linkedTodo("t3", other.id);
    await linkedTodo("t4", null);

    await repo.trashPage(root.id);
    await repo.deletePagePermanently(root.id);

    const count = await test.db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM todo_items");
    expect(count[0].n).toBe(4);
    expect(await pageIdOf("t1")).toBeNull();
    expect(await pageIdOf("t2")).toBeNull();
    expect(await pageIdOf("t3")).toBe(other.id);
  });

  it("sobre una página activa no hace nada, tampoco con sus tareas", async () => {
    const page = await repo.createPage({ title: "viva" });
    await linkedTodo("t1", page.id);
    await repo.deletePagePermanently(page.id);
    expect(await pageIdOf("t1")).toBe(page.id);
  });
});

describe("movePage y colecciones", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  it("rechaza mover una página normal dentro de una colección", async () => {
    const collection = await repo.createCollection({ parentId: null });
    const page = await repo.createPage({ title: "suelta" });
    await expect(repo.movePage(page.id, collection.id)).rejects.toThrow(/colección/);
    expect((await repo.getPage(page.id))?.parentId).toBeNull();
  });

  it("rechaza meter una colección dentro de otra", async () => {
    const a = await repo.createCollection({ parentId: null });
    const b = await repo.createCollection({ parentId: null });
    await expect(repo.movePage(b.id, a.id)).rejects.toThrow(/colección/);
  });

  it("permite que una fila cambie de colección o salga a la raíz, conservando sus valores", async () => {
    const a = await repo.createCollection({ parentId: null });
    const b = await repo.createCollection({ parentId: null });
    const row = await repo.createRow(a.id, "fila", { col: "x" });

    await repo.movePage(row.id, b.id);
    expect((await repo.getPage(row.id))?.parentId).toBe(b.id);

    await repo.movePage(row.id, null);
    const stored = await repo.getPage(row.id);
    expect(stored?.parentId).toBeNull();
    expect(stored?.properties).toEqual({ values: { col: "x" } });
  });
});
