import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import {
  Upload, Download, Plus, Trash2, Edit, Save, X, ChevronDown, ChevronUp,
  FileJson, CheckCircle, AlertTriangle, Eye, Copy
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True or False' },
  { value: 'safe_unsafe', label: 'Safe / Unsafe' },
];

const MODULE_TYPES = [
  { value: 'phishing', label: 'Phishing Email' },
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'password_security', label: 'Password Security' },
  { value: 'malicious_ad', label: 'Malicious Ad' },
  { value: 'data_protection', label: 'Data Protection' },
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'physical_security', label: 'Physical Security' },
  { value: 'mfa', label: 'MFA Awareness' },
  { value: 'bec', label: 'Business Email Compromise' },
  { value: 'secure_browsing', label: 'Secure Browsing' },
  { value: 'general', label: 'General Security' },
];

export default function ModuleUploader() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/training/modules`, { headers });
      setModules(res.data);
    } catch (err) {
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const toggleModuleExpand = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleToggleActive = async (module) => {
    try {
      await axios.patch(`${API}/training/modules/${module.module_id}`, 
        { is_active: !module.is_active }, 
        { headers }
      );
      toast.success(`Module ${module.is_active ? 'deactivated' : 'activated'}`);
      fetchModules();
    } catch (err) {
      toast.error('Failed to update module');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await axios.delete(`${API}/training/modules/${moduleId}`, { headers });
      toast.success('Module deleted');
      fetchModules();
    } catch (err) {
      toast.error('Failed to delete module');
    }
  };

  const handleExportModules = async () => {
    try {
      const res = await axios.get(`${API}/training/modules/export`, { headers });
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'training_modules_export.json';
      link.click();
      toast.success('Modules exported');
    } catch (err) {
      toast.error('Failed to export modules');
    }
  };

  const handleBulkUpload = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const modulesArray = Array.isArray(parsed) ? parsed : (parsed.modules || [parsed]);
      
      setUploading(true);
      const res = await axios.post(`${API}/training/modules/bulk`, 
        { modules: modulesArray }, 
        { headers }
      );
      
      toast.success(res.data.message);
      setShowJsonDialog(false);
      setJsonInput('');
      fetchModules();
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error('Invalid JSON format');
      } else {
        toast.error(err.response?.data?.detail || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonInput(event.target.result);
      setShowJsonDialog(true);
    };
    reader.readAsText(file);
  };

  const handleSaveModule = async () => {
    if (!editingModule) return;
    try {
      await axios.patch(`${API}/training/modules/${editingModule.module_id}`, editingModule, { headers });
      toast.success('Module saved');
      setEditingModule(null);
      fetchModules();
    } catch (err) {
      toast.error('Failed to save module');
    }
  };

  const updateQuestion = (qIndex, field, value) => {
    if (!editingModule) return;
    const questions = [...(editingModule.questions || [])];
    questions[qIndex] = { ...questions[qIndex], [field]: value };
    setEditingModule({ ...editingModule, questions });
  };

  const updateQuestionOption = (qIndex, optIndex, value) => {
    if (!editingModule) return;
    const questions = [...(editingModule.questions || [])];
    const options = [...(questions[qIndex].options || [])];
    options[optIndex] = value;
    questions[qIndex] = { ...questions[qIndex], options };
    setEditingModule({ ...editingModule, questions });
  };

  const addQuestion = () => {
    if (!editingModule) return;
    const questions = [...(editingModule.questions || [])];
    questions.push({
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      title: '',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      difficulty: 'medium'
    });
    setEditingModule({ ...editingModule, questions, scenarios_count: questions.length });
  };

  const removeQuestion = (qIndex) => {
    if (!editingModule) return;
    const questions = (editingModule.questions || []).filter((_, i) => i !== qIndex);
    setEditingModule({ ...editingModule, questions, scenarios_count: questions.length });
  };

  const copyModuleJson = (module) => {
    navigator.clipboard.writeText(JSON.stringify(module, null, 2));
    toast.success('Module JSON copied to clipboard');
  };

  const cleanupOrphanedSessions = async () => {
    try {
      const res = await axios.delete(`${API}/training/sessions/cleanup-orphaned`, { headers });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cleanup sessions');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-[#D4A836] border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6" data-testid="module-uploader-page">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Training Module Manager
            </h1>
            <p className="text-sm text-gray-500">Upload, edit, and manage training modules with questions</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={cleanupOrphanedSessions} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-2" /> Cleanup Old Sessions
            </Button>
            <Button variant="outline" onClick={handleExportModules} className="border-[#D4A836]/30 text-[#D4A836]">
              <Download className="w-4 h-4 mr-2" /> Export All
            </Button>
            <label>
              <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              <Button as="span" className="bg-[#D4A836] hover:bg-[#C49A30] text-[#0D1117] cursor-pointer">
                <Upload className="w-4 h-4 mr-2" /> Upload JSON
              </Button>
            </label>
            <Button onClick={() => setShowJsonDialog(true)} className="bg-[#2979FF] hover:bg-[#2962FF]">
              <FileJson className="w-4 h-4 mr-2" /> Paste JSON
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#D4A836]">{modules.length}</p>
              <p className="text-xs text-gray-500">Total Modules</p>
            </CardContent>
          </Card>
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{modules.filter(m => m.is_active).length}</p>
              <p className="text-xs text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{modules.filter(m => !m.is_active).length}</p>
              <p className="text-xs text-gray-500">Inactive</p>
            </CardContent>
          </Card>
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#2979FF]">
                {modules.reduce((sum, m) => sum + (m.questions?.length || m.scenarios_count || 0), 0)}
              </p>
              <p className="text-xs text-gray-500">Total Questions</p>
            </CardContent>
          </Card>
        </div>

        {/* Module List */}
        <div className="space-y-3">
          {modules.length === 0 ? (
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardContent className="p-8 text-center">
                <FileJson className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No modules yet. Upload a JSON file or paste JSON to get started.</p>
              </CardContent>
            </Card>
          ) : (
            modules.map((module) => (
              <Card key={module.module_id} className="bg-[#161B22] border-[#30363D]">
                <CardContent className="p-4">
                  {/* Module Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleModuleExpand(module.module_id)}>
                      {expandedModules[module.module_id] ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#E8DDB5]">{module.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${module.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {module.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {module.questions?.length || module.scenarios_count || 0} questions • 
                          {module.questions_per_session || 15} per session • 
                          {module.difficulty} • {module.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={module.is_active} 
                        onCheckedChange={() => handleToggleActive(module)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => copyModuleJson(module)} className="text-gray-400">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingModule({...module})} className="text-[#D4A836]">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteModule(module.module_id)} className="text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Questions */}
                  {expandedModules[module.module_id] && (
                    <div className="mt-4 pt-4 border-t border-[#30363D] space-y-2">
                      <p className="text-xs text-gray-400 mb-2">Questions Preview:</p>
                      {(module.questions || []).slice(0, 5).map((q, idx) => (
                        <div key={idx} className="p-2 bg-[#0D1117] rounded text-sm">
                          <span className="text-[#D4A836] mr-2">Q{idx + 1}:</span>
                          <span className="text-gray-300">{q.title?.substring(0, 100)}{q.title?.length > 100 ? '...' : ''}</span>
                        </div>
                      ))}
                      {(module.questions?.length || 0) > 5 && (
                        <p className="text-xs text-gray-500">... and {module.questions.length - 5} more questions</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* JSON Upload Dialog */}
      <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
        <DialogContent className="bg-[#161B22] border-[#30363D] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#E8DDB5]">Upload Modules JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Paste your modules JSON below. You can upload a single module or an array of modules.
            </p>
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[{"name": "Module Name", "questions": [...]}]'
              className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] font-mono text-sm min-h-[400px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowJsonDialog(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={uploading || !jsonInput.trim()} className="bg-[#D4A836] hover:bg-[#C49A30] text-[#0D1117]">
              {uploading ? 'Uploading...' : 'Upload Modules'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
        <DialogContent className="bg-[#161B22] border-[#30363D] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#E8DDB5]">Edit Module: {editingModule?.name}</DialogTitle>
          </DialogHeader>
          
          {editingModule && (
            <div className="space-y-6">
              {/* Module Settings */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-400 text-xs">Module Name</Label>
                  <Input 
                    value={editingModule.name} 
                    onChange={(e) => setEditingModule({...editingModule, name: e.target.value})}
                    className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Type</Label>
                  <Select value={editingModule.module_type} onValueChange={(v) => setEditingModule({...editingModule, module_type: v})}>
                    <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      {MODULE_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-[#E8DDB5]">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Difficulty</Label>
                  <Select value={editingModule.difficulty} onValueChange={(v) => setEditingModule({...editingModule, difficulty: v})}>
                    <SelectTrigger className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      <SelectItem value="easy" className="text-[#E8DDB5]">Easy</SelectItem>
                      <SelectItem value="medium" className="text-[#E8DDB5]">Medium</SelectItem>
                      <SelectItem value="hard" className="text-[#E8DDB5]">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Duration (min)</Label>
                  <Input 
                    type="number"
                    value={editingModule.duration_minutes} 
                    onChange={(e) => setEditingModule({...editingModule, duration_minutes: parseInt(e.target.value) || 30})}
                    className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Questions Per Session</Label>
                  <Input 
                    type="number"
                    value={editingModule.questions_per_session || 15} 
                    onChange={(e) => setEditingModule({...editingModule, questions_per_session: parseInt(e.target.value) || 15})}
                    className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch 
                    checked={editingModule.is_active} 
                    onCheckedChange={(v) => setEditingModule({...editingModule, is_active: v})}
                  />
                  <Label className="text-gray-400 text-xs">Active</Label>
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Description</Label>
                <Textarea 
                  value={editingModule.description} 
                  onChange={(e) => setEditingModule({...editingModule, description: e.target.value})}
                  className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5]"
                />
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-[#E8DDB5]">Questions ({editingModule.questions?.length || 0})</Label>
                  <Button size="sm" onClick={addQuestion} className="bg-[#D4A836] hover:bg-[#C49A30] text-[#0D1117]">
                    <Plus className="w-4 h-4 mr-1" /> Add Question
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {(editingModule.questions || []).map((q, qIdx) => (
                    <Card key={q.id || qIdx} className="bg-[#0D1117] border-[#30363D]">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[#D4A836] font-bold text-sm pt-2">Q{qIdx + 1}</span>
                          <div className="flex-1">
                            <Textarea
                              value={q.title}
                              onChange={(e) => updateQuestion(qIdx, 'title', e.target.value)}
                              placeholder="Question text..."
                              className="bg-[#161B22] border-[#30363D] text-[#E8DDB5] min-h-[60px]"
                            />
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeQuestion(qIdx)} className="text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pl-8">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_${qIdx}`}
                                checked={q.correct_answer === opt}
                                onChange={() => updateQuestion(qIdx, 'correct_answer', opt)}
                                className="accent-green-500"
                              />
                              <Input
                                value={opt}
                                onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className="bg-[#161B22] border-[#30363D] text-[#E8DDB5] h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="pl-8">
                          <Input
                            value={q.explanation || ''}
                            onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                            placeholder="Explanation (shown after answering)"
                            className="bg-[#161B22] border-[#30363D] text-[#E8DDB5] h-8 text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingModule(null)} className="text-gray-400">Cancel</Button>
            <Button onClick={handleSaveModule} className="bg-[#D4A836] hover:bg-[#C49A30] text-[#0D1117]">
              <Save className="w-4 h-4 mr-2" /> Save Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
