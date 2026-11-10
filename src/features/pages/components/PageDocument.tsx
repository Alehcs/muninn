import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { FolderInput, FilePlus2, Pin, PinOff, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import RowMenu from "@/components/RowMenu";
import { notify } from "@/lib/notify";
import LazyMarkdownEditor, {
  type MarkdownEditorHandle,
} from "../editor/LazyMarkdownEditor";
import { usePages } from "../hooks/usePages";
import { usePageCommands } from "../hooks/usePageCommands";
import { Autosaver, type SaveStatus } from "../utils/autosave";
import { getAncestors } from "../utils/pageTree";
import { plainTextToMarkdown } from "../utils/plainTextToMarkdown";
import { pageCategory, pageTitle, type Page } from "../types";
import CategoryChip from "./CategoryChip";
import PageBreadcrumbs from "./PageBreadcrumbs";
import PageIconPicker from "./PageIconPicker";

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

  // Las notas antiguas (texto plano) se convierten solo para mostrarlas.
  const [initialMarkdown] = useState(() =>
    page.contentFormat === "plain" ? plainTextToMarkdown(page.content) : page.content,
  );
  const [title, setTitle] = useState(page.title);
  const titleValue = useRef(page.title);
  const [bodyStatus, setBodyStatus] = useState<SaveStatus>("idle");
  const [titleStatus, setTitleStatus] = useState<SaveStatus>("idle");

  const [bodySaver] = useState(
    () =>
      new Autosaver({
        save: (markdown) => store.saveContent(page.id, markdown),
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
    (normalized: string) => bodySaver.setBaseline(normalized),
    [bodySaver],
  );

  const ancestors = getAncestors(store.pages, page.id);
  const status = combine(bodyStatus, titleStatus);
  const edited = formatEdited(page.updatedAt);

  return (
    <>
      <PageHeader
        title={pageTitle(page)}
        titleContent={<PageBreadcrumbs ancestors={ancestors} current={page} />}
        primaryAction={{ label: "Nueva página", onClick: () => void commands.createRoot() }}
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

      <article className="mx-auto w-full max-w-[720px] px-8 pb-24 pt-10">
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
          <CategoryChip
            value={pageCategory(page)}
            onChange={(category) => void store.saveCategory(page.id, category)}
          />
          {edited && (
            <span className="text-xs text-text-muted">Editada {edited}</span>
          )}
        </div>

        <LazyMarkdownEditor
          ref={editorRef}
          initialMarkdown={initialMarkdown}
          autoFocus={page.title !== "" || page.content !== ""}
          onReady={handleReady}
          onChange={() => bodySaver.schedule()}
          onFinalMarkdown={(markdown) => void bodySaver.flush(markdown)}
        />
      </article>
    </>
  );
}
