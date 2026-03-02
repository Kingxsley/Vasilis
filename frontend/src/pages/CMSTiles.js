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

// TipTap Editor imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapImage from '@tiptap/extension-image';
import TipTapLink from '@tiptap/extension-link';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Page Type Definitions with visual configuration
const PAGE_TYPES = [
  {
    id: 'custom',
    name: 'Custom Content',
    description: 'Create your own content with the visual editor',
    icon: FileText,
    color: '#D4A836',
    hasEditor: true
  },
  {
    id: 'contact_form',
    name: 'Contact Form',
    description: 'Contact form with name, email, phone, and message fields',
    icon: Mail,
    color: '#4CAF50',
    hasEditor: false
  },
  {
    id: 'events',
    name: 'Events Calendar',
    description: 'Display your events with RSVP functionality',
    icon: Calendar,
    color: '#2196F3',
    hasEditor: false
  },
  {
    id: 'team',
    name: 'Team Members',
    description: 'Showcase your team with photos and bios',
    icon: Users,
    color: '#9C27B0',
    hasEditor: false
  },
  {
    id: 'services',
    name: 'Services',
    description: 'Display your services or offerings',
    icon: Briefcase,
    color: '#FF9800',
    hasEditor: false
  },
  {
    id: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions with accordion',
    icon: HelpCircle,
    color: '#00BCD4',
    hasEditor: false
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'Customer reviews and testimonials',
    icon: MessageSquare,
    color: '#E91E63',
    hasEditor: false
  },
  {
    id: 'pricing',
    name: 'Pricing',
    description: 'Pricing plans and comparison table',
    icon: DollarSign,
    color: '#8BC34A',
    hasEditor: false
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Image gallery with lightbox',
    icon: ImageIcon,
    color: '#FF5722',
    hasEditor: false
  },
  {
    id: 'features',
    name: 'Features',
    description: 'Highlight features with icons and descriptions',
    icon: Zap,
    color: '#673AB7',
    hasEditor: false
  },
  {
    id: 'internal',
    name: 'Internal Link',
    description: 'Link to an existing page in your app',
    icon: Link,
    color: '#607D8B',
    hasEditor: false
  },
  {
    id: 'external',
    name: 'External Link',
    description: 'Redirect to an external website',
    icon: ExternalLink,
    color: '#795548',
    hasEditor: false
  }
];

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

// Visual Editor Toolbar
const EditorToolbar = ({ editor }) => {
  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-[#30363D] bg-[#0D1117] rounded-t-lg">
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="h-8 w-8 p-0"
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="h-8 w-8 p-0"
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>
      <div className="w-px bg-[#30363D] mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className="h-8 px-2"
        title="Heading 1"
      >
        H1
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className="h-8 px-2"
        title="Heading 2"
      >
        H2
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className="h-8 px-2"
        title="Heading 3"
      >
        H3
      </Button>
      <div className="w-px bg-[#30363D] mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-8 w-8 p-0"
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-8 w-8 p-0"
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </Button>
      <div className="w-px bg-[#30363D] mx-1" />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={addImage}
        className="h-8 w-8 p-0"
        title="Insert Image"
      >
        <ImageIcon className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('link') ? 'default' : 'ghost'}
        onClick={addLink}
        className="h-8 w-8 p-0"
        title="Insert Link"
      >
        <Link className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className="h-8 w-8 p-0"
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Visual Editor Component
const VisualEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapImage,
      TipTapLink.configure({ openOnClick: false }),
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[200px] p-4 focus:outline-none text-white',
      },
    },
  });

  return (
    <div className="border border-[#30363D] rounded-lg overflow-hidden bg-[#161B22]">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="min-h-[200px]" />
    </div>
  );
};

