import { useEffect, useRef } from "react";
import { registerPrimaryAction } from "./shortcuts";

/**
 * Registra la acción principal de la vista mientras está montada
 * (Cmd/Ctrl+N la dispara). Pasa `null` para desactivarla temporalmente, p. ej.
 * cuando el formulario ya está abierto. Usa siempre la última función recibida.
 */
export function usePrimaryAction(handler: (() => void) | null): void {
  const ref = useRef(handler);
  ref.current = handler;
  const active = handler !== null;

  useEffect(() => {
    if (!active) return undefined;
    return registerPrimaryAction(() => ref.current?.());
  }, [active]);
}
