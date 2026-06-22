// GR Assistant - Service Worker
// Pendekatan manual sederhana (tanpa library) agar kompatibel dengan
// Next.js 15 App Router + Turbopack tanpa konflik konfigurasi build.

const CACHE_NAME = 'gr-assistant-v1';
const OFFLINE_URL = '/offline.html';

// Aset statis penting yang di-precache saat install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Hanya proses GET request
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan cache request ke Supabase (data harus selalu real-time/fresh)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Navigasi halaman (HTML) -> Network First, fallback ke offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Aset statis (JS/CSS/gambar/font) -> Cache First, lalu update di background
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: coba network dulu, fallback ke cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
