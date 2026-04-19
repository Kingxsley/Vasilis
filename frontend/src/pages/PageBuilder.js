import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Plus, Edit, Trash2, Loader2, Eye, EyeOff, FileText, Layout, 
  Type, Image, Mail, Calendar, LayoutGrid, Minus, MousePointerClick,
  GripVertical, ArrowUp, ArrowDown, ExternalLink, Save, X, Globe,
  Smartphone, Tablet, Monitor, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BLOCK_ICONS = {
  heading: Type,
  text: FileText,
  button: MousePointerClick,
  image: Image,
  divider: Minus,
  hero: Layout,
  contact_form: Mail,
  event_registration: Calendar,
  cards: LayoutGrid,
};

// ============================================================================
// Phase 2 helpers — visibility note + live preview renderer
// ============================================================================

function publicSelectedNote(levels) {
  const l = levels || [];
  if (l.includes('public')) {
    return (
      <p className="text-xs text-gray-500 mt-2">
        <Globe className="w-3 h-3 inline mr-1" />
        This page is <span className="text-[#D4A836]">public</span> — anyone can view it, no login required.
      </p>
    );
  }
  if (l.length === 0) {
    return (
      <p className="text-xs text-red-400 mt-2">
        Select at least one visibility level (defaults to Public).
      </p>
    );
  }
  const labels = {
    user: 'Any logged-in user',
    trainee: 'Trainee',
    org_admin: 'Org admin',
    super_admin: 'Super admin',
  };
  const joined = l.map(x => labels[x] || x).join(', ');
  return (
    <p className="text-xs text-gray-500 mt-2">
      <Lock className="w-3 h-3 inline mr-1" />
      Visible to: <span className="text-[#D4A836]">{joined}</span>
    </p>
  );
}

/**
 * Minimal live-preview renderer for the device-preview pane. Renders each
 * content block with basic styling so the admin can gauge layout at each
 * device width. Does NOT attempt pixel-perfect parity with the public page —
 * that would require a real iframe preview endpoint.
 */
function renderPagePreview(pageForm) {
  if (!pageForm) return null;
  if (!pageForm.blocks || pageForm.blocks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">
        <p className="mb-1">Preview</p>
        <p>No content blocks yet. Add blocks to see them rendered here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {pageForm.title && (
        <h1 className="text-2xl font-bold text-[#E8DDB5] break-words">{pageForm.title}</h1>
      )}
      {pageForm.description && (
        <p className="text-gray-400 text-sm break-words">{pageForm.description}</p>
      )}
      {pageForm.blocks.map((block, idx) => {
        const c = block.content || {};
        switch (block.type) {
          case 'heading':
            return <h2 key={idx} className="text-xl font-semibold text-[#E8DDB5] break-words">{c.text || 'Heading'}</h2>;
          case 'text':
            return <p key={idx} className="text-gray-300 text-sm break-words whitespace-pre-wrap">{c.text || 'Paragraph text...'}</p>;
          case 'button':
            return (
              <div key={idx}>
                <span className="inline-block bg-[#D4A836] text-black text-sm font-medium px-4 py-2 rounded">
                  {c.text || 'Button'}
                </span>
              </div>
            );
          case 'image':
            return c.url ? (
              <img key={idx} src={c.url} alt={c.alt || ''} className="max-w-full h-auto rounded" />
            ) : (
              <div key={idx} className="bg-[#1a1a24] border border-dashed border-[#30363D] rounded h-32 flex items-center justify-center text-gray-600 text-xs">
                Image placeholder
              </div>
            );
          case 'divider':
            return <hr key={idx} className="border-[#30363D]" />;
          case 'hero':
            return (
              <div key={idx} className="bg-gradient-to-br from-[#1a1a24] to-[#0f0f15] border border-[#30363D] rounded-md p-6 text-center">
                <h2 className="text-xl font-bold text-[#E8DDB5] break-words">{c.title || 'Hero title'}</h2>
                {c.subtitle && <p className="text-gray-400 mt-2 break-words">{c.subtitle}</p>}
                {c.cta_text && (
                  <span className="inline-block bg-[#D4A836] text-black text-sm font-medium px-4 py-2 rounded mt-3">
                    {c.cta_text}
                  </span>
                )}
              </div>
            );
          case 'cards':
            return (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(c.items || [{}, {}, {}]).slice(0, 6).map((it, i) => (
                  <div key={i} className="bg-[#1a1a24] border border-[#30363D] rounded p-3">
                    <div className="font-medium text-[#E8DDB5] text-sm break-words">{it.title || `Card ${i + 1}`}</div>
                    <div className="text-gray-400 text-xs mt-1 break-words">{it.description || 'Short description'}</div>
                  </div>
                ))}
              </div>
            );
          case 'contact_form':
            return (
              <div key={idx} className="bg-[#1a1a24] border border-[#30363D] rounded p-3 text-xs text-gray-500">
                📧 Contact form placeholder ({Array.isArray(c.fields) ? c.fields.length : 4} fields)
              </div>
            );
          case 'event_registration':
            return (
              <div key={idx} className="bg-[#1a1a24] border border-[#30363D] rounded p-3 text-xs text-gray-500">
                📅 Event registration placeholder
              </div>
            );
          default:
            return (
              <div key={idx} className="bg-[#1a1a24] border border-dashed border-[#30363D] rounded p-2 text-xs text-gray-600">
                {block.type} block
              </div>
            );
        }
      })}
    </div>
  );
}

