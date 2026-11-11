import { describe, expect, it } from "vitest";
import { validateBackupFile } from "./backupValidation";

const T = "2026-01-01T00:00:00.000Z";

function habit(id: string) {
  return {
    id,
    name: `Hábito ${id}`,
    type: "check",
    target_value: 1,
    unit: "completado",
    category: null,
    active: 1,
    created_at: T,
    updated_at: T,
  };
}

function log(id: string, habitId: string, date: string) {
  return {
    id,
    habit_id: habitId,
    date,
    value: 1,
    completed: 1,
    note: null,
    created_at: T,
    updated_at: T,
  };
}

function backupV1(overrides: Record<string, unknown> = {}) {
  return {
    metadata: { backupVersion: 1, exportedAt: T, app: "Aurhabits" },
    habits: [habit("h1"), habit("h2")],
    habit_logs: [log("l1", "h1", "2026-01-01"), log("l2", "h2", "2026-01-01")],
    ...overrides,
  };
}

function backupV2(overrides: Record<string, unknown> = {}) {
  return {
    ...backupV1(),
    metadata: { backupVersion: 2, exportedAt: T, app: "Aurhabits" },
    roadmaps: [{ id: "r1", title: "R", description: null, created_at: T, updated_at: T }],
    roadmap_sections: [],
    roadmap_items: [],
    todo_items: [],
    notes: [
      {
        id: "n1",
        title: "N",
        content: "",
        category: null,
        pinned: 0,
        created_at: T,
        updated_at: T,
      },
    ],
    app_metadata: [{ key: "k", value: "v", updated_at: T }],
    ...overrides,
  };
}

describe("validateBackupFile", () => {
  it("acepta un backup v1 válido", () => {
    const result = validateBackupFile(backupV1());
    expect(result.metadata.backupVersion).toBe(1);
    expect(result.habits).toHaveLength(2);
  });

  it("sigue aceptando backups antiguos con app \"Aurhabits\" y acepta \"Muninn\"", () => {
    const old = backupV1();
    expect(old.metadata.app).toBe("Aurhabits");
    expect(validateBackupFile(old).habits).toHaveLength(2);
    const nuevo = backupV1({ metadata: { backupVersion: 1, exportedAt: T, app: "Muninn" } });
    expect(validateBackupFile(nuevo).habits).toHaveLength(2);
  });

  it("rechaza un backup de otra app", () => {
    const bad = backupV1({ metadata: { backupVersion: 1, exportedAt: T, app: "Otra" } });
    expect(() => validateBackupFile(bad)).toThrow("no corresponde a Muninn");
  });

  it("acepta un backup v2 válido", () => {
    const result = validateBackupFile(backupV2());
    expect(result.metadata.backupVersion).toBe(2);
    expect("notes" in result && result.notes).toHaveLength(1);
  });

  it("acepta un backup v3 con páginas y rechaza uno v3 sin ellas", () => {
    const page = {
      id: "p1",
      parent_id: null,
      title: "P",
      icon: null,
      content: "# x",
      content_format: "markdown",
      kind: "page",
      properties: "{}",
      pinned: 0,
      sort_order: 0,
      deleted_at: null,
      created_at: T,
      updated_at: T,
    };
    const v3 = { ...backupV2(), metadata: { backupVersion: 3, exportedAt: T, app: "Aurhabits" } };
    expect(() => validateBackupFile(v3)).toThrow(/páginas/);
    const ok = validateBackupFile({ ...v3, pages: [page] });
    expect(ok.metadata.backupVersion).toBe(3);
    expect("pages" in ok && ok.pages).toHaveLength(1);
    expect(() =>
      validateBackupFile({ ...v3, pages: [{ ...page, content_format: "html" }] }),
    ).toThrow(/formato/);
    expect(() =>
      validateBackupFile({ ...v3, pages: [{ ...page, properties: "no json" }] }),
    ).toThrow(/JSON/);
    expect(() => validateBackupFile({ ...v3, pages: [page, page] })).toThrow(/duplicado/);

    // Colecciones y filas son páginas con kind y properties propios.
    const collection = {
      ...page,
      id: "c1",
      kind: "collection",
      properties: '{"columns":[{"id":"a","name":"Autor","type":"text"}]}',
    };
    const row = { ...page, id: "r1", parent_id: "c1", properties: '{"values":{"a":"Borges"}}' };
    const withCollection = validateBackupFile({ ...v3, pages: [collection, row] });
    expect("pages" in withCollection && withCollection.pages).toHaveLength(2);
  });

  describe("tareas (columnas de la v4)", () => {
    const page = {
      id: "p1",
      parent_id: null,
      title: "P",
      icon: null,
      content: "",
      content_format: "markdown",
      kind: "page",
      properties: "{}",
      pinned: 0,
      sort_order: 0,
      deleted_at: null,
      created_at: T,
      updated_at: T,
    };
    const oldTodo = {
      id: "t1",
      title: "Tarea",
      notes: null,
      completed: 0,
      order_index: 1,
      created_at: T,
      updated_at: T,
      completed_at: null,
    };
    const v3 = (todo: object) => ({
      ...backupV2({ todo_items: [todo] }),
      metadata: { backupVersion: 3, exportedAt: T, app: "Aurhabits" },
      pages: [page],
    });
    const v4 = (todo: object) => ({
      ...v3(todo),
      metadata: { backupVersion: 4, exportedAt: T, app: "Aurhabits" },
    });
    const newTodo = { ...oldTodo, due_date: "2026-11-17", priority: 2, page_id: "p1" };

    it("v1-v3: las columnas que faltan toman su valor por defecto", () => {
      for (const file of [backupV2({ todo_items: [oldTodo] }), v3(oldTodo)]) {
        const result = validateBackupFile(file);
        expect("todo_items" in result && result.todo_items[0]).toMatchObject({
          due_date: null,
          priority: 0,
          page_id: null,
        });
      }
    });

    it("v4: acepta las columnas nuevas", () => {
      const result = validateBackupFile(v4(newTodo));
      expect(result.metadata.backupVersion).toBe(4);
      expect("todo_items" in result && result.todo_items[0]).toMatchObject({
        due_date: "2026-11-17",
        priority: 2,
        page_id: "p1",
      });
    });

    it("v4: exige las columnas y valida fecha y prioridad", () => {
      expect(() => validateBackupFile(v4(oldTodo))).toThrow(/due_date/);
      expect(() => validateBackupFile(v4({ ...newTodo, due_date: "17/11/2026" }))).toThrow(/due_date/);
      expect(() => validateBackupFile(v4({ ...newTodo, priority: 4 }))).toThrow(/priority/);
    });
  });

  it("rechaza una versión desconocida", () => {
    const bad = backupV1({
      metadata: { backupVersion: 5, exportedAt: T, app: "Aurhabits" },
    });
    expect(() => validateBackupFile(bad)).toThrow(/versión/);
  });

  it("rechaza ids de hábito duplicados", () => {
    const bad = backupV1({ habits: [habit("h1"), habit("h1")] });
    expect(() => validateBackupFile(bad)).toThrow(/duplicado/);
  });

  it("rechaza dos logs del mismo hábito y día", () => {
    const bad = backupV1({
      habit_logs: [log("l1", "h1", "2026-01-01"), log("l2", "h1", "2026-01-01")],
    });
    expect(() => validateBackupFile(bad)).toThrow(/más de un log/);
  });

  it("rechaza ids duplicados en tablas v2", () => {
    const note = backupV2().notes[0];
    const bad = backupV2({ notes: [note, note] });
    expect(() => validateBackupFile(bad)).toThrow(/duplicado/);
  });
});
