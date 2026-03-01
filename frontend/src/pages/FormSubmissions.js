import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
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
  Mail, Phone, Building2, User, Calendar, Loader2, 
  CheckCircle, Clock, AlertCircle, Trash2, Eye, MessageSquare,
  Send, ArrowRight, FileText, RefreshCw, UserPlus, UserCheck,
  Users, Shield, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FormSubmissions() {
  const { token, user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('access');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveForm, setApproveForm] = useState({
    role: 'trainee',
    organization_id: 'none',
    send_welcome_email: true
  });

  const headers = { Authorization: `Bearer ${token}` };
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchData();
    fetchOrganizations();
    fetchAdmins();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactRes, accessRes] = await Promise.all([
        axios.get(`${API}/contact/submissions`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/inquiries`, { headers }).catch(() => ({ data: { inquiries: [] } }))
      ]);
      setSubmissions(contactRes.data || []);
      setAccessRequests(accessRes.data?.inquiries || accessRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(`${API}/organizations`, { headers });
      setOrganizations(res.data?.organizations || res.data || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${API}/inquiries/admins/list`, { headers });
      setAdmins(res.data?.admins || []);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  };

  const updateStatus = async (id, status, type) => {
    try {
      const endpoint = type === 'contact' 
        ? `${API}/contact/submissions/${id}/status`
        : `${API}/inquiries/${id}/status`;
      
      await axios.patch(endpoint, { status }, { headers });
      toast.success('Status updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteSubmission = async (id, type) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    
    try {
      const endpoint = type === 'contact' 
        ? `${API}/contact/submissions/${id}`
        : `${API}/inquiries/${id}`;
      
      await axios.delete(endpoint, { headers });
      toast.success('Submission deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete submission');
    }
  };

  // Access Request specific functions
  const approveAndCreateUser = async () => {
    if (!selectedItem) return;
    
    setApproving(true);
    try {
      const res = await axios.post(`${API}/inquiries/${selectedItem.inquiry_id}/approve`, approveForm, { headers });
      toast.success(res.data.message);
      
      if (res.data.temp_password && !approveForm.send_welcome_email) {
        toast.info(`Temporary password: ${res.data.temp_password}`, { duration: 10000 });
      }
      
      setShowApprove(false);
      setSelectedItem(null);
      setApproveForm({ role: 'trainee', organization_id: 'none', send_welcome_email: true });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve request');
    } finally {
      setApproving(false);
    }
  };

  const assignToAdmin = async (adminId) => {
    if (!selectedItem) return;
    
    try {
      const res = await axios.post(`${API}/inquiries/${selectedItem.inquiry_id}/assign`, 
        { admin_id: adminId }, 
        { headers }
      );
      toast.success(res.data.message);
      setShowAssign(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign request');
    }
  };

  const resolveRequest = async (inquiryId) => {
    try {
      await axios.post(`${API}/inquiries/${inquiryId}/resolve`, {}, { headers });
      toast.success('Request marked as resolved');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resolve request');
    }
  };

  const rejectRequest = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    
    try {
      await axios.patch(`${API}/inquiries/${inquiryId}`, { status: 'rejected' }, { headers });
      toast.success('Request rejected');
      fetchData();
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }
    
    setSending(true);
    try {
      await axios.post(`${API}/contact/reply`, {
        submission_id: selectedItem.submission_id || selectedItem.request_id,
        email: selectedItem.email,
        message: replyText,
        subject: `Re: ${selectedItem.subject || 'Your inquiry'}`
      }, { headers });
      
      toast.success('Reply sent successfully');
      setReplyText('');
      setShowDetail(false);
      
      // Update status to responded
      const type = selectedItem.submission_id ? 'contact' : 'access';
      const id = selectedItem.submission_id || selectedItem.request_id;
      await updateStatus(id, 'responded', type);
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'new': 'bg-blue-500/20 text-blue-400',
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'in_progress': 'bg-purple-500/20 text-purple-400',
      'responded': 'bg-green-500/20 text-green-400',
      'resolved': 'bg-green-500/20 text-green-400',
      'closed': 'bg-gray-500/20 text-gray-400',
      'approved': 'bg-green-500/20 text-green-400',
      'rejected': 'bg-red-500/20 text-red-400',
      'assigned': 'bg-purple-500/20 text-purple-400',
      'contacted': 'bg-blue-500/20 text-blue-400',
    };
    
    const icons = {
      'new': AlertCircle,
      'pending': Clock,
      'in_progress': ArrowRight,
      'responded': CheckCircle,
      'resolved': CheckCircle,
      'closed': CheckCircle,
      'approved': UserCheck,
      'rejected': XCircle,
      'assigned': Users,
      'contacted': Mail,
    };
    
    const Icon = icons[status] || Clock;
    
    return (
      <Badge className={`${styles[status] || 'bg-gray-500/20 text-gray-400'} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {status?.replace('_', ' ')}
      </Badge>
    );
  };

  const AccessRequestCard = ({ item }) => (
    <Card className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base text-[#E8DDB5]">{item.name || 'Unknown'}</CardTitle>
              <p className="text-xs text-gray-500">{item.email}</p>
            </div>
          </div>
          {getStatusBadge(item.status)}
        </div>
      </CardHeader>
      <CardContent>
        {item.organization && (
          <div className="flex items-center text-xs text-gray-400 mb-2">
            <Building2 className="w-3 h-3 mr-1" />
            {item.organization}
          </div>
        )}
        {item.assigned_to_name && (
          <div className="flex items-center text-xs text-purple-400 mb-2">
            <Users className="w-3 h-3 mr-1" />
            Assigned to: {item.assigned_to_name}
          </div>
        )}
        {item.phone && (
          <div className="flex items-center text-xs text-gray-400 mb-2">
            <Phone className="w-3 h-3 mr-1" />
            {item.phone}
          </div>
        )}
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {item.message || 'No message provided'}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(item.created_at).toLocaleDateString()}
          </span>
          {item.country && item.country !== 'Unknown' && (
            <span>{item.country}</span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {item.status === 'pending' && isSuperAdmin && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setSelectedItem(item);
                  setShowApprove(true);
                }}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Approve & Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-purple-500/30 text-purple-400"
                onClick={() => {
                  setSelectedItem(item);
                  setShowAssign(true);
                }}
              >
                <Users className="w-3 h-3 mr-1" />
                Assign
              </Button>
            </>
          )}
          
          {item.status !== 'resolved' && item.status !== 'approved' && item.status !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              className="border-green-500/30 text-green-400"
              onClick={() => resolveRequest(item.inquiry_id)}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Resolve
            </Button>
          )}
          
          {item.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400"
              onClick={() => rejectRequest(item.inquiry_id)}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            className="border-[#30363D]"
            onClick={() => {
              setSelectedItem(item);
              setShowDetail(true);
            }}
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => deleteSubmission(item.inquiry_id, 'access')}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const SubmissionCard = ({ item, type }) => (
    <Card className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              type === 'contact' ? 'bg-blue-500/10' : 'bg-purple-500/10'
            }`}>
              {type === 'contact' ? (
                <MessageSquare className="w-5 h-5 text-blue-400" />
              ) : (
                <FileText className="w-5 h-5 text-purple-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-base text-[#E8DDB5]">{item.name}</CardTitle>
              <p className="text-xs text-gray-500">{item.email}</p>
            </div>
          </div>
          {getStatusBadge(item.status)}
        </div>
      </CardHeader>
      <CardContent>
        {item.organization && (
          <div className="flex items-center text-xs text-gray-400 mb-2">
            <Building2 className="w-3 h-3 mr-1" />
            {item.organization}
          </div>
        )}
        {item.phone && (
          <div className="flex items-center text-xs text-gray-400 mb-2">
            <Phone className="w-3 h-3 mr-1" />
            {item.phone}
          </div>
        )}
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {item.message || item.reason || 'No message provided'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(item.created_at || item.submitted_at).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-[#30363D]"
              onClick={() => {
                setSelectedItem(item);
                setShowDetail(true);
              }}
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => deleteSubmission(item.submission_id || item.request_id, type)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="form-submissions-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
              <Mail className="w-8 h-8 text-[#D4A836]" />
              Forms
            </h1>
            <p className="text-gray-400">
              View and respond to contact inquiries and access requests
            </p>
          </div>
          <Button
            variant="outline"
            className="border-[#30363D]"
            onClick={fetchData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#E8DDB5]">{submissions.length}</p>
                  <p className="text-xs text-gray-500">Contact Forms</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#E8DDB5]">{accessRequests.length}</p>
                  <p className="text-xs text-gray-500">Access Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#E8DDB5]">
                    {[...submissions, ...accessRequests].filter(s => s.status === 'new' || s.status === 'pending').length}
                  </p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#E8DDB5]">
                    {[...submissions, ...accessRequests].filter(s => s.status === 'resolved' || s.status === 'responded').length}
                  </p>
                  <p className="text-xs text-gray-500">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#0D1117] border border-[#30363D] mb-6">
            <TabsTrigger value="contact">Contact Forms ({submissions.length})</TabsTrigger>
            <TabsTrigger value="access">Access Requests ({accessRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contact">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : submissions.length === 0 ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-lg font-semibold text-[#E8DDB5] mb-2">No Contact Submissions</h3>
                  <p className="text-gray-400">Contact form submissions will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {submissions.map((item) => (
                  <SubmissionCard key={item.submission_id} item={item} type="contact" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="access">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : accessRequests.length === 0 ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-lg font-semibold text-[#E8DDB5] mb-2">No Access Requests</h3>
                  <p className="text-gray-400">Access requests will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accessRequests.map((item) => (
                  <AccessRequestCard key={item.inquiry_id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve & Create User Dialog */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-400" />
              Approve & Create User
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a user account for {selectedItem?.name || selectedItem?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-[#0D1117] p-4 rounded-lg border border-[#30363D]">
              <p className="text-sm text-gray-400">Requesting User:</p>
              <p className="text-[#E8DDB5] font-medium">{selectedItem?.name}</p>
              <p className="text-sm text-gray-500">{selectedItem?.email}</p>
              {selectedItem?.organization && (
                <p className="text-sm text-gray-500">Organization: {selectedItem.organization}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={approveForm.role} onValueChange={(v) => setApproveForm(prev => ({ ...prev, role: v }))}>
                <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="trainee">Trainee</SelectItem>
                  <SelectItem value="org_admin">Organization Admin</SelectItem>
                  <SelectItem value="media_manager">Media Manager</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Organization (Optional)</Label>
              <Select 
                value={approveForm.organization_id} 
                onValueChange={(v) => setApproveForm(prev => ({ ...prev, organization_id: v }))}
              >
                <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="none">No Organization</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.organization_id} value={org.organization_id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0D1117] rounded-lg border border-[#30363D]">
              <div>
                <Label>Send Welcome Email</Label>
                <p className="text-xs text-gray-500">Email credentials to the user</p>
              </div>
              <Switch
                checked={approveForm.send_welcome_email}
                onCheckedChange={(checked) => setApproveForm(prev => ({ ...prev, send_welcome_email: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)} className="border-[#30363D]">
              Cancel
            </Button>
            <Button 
              onClick={approveAndCreateUser} 
              disabled={approving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Admin Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Assign to Admin
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select an admin to handle this request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {admins.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No admins available</p>
            ) : (
              admins.map(admin => (
                <Button
                  key={admin.user_id}
                  variant="outline"
                  className="w-full justify-start border-[#30363D] hover:border-purple-500/50"
                  onClick={() => assignToAdmin(admin.user_id)}
                >
                  <User className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <p className="text-[#E8DDB5]">{admin.name || admin.email}</p>
                    <p className="text-xs text-gray-500">{admin.role}</p>
                  </div>
                </Button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)} className="border-[#30363D] w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#D4A836]" />
              Submission Details
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Name</p>
                  <p className="text-[#E8DDB5]">{selectedItem.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-[#E8DDB5]">{selectedItem.email}</p>
                </div>
              </div>

              {selectedItem.phone && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-[#E8DDB5]">{selectedItem.phone}</p>
                </div>
              )}

              {selectedItem.organization && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Organization</p>
                  <p className="text-[#E8DDB5]">{selectedItem.organization}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Message</p>
                <div className="bg-[#0D1117] p-3 rounded-lg border border-[#30363D]">
                  <p className="text-[#E8DDB5] whitespace-pre-wrap">
                    {selectedItem.message || selectedItem.reason || 'No message'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Reply</p>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="bg-[#0D1117] border-[#30363D] min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)} className="border-[#30363D]">
              Close
            </Button>
            <Button 
              onClick={sendReply} 
              className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
              disabled={sending || !replyText.trim()}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
