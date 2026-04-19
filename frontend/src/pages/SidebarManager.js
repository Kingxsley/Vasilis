import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Plus, Edit, Trash2, Loader2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Widget type definitions
const WIDGET_TYPES = [
  { id: 'recent_posts', name: 'Recent Blog Posts', icon: '📝', description: 'Display latest blog posts' },
  { id: 'upcoming_events', name: 'Upcoming Events', icon: '📅', description: 'Show upcoming events' },
  { id: 'tag_cloud', name: 'Tag Cloud', icon: '🏷️', description: 'Popular content tags' },
  { id: 'newsletter', name: 'Newsletter Signup', icon: '✉️', description: 'Email subscription form' },
  { id: 'contact_cta', name: 'Contact CTA', icon: '📞', description: 'Call-to-action button' },
  { id: 'custom_html', name: 'Custom HTML', icon: '🎨', description: 'Custom content block' },
];

export default function SidebarManager() {
  const { token, user } = useAuth();
  const [sidebars, setSidebars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSidebar, setEditingSidebar] = useState(null);
  
  const [sidebarForm, setSidebarForm] = useState({
    name: '',
    description: '',
    widgets: []
  });

  useEffect(() => {
    fetchSidebars();
  }, []);

  const fetchSidebars = async () => {
    try {
      const res = await axios.get(`${API}/sidebar-configs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSidebars(res.data || []);
    } catch (error) {
      console.error('Failed to load sidebars:', error);
      toast.error('Failed to load sidebar configurations');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSidebarForm({
      name: '',
      description: '',
      widgets: []
    });
    setEditingSidebar(null);
  };

  const addWidget = (widgetType) => {
    const newWidget = {
      widget_id: `widget_${Date.now()}`,
      widget_type: widgetType,
      title: WIDGET_TYPES.find(w => w.id === widgetType)?.name || widgetType,
      enabled: true,
      order: sidebarForm.widgets.length,
      config: {}
    };
    setSidebarForm({
      ...sidebarForm,
      widgets: [...sidebarForm.widgets, newWidget]
    });
  };

  const removeWidget = (widgetId) => {
    setSidebarForm({
      ...sidebarForm,
      widgets: sidebarForm.widgets.filter(w => w.widget_id !== widgetId)
    });
  };

  const toggleWidgetEnabled = (widgetId) => {
    setSidebarForm({
      ...sidebarForm,
      widgets: sidebarForm.widgets.map(w =>
        w.widget_id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    });
  };

  const updateWidgetTitle = (widgetId, title) => {
    setSidebarForm({
      ...sidebarForm,
      widgets: sidebarForm.widgets.map(w =>
        w.widget_id === widgetId ? { ...w, title } : w
      )
    });
  };

  const moveWidget = (widgetId, direction) => {
    const widgets = [...sidebarForm.widgets];
    const index = widgets.findIndex(w => w.widget_id === widgetId);
    if (index < 0) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= widgets.length) return;
    
    [widgets[index], widgets[newIndex]] = [widgets[newIndex], widgets[index]];
    widgets.forEach((w, i) => w.order = i);
    
    setSidebarForm({ ...sidebarForm, widgets });
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingSidebar) {
        await axios.patch(`${API}/sidebar-configs/${editingSidebar.page_slug}`, sidebarForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Sidebar configuration updated');
      } else {
        await axios.post(`${API}/sidebar-configs`, sidebarForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Sidebar configuration created');
      }
      
      setShowDialog(false);
      resetForm();
      fetchSidebars();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save sidebar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sidebar) => {
    setEditingSidebar(sidebar);
    setSidebarForm({
      name: sidebar.name,
      description: sidebar.description || '',
      widgets: sidebar.widgets || []
    });
    setShowDialog(true);
  };

  const handleDelete = async (sidebarSlug) => {
    if (!window.confirm('Are you sure you want to delete this sidebar configuration?')) return;
    
    try {
      await axios.delete(`${API}/sidebar-configs/${sidebarSlug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sidebar deleted');
      fetchSidebars();
    } catch (error) {
      toast.error('Failed to delete sidebar');
    }
  };

  const createDefaultSidebars = async () => {
    setSaving(true);
    try {
      const defaults = [
        {
          name: 'Blog Sidebar',
          description: 'Sidebar for blog pages',
          widgets: [
            { widget_id: 'w1', widget_type: 'recent_posts', title: 'Recent Posts', enabled: true, order: 0, config: {} },
            { widget_id: 'w2', widget_type: 'tag_cloud', title: 'Popular Tags', enabled: true, order: 1, config: {} },
            { widget_id: 'w3', widget_type: 'newsletter', title: 'Subscribe', enabled: true, order: 2, config: {} }
          ]
        },
        {
          name: 'News Sidebar',
          description: 'Sidebar for news pages',
          widgets: [
            { widget_id: 'w1', widget_type: 'recent_posts', title: 'Latest News', enabled: true, order: 0, config: {} },
            { widget_id: 'w2', widget_type: 'contact_cta', title: 'Contact Us', enabled: true, order: 1, config: {} }
          ]
        },
        {
          name: 'Events Sidebar',
          description: 'Sidebar for event pages',
          widgets: [
            { widget_id: 'w1', widget_type: 'upcoming_events', title: 'Upcoming Events', enabled: true, order: 0, config: {} },
            { widget_id: 'w2', widget_type: 'newsletter', title: 'Get Updates', enabled: true, order: 1, config: {} }
          ]
        },
        {
          name: 'General Sidebar',
          description: 'Default sidebar for other pages',
          widgets: [
            { widget_id: 'w1', widget_type: 'contact_cta', title: 'Get in Touch', enabled: true, order: 0, config: {} },
            { widget_id: 'w2', widget_type: 'custom_html', title: 'About Us', enabled: true, order: 1, config: {} }
          ]
        }
      ];

      for (const sidebar of defaults) {
        await axios.post(`${API}/sidebar-configs`, sidebar, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      toast.success('4 default sidebars created');
      fetchSidebars();
    } catch (error) {
      toast.error('Failed to create default sidebars');
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Sidebar Manager</h1>
            <p className="text-gray-400">Design custom sidebars for your pages</p>
          </div>
          <div className="flex gap-2">
            {sidebars.length === 0 && (
              <Button 
                onClick={createDefaultSidebars}
                disabled={saving}
                variant="outline"
                className="border-[#D4A836]/30 text-[#D4A836]"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create 4 Defaults
              </Button>
            )}
            <Button 
              onClick={() => { resetForm(); setShowDialog(true); }}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Sidebar
            </Button>
          </div>
        </div>

        {/* Sidebars List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : sidebars.length === 0 ? (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="py-16 text-center">
              <GripVertical className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No Sidebars Configured</h3>
              <p className="text-gray-400 mb-6">Create custom sidebars or use the quick setup</p>
              <Button 
                onClick={createDefaultSidebars}
                disabled={saving}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create 4 Default Sidebars
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sidebars.map((sidebar) => (
              <Card key={sidebar.page_slug} className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardHeader>
                  <CardTitle className="text-[#E8DDB5] text-lg">{sidebar.name}</CardTitle>
                  {sidebar.description && (
                    <p className="text-sm text-gray-500">{sidebar.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-gray-500">Widgets ({sidebar.widgets?.length || 0}):</p>
                    {sidebar.widgets?.slice(0, 3).map((widget, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-gray-600 text-gray-400 mr-2">
                        {widget.widget_type}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(sidebar)}
                      className="flex-1 border-[#D4A836]/30 text-[#E8DDB5] hover:bg-[#D4A836]/10"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(sidebar.page_slug)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingSidebar ? 'Edit Sidebar Configuration' : 'Create Sidebar Configuration'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateOrUpdate} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Sidebar Name</Label>
                  <Input
                    value={sidebarForm.name}
                    onChange={(e) => setSidebarForm({ ...sidebarForm, name: e.target.value })}
                    placeholder="Blog Sidebar"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Description</Label>
                  <Input
                    value={sidebarForm.description}
                    onChange={(e) => setSidebarForm({ ...sidebarForm, description: e.target.value })}
                    placeholder="For blog pages..."
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                  />
                </div>
              </div>

              {/* Widget Library */}
              <div>
                <Label className="text-gray-400 mb-2 block">Add Widgets</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {WIDGET_TYPES.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      variant="outline"
                      onClick={() => addWidget(type.id)}
                      className="border-[#30363D] text-gray-400 hover:border-[#D4A836]/30 hover:text-[#E8DDB5] justify-start"
                    >
                      <span className="mr-2">{type.icon}</span>
                      <span className="text-xs">{type.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Widgets List */}
              <div>
                <Label className="text-gray-400 mb-2 block">Current Widgets ({sidebarForm.widgets.length})</Label>
                {sidebarForm.widgets.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
                    <p className="text-gray-500">No widgets added yet. Add widgets from above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sidebarForm.widgets.map((widget, index) => (
                      <div
                        key={widget.widget_id}
                        className="flex items-center gap-2 p-3 bg-[#1a1a24] border border-[#30363D] rounded-lg"
                      >
                        <GripVertical className="w-4 h-4 text-gray-600" />
                        <span className="text-xl">{WIDGET_TYPES.find(t => t.id === widget.widget_type)?.icon}</span>
                        <Input
                          value={widget.title}
                          onChange={(e) => updateWidgetTitle(widget.widget_id, e.target.value)}
                          className="flex-1 bg-[#0f0f15] border-[#30363D] text-white text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moveWidget(widget.widget_id, 'up')}
                          disabled={index === 0}
                          className="text-gray-400"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moveWidget(widget.widget_id, 'down')}
                          disabled={index === sidebarForm.widgets.length - 1}
                          className="text-gray-400"
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleWidgetEnabled(widget.widget_id)}
                          className={widget.enabled ? 'text-green-400' : 'text-gray-600'}
                        >
                          {widget.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeWidget(widget.widget_id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  className="border-[#30363D] text-gray-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving || sidebarForm.widgets.length === 0}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingSidebar ? 'Update Sidebar' : 'Create Sidebar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
