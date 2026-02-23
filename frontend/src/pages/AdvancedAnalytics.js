import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Mail,
  MousePointerClick,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  PieChart,
  Activity,
  Trophy,
  Calendar,
  Filter,
  Eye,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdvancedAnalytics() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [phishingStats, setPhishingStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  const [allCampaigns, setAllCampaigns] = useState([]);
  const [campaignSummary, setCampaignSummary] = useState(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('all');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all');
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [bestCampaigns, setBestCampaigns] = useState([]);

  const [campaignDetail, setCampaignDetail] = useState(null);
  const [campaignDetailLoading, setCampaignDetailLoading] = useState(false);

  const [simOverview, setSimOverview] = useState([]);
  const [simTypeDetail, setSimTypeDetail] = useState(null);
  const [simUsersDetail, setSimUsersDetail] = useState(null);

  const viewParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const view = viewParams.get('view') || '';
  const viewType = viewParams.get('type') || '';
  const viewOrg = viewParams.get('org') || '';
  const viewCampaign = viewParams.get('campaign') || '';

  const setViewParams = (params, { replace = true } = {}) => {
    const sp = new URLSearchParams(location.search);

    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === null || v === undefined || v === '') sp.delete(k);
      else sp.set(k, String(v));
    });

    navigate(
      {
        pathname: location.pathname,
        search: sp.toString() ? `?${sp.toString()}` : '',
      },
      { replace }
    );
  };

  const clearViewParams = ({ replace = true } = {}) => {
    navigate({ pathname: location.pathname, search: '' }, { replace });
  };

  useEffect(() => {
    if (!customDateRange) {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const userAnalyticsUrl =
        user?.role !== 'super_admin' && user?.organization_id
          ? `${API}/analytics/users?organization_id=${user.organization_id}`
          : `${API}/analytics/users`;

      const [analyticsRes, phishingRes, bestRes, allCampaignsRes, userAnalyticsRes] =
        await Promise.all([
          axios
            .get(`${API}/analytics/overview?${dateParams}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API}/phishing/stats?${dateParams}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API}/phishing/best-performing?limit=5`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { campaigns: [] } })),
          axios
            .get(`${API}/analytics/all-campaigns?${dateParams}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { campaigns: [], summary: null } })),
          axios
            .get(userAnalyticsUrl, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
        ]);

      setAnalytics(analyticsRes.data);
      setPhishingStats(phishingRes.data);
      setBestCampaigns(bestRes.data?.campaigns || []);

      setAllCampaigns(allCampaignsRes.data?.campaigns || []);
      setCampaignSummary(allCampaignsRes.data?.summary || null);

      const userAnalytics = userAnalyticsRes.data;
      if (userAnalytics) {
        setUserStats({
          total: userAnalytics.total_users || 0,
          active: userAnalytics.active_users || 0,
          inactive: userAnalytics.inactive_users || 0,
          roles: userAnalytics.role_distribution || {},
        });
      } else {
        setUserStats(null);
      }

      try {
        const simRes = await axios.get(`${API}/analytics/simulations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSimOverview(simRes.data?.types || []);
      } catch {
        setSimOverview([]);
      }
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignDetail = async (campaignId) => {
    setCampaignDetailLoading(true);
    try {
      const res = await axios.get(`${API}/analytics/campaign/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCampaignDetail(res.data);
    } catch {
      toast.error('Failed to load campaign analytics');
      setCampaignDetail(null);
    } finally {
      setCampaignDetailLoading(false);
    }
  };

  const fetchSimTypeDetail = async (type) => {
    setSimUsersDetail(null);
    setSimTypeDetail(null);
    try {
      const res = await axios.get(`${API}/analytics/simulations/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSimTypeDetail(res.data);
    } catch {
      toast.error('Failed to load simulation details');
    }
  };

  const fetchSimUsersDetail = async (type, orgId) => {
    setSimUsersDetail(null);
    try {
      const res = await axios.get(`${API}/analytics/simulations/${type}/organization/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSimUsersDetail(res.data);
    } catch {
      toast.error('Failed to load user details');
    }
  };

  // Sync UI state with URL without polluting browser history
  useEffect(() => {
    if (!token) return;

    if (view === 'campaign' && viewCampaign) {
      fetchCampaignDetail(viewCampaign);
      return;
    }

    if (view === 'simType' && viewType) {
      fetchSimTypeDetail(viewType);
      return;
    }

    if (view === 'simUsers' && viewType && viewOrg) {
      fetchSimUsersDetail(viewType, viewOrg);
      return;
    }

    // Default state when no view param
    if (!view) {
      setCampaignDetail(null);
      setSimTypeDetail(null);
      setSimUsersDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, view, viewType, viewOrg, viewCampaign]);

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
          <span className="text-[#E8DDB5]">
            {value} / {max}
          </span>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Advanced Analytics</h1>
            <p className="text-gray-400">Comprehensive insights across your organization</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="border-[#D4A836]/30"
            >
              Back
            </Button>

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

            <Button onClick={fetchAllData} variant="outline" className="border-[#D4A836]/30">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={userStats?.total || 0}
            subtitle={`${userStats?.active || 0} active`}
            icon={Users}
          />
          <StatCard
            title="Total Campaigns"
            value={phishingStats?.total_campaigns || analytics?.campaigns_launched || 0}
            subtitle="Phishing + Ad simulations"
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

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D4A836]" />
                Campaign Overview
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

          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#D4A836]" />
                User Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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

        {simOverview && simOverview.length > 0 && (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#D4A836]" />
                Simulations Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {simOverview.map((sim) => (
                  <div
                    key={sim.type}
                    className="p-4 bg-[#1a1a24] rounded-lg cursor-pointer hover:bg-[#222a33] transition-colors"
                    onClick={() => {
                      setViewParams({ view: 'simType', type: sim.type, org: '', campaign: '' }, { replace: true });
                      fetchSimTypeDetail(sim.type);
                    }}
                  >
                    <p className="text-lg font-semibold text-[#E8DDB5] capitalize">{sim.label}</p>
                    <div className="text-xs text-gray-400 mt-1">Campaigns: {sim.total_campaigns}</div>
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-gray-400">Sent</span>
                      <span className="text-[#E8DDB5]">{sim.sent}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Opened</span>
                      <span className="text-[#E8DDB5]">{sim.opened}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Clicked</span>
                      <span className="text-[#E8DDB5]">{sim.clicked}</span>
                    </div>
                    {sim.type === 'phishing' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Submitted</span>
                        <span className="text-[#E8DDB5]">{sim.submitted}</span>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">Click to view details</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {simTypeDetail && (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#D4A836]" />
                {simTypeDetail.type === 'phishing' ? 'Phishing Campaigns' : 'Ad Simulations'} Summary
              </CardTitle>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#D4A836]/30"
                  onClick={() => {
                    setSimTypeDetail(null);
                    setSimUsersDetail(null);
                    clearViewParams({ replace: true });
                  }}
                >
                  Back to Overview
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-[#1a1a24] rounded-lg text-center">
                    <p className="text-sm text-gray-400">Sent</p>
                    <p className="text-xl font-bold text-[#E8DDB5]">{simTypeDetail.summary.sent}</p>
                  </div>
                  <div className="p-3 bg-[#1a1a24] rounded-lg text-center">
                    <p className="text-sm text-gray-400">Opened</p>
                    <p className="text-xl font-bold text-[#E8DDB5]">{simTypeDetail.summary.opened}</p>
                    <p className="text-xs text-gray-500">{simTypeDetail.summary.open_rate}% rate</p>
                  </div>
                  <div className="p-3 bg-[#1a1a24] rounded-lg text-center">
                    <p className="text-sm text-gray-400">Clicked</p>
                    <p className="text-xl font-bold text-[#E8DDB5]">{simTypeDetail.summary.clicked}</p>
                    <p className="text-xs text-gray-500">{simTypeDetail.summary.click_rate}% rate</p>
                  </div>
                  {simTypeDetail.type === 'phishing' && (
                    <div className="p-3 bg-[#1a1a24] rounded-lg text-center">
                      <p className="text-sm text-gray-400">Submitted</p>
                      <p className="text-xl font-bold text-[#E8DDB5]">{simTypeDetail.summary.submitted}</p>
                      <p className="text-xs text-gray-500">{simTypeDetail.summary.submission_rate}% rate</p>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <h4 className="text-sm text-gray-400 mb-2">By Organization</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-[#D4A836]/20">
                          <th className="py-2 pr-4">Organization</th>
                          <th className="py-2 pr-4">Sent</th>
                          <th className="py-2 pr-4">Opened</th>
                          <th className="py-2 pr-4">Clicked</th>
                          {simTypeDetail.type === 'phishing' && <th className="py-2 pr-4">Submitted</th>}
                          <th className="py-2 pr-4">Open Rate</th>
                          <th className="py-2 pr-4">Click Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simTypeDetail.organizations.map((org) => {
                          const openRate = org.sent > 0 ? ((org.opened / org.sent) * 100).toFixed(1) : '0.0';
                          const clickRate = org.sent > 0 ? ((org.clicked / org.sent) * 100).toFixed(1) : '0.0';
                          return (
                            <tr
                              key={org.organization_id}
                              className="border-b border-[#D4A836]/10 hover:bg-[#1a1a24] cursor-pointer"
                              onClick={() => {
                                setViewParams(
                                  { view: 'simUsers', type: simTypeDetail.type, org: org.organization_id, campaign: '' },
                                  { replace: true }
                                );
                                fetchSimUsersDetail(simTypeDetail.type, org.organization_id);
                              }}
                            >
                              <td className="py-2 pr-4">{org.organization_name || 'Unassigned'}</td>
                              <td className="py-2 pr-4">{org.sent}</td>
                              <td className="py-2 pr-4">{org.opened}</td>
                              <td className="py-2 pr-4">{org.clicked}</td>
                              {simTypeDetail.type === 'phishing' && <td className="py-2 pr-4">{org.submitted}</td>}
                              <td className="py-2 pr-4">{openRate}%</td>
                              <td className="py-2 pr-4">{clickRate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Click a row to view user breakdown.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {simUsersDetail && (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#D4A836]" />
                User Breakdown
              </CardTitle>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#D4A836]/30"
                  onClick={() => {
                    setSimUsersDetail(null);
                    setViewParams({ view: 'simType', type: viewType, org: '', campaign: '' }, { replace: true });
                  }}
                >
                  Back to Organizations
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[#D4A836]/20">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Sent</th>
                      <th className="py-2 pr-4">Opened</th>
                      <th className="py-2 pr-4">Clicked</th>
                      {simUsersDetail.type === 'phishing' && <th className="py-2 pr-4">Submitted</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {simUsersDetail.users.map((usr) => (
                      <tr key={usr.user_id} className="border-b border-[#D4A836]/10">
                        <td className="py-2 pr-4">{usr.name || 'Unknown'}</td>
                        <td className="py-2 pr-4">{usr.sent}</td>
                        <td className="py-2 pr-4">{usr.opened}</td>
                        <td className="py-2 pr-4">{usr.clicked}</td>
                        {simUsersDetail.type === 'phishing' && <td className="py-2 pr-4">{usr.submitted}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {simUsersDetail.users.length === 0 && (
                  <p className="text-gray-400 text-sm mt-4">No user activity data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                    ? Math.round(((phishingStats.total_sent - (phishingStats.total_clicked || 0)) / phishingStats.total_sent) * 100)
                    : 100}
                  %
                </p>
                <p className="text-xs text-gray-400">Resilient Users</p>
                <p className="text-xs text-green-400/70 mt-1">Didn't click phishing links</p>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-400">{phishingStats?.open_rate?.toFixed(0) || 0}%</p>
                <p className="text-xs text-gray-400">Opened Suspicious</p>
                <p className="text-xs text-yellow-400/70 mt-1">Opened phishing emails</p>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <MousePointerClick className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-400">{phishingStats?.click_rate?.toFixed(0) || 0}%</p>
                <p className="text-xs text-gray-400">At Risk</p>
                <p className="text-xs text-orange-400/70 mt-1">Clicked malicious links</p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                <Target className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-400">{phishingStats?.submission_rate?.toFixed(0) || 0}%</p>
                <p className="text-xs text-gray-400">Compromised</p>
                <p className="text-xs text-red-400/70 mt-1">Submitted credentials</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D4A836]" />
                All Simulation Campaigns
                {campaignSummary && (
                  <Badge className="ml-2 bg-[#D4A836]/20 text-[#D4A836]">
                    {campaignSummary.total_campaigns} Total
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Select value={campaignTypeFilter} onValueChange={setCampaignTypeFilter}>
                  <SelectTrigger className="w-44 bg-[#1a1a24] border-[#D4A836]/20">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="phishing">Phishing Emails</SelectItem>
                    <SelectItem value="ad">Malicious Ads</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={campaignStatusFilter} onValueChange={setCampaignStatusFilter}>
                  <SelectTrigger className="w-44 bg-[#1a1a24] border-[#D4A836]/20">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={campaignStartDate}
                  onChange={(e) => setCampaignStartDate(e.target.value)}
                  className="w-40 bg-[#1a1a24] border-[#D4A836]/20 text-[#E8DDB5]"
                />
                <Input
                  type="date"
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                  className="w-40 bg-[#1a1a24] border-[#D4A836]/20 text-[#E8DDB5]"
                />

                {(campaignStartDate || campaignEndDate) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCampaignStartDate('');
                      setCampaignEndDate('');
                    }}
                    className="border-[#D4A836]/20 text-[#D4A836]"
                  >
                    Clear Dates
                  </Button>
                )}

                {selectedCampaignIds.length > 0 && (
                  <Badge className="bg-[#D4A836] text-black">{selectedCampaignIds.length} Selected</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {allCampaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p>No campaigns found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D4A836]/20">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedCampaignIds.length ===
                              allCampaigns.filter((c) => {
                                const typeMatch = campaignTypeFilter === 'all' || c.type === campaignTypeFilter;
                                const statusMatch = campaignStatusFilter === 'all' || c.status === campaignStatusFilter;

                                let startMatch = true;
                                if (campaignStartDate && c.start_date) {
                                  try {
                                    startMatch = new Date(c.start_date) >= new Date(campaignStartDate);
                                  } catch {
                                    startMatch = true;
                                  }
                                }

                                let endMatch = true;
                                if (campaignEndDate && c.start_date) {
                                  try {
                                    endMatch = new Date(c.start_date) <= new Date(campaignEndDate);
                                  } catch {
                                    endMatch = true;
                                  }
                                }

                                return typeMatch && statusMatch && startMatch && endMatch;
                              }).length &&
                            allCampaigns.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCampaignIds(
                                allCampaigns
                                  .filter((c) => {
                                    const typeMatch = campaignTypeFilter === 'all' || c.type === campaignTypeFilter;
                                    const statusMatch = campaignStatusFilter === 'all' || c.status === campaignStatusFilter;

                                    let startMatch = true;
                                    if (campaignStartDate && c.start_date) {
                                      try {
                                        startMatch = new Date(c.start_date) >= new Date(campaignStartDate);
                                      } catch {
                                        startMatch = true;
                                      }
                                    }

                                    let endMatch = true;
                                    if (campaignEndDate && c.start_date) {
                                      try {
                                        endMatch = new Date(c.start_date) <= new Date(campaignEndDate);
                                      } catch {
                                        endMatch = true;
                                      }
                                    }

                                    return typeMatch && statusMatch && startMatch && endMatch;
                                  })
                                  .map((c) => c.campaign_id)
                              );
                            } else {
                              setSelectedCampaignIds([]);
                            }
                          }}
                          className="border-[#30363D] data-[state=checked]:bg-[#D4A836]"
                        />
                      </TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Campaign Name</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400 text-center">Targets</TableHead>
                      <TableHead className="text-gray-400 text-center">Sent</TableHead>
                      <TableHead className="text-gray-400 text-center">Opened</TableHead>
                      <TableHead className="text-gray-400 text-center">Clicked</TableHead>
                      <TableHead className="text-gray-400 text-center">Open Rate</TableHead>
                      <TableHead className="text-gray-400 text-center">Click Rate</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {allCampaigns
                      .filter((c) => {
                        const typeMatch = campaignTypeFilter === 'all' || c.type === campaignTypeFilter;
                        const statusMatch = campaignStatusFilter === 'all' || c.status === campaignStatusFilter;

                        let startMatch = true;
                        if (campaignStartDate && c.start_date) {
                          try {
                            startMatch = new Date(c.start_date) >= new Date(campaignStartDate);
                          } catch {
                            startMatch = true;
                          }
                        }

                        let endMatch = true;
                        if (campaignEndDate && c.start_date) {
                          try {
                            endMatch = new Date(c.start_date) <= new Date(campaignEndDate);
                          } catch {
                            endMatch = true;
                          }
                        }

                        return typeMatch && statusMatch && startMatch && endMatch;
                      })
                      .map((campaign) => (
                        <TableRow
                          key={campaign.campaign_id}
                          className={`border-[#D4A836]/10 ${
                            selectedCampaignIds.includes(campaign.campaign_id) ? 'bg-[#D4A836]/10' : ''
                          }`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedCampaignIds.includes(campaign.campaign_id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedCampaignIds([...selectedCampaignIds, campaign.campaign_id]);
                                else setSelectedCampaignIds(selectedCampaignIds.filter((id) => id !== campaign.campaign_id));
                              }}
                              className="border-[#30363D] data-[state=checked]:bg-[#D4A836]"
                            />
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={
                                campaign.type === 'phishing'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-purple-500/20 text-purple-400'
                              }
                            >
                              {campaign.type === 'phishing' ? (
                                <>
                                  <Mail className="w-3 h-3 mr-1" /> Phishing
                                </>
                              ) : (
                                <>
                                  <Monitor className="w-3 h-3 mr-1" /> Ad
                                </>
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell
                            className="text-[#E8DDB5] font-medium cursor-pointer hover:underline"
                            onClick={() => {
                              setViewParams({ view: 'campaign', campaign: campaign.campaign_id, type: '', org: '' }, { replace: true });
                              fetchCampaignDetail(campaign.campaign_id);
                            }}
                          >
                            {campaign.name}
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={
                                campaign.status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : campaign.status === 'draft'
                                  ? 'bg-gray-500/20 text-gray-400'
                                  : campaign.status === 'completed'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }
                            >
                              {campaign.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center text-gray-300">{campaign.total_targets}</TableCell>
                          <TableCell className="text-center text-gray-300">{campaign.sent}</TableCell>
                          <TableCell className="text-center text-green-400">{campaign.opened}</TableCell>
                          <TableCell className="text-center text-red-400">{campaign.clicked}</TableCell>

                          <TableCell className="text-center">
                            <span
                              className={
                                campaign.open_rate >= 50
                                  ? 'text-green-400'
                                  : campaign.open_rate >= 25
                                  ? 'text-yellow-400'
                                  : 'text-gray-400'
                              }
                            >
                              {campaign.open_rate}%
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            <span
                              className={
                                campaign.click_rate <= 5
                                  ? 'text-green-400'
                                  : campaign.click_rate <= 15
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }
                            >
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
                            <Badge
                              className={
                                campaign.status === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : campaign.status === 'running'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }
                            >
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-gray-300">{campaign.total_sent}</TableCell>
                          <TableCell className="text-center text-red-400">{campaign.total_clicked}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                campaign.click_rate <= 5
                                  ? 'text-green-400'
                                  : campaign.click_rate <= 15
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }
                            >
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

        {campaignDetail && (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20 mt-6">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#D4A836]" />
                  Campaign Details: {campaignDetail.campaign_name}
                  <Badge className="ml-2 bg-[#D4A836]/20 text-[#D4A836]">
                    {campaignDetail.campaign_type === 'phishing' ? 'Phishing' : 'Ad'}
                  </Badge>
                </CardTitle>

                <Button
                  variant="outline"
                  className="border-[#D4A836]/30"
                  onClick={() => {
                    setCampaignDetail(null);
                    clearViewParams({ replace: true });
                  }}
                >
                  Close
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {campaignDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#D4A836] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {campaignDetail.summary && campaignDetail.campaign_type === 'phishing' && (
                      <>
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                          <Mail className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-blue-400">{campaignDetail.summary.sent}</p>
                          <p className="text-xs text-gray-400">Emails Sent</p>
                        </div>
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                          <Eye className="w-6 h-6 text-green-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-green-400">{campaignDetail.summary.opened}</p>
                          <p className="text-xs text-gray-400">Opened</p>
                        </div>
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                          <MousePointerClick className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-yellow-400">{campaignDetail.summary.clicked}</p>
                          <p className="text-xs text-gray-400">Clicked</p>
                        </div>
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                          <Users className="w-6 h-6 text-red-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-red-400">{campaignDetail.summary.submitted}</p>
                          <p className="text-xs text-gray-400">Credentials Submitted</p>
                        </div>
                      </>
                    )}

                    {campaignDetail.summary && campaignDetail.campaign_type === 'ad' && (
                      <>
                        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
                          <Monitor className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-purple-400">{campaignDetail.summary.sent}</p>
                          <p className="text-xs text-gray-400">Ads Served</p>
                        </div>
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                          <Eye className="w-6 h-6 text-green-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-green-400">{campaignDetail.summary.viewed}</p>
                          <p className="text-xs text-gray-400">Viewed</p>
                        </div>
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                          <MousePointerClick className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-yellow-400">{campaignDetail.summary.clicked}</p>
                          <p className="text-xs text-gray-400">Clicked</p>
                        </div>
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                          <TrendingUp className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                          <p className="text-xl font-bold text-blue-400">{campaignDetail.summary.view_rate}%</p>
                          <p className="text-xs text-gray-400">View Rate</p>
                        </div>
                      </>
                    )}
                  </div>

                  {campaignDetail.organizations && campaignDetail.organizations.length > 0 && (
                    <div className="overflow-x-auto border border-[#30363D] rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#30363D]">
                            <TableHead className="text-gray-400">Organization</TableHead>
                            <TableHead className="text-gray-400 text-center">Sent</TableHead>

                            {campaignDetail.campaign_type === 'phishing' && (
                              <>
                                <TableHead className="text-gray-400 text-center">Opened</TableHead>
                                <TableHead className="text-gray-400 text-center">Clicked</TableHead>
                                <TableHead className="text-gray-400 text-center">Submitted</TableHead>
                              </>
                            )}

                            {campaignDetail.campaign_type === 'ad' && (
                              <>
                                <TableHead className="text-gray-400 text-center">Viewed</TableHead>
                                <TableHead className="text-gray-400 text-center">Clicked</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {campaignDetail.organizations.map((org) => (
                            <TableRow key={org.organization_id} className="border-[#30363D]/50">
                              <TableCell className="text-[#E8DDB5] font-medium">
                                {org.organization_name || 'Unassigned'}
                              </TableCell>
                              <TableCell className="text-center text-gray-300">{org.sent}</TableCell>

                              {campaignDetail.campaign_type === 'phishing' && (
                                <>
                                  <TableCell className="text-center text-green-400">{org.opened}</TableCell>
                                  <TableCell className="text-center text-yellow-400">{org.clicked}</TableCell>
                                  <TableCell className="text-center text-red-400">{org.submitted}</TableCell>
                                </>
                              )}

                              {campaignDetail.campaign_type === 'ad' && (
                                <>
                                  <TableCell className="text-center text-green-400">{org.viewed}</TableCell>
                                  <TableCell className="text-center text-yellow-400">{org.clicked}</TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
