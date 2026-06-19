'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, BookOpen, Users } from 'lucide-react'

interface ClassItem {
  id: string
  name: string
  user_id: string
  created_at: string
  student_count?: number
}

export default function ClassesPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<ClassItem | null>(null)
  const [formName, setFormName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: classData }, { data: students }] = await Promise.all([
      supabase.from('classes').select('*').eq('user_id', user.id).order('name'),
      supabase.from('students').select('class_name').eq('user_id', user.id),
    ])

    const studentCountMap: Record<string, number> = {}
    students?.forEach(s => {
      studentCountMap[s.class_name] = (studentCountMap[s.class_name] ?? 0) + 1
    })

    const withCount = (classData ?? []).map(c => ({
      ...c,
      student_count: studentCountMap[c.name] ?? 0,
    }))

    setClasses(withCount)
    setLoading(false)
  }

  useEffect(() => { fetchClasses() }, [])

  const openAdd = () => {
    setEditItem(null)
    setFormName('')
    setShowModal(true)
  }

  const openEdit = (c: ClassItem) => {
    setEditItem(c)
    setFormName(c.name)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editItem) {
      await supabase.from('classes').update({ name: formName.trim() }).eq('id', editItem.id)
    } else {
      await supabase.from('classes').insert({ name: formName.trim(), user_id: user.id })
    }

    await fetchClasses()
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('classes').delete().eq('id', id)
    setDeleteConfirm(null)
    await fetchClasses()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{classes.length} kelas terdaftar</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Kelas
        </button>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : classes.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">Belum ada kelas</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">Tambahkan kelas untuk mulai mengelola siswa.</p>
          <button onClick={openAdd} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Tambah Kelas Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {classes.map(c => (
            <div
              key={c.id}
              className="card p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(c.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900">{c.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500">{c.student_count} siswa</span>
              </div>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                Aktif
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                {editItem ? 'Edit Kelas' : 'Tambah Kelas'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <label className="label">Nama Kelas</label>
              <input
                className="input"
                placeholder="Contoh: 7A, 8B, 9C"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
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
            <h3 className="font-semibold text-slate-900 mb-1">Hapus kelas?</h3>
            <p className="text-sm text-slate-500 mb-5">Kelas akan dihapus. Data siswa tidak ikut terhapus.</p>
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
