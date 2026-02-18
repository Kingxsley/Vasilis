import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, placeholder = "Write your content..." }) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      [{ 'align': [] }],
      ['clean']
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'blockquote', 'code-block',
    'link', 'image',
    'align'
  ];

  return (
    <div className="rich-text-editor">
      <style>{`
        .rich-text-editor .ql-toolbar {
          background: #1a1a24;
          border-color: rgba(212, 168, 54, 0.3);
          border-radius: 8px 8px 0 0;
        }
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: #9ca3af;
        }
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: #9ca3af;
        }
        .rich-text-editor .ql-toolbar .ql-picker {
          color: #9ca3af;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #D4A836;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #D4A836;
        }
        .rich-text-editor .ql-container {
          background: #1a1a24;
          border-color: rgba(212, 168, 54, 0.3);
          border-radius: 0 0 8px 8px;
          min-height: 200px;
          font-size: 16px;
        }
        .rich-text-editor .ql-editor {
          color: #E8DDB5;
          min-height: 200px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #6b7280;
          font-style: normal;
        }
        .rich-text-editor .ql-editor h1 {
          color: #E8DDB5;
          font-size: 2em;
        }
        .rich-text-editor .ql-editor h2 {
          color: #E8DDB5;
          font-size: 1.5em;
        }
        .rich-text-editor .ql-editor h3 {
          color: #E8DDB5;
          font-size: 1.17em;
        }
        .rich-text-editor .ql-editor a {
          color: #D4A836;
        }
        .rich-text-editor .ql-editor blockquote {
          border-left-color: #D4A836;
          color: #9ca3af;
        }
        .rich-text-editor .ql-editor code,
        .rich-text-editor .ql-editor pre {
          background: #0f0f15;
          color: #E8DDB5;
        }
        .rich-text-editor .ql-snow .ql-picker-options {
          background: #1a1a24;
          border-color: rgba(212, 168, 54, 0.3);
        }
        .rich-text-editor .ql-snow .ql-picker-item {
          color: #9ca3af;
        }
        .rich-text-editor .ql-snow .ql-picker-item:hover {
          color: #D4A836;
        }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
