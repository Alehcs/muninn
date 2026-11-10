import { describe, expect, it } from "vitest";
import {
  COLLECTION_TEMPLATES,
  columnsFromTemplate,
  convertValue,
  countByOption,
  filterRows,
  mergeProperties,
  normalizeUrl,
  parseProperties,
  planTypeChange,
  readColumns,
  readValues,
  readView,
  sortRows,
  withRowValue,
  withView,
  type Column,
  type RowLike,
} from "./collection";

const status: Column = {
  id: "st",
  name: "Estado",
  type: "select",
  options: [
    { id: "o1", label: "Por leer" },
    { id: "o2", label: "Leyendo" },
    { id: "o3", label: "Leído" },
  ],
};
const author: Column = { id: "au", name: "Autor", type: "text" };
const rating: Column = { id: "ra", name: "Valoración", type: "number" };
const columns = [author, status, rating];

function row(id: string, title: string, values: Record<string, unknown>, order = 0): RowLike {
  return {
    id,
    title,
    sortOrder: order,
    createdAt: `2026-01-0${order + 1}`,
    properties: { values },
  };
}

describe("parseo tolerante", () => {
  it("JSON inválido o que no es objeto da {}", () => {
    expect(parseProperties("no json")).toEqual({});
    expect(parseProperties("[1,2]")).toEqual({});
    expect(parseProperties("null")).toEqual({});
    expect(parseProperties('{"categoria":"x"}')).toEqual({ categoria: "x" });
  });

  it("readColumns descarta lo inválido, repite ids una vez y corrige tipos", () => {
    const columns = readColumns({
      columns: [
        { id: "a", name: "A", type: "number" },
        { id: "a", name: "duplicada", type: "text" },
        { name: "sin id", type: "text" },
        "basura",
        { id: "b", name: "B", type: "inventado" },
        { id: "c", name: "C", type: "select", options: [{ id: "x", label: "X" }, { id: "x" }, 4] },
      ],
    });
    expect(columns.map((c) => [c.id, c.type])).toEqual([
      ["a", "number"],
      ["b", "text"],
      ["c", "select"],
    ]);
    expect(columns[2].options).toEqual([{ id: "x", label: "X" }]);
    expect(readColumns({})).toEqual([]);
    expect(readColumns({ columns: "no" })).toEqual([]);
  });

  it("readValues y readView ignoran lo que no es válido", () => {
    expect(readValues({ values: { a: "x", b: 2, c: true, d: null, e: {}, f: Infinity } })).toEqual({
      a: "x",
      b: 2,
      c: true,
    });
    expect(readValues({ values: 3 })).toEqual({});
    expect(readView({ view: { sort: { columnId: "a", dir: "up" }, filter: { columnId: "s", value: "o" } } })).toEqual({
      filter: { columnId: "s", value: "o" },
    });
  });
});

describe("fusión", () => {
  it("mergeProperties no pisa claves ajenas y undefined borra", () => {
    const base = { categoria: "ideas", values: { a: 1 } };
    const merged = mergeProperties(base, { columns: [], values: undefined });
    expect(merged).toEqual({ categoria: "ideas", columns: [] });
    expect(base).toEqual({ categoria: "ideas", values: { a: 1 } });
  });

  it("withRowValue conserva categoria y otros valores; vacío quita la clave", () => {
    let props: Record<string, unknown> = { categoria: "libros" };
    props = withRowValue(props, "au", "Cervantes");
    props = withRowValue(props, "ra", 5);
    expect(props).toEqual({ categoria: "libros", values: { au: "Cervantes", ra: 5 } });
    props = withRowValue(props, "au", "");
    expect(props).toEqual({ categoria: "libros", values: { ra: 5 } });
    props = withRowValue(props, "ra", null);
    expect(props).toEqual({ categoria: "libros" });
  });

  it("withView guarda y limpia la preferencia de vista", () => {
    const props = withView({ columns: [] }, { sort: { columnId: "au", dir: "asc" } });
    expect(readView(props).sort).toEqual({ columnId: "au", dir: "asc" });
    expect(withView(props, {})).toEqual({ columns: [] });
  });
});

describe("plantillas", () => {
  it("la plantilla de libros tiene las cuatro columnas con ids propios", () => {
    const books = COLLECTION_TEMPLATES.find((t) => t.id === "books")!;
    const cols = columnsFromTemplate(books);
    expect(cols.map((c) => [c.name, c.type])).toEqual([
      ["Autor", "text"],
      ["Estado", "select"],
      ["Valoración", "number"],
      ["Fuente", "url"],
    ]);
    expect(cols[1].options!.map((o) => o.label)).toEqual(["Por leer", "Leyendo", "Leído"]);
    const again = columnsFromTemplate(books);
    expect(again[0].id).not.toBe(cols[0].id);
  });
});

