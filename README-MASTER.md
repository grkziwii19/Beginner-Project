# 📦 GR Assistant — Update Gabungan (Final)

ZIP ini menggabungkan **semua update yang relevan** sampai hari ini:
- Menu "Data Siswa" terpisah (biodata lengkap, kolom kustom sederhana)
- Tambah/Edit Kelas dengan mata pelajaran + wali kelas
- Mode "Wali kelas mengajar semua mapel" (skip pilih mapel di Absensi)
- Absensi per mata pelajaran
- Perbaikan PWA agar bisa diakses offline

File-file usang dari percobaan sebelumnya (`asisten-guru.zip`,
`update-biodata-siswa.zip`) **tidak termasuk** di sini — sudah digantikan
total oleh isi ZIP ini.

---

## 🗂️ Daftar Lengkap File

### SQL — jalankan di Supabase SQL Editor, BERURUTAN sesuai nomor

| # | File | Efek |
|---|---|---|
| 1 | `supabase-migration-data-siswa.sql` | Kolom biodata siswa + tabel `custom_field_definitions` + storage bucket foto |
| 2 | `supabase-migration-subjects.sql` | Kolom `subjects` (array) di tabel `classes` |
| 3 | `supabase-migration-absensi-mapel.sql` | ⚠️ Mengosongkan tabel `attendance`, ubah struktur jadi per-mapel |
| 4 | `supabase-migration-homeroom-mode.sql` | Kolom `is_homeroom_only` di tabel `classes` |

### File Project — copy ke lokasi yang sama persis

| File | Aksi |
|---|---|
| `src/types/index.ts` | **Timpa** |
| `src/hooks/useCustomFields.ts` | Baru |
| `src/components/students/AddCustomFieldModal.tsx` | Baru |
| `src/components/students/ClassForm.tsx` | Baru |
| `src/components/students/AddClassModal.tsx` | Baru |
| `src/components/students/EditClassModal.tsx` | Baru |
| `src/components/students/SubjectInput.tsx` | Baru |
| `src/components/students/StudentDetailModal.tsx` | Baru |
| `src/components/layout/Sidebar.tsx` | **Timpa** |
| `src/components/pwa/ServiceWorkerRegister.tsx` | **Timpa** |
| `src/app/(dashboard)/data-siswa/page.tsx` | Baru |
| `src/app/(dashboard)/absensi/page.tsx` | **Timpa** |
| `src/app/(dashboard)/akademik/nilai/page.tsx` | **Timpa** |
| `public/sw.js` | **Timpa** |

### Hapus Manual (sudah tidak terpakai)

```
src/app/(dashboard)/classes/page.tsx
src/app/(dashboard)/classes/[id]/page.tsx
```
Folder `classes/` boleh dihapus seluruhnya jika sudah kosong.

---

## 🔧 Tahapan Pemasangan

### Langkah 1 — Backup (opsional tapi disarankan)
Supabase → Table Editor → tabel `students`, `classes`, `attendance` → Export CSV.

### Langkah 2 — Jalankan SQL
Buka Supabase → SQL Editor → jalankan 4 file SQL di atas **satu per satu, sesuai urutan nomor**. Tunggu sampai sukses sebelum lanjut ke file berikutnya.

### Langkah 3 — Copy file project
Copy semua file dari tabel "File Project" ke lokasi yang sama di project Anda.

### Langkah 4 — Hapus file usang
Hapus 2 file yang disebutkan di atas, lalu folder `classes/` jika sudah kosong.

### Langkah 5 — Install & jalankan
```powershell
npm install
npm run dev
```

### Langkah 6 — Tes fitur utama
1. Buka menu **Data Siswa** → klik **Tambah Kelas** → isi nama, mapel (atau centang "wali kelas mengajar semua mapel"), wali kelas
2. Tambah siswa, coba upload foto, tambah kolom kustom
3. Buka menu **Absensi** → pilih kelas yang baru dibuat → cek apakah langsung masuk ke absen (jika dicentang wali-kelas-saja) atau diminta pilih mapel dulu
4. Klik ikon pensil di Data Siswa untuk **edit kelas** yang sudah ada

### Langkah 7 — Tes PWA offline (opsional)
Ikuti panduan detail di `README-PWA-FIX.md` — **harus** pakai `npm run build && npm run start`, bukan `npm run dev`, untuk hasil yang akurat.

---

## ⚠️ Catatan Penting

- **Data absensi lama akan terhapus** oleh migration #3 — sesuai konfirmasi sebelumnya, ini aman karena masih tahap uji coba.
- **Menu "Kelas" sudah dihapus dari sidebar** — semua manajemen kelas (tambah/edit/hapus) sekarang di dalam halaman Data Siswa.
- Halaman `/students` lama (arsip + generator rapor) **tidak disentuh** — tetap ada, terpisah dari `/data-siswa` yang baru.
- Fitur input nilai sungguhan **belum dibangun** — halaman Nilai masih berupa checklist kesiapan kelas.

---

## 📄 Detail Tambahan

Lihat `README-DATA-SISWA.md` untuk penjelasan lengkap tiap fitur, dan
`README-PWA-FIX.md` untuk detail teknis perbaikan service worker.
