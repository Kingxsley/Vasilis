import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';

// Designer page to build a training module along with its questions on a single screen.
// This component allows administrators to enter module metadata and define a list
// of individual training questions.  Each question will be saved as its own
// scenario (using the phishing_email type) and then attached to the module
// being created.  The goal is to streamline module creation by eliminating
// the need to manage scenarios separately.

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QuestionModuleDesigner() {
  const { token } = useAuth();
  const [moduleData, setModuleData] = useState({
    name: '',
    description: '',
    difficulty: 'easy',
    duration_minutes: 10,
    certificate_template_id: '',
    is_active: true
  });
  const [questions, setQuestions] = useState([
    { title: '', correct_answer: 'safe', explanation: '', body: '' }
  ]);
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);

  // Fetch certificate templates for selection
  useEffect(() => {
    if (!token) return;
    const fetchTemplates = async () => {
      try {
        const res = await axios.get(`${API}/certificate-templates`, { headers: { Authorization: `Bearer ${token}` } });
        setTemplates(res.data || []);
      } catch {
        // ignore
      }
    };
    fetchTemplates();
  }, [token]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { title: '', correct_answer: 'safe', explanation: '', body: '' }]);
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleModuleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setModuleData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!moduleData.name) {
      toast.error('Module name is required');
      return;
    }
    // Ensure at least one question
    const validQuestions = questions.filter((q) => q.title?.trim());
    if (validQuestions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    setSaving(true);
    try {
      // Create scenarios for each question
      const scenarioIds = [];
      for (const q of validQuestions) {
        const payload = {
          title: q.title,
          scenario_type: 'phishing_email',
          difficulty: moduleData.difficulty,
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          content: {
            from_email: '',
            to_email: 'employee@company.com',
            subject: q.title,
            body: q.body || q.title,
            links: []
          }
        };
        const res = await axios.post(`${API}/scenarios`, payload, { headers: { Authorization: `Bearer ${token}` } });
        scenarioIds.push(res.data.scenario_id);
      }
      // Build module payload
      const modulePayload = {
        name: moduleData.name,
        module_type: 'phishing',
        description: moduleData.description,
        difficulty: moduleData.difficulty,
        duration_minutes: Number(moduleData.duration_minutes),
        scenarios: scenarioIds,
        is_active: moduleData.is_active
      };
      if (moduleData.certificate_template_id) {
        modulePayload.certificate_template_id = moduleData.certificate_template_id;
      }
      await axios.post(`${API}/training/modules`, modulePayload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Module created with questions');
      // Reset form
      setModuleData({ name: '', description: '', difficulty: 'easy', duration_minutes: 10, certificate_template_id: '', is_active: true });
      setQuestions([{ title: '', correct_answer: 'safe', explanation: '', body: '' }]);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 mx-auto max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Training Module with Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Module Name</Label>
                  <Input id="name" name="name" value={moduleData.name} onChange={handleModuleChange} required />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={moduleData.difficulty} onValueChange={(val) => setModuleData((prev) => ({ ...prev, difficulty: val }))}>
                    <SelectTrigger id="difficulty" name="difficulty">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input type="number" id="duration_minutes" name="duration_minutes" value={moduleData.duration_minutes} onChange={handleModuleChange} min="1" />
                </div>
                <div>
                  <Label htmlFor="certificate_template_id">Certificate Template</Label>
                  <Select value={moduleData.certificate_template_id || 'default'} onValueChange={(val) => setModuleData((prev) => ({ ...prev, certificate_template_id: val === 'default' ? '' : val }))}>
                    <SelectTrigger id="certificate_template_id" name="certificate_template_id">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Template</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.template_id} value={t.template_id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={moduleData.description} onChange={handleModuleChange} rows={3} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="is_active" checked={moduleData.is_active} onCheckedChange={(val) => setModuleData((prev) => ({ ...prev, is_active: val }))} />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <hr />
              <h4 className="text-lg font-semibold mt-4">Questions</h4>
              {questions.map((q, idx) => (
                <div key={idx} className="border border-gray-700 rounded p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <strong>Question {idx + 1}</strong>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(idx)} className="text-sm text-red-500">Remove</button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`title-${idx}`}>Title</Label>
                      <Input id={`title-${idx}`} value={q.title} onChange={(e) => handleQuestionChange(idx, 'title', e.target.value)} placeholder="Enter question title" />
                    </div>
                    <div>
                      <Label htmlFor={`body-${idx}`}>Body / Prompt</Label>
                      <Textarea id={`body-${idx}`} value={q.body} onChange={(e) => handleQuestionChange(idx, 'body', e.target.value)} rows={3} placeholder="Enter the question content" />
                    </div>
                    <div>
                      <Label htmlFor={`correct-${idx}`}>Correct Answer</Label>
                      <Select value={q.correct_answer} onValueChange={(val) => handleQuestionChange(idx, 'correct_answer', val)}>
                        <SelectTrigger id={`correct-${idx}`}>
                          <SelectValue placeholder="Select answer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="safe">Safe</SelectItem>
                          <SelectItem value="unsafe">Unsafe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`explanation-${idx}`}>Explanation</Label>
                      <Textarea id={`explanation-${idx}`} value={q.explanation} onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)} rows={2} placeholder="Explain why this is the correct answer" />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addQuestion} className="mb-4">Add Another Question</Button>
              <div className="pt-4">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Module'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}