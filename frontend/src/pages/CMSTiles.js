import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  LayoutGrid, Plus, Trash2, Edit, Eye, EyeOff, 
  GripVertical, FileText, Newspaper, Video, Info,
  Phone, Users, HelpCircle, Briefcase, Home, Loader2,
  ExternalLink, Settings, Globe, Image as ImageIcon, Link, Bold, Italic, List, ListOrdered, Quote,
  Calendar, Mail, Star, MessageSquare, DollarSign, Award, BookOpen, Layers, Shield, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import VisualBlockEditor from '../components/VisualBlockEditor';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Page Type Definitions with visual configuration
// Icon mapping
const ICON_OPTIONS = {
  'FileText': FileText,
  'Newspaper': Newspaper,
  'Video': Video,
  'Info': Info,
  'Phone': Phone,
  'Users': Users,
  'HelpCircle': HelpCircle,
  'Briefcase': Briefcase,
  'Home': Home,
  'Globe': Globe,
  'Settings': Settings,
  'Calendar': Calendar,
  'Mail': Mail,
  'Star': Star,
  'MessageSquare': MessageSquare,
  'DollarSign': DollarSign,
  'Award': Award,
  'BookOpen': BookOpen,
  'Layers': Layers,
  'Shield': Shield,
  'Zap': Zap,
  'ImageIcon': ImageIcon,
};

