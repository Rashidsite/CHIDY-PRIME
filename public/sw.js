// ============================================================
// CHIDY PRIME SERVICE WORKER — PERFORMANCE EDITION v5
// Strategies:
//   Static assets  → Cache-First (instant repeat loads)
//   /api/games     → Stale-While-Revalidate (instant + fresh)
//   /api/categories→ Stale-While-Revalidate
//   Other API      → Network-First (fresh data priority)
//   Fallback       → Return cached page if offline
// ============================================================

const CACHE_NAME    = 'chidy-prime-v5';
const API_CACHE     = 'chidy-api-v5';
const STATIC_ASSETS = [
  '/manifest.json',
  '/css/style.css'   // cached if it exists
];

// API routes that can be served stale for speed
const STALE_API = ['/api/games', '/api/categories'];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (except CDNs we trust)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    // For CDN fonts/icons: cache-first
    if (url.hostname.includes('fonts.') || url.hostname.includes('cdnjs.') || url.hostname.includes('cdn.jsdelivr')) {
      event.respondWith(cacheFirst(request, CACHE_NAME));
    }
    return;
  }

  // Never intercept sw.js itself
  if (url.pathname === '/sw.js') return;

  // API routes: Stale-While-Revalidate for game/category data
  if (STALE_API.some(p => url.pathname.startsWith(p))) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, 300)); // 5 min freshness
    return;
  }

  // Other API routes: Network-First (fresh data priority, cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets (JS, CSS, images, fonts, icons): Cache-First
  if (/\.(js|css|png|jpg|jpeg|svg|webp|gif|woff2?|ttf|ico|json)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // HTML pages: Network-First with offline fallback
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ── STRATEGIES ───────────────────────────────────────────────

/** Cache-First: instant from cache, fetch only if missing */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/** Network-First: try network, fallback to cache */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

/** Stale-While-Revalidate: return cache instantly, update in background */
async function staleWhileRevalidate(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // Check if cached response is still within maxAge
    const cachedDate = cached.headers.get('date');
    if (cachedDate) {
      const age = (Date.now() - new Date(cachedDate).getTime()) / 1000;
      if (age < maxAgeSeconds) return cached; // Fresh enough — instant!
    } else {
      return cached; // No date header, serve anyway
    }
  }

  // No cache or stale — wait for network
  return fetchPromise || new Response('Offline', { status: 503 });
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
      console.error('Push parse error', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});
