# 📦 Update: Mode Wali Kelas (Skip Pilih Mapel) + Fitur Edit Kelas

Update ini menambahkan 2 hal pada fondasi yang sudah dibangun sebelumnya:

1. **Checkbox "Wali kelas mengajar semua mapel"** di form kelas — jika
   dicentang, menu Absensi langsung masuk ke kelas tanpa langkah pilih mapel.
2. **Fitur Edit Kelas (baru)** — klik ikon pensil di sebelah dropdown pilih
   kelas untuk mengubah nama/mapel/wali kelas/mode wali-kelas-saja, atau
   menghapus kelas.

---

## 📁 Daftar File (Update Terbaru)

| File | Status | Aksi |
|---|---|---|
| `supabase-migration-homeroom-mode.sql` | Baru | Jalankan di Supabase SQL Editor (setelah migration sebelumnya) |
| `src/types/index.ts` | **Diganti** | Timpa — tambah `is_homeroom_only` ke ClassItem |
| `src/components/students/ClassForm.tsx` | Baru | Copy — form bersama untuk Tambah & Edit Kelas |
| `src/components/students/AddClassModal.tsx` | **Diganti** | Timpa — kini pakai `ClassForm`, terima checkbox |
| `src/components/students/EditClassModal.tsx` | Baru | Copy — fitur edit kelas yang baru |
| `src/app/(dashboard)/data-siswa/page.tsx` | **Diganti** | Timpa — tombol edit, `handleEditClass`, `handleDeleteClass` |
| `src/app/(dashboard)/absensi/page.tsx` | **Diganti** | Timpa — skip langkah pilih mapel untuk kelas wali-kelas-saja |

File lain dari update sebelumnya tetap disertakan di ZIP ini untuk
kemudahan, tidak berubah lagi pada update ini.

---

## 🧠 Cara Kerja Mode "Wali Kelas Mengajar Semua Mapel"

1. Saat **Tambah Kelas** atau **Edit Kelas**, ada checkbox baru:
   *"Wali kelas mengajar semua mata pelajaran"*
2. Jika dicentang, input Mata Pelajaran tetap tampil tapi jadi opsional
   (diberi opacity redup sebagai sinyal visual tidak wajib diisi)
3. Setelah disimpan, badge **"Wali kelas mengajar semua mapel"** akan
   tampil di info kelas (menggantikan daftar chip mapel)
4. Di menu **Absensi**, memilih kelas dengan mode ini akan **langsung**
   menampilkan daftar siswa untuk diabsen — tidak ada langkah pilih mapel
   sama sekali. Absensi tersimpan dengan `subject = NULL`.

---

## 🧠 Cara Kerja Edit Kelas (Baru)

1. Pilih kelas di dropdown seperti biasa
2. Klik **ikon pensil** di sebelah dropdown
3. Modal terbuka dengan data kelas saat ini terisi otomatis — bisa ubah
   nama, mapel, wali kelas, atau centang/lepas centang mode wali-kelas-saja
4. Jika **nama kelas diubah**, sistem otomatis menyinkronkan `class_name`
   di semua data siswa pada kelas tersebut (karena relasi siswa-kelas
   masih berbasis pencocokan teks, bukan foreign key)
5. Tombol ikon tong sampah di pojok kiri bawah modal untuk **menghapus
   kelas** (dengan konfirmasi) — siswa di kelas tersebut tidak ikut
   terhapus, tapi perlu dipindahkan manual ke kelas lain

---

## 📁 Daftar File (Update Terbaru)

