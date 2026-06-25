-- ============================================================
-- MIGRATION: Biodata Siswa Lengkap + Kategori Kustom
-- Jalankan di: Supabase Dashboard > SQL Editor
-- Aman dijalankan walau tabel sudah ada (idempotent)
-- ============================================================

-- ─── STUDENTS — tambah kolom biodata lengkap ───────────────
-- (NISN sudah ditambahkan di migration rapor sebelumnya, aman jika diulang)
ALTER TABLE students ADD COLUMN IF NOT EXISTS nisn TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_students_custom_fields ON students USING GIN (custom_fields);

-- Auto updated_at trigger untuk students
-- (set_updated_at() sudah dibuat di migration rapor; aman dipanggil ulang)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── FIELD DEFINITIONS (Kategori Biodata Kustom) ───────────
-- Guru bisa menambahkan kategori biodata baru selain field default
CREATE TABLE IF NOT EXISTS field_definitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key   TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'date', 'number', 'select')),
  field_group TEXT NOT NULL DEFAULT 'Lainnya',
  options     JSONB,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, field_key)
);

ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own field definitions" ON field_definitions;
CREATE POLICY "Users can only access their own field definitions"
  ON field_definitions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── STORAGE BUCKET untuk Foto Profil Siswa ────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own student photos" ON storage.objects;
CREATE POLICY "Users can upload their own student photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own student photos" ON storage.objects;
CREATE POLICY "Users can update their own student photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'student-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own student photos" ON storage.objects;
CREATE POLICY "Users can delete their own student photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Anyone can view student photos" ON storage.objects;
CREATE POLICY "Anyone can view student photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-photos');
