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
