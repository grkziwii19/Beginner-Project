'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, getPredicate, getPredicateColor } from '@/types'
import {
  Search, Users, Upload, Download, ChevronDown, ChevronUp, Star, CalendarCheck,
  FileText, Printer
} from 'lucide-react'
import Link from 'next/link'
import {
  MAPEL_BY_JENJANG, type Jenjang, getFaseFromClassName,
  generateCompetencyDescription,
} from '@/lib/rapor-helpers'
import RaporPreview from '@/components/rapor/RaporPreview'

interface StudentReport extends Student {
  avgScore: number
  totalGrades: number
  attendanceRate: number
  totalAttendance: number
}

type DataTab = 'siswa' | 'rapor'

export default function StudentsArchivePage() {
  const supabase = createClient()
  const [dataTab, setDataTab] = useState<DataTab>('siswa')

  // --- Data Siswa tab state ---
  const [students, setStudents] = useState<StudentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  // --- Rapor tab state ---
  const [jenjang, setJenjang] = useState<Jenjang>('SD')
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [selectedClassName, setSelectedClassName] = useState('')
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [semester, setSemester] = useState('Ganjil')
  const [academicYear, setAcademicYear] = useState('2024/2025')
  const [loadingRapor, setLoadingRapor] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: studentsData }, { data: gradesData }, { data: attData }, { data: classData }] = await Promise.all([
        supabase.from('students').select('*').eq('user_id', user.id).order('class_name').order('name'),
        supabase.from('grades').select('*').eq('user_id', user.id),
        supabase.from('attendance').select('*').eq('user_id', user.id),
        supabase.from('classes').select('id, name').eq('user_id', user.id).order('name'),
      ])

      const withReport: StudentReport[] = (studentsData ?? []).map(s => {
        const sGrades = (gradesData ?? []).filter(g => g.student_id === s.id)
        const avgScore = sGrades.length ? Math.round(sGrades.reduce((a, g) => a + Number(g.score), 0) / sGrades.length) : 0
        const sAtt = (attData ?? []).filter(a => a.student_id === s.id)
        const hadir = sAtt.filter(a => a.status === 'hadir').length
        const attendanceRate = sAtt.length ? Math.round((hadir / sAtt.length) * 100) : 0
        return { ...s, avgScore, totalGrades: sGrades.length, attendanceRate, totalAttendance: sAtt.length }
      })

      withReport.sort((a, b) => {
        if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name)
        return a.name.localeCompare(b.name)
      })

      setStudents(withReport)
      setClasses(classData ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Load siswa saat kelas dipilih di tab Rapor
  useEffect(() => {
    if (!selectedClassName) { setClassStudents([]); return }
    const loadClassStudents = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_name', selectedClassName)
        .order('name')
      setClassStudents(data ?? [])
      setSelectedStudentId('')
    }
    loadClassStudents()
  }, [selectedClassName])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.nis.includes(search) ||
    s.class_name.toLowerCase().includes(search.toLowerCase())
  )

  const grouped: Record<string, StudentReport[]> = {}
  filtered.forEach(s => {
    if (!grouped[s.class_name]) grouped[s.class_name] = []
    grouped[s.class_name].push(s)
  })
  const classNames = Object.keys(grouped).sort()

  const generateRapor = async (student: Student) => {
    setLoadingRapor(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: grades }, { data: attendance }, { data: savedDescriptions }, { data: extracurriculars }, { data: schoolProfile }, { data: teacherProfile }] = await Promise.all([
      supabase.from('grades').select('*').eq('student_id', student.id),
      supabase.from('attendance').select('*').eq('student_id', student.id),
      supabase.from('report_descriptions').select('*').eq('student_id', student.id).eq('semester', semester).eq('academic_year', academicYear),
      supabase.from('student_extracurriculars').select('*').eq('student_id', student.id).eq('semester', semester).eq('academic_year', academicYear),
      supabase.from('school_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    ])

    const mapelTemplate = MAPEL_BY_JENJANG[jenjang]

    const mapelRows = mapelTemplate.map(m => {
      const subjectGrades = (grades ?? []).filter(g => g.subject.toLowerCase().trim() === m.name.toLowerCase().trim() ||
        (g.subject === 'Umum' && mapelTemplate.length === 1))
      const score = subjectGrades.length
        ? Math.round(subjectGrades.reduce((a, g) => a + Number(g.score), 0) / subjectGrades.length)
        : null

      const saved = (savedDescriptions ?? []).find(d => d.subject === m.name)
      const description = saved?.description || (score !== null ? generateCompetencyDescription(m.name, score) : '')

      return { name: m.name, score, description }
    })

    const sakit = (attendance ?? []).filter(a => a.status === 'sakit').length
    const izin = (attendance ?? []).filter(a => a.status === 'izin').length
    const alpha = (attendance ?? []).filter(a => a.status === 'alpha').length

    const ekstrakurikulerRows = (extracurriculars ?? []).map(e => ({ name: e.name, note: e.note ?? '' }))

    setPreviewData({
      studentId: student.id,
      studentName: student.name,
      nisn: (student as any).nisn ?? '',
      className: student.class_name,
      fase: getFaseFromClassName(student.class_name),
      schoolName: schoolProfile?.name ?? '',
      schoolAddress: schoolProfile?.address ?? '',
      semester,
      academicYear,
      mapelRows,
      ekstrakurikulerRows,
      attendance: { sakit, izin, alpha },
      principalName: schoolProfile?.principal_name ?? '',
      homeroomTeacher: teacherProfile?.full_name ?? '',
    })

    setLoadingRapor(false)
    setShowPreview(true)
  }

  const handleDescriptionChange = async (index: number, newDescription: string) => {
    setPreviewData((prev: any) => {
      const updated = { ...prev }
      updated.mapelRows = [...prev.mapelRows]
      updated.mapelRows[index] = { ...updated.mapelRows[index], description: newDescription }
      return updated
    })

    // Simpan ke database supaya tidak hilang
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !previewData) return

    const mapel = previewData.mapelRows[index]
    await supabase.from('report_descriptions').upsert({
      user_id: user.id,
      student_id: previewData.studentId,
      subject: mapel.name,
      semester,
      academic_year: academicYear,
      description: newDescription,
    }, { onConflict: 'student_id,subject,semester,academic_year' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Data</h1>
          <p className="text-sm text-slate-500 mt-0.5">Arsip data siswa dan generate rapor (Laporan Hasil Belajar).</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        {[
          { id: 'siswa', label: 'Data Siswa', icon: Users },
          { id: 'rapor', label: 'Rapor', icon: FileText },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setDataTab(t.id as DataTab)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              dataTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Data Siswa (arsip) */}
      {dataTab === 'siswa' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">{students.length} siswa total, tersusun per kelas dan abjad.</p>
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

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-700">
            Untuk menambah, mengubah, atau menghapus siswa, buka halaman <Link href="/data-siswa" className="font-medium underline">Kelas</Link> lalu pilih kelas yang sesuai.
          </div>

          {loading ? (
            <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
          ) : classNames.length === 0 ? (
            <div className="card p-10 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {search ? 'Tidak ada siswa yang cocok.' : 'Belum ada data siswa.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {classNames.map(className => {
                const classStudentsArr = grouped[className]
                return (
                  <div key={className} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedClass(expandedClass === className ? '__none__' : className)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="badge bg-indigo-50 text-indigo-700 text-sm px-3 py-1">{className}</span>
                        <span className="text-sm text-slate-500">{classStudentsArr.length} siswa</span>
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
                            {classStudentsArr.map((s, i) => {
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
                                    ) : <span className="text-xs text-slate-400">Belum ada nilai</span>}
                                  </td>
                                  <td className="table-cell">
                                    {s.totalAttendance > 0 ? (
                                      <span className="flex items-center gap-1 text-sm text-slate-700">
                                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /> {s.attendanceRate}%
                                      </span>
                                    ) : <span className="text-xs text-slate-400">Belum ada data</span>}
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
      )}

      {/* TAB: Rapor */}
      {dataTab === 'rapor' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Generate Rapor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Jenjang</label>
                <select className="input" value={jenjang} onChange={e => setJenjang(e.target.value as Jenjang)}>
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>
              <div>
                <label className="label">Kelas</label>
                <select className="input" value={selectedClassName} onChange={e => setSelectedClassName(e.target.value)}>
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Semester</label>
                <select className="input" value={semester} onChange={e => setSemester(e.target.value)}>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div>
                <label className="label">Tahun Pelajaran</label>
                <input className="input" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2024/2025" />
              </div>
            </div>
          </div>

          {selectedClassName && (
            <div className="card overflow-hidden">
              {classStudents.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Belum ada siswa di kelas ini.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-header w-10">No</th>
                      <th className="table-header">Nama</th>
                      <th className="table-header">NISN</th>
                      <th className="table-header w-32">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((s, i) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="table-cell text-slate-400">{i + 1}</td>
                        <td className="table-cell font-medium text-slate-900">{s.name}</td>
                        <td className="table-cell text-slate-500">{(s as any).nisn || '-'}</td>
                        <td className="table-cell">
                          <button
                            onClick={() => generateRapor(s)}
                            disabled={loadingRapor}
                            className="btn-secondary text-xs py-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" /> {loadingRapor ? 'Memuat...' : 'Lihat Rapor'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!selectedClassName && (
            <div className="card p-10 text-center">
              <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Pilih kelas untuk mulai generate rapor siswa.</p>
            </div>
          )}
        </div>
      )}

      {showPreview && previewData && (
        <RaporPreview
          {...previewData}
          onDescriptionChange={handleDescriptionChange}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
