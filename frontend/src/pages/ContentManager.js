import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
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
  Upload, Eye, EyeOff, Image, Youtube, Info, Users, Rss, ExternalLink, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

// Lazy load RichTextEditor to avoid SSR issues
const RichTextEditor = lazy(() => import('../components/RichTextEditor'));

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VIDEO_CATEGORIES = [
  { value: 'training', label: 'Training' },
  { value: 'awareness', label: 'Security Awareness' },
  { value: 'tutorials', label: 'Tutorials' },
  { value: 'news', label: 'News & Updates' },
  { value: 'webinars', label: 'Webinars' },
];

export default function ContentManager() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('blog');
  const [loading, setLoading] = useState(true);
  
  // Blog state
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [blogForm, setBlogForm] = useState({
    title: '', excerpt: '', content: '', tags: '', featured_image: '', published: false
  });
  
  // News state
  const [news, setNews] = useState([]);
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', link: '', published: true });
  
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
  
  // Media state
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const [blogRes, newsRes, videosRes, aboutRes] = await Promise.all([
        axios.get(`${API}/content/blog?published_only=false`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/content/news`),
        axios.get(`${API}/content/videos?published_only=false`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/content/about`)
      ]);
      setBlogPosts(blogRes.data.posts || []);
      setNews(newsRes.data.news || []);
      setVideos(videosRes.data.videos || []);
      setAbout(aboutRes.data);
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
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
          <TabsList className="bg-[#1a1a24] border border-[#D4A836]/20 mb-6">
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
          </TabsList>

          {/* BLOG TAB */}
          <TabsContent value="blog">
            <div className="flex justify-between items-center mb-4">
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
            <div className="flex justify-end mb-4">
              <Button onClick={() => setNewsDialogOpen(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                <Plus className="w-4 h-4 mr-2" />Post News
              </Button>
            </div>

            <div className="grid gap-4">
              {news.map((item) => (
                <Card key={item.news_id} className="bg-[#0f0f15] border-[#D4A836]/20">
                  <CardContent className="p-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-[#E8DDB5] font-medium">{item.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{item.content}</p>
                      <p className="text-gray-500 text-xs mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteNews(item.news_id)} className="text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {news.length === 0 && <p className="text-center text-gray-500 py-8">No news yet</p>}
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
