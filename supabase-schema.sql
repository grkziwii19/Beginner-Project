-- ============================================================
-- ASISTEN GURU — SQL Schema untuk Supabase
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── STUDENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  nis        TEXT NOT NULL,
  class_name TEXT NOT NULL,
  gender     TEXT NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
  photo      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query per user
CREATE INDEX idx_students_user_id ON students(user_id);

-- Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own students"
  ON students FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── ATTENDANCE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'alpha')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own attendance"
  ON attendance FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── GRADES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL DEFAULT 'Umum',
  type       TEXT NOT NULL CHECK (type IN ('tugas', 'uts', 'uas', 'proyek')),
  score      NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grades_user_id ON grades(user_id);
CREATE INDEX idx_grades_student_id ON grades(student_id);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own grades"
  ON grades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── CLASSES (Optional) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own classes"
  ON classes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
