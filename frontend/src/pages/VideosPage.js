import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Loader2, Play, X, Film } from 'lucide-react';
import { PublicNav } from '../components/PublicNav';

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

  // Dynamic colors
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const primaryColor = branding?.primary_color || '#D4A836';

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
          Videos
        </h1>
        <p className="mb-8" style={{ color: textColor, opacity: 0.7 }}>Training videos and security awareness content</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : videos.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No videos yet. Check back soon!</p>
        ) : (
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
