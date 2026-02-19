import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * AdTracker Page
 * This is a public passthrough page that renders ad content for tracking URLs.
 * URL format: /{campaign_id}?u={tracking_code}
 * 
 * This allows clean URLs like vasilisnetshield.com/abc123?u=xyz789
 * instead of vasilisnetshield.com/api/track/abc123?u=xyz789
 */
export default function AdTracker() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndRenderAd = async () => {
      try {
        // Extract campaign_id from URL path (everything after /)
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const campaignId = pathParts[0];
        
        // Get tracking code from query params
        const urlParams = new URLSearchParams(window.location.search);
        const trackingCode = urlParams.get('u');

        if (!campaignId) {
          setError('Invalid tracking link');
          setLoading(false);
          return;
        }

        // Call the backend API to render the ad
        // The backend will handle view tracking
        const response = await axios.get(`${API}/track/${campaignId}`, {
          params: trackingCode ? { u: trackingCode } : {},
          headers: { 'Accept': 'text/html' }
        });

        // The response is HTML content
        setContent(response.data);
      } catch (err) {
        console.error('Failed to load ad:', err);
        setError('This tracking link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndRenderAd();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e0e0e0',
          borderTop: '3px solid #333',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Link Not Found</h2>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  // Render the HTML content directly
  // This is the ad content from the backend
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: content }}
      style={{ minHeight: '100vh' }}
    />
  );
}
