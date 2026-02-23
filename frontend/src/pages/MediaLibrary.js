import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Upload, Trash2, Loader2, Image, Copy, Check, Search, 
  Filter, Grid, List, X, Edit2, FolderOpen 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MediaLibrary() {
  const { token } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editingMedia, setEditingMedia] = useState(null);
  const fileInputRef = useRef(null);

  const categories = [
    { value: 'all', label: 'All Media' },
    { value: 'logo', label: 'Logos' },
    { value: 'blog', label: 'Blog Images' },
    { value: 'content', label: 'Content' },
    { value: 'general', label: 'General' }
  ];

  useEffect(() => {
    fetchMedia();
  }, [selectedCategory]);

  const fetchMedia = async () => {
    try {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const response = await axios.get(`${API}/media${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedia(response.data.media || []);
    } catch (error) {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type`);
        failCount++;
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        failCount++;
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'general');
      formData.append('alt_text', file.name);

      try {
        const response = await axios.post(`${API}/media/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        successCount++;
        
        if (response.data.savings_percent > 0) {
          toast.success(`${file.name} optimized (${response.data.savings_percent}% smaller)`);
        }
      } catch (error) {
        toast.error(`${file.name}: Upload failed`);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
      fetchMedia();
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Delete this media item?')) return;

    try {
      await axios.delete(`${API}/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Media deleted');
      fetchMedia();
      if (selectedMedia?.media_id === mediaId) {
        setSelectedMedia(null);
      }
    } catch (error) {
      toast.error('Failed to delete media');
    }
  };

  const handleCopyUrl = (dataUrl, mediaId) => {
    navigator.clipboard.writeText(dataUrl);
    setCopiedId(mediaId);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateMedia = async (mediaId, altText, category) => {
    try {
      const formData = new FormData();
      if (altText) formData.append('alt_text', altText);
      if (category) formData.append('category', category);

      await axios.patch(`${API}/media/${mediaId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Media updated');
      fetchMedia();
      setEditingMedia(null);
    } catch (error) {
      toast.error('Failed to update media');
    }
  };

  const filteredMedia = media.filter(item => 
    item.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.alt_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="media-library-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Media Library
            </h1>
            <p className="text-gray-400 mt-1">Manage your images and media files</p>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              multiple
              data-testid="media-upload-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              data-testid="upload-media-btn"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Media
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1a1a24] border-[#D4A836]/30"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#1a1a24] border border-[#D4A836]/30 rounded-md px-3 py-2 text-[#E8DDB5]"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            
            <div className="flex border border-[#D4A836]/30 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-[#D4A836]/20' : 'bg-[#1a1a24]'}`}
              >
                <Grid className="w-4 h-4 text-[#E8DDB5]" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-[#D4A836]/20' : 'bg-[#1a1a24]'}`}
              >
                <List className="w-4 h-4 text-[#E8DDB5]" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="py-12 text-center">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 mb-4">No media files yet</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Media
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.media_id}
                className={`group relative bg-[#1a1a24] border rounded-lg overflow-hidden cursor-pointer transition-all hover:border-[#D4A836]/60 ${
                  selectedMedia?.media_id === item.media_id ? 'border-[#D4A836] ring-2 ring-[#D4A836]/30' : 'border-[#D4A836]/20'
                }`}
                onClick={() => setSelectedMedia(item)}
              >
                <div className="aspect-square bg-[#0f0f15] flex items-center justify-center p-2">
                  <img
                    src={item.data_url}
                    alt={item.alt_text || item.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-2 border-t border-[#D4A836]/10">
                  <p className="text-xs text-[#E8DDB5] truncate">{item.filename}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
                </div>
                
                {/* Quick Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyUrl(item.data_url, item.media_id); }}
                    className="p-2 bg-[#D4A836] rounded-lg hover:bg-[#C49A30] transition-colors"
                    title="Copy URL"
                  >
                    {copiedId === item.media_id ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.media_id); }}
                    className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredMedia.map((item) => (
              <div
                key={item.media_id}
                className={`flex items-center gap-4 p-3 bg-[#1a1a24] border rounded-lg cursor-pointer transition-all hover:border-[#D4A836]/60 ${
                  selectedMedia?.media_id === item.media_id ? 'border-[#D4A836]' : 'border-[#D4A836]/20'
                }`}
                onClick={() => setSelectedMedia(item)}
              >
                <div className="w-16 h-16 bg-[#0f0f15] rounded flex items-center justify-center flex-shrink-0">
                  <img
                    src={item.data_url}
                    alt={item.alt_text || item.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#E8DDB5] font-medium truncate">{item.filename}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(item.size)} • {item.category} • {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleCopyUrl(item.data_url, item.media_id); }}
                    className="text-gray-400 hover:text-[#D4A836]"
                  >
                    {copiedId === item.media_id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.media_id); }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Media Detail Panel */}
        {selectedMedia && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMedia(null)}>
            <div className="bg-[#0f0f15] border border-[#D4A836]/30 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#D4A836]/20">
                <h3 className="text-lg font-semibold text-[#E8DDB5]">Media Details</h3>
                <button onClick={() => setSelectedMedia(null)} className="text-gray-400 hover:text-[#E8DDB5]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 p-6">
                {/* Preview */}
                <div className="bg-[#1a1a24] rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                  <img
                    src={selectedMedia.data_url}
                    alt={selectedMedia.alt_text || selectedMedia.filename}
                    className="max-w-full max-h-[300px] object-contain"
                  />
                </div>
                
                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Filename</Label>
                    <p className="text-[#E8DDB5]">{selectedMedia.filename}</p>
                  </div>
                  
                  <div>
                    <Label className="text-gray-400">Alt Text</Label>
                    {editingMedia?.media_id === selectedMedia.media_id ? (
                      <Input
                        value={editingMedia.alt_text}
                        onChange={(e) => setEditingMedia({ ...editingMedia, alt_text: e.target.value })}
                        className="bg-[#1a1a24] border-[#D4A836]/30"
                      />
                    ) : (
                      <p className="text-[#E8DDB5]">{selectedMedia.alt_text || '-'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-gray-400">Category</Label>
                    {editingMedia?.media_id === selectedMedia.media_id ? (
                      <select
                        value={editingMedia.category}
                        onChange={(e) => setEditingMedia({ ...editingMedia, category: e.target.value })}
                        className="w-full bg-[#1a1a24] border border-[#D4A836]/30 rounded-md px-3 py-2 text-[#E8DDB5]"
                      >
                        {categories.filter(c => c.value !== 'all').map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[#E8DDB5]">{selectedMedia.category}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Size</Label>
                      <p className="text-[#E8DDB5]">{formatFileSize(selectedMedia.size)}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Type</Label>
                      <p className="text-[#E8DDB5]">{selectedMedia.mime_type}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-400">Uploaded</Label>
                    <p className="text-[#E8DDB5]">{new Date(selectedMedia.created_at).toLocaleString()}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-[#D4A836]/20">
                    {editingMedia?.media_id === selectedMedia.media_id ? (
                      <>
                        <Button
                          onClick={() => handleUpdateMedia(selectedMedia.media_id, editingMedia.alt_text, editingMedia.category)}
                          className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                        >
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditingMedia(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => setEditingMedia({ ...selectedMedia })}
                          variant="outline"
                          className="border-[#D4A836]/30 text-[#E8DDB5]"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleCopyUrl(selectedMedia.data_url, selectedMedia.media_id)}
                          variant="outline"
                          className="border-[#D4A836]/30 text-[#E8DDB5]"
                        >
                          {copiedId === selectedMedia.media_id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          Copy URL
                        </Button>
                        <Button
                          onClick={() => handleDelete(selectedMedia.media_id)}
                          variant="outline"
                          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
