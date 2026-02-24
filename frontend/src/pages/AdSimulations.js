import React, { useState, useEffect, lazy, Suspense } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
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
  Monitor, Plus, Eye, MousePointer, Users, Trash2, Building2,
  BarChart3, AlertTriangle, FileText, Loader2, RefreshCw, Code,
  Play, Pause, Clock, Calendar, Copy, Check, Link as LinkIcon,
  Paintbrush, Edit, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Checkbox } from '../components/ui/checkbox';

// Lazy load the AdTemplateEditor
const AdTemplateEditor = lazy(() => import('../components/common/AdTemplateEditor'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdSimulations() {
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
  const [copiedUrl, setCopiedUrl] = useState(null);
  
  // Campaign filter state
  const [campaignFilter, setCampaignFilter] = useState('all');
  
  // Bulk selection states
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  
  // Visual Editor states
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    organization_ids: [],  // Changed to array for multi-org support
    template_id: '',
    target_user_ids: [],
    status: 'active',
    scheduled_at: ''
  });
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    ad_type: 'banner',
    headline: '',
    description: '',
    call_to_action: '',
    style_css: ''
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, templatesRes, orgsRes, usersRes] = await Promise.all([
        axios.get(`${API}/ads/campaigns`, { headers }),
        axios.get(`${API}/ads/templates`, { headers }),
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
      const res = await axios.post(`${API}/ads/templates/seed-defaults`, {}, { headers });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error('Failed to seed templates');
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || newCampaign.organization_ids.length === 0 || !newCampaign.template_id || newCampaign.target_user_ids.length === 0) {
      toast.error('Please fill in all required fields');
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
        const campaignData = {
          name: newCampaign.organization_ids.length > 1 
            ? `${newCampaign.name} - ${org?.name || orgId}`
            : newCampaign.name,
          organization_id: orgId,
          template_id: newCampaign.template_id,
          target_user_ids: orgUsers,
          status: newCampaign.scheduled_at ? 'scheduled' : 'active',
          scheduled_at: newCampaign.scheduled_at || null
        };
        await axios.post(`${API}/ads/campaigns`, campaignData, { headers });
        createdCount++;
      }
      toast.success(`${createdCount} ad campaign(s) created successfully`);
      setShowNewCampaign(false);
      setNewCampaign({ name: '', organization_ids: [], template_id: '', target_user_ids: [], status: 'active', scheduled_at: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create campaign');
    }
  };

  // Filter campaigns by status
  const filteredCampaigns = campaigns.filter(c => {
    if (campaignFilter === 'all') return true;
    if (campaignFilter === 'active') return c.status === 'active';
    if (campaignFilter === 'completed') return c.status === 'completed';
    if (campaignFilter === 'scheduled') return c.status === 'scheduled';
    if (campaignFilter === 'draft') return c.status === 'draft';
    return true;
  });

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-500/20 text-green-400', icon: Play },
      completed: { color: 'bg-gray-500/20 text-gray-400', icon: Pause },
      scheduled: { color: 'bg-blue-500/20 text-blue-400', icon: Clock },
      draft: { color: 'bg-yellow-500/20 text-yellow-400', icon: FileText }
    };
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  // Copy embed/tracking URL to clipboard
  // Copies the ad render URL for the first target, or the campaign embed URL
  const copyTrackingUrl = async (campaignId) => {
    // Try to find targets for this campaign to get a render URL
    try {
      const res = await axios.get(`${API}/ads/campaigns/${campaignId}/targets`, { headers: { Authorization: `Bearer ${token}` } });
      const targets = res.data || [];
      if (targets.length > 0) {
        // Copy the first target's embed render URL
        const embedUrl = `${API}/ads/render/${targets[0].tracking_code}`;
        await navigator.clipboard.writeText(embedUrl);
        setCopiedUrl(campaignId);
        toast.success('Embed URL copied (first target)');
        setTimeout(() => setCopiedUrl(null), 2000);
        return;
      }
    } catch { /* fall through */ }
    
    // Fallback: copy campaign-level URL with placeholder note
    const embedUrl = `${API}/ads/render/{tracking_code}`;
    try {
      await navigator.clipboard.writeText(embedUrl);
      setCopiedUrl(campaignId);
      toast.success('Embed URL template copied - replace {tracking_code} with target code');
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = embedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedUrl(campaignId);
      toast.success('Embed URL template copied');
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.headline || !newTemplate.description || !newTemplate.call_to_action) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await axios.post(`${API}/ads/templates`, newTemplate, { headers });
      toast.success('Ad template created successfully');
      setShowNewTemplate(false);
      setNewTemplate({ name: '', ad_type: 'banner', headline: '', description: '', call_to_action: '', style_css: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create template');
    }
  };

  // Handle save from visual editor
  const handleSaveFromEditor = async (templateData) => {
    try {
      if (editingTemplate) {
        // Update existing template - currently API doesn't support PUT, so delete and recreate
        await axios.delete(`${API}/ads/templates/${editingTemplate.template_id}`, { headers });
        await axios.post(`${API}/ads/templates`, templateData, { headers });
        toast.success('Template updated successfully');
      } else {
        await axios.post(`${API}/ads/templates`, templateData, { headers });
        toast.success('Template created successfully');
      }
      setShowVisualEditor(false);
      setEditingTemplate(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save template');
    }
  };

  // Open visual editor for editing
  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowVisualEditor(true);
  };

  const deleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await axios.delete(`${API}/ads/campaigns/${campaignId}`, { headers });
      toast.success('Campaign deleted');
      setSelectedCampaignIds(prev => prev.filter(id => id !== campaignId));
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
      for (const campaignId of selectedCampaignIds) {
        await axios.delete(`${API}/ads/campaigns/${campaignId}`, { headers });
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

  // Get users for multiple organizations
  const getOrgUsers = () => {
    if (newCampaign.organization_ids.length === 0) return [];
    return users.filter(u => newCampaign.organization_ids.includes(u.organization_id));
  };

  const getUsersForOrg = (orgId) => users.filter(u => u.organization_id === orgId);

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await axios.delete(`${API}/ads/templates/${templateId}`, { headers });
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
        axios.get(`${API}/ads/campaigns/${campaign.campaign_id}/targets`, { headers }),
        axios.get(`${API}/ads/campaigns/${campaign.campaign_id}/stats`, { headers })
      ]);
      setCampaignTargets(targetsRes.data);
      setCampaignStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load campaign details');
    }
  };

  const getAdTypeBadge = (type) => {
    const colors = {
      banner: 'bg-blue-500/20 text-blue-400',
      popup: 'bg-red-500/20 text-red-400',
      sidebar: 'bg-green-500/20 text-green-400',
      native: 'bg-purple-500/20 text-purple-400'
    };
    return <Badge className={colors[type] || colors.banner}>{type}</Badge>;
  };

  const orgUsers = users.filter(u => u.organization_id === newCampaign.organization_id);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="ad-simulations-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Malicious Ad Simulations
            </h1>
            <p className="text-gray-400">Create and track fake ad campaigns to test employee awareness</p>
          </div>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#161B22] border border-[#30363D]">
            <TabsTrigger 
              value="campaigns" 
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
              data-testid="campaigns-tab"
            >
              <Monitor className="w-4 h-4 mr-2" />
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
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Monitor className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">
                    {campaignFilter === 'all' ? 'No ad campaigns yet' : `No ${campaignFilter} campaigns`}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    {campaignFilter === 'all' 
                      ? 'Create your first malicious ad simulation campaign'
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
                {filteredCampaigns.map((campaign) => (
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
                            {getStatusBadge(campaign.status || 'active')}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {campaign.total_targets} targets
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {campaign.ads_viewed} viewed
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointer className="w-4 h-4" />
                              {campaign.ads_clicked} clicked
                            </span>
                            {campaign.scheduled_at && (
                              <span className="flex items-center gap-1 text-blue-400">
                                <Calendar className="w-4 h-4" />
                                {new Date(campaign.scheduled_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyTrackingUrl(campaign.campaign_id)}
                            className={`border-[#D4A836]/30 ${copiedUrl === campaign.campaign_id ? 'text-green-400 border-green-500/30' : 'text-[#E8DDB5]'}`}
                            data-testid={`copy-url-${campaign.campaign_id}`}
                            title="Copy tracking URL"
                          >
                            {copiedUrl === campaign.campaign_id ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <LinkIcon className="w-4 h-4 mr-1" />
                                Copy URL
                              </>
                            )}
                          </Button>
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
              <h2 className="text-xl font-semibold text-[#E8DDB5]">Ad Templates</h2>
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
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowVisualEditor(true);
                  }}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  data-testid="new-template-btn"
                >
                  <Paintbrush className="w-4 h-4 mr-2" />
                  Visual Editor
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
                  <Sparkles className="w-12 h-12 text-[#D4A836] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No ad templates yet</h3>
                  <p className="text-gray-400 mb-4">Create malicious ad templates using our visual editor or add defaults</p>
                  <div className="flex justify-center gap-3">
                    <Button 
                      variant="outline"
                      onClick={seedDefaultTemplates}
                      className="border-[#D4A836]/30 text-[#E8DDB5]"
                    >
                      Add Default Templates
                    </Button>
                    <Button 
                      onClick={() => {
                        setEditingTemplate(null);
                        setShowVisualEditor(true);
                      }}
                      className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                    >
                      <Paintbrush className="w-4 h-4 mr-2" />
                      Open Visual Editor
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
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg text-[#E8DDB5]">{template.name}</CardTitle>
                        {getAdTypeBadge(template.ad_type)}
                      </div>
                      <CardDescription className="text-gray-400 font-bold">
                        {template.headline}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-[#D4A836]/30 text-[#D4A836]">
                          {template.call_to_action}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditTemplate(template)}
                            className="border-[#D4A836]/30 text-[#E8DDB5] hover:bg-[#D4A836]/10"
                            data-testid={`edit-template-${template.template_id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteTemplate(template.template_id)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            data-testid={`delete-template-${template.template_id}`}
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
        </Tabs>

        {/* Visual Template Editor Dialog */}
        <Dialog open={showVisualEditor} onOpenChange={setShowVisualEditor}>
          <DialogContent className="bg-[#0D1117] border-[#30363D] max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-[#D4A836]" />
                {editingTemplate ? 'Edit Ad Template' : 'Create Ad Template'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Design malicious ad templates with live preview
              </DialogDescription>
            </DialogHeader>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            }>
              <AdTemplateEditor
                initialTemplate={editingTemplate}
                onSave={handleSaveFromEditor}
                onCancel={() => {
                  setShowVisualEditor(false);
                  setEditingTemplate(null);
                }}
                mode={editingTemplate ? 'edit' : 'create'}
              />
            </Suspense>
          </DialogContent>
        </Dialog>

        {/* New Campaign Dialog */}
        <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Create Ad Campaign</DialogTitle>
              <DialogDescription className="text-gray-400">
                Set up a new malicious ad simulation campaign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="Q1 Ad Awareness Test"
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
                <Label className="text-gray-400">Ad Template</Label>
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
                        {template.name} ({template.ad_type})
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
              
              {/* Schedule Campaign */}
              <div className="space-y-2">
                <Label className="text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Schedule Campaign (Optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={newCampaign.scheduled_at}
                  onChange={(e) => setNewCampaign({...newCampaign, scheduled_at: e.target.value})}
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="campaign-schedule-input"
                />
                <p className="text-xs text-gray-500">Leave empty to start immediately</p>
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
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Create Ad Template</DialogTitle>
              <DialogDescription className="text-gray-400">
                Design a malicious ad template for testing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    placeholder="Fake Prize Ad"
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    data-testid="template-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Ad Type</Label>
                  <Select
                    value={newTemplate.ad_type}
                    onValueChange={(value) => setNewTemplate({...newTemplate, ad_type: value})}
                  >
                    <SelectTrigger className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Headline</Label>
                <Input
                  value={newTemplate.headline}
                  onChange={(e) => setNewTemplate({...newTemplate, headline: e.target.value})}
                  placeholder="You've Won a Prize!"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="template-headline-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Description</Label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Click here to claim your exclusive reward..."
                  className="w-full h-20 bg-[#0f0f15] border border-[#D4A836]/30 text-[#E8DDB5] rounded-md p-3 text-sm"
                  data-testid="template-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Call to Action Button Text</Label>
                <Input
                  value={newTemplate.call_to_action}
                  onChange={(e) => setNewTemplate({...newTemplate, call_to_action: e.target.value})}
                  placeholder="CLAIM NOW!"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="template-cta-input"
                />
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
              <DialogTitle className="text-[#E8DDB5]">
                {selectedCampaign?.name} - Campaign Details
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Track ad views and clicks. Share the embed code with targets.
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
                      <p className="text-2xl font-bold text-blue-400">{campaignStats.ads_viewed}</p>
                      <p className="text-xs text-gray-500">Viewed ({campaignStats.view_rate}%)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0f0f15] border-[#30363D]">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-red-400">{campaignStats.ads_clicked}</p>
                      <p className="text-xs text-gray-500">Clicked ({campaignStats.click_rate}%)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0f0f15] border-[#30363D]">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-400">
                        {campaignStats.ads_viewed > 0 ? Math.round((campaignStats.ads_clicked / campaignStats.ads_viewed) * 100) : 0}%
                      </p>
                      <p className="text-xs text-gray-500">CTR</p>
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
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Viewed</th>
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
                            {target.ad_viewed ? (
                              <Eye className="w-5 h-5 text-blue-400 mx-auto" />
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {target.ad_clicked ? (
                              <AlertTriangle className="w-5 h-5 text-red-400 mx-auto" />
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const embedUrl = `${API}/ads/render/${target.tracking_code}`;
                                navigator.clipboard.writeText(embedUrl);
                                toast.success('Embed URL copied to clipboard');
                              }}
                              className="border-[#D4A836]/30 text-[#D4A836]"
                            >
                              <Code className="w-4 h-4" />
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
      </div>
    </DashboardLayout>
  );
}
