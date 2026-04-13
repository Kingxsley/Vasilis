import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle2, XCircle, Calendar, Building2, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CertificateVerify() {
  const { certificateId } = useParams();
  const [cert, setCert] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both certificate and branding data
        const [certRes, brandingRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/certificates/verify/${certificateId}`),
          fetch(`${BACKEND_URL}/api/settings/branding`)
        ]);
        
        if (!certRes.ok) {
          if (certRes.status === 404) throw new Error('not_found');
          throw new Error('fetch_error');
        }
        
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

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return dateStr; }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#D4A836]" />
      </div>
    );
  }

  // Error / Not found
  if (error) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-[#161B22] border border-red-500/30 rounded-2xl p-8 shadow-2xl">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              {error === 'not_found' ? 'Certificate Not Found' : 'Verification Error'}
            </h1>
            <p className="text-gray-400 mb-6">
              {error === 'not_found'
                ? 'This certificate ID does not exist in our records. Please check the QR code or URL.'
                : 'Unable to verify this certificate at this time. Please try again later.'}
            </p>
            <p className="text-gray-500 text-sm font-mono mb-6">ID: {certificateId}</p>
            <Link to="/" className="inline-block px-6 py-2.5 bg-[#D4A836] text-black font-semibold rounded-lg hover:bg-[#C49A30] transition">
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success — verified certificate
  const companyName = branding?.company_name || 'Vasilis NetShield';
  const logoUrl = branding?.logo_url || '/favicon.svg';
  
  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#161B22] border-b border-[#30363D]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#E8DDB5] font-bold text-lg">
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            {companyName}
          </Link>
          <span className="text-gray-500 text-sm">Certificate Verification</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Verified Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-5 py-2.5">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <span className="text-green-400 font-semibold text-lg">Certificate Verified</span>
            </div>
          </div>

          {/* Certificate Card */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-2xl">
            {/* Gold accent bar */}
            <div className="h-2 bg-gradient-to-r from-[#D4A836] via-[#E8DDB5] to-[#D4A836]" />

            {/* Header */}
            <div className="px-8 pt-8 pb-4 text-center border-b border-[#30363D]">
              <Award className="w-14 h-14 text-[#D4A836] mx-auto mb-3" />
              <h1 className="text-3xl font-bold text-[#E8DDB5] tracking-wide mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                Certificate of Achievement
              </h1>
              <p className="text-[#D4A836] text-lg italic" style={{ fontFamily: 'Georgia, serif' }}>
                {cert.training_name || 'Training Completion'}
              </p>
            </div>

            {/* Recipient */}
            <div className="px-8 py-6 text-center bg-[#0D1117]/50">
              <p className="text-gray-400 text-sm mb-1">Awarded to</p>
              <h2 className="text-4xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                {cert.user_name}
              </h2>
              {cert.organization_name && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-gray-400 text-sm">
                  <Building2 className="w-4 h-4" />
                  {cert.organization_name}
                </div>
              )}
            </div>

            {/* Completion Date - Centered */}
            <div className="px-8 py-6 border-t border-[#30363D] text-center">
              <Calendar className="w-6 h-6 text-[#6B9BD2] mx-auto mb-2" />
              <p className="text-xl font-semibold text-white">
                {formatDate(cert.completion_date)}
              </p>
              <p className="text-gray-500 text-sm mt-1">Completion Date</p>
            </div>

            {/* Certificate ID footer */}
            <div className="px-8 py-4 bg-[#0D1117] border-t border-[#30363D]">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider text-center">Certificate ID</p>
              <p className="text-gray-400 text-sm font-mono text-center">{cert.certificate_id}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-600 text-xs">
              This certificate was issued by <span className="text-gray-400">{companyName}</span> and has been verified as authentic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
