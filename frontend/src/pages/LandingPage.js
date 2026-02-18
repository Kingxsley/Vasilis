import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Mail, MousePointerClick, Users, BarChart3, Lock, ChevronRight, Zap, Target, Award, Shield, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Icon mapping for features
const iconMap = {
  Mail: Mail,
  MousePointerClick: MousePointerClick,
  Users: Users,
  Shield: Shield,
  Target: Target,
  Award: Award,
  BarChart3: BarChart3,
  Lock: Lock,
  Zap: Zap,
};

// Logo Component - fetches custom logo from settings
const Logo = ({ className = "h-10" }) => {
  const [branding, setBranding] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/branding`)
      .then(res => {
        setBranding(res.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Don't render anything until branding is loaded to prevent flickering
  if (!loaded) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 bg-[#D4A836]/20 rounded animate-pulse" />
        <div className="w-32 h-6 bg-[#D4A836]/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
      ) : (
        <Shield className="w-8 h-8 text-[#D4A836]" />
      )}
      <span className="text-xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
        {branding?.company_name || 'Vasilis NetShield'}
      </span>
    </div>
  );
};

export default function LandingPage() {
  const [content, setContent] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/pages/landing`),
      axios.get(`${API}/settings/branding`)
    ])
      .then(([contentRes, brandingRes]) => {
        setContent(contentRes.data);
        setBranding(brandingRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Dynamic colors from branding settings
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';

  // Default content while loading or if fetch fails
  const hero = content?.hero || {
    badge_text: "Human + AI Powered Security Training",
    title_line1: "Train Your Team to",
    title_highlight: "Defend",
    title_line2: "Against Cyber Threats",
    subtitle: "Realistic phishing simulations, malicious ad detection, and social engineering scenarios. Build a security-aware workforce with expert-crafted and AI-enhanced training content.",
    cta_primary_text: "Start Free Trial",
    cta_primary_link: "/auth",
    cta_secondary_text: "Watch Demo",
    cta_secondary_link: ""
  };

  const stats = content?.stats || [
    { value: "95%", label: "Detection Rate" },
    { value: "10k+", label: "Users Trained" },
    { value: "500+", label: "Organizations" }
  ];

  const featuresTitle = content?.features_title || "Comprehensive Security Training";
  const featuresSubtitle = content?.features_subtitle || "Three powerful modules designed to build real-world cybersecurity awareness";

  const features = content?.features || [
    {
      title: "Phishing Email Detection",
      description: "Learn to identify suspicious emails, fraudulent sender addresses, and malicious links through realistic simulations.",
      bullet_points: ["Spoofed domain recognition", "Urgency tactic awareness", "Link verification skills"],
      icon: "Mail",
      color: "#D4A836"
    },
    {
      title: "Malicious Ad Recognition",
      description: "Spot fake advertisements, clickbait, and potentially harmful ad content before they compromise your system.",
      bullet_points: ["Clickbait identification", "Fake download detection", "Ad network awareness"],
      icon: "MousePointerClick",
      color: "#FFB300"
    },
    {
      title: "Social Engineering Defense",
      description: "Recognize manipulation tactics including pretexting, baiting, and impersonation attempts.",
      bullet_points: ["Pretexting scenarios", "Authority exploitation", "Emotional manipulation"],
      icon: "Users",
      color: "#FF3B30"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#D4A836]/20" style={{ borderColor: `${primaryColor}33` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center gap-6">
              <Link to="/blog" className="text-gray-400 hover:text-[#E8DDB5]" style={{ '--hover-color': textColor }}>Blog</Link>
              <Link to="/videos" className="text-gray-400 hover:text-[#E8DDB5] hidden md:block" style={{ '--hover-color': textColor }}>Videos</Link>
              <Link to="/about" className="text-gray-400 hover:text-[#E8DDB5] hidden md:block" style={{ '--hover-color': textColor }}>About</Link>
              <Link to="/auth">
                <Button variant="ghost" className="hover:text-white hover:bg-white/10" style={{ color: textColor }} data-testid="login-btn">
                  Login
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="text-black font-semibold" style={{ backgroundColor: primaryColor }} data-testid="get-started-btn">
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 hero-gradient overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6" style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}50` }}>
                <Zap className="w-4 h-4" style={{ color: accentColor }} />
                <span className="text-sm" style={{ color: accentColor }}>{hero.badge_text}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                {hero.title_line1}
                <span style={{ color: accentColor }}> {hero.title_highlight} </span>
                {hero.title_line2}
              </h1>
              <p className="text-lg mb-8 max-w-xl" style={{ color: textColor, opacity: 0.8 }}>
                {hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={hero.cta_primary_link || "/auth"}>
                  <Button size="lg" className="text-black font-semibold px-8" style={{ backgroundColor: primaryColor }} data-testid="hero-cta-btn">
                    {hero.cta_primary_text}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                {hero.cta_secondary_link ? (
                  <a href={hero.cta_secondary_link} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline" className="hover:bg-white/5" style={{ borderColor: `${primaryColor}50`, color: textColor }}>
                      {hero.cta_secondary_text}
                    </Button>
                  </a>
                ) : hero.cta_secondary_text ? (
                  <Button size="lg" variant="outline" className="hover:bg-white/5" style={{ borderColor: `${primaryColor}50`, color: textColor }}>
                    {hero.cta_secondary_text}
                  </Button>
                ) : null}
              </div>
              
              <div className="flex items-center gap-8 mt-12 pt-8 border-t" style={{ borderColor: `${primaryColor}33` }}>
                {stats.map((stat, index) => (
                  <div key={index}>
                    <p className="text-3xl font-bold" style={{ color: headingColor }}>{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative hidden lg:block animate-slide-up stagger-2">
              <div className="absolute -inset-4 bg-[#D4A836]/10 blur-3xl rounded-full" />
              <div className="relative card-dark rounded-xl p-6 shadow-2xl">
                {/* Simulated email preview */}
                <div className="email-container">
                  <div className="email-header flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-[#FF3B30]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#E8DDB5]">Suspicious Email Detected</p>
                        <p className="text-xs text-gray-500">security@amaz0n-support.com</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs bg-[#FF3B30]/20 text-[#FF3B30] rounded">THREAT</span>
                  </div>
                  <div className="email-body text-gray-400">
                    <p className="text-sm">URGENT: Your account has been compromised. Click here to verify...</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-[#00E676]/10 border border-[#00E676]/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-[#00E676]" />
                    <span className="text-sm font-medium text-[#00E676]">Correctly Identified!</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Great job! You spotted the misspelled domain and urgency tactics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {featuresTitle}
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              {featuresSubtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Shield;
              return (
                <div key={index} className="group card-dark rounded-xl p-8 card-hover" data-testid={`feature-${index}`}>
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <IconComponent className="w-7 h-7" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500">
                    {feature.bullet_points?.map((bullet, bIndex) => (
                      <li key={bIndex} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: feature.color }} />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Enterprise-Ready Platform
              </h2>
              <p className="text-gray-500 mb-8">
                Manage multiple organizations, track progress, and deploy targeted campaigns with our comprehensive admin dashboard.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#D4A836]/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-[#D4A836]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-[#E8DDB5]">Targeted Campaigns</h4>
                    <p className="text-sm text-gray-500">Create custom training campaigns for specific teams or departments.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#00E676]/10 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-[#00E676]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-[#E8DDB5]">Real-Time Analytics</h4>
                    <p className="text-sm text-gray-500">Track completion rates, scores, and identify knowledge gaps.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#FFB300]/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-[#FFB300]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-[#E8DDB5]">Expert + AI Content</h4>
                    <p className="text-sm text-gray-500">Human-crafted scenarios enhanced with AI for continuous learning.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative flex justify-center">
              <div className="absolute -inset-8 bg-gradient-to-r from-[#D4A836]/10 to-[#0f3460]/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-64 h-64 flex items-center justify-center platform-float">
                {content?.platform_image ? (
                  <img 
                    src={content.platform_image} 
                    alt="Platform" 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl platform-glow"
                  />
                ) : (
                  <Shield className="w-32 h-32 text-[#D4A836] animate-pulse-glow" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Ready to Strengthen Your Security?
          </h2>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
            Join hundreds of organizations already using Vasilis NetShield to build a security-conscious workforce.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold px-12" data-testid="cta-start-btn">
              Start Training Today
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#D4A836]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo />
            <p className="text-sm text-gray-500">
              {content?.footer_text || "© 2024 Vasilis NetShield. Enterprise Cybersecurity Training."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
