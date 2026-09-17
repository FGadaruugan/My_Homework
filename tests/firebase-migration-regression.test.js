const fs = require('fs');
const assert = require('assert');

for (const file of [
  'firebase.js','auth.js','firebase-auth-utils.js',
  'login.html','login.js','signup.html','signup.js',
  'profile.html','profile.js','cloud-sync.js','firestore.rules'
]) {
  assert.ok(fs.existsSync(file), `missing ${file}`);
}

const runtimeFiles = ['index.html','enhancements.js','auth.js','login.js','signup.js','profile.js','cloud-sync.js'];
const allRuntime = runtimeFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
assert.ok(!/supabase|verifyOtp|resend-code|6 оронтой/i.test(allRuntime));
assert.ok(allRuntime.includes('my_homework'));
assert.ok(fs.readFileSync('firestore.rules','utf8').includes('request.auth.uid == uid'));
assert.ok(fs.readFileSync('model.js','utf8').includes("const KEY = 'my-homework:v1'"));

console.log('firebase migration regression passed');
