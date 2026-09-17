import { login, googleLogin, forgotPassword, redirectIfAuthenticated } from './auth.js';
const U = window.HomeworkFirebaseAuthUtils;
await redirectIfAuthenticated();
const form = document.getElementById('authForm');
const status = document.getElementById('status');
const email = document.getElementById('email');
const password = document.getElementById('password');
function busy(value){ form.querySelectorAll('button,input').forEach(el => el.disabled = value); document.getElementById('google-login').disabled = value; }
function show(message, success = false){ status.textContent = message; status.classList.toggle('success', success); }
form.addEventListener('submit', async event => {
  event.preventDefault();
  const userEmail = U.normalizeEmail(email.value);
  if (!U.validEmail(userEmail) || !U.validPassword(password.value)) return show('Имэйл болон 8-аас дээш тэмдэгттэй нууц үгээ шалгана уу.');
  busy(true);
  try { await login(userEmail, password.value); location.replace('./index.html'); }
  catch (error) { show(U.safeAuthMessage(error.code)); busy(false); }
});
document.getElementById('google-login').addEventListener('click', async () => {
  busy(true);
  try { await googleLogin(); location.replace('./index.html'); }
  catch (error) { show(U.safeAuthMessage(error.code)); busy(false); }
});
document.getElementById('forgot-password').addEventListener('click', async event => {
  event.preventDefault();
  const userEmail = U.normalizeEmail(email.value);
  if (!U.validEmail(userEmail)) return show('Эхлээд зөв имэйлээ оруулна уу.');
  try { await forgotPassword(userEmail); show('Нууц үг шинэчлэх холбоос имэйл рүү илгээгдлээ.', true); }
  catch (error) { show(U.safeAuthMessage(error.code)); }
});
