# Google sign-in setup

Google sign-in is optional. When no Web client ID is configured, the login page
disables the Google button and continues to offer password and OTP sign-in.

1. In Google Cloud Console, create an OAuth 2.0 **Web application** client.
2. Add each frontend origin under **Authorized JavaScript origins**:
   - Local development: `http://localhost:5173`
   - Production: the exact HTTPS origin where the frontend is deployed
3. The current Google Identity Services flow uses a credential callback and
   does not use a redirect URI. If a redirect flow is introduced later, register
   its exact callback URI in Google Cloud Console before enabling it.
4. Set the same Web client ID in the root `.env` as
   `VITE_GOOGLE_CLIENT_ID` and in `backend/.env` as `GOOGLE_CLIENT_ID`.
5. Restart both Vite and the backend after changing environment configuration.

The client ID is public configuration, not a client secret. Never put a Google
client secret in the frontend or commit OAuth credentials. The backend verifies
the Google ID token signature, audience, issuer, expiry, and verified-email
claim before creating a session. A real Google sign-in remains unverified until
tested with the configured Cloud client and an authorized browser origin.
