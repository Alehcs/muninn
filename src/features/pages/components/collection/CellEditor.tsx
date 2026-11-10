import { memo, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, Pencil } from "lucide-react";
import Popover from "@/components/Popover";
import { openExternalUrl } from "@/lib/platform";
import { cn } from "@/utils/cn";
import {
  formatDateValue,
  normalizeUrl,
  optionLabel,
  parseNumber,
  type CellValue,
  type Column,
} from "../../utils/collection";

/** Raíz que agrupa las celdas navegables con Tab (la tabla o el bloque de propiedades). */
export const CELLS_ROOT_ATTR = "data-cells-root";

const INVALID = Symbol("invalid");

function toDraft(value: CellValue | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseDraft(type: Column["type"], draft: string): CellValue | null | typeof INVALID {
  const text = draft.trim();
  if (text === "") return null;
  if (type === "number") {
    const number = parseNumber(text);
    return number === undefined ? INVALID : number;
  }
  return text;
}

export interface CellEditorProps {
  column: Column;
  value: CellValue | undefined;
  /** `null` = vaciar. */
  onCommit: (value: CellValue | null) => void;
  /** Identificador de la celda (también para pruebas). */
  cellKey: string;
  variant: "table" | "block";
}

interface TextCellProps {
  type: "text" | "number" | "url" | "date";
  value: CellValue | undefined;
  onCommit: (value: CellValue | null) => void;
  cellKey: string;
  variant: "table" | "block";
  label: string;
  /** Clases del botón en reposo. */
  displayClass?: string;
  inputClass?: string;
  placeholder?: string;
  renderValue?: (value: CellValue) => React.ReactNode;
  /** Icono de edición a la derecha (para enlaces, cuyo texto es clicable). */
  asEditIcon?: boolean;
}

/**
 * Celda de entrada (texto, número, fecha, enlace, y el título de una fila):
 * en reposo es un botón; al activarla pasa a un campo. Enter confirma,
 * Escape cancela, Tab confirma y pasa a la siguiente celda.
 */
export function TextCell({
  type,
  value,
  onCommit,
  cellKey,
  variant,
  label,
  displayClass,
  inputClass,
  placeholder,
  renderValue,
  asEditIcon,
}: TextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select?.();
  }, [editing]);

  const begin = () => {
    finished.current = false;
    setDraft(toDraft(value));
    setEditing(true);
  };

  const finish = (save: boolean, move?: 1 | -1) => {
    if (finished.current) return;
    finished.current = true;
    const input = inputRef.current;
    let target: HTMLElement | undefined;
    if (move !== undefined && input) {
      const root = input.closest(`[${CELLS_ROOT_ATTR}]`);
      const cells = Array.from(root?.querySelectorAll<HTMLElement>("[data-cell]") ?? []);
      target = cells[cells.indexOf(input) + move];
    }
    setEditing(false);
    if (save) {
      const next = parseDraft(type, draft);
      const current = value === undefined ? null : value;
      if (next !== INVALID && next !== current) onCommit(next);
    }
    if (target) {
      target.focus();
      if (target.dataset.kind === "input") target.click();
    } else {
      // El botón de reposo vuelve a existir tras el render.
      requestAnimationFrame(() => buttonRef.current?.focus());
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    } else if (event.key === "Tab") {
      event.preventDefault();
      finish(true, event.shiftKey ? -1 : 1);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        data-cell={cellKey}
        data-kind="input"
        type={type === "date" ? "date" : "text"}
        inputMode={type === "number" ? "decimal" : undefined}
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full min-w-0 rounded border border-accent bg-bg px-2 text-sm text-text",
          variant === "table" ? "h-7" : "h-8",
          inputClass,
        )}
      />
    );
  }

  const text =
    value === undefined ? null : renderValue ? renderValue(value) : String(value);
  const link =
    type === "url" && typeof value === "string" ? normalizeUrl(value) : null;

  const button = (
    <button
      ref={buttonRef}
      type="button"
      data-cell={cellKey}
      data-kind="input"
      aria-label={asEditIcon ? `Editar ${label}` : label}
      title={asEditIcon ? "Editar" : undefined}
      onClick={begin}
      className={cn(
        "flex min-w-0 items-center text-left text-sm",
        asEditIcon ? "h-full flex-1 justify-end pr-1" : "w-full",
        !asEditIcon && (variant === "table" ? "h-8 px-2" : "min-h-8 rounded px-2 hover:bg-surface-hover"),
        displayClass,
      )}
    >
      {asEditIcon ? (
        <Pencil
          size={12}
          strokeWidth={1.75}
          aria-hidden="true"
          className="text-text-muted opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100"
        />
      ) : text !== null ? (
        <span className="truncate">{text}</span>
      ) : (
        placeholder && <span className="truncate text-text-muted/60">{placeholder}</span>
      )}
    </button>
  );

  if (type !== "url") return button;

  return (
    <div className="group/cell flex min-w-0 flex-1 items-center">
      {typeof value === "string" &&
        (link ? (
          <a
            href={link}
            onClick={(event) => {
              event.preventDefault();
              void openExternalUrl(link);
            }}
            title={link}
            className={cn(
              "min-w-0 truncate text-sm text-accent hover:underline",
              variant === "table" ? "pl-2" : "pl-2",
            )}
          >
            {value}
          </a>
        ) : (
          <span className="min-w-0 truncate pl-2 text-sm">{value}</span>
        ))}
      {value === undefined ? (
        <button
          ref={buttonRef}
          type="button"
          data-cell={cellKey}
          data-kind="input"
          aria-label={label}
          onClick={begin}
          className={cn(
            "flex w-full items-center text-left text-sm",
            variant === "table" ? "h-8 px-2" : "min-h-8 rounded px-2 hover:bg-surface-hover",
          )}
        >
          {placeholder && <span className="truncate text-text-muted/60">{placeholder}</span>}
        </button>
      ) : (
        button
      )}
    </div>
  );
}

