import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Edit, X,
  Type, Image as ImageIcon, FileText, Mail, Calendar, Video,
  LayoutGrid, Minus, Quote, List, Link, Users, MessageSquare,
  DollarSign, HelpCircle, Zap, Map, Clock, Star, Phone
} from 'lucide-react';

// Block type definitions
const BLOCK_TYPES = [
  { id: 'heading', name: 'Heading', icon: Type, category: 'text', description: 'Large title text' },
  { id: 'text', name: 'Text Block', icon: FileText, category: 'text', description: 'Paragraph text with formatting' },
  { id: 'image', name: 'Image', icon: ImageIcon, category: 'media', description: 'Single image with caption' },
  { id: 'gallery', name: 'Image Gallery', icon: LayoutGrid, category: 'media', description: 'Multiple images in grid' },
  { id: 'video', name: 'Video Embed', icon: Video, category: 'media', description: 'YouTube or Vimeo video' },
  { id: 'divider', name: 'Divider', icon: Minus, category: 'layout', description: 'Horizontal line separator' },
  { id: 'spacer', name: 'Spacer', icon: ArrowDown, category: 'layout', description: 'Vertical spacing' },
  { id: 'columns', name: 'Columns', icon: LayoutGrid, category: 'layout', description: '2 or 3 column layout' },
  { id: 'contact_form', name: 'Contact Form', icon: Mail, category: 'interactive', description: 'Email contact form' },
  { id: 'events', name: 'Events List', icon: Calendar, category: 'interactive', description: 'Upcoming events' },
  { id: 'team', name: 'Team Members', icon: Users, category: 'interactive', description: 'Team profiles grid' },
  { id: 'testimonials', name: 'Testimonials', icon: MessageSquare, category: 'interactive', description: 'Customer quotes' },
  { id: 'pricing', name: 'Pricing Table', icon: DollarSign, category: 'interactive', description: 'Pricing plans' },
  { id: 'faq', name: 'FAQ Accordion', icon: HelpCircle, category: 'interactive', description: 'Q&A accordion' },
  { id: 'features', name: 'Features Grid', icon: Zap, category: 'interactive', description: 'Feature cards' },
  { id: 'cta', name: 'Call to Action', icon: Phone, category: 'interactive', description: 'CTA with button' },
  { id: 'map', name: 'Map', icon: Map, category: 'interactive', description: 'Google Maps embed' },
  { id: 'quote', name: 'Quote', icon: Quote, category: 'text', description: 'Blockquote styling' },
  { id: 'list', name: 'List', icon: List, category: 'text', description: 'Bullet or numbered list' },
  { id: 'button', name: 'Button', icon: Link, category: 'interactive', description: 'Link button' },
];

const BLOCK_CATEGORIES = [
  { id: 'text', name: 'Text & Content' },
  { id: 'media', name: 'Media' },
  { id: 'layout', name: 'Layout' },
  { id: 'interactive', name: 'Interactive' },
];

// Default content for each block type
const getDefaultContent = (type) => {
  switch (type) {
    case 'heading':
      return { text: 'Your Heading Here', level: 'h2', align: 'center' };
    case 'text':
      return { html: '<p>Enter your text content here. You can format this text with bold, italic, and more.</p>' };
    case 'image':
      return { url: '', alt: '', caption: '', width: 'full' };
    case 'gallery':
      return { images: [], columns: 3, gap: 4 };
    case 'video':
      return { url: '', type: 'youtube' };
    case 'divider':
      return { style: 'solid', color: '#30363D' };
    case 'spacer':
      return { height: 40 };
    case 'columns':
      return { count: 2, gap: 6, blocks: [[], []] };
    case 'contact_form':
      return { 
        title: 'Get in Touch',
        description: 'Fill out the form below and we\'ll get back to you.',
        fields: ['name', 'email', 'phone', 'message'],
        buttonText: 'Send Message'
      };
    case 'events':
      return { limit: 6, layout: 'grid' };
    case 'team':
      return { 
        members: [
          { name: 'Team Member', role: 'Position', image: '', bio: '' }
        ],
        columns: 3
      };
    case 'testimonials':
      return {
        items: [
          { quote: 'This is an amazing testimonial!', author: 'John Doe', role: 'CEO', image: '' }
        ],
        layout: 'cards'
      };
    case 'pricing':
      return {
        plans: [
          { name: 'Basic', price: '$9', period: '/month', features: ['Feature 1', 'Feature 2'], cta: 'Get Started', popular: false }
        ]
      };
    case 'faq':
      return {
        items: [
          { question: 'What is your question?', answer: 'This is the answer to the question.' }
        ]
      };
    case 'features':
      return {
        items: [
          { icon: 'Zap', title: 'Feature Title', description: 'Feature description goes here.' }
        ],
        columns: 3
      };
    case 'cta':
      return { 
        title: 'Ready to Get Started?',
        description: 'Join us today and transform your business.',
        buttonText: 'Get Started',
        buttonUrl: '#',
        style: 'primary'
      };
    case 'map':
      return { address: '', zoom: 15 };
    case 'quote':
      return { text: 'Your inspiring quote here.', author: '', style: 'default' };
    case 'list':
      return { items: ['Item 1', 'Item 2', 'Item 3'], type: 'bullet' };
    case 'button':
      return { text: 'Click Here', url: '#', style: 'primary', align: 'center' };
    default:
      return {};
  }
};

