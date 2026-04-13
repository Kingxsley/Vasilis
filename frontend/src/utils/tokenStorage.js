/**
 * Secure token storage — uses sessionStorage (cleared on tab close)
 * with lightweight obfuscation to prevent trivial inspection.
 * For full production security, use httpOnly cookies instead.
 */

const STORAGE_KEY = '_vs_auth';

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
  // Check sessionStorage first (current session), then localStorage (migration)
  const sessionVal = sessionStorage.getItem(STORAGE_KEY);
  if (sessionVal) return deobfuscate(sessionVal);

  // Migrate from old localStorage if present
  const legacyVal = localStorage.getItem('token');
  if (legacyVal) {
    setStoredToken(legacyVal);
    localStorage.removeItem('token');
    return legacyVal;
  }

  return null;
}

export function setStoredToken(token) {
  if (!token) {
    clearStoredToken();
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, obfuscate(token));
}

export function clearStoredToken() {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('token'); // clean up legacy
}