| File | Status | Aksi |
|---|---|---|
| `supabase-migration-subjects.sql` | Baru | Jalankan di Supabase SQL Editor |
| `supabase-migration-absensi-mapel.sql` | Baru | Jalankan setelah migration di atas |
| `src/types/index.ts` | **Diganti** | Timpa — tambah `subjects` di ClassItem, `subject` di Attendance, `COMMON_SUBJECTS` |
| `src/components/students/SubjectInput.tsx` | Baru | Copy — input mapel dengan autocomplete + chip |
| `src/components/students/AddClassModal.tsx` | **Diganti** | Timpa — form lengkap (nama/mapel/wali kelas) |
| `src/app/(dashboard)/data-siswa/page.tsx` | **Diganti** | Timpa — `handleAddClass` kini terima subjects & wali kelas, tampilkan info kelas |
| `src/app/(dashboard)/absensi/page.tsx` | **Diganti** | Timpa — tambah langkah pilih mapel sebelum absen |
| `src/app/(dashboard)/akademik/nilai/page.tsx` | **Diganti** | Timpa — perbaiki 3 link mati ke `/classes` jadi `/data-siswa` |

File-file dari update sebelumnya (`AddCustomFieldModal.tsx`, `StudentDetailModal.tsx`,
`useCustomFields.ts`, `Sidebar.tsx`, `supabase-migration-data-siswa.sql`)
**tetap disertakan** di ZIP ini untuk kemudahan, isinya sama seperti sebelumnya
(tidak berubah lagi pada update ini).

---

## ⚠️ PENTING — Migration Absensi Mengosongkan Data Lama

`supabase-migration-absensi-mapel.sql` menjalankan `TRUNCATE TABLE attendance`
— **menghapus semua data absensi yang sudah ada**. Sesuai konfirmasi Anda,
ini aman dilakukan karena masih tahap uji coba.

Struktur baru: kolom `subject` ditambahkan (nullable). Satu siswa hanya
bisa diabsen sekali per tanggal per mapel — atau sekali per tanggal jika
memakai opsi "Semua Mapel (Wali Kelas)" (`subject = NULL`).

---

## 🧠 Cara Kerja Tambah Kelas (Baru)

1. Di halaman Data Siswa, klik **"Tambah Kelas"**
2. Isi **Nama Kelas** (contoh: VI A, 8 A)
3. Isi **Mata Pelajaran** — ketik nama mapel, akan muncul saran dari daftar
   umum (Matematika, IPA, dst), atau ketik nama baru lalu tekan Enter.
   Bisa tambah beberapa mapel sekaligus, masing-masing jadi "chip" yang
   bisa dihapus dengan klik tombol ×
4. Isi **Nama Wali Kelas**
5. Simpan — kelas baru otomatis terpilih, dan langsung muncul info wali
   kelas + daftar mapel di bagian atas halaman

Mapel yang ditambahkan di sini akan muncul sebagai pilihan di halaman
**Absensi** untuk kelas yang sama.

---

## 🧠 Cara Kerja Absensi (Baru)

1. Pilih kelas (langkah ini tidak berubah)
2. **Langkah baru:** pilih mata pelajaran — muncul daftar mapel yang sudah
   diatur untuk kelas tersebut, ditambah satu opsi **"Semua Mapel (Wali
   Kelas)"** untuk guru yang mengajar semua mapel sendiri (umumnya guru SD)
3. Setelah mapel dipilih, tampil daftar siswa untuk diabsen seperti biasa
4. Tombol "Ganti mata pelajaran" untuk balik ke langkah pilih mapel tanpa
   harus pilih kelas ulang

Kalau kelas belum punya mapel sama sekali, akan tampil pesan untuk
menambahkan mapel di halaman Data Siswa dulu (opsi "Semua Mapel" tetap
selalu tersedia).

---

## 📁 Daftar File

