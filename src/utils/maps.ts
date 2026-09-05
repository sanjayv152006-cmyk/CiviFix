/**
 * Utility functions for Google Maps Platform integration and validation.
 */

const STORAGE_KEY = 'civic_google_maps_api_key';

/**
 * Checks whether an API key matches a valid Google Maps Platform API key format.
 * Genuine Google Cloud API keys start with 'AIza' and are approximately 39 characters in length.
 * Mock/placeholder strings (e.g. '123', 'YOUR_API_KEY', '') are rejected to prevent
 * runtime InvalidKeyMapError and script error crashes.
 */
export function isValidGoogleMapsKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed.startsWith('AIza') &&
    trimmed.length >= 30 &&
    !trimmed.includes(' ') &&
    !trimmed.includes('<') &&
    !trimmed.includes('>')
  );
}

/**
 * Retrieves a custom user-supplied Google Maps API key from localStorage.
 */
export function getStoredGoogleMapsKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? val.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Stores a custom Google Maps API key in localStorage.
 */
export function setStoredGoogleMapsKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch (err) {
    console.error('Failed to store Google Maps API key:', err);
  }
}

/**
 * Clears any custom Google Maps API key from localStorage.
 */
export function clearStoredGoogleMapsKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear Google Maps API key:', err);
  }
}

/**
 * Returns the active Google Maps API key only if it meets genuine format requirements.
 * Prioritizes stored key, then environment variable, otherwise returns null.
 */
export function getActiveGoogleMapsKey(): string | null {
  const storedKey = getStoredGoogleMapsKey();
  if (isValidGoogleMapsKey(storedKey)) {
    return storedKey;
  }

  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (isValidGoogleMapsKey(envKey)) {
    return envKey;
  }

  return null;
}

export interface KeyStatusInfo {
  hasKey: boolean;
  isValid: boolean;
  source: 'stored' | 'env' | 'none';
  maskedKey: string;
  rawKey: string;
  reason?: string;
}

/**
 * Diagnoses the current Google Maps API key configuration state.
 */
export function getKeyStatusInfo(): KeyStatusInfo {
  const stored = getStoredGoogleMapsKey();
  if (stored) {
    const valid = isValidGoogleMapsKey(stored);
    const masked = stored.length > 8 ? `${stored.substring(0, 4)}...${stored.substring(stored.length - 4)}` : '••••••••';
    return {
      hasKey: true,
      isValid: valid,
      source: 'stored',
      maskedKey: masked,
      rawKey: stored,
      reason: valid ? undefined : 'Custom key does not match standard Google Maps format (must start with "AIza" and be ~39 chars)'
    };
  }

  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (envKey) {
    const valid = isValidGoogleMapsKey(envKey);
    const masked = envKey.length > 8 ? `${envKey.substring(0, 4)}...${envKey.substring(envKey.length - 4)}` : envKey;
    return {
      hasKey: true,
      isValid: valid,
      source: 'env',
      maskedKey: masked,
      rawKey: envKey,
      reason: valid ? undefined : `Environment key "${envKey}" is a placeholder or invalid format (Google API keys start with "AIza")`
    };
  }

  return {
    hasKey: false,
    isValid: false,
    source: 'none',
    maskedKey: 'None',
    rawKey: '',
    reason: 'No API key detected in environment or local storage'
  };
}
