import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Award, Download, CheckCircle, BookOpen, Loader2, Layout, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Lazy load the CertificateTemplates page
const CertificateTemplatesPage = React.lazy(() => import('./CertificateTemplates'));

export default function CertificatesHub() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState(
    isSuperAdmin ? (searchParams.get('tab') || 'certificates') : 'certificates'
  );

  useEffect(() => {
    setSearchParams(activeTab !== 'certificates' ? { tab: activeTab } : {});
  }, [activeTab]);

  const tabs = [
    { id: 'certificates', label: 'My Certificates', icon: Award },
    ...(isSuperAdmin ? [{ id: 'templates', label: 'Templates', icon: Layout }] : []),
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="certificates-hub-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Chivo, sans-serif' }}>Certificates</h1>
          <p className="text-gray-400">Training certificates and template management</p>
        </div>

        {tabs.length > 1 && (
          <div className="flex gap-1 mb-6 bg-[#161B22] p-1 rounded-lg w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'bg-[#D4A836] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'certificates' && <CertificatesContent />}
        {activeTab === 'templates' && (
          <React.Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" /></div>}>
            <CertificateTemplatesPage embedded={true} />
          </React.Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}

function CertificatesContent() {
  const { user, token } = useAuth();
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { checkEligibility(); }, []);

  const checkEligibility = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/certificates/user/${user.user_id}/check`, { headers });
      setEligibility(res.data);
    } catch (err) {
      console.error('Failed to check eligibility:', err);
      toast.error('Failed to check certificate eligibility');
    } finally { setLoading(false); }
  };

  const generateCertificate = async () => {
    setGenerating(true);
    try {
      const response = await axios.get(`${API}/certificates/user/${user.user_id}`, { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${user.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate downloaded!');
      checkEligibility();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate certificate');
    } finally { setGenerating(false); }
  };

  if (loading) {
    return (
      <Card className="bg-[#161B22] border-[#30363D] max-w-2xl">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836] mx-auto" />
          <p className="text-gray-400 mt-4">Checking eligibility...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {eligibility?.eligible ? (
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-[#E8DDB5]">Certificate Available!</CardTitle>
                <CardDescription className="text-gray-400">You've completed the required training</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f0f15] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-[#D4A836]">{eligibility.completed_sessions}</p>
                  <p className="text-xs text-gray-500">Sessions Completed</p>
                </div>
                <div className="bg-[#0f0f15] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{eligibility.average_score}%</p>
                  <p className="text-xs text-gray-500">Average Score</p>
                </div>
              </div>
              {eligibility.existing_certificate && (
                <div className="bg-[#0f0f15] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">Certificate ID:</span>
                    <code className="text-[#D4A836]">{eligibility.existing_certificate}</code>
                  </div>
                </div>
              )}
              <Button onClick={generateCertificate} disabled={generating} className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black" data-testid="download-certificate-btn">
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Download className="w-4 h-4 mr-2" />{eligibility.existing_certificate ? 'Download Again' : 'Generate & Download'}</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-[#E8DDB5]">Training Required</CardTitle>
                <CardDescription className="text-gray-400">Complete training modules to earn your certificate</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400 text-sm">{eligibility?.reason || 'Complete at least one training session to receive a certificate.'}</p>
            </div>
            <Button onClick={() => window.location.href = '/training'} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
              <BookOpen className="w-4 h-4 mr-2" />Start Training
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="bg-[#161B22] border-[#30363D]">
        <CardHeader><CardTitle className="text-[#E8DDB5] text-lg">About Certificates</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-gray-400">
            {['Certificates include your name, completion date, and score', 'Each certificate has a unique verification ID', "Certificates are customized with your organization's branding", 'Download as PDF for printing or digital sharing'].map((text, i) => (
              <li key={i} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /><span>{text}</span></li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
