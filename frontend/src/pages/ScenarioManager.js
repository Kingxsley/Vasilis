import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Mail, Monitor, Users, Loader2, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SCENARIO_TYPES = [
  { value: 'phishing_email', label: 'Phishing Email', icon: Mail },
  { value: 'malicious_ads', label: 'Malicious Ad', icon: Monitor },
  { value: 'social_engineering', label: 'Social Engineering', icon: Users },
  { value: 'qr_code_phishing', label: 'QR Code Phishing', icon: Mail },
  { value: 'usb_drop', label: 'USB Drop Attack', icon: Mail },
  { value: 'mfa_fatigue', label: 'MFA Fatigue Attack', icon: Mail },
  { value: 'bec_scenario', label: 'Business Email Compromise', icon: Mail },
  { value: 'data_handling_trap', label: 'Data Handling Trap', icon: Mail },
  { value: 'ransomware_readiness', label: 'Ransomware Readiness', icon: Mail },
  { value: 'shadow_it_detection', label: 'Shadow IT Detection', icon: Monitor },
  { value: 'question_group', label: 'Question Group', icon: Users },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'bg-green-500/20 text-green-400' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'hard', label: 'Hard', color: 'bg-red-500/20 text-red-400' },
];

const ANSWERS = [
  { value: 'safe', label: 'Safe' },
  { value: 'unsafe', label: 'Unsafe' },
];

