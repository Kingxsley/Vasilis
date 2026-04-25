import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import {
  Plus, Edit, Trash2, Loader2, FileText, Search, X, Copy, Archive,
  ArchiveRestore, Eye, EyeOff, MoreVertical, ChevronLeft, ChevronRight,
  CheckCircle2, FileEdit, FileX, Tag as TagIcon, Calendar, User, Image as ImageIcon,
  Upload, AlertCircle, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import '../styles/quill-dark.css';
import MediaPicker from '../components/MediaPicker';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAGE_SIZE = 20;

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

const STATUS_META = {
  published: { label: 'Published', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  draft:     { label: 'Draft',     cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',       icon: FileEdit },
  archived:  { label: 'Archived',  cls: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',           icon: Archive },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function StatTile({ label, value, accent, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left px-4 py-3 rounded-xl border transition-all hover:scale-[1.01] ${
        active
          ? 'bg-[#D4A836]/10 border-[#D4A836]/40 shadow-[0_0_0_1px_#D4A836]/20'
          : 'bg-[#0f0f15] border-[#30363D] hover:border-[#D4A836]/30'
      }`}
    >
      <div className={`text-[11px] uppercase tracking-wider ${accent || 'text-gray-400'}`}>{label}</div>
      <div className="text-2xl font-bold text-[#E8DDB5] mt-1">{value}</div>
    </button>
  );
}

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function BlogManager() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, archived: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPosts, setImportPosts] = useState([]);  // parsed queue
  const [importUploading, setImportUploading] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResults, setImportResults] = useState([]); // {title, status, msg}
  const [showDialog, setShowDialog] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [useHtml, setUseHtml] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all'); // all | published | draft | archived
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput, 300);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState('featured_image');
  const quillRef = useRef(null);

  const [postForm, setPostForm] = useState({
    title: '', slug: '', excerpt: '', content: '',
    tags: '', meta_description: '', audience: 'general',
    status: 'draft', featured_image: '',
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({
        status: statusFilter,
        limit: String(PAGE_SIZE),
        skip: String(skip),
        sort,
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await axios.get(`${API}/content/blog?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data.posts || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, page, search, sort]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/content/blog/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data || { total: 0, published: 0, draft: 0, archived: 0 });
    } catch (e) {
      // ignore
    }
  }, [token]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const seedBlogPosts = async () => {
    if (!window.confirm('Seed 30 SEO-rich blog posts? Existing slugs will be skipped.')) return;
    setSeeding(true);
    try {
      const res = await axios.post(`${API}/content/blog/seed`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { created, skipped, errors } = res.data;
      toast.success(`✓ Created ${created} posts · Skipped ${skipped} · Errors ${errors}`);
      fetchPosts();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  // ── HTML Batch Import ──
  const slugify = (str) =>
    str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 80);

  const extractBodyHtml = (raw) => {
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) return bodyMatch[1].trim();
    return raw.replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?body[^>]*>/gi, '').trim();
  };

  const parseHtmlPosts = (raw) => {
    // Try JSON array first
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr.filter(p => p.title && p.content).map(p => ({
          title: p.title,
          slug: p.slug || slugify(p.title),
          excerpt: p.excerpt || '',
          content: p.content,
          tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
          audience: p.audience || 'general',
          meta_title: p.meta_title || p.title.substring(0, 60),
          meta_description: p.meta_description || p.excerpt || '',
          status: 'ready',
        }));
      }
    } catch (_) {}

    // Try splitting by delimiter <!-- POST --> or === POST ===
    const delimiter = /<!--\s*POST\s*-->|={3,}\s*POST\s*={3,}/gi;
    const chunks = raw.split(delimiter).map(c => c.trim()).filter(Boolean);

    if (chunks.length > 1) {
      return chunks.map((chunk) => {
        const titleMatch = chunk.match(/<h1[^>]*>([^<]+)<\/h1>/i) || chunk.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Post';
        const content = extractBodyHtml(chunk);
        return {
          title, slug: slugify(title), excerpt: '', content,
          tags: '', audience: 'general',
          meta_title: title.substring(0, 60), meta_description: '',
          status: 'ready',
        };
      });
    }

    // Single HTML post — treat entire paste as one post
    const titleMatch = raw.match(/<h1[^>]*>([^<]+)<\/h1>/i) || raw.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Imported Post';
    const content = extractBodyHtml(raw);
    return [{ title, slug: slugify(title), excerpt: '', content, tags: '', audience: 'general', meta_title: title.substring(0, 60), meta_description: '', status: 'ready' }];
  };

  const handleImportPaste = (e) => {
    const raw = e.target.value;
    if (!raw.trim()) { setImportPosts([]); return; }
    try {
      const parsed = parseHtmlPosts(raw);
      setImportPosts(parsed.map((p, i) => ({ ...p, id: i })));
      setImportResults([]);
    } catch (err) {
      toast.error('Could not parse content: ' + err.message);
    }
  };

  const updateImportPost = (idx, field, value) => {
    setImportPosts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removeImportPost = (idx) => {
    setImportPosts(prev => prev.filter((_, i) => i !== idx));
  };

  const runBatchUpload = async () => {
    if (importPosts.length === 0) return;
    setImportUploading(true);
    setImportResults([]);
    setImportProgress({ done: 0, total: importPosts.length });
    const results = [];
    for (let i = 0; i < importPosts.length; i++) {
      const p = importPosts[i];
      try {
        const payload = {
          title: p.title, slug: p.slug, excerpt: p.excerpt, content: p.content,
          tags: typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : p.tags,
          audience: p.audience,
          meta_title: p.meta_title, meta_description: p.meta_description,
          published: true, status: 'published',
        };
        const res = await axios.post(`${API}/content/blog`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        results.push({ title: p.title, status: 'success', msg: 'Created' });
      } catch (e) {
        const detail = e.response?.data?.detail || e.message;
        const isSkip = detail?.toLowerCase().includes('slug') || e.response?.status === 409;
        results.push({ title: p.title, status: isSkip ? 'skipped' : 'error', msg: detail });
      }
      setImportProgress({ done: i + 1, total: importPosts.length });
      setImportResults([...results]);
      await new Promise(r => setTimeout(r, 120));
    }
    setImportUploading(false);
    const created = results.filter(r => r.status === 'success').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors  = results.filter(r => r.status === 'error').length;
    toast.success(`Upload complete: ${created} created · ${skipped} skipped · ${errors} errors`);
    fetchPosts(); fetchStats();
  };

  // Reset import dialog
  const openImportDialog = () => {
    setImportPosts([]);
    setImportResults([]);
    setImportProgress({ done: 0, total: 0 });
    setShowImportDialog(true);
  };

  // Reset to page 1 when filters/search change
  useEffect(() => { setPage(1); }, [statusFilter, search, sort]);

  // Auto-generate slug
  useEffect(() => {
    if (postForm.title && !editingPost) {
      const slug = postForm.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .substring(0, 100);
      setPostForm((prev) => ({ ...prev, slug }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postForm.title]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetForm = () => {
    setPostForm({
      title: '', slug: '', excerpt: '', content: '',
      tags: '', meta_description: '', audience: 'general',
      status: 'draft', featured_image: '',
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
        tags: postForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (editingPost) {
        await axios.patch(`${API}/content/blog/${editingPost.post_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Post updated');
      } else {
        await axios.post(`${API}/content/blog`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Post created');
      }
      setShowDialog(false);
      resetForm();
      fetchPosts();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      tags: (post.tags || []).join(', '),
      meta_description: post.meta_description || '',
      audience: post.audience || 'general',
      status: post.status || (post.published ? 'published' : 'draft'),
      featured_image: post.featured_image || '',
    });
    setShowDialog(true);
  };

  const changeStatus = async (postId, newStatus) => {
    try {
      await axios.patch(`${API}/content/blog/${postId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Marked as ${newStatus}`);
      fetchPosts();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to change status');
    }
  };

  const duplicate = async (postId) => {
    try {
      await axios.post(`${API}/content/blog/${postId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Post duplicated');
      fetchPosts();
      fetchStats();
    } catch (e) {
      toast.error('Failed to duplicate');
    }
  };

  const deleteOne = async (postId, permanent = false) => {
    const msg = permanent
      ? 'Permanently delete this post? This cannot be undone.'
      : 'Archive this post? You can restore it from the Archived tab.';
    if (!window.confirm(msg)) return;
    try {
      await axios.delete(`${API}/content/blog/${postId}?permanent=${permanent}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(permanent ? 'Post deleted' : 'Post archived');
      fetchPosts();
      fetchStats();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    if (selectedIds.size === posts.length && posts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.post_id)));
    }
  };

  const runBulk = async (action) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const confirmMsg = action === 'delete'
      ? `Permanently delete ${ids.length} post(s)? This cannot be undone.`
      : `Apply "${action}" to ${ids.length} post(s)?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await axios.post(`${API}/content/blog/bulk`, {
        post_ids: ids, action,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`${res.data.affected} post(s) updated`);
      setSelectedIds(new Set());
      fetchPosts();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Bulk action failed');
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

  const allOnPageSelected = posts.length > 0 && selectedIds.size === posts.length;
  const someSelected = selectedIds.size > 0;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#D4A836]" />
              Blog Posts
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Create, edit and manage individual blog articles. {total} {total === 1 ? 'post' : 'posts'} matching current filter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={openImportDialog}
              variant="outline"
              className="border-[#30363D] text-[#E8DDB5] hover:bg-white/5"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import HTML
            </Button>
            <Button
              onClick={seedBlogPosts}
              disabled={seeding}
              variant="outline"
              className="border-[#D4A836]/40 text-[#D4A836] hover:bg-[#D4A836]/10"
            >
              {seeding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Seeding…</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" />Seed 30 Blog Posts</>
              )}
            </Button>
            <Button
              onClick={() => { resetForm(); setShowDialog(true); }}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        {/* Stats / status filter tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="All Posts"  value={stats.total}      active={statusFilter === 'all'}       onClick={() => setStatusFilter('all')} />
          <StatTile label="Published"  value={stats.published}  accent="text-emerald-400" active={statusFilter === 'published'} onClick={() => setStatusFilter('published')} />
          <StatTile label="Drafts"     value={stats.draft}      accent="text-amber-400"   active={statusFilter === 'draft'}     onClick={() => setStatusFilter('draft')} />
          <StatTile label="Archived"   value={stats.archived}   accent="text-zinc-400"    active={statusFilter === 'archived'}  onClick={() => setStatusFilter('archived')} />
        </div>

        {/* Search + sort + bulk toolbar */}
        <Card className="bg-[#0f0f15] border-[#30363D]">
          <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title, excerpt, content, or tag…"
                className="bg-[#1a1a24] border-[#30363D] text-white pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full md:w-[180px] bg-[#1a1a24] border-[#30363D] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="title">Title (A→Z)</SelectItem>
              </SelectContent>
            </Select>

            {someSelected && (
              <div className="flex items-center gap-2 flex-wrap pl-2 border-l border-[#30363D] md:ml-2">
                <span className="text-xs text-[#D4A836] font-medium px-2">
                  {selectedIds.size} selected
                </span>
                <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                        onClick={() => runBulk('publish')}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Publish
                </Button>
                <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                        onClick={() => runBulk('unpublish')}>
                  <EyeOff className="w-3.5 h-3.5 mr-1" /> Unpublish
                </Button>
                <Button size="sm" variant="outline" className="border-zinc-500/30 text-zinc-300 hover:bg-zinc-500/10"
                        onClick={() => runBulk('archive')}>
                  <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                </Button>
                {statusFilter === 'archived' && (
                  <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                          onClick={() => runBulk('restore')}>
                    <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Restore
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        onClick={() => runBulk('delete')}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs (extra navigation) */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-[#1a1a24] border border-[#30363D]">
            <TabsTrigger value="all"       className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">All</TabsTrigger>
            <TabsTrigger value="published" className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">Published</TabsTrigger>
            <TabsTrigger value="draft"     className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">Drafts</TabsTrigger>
            <TabsTrigger value="archived"  className="data-[state=active]:bg-[#D4A836] data-[state=active]:text-black">Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Select-all helper */}
        {posts.length > 0 && (
          <div className="flex items-center gap-2 px-1 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={selectAllOnPage}
              className="w-4 h-4 accent-[#D4A836]"
            />
            <span>Select all on this page ({posts.length})</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="py-16 text-center">
              <FileX className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">No posts found</h3>
              <p className="text-gray-400 mb-6">
                {search ? 'Try a different search query.' : 'Create your first post to get started.'}
              </p>
              <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                <Plus className="w-4 h-4 mr-2" /> Create Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => {
              const selected = selectedIds.has(post.post_id);
              return (
                <Card
                  key={post.post_id}
                  className={`bg-[#0f0f15] border transition-all ${
                    selected ? 'border-[#D4A836] shadow-[0_0_0_1px_#D4A836]/30' : 'border-[#D4A836]/20 hover:border-[#D4A836]/40'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(post.post_id)}
                        className="mt-1 w-4 h-4 accent-[#D4A836]"
                        aria-label={`Select ${post.title}`}
                      />
                      <CardTitle className="text-[#E8DDB5] text-base leading-snug line-clamp-2 flex-1">
                        {post.title}
                      </CardTitle>
                      <StatusBadge status={post.status || (post.published ? 'published' : 'draft')} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {post.excerpt && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 mb-3 text-[11px] text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{post.created_at ? new Date(post.created_at).toLocaleDateString() : '—'}</span>
                      <span className="mx-1">·</span>
                      <User className="w-3 h-3" />
                      <span className="truncate">{post.author_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {post.audience && (
                        <Badge variant="outline" className="text-[10px] border-[#D4A836]/30 text-[#D4A836]">
                          {post.audience}
                        </Badge>
                      )}
                      {(post.tags || []).slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-gray-600 text-gray-400">
                          <TagIcon className="w-2.5 h-2.5 mr-1" />{tag}
                        </Badge>
                      ))}
                      {post.tags && post.tags.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{post.tags.length - 3}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(post)} className="border-[#D4A836]/30">
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>

                      {/* Quick status actions */}
                      {(post.status === 'draft' || post.status === 'archived') && (
                        <Button size="sm" variant="ghost" onClick={() => changeStatus(post.post_id, 'published')}
                                className="text-emerald-300 hover:bg-emerald-500/10" title="Publish">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      {post.status === 'published' && (
                        <Button size="sm" variant="ghost" onClick={() => changeStatus(post.post_id, 'draft')}
                                className="text-amber-300 hover:bg-amber-500/10" title="Move to draft">
                          <FileEdit className="w-4 h-4" />
                        </Button>
                      )}
                      {post.status !== 'archived' && (
                        <Button size="sm" variant="ghost" onClick={() => changeStatus(post.post_id, 'archived')}
                                className="text-zinc-300 hover:bg-zinc-500/10" title="Archive">
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                      {post.status === 'archived' && (
                        <Button size="sm" variant="ghost" onClick={() => changeStatus(post.post_id, 'draft')}
                                className="text-blue-300 hover:bg-blue-500/10" title="Restore">
                          <ArchiveRestore className="w-4 h-4" />
                        </Button>
                      )}

                      <Button size="sm" variant="ghost" onClick={() => duplicate(post.post_id)}
                              className="text-gray-300 hover:bg-white/10" title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </Button>

                      <Button size="sm" variant="ghost" onClick={() => deleteOne(post.post_id, post.status === 'archived')}
                              className="text-red-400 hover:bg-red-500/10 ml-auto" title={post.status === 'archived' ? 'Delete permanently' : 'Archive'}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-[#30363D] pt-4">
            <div className="text-sm text-gray-400">
              Page {page} of {totalPages} · Showing {posts.length} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="border-[#30363D]">
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              {/* Page number bubbles - up to 7 */}
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let p;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm transition ${
                      p === page
                        ? 'bg-[#D4A836] text-black font-semibold'
                        : 'bg-[#1a1a24] border border-[#30363D] text-gray-300 hover:border-[#D4A836]/40'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="border-[#30363D]">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Create / Edit Dialog */}
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
                  <Label>Title *</Label>
                  <Input
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="How to Secure Your Website…"
                    className="bg-[#1a1a24] border-[#30363D] text-white"
                    required
                  />
                </div>
                <div>
                  <Label>URL Slug</Label>
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
                  placeholder="Brief description…"
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Content</Label>
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => setUseHtml(!useHtml)} className="border-[#30363D] text-gray-400">
                    {useHtml ? 'Visual Editor' : 'HTML Editor'}
                  </Button>
                </div>
                {useHtml ? (
                  <Textarea
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                    placeholder="<h2>Your content…</h2>"
                    className="bg-[#1a1a24] border-[#30363D] text-white min-h-[300px] font-mono text-sm"
                    required
                  />
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        type="button" size="sm" variant="outline"
                        onClick={() => { setMediaPickerTarget('content'); setShowMediaPicker(true); }}
                        className="border-[#D4A836]/40 text-[#D4A836] hover:bg-[#D4A836]/10"
                        data-testid="blog-content-media-btn"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Insert image from Library
                      </Button>
                      <span className="text-xs text-gray-500">(inserts at cursor, or at the end of the article)</span>
                    </div>
                    <div className="bg-white rounded-lg">
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={postForm.content}
                        onChange={(content) => setPostForm({ ...postForm, content })}
                        modules={quillModules}
                        style={{ minHeight: '300px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={postForm.status} onValueChange={(v) => setPostForm({ ...postForm, status: v })}>
                    <SelectTrigger className="bg-[#1a1a24] border-[#30363D] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <Label>Featured Image</Label>
                <div className="flex gap-2">
                  <Input
                    value={postForm.featured_image}
                    onChange={(e) => setPostForm({ ...postForm, featured_image: e.target.value })}
                    placeholder="https://... or pick from Media Library"
                    className="bg-[#1a1a24] border-[#30363D] text-white flex-1"
                    data-testid="blog-featured-image-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setMediaPickerTarget('featured_image'); setShowMediaPicker(true); }}
                    className="border-[#D4A836]/40 text-[#D4A836] hover:bg-[#D4A836]/10"
                    data-testid="blog-featured-image-media-btn"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Media Library
                  </Button>
                </div>
                {postForm.featured_image && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[#30363D] bg-[#1a1a24]">
                    <img src={postForm.featured_image} alt="Featured preview" className="max-h-40 w-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <Label>SEO Meta Description (150–160 chars)</Label>
                <Textarea
                  value={postForm.meta_description}
                  onChange={(e) => setPostForm({ ...postForm, meta_description: e.target.value })}
                  placeholder="SEO description…"
                  className="bg-[#1a1a24] border-[#30363D] text-white"
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">{(postForm.meta_description || '').length}/160</p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-[#30363D]">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editingPost ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Media Library Picker for featured image + Quill content insertion */}
        <MediaPicker
          open={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url, meta) => {
            if (mediaPickerTarget === 'featured_image') {
              setPostForm((prev) => ({ ...prev, featured_image: url }));
              return;
            }
            if (mediaPickerTarget === 'content') {
              const alt = meta?.alt_text || '';
              const imgTag = `<p><img src="${url}" alt="${alt}" style="max-width:100%;height:auto;" /></p>`;
              try {
                const editor = quillRef.current?.getEditor?.();
                if (editor) {
                  const range = editor.getSelection(true);
                  const insertAt = range ? range.index : editor.getLength();
                  editor.clipboard.dangerouslyPasteHTML(insertAt, imgTag);
                } else {
                  setPostForm((prev) => ({ ...prev, content: (prev.content || '') + imgTag }));
                }
              } catch (_) {
                setPostForm((prev) => ({ ...prev, content: (prev.content || '') + imgTag }));
              }
            }
          }}
        />
      </div>
      {/* ── HTML Batch Import Dialog ── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-[#0f0f15] border-[#30363D] text-[#E8DDB5] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#D4A836]" />
              Batch Import HTML Blog Posts
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Instructions */}
            <div className="bg-[#D4A836]/8 border border-[#D4A836]/20 rounded-lg p-3 text-xs text-[#E8DDB5]/70 space-y-1">
              <p><strong className="text-[#D4A836]">Supported formats:</strong></p>
              <p>• <strong>Single HTML post</strong> — paste any HTML page, Word export, or Notion export</p>
              <p>• <strong>Multiple posts</strong> — separate each post with <code className="bg-black/30 px-1 rounded">&lt;!-- POST --&gt;</code> on its own line</p>
              <p>• <strong>JSON array</strong> — paste a JSON array with title, content, slug, tags, excerpt fields</p>
            </div>

            {/* Paste area */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">Paste HTML / JSON content</Label>
              <textarea
                className="w-full h-48 bg-[#09090f] border border-[#30363D] rounded-lg p-3 text-xs text-[#E8DDB5] font-mono resize-none outline-none focus:border-[#D4A836] transition-colors"
                placeholder={'Paste HTML, Word export, Notion export, or JSON array here...\n\nFor multiple posts, separate with:\n<!-- POST -->\n\nOr paste a JSON array: [{"title":"...","content":"..."}]'}
                onChange={handleImportPaste}
              />
              {importPosts.length > 0 && (
                <p className="text-xs text-[#D4A836]">✓ Detected {importPosts.length} post{importPosts.length !== 1 ? 's' : ''} — review below before uploading</p>
              )}
            </div>

            {/* Parsed post queue */}
            {importPosts.length > 0 && importResults.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Review & Edit Before Upload</p>
                {importPosts.map((p, idx) => (
                  <div key={p.id} className="bg-[#16161f] border border-[#30363D] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#D4A836]">Post {idx + 1}</span>
                      <button
                        onClick={() => removeImportPost(idx)}
                        className="text-gray-500 hover:text-red-400 text-xs"
                      >✕ Remove</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Title *</Label>
                        <Input
                          value={p.title}
                          onChange={e => updateImportPost(idx, 'title', e.target.value)}
                          className="bg-[#09090f] border-[#30363D] text-[#E8DDB5] text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Slug</Label>
                        <Input
                          value={p.slug}
                          onChange={e => updateImportPost(idx, 'slug', e.target.value)}
                          className="bg-[#09090f] border-[#30363D] text-[#E8DDB5] text-xs h-8 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Excerpt</Label>
                        <Input
                          value={p.excerpt}
                          onChange={e => updateImportPost(idx, 'excerpt', e.target.value)}
                          placeholder="Short summary..."
                          className="bg-[#09090f] border-[#30363D] text-[#E8DDB5] text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Tags (comma-separated)</Label>
                        <Input
                          value={p.tags}
                          onChange={e => updateImportPost(idx, 'tags', e.target.value)}
                          placeholder="security, phishing, training"
                          className="bg-[#09090f] border-[#30363D] text-[#E8DDB5] text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Audience</Label>
                        <select
                          value={p.audience}
                          onChange={e => updateImportPost(idx, 'audience', e.target.value)}
                          className="w-full bg-[#09090f] border border-[#30363D] rounded text-[#E8DDB5] text-xs h-8 px-2"
                        >
                          <option value="general">General</option>
                          <option value="manager">Manager / Executive</option>
                          <option value="technical">Technical</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Meta Title (SEO)</Label>
                        <Input
                          value={p.meta_title}
                          onChange={e => updateImportPost(idx, 'meta_title', e.target.value)}
                          placeholder="60-char SEO title"
                          className="bg-[#09090f] border-[#30363D] text-[#E8DDB5] text-xs h-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Meta Description (SEO)</Label>
                      <Input
                        value={p.meta_description}
                        onChange={e => updateImportPost(idx, 'meta_description', e.target.value)}
                        placeholder="155-char description for search results"
                        className="bg-[#09090f] border-[#30363D] text-[#E8DDB5] text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Content preview</Label>
                      <div className="bg-[#09090f] border border-[#30363D] rounded p-2 text-xs text-gray-500 max-h-16 overflow-hidden font-mono">
                        {p.content.replace(/<[^>]+>/g, ' ').substring(0, 200)}…
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress & results */}
            {importResults.length > 0 && (
              <div className="space-y-2">
                {importUploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Uploading…</span>
                      <span>{importProgress.done}/{importProgress.total}</span>
                    </div>
                    <div className="w-full bg-[#1a1a24] rounded-full h-1.5">
                      <div
                        className="bg-[#D4A836] h-1.5 rounded-full transition-all"
                        style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                      r.status === 'success' ? 'bg-emerald-500/10 text-emerald-300' :
                      r.status === 'skipped' ? 'bg-amber-500/10 text-amber-300' :
                      'bg-red-500/10 text-red-300'
                    }`}>
                      {r.status === 'success' ? <CheckCircle className="w-3 h-3 shrink-0" /> :
                       r.status === 'skipped' ? <AlertCircle className="w-3 h-3 shrink-0" /> :
                       <X className="w-3 h-3 shrink-0" />}
                      <span className="truncate font-medium">{r.title}</span>
                      <span className="ml-auto shrink-0 opacity-70">{r.msg}</span>
                    </div>
                  ))}
                </div>
                {!importUploading && (
                  <p className="text-xs text-center text-gray-400">
                    ✓ {importResults.filter(r=>r.status==='success').length} created &nbsp;·&nbsp;
                    ~ {importResults.filter(r=>r.status==='skipped').length} skipped &nbsp;·&nbsp;
                    ✗ {importResults.filter(r=>r.status==='error').length} errors
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[#30363D] pt-3 mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{importPosts.length} post{importPosts.length !== 1 ? 's' : ''} in queue</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImportDialog(false)} className="border-[#30363D] text-gray-400 hover:text-white text-sm">
                Close
              </Button>
              <Button
                onClick={runBatchUpload}
                disabled={importPosts.length === 0 || importUploading}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold text-sm"
              >
                {importUploading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading {importProgress.done}/{importProgress.total}…</>
                  : <><Upload className="w-4 h-4 mr-2" />Upload {importPosts.length} Post{importPosts.length !== 1 ? 's' : ''}</>
                }
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
