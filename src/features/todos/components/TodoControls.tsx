import { Calendar, Check, Flag } from "lucide-react";
import Popover from "@/components/Popover";
import { cn } from "@/utils/cn";
import { PRIORITY_LABELS, type TodoPriority } from "../types";
import { addDays, dueLabel, isOverdue } from "../utils/todoDates";

/** Color de la marca de prioridad (solo tokens del tema). */
export const PRIORITY_TONE: Record<TodoPriority, string> = {
  0: "text-text-muted",
  1: "text-text-muted",
  2: "text-accent",
  3: "text-danger",
};

const triggerBase =
  "inline-flex shrink-0 items-center justify-center rounded-md transition-colors";
const iconTrigger = `${triggerBase} h-7 w-7 hover:bg-border/60`;

const menuItem =
  "flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm text-text transition-colors hover:bg-surface-hover";

interface DueControlProps {
  /** YYYY-MM-DD, o undefined sin fecha. */
  value: string | undefined;
  onChange: (value: string | null) => void;
  today: string;
  /** `chip`: muestra la fecha; `icon`: solo un calendario (cuando aún no hay). */
  mode: "chip" | "icon";
  /** Nombre de la tarea, para el nombre accesible. */
  subject?: string;
}

/** Fecha límite editable en línea: chip o icono que abre un panel pequeño. */
export function TodoDueControl({
  value,
  onChange,
  today,
  mode,
  subject,
}: DueControlProps) {
  const overdue = isOverdue(value, today);
  const target = subject ? ` de ${subject}` : "";
  const label =
    value === undefined
      ? `Poner fecha${target}`
      : `Fecha${target}: ${dueLabel(value, today)}. Cambiar`;

  return (
    <Popover
      label={`Fecha${target}`}
      trigger={({ ref, toggle, ariaProps }) =>
        mode === "chip" && value !== undefined ? (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-label={label}
            title={label}
            {...ariaProps}
            className={cn(
              `${triggerBase} gap-1 rounded-full px-2 py-0.5 text-xs hover:bg-border/60`,
              overdue
                ? "bg-danger/10 font-medium text-danger"
                : value === today
                  ? "bg-accent/10 font-medium text-accent"
                  : "bg-surface-hover text-text-muted group-hover:bg-border/60",
            )}
          >
            {dueLabel(value, today)}
          </button>
        ) : (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-label={label}
            title={label}
            {...ariaProps}
            className={cn(iconTrigger, "text-text-muted hover:text-text")}
          >
            <Calendar size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )
      }
    >
      {(close) => {
        const choose = (date: string | null) => {
          onChange(date);
          close();
        };
        return (
          <>
            <button type="button" className={menuItem} onClick={() => choose(today)}>
              Hoy
            </button>
            <button
              type="button"
              className={menuItem}
              onClick={() => choose(addDays(today, 1))}
            >
              Mañana
            </button>
            <button
              type="button"
              className={menuItem}
              onClick={() => choose(addDays(today, 7))}
            >
              En una semana
            </button>
            <input
              type="date"
              aria-label="Elegir otra fecha"
              value={value ?? ""}
              onChange={(event) => {
                if (event.target.value) choose(event.target.value);
              }}
              className="mx-1 my-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
            />
            {value !== undefined && (
              <button
                type="button"
                className={cn(menuItem, "text-text-muted")}
                onClick={() => choose(null)}
              >
                Quitar fecha
              </button>
            )}
          </>
        );
      }}
    </Popover>
  );
}

interface PriorityControlProps {
  value: TodoPriority;
  onChange: (value: TodoPriority) => void;
  mode: "mark" | "icon";
  subject?: string;
}

/** Prioridad editable en línea: marca discreta (si hay) o icono de bandera. */
export function TodoPriorityControl({
  value,
  onChange,
  mode,
  subject,
}: PriorityControlProps) {
  const target = subject ? ` de ${subject}` : "";
  const label =
    value === 0
      ? `Poner prioridad${target}`
      : `Prioridad${target}: ${PRIORITY_LABELS[value].toLowerCase()}. Cambiar`;

  return (
    <Popover
      label={`Prioridad${target}`}
      trigger={({ ref, toggle, ariaProps }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          aria-label={label}
          title={label}
          {...ariaProps}
          className={cn(
            iconTrigger,
            mode === "mark" && value > 0
              ? PRIORITY_TONE[value]
              : "text-text-muted hover:text-text",
          )}
        >
          <Flag
            size={mode === "mark" ? 13 : 15}
            strokeWidth={1.75}
            fill={mode === "mark" && value > 0 ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      )}
    >
      {(close) =>
        ([3, 2, 1, 0] as const).map((priority) => (
          <button
            key={priority}
            type="button"
            className={menuItem}
            onClick={() => {
              onChange(priority);
              close();
            }}
          >
            <Flag
              size={13}
              strokeWidth={1.75}
              fill={priority > 0 ? "currentColor" : "none"}
              className={PRIORITY_TONE[priority]}
              aria-hidden="true"
            />
            <span className="flex-1">{PRIORITY_LABELS[priority]}</span>
            {priority === value && (
              <Check size={13} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        ))
      }
    </Popover>
  );
}
