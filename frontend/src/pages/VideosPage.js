import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Loader2, Shield, Play, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/content/videos`),
      axios.get(`${API}/settings/branding`)
    ]).then(([videosRes, brandingRes]) => {
      setVideos(videosRes.data.videos || []);
      setBranding(brandingRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
            <Link to="/about" className="text-gray-400 hover:text-[#E8DDB5]">About</Link>
            <Link to="/auth">
              <Button className="bg-[#D4A836] hover:bg-[#C49A30] text-black">Login</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-[#E8DDB5] mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Videos
        </h1>
        <p className="text-gray-400 mb-8">Training videos and security awareness content</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : videos.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No videos yet. Check back soon!</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <div 
                key={video.video_id} 
                className="bg-[#0f0f15] border border-[#D4A836]/20 rounded-xl overflow-hidden hover:border-[#D4A836]/50 transition-colors cursor-pointer"
                onClick={() => setActiveVideo(video)}
              >
                <div className="aspect-video bg-black relative group">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-[#D4A836] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-black ml-1" fill="black" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-[#E8DDB5] font-medium mb-1">{video.title}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setActiveVideo(null)}>
          <div className="relative w-full max-w-5xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-[#D4A836]"
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
            <h3 className="text-[#E8DDB5] text-xl font-medium mt-4">{activeVideo.title}</h3>
            <p className="text-gray-400 mt-2">{activeVideo.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
