import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Users, Plus, Search, Pencil, Trash2, Building2, Award, Loader2, AlertTriangle, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Pagination } from '../components/common/Pagination';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UsersPage() {
  const { token, user: currentUser } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOrg, setFilterOrg] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'trainee',
    organization_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Check if we're coming from access request approval
  useEffect(() => {
    if (location.state?.createUser) {
      const userData = location.state.createUser;
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        password: '',
        role: 'trainee',
        organization_id: ''
      });
      setDialogOpen(true);
      // Clear the state so refresh doesn't re-open
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, orgsRes] = await Promise.all([
        axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/organizations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data);
      setOrganizations(orgsRes.data);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = { ...formData };
      if (!payload.organization_id) delete payload.organization_id;
      
      if (editingUser) {
        const { password, email, ...updateData } = payload;
        await axios.patch(`${API}/users/${editingUser.user_id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('User updated');
      } else {
        const response = await axios.post(`${API}/users`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Show success with email status
        if (response.data.email_sent) {
          toast.success('User created and welcome email sent');
        } else {
          toast.success('User created (email not sent - check SendGrid config)');
        }
      }
      setDialogOpen(false);
      setEditingUser(null);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      organization_id: user.organization_id || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser.user_id) {
      toast.error("You can't delete your own account");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  // Open role change dialog
  const openRoleChange = (user) => {
    if (user.user_id === currentUser.user_id) {
      toast.error("You can't change your own role");
      return;
    }
    setRoleChangeUser(user);
    setNewRole(user.role);
    setShowRoleDialog(true);
  };

  // Change user role (elevate/demote privileges)
  const changeUserRole = async () => {
    if (!roleChangeUser || !newRole) return;
    
    try {
      await axios.patch(`${API}/users/${roleChangeUser.user_id}`, {
        role: newRole
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${roleChangeUser.name}'s role changed to ${newRole.replace('_', ' ')}`);
      setShowRoleDialog(false);
      setRoleChangeUser(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change role');
    }
  };

  const toggleSelectUser = (userId) => {
    if (userId === currentUser.user_id) return; // Can't select self
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    const selectableUsers = paginatedUsers.filter(u => u.user_id !== currentUser.user_id);
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map(u => u.user_id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedUsers.map(userId => 
          axios.delete(`${API}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      toast.success(`Deleted ${selectedUsers.length} users`);
      setSelectedUsers([]);
      setShowBulkDeleteConfirm(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete some users');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'trainee',
      organization_id: ''
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesOrg = filterOrg === 'all' || user.organization_id === filterOrg;
    return matchesSearch && matchesOrg;
  });

  // Paginate the filtered results
  const totalUsers = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterOrg]);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-[#FF3B30]/20 text-[#FF3B30]';
      case 'org_admin': return 'bg-[#FFB300]/20 text-[#FFB300]';
      case 'media_manager': return 'bg-[#9C27B0]/20 text-[#9C27B0]';
      default: return 'bg-[#2979FF]/20 text-[#2979FF]';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'org_admin': return 'Org Admin';
      case 'media_manager': return 'Media Manager';
      default: return 'Trainee';
    }
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.organization_id === orgId);
    return org?.name || '-';
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="users-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Users
            </h1>
            <p className="text-gray-400">Manage users and their access permissions</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingUser(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#2979FF] hover:bg-[#2962FF]" data-testid="add-user-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#161B22] border-[#30363D]">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {editingUser ? 'Edit User' : 'New User'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="bg-[#0B0E14] border-[#30363D]"
                    data-testid="user-name-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@company.com"
                    className="bg-[#0B0E14] border-[#30363D]"
                    data-testid="user-email-input"
                    disabled={!!editingUser}
                    required={!editingUser}
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="bg-[#0B0E14] border-[#30363D]"
                      data-testid="user-password-input"
                      required
                      minLength={6}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="bg-[#0B0E14] border-[#30363D]" data-testid="user-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      <SelectItem value="trainee">Trainee</SelectItem>
                      <SelectItem value="media_manager">Media Manager</SelectItem>
                      <SelectItem value="org_admin">Organization Admin</SelectItem>
                      {currentUser?.role === 'super_admin' && (
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select
                    value={formData.organization_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, organization_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="bg-[#0B0E14] border-[#30363D]" data-testid="user-org-select">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B22] border-[#30363D]">
                      <SelectItem value="none">No Organization</SelectItem>
                      {organizations.map(org => (
                        <SelectItem key={org.organization_id} value={org.organization_id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1 border-[#30363D]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#2979FF] hover:bg-[#2962FF]"
                    disabled={submitting}
                    data-testid="user-submit-btn"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingUser ? 'Update' : 'Create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#161B22] border-[#30363D]"
              data-testid="search-users-input"
            />
          </div>
          <Select value={filterOrg} onValueChange={setFilterOrg}>
            <SelectTrigger className="w-full sm:w-[200px] bg-[#161B22] border-[#30363D]">
              <Building2 className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by org" />
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

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-[#161B22] border border-[#D4A836]/30 rounded-lg">
            <span className="text-[#E8DDB5]">{selectedUsers.length} user(s) selected</span>
            <Button
              onClick={() => setShowBulkDeleteConfirm(true)}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
            <Button
              onClick={() => setSelectedUsers([])}
              variant="outline"
              className="border-[#D4A836]/30"
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Users Table */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No users found</h3>
                <p className="text-gray-400 mb-6">
                  {search || filterOrg !== 'all' ? 'Try adjusting your filters' : 'Create your first user to get started'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#30363D] hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedUsers.length === paginatedUsers.filter(u => u.user_id !== currentUser.user_id).length && paginatedUsers.length > 0}
                        onCheckedChange={selectAllUsers}
                      />
                    </TableHead>
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400">Organization</TableHead>
                    <TableHead className="text-gray-400">Joined</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow 
                      key={user.user_id} 
                      className="border-[#30363D] hover:bg-white/5"
                      data-testid={`user-row-${user.user_id}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.user_id)}
                          onCheckedChange={() => toggleSelectUser(user.user_id)}
                          disabled={user.user_id === currentUser.user_id}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2979FF]/20 flex items-center justify-center overflow-hidden">
                            {user.picture ? (
                              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[#2979FF] font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role === 'super_admin' && <Award className="w-3 h-3 inline mr-1" />}
                          {getRoleLabel(user.role)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {getOrgName(user.organization_id)}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openRoleChange(user)}
                            className="text-gray-400 hover:text-[#D4A836]"
                            disabled={user.user_id === currentUser.user_id}
                            title="Change Role"
                            data-testid={`role-user-${user.user_id}`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(user)}
                            className="text-gray-400 hover:text-white"
                            data-testid={`edit-user-${user.user_id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(user.user_id)}
                            className="text-gray-400 hover:text-[#FF3B30]"
                            disabled={user.user_id === currentUser.user_id}
                            data-testid={`delete-user-${user.user_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Pagination */}
        {!loading && totalUsers > 0 && (
          <div className="mt-6">
            <Pagination
              total={totalUsers}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </div>
        )}

        {/* Role Change Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#D4A836]" />
                Change User Role
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Modify privileges for {roleChangeUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-[#0D1117] rounded-lg">
                <div className="w-10 h-10 rounded-full bg-[#D4A836]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#D4A836]" />
                </div>
                <div>
                  <div className="text-white font-medium">{roleChangeUser?.name}</div>
                  <div className="text-gray-400 text-sm">{roleChangeUser?.email}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Current Role</Label>
                <div className="text-white font-medium">{roleChangeUser?.role?.replace('_', ' ').toUpperCase()}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    <SelectItem value="trainee">Trainee</SelectItem>
                    <SelectItem value="media_manager">Media Manager</SelectItem>
                    <SelectItem value="org_admin">Organization Admin</SelectItem>
                    {currentUser?.role === 'super_admin' && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRoleDialog(false)}
                className="border-[#30363D] text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={changeUserRole}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                disabled={newRole === roleChangeUser?.role}
              >
                Change Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
          <DialogContent className="bg-[#161B22] border-[#30363D]">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Confirm Bulk Delete
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete {selectedUsers.length} user(s)? This action cannot be undone and will remove all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowBulkDeleteConfirm(false)} 
                className="border-[#D4A836]/30 text-[#E8DDB5]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkDelete} 
                className="bg-red-600 hover:bg-red-700"
              >
                Delete {selectedUsers.length} User(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
