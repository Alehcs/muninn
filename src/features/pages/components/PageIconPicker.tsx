import { useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "@/utils/cn";

const PRESETS = [
  "📄", "📝", "📚", "💡", "🎯", "✅", "📌", "⭐",
  "🔖", "🧠", "💻", "🛠️", "📈", "🗂️", "🔗", "🧪",
  "🎨", "🎵", "🌱", "🏃", "🍎", "✈️", "🏠", "❤️",
];

interface PageIconPickerProps {
  icon?: string;
  onChange: (icon: string | null) => void;
}

/** Icono opcional de la página: botón + selector con emojis y campo libre. */
export default function PageIconPicker({ icon, onChange }: PageIconPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (value: string | null) => {
    onChange(value);
    setOpen(false);
    setCustom("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={icon ? "Cambiar icono de la página" : "Añadir icono"}
        title={icon ? "Cambiar icono" : "Añadir icono"}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition-colors hover:bg-surface-hover",
          icon
            ? "h-14 w-14 text-4xl"
            : "h-7 gap-1.5 px-2 text-xs text-text-muted opacity-0 hover:text-text focus-visible:opacity-100 group-hover/title:opacity-100",
        )}
      >
        {icon ? (
          <span aria-hidden="true">{icon}</span>
        ) : (
          <>
            <SmilePlus size={14} strokeWidth={1.75} aria-hidden="true" />
            Añadir icono
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir icono"
          className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          <div className="grid grid-cols-8 gap-1">
            {PRESETS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => choose(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-surface-hover"
              >
                {emoji}
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = custom.trim();
              if (value) choose(value);
            }}
          >
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              maxLength={8}
              placeholder="Pega o escribe un emoji"
              aria-label="Emoji propio"
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm focus:border-accent"
            />
            {icon && (
              <button
                type="button"
                onClick={() => choose(null)}
                className="shrink-0 rounded-md px-2 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
              >
                Quitar
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
