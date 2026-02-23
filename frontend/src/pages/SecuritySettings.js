import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Loader2, ShieldAlert } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * SecuritySettings component
 *
 * Provides a UI for super administrators to configure global security controls
 * such as forcing two‑factor authentication and adjusting admin session timeouts.
 */
export default function SecuritySettings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [force2FA, setForce2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch current security settings from the backend
  const fetchSettings = async () => {
    try {
      const secRes = await axios.get(`${API}/settings/security`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForce2FA(secRes.data.force_2fa ?? false);
      const timeoutRes = await axios.get(`${API}/settings/session-timeout`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessionTimeout(timeoutRes.data.admin_session_timeout_minutes ?? 30);
    } catch (err) {
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  // Save updated settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // Update force_2fa
      await axios.patch(`${API}/settings/security`, { force_2fa: force2FA }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update session timeout
      await axios.patch(`${API}/settings/session-timeout`, { admin_session_timeout_minutes: sessionTimeout }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Security settings updated');
    } catch (err) {
      toast.error('Failed to update security settings');
    } finally {
      setSaving(false);
    }
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
      <div className="space-y-6" data-testid="security-settings-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5] flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-[#D4A836]" />
              Security Settings
            </h1>
            <p className="text-gray-400 mt-1">Configure global security policies</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </div>

        {/* Two-Factor enforcement */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5]">Two‑Factor Authentication</CardTitle>
            <CardDescription className="text-gray-400">
              Require all users to enable 2FA to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col gap-1">
              <Label className="text-gray-300">Enforce 2FA for all users</Label>
              <span className="text-sm text-gray-500">When enabled, users without 2FA will be unable to log in</span>
            </div>
            <Switch
              checked={force2FA}
              onCheckedChange={(checked) => setForce2FA(checked)}
            />
          </CardContent>
        </Card>

        {/* Session timeout */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5]">Admin Session Timeout</CardTitle>
            <CardDescription className="text-gray-400">
              Automatically log out admins after a period of inactivity (minutes)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col gap-1">
              <Label className="text-gray-300">Timeout (minutes)</Label>
              <span className="text-sm text-gray-500">Set a lower value for increased security</span>
            </div>
            <Input
              type="number"
              min="1"
              max="1440"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 1)}
              className="w-24 bg-[#0D1117] border-[#30363D] text-white"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}