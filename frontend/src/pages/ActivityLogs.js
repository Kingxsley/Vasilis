import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  Activity, User, Clock, Filter, RefreshCw, Loader2, Trash2, 
  ChevronLeft, ChevronRight, AlertTriangle, Search, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ActivityLogs() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchUser, setSearchUser] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Bulk selection
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchLogs();
      fetchStats();
    }
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `${API}/activity-logs?page=${page}&limit=50`;
      if (searchUser) url += `&user_id=${searchUser}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      if (resourceFilter) url += `&resource_type=${resourceFilter}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/activity-logs/stats?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setSearchUser('');
    setActionFilter('');
    setResourceFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchLogs();
  };

  const toggleSelectLog = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const selectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(l => l.activity_id));
    }
  };

  const deleteSelected = async () => {
    try {
      await axios.delete(`${API}/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { activity_ids: selectedLogs }
      });
      toast.success(`Deleted ${selectedLogs.length} activity logs`);
      setSelectedLogs([]);
      setShowDeleteConfirm(false);
      fetchLogs();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete activity logs');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getActionColor = (action) => {
    if (action?.includes('create') || action?.includes('add')) return 'bg-green-500/20 text-green-400';
    if (action?.includes('delete') || action?.includes('remove')) return 'bg-red-500/20 text-red-400';
    if (action?.includes('update') || action?.includes('edit')) return 'bg-blue-500/20 text-blue-400';
    if (action?.includes('login') || action?.includes('auth')) return 'bg-purple-500/20 text-purple-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#E8DDB5] mb-2">Access Denied</h2>
            <p className="text-gray-400">Only super admins can view activity logs.</p>
          </div>
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
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Activity Logs</h1>
            <p className="text-gray-400">Track all user activities across the platform</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedLogs.length > 0 && (
              <Button 
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedLogs.length})
              </Button>
            )}
            <Button 
              onClick={fetchLogs}
              variant="outline"
              className="border-[#D4A836]/30"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-1">Total Activities (30 days)</p>
                <p className="text-2xl font-bold text-[#D4A836]">{stats.total_activities}</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-1">Most Active User</p>
                <p className="text-lg font-bold text-[#E8DDB5] truncate">
                  {stats.most_active_users?.[0]?.user_name || 'N/A'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-1">Top Action</p>
                <p className="text-lg font-bold text-[#E8DDB5] truncate">
                  {stats.top_actions?.[0]?.action || 'N/A'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#0f0f15] border-[#D4A836]/20">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-1">Top Resource</p>
                <p className="text-lg font-bold text-[#E8DDB5] truncate">
                  {stats.activity_by_resource?.[0]?.resource || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#E8DDB5] flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-gray-400 text-xs">Action</Label>
                <Input
                  placeholder="Search action..."
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="bg-[#1a1a24] border-[#D4A836]/20"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Resource Type</Label>
                <Select value={resourceFilter || 'all'} onValueChange={(v) => setResourceFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/20">
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="page">Page</SelectItem>
                    <SelectItem value="settings">Settings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-[#1a1a24] border-[#D4A836]/20"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#1a1a24] border-[#D4A836]/20"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={applyFilters} className="bg-[#D4A836] text-black flex-1">
                  <Search className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button onClick={clearFilters} variant="outline" className="border-[#D4A836]/30">
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#E8DDB5]">
                Activity History ({total} total)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedLogs.length === logs.length && logs.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-gray-400">Select All</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activity logs found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D4A836]/10">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-gray-400">User</TableHead>
                      <TableHead className="text-gray-400">Action</TableHead>
                      <TableHead className="text-gray-400">Resource</TableHead>
                      <TableHead className="text-gray-400">Time</TableHead>
                      <TableHead className="text-gray-400">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.activity_id} className="border-[#D4A836]/10">
                        <TableCell>
                          <Checkbox
                            checked={selectedLogs.includes(log.activity_id)}
                            onCheckedChange={() => toggleSelectLog(log.activity_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-[#E8DDB5] font-medium">{log.user_name}</p>
                            <p className="text-xs text-gray-500">{log.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-300">{log.resource_type}</span>
                          {log.resource_id && (
                            <span className="text-gray-500 text-xs ml-1">({log.resource_id.slice(0, 12)}...)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {log.ip_address || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-400">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                      className="border-[#D4A836]/30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                      size="sm"
                      className="border-[#D4A836]/30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-[#161B22] border-[#30363D]">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Confirm Delete
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete {selectedLogs.length} activity log(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Cancel
              </Button>
              <Button onClick={deleteSelected} className="bg-red-600 hover:bg-red-700">
                Delete {selectedLogs.length} Log(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
