import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Slider } from './ui/slider';
import { 
  Palette, Type, Image, Layout, Sparkles, Eye, Save, 
  AlertTriangle, Gift, Shield, DollarSign, Download,
  Monitor, Smartphone, Square, RectangleHorizontal, Undo2
} from 'lucide-react';
import { toast } from 'sonner';

// Predefined ad type layouts
const AD_LAYOUTS = {
  banner: {
    name: 'Banner Ad',
    icon: RectangleHorizontal,
    description: 'Horizontal banner ideal for website headers/footers',
    defaultStyle: {
      width: '728px',
      height: '90px',
      layout: 'horizontal'
    }
  },
  popup: {
    name: 'Popup Ad',
    icon: Square,
    description: 'Attention-grabbing popup overlay',
    defaultStyle: {
      width: '400px',
      height: '300px',
      layout: 'centered'
    }
  },
  sidebar: {
    name: 'Sidebar Ad',
    icon: Layout,
    description: 'Vertical sidebar placement',
    defaultStyle: {
      width: '300px',
      height: '250px',
      layout: 'vertical'
    }
  },
  native: {
    name: 'Native Ad',
    icon: Monitor,
    description: 'Blends with content like news articles',
    defaultStyle: {
      width: '100%',
      height: 'auto',
      layout: 'article'
    }
  }
};

// Predefined scam ad templates
const SCAM_TEMPLATES = [
  {
    id: 'prize',
    name: 'Prize/Giveaway Scam',
    icon: Gift,
    headline: "You've Won! Claim Your Prize!",
    description: "Congratulations! You're the lucky winner of a brand new iPhone 15 Pro! Click now to claim your free prize!",
    callToAction: 'CLAIM NOW!',
    colors: { bg: '#ff6b35', text: '#ffffff', button: '#ffcc00' },
    urgency: true
  },
  {
    id: 'virus',
    name: 'Fake Virus Alert',
    icon: AlertTriangle,
    headline: 'WARNING: Virus Detected!',
    description: 'Your computer is infected with 23 dangerous viruses! Download our FREE security scanner immediately to protect your data!',
    callToAction: 'Scan Now',
    colors: { bg: '#dc2626', text: '#ffffff', button: '#fbbf24' },
    urgency: true
  },
  {
    id: 'update',
    name: 'Fake Software Update',
    icon: Download,
    headline: 'Critical Update Required',
    description: 'Your Flash Player is out of date. Your browser may be vulnerable to security threats. Install the latest version now.',
    callToAction: 'Update Now',
    colors: { bg: '#1e3a5f', text: '#ffffff', button: '#3b82f6' },
    urgency: false
  },
  {
    id: 'money',
    name: 'Get Rich Quick',
    icon: DollarSign,
    headline: 'Make $5,000/Week From Home!',
    description: "Local mom discovers this ONE WEIRD TRICK to make money online. Banks HATE her! Learn her secret now!",
    callToAction: 'Learn Secret',
    colors: { bg: '#15803d', text: '#ffffff', button: '#fbbf24' },
    urgency: false
  },
  {
    id: 'tech_support',
    name: 'Fake Tech Support',
    icon: Shield,
    headline: 'Microsoft Security Alert',
    description: 'Your Windows license has expired. Call now to avoid losing access to your files. Toll-free: 1-800-XXX-XXXX',
    callToAction: 'Call Now',
    colors: { bg: '#0078d4', text: '#ffffff', button: '#ffcc00' },
    urgency: true
  }
];

