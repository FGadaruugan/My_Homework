const assert = require('assert');
const U = require('../google-auth-utils.js');

assert.strictEqual(
  U.cleanRedirectUrl({ origin: 'https://fgadaruugan.github.io', pathname: '/My_Homework/', search: '?code=abc', hash: '#access_token=xyz' }),
  'https://fgadaruugan.github.io/My_Homework/'
);
assert.strictEqual(
  U.googleDisplayName({ user_metadata: { full_name: 'Google Name', name: 'Fallback Name', display_name: 'Old Name' }, email: 'student@gmail.com' }),
  'Google Name'
);
assert.strictEqual(
  U.googleDisplayName({ user_metadata: { name: 'Google Name', display_name: 'Old Name' }, email: 'student@gmail.com' }),
  'Google Name'
);
assert.strictEqual(
  U.googleDisplayName({ user_metadata: { display_name: 'Old Name' }, email: 'student@gmail.com' }),
  'Old Name'
);
assert.strictEqual(
  U.googleDisplayName({ user_metadata: {}, email: 'student@gmail.com' }),
  'student'
);

console.log('google-auth-utils tests passed');
