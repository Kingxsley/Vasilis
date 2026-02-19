import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Badge } from '../components/ui/badge';
import { Loader2, ExternalLink, Calendar, Rss } from 'lucide-react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { DynamicSidebar } from '../components/DynamicSidebar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);
  const [sidebarContent, setSidebarContent] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/content/news?include_rss=true`),
      axios.get(`${API}/settings/branding`),
      axios.get(`${API}/content/sidebar/news`).catch(() => ({ data: null }))
    ]).then(([newsRes, brandingRes, sidebarRes]) => {
      setNews(newsRes.data.news || []);
      setBranding(brandingRes.data);
      setSidebarContent(sidebarRes.data);
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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 flex-1">
        <h1 className="text-4xl font-bold mb-2" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
          News
        </h1>
        <p className="mb-8" style={{ color: textColor, opacity: 0.7 }}>Latest updates and cybersecurity news</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main News Column */}
            <div className="lg:col-span-2 space-y-4">
              {news.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No news yet. Check back soon!</p>
              ) : (
                news.map((item) => (
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
                ))
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Custom Sidebar Image */}
              {sidebarContent?.image_url && (
                <div className="rounded-xl overflow-hidden">
                  <img 
                    src={sidebarContent.image_url} 
                    alt={sidebarContent.image_alt || 'Sidebar image'} 
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* Custom Sidebar Content */}
              {sidebarContent?.content && (
                <div 
                  className="bg-[#0f0f15] border rounded-xl p-6"
                  style={{ borderColor: `${primaryColor}33` }}
                >
                  {sidebarContent.title && (
                    <h3 className="text-lg font-semibold mb-3" style={{ color: headingColor }}>
                      {sidebarContent.title}
                    </h3>
                  )}
                  <div 
                    className="text-sm prose prose-invert"
                    style={{ color: textColor, opacity: 0.8 }}
                    dangerouslySetInnerHTML={{ __html: sidebarContent.content }}
                  />
                </div>
              )}

              {/* Default CTA if no sidebar content */}
              {!sidebarContent?.content && !sidebarContent?.image_url && (
                <>
                  {/* Newsletter/CTA Card */}
                  <div 
                    className="bg-[#0f0f15] border rounded-xl p-6"
                    style={{ borderColor: `${primaryColor}33` }}
                  >
                    <h3 className="text-lg font-semibold mb-3" style={{ color: headingColor }}>
                      Stay Protected
                    </h3>
                    <p className="text-sm mb-4" style={{ color: textColor, opacity: 0.7 }}>
                      Get trained to identify cyber threats before they impact your organization.
                    </p>
                    <Link to="/auth">
                      <Button 
                        className="w-full text-black" 
                        style={{ backgroundColor: primaryColor }}
                      >
                        Start Training
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  {/* Quick Links */}
                  <div 
                    className="bg-[#0f0f15] border rounded-xl p-6"
                    style={{ borderColor: `${primaryColor}33` }}
                  >
                    <h3 className="text-lg font-semibold mb-4" style={{ color: headingColor }}>
                      Quick Links
                    </h3>
                    <div className="space-y-2">
                      <Link 
                        to="/blog" 
                        className="block text-sm hover:underline"
                        style={{ color: accentColor }}
                      >
                        Read our Blog
                      </Link>
                      <Link 
                        to="/videos" 
                        className="block text-sm hover:underline"
                        style={{ color: accentColor }}
                      >
                        Watch Training Videos
                      </Link>
                      <Link 
                        to="/about" 
                        className="block text-sm hover:underline"
                        style={{ color: accentColor }}
                      >
                        About Us
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <PublicFooter branding={branding} />
    </div>
  );
}