// Block Editor Component for each block type
const BlockEditor = ({ block, onChange }) => {
  const { type, content } = block;

  const updateContent = (key, value) => {
    onChange({ ...block, content: { ...content, [key]: value } });
  };

  switch (type) {
    case 'heading':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading Text</Label>
            <Input
              value={content.text || ''}
              onChange={(e) => updateContent('text', e.target.value)}
              placeholder="Enter heading text"
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={content.level || 'h2'} onValueChange={(v) => updateContent('level', v)}>
                <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="h1">H1 - Largest</SelectItem>
                  <SelectItem value="h2">H2 - Large</SelectItem>
                  <SelectItem value="h3">H3 - Medium</SelectItem>
                  <SelectItem value="h4">H4 - Small</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select value={content.align || 'center'} onValueChange={(v) => updateContent('align', v)}>
                <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea
            value={content.html?.replace(/<[^>]*>/g, '') || ''}
            onChange={(e) => updateContent('html', `<p>${e.target.value}</p>`)}
            placeholder="Enter your text content"
            rows={5}
            className="bg-[#0D1117] border-[#30363D]"
          />
          <p className="text-xs text-gray-500">Text will be formatted as a paragraph</p>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={content.url || ''}
              onChange={(e) => updateContent('url', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Alt Text</Label>
            <Input
              value={content.alt || ''}
              onChange={(e) => updateContent('alt', e.target.value)}
              placeholder="Image description"
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Caption (optional)</Label>
            <Input
              value={content.caption || ''}
              onChange={(e) => updateContent('caption', e.target.value)}
              placeholder="Image caption"
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Width</Label>
            <Select value={content.width || 'full'} onValueChange={(v) => updateContent('width', v)}>
              <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#161B22] border-[#30363D]">
                <SelectItem value="small">Small (25%)</SelectItem>
                <SelectItem value="medium">Medium (50%)</SelectItem>
                <SelectItem value="large">Large (75%)</SelectItem>
                <SelectItem value="full">Full Width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'video':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={content.url || ''}
              onChange={(e) => updateContent('url', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <p className="text-xs text-gray-500">Supports YouTube and Vimeo links</p>
        </div>
      );

    case 'divider':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={content.style || 'solid'} onValueChange={(v) => updateContent('style', v)}>
              <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#161B22] border-[#30363D]">
                <SelectItem value="solid">Solid Line</SelectItem>
                <SelectItem value="dashed">Dashed Line</SelectItem>
                <SelectItem value="dotted">Dotted Line</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-2">
          <Label>Height (px)</Label>
          <Input
            type="number"
            value={content.height || 40}
            onChange={(e) => updateContent('height', parseInt(e.target.value))}
            min={10}
            max={200}
            className="bg-[#0D1117] border-[#30363D]"
          />
        </div>
      );

    case 'contact_form':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Form Title</Label>
            <Input
              value={content.title || ''}
              onChange={(e) => updateContent('title', e.target.value)}
              placeholder="Get in Touch"
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={content.description || ''}
              onChange={(e) => updateContent('description', e.target.value)}
              placeholder="Fill out the form..."
              rows={2}
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={content.buttonText || 'Send Message'}
              onChange={(e) => updateContent('buttonText', e.target.value)}
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={content.title || ''}
              onChange={(e) => updateContent('title', e.target.value)}
              placeholder="Ready to Get Started?"
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={content.description || ''}
              onChange={(e) => updateContent('description', e.target.value)}
              placeholder="Join us today..."
              rows={2}
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={content.buttonText || 'Get Started'}
                onChange={(e) => updateContent('buttonText', e.target.value)}
                className="bg-[#0D1117] border-[#30363D]"
              />
            </div>
            <div className="space-y-2">
              <Label>Button URL</Label>
              <Input
                value={content.buttonUrl || '#'}
                onChange={(e) => updateContent('buttonUrl', e.target.value)}
                className="bg-[#0D1117] border-[#30363D]"
              />
            </div>
          </div>
        </div>
      );

    case 'quote':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quote Text</Label>
            <Textarea
              value={content.text || ''}
              onChange={(e) => updateContent('text', e.target.value)}
              placeholder="Your inspiring quote..."
              rows={3}
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Author (optional)</Label>
            <Input
              value={content.author || ''}
              onChange={(e) => updateContent('author', e.target.value)}
              placeholder="Quote author"
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={content.text || 'Click Here'}
                onChange={(e) => updateContent('text', e.target.value)}
                className="bg-[#0D1117] border-[#30363D]"
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={content.url || '#'}
                onChange={(e) => updateContent('url', e.target.value)}
                className="bg-[#0D1117] border-[#30363D]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={content.style || 'primary'} onValueChange={(v) => updateContent('style', v)}>
                <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select value={content.align || 'center'} onValueChange={(v) => updateContent('align', v)}>
                <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    case 'events':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Number of Events to Show</Label>
            <Input
              type="number"
              value={content.limit || 6}
              onChange={(e) => updateContent('limit', parseInt(e.target.value))}
              min={1}
              max={20}
              className="bg-[#0D1117] border-[#30363D]"
            />
          </div>
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select value={content.layout || 'grid'} onValueChange={(v) => updateContent('layout', v)}>
              <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#161B22] border-[#30363D]">
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500">Events are managed in the Events section</p>
        </div>
      );

    default:
      return (
        <div className="p-4 text-center text-gray-400">
          <p>Configuration for this block type coming soon</p>
        </div>
      );
  }
};

