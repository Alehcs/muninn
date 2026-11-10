import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDatabaseForTesting } from "@/lib/db/database";
import { runMigrations } from "@/lib/db/migrations";
import { createTestDatabase, type TestDatabase } from "@/test/testDatabase";
import { reorderVisible } from "@/lib/reorder";
import * as repo from "../storage/roadmapRepository";
import type { RoadmapItem, RoadmapSection } from "../types";
import {
  applyItemOrder,
  applySectionOrder,
  buildItemOrderStatements,
  buildSectionOrderStatements,
} from "./roadmapOrder";
import { filterVisibleItems } from "./roadmapProgress";

const NOW = "2026-02-02T00:00:00.000Z";

function item(id: string, over: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    id,
    roadmapId: "r1",
    sectionId: "s1",
    section: "S1",
    sectionOrder: 1,
    title: id,
    completed: false,
    orderIndex: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

describe("filterVisibleItems", () => {
  const items = [item("a"), item("b", { completed: true }), item("c")];

  it("sin ocultar devuelve todos", () => {
    expect(filterVisibleItems(items, false)).toHaveLength(3);
  });

  it("ocultando quita los completados y conserva el orden", () => {
    expect(filterVisibleItems(items, true).map((i) => i.id)).toEqual(["a", "c"]);
  });
});

describe("sentencias de reordenación", () => {
  it("renumera items 1…n con una sentencia cada uno", () => {
    const statements = buildItemOrderStatements(["x", "y", "z"], NOW);
    expect(statements.map((s) => s.params)).toEqual([
      [1, NOW, "x"],
      [2, NOW, "y"],
      [3, NOW, "z"],
    ]);
  });

  it("renumera secciones y copia el orden a sus items", () => {
    const statements = buildSectionOrderStatements(["b", "a"], NOW);
    expect(statements).toHaveLength(4);
    expect(statements[0].params).toEqual([1, NOW, "b"]);
    expect(statements[1].params).toEqual([1, "b"]);
    expect(statements[2].params).toEqual([2, NOW, "a"]);
  });
});

describe("estado local tras reordenar", () => {
  it("applyItemOrder reasigna orderIndex y reordena", () => {
    const items = [
      item("a", { orderIndex: 1 }),
      item("b", { orderIndex: 2 }),
      item("c", { orderIndex: 3 }),
    ];
    const next = applyItemOrder(items, "s1", ["c", "a", "b"]);
    expect(next.map((i) => [i.id, i.orderIndex])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ]);
  });

  it("applySectionOrder reasigna orden de secciones y de sus items", () => {
    const section = (id: string, order: number): RoadmapSection => ({
      id,
      roadmapId: "r1",
      name: id,
      order,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const result = applySectionOrder(
      [section("s1", 1), section("s2", 2)],
      [item("a", { sectionId: "s1", sectionOrder: 1 }), item("b", { sectionId: "s2", sectionOrder: 2 })],
      ["s2", "s1"],
    );
    expect(result.sections.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(result.items.map((i) => [i.id, i.sectionOrder])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });
});

describe("persistencia del orden (SQLite)", () => {
  let test: TestDatabase;

  beforeEach(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
    await test.db.execute(`INSERT INTO roadmaps VALUES ('r1','Ruta',NULL,$1,$1)`, [NOW]);
    await test.db.execute(
      `INSERT INTO roadmap_sections VALUES ('s1','r1','Uno',1,$1,$1),('s2','r1','Dos',2,$1,$1)`,
      [NOW],
    );
    for (const [id, sec, order, done] of [
      ["a", "s1", 1, 0],
      ["b", "s1", 2, 1],
      ["c", "s1", 3, 0],
      ["d", "s2", 1, 0],
    ] as const) {
      await test.db.execute(
        `INSERT INTO roadmap_items
           (id, roadmap_id, section_id, section, section_order, title, completed,
            order_index, created_at, updated_at)
         VALUES ($1,'r1',$2,$3,$4,$1,$5,$6,$7,$7)`,
        [id, sec, sec === "s1" ? "Uno" : "Dos", sec === "s1" ? 1 : 2, done, order, NOW],
      );
    }
  });

  afterEach(() => {
    setDatabaseForTesting(null);
  });

  it("guarda el orden de los items y respeta los ocultos", async () => {
    // b (completado) está oculto: se mueve c delante de a.
    const all = ["a", "b", "c"];
    const next = reorderVisible(all, ["a", "c"], "c", "a");
    await repo.reorderRoadmapItems(next);

    const items = await repo.listRoadmapItems("r1");
    expect(items.filter((i) => i.sectionId === "s1").map((i) => [i.id, i.orderIndex])).toEqual([
      ["c", 1],
      ["b", 2],
      ["a", 3],
    ]);
    // La otra sección no se toca.
    expect(items.find((i) => i.id === "d")?.orderIndex).toBe(1);
  });

  it("guarda el orden de las secciones y lo copia a los items", async () => {
    await repo.reorderRoadmapSections(["s2", "s1"]);

    const sections = await repo.listRoadmapSections("r1");
    expect(sections.map((s) => [s.id, s.order])).toEqual([
      ["s2", 1],
      ["s1", 2],
    ]);
    const items = await repo.listRoadmapItems("r1");
    expect(items[0].id).toBe("d");
    expect(items.find((i) => i.id === "a")?.sectionOrder).toBe(2);
  });

  it("editar un item conserva su posición si no cambia de sección", async () => {
    await repo.updateRoadmapItem("a", { sectionId: "s1", title: "A editado" });
    const a = (await repo.listRoadmapItems("r1")).find((i) => i.id === "a");
    expect(a?.title).toBe("A editado");
    expect(a?.orderIndex).toBe(1);
  });

  it("mover un item a otra sección lo envía al final de esa sección", async () => {
    await repo.updateRoadmapItem("a", { sectionId: "s2", title: "a" });
    const a = (await repo.listRoadmapItems("r1")).find((i) => i.id === "a");
    expect(a?.sectionId).toBe("s2");
    expect(a?.orderIndex).toBe(2);
  });
});
