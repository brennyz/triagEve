const CACHE = 'triageve-v5';
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
