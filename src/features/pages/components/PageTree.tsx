import { useEffect, useRef, useState } from "react";
import { ChevronRight, FilePlus2, FileText, FolderInput, Pencil, Pin, PinOff, Plus, Table2, Trash2 } from "lucide-react";
import { useNavigation } from "@/app/NavigationContext";
import IconButton from "@/components/IconButton";
import RowMenu from "@/components/RowMenu";
import { usePersistentState } from "@/lib/usePersistentState";
import { cn } from "@/utils/cn";
import { usePages } from "../hooks/usePages";
import { usePageCommands } from "../hooks/usePageCommands";
import { getAncestors, type PageNode } from "../utils/pageTree";
import { pageTitle, UNTITLED, type Page } from "../types";

const EXPANDED_KEY = "aurhabits.pages.expanded";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

interface RowProps {
  node: PageNode;
  depth: number;
  expanded: ReadonlySet<string>;
  toggle: (id: string, force?: boolean) => void;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  activeId: string | undefined;
}

function RenameInput({ page, onDone }: { page: Page; onDone: () => void }) {
  const store = usePages();
  const [value, setValue] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (save && value !== page.title) void store.saveTitle(page.id, value);
    onDone();
  };

  return (
    <input
      ref={inputRef}
      value={value}
      placeholder={UNTITLED}
      aria-label="Nuevo nombre de la página"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
      className="h-6 min-w-0 flex-1 rounded border border-accent bg-bg px-1.5 text-sm"
    />
  );
}

function TreeRow({ node, depth, expanded, toggle, renamingId, setRenamingId, activeId }: RowProps) {
  const { page, children } = node;
  const { navigate } = useNavigation();
  const commands = usePageCommands();
  const open = expanded.has(page.id);
  const active = activeId === page.id;
  const hasChildren = children.length > 0;
  const isCollection = page.kind === "collection";
  const addChild = () => {
    if (isCollection) {
      void commands.createRow(page);
      return;
    }
    toggle(page.id, true);
    void commands.createChild(page);
  };

  return (
    <li>
      <div
        className={cn(
          "group/row relative flex h-7 items-center rounded-md pr-1 text-sm transition-colors",
          active ? "bg-surface-hover text-text" : "text-text-muted hover:bg-surface-hover hover:text-text",
        )}
        style={{ paddingLeft: 2 + depth * 14 }}
      >
        <button
          type="button"
          onClick={() => toggle(page.id)}
          aria-label={open ? `Plegar ${pageTitle(page)}` : `Desplegar ${pageTitle(page)}`}
          aria-expanded={hasChildren ? open : undefined}
          tabIndex={hasChildren ? 0 : -1}
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-border/60",
            !hasChildren && "invisible",
          )}
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            aria-hidden="true"
            className={cn("transition-transform", open && "rotate-90")}
          />
        </button>

        {renamingId === page.id ? (
          <RenameInput page={page} onDone={() => setRenamingId(null)} />
        ) : (
          <button
            type="button"
            onClick={() => navigate({ view: "pages", pageId: page.id })}
            aria-current={active ? "page" : undefined}
            title={pageTitle(page)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            {page.icon ? (
              <span aria-hidden="true" className="w-4 shrink-0 text-center text-[13px] leading-none">
                {page.icon}
              </span>
            ) : isCollection ? (
              <Table2 size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
            ) : (
              <FileText size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
            )}
            <span className={cn("truncate", page.title.trim() === "" && "italic opacity-70")}>
              {pageTitle(page)}
            </span>
            {page.pinned && (
              <Pin size={10} aria-label="Fijada" className="ml-auto shrink-0 opacity-60" />
            )}
          </button>
        )}

        {renamingId !== page.id && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100">
            <RowMenu
              label={`Opciones de ${pageTitle(page)}`}
              floating
              className="[&>button]:h-6 [&>button]:w-6"
              items={[
                { label: "Renombrar", icon: Pencil, onSelect: () => setRenamingId(page.id) },
                {
                  label: page.pinned ? "Soltar" : "Fijar",
                  icon: page.pinned ? PinOff : Pin,
                  onSelect: () => void commands.togglePinned(page),
                },
                {
                  label: isCollection ? "Añadir elemento" : "Añadir subpágina",
                  icon: FilePlus2,
                  onSelect: addChild,
                },
                ...(isCollection
                  ? []
                  : [
                      {
                        label: "Nueva colección",
                        icon: Table2,
                        onSelect: () => {
                          toggle(page.id, true);
                          commands.createCollection(page.id);
                        },
                      },
                    ]),
                { label: "Mover a…", icon: FolderInput, onSelect: () => commands.move(page) },
                {
                  label: "Mover a la papelera",
                  icon: Trash2,
                  danger: true,
                  onSelect: () => void commands.trash(page),
                },
              ]}
            />
            <IconButton
              icon={Plus}
              label={
                isCollection
                  ? `Añadir elemento a ${pageTitle(page)}`
                  : `Añadir subpágina a ${pageTitle(page)}`
              }
              className="h-6 w-6"
              onClick={addChild}
            />
          </div>
        )}
      </div>

      {hasChildren && open && (
        <ul>
          {children.map((child) => (
            <TreeRow
              key={child.page.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              renamingId={renamingId}
              setRenamingId={setRenamingId}
              activeId={activeId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Árbol de páginas de la barra lateral (fijadas primero, con plegado recordado). */
export default function PageTree() {
  const store = usePages();
  const { location } = useNavigation();
  const [expandedList, setExpandedList] = usePersistentState<string[]>(
    EXPANDED_KEY,
    [],
    isStringArray,
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const expanded = new Set(expandedList);
  const activeId = location.view === "pages" ? location.pageId : undefined;

  /** `force` = true despliega siempre; sin él, alterna. */
  const toggle = (id: string, force?: boolean) =>
    setExpandedList((current) => {
      const has = current.includes(id);
      if (force === true) return has ? current : [...current, id];
      return has ? current.filter((item) => item !== id) : [...current, id];
    });

  // Al abrir una página se despliegan sus ancestros para que se vea en el árbol.
  useEffect(() => {
    if (activeId === undefined) return;
    const ancestors = getAncestors(store.pages, activeId).map((page) => page.id);
    setExpandedList((current) => {
      const missing = ancestors.filter((id) => !current.includes(id));
      return missing.length === 0 ? current : [...current, ...missing];
    });
    // Solo cuando cambia la página abierta o su posición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, store.pages.find((page) => page.id === activeId)?.parentId]);

  if (store.status !== "ready") return null;

  if (store.tree.length === 0) {
    return <p className="px-2.5 py-1 text-xs text-text-muted/80">Sin páginas todavía.</p>;
  }

  return (
    <ul aria-label="Árbol de páginas" className="max-h-[42vh] overflow-y-auto pr-0.5">
      {store.tree.map((node) => (
        <TreeRow
          key={node.page.id}
          node={node}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          renamingId={renamingId}
          setRenamingId={setRenamingId}
          activeId={activeId}
        />
      ))}
    </ul>
  );
}
