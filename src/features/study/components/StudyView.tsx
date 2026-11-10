import { useMemo, useState } from "react";
import PomodoroPanel from "@/features/study/components/PomodoroPanel";
import PomodoroPresetSelector from "@/features/study/components/PomodoroPresetSelector";
import { usePomodoroTimer } from "@/features/study/hooks/usePomodoroTimer";
import type { PomodoroConfig } from "@/features/study/utils/pomodoroPresets";
import {
  DEFAULT_CUSTOM_POMODORO,
  POMODORO_PRESETS,
} from "@/features/study/utils/pomodoroPresets";

export default function StudyView() {
  const [selectedId, setSelectedId] = useState(POMODORO_PRESETS[0].id);
  const [customConfig, setCustomConfig] = useState<PomodoroConfig>(
    DEFAULT_CUSTOM_POMODORO,
  );
  const timer = usePomodoroTimer();
  const configLocked = timer.status === "running" || timer.status === "paused";

  const selectedConfig = useMemo<PomodoroConfig>(() => {
    if (selectedId === "custom") return customConfig;
    return (
      POMODORO_PRESETS.find((preset) => preset.id === selectedId) ??
      POMODORO_PRESETS[0]
    );
  }, [customConfig, selectedId]);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute right-10 top-8 h-20 w-20 rounded-full bg-accent/10" />
          <span className="absolute bottom-6 left-12 h-12 w-12 rounded-full bg-success/10" />
          <span className="absolute right-28 bottom-8 h-9 w-3 rotate-45 rounded-full bg-success/20" />
        </div>
        <div className="relative">
          <p className="text-sm font-medium text-text-muted">Estudio</p>
          <h2 className="mt-1 text-2xl font-semibold">
            Un rincón tranquilo para avanzar
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Respira, enfócate y avanza un poco más.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PomodoroPanel timer={timer} selectedConfig={selectedConfig} />

        <PomodoroPresetSelector
          selectedId={selectedId}
          customConfig={customConfig}
          disabled={configLocked}
          onSelectPreset={(config, id) => {
            setSelectedId(id);
            setCustomConfig((current) => ({ ...current, ...config }));
          }}
          onSelectCustom={() => setSelectedId("custom")}
          onCustomChange={setCustomConfig}
        />
      </div>
    </section>
  );
}
