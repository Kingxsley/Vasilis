import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { sanitizeHTML } from '../utils/sanitize';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ArrowLeft, Calendar, User, Tag, Loader2, Search } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { DynamicSidebar } from '../components/layout/DynamicSidebar';
import { PublicPagination } from '../components/common/Pagination';
import { PageBuilderBlocks, SidebarWidgets, usePageBuilderOverride } from '../components/PageBuilderRenderer';
import '../styles/blog-optimized.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Blog List Page
export function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState(null);
  
  // Pagination state from URL params
  const page = parseInt(searchParams.get('page')) || 1;
  const pageSize = parseInt(searchParams.get('limit')) || 15;
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      let url = `${API}/content/blog?skip=${skip}&limit=${pageSize}`;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      const [postsRes, brandingRes] = await Promise.all([
        axios.get(url),
        axios.get(`${API}/settings/branding`)
      ]);
      
      setPosts(postsRes.data.posts || []);
      setTotal(postsRes.data.total || postsRes.data.posts?.length || 0);
      setBranding(brandingRes.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
    updateParams({ limit: newSize !== 15 ? newSize : null, page: null });
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

  // PageBuilder override — if an admin created a custom_page with slug "blog"
  // and published it with blocks, render those blocks instead of the default
  // blog listing. This lets admins fully customize the /blog page.
  const { override, sidebar, loading: overrideLoading } = usePageBuilderOverride('blog');

  if (overrideLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (override) {
    // If the override already starts with a hero/heading block, skip the
    // outer duplicate title so admins fully control the page header.
    const firstBlock = override.blocks?.[0]?.type;
    const showOuterTitle = !['hero', 'heading'].includes(firstBlock);
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <PublicNav branding={branding} />
        <main className="container mx-auto px-4 sm:px-6 py-12 flex-1 max-w-6xl overflow-hidden">
          {showOuterTitle && (
            <h1 className="text-3xl md:text-4xl font-bold text-[#E8DDB5] mb-8 text-center">
              {override.title}
            </h1>
          )}
          {sidebar && sidebar.widgets && sidebar.widgets.length > 0 ? (
            <div className="grid lg:grid-cols-[1fr_320px] gap-8">
              <div><PageBuilderBlocks blocks={override.blocks} /></div>
              <SidebarWidgets sidebar={sidebar} />
            </div>
          ) : (
            <PageBuilderBlocks blocks={override.blocks} />
          )}
        </main>
        <PublicFooter branding={branding} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col overflow-x-hidden">
      <PublicNav branding={branding} />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex-1 overflow-x-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
              Blog
            </h1>
            <p style={{ color: textColor, opacity: 0.7 }}>Insights and updates on cybersecurity training</p>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search posts..."
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
          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-8 items-start overflow-x-hidden">
            {/* Main Blog Grid */}
            <div className="min-w-0 overflow-hidden">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {searchQuery ? `No posts found for "${searchQuery}"` : 'No blog posts yet. Check back soon!'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {posts.map((post) => (
                      <Link 
                        key={post.post_id} 
                        to={`/blog/${post.slug}`} 
                        className="group bg-[#0f0f15] border rounded-xl overflow-hidden hover:border-opacity-80 transition-all flex flex-col min-w-0 max-w-full"
                        style={{ borderColor: `${primaryColor}33`, wordBreak: 'break-word' }}
                      >
                        {post.featured_image && (
                          <div className="aspect-video bg-[#1a1a24] shrink-0 overflow-hidden">
                            <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-5 flex flex-col flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span className="shrink-0">{new Date(post.created_at).toLocaleDateString()}</span>
                            <span className="mx-1 shrink-0">•</span>
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{post.author_name}</span>
                          </div>
                          <h2 
                            className="text-base font-bold transition-colors mb-2 line-clamp-2 overflow-hidden" 
                            style={{ color: headingColor, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          >
                            {post.title}
                          </h2>
                          <p 
                            className="text-sm line-clamp-3 flex-1 overflow-hidden" 
                            style={{ color: textColor, opacity: 0.7, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          >
                            {post.excerpt}
                          </p>
                          {post.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {post.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} className="text-xs truncate max-w-[120px]" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination - always show selector, show page controls when needed */}
                  <PublicPagination
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    pageSizeOptions={[5, 10, 15, 25, 50]}
                    accentColor={primaryColor}
                    className="mt-8 border-t border-[#2a2a34] pt-6"
                  />
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <DynamicSidebar page="blog" branding={branding} />
            </div>
          </div>
        )}
      </main>

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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col overflow-x-hidden">
      <PublicNav branding={branding} />

      <article className="blog-post-article" style={{overflowX:"hidden",maxWidth:"768px",marginLeft:"auto",marginRight:"auto",width:"100%",boxSizing:"border-box"}}>
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
          className="blog-article-content"
          style={{overflowX:"hidden",wordBreak:"break-word",overflowWrap:"break-word"}}
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }}
        />
      </article>

      <PublicFooter branding={branding} />
    </div>
  );
}
