import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// This page allows any authenticated user (including trainees) to enable
// and verify two‑factor authentication (2FA) on their account. The
// functionality mirrors the 2FA section found in the admin Security
// Dashboard but omits admin‑only information such as security logs.  It
// uses the `/auth/two‑factor/setup` and `/auth/two‑factor/verify` API
// endpoints. Once enabled, users must provide a verification code at
// login to access the system when 2FA is enforced.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MySecurity() {
  const { token, user, setUserData } = useAuth();
  // Track if the current user already has 2FA enabled.  Initialise
  // from the user context if available.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return user?.two_factor_enabled ?? false;
  });
  // Secret and otpauth URL returned when initiating setup.  These are
  // shown so the user can configure their authenticator app.
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  // Code entered by the user for verification.
  const [twoFactorCode, setTwoFactorCode] = useState('');
  // Loading indicators for setup and verification actions.
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Initiate the 2FA setup process.  Requests a secret and OTP URI
  // from the backend.  If the user already has 2FA enabled the
  // server will return an error which we surface to the user.
  const startSetup = async () => {
    setSetupLoading(true);
    setTwoFactorCode('');
    try {
      const res = await axios.post(
        `${API}/auth/two-factor/setup`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTwoFactorSecret(res.data.secret);
      setOtpAuthUrl(res.data.otp_auth_url);
      toast.success('Two‑factor setup initiated. Scan the QR code and verify.');
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || 'Failed to initiate two‑factor setup'
      );
    } finally {
      setSetupLoading(false);
    }
  };

  // Verify the code entered by the user and enable 2FA if valid.
  const verifyCode = async () => {
    if (!twoFactorCode) {
      toast.error('Please enter the verification code from your authenticator app');
      return;
    }
    setVerifyLoading(true);
    try {
      await axios.post(
        `${API}/auth/two-factor/verify`,
        { code: twoFactorCode },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Two‑factor authentication enabled');
      setTwoFactorEnabled(true);
      // Update user context to reflect 2FA enabled state
      if (user) {
        setUserData({ ...user, two_factor_enabled: true });
      }
      // Reset setup state
      setTwoFactorSecret('');
      setOtpAuthUrl('');
      setTwoFactorCode('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid two‑factor code');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-[#E8DDB5]">Two‑Factor Authentication</h1>
        <p className="text-gray-400 text-sm">
          Secure your account by enabling two‑factor authentication. Use an authenticator
          app (such as Google Authenticator or Authy) to generate verification codes.
        </p>
        <Card className="bg-[#0f0f15] border-[#D4A836]/20">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#D4A836]" />
              Two‑Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            {twoFactorEnabled ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Two‑factor authentication is currently <span className="text-green-400 font-medium">enabled</span> on your account.
                </p>
                <p className="text-sm text-gray-500">
                  If you need to disable or reset your 2FA, please contact an administrator.
                </p>
              </div>
            ) : otpAuthUrl ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Scan the QR code below with your authenticator app or copy the secret key.
                </p>
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(
                      otpAuthUrl
                    )}`}
                    alt="2FA QR code"
                    className="mx-auto border border-[#D4A836]/30 rounded"
                  />
                  <p className="text-xs font-mono text-gray-500 break-all">
                    Secret: {twoFactorSecret}
                  </p>
                </div>
                <div>
                  <Label htmlFor="twoFactorCode" className="text-gray-400">
                    Verification Code
                  </Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    placeholder="Enter 6‑digit code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="mt-1 bg-[#1a1a24] border-[#D4A836]/30 text-[#E8DDB5]"
                  />
                </div>
                <Button
                  onClick={verifyCode}
                  disabled={verifyLoading}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Click below to start the setup process. You will be given a QR code and a secret
                  key to add to your authenticator app.
                </p>
                <Button
                  onClick={startSetup}
                  disabled={setupLoading}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                >
                  {setupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Enable Two‑Factor'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}