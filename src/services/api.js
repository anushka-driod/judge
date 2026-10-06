const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Universal request wrapper.
<<<<<<< HEAD
<<<<<<< HEAD
 * Directly calls the live merged backend API via Vite proxy or direct localhost.
 * If a route hangs, times out, or fails, seamlessly falls back to mockHandler so the UI never breaks.
=======
 * Directly calls the live merged backend API via Vite proxy (/api -> port 5002).
 * If a route is pending or fails, seamlessly falls back to mockHandler so the UI never breaks.
>>>>>>> origin/main
=======
 * Directly calls the live merged backend API via Vite proxy or direct localhost.
 * If a route hangs, times out, or fails, seamlessly falls back to mockHandler so the UI never breaks.
>>>>>>> 3aab4be (dhanush commits)
 */
export async function request(endpoint, options = {}, mockHandler) {
  const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000); // 20s client timeout guard

<<<<<<< HEAD
=======
>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

<<<<<<< HEAD
=======
    });

>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
    clearTimeout(timeoutId);
    if (err.status || err.data) {
      throw err;
    }
    console.warn(`[VidhiSetu API] Route ${endpoint} encountered network issue or timeout (${err.message}). Engaging fallback handler.`);
  } finally {
    clearTimeout(timeoutId);
  }

  // Legal guidance must never be replaced by canned mock text when the backend is unavailable.
  if (mockHandler && !endpoint.startsWith('/ai/chat')) {
    await new Promise((resolve) => setTimeout(resolve, 80));
<<<<<<< HEAD
=======
    if (err.status || err.data) {
      throw err;
    }
    console.warn(`[VidhiSetu API] Route ${endpoint} fell back to local handler:`, err.message);
  }

  if (mockHandler) {
    await new Promise((resolve) => setTimeout(resolve, 150));
>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)
    return mockHandler();
  }

  throw new Error(`API request failed for ${endpoint}`);
}
<<<<<<< HEAD
<<<<<<< HEAD
=======

>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)
