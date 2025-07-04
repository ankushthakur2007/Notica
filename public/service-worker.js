const CACHE_NAME = 'notica-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx', // This might be handled by Vite's build, but good to list
  '/src/globals.css',
  '/logo.png',
  // Add other critical static assets here if they are not handled by Vite's default build output
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Caching failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
  // Ensure the service worker takes control of all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // console.log('[Service Worker] Fetching:', event.request.url);
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      // No cache hit - fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // IMPORTANT: Clone the response. A response is a stream
        // and can only be consumed once. We must clone it so that
        // both the browser and the cache can consume it.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // This catch is for network errors, e.g., user is offline
        console.log('[Service Worker] Network request failed for:', event.request.url);
        // You could return an offline page here if you had one
        // For now, just let the browser handle the network error
        return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
          headers: { 'Content-Type': 'text/html' },
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});