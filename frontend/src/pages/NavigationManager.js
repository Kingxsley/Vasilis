import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Menu, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NavigationManager() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNavItems();
  }, []);

  const fetchNavItems = async () => {
    try {
      const res = await axios.get(`${API}/navigation/public`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.items || []);
    } catch (error) {
      console.error('Failed to load navigation:', error);
      toast.error('Failed to load navigation items');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-gray-400">Access denied. Super admin only.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8DDB5]">Navigation Menu</h1>
            <p className="text-gray-400">Manage navigation menu items and ordering</p>
          </div>
          <Button className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
            <Menu className="w-4 h-4 mr-2" />
            Add Custom Item
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
          </div>
        ) : (
          <Card className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardHeader>
              <CardTitle className="text-[#E8DDB5]">Navigation Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-center justify-between p-4 bg-[#1a1a24] border border-[#30363D] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Menu className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-[#E8DDB5] font-medium">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.path}</p>
                      </div>
                      {item.is_dynamic_page && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Page</span>
                      )}
                      {item.is_auto_generated && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Auto</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.is_active ? (
                        <Eye className="w-4 h-4 text-green-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-[#1a1a24]/50 border border-[#30363D] rounded-lg">
                <p className="text-sm text-gray-400">
                  <strong className="text-[#E8DDB5]">Navigation is dynamic:</strong> Items marked as "Page" are automatically generated from published pages with "Show in Navigation" enabled. Items marked as "Auto" are system-generated (like Blog when posts exist).
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