function SelectCell({ column, value, onCommit, cellKey, variant }: CellEditorProps) {
  const label = typeof value === "string" ? optionLabel(column, value) : undefined;
  const options = column.options ?? [];

  return (
    <Popover
      label={`Elegir ${column.name}`}
      className="max-h-64 min-w-44 overflow-y-auto"
      trigger={({ ref, toggle, ariaProps }) => (
        <button
          ref={ref}
          type="button"
          data-cell={cellKey}
          data-kind="select"
          aria-label={`${column.name}: ${label ?? "sin valor"}`}
          onClick={toggle}
          {...ariaProps}
          className={cn(
            "flex w-full min-w-0 items-center text-left",
            variant === "table" ? "h-8 px-2" : "min-h-8 rounded px-2 hover:bg-surface-hover",
          )}
        >
          {label !== undefined ? (
            <span className="truncate rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text ring-1 ring-border">
              {label}
            </span>
          ) : (
            variant === "block" && <span className="text-sm text-text-muted/60">Vacío</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                close();
                if (option.id !== value) onCommit(option.id);
              }}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-hover"
            >
              <span className="min-w-0 flex-1 truncate">{option.label || "Sin nombre"}</span>
              {option.id === value && <Check size={13} aria-hidden="true" />}
            </button>
          ))}
          {options.length === 0 && (
            <p className="px-2.5 py-1.5 text-xs text-text-muted">
              Aún no hay opciones. Añádelas desde la cabecera de la columna.
            </p>
          )}
          {value !== undefined && (
            <button
              type="button"
              onClick={() => {
                close();
                onCommit(null);
              }}
              className="mt-1 rounded-md border-t border-border px-2.5 py-1.5 text-left text-sm text-text-muted hover:bg-surface-hover"
            >
              Quitar valor
            </button>
          )}
        </>
      )}
    </Popover>
  );
}

function CheckboxCell({ column, value, onCommit, cellKey, variant }: CellEditorProps) {
  const checked = value === true;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={column.name}
      data-cell={cellKey}
      data-kind="checkbox"
      onClick={() => onCommit(checked ? null : true)}
      className={cn(
        "flex w-full items-center px-2",
        variant === "table" ? "h-8" : "min-h-8 rounded hover:bg-surface-hover",
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded border",
          checked ? "border-accent bg-accent text-accent-foreground" : "border-border bg-bg",
        )}
      >
        {checked && <Check size={11} strokeWidth={3} aria-hidden="true" />}
      </span>
    </button>
  );
}

/** Editor en el sitio de una celda, según el tipo de su columna. */
function CellEditorImpl(props: CellEditorProps) {
  const { column, value, onCommit, cellKey, variant } = props;
  const placeholder = variant === "block" ? "Vacío" : undefined;
  switch (column.type) {
    case "select":
      return <SelectCell {...props} />;
    case "checkbox":
      return <CheckboxCell {...props} />;
    case "date":
      return (
        <TextCell
          type="date"
          value={value}
          onCommit={onCommit}
          cellKey={cellKey}
          variant={variant}
          label={column.name}
          placeholder={placeholder}
          renderValue={(v) => formatDateValue(String(v))}
        />
      );
    case "url":
      return (
        <TextCell
          type="url"
          value={value}
          onCommit={onCommit}
          cellKey={cellKey}
          variant={variant}
          label={column.name}
          placeholder={placeholder}
          asEditIcon
        />
      );
    case "number":
      return (
        <TextCell
          type="number"
          value={value}
          onCommit={onCommit}
          cellKey={cellKey}
          variant={variant}
          label={column.name}
          placeholder={placeholder}
          displayClass="tabular-nums"
        />
      );
    case "text":
      return (
        <TextCell
          type="text"
          value={value}
          onCommit={onCommit}
          cellKey={cellKey}
          variant={variant}
          label={column.name}
          placeholder={placeholder}
        />
      );
  }
}

const CellEditor = memo(CellEditorImpl);
export default CellEditor;
