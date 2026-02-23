import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Loader2, Target, Eye, Award } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';

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

  // Dynamic colors
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 flex-1">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
            {about?.title || 'About Us'}
          </h1>
          <p className="text-xl" style={{ color: textColor, opacity: 0.8 }}>
            {branding?.tagline || 'Human + AI Powered Security Training'}
          </p>
        </div>

        {/* Main Content */}
        {about?.content && (
          <div className="max-w-4xl mx-auto mb-16">
            <div 
              className="prose prose-invert prose-lg max-w-none"
              style={{ color: textColor }}
              dangerouslySetInnerHTML={{ __html: about.content }}
            />
          </div>
        )}

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {about?.mission && (
            <div className="bg-[#0f0f15] border rounded-xl p-8" style={{ borderColor: `${primaryColor}33` }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                <Target className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                Our Mission
              </h2>
              <p style={{ color: textColor, opacity: 0.8 }}>{about.mission}</p>
            </div>
          )}

          {about?.vision && (
            <div className="bg-[#0f0f15] border rounded-xl p-8" style={{ borderColor: `${primaryColor}33` }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                <Eye className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
                Our Vision
              </h2>
              <p style={{ color: textColor, opacity: 0.8 }}>{about.vision}</p>
            </div>
          )}
        </div>

        {/* Team Members */}
        {about?.team_members && about.team_members.length > 0 && (
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-8" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
              Our Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {about.team_members.map((member, index) => (
                <div key={index} className="bg-[#0f0f15] border rounded-xl p-6 text-center" style={{ borderColor: `${primaryColor}33` }}>
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                      <span className="text-3xl" style={{ color: accentColor }}>{member.name.charAt(0)}</span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold" style={{ color: headingColor }}>{member.name}</h3>
                  <p className="text-sm mb-2" style={{ color: accentColor }}>{member.role}</p>
                  {member.bio && <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>{member.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: headingColor }}>Ready to strengthen your security?</h2>
          <Link to="/auth">
            <Button className="text-black px-8 py-6 text-lg" style={{ backgroundColor: primaryColor }}>
              Get Started Today
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter branding={branding} />
    </div>
  );
}
