import { useState } from "react";
import Button from "@/components/Button";
import { Page, PageStrip } from "@/components/PageHeader";
import { inputCls } from "@/components/formStyles";
import { confirm } from "@/lib/confirm";
import RoadmapForm from "./RoadmapForm";
import RoadmapSection from "./RoadmapSection";
import RoadmapSectionForm from "./RoadmapSectionForm";
import { useRoadmapChecklist } from "../hooks/useRoadmapChecklist";
import type {
  Roadmap,
  RoadmapInput,
  RoadmapItem,
  RoadmapSection as RoadmapSectionType,
  RoadmapSectionInput,
} from "../types";

type RoadmapFormState =
  | { open: false }
  | { open: true; roadmap?: Roadmap };
type SectionFormState =
  | { open: false }
  | { open: true; section?: RoadmapSectionType };

export default function RoadmapView() {
  const roadmap = useRoadmapChecklist();
  const [roadmapForm, setRoadmapForm] = useState<RoadmapFormState>({
    open: false,
  });
  const [sectionForm, setSectionForm] = useState<SectionFormState>({
    open: false,
  });

  const closeForms = () => {
    setRoadmapForm({ open: false });
    setSectionForm({ open: false });
  };

  const handleRoadmapSubmit = (values: RoadmapInput) => {
    if (!roadmapForm.open) return;

    if (roadmapForm.roadmap) {
      void roadmap.updateRoadmap(roadmapForm.roadmap.id, values);
    } else {
      void roadmap.createRoadmap(values);
    }
    closeForms();
  };

  const handleSectionSubmit = (values: RoadmapSectionInput) => {
    if (!sectionForm.open) return;

    if (sectionForm.section) {
      void roadmap.updateSection(sectionForm.section.id, values);
    } else {
      void roadmap.createSection(values);
    }
    closeForms();
  };

  const handleDeleteRoadmap = async (item: Roadmap) => {
    const ok = await confirm({
      title: "Eliminar lista",
      message: `¿Eliminar la lista "${item.title}"? Esto también eliminará sus secciones e items.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    closeForms();
    void roadmap.deleteRoadmap(item.id);
  };

  const handleDeleteSection = async (section: RoadmapSectionType) => {
    const ok = await confirm({
      title: "Eliminar sección",
      message: `¿Eliminar la sección "${section.name}"? Esto también eliminará sus items.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    closeForms();
    void roadmap.deleteSection(section.id);
  };

  const handleDeleteItem = async (item: RoadmapItem) => {
    const ok = await confirm({
      title: "Eliminar item",
      message: `¿Eliminar el item "${item.title}"?`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    closeForms();
    void roadmap.deleteItem(item.id);
  };

  if (roadmap.status === "loading") {
    return (
      <Page title="Listas" width="5xl">
        <p className="text-sm text-text-muted">Cargando listas…</p>
      </Page>
    );
  }

  if (roadmap.status === "error") {
    return (
      <Page title="Listas" width="5xl">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">No se pudieron cargar las listas</h2>
          <p className="mt-1 text-sm text-text-muted">
            Cierra y vuelve a abrir la app. Tus datos siguen siendo locales.
          </p>
          <Button
            className="mt-4"
            variant="ghost"
            onClick={() => void roadmap.reload()}
          >
            Reintentar
          </Button>
        </div>
      </Page>
    );
  }

  const selected = roadmap.selectedRoadmap;

  return (
    <Page
      title="Listas"
      width="5xl"
      primaryAction={{
        label: "Nueva lista",
        onClick: () => {
          closeForms();
          setRoadmapForm({ open: true });
        },
        hidden: roadmapForm.open,
      }}
      actions={
        selected && (
          <>
            <Button
              variant="quiet"
              onClick={() => {
                closeForms();
                setRoadmapForm({ open: true, roadmap: selected });
              }}
            >
              Editar lista
            </Button>
            <Button
              variant="quiet"
              onClick={() => void handleDeleteRoadmap(selected)}
            >
              Eliminar lista
            </Button>
          </>
        )
      }
    >
      <PageStrip>
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-text-muted">
          Lista
          <select
            className={`${inputCls} w-auto min-w-48`}
            value={roadmap.selectedRoadmapId ?? ""}
            disabled={roadmap.roadmaps.length === 0}
            onChange={(event) => void roadmap.selectRoadmap(event.target.value)}
          >
            {roadmap.roadmaps.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <p className="text-sm text-text-muted">
          <span className="text-lg font-semibold text-text">
            {roadmap.progress.percent}%
          </span>{" "}
          · {roadmap.progress.completed}/{roadmap.progress.total} items
        </p>
        <div
          className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-surface-hover"
          role="progressbar"
          aria-label="Progreso de la lista"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roadmap.progress.percent}
        >
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${roadmap.progress.percent}%` }}
          />
        </div>
        {selected?.description && (
          <p className="w-full whitespace-pre-wrap break-words text-sm text-text-muted">
            {selected.description}
          </p>
        )}
      </PageStrip>

      {roadmapForm.open && (
        <div className="mb-5">
          <RoadmapForm
            initial={roadmapForm.roadmap}
            onSubmit={handleRoadmapSubmit}
            onCancel={() => setRoadmapForm({ open: false })}
          />
        </div>
      )}

      {sectionForm.open && (
        <div className="mb-5">
          <RoadmapSectionForm
            initial={sectionForm.section}
            onSubmit={handleSectionSubmit}
            onCancel={() => setSectionForm({ open: false })}
          />
        </div>
      )}

      {roadmap.selectedRoadmap && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              closeForms();
              setSectionForm({ open: true });
            }}
          >
            Nueva sección
          </Button>
        </div>
      )}

      {roadmap.selectedRoadmap === null && (
        <div className="mb-5 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">No hay listas</h3>
          <p className="mt-1 text-sm text-text-muted">
            Crea una nueva para empezar desde cero.
          </p>
        </div>
      )}

      {roadmap.selectedRoadmap && roadmap.sections.length === 0 && (
        <div className="mb-5 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">Sin secciones todavía</h3>
          <p className="mt-1 text-sm text-text-muted">
            Agrega una sección para organizar los items de esta lista.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {roadmap.sections.map((group) => (
          <RoadmapSection
            key={group.section.id}
            group={group}
            sectionOptions={roadmap.roadmapSections}
            onCreateItem={(values) => void roadmap.createItem(values)}
            onUpdateItem={(id, values) => void roadmap.updateItem(id, values)}
            onDeleteItem={(item) => void handleDeleteItem(item)}
            onToggleItem={(id) => void roadmap.toggleCompleted(id)}
            onUpdateSection={(id, values) => void roadmap.updateSection(id, values)}
            onDeleteSection={(section) => void handleDeleteSection(section)}
          />
        ))}
      </div>
    </Page>
  );
}
