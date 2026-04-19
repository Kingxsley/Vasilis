import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Rss, ExternalLink, Calendar, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewsAggregator() {
  const { token, user } = useAuth();
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds] = useState([]);
  const [articles, setArticles] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchBranding();
    fetchFeeds();
    setIsAdmin(user?.role === 'super_admin');
  }, [user]);

  const fetchBranding = async () => {
    try {
      const res = await axios.get(`${API}/public/branding`);
      setBranding(res.data);
    } catch (err) {
      console.error('Failed to load branding:', err);
    }
  };

  const fetchFeeds = async () => {
    try {
      const res = await axios.get(`${API}/news/feeds`);
      setFeeds(res.data.feeds || []);
      
      // Fetch articles from all feeds
      const allArticles = [];
      for (const feed of res.data.feeds || []) {
        try {
          const articlesRes = await axios.get(`${API}/news/feed/${feed.feed_id}/articles`);
          allArticles.push(...articlesRes.data.articles.map(a => ({ ...a, feedName: feed.name })));
        } catch (err) {
          console.error(`Failed to fetch articles for ${feed.name}:`, err);
        }
      }
      
      // Sort by date
      allArticles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
      setArticles(allArticles);
    } catch (err) {
      console.error('Failed to load feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim() || !isAdmin) return;
    
    setAdding(true);
    try {
      await axios.post(
        `${API}/news/feeds`,
        { url: newFeedUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNewFeedUrl('');
      fetchFeeds();
    } catch (err) {
      console.error('Failed to add feed:', err);
      alert('Failed to add RSS feed. Please check the URL.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteFeed = async (feedId) => {
    if (!isAdmin || !window.confirm('Delete this RSS feed?')) return;
    
    try {
      await axios.delete(`${API}/news/feeds/${feedId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchFeeds();
    } catch (err) {
      console.error('Failed to delete feed:', err);
    }
  };

  const primaryColor = branding?.primary_color || '#D4A836';
  const bgColor = branding?.background_color || '#0f0f15';
  const textColor = branding?.text_color || '#E8DDB5';

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <PublicNav branding={branding} />

      <main className="container mx-auto px-4 py-12" style={{ paddingTop: '120px' }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-4" style={{ color: primaryColor, fontFamily: 'Chivo, sans-serif' }}>
              Industry News & Updates
            </h1>
            <p className="text-xl" style={{ color: textColor + 'cc' }}>
              Curated cybersecurity news from leading industry sources
            </p>
          </div>

          {/* Admin: Add Feed */}
          {isAdmin && (
            <Card className="mb-8 bg-[#1a1a24] border-[#D4A836]/30">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                  <Rss className="w-5 h-5" />
                  Manage RSS Feeds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    placeholder="Enter RSS feed URL (e.g., https://example.com/feed.xml)"
                    className="bg-[#0f0f15] border-[#30363D]"
                  />
                  <Button
                    onClick={handleAddFeed}
                    disabled={adding || !newFeedUrl.trim()}
                    className="bg-[#D4A836] hover:bg-[#B8922E] text-black whitespace-nowrap"
                  >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Feed
                  </Button>
                </div>
                
                {/* Current Feeds */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Active Feeds ({feeds.length}/10):</p>
                  {feeds.map(feed => (
                    <div key={feed.feed_id} className="flex items-center justify-between p-2 bg-[#0f0f15] rounded">
                      <span className="text-sm">{feed.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFeed(feed.feed_id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Articles Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            </div>
          ) : articles.length === 0 ? (
            <Card className="bg-[#1a1a24] border-[#30363D]">
              <CardContent className="py-12 text-center">
                <Rss className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No news articles available yet.</p>
                {isAdmin && (
                  <p className="text-sm text-gray-500 mt-2">Add RSS feeds above to start aggregating news.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, idx) => (
                <Card key={idx} className="bg-[#1a1a24] border-[#30363D] hover:border-[#D4A836]/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {article.feedName}
                      </Badge>
                      {article.published_at && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg" style={{ color: textColor }}>
                      {article.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {article.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                        {article.description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                      style={{ color: primaryColor }}
                    >
                      Read Article <ExternalLink className="w-4 h-4" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter branding={branding} />
    </div>
  );
}
