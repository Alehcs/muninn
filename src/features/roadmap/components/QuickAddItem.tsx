import { useState } from "react";
import { Plus } from "lucide-react";

interface QuickAddItemProps {
  /** Nombre de la sección, para el nombre accesible del campo. */
  sectionName: string;
  onAdd: (title: string) => void;
}

/**
 * Alta rápida de una línea. Enter crea el item con ese título y deja el foco
 * en el campo para escribir el siguiente; Escape vacía el campo.
 */
export default function QuickAddItem({ sectionName, onAdd }: QuickAddItemProps) {
  const [value, setValue] = useState("");

  return (
    <div className="flex h-7 items-center gap-2 px-2 text-text-muted focus-within:text-text">
      <Plus size={14} strokeWidth={1.75} aria-hidden="true" className="ml-px shrink-0" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            const title = value.trim();
            if (title.length === 0) return;
            onAdd(title);
            setValue("");
          } else if (event.key === "Escape" && value.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            setValue("");
          }
        }}
        placeholder="Añadir item…"
        aria-label={`Añadir item a ${sectionName}`}
        className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
      />
    </div>
  );
}
