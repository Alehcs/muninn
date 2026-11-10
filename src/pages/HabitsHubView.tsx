import { useState } from "react";
import Tabs, { TabPanel } from "@/components/Tabs";
import type { TabItem } from "@/components/Tabs";
import { Page } from "@/components/PageHeader";
import CalendarView from "@/pages/CalendarView";
import HabitsView from "@/pages/HabitsView";
import type { HabitFormState } from "@/pages/HabitsView";
import HistoryView from "@/pages/HistoryView";
import StatsView from "@/pages/StatsView";
import type { HabitsStore } from "@/features/habits/hooks/useHabits";

type HabitsTab = "manage" | "calendar" | "history" | "stats";

const TABS: TabItem<HabitsTab>[] = [
  { id: "manage", label: "Gestión" },
  { id: "calendar", label: "Calendario" },
  { id: "history", label: "Historial" },
  { id: "stats", label: "Estadísticas" },
];

const PAGE_WIDTHS = {
  manage: "2xl",
  calendar: "6xl",
  history: "2xl",
  stats: "4xl",
} as const;

const ID_PREFIX = "habits";

interface HabitsHubViewProps {
  store: HabitsStore;
}

/** Vista "Hábitos": una cabecera con pestañas Gestión / Calendario / Historial / Estadísticas. */
export default function HabitsHubView({ store }: HabitsHubViewProps) {
  const [tab, setTab] = useState<HabitsTab>("manage");
  const [form, setForm] = useState<HabitFormState>({ open: false });

  return (
    <Page
      title="Hábitos"
      width={PAGE_WIDTHS[tab]}
      primaryAction={{
        label: "Nuevo hábito",
        // Desde cualquier pestaña lleva a Gestión con el formulario abierto.
        onClick: () => {
          setTab("manage");
          setForm({ open: true });
        },
        hidden: tab === "manage" && form.open,
      }}
      toolbar={
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={setTab}
          label="Secciones de hábitos"
          idPrefix={ID_PREFIX}
        />
      }
    >
      <TabPanel idPrefix={ID_PREFIX} id={tab}>
        {tab === "manage" ? (
          <HabitsView store={store} form={form} onFormChange={setForm} />
        ) : tab === "calendar" ? (
          <CalendarView store={store} />
        ) : tab === "history" ? (
          <HistoryView store={store} />
        ) : (
          <StatsView store={store} />
        )}
      </TabPanel>
    </Page>
  );
}
