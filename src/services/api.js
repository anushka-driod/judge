const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Universal request wrapper.
 * Directly calls the live merged backend API via Vite proxy (/api -> port 5002).
 * If a route is pending or fails, seamlessly falls back to mockHandler so the UI never breaks.
 */
export async function request(endpoint, options = {}, mockHandler) {
  const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

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
    if (data && (data.error || data.requiresVerification || data.message)) {
      const err = new Error(data.error || data.message || `Request failed with status ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
  } catch (err) {
    if (err.status || err.data) {
      throw err;
    }
    console.warn(`[VidhiSetu API] Route ${endpoint} fell back to local handler:`, err.message);
  }

  if (mockHandler) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockHandler();
  }

  throw new Error(`API request failed for ${endpoint}`);
}

