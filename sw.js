const CACHE_NAME = 'currency-converter-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/constants.js',
  './js/pwa-init.js',
  './js/app.js',
  'https://cdn-icons-png.flaticon.com/512/13974/13974002.png'
];

// Установка воркера и кэширование ресурсов
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Активация и очистка старого кэша
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

// Стратегия: Network First (с переходом на кэш, если сети нет)
// Это важно, так как курсы валют должны быть актуальными
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('api.coingecko.com') || e.request.url.includes('open.er-api.com')) {
    // Для запросов к API используем Network Only или Network First без жесткого кэширования версий
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});