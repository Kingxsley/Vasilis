import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Mail, Plus, Play, Pause, CheckCircle, Eye, MousePointer, 
  Send, Users, Building2, Trash2, BarChart3, AlertTriangle,
  FileText, Loader2, RefreshCw, Download, FileSpreadsheet, Link, Bold, Italic, Clock, Calendar,
  Image, Upload, Paperclip, X, Copy, Edit, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Checkbox } from '../components/ui/checkbox';

// Lazy load the RichTextEditor
const RichTextEditor = lazy(() => import('../components/common/RichTextEditor'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PhishingSimulations() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignTargets, setCampaignTargets] = useState([]);
  const [campaignStats, setCampaignStats] = useState(null);
  
  // Bulk selection states
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);
  
  // Alert templates
  const [alertTemplates, setAlertTemplates] = useState([]);
  
  // Custom email templates
  const [customEmailTemplates, setCustomEmailTemplates] = useState([]);
  
  // Dialog states
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null); // For editing existing campaigns
  const [showCustomPageEditor, setShowCustomPageEditor] = useState(false); // Collapsible custom page editor
  
  // Form states
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    organization_ids: [],  // Changed to array for multi-org support
    template_id: '',
    target_user_ids: [],
    scheduled_at: '',
    launch_immediately: true,
    assigned_module_id: '',
    click_page_html: '',
    risk_level: 'medium',  // Default risk level
    alert_template_id: '',  // Alert template to show on click
    custom_email_template_id: '',  // Custom email template for sending
    scenario_type: 'phishing_email'  // Default scenario type
  });
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    sender_name: '',
    sender_email: '',
    body_html: '',
    button_text: '',
    attachments: []
  });
  
  // Preview and Image Library states
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [mediaImages, setMediaImages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Campaign filter states
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [trainingModules, setTrainingModules] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  // Copy embed/tracking URL for a phishing campaign
  const copyEmbedUrl = async (campaignId) => {
    const embedUrl = `${API}/track/${campaignId}`;
    try {
      await navigator.clipboard.writeText(embedUrl);
      setCopiedUrl(campaignId);
      toast.success('Embed URL copied to clipboard');
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = embedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedUrl(campaignId);
      toast.success('Embed URL copied to clipboard');
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, templatesRes, orgsRes, usersRes, modulesRes] = await Promise.all([
        axios.get(`${API}/phishing/campaigns`, { headers }),
        axios.get(`${API}/phishing/templates`, { headers }),
        axios.get(`${API}/organizations`, { headers }),
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/training/modules`, { headers }).catch(() => ({ data: [] }))
      ]);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setOrganizations(orgsRes.data);
      setUsers(usersRes.data);
      setTrainingModules(modulesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultTemplates = async () => {
    try {
      const res = await axios.post(`${API}/phishing/templates/seed-defaults`, {}, { headers });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error('Failed to seed templates');
    }
  };

  // Default alert templates
  const DEFAULT_ALERT_TEMPLATES = [
    { id: 'default', name: 'Default Alert', html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial;background:#0D1117;min-height:100vh;"><div style="background:#161B22;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #30363D;"><div style="font-size:64px;">⚠️</div><h1 style="color:#FF6B6B;">Security Alert!</h1><p style="color:#8B949E;">This was a phishing simulation</p><div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.25);padding:20px;border-radius:12px;text-align:left;"><h3 style="color:#FF6B6B;">Hello {{USER_NAME}},</h3><p style="color:#E6EDF3;">You clicked on a simulated phishing link.</p></div></div></div>` },
    { id: 'critical', name: 'Critical Alert', html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial;background:#1a0a0a;min-height:100vh;"><div style="background:#2a0f0f;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:2px solid #FF4444;"><div style="font-size:64px;">🚨</div><h1 style="color:#FF4444;">CRITICAL!</h1><p style="color:#ffaaaa;">You entered credentials on a phishing page</p><div style="background:rgba(255,68,68,0.1);border:1px solid #FF4444;padding:20px;border-radius:8px;text-align:left;"><p style="color:#ffcccc;">{{USER_NAME}}, in a real attack your credentials would be compromised.</p></div></div></div>` },
    { id: 'qr', name: 'QR Code Alert', html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial;background:#0f0f1a;min-height:100vh;"><div style="background:#1a1a2e;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;border:1px solid #4a4a6a;"><div style="font-size:64px;">📱</div><h1 style="color:#9966FF;">QR Code Security Test</h1><p style="color:#a0a0c0;">You scanned a simulated malicious QR code</p><div style="background:rgba(153,102,255,0.1);border-left:4px solid #9966FF;padding:20px;border-radius:8px;text-align:left;"><p style="color:#c0c0ff;">{{USER_NAME}}, always verify QR codes before scanning.</p></div></div></div>` }
  ];

  // Fetch alert templates
  const fetchAlertTemplates = async () => {
    try {
      const res = await axios.get(`${API}/alert-templates`, { headers });
      setAlertTemplates([...DEFAULT_ALERT_TEMPLATES, ...(res.data.templates || [])]);
    } catch (err) {
      setAlertTemplates(DEFAULT_ALERT_TEMPLATES);
    }
  };

  useEffect(() => {
    fetchAlertTemplates();
    fetchCustomEmailTemplates();
  }, []);

  // Fetch custom email templates
  const fetchCustomEmailTemplates = async () => {
    try {
      const res = await axios.get(`${API}/custom-email-templates`, { headers });
      setCustomEmailTemplates(res.data.templates || []);
    } catch (err) {
      console.log('No custom email templates');
    }
  };

  // Fetch media images for library
  const fetchMediaImages = async () => {
    setLoadingMedia(true);
    try {
      const res = await axios.get(`${API}/phishing/media`, { headers });
      setMediaImages(res.data.images || []);
    } catch (err) {
      // If endpoint doesn't exist yet, set empty
      setMediaImages([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Upload image for phishing emails
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API}/phishing/media/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` }
        // Don't set Content-Type - let axios handle multipart/form-data boundary
      });
      toast.success('Image uploaded');
      fetchMediaImages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete image from library
  const deleteMediaImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await axios.delete(`${API}/phishing/media/${imageId}`, { headers });
      toast.success('Image deleted');
      fetchMediaImages();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // Generate email preview
  const generatePreview = () => {
    if (!newTemplate.body_html) {
      toast.error('Please write some email content first');
      return;
    }

    const buttonText = newTemplate.button_text || 'Click Here';
    const previewContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .cta-button { 
      display: inline-block; 
      background: #0066cc; 
      color: white !important; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 5px; 
      margin: 20px 0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${newTemplate.body_html.replace(/\{\{USER_NAME\}\}/g, 'John Doe')}
    <p style="text-align: center; margin: 30px 0;">
      <a href="#" class="cta-button">${buttonText}</a>
    </p>
  </div>
</body>
</html>`;
    
    setPreviewHtml(previewContent);
    setShowPreview(true);
  };

  // Insert image URL into template body
  const insertImageToBody = (url) => {
    const imgTag = `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
    setNewTemplate({
      ...newTemplate,
      body_html: newTemplate.body_html + imgTag
    });
    toast.success('Image inserted into body');
  };

  // Add image as attachment
  const addAttachment = (image) => {
    if (newTemplate.attachments.some(a => a.image_id === image.image_id)) {
      toast.error('Image already attached');
      return;
    }
    setNewTemplate({
      ...newTemplate,
      attachments: [...newTemplate.attachments, image]
    });
    toast.success('Image added as attachment');
  };

  // Remove attachment
  const removeAttachment = (imageId) => {
    setNewTemplate({
      ...newTemplate,
      attachments: newTemplate.attachments.filter(a => a.image_id !== imageId)
    });
  };

  // Filter campaigns by status
  const filteredCampaigns = campaigns.filter(c => {
    if (campaignFilter === 'all') return true;
    if (campaignFilter === 'active') return c.status === 'active';
    if (campaignFilter === 'past') return c.status === 'completed';
    if (campaignFilter === 'scheduled') return c.status === 'scheduled';
    if (campaignFilter === 'draft') return c.status === 'draft';
    return true;
  });

  const createCampaign = async () => {
    if (!newCampaign.name || newCampaign.organization_ids.length === 0 || !newCampaign.template_id || newCampaign.target_user_ids.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (!newCampaign.launch_immediately && !newCampaign.scheduled_at) {
      toast.error('Please select a schedule date/time');
      return;
    }
    
    try {
      // Create campaigns for each selected organization
      let createdCount = 0;
      for (const orgId of newCampaign.organization_ids) {
        const orgUsers = newCampaign.target_user_ids.filter(uid => 
          users.find(u => u.user_id === uid && u.organization_id === orgId)
        );
        
        if (orgUsers.length === 0) continue;
        
        const org = organizations.find(o => o.organization_id === orgId);
        const payload = {
          name: newCampaign.organization_ids.length > 1 
            ? `${newCampaign.name} - ${org?.name || orgId}`
            : newCampaign.name,
          organization_id: orgId,
          template_id: newCampaign.template_id,
          target_user_ids: orgUsers,
          scheduled_at: newCampaign.scheduled_at ? new Date(newCampaign.scheduled_at).toISOString() : null,
          assigned_module_id: newCampaign.assigned_module_id || null,
          click_page_html: newCampaign.click_page_html || null,
          alert_template_id: newCampaign.alert_template_id || null,
          risk_level: newCampaign.risk_level || 'medium',
          custom_email_template_id: newCampaign.custom_email_template_id || null,
          scenario_type: newCampaign.scenario_type || 'phishing_email'
        };
        
        await axios.post(`${API}/phishing/campaigns`, payload, { headers });
        createdCount++;
      }
      toast.success(`${createdCount} campaign(s) created successfully`);
      setShowNewCampaign(false);
      resetCampaignForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create campaign');
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.sender_name || !newTemplate.sender_email || !newTemplate.body_html) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Wrap the body content with proper HTML structure and add tracking button
    const buttonText = newTemplate.button_text || 'Click Here';
    const wrappedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .cta-button { 
      display: inline-block; 
      background: #0066cc; 
      color: white !important; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 5px; 
      margin: 20px 0;
      font-weight: bold;
    }
    .cta-button:hover { background: #0052a3; }
  </style>
</head>
<body>
  <div class="email-container">
    ${newTemplate.body_html}
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{TRACKING_LINK}}" class="cta-button">${buttonText}</a>
    </p>
  </div>
</body>
</html>`;

    try {
      await axios.post(`${API}/phishing/templates`, {
        ...newTemplate,
        body_html: wrappedHtml
      }, { headers });
      toast.success('Template created successfully');
      setShowNewTemplate(false);
      setNewTemplate({ name: '', subject: '', sender_name: '', sender_email: '', body_html: '', button_text: '', attachments: [] });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create template');
    }
  };

  const launchCampaign = async (campaignId) => {
    try {
      const res = await axios.post(`${API}/phishing/campaigns/${campaignId}/launch`, {}, { headers });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to launch campaign');
    }
  };

  const pauseCampaign = async (campaignId) => {
    try {
      await axios.post(`${API}/phishing/campaigns/${campaignId}/pause`, {}, { headers });
      toast.success('Campaign paused');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to pause campaign');
    }
  };

  const completeCampaign = async (campaignId) => {
    try {
      await axios.post(`${API}/phishing/campaigns/${campaignId}/complete`, {}, { headers });
      toast.success('Campaign completed');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete campaign');
    }
  };

  const deleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await axios.delete(`${API}/phishing/campaigns/${campaignId}`, { headers });
      toast.success('Campaign deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete campaign');
    }
  };

  // Toggle selection for bulk delete
  const toggleCampaignSelection = (campaignId) => {
    setSelectedCampaignIds(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  // Select all visible campaigns
  const selectAllCampaigns = () => {
    if (selectedCampaignIds.length === filteredCampaigns.length) {
      setSelectedCampaignIds([]);
    } else {
      setSelectedCampaignIds(filteredCampaigns.map(c => c.campaign_id));
    }
  };

  // Bulk delete campaigns
  const bulkDeleteCampaigns = async () => {
    try {
      // Delete campaigns one by one (backend doesn't have bulk delete endpoint yet)
      for (const campaignId of selectedCampaignIds) {
        await axios.delete(`${API}/phishing/campaigns/${campaignId}`, { headers });
      }
      toast.success(`${selectedCampaignIds.length} campaign(s) deleted`);
      setSelectedCampaignIds([]);
      setShowBulkDeleteConfirm(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete some campaigns');
      fetchData();
    }
  };

  const duplicateCampaign = async (campaignId) => {
    try {
      const res = await axios.post(`${API}/phishing/campaigns/${campaignId}/duplicate`, {}, { headers });
      toast.success(`Campaign duplicated: ${res.data.name}. You can now edit it before launching.`);
      // Open the edit dialog with the duplicated campaign
      editCampaign(res.data);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to duplicate campaign');
    }
  };

  const editCampaign = async (campaign) => {
    setEditingCampaign(campaign);
    
    // Fetch existing targets for this campaign
    let existingTargetIds = [];
    try {
      const targetsRes = await axios.get(`${API}/phishing/campaigns/${campaign.campaign_id}/targets`, { headers });
      existingTargetIds = targetsRes.data.map(t => t.user_id);
    } catch (err) {
      console.error('Failed to load campaign targets:', err);
    }
    
    setNewCampaign({
      name: campaign.name,
      organization_ids: campaign.organization_id ? [campaign.organization_id] : [],
      template_id: campaign.template_id || '',
      target_user_ids: existingTargetIds,
      scheduled_at: campaign.scheduled_at || '',
      launch_immediately: false
    });
    setShowNewCampaign(true);
  };

  const saveCampaignChanges = async () => {
    if (!editingCampaign) return;
    
    try {
      await axios.put(`${API}/phishing/campaigns/${editingCampaign.campaign_id}`, {
        name: newCampaign.name,
        organization_id: newCampaign.organization_ids[0],
        template_id: newCampaign.template_id,
        target_user_ids: newCampaign.target_user_ids,
        scheduled_at: newCampaign.scheduled_at || null
      }, { headers });
      
      toast.success('Campaign updated successfully');
      setShowNewCampaign(false);
      setEditingCampaign(null);
      resetCampaignForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update campaign');
    }
  };

  const resetCampaignForm = () => {
    setNewCampaign({
      name: '',
      organization_ids: [],
      template_id: '',
      target_user_ids: [],
      scheduled_at: '',
      launch_immediately: true,
      assigned_module_id: '',
      click_page_html: '',
      risk_level: 'medium',
      alert_template_id: '',
      custom_email_template_id: '',
      scenario_type: 'phishing_email'
    });
    setEditingCampaign(null);
    setShowCustomPageEditor(false);
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await axios.delete(`${API}/phishing/templates/${templateId}`, { headers });
      toast.success('Template deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete template');
    }
  };

  const viewCampaignDetails = async (campaign) => {
    setSelectedCampaign(campaign);
    setShowCampaignDetails(true);
    
    try {
      const [targetsRes, statsRes] = await Promise.all([
        axios.get(`${API}/phishing/campaigns/${campaign.campaign_id}/targets`, { headers }),
        axios.get(`${API}/phishing/campaigns/${campaign.campaign_id}/stats`, { headers })
      ]);
      setCampaignTargets(targetsRes.data);
      setCampaignStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load campaign details');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-400',
      scheduled: 'bg-purple-500/20 text-purple-400',
      active: 'bg-green-500/20 text-green-400',
      paused: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-blue-500/20 text-blue-400'
    };
    return <Badge className={colors[status] || colors.draft}>{status}</Badge>;
  };

  const orgUsers = users.filter(u => u.organization_id === newCampaign.organization_id);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="phishing-simulations-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Phishing Simulations
            </h1>
            <p className="text-gray-400">Create and manage phishing email campaigns to test employee awareness</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={fetchData}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#161B22] border border-[#30363D]">
            <TabsTrigger 
              value="campaigns" 
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
              data-testid="campaigns-tab"
            >
              <Mail className="w-4 h-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger 
              value="templates"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
              data-testid="templates-tab"
            >
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-[#E8DDB5]">All Campaigns</h2>
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="w-36 bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]" data-testid="campaign-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="past">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {selectedCampaignIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="bulk-delete-campaigns-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedCampaignIds.length})
                  </Button>
                )}
              </div>
              <Button 
                onClick={() => setShowNewCampaign(true)}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                data-testid="new-campaign-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="py-12 text-center">
                  <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">
                    {campaignFilter === 'all' ? 'No campaigns yet' : `No ${campaignFilter} campaigns`}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    {campaignFilter === 'all' 
                      ? 'Create your first phishing simulation campaign'
                      : 'Try selecting a different filter'}
                  </p>
                  {campaignFilter === 'all' && (
                    <Button 
                      onClick={() => setShowNewCampaign(true)}
                      className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {/* Select All checkbox */}
                <div className="flex items-center gap-2 px-2">
                  <Checkbox
                    checked={selectedCampaignIds.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                    onCheckedChange={selectAllCampaigns}
                    className="border-[#30363D] data-[state=checked]:bg-[#D4A836]"
                    data-testid="select-all-campaigns"
                  />
                  <span className="text-sm text-gray-400">Select All ({filteredCampaigns.length})</span>
                </div>
                {filteredCampaigns.map((campaign) => (
                  <Card 
                    key={campaign.campaign_id} 
                    className={`bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/30 transition-colors ${
                      selectedCampaignIds.includes(campaign.campaign_id) ? 'border-[#D4A836]' : ''
                    }`}
                    data-testid={`campaign-${campaign.campaign_id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedCampaignIds.includes(campaign.campaign_id)}
                            onCheckedChange={() => toggleCampaignSelection(campaign.campaign_id)}
                            className="border-[#30363D] data-[state=checked]:bg-[#D4A836] mt-1"
                            data-testid={`select-campaign-${campaign.campaign_id}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-[#E8DDB5]">{campaign.name}</h3>
                              {getStatusBadge(campaign.status)}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {campaign.total_targets} targets
                              </span>
                              <span className="flex items-center gap-1">
                                <Send className="w-4 h-4" />
                                {campaign.emails_sent} sent
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {campaign.emails_opened} opened
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer className="w-4 h-4" />
                                {campaign.links_clicked} clicked
                              </span>
                              {campaign.scheduled_at && campaign.status === 'scheduled' && (
                                <span className="flex items-center gap-1 text-purple-400">
                                  <Clock className="w-4 h-4" />
                                  Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewCampaignDetails(campaign)}
                            className="border-[#D4A836]/30 text-[#E8DDB5]"
                            data-testid={`view-campaign-${campaign.campaign_id}`}
                          >
                            <BarChart3 className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                          {campaign.status === 'draft' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => editCampaign(campaign)}
                                className="border-[#D4A836]/30 text-[#E8DDB5]"
                                data-testid={`edit-campaign-${campaign.campaign_id}`}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => launchCampaign(campaign.campaign_id)}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`launch-campaign-${campaign.campaign_id}`}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Launch
                              </Button>
                            </>
                          )}
                          {campaign.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editCampaign(campaign)}
                              className="border-[#D4A836]/30 text-[#E8DDB5]"
                              data-testid={`edit-campaign-${campaign.campaign_id}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                          {campaign.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => pauseCampaign(campaign.campaign_id)}
                                className="border-yellow-500/30 text-yellow-400"
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => completeCampaign(campaign.campaign_id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                              </Button>
                            </>
                          )}
                          {campaign.status === 'paused' && (
                            <Button
                              size="sm"
                              onClick={() => launchCampaign(campaign.campaign_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyEmbedUrl(campaign.campaign_id)}
                            className={`border-[#D4A836]/30 hover:bg-[#D4A836]/10 ${copiedUrl === campaign.campaign_id ? 'text-green-400 border-green-400/30' : 'text-[#D4A836]'}`}
                            data-testid={`copy-link-${campaign.campaign_id}`}
                            title="Copy embed link"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => duplicateCampaign(campaign.campaign_id)}
                            className="border-[#D4A836]/30 text-[#D4A836] hover:bg-[#D4A836]/10"
                            data-testid={`duplicate-campaign-${campaign.campaign_id}`}
                            title="Duplicate campaign"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteCampaign(campaign.campaign_id)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            data-testid={`delete-campaign-${campaign.campaign_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#E8DDB5]">Email Templates</h2>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={seedDefaultTemplates}
                  className="border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="seed-templates-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Defaults
                </Button>
                <Button 
                  onClick={() => setShowNewTemplate(true)}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  data-testid="new-template-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : templates.length === 0 ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No templates yet</h3>
                  <p className="text-gray-400 mb-4">Create phishing email templates or add default ones</p>
                  <div className="flex justify-center gap-3">
                    <Button 
                      variant="outline"
                      onClick={seedDefaultTemplates}
                      className="border-[#D4A836]/30 text-[#E8DDB5]"
                    >
                      Add Default Templates
                    </Button>
                    <Button 
                      onClick={() => setShowNewTemplate(true)}
                      className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                    >
                      Create Custom
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card 
                    key={template.template_id} 
                    className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/30 transition-colors"
                    data-testid={`template-${template.template_id}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-[#E8DDB5]">{template.name}</CardTitle>
                      <CardDescription className="text-gray-400 truncate">
                        {template.subject}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-400 mb-4">
                        <p><span className="text-gray-500">From:</span> {template.sender_name} &lt;{template.sender_email}&gt;</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.template_id)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        data-testid={`delete-template-${template.template_id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New Campaign Dialog */}
        <Dialog open={showNewCampaign} onOpenChange={(open) => {
          setShowNewCampaign(open);
          if (!open) {
            resetCampaignForm();
          }
        }}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingCampaign ? 'Edit Campaign' : 'Create Phishing Campaign'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingCampaign 
                  ? 'Modify campaign settings, template, and target users before launching'
                  : 'Set up a new phishing simulation to test employee awareness'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="Q1 Security Awareness Test"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="campaign-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Organization</Label>
                <Select
                  value={newCampaign.organization_id}
                  onValueChange={(value) => setNewCampaign({...newCampaign, organization_id: value, target_user_ids: []})}
                >
                  <SelectTrigger className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]" data-testid="campaign-org-select">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {organizations.map((org) => (
                      <SelectItem key={org.organization_id} value={org.organization_id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Email Template</Label>
                <Select
                  value={newCampaign.template_id}
                  onValueChange={(value) => setNewCampaign({...newCampaign, template_id: value})}
                >
                  <SelectTrigger className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]" data-testid="campaign-template-select">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {templates.map((template) => (
                      <SelectItem key={template.template_id} value={template.template_id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Email Template Override */}
              {customEmailTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-400 flex items-center gap-2">
                    Custom Email Override
                    <span className="text-xs text-gray-500">(optional)</span>
                  </Label>
                  <Select
                    value={newCampaign.custom_email_template_id || 'none'}
                    onValueChange={(value) => setNewCampaign({...newCampaign, custom_email_template_id: value === 'none' ? '' : value})}
                  >
                    <SelectTrigger className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]" data-testid="custom-email-template-select">
                      <SelectValue placeholder="Use default template" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      <SelectItem value="none" className="text-gray-400">Use default template</SelectItem>
                      {customEmailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="text-[#E8DDB5]">
                          {template.config?.logoIcon || '📧'} {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Override with a custom visual email template you created</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-400">Target Users ({newCampaign.target_user_ids.length} selected)</Label>
                {!newCampaign.organization_id ? (
                  <p className="text-sm text-gray-500">Select an organization first</p>
                ) : orgUsers.length === 0 ? (
                  <p className="text-sm text-yellow-500">No users in this organization</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-[#0f0f15] rounded-lg border border-[#D4A836]/30">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = orgUsers.map(u => u.user_id);
                        setNewCampaign({
                          ...newCampaign,
                          target_user_ids: newCampaign.target_user_ids.length === allIds.length ? [] : allIds
                        });
                      }}
                      className="text-sm text-[#D4A836] hover:underline mb-2"
                    >
                      {newCampaign.target_user_ids.length === orgUsers.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {orgUsers.map((user) => (
                      <label key={user.user_id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={newCampaign.target_user_ids.includes(user.user_id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...newCampaign.target_user_ids, user.user_id]
                              : newCampaign.target_user_ids.filter(id => id !== user.user_id);
                            setNewCampaign({...newCampaign, target_user_ids: ids});
                          }}
                          className="rounded border-[#D4A836]/30"
                        />
                        <span className="text-sm text-[#E8DDB5]">{user.name}</span>
                        <span className="text-xs text-gray-500">({user.email})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Launch Options */}
              <div className="space-y-3 pt-2 border-t border-[#30363D]">
                <Label className="text-gray-400">Launch Options</Label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="launch_option"
                      checked={newCampaign.launch_immediately}
                      onChange={() => setNewCampaign({...newCampaign, launch_immediately: true, scheduled_at: ''})}
                      className="w-4 h-4 accent-[#D4A836]"
                    />
                    <div>
                      <span className="text-sm text-[#E8DDB5]">Save as Draft</span>
                      <p className="text-xs text-gray-500">Launch manually when ready</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="launch_option"
                      checked={!newCampaign.launch_immediately}
                      onChange={() => setNewCampaign({...newCampaign, launch_immediately: false})}
                      className="w-4 h-4 accent-[#D4A836]"
                    />
                    <div>
                      <span className="text-sm text-[#E8DDB5]">Schedule for Later</span>
                      <p className="text-xs text-gray-500">Auto-launch at specified date/time</p>
                    </div>
                  </label>
                </div>
                
                {!newCampaign.launch_immediately && (
                  <div className="ml-7 space-y-2">
                    <Label className="text-gray-400 text-sm">Schedule Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={newCampaign.scheduled_at}
                      onChange={(e) => setNewCampaign({...newCampaign, scheduled_at: e.target.value})}
                      min={new Date().toISOString().slice(0, 16)}
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                      data-testid="campaign-schedule-input"
                    />
                  </div>
                )}
              </div>

              {/* Risk Level */}
              <div>
                <Label className="text-gray-400 text-sm mb-1 block">Risk Level (assigned to users who click)</Label>
                <Select value={newCampaign.risk_level || 'medium'} onValueChange={(v) => setNewCampaign(prev => ({...prev, risk_level: v}))}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]" data-testid="risk-level-select">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="low" className="text-green-400">
                      🟢 Low - Awareness test
                    </SelectItem>
                    <SelectItem value="medium" className="text-yellow-400">
                      🟡 Medium - Standard phishing
                    </SelectItem>
                    <SelectItem value="high" className="text-orange-400">
                      🟠 High - Targeted attack
                    </SelectItem>
                    <SelectItem value="critical" className="text-red-400">
                      🔴 Critical - Credential harvest
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scenario Type - Determines what landing page to show */}
              <div>
                <Label className="text-gray-400 text-sm mb-1 block">Scenario Type</Label>
                <Select value={newCampaign.scenario_type || 'phishing_email'} onValueChange={(v) => setNewCampaign(prev => ({...prev, scenario_type: v}))}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]" data-testid="scenario-type-select">
                    <SelectValue placeholder="Select scenario type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="phishing_email" className="text-[#E8DDB5]">
                      📧 Phishing Email - Shows awareness page on click
                    </SelectItem>
                    <SelectItem value="credential_harvest" className="text-red-400">
                      🔐 Credential Harvest - Shows fake login form then awareness
                    </SelectItem>
                    <SelectItem value="qr_code_phishing" className="text-purple-400">
                      📱 QR Code Phishing - QR code based attack
                    </SelectItem>
                    <SelectItem value="bec_scenario" className="text-orange-400">
                      💼 Business Email Compromise
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {newCampaign.scenario_type === 'credential_harvest' && '⚠️ Users will see a fake login form before the awareness page'}
                </p>
              </div>

              {/* Assign Training Module */}
              <div>
                <Label className="text-gray-400 text-sm mb-1 block">Assign Training Module (auto-assigned on link click)</Label>
                <Select value={newCampaign.assigned_module_id || 'none'} onValueChange={(v) => setNewCampaign(prev => ({...prev, assigned_module_id: v === 'none' ? '' : v}))}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]" data-testid="assigned-module-select">
                    <SelectValue placeholder="None (assign all modules)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="none" className="text-gray-400">None (assign all active modules)</SelectItem>
                    {trainingModules.filter(m => m.is_active).map(m => (
                      <SelectItem key={m.module_id} value={m.module_id} className="text-[#E8DDB5]">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alert Template Selection */}
              <div>
                <Label className="text-gray-400 text-sm mb-1 block">Alert Page Template (shown when user clicks link)</Label>
                <Select value={newCampaign.alert_template_id || 'default'} onValueChange={(v) => setNewCampaign(prev => ({...prev, alert_template_id: v === 'default' ? '' : v}))}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]" data-testid="alert-template-select">
                    <SelectValue placeholder="Default Alert Page" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="default" className="text-gray-400">Default Alert Page</SelectItem>
                    {alertTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-[#E8DDB5]">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Select a pre-built template or use custom HTML below</p>
              </div>

              {/* Custom Awareness Page - Collapsible */}
              <div className="border border-[#30363D] rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCustomPageEditor(!showCustomPageEditor)}
                  className="w-full flex items-center justify-between p-3 bg-[#0D1117] hover:bg-[#161B22] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Label className="text-gray-400 text-sm cursor-pointer">Custom Awareness Page</Label>
                    {newCampaign.click_page_html && (
                      <Badge className="bg-[#D4A836]/20 text-[#D4A836] text-xs">Custom</Badge>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs">
                    {showCustomPageEditor ? '▲ Collapse' : '▼ Expand (optional)'}
                  </span>
                </button>
                {showCustomPageEditor && (
                  <div className="p-3 border-t border-[#30363D]">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewCampaign(prev => ({
                          ...prev, 
                          click_page_html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial,sans-serif;"><div style="font-size:64px;margin-bottom:20px;">⚠️</div><h1 style="color:#FF6B6B;margin-bottom:10px;">Security Alert!</h1><p style="color:#8B949E;margin-bottom:30px;">This was a phishing simulation</p><div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.25);padding:20px;border-radius:12px;max-width:500px;margin:0 auto;text-align:left;"><h3 style="color:#FF6B6B;margin-top:0;">Hello {{USER_NAME}},</h3><p style="color:#E6EDF3;">You clicked on a simulated phishing link in the "<strong>{{CAMPAIGN_NAME}}</strong>" campaign.</p><p style="color:#E6EDF3;">This was a test to help you identify potential threats.</p></div></div>`
                        }))}
                        className="border-[#D4A836]/30 text-[#E8DDB5] hover:bg-[#D4A836]/10 text-xs"
                      >
                        📋 Alert
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewCampaign(prev => ({
                          ...prev, 
                          click_page_html: `<div style="text-align:center;padding:40px;font-family:'Segoe UI',Arial,sans-serif;"><div style="font-size:64px;margin-bottom:20px;">🎣</div><h1 style="color:#FF6B6B;margin-bottom:10px;">Phishing Detected!</h1><p style="color:#8B949E;margin-bottom:30px;">You've been caught in a training exercise</p><div style="background:rgba(212,168,54,0.1);border-left:4px solid #D4A836;padding:20px;border-radius:8px;text-align:left;margin-bottom:20px;"><p style="color:#E8DDB5;margin:0;"><strong>User:</strong> {{USER_NAME}}</p><p style="color:#E8DDB5;margin:10px 0 0 0;"><strong>Campaign:</strong> {{CAMPAIGN_NAME}}</p></div></div>`
                        }))}
                        className="border-[#D4A836]/30 text-[#E8DDB5] hover:bg-[#D4A836]/10 text-xs"
                      >
                        🎣 Phishing
                      </Button>
                      {newCampaign.click_page_html && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewCampaign(prev => ({...prev, click_page_html: ''}))}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                        >
                          ✕ Clear
                        </Button>
                      )}
                    </div>
                    <Suspense fallback={<div className="h-[150px] bg-[#0D1117] border border-[#30363D] rounded-lg flex items-center justify-center text-gray-500">Loading editor...</div>}>
                      <RichTextEditor
                        value={newCampaign.click_page_html}
                        onChange={(html) => setNewCampaign(prev => ({...prev, click_page_html: html}))}
                        placeholder="Design your custom awareness page here..."
                        token={token}
                      />
                    </Suspense>
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="text-[#D4A836]">Variables:</span> {'{{USER_NAME}}'}, {'{{USER_EMAIL}}'}, {'{{CAMPAIGN_NAME}}'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowNewCampaign(false);
                resetCampaignForm();
              }} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Cancel
              </Button>
              {editingCampaign ? (
                <Button onClick={saveCampaignChanges} className="bg-[#D4A836] hover:bg-[#C49A30] text-black" data-testid="save-campaign-submit">
                  Save Changes
                </Button>
              ) : (
                <Button onClick={createCampaign} className="bg-[#D4A836] hover:bg-[#C49A30] text-black" data-testid="create-campaign-submit">
                  {newCampaign.launch_immediately ? 'Create Campaign' : 'Schedule Campaign'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Template Dialog */}
        <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Create Email Template</DialogTitle>
              <DialogDescription className="text-gray-400">
                Design a phishing email template. The tracking link button will be automatically added.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    placeholder="IT Security Alert"
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    data-testid="template-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Email Subject</Label>
                  <Input
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})}
                    placeholder="Urgent: Action Required - {{USER_NAME}}"
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    data-testid="template-subject-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Sender Display Name</Label>
                  <Input
                    value={newTemplate.sender_name}
                    onChange={(e) => setNewTemplate({...newTemplate, sender_name: e.target.value})}
                    placeholder="IT Support Team"
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    data-testid="template-sender-name-input"
                  />
                  <p className="text-xs text-gray-500">This name appears as the sender in email clients</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Fake Sender Email (Reply-To)</Label>
                  <Input
                    value={newTemplate.sender_email}
                    onChange={(e) => setNewTemplate({...newTemplate, sender_email: e.target.value})}
                    placeholder="support@company-secure.net"
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    data-testid="template-sender-email-input"
                  />
                  <p className="text-xs text-gray-500">Fake email for phishing simulation (Reply-To header)</p>
                </div>
              </div>
              
              {/* Button Text for CTA */}
              <div className="space-y-2">
                <Label className="text-gray-400">Call-to-Action Button Text</Label>
                <Input
                  value={newTemplate.button_text || ''}
                  onChange={(e) => setNewTemplate({...newTemplate, button_text: e.target.value})}
                  placeholder="Click Here to Verify"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="template-button-text-input"
                />
                <p className="text-xs text-gray-500">This button will contain the tracking link</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-400">Email Body</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { fetchMediaImages(); setShowImageLibrary(true); }}
                      className="border-[#D4A836]/30 text-[#E8DDB5]"
                      data-testid="open-image-library"
                    >
                      <Image className="w-4 h-4 mr-1" />
                      Image Library
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={generatePreview}
                      className="border-blue-500/30 text-blue-400"
                      data-testid="preview-email-btn"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Use <code className="bg-[#0f0f15] px-1 rounded">{'{{USER_NAME}}'}</code> to personalize with recipient's name
                </p>
                <Suspense fallback={<div className="h-48 bg-[#0f0f15] rounded-lg flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#D4A836]" /></div>}>
                  <RichTextEditor
                    value={newTemplate.body_html}
                    onChange={(html) => setNewTemplate({...newTemplate, body_html: html})}
                    placeholder="Write your phishing email content here..."
                  />
                </Suspense>
              </div>

              {/* Attachments Section */}
              {newTemplate.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-400">Attachments ({newTemplate.attachments.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {newTemplate.attachments.map((att) => (
                      <div key={att.image_id} className="flex items-center gap-2 bg-[#0f0f15] px-3 py-1 rounded-full border border-[#D4A836]/30">
                        <Paperclip className="w-3 h-3 text-[#D4A836]" />
                        <span className="text-sm text-[#E8DDB5]">{att.filename}</span>
                        <button type="button" onClick={() => removeAttachment(att.image_id)} className="text-gray-400 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTemplate(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Cancel
              </Button>
              <Button onClick={createTemplate} className="bg-[#D4A836] hover:bg-[#C49A30] text-black" data-testid="create-template-submit">
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Campaign Details Dialog */}
        <Dialog open={showCampaignDetails} onOpenChange={setShowCampaignDetails}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center justify-between">
                <span>{selectedCampaign?.name} - Campaign Details</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await axios.post(`${API}/export/token/phishing/${selectedCampaign?.campaign_id}/excel`, {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        window.open(`${API}${res.data.download_url}`, '_blank');
                      } catch (err) {
                        toast.error('Failed to generate download link');
                      }
                    }}
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400"
                    data-testid="export-excel-btn"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                    Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await axios.post(`${API}/export/token/phishing/${selectedCampaign?.campaign_id}/pdf`, {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        window.open(`${API}${res.data.download_url}`, '_blank');
                      } catch (err) {
                        toast.error('Failed to generate download link');
                      }
                    }}
                    className="border-[#D4A836]/50 text-[#D4A836] hover:bg-[#D4A836]/20 hover:border-[#D4A836]"
                    data-testid="export-pdf-btn"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Track email opens and link clicks in real-time
              </DialogDescription>
            </DialogHeader>
            {campaignStats && (
              <div className="py-4">
                {/* Stats Overview */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="bg-[#0f0f15] border-[#30363D]">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-[#E8DDB5]">{campaignStats.total_targets}</p>
                      <p className="text-xs text-gray-500">Total Targets</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0f0f15] border-[#30363D]">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-400">{campaignStats.emails_sent}</p>
                      <p className="text-xs text-gray-500">Emails Sent</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0f0f15] border-[#30363D]">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-400">{campaignStats.emails_opened}</p>
                      <p className="text-xs text-gray-500">Opened ({campaignStats.open_rate}%)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0f0f15] border-[#30363D]">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-red-400">{campaignStats.links_clicked}</p>
                      <p className="text-xs text-gray-500">Clicked ({campaignStats.click_rate}%)</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Targets Table */}
                <div className="border border-[#30363D] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#0f0f15]">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">User</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Tracking Code</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Sent</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Opened</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Clicked</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Embed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363D]">
                      {campaignTargets.map((target) => (
                        <tr key={target.target_id} className="hover:bg-white/5">
                          <td className="px-4 py-3">
                            <p className="text-sm text-[#E8DDB5]">{target.user_name}</p>
                            <p className="text-xs text-gray-500">{target.user_email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-[#0f0f15] px-2 py-1 rounded text-gray-400">
                              {target.tracking_code}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {target.email_sent ? (
                              <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {target.email_opened ? (
                              <div className="flex flex-col items-center">
                                <Eye className="w-5 h-5 text-yellow-400" />
                                <span className="text-xs text-gray-500 mt-1">
                                  {target.email_opened_at && new Date(target.email_opened_at).toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {target.link_clicked ? (
                              <div className="flex flex-col items-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <span className="text-xs text-gray-500 mt-1">
                                  {target.link_clicked_at && new Date(target.link_clicked_at).toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const embedUrl = `${API}/phishing/track/click/${target.tracking_code}`;
                                navigator.clipboard.writeText(embedUrl);
                                toast.success('Embed URL copied to clipboard');
                              }}
                              className="border-[#D4A836]/30 text-[#D4A836]"
                              data-testid={`copy-embed-${target.tracking_code}`}
                            >
                              <Link className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Email Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Email Preview
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Preview how your email will look to recipients
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="bg-[#0f0f15] rounded-lg p-4 space-y-3 mb-4">
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500">From:</span>
                  <span className="text-[#E8DDB5]">{newTemplate.sender_name || 'Sender'} &lt;{newTemplate.sender_email || 'email@example.com'}&gt;</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500">Subject:</span>
                  <span className="text-[#E8DDB5]">{newTemplate.subject?.replace('{{USER_NAME}}', 'John Doe') || 'No subject'}</span>
                </div>
              </div>
              <div 
                className="bg-white rounded-lg overflow-hidden"
                style={{ height: '400px' }}
              >
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  data-testid="email-preview-iframe"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Library Dialog */}
        <Dialog open={showImageLibrary} onOpenChange={setShowImageLibrary}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Image className="w-5 h-5" />
                Image Library
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Upload and manage images for phishing email templates
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {/* Upload Section */}
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  data-testid="upload-image-btn"
                >
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Image
                </Button>
                <Button variant="outline" onClick={fetchMediaImages} className="border-[#D4A836]/30 text-[#E8DDB5]">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Images Grid */}
              {loadingMedia ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
                </div>
              ) : mediaImages.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No images uploaded yet</p>
                  <p className="text-sm text-gray-500">Upload images to use in your email templates</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaImages.map((img) => (
                    <div 
                      key={img.image_id}
                      className="bg-[#0f0f15] rounded-lg overflow-hidden border border-[#30363D] group"
                    >
                      <div className="aspect-square relative">
                        <img 
                          src={img.data_url || img.url} 
                          alt={img.filename}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button 
                            size="sm"
                            onClick={() => insertImageToBody(img.data_url || img.url)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                            title="Insert into email body"
                          >
                            <Image className="w-3 h-3 mr-1" />
                            Embed
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => addAttachment(img)}
                            className="bg-green-600 hover:bg-green-700 text-xs"
                            title="Add as attachment"
                          >
                            <Paperclip className="w-3 h-3 mr-1" />
                            Attach
                          </Button>
                        </div>
                      </div>
                      <div className="p-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400 truncate flex-1">{img.filename}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMediaImage(img.image_id)}
                          className="text-gray-400 hover:text-red-400 p-1 h-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImageLibrary(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Delete Multiple Campaigns
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete {selectedCampaignIds.length} campaign(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">
                  All tracking data, targets, and statistics for these campaigns will be permanently deleted.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="border-[#30363D] text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={bulkDeleteCampaigns}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="confirm-bulk-delete"
              >
                Delete {selectedCampaignIds.length} Campaign(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
