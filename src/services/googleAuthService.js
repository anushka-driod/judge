/**
 * Genuine Google Authentication Service for VIDHISETU
 * Uses official Google Identity Services (GIS) & Backend /api/auth/google
 */

const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client';

export class GoogleAuthService {
  static _scriptLoading = null;

  /**
   * Dynamically loads the official Google Identity Services SDK
   */
  static loadGoogleScript() {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (this._scriptLoading) return this._scriptLoading;

    this._scriptLoading = new Promise((resolve) => {
      const existing = document.querySelector(`script[src="${GOOGLE_GSI_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google));
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_GSI_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        console.warn('[GoogleAuthService] Failed to load official Google Identity Services script.');
        resolve(null);
      };
      document.head.appendChild(script);
    });

    return this._scriptLoading;
  }

  /**
   * Prompts genuine Google Sign-In using official Google Identity Services.
   * If VITE_GOOGLE_CLIENT_ID is missing or not configured, returns a visible error.
   */
  static async promptGoogleSignIn() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const isConfigured = clientId && !clientId.includes('your_google_client_id') && clientId.length > 10;

    if (!isConfigured) {
      throw new Error(
        'Google sign-in is unavailable because the application is not configured for Google OAuth.'
      );
    }

    const google = await this.loadGoogleScript();
    if (!google?.accounts?.id) {
      throw new Error('Could not connect to Google Identity Services. Please check your internet connection.');
    }

    return new Promise((resolve, reject) => {
      try {
        let settled = false;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              settled = true;
              resolve({
                credential: response.credential,
                idToken: response.credential,
                provider: 'google',
              });
            } else {
              settled = true;
              reject(new Error('Google did not return an authentication credential.'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Trigger Google One Tap / popup
        google.accounts.id.prompt((notification) => {
          const unavailable = notification.isNotDisplayed?.() ||
            notification.isSkippedMoment?.() ||
            notification.isDismissedMoment?.();
          if (unavailable && !settled) {
            settled = true;
            reject(new Error('Google sign-in was not completed. Check the OAuth client ID and authorized origin.'));
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

}

export default GoogleAuthService;
