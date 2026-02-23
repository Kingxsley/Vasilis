import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Upload, Trash2, Loader2, Globe, Palette, Menu, Eye, EyeOff, Clock, Key, Image } from 'lucide-react';
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
    show_about: true,
    footer_copyright: '',
    social_facebook: '',
    social_twitter: '',
    social_linkedin: '',
    social_instagram: '',
    social_youtube: '',
    discord_webhook_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [passwordPolicy, setPasswordPolicy] = useState({
    password_expiry_days: 0,
    expiry_reminder_days: 7
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  useEffect(() => {
    fetchBranding();
    fetchPasswordPolicy();
  }, []);

  const fetchPasswordPolicy = async () => {
    try {
      const response = await axios.get(`${API}/settings/password-policy`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      // Normalize field names.  Use password_expiry_days or max_age_days for expiry
      setPasswordPolicy({
        password_expiry_days: data.password_expiry_days ?? data.max_age_days ?? 0,
        expiry_reminder_days: data.expiry_reminder_days ?? 7
      });
    } catch (error) {
      console.error('Failed to load password policy:', error);
    }
  };

  const handleSavePasswordPolicy = async () => {
    setSavingPolicy(true);
    try {
      // Send both field names to backend
      await axios.patch(`${API}/settings/password-policy`, {
        password_expiry_days: passwordPolicy.password_expiry_days,
        max_age_days: passwordPolicy.password_expiry_days,
        expiry_reminder_days: passwordPolicy.expiry_reminder_days
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password policy saved');
    } catch (error) {
      toast.error('Failed to save password policy');
    } finally {
      setSavingPolicy(false);
    }
  };

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
        show_about: branding.show_about,
        footer_copyright: branding.footer_copyright,
        social_facebook: branding.social_facebook,
        social_twitter: branding.social_twitter,
        social_linkedin: branding.social_linkedin,
        social_instagram: branding.social_instagram,
        social_youtube: branding.social_youtube,
        discord_webhook_url: branding.discord_webhook_url
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB');
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
      
      // Show optimization info
      if (response.data.savings_percent > 0) {
        const origKB = Math.round(response.data.original_size / 1024);
        const optKB = Math.round(response.data.optimized_size / 1024);
        toast.success(`Logo optimized! ${origKB}KB → ${optKB}KB (${response.data.savings_percent}% smaller)`);
      } else {
        toast.success('Logo uploaded successfully');
      }
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

    const allowedTypes = ['image/png', 'image/x-icon', 'image/ico', 'image/vnd.microsoft.icon', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use PNG, ICO, or SVG');
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error('File too large. Max 1MB');
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
      
      // Show optimization info
      if (response.data.savings_percent > 0) {
        const origKB = Math.round(response.data.original_size / 1024);
        const optKB = Math.round(response.data.optimized_size / 1024);
        toast.success(`Favicon optimized! ${origKB}KB → ${optKB}KB (${response.data.savings_percent}% smaller)`);
      } else {
        toast.success('Favicon uploaded successfully');
      }
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
                    <Image className="w-12 h-12 text-[#D4A836]/50" />
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

          {/* Navigation Menu */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Menu className="w-5 h-5" />
                Navigation Menu
              </CardTitle>
              <CardDescription>Choose which pages to show in the navigation bar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div 
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${branding.show_blog ? 'border-[#D4A836] bg-[#D4A836]/10' : 'border-gray-600 bg-[#1a1a24]'}`}
                  onClick={() => setBranding({ ...branding, show_blog: !branding.show_blog })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#E8DDB5]">Blog</span>
                    {branding.show_blog ? <Eye className="w-4 h-4 text-[#D4A836]" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-500">{branding.show_blog ? 'Visible' : 'Hidden'}</p>
                </div>

                <div 
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${branding.show_videos ? 'border-[#D4A836] bg-[#D4A836]/10' : 'border-gray-600 bg-[#1a1a24]'}`}
                  onClick={() => setBranding({ ...branding, show_videos: !branding.show_videos })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#E8DDB5]">Videos</span>
                    {branding.show_videos ? <Eye className="w-4 h-4 text-[#D4A836]" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-500">{branding.show_videos ? 'Visible' : 'Hidden'}</p>
                </div>

                <div 
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${branding.show_news !== false ? 'border-[#D4A836] bg-[#D4A836]/10' : 'border-gray-600 bg-[#1a1a24]'}`}
                  onClick={() => setBranding({ ...branding, show_news: !branding.show_news })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#E8DDB5]">News</span>
                    {branding.show_news !== false ? <Eye className="w-4 h-4 text-[#D4A836]" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-500">{branding.show_news !== false ? 'Visible' : 'Hidden'}</p>
                </div>

                <div 
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${branding.show_about ? 'border-[#D4A836] bg-[#D4A836]/10' : 'border-gray-600 bg-[#1a1a24]'}`}
                  onClick={() => setBranding({ ...branding, show_about: !branding.show_about })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#E8DDB5]">About</span>
                    {branding.show_about ? <Eye className="w-4 h-4 text-[#D4A836]" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-500">{branding.show_about ? 'Visible' : 'Hidden'}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Click on a page to toggle its visibility in the navigation bar</p>
            </CardContent>
          </Card>

          {/* Footer Settings */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Footer Settings
              </CardTitle>
              <CardDescription>Customize footer copyright text and social media links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-400">Copyright Text</Label>
                <Input
                  value={branding.footer_copyright || ''}
                  onChange={(e) => setBranding({ ...branding, footer_copyright: e.target.value })}
                  placeholder={`© ${new Date().getFullYear()} ${branding.company_name}. All rights reserved.`}
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="footer-copyright-input"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use default copyright text</p>
              </div>
              
              <div>
                <Label className="text-gray-400 mb-3 block">Social Media Links</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 text-xs">Facebook</Label>
                    <Input
                      value={branding.social_facebook || ''}
                      onChange={(e) => setBranding({ ...branding, social_facebook: e.target.value })}
                      placeholder="https://facebook.com/yourpage"
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">Twitter/X</Label>
                    <Input
                      value={branding.social_twitter || ''}
                      onChange={(e) => setBranding({ ...branding, social_twitter: e.target.value })}
                      placeholder="https://twitter.com/yourhandle"
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">LinkedIn</Label>
                    <Input
                      value={branding.social_linkedin || ''}
                      onChange={(e) => setBranding({ ...branding, social_linkedin: e.target.value })}
                      placeholder="https://linkedin.com/company/yourcompany"
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">Instagram</Label>
                    <Input
                      value={branding.social_instagram || ''}
                      onChange={(e) => setBranding({ ...branding, social_instagram: e.target.value })}
                      placeholder="https://instagram.com/yourhandle"
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">YouTube</Label>
                    <Input
                      value={branding.social_youtube || ''}
                      onChange={(e) => setBranding({ ...branding, social_youtube: e.target.value })}
                      placeholder="https://youtube.com/c/yourchannel"
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Social links will appear in the footer when URLs are provided</p>
              </div>
            </CardContent>
          </Card>

          {/* Password Policy */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Key className="w-5 h-5" />
                Password Policy
              </CardTitle>
              <CardDescription>Configure automatic password expiry and reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-400">Password Expiry (Days)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Input
                      type="number"
                      min="0"
                      max="365"
                      value={passwordPolicy.password_expiry_days}
                      onChange={(e) => setPasswordPolicy({ ...passwordPolicy, password_expiry_days: parseInt(e.target.value) || 0 })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {passwordPolicy.password_expiry_days === 0 
                      ? 'Passwords never expire' 
                      : `Users must change password every ${passwordPolicy.password_expiry_days} days`}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Reminder Before Expiry (Days)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={passwordPolicy.expiry_reminder_days}
                      onChange={(e) => setPasswordPolicy({ ...passwordPolicy, expiry_reminder_days: parseInt(e.target.value) || 7 })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                      disabled={passwordPolicy.password_expiry_days === 0}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Send email reminder this many days before expiry
                  </p>
                </div>
              </div>
              
              {/* Common Presets */}
              <div>
                <Label className="text-gray-400 mb-2 block">Quick Presets</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={passwordPolicy.password_expiry_days === 0 ? "default" : "outline"}
                    className={passwordPolicy.password_expiry_days === 0 ? "bg-[#D4A836] text-black" : "border-[#D4A836]/30"}
                    onClick={() => setPasswordPolicy({ ...passwordPolicy, password_expiry_days: 0 })}
                  >
                    Never
                  </Button>
                  <Button
                    size="sm"
                    variant={passwordPolicy.password_expiry_days === 30 ? "default" : "outline"}
                    className={passwordPolicy.password_expiry_days === 30 ? "bg-[#D4A836] text-black" : "border-[#D4A836]/30"}
                    onClick={() => setPasswordPolicy({ ...passwordPolicy, password_expiry_days: 30 })}
                  >
                    30 Days
                  </Button>
                  <Button
                    size="sm"
                    variant={passwordPolicy.password_expiry_days === 60 ? "default" : "outline"}
                    className={passwordPolicy.password_expiry_days === 60 ? "bg-[#D4A836] text-black" : "border-[#D4A836]/30"}
                    onClick={() => setPasswordPolicy({ ...passwordPolicy, password_expiry_days: 60 })}
                  >
                    60 Days
                  </Button>
                  <Button
                    size="sm"
                    variant={passwordPolicy.password_expiry_days === 90 ? "default" : "outline"}
                    className={passwordPolicy.password_expiry_days === 90 ? "bg-[#D4A836] text-black" : "border-[#D4A836]/30"}
                    onClick={() => setPasswordPolicy({ ...passwordPolicy, password_expiry_days: 90 })}
                  >
                    90 Days
                  </Button>
                  <Button
                    size="sm"
                    variant={passwordPolicy.password_expiry_days === 180 ? "default" : "outline"}
                    className={passwordPolicy.password_expiry_days === 180 ? "bg-[#D4A836] text-black" : "border-[#D4A836]/30"}
                    onClick={() => setPasswordPolicy({ ...passwordPolicy, password_expiry_days: 180 })}
                  >
                    180 Days
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSavePasswordPolicy}
                  disabled={savingPolicy}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {savingPolicy ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    'Save Password Policy'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Discord Notifications */}
          <Card className="bg-[#1a1a24] border-[#D4A836]/30">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Super Admin Notifications
              </CardTitle>
              <CardDescription className="text-gray-400">
                Receive instant Discord notifications when users click phishing links or submit credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discord_webhook" className="text-gray-400">Discord Webhook URL</Label>
                <Input
                  id="discord_webhook"
                  value={branding.discord_webhook_url || ''}
                  onChange={(e) => setBranding({ ...branding, discord_webhook_url: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] mt-1"
                  data-testid="discord-webhook-input"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This webhook receives all phishing click notifications across all organizations.
                  <br />
                  To get a webhook URL: Server Settings → Integrations → Webhooks → New Webhook → Copy URL
                </p>
              </div>
              <div className="bg-[#5865F2]/10 p-4 rounded-lg border border-[#5865F2]/30">
                <h4 className="text-[#5865F2] font-medium mb-2">Notification Types</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Phishing link clicks - When any user clicks a phishing simulation link</li>
                  <li>• Credential submissions - Critical alerts when users enter credentials</li>
                  <li>• Campaign launches - When new campaigns are started</li>
                </ul>
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
