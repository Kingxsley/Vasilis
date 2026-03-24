import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  ShieldAlert, AlertTriangle, CheckCircle, Lock, Unlock, RefreshCw,
  Activity, Key, Globe, Loader2, Search, Download, FileText, Filter,
  Calendar, Shield, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============== Security Dashboard Tab ==============
function SecurityDashboardTab({ token, user }) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [dashRes, logsRes] = await Promise.all([
        axios.get(`${API}/security/dashboard`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/audit-logs?limit=10`, { headers }).catch(() => ({ data: { logs: [] } })),
      ]);
      setDashboard(dashRes.data);
      setLogs(logsRes.data?.logs || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: dashboard?.total_users || 0, icon: Key, color: '#2979FF' },
          { label: '2FA Enabled', value: dashboard?.two_factor_users || 0, icon: Lock, color: '#00E676' },
          { label: 'Locked Accounts', value: dashboard?.locked_accounts || 0, icon: AlertTriangle, color: '#FF3B30' },
          { label: 'Recent Logins', value: dashboard?.recent_logins || 0, icon: Activity, color: '#FFB300' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardHeader><CardTitle className="text-lg">Recent Security Events</CardTitle></CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#21262D]/50 rounded-lg border border-[#30363D]">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={log.severity === 'warning' ? 'border-yellow-500 text-yellow-400' : log.severity === 'critical' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400'}>{log.action}</Badge>
                    <span className="text-sm text-gray-400">{log.user_email || 'System'}</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(log.timestamp || log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-center py-8">No recent security events</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Security Settings Tab ==============
function SecuritySettingsTab({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [force2FA, setForce2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/security/settings`, { headers: { Authorization: `Bearer ${token}` } });
      setForce2FA(res.data.force_2fa || false);
      setSessionTimeout(res.data.session_timeout || 30);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/security/settings`, { force_2fa: force2FA, session_timeout: sessionTimeout }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Security settings saved');
    } catch (e) { toast.error('Failed to save settings'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription className="text-gray-400">Enforce 2FA for all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Force 2FA for all users</Label>
              <p className="text-xs text-gray-500">Users must enable 2FA to log in</p>
            </div>
            <Switch checked={force2FA} onCheckedChange={setForce2FA} />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription className="text-gray-400">Configure session timeout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Admin Session Timeout (minutes)</Label>
            <Input type="number" value={sessionTimeout} onChange={e => setSessionTimeout(Number(e.target.value))} className="mt-1 bg-[#0D1117] border-[#30363D] w-32" min={5} max={1440} />
          </div>
        </CardContent>
      </Card>
      <Button onClick={saveSettings} disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Security Settings
      </Button>
    </div>
  );
}

// ============== Password Policy Tab ==============
function PasswordPolicyTab({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState({
    min_length: 8, require_uppercase: true, require_lowercase: true,
    require_numbers: true, require_special: true, password_expiry_days: 90,
    prevent_reuse: 5, lockout_attempts: 3, lockout_duration: 15,
  });

  useEffect(() => { fetchPolicy(); }, []);

  const fetchPolicy = async () => {
    try {
      const res = await axios.get(`${API}/security/password-policy`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data) setPolicy(prev => ({ ...prev, ...res.data }));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const savePolicy = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/security/password-policy`, policy, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Password policy saved');
    } catch (e) { toast.error('Failed to save password policy'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardHeader><CardTitle>Password Requirements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Minimum Length</Label>
            <Input type="number" value={policy.min_length} onChange={e => setPolicy(p => ({ ...p, min_length: Number(e.target.value) }))} className="mt-1 bg-[#0D1117] border-[#30363D] w-32" min={6} max={32} />
          </div>
          {[['require_uppercase', 'Require uppercase'], ['require_lowercase', 'Require lowercase'], ['require_numbers', 'Require numbers'], ['require_special', 'Require special characters']].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={policy[key]} onCheckedChange={v => setPolicy(p => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardHeader><CardTitle>Lockout Policy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Max failed attempts before lockout</Label>
            <Input type="number" value={policy.lockout_attempts} onChange={e => setPolicy(p => ({ ...p, lockout_attempts: Number(e.target.value) }))} className="mt-1 bg-[#0D1117] border-[#30363D] w-32" min={1} max={20} />
          </div>
          <div>
            <Label>Lockout duration (minutes)</Label>
            <Input type="number" value={policy.lockout_duration} onChange={e => setPolicy(p => ({ ...p, lockout_duration: Number(e.target.value) }))} className="mt-1 bg-[#0D1117] border-[#30363D] w-32" min={1} max={1440} />
          </div>
          <div>
            <Label>Password expiry (days, 0 = never)</Label>
            <Input type="number" value={policy.password_expiry_days} onChange={e => setPolicy(p => ({ ...p, password_expiry_days: Number(e.target.value) }))} className="mt-1 bg-[#0D1117] border-[#30363D] w-32" min={0} max={365} />
          </div>
        </CardContent>
      </Card>
      <Button onClick={savePolicy} disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Password Policy
      </Button>
    </div>
  );
}

// ============== Audit Logs Tab ==============
function AuditLogsTab({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');

  useEffect(() => { fetchLogs(); }, [severity]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (severity !== 'all') params.severity = severity;
      const res = await axios.get(`${API}/audit-logs`, { headers: { Authorization: `Bearer ${token}` }, params });
      setLogs(res.data?.logs || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (l.action || '').toLowerCase().includes(s) || (l.user_email || '').toLowerCase().includes(s) || (l.ip_address || '').includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[#161B22] border-[#30363D]" />
        </div>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[150px] bg-[#161B22] border-[#30363D]"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#161B22] border-[#30363D]">
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchLogs} className="border-[#30363D]"><RefreshCw className="w-4 h-4" /></Button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div> : (
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#30363D]">
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.slice(0, 50).map((log, i) => (
                    <TableRow key={i} className="border-[#30363D]">
                      <TableCell className="font-medium text-sm">{log.action}</TableCell>
                      <TableCell className="text-sm text-gray-400">{log.user_email || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-400 font-mono">{log.ip_address || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={log.severity === 'warning' ? 'border-yellow-500 text-yellow-400' : log.severity === 'critical' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400'}>{log.severity || 'info'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{new Date(log.timestamp || log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No logs found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============== Activity Logs Tab ==============
function ActivityLogsTab({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/activity-logs`, { headers: { Authorization: `Bearer ${token}` }, params: { limit: 100 } });
      setLogs(res.data?.logs || res.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = Array.isArray(logs) ? logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (l.action || '').toLowerCase().includes(s) || (l.user_email || '').toLowerCase().includes(s);
  }) : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search activity..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[#161B22] border-[#30363D]" />
        </div>
        <Button variant="outline" size="icon" onClick={fetchLogs} className="border-[#30363D]"><RefreshCw className="w-4 h-4" /></Button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div> : (
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#30363D]">
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.slice(0, 50).map((log, i) => (
                    <TableRow key={i} className="border-[#30363D]">
                      <TableCell className="font-medium text-sm">{log.action || log.event_type || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-400">{log.user_email || log.user_name || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-400 max-w-xs truncate">{typeof log.details === 'object' ? JSON.stringify(log.details).slice(0, 80) : log.details || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{new Date(log.timestamp || log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">No activity logs found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============== Main Security Hub ==============
export default function SecurityHub() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');

  useEffect(() => {
    setSearchParams(activeTab !== 'dashboard' ? { tab: activeTab } : {});
  }, [activeTab]);

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Lock },
    { id: 'password', label: 'Password Policy', icon: Key },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="security-hub-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Chivo, sans-serif' }}>Security & Logs</h1>
          <p className="text-gray-400">Security overview, settings, and audit trail</p>
        </div>

        <div className="flex gap-1 mb-6 bg-[#161B22] p-1 rounded-lg w-fit flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-[#D4A836] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'dashboard' && <SecurityDashboardTab token={token} user={user} />}
        {activeTab === 'settings' && <SecuritySettingsTab token={token} />}
        {activeTab === 'password' && <PasswordPolicyTab token={token} />}
        {activeTab === 'audit' && <AuditLogsTab token={token} />}
        {activeTab === 'activity' && <ActivityLogsTab token={token} />}
      </div>
    </DashboardLayout>
  );
}
