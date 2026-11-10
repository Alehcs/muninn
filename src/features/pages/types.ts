/** Formato en que está guardado `content`. */
export type ContentFormat = "markdown" | "plain";

/** Tipo de página: una página normal o una colección (tabla cuyas filas son
    subpáginas). Ver `utils/collection.ts` para el contenido de `properties`. */
export type PageKind = "page" | "collection";

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  icon?: string;
  /** Tal como está en la base: Markdown, o texto plano si `contentFormat` es "plain". */
  content: string;
  contentFormat: ContentFormat;
  kind: PageKind;
  properties: Record<string, unknown>;
  pinned: boolean;
  sortOrder: number;
  /** Marca de tiempo ISO de cuando se envió a la papelera, o null. */
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Título que se muestra cuando la página no tiene. */
export const UNTITLED = "Sin título";

export function pageTitle(page: Pick<Page, "title">): string {
  return page.title.trim() === "" ? UNTITLED : page.title;
}

/** Categoría heredada de las notas (vive en `properties.categoria`). */
export function pageCategory(page: Pick<Page, "properties">): string {
  const value = page.properties.categoria;
  return typeof value === "string" ? value.trim() : "";
}
