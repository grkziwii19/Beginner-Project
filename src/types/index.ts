export type Gender = 'Laki-laki' | 'Perempuan'
export type ParentType = 'Ayah' | 'Ibu' | 'Wali'
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
  parent_type?: ParentType | null
  parent_name?: string | null
  parent_phone?: string | null

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
// Mencakup jenjang SD, SMP, dan SMA/SMK (Kurikulum Merdeka) sekaligus,
// supaya guru jarang perlu mengetik manual dengan nama yang tidak konsisten.
export const COMMON_SUBJECTS = [
  // ── Umum / lintas jenjang ──
  'Pendidikan Agama Islam dan Budi Pekerti',
  'Pendidikan Agama Kristen dan Budi Pekerti',
  'Pendidikan Agama Katolik dan Budi Pekerti',
  'Pendidikan Agama Hindu dan Budi Pekerti',
  'Pendidikan Agama Buddha dan Budi Pekerti',
  'Pendidikan Agama Konghucu dan Budi Pekerti',
  'Pendidikan Pancasila',
  'PPKn',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Bahasa Daerah',
  'Matematika',
  'Seni Budaya',
  'Seni Musik',
  'Seni Rupa',
  'Seni Tari',
  'Seni Teater',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  'Informatika / TIK',
  'Prakarya',
  'Muatan Lokal',
  'Bimbingan Konseling',

  // ── Khas SD (tematik) ──
  'Tematik',
  'Ilmu Pengetahuan Alam dan Sosial (IPAS)',

  // ── Khas SMP ──
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',

  // ── Peminatan MIPA (SMA) ──
  'Matematika Tingkat Lanjut',
  'Fisika',
  'Kimia',
  'Biologi',

  // ── Peminatan IPS (SMA) ──
  'Sejarah',
  'Geografi',
  'Sosiologi',
  'Ekonomi',
  'Antropologi',

  // ── Peminatan Bahasa & Budaya (SMA) ──
  'Bahasa dan Sastra Indonesia',
  'Bahasa dan Sastra Inggris',
  'Bahasa Mandarin',
  'Bahasa Arab',
  'Bahasa Jepang',
  'Bahasa Jerman',
  'Bahasa Prancis',
  'Bahasa Korea',
  'Antropologi Budaya',

  // ── Lintas Minat / Pilihan (SMA) ──
  'Informatika Lanjut',
  'Ekonomi Lanjut',

  // ── SMK / Kejuruan (umum, sering dipakai lintas jurusan) ──
  'Projek Kreatif dan Kewirausahaan',
  'Dasar-Dasar Kejuruan',
  'Praktik Kerja Lapangan (PKL)',
  'Produk Kreatif dan Kewirausahaan',
  'Simulasi dan Komunikasi Digital',
  'Fisika Terapan',
  'Kimia Terapan',
  'Kewirausahaan',
]

export const RELIGION_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya']

export const PARENT_TYPE_OPTIONS: ParentType[] = ['Ayah', 'Ibu', 'Wali']

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

// Format singkat DD/MM/YYYY, contoh: "01/02/2000" — dipakai di tabel
// filter "Identitas" agar ringkas dan tidak memakan banyak ruang kolom.
export function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
