import { useState } from "react";
import Button from "@/components/Button";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";
import { isFullBackup, type BackupFile } from "@/features/backup/backupTypes";
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

export default function SettingsView({ store }: SettingsViewProps) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);

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
