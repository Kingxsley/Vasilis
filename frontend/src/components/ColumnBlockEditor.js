import React, { useState } from 'react';
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
import {
  GripVertical, Plus, Edit, Trash2, Type, FileText, Image as ImageIcon,
  MousePointerClick, Minus, Layout, Mail, LayoutGrid,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';

/**
 * ColumnBlockEditor — visual editor for the list of blocks inside one column
 * of a `columns` block. Supports:
 *   - Drag-and-drop reorder (via @dnd-kit)
 *   - Add simple blocks (heading/text/button/image/divider) with a dropdown
 *   - Inline edit + delete
 *
 * The heavy block editor dialog (rich forms for hero/cards/contact_form/etc.)
 * is NOT used here — nested columns are intentionally simple to avoid
 * complexity explosions.
 */
const BLOCK_ICON = {
  heading: Type,
  text: FileText,
  button: MousePointerClick,
  image: ImageIcon,
  divider: Minus,
  hero: Layout,
  contact_form: Mail,
  cards: LayoutGrid,
};

const SIMPLE_ADD_DEFAULTS = {
  heading: { text: 'Heading', level: 'h3', align: 'left' },
  text: { text: 'Text content…', align: 'left' },
  button: { text: 'Click me', url: '/', style: 'primary' },
  image: { url: '', alt: '' },
  divider: { style: 'line' },
};

export default function ColumnBlockEditor({ blocks = [], onChange, onEdit }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const [adding, setAdding] = useState(false);

  const ids = blocks.map((b, i) => b.block_id || `nested_${i}`);

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id);
    const newIdx = ids.indexOf(over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(blocks, oldIdx, newIdx).map((b, i) => ({ ...b, order: i }));
    onChange(next);
  };

  const addBlock = (type) => {
    const nid = `nested_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const next = [
      ...blocks,
      {
        block_id: nid,
        type,
        content: SIMPLE_ADD_DEFAULTS[type] || {},
        order: blocks.length,
      },
    ];
    onChange(next);
    setAdding(false);
  };

  const removeBlock = (idx) => {
    const next = blocks.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i }));
    onChange(next);
  };

  const updateBlock = (idx, patch) => {
    const next = blocks.map((b, i) => (i === idx ? { ...b, content: { ...b.content, ...patch } } : b));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {blocks.length === 0 && (
              <div className="text-center text-xs text-gray-500 py-4 border border-dashed border-[#30363D] rounded-md">
                Empty column — add a block below.
              </div>
            )}
            {blocks.map((block, index) => {
              const id = block.block_id || `nested_${index}`;
              const Icon = BLOCK_ICON[block.type] || FileText;
              return (
                <NestedRow
                  key={id}
                  id={id}
                  icon={<Icon className="w-3.5 h-3.5 text-[#D4A836]" />}
                  block={block}
                  onQuickEdit={(text) => updateBlock(index, { text })}
                  onOpenEditor={() => onEdit && onEdit(block, index)}
                  onDelete={() => removeBlock(index)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {adding ? (
        <div className="flex items-center gap-2">
          <Select onValueChange={addBlock}>
            <SelectTrigger className="bg-[#0f0f15] border-[#30363D] text-white h-8 text-xs flex-1">
              <SelectValue placeholder="Choose block type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heading">Heading</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="divider">Divider</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-8 text-xs">
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button" size="sm" variant="outline"
          onClick={() => setAdding(true)}
          className="w-full border-dashed border-[#30363D] text-gray-400 hover:border-[#D4A836]/50 hover:text-[#D4A836] h-8 text-xs"
          data-testid="col-add-block"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add block
        </Button>
      )}
    </div>
  );
}

function NestedRow({ id, icon, block, onQuickEdit, onOpenEditor, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  const preview =
    block.content?.text?.toString().slice(0, 40) ||
    block.content?.url?.slice(0, 40) ||
    block.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 bg-[#0f0f15] border border-[#30363D] rounded-md px-1.5 py-1 text-xs"
      data-testid={`nested-block-${block.type}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-[#D4A836] p-0.5 touch-none"
        aria-label="Drag"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      {icon}
      <span className="flex-1 min-w-0 truncate text-gray-300">{preview}</span>
      <Button type="button" size="sm" variant="ghost" onClick={onOpenEditor} className="h-6 w-6 p-0 text-gray-500 hover:text-[#D4A836]">
        <Edit className="w-3.5 h-3.5" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="h-6 w-6 p-0 text-gray-500 hover:text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
