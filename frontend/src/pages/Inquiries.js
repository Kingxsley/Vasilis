import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
  Mail, Phone, MessageSquare, Clock, User, 
  Loader2, RefreshCw, Trash2, CheckCircle, XCircle, 
  PhoneCall, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Inquiries() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const [inquiriesRes, statsRes] = await Promise.all([
        axios.get(`${API}/inquiries${params}`, { headers }),
        axios.get(`${API}/inquiries/stats`, { headers })
      ]);
      setInquiries(inquiriesRes.data.inquiries);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (inquiryId, status) => {
    if (!inquiryId || !status) {
      toast.error('Invalid inquiry or status');
      return;
    }
    
    setUpdating(true);
    try {
      const response = await axios.patch(`${API}/inquiries/${inquiryId}`, {
        status,
        admin_notes: adminNotes || null
      }, { headers });
      
      if (response.data) {
        toast.success(`Inquiry marked as ${status}`);
        
        // Store user data before closing dialog
        const userData = status === 'approved' && selectedInquiry ? {
          email: selectedInquiry.email,
          name: selectedInquiry.name || '',
          organization: selectedInquiry.organization || ''
        } : null;
        
        // Close dialog and reset state
        setShowDetailDialog(false);
        setSelectedInquiry(null);
        setAdminNotes('');
        
        // Refresh data
        await fetchData();
        
        // If approved, redirect to Users page with pre-filled data for creating the user
        if (status === 'approved' && userData) {
          setTimeout(() => {
            navigate('/users', { state: { createUser: userData } });
            toast.info('Create the user account now');
          }, 100);
        }
      }
    } catch (err) {
      console.error('Update error:', err);
      // Handle validation errors from Pydantic
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Failed to update inquiry';
      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        // Pydantic validation errors come as array
        errorMessage = errorDetail.map(e => e.msg || e.message || String(e)).join(', ');
      } else if (errorDetail && typeof errorDetail === 'object') {
        errorMessage = errorDetail.msg || errorDetail.message || JSON.stringify(errorDetail);
      }
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const deleteInquiry = async (inquiryId) => {
    if (!window.confirm('Delete this inquiry?')) return;
    try {
      await axios.delete(`${API}/inquiries/${inquiryId}`, { headers });
      toast.success('Inquiry deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete inquiry');
    }
  };

  const openDetail = (inquiry) => {
    setSelectedInquiry(inquiry);
    setAdminNotes(inquiry.admin_notes || '');
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
      contacted: { color: 'bg-blue-500/20 text-blue-500', icon: PhoneCall },
      approved: { color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
      rejected: { color: 'bg-red-500/20 text-red-500', icon: XCircle }
    };
    const { color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="inquiries-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Access Requests
            </h1>
            <p className="text-gray-500 mt-1">Review and manage signup inquiries</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            className="border-[#D4A836]/30 text-[#E8DDB5]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[#E8DDB5]">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">{stats.contacted}</p>
                <p className="text-sm text-gray-500">Contacted</p>
              </CardContent>
            </Card>
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </CardContent>
            </Card>
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
                <p className="text-sm text-gray-500">Rejected</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 bg-[#161B22] border-[#D4A836]/30 text-[#E8DDB5]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#161B22] border-[#30363D]">
              <SelectItem value="all">All Inquiries</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Inquiries List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : inquiries.length === 0 ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No inquiries yet</h3>
              <p className="text-gray-400">Access requests will appear here when users submit the signup form</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inquiry) => (
              <Card
                key={inquiry.inquiry_id}
                className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/30 transition-colors cursor-pointer"
                onClick={() => openDetail(inquiry)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-[#E8DDB5]">
                          <Mail className="w-4 h-4 text-[#D4A836]" />
                          {inquiry.email}
                        </div>
                        {getStatusBadge(inquiry.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {inquiry.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">{inquiry.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInquiry(inquiry.inquiry_id);
                      }}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-[#161B22] border-[#30363D] max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Inquiry Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                Review and update the inquiry status
              </DialogDescription>
            </DialogHeader>
            {selectedInquiry && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  {getStatusBadge(selectedInquiry.status)}
                </div>
                
                <div className="space-y-1">
                  <span className="text-gray-400 text-sm">Email</span>
                  <p className="text-[#E8DDB5] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#D4A836]" />
                    {selectedInquiry.email}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 text-sm">Phone</span>
                  <p className="text-[#E8DDB5] flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#D4A836]" />
                    {selectedInquiry.phone}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 text-sm">Message</span>
                  <p className="text-[#E8DDB5] bg-[#0f0f15] p-3 rounded-lg text-sm">
                    {selectedInquiry.message}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 text-sm">Submitted</span>
                  <p className="text-[#E8DDB5] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D4A836]" />
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-gray-400 text-sm">Admin Notes</span>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this inquiry..."
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    rows={2}
                  />
                </div>

                <div className="border-t border-[#30363D] pt-4">
                  <span className="text-gray-400 text-sm mb-3 block">Update Status</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateStatus(selectedInquiry.inquiry_id, 'contacted')}
                      disabled={updating}
                      className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                    >
                      <PhoneCall className="w-3 h-3 mr-1" />
                      Contacted
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateStatus(selectedInquiry.inquiry_id, 'approved')}
                      disabled={updating}
                      className="bg-green-500/20 text-green-500 hover:bg-green-500/30"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approved
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateStatus(selectedInquiry.inquiry_id, 'rejected')}
                      disabled={updating}
                      className="bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Rejected
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateStatus(selectedInquiry.inquiry_id, 'pending')}
                      disabled={updating}
                      className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Button>
                  </div>
                </div>

                {/* Tip for creating user */}
                {selectedInquiry.status === 'approved' && (
                  <div className="p-3 bg-[#D4A836]/10 rounded-lg border border-[#D4A836]/20">
                    <p className="text-sm text-gray-400">
                      <strong className="text-[#D4A836]">Next step:</strong> Go to Users page to create an account for this person.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
                className="border-[#D4A836]/30 text-[#E8DDB5]"
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
