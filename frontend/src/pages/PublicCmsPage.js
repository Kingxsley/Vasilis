import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { sanitizeHtml } from '../utils/sanitize';
import { Loader2, AlertTriangle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * PublicCmsPage - Renders CMS pages marked as "public" visibility.
 * No authentication required. SEO-friendly with meta tags.
 */
export default function PublicCmsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPage();
    fetchBranding();
  }, [slug]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/cms-tiles/public/page/${slug}`);
      setPage(res.data);
      
      // Set SEO meta tags
      if (res.data.meta_title || res.data.name) {
        document.title = res.data.meta_title || res.data.name;
      }
      if (res.data.meta_description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          document.head.appendChild(metaDesc);
        }
        metaDesc.content = res.data.meta_description;
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Page not found');
      } else {
        setError('Failed to load page');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBranding = async () => {
    try {
      const res = await axios.get(`${API}/settings/branding`);
      setBranding(res.data);
    } catch (e) { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
      </div>
    );
  }

  if (error || !page) {
    return null; // Will be handled by DynamicRouteHandler
  }

  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <PublicNav />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Page Title */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
          {page.name}
        </h1>
        {page.description && (
          <p className="text-lg mb-8" style={{ color: `${textColor}99` }}>{page.description}</p>
        )}

        {/* Render blocks if available */}
        {page.blocks && page.blocks.length > 0 ? (
          <div className="space-y-6">
            {page.blocks.map((block, idx) => (
              <PublicBlockRenderer key={idx} block={block} branding={branding} />
            ))}
          </div>
        ) : page.custom_content ? (
          <div 
            className="prose prose-invert max-w-none"
            style={{ color: textColor }}
            dangerouslySetInnerHTML={createSafeMarkup(sanitizeHtml(page.custom_content))}
          />
        ) : (
          <p className="text-gray-500 text-center py-12">This page has no content yet.</p>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

// Simple block renderer for public pages
function PublicBlockRenderer({ block, branding }) {
  const { type, content } = block;
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';

  switch (type) {
    case 'heading': {
      const HeadingTag = content.level || 'h2';
      const sizes = { h1: 'text-4xl font-bold', h2: 'text-3xl font-bold', h3: 'text-2xl font-semibold', h4: 'text-xl font-semibold' };
      return (
        <HeadingTag className={`${sizes[HeadingTag] || sizes.h2} ${content.align === 'center' ? 'text-center' : ''} mb-4`} style={{ color: headingColor }}>
          {content.text}
        </HeadingTag>
      );
    }
    case 'text':
      return (
        <div className="prose prose-invert max-w-none mb-4" style={{ color: textColor }} dangerouslySetInnerHTML={createSafeMarkup(sanitizeHtml(content.html))} />
      );
    case 'image':
      return (
        <figure className="mb-4">
          <img src={content.url} alt={content.alt || ''} className="w-full rounded-lg" loading="lazy" />
          {content.caption && <figcaption className="text-center text-sm text-gray-400 mt-2">{content.caption}</figcaption>}
        </figure>
      );
    case 'divider':
      return <hr className="border-[#30363D] my-6" />;
    default:
      return null;
  }
}
