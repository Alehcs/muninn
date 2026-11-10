/**
 * Contrato mínimo de base de datos SQL que usa la app.
 * Los repositorios y las migraciones dependen de esta interfaz, no del
 * plugin de Tauri, así que pueden ejecutarse sobre sql.js (navegador, tests).
 * Los parámetros se escriben como `$1, $2…` y se pasan en un array.
 */
export interface SqlDatabase {
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
}
