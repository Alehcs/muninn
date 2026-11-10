import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/Button";
import { usePrimaryAction } from "@/lib/usePrimaryAction";
import { cn } from "@/utils/cn";

/** Acción principal de una vista: botón a la derecha + atajo Cmd/Ctrl+N. */
export interface PrimaryAction {
  label: string;
  onClick: () => void;
  /** Si es true, ni se muestra ni responde al atajo (p. ej. formulario abierto). */
  hidden?: boolean;
}

interface PageHeaderProps {
  title: string;
  /** Sustituye al título de texto (p. ej. migas de pan). `title` sigue siendo el nombre accesible. */
  titleContent?: ReactNode;
  subtitle?: string;
  /** Acciones secundarias, a la izquierda de la principal. */
  actions?: ReactNode;
  primaryAction?: PrimaryAction;
  /** Franja bajo la cabecera (pestañas, filtros…), también fija al hacer scroll. */
  toolbar?: ReactNode;
}

/**
 * Cabecera única de una vista (48-52 px): un solo título, subtítulo opcional y
 * acciones a la derecha. Se queda fija arriba mientras se hace scroll.
 * Registra la acción principal para Cmd/Ctrl+N.
 */
export default function PageHeader({
  title,
  titleContent,
  subtitle,
  actions,
  primaryAction,
  toolbar,
}: PageHeaderProps) {
  const showPrimary = primaryAction !== undefined && !primaryAction.hidden;
  usePrimaryAction(showPrimary ? primaryAction.onClick : null);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg">
      <div className="flex h-[52px] items-center gap-3 px-8">
        <div className="flex min-w-0 items-baseline gap-3">
          {titleContent ? (
            <>
              <h1 className="sr-only">{title}</h1>
              {titleContent}
            </>
          ) : (
            <h1 className="truncate text-base font-semibold">{title}</h1>
          )}
          {subtitle && (
            <p className="truncate text-sm text-text-muted">{subtitle}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {showPrimary && (
            <Button onClick={primaryAction.onClick}>
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
      {toolbar && <div className="px-8">{toolbar}</div>}
    </header>
  );
}

type PageWidth = "2xl" | "3xl" | "4xl" | "5xl" | "6xl";

const WIDTHS: Record<PageWidth, string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

interface PageProps extends PageHeaderProps {
  /** Ancho máximo del contenido. */
  width?: PageWidth;
  children: ReactNode;
}

/** Cabecera + contenido con el relleno y ancho estándar. Úsalo en cada vista. */
export function Page({ width = "3xl", children, ...header }: PageProps) {
  return (
    <>
      <PageHeader {...header} />
      <div className={cn("mx-auto px-8 py-6", WIDTHS[width])}>{children}</div>
    </>
  );
}

/** Franja compacta bajo la cabecera para datos útiles (progreso, buscador…). */
export function PageStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border pb-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
