import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { settleConfirm, useActiveConfirm } from "@/lib/confirm";
import type { ConfirmRequest } from "@/lib/confirm";
import Button from "@/components/Button";

const FOCUSABLE = "button:not([disabled]), [href], input, select, textarea";

function Dialog({ request }: { request: ConfirmRequest }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = `confirm-title-${request.id}`;
  const messageId = `confirm-message-${request.id}`;

  // Foco inicial en "Cancelar" y, al cerrar, devolver el foco a donde estaba.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const cancel = () => settleConfirm(request.id, false);
  const accept = () => settleConfirm(request.id, true);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key !== "Tab") return;

    // Foco atrapado dentro del diálogo.
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-lg"
      >
        <h2 id={titleId} className="text-base font-semibold">
          {request.title}
        </h2>
        <p id={messageId} className="mt-2 text-sm text-text-muted">
          {request.message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" onClick={cancel}>
            {request.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            variant={request.destructive ? "danger" : "primary"}
            onClick={accept}
          >
            {request.confirmLabel ?? "Aceptar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Muestra el diálogo de `confirm()`. Se monta una sola vez en el layout. */
export default function ConfirmDialogHost() {
  const request = useActiveConfirm();
  if (request === null) return null;
  // `key` reinicia foco y estado entre peticiones encadenadas.
  return <Dialog key={request.id} request={request} />;
}
