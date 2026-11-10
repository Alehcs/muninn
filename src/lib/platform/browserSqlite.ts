import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { SqlDatabase } from "@/lib/db/types";
import { createSqlJsDatabase } from "./sqlJsAdapter";

/**
 * Solo desarrollo en navegador. Se importa únicamente desde un
 * `import()` protegido por `import.meta.env.DEV` (ver `sqlite.ts`).
 */
async function fetchSeed(): Promise<Uint8Array | undefined> {
  const seed = new URLSearchParams(window.location.search).get("seed");
  if (!seed) return undefined;

  // Solo rutas del propio servidor de Vite, nunca URLs externas.
  if (!seed.startsWith("/") || seed.startsWith("//")) {
    throw new Error("El parámetro ?seed debe ser una ruta que empiece por /.");
  }

  const response = await fetch(seed);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el seed "${seed}" (${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function openBrowserDatabase(): Promise<SqlDatabase> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const seed = await fetchSeed();
  return createSqlJsDatabase(new SQL.Database(seed));
}
