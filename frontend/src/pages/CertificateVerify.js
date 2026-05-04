import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Calendar, Building2,
  Loader2, Shield, Star, Share2, ExternalLink,
  BookOpen, Hash
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ParticleBg = ({ accent }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(16)].map((_, i) => (
      <div key={i} className="absolute rounded-full animate-pulse" style={{
        width: (8 + (i % 5) * 6) + 'px', height: (8 + (i % 5) * 6) + 'px',
        background: accent, opacity: 0.07,
        left: ((i * 37 + 13) % 95) + '%', top: ((i * 53 + 7) % 90) + '%',
        animationDelay: ((i * 0.4) % 3) + 's', animationDuration: (3 + (i % 4)) + 's',
      }} />
    ))}
  </div>
);

const WatermarkSeal = ({ color }) => (
  <svg viewBox="0 0 200 200" className="absolute pointer-events-none"
    style={{ width: 320, height: 320, right: -70, bottom: -70, opacity: 0.04 }}>
    <circle cx="100" cy="100" r="95" fill="none" stroke={color} strokeWidth="2" />
    <circle cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 4" />
    {[...Array(12)].map((_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      return <line key={i} x1={100 + 82 * Math.cos(a)} y1={100 + 82 * Math.sin(a)}
        x2={100 + 95 * Math.cos(a)} y2={100 + 95 * Math.sin(a)} stroke={color} strokeWidth="2" />;
    })}
    <path d="M100,30 L112,70 L155,70 L121,93 L133,133 L100,110 L67,133 L79,93 L45,70 L88,70 Z"
      fill={color} opacity="0.6" />
  </svg>
);

const ScoreRing = ({ score, color }) => {
  const r = 38, circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={((pct / 100) * circ) + ' ' + circ}
        strokeLinecap="round" transform="rotate(-90 48 48)" />
      <text x="48" y="45" textAnchor="middle" fill="white" fontSize="17" fontWeight="bold" fontFamily="Georgia,serif">{pct}%</text>
      <text x="48" y="58" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="sans-serif" letterSpacing="1">SCORE</text>
    </svg>
  );
};

