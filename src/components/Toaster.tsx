import { dismiss, useToasts, type ToastKind } from "@/lib/notify";
import { cn } from "@/utils/cn";

const ACCENT: Record<ToastKind, string> = {
  error: "border-l-red-400",
  success: "border-l-success",
  info: "border-l-accent",
};

const LABEL: Record<ToastKind, string> = {
  error: "Error",
  success: "Listo",
  info: "Aviso",
};

/** Muestra los avisos de `notify`. Se monta una sola vez en el layout. */
export default function Toaster() {
  const toasts = useToasts();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 border-border bg-surface px-3 py-2 text-sm text-text shadow-lg",
            ACCENT[toast.kind],
          )}
        >
          <p className="flex-1">
            <span className="sr-only">{LABEL[toast.kind]}: </span>
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Cerrar aviso"
            className="rounded px-1 text-text-muted hover:bg-surface-hover hover:text-text"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
