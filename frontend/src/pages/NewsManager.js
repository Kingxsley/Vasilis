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
import { Plus, Edit, Trash2, Loader2, Newspaper } from 'lucide-react';
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

export default function NewsManager() {
  const { token, user } = useAuth();
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
    published: true
  });

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (newsForm.title && !editingNews) {
      const slug = newsForm.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .substring(0, 100);
      setNewsForm(prev => ({ ...prev, slug }));
    }
  }, [newsForm.title, editingNews]);

  const fetchNews = async () => {
    try {
      const res = await axios.get(`${API}/content/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNews(res.data.news || []);
    } catch (error) {
      toast.error('Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewsForm({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: 'general',
      tags: '',
      featured_image: '',
      published: true
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
        tags: newsForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (editingNews) {
        await axios.patch(`${API}/content/news/${editingNews.news_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('News updated');
      } else {
        await axios.post(`${API}/content/news`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('News created');
      }
      
      setShowDialog(false);
      resetForm();
      fetchNews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save news');
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
      published: item.published !== false
    });
    setShowDialog(true);
  };

  const handleDelete = async (newsId) => {
    if (!window.confirm('Delete this news item?')) return;
    
    try {
      await axios.delete(`${API}/content/news/${newsId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('News deleted');
      fetchNews();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-gray-400">Access denied.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">News Manager</h1>
            <p className="text-gray-400">Manage news articles</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add News
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
              <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No News Yet</h3>
              <p className="text-gray-400 mb-6">Create your first article</p>
              <Button 
                onClick={() => { resetForm(); setShowDialog(true); }}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Article
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
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(item)}
                      className="flex-1 border-[#D4A836]/30"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.news_id)}
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

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">
                {editingNews ? 'Edit News' : 'Create News'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateOrUpdate} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    placeholder="Breaking News: ..."
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
                <div>
                  <Label>URL Slug (auto-filled)</Label>
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
                  placeholder="Brief summary..."
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
                    value={newsForm.content}
                    onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                    placeholder="<h2>Your content...</h2>"
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
                    placeholder="security, updates"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                  />
                </div>
                <div>
                  <Label>Featured Image URL</Label>
                  <Input
                    value={newsForm.featured_image}
                    onChange={(e) => setNewsForm({ ...newsForm, featured_image: e.target.value })}
                    placeholder="https://..."
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
                  {editingNews ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
