// Bump CACHE_NAME on every release that changes any file in ASSETS
const CACHE_NAME = 'currency-converter-v13';
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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Currency exchange rates API: Network-first with cache fallback
  const isApiRequest = url.hostname.includes('api.') || 
                       url.hostname.includes('coingecko.com') || 
                       url.hostname.includes('open.er-api.com') ||
                       url.hostname.includes('frankfurter.app');

  if (isApiRequest) {
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

  // 2. Static Assets & App Shell: Cache-First strategy for instant launch
  e.respondWith((async () => {
    // Try to get resource from cache
    const cachedResponse = await caches.match(req);
    
    if (cachedResponse) {
      // Stale-While-Revalidate background cache update for fresh assets on next boot
      e.waitUntil(
        fetch(req).then(async (networkResponse) => {
          if (networkResponse && networkResponse.ok && url.origin === self.location.origin) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(req, networkResponse);
          }
        }).catch(() => {/* Ignore background network failures */})
      );
      
      return cachedResponse;
    }

    // Network fallback for new/uncached static resources
    try {
      const netRes = await fetch(req);
      if (netRes && netRes.ok && url.origin === self.location.origin) {
        const clone = netRes.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, clone).catch(() => {});
      }
      return netRes;
    } catch (err) {
      // Navigation fallback to app shell
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});