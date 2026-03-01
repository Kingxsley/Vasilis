import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
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
  Presentation, Download, FileText, Shield, Mail, Lock, Users, 
  Database, Loader2, CheckCircle, BookOpen, Upload, Trash2, 
  AlertTriangle, Smartphone, Home, Briefcase, Edit
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Module icons mapping
const MODULE_ICONS = {
  'phishing': Mail,
  'email_phishing': Mail,
  'social_engineering': Users,
  'password_security': Lock,
  'password': Lock,
  'data_protection': Database,
  'data_handling': Database,
  'privacy': Shield,
  'ransomware': AlertTriangle,
  'ransomware_awareness': AlertTriangle,
  'insider_threat': Users,
  'insider_threats': Users,
  'mobile_security': Smartphone,
  'mobile': Smartphone,
  'remote_work': Home,
  'remote_work_security': Home,
  'work_from_home': Home,
  'bec': Briefcase,
  'business_email_compromise': Briefcase,
  'ceo_fraud': Briefcase,
};

export default function ExecutiveTraining() {
  const { user, token } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);
  const [uploadedPresentations, setUploadedPresentations] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', file: null });

  const headers = { Authorization: `Bearer ${token}` };
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const requests = [
        axios.get(`${API}/executive-training/available-modules`, { headers }),
        axios.get(`${API}/training/modules`, { headers }).catch(() => ({ data: [] }))
      ];
      
      if (isSuperAdmin) {
        requests.push(
          axios.get(`${API}/executive-training/uploaded`, { headers }).catch(() => ({ data: { presentations: [] } }))
        );
      }
      
      const responses = await Promise.all(requests);
      setModules(responses[0].data.modules || []);
      setTrainingModules(responses[1].data || []);
      if (isSuperAdmin && responses[2]) {
        setUploadedPresentations(responses[2].data.presentations || []);
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      toast.error('Please select a file');
      return;
    }
    if (!uploadForm.name) {
      toast.error('Please enter a name');
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('name', uploadForm.name);
      formData.append('description', uploadForm.description);
      
      await axios.post(`${API}/executive-training/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Presentation uploaded successfully');
      setShowUpload(false);
      setUploadForm({ name: '', description: '', file: null });
      fetchData();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to upload presentation');
    } finally {
      setUploading(false);
    }
  };

  const deleteUploaded = async (presentationId) => {
    if (!window.confirm('Are you sure you want to delete this presentation?')) return;
    
    try {
      await axios.delete(`${API}/executive-training/uploaded/${presentationId}`, { headers });
      toast.success('Presentation deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete presentation');
    }
  };

  const downloadUploaded = async (presentationId, filename) => {
    setDownloading(presentationId);
    try {
      const response = await axios.get(
        `${API}/executive-training/download-uploaded/${presentationId}`,
        { headers, responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Downloaded presentation');
    } catch (err) {
      toast.error('Failed to download presentation');
    } finally {
      setDownloading(null);
    }
  };

  const downloadPresentation = async (moduleKey, moduleName) => {
    setDownloading(moduleKey);
    try {
      const response = await axios.get(
        `${API}/executive-training/generate/${moduleKey}`,
        {
          headers,
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${moduleName.replace(/\s+/g, '_')}_Training.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${moduleName} presentation`);
    } catch (err) {
      console.error('Failed to download presentation:', err);
      toast.error('Failed to download presentation');
    } finally {
      setDownloading(null);
    }
  };

  const downloadCustomPresentation = async (module) => {
    setDownloading(module.module_id);
    try {
      const response = await axios.post(
        `${API}/executive-training/generate-custom`,
        {
          module_name: module.name,
          module_id: module.module_id
        },
        {
          headers,
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${module.name.replace(/\s+/g, '_')}_Training.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${module.name} presentation`);
    } catch (err) {
      console.error('Failed to download presentation:', err);
      toast.error('Failed to download presentation');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="executive-training-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
              <Presentation className="w-8 h-8 text-[#D4A836]" />
              Executive Training
            </h1>
            <p className="text-gray-400">
              Download professional PowerPoint presentations for security awareness training
            </p>
          </div>
          {isSuperAdmin && (
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Presentation
            </Button>
          )}
        </div>

        {/* Info Banner */}
        <Card className="bg-[#D4A836]/10 border-[#D4A836]/30 mb-8">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-[#D4A836] mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#E8DDB5] mb-1">Professional Training Materials</h3>
                <p className="text-sm text-gray-400">
                  Each presentation contains 30-50 detailed slides covering key security topics. 
                  Perfect for in-person training sessions, webinars, and executive briefings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : (
          <>
            {/* Pre-built Modules */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-[#E8DDB5] mb-4">Pre-built Training Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => {
                  const IconComponent = MODULE_ICONS[module.key] || FileText;
                  return (
                    <Card 
                      key={module.key} 
                      className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#D4A836]/10 flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-[#D4A836]" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base text-[#E8DDB5]">{module.title}</CardTitle>
                            <p className="text-xs text-gray-500">{module.subtitle}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-[#2979FF]/20 text-[#2979FF]">
                            {module.slide_count} Slides
                          </Badge>
                          <Badge className="bg-[#00E676]/20 text-[#00E676]">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        </div>
                        <Button
                          className="w-full bg-[#D4A836] hover:bg-[#B8922E] text-black"
                          onClick={() => downloadPresentation(module.key, module.title)}
                          disabled={downloading === module.key}
                        >
                          {downloading === module.key ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Download PPTX
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Custom Training Modules */}
            {trainingModules.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-[#E8DDB5] mb-4">Your Training Modules</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Generate presentations based on your custom training modules
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trainingModules.slice(0, 9).map((module) => (
                    <Card 
                      key={module.module_id} 
                      className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base text-[#E8DDB5]">{module.name}</CardTitle>
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {module.description || 'Custom training module'}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-purple-500/20 text-purple-400">
                            Custom Module
                          </Badge>
                          <Badge className="bg-gray-500/20 text-gray-400">
                            ~15 Slides
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-[#30363D] text-[#E8DDB5]"
                          onClick={() => downloadCustomPresentation(module)}
                          disabled={downloading === module.module_id}
                        >
                          {downloading === module.module_id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Generate PPTX
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Presentations (Super Admin only) */}
            {isSuperAdmin && uploadedPresentations.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-[#E8DDB5] mb-4">Uploaded Presentations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedPresentations.map((pres) => (
                    <Card 
                      key={pres.presentation_id} 
                      className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base text-[#E8DDB5]">{pres.name}</CardTitle>
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {pres.description || pres.filename}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-green-500/20 text-green-400">
                            Uploaded
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {(pres.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-[#30363D] text-[#E8DDB5]"
                            onClick={() => downloadUploaded(pres.presentation_id, pres.filename)}
                            disabled={downloading === pres.presentation_id}
                          >
                            {downloading === pres.presentation_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => deleteUploaded(pres.presentation_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-[#161B22] border-[#30363D]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#D4A836]" />
              Upload Presentation
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload a custom PowerPoint presentation for your training library
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Presentation Name *</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Advanced Phishing Detection"
                className="bg-[#0D1117] border-[#30363D]"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the training content"
                className="bg-[#0D1117] border-[#30363D]"
              />
            </div>

            <div className="space-y-2">
              <Label>PowerPoint File *</Label>
              <div 
                className="border-2 border-dashed border-[#30363D] rounded-lg p-6 text-center cursor-pointer hover:border-[#D4A836]/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadForm(prev => ({ ...prev, file }));
                    }
                  }}
                />
                {uploadForm.file ? (
                  <div className="text-[#E8DDB5]">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-[#D4A836]" />
                    <p>{uploadForm.file.name}</p>
                    <p className="text-xs text-gray-500">{(uploadForm.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p>Click to select a .pptx file</p>
                    <p className="text-xs">Max 50MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)} className="border-[#30363D]">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
