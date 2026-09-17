# Firebase Auth + Firestore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace My_Homework's Supabase/OTP runtime with Firebase Authentication + Firestore, using separate login, sign-up, and profile pages while preserving the existing homework UI and local data format.

**Architecture:** Reuse the working `badar-uuganlogni` Firebase Web project from `FGadaruugan/Message`. Authentication is isolated in `firebase.js` + `auth.js`; page-specific controllers own DOM/navigation; `cloud-sync.js` owns only authenticated `my_homework/{uid}` Firestore synchronization. Existing `HomeworkModel.KEY` (`my-homework:v1`) remains the browser cache and migration source.

**Tech Stack:** Static GitHub Pages, vanilla HTML/CSS/JavaScript, Firebase Web SDK 12.0.0 ESM, Firebase Authentication, Cloud Firestore, Node.js `assert`-based tests.

**Spec:** `docs/superpowers/specs/2026-09-17-firebase-auth-firestore-design.md`

## Global Constraints

- No 6-digit verification code.
- No custom SMTP dependency.
- Login, sign-up, and profile are separate HTML pages.
- Reuse Firebase project `badar-uuganlogni` and isolate My_Homework data under `my_homework/{uid}`.
- Do not store passwords in Firestore or localStorage.
- Do not commit Firebase Admin SDK credentials or service-account secrets.
- Preserve `HomeworkModel.KEY === 'my-homework:v1'` and its `{version:1,tasks:[]}` data format.
- Existing local homework must not be deleted during auth-provider migration.
- Firestore access must be constrained to `request.auth.uid == uid`.
- Mobile controls remain at least 48px high and auth pages must be scroll-safe.

---

### Task 1: Firebase core and pure helpers

**Files:**
- Create: `firebase.js`
- Create: `firebase-auth-utils.js`
- Create: `tests/firebase-auth-utils.test.js`

**Interfaces:**
- `firebase.js` produces named exports `app`, `auth`, `db`.
- `firebase-auth-utils.js` produces CommonJS/browser-compatible helpers: `normalizeEmail`, `validEmail`, `validPassword`, `validDisplayName`, `homeworkDocPath`, `firstSyncAction`, `safeAuthMessage`.
- Later tasks consume these helpers and Firebase instances.

- [ ] **Step 1: Write the failing helper test**

Create `tests/firebase-auth-utils.test.js`:

```js
const assert = require('assert');
const U = require('../firebase-auth-utils.js');

assert.strictEqual(U.normalizeEmail('  Student@Example.COM '), 'student@example.com');
assert.strictEqual(U.validEmail('student@example.com'), true);
assert.strictEqual(U.validEmail('bad-address'), false);
assert.strictEqual(U.validPassword('1234567'), false);
assert.strictEqual(U.validPassword('12345678'), true);
assert.strictEqual(U.validDisplayName('A'), false);
assert.strictEqual(U.validDisplayName('Badar'), true);
assert.strictEqual(U.homeworkDocPath('abc123'), 'my_homework/abc123');
assert.strictEqual(U.firstSyncAction({remoteExists:false, remoteHasTasks:false, localHasTasks:true, same:false}), 'upload-local');
assert.strictEqual(U.firstSyncAction({remoteExists:true, remoteHasTasks:true, localHasTasks:true, same:false}), 'use-remote');
assert.strictEqual(U.firstSyncAction({remoteExists:true, remoteHasTasks:false, localHasTasks:true, same:false}), 'upload-local');
assert.strictEqual(U.firstSyncAction({remoteExists:true, remoteHasTasks:false, localHasTasks:false, same:true}), 'none');
assert.strictEqual(U.safeAuthMessage('auth/wrong-password'), 'Имэйл эсвэл нууц үг буруу байна.');

console.log('firebase-auth-utils tests passed');
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
node tests/firebase-auth-utils.test.js
```

Expected: failure because `firebase-auth-utils.js` does not exist.

- [ ] **Step 3: Implement `firebase-auth-utils.js`**

Use this UMD structure so Node tests and the browser can share the exact functions:

