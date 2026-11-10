import { useId } from "react";
import type { MouseEvent, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import ThinProgress from "@/components/ThinProgress";
import { cn } from "@/utils/cn";

export interface CompactRowProps {
  /** Asa de arrastre (la pone `SortableList`). */
  handle?: ReactNode;
  /** Casilla, icono de estado… a la izquierda del contenido. */
  leading?: ReactNode;
  /** Contenido principal (título, chips). Ocupa el espacio sobrante. */
  children: ReactNode;
  /** Siempre visible a la derecha (icono de enlace, valores, contadores). */
  trailing?: ReactNode;
  /** Acciones secundarias: aparecen al pasar el cursor o al recibir foco. */
  actions?: ReactNode;
  /** Detalle desplegable. Con `onToggleExpanded` la fila muestra un chevron. */
  details?: ReactNode;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  /** Nombre accesible del chevron ("Mostrar detalles de X"). */
  expandLabel?: string;
  /** Acción al hacer clic en cualquier parte de la fila (si no se expande). */
  onActivate?: () => void;
  /** Barra de progreso fina al pie de la fila (0-100). */
  progress?: number;
  progressTone?: "accent" | "success";
  /** Atenúa la fila (completada, pausada…). */
  dimmed?: boolean;
  className?: string;
}

/** Clics en estos elementos nunca activan la fila. */
const INTERACTIVE = "button, a, input, select, textarea, label, [role=menu]";

/**
 * Fila compacta reutilizable (36 px): asa, chevron, casilla, contenido,
 * elementos fijos a la derecha y acciones que solo aparecen al pasar el cursor
 * o al enfocar algo dentro de la fila (siguen siendo alcanzables con teclado).
 */
export default function CompactRow({
  handle,
  leading,
  children,
  trailing,
  actions,
  details,
  expanded = false,
  onToggleExpanded,
  expandLabel = "Mostrar detalles",
  onActivate,
  progress,
  progressTone = "accent",
  dimmed,
  className,
}: CompactRowProps) {
  const detailsId = useId();
  const rowAction = onActivate ?? onToggleExpanded;

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!rowAction) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    rowAction();
  };

  return (
    <div className={cn("group relative rounded-md", className)}>
      <div
        onClick={handleClick}
        className={cn(
          "flex min-h-9 items-center gap-2 rounded-md px-2 transition-colors hover:bg-surface-hover",
          rowAction && "cursor-pointer",
          dimmed && "opacity-70",
        )}
      >
        {handle}
        {onToggleExpanded && (
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            aria-controls={expanded ? detailsId : undefined}
            aria-label={expandLabel}
            title={expandLabel}
            className="-mx-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:text-text"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className={cn("transition-transform", expanded && "rotate-90")}
            />
          </button>
        )}
        {leading}
        <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
        {trailing}
        {actions && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            {actions}
          </div>
        )}
      </div>
      {progress !== undefined && (
        <ThinProgress
          percent={progress}
          tone={progressTone}
          className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5"
        />
      )}
      {expanded && details && (
        <div id={detailsId} className="px-2 pb-2 pl-12 pt-1 text-sm">
          {details}
        </div>
      )}
    </div>
  );
}
