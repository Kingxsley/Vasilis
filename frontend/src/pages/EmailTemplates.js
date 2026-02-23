import React, { useEffect, useState, Suspense, lazy } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Mail, Edit2, Eye, RotateCcw, Save, Loader2, Info, CheckCircle, Code, FileText, Plus, Trash2, Image, Palette, Type, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// Lazy load RichTextEditor
const RichTextEditor = lazy(() => import('../components/common/RichTextEditor'));

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Available icons for templates
const TEMPLATE_ICONS = [
  { value: '⚠️', label: 'Warning' },
  { value: '🚨', label: 'Alert' },
  { value: '🎣', label: 'Phishing' },
  { value: '🔒', label: 'Lock' },
  { value: '🛡️', label: 'Shield' },
  { value: '📧', label: 'Email' },
  { value: '📱', label: 'Mobile' },
  { value: '💻', label: 'Computer' },
  { value: '🔐', label: 'Security' },
  { value: '📚', label: 'Training' },
  { value: '✅', label: 'Success' },
  { value: '❌', label: 'Error' },
  { value: '👋', label: 'Wave' },
  { value: '🔑', label: 'Key' },
  { value: '⏰', label: 'Clock' },
  { value: '📝', label: 'Document' },
  { value: '🎯', label: 'Target' },
  { value: '💡', label: 'Idea' },
];

// Color presets for templates
const COLOR_PRESETS = [
  { value: '#FF6B6B', label: 'Red Alert' },
  { value: '#D4A836', label: 'Gold Warning' },
  { value: '#4CAF50', label: 'Green Success' },
  { value: '#2196F3', label: 'Blue Info' },
  { value: '#9C27B0', label: 'Purple' },
  { value: '#FF5722', label: 'Orange' },
  { value: '#00BCD4', label: 'Cyan' },
  { value: '#E91E63', label: 'Pink' },
];

const TEMPLATE_LABELS = {
  welcome: { name: 'Welcome Email', icon: '👋', category: 'notification' },
  password_reset: { name: 'Password Reset (Admin)', icon: '🔐', category: 'notification' },
  forgot_password: { name: 'Forgot Password', icon: '🔑', category: 'notification' },
  password_expiry_reminder: { name: 'Password Expiry Reminder', icon: '⏰', category: 'notification' },
  training_assigned: { name: 'Training Assigned', icon: '📚', category: 'notification' },
  training_reminder: { name: 'Training Reminder', icon: '⏰', category: 'notification' }
};