describe("cambio de tipo", () => {
  const none = new Map<string, string>();

  it("texto → número conserva lo numérico y pierde el resto", () => {
    expect(convertValue(author, "12,5", "number", none)).toBe(12.5);
    expect(convertValue(author, "abc", "number", none)).toBeUndefined();
  });

  it("número → texto, y casilla ↔ número", () => {
    expect(convertValue(rating, 4, "text", none)).toBe("4");
    expect(convertValue({ id: "c", name: "c", type: "checkbox" }, true, "number", none)).toBe(1);
    expect(convertValue(rating, 1, "checkbox", none)).toBe(true);
    expect(convertValue(rating, 3, "checkbox", none)).toBeUndefined();
  });

  it("texto → fecha acepta ISO y dd/mm/aaaa", () => {
    expect(convertValue(author, "2026-03-04", "date", none)).toBe("2026-03-04");
    expect(convertValue(author, "4/3/2026", "date", none)).toBe("2026-03-04");
    expect(convertValue(author, "ayer", "date", none)).toBeUndefined();
  });

  it("selección → texto usa la etiqueta", () => {
    expect(convertValue(status, "o2", "text", none)).toBe("Leyendo");
  });

  it("texto → selección crea opciones con los valores distintos y cuenta lo perdido", () => {
    const plan = planTypeChange(author, "select", [
      { id: "1", values: { au: "Borges" } },
      { id: "2", values: { au: "borges" } },
      { id: "3", values: { au: "Cortázar" } },
      { id: "4", values: {} },
    ]);
    expect(plan.column.options!.map((o) => o.label)).toEqual(["Borges", "Cortázar"]);
    expect(plan.lost).toBe(0);
    expect(plan.values.get("1")).toBe(plan.values.get("2"));
    expect(plan.values.has("4")).toBe(false);
  });

  it("planTypeChange cuenta los valores que se pierden", () => {
    const plan = planTypeChange(author, "number", [
      { id: "1", values: { au: "10" } },
      { id: "2", values: { au: "Borges" } },
      { id: "3", values: { au: "otro" } },
    ]);
    expect(plan.lost).toBe(2);
    expect(plan.values.get("1")).toBe(10);
    expect(plan.column.type).toBe("number");
  });
});

describe("ordenar", () => {
  const rows = [
    row("a", "Dune", { au: "Herbert", ra: 4, st: "o3" }, 0),
    row("b", "Ficciones", { au: "Borges", ra: 5, st: "o1" }, 1),
    row("c", "Sin datos", {}, 2),
    row("d", "Ábaco", { au: "Álvarez", ra: 10, st: "o2" }, 3),
  ];

  it("sin orden respeta el manual", () => {
    expect(sortRows(rows, columns, undefined).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("por título, sin distinguir tildes, asc y desc", () => {
    expect(sortRows(rows, columns, { columnId: "title", dir: "asc" }).map((r) => r.id)).toEqual([
      "d", "a", "b", "c",
    ]);
    expect(sortRows(rows, columns, { columnId: "title", dir: "desc" }).map((r) => r.id)).toEqual([
      "c", "b", "a", "d",
    ]);
  });

  it("números en orden numérico y vacíos siempre al final", () => {
    expect(sortRows(rows, columns, { columnId: "ra", dir: "asc" }).map((r) => r.id)).toEqual([
      "a", "b", "d", "c",
    ]);
    expect(sortRows(rows, columns, { columnId: "ra", dir: "desc" }).map((r) => r.id)).toEqual([
      "d", "b", "a", "c",
    ]);
  });

  it("selección por el orden de sus opciones", () => {
    expect(sortRows(rows, columns, { columnId: "st", dir: "asc" }).map((r) => r.id)).toEqual([
      "b", "d", "a", "c",
    ]);
  });

  it("una columna inexistente no cambia el orden", () => {
    expect(sortRows(rows, columns, { columnId: "zz", dir: "asc" }).map((r) => r.id)).toEqual([
      "a", "b", "c", "d",
    ]);
  });
});

describe("filtrar y contar", () => {
  const done: Column = { id: "ok", name: "Hecho", type: "checkbox" };
  const cols = [...columns, done];
  const rows = [
    row("a", "Dune", { st: "o3", ok: true }),
    row("b", "Ficciones", { st: "o1" }, 1),
    row("c", "Dune II", {}, 2),
  ];

  it("por título (sin distinguir mayúsculas)", () => {
    expect(filterRows(rows, cols, { query: "DUNE" }).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("por opción, por sin valor y por casilla", () => {
    expect(filterRows(rows, cols, { filter: { columnId: "st", value: "o1" } }).map((r) => r.id)).toEqual(["b"]);
    expect(filterRows(rows, cols, { filter: { columnId: "st", value: "" } }).map((r) => r.id)).toEqual(["c"]);
    expect(filterRows(rows, cols, { filter: { columnId: "ok", value: "true" } }).map((r) => r.id)).toEqual(["a"]);
    expect(filterRows(rows, cols, { filter: { columnId: "ok", value: "false" } }).map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("un filtro de una columna que ya no existe se ignora", () => {
    expect(filterRows(rows, cols, { filter: { columnId: "zz", value: "x" } })).toHaveLength(3);
  });

  it("countByOption cuenta por opción", () => {
    expect(countByOption(rows, status).map((e) => [e.option.label, e.count])).toEqual([
      ["Por leer", 1],
      ["Leyendo", 0],
      ["Leído", 1],
    ]);
  });
});

describe("normalizeUrl", () => {
  it("añade https, rechaza texto con espacios y esquemas raros", () => {
    expect(normalizeUrl("example.com/a")).toBe("https://example.com/a");
    expect(normalizeUrl("http://x.org")).toBe("http://x.org/");
    expect(normalizeUrl("no es url")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});
