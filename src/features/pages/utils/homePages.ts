import type { Page } from "../types";
import { comparePages, getCollectionOf } from "./pageTree";

/** Páginas que muestra el panel "Hoy". */
export const MAX_HOME_PAGES = 5;

/**
 * Las páginas que se enseñan en "Hoy": primero las fijadas y, si sobra
 * sitio, las editadas más recientemente. Solo páginas activas, y nunca las
 * filas de una colección (pueden ser cientos y no son páginas sueltas): sí
 * entran las colecciones y las páginas normales.
 */
export function pickHomePages(pages: readonly Page[], max = MAX_HOME_PAGES): Page[] {
  const active = pages.filter((page) => page.deletedAt === null);
  const eligible = active.filter((page) => getCollectionOf(active, page) === undefined);
  const pinned = eligible.filter((page) => page.pinned).sort(comparePages).slice(0, max);
  const recent = eligible
    .filter((page) => !page.pinned)
    .sort((a, b) =>
      a.updatedAt === b.updatedAt ? 0 : a.updatedAt < b.updatedAt ? 1 : -1,
    )
    .slice(0, Math.max(0, max - pinned.length));
  return [...pinned, ...recent];
}
