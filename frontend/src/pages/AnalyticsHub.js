import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { MultiOrgSelect } from '../components/common/MultiOrgSelect';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Target, BookOpen, CheckCircle,
  Mail, MousePointerClick, AlertTriangle, RefreshCw, Loader2, Activity,
  Trophy, Calendar, Filter, Eye, Monitor, PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COLORS = ['#2979FF', '#00E676', '#FF3B30', '#FFB300', '#9C27B0', '#00BCD4'];

export default function AnalyticsHub() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [advancedData, setAdvancedData] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedOrgs]);

  useEffect(() => {
    setSearchParams(activeTab !== 'overview' ? { tab: activeTab } : {});
  }, [activeTab]);

  const fetchOrgs = async () => {
    try {
      const res = await axios.get(`${API}/organizations`, { headers });
      setOrganizations(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedOrgs.length > 0) {
        params.organization_ids = selectedOrgs.join(',');
      }
      
      const [statsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers, params }),
        axios.get(`${API}/analytics/training`, { headers, params }),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);

      // Fetch advanced data
      try {
        const [phishRes, vulnRes] = await Promise.all([
          axios.get(`${API}/phishing/campaigns`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API}/vulnerable-users`, { headers, params }).catch(() => ({ data: { users: [] } })),
        ]);
        setAdvancedData({
          phishingCampaigns: Array.isArray(phishRes.data) ? phishRes.data : phishRes.data?.campaigns || [],
          vulnerableUsers: phishRes.data?.users || vulnRes.data?.users || [],
        });
      } catch (e) {
        setAdvancedData({ phishingCampaigns: [], vulnerableUsers: [] });
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const moduleData = analytics?.by_module?.map(m => ({
    name: m.module_name || m._id?.replace('mod_', '').replace(/_/g, ' ') || 'Unknown',
    sessions: m.total_sessions,
    completed: m.completed,
    avgScore: Math.round(m.avg_score || 0)
  })) || [];

  const completionData = [
    { name: 'Completed', value: analytics?.by_module?.reduce((acc, m) => acc + (m.completed || 0), 0) || 0 },
    { name: 'In Progress', value: (analytics?.by_module?.reduce((acc, m) => acc + (m.total_sessions || 0), 0) || 0) -
      (analytics?.by_module?.reduce((acc, m) => acc + (m.completed || 0), 0) || 0) }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'advanced', label: 'Advanced', icon: TrendingUp },
  ];

  const handleOrgToggle = (orgId) => {
    setSelectedOrgs(prev =>
      prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="analytics-hub-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Chivo, sans-serif' }}>Analytics</h1>
            <p className="text-gray-400">Training performance insights and metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <MultiOrgSelect
              organizations={organizations}
              selectedOrgs={selectedOrgs}
              onChange={setSelectedOrgs}
            />
            <Button variant="outline" size="icon" onClick={fetchData} className="border-[#30363D]">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#161B22] p-1 rounded-lg w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#D4A836] text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : activeTab === 'overview' ? (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: '#2979FF' },
                { label: 'Total Sessions', value: stats?.total_training_sessions || 0, icon: BookOpen, color: '#00E676' },
                { label: 'Active Campaigns', value: stats?.active_campaigns || 0, icon: Target, color: '#FFB300' },
                { label: 'Avg Score', value: `${Math.round(stats?.average_score || 0)}%`, icon: TrendingUp, color: '#FF3B30' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <Card key={i} className="bg-[#161B22] border-[#30363D]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                          <Icon className="w-6 h-6" style={{ color: s.color }} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">{s.label}</p>
                          <p className="text-2xl font-bold">{s.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#2979FF]" />Sessions by Module</CardTitle></CardHeader>
                <CardContent>
                  {moduleData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={moduleData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                        <XAxis type="number" stroke="#6B7280" />
                        <YAxis dataKey="name" type="category" stroke="#6B7280" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }} />
                        <Bar dataKey="sessions" fill="#2979FF" radius={[0, 4, 4, 0]} name="Total Sessions" />
                        <Bar dataKey="completed" fill="#00E676" radius={[0, 4, 4, 0]} name="Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[300px] text-gray-500">No data available</div>}
                </CardContent>
              </Card>

              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#00E676]" />Completion Rate</CardTitle></CardHeader>
                <CardContent>
                  {completionData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={completionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {completionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[300px] text-gray-500">No data available</div>}
                  <div className="flex justify-center gap-8 mt-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#2979FF]" /><span className="text-sm text-gray-400">Completed</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#00E676]" /><span className="text-sm text-gray-400">In Progress</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Avg Scores by Module */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#FFB300]" />Average Scores by Module</CardTitle></CardHeader>
              <CardContent>
                {moduleData.length > 0 ? (
                  <div className="space-y-4">
                    {moduleData.map((module) => (
                      <div key={module.name} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-gray-400 capitalize truncate">{module.name}</div>
                        <div className="flex-1 h-8 bg-[#21262D] rounded-lg overflow-hidden relative">
                          <div className="h-full rounded-lg transition-all duration-500" style={{ width: `${module.avgScore}%`, backgroundColor: module.avgScore >= 70 ? '#00E676' : module.avgScore >= 50 ? '#FFB300' : '#FF3B30' }} />
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">{module.avgScore}%</span>
                        </div>
                        <div className="w-20 text-right text-sm text-gray-500">{module.completed} done</div>
                      </div>
                    ))}
                  </div>
                ) : <div className="flex items-center justify-center py-12 text-gray-500">No training data available yet</div>}
              </CardContent>
            </Card>
          </>
        ) : (
          /* Advanced Tab */
          <div className="space-y-6">
            {/* Phishing Campaign Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Campaigns', value: advancedData?.phishingCampaigns?.length || 0, icon: Target, color: '#2979FF' },
                { label: 'Active', value: advancedData?.phishingCampaigns?.filter(c => c.status === 'active').length || 0, icon: Activity, color: '#00E676' },
                { label: 'Emails Sent', value: advancedData?.phishingCampaigns?.reduce((a, c) => a + (c.emails_sent || c.targets_count || 0), 0) || 0, icon: Mail, color: '#FFB300' },
                { label: 'Vulnerable Users', value: advancedData?.vulnerableUsers?.length || 0, icon: AlertTriangle, color: '#FF3B30' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <Card key={i} className="bg-[#161B22] border-[#30363D]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                          <Icon className="w-6 h-6" style={{ color: s.color }} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">{s.label}</p>
                          <p className="text-2xl font-bold">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Campaign Performance Table */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-[#2979FF]" />Campaign Performance</CardTitle></CardHeader>
              <CardContent>
                {(advancedData?.phishingCampaigns?.length || 0) > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#30363D]">
                          <TableHead>Campaign</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Targets</TableHead>
                          <TableHead>Clicked</TableHead>
                          <TableHead>Click Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {advancedData.phishingCampaigns.slice(0, 15).map((c, i) => {
                          const targets = c.targets_count || c.emails_sent || 0;
                          const clicked = c.clicked_count || 0;
                          const rate = targets > 0 ? ((clicked / targets) * 100).toFixed(1) : '0.0';
                          return (
                            <TableRow key={i} className="border-[#30363D]">
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell><Badge variant="outline" className={c.status === 'active' ? 'border-green-500 text-green-400' : 'border-gray-500 text-gray-400'}>{c.status}</Badge></TableCell>
                              <TableCell>{targets}</TableCell>
                              <TableCell>{clicked}</TableCell>
                              <TableCell className={Number(rate) > 20 ? 'text-red-400' : 'text-green-400'}>{rate}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : <div className="text-center py-12 text-gray-500">No phishing campaigns found</div>}
              </CardContent>
            </Card>

            {/* Module Performance Chart */}
            {moduleData.length > 0 && (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-[#FFB300]" />Module Score Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={moduleData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                      <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#6B7280" />
                      <Tooltip contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="avgScore" fill="#D4A836" radius={[4, 4, 0, 0]} name="Avg Score (%)" />
                      <Bar dataKey="sessions" fill="#2979FF" radius={[4, 4, 0, 0]} name="Total Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
