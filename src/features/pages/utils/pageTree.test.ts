import { describe, expect, it } from "vitest";
import type { Page } from "../types";
import { buildTree, canMoveInto, getMoveTargets } from "./pageTree";

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
    createdAt: `2026-01-01T00:00:0${id.length}.000Z`,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

const pages = [
  page("normal"),
  page("otra"),
  page("col", { kind: "collection" }),
  page("col2", { kind: "collection" }),
  page("fila", { parentId: "col" }),
];

const labels = (pageId: string) =>
  getMoveTargets(buildTree(pages), pages, pageId, (p) => p.title).map((t) => t.id);

describe("canMoveInto", () => {
  it("una página normal y una colección no entran en una colección", () => {
    expect(canMoveInto(pages, pages[0], "col")).toBe(false);
    expect(canMoveInto(pages, pages[3], "col")).toBe(false);
    expect(canMoveInto(pages, pages[0], "otra")).toBe(true);
    expect(canMoveInto(pages, pages[0], null)).toBe(true);
  });

  it("una fila sí puede pasar a otra colección o salir", () => {
    expect(canMoveInto(pages, pages[4], "col2")).toBe(true);
    expect(canMoveInto(pages, pages[4], null)).toBe(true);
  });
});

describe("getMoveTargets", () => {
  it("a una página normal no le ofrece colecciones", () => {
    const ids = labels("normal");
    expect(ids).toContain("otra");
    expect(ids).not.toContain("col");
    expect(ids).not.toContain("col2");
  });

  it("a una fila le ofrece las demás colecciones", () => {
    const ids = labels("fila");
    expect(ids).toContain("col2");
    expect(ids).toContain("col");
    expect(ids).toContain(null);
  });
});
