import { useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import Button from "@/components/Button";
import { labelCls } from "@/components/formStyles";
import { setFormDirty } from "@/lib/unsavedChanges";

interface FormCardProps {
  title: string;
  submitLabel: string;
  /** Si es false, el botón de enviar queda desactivado y Enter no envía. */
  valid?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  /** Nota pequeña bajo los botones. */
  note?: ReactNode;
  children: ReactNode;
}

const FIRST_FIELD =
  "input:not([type=hidden]):not([type=checkbox]):not([disabled]), textarea:not([disabled]), select:not([disabled])";

/** Huella del contenido de los campos, para saber si difiere del inicial. */
function snapshotForm(form: HTMLFormElement): string {
  const values: string[] = [];
  for (const element of Array.from(form.elements)) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      if (element instanceof HTMLInputElement) {
        if (["button", "submit", "reset", "hidden"].includes(element.type)) {
          continue;
        }
        values.push(
          element.type === "checkbox" || element.type === "radio"
            ? String(element.checked)
            : element.value,
        );
      } else {
        values.push(element.value);
      }
    }
  }
  return JSON.stringify(values);
}

/**
 * Formulario estándar de la app, en una tarjeta:
 * - es un `<form>` real (Enter envía desde campos de una línea);
 * - el primer campo recibe el foco al abrirse;
 * - Escape cancela y Cmd/Ctrl+Enter envía también desde un textarea;
 * - mientras su contenido difiere del inicial se registra como "cambios sin
 *   guardar" (`@/lib/unsavedChanges`) para avisar antes de navegar fuera.
 */
export default function FormCard({
  title,
  submitLabel,
  valid = true,
  onSubmit,
  onCancel,
  note,
  children,
}: FormCardProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyId = useRef(Symbol("form"));
  const initialSnapshot = useRef<string | null>(null);

  useEffect(() => {
    const form = formRef.current;
    const id = dirtyId.current;
    if (form !== null) {
      form.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
      initialSnapshot.current = snapshotForm(form);
    }
    return () => setFormDirty(id, false);
  }, []);

  const trackChanges = () => {
    const form = formRef.current;
    if (form === null || initialSnapshot.current === null) return;
    setFormDirty(dirtyId.current, snapshotForm(form) !== initialSnapshot.current);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setFormDirty(dirtyId.current, false);
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    } else if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      onInput={trackChanges}
      onChange={trackChanges}
      noValidate
      className="rounded-xl border border-border bg-surface p-5"
    >
      <h3 className="font-medium">{title}</h3>

      <div className="mt-4 flex flex-col gap-3">{children}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" disabled={!valid}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {note && <p className="mt-3 text-xs text-text-muted">{note}</p>}
    </form>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** Etiqueta + control, asociados (clic en la etiqueta enfoca el campo). */
export function Field({ label, children, className }: FieldProps) {
  return (
    <label className={className}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
