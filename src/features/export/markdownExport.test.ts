import { describe, expect, it } from "vitest";
import type { Habit } from "@/features/habits/types";
import type { Page } from "@/features/pages/types";
import type { Column } from "@/features/pages/utils/collection";
import type { RoadmapItem, RoadmapSection } from "@/features/roadmap/types";
import type { TodoItem } from "@/features/todos/types";
import {
  buildMarkdownExport,
  collectionIndexToMarkdown,
  concatenateExport,
  habitsToMarkdown,
  listToMarkdown,
  sanitizeFileName,
  singlePageToMarkdown,
  tasksToMarkdown,
  uniqueName,
  type ExportData,
} from "./markdownExport";

function page(id: string, extra: Partial<Page> = {}): Page {
  return {
    id,
    parentId: null,
    title: id,
    content: "",
    contentFormat: "markdown",
    kind: "page",
    properties: {},
    pinned: false,
    sortOrder: 0,
    deletedAt: null,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
    ...extra,
  };
}

function todo(id: string, extra: Partial<TodoItem> = {}): TodoItem {
  return {
    id,
    title: id,
    completed: false,
    orderIndex: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    priority: 0,
    ...extra,
  };
}

const EMPTY: ExportData = { pages: [], todos: [], lists: [], habits: [] };
const paths = (data: Partial<ExportData>) =>
  buildMarkdownExport({ ...EMPTY, ...data }).map((file) => file.path);
const fileOf = (data: Partial<ExportData>, path: string) =>
  buildMarkdownExport({ ...EMPTY, ...data }).find((file) => file.path === path)?.content;

describe("sanitizeFileName", () => {
  it("quita los caracteres prohibidos y los puntos iniciales", () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe("a b c d e f g h i j");
    expect(sanitizeFileName("...oculto")).toBe("oculto");
    expect(sanitizeFileName("final.  ")).toBe("final");
    expect(sanitizeFileName("../../etc/passwd")).toBe("etc passwd");
  });

  it("acota la longitud sin partir un emoji y usa un nombre por defecto", () => {
    const long = sanitizeFileName("🎉".repeat(200));
    expect(Array.from(long)).toHaveLength(80);
    expect(sanitizeFileName("///")).toBe("Sin título");
    expect(sanitizeFileName("", "Lista")).toBe("Lista");
  });

  it("conserva tildes y evita nombres reservados de Windows", () => {
    expect(sanitizeFileName("Canción nº 1")).toBe("Canción nº 1");
    expect(sanitizeFileName("CON")).toBe("CON_");
  });
});

describe("uniqueName", () => {
  it("añade un sufijo numérico sin distinguir mayúsculas", () => {
    const used = new Set<string>();
    expect(uniqueName("Notas", used)).toBe("Notas");
    expect(uniqueName("notas", used)).toBe("notas 2");
    expect(uniqueName("Notas", used)).toBe("Notas 3");
  });
});

describe("páginas", () => {
  it("un .md por página con cabecera YAML (título, creado, editado, categoría)", () => {
    const data = {
      pages: [
        page("Diario", {
          title: 'Mi "diario"',
          content: "Hola **mundo**\n",
          properties: { categoria: "Personal" },
        }),
      ],
    };
    const md = fileOf(data, 'Páginas/Mi diario.md')!;
    expect(md).toBe(
      [
        "---",
        'titulo: "Mi \\"diario\\""',
        "creado: 2026-01-01T10:00:00.000Z",
        "editado: 2026-01-02T10:00:00.000Z",
        'categoria: "Personal"',
        "---",
        "",
        "Hola **mundo**",
        "",
      ].join("\n"),
    );
  });

  it("sin categoría no hay línea de categoría", () => {
    expect(fileOf({ pages: [page("a")] }, "Páginas/a.md")).not.toContain("categoria");
  });

  it("las subpáginas van en una carpeta con el nombre de la madre", () => {
    const pages = [
      page("Madre"),
      page("Hija", { parentId: "Madre" }),
      page("Nieta", { parentId: "Hija" }),
    ];
    expect(paths({ pages }).filter((p) => p.startsWith("Páginas/")).sort()).toEqual([
      "Páginas/Madre.md",
      "Páginas/Madre/Hija.md",
      "Páginas/Madre/Hija/Nieta.md",
    ]);
  });

  it("la papelera no se exporta, y sus hijas activas suben a la raíz", () => {
    const pages = [
      page("Borrada", { deletedAt: "2026-02-01T00:00:00.000Z" }),
      page("Huérfana", { parentId: "Borrada" }),
    ];
    expect(paths({ pages }).filter((p) => p.startsWith("Páginas/"))).toEqual([
      "Páginas/Huérfana.md",
    ]);
  });

  it("las páginas en texto plano pasan por plainTextToMarkdown", () => {
    const pages = [page("Vieja", { contentFormat: "plain", content: "uno\ndos\n\n2 * 3" })];
    const md = fileOf({ pages }, "Páginas/Vieja.md")!;
    expect(md).toContain("uno\\\ndos");
    expect(md).toContain("2 \\* 3");
  });

  it("nombres repetidos o peligrosos no chocan ni escapan de la carpeta", () => {
    const pages = [
      page("1", { title: "Idea", sortOrder: 0 }),
      page("2", { title: "idea", sortOrder: 1 }),
      page("3", { title: "../../fuera", sortOrder: 2 }),
      page("4", { title: "", sortOrder: 3 }),
    ];
    const result = paths({ pages }).filter((p) => p.startsWith("Páginas/"));
    expect(result).toEqual([
      "Páginas/Idea.md",
      "Páginas/idea 2.md",
      "Páginas/fuera.md",
      "Páginas/Sin título.md",
    ]);
    for (const path of paths({ pages })) {
      expect(path.split("/").every((part) => part !== "" && part !== "..")).toBe(true);
    }
  });
});

