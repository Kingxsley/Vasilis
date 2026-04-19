import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { 
  Save, Loader2, Plus, Trash2, GripVertical, Calendar, Tag, 
  Mail, MessageSquare, FileText, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WIDGET_ICONS = {
  recent_posts: FileText,
  upcoming_events: Calendar,
  tags: Tag,
  newsletter: Mail,
  contact_cta: MessageSquare,
  custom_rich_text: FileText
};

export default function SidebarWidgetManager() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [widgetConfig, setWidgetConfig] = useState(null);
  const [availableWidgets, setAvailableWidgets] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    fetchPages();
    fetchAvailableWidgets();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchWidgetConfig(selectedPage.slug);
    }
  }, [selectedPage]);

  const fetchPages = async () => {
    try {
      const res = await axios.get(`${API}/cms-tiles?include_unpublished=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPages(res.data.tiles || []);
      if (res.data.tiles && res.data.tiles.length > 0) {
        setSelectedPage(res.data.tiles[0]);
      }
    } catch (error) {
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableWidgets = async () => {
    try {
      const res = await axios.get(`${API}/sidebar-widgets/defaults/list`);
      setAvailableWidgets(res.data.widgets || []);
    } catch (error) {
      console.error('Failed to load available widgets');
    }
  };

  const fetchWidgetConfig = async (pageSlug) => {
    try {
      const res = await axios.get(`${API}/sidebar-widgets/${pageSlug}`);
      setWidgetConfig(res.data);
    } catch (error) {
      console.error('Failed to load widget config');
      setWidgetConfig({
        page_slug: pageSlug,
        enabled: true,
        widgets: []
      });
    }
  };

  const handleSave = async () => {
    if (!selectedPage || !widgetConfig) return;
    
    setSaving(true);
    try {
      await axios.post(
        `${API}/sidebar-widgets/${selectedPage.slug}`,
        widgetConfig,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Sidebar widgets saved successfully');
    } catch (error) {
      toast.error('Failed to save sidebar widgets');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedPage) return;
    
    try {
      const res = await axios.get(`${API}/sidebar-widgets/render/${selectedPage.slug}`);
      setPreviewData(res.data);
    } catch (error) {
      toast.error('Failed to load preview');
    }
  };

  const addWidget = (widgetType) => {
    const widgetInfo = availableWidgets.find(w => w.type === widgetType);
    if (!widgetInfo) return;

    const newWidget = {
      widget_id: `widget_${Date.now()}`,
      widget_type: widgetType,
      title: widgetInfo.default_config.title,
      enabled: true,
      order: widgetConfig.widgets.length,
      config: widgetInfo.default_config.config
    };

    setWidgetConfig(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
    setAddDialogOpen(false);
  };

  const removeWidget = (widgetId) => {
    setWidgetConfig(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.widget_id !== widgetId)
    }));
  };

  const updateWidget = (widgetId, updates) => {
    setWidgetConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.widget_id === widgetId ? { ...w, ...updates } : w
      )
    }));
  };

  const moveWidget = (widgetId, direction) => {
    const widgets = [...widgetConfig.widgets];
    const index = widgets.findIndex(w => w.widget_id === widgetId);
    
    if (direction === 'up' && index > 0) {
      [widgets[index], widgets[index - 1]] = [widgets[index - 1], widgets[index]];
    } else if (direction === 'down' && index < widgets.length - 1) {
      [widgets[index], widgets[index + 1]] = [widgets[index + 1], widgets[index]];
    }
    
    // Update order values
    widgets.forEach((w, i) => w.order = i);
    
    setWidgetConfig(prev => ({ ...prev, widgets }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Sidebar Widget Manager</h1>
          <p className="text-gray-400 mt-1">Customize sidebar widgets for each page</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Page Selector */}
          <Card className="bg-[#161B22] border-[#30363D] lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Select Page</CardTitle>
              <CardDescription>Choose a page to configure its sidebar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pages.map(page => (
                  <button
                    key={page.tile_id}
                    onClick={() => setSelectedPage(page)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedPage?.tile_id === page.tile_id
                        ? 'bg-[#D4A836]/20 border border-[#D4A836]'
                        : 'bg-[#0D1117] border border-[#30363D] hover:border-[#D4A836]/50'
                    }`}
                  >
                    <div className="font-medium text-white">{page.name}</div>
                    <div className="text-xs text-gray-500">/{page.slug}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Widget Configuration */}
          {widgetConfig && (
            <Card className="bg-[#161B22] border-[#30363D] lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Sidebar Widgets for "{selectedPage?.name}"
                    </CardTitle>
                    <CardDescription>Add and configure widgets</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-gray-400 text-sm">Enabled</Label>
                    <Switch
                      checked={widgetConfig.enabled}
                      onCheckedChange={(checked) =>
                        setWidgetConfig(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Add Widget Button */}
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-[#D4A836]/50 text-[#D4A836] hover:bg-[#D4A836]/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Widget
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#161B22] border-[#30363D]">
                      <DialogHeader>
                        <DialogTitle>Choose Widget Type</DialogTitle>
                        <DialogDescription>Select a widget to add to the sidebar</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {availableWidgets.map(widget => {
                          const Icon = WIDGET_ICONS[widget.type] || FileText;
                          return (
                            <button
                              key={widget.type}
                              onClick={() => addWidget(widget.type)}
                              className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg hover:border-[#D4A836]/50 transition-colors text-left"
                            >
                              <Icon className="w-5 h-5 text-[#D4A836] mb-2" />
                              <div className="font-medium text-white text-sm">{widget.label}</div>
                              <div className="text-xs text-gray-500 mt-1">{widget.description}</div>
                            </button>
                          );
                        })}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Widget List */}
                  {widgetConfig.widgets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No widgets added yet</p>
                      <p className="text-sm">Click "Add Widget" to get started</p>
                    </div>
                  ) : (
                    widgetConfig.widgets.map((widget, index) => {
                      const Icon = WIDGET_ICONS[widget.widget_type] || FileText;
                      const widgetInfo = availableWidgets.find(w => w.type === widget.widget_type);
                      
                      return (
                        <Card key={widget.widget_id} className="bg-[#0D1117] border-[#30363D]">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <GripVertical className="w-5 h-5 text-gray-500 mt-1 cursor-move" />
                              <Icon className="w-5 h-5 text-[#D4A836] mt-1" />
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Input
                                    value={widget.title || ''}
                                    onChange={(e) => updateWidget(widget.widget_id, { title: e.target.value })}
                                    className="bg-[#161B22] border-[#30363D] max-w-xs"
                                    placeholder="Widget Title"
                                  />
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => moveWidget(widget.widget_id, 'up')}
                                      disabled={index === 0}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => moveWidget(widget.widget_id, 'down')}
                                      disabled={index === widgetConfig.widgets.length - 1}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </Button>
                                    <Switch
                                      checked={widget.enabled}
                                      onCheckedChange={(checked) =>
                                        updateWidget(widget.widget_id, { enabled: checked })
                                      }
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeWidget(widget.widget_id)}
                                      className="text-gray-400 hover:text-red-400"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-gray-500">
                                  {widgetInfo?.label || widget.widget_type}
                                </div>

                                {/* Widget-specific configuration */}
                                {widget.widget_type === 'recent_posts' && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Count</Label>
                                      <Input
                                        type="number"
                                        value={widget.config.count || 5}
                                        onChange={(e) => updateWidget(widget.widget_id, {
                                          config: { ...widget.config, count: parseInt(e.target.value) }
                                        })}
                                        className="bg-[#161B22] border-[#30363D] text-sm"
                                      />
                                    </div>
                                  </div>
                                )}

                                {widget.widget_type === 'newsletter' && (
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-xs">Description</Label>
                                      <Textarea
                                        value={widget.config.description || ''}
                                        onChange={(e) => updateWidget(widget.widget_id, {
                                          config: { ...widget.config, description: e.target.value }
                                        })}
                                        className="bg-[#161B22] border-[#30363D] text-sm"
                                        rows={2}
                                      />
                                    </div>
                                  </div>
                                )}

                                {widget.widget_type === 'custom_rich_text' && (
                                  <div>
                                    <Label className="text-xs">HTML Content</Label>
                                    <Textarea
                                      value={widget.config.content || ''}
                                      onChange={(e) => updateWidget(widget.widget_id, {
                                        config: { ...widget.config, content: e.target.value }
                                      })}
                                      className="bg-[#161B22] border-[#30363D] text-sm font-mono"
                                      rows={4}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-[#30363D]">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Configuration
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePreview}
                      className="border-[#30363D] text-gray-400"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
