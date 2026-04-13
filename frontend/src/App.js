import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { GoogleAnalytics } from './components/common/GoogleAnalytics';
import axios from 'axios';

// Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios
axios.defaults.withCredentials = true;

// Favicon Hook - applies custom favicon from settings
const useFavicon = () => {
  useEffect(() => {
    const applyFavicon = (faviconUrl) => {
      // Remove all existing favicons
      const existingFavicons = document.querySelectorAll("link[rel*='icon']");
      existingFavicons.forEach(el => el.remove());
      
      if (!faviconUrl) return;
      
      // Create new favicon link with type
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = faviconUrl.startsWith('data:image/png') ? 'image/png' : 
                  faviconUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 
                  faviconUrl.startsWith('data:image/x-icon') ? 'image/x-icon' : 'image/png';
      link.href = faviconUrl;
      document.head.appendChild(link);
      
      // Create shortcut icon for older browsers
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.href = faviconUrl;
      document.head.appendChild(shortcutLink);
      
      // Also update apple-touch-icon
      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = faviconUrl;
      document.head.appendChild(appleLink);
    };

    const loadFavicon = async () => {
      // First, try to apply cached favicon to prevent flash
      const cachedFavicon = localStorage.getItem('app_favicon_url');
      if (cachedFavicon) {
        applyFavicon(cachedFavicon);
      }
      
      try {
        const response = await axios.get(`${API}/settings/branding`);
        const faviconUrl = response.data?.favicon_url;
        
        if (faviconUrl) {
          // Cache for future visits
          localStorage.setItem('app_favicon_url', faviconUrl);
          // Only re-apply if different from cached
          if (faviconUrl !== cachedFavicon) {
            applyFavicon(faviconUrl);
          }
        } else {
          // No custom favicon set - use the default SVG favicon
          localStorage.removeItem('app_favicon_url');
          applyFavicon('/favicon.svg');
        }
      } catch (error) {
        // Silently fail - keep cached favicon if available
      }
    };
    
    loadFavicon();
  }, []);
};

