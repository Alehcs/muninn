import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDatabaseForTesting } from "@/lib/db/database";
import { runMigrations } from "@/lib/db/migrations";
import { createTestDatabase } from "@/test/testDatabase";
import * as repo from "./todoRepository";

describe("todoRepository", () => {
  beforeEach(async () => {
    const test = await createTestDatabase();
    await runMigrations(test.db);
    setDatabaseForTesting(test.db);
  });

  afterEach(() => setDatabaseForTesting(null));

  it("crea tareas al final con fecha, prioridad y página opcionales", async () => {
    const plain = await repo.insertTodoItem({ title: "A" });
    const full = await repo.insertTodoItem({
      title: "B",
      notes: " nota ",
      dueDate: "2025-11-17",
      priority: 2,
      pageId: "p1",
    });
    expect(plain).toMatchObject({ priority: 0, orderIndex: 1 });
    expect(plain.dueDate).toBeUndefined();
    expect(full.orderIndex).toBe(2);

    const [a, b] = await repo.listTodoItems();
    expect(a).toMatchObject({ title: "A", priority: 0, dueDate: undefined, pageId: undefined });
    expect(b).toMatchObject({
      title: "B",
      notes: "nota",
      dueDate: "2025-11-17",
      priority: 2,
      pageId: "p1",
    });
  });

  it("edición completa y en línea (fecha, prioridad) sin tocar el orden", async () => {
    const item = await repo.insertTodoItem({ title: "A" });
    await repo.insertTodoItem({ title: "B" });

    await repo.setTodoDueDate(item.id, "2025-12-01");
    await repo.setTodoPriority(item.id, 3);
    let stored = (await repo.listTodoItems()).find((todo) => todo.id === item.id)!;
    expect(stored).toMatchObject({ dueDate: "2025-12-01", priority: 3, orderIndex: 1 });

    await repo.setTodoDueDate(item.id, null);
    await repo.updateTodoItem(item.id, { title: "A2", priority: 1, pageId: "p9" });
    stored = (await repo.listTodoItems()).find((todo) => todo.id === item.id)!;
    expect(stored).toMatchObject({
      title: "A2",
      dueDate: undefined,
      priority: 1,
      pageId: "p9",
      orderIndex: 1,
    });
  });

  it("completar y reabrir", async () => {
    const item = await repo.insertTodoItem({ title: "A" });
    await repo.setTodoCompleted(item.id, true);
    expect((await repo.listTodoItems())[0]).toMatchObject({ completed: true });
    expect((await repo.listTodoItems())[0].completedAt).toBeDefined();
    await repo.setTodoCompleted(item.id, false);
    expect((await repo.listTodoItems())[0].completedAt).toBeUndefined();
  });

  it("reordenar guarda las posiciones en una sola transacción", async () => {
    const a = await repo.insertTodoItem({ title: "A" });
    const b = await repo.insertTodoItem({ title: "B" });
    const c = await repo.insertTodoItem({ title: "C" });

    await repo.reorderTodoItems([
      { id: c.id, position: 1 },
      { id: a.id, position: 2 },
      { id: b.id, position: 3 },
    ]);
    expect((await repo.listTodoItems()).map((todo) => todo.title)).toEqual(["C", "A", "B"]);
  });

  it("eliminar quita solo esa tarea", async () => {
    const a = await repo.insertTodoItem({ title: "A" });
    await repo.insertTodoItem({ title: "B" });
    await repo.deleteTodoItem(a.id);
    expect((await repo.listTodoItems()).map((todo) => todo.title)).toEqual(["B"]);
  });
});
