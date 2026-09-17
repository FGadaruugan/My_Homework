import { requireUser, updateDisplayName, logout } from './auth.js';
const U = window.HomeworkFirebaseAuthUtils;
const user = await requireUser();
if (user) {
  document.getElementById('profile-name').value = user.displayName || user.email?.split('@')[0] || '';
  document.getElementById('profile-email').value = user.email || '';
  document.getElementById('profile-created').textContent = user.metadata?.creationTime
    ? new Intl.DateTimeFormat('mn-MN', {year:'numeric', month:'short', day:'numeric'}).format(new Date(user.metadata.creationTime))
    : '—';
}
document.getElementById('profile-save').addEventListener('click', async event => {
  const name = document.getElementById('profile-name').value.trim();
  const status = document.getElementById('status');
  if (!U.validDisplayName(name)) return status.textContent = 'Нэр 2–60 тэмдэгт байна.';
  event.currentTarget.disabled = true;
  try { await updateDisplayName(name); status.textContent = 'Нэр хадгалагдлаа ✓'; status.classList.add('success'); }
  catch { status.textContent = 'Нэр хадгалж чадсангүй.'; status.classList.remove('success'); }
  event.currentTarget.disabled = false;
});
document.getElementById('profile-logout').addEventListener('click', async () => {
  await logout();
  location.replace('./login.html');
});
