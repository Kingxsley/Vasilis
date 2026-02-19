import React, { useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  Plus, GripVertical, Trash2, Mail, Monitor, Phone, Shield, AlertTriangle,
  FileText, Image, Link, Type, MessageSquare, Users, Clock, Target,
  Save, Eye, Sparkles, Settings, Play, ChevronUp, ChevronDown,
  Layout, MousePointerClick, QrCode, Usb, Lock, Briefcase, Database, Cloud
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Simulation types available
const SIMULATION_TYPES = [
  { 
    id: 'phishing_email', 
    name: 'Phishing Email', 
    icon: Mail, 
    color: 'bg-blue-500',
    description: 'Create fake emails to test user awareness'
  },
  { 
    id: 'malicious_ad', 
    name: 'Malicious Ad', 
    icon: Monitor, 
    color: 'bg-purple-500',
    description: 'Design deceptive advertisements'
  },
  { 
    id: 'smishing', 
    name: 'SMS Phishing', 
    icon: Phone, 
    color: 'bg-green-500',
    description: 'Create SMS-based phishing simulations'
  },
  { 
    id: 'qr_phishing', 
    name: 'QR Code Attack', 
    icon: QrCode, 
    color: 'bg-orange-500',
    description: 'Generate malicious QR code scenarios'
  },
  { 
    id: 'usb_drop', 
    name: 'USB Drop', 
    icon: Usb, 
    color: 'bg-red-500',
    description: 'USB device baiting scenarios'
  },
  { 
    id: 'mfa_fatigue', 
    name: 'MFA Fatigue', 
    icon: Lock, 
    color: 'bg-yellow-500',
    description: 'Test MFA bombardment resilience'
  },
  { 
    id: 'bec', 
    name: 'Business Email Compromise', 
    icon: Briefcase, 
    color: 'bg-indigo-500',
    description: 'Executive impersonation scenarios'
  },
  { 
    id: 'data_handling', 
    name: 'Data Handling Test', 
    icon: Database, 
    color: 'bg-teal-500',
    description: 'Test data security practices'
  },
  { 
    id: 'shadow_it', 
    name: 'Shadow IT Detection', 
    icon: Cloud, 
    color: 'bg-pink-500',
    description: 'Unauthorized software scenarios'
  },
];

// Draggable building blocks
const BUILDING_BLOCKS = [
  { 
    id: 'subject', 
    type: 'text', 
    name: 'Subject Line', 
    icon: Type, 
    placeholder: 'Enter email subject...',
    category: 'content'
  },
  { 
    id: 'sender', 
    type: 'text', 
    name: 'Sender Info', 
    icon: Users, 
    placeholder: 'From: John Doe <john@company.com>',
    category: 'content'
  },
  { 
    id: 'body_text', 
    type: 'textarea', 
    name: 'Body Text', 
    icon: FileText, 
    placeholder: 'Enter the main message content...',
    category: 'content'
  },
  { 
    id: 'urgency_message', 
    type: 'text', 
    name: 'Urgency Message', 
    icon: AlertTriangle, 
    placeholder: 'ACTION REQUIRED: Your account will be suspended!',
    category: 'tactics'
  },
  { 
    id: 'call_to_action', 
    type: 'text', 
    name: 'Call to Action', 
    icon: MousePointerClick, 
    placeholder: 'Click here to verify your account',
    category: 'tactics'
  },
  { 
    id: 'fake_link', 
    type: 'text', 
    name: 'Phishing Link', 
    icon: Link, 
    placeholder: 'https://secure-login.company.com (actually malicious)',
    category: 'tactics'
  },
  { 
    id: 'image', 
    type: 'image', 
    name: 'Image/Logo', 
    icon: Image, 
    placeholder: 'Add company logo or image URL',
    category: 'visual'
  },
  { 
    id: 'signature', 
    type: 'textarea', 
    name: 'Signature Block', 
    icon: MessageSquare, 
    placeholder: 'Best regards,\nIT Security Team\nCompany Inc.',
    category: 'content'
  },
  { 
    id: 'deadline', 
    type: 'text', 
    name: 'Deadline/Timer', 
    icon: Clock, 
    placeholder: 'You have 24 hours to respond',
    category: 'tactics'
  },
  { 
    id: 'threat', 
    type: 'text', 
    name: 'Threat/Consequence', 
    icon: Shield, 
    placeholder: 'Failure to act will result in account termination',
    category: 'tactics'
  },
];

// Group blocks by category
const BLOCK_CATEGORIES = {
  content: { name: 'Content Blocks', color: 'border-blue-500' },
  tactics: { name: 'Phishing Tactics', color: 'border-red-500' },
  visual: { name: 'Visual Elements', color: 'border-green-500' },
};

export default function SimulationBuilder() {
  const { token } = useAuth();
  const [simulationType, setSimulationType] = useState(null);
  const [simulationName, setSimulationName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [blockValues, setBlockValues] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dropAreaRef = useRef(null);

  // Handle drag start from palette
  const handleDragStart = (e, block) => {
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify(block));
  };

  // Handle drag over the drop area
  const handleDragOver = (e, index = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverIndex(index !== null ? index : selectedBlocks.length);
  };

  // Handle drop to add block
  const handleDrop = (e, index = null) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    
    if (data) {
      try {
        const block = JSON.parse(data);
        const newBlock = {
          ...block,
          instanceId: `${block.id}_${Date.now()}`
        };
        
        const insertIndex = index !== null ? index : selectedBlocks.length;
        const newBlocks = [...selectedBlocks];
        newBlocks.splice(insertIndex, 0, newBlock);
        setSelectedBlocks(newBlocks);
        
        // Initialize value
        setBlockValues(prev => ({
          ...prev,
          [newBlock.instanceId]: ''
        }));
        
        toast.success(`Added ${block.name}`);
      } catch (err) {
        console.error('Drop error:', err);
      }
    }
    
    setDraggedBlock(null);
    setDragOverIndex(null);
  };

  // Handle drag end (cleanup)
  const handleDragEnd = () => {
    setDraggedBlock(null);
    setDragOverIndex(null);
  };

  // Move block within canvas
  const moveBlock = (fromIndex, toIndex) => {
    const newBlocks = [...selectedBlocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    setSelectedBlocks(newBlocks);
  };

  // Remove block
  const removeBlock = (instanceId) => {
    setSelectedBlocks(prev => prev.filter(b => b.instanceId !== instanceId));
    setBlockValues(prev => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
  };

  // Update block value
  const updateBlockValue = (instanceId, value) => {
    setBlockValues(prev => ({
      ...prev,
      [instanceId]: value
    }));
  };

  // Save simulation
  const saveSimulation = async () => {
    if (!simulationType || !simulationName) {
      toast.error('Please select a simulation type and name');
      return;
    }
    
    if (selectedBlocks.length === 0) {
      toast.error('Please add at least one building block');
      return;
    }

    setSaving(true);
    try {
      // Build the content based on blocks
      const content = {
        blocks: selectedBlocks.map(block => ({
          type: block.id,
          value: blockValues[block.instanceId] || ''
        })),
        metadata: {
          simulationType: simulationType.id,
          difficulty,
          createdAt: new Date().toISOString()
        }
      };

      const scenarioData = {
        title: simulationName,
        scenario_type: simulationType.id,
        difficulty,
        correct_answer: 'unsafe',
        explanation: `This ${simulationType.name} simulation tests user awareness`,
        content
      };

      await axios.post(`${API}/scenarios`, scenarioData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Simulation created successfully!');
      
      // Reset form
      setSimulationType(null);
      setSimulationName('');
      setSelectedBlocks([]);
      setBlockValues({});
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save simulation');
    } finally {
      setSaving(false);
    }
  };

  // Render block in canvas
  const renderBlock = (block, index) => {
    const Icon = block.icon;
    const categoryColor = BLOCK_CATEGORIES[block.category]?.color || 'border-gray-500';
    
    return (
      <div
        key={block.instanceId}
        className={`group relative bg-[#1a1a24] border-l-4 ${categoryColor} rounded-lg p-4 mb-3 transition-all ${
          dragOverIndex === index ? 'border-t-2 border-t-[#D4A836]' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div 
            className="cursor-move text-gray-500 hover:text-[#D4A836] mt-1"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({ ...block, reorder: true, fromIndex: index }));
            }}
          >
            <GripVertical className="w-5 h-5" />
          </div>
          
          {/* Block content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[#D4A836]" />
              <span className="text-sm font-medium text-[#E8DDB5]">{block.name}</span>
            </div>
            
            {block.type === 'textarea' ? (
              <Textarea
                value={blockValues[block.instanceId] || ''}
                onChange={(e) => updateBlockValue(block.instanceId, e.target.value)}
                placeholder={block.placeholder}
                className="bg-[#0D1117] border-[#30363D] text-white min-h-[80px] resize-none"
              />
            ) : (
              <Input
                value={blockValues[block.instanceId] || ''}
                onChange={(e) => updateBlockValue(block.instanceId, e.target.value)}
                placeholder={block.placeholder}
                className="bg-[#0D1117] border-[#30363D] text-white"
              />
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => index > 0 && moveBlock(index, index - 1)}
              disabled={index === 0}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => index < selectedBlocks.length - 1 && moveBlock(index, index + 1)}
              disabled={index === selectedBlocks.length - 1}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeBlock(block.instanceId)}
              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="simulation-builder">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#E8DDB5]">Create Simulation</h1>
            <p className="text-gray-400 mt-1">Build custom security simulations with drag-and-drop</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={selectedBlocks.length === 0}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={saveSimulation}
              disabled={saving || !simulationType || !simulationName || selectedBlocks.length === 0}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              {saving ? <><span className="animate-spin mr-2">⏳</span>Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Simulation</>}
            </Button>
          </div>
        </div>

        {/* Step 1: Select Simulation Type */}
        {!simulationType ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#D4A836]" />
                Step 1: Choose Simulation Type
              </CardTitle>
              <CardDescription className="text-gray-400">
                Select the type of security awareness test you want to create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {SIMULATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSimulationType(type)}
                      className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg hover:border-[#D4A836] transition-all text-left group"
                      data-testid={`sim-type-${type.id}`}
                    >
                      <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center mb-3`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-medium text-[#E8DDB5] group-hover:text-[#D4A836]">
                        {type.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Selected Type Header */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${simulationType.color} rounded-lg flex items-center justify-center`}>
                      {React.createElement(simulationType.icon, { className: "w-6 h-6 text-white" })}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <Input
                          value={simulationName}
                          onChange={(e) => setSimulationName(e.target.value)}
                          placeholder="Enter simulation name..."
                          className="bg-[#0D1117] border-[#30363D] text-white w-80"
                        />
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger className="w-32 bg-[#0D1117] border-[#30363D]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{simulationType.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSimulationType(null);
                      setSelectedBlocks([]);
                      setBlockValues({});
                    }}
                    className="text-gray-400"
                  >
                    Change Type
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Builder Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Block Palette */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="bg-[#161B22] border-[#30363D]">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-[#E8DDB5]">Building Blocks</CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Drag blocks to the canvas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(BLOCK_CATEGORIES).map(([categoryId, category]) => (
                      <div key={categoryId}>
                        <h4 className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                          {category.name}
                        </h4>
                        <div className="space-y-2">
                          {BUILDING_BLOCKS.filter(b => b.category === categoryId).map((block) => {
                            const Icon = block.icon;
                            return (
                              <div
                                key={block.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, block)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center gap-2 p-2 bg-[#0D1117] border border-[#30363D] rounded cursor-grab hover:border-[#D4A836] transition-all ${
                                  draggedBlock?.id === block.id ? 'opacity-50 scale-95' : ''
                                }`}
                              >
                                <Icon className="w-4 h-4 text-[#D4A836]" />
                                <span className="text-sm text-gray-300">{block.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Drop Canvas */}
              <div className="lg:col-span-3">
                <Card className="bg-[#161B22] border-[#30363D] min-h-[500px]">
                  <CardHeader className="py-3 border-b border-[#30363D]">
                    <CardTitle className="text-sm text-[#E8DDB5] flex items-center gap-2">
                      <Layout className="w-4 h-4 text-[#D4A836]" />
                      Simulation Canvas
                      {selectedBlocks.length > 0 && (
                        <Badge className="ml-2 bg-[#D4A836]/20 text-[#D4A836]">
                          {selectedBlocks.length} blocks
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div
                      ref={dropAreaRef}
                      onDragOver={(e) => handleDragOver(e)}
                      onDrop={(e) => handleDrop(e)}
                      className={`min-h-[400px] rounded-lg border-2 border-dashed transition-colors ${
                        draggedBlock 
                          ? 'border-[#D4A836] bg-[#D4A836]/5' 
                          : 'border-[#30363D]'
                      } ${selectedBlocks.length === 0 ? 'flex items-center justify-center' : 'p-4'}`}
                    >
                      {selectedBlocks.length === 0 ? (
                        <div className="text-center text-gray-500">
                          <Sparkles className="w-12 h-12 mx-auto mb-3 text-[#D4A836]/30" />
                          <p className="font-medium">Drag and drop blocks here</p>
                          <p className="text-sm">Start building your simulation</p>
                        </div>
                      ) : (
                        <>
                          {selectedBlocks.map((block, index) => renderBlock(block, index))}
                          {/* Drop zone at the end */}
                          <div
                            onDragOver={(e) => handleDragOver(e, selectedBlocks.length)}
                            onDrop={(e) => handleDrop(e, selectedBlocks.length)}
                            className={`h-12 rounded border-2 border-dashed transition-colors ${
                              dragOverIndex === selectedBlocks.length
                                ? 'border-[#D4A836] bg-[#D4A836]/10'
                                : 'border-transparent'
                            }`}
                          />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="bg-[#161B22] border-[#30363D] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5]">Simulation Preview</DialogTitle>
              <DialogDescription className="text-gray-400">
                This is how your simulation will appear
              </DialogDescription>
            </DialogHeader>
            <div className="bg-white text-black p-6 rounded-lg max-h-[60vh] overflow-y-auto">
              {selectedBlocks.map((block) => {
                const value = blockValues[block.instanceId];
                if (!value) return null;
                
                switch (block.id) {
                  case 'subject':
                    return <h2 key={block.instanceId} className="text-xl font-bold mb-4">{value}</h2>;
                  case 'sender':
                    return <p key={block.instanceId} className="text-sm text-gray-600 mb-4">{value}</p>;
                  case 'body_text':
                    return <p key={block.instanceId} className="mb-4 whitespace-pre-wrap">{value}</p>;
                  case 'urgency_message':
                    return <div key={block.instanceId} className="bg-red-100 border border-red-300 text-red-800 p-3 rounded mb-4">{value}</div>;
                  case 'call_to_action':
                    return <button key={block.instanceId} className="bg-blue-600 text-white px-4 py-2 rounded mb-4 block">{value}</button>;
                  case 'fake_link':
                    return <a key={block.instanceId} href="#" className="text-blue-600 underline block mb-4">{value}</a>;
                  case 'image':
                    return <img key={block.instanceId} src={value} alt="Preview" className="max-w-full h-auto mb-4 rounded" onError={(e) => { e.target.style.display = 'none'; }} />;
                  case 'signature':
                    return <div key={block.instanceId} className="border-t pt-4 mt-4 text-sm text-gray-600 whitespace-pre-wrap">{value}</div>;
                  case 'deadline':
                    return <p key={block.instanceId} className="text-orange-600 font-medium mb-4">{value}</p>;
                  case 'threat':
                    return <p key={block.instanceId} className="text-red-600 mb-4">{value}</p>;
                  default:
                    return <p key={block.instanceId} className="mb-4">{value}</p>;
                }
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
