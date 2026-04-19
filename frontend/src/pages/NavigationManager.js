import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Loader2, Eye, EyeOff, GripVertical, Save, RefreshCw, Plus, Edit, Trash2,
  ExternalLink, Link2, FileText, Layout as LayoutIcon, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default option lists (also fetched from /navigation/options to stay in sync)
const DEFAULT_ICONS = [
  'Link', 'Home', 'LayoutDashboard', 'BookOpen', 'FileText', 'Settings',
  'Users', 'Building2', 'Award', 'Calendar', 'Bell', 'Mail', 'Globe',
  'ExternalLink', 'BarChart3', 'Lock', 'ShieldAlert', 'Star', 'Activity',
  'MessageSquare',
];
const DEFAULT_SECTIONS = [
  { id: 'main',        label: 'Overview' },
  { id: 'management',  label: 'Management' },
  { id: 'simulations', label: 'Simulations' },
  { id: 'content',     label: 'Content' },
  { id: 'training',    label: 'Training' },
  { id: 'settings',    label: 'Settings' },
  { id: 'security',    label: 'Security' },
];
const DEFAULT_ROLES = [
  { id: 'all',           label: 'All Users (incl. anonymous)' },
  { id: 'super_admin',   label: 'Super Admin' },
  { id: 'org_admin',     label: 'Organization Admin' },
  { id: 'media_manager', label: 'Media Manager' },
  { id: 'trainee',       label: 'Trainee' },
];

const LINK_TYPE_META = {
  internal:    { label: 'Internal',    icon: Link2,         cls: 'border-blue-500/30 text-blue-300' },
  external:    { label: 'External',    icon: ExternalLink,  cls: 'border-purple-500/30 text-purple-300' },
  cms_page:    { label: 'CMS Page',    icon: FileText,      cls: 'border-amber-500/30 text-amber-300' },
};

