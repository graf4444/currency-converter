// Bump CACHE_NAME on every release that changes any file in ASSETS,
// otherwise returning users keep the old shell until they manually clear.
const CACHE_NAME = 'currency-converter-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/constants.js',
  './js/pwa-init.js',
  './js/app.js',
  './icons/favicon.ico',
  './icons/favicon-16x16.png',
  './icons/favicon-32x32.png',
  './icons/apple-touch-icon.png',
  './icons/android-chrome-192x192.png',
  './icons/android-chrome-512x512.png'
];

self.addEventListener('install', (e) => {
  // Activate the new SW immediately on next load instead of waiting
  // for all tabs to close.
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Strategy:
//   - API calls (rates): network-first, fall back to cache when offline.
//   - Navigations / static assets: network-first with cache update on success,
//     fall back to cache. This keeps the app fresh after each deploy.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Live data — never cache aggressively; only fall back to last response if offline.
  if (url.hostname.includes('api.coingecko.com') || url.hostname.includes('open.er-api.com')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // App shell + everything else.
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && (url.origin === self.location.origin || req.mode === 'cors')) {
        const clone = res.clone();
        const cache = await caches.open(CACHE_NAME);
        // Use waitUntil-equivalent semantics: don't block response on put.
        cache.put(req, clone).catch(() => {});
      }
      return res;
    } catch (_) {
      const cached = await caches.match(req);
      if (cached) return cached;
      // Final fallback for navigations: serve the cached shell.
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw _;
    }
  })());
});
