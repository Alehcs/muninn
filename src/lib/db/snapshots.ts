import { isTauri } from "@/lib/platform/env";
import { notify } from "@/lib/notify";
import { getLocalDate } from "@/features/habits/utils/date";
import { DATABASE_FILE } from "./file";

/** Copia de seguridad automática de la base (archivo `.db` en `backups/`). */
export interface SnapshotInfo {
  name: string;
  path: string;
  reason: string;
  /** Fecha local `YYYY-MM-DDTHH:MM:SS`. */
  createdAt: string;
  sizeBytes: number;
}

interface RawSnapshot {
  name: string;
  path: string;
  reason: string;
  created_at: string;
  size_bytes: number;
}

function fromRaw(raw: RawSnapshot): SnapshotInfo {
  return {
    name: raw.name,
    path: raw.path,
    reason: raw.reason,
    createdAt: raw.created_at,
    sizeBytes: raw.size_bytes,
  };
}

async function call<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, { file: DATABASE_FILE, ...args });
}

/** Crea una copia consistente. Fuera de Tauri no hace nada y devuelve `null`. */
export async function createSnapshot(reason: string): Promise<SnapshotInfo | null> {
  if (!isTauri()) return null;
  return fromRaw(await call<RawSnapshot>("db_snapshot", { reason }));
}

/** Copias existentes, de la más reciente a la más antigua. Fuera de Tauri: lista vacía. */
export async function listSnapshots(): Promise<SnapshotInfo[]> {
  if (!isTauri()) return [];
  const raw = await call<RawSnapshot[]>("list_snapshots", {});
  return raw.map(fromRaw);
}

/** Aplica la política de retención (14 diarias, 10 de cada otro motivo). */
export async function pruneSnapshots(): Promise<void> {
  if (!isTauri()) return;
  await call<number>("prune_snapshots", {});
}

/** Abre la carpeta de copias en el explorador. Fuera de Tauri no hace nada. */
export async function revealBackupsDir(): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<string>("reveal_backups_dir");
}

/**
 * Igual que `createSnapshot`, pero un fallo no bloquea la app: se registra y
 * se muestra un aviso discreto. Devuelve `true` si todo fue bien.
 */
export async function createSnapshotOrWarn(
  reason: string,
  warning = "No se pudo crear la copia automática de tus datos.",
): Promise<boolean> {
  try {
    await createSnapshot(reason);
    return true;
  } catch (error) {
    console.error(`Copia automática "${reason}" fallida`, error);
    notify.info(warning);
    return false;
  }
}

/**
 * Al arrancar: si todavía no hay copia `diario` de hoy, la crea y luego poda.
 * Nunca lanza; un fallo se registra y se avisa.
 */
export async function ensureDailySnapshot(): Promise<void> {
  if (!isTauri()) return;
  try {
    const today = getLocalDate();
    const existing = await listSnapshots();
    const hasToday = existing.some(
      (snapshot) => snapshot.reason === "diario" && snapshot.createdAt.startsWith(today),
    );
    if (!hasToday) await createSnapshot("diario");
    await pruneSnapshots();
  } catch (error) {
    console.error("Copia automática diaria fallida", error);
    notify.info("No se pudo crear la copia automática diaria.");
  }
}
