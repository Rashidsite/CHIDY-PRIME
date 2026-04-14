const CACHE_NAME = 'chidy-prime-v3.0'; // Bumped for performance update
const ASSET_CACHE = 'chidy-assets-v2';
const CDN_CACHE = 'chidy-cdn-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.png'
];

// CDN resources to cache for offline + speed
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install Event
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(CDN_CACHE).then(cache => {
        console.log('Caching CDN assets');
        return cache.addAll(CDN_ASSETS).catch(err => {
          console.warn('CDN cache failed (offline?):', err);
        });
      })
    ])
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  const validCaches = [CACHE_NAME, ASSET_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (!validCaches.includes(cache)) {
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

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // --- Strategy 1: Network First for API & main page (always fresh data) ---
  if (url.origin === self.location.origin && (url.pathname === '/' || url.pathname.startsWith('/api'))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses for offline fallback
          if (response.ok) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // --- Strategy 2: Cache First for CDN resources (fonts, icons CSS) ---
  if (url.hostname === 'fonts.googleapis.com' || 
      url.hostname === 'fonts.gstatic.com' || 
      url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const resClone = response.clone();
            caches.open(CDN_CACHE).then(cache => cache.put(request, resClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // --- Strategy 3: Cache First for local static assets (CSS, JS, images) ---
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) return response;

        return fetch(request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;

          // Cache new local assets
          if (url.pathname.includes('/css/') || url.pathname.includes('/js/') || request.destination === 'image') {
            const resClone = networkResponse.clone();
            caches.open(ASSET_CACHE).then(cache => cache.put(request, resClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // --- Strategy 4: Stale-While-Revalidate for game images (external URLs) ---
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            const resClone = response.clone();
            caches.open(ASSET_CACHE).then(cache => cache.put(request, resClone));
          }
          return response;
        }).catch(() => cached); // If network fails, rely on cache

        return cached || fetchPromise;
      })
    );
    return;
  }
});
