'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Student, type ClassItem, getInitials, formatDateShort } from '@/types'
import StudentDetailModal from '@/components/students/StudentDetailModal'
import AddClassModal from '@/components/students/AddClassModal'
import EditClassModal from '@/components/students/EditClassModal'
import ImportStudentsTab from '@/components/students/ImportStudentsTab'
import AbsensiTab from '@/components/mengajar/AbsensiTab'
import NilaiTab from '@/components/mengajar/NilaiTab'
import CatatanTab from '@/components/mengajar/CatatanTab'
import { type ClassFormData } from '@/components/students/ClassForm'
import { normalizeClassName, formatClassName } from '@/lib/normalizeClassName'
import {
  Plus, Search, Users, Trash2, Filter,
  PieChart, List, ChevronDown, Pencil, Upload,
  ArrowLeft, ClipboardCheck, Award, NotebookPen, GraduationCap,
  Calendar, BookOpen, Info, CheckCircle2, ShieldAlert, Sparkles, User, HelpCircle
} from 'lucide-react'

type TabType = 'daftar' | 'absensi' | 'nilai' | 'catatan' | 'statistik' | 'import'
type ViewFilter = 'identitas' | 'akademik' | 'orang_tua'

const VIEW_OPTIONS: { key: ViewFilter; label: string }[] = [
  { key: 'identitas', label: 'Identitas Diri' },
  { key: 'akademik', label: 'Akademik & NIS' },
  { key: 'orang_tua', label: 'Hubungan Orang Tua' },
]

const UMUM_VALUE = '__umum__'

function getAcademicYear() {
  const y = new Date().getFullYear()
  return new Date().getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

// ── SKELETON LOADERS FOR MODERN UX ──
const ClassGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
    {[1, 2, 3].map((n) => (
      <div key={n} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="h-6 bg-slate-100 rounded-md w-24"></div>
          <div className="h-5 bg-slate-100 rounded-full w-12"></div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-4 bg-slate-150 rounded w-full"></div>
          <div className="h-4 bg-slate-100 rounded w-5/6"></div>
        </div>
        <div className="h-8 bg-slate-50 rounded-xl w-full pt-2"></div>
      </div>
    ))}
  </div>
)

const StudentsTableSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
    {[1, 2, 3, 4, 5].map((n) => (
      <div key={n} className="flex items-center space-x-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-3 bg-slate-100 rounded w-1/6"></div>
        </div>
        <div className="h-4 bg-slate-150 rounded w-12"></div>
      </div>
    ))}
  </div>
)

function KelasPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  // Mengambil kata kunci pencarian dari URL (?q=...)
  const searchQuery = searchParams.get('q') || ''

  // ── State Kelas & Siswa ──
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // ── State Navigasi & Filter ──
  const [activeTab, setActiveTab] = useState<TabType>('daftar')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('identitas')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // ── State Parameter Global ──
  const [selectedSubject, setSelectedSubject] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [inputType, setInputType] = useState('Harian')

  // ── State Nilai & Academic Year ──
  const [semester] = useState('1')
  const [academicYear, setAcademicYear] = useState(() => getAcademicYear())

  // ── State Modals ──
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showAddClassModal, setShowAddClassModal] = useState(false)
  const [showEditClassModal, setShowEditClassModal] = useState(false)
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

  // SESUDAH (Sudah bersih dari sisa pemanggilan)
  useEffect(() => {
    fetchStudents()
    if (selectedClass) {
      setSelectedSubject(selectedClass.is_homeroom_only ? UMUM_VALUE : '')
    } else {
      setSelectedSubject('')
    }
    setActiveTab('daftar')
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

  // ── Filter Pencarian Kelas (Tampilan Utama Dashboard Kelas) ──
  const filteredClasses = classes.filter(c => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.homeroom_teacher ?? '').toLowerCase().includes(q) ||
      (c.subjects ?? []).some(sub => sub.toLowerCase().includes(q))
    );
  });

  // ── Filter Pencarian Siswa (Tampilan Detail Kelas Terpilih) ──
  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.nisn ?? '').toLowerCase().includes(q) ||
      (s.parent_name ?? '').toLowerCase().includes(q)
    )
  })

  // ── Statistik ──
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
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">Manajemen Kelas</h1>
            <p className="mt-2 text-slate-500 max-w-2xl text-sm sm:text-base">
              Pilih kelas di bawah ini untuk mulai mengelola siswa, absensi, tugas, dan nilai akademik secara efisien.
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-150 hover:bg-indigo-500 hover:shadow transition-all duration-200 active:scale-[0.98] w-full md:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Plus className="w-5 h-5" /> Tambah Kelas
            </button>
          </div>
        </div>

        {/* Dynamic Classes State */}
        {loadingClasses ? (
          <ClassGridSkeleton />
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Belum Ada Kelas yang Terdaftar</h3>
            <p className="text-slate-500 mt-2 mb-6 max-w-md text-sm">
              Mulai kelola ruang kelas Anda. Buat kelas pertama Anda sekarang untuk mendaftarkan siswa dan mengatur aktivitas belajar.
            </p>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 hover:shadow transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Buat Kelas Pertama
            </button>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-slate-50/50 border border-slate-150 rounded-3xl">
            <div className="p-4 bg-slate-100 text-slate-400 rounded-2xl mb-3">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-slate-700 font-semibold">Kelas Tidak Ditemukan</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Tidak ada hasil kelas yang cocok dengan kata kunci pencarian Anda. Silakan coba kata kunci lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className="group relative bg-white border border-slate-200/80 rounded-2xl p-6 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base border border-indigo-100/50">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Kelas {c.name}
                      </h3>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/50 capitalize">
                      {c.status || 'aktif'}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2 text-sm text-slate-650">
                    <div className="flex items-center gap-3">
                      <div className="w-5 flex justify-center text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-slate-400 font-medium w-20 shrink-0">Wali Kelas</span>
                      <span className="text-slate-800 font-semibold truncate flex-1">{c.homeroom_teacher || 'Belum diatur'}</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 flex justify-center text-slate-400 mt-0.5">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="text-slate-400 font-medium w-20 shrink-0">Mapel</span>
                      <span className="text-slate-750 font-medium line-clamp-2 flex-1">
                        {c.is_homeroom_only ? 'Semua Mapel (Wali Kelas)' : (c.subjects?.join(', ') || 'Belum ada mapel')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <span>Mulai kelola kelas</span>
                  <div className="p-1 rounded-lg bg-slate-50 group-hover:bg-indigo-50 transition-colors">
                    <ChevronDown className="w-4 h-4 -rotate-90 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
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
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* DASHBOARD KONTROL UTAMA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedClassId('')}
              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-200 border border-slate-200 shadow-sm active:scale-95"
              title="Kembali ke Daftar Kelas"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900">Kelas {selectedClass.name}</h1>
                <button
                  onClick={() => setShowEditClassModal(true)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-150 active:scale-95"
                  title="Edit Detail Kelas"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Kelola informasi murid, agenda, absensi, serta rekam nilai.</p>
            </div>
          </div>
        </div>

        {/* CONTROLS PANELS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Wali Kelas</label>
            <div className="text-slate-800 font-bold text-sm bg-slate-50/70 border border-slate-100 rounded-xl px-4 h-[46px] flex items-center justify-between">
              <span className="truncate">{selectedClass.homeroom_teacher || 'Belum diatur'}</span>
              <User className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Mata Pelajaran</label>
            <div className="relative">
              <select
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-4 pr-10 text-sm py-2.5 h-[46px] font-bold text-slate-850 appearance-none cursor-pointer"
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
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Tanggal</label>
            <div className="relative">
              <input
                type="date"
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 text-sm py-2.5 h-[46px] font-bold text-slate-850"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Input Data</label>
            <div className="relative">
              <select
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-4 pr-10 text-sm py-2.5 h-[46px] font-bold text-slate-850 appearance-none cursor-pointer"
                value={inputType}
                onChange={e => setInputType(e.target.value)}
              >
                <option value="Harian">Harian</option>
                <option value="Kuis">Kuis</option>
                <option value="STS">STS (Sumatif Tengah Semester)</option>
                <option value="SAS">SAS (Sumatif Akhir Semester)</option>
                <option value="PAT">PAT (Penilaian Akhir Tahun)</option>
                <option value="TKA">TKA (Tes Kemampuan Akademik)</option>
                <option value="Praktik">Praktik</option>
                <option value="Proyek">Proyek</option>
                <option value="Portofolio">Portofolio</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SEGMENTED CONTROL TABS */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1">
        {[
          { id: 'daftar', label: 'Daftar Siswa', icon: List },
          { id: 'absensi', label: 'Absensi', icon: ClipboardCheck },
          { id: 'nilai', label: 'Nilai', icon: Award },
          { id: 'catatan', label: 'Catatan', icon: NotebookPen },
          { id: 'statistik', label: 'Statistik', icon: PieChart },
          { id: 'import', label: 'Import', icon: Upload },
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex-1 min-w-[120px] whitespace-nowrap ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ISI KONTEN BERDASARKAN TAB YANG AKTIF */}

      {/* ── TAB: DAFTAR SISWA ── */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5" /> Total {students.length} Siswa Terdaftar
            </span>
            <div className="flex items-center gap-3">
              {students.length > 0 && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <Filter className="w-4 h-4 text-slate-450" />
                  <select
                    className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer p-0 pr-6"
                    value={viewFilter}
                    onChange={e => setViewFilter(e.target.value as ViewFilter)}
                  >
                    {VIEW_OPTIONS.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                </div>
              )}
              <button
                onClick={openAddStudent}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:shadow transition-all duration-200 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Tambah Siswa
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loadingStudents ? (
              <StudentsTableSkeleton />
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
                  <Users className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">Ruang Kelas Kosong</h3>
                <p className="text-slate-550 text-sm mt-1 mb-5 max-w-sm">
                  Kelas ini belum memiliki daftar siswa. Mulai tambahkan murid Anda atau gunakan fitur import di tab atas.
                </p>
                <button
                  onClick={openAddStudent}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Tambah Siswa Pertama
                </button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-slate-50/40">
                <div className="p-4 bg-slate-100 text-slate-400 rounded-full mb-3">
                  <Search className="w-8 h-8" />
                </div>
                <p className="text-slate-700 font-semibold">Tidak Ada Hasil Cocok</p>
                <p className="text-slate-500 text-xs mt-1">
                  Pencarian murid dengan kata kunci saat ini tidak ditemukan. Coba hapus atau ubah filter pencarian.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150">
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450 w-16 text-center">No</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450 w-20 text-center">Foto</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">Nama Lengkap</th>

                      {viewFilter === 'identitas' && (
                        <>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450 w-24 text-center">Gender</th>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">Agama</th>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">Tempat Lahir</th>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">Tanggal Lahir</th>
                        </>
                      )}

                      {viewFilter === 'akademik' && (
                        <>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">NIS</th>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">NISN</th>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">Alamat Rumah</th>
                        </>
                      )}

                      {viewFilter === 'orang_tua' && (
                        <>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">Nama Orang Tua / Wali</th>
                          <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450">No. HP Orang Tua</th>
                        </>
                      )}

                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-450 w-20 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s, i) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        onClick={() => openEditStudent(s)}
                      >
                        <td className="px-5 py-3 text-sm text-slate-400 font-medium text-center">{i + 1}</td>
                        <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <div
                            onClick={() => openEditStudent(s)}
                            className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100/80 overflow-hidden flex items-center justify-center text-indigo-700 font-bold text-sm mx-auto shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all duration-250"
                          >
                            {s.photo_url ? (
                              <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(s.name)
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm sm:text-base">{s.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5 sm:hidden">NIS: {s.nis || '-'}</div>
                        </td>

                        {viewFilter === 'identitas' && (
                          <>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                s.gender === 'Laki-laki'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-pink-50 text-pink-700 border border-pink-100'
                              }`}>
                                {s.gender === 'Laki-laki' ? 'L' : 'P'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm font-semibold text-slate-600">{s.religion || '-'}</td>
                            <td className="px-5 py-3 text-sm font-medium text-slate-600">{s.birth_place || '-'}</td>
                            <td className="px-5 py-3 text-sm font-medium text-slate-500">{formatDateShort(s.birth_date)}</td>
                          </>
                        )}

                        {viewFilter === 'akademik' && (
                          <>
                            <td className="px-5 py-3 text-sm font-bold text-slate-800">{s.nis}</td>
                            <td className="px-5 py-3 text-sm font-semibold text-slate-600">{s.nisn || '-'}</td>
                            <td className="px-5 py-3 text-sm font-medium text-slate-500 truncate max-w-xs">{s.address || '-'}</td>
                          </>
                        )}

                        {viewFilter === 'orang_tua' && (
                          <>
                            <td className="px-5 py-3">
                              <span className="font-bold text-slate-800 text-sm">
                                {s.parent_name || '-'}
                              </span>
                              {s.parent_type && (
                                <span className="text-xs font-semibold text-slate-400 block mt-0.5">({s.parent_type})</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-sm font-bold text-slate-700 font-mono">{s.parent_phone || '-'}</td>
                          </>
                        )}

                        <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setDeleteConfirm(s)}
                            className="inline-flex p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ── TAB: ABSENSI ── */}
      {activeTab === 'absensi' && (
        !selectedSubject ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="p-4 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-slate-850 text-lg">Pilih Mata Pelajaran Terlebih Dahulu</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm">
              Silakan pilih mata pelajaran dan tanggal pada bar kontrol di atas untuk memulai pencatatan absensi.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <AbsensiTab
              className={selectedClass.name}
              subject={selectedSubject}
              date={date}
            />
          </div>
        )
      )}

      {/* ── TAB: NILAI ── */}
      {activeTab === 'nilai' && (
        !selectedSubject ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="p-4 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-slate-850 text-lg">Pilih Mata Pelajaran Terlebih Dahulu</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm">
              Silakan pilih mata pelajaran dan tanggal pada bar kontrol di atas untuk mengisi nilai siswa.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <NilaiTab
              className={selectedClass.name}
              subject={selectedSubject === UMUM_VALUE ? 'Umum' : selectedSubject}
              date={date}
              semester={semester}
              academicYear={academicYear}
              inputType={inputType}
            />
          </div>
        )
      )}

      {/* ── TAB: CATATAN ── */}
      {activeTab === 'catatan' && (
        !selectedSubject ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="p-4 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-slate-850 text-lg">Pilih Mata Pelajaran Terlebih Dahulu</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm">
              Silakan pilih mata pelajaran dan tanggal pada bar kontrol di atas untuk melihat atau membuat catatan siswa.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <CatatanTab
              className={selectedClass.name}
              subject={selectedSubject === UMUM_VALUE ? 'Umum' : selectedSubject}
            />
          </div>
        )
      )}

      {/* ── TAB: STATISTIK ── */}
      {activeTab === 'statistik' && (
        <div className="space-y-6">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
              <PieChart className="w-10 h-10 text-slate-350 mb-3" />
              <p className="text-slate-500 text-sm">Belum ada data murid untuk dianalisis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa</span>
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                </div>
                <p className="text-xs text-slate-400 mt-4">Siswa terdaftar aktif</p>
              </div>

              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Laki-Laki</span>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-indigo-700">{stats.laki}</p>
                </div>
                <p className="text-xs text-indigo-500 mt-4">{Math.round((stats.laki / stats.total) * 100) || 0}% dari seluruh siswa</p>
              </div>

              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-pink-500 uppercase tracking-wider">Perempuan</span>
                    <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-pink-700">{stats.perempuan}</p>
                </div>
                <p className="text-xs text-pink-500 mt-4">{Math.round((stats.perempuan / stats.total) * 100) || 0}% dari seluruh siswa</p>
              </div>

              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Lengkap Biodata</span>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-emerald-700">{stats.lengkapBiodata}</p>
                </div>
                <p className="text-xs text-emerald-500 mt-4">Siswa melengkapi profil</p>
              </div>

              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Sudah Ada Foto</span>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-amber-700">{stats.adaFoto}</p>
                </div>
                <p className="text-xs text-amber-500 mt-4">Siswa terunggah pas foto</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: IMPORT ── */}
      {activeTab === 'import' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <ImportStudentsTab className={selectedClass.name} onImported={fetchStudents} />
        </div>
      )}

      {/* Modals & Popups */}
      <StudentDetailModal
        open={showStudentModal}
        student={selectedStudent}
        className={selectedClass.name}
        onClose={() => setShowStudentModal(false)}
        onSaved={fetchStudents}
      />

      {showEditClassModal && selectedClass && (
        <EditClassModal
          classItem={selectedClass}
          onClose={() => setShowEditClassModal(false)}
          onSave={handleEditClass}
          onDelete={handleDeleteClass}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-slate-100 scale-100 transform transition-all duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Hapus {deleteConfirm.name}?</h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 px-2">
              Langkah ini akan menghapus semua biodata, rekaman absensi, dan nilai akademik siswa ini secara permanen. Tindakan tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 justify-center rounded-xl border border-slate-250 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 justify-center rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-all duration-150 shadow-sm shadow-red-100 active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── BUNGKUS DENGAN DYNAMIC IMPORT SSR: FALSE ──
const KelasPage = dynamic(() => Promise.resolve(KelasPageContent), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-350 border-t-indigo-600"></div>
      <p className="text-sm font-semibold text-slate-500">Memuat modul kelas GR Assistant...</p>
    </div>
  )
})

export default KelasPage