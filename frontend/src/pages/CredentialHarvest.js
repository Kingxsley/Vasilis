import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  KeyRound, Plus, Play, Pause, CheckCircle, Eye, 
  Send, Users, Building2, Trash2, BarChart3, AlertTriangle,
  FileText, Loader2, RefreshCw, Download, Clock, Calendar,
  Copy, Edit, Lock, Mail, Shield, User, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Default credential harvest templates
const DEFAULT_TEMPLATES = [
  {
    id: 'microsoft_365',
    name: 'Microsoft 365 Login',
    brand: 'Microsoft',
    subject: 'Action Required: Verify your Microsoft 365 account',
    sender_name: 'Microsoft Account Team',
    sender_email: 'security@microsoft-verify.com',
    description: 'Fake Microsoft 365 login page for password verification',
    preview_color: '#0078d4',
    body_html: `<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31" alt="Microsoft" style="height: 24px; margin-bottom: 20px;">
      <h2 style="color: #1a1a1a; font-weight: 600;">Verify your account</h2>
      <p style="color: #666;">We've detected unusual sign-in activity on your Microsoft 365 account. To continue using your account, please verify your identity.</p>
      <p style="color: #666;">If you don't verify within 24 hours, your account access will be temporarily suspended.</p>
      <a href="{{TRACKING_LINK}}" style="display: inline-block; background: #0078d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Verify Now</a>
      <p style="color: #999; font-size: 12px;">If the button doesn't work, copy this link: {{TRACKING_LINK}}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 11px;">Microsoft Corporation, One Microsoft Way, Redmond, WA 98052</p>
    </div>`
  },
  {
    id: 'google_workspace',
    name: 'Google Workspace Security Alert',
    brand: 'Google',
    subject: 'Security alert: New sign-in on your account',
    sender_name: 'Google Security',
    sender_email: 'no-reply@accounts.google-security.com',
    description: 'Fake Google Workspace login for security verification',
    preview_color: '#4285f4',
    body_html: `<div style="font-family: 'Google Sans', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" style="height: 40px; margin-bottom: 20px;">
      <h2 style="color: #202124; font-weight: 400;">Security alert</h2>
      <div style="background: #fce8e6; border-left: 4px solid #d93025; padding: 16px; margin: 20px 0;">
        <p style="color: #202124; margin: 0;">A new device signed in to your Google Account</p>
      </div>
      <p style="color: #5f6368;">If this wasn't you, someone else might have access to your account. Review your account activity and secure your account now.</p>
      <a href="{{TRACKING_LINK}}" style="display: inline-block; background: #1a73e8; color: white; padding: 10px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Review Activity</a>
      <p style="color: #5f6368; font-size: 12px;">You received this email because security is important to us.</p>
    </div>`
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Connection Request',
    brand: 'LinkedIn',
    subject: 'You have a new connection request',
    sender_name: 'LinkedIn',
    sender_email: 'messages@linkedin-mail.com',
    description: 'Fake LinkedIn login to view connection details',
    preview_color: '#0a66c2',
    body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f2ef;">
      <img src="https://content.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Logo.svg.original.svg" alt="LinkedIn" style="height: 24px; margin-bottom: 20px;">
      <div style="background: white; border-radius: 8px; padding: 20px;">
        <h3 style="color: #000; margin-bottom: 16px;">Sarah Johnson wants to connect</h3>
        <p style="color: #666;">CEO at TechVentures Inc. • 500+ connections</p>
        <p style="color: #666; font-size: 14px;">"Hi, I came across your profile and would love to connect. I think we could have some great synergies."</p>
        <a href="{{TRACKING_LINK}}" style="display: inline-block; background: #0a66c2; color: white; padding: 10px 24px; text-decoration: none; border-radius: 20px; margin: 20px 0;">View Profile</a>
      </div>
    </div>`
  },
  {
    id: 'dropbox',
    name: 'Dropbox Shared File',
    brand: 'Dropbox',
    subject: 'Someone shared a file with you',
    sender_name: 'Dropbox',
    sender_email: 'no-reply@dropbox-share.com',
    description: 'Fake Dropbox login to access shared files',
    preview_color: '#0061fe',
    body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://aem.dropbox.com/cms/content/dam/dropbox/www/en-us/branding/app-dropbox-glyph.svg" alt="Dropbox" style="height: 40px; margin-bottom: 20px;">
      <h2 style="color: #1e1919;">John Smith shared "Q4_Financial_Report.xlsx" with you</h2>
      <div style="background: #f7f5f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="color: #637282; margin: 0;">📄 Q4_Financial_Report.xlsx</p>
        <p style="color: #637282; font-size: 12px;">Excel Spreadsheet • 2.4 MB</p>
      </div>
      <a href="{{TRACKING_LINK}}" style="display: inline-block; background: #0061fe; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">View File</a>
      <p style="color: #637282; font-size: 12px;">You'll need to sign in to view this file.</p>
    </div>`
  },
  {
    id: 'slack',
    name: 'Slack Workspace Invitation',
    brand: 'Slack',
    subject: 'You have been invited to join a Slack workspace',
    sender_name: 'Slack',
    sender_email: 'feedback@slack-mail.com',
    description: 'Fake Slack login for workspace access',
    preview_color: '#4a154b',
    body_html: `<div style="font-family: Lato, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png" alt="Slack" style="height: 40px; margin-bottom: 20px;">
      <h2 style="color: #1d1c1d;">You've been invited to join Company HQ on Slack</h2>
      <p style="color: #616061;">Mike Thompson has invited you to join the <strong>Company HQ</strong> workspace on Slack.</p>
      <p style="color: #616061;">Slack is where work happens. Connect with your team, share files, and stay organized.</p>
      <a href="{{TRACKING_LINK}}" style="display: inline-block; background: #4a154b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Join Now</a>
      <p style="color: #999; font-size: 12px;">This invitation expires in 7 days.</p>
    </div>`
  },
  {
    id: 'docusign',
    name: 'DocuSign Document to Sign',
    brand: 'DocuSign',
    subject: 'Please sign: Employment Agreement',
    sender_name: 'DocuSign',
    sender_email: 'dse@docusign-mail.com',
    description: 'Fake DocuSign login to sign documents',
    preview_color: '#ffcc00',
    body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
      <div style="background: #1a1a1a; padding: 20px; text-align: center;">
        <img src="https://www.docusign.com/sites/default/files/ds_logo_white.png" alt="DocuSign" style="height: 30px;">
      </div>
      <div style="background: white; padding: 30px;">
        <p style="color: #333; font-size: 14px;">HR Department sent you a document to review and sign.</p>
        <div style="border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0;">Employment Agreement</h3>
          <p style="color: #666; font-size: 12px; margin: 5px 0;">Please review and sign by end of business today</p>
        </div>
        <a href="{{TRACKING_LINK}}" style="display: block; background: #ffcc00; color: #000; padding: 15px 24px; text-decoration: none; border-radius: 4px; text-align: center; font-weight: bold;">REVIEW DOCUMENT</a>
      </div>
    </div>`
  },
  {
    id: 'zoom',
    name: 'Zoom Meeting Invitation',
    brand: 'Zoom',
    subject: 'You have been invited to a Zoom meeting',
    sender_name: 'Zoom',
    sender_email: 'no-reply@zoom-meeting.com',
    description: 'Fake Zoom login to join meeting',
    preview_color: '#2d8cff',
    body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://st1.zoom.us/zoom.ico" alt="Zoom" style="height: 40px; margin-bottom: 20px;">
      <h2 style="color: #232333;">You're invited to a Zoom meeting</h2>
      <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #232333; margin: 0;">Quarterly Review Meeting</h3>
        <p style="color: #747487;">Hosted by: Executive Team</p>
        <p style="color: #747487;">📅 Today at 3:00 PM</p>
      </div>
      <a href="{{TRACKING_LINK}}" style="display: inline-block; background: #2d8cff; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Join Meeting</a>
      <p style="color: #747487; font-size: 12px;">You may need to sign in to join this meeting.</p>
    </div>`
  },
  {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    brand: 'Adobe',
    subject: 'Action required: Verify your Adobe account',
    sender_name: 'Adobe',
    sender_email: 'mail@adobe-account.com',
    description: 'Fake Adobe login for subscription verification',
    preview_color: '#ff0000',
    body_html: `<div style="font-family: adobe-clean, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://www.adobe.com/favicon.ico" alt="Adobe" style="height: 40px; margin-bottom: 20px;">
      <h2 style="color: #2c2c2c;">Verify your Adobe account</h2>
      <p style="color: #4b4b4b;">We need to verify your account information to continue your Creative Cloud subscription.</p>
      <div style="background: #fafafa; border-left: 4px solid #ff0000; padding: 16px; margin: 20px 0;">
        <p style="color: #4b4b4b; margin: 0;"><strong>Your subscription will be paused</strong> if you don't verify within 48 hours.</p>
      </div>
      <a href="{{TRACKING_LINK}}" style="display: inline-block; background: #1473e6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px; margin: 20px 0;">Verify Account</a>
    </div>`
  }
];

