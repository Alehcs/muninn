import { describe, expect, it } from "vitest";
import {
  createSnapshot,
  createSnapshotOrWarn,
  ensureDailySnapshot,
  listSnapshots,
  pruneSnapshots,
  revealBackupsDir,
} from "./snapshots";

describe("copias fuera de Tauri", () => {
  it("son no-ops que no fallan", async () => {
    expect(await createSnapshot("diario")).toBeNull();
    expect(await listSnapshots()).toEqual([]);
    await expect(pruneSnapshots()).resolves.toBeUndefined();
    await expect(revealBackupsDir()).resolves.toBeUndefined();
    await expect(ensureDailySnapshot()).resolves.toBeUndefined();
    expect(await createSnapshotOrWarn("antes-de-importar")).toBe(true);
  });
});
