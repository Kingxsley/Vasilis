import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/**
 * SortableBlockList — drag-and-drop wrapper for the PageBuilder block list.
 *
 * Props:
 *   items:    array of { block_id, ...rest }
 *   onReorder: (newItems) => void
 *   renderItem: (item, index, dragHandle) => ReactNode
 *
 * Each rendered item receives a `dragHandle` element it can embed anywhere —
 * usually at the left edge — which is the only part that captures the drag.
 * This keeps the Edit/Delete/MoveUp buttons fully clickable.
 */
export function SortableBlockList({ items, onReorder, renderItem }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const ids = items.map((it, idx) => it.block_id || `block_${idx}`);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((b, i) => ({
      ...b,
      order: i,
    }));
    onReorder(reordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item, index) => {
            const id = item.block_id || `block_${index}`;
            return (
              <SortableRow key={id} id={id} renderItem={(dragHandle) => renderItem(item, index, dragHandle)} />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, renderItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-[#D4A836] transition-colors p-1 touch-none"
      aria-label="Drag to reorder"
      data-testid="block-drag-handle"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(dragHandle)}
    </div>
  );
}
