import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import MainLayout from "@/layouts/MainLayout";
import TodayView from "@/pages/TodayView";
import HabitsHubView from "@/pages/HabitsHubView";
import SettingsView from "@/features/settings/components/SettingsView";
import StudyView from "@/features/study/components/StudyView";
import RoadmapView from "@/features/roadmap/components/RoadmapView";
import TodoListView from "@/features/todos/components/TodoListView";
import PageView from "@/features/pages/components/PageView";
import { PagesProvider } from "@/features/pages/hooks/usePages";
import Button from "@/components/Button";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { PomodoroProvider } from "@/features/study/PomodoroContext";
import { HabitTimerProvider } from "@/features/timer/HabitTimerContext";
import { useHabits } from "@/features/habits/hooks/useHabits";
import type { Location } from "@/app/navigation";

function CenteredNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-text-muted">{children}</p>
    </div>
  );
}

export default function App() {
  const [location, setLocation] = useState<Location>({ view: "today" });
  const { view } = location;
  const store = useHabits();

  // Solo desarrollo: con ?selftest=1 ejecuta la autoprueba de datos una vez que la app ha cargado
  // (así los datos de ejemplo ya están sembrados). El `import()` queda fuera del bundle de producción.
  useEffect(() => {
    if (import.meta.env.DEV && store.status === "ready") {
      if (new URLSearchParams(window.location.search).get("selftest") === "1") {
        void import("@/dev/selftest/start").then((module) => module.startSelfTest());
      }
    }
  }, [store.status]);

  return (
    <ThemeProvider>
      {/* Los timers viven aquí para seguir corriendo al cambiar de vista. */}
      <PomodoroProvider>
        <HabitTimerProvider onComplete={store.addMinutes}>
          <PagesProvider>
          <MainLayout location={location} onNavigate={setLocation}>
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
            ) : view === "pages" ? (
              <PageView />
            ) : view === "habits" ? (
              <HabitsHubView store={store} />
            ) : (
              <SettingsView store={store} />
            )}
          </MainLayout>
          </PagesProvider>
        </HabitTimerProvider>
      </PomodoroProvider>
    </ThemeProvider>
  );
}
