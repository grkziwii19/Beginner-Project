'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // CATATAN PENTING:
    // Sebelumnya kode ini hanya mendaftarkan service worker saat
    // process.env.NODE_ENV === 'production'. Itu artinya saat development
    // (npm run dev), service worker TIDAK PERNAH aktif — sehingga fitur
    // offline tidak bisa diuji sama sekali di localhost.
    //
    // Next.js dev server juga tidak cocok untuk diuji offline (karena
    // banyak fitur dev seperti HMR butuh koneksi terus-menerus), jadi
    // untuk MENGUJI fitur offline, gunakan:
    //   npm run build && npm run start
    // lalu buka di browser, baru simulasikan offline (lihat catatan di akhir file ini).
    //
    // Tapi registrasi service worker sendiri sekarang dibiarkan berjalan
    // di semua mode, supaya tidak ada kebingungan "kenapa SW tidak terdaftar".
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope)

        // Jika ada versi SW baru yang sudah terpasang dan menunggu (waiting),
        // beri tahu di console. Bisa dikembangkan jadi toast "update tersedia".
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && registration.waiting) {
              console.log('[PWA] Versi baru tersedia, akan aktif saat reload berikutnya.')
            }
          })
        })
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error)
      })

    // Reload otomatis satu kali ketika service worker baru mengambil alih
    // (mencegah pengguna terjebak menjalankan versi cache lama selamanya)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [])

  return null
}

/**
 * CARA MENGUJI MODE OFFLINE DENGAN BENAR:
 *
 * 1. Build dan jalankan versi production:
 *      npm run build
 *      npm run start
 *
 * 2. Buka http://localhost:3000 di Chrome, login, dan navigasi ke
 *    beberapa halaman utama (dashboard, classes, absensi, nilai)
 *    SELAGI ONLINE — ini penting agar halaman tersebut ter-cache.
 *
 * 3. Buka DevTools (F12) > tab Application > Service Workers,
 *    pastikan status "activated and is running".
 *
 * 4. Simulasikan offline:
 *      - DevTools > Network tab > pilih "Offline" di dropdown throttling, ATAU
 *      - DevTools > Application > Service Workers > centang "Offline"
 *
 * 5. Reload halaman atau navigasi ke halaman yang sudah dibuka di langkah 2.
 *    Halaman harus tetap muncul. Jika navigasi ke halaman yang BELUM PERNAH
 *    dibuka sebelumnya, akan jatuh ke offline.html — ini perilaku yang benar
 *    (tidak mungkin menampilkan data yang belum pernah diambil).
 *
 * CATATAN: Mode "Incognito" Chrome kadang membatasi Service Worker.
 * Selalu uji di window normal (bukan Incognito) untuk hasil akurat.
 */
