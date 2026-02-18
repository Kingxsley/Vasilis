import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  LayoutDashboard, Building2, Users, Target, 
  BookOpen, BarChart3, LogOut, Menu, X, ChevronDown, Mail, Monitor, Upload, Award, Shield, FileText, Settings, Layout
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Logo Component - fetches custom logo from settings
const Logo = ({ className = "h-8" }) => {
  const [branding, setBranding] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/branding`)
      .then(res => {
        setBranding(res.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Show placeholder while loading to prevent flickering
  if (!loaded) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-7 h-7 bg-[#D4A836]/20 rounded animate-pulse" />
        <div className="w-28 h-5 bg-[#D4A836]/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" className="w-7 h-7 object-contain" />
      ) : (
        <Shield className="w-7 h-7 text-[#D4A836]" />
      )}
      <span className="text-lg font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
        {branding?.company_name || 'Vasilis NetShield'}
      </span>
    </div>
  );
};

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { path: '/organizations', label: 'Organizations', icon: Building2, adminOnly: true },
  { path: '/users', label: 'Users', icon: Users, adminOnly: true },
  { path: '/user-import', label: 'Import Users', icon: Upload, adminOnly: true },
  { path: '/campaigns', label: 'Campaigns', icon: Target, adminOnly: true },
  { path: '/phishing', label: 'Phishing Sim', icon: Mail, adminOnly: true },
  { path: '/ads', label: 'Ad Simulation', icon: Monitor, adminOnly: true },
  { path: '/scenarios', label: 'Scenarios', icon: FileText, adminOnly: true },
  { path: '/content', label: 'Content', icon: FileText, contentManager: true },
  { path: '/page-editor', label: 'Page Editor', icon: Layout, adminOnly: true },
  { path: '/training', label: 'Training', icon: BookOpen, adminOnly: false },
  { path: '/certificates', label: 'Certificates', icon: Award, adminOnly: false },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin, canManageContent } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (item.contentManager) {
      return canManageContent; // Show to super_admin, org_admin, and media_manager
    }
    if (item.adminOnly) {
      return isAdmin; // Only show to super_admin and org_admin
    }
    return true; // Show to everyone
  });

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-[#D4A836]/20 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <Logo />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-400 hover:text-[#E8DDB5]"
            data-testid="mobile-menu-btn"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-full w-64 sidebar-bg border-r border-[#D4A836]/20 transform transition-transform lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#D4A836]/20 flex-shrink-0">
          <Logo />
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-[#D4A836]/10 text-[#D4A836] border border-[#D4A836]/30' 
                    : 'text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5'
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="flex-shrink-0 p-4 border-t border-[#D4A836]/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                data-testid="user-menu-btn"
              >
                <div className="w-10 h-10 rounded-full bg-[#D4A836]/20 flex items-center justify-center overflow-hidden">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#D4A836] font-semibold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#E8DDB5] truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0f0f15] border-[#D4A836]/20">
              <div className="px-2 py-2">
                <p className="text-sm font-medium text-[#E8DDB5]">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-[#D4A836]/20" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-[#FF3B30] focus:text-[#FF3B30] focus:bg-[#FF3B30]/10 cursor-pointer"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
};
