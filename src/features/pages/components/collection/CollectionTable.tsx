import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronsUpDown,
  ExternalLink,
  Hash,
  Link2,
  Plus,
  Search,
  SquareCheck,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigation } from "@/app/NavigationContext";
import Popover from "@/components/Popover";
import RowMenu from "@/components/RowMenu";
import SortableList from "@/components/SortableList";
import { inputCls } from "@/components/formStyles";
import { reorderVisible } from "@/lib/reorder";
import { cn } from "@/utils/cn";
import { usePages } from "../../hooks/usePages";
import { usePageCommands } from "../../hooks/usePageCommands";
import { pageTitle, type Page } from "../../types";
import {
  countByOption,
  filterRows,
  readColumns,
  readValues,
  readView,
  sortRows,
  TITLE_COLUMN,
  type CellValue,
  type Column,
  type ColumnType,
  type SortSpec,
} from "../../utils/collection";
import CellEditor, { CELLS_ROOT_ATTR, TextCell } from "./CellEditor";
import ColumnMenu, { AddColumnForm } from "./ColumnMenu";

export const TYPE_ICON: Record<ColumnType, LucideIcon> = {
  text: Type,
  number: Hash,
  select: ChevronsUpDown,
  checkbox: SquareCheck,
  date: Calendar,
  url: Link2,
};

const TITLE_WIDTH = 260;
const COLUMN_WIDTH = 160;
const ACTIONS_WIDTH = 44;

function gridTemplate(columns: readonly Column[]): string {
  return `${TITLE_WIDTH}px ${columns.map(() => `${COLUMN_WIDTH}px`).join(" ")} ${ACTIONS_WIDTH}px`;
}

/** Celda pegada a la izquierda, con fondo opaco para tapar lo que pasa por debajo. */
const STICKY = "sticky left-0 z-[1] bg-bg group-hover/row:bg-surface-hover";

interface RowProps {
  row: Page;
  columns: readonly Column[];
  template: string;
  handle: ReactNode;
  dragging: boolean;
  onOpen: (row: Page) => void;
  onTrash: (row: Page) => void;
  onSaveTitle: (id: string, title: string) => Promise<void>;
  onSaveValue: (rowId: string, columnId: string, value: CellValue | null) => Promise<void>;
}

/**
 * Una fila de la tabla. Solo se vuelve a pintar si cambia SU página, las
 * columnas o el estado de arrastre: editar una celda no repinta las otras filas
 * (por eso no lee el contexto de páginas: recibe los guardados por props).
 */
const TableRow = memo(function TableRow({
  row,
  columns,
  template,
  handle,
  dragging,
  onOpen,
  onTrash,
  onSaveTitle,
  onSaveValue,
}: RowProps) {
  const values = readValues(row.properties);

  return (
    <div
      role="row"
      style={{ gridTemplateColumns: template }}
      className={cn(
        "group group/row grid border-b border-border/60 hover:bg-surface-hover",
        dragging && "bg-surface",
      )}
    >
      <div role="cell" className={cn(STICKY, "flex min-w-0 items-center border-r border-border/60 pl-1")}>
        {handle}
        <TextCell
          type="text"
          value={row.title === "" ? undefined : row.title}
          cellKey={`${row.id}:title`}
          variant="table"
          label={`Título de ${pageTitle(row)}`}
          placeholder="Sin título"
          displayClass="font-medium"
          onCommit={(value) => void onSaveTitle(row.id, typeof value === "string" ? value : "")}
        />
        <button
          type="button"
          onClick={() => onOpen(row)}
          aria-label={`Abrir ${pageTitle(row)}`}
          className="mr-1 inline-flex h-6 shrink-0 items-center gap-1 rounded border border-border bg-surface px-1.5 text-xs text-text-muted opacity-0 transition-opacity hover:text-text focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <ExternalLink size={11} aria-hidden="true" />
          Abrir
        </button>
      </div>
      {columns.map((column) => (
        <div key={column.id} role="cell" className="flex min-w-0 items-center border-r border-border/40">
          <CellEditor
            column={column}
            value={values[column.id]}
            cellKey={`${row.id}:${column.id}`}
            variant="table"
            onCommit={(value) => void onSaveValue(row.id, column.id, value)}
          />
        </div>
      ))}
      <div role="cell" className="flex items-center justify-center">
        <span className="opacity-0 focus-within:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100">
          <RowMenu
            label={`Opciones de ${pageTitle(row)}`}
            floating
            className="[&>button]:h-6 [&>button]:w-6"
            items={[
              { label: "Abrir", icon: ExternalLink, onSelect: () => onOpen(row) },
              { label: "Mover a la papelera", icon: Trash2, danger: true, onSelect: () => onTrash(row) },
            ]}
          />
        </span>
      </div>
    </div>
  );
}, (previous, next) =>
  previous.row === next.row &&
  previous.columns === next.columns &&
  previous.template === next.template &&
  previous.dragging === next.dragging &&
  previous.onOpen === next.onOpen &&
  previous.onTrash === next.onTrash &&
  previous.onSaveTitle === next.onSaveTitle &&
  previous.onSaveValue === next.onSaveValue,
);

