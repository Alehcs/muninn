import type { SqlDatabase } from "@/lib/db/types";
import { isTauri } from "./env";

/**
 * Abre la base de datos según el entorno:
 * - Tauri: SQLite real vía `@tauri-apps/plugin-sql`.
 * - Navegador (solo desarrollo): SQLite en memoria con sql.js. Nada se
 *   escribe a disco. Con `?seed=/ruta/archivo.db` se parte de una copia de
 *   ese archivo (servido por Vite), solo lectura.
 * - Navegador en producción: error.
 */
export async function openDatabase(url: string): Promise<SqlDatabase> {
  if (isTauri()) {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    return Database.load(url);
  }

  // Esta condición debe permanecer literal: Vite la sustituye por `false` en
  // producción y el import dinámico (sql.js + wasm) desaparece del bundle.
  if (import.meta.env.DEV) {
    const { openBrowserDatabase } = await import("./browserSqlite");
    return openBrowserDatabase();
  }

  throw new Error(
    "Aurhabits solo puede abrir su base de datos dentro de la aplicación de escritorio.",
  );
}
