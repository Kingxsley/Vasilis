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
import { Mail, Edit2, Eye, RotateCcw, Save, Loader2, Info, CheckCircle, Code, FileText } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// Lazy load RichTextEditor
const RichTextEditor = lazy(() => import('../components/common/RichTextEditor'));

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TEMPLATE_LABELS = {
  welcome: { name: 'Welcome Email', icon: '👋', category: 'notification' },
  password_reset: { name: 'Password Reset (Admin)', icon: '🔐', category: 'notification' },
  forgot_password: { name: 'Forgot Password', icon: '🔑', category: 'notification' },
  password_expiry_reminder: { name: 'Password Expiry Reminder', icon: '⏰', category: 'notification' },
  training_assigned: { name: 'Training Assigned', icon: '📚', category: 'notification' },
  training_reminder: { name: 'Training Reminder', icon: '⏰', category: 'notification' }
};

const DEFAULT_ALERT_TEMPLATES = [
  {
    id: 'default_alert',
    name: 'Default Security Alert',
    description: 'Standard phishing awareness alert',
    preview: '⚠️ Security Alert - Yellow warning theme',
    html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial,sans-serif;background:#0D1117;min-height:100vh;">
<div style="background:#161B22;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #30363D;">
<div style="font-size:64px;margin-bottom:20px;">⚠️</div>
<h1 style="color:#FF6B6B;margin-bottom:10px;">Security Alert!</h1>
<p style="color:#8B949E;margin-bottom:30px;">This was a phishing simulation</p>
<div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.25);padding:20px;border-radius:12px;text-align:left;">
<h3 style="color:#FF6B6B;margin-top:0;">Hello {{USER_NAME}},</h3>
<p style="color:#E6EDF3;">You clicked on a simulated phishing link in the "<strong>{{CAMPAIGN_NAME}}</strong>" campaign.</p>
<p style="color:#E6EDF3;">This was a test to help you identify potential threats.</p>
</div>
<p style="color:#8B949E;margin-top:20px;font-size:14px;">Training has been assigned to help you learn more.</p>
</div></div>`
  },
  {
    id: 'phishing_caught',
    name: 'Phishing Caught',
    description: 'You\'ve been caught theme',
    preview: '🎣 Phishing Detected - Dark theme',
    html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#0D1117,#161B22);min-height:100vh;">
<div style="background:#161B22;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #30363D;">
<div style="font-size:64px;margin-bottom:20px;">🎣</div>
<h1 style="color:#FF6B6B;margin-bottom:10px;">Phishing Detected!</h1>
<p style="color:#8B949E;margin-bottom:30px;">You've been caught in a training exercise</p>
<div style="background:rgba(212,168,54,0.1);border-left:4px solid #D4A836;padding:20px;border-radius:8px;text-align:left;">
<p style="color:#E8DDB5;margin:0;"><strong>User:</strong> {{USER_NAME}}</p>
<p style="color:#E8DDB5;margin:10px 0 0 0;"><strong>Campaign:</strong> {{CAMPAIGN_NAME}}</p>
</div>
<p style="color:#8B949E;margin-top:20px;font-size:14px;">Security training will help you recognize threats.</p>
</div></div>`
  },
  {
    id: 'credential_warning',
    name: 'Credential Warning',
    description: 'Critical credential submission alert',
    preview: '🔴 Critical Alert - Red warning theme',
    html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial,sans-serif;background:#1a0a0a;min-height:100vh;">
<div style="background:#2a0f0f;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:2px solid #FF4444;">
<div style="font-size:64px;margin-bottom:20px;">🚨</div>
<h1 style="color:#FF4444;margin-bottom:10px;">CRITICAL: Credentials Submitted!</h1>
<p style="color:#ffaaaa;margin-bottom:30px;">You entered login credentials on a simulated phishing page</p>
<div style="background:rgba(255,68,68,0.1);border:1px solid #FF4444;padding:20px;border-radius:8px;text-align:left;">
<p style="color:#ffcccc;margin:0;"><strong>{{USER_NAME}}</strong>, this was a test. In a real attack, your credentials would now be compromised.</p>
<p style="color:#ffaaaa;margin:15px 0 0 0;">Campaign: <strong>{{CAMPAIGN_NAME}}</strong></p>
</div>
<p style="color:#FF4444;margin-top:20px;font-size:14px;font-weight:bold;">Mandatory training has been assigned.</p>
</div></div>`
  },
  {
    id: 'qr_scan_alert',
    name: 'QR Code Scan Alert',
    description: 'Alert for QR code scans',
    preview: '📱 QR Code Alert - Modern theme',
    html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial,sans-serif;background:#0f0f1a;min-height:100vh;">
<div style="background:#1a1a2e;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #4a4a6a;">
<div style="font-size:64px;margin-bottom:20px;">📱</div>
<h1 style="color:#9966FF;margin-bottom:10px;">QR Code Security Test</h1>
<p style="color:#a0a0c0;margin-bottom:30px;">You scanned a simulated malicious QR code</p>
<div style="background:rgba(153,102,255,0.1);border-left:4px solid #9966FF;padding:20px;border-radius:8px;text-align:left;">
<p style="color:#c0c0ff;margin:0;">Hello <strong>{{USER_NAME}}</strong>,</p>
<p style="color:#a0a0c0;margin:10px 0 0 0;">This QR code was part of the "{{CAMPAIGN_NAME}}" security awareness campaign.</p>
</div>
<p style="color:#a0a0c0;margin-top:20px;font-size:14px;">Always verify QR codes before scanning them.</p>
</div></div>`
  }
];

export default function EmailTemplates() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ subject: '', body: '' });
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'html'

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/email-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      await axios.put(`${API}/email-templates/${editingTemplate.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      await axios.post(`${API}/email-templates/${templateId}/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Template reset to default');
      fetchTemplates();
      setEditingTemplate(null);
    } catch (err) {
      toast.error('Failed to reset template');
    }
  };

  const handlePreview = async (templateId) => {
    try {
      const res = await axios.post(`${API}/email-templates/${templateId}/preview`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewData(res.data);
    } catch (err) {
      toast.error('Failed to generate preview');
    }
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('template-body');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = formData.body.substring(0, start) + `{${variable}}` + formData.body.substring(end);
      setFormData({ ...formData, body: newBody });
    } else {
      setFormData({ ...formData, body: formData.body + `{${variable}}` });
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#E8DDB5]">Email Templates</h1>
          <p className="text-gray-400">Customize the emails sent to users</p>
        </div>

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

        {/* Edit Dialog */}
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
                <p className="text-xs text-gray-500">
                  Use Visual mode for easy editing, or HTML mode for advanced customization.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingTemplate(null)}
                  className="border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#D4A836] text-black hover:bg-[#C49A30]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Template
                    </>
                  )}
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
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        color: '#E8DDB5'
                      }}
                      dangerouslySetInnerHTML={{ __html: previewData.body }}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => setPreviewData(null)}
                  className="w-full bg-[#D4A836] text-black hover:bg-[#C49A30]"
                >
                  Close Preview
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
