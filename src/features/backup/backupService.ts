import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { BACKUP_VERSION, type BackupFile } from "./backupTypes";
import { validateBackupFile } from "./backupValidation";
import * as backupRepo from "@/features/habits/storage/backupRepository";
import { getLocalDate } from "@/features/habits/utils/date";

function getDefaultBackupName(): string {
  return `aurhabits-backup-${getLocalDate()}.json`;
}

export async function exportBackup(): Promise<string | null> {
  const path = await save({
    defaultPath: getDefaultBackupName(),
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (path === null) return null;

  const data = await backupRepo.readBackupData();
  const backup: BackupFile = {
    metadata: {
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      app: "Aurhabits",
    },
    ...data,
  };

  await writeTextFile(path, JSON.stringify(backup, null, 2));
  return path;
}

export async function pickBackupFile(): Promise<BackupFile | null> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (path === null || Array.isArray(path)) return null;

  const contents = await readTextFile(path);
  return validateBackupFile(JSON.parse(contents));
}

export async function importBackup(backup: BackupFile): Promise<void> {
  await backupRepo.replaceBackupData(backup);
}
