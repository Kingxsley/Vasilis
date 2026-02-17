import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Brand Assets
const LOGO_HORIZONTAL = "https://customer-assets.emergentagent.com/job_cyber-sim-hub/artifacts/ff859qpf_logo-horizontal-transparent.png";
const ICON_TRANSPARENT = "https://customer-assets.emergentagent.com/job_cyber-sim-hub/artifacts/qnhbhq26_icon-transparent.png";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAdmin } = useAuth();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const user = await login(formData.email, formData.password);
        toast.success(`Welcome back, ${user.name}!`);
        if (user.role === 'super_admin' || user.role === 'org_admin') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/training', { replace: true });
        }
      } else {
        const user = await register(formData.email, formData.password, formData.name);
        toast.success('Account created successfully!');
        if (user.role === 'super_admin' || user.role === 'org_admin') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/training', { replace: true });
        }
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f3460]/50 to-transparent" />
        <div className="absolute top-0 left-0 right-0 p-8 z-10">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-gray-400 hover:text-[#E8DDB5] transition-colors w-fit"
            data-testid="back-to-home-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
        <div className="relative z-10 text-center p-12">
          <img 
            src={ICON_TRANSPARENT}
            alt="Vasilis NetShield"
            className="w-48 h-48 mx-auto mb-8 animate-pulse-glow"
          />
          <h2 className="text-4xl font-bold mb-4 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Defend Against
            <span className="text-[#D4A836]"> Modern Threats</span>
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Train your organization with realistic cybersecurity simulations powered by AI.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Back Button */}
          <button 
            onClick={() => navigate('/')} 
            className="lg:hidden flex items-center gap-2 text-gray-400 hover:text-[#E8DDB5] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          {/* Logo */}
          <div className="mb-8">
            <img 
              src={LOGO_HORIZONTAL} 
              alt="Vasilis NetShield" 
              className="h-12"
            />
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-gray-500">
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Start your cybersecurity training journey'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2 animate-slide-up">
                <Label htmlFor="name" className="text-gray-400">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] placeholder:text-gray-600 focus:border-[#D4A836] focus:ring-[#D4A836]/20"
                    data-testid="name-input"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-400">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] placeholder:text-gray-600 focus:border-[#D4A836] focus:ring-[#D4A836]/20"
                  data-testid="email-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-400">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] placeholder:text-gray-600 focus:border-[#D4A836] focus:ring-[#D4A836]/20"
                  data-testid="password-input"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold h-12"
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D4A836]/20" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0a0a0a] px-4 text-sm text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Google Login */}
          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-[#D4A836]/30 text-[#E8DDB5] hover:bg-white/5 h-12"
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          {/* Toggle */}
          <p className="mt-8 text-center text-gray-500">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#D4A836] hover:text-[#C49A30] font-medium"
              data-testid="toggle-auth-btn"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
