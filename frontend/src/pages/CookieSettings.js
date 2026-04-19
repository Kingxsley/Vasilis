import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Cookie, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CookieSettings() {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/cookie-consent`)
      .then((res) => setSettings(res.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const update = (k, v) => setSettings((prev) => ({ ...prev, [k]: v }));

  const updateCategory = (index, key, value) => {
    const cats = [...(settings.categories || [])];
    cats[index] = { ...cats[index], [key]: value };
    update('categories', cats);
  };

  const addCategory = () => {
    update('categories', [
      ...(settings.categories || []),
      { key: `custom_${Date.now()}`, label: 'New Category', description: '', required: false },
    ]);
  };

  const removeCategory = (index) => {
    const cats = [...(settings.categories || [])];
    cats.splice(index, 1);
    update('categories', cats);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/settings/cookie-consent`, settings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(res.data);
      toast.success('Cookie settings saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center"><p className="text-gray-400">Access denied.</p></div>
      </DashboardLayout>
    );
  }

  if (loading || !settings) {
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
      <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5] flex items-center gap-2">
              <Cookie className="w-6 h-6 text-[#D4A836]" /> Cookie Consent
            </h1>
            <p className="text-gray-400">Control the cookie banner shown to public visitors. GDPR-style granular consent.</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            data-testid="cookie-save-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5]">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Show cookie banner</Label>
                <p className="text-xs text-gray-500">Disable to hide the banner for all visitors.</p>
              </div>
              <Switch
                checked={settings.enabled !== false}
                onCheckedChange={(v) => update('enabled', v)}
                data-testid="cookie-enabled-switch"
              />
            </div>

            <div>
              <Label>Banner Title</Label>
              <Input
                value={settings.title || ''}
                onChange={(e) => update('title', e.target.value)}
                className="bg-[#1a1a24] border-[#30363D] text-white"
                data-testid="cookie-title-input"
              />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                value={settings.message || ''}
                onChange={(e) => update('message', e.target.value)}
                rows={3}
                className="bg-[#1a1a24] border-[#30363D] text-white"
                data-testid="cookie-message-input"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Accept All button</Label>
                <Input
                  value={settings.accept_all_text || ''}
                  onChange={(e) => update('accept_all_text', e.target.value)}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
              <div>
                <Label>Reject All button</Label>
                <Input
                  value={settings.reject_all_text || ''}
                  onChange={(e) => update('reject_all_text', e.target.value)}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
              <div>
                <Label>Customize button</Label>
                <Input
                  value={settings.customize_text || ''}
                  onChange={(e) => update('customize_text', e.target.value)}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Save Preferences button</Label>
                <Input
                  value={settings.save_text || ''}
                  onChange={(e) => update('save_text', e.target.value)}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
              <div>
                <Label>Policy link text</Label>
                <Input
                  value={settings.policy_link_text || ''}
                  onChange={(e) => update('policy_link_text', e.target.value)}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Policy URL</Label>
                <Input
                  value={settings.policy_url || ''}
                  onChange={(e) => update('policy_url', e.target.value)}
                  placeholder="/cookie-policy"
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
              <div>
                <Label>Position</Label>
                <Select value={settings.position || 'bottom'} onValueChange={(v) => update('position', v)}>
                  <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom">Bottom (full-width)</SelectItem>
                    <SelectItem value="bottom-right">Bottom right (card)</SelectItem>
                    <SelectItem value="center">Center modal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#E8DDB5]">Consent Categories</CardTitle>
              <Button
                size="sm" variant="outline"
                onClick={addCategory}
                className="border-[#D4A836]/30 text-[#D4A836]"
                data-testid="cookie-add-cat-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Add category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(settings.categories || []).map((cat, i) => (
              <div key={i} className="p-4 rounded-lg bg-[#1a1a24] border border-[#30363D] space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Key (internal)</Label>
                    <Input
                      value={cat.key || ''}
                      onChange={(e) => updateCategory(i, 'key', e.target.value)}
                      className="bg-[#0f0f15] border-[#30363D] text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={cat.label || ''}
                      onChange={(e) => updateCategory(i, 'label', e.target.value)}
                      className="bg-[#0f0f15] border-[#30363D] text-white"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!cat.required}
                        onChange={(e) => updateCategory(i, 'required', e.target.checked)}
                        className="w-4 h-4 accent-[#D4A836]"
                      />
                      <span className="text-sm text-gray-300">Required</span>
                    </label>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => removeCategory(i)}
                      disabled={!!cat.required}
                      className="text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={cat.description || ''}
                    onChange={(e) => updateCategory(i, 'description', e.target.value)}
                    rows={2}
                    className="bg-[#0f0f15] border-[#30363D] text-white"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-gray-500 text-center">
          Changes apply to all new visitors. Already-consented visitors keep their saved choice until localStorage is cleared.
        </p>
      </div>
    </DashboardLayout>
  );
}
