'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type Gender } from '@/types'
import { Plus, Pencil, Trash2, Search, X, Users } from 'lucide-react'

const emptyForm = { name: '', nis: '', class_name: '', gender: 'Laki-laki' as Gender }

export default function StudentsPage() {
  const supabase = createClient()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('Semua')
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchStudents = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .order('class_name')
      .order('name')
    setStudents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchStudents() }, [])

  const classes = ['Semua', ...Array.from(new Set(students.map(s => s.class_name))).sort()]

  const openAdd = () => {
    setEditStudent(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (s: Student) => {
    setEditStudent(s)
    setForm({ name: s.name, nis: s.nis, class_name: s.class_name, gender: s.gender })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.nis || !form.class_name) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editStudent) {
      await supabase.from('students').update(form).eq('id', editStudent.id)
    } else {
      await supabase.from('students').insert({ ...form, user_id: user.id })
    }

    await fetchStudents()
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('students').delete().eq('id', id)
    setDeleteConfirm(null)
    await fetchStudents()
  }

  const filtered = students.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.includes(search) ||
      s.class_name.toLowerCase().includes(search.toLowerCase())
    const matchClass = filterClass === 'Semua' || s.class_name === filterClass
    return matchSearch && matchClass
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Siswa</h1>
          <p className="text-sm text-slate-500 mt-0.5">{students.length} siswa terdaftar</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Siswa
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari nama, NIS, atau kelas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
        >
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">
              {search ? 'Tidak ada siswa yang cocok.' : 'Belum ada siswa. Tambahkan sekarang!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header w-10">No</th>
                  <th className="table-header">Nama</th>
                  <th className="table-header">NIS</th>
                  <th className="table-header">Kelas</th>
                  <th className="table-header">Jenis Kelamin</th>
                  <th className="table-header w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell text-slate-400">{i + 1}</td>
                    <td className="table-cell font-medium text-slate-900">{s.name}</td>
                    <td className="table-cell text-slate-500">{s.nis}</td>
                    <td className="table-cell">
                      <span className="badge bg-emerald-50 text-emerald-700">{s.class_name}</span>
                    </td>
                    <td className="table-cell text-slate-500">{s.gender}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
              Menampilkan {filtered.length} dari {students.length} siswa
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                {editStudent ? 'Edit Siswa' : 'Tambah Siswa'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama Lengkap</label>
                <input className="input" placeholder="Nama siswa" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">NIS</label>
                  <input className="input" placeholder="Nomor Induk Siswa" value={form.nis}
                    onChange={e => setForm({ ...form, nis: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kelas</label>
                  <input className="input" placeholder="Contoh: 7A" value={form.class_name}
                    onChange={e => setForm({ ...form, class_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Jenis Kelamin</label>
                <select className="input" value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value as Gender })}>
                  <option>Laki-laki</option>
                  <option>Perempuan</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Batal
              </button>
              <button onClick={handleSave} className="btn-primary flex-1 justify-center" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Hapus siswa?</h3>
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
