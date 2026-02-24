import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import {
  Plus, Trash2, GripVertical, Image, MessageSquare, AlertTriangle,
  CheckCircle, Upload, Edit, Save, ArrowLeft, Copy, Eye, X, ChevronUp, ChevronDown,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True or False' },
  { value: 'safe_unsafe', label: 'Safe / Unsafe' },
  { value: 'select_best', label: 'Select the Best N' },
  { value: 'image_question', label: 'Image Question' },
];

const MODULE_TYPES = [
  { value: 'phishing', label: 'Phishing Email' },
  { value: 'malicious_ad', label: 'Malicious Ad' },
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'password_security', label: 'Password Security' },
  { value: 'data_handling', label: 'Data Handling' },
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'usb_security', label: 'USB Security' },
  { value: 'mfa_awareness', label: 'MFA Awareness' },
  { value: 'general', label: 'General Security' },
];

function emptyQuestion(type = 'multiple_choice') {
  const base = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: '',
    explanation: '',
    correct_answer: '',
    difficulty: 'medium',
  };
  if (type === 'multiple_choice') return { ...base, options: ['', '', '', ''] };
  if (type === 'true_false') return { ...base, options: ['True', 'False'] };
  if (type === 'safe_unsafe') return { ...base, options: ['Safe', 'Unsafe'] };
  if (type === 'select_best') return { ...base, options: ['', '', '', '', ''], select_count: 2 };
  if (type === 'image_question') return { ...base, options: ['', '', '', ''], image_url: '' };
  return base;
}

