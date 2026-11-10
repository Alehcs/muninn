// @vitest-environment jsdom
import { appendFileSync } from "node:fs";
import { editorViewCtx } from "@milkdown/kit/core";
import { afterEach, describe, expect, it } from "vitest";
import { createMarkdownEditor, type MarkdownEditor } from "./createEditor";
import { plainTextToMarkdown } from "../utils/plainTextToMarkdown";

/**
 * Fidelidad markdown → editor → markdown. Una segunda pasada no debe cambiar
 * nada (estabilidad): lo que el editor escribe, lo vuelve a escribir igual.
 */

let current: MarkdownEditor | null = null;
afterEach(async () => {
  await current?.destroy();
  current = null;
  document.body.innerHTML = "";
});

async function roundTrip(markdown: string): Promise<string> {
  const root = document.createElement("div");
  document.body.appendChild(root);
  current = await createMarkdownEditor({ root, markdown });
  const out = current.getMarkdown();
  await current.destroy();
  current = null;
  root.remove();
  return out;
}

const CASES: Record<string, string> = {
  encabezados: "# Uno\n\n## Dos\n\n### Tres\n",
  "párrafos con saltos duros": "línea uno\\\nlínea dos\\\nlínea tres\n\nOtro párrafo\n",
  "listas anidadas": "- a\n  - b\n    - c\n  - d\n- e\n\n1. uno\n   1. uno punto uno\n2. dos\n",
  "lista de tareas": "- [ ] pendiente\n- [x] hecha\n  - [ ] subtarea\n",
  cita: "> una cita\n>\n> segundo párrafo\n",
  "código en línea y en bloque": "usa `npm test` aquí\n\n```ts\nconst a = 1;\n\nif (a) {\n  b();\n}\n```\n",
  enlaces: "ver [Aurhabits](https://example.com/a?b=1) y <https://example.org/x>\n",
  "negrita y cursiva": "**negrita**, *cursiva* y ***ambas*** con ~~tachado~~\n",
  tabla: "| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |\n",
  separador: "arriba\n\n---\n\nabajo\n",
};

describe("markdown → editor → markdown", () => {
  for (const [name, source] of Object.entries(CASES)) {
    it(`es estable: ${name}`, async () => {
      const first = await roundTrip(source);
      // Estable (una segunda pasada no cambia nada) y, en estos casos,
      // idéntico al original.
      expect(first).toBe(source);
      const second = await roundTrip(first);
      expect(second).toBe(first);
      if (process.env.SHOW_FIDELITY) {
        appendFileSync(process.env.SHOW_FIDELITY!, `--- ${name}\nIN : ${JSON.stringify(source)}\nOUT: ${JSON.stringify(first)}\n`);
      }
    });
  }

  it("notas antiguas convertidas desde texto plano son estables", async () => {
    const plain =
      "Título\nsegunda línea con *asteriscos* y snake_case\n\n- uno\n- dos\n\nver https://example.com/a, ok\n";
    const converted = plainTextToMarkdown(plain);
    const first = await roundTrip(converted);
    const second = await roundTrip(first);
    expect(second).toBe(first);
  });

  it("una nota de texto plano se ve con el mismo texto, línea a línea", async () => {
    const plain = [
      "Reunión ñandú ✓ 日本語",
      "precio: 5 * 3 = 15 [aprox] _x_ `y` <b>no html</b> &amp; ~~no~~",
      "ruta C:\\tmp\\x y snake_case_name",
      "",
      "https://example.com/a_b?c=1&d=2",
      "última línea con barra\\",
    ].join("\n");

    const root = document.createElement("div");
    document.body.appendChild(root);
    current = await createMarkdownEditor({ root, markdown: plainTextToMarkdown(plain) });

    const paragraphs = Array.from(root.querySelectorAll(".ProseMirror > p"))
      .map((p) => {
        const clone = p.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
        clone.querySelectorAll(".ProseMirror-trailingBreak").forEach((el) => el.remove());
        return clone.textContent ?? "";
      })
      .filter((text) => text !== "");

    expect(paragraphs.join("\n\n")).toBe(plain);
  });

  /** Teclea texto carácter a carácter, pasando por las reglas de entrada. */
  function typeChars(editor: MarkdownEditor, text: string) {
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      for (const char of text) {
        const { from, to } = view.state.selection;
        const handled = view.someProp("handleTextInput", (f) => f(view, from, to, char, () => view.state.tr.insertText(char, from, to)));
        if (!handled) view.dispatch(view.state.tr.insertText(char, from, to));
      }
    });
  }

  it("escribir '[] ' crea una tarea; '# ', '> ' y '- ' convierten el bloque", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    current = await createMarkdownEditor({ root, markdown: "" });
    typeChars(current, "[] comprar pan");
    expect(current.getMarkdown()).toBe("- [ ] comprar pan\n");
    await current.destroy();
    current = null;
    root.innerHTML = "";

    for (const [typed, expected] of [
      ["# Título", "# Título\n"],
      ["> cita", "> cita\n"],
      ["- viñeta", "- viñeta\n"],
      ["1. uno", "1. uno\n"],
      ["[x] hecha", "- [x] hecha\n"],
      ["- [ ] con viñeta", "- [ ] con viñeta\n"],
    ] as const) {
      const holder = document.createElement("div");
      document.body.appendChild(holder);
      const editor = await createMarkdownEditor({ root: holder, markdown: "" });
      typeChars(editor, typed);
      expect(editor.getMarkdown(), typed).toBe(expected);
      await editor.destroy();
      holder.remove();
    }
  });
});
