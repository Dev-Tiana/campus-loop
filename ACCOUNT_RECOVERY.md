# Self-service account recovery
Customers and providers can open /signin?recover=1, verify their original Google account, review the existing profile, and confirm sign-in. No password or duplicate signup is needed for Google-authoritative ownership (Gmail or verified Google Workspace). Google accounts using other providers' email addresses require the original sign-in method unless an existing Google subject is already linked.

The isolated Supabase function campusloop-recovery handles only GET /api/recovery/google, POST /api/recovery/verify and POST /api/recovery/confirm. The primary API, admin authentication and core app shell are unchanged. Vercel routes the /api/recovery prefix before the existing general API rewrite.

The existing JWT verifier checks Google signature, issuer, audience, expiry, verified email and nonce. Authority metadata is derived only after that verification. A unique existing regular account is required; no account is created. Admin accounts, suspended users, duplicate emails and conflicting Google subjects cannot be recovered by email.

Verification creates no authenticated session and does not link Google. It issues a ten-minute HttpOnly/Secure/SameSite=Lax browser proof. The separate confirmation identifier binds the displayed profile to that exact proof, including across tabs. Only a valid confirmation updates the Google subject and issues the normal Campus Loop session. Used or expired confirmations fail. Other confirmations for the account are invalidated, prior sessions for that account are revoked, roles/password hashes/history are preserved, and a private recovery audit event is stored.

API state mutations use revision-checked compare-and-swap. State tables and credentials remain private. Recovery proof creation is limited to five per account per ten-minute window after valid Google proof. Unknown addresses are never looked up publicly before Google verification.

Tests cover signed Google proof through confirmation and subsequent original API sign-in in an isolated store, forged tokens, replay, expiry, different profiles/tabs, conflicting identities, role preservation, admin separation and UI rendering. Personal Google consent and on-device browser interactions still require real-user verification.
