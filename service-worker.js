const OLD_CACHE_PREFIX = "slow-digital-garden-";

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith(OLD_CACHE_PREFIX))
        .map(name => caches.delete(name))
    );

    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(windows.map(client => client.navigate(client.url)));
  })());
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});
