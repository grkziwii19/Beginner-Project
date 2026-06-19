// ── Tipe data utama aplikasi Asisten Guru ──

export type Gender = 'Laki-laki' | 'Perempuan'
export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha'
export type GradeType = 'tugas' | 'uts' | 'uas' | 'proyek'
export type Predicate = 'A' | 'B' | 'C' | 'D'

export interface Student {
  id: string
  user_id: string
  name: string
  nis: string
  class_name: string
  gender: Gender
  photo?: string
  created_at: string
}

export interface Attendance {
  id: string
  user_id: string
  student_id: string
  date: string
  status: AttendanceStatus
  created_at: string
  students?: Pick<Student, 'name' | 'nis' | 'class_name'>
}

export interface Grade {
  id: string
  user_id: string
  student_id: string
  subject: string
  type: GradeType
  score: number
  created_at: string
  students?: Pick<Student, 'name' | 'nis' | 'class_name'>
}

export interface StudentWithStats extends Student {
  avg_score?: number
  predicate?: Predicate
  attendance_count?: number
}

export interface DashboardStats {
  totalStudents: number
  presentToday: number
  absentToday: number
  avgScore: number
  attendanceRate: number
}

// Helper: hitung predikat dari nilai rata-rata
export function getPredicate(avg: number): Predicate {
  if (avg >= 85) return 'A'
  if (avg >= 70) return 'B'
  if (avg >= 55) return 'C'
  return 'D'
}

export function getPredicateColor(predicate: Predicate): string {
  const colors: Record<Predicate, string> = {
    A: 'bg-emerald-100 text-emerald-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-amber-100 text-amber-700',
    D: 'bg-red-100 text-red-700',
  }
  return colors[predicate]
}

export function getStatusColor(status: AttendanceStatus): string {
  const colors: Record<AttendanceStatus, string> = {
    hadir: 'bg-emerald-100 text-emerald-700',
    sakit: 'bg-blue-100 text-blue-700',
    izin: 'bg-amber-100 text-amber-700',
    alpha: 'bg-red-100 text-red-700',
  }
  return colors[status]
}

export function getStatusLabel(status: AttendanceStatus): string {
  const labels: Record<AttendanceStatus, string> = {
    hadir: 'Hadir',
    sakit: 'Sakit',
    izin: 'Izin',
    alpha: 'Alpha',
  }
  return labels[status]
}
