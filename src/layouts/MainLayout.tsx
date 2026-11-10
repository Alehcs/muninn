import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Toaster from "@/components/Toaster";
import ConfirmDialogHost from "@/components/ConfirmDialog";
import { hasOpenConfirm } from "@/lib/confirm";
import { confirmDiscardChanges } from "@/lib/unsavedChanges";
import { resolveShortcut, runPrimaryAction } from "@/lib/shortcuts";
import type { View } from "@/app/navigation";

/** Id del contenedor con scroll (lo usa `scrollMainToTop`). */
export const MAIN_ID = "main-content";

interface MainLayoutProps {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

/**
 * Esqueleto de la app: barra lateral + contenido. Cada vista pinta su propia
 * cabecera (`PageHeader`). Aquí viven también los atajos globales.
 */
export default function MainLayout({
  view,
  onNavigate,
  children,
}: MainLayoutProps) {
  const mainRef = useRef<HTMLElement>(null);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const viewRef = useRef(view);
  viewRef.current = view;

  /** Navega, pidiendo confirmación si hay un formulario con cambios sin guardar. */
  const requestNavigate = useCallback(async (target: View) => {
    if (target === viewRef.current) return;
    if (!(await confirmDiscardChanges())) return;
    onNavigateRef.current(target);
  }, []);

  // Al cambiar de vista, el contenido vuelve arriba.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      // Con un diálogo abierto, los atajos globales no actúan.
      if (hasOpenConfirm()) return;

      const action = resolveShortcut(event);
      if (action === null) return;

      // Todos llevan Cmd/Ctrl, así que funcionan también al escribir en un campo.
      event.preventDefault();
      if (action.type === "navigate") void requestNavigate(action.view);
      else runPrimaryAction();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestNavigate]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      <Sidebar view={view} onNavigate={requestNavigate} />
      <main ref={mainRef} id={MAIN_ID} className="min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
      <Toaster />
      <ConfirmDialogHost />
    </div>
  );
}
