(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomeworkGoogleAuthUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function cleanRedirectUrl(locationLike) {
    const origin = String(locationLike?.origin || '');
    const pathname = String(locationLike?.pathname || '/');
    return origin + pathname;
  }

  function googleOAuthOptions(locationLike) {
    return {
      provider: 'google',
      options: { redirectTo: cleanRedirectUrl(locationLike) },
    };
  }

  function googleDisplayName(user) {
    const meta = user?.user_metadata || {};
    return String(
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      user?.email?.split('@')[0] ||
      'Хэрэглэгч'
    ).trim();
  }

  return { cleanRedirectUrl, googleOAuthOptions, googleDisplayName };
});
