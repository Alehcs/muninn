import { useMemo, useState } from "react";
import { FilePlus2, FileText, FolderInput, Pin, PinOff, Search, Trash2, Undo2 } from "lucide-react";
import Button from "@/components/Button";
import CompactRow from "@/components/CompactRow";
import IconButton from "@/components/IconButton";
import { Page, PageStrip } from "@/components/PageHeader";
import RowMenu from "@/components/RowMenu";
import { inputCls } from "@/components/formStyles";
import { usePages } from "../hooks/usePages";
import { usePageCommands } from "../hooks/usePageCommands";
import { countWithDescendants, getAncestors, matchesQuery } from "../utils/pageTree";
import { pageCategory, pageTitle, type Page as PageRecord } from "../types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/** Fragmento del cuerpo alrededor de la primera coincidencia, en una línea. */
function snippet(page: PageRecord, query: string): string | null {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "" || page.title.toLocaleLowerCase().includes(needle)) return null;
  const index = page.content.toLocaleLowerCase().indexOf(needle);
  if (index === -1) return null;
  const start = Math.max(0, index - 30);
  const text = page.content
    .slice(start, index + needle.length + 60)
    .replace(/\s+/g, " ")
    .trim();
  return `${start > 0 ? "…" : ""}${text}…`;
}

function Icon({ page }: { page: PageRecord }) {
  return page.icon ? (
    <span aria-hidden="true" className="w-5 shrink-0 text-center text-sm">
      {page.icon}
    </span>
  ) : (
    <FileText
      size={15}
      strokeWidth={1.5}
      aria-hidden="true"
      className="w-5 shrink-0 text-text-muted"
    />
  );
}

function PageList({ query }: { query: string }) {
  const store = usePages();
  const commands = usePageCommands();

  const rows = useMemo(
    () =>
      store.pages
        .filter((page) => page.deletedAt === null && matchesQuery(page, query))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)),
    [store.pages, query],
  );

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">
        {query.trim() === ""
          ? "Aún no hay páginas. Crea la primera con «Nueva página»."
          : "Ninguna página coincide con la búsqueda."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {rows.map((page) => {
        const category = pageCategory(page);
        const path = getAncestors(store.pages, page.id)
          .map(pageTitle)
          .join(" › ");
        const match = snippet(page, query);
        return (
          <li key={page.id}>
            <CompactRow
              onActivate={() => commands.open(page.id)}
              leading={<Icon page={page} />}
              trailing={
                <span className="shrink-0 text-xs text-text-muted">
                  {formatDate(page.updatedAt)}
                </span>
              }
              actions={
                <RowMenu
                  label={`Opciones de ${pageTitle(page)}`}
                  floating
                  items={[
                    {
                      label: page.pinned ? "Soltar" : "Fijar",
                      icon: page.pinned ? PinOff : Pin,
                      onSelect: () => void commands.togglePinned(page),
                    },
                    {
                      label: "Añadir subpágina",
                      icon: FilePlus2,
                      onSelect: () => void commands.createChild(page),
                    },
                    {
                      label: "Mover a…",
                      icon: FolderInput,
                      onSelect: () => commands.move(page),
                    },
                    {
                      label: "Mover a la papelera",
                      icon: Trash2,
                      danger: true,
                      onSelect: () => void commands.trash(page),
                    },
                  ]}
                />
              }
            >
              <span className="min-w-0 truncate text-sm">{pageTitle(page)}</span>
              {page.pinned && (
                <Pin size={11} aria-label="Fijada" className="shrink-0 text-text-muted" />
              )}
              {category && (
                <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
                  {category}
                </span>
              )}
              {path && (
                <span className="min-w-0 truncate text-xs text-text-muted">{path}</span>
              )}
              {match && (
                <span className="min-w-0 truncate text-xs text-text-muted">{match}</span>
              )}
            </CompactRow>
          </li>
        );
      })}
    </ul>
  );
}

function TrashList() {
  const store = usePages();
  const commands = usePageCommands();

  if (store.trash.length === 0) {
    return <p className="py-10 text-center text-sm text-text-muted">La papelera está vacía.</p>;
  }

  return (
    <>
      <p className="mb-3 text-sm text-text-muted">
        Las páginas de la papelera no se borran solas. Restáuralas o elimínalas
        definitivamente.
      </p>
      <ul className="flex flex-col">
        {store.trash.map((page) => {
          const included = countWithDescendants(store.pages, page);
          return (
            <li key={page.id}>
              <CompactRow
                leading={<Icon page={page} />}
                trailing={
                  <span className="shrink-0 text-xs text-text-muted">
                    Eliminada el {formatDate(page.deletedAt ?? "")}
                  </span>
                }
                actions={
                  <>
                    <IconButton
                      icon={Undo2}
                      label={`Restaurar ${pageTitle(page)}`}
                      onClick={() => void commands.restore(page)}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      label={`Eliminar definitivamente ${pageTitle(page)}`}
                      onClick={() => void commands.deletePermanently(page, included)}
                    />
                  </>
                }
              >
                <span className="min-w-0 truncate text-sm">{pageTitle(page)}</span>
                {included > 1 && (
                  <span className="shrink-0 text-xs text-text-muted">
                    +{included - 1} subpáginas
                  </span>
                )}
              </CompactRow>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Índice: todas las páginas por última edición, con buscador y papelera. */
export default function PagesIndexView() {
  const store = usePages();
  const commands = usePageCommands();
  const [query, setQuery] = useState("");
  const [showTrash, setShowTrash] = useState(false);

  const activeCount = store.pages.filter((page) => page.deletedAt === null).length;

  return (
    <Page
      title="Páginas"
      subtitle={showTrash ? "Papelera" : `${activeCount}`}
      width="3xl"
      primaryAction={{ label: "Nueva página", onClick: () => void commands.createRoot() }}
      actions={
        <Button variant="quiet" onClick={() => setShowTrash((current) => !current)}>
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
          {showTrash ? "Volver a las páginas" : `Papelera${store.trash.length ? ` (${store.trash.length})` : ""}`}
        </Button>
      }
    >
      {store.status === "loading" ? (
        <p className="text-sm text-text-muted">Cargando páginas…</p>
      ) : store.status === "error" ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-text-muted">No se pudieron cargar las páginas.</p>
          <Button onClick={() => void store.reload()}>Reintentar</Button>
        </div>
      ) : showTrash ? (
        <TrashList />
      ) : (
        <>
          <PageStrip>
            <label className="relative block w-full max-w-sm">
              <span className="sr-only">Buscar páginas</span>
              <Search
                size={14}
                strokeWidth={1.75}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por título o contenido"
                className={`${inputCls} pl-8`}
              />
            </label>
          </PageStrip>
          <PageList query={query} />
        </>
      )}
    </Page>
  );
}
