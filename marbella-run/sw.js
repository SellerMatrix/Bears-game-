// Offline support: cache the whole game on first visit, then serve it from the cache.
// Bump VERSION whenever any file changes so players get the update.
const VERSION = 'marbella-run-v1';
const FILES = ['./', 'index.html', 'three.min.js', 'manifest.webmanifest', 'fonts/bungee.woff2', 'fonts/press-start-2p.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
