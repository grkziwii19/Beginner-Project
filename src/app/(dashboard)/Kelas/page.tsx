'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type ClassItem, getInitials, formatDateShort } from '@/types'
import StudentDetailModal from '@/components/students/StudentDetailModal'
import AddClassModal from '@/components/students/AddClassModal'
import EditClassModal from '@/components/students/EditClassModal'
import ImportStudentsTab from '@/components/students/ImportStudentsTab'
import AbsensiTab from '@/components/mengajar/AbsensiTab'
import NilaiTab from '@/components/mengajar/NilaiTab'
import CatatanTab from '@/components/mengajar/CatatanTab'
import ConfirmSemesterModal from '@/components/mengajar/ConfirmSemesterModal'
import { type ClassFormData } from '@/components/students/ClassForm'
import { normalizeClassName, formatClassName } from '@/lib/normalizeClassName'
import {
  Plus, Search, Users, Trash2, IdCard, Filter,
  PieChart, List, ChevronDown, Pencil, Upload,
  ArrowLeft, ClipboardCheck, Award, NotebookPen, GraduationCap
} from 'lucide-react'

type TabType = 'daftar' | 'absensi' | 'nilai' | 'catatan' | 'statistik' | 'import'
type ViewFilter = 'identitas' | 'akademik' | 'orang_tua'

const VIEW_OPTIONS: { key: ViewFilter; label: string }[] = [
  { key: 'identitas', label: 'Identitas' },
  { key: 'akademik', label: 'Akademik' },
  { key: 'orang_tua', label: 'Orang Tua' },
]

const UMUM_VALUE = '__umum__'

const SEMESTER_OPTIONS = [
  { value: '1', label: 'I (Ganjil)' },
  { value: '2', label: 'II (Genap)' },
]

