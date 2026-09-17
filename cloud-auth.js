(() => {
  'use strict';

  const SUPABASE_URL = 'https://jnhzxxtlnyfjwikcfroo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VLxutyZ5cYGcNROWGQ9dmw_6TkrIae3';
  const SUPABASE_JS = 'https://esm.sh/@supabase/supabase-js@2.116.0';
  const BACKUP_KEY = 'my-homework:pre-cloud-backup';

  const M = window.HomeworkModel;
  if (!M) return;

  let client;
  let activeUser = null;
  let activePublicId = '';
  let cloudReady = false;
  let uploadTimer = null;
  let originalSetItem = null;

  function addStyles() {
    if (document.getElementById('cloud-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'cloud-auth-styles';
    style.textContent = `
      body.auth-locked{overflow:hidden}
      body.auth-locked>.app-shell{visibility:hidden}
      .auth-gate{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 16% 0%,rgba(86,112,255,.22),transparent 34%),radial-gradient(circle at 92% 12%,rgba(111,231,189,.15),transparent 26%),#f3f6fb;color:#18233a;font-family:"Segoe UI",Arial,sans-serif}
      .auth-card{width:min(440px,100%);background:rgba(255,255,255,.94);border:1px solid rgba(45,62,96,.11);border-radius:28px;padding:28px;box-shadow:0 28px 90px rgba(22,35,67,.18);backdrop-filter:blur(18px)}
      .auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:26px;font-size:22px;font-weight:800;letter-spacing:-.7px}
      .auth-logo{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#4361ee,#6581ff);color:#fff;box-shadow:0 12px 28px rgba(67,97,238,.23)}
      .auth-logo svg{width:24px;height:24px}
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
      .auth-primary:disabled{opacity:.65;cursor:wait}
      .auth-secondary{background:#eef2f8;color:#45536b;margin-top:10px}
      .auth-error{margin-top:13px;padding:10px 12px;border-radius:11px;background:#fff0f3;color:#ae3b52;font-size:13px;line-height:1.55}
      .auth-note{margin-top:14px;color:#7a869b;font-size:12px;line-height:1.65;text-align:center}
      .auth-id-card{padding:18px;border-radius:18px;background:linear-gradient(135deg,#eef2ff,#f7f9ff);border:1px solid #dce5ff;text-align:center;margin:18px 0 8px}
      .auth-id-card span{display:block;font-size:12px;font-weight:800;color:#6676a8;letter-spacing:.7px}
      .auth-id-card strong{display:block;font-size:42px;letter-spacing:4px;color:#2f4fc7;margin:4px 0;font-variant-numeric:tabular-nums}
      .auth-copy{border:0;background:#fff;color:#3d57bd;border-radius:10px;padding:8px 12px;font-weight:750;cursor:pointer;box-shadow:0 4px 12px rgba(35,55,95,.08)}
      .auth-loading{text-align:center;padding:18px 0;color:#748096}
      .account-tools{display:flex;align-items:center;gap:8px;margin-left:12px}
      .account-id{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #dfe5f0;border-radius:999px;background:#fff;color:#536079;font-size:12px;font-weight:750;white-space:nowrap}
      .account-dot{width:7px;height:7px;border-radius:50%;background:#24a877;box-shadow:0 0 0 3px #ddf7ed}
      .account-logout{border:0;background:#eef2f8;color:#5b677c;border-radius:10px;padding:8px 10px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
      .cloud-sync-state{font-size:11px;color:#7b879b;margin-left:auto}
      @media(max-width:760px){.auth-card{padding:22px 18px;border-radius:23px}.auth-card h1{font-size:25px}.account-id{padding:6px 8px}.account-id .account-label{display:none}.account-logout{padding:7px 8px}.today-date{font-size:12px}}
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

  function emailForId(id) {
    return `u${id}@myhomework.invalid`;
  }

  function publicIdFromUser(user) {
    const meta = user?.user_metadata?.public_id;
    if (typeof meta === 'string' && /^\d{6}$/.test(meta)) return meta;
    const match = String(user?.email || '').match(/^u(\d{6})@/);
    return match ? match[1] : '';
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

  function setAuthError(message) {
    const error = document.getElementById('auth-error');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function setBusy(form, busy) {
    form.querySelectorAll('button,input').forEach(el => { el.disabled = busy; });
  }

  function renderAuth(mode = 'login', presetId = '') {
    document.body.classList.add('auth-locked');
    const isLogin = mode === 'login';
    gate().innerHTML = `
      <div class="auth-card">
        <div class="auth-brand"><span class="auth-logo">✓</span><span>myhomework.</span></div>
        <p class="auth-kicker">CLOUD ACCOUNT</p>
        <h1>${isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'}</h1>
        <p class="auth-subtitle">${isLogin ? 'Өөрийн ID-аар орж даалгавруудаа бүх төхөөрөмжөөс хараарай.' : 'Шинэ 6 оронтой ID үүсгээд даалгавраа cloud-д хадгална.'}</p>
        <div class="auth-tabs">
          <button type="button" class="auth-tab ${isLogin ? 'active' : ''}" data-auth-mode="login">Нэвтрэх</button>
          <button type="button" class="auth-tab ${!isLogin ? 'active' : ''}" data-auth-mode="register">Бүртгүүлэх</button>
        </div>
        <form id="auth-form" autocomplete="on">
          ${isLogin ? `<label class="auth-field">ID<input id="auth-id" inputmode="numeric" autocomplete="username" maxlength="6" pattern="[0-9]{6}" placeholder="Ж: 381742" value="${presetId}" required></label>` : ''}
          <label class="auth-field">Нууц код<input id="auth-password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="8" maxlength="72" placeholder="8-аас дээш тэмдэгт" required></label>
          ${!isLogin ? '<label class="auth-field">Нууц код давтах<input id="auth-password2" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>' : ''}
          <p class="auth-error" id="auth-error" role="alert" hidden></p>
          <button class="auth-primary" type="submit">${isLogin ? 'Нэвтрэх' : 'Шинэ ID үүсгэх'}</button>
        </form>
        <p class="auth-note">ID-гаа санаж эсвэл аюулгүй газар хадгалаарай. Нууц кодоо бусдад бүү өг.</p>
      </div>`;

    gate().querySelectorAll('[data-auth-mode]').forEach(button => {
      button.addEventListener('click', () => renderAuth(button.dataset.authMode, presetId));
    });

    document.getElementById('auth-form').addEventListener('submit', isLogin ? handleLogin : handleRegister);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const id = document.getElementById('auth-id').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!/^\d{6}$/.test(id)) return setAuthError('ID 6 оронтой тоо байна.');
    if (password.length < 8) return setAuthError('Нууц код хамгийн багадаа 8 тэмдэгт байна.');

    setBusy(form, true);
    const { error } = await client.auth.signInWithPassword({ email: emailForId(id), password });
    if (error) {
      setBusy(form, false);
      return setAuthError('ID эсвэл нууц код буруу байна.');
    }
    location.reload();
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = document.getElementById('auth-password').value;
    const password2 = document.getElementById('auth-password2').value;
    if (password.length < 8) return setAuthError('Нууц код хамгийн багадаа 8 тэмдэгт байна.');
    if (password !== password2) return setAuthError('Нууц кодууд таарахгүй байна.');

    setBusy(form, true);
    const { data, error } = await client.functions.invoke('register-homework-user', { body: { password } });
    if (error || !data?.id) {
      setBusy(form, false);
      return setAuthError(data?.error || 'Бүртгэл үүсгэж чадсангүй. Дахин оролдоно уу.');
    }

    const id = String(data.id);
    const login = await client.auth.signInWithPassword({ email: emailForId(id), password });
    showCreatedId(id, !login.error);
  }

  function showCreatedId(id, signedIn) {
    gate().innerHTML = `
      <div class="auth-card">
        <div class="auth-brand"><span class="auth-logo">✓</span><span>myhomework.</span></div>
        <p class="auth-kicker">ACCOUNT ҮҮСЛЭЭ</p>
        <h1>Таны ID</h1>
        <p class="auth-subtitle">Энэ ID-г дараа өөр төхөөрөмжөөс нэвтрэхдээ ашиглана.</p>
        <div class="auth-id-card"><span>MY HOMEWORK ID</span><strong>${id}</strong><button type="button" class="auth-copy" id="copy-account-id">ID хуулах</button></div>
        <button type="button" class="auth-primary" id="continue-account">${signedIn ? 'ID-гаа хадгалсан · Үргэлжлүүлэх' : 'Нэвтрэх хэсэг рүү'}</button>
      </div>`;
    document.getElementById('copy-account-id').addEventListener('click', async event => {
      try {
        await navigator.clipboard.writeText(id);
        event.currentTarget.textContent = 'Хууллаа ✓';
      } catch {
        event.currentTarget.textContent = id;
      }
    });
    document.getElementById('continue-account').addEventListener('click', () => {
      if (signedIn) location.reload();
      else renderAuth('login', id);
    });
  }

  async function getCloudRow(user) {
    const { data, error } = await client.from('homework_sync').select('data, public_id, updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function ensureCloudData(user) {
    const publicId = publicIdFromUser(user);
    if (!publicId) throw new Error('Account ID олдсонгүй.');
    activePublicId = publicId;

    const localStored = localStorage.getItem(M.KEY);
    const localRaw = canonicalRaw(localStored);
    const row = await getCloudRow(user);

    if (!row) {
      const { error } = await client.from('homework_sync').insert({
        user_id: user.id,
        public_id: publicId,
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
    if (!cloudReady || !activeUser || !activePublicId) return;
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

  function installAccountTools() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('account-tools')) return;
    const tools = document.createElement('div');
    tools.id = 'account-tools';
    tools.className = 'account-tools';
    tools.innerHTML = `<span class="account-id"><span class="account-dot"></span><span class="account-label">ID</span> ${activePublicId}</span><span class="cloud-sync-state" id="cloud-sync-state">Cloud sync</span><button type="button" class="account-logout" id="account-logout">Гарах</button>`;
    topbar.append(tools);
    document.getElementById('account-logout').addEventListener('click', async () => {
      cloudReady = false;
      await client.auth.signOut();
      localStorage.removeItem(M.KEY);
      location.reload();
    });

    const note = document.querySelector('.local-note p');
    if (note) note.innerHTML = 'Cloud-д хадгалагдана.<br>Ижил ID-аар бусад төхөөрөмжөөс нэвтэрнэ.';
    const footer = document.querySelector('.page-footer span:last-child');
    if (footer) footer.textContent = 'Cloud sync идэвхтэй · ID ' + activePublicId;
  }

  function unlockApp() {
    document.getElementById('auth-gate')?.remove();
    document.body.classList.remove('auth-locked');
  }

  async function boot() {
    addStyles();
    showLoading();
    try {
      const mod = await import(SUPABASE_JS);
      client = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
      window.HomeworkCloudClient = client;

      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) return renderAuth('login');

      activeUser = session.user;
      const needsReload = await ensureCloudData(activeUser);
      if (needsReload) return location.reload();

      installStorageSync();
      cloudReady = true;
      installAccountTools();
      unlockApp();
    } catch (error) {
      console.error('My Homework cloud:', error);
      gate().innerHTML = `<div class="auth-card"><div class="auth-brand"><span class="auth-logo">!</span><span>myhomework.</span></div><h1>Cloud холболтгүй байна</h1><p class="auth-subtitle">Интернет холболтоо шалгаад дахин ачаална уу.</p><button class="auth-primary" onclick="location.reload()">Дахин оролдох</button></div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
