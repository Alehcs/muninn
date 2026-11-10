import { cn } from "@/utils/cn";

interface ThinProgressProps {
  percent: number;
  /** `success` para algo completado; `accent` para algo en curso. */
  tone?: "accent" | "success";
  className?: string;
  label?: string;
}

/** Barra de progreso fina (4 px). */
export default function ThinProgress({
  percent,
  tone = "accent",
  className,
  label,
}: ThinProgressProps) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? value : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("h-1 overflow-hidden rounded-full bg-border/60", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          tone === "success" ? "bg-success" : "bg-accent",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
