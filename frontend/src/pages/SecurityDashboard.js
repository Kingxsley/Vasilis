import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { AlertTriangle, CheckCircle, Lock, Unlock, RefreshCw, Activity, Key, Globe, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SecurityDashboard() {
  const { token, user } = useAuth();
  const { setUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [loginHistory, setLoginHistory] = useState([]);

  // Two-Factor Authentication (2FA) setup state
  // Track whether the current user has 2FA enabled
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return user?.two_factor_enabled ?? false;
  });
  // If a setup has been initiated, store the secret and otpauth URL
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  // Input field for user to enter their 2FA code during verification
  const [twoFactorCode, setTwoFactorCode] = useState('');
  // Loading states for setup and verification
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false);
  const [twoFactorVerifyLoading, setTwoFactorVerifyLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchRecentLogs();
    fetchLoginHistory();
  }, []);

  // Initiate two-factor setup.  This calls the backend to generate a secret
  // and returns an otpauth URL which can be scanned with an authenticator app.
  const startTwoFactorSetup = async () => {
    setTwoFactorSetupLoading(true);
    setTwoFactorCode('');
    try {
      const res = await axios.post(
        `${API}/auth/two-factor/setup`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTwoFactorSecret(res.data.secret);
      setOtpAuthUrl(res.data.otp_auth_url);
      toast.success('Two-factor setup initiated. Scan the QR code and verify.');
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || 'Failed to initiate two-factor setup'
      );
    } finally {
      setTwoFactorSetupLoading(false);
    }
  };

  // Verify the two-factor code entered by the admin.  If successful,
  // two-factor authentication will be enabled on their account.
  const verifyTwoFactor = async () => {
    if (!twoFactorCode) {
      toast.error('Please enter the verification code from your authenticator app');
      return;
    }
    setTwoFactorVerifyLoading(true);
    try {
      await axios.post(
        `${API}/auth/two-factor/verify`,
        { code: twoFactorCode },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Two-factor authentication enabled');
      setTwoFactorEnabled(true);
      // Update user context to reflect 2FA enabled state
      if (user) {
        setUserData({ ...user, two_factor_enabled: true });
      }
      // Reset setup state
      setTwoFactorSecret('');
      setOtpAuthUrl('');
      setTwoFactorCode('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid two-factor code');
    } finally {
      setTwoFactorVerifyLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/security/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(res.data);
    } catch (err) {
      toast.error('Failed to load security dashboard');
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const res = await axios.get(`${API}/security/audit-logs?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs);
      setLogsTotal(res.data.total);
    } catch (err) {
      console.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      const res = await axios.get(`${API}/security/login-history?days=7`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoginHistory(res.data.history);
    } catch (err) {
      console.error('Failed to load login history');
    }
  };

  const unlockAccount = async (email) => {
    try {
      await axios.post(`${API}/security/unlock-account?email=${encodeURIComponent(email)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Account ${email} unlocked`);
      fetchDashboard();
    } catch (err) {
      toast.error('Failed to unlock account');
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[severity] || colors.info;
  };

  const getActionLabel = (action) => {
    const labels = {
      login_success: 'Login Success',
      login_failed_user_not_found: 'Login Failed (Unknown User)',
      login_failed_wrong_password: 'Login Failed (Wrong Password)',
      login_blocked_lockout: 'Login Blocked (Lockout)',
      login_failed_inactive: 'Login Failed (Inactive)',
      password_reset_completed: 'Password Reset',
      forgot_password_requested: 'Forgot Password',
      admin_unlock_account: 'Admin Unlock'
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
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
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Security Dashboard</h1>
            <p className="text-gray-400">Monitor security events and manage account access</p>
          </div>
          <Button 
            onClick={() => { fetchDashboard(); fetchRecentLogs(); }}
            variant="outline"
            className="border-[#D4A836]/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Two-Factor Authentication Setup */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#D4A836]" />
              Two-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            {twoFactorEnabled ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Two‑factor authentication is currently <span className="text-green-400 font-medium">enabled</span> on your account.
                </p>
                <p className="text-sm text-gray-500">
                  To disable or reset your 2FA, contact a system administrator.
                </p>
              </div>
            ) : otpAuthUrl ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Scan the QR code below with your authenticator app (e.g. Google Authenticator or Authy) or copy the secret key.
                </p>
                <div className="flex flex-col items-center gap-2">
                  {/* QR Code rendered client-side using qrcode.react */}
                  <div className="p-3 bg-white rounded-lg">
                    <QRCodeSVG
                      value={otpAuthUrl}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-xs font-mono text-gray-500 break-all">
                    Secret: {twoFactorSecret}
                  </p>
                </div>
                <div>
                  <Label htmlFor="twoFactorCode" className="text-gray-400">
                    Verification Code
                  </Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    placeholder="Enter 6‑digit code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="mt-1 bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                  />
                </div>
                <Button
                  onClick={verifyTwoFactor}
                  disabled={twoFactorVerifyLoading}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {twoFactorVerifyLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Enhance your account security by enabling two‑factor authentication. You will need an
                  authenticator app to generate verification codes.
                </p>
                <Button
                  onClick={startTwoFactorSetup}
                  disabled={twoFactorSetupLoading}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {twoFactorSetupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Enable Two‑Factor'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Successful Logins (24h)</p>
                  <p className="text-2xl font-bold text-green-400">
                    {dashboard?.summary?.successful_logins_24h || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Failed Logins (24h)</p>
                  <p className="text-2xl font-bold text-red-400">
                    {dashboard?.summary?.failed_logins_24h || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Account Lockouts (24h)</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {dashboard?.summary?.account_lockouts_24h || 0}
                  </p>
                </div>
                <Lock className="w-8 h-8 text-yellow-400/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Password Resets (24h)</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {dashboard?.summary?.password_resets_24h || 0}
                  </p>
                </div>
                <Key className="w-8 h-8 text-blue-400/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Active Lockouts</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {dashboard?.summary?.active_lockouts || 0}
                  </p>
                </div>
                <Lock className="w-8 h-8 text-orange-400/40" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Lockouts & Suspicious IPs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Lockouts */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Lock className="w-5 h-5 text-yellow-400" />
                Active Lockouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.active_lockouts?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No active lockouts</p>
              ) : (
                <div className="space-y-3">
                  {dashboard?.active_lockouts?.map((lockout, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg">
                      <div>
                        <p className="text-[#E8DDB5] font-medium">{lockout.email}</p>
                        <p className="text-xs text-gray-500">
                          {lockout.attempts} failed attempts • IP: {lockout.last_ip}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={() => unlockAccount(lockout.email)}
                      >
                        <Unlock className="w-4 h-4 mr-1" />
                        Unlock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suspicious IPs */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Globe className="w-5 h-5 text-red-400" />
                Suspicious IPs (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.suspicious_ips?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No suspicious activity detected</p>
              ) : (
                <div className="space-y-3">
                  {dashboard?.suspicious_ips?.map((ip, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg">
                      <div>
                        <p className="text-[#E8DDB5] font-mono">{ip.ip}</p>
                        <p className="text-xs text-gray-500">
                          {ip.failed_attempts} failed attempts targeting {ip.emails_targeted} email(s)
                        </p>
                      </div>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {ip.failed_attempts} attempts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Login History Chart */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#D4A836]" />
              Login Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {loginHistory.map((day, idx) => {
                const maxValue = Math.max(...loginHistory.map(d => d.successful + d.failed), 1);
                const successHeight = (day.successful / maxValue) * 100;
                const failHeight = (day.failed / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 w-full flex flex-col justify-end gap-0.5">
                      <div 
                        className="w-full bg-green-500/60 rounded-t"
                        style={{ height: `${successHeight}%`, minHeight: day.successful > 0 ? '4px' : 0 }}
                        title={`${day.successful} successful`}
                      />
                      <div 
                        className="w-full bg-red-500/60 rounded-b"
                        style={{ height: `${failHeight}%`, minHeight: day.failed > 0 ? '4px' : 0 }}
                        title={`${day.failed} failed`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500/60 rounded" />
                <span className="text-xs text-gray-400">Successful</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/60 rounded" />
                <span className="text-xs text-gray-400">Failed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Audit Log Preview & Link */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#E8DDB5]">Recent Audit Logs</CardTitle>
              <Button 
                variant="outline" 
                className="border-[#D4A836]/30 text-[#D4A836] hover:bg-[#D4A836]/10"
                onClick={() => window.location.href = '/audit-logs'}
                data-testid="view-all-logs-btn"
              >
                View All Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#D4A836]/20 hover:bg-transparent">
                    <TableHead className="text-gray-400 font-semibold w-[160px]">Timestamp</TableHead>
                    <TableHead className="text-gray-400 font-semibold w-[200px]">Action</TableHead>
                    <TableHead className="text-gray-400 font-semibold min-w-[180px]">Email</TableHead>
                    <TableHead className="text-gray-400 font-semibold w-[130px]">IP Address</TableHead>
                    <TableHead className="text-gray-400 font-semibold w-[90px] text-center">Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No recent audit logs
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.slice(0, 10).map((log, idx) => (
                      <TableRow key={idx} className="border-[#D4A836]/10 hover:bg-white/5">
                        <TableCell className="text-gray-400 text-sm font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-[#E8DDB5] font-medium">
                          {getActionLabel(log.action)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {log.user_email || '-'}
                        </TableCell>
                        <TableCell className="text-gray-400 font-mono text-sm">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getSeverityBadge(log.severity)}>
                            {log.severity || 'info'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {logsTotal > 10 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Showing 10 of {logsTotal} logs. <a href="/audit-logs" className="text-[#D4A836] hover:underline">View all</a>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
