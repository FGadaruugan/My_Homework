import { register, redirectIfAuthenticated } from './auth.js';
const U = window.HomeworkFirebaseAuthUtils;
await redirectIfAuthenticated();
const form = document.getElementById('signupForm');
const status = document.getElementById('status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.getElementById('display-name').value.trim();
  const email = U.normalizeEmail(document.getElementById('email').value);
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('password-confirm').value;
  if (!U.validDisplayName(name)) return status.textContent = 'Нэр 2–60 тэмдэгт байна.';
  if (!U.validEmail(email)) return status.textContent = 'Зөв имэйл оруулна уу.';
  if (!U.validPassword(password)) return status.textContent = 'Нууц үг 8–72 тэмдэгт байна.';
  if (password !== confirm) return status.textContent = 'Нууц үгүүд таарахгүй байна.';
  form.querySelectorAll('button,input').forEach(el => el.disabled = true);
  try { await register(email, password, name); location.replace('./index.html'); }
  catch (error) {
    status.textContent = U.safeAuthMessage(error.code);
    form.querySelectorAll('button,input').forEach(el => el.disabled = false);
  }
});
