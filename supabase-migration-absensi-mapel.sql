-- ============================================================
-- MIGRATION: Absensi per Mata Pelajaran (Opsional)
-- Jalankan di: Supabase Dashboard > SQL Editor
-- CATATAN: Migration ini menghapus data attendance yang sudah ada
-- (sesuai konfirmasi, masih tahap uji coba, aman dilakukan)
-- ============================================================

-- Hapus constraint UNIQUE lama (student_id, date)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;

-- Kosongkan data lama karena strukturnya berubah total
TRUNCATE TABLE attendance;

-- Tambah kolom subject — NULL berarti absensi umum (non-mapel, misal upacara/ekskul)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS subject TEXT;

-- Constraint UNIQUE baru: satu siswa hanya bisa diabsen sekali per
-- tanggal per mapel (atau sekali per tanggal untuk absensi umum/NULL).
-- Pakai index unik parsial karena NULL tidak dianggap sama di constraint biasa.
DROP INDEX IF EXISTS idx_attendance_unique_with_subject;
CREATE UNIQUE INDEX idx_attendance_unique_with_subject
  ON attendance (student_id, date, subject)
  WHERE subject IS NOT NULL;

DROP INDEX IF EXISTS idx_attendance_unique_without_subject;
CREATE UNIQUE INDEX idx_attendance_unique_without_subject
  ON attendance (student_id, date)
  WHERE subject IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject);
