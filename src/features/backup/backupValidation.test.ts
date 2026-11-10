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

  it("acepta un backup v2 válido", () => {
    const result = validateBackupFile(backupV2());
    expect(result.metadata.backupVersion).toBe(2);
    expect("notes" in result && result.notes).toHaveLength(1);
  });

  it("rechaza una versión desconocida", () => {
    const bad = backupV1({
      metadata: { backupVersion: 3, exportedAt: T, app: "Aurhabits" },
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
