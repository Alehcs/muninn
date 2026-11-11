import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronRight, FileDown, FolderInput, FilePlus2, Pin, PinOff, Table2, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import RowMenu from "@/components/RowMenu";
import { notify } from "@/lib/notify";
import { exportPageMarkdown } from "@/features/export/exportService";
import PageTasks from "@/features/todos/components/PageTasks";
import LazyMarkdownEditor, {
  type MarkdownEditorHandle,
} from "../editor/LazyMarkdownEditor";
import { usePages } from "../hooks/usePages";
import { usePageCommands } from "../hooks/usePageCommands";
import { Autosaver, type SaveStatus } from "../utils/autosave";
import { claimPage, forgetDraft, getDraft, isCurrentOwner } from "../utils/pageDrafts";
import { getAncestors, getCollectionOf } from "../utils/pageTree";
import { plainTextToMarkdown } from "../utils/plainTextToMarkdown";
import { pageCategory, pageTitle, type Page } from "../types";
import CategoryChip from "./CategoryChip";
import PageBreadcrumbs from "./PageBreadcrumbs";
import PageIconPicker from "./PageIconPicker";
import CollectionTable from "./collection/CollectionTable";
import RowProperties from "./collection/RowProperties";

/** Estado combinado del guardado de cuerpo y título, para el indicador. */
function combine(a: SaveStatus, b: SaveStatus): SaveStatus {
  for (const status of ["error", "saving", "pending", "saved"] as const) {
    if (a === status || b === status) return status;
  }
  return "idle";
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  pending: "Guardando…",
  saving: "Guardando…",
  saved: "Guardado",
  error: "Sin guardar · reintentando",
};

