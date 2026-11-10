import { useEffect, useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import Button from "@/components/Button";
import { cn } from "@/utils/cn";
import { getMoveTargets, type PageNode } from "../utils/pageTree";
import { pageTitle, type Page } from "../types";

interface MovePageDialogProps {
  page: Page;
  pages: readonly Page[];
  tree: PageNode[];
  onSelect: (parentId: string | null) => void;
  onCancel: () => void;
}

/** Selector sencillo de página madre: lista con sangría; incluye "Raíz". */
export default function MovePageDialog({
  page,
  pages,
  tree,
  onSelect,
  onCancel,
}: MovePageDialogProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const targets = useMemo(
    () => getMoveTargets(tree, pages, page.id, pageTitle),
    [tree, pages, page.id],
  );

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    listRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    return () => previous?.focus?.();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
    event.preventDefault();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Mover «${pageTitle(page)}» a…`}
        onKeyDown={handleKeyDown}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-border bg-surface p-5 shadow-lg"
      >
        <h2 className="truncate text-base font-semibold">
          Mover «{pageTitle(page)}» a…
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Elige la página madre. También puedes dejarla en la raíz.
        </p>
        <div
          ref={listRef}
          className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
        >
          {targets.map((target) => {
            const current = target.id === page.parentId;
            return (
              <button
                key={target.id ?? "root"}
                type="button"
                disabled={current}
                onClick={() => onSelect(target.id)}
                style={{ paddingLeft: 10 + target.depth * 16 }}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-2 rounded-md pr-2 text-left text-sm transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent",
                  target.id === null && "text-text-muted",
                )}
              >
                <span className="truncate">{target.label}</span>
                {current && (
                  <span className="ml-auto shrink-0 text-xs text-text-muted">
                    actual
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
