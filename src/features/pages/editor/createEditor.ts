import { CrepeBuilder } from "@milkdown/crepe/builder";
import { blockEdit } from "@milkdown/crepe/feature/block-edit";
import { cursor } from "@milkdown/crepe/feature/cursor";
import { linkTooltip } from "@milkdown/crepe/feature/link-tooltip";
import { listItem } from "@milkdown/crepe/feature/list-item";
import { placeholder } from "@milkdown/crepe/feature/placeholder";
import { table } from "@milkdown/crepe/feature/table";
import { toolbar } from "@milkdown/crepe/feature/toolbar";
import { remarkStringifyOptionsCtx, type Editor } from "@milkdown/kit/core";
import { uploadConfig } from "@milkdown/kit/plugin/upload";
import { bulletListSchema } from "@milkdown/kit/preset/commonmark";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import { findWrapping } from "@milkdown/kit/prose/transform";
import { $inputRule } from "@milkdown/kit/utils";

/**
 * Editor Markdown de las páginas (Milkdown "Crepe", ensamblado a mano).
 *
 * Solo se activan las piezas que la app usa: menú "/", asa de bloque, barra
 * flotante, listas con casillas, enlaces, tablas y marcador de posición.
 * Quedan FUERA a propósito (pesan mucho y no hacen falta): fórmulas LaTeX
 * (KaTeX), CodeMirror con resaltado de lenguajes, imágenes, barra superior e
 * IA. Los bloques de código siguen existiendo como ``` simples.
 *
 * Este módulo no depende de React para poder probar `markdown → editor →
 * markdown` en Vitest.
 */

/**
 * Escribir `[] ` (o `[ ] `, `[x] `) al empezar un bloque lo convierte en una
 * tarea con casilla, como en Notion. Milkdown solo lo hace con `[ ] ` dentro
 * de una viñeta ya existente; esta regla cubre el resto (y `[] ` sin espacio).
 */
const taskInputRule = $inputRule(
  (ctx) =>
    new InputRule(/^\[(?<checked>\s|x)?\]\s$/, (state, match, start, end) => {
      const withChar = match.groups?.checked !== undefined;
      const checked = match.groups?.checked === "x";
      const $start = state.doc.resolve(start);

      for (let depth = $start.depth; depth > 0; depth--) {
        const node = $start.node(depth);
        if (node.type.name === "list_item") {
          // Ya es una viñeta: `[ ] ` lo resuelve Milkdown; `[] ` lo resolvemos aquí.
          if (withChar || node.attrs.checked != null) return null;
          return state.tr
            .deleteRange(start, end)
            .setNodeMarkup($start.before(depth), undefined, { ...node.attrs, checked });
        }
      }

      const tr = state.tr.deleteRange(start, end);
      const range = tr.doc.resolve(start).blockRange();
      const wrapping = range && findWrapping(range, bulletListSchema.type(ctx));
      if (!range || !wrapping) return null;
      tr.wrap(range, wrapping);

      const $inside = tr.doc.resolve(tr.mapping.map(start));
      for (let depth = $inside.depth; depth > 0; depth--) {
        const node = $inside.node(depth);
        if (node.type.name === "list_item") {
          tr.setNodeMarkup($inside.before(depth), undefined, { ...node.attrs, checked });
          break;
        }
      }
      return tr;
    }),
);

export interface MarkdownEditorOptions {
  root: HTMLElement;
  /** Markdown inicial. */
  markdown: string;
  /** Se invoca tras cada cambio del documento, con el Markdown resultante. */
  onChange?: (markdown: string) => void;
}

export interface MarkdownEditor {
  /** Editor de Milkdown por debajo (para pruebas y extensiones). */
  readonly editor: Editor;
  /** Markdown actual del documento (serialización síncrona). */
  getMarkdown(): string;
  focus(): void;
  destroy(): Promise<void>;
}

export async function createMarkdownEditor({
  root,
  markdown,
  onChange,
}: MarkdownEditorOptions): Promise<MarkdownEditor> {
  const builder = new CrepeBuilder({ root, defaultValue: markdown })
    .addFeature(cursor)
    .addFeature(listItem)
    .addFeature(linkTooltip, {
      inputPlaceholder: "Pega o escribe un enlace…",
    })
    .addFeature(placeholder, {
      text: "Escribe aquí, o «/» para insertar un bloque…",
      mode: "block",
    })
    .addFeature(table)
    .addFeature(toolbar, {
      boldLabel: "Negrita",
      italicLabel: "Cursiva",
      strikethroughLabel: "Tachado",
      codeLabel: "Código en línea",
      linkLabel: "Enlace",
    })
    .addFeature(blockEdit, {
      textGroup: {
        label: "Texto",
        text: { label: "Párrafo" },
        h1: { label: "Título 1" },
        h2: { label: "Título 2" },
        h3: { label: "Título 3" },
        h4: null,
        h5: null,
        h6: null,
        quote: { label: "Cita" },
        divider: { label: "Separador" },
      },
      listGroup: {
        label: "Listas",
        bulletList: { label: "Lista con viñetas" },
        orderedList: { label: "Lista numerada" },
        taskList: { label: "Lista de tareas" },
      },
      advancedGroup: {
        label: "Avanzado",
        image: null,
        codeBlock: { label: "Bloque de código" },
        table: { label: "Tabla" },
        math: null,
      },
    });

  builder.editor.use(taskInputRule);

  // Las imágenes pegadas o soltadas quedan fuera de alcance: se ignoran en
  // lugar de guardar una URL `blob:` que dejaría de existir al cerrar la app.
  builder.editor.config((ctx) => {
    // Markdown de la forma más común: viñetas "-" y separador "---".
    ctx.update(remarkStringifyOptionsCtx, (options) => ({
      ...options,
      bullet: "-" as const,
      rule: "-" as const,
    }));
    ctx.update(uploadConfig.key, (previous) => ({
      ...previous,
      uploader: async () => [],
    }));
  });

  if (onChange) {
    builder.on((listener) => {
      listener.markdownUpdated((_ctx, next, previous) => {
        if (next !== previous) onChange(next);
      });
    });
  }

  await builder.create();

  return {
    editor: builder.editor,
    getMarkdown: () => builder.getMarkdown(),
    focus: () => {
      root.querySelector<HTMLElement>(".ProseMirror")?.focus();
    },
    destroy: async () => {
      await builder.destroy();
    },
  };
}