// Block Preview Component
const BlockPreview = ({ block }) => {
  const { type, content } = block;
  const blockType = BLOCK_TYPES.find(b => b.id === type);
  const Icon = blockType?.icon || FileText;

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded bg-[#D4A836]/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#D4A836]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{blockType?.name || type}</p>
        <p className="text-xs text-gray-500 truncate">
          {type === 'heading' && content.text}
          {type === 'text' && content.html?.replace(/<[^>]*>/g, '').slice(0, 50)}
          {type === 'image' && (content.alt || 'Image')}
          {type === 'contact_form' && (content.title || 'Contact Form')}
          {type === 'cta' && (content.title || 'Call to Action')}
          {type === 'divider' && `${content.style || 'solid'} divider`}
          {type === 'spacer' && `${content.height || 40}px spacing`}
          {type === 'video' && 'Video embed'}
          {type === 'events' && `${content.limit || 6} events`}
          {type === 'button' && content.text}
          {type === 'quote' && content.text?.slice(0, 50)}
        </p>
      </div>
    </div>
  );
};

// Main Visual Block Editor Component
export default function VisualBlockEditor({ blocks = [], onChange }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const addBlock = (type) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type,
      content: getDefaultContent(type)
    };
    onChange([...blocks, newBlock]);
    setShowAddDialog(false);
    setEditingIndex(blocks.length); // Open editor for new block
  };

  const updateBlock = (index, updatedBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    if (editingIndex === index) setEditingIndex(null);
  };

  const moveBlock = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(newBlocks);
    setEditingIndex(newIndex);
  };

  const filteredBlockTypes = selectedCategory === 'all' 
    ? BLOCK_TYPES 
    : BLOCK_TYPES.filter(b => b.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Block List */}
      <div className="space-y-2">
        {blocks.length === 0 ? (
          <div className="border-2 border-dashed border-[#30363D] rounded-lg p-8 text-center">
            <Plus className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 mb-4">No blocks added yet</p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Block
            </Button>
          </div>
        ) : (
          blocks.map((block, index) => (
            <Card 
              key={block.id || index} 
              className={`bg-[#161B22] border-[#30363D] ${editingIndex === index ? 'ring-2 ring-[#D4A836]' : ''}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {/* Drag Handle */}
                  <div className="cursor-move text-gray-500 hover:text-gray-300">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  {/* Block Preview */}
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                  >
                    <BlockPreview block={block} />
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => deleteBlock(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Expanded Editor */}
                {editingIndex === index && (
                  <div className="mt-4 pt-4 border-t border-[#30363D]">
                    <BlockEditor 
                      block={block} 
                      onChange={(updated) => updateBlock(index, updated)} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Block Button */}
      {blocks.length > 0 && (
        <Button 
          onClick={() => setShowAddDialog(true)} 
          variant="outline"
          className="w-full border-dashed border-[#30363D] hover:border-[#D4A836] hover:bg-[#D4A836]/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Block
        </Button>
      )}

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#161B22] border-[#30363D] max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Add Content Block</DialogTitle>
          </DialogHeader>
          
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap pb-4 border-b border-[#30363D]">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className={selectedCategory === 'all' ? 'bg-[#D4A836] text-black' : 'border-[#30363D]'}
            >
              All
            </Button>
            {BLOCK_CATEGORIES.map(cat => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? 'bg-[#D4A836] text-black' : 'border-[#30363D]'}
              >
                {cat.name}
              </Button>
            ))}
          </div>
          
          {/* Block Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto py-4">
            {filteredBlockTypes.map((blockType) => {
              const Icon = blockType.icon;
              return (
                <button
                  key={blockType.id}
                  onClick={() => addBlock(blockType.id)}
                  className="p-4 rounded-lg border border-[#30363D] bg-[#0D1117] hover:border-[#D4A836] hover:bg-[#D4A836]/10 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#D4A836]/20 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[#D4A836]" />
                  </div>
                  <h4 className="font-medium text-white text-sm">{blockType.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{blockType.description}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export block types for use elsewhere
export { BLOCK_TYPES, BLOCK_CATEGORIES, getDefaultContent };
