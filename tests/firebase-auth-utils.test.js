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
