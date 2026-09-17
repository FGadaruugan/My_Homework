import { db } from './firebase.js';
import { requireUser } from './auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const U = window.HomeworkFirebaseAuthUtils;
let M = window.HomeworkModel;
let activeUser = null;
let cloudReady = false;
let uploadTimer = null;
let originalSetItem = null;

async function waitForModel(){
  if (M) return M;
  for (let i = 0; i < 100; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    M = window.HomeworkModel;
    if (M) return M;
  }
  throw new Error('HomeworkModel ачаалагдсангүй.');
}

function canonicalRaw(value){
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    return M.encode(M.decode(raw));
  } catch {
    return M.encode([]);
  }
}

function taskCount(raw){
  try { return M.decode(raw).length; }
  catch { return 0; }
}

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
  } catch (error) {
    console.error('Firestore upload:', error);
    if (state) state.textContent = 'Sync алдаа';
  }
}

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
    await setDoc(ref, {
      displayName: user.displayName || user.email?.split('@')[0] || 'Хэрэглэгч',
      email: user.email || '',
      homeworkData: JSON.parse(localRaw),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return false;
  }

  if (action === 'use-remote') {
    localStorage.setItem(M.KEY, remoteRaw);
    return true;
  }

  return false;
}

function installAccountTools(){
  const topbar = document.querySelector('.topbar');
  if (!topbar || document.getElementById('account-tools')) return;
  const tools = document.createElement('div');
  tools.id = 'account-tools';
  tools.className = 'account-tools';
  tools.innerHTML = '<span id="cloud-sync-state">Cloud-д хадгалагдсан</span><a id="account-profile" class="account-profile-link" href="./profile.html">Профайл</a>';
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

async function boot(){
  await waitForModel();
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
