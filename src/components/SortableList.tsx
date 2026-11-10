import type { CSSProperties, ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, Modifier } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/utils/cn";

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

export interface SortableListProps<T extends { id: string }> {
  items: T[];
  /** Texto que identifica a cada elemento (asa y avisos de accesibilidad). */
  getLabel: (item: T) => string;
  /** Se llama al soltar: `activeId` pasa a ocupar la posición de `overId`. */
  onReorder: (activeId: string, overId: string) => void;
  /**
   * Pinta un elemento. `handle` es el asa de arrastre (un botón con soporte de
   * teclado: Espacio/Enter para coger, flechas para mover, Espacio para soltar);
   * colócala dentro de una fila con la clase `group` para que se muestre al
   * pasar el cursor.
   */
  renderItem: (item: T, handle: ReactNode, state: { dragging: boolean }) => ReactNode;
  /** Nombre del tipo de elemento, en singular, para los avisos ("item", "sección"). */
  noun?: string;
  className?: string;
}

interface SortableEntryProps {
  id: string;
  label: string;
  children: (handle: ReactNode, dragging: boolean) => ReactNode;
}

function SortableEntry({ id, label, children }: SortableEntryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Reordenar ${label}`}
      title="Arrastra para reordenar"
      className={cn(
        "-ml-1 inline-flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:text-text focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100",
        isDragging && "cursor-grabbing opacity-100",
      )}
    >
      <GripVertical size={14} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "relative z-20 rounded-md bg-surface shadow-lg ring-1 ring-accent",
      )}
    >
      {children(handle, isDragging)}
    </div>
  );
}

/**
 * Lista reordenable por arrastre (dnd-kit): ratón/táctil y teclado, limitada al
 * eje vertical. No guarda nada: avisa con `onReorder` y el padre decide.
 */
export default function SortableList<T extends { id: string }>({
  items,
  getLabel,
  onReorder,
  renderItem,
  noun = "elemento",
  className,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const labelOf = (id: string | number) => {
    const item = items.find((candidate) => candidate.id === String(id));
    return item ? getLabel(item) : noun;
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: `Para reordenar, pulsa Espacio o Intro sobre el asa, mueve con las flechas arriba y abajo, y pulsa Espacio para soltar. Escape cancela.`,
        },
        announcements: {
          onDragStart: ({ active }) => `Cogido: ${labelOf(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${labelOf(active.id)} está sobre la posición de ${labelOf(over.id)}.`
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${labelOf(active.id)} movido a la posición de ${labelOf(over.id)}.`
              : `${labelOf(active.id)} vuelve a su sitio.`,
          onDragCancel: ({ active }) =>
            `Reordenación cancelada: ${labelOf(active.id)} no se ha movido.`,
        },
      }}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {items.map((item) => (
            <SortableEntry key={item.id} id={item.id} label={getLabel(item)}>
              {(handle, dragging) => renderItem(item, handle, { dragging })}
            </SortableEntry>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
