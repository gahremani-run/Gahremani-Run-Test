const CACHE_NAME = 'gahremani-run-shell-v2.0.4-ghtest';
const ASSET_CACHE = 'gahremani-run-assets-v1';   // models, mesh data and three.js: kept across app updates
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './assets/icon-192.png', './assets/icon-512.png', './assets/kenney.json?v=1'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(u => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('gahremani-run-shell-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
  return res;
}
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'cdn.jsdelivr.net') event.respondWith(cacheFirst(request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }
  if (url.pathname.endsWith('/version.json')) { event.respondWith(fetch(request, { cache: 'no-store' })); return; }
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request).catch(async () => (await caches.match(request)) || new Response('Offline', { status: 503, statusText: 'Offline' })));
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try { return await fetch(request); } catch (_) { return new Response('Offline', { status: 503, statusText: 'Offline' }); }
  })());
});