```js
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomeworkFirebaseAuthUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function normalizeEmail(value){ return String(value || '').trim().toLowerCase(); }
  function validEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value)); }
  function validPassword(value){ const n = String(value || '').length; return n >= 8 && n <= 72; }
  function validDisplayName(value){ const n = String(value || '').trim().length; return n >= 2 && n <= 60; }
  function homeworkDocPath(uid){
    const safe = String(uid || '').trim();
    if (!safe || safe.includes('/')) throw new Error('Firebase uid буруу байна.');
    return `my_homework/${safe}`;
  }
  function firstSyncAction(state){
    if (state.same) return 'none';
    if (state.remoteHasTasks) return 'use-remote';
    if (state.localHasTasks) return 'upload-local';
    return 'none';
  }
  function safeAuthMessage(code){
    const map = {
      'auth/invalid-credential': 'Имэйл эсвэл нууц үг буруу байна.',
      'auth/wrong-password': 'Имэйл эсвэл нууц үг буруу байна.',
      'auth/email-already-in-use': 'Энэ имэйлээр бүртгэл аль хэдийн үүссэн байна.',
      'auth/weak-password': 'Илүү хүчтэй нууц үг сонгоно уу.',
      'auth/popup-closed-by-user': 'Google нэвтрэх цонх хаагдлаа.',
      'auth/network-request-failed': 'Интернет холболтоо шалгана уу.'
    };
    return map[code] || 'Үйлдэл амжилтгүй. Дахин оролдоно уу.';
  }
  return { normalizeEmail, validEmail, validPassword, validDisplayName, homeworkDocPath, firstSyncAction, safeAuthMessage };
});
```

- [ ] **Step 4: Implement `firebase.js` with the working Message Firebase web config**

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB_JVZJbR1d94TvhAaR7xhPY9mBzbt_u4M',
  authDomain: 'badar-uuganlogni.firebaseapp.com',
  projectId: 'badar-uuganlogni',
  storageBucket: 'badar-uuganlogni.firebasestorage.app',
  messagingSenderId: '231019802476',
  appId: '1:231019802476:web:17209da6f7cd2838ac8d49'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

- [ ] **Step 5: Verify GREEN and syntax**

Run:

```bash
node tests/firebase-auth-utils.test.js
node --check firebase-auth-utils.js
```

Expected: both commands exit 0 and print `firebase-auth-utils tests passed`.

- [ ] **Step 6: Commit Task 1**

```bash
git add firebase.js firebase-auth-utils.js tests/firebase-auth-utils.test.js
git commit -m "feat: add Firebase core and auth helpers"
```

---

### Task 2: Firebase authentication service

**Files:**
- Create: `auth.js`
- Create: `tests/firebase-auth-contract.test.js`

**Interfaces:**
- Consumes `auth`, `db` from `firebase.js` and `HomeworkFirebaseAuthUtils` semantics.
- Produces `register(email,password,displayName)`, `login(email,password)`, `googleLogin()`, `forgotPassword(email)`, `logout()`, `waitForUser()`, `requireUser()`, `redirectIfAuthenticated()`, `ensureHomeworkProfile(user)`, `updateDisplayName(name)`.

- [ ] **Step 1: Write a source contract test**

Create `tests/firebase-auth-contract.test.js`:

```js
const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('auth.js', 'utf8');

for (const token of [
  'createUserWithEmailAndPassword',
  'signInWithEmailAndPassword',
  'GoogleAuthProvider',
  'signInWithPopup',
  'sendPasswordResetEmail',
  'updateProfile',
  "doc(db, 'my_homework', user.uid)",
  'onAuthStateChanged'
]) assert.ok(src.includes(token), `missing ${token}`);

assert.ok(!src.includes('supabase'));
assert.ok(!src.includes('verifyOtp'));
console.log('firebase auth contract passed');
```

- [ ] **Step 2: Run the contract test and confirm RED**

```bash
node tests/firebase-auth-contract.test.js
```

Expected: failure because `auth.js` does not exist.

- [ ] **Step 3: Implement `auth.js`**

