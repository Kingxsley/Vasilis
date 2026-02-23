import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { Target, Plus, Search, Pencil, Trash2, Calendar as CalendarIcon, Play, Pause, Mail, MousePointerClick, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const campaignTypes = [
  { value: 'phishing', label: 'Phishing Email', icon: Mail, color: '#2979FF' },
  { value: 'ads', label: 'Malicious Ads', icon: MousePointerClick, color: '#FFB300' },
  { value: 'social_engineering', label: 'Social Engineering', icon: Users, color: '#FF3B30' }
];

export default function Campaigns() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    organization_id: '',
    campaign_type: 'phishing',
    description: '',
    start_date: null,
    end_date: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, orgsRes] = await Promise.all([
        axios.get(`${API}/campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/organizations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCampaigns(campaignsRes.data);
      setOrganizations(orgsRes.data);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        start_date: formData.start_date?.toISOString(),
        end_date: formData.end_date?.toISOString()
      };

      if (editingCampaign) {
        const { organization_id, campaign_type, ...updateData } = payload;
        await axios.patch(`${API}/campaigns/${editingCampaign.campaign_id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Campaign updated');
      } else {
        await axios.post(`${API}/campaigns`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Campaign created');
      }
      setDialogOpen(false);
      setEditingCampaign(null);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await axios.patch(`${API}/campaigns/${campaignId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Campaign ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      organization_id: campaign.organization_id,
      campaign_type: campaign.campaign_type,
      description: campaign.description || '',
      start_date: campaign.start_date ? new Date(campaign.start_date) : null,
      end_date: campaign.end_date ? new Date(campaign.end_date) : null
    });
    setDialogOpen(true);
  };

  const handleDelete = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await axios.delete(`${API}/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Campaign deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      organization_id: '',
      campaign_type: 'phishing',
      description: '',
      start_date: null,
      end_date: null
    });
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-[#00E676]/20 text-[#00E676]';
      case 'paused':
        return 'bg-[#FFB300]/20 text-[#FFB300]';
      case 'completed':
        return 'bg-[#2979FF]/20 text-[#2979FF]';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getCampaignType = (type) => campaignTypes.find(t => t.value === type);
  const getOrgName = (orgId) => organizations.find(o => o.organization_id === orgId)?.name || 'Unknown';

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="campaigns-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Campaigns
            </h1>
            <p className="text-gray-400">Create and manage security training campaigns</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingCampaign(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#2979FF] hover:bg-[#2962FF]" data-testid="add-campaign-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#161B22] border-[#30363D] max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Q1 Phishing Awareness"
                    className="bg-[#0B0E14] border-[#30363D]"
                    data-testid="campaign-name-input"
                    required
                  />
                </div>

                {!editingCampaign && (
                  <>
                    <div className="space-y-2">
                      <Label>Organization *</Label>
                      <Select
                        value={formData.organization_id}
                        onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                        required
                      >
                        <SelectTrigger className="bg-[#0B0E14] border-[#30363D]" data-testid="campaign-org-select">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#161B22] border-[#30363D]">
                          {organizations.map(org => (
                            <SelectItem key={org.organization_id} value={org.organization_id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Campaign Type *</Label>
                      <Select
                        value={formData.campaign_type}
                        onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
                      >
                        <SelectTrigger className="bg-[#0B0E14] border-[#30363D]" data-testid="campaign-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#161B22] border-[#30363D]">
                          {campaignTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="w-4 h-4" style={{ color: type.color }} />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Campaign objectives and details"
                    className="bg-[#0B0E14] border-[#30363D] min-h-[80px]"
                    data-testid="campaign-description-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-[#0B0E14] border-[#30363D]"
                          data-testid="campaign-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, 'PPP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#161B22] border-[#30363D]">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => setFormData({ ...formData, start_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-[#0B0E14] border-[#30363D]"
                          data-testid="campaign-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(formData.end_date, 'PPP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#161B22] border-[#30363D]">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => setFormData({ ...formData, end_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1 border-[#30363D]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#2979FF] hover:bg-[#2962FF]"
                    disabled={submitting || (!editingCampaign && !formData.organization_id)}
                    data-testid="campaign-submit-btn"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCampaign ? 'Update' : 'Create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#161B22] border-[#30363D]"
              data-testid="search-campaigns-input"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px] bg-[#161B22] border-[#30363D]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#161B22] border-[#30363D]">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="py-16 text-center">
              <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No campaigns found</h3>
              <p className="text-gray-400 mb-6">
                {search || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Create your first campaign'}
              </p>
              <Button 
                onClick={() => setDialogOpen(true)} 
                className="bg-[#2979FF] hover:bg-[#2962FF]"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign, index) => {
              const typeInfo = getCampaignType(campaign.campaign_type);
              const TypeIcon = typeInfo?.icon || Target;

              return (
                <Card 
                  key={campaign.campaign_id}
                  className="bg-[#161B22] border-[#30363D] card-hover animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  data-testid={`campaign-card-${campaign.campaign_id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${typeInfo?.color}15` }}
                        >
                          <TypeIcon className="w-6 h-6" style={{ color: typeInfo?.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <p className="text-sm text-gray-500">{getOrgName(campaign.organization_id)}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaign.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{campaign.description}</p>
                    )}

                    {(campaign.start_date || campaign.end_date) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        <CalendarIcon className="w-3 h-3" />
                        {campaign.start_date && format(new Date(campaign.start_date), 'MMM d')}
                        {campaign.start_date && campaign.end_date && ' - '}
                        {campaign.end_date && format(new Date(campaign.end_date), 'MMM d, yyyy')}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-[#30363D]">
                      <div className="flex items-center gap-2">
                        {campaign.status === 'draft' || campaign.status === 'paused' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(campaign.campaign_id, 'active')}
                            className="text-[#00E676] hover:text-[#00E676] hover:bg-[#00E676]/10"
                            data-testid={`activate-campaign-${campaign.campaign_id}`}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        ) : campaign.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(campaign.campaign_id, 'paused')}
                            className="text-[#FFB300] hover:text-[#FFB300] hover:bg-[#FFB300]/10"
                            data-testid={`pause-campaign-${campaign.campaign_id}`}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(campaign)}
                          className="text-gray-400 hover:text-white"
                          data-testid={`edit-campaign-${campaign.campaign_id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(campaign.campaign_id)}
                          className="text-gray-400 hover:text-[#FF3B30]"
                          data-testid={`delete-campaign-${campaign.campaign_id}`}
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