export default function CertificateVerify() {
  const { certificateId } = useParams();
  const [cert, setCert] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [certRes, brandingRes] = await Promise.all([
          fetch(BACKEND_URL + '/api/certificates/verify/' + certificateId),
          fetch(BACKEND_URL + '/api/settings/branding')
        ]);
        if (!certRes.ok) throw new Error(certRes.status === 404 ? 'not_found' : 'fetch_error');
        const certData = await certRes.json();
        const brandingData = brandingRes.ok ? await brandingRes.json() : null;
        setCert(certData);
        setBranding(brandingData);
        setTimeout(() => setRevealed(true), 100);
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
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  // Branding — all fields driven from admin Settings → Certificate Verification Page
  const accent      = (branding && branding.cert_verify_accent_color) || (branding && branding.primary_color) || '#D4A836';
  const accentLight = (branding && branding.secondary_color) || '#E8DDB5';
  const companyName = (branding && branding.company_name) || 'Vasilis NetShield';
  const logoUrl     = (branding && branding.logo_url) || '/favicon.svg';
  const tagline     = (branding && branding.tagline) || 'Cybersecurity Excellence';
  // Customisable text fields
  const badgeText      = (branding && branding.cert_verify_badge_text)   || 'Certificate Authenticity Verified';
  const certHeading    = (branding && branding.cert_verify_heading)       || null;
  const certSubheading = (branding && branding.cert_verify_subheading)    || null;
  const bodyText       = (branding && branding.cert_verify_body_text)     || null;
  const footerText     = (branding && branding.cert_verify_footer_text)   || null;
  const showScore      = branding ? branding.cert_verify_show_score !== false : true;
  const showModules    = branding ? branding.cert_verify_show_modules !== false : true;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06070d] flex flex-col items-center justify-center gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{ borderColor: accent + '30', borderTopColor: accent }} />
          <Shield className="absolute inset-0 m-auto w-8 h-8" style={{ color: accent }} />
        </div>
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: accentLight, opacity: 0.5 }}>Verifying Certificate</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06070d] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="relative rounded-2xl overflow-hidden p-10"
            style={{ background: 'linear-gradient(135deg,#160a0a,#0f0f17)', border: '1px solid rgba(220,50,50,0.2)' }}>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia,serif' }}>
              {error === 'not_found' ? 'Certificate Not Found' : 'Verification Error'}
            </h1>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              {error === 'not_found'
                ? 'This certificate ID does not exist in our records. Please check the URL or QR code and try again.'
                : 'We could not verify this certificate at this time. Please try again later.'}
            </p>
            <p className="text-xs font-mono mb-8" style={{ color: accent, opacity: 0.6 }}>ID: {certificateId}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: accent, color: '#000' }}>
              <ExternalLink className="w-4 h-4" />Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const modules = cert.modules_completed || [];
  const trainingName = cert.training_name || 'Training Completion';

  return (
    <div className="min-h-screen w-full bg-[#06070d] flex flex-col" style={{ fontFamily: 'Georgia,serif' }}>

      {/* Nav */}
      <nav className="w-full border-b" style={{ borderColor: accent + '18', background: 'rgba(6,7,13,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
            <div>
              <p className="font-bold text-white text-sm">{companyName}</p>
              <p className="text-[10px] tracking-widest uppercase" style={{ color: accent, opacity: 0.7 }}>{tagline}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide"
            style={{ background: accent + '15', color: accent, border: '1px solid ' + accent + '30' }}>
            <Shield className="w-3 h-3" />Verification Portal
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="max-w-2xl w-full">

          {/* Verified badge */}
          <div className={'text-center mb-8 transition-all duration-700 ' + (revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
            <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold tracking-wide"
              style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.22)', color: '#00e676' }}>
              <CheckCircle2 className="w-5 h-5" />{badgeText}
            </div>
          </div>

          {/* Certificate card */}
          <div className={'relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 delay-100 ' + (revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}
            style={{ background: 'linear-gradient(160deg,#0e0f1a 0%,#0a0a12 60%,#0c0a10 100%)', border: '1px solid ' + accent + '25' }}>

            <ParticleBg accent={accent} />
            <WatermarkSeal color={accent} />
            <div className="absolute inset-0 opacity-[0.025]"
              style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, ' + accent + ', transparent 60%)' }} />

            {/* Top gold bar */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, ' + accent + ', ' + accentLight + ', ' + accent + ', transparent)' }} />

            <div className="relative px-8 pt-10 pb-8 text-center">

              {/* Issuer */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="w-px h-8 opacity-20" style={{ background: accent }} />
                <div className="flex flex-col items-center gap-1">
                  <img src={logoUrl} alt={companyName} className="w-10 h-10 object-contain" />
                  <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: accent, opacity: 0.8 }}>{companyName}</span>
                </div>
                <div className="w-px h-8 opacity-20" style={{ background: accent }} />
              </div>

              {/* Recipient */}
              <p className="text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: accent, opacity: 0.55 }}>This certifies that</p>
              <h1 className="text-5xl font-bold text-white mb-2 leading-tight" style={{ letterSpacing: '-0.5px' }}>
                {cert.user_name}
              </h1>
              {cert.organization_name && (
                <div className="inline-flex items-center gap-1.5 text-xs mt-1" style={{ color: accentLight, opacity: 0.55 }}>
                  <Building2 className="w-3 h-3" />{cert.organization_name}
                </div>
              )}

              <p className="text-[10px] tracking-[0.25em] uppercase my-6" style={{ color: accent, opacity: 0.45 }}>has successfully completed</p>

              {/* Training name / custom subheading */}
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-3 rounded-xl opacity-10" style={{ background: accent }} />
                <h2 className="relative text-xl font-bold px-4 py-2" style={{ color: accentLight }}>
                  {certSubheading || trainingName}
                </h2>
              </div>

              {/* Optional custom heading above name */}
              {certHeading && (
                <p className="text-[10px] tracking-[0.2em] uppercase mb-2 font-sans" style={{ color: accentLight, opacity: 0.5 }}>{certHeading}</p>
              )}

              {/* Optional body text */}
              {bodyText && (
                <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto leading-relaxed font-sans">{bodyText}</p>
              )}

              {/* Stats */}
              <div className={'grid gap-4 mb-8 ' + (cert.average_score != null ? 'grid-cols-3' : 'grid-cols-2')}>
                <div className="flex flex-col items-center p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Calendar className="w-4 h-4 mb-1.5" style={{ color: accent }} />
                  <p className="text-xs text-gray-300 font-semibold">{formatDate(cert.completion_date)}</p>
                  <p className="text-[9px] tracking-widest uppercase mt-0.5 font-sans" style={{ color: accent, opacity: 0.5 }}>Completed</p>
                </div>
                {showScore && cert.average_score != null && (
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <ScoreRing score={cert.average_score} color={accent} />
                  </div>
                )}
                <div className="flex flex-col items-center p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <BookOpen className="w-4 h-4 mb-1.5" style={{ color: accent }} />
                  <p className="text-xs text-gray-300 font-semibold">{modules.length} Module{modules.length !== 1 ? 's' : ''}</p>
                  <p className="text-[9px] tracking-widest uppercase mt-0.5 font-sans" style={{ color: accent, opacity: 0.5 }}>Completed</p>
                </div>
              </div>

              {/* Modules list */}
              {showModules && modules.length > 0 && (
                <div className="mb-8 text-left rounded-xl overflow-hidden" style={{ border: '1px solid ' + accent + '18' }}>
                  <div className="px-4 py-2.5 text-[9px] tracking-[0.25em] uppercase font-semibold font-sans"
                    style={{ background: accent + '10', color: accent, borderBottom: '1px solid ' + accent + '18' }}>
                    Modules Completed
                  </div>
                  {modules.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderBottom: i < modules.length - 1 ? '1px solid ' + accent + '0f' : 'none' }}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
                      <span className="text-xs text-gray-300 font-sans">{m}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, ' + accent + '30)' }} />
                <Star className="w-4 h-4" style={{ color: accent, opacity: 0.5 }} />
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, ' + accent + '30)' }} />
              </div>

              {/* Certificate ID */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-mono font-sans"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}>
                  <Hash className="w-3 h-3" />{cert.certificate_id}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all hover:opacity-80"
                  style={{ background: accent + '15', border: '1px solid ' + accent + '30', color: accentLight }}>
                  <Share2 className="w-3.5 h-3.5" />
                  {copied ? 'Link Copied!' : 'Share Link'}
                </button>
                <a href={window.location.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all hover:opacity-80"
                  style={{ background: accent, color: '#000' }}>
                  <ExternalLink className="w-3.5 h-3.5" />Open in New Tab
                </a>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, ' + accent + '60, transparent)' }} />
          </div>

          {/* Footer */}
          <div className={'text-center mt-8 transition-all duration-700 delay-300 font-sans ' + (revealed ? 'opacity-100' : 'opacity-0')}>
            <p className="text-[10px] tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.18)' }}>
              {footerText || ('Issued and verified by')}
              {!footerText && <span style={{ color: accent, opacity: 0.55 }}> {companyName}</span>}
              {!footerText && <span>{' '}&middot; Authenticated {formatDate(cert.generated_at || cert.completion_date)}</span>}
              {footerText && ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
