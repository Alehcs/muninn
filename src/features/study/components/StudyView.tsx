import { Page } from "@/components/PageHeader";
import PomodoroPanel from "@/features/study/components/PomodoroPanel";
import PomodoroPresetSelector from "@/features/study/components/PomodoroPresetSelector";
import { usePomodoro } from "@/features/study/PomodoroContext";

/** Vista "Enfoque" (pomodoro). El estado vive en `PomodoroProvider`. */
export default function StudyView() {
  const {
    timer,
    selectedId,
    customConfig,
    selectedConfig,
    configLocked,
    selectPreset,
    selectCustom,
    setCustomConfig,
  } = usePomodoro();

  return (
    <Page title="Enfoque" width="6xl">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PomodoroPanel timer={timer} selectedConfig={selectedConfig} />

        <PomodoroPresetSelector
          selectedId={selectedId}
          customConfig={customConfig}
          disabled={configLocked}
          onSelectPreset={selectPreset}
          onSelectCustom={selectCustom}
          onCustomChange={setCustomConfig}
        />
      </div>
    </Page>
  );
}
