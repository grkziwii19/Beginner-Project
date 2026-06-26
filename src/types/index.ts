export type Gender = 'Laki-laki' | 'Perempuan'
export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha'
export type GradeType = 'tugas' | 'uts' | 'uas' | 'proyek'
export type ClassStatus = 'aktif' | 'arsip'

export interface Student {
  id: string
  user_id: string
  name: string
  nis: string
  nisn?: string | null
  class_name: string
  gender: Gender
  photo?: string | null

  // ── Biodata lengkap ──
  photo_url?: string | null
  birth_place?: string | null
  birth_date?: string | null
  religion?: string | null
  address?: string | null
  phone?: string | null
  father_name?: string | null
  mother_name?: string | null
  parent_phone?: string | null
  custom_fields?: Record<string, string>

  created_at: string
  updated_at?: string
}

export interface Attendance {
  id: string
  user_id: string
  student_id: string
  date: string
  status: AttendanceStatus
  subject?: string | null // null = absensi umum (upacara, ekskul, dll)
  created_at: string
}

export interface Grade {
  id: string
  user_id: string
  student_id: string
  subject: string
  type: GradeType
  score: number
  created_at: string
}

export interface ClassItem {
  id: string
  user_id: string
  name: string
  homeroom_teacher?: string | null
  room?: string | null
  schedule_days?: string | null
  status: ClassStatus
  subjects?: string[] | null
  is_homeroom_only?: boolean
  created_at: string
}

// Daftar mata pelajaran umum sebagai saran/autocomplete saat menambah kelas.
// Guru tetap bisa mengetik nama mapel custom yang tidak ada di daftar ini.
export const COMMON_SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'IPA',
  'IPS',
  'Pendidikan Agama',
  'PPKn',
  'Seni Budaya',
  'Pendidikan Jasmani (PJOK)',
  'Prakarya',
  'Informatika / TIK',
  'Bahasa Daerah',
  'Matematika Wajib',
  'Fisika',
  'Kimia',
  'Biologi',
  'Ekonomi',
  'Sejarah',
  'Geografi',
  'Sosiologi',
]

// ── Kolom data kustom — versi sederhana, semua bertipe teks bebas ──
export interface CustomFieldDefinition {
  id: string
  user_id: string
  field_key: string
  field_label: string
  sort_order: number
  created_at: string
}

export const RELIGION_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya']

export function getStatusLabel(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    hadir: 'Hadir', sakit: 'Sakit', izin: 'Izin', alpha: 'Alpha',
  }
  return map[status]
}

export function getStatusColor(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    hadir: 'bg-emerald-50 text-emerald-700',
    sakit: 'bg-blue-50 text-blue-700',
    izin: 'bg-amber-50 text-amber-700',
    alpha: 'bg-red-50 text-red-700',
  }
  return map[status]
}

export function getPredicate(avg: number): string {
  if (avg >= 90) return 'A'
  if (avg >= 80) return 'B'
  if (avg >= 70) return 'C'
  return 'D'
}

export function getPredicateColor(predicate: string): string {
  const map: Record<string, string> = {
    A: 'bg-emerald-50 text-emerald-700',
    B: 'bg-blue-50 text-blue-700',
    C: 'bg-amber-50 text-amber-700',
    D: 'bg-red-50 text-red-700',
  }
  return map[predicate] ?? 'bg-slate-100 text-slate-600'
}

export function formatDateID(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
