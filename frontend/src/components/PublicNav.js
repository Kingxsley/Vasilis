import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Logo Component - shows logo directly without skeleton
const Logo = ({ branding }) => {
  const handleClick = (e) => {
    e.preventDefault();
    window.location.href = '/';
  };

  return (
    <a href="/" onClick={handleClick} className="flex items-center gap-2">
      {branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
      ) : (
        <img src="/favicon.svg" alt="Logo" className="w-8 h-8 object-contain" />
      )}
      <span 
        className="text-xl font-bold" 
        style={{ 
          color: branding?.text_color || '#E8DDB5', 
          fontFamily: 'Chivo, sans-serif'
        }}
      >
        {branding?.company_name || 'Vasilis NetShield'}
      </span>
    </a>
  );
};

export const PublicNav = ({ branding, isLoading = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customPages, setCustomPages] = useState([]);
  const location = useLocation();
  
  const textColor = branding?.text_color || '#E8DDB5';
  const primaryColor = branding?.primary_color || '#D4A836';
  
  // Fetch custom pages that should show in nav
  useEffect(() => {
    const fetchCustomPages = async () => {
      try {
        const res = await axios.get(`${API}/pages/custom`);
        // Only show published pages with show_in_nav = true
        const navPages = (res.data.pages || []).filter(
          p => p.is_published && p.show_in_nav
        );
        setCustomPages(navPages);
      } catch (error) {
        console.error('Failed to fetch custom pages:', error);
      }
    };
    fetchCustomPages();
  }, []);
  
  // Navigation visibility
  const showBlog = branding?.show_blog !== false;
  const showVideos = branding?.show_videos !== false;
  const showNews = branding?.show_news !== false;
  const showAbout = branding?.show_about !== false;
  
  // Build visible nav items (exclude current page)
  const allNavItems = [
    showBlog && { to: '/blog', label: 'Blog' },
    showVideos && { to: '/videos', label: 'Videos' },
    showNews && { to: '/news', label: 'News' },
    showAbout && { to: '/about', label: 'About' },
    // Add custom pages
    ...customPages.map(page => ({
      to: `/page/${page.slug}`,
      label: page.title
    }))
  ].filter(Boolean);
  
  // Filter out current page from nav
  const navItems = allNavItems.filter(item => !location.pathname.startsWith(item.to));

  return (
    <header className="border-b" style={{ borderColor: `${primaryColor}15` }}>
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          <Logo branding={branding} />
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.to}
                to={item.to} 
                className="text-gray-400 hover:opacity-80 transition-colors" 
                style={{ '--hover-color': textColor }}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/auth">
              <Button className="text-black" style={{ backgroundColor: primaryColor }}>Login</Button>
            </Link>
          </nav>
          
          {/* Mobile Navigation Controls */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/auth">
              <Button size="sm" className="text-black" style={{ backgroundColor: primaryColor }}>Login</Button>
            </Link>
            {navItems.length > 0 && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-400 hover:text-[#E8DDB5]"
                data-testid="public-nav-mobile-toggle"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t mt-4" style={{ borderColor: `${primaryColor}20` }}>
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
