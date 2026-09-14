/* NTK Thoothukudi — App shell service worker.
   Caches ONLY this site's own static files (index.html, manifest, icons) so the
   app opens instantly and still loads its shell with a poor/offline connection.
   It NEVER caches the Google Apps Script webhook or any other cross-origin
   request (Drive photo links, fonts, etc.) — all live data must always be
   fetched fresh, never served stale from cache. */
const CACHE_NAME = 'ntk-tuty-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle our own GET requests for the shell files above.
  // Everything else (Apps Script webhook, Drive images, Google Fonts, etc.)
  // is left completely untouched — the browser fetches it normally, live.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
