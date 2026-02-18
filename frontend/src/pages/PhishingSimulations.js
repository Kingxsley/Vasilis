import React, { useState, useEffect, lazy, Suspense } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  FileText, Loader2, RefreshCw, Download, FileSpreadsheet, Link, Bold, Italic
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// Lazy load the RichTextEditor
const RichTextEditor = lazy(() => import('../components/RichTextEditor'));

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
  
  // Dialog states
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  
  // Form states
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    organization_id: '',
    template_id: '',
    target_user_ids: []
  });
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    sender_name: '',
    sender_email: '',
    body_html: ''
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, templatesRes, orgsRes, usersRes] = await Promise.all([
        axios.get(`${API}/phishing/campaigns`, { headers }),
        axios.get(`${API}/phishing/templates`, { headers }),
        axios.get(`${API}/organizations`, { headers }),
        axios.get(`${API}/users`, { headers })
      ]);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setOrganizations(orgsRes.data);
      setUsers(usersRes.data);
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

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.organization_id || !newCampaign.template_id || newCampaign.target_user_ids.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await axios.post(`${API}/phishing/campaigns`, newCampaign, { headers });
      toast.success('Campaign created successfully');
      setShowNewCampaign(false);
      setNewCampaign({ name: '', organization_id: '', template_id: '', target_user_ids: [] });
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
    
    try {
      await axios.post(`${API}/phishing/templates`, newTemplate, { headers });
      toast.success('Template created successfully');
      setShowNewTemplate(false);
      setNewTemplate({ name: '', subject: '', sender_name: '', sender_email: '', body_html: '' });
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#E8DDB5]">Phishing Campaigns</h2>
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
            ) : campaigns.length === 0 ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="py-12 text-center">
                  <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No campaigns yet</h3>
                  <p className="text-gray-400 mb-4">Create your first phishing simulation campaign</p>
                  <Button 
                    onClick={() => setShowNewCampaign(true)}
                    className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <Card 
                    key={campaign.campaign_id} 
                    className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/30 transition-colors"
                    data-testid={`campaign-${campaign.campaign_id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                            <Button
                              size="sm"
                              onClick={() => launchCampaign(campaign.campaign_id)}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`launch-campaign-${campaign.campaign_id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Launch
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
        <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Create Phishing Campaign</DialogTitle>
              <DialogDescription className="text-gray-400">
                Set up a new phishing simulation to test employee awareness
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCampaign(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Cancel
              </Button>
              <Button onClick={createCampaign} className="bg-[#D4A836] hover:bg-[#C49A30] text-black" data-testid="create-campaign-submit">
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Template Dialog */}
        <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Label className="text-gray-400">Email Body</Label>
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
                    onClick={() => window.open(`${API}/export/phishing/${selectedCampaign?.campaign_id}/excel`, '_blank')}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    data-testid="export-excel-btn"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                    Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`${API}/export/phishing/${selectedCampaign?.campaign_id}/pdf`, '_blank')}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