// Separate TileFormPage component for editing/creating
function TileFormPage({ tile, onSave, onCancel, saving }) {
  const [name, setName] = useState(tile?.name || '');
  const [slug, setSlug] = useState(tile?.slug || '');
  const [description, setDescription] = useState(tile?.description || '');
  const [icon, setIcon] = useState(tile?.icon || 'FileText');
  const [routeType, setRouteType] = useState(tile?.route_type || 'custom');
  const [externalUrl, setExternalUrl] = useState(tile?.external_url || '');
  const [customContent, setCustomContent] = useState(tile?.custom_content || '<p>Enter your content here...</p>');
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

        {/* Right Column - Page Type & Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Page Type Selector */}
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D4A836]" />
                Page Type
              </CardTitle>
              <CardDescription>
                Choose what type of content this page will display
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {PAGE_TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  const isSelected = routeType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setRouteType(type.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected 
                          ? 'border-[#D4A836] bg-[#D4A836]/10' 
                          : 'border-[#30363D] bg-[#0D1117] hover:border-[#D4A836]/50'
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        <TypeIcon className="w-4 h-4" style={{ color: type.color }} />
                      </div>
                      <h4 className="font-medium text-sm text-white">{type.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content Editor - Only for custom type */}
          {routeType === 'custom' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#D4A836]" />
                  Page Content
                </CardTitle>
                <CardDescription>
                  Use the visual editor to create your page content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VisualEditor 
                  content={customContent} 
                  onChange={setCustomContent} 
                />
              </CardContent>
            </Card>
          )}

          {/* Page Type Previews */}
          {routeType === 'contact_form' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-500/20">
                    <Mail className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Contact Form Preview</h3>
                    <p className="text-gray-400 mb-4">
                      This page will display a professional contact form with the following fields:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Name (required)</li>
                      <li>• Email (required)</li>
                      <li>• Phone number</li>
                      <li>• Organization</li>
                      <li>• Subject</li>
                      <li>• Message (required)</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-4">
                      Submissions appear in Forms → Contact Submissions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'events' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-500/20">
                    <Calendar className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Events Calendar Preview</h3>
                    <p className="text-gray-400 mb-4">
                      This page will display your upcoming events with:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Event cards with images</li>
                      <li>• Date and time display</li>
                      <li>• Location information</li>
                      <li>• RSVP functionality</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-4">
                      Manage events in Events section
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'team' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-500/20">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Team Members Page</h3>
                    <p className="text-gray-400 mb-4">
                      Showcase your team with professional profiles including:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Profile photos</li>
                      <li>• Names and titles</li>
                      <li>• Short bios</li>
                      <li>• Social media links</li>
                    </ul>
                    <p className="text-xs text-yellow-500 mt-4">
                      Coming soon - Team management will be in a dedicated section
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'services' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-500/20">
                    <Briefcase className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Services Page</h3>
                    <p className="text-gray-400 mb-4">
                      Display your services or offerings with:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Service icons</li>
                      <li>• Titles and descriptions</li>
                      <li>• Feature lists</li>
                      <li>• Call-to-action buttons</li>
                    </ul>
                    <p className="text-xs text-yellow-500 mt-4">
                      Coming soon - Services management will be in a dedicated section
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'faq' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-cyan-500/20">
                    <HelpCircle className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">FAQ Page</h3>
                    <p className="text-gray-400 mb-4">
                      Display frequently asked questions with:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Expandable accordion sections</li>
                      <li>• Category organization</li>
                      <li>• Search functionality</li>
                    </ul>
                    <p className="text-xs text-yellow-500 mt-4">
                      Coming soon - FAQ management will be in a dedicated section
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'testimonials' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-pink-500/20">
                    <MessageSquare className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Testimonials Page</h3>
                    <p className="text-gray-400 mb-4">
                      Showcase customer testimonials with:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Customer photos</li>
                      <li>• Star ratings</li>
                      <li>• Review text</li>
                      <li>• Company/role info</li>
                    </ul>
                    <p className="text-xs text-yellow-500 mt-4">
                      Coming soon - Testimonials management will be in a dedicated section
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'pricing' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-lime-500/20">
                    <DollarSign className="w-6 h-6 text-lime-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Pricing Page</h3>
                    <p className="text-gray-400 mb-4">
                      Display your pricing plans with:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Plan comparison cards</li>
                      <li>• Feature checklists</li>
                      <li>• Highlighted popular plan</li>
                      <li>• CTA buttons</li>
                    </ul>
                    <p className="text-xs text-yellow-500 mt-4">
                      Coming soon - Pricing management will be in a dedicated section
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'gallery' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-500/20">
                    <ImageIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Gallery Page</h3>
                    <p className="text-gray-400 mb-4">
                      Display an image gallery with:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Masonry grid layout</li>
                      <li>• Lightbox preview</li>
                      <li>• Category filters</li>
                      <li>• Image captions</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-4">
                      Images managed in Media Library
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'features' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-violet-500/20">
                    <Zap className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Features Page</h3>
                    <p className="text-gray-400 mb-4">
                      Highlight product/service features with:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Feature cards with icons</li>
                      <li>• Descriptions</li>
                      <li>• Visual layout options</li>
                    </ul>
                    <p className="text-xs text-yellow-500 mt-4">
                      Coming soon - Features management will be in a dedicated section
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {routeType === 'internal' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8 text-center">
                <Link className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Internal Link</h3>
                <p className="text-gray-400">
                  This navigation item will link to an existing page in your app.
                  <br />
                  Configure the slug to match the route (e.g., "blog", "videos").
                </p>
              </CardContent>
            </Card>
          )}

          {routeType === 'external' && (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8 text-center">
                <ExternalLink className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">External Link</h3>
                <p className="text-gray-400">
                  This navigation item will redirect users to another website.
                  <br />
                  Enter the full URL including https:// above.
                </p>
              </CardContent>
            </Card>
          )}
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
          <Button 
            onClick={() => setView('create')}
            className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </Button>
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