Use Firebase Auth and Firestore directly:

```js
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export async function ensureHomeworkProfile(user){
  const ref = doc(db, 'my_homework', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || user.email?.split('@')[0] || 'Хэрэглэгч',
      email: user.email || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      homeworkData: { version: 1, tasks: [] }
    });
  } else {
    await setDoc(ref, {
      displayName: user.displayName || snap.data().displayName || 'Хэрэглэгч',
      email: user.email || snap.data().email || '',
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  return user;
}

export async function register(email, password, displayName){
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await ensureHomeworkProfile(credential.user);
  return credential.user;
}
export async function login(email, password){
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureHomeworkProfile(credential.user);
  return credential.user;
}
export async function googleLogin(){
  const credential = await signInWithPopup(auth, provider);
  await ensureHomeworkProfile(credential.user);
  return credential.user;
}
export async function forgotPassword(email){ return sendPasswordResetEmail(auth, email); }
export async function logout(){ return signOut(auth); }
export function waitForUser(){
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => { unsubscribe(); resolve(user); });
  });
}
export async function requireUser(){
  const user = await waitForUser();
  if (!user) location.replace('./login.html');
  return user;
}
export async function redirectIfAuthenticated(){
  const user = await waitForUser();
  if (user) location.replace('./index.html');
  return user;
}
export async function updateDisplayName(name){
  if (!auth.currentUser) throw new Error('auth/no-current-user');
  await updateProfile(auth.currentUser, { displayName: name });
  await setDoc(doc(db, 'my_homework', auth.currentUser.uid), {
    displayName: name,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return auth.currentUser;
}
```

- [ ] **Step 4: Verify contract and syntax**

```bash
node tests/firebase-auth-contract.test.js
node --check auth.js
```

Expected: exit 0.

- [ ] **Step 5: Commit Task 2**

```bash
git add auth.js tests/firebase-auth-contract.test.js
git commit -m "feat: add Firebase authentication service"
```

---

### Task 3: Separate login and sign-up pages

**Files:**
- Create: `auth.css`
- Create: `login.html`
- Create: `login.js`
- Create: `signup.html`
- Create: `signup.js`
- Create: `tests/auth-pages-contract.test.js`

**Interfaces:**
- Page scripts consume `auth.js` and `firebase-auth-utils.js`.
- Successful login/sign-up redirects to `./index.html`.
- Login links to `./signup.html`; signup links to `./login.html`.

- [ ] **Step 1: Write the HTML contract test**

```js
const fs = require('fs');
const assert = require('assert');
const login = fs.readFileSync('login.html', 'utf8');
const signup = fs.readFileSync('signup.html', 'utf8');

assert.ok(login.includes('id="authForm"'));
assert.ok(login.includes('id="google-login"'));
assert.ok(login.includes('id="forgot-password"'));
assert.ok(login.includes('href="./signup.html"'));
assert.ok(login.includes('src="./login.js"'));
assert.ok(signup.includes('id="signupForm"'));
assert.ok(signup.includes('id="display-name"'));
assert.ok(signup.includes('id="password-confirm"'));
assert.ok(signup.includes('href="./login.html"'));
assert.ok(signup.includes('src="./signup.js"'));
assert.ok(!login.includes('6 оронтой'));
assert.ok(!signup.includes('6 оронтой'));
console.log('auth pages contract passed');
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
node tests/auth-pages-contract.test.js
```

Expected: missing page failure.

- [ ] **Step 3: Create shared `auth.css`**

Implement a centered desktop card and scroll-safe mobile layout. Required selectors:

