// Distill service worker — Phase 1 scaffold. The full offline strategy
// (cache summaries, covers, audio, IndexedDB queue) lands in Phase 7.
// For now we only do install/activate housekeeping so the PWA install
// prompt fires on iOS/Android.

const VERSION = 'distill-v0.1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', () => {
  // Pass-through. Real strategy in Phase 7.
});
