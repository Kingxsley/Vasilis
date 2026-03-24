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
  Type, Image as ImageIcon, PenTool, Building2, GripVertical,
  Save, Upload, Layout, Palette, Settings2, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Image compression utility - compresses images to reduce payload size
const compressImage = (dataUrl, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Scale down if wider than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get compressed data URL
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // Return original if compression fails
    img.src = dataUrl;
  });
};

// Compress all images in elements before saving
const compressElementImages = async (elements) => {
  const compressed = [];
  for (const elem of elements) {
    const newElem = { ...elem };
    
    // Check if content is a base64 image
    if (newElem.content && typeof newElem.content === 'string' && newElem.content.startsWith('data:image')) {
      // Compress images for logo, signature, certifying_body, image types
      if (['logo', 'image', 'signature', 'certifying_body'].includes(newElem.type)) {
        newElem.content = await compressImage(newElem.content, 600, 0.6);
      }
    }
    
    compressed.push(newElem);
  }
  return compressed;
};

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

  // Scale factor for fonts: preview canvas is ~700px wide for an 842pt landscape A4
  // so 1pt ≈ 0.83px at full scale. We use scale to adapt.
  const fontScale = scale / 842;

  const getElementContent = () => {
    const style = element.style || {};
    
    switch (element.type) {
      case 'text': {
        const rawSize = parseInt(style.fontSize) || 14;
        const scaledSize = Math.max(8, rawSize * fontScale);
        return (
          <div style={{
            fontSize: `${scaledSize}px`,
            fontWeight: style.fontWeight || 'normal',
            textAlign: style.textAlign || 'left',
            color: style.color || '#333',
            fontFamily: style.fontFamily || 'inherit',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.3,
            overflow: 'hidden',
          }}>
            {element.content || element.placeholder || 'Text'}
          </div>
        );
      }
      case 'logo':
      case 'image':
        return element.content ? (
          <img src={element.content} alt="Logo" className="w-full h-full object-contain" draggable={false} />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 rounded border-2 border-dashed border-gray-300" style={{ fontSize: `${Math.max(9, 12 * fontScale)}px` }}>
            {element.placeholder || 'Logo'}
          </div>
        );
      case 'signature':
        return (
          <div className="flex flex-col items-center h-full justify-end">
            {element.content ? (
              <img src={element.content} alt="Signature" className="w-full flex-1 object-contain" draggable={false} style={{ maxHeight: '75%' }} />
            ) : (
              <div className="border-b-2 border-gray-400 w-full mb-1 flex-1 flex items-end"><div className="w-full border-b-2 border-gray-400" /></div>
            )}
            <span className="text-gray-600 mt-1 font-medium" style={{ fontSize: `${Math.max(8, 10 * fontScale)}px` }}>{style.title || 'Signature'}</span>
          </div>
        );
      case 'certifying_body':
        return (
          <div className="flex flex-col items-center h-full justify-center">
            {element.content ? (
              <img src={element.content} alt="Certifying Body" className="w-full flex-1 object-contain" draggable={false} style={{ maxHeight: '70%' }} />
            ) : (
              <Building2 className="text-gray-400 mb-1" style={{ width: `${Math.max(16, 32 * fontScale)}px`, height: `${Math.max(16, 32 * fontScale)}px` }} />
            )}
            <span className="text-gray-500 mt-1" style={{ fontSize: `${Math.max(7, 9 * fontScale)}px` }}>Certifying Body</span>
          </div>
        );
      default:
        return <div className="text-gray-400 text-xs">Unknown element</div>;
    }
  };

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move transition-shadow ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg z-10' : 'hover:ring-1 hover:ring-blue-300'}`}
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
        <>
          <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full p-1 shadow">
            <GripVertical className="w-3 h-3" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-sm cursor-se-resize resize-handle" />
        </>
      )}
    </div>
  );
};

