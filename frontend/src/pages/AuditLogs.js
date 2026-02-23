import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
import { Input } from '../components/ui/input';
import { Search, Download, RefreshCw, FileText, Loader2, Filter, Calendar, Globe } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuditLogs() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [actionTypes, setActionTypes] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    severity: '',
    search: '',
    country: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [logsPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '25',
        offset: String(logsPage * 25)
      });
      if (filters.action) params.append('action', filters.action);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.search) params.append('user_email', filters.search);
      if (filters.country) params.append('country', filters.country);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      
      const res = await axios.get(`${API}/security/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs);
      setLogsTotal(res.data.total);
      setActionTypes(res.data.action_types || []);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async (format) => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ format });
      if (filters.action) params.append('action', filters.action);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.search) params.append('user_email', filters.search);
      if (filters.country) params.append('country', filters.country);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const res = await axios.get(`${API}/security/audit-logs/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([res.data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Audit logs exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to export audit logs');
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      severity: '',
      search: '',
      country: '',
      startDate: '',
      endDate: ''
    });
    setLogsPage(0);
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[severity] || colors.info;
  };

  const getActionLabel = (action) => {
    const labels = {
      login_success: 'Login Success',
      login_failed_user_not_found: 'Login Failed (Unknown User)',
      login_failed_wrong_password: 'Login Failed (Wrong Password)',
      login_blocked_lockout: 'Login Blocked (Lockout)',
      login_failed_inactive: 'Login Failed (Inactive)',
      password_reset_completed: 'Password Reset',
      forgot_password_requested: 'Forgot Password',
      admin_unlock_account: 'Admin Unlock',
      permission_granted: 'Permission Granted',
      permission_revoked: 'Permission Revoked',
      user_role_changed: 'Role Changed'
    };
    return labels[action] || action?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const hasActiveFilters = filters.action || filters.severity || filters.search || filters.country || filters.startDate || filters.endDate;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="audit-logs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#D4A836]" />
              Audit Logs
            </h1>
            <p className="text-gray-400 mt-1">Security event logs with 30-day retention</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => fetchLogs()}
              variant="outline"
              className="border-[#D4A836]/30"
              data-testid="refresh-logs-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Select onValueChange={exportLogs} disabled={exporting}>
              {/* Match the appearance of other primary buttons for export */}
              <SelectTrigger
                className="w-[150px] bg-[#2979FF] text-white hover:bg-[#2962FF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2979FF]"
                data-testid="export-logs-btn"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </>
                )}
              </SelectTrigger>
              <SelectContent className="bg-[#161B22] border-[#30363D] text-white">
                <SelectItem value="csv">Export as CSV</SelectItem>
                <SelectItem value="json">Export as JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto text-[#D4A836] hover:text-[#E8DDB5] h-6 px-2"
                >
                  Clear all
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Search by email */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by email..."
                  value={filters.search}
                  onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setLogsPage(0); }}
                  className="pl-9 bg-[#1a1a24] border-[#D4A836]/20"
                  data-testid="search-email-input"
                />
              </div>
              
              {/* Action filter */}
              <Select 
                value={filters.action || "all"} 
                onValueChange={(v) => { setFilters({ ...filters, action: v === "all" ? "" : v }); setLogsPage(0); }}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/20" data-testid="action-filter">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D] max-h-[300px]">
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>
                      {getActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Severity filter */}
              <Select 
                value={filters.severity || "all"} 
                onValueChange={(v) => { setFilters({ ...filters, severity: v === "all" ? "" : v }); setLogsPage(0); }}
              >
                <SelectTrigger className="bg-[#1a1a24] border-[#D4A836]/20" data-testid="severity-filter">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>

              {/* Country filter */}
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Country..."
                  value={filters.country}
                  onChange={(e) => { setFilters({ ...filters, country: e.target.value }); setLogsPage(0); }}
                  className="pl-9 bg-[#1a1a24] border-[#D4A836]/20"
                  data-testid="country-filter"
                />
              </div>

              {/* Start Date */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  placeholder="Start date"
                  value={filters.startDate}
                  onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setLogsPage(0); }}
                  className="pl-9 bg-[#1a1a24] border-[#D4A836]/20"
                  data-testid="start-date-filter"
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  placeholder="End date"
                  value={filters.endDate}
                  onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setLogsPage(0); }}
                  className="pl-9 bg-[#1a1a24] border-[#D4A836]/20"
                  data-testid="end-date-filter"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D4A836]/20 hover:bg-transparent">
                      <TableHead className="text-gray-400 font-semibold w-[160px]">Timestamp</TableHead>
                      <TableHead className="text-gray-400 font-semibold w-[200px]">Action</TableHead>
                      <TableHead className="text-gray-400 font-semibold min-w-[150px]">User</TableHead>
                      <TableHead className="text-gray-400 font-semibold min-w-[180px]">Email</TableHead>
                      <TableHead className="text-gray-400 font-semibold w-[140px]">IP Address</TableHead>
                      <TableHead className="text-gray-400 font-semibold w-[120px]">Country</TableHead>
                      <TableHead className="text-gray-400 font-semibold w-[100px] text-center">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-16">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                          <p>No audit logs found</p>
                          {hasActiveFilters && (
                            <p className="text-sm mt-1">Try adjusting your filters</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log, idx) => (
                        <TableRow 
                          key={idx} 
                          className="border-[#D4A836]/10 hover:bg-white/5"
                          data-testid={`log-row-${idx}`}
                        >
                          <TableCell className="text-gray-400 text-sm font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-[#E8DDB5] font-medium">
                            {getActionLabel(log.action)}
                          </TableCell>
                          <TableCell className="text-[#D4A836] font-medium">
                            {log.user_name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {log.user_email || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 font-mono text-sm">
                            {log.ip_address || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {log.country || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${getSeverityBadge(log.severity)} text-xs`}>
                              {log.severity || 'info'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Pagination */}
        {!loading && logsTotal > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-sm text-gray-500">
              Showing {logsPage * 25 + 1}-{Math.min((logsPage + 1) * 25, logsTotal)} of {logsTotal} logs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={logsPage === 0}
                onClick={() => setLogsPage(logsPage - 1)}
                className="border-[#D4A836]/30 hover:bg-[#D4A836]/10"
                data-testid="prev-page-btn"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 px-3 text-sm text-gray-400">
                Page {logsPage + 1} of {Math.ceil(logsTotal / 25)}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={(logsPage + 1) * 25 >= logsTotal}
                onClick={() => setLogsPage(logsPage + 1)}
                className="border-[#D4A836]/30 hover:bg-[#D4A836]/10"
                data-testid="next-page-btn"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