```css
*{box-sizing:border-box}
html,body{min-height:100%;margin:0}
body.auth-page{min-height:100dvh;background:#f3f6fb;color:#18233a;font-family:"Segoe UI",Arial,sans-serif;overflow-y:auto}
.auth-layout{min-height:100dvh;display:grid;place-items:center;padding:24px}
.auth-card{width:min(460px,100%);background:#fff;border:1px solid #dfe6f1;border-radius:24px;padding:28px;box-shadow:0 24px 70px rgba(20,35,70,.14)}
.auth-brand{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:850;text-decoration:none;color:inherit;margin-bottom:22px}
.auth-mark{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#4361ee;color:#fff}
.auth-field{display:block;margin-top:14px;font-size:13px;font-weight:750}
.auth-field input{width:100%;min-height:50px;margin-top:7px;border:1px solid #dbe2ee;border-radius:13px;padding:12px 14px;font:inherit;font-size:16px}
.auth-primary,.auth-secondary{width:100%;min-height:50px;margin-top:16px;border:0;border-radius:13px;font:inherit;font-weight:800;cursor:pointer}
.auth-primary{background:#4361ee;color:#fff}.auth-secondary{background:#eef2f8;color:#34445f}
.auth-status{min-height:20px;margin:12px 0 0;font-size:13px;color:#a63d54}
.auth-links{text-align:center;margin:16px 0 0;font-size:13px;color:#69768c}
.auth-links a{color:#3455d1;font-weight:750}
@media(max-width:600px){.auth-layout{display:block;padding:max(12px,env(safe-area-inset-top)) 12px calc(24px + env(safe-area-inset-bottom))}.auth-card{margin:0 auto;padding:20px 16px;border-radius:20px}.auth-primary,.auth-secondary,.auth-field input{min-height:48px}}
```

- [ ] **Step 4: Create `login.html` and `login.js`**

`login.html` contains only login responsibilities: email, password, reset link, Google button, and sign-up link. Load helpers before the module:

```html
<script src="./firebase-auth-utils.js"></script>
<script type="module" src="./login.js"></script>
```

`login.js` behavior:

```js
import { login, googleLogin, forgotPassword, redirectIfAuthenticated } from './auth.js';
const U = window.HomeworkFirebaseAuthUtils;
await redirectIfAuthenticated();
const form = document.getElementById('authForm');
const status = document.getElementById('status');
const email = document.getElementById('email');
const password = document.getElementById('password');
function busy(value){ form.querySelectorAll('button,input').forEach(el => el.disabled = value); }
function show(message){ status.textContent = message; }
form.addEventListener('submit', async event => {
  event.preventDefault();
  const userEmail = U.normalizeEmail(email.value);
  if (!U.validEmail(userEmail) || !U.validPassword(password.value)) return show('Имэйл болон 8-аас дээш тэмдэгттэй нууц үгээ шалгана уу.');
  busy(true);
  try { await login(userEmail, password.value); location.replace('./index.html'); }
  catch (error) { show(U.safeAuthMessage(error.code)); busy(false); }
});
document.getElementById('google-login').addEventListener('click', async () => {
  busy(true);
  try { await googleLogin(); location.replace('./index.html'); }
  catch (error) { show(U.safeAuthMessage(error.code)); busy(false); }
});
document.getElementById('forgot-password').addEventListener('click', async event => {
  event.preventDefault();
  const userEmail = U.normalizeEmail(email.value);
  if (!U.validEmail(userEmail)) return show('Эхлээд зөв имэйлээ оруулна уу.');
  try { await forgotPassword(userEmail); show('Нууц үг шинэчлэх холбоос имэйл рүү илгээгдлээ.'); }
  catch (error) { show(U.safeAuthMessage(error.code)); }
});
```

- [ ] **Step 5: Create `signup.html` and `signup.js`**

Use fields `display-name`, `email`, `password`, `password-confirm`. Controller:

```js
import { register, redirectIfAuthenticated } from './auth.js';
const U = window.HomeworkFirebaseAuthUtils;
await redirectIfAuthenticated();
const form = document.getElementById('signupForm');
const status = document.getElementById('status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.getElementById('display-name').value.trim();
  const email = U.normalizeEmail(document.getElementById('email').value);
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('password-confirm').value;
  if (!U.validDisplayName(name)) return status.textContent = 'Нэр 2–60 тэмдэгт байна.';
  if (!U.validEmail(email)) return status.textContent = 'Зөв имэйл оруулна уу.';
  if (!U.validPassword(password)) return status.textContent = 'Нууц үг 8–72 тэмдэгт байна.';
  if (password !== confirm) return status.textContent = 'Нууц үгүүд таарахгүй байна.';
  form.querySelectorAll('button,input').forEach(el => el.disabled = true);
  try { await register(email, password, name); location.replace('./index.html'); }
  catch (error) {
    status.textContent = U.safeAuthMessage(error.code);
    form.querySelectorAll('button,input').forEach(el => el.disabled = false);
  }
});
```

