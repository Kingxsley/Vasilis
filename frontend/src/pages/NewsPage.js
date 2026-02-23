import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, ExternalLink, Calendar, Rss, Search } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { DynamicSidebar } from '../components/layout/DynamicSidebar';
import { PublicPagination } from '../components/common/Pagination';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [news, setNews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);
  
  // Pagination state from URL params
  const page = parseInt(searchParams.get('page')) || 1;
  const pageSize = parseInt(searchParams.get('limit')) || 10;
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      let url = `${API}/content/news?include_rss=true&skip=${skip}&limit=${pageSize}`;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      const [newsRes, brandingRes] = await Promise.all([
        axios.get(url),
        axios.get(`${API}/settings/branding`)
      ]);
      
      setNews(newsRes.data.news || []);
      setTotal(newsRes.data.total || newsRes.data.news?.length || 0);
      setBranding(brandingRes.data);
    } catch (err) {
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Update URL params
  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage > 1 ? newPage : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize) => {
    updateParams({ limit: newSize !== 10 ? newSize : null, page: null });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams({ q: searchInput || null, page: null });
  };

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
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
              News
            </h1>
            <p style={{ color: textColor, opacity: 0.7 }}>Latest updates and cybersecurity news</p>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search news..."
                className="pl-10 w-64 bg-[#0f0f15] border-[#2a2a34] focus:border-opacity-50"
                style={{ borderColor: `${primaryColor}33` }}
              />
            </div>
            <Button 
              type="submit"
              className="text-black"
              style={{ backgroundColor: primaryColor }}
            >
              Search
            </Button>
          </form>
        </div>

        {searchQuery && (
          <div className="mb-6 flex items-center gap-2">
            <span style={{ color: textColor, opacity: 0.7 }}>Results for:</span>
            <Badge style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
              "{searchQuery}"
            </Badge>
            <button
              onClick={() => {
                setSearchInput('');
                updateParams({ q: null, page: null });
              }}
              className="text-sm hover:underline"
              style={{ color: accentColor }}
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main News Column */}
            <div className="lg:col-span-2">
              {news.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {searchQuery ? `No news found for "${searchQuery}"` : 'No news yet. Check back soon!'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
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

                  {/* Pagination */}
                  {total > pageSize && (
                    <PublicPagination
                      total={total}
                      page={page}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      accentColor={primaryColor}
                      className="mt-8 border-t border-[#2a2a34] pt-6"
                    />
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <DynamicSidebar page="news" branding={branding} />
            </div>
          </div>
        )}
      </main>
      
      <PublicFooter branding={branding} />
    </div>
  );
}
