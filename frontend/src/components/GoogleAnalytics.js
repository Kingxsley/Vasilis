import { useEffect, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Google Analytics Hook - Dynamically loads GA tracking when configured in SEO settings
 */
export const useGoogleAnalytics = () => {
  const [gaId, setGaId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Fetch SEO settings to get GA ID
    const fetchGAId = async () => {
      try {
        // Try public endpoint first (no auth required)
        const response = await axios.get(`${API}/settings/seo/public`).catch(() => null);
        if (response?.data?.google_analytics_id) {
          setGaId(response.data.google_analytics_id);
        }
      } catch (err) {
        // Silently fail - GA is optional
      }
    };

    fetchGAId();
  }, []);

  useEffect(() => {
    if (!gaId || loaded) return;

    // Validate GA ID format
    const isValidGAId = /^(G-[A-Z0-9]+|UA-\d+-\d+)$/i.test(gaId);
    if (!isValidGAId) {
      console.warn('Invalid Google Analytics ID format:', gaId);
      return;
    }

    // Check if already loaded
    if (window.gtag) {
      setLoaded(true);
      return;
    }

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    
    if (gaId.startsWith('G-')) {
      // GA4
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    } else {
      // Universal Analytics (UA)
      script.src = `https://www.google-analytics.com/analytics.js`;
    }

    script.onload = () => {
      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;
      
      gtag('js', new Date());
      gtag('config', gaId, {
        page_path: window.location.pathname,
        anonymize_ip: true
      });

      setLoaded(true);
      console.log('Google Analytics loaded:', gaId);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount (optional)
    };
  }, [gaId, loaded]);

  // Track page views
  const trackPageView = (path) => {
    if (window.gtag && gaId) {
      window.gtag('config', gaId, {
        page_path: path
      });
    }
  };

  // Track custom events
  const trackEvent = (action, category, label, value) => {
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
  };

  return { gaId, loaded, trackPageView, trackEvent };
};

/**
 * GoogleAnalytics Component - Add to App.js to enable tracking
 */
export const GoogleAnalytics = () => {
  useGoogleAnalytics();
  return null; // This component doesn't render anything
};

export default GoogleAnalytics;
