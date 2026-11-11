import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  CalendarCheck,
  CornerDownLeft,
  FilePlus2,
  FileText,
  ListChecks,
  Repeat,
  Search,
  Settings,
  SquareCheckBig,
  StickyNote,
  Table2,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigation } from "@/app/NavigationContext";
import { NAV_GROUPS, SETTINGS_ITEM, VIEW_LABELS, type View } from "@/app/navigation";
import { usePages } from "@/features/pages/hooks/usePages";
import { usePageCommands } from "@/features/pages/hooks/usePageCommands";
import { getCollectionOf } from "@/features/pages/utils/pageTree";
import { pageTitle } from "@/features/pages/types";
import { closePalette, requestTaskFocus, usePaletteOpen } from "@/lib/commandPalette";
import { cn } from "@/utils/cn";
import {
  KIND_LABEL,
  matchesLabel,
  searchEntries,
  splitByRanges,
  type Range,
  type SearchKind,
} from "./searchCore";
import { loadSearchIndex, type IndexEntry, type SearchRef } from "./searchIndex";

const VIEW_ICON: Record<View, LucideIcon> = {
  today: CalendarCheck,
  pages: StickyNote,
  todos: SquareCheckBig,
  roadmap: ListChecks,
  habits: Repeat,
  study: Timer,
  settings: Settings,
};

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  page: FileText,
  task: SquareCheckBig,
  item: ListChecks,
  habit: Repeat,
};

const RECENT_PAGES = 5;
const MAX_ACTIONS_WHEN_SEARCHING = 4;
const LISTBOX_ID = "command-palette-listbox";
const FOCUSABLE = "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

interface Row {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Dónde vive (colección, lista › sección…). */
  context?: string;
  /** Texto de ayuda a la derecha (p. ej. "Ir a"). */
  hint?: string;
  titleRanges?: Range[];
  snippet?: { text: string; ranges: Range[] } | null;
  run: () => void;
}

interface Section {
  key: string;
  label: string;
  /** Aciertos que no caben en el grupo. */
  more?: number;
  rows: Row[];
}

