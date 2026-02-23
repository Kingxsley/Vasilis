import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Mail, MousePointerClick, Users, BarChart3, Lock, ChevronRight, Zap, Target, Award, Loader2, Menu, X, Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Icon mapping for features
const iconMap = {
  Mail: Mail,
  MousePointerClick: MousePointerClick,
  Users: Users,
  Target: Target,
  Award: Award,
  BarChart3: BarChart3,
  Lock: Lock,
  Zap: Zap,
};

// Logo Component - shows logo directly without loading skeleton
const Logo = ({ className = "h-10" }) => {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    axios.get(`${API}/settings/branding`)
      .then(res => setBranding(res.data))
      .catch(() => {});
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    window.location.href = '/';
  };

  return (
    <a href="/" onClick={handleClick} className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`} data-testid="logo-home-link">
      {branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
      ) : (
        /* Use the site favicon when no logo is uploaded */
        <img src="/favicon.svg" alt="Logo" className="w-8 h-8 object-contain" />
      )}
      <span className="text-xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
        {branding?.company_name || 'Vasilis NetShield'}
      </span>
    </a>
  );
};

export default function LandingPage() {
  const [layout, setLayout] = useState(null);
  const [branding, setBranding] = useState(null);
  const [pageContent, setPageContent] = useState(null);
  const [customPages, setCustomPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/landing-layouts/public`).catch(() => ({ data: null })),
      axios.get(`${API}/settings/branding`).catch(() => ({ data: null })),
      axios.get(`${API}/pages/landing`).catch(() => ({ data: null })),
      axios.get(`${API}/pages/custom`).catch(() => ({ data: { pages: [] } }))
    ])
      .then(([layoutRes, brandingRes, pageRes, customPagesRes]) => {
        setLayout(layoutRes.data);
        setBranding(brandingRes.data);
        setPageContent(pageRes.data);
        // Filter only published pages that should show in nav
        const navPages = (customPagesRes.data?.pages || []).filter(
          p => p.is_published && p.show_in_nav
        );
        setCustomPages(navPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Dynamic colors from branding settings
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';
  const companyName = branding?.company_name || 'Vasilis NetShield';

  // Get sections from layout or use defaults
  const sections = layout?.sections || [];
  
  // Helper to find a section by type
  const findSection = (type) => sections.find(s => s.type === type && s.visible !== false);
  
  // Default content for fallback
  const defaultHero = {
    badge_text: "Human + AI Powered Security Training",
    title: "Train Your Team to Defend Against Cyber Threats",
    description: "Realistic phishing simulations, malicious ad detection, and social engineering scenarios. Build a security-aware workforce with expert-crafted and AI-enhanced training content.",
    button_text: "Start Free Trial",
    button_link: "/auth",
    stats: [
      { value: "95%", label: "Detection Rate" },
      { value: "10k+", label: "Users Trained" },
      { value: "500+", label: "Organizations" }
    ]
  };

  const defaultFeatures = [
    {
      title: "Phishing Email Detection",
      description: "Learn to identify suspicious emails, fraudulent sender addresses, and malicious links through realistic simulations.",
      icon: "Mail",
      color: "#D4A836"
    },
    {
      title: "Malicious Ad Recognition",
      description: "Spot fake advertisements, clickbait, and potentially harmful ad content before they compromise your system.",
      icon: "MousePointerClick",
      color: "#FFB300"
    },
    {
      title: "Social Engineering Defense",
      description: "Recognize manipulation tactics including pretexting, baiting, and impersonation attempts.",
      icon: "Users",
      color: "#FF3B30"
    }
  ];

  // Get hero section content
  const heroSection = findSection('hero');
  const hero = heroSection?.content || defaultHero;
  const stats = hero.stats || defaultHero.stats;

  // Get feature sections
  const featureSections = sections.filter(s => s.type === 'features' && s.visible !== false);
  
  // Get CTA section
  const ctaSection = findSection('cta');
  const cta = ctaSection?.content || {
    title: "Ready to Strengthen Your Security?",
    description: "Join hundreds of organizations already using our platform to build a security-conscious workforce.",
    button_text: "Start Training Today",
    button_link: "/auth"
  };

  // Get FAQ section
  const faqSection = findSection('faq');
  const faqContent = faqSection?.content || null;

  // Get Pricing section
  const pricingSection = findSection('pricing');
  const pricingContent = pricingSection?.content || null;

  // Get Testimonials section
  const testimonialsSection = findSection('testimonials');
  const testimonialsContent = testimonialsSection?.content || null;

  // Get Team section
  const teamSection = findSection('team');
  const teamContent = teamSection?.content || null;

  // Get Stats section
  const statsSection = findSection('stats');
  const statsContent = statsSection?.content || null;

  // Navigation visibility from branding settings
  const showBlog = branding?.show_blog !== false;
  const showVideos = branding?.show_videos !== false;
  const showNews = branding?.show_news !== false;
  const showAbout = branding?.show_about !== false;
  
  // Only show nav items after branding is loaded to prevent flash
  const isReady = !loading && branding !== null;
  
  // Count visible nav items for mobile - only when ready
  const visibleNavItems = isReady ? [
    showBlog && { to: '/blog', label: 'Blog' },
    showVideos && { to: '/videos', label: 'Videos' },
    showNews && { to: '/news', label: 'News' },
    showAbout && { to: '/about', label: 'About' },
    // Add custom pages
    ...customPages.map(page => ({
      to: `/page/${page.slug}`,
      label: page.title
    }))
  ].filter(Boolean) : [];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#D4A836]/20" style={{ borderColor: `${primaryColor}33` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {isReady && showBlog && <Link to="/blog" className="text-gray-400 hover:text-[#E8DDB5] transition-colors" style={{ '--hover-color': textColor }}>Blog</Link>}
              {isReady && showVideos && <Link to="/videos" className="text-gray-400 hover:text-[#E8DDB5] transition-colors" style={{ '--hover-color': textColor }}>Videos</Link>}
              {isReady && showNews && <Link to="/news" className="text-gray-400 hover:text-[#E8DDB5] transition-colors" style={{ '--hover-color': textColor }}>News</Link>}
              {isReady && showAbout && <Link to="/about" className="text-gray-400 hover:text-[#E8DDB5] transition-colors" style={{ '--hover-color': textColor }}>About</Link>}
              {/* Custom Pages */}
              {isReady && customPages.map(page => (
                <Link 
                  key={page.slug}
                  to={`/page/${page.slug}`} 
                  className="text-gray-400 hover:text-[#E8DDB5] transition-colors" 
                  style={{ '--hover-color': textColor }}
                >
                  {page.title}
                </Link>
              ))}
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
            
            {/* Mobile Navigation Controls */}
            <div className="flex md:hidden items-center gap-2">
              <Link to="/auth">
                <Button size="sm" className="text-black font-semibold" style={{ backgroundColor: primaryColor }} data-testid="mobile-get-started-btn">
                  Get Started
                </Button>
              </Link>
              {visibleNavItems.length > 0 && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-gray-400 hover:text-[#E8DDB5]"
                  data-testid="mobile-nav-toggle"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#D4A836]/20 animate-slide-up">
              <div className="flex flex-col gap-2">
                {visibleNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link 
                  to="/auth" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 rounded-lg transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 hero-gradient overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6" style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}50` }}>
                <Zap className="w-4 h-4" style={{ color: accentColor }} />
                <span className="text-sm" style={{ color: accentColor }}>{hero.subtitle || hero.badge_text || branding?.tagline || "Human + AI Powered Security Training"}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                {hero.title || `${hero.title_line1 || "Train Your Team to"} `}
                {hero.title?.includes("Defend") ? null : <span style={{ color: accentColor }}> {hero.title_highlight || "Defend"} </span>}
                {hero.title ? null : (hero.title_line2 || "Against Cyber Threats")}
              </h1>
              <p className="text-lg mb-8 max-w-xl" style={{ color: textColor, opacity: 0.8 }}>
                {hero.description || hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={hero.button_link || hero.cta_primary_link || "/auth"}>
                  <Button size="lg" className="text-black font-semibold px-8" style={{ backgroundColor: primaryColor }} data-testid="hero-cta-btn">
                    {hero.button_text || hero.cta_primary_text || "Start Free Trial"}
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

      {/* Dynamic Features Sections from Layout */}
      {featureSections.length > 0 ? (
        featureSections.map((section, sIdx) => {
          const content = section.content || {};
          const items = content.items || [];
          return (
            <section key={section.section_id} className="py-24" style={{ backgroundColor: content.background_color }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                    {content.title || 'Features'}
                  </h2>
                  {content.subtitle && (
                    <p className="max-w-2xl mx-auto" style={{ color: textColor, opacity: 0.7 }}>
                      {content.subtitle}
                    </p>
                  )}
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  {items.map((feature, index) => {
                    const IconComponent = iconMap[feature.icon] || Zap;
                    return (
                      <div key={index} className="group card-dark rounded-xl p-8 card-hover" data-testid={`feature-${sIdx}-${index}`}>
                        <div 
                          className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors"
                          style={{ backgroundColor: `${feature.color || primaryColor}15` }}
                        >
                          <IconComponent className="w-7 h-7" style={{ color: feature.color || primaryColor }} />
                        </div>
                        <h3 className="text-xl font-bold mb-3" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                          {feature.title}
                        </h3>
                        <p className="mb-6" style={{ color: textColor, opacity: 0.7 }}>
                          {feature.description}
                        </p>
                        {feature.bullet_points && (
                          <ul className="space-y-2 text-sm" style={{ color: textColor, opacity: 0.6 }}>
                            {feature.bullet_points.map((bullet, bIndex) => (
                              <li key={bIndex} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: feature.color || primaryColor }} />
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })
      ) : (
        /* Default Features Section if no layout data */
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                Comprehensive Security Training
              </h2>
              <p className="max-w-2xl mx-auto" style={{ color: textColor, opacity: 0.7 }}>
                Three powerful modules designed to build real-world cybersecurity awareness
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {defaultFeatures.map((feature, index) => {
                const IconComponent = iconMap[feature.icon] || Zap;
                return (
                  <div key={index} className="group card-dark rounded-xl p-8 card-hover" data-testid={`feature-${index}`}>
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors"
                      style={{ backgroundColor: `${feature.color}15` }}
                    >
                      <IconComponent className="w-7 h-7" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                      {feature.title}
                    </h3>
                    <p className="mb-6" style={{ color: textColor, opacity: 0.7 }}>
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
                {/* Show loading skeleton while data is being fetched */}
                {loading ? (
                  <div className="w-32 h-32 bg-[#D4A836]/10 rounded-2xl animate-pulse" />
                ) : pageContent?.platform_image ? (
                  <img 
                    src={pageContent.platform_image} 
                    alt="Platform" 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl platform-glow"
                  />
                ) : branding?.logo_url ? (
                  <img 
                    src={branding.logo_url} 
                    alt="Logo" 
                    className="w-32 h-32 object-contain drop-shadow-2xl platform-glow"
                  />
                ) : (
                  /* Professional animated security shield visualization when no logo uploaded */
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#D4A836]/20 to-[#0f3460]/30 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-4 bg-gradient-to-br from-[#D4A836]/10 to-[#0f3460]/20 rounded-full animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 relative">
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                          <defs>
                            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#D4A836" />
                              <stop offset="100%" stopColor="#C49A30" />
                            </linearGradient>
                          </defs>
                          {/* Shield shape */}
                          <path 
                            d="M50 5 L90 20 L90 50 C90 75 70 90 50 95 C30 90 10 75 10 50 L10 20 Z" 
                            fill="url(#shieldGradient)" 
                            className="drop-shadow-lg"
                          />
                          {/* Lock icon inside shield */}
                          <rect x="38" y="42" width="24" height="20" rx="3" fill="#0a0a0f" opacity="0.9" />
                          <path d="M42 42 L42 35 C42 30 46 26 50 26 C54 26 58 30 58 35 L58 42" 
                                stroke="#0a0a0f" strokeWidth="4" fill="none" opacity="0.9" />
                          <circle cx="50" cy="52" r="3" fill="#D4A836" />
                          <rect x="49" y="52" width="2" height="6" fill="#D4A836" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section (if exists in layout) */}
      {statsContent && (
        <section className="py-20 bg-[#0a0a0f]/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {statsContent.title && (
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                  {statsContent.title}
                </h2>
                {statsContent.subtitle && (
                  <p className="mt-2" style={{ color: textColor, opacity: 0.7 }}>{statsContent.subtitle}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {(statsContent.stats || []).map((stat, idx) => (
                <div key={idx}>
                  <p className="text-4xl font-bold" style={{ color: primaryColor }}>{stat.value}</p>
                  <p className="text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section (if exists in layout) */}
      {testimonialsContent && (
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                {testimonialsContent.title || "What Our Clients Say"}
              </h2>
              {testimonialsContent.subtitle && (
                <p className="max-w-2xl mx-auto" style={{ color: textColor, opacity: 0.7 }}>
                  {testimonialsContent.subtitle}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(testimonialsContent.items || []).map((testimonial, idx) => (
                <div key={idx} className="card-dark rounded-xl p-6">
                  <p className="text-lg mb-6" style={{ color: textColor, opacity: 0.9 }}>
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4A836]/20 flex items-center justify-center">
                      <span className="text-[#D4A836] font-bold">{testimonial.author?.[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: headingColor }}>{testimonial.author}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section (if exists in layout) */}
      {pricingContent && (
        <section className="py-24 bg-[#0a0a0f]/50" data-testid="pricing-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                {pricingContent.title || "Pricing Plans"}
              </h2>
              {pricingContent.subtitle && (
                <p className="max-w-2xl mx-auto" style={{ color: textColor, opacity: 0.7 }}>
                  {pricingContent.subtitle}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {(pricingContent.items || []).map((plan, idx) => (
                <div 
                  key={idx} 
                  className={`card-dark rounded-xl p-8 ${plan.highlighted ? 'ring-2 ring-[#D4A836] relative' : ''}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-[#D4A836] text-black">Most Popular</Badge>
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2" style={{ color: headingColor }}>
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  )}
                  <div className="mb-6">
                    <span className="text-4xl font-bold" style={{ color: primaryColor }}>{plan.price}</span>
                    {plan.period && <span className="text-gray-500">{plan.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {(plan.features || []).map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-[#D4A836]" />
                        <span style={{ color: textColor, opacity: 0.8 }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.button_text && (
                    <Link to={plan.button_link || "/auth"}>
                      <Button 
                        className={`w-full ${plan.highlighted ? 'bg-[#D4A836] text-black hover:bg-[#C49A30]' : 'bg-transparent border border-[#D4A836] text-[#D4A836] hover:bg-[#D4A836]/10'}`}
                      >
                        {plan.button_text}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team Section (if exists in layout) */}
      {teamContent && (
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                {teamContent.title || "Meet Our Team"}
              </h2>
              {teamContent.subtitle && (
                <p className="max-w-2xl mx-auto" style={{ color: textColor, opacity: 0.7 }}>
                  {teamContent.subtitle}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
              {(teamContent.items || []).map((member, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[#D4A836]/20 flex items-center justify-center overflow-hidden">
                    {member.image_url ? (
                      <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl text-[#D4A836] font-bold">{member.name?.[0]}</span>
                    )}
                  </div>
                  <h4 className="font-bold" style={{ color: headingColor }}>{member.name}</h4>
                  <p className="text-sm text-gray-500">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-24 bg-[#0a0a0f]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
              {faqContent?.title || "Frequently Asked Questions"}
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: textColor, opacity: 0.7 }}>
              {faqContent?.subtitle || "Everything you need to know about our security training platform"}
            </p>
          </div>
          
          <div className="space-y-4" data-testid="faq-section">
            {(faqContent?.items || [
              {
                question: "What types of security training do you offer?",
                answer: "We offer comprehensive training modules covering phishing email detection, malicious ad recognition, and social engineering defense. Each module includes realistic simulations and immediate feedback to reinforce learning."
              },
              {
                question: "How are the training scenarios created?",
                answer: "Our scenarios are crafted by cybersecurity experts and enhanced with AI to ensure they reflect real-world threats. We continuously update our content based on the latest attack patterns and techniques used by cybercriminals."
              },
              {
                question: "Can I track my team's progress?",
                answer: "Yes! Our admin dashboard provides real-time analytics including completion rates, individual scores, vulnerability assessments, and detailed reports. You can identify knowledge gaps and target specific areas for improvement."
              },
              {
                question: "How long does each training module take?",
                answer: "Training modules typically take 20-45 minutes to complete, depending on the complexity. Phishing email detection takes about 30 minutes, malicious ad recognition about 20 minutes, and social engineering defense approximately 45 minutes."
              },
              {
                question: "Is the platform suitable for organizations of all sizes?",
                answer: "Absolutely! Whether you're a small business or a large enterprise, our platform scales to meet your needs. You can manage multiple organizations, departments, and create targeted campaigns for specific teams."
              },
              {
                question: "Do you provide certificates upon completion?",
                answer: "Yes, users receive a certificate upon successfully completing each training module. These certificates can be customized with your organization's branding and are available for download."
              }
            ]).map((faq, index) => (
              <details 
                key={index} 
                className="group card-dark rounded-xl overflow-hidden"
                data-testid={`faq-item-${index}`}
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="text-lg font-semibold pr-4" style={{ color: headingColor }}>
                    {faq.question}
                  </h3>
                  <ChevronRight className="w-5 h-5 text-[#D4A836] transform group-open:rotate-90 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6">
                  <p style={{ color: textColor, opacity: 0.8 }}>
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {cta.title}
          </h2>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
            {cta.description}
          </p>
          <Link to={cta.button_link || "/auth"}>
            <Button size="lg" className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold px-12" data-testid="cta-start-btn">
              {cta.button_text || "Start Training Today"}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#D4A836]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo />
            
            {/* Social Links */}
            {(branding?.social_facebook || branding?.social_twitter || branding?.social_linkedin || branding?.social_instagram || branding?.social_youtube) && (
              <div className="flex items-center gap-4">
                {branding?.social_facebook && (
                  <a href={branding.social_facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#D4A836] transition-colors">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {branding?.social_twitter && (
                  <a href={branding.social_twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#D4A836] transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {branding?.social_linkedin && (
                  <a href={branding.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#D4A836] transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {branding?.social_instagram && (
                  <a href={branding.social_instagram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#D4A836] transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {branding?.social_youtube && (
                  <a href={branding.social_youtube} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#D4A836] transition-colors">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
            
            <p className="text-sm text-gray-500">
              {branding?.footer_copyright || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
