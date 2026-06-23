// Gunakan 'v2' agar browser menghapus cache lama yang mungkin korup
const CACHE_NAME = 'gr-assistant-v2'; 
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/offline.html',
  '/icons/iconapp192P.png',
  '/icons/iconapp512P.png',
  // Hindari mem-precache '/' karena Next.js bersifat dinamis
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// ... (Simpan event activate seperti semula) ...

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.hostname.includes('supabase.co')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        return response;
      });
    })
  );
});