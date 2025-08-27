/* Minimal service worker to silence 404 and allow future enhancements */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch (no caching yet)
self.addEventListener('fetch', () => {});

