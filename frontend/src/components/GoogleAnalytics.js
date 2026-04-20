import { useEffect, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CONSENT_KEY = 'cookie_consent_v1';

/**
 * Read the current consent state. Returns:
 *   { analytics: bool, marketing: bool, essential: bool } | null (never decided)
 */
const readConsent = () => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.categories || null;
  } catch (_) {
    return null;
  }
};

/**
 * Google Analytics Hook - Dynamically loads GA tracking when configured in
 * SEO settings AND the visitor has consented to the `analytics` category.
 *
 * Listens for `cookieConsentChange` events so scripts are loaded the moment
 * the user opts in (without requiring a page refresh).
 */
export const useGoogleAnalytics = () => {
  const [gaId, setGaId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [consent, setConsent] = useState(readConsent);

  useEffect(() => {
    const fetchGAId = async () => {
      try {
        const response = await axios.get(`${API}/settings/seo/public`).catch(() => null);
        if (response?.data?.google_analytics_id) {
          setGaId(response.data.google_analytics_id);
        }
      } catch (err) { /* GA is optional */ }
    };
    fetchGAId();

    // React to consent changes
    const handler = (e) => setConsent(e.detail?.categories || readConsent());
    window.addEventListener('cookieConsentChange', handler);
    return () => window.removeEventListener('cookieConsentChange', handler);
  }, []);

  const analyticsAllowed = !!(consent && consent.analytics);

  useEffect(() => {
    if (!gaId || loaded || !analyticsAllowed) return;

    const isValidGAId = /^(G-[A-Z0-9]+|UA-\d+-\d+)$/i.test(gaId);
    if (!isValidGAId) {
      console.warn('Invalid Google Analytics ID format:', gaId);
      return;
    }
    if (window.gtag) { setLoaded(true); return; }

    const script = document.createElement('script');
    script.async = true;
    if (gaId.startsWith('G-')) {
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    } else {
      script.src = `https://www.google-analytics.com/analytics.js`;
    }
    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', gaId, {
        page_path: window.location.pathname,
        anonymize_ip: true,
      });
      setLoaded(true);
      process.env.NODE_ENV !== 'production' && console.log('Google Analytics loaded (consented):', gaId);
    };
    document.head.appendChild(script);
  }, [gaId, loaded, analyticsAllowed]);

  const trackPageView = (path) => {
    if (window.gtag && gaId && analyticsAllowed) {
      window.gtag('config', gaId, { page_path: path });
    }
  };

  const trackEvent = (action, category, label, value) => {
    if (window.gtag && analyticsAllowed) {
      window.gtag('event', action, { event_category: category, event_label: label, value });
    }
  };

  return { gaId, loaded, analyticsAllowed, trackPageView, trackEvent };
};

/**
 * GoogleAnalytics Component - Add to App.js to enable consent-aware tracking
 */
export const GoogleAnalytics = () => {
  useGoogleAnalytics();
  return null;
};

export default GoogleAnalytics;