// Certificate preview canvas
const CertificateCanvas = ({ template, elements, selectedElement, onSelectElement, onUpdateElement }) => {
  const canvasRef = useRef(null);
  const [canvasPixelWidth, setCanvasPixelWidth] = useState(700);

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current?.parentElement) {
        const containerWidth = canvasRef.current.parentElement.offsetWidth - 32; // padding
        setCanvasPixelWidth(Math.max(500, Math.min(containerWidth, 900)));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleDrag = (elementId, newX, newY) => {
    onUpdateElement(elementId, { x: newX, y: newY });
  };

  const isLandscape = template?.orientation !== 'portrait';
  const aspectRatio = isLandscape ? (842 / 595) : (595 / 842);
  const displayWidth = canvasPixelWidth;
  const displayHeight = displayWidth / aspectRatio;

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
    <div className="relative w-full h-full flex flex-col bg-gray-800/30 rounded-lg p-3">
      <div className="text-[10px] text-gray-500 mb-1.5 text-right">{isLandscape ? 'Landscape' : 'Portrait'} A4 • {Math.round(displayWidth)}×{Math.round(displayHeight)}px</div>
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div
          ref={canvasRef}
          className={`relative shadow-2xl ${getBorderStyle()}`}
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            backgroundColor: template?.background_color || '#ffffff',
            backgroundImage: template?.background_image ? `url(${template.background_image})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
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
              scale={displayWidth}
            />
          ))}
        </div>
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
            <p className="text-[10px] text-gray-500 mt-1">Use {'{training_name}'} for dynamic training module name</p>
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
        <div className="space-y-3">
          <Label className="text-gray-400">Image Source</Label>
          <div className="space-y-2">
            <Input
              value={element.content || ''}
              onChange={(e) => onUpdate(element.id, { content: e.target.value })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
              placeholder="Image URL (https://...) or paste base64"
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    onUpdate(element.id, { content: event.target.result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
            />
            {/* Image Preview */}
            {element.content && (
              <div className="mt-2 p-2 bg-white rounded border border-[#30363D]">
                <img 
                  src={element.content} 
                  alt="Preview" 
                  className="max-h-24 object-contain mx-auto"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
            <p className="text-xs text-gray-500">Available placeholders: {'{user_name}'}, {'{training_name}'}, {'{score}'}, {'{date}'}, {'{certificate_id}'}</p>
          </div>
        </div>
      )}

      {element.type === 'signature' && (
        <>
          <div>
            <Label className="text-gray-400">Title / Role</Label>
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
                      style: { ...style, title: sig.title || style.title }
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
          <div>
            <Label className="text-gray-400 text-xs">Or Upload Signature Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => onUpdate(element.id, { content: event.target.result });
                  reader.readAsDataURL(file);
                }
              }}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] text-xs"
            />
          </div>
          {element.content && (
            <div className="p-2 bg-white rounded border border-[#30363D]">
              <img src={element.content} alt="Signature" className="max-h-16 object-contain mx-auto" />
            </div>
          )}
        </>
      )}

      {element.type === 'certifying_body' && (
        <>
          <div>
            <Label className="text-gray-400">Body Name</Label>
            <Input
              value={style.title || ''}
              onChange={(e) => onUpdate(element.id, { style: { ...style, title: e.target.value } })}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
              placeholder="e.g., VasilisNetShield"
            />
          </div>
          {certifyingBodies.length > 0 && (
            <div>
              <Label className="text-gray-400">Select Certifying Body</Label>
              <Select
                value=""
                onValueChange={(v) => {
                  const body = certifyingBodies.find(b => b.body_id === v);
                  if (body) {
                    onUpdate(element.id, { 
                      content: body.logo_data,
                      style: { ...style, title: body.name || style.title }
                    });
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
          <div>
            <Label className="text-gray-400 text-xs">Or Upload Logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => onUpdate(element.id, { content: event.target.result });
                  reader.readAsDataURL(file);
                }
              }}
              className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] text-xs"
            />
          </div>
          {element.content && (
            <div className="p-2 bg-white rounded border border-[#30363D]">
              <img src={element.content} alt="Certifying Body" className="max-h-16 object-contain mx-auto" />
            </div>
          )}
        </>
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

export default function CertificateTemplates({ embedded = false }) {
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
      // Compress images in elements to reduce payload size
      const compressedElements = await compressElementImages(elements);
      
      // Compress background image if present
      let compressedBgImage = editingTemplate.background_image;
      if (compressedBgImage && compressedBgImage.startsWith('data:image')) {
        compressedBgImage = await compressImage(compressedBgImage, 1200, 0.7);
      }
      
      const payload = {
        name: editingTemplate.name,
        description: editingTemplate.description,
        background_color: editingTemplate.background_color,
        background_image: compressedBgImage,
        border_style: editingTemplate.border_style,
        orientation: editingTemplate.orientation,
        elements: compressedElements
      };
      
      // Check payload size and warn if large
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 4 * 1024 * 1024) {
        toast.error('Template is too large. Try using smaller images.');
        setSaving(false);
        return;
      }
      
      await axios.patch(`${API}/certificate-templates/${editingTemplate.template_id}`, payload, { headers });
      toast.success('Template saved');
      fetchData();
    } catch (err) {
      console.error('Save template error:', err);
      if (err.response?.status === 413) {
        toast.error('Template too large. Please use smaller images or remove some elements.');
      } else if (err.response?.status === 401) {
        toast.error('Session expired. Please refresh and login again.');
      } else {
        const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
        toast.error(`Failed to save: ${errorMsg}`);
      }
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

  const copyTemplate = async (template) => {
    try {
      const res = await axios.post(`${API}/certificate-templates`, {
        name: `${template.name} (Copy)`,
        description: template.description,
        orientation: template.orientation || 'landscape',
        border_style: template.border_style || 'classic',
        background_color: template.background_color,
        background_image: template.background_image,
        elements: template.elements || []
      }, { headers });
      
      toast.success('Template copied');
      fetchData();
      
      // Open editor for the new copy
      const newTemplate = {
        ...template,
        template_id: res.data.template_id,
        name: `${template.name} (Copy)`,
        is_default: false
      };
      openEditor(newTemplate);
    } catch (err) {
      toast.error('Failed to copy template');
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
    const defaults = {
      text:            { x: 15, y: 25, width: 70, height: 8, style: { fontSize: '24px', textAlign: 'center', color: '#333333', fontWeight: 'bold' } },
      logo:            { x: 38, y: 3,  width: 24, height: 14, style: {} },
      image:           { x: 30, y: 10, width: 40, height: 20, style: {} },
      signature:       { x: 15, y: 72, width: 30, height: 18, style: { title: 'Authorized Signatory' } },
      certifying_body: { x: 55, y: 72, width: 30, height: 18, style: {} },
    };
    const d = defaults[type] || defaults.text;
    const newElement = {
      id: `elem_${Date.now()}`,
      type,
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      content: '',
      placeholder: type === 'text' ? 'New Text' : `{${type}}`,
      style: d.style,
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
    const selectedEl = elements.find(e => e.id === selectedElement);
    
    // Preview PDF function
    const previewPDF = async () => {
      if (!editingTemplate) return;
      try {
        toast.info('Generating preview...');
        
        // First save the template with compressed images
        const compressedElements = await compressElementImages(elements);
        let compressedBgImage = editingTemplate.background_image;
        if (compressedBgImage && compressedBgImage.startsWith('data:image')) {
          compressedBgImage = await compressImage(compressedBgImage, 1200, 0.7);
        }
        
        // Save first
        await axios.patch(`${API}/certificate-templates/${editingTemplate.template_id}`, {
          name: editingTemplate.name,
          description: editingTemplate.description,
          background_color: editingTemplate.background_color,
          background_image: compressedBgImage,
          border_style: editingTemplate.border_style,
          orientation: editingTemplate.orientation,
          elements: compressedElements
        }, { headers });
        
        // Fetch PDF as blob with auth header
        const response = await axios.get(
          `${API}/certificate-templates/${editingTemplate.template_id}/preview`,
          { 
            headers,
            responseType: 'blob'
          }
        );
        
        // Create blob URL and open in new tab
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // Cleanup after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
        
        toast.success('Preview generated');
      } catch (err) {
        console.error('Preview error:', err);
        if (err.response?.status === 413) {
          toast.error('Template too large. Please use smaller images.');
        } else {
          toast.error('Failed to generate preview: ' + (err.response?.data?.detail || err.message));
        }
      }
    };
    
    const editorContent = (
        <div className="p-3 lg:p-4 h-[calc(100vh-64px)] flex flex-col" data-testid="certificate-editor">
          {/* Editor Header - compact */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-[#E8DDB5]">{editingTemplate.name}</h1>
              <span className="text-xs text-gray-500 hidden sm:inline">Click elements to edit • Drag to reposition</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={previewPDF} className="border-[#D4A836]/30 text-[#E8DDB5] h-8">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Preview PDF
              </Button>
              <Button variant="outline" size="sm" onClick={closeEditor} className="border-[#D4A836]/30 text-[#E8DDB5] h-8">
                Cancel
              </Button>
              <Button size="sm" onClick={saveTemplate} disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-black h-8">
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save
              </Button>
            </div>
          </div>

          {/* Main editor area - fills remaining height */}
          <div className="flex gap-3 flex-1 min-h-0">
            
            {/* Left toolbar - narrow, compact */}
            <div className="w-[180px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
              {/* Add Elements - icon grid */}
              <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-2">Add Elements</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { type: 'text', icon: Type, label: 'Text' },
                    { type: 'logo', icon: ImageIcon, label: 'Logo' },
                    { type: 'signature', icon: PenTool, label: 'Sign' },
                    { type: 'certifying_body', icon: Building2, label: 'Body' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => addElement(type)}
                      className="flex flex-col items-center gap-1 p-2 rounded-md border border-[#30363D] hover:border-[#D4A836]/50 hover:bg-[#D4A836]/5 transition-colors text-gray-400 hover:text-[#E8DDB5]"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Settings - compact */}
              <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-2">Settings</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Background</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={editingTemplate.background_color || '#ffffff'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, background_color: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-[#30363D] flex-shrink-0"
                      />
                      <Input
                        value={editingTemplate.background_color || '#ffffff'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, background_color: e.target.value })}
                        className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-7 text-xs px-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Border</label>
                    <Select
                      value={editingTemplate.border_style || 'classic'}
                      onValueChange={(v) => setEditingTemplate({ ...editingTemplate, border_style: v })}
                    >
                      <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-7 text-xs">
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
                    <label className="text-[10px] text-gray-500 block mb-1">Orientation</label>
                    <Select
                      value={editingTemplate.orientation || 'landscape'}
                      onValueChange={(v) => setEditingTemplate({ ...editingTemplate, orientation: v })}
                    >
                      <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161B22] border-[#30363D]">
                        <SelectItem value="landscape">Landscape</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Elements list */}
              <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3 flex-1 min-h-0 overflow-y-auto">
                <p className="text-xs font-medium text-gray-400 mb-2">Layers ({elements.length})</p>
                <div className="space-y-1">
                  {elements.map((el) => (
                    <button
                      key={el.id}
                      onClick={() => setSelectedElement(el.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs truncate transition-colors ${
                        selectedElement === el.id 
                          ? 'bg-[#D4A836]/20 text-[#E8DDB5] border border-[#D4A836]/30' 
                          : 'text-gray-400 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {el.type === 'text' ? (el.content || el.placeholder || 'Text').slice(0, 20) : el.type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas - takes all remaining space */}
            <div className="flex-1 min-w-0">
              <CertificateCanvas
                template={editingTemplate}
                elements={elements}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                onUpdateElement={updateElement}
              />
            </div>

            {/* Right panel - Properties */}
            <div className={`flex-shrink-0 transition-all duration-200 overflow-y-auto ${selectedEl ? 'w-[240px]' : 'w-[180px]'}`}>
              <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3 h-full">
                {selectedEl ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-[#E8DDB5]">
                        {selectedEl.type.charAt(0).toUpperCase() + selectedEl.type.slice(1).replace('_', ' ')}
                      </p>
                      <button
                        onClick={() => setSelectedElement(null)}
                        className="text-gray-500 hover:text-gray-300 text-xs"
                      >✕</button>
                    </div>
                    <ElementProperties
                      element={selectedEl}
                      onUpdate={updateElement}
                      onDelete={deleteElement}
                      signatures={signatures}
                      certifyingBodies={certifyingBodies}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Type className="w-8 h-8 text-gray-600 mb-3" />
                    <p className="text-xs text-gray-500">Click an element<br />on the canvas<br />to edit it</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    );

    // When embedded, return editor content directly (no double DashboardLayout)
    if (embedded) return editorContent;
    return <DashboardLayout>{editorContent}</DashboardLayout>;
  }

  // Main view
  const content = (
      <div className={embedded ? "" : "p-6 lg:p-8"} data-testid="certificate-templates-page">
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
              <ImageIcon className="w-4 h-4 mr-2" />
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
                      {/* Template Preview */}
                      <div className="mb-3 p-2 bg-[#0D1117] rounded-lg border border-[#30363D]">
                        <div 
                          className="w-full h-20 rounded flex items-center justify-center text-xs text-gray-400 overflow-hidden"
                          style={{
                            backgroundColor: template.background_color || '#ffffff',
                            backgroundImage: template.background_image ? `url(${template.background_image})` : 'none',
                            backgroundSize: 'cover'
                          }}
                        >
                          {template.elements && template.elements.length > 0 ? (
                            <div className="text-center text-[#1F4E79]">
                              <div className="text-xs font-bold">Certificate Preview</div>
                              <div className="text-[10px]">{template.elements.length} elements</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Empty Template</span>
                          )}
                        </div>
                      </div>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyTemplate(template)}
                            className="border-[#D4A836]/30 text-[#E8DDB5]"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
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
  );

  if (embedded) return content;
  return <DashboardLayout>{content}</DashboardLayout>;
}
