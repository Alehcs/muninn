/**
 * Vistas navegables de la app (una por entrada de la barra lateral).
 * Calendario, Historial y Estadísticas ya no son vistas: son pestañas dentro
 * de "habits". Los nombres internos se conservan aunque el texto visible
 * cambie ("roadmap" se muestra como "Listas", "study" como "Enfoque").
 * "pages" (antes "notes") es el índice de páginas y, con `pageId`, una página.
 */
export type View =
  | "today"
  | "pages"
  | "todos"
  | "roadmap"
  | "habits"
  | "study"
  | "settings";

export interface NavItem {
  view: View;
  label: string;
}

export interface NavGroup {
  /** Etiqueta del grupo; null = entradas sueltas sin etiqueta. */
  label: string | null;
  items: NavItem[];
}

/** Estructura de la barra lateral (sin Configuración, que va aparte, abajo). */
export const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ view: "today", label: "Hoy" }] },
  {
    label: "Espacio",
    items: [
      { view: "pages", label: "Páginas" },
      { view: "todos", label: "Tareas" },
      { view: "roadmap", label: "Listas" },
    ],
  },
  { label: "Hábitos", items: [{ view: "habits", label: "Hábitos" }] },
  { label: "Enfoque", items: [{ view: "study", label: "Enfoque" }] },
];

export const SETTINGS_ITEM: NavItem = {
  view: "settings",
  label: "Configuración",
};

/** Vistas en el orden de la barra lateral: Cmd/Ctrl+1…6 llevan a cada una. */
export const SHORTCUT_VIEWS: View[] = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => item.view),
);

/** Título visible de cada vista. */
export const VIEW_LABELS: Record<View, string> = {
  today: "Hoy",
  pages: "Páginas",
  todos: "Tareas",
  roadmap: "Listas",
  habits: "Hábitos",
  study: "Enfoque",
  settings: "Configuración",
};

/**
 * Dónde está la app: una vista y, en "pages", opcionalmente una página
 * concreta. Sin `pageId`, "pages" es el índice (buscador y papelera).
 * Cualquier función que necesite abrir una página (la búsqueda global, un
 * enlace interno…) navega con `{ view: "pages", pageId }`.
 */
export interface Location {
  view: View;
  pageId?: string;
}

/** Lo que acepta `navigate`: una vista suelta o una ubicación completa. */
export type NavigateTarget = View | Location;

export function toLocation(target: NavigateTarget): Location {
  return typeof target === "string" ? { view: target } : target;
}

export function sameLocation(a: Location, b: Location): boolean {
  return a.view === b.view && (a.pageId ?? null) === (b.pageId ?? null);
}
