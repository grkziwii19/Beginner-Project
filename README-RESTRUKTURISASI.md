# 🔧 Update: Restrukturisasi Biodata, Import Siswa, Filter Baru

## Ringkasan Perubahan

1. **Hapus No. HP Siswa** dari form — field `phone` dihapus dari database
2. **Orang Tua disederhanakan** — `father_name` + `mother_name` (2 field terpisah) diganti jadi **dropdown Status (Ayah/Ibu/Wali) + satu field Nama**
3. **Susunan form Orang Tua** — Alamat (baris sendiri) → Status + Nama (sejajar) → No. HP (baris sendiri)
4. **Fitur "Tambah Kolom" dihapus total** — tidak ada lagi kolom kustom bebas
5. **Tab Import ditambahkan** — upload Excel untuk tambah siswa sekaligus ke kelas yang dipilih, lengkap dengan template download
6. **Sistem filter diubah total** — dari "Tampilan Standar/Orang Tua/Tanggal Lahir/Kontak" jadi 3 kategori: **Identitas, Akademik, Orang Tua** — masing-masing mengubah kolom tabel yang ditampilkan

---

## ⚠️ PENTING — File `data-siswa/page.tsx` Ditulis Ulang Total

Sebelumnya terjadi kesalahan: instruksi "gabungkan patch ke fungsi yang sudah ada" disalahartikan jadi paste mentah, sehingga file rusak (kode duplikat, import di tengah fungsi). **Untuk menghindari itu terulang, file ini saya tulis ulang lengkap dari awal** — bukan patch parsial. Timpa seluruh isi file lama dengan file di ZIP ini, jangan digabung manual.

---

## 📁 Detail Perubahan per File

### `supabase-migration-restrukturisasi-ortu.sql` (baru, jalankan dulu)
- `DROP COLUMN phone, father_name, mother_name`
- `ADD COLUMN parent_type` (CHECK: Ayah/Ibu/Wali), `parent_name`
- `DROP TABLE custom_field_definitions` (fitur kolom kustom dihapus)
- Data lama di kolom yang dihapus **tidak dipindahkan** (sesuai konfirmasi, masih tahap uji coba)

### `src/types/index.ts` (timpa)
- `Student`: hapus `phone`, `father_name`, `mother_name`, `custom_fields`. Tambah `parent_type`, `parent_name`
- Hapus `CustomFieldDefinition` interface
- Tambah `PARENT_TYPE_OPTIONS`, `formatDateShort()` (format `DD/MM/YYYY`)

### `src/components/students/StudentDetailModal.tsx` (timpa)
- Hapus field "No. HP Siswa"
- Susunan baru bagian Orang Tua: Alamat → (Status dropdown + Nama, sejajar) → No. HP
- Hapus semua referensi `customFields`/`CustomFieldDefinition`

### `src/components/students/ImportStudentsTab.tsx` (baru)
- Drag & drop / pilih file `.xlsx`
- Validasi per baris (Nama dan NIS wajib)
- Tombol **Download Template** — kolom sesuai field form: Nama, NIS, NISN, Jenis Kelamin, Agama, Tempat Lahir, Tanggal Lahir, Alamat, Status Orang Tua/Wali, Nama Orang Tua/Wali, No HP Orang Tua/Wali
- Import langsung ke kelas yang sedang dipilih di halaman Data Siswa

### `src/app/(dashboard)/data-siswa/page.tsx` (timpa total)
- Tab baru: **Import** (di samping Daftar Siswa dan Statistik)
- Tombol "Tambah Kolom" dan semua terkait kolom kustom dihapus
- Filter diubah total — lihat bagian berikutnya

### File lain (`ClassForm.tsx`, `AddClassModal.tsx`, `EditClassModal.tsx`, `SubjectInput.tsx`, `normalizeClassName.ts`)
Disertakan untuk konsistensi — isinya **sama dengan yang Anda kirim terakhir** (sudah termasuk perbaikan normalisasi nama kelas sebelumnya), tidak ada perubahan tambahan di update ini.

---

## 🔍 Sistem Filter Baru

Dropdown filter sekarang berisi 3 pilihan, masing-masing mengubah kolom yang tampil di tabel:

**Identitas**
| No | Foto | Nama | JK | Agama | Tempat Lahir | Tanggal Lahir |
|---|---|---|---|---|---|---|
Tanggal Lahir ditampilkan format `01/02/2000`.

**Akademik**
| No | Foto | Nama | NIS | NISN | Alamat |
|---|---|---|---|---|---|

**Orang Tua**
| No | Foto | Nama | Nama Ayah/Ibu/Wali | No. HP Orang Tua |
|---|---|---|---|---|
Kolom nama orang tua menampilkan nama + status dalam kurung, contoh: `Budi Santoso (Ayah)`.

---

## 🔧 Langkah Eksekusi

1. **Backup** — Supabase Table Editor → tabel `students` → Export CSV
2. **Jalankan SQL**: `supabase-migration-restrukturisasi-ortu.sql`
3. **Timpa semua file** ke lokasi yang sama persis:
   ```
   src/types/index.ts
   src/lib/normalizeClassName.ts
   src/components/students/ClassForm.tsx
   src/components/students/AddClassModal.tsx
   src/components/students/EditClassModal.tsx
   src/components/students/SubjectInput.tsx
   src/components/students/StudentDetailModal.tsx
   src/components/students/ImportStudentsTab.tsx   ← file baru
   src/app/(dashboard)/data-siswa/page.tsx
   ```
4. **Hapus 2 file** yang sudah tidak terpakai (fitur kolom kustom dihapus):
   ```
   src/hooks/useCustomFields.ts
   src/components/students/AddCustomFieldModal.tsx
   ```
5. Jalankan:
   ```powershell
   npm run dev
   ```

---

## Cara Tes

1. Pilih kelas → klik Tambah Siswa → cek form Orang Tua: Alamat baris sendiri, Status+Nama sejajar, No HP baris sendiri. Tidak ada lagi "No. HP Siswa"
2. Cek dropdown filter sekarang cuma 3: Identitas, Akademik, Orang Tua — masing-masing ubah kolom tabel
3. Buka tab **Import** → Download Template → isi beberapa baris → upload kembali → cek hasilnya masuk ke kelas yang sedang dipilih
4. Pastikan tombol "Tambah Kolom" sudah tidak ada di mana pun
