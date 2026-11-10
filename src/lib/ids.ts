/** Genera un id único con prefijo legible, p. ej. `habit-3f2a…`. */
export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
