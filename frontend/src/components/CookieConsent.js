import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Cookie, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STORAGE_KEY = 'cookie_consent_v1';

/**
 * CookieConsent — GDPR/EU-style granular cookie consent banner.
 *
 * Behaviour:
 *   - Reads settings from GET /api/settings/cookie-consent (public endpoint).
 *   - If disabled in settings OR user already made a choice (stored in
 *     localStorage), renders nothing.
 *   - Otherwise shows a two-view banner:
 *       a) Quick view: Accept All / Reject All / Customize
 *       b) Customize view: per-category toggles + "Save Preferences"
 *   - Persists choice as { version, timestamp, categories: { essential:true, analytics, marketing } }
 *   - Fires a `window.dispatchEvent(new Event('cookieConsentChange'))` so
 *     analytics/marketing scripts can react.
 */
export default function CookieConsent() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [choices, setChoices] = useState({ essential: true, analytics: false, marketing: false });

  useEffect(() => {
    axios
      .get(`${API}/settings/cookie-consent`)
      .then((res) => {
        setSettings(res.data);
        // Initialise per-category toggle state from saved categories if any
        const cats = res.data?.categories || [];
        const initial = {};
        cats.forEach((c) => { initial[c.key] = !!c.required; });
        setChoices((prev) => ({ ...prev, ...initial }));

        // Decide visibility
        const saved = (() => {
          try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
          catch { return null; }
        })();
        const shouldShow = res.data?.enabled !== false && !saved;
        setVisible(shouldShow);
      })
      .catch(() => setVisible(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !visible || !settings) return null;

  const persist = (categoriesState) => {
    const payload = {
      version: 1,
      timestamp: new Date().toISOString(),
      categories: categoriesState,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (_) { /* noop */ }
    window.dispatchEvent(new CustomEvent('cookieConsentChange', { detail: payload }));
    setVisible(false);
  };

  const acceptAll = () => {
    const all = {};
    (settings.categories || []).forEach((c) => { all[c.key] = true; });
    persist(all);
  };

  const rejectAll = () => {
    const essentialOnly = {};
    (settings.categories || []).forEach((c) => { essentialOnly[c.key] = !!c.required; });
    persist(essentialOnly);
  };

  const saveCustom = () => persist(choices);

  const position = settings.position || 'bottom';
  const posClass = {
    'bottom': 'inset-x-0 bottom-0',
    'bottom-right': 'bottom-4 right-4 max-w-md',
    'center': 'inset-0 flex items-center justify-center',
  }[position] || 'inset-x-0 bottom-0';

  const cardBody = (
    <div
      className="bg-[#0f0f15]/95 backdrop-blur-md border-t md:border border-[#D4A836]/30 shadow-2xl"
      style={{ borderRadius: position === 'bottom' ? '0' : '0.75rem' }}
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {!customOpen ? (
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#D4A836]/15 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-[#D4A836]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[#E8DDB5] font-semibold text-base mb-1" data-testid="cookie-consent-title">{settings.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {settings.message}
                  {settings.policy_url && (
                    <>
                      {' '}
                      <a href={settings.policy_url} className="text-[#D4A836] hover:underline">
                        {settings.policy_link_text || 'Learn more'}
                      </a>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <Button
                variant="ghost"
                onClick={() => setCustomOpen(true)}
                className="text-gray-300 hover:text-[#E8DDB5] hover:bg-white/5"
                data-testid="cookie-consent-customize-btn"
              >
                {settings.customize_text || 'Customize'}
              </Button>
              <Button
                variant="outline"
                onClick={rejectAll}
                className="border-[#30363D] text-gray-300 hover:bg-white/5"
                data-testid="cookie-consent-reject-btn"
              >
                {settings.reject_all_text || 'Reject All'}
              </Button>
              <Button
                onClick={acceptAll}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                data-testid="cookie-consent-accept-btn"
              >
                {settings.accept_all_text || 'Accept All'}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h4 className="text-[#E8DDB5] font-semibold text-base">Cookie preferences</h4>
                <p className="text-gray-400 text-sm">Choose which categories of cookies to allow.</p>
              </div>
              <button
                onClick={() => setCustomOpen(false)}
                className="text-gray-500 hover:text-[#E8DDB5]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              {(settings.categories || []).map((cat) => (
                <div
                  key={cat.key}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[#1a1a24] border border-[#30363D]"
                  data-testid={`cookie-consent-cat-${cat.key}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#E8DDB5]">{cat.label}</span>
                      {cat.required && (
                        <span className="text-xs text-[#D4A836] bg-[#D4A836]/15 px-2 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{cat.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={!!choices[cat.key]}
                      disabled={!!cat.required}
                      onChange={(e) => setChoices({ ...choices, [cat.key]: e.target.checked || !!cat.required })}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-[#30363D] rounded-full peer peer-checked:bg-[#D4A836] peer-disabled:opacity-60 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5`}></div>
                  </label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button
                variant="outline"
                onClick={rejectAll}
                className="border-[#30363D] text-gray-300 hover:bg-white/5"
              >
                {settings.reject_all_text || 'Reject All'}
              </Button>
              <Button
                onClick={saveCustom}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                data-testid="cookie-consent-save-btn"
              >
                {settings.save_text || 'Save Preferences'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`fixed ${posClass} z-[9999]`}>
      {position === 'center' ? (
        <div className="w-full max-w-2xl mx-4 pointer-events-auto">{cardBody}</div>
      ) : (
        cardBody
      )}
    </div>
  );
}

/**
 * Helper hook for other components to check current consent state.
 */
export function useCookieConsent() {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  });
  useEffect(() => {
    const handler = (e) => setState(e.detail);
    window.addEventListener('cookieConsentChange', handler);
    return () => window.removeEventListener('cookieConsentChange', handler);
  }, []);
  return state;
}