export default function AdTemplateEditor({ 
  initialTemplate = null, 
  onSave, 
  onCancel,
  mode = 'create' // 'create' or 'edit'
}) {
  const [template, setTemplate] = useState({
    name: '',
    ad_type: 'popup',
    headline: '',
    description: '',
    call_to_action: 'Click Here',
    image_url: '',
    style_css: '',
    // Visual editor state
    bgColor: '#1a1a2e',
    textColor: '#ffffff',
    buttonColor: '#e94560',
    buttonTextColor: '#ffffff',
    fontSize: 18,
    borderRadius: 8,
    showUrgency: false,
    urgencyText: 'Limited Time Only!',
    animation: 'none'
  });

  const [activeTab, setActiveTab] = useState('design');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const previewRef = useRef(null);

  // Initialize from existing template
  useEffect(() => {
    if (initialTemplate) {
      // Parse style_css back into individual properties
      const style = initialTemplate.style_css || '';
      const bgMatch = style.match(/background:\s*([^;]+)/);
      const textMatch = style.match(/color:\s*([^;]+)/);
      
      setTemplate({
        ...template,
        name: initialTemplate.name || '',
        ad_type: initialTemplate.ad_type || 'popup',
        headline: initialTemplate.headline || '',
        description: initialTemplate.description || '',
        call_to_action: initialTemplate.call_to_action || 'Click Here',
        image_url: initialTemplate.image_url || '',
        style_css: initialTemplate.style_css || '',
        bgColor: bgMatch ? bgMatch[1].trim() : '#1a1a2e',
        textColor: textMatch ? textMatch[1].trim() : '#ffffff'
      });
    }
  }, [initialTemplate]);

  // Apply scam template
  const applyScamTemplate = (scamTemplate) => {
    setTemplate({
      ...template,
      headline: scamTemplate.headline,
      description: scamTemplate.description,
      call_to_action: scamTemplate.callToAction,
      bgColor: scamTemplate.colors.bg,
      textColor: scamTemplate.colors.text,
      buttonColor: scamTemplate.colors.button,
      showUrgency: scamTemplate.urgency
    });
    toast.success(`Applied "${scamTemplate.name}" template`);
  };

  // Generate CSS from visual properties
  const generateStyleCSS = () => {
    let css = `background: ${template.bgColor}; color: ${template.textColor};`;
    if (template.borderRadius > 0) {
      css += ` border-radius: ${template.borderRadius}px;`;
    }
    return css;
  };

  // Handle save
  const handleSave = () => {
    if (!template.name || !template.headline || !template.description || !template.call_to_action) {
      toast.error('Please fill in all required fields');
      return;
    }

    const templateData = {
      name: template.name,
      ad_type: template.ad_type,
      headline: template.headline,
      description: template.description,
      call_to_action: template.call_to_action,
      image_url: template.image_url || null,
      style_css: generateStyleCSS()
    };

    onSave(templateData);
  };

  // Preview component
  const AdPreview = () => {
    const layout = AD_LAYOUTS[template.ad_type];
    const isHorizontal = layout?.defaultStyle?.layout === 'horizontal';
    
    return (
      <div 
        className={`relative overflow-hidden transition-all duration-300 ${
          previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'
        }`}
        style={{
          background: template.bgColor,
          color: template.textColor,
          borderRadius: `${template.borderRadius}px`,
          padding: isHorizontal ? '15px 30px' : '30px',
          minHeight: isHorizontal ? '90px' : '200px',
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isHorizontal ? 'space-between' : 'center',
          textAlign: isHorizontal ? 'left' : 'center',
          gap: '15px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: template.showUrgency ? '3px solid #fbbf24' : 'none'
        }}
      >
        {/* Urgency Banner */}
        {template.showUrgency && (
          <div 
            className="absolute top-0 left-0 right-0 py-1 text-center text-xs font-bold"
            style={{ 
              background: '#fbbf24', 
              color: '#000',
              animation: 'pulse 2s infinite'
            }}
          >
            {template.urgencyText || 'LIMITED TIME ONLY!'}
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 ${template.showUrgency ? 'mt-6' : ''}`}>
          {/* Image */}
          {template.image_url && (
            <img 
              src={template.image_url} 
              alt="Ad"
              className="max-h-20 mb-3 mx-auto rounded"
              style={{ maxWidth: isHorizontal ? '60px' : '100px' }}
            />
          )}

          {/* Headline */}
          <h2 
            className="font-bold mb-2"
            style={{ fontSize: `${template.fontSize}px` }}
          >
            {template.headline || 'Your Headline Here'}
          </h2>

          {/* Description */}
          <p 
            className="opacity-90 mb-4"
            style={{ fontSize: `${Math.max(12, template.fontSize - 4)}px` }}
          >
            {template.description || 'Your ad description will appear here...'}
          </p>
        </div>

        {/* CTA Button */}
        <button
          className="font-bold py-3 px-6 transition-transform hover:scale-105"
          style={{
            background: template.buttonColor,
            color: template.buttonTextColor,
            borderRadius: `${template.borderRadius}px`,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {template.call_to_action || 'Click Here'}
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="ad-template-editor">
      {/* Editor Panel */}
      <div className="space-y-4">
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4A836]" />
              {mode === 'edit' ? 'Edit Ad Template' : 'Create Ad Template'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-[#0D1117]">
                <TabsTrigger value="design" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
                  <Layout className="w-4 h-4 mr-2" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="content" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
                  <Type className="w-4 h-4 mr-2" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="style" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
                  <Palette className="w-4 h-4 mr-2" />
                  Style
                </TabsTrigger>
              </TabsList>

              {/* Design Tab */}
              <TabsContent value="design" className="space-y-4 mt-4">
                {/* Template Name */}
                <div>
                  <Label className="text-gray-400">Template Name *</Label>
                  <Input
                    value={template.name}
                    onChange={(e) => setTemplate({...template, name: e.target.value})}
                    placeholder="e.g., Fake Antivirus Alert"
                    className="bg-[#0D1117] border-[#30363D] text-white mt-1"
                    data-testid="template-name-input"
                  />
                </div>

                {/* Ad Type */}
                <div>
                  <Label className="text-gray-400">Ad Type *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {Object.entries(AD_LAYOUTS).map(([key, layout]) => {
                      const Icon = layout.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => setTemplate({...template, ad_type: key})}
                          className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                            template.ad_type === key 
                              ? 'border-[#D4A836] bg-[#D4A836]/10' 
                              : 'border-[#30363D] bg-[#0D1117] hover:border-gray-500'
                          }`}
                          data-testid={`ad-type-${key}`}
                        >
                          <Icon className={`w-6 h-6 ${template.ad_type === key ? 'text-[#D4A836]' : 'text-gray-400'}`} />
                          <span className={`text-xs ${template.ad_type === key ? 'text-[#D4A836]' : 'text-gray-400'}`}>
                            {layout.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Templates */}
                <div>
                  <Label className="text-gray-400 mb-2 block">Quick Scam Templates</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {SCAM_TEMPLATES.map((scam) => {
                      const Icon = scam.icon;
                      return (
                        <button
                          key={scam.id}
                          onClick={() => applyScamTemplate(scam)}
                          className="flex items-center gap-3 p-3 rounded-lg border border-[#30363D] bg-[#0D1117] hover:border-[#D4A836] transition-all text-left group"
                          data-testid={`scam-template-${scam.id}`}
                        >
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: scam.colors.bg }}
                          >
                            <Icon className="w-5 h-5" style={{ color: scam.colors.text }} />
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium group-hover:text-[#D4A836]">
                              {scam.name}
                            </div>
                            <div className="text-gray-500 text-xs truncate">
                              {scam.headline}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4 mt-4">
                <div>
                  <Label className="text-gray-400">Headline *</Label>
                  <Input
                    value={template.headline}
                    onChange={(e) => setTemplate({...template, headline: e.target.value})}
                    placeholder="e.g., WARNING: Virus Detected!"
                    className="bg-[#0D1117] border-[#30363D] text-white mt-1"
                    data-testid="headline-input"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Description *</Label>
                  <textarea
                    value={template.description}
                    onChange={(e) => setTemplate({...template, description: e.target.value})}
                    placeholder="Enter the ad description text..."
                    rows={4}
                    className="w-full bg-[#0D1117] border border-[#30363D] text-white rounded-md p-3 mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-[#D4A836]"
                    data-testid="description-input"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Call-to-Action Button *</Label>
                  <Input
                    value={template.call_to_action}
                    onChange={(e) => setTemplate({...template, call_to_action: e.target.value})}
                    placeholder="e.g., Download Now"
                    className="bg-[#0D1117] border-[#30363D] text-white mt-1"
                    data-testid="cta-input"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Image URL (Optional)</Label>
                  <Input
                    value={template.image_url}
                    onChange={(e) => setTemplate({...template, image_url: e.target.value})}
                    placeholder="https://example.com/image.png"
                    className="bg-[#0D1117] border-[#30363D] text-white mt-1"
                    data-testid="image-url-input"
                  />
                </div>

                {/* Urgency Toggle */}
                <div className="flex items-center gap-3 p-3 bg-[#0D1117] rounded-lg border border-[#30363D]">
                  <input
                    type="checkbox"
                    checked={template.showUrgency}
                    onChange={(e) => setTemplate({...template, showUrgency: e.target.checked})}
                    className="w-4 h-4 rounded"
                    data-testid="urgency-toggle"
                  />
                  <div className="flex-1">
                    <Label className="text-white cursor-pointer">Show Urgency Banner</Label>
                    <p className="text-gray-500 text-xs">Adds a flashing "Limited Time" banner</p>
                  </div>
                </div>

                {template.showUrgency && (
                  <div>
                    <Label className="text-gray-400">Urgency Text</Label>
                    <Input
                      value={template.urgencyText}
                      onChange={(e) => setTemplate({...template, urgencyText: e.target.value})}
                      placeholder="e.g., ACT NOW - OFFER EXPIRES SOON!"
                      className="bg-[#0D1117] border-[#30363D] text-white mt-1"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Style Tab */}
              <TabsContent value="style" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Background Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={template.bgColor}
                        onChange={(e) => setTemplate({...template, bgColor: e.target.value})}
                        className="w-12 h-10 rounded cursor-pointer"
                        data-testid="bg-color-picker"
                      />
                      <Input
                        value={template.bgColor}
                        onChange={(e) => setTemplate({...template, bgColor: e.target.value})}
                        className="bg-[#0D1117] border-[#30363D] text-white flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={template.textColor}
                        onChange={(e) => setTemplate({...template, textColor: e.target.value})}
                        className="w-12 h-10 rounded cursor-pointer"
                        data-testid="text-color-picker"
                      />
                      <Input
                        value={template.textColor}
                        onChange={(e) => setTemplate({...template, textColor: e.target.value})}
                        className="bg-[#0D1117] border-[#30363D] text-white flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Button Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={template.buttonColor}
                        onChange={(e) => setTemplate({...template, buttonColor: e.target.value})}
                        className="w-12 h-10 rounded cursor-pointer"
                        data-testid="button-color-picker"
                      />
                      <Input
                        value={template.buttonColor}
                        onChange={(e) => setTemplate({...template, buttonColor: e.target.value})}
                        className="bg-[#0D1117] border-[#30363D] text-white flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Button Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={template.buttonTextColor}
                        onChange={(e) => setTemplate({...template, buttonTextColor: e.target.value})}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={template.buttonTextColor}
                        onChange={(e) => setTemplate({...template, buttonTextColor: e.target.value})}
                        className="bg-[#0D1117] border-[#30363D] text-white flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Font Size: {template.fontSize}px</Label>
                  <Slider
                    value={[template.fontSize]}
                    onValueChange={(value) => setTemplate({...template, fontSize: value[0]})}
                    min={12}
                    max={32}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Border Radius: {template.borderRadius}px</Label>
                  <Slider
                    value={[template.borderRadius]}
                    onValueChange={(value) => setTemplate({...template, borderRadius: value[0]})}
                    min={0}
                    max={24}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* Color Presets */}
                <div>
                  <Label className="text-gray-400 mb-2 block">Color Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { bg: '#dc2626', text: '#ffffff', btn: '#fbbf24', name: 'Danger Red' },
                      { bg: '#ff6b35', text: '#ffffff', btn: '#ffcc00', name: 'Warning Orange' },
                      { bg: '#1e3a5f', text: '#ffffff', btn: '#3b82f6', name: 'Corporate Blue' },
                      { bg: '#15803d', text: '#ffffff', btn: '#fbbf24', name: 'Money Green' },
                      { bg: '#7c3aed', text: '#ffffff', btn: '#fbbf24', name: 'Tech Purple' },
                      { bg: '#0D1117', text: '#ffffff', btn: '#D4A836', name: 'Dark Mode' }
                    ].map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => setTemplate({
                          ...template, 
                          bgColor: preset.bg, 
                          textColor: preset.text,
                          buttonColor: preset.btn
                        })}
                        className="px-3 py-1.5 rounded text-xs border border-[#30363D] hover:border-[#D4A836] transition-all"
                        style={{ background: preset.bg, color: preset.text }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-[#30363D] text-gray-400 hover:bg-[#30363D]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-[#D4A836] text-black hover:bg-[#c49a2f]"
            data-testid="save-template-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {mode === 'edit' ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#D4A836]" />
                Live Preview
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                  className={previewDevice === 'desktop' ? 'bg-[#30363D]' : ''}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                  className={previewDevice === 'mobile' ? 'bg-[#30363D]' : ''}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={previewRef}
              className="bg-gray-900 rounded-lg p-6 min-h-[400px] flex items-center justify-center"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #333 1px, transparent 0)',
                backgroundSize: '20px 20px'
              }}
            >
              <AdPreview />
            </div>
            <p className="text-center text-gray-500 text-xs mt-3">
              This is how your ad will appear to users
            </p>
          </CardContent>
        </Card>

        {/* Ad Type Info */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              {React.createElement(AD_LAYOUTS[template.ad_type]?.icon || Layout, {
                className: "w-8 h-8 text-[#D4A836] flex-shrink-0"
              })}
              <div>
                <h4 className="text-white font-medium">{AD_LAYOUTS[template.ad_type]?.name}</h4>
                <p className="text-gray-500 text-sm">{AD_LAYOUTS[template.ad_type]?.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add animation styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
