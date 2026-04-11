const CACHE_NAME = 'chidy-prime-v2.2'; // Increment this for any updates
const ASSET_CACHE = 'chidy-assets-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.png',
  '/maskable-icon.png'
];

// Install Event
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== ASSET_CACHE) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Network First for API and Main Page to ensure fresh updates
  if (url.origin === self.location.origin && (url.pathname === '/' || url.pathname.startsWith('/api'))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache if successful
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache First for images and fonts
  event.respondWith(
    caches.match(request).then(response => {
      if (response) return response;

      return fetch(request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;

        // Cache new assets like game images
        if (url.origin === self.location.origin && (url.pathname.includes('/css/') || url.pathname.includes('/js/') || request.destination === 'image')) {
          const resClone = networkResponse.clone();
          caches.open(ASSET_CACHE).then(cache => cache.put(request, resClone));
        }
        return networkResponse;
      });
    })
  );
});
