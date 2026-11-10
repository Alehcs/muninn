import type { Database as SqlJsDatabase, SqlValue } from "sql.js";
import type { SqlDatabase } from "@/lib/db/types";

type NamedParams = Record<string, SqlValue>;

/**
 * Convierte parámetros posicionales (`$1, $2…`) a un objeto con nombre,
 * que es como sql.js los enlaza. `undefined` pasa a null y los booleanos a 0/1.
 */
export function toNamedParams(params?: unknown[]): NamedParams | undefined {
  if (params === undefined || params.length === 0) return undefined;

  const named: NamedParams = {};
  params.forEach((value, index) => {
    let bound: unknown = value;
    if (bound === undefined) bound = null;
    else if (typeof bound === "boolean") bound = bound ? 1 : 0;
    named[`$${index + 1}`] = bound as SqlValue;
  });
  return named;
}

/** Adapta una base de sql.js (en memoria) a la interfaz `SqlDatabase`. */
export function createSqlJsDatabase(db: SqlJsDatabase): SqlDatabase {
  return {
    async select<T>(sql: string, params?: unknown[]): Promise<T> {
      const statement = db.prepare(sql);
      try {
        const named = toNamedParams(params);
        if (named) statement.bind(named);
        const rows: unknown[] = [];
        while (statement.step()) rows.push(statement.getAsObject());
        return rows as T;
      } finally {
        statement.free();
      }
    },

    async execute(sql: string, params?: unknown[]) {
      db.run(sql, toNamedParams(params));
      return { rowsAffected: db.getRowsModified() };
    },
  };
}
