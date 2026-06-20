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
  created_at: string
}

export interface Attendance {
  id: string
  user_id: string
  student_id: string
  date: string
  status: AttendanceStatus
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
  created_at: string
}

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
