(() => {
  'use strict';

  const SUPABASE_URL = 'https://jnhzxxtlnyfjwikcfroo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VLxutyZ5cYGcNROWGQ9dmw_6TkrIae3';
  const SUPABASE_JS = 'https://esm.sh/@supabase/supabase-js@2.116.0';
  const BACKUP_KEY = 'my-homework:pre-cloud-backup';

  const M = window.HomeworkModel;
  if (!M) return;

  let U = window.HomeworkCloudAuthUtils;
  let client;
  let activeUser = null;
  let cloudReady = false;
  let uploadTimer = null;
  let originalSetItem = null;

  async function ensureUtils() {
    if (U) return U;
    await import('./cloud-auth-utils.js');
    U = window.HomeworkCloudAuthUtils;
    if (!U) throw new Error('Auth utility ачаалагдсангүй.');
    return U;
  }

  function addStyles() {
    if (document.getElementById('cloud-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'cloud-auth-styles';
    style.textContent = `
      body.auth-locked{overflow:hidden}
      body.auth-locked>.app-shell{visibility:hidden}
      .auth-gate{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 16% 0%,rgba(86,112,255,.22),transparent 34%),radial-gradient(circle at 92% 12%,rgba(111,231,189,.15),transparent 26%),#f3f6fb;color:#18233a;font-family:"Segoe UI",Arial,sans-serif}
      .auth-card{width:min(450px,100%);background:rgba(255,255,255,.96);border:1px solid rgba(45,62,96,.11);border-radius:28px;padding:28px;box-shadow:0 28px 90px rgba(22,35,67,.18);backdrop-filter:blur(18px)}
      .auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:24px;font-size:22px;font-weight:800;letter-spacing:-.7px}
      .auth-logo{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#4361ee,#6581ff);color:#fff;box-shadow:0 12px 28px rgba(67,97,238,.23);font-weight:900}
      .auth-kicker{font-size:11px;letter-spacing:1.4px;font-weight:800;color:#748096;margin-bottom:7px}
      .auth-card h1{font-size:28px;line-height:1.2;margin:0;letter-spacing:-.8px}
      .auth-subtitle{color:#748096;font-size:14px;line-height:1.7;margin:9px 0 22px}
      .auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#eef2f8;padding:5px;border-radius:14px;margin-bottom:20px}
      .auth-tab{border:0;background:transparent;border-radius:10px;padding:10px 12px;font-weight:750;color:#667085;cursor:pointer}
      .auth-tab.active{background:#fff;color:#2f4dc5;box-shadow:0 4px 14px rgba(29,43,75,.08)}
      .auth-field{display:block;margin-top:14px;font-size:13px;font-weight:700;color:#45536b}
      .auth-field input{width:100%;box-sizing:border-box;margin-top:7px;min-height:50px;border:1px solid #dbe2ee;border-radius:13px;padding:12px 14px;background:#f9fbff;color:#18233a;font:inherit;font-size:16px;outline:none}
      .auth-field input:focus{background:#fff;border-color:#8ca3ff;box-shadow:0 0 0 4px rgba(67,97,238,.10)}
      .auth-primary,.auth-secondary{width:100%;min-height:50px;border:0;border-radius:13px;margin-top:20px;font:inherit;font-weight:800;cursor:pointer}
      .auth-primary{color:#fff;background:linear-gradient(135deg,#4361ee,#5f7cff);box-shadow:0 12px 28px rgba(67,97,238,.22)}
      .auth-primary:disabled,.auth-secondary:disabled{opacity:.65;cursor:wait}
      .auth-secondary{background:#eef2f8;color:#45536b;margin-top:10px}
      .auth-error,.auth-success{margin-top:13px;padding:10px 12px;border-radius:11px;font-size:13px;line-height:1.55}
      .auth-error{background:#fff0f3;color:#ae3b52}.auth-success{background:#eefaf5;color:#25795c}
      .auth-note{margin-top:14px;color:#7a869b;font-size:12px;line-height:1.65;text-align:center}
      .auth-loading{text-align:center;padding:18px 0;color:#748096}
      .otp-wrap{display:flex;gap:8px;margin-top:8px}.otp-wrap input{text-align:center;font-size:25px;font-weight:850;letter-spacing:8px;font-variant-numeric:tabular-nums}
      .account-tools{display:flex;align-items:center;gap:8px;margin-left:12px}
      .account-profile{border:1px solid #dfe5f0;background:#fff;color:#4b5870;border-radius:999px;padding:6px 10px 6px 6px;display:flex;align-items:center;gap:8px;font:inherit;font-size:12px;font-weight:750;cursor:pointer;max-width:210px}
      .account-avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#4361ee,#6e86ff);color:#fff;font-size:12px;font-weight:850;flex:none}
      .account-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-dot{width:7px;height:7px;border-radius:50%;background:#24a877;box-shadow:0 0 0 3px #ddf7ed;flex:none}
      .cloud-sync-state{font-size:11px;color:#7b879b;white-space:nowrap}
      .profile-backdrop{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;padding:20px;background:rgba(18,26,45,.44);backdrop-filter:blur(8px)}
      .profile-card{width:min(480px,100%);max-height:min(680px,90vh);overflow:auto;background:#fff;border-radius:26px;padding:24px;box-shadow:0 32px 100px rgba(12,24,52,.28);color:#18233a}
      .profile-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:20px}.profile-head-main{display:flex;align-items:center;gap:13px}.profile-avatar{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(135deg,#4361ee,#6e86ff);color:#fff;font-size:20px;font-weight:900}.profile-title{margin:0;font-size:22px}.profile-email{margin:4px 0 0;color:#7a869b;font-size:13px}.profile-close{border:0;background:#eef2f8;width:38px;height:38px;border-radius:12px;font-size:20px;cursor:pointer;color:#5c687d}
      .profile-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.profile-meta>div{padding:12px;border-radius:14px;background:#f6f8fc}.profile-meta span{display:block;color:#7b879b;font-size:11px;font-weight:750;margin-bottom:4px}.profile-meta strong{font-size:13px}.profile-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.profile-save,.profile-logout{min-height:46px;border:0;border-radius:13px;font:inherit;font-weight:800;cursor:pointer}.profile-save{background:#4361ee;color:#fff}.profile-logout{background:#fff0f3;color:#a73c53}.profile-status{margin-top:12px;font-size:12px;color:#6f7d93}
      @media(max-width:760px){.auth-card{padding:22px 18px;border-radius:23px}.auth-card h1{font-size:25px}.account-profile{padding:5px}.account-name,.cloud-sync-state{display:none}.profile-card{padding:20px 16px;border-radius:22px}.profile-meta,.profile-actions{grid-template-columns:1fr}.today-date{font-size:12px}}
    `;
    document.head.append(style);
  }

  function gate() {
    let el = document.getElementById('auth-gate');
    if (el) return el;
    el = document.createElement('section');
    el.id = 'auth-gate';
    el.className = 'auth-gate';
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
    return el;
  }

  function showLoading(text = 'Account шалгаж байна…') {
    document.body.classList.add('auth-locked');
    gate().innerHTML = `<div class="auth-card"><div class="auth-brand"><span class="auth-logo">✓</span><span>myhomework.</span></div><div class="auth-loading">${text}</div></div>`;
  }

  function canonicalRaw(value) {
    try {
      const raw = typeof value === 'string' ? value : JSON.stringify(value);
      return M.encode(M.decode(raw));
    } catch {
      return M.encode([]);
    }
  }

  function taskCount(raw) {
    try { return M.decode(raw).length; }
    catch { return 0; }
  }

  function displayName(user) {
    return String(user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Хэрэглэгч').trim();
  }

  function initialFor(user) {
    return displayName(user).charAt(0).toLocaleUpperCase('mn') || 'H';
  }

  function formatJoined(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('mn-MN', {year:'numeric', month:'short', day:'numeric'}).format(date);
  }

  function setAuthError(message) {
    const error = document.getElementById('auth-error');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function setAuthSuccess(message) {
    const info = document.getElementById('auth-success');
    if (!info) return;
    info.textContent = message;
    info.hidden = false;
  }

  function setBusy(form, busy) {
    form?.querySelectorAll('button,input').forEach(el => { el.disabled = busy; });
  }

  function renderAuth(mode = 'login', presetEmail = '') {
    document.body.classList.add('auth-locked');
    const isLogin = mode === 'login';
    gate().innerHTML = `
      <div class="auth-card">
        <div class="auth-brand"><span class="auth-logo">✓</span><span>myhomework.</span></div>
        <p class="auth-kicker">MY HOMEWORK ACCOUNT</p>
        <h1>${isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'}</h1>
        <p class="auth-subtitle">${isLogin ? 'Gmail болон нууц үгээрээ нэвтэрч, даалгавраа бүх төхөөрөмжөөс хараарай.' : 'Нэг Gmail = нэг account. Бүртгүүлсний дараа Gmail-д ирсэн 6 оронтой кодоор баталгаажуулна.'}</p>
        <div class="auth-tabs">
          <button type="button" class="auth-tab ${isLogin ? 'active' : ''}" data-auth-mode="login">Нэвтрэх</button>
          <button type="button" class="auth-tab ${!isLogin ? 'active' : ''}" data-auth-mode="register">Бүртгүүлэх</button>
        </div>
        <form id="auth-form" autocomplete="on">
          ${isLogin ? '' : '<label class="auth-field">Нэр<input id="auth-name" type="text" autocomplete="name" minlength="2" maxlength="60" placeholder="Таны нэр" required></label>'}
          <label class="auth-field">Gmail<input id="auth-email" type="email" autocomplete="email" inputmode="email" placeholder="example@gmail.com" required></label>
          <label class="auth-field">Нууц үг<input id="auth-password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="8" maxlength="72" placeholder="8-аас дээш тэмдэгт" required></label>
          ${isLogin ? '' : '<label class="auth-field">Нууц үг давтах<input id="auth-password2" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>'}
          <p class="auth-error" id="auth-error" role="alert" hidden></p>
          <button class="auth-primary" type="submit">${isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'}</button>
        </form>
        <p class="auth-note">Нууц үгээ бусдад бүү өг. Account нь Gmail баталгаажсаны дараа ашиглагдана.</p>
      </div>`;

    const emailInput = document.getElementById('auth-email');
    if (emailInput && presetEmail) emailInput.value = presetEmail;

    gate().querySelectorAll('[data-auth-mode]').forEach(button => {
      button.addEventListener('click', () => renderAuth(button.dataset.authMode, emailInput?.value || presetEmail));
    });
    document.getElementById('auth-form').addEventListener('submit', isLogin ? handleLogin : handleRegister);
  }

  function renderVerify(email) {
    document.body.classList.add('auth-locked');
    gate().innerHTML = `
      <div class="auth-card">
        <div class="auth-brand"><span class="auth-logo">✉</span><span>myhomework.</span></div>
        <p class="auth-kicker">GMAIL БАТАЛГААЖУУЛАЛТ</p>
        <h1>6 оронтой код</h1>
        <p class="auth-subtitle">Таны Gmail рүү баталгаажуулах код илгээлээ. Inbox болон Spam хэсгээ шалгаарай.</p>
        <form id="verify-form">
          <label class="auth-field">Баталгаажуулах код<div class="otp-wrap"><input id="auth-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required></div></label>
          <p class="auth-error" id="auth-error" role="alert" hidden></p>
          <p class="auth-success" id="auth-success" hidden></p>
          <button class="auth-primary" type="submit">Код баталгаажуулах</button>
          <button class="auth-secondary" id="resend-code" type="button">Код дахин илгээх</button>
          <button class="auth-secondary" id="back-login" type="button">Нэвтрэх хэсэг рүү</button>
        </form>
        <p class="auth-note" id="verify-email"></p>
      </div>`;
    document.getElementById('verify-email').textContent = email;
    document.getElementById('verify-form').addEventListener('submit', event => handleVerify(event, email));
    document.getElementById('back-login').addEventListener('click', () => renderAuth('login', email));
    document.getElementById('resend-code').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      const { error } = await client.auth.resend({ type: 'signup', email });
      button.disabled = false;
      if (error) return setAuthError('Код дахин илгээж чадсангүй. Түр хүлээгээд дахин оролдоно уу.');
      setAuthSuccess('Шинэ код илгээлээ.');
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = U.normalizeEmail(document.getElementById('auth-email').value);
    const password = document.getElementById('auth-password').value;
    if (!U.isGmail(email)) return setAuthError('Зөв @gmail.com хаяг оруулна уу.');
    if (!U.validPassword(password)) return setAuthError('Нууц үг 8–72 тэмдэгт байна.');

    setBusy(form, true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(form, false);
      return setAuthError('Gmail эсвэл нууц үг буруу, эсвэл Gmail баталгаажаагүй байна.');
    }
    location.reload();
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = document.getElementById('auth-name').value.trim();
    const email = U.normalizeEmail(document.getElementById('auth-email').value);
    const password = document.getElementById('auth-password').value;
    const password2 = document.getElementById('auth-password2').value;

    if (!U.validName(name)) return setAuthError('Нэр хамгийн багадаа 2 тэмдэгт байна.');
    if (!U.isGmail(email)) return setAuthError('Зөв @gmail.com хаяг оруулна уу.');
    if (!U.validPassword(password)) return setAuthError('Нууц үг 8–72 тэмдэгт байна.');
    if (password !== password2) return setAuthError('Нууц үгүүд таарахгүй байна.');

    setBusy(form, true);
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setBusy(form, false);

    if (error) {
      return setAuthError(error.status === 429 ? 'Хэт олон оролдлого хийсэн байна. Түр хүлээгээд дахин оролдоно уу.' : 'Бүртгэл үүсгэж чадсангүй. Gmail өмнө бүртгэлтэй эсэхийг шалгана уу.');
    }

    if (data?.session?.user) {
      location.reload();
      return;
    }
    renderVerify(email);
  }

  async function handleVerify(event, email) {
    event.preventDefault();
    const form = event.currentTarget;
    const token = document.getElementById('auth-otp').value.trim();
    if (!U.validOtp(token)) return setAuthError('6 оронтой код оруулна уу.');

    setBusy(form, true);
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data?.session) {
      setBusy(form, false);
      return setAuthError('Код буруу эсвэл хугацаа дууссан байна.');
    }
    location.reload();
  }

  async function getCloudRow(user) {
    const { data, error } = await client.from('homework_sync').select('data, updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function ensureCloudData(user) {
    const localStored = localStorage.getItem(M.KEY);
    const localRaw = canonicalRaw(localStored);
    const row = await getCloudRow(user);

    if (!row) {
      const { error } = await client.from('homework_sync').insert({
        user_id: user.id,
        public_id: user.id,
        data: JSON.parse(localRaw),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return false;
    }

    const remoteRaw = canonicalRaw(row.data);
    const localHasTasks = taskCount(localRaw) > 0;
    const remoteHasTasks = taskCount(remoteRaw) > 0;

    if (!remoteHasTasks && localHasTasks) {
      if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, localRaw);
      const { error } = await client.from('homework_sync').update({ data: JSON.parse(localRaw), updated_at: new Date().toISOString() }).eq('user_id', user.id);
      if (error) throw error;
      return false;
    }

    if (remoteRaw !== localRaw) {
      if (localHasTasks && !localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, localRaw);
      localStorage.setItem(M.KEY, remoteRaw);
      return true;
    }
    return false;
  }

  async function uploadRaw(raw) {
    if (!cloudReady || !activeUser) return;
    const safeRaw = canonicalRaw(raw);
    const state = document.getElementById('cloud-sync-state');
    if (state) state.textContent = 'Хадгалж байна…';
    const { error } = await client.from('homework_sync').update({
      data: JSON.parse(safeRaw),
      updated_at: new Date().toISOString(),
    }).eq('user_id', activeUser.id);
    if (state) state.textContent = error ? 'Sync алдаа' : 'Cloud-д хадгалагдсан';
  }

  function scheduleUpload(raw) {
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(() => uploadRaw(raw), 450);
  }

  function installStorageSync() {
    if (originalSetItem) return;
    originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      originalSetItem.call(this, key, value);
      if (this === localStorage && key === M.KEY && cloudReady) scheduleUpload(value);
    };
  }

  async function logout() {
    cloudReady = false;
    await client.auth.signOut();
    localStorage.removeItem(M.KEY);
    location.reload();
  }

  function refreshAccountButton() {
    const button = document.getElementById('account-profile');
    if (!button || !activeUser) return;
    button.querySelector('.account-avatar').textContent = initialFor(activeUser);
    button.querySelector('.account-name').textContent = displayName(activeUser);
  }

  function openProfile() {
    if (!activeUser || document.getElementById('profile-backdrop')) return;
    const overlay = document.createElement('section');
    overlay.id = 'profile-backdrop';
    overlay.className = 'profile-backdrop';
    overlay.innerHTML = `
      <div class="profile-card" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div class="profile-head">
          <div class="profile-head-main"><div class="profile-avatar" id="profile-avatar"></div><div><h2 class="profile-title" id="profile-title">Профайл</h2><p class="profile-email" id="profile-email"></p></div></div>
          <button type="button" class="profile-close" id="profile-close" aria-label="Профайл хаах">×</button>
        </div>
        <label class="auth-field">Нэр<input id="profile-name" type="text" minlength="2" maxlength="60"></label>
        <label class="auth-field">Gmail<input id="profile-gmail" type="email" disabled></label>
        <div class="profile-meta"><div><span>GMAIL</span><strong>Баталгаажсан ✓</strong></div><div><span>БҮРТГҮҮЛСЭН</span><strong id="profile-created"></strong></div></div>
        <div class="profile-actions"><button type="button" class="profile-save" id="profile-save">Нэр хадгалах</button><button type="button" class="profile-logout" id="profile-logout">Гарах</button></div>
        <div class="profile-status" id="profile-status">Cloud sync идэвхтэй.</div>
      </div>`;
    document.body.append(overlay);

    document.getElementById('profile-avatar').textContent = initialFor(activeUser);
    document.getElementById('profile-email').textContent = activeUser.email || '';
    document.getElementById('profile-gmail').value = activeUser.email || '';
    document.getElementById('profile-name').value = displayName(activeUser);
    document.getElementById('profile-created').textContent = formatJoined(activeUser.created_at);

    const close = () => overlay.remove();
    document.getElementById('profile-close').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.getElementById('profile-logout').addEventListener('click', logout);
    document.getElementById('profile-save').addEventListener('click', async event => {
      const name = document.getElementById('profile-name').value.trim();
      const status = document.getElementById('profile-status');
      if (!U.validName(name)) {
        status.textContent = 'Нэр хамгийн багадаа 2 тэмдэгт байна.';
        return;
      }
      event.currentTarget.disabled = true;
      const { data, error } = await client.auth.updateUser({ data: { ...activeUser.user_metadata, display_name: name } });
      event.currentTarget.disabled = false;
      if (error || !data?.user) {
        status.textContent = 'Нэр хадгалж чадсангүй.';
        return;
      }
      activeUser = data.user;
      document.getElementById('profile-avatar').textContent = initialFor(activeUser);
      status.textContent = 'Нэр хадгалагдлаа ✓';
      refreshAccountButton();
    });
  }

  function installAccountTools() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('account-tools')) return;
    const tools = document.createElement('div');
    tools.id = 'account-tools';
    tools.className = 'account-tools';
    tools.innerHTML = `<span class="cloud-sync-state" id="cloud-sync-state">Cloud-д хадгалагдсан</span><button type="button" class="account-profile" id="account-profile"><span class="account-dot"></span><span class="account-avatar"></span><span class="account-name"></span></button>`;
    topbar.append(tools);
    refreshAccountButton();
    document.getElementById('account-profile').addEventListener('click', openProfile);

    const note = document.querySelector('.local-note p');
    if (note) note.innerHTML = 'Cloud-д хадгалагдана.<br>Gmail account-аараа бусад төхөөрөмжөөс нэвтэрнэ.';
    const footer = document.querySelector('.page-footer span:last-child');
    if (footer) footer.textContent = 'Cloud sync идэвхтэй · Gmail account';
  }

  function unlockApp() {
    document.getElementById('auth-gate')?.remove();
    document.body.classList.remove('auth-locked');
  }

  async function boot() {
    addStyles();
    showLoading();
    try {
      await ensureUtils();
      const mod = await import(SUPABASE_JS);
      client = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
      window.HomeworkCloudClient = client;

      const { data, error } = await client.auth.getUser();
      const user = !error ? data?.user : null;
      if (!user) return renderAuth('login');

      if (!U.isGmail(user.email)) {
        await client.auth.signOut();
        return renderAuth('register');
      }

      activeUser = user;
      const needsReload = await ensureCloudData(activeUser);
      if (needsReload) return location.reload();

      installStorageSync();
      cloudReady = true;
      installAccountTools();
      unlockApp();
    } catch (error) {
      console.error('My Homework cloud:', error);
      gate().innerHTML = `<div class="auth-card"><div class="auth-brand"><span class="auth-logo">!</span><span>myhomework.</span></div><h1>Cloud холболтгүй байна</h1><p class="auth-subtitle">Интернет холболтоо шалгаад дахин ачаална уу.</p><button class="auth-primary" id="retry-cloud">Дахин оролдох</button></div>`;
      document.getElementById('retry-cloud')?.addEventListener('click', () => location.reload());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();