- [ ] **Step 6: Verify page contracts and syntax**

```bash
node tests/auth-pages-contract.test.js
node --check login.js
node --check signup.js
```

Expected: exit 0.

- [ ] **Step 7: Commit Task 3**

```bash
git add auth.css login.html login.js signup.html signup.js tests/auth-pages-contract.test.js
git commit -m "feat: add separate Firebase login and signup pages"
```

---

### Task 4: Separate authenticated profile page

**Files:**
- Create: `profile.html`
- Create: `profile.js`
- Modify: `auth.css`
- Create: `tests/profile-page-contract.test.js`

**Interfaces:**
- Consumes `requireUser`, `updateDisplayName`, `logout` from `auth.js`.
- Produces profile navigation back to `index.html` and logout to `login.html`.

- [ ] **Step 1: Write profile contract test**

```js
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('profile.html', 'utf8');
const js = fs.readFileSync('profile.js', 'utf8');
assert.ok(html.includes('id="profile-name"'));
assert.ok(html.includes('id="profile-email"'));
assert.ok(html.includes('id="profile-created"'));
assert.ok(html.includes('id="profile-save"'));
assert.ok(html.includes('id="profile-logout"'));
assert.ok(js.includes('requireUser'));
assert.ok(js.includes('updateDisplayName'));
assert.ok(js.includes('logout'));
assert.ok(!html.toLowerCase().includes('password'));
console.log('profile page contract passed');
```

- [ ] **Step 2: Run and confirm RED**

```bash
node tests/profile-page-contract.test.js
```

- [ ] **Step 3: Implement `profile.html`**

Use the same `auth.css`; include a back link to `./index.html`, readonly email display, editable display name, created date, save button, and logout button. Do not render password fields.

- [ ] **Step 4: Implement `profile.js`**

```js
import { requireUser, updateDisplayName, logout } from './auth.js';
const U = window.HomeworkFirebaseAuthUtils;
const user = await requireUser();
if (user) {
  document.getElementById('profile-name').value = user.displayName || user.email?.split('@')[0] || '';
  document.getElementById('profile-email').value = user.email || '';
  document.getElementById('profile-created').textContent = user.metadata?.creationTime ? new Intl.DateTimeFormat('mn-MN', {year:'numeric',month:'short',day:'numeric'}).format(new Date(user.metadata.creationTime)) : '—';
}
document.getElementById('profile-save').addEventListener('click', async event => {
  const name = document.getElementById('profile-name').value.trim();
  const status = document.getElementById('status');
  if (!U.validDisplayName(name)) return status.textContent = 'Нэр 2–60 тэмдэгт байна.';
  event.currentTarget.disabled = true;
  try { await updateDisplayName(name); status.textContent = 'Нэр хадгалагдлаа ✓'; }
  catch { status.textContent = 'Нэр хадгалж чадсангүй.'; }
  event.currentTarget.disabled = false;
});
document.getElementById('profile-logout').addEventListener('click', async () => {
  await logout();
  location.replace('./login.html');
});
```

- [ ] **Step 5: Verify**

```bash
node tests/profile-page-contract.test.js
node --check profile.js
```

- [ ] **Step 6: Commit Task 4**

```bash
git add profile.html profile.js auth.css tests/profile-page-contract.test.js
git commit -m "feat: add separate Firebase profile page"
```

---

### Task 5: Firestore homework sync and auth gate

