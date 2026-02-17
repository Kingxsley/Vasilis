import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Shield, Mail, MousePointerClick, Users, BarChart3, Lock, ChevronRight, Zap, Target, Award } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0E14]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#30363D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2979FF] to-[#00E676] flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
                VasilisNetShield
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10" data-testid="login-btn">
                  Login
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-[#2979FF] hover:bg-[#2962FF] text-white" data-testid="get-started-btn">
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
        <div className="absolute inset-0 opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1662638600476-d563fffbb072?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxjeWJlcnNlY3VyaXR5JTIwbmV0d29yayUyMHNoaWVsZCUyMGRpZ2l0YWwlMjBkZWZlbnNlJTIwYWJzdHJhY3R8ZW58MHx8fHwxNzcxMzIxNTk1fDA&ixlib=rb-4.1.0&q=85"
            alt="Cybersecurity background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0E14] via-[#0B0E14]/80 to-[#0B0E14]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2979FF]/10 border border-[#2979FF]/30 mb-6">
                <Zap className="w-4 h-4 text-[#2979FF]" />
                <span className="text-sm text-[#2979FF]">AI-Powered Security Training</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Train Your Team to
                <span className="text-[#2979FF]"> Defend </span>
                Against Cyber Threats
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-xl">
                Realistic phishing simulations, malicious ad detection, and social engineering scenarios. 
                Build a security-aware workforce with AI-generated training content.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-[#2979FF] hover:bg-[#2962FF] text-white px-8" data-testid="hero-cta-btn">
                    Start Free Trial
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-[#30363D] text-gray-300 hover:bg-white/5">
                  Watch Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-8 mt-12 pt-8 border-t border-[#30363D]">
                <div>
                  <p className="text-3xl font-bold text-white">95%</p>
                  <p className="text-sm text-gray-500">Detection Rate</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">10k+</p>
                  <p className="text-sm text-gray-500">Users Trained</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">500+</p>
                  <p className="text-sm text-gray-500">Organizations</p>
                </div>
              </div>
            </div>
            
            <div className="relative hidden lg:block animate-slide-up stagger-2">
              <div className="absolute -inset-4 bg-[#2979FF]/20 blur-3xl rounded-full" />
              <div className="relative bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-2xl">
                {/* Simulated email preview */}
                <div className="email-container">
                  <div className="email-header flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-[#FF3B30]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Suspicious Email Detected</p>
                        <p className="text-xs text-gray-500">security@amaz0n-support.com</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs bg-[#FF3B30]/20 text-[#FF3B30] rounded">THREAT</span>
                  </div>
                  <div className="email-body text-gray-300">
                    <p className="text-sm">URGENT: Your account has been compromised. Click here to verify...</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-[#00E676]/10 border border-[#00E676]/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-[#00E676]" />
                    <span className="text-sm font-medium text-[#00E676]">Correctly Identified!</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Great job! You spotted the misspelled domain and urgency tactics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#0B0E14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Comprehensive Security Training
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Three powerful modules designed to build real-world cybersecurity awareness
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Phishing Module */}
            <div className="group bg-[#161B22] border border-[#30363D] rounded-xl p-8 card-hover" data-testid="feature-phishing">
              <div className="w-14 h-14 rounded-xl bg-[#2979FF]/10 flex items-center justify-center mb-6 group-hover:bg-[#2979FF]/20 transition-colors">
                <Mail className="w-7 h-7 text-[#2979FF]" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Phishing Email Detection
              </h3>
              <p className="text-gray-400 mb-6">
                Learn to identify suspicious emails, fraudulent sender addresses, and malicious links through realistic simulations.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2979FF]" />
                  Spoofed domain recognition
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2979FF]" />
                  Urgency tactic awareness
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2979FF]" />
                  Link verification skills
                </li>
              </ul>
            </div>
            
            {/* Malicious Ads Module */}
            <div className="group bg-[#161B22] border border-[#30363D] rounded-xl p-8 card-hover" data-testid="feature-ads">
              <div className="w-14 h-14 rounded-xl bg-[#FFB300]/10 flex items-center justify-center mb-6 group-hover:bg-[#FFB300]/20 transition-colors">
                <MousePointerClick className="w-7 h-7 text-[#FFB300]" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Malicious Ad Recognition
              </h3>
              <p className="text-gray-400 mb-6">
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
            <div className="group bg-[#161B22] border border-[#30363D] rounded-xl p-8 card-hover" data-testid="feature-social">
              <div className="w-14 h-14 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center mb-6 group-hover:bg-[#FF3B30]/20 transition-colors">
                <Users className="w-7 h-7 text-[#FF3B30]" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Social Engineering Defense
              </h3>
              <p className="text-gray-400 mb-6">
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
      <section className="py-24 bg-[#161B22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Enterprise-Ready Platform
              </h2>
              <p className="text-gray-400 mb-8">
                Manage multiple organizations, track progress, and deploy targeted campaigns with our comprehensive admin dashboard.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#2979FF]/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-[#2979FF]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Targeted Campaigns</h4>
                    <p className="text-sm text-gray-400">Create custom training campaigns for specific teams or departments.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#00E676]/10 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-[#00E676]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Real-Time Analytics</h4>
                    <p className="text-sm text-gray-400">Track completion rates, scores, and identify knowledge gaps.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#FFB300]/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-[#FFB300]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">AI-Generated Content</h4>
                    <p className="text-sm text-gray-400">Fresh, realistic scenarios powered by GPT-5.2 for continuous learning.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#2979FF]/20 to-[#00E676]/20 blur-3xl rounded-full" />
              <img 
                src="https://images.unsplash.com/photo-1639503547276-90230c4a4198?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwxfHxjeWJlcnNlY3VyaXR5JTIwbmV0d29yayUyMHNoaWVsZCUyMGRpZ2l0YWwlMjBkZWZlbnNlJTIwYWJzdHJhY3R8ZW58MHx8fHwxNzcxMzIxNTk1fDA&ixlib=rb-4.1.0&q=85"
                alt="Security concept"
                className="relative rounded-xl border border-[#30363D] shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#0B0E14]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Ready to Strengthen Your Security?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join hundreds of organizations already using VasilisNetShield to build a security-conscious workforce.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-[#2979FF] hover:bg-[#2962FF] text-white px-12" data-testid="cta-start-btn">
              Start Training Today
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#161B22] border-t border-[#30363D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2979FF] to-[#00E676] flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>VasilisNetShield</span>
            </div>
            <p className="text-sm text-gray-500">
              2024 VasilisNetShield. Enterprise Cybersecurity Training.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
