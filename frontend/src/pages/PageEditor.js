import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  FileText, Save, RotateCcw, Loader2, Eye, Plus, Trash2,
  Layout, Type, BarChart3, Sparkles, CheckCircle, Image, Upload, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PageEditor() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const platformImageRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(null);
  const [activeTab, setActiveTab] = useState('hero');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/pages/landing`);
      setContent(res.data);
    } catch (err) {
      toast.error('Failed to load page content');
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/pages/landing`, content, { headers });
      toast.success('Page content saved successfully!');
    } catch (err) {
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset to default content? This cannot be undone.')) return;
    
    try {
      const res = await axios.post(`${API}/pages/landing/reset`, {}, { headers });
      setContent(res.data.content);
      toast.success('Page reset to defaults');
    } catch (err) {
      toast.error('Failed to reset page');
    }
  };

  const updateHero = (field, value) => {
    setContent(prev => ({
      ...prev,
      hero: { ...prev.hero, [field]: value }
    }));
  };

  const updateStat = (index, field, value) => {
    setContent(prev => {
      const newStats = [...prev.stats];
      newStats[index] = { ...newStats[index], [field]: value };
      return { ...prev, stats: newStats };
    });
  };

  const addStat = () => {
    setContent(prev => ({
      ...prev,
      stats: [...prev.stats, { value: '100+', label: 'New Stat' }]
    }));
  };

  const removeStat = (index) => {
    setContent(prev => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index, field, value) => {
    setContent(prev => {
      const newFeatures = [...prev.features];
      newFeatures[index] = { ...newFeatures[index], [field]: value };
      return { ...prev, features: newFeatures };
    });
  };

  const updateFeatureBullet = (featureIndex, bulletIndex, value) => {
    setContent(prev => {
      const newFeatures = [...prev.features];
      const newBullets = [...newFeatures[featureIndex].bullet_points];
      newBullets[bulletIndex] = value;
      newFeatures[featureIndex] = { ...newFeatures[featureIndex], bullet_points: newBullets };
      return { ...prev, features: newFeatures };
    });
  };

  const addFeatureBullet = (featureIndex) => {
    setContent(prev => {
      const newFeatures = [...prev.features];
      newFeatures[featureIndex] = {
        ...newFeatures[featureIndex],
        bullet_points: [...newFeatures[featureIndex].bullet_points, 'New bullet point']
      };
      return { ...prev, features: newFeatures };
    });
  };

  const removeFeatureBullet = (featureIndex, bulletIndex) => {
    setContent(prev => {
      const newFeatures = [...prev.features];
      newFeatures[featureIndex] = {
        ...newFeatures[featureIndex],
        bullet_points: newFeatures[featureIndex].bullet_points.filter((_, i) => i !== bulletIndex)
      };
      return { ...prev, features: newFeatures };
    });
  };

  const addFeature = () => {
    setContent(prev => ({
      ...prev,
      features: [...prev.features, {
        title: 'New Feature',
        description: 'Feature description goes here.',
        bullet_points: ['Bullet point 1', 'Bullet point 2'],
        icon: 'Sparkles',
        color: '#D4A836'
      }]
    }));
  };

  const removeFeature = (index) => {
    if (content.features.length <= 1) {
      toast.error('You must have at least one feature');
      return;
    }
    setContent(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handlePlatformImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(prev => ({
        ...prev,
        platform_image: event.target.result
      }));
      toast.success('Image uploaded! Click Save to apply.');
    };
    reader.readAsDataURL(file);
  };

  const removePlatformImage = () => {
    setContent(prev => ({
      ...prev,
      platform_image: null
    }));
    toast.success('Image removed. Click Save to apply.');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="page-editor">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Page Editor
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Edit your landing page content without code</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.open('/', '_blank')}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
            >
              <Eye className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Preview</span>
              <span className="sm:hidden">View</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <RotateCcw className="w-4 h-4 mr-1 sm:mr-2" />
              Reset
            </Button>
            <Button 
              onClick={saveContent}
              disabled={saving}
              size="sm"
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-1 sm:mr-2" />}
              Save
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="bg-[#161B22] border border-[#30363D] flex-wrap h-auto p-1">
            <TabsTrigger 
              value="hero" 
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836] text-xs sm:text-sm"
            >
              <Layout className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Hero Section</span>
              <span className="sm:hidden">Hero</span>
            </TabsTrigger>
            <TabsTrigger 
              value="stats"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836] text-xs sm:text-sm"
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger 
              value="features"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836] text-xs sm:text-sm"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger 
              value="platform"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836] text-xs sm:text-sm"
            >
              <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Platform
            </TabsTrigger>
          </TabsList>

          {/* Hero Section Tab */}
          <TabsContent value="hero" className="space-y-4 sm:space-y-6">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-[#E8DDB5] text-lg sm:text-xl">Hero Section</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Edit the main headline and call-to-action of your landing page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm">Badge Text</Label>
                  <Input
                    value={content.hero?.badge_text || ''}
                    onChange={(e) => updateHero('badge_text', e.target.value)}
                    placeholder="Human + AI Powered Security Training"
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Title Line 1</Label>
                    <Input
                      value={content.hero?.title_line1 || ''}
                      onChange={(e) => updateHero('title_line1', e.target.value)}
                      placeholder="Train Your Team to"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Highlighted Word</Label>
                    <Input
                      value={content.hero?.title_highlight || ''}
                      onChange={(e) => updateHero('title_highlight', e.target.value)}
                      placeholder="Defend"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#D4A836]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Title Line 2</Label>
                    <Input
                      value={content.hero?.title_line2 || ''}
                      onChange={(e) => updateHero('title_line2', e.target.value)}
                      placeholder="Against Cyber Threats"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400">Subtitle</Label>
                  <textarea
                    value={content.hero?.subtitle || ''}
                    onChange={(e) => updateHero('subtitle', e.target.value)}
                    placeholder="Describe your service..."
                    rows={3}
                    className="w-full bg-[#0f0f15] border border-[#D4A836]/30 text-[#E8DDB5] rounded-md p-3"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Primary Button Text</Label>
                    <Input
                      value={content.hero?.cta_primary_text || ''}
                      onChange={(e) => updateHero('cta_primary_text', e.target.value)}
                      placeholder="Start Free Trial"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                    <p className="text-xs text-gray-500">Links to signup/login page</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Secondary Button Text</Label>
                    <Input
                      value={content.hero?.cta_secondary_text || ''}
                      onChange={(e) => updateHero('cta_secondary_text', e.target.value)}
                      placeholder="Watch Demo"
                      className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400">Demo Video URL (YouTube, Vimeo, etc.)</Label>
                  <Input
                    value={content.hero?.cta_secondary_link || ''}
                    onChange={(e) => updateHero('cta_secondary_link', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  />
                  <p className="text-xs text-gray-500">Leave empty to hide the button, or add a video URL</p>
                </div>

                {/* Preview */}
                <div className="mt-6 p-6 bg-[#0f0f15] rounded-lg border border-[#30363D]">
                  <p className="text-xs text-gray-500 mb-4">PREVIEW</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A836]/10 border border-[#D4A836]/30 mb-4">
                    <span className="text-sm text-[#D4A836]">{content.hero?.badge_text}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#E8DDB5] mb-2">
                    {content.hero?.title_line1} <span className="text-[#D4A836]">{content.hero?.title_highlight}</span> {content.hero?.title_line2}
                  </h1>
                  <p className="text-gray-400 text-sm mb-4">{content.hero?.subtitle}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-[#D4A836] text-black">{content.hero?.cta_primary_text}</Button>
                    <Button size="sm" variant="outline" className="border-[#D4A836]/30 text-[#E8DDB5]">{content.hero?.cta_secondary_text}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#E8DDB5]">Statistics</CardTitle>
                    <CardDescription className="text-gray-400">
                      Display impressive numbers to build trust
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={addStat}
                    variant="outline"
                    className="border-[#D4A836]/30 text-[#D4A836]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stat
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.stats?.map((stat, index) => (
                  <div key={index} className="flex items-end gap-4 p-4 bg-[#0f0f15] rounded-lg border border-[#30363D]">
                    <div className="flex-1 space-y-2">
                      <Label className="text-gray-400">Value</Label>
                      <Input
                        value={stat.value}
                        onChange={(e) => updateStat(index, 'value', e.target.value)}
                        placeholder="95%"
                        className="bg-[#161B22] border-[#D4A836]/30 text-[#E8DDB5] text-xl font-bold"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-gray-400">Label</Label>
                      <Input
                        value={stat.label}
                        onChange={(e) => updateStat(index, 'label', e.target.value)}
                        placeholder="Detection Rate"
                        className="bg-[#161B22] border-[#D4A836]/30 text-[#E8DDB5]"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeStat(index)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {/* Preview */}
                <div className="mt-6 p-6 bg-[#0f0f15] rounded-lg border border-[#30363D]">
                  <p className="text-xs text-gray-500 mb-4">PREVIEW</p>
                  <div className="flex items-center gap-8">
                    {content.stats?.map((stat, index) => (
                      <div key={index}>
                        <p className="text-2xl font-bold text-[#E8DDB5]">{stat.value}</p>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5]">Features Section Header</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Section Title</Label>
                  <Input
                    value={content.features_title || ''}
                    onChange={(e) => setContent(prev => ({ ...prev, features_title: e.target.value }))}
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Section Subtitle</Label>
                  <Input
                    value={content.features_subtitle || ''}
                    onChange={(e) => setContent(prev => ({ ...prev, features_subtitle: e.target.value }))}
                    className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#E8DDB5]">Feature Cards</h3>
              <Button 
                onClick={addFeature}
                variant="outline"
                className="border-[#D4A836]/30 text-[#D4A836]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Feature
              </Button>
            </div>

            {content.features?.map((feature, fIndex) => (
              <Card key={fIndex} className="bg-[#161B22] border-[#30363D]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#E8DDB5] text-lg">Feature {fIndex + 1}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFeature(fIndex)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Title</Label>
                      <Input
                        value={feature.title}
                        onChange={(e) => updateFeature(fIndex, 'title', e.target.value)}
                        className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={feature.color}
                          onChange={(e) => updateFeature(fIndex, 'color', e.target.value)}
                          className="w-12 h-10 p-1 bg-[#0f0f15] border-[#D4A836]/30"
                        />
                        <Input
                          value={feature.color}
                          onChange={(e) => updateFeature(fIndex, 'color', e.target.value)}
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Description</Label>
                    <textarea
                      value={feature.description}
                      onChange={(e) => updateFeature(fIndex, 'description', e.target.value)}
                      rows={2}
                      className="w-full bg-[#0f0f15] border border-[#D4A836]/30 text-[#E8DDB5] rounded-md p-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400">Bullet Points</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addFeatureBullet(fIndex)}
                        className="text-[#D4A836]"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {feature.bullet_points?.map((bullet, bIndex) => (
                      <div key={bIndex} className="flex gap-2">
                        <Input
                          value={bullet}
                          onChange={(e) => updateFeatureBullet(fIndex, bIndex, e.target.value)}
                          className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFeatureBullet(fIndex, bIndex)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Platform Section Tab */}
          <TabsContent value="platform" className="space-y-6">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5]">Platform Section Image</CardTitle>
                <CardDescription className="text-gray-400">
                  Upload a custom image for the "Enterprise-Ready Platform" section. This replaces the default shield icon.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Upload Area */}
                  <div className="space-y-4">
                    <Label className="text-gray-400">Custom Image</Label>
                    <div 
                      className="border-2 border-dashed border-[#D4A836]/30 rounded-lg p-8 text-center hover:border-[#D4A836] transition-colors cursor-pointer"
                      onClick={() => platformImageRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={platformImageRef}
                        accept="image/*"
                        onChange={handlePlatformImageUpload}
                        className="hidden"
                      />
                      <Upload className="w-12 h-12 text-[#D4A836]/50 mx-auto mb-4" />
                      <p className="text-[#E8DDB5] font-medium mb-1">Click to upload image</p>
                      <p className="text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      <p className="text-xs text-gray-600 mt-2">Recommended: Square image, 400x400px or larger</p>
                    </div>
                    
                    {content.platform_image && (
                      <Button
                        variant="outline"
                        onClick={removePlatformImage}
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Custom Image
                      </Button>
                    )}
                  </div>

                  {/* Preview Area */}
                  <div className="space-y-4">
                    <Label className="text-gray-400">Preview</Label>
                    <div className="bg-[#0f0f15] rounded-lg p-8 flex items-center justify-center min-h-[250px]">
                      {content.platform_image ? (
                        <img 
                          src={content.platform_image} 
                          alt="Platform" 
                          className="max-w-full max-h-[200px] object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <Globe className="w-24 h-24 text-[#D4A836] mx-auto mb-2 animate-pulse" />
                          <p className="text-sm text-gray-500">Upload your logo or image</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0f0f15] rounded-lg border border-[#30363D]">
                  <p className="text-xs text-gray-500">
                    <strong className="text-[#D4A836]">Tip:</strong> Upload your company logo, a product screenshot, or a relevant illustration to personalize the "Enterprise-Ready Platform" section on your landing page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
