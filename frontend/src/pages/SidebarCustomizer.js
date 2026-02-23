import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { 
  Save, Loader2, Plus, Trash2, GripVertical, Image, Link2, 
  Type, MousePointer, ExternalLink, RotateCcw, Eye, Newspaper, BookOpen, Video, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SECTION_TYPES = [
  { value: 'cta', label: 'Call to Action', icon: MousePointer, description: 'Button with title and description' },
  { value: 'links', label: 'Quick Links', icon: Link2, description: 'List of navigation links' },
  { value: 'image', label: 'Image/Banner', icon: Image, description: 'Display an image or banner' },
  { value: 'html', label: 'Custom HTML', icon: Type, description: 'Custom HTML content' }
];

const PAGE_ICONS = {
  news: Newspaper,
  blog: BookOpen,
  videos: Video,
  about: Info
};

export default function SidebarCustomizer() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePage, setActivePage] = useState('news');
  const [configs, setConfigs] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${API}/sidebar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfigs(response.data);
    } catch (error) {
      toast.error('Failed to load sidebar configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (page) => {
    setSaving(true);
    try {
      await axios.post(`${API}/sidebar/${page}`, configs[page], {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${page.charAt(0).toUpperCase() + page.slice(1)} sidebar saved`);
    } catch (error) {
      toast.error('Failed to save sidebar');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (page) => {
    if (!window.confirm(`Reset ${page} sidebar to defaults?`)) return;
    
    try {
      await axios.delete(`${API}/sidebar/${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sidebar reset to defaults');
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to reset sidebar');
    }
  };

  const updateConfig = (page, updates) => {
    setConfigs(prev => ({
      ...prev,
      [page]: { ...prev[page], ...updates }
    }));
  };

  const addSection = (page, type) => {
    const newSection = {
      section_type: type,
      title: type === 'cta' ? 'New CTA' : type === 'links' ? 'Quick Links' : '',
      description: '',
      button_text: type === 'cta' ? 'Click Here' : '',
      button_url: type === 'cta' ? '/auth' : '',
      image_url: '',
      image_alt: '',
      links: type === 'links' ? [{ label: 'New Link', url: '/', is_external: false }] : [],
      html_content: '',
      order: configs[page]?.sections?.length || 0
    };
    
    updateConfig(page, {
      sections: [...(configs[page]?.sections || []), newSection]
    });
  };

  const updateSection = (page, index, updates) => {
    const sections = [...(configs[page]?.sections || [])];
    sections[index] = { ...sections[index], ...updates };
    updateConfig(page, { sections });
  };

  const removeSection = (page, index) => {
    const sections = [...(configs[page]?.sections || [])];
    sections.splice(index, 1);
    updateConfig(page, { sections });
  };

  const moveSection = (page, index, direction) => {
    const sections = [...(configs[page]?.sections || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    updateConfig(page, { sections });
  };

  const addLink = (page, sectionIndex) => {
    const sections = [...(configs[page]?.sections || [])];
    sections[sectionIndex].links = [
      ...(sections[sectionIndex].links || []),
      { label: 'New Link', url: '/', is_external: false }
    ];
    updateConfig(page, { sections });
  };

  const updateLink = (page, sectionIndex, linkIndex, updates) => {
    const sections = [...(configs[page]?.sections || [])];
    sections[sectionIndex].links[linkIndex] = {
      ...sections[sectionIndex].links[linkIndex],
      ...updates
    };
    updateConfig(page, { sections });
  };

  const removeLink = (page, sectionIndex, linkIndex) => {
    const sections = [...(configs[page]?.sections || [])];
    sections[sectionIndex].links.splice(linkIndex, 1);
    updateConfig(page, { sections });
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

  const currentConfig = configs[activePage] || { enabled: true, sections: [] };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="sidebar-customizer-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Sidebar Customizer
            </h1>
            <p className="text-gray-400 mt-1">Customize sidebars for each public page</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleReset(activePage)}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
            <Button
              onClick={() => handleSave(activePage)}
              disabled={saving}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs value={activePage} onValueChange={setActivePage} className="space-y-6">
          <TabsList className="bg-[#1a1a24] border border-[#D4A836]/20">
            {['news', 'blog', 'videos', 'about'].map(page => {
              const Icon = PAGE_ICONS[page];
              return (
                <TabsTrigger key={page} value={page} className="data-[state=active]:bg-[#D4A836]/20 capitalize">
                  <Icon className="w-4 h-4 mr-2" />
                  {page}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {['news', 'blog', 'videos', 'about'].map(page => (
            <TabsContent key={page} value={page} className="space-y-6">
              {/* Enable/Disable Sidebar */}
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[#E8DDB5]">Enable Sidebar</Label>
                      <p className="text-sm text-gray-500">Show sidebar on the {page} page</p>
                    </div>
                    <Switch
                      checked={configs[page]?.enabled !== false}
                      onCheckedChange={(checked) => updateConfig(page, { enabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Add Section Buttons */}
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardHeader>
                  <CardTitle className="text-[#E8DDB5]">Add Section</CardTitle>
                  <CardDescription>Choose a section type to add to the sidebar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SECTION_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => addSection(page, type.value)}
                        className="p-4 bg-[#1a1a24] border border-[#D4A836]/20 rounded-lg hover:border-[#D4A836]/50 transition-colors text-left"
                      >
                        <type.icon className="w-5 h-5 text-[#D4A836] mb-2" />
                        <p className="text-sm font-medium text-[#E8DDB5]">{type.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sections List */}
              <div className="space-y-4">
                {(configs[page]?.sections || []).map((section, index) => (
                  <Card key={index} className="bg-[#0f0f15] border-[#D4A836]/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveSection(page, index, -1)}
                              disabled={index === 0}
                              className="p-1 text-gray-500 hover:text-[#D4A836] disabled:opacity-30"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveSection(page, index, 1)}
                              disabled={index === (configs[page]?.sections?.length || 0) - 1}
                              className="p-1 text-gray-500 hover:text-[#D4A836] disabled:opacity-30"
                            >
                              ▼
                            </button>
                          </div>
                          <div>
                            <CardTitle className="text-[#E8DDB5] text-base">
                              {SECTION_TYPES.find(t => t.value === section.section_type)?.label || 'Section'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {section.title || 'No title'}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(page, index)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* CTA Section */}
                      {section.section_type === 'cta' && (
                        <>
                          <div>
                            <Label className="text-gray-400">Title</Label>
                            <Input
                              value={section.title || ''}
                              onChange={(e) => updateSection(page, index, { title: e.target.value })}
                              className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-400">Description</Label>
                            <Textarea
                              value={section.description || ''}
                              onChange={(e) => updateSection(page, index, { description: e.target.value })}
                              className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-gray-400">Button Text</Label>
                              <Input
                                value={section.button_text || ''}
                                onChange={(e) => updateSection(page, index, { button_text: e.target.value })}
                                className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-400">Button URL</Label>
                              <Input
                                value={section.button_url || ''}
                                onChange={(e) => updateSection(page, index, { button_url: e.target.value })}
                                className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                                placeholder="/auth or https://..."
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Links Section */}
                      {section.section_type === 'links' && (
                        <>
                          <div>
                            <Label className="text-gray-400">Section Title</Label>
                            <Input
                              value={section.title || ''}
                              onChange={(e) => updateSection(page, index, { title: e.target.value })}
                              className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-400">Links</Label>
                            {(section.links || []).map((link, linkIndex) => (
                              <div key={linkIndex} className="flex items-center gap-2">
                                <Input
                                  value={link.label}
                                  onChange={(e) => updateLink(page, index, linkIndex, { label: e.target.value })}
                                  placeholder="Link text"
                                  className="bg-[#1a1a24] border-[#D4A836]/30 flex-1"
                                />
                                <Input
                                  value={link.url}
                                  onChange={(e) => updateLink(page, index, linkIndex, { url: e.target.value })}
                                  placeholder="/page or https://..."
                                  className="bg-[#1a1a24] border-[#D4A836]/30 flex-1"
                                />
                                <button
                                  onClick={() => updateLink(page, index, linkIndex, { is_external: !link.is_external })}
                                  className={`p-2 rounded ${link.is_external ? 'text-[#D4A836]' : 'text-gray-500'}`}
                                  title={link.is_external ? 'External link' : 'Internal link'}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeLink(page, index, linkIndex)}
                                  className="p-2 text-red-500 hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addLink(page, index)}
                              className="border-[#D4A836]/30 text-[#E8DDB5] mt-2"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Link
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Image Section */}
                      {section.section_type === 'image' && (
                        <>
                          <div>
                            <Label className="text-gray-400">Image URL</Label>
                            <Input
                              value={section.image_url || ''}
                              onChange={(e) => updateSection(page, index, { image_url: e.target.value })}
                              className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                              placeholder="https://... or paste from Media Library"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-400">Alt Text</Label>
                            <Input
                              value={section.image_alt || ''}
                              onChange={(e) => updateSection(page, index, { image_alt: e.target.value })}
                              className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                              placeholder="Describe the image"
                            />
                          </div>
                          {section.image_url && (
                            <div className="mt-2 p-2 bg-[#1a1a24] rounded-lg">
                              <img 
                                src={section.image_url} 
                                alt={section.image_alt || 'Preview'} 
                                className="max-h-32 rounded"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* HTML Section */}
                      {section.section_type === 'html' && (
                        <>
                          <div>
                            <Label className="text-gray-400">Title (optional)</Label>
                            <Input
                              value={section.title || ''}
                              onChange={(e) => updateSection(page, index, { title: e.target.value })}
                              className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-400">HTML Content</Label>
                            <Textarea
                              value={section.html_content || ''}
                              onChange={(e) => updateSection(page, index, { html_content: e.target.value })}
                              className="bg-[#1a1a24] border-[#D4A836]/30 mt-1 font-mono text-sm"
                              rows={5}
                              placeholder="<p>Your custom HTML here...</p>"
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {(configs[page]?.sections || []).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>No sections added yet. Click a button above to add content.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
