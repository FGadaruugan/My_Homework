(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomeworkPasswordRecoveryUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  function normalizeEmail(value){ return String(value || '').trim().toLowerCase(); }
  function isGmail(value){ return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i.test(normalizeEmail(value)); }
  function validOtp(value){ return /^\d{6,8}$/.test(String(value || '').trim()); }
  function validPassword(value){ const n = String(value || '').length; return n >= 8 && n <= 72; }
  function passwordsMatch(a, b){ return validPassword(a) && String(a) === String(b); }
  return { normalizeEmail, isGmail, validOtp, validPassword, passwordsMatch };
});
