const CACHE = 'triageve-v16';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'config.js',
  'js/main.js',
  'js/core.js',
  'js/sync.js',
  'js/auth.js',
  'js/nav.js',
  'js/chat.js',
  'js/diary.js',
  'js/meet.js',
  'js/home.js',
  'js/eef.js',
  'js/contacts.js',
  'js/meds.js',
  'js/tasks.js',
  'js/print.js',
  'js/checkins.js',
  'js/push.js',
  'js/history.js',
  'js/offline.js',
  'js/help.js',
  'vendor/supabase.js',
  'manifest.webmanifest',
  'robots.txt',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Only the app shell is cached; Supabase data must never be served from cache.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', (e) => {
  let data = { title: 'triagEve', body: 'Nieuw in de app', tab: 'home' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch { /* ignore */ }
  e.waitUntil(self.registration.showNotification(data.title || 'triagEve', {
    body: data.body || '',
    data: { tab: data.tab || 'home' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const tab = e.notification.data?.tab || 'home';
  const url = new URL(`./?tab=${tab}`, self.registration.scope).href;
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) {
        c.postMessage({ type: 'open-tab', tab });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
