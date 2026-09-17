# Firebase Auth + Firestore Migration Design

## Goal
Replace the current Supabase email/OTP authentication and cloud sync with the same Firebase Authentication approach already used by `FGadaruugan/Message`, while keeping My_Homework as a static GitHub Pages app.

## Confirmed user requirements
- No 6-digit verification code.
- Use Firebase Authentication and Firestore, following the working Message project pattern.
- Login, sign-up, and profile must be separate HTML pages, not one combined form.
- Keep the existing homework UI in `index.html`.
- Continue cloud sync across devices.
- Mobile and desktop must both work.

## Firebase project
Reuse the existing Firebase Web project already used by Message:
- projectId: `badar-uuganlogni`
- authDomain: `badar-uuganlogni.firebaseapp.com`

The Firebase Web configuration is public client configuration and may live in `firebase.js`. No admin SDK key, service-account private key, or other server secret will be committed.

My_Homework data is isolated from Message data by using a separate top-level Firestore collection:

```text
my_homework/{uid}
```

Each document contains only My_Homework data:

```js
{
  displayName: string,
  email: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  homeworkData: {
    version: 1,
    tasks: []
  }
}
```

Do not reuse Message's `users/{uid}` document for homework data. This avoids coupling the math app's `score`/`level` profile schema to My_Homework.

## Authentication flows

### Login page — `login.html`
- Email + password login using Firebase `signInWithEmailAndPassword`.
- Google login using `GoogleAuthProvider` + `signInWithPopup`, matching Message's working approach.
- `Нууц үг мартсан?` uses Firebase `sendPasswordResetEmail` and sends Firebase's normal reset link. No OTP UI.
- If already authenticated, redirect directly to `index.html`.

### Sign-up page — `signup.html`
- Fields: display name, email, password, password confirmation.
- Account creation uses `createUserWithEmailAndPassword`.
- Immediately update the Firebase Auth profile with `updateProfile({ displayName })`.
- Ensure `my_homework/{uid}` exists with an initial empty homework state.
- No email verification code and no verification page.
- On success redirect to `index.html`.

### Profile page — `profile.html`
- Authenticated-only page.
- Show display name, email, account-created date, cloud sync state.
- Allow changing display name with Firebase `updateProfile` and update Firestore profile metadata.
- Logout button calls Firebase `signOut`, then redirects to `login.html`.
- Do not allow email/password secrets to be displayed.

### App page — `index.html`
- Require a Firebase Auth user before starting cloud sync.
- If unauthenticated, redirect to `login.html`.
- Profile control links to `profile.html` rather than opening an embedded profile modal.

## JavaScript structure

### `firebase.js`
Single Firebase initialization module. Exports:
- `app`
- `auth`
- `db`

Uses the same Firebase Web configuration as Message and imports Firebase v12 modules from `gstatic`.

### `auth.js`
Pure authentication wrapper for My_Homework. Exports:
- `register(email, password, displayName)`
- `login(email, password)`
- `googleLogin()`
- `forgotPassword(email)`
- `logout()`
- `requireUser()`
- `redirectIfAuthenticated()`
- `ensureHomeworkProfile(user)`
- `updateDisplayName(name)`

The module owns Firebase Auth calls, while page scripts own DOM rendering and navigation.

### `login.js`
Login page controller only. Validates fields, manages button busy state, shows safe user-facing errors, redirects after success.

### `signup.js`
Sign-up page controller only. Validates display name, email, password length, password confirmation, creates account, redirects after success.

### `profile.js`
Profile page controller only. Loads the current Firebase user, renders profile information, saves display-name changes, and logs out.

### `cloud-sync.js`
Authenticated Firestore sync only. Responsibilities:
- Require the current Firebase user.
- Read `my_homework/{uid}`.
- On first login, if the Firestore document has no tasks but localStorage has tasks, seed Firestore from localStorage.
- If Firestore has tasks, use Firestore as the canonical cloud state and refresh localStorage.
- Observe localStorage writes for `HomeworkModel.KEY` and debounce uploads.
- Show sync status in the app UI.
- Never read or write another user's uid.

