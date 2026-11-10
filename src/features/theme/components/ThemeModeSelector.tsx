import { cn } from "@/utils/cn";
import type { ThemePreference } from "../types";

interface ThemeModeSelectorProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "morning", label: "Mañana" },
  { value: "afternoon", label: "Tarde" },
  { value: "night", label: "Noche" },
];

export default function ThemeModeSelector({
  value,
  onChange,
}: ThemeModeSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-accent text-accent-foreground"
              : "text-text-muted hover:bg-surface-hover hover:text-text",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
