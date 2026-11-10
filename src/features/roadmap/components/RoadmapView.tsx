import { useState } from "react";
import Button from "@/components/Button";
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

  const handleDeleteRoadmap = (item: Roadmap) => {
    const ok = window.confirm(
      `Eliminar el roadmap "${item.title}"? Esto también eliminará sus secciones e items.`,
    );
    if (!ok) return;

    closeForms();
    void roadmap.deleteRoadmap(item.id);
  };

  const handleDeleteSection = (section: RoadmapSectionType) => {
    const ok = window.confirm(
      `Eliminar la sección "${section.name}"? Esto también eliminará sus items.`,
    );
    if (!ok) return;

    closeForms();
    void roadmap.deleteSection(section.id);
  };

  const handleDeleteItem = (item: RoadmapItem) => {
    const ok = window.confirm(`Eliminar el item "${item.title}"?`);
    if (!ok) return;

    closeForms();
    void roadmap.deleteItem(item.id);
  };

  if (roadmap.status === "loading") {
    return (
      <section className="mx-auto max-w-5xl">
        <p className="text-sm text-text-muted">Cargando roadmap…</p>
      </section>
    );
  }

  if (roadmap.status === "error") {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">No se pudo cargar el roadmap</h2>
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
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-muted">Roadmap</p>
            <h2 className="mt-1 break-words text-2xl font-semibold">
              {roadmap.selectedRoadmap?.title ?? "Tus roadmaps"}
            </h2>
            {roadmap.selectedRoadmap?.description && (
              <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-sm text-text-muted">
                {roadmap.selectedRoadmap.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                closeForms();
                setRoadmapForm({ open: true });
              }}
            >
              Nuevo roadmap
            </Button>
            {roadmap.selectedRoadmap && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    closeForms();
                    setRoadmapForm({
                      open: true,
                      roadmap: roadmap.selectedRoadmap ?? undefined,
                    });
                  }}
                >
                  Editar roadmap
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (roadmap.selectedRoadmap) {
                      handleDeleteRoadmap(roadmap.selectedRoadmap);
                    }
                  }}
                >
                  Eliminar roadmap
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Lista
            </label>
            <select
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
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
          </div>

          <div>
            <p className="text-3xl font-semibold">{roadmap.progress.percent}%</p>
            <p className="mt-1 text-sm text-text-muted">
              {roadmap.progress.completed}/{roadmap.progress.total} items
            </p>
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${roadmap.progress.percent}%` }}
          />
        </div>
      </div>

      {roadmapForm.open && (
        <div className="mt-5">
          <RoadmapForm
            initial={roadmapForm.roadmap}
            onSubmit={handleRoadmapSubmit}
            onCancel={() => setRoadmapForm({ open: false })}
          />
        </div>
      )}

      {sectionForm.open && (
        <div className="mt-5">
          <RoadmapSectionForm
            initial={sectionForm.section}
            onSubmit={handleSectionSubmit}
            onCancel={() => setSectionForm({ open: false })}
          />
        </div>
      )}

      {roadmap.selectedRoadmap && (
        <div className="mt-5 flex flex-wrap gap-2">
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
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">No hay roadmaps</h3>
          <p className="mt-1 text-sm text-text-muted">
            Crea uno nuevo para empezar desde cero.
          </p>
        </div>
      )}

      {roadmap.selectedRoadmap && roadmap.sections.length === 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium">Sin secciones todavía</h3>
          <p className="mt-1 text-sm text-text-muted">
            Agrega una sección para organizar los items de este roadmap.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-5">
        {roadmap.sections.map((group) => (
          <RoadmapSection
            key={group.section.id}
            group={group}
            sectionOptions={roadmap.roadmapSections}
            onCreateItem={(values) => void roadmap.createItem(values)}
            onUpdateItem={(id, values) => void roadmap.updateItem(id, values)}
            onDeleteItem={handleDeleteItem}
            onToggleItem={(id) => void roadmap.toggleCompleted(id)}
            onUpdateSection={(id, values) => void roadmap.updateSection(id, values)}
            onDeleteSection={handleDeleteSection}
          />
        ))}
      </div>
    </section>
  );
}
