import { useState } from "react";
import type { ReactNode } from "react";
import MainLayout from "@/layouts/MainLayout";
import TodayView from "@/pages/TodayView";
import HabitsHubView from "@/pages/HabitsHubView";
import SettingsView from "@/features/settings/components/SettingsView";
import StudyView from "@/features/study/components/StudyView";
import RoadmapView from "@/features/roadmap/components/RoadmapView";
import TodoListView from "@/features/todos/components/TodoListView";
import NotesView from "@/features/notes/components/NotesView";
import Button from "@/components/Button";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { PomodoroProvider } from "@/features/study/PomodoroContext";
import { HabitTimerProvider } from "@/features/timer/HabitTimerContext";
import { useHabits } from "@/features/habits/hooks/useHabits";
import type { View } from "@/app/navigation";

function CenteredNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-text-muted">{children}</p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("today");
  const store = useHabits();

  return (
    <ThemeProvider>
      {/* Los timers viven aquí para seguir corriendo al cambiar de vista. */}
      <PomodoroProvider>
        <HabitTimerProvider onComplete={store.addMinutes}>
          <MainLayout view={view} onNavigate={setView}>
            {store.status === "loading" ? (
              <CenteredNotice>Cargando tus hábitos…</CenteredNotice>
            ) : store.status === "error" ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                <p className="text-sm text-text-muted">
                  No se pudieron cargar los datos.
                </p>
                <Button onClick={() => void store.reload()}>Reintentar</Button>
              </div>
            ) : view === "today" ? (
              <TodayView store={store} />
            ) : view === "study" ? (
              <StudyView />
            ) : view === "roadmap" ? (
              <RoadmapView />
            ) : view === "todos" ? (
              <TodoListView />
            ) : view === "notes" ? (
              <NotesView />
            ) : view === "habits" ? (
              <HabitsHubView store={store} />
            ) : (
              <SettingsView store={store} />
            )}
          </MainLayout>
        </HabitTimerProvider>
      </PomodoroProvider>
    </ThemeProvider>
  );
}
