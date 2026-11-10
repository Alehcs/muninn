import { useEffect, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import { openExternalUrl } from "@/lib/platform";
import { notify } from "@/lib/notify";
import { createMarkdownEditor, type MarkdownEditor } from "./createEditor";
import "@milkdown/crepe/theme/common/prosemirror.css";
import "@milkdown/crepe/theme/common/block-edit.css";
import "@milkdown/crepe/theme/common/cursor.css";
import "@milkdown/crepe/theme/common/link-tooltip.css";
import "@milkdown/crepe/theme/common/list-item.css";
import "@milkdown/crepe/theme/common/placeholder.css";
import "@milkdown/crepe/theme/common/table.css";
import "@milkdown/crepe/theme/common/toolbar.css";
import "./editor.css";

export interface MarkdownEditorHandle {
  focus: () => void;
  /** Markdown actual, o null si el editor aún no está listo. */
  getMarkdown: () => string | null;
}

interface MarkdownEditorViewProps {
  /** Solo se lee al montar; para otra página, monta otro editor (`key`). */
  initialMarkdown: string;
  /** Con el editor listo: el Markdown que produce al cargar `initialMarkdown`. */
  onReady: (normalizedMarkdown: string) => void;
  onChange: (markdown: string) => void;
  /** Justo antes de destruir el editor: último Markdown para no perder nada. */
  onFinalMarkdown: (markdown: string) => void;
  autoFocus?: boolean;
  ref?: Ref<MarkdownEditorHandle>;
}

/** Esquemas de enlace que se abren fuera de la app. */
const EXTERNAL = /^(https?:|mailto:)/i;

/**
 * Editor WYSIWYG de Markdown. Es el único módulo que importa Milkdown y se
 * carga con `import()` dinámico (ver `LazyMarkdownEditor`).
 */
export default function MarkdownEditorView({
  initialMarkdown,
  onReady,
  onChange,
  onFinalMarkdown,
  autoFocus,
  ref,
}: MarkdownEditorViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MarkdownEditor | null>(null);
  const initialRef = useRef(initialMarkdown);
  const callbacks = useRef({ onReady, onChange, onFinalMarkdown });
  callbacks.current = { onReady, onChange, onFinalMarkdown };

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getMarkdown: () => editorRef.current?.getMarkdown() ?? null,
  }));

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return undefined;

    let disposed = false;
    let instance: MarkdownEditor | null = null;

    createMarkdownEditor({
      root,
      markdown: initialRef.current,
      onChange: (markdown) => {
        if (!disposed) callbacks.current.onChange(markdown);
      },
    })
      .then(async (created) => {
        if (disposed) {
          await created.destroy();
          return;
        }
        instance = created;
        editorRef.current = created;
        callbacks.current.onReady(created.getMarkdown());
        if (autoFocus) created.focus();
      })
      .catch((error: unknown) => {
        console.error("Editor failed to start", error);
        notify.error("No se pudo iniciar el editor.");
      });

    // Clic en un enlace: se abre fuera de la app en vez de navegar el webview.
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a[href]");
      if (!anchor || !root.contains(anchor)) return;
      const href = anchor.getAttribute("href") ?? "";
      event.preventDefault();
      if (!EXTERNAL.test(href)) return;
      // Con texto seleccionado (arrastre) el clic no es para abrir.
      if (window.getSelection()?.toString()) return;
      void openExternalUrl(href).catch(() => notify.error("No se pudo abrir el enlace."));
    };
    root.addEventListener("click", handleClick);

    return () => {
      disposed = true;
      root.removeEventListener("click", handleClick);
      if (instance) {
        callbacks.current.onFinalMarkdown(instance.getMarkdown());
        void instance.destroy();
      }
      editorRef.current = null;
    };
    // El editor se crea una vez por montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={rootRef} className="page-editor" />;
}