**Files:**
- Create: `cloud-sync.js`
- Create: `tests/cloud-sync-contract.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes `HomeworkModel`, `auth`, `db`, `requireUser`, and `HomeworkFirebaseAuthUtils`.
- Reads/writes only `my_homework/{uid}` and localStorage key `my-homework:v1`.
- Produces `#cloud-sync-state` and `#account-profile` UI in `.topbar`.

- [ ] **Step 1: Write the sync contract test**

```js
const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('cloud-sync.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
for (const token of ["doc(db, 'my_homework', user.uid)", 'getDoc', 'setDoc', 'serverTimestamp', 'requireUser', 'Storage.prototype.setItem']) assert.ok(src.includes(token), `missing ${token}`);
assert.ok(src.includes("location.replace('./login.html')") || src.includes('requireUser'));
assert.ok(!src.includes('supabase'));
assert.ok(html.includes('firebase-auth-utils.js'));
assert.ok(html.includes('cloud-sync.js'));
console.log('cloud sync contract passed');
```

- [ ] **Step 2: Run and confirm RED**

```bash
node tests/cloud-sync-contract.test.js
```

- [ ] **Step 3: Add the index auth-pending state**

In `index.html` add before existing app scripts:

```html
<script src="./firebase-auth-utils.js"></script>
<script type="module" src="./cloud-sync.js"></script>
```

Set `<body class="auth-pending">` and add a small CSS rule to existing styles or an inline `<style>`:

```css
body.auth-pending .app-shell{visibility:hidden}
```

`cloud-sync.js` removes `auth-pending` only after Firebase user/sync initialization succeeds.

- [ ] **Step 4: Implement canonical local conversion and Firestore first-sync logic**

Core implementation:

```js
import { db } from './firebase.js';
import { requireUser } from './auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const U = window.HomeworkFirebaseAuthUtils;
const M = window.HomeworkModel;
let activeUser = null;
let cloudReady = false;
let uploadTimer = null;
let originalSetItem = null;

function canonicalRaw(value){
  try { const raw = typeof value === 'string' ? value : JSON.stringify(value); return M.encode(M.decode(raw)); }
  catch { return M.encode([]); }
}
function taskCount(raw){ try { return M.decode(raw).length; } catch { return 0; } }
async function uploadRaw(raw){
  if (!cloudReady || !activeUser) return;
  const safeRaw = canonicalRaw(raw);
  const state = document.getElementById('cloud-sync-state');
  if (state) state.textContent = 'Хадгалж байна…';
  try {
    await setDoc(doc(db, 'my_homework', activeUser.uid), {
      displayName: activeUser.displayName || activeUser.email?.split('@')[0] || 'Хэрэглэгч',
      email: activeUser.email || '',
      homeworkData: JSON.parse(safeRaw),
      updatedAt: serverTimestamp()
    }, { merge: true });
    if (state) state.textContent = 'Cloud-д хадгалагдсан';
  } catch {
    if (state) state.textContent = 'Sync алдаа';
  }
}
```

First sync:

```js
async function firstSync(user){
  const ref = doc(db, 'my_homework', user.uid);
  const snap = await getDoc(ref);
  const localRaw = canonicalRaw(localStorage.getItem(M.KEY));
  const remoteRaw = snap.exists() ? canonicalRaw(snap.data().homeworkData) : M.encode([]);
  const action = U.firstSyncAction({
    remoteExists: snap.exists(),
    remoteHasTasks: taskCount(remoteRaw) > 0,
    localHasTasks: taskCount(localRaw) > 0,
    same: remoteRaw === localRaw
  });
  if (action === 'upload-local') {
    await setDoc(ref, { homeworkData: JSON.parse(localRaw), updatedAt: serverTimestamp() }, { merge:true });
    return false;
  }
  if (action === 'use-remote') {
    localStorage.setItem(M.KEY, remoteRaw);
    return true;
  }
  return false;
}
```

- [ ] **Step 5: Install debounced localStorage sync and account tools**

Patch `Storage.prototype.setItem` only once and debounce 450ms. Add a topbar profile link:

