# Google Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth as the primary authentication path for the GitHub Pages app while preserving existing Supabase users, homework data, and a temporary password-login fallback.

**Architecture:** Keep the existing Supabase browser client and `homework_sync` RLS model. Add a small pure auth helper module for deployment redirect/profile-name logic, then update `cloud-auth.js` to start Google OAuth with `signInWithOAuth`, detect the returned session in the URL, and create cloud rows without legacy `public_id`. Keep password login only as a migration fallback until Google provider configuration is verified externally.

**Tech Stack:** Static GitHub Pages, JavaScript, Supabase JS 2.116.0, Supabase Auth, Google OAuth, Node.js assertions for pure helper tests.

**Spec:** `docs/superpowers/specs/2026-09-17-google-auth-migration-design.md`

## Global Constraints

- Never commit Google Client Secret, Supabase secret/service-role keys, SMTP passwords, or Resend keys.
- Keep only the Supabase publishable key client-side.
- Preserve `homework_sync` RLS keyed by `auth.uid()`.
- Do not delete existing users or identities during rollout.
- Production app URL is `https://fgadaruugan.github.io/My_Homework/`.
- Supabase OAuth callback is `https://jnhzxxtlnyfjwikcfroo.supabase.co/auth/v1/callback`.
- Google OAuth external configuration remains a manual prerequisite.

---

### Task 1: Pure Google Auth Helpers

**Files:**
- Create: `google-auth-utils.js`
- Create: `tests/google-auth-utils.test.js`

**Interfaces:**
- Produces `HomeworkGoogleAuthUtils.cleanRedirectUrl(locationLike): string`
- Produces `HomeworkGoogleAuthUtils.googleDisplayName(user): string`

- [ ] **Step 1: Write the failing test**

Test GitHub Pages URL cleanup, query/hash removal, and Google metadata name precedence.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/google-auth-utils.test.js`
Expected: FAIL because `google-auth-utils.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement a UMD/CommonJS-compatible helper matching the existing `cloud-auth-utils.js` style.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/google-auth-utils.test.js`
Expected: PASS.

### Task 2: Google OAuth Primary Login

**Files:**
- Modify: `cloud-auth.js`
- Modify: `auth-mobile.css`

**Interfaces:**
- Consumes `HomeworkGoogleAuthUtils.cleanRedirectUrl()` and `googleDisplayName()`.
- Produces Google OAuth login through `client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.

- [ ] **Step 1: Write failing static integration assertions**

Assert that production code contains Google OAuth, `detectSessionInUrl: true`, no `public_id` insert, and the Google button UI.

- [ ] **Step 2: Run assertions and verify failure**

Run: `node tests/google-auth-integration.test.js`
Expected: FAIL against current `cloud-auth.js`.

- [ ] **Step 3: Implement minimal OAuth integration**

Add Google primary button, migration fallback password form, clean redirect URL, OAuth error handling, Google metadata display name, and remove `public_id` from new cloud inserts.

- [ ] **Step 4: Run tests**

Run both Node test files and `node --check cloud-auth.js`.
Expected: PASS.

### Task 3: Loader and Legacy Recovery Isolation

**Files:**
- Modify: `enhancements.js`
- Keep: `password-recovery.js`, `password-recovery-utils.js` temporarily for rollback safety, but stop loading them by default.

**Interfaces:**
- Google OAuth becomes the normal unauthenticated entry point.
- Password recovery is not injected into the normal Google-first auth UI.

- [ ] **Step 1: Extend failing integration assertions**

Assert `enhancements.js` no longer calls `loadPasswordRecovery()` from boot.

- [ ] **Step 2: Verify failure**

Run: `node tests/google-auth-integration.test.js`.

- [ ] **Step 3: Remove default recovery loader call**

Keep recovery files untouched so rollback remains possible.

- [ ] **Step 4: Verify pass**

Run integration test and JavaScript syntax checks.

### Task 4: Database Compatibility Verification

**Files:**
- No schema change required unless verification finds a blocker.

**Interfaces:**
- New OAuth users insert `homework_sync(user_id, data, updated_at)` only.
- Existing verified email/password user should retain the same user UUID when Google identity is automatically linked by Supabase.

- [ ] **Step 1: Verify `public_id` is nullable and RLS is enabled**

Run SQL against the linked Supabase project.

- [ ] **Step 2: Verify ownership policies**

Confirm SELECT/INSERT/UPDATE/DELETE policies use `auth.uid() = user_id` and UPDATE includes both `USING` and `WITH CHECK`.

- [ ] **Step 3: Run Security Advisor if available**

Record any remaining unrelated warnings without weakening auth security.

### Task 5: Final Verification

**Files:**
- Re-fetch all modified GitHub files from `main`.

- [ ] **Step 1: Run fresh local verification**

Run:
`node tests/google-auth-utils.test.js`
`node tests/google-auth-integration.test.js`
`node --check cloud-auth.js`
`node --check enhancements.js`

- [ ] **Step 2: Verify repository content**

Confirm current GitHub blobs contain the intended OAuth flow and no secrets.

- [ ] **Step 3: Report external prerequisite**

Google provider still requires a Web OAuth Client ID/Secret configured in Google Auth Platform and Supabase Dashboard. Do not claim end-to-end Google login is live until that external setup is completed and tested in the browser.
