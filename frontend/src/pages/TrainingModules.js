import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Mail, MousePointerClick, Users, Clock, Target, Play, CheckCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const moduleIcons = {
  phishing: Mail,
  ads: MousePointerClick,
  social_engineering: Users
};

const moduleColors = {
  phishing: '#2979FF',
  ads: '#FFB300',
  social_engineering: '#FF3B30'
};

export default function TrainingModules() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingModule, setStartingModule] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modulesRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/training/modules`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/training/sessions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setModules(modulesRes.data);
      setSessions(sessionsRes.data);
    } catch (err) {
      toast.error('Failed to fetch training data');
    } finally {
      setLoading(false);
    }
  };

  const startTraining = async (moduleId) => {
    setStartingModule(moduleId);
    try {
      const response = await axios.post(
        `${API}/training/sessions`,
        { module_id: moduleId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/training/${response.data.session_id}`);
    } catch (err) {
      toast.error('Failed to start training session');
      setStartingModule(null);
    }
  };

  const continueTraining = (sessionId) => {
    navigate(`/training/${sessionId}`);
  };

  const getModuleProgress = (moduleId) => {
    const moduleSessions = sessions.filter(s => s.module_id === moduleId);
    const completedSessions = moduleSessions.filter(s => s.status === 'completed');
    const inProgressSession = moduleSessions.find(s => s.status === 'in_progress');
    
    const bestScore = completedSessions.length > 0 
      ? Math.max(...completedSessions.map(s => s.score))
      : 0;

    return {
      completedCount: completedSessions.length,
      inProgressSession,
      bestScore,
      hasCompleted: completedSessions.length > 0
    };
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-[#00E676]';
      case 'medium': return 'text-[#FFB300]';
      case 'hard': return 'text-[#FF3B30]';
      default: return 'text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="training-modules-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Security Training
          </h1>
          <p className="text-gray-400">Complete training modules to improve your cybersecurity awareness</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2979FF]/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[#2979FF]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Modules Available</p>
                  <p className="text-2xl font-bold">{modules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#00E676]/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#00E676]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Completed Sessions</p>
                  <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'completed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFB300]/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-[#FFB300]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Average Score</p>
                  <p className="text-2xl font-bold">
                    {sessions.filter(s => s.status === 'completed').length > 0
                      ? Math.round(
                          sessions
                            .filter(s => s.status === 'completed')
                            .reduce((acc, s) => acc + s.score, 0) / 
                          sessions.filter(s => s.status === 'completed').length
                        )
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Training Modules */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => {
              const Icon = moduleIcons[module.module_type] || BookOpen;
              const color = moduleColors[module.module_type] || '#2979FF';
              const progress = getModuleProgress(module.module_id);

              return (
                <Card 
                  key={module.module_id}
                  className="bg-[#161B22] border-[#30363D] card-hover animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  data-testid={`module-card-${module.module_id}`}
                >
                  {/* Module Type Banner */}
                  <div 
                    className="h-2"
                    style={{ backgroundColor: color }}
                  />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="w-7 h-7" style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{module.name}</CardTitle>
                        <div className="flex items-center gap-3 text-sm">
                          <span className={getDifficultyColor(module.difficulty)}>
                            {module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)}
                          </span>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {module.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-gray-400 mb-4">{module.description}</p>
                    
                    {/* Progress Section */}
                    {progress.hasCompleted && (
                      <div className="mb-4 p-3 rounded-lg bg-[#21262D]/50 border border-[#30363D]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">Best Score</span>
                          <span className={`text-sm font-bold ${
                            progress.bestScore >= 70 ? 'text-[#00E676]' : 
                            progress.bestScore >= 50 ? 'text-[#FFB300]' : 'text-[#FF3B30]'
                          }`}>
                            {progress.bestScore}%
                          </span>
                        </div>
                        <Progress 
                          value={progress.bestScore} 
                          className="h-2 bg-[#21262D]"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Completed {progress.completedCount} time{progress.completedCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {progress.inProgressSession ? (
                        <Button
                          className="flex-1"
                          style={{ backgroundColor: color }}
                          onClick={() => continueTraining(progress.inProgressSession.session_id)}
                          data-testid={`continue-${module.module_id}`}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Continue
                        </Button>
                      ) : (
                        <Button
                          className="flex-1"
                          style={{ backgroundColor: color }}
                          onClick={() => startTraining(module.module_id)}
                          disabled={startingModule === module.module_id}
                          data-testid={`start-${module.module_id}`}
                        >
                          {startingModule === module.module_id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {progress.hasCompleted ? 'Retake' : 'Start'}
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-3 text-center">
                      {module.scenarios_count} scenarios
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
