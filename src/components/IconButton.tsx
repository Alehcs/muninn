import type { ComponentPropsWithRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface IconButtonProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  icon: LucideIcon;
  /** Nombre accesible; también se usa de tooltip. Obligatorio. */
  label: string;
  /** `danger` solo cambia el color al pasar el cursor. */
  tone?: "default" | "danger";
  size?: number;
}

/** Botón cuadrado solo con icono, para acciones en filas y cabeceras. */
export default function IconButton({
  icon: Icon,
  label,
  tone = "default",
  size = 15,
  type = "button",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-border/60 disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger" ? "hover:text-danger" : "hover:text-text",
        className,
      )}
    >
      <Icon size={size} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
