const CACHE_NAME = 'chidy-prime-v4';
const ASSETS = [
  '/manifest.json'
];

// Install: cache only essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate: delete ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Take control of all open tabs
});

// Fetch: Network-First strategy (always get fresh content)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a copy for offline fallback
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(event.request);
      })
  );
});
