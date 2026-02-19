import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';

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
        /* Professional mini shield icon when no logo is uploaded */
        <svg viewBox="0 0 100 100" className="w-8 h-8">
          <defs>
            <linearGradient id="pubNavShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A836" />
              <stop offset="100%" stopColor="#C49A30" />
            </linearGradient>
          </defs>
          <path 
            d="M50 5 L90 20 L90 50 C90 75 70 90 50 95 C30 90 10 75 10 50 L10 20 Z" 
            fill="url(#pubNavShieldGrad)" 
          />
          <rect x="38" y="42" width="24" height="20" rx="3" fill="#0a0a0f" opacity="0.9" />
          <path d="M42 42 L42 35 C42 30 46 26 50 26 C54 26 58 30 58 35 L58 42" 
                stroke="#0a0a0f" strokeWidth="4" fill="none" opacity="0.9" />
          <circle cx="50" cy="52" r="3" fill="#D4A836" />
          <rect x="49" y="52" width="2" height="6" fill="#D4A836" />
        </svg>
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
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  
  // Prevent flash by waiting for mount and branding
  useEffect(() => {
    // Small delay to ensure branding is loaded
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);
  
  const textColor = branding?.text_color || '#E8DDB5';
  const primaryColor = branding?.primary_color || '#D4A836';
  
  // Navigation visibility - default to false until loaded to prevent flash
  const isReady = mounted && !isLoading;
  const showBlog = isReady && branding?.show_blog !== false;
  const showVideos = isReady && branding?.show_videos !== false;
  const showNews = isReady && branding?.show_news !== false;
  const showAbout = isReady && branding?.show_about !== false;
  
  // Build visible nav items (exclude current page)
  const allNavItems = [
    showBlog && { to: '/blog', label: 'Blog' },
    showVideos && { to: '/videos', label: 'Videos' },
    showNews && { to: '/news', label: 'News' },
    showAbout && { to: '/about', label: 'About' },
  ].filter(Boolean);
  
  // Filter out current page from nav
  const navItems = allNavItems.filter(item => !location.pathname.startsWith(item.to));

  return (
    <header className="border-b" style={{ borderColor: `${primaryColor}15` }}>
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          <Logo branding={branding} isLoading={isLoading || !mounted} />
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {isReady && navItems.map((item) => (
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
            {/* Only show hamburger menu after branding is loaded AND there are nav items */}
            {isReady && navItems.length > 0 && (
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
        {mobileMenuOpen && isReady && (
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
