import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Mail, Shield, Key, AlertTriangle, CheckCircle, Loader2, Eye,
  RotateCcw, Save, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Icon options for emails
const ICON_OPTIONS = [
  { value: 'shield', label: 'Shield', icon: '🛡️' },
  { value: 'mail', label: 'Mail', icon: '📧' },
  { value: 'key', label: 'Key', icon: '🔑' },
  { value: 'alert', label: 'Alert', icon: '⚠️' },
  { value: 'check', label: 'Checkmark', icon: '✅' },
  { value: 'none', label: 'No Icon', icon: '' },
];

export default function SystemEmailTemplates() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editedTemplate, setEditedTemplate] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/api/system-emails`, { headers });
      setTemplates(res.data.templates);
      if (res.data.templates.length > 0 && !selectedTemplate) {
        selectTemplate(res.data.templates[0]);
      }
    } catch (err) {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setEditedTemplate({ ...template });
  };

  const handleFieldChange = (field, value) => {
    setEditedTemplate(prev => ({ ...prev, [field]: value }));
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const res = await axios.put(
        `${API}/api/system-emails/${selectedTemplate.id}`,
        editedTemplate,
        { headers }
      );
      toast.success('Template saved successfully');
      // Update templates list
      setTemplates(prev =>
        prev.map(t => (t.id === selectedTemplate.id ? res.data : t))
      );
      setSelectedTemplate(res.data);
      setEditedTemplate(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const resetTemplate = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm('Are you sure you want to reset this template to defaults?')) return;
    
    try {
      const res = await axios.post(
        `${API}/system-emails/${selectedTemplate.id}/reset`,
        {},
        { headers }
      );
      toast.success('Template reset to defaults');
      setTemplates(prev =>
        prev.map(t => (t.id === selectedTemplate.id ? res.data : t))
      );
      setSelectedTemplate(res.data);
      setEditedTemplate(res.data);
    } catch (err) {
      toast.error('Failed to reset template');
    }
  };

  const previewTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      // Save current changes first
      await axios.put(
        `${API}/system-emails/${selectedTemplate.id}`,
        editedTemplate,
        { headers }
      );
      // Then get preview
      const res = await axios.post(
        `${API}/system-emails/${selectedTemplate.id}/preview`,
        {},
        { headers }
      );
      setPreviewHtml(res.data.html);
      setPreviewSubject(res.data.subject);
      setShowPreview(true);
    } catch (err) {
      toast.error('Failed to generate preview');
    }
  };

  const getTemplateIcon = (id) => {
    switch (id) {
      case 'welcome': return <Mail className="w-5 h-5" />;
      case 'password_reset': return <Key className="w-5 h-5" />;
      case 'forgot_password': return <Key className="w-5 h-5" />;
      case 'training_assignment': return <AlertTriangle className="w-5 h-5" />;
      default: return <Mail className="w-5 h-5" />;
    }
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
      <div className="space-y-6" data-testid="system-email-templates">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">System Email Templates</h1>
            <p className="text-gray-400 mt-1">
              Customize system emails sent to users (welcome, password reset, etc.)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template List */}
          <Card className="bg-[#161B22] border-[#30363D] lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#E8DDB5] text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                    selectedTemplate?.id === template.id
                      ? 'bg-[#D4A836]/20 border border-[#D4A836]/50'
                      : 'hover:bg-[#21262D] border border-transparent'
                  }`}
                  data-testid={`template-${template.id}`}
                >
                  <span className={selectedTemplate?.id === template.id ? 'text-[#D4A836]' : 'text-gray-500'}>
                    {getTemplateIcon(template.id)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#E8DDB5] truncate">{template.name}</p>
                    <p className="text-xs text-gray-500 truncate">{template.description}</p>
                  </div>
                  {template.is_customized && (
                    <Badge variant="outline" className="text-xs text-[#D4A836] border-[#D4A836]/30">
                      Edited
                    </Badge>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Editor */}
          <Card className="bg-[#161B22] border-[#30363D] lg:col-span-3">
            {selectedTemplate ? (
              <>
                <CardHeader className="border-b border-[#30363D]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[#D4A836]">{getTemplateIcon(selectedTemplate.id)}</span>
                      <div>
                        <CardTitle className="text-[#E8DDB5]">{selectedTemplate.name}</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">{selectedTemplate.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetTemplate}
                        className="border-[#30363D] text-gray-400 hover:text-red-400"
                        data-testid="reset-template-btn"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={previewTemplate}
                        className="border-[#D4A836]/30 text-[#D4A836]"
                        data-testid="preview-template-btn"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        onClick={saveTemplate}
                        disabled={saving}
                        className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                        data-testid="save-template-btn"
                      >
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="bg-[#0f0f15] border border-[#30363D]">
                      <TabsTrigger value="content" className="data-[state=active]:bg-[#D4A836]/20">Content</TabsTrigger>
                      <TabsTrigger value="appearance" className="data-[state=active]:bg-[#D4A836]/20">Appearance</TabsTrigger>
                      <TabsTrigger value="advanced" className="data-[state=active]:bg-[#D4A836]/20">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-gray-400">Subject Line</Label>
                        <Input
                          value={editedTemplate.subject || ''}
                          onChange={(e) => handleFieldChange('subject', e.target.value)}
                          placeholder="Email subject"
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                          data-testid="subject-input"
                        />
                        <p className="text-xs text-gray-500">Use {'{company_name}'} for dynamic company name</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-400">Header Title</Label>
                          <Input
                            value={editedTemplate.header_title || ''}
                            onChange={(e) => handleFieldChange('header_title', e.target.value)}
                            className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                            data-testid="header-title-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-400">Header Subtitle</Label>
                          <Input
                            value={editedTemplate.header_subtitle || ''}
                            onChange={(e) => handleFieldChange('header_subtitle', e.target.value)}
                            className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                            data-testid="header-subtitle-input"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-400">Greeting</Label>
                        <Input
                          value={editedTemplate.greeting_template || ''}
                          onChange={(e) => handleFieldChange('greeting_template', e.target.value)}
                          placeholder="Hello {user_name},"
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                          data-testid="greeting-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-400">Body Message</Label>
                        <Textarea
                          value={editedTemplate.body_template || ''}
                          onChange={(e) => handleFieldChange('body_template', e.target.value)}
                          rows={3}
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                          data-testid="body-input"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-400">Button Text</Label>
                          <Input
                            value={editedTemplate.cta_text || ''}
                            onChange={(e) => handleFieldChange('cta_text', e.target.value)}
                            className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                            data-testid="cta-text-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-gray-400">Show Button</Label>
                            <Switch
                              checked={editedTemplate.show_cta ?? true}
                              onCheckedChange={(checked) => handleFieldChange('show_cta', checked)}
                              data-testid="show-cta-toggle"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-400">Footer Text</Label>
                        <Input
                          value={editedTemplate.footer_text || ''}
                          onChange={(e) => handleFieldChange('footer_text', e.target.value)}
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                          data-testid="footer-input"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="appearance" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-gray-400">Show Icon</Label>
                            <Switch
                              checked={editedTemplate.show_icon ?? true}
                              onCheckedChange={(checked) => handleFieldChange('show_icon', checked)}
                              data-testid="show-icon-toggle"
                            />
                          </div>
                          <p className="text-xs text-gray-500">Toggle the icon at the top of the email</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-400">Icon Type</Label>
                          <Select
                            value={editedTemplate.icon_type || 'shield'}
                            onValueChange={(value) => handleFieldChange('icon_type', value)}
                            disabled={!editedTemplate.show_icon}
                          >
                            <SelectTrigger className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]" data-testid="icon-type-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#161B22] border-[#30363D]">
                              {ICON_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className="flex items-center gap-2">
                                    <span>{opt.icon}</span>
                                    <span>{opt.label}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-400">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={editedTemplate.primary_color || '#D4A836'}
                            onChange={(e) => handleFieldChange('primary_color', e.target.value)}
                            className="w-14 h-10 p-1 bg-[#0f0f15] border-[#D4A836]/30"
                            data-testid="color-picker"
                          />
                          <Input
                            value={editedTemplate.primary_color || '#D4A836'}
                            onChange={(e) => handleFieldChange('primary_color', e.target.value)}
                            className="flex-1 bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] font-mono"
                            data-testid="color-input"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-400">Show Security Warning</Label>
                          <Switch
                            checked={editedTemplate.show_security_warning ?? false}
                            onCheckedChange={(checked) => handleFieldChange('show_security_warning', checked)}
                            data-testid="show-warning-toggle"
                          />
                        </div>
                      </div>

                      {editedTemplate.show_security_warning && (
                        <div className="space-y-2">
                          <Label className="text-gray-400">Warning Text</Label>
                          <Textarea
                            value={editedTemplate.security_warning_text || ''}
                            onChange={(e) => handleFieldChange('security_warning_text', e.target.value)}
                            rows={2}
                            className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                            data-testid="warning-text-input"
                          />
                        </div>
                      )}

                      <div className="bg-[#21262D] rounded-lg p-4">
                        <h4 className="text-[#E8DDB5] font-medium mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#D4A836]" />
                          Available Variables
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(selectedTemplate.variables || []).map((variable) => (
                            <Badge
                              key={variable}
                              variant="outline"
                              className="text-xs text-gray-400 border-gray-600 font-mono"
                            >
                              {'{' + variable + '}'}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Use these variables in your template to insert dynamic content.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-gray-500">Select a template to edit</p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-[#E8DDB5]">Email Preview</DialogTitle>
              <DialogDescription className="text-gray-400">
                Subject: <span className="text-[#E8DDB5]">{previewSubject}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-[#0f0f15] rounded-lg p-2">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[500px] border-0 rounded"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
            <DialogFooter className="flex-shrink-0">
              <Button
                onClick={() => setShowPreview(false)}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
