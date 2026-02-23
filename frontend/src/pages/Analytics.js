import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { BarChart3, TrendingUp, Users, Target, BookOpen, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#2979FF', '#00E676', '#FF3B30', '#FFB300'];

export default function Analytics() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedOrg]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, analyticsRes, orgsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/analytics/training`, { 
          headers: { Authorization: `Bearer ${token}` },
          params: selectedOrg !== 'all' ? { organization_id: selectedOrg } : {}
        }),
        axios.get(`${API}/organizations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setOrganizations(orgsRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const moduleData = analytics?.by_module?.map(m => ({
    name: m._id?.replace('mod_', '').replace(/_/g, ' ') || 'Unknown',
    sessions: m.total_sessions,
    completed: m.completed,
    avgScore: Math.round(m.avg_score || 0)
  })) || [];

  const completionData = [
    { name: 'Completed', value: analytics?.by_module?.reduce((acc, m) => acc + (m.completed || 0), 0) || 0 },
    { name: 'In Progress', value: (analytics?.by_module?.reduce((acc, m) => acc + (m.total_sessions || 0), 0) || 0) - 
      (analytics?.by_module?.reduce((acc, m) => acc + (m.completed || 0), 0) || 0) }
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="analytics-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Analytics
            </h1>
            <p className="text-gray-400">Training performance insights and metrics</p>
          </div>
          
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-full sm:w-[200px] bg-[#161B22] border-[#30363D]">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent className="bg-[#161B22] border-[#30363D]">
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.organization_id} value={org.organization_id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2979FF]/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#2979FF]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Users</p>
                      <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#00E676]/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-[#00E676]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Sessions</p>
                      <p className="text-2xl font-bold">{stats?.total_training_sessions || 0}</p>
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
                      <p className="text-sm text-gray-400">Active Campaigns</p>
                      <p className="text-2xl font-bold">{stats?.active_campaigns || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[#FF3B30]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Avg Score</p>
                      <p className="text-2xl font-bold">{Math.round(stats?.average_score || 0)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Sessions by Module */}
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#2979FF]" />
                    Sessions by Module
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {moduleData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={moduleData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                        <XAxis type="number" stroke="#6B7280" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#6B7280" 
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#161B22', 
                            border: '1px solid #30363D',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="sessions" fill="#2979FF" radius={[0, 4, 4, 0]} name="Total Sessions" />
                        <Bar dataKey="completed" fill="#00E676" radius={[0, 4, 4, 0]} name="Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Completion Rate */}
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#00E676]" />
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {completionData.some(d => d.value > 0) ? (
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={completionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {completionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#161B22', 
                              border: '1px solid #30363D',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      No data available
                    </div>
                  )}
                  <div className="flex justify-center gap-8 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#2979FF]" />
                      <span className="text-sm text-gray-400">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#00E676]" />
                      <span className="text-sm text-gray-400">In Progress</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Average Scores by Module */}
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#FFB300]" />
                  Average Scores by Module
                </CardTitle>
              </CardHeader>
              <CardContent>
                {moduleData.length > 0 ? (
                  <div className="space-y-4">
                    {moduleData.map((module, index) => (
                      <div key={module.name} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-gray-400 capitalize truncate">
                          {module.name}
                        </div>
                        <div className="flex-1 h-8 bg-[#21262D] rounded-lg overflow-hidden relative">
                          <div 
                            className="h-full rounded-lg transition-all duration-500"
                            style={{ 
                              width: `${module.avgScore}%`,
                              backgroundColor: module.avgScore >= 70 ? '#00E676' : module.avgScore >= 50 ? '#FFB300' : '#FF3B30'
                            }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                            {module.avgScore}%
                          </span>
                        </div>
                        <div className="w-20 text-right text-sm text-gray-500">
                          {module.completed} completed
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    No training data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
