import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, Mail, MousePointerClick, 
  Target, Award, AlertTriangle, CheckCircle, Clock, RefreshCw, Loader2,
  PieChart, Activity, Building2, Trophy, Calendar, Filter, Eye, Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdvancedAnalytics() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [phishingStats, setPhishingStats] = useState(null);
  const [trainingStats, setTrainingStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [clickDetails, setClickDetails] = useState([]);
  
  // New: All campaigns data with multi-select
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [campaignSummary, setCampaignSummary] = useState(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('all'); // all, phishing, ad
  const [bestCampaigns, setBestCampaigns] = useState([]);

  useEffect(() => {
    if (!customDateRange) {
      fetchAllData();
    }
  }, [timeRange]);

  const applyCustomDateRange = () => {
    if (startDate && endDate) {
      fetchAllData();
    } else {
      toast.error('Please select both start and end dates');
    }
  };

  const getDateParams = () => {
    if (customDateRange && startDate && endDate) {
      return `start_date=${startDate}&end_date=${endDate}`;
    }
    return `days=${timeRange}`;
  };

  const fetchAllData = async () => {
    setLoading(true);
    const dateParams = getDateParams();
    try {
      const [analyticsRes, phishingRes, usersRes, clickRes, bestRes] = await Promise.all([
        axios.get(`${API}/analytics/overview?${dateParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null })),
        axios.get(`${API}/phishing/stats?${dateParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null })),
        axios.get(`${API}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API}/phishing/click-details?${dateParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { click_details: [] } })),
        axios.get(`${API}/phishing/best-performing?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { campaigns: [] } }))
      ]);

      setAnalytics(analyticsRes.data);
      setPhishingStats(phishingRes.data);
      setClickDetails(clickRes.data?.click_details || []);
      setBestCampaigns(bestRes.data?.campaigns || []);
      
      // Calculate user stats from users list
      // API returns array directly, not { users: [] }
      const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []);
      const activeUsers = users.filter(u => u.is_active).length;
      const roleDistribution = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {});
      
      setUserStats({
        total: users.length,
        active: activeUsers,
        inactive: users.length - activeUsers,
        roles: roleDistribution
      });
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'text-[#D4A836]', trend }) => (
    <Card className="bg-[#0f0f15] border-[#D4A836]/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end">
            <Icon className={`w-6 h-6 ${color} opacity-50`} />
            {trend !== undefined && (
              <div className={`flex items-center text-xs mt-2 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProgressBar = ({ label, value, max, color = 'bg-[#D4A836]' }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="text-[#E8DDB5]">{value} / {max}</span>
        </div>
        <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Advanced Analytics</h1>
            <p className="text-gray-400">Comprehensive insights across your organization</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Filter */}
            {customDateRange ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-gray-400 text-xs">From</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-36 bg-[#1a1a24] border-[#D4A836]/20 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-gray-400 text-xs">To</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-36 bg-[#1a1a24] border-[#D4A836]/20 text-sm"
                  />
                </div>
                <Button onClick={applyCustomDateRange} size="sm" className="bg-[#D4A836] text-black">
                  Apply
                </Button>
                <Button 
                  onClick={() => {
                    setCustomDateRange(false);
                    setStartDate('');
                    setEndDate('');
                    fetchAllData();
                  }} 
                  size="sm" 
                  variant="ghost"
                  className="text-gray-400"
                >
                  Reset
                </Button>
              </div>
            ) : (
              <>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-36 bg-[#1a1a24] border-[#D4A836]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => setCustomDateRange(true)}
                  variant="outline"
                  size="sm"
                  className="border-[#D4A836]/30"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Custom Range
                </Button>
              </>
            )}
            <Button 
              onClick={fetchAllData}
              variant="outline"
              className="border-[#D4A836]/30"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Users" 
            value={userStats?.total || 0} 
            subtitle={`${userStats?.active || 0} active`}
            icon={Users}
          />
          <StatCard 
            title="Phishing Campaigns" 
            value={phishingStats?.total_campaigns || analytics?.campaigns_launched || 0} 
            subtitle="Total launched"
            icon={Mail}
          />
          <StatCard 
            title="Emails Sent" 
            value={phishingStats?.total_sent || analytics?.emails_sent || 0} 
            icon={Target}
            color="text-blue-400"
          />
          <StatCard 
            title="Click Rate" 
            value={`${phishingStats?.click_rate?.toFixed(1) || 0}%`} 
            subtitle="Industry avg: 15%"
            icon={MousePointerClick}
            color={phishingStats?.click_rate > 15 ? 'text-red-400' : 'text-green-400'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Phishing Performance */}
          <Card className="lg:col-span-2 bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D4A836]" />
                Phishing Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[#1a1a24] rounded-lg">
                  <p className="text-3xl font-bold text-blue-400">{phishingStats?.total_sent || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Emails Sent</p>
                </div>
                <div className="text-center p-4 bg-[#1a1a24] rounded-lg">
                  <p className="text-3xl font-bold text-yellow-400">{phishingStats?.total_opened || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Emails Opened</p>
                  <p className="text-xs text-yellow-400/70">{phishingStats?.open_rate?.toFixed(1) || 0}% rate</p>
                </div>
                <div className="text-center p-4 bg-[#1a1a24] rounded-lg">
                  <p className="text-3xl font-bold text-red-400">{phishingStats?.total_clicked || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Links Clicked</p>
                  <p className="text-xs text-red-400/70">{phishingStats?.click_rate?.toFixed(1) || 0}% rate</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#1a1a24] rounded-lg">
                <h4 className="text-sm text-gray-400 mb-4">Vulnerability Breakdown</h4>
                <ProgressBar 
                  label="Opened Email" 
                  value={phishingStats?.total_opened || 0} 
                  max={phishingStats?.total_sent || 1}
                  color="bg-yellow-500"
                />
                <ProgressBar 
                  label="Clicked Link" 
                  value={phishingStats?.total_clicked || 0} 
                  max={phishingStats?.total_sent || 1}
                  color="bg-red-500"
                />
                <ProgressBar 
                  label="Submitted Data" 
                  value={phishingStats?.total_submitted || 0} 
                  max={phishingStats?.total_sent || 1}
                  color="bg-red-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#D4A836]" />
                User Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Active vs Inactive */}
                <div className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-400">Active Users</span>
                  </div>
                  <span className="text-[#E8DDB5] font-medium">{userStats?.active || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span className="text-gray-400">Inactive Users</span>
                  </div>
                  <span className="text-[#E8DDB5] font-medium">{userStats?.inactive || 0}</span>
                </div>

                {/* Role Distribution */}
                <h4 className="text-sm text-gray-400 mt-6 mb-2">By Role</h4>
                {Object.entries(userStats?.roles || {}).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between p-2 border-b border-[#D4A836]/10">
                    <Badge variant="outline" className="border-[#D4A836]/30 text-gray-400">
                      {role.replace('_', ' ')}
                    </Badge>
                    <span className="text-[#E8DDB5]">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Assessment */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Risk Assessment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-400">
                  {phishingStats?.total_sent > 0 
                    ? Math.round(((phishingStats?.total_sent - phishingStats?.total_clicked) / phishingStats?.total_sent) * 100) 
                    : 100}%
                </p>
                <p className="text-xs text-gray-400">Resilient Users</p>
                <p className="text-xs text-green-400/70 mt-1">Didn't click phishing links</p>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-400">
                  {phishingStats?.open_rate?.toFixed(0) || 0}%
                </p>
                <p className="text-xs text-gray-400">Opened Suspicious</p>
                <p className="text-xs text-yellow-400/70 mt-1">Opened phishing emails</p>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <MousePointerClick className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-400">
                  {phishingStats?.click_rate?.toFixed(0) || 0}%
                </p>
                <p className="text-xs text-gray-400">At Risk</p>
                <p className="text-xs text-orange-400/70 mt-1">Clicked malicious links</p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                <Target className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-400">
                  {phishingStats?.submission_rate?.toFixed(0) || 0}%
                </p>
                <p className="text-xs text-gray-400">Compromised</p>
                <p className="text-xs text-red-400/70 mt-1">Submitted credentials</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-6 p-4 bg-[#1a1a24] rounded-lg">
              <h4 className="text-sm font-medium text-[#E8DDB5] mb-3">Recommendations</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {(phishingStats?.click_rate || 0) > 20 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span>High click rate detected. Consider mandatory security awareness training for all users.</span>
                  </li>
                )}
                {(phishingStats?.click_rate || 0) > 10 && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Schedule regular phishing simulations to maintain awareness.</span>
                  </li>
                )}
                {(phishingStats?.submission_rate || 0) > 5 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span>Users are submitting credentials. Implement MFA and password manager training.</span>
                  </li>
                )}
                {(userStats?.inactive || 0) > (userStats?.total || 1) * 0.3 && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>High number of inactive users. Review and clean up user accounts.</span>
                  </li>
                )}
                {(phishingStats?.click_rate || 0) <= 10 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span>Great job! Your organization shows good security awareness. Keep up the training!</span>
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Click Details Section - Who clicked */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-red-400" />
              Users Who Clicked Phishing Links
              {clickDetails.length > 0 && (
                <Badge className="ml-2 bg-red-500/20 text-red-400">{clickDetails.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clickDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                <p>No users clicked on phishing links in this period</p>
                <p className="text-sm text-gray-500 mt-1">Great security awareness!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D4A836]/20">
                      <TableHead className="text-gray-400">User Name</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      {user?.role === 'super_admin' && (
                        <TableHead className="text-gray-400">Organization</TableHead>
                      )}
                      <TableHead className="text-gray-400">Campaign</TableHead>
                      <TableHead className="text-gray-400">Clicked At</TableHead>
                      <TableHead className="text-gray-400">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clickDetails.slice(0, 20).map((click, idx) => (
                      <TableRow key={idx} className="border-[#D4A836]/10">
                        <TableCell className="text-[#E8DDB5] font-medium">{click.user_name}</TableCell>
                        <TableCell className="text-gray-400">{click.user_email}</TableCell>
                        {user?.role === 'super_admin' && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#D4A836]" />
                              <span className="text-gray-300">{click.organization_name}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-gray-400">{click.campaign_name}</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {click.clicked_at ? new Date(click.clicked_at).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-gray-500 font-mono text-sm">{click.click_ip || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {clickDetails.length > 20 && (
                  <p className="text-center text-gray-500 text-sm mt-4">
                    Showing 20 of {clickDetails.length} clicks
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best Performing Campaigns */}
        {user?.role === 'super_admin' && (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D4A836]" />
                Best Performing Campaigns
                <span className="text-sm font-normal text-gray-500">(Lowest click rates)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No campaigns found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#D4A836]/20">
                        <TableHead className="text-gray-400 w-12">#</TableHead>
                        <TableHead className="text-gray-400">Campaign Name</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400 text-center">Emails Sent</TableHead>
                        <TableHead className="text-gray-400 text-center">Clicks</TableHead>
                        <TableHead className="text-gray-400 text-center">Click Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bestCampaigns.map((campaign, idx) => (
                        <TableRow key={campaign.campaign_id} className="border-[#D4A836]/10">
                          <TableCell className="text-[#D4A836] font-bold">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </TableCell>
                          <TableCell className="text-[#E8DDB5] font-medium">{campaign.name}</TableCell>
                          <TableCell>
                            <Badge className={
                              campaign.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              campaign.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-gray-300">{campaign.total_sent}</TableCell>
                          <TableCell className="text-center text-red-400">{campaign.total_clicked}</TableCell>
                          <TableCell className="text-center">
                            <span className={campaign.click_rate <= 5 ? 'text-green-400' : campaign.click_rate <= 15 ? 'text-yellow-400' : 'text-red-400'}>
                              {campaign.click_rate}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
