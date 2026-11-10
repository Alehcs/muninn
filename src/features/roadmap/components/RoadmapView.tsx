import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import { Page, PageStrip } from "@/components/PageHeader";
import SortableList from "@/components/SortableList";
import Switch from "@/components/Switch";
import Tabs, { TabPanel } from "@/components/Tabs";
import ThinProgress from "@/components/ThinProgress";
import { inputCls } from "@/components/formStyles";
import { confirm } from "@/lib/confirm";
import { moveToPositionOf } from "@/lib/reorder";
import { confirmDiscardChanges } from "@/lib/unsavedChanges";
import { usePersistentState } from "@/lib/usePersistentState";
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

const HIDE_COMPLETED_KEY = "aurhabits.roadmap.hideCompleted";
const COLLAPSED_KEY = "aurhabits.roadmap.collapsedSections";
/** Hasta este número de listas se muestran como pestañas; más, como desplegable. */
const MAX_TABS = 6;
const TABS_PREFIX = "roadmap-lists";

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

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

  const [hideCompleted, setHideCompleted] = usePersistentState(
    HIDE_COMPLETED_KEY,
    false,
    isBoolean,
  );
  const [collapsedIds, setCollapsedIds] = usePersistentState<string[]>(
    COLLAPSED_KEY,
    [],
    isStringArray,
  );

  const toggleCollapsed = (sectionId: string) =>
    setCollapsedIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );

  const handleSelectRoadmap = async (id: string) => {
    if (id === roadmap.selectedRoadmapId) return;
    if (!(await confirmDiscardChanges())) return;
    closeForms();
    void roadmap.selectRoadmap(id);
  };

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
            <IconButton
              icon={Pencil}
              label="Editar lista"
              onClick={() => {
                closeForms();
                setRoadmapForm({ open: true, roadmap: selected });
              }}
            />
            <IconButton
              icon={Trash2}
              label="Eliminar lista"
              tone="danger"
              onClick={() => void handleDeleteRoadmap(selected)}
            />
          </>
        )
      }
      toolbar={
        roadmap.roadmaps.length === 0 ? undefined : roadmap.roadmaps.length <=
          MAX_TABS ? (
          <div className="-mb-px overflow-x-auto">
            <Tabs
              tabs={roadmap.roadmaps.map((item) => ({
                id: item.id,
                label: item.title,
              }))}
              value={roadmap.selectedRoadmapId ?? roadmap.roadmaps[0].id}
              onChange={(id) => void handleSelectRoadmap(id)}
              label="Listas"
              idPrefix={TABS_PREFIX}
              className="w-max"
            />
          </div>
        ) : (
          <label className="flex min-w-0 items-center gap-2 py-1.5 text-xs font-medium text-text-muted">
            Lista
            <select
              className={`${inputCls} w-auto min-w-48 py-1`}
              value={roadmap.selectedRoadmapId ?? ""}
              onChange={(event) => void handleSelectRoadmap(event.target.value)}
            >
              {roadmap.roadmaps.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        )
      }
    >
      {selected && (
        <PageStrip className="gap-y-2 pb-3">
          <p className="shrink-0 text-sm text-text-muted">
            <span className="text-base font-semibold text-text">
              {roadmap.progress.percent}%
            </span>{" "}
            · {roadmap.progress.completed}/{roadmap.progress.total} items
          </p>
          <ThinProgress
            percent={roadmap.progress.percent}
            tone="success"
            label="Progreso de la lista"
            className="min-w-32 flex-1"
          />
          <Switch
            checked={hideCompleted}
            onChange={setHideCompleted}
            label="Ocultar completados"
          />
          <Button
            variant="ghost"
            className="py-1"
            onClick={() => {
              closeForms();
              setSectionForm({ open: true });
            }}
          >
            <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
            Nueva sección
          </Button>
          {selected.description && (
            <p className="w-full whitespace-pre-wrap break-words text-sm text-text-muted">
              {selected.description}
            </p>
          )}
        </PageStrip>
      )}

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

      {selected && (
        <TabPanel idPrefix={TABS_PREFIX} id={selected.id}>
          <SortableList
            items={roadmap.sections.map((group) => ({
              ...group,
              id: group.section.id,
            }))}
            noun="sección"
            getLabel={(group) => group.section.name}
            className="flex flex-col gap-2"
            onReorder={(activeId, overId) =>
              void roadmap.reorderSections(
                moveToPositionOf(
                  roadmap.sections.map((group) => group.section.id),
                  activeId,
                  overId,
                ),
              )
            }
            renderItem={(group, sectionHandle) => (
              <RoadmapSection
                group={group}
                handle={sectionHandle}
                sectionOptions={roadmap.roadmapSections}
                collapsed={collapsedIds.includes(group.section.id)}
                hideCompleted={hideCompleted}
                onToggleCollapsed={() => toggleCollapsed(group.section.id)}
                onCreateItem={(values) => void roadmap.createItem(values)}
                onUpdateItem={(id, values) => void roadmap.updateItem(id, values)}
                onDeleteItem={(item) => void handleDeleteItem(item)}
                onToggleItem={(id) => void roadmap.toggleCompleted(id)}
                onReorderItems={(orderedIds) =>
                  void roadmap.reorderItems(group.section.id, orderedIds)
                }
                onUpdateSection={(id, values) =>
                  void roadmap.updateSection(id, values)
                }
                onDeleteSection={(section) => void handleDeleteSection(section)}
              />
            )}
          />
        </TabPanel>
      )}
    </Page>
  );
}
