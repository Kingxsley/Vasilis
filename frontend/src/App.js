import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
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
    const applyFavicon = async () => {
      try {
        const response = await axios.get(`${API}/settings/branding`);
        const faviconUrl = response.data?.favicon_url;
        
        if (faviconUrl) {
          // Find existing favicon link or create new one
          let link = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = faviconUrl;
          
          // Also update apple-touch-icon if exists
          let appleLink = document.querySelector("link[rel='apple-touch-icon']");
          if (appleLink) {
            appleLink.href = faviconUrl;
          }
        }
      } catch (error) {
        // Silently fail - use default favicon
      }
    };
    
    applyFavicon();
  }, []);
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (token) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      }
    } catch (err) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
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
    canManageContent: user?.role === 'super_admin' || user?.role === 'org_admin' || user?.role === 'media_manager'
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
const Settings = React.lazy(() => import('./pages/Settings'));
const ContentManager = React.lazy(() => import('./pages/ContentManager'));
const PageEditor = React.lazy(() => import('./pages/PageEditor'));
const BlogListPage = React.lazy(() => import('./pages/Blog').then(m => ({ default: m.BlogList })));
const BlogPostPage = React.lazy(() => import('./pages/Blog').then(m => ({ default: m.BlogPost })));
const VideosPage = React.lazy(() => import('./pages/VideosPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

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

// App Router
const AppRouter = () => {
  const location = useLocation();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check for session_id in URL hash SYNCHRONOUSLY (before render)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        {/* Public content pages */}
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/about" element={<AboutPage />} />
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
              <Analytics />
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
              <Certificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scenarios"
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
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
