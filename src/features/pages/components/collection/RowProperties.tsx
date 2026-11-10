import { usePages } from "../../hooks/usePages";
import { readColumns, readValues, type CellValue } from "../../utils/collection";
import type { Page } from "../../types";
import CellEditor, { CELLS_ROOT_ATTR } from "./CellEditor";
import { TYPE_ICON } from "./CollectionTable";

/** Bloque de propiedades de una fila: una línea por columna de su colección. */
export default function RowProperties({ row, collection }: { row: Page; collection: Page }) {
  const store = usePages();
  const columns = readColumns(collection.properties);
  const values = readValues(row.properties);
  if (columns.length === 0) return null;

  return (
    <dl
      aria-label="Propiedades"
      {...{ [CELLS_ROOT_ATTR]: "" }}
      className="mb-6 flex flex-col border-y border-border py-1.5"
    >
      {columns.map((column) => {
        const Icon = TYPE_ICON[column.type];
        return (
          <div key={column.id} className="flex min-h-9 items-center gap-2">
            <dt className="flex w-36 shrink-0 items-center gap-1.5 text-sm text-text-muted">
              <Icon size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{column.name || "Sin nombre"}</span>
            </dt>
            <dd className="min-w-0 flex-1">
              <CellEditor
                column={column}
                value={values[column.id]}
                cellKey={`${row.id}:${column.id}`}
                variant="block"
                onCommit={(value) =>
                  void store.saveRowValue(row.id, column.id, value as CellValue | null)
                }
              />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
