import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Shield, Lock, Key, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PasswordPolicyPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special: true,
    // Support both names for expiry
    password_expiry_days: 90,
    expiry_reminder_days: 7,
    max_age_days: 90,
    prevent_reuse: 5,
    lockout_attempts: 3,
    lockout_duration_minutes: 15
  });

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await axios.get(`${API}/settings/password-policy`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Map synonyms so the UI works regardless of backend field names
      const data = response.data;
      setPolicy(prev => ({
        ...prev,
        min_length: data.min_length ?? prev.min_length,
        require_uppercase: data.require_uppercase ?? prev.require_uppercase,
        require_lowercase: data.require_lowercase ?? prev.require_lowercase,
        require_numbers: data.require_numbers ?? prev.require_numbers,
        require_special: data.require_special ?? prev.require_special,
        password_expiry_days: data.password_expiry_days ?? data.max_age_days ?? prev.password_expiry_days,
        max_age_days: data.password_expiry_days ?? data.max_age_days ?? prev.max_age_days,
        expiry_reminder_days: data.expiry_reminder_days ?? prev.expiry_reminder_days,
        prevent_reuse: data.prevent_reuse ?? prev.prevent_reuse,
        lockout_attempts: data.lockout_attempts ?? prev.lockout_attempts,
        lockout_duration_minutes: data.lockout_duration_minutes ?? prev.lockout_duration_minutes
      }));
    } catch (error) {
      console.error('Failed to load password policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send both names for expiry to ensure backwards compatibility
      const payload = {
        ...policy,
        max_age_days: policy.password_expiry_days,
        password_expiry_days: policy.password_expiry_days,
        expiry_reminder_days: policy.expiry_reminder_days
      };
      await axios.patch(`${API}/settings/password-policy`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password policy updated');
    } catch (error) {
      toast.error('Failed to save password policy');
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
      <div className="space-y-6" data-testid="password-policy-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#D4A836]" />
              Password Policy
            </h1>
            <p className="text-gray-400 mt-1">Configure password requirements and security settings</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            data-testid="save-policy-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Password Requirements */}
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Key className="w-5 h-5" />
                Password Requirements
              </CardTitle>
              <CardDescription className="text-gray-400">
                Set minimum requirements for user passwords
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Minimum Length</Label>
                <Input
                  type="number"
                  min="6"
                  max="32"
                  value={policy.min_length}
                  onChange={(e) => setPolicy({ ...policy, min_length: parseInt(e.target.value) || 8 })}
                  className="bg-[#0D1117] border-[#30363D] text-white"
                  data-testid="min-length-input"
                />
                <p className="text-xs text-gray-500">Recommended: 8-12 characters minimum</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Require Uppercase</Label>
                    <p className="text-xs text-gray-500">At least one uppercase letter (A-Z)</p>
                  </div>
                  <Switch
                    checked={policy.require_uppercase}
                    onCheckedChange={(checked) => setPolicy({ ...policy, require_uppercase: checked })}
                    data-testid="require-uppercase-switch"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Require Lowercase</Label>
                    <p className="text-xs text-gray-500">At least one lowercase letter (a-z)</p>
                  </div>
                  <Switch
                    checked={policy.require_lowercase}
                    onCheckedChange={(checked) => setPolicy({ ...policy, require_lowercase: checked })}
                    data-testid="require-lowercase-switch"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Require Numbers</Label>
                    <p className="text-xs text-gray-500">At least one number (0-9)</p>
                  </div>
                  <Switch
                    checked={policy.require_numbers}
                    onCheckedChange={(checked) => setPolicy({ ...policy, require_numbers: checked })}
                    data-testid="require-numbers-switch"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Require Special Characters</Label>
                    <p className="text-xs text-gray-500">At least one special character (!@#$%^&*)</p>
                  </div>
                  <Switch
                    checked={policy.require_special}
                    onCheckedChange={(checked) => setPolicy({ ...policy, require_special: checked })}
                    data-testid="require-special-switch"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Account Security
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure account lockout and password rotation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Password Expiry (Days)</Label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={policy.password_expiry_days}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setPolicy({ ...policy, password_expiry_days: val, max_age_days: val });
                  }}
                  className="bg-[#0D1117] border-[#30363D] text-white"
                  data-testid="max-age-input"
                />
                <p className="text-xs text-gray-500">Set to 0 to disable password expiry</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Prevent Password Reuse</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={policy.prevent_reuse}
                  onChange={(e) => setPolicy({ ...policy, prevent_reuse: parseInt(e.target.value) || 0 })}
                  className="bg-[#0D1117] border-[#30363D] text-white"
                  data-testid="prevent-reuse-input"
                />
                <p className="text-xs text-gray-500">Number of previous passwords that cannot be reused</p>
              </div>

              <div className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FFB300]" />
                  <Label className="text-[#E8DDB5]">Account Lockout Settings</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Failed Attempts</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={policy.lockout_attempts}
                      onChange={(e) => setPolicy({ ...policy, lockout_attempts: parseInt(e.target.value) || 3 })}
                      className="bg-[#161B22] border-[#30363D] text-white"
                      data-testid="lockout-attempts-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Lockout Duration (min)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="1440"
                      value={policy.lockout_duration_minutes}
                      onChange={(e) => setPolicy({ ...policy, lockout_duration_minutes: parseInt(e.target.value) || 15 })}
                      className="bg-[#161B22] border-[#30363D] text-white"
                      data-testid="lockout-duration-input"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Account will be locked for {policy.lockout_duration_minutes} minutes after {policy.lockout_attempts} failed login attempts
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Policy Preview */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5]">Policy Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0D1117] p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-[#D4A836]">{policy.min_length}+</p>
                <p className="text-xs text-gray-400">Min Characters</p>
              </div>
              <div className="bg-[#0D1117] p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-[#D4A836]">
                  {[policy.require_uppercase, policy.require_lowercase, policy.require_numbers, policy.require_special].filter(Boolean).length}
                </p>
                <p className="text-xs text-gray-400">Complexity Rules</p>
              </div>
              <div className="bg-[#0D1117] p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-[#D4A836]">{policy.lockout_attempts}</p>
                <p className="text-xs text-gray-400">Lockout Threshold</p>
              </div>
              <div className="bg-[#0D1117] p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-[#D4A836]">{policy.max_age_days || '∞'}</p>
                <p className="text-xs text-gray-400">Days Until Expiry</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
