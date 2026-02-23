import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Filter, 
  Users, 
  Shield, 
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Building,
  Clock,
  Mail,
  MousePointerClick,
  KeyRound
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VulnerableUsers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ users: [], stats: {}, total: 0 });
  const [days, setDays] = useState(30);
  const [riskLevel, setRiskLevel] = useState('all');
  const [organizationId, setOrganizationId] = useState('all');
  const [organizations, setOrganizations] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ days: days.toString() });
      if (riskLevel !== 'all') params.append('risk_level', riskLevel);
      if (organizationId !== 'all') params.append('organization_id', organizationId);

      const response = await fetch(`${API_URL}/api/vulnerable-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch vulnerable users');
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load vulnerable users data');
    } finally {
      setLoading(false);
    }
  }, [days, riskLevel, organizationId]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/organizations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const orgs = await response.json();
        setOrganizations(orgs);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchOrganizations();
  }, [fetchData]);

  const exportData = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ days: days.toString() });
      if (organizationId !== 'all') params.append('organization_id', organizationId);

      const response = await fetch(`${API_URL}/api/vulnerable-users/export/${format}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`Failed to export as ${format.toUpperCase()}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vulnerable_users_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        // Open in new tab for print-to-PDF
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.onload = () => {
            newWindow.print();
          };
        }
        toast.info('PDF report opened - use Print dialog to save as PDF');
      } else {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vulnerable_users_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
      
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  const getRiskBadge = (level) => {
    const badges = {
      critical: { className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ShieldX },
      high: { className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: ShieldAlert },
      medium: { className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Shield },
      low: { className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: ShieldCheck }
    };
    const badge = badges[level] || badges.low;
    const Icon = badge.icon;
    return (
      <Badge className={`${badge.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {level.toUpperCase()}
      </Badge>
    );
  };

  const stats = data.stats || {};

  return (
    <div className="space-y-6" data-testid="vulnerable-users-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            Vulnerable Users
          </h1>
          <p className="text-gray-400 mt-1">
            Track users who clicked phishing links or submitted credentials
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchData}
            disabled={loading}
            data-testid="refresh-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="export-btn">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportData('csv')} data-testid="export-csv">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('json')} data-testid="export-json">
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('pdf')} data-testid="export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[180px]" data-testid="days-filter">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskLevel} onValueChange={setRiskLevel}>
          <SelectTrigger className="w-[180px]" data-testid="risk-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="submitted">Submitted Credentials</SelectItem>
            <SelectItem value="repeated">Repeat Offenders</SelectItem>
            <SelectItem value="clicked">Clicked Links</SelectItem>
          </SelectContent>
        </Select>

        <Select value={organizationId} onValueChange={setOrganizationId}>
          <SelectTrigger className="w-[200px]" data-testid="org-filter">
            <Building className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations.map(org => (
              <SelectItem key={org.organization_id} value={org.organization_id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#161B22] border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-red-500" />
              Critical Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{stats.critical || 0}</div>
            <p className="text-xs text-gray-500">Submitted credentials</p>
          </CardContent>
        </Card>

        <Card className="bg-[#161B22] border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">{stats.high || 0}</div>
            <p className="text-xs text-gray-500">3+ link clicks</p>
          </CardContent>
        </Card>

        <Card className="bg-[#161B22] border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-500" />
              Medium Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">{stats.medium || 0}</div>
            <p className="text-xs text-gray-500">2 link clicks</p>
          </CardContent>
        </Card>

        <Card className="bg-[#161B22] border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              Low Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{stats.low || 0}</div>
            <p className="text-xs text-gray-500">1 link click</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Vulnerable Users</p>
                <p className="text-2xl font-bold text-white">{data.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Link Clicks</p>
                <p className="text-2xl font-bold text-white">{stats.total_clicks || 0}</p>
              </div>
              <MousePointerClick className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Credential Submissions</p>
                <p className="text-2xl font-bold text-white">{stats.total_credential_submissions || 0}</p>
              </div>
              <KeyRound className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vulnerable Users List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : data.users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No vulnerable users found for the selected period</p>
              <p className="text-sm mt-2">Great job! Your users are staying vigilant.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#30363D]">
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Organization</TableHead>
                    <TableHead className="text-gray-400">Risk Level</TableHead>
                    <TableHead className="text-gray-400 text-center">Clicks</TableHead>
                    <TableHead className="text-gray-400 text-center">Credentials</TableHead>
                    <TableHead className="text-gray-400">Campaigns Failed</TableHead>
                    <TableHead className="text-gray-400">Last Failure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user, idx) => (
                    <TableRow key={idx} className="border-[#30363D] hover:bg-[#21262D]">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{user.user_name}</p>
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.user_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-300">{user.organization_name}</span>
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(user.risk_level)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-yellow-400 font-medium">{user.clicks}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.credential_submissions > 0 ? (
                          <span className="text-red-400 font-medium">{user.credential_submissions}</span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {user.campaigns_failed.slice(0, 2).map((campaign, i) => (
                            <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs">
                              {campaign}
                            </Badge>
                          ))}
                          {user.campaigns_failed.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.campaigns_failed.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-400 text-sm">
                          {user.last_failure ? new Date(user.last_failure).toLocaleDateString() : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
