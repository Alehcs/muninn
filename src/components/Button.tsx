import type { ComponentPropsWithRef } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "ghost" | "quiet" | "danger";

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  ghost:
    "border border-border text-text-muted hover:bg-surface-hover hover:text-text",
  /** Sin borde: para acciones secundarias en filas y barras. */
  quiet: "text-text-muted hover:bg-surface-hover hover:text-text",
  /** Acción destructiva (eliminar). */
  danger: "bg-danger text-danger-foreground hover:opacity-90",
};

export default function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        className,
      )}
    />
  );
}
