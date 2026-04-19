import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Shield, Ban, CheckCircle, AlertTriangle, Clock, Trash2, 
  Lock, Unlock, RefreshCw, Download, Search, Plus, Eye, X, Users, Key, FileText, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
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
import { QRCodeSVG } from 'qrcode.react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SecurityCenter() {
  const { token, user, setUserData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Overview stats
  const [stats, setStats] = useState(null);
  
  // IP Management
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [whitelistedIPs, setWhitelistedIPs] = useState([]);
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [ipAttempts, setIPAttempts] = useState([]);
  const [searchIP, setSearchIP] = useState('');
  const [addIPDialog, setAddIPDialog] = useState({ open: false, type: null });
  const [ipInput, setIPInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  
  // Audit Logs
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [actionTypes, setActionTypes] = useState([]);
  const [logFilters, setLogFilters] = useState({
    action: '',
    severity: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  
  // Permissions
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled ?? false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      toast.error('Super admin access required');
      return;
    }
    fetchOverviewData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'audit-logs') {
      fetchAuditLogs();
    } else if (activeTab === 'permissions') {
      fetchPermissionsData();
    }
  }, [activeTab, logsPage, logFilters]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const [statsRes, blockedRes, whitelistRes, lockedRes, attemptsRes] = await Promise.all([
        axios.get(`${API}/security-center/dashboard-stats`, { headers }),
        axios.get(`${API}/security-center/blocked-ips`, { headers }),
        axios.get(`${API}/security-center/whitelisted-ips`, { headers }),
        axios.get(`${API}/security-center/locked-accounts`, { headers }),
        axios.get(`${API}/security-center/ip-attempts?limit=100`, { headers })
      ]);
      
      setStats(statsRes.data);
      setBlockedIPs(blockedRes.data.blocked_ips || []);
      setWhitelistedIPs(whitelistRes.data.whitelisted_ips || []);
      setLockedAccounts(lockedRes.data.locked_accounts || []);
      setIPAttempts(attemptsRes.data.attempts || []);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        limit: '25',
        offset: String(logsPage * 25)
      });
      if (logFilters.action) params.append('action', logFilters.action);
      if (logFilters.severity) params.append('severity', logFilters.severity);
      if (logFilters.search) params.append('user_email', logFilters.search);
      if (logFilters.startDate) params.append('start_date', logFilters.startDate);
      if (logFilters.endDate) params.append('end_date', logFilters.endDate);
      
      const res = await axios.get(`${API}/security/audit-logs?${params}`, { headers });
      setLogs(res.data.logs);
      setLogsTotal(res.data.total);
      setActionTypes(res.data.action_types || []);
    } catch (err) {
      toast.error('Failed to load audit logs');
    }
  };

  const fetchPermissionsData = async () => {
    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/permissions/roles`, { headers }),
        axios.get(`${API}/permissions/available`, { headers })
      ]);
      
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || []);
      setUsers(usersData);
      setAvailableRoles(rolesRes.data.assignable_roles || []);
      setAvailablePermissions(permsRes.data.permission_groups || {});
    } catch (err) {
      toast.error('Failed to load permissions data');
    }
  };

  // IP Management Functions
  const unblockIP = async (ip) => {
    try {
      await axios.post(`${API}/security-center/unblock-ip`, { ip_address: ip }, { headers });
      toast.success(`IP ${ip} unblocked`);
      fetchOverviewData();
    } catch (error) {
      toast.error('Failed to unblock IP');
    }
  };

  const removePermanentBlock = async (ip) => {
    try {
      await axios.delete(`${API}/security-center/unblock-ip-permanent/${ip}`, { headers });
      toast.success(`Permanent block removed for ${ip}`);
      fetchOverviewData();
    } catch (error) {
      toast.error('Failed to remove permanent block');
    }
  };

  const addPermanentBlock = async () => {
    try {
      await axios.post(`${API}/security-center/block-ip-permanent`, {
        ip_address: ipInput,
        reason: reasonInput
      }, { headers });
      toast.success(`IP ${ipInput} permanently blocked`);
      setAddIPDialog({ open: false, type: null });
      setIPInput('');
      setReasonInput('');
      fetchOverviewData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to block IP');
    }
  };

  const addWhitelist = async () => {
    try {
      await axios.post(`${API}/security-center/whitelist-ip`, {
        ip_address: ipInput,
        reason: reasonInput
      }, { headers });
      toast.success(`IP ${ipInput} whitelisted`);
      setAddIPDialog({ open: false, type: null });
      setIPInput('');
      setReasonInput('');
      fetchOverviewData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to whitelist IP');
    }
  };

  const removeWhitelist = async (ip) => {
    try {
      await axios.delete(`${API}/security-center/whitelist-ip/${ip}`, { headers });
      toast.success(`IP ${ip} removed from whitelist`);
      fetchOverviewData();
    } catch (error) {
      toast.error('Failed to remove from whitelist');
    }
  };

  const unlockAccount = async (email) => {
    try {
      await axios.post(`${API}/security-center/unlock-account?email=${encodeURIComponent(email)}`, {}, { headers });
      toast.success(`Account ${email} unlocked`);
      fetchOverviewData();
    } catch (error) {
      toast.error('Failed to unlock account');
    }
  };

  const clearAllTemporary = async () => {
    if (!window.confirm('Clear ALL temporary blocks and lockouts?')) return;
    try {
      const res = await axios.post(`${API}/security-center/clear-all-temporary-blocks`, {}, { headers });
      toast.success(`Cleared ${res.data.cleared_ips} IPs and ${res.data.cleared_accounts} accounts`);
      fetchOverviewData();
    } catch (error) {
      toast.error('Failed to clear blocks');
    }
  };

  // Permissions Functions
  const selectUser = async (usr) => {
    setSelectedUser(usr);
    setUserPermissions(null);
    
    try {
      const res = await axios.get(`${API}/permissions/user/${usr.user_id}`, { headers });
      setUserPermissions(res.data);
      setPermissionsDialogOpen(true);
    } catch (err) {
      toast.error('Failed to load user permissions');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.patch(`${API}/permissions/user/${userId}/role`, { role: newRole }, { headers });
      toast.success('Role updated');
      fetchPermissionsData();
      setPermissionsDialogOpen(false);
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  // 2FA Functions
  const start2FASetup = async () => {
    setSetupLoading(true);
    setTwoFactorCode('');
    try {
      const res = await axios.post(`${API}/auth/two-factor/setup`, {}, { headers });
      setTwoFactorSecret(res.data.secret);
      setOtpAuthUrl(res.data.otp_auth_url);
      toast.success('Two-factor setup initiated. Scan the QR code and verify.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to initiate two-factor setup');
    } finally {
      setSetupLoading(false);
    }
  };

  const verify2FACode = async () => {
    if (!twoFactorCode) {
      toast.error('Please enter the verification code');
      return;
    }
    setVerifyLoading(true);
    try {
      await axios.post(`${API}/auth/two-factor/verify`, { code: twoFactorCode }, { headers });
      toast.success('Two-factor authentication enabled');
      setTwoFactorEnabled(true);
      if (user) {
        setUserData({ ...user, two_factor_enabled: true });
      }
      setTwoFactorSecret('');
      setOtpAuthUrl('');
      setTwoFactorCode('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid two-factor code');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Audit Log Export
  const exportLogs = async (format) => {
    try {
      const params = new URLSearchParams({ format });
      if (logFilters.action) params.append('action', logFilters.action);
      if (logFilters.severity) params.append('severity', logFilters.severity);
      if (logFilters.search) params.append('user_email', logFilters.search);
      if (logFilters.startDate) params.append('start_date', logFilters.startDate);
      if (logFilters.endDate) params.append('end_date', logFilters.endDate);

      const res = await axios.get(`${API}/security/audit-logs/export?${params}`, {
        headers,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Logs exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to export logs');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString();
  };

  const formatSecondsRemaining = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">Super admin access required for Security Center</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#D4A836]" />
              Security Center
            </h1>
            <p className="text-gray-400 mt-1">Comprehensive security management and monitoring</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchOverviewData}
              variant="outline"
              className="border-[#30363D] text-gray-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Temp Blocked IPs</p>
                    <p className="text-2xl font-bold text-white">{stats.blocked_ips_temporary}</p>
                  </div>
                  <Ban className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Locked Accounts</p>
                    <p className="text-2xl font-bold text-white">{stats.locked_accounts}</p>
                  </div>
                  <Lock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Permanent Blocks</p>
                    <p className="text-2xl font-bold text-white">{stats.permanent_blocks}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Whitelisted IPs</p>
                    <p className="text-2xl font-bold text-white">{stats.whitelisted_ips}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Blocks (24h)</p>
                    <p className="text-2xl font-bold text-white">{stats.recent_blocks_24h}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#161B22] border border-[#30363D]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ip-management">IP Management</TabsTrigger>
            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="2fa">Two-Factor Auth</TabsTrigger>
          </Tabs>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Blocked IPs Summary */}
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader>
                  <CardTitle className="text-base">Recent Blocked IPs</CardTitle>
                  <CardDescription>Latest IP blocks from rate limiting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blockedIPs.slice(0, 5).map(block => (
                      <div key={block.ip_address} className="flex items-center justify-between p-2 bg-[#0D1117] rounded border border-[#30363D]">
                        <div>
                          <code className="text-white text-sm">{block.ip_address}</code>
                          <p className="text-xs text-gray-500">{block.reason}</p>
                        </div>
                        <Badge variant={block.block_type === 'permanent' ? 'destructive' : 'secondary'}>
                          {block.block_type}
                        </Badge>
                      </div>
                    ))}
                    {blockedIPs.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No blocked IPs</p>
                    )}
                  </div>
                  {blockedIPs.length > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('ip-management')}
                      className="w-full mt-4 border-[#30363D]"
                    >
                      View All ({blockedIPs.length})
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Locked Accounts Summary */}
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader>
                  <CardTitle className="text-base">Locked Accounts</CardTitle>
                  <CardDescription>Accounts temporarily locked due to failed attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lockedAccounts.slice(0, 5).map(acc => (
                      <div key={acc.email} className="flex items-center justify-between p-2 bg-[#0D1117] rounded border border-[#30363D]">
                        <div>
                          <p className="text-white text-sm">{acc.email}</p>
                          <p className="text-xs text-gray-500">Expires in {formatSecondsRemaining(acc.seconds_remaining)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unlockAccount(acc.email)}
                          className="text-xs"
                        >
                          Unlock
                        </Button>
                      </div>
                    ))}
                    {lockedAccounts.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No locked accounts</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => setAddIPDialog({ open: true, type: 'block' })}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Block IP Permanently
                  </Button>
                  <Button
                    onClick={() => setAddIPDialog({ open: true, type: 'whitelist' })}
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Add to Whitelist
                  </Button>
                  <Button
                    onClick={clearAllTemporary}
                    variant="outline"
                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Temporary
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IP Management Tab */}
          <TabsContent value="ip-management" className="space-y-4">
            <Tabs defaultValue="blocked" className="space-y-4">
              <TabsList className="bg-[#0D1117]">
                <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
                <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
                <TabsTrigger value="accounts">Locked Accounts</TabsTrigger>
                <TabsTrigger value="attempts">Login Attempts</TabsTrigger>
              </TabsList>

              {/* Blocked IPs */}
              <TabsContent value="blocked" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{blockedIPs.length} blocked IPs</p>
                  <Button
                    onClick={() => setAddIPDialog({ open: true, type: 'block' })}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Permanent Block
                  </Button>
                </div>

                <div className="grid gap-3">
                  {blockedIPs.map(block => (
                    <Card key={block.ip_address} className="bg-[#161B22] border-[#30363D]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-white font-mono">{block.ip_address}</code>
                              <Badge variant={block.block_type === 'permanent' ? 'destructive' : 'secondary'}>
                                {block.block_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">{block.reason}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Blocked: {formatTime(block.blocked_at)}</span>
                              {block.expires_at && (
                                <span>Expires: {formatSecondsRemaining(block.seconds_remaining)}</span>
                              )}
                              {block.attempts && <span>Attempts: {block.attempts}</span>}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => 
                              block.block_type === 'permanent' 
                                ? removePermanentBlock(block.ip_address)
                                : unblockIP(block.ip_address)
                            }
                            className="border-[#30363D] text-gray-400 hover:text-white"
                          >
                            <Unlock className="w-4 h-4 mr-1" />
                            Unblock
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {blockedIPs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Ban className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No blocked IPs</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Whitelist */}
              <TabsContent value="whitelist" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{whitelistedIPs.length} whitelisted IPs</p>
                  <Button
                    onClick={() => setAddIPDialog({ open: true, type: 'whitelist' })}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Whitelist
                  </Button>
                </div>

                <div className="grid gap-3">
                  {whitelistedIPs.map(wl => (
                    <Card key={wl.ip_address} className="bg-[#161B22] border-[#30363D]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-white font-mono">{wl.ip_address}</code>
                              <Badge variant="outline" className="border-green-500 text-green-400">
                                Whitelisted
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">{wl.reason}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Added: {formatTime(wl.whitelisted_at)}</span>
                              <span>By: {wl.whitelisted_by_email}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeWhitelist(wl.ip_address)}
                            className="border-[#30363D] text-gray-400 hover:text-white"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {whitelistedIPs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No whitelisted IPs</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Locked Accounts */}
              <TabsContent value="accounts" className="space-y-4">
                <p className="text-sm text-gray-400">{lockedAccounts.length} locked accounts</p>

                <div className="grid gap-3">
                  {lockedAccounts.map(acc => (
                    <Card key={acc.email} className="bg-[#161B22] border-[#30363D]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-medium">{acc.email}</span>
                              <Badge variant="secondary">Locked</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Locked: {formatTime(acc.locked_at)}</span>
                              <span>Expires: {formatSecondsRemaining(acc.seconds_remaining)}</span>
                              <span>Failed Attempts: {acc.failed_attempts}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unlockAccount(acc.email)}
                            className="border-[#30363D] text-gray-400 hover:text-white"
                          >
                            <Unlock className="w-4 h-4 mr-1" />
                            Unlock
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {lockedAccounts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No locked accounts</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Login Attempts */}
              <TabsContent value="attempts" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search by IP address..."
                    value={searchIP}
                    onChange={(e) => setSearchIP(e.target.value)}
                    className="max-w-xs bg-[#0D1117] border-[#30363D]"
                  />
                </div>

                <div className="grid gap-2">
                  {ipAttempts.filter(a => !searchIP || a.ip_address?.includes(searchIP)).map((attempt, i) => (
                    <Card key={i} className="bg-[#161B22] border-[#30363D]">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <code className="text-gray-400 font-mono text-xs">{attempt.ip_address}</code>
                            <Badge variant={
                              attempt.action.includes('success') ? 'outline' :
                              attempt.action.includes('blocked') ? 'destructive' : 'secondary'
                            }>
                              {attempt.action}
                            </Badge>
                            {attempt.user_email && <span className="text-gray-500">{attempt.user_email}</span>}
                          </div>
                          <span className="text-xs text-gray-500">{formatTime(attempt.timestamp)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit-logs" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  placeholder="Search by email..."
                  value={logFilters.search}
                  onChange={(e) => setLogFilters({...logFilters, search: e.target.value})}
                  className="max-w-xs bg-[#0D1117] border-[#30363D]"
                />
                <Select
                  value={logFilters.severity}
                  onValueChange={(value) => setLogFilters({...logFilters, severity: value})}
                >
                  <SelectTrigger className="w-40 bg-[#0D1117] border-[#30363D]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportLogs('csv')}
                  variant="outline"
                  size="sm"
                  className="border-[#30363D]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={() => exportLogs('json')}
                  variant="outline"
                  size="sm"
                  className="border-[#30363D]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </div>

            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#30363D] hover:bg-[#0D1117]">
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, i) => (
                      <TableRow key={i} className="border-[#30363D] hover:bg-[#0D1117]">
                        <TableCell className="text-xs text-gray-400">{formatTime(log.timestamp)}</TableCell>
                        <TableCell className="text-sm">{log.action}</TableCell>
                        <TableCell className="text-sm">{log.user_email || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address || '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs text-white ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {logsPage * 25 + 1} to {Math.min((logsPage + 1) * 25, logsTotal)} of {logsTotal}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setLogsPage(p => Math.max(0, p - 1))}
                  disabled={logsPage === 0}
                  variant="outline"
                  size="sm"
                  className="border-[#30363D]"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setLogsPage(p => p + 1)}
                  disabled={(logsPage + 1) * 25 >= logsTotal}
                  variant="outline"
                  size="sm"
                  className="border-[#30363D]"
                >
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="max-w-xs bg-[#0D1117] border-[#30363D]"
              />
            </div>

            <div className="grid gap-3">
              {users
                .filter(u => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.name?.toLowerCase().includes(userSearch.toLowerCase()))
                .map(usr => (
                <Card key={usr.user_id} className="bg-[#161B22] border-[#30363D]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-white font-medium">{usr.name || usr.email}</p>
                          <p className="text-sm text-gray-400">{usr.email}</p>
                        </div>
                        <Badge variant="outline">{usr.role}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectUser(usr)}
                        className="border-[#30363D]"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Manage Permissions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 2FA Tab */}
          <TabsContent value="2fa" className="space-y-4">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Secure your account with an additional layer of protection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!twoFactorEnabled ? (
                  <>
                    {!twoFactorSecret ? (
                      <div>
                        <p className="text-sm text-gray-400 mb-4">
                          Two-factor authentication is currently disabled. Enable it to add an extra layer of security to your account.
                        </p>
                        <Button
                          onClick={start2FASetup}
                          disabled={setupLoading}
                          className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
                        >
                          {setupLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            'Enable Two-Factor Authentication'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium text-white mb-2">Scan QR Code</h3>
                          <p className="text-sm text-gray-400 mb-4">
                            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                          </p>
                          <div className="bg-white p-4 rounded inline-block">
                            <QRCodeSVG value={otpAuthUrl} size={200} />
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-white mb-2">Or enter this secret manually</h3>
                          <code className="block bg-[#0D1117] p-3 rounded text-[#D4A836] font-mono text-sm">
                            {twoFactorSecret}
                          </code>
                        </div>

                        <div>
                          <Label>Verification Code</Label>
                          <Input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            maxLength={6}
                            className="bg-[#0D1117] border-[#30363D]"
                          />
                        </div>

                        <Button
                          onClick={verify2FACode}
                          disabled={verifyLoading || !twoFactorCode}
                          className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
                        >
                          {verifyLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify and Enable'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/50 rounded">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="text-white font-medium">Two-Factor Authentication Enabled</p>
                      <p className="text-sm text-gray-400">Your account is secured with 2FA</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add IP Dialog */}
        <Dialog open={addIPDialog.open} onOpenChange={(open) => setAddIPDialog({ ...addIPDialog, open })}>
          <DialogContent className="bg-[#161B22] border-[#30363D]">
            <DialogHeader>
              <DialogTitle>
                {addIPDialog.type === 'block' ? 'Add Permanent Block' : 'Add to Whitelist'}
              </DialogTitle>
              <DialogDescription>
                {addIPDialog.type === 'block' 
                  ? 'Permanently block an IP address from accessing the login endpoint'
                  : 'Whitelist an IP address to bypass all rate limiting'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>IP Address</Label>
                <Input
                  placeholder="e.g., 192.168.1.100"
                  value={ipInput}
                  onChange={(e) => setIPInput(e.target.value)}
                  className="bg-[#0D1117] border-[#30363D]"
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  placeholder="Why are you adding this IP?"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="bg-[#0D1117] border-[#30363D]"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddIPDialog({ open: false, type: null })}
                className="border-[#30363D]"
              >
                Cancel
              </Button>
              <Button
                onClick={addIPDialog.type === 'block' ? addPermanentBlock : addWhitelist}
                className={addIPDialog.type === 'block' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                disabled={!ipInput}
              >
                {addIPDialog.type === 'block' ? 'Block IP' : 'Whitelist IP'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="bg-[#161B22] border-[#30363D] max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Permissions: {selectedUser?.email}</DialogTitle>
              <DialogDescription>Update user role and permissions</DialogDescription>
            </DialogHeader>
            {userPermissions && (
              <div className="space-y-4 py-4">
                <div>
                  <Label>Current Role</Label>
                  <Select
                    value={userPermissions.role}
                    onValueChange={(role) => updateUserRole(selectedUser.user_id, role)}
                  >
                    <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium mb-2 block">Effective Permissions</Label>
                  <div className="bg-[#0D1117] p-3 rounded border border-[#30363D] max-h-40 overflow-y-auto">
                    {userPermissions.effective_permissions?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userPermissions.effective_permissions.map(perm => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No permissions</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPermissionsDialogOpen(false)}
                className="border-[#30363D]"
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
