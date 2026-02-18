import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, Lock, User, ArrowLeft, Loader2, Shield, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, register, isAdmin } = useAuth();
  
  const from = location.state?.from?.pathname || '/dashboard';
  const resetToken = searchParams.get('reset_token');

  useEffect(() => {
    // Fetch branding settings
    axios.get(`${API}/settings/branding`)
      .then(res => setBranding(res.data))
      .catch(() => {});
    
    // Check for reset token in URL
    if (resetToken) {
      verifyResetToken(resetToken);
    }
  }, [resetToken]);

  const verifyResetToken = async (token) => {
    try {
      const res = await axios.get(`${API}/auth/verify-reset-token/${token}`);
      if (res.data.valid) {
        setMode('reset');
        setResetEmail(res.data.email);
      } else {
        toast.error(res.data.message || 'Invalid reset link');
      }
    } catch (err) {
      toast.error('Invalid or expired reset link');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(formData.email, formData.password);
        toast.success(`Welcome back, ${user.name}!`);
        if (user.role === 'super_admin' || user.role === 'org_admin') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/training', { replace: true });
        }
      } else if (mode === 'register') {
        const user = await register(formData.email, formData.password, formData.name);
        toast.success('Account created successfully!');
        if (user.role === 'super_admin' || user.role === 'org_admin') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/training', { replace: true });
        }
      } else if (mode === 'forgot') {
        await axios.post(`${API}/auth/forgot-password`, { email: formData.email });
        toast.success('If an account exists with this email, a reset link has been sent.');
        setMode('login');
        setFormData({ ...formData, email: '' });
      } else if (mode === 'reset') {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        await axios.post(`${API}/auth/reset-password`, { 
          token: resetToken, 
          new_password: formData.password 
        });
        toast.success('Password reset successful! You can now login.');
        setMode('login');
        navigate('/auth', { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Operation failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'register': return 'Create account';
      case 'forgot': return 'Forgot password';
      case 'reset': return 'Reset password';
      default: return 'Welcome back';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'register': return 'Start your cybersecurity training journey';
      case 'forgot': return 'Enter your email to receive a reset link';
      case 'reset': return `Set a new password for ${resetEmail}`;
      default: return 'Enter your credentials to access your account';
    }
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
          <div className="w-48 h-48 mx-auto mb-8 rounded-full bg-gradient-to-br from-[#D4A836] to-[#0f3460] flex items-center justify-center animate-pulse">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
            ) : (
              <Shield className="w-24 h-24 text-[#E8DDB5]" />
            )}
          </div>
          <h2 className="text-4xl font-bold mb-4 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Defend Against
            <span className="text-[#D4A836]"> Modern Threats</span>
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            {branding?.tagline || 'Train your organization with realistic cybersecurity simulations.'}
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
          <div className="mb-8 flex items-center gap-3">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <Shield className="w-10 h-10 text-[#D4A836]" />
            )}
            <span className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {branding?.company_name || 'Vasilis NetShield'}
            </span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {getTitle()}
            </h1>
            <p className="text-gray-500">{getSubtitle()}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && (
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
                    required
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
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
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-400">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={mode === 'reset' ? 'Enter new password' : 'Enter your password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] placeholder:text-gray-600 focus:border-[#D4A836] focus:ring-[#D4A836]/20"
                    data-testid="password-input"
                    required
                    minLength={8}
                  />
                </div>
                {mode === 'reset' && (
                  <p className="text-xs text-gray-500">
                    Min 8 characters, include uppercase, lowercase, number, and special character
                  </p>
                )}
              </div>
            )}

            {mode === 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-400">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-[#0f0f15] border-[#D4A836]/30 text-[#E8DDB5] placeholder:text-gray-600 focus:border-[#D4A836] focus:ring-[#D4A836]/20"
                    data-testid="confirm-password-input"
                    required
                    minLength={8}
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-[#D4A836] hover:text-[#C49A30]"
                  data-testid="forgot-password-btn"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold h-12"
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 
                   mode === 'register' ? 'Creating account...' :
                   mode === 'forgot' ? 'Sending...' : 'Resetting...'}
                </>
              ) : (
                mode === 'login' ? 'Sign in' : 
                mode === 'register' ? 'Create account' :
                mode === 'forgot' ? 'Send reset link' : 'Reset password'
              )}
            </Button>
          </form>

          {/* Toggle / Back Links */}
          <div className="mt-8 text-center">
            {mode === 'login' && (
              <p className="text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[#D4A836] hover:text-[#C49A30] font-medium"
                  data-testid="toggle-auth-btn"
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p className="text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[#D4A836] hover:text-[#C49A30] font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  navigate('/auth', { replace: true });
                }}
                className="text-[#D4A836] hover:text-[#C49A30] font-medium flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
