import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Edit, Trash2, Loader2, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'image'],
    ['clean']
  ]
};

export default function BlogManager() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [useHtml, setUseHtml] = useState(false);
  const [filter, setFilter] = useState('all');
  
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
      toast.error('Failed to load posts');
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
    setUseHtml(false);
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
        toast.success('Post updated');
      } else {
        await axios.post(`${API}/content/blog`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Post created');
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
    if (!window.confirm('Delete this post?')) return;
    
    try {
      await axios.delete(`${API}/content/blog/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Post deleted');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'published') return post.published === true;
    if (filter === 'draft') return post.published === false;
    return true;
  });

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Blog Manager</h1>
            <p className="text-gray-400">Create and manage blog posts</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="bg-[#1a1a24] border border-[#30363D]">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              All ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="published" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              Published ({posts.filter(p => p.published).length})
            </TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">
              Drafts ({posts.filter(p => !p.published).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardContent className="py-16 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No {filter === 'draft' ? 'Draft' : filter === 'published' ? 'Published' : ''} Posts</h3>
                  <p className="text-gray-400 mb-6">Create your first post</p>
                  <Button 
                    onClick={() => { resetForm(); setShowDialog(true); }}
                    className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosts.map((post) => (
                  <Card key={post.post_id} className="bg-[#0f0f15] border-[#D4A836]/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-[#E8DDB5] text-lg line-clamp-2 flex-1">{post.title}</CardTitle>
                        <Badge className={post.published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {post.published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {post.excerpt && <p className="text-gray-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>}
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
                          className="flex-1 border-[#D4A836]/30"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(post.post_id)}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingPost ? 'Edit Post' : 'Create Post'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateOrUpdate} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="How to Secure Your Website..."
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
                <div>
                  <Label>URL Slug (auto-filled)</Label>
                  <Input
                    value={postForm.slug}
                    onChange={(e) => setPostForm({ ...postForm, slug: e.target.value })}
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Excerpt</Label>
                <Textarea
                  value={postForm.excerpt}
                  onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                  placeholder="Brief description..."
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Content</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setUseHtml(!useHtml)}
                    className="border-[#30363D] text-gray-400"
                  >
                    {useHtml ? 'Visual Editor' : 'HTML Editor'}
                  </Button>
                </div>
                {useHtml ? (
                  <Textarea
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                    placeholder="<h2>Your content...</h2>"
                    className="bg-[#1a1a24] border-[#30363D] text-white min-h-[300px] font-mono text-sm"
                    required
                  />
                ) : (
                  <div className="bg-white rounded-lg">
                    <ReactQuill
                      theme="snow"
                      value={postForm.content}
                      onChange={(content) => setPostForm({ ...postForm, content })}
                      modules={quillModules}
                      style={{ minHeight: '300px' }}
                    />
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Audience</Label>
                  <Select value={postForm.audience} onValueChange={(v) => setPostForm({ ...postForm, audience: v })}>
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="end_user">End Users</SelectItem>
                      <SelectItem value="manager">Managers</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={postForm.tags}
                    onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                    placeholder="security, tips, guides"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                  />
                </div>
              </div>

              <div>
                <Label>SEO Meta Description (150-160 chars)</Label>
                <Textarea
                  value={postForm.meta_description}
                  onChange={(e) => setPostForm({ ...postForm, meta_description: e.target.value })}
                  placeholder="SEO description..."
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">{postForm.meta_description.length}/160</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={postForm.published}
                  onChange={(e) => setPostForm({ ...postForm, published: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Publish immediately</Label>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  className="border-[#30363D]"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editingPost ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