function SortMark({ dir }: { dir: "asc" | "desc" }) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return <Icon size={11} strokeWidth={2} aria-label={dir === "asc" ? "ascendente" : "descendente"} />;
}

/** Valor del desplegable de filtro: `columnId|valor`. */
function filterKey(columnId: string, value: string): string {
  return `${columnId}|${value}`;
}

interface CollectionTableProps {
  collection: Page;
}

/**
 * La tabla de una colección: filas = subpáginas. Orden y filtro (preferencia
 * guardada en la colección), buscador por título, celdas editables en el sitio,
 * arrastre para el orden manual y alta rápida al pie.
 */
export default function CollectionTable({ collection }: CollectionTableProps) {
  const store = usePages();
  const commands = usePageCommands();
  const { navigate } = useNavigation();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  const creating = useRef(false);

  const columns = useMemo(() => readColumns(collection.properties), [collection.properties]);
  const view = useMemo(() => readView(collection.properties), [collection.properties]);

  const allRows = useMemo(
    () => store.pages.filter((page) => page.parentId === collection.id && page.deletedAt === null),
    [store.pages, collection.id],
  );
  const manualRows = useMemo(() => sortRows(allRows, columns, undefined), [allRows, columns]);
  const rows = useMemo(
    () =>
      filterRows(sortRows(allRows, columns, view.sort), columns, { query, filter: view.filter }),
    [allRows, columns, view.sort, view.filter, query],
  );

  const sortColumn =
    view.sort && view.sort.columnId !== TITLE_COLUMN
      ? columns.find((column) => column.id === view.sort!.columnId)
      : undefined;
  const sortLabel = view.sort
    ? view.sort.columnId === TITLE_COLUMN
      ? "Nombre"
      : sortColumn?.name || "Sin nombre"
    : "";

  const { saveView } = store;
  const setSort = useCallback(
    (sort: SortSpec | undefined) => void saveView(collection.id, { ...view, sort }),
    [saveView, collection.id, view],
  );

  const filterable = columns.filter((column) => column.type === "select" || column.type === "checkbox");
  const summaryColumn = columns.find((column) => column.type === "select");
  const filtering = query.trim() !== "" || view.filter !== undefined;

  // Callbacks con identidad fija: así las filas memorizadas no se repintan.
  const latest = useRef({ navigate, commands });
  latest.current = { navigate, commands };
  const open = useCallback(
    (row: Page) => latest.current.navigate({ view: "pages", pageId: row.id }),
    [],
  );
  const trash = useCallback((row: Page) => void latest.current.commands.trash(row), []);

  const template = gridTemplate(columns);
  const minWidth = TITLE_WIDTH + columns.length * COLUMN_WIDTH + ACTIONS_WIDTH;

  const addRow = async () => {
    const title = draft.trim();
    if (title === "" || creating.current) return;
    creating.current = true;
    setDraft("");
    try {
      await store.createRow(collection.id, title);
    } finally {
      creating.current = false;
      addRef.current?.focus();
    }
  };

  const handleAddKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      void addRow();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setDraft("");
    }
  };

  const reorder = (activeId: string, overId: string) => {
    const next = reorderVisible(
      manualRows.map((row) => row.id),
      rows.map((row) => row.id),
      activeId,
      overId,
    );
    void store.reorderRows(next);
  };

  const dragEnabled = view.sort === undefined;

  const renderRow = (row: Page, handle: ReactNode, dragging: boolean) => (
    <TableRow
      row={row}
      columns={columns}
      template={template}
      handle={handle}
      dragging={dragging}
      onOpen={open}
      onTrash={trash}
      onSaveTitle={store.saveTitle}
      onSaveValue={store.saveRowValue}
    />
  );

  const filterValue = view.filter ? filterKey(view.filter.columnId, view.filter.value) : "";

  return (
    <section aria-label="Tabla de la colección" className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="relative block w-52">
          <span className="sr-only">Buscar por título</span>
          <Search
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título"
            className={`${inputCls} h-8 py-0 pl-8`}
          />
        </label>

        {filterable.length > 0 && (
          <label>
            <span className="sr-only">Filtrar</span>
            <select
              value={filterValue}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "") return void saveView(collection.id, { ...view, filter: undefined });
                const [columnId, ...rest] = value.split("|");
                void saveView(collection.id, {
                  ...view,
                  filter: { columnId, value: rest.join("|") },
                });
              }}
              className={`${inputCls} h-8 w-auto py-0`}
            >
              <option value="">Sin filtro</option>
              {filterable.map((column) => (
                <optgroup key={column.id} label={column.name || "Sin nombre"}>
                  {column.type === "checkbox" ? (
                    <>
                      <option value={filterKey(column.id, "true")}>Marcados</option>
                      <option value={filterKey(column.id, "false")}>Sin marcar</option>
                    </>
                  ) : (
                    <>
                      {(column.options ?? []).map((option) => (
                        <option key={option.id} value={filterKey(column.id, option.id)}>
                          {option.label}
                        </option>
                      ))}
                      <option value={filterKey(column.id, "")}>Sin valor</option>
                    </>
                  )}
                </optgroup>
              ))}
            </select>
          </label>
        )}

        {view.sort && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-hover pl-2.5 pr-1 text-xs text-text-muted">
            Orden: {sortLabel}
            <SortMark dir={view.sort.dir} />
            <button
              type="button"
              onClick={() => setSort(undefined)}
              aria-label="Quitar el orden"
              title="Quitar el orden"
              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-border/60 hover:text-text"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        )}

        <p className="ml-auto text-xs text-text-muted" aria-live="polite">
          {filtering ? `${rows.length} de ${allRows.length}` : allRows.length}{" "}
          {allRows.length === 1 ? "elemento" : "elementos"}
          {summaryColumn &&
            countByOption(rows, summaryColumn)
              .filter((entry) => entry.count > 0)
              .map((entry) => ` · ${entry.option.label} ${entry.count}`)
              .join("")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border" {...{ [CELLS_ROOT_ATTR]: "" }}>
        <div role="table" aria-label="Elementos" style={{ minWidth }}>
          <div
            role="row"
            style={{ gridTemplateColumns: template }}
            className="grid border-b border-border bg-surface text-xs text-text-muted"
          >
            <div role="columnheader" className="sticky left-0 z-[2] border-r border-border/60 bg-surface">
              <HeaderButton
                collection={collection}
                column={null}
                label="Nombre"
                icon={Type}
                rows={allRows}
                sort={view.sort}
                onSort={setSort}
              />
            </div>
            {columns.map((column) => (
              <div key={column.id} role="columnheader" className="min-w-0 border-r border-border/40">
                <HeaderButton
                  collection={collection}
                  column={column}
                  label={column.name || "Sin nombre"}
                  icon={TYPE_ICON[column.type]}
                  rows={allRows}
                  sort={view.sort}
                  onSort={setSort}
                />
              </div>
            ))}
            <div role="columnheader" className="flex items-center justify-center">
              <Popover
                label="Añadir columna"
                trigger={({ ref, toggle, ariaProps }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={toggle}
                    {...ariaProps}
                    aria-label="Añadir columna"
                    title="Añadir columna"
                    className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-border/60 hover:text-text"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                )}
              >
                {(close) => (
                  <AddColumnForm
                    close={close}
                    onAdd={(input) => void store.addColumn(collection.id, input)}
                  />
                )}
              </Popover>
            </div>
          </div>

          {dragEnabled ? (
            <SortableList
              items={rows}
              getLabel={pageTitle}
              noun="elemento"
              onReorder={reorder}
              renderItem={(row, handle, state) => renderRow(row, handle, state.dragging)}
            />
          ) : (
            rows.map((row) => <div key={row.id}>{renderRow(row, null, false)}</div>)
          )}

          {rows.length === 0 && (
            <p className="px-3 py-4 text-sm text-text-muted">
              {allRows.length === 0
                ? "Aún no hay elementos. Escribe un título abajo y pulsa Intro."
                : "Ningún elemento coincide con la búsqueda o el filtro."}
            </p>
          )}

          <div role="row" className="flex">
            <div className="sticky left-0 z-[1] flex items-center bg-bg" style={{ width: TITLE_WIDTH }}>
              <Plus size={13} aria-hidden="true" className="ml-3 shrink-0 text-text-muted" />
              <input
                ref={addRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleAddKey}
                placeholder="Nuevo elemento…"
                aria-label="Nuevo elemento"
                className="m-1 h-7 min-w-0 flex-1 rounded bg-transparent px-2 text-sm placeholder:text-text-muted/70 focus:outline-none focus-visible:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface HeaderButtonProps {
  collection: Page;
  column: Column | null;
  label: string;
  icon: LucideIcon;
  rows: readonly Page[];
  sort: SortSpec | undefined;
  onSort: (sort: SortSpec | undefined) => void;
}

function HeaderButton({ collection, column, label, icon: Icon, rows, sort, onSort }: HeaderButtonProps) {
  const sorted = sort?.columnId === (column?.id ?? TITLE_COLUMN) ? sort.dir : undefined;
  return (
    <Popover
      label={`Opciones de la columna ${label}`}
      trigger={({ ref, toggle, ariaProps }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          {...ariaProps}
          className="flex h-8 w-full min-w-0 items-center gap-1.5 px-2 text-left font-medium hover:bg-surface-hover hover:text-text"
        >
          <Icon size={12} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{label}</span>
          {sorted && <SortMark dir={sorted} />}
        </button>
      )}
    >
      {(close) => (
        <ColumnMenu
          collection={collection}
          column={column}
          rows={rows}
          sort={sort}
          onSort={onSort}
          close={close}
        />
      )}
    </Popover>
  );
}
