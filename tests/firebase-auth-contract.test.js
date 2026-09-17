const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('auth.js', 'utf8');
for (const token of ['createUserWithEmailAndPassword','signInWithEmailAndPassword','GoogleAuthProvider','signInWithPopup','sendPasswordResetEmail','updateProfile',"doc(db, 'my_homework', user.uid)",'onAuthStateChanged']) assert.ok(src.includes(token), `missing ${token}`);
assert.ok(!src.includes('supabase'));
assert.ok(!src.includes('verifyOtp'));
console.log('firebase auth contract passed');
