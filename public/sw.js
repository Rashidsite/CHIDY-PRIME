importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ============================================================
// CHIDY PRIME SERVICE WORKER — PERFORMANCE EDITION v5
// Strategies:
//   Static assets  → Cache-First (instant repeat loads)
//   /api/games     → Stale-While-Revalidate (instant + fresh)
//   /api/categories→ Stale-While-Revalidate
//   Other API      → Network-First (fresh data priority)
//   Fallback       → Return cached page if offline
// ============================================================

const CACHE_NAME    = 'chidy-prime-v9';
const API_CACHE     = 'chidy-api-v9';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.png',
  '/maskable-icon.png'
];

// API routes: Network-First (fresh live data priority, fallback to cache if offline)
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

  // ALL API routes: Network-First (100% live price & game edits priority)
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
  console.log('[SW] Push event received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Push data:', data);
      
      const options = {
        body: data.body || data.message,
        icon: data.icon || '/icon.png',
        badge: '/icon.png',
        image: data.image || data.big_image,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: 'chidy-prime-notification',
        data: { 
          url: data.url || data.click_action || '/',
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'view',
            title: '👀 View',
            icon: '/icon.png'
          }
        ]
      };
      
      const title = data.title || data.heading || 'Chidy Prime';
      
      event.waitUntil(
        self.registration.showNotification(title, options)
          .then(() => console.log('[SW] Notification shown successfully'))
          .catch(err => console.error('[SW] Notification show failed:', err))
      );
    } catch (e) {
      console.error('[SW] Push parse error:', e);
      // Fallback notification
      event.waitUntil(
        self.registration.showNotification('Chidy Prime', {
          body: 'You have a new notification',
          icon: '/icon.png',
          badge: '/icon.png',
          data: { url: '/' }
        })
      );
    }
  } else {
    console.warn('[SW] Push event with no data');
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((windowClients) => {
      console.log('[SW] Found clients:', windowClients.length);
      
      // Look for existing window with the target URL
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[SW] Focusing existing client:', client.url);
          return client.focus().then(() => {
            if (client.navigate && urlToOpen !== '/') {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      
      // No existing window found, open new one
      if (clients.openWindow) {
        console.log('[SW] Opening new window:', urlToOpen);
        const fullUrl = urlToOpen.startsWith('http') ? urlToOpen : `${self.location.origin}${urlToOpen}`;
        return clients.openWindow(fullUrl);
      }
    }).catch(err => console.error('[SW] Notification click handling failed:', err))
  );
});
