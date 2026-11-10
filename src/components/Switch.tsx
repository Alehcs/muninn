import { cn } from "@/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

/** Interruptor con etiqueta (checkbox con rol "switch"; Espacio lo cambia). */
export default function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 text-sm text-text-muted",
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
          checked ? "bg-accent" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-accent-foreground transition-[left]",
            checked ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
      {label}
    </label>
  );
}
