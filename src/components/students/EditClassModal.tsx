'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { type ClassItem } from '@/types'
import ClassForm, { type ClassFormData } from './ClassForm'
import { isValidClassName } from '@/lib/normalizeClassName'

interface Props {
  classItem: ClassItem
  onClose: () => void
  onSave: (id: string, data: ClassFormData) => Promise<{ error: string | null }>
  onDelete: (id: string) => Promise<void>
}

export default function EditClassModal({ classItem, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<ClassFormData>({
    name: classItem.name,
    subjects: classItem.subjects ?? [],
    homeroomTeacher: classItem.homeroom_teacher ?? '',
    isHomeroomOnly: classItem.is_homeroom_only ?? false,
  })

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [classExists, setClassExists] = useState(false)

  const handleSubmit = async () => {
    setError('')

    if (!form.name.trim()) {
      setError('Nama kelas wajib diisi.')
      return
    }

    if (!isValidClassName(form.name)) {
      setError('Format nama kelas tidak valid. Contoh: VI A, 6A, atau Kelas VI A.')
      return
    }

    if (classExists) {
      setError('Nama kelas sudah digunakan.')
      return
    }

    if (!form.homeroomTeacher.trim()) {
      setError('Nama wali kelas wajib diisi.')
      return
    }

    setSaving(true)

    const result = await onSave(classItem.id, form)

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onClose()
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(classItem.id)
    setDeleting(false)
    onClose()
  }

  if (deleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">
            Hapus kelas "{classItem.name}"?
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            Siswa di kelas ini tidak ikut terhapus, namun perlu dipindahkan ke kelas lain secara manual.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1 justify-center">
              Batal
            </button>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 justify-center">
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">Edit Kelas</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <ClassForm
            data={form}
            onChange={setForm}
            onClassExistsChange={setClassExists}
            currentClassName={classItem.name}
          />

          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-slate-100 shrink-0">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button onClick={onClose} className="btn-secondary flex-1">
            Batal
          </button>

          <button onClick={handleSubmit} disabled={saving || classExists} className="btn-primary flex-1">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
