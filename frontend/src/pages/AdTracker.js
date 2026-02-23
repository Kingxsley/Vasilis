import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * AdTracker / Campaign Tracker Page
 * Public passthrough that renders simulation content for tracking URLs.
 * Handles both ad campaigns (adcamp_*) and phishing campaigns (phish_*).
 * URL format: /{campaign_id}?u={tracking_code}
 */
export default function AdTracker() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndRender = async () => {
      try {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const campaignId = pathParts[0];
        const urlParams = new URLSearchParams(window.location.search);
        const trackingCode = urlParams.get('u');

        if (!campaignId) {
          setError('Invalid tracking link');
          setLoading(false);
          return;
        }

        // For phishing campaigns, redirect the browser directly to the
        // phishing click tracking endpoint which records the click AND
        // serves the awareness page in a single request.
        if (campaignId.startsWith('phish_') && trackingCode) {
          window.location.replace(
            `${API}/phishing/track/click/${trackingCode}`
          );
          return; // browser navigates away
        }

        // For ad campaigns, fetch and render inline
        const response = await axios.get(`${API}/track/${campaignId}`, {
          params: trackingCode ? { u: trackingCode } : {},
          headers: { Accept: 'text/html' },
        });

        setContent(response.data);
      } catch (err) {
        console.error('Failed to load content:', err);
        setError('This tracking link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndRender();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #333',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Link Not Found</h2>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: content }}
      style={{ minHeight: '100vh' }}
    />
  );
}