function SortableNavItem({ item, onToggle, onEdit, onDelete, sections }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.item_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isManaged = item.is_dynamic_page || item.is_auto_generated;
  const linkMeta = LINK_TYPE_META[item.link_type] || LINK_TYPE_META.internal;
  const sectionLabel = sections.find((s) => s.id === item.section_id)?.label || item.section_id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 bg-[#1a1a24] border rounded-lg transition-all
        ${item.is_active ? 'border-[#30363D] hover:border-[#D4A836]/40' : 'border-[#30363D]/50 opacity-70 hover:opacity-100'}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none px-1 text-gray-500 hover:text-[#D4A836]"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[#E8DDB5] font-medium truncate">{item.label}</p>
          <Badge variant="outline" className={`text-[10px] ${linkMeta.cls}`}>
            <linkMeta.icon className="w-3 h-3 mr-1" />
            {linkMeta.label}
          </Badge>
          {item.is_dynamic_page && (
            <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-300">
              <Sparkles className="w-3 h-3 mr-1" /> PageBuilder
            </Badge>
          )}
          {item.is_auto_generated && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">
              Auto
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <span className="truncate">{item.path}</span>
          <span>·</span>
          <span>Section: {sectionLabel}</span>
          {item.visible_to && item.visible_to.length > 0 && (
            <>
              <span>·</span>
              <span>Visible to: {item.visible_to.join(', ')}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onToggle(item)}
          className={item.is_active ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-500 hover:text-gray-300'}
          title={item.is_active ? 'Hide from navigation' : 'Show in navigation'}
          disabled={isManaged}
        >
          {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        {!isManaged && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onEdit(item)} className="text-gray-300 hover:text-[#D4A836]" title="Edit">
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(item)} className="text-red-400 hover:bg-red-500/10" title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  label: '',
  link_type: 'internal',
  path: '/',
  icon: 'Link',
  section_id: 'main',
  visible_to: ['all'],
  open_in_new_tab: false,
  sort_order: 100,
  is_active: true,
};

export default function NavigationManager() {
  const { token, user } = useAuth();

  const [items, setItems] = useState([]);
  const [icons, setIcons] = useState(DEFAULT_ICONS);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [cmsPages, setCmsPages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [sectionFilter, setSectionFilter] = useState('all');

  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ---- Data loading ---------------------------------------------------
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // Admin endpoint returns raw stored items
      const adminRes = await axios.get(`${API}/navigation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const stored = adminRes.data?.items || [];

      // Public endpoint includes auto-generated/PageBuilder items so we can show them too
      let dynamic = [];
      try {
        const pubRes = await axios.get(`${API}/navigation/public`);
        const pubItems = pubRes.data?.items || [];
        // Only keep items that are NOT in the admin stored list (i.e. auto-generated)
        const storedIds = new Set(stored.map((i) => i.item_id));
        dynamic = pubItems.filter((i) => !storedIds.has(i.item_id));
      } catch (e) {
        // ignore
      }

      const all = [...stored, ...dynamic];
      all.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setItems(all);
      setHasChanges(false);
    } catch (e) {
      console.error('Failed to load navigation items:', e);
      toast.error('Failed to load navigation items');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/navigation/options`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.icons?.length) setIcons(res.data.icons);
      if (res.data?.sections?.length) setSections(res.data.sections);
      if (res.data?.roles?.length) setRoles(res.data.roles);
      if (res.data?.cms_pages) setCmsPages(res.data.cms_pages);
    } catch (e) {
      // fall back to defaults
    }
  }, [token]);

  useEffect(() => { fetchItems(); fetchOptions(); }, [fetchItems, fetchOptions]);

  // ---- DnD ------------------------------------------------------------
  const handleDragStart = (event) => setActiveId(event.active.id);
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setItems((curr) => {
      const oldIdx = curr.findIndex((i) => i.item_id === active.id);
      const newIdx = curr.findIndex((i) => i.item_id === over.id);
      const reordered = arrayMove(curr, oldIdx, newIdx).map((it, idx) => ({
        ...it, sort_order: (idx + 1) * 10,
      }));
      setHasChanges(true);
      return reordered;
    });
  };

  // ---- Item operations ------------------------------------------------
  const toggleActive = async (item) => {
    if (item.is_dynamic_page || item.is_auto_generated) return; // managed items can't be toggled here
    try {
      await axios.patch(`${API}/navigation/${item.item_id}`, { is_active: !item.is_active }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((curr) => curr.map((i) => i.item_id === item.item_id ? { ...i, is_active: !i.is_active } : i));
      toast.success(item.is_active ? 'Item hidden' : 'Item visible');
    } catch (e) {
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.label}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/navigation/${item.item_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Item deleted');
      fetchItems();
    } catch (e) {
      toast.error('Failed to delete item');
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    // Set a sensible default sort_order at the end of the list
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order || 0), 0);
    setForm({ ...EMPTY_FORM, sort_order: maxOrder + 10 });
    setShowDialog(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setForm({
      label: item.label || '',
      link_type: item.link_type || 'internal',
      path: item.path || '/',
      icon: item.icon || 'Link',
      section_id: item.section_id || 'main',
      visible_to: item.visible_to && item.visible_to.length ? item.visible_to : ['all'],
      open_in_new_tab: !!item.open_in_new_tab,
      sort_order: item.sort_order || 100,
      is_active: item.is_active !== false,
    });
    setShowDialog(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      toast.error('Label is required');
      return;
    }
    if (!form.path.trim()) {
      toast.error('Path / URL is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        label: form.label.trim(),
        path: form.path.trim(),
      };
      if (editingItem) {
        await axios.patch(`${API}/navigation/${editingItem.item_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Item updated');
      } else {
        await axios.post(`${API}/navigation`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Item created');
      }
      setShowDialog(false);
      fetchItems();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      // Only persist sort_order for stored items (managed/auto items aren't in collection)
      const payload = items
        .filter((i) => !i.is_dynamic_page && !i.is_auto_generated)
        .map((i, idx) => ({ item_id: i.item_id, sort_order: (idx + 1) * 10 }));
      await axios.post(`${API}/navigation/reorder`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Order saved');
      setHasChanges(false);
    } catch (e) {
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center"><p className="text-gray-400">Access denied. Super admin only.</p></div>
      </DashboardLayout>
    );
  }

  const filteredItems = sectionFilter === 'all' ? items : items.filter((i) => i.section_id === sectionFilter);
  const counts = items.reduce((acc, it) => {
    const k = it.section_id || 'main';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5] flex items-center gap-2">
              <LayoutIcon className="w-6 h-6 text-[#D4A836]" />
              Navigation Menu Manager
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Drag to reorder · Click eye to toggle visibility · Edit or delete custom items
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchItems} variant="outline" className="border-[#30363D]">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            {hasChanges && (
              <Button onClick={saveOrder} disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Order
              </Button>
            )}
            <Button onClick={openCreateDialog} className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold">
              <Plus className="w-4 h-4 mr-2" /> New Item
            </Button>
          </div>
        </div>

        {/* Section filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSectionFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              sectionFilter === 'all'
                ? 'bg-[#D4A836] text-black border-[#D4A836]'
                : 'bg-[#1a1a24] text-gray-300 border-[#30363D] hover:border-[#D4A836]/40'
            }`}
          >
            All ({items.length})
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSectionFilter(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                sectionFilter === s.id
                  ? 'bg-[#D4A836] text-black border-[#D4A836]'
                  : 'bg-[#1a1a24] text-gray-300 border-[#30363D] hover:border-[#D4A836]/40'
              }`}
            >
              {s.label} ({counts[s.id] || 0})
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#E8DDB5] text-base">
                {sectionFilter === 'all' ? 'All Navigation Items' : sections.find((s) => s.id === sectionFilter)?.label}
                <span className="text-gray-400 ml-2 text-sm font-normal">({filteredItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <LayoutIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No navigation items in this section yet.</p>
                  <Button onClick={openCreateDialog} className="mt-4 bg-[#D4A836] hover:bg-[#C49A30] text-black">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredItems.map((i) => i.item_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {filteredItems.map((item) => (
                        <SortableNavItem
                          key={item.item_id}
                          item={item}
                          onToggle={toggleActive}
                          onEdit={openEditDialog}
                          onDelete={deleteItem}
                          sections={sections}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="p-3 bg-[#1a1a24] border-2 border-[#D4A836] rounded-lg shadow-xl">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-[#D4A836]" />
                          <span className="text-[#E8DDB5] font-medium">
                            {items.find((i) => i.item_id === activeId)?.label}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create / Edit dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingItem ? 'Edit Navigation Item' : 'New Navigation Item'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={submitForm} className="space-y-4 mt-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Label *</Label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Documentation"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label>Link Type</Label>
                  <Select value={form.link_type} onValueChange={(v) => setForm({ ...form, link_type: v })}>
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Path</SelectItem>
                      <SelectItem value="external">External URL</SelectItem>
                      <SelectItem value="cms_page">CMS Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{form.link_type === 'external' ? 'External URL *' : form.link_type === 'cms_page' ? 'CMS Page' : 'Internal Path *'}</Label>
                {form.link_type === 'cms_page' && cmsPages.length > 0 ? (
                  <Select
                    value={form.path}
                    onValueChange={(v) => setForm({ ...form, path: v })}
                  >
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue placeholder="Choose a CMS page" />
                    </SelectTrigger>
                    <SelectContent>
                      {cmsPages.map((p) => (
                        <SelectItem key={p.id} value={`/page/${p.slug}`}>
                          {p.title} (/page/{p.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.path}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    placeholder={form.link_type === 'external' ? 'https://example.com' : '/dashboard'}
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                )}
                {form.link_type === 'cms_page' && cmsPages.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No CMS pages available. Create one in Page Builder first.</p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {icons.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })}>
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                  />
                </div>
              </div>

              <div>
                <Label>Visible to (roles)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1 p-3 bg-[#1a1a24] border border-[#30363D] rounded-md">
                  {roles.map((r) => {
                    const checked = form.visible_to.includes(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const set = new Set(form.visible_to);
                            if (e.target.checked) set.add(r.id); else set.delete(r.id);
                            // Selecting "all" clears specific roles
                            if (r.id === 'all' && e.target.checked) {
                              setForm({ ...form, visible_to: ['all'] });
                            } else if (e.target.checked && set.has('all')) {
                              set.delete('all');
                              setForm({ ...form, visible_to: Array.from(set) });
                            } else {
                              setForm({ ...form, visible_to: Array.from(set) });
                            }
                          }}
                          className="w-4 h-4 accent-[#D4A836]"
                        />
                        {r.label}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tip: select "All Users" for public links, or pick specific roles.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between p-3 bg-[#1a1a24] border border-[#30363D] rounded-md">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-[#D4A836]"
                  />
                  Active (visible in navigation)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.open_in_new_tab}
                    onChange={(e) => setForm({ ...form, open_in_new_tab: e.target.checked })}
                    className="w-4 h-4 accent-[#D4A836]"
                  />
                  Open in new tab
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-[#30363D]">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