export default function PageBuilder() {
  const { token, user } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockTemplates, setBlockTemplates] = useState([]);
  
  // Dialog states
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editingBlockIndex, setEditingBlockIndex] = useState(null);
  
  // Sidebar widgets (Phase 2)
  const [sidebarConfigs, setSidebarConfigs] = useState([]);
  const [availableWidgets, setAvailableWidgets] = useState([]);
  const [showSidebarDialog, setShowSidebarDialog] = useState(false);
  
  // Form states
  const [pageForm, setPageForm] = useState({
    title: '',
    slug: '',
    description: '',
    page_type: 'custom',
    blocks: [],
    show_in_nav: false,
    nav_section: 'main',
    is_published: false,
    auth_levels: ['public'],
    sidebar_config: null  // Phase 2: sidebar config slug
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (pageForm.title && !editingPage) {
      const slug = pageForm.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .substring(0, 100);
      setPageForm(prev => ({ ...prev, slug }));
    }
  }, [pageForm.title, editingPage]);

  // Phase 2: device preview mode (mobile/tablet/desktop).
  const [devicePreview, setDevicePreview] = useState('desktop');
  
  const [blockForm, setBlockForm] = useState({
    type: 'text',
    content: {}
  });

  useEffect(() => {
    fetchPages();
    fetchBlockTemplates();
    fetchSidebarConfigs();
    fetchAvailableWidgets();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await axios.get(`${API}/pages/custom?include_unpublished=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPages(res.data.pages || []);
    } catch (error) {
      console.error('Failed to load pages:', error);
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockTemplates = async () => {
    try {
      const res = await axios.get(`${API}/pages/block-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Failed to load block templates:', error);
    }
  };

  const fetchSidebarConfigs = async () => {
    try {
      const res = await axios.get(`${API}/sidebar-configs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSidebarConfigs(res.data || []);
    } catch (error) {
      console.error('Failed to load sidebar configs:', error);
    }
  };

  const fetchAvailableWidgets = async () => {
    try {
      const res = await axios.get(`${API}/sidebar-widgets/defaults/list`);
      setAvailableWidgets(res.data.widgets || []);
    } catch (error) {
      console.error('Failed to load available widgets:', error);
    }
  };

  const resetPageForm = () => {
    setPageForm({
      title: '',
      slug: '',
      description: '',
      page_type: 'custom',
      blocks: [],
      show_in_nav: false,
      nav_section: 'main',
      is_published: false,
      auth_levels: ['public'],
      sidebar_config: null
    });
    setDevicePreview('desktop');
    setEditingPage(null);
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingPage) {
        await axios.patch(`${API}/pages/custom/${editingPage.page_id}`, pageForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Page updated successfully');
      } else {
        await axios.post(`${API}/pages/custom`, pageForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Page created successfully');
      }
      setShowPageDialog(false);
      resetPageForm();
      fetchPages();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPage = (page) => {
    setEditingPage(page);
    setPageForm({
      title: page.title,
      slug: page.slug,
      description: page.description || '',
      page_type: page.page_type || 'custom',
      blocks: page.blocks || [],
      show_in_nav: page.show_in_nav || false,
      nav_section: page.nav_section || 'main',
      is_published: page.is_published || false,
      auth_levels: Array.isArray(page.auth_levels) && page.auth_levels.length > 0
        ? page.auth_levels
        : ['public'],
      sidebar_config: page.sidebar_config || null
    });
    setDevicePreview('desktop');
    setShowPageDialog(true);
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm('Are you sure you want to delete this page?')) return;
    
    try {
      await axios.delete(`${API}/pages/custom/${pageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Page deleted');
      fetchPages();
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  const handleTogglePublish = async (page) => {
    try {
      await axios.patch(`${API}/pages/custom/${page.page_id}`, {
        is_published: !page.is_published
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(page.is_published ? 'Page unpublished' : 'Page published');
      fetchPages();
    } catch (error) {
      toast.error('Failed to update page');
    }
  };

  const openAddBlockDialog = () => {
    setBlockForm({ type: 'text', content: {} });
    setEditingBlock(null);
    setEditingBlockIndex(null);
    setShowBlockDialog(true);
  };

  const openEditBlockDialog = (block, index) => {
    setBlockForm({ type: block.type, content: block.content });
    setEditingBlock(block);
    setEditingBlockIndex(index);
    setShowBlockDialog(true);
  };

  const handleAddOrUpdateBlock = () => {
    const template = blockTemplates.find(t => t.type === blockForm.type);
    const newBlock = {
      block_id: editingBlock?.block_id || `block_${Date.now()}`,
      type: blockForm.type,
      content: { ...(template?.default_content || {}), ...blockForm.content },
      order: editingBlockIndex !== null ? editingBlockIndex : pageForm.blocks.length
    };

    if (editingBlockIndex !== null) {
      const newBlocks = [...pageForm.blocks];
      newBlocks[editingBlockIndex] = newBlock;
      setPageForm({ ...pageForm, blocks: newBlocks });
    } else {
      setPageForm({ ...pageForm, blocks: [...pageForm.blocks, newBlock] });
    }
    
    setShowBlockDialog(false);
  };

  const handleDeleteBlock = (index) => {
    const newBlocks = pageForm.blocks.filter((_, i) => i !== index);
    setPageForm({ ...pageForm, blocks: newBlocks });
  };

  const handleMoveBlock = (index, direction) => {
    const newBlocks = [...pageForm.blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setPageForm({ ...pageForm, blocks: newBlocks });
  };

  const getBlockIcon = (type) => {
    const IconComponent = BLOCK_ICONS[type] || FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  const renderBlockContentEditor = () => {
    const template = blockTemplates.find(t => t.type === blockForm.type);
    if (!template) return null;

    switch (blockForm.type) {
      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <Label>Heading Text</Label>
              <Input
                value={blockForm.content.text || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, text: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div>
              <Label>Level</Label>
              <Select 
                value={blockForm.content.level || 'h2'} 
                onValueChange={(v) => setBlockForm({ ...blockForm, content: { ...blockForm.content, level: v } })}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1 - Large</SelectItem>
                  <SelectItem value="h2">H2 - Medium</SelectItem>
                  <SelectItem value="h3">H3 - Small</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div>
            <Label>Text Content</Label>
            <Textarea
              value={blockForm.content.text || ''}
              onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, text: e.target.value } })}
              className="bg-[#1a1a24] border-[#30363D] text-white min-h-[150px]"
              placeholder="Enter your text content here..."
            />
          </div>
        );
      
      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label>Button Text</Label>
              <Input
                value={blockForm.content.text || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, text: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div>
              <Label>Button URL</Label>
              <Input
                value={blockForm.content.url || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, url: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
                placeholder="/contact or https://..."
              />
            </div>
            <div>
              <Label>Style</Label>
              <Select 
                value={blockForm.content.style || 'primary'} 
                onValueChange={(v) => setBlockForm({ ...blockForm, content: { ...blockForm.content, style: v } })}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (Gold)</SelectItem>
                  <SelectItem value="secondary">Secondary (Outline)</SelectItem>
                  <SelectItem value="ghost">Ghost (Text Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={blockForm.content.title || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, title: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Textarea
                value={blockForm.content.subtitle || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, subtitle: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Button Text</Label>
                <Input
                  value={blockForm.content.button_text || ''}
                  onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, button_text: e.target.value } })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
              <div>
                <Label>Button URL</Label>
                <Input
                  value={blockForm.content.button_url || ''}
                  onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, button_url: e.target.value } })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'contact_form':
        return (
          <div className="space-y-4">
            <div>
              <Label>Form Title</Label>
              <Input
                value={blockForm.content.title || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, title: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div>
              <Label>Submit Button Text</Label>
              <Input
                value={blockForm.content.submit_text || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, submit_text: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div>
              <Label>Success Message</Label>
              <Input
                value={blockForm.content.success_message || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, success_message: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
          </div>
        );

      case 'event_registration':
        return (
          <div className="space-y-4">
            <div>
              <Label>Event Name</Label>
              <Input
                value={blockForm.content.event_name || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, event_name: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Date</Label>
                <Input
                  type="datetime-local"
                  value={blockForm.content.event_date || ''}
                  onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, event_date: e.target.value } })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={blockForm.content.event_location || ''}
                  onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, event_location: e.target.value } })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
            </div>
            <div>
              <Label>Register Button Text</Label>
              <Input
                value={blockForm.content.button_text || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, button_text: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label>Image URL</Label>
              <Input
                value={blockForm.content.url || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, url: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Alt Text</Label>
              <Input
                value={blockForm.content.alt || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, alt: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div>
              <Label>Caption (optional)</Label>
              <Input
                value={blockForm.content.caption || ''}
                onChange={(e) => setBlockForm({ ...blockForm, content: { ...blockForm.content, caption: e.target.value } })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-400 text-sm">
            No additional configuration needed for this block type.
          </div>
        );
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
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Page Builder</h1>
            <p className="text-gray-400">Create and manage custom pages without code</p>
          </div>
          <Button 
            onClick={() => { resetPageForm(); setShowPageDialog(true); }}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            data-testid="create-page-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </Button>
        </div>

        {/* Pages List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : pages.length === 0 ? (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="py-16 text-center">
              <Layout className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No Custom Pages Yet</h3>
              <p className="text-gray-400 mb-6">Create your first page to get started</p>
              <Button 
                onClick={() => { resetPageForm(); setShowPageDialog(true); }}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => (
              <Card key={page.page_id} className="bg-[#0f0f15] border-[#D4A836]/20 hover:border-[#D4A836]/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-[#E8DDB5] text-lg">{page.title}</CardTitle>
                      <CardDescription className="text-gray-500 text-sm">
                        /{page.slug}
                      </CardDescription>
                    </div>
                    <Badge className={page.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {page.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{page.description}</p>
                  )}
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-xs border-[#D4A836]/30 text-[#D4A836]">
                      {page.page_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                      {page.blocks?.length || 0} blocks
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditPage(page)}
                      className="flex-1 border-[#D4A836]/30 text-[#E8DDB5] hover:bg-[#D4A836]/10"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePublish(page)}
                      className="text-gray-400 hover:text-[#E8DDB5]"
                    >
                      {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {page.is_published && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                        className="text-gray-400 hover:text-[#D4A836]"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePage(page.page_id)}
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

        {/* Page Editor Dialog */}
        <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
          <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingPage ? 'Edit Page' : 'Create New Page'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Build your page using content blocks
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreatePage} className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Page Title</Label>
                  <Input
                    value={pageForm.title}
                    onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                    placeholder="Contact Us"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-400">URL Slug</Label>
                  <div className="flex">
                    <span className="bg-[#2a2a34] border border-r-0 border-[#30363D] px-3 py-2 text-gray-500 rounded-l-md">/page/</span>
                    <Input
                      value={pageForm.slug}
                      onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="contact-us"
                      className="bg-[#1a1a24] border-[#30363D] text-white rounded-l-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Description (optional)</Label>
                <Textarea
                  value={pageForm.description}
                  onChange={(e) => setPageForm({ ...pageForm, description: e.target.value })}
                  placeholder="Brief description of the page..."
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-400">Page Type</Label>
                  <Select value={pageForm.page_type} onValueChange={(v) => setPageForm({ ...pageForm, page_type: v })}>
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Page</SelectItem>
                      <SelectItem value="landing">Landing Page</SelectItem>
                      <SelectItem value="home">Homepage</SelectItem>
                      <SelectItem value="contact">Contact Page</SelectItem>
                      <SelectItem value="about">About Page</SelectItem>
                      <SelectItem value="services">Services Page</SelectItem>
                      <SelectItem value="pricing">Pricing Page</SelectItem>
                      <SelectItem value="faq">FAQ Page</SelectItem>
                      <SelectItem value="testimonials">Testimonials</SelectItem>
                      <SelectItem value="team">Team Page</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="event">Event Page</SelectItem>
                      <SelectItem value="blog">Blog Page</SelectItem>
                      <SelectItem value="news">News Page</SelectItem>
                      <SelectItem value="case-study">Case Study</SelectItem>
                      <SelectItem value="product">Product Page</SelectItem>
                      <SelectItem value="careers">Careers</SelectItem>
                      <SelectItem value="press">Press/Media</SelectItem>
                      <SelectItem value="partners">Partners</SelectItem>
                      <SelectItem value="resources">Resources</SelectItem>
                      <SelectItem value="legal">Legal/Terms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageForm.show_in_nav}
                      onChange={(e) => setPageForm({ ...pageForm, show_in_nav: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-400">Show in Navigation</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageForm.is_published}
                      onChange={(e) => setPageForm({ ...pageForm, is_published: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-400">Publish Page</span>
                  </label>
                </div>
              </div>

              {/* Phase 2 — Visibility (multi-select auth levels) */}
              <div className="border-t border-[#30363D] pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-[#D4A836]" />
                  <Label className="text-[#E8DDB5] font-medium">Visibility</Label>
                  <span className="text-xs text-gray-500">
                    — select one or more roles who can view this page
                  </span>
                </div>
                {(() => {
                  const levels = [
                    { key: 'public',      label: 'Public',           hint: 'Anyone, no login required' },
                    { key: 'user',        label: 'Any logged-in',    hint: 'Any authenticated user' },
                    { key: 'trainee',     label: 'Trainee',          hint: 'Trainees only' },
                    { key: 'org_admin',   label: 'Org admin',        hint: 'Organization admins' },
                    { key: 'super_admin', label: 'Super admin',      hint: 'Super admins only' },
                  ];
                  const has = (k) => (pageForm.auth_levels || []).includes(k);
                  const publicSelected = has('public');

                  const toggle = (key) => {
                    let next;
                    if (key === 'public') {
                      // Public dominates — clicking it clears others; unclick
                      // leaves an empty list which falls back to ['public'].
                      next = has('public') ? [] : ['public'];
                    } else {
                      // Selecting a specific role removes 'public' implicitly.
                      const current = (pageForm.auth_levels || []).filter(x => x !== 'public');
                      if (current.includes(key)) {
                        next = current.filter(x => x !== key);
                      } else {
                        next = [...current, key];
                      }
                    }
                    if (next.length === 0) next = ['public'];
                    setPageForm({ ...pageForm, auth_levels: next });
                  };

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {levels.map((lvl) => {
                        const disabled = publicSelected && lvl.key !== 'public';
                        const active = has(lvl.key);
                        return (
                          <button
                            type="button"
                            key={lvl.key}
                            onClick={() => toggle(lvl.key)}
                            disabled={disabled}
                            title={lvl.hint}
                            className={[
                              'rounded-md border px-3 py-2 text-left transition text-sm',
                              active
                                ? 'bg-[#D4A836]/20 border-[#D4A836] text-[#E8DDB5]'
                                : 'bg-[#1a1a24] border-[#30363D] text-gray-400 hover:border-[#D4A836]/40',
                              disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-2">
                              <span className={[
                                'inline-block w-4 h-4 rounded border flex items-center justify-center',
                                active
                                  ? 'bg-[#D4A836] border-[#D4A836] text-black'
                                  : 'bg-transparent border-[#30363D]'
                              ].join(' ')}>
                                {active ? '✓' : ''}
                              </span>
                              <span className="font-medium">{lvl.label}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{lvl.hint}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
                {publicSelectedNote(pageForm.auth_levels)}
              </div>

              {/* Phase 2 — Sidebar Configuration Picker */}
              <div className="border-t border-[#30363D] pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutGrid className="w-4 h-4 text-[#D4A836]" />
                  <Label className="text-[#E8DDB5] font-medium">Page Sidebar</Label>
                  <span className="text-xs text-gray-500">
                    — select widgets to display in the right sidebar
                  </span>
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={pageForm.sidebar_config || "none"} 
                    onValueChange={(v) => setPageForm({ ...pageForm, sidebar_config: v === "none" ? null : v })}
                  >
                    <SelectTrigger className="flex-1 bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue placeholder="No sidebar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No sidebar</SelectItem>
                      {sidebarConfigs.map((config) => (
                        <SelectItem key={config.page_slug} value={config.page_slug}>
                          {config.page_slug} ({config.widgets?.length || 0} widgets)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSidebarDialog(true)}
                    className="border-[#D4A836]/30 text-[#D4A836] hover:bg-[#D4A836]/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Manage Sidebars
                  </Button>
                </div>
                {pageForm.sidebar_config && (
                  <p className="text-xs text-gray-500 mt-2">
                    Using sidebar: <span className="text-[#D4A836]">{pageForm.sidebar_config}</span>
                  </p>
                )}
              </div>

              {/* Phase 2 — Device preview toolbar */}
              <div className="border-t border-[#30363D] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[#E8DDB5] font-medium">Preview</Label>
                  <div className="inline-flex rounded-md border border-[#30363D] overflow-hidden">
                    {[
                      { key: 'mobile',  label: 'Mobile',  icon: Smartphone, width: 375 },
                      { key: 'tablet',  label: 'Tablet',  icon: Tablet,     width: 768 },
                      { key: 'desktop', label: 'Desktop', icon: Monitor,    width: 1440 },
                    ].map((d) => {
                      const Icon = d.icon;
                      const active = devicePreview === d.key;
                      return (
                        <button
                          type="button"
                          key={d.key}
                          onClick={() => setDevicePreview(d.key)}
                          className={[
                            'flex items-center gap-1.5 px-3 py-1.5 text-xs transition',
                            active
                              ? 'bg-[#D4A836] text-black'
                              : 'bg-[#1a1a24] text-gray-400 hover:text-[#E8DDB5]'
                          ].join(' ')}
                          title={`${d.label} (${d.width}px)`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-[#0a0a0f] border border-[#30363D] rounded-lg p-4 overflow-x-auto">
                  <div
                    className="mx-auto transition-all duration-200 bg-[#0f0f15] border border-[#30363D] rounded-md p-4"
                    style={{
                      width: devicePreview === 'mobile'
                        ? '375px'
                        : devicePreview === 'tablet'
                        ? '768px'
                        : '100%',
                      maxWidth: devicePreview === 'desktop' ? '1440px' : undefined,
                      minHeight: '200px'
                    }}
                  >
                    {renderPagePreview(pageForm)}
                  </div>
                </div>
              </div>

              {/* Content Blocks */}
              <div className="border-t border-[#30363D] pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[#E8DDB5] font-medium">Content Blocks</h3>
                    <p className="text-sm text-gray-500">Add and arrange content blocks</p>
                  </div>
                  <Button
                    type="button"
                    onClick={openAddBlockDialog}
                    variant="outline"
                    className="border-[#D4A836]/30 text-[#D4A836] hover:bg-[#D4A836]/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Block
                  </Button>
                </div>

                {pageForm.blocks.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#30363D] rounded-lg">
                    <p className="text-gray-500">No blocks added yet. Click "Add Block" to start building.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pageForm.blocks.map((block, index) => (
                      <div 
                        key={block.block_id || index} 
                        className="flex items-center gap-2 bg-[#1a1a24] border border-[#30363D] rounded-lg p-3"
                      >
                        <GripVertical className="w-4 h-4 text-gray-600" />
                        <div className="flex items-center gap-2 flex-1">
                          {getBlockIcon(block.type)}
                          <span className="text-[#E8DDB5] capitalize">{block.type.replace('_', ' ')}</span>
                          {block.content?.text && (
                            <span className="text-gray-500 text-sm truncate max-w-[200px]">
                              - {block.content.text.substring(0, 30)}...
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveBlock(index, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-[#E8DDB5] h-8 w-8 p-0"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveBlock(index, 'down')}
                            disabled={index === pageForm.blocks.length - 1}
                            className="text-gray-400 hover:text-[#E8DDB5] h-8 w-8 p-0"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditBlockDialog(block, index)}
                            className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBlock(index)}
                            className="text-gray-400 hover:text-red-400 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#30363D]">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPageDialog(false)}
                  className="border-[#30363D] text-gray-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingPage ? 'Update Page' : 'Create Page'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Block Editor Dialog */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingBlock ? 'Edit Block' : 'Add Block'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-gray-400">Block Type</Label>
                <Select 
                  value={blockForm.type} 
                  onValueChange={(v) => {
                    const template = blockTemplates.find(t => t.type === v);
                    setBlockForm({ 
                      type: v, 
                      content: template?.default_content || {} 
                    });
                  }}
                >
                  <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {blockTemplates.map((template) => (
                      <SelectItem key={template.type} value={template.type}>
                        <div className="flex items-center gap-2">
                          {getBlockIcon(template.type)}
                          <span>{template.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Block-specific content editor */}
              <div className="border-t border-[#30363D] pt-4">
                {renderBlockContentEditor()}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowBlockDialog(false)}
                  className="border-[#30363D] text-gray-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={handleAddOrUpdateBlock}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {editingBlock ? 'Update Block' : 'Add Block'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
