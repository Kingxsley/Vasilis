import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Shield, Lock, Key, Calendar, Mail, Check, Loader2, User, Search, Rss, Newspaper, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ---- Block renderers --------------------------------------------------------

const HeadingBlock = ({ content }) => {
  const levelMap = { 1: 'h1', 2: 'h2', 3: 'h3', h1: 'h1', h2: 'h2', h3: 'h3' };
  const Tag = levelMap[content.level] || 'h2';
  const styles = {
    h1: 'text-4xl md:text-5xl font-bold text-[#E8DDB5]',
    h2: 'text-2xl md:text-3xl font-bold text-[#E8DDB5]',
    h3: 'text-xl md:text-2xl font-semibold text-[#E8DDB5]',
  };
  return (
    <Tag className={`${styles[Tag]} mb-4`} style={{ textAlign: content.align || 'left' }}>
      {content.text}
    </Tag>
  );
};

const TextBlock = ({ content }) => (
  <div
    className="text-gray-300 leading-relaxed whitespace-pre-wrap"
    style={{ textAlign: content.align || 'left' }}
  >
    {content.text}
  </div>
);

const ButtonBlock = ({ content }) => {
  const styles = {
    primary: 'bg-[#D4A836] hover:bg-[#C49A30] text-black',
    secondary: 'border border-[#D4A836] text-[#D4A836] hover:bg-[#D4A836]/10',
    ghost: 'text-[#D4A836] hover:text-[#E8DDB5] underline',
  };
  const handleClick = () => {
    if (content.url) {
      if (content.open_new_tab) window.open(content.url, '_blank');
      else window.location.href = content.url;
    }
  };
  return (
    <div className="my-4">
      <Button onClick={handleClick} className={styles[content.style] || styles.primary}>
        {content.text}
      </Button>
    </div>
  );
};

const ImageBlock = ({ content }) => (
  <div className="my-6">
    {content.url && (
      <img src={content.url} alt={content.alt || ''} className="max-w-full h-auto rounded-lg" />
    )}
    {content.caption && (
      <p className="text-gray-500 text-sm mt-2 text-center">{content.caption}</p>
    )}
  </div>
);

const DividerBlock = () => <hr className="border-[#D4A836]/30 my-8" />;

const HeroBlock = ({ content }) => (
  <div
    className="py-16 px-6 rounded-xl text-center mb-8"
    style={{ backgroundColor: content.background_color || '#0f0f15' }}
  >
    <h1 className="text-4xl md:text-5xl font-bold text-[#E8DDB5] mb-4">{content.title}</h1>
    {content.subtitle && (
      <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">{content.subtitle}</p>
    )}
    {content.button_text && (
      <Button
        onClick={() => content.button_url && (window.location.href = content.button_url)}
        className="bg-[#D4A836] hover:bg-[#C49A30] text-black px-8 py-3 text-lg"
      >
        {content.button_text}
      </Button>
    )}
  </div>
);

