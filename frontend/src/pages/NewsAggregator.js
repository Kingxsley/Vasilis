import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Rss, ExternalLink, Calendar, Loader2, Newspaper } from 'lucide-react';
import { PageBuilderBlocks, SidebarWidgets, usePageBuilderOverride } from '../components/PageBuilderRenderer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Public /news page.
 *
 * Renders a mixed timeline of admin-authored news articles (source=article)
 * and external RSS feed entries (source=rss), sorted by publish date. If an
 * admin published a PageBuilder page with slug="news", that overrides this
 * default view entirely.
 */
export default function NewsAggregator() {
  const [branding, setBranding] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // PageBuilder override — admin-customized /news page
  const { override, sidebar, loading: overrideLoading } = usePageBuilderOverride('news');

  useEffect(() => {
    axios.get(`${API}/settings/branding`).then((r) => setBranding(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (override || overrideLoading) return; // skip fetch if override wins
    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const res = await axios.get(`${API}/news/mixed-feed?limit=50`);
        if (!cancelled) setItems(res.data.items || []);
      } catch (err) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFeed();
    return () => { cancelled = true; };
  }, [override, overrideLoading]);

  const primaryColor = branding?.primary_color || '#D4A836';
  const bgColor = '#0a0a0f';
  const textColor = branding?.text_color || '#E8DDB5';

  if (overrideLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (override) {
    const firstBlock = override.blocks?.[0]?.type;
    const showOuterTitle = !['hero', 'heading'].includes(firstBlock);
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
        <PublicNav branding={branding} />
        <main className="container mx-auto px-6 py-12 flex-1 max-w-6xl">
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

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
      <PublicNav branding={branding} />

      <main className="container mx-auto px-4 py-12 flex-1 max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: primaryColor, fontFamily: 'Chivo, sans-serif' }}>
            News
          </h1>
          <p className="text-lg" style={{ color: textColor + 'cc' }}>
            Our updates and curated industry news — all in one place.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : items.length === 0 ? (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="py-16 text-center">
              <Newspaper className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No news yet</h3>
              <p className="text-gray-400 text-sm">Once your team publishes articles or adds RSS feeds, they'll appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="news-mixed-feed">
            {items.map((item, idx) => {
              const isRSS = item.source === 'rss';
              const href = item.link || '#';
              const external = isRSS || (href.startsWith('http'));
              const Wrapper = ({ children }) =>
                external
                  ? <a href={href} target="_blank" rel="noopener noreferrer" className="block">{children}</a>
                  : <a href={href} className="block">{children}</a>;
              return (
                <Wrapper key={`${item.link}-${idx}`}>
                  <Card
                    className="bg-[#0f0f15] border-[#D4A836]/20 hover:border-[#D4A836]/50 transition-all h-full"
                    data-testid={`news-card-${item.source}`}
                  >
                    {item.featured_image && (
                      <div className="aspect-video overflow-hidden rounded-t-lg bg-[#1a1a24]">
                        <img src={item.featured_image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={isRSS
                            ? 'border-blue-500/30 text-blue-300 text-xs'
                            : 'border-[#D4A836]/40 text-[#D4A836] text-xs'}
                        >
                          {isRSS ? <Rss className="w-3 h-3 mr-1" /> : <Newspaper className="w-3 h-3 mr-1" />}
                          {item.feed_name || (isRSS ? 'RSS' : 'Our News')}
                        </Badge>
                        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(item.published_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#E8DDB5] line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p
                          className="text-sm text-gray-400 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}
                      {external && (
                        <div className="text-xs flex items-center gap-1" style={{ color: primaryColor }}>
                          Read more <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Wrapper>
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter branding={branding} />
    </div>
  );
}
