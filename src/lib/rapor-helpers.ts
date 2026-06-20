// Helper untuk fitur Rapor (Laporan Hasil Belajar) - Kurikulum Merdeka

export type Jenjang = 'SD' | 'SMP' | 'SMA'

export interface MapelTemplate {
  name: string
  faseDefault?: string
}

// Daftar mata pelajaran standar per jenjang (Kurikulum Merdeka)
export const MAPEL_BY_JENJANG: Record<Jenjang, MapelTemplate[]> = {
  SD: [
    { name: 'Pendidikan Agama dan Budi Pekerti' },
    { name: 'Pendidikan Pancasila' },
    { name: 'Bahasa Indonesia' },
    { name: 'Matematika' },
    { name: 'Ilmu Pengetahuan Alam dan Sosial' },
    { name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
    { name: 'Seni Musik' },
    { name: 'Bahasa Inggris' },
    { name: 'Muatan Lokal' },
  ],
  SMP: [
    { name: 'Pendidikan Agama dan Budi Pekerti' },
    { name: 'Pendidikan Pancasila' },
    { name: 'Bahasa Indonesia' },
    { name: 'Matematika' },
    { name: 'Ilmu Pengetahuan Alam' },
    { name: 'Ilmu Pengetahuan Sosial' },
    { name: 'Bahasa Inggris' },
    { name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
    { name: 'Informatika' },
    { name: 'Seni Tari' },
  ],
  SMA: [
    { name: 'Pendidikan Agama dan Budi Pekerti' },
    { name: 'Pendidikan Pancasila' },
    { name: 'Bahasa Indonesia' },
    { name: 'Matematika' },
    { name: 'Ilmu Pengetahuan Alam (Fisika, Kimia, Biologi)' },
    { name: 'Ilmu Pengetahuan Sosial (Sosiologi, Ekonomi, Sejarah, Geografi)' },
    { name: 'Bahasa Inggris' },
    { name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
    { name: 'Informatika' },
    { name: 'Prakarya dan Kewirausahaan' },
  ],
}

// Fase Kurikulum Merdeka berdasarkan kelas
export function getFaseFromClassName(className: string): string {
  const match = className.match(/\d+/)
  const grade = match ? parseInt(match[0]) : 0

  if (grade <= 2) return 'A'
  if (grade <= 4) return 'B'
  if (grade <= 6) return 'C'
  if (grade <= 7) return 'D'
  if (grade <= 9) return 'D'
  if (grade === 10) return 'E'
  if (grade >= 11) return 'F'
  return '-'
}

// Template kalimat capaian kompetensi berdasarkan rentang nilai
// Otomatis dibuat, lalu bisa diedit manual oleh guru
export function generateCompetencyDescription(subject: string, score: number): string {
  if (score >= 90) {
    return `Menunjukkan penguasaan yang sangat baik dalam mata pelajaran ${subject}, mampu menerapkan konsep secara mandiri dan konsisten.`
  }
  if (score >= 80) {
    return `Menunjukkan penguasaan yang baik dalam mata pelajaran ${subject}, mampu memahami dan menerapkan konsep dengan tepat.`
  }
  if (score >= 70) {
    return `Menunjukkan pemahaman yang cukup dalam mata pelajaran ${subject}, namun masih memerlukan bimbingan dalam beberapa konsep.`
  }
  if (score >= 60) {
    return `Menunjukkan penguasaan dasar dalam mata pelajaran ${subject}, perlu bimbingan lebih lanjut untuk mencapai kompetensi yang ditargetkan.`
  }
  return `Memerlukan pendampingan intensif dalam mata pelajaran ${subject} untuk mencapai tujuan pembelajaran yang ditetapkan.`
}

export function getPredicateFromScore(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}
