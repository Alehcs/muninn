import { useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import Button from "@/components/Button";
import { labelCls } from "@/components/formStyles";

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

/**
 * Formulario estándar de la app, en una tarjeta:
 * - es un `<form>` real (Enter envía desde campos de una línea);
 * - el primer campo recibe el foco al abrirse;
 * - Escape cancela y Cmd/Ctrl+Enter envía también desde un textarea.
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

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSubmit();
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
