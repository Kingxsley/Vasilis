import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  Plus, Eye, Trash2, Loader2, RefreshCw, 
  GripVertical, Save, Layout, EyeOff, ExternalLink,
  Zap, Grid3X3, BarChart3, Quote, MousePointerClick,
  HelpCircle, Users, DollarSign, Images, Type, Code,
  ChevronUp, ChevronDown, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icon mapping
const iconMap = {
  Zap: Zap,
  Grid3X3: Grid3X3,
  BarChart3: BarChart3,
  Quote: Quote,
  MousePointerClick: MousePointerClick,
  HelpCircle: HelpCircle,
  Users: Users,
  DollarSign: DollarSign,
  Images: Images,
  Type: Type,
  Code: Code,
};

// Section type card
const SectionTypeCard = ({ type, onAdd }) => {
  const Icon = iconMap[type.icon] || Layout;
  
  return (
    <Card
      className="bg-[#1a1a24] border-[#30363D] hover:border-[#D4A836]/50 cursor-pointer transition-colors"
      onClick={() => onAdd(type.type)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#D4A836]/10">
          <Icon className="w-5 h-5 text-[#D4A836]" />
        </div>
        <div>
          <h4 className="text-[#E8DDB5] font-medium text-sm">{type.name}</h4>
          <p className="text-gray-500 text-xs">{type.description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Section editor component
const SectionEditor = ({ section, onUpdate, onDelete, onMoveUp, onMoveDown, onToggleVisibility, isFirst, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const content = section.content || {};

  const updateContent = (key, value) => {
    onUpdate(section.section_id, { ...content, [key]: value });
  };

  const updateItem = (index, updates) => {
    const items = [...(content.items || [])];
    items[index] = { ...items[index], ...updates };
    updateContent('items', items);
  };

  const addItem = () => {
    const items = [...(content.items || [])];
    if (section.type === 'features') {
      items.push({ title: 'New Feature', description: 'Description', icon: 'Star', color: '#D4A836' });
    } else if (section.type === 'testimonials') {
      items.push({ quote: 'New testimonial', author: 'Author', role: 'Role' });
    } else if (section.type === 'faq') {
      items.push({ question: 'Question?', answer: 'Answer' });
    } else if (section.type === 'pricing') {
      items.push({ name: 'New Plan', price: '$0', period: '/month', features: ['Feature 1'], highlighted: false });
    } else if (section.type === 'team') {
      items.push({ name: 'Team Member', role: 'Position', image_url: '' });
    } else if (section.type === 'stats') {
      const stats = [...(content.stats || [])];
      stats.push({ value: '0', label: 'Label' });
      updateContent('stats', stats);
      return;
    } else {
      items.push({});
    }
    updateContent('items', items);
  };

  const removeItem = (index) => {
    const items = [...(content.items || [])];
    items.splice(index, 1);
    updateContent('items', items);
  };

  return (
    <Card className={`bg-[#161B22] border-[#30363D] ${!section.visible ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GripVertical className="w-5 h-5 text-gray-500 cursor-move" />
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[#D4A836] border-[#D4A836]/30">
                  {section.type}
                </Badge>
                {!section.visible && (
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">Hidden</Badge>
                )}
              </div>
              <p className="text-[#E8DDB5] font-medium mt-1">{content.title || 'Untitled Section'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveUp(section.section_id)}
              disabled={isFirst}
              className="text-gray-400 hover:text-[#E8DDB5] h-8 w-8"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveDown(section.section_id)}
              disabled={isLast}
              className="text-gray-400 hover:text-[#E8DDB5] h-8 w-8"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onToggleVisibility(section.section_id)}
              className="text-gray-400 hover:text-[#E8DDB5] h-8 w-8"
            >
              {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-[#E8DDB5] h-8 w-8"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(section.section_id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-4 pt-4 border-t border-[#30363D]">
          {/* Common fields */}
          {section.type !== 'custom' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Title</Label>
                <Input
                  value={content.title || ''}
                  onChange={(e) => updateContent('title', e.target.value)}
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                />
              </div>
              {section.type !== 'cta' && (
                <div>
                  <Label className="text-gray-400">Subtitle</Label>
                  <Input
                    value={content.subtitle || ''}
                    onChange={(e) => updateContent('subtitle', e.target.value)}
                    className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Description for hero, cta, text */}
          {['hero', 'cta', 'text'].includes(section.type) && (
            <div>
              <Label className="text-gray-400">Description</Label>
              <Textarea
                value={content.description || ''}
                onChange={(e) => updateContent('description', e.target.value)}
                className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                rows={3}
              />
            </div>
          )}

          {/* Button for hero, cta */}
          {['hero', 'cta'].includes(section.type) && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Button Text</Label>
                <Input
                  value={content.button_text || ''}
                  onChange={(e) => updateContent('button_text', e.target.value)}
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                />
              </div>
              <div>
                <Label className="text-gray-400">Button Link</Label>
                <Input
                  value={content.button_link || ''}
                  onChange={(e) => updateContent('button_link', e.target.value)}
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                />
              </div>
            </div>
          )}

          {/* Hero stats */}
          {section.type === 'hero' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Stats</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="border-[#D4A836]/30 text-[#D4A836] h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Stat
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(content.stats || []).map((stat, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={stat.value || ''}
                        onChange={(e) => {
                          const stats = [...(content.stats || [])];
                          stats[idx] = { ...stats[idx], value: e.target.value };
                          updateContent('stats', stats);
                        }}
                        placeholder="Value"
                        className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                      <Input
                        value={stat.label || ''}
                        onChange={(e) => {
                          const stats = [...(content.stats || [])];
                          stats[idx] = { ...stats[idx], label: e.target.value };
                          updateContent('stats', stats);
                        }}
                        placeholder="Label"
                        className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const stats = [...(content.stats || [])];
                        stats.splice(idx, 1);
                        updateContent('stats', stats);
                      }}
                      className="text-red-400 h-8 w-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features items */}
          {section.type === 'features' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Features</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="border-[#D4A836]/30 text-[#D4A836] h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Feature
                </Button>
              </div>
              <div className="space-y-3">
                {(content.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#1a1a24] rounded-lg border border-[#30363D]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-gray-500 text-xs">Feature {idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input
                        value={item.title || ''}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        placeholder="Title"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                      <Input
                        value={item.icon || ''}
                        onChange={(e) => updateItem(idx, { icon: e.target.value })}
                        placeholder="Icon (e.g., Mail, Lock)"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                    </div>
                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder="Description"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] mt-2 text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {section.type === 'testimonials' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Testimonials</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="border-[#D4A836]/30 text-[#D4A836] h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Testimonial
                </Button>
              </div>
              <div className="space-y-3">
                {(content.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#1a1a24] rounded-lg border border-[#30363D]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-gray-500 text-xs">Testimonial {idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={item.quote || ''}
                      onChange={(e) => updateItem(idx, { quote: e.target.value })}
                      placeholder="Quote"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] text-sm"
                      rows={2}
                    />
                    <div className="grid md:grid-cols-2 gap-2 mt-2">
                      <Input
                        value={item.author || ''}
                        onChange={(e) => updateItem(idx, { author: e.target.value })}
                        placeholder="Author name"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                      <Input
                        value={item.role || ''}
                        onChange={(e) => updateItem(idx, { role: e.target.value })}
                        placeholder="Role/Company"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {section.type === 'faq' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Questions</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="border-[#D4A836]/30 text-[#D4A836] h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Question
                </Button>
              </div>
              <div className="space-y-3">
                {(content.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#1a1a24] rounded-lg border border-[#30363D]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-gray-500 text-xs">Q{idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={item.question || ''}
                      onChange={(e) => updateItem(idx, { question: e.target.value })}
                      placeholder="Question"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm mb-2"
                    />
                    <Textarea
                      value={item.answer || ''}
                      onChange={(e) => updateItem(idx, { answer: e.target.value })}
                      placeholder="Answer"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Plans */}
          {section.type === 'pricing' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Pricing Plans</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="border-[#D4A836]/30 text-[#D4A836] h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Plan
                </Button>
              </div>
              <div className="space-y-4">
                {(content.items || []).map((plan, idx) => (
                  <div key={idx} className={`p-4 bg-[#1a1a24] rounded-lg border ${plan.highlighted ? 'border-[#D4A836]' : 'border-[#30363D]'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">Plan {idx + 1}</span>
                        <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={plan.highlighted || false}
                            onChange={(e) => updateItem(idx, { highlighted: e.target.checked })}
                            className="rounded border-gray-600"
                          />
                          Featured
                        </label>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <Label className="text-gray-500 text-xs">Plan Name</Label>
                        <Input
                          value={plan.name || ''}
                          onChange={(e) => updateItem(idx, { name: e.target.value })}
                          placeholder="e.g., Basic, Pro, Enterprise"
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-500 text-xs">Price</Label>
                        <Input
                          value={plan.price || ''}
                          onChange={(e) => updateItem(idx, { price: e.target.value })}
                          placeholder="e.g., $29, €49, Free"
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-500 text-xs">Period</Label>
                        <Input
                          value={plan.period || ''}
                          onChange={(e) => updateItem(idx, { period: e.target.value })}
                          placeholder="e.g., /month, /year"
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Description (optional)</Label>
                      <Input
                        value={plan.description || ''}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Short description of this plan"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm mb-3"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Features (one per line)</Label>
                      <Textarea
                        value={(plan.features || []).join('\n')}
                        onChange={(e) => updateItem(idx, { features: e.target.value.split('\n').filter(f => f.trim()) })}
                        placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] text-sm"
                        rows={4}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label className="text-gray-500 text-xs">Button Text</Label>
                        <Input
                          value={plan.button_text || ''}
                          onChange={(e) => updateItem(idx, { button_text: e.target.value })}
                          placeholder="e.g., Get Started, Contact Sales"
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-500 text-xs">Button Link</Label>
                        <Input
                          value={plan.button_link || ''}
                          onChange={(e) => updateItem(idx, { button_link: e.target.value })}
                          placeholder="e.g., /auth, /contact"
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Members */}
          {section.type === 'team' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Team Members</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="border-[#D4A836]/30 text-[#D4A836] h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Member
                </Button>
              </div>
              <div className="space-y-3">
                {(content.items || []).map((member, idx) => (
                  <div key={idx} className="p-3 bg-[#1a1a24] rounded-lg border border-[#30363D]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-gray-500 text-xs">Member {idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input
                        value={member.name || ''}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        placeholder="Name"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                      <Input
                        value={member.role || ''}
                        onChange={(e) => updateItem(idx, { role: e.target.value })}
                        placeholder="Role/Position"
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm"
                      />
                    </div>
                    <Input
                      value={member.image_url || ''}
                      onChange={(e) => updateItem(idx, { image_url: e.target.value })}
                      placeholder="Image URL (optional)"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-sm mt-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom HTML */}
          {section.type === 'custom' && (
            <div>
              <Label className="text-gray-400">Custom HTML</Label>
              <Textarea
                value={content.custom_html || ''}
                onChange={(e) => updateContent('custom_html', e.target.value)}
                className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] font-mono text-sm"
                rows={8}
                placeholder="<div>Your custom HTML here</div>"
              />
            </div>
          )}

          {/* Background color */}
          <div>
            <Label className="text-gray-400">Background Color (optional)</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={content.background_color || '#0f0f15'}
                onChange={(e) => updateContent('background_color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={content.background_color || ''}
                onChange={(e) => updateContent('background_color', e.target.value)}
                placeholder="Leave empty for default"
                className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default function LandingPageEditor() {
  const { token } = useAuth();
  const [layout, setLayout] = useState(null);
  const [sectionTypes, setSectionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [layoutRes, typesRes] = await Promise.all([
        axios.get(`${API}/landing-layouts`, { headers }),
        axios.get(`${API}/landing-layouts/section-types`, { headers })
      ]);
      setLayout(layoutRes.data);
      setSectionTypes(typesRes.data);
    } catch (err) {
      console.error('Failed to fetch layout:', err);
      toast.error('Failed to load layout');
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async () => {
    if (!layout) return;
    setSaving(true);
    try {
      await axios.put(`${API}/landing-layouts`, {
        sections: layout.sections
      }, { headers });
      toast.success('Layout saved');
      setHasChanges(false);
    } catch (err) {
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!window.confirm('Reset landing page to default layout? All changes will be lost.')) return;
    try {
      await axios.post(`${API}/landing-layouts/reset-default`, {}, { headers });
      toast.success('Layout reset to default');
      fetchData();
    } catch (err) {
      toast.error('Failed to reset layout');
    }
  };

  const addSection = async (type) => {
    try {
      const res = await axios.post(`${API}/landing-layouts/sections`, { type }, { headers });
      setLayout({
        ...layout,
        sections: [...(layout?.sections || []), res.data]
      });
      setShowAddDialog(false);
      setHasChanges(true);
      toast.success('Section added');
    } catch (err) {
      toast.error('Failed to add section');
    }
  };

  const updateSectionContent = (sectionId, content) => {
    setLayout({
      ...layout,
      sections: layout.sections.map(s =>
        s.section_id === sectionId ? { ...s, content } : s
      )
    });
    setHasChanges(true);
  };

  const deleteSection = (sectionId) => {
    if (!window.confirm('Delete this section?')) return;
    setLayout({
      ...layout,
      sections: layout.sections.filter(s => s.section_id !== sectionId)
    });
    setHasChanges(true);
  };

  const moveSection = (sectionId, direction) => {
    const sections = [...layout.sections];
    const index = sections.findIndex(s => s.section_id === sectionId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    sections.forEach((s, i) => s.order = i);
    
    setLayout({ ...layout, sections });
    setHasChanges(true);
  };

  const toggleVisibility = (sectionId) => {
    setLayout({
      ...layout,
      sections: layout.sections.map(s =>
        s.section_id === sectionId ? { ...s, visible: !s.visible } : s
      )
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="landing-page-editor">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Landing Page Editor
            </h1>
            <p className="text-gray-500 mt-1">
              Customize your landing page sections
              {hasChanges && <span className="text-[#D4A836] ml-2">• Unsaved changes</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/', '_blank')}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={resetToDefault}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={saveLayout}
              disabled={saving || !hasChanges}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sections List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#E8DDB5]">
                Sections ({layout?.sections?.length || 0})
              </h2>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>

            {(!layout?.sections || layout.sections.length === 0) ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="py-12 text-center">
                  <Layout className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No sections yet</h3>
                  <p className="text-gray-400 mb-4">Add sections to build your landing page</p>
                  <Button onClick={() => setShowAddDialog(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                    Add First Section
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {layout.sections
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => (
                    <SectionEditor
                      key={section.section_id}
                      section={section}
                      onUpdate={updateSectionContent}
                      onDelete={deleteSection}
                      onMoveUp={(id) => moveSection(id, 'up')}
                      onMoveDown={(id) => moveSection(id, 'down')}
                      onToggleVisibility={toggleVisibility}
                      isFirst={index === 0}
                      isLast={index === layout.sections.length - 1}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Help Panel */}
          <div className="space-y-4">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5] text-base">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-400">
                <p>
                  <span className="text-[#D4A836]">Reorder:</span> Use the up/down arrows to change section order
                </p>
                <p>
                  <span className="text-[#D4A836]">Hide:</span> Click the eye icon to hide a section without deleting it
                </p>
                <p>
                  <span className="text-[#D4A836]">Preview:</span> Open the preview to see your changes in real-time
                </p>
                <p>
                  <span className="text-[#D4A836]">Icons:</span> Use Lucide icon names like Mail, Lock, Shield, Users, etc.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5] text-base">Available Placeholders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-400">
                <p><code className="text-[#D4A836]">{'{company_name}'}</code> - Your company name</p>
                <p><code className="text-[#D4A836]">{'{company_logo}'}</code> - Your logo URL</p>
                <p><code className="text-[#D4A836]">/auth</code> - Link to login page</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Section Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-[#161B22] border-[#30363D] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Add Section</DialogTitle>
              <DialogDescription className="text-gray-400">
                Choose a section type to add to your landing page
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-3 py-4 max-h-[400px] overflow-y-auto">
              {sectionTypes.map((type) => (
                <SectionTypeCard key={type.type} type={type} onAdd={addSection} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
