'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  type Student, type ClassItem, type AttendanceStatus, type GradeType,
  getStatusColor, getStatusLabel, getPredicate, getPredicateColor,
  getInitials, formatDateID,
} from '@/types'
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions'
import StudentDetailModal from '@/components/students/StudentDetailModal'
import AddFieldModal from '@/components/students/AddFieldModal'
import {
  ArrowLeft, Plus, Trash2, X, Users, ChevronLeft, ChevronRight,
  Save, CheckCircle, Award, ChevronDown, ChevronUp, BookOpen,
  Search, Filter, Tags,
} from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'

type TabType = 'siswa' | 'absensi' | 'nilai'
const STATUSES: AttendanceStatus[] = ['hadir', 'sakit', 'izin', 'alpha']
const GRADE_TYPES: GradeType[] = ['tugas', 'uts', 'uas', 'proyek']
const TYPE_LABELS: Record<GradeType, string> = { tugas: 'Tugas', uts: 'UTS', uas: 'UAS', proyek: 'Proyek' }
const TYPE_COLORS: Record<GradeType, string> = {
  tugas: 'bg-sky-50 text-sky-700', uts: 'bg-violet-50 text-violet-700',
  uas: 'bg-orange-50 text-orange-700', proyek: 'bg-pink-50 text-pink-700',
}

// Preset filter kategori untuk tabel siswa (selalu tersedia)
const PRESET_VIEWS = [
  { key: 'default', label: 'Tampilan Standar' },
  { key: 'orang_tua', label: 'Orang Tua' },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
  { key: 'kontak', label: 'Kontak' },
]

