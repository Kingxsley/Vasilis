import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { ArrowRight, ExternalLink } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DynamicSidebar = ({ page, branding }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const primaryColor = branding?.primary_color || '#D4A836';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const textColor = branding?.text_color || '#E8DDB5';
  const accentColor = branding?.accent_color || '#D4A836';

  useEffect(() => {
    axios.get(`${API}/sidebar/${page}`)
      .then(res => setConfig(res.data))
      .catch(() => setConfig({ enabled: false, sections: [] }))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading || !config?.enabled || !config?.sections?.length) {
    return null;
  }

  const renderSection = (section, index) => {
    switch (section.section_type) {
      case 'cta':
        return (
          <div 
            key={index}
            className="bg-[#0f0f15] border rounded-xl p-6"
            style={{ borderColor: `${primaryColor}33` }}
          >
            {section.title && (
              <h3 className="text-lg font-semibold mb-3" style={{ color: headingColor }}>
                {section.title}
              </h3>
            )}
            {section.description && (
              <p className="text-sm mb-4" style={{ color: textColor, opacity: 0.7 }}>
                {section.description}
              </p>
            )}
            {section.button_text && section.button_url && (
              section.button_url.startsWith('http') ? (
                <a href={section.button_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full text-black" style={{ backgroundColor: primaryColor }}>
                    {section.button_text}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              ) : (
                <Link to={section.button_url}>
                  <Button className="w-full text-black" style={{ backgroundColor: primaryColor }}>
                    {section.button_text}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )
            )}
          </div>
        );

      case 'links':
        return (
          <div 
            key={index}
            className="bg-[#0f0f15] border rounded-xl p-6"
            style={{ borderColor: `${primaryColor}33` }}
          >
            {section.title && (
              <h3 className="text-lg font-semibold mb-4" style={{ color: headingColor }}>
                {section.title}
              </h3>
            )}
            <div className="space-y-2">
              {(section.links || []).map((link, linkIndex) => (
                link.is_external ? (
                  <a
                    key={linkIndex}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:underline"
                    style={{ color: accentColor }}
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link 
                    key={linkIndex}
                    to={link.url} 
                    className="block text-sm hover:underline"
                    style={{ color: accentColor }}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        );

      case 'image':
        if (!section.image_url) return null;
        return (
          <div key={index} className="rounded-xl overflow-hidden">
            <img 
              src={section.image_url} 
              alt={section.image_alt || 'Sidebar image'} 
              className="w-full h-auto"
            />
          </div>
        );

      case 'html':
        return (
          <div 
            key={index}
            className="bg-[#0f0f15] border rounded-xl p-6"
            style={{ borderColor: `${primaryColor}33` }}
          >
            {section.title && (
              <h3 className="text-lg font-semibold mb-3" style={{ color: headingColor }}>
                {section.title}
              </h3>
            )}
            {section.html_content && (
              <div 
                className="prose prose-invert prose-sm max-w-none"
                style={{ color: textColor }}
                dangerouslySetInnerHTML={{ __html: section.html_content }}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Sort sections by order
  const sortedSections = [...config.sections].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6">
      {sortedSections.map((section, index) => renderSection(section, index))}
    </div>
  );
};

export default DynamicSidebar;
