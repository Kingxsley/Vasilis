import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { ChevronUp, ChevronDown, X, Code, Upload, FileJson, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ModuleBuilder() {
  const { token, user } = useAuth();
  const [modules, setModules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    module_type: 'phishing',
    description: '',
    difficulty: 'easy',
    duration_minutes: 10,
    scenarios_count: 0,
    scenarios: [],
    certificate_template_id: '',
    is_active: true
  });

  const [allScenarios, setAllScenarios] = useState([]);

  // Bulk import state
  const [activeTab, setActiveTab] = useState('designer'); // 'designer' | 'bulk-import'
  const [bulkJson, setBulkJson] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkError, setBulkError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [modsRes, tmplRes] = await Promise.all([
          axios.get(`${API}/training/modules`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/certificate-templates`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setModules(modsRes.data);
        setTemplates(tmplRes.data || []);

        try {
          const scenRes = await axios.get(`${API}/scenarios`, { headers: { Authorization: `Bearer ${token}` } });
          setAllScenarios(scenRes.data || []);
        } catch {
        }
      } catch (err) {
        toast.error('Failed to load modules or templates');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const resetForm = () => {
    setEditingModuleId(null);
    setFormData({
      name: '',
      module_type: 'phishing',
      description: '',
      difficulty: 'easy',
      duration_minutes: 10,
      scenarios_count: 0,
      scenarios: [],
      certificate_template_id: '',
      is_active: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingModuleId) {
        const payload = { ...formData };
        delete payload.module_type;
        delete payload.scenarios_count;
        if (!payload.certificate_template_id) delete payload.certificate_template_id;

        await axios.patch(`${API}/training/modules/${editingModuleId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Module updated');
      } else {
        const payload = { ...formData };
        if (!payload.certificate_template_id) delete payload.certificate_template_id;

        await axios.post(`${API}/training/modules`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Module created');
      }

      resetForm();

      const modsRes = await axios.get(`${API}/training/modules`, { headers: { Authorization: `Bearer ${token}` } });
      setModules(modsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (mod) => {
    setEditingModuleId(mod.module_id);
    setFormData({
      name: mod.name,
      module_type: mod.module_type,
      description: mod.description,
      difficulty: mod.difficulty,
      duration_minutes: mod.duration_minutes,
      scenarios_count: mod.scenarios_count,
      scenarios: mod.scenarios || [],
      certificate_template_id: mod.certificate_template_id || '',
      is_active: mod.is_active
    });
  };

  useEffect(() => {
    setFormData((prev) => ({ ...prev, scenarios_count: prev.scenarios?.length || 0 }));
  }, [formData.scenarios]);

  const handleAddScenario = (scenarioId) => {
    setFormData((prev) => {
      if (!scenarioId) return prev;
      const existing = prev.scenarios || [];
      if (existing.includes(scenarioId)) return prev;
      return { ...prev, scenarios: [...existing, scenarioId] };
    });
  };

  const moveScenario = (index, direction) => {
    setFormData((prev) => {
      const list = prev.scenarios ? [...prev.scenarios] : [];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[newIndex];
      list[newIndex] = temp;
      return { ...prev, scenarios: list };
    });
  };

  const removeScenario = (index) => {
    setFormData((prev) => {
      const list = prev.scenarios ? [...prev.scenarios] : [];
      list.splice(index, 1);
      return { ...prev, scenarios: list };
    });
  };

  const handleToggleActive = async (mod) => {
    try {
      await axios.patch(`${API}/training/modules/${mod.module_id}`, { is_active: !mod.is_active }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Module ${mod.is_active ? 'paused' : 'activated'}`);
      const modsRes = await axios.get(`${API}/training/modules`, { headers: { Authorization: `Bearer ${token}` } });
      setModules(modsRes.data);
    } catch (err) {
      toast.error('Failed to update module status');
    }
  };

  const handleDelete = async (mod) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await axios.delete(`${API}/training/modules/${mod.module_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Module deleted');
      const modsRes = await axios.get(`${API}/training/modules`, { headers: { Authorization: `Bearer ${token}` } });
      setModules(modsRes.data);
    } catch (err) {
      toast.error('Failed to delete module');
    }
  };

  // Bulk import handlers
  const handleBulkFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setBulkJson(text);
      setBulkError('');
      try {
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : parsed.modules ? parsed.modules : [parsed];
        setBulkPreview(arr);
      } catch {
        setBulkError('Invalid JSON file. Please check the format.');
        setBulkPreview(null);
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const handleBulkJsonChange = (text) => {
    setBulkJson(text);
    setBulkError('');
    setBulkPreview(null);
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.modules ? parsed.modules : [parsed];
      setBulkPreview(arr);
    } catch {
      setBulkError('Invalid JSON — check formatting before importing.');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkPreview || bulkPreview.length === 0) {
      toast.error('No valid modules to import');
      return;
    }
    setBulkUploading(true);
    try {
      const res = await axios.post(
        `${API}/training/modules/bulk`,
        { modules: bulkPreview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || `Imported ${bulkPreview.length} module(s) successfully`);
      setBulkJson('');
      setBulkPreview(null);
      setBulkError('');
      // Refresh module list
      const modsRes = await axios.get(`${API}/training/modules`, { headers: { Authorization: `Bearer ${token}` } });
      setModules(modsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bulk import failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleExportModules = async () => {
    try {
      const res = await axios.get(`${API}/training/modules/export`, { headers: { Authorization: `Bearer ${token}` } });
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'training_modules_export.json';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Modules exported');
    } catch {
      toast.error('Failed to export modules');
    }
  };

  const validTemplates = templates
    .filter((t) => t && t.template_id && String(t.template_id).trim() !== '');

  const validScenarios = allScenarios
    .filter((s) => s && s.scenario_id && String(s.scenario_id).trim() !== '')
    .map((s) => ({ ...s, scenario_id: String(s.scenario_id) }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <p className="text-gray-400">Loading modules...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="module-builder-page">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>Module Designer</h1>
            <p className="text-gray-400">Create, manage, and bulk-import training modules</p>
          </div>
          <button
            onClick={handleExportModules}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#30363D] text-gray-300 hover:text-white hover:border-[#D4A836]/50 transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#0d1117] border border-[#30363D] w-fit">
          <button
            onClick={() => setActiveTab('designer')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'designer'
                ? 'bg-[#2979FF] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" />
            Designer
          </button>
          <button
            onClick={() => setActiveTab('bulk-import')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'bulk-import'
                ? 'bg-[#2979FF] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
        </div>

        {/* ── BULK IMPORT TAB ── */}
        {activeTab === 'bulk-import' && (
          <div className="space-y-6">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-[#2979FF]" />
                  Bulk Import Modules
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Import one or many modules at once using JSON. Accepts a single module object, an array of modules, or <code className="text-[#D4A836] bg-[#21262D] px-1 rounded">{"{ "modules": [...] }"}</code>.
                  Duplicate module names are skipped automatically.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* File drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#30363D] hover:border-[#2979FF]/60 rounded-xl p-10 text-center cursor-pointer transition-all group"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-600 group-hover:text-[#2979FF] transition-colors" />
                  <p className="text-sm font-medium text-gray-300 mb-1">Drop a JSON file here, or click to browse</p>
                  <p className="text-xs text-gray-500">Accepts .json files</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleBulkFileSelect}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#30363D]" />
                  <span className="text-xs text-gray-500 uppercase tracking-widest">or paste JSON</span>
                  <div className="flex-1 h-px bg-[#30363D]" />
                </div>

                {/* JSON textarea */}
                <div>
                  <textarea
                    value={bulkJson}
                    onChange={(e) => handleBulkJsonChange(e.target.value)}
                    placeholder={'[
  {
    "name": "Phishing Awareness",
    "module_type": "phishing",
    "description": "...",
    "difficulty": "easy",
    "duration_minutes": 15,
    "is_active": true
  }
]'}
                    rows={12}
                    spellCheck={false}
                    className="w-full rounded-lg bg-[#0d1117] border border-[#30363D] text-sm text-gray-200 font-mono px-4 py-3 focus:outline-none focus:border-[#2979FF]/60 resize-y placeholder-gray-600"
                  />
                </div>

                {/* Error message */}
                {bulkError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {bulkError}
                  </div>
                )}

                {/* Preview panel */}
                {bulkPreview && bulkPreview.length > 0 && (
                  <div className="rounded-xl border border-[#30363D] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#21262D] border-b border-[#30363D]">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-white">
                        {bulkPreview.length} module{bulkPreview.length !== 1 ? 's' : ''} ready to import
                      </span>
                    </div>
                    <div className="divide-y divide-[#30363D] max-h-64 overflow-y-auto">
                      {bulkPreview.map((mod, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{mod.name || `Module ${i + 1}`}</p>
                            <p className="text-xs text-gray-500">{mod.module_type || 'unknown type'} · {mod.difficulty || 'easy'} · {mod.duration_minutes || 10} min</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${mod.is_active !== false ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                            {mod.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleBulkImport}
                    disabled={!bulkPreview || bulkPreview.length === 0 || bulkUploading}
                    className="bg-[#2979FF] hover:bg-[#2962FF] text-white px-6"
                  >
                    {bulkUploading ? (
                      <>Importing...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import {bulkPreview ? `${bulkPreview.length} Module${bulkPreview.length !== 1 ? 's' : ''}` : 'Modules'}
                      </>
                    )}
                  </Button>
                  {(bulkJson || bulkPreview) && (
                    <button
                      onClick={() => { setBulkJson(''); setBulkPreview(null); setBulkError(''); }}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Existing modules (read-only in bulk tab) */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-sm text-gray-400 font-normal">
                  Currently {modules.length} module{modules.length !== 1 ? 's' : ''} in the system
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* ── DESIGNER TAB ── */}
        {activeTab === 'designer' && (
          <>
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingModuleId ? 'Edit Module' : 'Create New Module'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="module_type">Module Type</Label>
                <Input
                  id="module_type"
                  name="module_type"
                  value={formData.module_type}
                  onChange={handleInputChange}
                  placeholder="e.g. phishing, ads, social_engineering"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue>{formData.difficulty}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">easy</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="hard">hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    type="number"
                    id="duration_minutes"
                    name="duration_minutes"
                    min={1}
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certificate_template_id">Certificate Template</Label>
                  <Select
                    value={formData.certificate_template_id || 'default'}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        certificate_template_id: value === 'default' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {validTemplates.find((t) => t.template_id === formData.certificate_template_id)?.name ||
                          'Default Template'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {validTemplates.map((tmpl) => (
                        <SelectItem key={tmpl.template_id} value={String(tmpl.template_id)}>
                          {tmpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scenarios">Add Question</Label>
                  <Select
                    value={undefined}
                    onValueChange={(value) => {
                      handleAddScenario(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>Add Scenario</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {validScenarios.map((scen) => (
                        <SelectItem key={scen.scenario_id} value={scen.scenario_id}>
                          {scen.title || scen.question || scen.scenario_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {formData.scenarios && formData.scenarios.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {formData.scenarios.map((scId, idx) => {
                        const scen = validScenarios.find((s) => s.scenario_id === scId) || {};
                        return (
                          <div
                            key={scId}
                            className="flex items-center justify-between p-2 bg-[#21262D] border border-[#30363D] rounded"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white truncate max-w-xs">
                                {scen.title || scen.question || `Scenario ${idx + 1}`}
                              </p>
                              <p className="text-xs text-gray-500">{scen.scenario_type || ''}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => moveScenario(idx, -1)}
                                disabled={idx === 0}
                                className="text-gray-400 hover:text-white"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>

                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => moveScenario(idx, 1)}
                                disabled={idx === formData.scenarios.length - 1}
                                className="text-gray-400 hover:text-white"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>

                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const embedUrl = `${API}/scenarios/render/${scId}`;
                                  navigator.clipboard.writeText(embedUrl);
                                  toast.success('Scenario embed URL copied to clipboard');
                                }}
                                className="text-yellow-400 hover:text-yellow-500"
                              >
                                <Code className="w-4 h-4" />
                              </Button>

                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                onClick={() => removeScenario(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="submit" disabled={saving} className="bg-[#2979FF] hover:bg-[#2962FF]">
                  {saving ? 'Saving...' : editingModuleId ? 'Update Module' : 'Create Module'}
                </Button>
                {editingModuleId && (
                  <Button type="button" variant="outline" onClick={resetForm} className="border-[#30363D]">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-lg">Existing Modules</CardTitle>
              </CardHeader>
              <CardContent>
                {modules.length === 0 ? (
                  <p className="text-gray-400">No modules available</p>
                ) : (
                  <div className="space-y-3">
                    {modules.map((mod) => (
                      <div
                        key={mod.module_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#21262D]/50 border border-[#30363D]"
                      >
                        <div>
                          <p className="font-semibold text-white">{mod.name}</p>
                          <p className="text-xs text-gray-500">Type: {mod.module_type}</p>
                          <p className="text-xs text-gray-500">Difficulty: {mod.difficulty}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(mod)}
                            className="border-[#30363D]"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(mod)}
                            className="border-[#30363D]"
                          >
                            {mod.is_active ? 'Pause' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(mod)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
