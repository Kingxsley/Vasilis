import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  LayoutDashboard, Building2, Users, 
  BookOpen, BarChart3, LogOut, Menu, X, ChevronDown, ChevronRight, Mail, Monitor, Upload, Award, FileText, Settings, Layout, Crosshair, GraduationCap, Cog, ShieldAlert, TrendingUp, Mail as MailIcon, PanelLeftClose, PanelLeft, MessageSquare
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

// Logo Component - shows logo directly without loading skeleton
const Logo = ({ collapsed = false }) => {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    axios.get(`${API}/settings/branding`)
      .then(res => setBranding(res.data))
      .catch(() => {});
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    window.location.href = '/';
  };

  return (
    <a href="/" onClick={handleClick} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="logo-home-link">
      {branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain flex-shrink-0" />
      ) : (
        /* Professional mini shield icon when no logo is uploaded */
        <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
          <defs>
            <linearGradient id="dashShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A836" />
              <stop offset="100%" stopColor="#C49A30" />
            </linearGradient>
          </defs>
          <path 
            d="M50 5 L90 20 L90 50 C90 75 70 90 50 95 C30 90 10 75 10 50 L10 20 Z" 
            fill="url(#dashShieldGrad)" 
          />
          <rect x="38" y="42" width="24" height="20" rx="3" fill="#0a0a0f" opacity="0.9" />
          <path d="M42 42 L42 35 C42 30 46 26 50 26 C54 26 58 30 58 35 L58 42" 
                stroke="#0a0a0f" strokeWidth="4" fill="none" opacity="0.9" />
          <circle cx="50" cy="52" r="3" fill="#D4A836" />
          <rect x="49" y="52" width="2" height="6" fill="#D4A836" />
        </svg>
      )}
      {!collapsed && (
        <span className="text-lg font-bold text-[#E8DDB5] truncate" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {branding?.company_name || 'Vasilis NetShield'}
        </span>
      )}
    </a>
  );
};

// Navigation structure with groups
const navGroups = [
  {
    id: 'main',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
      { path: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
      { path: '/advanced-analytics', label: 'Advanced Analytics', icon: TrendingUp, adminOnly: true },
    ]
  },
  {
    id: 'management',
    label: 'Management',
    icon: Building2,
    items: [
      { path: '/organizations', label: 'Organizations', icon: Building2, adminOnly: true },
      { path: '/users', label: 'Users', icon: Users, adminOnly: true },
      { path: '/user-import', label: 'Import Users', icon: Upload, adminOnly: true },
      { path: '/inquiries', label: 'Access Requests', icon: MessageSquare, adminOnly: true },
    ]
  },
  {
    id: 'simulations',
    label: 'Simulations',
    icon: Crosshair,
    items: [
      { path: '/phishing', label: 'Phishing Sim', icon: Mail, adminOnly: true },
      { path: '/ads', label: 'Ad Simulation', icon: Monitor, adminOnly: true },
      { path: '/scenarios', label: 'Scenarios', icon: FileText, adminOnly: true },
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    items: [
      { path: '/content', label: 'CMS', icon: FileText, contentManager: true },
      { path: '/page-editor', label: 'Page Editor', icon: Layout, adminOnly: true },
      { path: '/landing-editor', label: 'Landing Page', icon: Layout, adminOnly: true },
      { path: '/media-library', label: 'Media Library', icon: Image, adminOnly: true },
    ]
  },
  {
    id: 'training',
    label: 'Training',
    icon: GraduationCap,
    items: [
      { path: '/training', label: 'My Training', icon: BookOpen, adminOnly: false },
      { path: '/certificates', label: 'Certificates', icon: Award, adminOnly: false },
      { path: '/certificate-templates', label: 'Cert Templates', icon: Award, adminOnly: true },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Cog,
    items: [
      { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
      { path: '/email-templates', label: 'Email Templates', icon: MailIcon, adminOnly: true },
      { path: '/security', label: 'Security', icon: ShieldAlert, adminOnly: true },
    ]
  },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin, canManageContent } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(['main', 'simulations', 'training']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Filter items based on user role
  const filterItems = (items) => {
    return items.filter(item => {
      if (item.contentManager) return canManageContent;
      if (item.adminOnly) return isAdmin;
      return true;
    });
  };

  // Check if current path is in a group
  const isGroupActive = (group) => {
    return group.items.some(item => location.pathname === item.path);
  };

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
        className={`fixed top-0 left-0 z-40 h-full ${sidebarCollapsed ? 'w-16' : 'w-64'} sidebar-bg border-r border-[#D4A836]/20 transform transition-all lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#D4A836]/20 flex-shrink-0">
          <Logo collapsed={sidebarCollapsed} />
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block p-1.5 text-gray-500 hover:text-[#E8DDB5] hover:bg-white/5 rounded transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {navGroups.map((group) => {
            const filteredItems = filterItems(group.items);
            if (filteredItems.length === 0) return null;
            
            const isExpanded = expandedGroups.includes(group.id);
            const isActive = isGroupActive(group);
            const GroupIcon = group.icon;

            // If collapsed sidebar, show only icons
            if (sidebarCollapsed) {
              return (
                <div key={group.id} className="mb-1">
                  {filteredItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isItemActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        title={item.label}
                        className={`flex items-center justify-center p-3 rounded-lg transition-colors mb-1 ${
                          isItemActive 
                            ? 'bg-[#D4A836]/10 text-[#D4A836]' 
                            : 'text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5'
                        }`}
                      >
                        <ItemIcon className="w-5 h-5" />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.id} className="mb-2">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-[#D4A836]' : 'text-gray-500 hover:text-[#E8DDB5]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">{group.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                </button>

                {/* Group Items */}
                {isExpanded && (
                  <div className="mt-1 ml-2 space-y-1">
                    {filteredItems.map((item) => {
                      const isItemActive = location.pathname === item.path;
                      const ItemIcon = item.icon;
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isItemActive 
                              ? 'bg-[#D4A836]/10 text-[#D4A836] border-l-2 border-[#D4A836]' 
                              : 'text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 border-l-2 border-transparent'
                          }`}
                          data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                        >
                          <ItemIcon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="flex-shrink-0 p-3 border-t border-[#D4A836]/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                data-testid="user-menu-btn"
              >
                <div className="w-9 h-9 rounded-full bg-[#D4A836]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#D4A836] font-semibold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-[#E8DDB5] truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize truncate">{user?.role?.replace('_', ' ')}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  </>
                )}
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
      <main className={`${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} pt-16 lg:pt-0 min-h-screen transition-all`}>
        {children}
      </main>
    </div>
  );
};
