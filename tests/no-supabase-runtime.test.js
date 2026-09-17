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
