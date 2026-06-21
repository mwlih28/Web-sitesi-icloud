'use strict';
const CACHE = 'icloud-v1';
const STATIC = [
  '/index.html',
  '/dashboard.html',
  '/css/main.css',
  '/css/dashboard.css',
  '/js/dashboard.js',
  '/js/data.js',
  '/images/icloud-icon.svg',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API isteklerini önbelleğe alma — her zaman ağdan al
  if (url.pathname.startsWith('/api/')) return;
  // Statik kaynaklar: önce önbellek, sonra ağ
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
