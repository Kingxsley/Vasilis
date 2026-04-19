import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Trash2, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function GranularPermissionsManager({ userId, token }) {
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  
  // Form state
  const [selectedPermission, setSelectedPermission] = useState('');
  const [accessLevel, setAccessLevel] = useState('read');
  const [expiresIn, setExpiresIn] = useState('never');

  useEffect(() => {
    if (userId && token) {
      fetchData();
    }
  }, [userId, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permsRes, availableRes] = await Promise.all([
        axios.get(`${API}/permissions/granular/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/permissions/granular/available`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setUserPermissions(permsRes.data.permissions || []);
      setAvailablePermissions(availableRes.data.permissions || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const calculateExpiresAt = (expiresIn) => {
    if (expiresIn === 'never') return null;
    
    const now = new Date();
    const hours = parseInt(expiresIn);
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  };

  const handleGrantPermission = async () => {
    if (!selectedPermission || !accessLevel) {
      toast.error('Please select a permission and access level');
      return;
    }

    setGranting(true);
    try {
      const payload = {
        user_id: userId,
        permission: selectedPermission,
        access_level: accessLevel,
        expires_at: calculateExpiresAt(expiresIn)
      };

      await axios.post(`${API}/permissions/granular/grant`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Permission granted');
      
      // Reset form
      setSelectedPermission('');
      setAccessLevel('read');
      setExpiresIn('never');
      
      // Refresh permissions
      fetchData();
    } catch (error) {
      console.error('Failed to grant permission:', error);
      toast.error(error.response?.data?.detail || 'Failed to grant permission');
    } finally {
      setGranting(false);
    }
  };

  const handleRevokePermission = async (permission) => {
    try {
      await axios.delete(`${API}/permissions/granular/revoke`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          user_id: userId,
          permission: permission
        }
      });

      toast.success('Permission revoked');
      fetchData();
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      toast.error('Failed to revoke permission');
    }
  };

  const formatExpiresAt = (expiresAt) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  // Group permissions by category
  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    const category = perm.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#D4A836]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grant New Permission Form */}
      <Card className="bg-[#0D1117] border-[#30363D]">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Feature Permission</Label>
              <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                <SelectTrigger className="bg-[#161B22] border-[#30363D]">
                  <SelectValue placeholder="Select feature..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <optgroup key={category} label={category}>
                      {perms.map((perm) => (
                        <SelectItem key={perm.id} value={perm.id}>
                          {perm.name}
                        </SelectItem>
                      ))}
                    </optgroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Access Level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger className="bg-[#161B22] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read Only</SelectItem>
                  <SelectItem value="write">Write Only</SelectItem>
                  <SelectItem value="both">Read & Write</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Expires In</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className="bg-[#161B22] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never (Permanent)</SelectItem>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="8">8 Hours</SelectItem>
                  <SelectItem value="24">24 Hours</SelectItem>
                  <SelectItem value="72">3 Days</SelectItem>
                  <SelectItem value="168">1 Week</SelectItem>
                  <SelectItem value="720">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGrantPermission}
            disabled={granting || !selectedPermission}
            className="w-full bg-[#D4A836] hover:bg-[#B8922E] text-black"
            size="sm"
          >
            {granting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Granting...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Grant Permission
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Granular Permissions */}
      <div>
        <Label className="text-xs text-gray-400 mb-2 block">Active Temporary Permissions ({userPermissions.length})</Label>
        {userPermissions.length === 0 ? (
          <div className="text-center py-6 bg-[#0D1117] rounded border border-[#30363D]">
            <p className="text-sm text-gray-500">No temporary permissions granted</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userPermissions.map((perm) => {
              const permDetails = availablePermissions.find(p => p.id === perm.permission);
              
              return (
                <div
                  key={perm.permission}
                  className="flex items-center justify-between p-3 bg-[#0D1117] rounded border border-[#30363D]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {permDetails?.name || perm.permission}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          perm.access_level === 'read'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/50'
                            : perm.access_level === 'write'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/50'
                            : 'bg-green-500/10 text-green-400 border-green-500/50'
                        }
                      >
                        {perm.access_level === 'both' ? 'Read & Write' : perm.access_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>Expires: {formatExpiresAt(perm.expires_at)}</span>
                      <span className="mx-1">•</span>
                      <span>Granted: {new Date(perm.granted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevokePermission(perm.permission)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