### Existing Supabase files
After Firebase flow is verified, remove the runtime dependency on:
- `cloud-auth.js`
- `cloud-auth-utils.js`
- `password-recovery.js`
- `password-recovery-utils.js`
- `google-auth-utils.js` from the abandoned Supabase Google-OAuth branch is not part of this branch.

Files may be deleted only when no production HTML/JS imports them.

## Homework data migration
No direct browser-safe mapping exists between a previous Supabase uid and a new Firebase uid. Therefore migration is local-first:

1. Existing homework in `localStorage` is preserved during logout/auth migration.
2. On the first successful Firebase login, `cloud-sync.js` checks Firestore.
3. If the Firebase Firestore homework document is empty and local homework exists, upload the local homework state.
4. Never clear local homework merely because auth provider changed.
5. After the first successful Firestore sync, Firestore becomes the cloud source of truth.

This preserves the user's current-device homework without exposing Supabase admin data or adding an unsafe migration endpoint.

## Firestore security rules
Production Firestore rules must include a user-owned rule for the new collection:

```text
match /my_homework/{uid} {
  allow read, create, update, delete: if request.auth != null && request.auth.uid == uid;
}
```

The implementation repository will include a `firestore.rules` reference file. The rules must also be published in Firebase Console before relying on Firestore in production.

## UI
Create a shared `auth.css` used by login/sign-up/profile pages. Keep the visual language consistent with the existing My_Homework UI:
- compact centered card on desktop
- full-height scroll-safe layout on mobile
- clear primary action
- responsive inputs at least 48px high
- no combined tabbed Login/Sign-up form

Navigation:
- `login.html` → links to `signup.html`
- `signup.html` → links to `login.html`
- successful login/sign-up → `index.html`
- app profile button → `profile.html`
- profile logout → `login.html`

## Error handling
Map Firebase auth failures to generic Mongolian messages instead of exposing raw Firebase errors. Specific field validation happens before network calls. Buttons are disabled while requests are pending to prevent duplicate submissions.

Password-reset responses remain generic enough not to disclose whether an account exists when possible.

## Security constraints
- Never commit Firebase Admin SDK credentials or service-account secrets.
- Client Firebase Web config is allowed in the static frontend.
- Firestore authorization is enforced by Firebase Security Rules, not by hidden UI controls.
- Every My_Homework Firestore document is keyed by Firebase `auth.uid`.
- No password is stored in Firestore/localStorage.
- No OTP or custom SMTP flow remains.

## Testing
Add browser-independent helper/contract tests for:
- auth page navigation targets
- validation helpers
- Firestore document path generation
- local-vs-cloud first-sync decision
- ensuring old Supabase runtime imports are removed

Run JavaScript syntax checks for every new JS module. Manually verify the final flow in GitHub Pages after Firebase security rules are published:
1. sign up
2. login
3. Google login
4. reset-password email
5. refresh session persistence
6. homework upload
7. second-device/cloud reload
8. profile rename
9. logout

## Acceptance criteria
1. `login.html`, `signup.html`, and `profile.html` are separate working pages.
2. Email/password sign-up creates a Firebase account without a 6-digit verification step.
3. Email/password login opens the homework app.
4. Google popup login works using the Message project's Firebase Auth configuration.
5. Password reset uses a normal Firebase email link.
6. Unauthenticated users cannot open the homework app or another user's Firestore data.
7. Existing local homework is seeded into Firestore on first Firebase login when remote state is empty.
8. Homework changes sync to `my_homework/{uid}` and reload on another signed-in device.
9. Profile page displays and updates the current user's name and can log out.
10. Supabase Auth/OTP/SMTP is no longer required at runtime.
