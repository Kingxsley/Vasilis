import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Upload, Search, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * MediaPicker — modal image picker backed by the Media Library.
 *
 * Usage:
 *   <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={(url) => ...} />
 *
 * The dialog lists uploaded media, supports inline upload, and returns the
 * selected URL via onSelect. Admin-only by API contract.
 */
export default function MediaPicker({ open, onClose, onSelect }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { if (open) fetchItems(); }, [open]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data.media || []);
    } catch (err) {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max file size is 5MB');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('category', 'general');
    setUploading(true);
    try {
      const res = await axios.post(`${API}/media/upload`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Uploaded');
      const newItem = res.data.media || res.data;
      setItems((prev) => [newItem, ...prev]);
      setSelected(newItem);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (!selected) {
      toast.error('Select an image first');
      return;
    }
    const url = selected.url || selected.data_url || selected.src;
    if (!url) {
      toast.error('Selected item has no URL');
      return;
    }
    onSelect(url, selected);
    onClose();
  };

  const filtered = items.filter((m) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      (m.filename || '').toLowerCase().includes(q) ||
      (m.alt_text || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="media-picker-dialog">
        <DialogHeader>
          <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#D4A836]" />
            Media Library
          </DialogTitle>
          <DialogDescription className="text-gray-400">Select an image or upload a new one.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 py-3 border-b border-[#30363D]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by name or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-[#1a1a24] border-[#30363D] text-white"
              data-testid="media-picker-search"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            data-testid="media-picker-file-input"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            data-testid="media-picker-upload-btn"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="mb-1">{query ? 'No matches for that search.' : 'No media uploaded yet.'}</p>
              {!query && <p className="text-xs">Click Upload to add your first image.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((m) => {
                const isSelected = selected?.media_id === m.media_id;
                const thumbUrl = m.url || m.data_url || m.src || '';
                return (
                  <button
                    key={m.media_id}
                    type="button"
                    onClick={() => setSelected(m)}
                    onDoubleClick={() => { setSelected(m); setTimeout(handleConfirm, 0); }}
                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-[#D4A836] ring-2 ring-[#D4A836]/40' : 'border-[#30363D] hover:border-[#D4A836]/60'
                    }`}
                    data-testid={`media-picker-item-${m.media_id}`}
                  >
                    <img src={thumbUrl} alt={m.alt_text || m.filename || ''} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#D4A836]/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-[#D4A836] rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-black" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 text-gray-300 text-[10px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100">
                      {m.filename || m.alt_text || 'image'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#30363D] pt-3">
          <Button variant="outline" onClick={onClose} className="border-[#30363D] text-gray-300">Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            data-testid="media-picker-confirm-btn"
          >
            <Check className="w-4 h-4 mr-2" />
            Use this image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