export default function CredentialHarvest() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignTargets, setCampaignTargets] = useState([]);
  const [modules, setModules] = useState([]);
  
  // Bulk selection state
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);

  // Dialog states
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);

  // Form states - now supports multiple organizations
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    organization_ids: [], // Changed to array for multi-org
    template_id: '',
    target_user_ids: [],
    scheduled_at: '',
    launch_immediately: true,
    assigned_module_id: '',
    risk_level: 'critical'
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    brand: '',
    subject: '',
    sender_name: '',
    sender_email: '',
    body_html: '',
    description: ''
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, orgsRes, usersRes, submissionsRes, statsRes, modulesRes] = await Promise.all([
        axios.get(`${API}/phishing/campaigns`, { headers }),
        axios.get(`${API}/organizations`, { headers }),
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/phishing/credential-submissions`, { headers }),
        axios.get(`${API}/phishing/credential-submissions/stats`, { headers }),
        axios.get(`${API}/training/modules`, { headers })
      ]);

      // Filter only credential harvest campaigns
      const credentialCampaigns = (campaignsRes.data || []).filter(
        c => c.scenario_type === 'credential_harvest'
      );
      setCampaigns(credentialCampaigns);
      setOrganizations(orgsRes.data || []);
      setUsers(usersRes.data || []);
      setSubmissions(submissionsRes.data?.submissions || []);
      setStats(statsRes.data);
      setModules(modulesRes.data || []);

      // Load saved templates from localStorage or use defaults
      const savedTemplates = localStorage.getItem('credential_templates');
      if (savedTemplates) {
        setTemplates([...DEFAULT_TEMPLATES, ...JSON.parse(savedTemplates)]);
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || newCampaign.organization_ids.length === 0 || !newCampaign.template_id || newCampaign.target_user_ids.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Find the template
      const template = templates.find(t => t.id === newCampaign.template_id);
      if (!template) {
        toast.error('Template not found');
        return;
      }

      // First create a phishing template in the backend
      const templateRes = await axios.post(`${API}/phishing/templates`, {
        name: `Credential: ${template.name}`,
        subject: template.subject,
        sender_name: template.sender_name,
        sender_email: template.sender_email,
        body_html: template.body_html,
        body_text: template.description
      }, { headers });

      const backendTemplateId = templateRes.data.template_id;

      // Create campaigns for each selected organization
      const createdCampaigns = [];
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
          template_id: backendTemplateId,
          target_user_ids: orgUsers,
          scenario_type: 'credential_harvest',
          risk_level: 'critical',
          assigned_module_id: newCampaign.assigned_module_id || null,
          scheduled_at: newCampaign.launch_immediately ? null : newCampaign.scheduled_at || null
        };

        await axios.post(`${API}/phishing/campaigns`, campaignData, { headers });
        createdCampaigns.push(org?.name || orgId);
      }
      
      toast.success(`Created ${createdCampaigns.length} credential harvest campaign(s)`);
      setShowNewCampaign(false);
      setNewCampaign({
        name: '',
        organization_ids: [],
        template_id: '',
        target_user_ids: [],
        scheduled_at: '',
        launch_immediately: true,
        assigned_module_id: '',
        risk_level: 'critical'
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create campaign:', err);
      toast.error(err.response?.data?.detail || 'Failed to create campaign');
    }
  };

  const handleLaunchCampaign = async (campaignId) => {
    try {
      await axios.post(`${API}/phishing/campaigns/${campaignId}/launch`, {}, { headers });
      toast.success('Campaign launched');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to launch campaign');
    }
  };

  const handleViewCampaign = async (campaign) => {
    setSelectedCampaign(campaign);
    try {
      const res = await axios.get(`${API}/phishing/campaigns/${campaign.campaign_id}/targets`, { headers });
      setCampaignTargets(res.data || []);
      setShowCampaignDetails(true);
    } catch (err) {
      toast.error('Failed to load campaign details');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await axios.delete(`${API}/phishing/campaigns/${campaignId}`, { headers });
      toast.success('Campaign deleted');
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete campaign');
    }
  };

  const handleBulkDeleteCampaigns = async () => {
    if (selectedCampaigns.length === 0) {
      toast.error('No campaigns selected');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedCampaigns.length} campaign(s)?`)) return;
    
    try {
      let deleted = 0;
      let failed = 0;
      for (const campaignId of selectedCampaigns) {
        try {
          await axios.delete(`${API}/phishing/campaigns/${campaignId}`, { headers });
          deleted++;
        } catch {
          failed++;
        }
      }
      setSelectedCampaigns([]);
      toast.success(`Deleted ${deleted} campaign(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete campaigns');
    }
  };

  const toggleCampaignSelection = (campaignId) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const toggleAllCampaigns = () => {
    if (selectedCampaigns.length === campaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(campaigns.map(c => c.campaign_id));
    }
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.sender_email) {
      toast.error('Please fill in required fields');
      return;
    }

    const template = {
      id: `custom_${Date.now()}`,
      ...newTemplate,
      preview_color: '#6366f1'
    };

    const savedTemplates = JSON.parse(localStorage.getItem('credential_templates') || '[]');
    savedTemplates.push(template);
    localStorage.setItem('credential_templates', JSON.stringify(savedTemplates));
    setTemplates([...templates, template]);
    setShowNewTemplate(false);
    setNewTemplate({ name: '', brand: '', subject: '', sender_name: '', sender_email: '', body_html: '', description: '' });
    toast.success('Template saved');
  };

  const getUsersForOrg = (orgId) => {
    if (!orgId) return [];
    return users.filter(u => u.organization_id === orgId);
  };

  // Get users for multiple organizations
  const getUsersForOrgs = (orgIds) => {
    if (!orgIds || orgIds.length === 0) return [];
    return users.filter(u => orgIds.includes(u.organization_id));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const chartData = stats?.by_campaign?.map(c => ({
    name: c.campaign_name?.length > 15 ? c.campaign_name.substring(0, 15) + '...' : c.campaign_name,
    submissions: c.submission_count
  })) || [];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="credential-harvest-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
              <KeyRound className="w-8 h-8 text-[#FF3B30]" />
              Credential Harvest
            </h1>
            <p className="text-gray-400">Simulate credential theft attacks to test employee awareness</p>
          </div>
          <Button
            onClick={() => setShowNewCampaign(true)}
            className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
            data-testid="create-campaign-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2979FF]/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-[#2979FF]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Campaigns</p>
                  <p className="text-2xl font-bold text-white">{campaigns.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#FF3B30]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Credentials Captured</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_submissions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFB300]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#FFB300]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Vulnerable Users</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_unique_users || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00E676]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#00E676]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Templates</p>
                  <p className="text-2xl font-bold text-white">{templates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#21262D] border border-[#30363D]">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              Templates
            </TabsTrigger>
            <TabsTrigger value="submissions" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              Submissions
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Credential Harvest Campaigns</CardTitle>
                    <CardDescription>Manage your credential harvesting simulations</CardDescription>
                  </div>
                  {selectedCampaigns.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={handleBulkDeleteCampaigns}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete {selectedCampaigns.length} Selected
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <KeyRound className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No credential harvest campaigns yet</p>
                    <Button
                      onClick={() => setShowNewCampaign(true)}
                      className="mt-4 bg-[#D4A836] hover:bg-[#B8922E] text-black"
                    >
                      Create Your First Campaign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Select All Header */}
                    <div className="flex items-center gap-3 pb-2 border-b border-[#30363D]">
                      <Checkbox
                        checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                        onCheckedChange={toggleAllCampaigns}
                      />
                      <span className="text-sm text-gray-400">
                        {selectedCampaigns.length > 0 
                          ? `${selectedCampaigns.length} selected`
                          : 'Select all'}
                      </span>
                    </div>
                    {campaigns.map(campaign => (
                      <div
                        key={campaign.campaign_id}
                        className={`flex items-center justify-between p-4 bg-[#21262D] rounded-lg border ${
                          selectedCampaigns.includes(campaign.campaign_id) 
                            ? 'border-[#D4A836]' 
                            : 'border-[#30363D]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedCampaigns.includes(campaign.campaign_id)}
                            onCheckedChange={() => toggleCampaignSelection(campaign.campaign_id)}
                          />
                          <div className="w-10 h-10 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-[#FF3B30]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{campaign.name}</h3>
                            <p className="text-sm text-gray-400">
                              {campaign.total_targets} targets • {campaign.links_clicked} clicked
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                              campaign.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }
                          >
                            {campaign.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewCampaign(campaign)}
                            className="border-[#30363D]"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {campaign.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleLaunchCampaign(campaign.campaign_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteCampaign(campaign.campaign_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Credential Harvest Templates</h2>
              <Button
                onClick={() => setShowNewTemplate(true)}
                variant="outline"
                className="border-[#30363D]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id} className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${template.preview_color}20` }}
                      >
                        <Lock className="w-5 h-5" style={{ color: template.preview_color }} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <p className="text-xs text-gray-500">{template.brand}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.description}</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p><Mail className="w-3 h-3 inline mr-1" /> {template.subject}</p>
                      <p><User className="w-3 h-3 inline mr-1" /> {template.sender_name}</p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-4 bg-[#D4A836] hover:bg-[#B8922E] text-black"
                      onClick={() => {
                        setNewCampaign(prev => ({ ...prev, template_id: template.id }));
                        setShowNewCampaign(true);
                      }}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Credential Submissions</CardTitle>
                    <CardDescription>Users who entered credentials in fake login pages</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const csv = [
                        ['User Email', 'Entered Username', 'Campaign', 'Organization', 'Submitted At'].join(','),
                        ...submissions.map(s => [s.user_email, s.entered_username || '', s.campaign_name, s.organization_name, s.credentials_submitted_at].map(v => `"${v}"`).join(','))
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'credential_submissions.csv';
                      a.click();
                    }}
                    className="border-[#30363D]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Submissions by Campaign</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                        <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D' }} />
                        <Bar dataKey="submissions" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No credential submissions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#30363D]">
                        <TableHead className="text-gray-400">User</TableHead>
                        <TableHead className="text-gray-400">Entered Username</TableHead>
                        <TableHead className="text-gray-400">Campaign</TableHead>
                        <TableHead className="text-gray-400">Submitted</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((s, idx) => (
                        <TableRow key={s.target_id || idx} className="border-[#30363D]">
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{s.user_email}</p>
                              <p className="text-xs text-gray-500">{s.user_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-[#21262D] px-2 py-1 rounded text-[#FFB300]">
                              {s.entered_username || '-'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[#30363D]">
                              {s.campaign_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {formatDate(s.credentials_submitted_at)}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-[#FF3B30]/20 text-[#FF3B30]">Critical</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Campaign Dialog */}
        <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#FF3B30]" />
                Create Credential Harvest Campaign
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Set up a simulated credential theft attack to test employee security awareness
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Microsoft 365 Credential Test"
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>

              <div className="space-y-2">
                <Label>Organizations * ({newCampaign.organization_ids.length} selected)</Label>
                <div className="bg-[#0D1117] border border-[#30363D] rounded-md p-3 max-h-32 overflow-y-auto">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-[#D4A836] mb-2 p-0"
                    onClick={() => {
                      if (newCampaign.organization_ids.length === organizations.length) {
                        setNewCampaign(prev => ({ ...prev, organization_ids: [], target_user_ids: [] }));
                      } else {
                        setNewCampaign(prev => ({
                          ...prev,
                          organization_ids: organizations.map(o => o.organization_id),
                          target_user_ids: []
                        }));
                      }
                    }}
                  >
                    {newCampaign.organization_ids.length === organizations.length ? 'Deselect All' : 'Select All Organizations'}
                  </Button>
                  {organizations.map(org => (
                    <div key={org.organization_id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        checked={newCampaign.organization_ids.includes(org.organization_id)}
                        onCheckedChange={(checked) => {
                          setNewCampaign(prev => ({
                            ...prev,
                            organization_ids: checked
                              ? [...prev.organization_ids, org.organization_id]
                              : prev.organization_ids.filter(id => id !== org.organization_id),
                            target_user_ids: checked
                              ? prev.target_user_ids
                              : prev.target_user_ids.filter(uid => {
                                  const user = users.find(u => u.user_id === uid);
                                  return user && user.organization_id !== org.organization_id;
                                })
                          }));
                        }}
                      />
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-white">{org.name}</span>
                      <span className="text-xs text-gray-500">({getUsersForOrg(org.organization_id).length} users)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Credential Template *</Label>
                <Select
                  value={newCampaign.template_id}
                  onValueChange={(v) => setNewCampaign(prev => ({ ...prev, template_id: v }))}
                >
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" style={{ color: template.preview_color }} />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newCampaign.template_id && (
                  <p className="text-xs text-gray-500">
                    {templates.find(t => t.id === newCampaign.template_id)?.description}
                  </p>
                )}
              </div>

              {newCampaign.organization_id && (
                <div className="space-y-2">
                  <Label>Target Users ({newCampaign.target_user_ids.length} selected)</Label>
                  <div className="bg-[#0D1117] border border-[#30363D] rounded-md p-3 max-h-40 overflow-y-auto">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-[#D4A836] mb-2"
                      onClick={() => {
                        const orgUsers = getUsersForOrg(newCampaign.organization_id);
                        if (newCampaign.target_user_ids.length === orgUsers.length) {
                          setNewCampaign(prev => ({ ...prev, target_user_ids: [] }));
                        } else {
                          setNewCampaign(prev => ({
                            ...prev,
                            target_user_ids: orgUsers.map(u => u.user_id)
                          }));
                        }
                      }}
                    >
                      {newCampaign.target_user_ids.length === getUsersForOrg(newCampaign.organization_id).length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                    {getUsersForOrg(newCampaign.organization_id).map(user => (
                      <div key={user.user_id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          checked={newCampaign.target_user_ids.includes(user.user_id)}
                          onCheckedChange={(checked) => {
                            setNewCampaign(prev => ({
                              ...prev,
                              target_user_ids: checked
                                ? [...prev.target_user_ids, user.user_id]
                                : prev.target_user_ids.filter(id => id !== user.user_id)
                            }));
                          }}
                        />
                        <span className="text-sm text-white">{user.name}</span>
                        <span className="text-xs text-gray-500">({user.email})</span>
                      </div>
                    ))}
                    {getUsersForOrg(newCampaign.organization_id).length === 0 && (
                      <p className="text-sm text-gray-500">No users in this organization</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Assign Training Module (on credential submission)</Label>
                <Select
                  value={newCampaign.assigned_module_id || 'none'}
                  onValueChange={(v) => setNewCampaign(prev => ({ ...prev, assigned_module_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="none">None (assign all active modules)</SelectItem>
                    {modules.filter(m => m.is_active !== false).map(module => (
                      <SelectItem key={module.module_id} value={module.module_id}>
                        {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Launch Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={newCampaign.launch_immediately}
                      onChange={() => setNewCampaign(prev => ({ ...prev, launch_immediately: true }))}
                      className="text-[#D4A836]"
                    />
                    <span className="text-sm text-white">Save as Draft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!newCampaign.launch_immediately}
                      onChange={() => setNewCampaign(prev => ({ ...prev, launch_immediately: false }))}
                      className="text-[#D4A836]"
                    />
                    <span className="text-sm text-white">Schedule for Later</span>
                  </div>
                </div>
                {!newCampaign.launch_immediately && (
                  <Input
                    type="datetime-local"
                    value={newCampaign.scheduled_at}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    className="bg-[#0D1117] border-[#30363D]"
                  />
                )}
              </div>

              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg p-3">
                <p className="text-sm text-[#FF3B30] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Users will see a fake login form and their entered username will be recorded
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCampaign(false)} className="border-[#30363D]">
                Cancel
              </Button>
              <Button
                onClick={handleCreateCampaign}
                className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
                disabled={!newCampaign.name || !newCampaign.organization_id || !newCampaign.template_id || newCampaign.target_user_ids.length === 0}
              >
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Template Dialog */}
        <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Credential Template</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a custom fake login page template
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Custom Portal Login"
                    className="bg-[#0D1117] border-[#30363D]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand Name</Label>
                  <Input
                    value={newTemplate.brand}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="e.g., Company Name"
                    className="bg-[#0D1117] border-[#30363D]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Subject *</Label>
                <Input
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Action Required: Verify your account"
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sender Name *</Label>
                  <Input
                    value={newTemplate.sender_name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, sender_name: e.target.value }))}
                    placeholder="e.g., IT Department"
                    className="bg-[#0D1117] border-[#30363D]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender Email *</Label>
                  <Input
                    value={newTemplate.sender_email}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, sender_email: e.target.value }))}
                    placeholder="e.g., it@company-portal.com"
                    className="bg-[#0D1117] border-[#30363D]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this template"
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>

              <div className="space-y-2">
                <Label>Email Body HTML</Label>
                <Textarea
                  value={newTemplate.body_html}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, body_html: e.target.value }))}
                  placeholder="<div>Your email HTML here... Use {{TRACKING_LINK}} for the phishing link</div>"
                  className="bg-[#0D1117] border-[#30363D] min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500">Use {"{{TRACKING_LINK}}"} where you want the phishing link</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTemplate(false)} className="border-[#30363D]">
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} className="bg-[#D4A836] hover:bg-[#B8922E] text-black">
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Campaign Details Dialog */}
        <Dialog open={showCampaignDetails} onOpenChange={setShowCampaignDetails}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#FF3B30]" />
                {selectedCampaign?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Campaign details and target results
              </DialogDescription>
            </DialogHeader>

            {selectedCampaign && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-[#21262D] rounded-lg">
                    <p className="text-2xl font-bold text-white">{selectedCampaign.total_targets}</p>
                    <p className="text-xs text-gray-400">Total Targets</p>
                  </div>
                  <div className="text-center p-3 bg-[#21262D] rounded-lg">
                    <p className="text-2xl font-bold text-white">{selectedCampaign.emails_sent}</p>
                    <p className="text-xs text-gray-400">Emails Sent</p>
                  </div>
                  <div className="text-center p-3 bg-[#21262D] rounded-lg">
                    <p className="text-2xl font-bold text-[#FFB300]">{selectedCampaign.links_clicked}</p>
                    <p className="text-xs text-gray-400">Links Clicked</p>
                  </div>
                  <div className="text-center p-3 bg-[#21262D] rounded-lg">
                    <p className="text-2xl font-bold text-[#FF3B30]">
                      {campaignTargets.filter(t => t.credentials_submitted).length}
                    </p>
                    <p className="text-xs text-gray-400">Creds Submitted</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-[#30363D]">
                      <TableHead className="text-gray-400">User</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Entered Username</TableHead>
                      <TableHead className="text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignTargets.map(target => (
                      <TableRow key={target.target_id} className="border-[#30363D]">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{target.user_email}</p>
                            <p className="text-xs text-gray-500">{target.user_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {target.credentials_submitted ? (
                            <Badge className="bg-[#FF3B30]/20 text-[#FF3B30]">Submitted Creds</Badge>
                          ) : target.clicked_at ? (
                            <Badge className="bg-[#FFB300]/20 text-[#FFB300]">Clicked Link</Badge>
                          ) : target.opened_at ? (
                            <Badge className="bg-blue-500/20 text-blue-400">Opened</Badge>
                          ) : target.sent_at ? (
                            <Badge className="bg-gray-500/20 text-gray-400">Sent</Badge>
                          ) : (
                            <Badge className="bg-gray-500/20 text-gray-400">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {target.entered_username ? (
                            <code className="text-sm bg-[#21262D] px-2 py-1 rounded text-[#FFB300]">
                              {target.entered_username}
                            </code>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${BACKEND_URL}/api/phishing/track/click/${target.tracking_code}`);
                              toast.success('Tracking link copied');
                            }}
                            className="border-[#30363D]"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Link
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
