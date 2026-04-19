import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus, Edit, Trash2, Loader2, Newspaper, Rss, RefreshCw, ExternalLink,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import '../styles/quill-dark.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['link', 'image'],
    ['clean'],
  ],
};

// ============================================================================
// Articles Tab
// ============================================================================

function ArticlesTab({ token }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [useHtml, setUseHtml] = useState(false);

  const [newsForm, setNewsForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'general',
    tags: '',
    featured_image: '',
    published: true,
  });

  useEffect(() => { fetchNews(); }, []);

  useEffect(() => {
    if (newsForm.title && !editingNews) {
      const slug = newsForm.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .substring(0, 100);
      setNewsForm((prev) => ({ ...prev, slug }));
    }
  }, [newsForm.title, editingNews]);

  const fetchNews = async () => {
    try {
      const res = await axios.get(`${API}/content/news`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNews(res.data.news || []);
    } catch (err) {
      toast.error('Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewsForm({
      title: '', slug: '', excerpt: '', content: '',
      category: 'general', tags: '', featured_image: '', published: true,
    });
    setEditingNews(null);
    setUseHtml(false);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...newsForm,
        tags: newsForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (editingNews) {
        await axios.patch(`${API}/content/news/${editingNews.news_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Article updated');
      } else {
        await axios.post(`${API}/content/news`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Article created');
      }
      setShowDialog(false);
      resetForm();
      fetchNews();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingNews(item);
    setNewsForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      content: item.content || '',
      category: item.category || 'general',
      tags: (item.tags || []).join(', '),
      featured_image: item.featured_image || '',
      published: item.published !== false,
    });
    setShowDialog(true);
  };

  const handleDelete = async (newsId) => {
    if (!window.confirm('Delete this article?')) return;
    try {
      await axios.delete(`${API}/content/news/${newsId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Article deleted');
      fetchNews();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">Write and publish news articles. They appear on the public /news page.</p>
        <Button
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
          data-testid="news-add-article-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> New Article
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      ) : news.length === 0 ? (
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardContent className="py-16 text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No articles yet</h3>
            <Button
              onClick={() => { resetForm(); setShowDialog(true); }}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              data-testid="news-create-first-btn"
            >
              <Plus className="w-4 h-4 mr-2" /> Create article
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((item) => (
            <Card key={item.news_id} className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5] text-lg line-clamp-2">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {item.excerpt && <p className="text-gray-400 text-sm mb-4 line-clamp-3">{item.excerpt}</p>}
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={item.published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                    {item.published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(item)} className="flex-1 border-[#D4A836]/30">
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.news_id)} className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#E8DDB5]">
              {editingNews ? 'Edit Article' : 'Create Article'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  required
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={newsForm.slug}
                  onChange={(e) => setNewsForm({ ...newsForm, slug: e.target.value })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Excerpt</Label>
              <Textarea
                value={newsForm.excerpt}
                onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
                className="bg-[#1a1a24] border-[#30363D] text-white"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Content</Label>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => setUseHtml(!useHtml)}
                  className="border-[#30363D] text-gray-400"
                >
                  {useHtml ? 'Visual Editor' : 'HTML Editor'}
                </Button>
              </div>
              {useHtml ? (
                <Textarea
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  className="bg-[#1a1a24] border-[#30363D] text-white min-h-[300px] font-mono text-sm"
                  required
                />
              ) : (
                <div className="bg-white rounded-lg">
                  <ReactQuill
                    theme="snow"
                    value={newsForm.content}
                    onChange={(content) => setNewsForm({ ...newsForm, content })}
                    modules={quillModules}
                    style={{ minHeight: '300px' }}
                  />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={newsForm.tags}
                  onChange={(e) => setNewsForm({ ...newsForm, tags: e.target.value })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
              <div>
                <Label>Featured Image URL</Label>
                <Input
                  value={newsForm.featured_image}
                  onChange={(e) => setNewsForm({ ...newsForm, featured_image: e.target.value })}
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newsForm.published}
                onChange={(e) => setNewsForm({ ...newsForm, published: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>Publish immediately</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-[#30363D]">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingNews ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// RSS Feeds Tab (consolidated from RSSFeedManager.js)
// ============================================================================

function RSSFeedsTab({ token }) {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [form, setForm] = useState({ url: '', name: '', category: 'cybersecurity', is_active: true });

  useEffect(() => { fetchFeeds(); }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/news/feeds`);
      setFeeds(res.data.feeds || []);
    } catch (err) {
      toast.error('Failed to load feeds');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ url: '', name: '', category: 'cybersecurity', is_active: true });
    setEditingFeed(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingFeed) {
        await axios.patch(`${API}/news/feeds/${editingFeed.feed_id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Feed updated');
      } else {
        const res = await axios.post(`${API}/news/feeds`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.ok) {
          toast.success('Feed added and fetched');
        } else {
          toast.warning('Feed saved but URL is currently unreachable. Use "Refresh" later.');
        }
      }
      setShowDialog(false);
      resetForm();
      fetchFeeds();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save feed');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async (feed) => {
    setRefreshing(feed.feed_id);
    try {
      const res = await axios.post(`${API}/news/feeds/${feed.feed_id}/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.ok) {
        toast.success(`Fetched ${res.data.article_count} article(s) from ${feed.name || 'feed'}`);
      } else {
        toast.error(`Still unreachable: ${res.data.error?.slice(0, 100) || 'unknown'}`);
      }
      fetchFeeds();
    } catch (err) {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async (feedId) => {
    if (!window.confirm('Delete this RSS feed?')) return;
    try {
      await axios.delete(`${API}/news/feeds/${feedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Feed deleted');
      fetchFeeds();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (feed) => {
    setEditingFeed(feed);
    setForm({
      url: feed.url || '',
      name: feed.name || '',
      category: feed.category || 'cybersecurity',
      is_active: feed.is_active !== false,
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">Aggregate external RSS feeds on the public /news page. Up to 10 feeds.</p>
        <Button
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
          data-testid="news-add-feed-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Feed
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      ) : feeds.length === 0 ? (
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardContent className="py-16 text-center">
            <Rss className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No RSS feeds yet</h3>
            <p className="text-gray-400 text-sm mb-4">Try adding a feed URL like <span className="text-[#D4A836]">https://feeds.feedburner.com/TheHackersNews</span></p>
            <Button
              onClick={() => { resetForm(); setShowDialog(true); }}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              <Plus className="w-4 h-4 mr-2" /> Add your first feed
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {feeds.map((feed) => (
            <Card key={feed.feed_id} className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-[#E8DDB5] text-base flex items-center gap-2 truncate">
                      <Rss className="w-4 h-4 text-[#D4A836] flex-shrink-0" />
                      <span className="truncate">{feed.name || 'Untitled Feed'}</span>
                    </CardTitle>
                    <a href={feed.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[#D4A836] truncate block mt-1">
                      {feed.url}
                    </a>
                  </div>
                  {feed.status === 'ok' ? (
                    <Badge className="bg-green-500/20 text-green-400 flex-shrink-0">
                      <CheckCircle className="w-3 h-3 mr-1" /> OK
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 flex-shrink-0" title={feed.fetch_error}>
                      <AlertCircle className="w-3 h-3 mr-1" /> Unreachable
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-500">
                  <Badge variant="outline" className="border-gray-600 text-gray-400">{feed.category || 'general'}</Badge>
                  {feed.last_fetched && (
                    <span>Last: {new Date(feed.last_fetched).toLocaleString()}</span>
                  )}
                  {feed.is_active === false && (
                    <Badge className="bg-gray-500/20 text-gray-400">Inactive</Badge>
                  )}
                </div>
                {feed.fetch_error && (
                  <p className="text-xs text-red-400 mb-3 line-clamp-2" title={feed.fetch_error}>
                    {feed.fetch_error}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => handleRefresh(feed)}
                    disabled={refreshing === feed.feed_id}
                    className="flex-1 border-[#D4A836]/30 text-[#E8DDB5] hover:bg-[#D4A836]/10"
                    data-testid={`feed-refresh-${feed.feed_id}`}
                  >
                    {refreshing === feed.feed_id
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <RefreshCw className="w-4 h-4 mr-1" />}
                    Refresh
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(feed)} className="text-gray-400 hover:text-[#D4A836]">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(feed.feed_id)} className="text-gray-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#E8DDB5]">
              {editingFeed ? 'Edit RSS Feed' : 'Add RSS Feed'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Feed URL *</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/rss"
                className="bg-[#1a1a24] border-[#30363D] text-white"
                required
                data-testid="feed-url-input"
              />
              <p className="text-xs text-gray-500 mt-1">If the URL is unreachable, we'll still save it so you can retry later.</p>
            </div>
            <div>
              <Label>Name (optional — auto-filled from feed)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="The Hacker News"
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="cybersecurity"
                className="bg-[#1a1a24] border-[#30363D] text-white"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-[#D4A836]"
              />
              <span className="text-sm text-gray-300">Active (show articles on /news)</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-[#30363D]">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingFeed ? 'Save Changes' : 'Add Feed'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function NewsManager() {
  const { token, user } = useAuth();

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center"><p className="text-gray-400">Access denied.</p></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8DDB5] flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-[#D4A836]" /> News Manager
          </h1>
          <p className="text-gray-400">Manage news articles and external RSS feeds — both appear combined on the public <a href="/news" className="text-[#D4A836] hover:underline" target="_blank" rel="noopener noreferrer">/news <ExternalLink className="w-3 h-3 inline" /></a> page.</p>
        </div>

        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="bg-[#0f0f15] border border-[#D4A836]/20">
            <TabsTrigger value="articles" data-testid="news-tab-articles" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <Newspaper className="w-4 h-4 mr-2" /> Articles
            </TabsTrigger>
            <TabsTrigger value="feeds" data-testid="news-tab-feeds" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <Rss className="w-4 h-4 mr-2" /> RSS Feeds
            </TabsTrigger>
          </TabsList>
          <TabsContent value="articles" className="mt-4">
            <ArticlesTab token={token} />
          </TabsContent>
          <TabsContent value="feeds" className="mt-4">
            <RSSFeedsTab token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
