# 🔧 Perbaikan Normalisasi Nama Kelas — Audit & Refactor

## Hasil Audit — 4 Bug Ditemukan

| # | Lokasi | Bug | Dampak |
|---|---|---|---|
| 1 | `normalizeClassName.ts` | Konversi angka Romawi dijalankan sebelum separator dihapus. Regex `\b` gagal mendeteksi "VI" di "VI_A" karena underscore dianggap karakter kata. "V I A" terbaca sebagai dua kata Romawi terpisah (V→5, I→1) bukan satu kesatuan (VI→6). | `VI_A` dan `V I A` lolos sebagai kelas berbeda dari `VI A` |
| 2 | Alur insert/update | `normalized_name` tidak pernah dihitung dan dikirim ke Supabase. `ClassFormData` tidak punya field itu sama sekali. | Kolom `normalized_name` selalu kosong — constraint UNIQUE tidak punya nilai untuk dibandingkan |
| 3 | SQL migration awal | Logika normalisasi SQL berbeda total dari helper TypeScript — tidak konversi Romawi, tidak hapus underscore/garis miring | Dua sumber kebenaran tidak sinkron — "VI A" jadi "VIA" di SQL tapi "6A" di aplikasi |
| 4 | `EditClassModal.tsx` | Logika perbandingan duplikat tambahan (`isSameClass`) yang duplikat dari logika yang sudah benar di `ClassForm.tsx` | Dua tempat melakukan hal yang sama dengan cara berbeda |

Inilah jawaban langsung kenapa `8C` masih lolos setelah `8 C` dibuat: `normalized_name` tidak pernah terisi saat insert (Bug #2), jadi constraint database tidak punya apa-apa untuk dibandingkan.

---

## Perubahan yang Dilakukan

**`src/lib/normalizeClassName.ts`** — diperbaiki total. Urutan dibalik: hapus semua separator dan spasi dulu, baru deteksi prefix angka Romawi di awal string. Daftar Romawi diurutkan dari terpanjang ke terpendek supaya tidak salah potong.

**`src/components/students/ClassForm.tsx`** — disederhanakan. Tetap satu-satunya tempat pengecekan duplikat di frontend. Tambah peringatan format memakai `isValidClassName`.

**`AddClassModal.tsx` dan `EditClassModal.tsx`** — disederhanakan. `EditClassModal` kehilangan logika `isSameClass` yang duplikat, karena itu sudah ditangani `ClassForm` lewat parameter `currentClassName`. Kedua modal hanya memvalidasi hasil dari `ClassForm`, tidak menghitung normalisasi sendiri.

**`normalized_name` sekarang dihitung di TypeScript, bukan SQL.** SQL migration baru menghapus logika SQL yang salah, mengosongkan kolom, lalu menyediakan script Node (`recompute-normalized-names.ts`) yang menghitung ulang memakai helper TypeScript yang sama persis dengan form.

**`handleAddClass`/`handleEditClass`** — lihat `PATCH-data-siswa-page.tsx`, berisi potongan kode yang harus digabungkan manual ke `data-siswa/page.tsx` Anda.

---

## Cara Kerja Normalisasi Sekarang

```
Input pengguna  ->  normalizeClassName()  ->  normalized_name (disimpan di DB)
   "VI_A"               "6A"                        "6A"
   "vi a"                |                            |
   "VI-A"          (helper SATU-SATUNYA       UNIQUE constraint
   "V I A"          sumber kebenaran)          (user_id, normalized_name)
```

Satu helper, tiga titik pakai:
1. `ClassForm.tsx` — cek duplikat real-time saat mengetik
2. `handleAddClass`/`handleEditClass` — hitung `normalized_name` yang dikirim ke Supabase
3. `scripts/recompute-normalized-names.ts` — hitung ulang data lama

Tidak ada logika normalisasi lain di tempat manapun — SQL sekarang murni jadi penjaga terakhir lewat constraint, tanpa menghitung apa pun sendiri.

---

## Langkah Eksekusi (wajib urut)

1. **Backup** — Supabase Table Editor → tabel `classes` → Export CSV
2. **Jalankan** `supabase-migration-fix-normalisasi.sql` — melepas constraint lama, mengosongkan `normalized_name`. Jangan jalankan dua baris ALTER TABLE yang dikomentari di akhir file, itu untuk langkah 5
3. **Copy file** ke project:
   ```
   src/lib/normalizeClassName.ts
   src/components/students/ClassForm.tsx
   src/components/students/AddClassModal.tsx
   src/components/students/EditClassModal.tsx
   ```
4. **Terapkan patch manual** — buka `PATCH-data-siswa-page.tsx`, gabungkan ke `handleAddClass`/`handleEditClass` di `data-siswa/page.tsx`
5. **Jalankan script recompute**:
   ```bash
   npx tsx scripts/recompute-normalized-names.ts
   ```
   Jika ada tabrakan dilaporkan, perbaiki manual di Table Editor, jalankan ulang
6. **Aktifkan constraint**:
   ```sql
   ALTER TABLE classes ALTER COLUMN normalized_name SET NOT NULL;
   ALTER TABLE classes ADD CONSTRAINT classes_user_normalized_name_unique
     UNIQUE (user_id, normalized_name);
   ```
7. **Tes**: buat `8 C`, lalu coba `8C`/`8-C`/`8_C` (harus ditolak). Buat `VI A`, lalu coba `VI_A`/`V I A`/`vi a` (harus ditolak).

---

## Update Tambahan — Format Tampilan Nama Kelas (Spasi Konsisten)

Setelah perbaikan normalisasi di atas, ditambahkan satu fungsi baru:
**`formatClassName()`** — tujuannya berbeda dari `normalizeClassName()`.

| Fungsi | Tujuan | Contoh |
|---|---|---|
| `normalizeClassName()` | Deteksi duplikat (dipakai untuk `normalized_name`) | `"7 A"` dan `"7A"` -> sama-sama `"7A"` |
| `formatClassName()` | Merapikan nama yang DISIMPAN & DITAMPILKAN (dipakai untuk `name`) | `"7A"` -> `"7 A"`, `"VIIIB"` -> `"VIII B"` |

Aturan `formatClassName()`:
- Angka biasa atau Romawi tetap dipertahankan jenisnya — tidak dikonversi (beda dengan `normalizeClassName` yang mengonversi Romawi ke Arab)
- Kalau ada huruf label (A, B, C, dst), dipisah dengan satu spasi: `7A` -> `7 A`, `VIII_B` -> `VIII B`
- Kalau tidak ada huruf label, tidak ditambah spasi: `3` tetap `3`, `III` tetap `III`
- Guru bebas pakai angka biasa atau Romawi sesuka mereka — keduanya valid

Penting: kedua fungsi dipakai bersamaan saat insert/update (lihat `PATCH-data-siswa-page.tsx`) — `name` diisi hasil `formatClassName()`, `normalized_name` diisi hasil `normalizeClassName()`. Jadi `"7A"` dan `"7 A"` tetap dianggap kelas yang sama (ditolak sebagai duplikat) meskipun nama tampilan selalu rapi dengan spasi.

---

## Field Wali Kelas Wajib

Sesuai kode yang Anda kirim, ini sudah benar: label punya asterisk merah (`Nama Wali Kelas *`), dan validasi `if (!form.homeroomTeacher.trim())` di kedua modal sudah memblokir submit dengan pesan error. Tidak ada perubahan tambahan diperlukan untuk bagian ini.
