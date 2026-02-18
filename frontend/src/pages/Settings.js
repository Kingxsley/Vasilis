import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Upload, Trash2, Loader2, Image, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const { token } = useAuth();
  const [branding, setBranding] = useState({
    company_name: 'VasilisNetShield',
    tagline: 'Human + AI Powered Security Training',
    logo_url: null,
    primary_color: '#D4A836',
    secondary_color: '#0f3460'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await axios.get(`${API}/settings/branding`);
      setBranding(response.data);
    } catch (error) {
      console.error('Failed to load branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/settings/branding`, {
        company_name: branding.company_name,
        tagline: branding.tagline,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use PNG, JPEG, SVG, or WebP');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/settings/branding/logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setBranding(prev => ({ ...prev, logo_url: response.data.logo_url }));
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!window.confirm('Remove the logo?')) return;

    try {
      await axios.delete(`${API}/settings/branding/logo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranding(prev => ({ ...prev, logo_url: null }));
      toast.success('Logo removed');
    } catch (error) {
      toast.error('Failed to remove logo');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Settings
          </h1>
          <p className="text-gray-500 mt-1">Customize your branding and appearance</p>
        </div>

        <div className="space-y-6">
          {/* Logo Upload */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Company Logo</CardTitle>
              <CardDescription>
                Upload your logo (PNG, JPEG, SVG, WebP - Max 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-[#D4A836]/30 flex items-center justify-center bg-[#1a1a24] overflow-hidden">
                  {branding.logo_url ? (
                    <img 
                      src={branding.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Shield className="w-12 h-12 text-[#D4A836]/50" />
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                      data-testid="upload-logo-btn"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                    {branding.logo_url && (
                      <Button
                        variant="outline"
                        onClick={handleLogoDelete}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        data-testid="delete-logo-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Recommended: Square image, at least 200x200 pixels
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Company Information</CardTitle>
              <CardDescription>
                Update your company name and tagline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-400">Company Name</Label>
                <Input
                  value={branding.company_name}
                  onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="company-name-input"
                />
              </div>
              <div>
                <Label className="text-gray-400">Tagline</Label>
                <Input
                  value={branding.tagline}
                  onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="tagline-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Brand Colors</CardTitle>
              <CardDescription>
                Customize your color scheme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-400">Primary Color</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                      className="w-12 h-12 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] font-mono"
                      data-testid="primary-color-input"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Secondary Color</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                      className="w-12 h-12 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] font-mono"
                      data-testid="secondary-color-input"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black px-8"
              data-testid="save-settings-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
