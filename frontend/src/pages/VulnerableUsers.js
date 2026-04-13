import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
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
  ChevronUp,
  FileJson,
  FileSpreadsheet,
  FileText,
  Building,
  Clock,
  Mail,
  MousePointerClick,
  KeyRound,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Eye,
  UserX,
  Target,
  GraduationCap
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
import { useAuth } from '../App';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Compact stat card component
const StatCard = ({ icon: Icon, label, value, subtext, color, trend }) => (
  <div className="bg-[#161B22] rounded-lg p-4 border border-[#30363D] hover:border-[#D4A836]/30 transition-colors">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    {subtext && <p className="text-[10px] text-gray-600 mt-1 pl-11">{subtext}</p>}
  </div>
);

// Risk level indicator
const RiskIndicator = ({ level }) => {
  const config = {
    critical: { bg: 'bg-red-500', text: 'text-red-400', label: 'CRITICAL' },
    high: { bg: 'bg-orange-500', text: 'text-orange-400', label: 'HIGH' },
    medium: { bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'MEDIUM' },
    low: { bg: 'bg-green-500', text: 'text-green-400', label: 'LOW' }
  };
  const c = config[level] || config.low;
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${c.bg}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </div>
  );
};

export default function VulnerableUsers() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ users: [], stats: {}, total: 0 });
  const [days, setDays] = useState(30);
  const [riskLevel, setRiskLevel] = useState('all');
  const [organizationId, setOrganizationId] = useState('all');
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('risk_level');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedUser, setExpandedUser] = useState(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [selectedUserForTraining, setSelectedUserForTraining] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);
  const [assigningTraining, setAssigningTraining] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
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
  }, [days, riskLevel, organizationId, token]);

  const fetchOrganizations = useCallback(async () => {
    try {
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
  }, [token]);

  useEffect(() => {
    fetchData();
    fetchOrganizations();
    fetchTrainingModules();
  }, [fetchData, fetchOrganizations, fetchTrainingModules]);

  // Fetch training modules for assignment
  const fetchTrainingModules = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/training/modules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const modules = await response.json();
        setTrainingModules(modules);
      }
    } catch (error) {
      console.error('Error fetching training modules:', error);
    }
  }, [token]);

  // View user profile - navigate to Users page with search filter
  const viewUserProfile = (user) => {
    // Navigate to users page with search query for this user
    navigate(`/users?search=${encodeURIComponent(user.user_email)}`);
  };

  // Open training assignment modal
  const openTrainingModal = (user) => {
    setSelectedUserForTraining(user);
    setShowTrainingModal(true);
  };

  // Assign training to user
  const assignTraining = async (moduleId) => {
    if (!selectedUserForTraining || !moduleId) return;
    setAssigningTraining(true);
    try {
      const response = await fetch(`${API_URL}/api/training/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_ids: [selectedUserForTraining.user_id],
          module_ids: [moduleId]
        })
      });
      
      if (response.ok) {
        toast.success(`Training assigned to ${selectedUserForTraining.user_name}`);
        setShowTrainingModal(false);
        setSelectedUserForTraining(null);
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to assign training');
      }
    } catch (error) {
      console.error('Error assigning training:', error);
      toast.error('Failed to assign training');
    } finally {
      setAssigningTraining(false);
    }
  };

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let users = [...(data.users || [])];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(u => 
        u.user_name?.toLowerCase().includes(query) ||
        u.user_email?.toLowerCase().includes(query) ||
        u.organization_name?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    users.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'risk_level':
          comparison = (riskOrder[a.risk_level] || 0) - (riskOrder[b.risk_level] || 0);
          break;
        case 'clicks':
          comparison = (a.clicks || 0) - (b.clicks || 0);
          break;
        case 'credentials':
          comparison = (a.credential_submissions || 0) - (b.credential_submissions || 0);
          break;
        case 'last_failure':
          comparison = new Date(a.last_failure || 0) - new Date(b.last_failure || 0);
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    
    return users;
  }, [data.users, searchQuery, sortField, sortDirection]);

  const exportData = async (format) => {
    try {
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
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.onload = () => newWindow.print();
        }
        toast.info('PDF report opened - use Print dialog to save');
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

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const stats = data.stats || {};
  const totalRisks = (stats.critical || 0) + (stats.high || 0) + (stats.medium || 0) + (stats.low || 0);

  return (
    <DashboardLayout>
    <div className="space-y-4" data-testid="vulnerable-users-page">
      {/* Compact Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Vulnerable Users</h1>
            <p className="text-xs text-gray-500">Track phishing link clicks & credential submissions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-[#30363D]">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#161B22] border-[#30363D]">
              <DropdownMenuItem onClick={() => exportData('csv')} className="text-gray-300 hover:text-white">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('json')} className="text-gray-300 hover:text-white">
                <FileJson className="h-4 w-4 mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('pdf')} className="text-gray-300 hover:text-white">
                <FileText className="h-4 w-4 mr-2" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Combined Filters & Search Row */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#0D1117] rounded-lg border border-[#30363D]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name, email, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#161B22] border-[#30363D] h-9 text-sm"
          />
        </div>
        
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[130px] h-9 bg-[#161B22] border-[#30363D]">
            <Clock className="h-3 w-3 mr-1 text-gray-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#161B22] border-[#30363D]">
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
            <SelectItem value="365">1 year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskLevel} onValueChange={setRiskLevel}>
          <SelectTrigger className="w-[140px] h-9 bg-[#161B22] border-[#30363D]">
            <Filter className="h-3 w-3 mr-1 text-gray-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#161B22] border-[#30363D]">
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="submitted">Credentials</SelectItem>
            <SelectItem value="repeated">Repeat</SelectItem>
            <SelectItem value="clicked">Clicked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={organizationId} onValueChange={setOrganizationId}>
          <SelectTrigger className="w-[160px] h-9 bg-[#161B22] border-[#30363D]">
            <Building className="h-3 w-3 mr-1 text-gray-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#161B22] border-[#30363D]">
            <SelectItem value="all">All Orgs</SelectItem>
            {organizations.map(org => (
              <SelectItem key={org.organization_id} value={org.organization_id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid - Compact 2 rows */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* Risk breakdown */}
        <StatCard 
          icon={ShieldX} 
          label="Critical" 
          value={stats.critical || 0}
          color="bg-red-500/20 text-red-400"
        />
        <StatCard 
          icon={ShieldAlert} 
          label="High" 
          value={stats.high || 0}
          color="bg-orange-500/20 text-orange-400"
        />
        <StatCard 
          icon={Shield} 
          label="Medium" 
          value={stats.medium || 0}
          color="bg-yellow-500/20 text-yellow-400"
        />
        <StatCard 
          icon={ShieldCheck} 
          label="Low" 
          value={stats.low || 0}
          color="bg-green-500/20 text-green-400"
        />
        {/* Summary stats */}
        <StatCard 
          icon={UserX} 
          label="Total At Risk" 
          value={data.total || 0}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard 
          icon={MousePointerClick} 
          label="Total Clicks" 
          value={stats.total_clicks || 0}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard 
          icon={KeyRound} 
          label="Credentials" 
          value={stats.total_credential_submissions || 0}
          color="bg-pink-500/20 text-pink-400"
        />
      </div>

      {/* Risk Distribution Bar */}
      {totalRisks > 0 && (
        <div className="bg-[#161B22] rounded-lg p-3 border border-[#30363D]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Risk Distribution</span>
            <span className="text-xs text-gray-500">{totalRisks} users</span>
          </div>
          <div className="h-2 bg-[#0D1117] rounded-full overflow-hidden flex">
            {stats.critical > 0 && (
              <div 
                className="bg-red-500 h-full transition-all" 
                style={{ width: `${(stats.critical / totalRisks) * 100}%` }}
                title={`Critical: ${stats.critical}`}
              />
            )}
            {stats.high > 0 && (
              <div 
                className="bg-orange-500 h-full transition-all" 
                style={{ width: `${(stats.high / totalRisks) * 100}%` }}
                title={`High: ${stats.high}`}
              />
            )}
            {stats.medium > 0 && (
              <div 
                className="bg-yellow-500 h-full transition-all" 
                style={{ width: `${(stats.medium / totalRisks) * 100}%` }}
                title={`Medium: ${stats.medium}`}
              />
            )}
            {stats.low > 0 && (
              <div 
                className="bg-green-500 h-full transition-all" 
                style={{ width: `${(stats.low / totalRisks) * 100}%` }}
                title={`Low: ${stats.low}`}
              />
            )}
          </div>
          <div className="flex justify-between mt-1">
            <div className="flex gap-3">
              <span className="text-[10px] text-red-400">{stats.critical || 0} critical</span>
              <span className="text-[10px] text-orange-400">{stats.high || 0} high</span>
              <span className="text-[10px] text-yellow-400">{stats.medium || 0} medium</span>
              <span className="text-[10px] text-green-400">{stats.low || 0} low</span>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-[#D4A836]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="text-gray-300 font-medium">No vulnerable users found</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Great job! Your users are staying vigilant.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#30363D] hover:bg-transparent">
                    <TableHead className="text-gray-500 text-xs font-medium">USER</TableHead>
                    <TableHead className="text-gray-500 text-xs font-medium">ORG</TableHead>
                    <TableHead 
                      className="text-gray-500 text-xs font-medium cursor-pointer hover:text-gray-300"
                      onClick={() => toggleSort('risk_level')}
                    >
                      <div className="flex items-center gap-1">
                        RISK
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-gray-500 text-xs font-medium text-center cursor-pointer hover:text-gray-300"
                      onClick={() => toggleSort('clicks')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        CLICKS
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-gray-500 text-xs font-medium text-center cursor-pointer hover:text-gray-300"
                      onClick={() => toggleSort('credentials')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        CREDS
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-500 text-xs font-medium">CAMPAIGNS</TableHead>
                    <TableHead 
                      className="text-gray-500 text-xs font-medium cursor-pointer hover:text-gray-300"
                      onClick={() => toggleSort('last_failure')}
                    >
                      <div className="flex items-center gap-1">
                        LAST FAIL
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, idx) => (
                    <React.Fragment key={idx}>
                      <TableRow 
                        className={`border-[#30363D] hover:bg-[#21262D] cursor-pointer transition-colors ${
                          expandedUser === idx ? 'bg-[#21262D]' : ''
                        }`}
                        onClick={() => setExpandedUser(expandedUser === idx ? null : idx)}
                      >
                        <TableCell className="py-2">
                          <div>
                            <p className="font-medium text-white text-sm">{user.user_name}</p>
                            <p className="text-xs text-gray-500">{user.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-gray-400 text-sm">{user.organization_name || '-'}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <RiskIndicator level={user.risk_level} />
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <span className={`font-medium text-sm ${
                            user.clicks >= 3 ? 'text-orange-400' : 
                            user.clicks >= 2 ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {user.clicks}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          {user.credential_submissions > 0 ? (
                            <span className="text-red-400 font-medium text-sm">{user.credential_submissions}</span>
                          ) : (
                            <span className="text-gray-600 text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-400 text-sm">{user.campaigns_failed?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-gray-500 text-xs">
                            {user.last_failure ? new Date(user.last_failure).toLocaleDateString() : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          {expandedUser === idx ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details Row */}
                      {expandedUser === idx && (
                        <TableRow className="bg-[#0D1117] border-[#30363D]">
                          <TableCell colSpan={8} className="py-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Failed Campaigns</p>
                                <div className="flex flex-wrap gap-1">
                                  {user.campaigns_failed?.length > 0 ? (
                                    user.campaigns_failed.map((campaign, i) => (
                                      <Badge key={i} variant="outline" className="text-xs border-[#30363D] text-gray-400">
                                        {campaign}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-600">None</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Contact</p>
                                <a 
                                  href={`mailto:${user.user_email}`}
                                  className="text-xs text-[#D4A836] hover:underline flex items-center gap-1"
                                >
                                  <Mail className="h-3 w-3" />
                                  {user.user_email}
                                </a>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Actions</p>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs border-[#30363D]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      viewUserProfile(user);
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Profile
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs border-[#D4A836]/30 text-[#D4A836]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTrainingModal(user);
                                    }}
                                  >
                                    <GraduationCap className="h-3 w-3 mr-1" />
                                    Assign Training
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Footer with count */}
          {filteredUsers.length > 0 && (
            <div className="px-4 py-2 border-t border-[#30363D] flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Showing {filteredUsers.length} of {data.total || 0} vulnerable users
              </span>
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-gray-400 h-6"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Assignment Modal */}
      {showTrainingModal && selectedUserForTraining && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTrainingModal(false)}>
          <div className="bg-[#161B22] rounded-lg border border-[#30363D] w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Assign Training</h3>
            <p className="text-sm text-gray-400 mb-4">
              Assign remedial training to <span className="text-[#D4A836]">{selectedUserForTraining.user_name}</span>
            </p>
            
            {trainingModules.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {trainingModules.map((module) => (
                  <button
                    key={module.module_id}
                    onClick={() => assignTraining(module.module_id)}
                    disabled={assigningTraining}
                    className="w-full text-left p-3 rounded-lg border border-[#30363D] hover:border-[#D4A836]/50 hover:bg-[#D4A836]/5 transition-colors"
                  >
                    <p className="font-medium text-white text-sm">{module.name}</p>
                    <p className="text-xs text-gray-500">{module.description || 'Security training module'}</p>
                    <p className="text-xs text-gray-600 mt-1">{module.duration_minutes || 30} minutes • {module.difficulty || 'intermediate'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">No training modules available</p>
                <p className="text-xs text-gray-500 mt-1">Create training modules in Module Designer</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-[#D4A836]/30 text-[#D4A836]"
                  onClick={() => {
                    setShowTrainingModal(false);
                    navigate('/training/modules');
                  }}
                >
                  Go to Module Designer
                </Button>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowTrainingModal(false)}
                className="border-[#30363D]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
