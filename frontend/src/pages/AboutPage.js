import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Loader2, Shield, Target, Eye } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AboutPage() {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/content/about`),
      axios.get(`${API}/settings/branding`)
    ]).then(([aboutRes, brandingRes]) => {
      setAbout(aboutRes.data);
      setBranding(brandingRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#D4A836]/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Shield className="w-8 h-8 text-[#D4A836]" />
            )}
            <span className="text-xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {branding?.company_name || 'Vasilis NetShield'}
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/blog" className="text-gray-400 hover:text-[#E8DDB5]">Blog</Link>
            <Link to="/videos" className="text-gray-400 hover:text-[#E8DDB5]">Videos</Link>
            <Link to="/auth">
              <Button className="bg-[#D4A836] hover:bg-[#C49A30] text-black">Login</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold text-[#E8DDB5] mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {about?.title || 'About Us'}
          </h1>
          <p className="text-xl text-gray-400">
            {branding?.tagline || 'Human + AI Powered Security Training'}
          </p>
        </div>

        {/* Main Content */}
        {about?.content && (
          <div className="max-w-4xl mx-auto mb-16">
            <div 
              className="prose prose-invert prose-lg max-w-none text-gray-300"
              dangerouslySetInnerHTML={{ __html: about.content }}
            />
          </div>
        )}

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {about?.mission && (
            <div className="bg-[#0f0f15] border border-[#D4A836]/20 rounded-xl p-8">
              <div className="w-12 h-12 rounded-full bg-[#D4A836]/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-[#D4A836]" />
              </div>
              <h2 className="text-2xl font-bold text-[#E8DDB5] mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Our Mission
              </h2>
              <p className="text-gray-400">{about.mission}</p>
            </div>
          )}

          {about?.vision && (
            <div className="bg-[#0f0f15] border border-[#D4A836]/20 rounded-xl p-8">
              <div className="w-12 h-12 rounded-full bg-[#D4A836]/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-[#D4A836]" />
              </div>
              <h2 className="text-2xl font-bold text-[#E8DDB5] mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Our Vision
              </h2>
              <p className="text-gray-400">{about.vision}</p>
            </div>
          )}
        </div>

        {/* Team Members */}
        {about?.team_members && about.team_members.length > 0 && (
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-[#E8DDB5] text-center mb-8" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Our Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {about.team_members.map((member, index) => (
                <div key={index} className="bg-[#0f0f15] border border-[#D4A836]/20 rounded-xl p-6 text-center">
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-[#D4A836]/20 flex items-center justify-center">
                      <span className="text-3xl text-[#D4A836]">{member.name.charAt(0)}</span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-[#E8DDB5]">{member.name}</h3>
                  <p className="text-[#D4A836] text-sm mb-2">{member.role}</p>
                  {member.bio && <p className="text-gray-400 text-sm">{member.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#E8DDB5] mb-4">Ready to strengthen your security?</h2>
          <Link to="/auth">
            <Button className="bg-[#D4A836] hover:bg-[#C49A30] text-black px-8 py-6 text-lg">
              Get Started Today
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D4A836]/10 mt-16 py-8">
        <div className="container mx-auto px-6 text-center text-gray-500">
          © {new Date().getFullYear()} {branding?.company_name || 'Vasilis NetShield'}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
