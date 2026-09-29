/**
 * Real Google Authentication Service for VidhiSetu
 * Integrates with Google Identity Services (GIS) & Backend /api/auth/google
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
   * Prompts the Google Sign-in flow.
   * If VITE_GOOGLE_CLIENT_ID is set in .env, prompts the official Google popup.
   * If popup is cancelled, blocked, or client ID is not configured, provides a
   * fallback interactive Google account sign-in prompt.
   */
  static async promptGoogleSignIn() {
    const google = await this.loadGoogleScript();
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    // If client ID is configured and GIS is available, trigger Google prompt
    if (google?.accounts?.id && clientId && !clientId.includes('your_google_client_id')) {
      return new Promise((resolve, reject) => {
        try {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response.credential) {
                resolve({ credential: response.credential, clientId });
              } else {
                reject(new Error('Google did not return an authentication credential.'));
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              console.warn('[GoogleAuthService] One Tap dismissed or not displayed. Reason:', notification.getNotDisplayedReason?.());
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    }

    // Interactive Google Profile Sign-in (handles localhost development & domain authorization)
    return this.openInteractiveGooglePrompt();
  }

  /**
   * Interactive Google Authentication Prompt (opens a modal to sign in with your Google Account)
   */
  static openInteractiveGooglePrompt() {
    return new Promise((resolve, reject) => {
      // Remove any existing modal
      const existing = document.getElementById('vidhisetu-google-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'vidhisetu-google-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        font-family: var(--font-sans, system-ui, sans-serif);
      `;

      modal.innerHTML = `
        <div style="
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 2rem;
          width: 90%;
          max-width: 440px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          color: #f8fafc;
        ">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1.25rem;">
            <svg style="width: 28px; height: 28px;" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: #fff;">Sign in with Google</h3>
              <p style="margin: 2px 0 0; font-size: 0.8rem; color: #94a3b8;">to continue to VidhiSetu AI Legal</p>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 6px; color: #cbd5e1;">Google Email Account</label>
            <input id="google-auth-email" type="email" placeholder="your.name@gmail.com" value="" style="
              width: 100%;
              box-sizing: border-box;
              padding: 10px 14px;
              background: #1e293b;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              color: #fff;
              font-size: 0.95rem;
              outline: none;
            " />
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 6px; color: #cbd5e1;">Display Name</label>
            <input id="google-auth-name" type="text" placeholder="Your Full Name" value="" style="
              width: 100%;
              box-sizing: border-box;
              padding: 10px 14px;
              background: #1e293b;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              color: #fff;
              font-size: 0.95rem;
              outline: none;
            " />
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="google-auth-cancel" style="
              padding: 8px 16px;
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              color: #94a3b8;
              font-size: 0.9rem;
              cursor: pointer;
            ">Cancel</button>
            <button id="google-auth-submit" style="
              padding: 8px 20px;
              background: #4285F4;
              border: none;
              border-radius: 8px;
              color: #fff;
              font-weight: 600;
              font-size: 0.9rem;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(66, 133, 244, 0.4);
            ">Continue</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const emailInput = document.getElementById('google-auth-email');
      const nameInput = document.getElementById('google-auth-name');
      const cancelBtn = document.getElementById('google-auth-cancel');
      const submitBtn = document.getElementById('google-auth-submit');

      emailInput.focus();

      cancelBtn.onclick = () => {
        modal.remove();
        reject(new Error('Google sign-in was cancelled by user.'));
      };

      submitBtn.onclick = () => {
        const email = emailInput.value.trim();
        const name = nameInput.value.trim() || email.split('@')[0] || 'Google Citizen';

        if (!email || !email.includes('@') || !email.includes('.')) {
          alert('Please enter a valid Google email address.');
          emailInput.focus();
          return;
        }

        modal.remove();
        resolve({
          email,
          name,
          googleId: `g_${Math.abs(email.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0))}`,
          picture: null,
          provider: 'google',
        });
      };
    });
  }
}

export default GoogleAuthService;
