'use client'

import { useEffect, useState } from 'react'
import { normalizeClassName, formatClassName } from '@/lib/normalizeClassName'
import { createClient } from '@/lib/supabase/client'
import { type Student, type ClassItem, getInitials, formatDateID } from '@/types'
import { useCustomFields } from '@/hooks/useCustomFields'
import StudentDetailModal from '@/components/students/StudentDetailModal'
import AddCustomFieldModal from '@/components/students/AddCustomFieldModal'
import AddClassModal from '@/components/students/AddClassModal'
import EditClassModal from '@/components/students/EditClassModal'
import { type ClassFormData } from '@/components/students/ClassForm'
import {
  Plus, Search, Users, Trash2, IdCard, Tags,
  PieChart, List, ChevronDown, Pencil,
} from 'lucide-react'

type TabType = 'daftar' | 'statistik'

const PRESET_VIEWS = [
  { key: 'default', label: 'Tampilan Standar' },
  { key: 'orang_tua', label: 'Orang Tua' },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
  { key: 'kontak', label: 'Kontak' },
]

export default function StudentsPage() {
  const supabase = createClient()
  const { fields: customFields, addField, removeField } = useCustomFields()

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  const [activeTab, setActiveTab] = useState<TabType>('daftar')
  const [search, setSearch] = useState('')
  const [viewFilter, setViewFilter] = useState('default')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFieldModal, setShowFieldModal] = useState(false)
  const [showAddClassModal, setShowAddClassModal] = useState(false)
  const [showEditClassModal, setShowEditClassModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null)

  const selectedClass = classes.find(c => c.id === selectedClassId) ?? null

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('classes').select('*').eq('user_id', user.id).order('name')
    setClasses(data ?? [])
    setLoadingClasses(false)
  }

  useEffect(() => { fetchClasses() }, [])

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

  const handleDeleteClass = async (id: string) => {
    await supabase.from('classes').delete().eq('id', id)
    if (selectedClassId === id) setSelectedClassId('')
    await fetchClasses()
  }

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

  useEffect(() => { fetchStudents() }, [selectedClassId])

  const handleDelete = async (s: Student) => {
    await supabase.from('students').delete().eq('id', s.id)
    setDeleteConfirm(null)
    await fetchStudents()
  }

  const viewOptions = PRESET_VIEWS
  const extraColumnLabel = () => viewOptions.find(v => v.key === viewFilter)?.label ?? ''

  const filtered = students.filter(s => {
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
    return null
  }

  const stats = {
    total: students.length,
    laki: students.filter(s => s.gender === 'Laki-laki').length,
    perempuan: students.filter(s => s.gender === 'Perempuan').length,
    lengkapBiodata: students.filter(s =>
      s.birth_date && s.address && s.father_name && s.mother_name
    ).length,
    adaFoto: students.filter(s => s.photo_url).length,
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Siswa</h1>
        <p className="text-sm text-slate-500 mt-0.5">Biodata lengkap siswa per kelas</p>
      </div>

      {/* ── Header: Pilih Kelas + Info ── */}
      <div className="card p-4 space-y-2.5">

        {/* Baris: Tambah Kelas (pojok kanan) */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddClassModal(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Kelas
          </button>
        </div>

        {/* Baris: Kelas [dropdown] [Edit] */}
        {loadingClasses ? (
          <p className="text-sm text-slate-400">Memuat daftar kelas...</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada kelas. Klik "+ Tambah Kelas" untuk mulai.</p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 shrink-0">Kelas</span>
            <div className="relative flex-1 max-w-xs">
              <select
                className="input appearance-none pr-9 py-1.5 text-sm"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Pilih --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {selectedClass && (
              <button
                onClick={() => setShowEditClassModal(true)}
                className="btn-secondary px-2.5 py-1.5"
                title="Edit kelas ini"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Baris: Wali Kelas */}
        {selectedClass && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 shrink-0">Wali Kelas</span>
            <span className="text-sm font-medium text-slate-800">
              {selectedClass.homeroom_teacher || '-'}
            </span>
          </div>
        )}

        {/* Baris: Mata Pelajaran — disembunyikan jika wali kelas mengajar semua */}
        {selectedClass && !selectedClass.is_homeroom_only && (
          <div className="flex items-start gap-2">
            <span className="text-sm text-slate-500 shrink-0 mt-0.5">Mata Pelajaran</span>
            {selectedClass.subjects && selectedClass.subjects.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedClass.subjects.map(s => (
                  <span key={s} className="badge bg-slate-100 text-slate-600 text-[11px] px-1.5 py-0.5">{s}</span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate-400">Belum ada</span>
            )}
          </div>
        )}
      </div>

      {/* ── Konten setelah kelas dipilih ── */}
      {selectedClass && (
        <>
          {/* Tabs */}
          <div className="flex gap-6 border-b border-slate-200">
            {[
              { id: 'daftar', label: 'Daftar Siswa', icon: List },
              { id: 'statistik', label: 'Statistik', icon: PieChart },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabType)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* TAB: Daftar */}
          {activeTab === 'daftar' && (
            <div className="space-y-3">

              {/* Toolbar: jumlah siswa + aksi */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-slate-500">{students.length} siswa</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowFieldModal(true)} className="btn-secondary text-xs px-3 py-1.5">
                    <Tags className="w-3.5 h-3.5" /> Kolom
                  </button>
                  <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs px-3 py-1.5">
                    <Plus className="w-3.5 h-3.5" /> Tambah Siswa
                  </button>
                </div>
              </div>

              {/* Search + Filter */}
              {students.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      className="input pl-8 py-1.5 text-sm"
                      placeholder="Cari nama, NIS, NISN, orang tua..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="input py-1.5 text-sm w-auto shrink-0"
                    value={viewFilter}
                    onChange={e => setViewFilter(e.target.value)}
                  >
                    <option value="default">Filter</option>
                    {viewOptions.filter(v => v.key !== 'default').map(v => (
                      <option key={v.key} value={v.key}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kolom kustom chips */}
              {customFields.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">Kolom tambahan:</span>
                  {customFields.map(f => (
                    <span key={f.id} className="badge bg-slate-100 text-slate-600 gap-1">
                      {f.field_label}
                      <button onClick={() => removeField(f.id)} className="hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tabel */}
              <div className="card overflow-hidden">
                {loadingStudents ? (
                  <div className="p-10 text-center text-slate-400 text-sm">Memuat data...</div>
                ) : students.length === 0 ? (
                  <div className="p-10 text-center">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm mb-3">Belum ada siswa di kelas ini.</p>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary mx-auto">
                      <Plus className="w-4 h-4" /> Tambah Siswa Pertama
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-10 text-center">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Tidak ada siswa yang cocok.</p>
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
                        {filtered.map((s, i) => (
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

          {/* TAB: Statistik */}
          {activeTab === 'statistik' && (
            <div className="space-y-4">
              {students.length === 0 ? (
                <div className="card p-10 text-center">
                  <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Belum ada data untuk ditampilkan.</p>
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
        </>
      )}

      {/* Empty state */}
      {!selectedClass && !loadingClasses && classes.length > 0 && (
        <div className="card p-10 text-center">
          <IdCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">Pilih kelas untuk mulai</h3>
          <p className="text-sm text-slate-400 mt-1">Pilih kelas di atas untuk melihat dan mengelola data siswa.</p>
        </div>
      )}

      {/* Modal: Detail/Edit Siswa */}
      <StudentDetailModal
        open={!!selectedStudent && !!selectedClass}
        student={selectedStudent}
        className={selectedClass?.name ?? ''}
        customFields={customFields}
        onClose={() => setSelectedStudent(null)}
        onSaved={fetchStudents}
      />

      {/* Modal: Tambah Siswa */}
      <StudentDetailModal
        open={showAddModal && !!selectedClass}
        student={null}
        className={selectedClass?.name ?? ''}
        customFields={customFields}
        onClose={() => setShowAddModal(false)}
        onSaved={fetchStudents}
      />

      {/* Modal: Tambah Kolom */}
      {showFieldModal && (
        <AddCustomFieldModal onClose={() => setShowFieldModal(false)} onAdd={addField} />
      )}

      {/* Modal: Tambah Kelas */}
      {showAddClassModal && (
        <AddClassModal onClose={() => setShowAddClassModal(false)} onAdd={handleAddClass} />
      )}

      {/* Modal: Edit Kelas */}
      {showEditClassModal && selectedClass && (
        <EditClassModal
          classItem={selectedClass}
          onClose={() => setShowEditClassModal(false)}
          onSave={handleEditClass}
          onDelete={handleDeleteClass}
        />
      )}

      {/* Modal: Konfirmasi Hapus */}
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