(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomeworkCloudAuthUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function normalizeEmail(value){
    return String(value || '').trim().toLowerCase();
  }

  function isGmail(value){
    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i.test(normalizeEmail(value));
  }

  function validName(value){
    return String(value || '').trim().length >= 2;
  }

  function validPassword(value){
    const length = String(value || '').length;
    return length >= 8 && length <= 72;
  }

  function validOtp(value){
    return /^\d{6}$/.test(String(value || '').trim());
  }

  return { normalizeEmail, isGmail, validName, validPassword, validOtp };
});