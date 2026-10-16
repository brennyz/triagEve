import { $, configured, preview, db, store, USERS } from './core.js';
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
import './tasks.js';
import './print.js';
import './checkins.js';
import './push.js';

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
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

window.triageve = { store, switchTab, start, preview, actions };
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
  if (session && USERS.includes(store.me)) {
    touchActivity();
    await start();
  } else showLogin();
})();
