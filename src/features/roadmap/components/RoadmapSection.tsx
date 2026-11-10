import { useState } from "react";
import Button from "@/components/Button";
import RoadmapItemForm from "./RoadmapItemForm";
import RoadmapItemRow from "./RoadmapItemRow";
import RoadmapSectionForm from "./RoadmapSectionForm";
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
  onCreateItem: (values: RoadmapItemInput) => void;
  onUpdateItem: (id: string, values: RoadmapItemInput) => void;
  onDeleteItem: (item: RoadmapItem) => void;
  onToggleItem: (id: string) => void;
  onUpdateSection: (id: string, values: RoadmapSectionInput) => void;
  onDeleteSection: (section: RoadmapSectionType) => void;
}

export default function RoadmapSection({
  group,
  sectionOptions,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onToggleItem,
  onUpdateSection,
  onDeleteSection,
}: RoadmapSectionProps) {
  const [editingSection, setEditingSection] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>({ open: false });

  const closeItemForm = () => setItemForm({ open: false });

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold">{group.section.name}</h3>
          <p className="mt-1 text-sm text-text-muted">
            {group.completed}/{group.total} completados · {group.percent}%
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setEditingSection(false);
              setItemForm({ open: true, mode: "create" });
            }}
            className="shrink-0"
          >
            Agregar item
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              closeItemForm();
              setEditingSection(true);
            }}
            className="shrink-0"
          >
            Editar sección
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDeleteSection(group.section)}
            className="shrink-0"
          >
            Eliminar sección
          </Button>
        </div>
      </div>

      {editingSection && (
        <div className="mt-4">
          <RoadmapSectionForm
            initial={group.section}
            onSubmit={(values) => {
              onUpdateSection(group.section.id, values);
              setEditingSection(false);
            }}
            onCancel={() => setEditingSection(false)}
          />
        </div>
      )}

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${group.percent}%` }}
        />
      </div>

      {itemForm.open && itemForm.mode === "create" && (
        <div className="mt-4">
          <RoadmapItemForm
            defaultSectionId={group.section.id}
            sectionOptions={sectionOptions}
            onSubmit={(values) => {
              onCreateItem(values);
              closeItemForm();
            }}
            onCancel={closeItemForm}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {group.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3">
            <RoadmapItemRow
              item={item}
              onToggle={() => onToggleItem(item.id)}
              onEdit={() => {
                setEditingSection(false);
                setItemForm({ open: true, mode: "edit", item });
              }}
              onDelete={() => onDeleteItem(item)}
            />

            {itemForm.open &&
              itemForm.mode === "edit" &&
              itemForm.item.id === item.id && (
                <RoadmapItemForm
                  initial={item}
                  sectionOptions={sectionOptions}
                  onSubmit={(values) => {
                    onUpdateItem(item.id, values);
                    closeItemForm();
                  }}
                  onCancel={closeItemForm}
                />
              )}
          </div>
        ))}
      </div>
    </section>
  );
}
