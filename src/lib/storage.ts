/**
 * Thin localStorage helpers that swallow failures (private browsing, quota,
 * SSR) so callers never need their own try/catch.
 */

export function getStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — ignore.
  }
}

export function getStoredJSON<T>(key: string, fallback: T): T {
  const raw = getStored(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStoredJSON(key: string, value: unknown): void {
  setStored(key, JSON.stringify(value));
}
