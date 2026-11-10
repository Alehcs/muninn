import { confirm } from "./confirm";

/**
 * Registro mínimo de "hay cambios sin guardar". Cada formulario abierto se
 * marca como sucio (`setFormDirty`) mientras su contenido difiere del inicial.
 * Quien navegue fuera (atajos, barra lateral, pestañas) llama a
 * `confirmDiscardChanges()` antes de desmontar nada.
 */

const dirtyForms = new Set<symbol>();

export function setFormDirty(id: symbol, dirty: boolean): void {
  if (dirty) dirtyForms.add(id);
  else dirtyForms.delete(id);
}

export function hasUnsavedChanges(): boolean {
  return dirtyForms.size > 0;
}

/** Resuelve true si se puede continuar (no hay cambios o el usuario los descarta). */
export async function confirmDiscardChanges(): Promise<boolean> {
  if (!hasUnsavedChanges()) return true;
  return confirm({
    title: "Cambios sin guardar",
    message:
      "Hay un formulario con cambios sin guardar. Si continúas, se perderán.",
    confirmLabel: "Descartar cambios",
    cancelLabel: "Seguir editando",
    destructive: true,
  });
}

/** Solo para tests. */
export function clearDirtyFormsForTesting(): void {
  dirtyForms.clear();
}