| File | Status | Aksi |
|---|---|---|
| `supabase-migration-data-siswa.sql` | Baru | Jalankan di Supabase SQL Editor |
| `src/types/index.ts` | **Diganti** | Timpa |
| `src/hooks/useCustomFields.ts` | Baru | Copy (folder `src/hooks/`) |
| `src/components/students/AddCustomFieldModal.tsx` | Baru | Copy |
| `src/components/students/AddClassModal.tsx` | Baru | Copy |
| `src/components/students/StudentDetailModal.tsx` | Baru | Copy |
| `src/app/(dashboard)/data-siswa/page.tsx` | Baru/**Diganti** | Copy — route baru, terpisah dari `/students` lama |
| `src/components/layout/Sidebar.tsx` | **Diganti** | Timpa — menu "Kelas" dihapus, "Data Siswa" jadi item pertama di Akademik |

---

## ⚠️ PENTING — Hapus File yang Sudah Tidak Terpakai

Karena menu "Kelas" dihapus, 2 file berikut **TIDAK lagi bisa diakses dari
sidebar manapun**. Sesuai konfirmasi Anda, hapus file ini secara manual
dari project:

```
src/app/(dashboard)/classes/page.tsx
src/app/(dashboard)/classes/[id]/page.tsx
```

Setelah menghapus, folder `src/app/(dashboard)/classes/` boleh dihapus
seluruhnya jika sudah kosong.

**Tidak ada perubahan database** akibat penghapusan ini — tabel `classes`
tetap dipakai sepenuhnya (sebagai sumber dropdown di Data Siswa, Absensi,
dan Nilai), hanya UI untuk mengelolanya yang berpindah tempat.

---

## ℹ️ Catatan Migrasi SQL

Jika Anda sempat menjalankan migration sebelumnya yang membuat tabel
`field_definitions` (versi dengan grup/jenis/opsi), migration baru ini akan
menghapus tabel itu (`DROP TABLE IF EXISTS field_definitions`) dan
menggantikannya dengan `custom_field_definitions` yang sederhana. Sesuai
konfirmasi, ini aman karena masih tahap uji coba.

---

## ℹ️ Soal Halaman `/students` Lama

Fitur rapor di halaman `/students` (arsip + generator rapor) **masih
dibutuhkan**, jadi halaman itu **TIDAK diganti maupun disentuh**.

Fitur biodata baru ditempatkan di **route terpisah: `/data-siswa`** —
menu sidebar "Data Siswa" mengarah ke sana, bukan ke `/students`.

---

## 🧠 Cara Kerja Fitur Baru

1. **Sidebar** → menu "Data Siswa" sekarang jadi item pertama di section
   "Akademik" (menggantikan posisi menu "Kelas" yang dihapus)
2. Buka menu itu → ada dropdown **pilih kelas** + tombol **"Tambah Kelas"**
   di sebelahnya — kalau belum ada kelas sama sekali, langsung ditawarkan
   tombol besar "Tambah Kelas"
3. Setelah kelas dipilih, muncul 2 tab:
   - **Daftar Siswa** — tabel dengan foto, biodata, tombol tambah/edit/hapus,
     search, filter tampilan kolom (Standar/Orang Tua/Tanggal Lahir/Kontak)
   - **Statistik** — ringkasan jumlah siswa, gender, kelengkapan biodata, foto
4. **Tombol "Tambah Kolom"** — guru ketik nama kolom bebas (misal "Catatan",
   "Makanan Favorit") → otomatis muncul sebagai field teks di form
   tambah/edit semua siswa, dan tersimpan di kolom `custom_fields` (JSONB)

---

## 🔧 Langkah Integrasi

### 1. Jalankan SQL
Buka Supabase → SQL Editor → paste isi `supabase-migration-data-siswa.sql` → Run.

### 2. Copy file ke project Anda
Sesuai tabel di atas.

### 3. Hapus file yang tidak terpakai
Sesuai instruksi di bagian "PENTING" di atas.

### 4. Jalankan
```powershell
npm run dev
```

Buka menu **Data Siswa** di sidebar → coba tambah kelas baru, tambah siswa,
tambah kolom kustom, dan lihat tab Statistik.

---

## Yang TIDAK Disentuh

- Halaman `/students` lama (arsip + generator rapor) — tetap ada, tidak diubah sama sekali
- Menu Absensi dan Nilai (`/absensi`, `/akademik/nilai`) — tidak berubah,
  tetap berdiri sendiri seperti sekarang
- Menu Laporan, Pengaturan, Sekolah, onboarding, PWA — tidak disentuh

