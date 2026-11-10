import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, ListPlus, Pencil, Trash2 } from "lucide-react";
import IconButton from "@/components/IconButton";
import SortableList from "@/components/SortableList";
import ThinProgress from "@/components/ThinProgress";
import { reorderVisible } from "@/lib/reorder";
import { cn } from "@/utils/cn";
import QuickAddItem from "./QuickAddItem";
import RoadmapItemForm from "./RoadmapItemForm";
import RoadmapItemRow from "./RoadmapItemRow";
import RoadmapSectionForm from "./RoadmapSectionForm";
import { filterVisibleItems } from "../utils/roadmapProgress";
import type {
  RoadmapItem,
  RoadmapItemInput,
  RoadmapSection as RoadmapSectionType,
  RoadmapSectionGroup,
  RoadmapSectionInput,
} from "../types";

type ItemFormState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; item: RoadmapItem };

interface RoadmapSectionProps {
  group: RoadmapSectionGroup;
  sectionOptions: RoadmapSectionType[];
  collapsed: boolean;
  hideCompleted: boolean;
  /** Asa de arrastre de la sección (la entrega `SortableList`). */
  handle?: ReactNode;
  onToggleCollapsed: () => void;
  onCreateItem: (values: RoadmapItemInput) => void;
  onUpdateItem: (id: string, values: RoadmapItemInput) => void;
  onDeleteItem: (item: RoadmapItem) => void;
  onToggleItem: (id: string) => void;
  onReorderItems: (orderedIds: string[]) => void;
  onUpdateSection: (id: string, values: RoadmapSectionInput) => void;
  onDeleteSection: (section: RoadmapSectionType) => void;
}

export default function RoadmapSection({
  group,
  sectionOptions,
  collapsed,
  hideCompleted,
  handle,
  onToggleCollapsed,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onToggleItem,
  onReorderItems,
  onUpdateSection,
  onDeleteSection,
}: RoadmapSectionProps) {
  const [editingSection, setEditingSection] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>({ open: false });

  const closeItemForm = () => setItemForm({ open: false });
  const { section } = group;
  const visibleItems = filterVisibleItems(group.items, hideCompleted);
  const allDone = group.total > 0 && group.completed === group.total;

  return (
    <section
      aria-label={section.name}
      className="rounded-xl border border-border bg-surface"
    >
      <div className="group flex h-8 items-center gap-2 px-3">
        {handle}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Desplegar" : "Plegar"} sección ${section.name}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md text-left"
        >
          <ChevronRight
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className={cn(
              "shrink-0 text-text-muted transition-transform",
              !collapsed && "rotate-90",
            )}
          />
          <h3 className="min-w-0 truncate text-sm font-semibold">{section.name}</h3>
        </button>

        <span
          className="shrink-0 text-xs tabular-nums text-text-muted"
          title={`${group.completed} de ${group.total} completados (${group.percent}%)`}
        >
          {group.completed}/{group.total}
        </span>
        <ThinProgress
          percent={group.percent}
          tone="success"
          label={`Progreso de ${section.name}`}
          className="w-20 shrink-0"
        />

        <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <IconButton
            icon={ListPlus}
            label={`Nuevo item con detalles en ${section.name}`}
            onClick={() => {
              setEditingSection(false);
              setItemForm({ open: true, mode: "create" });
              if (collapsed) onToggleCollapsed();
            }}
          />
          <IconButton
            icon={Pencil}
            label={`Editar sección ${section.name}`}
            onClick={() => {
              closeItemForm();
              setEditingSection(true);
            }}
          />
          <IconButton
            icon={Trash2}
            tone="danger"
            label={`Eliminar sección ${section.name}`}
            onClick={() => onDeleteSection(section)}
          />
        </div>
      </div>

      {editingSection && (
        <div className="px-3 pb-3">
          <RoadmapSectionForm
            initial={section}
            onSubmit={(values) => {
              onUpdateSection(section.id, values);
              setEditingSection(false);
            }}
            onCancel={() => setEditingSection(false)}
          />
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-border px-1 py-0.5">
          {itemForm.open && itemForm.mode === "create" && (
            <div className="px-2 pb-2 pt-1">
              <RoadmapItemForm
                defaultSectionId={section.id}
                sectionOptions={sectionOptions}
                onSubmit={(values) => {
                  onCreateItem(values);
                  closeItemForm();
                }}
                onCancel={closeItemForm}
              />
            </div>
          )}

          <SortableList
            items={visibleItems}
            noun="item"
            getLabel={(item) => item.title}
            onReorder={(activeId, overId) =>
              onReorderItems(
                reorderVisible(
                  group.items.map((item) => item.id),
                  visibleItems.map((item) => item.id),
                  activeId,
                  overId,
                ),
              )
            }
            renderItem={(item, itemHandle) =>
              itemForm.open &&
              itemForm.mode === "edit" &&
              itemForm.item.id === item.id ? (
                <div className="px-2 py-1">
                  <RoadmapItemForm
                    initial={item}
                    sectionOptions={sectionOptions}
                    onSubmit={(values) => {
                      onUpdateItem(item.id, values);
                      closeItemForm();
                    }}
                    onCancel={closeItemForm}
                  />
                </div>
              ) : (
                <RoadmapItemRow
                  item={item}
                  handle={itemHandle}
                  onToggle={() => onToggleItem(item.id)}
                  onEdit={() => {
                    setEditingSection(false);
                    setItemForm({ open: true, mode: "edit", item });
                  }}
                  onDelete={() => onDeleteItem(item)}
                />
              )
            }
          />

          {visibleItems.length === 0 && group.total > 0 && allDone && (
            <p className="px-2 py-1.5 text-sm text-text-muted">
              Todo completado. Los items están ocultos.
            </p>
          )}

          <QuickAddItem
            sectionName={section.name}
            onAdd={(title) => onCreateItem({ sectionId: section.id, title })}
          />
        </div>
      )}
    </section>
  );
}
