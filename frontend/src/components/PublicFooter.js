import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';

// Shared footer component for all public pages
export const PublicFooter = ({ branding }) => {
  const primaryColor = branding?.primary_color || '#D4A836';
  const companyName = branding?.company_name || 'Vasilis NetShield';

  return (
    <footer className="py-12 border-t" style={{ borderColor: `${primaryColor}20` }}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Company Name */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-8 h-8">
                <defs>
                  <linearGradient id="footerShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4A836" />
                    <stop offset="100%" stopColor="#C49A30" />
                  </linearGradient>
                </defs>
                <path 
                  d="M50 5 L90 20 L90 50 C90 75 70 90 50 95 C30 90 10 75 10 50 L10 20 Z" 
                  fill="url(#footerShieldGrad)" 
                />
                <rect x="38" y="42" width="24" height="20" rx="3" fill="#0a0a0f" opacity="0.9" />
                <path d="M42 42 L42 35 C42 30 46 26 50 26 C54 26 58 30 58 35 L58 42" 
                      stroke="#0a0a0f" strokeWidth="4" fill="none" opacity="0.9" />
                <circle cx="50" cy="52" r="3" fill="#D4A836" />
                <rect x="49" y="52" width="2" height="6" fill="#D4A836" />
              </svg>
            )}
            <span className="text-xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {companyName}
            </span>
          </Link>
          
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
          
          {/* Copyright */}
          <p className="text-sm text-gray-500">
            {branding?.footer_copyright || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
};
