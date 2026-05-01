// Podwalk Service Worker — Offline-First PWA
const CACHE_NAME = 'podwalk-v1';
const TILE_CACHE = 'podwalk-tiles-v1';
const STATIC_CACHE = 'podwalk-static-v1';

// App shell files to cache immediately
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, TILE_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !validCaches.includes(key))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // OSM map tiles → Cache-first with 7 day expiry
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(handleMapTile(event.request));
    return;
  }

  // API calls → Network-only (no caching)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Next.js static assets (_next/) → Cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML pages → Network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cached => cached || caches.match('/'));
        })
    );
    return;
  }

  // Default: Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || networkPromise;
    })
  );
});

// Map tile handler with expiry
async function handleMapTile(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get('sw-cached-at');
    if (dateHeader) {
      const cacheAge = Date.now() - parseInt(dateHeader);
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      if (cacheAge < SEVEN_DAYS) {
        return cached;
      }
    } else {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Add cache timestamp header
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const modified = new Response(await response.blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      await cache.put(request, modified);
      return modified;
    }
    return response;
  } catch {
    if (cached) return cached;
    // Return transparent 1x1 PNG tile as offline fallback
    return new Response(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
      { headers: { 'Content-Type': 'image/png' } }
    );
  }
}

// Handle background sync for future use
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

// Push notifications (placeholder)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification('Podwalk', {
        body: data.message || 'Nouveau point d\'intérêt à proximité !',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'podwalk-poi',
      })
    );
  }
});
