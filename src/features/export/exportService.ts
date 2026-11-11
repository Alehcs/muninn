import { listHabits } from "@/features/habits/storage/habitRepository";
import { getLocalDate } from "@/features/habits/utils/date";
import { listPages } from "@/features/pages/storage/pageRepository";
import type { Page } from "@/features/pages/types";
import {
  listRoadmapItems,
  listRoadmapSections,
  listRoadmaps,
} from "@/features/roadmap/storage/roadmapRepository";
import { listTodoItems } from "@/features/todos/storage/todoRepository";
import { isTauri } from "@/lib/platform/env";
import { saveTextFile } from "@/lib/platform/files";
import {
  buildMarkdownExport,
  concatenateExport,
  singlePageToMarkdown,
  type ExportData,
  type ExportFile,
} from "./markdownExport";

const MARKDOWN_FILTERS = [{ name: "Markdown", extensions: ["md"] }];

/** Lee de la base todo lo que se exporta. */
export async function loadExportData(): Promise<ExportData> {
  const [pages, todos, roadmaps, habits] = await Promise.all([
    listPages(),
    listTodoItems(),
    listRoadmaps(),
    listHabits(),
  ]);
  const lists = [];
  for (const roadmap of roadmaps) {
    lists.push({
      roadmap,
      sections: await listRoadmapSections(roadmap.id),
      items: await listRoadmapItems(roadmap.id),
    });
  }
  return { pages, todos, lists, habits };
}

export type ExportAllResult =
  /** App de escritorio: se creó una subcarpeta con `count` archivos. */
  | { kind: "folder"; path: string; count: number }
  /** Navegador: se descargó un único archivo con todo concatenado. */
  | { kind: "download"; fileName: string; count: number }
  | { kind: "cancelled" };

interface ExportFilesResult {
  path: string;
  count: number;
}

/**
 * "Exportar todo…": en la app de escritorio pide una carpeta y escribe dentro
 * una subcarpeta nueva (nunca sobrescribe). En el navegador de desarrollo no
 * hay carpetas: descarga un único `.md` con todos los archivos concatenados.
 */
export async function exportAllMarkdown(): Promise<ExportAllResult> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const dir = await open({
      directory: true,
      multiple: false,
      title: "Elige dónde crear la carpeta de exportación",
    });
    if (dir === null || Array.isArray(dir)) return { kind: "cancelled" };

    const files: ExportFile[] = buildMarkdownExport(await loadExportData());
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<ExportFilesResult>("export_files", { dir, files });
    return { kind: "folder", path: result.path, count: result.count };
  }

  const files = buildMarkdownExport(await loadExportData());
  const fileName = `muninn-export-${getLocalDate()}.md`;
  const saved = await saveTextFile(
    { defaultName: fileName, filters: MARKDOWN_FILTERS },
    () => concatenateExport(files),
  );
  return saved === null ? { kind: "cancelled" } : { kind: "download", fileName, count: files.length };
}

/** Abre la carpeta exportada en el explorador del sistema (solo app de escritorio). */
export async function revealExportFolder(path: string): Promise<void> {
  if (!isTauri()) return;
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}

/**
 * "Exportar como Markdown…": guarda solo esta página en un `.md` elegido por
 * el usuario (funciona también en el navegador, como descarga). `page` debe
 * traer el título y el contenido más recientes. Devuelve la ruta/nombre, o
 * null si canceló.
 */
export async function exportPageMarkdown(
  page: Page,
  allPages: readonly Page[],
): Promise<string | null> {
  const { fileName, content } = singlePageToMarkdown(page, allPages);
  return saveTextFile({ defaultName: fileName, filters: MARKDOWN_FILTERS }, () => content);
}
