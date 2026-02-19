import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calendar, User, Tag, Loader2 } from 'lucide-react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { DynamicSidebar } from '../components/DynamicSidebar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Blog List Page
export function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/content/blog`),
      axios.get(`${API}/settings/branding`)
    ]).then(([postsRes, brandingRes]) => {
      setPosts(postsRes.data.posts || []);
      setBranding(brandingRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Dynamic colors
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 flex-1">
        <h1 className="text-4xl font-bold mb-2" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
          Blog
        </h1>
        <p className="mb-8" style={{ color: textColor, opacity: 0.7 }}>Insights and updates on cybersecurity training</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Blog Grid */}
            <div className="lg:col-span-2">
              {posts.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No blog posts yet. Check back soon!</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {posts.map((post) => (
                    <Link 
                      key={post.post_id} 
                      to={`/blog/${post.slug}`} 
                      className="group bg-[#0f0f15] border rounded-xl overflow-hidden hover:border-opacity-80 transition-all"
                      style={{ borderColor: `${primaryColor}33` }}
                    >
                      {post.featured_image && (
                        <div className="aspect-video bg-[#1a1a24]">
                          <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.created_at).toLocaleDateString()}
                          <span className="mx-1">•</span>
                          <User className="w-3 h-3" />
                          {post.author_name}
                        </div>
                        <h2 
                          className="text-lg font-bold transition-colors mb-2" 
                          style={{ color: headingColor }}
                        >
                          {post.title}
                        </h2>
                        <p 
                          className="text-sm line-clamp-2" 
                          style={{ color: textColor, opacity: 0.7 }}
                        >
                          {post.excerpt}
                        </p>
                        {post.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} className="text-xs" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <DynamicSidebar page="blog" branding={branding} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <PublicFooter branding={branding} />
    </div>
  );
}

// Blog Post Detail Page
export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/content/blog/${slug}`),
      axios.get(`${API}/settings/branding`)
    ]).then(([postRes, brandingRes]) => {
      setPost(postRes.data);
      setBranding(brandingRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  // Dynamic colors
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
        <h1 className="text-2xl mb-4" style={{ color: textColor }}>Post not found</h1>
        <Link to="/blog"><Button className="text-black" style={{ backgroundColor: primaryColor }}>Back to Blog</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 max-w-4xl flex-1">
        <Link to="/blog" className="flex items-center gap-2 mb-8 hover:opacity-80" style={{ color: textColor }}>
          <ArrowLeft className="w-4 h-4" />Back to Blog
        </Link>

        {post.featured_image && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(post.created_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><User className="w-4 h-4" />{post.author_name}</span>
        </div>

        <h1 className="text-4xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
          {post.title}
        </h1>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <Badge key={tag} style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                <Tag className="w-3 h-3 mr-1" />{tag}
              </Badge>
            ))}
          </div>
        )}

        <div 
          className="prose prose-invert prose-lg max-w-none"
          style={{ color: textColor }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </main>

      {/* Footer */}
      <PublicFooter branding={branding} />
    </div>
  );
}
