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
import { ChevronUp, ChevronDown, X, Code } from 'lucide-react';
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
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>Module Builder</h1>
          <p className="text-gray-400">Create and manage training modules</p>
        </div>

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
      </div>
    </DashboardLayout>
  );
}
