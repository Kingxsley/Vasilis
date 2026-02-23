import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Save, Loader2, Globe, FileText, Share2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SEOSettings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seo, setSeo] = useState({
    site_title: '',
    site_description: '',
    site_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    twitter_title: '',
    twitter_description: '',
    twitter_image: '',
    robots_txt: '',
    google_analytics_id: '',
    google_search_console: '',
    canonical_url: ''
  });

  useEffect(() => {
    fetchSEOSettings();
  }, []);

  const fetchSEOSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/seo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeo(response.data);
    } catch (error) {
      // Use defaults if not set
      setSeo({
        site_title: 'Vasilis NetShield | Security Training Platform',
        site_description: 'Human + AI Powered Security Training. Protect your organization with realistic phishing simulations, malicious ad detection, and social engineering defense training.',
        site_keywords: 'cybersecurity training, phishing simulation, security awareness, employee training, social engineering, malicious ads',
        og_title: 'Vasilis NetShield | Security Training Platform',
        og_description: 'Human + AI Powered Security Training. Build a security-aware workforce with realistic simulations.',
        og_image: '',
        twitter_title: 'Vasilis NetShield | Security Training',
        twitter_description: 'Human + AI Powered Security Training Platform',
        twitter_image: '',
        robots_txt: `# Allow all crawlers
User-agent: *
Allow: /

# Sitemap location
Sitemap: https://vasilisnetshield.com/sitemap.xml

# Disallow admin areas
Disallow: /dashboard
Disallow: /settings
Disallow: /content
Disallow: /campaigns
Disallow: /analytics`,
        google_analytics_id: '',
        google_search_console: '',
        canonical_url: 'https://vasilisnetshield.com'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/settings/seo`, seo, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('SEO settings saved successfully');
    } catch (error) {
      toast.error('Failed to save SEO settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSeo(prev => ({ ...prev, [field]: value }));
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
      <div className="p-6 lg:p-8" data-testid="seo-settings-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              SEO Settings
            </h1>
            <p className="text-gray-400 mt-1">Manage your site's search engine optimization</p>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            data-testid="save-seo-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-[#1a1a24] border border-[#D4A836]/20">
            <TabsTrigger value="general" className="data-[state=active]:bg-[#D4A836]/20">
              <Globe className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-[#D4A836]/20">
              <Share2 className="w-4 h-4 mr-2" />
              Social Media
            </TabsTrigger>
            <TabsTrigger value="robots" className="data-[state=active]:bg-[#D4A836]/20">
              <FileText className="w-4 h-4 mr-2" />
              Robots.txt
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-[#D4A836]/20">
              <Search className="w-4 h-4 mr-2" />
              Tracking
            </TabsTrigger>
          </TabsList>

          {/* General SEO Tab */}
          <TabsContent value="general">
            <Card className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5]">General SEO Settings</CardTitle>
                <CardDescription>Configure your site's basic SEO metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-gray-400">Site Title</Label>
                  <Input
                    value={seo.site_title}
                    onChange={(e) => handleChange('site_title', e.target.value)}
                    placeholder="Your Site Title | Brand Name"
                    className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters</p>
                </div>

                <div>
                  <Label className="text-gray-400">Meta Description</Label>
                  <Textarea
                    value={seo.site_description}
                    onChange={(e) => handleChange('site_description', e.target.value)}
                    placeholder="A brief description of your site..."
                    className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters. Current: {seo.site_description?.length || 0}</p>
                </div>

                <div>
                  <Label className="text-gray-400">Keywords</Label>
                  <Input
                    value={seo.site_keywords}
                    onChange={(e) => handleChange('site_keywords', e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of keywords</p>
                </div>

                <div>
                  <Label className="text-gray-400">Canonical URL</Label>
                  <Input
                    value={seo.canonical_url}
                    onChange={(e) => handleChange('canonical_url', e.target.value)}
                    placeholder="https://yourdomain.com"
                    className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your primary domain URL</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Open Graph */}
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardHeader>
                  <CardTitle className="text-[#E8DDB5]">Open Graph (Facebook, LinkedIn)</CardTitle>
                  <CardDescription>How your site appears when shared</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">OG Title</Label>
                    <Input
                      value={seo.og_title}
                      onChange={(e) => handleChange('og_title', e.target.value)}
                      placeholder="Title for social sharing"
                      className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">OG Description</Label>
                    <Textarea
                      value={seo.og_description}
                      onChange={(e) => handleChange('og_description', e.target.value)}
                      placeholder="Description for social sharing"
                      className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">OG Image URL</Label>
                    <Input
                      value={seo.og_image}
                      onChange={(e) => handleChange('og_image', e.target.value)}
                      placeholder="https://yourdomain.com/og-image.jpg"
                      className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 1200x630 pixels</p>
                  </div>
                </CardContent>
              </Card>

              {/* Twitter Card */}
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardHeader>
                  <CardTitle className="text-[#E8DDB5]">Twitter Card</CardTitle>
                  <CardDescription>How your site appears on Twitter/X</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Twitter Title</Label>
                    <Input
                      value={seo.twitter_title}
                      onChange={(e) => handleChange('twitter_title', e.target.value)}
                      placeholder="Title for Twitter"
                      className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Twitter Description</Label>
                    <Textarea
                      value={seo.twitter_description}
                      onChange={(e) => handleChange('twitter_description', e.target.value)}
                      placeholder="Description for Twitter"
                      className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Twitter Image URL</Label>
                    <Input
                      value={seo.twitter_image}
                      onChange={(e) => handleChange('twitter_image', e.target.value)}
                      placeholder="https://yourdomain.com/twitter-image.jpg"
                      className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 1200x600 pixels</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Robots.txt Tab */}
          <TabsContent value="robots">
            <Card className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5]">Robots.txt Configuration</CardTitle>
                <CardDescription>Control how search engines crawl your site</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={seo.robots_txt}
                  onChange={(e) => handleChange('robots_txt', e.target.value)}
                  className="bg-[#1a1a24] border-[#D4A836]/30 font-mono text-sm"
                  rows={15}
                  placeholder="User-agent: *&#10;Allow: /"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This content will be served at /robots.txt. Be careful not to block important pages.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking">
            <Card className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5]">Analytics & Verification</CardTitle>
                <CardDescription>Connect analytics and search console</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-gray-400">Google Analytics ID</Label>
                  <Input
                    value={seo.google_analytics_id}
                    onChange={(e) => handleChange('google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                    className={`bg-[#1a1a24] border-[#D4A836]/30 mt-1 ${
                      seo.google_analytics_id && !/^(G-[A-Z0-9]+|UA-\d+-\d+)$/i.test(seo.google_analytics_id) 
                        ? 'border-red-500' 
                        : ''
                    }`}
                  />
                  {seo.google_analytics_id && !/^(G-[A-Z0-9]+|UA-\d+-\d+)$/i.test(seo.google_analytics_id) && (
                    <p className="text-xs text-red-500 mt-1">Invalid format. Use G-XXXXXXXXXX (GA4) or UA-XXXXXXXX-X (Universal)</p>
                  )}
                  {seo.google_analytics_id && /^(G-[A-Z0-9]+|UA-\d+-\d+)$/i.test(seo.google_analytics_id) && (
                    <p className="text-xs text-green-500 mt-1">✓ Valid format - tracking will be active on your site</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Your Google Analytics measurement ID</p>
                </div>

                <div>
                  <Label className="text-gray-400">Google Search Console Verification</Label>
                  <Input
                    value={seo.google_search_console}
                    onChange={(e) => handleChange('google_search_console', e.target.value)}
                    placeholder="Verification meta tag content"
                    className="bg-[#1a1a24] border-[#D4A836]/30 mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">The content value from Google Search Console verification meta tag</p>
                </div>

                <div className="p-4 bg-[#1a1a24] rounded-lg border border-[#D4A836]/20">
                  <h4 className="text-[#E8DDB5] font-medium mb-2">Sitemap</h4>
                  <p className="text-sm text-gray-400 mb-2">Your sitemap is automatically generated at:</p>
                  <code className="text-[#D4A836] text-sm bg-black/30 px-2 py-1 rounded">
                    {seo.canonical_url || 'https://yourdomain.com'}/sitemap.xml
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