describe("colecciones", () => {
  const columns: Column[] = [
    { id: "c1", name: "Autor", type: "text" },
    { id: "c2", name: "Estado", type: "select", options: [{ id: "o1", label: "Leído" }] },
    { id: "c3", name: "Nota | media", type: "number" },
    { id: "c4", name: "Hecho", type: "checkbox" },
  ];
  const collection = page("Libros", {
    kind: "collection",
    content: "Mis lecturas",
    properties: { columns },
  });
  const row1 = page("Dune", {
    parentId: "Libros",
    content: "Muy buena.",
    sortOrder: 0,
    properties: { values: { c1: "Herbert | Frank", c2: "o1", c3: 9, c4: true } },
  });
  const row2 = page("Otro", {
    parentId: "Libros",
    sortOrder: 1,
    properties: { values: { c1: "Ana" } },
  });
  const data = { pages: [collection, row2, row1] };

  it("carpeta con índice y un .md por fila", () => {
    expect(paths(data).filter((p) => p.startsWith("Páginas/"))).toEqual([
      "Páginas/Libros/_Índice.md",
      "Páginas/Libros/Dune.md",
      "Páginas/Libros/Otro.md",
    ]);
  });

  it("el índice lleva la descripción y una tabla con todas las filas y columnas", () => {
    const md = fileOf(data, "Páginas/Libros/_Índice.md")!;
    expect(md).toContain("Mis lecturas");
    expect(md).toContain("| Título | Autor | Estado | Nota \\| media | Hecho |");
    expect(md).toContain("| [Dune](Dune.md) | Herbert \\| Frank | Leído | 9 | Sí |");
    expect(md).toContain("| [Otro](Otro.md) | Ana |  |  |  |");
  });

  it("cada fila lleva sus propiedades en la cabecera YAML y su contenido", () => {
    const md = fileOf(data, "Páginas/Libros/Dune.md")!;
    expect(md).toContain('coleccion: "Libros"');
    expect(md).toContain("propiedades:");
    expect(md).toContain('  "Autor": "Herbert | Frank"');
    expect(md).toContain('  "Estado": "Leído"');
    expect(md).toContain('  "Nota | media": 9');
    expect(md).toContain('  "Hecho": true');
    expect(md.trimEnd().endsWith("Muy buena.")).toBe(true);
    expect(fileOf(data, "Páginas/Libros/Otro.md")).not.toContain('"Estado"');
  });

  it("una colección vacía lo indica", () => {
    expect(collectionIndexToMarkdown(collection, [])).toContain("no tiene elementos");
  });

  it("una fila llamada como el índice no lo pisa", () => {
    const clash = page("x", { title: "_Índice", parentId: "Libros" });
    const result = paths({ pages: [collection, clash] });
    expect(result).toContain("Páginas/Libros/_Índice.md");
    expect(result).toContain("Páginas/Libros/_Índice 2.md");
  });

  it("exportar una sola colección o fila devuelve su Markdown", () => {
    const all = [collection, row1];
    expect(singlePageToMarkdown(collection, all)).toMatchObject({ fileName: "Libros.md" });
    expect(singlePageToMarkdown(collection, all).content).toContain("| Dune |");
    expect(singlePageToMarkdown(row1, all).content).toContain("propiedades:");
    expect(singlePageToMarkdown(page("a/b"), []).fileName).toBe("a b.md");
  });
});

