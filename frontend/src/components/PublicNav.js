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
    <a href="/" onClick={handleClick} className="flex items-center gap-2" data-testid="public-nav-logo">
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

export const PublicNav = ({ branding }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const textColor = branding?.text_color || '#E8DDB5';
  const primaryColor = branding?.primary_color || '#D4A836';

  // Default nav items shown immediately — replaced by API data when ready
  const DEFAULT_NAV_ITEMS = [
    { item_id: 'blog', label: 'Blog', path: '/blog', link_type: 'internal', is_active: true, sort_order: 1 },
  ];

  // Load from cache immediately, fetch in background
  const [navItems, setNavItems] = useState(() => {
    try {
      const cached = localStorage.getItem('vns_nav_cache');
      if (cached) {
        const { items, ts } = JSON.parse(cached);
        // Use cached items regardless of age — always refresh in background
        if (items && items.length > 0) return items;
      }
    } catch (_) {}
    return DEFAULT_NAV_ITEMS;
  });

  // Fetch fresh nav items in the background — debounced to avoid double-fetching
  useEffect(() => {
    const CACHE_KEY = 'vns_nav_cache';
    // Check cache age — skip fetch if fresh (< 60s)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts } = JSON.parse(cached);
        if (Date.now() - ts < 60_000) return; // Cache is fresh, skip fetch
      }
    } catch (_) {}

    const fetchNav = async () => {
      try {
        const res = await axios.get(`${API}/navigation/public`);
        const items = (res.data?.items || [])
          .filter((i) => i.is_active !== false)
          .filter((i) => (i.section_id || 'header') === 'header')
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        if (items.length > 0) {
          setNavItems(items);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() }));
          } catch (_) {}
        }
      } catch (error) {
        // Silently fail — default items already shown
      }
    };
    fetchNav();
  }, []);

  // Hide the current-page link from the nav (reduces UI noise)
  const visibleItems = navItems.filter(
    (item) => !item.path || item.path !== location.pathname
  );

  return (
    <header className="border-b" style={{ borderColor: `${primaryColor}15` }} data-testid="public-nav-header">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          <Logo branding={branding} />

          {/* Desktop Navigation — rendered to the LEFT of the Login button */}
          <nav className="hidden md:flex items-center gap-6" data-testid="public-nav-desktop">
            {visibleItems.map((item) => {
              const isExternal = item.link_type === 'external';
              if (isExternal) {
                return (
                  <a
                    key={item.item_id || item.path}
                    href={item.path}
                    target={item.open_in_new_tab ? '_blank' : '_self'}
                    rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                    className="text-gray-400 hover:opacity-80 transition-colors"
                    style={{ '--hover-color': textColor }}
                    data-testid={`public-nav-link-${(item.label || '').toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.item_id || item.path}
                  to={item.path || '/'}
                  className="text-gray-400 hover:opacity-80 transition-colors"
                  style={{ '--hover-color': textColor }}
                  data-testid={`public-nav-link-${(item.label || '').toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link to="/auth" data-testid="public-nav-login-btn">
              <Button className="text-black" style={{ backgroundColor: primaryColor }}>Login</Button>
            </Link>
          </nav>

          {/* Mobile Navigation Controls */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/auth">
              <Button size="sm" className="text-black" style={{ backgroundColor: primaryColor }} data-testid="public-nav-login-btn-mobile">Login</Button>
            </Link>
            {visibleItems.length > 0 && (
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
          <div className="md:hidden py-4 border-t mt-4" style={{ borderColor: `${primaryColor}20` }} data-testid="public-nav-mobile-menu">
            <div className="flex flex-col gap-2">
              {visibleItems.map((item) => {
                const isExternal = item.link_type === 'external';
                if (isExternal) {
                  return (
                    <a
                      key={item.item_id || item.path}
                      href={item.path}
                      target={item.open_in_new_tab ? '_blank' : '_self'}
                      rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.item_id || item.path}
                    to={item.path || '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-gray-400 hover:text-[#E8DDB5] hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
