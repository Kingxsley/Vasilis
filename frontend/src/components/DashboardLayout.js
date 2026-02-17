import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  LayoutDashboard, Building2, Users, Target, 
  BookOpen, BarChart3, LogOut, Menu, X, ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

// Brand Assets
const LOGO_HORIZONTAL = "https://customer-assets.emergentagent.com/job_cyber-sim-hub/artifacts/ff859qpf_logo-horizontal-transparent.png";

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { path: '/organizations', label: 'Organizations', icon: Building2, adminOnly: true },
  { path: '/users', label: 'Users', icon: Users, adminOnly: true },
  { path: '/campaigns', label: 'Campaigns', icon: Target, adminOnly: true },
  { path: '/training', label: 'Training', icon: BookOpen, adminOnly: false },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-[#1A5653]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-[#2A7370] h-16">
        <div className="flex items-center justify-between h-full px-4">
          <img 
            src={LOGO_HORIZONTAL} 
            alt="Vasilis NetShield" 
            className="h-8"
          />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-[#B8C4B8] hover:text-[#E8DDB5]"
            data-testid="mobile-menu-btn"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-[#1F6360] border-r border-[#2A7370] transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#2A7370]">
          <img 
            src={LOGO_HORIZONTAL} 
            alt="Vasilis NetShield" 
            className="h-8"
          />
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
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
                    : 'text-[#B8C4B8] hover:text-[#E8DDB5] hover:bg-white/5'
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2A7370]">
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
                  <p className="text-xs text-[#7A9A8A] capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-[#7A9A8A]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1F6360] border-[#2A7370]">
              <div className="px-2 py-2">
                <p className="text-sm font-medium text-[#E8DDB5]">{user?.name}</p>
                <p className="text-xs text-[#7A9A8A]">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-[#2A7370]" />
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
