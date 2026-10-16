const CACHE = 'triageve-v3';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'config.js',
  'robots.txt',
  'vendor/supabase.js',
  'manifest.webmanifest',
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

self.addEventListener('push', (event) => {
  let data = { title: 'triagEve', body: 'Er is iets nieuws.', url: './#home' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* tekst blijft kort */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: 'icons/icon-192.png',
    data: { url: data.url || './#home' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './#home', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if ('focus' in client) {
        client.navigate?.(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
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
