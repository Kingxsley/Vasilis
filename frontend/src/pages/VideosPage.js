import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Play, X, Search } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { PublicPagination } from '../components/common/Pagination';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VideosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  
  // Pagination state from URL params
  const page = parseInt(searchParams.get('page')) || 1;
  const pageSize = parseInt(searchParams.get('limit')) || 10;
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      let url = `${API}/content/videos?skip=${skip}&limit=${pageSize}`;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      const [videosRes, brandingRes] = await Promise.all([
        axios.get(url),
        axios.get(`${API}/settings/branding`)
      ]);
      
      setVideos(videosRes.data.videos || []);
      setTotal(videosRes.data.total || videosRes.data.videos?.length || 0);
      setBranding(brandingRes.data);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

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

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
              Videos
            </h1>
            <p style={{ color: textColor, opacity: 0.7 }}>Training videos and security awareness content</p>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search videos..."
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
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? `No videos found for "${searchQuery}"` : 'No videos yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <div 
                  key={video.video_id} 
                  className="bg-[#0f0f15] border rounded-xl overflow-hidden hover:opacity-90 transition-all cursor-pointer"
                  style={{ borderColor: `${primaryColor}33` }}
                  onClick={() => setActiveVideo(video)}
                >
                  <div className="aspect-video bg-black relative group">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: primaryColor }}>
                        <Play className="w-8 h-8 text-black ml-1" fill="black" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium mb-1" style={{ color: headingColor }}>{video.title}</h3>
                    <p className="text-sm line-clamp-2" style={{ color: textColor, opacity: 0.6 }}>{video.description}</p>
                  </div>
                </div>
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
      </main>

      {/* Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setActiveVideo(null)}>
          <div className="relative w-full max-w-5xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute -top-12 right-0 text-white hover:opacity-80"
              style={{ color: primaryColor }}
            >
              <X className="w-8 h-8" />
            </button>
            <div className="aspect-video">
              <iframe
                src={`${activeVideo.youtube_url}?autoplay=1`}
                title={activeVideo.title}
                className="w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <h3 className="text-xl font-medium mt-4" style={{ color: textColor }}>{activeVideo.title}</h3>
            <p className="text-gray-400 mt-2">{activeVideo.description}</p>
          </div>
        </div>
      )}

      <PublicFooter branding={branding} />
    </div>
  );
}
