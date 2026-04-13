/**
 * Secure token storage — uses in-memory state as primary store
 * with sessionStorage as fallback for page refreshes.
 * The token is obfuscated before storage to prevent trivial inspection.
 *
 * For maximum security, tokens should be stored in httpOnly cookies
 * (handled server-side). This module provides a defense-in-depth layer.
 */

const STORAGE_KEY = '_vs_auth';

// In-memory primary store — not accessible via DevTools
let _memoryToken = null;

function obfuscate(value) {
  try {
    return btoa(value.split('').reverse().join(''));
  } catch {
    return value;
  }
}

function deobfuscate(value) {
  try {
    return atob(value).split('').reverse().join('');
  } catch {
    return value;
  }
}

export function getStoredToken() {
  // 1. Check in-memory store first (most secure)
  if (_memoryToken) return _memoryToken;

  // 2. Check sessionStorage (survives refreshes within same tab)
  const sessionVal = sessionStorage.getItem(STORAGE_KEY);
  if (sessionVal) {
    _memoryToken = deobfuscate(sessionVal);
    return _memoryToken;
  }

  // 3. Migrate from old localStorage if present (one-time)
  const legacyVal = localStorage.getItem('token');
  if (legacyVal) {
    _memoryToken = legacyVal;
    sessionStorage.setItem(STORAGE_KEY, obfuscate(legacyVal));
    localStorage.removeItem('token');
    return _memoryToken;
  }

  return null;
}

export function setStoredToken(token) {
  if (!token) {
    clearStoredToken();
    return;
  }
  _memoryToken = token;
  sessionStorage.setItem(STORAGE_KEY, obfuscate(token));
}

export function clearStoredToken() {
  _memoryToken = null;
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('token'); // clean up legacy
}
