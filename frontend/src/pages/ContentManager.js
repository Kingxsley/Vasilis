import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Plus, Edit, Trash2, Loader2, FileText, Video, Newspaper, 
  Upload, Eye, EyeOff, Image, Youtube, Info, Users, Rss, ExternalLink, Globe,
  Link, Navigation, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

// Lazy load RichTextEditor to avoid SSR issues
const RichTextEditor = lazy(() => import('../components/common/RichTextEditor'));

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VIDEO_CATEGORIES = [
  { value: 'training', label: 'Training' },
  { value: 'awareness', label: 'Security Awareness' },
  { value: 'tutorials', label: 'Tutorials' },
  { value: 'news', label: 'News & Updates' },
  { value: 'webinars', label: 'Webinars' },
];

// Available icons for menu manager
const ICON_OPTIONS = [
  "LayoutDashboard", "Building2", "Users", "BookOpen", "BarChart3", 
  "Mail", "Monitor", "Upload", "Award", "FileText", "Settings", 
  "Layout", "Crosshair", "GraduationCap", "Cog", "ShieldAlert", 
  "TrendingUp", "MessageSquare", "Image", "Search", "Globe", 
  "ExternalLink", "Link", "Home", "Folder", "Database", "Cloud"
];

const SECTION_OPTIONS = [
  { id: "main", label: "Overview" },
  { id: "management", label: "Management" },
  { id: "simulations", label: "Simulations" },
  { id: "content", label: "Content" },
  { id: "training", label: "Training" },
  { id: "settings", label: "Settings" },
  { id: "security", label: "Security" },
];

const ROLE_OPTIONS = [
  { id: "super_admin", label: "Super Admin" },
  { id: "org_admin", label: "Organization Admin" },
  { id: "media_manager", label: "Media Manager" },
  { id: "trainee", label: "Trainee" },
  { id: "all", label: "All Users" },
];

