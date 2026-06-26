-- ============================================================
-- MIGRATION: Menu Data Siswa (Terpisah) + Kolom Kustom Sederhana
-- Jalankan di: Supabase Dashboard > SQL Editor
-- Aman dijalankan walau tabel sudah ada (idempotent)
-- ============================================================

-- ─── STUDENTS — kolom biodata (jika belum dijalankan dari migration sebelumnya) ───
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

-- ─── HAPUS field_definitions versi lama (jika sempat dijalankan) ───
-- Versi sebelumnya punya field_type, field_group, options — sekarang disederhanakan.
DROP TABLE IF EXISTS field_definitions;

-- ─── CUSTOM_FIELD_DEFINITIONS — versi sederhana: cuma label ───
-- Contoh: "Catatan", "Makanan Favorit", "Cita-cita"
-- Semua otomatis bertipe teks bebas, disimpan di students.custom_fields (JSONB)
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key   TEXT NOT NULL,    -- slug internal, contoh: 'catatan'
  field_label TEXT NOT NULL,    -- nama tampilan, contoh: 'Catatan'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, field_key)
);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own custom fields" ON custom_field_definitions;
CREATE POLICY "Users can only access their own custom fields"
  ON custom_field_definitions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── STORAGE BUCKET untuk Foto Profil Siswa (jika belum ada) ───
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
