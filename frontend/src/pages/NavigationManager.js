import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Menu, Eye, EyeOff, GripVertical, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Sortable Item Component
function SortableNavItem({ item, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.item_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditable = !item.is_auto_generated && !item.is_dynamic_page && !item.is_cms_tile;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-[#1a1a24] border border-[#30363D] rounded-lg"
    >
      <div className="flex items-center gap-3 flex-1">
        {isEditable && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
        )}
        {!isEditable && <div className="w-4" />}
        <div className="flex-1">
          <p className="text-[#E8DDB5] font-medium">{item.label}</p>
          <p className="text-sm text-gray-500">{item.path}</p>
        </div>
        <div className="flex items-center gap-2">
          {item.is_dynamic_page && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
              Page
            </span>
          )}
          {item.is_auto_generated && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              Auto
            </span>
          )}
          {item.is_cms_tile && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
              CMS Tile
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {isEditable ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggle(item.item_id, !item.is_active)}
            className={item.is_active ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-gray-500'}
          >
            {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        ) : (
          <div className="w-9 flex items-center justify-center">
            {item.is_active ? (
              <Eye className="w-4 h-4 text-green-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-600" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NavigationManager() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchNavItems();
  }, []);

  const fetchNavItems = async () => {
    try {
      const res = await axios.get(`${API}/navigation/public`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.items || []);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load navigation:', error);
      toast.error('Failed to load navigation items');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.item_id === active.id);
        const newIndex = items.findIndex((item) => item.item_id === over.id);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Update sort_order for each item
        const updatedItems = reorderedItems.map((item, index) => ({
          ...item,
          sort_order: index * 10
        }));
        
        setHasChanges(true);
        return updatedItems;
      });
    }
  };

  const handleToggle = async (itemId, newActiveState) => {
    // Find the item
    const item = items.find(i => i.item_id === itemId);
    if (!item) return;

    try {
      await axios.patch(
        `${API}/navigation/${itemId}`,
        { is_active: newActiveState },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setItems(items.map(i => 
        i.item_id === itemId ? { ...i, is_active: newActiveState } : i
      ));

      toast.success(newActiveState ? 'Item enabled' : 'Item disabled');
    } catch (error) {
      console.error('Failed to toggle item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const reorderPayload = items
        .filter(item => item.is_custom) // Only reorder custom items
        .map(item => ({
          item_id: item.item_id,
          sort_order: item.sort_order
        }));

      await axios.post(
        `${API}/navigation/reorder`,
        reorderPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Navigation order saved');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-gray-400">Access denied. Super admin only.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Navigation Menu Manager</h1>
            <p className="text-gray-400">Manage navigation visibility and ordering</p>
          </div>
          {hasChanges && (
            <Button 
              onClick={handleSaveOrder}
              disabled={saving}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Order
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Navigation Items</CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map(item => item.item_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {items.map((item) => (
                      <SortableNavItem
                        key={item.item_id}
                        item={item}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="mt-6 p-4 bg-[#1a1a24]/50 border border-[#30363D] rounded-lg space-y-2">
                <p className="text-sm text-[#E8DDB5] font-semibold">About Navigation Items:</p>
                <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
                  <li><span className="text-blue-400">Page</span> items are auto-generated from PageBuilder pages with "Show in Navigation" enabled</li>
                  <li><span className="text-green-400">Auto</span> items are system-generated (e.g., Blog when posts exist)</li>
                  <li><span className="text-purple-400">CMS Tile</span> items are from published CMS tiles</li>
                  <li>Only custom items can be reordered and toggled on/off</li>
                  <li>Dynamic items are controlled by their source (PageBuilder, Blog, etc.)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
