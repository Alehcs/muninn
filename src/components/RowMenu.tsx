import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import IconButton from "@/components/IconButton";
import { cn } from "@/utils/cn";

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
}

interface RowMenuProps {
  /** Nombre accesible del botón que abre el menú. */
  label: string;
  items: RowMenuItem[];
  /** Icono del botón (por defecto "⋯"). */
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

/**
 * Menú secundario de una fila (⋯). Accesible: el botón anuncia `aria-haspopup`
 * y `aria-expanded`; dentro, flechas arriba/abajo, Inicio/Fin, Enter para
 * elegir y Escape para cerrar devolviendo el foco al botón.
 */
export default function RowMenu({
  label,
  items,
  icon = MoreHorizontal,
  disabled,
  className,
}: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      rootRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    }
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ),
    );
    const index = entries.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "ArrowDown":
        entries[(index + 1) % entries.length]?.focus();
        break;
      case "ArrowUp":
        entries[(index - 1 + entries.length) % entries.length]?.focus();
        break;
      case "Home":
        entries[0]?.focus();
        break;
      case "End":
        entries[entries.length - 1]?.focus();
        break;
      case "Tab":
        setOpen(false);
        return;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <IconButton
        ref={triggerRef}
        icon={icon}
        label={label}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      />
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-30 mt-1 flex min-w-36 flex-col rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40",
                item.danger ? "text-danger" : "text-text",
              )}
            >
              {item.icon && (
                <item.icon size={14} strokeWidth={1.75} aria-hidden="true" />
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
