import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Edit, Trash2, Loader2, Eye, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BlogManager() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  
  const [postForm, setPostForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    tags: '',
    meta_description: '',
    audience: 'general',
    published: true,
    featured_image: ''
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (postForm.title && !editingPost) {
      const slug = postForm.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .substring(0, 100);
      setPostForm(prev => ({ ...prev, slug }));
    }
  }, [postForm.title, editingPost]);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/content/blog`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(res.data.posts || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPostForm({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      tags: '',
      meta_description: '',
      audience: 'general',
      published: true,
      featured_image: ''
    });
    setEditingPost(null);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = {
        ...postForm,
        tags: postForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (editingPost) {
        await axios.patch(`${API}/content/blog/${editingPost.post_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Blog post updated');
      } else {
        await axios.post(`${API}/content/blog`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Blog post created');
      }
      
      setShowDialog(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      tags: (post.tags || []).join(', '),
      meta_description: post.meta_description || '',
      audience: post.audience || 'general',
      published: post.published !== false,
      featured_image: post.featured_image || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await axios.delete(`${API}/content/blog/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Post deleted');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      await axios.patch(`${API}/content/blog/${post.post_id}`, {
        published: !post.published
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(post.published ? 'Post unpublished' : 'Post published');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to update post');
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-gray-400">Access denied. Super admin only.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Blog Manager</h1>
            <p className="text-gray-400">Create, edit, and manage blog posts</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No Blog Posts Yet</h3>
              <p className="text-gray-400 mb-6">Create your first post to get started</p>
              <Button 
                onClick={() => { resetForm(); setShowDialog(true); }}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Card key={post.post_id} className="bg-[#0f0f15] border-[#D4A836]/20 hover:border-[#D4A836]/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-[#E8DDB5] text-lg line-clamp-2">{post.title}</CardTitle>
                      <CardDescription className="text-gray-500 text-sm mt-1">
                        /{post.slug}
                      </CardDescription>
                    </div>
                    <Badge className={post.published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                      {post.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {post.excerpt && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Badge variant="outline" className="text-xs border-[#D4A836]/30 text-[#D4A836]">
                      {post.audience}
                    </Badge>
                    {post.tags && post.tags.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-gray-600 text-gray-400">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(post)}
                      className="flex-1 border-[#D4A836]/30 text-[#E8DDB5] hover:bg-[#D4A836]/10"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePublish(post)}
                      className="text-gray-400 hover:text-[#E8DDB5]"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(post.post_id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingPost ? 'Edit Blog Post' : 'Create New Blog Post'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingPost ? 'Update your blog post' : 'Write and publish a new blog post'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateOrUpdate} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Post Title</Label>
                  <Input
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="How to Secure Your Website..."
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-400">URL Slug (auto-filled)</Label>
                  <Input
                    value={postForm.slug}
                    onChange={(e) => setPostForm({ ...postForm, slug: e.target.value })}
                    placeholder="how-to-secure-your-website"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Excerpt (Short Summary)</Label>
                <Textarea
                  value={postForm.excerpt}
                  onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                  placeholder="Brief description that appears in listings..."
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-gray-400">Content (HTML)</Label>
                <Textarea
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  placeholder="<h2>Introduction</h2><p>Your content here...</p>"
                  className="bg-[#1a1a24] border-[#30363D] text-white min-h-[300px] font-mono text-sm"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Audience</Label>
                  <Select value={postForm.audience} onValueChange={(v) => setPostForm({ ...postForm, audience: v })}>
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="end_user">End Users</SelectItem>
                      <SelectItem value="manager">Managers/Decision Makers</SelectItem>
                      <SelectItem value="technical">Technical/IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400">Tags (comma-separated)</Label>
                  <Input
                    value={postForm.tags}
                    onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                    placeholder="security, phishing, tips"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400">SEO Meta Description (150-160 chars)</Label>
                <Textarea
                  value={postForm.meta_description}
                  onChange={(e) => setPostForm({ ...postForm, meta_description: e.target.value })}
                  placeholder="SEO-optimized description for search engines..."
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">{postForm.meta_description.length}/160 characters</p>
              </div>

              <div>
                <Label className="text-gray-400">Featured Image URL (optional)</Label>
                <Input
                  value={postForm.featured_image}
                  onChange={(e) => setPostForm({ ...postForm, featured_image: e.target.value })}
                  placeholder="https://..."
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={postForm.published}
                  onChange={(e) => setPostForm({ ...postForm, published: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label className="text-gray-400">Publish immediately</Label>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  className="border-[#30363D] text-gray-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {editingPost ? 'Update Post' : 'Create Post'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