```js
function installAccountTools(){
  const topbar = document.querySelector('.topbar');
  if (!topbar || document.getElementById('account-tools')) return;
  const tools = document.createElement('div');
  tools.id = 'account-tools';
  tools.className = 'account-tools';
  tools.innerHTML = '<span id="cloud-sync-state">Cloud-д хадгалагдсан</span><a id="account-profile" href="./profile.html">Профайл</a>';
  topbar.append(tools);
  const note = document.querySelector('.local-note p');
  if (note) note.innerHTML = 'Firestore cloud-д хадгалагдана.<br>Account-аараа бусад төхөөрөмжөөс нэвтэрнэ.';
  const footer = document.querySelector('.page-footer span:last-child');
  if (footer) footer.textContent = 'Firebase cloud sync идэвхтэй';
}
function installStorageSync(){
  if (originalSetItem) return;
  originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value){
    originalSetItem.call(this, key, value);
    if (this === localStorage && key === M.KEY && cloudReady) {
      clearTimeout(uploadTimer);
      uploadTimer = setTimeout(() => uploadRaw(value), 450);
    }
  };
}
```

Boot:

```js
async function boot(){
  const user = await requireUser();
  if (!user) return;
  activeUser = user;
  const needsReload = await firstSync(user);
  if (needsReload) return location.reload();
  installStorageSync();
  cloudReady = true;
  installAccountTools();
  document.body.classList.remove('auth-pending');
}
boot().catch(error => {
  console.error('Firebase cloud sync:', error);
  location.replace('./login.html');
});
```

- [ ] **Step 6: Verify sync contracts and syntax**

```bash
node tests/cloud-sync-contract.test.js
node --check cloud-sync.js
```

- [ ] **Step 7: Commit Task 5**

```bash
git add cloud-sync.js index.html tests/cloud-sync-contract.test.js
git commit -m "feat: sync homework through Firestore"
```

---

### Task 6: Remove Supabase/OTP runtime and legacy embedded auth

**Files:**
- Modify: `enhancements.js`
- Delete: `cloud-auth.js`
- Delete: `cloud-auth-utils.js`
- Delete: `password-recovery.js`
- Delete: `password-recovery-utils.js`
- Delete: `auth-mobile.css`
- Create: `tests/no-supabase-runtime.test.js`

**Interfaces:**
- `enhancements.js` keeps only homework UI enhancements.
- Firebase auth/sync is loaded explicitly by auth pages and `index.html`, not dynamically through enhancements.

- [ ] **Step 1: Write the no-Supabase runtime test**

```js
const fs = require('fs');
const assert = require('assert');
const enhancement = fs.readFileSync('enhancements.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
assert.ok(!enhancement.includes('loadCloudAuth'));
assert.ok(!enhancement.includes('loadPasswordRecovery'));
assert.ok(!enhancement.includes('cloud-auth.js'));
assert.ok(!enhancement.includes('password-recovery.js'));
assert.ok(!index.includes('supabase'));
for (const file of ['cloud-auth.js','cloud-auth-utils.js','password-recovery.js','password-recovery-utils.js','auth-mobile.css']) {
  assert.strictEqual(fs.existsSync(file), false, `${file} should be removed`);
}
console.log('no Supabase runtime passed');
```

- [ ] **Step 2: Run and confirm RED**

```bash
node tests/no-supabase-runtime.test.js
```

Expected: fails because legacy files/loaders still exist.

- [ ] **Step 3: Remove loader functions from `enhancements.js`**

Delete the complete `loadCloudAuth()` and `loadPasswordRecovery()` functions. Change boot from:

```js
function boot() {
  loadCloudAuth();
  loadPasswordRecovery();
  installQuickActions();
```

to:

```js
function boot() {
  installQuickActions();
```

Keep all homework enhancement logic unchanged.

- [ ] **Step 4: Delete legacy Supabase/OTP files**

Delete exactly:

```text
cloud-auth.js
cloud-auth-utils.js
password-recovery.js
password-recovery-utils.js
auth-mobile.css
```

Do not delete historical docs/specs; they are project history and not runtime dependencies.

- [ ] **Step 5: Verify no runtime references remain**

