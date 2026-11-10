import { isTauri } from "./env";

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveTextFileOptions {
  defaultName: string;
  filters?: FileFilter[];
}

/**
 * Guarda un texto en un archivo. El contenido se pide solo después de que el
 * usuario elige destino. Devuelve la ruta (Tauri) o el nombre descargado
 * (navegador), o `null` si canceló.
 */
export async function saveTextFile(
  options: SaveTextFileOptions,
  getContent: () => Promise<string> | string,
): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      defaultPath: options.defaultName,
      filters: options.filters,
    });
    if (path === null) return null;

    await writeTextFile(path, await getContent());
    return path;
  }

  const blob = new Blob([await getContent()], { type: "text/plain" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = options.defaultName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
  return options.defaultName;
}

/** Pide al usuario un archivo de texto y devuelve su contenido (`null` si canceló). */
export async function openTextFile(
  options: { filters?: FileFilter[] } = {},
): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await open({
      multiple: false,
      directory: false,
      filters: options.filters,
    });
    if (path === null || Array.isArray(path)) return null;

    return readTextFile(path);
  }

  return new Promise<string | null>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    const extensions = options.filters?.flatMap((f) => f.extensions) ?? [];
    if (extensions.length > 0) {
      input.accept = extensions.map((ext) => `.${ext}`).join(",");
    }
    input.addEventListener("cancel", () => resolve(null));
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve, reject);
    });
    input.click();
  });
}
