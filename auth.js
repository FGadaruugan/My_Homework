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
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
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
