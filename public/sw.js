// GR Assistant - Service Worker
// Pendekatan manual sederhana (tanpa library) agar kompatibel dengan
// Next.js 15 App Router + Turbopack tanpa konflik konfigurasi build.

const CACHE_VERSION = 'v3'; // naikkan angka ini setiap kali strategi cache berubah
const CACHE_NAME = `gr-assistant-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Halaman inti aplikasi yang WAJIB bisa dibuka offline setelah PWA di-install,
// bahkan sebelum pengguna sempat membuka halaman tersebut secara online.
// Sesuaikan daftar ini dengan rute utama Anda.
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/dashboard',
  '/data-siswa',
  '/absensi',
  '/akademik/nilai',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache satu per satu (bukan addAll) supaya satu URL gagal
      // tidak membatalkan seluruh proses precache aset lainnya.
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url))
      );
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn('[SW] Gagal precache:', PRECACHE_ASSETS[i], result.reason);
        }
      });
    })
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

// Memungkinkan halaman memicu skipWaiting secara manual jika diperlukan
// (misalnya dari tombol "Update tersedia, muat ulang?")
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Hanya proses GET request
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // KRITIS: Jangan sentuh sama sekali request terkait autentikasi.
  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname === '/login' ||
    url.pathname === '/onboarding' ||
    url.searchParams.has('code') ||
    url.searchParams.has('state')
  ) {
    return;
  }

  // Jangan cache request ke Supabase (data harus selalu real-time/fresh)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // ── Next.js static build assets (_next/static/...) ──
  // Nama file mengandung content-hash unik, jadi isinya immutable selama
  // hash sama. Aman dan optimal dipakai strategi Cache First murni.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Navigasi halaman (HTML/route) -> Network First, fallback ke cache, lalu offline page ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Coba juga tanpa query string, kadang Next.js menambahkan param RSC
          const cachedNoSearch = await caches.match(url.pathname);
          if (cachedNoSearch) return cachedNoSearch;
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // ── Aset statis lain (JS/CSS/gambar/font di luar _next/static) -> Cache First + update background ──
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
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── Default (termasuk RSC data fetch dari Next.js navigasi client-side) ──
  // Network first, fallback ke cache kalau offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
