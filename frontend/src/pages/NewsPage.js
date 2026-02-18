import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, ExternalLink, Calendar, Rss } from 'lucide-react';
import { PublicNav } from '../components/PublicNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/content/news?include_rss=true`),
      axios.get(`${API}/settings/branding`)
    ]).then(([newsRes, brandingRes]) => {
      setNews(newsRes.data.news || []);
      setBranding(brandingRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Dynamic colors
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
          News
        </h1>
        <p className="mb-8" style={{ color: textColor, opacity: 0.7 }}>Latest updates and cybersecurity news</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : news.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No news yet. Check back soon!</p>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {news.map((item) => (
              <article 
                key={item.news_id}
                className="bg-[#0f0f15] border rounded-xl p-6 hover:border-opacity-80 transition-all"
                style={{ borderColor: `${primaryColor}33` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.source === 'rss' && (
                        <Badge variant="outline" className="text-xs" style={{ borderColor: accentColor, color: accentColor }}>
                          <Rss className="w-3 h-3 mr-1" /> RSS
                        </Badge>
                      )}
                      <span className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-semibold mb-2" style={{ color: headingColor }}>
                      {item.title}
                    </h2>
                    
                    {item.content && (
                      <p className="text-sm line-clamp-3 mb-3" style={{ color: textColor, opacity: 0.7 }}>
                        {item.content}
                      </p>
                    )}
                    
                    {item.link && (
                      <a 
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm hover:underline"
                        style={{ color: accentColor }}
                      >
                        Read more <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: `${primaryColor}15` }}>
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-gray-500">
            {branding?.company_name || 'Vasilis NetShield'} - Enterprise Cybersecurity Training
          </p>
        </div>
      </footer>
    </div>
  );
}
