'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, getPredicate, getPredicateColor } from '@/types'
import { Search, Users, Upload, Download, ChevronDown, ChevronUp, Star, CalendarCheck } from 'lucide-react'
import Link from 'next/link'

interface StudentReport extends Student {
  avgScore: number
  totalGrades: number
  attendanceRate: number
  totalAttendance: number
}

export default function StudentsArchivePage() {
  const supabase = createClient()
  const [students, setStudents] = useState<StudentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: studentsData }, { data: gradesData }, { data: attData }] = await Promise.all([
        supabase.from('students').select('*').eq('user_id', user.id).order('class_name').order('name'),
        supabase.from('grades').select('*').eq('user_id', user.id),
        supabase.from('attendance').select('*').eq('user_id', user.id),
      ])

      const withReport: StudentReport[] = (studentsData ?? []).map(s => {
        const sGrades = (gradesData ?? []).filter(g => g.student_id === s.id)
        const avgScore = sGrades.length ? Math.round(sGrades.reduce((a, g) => a + Number(g.score), 0) / sGrades.length) : 0

        const sAtt = (attData ?? []).filter(a => a.student_id === s.id)
        const hadir = sAtt.filter(a => a.status === 'hadir').length
        const attendanceRate = sAtt.length ? Math.round((hadir / sAtt.length) * 100) : 0

        return { ...s, avgScore, totalGrades: sGrades.length, attendanceRate, totalAttendance: sAtt.length }
      })

      // Sort: per class, then alphabetically by name
      withReport.sort((a, b) => {
        if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name)
        return a.name.localeCompare(b.name)
      })

      setStudents(withReport)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.nis.includes(search) ||
    s.class_name.toLowerCase().includes(search.toLowerCase())
  )

  // Group by class
  const grouped: Record<string, StudentReport[]> = {}
  filtered.forEach(s => {
    if (!grouped[s.class_name]) grouped[s.class_name] = []
    grouped[s.class_name].push(s)
  })
  const classNames = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Data — Data Siswa</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Arsip data siswa per semester, tersusun per kelas dan urutan abjad. {students.length} siswa total.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/import" className="btn-secondary text-sm">
            <Upload className="w-4 h-4" /> Import
          </Link>
          <Link href="/import" className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export
          </Link>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Cari nama, NIS, atau kelas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Info note */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-700">
        Ini adalah arsip rekap data siswa selama semester (mirip rapor). Untuk menambah, mengubah, atau menghapus siswa, buka halaman <Link href="/classes" className="font-medium underline">Kelas</Link> lalu pilih kelas yang sesuai.
      </div>

      {loading ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : classNames.length === 0 ? (
        <div className="card p-10 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">
            {search ? 'Tidak ada siswa yang cocok.' : 'Belum ada data siswa. Tambahkan siswa lewat halaman Kelas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {classNames.map(className => {
            const classStudents = grouped[className]
            const isExpanded = expandedClass === className || expandedClass === null
            return (
              <div key={className} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedClass(expandedClass === className ? '__none__' : className)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="badge bg-indigo-50 text-indigo-700 text-sm px-3 py-1">{className}</span>
                    <span className="text-sm text-slate-500">{classStudents.length} siswa</span>
                  </div>
                  {expandedClass === className ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedClass !== className && (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="table-header w-10">No</th>
                          <th className="table-header">Nama</th>
                          <th className="table-header">NIS</th>
                          <th className="table-header">Gender</th>
                          <th className="table-header">Rata-rata Nilai</th>
                          <th className="table-header">Kehadiran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((s, i) => {
                          const pred = s.avgScore > 0 ? getPredicate(s.avgScore) : null
                          return (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                              <td className="table-cell text-slate-400">{i + 1}</td>
                              <td className="table-cell font-medium text-slate-900">{s.name}</td>
                              <td className="table-cell text-slate-500">{s.nis}</td>
                              <td className="table-cell text-slate-500">{s.gender}</td>
                              <td className="table-cell">
                                {pred ? (
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
                                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {s.avgScore}
                                    </span>
                                    <span className={`badge ${getPredicateColor(pred)} text-xs`}>{pred}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">Belum ada nilai</span>
                                )}
                              </td>
                              <td className="table-cell">
                                {s.totalAttendance > 0 ? (
                                  <span className="flex items-center gap-1 text-sm text-slate-700">
                                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /> {s.attendanceRate}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">Belum ada data</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