// ------------------------------------------------------------------
// QuestionCard
// ------------------------------------------------------------------
function QuestionCard({ q, idx, total, onChange, onRemove, onMove, token }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const set = (field, val) => onChange(idx, { ...q, [field]: val });
  const setOption = (oi, val) => {
    const opts = [...(q.options || [])];
    opts[oi] = val;
    onChange(idx, { ...q, options: opts });
  };
  const addOption = () => onChange(idx, { ...q, options: [...(q.options || []), ''] });
  const removeOption = (oi) => {
    const opts = (q.options || []).filter((_, i) => i !== oi);
    onChange(idx, { ...q, options: opts });
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'training');
      const res = await axios.post(`${API}/media/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      // Response format: { media: { data_url: "..." }, ... }
      const imageUrl = res.data.media?.data_url || res.data.url || res.data.data_url;
      if (imageUrl) {
        set('image_url', imageUrl);
        toast.success('Image uploaded');
      } else {
        toast.error('Upload failed - no URL returned');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const isCorrect = (optVal) => {
    if (q.type === 'select_best') {
      return (q.correct_answer || '').split('||').includes(optVal);
    }
    return q.correct_answer === optVal;
  };

  const toggleCorrect = (optVal) => {
    if (q.type === 'select_best') {
      const parts = (q.correct_answer || '').split('||').filter(Boolean);
      if (parts.includes(optVal)) {
        set('correct_answer', parts.filter((p) => p !== optVal).join('||'));
      } else {
        set('correct_answer', [...parts, optVal].join('||'));
      }
    } else {
      set('correct_answer', optVal);
    }
  };

  return (
    <Card className="bg-[#161B22] border-[#30363D]" data-testid={`question-card-${idx}`}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
            <span className="text-sm font-medium text-[#D4A836]">Q{idx + 1}</span>
            <Select value={q.type} onValueChange={(v) => onChange(idx, { ...emptyQuestion(v), id: q.id, title: q.title, explanation: q.explanation })}>
              <SelectTrigger className="w-44 h-8 bg-[#0D1117] border-[#30363D] text-[#E8DDB5] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#161B22] border-[#30363D]">
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-[#E8DDB5]">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onMove(idx, -1)} disabled={idx === 0} className="h-7 w-7 p-0 text-gray-500"><ChevronUp className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onMove(idx, 1)} disabled={idx === total - 1} className="h-7 w-7 p-0 text-gray-500"><ChevronDown className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onRemove(idx)} className="h-7 w-7 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Image upload for image questions */}
        {q.type === 'image_question' && (
          <div className="space-y-2">
            <Label className="text-gray-400 text-xs">Question Image</Label>
            {q.image_url ? (
              <div className="relative w-full max-w-md">
                <img src={q.image_url} alt="Question" className="rounded-lg border border-[#30363D] max-h-48 object-contain" />
                <Button size="sm" variant="ghost" onClick={() => set('image_url', '')} className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 text-white rounded-full"><X className="w-3 h-3" /></Button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[#30363D] rounded-lg p-6 text-center cursor-pointer hover:border-[#D4A836]/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{uploading ? 'Uploading...' : 'Click to upload image'}</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
              </div>
            )}
          </div>
        )}

        {/* Question text */}
        <div>
          <Label className="text-gray-400 text-xs">Question</Label>
          <Textarea
            value={q.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Enter your question..."
            className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] min-h-[60px]"
            data-testid={`question-text-${idx}`}
          />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <Label className="text-gray-400 text-xs">
            {q.type === 'select_best' ? `Options (select best ${q.select_count || 2})` : 'Options'} — click to mark correct
          </Label>
          {(q.options || []).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCorrect(opt)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isCorrect(opt) ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-[#30363D] text-transparent hover:border-gray-500'
                }`}
                data-testid={`option-correct-${idx}-${oi}`}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <Input
                value={opt}
                onChange={(e) => setOption(oi, e.target.value)}
                placeholder={`Option ${oi + 1}`}
                className="flex-1 bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-9"
                data-testid={`option-input-${idx}-${oi}`}
              />
              {(q.options || []).length > 2 && (
                <Button size="sm" variant="ghost" onClick={() => removeOption(oi)} className="h-7 w-7 p-0 text-red-400"><X className="w-3 h-3" /></Button>
              )}
            </div>
          ))}
          {q.type !== 'true_false' && q.type !== 'safe_unsafe' && (
            <Button size="sm" variant="outline" onClick={addOption} className="border-[#D4A836]/30 text-[#D4A836] text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add Option
            </Button>
          )}
        </div>

        {/* Select count for select_best */}
        {q.type === 'select_best' && (
          <div>
            <Label className="text-gray-400 text-xs">How many to select?</Label>
            <Input
              type="number"
              min={1}
              max={(q.options || []).length}
              value={q.select_count || 2}
              onChange={(e) => set('select_count', parseInt(e.target.value) || 2)}
              className="w-24 bg-[#0D1117] border-[#30363D] text-[#E8DDB5] h-9"
            />
          </div>
        )}

        {/* Explanation */}
        <div>
          <Label className="text-gray-400 text-xs">Explanation (shown after answering)</Label>
          <Textarea
            value={q.explanation}
            onChange={(e) => set('explanation', e.target.value)}
            placeholder="Explain the correct answer..."
            className="bg-[#0D1117] border-[#30363D] text-[#E8DDB5] min-h-[40px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Main Page
