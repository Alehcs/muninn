import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { notify } from "@/lib/notify";
import * as pageRepo from "../storage/pageRepository";
import type { Page } from "../types";
import MovePageDialog from "../components/MovePageDialog";
import { buildTree, getTrashRoots, type PageNode } from "../utils/pageTree";

export type PagesStatus = "loading" | "ready" | "error";

export interface PagesStore {
  status: PagesStatus;
  /** Todas las filas (activas y en la papelera). */
  pages: Page[];
  /** Páginas activas, como árbol (fijadas primero). */
  tree: PageNode[];
  /** Entradas de la papelera (raíces de cada grupo borrado junto). */
  trash: Page[];
  getPage: (id: string) => Page | undefined;
  reload: () => Promise<void>;
  /** Crea una página (vacía, sin título) y devuelve su id, o null si falla. */
  createPage: (parentId?: string | null) => Promise<string | null>;
  /** Guarda el cuerpo. Lanza si falla, para que el editor conserve el texto. */
  saveContent: (id: string, markdown: string) => Promise<void>;
  saveTitle: (id: string, title: string) => Promise<void>;
  saveIcon: (id: string, icon: string | null) => Promise<void>;
  saveCategory: (id: string, category: string) => Promise<void>;
  setPinned: (id: string, pinned: boolean) => Promise<void>;
  movePage: (id: string, parentId: string | null) => Promise<void>;
  /** Abre el selector "Mover a…" para una página. */
  requestMove: (id: string) => void;
  trashPage: (id: string) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
}

const PagesContext = createContext<PagesStore | null>(null);

export function usePages(): PagesStore {
  const store = useContext(PagesContext);
  if (store === null) throw new Error("usePages debe usarse dentro de <PagesProvider>.");
  return store;
}

/**
 * Estado compartido de las páginas (barra lateral, índice y vista de página).
 * Los cambios se escriben primero en la base y luego se reflejan en memoria;
 * si una escritura falla se avisa y se recarga lo que hay realmente.
 */
export function PagesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PagesStatus>("loading");
  const [pages, setPages] = useState<Page[]>([]);
  const [moving, setMoving] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      setPages(await pageRepo.listPages());
      loadedRef.current = true;
      setStatus("ready");
    } catch (error) {
      console.error("Pages load failed", error);
      if (loadedRef.current) notify.error("No se pudieron recargar las páginas.");
      else setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patch = useCallback((id: string, changes: Partial<Page>) => {
    setPages((current) =>
      current.map((page) => (page.id === id ? { ...page, ...changes } : page)),
    );
  }, []);

  /** Ejecuta una escritura; si falla, avisa y recarga el estado real. */
  const attempt = useCallback(
    async (message: string, write: () => Promise<void>): Promise<void> => {
      try {
        await write();
      } catch (error) {
        console.error(message, error);
        notify.error(message);
        await reload();
      }
    },
    [reload],
  );

  /** Acciones con identidad estable: no cambian al guardar o editar. */
  const actions = useMemo<Omit<PagesStore, "status" | "pages" | "tree" | "trash" | "getPage">>(() => {
    return {
      reload,
      requestMove: setMoving,

      createPage: async (parentId = null) => {
        try {
          const page = await pageRepo.createPage({ parentId });
          setPages((current) => [...current, page]);
          // El orden entre hermanas lo decide la base (sort_order): se recarga.
          void reload();
          return page.id;
        } catch (error) {
          console.error("Page create failed", error);
          notify.error("No se pudo crear la página.");
          return null;
        }
      },

      saveContent: async (id, markdown) => {
        const saved = await pageRepo.savePageContent(id, markdown);
        patch(id, {
          content: markdown,
          contentFormat: saved.contentFormat,
          updatedAt: saved.updatedAt,
        });
      },

      saveTitle: (id, title) =>
        attempt("No se pudo guardar el título.", async () => {
          const updatedAt = await pageRepo.savePageTitle(id, title);
          patch(id, { title, updatedAt });
        }),

      saveIcon: (id, icon) =>
        attempt("No se pudo guardar el icono.", async () => {
          await pageRepo.savePageIcon(id, icon);
          patch(id, { icon: icon ?? undefined, updatedAt: new Date().toISOString() });
        }),

      saveCategory: (id, category) =>
        attempt("No se pudo guardar la categoría.", async () => {
          const properties = await pageRepo.savePageCategory(id, category);
          patch(id, { properties, updatedAt: new Date().toISOString() });
        }),

      setPinned: (id, pinned) =>
        attempt("No se pudo fijar la página.", async () => {
          await pageRepo.setPagePinned(id, pinned);
          patch(id, { pinned });
        }),

      movePage: (id, parentId) =>
        attempt("No se pudo mover la página.", async () => {
          await pageRepo.movePage(id, parentId);
          await reload();
        }),

      trashPage: (id) =>
        attempt("No se pudo enviar la página a la papelera.", async () => {
          await pageRepo.trashPage(id);
          await reload();
        }),

      restorePage: (id) =>
        attempt("No se pudo restaurar la página.", async () => {
          await pageRepo.restorePage(id);
          await reload();
        }),

      deletePermanently: (id) =>
        attempt("No se pudo eliminar la página.", async () => {
          await pageRepo.deletePagePermanently(id);
          await reload();
        }),
    };
  }, [reload, patch, attempt]);

  const store = useMemo<PagesStore>(
    () => ({
      ...actions,
      status,
      pages,
      tree: buildTree(pages),
      trash: getTrashRoots(pages),
      getPage: (id) => pages.find((page) => page.id === id),
    }),
    [actions, status, pages],
  );

  const movingPage = moving === null ? undefined : store.getPage(moving);

  return (
    <PagesContext.Provider value={store}>
      {children}
      {movingPage && (
        <MovePageDialog
          page={movingPage}
          pages={store.pages}
          tree={store.tree}
          onCancel={() => setMoving(null)}
          onSelect={(parentId) => {
            setMoving(null);
            void store.movePage(movingPage.id, parentId);
          }}
        />
      )}
    </PagesContext.Provider>
  );
}
