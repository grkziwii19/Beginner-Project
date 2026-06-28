-- ============================================================
-- MIGRATION: Restrukturisasi Data Orang Tua + Hapus No. HP Siswa
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================
--
-- PERUBAHAN:
-- 1. Kolom 'phone' (No. HP Siswa) DIHAPUS — sesuai keputusan, field ini
--    tidak lagi dipakai di form biodata siswa.
-- 2. Kolom 'father_name' dan 'mother_name' (dua field terpisah) DIHAPUS,
--    diganti dengan SATU pasangan field baru: 'parent_type' (Ayah/Ibu/
--    Wali) dan 'parent_name'. Form sekarang hanya satu baris untuk
--    orang tua/wali, bukan dua baris terpisah ayah & ibu.
-- 3. Data lama di father_name/mother_name TIDAK dipindahkan (sesuai
--    keputusan, karena masih tahap uji coba) — akan hilang begitu
--    kolom lama dihapus.
-- ============================================================

ALTER TABLE students DROP COLUMN IF EXISTS phone;
ALTER TABLE students DROP COLUMN IF EXISTS father_name;
ALTER TABLE students DROP COLUMN IF EXISTS mother_name;

ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_type TEXT
  CHECK (parent_type IN ('Ayah', 'Ibu', 'Wali'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name TEXT;

-- ─── Hapus fitur kolom kustom (Tambah Kolom) ────────────────
-- Fitur ini dihapus dari UI, sehingga tabel definisinya juga tidak
-- diperlukan lagi. custom_fields (JSONB) di tabel students DIBIARKAN
-- (tidak dihapus) untuk kompatibilitas data lama, tapi tidak lagi
-- ditampilkan/diisi dari form manapun.
DROP TABLE IF EXISTS custom_field_definitions;