```bash
node tests/no-supabase-runtime.test.js
node --check enhancements.js
```

Expected: exit 0.

- [ ] **Step 6: Commit Task 6**

```bash
git add -A
git commit -m "refactor: remove Supabase OTP runtime"
```

---

### Task 7: Firestore rules, full regression verification, and deployment checklist

**Files:**
- Create: `firestore.rules`
- Modify: `README.md`
- Create: `tests/firebase-migration-regression.test.js`

**Interfaces:**
- Security rules document the required ownership constraint for `my_homework/{uid}`.
- README records the one-time Firebase Console configuration required for GitHub Pages.

- [ ] **Step 1: Add Firestore rule reference**

Create `firestore.rules`:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // My_Homework rule. Merge this match block with the existing Message rules
    // in Firebase Console; do not replace unrelated /users rules.
    match /my_homework/{uid} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 2: Add README deployment section**

Document these exact manual checks:

```text
Firebase Console → Authentication → Sign-in method
- Email/Password: Enabled
- Google: Enabled

Firebase Console → Authentication → Settings → Authorized domains
- fgadaruugan.github.io must be authorized

Firebase Console → Firestore Database → Rules
- Merge the my_homework/{uid} ownership rule from firestore.rules with existing Message rules
- Publish the merged rules
```

Also state that `firebaseConfig` is browser client configuration, while Admin/service-account credentials must never be committed.

- [ ] **Step 3: Write the final regression source test**

```js
const fs = require('fs');
const assert = require('assert');
for (const file of ['firebase.js','auth.js','firebase-auth-utils.js','login.html','login.js','signup.html','signup.js','profile.html','profile.js','cloud-sync.js','firestore.rules']) {
  assert.ok(fs.existsSync(file), `missing ${file}`);
}
const allRuntime = ['index.html','enhancements.js','auth.js','login.js','signup.js','profile.js','cloud-sync.js'].map(f => fs.readFileSync(f,'utf8')).join('\n');
assert.ok(!/supabase|verifyOtp|resend-code|6 оронтой/i.test(allRuntime));
assert.ok(allRuntime.includes('my_homework'));
assert.ok(fs.readFileSync('firestore.rules','utf8').includes('request.auth.uid == uid'));
console.log('firebase migration regression passed');
```

- [ ] **Step 4: Run the full automated suite**

```bash
node tests/firebase-auth-utils.test.js
node tests/firebase-auth-contract.test.js
node tests/auth-pages-contract.test.js
node tests/profile-page-contract.test.js
node tests/cloud-sync-contract.test.js
node tests/no-supabase-runtime.test.js
node tests/firebase-migration-regression.test.js
node --check firebase-auth-utils.js
node --check auth.js
node --check login.js
node --check signup.js
node --check profile.js
node --check cloud-sync.js
node --check enhancements.js
```

Expected: every command exits 0.

- [ ] **Step 5: Review branch diff before integration**

```bash
git diff main...feature/firebase-auth-firestore --stat
git diff main...feature/firebase-auth-firestore -- index.html enhancements.js auth.js cloud-sync.js
```

Confirm the diff contains Firebase migration changes only and does not modify homework business logic in `app.js` or `model.js`.

- [ ] **Step 6: Manual GitHub Pages verification after Firebase Console rules/provider checks**

Verify in this order:

```text
1. Open signup.html → create a new email/password account → lands on index.html without OTP.
2. Logout from profile.html → lands on login.html.
3. Login with email/password → index.html opens.
4. Google button → Firebase popup succeeds → index.html opens.
5. Password reset → normal Firebase reset-link email is sent; no OTP screen appears.
6. Add one homework item → sync status changes to saved.
7. Refresh → task remains.
8. Sign in on a second browser/device → same Firestore homework appears.
9. Rename profile → refresh profile page → new name remains.
10. Directly open index.html while signed out → redirects to login.html.
```

- [ ] **Step 7: Commit Task 7**

```bash
git add firestore.rules README.md tests/firebase-migration-regression.test.js
git commit -m "docs: add Firebase security and deployment checks"
```
