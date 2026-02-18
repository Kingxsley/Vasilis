import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Upload, Trash2, Loader2, Shield, Globe, Palette, Menu, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const { token } = useAuth();
  const [branding, setBranding] = useState({
    company_name: 'Vasilis NetShield',
    tagline: 'Human + AI Powered Security Training',
    logo_url: null,
    favicon_url: null,
    primary_color: '#D4A836',
    secondary_color: '#0f3460',
    text_color: '#E8DDB5',
    heading_color: '#FFFFFF',
    accent_color: '#D4A836',
    show_blog: true,
    show_videos: true,
    show_news: true,
    show_about: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

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
        secondary_color: branding.secondary_color,
        text_color: branding.text_color,
        heading_color: branding.heading_color,
        accent_color: branding.accent_color,
        show_blog: branding.show_blog,
        show_videos: branding.show_videos,
        show_news: branding.show_news,
        show_about: branding.show_about
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

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use PNG, JPEG, SVG, or WebP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2MB');
      return;
    }

    setUploadingLogo(true);
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
      setUploadingLogo(false);
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

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/x-icon', 'image/ico', 'image/vnd.microsoft.icon'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use PNG or ICO');
      return;
    }

    if (file.size > 500 * 1024) {
      toast.error('File too large. Max 500KB');
      return;
    }

    setUploadingFavicon(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/settings/branding/favicon`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setBranding(prev => ({ ...prev, favicon_url: response.data.favicon_url }));
      toast.success('Favicon uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleFaviconDelete = async () => {
    if (!window.confirm('Remove the favicon?')) return;

    try {
      await axios.delete(`${API}/settings/branding/favicon`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranding(prev => ({ ...prev, favicon_url: null }));
      toast.success('Favicon removed');
    } catch (error) {
      toast.error('Failed to remove favicon');
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
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-[#D4A836]/30 flex items-center justify-center bg-[#1a1a24] overflow-hidden">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Shield className="w-12 h-12 text-[#D4A836]/50" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                      data-testid="upload-logo-btn"
                    >
                      {uploadingLogo ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Upload Logo</>
                      )}
                    </Button>
                    {branding.logo_url && (
                      <Button
                        variant="outline"
                        onClick={handleLogoDelete}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        data-testid="delete-logo-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Recommended: Square image, at least 200x200 pixels</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Favicon Upload */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Favicon</CardTitle>
              <CardDescription>
                Upload favicon for browser tab (PNG or ICO - Max 500KB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-[#D4A836]/30 flex items-center justify-center bg-[#1a1a24] overflow-hidden">
                  {branding.favicon_url ? (
                    <img src={branding.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-6 h-6 text-[#D4A836]/50" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/ico"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                      data-testid="upload-favicon-btn"
                    >
                      {uploadingFavicon ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Upload Favicon</>
                      )}
                    </Button>
                    {branding.favicon_url && (
                      <Button
                        variant="outline"
                        onClick={handleFaviconDelete}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        data-testid="delete-favicon-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Recommended: 32x32 or 64x64 pixels</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Company Information</CardTitle>
              <CardDescription>Update your company name and tagline</CardDescription>
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
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Colors
              </CardTitle>
              <CardDescription>Customize your color scheme for the website</CardDescription>
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

          {/* Text Colors */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Text Colors</CardTitle>
              <CardDescription>Customize text colors for the public website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label className="text-gray-400">Body Text</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={branding.text_color || '#E8DDB5'}
                      onChange={(e) => setBranding({ ...branding, text_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={branding.text_color || '#E8DDB5'}
                      onChange={(e) => setBranding({ ...branding, text_color: e.target.value })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] font-mono text-sm"
                      data-testid="text-color-input"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Paragraphs, descriptions</p>
                </div>
                <div>
                  <Label className="text-gray-400">Headings</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={branding.heading_color || '#FFFFFF'}
                      onChange={(e) => setBranding({ ...branding, heading_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={branding.heading_color || '#FFFFFF'}
                      onChange={(e) => setBranding({ ...branding, heading_color: e.target.value })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] font-mono text-sm"
                      data-testid="heading-color-input"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Titles, section headers</p>
                </div>
                <div>
                  <Label className="text-gray-400">Accent/Links</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={branding.accent_color || '#D4A836'}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={branding.accent_color || '#D4A836'}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] font-mono text-sm"
                      data-testid="accent-color-input"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Links, highlights</p>
                </div>
              </div>
              
              {/* Preview */}
              <div className="mt-6 p-4 rounded-lg border border-[#30363D]" style={{ backgroundColor: branding.secondary_color || '#0f3460' }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: branding.heading_color || '#FFFFFF' }}>Color Preview</h4>
                <p className="text-sm" style={{ color: branding.text_color || '#E8DDB5' }}>
                  This is how your body text will appear. <a href="#" style={{ color: branding.accent_color || '#D4A836' }} onClick={(e) => e.preventDefault()}>This is a link.</a>
                </p>
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
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
