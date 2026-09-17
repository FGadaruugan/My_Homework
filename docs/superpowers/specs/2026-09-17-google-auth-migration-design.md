# Google Auth Migration Design

## Goal
Replace fragile Gmail/password/SMTP verification flows with Google OAuth on the GitHub Pages frontend while preserving each user's existing Supabase account and `homework_sync` data.

## Current system
- Static GitHub Pages frontend.
- Supabase Auth + `homework_sync` table with RLS by `auth.uid()`.
- Existing email/password users and legacy synthetic users.
- Frontend auth logic currently lives mainly in `cloud-auth.js`, with password recovery split into `password-recovery.js` and `password-recovery-utils.js`.
- Current Supabase client uses a publishable key in the browser, which is appropriate with RLS enabled.

## Target architecture
Use Supabase hosted Google OAuth through `supabase.auth.signInWithOAuth({ provider: 'google' })`.

Because this is a static client-only GitHub Pages app, use the browser/implicit OAuth flow and allow Supabase JS to detect the returned session in the URL. The redirect target must be the exact GitHub Pages application URL, not a localhost default.

Google OAuth configuration:
- App type: Web application.
- Authorized JavaScript origin: `https://fgadaruugan.github.io`.
- Authorized redirect URI: `https://jnhzxxtlnyfjwikcfroo.supabase.co/auth/v1/callback`.
- Supabase Site URL / allowed redirect: `https://fgadaruugan.github.io/My_Homework/`.
- Google scopes limited to `openid`, email, and profile.
- Client secret stays only in Google/Supabase configuration and is never committed to GitHub.

## Identity migration
Supabase automatic identity linking should link a Google identity to an existing verified email/password user when the Google account uses the same email address. This preserves the existing Supabase `user.id`, so the user's existing `homework_sync.user_id` row continues to work without data migration.

Do not delete existing password identities or users during rollout. Existing accounts remain available until Google login is verified in production. Legacy synthetic `@myhomework.invalid` users are left untouched because they cannot be mapped safely to a real Google identity.

## Rollout strategy
Use a staged migration to avoid locking users out:

1. Add a Google sign-in button and OAuth flow while retaining the current password login temporarily.
2. Verify Google provider configuration and successful return to GitHub Pages.
3. Confirm an existing verified Gmail account keeps the same Supabase `user.id` and still sees the same homework data.
4. After verification, remove signup OTP, password-recovery UI, and SMTP dependence from the normal user flow.
5. Keep logout, profile display, and cloud sync.

## Frontend behavior
Unauthenticated users see a compact auth card with:
- `Google-ээр нэвтрэх` as the primary action.
- Temporary legacy Gmail/password login during migration only.
- Clear error text if the Google provider is not configured yet or OAuth returns an error.

On successful Google sign-in:
- Supabase session persists in browser storage.
- `cloud-auth.js` loads the current user.
- `ensureCloudData()` reuses the existing `homework_sync` row keyed by `user.id`.
- Profile name prefers Google `full_name` / `name`, then existing display name, then Gmail local-part.
- Avatar may use Google `avatar_url` if present, otherwise initials.

## OAuth session handling
The Supabase client must use:
- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: true`

The OAuth redirect target is derived from the deployed app location without query/hash noise so it works under the GitHub Pages repository path.

## Cloud sync cleanup
Remove the legacy `public_id` field from new inserts in frontend code. `homework_sync` should be keyed only by `user_id`; `public_id` must not participate in current auth or sync behavior.

RLS remains unchanged in principle: authenticated users can only access rows where `user_id = auth.uid()`.

## Files
- Modify `cloud-auth.js`: add Google OAuth, correct session URL detection, keep temporary legacy login, remove `public_id` insert, improve Google profile metadata handling.
- Modify `auth-mobile.css`: style Google button and keep mobile scrolling safe.
- Modify `enhancements.js`: stop loading password recovery after final cutover.
- Delete `password-recovery.js` and `password-recovery-utils.js` only after Google OAuth has been verified in production.
- Add focused auth utility tests if the repository test setup supports them; otherwise add browser-safe pure helper tests using the existing CommonJS-compatible utility style.

## Security requirements
- Never commit Google Client Secret, Supabase secret/service-role keys, SMTP passwords, or Resend keys.
- Keep only the Supabase publishable key client-side.
- Preserve RLS.
- Use exact production redirect URLs instead of wildcards where possible.
- Do not disable nonce/security checks as a permanent workaround.
- Do not delete existing user identities during migration.

## Acceptance criteria
1. On mobile and desktop, tapping `Google-ээр нэвтрэх` starts Google OAuth.
2. OAuth returns to `https://fgadaruugan.github.io/My_Homework/` and the app opens authenticated.
3. Refreshing the page keeps the session.
4. Signing out returns to the auth card.
5. An existing verified Gmail/password user signing in with the same Google email keeps access to the same homework data.
6. A new Google user gets a new `homework_sync` row without `public_id` being required by frontend code.
7. No SMTP email is required for the Google login path.
8. Mobile auth UI scrolls correctly and does not clip controls.

## Manual external prerequisite
Google OAuth cannot be completed from repository code alone. A Google Cloud OAuth Web Client ID and Client Secret must be created in Google Auth Platform and entered into Supabase Authentication > Providers > Google. The secret must never be pasted into chat or committed to the repository.
