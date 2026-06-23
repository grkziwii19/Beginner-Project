// Gunakan 'v2' agar browser menghapus cache lama yang mungkin korup
const CACHE_NAME = 'gr-assistant-v2'; 
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/offline.html',
<<<<<<< HEAD
  '/icons/iconapp192P.png',
  '/icons/iconapp512P.png',
=======
  // Hindari mem-precache '/' karena Next.js bersifat dinamis
>>>>>>> 9f6a559 (Gagal login)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Gunakan add() satu per satu agar jika satu gagal, tidak merusak semuanya
      return Promise.allSettled(PRECACHE_ASSETS.map(url => cache.add(url)));
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

  // STRATEGI NAVIGASI: Network First, fallback ke Offline Page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL)) // Hanya ke offline.html jika network benar-benar mati
    );
    return;
  }

  // STRATEGI ASET STATIS: Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then(response => {
        // Cek apakah respon valid sebelum di-cache
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