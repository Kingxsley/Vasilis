import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Rss, Plus, Trash2, Edit, RefreshCw, Loader2, 
  ExternalLink, Clock, CheckCircle, AlertCircle, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RSSFeedManager() {
  const { token } = useAuth();
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(null);
  
  const [newFeed, setNewFeed] = useState({
    name: '',
    url: '',
    category: 'cybersecurity',
    is_active: true,
    refresh_interval: 3600
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const res = await axios.get(`${API}/content/rss-feeds`, { headers });
      setFeeds(res.data.feeds || []);
    } catch (err) {
      console.error('Failed to fetch feeds:', err);
      toast.error('Failed to load RSS feeds');
    } finally {
      setLoading(false);
    }
  };

  const createFeed = async () => {
    if (!newFeed.name || !newFeed.url) {
      toast.error('Please enter feed name and URL');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/content/rss-feeds`, newFeed, { headers });
      toast.success('RSS feed added successfully');
      setShowCreate(false);
      setNewFeed({
        name: '', url: '', category: 'cybersecurity',
        is_active: true, refresh_interval: 3600
      });
      fetchFeeds();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add RSS feed');
    } finally {
      setSaving(false);
    }
  };

  const updateFeed = async () => {
    if (!editingFeed?.name || !editingFeed?.url) {
      toast.error('Please enter feed name and URL');
      return;
    }
    
    setSaving(true);
    try {
      await axios.patch(`${API}/content/rss-feeds/${editingFeed.feed_id}`, editingFeed, { headers });
      toast.success('RSS feed updated');
      setShowEdit(false);
      setEditingFeed(null);
      fetchFeeds();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update feed');
    } finally {
      setSaving(false);
    }
  };

  const deleteFeed = async (feedId) => {
    if (!window.confirm('Are you sure you want to delete this RSS feed?')) return;
    
    try {
      await axios.delete(`${API}/content/rss-feeds/${feedId}`, { headers });
      toast.success('RSS feed deleted');
      fetchFeeds();
    } catch (err) {
      toast.error('Failed to delete feed');
    }
  };

  const refreshFeed = async (feedId) => {
    setRefreshing(feedId);
    try {
      await axios.post(`${API}/content/rss-feeds/${feedId}/refresh`, {}, { headers });
      toast.success('Feed refreshed successfully');
      fetchFeeds();
    } catch (err) {
      toast.error('Failed to refresh feed');
    } finally {
      setRefreshing(null);
    }
  };

  const FeedForm = ({ data, setData }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Feed Name *</Label>
        <Input
          value={data.name}
          onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Krebs on Security"
          className="bg-[#0D1117] border-[#30363D]"
        />
      </div>

      <div className="space-y-2">
        <Label>RSS Feed URL *</Label>
        <Input
          value={data.url}
          onChange={(e) => setData(prev => ({ ...prev, url: e.target.value }))}
          placeholder="https://example.com/feed.xml"
          className="bg-[#0D1117] border-[#30363D]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Input
            value={data.category}
            onChange={(e) => setData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="e.g., cybersecurity"
            className="bg-[#0D1117] border-[#30363D]"
          />
        </div>
        <div className="space-y-2">
          <Label>Refresh Interval (seconds)</Label>
          <Input
            type="number"
            value={data.refresh_interval}
            onChange={(e) => setData(prev => ({ ...prev, refresh_interval: parseInt(e.target.value) || 3600 }))}
            placeholder="3600"
            className="bg-[#0D1117] border-[#30363D]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-[#0D1117] rounded-lg border border-[#30363D]">
        <div>
          <Label>Active</Label>
          <p className="text-xs text-gray-500">Fetch articles from this feed</p>
        </div>
        <Switch
          checked={data.is_active}
          onCheckedChange={(checked) => setData(prev => ({ ...prev, is_active: checked }))}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="rss-feed-manager-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
              <Rss className="w-8 h-8 text-[#D4A836]" />
              RSS Feed Manager
            </h1>
            <p className="text-gray-400">
              Manage multiple RSS feeds to aggregate news on your site
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add RSS Feed
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="bg-[#D4A836]/10 border-[#D4A836]/30 mb-8">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-[#D4A836] mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#E8DDB5] mb-1">News Aggregation</h3>
                <p className="text-sm text-gray-400">
                  Add multiple RSS feeds from trusted cybersecurity sources. Articles will be automatically fetched and displayed on your News page.
                  The News page shows 15 articles per page with pagination.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Feeds Suggestion */}
        <Card className="bg-[#161B22] border-[#30363D] mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Popular Cybersecurity RSS Feeds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
                { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
                { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml' },
                { name: 'Threatpost', url: 'https://threatpost.com/feed/' },
                { name: 'Bleeping Computer', url: 'https://www.bleepingcomputer.com/feed/' },
              ].map(feed => (
                <Button
                  key={feed.url}
                  variant="outline"
                  size="sm"
                  className="border-[#30363D] text-xs"
                  onClick={() => {
                    setNewFeed(prev => ({ ...prev, name: feed.name, url: feed.url }));
                    setShowCreate(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {feed.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : feeds.length === 0 ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-8 text-center">
              <Rss className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-semibold text-[#E8DDB5] mb-2">No RSS Feeds</h3>
              <p className="text-gray-400 mb-4">Add your first RSS feed to start aggregating news</p>
              <Button onClick={() => setShowCreate(true)} className="bg-[#D4A836] hover:bg-[#B8922E] text-black">
                <Plus className="w-4 h-4 mr-2" />
                Add RSS Feed
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feeds.map((feed) => (
              <Card 
                key={feed.feed_id}
                className={`bg-[#161B22] border-[#30363D] transition-colors ${
                  feed.is_active ? 'hover:border-[#D4A836]/50' : 'opacity-60'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Rss className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-[#E8DDB5]">{feed.name}</CardTitle>
                        <p className="text-xs text-gray-500">{feed.category}</p>
                      </div>
                    </div>
                    {feed.is_active ? (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-2 truncate" title={feed.url}>
                    <ExternalLink className="w-3 h-3 inline mr-1" />
                    {feed.url}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Clock className="w-3 h-3 mr-1" />
                    Refresh every {Math.floor(feed.refresh_interval / 60)} min
                    {feed.last_fetched && (
                      <span className="ml-2">• Last: {new Date(feed.last_fetched).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-[#30363D]"
                      onClick={() => {
                        setEditingFeed(feed);
                        setShowEdit(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#30363D]"
                      onClick={() => refreshFeed(feed.feed_id)}
                      disabled={refreshing === feed.feed_id}
                    >
                      {refreshing === feed.feed_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => deleteFeed(feed.feed_id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Feed Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#161B22] border-[#30363D]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D4A836]" />
              Add RSS Feed
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new RSS feed to aggregate news on your site
            </DialogDescription>
          </DialogHeader>
          
          <FeedForm data={newFeed} setData={setNewFeed} />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#30363D]">
              Cancel
            </Button>
            <Button onClick={createFeed} className="bg-[#D4A836] hover:bg-[#B8922E] text-black" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Feed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Feed Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-[#161B22] border-[#30363D]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#D4A836]" />
              Edit RSS Feed
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify the RSS feed settings
            </DialogDescription>
          </DialogHeader>
          
          {editingFeed && (
            <FeedForm data={editingFeed} setData={setEditingFeed} />
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="border-[#30363D]">
              Cancel
            </Button>
            <Button onClick={updateFeed} className="bg-[#D4A836] hover:bg-[#B8922E] text-black" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
