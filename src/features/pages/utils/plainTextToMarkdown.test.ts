import { describe, expect, it } from "vitest";
import { escapeMarkdownText, plainTextToMarkdown } from "./plainTextToMarkdown";

const md = plainTextToMarkdown;

describe("plainTextToMarkdown", () => {
  it("texto vacío o solo espacios da vacío", () => {
    expect(md("")).toBe("");
    expect(md("  \n\n \n")).toBe("");
  });

  it("una línea no cambia", () => {
    expect(md("Hola mundo")).toBe("Hola mundo");
  });

  it("conserva cada salto de línea con saltos duros", () => {
    expect(md("uno\ndos\ntres")).toBe("uno\\\ndos\\\ntres");
  });

  it("una línea en blanco separa párrafos y varias se reducen a una", () => {
    expect(md("a\n\nb\n\n\n\nc")).toBe("a\n\nb\n\nc");
  });

  it("acepta \\r\\n y \\r como saltos", () => {
    expect(md("a\r\nb\rc")).toBe("a\\\nb\\\nc");
  });

  it("respeta listas, casillas y listas numeradas, y las mantiene juntas", () => {
    expect(md("- uno\n- dos\n* tres\n+ cuatro\n1. cinco\n2) seis")).toBe(
      "- uno\n- dos\n* tres\n+ cuatro\n1. cinco\n2) seis",
    );
    expect(md("- [ ] pendiente\n- [x] hecha")).toBe("- [ ] pendiente\n- [x] hecha");
  });

  it("conserva la sangría de las listas anidadas", () => {
    expect(md("- a\n  - b\n    - c")).toBe("- a\n  - b\n    - c");
  });

  it("separa con línea en blanco el texto de las listas y encabezados", () => {
    expect(md("Intro\n- a\n- b\nfin")).toBe("Intro\n\n- a\n- b\n\nfin");
    expect(md("# Título\ntexto\n## Sub\nmás")).toBe("# Título\n\ntexto\n\n## Sub\n\nmás");
  });

  it("las citas mantienen sus saltos", () => {
    expect(md("> a\n> b")).toBe("> a\\\n> b");
  });

  it("no toma por encabezado '#hashtag' ni por lista '-5 grados'", () => {
    expect(md("#hashtag")).toBe("#hashtag");
    expect(md("-5 grados")).toBe("-5 grados");
  });

  it("convierte URLs sueltas en enlaces automáticos sin comerse la puntuación", () => {
    expect(md("mira https://example.com/a?b=1&c=2, y luego")).toBe(
      "mira <https://example.com/a?b=1&c=2>, y luego",
    );
    expect(md("(ver https://example.com/x).")).toBe("(ver <https://example.com/x>).");
    expect(md("https://es.wikipedia.org/wiki/Foo_(bar)")).toBe(
      "<https://es.wikipedia.org/wiki/Foo_(bar)>",
    );
  });

  it("enlaza URLs sueltas dentro de listas pero no toca enlaces Markdown", () => {
    expect(md("- ver https://a.test/x")).toBe("- ver <https://a.test/x>");
    expect(md("- [a](https://a.test/x) y <https://b.test>")).toBe(
      "- [a](https://a.test/x) y <https://b.test>",
    );
  });

  it("escapa los caracteres de formato para que se vean literalmente", () => {
    expect(md("2 * 3 * 4")).toBe("2 \\* 3 \\* 4");
    expect(md("usa `x` y [y]")).toBe("usa \\`x\\` y \\[y\\]");
    expect(md("_cursiva_ y snake_case_name")).toBe("\\_cursiva\\_ y snake_case_name");
    expect(md("ruta C:\\tmp\\x")).toBe("ruta C:\\\\tmp\\\\x");
    expect(md("<b>no html</b>")).toBe("\\<b>no html\\</b>");
    expect(md("~~tachado~~ &amp; &")).toBe("\\~\\~tachado\\~\\~ \\&amp; &");
  });

  it("una línea que termina en barra invertida no se come el salto", () => {
    expect(md("a\\\nb")).toBe("a\\\\\\\nb");
  });

  it("'---' es separador y '===' no forma un título", () => {
    expect(md("a\n---\nb")).toBe("a\n\n---\n\nb");
    expect(md("a\n===")).toBe("a\\\n\\===");
  });

  it("un marcador solo ('-', '1.') se conserva como texto, no como lista vacía", () => {
    expect(md("a\n-\nb")).toBe("a\\\n\\-\\\nb");
    expect(md("1.")).toBe("1\\.");
    expect(md("+")).toBe("\\+");
  });

  it("copia los bloques de código tal cual", () => {
    const code = "texto\n```ts\nconst a = 1;\n\n  - no lista *x*\n```\nfin";
    expect(md(code)).toBe("texto\n\n```ts\nconst a = 1;\n\n  - no lista *x*\n```\n\nfin");
  });

  it("quita sangrías de 4+ espacios y espacios finales del texto", () => {
    expect(md("    sangrado   \ny")).toBe("sangrado\\\ny");
  });

  it("no pierde ningún carácter de texto", () => {
    const original =
      "Reunión ñandú ✓ 日本語\nprecio: 5 * 3 = 15 [aprox] _x_ `y`\n\nhttps://x.test/a_b*c\nfin\\";
    // Se deshace el formato que añade la conversión y debe quedar el texto.
    const unwrapped = md(original)
      .replace(/<(https?:\/\/[^>]+)>/g, "$1")
      .replace(/\\\n/g, "\n")
      .replace(/\\([\\`*[\]<_~&=])/g, "$1");
    expect(unwrapped).toBe(original);
  });
});

describe("escapeMarkdownText", () => {
  it("deja intacto el texto sin caracteres especiales", () => {
    expect(escapeMarkdownText("Hola, ¿qué tal? 100% (ok) #1 a-b")).toBe(
      "Hola, ¿qué tal? 100% (ok) #1 a-b",
    );
  });
});
