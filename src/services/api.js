const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

/**
 * Universal request wrapper.
 * Calls the configured backend API. Network failures are surfaced to the caller;
 * mock data must never disguise failed authentication or persistence.
 */
export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000); // 20s client timeout guard

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (response.ok) {
      // Normalize wrapped list responses for React state hooks
      if (data && data.lawyers && !data.id) return data.lawyers;
      if (data && data.matches && !data.id) return data.matches;
      if (data && data.laws && !data.id) return data.laws;
      if (data && data.actions && !data.id) return data.actions;
      if (data && data.timeline && !data.id) return data.timeline;
      if (data && data.consultation) return data.consultation;
      return data;
    }

    // Explicit error from backend (e.g. 403 Unverified Email or 400 Validation)
    const err = new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && (err.status || err.data)) throw err;
    if (err?.name === 'AbortError') {
      throw new Error(`Backend request timed out for ${endpoint}. Please try again.`);
    }
    throw new Error(`Backend is unavailable for ${endpoint}. Please check the connection and try again.`);
  } finally {
    clearTimeout(timeoutId);
  }
}
