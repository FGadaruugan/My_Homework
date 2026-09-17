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
