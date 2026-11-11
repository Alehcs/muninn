import { describe, expect, it } from "vitest";
import type { Page } from "../types";
import { pickHomePages } from "./homePages";

function page(id: string, extra: Partial<Page> = {}): Page {
  return {
    id,
    parentId: null,
    title: id,
    content: "",
    contentFormat: "markdown",
    kind: "page",
    properties: {},
    pinned: false,
    sortOrder: 0,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("pickHomePages", () => {
  it("excluye las filas de colecciones, aunque sean lo más reciente", () => {
    const pages = [
      page("libros", { kind: "collection", updatedAt: "2026-01-02T00:00:00.000Z" }),
      page("fila", { parentId: "libros", updatedAt: "2026-02-01T00:00:00.000Z" }),
      page("normal", { updatedAt: "2026-01-03T00:00:00.000Z" }),
    ];
    expect(pickHomePages(pages).map((p) => p.id)).toEqual(["normal", "libros"]);
  });

  it("conserva las subpáginas normales y las colecciones de primer nivel", () => {
    const pages = [
      page("madre"),
      page("hija", { parentId: "madre", updatedAt: "2026-01-05T00:00:00.000Z" }),
      page("col", { kind: "collection" }),
    ];
    expect(pickHomePages(pages).map((p) => p.id)).toContain("hija");
    expect(pickHomePages(pages).map((p) => p.id)).toContain("col");
  });

  it("fijadas primero, sin papelera y con tope", () => {
    const pages = [
      page("vieja", { pinned: true }),
      page("papelera", { deletedAt: "2026-03-01T00:00:00.000Z" }),
      ...Array.from({ length: 8 }, (_, i) =>
        page(`p${i}`, { updatedAt: `2026-01-0${i + 1}T00:00:00.000Z` }),
      ),
    ];
    const picked = pickHomePages(pages).map((p) => p.id);
    expect(picked).toHaveLength(5);
    expect(picked[0]).toBe("vieja");
    expect(picked).not.toContain("papelera");
  });

  it("una fila de una colección en la papelera no oculta a su hermana ni falla", () => {
    const pages = [
      page("col", { kind: "collection", deletedAt: "2026-03-01T00:00:00.000Z" }),
      page("fila", { parentId: "col" }),
    ];
    // La colección está en la papelera: la fila queda suelta y se trata como página.
    expect(pickHomePages(pages).map((p) => p.id)).toEqual(["fila"]);
  });
});
