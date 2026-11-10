import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import { isFullBackup, type BackupFile } from "@/features/backup/backupTypes";
import { isTauri } from "@/lib/platform";
import {
  listSnapshots,
  revealBackupsDir,
  type SnapshotInfo,
} from "@/lib/db/snapshots";
import { notify } from "@/lib/notify";
import {
  exportBackup,
  importBackup,
  pickBackupFile,
} from "@/features/backup/backupService";

interface SettingsViewProps {
  store: HabitsStore;
}

type Notice = { type: "success" | "error" | "info"; text: string } | null;

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Resumen legible de lo que contiene un backup. */
function describeBackup(backup: BackupFile): string {
  const parts = [
    plural(backup.habits.length, "hábito", "hábitos"),
    plural(backup.habit_logs.length, "registro", "registros"),
  ];

  if (isFullBackup(backup)) {
    parts.push(
      plural(backup.notes.length, "nota", "notas"),
      plural(backup.todo_items.length, "tarea", "tareas"),
      `${plural(backup.roadmaps.length, "roadmap", "roadmaps")} (${plural(
        backup.roadmap_items.length,
        "item",
        "items",
      )})`,
    );
  }

  return parts.join(" · ");
}

function formatExportedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
}

const SNAPSHOTS_SHOWN = 10;

/** Motivo de la copia en español, a partir del nombre técnico. */
function describeSnapshotReason(reason: string): string {
  if (reason === "diario") return "Copia diaria";
  if (reason === "antes-de-importar") return "Antes de importar un backup";
  const migration = /^pre-migracion-v(\d+)$/.exec(reason);
  if (migration) {
    return `Antes de actualizar la base de datos (desde la versión ${migration[1]})`;
  }
  return reason;
}

function formatSnapshotDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AutomaticCopies() {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setSnapshots(await listSnapshots());
      setFailed(false);
    } catch (error) {
      console.error("No se pudieron listar las copias", error);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpen = async () => {
    try {
      await revealBackupsDir();
    } catch (error) {
      console.error("No se pudo abrir la carpeta de copias", error);
      notify.error("No se pudo abrir la carpeta de copias.");
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="font-medium">Copias automáticas</h3>
      <p className="mt-1 text-sm text-text-muted">
        Aurhabits guarda por su cuenta copias de tu base de datos (una al día,
        otra antes de actualizarla y otra antes de importar un backup) para que
        un error nunca te deje sin datos.
      </p>

      {failed ? (
        <p className="mt-4 text-sm text-text-muted">
          No se pudo leer la lista de copias.
        </p>
      ) : !isTauri() ? (
        <p className="mt-4 text-sm text-text-muted">
          Las copias solo se crean en la aplicación de escritorio.
        </p>
      ) : snapshots === null ? null : snapshots.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">Todavía no hay copias.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border text-sm">
          {snapshots.slice(0, SNAPSHOTS_SHOWN).map((snapshot) => (
            <li
              key={snapshot.name}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <span>
                <span className="text-text">
                  {formatSnapshotDate(snapshot.createdAt)}
                </span>
                <span className="text-text-muted">
                  {" "}
                  · {describeSnapshotReason(snapshot.reason)}
                </span>
              </span>
              <span className="shrink-0 text-text-muted">
                {formatSize(snapshot.sizeBytes)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isTauri() && (
        <div className="mt-4">
          <Button variant="ghost" onClick={handleOpen}>
            Abrir carpeta
          </Button>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Para restaurar una copia basta con cerrar la app y sustituir el archivo
        de la base de datos por la copia. Si necesitas ayuda, pídelo.
      </p>
    </div>
  );
}

export default function SettingsView({ store }: SettingsViewProps) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiesKey, setCopiesKey] = useState(0);

  const handleExport = async () => {
    try {
      setBusy(true);
      setNotice(null);
      const path = await exportBackup();
      setNotice(
        path
          ? { type: "success", text: "Backup exportado correctamente." }
          : { type: "info", text: "Exportación cancelada." },
      );
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "No se pudo exportar.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePickImport = async () => {
    try {
      setBusy(true);
      setNotice(null);
      const backup = await pickBackupFile();
      if (backup === null) {
        setNotice({ type: "info", text: "Importación cancelada." });
        return;
      }
      setPendingBackup(backup);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "El archivo de backup no es válido.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmImport = async () => {
    if (pendingBackup === null) return;

    try {
      setBusy(true);
      await importBackup(pendingBackup);
      await store.reload({ seedDefaults: false, showLoading: false });
      setPendingBackup(null);
      setCopiesKey((key) => key + 1);
      setNotice({ type: "success", text: "Backup importado correctamente." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "No se pudo importar.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Configuración</h2>
        <p className="text-sm text-text-muted">
          Exporta o restaura tus datos locales de Aurhabits.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h3 className="font-medium">Backup local</h3>
        <p className="mt-1 text-sm text-text-muted">
          El archivo JSON incluye todos tus datos: hábitos y sus registros,
          notas, tareas y roadmaps.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleExport} disabled={busy}>
            Exportar backup
          </Button>
          <Button variant="ghost" onClick={handlePickImport} disabled={busy}>
            Importar backup
          </Button>
        </div>

        {notice && (
          <p className="mt-4 rounded-lg bg-surface-hover px-3 py-2 text-sm text-text-muted">
            {notice.text}
          </p>
        )}
      </div>

      <AutomaticCopies key={copiesKey} />

      {pendingBackup && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">Confirmar importación</h3>
          <p className="mt-2 text-sm text-text-muted">
            {isFullBackup(pendingBackup)
              ? "Esta acción reemplazará todos tus datos actuales (hábitos, registros, notas, tareas y roadmaps) por los del backup seleccionado."
              : "Este backup es de una versión anterior y solo contiene hábitos y registros. Se reemplazarán esos datos; tus notas, tareas y roadmaps actuales no se tocarán."}
          </p>
          <p className="mt-3 text-sm text-text-muted">
            Backup: {describeBackup(pendingBackup)} · exportado el{" "}
            {formatExportedAt(pendingBackup.metadata.exportedAt)}
          </p>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleConfirmImport} disabled={busy}>
              Reemplazar datos
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPendingBackup(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
