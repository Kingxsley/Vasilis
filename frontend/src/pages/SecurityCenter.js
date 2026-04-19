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
  Lock, Unlock, RefreshCw, Download, Search, Plus, Eye, X 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SecurityCenter() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [whitelistedIPs, setWhitelistedIPs] = useState([]);
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [ipAttempts, setIPAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchIP, setSearchIP] = useState('');
  const [addIPDialog, setAddIPDialog] = useState({ open: false, type: null });
  const [ipInput, setIPInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      toast.error('Super admin access required');
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
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

  const unblockIP = async (ip) => {
    try {
      await axios.post(`${API}/security-center/unblock-ip`, { ip_address: ip }, { headers });
      toast.success(`IP ${ip} unblocked`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to unblock IP');
    }
  };

  const removePermanentBlock = async (ip) => {
    try {
      await axios.delete(`${API}/security-center/unblock-ip-permanent/${ip}`, { headers });
      toast.success(`Permanent block removed for ${ip}`);
      fetchAllData();
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
      fetchAllData();
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
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to whitelist IP');
    }
  };

  const removeWhitelist = async (ip) => {
    try {
      await axios.delete(`${API}/security-center/whitelist-ip/${ip}`, { headers });
      toast.success(`IP ${ip} removed from whitelist`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to remove from whitelist');
    }
  };

  const unlockAccount = async (email) => {
    try {
      await axios.post(`${API}/security-center/unlock-account?email=${encodeURIComponent(email)}`, {}, { headers });
      toast.success(`Account ${email} unlocked`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to unlock account');
    }
  };

  const clearAllTemporary = async () => {
    if (!window.confirm('Clear ALL temporary blocks and lockouts? This action affects all IPs and accounts.')) {
      return;
    }
    try {
      const res = await axios.post(`${API}/security-center/clear-all-temporary-blocks`, {}, { headers });
      toast.success(`Cleared ${res.data.cleared_ips} IPs and ${res.data.cleared_accounts} accounts`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to clear blocks');
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
            <p className="text-gray-400 mt-1">IP management, rate limiting, and security monitoring</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchAllData}
              variant="outline"
              className="border-[#30363D] text-gray-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={clearAllTemporary}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Temporary
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
        <Tabs defaultValue="blocked" className="space-y-4">
          <TabsList className="bg-[#161B22] border border-[#30363D]">
            <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
            <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
            <TabsTrigger value="accounts">Locked Accounts</TabsTrigger>
            <TabsTrigger value="attempts">Login Attempts</TabsTrigger>
          </TabsList>

          {/* Blocked IPs Tab */}
          <TabsContent value="blocked" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{blockedIPs.length} blocked IPs</p>
              <Button
                onClick={() => setAddIPDialog({ open: true, type: 'block' })}
                className="bg-red-500 hover:bg-red-600 text-white"
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

          {/* Whitelist Tab */}
          <TabsContent value="whitelist" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{whitelistedIPs.length} whitelisted IPs</p>
              <Button
                onClick={() => setAddIPDialog({ open: true, type: 'whitelist' })}
                className="bg-green-500 hover:bg-green-600 text-white"
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

          {/* Locked Accounts Tab */}
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

          {/* Login Attempts Tab */}
          <TabsContent value="attempts" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by IP address..."
                value={searchIP}
                onChange={(e) => setSearchIP(e.target.value)}
                className="max-w-xs bg-[#0D1117] border-[#30363D]"
              />
              <Button variant="outline" className="border-[#30363D]">
                <Search className="w-4 h-4" />
              </Button>
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
      </div>
    </DashboardLayout>
  );
}
