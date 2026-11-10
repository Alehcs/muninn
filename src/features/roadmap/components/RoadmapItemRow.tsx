import { useState } from "react";
import type { ReactNode } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import CompactRow from "@/components/CompactRow";
import IconButton from "@/components/IconButton";
import { openExternalUrl } from "@/lib/platform/links";
import { cn } from "@/utils/cn";
import { toOpenableUrl } from "../utils/roadmapUrl";
import type { RoadmapItem } from "../types";

interface RoadmapItemRowProps {
  item: RoadmapItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Asa de arrastre que entrega `SortableList`. */
  handle?: ReactNode;
}

/**
 * Fila compacta de un item de lista: casilla, título, chip de tipo y enlace.
 * Descripción, notas y enlace completo aparecen al desplegarla; Editar y
 * Eliminar son iconos que se muestran al pasar el cursor o enfocar la fila.
 */
export default function RoadmapItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
  handle,
}: RoadmapItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  const openUrl = () => {
    if (!item.url) return;
    void openExternalUrl(toOpenableUrl(item.url)).catch(() => undefined);
  };

  const hasDetails = Boolean(item.description || item.notes || item.url);

  return (
    <CompactRow
      handle={handle}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((current) => !current)}
      expandLabel={`${expanded ? "Ocultar" : "Mostrar"} detalles de ${item.title}`}
      leading={
        <input
          type="checkbox"
          checked={item.completed}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-accent"
          aria-label={`Marcar ${item.title}`}
        />
      }
      trailing={
        item.url ? (
          <IconButton
            icon={ExternalLink}
            label={`Abrir enlace de ${item.title}`}
            onClick={openUrl}
            className="text-accent hover:text-accent-hover"
          />
        ) : undefined
      }
      actions={
        <>
          <IconButton
            icon={Pencil}
            label={`Editar ${item.title}`}
            onClick={onEdit}
          />
          <IconButton
            icon={Trash2}
            label={`Eliminar ${item.title}`}
            tone="danger"
            onClick={onDelete}
          />
        </>
      }
      details={
        <div className="flex flex-col gap-2">
          {item.description && (
            <p className="break-words text-text-muted">{item.description}</p>
          )}
          {item.notes && (
            <p className="whitespace-pre-wrap break-words rounded-lg bg-bg px-3 py-2 text-text-muted">
              {item.notes}
            </p>
          )}
          {item.url && (
            <button
              type="button"
              onClick={openUrl}
              className="w-fit max-w-full break-all text-left font-medium text-accent hover:text-accent-hover"
            >
              {item.url}
            </button>
          )}
          {!hasDetails && (
            <p className="text-text-muted">
              Sin descripción, notas ni enlace. Usa Editar para añadirlos.
            </p>
          )}
          <p className="text-xs text-text-muted">Sección: {item.section}</p>
        </div>
      }
    >
      <span
        className={cn(
          "min-w-0 truncate text-sm",
          item.completed && "text-text-muted line-through",
        )}
        title={item.title}
      >
        {item.title}
      </span>
      {item.type && (
        <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted group-hover:bg-border/60">
          {item.type}
        </span>
      )}
    </CompactRow>
  );
}