// Separate TileFormPage component for editing/creating
function TileFormPage({ tile, onSave, onCancel, saving }) {
  const [name, setName] = useState(tile?.name || '');
  const [slug, setSlug] = useState(tile?.slug || '');
  const [description, setDescription] = useState(tile?.description || '');
  const [icon, setIcon] = useState(tile?.icon || 'FileText');
  const [routeType, setRouteType] = useState(tile?.route_type || 'custom');
  const [externalUrl, setExternalUrl] = useState(tile?.external_url || '');
  const [customContent, setCustomContent] = useState(tile?.custom_content || '');
  const [blocks, setBlocks] = useState(tile?.blocks || []);
  const [published, setPublished] = useState(tile?.published !== false);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a tile name');
      return;
    }
    onSave({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      route_type: routeType,
      external_url: externalUrl,
      custom_content: customContent,
      blocks,
      published
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            {tile ? 'Edit Page' : 'Create New Page'}
          </h2>
          <p className="text-gray-400 text-sm">
            {tile ? 'Modify your page content and settings' : 'Add a new page to your website'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="border-[#30363D]">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
            disabled={saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {tile ? 'Save Changes' : 'Create Page'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-4">
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-base">Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Page Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Contact Us"
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>
              
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="e.g., contact-us"
                  className="bg-[#0D1117] border-[#30363D]"
                />
                <p className="text-xs text-gray-500">Auto-generated if empty</p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {Object.keys(ICON_OPTIONS).map(iconKey => {
                      const IconComp = ICON_OPTIONS[iconKey];
                      return (
                        <SelectItem key={iconKey} value={iconKey}>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            {iconKey}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {routeType === 'external' && (
                <div className="space-y-2">
                  <Label>External URL</Label>
                  <Input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-[#0D1117] border-[#30363D]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#30363D]">
                <div>
                  <Label>Published</Label>
                  <p className="text-xs text-gray-500">Show in navigation</p>
                </div>
                <Switch checked={published} onCheckedChange={setPublished} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Visual Page Builder */}
        <div className="lg:col-span-2">
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D4A836]" />
                Page Content
              </CardTitle>
              <CardDescription>
                Add and arrange content blocks to build your page. Drag to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisualBlockEditor 
                blocks={blocks} 
                onChange={setBlocks} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CMSTiles() {
  const { token } = useAuth();
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [editingTile, setEditingTile] = useState(null);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTiles();
  }, []);

  const fetchTiles = async () => {
    try {
      const res = await axios.get(`${API}/cms-tiles/admin`, { headers });
      setTiles(res.data.tiles || []);
    } catch (err) {
      console.error('Failed to fetch tiles:', err);
      toast.error('Failed to load tiles');
    } finally {
      setLoading(false);
    }
  };

  const createTile = async (formData) => {
    setSaving(true);
    try {
      await axios.post(`${API}/cms-tiles`, formData, { headers });
      toast.success('Page created successfully');
      setView('list');
      fetchTiles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create page');
    } finally {
      setSaving(false);
    }
  };

  const updateTile = async (formData) => {
    setSaving(true);
    try {
      await axios.patch(`${API}/cms-tiles/${editingTile.tile_id}`, formData, { headers });
      toast.success('Page updated successfully');
      setView('list');
      setEditingTile(null);
      fetchTiles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update page');
    } finally {
      setSaving(false);
    }
  };

  const deleteTile = async (tileId) => {
    if (!window.confirm('Are you sure you want to delete this page?')) return;
    
    try {
      await axios.delete(`${API}/cms-tiles/${tileId}`, { headers });
      toast.success('Page deleted');
      fetchTiles();
    } catch (err) {
      toast.error('Failed to delete page');
    }
  };

  const togglePublish = async (tile) => {
    try {
      await axios.patch(`${API}/cms-tiles/${tile.tile_id}`, 
        { published: !tile.published }, 
        { headers }
      );
      toast.success(tile.published ? 'Page unpublished' : 'Page published');
      fetchTiles();
    } catch (err) {
      toast.error('Failed to update page');
    }
  };

  const seedDemoPages = async () => {
    try {
      const res = await axios.post(`${API}/cms-tiles/seed-demo`, {}, { headers });
      if (res.data.pages?.length > 0) {
        toast.success(res.data.message);
        fetchTiles();
      } else {
        toast.info('Demo pages already exist');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to seed demo pages');
    }
  };

  const getIconComponent = (iconName) => {
    return ICON_OPTIONS[iconName] || FileText;
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

  // Show form view
  if (view === 'create') {
    return (
      <DashboardLayout>
        <TileFormPage
          tile={null}
          onSave={createTile}
          onCancel={() => setView('list')}
          saving={saving}
        />
      </DashboardLayout>
    );
  }

  if (view === 'edit' && editingTile) {
    return (
      <DashboardLayout>
        <TileFormPage
          tile={editingTile}
          onSave={updateTile}
          onCancel={() => { setView('list'); setEditingTile(null); }}
          saving={saving}
        />
      </DashboardLayout>
    );
  }

  // Show list view
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-[#D4A836]" />
              CMS Pages
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Create and manage website pages with visual editor
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={seedDemoPages}
              className="border-[#D4A836]/50 text-[#D4A836] hover:bg-[#D4A836]/10"
              data-testid="seed-demo-btn"
            >
              <Zap className="w-4 h-4 mr-2" />
              Seed Demo Pages
            </Button>
            <Button 
              onClick={() => setView('create')}
              className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Page
            </Button>
          </div>
        </div>

        {/* Tiles Grid */}
        {tiles.length === 0 ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-8 text-center">
              <LayoutGrid className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Pages Yet</h3>
              <p className="text-gray-400 mb-4">Create your first page to get started</p>
              <Button 
                onClick={() => setView('create')}
                className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map(tile => {
              const IconComp = getIconComponent(tile.icon);
              return (
                <Card key={tile.tile_id} className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#D4A836]/10">
                          <IconComp className="w-5 h-5 text-[#D4A836]" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{tile.name}</h3>
                          <p className="text-xs text-gray-500">/{tile.slug}</p>
                        </div>
                      </div>
                      <Badge variant={tile.published ? "default" : "secondary"} className={tile.published ? "bg-green-500/20 text-green-400" : ""}>
                        {tile.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    
                    {tile.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{tile.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-[#30363D]">
                      <span className="text-xs text-gray-500 capitalize">{tile.route_type}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePublish(tile)}
                          className="h-8 w-8 p-0"
                          title={tile.published ? 'Unpublish' : 'Publish'}
                        >
                          {tile.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingTile(tile); setView('edit'); }}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTile(tile.tile_id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
