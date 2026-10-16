import {
  $, $$, USERS, NAME_KEY, ACTIVITY_KEY, MAX_IDLE_MS, CFG, configured, db, store,
  toast, actions,
} from './core.js';

export function showLogin() {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#password').value = '';
  $('#config-warning').hidden = configured;
}

export async function doLogout(msg) {
  if (store.channel && db) await db.removeChannel(store.channel);
  store.channel = null;
  if (db) await db.auth.signOut();
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
  store.me = null;
  showLogin();
  if (msg) toast(msg);
}

export function touchActivity() {
  if (store.me) localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function idleExpired() {
  const raw = localStorage.getItem(ACTIVITY_KEY);
  if (!raw) return false;
  const t = Number(raw);
  return !Number.isFinite(t) || (Date.now() - t > MAX_IDLE_MS);
}

$$('.user-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    store.selectedUser = btn.dataset.user;
    $$('.user-btn').forEach((b) => b.classList.toggle('selected', b === btn));
    $('#password').focus();
  });
});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = $('#login-error');
  const fail = (msg) => { error.textContent = msg; error.hidden = false; };
  if (!configured) return fail('De app is nog niet gekoppeld aan Supabase.');
  if (!USERS.includes(store.selectedUser)) return fail('Kies eerst wie je bent.');

  $('#login-btn').disabled = true;
  const { error: authError } = await db.auth.signInWithPassword({
    email: CFG.TEAM_EMAIL,
    password: $('#password').value,
  });
  $('#login-btn').disabled = false;
  if (authError) return fail('Wachtwoord klopt niet.');

  error.hidden = true;
  store.me = store.selectedUser;
  localStorage.setItem(NAME_KEY, store.me);
  touchActivity();
  actions.start();
});

$('#logout-btn').addEventListener('click', () => doLogout());
const extraLogout = $('#logout-btn-more');
if (extraLogout) extraLogout.addEventListener('click', () => doLogout());

['click', 'keydown', 'touchstart'].forEach((ev) => {
  document.addEventListener(ev, touchActivity, { passive: true });
});

actions.logout = doLogout;