const emptyGradeForm = { student_id: '', subject: 'Umum', type: 'tugas' as GradeType, score: '' }

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const classId = params.id as string

  const { fields: customFields, addField, removeField } = useFieldDefinitions()

  const [classItem, setClassItem] = useState<ClassItem | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('siswa')

  // Siswa tab state
  const [search, setSearch] = useState('')
  const [viewFilter, setViewFilter] = useState('default')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFieldModal, setShowFieldModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null)

  // Absensi tab state
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [savingAtt, setSavingAtt] = useState(false)
  const [savedAtt, setSavedAtt] = useState(false)

  // Nilai tab state
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [gradeForm, setGradeForm] = useState(emptyGradeForm)
  const [savingGrade, setSavingGrade] = useState(false)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  const fetchClassAndStudents = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: classData } = await supabase.from('classes').select('*').eq('id', classId).single()
    if (!classData) { router.push('/classes'); return }
    setClassItem(classData)

    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .eq('class_name', classData.name)
      .order('name')
    setStudents(studentsData ?? [])

    if (studentsData && studentsData.length > 0) {
      const studentIds = studentsData.map(s => s.id)
      const { data: gradesData } = await supabase
        .from('grades')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })

      const map: Record<string, any[]> = {}
      gradesData?.forEach(g => {
        if (!map[g.student_id]) map[g.student_id] = []
        map[g.student_id].push(g)
      })
      setGrades(map)
    }

    setLoading(false)
  }

  const fetchAttendance = async (date: string) => {
    const { data } = await supabase.from('attendance').select('*').eq('date', date)
    const map: Record<string, AttendanceStatus> = {}
    data?.forEach(a => {
      if (students.some(s => s.id === a.student_id)) map[a.student_id] = a.status
    })
    setAttendance(map)
  }

  useEffect(() => { fetchClassAndStudents() }, [classId])
  useEffect(() => { if (students.length > 0) fetchAttendance(attDate) }, [attDate, students])

  // --- Siswa: hapus ---
  const handleDeleteStudent = async (id: string) => {
    await supabase.from('students').delete().eq('id', id)
    setDeleteConfirm(null)
    await fetchClassAndStudents()
  }

  // --- Siswa: filter & search ---
  const viewOptions = [
    ...PRESET_VIEWS,
    ...Array.from(new Set(customFields.map(f => f.field_group))).map(g => ({ key: `custom:${g}`, label: g })),
  ]

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.nisn ?? '').toLowerCase().includes(q) ||
      (s.father_name ?? '').toLowerCase().includes(q) ||
      (s.mother_name ?? '').toLowerCase().includes(q)
    )
  })

  const extraColumnLabel = () => viewOptions.find(v => v.key === viewFilter)?.label ?? ''

  const renderExtraColumn = (s: Student) => {
    if (viewFilter === 'orang_tua') {
      return (
        <td className="table-cell">
          <p className="text-slate-700">{s.father_name || '-'}</p>
          <p className="text-slate-400 text-xs">{s.mother_name || '-'}</p>
        </td>
      )
    }
    if (viewFilter === 'tanggal_lahir') {
      return <td className="table-cell text-slate-600">{formatDateID(s.birth_date)}</td>
    }
    if (viewFilter === 'kontak') {
      return (
        <td className="table-cell">
          <p className="text-slate-700">{s.phone || '-'}</p>
          <p className="text-slate-400 text-xs">Ortu: {s.parent_phone || '-'}</p>
        </td>
      )
    }
    if (viewFilter.startsWith('custom:')) {
      const group = viewFilter.replace('custom:', '')
      const groupFields = customFields.filter(f => f.field_group === group)
      return (
        <td className="table-cell">
          {groupFields.map(f => (
            <p key={f.id} className="text-slate-600 text-xs">
              <span className="text-slate-400">{f.field_label}:</span> {s.custom_fields?.[f.field_key] || '-'}
            </p>
          ))}
        </td>
      )
    }
    return null
  }

  // --- Absensi ---
  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
    setSavedAtt(false)
  }

  const markAll = (status: AttendanceStatus) => {
    const map: Record<string, AttendanceStatus> = {}
    students.forEach(s => { map[s.id] = status })
    setAttendance(prev => ({ ...prev, ...map }))
    setSavedAtt(false)
  }

  const handleSaveAttendance = async () => {
    setSavingAtt(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const records = Object.entries(attendance).map(([student_id, status]) => ({
      user_id: user.id, student_id, date: attDate, status,
    }))

    await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' })
    setSavingAtt(false)
    setSavedAtt(true)
    setTimeout(() => setSavedAtt(false), 2500)
  }

  const changeAttDate = (delta: number) => {
    const d = new Date(attDate)
    d.setDate(d.getDate() + delta)
    setAttDate(d.toISOString().split('T')[0])
  }

  const attSummary = {
    hadir: students.filter(s => attendance[s.id] === 'hadir').length,
    sakit: students.filter(s => attendance[s.id] === 'sakit').length,
    izin: students.filter(s => attendance[s.id] === 'izin').length,
    alpha: students.filter(s => attendance[s.id] === 'alpha').length,
    belum: students.filter(s => !attendance[s.id]).length,
  }

  // --- Nilai ---
  const handleSaveGrade = async () => {
    if (!gradeForm.student_id || !gradeForm.score) return
    const score = parseFloat(gradeForm.score)
    if (isNaN(score) || score < 0 || score > 100) return
    setSavingGrade(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('grades').insert({
      user_id: user.id,
      student_id: gradeForm.student_id,
      subject: gradeForm.subject || 'Umum',
      type: gradeForm.type,
      score,
    })

    await fetchClassAndStudents()
    setShowGradeModal(false)
    setSavingGrade(false)
    setGradeForm(emptyGradeForm)
  }

  const handleDeleteGrade = async (gradeId: string) => {
    await supabase.from('grades').delete().eq('id', gradeId)
    await fetchClassAndStudents()
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat data kelas...</div>
  }

  if (!classItem) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/classes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Kelas
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{classItem.name}</h1>
              <p className="text-sm text-slate-500">{classItem.homeroom_teacher || 'Wali kelas belum diatur'} · {students.length} siswa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        {[
          { id: 'siswa', label: 'Siswa', icon: Users },
          { id: 'absensi', label: 'Absensi', icon: CheckCircle },
          { id: 'nilai', label: 'Nilai', icon: Award },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TabType)}
            className={clsx(
              'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Siswa */}
      {activeTab === 'siswa' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">{students.length} siswa terdaftar di kelas ini</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFieldModal(true)} className="btn-secondary">
                <Tags className="w-4 h-4" /> Tambah Kategori
              </button>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Tambah Siswa
              </button>
            </div>
          </div>

          {/* Filter & Search */}
          {students.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Cari nama, NIS, NISN, atau orang tua..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select className="input w-auto" value={viewFilter} onChange={e => setViewFilter(e.target.value)}>
                  {viewOptions.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Custom fields chips */}
          {customFields.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Kategori kustom:</span>
              {customFields.map(f => (
                <span key={f.id} className="badge bg-slate-100 text-slate-600 gap-1.5">
                  {f.field_label}
                  <button onClick={() => removeField(f.id)} className="hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="card overflow-hidden">
            {students.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm mb-3">Belum ada siswa di kelas ini.</p>
                <button onClick={() => setShowAddModal(true)} className="btn-primary mx-auto">
                  <Plus className="w-4 h-4" /> Tambah Siswa Pertama
                </button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-10 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Tidak ada siswa yang cocok dengan pencarian.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-header w-10">No</th>
                      <th className="table-header">Foto</th>
                      <th className="table-header">Nama</th>
                      <th className="table-header">NIS</th>
                      <th className="table-header">NISN</th>
                      <th className="table-header">JK</th>
                      {viewFilter !== 'default' && <th className="table-header">{extraColumnLabel()}</th>}
                      <th className="table-header w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s, i) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedStudent(s)}
                      >
                        <td className="table-cell text-slate-400">{i + 1}</td>
                        <td className="table-cell">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 font-semibold text-xs">
                            {s.photo_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(s.name)
                            )}
                          </div>
                        </td>
                        <td className="table-cell font-medium text-slate-900">{s.name}</td>
                        <td className="table-cell text-slate-500">{s.nis}</td>
                        <td className="table-cell text-slate-500">{s.nisn || '-'}</td>
                        <td className="table-cell text-slate-500 text-xs">{s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                        {viewFilter !== 'default' && renderExtraColumn(s)}
                        <td className="table-cell" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setDeleteConfirm(s)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Absensi — tidak diubah */}
      {activeTab === 'absensi' && (
        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="card p-10 text-center">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Tambahkan siswa di tab "Siswa" terlebih dahulu.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="card p-3 flex items-center gap-3">
                  <button onClick={() => changeAttDate(-1)} className="btn-secondary px-2.5 py-1.5">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
                      className="input text-center font-medium w-auto py-1.5" />
                    <p className="text-xs text-slate-400 mt-1 capitalize">{formatDate(attDate)}</p>
                  </div>
                  <button onClick={() => changeAttDate(1)} className="btn-secondary px-2.5 py-1.5">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAtt}
                  className={clsx('btn-primary', savedAtt && 'bg-emerald-600 hover:bg-emerald-700')}
                >
                  {savedAtt ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" />{savingAtt ? 'Menyimpan...' : 'Simpan Absensi'}</>}
                </button>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {[
                  { key: 'hadir', label: 'Hadir', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { key: 'sakit', label: 'Sakit', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                  { key: 'izin', label: 'Izin', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                  { key: 'alpha', label: 'Alpha', color: 'bg-red-50 text-red-700 border-red-100' },
                  { key: 'belum', label: 'Belum', color: 'bg-slate-100 text-slate-500 border-slate-200' },
                ].map(({ key, label, color }) => (
                  <div key={key} className={`rounded-xl p-3 text-center border ${color}`}>
                    <p className="text-2xl font-bold">{attSummary[key as keyof typeof attSummary]}</p>
                    <p className="text-xs font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-medium">Tandai semua:</span>
                {STATUSES.map(s => (
                  <button key={s} onClick={() => markAll(s)} className={clsx('badge cursor-pointer hover:opacity-80 py-1.5 px-3 text-xs', getStatusColor(s))}>
                    {getStatusLabel(s)}
                  </button>
                ))}
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="table-header w-10">No</th>
                        <th className="table-header">Nama Siswa</th>
                        <th className="table-header">Status Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s, i) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="table-cell text-slate-400">{i + 1}</td>
                          <td className="table-cell font-medium text-slate-900">{s.name}</td>
                          <td className="table-cell">
                            <div className="flex gap-2 flex-wrap">
                              {STATUSES.map(status => (
                                <button
                                  key={status}
                                  onClick={() => setStatus(s.id, status)}
                                  className={clsx(
                                    'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                                    attendance[s.id] === status
                                      ? `${getStatusColor(status)} border-transparent ring-2 ring-offset-1 ${
                                          status === 'hadir' ? 'ring-emerald-400' : status === 'sakit' ? 'ring-blue-400' :
                                          status === 'izin' ? 'ring-amber-400' : 'ring-red-400'
                                        }`
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                  )}
                                >
                                  {getStatusLabel(status)}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: Nilai — tidak diubah */}
      {activeTab === 'nilai' && (
        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="card p-10 text-center">
              <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Tambahkan siswa di tab "Siswa" terlebih dahulu.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Kelola nilai tugas, UTS, UAS, dan proyek</p>
                <button onClick={() => setShowGradeModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4" /> Tambah Nilai
                </button>
              </div>

              <div className="space-y-3">
                {students.map(s => {
                  const sGrades = grades[s.id] ?? []
                  const avg = sGrades.length ? Math.round(sGrades.reduce((a, g) => a + Number(g.score), 0) / sGrades.length) : 0
                  const pred = avg > 0 ? getPredicate(avg) : null
                  const isExpanded = expandedStudent === s.id

                  return (
                    <div key={s.id} className="card overflow-hidden">
                      <button
                        onClick={() => setExpandedStudent(isExpanded ? null : s.id)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                          {s.name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">{s.name}</p>
                          <p className="text-xs text-slate-400">{sGrades.length} nilai</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {pred ? (
                            <>
                              <div className="text-right">
                                <p className="text-lg font-bold text-slate-900">{avg}</p>
                                <p className="text-xs text-slate-400">rata-rata</p>
                              </div>
                              <span className={`badge ${getPredicateColor(pred)} text-xs px-2.5 py-1`}>{pred}</span>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">Belum ada nilai</span>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 p-4">
                          {sGrades.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-2">Belum ada nilai.</p>
                          ) : (
                            <div className="space-y-3">
                              {GRADE_TYPES.filter(t => sGrades.some(g => g.type === t)).map(type => (
                                <div key={type}>
                                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">{TYPE_LABELS[type]}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {sGrades.filter(g => g.type === type).map(g => (
                                      <div key={g.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${TYPE_COLORS[type]}`}>
                                        <span className="font-medium text-sm">{g.score}</span>
                                        {g.subject !== 'Umum' && <span className="text-xs opacity-70">{g.subject}</span>}
                                        <button onClick={() => handleDeleteGrade(g.id)} className="opacity-50 hover:opacity-100">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal: Detail/Edit Siswa */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          className={classItem.name}
          customFields={customFields}
          onClose={() => setSelectedStudent(null)}
          onSaved={fetchClassAndStudents}
        />
      )}

      {/* Modal: Tambah Siswa */}
      {showAddModal && (
        <StudentDetailModal
          student={null}
          className={classItem.name}
          customFields={customFields}
          onClose={() => setShowAddModal(false)}
          onSaved={fetchClassAndStudents}
        />
      )}

      {/* Modal: Tambah Kategori */}
      {showFieldModal && (
        <AddFieldModal onClose={() => setShowFieldModal(false)} onAdd={addField} />
      )}

      {/* Modal: Delete confirm siswa */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Hapus {deleteConfirm.name}?</h3>
            <p className="text-sm text-slate-500 mb-5">Data absensi dan nilai siswa ini juga akan terhapus.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={() => handleDeleteStudent(deleteConfirm.id)} className="btn-danger flex-1 justify-center">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Grade — tidak diubah */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Tambah Nilai — {classItem.name}</h2>
              <button onClick={() => setShowGradeModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Siswa</label>
                <select className="input" value={gradeForm.student_id}
                  onChange={e => setGradeForm({ ...gradeForm, student_id: e.target.value })}>
                  <option value="">-- Pilih Siswa --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Mata Pelajaran</label>
                <input className="input" placeholder="Contoh: Matematika" value={gradeForm.subject}
                  onChange={e => setGradeForm({ ...gradeForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="label">Jenis Nilai</label>
                <div className="flex gap-2 flex-wrap">
                  {GRADE_TYPES.map(t => (
                    <button key={t} onClick={() => setGradeForm({ ...gradeForm, type: t })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        gradeForm.type === t ? `${TYPE_COLORS[t]} border-transparent` : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Nilai (0 – 100)</label>
                <input type="number" min="0" max="100" className="input" placeholder="85"
                  value={gradeForm.score} onChange={e => setGradeForm({ ...gradeForm, score: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowGradeModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={handleSaveGrade} disabled={savingGrade} className="btn-primary flex-1 justify-center">
                {savingGrade ? 'Menyimpan...' : 'Simpan Nilai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