describe("tareas", () => {
  it("pendientes y completadas con fecha, prioridad, notas y página enlazada", () => {
    const pages = [page("Proyecto", { title: "Mi proyecto (1)" })];
    const todos = [
      todo("Comprar pan", {
        dueDate: "2026-11-12",
        priority: 3,
        pageId: "Proyecto",
        notes: "integral\ny sin sal",
      }),
      todo("Hecha", { completed: true, completedAt: "2026-11-09T08:00:00.000Z" }),
    ];
    const md = fileOf({ pages, todos }, "Tareas.md")!;
    expect(md).toContain("## Pendientes");
    expect(md).toContain(
      "- [ ] Comprar pan — vence 2026-11-12 · prioridad alta · página: [Mi proyecto (1)](P%C3%A1ginas/Mi%20proyecto%20%281%29.md)",
    );
    expect(md).toContain("  integral\n  y sin sal");
    expect(md).toContain("## Completadas");
    expect(md).toContain("- [x] Hecha — completada 2026-11-09");
  });

  it("sin tareas lo dice", () => {
    const md = tasksToMarkdown([], [], new Map());
    expect(md).toContain("_No hay tareas pendientes._");
    expect(md).toContain("_No hay tareas completadas._");
  });

  it("una tarea cuya página está en la papelera no enlaza", () => {
    const pages = [page("P", { deletedAt: "2026-02-01T00:00:00.000Z" })];
    const md = fileOf({ pages, todos: [todo("t", { pageId: "P" })] }, "Tareas.md")!;
    expect(md).not.toContain("página:");
  });
});

describe("listas", () => {
  const sections: RoadmapSection[] = [
    { id: "s2", roadmapId: "r", name: "Después", order: 2, createdAt: "", updatedAt: "" },
    { id: "s1", roadmapId: "r", name: "Primero", order: 1, createdAt: "", updatedAt: "" },
  ];
  const item = (id: string, extra: Partial<RoadmapItem>): RoadmapItem => ({
    id,
    roadmapId: "r",
    sectionId: "s1",
    section: "Primero",
    sectionOrder: 1,
    title: id,
    completed: false,
    orderIndex: 1,
    createdAt: "",
    updatedAt: "",
    ...extra,
  });
  const roadmap = { id: "r", title: "Mi: lista/1", description: "Descripción", createdAt: "", updatedAt: "" };

  it("secciones como encabezados e items como casillas con tipo, enlace, descripción y notas", () => {
    const md = listToMarkdown({
      roadmap,
      sections,
      items: [
        item("B", { orderIndex: 2 }),
        item("A", {
          orderIndex: 1,
          type: "Libro",
          url: "https://x.org/a b",
          description: "Desc",
          notes: "Nota",
          completed: true,
        }),
        item("C", { sectionId: "s2", section: "Después" }),
      ],
    });
    expect(md.indexOf("## Primero")).toBeLessThan(md.indexOf("## Después"));
    expect(md).toContain("- [x] **A** _(Libro)_ — [enlace](<https://x.org/a b>)");
    expect(md).toContain("  Desc");
    expect(md).toContain("  **Notas:** Nota");
    expect(md.indexOf("**A**")).toBeLessThan(md.indexOf("**B**"));
    expect(md).toContain("- [ ] **C**");
  });

  it("un archivo por lista en Listas/ con nombre saneado", () => {
    const lists = [{ roadmap, sections, items: [] }, { roadmap: { ...roadmap, id: "r2" }, sections: [], items: [] }];
    expect(paths({ lists }).filter((p) => p.startsWith("Listas/"))).toEqual([
      "Listas/Mi lista 1.md",
      "Listas/Mi lista 1 2.md",
    ]);
  });

  it("los items de una sección desaparecida no se pierden", () => {
    const md = listToMarkdown({
      roadmap,
      sections: [],
      items: [item("Suelto", { sectionId: "ya-no-existe", section: "Antigua" })],
    });
    expect(md).toContain("## Antigua");
    expect(md).toContain("**Suelto**");
  });
});

describe("hábitos", () => {
  it("define cada hábito sin registros diarios", () => {
    const habits: Habit[] = [
      { id: "1", name: "Leer", type: "duration", target: 30, unit: "minutos", category: "estudio", active: true },
      { id: "2", name: "Cama", type: "check", target: 1, unit: "completado", active: false },
    ];
    const md = habitsToMarkdown(habits);
    expect(md).toContain("| Leer | Duración | 30 minutos | estudio | Activo |");
    expect(md).toContain("| Cama | Hecho / no hecho | — | — | Pausado |");
    expect(fileOf({ habits }, "Habitos.md")).toBe(md);
  });
});

describe("buildMarkdownExport", () => {
  it("siempre genera Tareas.md y Habitos.md, y ninguna ruta es peligrosa", () => {
    const result = buildMarkdownExport(EMPTY);
    expect(result.map((f) => f.path)).toEqual(["Tareas.md", "Habitos.md"]);
  });

  it("no repite rutas aunque los títulos coincidan", () => {
    const pages = Array.from({ length: 5 }, (_, i) => page(String(i), { title: "Igual", sortOrder: i }));
    const result = paths({ pages });
    expect(new Set(result.map((p) => p.toLowerCase())).size).toBe(result.length);
  });

  it("concatenarlo para el modo navegador conserva cada archivo con su ruta", () => {
    const text = concatenateExport([
      { path: "A.md", content: "uno\n" },
      { path: "B/C.md", content: "dos\n" },
    ]);
    expect(text).toContain("<!-- ===== A.md ===== -->");
    expect(text).toContain("<!-- ===== B/C.md ===== -->");
    expect(text).toContain("uno");
    expect(text).toContain("dos");
  });
});
