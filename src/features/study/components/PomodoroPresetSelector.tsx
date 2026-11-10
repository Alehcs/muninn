import { inputCls, labelCls } from "@/components/formStyles";
import { cn } from "@/utils/cn";
import type { PomodoroConfig } from "@/features/study/utils/pomodoroPresets";
import { POMODORO_PRESETS } from "@/features/study/utils/pomodoroPresets";

interface PomodoroPresetSelectorProps {
  selectedId: string;
  customConfig: PomodoroConfig;
  disabled?: boolean;
  onSelectPreset: (config: PomodoroConfig, id: string) => void;
  onSelectCustom: () => void;
  onCustomChange: (config: PomodoroConfig) => void;
}


function clampPositive(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
}

export default function PomodoroPresetSelector({
  selectedId,
  customConfig,
  disabled = false,
  onSelectPreset,
  onSelectCustom,
  onCustomChange,
}: PomodoroPresetSelectorProps) {
  const updateCustom = (patch: Partial<PomodoroConfig>) => {
    onSelectCustom();
    onCustomChange({ ...customConfig, ...patch });
  };

  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold">Ritmo de estudio</h2>
        <p className="text-sm text-text-muted">
          Elige un pulso suave para esta sesión.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {POMODORO_PRESETS.map((preset) => {
          const selected = selectedId === preset.id;

          return (
            <button
              key={preset.id}
              className={cn(
                "rounded-xl border bg-surface p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-accent hover:bg-surface-hover",
              )}
              disabled={disabled}
              onClick={() => onSelectPreset(preset, preset.id)}
            >
              <span className="text-sm font-semibold">{preset.label}</span>
              <span className="mt-1 block text-xs text-text-muted">
                {preset.focusMinutes} min estudio · {preset.breakMinutes} min descanso
              </span>
              <span className="mt-2 block text-xs text-text-muted">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-4 rounded-xl border bg-surface p-4",
          selectedId === "custom"
            ? "border-accent ring-2 ring-accent/30"
            : "border-border",
          disabled && "opacity-60",
        )}
      >
        <button
          className="text-left text-sm font-semibold"
          disabled={disabled}
          onClick={onSelectCustom}
        >
          Modo personalizado
        </button>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label>
            <span className={labelCls}>Estudio</span>
            <input
              className={`${inputCls} text-text disabled:opacity-60`}
              type="number"
              min="1"
              max="180"
              value={customConfig.focusMinutes}
              disabled={disabled}
              onFocus={onSelectCustom}
              onChange={(event) =>
                updateCustom({
                  focusMinutes: clampPositive(
                    event.target.value,
                    customConfig.focusMinutes,
                  ),
                })
              }
            />
          </label>

          <label>
            <span className={labelCls}>Descanso</span>
            <input
              className={`${inputCls} text-text disabled:opacity-60`}
              type="number"
              min="1"
              max="60"
              value={customConfig.breakMinutes}
              disabled={disabled}
              onFocus={onSelectCustom}
              onChange={(event) =>
                updateCustom({
                  breakMinutes: clampPositive(
                    event.target.value,
                    customConfig.breakMinutes,
                  ),
                })
              }
            />
          </label>

          <label>
            <span className={labelCls}>Ciclos</span>
            <input
              className={`${inputCls} text-text disabled:opacity-60`}
              type="number"
              min="1"
              max="12"
              value={customConfig.cycles}
              disabled={disabled}
              onFocus={onSelectCustom}
              onChange={(event) =>
                updateCustom({
                  cycles: clampPositive(event.target.value, customConfig.cycles),
                })
              }
            />
          </label>
        </div>
      </div>
    </section>
  );
}
