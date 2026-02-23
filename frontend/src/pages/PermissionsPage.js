import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { toast } from 'sonner';
import axios from 'axios';
import { Shield, Users, Search, ChevronRight, Check, Loader2, AlertTriangle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PermissionsPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({ grants: [], revokes: [] });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/permissions/roles`, { headers }),
        axios.get(`${API}/permissions/available`, { headers })
      ]);
      
      // Handle both array response and object with users property
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || []);
      setUsers(usersData);
      setAvailableRoles(rolesRes.data.assignable_roles || []);
      setAvailablePermissions(permsRes.data.permission_groups || {});
    } catch (err) {
      toast.error('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setPendingChanges({ grants: [], revokes: [] });
    setUserPermissions(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API}/permissions/user/${user.user_id}`, { headers });
      setUserPermissions(res.data);
      setDialogOpen(true);
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      toast.error(err.response?.data?.detail || 'Failed to load user permissions');
      // Still open dialog with basic info
      setUserPermissions({
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role,
        role_permissions: [],
        custom_grants: [],
        denied_permissions: [],
        effective_permissions: []
      });
      setDialogOpen(true);
    }
  };

  const updateRole = async (newRole) => {
    if (!selectedUser) return;
    
    try {
      setSaving(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API}/permissions/role`, {
        user_id: selectedUser.user_id,
        role: newRole
      }, { headers });
      
      toast.success(`Role updated to ${newRole}`);
      
      // Refresh permissions
      const res = await axios.get(`${API}/permissions/user/${selectedUser.user_id}`, { headers });
      setUserPermissions(res.data);
      
      // Update user in list
      setUsers(users.map(u => 
        u.user_id === selectedUser.user_id ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionId, isGranted) => {
    if (isGranted) {
      // Add to revokes, remove from grants
      setPendingChanges(prev => ({
        grants: prev.grants.filter(p => p !== permissionId),
        revokes: [...prev.revokes.filter(p => p !== permissionId), permissionId]
      }));
    } else {
      // Add to grants, remove from revokes
      setPendingChanges(prev => ({
        grants: [...prev.grants.filter(p => p !== permissionId), permissionId],
        revokes: prev.revokes.filter(p => p !== permissionId)
      }));
    }
  };

  const isPermissionPending = (permissionId) => {
    return pendingChanges.grants.includes(permissionId) || pendingChanges.revokes.includes(permissionId);
  };

  const getEffectivePermissionState = (permissionId) => {
    if (pendingChanges.grants.includes(permissionId)) return true;
    if (pendingChanges.revokes.includes(permissionId)) return false;
    return userPermissions?.effective_permissions?.includes(permissionId);
  };

  const savePermissionChanges = async () => {
    if (!selectedUser) return;
    if (pendingChanges.grants.length === 0 && pendingChanges.revokes.length === 0) {
      toast.info('No changes to save');
      return;
    }
    
    try {
      setSaving(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      // Apply grants
      if (pendingChanges.grants.length > 0) {
        await axios.post(`${API}/permissions/bulk`, {
          user_id: selectedUser.user_id,
          permissions: pendingChanges.grants,
          action: 'grant'
        }, { headers });
      }
      
      // Apply revokes
      if (pendingChanges.revokes.length > 0) {
        await axios.post(`${API}/permissions/bulk`, {
          user_id: selectedUser.user_id,
          permissions: pendingChanges.revokes,
          action: 'revoke'
        }, { headers });
      }
      
      toast.success('Permissions updated');
      setPendingChanges({ grants: [], revokes: [] });
      
      // Refresh permissions
      const res = await axios.get(`${API}/permissions/user/${selectedUser.user_id}`, { headers });
      setUserPermissions(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'org_admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'media_manager': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'trainee': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const hasUnsavedChanges = pendingChanges.grants.length > 0 || pendingChanges.revokes.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Permission Management
            </h1>
            <p className="text-gray-400 mt-1">Manage user roles and access permissions</p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-[#1a1a24] border-[#D4A836]/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D4A836] mt-0.5" />
              <div className="text-sm">
                <p className="text-[#D4A836] font-medium">Role-Based Access Control</p>
                <p className="text-gray-400 mt-1">
                  {currentUser?.role === 'super_admin' 
                    ? 'As a Super Admin, you can assign any role and permission to any user.'
                    : 'As an Organization Admin, you can only manage users within your organization.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Users ({filteredUsers.length})
                </CardTitle>
                <CardDescription>Select a user to manage their permissions</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-[#0D1117] border-[#30363D]"
                  data-testid="permissions-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#D4A836]" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">
                  {search ? 'No users match your search' : 'No users found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    onClick={() => selectUser(user)}
                    className="flex items-center justify-between p-4 rounded-lg bg-[#0D1117] border border-[#30363D] hover:border-[#D4A836]/50 cursor-pointer transition-colors"
                    data-testid={`permission-user-${user.user_id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#D4A836]/20 flex items-center justify-center text-[#D4A836] font-medium flex-shrink-0">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{user.name}</p>
                        <p className="text-gray-400 text-sm truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role?.replace('_', ' ')}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#161B22] border-[#30363D] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D4A836]" />
              Manage Permissions: {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Configure role and granular permissions for this user
            </DialogDescription>
          </DialogHeader>

          {userPermissions && (
            <div className="space-y-6 py-4">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-white">User Role</Label>
                <Select 
                  value={userPermissions.role} 
                  onValueChange={updateRole}
                  disabled={saving}
                >
                  <SelectTrigger className="bg-[#0D1117] border-[#30363D]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#30363D]">
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <span>{role.name}</span>
                          <span className="text-gray-500 text-xs">- {role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Changing the role will update the user's default permissions
                </p>
              </div>

              {/* Permission Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-white">Custom Permissions</Label>
                  {hasUnsavedChanges && (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      {pendingChanges.grants.length + pendingChanges.revokes.length} unsaved changes
                    </Badge>
                  )}
                </div>
                
                {Object.entries(availablePermissions).map(([groupName, permissions]) => (
                  <Card key={groupName} className="bg-[#0D1117] border-[#30363D]">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-gray-300">{groupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {permissions.map((perm) => {
                          const isGranted = getEffectivePermissionState(perm.id);
                          const isPending = isPermissionPending(perm.id);
                          
                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id, isGranted)}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                isPending 
                                  ? 'bg-[#D4A836]/10 border border-[#D4A836]/30' 
                                  : 'hover:bg-[#161B22]'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center ${
                                isGranted 
                                  ? 'bg-green-500' 
                                  : 'bg-[#30363D] border border-[#484F58]'
                              }`}>
                                {isGranted && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-white">{perm.name}</p>
                                <p className="text-xs text-gray-500">{perm.description}</p>
                              </div>
                              {isPending && (
                                <Badge className="bg-[#D4A836]/20 text-[#D4A836] text-xs">
                                  Modified
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPendingChanges({ grants: [], revokes: [] });
                setDialogOpen(false);
              }}
              className="border-[#30363D]"
            >
              Cancel
            </Button>
            <Button
              onClick={savePermissionChanges}
              disabled={saving || !hasUnsavedChanges}
              className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
