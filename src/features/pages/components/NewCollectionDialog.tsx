import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Table2 } from "lucide-react";
import Button from "@/components/Button";
import { cn } from "@/utils/cn";
import {
  COLLECTION_TEMPLATES,
  COLUMN_TYPE_LABEL,
  type CollectionTemplate,
} from "../utils/collection";

interface NewCollectionDialogProps {
  onCreate: (template: CollectionTemplate) => void;
  onCancel: () => void;
}

/** "Nueva colección": empezar vacía o con una plantilla (ver `COLLECTION_TEMPLATES`). */
export default function NewCollectionDialog({ onCreate, onCancel }: NewCollectionDialogProps) {
  const [selected, setSelected] = useState(COLLECTION_TEMPLATES[0].id);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => previous?.focus?.();
  }, []);

  const template = COLLECTION_TEMPLATES.find((candidate) => candidate.id === selected)!;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const index = COLLECTION_TEMPLATES.findIndex((candidate) => candidate.id === selected);
      const next =
        (index + (event.key === "ArrowDown" ? 1 : -1) + COLLECTION_TEMPLATES.length) %
        COLLECTION_TEMPLATES.length;
      setSelected(COLLECTION_TEMPLATES[next].id);
      event.preventDefault();
      requestAnimationFrame(() =>
        rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Nueva colección"
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-lg"
      >
        <h2 className="text-base font-semibold">Nueva colección</h2>
        <p className="mt-1 text-sm text-text-muted">
          Una tabla cuyas filas son páginas. Empieza vacía o con una plantilla.
        </p>

        <div role="radiogroup" aria-label="Plantilla" className="mt-3 flex flex-col gap-1.5">
          {COLLECTION_TEMPLATES.map((candidate) => {
            const checked = candidate.id === selected;
            return (
              <button
                key={candidate.id}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => setSelected(candidate.id)}
                onDoubleClick={() => onCreate(candidate)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                  checked ? "border-accent bg-surface-hover" : "border-border hover:bg-surface-hover",
                )}
              >
                <span aria-hidden="true" className="mt-0.5 w-5 text-center">
                  {candidate.icon ?? <Table2 size={15} strokeWidth={1.5} className="inline" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{candidate.name}</span>
                  <span className="block text-xs text-text-muted">{candidate.description}</span>
                  {candidate.columns.length > 0 && (
                    <span className="mt-1 block text-xs text-text-muted/80">
                      {candidate.columns
                        .map((column) => `${column.name} (${COLUMN_TYPE_LABEL[column.type].toLowerCase()})`)
                        .join(" · ")}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onCreate(template)}>Crear colección</Button>
        </div>
      </div>
    </div>
  );
}
