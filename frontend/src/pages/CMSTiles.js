import React, { useState, useEffect, useCallback, memo } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
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
  ExternalLink, Settings, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
};

// TileForm component - uses local state to prevent focus loss on parent re-renders
const TileForm = ({ data, setData, isEdit = false }) => {
  // Local state for form fields to prevent focus loss
  const [localData, setLocalData] = useState(data);
  
  // Sync local state when parent data changes (e.g., when dialog opens)
  useEffect(() => {
    setLocalData(data);
  }, [data.tile_id]); // Only sync when tile_id changes (new tile selected)
  
  const handleLocalChange = (field, value) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    // Debounce update to parent to prevent re-renders
    setData(newData);
  };
  
  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tile Name *</Label>
          <Input
            value={localData.name || ''}
            onChange={(e) => handleLocalChange('name', e.target.value)}
            placeholder="e.g., Contact Us"
            className="bg-[#0D1117] border-[#30363D]"
            autoComplete="off"
            data-testid="tile-name-input"
          />
        </div>
        <div className="space-y-2">
          <Label>URL Slug</Label>
          <Input
            value={localData.slug || ''}
            onChange={(e) => handleLocalChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="e.g., contact-us (auto-generated if empty)"
            className="bg-[#0D1117] border-[#30363D]"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select value={localData.icon} onValueChange={(v) => handleLocalChange('icon', v)}>
            <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
              <SelectValue placeholder="Select icon" />
            </SelectTrigger>
            <SelectContent className="bg-[#161B22] border-[#30363D]">
              {Object.keys(ICON_OPTIONS).map(icon => {
                const IconComp = ICON_OPTIONS[icon];
                return (
                  <SelectItem key={icon} value={icon}>
                    <div className="flex items-center gap-2">
                      <IconComp className="w-4 h-4" />
                      {icon}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Route Type</Label>
          <Select value={localData.route_type} onValueChange={(v) => handleLocalChange('route_type', v)}>
            <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-[#161B22] border-[#30363D]">
              <SelectItem value="internal">Internal Page</SelectItem>
              <SelectItem value="custom">Custom Content</SelectItem>
              <SelectItem value="external">External Link</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Brief description of the page"
          className="bg-[#0D1117] border-[#30363D]"
          autoComplete="off"
        />
      </div>

      {data.route_type === 'external' && (
        <div className="space-y-2">
          <Label>External URL</Label>
          <Input
            value={data.external_url || ''}
            onChange={(e) => handleChange('external_url', e.target.value)}
            placeholder="https://example.com"
            className="bg-[#0D1117] border-[#30363D]"
            autoComplete="off"
          />
        </div>
      )}

      {data.route_type === 'custom' && (
        <div className="space-y-2">
          <Label>Custom Page Content (HTML)</Label>
          <Textarea
            value={data.custom_content || ''}
            onChange={(e) => handleChange('custom_content', e.target.value)}
            placeholder="<div>Your custom page content...</div>"
            className="bg-[#0D1117] border-[#30363D] min-h-[150px] font-mono text-sm"
          />
        </div>
      )}

      <div className="flex items-center justify-between p-3 bg-[#0D1117] rounded-lg border border-[#30363D]">
        <div>
          <Label>Published</Label>
          <p className="text-xs text-gray-500">Show this tile in navigation</p>
        </div>
        <Switch
          checked={data.published}
          onCheckedChange={(checked) => handleChange('published', checked)}
        />
      </div>
    </div>
  );
});

TileForm.displayName = 'TileForm';

export default function CMSTiles() {
  const { token } = useAuth();
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTile, setEditingTile] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [newTile, setNewTile] = useState({
    name: '',
    slug: '',
    icon: 'FileText',
    description: '',
    published: true,
    route_type: 'custom',
    external_url: '',
    custom_content: ''
  });

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

  const createTile = async () => {
    if (!newTile.name) {
      toast.error('Please enter a tile name');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/cms-tiles`, newTile, { headers });
      toast.success('Tile created successfully');
      setShowCreate(false);
      setNewTile({
        name: '', slug: '', icon: 'FileText', description: '',
        published: true, route_type: 'custom', external_url: '', custom_content: ''
      });
      fetchTiles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create tile');
    } finally {
      setSaving(false);
    }
  };

  const updateTile = async () => {
    if (!editingTile?.name) {
      toast.error('Please enter a tile name');
      return;
    }
    
    setSaving(true);
    try {
      await axios.patch(`${API}/cms-tiles/${editingTile.tile_id}`, editingTile, { headers });
      toast.success('Tile updated successfully');
      setShowEdit(false);
      setEditingTile(null);
      fetchTiles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update tile');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (tile) => {
    try {
      await axios.patch(`${API}/cms-tiles/${tile.tile_id}/publish`, {}, { headers });
      toast.success(`Tile ${tile.published ? 'unpublished' : 'published'}`);
      fetchTiles();
    } catch (err) {
      toast.error('Failed to update tile');
    }
  };

  const deleteTile = async (tileId) => {
    if (!window.confirm('Are you sure you want to delete this tile?')) return;
    
    try {
      await axios.delete(`${API}/cms-tiles/${tileId}`, { headers });
      toast.success('Tile deleted');
      fetchTiles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete tile');
    }
  };

  const getIconComponent = (iconName) => {
    return ICON_OPTIONS[iconName] || FileText;
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="cms-tiles-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
              <LayoutGrid className="w-8 h-8 text-[#D4A836]" />
              CMS Tiles Manager
            </h1>
            <p className="text-gray-400">
              Manage your website pages and navigation tiles
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Tile
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="bg-[#D4A836]/10 border-[#D4A836]/30 mb-8">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#D4A836] mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#E8DDB5] mb-1">Navigation Management</h3>
                <p className="text-sm text-gray-400">
                  Tiles appear in the main navigation. Unpublished tiles are hidden from visitors but can still be accessed by admins.
                  URLs are automatically generated as /{'{slug}'} (e.g., /contact-us).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((tile) => {
              const IconComp = getIconComponent(tile.icon);
              return (
                <Card 
                  key={tile.tile_id}
                  className={`bg-[#161B22] border-[#30363D] transition-colors ${
                    tile.published ? 'hover:border-[#D4A836]/50' : 'opacity-60'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#D4A836]/10 flex items-center justify-center">
                          <IconComp className="w-5 h-5 text-[#D4A836]" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-[#E8DDB5]">{tile.name}</CardTitle>
                          <p className="text-xs text-gray-500">/{tile.slug}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {tile.is_system && (
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs">System</Badge>
                        )}
                        {tile.published ? (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Live
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/20 text-gray-400 text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {tile.description || `${tile.route_type} page`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-[#30363D]"
                        onClick={() => {
                          setEditingTile(tile);
                          setShowEdit(true);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-[#30363D] ${tile.published ? 'text-yellow-400' : 'text-green-400'}`}
                        onClick={() => togglePublish(tile)}
                      >
                        {tile.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      {!tile.is_system && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => deleteTile(tile.tile_id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Tile Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D4A836]" />
              Create New Tile
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new page or navigation item to your website
            </DialogDescription>
          </DialogHeader>
          
          <TileForm data={newTile} setData={setNewTile} />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#30363D]">
              Cancel
            </Button>
            <Button onClick={createTile} className="bg-[#D4A836] hover:bg-[#B8922E] text-black" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Tile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tile Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#D4A836]" />
              Edit Tile
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify the tile settings and content
            </DialogDescription>
          </DialogHeader>
          
          {editingTile && (
            <TileForm data={editingTile} setData={setEditingTile} isEdit />
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="border-[#30363D]">
              Cancel
            </Button>
            <Button onClick={updateTile} className="bg-[#D4A836] hover:bg-[#B8922E] text-black" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
