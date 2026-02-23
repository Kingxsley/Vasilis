import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Building2, Plus, Users, Pencil, Trash2, Globe, Search, Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Organizations() {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    description: '',
    certificate_template_id: '',
    discord_webhook_url: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Load certificate templates so organizations can choose a default template
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    // Fetch certificate templates when component mounts
    const loadTemplates = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API}/certificate-templates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTemplates(res.data || []);
      } catch (err) {
        // It's okay if this fails; template selection will not be shown
      }
    };
    loadTemplates();
  }, [token]);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await axios.get(`${API}/organizations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrganizations(response.data);
    } catch (err) {
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingOrg) {
        // Prepare payload: omit empty certificate template so we don't clear
        const payload = { ...formData };
        if (!payload.certificate_template_id) delete payload.certificate_template_id;
        await axios.patch(`${API}/organizations/${editingOrg.organization_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Organization updated');
      } else {
        const payload = { ...formData };
        if (!payload.certificate_template_id) delete payload.certificate_template_id;
        await axios.post(`${API}/organizations`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Organization created');
      }
      setDialogOpen(false);
      setEditingOrg(null);
      setFormData({ name: '', domain: '', description: '', certificate_template_id: '', discord_webhook_url: '' });
      fetchOrganizations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      domain: org.domain || '',
      description: org.description || '',
      certificate_template_id: org.certificate_template_id || '',
      discord_webhook_url: org.discord_webhook_url || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (orgId) => {
    if (!window.confirm('Are you sure you want to delete this organization?')) return;

    try {
      await axios.delete(`${API}/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Organization deleted');
      fetchOrganizations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.domain?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="organizations-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Organizations
            </h1>
            <p className="text-gray-400">Manage client organizations and their training programs</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingOrg(null);
      setFormData({ name: '', domain: '', description: '', certificate_template_id: '', discord_webhook_url: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#2979FF] hover:bg-[#2962FF]" data-testid="add-org-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#161B22] border-[#30363D]">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {editingOrg ? 'Edit Organization' : 'New Organization'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Acme Corporation"
                    className="bg-[#0B0E14] border-[#30363D]"
                    data-testid="org-name-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="acme.com"
                    className="bg-[#0B0E14] border-[#30363D]"
                    data-testid="org-domain-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the organization"
                    className="bg-[#0B0E14] border-[#30363D] min-h-[100px]"
                    data-testid="org-description-input"
                  />
                </div>
                {/* Certificate Template selection for default certificate */}
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="certificate_template_id">Certificate Template</Label>
                    {/**
                     * Radix Select does not accept an empty string as a value.  To
                     * represent the default (no template assigned), we use the
                     * string 'default' as the select value.  When the value is
                     * changed, we convert 'default' back to an empty string in
                     * the form state.
                     */}
                    <Select
                      value={formData.certificate_template_id || 'default'}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          certificate_template_id: value === 'default' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-[#0B0E14] border-[#30363D]">
                        <SelectValue>
                          {templates.find((t) => t.template_id === formData.certificate_template_id)?.name || 'Default'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B0E14] border-[#30363D]">
                        <SelectItem value="default">Default</SelectItem>
                        {templates.map((tmpl) => (
                          <SelectItem key={tmpl.template_id} value={tmpl.template_id}>
                            {tmpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Discord Webhook URL */}
                <div className="space-y-2">
                  <Label htmlFor="discord_webhook_url" className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#5865F2]" />
                    Discord Webhook URL
                  </Label>
                  <Input
                    id="discord_webhook_url"
                    value={formData.discord_webhook_url}
                    onChange={(e) => setFormData({ ...formData, discord_webhook_url: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="bg-[#0D1117] border-[#30363D]"
                    data-testid="org-discord-webhook-input"
                  />
                  <p className="text-xs text-gray-500">
                    Receive instant notifications when users in this organization click phishing links.
                  </p>
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
                    disabled={submitting}
                    data-testid="org-submit-btn"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingOrg ? 'Update' : 'Create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#161B22] border-[#30363D] max-w-md"
            data-testid="search-orgs-input"
          />
        </div>

        {/* Organizations Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrgs.length === 0 ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="py-16 text-center">
              <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No organizations yet</h3>
              <p className="text-gray-400 mb-6">Create your first organization to start managing clients</p>
              <Button 
                onClick={() => setDialogOpen(true)} 
                className="bg-[#2979FF] hover:bg-[#2962FF]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.map((org, index) => (
              <Card 
                key={org.organization_id} 
                className="bg-[#161B22] border-[#30363D] card-hover animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
                data-testid={`org-card-${org.organization_id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#2979FF]/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-[#2979FF]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        {org.domain && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Globe className="w-3 h-3" />
                            {org.domain}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${org.is_active ? 'bg-[#00E676]' : 'bg-gray-500'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {org.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{org.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-[#30363D]">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{org.user_count} users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(org)}
                        className="text-gray-400 hover:text-white"
                        data-testid={`edit-org-${org.organization_id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(org.organization_id)}
                        className="text-gray-400 hover:text-[#FF3B30]"
                        data-testid={`delete-org-${org.organization_id}`}
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
      </div>
    </DashboardLayout>
  );
}