function getAcademicYear() {
  const y = new Date().getFullYear()
  return new Date().getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

export default function KelasPage() {
  const supabase = createClient()

  // ── State Kelas & Siswa ──
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // ── State Navigasi & Filter ──
  const [activeTab, setActiveTab] = useState<TabType>('daftar')
  const [search, setSearch] = useState('')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('identitas')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // ── State Mengajar (Absensi/Nilai/Catatan) ──
  const [selectedSubject, setSelectedSubject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [semester, setSemester] = useState('1')
  const [academicYear, setAcademicYear] = useState(getAcademicYear())
  const [isSemesterMode, setIsSemesterMode] = useState(false)

  // ── State Modals ──
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showAddClassModal, setShowAddClassModal] = useState(false)
  const [showEditClassModal, setShowEditClassModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null)

  const selectedClass = classes.find(c => c.id === selectedClassId) ?? null

  const subjectOptions = selectedClass?.is_homeroom_only
    ? [UMUM_VALUE]
    : (selectedClass?.subjects ?? [])

  // ── Ambil daftar kelas ──
  const fetchClasses = async () => {
    setLoadingClasses(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('classes').select('*').eq('user_id', user.id).order('name')
    setClasses(data ?? [])
    setLoadingClasses(false)
  }

  useEffect(() => { fetchClasses() }, [])

  // ── Ambil siswa setiap kali kelas berubah ──
  const fetchStudents = async () => {
    if (!selectedClass) { setStudents([]); return }
    setLoadingStudents(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .eq('class_name', selectedClass.name)
      .order('name')
    setStudents(data ?? [])
    setLoadingStudents(false)
  }

  useEffect(() => {
    fetchStudents()
    // Reset parameter mapel saat pindah kelas
    if (selectedClass) {
      setSelectedSubject(selectedClass.is_homeroom_only ? UMUM_VALUE : '')
    } else {
      setSelectedSubject('')
    }
    setIsSemesterMode(false)
    setActiveTab('daftar') // Kembalikan ke tab daftar siswa saat ganti kelas
  }, [selectedClassId])

  // ── Tambah kelas baru ──
  const handleAddClass = async (form: ClassFormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Tidak terautentikasi' }

    const formatted = formatClassName(form.name.trim())
    const normalized = normalizeClassName(form.name.trim())

    const { data: inserted, error } = await supabase
      .from('classes')
      .insert({
        user_id: user.id,
        name: formatted,
        normalized_name: normalized,
        status: 'aktif',
        subjects: form.subjects,
        homeroom_teacher: form.homeroomTeacher.trim() || null,
        is_homeroom_only: form.isHomeroomOnly,
      })
      .select()
      .single()

    if (error) {
      return { error: error.code === '23505' ? 'Nama kelas sudah ada.' : 'Gagal menambahkan kelas.' }
    }

    await fetchClasses()
    if (inserted) setSelectedClassId(inserted.id)
    return { error: null }
  }

  // ── Edit kelas ──
  const handleEditClass = async (id: string, form: ClassFormData) => {
    const formatted = formatClassName(form.name.trim())
    const normalized = normalizeClassName(form.name.trim())
    const oldClass = classes.find(c => c.id === id)

    const { error } = await supabase
      .from('classes')
      .update({
        name: formatted,
        normalized_name: normalized,
        subjects: form.subjects,
        homeroom_teacher: form.homeroomTeacher.trim() || null,
        is_homeroom_only: form.isHomeroomOnly,
      })
      .eq('id', id)

    if (error) {
      return { error: error.code === '23505' ? 'Nama kelas sudah ada.' : 'Gagal menyimpan perubahan.' }
    }

    if (oldClass && oldClass.name !== formatted) {
      await supabase.from('students').update({ class_name: formatted }).eq('class_name', oldClass.name)
    }

    await fetchClasses()
    await fetchStudents()
    return { error: null }
  }

  // ── Hapus kelas ──
  const handleDeleteClass = async (id: string) => {
    await supabase.from('classes').delete().eq('id', id)
    if (selectedClassId === id) setSelectedClassId('')
    await fetchClasses()
  }

  // ── Hapus siswa ──
  const handleDelete = async (s: Student) => {
    await supabase.from('students').delete().eq('id', s.id)
    setDeleteConfirm(null)
    await fetchStudents()
  }

  const openAddStudent = () => {
    setSelectedStudent(null)
    setShowStudentModal(true)
  }

  const openEditStudent = (s: Student) => {
    setSelectedStudent(s)
    setShowStudentModal(true)
  }

  const handleToggleSemester = (checked: boolean) => {
    if (checked) setShowConfirmModal(true)
    else setIsSemesterMode(false)
  }

  // ── Filter Pencarian Siswa ──
  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.nisn ?? '').toLowerCase().includes(q) ||
      (s.parent_name ?? '').toLowerCase().includes(q)
    )
  })

  // ── Statistik sederhana ──
  const stats = {
    total: students.length,
    laki: students.filter(s => s.gender === 'Laki-laki').length,
    perempuan: students.filter(s => s.gender === 'Perempuan').length,
    lengkapBiodata: students.filter(s =>
      s.birth_date && s.address && s.parent_name
    ).length,
    adaFoto: students.filter(s => s.photo_url).length,
  }

  // 1. TAMPILAN: DAFTAR KELAS (Jika Belum Pilih Kelas atau selectedClass bernilai null)
  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Daftar Kelas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Pilih kelas di bawah ini untuk mulai mengelola siswa, absensi, dan nilai.</p>
          </div>
          <button onClick={() => setShowAddClassModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Tambah Kelas
          </button>
        </div>

        {loadingClasses ? (
          <div className="card p-10 text-center text-slate-400 text-sm">
            Memuat daftar kelas...
          </div>
        ) : classes.length === 0 ? (
          <div className="card p-10 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700">Belum ada kelas</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Buat kelas pertama Anda untuk mulai mengelola pembelajaran.</p>
            <button onClick={() => setShowAddClassModal(true)} className="btn-primary mx-auto">
              <Plus className="w-4 h-4" /> Buat Kelas Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className="card p-5 hover:border-indigo-500 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Kelas {c.name}
                    </h3>
                    <span className="badge bg-indigo-50 text-indigo-700 capitalize text-xs">
                      {c.status || 'aktif'}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-400 w-16 shrink-0">Wali Kelas:</span>
                      <span className="text-slate-800 font-medium truncate">{c.homeroom_teacher || '-'}</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="font-medium text-slate-400 w-16 shrink-0">Mapel:</span>
                      <span className="text-slate-700 line-clamp-2">
                        {c.is_homeroom_only ? 'Semua Mapel (Wali Kelas)' : (c.subjects?.join(', ') || 'Belum ada mapel')}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Klik untuk mengelola</span>
                  <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Tambah Kelas */}
        {showAddClassModal && (
          <AddClassModal onClose={() => setShowAddClassModal(false)} onAdd={handleAddClass} />
        )}
      </div>
    )
  }

  // 2. TAMPILAN: DETAIL KELAS YANG DIPILIH
  const isAcademicTab = ['absensi', 'nilai', 'catatan'].includes(activeTab)

  return (
    <div className="space-y-6">
      {/* Tombol Kembali & Header Kelas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => setSelectedClassId('')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Kelas {selectedClass.name}</h1>
            <button
              onClick={() => setShowEditClassModal(true)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit Detail Kelas"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Wali Kelas: <span className="font-medium text-slate-700">{selectedClass.homeroom_teacher || '-'}</span>
          </p>
        </div>
      </div>

      {/* TABS UTAMA KELAS */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto pb-px scrollbar-thin">
        {[
          { id: 'daftar', label: 'Daftar Siswa', icon: List },
          { id: 'absensi', label: 'Absensi', icon: ClipboardCheck },
          { id: 'nilai', label: 'Nilai', icon: Award },
          { id: 'catatan', label: 'Catatan', icon: NotebookPen },
          { id: 'statistik', label: 'Statistik', icon: PieChart },
          { id: 'import', label: 'Import', icon: Upload },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TabType)}
            className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* FILTER AKADEMIK (Hanya muncul di Tab Absensi, Nilai, dan Catatan) */}
      {isAcademicTab && (
        <div className="card p-4 sm:p-5 space-y-3 bg-slate-50 border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Pilih Mapel */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 shrink-0 uppercase tracking-wider">Mapel</label>
              <div className="relative min-w-[180px]">
                <select
                  className="input bg-white appearance-none pr-9 text-sm"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="">-- Pilih mapel --</option>
                  {subjectOptions.map(s => (
                    <option key={s} value={s}>
                      {s === UMUM_VALUE ? 'Semua Mapel (Wali Kelas)' : s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Konfigurasi Tambahan (Hanya jika Mapel sudah dipilih) */}
            {selectedSubject && (
              <div className="flex flex-wrap items-center gap-4">
                {/* Tanggal */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 shrink-0 uppercase tracking-wider">Tanggal</label>
                  <input
                    type="date"
                    className="input bg-white text-sm py-1.5"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>

                {/* Semester */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 shrink-0 uppercase tracking-wider">Semester</label>
                  <div className="relative">
                    <select
                      className="input bg-white appearance-none pr-9 text-sm py-1.5"
                      value={semester}
                      onChange={e => setSemester(e.target.value)}
                    >
                      {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Tahun Pelajaran */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 shrink-0 uppercase tracking-wider">Tahun Pelajaran</label>
                  <input
                    type="text"
                    className="input bg-white w-28 text-sm py-1.5"
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    placeholder="2024/2025"
                  />
                </div>

                {/* Nilai Semester Checkbox */}
                {activeTab === 'nilai' && (
                  <label className="flex items-center gap-2 cursor-pointer ml-auto bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={isSemesterMode}
                      onChange={e => handleToggleSemester(e.target.checked)}
                    />
                    <span className="text-xs font-medium text-slate-700">Nilai Semester</span>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ISI KONTEN BERDASARKAN TAB YANG AKTIF */}

      {/* ── TAB: Daftar Siswa ── */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">{students.length} siswa terdaftar di kelas ini.</p>
            <button onClick={openAddStudent} className="btn-primary">
              <Plus className="w-4 h-4" /> Tambah Siswa
            </button>
          </div>

          {/* Filter & Search */}
          {students.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input pl-9 text-sm"
                  placeholder="Cari nama, NIS, NISN, atau orang tua..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select className="input w-auto text-sm py-1.5" value={viewFilter} onChange={e => setViewFilter(e.target.value as ViewFilter)}>
                  {VIEW_OPTIONS.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            {loadingStudents ? (
              <div className="p-10 text-center text-slate-400 text-sm">Memuat data siswa...</div>
            ) : students.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm mb-3">Belum ada siswa di kelas ini.</p>
                <button onClick={openAddStudent} className="btn-primary mx-auto">
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
                      <th className="table-header w-12">Foto</th>
                      <th className="table-header">Nama</th>

                      {viewFilter === 'identitas' && (
                        <>
                          <th className="table-header">L/P</th>
                          <th className="table-header">Agama</th>
                          <th className="table-header">Tempat Lahir</th>
                          <th className="table-header">Tanggal Lahir</th>
                        </>
                      )}

                      {viewFilter === 'akademik' && (
                        <>
                          <th className="table-header">NIS</th>
                          <th className="table-header">NISN</th>
                          <th className="table-header">Alamat</th>
                        </>
                      )}

                      {viewFilter === 'orang_tua' && (
                        <>
                          <th className="table-header">Nama Ayah/Ibu/Wali</th>
                          <th className="table-header">No. HP Orang Tua</th>
                        </>
                      )}

                      <th className="table-header w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s, i) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => openEditStudent(s)}
                      >
                        <td className="table-cell text-slate-400">{i + 1}</td>
                        <td className="table-cell">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 font-semibold text-xs">
                            {s.photo_url ? (
                              <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(s.name)
                            )}
                          </div>
                        </td>
                        <td className="table-cell font-medium text-slate-900">{s.name}</td>

                        {viewFilter === 'identitas' && (
                          <>
                            <td className="table-cell text-slate-500 text-xs">{s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                            <td className="table-cell text-slate-600">{s.religion || '-'}</td>
                            <td className="table-cell text-slate-600">{s.birth_place || '-'}</td>
                            <td className="table-cell text-slate-600">{formatDateShort(s.birth_date)}</td>
                          </>
                        )}

                        {viewFilter === 'akademik' && (
                          <>
                            <td className="table-cell text-slate-500">{s.nis}</td>
                            <td className="table-cell text-slate-500">{s.nisn || '-'}</td>
                            <td className="table-cell text-slate-600 truncate max-w-xs">{s.address || '-'}</td>
                          </>
                        )}

                        {viewFilter === 'orang_tua' && (
                          <>
                            <td className="table-cell text-slate-700">
                              {s.parent_name
                                ? s.parent_name + (s.parent_type ? ' (' + s.parent_type + ')' : '')
                                : '-'}
                            </td>
                            <td className="table-cell text-slate-600">{s.parent_phone || '-'}</td>
                          </>
                        )}

                        <td className="table-cell text-center" onClick={e => e.stopPropagation()}>
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

      {/* ── TAB: Absensi (Butuh Mapel) ── */}
      {activeTab === 'absensi' && (
        !selectedSubject ? (
          <div className="card p-10 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700">Pilih mata pelajaran terlebih dahulu</h3>
            <p className="text-sm text-slate-400 mt-1">Gunakan pemilih mata pelajaran di atas untuk memulai absensi.</p>
          </div>
        ) : (
          <AbsensiTab
            className={selectedClass.name}
            subject={selectedSubject}
            date={date}
          />
        )
      )}

      {/* ── TAB: Nilai (Butuh Mapel) ── */}
      {activeTab === 'nilai' && (
        !selectedSubject ? (
          <div className="card p-10 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700">Pilih mata pelajaran terlebih dahulu</h3>
            <p className="text-sm text-slate-400 mt-1">Gunakan pemilih mata pelajaran di atas untuk mengisi nilai.</p>
          </div>
        ) : (
          <NilaiTab
            className={selectedClass.name}
            subject={selectedSubject === UMUM_VALUE ? 'Umum' : selectedSubject}
            date={date}
            semester={semester}
            academicYear={academicYear}
          />
        )
      )}

      {/* ── TAB: Catatan (Butuh Mapel) ── */}
      {activeTab === 'catatan' && (
        !selectedSubject ? (
          <div className="card p-10 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700">Pilih mata pelajaran terlebih dahulu</h3>
            <p className="text-sm text-slate-400 mt-1">Gunakan pemilih mata pelajaran di atas untuk membuat catatan.</p>
          </div>
        ) : (
          <CatatanTab
            className={selectedClass.name}
            subject={selectedSubject === UMUM_VALUE ? 'Umum' : selectedSubject}
          />
        )
      )}

      {/* ── TAB: Statistik ── */}
      {activeTab === 'statistik' && (
        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="card p-10 text-center">
              <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Belum ada data statistik untuk ditampilkan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="card p-5">
                <p className="text-xs text-slate-400 font-medium">Total Siswa</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate-400 font-medium">Laki-laki</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.laki}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate-400 font-medium">Perempuan</p>
                <p className="text-3xl font-bold text-pink-500 mt-1">{stats.perempuan}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate-400 font-medium">Biodata Lengkap</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.lengkapBiodata}</p>
                <p className="text-xs text-slate-400 mt-1">dari {stats.total} siswa</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate-400 font-medium">Sudah Ada Foto</p>
                <p className="text-3xl font-bold text-amber-500 mt-1">{stats.adaFoto}</p>
                <p className="text-xs text-slate-400 mt-1">dari {stats.total} siswa</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Import ── */}
      {activeTab === 'import' && (
        <ImportStudentsTab className={selectedClass.name} onImported={fetchStudents} />
      )}

      {/* Modal: Detail/Edit/Tambah Siswa */}
      <StudentDetailModal
        open={showStudentModal}
        student={selectedStudent}
        className={selectedClass.name}
        onClose={() => setShowStudentModal(false)}
        onSaved={fetchStudents}
      />

      {/* Modal: Edit Kelas (Di-wrap kondisional guna menjamin selectedClass tidak null di mata compiler) */}
      {showEditClassModal && selectedClass && (
        <EditClassModal
          classItem={selectedClass}
          onClose={() => setShowEditClassModal(false)}
          onSave={handleEditClass}
          onDelete={handleDeleteClass}
        />
      )}

      {/* Modal: Konfirmasi Nilai Semester */}
      {showConfirmModal && (
        <ConfirmSemesterModal
          onConfirm={() => { setIsSemesterMode(true); setShowConfirmModal(false) }}
          onCancel={() => setShowConfirmModal(false)}
        />
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
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1 justify-center">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}