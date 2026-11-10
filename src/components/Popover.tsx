import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

export interface PopoverTriggerApi {
  ref: RefObject<HTMLButtonElement | null>;
  open: boolean;
  /** Atributos de accesibilidad para el botón disparador. */
  ariaProps: {
    "aria-haspopup": "dialog";
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
  };
  toggle: () => void;
}

interface PopoverProps {
  /** Nombre accesible del panel. */
  label: string;
  /** Pinta el botón que abre el panel. */
  trigger: (api: PopoverTriggerApi) => ReactNode;
  /** Contenido del panel; `close` lo cierra devolviendo el foco al botón. */
  children: (close: () => void) => ReactNode;
  className?: string;
}

const PANEL_MARGIN = 8;

/**
 * Panel pequeño anclado a un botón (fecha, prioridad…). Se pinta en el
 * `body` con posición fija, así que no lo recorta ninguna lista con scroll ni
 * se mueve con la fila al arrastrarla. Se cierra con Escape, al hacer clic
 * fuera, al desplazarse o al cambiar el tamaño de la ventana.
 */
export default function Popover({ label, trigger, children, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    const button = triggerRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen((current) => !current);
  }, []);

  // Ajusta la posición para que el panel quepa en la ventana.
  useEffect(() => {
    if (!open || !panelRef.current || !position) return;
    const rect = panelRef.current.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - PANEL_MARGIN;
    const maxTop = window.innerHeight - rect.height - PANEL_MARGIN;
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const left = Math.max(PANEL_MARGIN, Math.min(position.left, maxLeft));
    const top =
      position.top > maxTop && triggerRect
        ? Math.max(PANEL_MARGIN, triggerRect.top - rect.height - 4)
        : position.top;
    if (left !== position.left || top !== position.top) setPosition({ top, left });
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current
      ?.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled)")
      ?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      close(false);
    };
    const handleMove = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      close(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleMove, true);
    window.addEventListener("resize", handleMove);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleMove, true);
      window.removeEventListener("resize", handleMove);
    };
  }, [open, close]);

  return (
    <>
      {trigger({
        ref: triggerRef,
        open,
        toggle,
        ariaProps: {
          "aria-haspopup": "dialog",
          "aria-expanded": open,
          "aria-controls": open ? panelId : undefined,
        },
      })}
      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            style={{ position: "fixed", top: position.top, left: position.left }}
            // Lo que ocurre en el panel no debe activar la fila que lo contiene.
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            }}
            className={cn(
              "z-40 flex min-w-40 flex-col rounded-lg border border-border bg-surface p-1 shadow-lg",
              className,
            )}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}
