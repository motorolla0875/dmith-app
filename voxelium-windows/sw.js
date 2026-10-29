// Voxelium para Microsoft Store: service worker mínimo (necesario para instalar la app).
// Usa siempre la red; si no hay conexión, intenta con lo que haya guardado.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const c = r.clone(); caches.open('voxelium-win').then(k => k.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
