import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Type, Image, PenTool, Building2, GripVertical,
  Save, Upload, Layout, Palette, Settings2, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Draggable element component
const DraggableElement = ({ element, isSelected, onSelect, onDrag, onResize, scale }) => {
  const elementRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - element.x * scale / 100, y: e.clientY - element.y * scale / 100 });
    onSelect(element.id);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(100 - element.width, ((e.clientX - dragStart.x) / scale) * 100));
    const newY = Math.max(0, Math.min(100 - element.height, ((e.clientY - dragStart.y) / scale) * 100));
    onDrag(element.id, newX, newY);
  }, [isDragging, dragStart, element, onDrag, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getElementContent = () => {
    const style = element.style || {};
    
    switch (element.type) {
      case 'text':
        return (
          <div style={{
            fontSize: style.fontSize || '14px',
            fontWeight: style.fontWeight || 'normal',
            textAlign: style.textAlign || 'left',
            color: style.color || '#333',
            fontFamily: style.fontFamily || 'inherit',
            whiteSpace: 'pre-wrap'
          }}>
            {element.content || element.placeholder || 'Text'}
          </div>
        );
      case 'logo':
      case 'image':
        return element.content ? (
          <img src={element.content} alt="Logo" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
            {element.placeholder || 'Logo'}
          </div>
        );
      case 'signature':
        return (
          <div className="flex flex-col items-center h-full justify-end">
            {element.content ? (
              <img src={element.content} alt="Signature" className="max-h-8 object-contain mb-1" />
            ) : (
              <div className="border-b border-gray-400 w-full mb-1" />
            )}
            <span className="text-xs text-gray-500">{style.title || 'Signature'}</span>
          </div>
        );
      case 'certifying_body':
        return (
          <div className="flex flex-col items-center h-full justify-center">
            {element.content ? (
              <img src={element.content} alt="Certifying Body" className="max-h-10 object-contain mb-1" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-400 mb-1" />
            )}
            <span className="text-xs text-gray-500">Certifying Body</span>
          </div>
        );
      default:
        return <div className="text-gray-400 text-xs">Unknown element</div>;
    }
  };

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
      data-testid={`element-${element.id}`}
    >
      <div className="w-full h-full overflow-hidden">
        {getElementContent()}
      </div>
      {isSelected && (
        <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full p-1">
          <GripVertical className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

// Certificate preview canvas
const CertificateCanvas = ({ template, elements, selectedElement, onSelectElement, onUpdateElement }) => {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (canvasRef.current) {
      const containerWidth = canvasRef.current.parentElement?.offsetWidth || 800;
      const aspectRatio = template?.orientation === 'portrait' ? 0.707 : 1.414; // A4 ratios
      setScale(containerWidth / (template?.orientation === 'portrait' ? 595 : 842)); // A4 size in points
    }
  }, [template?.orientation]);

  const handleDrag = (elementId, newX, newY) => {
    onUpdateElement(elementId, { x: newX, y: newY });
  };

  const canvasWidth = template?.orientation === 'portrait' ? 595 : 842;
  const canvasHeight = template?.orientation === 'portrait' ? 842 : 595;

  const getBorderStyle = () => {
    switch (template?.border_style) {
      case 'classic':
        return 'border-8 border-double border-[#D4A836]';
      case 'modern':
        return 'border-2 border-gray-300';
      case 'corporate':
        return 'border-4 border-[#1F4E79]';
      case 'ornate':
        return 'border-8 border-double border-[#8B4513]';
      default:
        return 'border-2 border-gray-300';
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-gray-100 rounded-lg p-4">
      <div
        ref={canvasRef}
        className={`relative mx-auto shadow-xl ${getBorderStyle()}`}
        style={{
          width: `${canvasWidth * scale}px`,
          height: `${canvasHeight * scale}px`,
          backgroundColor: template?.background_color || '#ffffff',
          backgroundImage: template?.background_image ? `url(${template.background_image})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelectElement(null);
        }}
      >
        {elements.map((element) => (
          <DraggableElement
            key={element.id}
            element={element}
            isSelected={selectedElement === element.id}
            onSelect={onSelectElement}
            onDrag={handleDrag}
            scale={canvasWidth * scale}
          />
        ))}
      </div>
    </div>
  );
};

// Element properties panel
const ElementProperties = ({ element, onUpdate, onDelete, signatures, certifyingBodies }) => {
  if (!element) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Select an element to edit its properties</p>
      </div>
    );
  }

  const style = element.style || {};

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Badge>{element.type}</Badge>
        <Button size="sm" variant="destructive" onClick={() => onDelete(element.id)}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {element.type === 'text' && (
        <>
          <div>
            <Label className="text-gray-400">Content</Label>
            <Input
              value={element.content || ''}
              onChange={(e) => onUpdate(element.id, { content: e.target.value })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
              placeholder={element.placeholder || 'Enter text'}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-400 text-xs">Font Size</Label>
              <Select
                value={style.fontSize || '14px'}
                onValueChange={(v) => onUpdate(element.id, { style: { ...style, fontSize: v } })}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  {['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'].map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Font Weight</Label>
              <Select
                value={style.fontWeight || 'normal'}
                onValueChange={(v) => onUpdate(element.id, { style: { ...style, fontWeight: v } })}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="300">Light</SelectItem>
                  <SelectItem value="600">Semi Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-400 text-xs">Text Align</Label>
              <Select
                value={style.textAlign || 'left'}
                onValueChange={(v) => onUpdate(element.id, { style: { ...style, textAlign: v } })}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Color</Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={style.color || '#333333'}
                  onChange={(e) => onUpdate(element.id, { style: { ...style, color: e.target.value } })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  value={style.color || '#333333'}
                  onChange={(e) => onUpdate(element.id, { style: { ...style, color: e.target.value } })}
                  className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {(element.type === 'logo' || element.type === 'image') && (
        <div>
          <Label className="text-gray-400">Image URL or upload</Label>
          <div className="space-y-2">
            <Input
              value={element.content || ''}
              onChange={(e) => onUpdate(element.id, { content: e.target.value })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
              placeholder="Image URL or base64"
            />
            <p className="text-xs text-gray-500">Use {'{company_logo}'} for dynamic company logo</p>
          </div>
        </div>
      )}

      {element.type === 'signature' && (
        <>
          <div>
            <Label className="text-gray-400">Title</Label>
            <Input
              value={style.title || ''}
              onChange={(e) => onUpdate(element.id, { style: { ...style, title: e.target.value } })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
              placeholder="e.g., Program Director"
            />
          </div>
          {signatures.length > 0 && (
            <div>
              <Label className="text-gray-400">Select Saved Signature</Label>
              <Select
                value=""
                onValueChange={(v) => {
                  const sig = signatures.find(s => s.signature_id === v);
                  if (sig) {
                    onUpdate(element.id, { 
                      content: sig.signature_data,
                      style: { ...style, title: sig.title }
                    });
                  }
                }}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
                  <SelectValue placeholder="Choose signature" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  {signatures.map(sig => (
                    <SelectItem key={sig.signature_id} value={sig.signature_id}>
                      {sig.name} - {sig.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {element.type === 'certifying_body' && certifyingBodies.length > 0 && (
        <div>
          <Label className="text-gray-400">Select Certifying Body</Label>
          <Select
            value=""
            onValueChange={(v) => {
              const body = certifyingBodies.find(b => b.body_id === v);
              if (body) {
                onUpdate(element.id, { content: body.logo_data });
              }
            }}
          >
            <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
              <SelectValue placeholder="Choose certifying body" />
            </SelectTrigger>
            <SelectContent className="bg-[#161B22] border-[#30363D]">
              {certifyingBodies.map(body => (
                <SelectItem key={body.body_id} value={body.body_id}>
                  {body.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Position controls */}
      <div className="border-t border-[#30363D] pt-4">
        <Label className="text-gray-400 text-xs">Position & Size (%)</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          <div>
            <Label className="text-gray-500 text-xs">X</Label>
            <Input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onUpdate(element.id, { x: parseFloat(e.target.value) || 0 })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-gray-500 text-xs">Y</Label>
            <Input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onUpdate(element.id, { y: parseFloat(e.target.value) || 0 })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-gray-500 text-xs">W</Label>
            <Input
              type="number"
              value={Math.round(element.width)}
              onChange={(e) => onUpdate(element.id, { width: parseFloat(e.target.value) || 10 })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-gray-500 text-xs">H</Label>
            <Input
              type="number"
              value={Math.round(element.height)}
              onChange={(e) => onUpdate(element.id, { height: parseFloat(e.target.value) || 5 })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CertificateTemplates() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [certifyingBodies, setCertifyingBodies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Editor state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // New template dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Asset upload dialogs
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showBodyDialog, setShowBodyDialog] = useState(false);
  const [newSignature, setNewSignature] = useState({ name: '', title: '', signature_data: '' });
  const [newBody, setNewBody] = useState({ name: '', title: 'Certified by', logo_data: '' });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, signaturesRes, bodiesRes] = await Promise.all([
        axios.get(`${API}/certificate-templates`, { headers }),
        axios.get(`${API}/certificate-templates/assets/signatures`, { headers }),
        axios.get(`${API}/certificate-templates/assets/certifying-bodies`, { headers })
      ]);
      setTemplates(templatesRes.data);
      setSignatures(signaturesRes.data);
      setCertifyingBodies(bodiesRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const seedPresets = async () => {
    try {
      await axios.post(`${API}/certificate-templates/seed-presets`, {}, { headers });
      toast.success('Preset templates created');
      fetchData();
    } catch (err) {
      toast.error('Failed to create presets');
    }
  };

  const createTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    try {
      const res = await axios.post(`${API}/certificate-templates`, {
        name: newTemplateName,
        orientation: 'landscape',
        border_style: 'classic',
        elements: []
      }, { headers });
      
      toast.success('Template created');
      setShowNewDialog(false);
      setNewTemplateName('');
      fetchData();
      
      // Open editor for new template
      openEditor(res.data);
    } catch (err) {
      // Even if the API returned an error, a template might have been created. Try
      // to refetch templates and open the newly created one if it exists.
      try {
        // Fetch templates directly to find if one with the requested name was created
        const allTemplates = await axios.get(`${API}/certificate-templates`, { headers });
        const created = allTemplates.data.find(t => t.name === newTemplateName);
        if (created) {
          toast.success('Template created');
          setShowNewDialog(false);
          setNewTemplateName('');
          // Update local state and open editor
          setTemplates(allTemplates.data);
          openEditor(created);
          return;
        }
      } catch (refetchErr) {
        console.error('Error refetching templates:', refetchErr);
      }
      toast.error('Failed to create template');
    }
  };

  const openEditor = (template) => {
    setEditingTemplate(template);
    setElements(template.elements || []);
    setSelectedElement(null);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    setElements([]);
    setSelectedElement(null);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      await axios.patch(`${API}/certificate-templates/${editingTemplate.template_id}`, {
        elements
      }, { headers });
      toast.success('Template saved');
      fetchData();
    } catch (err) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await axios.delete(`${API}/certificate-templates/${templateId}`, { headers });
      toast.success('Template deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };

  const setDefaultTemplate = async (templateId) => {
    try {
      await axios.patch(`${API}/certificate-templates/${templateId}`, {
        is_default: true
      }, { headers });
      toast.success('Default template set');
      fetchData();
    } catch (err) {
      toast.error('Failed to set default');
    }
  };

  const addElement = (type) => {
    const newElement = {
      id: `elem_${Date.now()}`,
      type,
      x: 30,
      y: 40,
      width: type === 'text' ? 40 : 15,
      height: type === 'text' ? 6 : 10,
      content: '',
      placeholder: type === 'text' ? 'New Text' : `{${type}}`,
      style: type === 'text' ? { fontSize: '14px', textAlign: 'center', color: '#333333' } : {}
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const updateElement = (elementId, updates) => {
    setElements(elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (elementId) => {
    setElements(elements.filter(el => el.id !== elementId));
    if (selectedElement === elementId) setSelectedElement(null);
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'signature') {
        setNewSignature({ ...newSignature, signature_data: event.target.result });
      } else if (type === 'body') {
        setNewBody({ ...newBody, logo_data: event.target.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = async () => {
    if (!newSignature.name || !newSignature.title || !newSignature.signature_data) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await axios.post(`${API}/certificate-templates/assets/signatures`, newSignature, { headers });
      toast.success('Signature saved');
      setShowSignatureDialog(false);
      setNewSignature({ name: '', title: '', signature_data: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to save signature');
    }
  };

  const saveCertifyingBody = async () => {
    if (!newBody.name || !newBody.logo_data) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await axios.post(`${API}/certificate-templates/assets/certifying-bodies`, newBody, { headers });
      toast.success('Certifying body saved');
      setShowBodyDialog(false);
      setNewBody({ name: '', title: 'Certified by', logo_data: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  const deleteSignature = async (sigId) => {
    if (!window.confirm('Delete this signature?')) return;
    try {
      await axios.delete(`${API}/certificate-templates/assets/signatures/${sigId}`, { headers });
      toast.success('Signature deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const deleteBody = async (bodyId) => {
    if (!window.confirm('Delete this certifying body?')) return;
    try {
      await axios.delete(`${API}/certificate-templates/assets/certifying-bodies/${bodyId}`, { headers });
      toast.success('Certifying body deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // Editor view
  if (showEditor && editingTemplate) {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-6" data-testid="certificate-editor">
          {/* Editor Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#E8DDB5]">{editingTemplate.name}</h1>
              <p className="text-sm text-gray-500">Drag elements to position them</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={closeEditor}
                className="border-[#D4A836]/30 text-[#E8DDB5]"
              >
                Cancel
              </Button>
              <Button
                onClick={saveTemplate}
                disabled={saving}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Template
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-4">
            {/* Toolbox */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#E8DDB5] text-sm">Add Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#D4A836]/30 text-[#E8DDB5]"
                  onClick={() => addElement('text')}
                >
                  <Type className="w-4 h-4 mr-2" /> Text
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#D4A836]/30 text-[#E8DDB5]"
                  onClick={() => addElement('logo')}
                >
                  <Image className="w-4 h-4 mr-2" /> Logo/Image
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#D4A836]/30 text-[#E8DDB5]"
                  onClick={() => addElement('signature')}
                >
                  <PenTool className="w-4 h-4 mr-2" /> Signature
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#D4A836]/30 text-[#E8DDB5]"
                  onClick={() => addElement('certifying_body')}
                >
                  <Building2 className="w-4 h-4 mr-2" /> Certifying Body
                </Button>
              </CardContent>
              
              <CardHeader className="pb-2 pt-4 border-t border-[#30363D]">
                <CardTitle className="text-[#E8DDB5] text-sm">Template Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-xs">Background Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={editingTemplate.background_color || '#ffffff'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, background_color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <Input
                      value={editingTemplate.background_color || '#ffffff'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, background_color: e.target.value })}
                      className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Border Style</Label>
                  <Select
                    value={editingTemplate.border_style || 'classic'}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, border_style: v })}
                  >
                    <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="ornate">Ornate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Orientation</Label>
                  <Select
                    value={editingTemplate.orientation || 'landscape'}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, orientation: v })}
                  >
                    <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Canvas */}
            <div className="lg:col-span-2">
              <CertificateCanvas
                template={editingTemplate}
                elements={elements}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                onUpdateElement={updateElement}
              />
            </div>

            {/* Properties Panel */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#E8DDB5] text-sm">Properties</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ElementProperties
                  element={elements.find(e => e.id === selectedElement)}
                  onUpdate={updateElement}
                  onDelete={deleteElement}
                  signatures={signatures}
                  certifyingBodies={certifyingBodies}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Main view
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="certificate-templates-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Certificate Templates
            </h1>
            <p className="text-gray-500 mt-1">Design and manage training completion certificates</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            className="border-[#D4A836]/30 text-[#E8DDB5]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#161B22] border border-[#30363D]">
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
            >
              <Layout className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="assets"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
            >
              <Image className="w-4 h-4 mr-2" />
              Assets
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#E8DDB5]">Certificate Templates</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={seedPresets}
                  className="border-[#D4A836]/30 text-[#E8DDB5]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Presets
                </Button>
                <Button
                  onClick={() => setShowNewDialog(true)}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : templates.length === 0 ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="py-12 text-center">
                  <Award className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No templates yet</h3>
                  <p className="text-gray-400 mb-4">Create a certificate template or add preset designs</p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={seedPresets} className="border-[#D4A836]/30 text-[#E8DDB5]">
                      Add Preset Templates
                    </Button>
                    <Button onClick={() => setShowNewDialog(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      Create Custom
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.template_id}
                    className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/30 transition-colors"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-[#E8DDB5] text-lg">{template.name}</CardTitle>
                        {template.is_default && (
                          <Badge className="bg-[#D4A836]/20 text-[#D4A836]">Default</Badge>
                        )}
                      </div>
                      <CardDescription className="text-gray-500">
                        {template.description || `${template.orientation} • ${template.border_style}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditor(template)}
                            className="border-[#D4A836]/30 text-[#E8DDB5]"
                          >
                            <Settings2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {!template.is_default && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDefaultTemplate(template.template_id)}
                              className="border-[#D4A836]/30 text-[#D4A836]"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Set Default
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTemplate(template.template_id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            {/* Signatures Section */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#E8DDB5]">Signatures</CardTitle>
                    <CardDescription>Upload signatures for use in certificates</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowSignatureDialog(true)}
                    className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Signature
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {signatures.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No signatures uploaded yet</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {signatures.map((sig) => (
                      <div
                        key={sig.signature_id}
                        className="p-4 border border-[#30363D] rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {sig.signature_data && (
                            <img src={sig.signature_data} alt={sig.name} className="h-8 object-contain" />
                          )}
                          <div>
                            <p className="text-[#E8DDB5] text-sm font-medium">{sig.name}</p>
                            <p className="text-gray-500 text-xs">{sig.title}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSignature(sig.signature_id)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certifying Bodies Section */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#E8DDB5]">Certifying Bodies</CardTitle>
                    <CardDescription>Upload logos for certifying organizations</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowBodyDialog(true)}
                    className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Certifying Body
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {certifyingBodies.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No certifying bodies added yet</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {certifyingBodies.map((body) => (
                      <div
                        key={body.body_id}
                        className="p-4 border border-[#30363D] rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {body.logo_data && (
                            <img src={body.logo_data} alt={body.name} className="h-10 object-contain" />
                          )}
                          <div>
                            <p className="text-[#E8DDB5] text-sm font-medium">{body.name}</p>
                            <p className="text-gray-500 text-xs">{body.title}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBody(body.body_id)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Template Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="bg-[#161B22] border-[#30363D]">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Create Certificate Template</DialogTitle>
              <DialogDescription className="text-gray-400">
                Start with a blank canvas and design your certificate
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="text-gray-400">Template Name</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Company Certificate"
                className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Cancel
              </Button>
              <Button onClick={createTemplate} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Signature Upload Dialog */}
        <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
          <DialogContent className="bg-[#161B22] border-[#30363D]">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Add Signature</DialogTitle>
              <DialogDescription className="text-gray-400">
                Upload a signature image for use in certificates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-400">Signer Name</Label>
                <Input
                  value={newSignature.name}
                  onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                  placeholder="John Smith"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                />
              </div>
              <div>
                <Label className="text-gray-400">Title</Label>
                <Input
                  value={newSignature.title}
                  onChange={(e) => setNewSignature({ ...newSignature, title: e.target.value })}
                  placeholder="Program Director"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                />
              </div>
              <div>
                <Label className="text-gray-400">Signature Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'signature')}
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                />
                {newSignature.signature_data && (
                  <div className="mt-2 p-2 bg-white rounded">
                    <img src={newSignature.signature_data} alt="Preview" className="max-h-16 object-contain" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSignatureDialog(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Cancel
              </Button>
              <Button onClick={saveSignature} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                Save Signature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Certifying Body Dialog */}
        <Dialog open={showBodyDialog} onOpenChange={setShowBodyDialog}>
          <DialogContent className="bg-[#161B22] border-[#30363D]">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Add Certifying Body</DialogTitle>
              <DialogDescription className="text-gray-400">
                Upload a logo for a certifying organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-400">Organization Name</Label>
                <Input
                  value={newBody.name}
                  onChange={(e) => setNewBody({ ...newBody, name: e.target.value })}
                  placeholder="e.g., ISO Certification Board"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                />
              </div>
              <div>
                <Label className="text-gray-400">Label Text</Label>
                <Input
                  value={newBody.title}
                  onChange={(e) => setNewBody({ ...newBody, title: e.target.value })}
                  placeholder="Certified by"
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                />
              </div>
              <div>
                <Label className="text-gray-400">Logo Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'body')}
                  className="bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5]"
                />
                {newBody.logo_data && (
                  <div className="mt-2 p-2 bg-white rounded">
                    <img src={newBody.logo_data} alt="Preview" className="max-h-16 object-contain" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBodyDialog(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Cancel
              </Button>
              <Button onClick={saveCertifyingBody} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
