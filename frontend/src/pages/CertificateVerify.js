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

  // Base branding
  const accent      = branding?.cert_verify_accent_color || branding?.primary_color || '#D4A836';
  const companyName = branding?.company_name || 'Vasilis NetShield';
  const logoUrl     = branding?.logo_url || null;

  // Certificate verify customisation — all fields from Settings → Certificate Verification Page
  const badgeText   = branding?.cert_verify_badge_text  || 'Certificate Authenticity Verified';
  const heading     = branding?.cert_verify_heading     || 'Certificate of Achievement';
  const subheading  = branding?.cert_verify_subheading  || null;   // null = use module name
  const bodyText    = branding?.cert_verify_body_text   || null;
  const footerNote  = branding?.cert_verify_footer_text || `Issued by ${companyName} · Verified as authentic`;
  const showScore   = branding?.cert_verify_show_score  !== false;
  const showModules = branding?.cert_verify_show_modules !== false;

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
  const moduleName        = cert.training_name || 'Training';
  const displaySubheading = subheading || moduleName;

  // Modules list — cert.modules_completed may be array or bullet string
  let modulesList = [];
  if (showModules && cert.modules_completed) {
    if (Array.isArray(cert.modules_completed)) {
      modulesList = cert.modules_completed;
    } else if (typeof cert.modules_completed === 'string') {
      modulesList = cert.modules_completed.split('•').map(s => s.trim()).filter(Boolean);
    }
  }

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

          {/* Verified badge — uses customised badge text */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-950/60 border border-green-700/40">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-medium">{badgeText}</span>
            </div>
          </div>

          {/* Certificate card */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden">

            {/* Accent bar — uses cert_verify_accent_color or primary_color */}
            <div className="h-1" style={{ background: accent }} />

            <div className="px-8 py-10 text-center">

              {/* Customisable heading */}
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: accent }}>
                {heading}
              </p>

              {/* Recipient name */}
              <h1 className="text-3xl font-bold text-white mb-1">
                {cert.user_name}
              </h1>

              {/* Organisation */}
              {cert.organization_name && (
                <p className="text-sm text-gray-400 mb-2">{cert.organization_name}</p>
              )}

              {/* Optional body text from settings */}
              {bodyText && (
                <p className="text-sm text-gray-400 mt-3 mb-1 italic">{bodyText}</p>
              )}

              {/* Divider */}
              <div className="w-12 h-px bg-[#30363D] mx-auto my-6" />

              {/* "For completing" label */}
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                For completing
              </p>

              {/* Subheading — custom text or falls back to actual module name */}
              <p className="text-lg font-semibold text-white mb-4">
                {displaySubheading}
              </p>

              {/* Modules list — shown when cert has multiple modules and toggle is on */}
              {showModules && modulesList.length > 1 && (
                <ul className="text-sm text-gray-400 space-y-1 mb-6 text-left inline-block">
                  {modulesList.map((m, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
                      {m}
                    </li>
                  ))}
                </ul>
              )}

              {/* Score ring — shown when toggle is on and score exists */}
              {showScore && cert.average_score != null && (
                <div className="flex justify-center mb-6">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#30363D" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke={accent} strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - Math.min(cert.average_score, 100) / 100)}`}
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-white">{Math.round(cert.average_score)}%</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Score</span>
                    </div>
                  </div>
                </div>
              )}

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

          {/* Footer note — customisable from settings */}
          <p className="text-center text-xs text-gray-600 mt-6">{footerNote}</p>

        </div>
      </div>
    </div>
  );
}
