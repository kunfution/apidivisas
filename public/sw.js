// Progressive Web App Service Worker for Monitor Api
const CACHE_NAME = 'monitor-api-cache-v1';
const ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[SW] Caching assets on install failed slightly:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle live API requests directly, while serving static ones from cache as fallback
  if (event.request.url.includes('/api/')) {
    return; // Pass-through for api requests
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
