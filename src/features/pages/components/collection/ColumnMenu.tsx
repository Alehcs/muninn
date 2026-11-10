import { useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import { inputCls, labelCls } from "@/components/formStyles";
import { confirm } from "@/lib/confirm";
import { usePages } from "../../hooks/usePages";
import {
  COLUMN_TYPE_LABEL,
  COLUMN_TYPES,
  planTypeChange,
  readValues,
  TITLE_COLUMN,
  type Column,
  type ColumnType,
  type SortSpec,
} from "../../utils/collection";
import type { Page } from "../../types";

interface ColumnMenuProps {
  collection: Page;
  /** `null` = la columna del título (solo se puede ordenar). */
  column: Column | null;
  rows: readonly Page[];
  sort: SortSpec | undefined;
  onSort: (sort: SortSpec | undefined) => void;
  close: () => void;
}

const actionCls =
  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-text hover:bg-surface-hover";

function OptionRow({
  label,
  onRename,
  onDelete,
}: {
  label: string;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(label);
  return (
    <div className="flex items-center gap-1">
      <input
        value={draft}
        aria-label={`Opción ${label}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = draft.trim();
          if (next === "") setDraft(label);
          else if (next !== label) onRename(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
        className={`${inputCls} h-7 py-0`}
      />
      <IconButton icon={X} tone="danger" label={`Eliminar la opción ${label}`} onClick={onDelete} />
    </div>
  );
}

/** Contenido del menú de una cabecera: renombrar, tipo, orden, opciones y eliminar. */
export default function ColumnMenu({
  collection,
  column,
  rows,
  sort,
  onSort,
  close,
}: ColumnMenuProps) {
  const store = usePages();
  const [name, setName] = useState(column?.name ?? "");
  const [newOption, setNewOption] = useState("");
  const columnId = column?.id ?? TITLE_COLUMN;
  const activeDir = sort?.columnId === columnId ? sort.dir : undefined;

  const commitName = () => {
    if (!column) return;
    const next = name.trim();
    if (next === "") setName(column.name);
    else if (next !== column.name) void store.renameColumn(collection.id, column.id, next);
  };

  const changeType = async (to: ColumnType) => {
    if (!column || to === column.type) return;
    const plan = planTypeChange(
      column,
      to,
      rows.map((row) => ({ id: row.id, values: readValues(row.properties) })),
    );
    if (plan.lost > 0) {
      close();
      const accepted = await confirm({
        title: "Cambiar el tipo de la columna",
        message: `${plan.lost} ${
          plan.lost === 1 ? "valor no se puede convertir" : "valores no se pueden convertir"
        } a «${COLUMN_TYPE_LABEL[to]}» y se perderán. Esta acción no se puede deshacer.`,
        confirmLabel: "Cambiar tipo",
        destructive: true,
      });
      if (!accepted) return;
    } else {
      close();
    }
    await store.changeColumnType(collection.id, column.id, to);
  };

  const removeColumn = async () => {
    if (!column) return;
    close();
    const withValue = rows.filter((row) => column.id in readValues(row.properties)).length;
    const accepted = await confirm({
      title: "Eliminar columna",
      message: `Se eliminará la columna «${column.name || "sin nombre"}»${
        withValue > 0 ? ` y sus valores en ${withValue} ${withValue === 1 ? "elemento" : "elementos"}` : ""
      }. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar columna",
      destructive: true,
    });
    if (accepted) await store.deleteColumn(collection.id, column.id);
  };

  const addOption = () => {
    const label = newOption.trim();
    if (!column || label === "") return;
    setNewOption("");
    void store.addOption(collection.id, column.id, label);
  };

  const onOptionKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addOption();
    }
  };

  return (
    <div className="flex w-64 flex-col gap-1 p-1">
      {column && (
        <div className="px-1.5 pb-1">
          <label>
            <span className={labelCls}>Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitName();
                  close();
                }
              }}
              className={`${inputCls} h-8 py-0`}
            />
          </label>
          <label className="mt-2 block">
            <span className={labelCls}>Tipo</span>
            <select
              value={column.type}
              onChange={(event) => void changeType(event.target.value as ColumnType)}
              className={`${inputCls} h-8 py-0`}
            >
              {COLUMN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {COLUMN_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button
        type="button"
        className={actionCls}
        aria-pressed={activeDir === "asc"}
        onClick={() => {
          onSort(activeDir === "asc" ? undefined : { columnId, dir: "asc" });
          close();
        }}
      >
        <ArrowUp size={14} strokeWidth={1.75} aria-hidden="true" />
        Ordenar ascendente
        {activeDir === "asc" && <span className="ml-auto text-xs text-text-muted">activo</span>}
      </button>
      <button
        type="button"
        className={actionCls}
        aria-pressed={activeDir === "desc"}
        onClick={() => {
          onSort(activeDir === "desc" ? undefined : { columnId, dir: "desc" });
          close();
        }}
      >
        <ArrowDown size={14} strokeWidth={1.75} aria-hidden="true" />
        Ordenar descendente
        {activeDir === "desc" && <span className="ml-auto text-xs text-text-muted">activo</span>}
      </button>

      {column?.type === "select" && (
        <div className="mt-1 border-t border-border px-1.5 pt-2">
          <span className={labelCls}>Opciones</span>
          <div className="flex flex-col gap-1">
            {(column.options ?? []).map((option) => (
              <OptionRow
                key={option.id}
                label={option.label}
                onRename={(label) => void store.renameOption(collection.id, column.id, option.id, label)}
                onDelete={() => void store.deleteOption(collection.id, column.id, option.id)}
              />
            ))}
            <div className="flex items-center gap-1">
              <input
                value={newOption}
                placeholder="Nueva opción"
                aria-label="Nueva opción"
                onChange={(event) => setNewOption(event.target.value)}
                onKeyDown={onOptionKey}
                className={`${inputCls} h-7 py-0`}
              />
              <IconButton icon={Plus} label="Añadir opción" onClick={addOption} />
            </div>
          </div>
        </div>
      )}

      {column && (
        <button
          type="button"
          className={`${actionCls} mt-1 border-t border-border text-danger`}
          onClick={() => void removeColumn()}
        >
          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
          Eliminar columna
        </button>
      )}
    </div>
  );
}

/** Formulario pequeño para añadir una columna (nombre + tipo). */
export function AddColumnForm({
  onAdd,
  close,
}: {
  onAdd: (input: { name: string; type: ColumnType }) => void;
  close: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const submit = () => {
    if (name.trim() === "") return;
    onAdd({ name, type });
    close();
  };
  return (
    <form
      className="flex w-60 flex-col gap-2 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label>
        <span className={labelCls}>Nombre</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`${inputCls} h-8 py-0`}
        />
      </label>
      <label>
        <span className={labelCls}>Tipo</span>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ColumnType)}
          className={`${inputCls} h-8 py-0`}
        >
          {COLUMN_TYPES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {COLUMN_TYPE_LABEL[candidate]}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={name.trim() === ""}>
        Añadir columna
      </Button>
    </form>
  );
}
