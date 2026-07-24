// GR Assistant - Service Worker
// Pendekatan manual sederhana (tanpa library) agar kompatibel dengan
// Next.js 15 App Router + Turbopack tanpa konflik konfigurasi build.

const CACHE_VERSION = 'v5'; // dinaikkan karena perubahan daftar precache
const CACHE_NAME = `gr-assistant-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// ATURAN PRECACHE:
// Hanya masukkan aset yang:
//   ✅ Pasti ada (200 OK) tanpa login
//   ✅ Statis / tidak berubah sering
// JANGAN masukkan:
//   ❌ Route yang butuh autentikasi (/dashboard, /absensi, dll) → akan redirect ke /login (non-2xx) → precache GAGAL
//   ❌ Route yang tidak ada → 404 → precache GAGAL
//   ❌ /classes → tidak ada di app
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];
// Route seperti /dashboard, /absensi, /akademik/nilai akan otomatis
// ter-cache saat pengguna membukanya (strategi Network First di fetch handler).

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

  // Jangan pernah intercept API AI
if (
 url.pathname.startsWith('/api/ai/')
) {
 return;
}

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
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
        }

        return response;
      })
      .catch(async () => {

        const cached = await caches.match(request);

        if (cached) return cached;

        const cachedNoSearch =
          await caches.match(url.pathname);

        if (cachedNoSearch) return cachedNoSearch;

        const offline =
          await caches.match(OFFLINE_URL);

        return offline || new Response(
          "Offline",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain"
            }
          }
        );

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

      if (response.ok) {
        const responseClone = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(request, responseClone);
          });
      }

      return response;
    })
    .catch(async () => {

      const cached = await caches.match(request);

      return cached || new Response(
        "Offline",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain"
          }
        }
      );

    })
);

});