import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Presentation, Download, FileText, Shield, Mail, Lock, Users, 
  Database, Loader2, CheckCircle, BookOpen
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
};

export default function ExecutiveTraining() {
  const { token } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modulesRes, trainingRes] = await Promise.all([
        axios.get(`${API}/executive-training/available-modules`, { headers }),
        axios.get(`${API}/training/modules`, { headers }).catch(() => ({ data: [] }))
      ]);
      setModules(modulesRes.data.modules || []);
      setTrainingModules(trainingRes.data || []);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
