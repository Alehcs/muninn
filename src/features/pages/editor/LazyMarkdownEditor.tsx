import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";

/**
 * Milkdown y su CSS viven en un trozo aparte que solo se descarga al abrir
 * una página: el arranque de la app no lo paga.
 */
const MarkdownEditorView = lazy(() => import("./MarkdownEditorView"));

export type { MarkdownEditorHandle } from "./MarkdownEditorView";

export default function LazyMarkdownEditor(
  props: ComponentProps<typeof MarkdownEditorView>,
) {
  return (
    <Suspense
      fallback={<p className="py-2 text-sm text-text-muted">Cargando editor…</p>}
    >
      <MarkdownEditorView {...props} />
    </Suspense>
  );
}
