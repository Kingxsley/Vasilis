import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  LayoutDashboard, Building2, Users, 
  BookOpen, BarChart3, LogOut, Menu, X, ChevronDown, ChevronRight, Mail, Monitor, Upload, Award, FileText, Settings, Layout, Crosshair, GraduationCap, Cog, ShieldAlert, TrendingUp, Mail as MailIcon, PanelLeftClose, PanelLeft, MessageSquare, Image, Search, ExternalLink, Activity, Wand2, HelpCircle, Key, AlertTriangle
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
    // Navigate to dashboard when logged in (user is in DashboardLayout so they're logged in)
    window.location.href = '/dashboard';
  };

  return (
    <a href="/dashboard" onClick={handleClick} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="logo-home-link">
      {branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain flex-shrink-0" />
      ) : (
        <img src="/favicon.svg" alt="Logo" className="w-8 h-8 object-contain flex-shrink-0" />
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
      { path: '/vulnerable-users', label: 'Vulnerable Users', icon: AlertTriangle, adminOnly: true },
    ]
  },
  {
    id: 'management',
    label: 'Management',
    icon: Building2,
    items: [
      { path: '/organizations', label: 'Organizations', icon: Building2, superAdminOnly: true },
      { path: '/users', label: 'Users', icon: Users, adminOnly: true },
      { path: '/user-import', label: 'Import Users', icon: Upload, adminOnly: true },
      { path: '/inquiries', label: 'Access Requests', icon: MessageSquare, superAdminOnly: true },
    ]
  },
  {
    id: 'simulations',
    label: 'Simulations',
    icon: Crosshair,
    // Available to all admin roles; individual items may restrict further
    adminOnly: true,
    items: [
      { path: '/simulation-builder', label: 'Create Sim', icon: Wand2, superAdminOnly: true },
      { path: '/phishing', label: 'Phishing Sim', icon: Mail, superAdminOnly: true },
      { path: '/ads', label: 'Ad Simulation', icon: Monitor, superAdminOnly: true },
      // Remove the Scenario Manager from the navigation.  Scenario
      // management functionality has been consolidated into the Module
      // Builder and is no longer exposed as a separate menu.
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    contentManager: true, // Only super_admin and media_manager can access
    items: [
      { path: '/content', label: 'CMS', icon: FileText, contentManager: true },
      { path: '/page-builder', label: 'Page Builder', icon: Layout, superAdminOnly: true },
      { path: '/page-editor', label: 'Page Editor', icon: Layout, contentManager: true },
      { path: '/landing-editor', label: 'Landing Page', icon: Layout, contentManager: true },
      { path: '/sidebar-customizer', label: 'Sidebar', icon: Layout, superAdminOnly: true },
      { path: '/media-library', label: 'Media Library', icon: Image, contentManager: true },
    ]
  },
  {
    id: 'training',
    label: 'Training',
    icon: GraduationCap,
    items: [
      { path: '/training', label: 'My Training', icon: BookOpen, adminOnly: false },
      { path: '/question-modules', label: 'Module Designer', icon: Users, adminOnly: true },
      { path: '/module-uploader', label: 'Bulk Upload', icon: Upload, adminOnly: true },
      { path: '/certificates', label: 'Certificates', icon: Award, superAdminOnly: true },
      { path: '/certificate-templates', label: 'Cert Templates', icon: Award, superAdminOnly: true },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Cog,
    superAdminOnly: true, // Only super_admin can access settings
    items: [
      { path: '/settings', label: 'Settings', icon: Settings, superAdminOnly: true },
      { path: '/permissions', label: 'Permissions', icon: ShieldAlert, superAdminOnly: true },
      { path: '/seo-settings', label: 'SEO', icon: Search, superAdminOnly: true },
      { path: '/email-templates', label: 'Email Templates', icon: MailIcon, superAdminOnly: true },
    ]
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldAlert,
    superAdminOnly: true,
    items: [
      { path: '/security', label: 'Dashboard', icon: ShieldAlert, superAdminOnly: true },
      { path: '/audit-logs', label: 'Audit Logs', icon: FileText, superAdminOnly: true },
      { path: '/activity-logs', label: 'Activity Logs', icon: Activity, superAdminOnly: true },
      { path: '/password-policy', label: 'Password Policy', icon: ShieldAlert, superAdminOnly: true },
      // Super admin-only page for configuring global security controls such as 2FA enforcement and session timeouts
      { path: '/security-settings', label: 'Security Settings', icon: Cog, superAdminOnly: true },
    ]
  },
  {
    id: 'help',
    label: 'Help',
    icon: HelpCircle,
    items: [
      // Hide the help/documentation menu from trainees by marking this item as adminOnly.
      { path: '/documentation', label: 'Documentation', icon: BookOpen, adminOnly: true },
    ]
  },

  {
    id: 'account',
    label: 'Account',
    icon: Key,
    items: [
      { path: '/my-security', label: 'Two‑Factor', icon: Key, adminOnly: false }
    ]
  },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin, canManageContent, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // All groups expanded by default to reduce click times
  const [expandedGroups, setExpandedGroups] = useState(['main', 'simulations', 'content', 'training', 'settings', 'management', 'security', 'account']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customNavItems, setCustomNavItems] = useState([]);

  // Ref for the navigation container.  We use this to persist the scroll
  // position across route changes so that the sidebar doesn't jump back to
  // the top whenever a navigation item is clicked.  Scroll position is
  // saved in sessionStorage under the key 'navScrollTop'.
  const navRef = useRef(null);

  useEffect(() => {
    // Restore scroll position when the component mounts
    const savedScroll = sessionStorage.getItem('navScrollTop');
    if (navRef.current && savedScroll) {
      navRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  const handleNavScroll = (e) => {
    sessionStorage.setItem('navScrollTop', e.target.scrollTop);
  };

  // Fetch custom navigation items
  useEffect(() => {
    const fetchCustomNav = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API}/navigation/public`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomNavItems(res.data.items || []);
      } catch (error) {
        console.error('Failed to fetch custom nav items:', error);
      }
    };
    fetchCustomNav();
  }, [token]);

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

  // Get custom items for a section
  const getCustomItemsForSection = (sectionId) => {
    return customNavItems
      .filter(item => item.section_id === sectionId && item.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  // Filter items based on user role
  const filterItems = (items) => {
    return items.filter(item => {
      // Hide the trainee training route for admin users.  Admins should use the
      // module builder instead.  The Create Training link is marked adminOnly.
      if (isAdmin && item.path === '/training') {
        return false;
      }
      if (item.superAdminOnly) return user?.role === 'super_admin';
      if (item.contentManager) return canManageContent || user?.role === 'super_admin' || user?.role === 'media_manager';
      if (item.adminOnly) return isAdmin;
      return true;
    });
  };

  // Check if group should be visible based on role
  const isGroupVisible = (group) => {
    if (group.superAdminOnly && user?.role !== 'super_admin') return false;
    if (group.contentManager && !canManageContent && user?.role !== 'super_admin' && user?.role !== 'media_manager') return false;
    const filteredItems = filterItems(group.items);
    const customItems = getCustomItemsForSection(group.id);
    return filteredItems.length > 0 || customItems.length > 0;
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
        <nav
          ref={navRef}
          className="flex-1 p-2 overflow-y-auto"
          onScroll={handleNavScroll}
        >
          {navGroups.map((group) => {
            if (!isGroupVisible(group)) return null;
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
                    {/* Custom navigation items for this section */}
                    {getCustomItemsForSection(group.id).map((item) => {
                      const isItemActive = location.pathname === item.path;
                      const isExternal = item.link_type === 'external';
                      
                      if (isExternal) {
                        return (
                          <a
                            key={item.item_id}
                            href={item.path}
                            target={item.open_in_new_tab ? '_blank' : '_self'}
                            rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 border-l-2 border-transparent"
                            data-testid={`nav-custom-${item.item_id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-sm">{item.label}</span>
                          </a>
                        );
                      }
                      
                      return (
                        <Link
                          key={item.item_id}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isItemActive 
                              ? 'bg-[#D4A836]/10 text-[#D4A836] border-l-2 border-[#D4A836]' 
                              : 'text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 border-l-2 border-transparent'
                          }`}
                          data-testid={`nav-custom-${item.item_id}`}
                        >
                          <FileText className="w-4 h-4" />
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
      <main className={`${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} pt-16 lg:pt-0 min-h-screen transition-all bg-[#0D1117]`}>
        {children}
      </main>
    </div>
  );
};
