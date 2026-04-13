import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Award, Plus, Eye, Trash2, Loader2, RefreshCw,
  Save, Layout, Copy, Check, Settings2, ArrowLeft,
  Upload, X, Building2, Download
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ─── Layout presets (names match backend seed-presets) ───
const LAYOUT_OPTIONS = [
  { id: 'classic', name: 'Classic Professional', desc: 'Traditional certificate with elegant gold borders' },
  { id: 'modern', name: 'Modern Minimal', desc: 'Clean contemporary design' },
  { id: 'corporate', name: 'Corporate Blue', desc: 'Professional corporate style' },
  { id: 'executive', name: 'Executive Gold', desc: 'Premium gold-accented award certificate' },
  { id: 'cyber', name: 'Cyber Shield', desc: 'Dark cybersecurity-themed certificate' },
  { id: 'compliance', name: 'Official Compliance', desc: 'Formal compliance & regulatory style' },
  { id: 'tech', name: 'Tech Academy', desc: 'Modern tech-style training certificate' },
  { id: 'elegant', name: 'Elegant Serif', desc: 'Timeless elegant design with serif typography' },
];

// ─── Image compression utility ───
const compressImage = (dataUrl, maxWidth = 600, quality = 0.6) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// ─── File to base64 helper ───
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// ─── Live HTML Certificate Preview ───
function CertificatePreview({ template, formData }) {
  const isLandscape = (template?.orientation || 'landscape') !== 'portrait';
  const borderStyle = template?.border_style || formData.border_style || 'classic';
  const bgColor = template?.background_color || formData.background_color || '#ffffff';

  const borderClass = {
    classic: 'border-[6px] border-double border-[#D4A836]',
    modern: 'border-2 border-gray-300',
    corporate: 'border-4 border-[#1F4E79]',
    ornate: 'border-[6px] border-double border-[#8B4513]',
  }[borderStyle] || 'border-2 border-gray-300';

  // Determine theme colors based on template/layout
  const isDark = bgColor === '#0D1117' || bgColor === '#0d1117';
  const titleColor = isDark ? '#E8DDB5' : (formData.title_color || '#1F4E79');
  const subtitleColor = isDark ? '#6B9BD2' : (formData.subtitle_color || '#D4A836');
  const textColor = isDark ? '#AAAAAA' : '#333333';
  const nameColor = isDark ? '#FFFFFF' : (formData.name_color || '#1F4E79');
  const scoreColor = isDark ? '#00E676' : '#51CF66';
  const mutedColor = isDark ? '#666666' : '#999999';

  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-[10px] text-gray-500 mb-1 text-right w-full">
        {isLandscape ? 'Landscape' : 'Portrait'} A4 • Live Preview
      </div>
      <div
        className={`relative shadow-2xl ${borderClass} overflow-hidden`}
        style={{
          width: '100%',
          maxWidth: isLandscape ? '700px' : '500px',
          aspectRatio: isLandscape ? '842 / 595' : '595 / 842',
          backgroundColor: bgColor,
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-between p-[6%]">
          {/* Logo */}
          {formData.logo ? (
            <img src={formData.logo} alt="Logo" className="h-[10%] object-contain" />
          ) : (
            <div className="h-[10%] flex items-center">
              <div className="w-12 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[10px]">Logo</div>
            </div>
          )}

          {/* Title Section */}
          <div className="text-center w-full space-y-1 flex-shrink-0">
            <h2
              className="font-bold tracking-wider"
              style={{ color: titleColor, fontSize: 'clamp(12px, 2.5vw, 22px)', fontFamily: formData.font_family || 'Georgia, serif' }}
            >
              {formData.title || 'CERTIFICATE OF COMPLETION'}
            </h2>
            <p style={{ color: subtitleColor, fontSize: 'clamp(8px, 1.4vw, 13px)', fontFamily: formData.font_family || 'Georgia, serif' }}>
              {formData.subtitle || 'Cybersecurity Awareness Training'}
            </p>
          </div>

          {/* Recipient */}
          <div className="text-center w-full space-y-1 flex-1 flex flex-col justify-center">
            <p style={{ color: textColor, fontSize: 'clamp(7px, 1.1vw, 11px)' }}>
              {formData.presented_to_label || 'This certificate is presented to'}
            </p>
            <p
              className="font-bold"
              style={{ color: nameColor, fontSize: 'clamp(14px, 3vw, 26px)', fontFamily: formData.font_family || 'Georgia, serif' }}
            >
              {'John Doe'}
            </p>
            <p style={{ color: textColor, fontSize: 'clamp(6px, 1vw, 10px)' }}>
              {formData.body_text || 'for successfully completing the {training_name} training'}
            </p>
            <p className="font-bold" style={{ color: scoreColor, fontSize: 'clamp(8px, 1.3vw, 13px)' }}>
              {formData.score_format || 'Score: {score}%'}
            </p>
            <p style={{ color: mutedColor, fontSize: 'clamp(6px, 0.9vw, 9px)' }}>
              {formData.date_format || 'Awarded on {date}'}
            </p>
          </div>

          {/* Signatures Row */}
          <div className="w-full flex items-end justify-between px-[5%] flex-shrink-0">
            <div className="text-center flex-1">
              {formData.signature_1 ? (
                <img src={formData.signature_1} alt="Signature" className="h-8 mx-auto object-contain mb-1" />
              ) : (
                <div className="border-b border-gray-400 w-3/4 mx-auto mb-1" />
              )}
              <p style={{ color: mutedColor, fontSize: 'clamp(5px, 0.8vw, 8px)' }}>{formData.signature_1_title || 'Program Director'}</p>
            </div>

            {formData.certifying_body_logo ? (
              <div className="text-center flex-1">
                <img src={formData.certifying_body_logo} alt="Certifying" className="h-10 mx-auto object-contain mb-1" />
                <p style={{ color: mutedColor, fontSize: 'clamp(5px, 0.7vw, 7px)' }}>{formData.certifying_body_name || ''}</p>
              </div>
            ) : null}

            <div className="text-center flex-1">
              {formData.signature_2 ? (
                <img src={formData.signature_2} alt="Signature" className="h-8 mx-auto object-contain mb-1" />
              ) : (
                <div className="border-b border-gray-400 w-3/4 mx-auto mb-1" />
              )}
              <p style={{ color: mutedColor, fontSize: 'clamp(5px, 0.8vw, 8px)' }}>{formData.signature_2_title || 'Administrator'}</p>
            </div>
          </div>

          {/* Certificate ID */}
          <p style={{ color: mutedColor, fontSize: 'clamp(5px, 0.7vw, 7px)' }}>
            Certificate ID: CERT-PREVIEW-001
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Template Editor ───
function TemplateEditor({ template, onSave, onCancel, signatures, certifyingBodies, organizations }) {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // Parse existing template elements into form data
  const parseTemplateToForm = (tmpl) => {
    const elements = tmpl?.elements || [];
    const findEl = (id) => elements.find(e => e.id === id) || {};

    const titleEl = findEl('title');
    const subtitleEl = findEl('subtitle');
    const presentedEl = findEl('presented_to') || findEl('presented_line') || findEl('certify_text') || findEl('awarded_to') || findEl('granted_to');
    const bodyEl = findEl('completion_text') || findEl('body_text') || findEl('description');
    const scoreEl = findEl('score') || findEl('stats_row');
    const dateEl = findEl('date');
    const logoEl = findEl('company_logo');
    const sig1El = findEl('signature_left');
    const sig2El = findEl('signature_right');
    const certBodyEl = findEl('certifying_body');

    return {
      name: tmpl?.name || '',
      description: tmpl?.description || '',
      background_color: tmpl?.background_color || '#ffffff',
      border_style: tmpl?.border_style || 'classic',
      orientation: tmpl?.orientation || 'landscape',
      font_family: titleEl?.style?.fontFamily || 'Georgia, serif',
      title: titleEl?.content || 'CERTIFICATE OF COMPLETION',
      title_color: titleEl?.style?.color || '#1F4E79',
      subtitle: subtitleEl?.content || 'Cybersecurity Awareness Training',
      subtitle_color: subtitleEl?.style?.color || '#D4A836',
      presented_to_label: presentedEl?.content || 'This certificate is presented to',
      name_color: (findEl('user_name')?.style?.color) || '#1F4E79',
      body_text: bodyEl?.content || bodyEl?.placeholder || 'for successfully completing the {training_name} training',
      score_format: scoreEl?.content || scoreEl?.placeholder || 'Score: {score}%',
      date_format: dateEl?.content || dateEl?.placeholder || 'Awarded on {date}',
      logo: logoEl?.content || '',
      signature_1: sig1El?.content || '',
      signature_1_title: sig1El?.style?.title || 'Program Director',
      signature_2: sig2El?.content || '',
      signature_2_title: sig2El?.style?.title || 'Administrator',
      certifying_body_logo: certBodyEl?.content || '',
      certifying_body_name: certBodyEl?.style?.title || '',
    };
  };

  const [formData, setFormData] = useState(() => parseTemplateToForm(template));
  const [saving, setSaving] = useState(false);

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      const compressed = await compressImage(base64);
      updateField(field, compressed);
    } catch { toast.error('Failed to load image'); }
  };

  // Build elements array from form data (matching backend structure)
  const buildElements = () => {
    const s = formData;
    const fontFamily = s.font_family || 'Georgia, serif';
    const isPortrait = s.orientation === 'portrait';

    return [
      { id: 'company_logo', type: 'logo', x: isPortrait ? 38 : 42, y: 3, width: isPortrait ? 24 : 16, height: isPortrait ? 8 : 10, content: s.logo || '', placeholder: '{company_logo}', style: {} },
      { id: 'title', type: 'text', x: 5, y: isPortrait ? 15 : 18, width: 90, height: isPortrait ? 6 : 10, content: s.title, style: { fontSize: isPortrait ? '26px' : '32px', fontWeight: 'bold', textAlign: 'center', color: s.title_color, fontFamily, letterSpacing: '3px' } },
      { id: 'subtitle', type: 'text', x: 15, y: isPortrait ? 22 : 29, width: 70, height: 5, content: s.subtitle, style: { fontSize: isPortrait ? '13px' : '16px', textAlign: 'center', color: s.subtitle_color, fontFamily } },
      { id: 'presented_to', type: 'text', x: 15, y: isPortrait ? 29 : 38, width: 70, height: 4, content: s.presented_to_label, style: { fontSize: '13px', textAlign: 'center', color: '#666666' } },
      { id: 'user_name', type: 'text', x: 10, y: isPortrait ? 33 : 44, width: 80, height: isPortrait ? 6 : 10, placeholder: '{user_name}', style: { fontSize: isPortrait ? '28px' : '32px', fontWeight: 'bold', textAlign: 'center', color: s.name_color, fontFamily } },
      { id: 'completion_text', type: 'text', x: 10, y: isPortrait ? 40 : 56, width: 80, height: isPortrait ? 10 : 6, placeholder: s.body_text, style: { fontSize: '12px', textAlign: 'center', color: '#444444', lineHeight: '1.6' } },
      { id: 'score', type: 'text', x: 25, y: isPortrait ? 54 : 64, width: 50, height: 5, placeholder: s.score_format, style: { fontSize: '15px', fontWeight: 'bold', textAlign: 'center', color: '#51CF66' } },
      { id: 'date', type: 'text', x: 25, y: isPortrait ? 60 : 70, width: 50, height: 4, placeholder: s.date_format, style: { fontSize: '11px', textAlign: 'center', color: '#888888' } },
      { id: 'signature_left', type: 'signature', x: 10, y: isPortrait ? 72 : 78, width: 25, height: isPortrait ? 12 : 14, content: s.signature_1 || '', placeholder: '{signature_1}', style: { title: s.signature_1_title } },
      { id: 'certifying_body', type: 'certifying_body', x: isPortrait ? 30 : 37, y: isPortrait ? 72 : 78, width: isPortrait ? 40 : 26, height: isPortrait ? 12 : 14, content: s.certifying_body_logo || '', placeholder: '{certifying_body}', style: { title: s.certifying_body_name } },
      { id: 'signature_right', type: 'signature', x: 65, y: isPortrait ? 72 : 78, width: 25, height: isPortrait ? 12 : 14, content: s.signature_2 || '', placeholder: '{signature_2}', style: { title: s.signature_2_title } },
      { id: 'certificate_id', type: 'text', x: 15, y: isPortrait ? 96 : 95, width: 70, height: 3, placeholder: 'Certificate ID: {certificate_id}', style: { fontSize: '9px', textAlign: 'center', color: '#999999' } },
    ];
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Please enter a template name'); return; }
    setSaving(true);
    try {
      const elements = buildElements();
      // Compress images
      for (const el of elements) {
        if (el.content && el.content.startsWith('data:image')) {
          el.content = await compressImage(el.content, 600, 0.6);
        }
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        background_color: formData.background_color,
        border_style: formData.border_style,
        orientation: formData.orientation,
        elements,
      };

      if (template?.template_id) {
        await axios.patch(`${API}/certificate-templates/${template.template_id}`, payload, { headers });
      } else {
        await axios.post(`${API}/certificate-templates`, payload, { headers });
      }
      toast.success('Template saved!');
      onSave();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.detail || 'Failed to save template');
    } finally { setSaving(false); }
  };

  const handlePreviewPDF = async () => {
    if (!template?.template_id) { toast.info('Save the template first to preview PDF'); return; }
    try {
      toast.info('Generating PDF preview...');
      // Save first
      await handleSave();
      // Download preview
      const res = await axios.get(`${API}/certificate-templates/${template.template_id}/preview`, { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      toast.error('Failed to generate preview');
    }
  };

  // Which orgs use this template
  const assignedOrgs = useMemo(() =>
    (organizations || []).filter(o => o.certificate_template_id === template?.template_id),
    [organizations, template]
  );

  return (
    <div className="h-full flex flex-col" data-testid="certificate-editor">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-bold text-[#E8DDB5]">
            {template?.template_id ? 'Edit Template' : 'New Template'}
          </h1>
          {assignedOrgs.length > 0 && (
            <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
              <Building2 className="w-3 h-3 mr-1" />
              Used by {assignedOrgs.length} org{assignedOrgs.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {template?.template_id && (
            <Button variant="outline" size="sm" onClick={handlePreviewPDF} className="border-[#D4A836]/30 text-[#E8DDB5] h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Preview PDF
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black h-8">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Main: Form + Preview */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left: Form */}
        <div className="w-[340px] flex-shrink-0 overflow-y-auto space-y-4 pr-2 pb-4">
          {/* Basic Info */}
          <Section title="Basic Info">
            <Field label="Template Name">
              <Input value={formData.name} onChange={e => updateField('name', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" placeholder="e.g., Company Certificate" />
            </Field>
            <Field label="Description">
              <Input value={formData.description} onChange={e => updateField('description', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" placeholder="Brief description" />
            </Field>
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Background">
                <div className="flex gap-1.5">
                  <input type="color" value={formData.background_color} onChange={e => updateField('background_color', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-[#30363D] flex-shrink-0" />
                  <Input value={formData.background_color} onChange={e => updateField('background_color', e.target.value)}
                    className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs" />
                </div>
              </Field>
              <Field label="Border">
                <Select value={formData.border_style} onValueChange={v => updateField('border_style', v)}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="classic">Classic Gold</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="corporate">Corporate Blue</SelectItem>
                    <SelectItem value="ornate">Ornate Brown</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Orientation">
                <Select value={formData.orientation} onValueChange={v => updateField('orientation', v)}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Font">
                <Select value={formData.font_family} onValueChange={v => updateField('font_family', v)}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="Georgia, serif">Georgia (Serif)</SelectItem>
                    <SelectItem value="Helvetica, Arial, sans-serif">Helvetica (Sans)</SelectItem>
                    <SelectItem value="Courier New, monospace">Courier (Mono)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* Text Content */}
          <Section title="Certificate Text">
            <Field label="Title">
              <Input value={formData.title} onChange={e => updateField('title', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" />
            </Field>
            <div className="flex gap-1.5">
              <Field label="Title Color" className="flex-1">
                <div className="flex gap-1">
                  <input type="color" value={formData.title_color} onChange={e => updateField('title_color', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-[#30363D]" />
                  <Input value={formData.title_color} onChange={e => updateField('title_color', e.target.value)}
                    className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-7 text-xs" />
                </div>
              </Field>
              <Field label="Name Color" className="flex-1">
                <div className="flex gap-1">
                  <input type="color" value={formData.name_color} onChange={e => updateField('name_color', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-[#30363D]" />
                  <Input value={formData.name_color} onChange={e => updateField('name_color', e.target.value)}
                    className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-7 text-xs" />
                </div>
              </Field>
            </div>
            <Field label="Subtitle">
              <Input value={formData.subtitle} onChange={e => updateField('subtitle', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" />
            </Field>
            <Field label="Subtitle Color">
              <div className="flex gap-1.5">
                <input type="color" value={formData.subtitle_color} onChange={e => updateField('subtitle_color', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border border-[#30363D]" />
                <Input value={formData.subtitle_color} onChange={e => updateField('subtitle_color', e.target.value)}
                  className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-7 text-xs" />
              </div>
            </Field>
            <Field label="Presented-to Label">
              <Input value={formData.presented_to_label} onChange={e => updateField('presented_to_label', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" />
            </Field>
            <Field label="Body Text">
              <Textarea value={formData.body_text} onChange={e => updateField('body_text', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] text-sm min-h-[60px]" />
              <p className="text-[10px] text-gray-500 mt-0.5">Placeholders: {'{training_name}'}</p>
            </Field>
            <Field label="Score Format">
              <Input value={formData.score_format} onChange={e => updateField('score_format', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" />
              <p className="text-[10px] text-gray-500 mt-0.5">Placeholders: {'{score}'}</p>
            </Field>
            <Field label="Date Format">
              <Input value={formData.date_format} onChange={e => updateField('date_format', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" />
              <p className="text-[10px] text-gray-500 mt-0.5">Placeholders: {'{date}'}</p>
            </Field>
          </Section>

          {/* Logo */}
          <Section title="Logo">
            <ImageUploader value={formData.logo} onUpload={e => handleImageUpload(e, 'logo')} onClear={() => updateField('logo', '')} label="Upload Logo" />
          </Section>

          {/* Signatures */}
          <Section title="Signatures">
            <Field label="Left Signature Title">
              <Input value={formData.signature_1_title} onChange={e => updateField('signature_1_title', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" placeholder="e.g., Program Director" />
            </Field>
            {signatures.length > 0 && (
              <Field label="Select Saved Signature">
                <Select value="" onValueChange={v => {
                  const sig = signatures.find(s => s.signature_id === v);
                  if (sig) { updateField('signature_1', sig.signature_data); if (sig.title) updateField('signature_1_title', sig.title); }
                }}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs"><SelectValue placeholder="Choose..." /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {signatures.map(s => <SelectItem key={s.signature_id} value={s.signature_id}>{s.name} – {s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <ImageUploader value={formData.signature_1} onUpload={e => handleImageUpload(e, 'signature_1')} onClear={() => updateField('signature_1', '')} label="Upload Signature 1" small />

            <div className="border-t border-[#30363D] mt-3 pt-3">
              <Field label="Right Signature Title">
                <Input value={formData.signature_2_title} onChange={e => updateField('signature_2_title', e.target.value)}
                  className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" placeholder="e.g., Administrator" />
              </Field>
              {signatures.length > 0 && (
                <Field label="Select Saved Signature">
                  <Select value="" onValueChange={v => {
                    const sig = signatures.find(s => s.signature_id === v);
                    if (sig) { updateField('signature_2', sig.signature_data); if (sig.title) updateField('signature_2_title', sig.title); }
                  }}>
                    <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs"><SelectValue placeholder="Choose..." /></SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      {signatures.map(s => <SelectItem key={s.signature_id} value={s.signature_id}>{s.name} – {s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <ImageUploader value={formData.signature_2} onUpload={e => handleImageUpload(e, 'signature_2')} onClear={() => updateField('signature_2', '')} label="Upload Signature 2" small />
            </div>
          </Section>

          {/* Certifying Body */}
          <Section title="Certifying Body">
            <Field label="Organization Name">
              <Input value={formData.certifying_body_name} onChange={e => updateField('certifying_body_name', e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-sm" placeholder="e.g., ISO Board" />
            </Field>
            {certifyingBodies.length > 0 && (
              <Field label="Select Saved Body">
                <Select value="" onValueChange={v => {
                  const body = certifyingBodies.find(b => b.body_id === v);
                  if (body) { updateField('certifying_body_logo', body.logo_data); if (body.name) updateField('certifying_body_name', body.name); }
                }}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs"><SelectValue placeholder="Choose..." /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {certifyingBodies.map(b => <SelectItem key={b.body_id} value={b.body_id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <ImageUploader value={formData.certifying_body_logo} onUpload={e => handleImageUpload(e, 'certifying_body_logo')} onClear={() => updateField('certifying_body_logo', '')} label="Upload Logo" small />
          </Section>
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 min-w-0 bg-[#161B22] border border-[#30363D] rounded-lg p-4 overflow-y-auto flex items-center justify-center">
          <CertificatePreview template={template} formData={formData} />
        </div>
      </div>
    </div>
  );
}

// ─── Small UI helpers ───
function Section({ title, children }) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3 space-y-2.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-gray-500 text-[11px]">{label}</Label>
      {children}
    </div>
  );
}

function ImageUploader({ value, onUpload, onClear, label, small }) {
  return (
    <div className="space-y-1.5">
      <Input type="file" accept="image/*" onChange={onUpload}
        className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-8 text-xs" />
      {value && (
        <div className="relative inline-block bg-white rounded border border-[#30363D] p-1.5">
          <img src={value} alt={label} className={`object-contain mx-auto ${small ? 'max-h-10' : 'max-h-16'}`} />
          <button onClick={onClear} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ─── Main Export ───
// ═══════════════════════════════════════════════
export default function CertificateTemplates({ embedded = false }) {
  const { token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [certifyingBodies, setCertifyingBodies] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const headers = { Authorization: `Bearer ${token}` };


  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, bRes, oRes] = await Promise.all([
        axios.get(`${API}/certificate-templates`, { headers }),
        axios.get(`${API}/certificate-templates/assets/signatures`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/certificate-templates/assets/certifying-bodies`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/organizations`, { headers }).catch(() => ({ data: [] })),
      ]);
      setTemplates(tRes.data);
      setSignatures(sRes.data);
      setCertifyingBodies(bRes.data);
      setOrganizations(oRes.data);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally { setLoading(false); }
  };

  const openEditor = (tmpl) => { setEditingTemplate(tmpl); setShowEditor(true); };
  const closeEditor = () => { setShowEditor(false); setEditingTemplate(null); };

  const handleSaved = () => { fetchData(); closeEditor(); };

  const seedPresets = async () => {
    try {
      await axios.post(`${API}/certificate-templates/seed-presets`, {}, { headers });
      toast.success('Preset templates created');
      fetchData();
    } catch { toast.error('Failed to create presets'); }
  };

  const createTemplate = async () => {
    if (!newTemplateName.trim()) { toast.error('Please enter a name'); return; }
    try {
      const res = await axios.post(`${API}/certificate-templates`, {
        name: newTemplateName, orientation: 'landscape', border_style: 'classic', elements: []
      }, { headers });
      toast.success('Template created');
      setShowNewDialog(false);
      setNewTemplateName('');
      fetchData();
      // Open new template in editor
      openEditor({ ...res.data, elements: [], background_color: '#ffffff', orientation: 'landscape', border_style: 'classic' });
    } catch (err) {
      // Try refetch
      try {
        const all = await axios.get(`${API}/certificate-templates`, { headers });
        const found = all.data.find(t => t.name === newTemplateName);
        if (found) { setShowNewDialog(false); setNewTemplateName(''); setTemplates(all.data); openEditor(found); return; }
      } catch {}
      toast.error('Failed to create template');
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await axios.delete(`${API}/certificate-templates/${id}`, { headers });
      toast.success('Template deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const copyTemplate = async (tmpl) => {
    try {
      await axios.post(`${API}/certificate-templates`, {
        name: `${tmpl.name} (Copy)`, description: tmpl.description, orientation: tmpl.orientation || 'landscape',
        border_style: tmpl.border_style || 'classic', background_color: tmpl.background_color,
        background_image: tmpl.background_image, elements: tmpl.elements || []
      }, { headers });
      toast.success('Template copied');
      fetchData();
    } catch { toast.error('Failed to copy'); }
  };

  const setDefault = async (id) => {
    try {
      await axios.patch(`${API}/certificate-templates/${id}`, { is_default: true }, { headers });
      toast.success('Default template set');
      fetchData();
    } catch { toast.error('Failed to set default'); }
  };

  // How many orgs use a template
  const orgCountForTemplate = (templateId) =>
    organizations.filter(o => o.certificate_template_id === templateId).length;

  // ─── Editor View ───
  if (showEditor && editingTemplate) {
    const editor = (
      <div className="p-4 lg:p-6 h-[calc(100vh-64px)]">
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaved}
          onCancel={closeEditor}
          signatures={signatures}
          certifyingBodies={certifyingBodies}
          organizations={organizations}
        />
      </div>
    );
    if (embedded) return editor;
    return <DashboardLayout>{editor}</DashboardLayout>;
  }

  // ─── List View ───
  const content = (
    <div className={embedded ? '' : 'p-6 lg:p-8'} data-testid="certificate-templates-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>Certificate Templates</h1>
          <p className="text-gray-500 mt-1">Design and manage training completion certificates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="border-[#D4A836]/30 text-[#E8DDB5]">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seedPresets} className="border-[#D4A836]/30 text-[#E8DDB5]">
            <Plus className="w-4 h-4 mr-2" /> Add Presets
          </Button>
          <Button onClick={() => setShowNewDialog(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
            <Plus className="w-4 h-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div>
      ) : templates.length === 0 ? (
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No templates yet</h3>
            <p className="text-gray-400 mb-4">Create a certificate template or add preset designs</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={seedPresets} className="border-[#D4A836]/30 text-[#E8DDB5]">Add Presets</Button>
              <Button onClick={() => setShowNewDialog(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">Create Custom</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => {
            const orgCount = orgCountForTemplate(tmpl.template_id);
            return (
              <Card key={tmpl.template_id} className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#E8DDB5] text-lg">{tmpl.name}</CardTitle>
                    <div className="flex gap-1">
                      {tmpl.is_default && <Badge className="bg-[#D4A836]/20 text-[#D4A836] text-[10px]">Default</Badge>}
                    </div>
                  </div>
                  <CardDescription className="text-gray-500">
                    {tmpl.description || `${tmpl.orientation || 'landscape'} • ${tmpl.border_style || 'classic'}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mini preview */}
                  <div className="mb-3 p-2 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <div className="w-full h-24 rounded flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: tmpl.background_color || '#ffffff' }}>
                      <div className="text-center" style={{ color: tmpl.background_color === '#0D1117' ? '#E8DDB5' : '#1F4E79' }}>
                        <div className="text-[10px] font-bold tracking-wider">{tmpl.name}</div>
                        <div className="text-[8px] mt-0.5 opacity-60">{(tmpl.elements || []).length} elements • {tmpl.orientation || 'landscape'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Org assignment info */}
                  {orgCount > 0 && (
                    <div className="mb-2 flex items-center gap-1 text-[10px] text-blue-400">
                      <Building2 className="w-3 h-3" />
                      Assigned to {orgCount} organization{orgCount > 1 ? 's' : ''}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditor(tmpl)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                        <Settings2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyTemplate(tmpl)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                      {!tmpl.is_default && (
                        <Button size="sm" variant="outline" onClick={() => setDefault(tmpl.template_id)} className="border-[#D4A836]/30 text-[#D4A836]">
                          <Check className="w-3 h-3 mr-1" /> Default
                        </Button>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => deleteTemplate(tmpl.template_id)} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-[#161B22] border-[#30363D]">
          <DialogHeader>
            <DialogTitle className="text-[#E8DDB5]">Create Certificate Template</DialogTitle>
            <DialogDescription className="text-gray-400">Start with a blank template and customize it</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-gray-400">Template Name</Label>
            <Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)}
              placeholder="e.g., Company Certificate" className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">Cancel</Button>
            <Button onClick={createTemplate} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) return content;
  return <DashboardLayout>{content}</DashboardLayout>;
}
