import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, Lock, User, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

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
            <Shield className="w-24 h-24 text-[#E8DDB5]" />
          </div>
          <h2 className="text-4xl font-bold mb-4 text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Defend Against
            <span className="text-[#D4A836]"> Modern Threats</span>
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Train your organization with realistic cybersecurity simulations.
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
            <Shield className="w-10 h-10 text-[#D4A836]" />
            <span className="text-2xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              VasilisNetShield
            </span>
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
