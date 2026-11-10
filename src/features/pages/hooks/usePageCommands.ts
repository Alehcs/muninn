import { useMemo } from "react";
import { useNavigation } from "@/app/NavigationContext";
import { confirm } from "@/lib/confirm";
import { notify } from "@/lib/notify";
import { usePages } from "./usePages";
import { getSubtreeIds } from "../utils/pageTree";
import { pageTitle, type Page } from "../types";

/** Acciones sobre páginas compartidas por la barra lateral, el índice y la cabecera. */
export function usePageCommands() {
  const store = usePages();
  const { location, navigate } = useNavigation();

  return useMemo(() => {
    const open = (id: string) => navigate({ view: "pages", pageId: id });

    const create = async (parentId: string | null) => {
      const id = await store.createPage(parentId);
      if (id !== null) open(id);
    };

    return {
      open,
      createRoot: () => create(null),
      createChild: (parent: Page) => create(parent.id),

      /** Pregunta vacía/plantilla y abre la colección creada. */
      createCollection: (parentId: string | null) =>
        store.requestNewCollection(parentId, open),

      /** Añade un elemento a una colección y lo abre. */
      createRow: async (collection: Page) => {
        const id = await store.createRow(collection.id, "");
        if (id !== null) open(id);
      },

      convertToCollection: async (page: Page) => {
        if (await store.convertToCollection(page.id)) {
          notify.success(`«${pageTitle(page)}» es ahora una colección.`);
        }
      },

      togglePinned: (page: Page) => store.setPinned(page.id, !page.pinned),

      move: (page: Page) => store.requestMove(page.id),

      /** Papelera: recuperable, así que no pide confirmación. */
      trash: async (page: Page) => {
        // Si la página abierta está dentro de lo que se va, se sale al índice.
        const leaving =
          location.pageId !== undefined &&
          getSubtreeIds(store.pages, page.id).has(location.pageId);
        await store.trashPage(page.id);
        if (leaving) navigate({ view: "pages" });
        notify.info(`«${pageTitle(page)}» está en la papelera de Páginas.`);
      },

      restore: async (page: Page) => {
        await store.restorePage(page.id);
        notify.success(`«${pageTitle(page)}» restaurada.`);
      },

      deletePermanently: async (page: Page, includes: number) => {
        const accepted = await confirm({
          title: "Eliminar definitivamente",
          message:
            (includes > 1
              ? `Se eliminará «${pageTitle(page)}» y sus ${includes - 1} subpáginas. `
              : `Se eliminará «${pageTitle(page)}». `) +
            "Esta acción no se puede deshacer.",
          confirmLabel: "Eliminar definitivamente",
          destructive: true,
        });
        if (accepted) await store.deletePermanently(page.id);
      },
    };
  }, [store, location.pageId, navigate]);
}
