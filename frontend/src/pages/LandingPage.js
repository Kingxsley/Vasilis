import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Mail, MousePointerClick, Users, BarChart3, Lock, ChevronRight, Zap, Target, Award, Shield } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Logo Component - fetches custom logo from settings
const Logo = ({ className = "h-10" }) => {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    axios.get(`${API}/settings/branding`)
      .then(res => setBranding(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
      ) : (
        <Shield className="w-8 h-8 text-[#D4A836]" />
      )}
      <span className="text-xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
        {branding?.company_name || 'VasilisNetShield'}
      </span>
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#D4A836]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center gap-6">
              <Link to="/blog" className="text-gray-400 hover:text-[#E8DDB5] hidden md:block">Blog</Link>
              <Link to="/videos" className="text-gray-400 hover:text-[#E8DDB5] hidden md:block">Videos</Link>
              <Link to="/about" className="text-gray-400 hover:text-[#E8DDB5] hidden md:block">About</Link>
              <Link to="/auth">
                <Button variant="ghost" className="text-[#E8DDB5] hover:text-white hover:bg-white/10" data-testid="login-btn">
                  Login
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold" data-testid="get-started-btn">
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A836]/10 border border-[#D4A836]/30 mb-6">
                <Zap className="w-4 h-4 text-[#D4A836]" />
                <span className="text-sm text-[#D4A836]">Human + AI Powered Security Training</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Train Your Team to
                <span className="text-[#D4A836]"> Defend </span>
                Against Cyber Threats
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-xl">
                Realistic phishing simulations, malicious ad detection, and social engineering scenarios. 
                Build a security-aware workforce with expert-crafted and AI-enhanced training content.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold px-8" data-testid="hero-cta-btn">
                    Start Free Trial
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-[#D4A836]/30 text-[#E8DDB5] hover:bg-white/5">
                  Watch Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-8 mt-12 pt-8 border-t border-[#D4A836]/20">
                <div>
                  <p className="text-3xl font-bold text-[#E8DDB5]">95%</p>
                  <p className="text-sm text-gray-500">Detection Rate</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#E8DDB5]">10k+</p>
                  <p className="text-sm text-gray-500">Users Trained</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#E8DDB5]">500+</p>
                  <p className="text-sm text-gray-500">Organizations</p>
                </div>
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
              Comprehensive Security Training
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Three powerful modules designed to build real-world cybersecurity awareness
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Phishing Module */}
            <div className="group card-dark rounded-xl p-8 card-hover" data-testid="feature-phishing">
              <div className="w-14 h-14 rounded-xl bg-[#D4A836]/10 flex items-center justify-center mb-6 group-hover:bg-[#D4A836]/20 transition-colors">
                <Mail className="w-7 h-7 text-[#D4A836]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Phishing Email Detection
              </h3>
              <p className="text-gray-500 mb-6">
                Learn to identify suspicious emails, fraudulent sender addresses, and malicious links through realistic simulations.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A836]" />
                  Spoofed domain recognition
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A836]" />
                  Urgency tactic awareness
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A836]" />
                  Link verification skills
                </li>
              </ul>
            </div>
            
            {/* Malicious Ads Module */}
            <div className="group card-dark rounded-xl p-8 card-hover" data-testid="feature-ads">
              <div className="w-14 h-14 rounded-xl bg-[#FFB300]/10 flex items-center justify-center mb-6 group-hover:bg-[#FFB300]/20 transition-colors">
                <MousePointerClick className="w-7 h-7 text-[#FFB300]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Malicious Ad Recognition
              </h3>
              <p className="text-gray-500 mb-6">
                Spot fake advertisements, clickbait, and potentially harmful ad content before they compromise your system.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB300]" />
                  Clickbait identification
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB300]" />
                  Fake offer detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB300]" />
                  Safe browsing habits
                </li>
              </ul>
            </div>
            
            {/* Social Engineering Module */}
            <div className="group card-dark rounded-xl p-8 card-hover" data-testid="feature-social">
              <div className="w-14 h-14 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center mb-6 group-hover:bg-[#FF3B30]/20 transition-colors">
                <Users className="w-7 h-7 text-[#FF3B30]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Social Engineering Defense
              </h3>
              <p className="text-gray-500 mb-6">
                Recognize manipulation tactics including pretexting, baiting, and impersonation attempts.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
                  Pretexting scenarios
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
                  CEO fraud awareness
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
                  Physical security basics
                </li>
              </ul>
            </div>
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
              <div className="absolute -inset-8 bg-gradient-to-r from-[#D4A836]/10 to-[#0f3460]/20 blur-3xl rounded-full" />
              <div className="relative w-64 h-64 flex items-center justify-center">
                <Shield className="w-32 h-32 text-[#D4A836] animate-pulse-glow" />
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
              2024 Vasilis NetShield. Enterprise Cybersecurity Training.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