function Highlight({ text, ranges }: { text: string; ranges?: readonly Range[] }): ReactNode {
  if (!ranges || ranges.length === 0) return text;
  return splitByRanges(text, ranges).map((part, index) =>
    part.match ? (
      <mark key={index} className="rounded-sm bg-accent/25 text-inherit">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

/** Paleta de búsqueda global (Cmd/Ctrl+K). No monta nada mientras está cerrada. */
export default function CommandPalette() {
  const open = usePaletteOpen();
  return open ? <Palette /> : null;
}

function Palette() {
  const store = usePages();
  const commands = usePageCommands();
  const { navigate } = useNavigation();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const skipRestoreRef = useRef(false);

  // Foco al abrir y, al cerrar, de vuelta a donde estaba.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      if (!skipRestoreRef.current) previous?.focus?.();
    };
  }, []);

  // El índice se carga al abrir (los datos son pequeños) y se filtra en memoria.
  useEffect(() => {
    let cancelled = false;
    loadSearchIndex().then(
      (entries) => {
        if (!cancelled) setIndex(entries);
      },
      (error) => {
        console.error("No se pudo cargar el índice de búsqueda", error);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  /** Cierra la paleta y ejecuta la acción (la navegación decide dónde queda el foco). */
  const finish = (action: () => void) => {
    skipRestoreRef.current = true;
    closePalette();
    action();
  };

  const actions = useMemo<Row[]>(() => {
    const goTo = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM].map(
      (item): Row => ({
        key: `go-${item.view}`,
        label: `Ir a ${VIEW_LABELS[item.view]}`,
        icon: VIEW_ICON[item.view],
        run: () => finish(() => navigate(item.view)),
      }),
    );
    return [
      {
        key: "new-page",
        label: "Nueva página",
        icon: FilePlus2,
        run: () => finish(() => void commands.createRoot()),
      },
      {
        key: "new-collection",
        label: "Nueva colección",
        icon: Table2,
        run: () => finish(() => commands.createCollection(null)),
      },
      {
        key: "new-task",
        label: "Nueva tarea",
        icon: SquareCheckBig,
        run: () =>
          finish(() => {
            requestTaskFocus();
            navigate("todos");
          }),
      },
      ...goTo,
    ];
    // `finish` solo usa refs y funciones estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, commands]);

  const recent = useMemo<Row[]>(
    () =>
      store.pages
        .filter((page) => page.deletedAt === null && getCollectionOf(store.pages, page) === undefined)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
        .slice(0, RECENT_PAGES)
        .map((page) => ({
          key: `recent-${page.id}`,
          label: pageTitle(page),
          icon: FileText,
          run: () => finish(() => navigate({ view: "pages", pageId: page.id })),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.pages, navigate],
  );

  const searching = deferredQuery.trim() !== "";

  const sections = useMemo<Section[]>(() => {
    if (!searching) {
      const result: Section[] = [{ key: "actions", label: "Acciones rápidas", rows: actions }];
      if (recent.length > 0) result.push({ key: "recent", label: "Páginas recientes", rows: recent });
      return result;
    }

    const result: Section[] = [];
    const matchingActions = actions
      .filter((action) => matchesLabel(action.label, deferredQuery))
      .slice(0, MAX_ACTIONS_WHEN_SEARCHING);
    if (matchingActions.length > 0) {
      result.push({ key: "actions", label: "Acciones", rows: matchingActions });
    }

    for (const group of searchEntries(index ?? [], deferredQuery)) {
      result.push({
        key: group.kind,
        label: KIND_LABEL[group.kind],
        more: group.total - group.results.length,
        rows: group.results.map(({ entry, titleRanges, snippet }) => ({
          key: `${group.kind}-${entry.id}`,
          label: entry.title,
          icon: KIND_ICON[entry.kind],
          context: entry.context,
          titleRanges,
          snippet,
          run: () => finish(() => open(entry.ref)),
        })),
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, deferredQuery, actions, recent, index, navigate]);

  function open(ref: SearchRef): void {
    switch (ref.kind) {
      case "page":
        navigate({ view: "pages", pageId: ref.pageId });
        break;
      case "task":
        navigate("todos");
        break;
      case "item":
        navigate({ view: "roadmap", roadmapId: ref.roadmapId });
        break;
      case "habit":
        navigate("habits");
        break;
    }
  }

  const flat = useMemo(() => sections.flatMap((section) => section.rows), [sections]);
  const activeRow = flat[Math.min(active, flat.length - 1)];

  // Al cambiar los resultados, la selección vuelve al primero.
  useEffect(() => {
    setActive(0);
  }, [deferredQuery, index]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, sections]);

  const move = (delta: number) => {
    if (flat.length === 0) return;
    setActive((current) => (Math.min(current, flat.length - 1) + delta + flat.length) % flat.length);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closePalette();
        return;
      case "ArrowDown":
        event.preventDefault();
        move(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        return;
      case "Home":
        if (event.target === inputRef.current && query === "") {
          event.preventDefault();
          setActive(0);
        }
        return;
      case "End":
        if (event.target === inputRef.current && query === "") {
          event.preventDefault();
          setActive(Math.max(0, flat.length - 1));
        }
        return;
      case "Enter":
        event.preventDefault();
        activeRow?.run();
        return;
      case "Tab": {
        // Foco atrapado: lo único enfocable es la caja de búsqueda.
        event.preventDefault();
        const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        (items[0] ?? inputRef.current)?.focus();
        return;
      }
    }
  };

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePalette();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda global"
        onKeyDown={handleKeyDown}
        className="flex max-h-[min(70vh,560px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls={LISTBOX_ID}
            aria-activedescendant={activeRow ? `palette-${activeRow.key}` : undefined}
            aria-autocomplete="list"
            aria-label="Buscar en Aurhabits"
            placeholder="Buscar páginas, tareas, listas y hábitos…"
            autoComplete="off"
            spellCheck={false}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm placeholder:text-text-muted/70 focus:outline-none focus-visible:outline-none"
          />
        </div>

        <div
          ref={listRef}
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Resultados"
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {sections.map((section) => (
            <div key={section.key} role="group" aria-labelledby={`palette-group-${section.key}`} className="mb-1">
              <p
                id={`palette-group-${section.key}`}
                className="flex justify-between px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-text-muted/80"
              >
                <span>{section.label}</span>
                {section.more !== undefined && section.more > 0 && (
                  <span className="normal-case tracking-normal">+{section.more} más</span>
                )}
              </p>
              {section.rows.map((row) => {
                flatIndex += 1;
                const position = flatIndex;
                const selected = row === activeRow;
                const Icon = row.icon;
                return (
                  <div
                    key={row.key}
                    id={`palette-${row.key}`}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => active !== position && setActive(position)}
                    onClick={row.run}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5",
                      selected ? "bg-surface-hover" : "hover:bg-surface-hover",
                    )}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-text-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 truncate text-sm">
                          <Highlight text={row.label} ranges={row.titleRanges} />
                        </span>
                        {row.context && (
                          <span className="shrink-0 truncate text-xs text-text-muted">{row.context}</span>
                        )}
                      </div>
                      {row.snippet && (
                        <p className="truncate text-xs text-text-muted">
                          <Highlight text={row.snippet.text} ranges={row.snippet.ranges} />
                        </p>
                      )}
                    </div>
                    {selected && (
                      <CornerDownLeft
                        size={13}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-text-muted"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {searching && flat.length === 0 && (
            <p role="status" className="px-3 py-8 text-center text-sm text-text-muted">
              {failed
                ? "No se pudo cargar el índice de búsqueda."
                : index === null
                  ? "Buscando…"
                  : `Sin resultados para «${deferredQuery.trim()}».`}
            </p>
          )}
          {searching && flat.length > 0 && index === null && !failed && (
            <p role="status" className="px-3 py-2 text-xs text-text-muted">
              Cargando el resto de resultados…
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-text-muted">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
