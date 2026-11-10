import { useEffect, useRef, useState } from "react";
import { Tag } from "lucide-react";

interface CategoryChipProps {
  value: string;
  onChange: (category: string) => void;
}

/** Categoría heredada de las notas, editable en línea (vacía = sin categoría). */
export default function CategoryChip({ value, onChange }: CategoryChipProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) onChange(next);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        aria-label="Categoría"
        placeholder="Categoría"
        maxLength={60}
        className="h-6 w-36 rounded-full border border-border bg-bg px-2.5 text-xs focus:border-accent"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title={value ? "Editar categoría" : "Añadir categoría"}
      className={
        value
          ? "inline-flex h-6 items-center gap-1 rounded-full bg-surface-hover px-2.5 text-xs text-text-muted transition-colors hover:text-text"
          : "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs text-text-muted/70 transition-colors hover:bg-surface-hover hover:text-text"
      }
    >
      <Tag size={11} strokeWidth={1.75} aria-hidden="true" />
      {value || "Categoría"}
    </button>
  );
}
