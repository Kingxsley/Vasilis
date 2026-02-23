import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { 
  Mail, MousePointerClick, Users, AlertTriangle, CheckCircle, XCircle,
  ArrowRight, ArrowLeft, ExternalLink, Award, RefreshCw, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Email Simulation Component
const EmailSimulation = ({ content }) => (
  <div className="email-container rounded-lg overflow-hidden">
    <div className="email-header bg-[#21262D] p-4 border-b border-[#30363D]">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16">From:</span>
          <span className="text-sm text-white font-mono">{content.from}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16">To:</span>
          <span className="text-sm text-gray-400 font-mono">{content.to}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16">Subject:</span>
          <span className="text-sm text-white font-semibold">{content.subject}</span>
        </div>
      </div>
    </div>
    <div className="email-body p-6 bg-[#161B22]">
      <div className="text-gray-300 whitespace-pre-line text-sm leading-relaxed">
        {content.body}
      </div>
      {content.links && content.links.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#30363D]">
          <p className="text-xs text-gray-500 mb-2">Links in email:</p>
          {content.links.map((link, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[#2979FF] font-mono">
              <ExternalLink className="w-3 h-3" />
              {link}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// Ad Simulation Component
const AdSimulation = ({ content }) => (
  <div className="ad-container rounded-lg overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
    <div className="p-6">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {content.headline}
        </h3>
        <p className="text-gray-400">{content.description}</p>
      </div>
      <div className="mt-4 p-4 bg-[#21262D] rounded-lg">
        <Button className="w-full bg-[#FFB300] hover:bg-[#FFB300] text-black font-bold" disabled>
          {content.call_to_action}
        </Button>
        <p className="text-xs text-gray-500 mt-3 text-center font-mono">
          Links to: {content.destination_url}
        </p>
      </div>
    </div>
  </div>
);

// Social Engineering Simulation Component
const SocialEngineeringSimulation = ({ content }) => (
  <div className="space-y-4">
    <div className="p-4 bg-[#21262D] rounded-lg border border-[#30363D]">
      <p className="text-sm text-gray-400 mb-2">Scenario:</p>
      <p className="text-white">{content.scenario_description}</p>
    </div>
    
    <div className="space-y-3">
      {content.dialogue?.map((msg, i) => (
        <div 
          key={i}
          className={`dialogue-bubble ${msg.speaker === 'You' ? 'outgoing ml-auto' : 'incoming'}`}
        >
          <p className="text-xs text-gray-400 mb-1">{msg.speaker}</p>
          <p className="text-sm text-white">{msg.message}</p>
        </div>
      ))}
    </div>

    {content.requested_action && (
      <div className="p-4 bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-lg">
        <p className="text-sm text-[#FFB300]">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Requested Action: {content.requested_action}
        </p>
      </div>
    )}
  </div>
);

export default function TrainingSession() {
  const { sessionId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const fetchSession = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/training/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSession(response.data);
      return response.data;
    } catch (err) {
      toast.error('Failed to load session');
      navigate('/training');
    }
  }, [sessionId, token, navigate]);

  const fetchScenario = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/training/sessions/${sessionId}/scenario`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScenario(response.data);
      setFeedback(null);
      setSelectedAnswer(null);
    } catch (err) {
      if (err.response?.status === 400) {
        // Session completed
        const sessionData = await fetchSession();
        if (sessionData.status === 'completed' || sessionData.status === 'failed') {
          setScenario(null);
        }
      } else {
        toast.error('Failed to load scenario');
      }
    }
  }, [sessionId, token, fetchSession]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const sessionData = await fetchSession();
      if (sessionData && sessionData.status !== 'completed') {
        await fetchScenario();
      }
      setLoading(false);
    };
    loadData();
  }, [fetchSession, fetchScenario]);

  const submitAnswer = async (answer) => {
    if (submitting || feedback) return;
    
    setSelectedAnswer(answer);
    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API}/training/sessions/${sessionId}/answer`,
        { scenario_id: scenario.scenario_id, answer },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFeedback(response.data);
      
      // Update session data
      await fetchSession();
    } catch (err) {
      toast.error('Failed to submit answer');
      setSelectedAnswer(null);
    } finally {
      setSubmitting(false);
    }
  };

  const nextScenario = async () => {
    setLoading(true);
    const sessionData = await fetchSession();
    if (sessionData.status === 'completed') {
      setScenario(null);
    } else {
      await fetchScenario();
    }
    setLoading(false);
  };

  const renderScenario = () => {
    if (!scenario) return null;

    switch (scenario.scenario_type) {
      case 'phishing_email':
      case 'phishing email':
        return <EmailSimulation content={scenario.content} />;
      case 'malicious_ads':
      case 'malicious ads':
        return <AdSimulation content={scenario.content} />;
      case 'social_engineering':
      case 'social engineering':
        return <SocialEngineeringSimulation content={scenario.content} />;
      default:
        return <EmailSimulation content={scenario.content} />;
    }
  };

  const getScenarioIcon = () => {
    const type = scenario?.scenario_type || '';
    if (type.includes('phishing')) return Mail;
    if (type.includes('ads')) return MousePointerClick;
    if (type.includes('social')) return Users;
    return BookOpen;
  };

  const ScenarioIcon = getScenarioIcon();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading scenario...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Session Completed or Failed View
  if (session?.status === 'completed' || session?.status === 'failed') {
    const isPassed = session.status === 'completed';
    const scoreColor = session.score >= 70 ? '#00E676' : session.score >= 50 ? '#FFB300' : '#FF3B30';

    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto" data-testid="session-complete">
          <Card className="bg-[#161B22] border-[#30363D] overflow-hidden">
            <div className="h-2" style={{ backgroundColor: scoreColor }} />
            <CardContent className="p-8 text-center">
              <div
                className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: `${scoreColor}15` }}
              >
                <Award className="w-12 h-12" style={{ color: scoreColor }} />
              </div>

              <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
                {isPassed ? 'Training Complete!' : 'Training Failed'}
              </h2>
              <p className="text-gray-400 mb-8">
                {isPassed
                  ? "You've completed all scenarios in this module"
                  : 'You did not achieve a passing score. Please review the material and retake the training.'}
              </p>

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-[#21262D] rounded-lg">
                  <p className="text-3xl font-bold" style={{ color: scoreColor }}>
                    {session.score}%
                  </p>
                  <p className="text-sm text-gray-500">Final Score</p>
                </div>
                <div className="p-4 bg-[#21262D] rounded-lg">
                  <p className="text-3xl font-bold text-white">
                    {session.correct_answers}
                  </p>
                  <p className="text-sm text-gray-500">Correct</p>
                </div>
                <div className="p-4 bg-[#21262D] rounded-lg">
                  <p className="text-3xl font-bold text-white">
                    {session.total_questions}
                  </p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>

              {/* Feedback message based on score only when passed; for failures show generic message */}
              {isPassed ? (
                session.score >= 70 ? (
                  <p className="text-[#00E676] mb-8">
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Excellent work! You've demonstrated strong security awareness.
                  </p>
                ) : session.score >= 50 ? (
                  <p className="text-[#FFB300] mb-8">
                    <AlertTriangle className="w-5 h-5 inline mr-2" />
                    Good effort! Consider reviewing the scenarios you missed.
                  </p>
                ) : (
                  <p className="text-[#FF3B30] mb-8">
                    <XCircle className="w-5 h-5 inline mr-2" />
                    Keep practicing! Security awareness improves with repetition.
                  </p>
                )
              ) : (
                <p className="text-[#FF3B30] mb-8">
                  <XCircle className="w-5 h-5 inline mr-2" />
                  Better luck next time! You can retake this module to improve.
                </p>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/training')}
                  className="border-[#30363D]"
                  data-testid="back-to-modules-btn"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Modules
                </Button>
                <Button
                  onClick={() => navigate('/training')}
                  className="bg-[#2979FF] hover:bg-[#2962FF]"
                  data-testid="try-another-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Another Module
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto" data-testid="training-session-page">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/training')}
              className="text-gray-400 hover:text-white -ml-2"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Training
            </Button>
            <div className="text-right">
              {/*
                Display the current question number.  Some users reported the question number
                remaining stuck at 1; this can occur when the session's
                `current_scenario_index` does not update synchronously after answering.  To
                ensure the count reflects progress, fall back to the number of answered
                scenarios if available.
              */}
              <p className="text-sm text-gray-400">
                {(() => {
                  const answered = session?.answers?.length || 0;
                  // Use current_scenario_index if greater than answered count (e.g. when resuming)
                  const index = session?.current_scenario_index ?? answered;
                  const currentQuestion = Math.min(index + 1, session?.total_questions || 1);
                  return `Question ${currentQuestion} of ${session?.total_questions || 1}`;
                })()}
              </p>
              <p className="text-lg font-bold text-[#2979FF]">{session?.score || 0}%</p>
            </div>
          </div>
          <Progress
            value={(() => {
              const answered = session?.answers?.length || 0;
              const index = session?.current_scenario_index ?? answered;
              const total = session?.total_questions || 1;
              return (index / total) * 100;
            })()}
            className="h-2 bg-[#21262D]"
          />
        </div>

        {/* Scenario Card */}
        <Card className="bg-[#161B22] border-[#30363D] mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2979FF]/10 flex items-center justify-center">
                <ScenarioIcon className="w-5 h-5 text-[#2979FF]" />
              </div>
              <div>
                <CardTitle className="text-lg">{scenario?.title}</CardTitle>
                <p className="text-sm text-gray-500 capitalize">
                  {scenario?.scenario_type?.replace(/_/g, ' ')} • {scenario?.difficulty}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderScenario()}
          </CardContent>
        </Card>

        {/* Answer Section */}
        {!feedback ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardHeader>
              <CardTitle className="text-lg">Is this content safe or unsafe?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className={`h-20 border-2 ${
                    selectedAnswer === 'safe' 
                      ? 'border-[#00E676] bg-[#00E676]/10' 
                      : 'border-[#30363D] hover:border-[#00E676] hover:bg-[#00E676]/5'
                  }`}
                  onClick={() => submitAnswer('safe')}
                  disabled={submitting}
                  data-testid="answer-safe-btn"
                >
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-8 h-8 text-[#00E676] mb-2" />
                    <span className="text-lg font-semibold">Safe</span>
                  </div>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={`h-20 border-2 ${
                    selectedAnswer === 'unsafe' 
                      ? 'border-[#FF3B30] bg-[#FF3B30]/10' 
                      : 'border-[#30363D] hover:border-[#FF3B30] hover:bg-[#FF3B30]/5'
                  }`}
                  onClick={() => submitAnswer('unsafe')}
                  disabled={submitting}
                  data-testid="answer-unsafe-btn"
                >
                  <div className="flex flex-col items-center">
                    <XCircle className="w-8 h-8 text-[#FF3B30] mb-2" />
                    <span className="text-lg font-semibold">Unsafe</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={`border-2 ${
            feedback.correct ? 'bg-[#00E676]/5 border-[#00E676]/50' : 'bg-[#FF3B30]/5 border-[#FF3B30]/50'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  feedback.correct ? 'bg-[#00E676]/20' : 'bg-[#FF3B30]/20'
                }`}>
                  {feedback.correct ? (
                    <CheckCircle className="w-6 h-6 text-[#00E676]" />
                  ) : (
                    <XCircle className="w-6 h-6 text-[#FF3B30]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${
                    feedback.correct ? 'text-[#00E676]' : 'text-[#FF3B30]'
                  }`}>
                    {feedback.correct ? 'Correct!' : 'Incorrect'}
                  </h3>
                  <p className="text-sm text-gray-400 mb-2">
                    The correct answer was: <span className="font-semibold text-white capitalize">{feedback.correct_answer}</span>
                  </p>
                  <p className="text-gray-300">{feedback.explanation}</p>
                </div>
              </div>
              
              <Button
                className="w-full mt-6 bg-[#2979FF] hover:bg-[#2962FF]"
                onClick={nextScenario}
                data-testid="next-scenario-btn"
              >
                Next Scenario
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