function formatEdited(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Una página abierta: título editable, icono, categoría y editor Markdown.
 * Se monta con `key={page.id}`: cada página tiene su propio editor y sus
 * propios guardados automáticos.
 *
 * Abrirla no escribe nada: el guardado compara con lo que el editor produjo
 * al cargar (ver `Autosaver`).
 */
export default function PageDocument({ page }: { page: Page }) {
  const store = usePages();
  const commands = usePageCommands();
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const addRowRef = useRef<HTMLInputElement>(null);

  // Las notas antiguas (texto plano) se convierten solo para mostrarlas.
  // Si un guardado anterior de esta página falló, se reabre con ese borrador (no con la versión vieja).
  const [draft] = useState(() => getDraft(page.id));
  const [initialMarkdown] = useState(() =>
    draft ??
    (page.contentFormat === "plain" ? plainTextToMarkdown(page.content) : page.content),
  );
  // Quien guarda es la última instancia abierta: el reintento de una antigua se descarta.
  const ownerRef = useRef(0);
  useEffect(() => {
    ownerRef.current = claimPage(page.id);
  }, [page.id]);
  const [title, setTitle] = useState(page.title);
  const titleValue = useRef(page.title);
  const isCollection = page.kind === "collection";
  const rowOf = isCollection ? undefined : getCollectionOf(store.pages, page);
  // Descripción de una colección: plegada si está vacía; el editor, una vez abierto, se conserva.
  const [descOpen, setDescOpen] = useState(page.content.trim() !== "");
  const [descMounted, setDescMounted] = useState(descOpen);
  const [descFocus, setDescFocus] = useState(false);
  const [bodyStatus, setBodyStatus] = useState<SaveStatus>("idle");
  const [titleStatus, setTitleStatus] = useState<SaveStatus>("idle");

  const [bodySaver] = useState(
    () =>
      new Autosaver({
        save: async (markdown) => {
          if (!isCurrentOwner(page.id, ownerRef.current)) return;
          await store.saveContent(page.id, markdown);
        },
        readCurrent: () => editorRef.current?.getMarkdown() ?? null,
        onStatus: setBodyStatus,
        onError: () =>
          notify.error(
            "No se pudo guardar la página. El texto sigue en pantalla y se reintentará.",
          ),
      }),
  );
  const [titleSaver] = useState(() => {
    const saver = new Autosaver({
      save: (value) => store.saveTitle(page.id, value),
      readCurrent: () => titleValue.current,
      onStatus: setTitleStatus,
    });
    saver.setBaseline(page.title);
    return saver;
  });

  // Guardar al salir de la página, al ocultar/cerrar la ventana y al desmontar.
  useEffect(() => {
    const flushAll = () => {
      void bodySaver.flush();
      void titleSaver.flush(titleValue.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    window.addEventListener("beforeunload", flushAll);
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flushAll);
      window.removeEventListener("pagehide", flushAll);
      document.removeEventListener("visibilitychange", onVisibility);
      // El cuerpo lo guarda `onFinalMarkdown` (el editor aún existe ahí).
      void titleSaver.flush(titleValue.current);
    };
  }, [bodySaver, titleSaver]);

  // Una página recién creada (sin título ni cuerpo) abre con el foco en el título.
  useEffect(() => {
    if (page.title === "" && page.content === "") titleRef.current?.focus();
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El título se renombra también desde la barra lateral.
  useEffect(() => {
    if (document.activeElement !== titleRef.current && page.title !== titleValue.current) {
      titleValue.current = page.title;
      setTitle(page.title);
      titleSaver.setBaseline(page.title);
    }
  }, [page.title, titleSaver]);

  // Altura del título según su contenido.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void titleSaver.flush(titleValue.current);
      editorRef.current?.focus();
    }
  };

  const handleReady = useCallback(
    (normalized: string) => {
      if (draft === undefined || normalized === page.content) {
        if (draft !== undefined) forgetDraft(page.id);
        bodySaver.setBaseline(normalized);
        return;
      }
      // Hay un borrador sin guardar: la referencia es lo que hay en la base, para que se escriba.
      bodySaver.setBaseline(page.content);
      bodySaver.schedule();
    },
    [bodySaver, draft, page.content, page.id],
  );

  const ancestors = getAncestors(store.pages, page.id);
  const status = combine(bodyStatus, titleStatus);
  const edited = formatEdited(page.updatedAt);

  return (
    <>
      <PageHeader
        title={pageTitle(page)}
        titleContent={<PageBreadcrumbs ancestors={ancestors} current={page} />}
        primaryAction={
          isCollection
            ? // En una colección, Cmd/Ctrl+N lleva al campo "Nuevo elemento…" en vez de crear una página suelta.
              { label: "Nuevo elemento", onClick: () => addRowRef.current?.focus() }
            : { label: "Nueva página", onClick: () => void commands.createRoot() }
        }
        actions={
          <>
            <span
              role="status"
              aria-live="polite"
              className="text-xs text-text-muted"
            >
              {STATUS_LABEL[status]}
            </span>
            <RowMenu
              label="Opciones de la página"
              floating
              items={[
                {
                  label: page.pinned ? "Soltar" : "Fijar",
                  icon: page.pinned ? PinOff : Pin,
                  onSelect: () => void commands.togglePinned(page),
                },
                isCollection
                  ? {
                      label: "Añadir elemento",
                      icon: FilePlus2,
                      onSelect: () => void commands.createRow(page),
                    }
                  : {
                      label: "Añadir subpágina",
                      icon: FilePlus2,
                      onSelect: () => void commands.createChild(page),
                    },
                ...(isCollection
                  ? []
                  : [
                      {
                        label: "Nueva colección",
                        icon: Table2,
                        onSelect: () => commands.createCollection(page.id),
                      },
                    ]),
                ...(!isCollection &&
                !rowOf &&
                !store.pages.some((p) => p.parentId === page.id && p.deletedAt === null)
                  ? [
                      {
                        label: "Convertir en colección",
                        icon: Table2,
                        onSelect: async () => {
                          await bodySaver.flush();
                          await titleSaver.flush(titleValue.current);
                          await commands.convertToCollection(page);
                        },
                      },
                    ]
                  : []),
                {
                  label: "Exportar como Markdown…",
                  icon: FileDown,
                  onSelect: async () => {
                    try {
                      // Se exporta lo que hay en pantalla, aunque aún no se haya guardado.
                      await bodySaver.flush();
                      await titleSaver.flush(titleValue.current);
                      const markdown = editorRef.current?.getMarkdown() ?? null;
                      const current: Page = {
                        ...page,
                        title: titleValue.current,
                        ...(markdown !== null
                          ? { content: markdown, contentFormat: "markdown" as const }
                          : {}),
                      };
                      const saved = await exportPageMarkdown(current, store.pages);
                      if (saved !== null) notify.success("Página exportada como Markdown.");
                    } catch (error) {
                      console.error("No se pudo exportar la página", error);
                      notify.error("No se pudo exportar la página.");
                    }
                  },
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
                  onSelect: async () => {
                    // Lo escrito hasta ahora se guarda antes de enviar la página a la papelera.
                    await bodySaver.flush();
                    await titleSaver.flush(titleValue.current);
                    void commands.trash(page);
                  },
                },
              ]}
            />
          </>
        }
      />

      <article
        className={`mx-auto w-full px-8 pb-24 pt-10 ${isCollection ? "max-w-6xl" : "max-w-[720px]"}`}
      >
        <div className="group/title">
          <PageIconPicker
            icon={page.icon}
            onChange={(icon) => void store.saveIcon(page.id, icon)}
          />
          <textarea
            ref={titleRef}
            value={title}
            rows={1}
            placeholder="Sin título"
            aria-label="Título de la página"
            onChange={(event) => {
              const value = event.target.value.replace(/\n/g, " ");
              titleValue.current = value;
              setTitle(value);
              titleSaver.schedule();
            }}
            onBlur={() => void titleSaver.flush(titleValue.current)}
            onKeyDown={handleTitleKeyDown}
            className="page-title mt-1 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-4xl font-bold leading-tight tracking-tight text-text placeholder:text-text-muted/40 focus:outline-none focus-visible:outline-none"
          />
        </div>

        <div className="mb-6 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {!isCollection && !rowOf && (
            <CategoryChip
              value={pageCategory(page)}
              onChange={(category) => void store.saveCategory(page.id, category)}
            />
          )}
          {edited && (
            <span className="text-xs text-text-muted">Editada {edited}</span>
          )}
        </div>

        {rowOf && <RowProperties row={page} collection={rowOf} />}

        {isCollection && (
          <button
            type="button"
            aria-expanded={descOpen}
            onClick={() => {
              setDescOpen((current) => !current);
              setDescMounted(true);
              setDescFocus(true);
            }}
            className="mb-1 inline-flex items-center gap-1 rounded text-sm text-text-muted hover:text-text"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className={descOpen ? "rotate-90 transition-transform" : "transition-transform"}
            />
            Descripción
          </button>
        )}

        {(!isCollection || descMounted) && (
          <div hidden={isCollection && !descOpen}>
            <LazyMarkdownEditor
              ref={editorRef}
              initialMarkdown={initialMarkdown}
              autoFocus={
                isCollection ? descFocus : page.title !== "" || page.content !== ""
              }
              onReady={handleReady}
              onChange={() => bodySaver.schedule()}
              onFinalMarkdown={(markdown) => void bodySaver.flush(markdown)}
            />
          </div>
        )}

        {isCollection && <CollectionTable collection={page} addInputRef={addRowRef} />}

        <PageTasks pageId={page.id} />
      </article>
    </>
  );
}
