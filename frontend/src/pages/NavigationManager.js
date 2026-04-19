import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Eye, EyeOff, GripVertical, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-[#1a1a24] border border-[#30363D] rounded-lg mb-2"
    >
      <div className="flex items-center gap-3 flex-1">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-[#E8DDB5] font-medium">{item.label}</p>
          <p className="text-sm text-gray-500">{item.path}</p>
        </div>
        <div className="flex items-center gap-2">
          {item.is_dynamic_page && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
              PageBuilder
            </span>
          )}
          {item.is_auto_generated && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              Auto
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onToggle(item.item_id, !item.is_active)}
        className={item.is_active ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-gray-500'}
      >
        {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default function NavigationManager() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchNavItems();
  }, []);

  const fetchNavItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/navigation/public`);
      const navItems = res.data.items || [];
      // Sort by sort_order
      navItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setItems(navItems);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load navigation:', error);
      toast.error('Failed to load navigation items');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.item_id === active.id);
        const newIndex = items.findIndex((item) => item.item_id === over.id);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Update sort_order
        const updatedItems = reorderedItems.map((item, index) => ({
          ...item,
          sort_order: (index + 1) * 10
        }));
        
        setHasChanges(true);
        return updatedItems;
      });
    }
  };

  const handleToggle = async (itemId, newActiveState) => {
    try {
      await axios.patch(
        `${API}/navigation/${itemId}`,
        { is_active: newActiveState },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
      const reorderPayload = items.map((item, index) => ({
        item_id: item.item_id,
        sort_order: (index + 1) * 10
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
            <p className="text-gray-400">Drag to reorder • Click eye to toggle visibility</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchNavItems}
              variant="outline"
              className="border-[#30363D]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Navigation Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map(item => item.item_id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item) => (
                    <SortableNavItem
                      key={item.item_id}
                      item={item}
                      onToggle={handleToggle}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <div className="p-4 bg-[#1a1a24] border-2 border-[#D4A836] rounded-lg opacity-90">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-[#D4A836]" />
                        <span className="text-[#E8DDB5] font-medium">
                          {items.find(i => i.item_id === activeId)?.label}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {items.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>No navigation items yet</p>
                  <p className="text-sm mt-2">Create pages in Page Builder with "Show in Navigation" enabled</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
