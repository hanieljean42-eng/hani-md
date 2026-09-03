/* HANI-MD Service Worker — PWA + notifications push */
const CACHE = 'hani-md-v1';
const APP_SHELL = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour toujours avoir la dernière version), cache en secours hors-ligne.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// 🔔 Réception d'une notification push
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'HANI-MD';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'hani-md',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    silent: false,
    data: { url: data.url || '/admin' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification → ouvrir / focus l'admin
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/admin') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