const ContactFormBlock = ({ content }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/inquiries`, {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        source: 'pagebuilder_contact_form',
      });
      setSubmitted(true);
      toast.success(content.success_message || 'Thank you for your message!');
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="bg-[#0f0f15] border-[#D4A836]/20 max-w-xl mx-auto my-8">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">Message Sent!</h3>
          <p className="text-gray-400">{content.success_message || 'Thank you for your message!'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0f0f15] border-[#D4A836]/20 max-w-xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#D4A836]" />
          {content.title || 'Contact Us'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Your Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-[#1a1a24] border-[#30363D] text-white"
            required
          />
          <Input
            type="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-[#1a1a24] border-[#30363D] text-white"
            required
          />
          <Textarea
            placeholder="Your Message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="bg-[#1a1a24] border-[#30363D] text-white min-h-[120px]"
            required
          />
          <Button type="submit" disabled={submitting} className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : content.submit_text || 'Send Message'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const CardsBlock = ({ content }) => {
  const ICONS = { Shield, Lock, Key };
  const cols = content.columns || 3;
  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[cols] || 'grid-cols-1 md:grid-cols-3';

  return (
    <div className={`grid ${gridClass} gap-6 my-8`}>
      {(content.cards || []).map((card, i) => {
        const IconComponent = ICONS[card.icon] || Shield;
        return (
          <Card key={i} className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-[#D4A836]/20 rounded-lg flex items-center justify-center mb-4">
                <IconComponent className="w-6 h-6 text-[#D4A836]" />
              </div>
              <h3 className="text-lg font-semibold text-[#E8DDB5] mb-2">{card.title}</h3>
              <p className="text-gray-400">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ---- Dynamic list blocks ---------------------------------------------------

const gridColClass = (cols) => ({
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}[cols] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3');

const BlogListBlock = ({ content }) => {
  const {
    items_per_page = 9,
    columns = 3,
    layout = 'grid',
    category_filter = '',
    tag_filter = '',
    sort = 'newest',
    show_date = true,
    show_author = true,
    show_excerpt = true,
    show_search = true,
    featured_first = false,
  } = content || {};

  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const skip = (page - 1) * items_per_page;
  const totalPages = Math.max(1, Math.ceil(total / items_per_page));

  useEffect(() => {
    let cancelled = false;
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          published_only: 'true',
          limit: String(items_per_page),
          skip: String(skip),
          sort,
        });
        if (query) params.set('search', query);
        if (tag_filter) params.set('tag', tag_filter);
        const res = await axios.get(`${API}/content/blog?${params.toString()}`);
        if (cancelled) return;
        let list = res.data.posts || [];
        if (category_filter) {
          list = list.filter((p) => p.category === category_filter);
        }
        if (featured_first) {
          list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        }
        setPosts(list);
        setTotal(res.data.total || list.length);
      } catch (err) {
        if (!cancelled) { setPosts([]); setTotal(0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPosts();
    return () => { cancelled = true; };
  }, [skip, items_per_page, sort, query, tag_filter, category_filter, featured_first]);

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div data-testid="block-blog-list" className="space-y-6">
      {show_search && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search posts..."
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
            className="pl-10 bg-[#1a1a24] border-[#30363D] text-white"
            data-testid="block-blog-search"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div>
      ) : posts.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No posts yet.</p>
      ) : (
        <div className={layout === 'list' ? 'space-y-4' : `grid ${gridColClass(columns)} gap-6`}>
          {posts.map((post) => (
            <Link
              key={post.post_id}
              to={`/blog/${post.slug}`}
              className="block"
              data-testid={`block-blog-card-${post.slug}`}
            >
              <Card className="bg-[#0f0f15] border-[#D4A836]/20 hover:border-[#D4A836]/50 transition-all h-full">
                {post.featured_image && layout === 'grid' && (
                  <div className="aspect-video overflow-hidden rounded-t-lg bg-[#1a1a24]">
                    <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="pt-4 space-y-3">
                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className="border-[#D4A836]/30 text-[#D4A836] text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-[#E8DDB5] line-clamp-2 leading-snug">{post.title}</h3>
                  {show_excerpt && post.excerpt && (
                    <p className="text-sm text-gray-400 line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    {show_date && post.created_at && (
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(post.created_at)}</span>
                    )}
                    {show_author && post.author && (
                      <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4" data-testid="block-blog-pagination">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} className="border-[#D4A836]/30">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400 px-3">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="border-[#D4A836]/30">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const NewsFeedBlock = ({ content }) => {
  const {
    source = 'mixed',
    items_per_page = 9,
    columns = 3,
    category_filter = '',
    tag_filter = '',
    sort = 'newest',
    show_date = true,
    show_author = true,
    show_excerpt = true,
    show_source_badge = true,
  } = content || {};

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const skip = (page - 1) * items_per_page;
  const totalPages = Math.max(1, Math.ceil(total / items_per_page));

  useEffect(() => {
    let cancelled = false;
    const fetchItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          source,
          limit: String(items_per_page),
          skip: String(skip),
          sort,
        });
        if (category_filter) params.set('category', category_filter);
        if (tag_filter) params.set('tag', tag_filter);
        const res = await axios.get(`${API}/news/mixed-feed?${params.toString()}`);
        if (cancelled) return;
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        if (!cancelled) { setItems([]); setTotal(0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchItems();
    return () => { cancelled = true; };
  }, [skip, items_per_page, sort, source, category_filter, tag_filter]);

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div data-testid="block-news-feed" className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No news yet.</p>
      ) : (
        <div className={`grid ${gridColClass(columns)} gap-6`}>
          {items.map((item, idx) => {
            const isRSS = item.source === 'rss';
            const href = item.link || '#';
            const external = isRSS || href.startsWith('http');
            const Wrapper = external
              ? ({ children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="block">{children}</a>
              : ({ children }) => <Link to={href} className="block">{children}</Link>;
            return (
              <Wrapper key={`${href}-${idx}`}>
                <Card className="bg-[#0f0f15] border-[#D4A836]/20 hover:border-[#D4A836]/50 transition-all h-full" data-testid={`block-news-card-${item.source}`}>
                  {item.featured_image && (
                    <div className="aspect-video overflow-hidden rounded-t-lg bg-[#1a1a24]">
                      <img src={item.featured_image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {show_source_badge && (
                        <Badge variant="outline" className={isRSS ? 'border-blue-500/30 text-blue-300 text-xs' : 'border-[#D4A836]/40 text-[#D4A836] text-xs'}>
                          {isRSS ? <Rss className="w-3 h-3 mr-1" /> : <Newspaper className="w-3 h-3 mr-1" />}
                          {item.feed_name || (isRSS ? 'RSS' : 'Our News')}
                        </Badge>
                      )}
                      {show_date && (
                        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(item.published_at)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-[#E8DDB5] line-clamp-2 leading-snug">{item.title}</h3>
                    {show_excerpt && item.description && (
                      <p className="text-sm text-gray-400 line-clamp-3" dangerouslySetInnerHTML={{ __html: item.description }} />
                    )}
                    {external && (
                      <div className="text-xs flex items-center gap-1 text-[#D4A836]">Read more <ExternalLink className="w-3 h-3" /></div>
                    )}
                  </CardContent>
                </Card>
              </Wrapper>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4" data-testid="block-news-pagination">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} className="border-[#D4A836]/30">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400 px-3">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="border-[#D4A836]/30">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ---- Main component --------------------------------------------------------

const COMPONENTS = {
  heading: HeadingBlock,
  text: TextBlock,
  button: ButtonBlock,
  image: ImageBlock,
  divider: DividerBlock,
  hero: HeroBlock,
  contact_form: ContactFormBlock,
  cards: CardsBlock,
  blog_list: BlogListBlock,
  news_feed: NewsFeedBlock,
};

/**
 * Renders sidebar widgets attached to a PageBuilder page via `sidebar_config`.
 * Supported widget_type values: recent_posts, popular_tags, newsletter,
 * social_links, about_widget, custom_html, cta. Unknown types are ignored.
 */
export const SidebarWidgets = ({ sidebar }) => {
  if (!sidebar || !sidebar.widgets || sidebar.widgets.length === 0) return null;
  return (
    <aside className="space-y-6" data-testid="pagebuilder-sidebar">
      {sidebar.widgets.map((w) => {
        const cfg = w.config || {};
        const title = w.title || '';
        return (
          <Card key={w.widget_id} className="bg-[#0f0f15] border-[#D4A836]/20">
            {title && (
              <CardHeader className="pb-2">
                <CardTitle className="text-[#E8DDB5] text-base">{title}</CardTitle>
              </CardHeader>
            )}
            <CardContent className="pt-3">
              {w.widget_type === 'custom_html' && (
                <div className="text-gray-300 text-sm" dangerouslySetInnerHTML={{ __html: cfg.html || '' }} />
              )}
              {w.widget_type === 'newsletter' && (
                <div className="space-y-2">
                  {cfg.description && <p className="text-xs text-gray-400">{cfg.description}</p>}
                  <Input placeholder="you@example.com" className="bg-[#1a1a24] border-[#30363D] text-white" />
                  <Button className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black">
                    {cfg.button_text || 'Subscribe'}
                  </Button>
                </div>
              )}
              {w.widget_type === 'cta' && (
                <div className="space-y-2">
                  {cfg.description && <p className="text-gray-300 text-sm">{cfg.description}</p>}
                  {cfg.button_text && cfg.button_url && (
                    <Button
                      onClick={() => (window.location.href = cfg.button_url)}
                      className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black"
                    >
                      {cfg.button_text}
                    </Button>
                  )}
                </div>
              )}
              {w.widget_type === 'social_links' && Array.isArray(cfg.links) && (
                <div className="flex flex-wrap gap-2">
                  {cfg.links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                       className="text-[#D4A836] hover:underline text-sm">
                      {l.label || l.url}
                    </a>
                  ))}
                </div>
              )}
              {w.widget_type === 'about_widget' && (
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{cfg.text || ''}</p>
              )}
              {!['custom_html','newsletter','cta','social_links','about_widget'].includes(w.widget_type) && (
                <p className="text-xs text-gray-500">Widget: {w.widget_type}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </aside>
  );
};

/**
 * Renders a list of PageBuilder blocks (from custom_pages.blocks).
 */
export const PageBuilderBlocks = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null;
  const sorted = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
  return (
    <div className="space-y-6" data-testid="pagebuilder-blocks">
      {sorted.map((block, idx) => {
        const Component = COMPONENTS[block.type];
        if (!Component) return null;
        return <Component key={block.block_id || idx} content={block.content || {}} />;
      })}
    </div>
  );
};

/**
 * Hook that fetches a PageBuilder override for a reserved slug (blog, news).
 * Returns:
 *   { override: custom_page | null, sidebar: sidebar_config | null, loading: boolean }
 *
 * When an override exists AND is published AND contains blocks, callers
 * should render the override's blocks instead of the default page content.
 * If the page has `sidebar_config` set, the hook also fetches the matching
 * widget list so the renderer can show a right-column sidebar.
 */
export function usePageBuilderOverride(slug) {
  const [override, setOverride] = useState(null);
  const [sidebar, setSidebar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchOverride = async () => {
      try {
        const res = await axios.get(`${API}/pages/custom/${slug}`);
        const page = res.data;
        if (!cancelled && page && page.is_published && Array.isArray(page.blocks) && page.blocks.length > 0) {
          setOverride(page);
          // If the override has a sidebar_config attached, fetch its widgets
          if (page.sidebar_config) {
            try {
              const sbRes = await axios.get(`${API}/sidebar-configs/public/${page.sidebar_config}`);
              if (!cancelled) setSidebar(sbRes.data);
            } catch (_) {
              if (!cancelled) setSidebar(null);
            }
          }
        } else if (!cancelled) {
          setOverride(null);
          setSidebar(null);
        }
      } catch (err) {
        if (!cancelled) { setOverride(null); setSidebar(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOverride();
    return () => { cancelled = true; };
  }, [slug]);

  return { override, sidebar, loading };
}
