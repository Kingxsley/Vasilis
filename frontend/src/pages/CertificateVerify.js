import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Share2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CertificateVerify() {
  const { certificateId } = useParams();
  const [cert, setCert] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [certRes, brandingRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/certificates/verify/${certificateId}`),
          fetch(`${BACKEND_URL}/api/settings/branding`)
        ]);
        if (!certRes.ok) throw new Error(certRes.status === 404 ? 'not_found' : 'error');
        const certData = await certRes.json();
        const brandingData = brandingRes.ok ? await brandingRes.json() : null;
        setCert(certData);
        setBranding(brandingData);
      } catch (err) {
        setError(err.message === 'not_found' ? 'not_found' : 'error');
      } finally {
        setLoading(false);
      }
    };
    if (certificateId) fetchData();
  }, [certificateId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return dateStr; }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const accent      = branding?.primary_color || '#D4A836';
  const companyName = branding?.company_name  || 'Vasilis NetShield';
  const logoUrl     = branding?.logo_url      || null;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center gap-4">
        {logoUrl
          ? <img src={logoUrl} alt={companyName} className="w-12 h-12 object-contain animate-pulse" />
          : <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: accent }} />
        }
        <p className="text-xs text-gray-500 uppercase tracking-widest">Verifying</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center bg-[#161B22] border border-[#30363D] rounded-2xl p-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">
            {error === 'not_found' ? 'Certificate Not Found' : 'Verification Error'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {error === 'not_found'
              ? 'This certificate ID does not exist. Please check the QR code or link.'
              : 'Unable to verify this certificate right now. Please try again later.'}
          </p>
          <p className="text-xs text-gray-600 font-mono mb-6">{certificateId}</p>
          <Link
            to="/"
            className="inline-block px-5 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-90"
            style={{ background: accent }}
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── Verified ──────────────────────────────────────────────────────────────
  const completionDate    = formatDate(cert.completion_date);
  const authenticatedDate = formatDate(cert.generated_at || cert.completion_date);
  // training_name comes from modules_completed[0] on the backend — the actual module name
  const moduleName = cert.training_name || 'Training';

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col">

      {/* Top bar */}
      <div className="border-b border-[#30363D] bg-[#0D1117]">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl
              ? <img src={logoUrl} alt={companyName} className="h-7 object-contain" />
              : <span className="text-white font-semibold text-sm">{companyName}</span>
            }
          </Link>
          <span className="text-xs text-gray-600 uppercase tracking-widest">Certificate Verification</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {/* Verified pill */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-950/60 border border-green-700/40">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-medium">Verified</span>
            </div>
          </div>

          {/* Certificate card */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden">

            {/* Accent top bar */}
            <div className="h-1" style={{ background: accent }} />

            <div className="px-8 py-10 text-center">

              {/* Awarded to label */}
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                Awarded to
              </p>

              {/* Recipient name — large, white, clearly readable */}
              <h1 className="text-3xl font-bold text-white mb-1">
                {cert.user_name}
              </h1>

              {/* Organisation */}
              {cert.organization_name && (
                <p className="text-sm text-gray-400 mb-2">{cert.organization_name}</p>
              )}

              {/* Divider */}
              <div className="w-12 h-px bg-[#30363D] mx-auto my-6" />

              {/* For completing label */}
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                For completing
              </p>

              {/* Module name — the actual training module, not generic "Training" */}
              <p className="text-lg font-semibold text-white mb-8">
                {moduleName}
              </p>

              {/* Date boxes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Completed</p>
                  <p className="text-sm font-semibold text-white">{completionDate}</p>
                </div>
                <div className="bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Authenticated</p>
                  <p className="text-sm font-semibold text-white">{authenticatedDate}</p>
                </div>
              </div>
            </div>

            {/* Certificate ID row */}
            <div className="px-8 py-4 border-t border-[#30363D] flex items-center justify-between">
              <span className="text-[10px] text-gray-600 uppercase tracking-widest">Certificate ID</span>
              <span className="text-xs font-mono text-gray-400">{cert.certificate_id}</span>
            </div>
          </div>

          {/* Share button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#30363D] text-sm text-gray-400 hover:text-white hover:border-[#555] transition-all"
            >
              <Share2 className="w-4 h-4" />
              {copied ? 'Link copied' : 'Share certificate'}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-6">
            Issued by {companyName} · Authenticated {authenticatedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
