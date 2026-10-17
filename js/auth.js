import {
  $, $$, USERS, NAME_KEY, ACTIVITY_KEY, MAX_IDLE_MS, configured, db, store,
  emailFor, nameForEmail, toast, actions,
} from './core.js';

function applyPerson(name) {
  const known = USERS.includes(name) ? name : null;
  store.selectedUser = known;
  $$('.user-btn').forEach((btn) => {
    const on = btn.dataset.user === known;
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const mail = $('#login-email');
  if (mail) mail.value = known ? emailFor(known) : '';
  const hint = $('#login-hint');
  if (hint) {
    hint.textContent = known
      ? `${known}, alleen je wachtwoord. Iemand anders? Tik een andere naam.`
      : 'Kies je naam. Dit toestel onthoudt dat. Daarna alleen je eigen wachtwoord.';
  }
}

export function showLogin() {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#password').value = '';
  $('#config-warning').hidden = configured;
  applyPerson(localStorage.getItem(NAME_KEY));
  if (store.selectedUser) $('#password').focus();
}

export async function doLogout(msg) {
  if (store.channel && db) await db.removeChannel(store.channel);
  store.channel = null;
  if (db) await db.auth.signOut();
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
    applyPerson(btn.dataset.user);
    localStorage.setItem(NAME_KEY, btn.dataset.user);
    $('#password').focus();
  });
});

const SETUP_HINT = 'Nog niet ingesteld: de beheerder moet eerst de setup afronden.';

function isNetwork(err) {
  return !navigator.onLine || /failed to fetch|networkerror|offline|load failed/i.test(err?.message || '');
}

function isBadPassword(err) {
  const blob = `${err?.message || ''} ${err?.code || ''}`.toLowerCase();
  return /invalid_credentials|invalid login|invalid_grant/.test(blob);
}

async function backendReady() {
  try {
    const { error } = await db.from('triageve_messages').select('id').limit(1);
    if (!error) return 'ready';
    const blob = `${error.code || ''} ${error.message || ''}`;
    if (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(blob)) return 'missing';
    if (error.code === '42501' || /permission|jwt/i.test(blob)) return 'ready';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = $('#login-error');
  const fail = (msg) => { error.textContent = msg; error.hidden = false; };
  if (!configured) return fail('De app is nog niet gekoppeld aan Supabase.');
  const email = emailFor(store.selectedUser);
  if (!USERS.includes(store.selectedUser) || !email) return fail('Kies eerst wie je bent.');

  $('#login-btn').disabled = true;
  let authError;
  let session;
  try {
    const res = await db.auth.signInWithPassword({
      email,
      password: $('#password').value,
    });
    authError = res.error;
    session = res.data?.session;
  } catch (err) {
    authError = err;
  }
  $('#login-btn').disabled = false;
  if (authError) {
    if (isNetwork(authError)) return fail('Geen verbinding. Probeer het opnieuw.');
    const state = await backendReady();
    if (state === 'missing') return fail(SETUP_HINT);
    if (isBadPassword(authError)) return fail('Wachtwoord klopt niet.');
    return fail('Inloggen lukt nu niet. Probeer het opnieuw.');
  }

  const person = nameForEmail(session?.user?.email);
  if (!person) {
    await db.auth.signOut();
    return fail('Dit account hoort niet bij Jacky, Paps of Bren.');
  }
  error.hidden = true;
  store.me = person;
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
