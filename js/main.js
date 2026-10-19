import { $, configured, preview, db, store, USERS, NAME_KEY, nameForEmail } from './core.js';
import { showLogin, doLogout, idleExpired, touchActivity } from './auth.js';
import { switchTab } from './nav.js';
import { subscribe, reloadAll } from './sync.js';
import { actions } from './core.js';
import './chat.js';
import './diary.js';
import './meet.js';
import './home.js';
import './eef.js';
import './contacts.js';
import './meds.js';
import './zorgdag.js';
import './tasks.js';
import './print.js';
import './machtiging.js';
import './checkins.js';
import './push.js';
import './history.js';
import './offline.js';
import './support.js';

async function start() {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#current-user').textContent = store.me;
  const tabQ = new URLSearchParams(location.search).get('tab');
  store.activeTab = tabQ || store.activeTab || 'home';
  switchTab(store.activeTab);
  await reloadAll();
  subscribe();
}

actions.start = start;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !store.me || $('#app-view').hidden) return;
  if (idleExpired()) {
    doLogout('Je bent uitgelogd na 14 dagen zonder gebruik.');
    return;
  }
  touchActivity();
  reloadAll();
});

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

window.triageve = { store, switchTab, start, preview, actions };

const INSTALL_LATER = 'triageve.installLater';
let installEvent = null;

function runningAsApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function iosDevice() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function showInstallBar() {
  const bar = $('#install-bar');
  if (!bar || runningAsApp() || sessionStorage.getItem(INSTALL_LATER) === '1') return;
  const text = $('#install-text');
  const go = $('#install-go');
  if (iosDevice()) {
    text.textContent = 'Zet triagEve op je beginscherm: tik in Safari op Delen en kies Zet op beginscherm. Dan staat hij bij je apps.';
    go.hidden = true;
  } else {
    text.textContent = 'Zet triagEve in je app-lade, zodat hij opent als een app.';
    go.hidden = false;
  }
  bar.hidden = false;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  showInstallBar();
});
window.addEventListener('appinstalled', () => {
  $('#install-bar').hidden = true;
  installEvent = null;
});
$('#install-later')?.addEventListener('click', () => {
  sessionStorage.setItem(INSTALL_LATER, '1');
  $('#install-bar').hidden = true;
});
$('#install-go')?.addEventListener('click', async () => {
  if (!installEvent) {
    $('#install-text').textContent = 'Tik in Chrome op het menu en kies App installeren of Toevoegen aan startscherm.';
    return;
  }
  try {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    installEvent = null;
    if (choice?.outcome === 'accepted') $('#install-bar').hidden = true;
  } catch {
    installEvent = null;
    $('#install-text').textContent = 'Tik in Chrome op het menu en kies App installeren of Toevoegen aan startscherm.';
  }
});
showInstallBar();
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'open-tab' && e.data.tab) switchTab(e.data.tab);
});

(async () => {
  if (preview) {
    store.me = USERS.includes(store.me) ? store.me : 'Bren';
    await start();
    return;
  }
  if (!configured) return showLogin();
  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showLogin();
  });
  if (idleExpired()) {
    await doLogout('Je bent uitgelogd na 14 dagen zonder gebruik.');
    return;
  }
  const { data: { session } } = await db.auth.getSession();
  const person = nameForEmail(session?.user?.email);
  if (session && person) {
    store.me = person;
    localStorage.setItem(NAME_KEY, person);
    touchActivity();
    await start();
  } else if (session) {
    await doLogout('Log opnieuw in met je eigen naam en wachtwoord.');
  } else showLogin();
})();