export default function ContentManager() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('blog');
  const [loading, setLoading] = useState(true);
  
  // Blog state with pagination
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [blogForm, setBlogForm] = useState({
    title: '', excerpt: '', content: '', tags: '', featured_image: '', published: false
  });
  const [blogPage, setBlogPage] = useState(1);
  const [blogTotal, setBlogTotal] = useState(0);
  const [blogSearch, setBlogSearch] = useState('');
  const BLOG_LIMIT = 10;
  
  // News state with pagination
  const [news, setNews] = useState([]);
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', link: '', published: true });
  const [newsPage, setNewsPage] = useState(1);
  const [newsTotal, setNewsTotal] = useState(0);
  const [newsSearch, setNewsSearch] = useState('');
  const NEWS_LIMIT = 10;
  
  // RSS Feeds state
  const [rssFeeds, setRssFeeds] = useState([]);
  const [rssFeedDialogOpen, setRssFeedDialogOpen] = useState(false);
  const [rssFeedForm, setRssFeedForm] = useState({ name: '', url: '', enabled: true });
  
  // Video state
  const [videos, setVideos] = useState([]);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: '', description: '', youtube_url: '', category: 'training', published: false
  });
  const [videoFilter, setVideoFilter] = useState('all');
  const [editingVideo, setEditingVideo] = useState(null);
  
  // About state
  const [about, setAbout] = useState({ title: '', content: '', mission: '', vision: '', team_members: [] });
  const [teamMemberForm, setTeamMemberForm] = useState({ name: '', role: '', bio: '', image: '' });
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  
  // Menu Manager state
  const [navItems, setNavItems] = useState([]);
  const [navDialogOpen, setNavDialogOpen] = useState(false);
  const [editingNavItem, setEditingNavItem] = useState(null);
  const [navForm, setNavForm] = useState({
    label: '',
    link_type: 'internal',
    path: '',
    icon: 'Link',
    section_id: 'main',
    visible_to: ['all'],
    open_in_new_tab: false,
    sort_order: 100,
    is_active: true
  });
  const [cmsPages, setCmsPages] = useState([]);
  
  // Media state
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllContent();
    fetchRssFeeds();
    if (user?.role === 'super_admin') {
      fetchNavItems();
    }
  }, []);

  // Fetch blog with pagination
  useEffect(() => {
    fetchBlogPosts();
  }, [blogPage, blogSearch]);

  // Fetch news with pagination
  useEffect(() => {
    fetchNews();
  }, [newsPage, newsSearch]);

  const fetchBlogPosts = async () => {
    try {
      const skip = (blogPage - 1) * BLOG_LIMIT;
      const searchParam = blogSearch ? `&search=${encodeURIComponent(blogSearch)}` : '';
      const res = await axios.get(
        `${API}/content/blog?published_only=false&skip=${skip}&limit=${BLOG_LIMIT}${searchParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlogPosts(res.data.posts || []);
      setBlogTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    }
  };

  const fetchNews = async () => {
    try {
      const skip = (newsPage - 1) * NEWS_LIMIT;
      const searchParam = newsSearch ? `&search=${encodeURIComponent(newsSearch)}` : '';
      const res = await axios.get(
        `${API}/content/news?include_rss=false&skip=${skip}&limit=${NEWS_LIMIT}${searchParam}&published_only=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNews(res.data.news || []);
      setNewsTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to load news:', error);
    }
  };

  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const [videosRes, aboutRes] = await Promise.all([
        axios.get(`${API}/content/videos?published_only=false`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/content/about`)
      ]);
      setVideos(videosRes.data.videos || []);
      setAbout(aboutRes.data);
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const fetchNavItems = async () => {
    try {
      const [itemsRes, optionsRes] = await Promise.all([
        axios.get(`${API}/navigation`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/navigation/options`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setNavItems(itemsRes.data.items || []);
      setCmsPages(optionsRes.data.cms_pages || []);
    } catch (error) {
      console.error('Failed to load navigation items:', error);
    }
  };

  const fetchRssFeeds = async () => {
    try {
      const res = await axios.get(`${API}/content/news/rss-feeds`, { headers: { Authorization: `Bearer ${token}` } });
      setRssFeeds(res.data.feeds || []);
    } catch (error) {
      // Ignore error - RSS feeds might not be set up yet
    }
  };

  // ============== BLOG HANDLERS ==============
  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...blogForm,
        tags: blogForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      
      if (editingPost) {
        await axios.patch(`${API}/content/blog/${editingPost.post_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Post updated');
      } else {
        await axios.post(`${API}/content/blog`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Post created');
      }
      setBlogDialogOpen(false);
      resetBlogForm();
      fetchAllContent();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const editBlogPost = (post) => {
    setEditingPost(post);
    setBlogForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      tags: post.tags?.join(', ') || '',
      featured_image: post.featured_image || '',
      published: post.published
    });
    setBlogDialogOpen(true);
  };

  const deleteBlogPost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API}/content/blog/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Post deleted');
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetBlogForm = () => {
    setEditingPost(null);
    setBlogForm({ title: '', excerpt: '', content: '', tags: '', featured_image: '', published: false });
  };

  // ============== NEWS HANDLERS ==============
  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/content/news`, newsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('News posted');
      setNewsDialogOpen(false);
      setNewsForm({ title: '', content: '', link: '', published: true });
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to post news');
    } finally {
      setSaving(false);
    }
  };

  const deleteNews = async (newsId) => {
    if (!window.confirm('Delete this news?')) return;
    try {
      await axios.delete(`${API}/content/news/${newsId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('News deleted');
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Toggle published status for a local news item
  const toggleNewsPublished = async (item) => {
    try {
      await axios.patch(
        `${API}/content/news/${item.news_id}`,
        { published: !item.published },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNews();
      toast.success('News status updated');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  // ============== RSS FEED HANDLERS ==============
  const handleRssFeedSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/content/news/rss-feeds`, rssFeedForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('RSS feed added');
      setRssFeedDialogOpen(false);
      setRssFeedForm({ name: '', url: '', enabled: true });
      fetchRssFeeds();
      fetchAllContent(); // Refresh news to include new feed
    } catch (error) {
      toast.error('Failed to add RSS feed');
    } finally {
      setSaving(false);
    }
  };

  const toggleRssFeed = async (feed) => {
    try {
      await axios.patch(`${API}/content/news/rss-feeds/${feed.feed_id}`, 
        { enabled: !feed.enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRssFeeds();
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to update feed');
    }
  };

  const deleteRssFeed = async (feedId) => {
    if (!window.confirm('Delete this RSS feed?')) return;
    try {
      await axios.delete(`${API}/content/news/rss-feeds/${feedId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('RSS feed deleted');
      fetchRssFeeds();
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to delete feed');
    }
  };

  // ============== VIDEO HANDLERS ==============
  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/content/videos`, videoForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Video added');
      setVideoDialogOpen(false);
      setVideoForm({ title: '', description: '', youtube_url: '', category: 'training', published: false });
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to add video');
    } finally {
      setSaving(false);
    }
  };

  const toggleVideoPublished = async (video) => {
    try {
      await axios.patch(`${API}/content/videos/${video.video_id}`, 
        { published: !video.published },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await axios.delete(`${API}/content/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Video deleted');
      fetchAllContent();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // ============== ABOUT HANDLERS ==============
  const handleAboutSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/content/about`, about, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('About page saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ============== MEDIA UPLOAD ==============
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/content/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Image uploaded');
      // Copy URL to clipboard
      navigator.clipboard.writeText(response.data.url);
      toast.info('Image URL copied to clipboard!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ============== MENU MANAGER HANDLERS ==============
  const resetNavForm = () => {
    setNavForm({
      label: '',
      link_type: 'internal',
      path: '',
      icon: 'Link',
      section_id: 'main',
      visible_to: ['all'],
      open_in_new_tab: false,
      sort_order: 100,
      is_active: true
    });
    setEditingNavItem(null);
  };

  const handleNavSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingNavItem) {
        await axios.patch(`${API}/navigation/${editingNavItem.item_id}`, navForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Menu item updated');
      } else {
        await axios.post(`${API}/navigation`, navForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Menu item created');
      }
      setNavDialogOpen(false);
      resetNavForm();
      fetchNavItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const editNavItem = (item) => {
    setEditingNavItem(item);
    setNavForm({
      label: item.label,
      link_type: item.link_type,
      path: item.path,
      icon: item.icon || 'Link',
      section_id: item.section_id,
      visible_to: item.visible_to || ['all'],
      open_in_new_tab: item.open_in_new_tab || false,
      sort_order: item.sort_order || 100,
      is_active: item.is_active !== false
    });
    setNavDialogOpen(true);
  };

  const deleteNavItem = async (itemId) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await axios.delete(`${API}/navigation/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Menu item deleted');
      fetchNavItems();
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  const toggleNavItemRole = (roleId) => {
    setNavForm(prev => {
      const roles = prev.visible_to || [];
      if (roles.includes(roleId)) {
        return { ...prev, visible_to: roles.filter(r => r !== roleId) };
      } else {
        // If adding 'all', remove specific roles
        if (roleId === 'all') {
          return { ...prev, visible_to: ['all'] };
        }
        // If adding specific role, remove 'all'
        return { ...prev, visible_to: [...roles.filter(r => r !== 'all'), roleId] };
      }
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Content Manager
          </h1>
          <p className="text-gray-500 mt-1">Manage blog posts, news, videos, and more</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1a1a24] border border-[#D4A836]/20 mb-6 flex-wrap">
            <TabsTrigger value="blog" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <FileText className="w-4 h-4 mr-2" />Blog
            </TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <Newspaper className="w-4 h-4 mr-2" />News
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <Video className="w-4 h-4 mr-2" />Videos
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              <Info className="w-4 h-4 mr-2" />About
            </TabsTrigger>
{/* Menu Manager tab moved to Settings page */}
          </TabsList>

          {/* BLOG TAB */}
          <TabsContent value="blog">
            <div className="flex justify-between items-center mb-4 gap-4">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search posts..."
                    value={blogSearch}
                    onChange={(e) => { setBlogSearch(e.target.value); setBlogPage(1); }}
                    className="pl-10 bg-[#0D1117] border-[#30363D] text-white"
                    data-testid="blog-search"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="border-[#D4A836]/30 text-[#E8DDB5]">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Image className="w-4 h-4 mr-2" />}
                  Upload Image
                </Button>
                <Button onClick={() => { resetBlogForm(); setBlogDialogOpen(true); }}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                  <Plus className="w-4 h-4 mr-2" />New Post
                </Button>
              </div>
            </div>

            <div className="card-dark rounded-xl border border-[#D4A836]/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#D4A836]/20">
                    <TableHead className="text-gray-400">Title</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogPosts.map((post) => (
                    <TableRow key={post.post_id} className="border-[#D4A836]/20">
                      <TableCell className="text-[#E8DDB5] font-medium">{post.title}</TableCell>
                      <TableCell>
                        <Badge className={post.published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {post.published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => editBlogPost(post)} className="text-gray-400 hover:text-[#E8DDB5]">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteBlogPost(post.post_id)} className="text-gray-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {blogPosts.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-8">No posts yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Blog Pagination */}
            {blogTotal > BLOG_LIMIT && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#30363D]">
                <p className="text-sm text-gray-400">
                  Showing {((blogPage - 1) * BLOG_LIMIT) + 1}-{Math.min(blogPage * BLOG_LIMIT, blogTotal)} of {blogTotal} posts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlogPage(p => Math.max(1, p - 1))}
                    disabled={blogPage === 1}
                    className="border-[#30363D] text-gray-400"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    Page {blogPage} of {Math.ceil(blogTotal / BLOG_LIMIT)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlogPage(p => Math.min(Math.ceil(blogTotal / BLOG_LIMIT), p + 1))}
                    disabled={blogPage >= Math.ceil(blogTotal / BLOG_LIMIT)}
                    className="border-[#30363D] text-gray-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Blog Dialog */}
            <Dialog open={blogDialogOpen} onOpenChange={setBlogDialogOpen}>
              <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-[#E8DDB5]">{editingPost ? 'Edit Post' : 'New Blog Post'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBlogSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label className="text-gray-400">Title</Label>
                    <Input value={blogForm.title} onChange={(e) => setBlogForm({...blogForm, title: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" required />
                  </div>
                  <div>
                    <Label className="text-gray-400">Excerpt (short summary)</Label>
                    <Textarea value={blogForm.excerpt} onChange={(e) => setBlogForm({...blogForm, excerpt: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" rows={2} required />
                  </div>
                  <div>
                    <Label className="text-gray-400">Content</Label>
                    <Suspense fallback={<div className="h-64 bg-[#1a1a24] rounded-lg flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#D4A836]" /></div>}>
                      <RichTextEditor 
                        value={blogForm.content} 
                        onChange={(value) => setBlogForm({...blogForm, content: value})}
                        placeholder="Write your blog post content..."
                        token={token}
                      />
                    </Suspense>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Featured Image URL</Label>
                      <Input value={blogForm.featured_image} onChange={(e) => setBlogForm({...blogForm, featured_image: e.target.value})}
                        placeholder="Upload image above, paste URL here" className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" />
                    </div>
                    <div>
                      <Label className="text-gray-400">Tags (comma-separated)</Label>
                      <Input value={blogForm.tags} onChange={(e) => setBlogForm({...blogForm, tags: e.target.value})}
                        placeholder="security, training, tips" className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={blogForm.published} onChange={(e) => setBlogForm({...blogForm, published: e.target.checked})}
                      className="w-4 h-4" id="published" />
                    <Label htmlFor="published" className="text-gray-400 cursor-pointer">Publish immediately</Label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setBlogDialogOpen(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">Cancel</Button>
                    <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {editingPost ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* NEWS TAB */}
          <TabsContent value="news">
            <div className="space-y-6">
              {/* RSS Feeds Section */}
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[#E8DDB5] text-lg flex items-center gap-2">
                    <Rss className="w-5 h-5 text-[#D4A836]" />
                    RSS Feed Sources
                  </CardTitle>
                  <Button size="sm" onClick={() => setRssFeedDialogOpen(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                    <Plus className="w-4 h-4 mr-1" />Add Feed
                  </Button>
                </CardHeader>
                <CardContent>
                  {rssFeeds.length === 0 ? (
                    <p className="text-gray-500 text-sm">No RSS feeds configured. Add external news sources to display news from other sites.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {rssFeeds.map((feed) => (
                        <div key={feed.feed_id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${feed.enabled ? 'bg-[#1a1a24] border-[#D4A836]/30' : 'bg-[#1a1a24]/50 border-gray-600'}`}>
                          <Globe className={`w-4 h-4 ${feed.enabled ? 'text-[#D4A836]' : 'text-gray-500'}`} />
                          <span className={`text-sm ${feed.enabled ? 'text-[#E8DDB5]' : 'text-gray-500'}`}>{feed.name}</span>
                          <button onClick={() => toggleRssFeed(feed)} className={`p-1 rounded ${feed.enabled ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:bg-gray-500/10'}`}>
                            {feed.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                          <button onClick={() => deleteRssFeed(feed.feed_id)} className="text-gray-400 hover:text-red-400 p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* News Posts Section */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Search news..."
                      value={newsSearch}
                      onChange={(e) => { setNewsSearch(e.target.value); setNewsPage(1); }}
                      className="pl-10 bg-[#0D1117] border-[#30363D] text-white"
                      data-testid="news-search"
                    />
                  </div>
                </div>
                <Button onClick={() => setNewsDialogOpen(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                  <Plus className="w-4 h-4 mr-2" />Post News
                </Button>
              </div>

              <div className="grid gap-4">
                {news.map((item) => (
                  <Card key={item.news_id} className="bg-[#0f0f15] border-[#D4A836]/20">
                    <CardContent className="p-4 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[#E8DDB5] font-medium">{item.title}</h3>
                          {item.source_type === 'rss' ? (
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">{item.source}</Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">Local</Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{item.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-gray-500 text-xs">{new Date(item.created_at).toLocaleDateString()}</p>
                          {item.link && (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[#D4A836] text-xs flex items-center gap-1 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Read More
                            </a>
                          )}
                        </div>
                      </div>
                      {item.source !== 'rss' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleNewsPublished(item)}
                            className={
                              item.published
                                ? 'text-green-400 hover:text-green-500'
                                : 'text-gray-400 hover:text-yellow-400'
                            }
                            title={item.published ? 'Unpublish' : 'Publish'}
                          >
                            {item.published ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNews(item.news_id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {news.length === 0 && <p className="text-center text-gray-500 py-8">No news yet</p>}
              </div>

              {/* News Pagination */}
              {newsTotal > NEWS_LIMIT && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#30363D]">
                  <p className="text-sm text-gray-400">
                    Showing {((newsPage - 1) * NEWS_LIMIT) + 1}-{Math.min(newsPage * NEWS_LIMIT, newsTotal)} of {newsTotal} news items
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewsPage(p => Math.max(1, p - 1))}
                      disabled={newsPage === 1}
                      className="border-[#30363D] text-gray-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-400">
                      Page {newsPage} of {Math.ceil(newsTotal / NEWS_LIMIT)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewsPage(p => Math.min(Math.ceil(newsTotal / NEWS_LIMIT), p + 1))}
                      disabled={newsPage >= Math.ceil(newsTotal / NEWS_LIMIT)}
                      className="border-[#30363D] text-gray-400"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* News Dialog */}
            <Dialog open={newsDialogOpen} onOpenChange={setNewsDialogOpen}>
              <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20">
                <DialogHeader><DialogTitle className="text-[#E8DDB5]">Post News</DialogTitle></DialogHeader>
                <form onSubmit={handleNewsSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label className="text-gray-400">Title</Label>
                    <Input value={newsForm.title} onChange={(e) => setNewsForm({...newsForm, title: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" required />
                  </div>
                  <div>
                    <Label className="text-gray-400">Content</Label>
                    <Textarea value={newsForm.content} onChange={(e) => setNewsForm({...newsForm, content: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" rows={3} required />
                  </div>
                  <div>
                    <Label className="text-gray-400">Link (optional)</Label>
                    <Input value={newsForm.link} onChange={(e) => setNewsForm({...newsForm, link: e.target.value})}
                      placeholder="https://..." className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setNewsDialogOpen(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">Cancel</Button>
                    <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Post
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* RSS Feed Dialog */}
            <Dialog open={rssFeedDialogOpen} onOpenChange={setRssFeedDialogOpen}>
              <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20">
                <DialogHeader><DialogTitle className="text-[#E8DDB5]">Add RSS Feed</DialogTitle></DialogHeader>
                <form onSubmit={handleRssFeedSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label className="text-gray-400">Feed Name</Label>
                    <Input value={rssFeedForm.name} onChange={(e) => setRssFeedForm({...rssFeedForm, name: e.target.value})}
                      placeholder="TechCrunch Security" className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" required />
                  </div>
                  <div>
                    <Label className="text-gray-400">RSS Feed URL</Label>
                    <Input value={rssFeedForm.url} onChange={(e) => setRssFeedForm({...rssFeedForm, url: e.target.value})}
                      placeholder="https://feeds.example.com/rss" className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" required />
                    <p className="text-xs text-gray-500 mt-1">Enter the RSS or Atom feed URL</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setRssFeedDialogOpen(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">Cancel</Button>
                    <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Add Feed
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* VIDEOS TAB */}
          <TabsContent value="videos">
            <div className="flex justify-between items-center mb-4">
              <Select value={videoFilter} onValueChange={setVideoFilter}>
                <SelectTrigger className="w-48 bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-[#D4A836]/30">
                  <SelectItem value="all" className="text-[#E8DDB5]">All Categories</SelectItem>
                  {VIDEO_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-[#E8DDB5]">{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => { setEditingVideo(null); setVideoDialogOpen(true); }} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                <Youtube className="w-4 h-4 mr-2" />Add Video
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.filter(v => videoFilter === 'all' || v.category === videoFilter).map((video) => (
                <Card key={video.video_id} className="bg-[#0f0f15] border-[#D4A836]/20 overflow-hidden">
                  <div className="aspect-video bg-black relative">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                      </div>
                    </div>
                    <Badge className="absolute top-2 left-2 bg-black/70 text-white">
                      {VIDEO_CATEGORIES.find(c => c.value === video.category)?.label || video.category}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-[#E8DDB5] font-medium truncate">{video.title}</h3>
                    <p className="text-gray-500 text-sm truncate">{video.description}</p>
                    <div className="flex justify-between items-center mt-3">
                      <Badge className={video.published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                        {video.published ? 'Published' : 'Draft'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleVideoPublished(video)} className="text-gray-400">
                          {video.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteVideo(video.video_id)} className="text-gray-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {videos.filter(v => videoFilter === 'all' || v.category === videoFilter).length === 0 && 
                <p className="col-span-full text-center text-gray-500 py-8">No videos in this category</p>}
            </div>

            {/* Video Dialog */}
            <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
              <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20">
                <DialogHeader><DialogTitle className="text-[#E8DDB5]">Add YouTube Video</DialogTitle></DialogHeader>
                <form onSubmit={handleVideoSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label className="text-gray-400">YouTube URL</Label>
                    <Input value={videoForm.youtube_url} onChange={(e) => setVideoForm({...videoForm, youtube_url: e.target.value})}
                      placeholder="https://www.youtube.com/watch?v=..." className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" required />
                  </div>
                  <div>
                    <Label className="text-gray-400">Title</Label>
                    <Input value={videoForm.title} onChange={(e) => setVideoForm({...videoForm, title: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" required />
                  </div>
                  <div>
                    <Label className="text-gray-400">Description</Label>
                    <Textarea value={videoForm.description} onChange={(e) => setVideoForm({...videoForm, description: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" rows={2} required />
                  </div>
                  <div>
                    <Label className="text-gray-400">Category</Label>
                    <Select value={videoForm.category} onValueChange={(v) => setVideoForm({...videoForm, category: v})}>
                      <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a24] border-[#D4A836]/30">
                        {VIDEO_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value} className="text-[#E8DDB5]">{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={videoForm.published} onChange={(e) => setVideoForm({...videoForm, published: e.target.checked})}
                      className="w-4 h-4" id="vid-published" />
                    <Label htmlFor="vid-published" className="text-gray-400 cursor-pointer">Publish immediately</Label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setVideoDialogOpen(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">Cancel</Button>
                    <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Add Video
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ABOUT TAB */}
          <TabsContent value="about">
            <div className="space-y-6">
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardHeader><CardTitle className="text-[#E8DDB5]">About Page Content</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Title</Label>
                    <Input value={about.title || ''} onChange={(e) => setAbout({...about, title: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" />
                  </div>
                  <div>
                    <Label className="text-gray-400">Main Content</Label>
                    <Suspense fallback={<div className="h-40 bg-[#1a1a24] rounded-lg flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#D4A836]" /></div>}>
                      <RichTextEditor 
                        value={about.content || ''} 
                        onChange={(value) => setAbout({...about, content: value})}
                        placeholder="Write about your company..."
                        token={token}
                      />
                    </Suspense>
                  </div>
                  <div>
                    <Label className="text-gray-400">Mission Statement</Label>
                    <Textarea value={about.mission || ''} onChange={(e) => setAbout({...about, mission: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" rows={2} />
                  </div>
                  <div>
                    <Label className="text-gray-400">Vision Statement</Label>
                    <Textarea value={about.vision || ''} onChange={(e) => setAbout({...about, vision: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" rows={2} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAboutSave} disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save About Page
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-[#E8DDB5]">
                    <Users className="w-5 h-5 inline mr-2" />Team Members
                  </CardTitle>
                  <Button size="sm" onClick={() => { setTeamMemberForm({ name: '', role: '', bio: '', image: '' }); setTeamDialogOpen(true); }}
                    className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                    <Plus className="w-4 h-4 mr-1" />Add Member
                  </Button>
                </CardHeader>
                <CardContent>
                  {(!about.team_members || about.team_members.length === 0) ? (
                    <p className="text-gray-500 text-center py-4">No team members added yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {about.team_members.map((member, index) => (
                        <div key={index} className="bg-[#1a1a24] rounded-lg p-4 flex items-start gap-3">
                          {member.image ? (
                            <img src={member.image} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#D4A836]/20 flex items-center justify-center">
                              <Users className="w-6 h-6 text-[#D4A836]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#E8DDB5] font-medium truncate">{member.name}</h4>
                            <p className="text-[#D4A836] text-sm">{member.role}</p>
                            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{member.bio}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const newMembers = about.team_members.filter((_, i) => i !== index);
                            setAbout({...about, team_members: newMembers});
                          }} className="text-gray-400 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Team Member Dialog */}
            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
              <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20">
                <DialogHeader><DialogTitle className="text-[#E8DDB5]">Add Team Member</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-gray-400">Name</Label>
                    <Input value={teamMemberForm.name} onChange={(e) => setTeamMemberForm({...teamMemberForm, name: e.target.value})}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" />
                  </div>
                  <div>
                    <Label className="text-gray-400">Role/Title</Label>
                    <Input value={teamMemberForm.role} onChange={(e) => setTeamMemberForm({...teamMemberForm, role: e.target.value})}
                      placeholder="e.g., CEO, Security Analyst" className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" />
                  </div>
                  <div>
                    <Label className="text-gray-400">Bio</Label>
                    <Textarea value={teamMemberForm.bio} onChange={(e) => setTeamMemberForm({...teamMemberForm, bio: e.target.value})}
                      placeholder="Short bio..." className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" rows={2} />
                  </div>
                  <div>
                    <Label className="text-gray-400">Photo URL (optional)</Label>
                    <Input value={teamMemberForm.image} onChange={(e) => setTeamMemberForm({...teamMemberForm, image: e.target.value})}
                      placeholder="Upload image first, paste URL here" className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setTeamDialogOpen(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">Cancel</Button>
                    <Button onClick={() => {
                      if (!teamMemberForm.name) { toast.error('Name is required'); return; }
                      const newMembers = [...(about.team_members || []), teamMemberForm];
                      setAbout({...about, team_members: newMembers});
                      setTeamDialogOpen(false);
                      toast.success('Team member added. Don\'t forget to save!');
                    }} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      Add Member
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>


        </Tabs>
      </div>
    </DashboardLayout>
  );
}
