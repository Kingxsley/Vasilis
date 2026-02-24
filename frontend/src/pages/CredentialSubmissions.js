import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  KeyRound, AlertTriangle, Download, RefreshCw, Building2, 
  Mail, Calendar, User, FileText, Plus, BarChart3, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CredentialSubmissions() {
  const { token, user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testData, setTestData] = useState({
    campaign_id: '',
    test_email: '',
    test_username: '',
    test_name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [selectedCampaign]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCampaign !== 'all' ? { campaign_id: selectedCampaign } : {};
      
      const [submissionsRes, statsRes, campaignsRes] = await Promise.all([
        axios.get(`${API}/phishing/credential-submissions`, { headers, params }),
        axios.get(`${API}/phishing/credential-submissions/stats`, { headers }),
        axios.get(`${API}/phishing/campaigns`, { headers })
      ]);
      
      setSubmissions(submissionsRes.data.submissions || []);
      setStats(statsRes.data);
      setCampaigns(campaignsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load credential submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestSubmission = async () => {
    if (!testData.campaign_id) {
      toast.error('Please select a campaign');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/phishing/credential-submissions/test`, testData, { headers });
      toast.success('Test credential submission created');
      setShowTestDialog(false);
      setTestData({ campaign_id: '', test_email: '', test_username: '', test_name: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create test submission');
    } finally {
      setSubmitting(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['User Email', 'User Name', 'Entered Username', 'Campaign', 'Organization', 'Submitted At'].join(','),
      ...submissions.map(s => [
        s.user_email,
        s.user_name || '',
        s.entered_username || '',
        s.campaign_name,
        s.organization_name,
        s.credentials_submitted_at
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credential_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const chartData = stats?.by_campaign?.map(c => ({
    name: c.campaign_name?.length > 20 ? c.campaign_name.substring(0, 20) + '...' : c.campaign_name,
    submissions: c.submission_count,
    users: c.unique_user_count
  })) || [];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="credential-submissions-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
              <KeyRound className="w-8 h-8 text-[#FF3B30]" />
              Credential Submissions
            </h1>
            <p className="text-gray-400">Track users who submitted credentials in phishing simulations</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchData}
              className="border-[#30363D]"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="border-[#30363D]"
              disabled={submissions.length === 0}
              data-testid="export-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowTestDialog(true)}
              className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
              data-testid="create-test-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#FF3B30]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Submissions</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_submissions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFB300]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#FFB300]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Unique Users</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_unique_users || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2979FF]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#2979FF]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Campaigns</p>
                  <p className="text-2xl font-bold text-white">{stats?.campaign_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00E676]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#00E676]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Latest</p>
                  <p className="text-sm font-medium text-white">
                    {submissions[0]?.credentials_submitted_at 
                      ? new Date(submissions[0].credentials_submitted_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="bg-[#161B22] border-[#30363D] mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#FF3B30]" />
                Submissions by Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#6B7280" 
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#161B22', 
                      border: '1px solid #30363D',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="submissions" fill="#FF3B30" radius={[0, 4, 4, 0]} name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Filter and Table */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">Submission Details</CardTitle>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-[250px] bg-[#0D1117] border-[#30363D]">
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.campaign_id} value={c.campaign_id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#D4A836] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <KeyRound className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No credential submissions found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Create a credential harvest campaign and run a test to see data here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#30363D]">
                      <TableHead className="text-gray-400">User</TableHead>
                      <TableHead className="text-gray-400">Entered Username</TableHead>
                      <TableHead className="text-gray-400">Campaign</TableHead>
                      <TableHead className="text-gray-400">Organization</TableHead>
                      <TableHead className="text-gray-400">Submitted At</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((s, idx) => (
                      <TableRow key={s.target_id || idx} className="border-[#30363D]">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{s.user_email}</p>
                            {s.user_name && (
                              <p className="text-xs text-gray-500">{s.user_name}</p>
                            )}
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
                        <TableCell className="text-gray-400">
                          {s.organization_name || '-'}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {formatDate(s.credentials_submitted_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/30">
                            Critical
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Submission Dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#D4A836]" />
                Create Test Credential Submission
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a simulated credential submission for testing and demo purposes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Campaign *</Label>
                <Select 
                  value={testData.campaign_id} 
                  onValueChange={(v) => setTestData(prev => ({ ...prev, campaign_id: v }))}
                >
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {campaigns.map(c => (
                      <SelectItem key={c.campaign_id} value={c.campaign_id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Test User Email</Label>
                <Input
                  value={testData.test_email}
                  onChange={(e) => setTestData(prev => ({ ...prev, test_email: e.target.value }))}
                  placeholder={user?.email || "test@example.com"}
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>

              <div className="space-y-2">
                <Label>Test User Name</Label>
                <Input
                  value={testData.test_name}
                  onChange={(e) => setTestData(prev => ({ ...prev, test_name: e.target.value }))}
                  placeholder="Test User"
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>

              <div className="space-y-2">
                <Label>Entered Username (simulated)</Label>
                <Input
                  value={testData.test_username}
                  onChange={(e) => setTestData(prev => ({ ...prev, test_username: e.target.value }))}
                  placeholder="demo_user@company.com"
                  className="bg-[#0D1117] border-[#30363D]"
                />
                <p className="text-xs text-gray-500">
                  This is the username that would appear as if entered by the user
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTestDialog(false)}
                className="border-[#30363D]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTestSubmission}
                disabled={submitting || !testData.campaign_id}
                className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
              >
                {submitting ? 'Creating...' : 'Create Test Submission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
