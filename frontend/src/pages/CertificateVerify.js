import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle2, XCircle, Calendar, TrendingUp, BookOpen, Building2, User, Shield, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CertificateVerify() {
  const { certificateId } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/certificates/verify/${certificateId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('not_found');
          throw new Error('fetch_error');
        }
        const data = await res.json();
        setCert(data);
      } catch (err) {
        setError(err.message === 'not_found' ? 'not_found' : 'error');
      } finally {
        setLoading(false);
      }
    };
    if (certificateId) fetchCert();
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
  const scoreNum = typeof cert.average_score === 'number' ? cert.average_score : parseFloat(cert.average_score) || 0;
  const scoreColor = scoreNum >= 80 ? '#2E8B57' : scoreNum >= 60 ? '#D4A836' : '#E74C3C';

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#161B22] border-b border-[#30363D]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#E8DDB5] font-bold text-lg">
            <Shield className="w-5 h-5 text-[#D4A836]" />
            Vasilis NetShield
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

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 border-t border-[#30363D]">
              {/* Score */}
              <div className="p-5 border-r border-b border-[#30363D] text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1.5" style={{ color: scoreColor }} />
                <p className="text-2xl font-bold" style={{ color: scoreColor }}>
                  {typeof cert.average_score === 'number' ? `${cert.average_score.toFixed(1)}%` : `${cert.average_score}`}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Achievement Score</p>
              </div>

              {/* Date */}
              <div className="p-5 border-r border-b border-[#30363D] text-center">
                <Calendar className="w-5 h-5 text-[#6B9BD2] mx-auto mb-1.5" />
                <p className="text-lg font-semibold text-white">
                  {formatDate(cert.completion_date)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Completion Date</p>
              </div>

              {/* Modules */}
              <div className="p-5 border-b border-[#30363D] text-center col-span-2 sm:col-span-1">
                <BookOpen className="w-5 h-5 text-[#D4A836] mx-auto mb-1.5" />
                <p className="text-lg font-semibold text-white">
                  {(cert.modules_completed || []).length}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Module{(cert.modules_completed || []).length !== 1 ? 's' : ''} Completed</p>
              </div>
            </div>

            {/* Modules List */}
            {cert.modules_completed && cert.modules_completed.length > 0 && (
              <div className="px-8 py-5 border-t border-[#30363D]">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Training Modules</p>
                <div className="space-y-2">
                  {cert.modules_completed.map((mod, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {mod}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate ID footer */}
            <div className="px-8 py-4 bg-[#0D1117] border-t border-[#30363D] flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider">Certificate ID</p>
                <p className="text-gray-400 text-sm font-mono">{cert.certificate_id}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider">Issued</p>
                <p className="text-gray-400 text-sm">{formatDate(cert.generated_at)}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-600 text-xs">
              This certificate was issued by <span className="text-gray-400">Vasilis NetShield</span> and has been verified as authentic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