export default function EmailTemplates() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState({});
  const [customAlertTemplates, setCustomAlertTemplates] = useState([]);
  const [phishingEmailTemplates, setPhishingEmailTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingAlertTemplate, setEditingAlertTemplate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [alertPreview, setAlertPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ subject: '', body: '' });
  const [editorMode, setEditorMode] = useState('visual');
  const [activeTab, setActiveTab] = useState('notifications');
  
  // Visual Alert Template Builder State
  const [alertFormData, setAlertFormData] = useState({
    name: '',
    description: '',
    icon: '⚠️',
    title: 'Security Alert!',
    titleColor: '#FF6B6B',
    subtitle: 'This was a phishing simulation',
    backgroundColor: '#0D1117',
    cardColor: '#161B22',
    messageTitle: 'Hello {{USER_NAME}},',
    messageBody: 'You clicked on a simulated phishing link in the "{{CAMPAIGN_NAME}}" campaign. This was a test to help you identify potential threats.',
    showTips: true,
    tips: ['Always verify the sender\'s email address', 'Hover over links before clicking', 'When in doubt, contact IT directly', 'Report suspicious emails immediately'],
    showButton: false,  // Button hidden by default (no countdown/training button)
    buttonText: '',
    buttonUrl: '/training'
  });

  // Visual Email Template Builder State
  const [customEmailTemplates, setCustomEmailTemplates] = useState([]);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);
  const [emailFormData, setEmailFormData] = useState({
    name: '',
    description: '',
    subject: '',
    type: 'training',  // training, notification, phishing
    logoUrl: '',
    logoIcon: '📚',
    useIcon: true,  // Use icon instead of logo URL
    primaryColor: '#D4A836',
    backgroundColor: '#0D1117',
    cardColor: '#161B22',
    headerTitle: 'Security Training Required',
    headerTitleColor: '#4CAF50',
    greeting: 'Hello {{USER_NAME}},',
    mainMessage: 'You recently clicked on a simulated security threat during our awareness exercise.',
    highlightBox: {
      show: true,
      icon: '⚠️',
      text: "Don't worry! This was a training simulation. No harm was done, but it's important to improve your awareness.",
      backgroundColor: '#D4A836',
      textColor: '#000000'
    },
    additionalMessage: 'Your training progress has been reset for this module. Please complete the training to strengthen your security awareness skills.',
    showButton: true,
    buttonText: 'Start Training Now',
    buttonUrl: '{{TRAINING_URL}}',
    buttonColor: '#D4A836',
    showTips: true,
    tips: [
      'Always verify the sender\'s email address',
      'Hover over links before clicking',
      'When in doubt, contact IT directly',
      'Report suspicious emails immediately'
    ],
    footerText: 'Vasilis NetShield Security Training'
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTemplates();
    fetchAlertTemplates();
    fetchPhishingEmailTemplates();
  }, []);

  const fetchAlertTemplates = async () => {
    try {
      const res = await axios.get(`${API}/alert-templates`, { headers });
      if (res.data.templates) {
        setCustomAlertTemplates(res.data.templates);
      }
    } catch (err) {
      console.log('Using default alert templates');
    }
  };

  const fetchPhishingEmailTemplates = async () => {
    try {
      const res = await axios.get(`${API}/phishing/templates`, { headers });
      setPhishingEmailTemplates(res.data || []);
    } catch (err) {
      console.log('No phishing templates');
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/email-templates`, { headers });
      setTemplates(res.data.templates);
    } catch (err) {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (templateId) => {
    const template = templates[templateId];
    setEditingTemplate({ id: templateId, ...template });
    setFormData({
      subject: template.subject,
      body: template.body
    });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);

    try {
      await axios.put(`${API}/email-templates/${editingTemplate.id}`, formData, { headers });
      toast.success('Template saved');
      fetchTemplates();
      setEditingTemplate(null);
    } catch (err) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (templateId) => {
    if (!window.confirm('Reset this template to default? Your customizations will be lost.')) return;

    try {
      await axios.post(`${API}/email-templates/${templateId}/reset`, {}, { headers });
      toast.success('Template reset to default');
      fetchTemplates();
      setEditingTemplate(null);
    } catch (err) {
      toast.error('Failed to reset template');
    }
  };

  const handlePreview = async (templateId) => {
    try {
      const res = await axios.post(`${API}/email-templates/${templateId}/preview`, {}, { headers });
      setPreviewData(res.data);
    } catch (err) {
      toast.error('Failed to generate preview');
    }
  };

  const insertVariable = (variable) => {
    setFormData({ ...formData, body: formData.body + `{${variable}}` });
  };

  // Generate HTML from visual builder
  const generateAlertHtml = (data) => {
    const tipsHtml = data.showTips && data.tips.length > 0 ? `
      <div style="background:#1a1a24;border-radius:8px;padding:20px;margin-top:20px;text-align:left;">
        <p style="color:${data.titleColor};margin:0 0 10px 0;font-weight:bold;">Tips to Stay Safe:</p>
        <ul style="color:#8B949E;margin:0;padding-left:20px;">
          ${data.tips.map(tip => `<li style="margin:5px 0;">${tip}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    // Only show button if enabled and has text
    const buttonHtml = data.showButton && data.buttonText ? `
      <a href="${data.buttonUrl || '/training'}" style="display:inline-block;background:${data.titleColor};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;font-size:16px;margin-top:25px;">${data.buttonText}</a>
    ` : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:${data.backgroundColor};min-height:100vh;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="background:${data.cardColor};padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #30363D;text-align:center;">
      <div style="font-size:64px;margin-bottom:20px;">${data.icon}</div>
      <h1 style="color:${data.titleColor};margin:0 0 10px 0;font-size:28px;">${data.title}</h1>
      <p style="color:#8B949E;margin:0 0 30px 0;">${data.subtitle}</p>
      
      <div style="background:rgba(${parseInt(data.titleColor.slice(1,3),16)},${parseInt(data.titleColor.slice(3,5),16)},${parseInt(data.titleColor.slice(5,7),16)},0.1);border:1px solid ${data.titleColor}40;padding:20px;border-radius:12px;text-align:left;margin-bottom:20px;">
        <h3 style="color:${data.titleColor};margin:0 0 10px 0;">${data.messageTitle}</h3>
        <p style="color:#E6EDF3;margin:0;line-height:1.6;">${data.messageBody}</p>
      </div>
      
      ${tipsHtml}
      
      ${buttonHtml}
      
      <p style="color:#484F58;font-size:12px;margin-top:30px;">Powered by Vasilis NetShield Security Training</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Save alert template
  const saveAlertTemplate = async () => {
    if (!alertFormData.name || !alertFormData.title) {
      toast.error('Please fill in the template name and title');
      return;
    }

    setSaving(true);
    const html = generateAlertHtml(alertFormData);

    try {
      if (editingAlertTemplate?.id && editingAlertTemplate.id !== 'new') {
        await axios.put(`${API}/alert-templates/${editingAlertTemplate.id}`, {
          name: alertFormData.name,
          description: alertFormData.description,
          html: html,
          config: alertFormData // Store the visual config for future editing
        }, { headers });
        toast.success('Alert template updated');
      } else {
        await axios.post(`${API}/alert-templates`, {
          name: alertFormData.name,
          description: alertFormData.description,
          html: html,
          config: alertFormData
        }, { headers });
        toast.success('Alert template created');
      }
      fetchAlertTemplates();
      setEditingAlertTemplate(null);
    } catch (err) {
      toast.error('Failed to save alert template');
    } finally {
      setSaving(false);
    }
  };

  const deleteAlertTemplate = async (templateId) => {
    if (!window.confirm('Delete this alert template?')) return;
    try {
      await axios.delete(`${API}/alert-templates/${templateId}`, { headers });
      toast.success('Template deleted');
      fetchAlertTemplates();
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };

  const openAlertEditor = (template = null) => {
    if (template && template.config) {
      // Load existing config - ensure showButton is set
      setAlertFormData({
        ...template.config,
        showButton: template.config.showButton ?? false
      });
    } else if (template) {
      // Existing template without config - set defaults with name
      setAlertFormData({
        name: template.name || '',
        description: template.description || '',
        icon: '⚠️',
        title: 'Security Alert!',
        titleColor: '#FF6B6B',
        subtitle: 'This was a phishing simulation',
        backgroundColor: '#0D1117',
        cardColor: '#161B22',
        messageTitle: 'Hello {{USER_NAME}},',
        messageBody: 'You clicked on a simulated phishing link in the "{{CAMPAIGN_NAME}}" campaign.',
        showTips: true,
        tips: ['Always verify the sender\'s email address', 'Hover over links before clicking', 'When in doubt, contact IT directly', 'Report suspicious emails immediately'],
        showButton: false,
        buttonText: '',
        buttonUrl: '/training'
      });
    } else {
      // New template - reset form
      setAlertFormData({
        name: '',
        description: '',
        icon: '⚠️',
        title: 'Security Alert!',
        titleColor: '#FF6B6B',
        subtitle: 'This was a phishing simulation',
        backgroundColor: '#0D1117',
        cardColor: '#161B22',
        messageTitle: 'Hello {{USER_NAME}},',
        messageBody: 'You clicked on a simulated phishing link in the "{{CAMPAIGN_NAME}}" campaign.',
        showTips: true,
        tips: ['Always verify the sender\'s email address', 'Hover over links before clicking', 'When in doubt, contact IT directly', 'Report suspicious emails immediately'],
        showButton: false,
        buttonText: '',
        buttonUrl: '/training'
      });
    }
    setEditingAlertTemplate(template || { id: 'new' });
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
          <h1 className="text-2xl font-bold text-[#E8DDB5]">Email & Alert Templates</h1>
          <p className="text-gray-400">Customize notification emails and security awareness alerts</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#0D1117] border border-[#30363D]">
            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <Mail className="w-4 h-4 mr-2" />
              Notification Emails
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alert Pages
            </TabsTrigger>
          </TabsList>

          {/* Notification Emails Tab */}
          <TabsContent value="notifications" className="space-y-6">
            {/* Info Card */}
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">Template Variables</p>
                    <p className="text-blue-300/80">
                      Use curly braces to insert dynamic content. Example: <code className="bg-blue-500/20 px-1 rounded">{'{user_name}'}</code> will be replaced with the actual user's name.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Templates Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(templates).map(([id, template]) => (
                <Card key={id} className="bg-[#0f0f15] border-[#D4A836]/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[#E8DDB5] flex items-center gap-2 text-lg">
                        <span>{TEMPLATE_LABELS[id]?.icon}</span>
                        {TEMPLATE_LABELS[id]?.name || id}
                      </CardTitle>
                      {template.is_customized && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Customized
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-gray-500">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Subject:</p>
                      <p className="text-sm text-gray-300 truncate">{template.subject}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#D4A836]/30 text-[#E8DDB5]"
                        onClick={() => openEditDialog(id)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#D4A836]/30 text-[#E8DDB5]"
                        onClick={() => handlePreview(id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      {template.is_customized && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400"
                          onClick={() => handleReset(id)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Alert Pages Tab */}
          <TabsContent value="alerts" className="space-y-6">
            {/* Info Card */}
            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div className="text-sm text-orange-200">
                    <p className="font-medium mb-1">Alert Page Templates</p>
                    <p className="text-orange-300/80">
                      Create custom awareness pages shown when users click phishing links. Use the visual builder to customize icons, colors, titles, and messages without code.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Create New Button */}
            <div className="flex justify-end">
              <Button onClick={() => openAlertEditor()} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                <Plus className="w-4 h-4 mr-2" />
                Create Alert Template
              </Button>
            </div>

            {/* Alert Templates Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customAlertTemplates.map((alert) => (
                <Card key={alert.id} className="bg-[#161B22] border-[#D4A836]/20 hover:border-[#D4A836]/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{alert.config?.icon || '⚠️'}</span>
                        <div>
                          <h3 className="text-[#E8DDB5] font-medium">{alert.name}</h3>
                          <p className="text-xs text-gray-400">{alert.description}</p>
                        </div>
                      </div>
                      <Badge className="bg-[#D4A836]/20 text-[#D4A836] text-xs">Custom</Badge>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#D4A836]/30 text-[#E8DDB5]"
                        onClick={() => setAlertPreview(alert)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#D4A836]/30 text-[#E8DDB5]"
                        onClick={() => openAlertEditor(alert)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400"
                        onClick={() => deleteAlertTemplate(alert.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {customAlertTemplates.length === 0 && (
                <Card className="bg-[#161B22] border-[#30363D] border-dashed col-span-full">
                  <CardContent className="p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No Custom Alert Templates</h3>
                    <p className="text-gray-400 mb-4">Create your first custom alert page for phishing simulations</p>
                    <Button onClick={() => openAlertEditor()} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Notification Email Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f0f15] border-[#D4A836]/30">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                Edit {TEMPLATE_LABELS[editingTemplate?.id]?.name}
              </DialogTitle>
              <DialogDescription>
                Customize the email template. Use variables like {'{user_name}'} to insert dynamic content.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Available Variables */}
              <div className="p-3 bg-[#1a1a24] rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Available Variables (click to insert):</p>
                <div className="flex flex-wrap gap-1">
                  {editingTemplate?.available_variables?.map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="px-2 py-1 text-xs bg-[#D4A836]/20 text-[#D4A836] rounded hover:bg-[#D4A836]/30"
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label className="text-gray-400">Subject Line</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="bg-[#1a1a24] border-[#D4A836]/20 text-[#E8DDB5]"
                  placeholder="Email subject..."
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-400">Email Body</Label>
                  <Tabs value={editorMode} onValueChange={setEditorMode} className="w-auto">
                    <TabsList className="h-8 bg-[#1a1a24]">
                      <TabsTrigger value="visual" className="text-xs h-6 px-2">
                        <FileText className="w-3 h-3 mr-1" />
                        Visual
                      </TabsTrigger>
                      <TabsTrigger value="html" className="text-xs h-6 px-2">
                        <Code className="w-3 h-3 mr-1" />
                        HTML
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                {editorMode === 'visual' ? (
                  <Suspense fallback={<div className="h-[300px] bg-[#1a1a24] rounded flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#D4A836]" /></div>}>
                    <RichTextEditor
                      value={formData.body}
                      onChange={(html) => setFormData({ ...formData, body: html })}
                      placeholder="Write your email content..."
                    />
                  </Suspense>
                ) : (
                  <Textarea
                    id="template-body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="bg-[#1a1a24] border-[#D4A836]/20 text-[#E8DDB5] min-h-[300px] font-mono text-sm"
                    placeholder="Email body HTML..."
                    dir="ltr"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTemplate(null)} className="border-gray-600">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#D4A836] text-black hover:bg-[#C49A30]">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f0f15] border-[#D4A836]/30">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Email Preview</DialogTitle>
              <DialogDescription>
                This is how the email will appear to recipients (with sample data).
              </DialogDescription>
            </DialogHeader>

            {previewData && (
              <div className="space-y-4 mt-4">
                <div className="p-3 bg-[#1a1a24] rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Subject:</p>
                  <p className="text-[#E8DDB5] font-medium">{previewData.subject}</p>
                </div>

                <div className="border border-[#D4A836]/20 rounded-lg overflow-hidden">
                  <div className="bg-[#1a1a24] p-6">
                    <div 
                      className="prose prose-invert max-w-none"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#E8DDB5' }}
                      dangerouslySetInnerHTML={{ __html: previewData.body }}
                    />
                  </div>
                </div>

                <Button onClick={() => setPreviewData(null)} className="w-full bg-[#D4A836] text-black hover:bg-[#C49A30]">
                  Close Preview
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Alert Preview Dialog */}
        <Dialog open={!!alertPreview} onOpenChange={() => setAlertPreview(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f0f15] border-[#D4A836]/30">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Alert Preview: {alertPreview?.name}</DialogTitle>
              <DialogDescription>
                This is how the alert page will appear to users who click phishing links.
              </DialogDescription>
            </DialogHeader>

            {alertPreview && (
              <div className="space-y-4 mt-4">
                <div className="border border-[#D4A836]/20 rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={alertPreview.html
                      .replace(/\{\{USER_NAME\}\}/g, 'John Doe')
                      .replace(/\{\{USER_EMAIL\}\}/g, 'john.doe@example.com')
                      .replace(/\{\{CAMPAIGN_NAME\}\}/g, 'Security Test Campaign')
                    }
                    className="w-full h-[500px] bg-[#0D1117]"
                    title="Alert Preview"
                  />
                </div>
                <Button onClick={() => setAlertPreview(null)} className="w-full bg-[#D4A836] text-black hover:bg-[#C49A30]">
                  Close Preview
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Visual Alert Template Builder Dialog */}
        <Dialog open={!!editingAlertTemplate} onOpenChange={() => setEditingAlertTemplate(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-[#0f0f15] border-[#D4A836]/30">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingAlertTemplate?.id === 'new' ? 'Create Alert Template' : 'Edit Alert Template'}
              </DialogTitle>
              <DialogDescription>
                Design your alert page visually. Changes are reflected in the live preview.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6 mt-4">
              {/* Left: Form Controls */}
              <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#D4A836]">Basic Information</h3>
                  <div>
                    <Label className="text-gray-400 text-xs">Template Name *</Label>
                    <Input
                      value={alertFormData.name}
                      onChange={(e) => setAlertFormData({ ...alertFormData, name: e.target.value })}
                      placeholder="e.g., Phishing Warning Alert"
                      className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Description</Label>
                    <Input
                      value={alertFormData.description}
                      onChange={(e) => setAlertFormData({ ...alertFormData, description: e.target.value })}
                      placeholder="Brief description"
                      className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                    />
                  </div>
                </div>

                {/* Icon & Colors */}
                <div className="space-y-3 pt-4 border-t border-[#30363D]">
                  <h3 className="text-sm font-medium text-[#D4A836] flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Icon & Colors
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-400 text-xs">Icon</Label>
                      <Select value={alertFormData.icon} onValueChange={(v) => setAlertFormData({ ...alertFormData, icon: v })}>
                        <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#161B22] border-[#30363D]">
                          {TEMPLATE_ICONS.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <span className="flex items-center gap-2">{icon.value} {icon.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Accent Color</Label>
                      <Select value={alertFormData.titleColor} onValueChange={(v) => setAlertFormData({ ...alertFormData, titleColor: v })}>
                        <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#161B22] border-[#30363D]">
                          {COLOR_PRESETS.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: color.value }}></span>
                                {color.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-3 pt-4 border-t border-[#30363D]">
                  <h3 className="text-sm font-medium text-[#D4A836] flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Title & Subtitle
                  </h3>
                  <div>
                    <Label className="text-gray-400 text-xs">Main Title</Label>
                    <Input
                      value={alertFormData.title}
                      onChange={(e) => setAlertFormData({ ...alertFormData, title: e.target.value })}
                      placeholder="Security Alert!"
                      className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Subtitle</Label>
                    <Input
                      value={alertFormData.subtitle}
                      onChange={(e) => setAlertFormData({ ...alertFormData, subtitle: e.target.value })}
                      placeholder="This was a phishing simulation"
                      className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                    />
                  </div>
                </div>

                {/* Message Content */}
                <div className="space-y-3 pt-4 border-t border-[#30363D]">
                  <h3 className="text-sm font-medium text-[#D4A836]">Message Content</h3>
                  <div>
                    <Label className="text-gray-400 text-xs">Greeting (use {'{{USER_NAME}}'} for personalization)</Label>
                    <Input
                      value={alertFormData.messageTitle}
                      onChange={(e) => setAlertFormData({ ...alertFormData, messageTitle: e.target.value })}
                      placeholder="Hello {{USER_NAME}},"
                      className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Message Body (use {'{{CAMPAIGN_NAME}}'} for campaign)</Label>
                    <Textarea
                      value={alertFormData.messageBody}
                      onChange={(e) => setAlertFormData({ ...alertFormData, messageBody: e.target.value })}
                      placeholder="You clicked on a simulated phishing link..."
                      className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Tips Section */}
                <div className="space-y-3 pt-4 border-t border-[#30363D]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#D4A836]">Safety Tips</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertFormData.showTips}
                        onChange={(e) => setAlertFormData({ ...alertFormData, showTips: e.target.checked })}
                        className="rounded border-[#30363D]"
                      />
                      <span className="text-xs text-gray-400">Show tips section</span>
                    </label>
                  </div>
                  {alertFormData.showTips && (
                    <div className="space-y-2">
                      {alertFormData.tips.map((tip, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={tip}
                            onChange={(e) => {
                              const newTips = [...alertFormData.tips];
                              newTips[index] = e.target.value;
                              setAlertFormData({ ...alertFormData, tips: newTips });
                            }}
                            className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newTips = alertFormData.tips.filter((_, i) => i !== index);
                              setAlertFormData({ ...alertFormData, tips: newTips });
                            }}
                            className="border-red-500/30 text-red-400 px-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAlertFormData({ ...alertFormData, tips: [...alertFormData.tips, ''] })}
                        className="border-[#D4A836]/30 text-[#D4A836]"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Tip
                      </Button>
                    </div>
                  )}
                </div>

                {/* Button */}
                <div className="space-y-3 pt-4 border-t border-[#30363D]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#D4A836]">Call-to-Action Button</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertFormData.showButton || false}
                        onChange={(e) => setAlertFormData({ ...alertFormData, showButton: e.target.checked })}
                        className="rounded border-[#30363D]"
                      />
                      <span className="text-xs text-gray-400">Show button</span>
                    </label>
                  </div>
                  {alertFormData.showButton && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-400 text-xs">Button Text</Label>
                        <Input
                          value={alertFormData.buttonText}
                          onChange={(e) => setAlertFormData({ ...alertFormData, buttonText: e.target.value })}
                          placeholder="Start Training Now"
                          className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 text-xs">Button URL</Label>
                        <Input
                          value={alertFormData.buttonUrl}
                          onChange={(e) => setAlertFormData({ ...alertFormData, buttonUrl: e.target.value })}
                          placeholder="/training"
                          className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#D4A836]">Live Preview</h3>
                <div className="border border-[#30363D] rounded-lg overflow-hidden bg-[#0D1117]">
                  <iframe
                    srcDoc={generateAlertHtml(alertFormData)
                      .replace(/\{\{USER_NAME\}\}/g, 'John Doe')
                      .replace(/\{\{CAMPAIGN_NAME\}\}/g, 'Test Campaign')
                    }
                    className="w-full h-[500px]"
                    title="Live Preview"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[#30363D]">
              <Button variant="outline" onClick={() => setEditingAlertTemplate(null)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={saveAlertTemplate} disabled={saving} className="bg-[#D4A836] text-black hover:bg-[#C49A30]">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
