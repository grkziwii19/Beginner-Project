-- ============================================================
-- MIGRATION: Mode Wali Kelas (Mengajar Semua Mapel)
-- Jalankan di: Supabase Dashboard > SQL Editor
-- Aman dijalankan walau kolom sudah ada (idempotent)
-- ============================================================

-- Jika true, kelas ini dianggap diajar oleh satu wali kelas yang
-- mengajar semua mata pelajaran sendiri (umumnya guru SD). Menu
-- Absensi dan Nilai akan langsung masuk ke kelas tanpa perlu memilih
-- mapel terlebih dahulu.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_homeroom_only BOOLEAN NOT NULL DEFAULT false;