export default function ScenarioManager() {
  const { token } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    scenario_type: 'phishing_email',
    difficulty: 'medium',
    correct_answer: 'unsafe',
    explanation: '',
    content: {},
    // List of child scenario IDs used for question group scenarios
    child_scenarios: []
  });

  // Helper to add a child scenario to the question group.  Avoid duplicates.
  const addChildScenario = (scenarioId) => {
    setFormData((prev) => {
      if (!scenarioId) return prev;
      const existing = prev.child_scenarios || [];
      if (existing.includes(scenarioId)) return prev;
      return { ...prev, child_scenarios: [...existing, scenarioId] };
    });
  };

  // Move a child scenario up or down in the order
  const moveChildScenario = (index, direction) => {
    setFormData((prev) => {
      const list = prev.child_scenarios ? [...prev.child_scenarios] : [];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[newIndex];
      list[newIndex] = temp;
      return { ...prev, child_scenarios: list };
    });
  };

  // Remove a child scenario from the selected list
  const removeChildScenario = (index) => {
    setFormData((prev) => {
      const list = prev.child_scenarios ? [...prev.child_scenarios] : [];
      list.splice(index, 1);
      return { ...prev, child_scenarios: list };
    });
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await axios.get(`${API}/scenarios`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScenarios(response.data);
    } catch (error) {
      toast.error('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/scenarios/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(response.data.message);
      if (response.data.errors?.length > 0) {
        response.data.errors.forEach(err => toast.error(err));
      }
      fetchScenarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/scenarios/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenarios_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Scenarios exported');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const downloadTemplate = () => {
    const template = `title,scenario_type,difficulty,correct_answer,explanation,content_json
"Fake Bank Alert",phishing_email,medium,unsafe,"This is a phishing email because the sender domain is suspicious and it creates urgency.","{\\"from_email\\":\\"security@bank-alert.xyz\\",\\"subject\\":\\"URGENT: Verify your account\\",\\"body\\":\\"Your account has been compromised. Click here to verify.\\",\\"links\\":[\\"http://fake-bank.com/verify\\"]}"
"Free iPhone Scam",malicious_ads,easy,unsafe,"This ad is malicious because it promises unrealistic prizes and uses urgency tactics.","{\\"headline\\":\\"You Won a Free iPhone!\\",\\"description\\":\\"Click now to claim your prize!\\",\\"call_to_action\\":\\"CLAIM NOW\\",\\"destination_url\\":\\"http://free-prizes.xyz\\"}"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenario_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingScenario) {
        await axios.patch(`${API}/scenarios/${editingScenario.scenario_id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Scenario updated');
      } else {
        await axios.post(`${API}/scenarios`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Scenario created');
      }
      setDialogOpen(false);
      resetForm();
      fetchScenarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save scenario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scenarioId) => {
    if (!window.confirm('Are you sure you want to delete this scenario?')) return;

    try {
      await axios.delete(`${API}/scenarios/${scenarioId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Scenario deleted');
      fetchScenarios();
    } catch (error) {
      toast.error('Failed to delete scenario');
    }
  };

  const handleEdit = (scenario) => {
    setEditingScenario(scenario);
    setFormData({
      title: scenario.title,
      scenario_type: scenario.scenario_type,
      difficulty: scenario.difficulty,
      correct_answer: scenario.correct_answer,
      explanation: scenario.explanation,
      content: scenario.content
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingScenario(null);
    setFormData({
      title: '',
      scenario_type: 'phishing_email',
      difficulty: 'medium',
      correct_answer: 'unsafe',
      explanation: '',
      content: {}
    });
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const updateContent = (field, value) => {
    setFormData(prev => ({
      ...prev,
      content: { ...prev.content, [field]: value }
    }));
  };

  const filteredScenarios = filterType === 'all' 
    ? scenarios 
    : scenarios.filter(s => s.scenario_type === filterType);

  const getTypeIcon = (type) => {
    const found = SCENARIO_TYPES.find(t => t.value === type);
    return found ? found.icon : Mail;
  };

  const getTypeLabel = (type) => {
    const found = SCENARIO_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getDifficultyBadge = (difficulty) => {
    const found = DIFFICULTIES.find(d => d.value === difficulty);
    return found ? found.color : '';
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Scenario Manager
            </h1>
            <p className="text-gray-500 mt-1">Create and manage training scenarios</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Import/Export Buttons */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
              data-testid="download-template-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
              data-testid="import-scenarios-btn"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Import CSV</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
              data-testid="export-scenarios-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={openNewDialog}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  data-testid="create-scenario-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Scenario
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0f0f15] border-[#D4A836]/20 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-[#E8DDB5]">
                    {editingScenario ? 'Edit Scenario' : 'Create New Scenario'}
                  </DialogTitle>
                </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Title */}
                <div>
                  <Label className="text-gray-400">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Suspicious Bank Email"
                    className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                    required
                    data-testid="scenario-title-input"
                  />
                </div>

                {/* Type, Difficulty, Answer Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-400">Type</Label>
                    <Select
                      value={formData.scenario_type}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        scenario_type: v,
                        content: {},
                        child_scenarios: []
                      })
                    }
                    >
                      <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a24] border-[#D4A836]/30">
                        {SCENARIO_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value} className="text-[#E8DDB5]">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-400">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                    >
                      <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a24] border-[#D4A836]/30">
                        {DIFFICULTIES.map(d => (
                          <SelectItem key={d.value} value={d.value} className="text-[#E8DDB5]">
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-400">Correct Answer</Label>
                    <Select
                      value={formData.correct_answer}
                      onValueChange={(v) => setFormData({ ...formData, correct_answer: v })}
                    >
                      <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a24] border-[#D4A836]/30">
                        {ANSWERS.map(a => (
                          <SelectItem key={a.value} value={a.value} className="text-[#E8DDB5]">
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Content Fields based on Type */}
                <div className="border border-[#D4A836]/20 rounded-lg p-4 space-y-4">
                  <h4 className="text-sm font-medium text-[#D4A836]">Scenario Content</h4>

                  {formData.scenario_type === 'question_group' && (
                    <>
                      <p className="text-xs text-gray-500">
                        Select the scenarios that belong to this question group.  The order
                        you select them will be the order they appear during training.
                      </p>
                      <div>
                        <Label className="text-gray-400">Add Scenario</Label>
                        <Select
                          value={''}
                          onValueChange={(value) => {
                            addChildScenario(value);
                          }}
                        >
                          <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
                            <SelectValue>Add Scenario</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a24] border-[#D4A836]/30">
                            {scenarios
                              .filter((s) => s.scenario_id !== editingScenario?.scenario_id)
                              .map((scen) => (
                                <SelectItem key={scen.scenario_id} value={scen.scenario_id} className="text-[#E8DDB5]">
                                  {scen.title || scen.scenario_id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.child_scenarios && formData.child_scenarios.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {formData.child_scenarios.map((scId, idx) => {
                            const scen = scenarios.find((s) => s.scenario_id === scId) || {};
                            return (
                              <div
                                key={scId}
                                className="flex items-center justify-between p-2 bg-[#21262D] border border-[#30363D] rounded"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-white truncate max-w-xs">
                                    {scen.title || `Scenario ${idx + 1}`}
                                  </p>
                                  <p className="text-xs text-gray-500">{scen.scenario_type || ''}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => moveChildScenario(idx, -1)}
                                    disabled={idx === 0}
                                    className="text-gray-400 hover:text-white"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => moveChildScenario(idx, 1)}
                                      disabled={idx === formData.child_scenarios.length - 1}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="destructive"
                                      onClick={() => removeChildScenario(idx)}
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
                    </>
                  )}
                  
                  {formData.scenario_type === 'phishing_email' && (
                    <>
                      <div>
                        <Label className="text-gray-400">From Email</Label>
                        <Input
                          value={formData.content.from_email || ''}
                          onChange={(e) => updateContent('from_email', e.target.value)}
                          placeholder="e.g., security@amaz0n-support.com"
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Subject Line</Label>
                        <Input
                          value={formData.content.subject || ''}
                          onChange={(e) => updateContent('subject', e.target.value)}
                          placeholder="e.g., URGENT: Your account has been compromised"
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Email Body</Label>
                        <Textarea
                          value={formData.content.body || ''}
                          onChange={(e) => updateContent('body', e.target.value)}
                          placeholder="Write the email content..."
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] min-h-[100px]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Suspicious Links (comma-separated)</Label>
                        <Input
                          value={(formData.content.links || []).join(', ')}
                          onChange={(e) => updateContent('links', e.target.value.split(',').map(l => l.trim()))}
                          placeholder="e.g., http://fake-bank.com/login"
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                    </>
                  )}

                  {formData.scenario_type === 'malicious_ads' && (
                    <>
                      <div>
                        <Label className="text-gray-400">Headline</Label>
                        <Input
                          value={formData.content.headline || ''}
                          onChange={(e) => updateContent('headline', e.target.value)}
                          placeholder="e.g., CONGRATULATIONS! You've won!"
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Description</Label>
                        <Textarea
                          value={formData.content.description || ''}
                          onChange={(e) => updateContent('description', e.target.value)}
                          placeholder="Ad description text..."
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Call to Action Button</Label>
                        <Input
                          value={formData.content.call_to_action || ''}
                          onChange={(e) => updateContent('call_to_action', e.target.value)}
                          placeholder="e.g., CLAIM NOW!"
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Destination URL</Label>
                        <Input
                          value={formData.content.destination_url || ''}
                          onChange={(e) => updateContent('destination_url', e.target.value)}
                          placeholder="e.g., http://free-prizes.xyz/claim"
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                    </>
                  )}

                  {formData.scenario_type === 'social_engineering' && (
                    <>
                      <div>
                        <Label className="text-gray-400">Scenario Description</Label>
                        <Textarea
                          value={formData.content.scenario_description || ''}
                          onChange={(e) => updateContent('scenario_description', e.target.value)}
                          placeholder="e.g., You receive a phone call at your desk..."
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Dialogue (JSON format)</Label>
                        <Textarea
                          value={formData.content.dialogue ? JSON.stringify(formData.content.dialogue, null, 2) : ''}
                          onChange={(e) => {
                            try {
                              updateContent('dialogue', JSON.parse(e.target.value));
                            } catch {
                              // Allow invalid JSON while typing
                            }
                          }}
                          placeholder='[{"speaker": "Caller", "message": "Hi, this is IT..."}]'
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] font-mono text-sm min-h-[100px]"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Format: [{"{"}"speaker": "Name", "message": "Text"{"}"}]
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Requested Action</Label>
                        <Input
                          value={formData.content.requested_action || ''}
                          onChange={(e) => updateContent('requested_action', e.target.value)}
                          placeholder="e.g., Provide your login credentials"
                          className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Explanation */}
                <div>
                  <Label className="text-gray-400">Explanation (shown after answer)</Label>
                  <Textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="Explain why this scenario is safe/unsafe and what to look for..."
                    className="bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5] min-h-[80px]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="border-[#D4A836]/30 text-[#E8DDB5]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                    data-testid="save-scenario-btn"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingScenario ? 'Update Scenario' : 'Create Scenario'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-[#D4A836]/30">
              <SelectItem value="all" className="text-[#E8DDB5]">All Types</SelectItem>
              {SCENARIO_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-[#E8DDB5]">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scenarios Table */}
        <div className="card-dark rounded-xl border border-[#D4A836]/20 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#D4A836]" />
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No scenarios yet. Create your first one!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#D4A836]/20">
                  <TableHead className="text-gray-400">Title</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Difficulty</TableHead>
                  <TableHead className="text-gray-400">Answer</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScenarios.map((scenario) => {
                  const TypeIcon = getTypeIcon(scenario.scenario_type);
                  return (
                    <TableRow key={scenario.scenario_id} className="border-[#D4A836]/20">
                      <TableCell className="text-[#E8DDB5] font-medium">
                        {scenario.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-400">{getTypeLabel(scenario.scenario_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDifficultyBadge(scenario.difficulty)}>
                          {scenario.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={scenario.correct_answer === 'safe' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                        }>
                          {scenario.correct_answer}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(scenario)}
                            className="text-gray-400 hover:text-[#E8DDB5]"
                            data-testid={`edit-scenario-${scenario.scenario_id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(scenario.scenario_id)}
                            className="text-gray-400 hover:text-red-400"
                            data-testid={`delete-scenario-${scenario.scenario_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
