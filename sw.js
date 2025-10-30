const CACHE = 'wtd-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './images/favicon.svg',
  './site.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(cached => 
      cached || fetch(request).then(resp => {
        // Cache new navigations & static
        const copy = resp.clone();
        if (resp.ok && (request.mode === 'navigate' || ASSETS.some(a => request.url.includes(a)))) {
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html'))
    )
  );
});