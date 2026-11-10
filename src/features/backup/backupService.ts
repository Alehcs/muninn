import { openTextFile, saveTextFile } from "@/lib/platform/files";
import { BACKUP_VERSION, type BackupFile } from "./backupTypes";
import { validateBackupFile } from "./backupValidation";
import * as backupRepo from "@/features/habits/storage/backupRepository";
import { getLocalDate } from "@/features/habits/utils/date";

function getDefaultBackupName(): string {
  return `aurhabits-backup-${getLocalDate()}.json`;
}

const JSON_FILTERS = [{ name: "JSON", extensions: ["json"] }];

export async function exportBackup(): Promise<string | null> {
  return saveTextFile(
    { defaultName: getDefaultBackupName(), filters: JSON_FILTERS },
    async () => {
      const data = await backupRepo.readBackupData();
      const backup: BackupFile = {
        metadata: {
          backupVersion: BACKUP_VERSION,
          exportedAt: new Date().toISOString(),
          app: "Aurhabits",
        },
        ...data,
      };
      return JSON.stringify(backup, null, 2);
    },
  );
}

export async function pickBackupFile(): Promise<BackupFile | null> {
  const contents = await openTextFile({ filters: JSON_FILTERS });
  if (contents === null) return null;

  return validateBackupFile(JSON.parse(contents));
}

export async function importBackup(backup: BackupFile): Promise<void> {
  await backupRepo.replaceBackupData(backup);
}
