import { describe, expect, it } from "vitest";
import {
  findRanges,
  makeSnippet,
  matchesLabel,
  normalizeText,
  prepareEntry,
  scoreEntry,
  searchEntries,
  splitByRanges,
  tokenize,
  type SearchEntry,
} from "./searchCore";

function entry(partial: Partial<SearchEntry> & { id: string; title: string }): SearchEntry {
  return { kind: "page", body: "", ref: partial.id, ...partial };
}

describe("normalizeText", () => {
  it("ignora mayúsculas y tildes", () => {
    expect(normalizeText("Canción ÁÉÍÓÚ Ñandú")).toBe("cancion aeiou nandu");
  });

  it("conserva la longitud, incluso con emojis y marcas sueltas", () => {
    for (const text of ["canción 🎉 ok", "é suelta", "İstanbul", "👩‍💻 código", "ﬁn"]) {
      expect(normalizeText(text).length).toBe(text.length);
    }
  });

  it("entiende tildes escritas como letra + marca combinada", () => {
    expect(normalizeText("canción")).toBe("cancion");
  });
});

describe("tokenize", () => {
  it("separa por espacios, normaliza y no repite", () => {
    expect(tokenize("  Canción   CANCION  luz ")).toEqual(["cancion", "luz"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("scoreEntry", () => {
  const score = (e: SearchEntry, query: string) => scoreEntry(prepareEntry(e), tokenize(query));

  it("'cancion' encuentra 'canción'", () => {
    expect(score(entry({ id: "1", title: "Mi canción" }), "cancion")).not.toBeNull();
  });

  it("exige todas las palabras, repartidas entre título y cuerpo", () => {
    const e = entry({ id: "1", title: "Receta de pan", body: "harina y agua" });
    expect(score(e, "pan harina")).not.toBeNull();
    expect(score(e, "pan azúcar")).toBeNull();
  });

  it("el título pesa más que el cuerpo", () => {
    const inTitle = score(entry({ id: "1", title: "Viaje" }), "viaje")!;
    const inBody = score(entry({ id: "2", title: "Otra", body: "un viaje" }), "viaje")!;
    expect(inTitle).toBeGreaterThan(inBody);
  });

  it("principio de título y título exacto suman", () => {
    const exact = score(entry({ id: "1", title: "Viaje" }), "viaje")!;
    const prefix = score(entry({ id: "2", title: "Viaje a Roma" }), "viaje")!;
    const middle = score(entry({ id: "3", title: "Mi gran viaje" }), "viaje")!;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(middle);
  });

  it("una consulta vacía no puntúa", () => {
    expect(score(entry({ id: "1", title: "x" }), "  ")).toBeNull();
  });
});

describe("searchEntries", () => {
  const index = [
    entry({ id: "p1", title: "Notas de lectura", body: "canción de cuna" }),
    entry({ id: "p2", title: "Canción favorita" }),
    entry({ id: "t1", kind: "task", title: "Aprender una canción" }),
    entry({ id: "h1", kind: "habit", title: "Tocar guitarra" }),
    entry({ id: "i1", kind: "item", title: "Disco", body: "tiene una canción", context: "Música › Escuchar" }),
  ].map(prepareEntry);

  it("agrupa por tipo en orden fijo y ordena por puntuación", () => {
    const groups = searchEntries(index, "cancion");
    expect(groups.map((g) => g.kind)).toEqual(["page", "task", "item"]);
    expect(groups[0].results.map((r) => r.entry.id)).toEqual(["p2", "p1"]);
  });

  it("limita cada grupo pero informa del total", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      prepareEntry(entry({ id: `p${i}`, title: `Idea ${i}` })),
    );
    const [group] = searchEntries(many, "idea", { limitPerGroup: 3 });
    expect(group.results).toHaveLength(3);
    expect(group.total).toBe(10);
  });

  it("devuelve el fragmento y el título resaltado", () => {
    const [pages] = searchEntries(index, "cancion");
    const fav = pages.results[0];
    expect(fav.titleRanges).toEqual([[0, 7]]);
    expect(fav.snippet).toBeNull();
    const notes = pages.results[1];
    expect(notes.snippet?.text).toContain("canción");
  });

  it("sin consulta no hay resultados", () => {
    expect(searchEntries(index, "")).toEqual([]);
  });

  it("a igual puntuación gana el título más corto y luego el orden", () => {
    const list = [
      entry({ id: "a", title: "Zeta largo", body: "luz" }),
      entry({ id: "b", title: "Zeta", body: "luz" }),
    ].map(prepareEntry);
    const [group] = searchEntries(list, "luz");
    expect(group.results.map((r) => r.entry.id)).toEqual(["b", "a"]);
  });
});

describe("makeSnippet", () => {
  const snippet = (body: string, query: string) =>
    makeSnippet(body, normalizeText(body), tokenize(query));

  it("recorta alrededor de la coincidencia con puntos suspensivos", () => {
    const body = `${"palabra ".repeat(30)}la canción buscada ${"fin ".repeat(40)}`;
    const result = snippet(body, "cancion")!;
    expect(result.text.startsWith("…")).toBe(true);
    expect(result.text.endsWith("…")).toBe(true);
    const [[from, to]] = result.ranges;
    expect(result.text.slice(from, to)).toBe("canción");
  });

  it("no añade puntos si cabe todo", () => {
    const result = snippet("Una canción corta", "cancion")!;
    expect(result.text).toBe("Una canción corta");
    expect(result.ranges).toEqual([[4, 11]]);
  });

  it("deja una sola línea y quita adornos de Markdown", () => {
    const result = snippet("# Título\n\n**negrita** con canción\ny más", "cancion")!;
    expect(result.text).not.toMatch(/\n/);
    expect(result.text).not.toContain("**");
    const [[from, to]] = result.ranges;
    expect(result.text.slice(from, to)).toBe("canción");
  });

  it("marca varias palabras y devuelve null sin coincidencias", () => {
    const result = snippet("La luz y la sombra", "luz sombra")!;
    expect(result.ranges.map(([a, b]) => result.text.slice(a, b))).toEqual(["luz", "sombra"]);
    expect(snippet("nada por aquí", "cancion")).toBeNull();
  });

  it("las posiciones valen con emojis delante", () => {
    const result = snippet("🎉🎉 gran canción", "cancion")!;
    const [[from, to]] = result.ranges;
    expect(result.text.slice(from, to)).toBe("canción");
  });
});

describe("findRanges / splitByRanges", () => {
  it("une solapes y parte el texto en trozos", () => {
    expect(findRanges("abcabc", ["abc", "bca"])).toEqual([[0, 6]]);
    expect(splitByRanges("Canción libre", [[0, 7]])).toEqual([
      { text: "Canción", match: true },
      { text: " libre", match: false },
    ]);
    expect(splitByRanges("abc", [])).toEqual([{ text: "abc", match: false }]);
  });
});

describe("matchesLabel", () => {
  it("filtra acciones sin tildes ni mayúsculas, con todas las palabras", () => {
    expect(matchesLabel("Nueva página", "pagina")).toBe(true);
    expect(matchesLabel("Nueva página", "nue pag")).toBe(true);
    expect(matchesLabel("Nueva página", "tarea")).toBe(false);
    expect(matchesLabel("Nueva página", "")).toBe(true);
  });
});
