import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Building2, Users, Target, BookOpen, TrendingUp, Activity, Award, Shield, QrCode, Usb, AlertTriangle, Mail, FileWarning, Lock, Eye } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Map scenario types to icons and colors
const SCENARIO_TYPE_META = {
  phishing_email: { icon: Mail, color: '#FF6B6B', label: 'Email Phishing' },
  malicious_ads: { icon: AlertTriangle, color: '#FFB300', label: 'Malicious Ads' },
  social_engineering: { icon: Users, color: '#2979FF', label: 'Social Engineering' },
  qr_code_phishing: { icon: QrCode, color: '#9C27B0', label: 'QR Code Phishing' },
  usb_drop: { icon: Usb, color: '#00BCD4', label: 'USB Drop' },
  mfa_fatigue: { icon: Lock, color: '#E91E63', label: 'MFA Fatigue' },
  bec_scenario: { icon: Mail, color: '#FF5722', label: 'Business Email Compromise' },
  data_handling_trap: { icon: FileWarning, color: '#795548', label: 'Data Handling' },
  ransomware_readiness: { icon: Shield, color: '#f44336', label: 'Ransomware' },
  shadow_it_detection: { icon: Eye, color: '#607D8B', label: 'Shadow IT' }
};

// Helper to determine color classes based on training session status
const getSessionStatusStyles = (status) => {
  switch (status) {
    case 'completed':
      return { bg: 'bg-[#00E676]/10', text: 'text-[#00E676]' };
    case 'failed':
      return { bg: 'bg-[#FF3B30]/10', text: 'text-[#FF3B30]' };
    case 'reassigned':
      return { bg: 'bg-[#FFB300]/10', text: 'text-[#FFB300]' };
    case 'in_progress':
      return { bg: 'bg-[#2979FF]/10', text: 'text-[#2979FF]' };
    default:
      return { bg: 'bg-[#FFB300]/10', text: 'text-[#FFB300]' };
  }
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, analyticsRes, userAnalyticsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/analytics/training`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(
          `${API}/analytics/users${
            user?.role !== 'super_admin' && user?.organization_id
              ? `?organization_id=${user.organization_id}`
              : ''
          }`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
      ]);
      setStats(statsRes.data);
      setRecentSessions(analyticsRes.data.recent_sessions || []);
      setUserStats(userAnalyticsRes.data || null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Organizations',
      value: stats?.total_organizations || 0,
      icon: Building2,
      color: '#2979FF',
      bgColor: 'bg-[#2979FF]/10'
    },
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: '#00E676',
      bgColor: 'bg-[#00E676]/10'
    },
    {
      title: 'Active Users',
      value: userStats?.active_users || 0,
      icon: Activity,
      color: '#00E676',
      bgColor: 'bg-[#00E676]/10'
    },
    {
      title: 'Inactive Users',
      value: userStats?.inactive_users || 0,
      icon: Activity,
      color: '#FF3B30',
      bgColor: 'bg-[#FF3B30]/10'
    },
    {
      title: 'Campaigns',
      value: stats?.total_campaigns || 0,
      icon: Target,
      color: '#FFB300',
      bgColor: 'bg-[#FFB300]/10'
    },
    {
      title: 'Simulations',
      value: stats?.total_scenarios || 0,
      icon: Shield,
      color: '#9C27B0',
      bgColor: 'bg-[#9C27B0]/10'
    }
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="dashboard-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-400">Here's what's happening with your security training</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title} 
                className="bg-[#161B22] border-[#30363D] card-hover animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
                        {loading ? '...' : stat.value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className="w-6 h-6" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Average Score Card */}
          <Card className="bg-[#161B22] border-[#30363D] lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00E676]" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full border-8 border-[#21262D] flex items-center justify-center">
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#00E676 ${(stats?.average_score || 0) * 3.6}deg, #21262D 0deg)`
                      }}
                    />
                    <div className="w-32 h-32 rounded-full bg-[#161B22] flex items-center justify-center relative z-10">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-[#00E676]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                          {loading ? '...' : `${Math.round(stats?.average_score || 0)}%`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Overall</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 pt-4 border-t border-[#30363D]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats?.active_campaigns || 0}</p>
                  <p className="text-xs text-gray-500">Active Campaigns</p>
                </div>
                <div className="w-px h-10 bg-[#30363D]" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats?.total_training_sessions || 0}</p>
                  <p className="text-xs text-gray-500">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-[#161B22] border-[#30363D] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#2979FF]" />
                Recent Training Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No training sessions yet</p>
                  <p className="text-sm text-gray-500">Start a training campaign to see activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSessions.slice(0, 5).map((session, index) => (
                    <div 
                      key={session.session_id || index} 
                      className="flex items-center justify-between p-4 rounded-lg bg-[#21262D]/50 border border-[#30363D]"
                    >
                      <div className="flex items-center gap-4">
                        {(() => {
                          const styles = getSessionStatusStyles(session.status);
                          return (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg}`}>
                              <BookOpen className={`w-5 h-5 ${styles.text}`} />
                            </div>
                          );
                        })()}
                        <div>
                          <p className="font-medium text-white">{session.module_name || session.module_id?.replace('mod_', '').replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.started_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          session.score >= 70 ? 'text-[#00E676]' : session.score >= 50 ? 'text-[#FFB300]' : 'text-[#FF3B30]'
                        }`}>
                          {session.score !== null && session.score !== undefined ? `${session.score}%` : '-'}
                        </p>
                        <p className={`text-xs capitalize ${getSessionStatusStyles(session.status).text}`}>
                          {session.status?.replace(/_/g, ' ') || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Simulation Types Breakdown */}
        {stats?.scenario_types && Object.keys(stats.scenario_types).length > 0 && (
          <Card className="bg-[#161B22] border-[#30363D] mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#9C27B0]" />
                Simulation Templates by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {Object.entries(stats.scenario_types).map(([type, count]) => {
                  const meta = SCENARIO_TYPE_META[type] || { 
                    icon: Shield, 
                    color: '#888', 
                    label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
                  };
                  const Icon = meta.icon;
                  return (
                    <div 
                      key={type}
                      className="bg-[#21262D]/50 border border-[#30363D] rounded-lg p-4 text-center"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center"
                        style={{ backgroundColor: `${meta.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                      </div>
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-xs text-gray-500 truncate" title={meta.label}>{meta.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
