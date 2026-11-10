/** Texto recortado, o `undefined` si queda vacío. */
export function optional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? undefined : trimmed;
}

/** Texto recortado, o `null` si queda vacío (para guardar en SQLite). */
export function nullable(value: string | null | undefined): string | null {
  return optional(value) ?? null;
}
