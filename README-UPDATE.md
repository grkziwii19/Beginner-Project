# 📦 Update: Biodata Siswa Lengkap (Foto, Kategori Kustom, Filter)

File ini **HANYA berisi perubahan**, bukan seluruh project. Strukturnya mengikuti
struktur project Anda saat ini (GR Assistant), jadi tinggal di-copy-timpa ke folder yang sesuai.

---

## 📁 Daftar File

| File | Status | Aksi |
|---|---|---|
| `supabase-migration-biodata.sql` | Baru | Jalankan di Supabase SQL Editor |
| `src/types/index.ts` | **Diganti** | Timpa file lama Anda |
| `src/hooks/useFieldDefinitions.ts` | Baru | Copy ke folder `src/hooks/` (buat folder jika belum ada) |
| `src/components/students/AddFieldModal.tsx` | Baru | Copy (buat folder `src/components/students/`) |
| `src/components/students/StudentDetailModal.tsx` | Baru | Copy |
| `src/app/(dashboard)/classes/[id]/page.tsx` | **Diganti** | Timpa file lama Anda |

---

## ⚠️ File yang TIDAK Disentuh

Sidebar.tsx, classes/page.tsx (daftar kelas), students/page.tsx (arsip+rapor),
absensi, akademik/nilai, laporan, pengaturan, sekolah, onboarding, PWA — **semua tetap
seperti yang Anda punya sekarang.** Tidak ada perubahan di file-file ini.

---

## 🔧 Langkah Integrasi

### 1. Jalankan SQL dulu
Buka Supabase → SQL Editor → paste isi `supabase-migration-biodata.sql` → Run.

Aman dijalankan walau kolom/tabel sudah ada (semua pakai `IF NOT EXISTS`).

### 2. Copy file ke project Anda

```
src/types/index.ts                              → timpa
src/hooks/useFieldDefinitions.ts                 → file baru
src/components/students/AddFieldModal.tsx        → file baru
src/components/students/StudentDetailModal.tsx   → file baru
src/app/(dashboard)/classes/[id]/page.tsx        → timpa
```

### 3. Cek `types/index.ts` Anda yang lain

Jika ada file lain di project Anda yang import dari `@/types` dan memakai
`Student` dengan cara yang spesifik (misal destructuring field tertentu),
cek apakah masih kompatibel — saya hanya **menambah field opsional baru**,
tidak menghapus field lama (`name`, `nis`, `nisn`, `class_name`, `gender`,
`photo`, `created_at` semua masih ada dan wajib seperti sebelumnya).

### 4. Jalankan

```powershell
npm run dev
```

Buka kelas mana saja → tab **Siswa** → akan terlihat:
- Kolom foto di tabel
- Tombol **Tambah Kategori** dan **Tambah Siswa** (form sekarang lengkap)
- Filter dropdown "Tampilan Standar / Orang Tua / Tanggal Lahir / Kontak"
- Kolom search

---

## 🆕 Yang Belum Termasuk di Update Ini

**Import Excel untuk biodata lengkap** — karena saya belum melihat file
`import/page.tsx` Anda saat ini, saya belum menyesuaikannya. Kirim file itu
kalau mau saya update juga, supaya template Excel-nya menyesuaikan kolom
biodata baru + kategori kustom.
