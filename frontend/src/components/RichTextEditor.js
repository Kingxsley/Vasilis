import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Image, Quote, Code, Heading1, Heading2, Upload, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RichTextEditor = ({ value, onChange, placeholder = "Write your content...", token }) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const isInitialized = useRef(false);

  // Set initial value only once on mount or when value changes externally
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || '';
      isInitialized.current = true;
    }
  }, []);

  // Handle external value changes (e.g., form reset)
  useEffect(() => {
    if (editorRef.current && isInitialized.current) {
      // Only update if the value is empty (form reset) or significantly different
      if (value === '' && editorRef.current.innerHTML !== '') {
        editorRef.current.innerHTML = '';
      }
    }
  }, [value]);

  const execCommand = useCallback((command, cmdValue = null) => {
    document.execCommand(command, false, cmdValue);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use PNG, JPEG, WebP, or GIF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'content');
    formData.append('alt_text', file.name);

    try {
      const response = await axios.post(`${API}/media/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Insert the uploaded image into the editor
      const imageUrl = response.data.media.data_url;
      execCommand('insertImage', imageUrl);
      
      if (response.data.savings_percent > 0) {
        toast.success(`Image uploaded & optimized (${response.data.savings_percent}% smaller)`);
      } else {
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatBlock = (tag) => {
    execCommand('formatBlock', tag);
  };

  return (
    <div className="rich-text-editor border border-[#D4A836]/30 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-[#1a1a24] border-b border-[#D4A836]/20">
        <Button type="button" variant="ghost" size="sm" onClick={() => formatBlock('h1')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => formatBlock('h2')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Heading2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-[#D4A836]/20 mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand('bold')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Bold className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand('italic')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Italic className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand('underline')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Underline className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-[#D4A836]/20 mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand('insertUnorderedList')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <List className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand('insertOrderedList')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-[#D4A836]/20 mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => formatBlock('blockquote')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Quote className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => formatBlock('pre')} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Code className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-[#D4A836]/20 mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={insertLink} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Link2 className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={insertImageUrl} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0" title="Insert image URL">
          <Image className="w-4 h-4" />
        </Button>
        
        {/* Direct Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-gray-400 hover:text-[#D4A836] h-8 px-2 gap-1"
          title="Upload image"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="text-xs">Upload</span>
        </Button>
      </div>

      {/* Editor - dir="ltr" to force left-to-right typing */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[200px] p-4 bg-[#1a1a24] text-[#E8DDB5] focus:outline-none prose prose-invert max-w-none"
        style={{
          minHeight: '200px',
          direction: 'ltr',
          textAlign: 'left'
        }}
        dir="ltr"
        data-placeholder={placeholder}
      />

      <style>{`
        .rich-text-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #6b7280;
          pointer-events: none;
        }
        .rich-text-editor [contenteditable] h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.5em 0;
          color: #E8DDB5;
        }
        .rich-text-editor [contenteditable] h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.5em 0;
          color: #E8DDB5;
        }
        .rich-text-editor [contenteditable] a {
          color: #D4A836;
          text-decoration: underline;
        }
        .rich-text-editor [contenteditable] blockquote {
          border-left: 3px solid #D4A836;
          padding-left: 1em;
          margin-left: 0;
          color: #9ca3af;
          font-style: italic;
        }
        .rich-text-editor [contenteditable] pre {
          background: #0f0f15;
          padding: 1em;
          border-radius: 4px;
          overflow-x: auto;
          font-family: monospace;
        }
        .rich-text-editor [contenteditable] ul,
        .rich-text-editor [contenteditable] ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .rich-text-editor [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