// ------------------------------------------------------------------
export default function QuestionModuleDesigner() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [modules, setModules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [showDesigner, setShowDesigner] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const [moduleData, setModuleData] = useState({
    name: '',
    module_type: 'phishing',
    description: '',
    difficulty: 'medium',
    duration_minutes: 15,
    questions_per_session: 15,
    certificate_template_id: '',
    is_active: true,
  });
  const [questions, setQuestions] = useState([]);

  // ------- data loading -------
  const fetchData = async () => {
    setLoading(true);
    try {
      const [modsRes, tmplRes] = await Promise.all([
        axios.get(`${API}/training/modules`, { headers }),
        axios.get(`${API}/certificate-templates`, { headers }).catch(() => ({ data: [] })),
      ]);
      setModules(modsRes.data);
      setTemplates(tmplRes.data || []);
    } catch {
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchData(); }, [token]); // eslint-disable-line

  // ------- CRUD -------
  const openNew = () => {
    setEditingModuleId(null);
    setModuleData({ name: '', module_type: 'phishing', description: '', difficulty: 'medium', duration_minutes: 15, questions_per_session: 15, certificate_template_id: '', is_active: true });
    setQuestions([emptyQuestion('multiple_choice')]);
    setShowDesigner(true);
  };

  const openEdit = (mod) => {
    setEditingModuleId(mod.module_id);
    setModuleData({
      name: mod.name,
      module_type: mod.module_type,
      description: mod.description,
      difficulty: mod.difficulty,
      duration_minutes: mod.duration_minutes,
      questions_per_session: mod.questions_per_session || 15,
      certificate_template_id: mod.certificate_template_id || '',
      is_active: mod.is_active,
    });
    setQuestions((mod.questions && mod.questions.length > 0) ? mod.questions : [emptyQuestion('multiple_choice')]);
    setShowDesigner(true);
  };

  const saveModule = async () => {
    if (!moduleData.name.trim()) { toast.error('Module name is required'); return; }
    const validQs = questions.filter((q) => q.title.trim());
    if (validQs.length === 0) { toast.error('Add at least one question'); return; }
    setSaving(true);
    try {
      const payload = {
        ...moduleData,
        questions: validQs,
        scenarios_count: validQs.length,
        certificate_template_id: moduleData.certificate_template_id === 'default' ? '' : moduleData.certificate_template_id,
      };
      if (editingModuleId) {
        await axios.patch(`${API}/training/modules/${editingModuleId}`, payload, { headers });
        toast.success('Module updated');
      } else {
        await axios.post(`${API}/training/modules`, payload, { headers });
        toast.success('Module created');
      }
      setShowDesigner(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      await axios.delete(`${API}/training/modules/${moduleId}`, { headers });
      toast.success('Module deleted');
      setShowDeleteConfirm(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  // question helpers
  const updateQuestion = (idx, q) => setQuestions((prev) => prev.map((p, i) => (i === idx ? q : p)));
  const removeQuestion = (idx) => setQuestions((prev) => prev.filter((_, i) => i !== idx));
  const moveQuestion = (idx, dir) => {
    setQuestions((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };
  const addQuestion = (type = 'multiple_choice') => setQuestions((prev) => [...prev, emptyQuestion(type)]);

  // ------- RENDER -------
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-[#D4A836] border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  // -------- DESIGNER VIEW --------
  if (showDesigner) {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6" data-testid="module-designer-page">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowDesigner(false)} className="text-gray-400 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                {editingModuleId ? 'Edit Module' : 'Create Module'}
              </h1>
              <p className="text-sm text-gray-500">Design questions for your training module</p>
            </div>
          </div>

          {/* Module Meta */}
          <Card className="bg-[#0D1117] border-[#30363D]">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400 text-xs">Module Name</Label>
                <Input value={moduleData.name} onChange={(e) => setModuleData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Phishing Awareness Quiz" className="bg-[#161B22] border-[#30363D] text-[#E8DDB5]" data-testid="module-name-input" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Module Type</Label>
                <Select value={moduleData.module_type} onValueChange={(v) => setModuleData((p) => ({ ...p, module_type: v }))}>
                  <SelectTrigger className="bg-[#161B22] border-[#30363D] text-[#E8DDB5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {MODULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-[#E8DDB5]">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-gray-400 text-xs">Description</Label>
                <Textarea value={moduleData.description} onChange={(e) => setModuleData((p) => ({ ...p, description: e.target.value }))} placeholder="Module description..." className="bg-[#161B22] border-[#30363D] text-[#E8DDB5] min-h-[60px]" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Difficulty</Label>
                <Select value={moduleData.difficulty} onValueChange={(v) => setModuleData((p) => ({ ...p, difficulty: v }))}>
                  <SelectTrigger className="bg-[#161B22] border-[#30363D] text-[#E8DDB5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="easy" className="text-[#E8DDB5]">Easy</SelectItem>
                    <SelectItem value="medium" className="text-[#E8DDB5]">Medium</SelectItem>
                    <SelectItem value="hard" className="text-[#E8DDB5]">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Duration (minutes)</Label>
                <Input type="number" min={1} value={moduleData.duration_minutes} onChange={(e) => setModuleData((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 1 }))} className="bg-[#161B22] border-[#30363D] text-[#E8DDB5]" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Certificate Template</Label>
                <Select value={moduleData.certificate_template_id || 'default'} onValueChange={(v) => setModuleData((p) => ({ ...p, certificate_template_id: v === 'default' ? '' : v }))}>
                  <SelectTrigger className="bg-[#161B22] border-[#30363D] text-[#E8DDB5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="default" className="text-[#E8DDB5]">Default Template</SelectItem>
                    {templates.map((t) => <SelectItem key={t.template_id} value={t.template_id} className="text-[#E8DDB5]">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={moduleData.is_active} onCheckedChange={(v) => setModuleData((p) => ({ ...p, is_active: v }))} />
                <Label className="text-gray-400 text-xs">Active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#E8DDB5]">Questions ({questions.length})</h2>
            </div>
            {questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} idx={i} total={questions.length} onChange={updateQuestion} onRemove={removeQuestion} onMove={moveQuestion} token={token} />
            ))}
          </div>

          {/* Add question buttons */}
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => (
              <Button key={t.value} variant="outline" size="sm" onClick={() => addQuestion(t.value)} className="border-[#D4A836]/30 text-[#D4A836] text-xs" data-testid={`add-${t.value}-btn`}>
                <Plus className="w-3 h-3 mr-1" /> {t.label}
              </Button>
            ))}
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between pt-4 border-t border-[#30363D]">
            <Button variant="ghost" onClick={() => setShowDesigner(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={saveModule} disabled={saving} className="bg-[#D4A836] hover:bg-[#C49A30] text-[#0D1117] font-semibold" data-testid="save-module-btn">
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : editingModuleId ? 'Update Module' : 'Create Module'}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // -------- MODULE LIST VIEW --------
  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6" data-testid="module-designer-list">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>Module Designer</h1>
            <p className="text-sm text-gray-500">Create and manage training modules with custom questions</p>
          </div>
          <Button onClick={openNew} className="bg-[#D4A836] hover:bg-[#C49A30] text-[#0D1117] font-semibold" data-testid="create-module-btn">
            <Plus className="w-4 h-4 mr-2" /> New Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <Card className="bg-[#0D1117] border-[#30363D]">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No training modules yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {modules.map((mod) => (
              <Card key={mod.module_id} className="bg-[#0D1117] border-[#30363D] hover:border-[#D4A836]/30 transition-colors" data-testid={`module-card-${mod.module_id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-[#E8DDB5]">{mod.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${mod.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {mod.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{mod.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize">{(mod.module_type || '').replace(/_/g, ' ')}</span>
                        <span>{mod.difficulty}</span>
                        <span>{mod.duration_minutes} min</span>
                        <span>{mod.questions?.length || mod.scenarios_count || 0} questions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => openEdit(mod)} className="border-[#D4A836]/30 text-[#D4A836]" data-testid={`edit-module-${mod.module_id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(mod.module_id)} className="border-red-500/30 text-red-400" data-testid={`delete-module-${mod.module_id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-[#161B22] border-[#30363D]">
          <DialogHeader>
            <DialogTitle className="text-[#E8DDB5]">Delete Module</DialogTitle>
            <DialogDescription className="text-gray-400">Are you sure you want to delete this training module? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)} className="text-gray-400">Cancel</Button>
            <Button onClick={() => deleteModule(showDeleteConfirm)} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