// Auth Provider with automatic token refresh
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef(null);

  // Decode JWT to get expiration time
  const getTokenExpiration = (tokenStr) => {
    try {
      const payload = JSON.parse(atob(tokenStr.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch {
      return null;
    }
  };

  // Refresh the token
  const refreshToken = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      const response = await axios.post(`${API}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      // Schedule next refresh
      scheduleTokenRefresh(newToken);
      
      return newToken;
    } catch (err) {
      // If refresh fails, logout
      console.error('Token refresh failed:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return null;
    }
  };

  // Schedule automatic token refresh (5 minutes before expiration)
  const scheduleTokenRefresh = (tokenStr) => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearTimeout(refreshIntervalRef.current);
    }

    const expiration = getTokenExpiration(tokenStr);
    if (!expiration) return;

    const now = Date.now();
    const timeUntilExpiry = expiration - now;
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000); // 5 minutes before expiry

    if (refreshTime > 0) {
      refreshIntervalRef.current = setTimeout(() => {
        refreshToken();
      }, refreshTime);
    } else if (timeUntilExpiry > 0) {
      // Token expires in less than 5 minutes, refresh immediately
      refreshToken();
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
  }, []);

  const checkAuth = async () => {
    try {
      if (token) {
        // Check if token is expired or about to expire
        const expiration = getTokenExpiration(token);
        const now = Date.now();
        
        if (expiration && expiration - now < 5 * 60 * 1000) {
          // Token expires in less than 5 minutes, try to refresh
          const newToken = await refreshToken();
          if (!newToken) {
            setLoading(false);
            return;
          }
        }
        
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
        
        // Schedule token refresh
        scheduleTokenRefresh(token);
      }
    } catch (err) {
      // Try to refresh if auth check fails (might be expired token)
      const newToken = await refreshToken();
      if (!newToken) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, twoFactorCode) => {
    const payload = { email, password };
    // Include two-factor code only if provided
    if (twoFactorCode) {
      payload.two_factor_code = twoFactorCode;
    }
    const response = await axios.post(`${API}/auth/login`, payload);
    
    // Check if 2FA is required (no token returned yet)
    if (response.data.requires_2fa) {
      return {
        requires_2fa: true,
        email: response.data.email,
        user_id: response.data.user_id
      };
    }
    
    const { token: newToken, user: userData, requires_2fa_verification, two_factor_enabled } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser({
      ...userData,
      requires_2fa_verification,
      two_factor_enabled
    });
    // Schedule automatic token refresh
    scheduleTokenRefresh(newToken);
    return {
      ...userData,
      requires_2fa_verification,
      two_factor_enabled
    };
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    // Schedule automatic token refresh
    scheduleTokenRefresh(newToken);
    return userData;
  };

  const logout = async () => {
    // Clear refresh timer
    if (refreshIntervalRef.current) {
      clearTimeout(refreshIntervalRef.current);
    }
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const setUserData = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    setUserData,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'super_admin' || user?.role === 'org_admin',
    isMediaManager: user?.role === 'media_manager',
    canManageContent: user?.role === 'super_admin' || user?.role === 'media_manager'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Lazy load pages
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Organizations = React.lazy(() => import('./pages/Organizations'));
const Users = React.lazy(() => import('./pages/Users'));
const Campaigns = React.lazy(() => import('./pages/Campaigns'));
const TrainingModules = React.lazy(() => import('./pages/TrainingModules'));
const TrainingSession = React.lazy(() => import('./pages/TrainingSession'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const PhishingSimulations = React.lazy(() => import('./pages/PhishingSimulations'));
const AdSimulations = React.lazy(() => import('./pages/AdSimulations'));
const UserImport = React.lazy(() => import('./pages/UserImport'));
const Certificates = React.lazy(() => import('./pages/Certificates'));
const ScenarioManager = React.lazy(() => import('./pages/ScenarioManager'));
const ModuleBuilder = React.lazy(() => import('./pages/ModuleBuilder'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ContentManager = React.lazy(() => import('./pages/ContentManager'));
const PageEditor = React.lazy(() => import('./pages/PageEditor'));
const PageBuilder = React.lazy(() => import('./pages/PageBuilder'));
const SecurityDashboard = React.lazy(() => import('./pages/SecurityDashboard'));
const EmailTemplates = React.lazy(() => import('./pages/EmailTemplates'));
const SystemEmailTemplates = React.lazy(() => import('./pages/SystemEmailTemplates'));
const AdvancedAnalytics = React.lazy(() => import('./pages/AdvancedAnalytics'));
const CertificateTemplates = React.lazy(() => import('./pages/CertificateTemplates'));
const LandingPageEditor = React.lazy(() => import('./pages/LandingPageEditor'));
// Hub pages - merged views
const AnalyticsHub = React.lazy(() => import('./pages/AnalyticsHub'));
const SecurityHub = React.lazy(() => import('./pages/SecurityHub'));
const CertificatesHub = React.lazy(() => import('./pages/CertificatesHub'));
// Public CMS Page renderer
const PublicCmsPage = React.lazy(() => import('./pages/PublicCmsPage'));
const Inquiries = React.lazy(() => import('./pages/Inquiries'));
const AdTracker = React.lazy(() => import('./pages/AdTracker'));
const BlogListPage = React.lazy(() => import('./pages/Blog').then(m => ({ default: m.BlogList })));
const BlogPostPage = React.lazy(() => import('./pages/Blog').then(m => ({ default: m.BlogPost })));
const VideosPage = React.lazy(() => import('./pages/VideosPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const NewsPage = React.lazy(() => import('./pages/NewsPage'));
const MediaLibrary = React.lazy(() => import('./pages/MediaLibrary'));
const SEOSettings = React.lazy(() => import('./pages/SEOSettings'));
const SidebarCustomizer = React.lazy(() => import('./pages/SidebarCustomizer'));
const PermissionsPage = React.lazy(() => import('./pages/PermissionsPage'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const PasswordPolicyPage = React.lazy(() => import('./pages/PasswordPolicyPage'));
const CustomPage = React.lazy(() => import('./pages/CustomPage'));
const CMSTilePage = React.lazy(() => import('./pages/CMSTilePage'));
const ActivityLogs = React.lazy(() => import('./pages/ActivityLogs'));
const SimulationBuilder = React.lazy(() => import('./pages/SimulationBuilder'));
const Documentation = React.lazy(() => import('./pages/Documentation'));
const SecuritySettings = React.lazy(() => import('./pages/SecuritySettings'));
// MySecurity page for trainees to manage two‑factor authentication
const MySecurity = React.lazy(() => import('./pages/MySecurity'));
// QuestionModuleDesigner page for creating modules and questions in a single step
const QuestionModuleDesigner = React.lazy(() => import('./pages/QuestionModuleDesigner'));
// VulnerableUsers page for tracking users who clicked phishing links
const VulnerableUsers = React.lazy(() => import('./pages/VulnerableUsers'));
// ModuleUploader for bulk upload and visual editing of training modules
const ModuleUploader = React.lazy(() => import('./pages/ModuleUploader'));
// CredentialSubmissions for tracking credential harvest submissions
const CredentialSubmissions = React.lazy(() => import('./pages/CredentialSubmissions'));
// CredentialHarvest for credential harvest campaign management
const CredentialHarvest = React.lazy(() => import('./pages/CredentialHarvest'));
// ExecutiveTraining for PowerPoint generation
const ExecutiveTraining = React.lazy(() => import('./pages/ExecutiveTraining'));
// CMSTiles for managing website pages
const CMSTiles = React.lazy(() => import('./pages/CMSTiles'));
// RSSFeedManager for managing multiple RSS feeds
const RSSFeedManager = React.lazy(() => import('./pages/RSSFeedManager'));
// FormSubmissions for viewing contact form and access request submissions
const FormSubmissions = React.lazy(() => import('./pages/FormSubmissions'));
// EventsPage for events management with calendar, RSVP, and ICS support
const EventsPage = React.lazy(() => import('./pages/EventsPage'));
const CertificateVerify = React.lazy(() => import('./pages/CertificateVerify'));

// Auth Callback Handler
const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUserData } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionId = new URLSearchParams(hash.slice(1)).get('session_id');

      if (sessionId) {
        try {
          const response = await axios.post(`${API}/auth/session`, { session_id: sessionId });
          setUserData(response.data);
          // Clear hash and redirect
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/dashboard', { replace: true, state: { user: response.data } });
        } catch (err) {
          console.error('Auth callback error:', err);
          navigate('/auth', { replace: true });
        }
      } else {
        navigate('/auth', { replace: true });
      }
    };

    processAuth();
  }, [navigate, setUserData]);

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Authenticating...</p>
      </div>
    </div>
  );
};

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false, contentManager = false }) => {
  const { user, loading, isAdmin, canManageContent } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    // Media managers can access content page but not admin pages
    if (canManageContent) {
      return <Navigate to="/content" replace />;
    }
    return <Navigate to="/training" replace />;
  }

  if (contentManager && !canManageContent) {
    return <Navigate to="/training" replace />;
  }

  return children;
};

// Loading Fallback
const LoadingFallback = () => (
  <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
    <div className="text-center">
      <div className="w-10 h-10 border-2 border-[#2979FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

// Ad Tracker Wrapper - routes campaign IDs to AdTracker
// Dynamic route handler - checks for CMS tiles first, then ad campaigns
// If neither, redirects to home. Public CMS pages render without auth.
const DynamicRouteHandler = () => {
  const params = useParams();
  const slug = params.slug;
  const [routeType, setRouteType] = useState(null); // 'cms_public', 'cms', 'ad', 'not_found'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoute = async () => {
      // First, check if this is a public CMS page (no auth needed)
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cms-tiles/public/page/${slug}`);
        if (res.ok) {
          setRouteType('cms_public');
          setLoading(false);
          return;
        }
      } catch (e) { /* not a public page */ }

      // Next, check if this is a CMS tile (may need auth)
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cms-tiles/${slug}`);
        if (res.ok) {
          setRouteType('cms');
          setLoading(false);
          return;
        }
      } catch (e) { /* not a CMS tile */ }

      // Check if this looks like a valid campaign ID
      if (slug && (
        slug.startsWith('adcamp_') || 
        slug.startsWith('adcmp_') ||
        slug.startsWith('phish_')
      )) {
        setRouteType('ad');
        setLoading(false);
        return;
      }

      // Neither CMS tile nor ad campaign
      setRouteType('not_found');
      setLoading(false);
    };

    checkRoute();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4A836] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (routeType === 'cms_public') {
    return <PublicCmsPage />;
  }

  if (routeType === 'cms') {
    return <CMSTilePage />;
  }

  if (routeType === 'ad') {
    return <AdTracker />;
  }

  // Not found - redirect to home
  return <Navigate to="/" replace />;
};

// App Router
const AppRouter = () => {
  const location = useLocation();

  // Reload page on browser back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      window.location.reload();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check for session_id in URL hash SYNCHRONOUSLY (before render)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <React.Suspense fallback={<LoadingFallback />}>
      {/* Google Analytics - loads when GA ID is configured in SEO settings */}
      <GoogleAnalytics />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        {/* Public content pages */}
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/page/:slug" element={<CustomPage />} />
        {/* Public certificate verification */}
        <Route path="/verify/:certificateId" element={<CertificateVerify />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizations"
          element={
            <ProtectedRoute adminOnly>
              <Organizations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute adminOnly>
              <Campaigns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training"
          element={
            <ProtectedRoute>
              <TrainingModules />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/:sessionId"
          element={
            <ProtectedRoute>
              <TrainingSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute adminOnly>
              <AnalyticsHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/phishing"
          element={
            <ProtectedRoute adminOnly>
              <PhishingSimulations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ads"
          element={
            <ProtectedRoute adminOnly>
              <AdSimulations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation-builder"
          element={
            <ProtectedRoute adminOnly>
              <SimulationBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/module-builder"
          element={<Navigate to="/question-modules" replace />}
        />
        <Route
          path="/question-modules"
          element={
            <ProtectedRoute adminOnly>
              <QuestionModuleDesigner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/module-uploader"
          element={
            <ProtectedRoute adminOnly>
              <ModuleUploader />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-import"
          element={
            <ProtectedRoute adminOnly>
              <UserImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute>
              <CertificatesHub />
            </ProtectedRoute>
          }
        />
        {/* Scenario Manager route reintroduced.  Administrators can manage training questions/scenarios
            using this editor. */}
        <Route
          path="/scenario-manager"
          element={
            <ProtectedRoute adminOnly>
              <ScenarioManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute adminOnly>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documentation"
          element={
            <ProtectedRoute>
              <Documentation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/media-library"
          element={
            <ProtectedRoute adminOnly>
              <MediaLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seo-settings"
          element={
            <ProtectedRoute adminOnly>
              <SEOSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sidebar-customizer"
          element={
            <ProtectedRoute adminOnly>
              <SidebarCustomizer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/permissions"
          element={
            <ProtectedRoute adminOnly>
              <PermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={<Navigate to="/security-hub?tab=audit" replace />}
        />
        <Route
          path="/activity-logs"
          element={<Navigate to="/security-hub?tab=activity" replace />}
        />
        <Route
          path="/password-policy"
          element={<Navigate to="/security-hub?tab=password" replace />}
        />
        <Route
          path="/security-settings"
          element={<Navigate to="/security-hub?tab=settings" replace />}
        />
        <Route
          path="/my-security"
          element={
            <ProtectedRoute>
              <MySecurity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/content"
          element={
            <ProtectedRoute contentManager>
              <ContentManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page-editor"
          element={
            <ProtectedRoute adminOnly>
              <PageEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page-builder"
          element={
            <ProtectedRoute adminOnly>
              <PageBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security"
          element={<Navigate to="/security-hub" replace />}
        />
        <Route
          path="/security-hub"
          element={
            <ProtectedRoute adminOnly>
              <SecurityHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-templates"
          element={
            <ProtectedRoute adminOnly>
              <EmailTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-emails"
          element={
            <ProtectedRoute adminOnly superAdminOnly>
              <SystemEmailTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/advanced-analytics"
          element={<Navigate to="/analytics?tab=advanced" replace />}
        />
        <Route
          path="/vulnerable-users"
          element={
            <ProtectedRoute adminOnly>
              <VulnerableUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credential-submissions"
          element={
            <ProtectedRoute adminOnly>
              <CredentialSubmissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credential-harvest"
          element={
            <ProtectedRoute adminOnly>
              <CredentialHarvest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/executive-training"
          element={
            <ProtectedRoute adminOnly>
              <ExecutiveTraining />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cms-tiles"
          element={<Navigate to="/content" replace />}
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute adminOnly>
              <EventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rss-feeds"
          element={
            <ProtectedRoute adminOnly>
              <RSSFeedManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/form-submissions"
          element={
            <ProtectedRoute adminOnly>
              <FormSubmissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificate-templates"
          element={<Navigate to="/certificates?tab=templates" replace />}
        />
        <Route
          path="/landing-editor"
          element={
            <ProtectedRoute adminOnly>
              <LandingPageEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inquiries"
          element={
            <ProtectedRoute adminOnly>
              <Inquiries />
            </ProtectedRoute>
          }
        />
        {/* Dynamic Route - CMS tiles and Ad Tracking at root level */}
        {/* First checks for CMS tiles, then ad campaigns */}
        <Route path="/:slug" element={<DynamicRouteHandler />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};

function App() {
  // Apply custom favicon from settings
  useFavicon();
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" richColors closeButton duration={3000} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
