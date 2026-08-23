importScripts("./offline-manifest.js");

const manifest = self.SDG_OFFLINE_MANIFEST || { version: "missing", assets: ["./"] };
const CACHE_PREFIX = "slow-digital-garden-";
const CACHE_NAME = `${CACHE_PREFIX}${manifest.version}`;
const scopedUrl = path => new URL(path, self.registration.scope).href;

async function broadcast(message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.forEach(client => client.postMessage(message));
}

async function fillOfflineCache() {
  const cache = await caches.open(CACHE_NAME);
  let completed = 0;
  for (const path of manifest.assets) {
    const url = scopedUrl(path);
    if (await cache.match(url)) {
      completed += 1;
      continue;
    }
    const response = await fetch(new Request(url, { cache: "reload" }));
    if (!response.ok) throw new Error(`Could not cache ${path}: ${response.status}`);
    await cache.put(url, response);
    completed += 1;
    if (completed === manifest.assets.length || completed % 4 === 0) {
      await broadcast({ type: "CACHE_PROGRESS", completed, total: manifest.assets.length });
    }
  }
  await broadcast({ type: "CACHE_PROGRESS", completed, total: manifest.assets.length });
}

self.addEventListener("install", event => {
  event.waitUntil(
    fillOfflineCache().catch(async error => {
      await broadcast({ type: "OFFLINE_ERROR", message: error.message });
      throw error;
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
    await broadcast({ type: "OFFLINE_READY", total: manifest.assets.length });
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const fallback = await cache.match(scopedUrl("./"));
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirstAndRefresh(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request).then(async response => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    refresh.catch(() => {});
    return cached;
  }
  return refresh;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  if (event.request.mode === "navigate") event.respondWith(networkFirst(event.request));
  else event.respondWith(cacheFirstAndRefresh(event.request));
});

self.addEventListener("message", event => {
  const message = event.data || {};
  if (message.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (message.type === "GET_OFFLINE_STATUS") {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      const ready = keys.length >= manifest.assets.length;
      event.source?.postMessage({
        type: ready ? "OFFLINE_READY" : "CACHE_PROGRESS",
        completed: keys.length,
        total: manifest.assets.length
      });
    })());
  }
});
