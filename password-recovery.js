(() => {
  'use strict';

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let client = null;
  let observer = null;

  function utils() {
    return window.HomeworkPasswordRecoveryUtils || window.HomeworkCloudAuthUtils;
  }

  function gate() {
    return document.getElementById('auth-gate');
  }

  function setError(message) {
    const el = document.getElementById('recovery-error');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function setSuccess(message) {
    const el = document.getElementById('recovery-success');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function setBusy(form, busy) {
    form?.querySelectorAll('button,input').forEach(el => { el.disabled = busy; });
  }

  async function waitForClient() {
    for (let i = 0; i < 120; i++) {
      if (window.HomeworkCloudClient) return window.HomeworkCloudClient;
      await sleep(100);
    }
    return null;
  }

  function renderRequest(presetEmail = '') {
    const root = gate();
    const U = utils();
    if (!root || !U) return;
    root.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand"><span class="auth-logo">↻</span><span>myhomework.</span></div>
        <p class="auth-kicker">НУУЦ ҮГ СЭРГЭЭХ</p>
        <h1>Gmail код авах</h1>
        <p class="auth-subtitle">Бүртгэлтэй Gmail-ээ оруулна уу. Нууц үг сэргээх код илгээнэ.</p>
        <form id="recovery-request-form">
          <label class="auth-field">Gmail<input id="recovery-email" type="email" autocomplete="email" inputmode="email" placeholder="example@gmail.com" required></label>
          <p class="auth-error" id="recovery-error" role="alert" hidden></p>
          <p class="auth-success" id="recovery-success" hidden></p>
          <button class="auth-primary" type="submit">Код илгээх</button>
          <button class="auth-secondary" id="recovery-back" type="button">Нэвтрэх рүү буцах</button>
        </form>
        <p class="auth-note">Аюулгүй байдлын үүднээс Gmail бүртгэлтэй эсэхийг энд ил гаргахгүй.</p>
      </div>`;

    const emailInput = document.getElementById('recovery-email');
    emailInput.value = presetEmail || '';
    document.getElementById('recovery-back').addEventListener('click', () => location.reload());
    document.getElementById('recovery-request-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const email = U.normalizeEmail(emailInput.value);
      if (!U.isGmail(email)) return setError('Зөв @gmail.com хаяг оруулна уу.');
      setBusy(form, true);
      const { error } = await client.auth.resetPasswordForEmail(email);
      setBusy(form, false);
      if (error) return setError(error.status === 429 ? 'Хэт олон оролдлого байна. Түр хүлээгээд дахин оролдоно уу.' : 'Код илгээж чадсангүй. Дахин оролдоно уу.');
      renderVerify(email);
    });
  }

  function renderVerify(email) {
    const root = gate();
    const U = utils();
    if (!root || !U) return;
    root.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand"><span class="auth-logo">✉</span><span>myhomework.</span></div>
        <p class="auth-kicker">PASSWORD RESET</p>
        <h1>Шинэ нууц үг</h1>
        <p class="auth-subtitle">Gmail-д ирсэн кодоо оруулаад шинэ нууц үгээ тохируулна уу.</p>
        <form id="recovery-verify-form">
          <label class="auth-field">Код<input id="recovery-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" pattern="[0-9]{6,8}" placeholder="000000" required></label>
          <label class="auth-field">Шинэ нууц үг<input id="recovery-password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
          <label class="auth-field">Нууц үг давтах<input id="recovery-password2" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
          <p class="auth-error" id="recovery-error" role="alert" hidden></p>
          <p class="auth-success" id="recovery-success" hidden></p>
          <button class="auth-primary" type="submit">Нууц үг солих</button>
          <button class="auth-secondary" id="recovery-resend" type="button">Код дахин илгээх</button>
          <button class="auth-secondary" id="recovery-cancel" type="button">Болих</button>
        </form>
        <p class="auth-note">${email}</p>
      </div>`;

    document.getElementById('recovery-cancel').addEventListener('click', () => location.reload());
    document.getElementById('recovery-resend').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      const { error } = await client.auth.resetPasswordForEmail(email);
      button.disabled = false;
      if (error) return setError('Код дахин илгээж чадсангүй. Түр хүлээгээд дахин оролдоно уу.');
      setSuccess('Шинэ код илгээлээ.');
    });

    document.getElementById('recovery-verify-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const token = document.getElementById('recovery-otp').value.trim();
      const password = document.getElementById('recovery-password').value;
      const password2 = document.getElementById('recovery-password2').value;
      if (!U.validOtp(token)) return setError('Gmail-д ирсэн 6–8 оронтой кодыг оруулна уу.');
      if (!U.validPassword(password)) return setError('Нууц үг 8–72 тэмдэгт байна.');
      if (!U.passwordsMatch(password, password2)) return setError('Нууц үгүүд таарахгүй байна.');

      setBusy(form, true);
      const { data, error } = await client.auth.verifyOtp({ email, token, type: 'recovery' });
      if (error || !data?.session) {
        setBusy(form, false);
        return setError('Код буруу эсвэл хугацаа дууссан байна.');
      }

      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        setBusy(form, false);
        return setError('Нууц үг солигдсонгүй. Өөр нууц үг сонгоод дахин оролдоно уу.');
      }

      await client.auth.signOut();
      root.innerHTML = `
        <div class="auth-card">
          <div class="auth-brand"><span class="auth-logo">✓</span><span>myhomework.</span></div>
          <p class="auth-kicker">АМЖИЛТТАЙ</p>
          <h1>Нууц үг шинэчлэгдлээ</h1>
          <p class="auth-subtitle">Одоо Gmail болон шинэ нууц үгээрээ нэвтэрнэ.</p>
          <button class="auth-primary" id="recovery-login" type="button">Нэвтрэх</button>
        </div>`;
      document.getElementById('recovery-login').addEventListener('click', () => location.reload());
    });
  }

  function installForgotButton() {
    const U = utils();
    if (!client || !U) return;
    const form = document.getElementById('auth-form');
    if (!form || document.getElementById('auth-name') || document.getElementById('forgot-password')) return;
    const emailInput = document.getElementById('auth-email');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'forgot-password';
    button.className = 'auth-secondary';
    button.textContent = 'Нууц үг мартсан уу?';
    button.addEventListener('click', () => renderRequest(emailInput?.value || ''));
    form.append(button);
  }

  async function boot() {
    client = await waitForClient();
    if (!client) return;
    installForgotButton();
    observer = new MutationObserver(installForgotButton);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer?.disconnect(), { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
