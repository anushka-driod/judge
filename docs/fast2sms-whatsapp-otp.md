# Phone OTP login status

Phone OTP login is currently disabled. The public `/api/auth/send-otp` and `/api/auth/verify-otp` endpoints are not mounted, and the login page only offers password and configured Google sign-in.

Email verification codes remain available for account verification and password-recovery flows. Fast2SMS WhatsApp/Smart OTP settings are not used for login; do not enable or rely on them for VidhiSetu authentication unless phone login is deliberately reintroduced and reviewed.

The provider code does not establish that an account has WhatsApp OTP delivery enabled. Any future activation requires provider-side authorization and an isolated implementation and delivery test.
