import Button from "@/components/Button";
import { cn } from "@/utils/cn";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { RoadmapItem } from "../types";

interface RoadmapItemRowProps {
  item: RoadmapItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RoadmapItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: RoadmapItemRowProps) {
  const handleOpenUrl = () => {
    if (!item.url) return;

    const normalized =
      /^https?:\/\//i.test(item.url) || /^mailto:/i.test(item.url)
        ? item.url
        : `https://${item.url}`;
    void openUrl(normalized).catch(() => undefined);
  };

  return (
    <div className="rounded-lg border border-border bg-bg/35 p-4">
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={onToggle}
          className="mt-1 h-4 w-4 accent-accent"
          aria-label={`Marcar ${item.title}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "break-words font-medium",
                item.completed && "text-text-muted line-through",
              )}
            >
              {item.title}
            </p>
            {item.type && (
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
                {item.type}
              </span>
            )}
          </div>

          {item.description && (
            <p className="mt-1 break-words text-sm text-text-muted">
              {item.description}
            </p>
          )}

          {item.notes && (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-surface px-3 py-2 text-sm text-text-muted">
              {item.notes}
            </p>
          )}

          {item.url && (
            <button
              className="mt-2 inline-block break-all text-left text-sm font-medium text-accent hover:text-accent-hover"
              type="button"
              onClick={handleOpenUrl}
            >
              Abrir link
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 pl-7">
        <Button variant="ghost" onClick={onEdit} className="px-2 py-1 text-xs">
          Editar
        </Button>
        <Button variant="ghost" onClick={onDelete} className="px-2 py-1 text-xs">
          Eliminar
        </Button>
      </div>
    </div>
  );
}
