-- ============================================================
-- MIGRATION: Mata Pelajaran per Kelas
-- Jalankan di: Supabase Dashboard > SQL Editor
-- Aman dijalankan walau kolom sudah ada (idempotent)
-- ============================================================

-- Tambah kolom subjects (array teks) ke tabel classes.
-- Mapel ini dipakai sebagai sumber dropdown di menu Absensi dan Nilai
-- untuk kelas yang bersangkutan.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
