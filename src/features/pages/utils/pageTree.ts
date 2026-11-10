import type { Page } from "../types";

export interface PageNode {
  page: Page;
  children: PageNode[];
}

/** Fijadas primero; después el orden manual y la antigüedad. */
export function comparePages(a: Page, b: Page): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

/**
 * Árbol de las páginas activas. Una página cuya madre no está entre las
 * activas (borrada o inexistente) cuelga de la raíz.
 */
export function buildTree(pages: readonly Page[]): PageNode[] {
  const active = pages.filter((page) => page.deletedAt === null);
  const nodes = new Map<string, PageNode>(
    active.map((page) => [page.id, { page, children: [] }]),
  );
  const roots: PageNode[] = [];

  for (const page of active) {
    const node = nodes.get(page.id)!;
    const parent = page.parentId === null ? undefined : nodes.get(page.parentId);
    (parent ? parent.children : roots).push(node);
  }

  const sort = (list: PageNode[]) => {
    list.sort((a, b) => comparePages(a.page, b.page));
    list.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

/** Ancestros de una página, de la raíz hasta su madre (sin incluirla). */
export function getAncestors(pages: readonly Page[], id: string): Page[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const chain: Page[] = [];
  const seen = new Set<string>([id]);
  let current = byId.get(id);

  while (current?.parentId != null && !seen.has(current.parentId)) {
    const parent = byId.get(current.parentId);
    if (!parent || parent.deletedAt !== null) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Ids de la página y de todos sus descendientes. */
export function getSubtreeIds(pages: readonly Page[], id: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const page of pages) {
    if (page.parentId === null) continue;
    const list = childrenOf.get(page.parentId) ?? [];
    list.push(page.id);
    childrenOf.set(page.parentId, list);
  }
  const ids = new Set<string>([id]);
  const queue = [id];
  while (queue.length > 0) {
    for (const child of childrenOf.get(queue.pop()!) ?? []) {
      if (!ids.has(child)) {
        ids.add(child);
        queue.push(child);
      }
    }
  }
  return ids;
}

/** Destinos válidos para "Mover a…": activas, sin la página ni sus descendientes. */
export interface MoveTarget {
  id: string | null;
  label: string;
  depth: number;
}

export function getMoveTargets(
  tree: PageNode[],
  pages: readonly Page[],
  pageId: string,
  titleOf: (page: Page) => string,
): MoveTarget[] {
  const excluded = getSubtreeIds(pages, pageId);
  const targets: MoveTarget[] = [{ id: null, label: "Raíz (sin página madre)", depth: 0 }];
  const walk = (nodes: PageNode[], depth: number) => {
    for (const node of nodes) {
      if (excluded.has(node.page.id)) continue;
      targets.push({ id: node.page.id, label: titleOf(node.page), depth });
      walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);
  return targets;
}

/**
 * Páginas en la papelera que se muestran como entradas: las que se fueron
 * solas o las raíces de un grupo borrado junto (su madre no se fue con ellas).
 */
export function getTrashRoots(pages: readonly Page[]): Page[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  return pages
    .filter((page) => {
      if (page.deletedAt === null) return false;
      const parent = page.parentId === null ? undefined : byId.get(page.parentId);
      return !(parent && parent.deletedAt === page.deletedAt);
    })
    .sort((a, b) => (a.deletedAt! < b.deletedAt! ? 1 : -1));
}

/** Páginas que se van con `root` a la papelera/restauración (misma marca). */
export function countWithDescendants(pages: readonly Page[], root: Page): number {
  const ids = getSubtreeIds(pages, root.id);
  return pages.filter(
    (page) => ids.has(page.id) && page.deletedAt === root.deletedAt,
  ).length;
}

/** Texto plano buscable de una página (título + contenido). */
export function matchesQuery(page: Page, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return true;
  return (
    page.title.toLocaleLowerCase().includes(needle) ||
    page.content.toLocaleLowerCase().includes(needle)
  );
}
