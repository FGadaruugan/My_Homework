const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'cloud-auth.js'), 'utf8');

assert.ok(source.includes("signInWithOAuth(G.googleOAuthOptions(window.location))"), 'Google OAuth must be the primary auth path');
assert.ok(source.includes('detectSessionInUrl: true'), 'OAuth return session must be detected from URL');
assert.ok(!source.includes('public_id:'), 'new cloud rows must not depend on legacy public_id');
assert.ok(!source.includes('client.auth.signUp('), 'new account creation must use Google OAuth instead of email signup OTP');
assert.ok(source.includes('client.auth.signInWithPassword'), 'legacy password login remains as temporary fallback');

console.log('cloud-auth contract tests passed');
