import React from 'react';
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';

// Shared footer component for all public pages - clean, minimal design
export const PublicFooter = ({ branding }) => {
  const primaryColor = branding?.primary_color || '#D4A836';
  const companyName = branding?.company_name || 'Vasilis NetShield';
  
  const hasSocialLinks = branding?.social_facebook || branding?.social_twitter || 
    branding?.social_linkedin || branding?.social_instagram || branding?.social_youtube;

  return (
    <footer className="py-8 border-t" style={{ borderColor: `${primaryColor}20` }}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright - Left */}
          <p className="text-sm text-gray-500 order-2 sm:order-1">
            {branding?.footer_copyright || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}
          </p>
          
          {/* Social Links - Right */}
          {hasSocialLinks && (
            <div className="flex items-center gap-4 order-1 sm:order-2">
              {branding?.social_facebook && (
                <a href={branding.social_facebook} target="_blank" rel="noopener noreferrer" 
                   className="text-gray-500 hover:text-[#D4A836] transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {branding?.social_twitter && (
                <a href={branding.social_twitter} target="_blank" rel="noopener noreferrer" 
                   className="text-gray-500 hover:text-[#D4A836] transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {branding?.social_linkedin && (
                <a href={branding.social_linkedin} target="_blank" rel="noopener noreferrer" 
                   className="text-gray-500 hover:text-[#D4A836] transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {branding?.social_instagram && (
                <a href={branding.social_instagram} target="_blank" rel="noopener noreferrer" 
                   className="text-gray-500 hover:text-[#D4A836] transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {branding?.social_youtube && (
                <a href={branding.social_youtube} target="_blank" rel="noopener noreferrer" 
                   className="text-gray-500 hover:text-[#D4A836] transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
