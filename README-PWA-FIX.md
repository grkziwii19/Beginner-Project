# 🔧 Perbaikan PWA Offline — GR Assistant

## Akar Masalah yang Ditemukan

### 1. Service Worker tidak pernah aktif saat development
`ServiceWorkerRegister.tsx` lama hanya mendaftarkan SW jika
`process.env.NODE_ENV === 'production'`. Artinya saat `npm run dev`,
service worker **tidak pernah terpasang** — jadi kalau Anda mengetes
offline langsung di localhost dev server, memang tidak akan pernah berhasil.

**Fix:** registrasi SW sekarang berjalan di semua mode. Tapi perlu diingat:
untuk **menguji** fitur offline, tetap harus pakai build production
(`npm run build && npm run start`), bukan `npm run dev` — dijelaskan di
komentar dalam file.

### 2. Precache hanya mencakup `/`, tidak mencakup halaman app
SW lama hanya precache `/` dan `/offline.html`. Jadi kalau pengguna
install PWA lalu langsung buka `/dashboard` saat offline **sebelum pernah
membuka halaman itu secara online**, dia akan gagal — jatuh ke offline page.

**Fix:** precache sekarang mencakup `/dashboard`, `/classes`, `/absensi`,
`/akademik/nilai` — sesuaikan daftar ini di `sw.js` bagian `PRECACHE_ASSETS`
kalau Anda ingin menambah halaman lain (misal `/laporan`, `/pengaturan`).

### 3. `cache.addAll()` bersifat all-or-nothing
Kalau salah satu URL di precache list gagal di-fetch (404, network error
sesaat), **seluruh proses precache gagal** — termasuk untuk URL lain yang
sebenarnya valid. Ini silent failure yang sulit dideteksi.

**Fix:** diganti `Promise.allSettled` dengan `cache.add()` satu per satu,
sehingga satu URL gagal tidak menggagalkan yang lain. Kegagalan di-log ke
console sebagai warning agar bisa Anda lihat saat debugging.

### 4. Next.js static assets (_next/static/...) belum optimal
File-file ini punya content-hash di nama filenya (immutable). Sebelumnya
diperlakukan sama seperti aset biasa (style/script/image/font check by
`request.destination`), yang kadang tidak menangkap semua kasus.

**Fix:** ditambahkan blok khusus untuk path `/_next/static/` dengan
Cache First murni — begitu ter-cache sekali, langsung dipakai tanpa
re-fetch ke network sama sekali (aman karena nama file = hash konten).

### 5. Navigasi RSC (React Server Components) Next.js App Router
Saat navigasi client-side antar halaman, Next.js App Router kadang
mengirim request "data fetch" tambahan (bukan full HTML navigate).
Request ini sebelumnya hanya kena strategi default paling akhir.

**Fix:** strategi default sekarang juga menyimpan response ke cache
(tidak hanya fallback membaca cache), jadi request RSC ini ikut tersimpan
dan bisa dipakai ulang saat offline.

---

## File yang Diubah

| File | Lokasi | Status |
|---|---|---|
| `sw.js` | `public/sw.js` | **Timpa** |
| `ServiceWorkerRegister.tsx` | `src/components/pwa/ServiceWorkerRegister.tsx` | **Timpa** |

`manifest.ts` **tidak diubah** — sudah benar.

---

## Cara Menguji (PENTING — baca ini)

PWA offline **tidak bisa diuji di `npm run dev`** secara akurat karena
dev server Next.js punya banyak proses tambahan (HMR, dll) yang butuh
koneksi terus-menerus.

```powershell
# 1. Build versi production
npm run build

# 2. Jalankan versi production
npm run start
```

Lalu di Chrome:

1. Buka `http://localhost:3000`, **login**, dan kunjungi beberapa halaman
   (dashboard, classes, absensi, nilai) **selagi online** — supaya halaman
   tersebut ter-cache.
2. Buka DevTools (F12) → tab **Application** → **Service Workers** →
   pastikan status **"activated and is running"**.
3. Simulasikan offline:
   - DevTools → tab **Network** → ubah dropdown throttling ke **Offline**
4. Reload halaman atau navigasi ke halaman yang sudah dikunjungi di
   langkah 1 — halaman harus tetap muncul.

**Catatan:** kalau Anda navigasi ke halaman yang **belum pernah dibuka**
sebelumnya, itu akan jatuh ke `offline.html` — ini perilaku yang benar,
karena tidak mungkin menampilkan data yang belum pernah diambil dari server.

---

## Setelah Update — Pengguna Lama Perlu "Hard Refresh" Sekali

Karena nama cache dinaikkan ke `gr-assistant-v3`, browser pengguna yang
sudah pernah install PWA versi lama akan otomatis membersihkan cache lama
saat SW baru aktif (`activate` event menghapus cache dengan nama berbeda).
Ini berjalan otomatis, tidak perlu aksi manual dari pengguna — cukup tunggu
SW baru mengambil alih (biasanya setelah reload pertama kali online).
