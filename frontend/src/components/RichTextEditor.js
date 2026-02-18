import React, { useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Image, Quote, Code, Heading1, Heading2 } from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder = "Write your content..." }) => {
  const editorRef = useRef(null);

  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
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

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
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
        <Button type="button" variant="ghost" size="sm" onClick={insertImage} className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0">
          <Image className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        className="min-h-[200px] p-4 bg-[#1a1a24] text-[#E8DDB5] focus:outline-none prose prose-invert max-w-none"
        style={{
          minHeight: '200px',
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'plaintext'
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
