import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calendar, User, Tag, Loader2, Shield } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Shared Logo component
const Logo = ({ branding }) => (
  <Link to="/" className="flex items-center gap-2">
    {branding?.logo_url ? (
      <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
    ) : (
      <Shield className="w-8 h-8 text-[#D4A836]" />
    )}
    <span className="text-xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
      {branding?.company_name || 'VasilisNetShield'}
    </span>
  </Link>
);

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

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#D4A836]/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Logo branding={branding} />
          <nav className="flex items-center gap-6">
            <Link to="/videos" className="text-gray-400 hover:text-[#E8DDB5]">Videos</Link>
            <Link to="/about" className="text-gray-400 hover:text-[#E8DDB5]">About</Link>
            <Link to="/auth">
              <Button className="bg-[#D4A836] hover:bg-[#C49A30] text-black">Login</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-[#E8DDB5] mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Blog
        </h1>
        <p className="text-gray-400 mb-8">Insights and updates on cybersecurity training</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No blog posts yet. Check back soon!</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.post_id} to={`/blog/${post.slug}`} 
                className="group bg-[#0f0f15] border border-[#D4A836]/20 rounded-xl overflow-hidden hover:border-[#D4A836]/50 transition-colors">
                {post.featured_image && (
                  <div className="aspect-video bg-[#1a1a24]">
                    <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.created_at).toLocaleDateString()}
                    <span className="mx-2">•</span>
                    <User className="w-3 h-3" />
                    {post.author_name}
                  </div>
                  <h2 className="text-xl font-bold text-[#E8DDB5] group-hover:text-[#D4A836] transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-400 text-sm line-clamp-2">{post.excerpt}</p>
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} className="bg-[#D4A836]/10 text-[#D4A836]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
        <h1 className="text-2xl text-[#E8DDB5] mb-4">Post not found</h1>
        <Link to="/blog"><Button className="bg-[#D4A836] text-black">Back to Blog</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#D4A836]/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Logo branding={branding} />
          <nav className="flex items-center gap-6">
            <Link to="/blog" className="text-gray-400 hover:text-[#E8DDB5]">Blog</Link>
            <Link to="/videos" className="text-gray-400 hover:text-[#E8DDB5]">Videos</Link>
            <Link to="/about" className="text-gray-400 hover:text-[#E8DDB5]">About</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/blog" className="flex items-center gap-2 text-gray-400 hover:text-[#E8DDB5] mb-8">
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

        <h1 className="text-4xl font-bold text-[#E8DDB5] mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {post.title}
        </h1>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <Badge key={tag} className="bg-[#D4A836]/10 text-[#D4A836]">
                <Tag className="w-3 h-3 mr-1" />{tag}
              </Badge>
            ))}
          </div>
        )}

        <div 
          className="prose prose-invert prose-lg max-w-none text-gray-300"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </main>
    </div>
  );
}
